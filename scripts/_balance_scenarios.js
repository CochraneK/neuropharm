/*
 * 均衡场景题正确答案位置（避免答案集中在同一选项被猜出）
 * 做法：对每题把正确项交换到目标索引，同时更新 ans
 * 用法: node scripts/_balance_scenarios.js
 */
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', 'psychopharm.html');
let html = fs.readFileSync(HTML, 'utf8');

const m = html.match(/const SCENARIOS=(\[[\s\S]*?\n\];)/);
if (!m) { console.error('未找到 SCENARIOS'); process.exit(1); }
const arr = eval(m[1].replace(/;$/, ''));

// 目标分布：尽量均分到 4 个位置
const n = arr.length;
const targets = [];
for (let i = 0; i < 4; i++) for (let k = 0; k < Math.round(n / 4); k++) targets.push(i);
while (targets.length < n) targets.push(targets.length % 4);
// 打乱目标顺序（保持每位置数量均衡，但不与原顺序相关）
for (let i = targets.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [targets[i], targets[j]] = [targets[j], targets[i]];
}

arr.forEach((sc, i) => {
  const to = targets[i];
  if (sc.ans !== to) {
    const tmp = sc.opts[sc.ans];
    sc.opts[sc.ans] = sc.opts[to];
    sc.opts[to] = tmp;
    sc.ans = to;
  }
});

// 序列化（字段顺序：case / q / opts / ans / why）
const body = arr.map(sc => {
  const o = '  {case:' + JSON.stringify(sc.case) + ',\n'
    + '  q:' + JSON.stringify(sc.q) + ',\n'
    + '  opts:' + JSON.stringify(sc.opts) + ',\n'
    + '  ans:' + sc.ans + ',\n'
    + '  why:' + JSON.stringify(sc.why) + '}';
  return o;
}).join(',\n');

const replaced = 'const SCENARIOS=[\n' + body + '\n];';
html = html.replace(m[0], replaced);
fs.writeFileSync(HTML, html, 'utf8');

const dist = [0, 0, 0, 0];
arr.forEach(sc => dist[sc.ans]++);
console.log('[_balance_scenarios] ' + n + ' 题已重排，答案分布: ' + dist.join(' / '));
