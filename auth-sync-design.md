# 药枢 NeuroPharm · 账号登录与多设备同步 设计方案

> 目标：在现有单文件 HTML 学习 App 上，增加「邮箱账号登录」+「进度跨设备自动同步」+「记录/管理不同设备」。
> 设计约束（来自你的长期偏好）：仅用邮箱注册，**排除微信/QQ/支付宝等社交登录**；UI 中文为主、英文仅用于药名/术语；配色冷静 teal/中性，避开 AI 紫与纯黑；无障碍优先。

## 1. 结论先行（推荐架构）
- **认证**：邮箱 + 密码（服务端 **PBKDF2-SHA256** 哈希，Web Crypto 原生 `deriveBits` 派生，零额外依赖）。自托管、零第三方、符合你的硬约束。
- **后端**：复用你已有的 Cloudflare Worker 模式（参考 BSRI 的 128-bit uid + Worker），新增几个路由即可，不必另起炉灶。
- **同步**：每个用户一份状态 JSON（积分 / 连续 / 徽章 / 学习进度），云端 **最后写入获胜（LWW）**；多设备登录即自动拉取。
- **设备**：独立设备表记录每台机器，UI 可查看、可移除（吊销）。

## 2. 认证方式选型
| 方案 | 体验 | 运维 | 是否符合约束 | 建议 |
|---|---|---|---|---|
| 邮箱 + 密码 | 中 | 低（已有 Worker） | ✅ 主键 | **采用（主）** |
| 密码less 魔法链接 | 顺滑 | 中（需发信） | ✅ 邮箱体系 | 备选（Cloudflare Email Routing） |
| QQ/支付宝 OAuth | 最顺 | 低 | ❌ 仍排除 | **不做** |

## 3. 后端（**新建独立 Worker**，复用同一套技术栈）
> ⚠️ 不是把路由塞进 BSRI 的 `polished-moon` Worker。两个项目各自独立部署，避免互相干扰。
> 为 NeuroPharm 新建一个独立 Worker（如 `neuropharm-sync.cunyikang.workers.dev`），**复用与 BSRI 相同的技术栈与代码模式**（Worker + D1/KV），但使用**独立的 D1 数据库 / KV 命名空间**。同一个 Cloudflare 账号下多个 Worker 互不干扰。

路由：
- `POST /auth/register` — 邮箱 + 密码 → 建号，返回 uid + token
- `POST /auth/login` — 校验密码 → 返回 token
- `GET  /sync/pull?version=` — 返回云端状态（仅在 version 落后时返回正文）
- `POST /sync/push` — 上传本地状态 + version（服务端做 LWW 冲突裁决）
- `GET  /devices/list` — 返回该用户设备列表
- `POST /devices/revoke` — 移除某设备（吊销其后续同步）

存储（Cloudflare D1 示例）：
```sql
users(uid TEXT PK, email TEXT UNIQUE, pw_hash TEXT, created_at INTEGER);
states(uid TEXT PK, blob_json TEXT, version INTEGER, updated_at INTEGER);
devices(device_id TEXT PK, uid TEXT, name TEXT, platform TEXT, last_sync_at INTEGER, created_at INTEGER);
```
会话：登录返回签名 token（JWT 或随机 session 存 KV，带过期）；客户端存 `localStorage`，与现有匿名逻辑并列，平滑迁移。

## 4. 同步模型
- **拉取**：App 打开 / 回到前台 / 每 5 分钟 → `GET /sync/pull`（带本地 version）。
- **推送**：本地状态变更后 **防抖 800ms** → `POST /sync/push`（带 version）。
- **冲突**：整份 LWW（`updated_at` 较新者胜）。学习类数据粒度粗，LWW 足够，不必上 CRDT。
- **设备上报**：每次 push 顺带 `upsert` 本机 device 行，刷新 `last_sync_at`；UI 读 `/devices/list`。

## 5. 用户状态数据结构（示例）
```json
{
  "version": 12,
  "updatedAt": "2026-08-11T13:00:00Z",
  "progress": { "sertraline": { "mastered": true, "lastReview": "2026-08-10" } },
  "streak": { "count": 7, "lastDay": "2026-08-11" },
  "points": 1240,
  "badges": ["first-dose", "week-streak"],
  "settings": { "reducedMotion": false }
}
```

## 6. 隐私与安全
- 邮箱为主键；密码服务端加盐哈希，不落明文；全站 HTTPS；token 有期；设备移除即吊销该设备后续拉取。
- uid 为主键，不绑定任何第三方社交账号。

## 7. UI（已嵌入 `psychopharm-app.html`）
- **登录页**：邮箱 + 密码为主；底部不加第三方绑定说明，保持干净。
- **同步中心**：上次同步时间、「立即同步」按钮、设备列表（标记「此设备」、可移除其他）、退出登录。
- **无障碍**：`<label>` 关联、`aria-live` 同步状态、`focus-visible` 描边、`prefers-reduced-motion` 关闭动画。
- **趣味微文案**：加载「正在把你的进度从云端接回来 ✨」、成功「同步完成」、错误「邮箱或密码不太对，再试一次？」。

## 8. 落地状态与部署步骤（2026-08 实际实现）

### 8.1 已完成（代码就绪，已通过语法 + 密码学烟测）
- **客户端已接线**：`auth.js`(NPAuth) + `sync.js`(NPSync) 已接入 `psychopharm-app.html`
  - 主脚本后按序引入 `sync.js` → `auth.js`（sync.js 包装 `window.saveGam`，实现变更后自动 800ms 防抖推送）。
  - 新增「登录门」`#authGate`：首次打开或退出后弹出，可点「先本地体验」跳过（本地模式不同步，行为不变）。
  - profile 页「学习设置」下方新增「数据同步」区：`#syncStatus` / `#syncNowRow`（立即同步）/ `#syncDevicesRow`(+`#syncDevCount`) / `#logoutRow` / `#syncLoginRow`，由 auth.js 的 `renderSyncStatus()` 驱动显隐。
- **后端文件**：`neuropharm-worker/` 下 `crypto.mjs`(PBKDF2-SHA256 + HS256 自签 token)、`worker.js`(register/login/pull/push/devices 六路由 + D1)、`schema.sql`(users/states/devices 三表)、`wrangler.toml`、`_smoke.mjs`。
- **同步模型（实现）**：状态即现有 `GAM` 对象（积分/连续/徽章/已学）。推送时打 `GAM._rev = Date.now()`；`pull()` 按 `updatedAt ≥ _rev` 采用服务端（LWW），本地更新则反推上传。`saveGam` 触发 800ms 防抖推送到 `/sync/push`（顺带 upsert 设备行）。
- **密码学验证**：`_smoke.mjs` 实测 PBKDF2 派生/校验、HS256 token 签发/验签（含过期、错误密钥返回 `null`）全部通过。

### 8.2 部署（已上线 ✅ — 2026-08-12）
- **生产地址**：`https://neuropharm-sync.cunyikang.workers.dev`（Cloudflare 账户 Cunyikang@gmail.com's Account）。
- **D1**：`neuropharm`（database_id 已写入 `wrangler.toml`）；**JWT_SECRET** 以 `wrangler secret put` 注入（不落 toml）。
- **一键重部署**：在 `neuropharm-worker/` 准备好 `.cf_env`（`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`，参考 `.cf_env.example`），然后 `node deploy.mjs` 即可完成 d1 create → 建表 → secret → deploy → 回填 `auth.js`。
- 手动步骤（等价）：
  1. `wrangler d1 create neuropharm`（记下 `database_id` 填 `wrangler.toml`）。
  2. `wrangler secret put JWT_SECRET`（交互输入长随机串）。
  3. `wrangler d1 execute neuropharm --remote --file=./schema.sql`。
  4. `wrangler deploy`。
  5. `auth.js` 的 `API_BASE` 已回填为真实域名（可改 / 覆盖 `localStorage.neuropharm_api_base`）。
- 本地联调：`wrangler dev` + `API_BASE=http://127.0.0.1:8787`（见 §8.3）。

### 8.3 本地联调（不部署也可验证客户端逻辑）
- 用 `wrangler dev`（本地 Worker + 本地 D1），把 `API_BASE` 指向 `http://127.0.0.1:8787`，即可在浏览器跑通 注册 → 登录 → 推送 → 换设备拉取。
- 不部署时：App 走本地模式正常学习（不推送/不拉取）；若已登录但后端不可达，`push/pull` 失败被静默捕获（控制台 `warn`），不阻塞本地使用。

### 8.4 待办
- [x] 执行 8.2 部署并回填 `auth.js` 的 `API_BASE` 真实域名（已上线：`neuropharm-sync.cunyikang.workers.dev`）。
- [ ] 真机/多设备跑通一次 pull/push 验收（LWW：后同步者覆盖前者，符合设计）。← 建议首次登录后换设备验证。
- [ ] 首登行为确认：服务端空 → 保留本地、下次变更时上传（当前已如此实现，非覆盖式）；若希望首登即主动上传，可在登录成功后调用 `NPSync.pushNow()`（可选增强）。

## 9. 备选方案
- **Supabase**：auth + Postgres + realtime 开箱即用，最省运维；但引入第三方依赖，需自行确认数据合规。适合不想运维 Worker 时。
- 若不想运维 Worker，Supabase 的邮箱登录可直接套用，仍保持邮箱为主即可。

## 10. 趣味体验设计要点（DelightfulExperienceDesigner 视角）
- 首次同步完成给一个轻量庆祝（✨ 微动效），降低「换设备丢进度」的焦虑。
- 错误态用拟人化但不轻浮的文案，保持医疗/学习场景的专业感。
- 所有动效尊重 `prefers-reduced-motion`；色板保持 teal/中性，不与 AI 紫混淆品牌。
- 多设备提示用中性表述（「这台 iPhone 15 刚刚同步」），避免制造「异常/入侵」恐慌。
