# NeuroPharm 架构概览

## 整体架构

```
┌─────────────────────────────────────┐
│          psychopharm.html           │ ← 单文件 H5 前端（学习 App）
│  ┌───────────┐  ┌────────────────┐  │
│  │ 闪卡复习  │  │ 强化自测(184题)│  │
│  ├───────────┤  ├────────────────┤  │
│  │ 药库浏览  │  │ 进度/积分/徽章│  │
│  └───────────┘  └────────────────┘  │
├─────────────────────────────────────┤
│           drugs-data.js             │ ← 38 味药数据（由 drugs.json 生成）
├─────────────────────────────────────┤
│  js/auth.js  │  js/sync.js          │ ← 账号与同步客户端（localStorage 持久）
└──────────┬──────────────────────────┘
           │ HTTPS POST/GET
┌──────────▼──────────────────────────┐
│   Cloudflare Worker + D1            │ ← neuropharm-sync.cunyikang.workers.dev
│   /auth/register  /auth/login       │
│   /sync/pull      /sync/push        │
│   /devices/list   /devices/revoke   │
└─────────────────────────────────────┘
```

## 数据流

### 学习数据（离线优先）
1. `drugs.json` → `gen-data.js` → `drugs-data.js` → JS 内 DRUGS 数组
2. 用户拼写/自测结果 → `localStorage`（GAM 对象）
3. 登录后 → `js/sync.js` 800ms 防抖推送到 Worker

### 数据库（D1）
- `users(uid, email, pw_hash)` — 邮箱注册
- `states(uid, blob_json, version)` — 学习进度（LWW 冲突）
- `devices(device_id, uid, name, platform)` — 多设备管理

### 题库生成（buildQuizBank）
- 自动题：每味药生成「分类归属」「适应症」「常见副作用」三类题
- 精选题（CURATED）：32 道手工题覆盖所有类别
- 总量 184 题，每次随机抽 25 题

## 客户端架构
- 纯前端无框架，单 HTML 包含所有 CSS + JS
- Screen 切换：`showScreen(screenId)` 控制显隐
- 闪卡：`cardOrder` 随机索引数组，每次进入打乱
- 自测：`shuffle(bank)` 每次开始随机
- CHIPS 筛选：匹配 `d.tag === activeChip || d.cls === activeChip`

## 关键配置
| 项目 | 值 |
|---|---|
| 药物数 | 38 味（10 个类别） |
| 题库 | 184 题（每次 25 题） |
| 同步后端 | neuropharm-sync.cunyikang.workers.dev |
| APK 构建 | GitHub Actions（打 `v*` tag 触发） |
| 在线版 | https://CochraneK.github.io/neuropharm/ |

## 文档索引
- 账号同步设计 → `auth-sync-design.md`
- 卡片 PDF → `overview.md`
- 项目规则 → `CLAUDE.md`
