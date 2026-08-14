# 药枢 NeuroPharm 卡片 PDF — 双面打印配对 + 灰度墨省版

## 已完成
1. **双面打印配对修复**（用户核心问题）
   - 在 `make_cards.py` 增加 `DUPLEX='long'` 与 `_back_perm(n)` 助手。
   - 背面按长边装订（long-edge）水平镜像重新排列药物：每行列序反转。
   - 裁剪后，每张卡片正反面为同一药物。短页（第 4 页仅 6 张）已正确处理。

2. **墨省版真正去色**
   - 原 mono 版的 `INK`/`GREY` 仍带蓝灰色相，打印机仍会调用彩墨。
   - 新增中性灰阶 `MONO_INK/MONO_GREY/MONO_EDGE`（R=G=B），裁切线也改中性灰，输出纯黑白。

3. **QA 校验**
   - 新增 `qa_pairing.py`：检查每格药物是否存在、长边翻转配对一致、无文字重叠、mono 无彩色。
   - 结果：`PASS ✅` — COLOR 0 问题 / MONO 0 问题且 0 彩色命中。

## 交付文件
- `psychopharm-cards-deck.pdf`（彩色，8 页 / 33 卡，flip hint 已移除）
- `psychopharm-cards-deck-mono.pdf`（纯灰度墨省版，8 页 / 33 卡）

## 备注
- 若实测打印仍错位，将 `make_cards.py` 中的 `DUPLEX = 'long'` 改为 `'short'`（短边装订，垂直反转）或 `'none'`（无镜像），重跑脚本即可。
