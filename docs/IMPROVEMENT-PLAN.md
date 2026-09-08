# 药枢 NeuroPharm · 改进计划

> 状态说明：原始 12 项清单仅存在于对话中、未落盘，对话压缩后丢失。
> 本文件基于 **2026-09-09 代码实况重新梳理**，只记录有代码依据的问题，不凑数。

## 一、已完成 ✅

### Phase 1 — 基础能力（已推送 `bcc634e`）

| # | 项目 | 内容 |
|---|------|------|
| 1-1 | 新药扩充 | 38 → **50 味**，`data/drugs.json` 唯一真源 → `gen-data.js` |
| 1-2 | SRS 间隔重复 | 简化 SM-2（reps/ease/interval/nextReview），逾期优先 |
| 1-3 | 相互作用库 | 23 → **72 对**，含 CLASS_MAP class 级 fallback |
| 1-4 | Android 同步 | assets 同步 + README/CLAUDE 更新 |

### Phase 1.5 — 代码审查发现的真实缺陷（已修，待推送 `d4699c1`+）

| # | 缺陷 | 影响 | 修复 |
|---|------|------|------|
| B1 | `getSRSQueue()` 中 `learnt` 未 `.map(x=>x.idx)` | 队列混入 `{idx,next}` 对象 → `DRUGS[obj]` 为 undefined → **闪卡空白**。存在"已学未到期"卡时必现 | 补 `.map(x=>x.idx)` |
| B2 | SRS 仅存独立 localStorage，未随 `GAM` 云同步 | **换设备复习进度全丢**，与多设备同步定位矛盾 | SRS 并入 `GAM.srs`；`saveSRS()`→`saveGam()` 触发同步；旧 key 自动迁移；pull 后 `bindSRS()` 重绑 |
| B3 | `nextCard()` 中 `cardIdx++` 无边界检查 | 队列翻完 → `cardOrder[cardIdx]` undefined → `d.zh` TypeError → **卡片卡死** | 越界时按最新 SRS 状态重排队列 + 提示"本轮完成" |
| B4 | `studyProgress` 用 `cardIdx%DRUGS.length+1` | SRS 队列含复习卡、长度≠50 时**进度显示错乱** | 改为 `cardIdx+1 / cardOrder.length` |

**验证**：`scripts/_check.js`（语法+关键符号）、`scripts/_test_srs.js`（20 项逻辑断言）全通过。

## 二、已识别待办 🔍（有代码依据，未实施）

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| T1 | 自测题库规模 | `CURATED` (L1126+) | 现有 194+ 题，可随 50 味药继续扩充覆盖度 |
| T2 | 徽章门槛与 50 味药对齐 | `BADGES` (L1290+) | 部分徽章（如"药库通览"）文案已写 50，需核对触发条件 |
| T3 | 游戏化与 SRS 联动 | `checkBadges` / `checkGoal` | 复习到期卡片目前计入 `srsReviewed`，可补充专属激励 |
| T4 | 无测试覆盖自测模块 | `scripts/` | 现有测试只覆盖 SRS；`quizPrev/Next`、结果页逻辑未覆盖 |

## 三、待评估方向 💡（需你确认是否要做）

- **P1**：学习统计可视化（掌握度曲线、分类正确率热力）
- **P2**：导出/备份（SRS 数据 JSON 导出）
- **P3**：离线状态提示（弱网/同步失败的用户可见反馈）
- **P4**：药物详情页信息增补（剂量换算、特殊人群用药）

## 四、执行约定（不可违反）

- 数据来源：只改 `data/drugs.json` → 跑 `scripts/gen-data.js` → 生成 `drugs-data.js`
- APK 同步：改 `psychopharm.html` / `drugs-data.js` / `js/*` 后必须同步到 `psychopharm-android/app/src/main/assets/`
- 改动后跑 `node scripts/_check.js && node scripts/_test_srs.js` 再提交

## 五、当前阻塞

- ⚠️ `d4699c1` 等提交因代理 502 **未推送**，网络恢复后 `git push`
