# NeuroPharm 架构概览

## 整体架构

```
┌─────────────────────────────────────┐
│          psychopharm.html           │ ← 单文件 H5 前端（学习 App）
│  ┌───────────┐  ┌────────────────┐  │
│  │ SRS 闪卡  │  │ 自测(295 题)   │  │
│  ├───────────┤  ├────────────────┤  │
│  │ 药库浏览  │  │ 相互作用查询   │  │
│  ├───────────┤  ├────────────────┤  │
│  │ 学习统计  │  │ 每日挑战       │  │
│  ├───────────┤  ├────────────────┤  │
│  │ 临床笔记  │  │ 药物对比       │  │
│  ├───────────┤  ├────────────────┤  │
│  │ 场景病例  │  │ 进度/积分/徽章  │  │
│  └───────────┘  └────────────────┘  │
├─────────────────────────────────────┤
│           drugs-data.js             │ ← 62 味药数据（由 drugs.json 生成）
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

### 学习数据（离线优先，登录后可云同步）
1. `data/drugs.json` → `scripts/gen-data.js` → `drugs-data.js` → 全局 `DRUGS` 数组
2. 学习进度存 `GAM` 对象（localStorage）；**SRS 调度表为 `GAM.srs`**，随 GAM 一起云同步
3. 登录后 → `js/sync.js` 800ms 防抖推送到 Worker（LWW，按 `_rev` 时间戳）

### 数据库（D1）
- `users(uid, email, pw_hash)` — 邮箱注册
- `states(uid, blob_json, version)` — 学习进度（LWW 冲突）
- `devices(device_id, uid, name, platform)` — 多设备管理

## 三个核心子系统

### 1. SRS 间隔重复（简化 SM-2）
每张卡片存 `{reps, ease, interval, nextReview}`：记住则按
`[1,3,7,14,30,60,90,180]` 天递进并上调 ease；忘记则 reps 归零、ease 下调、次日重来。

队列优先级（`getSRSQueue()`）：**到期卡 → 新卡 → 已学复习卡（最多 5 张）**。
队列耗尽时按最新状态重排，避免越界。

### 2. 药物相互作用：数据驱动自动推导
不逐对硬编码。每味药在 `drugs.json` 中带 `rx` 药理标签：

| 字段 | 含义 |
|---|---|
| `sub` / `inh` / `ind` | CYP 底物 / 抑制 / 诱导（1A2、2C19、2C9、2D6、3A4、2B6、2E1） |
| `serot` `cns` `qt` `seiz` | 5-HT 能强度 / 镇静强度 / QT 风险 / 癫痫阈值 |
| `ach` `hypo` `opio` `maoi` | 抗胆碱 / 体位性低血压 / 阿片 / MAOI |
| `other` | 特殊标签：`lithium` `agranulocytosis` `opioid_antagonist` `bzd` 等 |

`deriveInteractions()` 按 11 类规则自动生成结论（5-HT 综合征、MAOI 禁忌、阿片拮抗致急性戒断、
CYP 抑制/诱导、QT 叠加、呼吸抑制、抗胆碱叠加、锂盐窄窗、氯氮平血象监测等）。
`getInteraction()` 合并「人工精调 PAIRS」+「自动推导」，取最高危等级。

**覆盖 1891 对全组合 → 推导出 1048 对（禁忌 14 / 严重 433 / 中等 994）**。
新增药物自动纳入，**无需手工维护逐对数据**。

### 3. 题库（buildQuizBank）
- 自动生成：每味药 4 题（分类归属、适应症、不良反应、反向归类）→ **248 题**
- 精选题 `CURATED`：手工编写 → **31 题**
- 场景病例题 `SCENARIOS`：16 道虚拟病例含临床解析（社交焦虑、精神病性抑郁、双相躁狂、
  难治性抑郁、成瘾医学、妊娠用药、MAOI 洗脱等）→ **16 题**
- **总量 295 题**，每次随机抽 25 题（每日挑战 5 题）

### 4. 搜索增强（拼音双通道）
`scripts/gen-pinyin.js` 为每味药生成 4 个搜索字段：
- `py`（全拼）、`pyi`（全拼首字母）、`spy`（首字母声母）、`spyi`（首字母 index）
- 双通道匹配策略：优先拼音字段精确/前缀匹配，次选中英文/适应症全文模糊匹配
- 命中高亮 + 按类别分组 + `:first` 命中行相关性排序
- 62 味药首字母零冲突

### 5. PWA 离线支持
- `manifest.json`：App 名称/图标/主题色（`#1a8a7a` teal）、display standalone
- `service-worker.js`：静态资源 cache-first、导航 network-first fallback cache、API 不缓存
- 图标由 `scripts/gen-icon.js` 纯 Node 手写 PNG（zlib+CRC32，无依赖）
- `file://` 协议自动跳过 SW 注册，兼容 APK WebView

### 6. 学习统计（⑧）
第 5 个 Tab「统计」，三段切换：
- **7 日积分柱状图**：Canvas 手绘圆角柱体，柱上分值 + 底部日期 X 轴
- **分类掌握度雷达图**：10 类药物，同心 5 层网格，数据点百分比标注（基于 SRS reps≥1 的药数）
- **错题本**：最近 200 条，红绿标记用户选择 vs 正确答案，展开解析

### 7. 每日挑战（⑨）
- 首页「每日挑战」区块，基于日期种子确定性随机出 5 题
- 答对 +30🪙，答错 +5🪙（同时记入错题本）
- 周目标 5 次/周 → 完成弹窗额外奖 200 积分
- 数据随 GAM 云同步

### 8. 临床笔记（⑫）
- 每味药详情页「📝 临床笔记」按钮 → 底部弹出编辑面板
- 笔记存入 `GAM.notes`，随账号云同步
- 保存即更新详情页，空笔记自动隐藏

### 9. 桌面模式（⑩）
- `@media (min-width:1200px)`：去掉手机外壳外壳，全屏宽度布局
- 首页两栏网格、药库两列列表、详情两列（信息 + 笔记）
- 复习/自测居中窄栏、相互作用横向排列

## 客户端架构
- 纯前端无框架，单 HTML 包含所有 CSS + JS
- Screen 切换：`showScreen(screenId)` 控制显隐
- 闪卡：队列由 `getSRSQueue()` 生成（到期优先 → 新卡 → 已学复习，边界检查防越界）
- 自测：`shuffle(bank)` 每次开始随机，支持「全部题型 / 精选题 / 场景病例」切换
- 每日挑战：基于日期种子的确定性随机 → 同一天用户得到相同 5 题
- CHIPS 筛选：匹配 `d.tag === activeChip || d.cls === activeChip`
- 统计绘图：Canvas 手绘（无第三方图表库依赖），颜色变量取自 CSS

## 关键配置
| 项目 | 值 |
|---|---|
| 药物数 | **62 味**（10 个大类，30 个亚类） |
| 题库 | **295 题**（每次 25 题） |
| 相互作用 | 自动推导，覆盖 1048 对 |
| 同步后端 | neuropharm-sync.cunyikang.workers.dev |
| APK 构建 | GitHub Actions（打 `v*` tag 触发） |
| 在线版 | https://CochraneK.github.io/neuropharm/ |

## 验证脚本（全套 6 套，共 167 项断言）
```bash
node scripts/_check.js          # 语法冒烟 + 关键符号（8 项）
node scripts/_test_srs.js       # SRS 间隔重复逻辑（20 项断言）
node scripts/_test_interact.js  # 相互作用自动推导（11 项断言）
node scripts/_test_search.js    # 拼音搜索双通道（16 项断言）
node scripts/_test_compare.js   # 药物对比视图（12 项断言）
node scripts/_test_scenarios.js # 场景病例题（100 项断言）
```

## 文档索引
- 12 项改进计划 → `IMPROVEMENT-PLAN.md`
- 账号同步设计 → `auth-sync-design.md`
- 卡片 PDF → `../pages/overview.md`
- 项目规则 → `../CLAUDE.md`
