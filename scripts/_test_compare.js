/*
 * 药物对比视图测试：字段取值健壮性 + 表格渲染结构
 * 用法: node scripts/_test_compare.js
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
const DRUGS = require('../data/drugs.json');

function grabFn(name) {
  const st = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = body.match(st);
  if (!m) throw new Error('未找到函数 ' + name);
  let i = body.indexOf('{', m.index), d = 0, inStr = null, prev = '';
  for (; i < body.length; i++) {
    const c = body[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr && prev !== '\\') inStr = null; }
    else if (c === '"' || c === "'" || c === '`') inStr = c;
    else if (c === '/' && body[i + 1] === '/') { const nl = body.indexOf('\n', i); i = nl < 0 ? body.length : nl; continue; }
    else if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return body.slice(m.index, i + 1); }
    prev = c;
  }
  throw new Error('括号未配对: ' + name);
}

console.log('药物对比视图测试');

// 1. CMP_ROWS 结构
const rm = body.match(/const CMP_ROWS=(\[[\s\S]*?\n\]);/);
t('CMP_ROWS 已定义', !!rm);
const CMP_ROWS = eval(rm[1]);
t('对比行数 >= 8（覆盖关键字段）', CMP_ROWS.length >= 8);
t('每行均为 [标签, 取值函数]', CMP_ROWS.every(r => Array.isArray(r) && typeof r[0] === 'string' && typeof r[1] === 'function'));

// 2. 取值函数对全部 62 味药均不抛错
let err = null;
CMP_ROWS.forEach(r => {
  DRUGS.forEach(d => {
    try { const v = r[1](d); if (v !== undefined && v !== null && typeof v !== 'string' && typeof v !== 'number') err = r[0] + ' 返回非字符串: ' + typeof v; }
    catch (ex) { err = r[0] + ' 在 ' + d.zh + ' 抛错: ' + ex.message; }
  });
});
t('全部字段对 62 味药取值无异常', !err);
if (err) console.log('    ' + err);

// 3. 关键字段非空率
const keyIdx = CMP_ROWS.findIndex(r => r[0] === '作用机制');
const mechEmpty = DRUGS.filter(d => !CMP_ROWS[keyIdx][1](d)).map(d => d.zh);
t('作用机制无空值', mechEmpty.length === 0);
if (mechEmpty.length) console.log('    空值: ' + mechEmpty.join('、'));

const clsIdx = CMP_ROWS.findIndex(r => r[0] === '类别');
const clsEmpty = DRUGS.filter(d => !CMP_ROWS[clsIdx][1](d)).map(d => d.zh);
t('类别无空值', clsEmpty.length === 0);

// 4. renderCompare 渲染结构（mock DOM）
// 注意：不从 HTML 提取 escHtml —— 其正则字符类 /[&<>"]/ 含双引号，
// 会让括号配对提取器误判为字符串起始。测试内使用等价实现。
const escSrc = "function escHtml(s){return String(s==null?'':s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}";
const src = [
  'var CMP_ROWS=' + rm[1] + ';',
  escSrc,
  grabFn('renderCompare'),
].join('\n');
const store = {};
const mockEl = () => ({ set textContent(v) { store.sub = v; }, get textContent() { return store.sub; }, set innerHTML(v) { store.html = v; }, get innerHTML() { return store.html; } });
const els = { cmpSub: mockEl(), cmpTable: mockEl() };
const fn = new Function('DRUGS', 'compareSel', 'document', src + '\nrenderCompare();\nreturn true;');
fn(DRUGS, ['舍曲林', '氟西汀', '氯氮平'], { getElementById: id => els[id] || null });

const out = store.html || '';
t('渲染出表格', out.includes('<table') && out.includes('cmptab'));
t('表头含 3 味对比药', ['舍曲林', '氟西汀', '氯氮平'].every(n => out.includes(n)));
t('副标题用 vs 连接', (store.sub || '').includes('vs'));
// 数据行形如 <tr><th>标签</th>...；表头行是 <tr><th></th>（空标签），需排除
const dataRows = (out.match(/<tr><th>[^<]/g) || []).length;
t('数据行数 = CMP_ROWS 行数（' + dataRows + '/' + CMP_ROWS.length + '）', dataRows === CMP_ROWS.length);
// 取「作用机制」这一行统计单元格数
const mechRow = (out.split('作用机制')[1] || '').split('</tr>')[0] || '';
const cells = (mechRow.match(/<td>/g) || []).length;
t('每行列数 = 3（标签 + 3 味药数据格）', cells === 3);

// 5. 缺字段时回退为 —（构造残缺药）
const stub = [{ zh: '测试药', en: 'Test', cls: '测试类', sub: '', half: '', preg: '', mech: '', ind: [], side: [], dose: '', warn: '' }];
fn(stub, ['测试药'], { getElementById: id => els[id] || null });
t('缺失字段回退为 —', (store.html || '').includes('—'));

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
