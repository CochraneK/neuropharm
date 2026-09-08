/* 相互作用自动推导引擎测试：验证关键临床组合的推导正确性 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'psychopharm.html'), 'utf8');
const lines = html.split('\n');
const s = lines.findIndex((l) => l.trim() === '<script>');
let e = -1;
for (let i = s + 1; i < lines.length; i++) { if (lines[i].trim() === '</script>') { e = i; break; } }
const body = lines.slice(s + 1, e).join('\n');

/* 括号配对提取（支持 function 与 const X = {...}） */
function grabAfter(headerRe, label) {
  const m = body.match(headerRe);
  if (!m) throw new Error('未找到 ' + label);
  let i = body.indexOf('{', m.index);
  if (i < 0) throw new Error(label + ' 无块体');
  let d = 0, inS = null, prev = '';
  const st = m.index;
  for (; i < body.length; i++) {
    const c = body[i];
    if (inS) { if (c === '\\') { i++; continue; } if (c === inS && prev !== '\\') inS = null; }
    else if (c === '"' || c === "'" || c === '`') inS = c;
    else if (c === '/' && body[i + 1] === '/') { const nl = body.indexOf('\n', i); i = nl < 0 ? body.length : nl; continue; }
    else if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return body.slice(st, i + 1); }
    prev = c;
  }
  throw new Error(label + ' 括号未平衡');
}
function grabLineConst(name) {
  const m = body.match(new RegExp('^const ' + name + '\\s*=.*$', 'm'));
  if (!m) throw new Error('未找到 const ' + name);
  return m[0];
}

const src = [
  grabAfter(/const CLASS_MAP\s*=\s*/, 'CLASS_MAP'),
  grabAfter(/function getClassKeys\(drug\)/, 'getClassKeys'),
  grabAfter(/const PAIRS\s*=\s*/, 'PAIRS'),
  grabAfter(/function keyOf\(a,b\)/, 'keyOf'),
  grabAfter(/function getRx\(name\)/, 'getRx'),
  grabLineConst('CYP_NAME'),
  grabLineConst('NARROW'),
  grabAfter(/function deriveInteractions\(a,b\)/, 'deriveInteractions'),
  grabLineConst('SEV_ORDER'),
  grabAfter(/function sevRank\(l\)/, 'sevRank'),
  grabAfter(/function getInteraction\(a,b\)/, 'getInteraction'),
].join('\n');

const DRUGS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'drugs.json'), 'utf8'));
const api = new Function('DRUGS', src + '\nreturn { deriveInteractions, getInteraction, getRx };')(DRUGS);

let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { console.log('  [OK] ' + name); pass++; }
  else { console.log('  [!!] ' + name + (extra ? '  → ' + extra : '')); fail++; }
}

console.log('相互作用自动推导引擎测试（药物 ' + DRUGS.length + ' 味）\n');

/* 1. 数据完整性 */
const noRx = DRUGS.filter((d) => !d.rx);
t('全部药物均已标注 rx 字段', noRx.length === 0, noRx.map((d) => d.zh).join('、'));

/* 2. MAOI + SSRI → 禁忌 */
{
  const [lvl] = api.getInteraction('反苯环丙胺', '氟西汀');
  t('MAOI + SSRI → 禁忌', lvl === '禁忌', '实际: ' + lvl);
}

/* 3. 纳曲酮 + 阿片 → 禁忌（急性戒断） */
{
  const r = api.deriveInteractions('纳曲酮', '美沙酮');
  const hit = r.find((x) => x[0] === '禁忌' && /戒断/.test(x[1]));
  t('纳曲酮 + 美沙酮 → 禁忌(急性戒断)', !!hit);
}

/* 4. CYP1A2 抑制 + 窄治疗窗底物 → 严重 */
{
  const r = api.deriveInteractions('氟伏沙明', '氯氮平');
  const hit = r.find((x) => /CYP1A2/.test(x[1]) && /氯氮平/.test(x[1]));
  t('氟伏沙明(抑1A2) + 氯氮平(1A2底物,窄窗) → 严重', !!hit && hit[0] === '严重', hit ? hit[0] : '未命中');
}

/* 5. CYP3A4 诱导 → 底物浓度降低 */
{
  const r = api.deriveInteractions('卡马西平', '阿普唑仑');
  const hit = r.find((x) => /诱导/.test(x[1]) && /CYP3A4/.test(x[1]));
  t('卡马西平(诱3A4) + 阿普唑仑(3A4底物) → 疗效下降提示', !!hit);
}

/* 6. QT 叠加 → 严重 */
{
  const [lvl] = api.getInteraction('美沙酮', '齐拉西酮');
  t('美沙酮(QT2) + 齐拉西酮(QT2) → 严重', lvl === '严重', '实际: ' + lvl);
}

/* 7. 中枢抑制叠加 → 严重 */
{
  const r = api.deriveInteractions('地西泮', '米氮平');
  const hit = r.find((x) => /中枢抑制/.test(x[1]));
  t('地西泮(CNS3) + 米氮平(CNS3) → 中枢抑制提示', !!hit, hit ? hit[0] : '未命中');
}

/* 8. 阿片 + 苯二氮䓬 → 呼吸抑制 */
{
  const r = api.deriveInteractions('丁丙诺啡', '地西泮');
  const hit = r.find((x) => /呼吸抑制/.test(x[1]));
  t('丁丙诺啡(阿片) + 地西泮(BZD) → 呼吸抑制警告', !!hit);
}

/* 9. 锂盐窄治疗窗提示 */
{
  const r = api.deriveInteractions('碳酸锂', '舍曲林');
  const hit = r.find((x) => /血锂/.test(x[1]));
  t('碳酸锂 + 舍曲林 → 血锂监测提示', !!hit);
}

/* 10. 无相互作用的组合 → 不误报（如叶酸 + 阿坎酸） */
{
  const r = api.deriveInteractions('叶酸', '阿坎酸');
  t('叶酸 + 阿坎酸 → 无推导结果(不误报)', r.length === 0, '命中 ' + r.length + ' 条');
}

/* 11. 全组合覆盖率统计 */
{
  const n = DRUGS.length;
  let withHit = 0, total = 0;
  const byLvl = { 禁忌: 0, 严重: 0, 中等: 0 };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      total++;
      const r = api.deriveInteractions(DRUGS[i].zh, DRUGS[j].zh);
      if (r.length) {
        withHit++;
        r.forEach((x) => { if (byLvl[x[0]] !== undefined) byLvl[x[0]]++; });
      }
    }
  }
  console.log('\n  全组合 ' + total + ' 对 → 推导出相互作用的: ' + withHit + ' 对 (' + (withHit / total * 100).toFixed(1) + '%)');
  console.log('  命中等级分布: 禁忌 ' + byLvl.禁忌 + ' / 严重 ' + byLvl.严重 + ' / 中等 ' + byLvl.中等);
  t('推导覆盖 > 300 对（远超原 72 对硬编码）', withHit > 300, '实际 ' + withHit);
}

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
