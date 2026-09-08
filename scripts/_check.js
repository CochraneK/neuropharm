/* 冒烟检查：提取 psychopharm.html 主脚本块做语法校验 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'psychopharm.html');
const lines = fs.readFileSync(htmlPath, 'utf8').split('\n');

// 定位主 <script> 块（第二个 script 标签，无 src）
const start = lines.findIndex((l) => l.trim() === '<script>');
let end = -1;
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i].trim() === '</script>') { end = i; break; }
}
if (start < 0 || end < 0) { console.error('未定位到主脚本块'); process.exit(1); }

const body = lines.slice(start + 1, end).join('\n');
const out = path.join(__dirname, '_main_extracted.js');
fs.writeFileSync(out, body);
console.log(`主脚本块: ${body.split('\n').length} 行 (html ${start + 1}-${end + 1})`);

// 语法检查：用 new Function 在隔离作用域编译（不执行）
try {
  new Function(body);
  console.log('主脚本语法 OK');
} catch (e) {
  console.error('主脚本语法错误:', e.message);
  process.exit(1);
}

// sync.js 语法
const syncPath = path.join(__dirname, '..', 'js', 'sync.js');
const syncSrc = fs.readFileSync(syncPath, 'utf8');
try {
  new Function(syncSrc);
  console.log('sync.js 语法 OK');
} catch (e) {
  console.error('sync.js 语法错误:', e.message);
  process.exit(1);
}

// 关键符号存在性检查
const checks = {
  'GAM.srs 字段': /srs:\{\}/.test(body),
  'ensureSRS 定义': /function ensureSRS\(\)/.test(body),
  'bindSRS 挂 window': /window\.bindSRS=bindSRS/.test(body),
  'saveSRS 调 saveGam': /function\s+saveSRS\s*\(\s*\)\s*\{[^}]*saveGam\s*\(\s*\)/.test(body),
  '迁移逻辑': /migrateSRS/.test(body),
  'sync 重绑': /bindSRS/.test(syncSrc),
};
console.log('\n关键改动检查:');
let bad = 0;
for (const [k, v] of Object.entries(checks)) {
  console.log(`  ${v ? '[OK]' : '[!!]'} ${k}`);
  if (!v) bad++;
}
process.exit(bad ? 1 : 0);
