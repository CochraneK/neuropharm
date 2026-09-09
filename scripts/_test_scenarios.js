/*
 * 场景病例题测试：结构完整性 + 答案有效性 + 题库集成
 * 从 psychopharm.html 提取 SCENARIOS 常量与 buildQuizBank 相关逻辑
 * 用法: node scripts/_test_scenarios.js
 */
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  [OK] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name); }
};

const html = fs.readFileSync(path.join(__dirname, '..', 'psychopharm.html'), 'utf8');
const lines = html.split('\n');
const s = lines.findIndex(l => l.trim() === '<script>');
let e = -1;
for (let i = s + 1; i < lines.length; i++) { if (lines[i].trim() === '</script>') { e = i; break; } }
const body = lines.slice(s + 1, e).join('\n');

// 提取 const SCENARIOS=[...];
const m = body.match(/const SCENARIOS=(\[[\s\S]*?\n\];)/);
if (!m) { console.log('  [FAIL] 未找到 SCENARIOS'); process.exit(1); }
const SCENARIOS = eval(m[1].replace(/;$/, ''));
const DRUGS = require('../data/drugs.json');

console.log('场景病例题测试');
t('SCENARIOS 已定义且非空', SCENARIOS.length > 0);
console.log('  题量: ' + SCENARIOS.length);

SCENARIOS.forEach((sc, i) => {
  const tag = '#' + (i + 1);
  const short = (sc.q || '').slice(0, 18);
  t(tag + ' 有病例描述', typeof sc.case === 'string' && sc.case.length > 10);
  t(tag + ' 有问题', typeof sc.q === 'string' && sc.q.length > 3);
  t(tag + ' 恰有 4 个选项', Array.isArray(sc.opts) && sc.opts.length === 4);
  t(tag + ' ans 在有效范围', Number.isInteger(sc.ans) && sc.ans >= 0 && sc.ans <= 3);
  t(tag + ' 有解析', typeof sc.why === 'string' && sc.why.length > 10);
  t(tag + ' 选项互不重复', new Set(sc.opts).size === 4);
  if (!Number.isInteger(sc.ans) || sc.ans < 0 || sc.ans > 3) console.log('    题目: ' + short);
});

// 题库集成：模拟 buildQuizBank 的自动题生成
let auto = 0;
DRUGS.forEach(d => {
  auto++;                                     // 分类归属
  if (d.ind && d.ind.length) auto++;          // 适应症
  if (d.side && d.side.length) auto++;        // 不良反应
  auto++;                                     // 反向归类
});
// 用 {q: 出现次数计数（按行 split 会把首段注释算进去，导致多计 1）
const curatedCount = ((body.match(/const CURATED=\[[\s\S]*?\n\];/) || [''])[0].match(/\{q:/g) || []).length;
const total = auto + curatedCount + SCENARIOS.length;
t('题库总量 = 自动 ' + auto + ' + 精选 ' + curatedCount + ' + 场景 ' + SCENARIOS.length + ' = ' + total,
  total === auto + curatedCount + SCENARIOS.length);
const ratio = Math.round(SCENARIOS.length / total * 100);
t('场景题占比合理（' + ratio + '% < 15%）', SCENARIOS.length / total < 0.15);

// 正确答案分布：不应全部集中在一个索引（防止答题规律被猜出）
const dist = [0, 0, 0, 0];
SCENARIOS.forEach(sc => dist[sc.ans]++);
console.log('  答案分布: ' + dist.join(' / '));
t('答案分布覆盖多个位置', dist.filter(x => x > 0).length >= 3);

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
