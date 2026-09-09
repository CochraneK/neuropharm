# 药枢 NeuroPharm — 项目规则

## 项目简介
单文件 HTML 精神药理学习 App（`psychopharm.html`），含 62 味精神科药物及题库（279 题 = 248 自动生成 + 31 精选），支持 SRS 间隔重复闪卡、自测、药物相互作用自动推导查询、游戏化进度追踪。Android WebView 壳（`psychopharm-android/`）+ Cloudflare Worker 同步后端（`neuropharm-worker/`）。

## 数据流水线（不可违反）
- **唯一真源**: `data/drugs.json`（JSON，62 味药）
- **生成**: `scripts/gen-data.js` 读 `data/drugs.json` → 输出 `drugs-data.js`
- **消费**: `psychopharm.html` 引用 `drugs-data.js`
- **规律**: 改药物分类/增减药 → 只改 `data/drugs.json` → 跑 `scripts/gen-data.js` 重新生成 → 同步 APK assets

## 新增药物必须带 rx 字段（硬规则）
相互作用由 `rx` 药理标签**自动推导**，不给 `rx` 的药等于不参与相互作用查询。
新增药物时必须在 `drugs.json` 中补齐（缺一不可）：
`sub`/`inh`/`ind`（CYP 底物/抑制/诱导）、`serot`、`cns`、`qt`、`seiz`、`ach`、`hypo`、`opio`、`maoi`、`other`。
字段定义见 `docs/ARCHITECTURE.md` §「药物相互作用：数据驱动自动推导」。

## 关键约定
- `README.md` 保持最新，特别是文件列表和二维码引用
- 文档类文件已整理到 `pages/` 和 `docs/`，根级不放非核心文件
- APK 构建走 GitHub Actions（打 `v*` tag 自动构建），本地 `psychopharm-android/` 的 assets 需手动同步
- 首页药丸样式经过迭代，当前定型为「白底卡片 + 色块 emoji + 数量」——先问再改
- 改动后跑验证：`node scripts/_check.js` + `_test_srs.js` + `_test_interact.js`
- 推送后用 `git ls-remote origin main` 核对远程，`git log origin/main..main` 会因 tracking ref 未刷新而误报

## 目录速查
| 路径 | 说明 |
|---|---|
| `psychopharm.html` | 主程序（单文件 H5） |
| `data/drugs.json` | 药物数据（唯一真源） |
| `scripts/gen-data.js` | 数据生成器 |
| `drugs-data.js` | 生成的 JS 数据 |
| `js/auth.js` / `js/sync.js` | 账号与同步客户端 |
| `img/download-qr.png` | Android APK 下载二维码 |
| `scripts/` | 工具脚本（卡片 PDF 生成/质检/发布/测试） |
| `scripts/_check.js` | 语法冒烟 + 关键符号检查 |
| `scripts/_test_srs.js` | SRS 逻辑测试（20 项断言） |
| `scripts/_test_interact.js` | 相互作用推导测试（11 项断言） |
| `pages/` | 辅助页面（认证/海报/设计文档） |
| `pdf/` | 打印卡片 PDF |
| `docs/` | 架构文档 |
| `neuropharm-worker/` | Cloudflare Worker 后端 |
| `psychopharm-android/` | Android WebView 壳工程 |

## 深入文档
- 架构概览（含 SRS / 相互作用推导引擎）→ `docs/ARCHITECTURE.md`
- 12 项改进计划与执行状态 → `docs/IMPROVEMENT-PLAN.md`
- 账号同步设计 → `docs/auth-sync-design.md`
- 卡片 PDF 说明 → `pages/overview.md`
