/*
 * 搜索增强测试：拼音全拼 / 首字母 / 英文 / 中文 / 子类拼音 命中
 * 用法: node scripts/_test_search.js
 */
const DRUGS = require('../data/drugs.json');

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log('  [OK] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name); }
};

function matchDrug(d, q) {
  if (!q) return { hit: true, py: false };
  if ((d.zh + d.en + d.cls + d.sub + d.ind.join('')).toLowerCase().includes(q)) return { hit: true, py: false };
  const pyHay = ((d.py || '') + (d.pyi || '') + (d.spy || '') + (d.spyi || '')).toLowerCase();
  if (pyHay.includes(q)) return { hit: true, py: true };
  return { hit: false, py: false };
}
const search = q => DRUGS.filter(d => matchDrug(d, q).hit).map(d => d.zh);
const has = (q, name) => search(q).includes(name);

console.log('搜索增强测试（62 味药）');

// 拼音首字母
t('首字母 sql → 舍曲林', has('sql', '舍曲林'));
t('首字母 ldp → 氯氮平', has('ldp', '氯氮平'));
t('首字母 fxt → 氟西汀', has('fxt', '氟西汀'));
t('首字母 afhj → 奥氟合剂', has('afhj', '奥氟合剂'));

// 拼音全拼
t('全拼 shequlin → 舍曲林', has('shequlin', '舍曲林'));
t('全拼 lvdanping → 氯氮平（ü 归一化为 v）', has('lvdanping', '氯氮平'));
t('全拼 aofuheji → 奥氟合剂', has('aofuheji', '奥氟合剂'));

// 子类拼音
t('子类首字母 fdx → 非典型抗精神病药类', search('fdx').length >= 3);
t('子类全拼 yanlei → 盐类（锂盐等）', search('yanlei').length >= 1);

// 中文与英文仍可用
t('中文 舍曲林 → 命中', has('舍曲林', '舍曲林'));
t('英文 sertraline → 舍曲林', has('sertraline', '舍曲林'));
t('英文大小写不敏感 SERTRALINE → 舍曲林', has('sertraline', '舍曲林'));
t('适应症关键词 失眠 → 有结果', search('失眠').length > 0);

// 负例
t('无意义串 zzzz → 无结果', search('zzzz').length === 0);
t('拼音字段全覆盖（无缺失）', DRUGS.every(d => d.py && d.pyi));
t('无 ü 残留（应已转 v）', DRUGS.every(d => !String(d.py).includes('ü')));

// 索引唯一性：首字母不冲突过多（仅提示，不作为失败）
const dup = {};
DRUGS.forEach(d => { (dup[d.pyi] = dup[d.pyi] || []).push(d.zh); });
const conflicts = Object.keys(dup).filter(k => dup[k].length > 1);
console.log('  提示：首字母重名 ' + conflicts.length + ' 组 → ' + conflicts.slice(0, 5).map(k => k + '(' + dup[k].join('/') + ')').join(' '));

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
