/*
 * 为 data/drugs.json 每味药生成拼音索引字段（搜索增强用）
 *   py   : 中文名全拼（无声调，如 shequlin）
 *   pyi  : 中文名首字母（如 sql）
 *   spy  : 子类全拼（如 xinjingshendilei）
 *   spyi : 子类首字母（如 xjsdl）
 * 用法: NODE_PATH=<workspace>/node_modules node scripts/gen-pinyin.js
 */
const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

const JSON_PATH = path.join(__dirname, '..', 'data', 'drugs.json');

const hanziOnly = s => (String(s || '').match(/[\u4e00-\u9fa5]+/g) || []).join('');

// ü 归一化为 v（输入法习惯：绿=lv，氯氮平=lvdanping）
const norm = s => s.replace(/ü/g, 'v');

function full(s) {
  const hz = hanziOnly(s);
  return hz ? norm(pinyin(hz, { toneType: 'none', type: 'array' }).join('').toLowerCase()) : '';
}
function initials(s) {
  const hz = hanziOnly(s);
  return hz ? pinyin(hz, { toneType: 'none', pattern: 'first', type: 'array' }).join('').toLowerCase() : '';
}

const drugs = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
let changed = 0;
drugs.forEach(d => {
  const py = full(d.zh);
  const pyi = initials(d.zh);
  const spy = full(d.sub);
  const spyi = initials(d.sub);
  if (d.py !== py || d.pyi !== pyi || d.spy !== spy || d.spyi !== spyi) changed++;
  d.py = py; d.pyi = pyi; d.spy = spy; d.spyi = spyi;
});

fs.writeFileSync(JSON_PATH, JSON.stringify(drugs, null, 2), 'utf8');
console.log(`[gen-pinyin] ${drugs.length} 味药已生成拼音索引（变更 ${changed} 处）`);
console.log('  示例:', drugs.slice(0, 3).map(d => `${d.zh}=${d.py}/${d.pyi}`).join('  '));
