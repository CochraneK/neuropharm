/* 一次性脚本：
 * 1) 追加 11 味缺药（含 rx 药理标签）→ 61 味
 * 2) 为全部药物补充 rx 字段（相互作用自动推导的数据基础）
 * 跑完记得执行 scripts/gen-data.js
 */
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'data', 'drugs.json');
const drugs = JSON.parse(fs.readFileSync(p, 'utf8'));

const C = {
  anti: 'var(--c-anti)', psy: 'var(--c-psy)', mood: 'var(--c-mood)',
  anx: 'var(--c-anx)', stim: 'var(--c-stim)', hyp: 'var(--c-hyp)', other: 'var(--c-other)',
};
const S = {
  anti: 'var(--c-anti-soft)', psy: 'var(--c-psy-soft)', mood: 'var(--c-mood-soft)',
  anx: 'var(--c-anx-soft)', stim: 'var(--c-stim-soft)', hyp: 'var(--c-hyp-soft)', other: 'var(--c-other-soft)',
};

/* ---------- 12 味新药 ---------- */
const NEW = [
  {
    zh: '氟伏沙明', en: 'Fluvoxamine', cls: '抗抑郁药', sub: 'SSRI', tag: '抗抑郁药',
    color: C.anti, soft: S.anti, emoji: '🟦',
    mech: '选择性 5-HT 再摄取抑制；强效抑制 CYP1A2 与 CYP2C19，是 SSRI 中 CYP 抑制作用最强者。',
    ind: ['强迫症（一线）', '抑郁症', '焦虑障碍'],
    side: ['恶心', '嗜睡', '头晕', '性功能障碍'],
    dose: '50–300 mg/日，>100 mg 时分次服。',
    warn: '强 CYP1A2 抑制：显著升高氯氮平、茶碱、替扎尼定浓度（替扎尼定禁用）；禁与 MAOI 合用。',
    half: '~15h', preg: 'C',
    rx: { sub: ['2D6'], inh: ['1A2', '2C19'], ind: [], serot: 2, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  },
  {
    zh: '反苯环丙胺', en: 'Tranylcypromine', cls: '抗抑郁药', sub: 'MAOI', tag: '抗抑郁药',
    color: C.anti, soft: S.anti, emoji: '🟦',
    mech: '不可逆非选择性单胺氧化酶（MAO-A/B）抑制，升高突触 5-HT、NE、DA。',
    ind: ['难治性抑郁', '非典型抑郁（伴焦虑或惊恐）'],
    side: ['体位性低血压', '失眠', '头晕', '口干'],
    dose: '10–60 mg/日，分次（晨或午服，避免晚间致失眠）。',
    warn: '须严格低酪胺饮食；禁与 SSRI、SNRI、TCA、曲马多、哌替啶、右美沙芬合用（5-HT 综合征、高血压危象）；换药需 2 周洗脱期。',
    half: '~2h（酶抑制持续 1–2 周）', preg: 'C',
    rx: { sub: [], inh: [], ind: [], serot: 3, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 2, opio: 0, maoi: 2, other: ['tyramine'] },
  },
  {
    zh: '卢美哌隆', en: 'Lumateperone', cls: '抗精神病药', sub: '非典型', tag: '抗精神病药',
    color: C.psy, soft: S.psy, emoji: '🟣',
    mech: '5-HT2A 拮抗 + 突触前 D2 部分激动及突触后拮抗 + 5-HT 再摄取调节，间接调制谷氨酸。',
    ind: ['精神分裂症', '双相抑郁'],
    side: ['嗜睡或镇静', '头晕', '口干', '恶心'],
    dose: '42 mg/日，随餐。',
    warn: '老年痴呆相关精神病禁用（死亡率升高）；体位性低血压；避免与强 CYP3A4 抑制剂或诱导剂合用。',
    half: '~18h', preg: 'C',
    rx: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 2, qt: 1, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  },
  {
    zh: '卡利拉嗪', en: 'Cariprazine', cls: '抗精神病药', sub: '非典型', tag: '抗精神病药',
    color: C.psy, soft: S.psy, emoji: '🟣',
    mech: 'D3 与 D2 受体部分激动（对 D3 亲和力更高），5-HT2A 部分激动。',
    ind: ['精神分裂症', '双相 I 型躁狂或混合', '双相抑郁', '抑郁症增效'],
    side: ['静坐不能', '锥体外系反应', '失眠', '恶心'],
    dose: '1.5–6 mg/日。',
    warn: '半衰期极长（活性代谢物达数周），停药后不良反应可持续、加量后疗效滞后；需监测迟发性运动障碍。',
    half: '~2–4 天（活性代谢物 1–3 周）', preg: 'C',
    rx: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  },
  {
    zh: '布瑞哌唑', en: 'Brexpiprazole', cls: '抗精神病药', sub: '非典型', tag: '抗精神病药',
    color: C.psy, soft: S.psy, emoji: '🟣',
    mech: 'D2 部分激动（内在活性低于阿立哌唑）+ 5-HT1A 部分激动 + 5-HT2A 拮抗。',
    ind: ['精神分裂症', '抑郁症增效'],
    side: ['静坐不能', '体重增加', '嗜睡', '鼻咽炎'],
    dose: '精神分裂症 2–4 mg/日；抑郁增效 1–3 mg/日。',
    warn: '自杀风险监测；迟发性运动障碍；代谢指标（体重、血糖、血脂）监测。',
    half: '~91h', preg: 'C',
    rx: { sub: ['2D6', '3A4'], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  },
  {
    zh: '阿坎酸', en: 'Acamprosate', cls: '相关药物', sub: '戒酒药', tag: '相关药物',
    color: C.other, soft: S.other, emoji: '⚪️',
    mech: '调节谷氨酸与 GABA 失衡（NMDA 受体调制），降低戒断后对酒精的渴求。',
    ind: ['酒精依赖（维持戒断）'],
    side: ['腹泻', '恶心', '腹痛', '皮疹'],
    dose: '666 mg 每日三次（肾功能正常）；CrCl 30–50 时减至 333 mg 每日三次。',
    warn: '严重肾损（CrCl<30）禁用；不经肝代谢、几乎无 CYP 相互作用；饮酒不会引起双硫仑样反应。',
    half: '~20–33h', preg: 'C',
    rx: { sub: [], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  },
  {
    zh: '美沙酮', en: 'Methadone', cls: '相关药物', sub: '阿片类或戒毒', tag: '相关药物',
    color: C.other, soft: S.other, emoji: '⚪️',
    mech: 'μ 阿片受体完全激动 + NMDA 受体拮抗，用于阿片依赖维持与慢性疼痛。',
    ind: ['阿片依赖维持治疗', '慢性疼痛', '阿片戒断'],
    side: ['便秘', '出汗', '镇静', 'QT 间期延长'],
    dose: '个体化滴定，维持 20–120 mg/日（须在资质机构）。',
    warn: 'QT 延长与尖端扭转型室速风险：用药前及加量后查 ECG；呼吸抑制致死风险；为 CYP3A4 与 2B6 底物，相互作用多。',
    half: '~24–36h（个体差异大）', preg: 'C',
    rx: { sub: ['3A4', '2B6', '2D6'], inh: [], ind: [], serot: 1, cns: 2, qt: 2, seiz: 0, ach: 0, hypo: 1, opio: 2, maoi: 0, other: [] },
  },
  {
    zh: '丁丙诺啡', en: 'Buprenorphine', cls: '相关药物', sub: '阿片部分激动或戒毒', tag: '相关药物',
    color: C.other, soft: S.other, emoji: '⚪️',
    mech: 'μ 受体部分激动 + κ 受体拮抗；存在呼吸抑制天花板效应，单用安全性高于完全激动剂。',
    ind: ['阿片依赖维持治疗', '疼痛'],
    side: ['便秘', '恶心', '镇静', '出汗'],
    dose: '舌下含服 4–24 mg/日（常与纳洛酮制成复方防滥用）。',
    warn: '与其他中枢抑制剂（尤其苯二氮䓬、酒精）合用可致严重呼吸抑制甚至死亡；轻度 QT 延长。',
    half: '~24–42h', preg: 'C',
    rx: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 2, qt: 1, seiz: 0, ach: 0, hypo: 1, opio: 2, maoi: 0, other: [] },
  },
  {
    zh: '双硫仑', en: 'Disulfiram', cls: '相关药物', sub: '戒酒药', tag: '相关药物',
    color: C.other, soft: S.other, emoji: '⚪️',
    mech: '不可逆抑制乙醛脱氢酶 → 饮酒后乙醛蓄积，产生面红、心悸、呕吐等厌恶反应。',
    ind: ['酒精依赖（厌恶疗法）'],
    side: ['嗜睡', '头痛', '金属味或蒜味', '肝毒性'],
    dose: '250–500 mg/日，晨服（嗜睡明显者改晚间）。',
    warn: '严禁摄入任何含酒精制品（含藿香正气水、酒心巧克力、部分漱口水）；用药前须戒酒至少 12 小时；监测肝功能。',
    half: '~7–12h（酶抑制可持续 1–2 周）', preg: 'C',
    rx: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['alcohol'] },
  },
  {
    zh: '氯胺酮', en: 'Ketamine', cls: '抗抑郁药', sub: 'NMDA 拮抗', tag: '抗抑郁药',
    color: C.anti, soft: S.anti, emoji: '🟦',
    mech: 'NMDA 受体非竞争性拮抗 → 谷氨酸爆发 → AMPA 激活 → 突触快速重建，数小时内起效。',
    ind: ['难治性抑郁（静脉，需监护）', '麻醉', '镇痛'],
    side: ['分离症状', '血压升高', '恶心', '头晕'],
    dose: '抗抑郁 0.5 mg/kg 静脉滴注 40 分钟（超说明书，需机构资质）。',
    warn: '须在有监护条件的医疗机构使用；监测血压与分离症状；长期滥用可致泌尿系统毒性（间质性膀胱炎）。',
    half: '~2–3h', preg: 'C',
    rx: { sub: ['3A4', '2B6'], inh: [], ind: [], serot: 1, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  },
  {
    zh: '艾司氯胺酮', en: 'Esketamine', cls: '抗抑郁药', sub: 'NMDA 拮抗', tag: '抗抑郁药',
    color: C.anti, soft: S.anti, emoji: '🟦',
    mech: '氯胺酮的 S-对映体，NMDA 受体拮抗；鼻喷雾制剂用于难治性抑郁。',
    ind: ['难治性抑郁（与口服抗抑郁药联用）', '伴急性自杀意念的抑郁症'],
    side: ['分离症状', '头晕', '恶心', '镇静', '血压升高'],
    dose: '鼻腔 56–84 mg，每周 2 次（诱导期），后维持每周 1 次或隔周。',
    warn: '仅限 REMS 认证医疗机构给药；用药后须现场监护至少 2 小时（镇静、分离、高血压）；有滥用潜力，纳入管控。',
    half: '~7–12h', preg: 'C',
    rx: { sub: ['3A4'], inh: [], ind: [], serot: 1, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  },
  {
    zh: '奥氟合剂', en: 'Olanzapine/Fluoxetine', cls: '抗抑郁药', sub: '复方（非典型加 SSRI）', tag: '抗抑郁药',
    color: C.anti, soft: S.anti, emoji: '🟦',
    mech: '奥氮平阻断 5-HT2A 与 D2 受体，氟西汀抑制 5-HT 再摄取，二者协同增效。',
    ind: ['双相 I 型抑郁', '难治性抑郁'],
    side: ['体重增加', '嗜睡', '血糖或血脂升高', '口干'],
    dose: '奥氮平 6–18 mg + 氟西汀 25–50 mg，晚间一次。',
    warn: '黑框警告：自杀风险；代谢综合征监测（体重、血糖、血脂）；老年痴呆相关精神病死亡率升高。',
    half: '奥氮平约 30h；氟西汀约 4–6 天', preg: 'C',
    rx: { sub: ['1A2', '2D6'], inh: ['2D6'], ind: [], serot: 2, cns: 2, qt: 0, seiz: 1, ach: 1, hypo: 1, opio: 0, maoi: 0, other: [] },
  },
];

/* ---------- 已有药物的 rx 标注 ---------- */
const RX = {
  阿戈美拉汀: { sub: ['1A2'], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  草酸艾司西酞普兰: { sub: ['2C19', '3A4'], inh: [], ind: [], serot: 2, cns: 0, qt: 1, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  度洛西汀: { sub: ['1A2', '2D6'], inh: ['2D6'], ind: [], serot: 2, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  伏硫西汀: { sub: ['2D6'], inh: [], ind: [], serot: 2, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  氟西汀: { sub: ['2D6', '2C9'], inh: ['2D6', '2C19', '3A4'], ind: [], serot: 2, cns: 0, qt: 1, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  米氮平: { sub: ['2D6', '3A4'], inh: [], ind: [], serot: 1, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  曲唑酮: { sub: ['3A4'], inh: [], ind: [], serot: 1, cns: 3, qt: 1, seiz: 0, ach: 0, hypo: 2, opio: 0, maoi: 0, other: [] },
  舍曲林: { sub: ['2C19', '2B6', '3A4'], inh: ['2D6'], ind: [], serot: 2, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  文拉法辛: { sub: ['2D6'], inh: [], ind: [], serot: 2, cns: 0, qt: 1, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  安非他酮: { sub: ['2B6'], inh: ['2D6'], ind: [], serot: 0, cns: 0, qt: 0, seiz: 2, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  帕罗西汀: { sub: ['2D6'], inh: ['2D6'], ind: [], serot: 2, cns: 1, qt: 0, seiz: 0, ach: 1, hypo: 0, opio: 0, maoi: 0, other: [] },
  西酞普兰: { sub: ['3A4', '2C19'], inh: [], ind: [], serot: 2, cns: 0, qt: 1, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  阿米替林: { sub: ['2D6', '2C19'], inh: [], ind: [], serot: 2, cns: 2, qt: 1, seiz: 1, ach: 2, hypo: 2, opio: 0, maoi: 0, other: [] },
  丙米嗪: { sub: ['2D6', '2C19'], inh: [], ind: [], serot: 2, cns: 2, qt: 1, seiz: 1, ach: 2, hypo: 2, opio: 0, maoi: 0, other: [] },
  阿立哌唑: { sub: ['2D6', '3A4'], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  氨磺必利: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 1, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  奥氮平: { sub: ['1A2', '2D6'], inh: [], ind: [], serot: 0, cns: 2, qt: 0, seiz: 1, ach: 1, hypo: 1, opio: 0, maoi: 0, other: [] },
  氟哌啶醇: { sub: ['3A4', '2D6'], inh: [], ind: [], serot: 0, cns: 1, qt: 2, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  喹硫平: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 3, qt: 1, seiz: 1, ach: 1, hypo: 2, opio: 0, maoi: 0, other: [] },
  利培酮: { sub: ['2D6', '3A4'], inh: [], ind: [], serot: 0, cns: 1, qt: 1, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  氯丙嗪: { sub: ['2D6', '3A4'], inh: [], ind: [], serot: 0, cns: 2, qt: 1, seiz: 1, ach: 1, hypo: 2, opio: 0, maoi: 0, other: [] },
  氯氮平: { sub: ['1A2', '3A4'], inh: [], ind: [], serot: 0, cns: 3, qt: 1, seiz: 2, ach: 2, hypo: 2, opio: 0, maoi: 0, other: ['agranulocytosis'] },
  帕利哌酮: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 1, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  齐拉西酮: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 1, qt: 2, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  布南色林: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  舒必利: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 1, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  氟哌噻吨: { sub: ['2D6'], inh: [], ind: [], serot: 0, cns: 1, qt: 1, seiz: 1, ach: 1, hypo: 1, opio: 0, maoi: 0, other: [] },
  丙戊酸钠: { sub: ['2C9', '2C19'], inh: ['2C9'], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: ['valproate'] },
  卡马西平: { sub: ['3A4'], inh: [], ind: ['3A4', '1A2', '2C19', '2C9'], serot: 0, cns: 2, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['carbamazepine'] },
  拉莫三嗪: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: ['sjs'] },
  碳酸锂: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 1, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: ['lithium'] },
  托吡酯: { sub: [], inh: [], ind: ['3A4'], serot: 0, cns: 2, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  阿普唑仑: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['bzd'] },
  艾司唑仑: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['bzd'] },
  地西泮: { sub: ['2C19', '3A4'], inh: [], ind: [], serot: 0, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['bzd'] },
  劳拉西泮: { sub: [], inh: [], ind: [], serot: 0, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['bzd'] },
  莱博雷生: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 2, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  思诺思: { sub: ['3A4', '1A2'], inh: [], ind: [], serot: 0, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['zdrug'] },
  佐匹克隆: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 3, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: ['zdrug'] },
  哌甲酯: { sub: [], inh: [], ind: [], serot: 0, cns: 0, qt: 1, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: ['stimulant'] },
  苯海索: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 2, hypo: 0, opio: 0, maoi: 0, other: [] },
  普萘洛尔: { sub: ['2D6', '1A2'], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  多奈哌齐: { sub: ['2D6', '3A4'], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  美金刚: { sub: [], inh: [], ind: [], serot: 0, cns: 1, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  加兰他敏: { sub: ['2D6', '3A4'], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 1, opio: 0, maoi: 0, other: [] },
  司美格鲁肽: { sub: [], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: ['glp1'] },
  泰诺: { sub: ['2E1', '1A2'], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: ['hepatotox'] },
  为力苏: { sub: ['3A4'], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  叶酸: { sub: [], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: [] },
  纳曲酮: { sub: [], inh: [], ind: [], serot: 0, cns: 0, qt: 0, seiz: 0, ach: 0, hypo: 0, opio: 0, maoi: 0, other: ['opioid_antagonist'] },
};

/* ---------- 执行 ---------- */
let added = 0, tagged = 0;
const missing = [];

drugs.forEach((d) => {
  if (RX[d.zh]) { d.rx = RX[d.zh]; tagged++; }
  else if (!d.rx) missing.push(d.zh);
});

NEW.forEach((nd) => {
  if (!drugs.some((d) => d.zh === nd.zh)) { drugs.push(nd); added++; }
});

fs.writeFileSync(p, JSON.stringify(drugs, null, 2), 'utf8');

console.log(`补 rx 字段: ${tagged} 味`);
console.log(`新增药物: ${added} 味`);
console.log(`总计: ${drugs.length} 味`);
if (missing.length) console.log(`未标注 rx: ${missing.join('、')}`);
