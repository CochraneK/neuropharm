/* SRS 并入 GAM 的逻辑验证（mock 环境） */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'psychopharm.html'), 'utf8');
const lines = html.split('\n');
const s = lines.findIndex((l) => l.trim() === '<script>');
let e = -1;
for (let i = s + 1; i < lines.length; i++) { if (lines[i].trim() === '</script>') { e = i; break; } }
const body = lines.slice(s + 1, e).join('\n');

// 提取 SRS 相关函数 + defaultGam/loadGam/saveGam/LS_KEY（只取需要的纯逻辑部分，跳过 DOM 部分）
function grab(re, label) {
  const m = body.match(re);
  if (!m) throw new Error('未找到 ' + label);
  return m[0];
}

// 基于花括号配对的稳健提取（跳过字符串/注释内的括号）
function grabFn(name) {
  const startRe = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = body.match(startRe);
  if (!m) throw new Error('未找到函数 ' + name);
  const start = m.index;
  let i = body.indexOf('{', start);
  if (i < 0) throw new Error('函数 ' + name + ' 无函数体');
  let depth = 0, inStr = null, prev = '';
  const begin = i;
  for (; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr && prev !== '\\') inStr = null;
    } else if (c === '"' || c === "'" || c === '`') {
      inStr = c;
    } else if (c === '/' && body[i + 1] === '/') {
      const nl = body.indexOf('\n', i); i = nl < 0 ? body.length : nl; continue;
    } else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return body.slice(start, i + 1); }
    prev = c;
  }
  throw new Error('函数 ' + name + ' 括号未平衡');
}

const src = [
  grab(/const SRS_KEY=['"][^'"]+['"];/, 'SRS_KEY'),
  grab(/const SRS_DEFAULTS=\{[^}]*\};/, 'SRS_DEFAULTS'),
  grabFn('defaultGam'),
  grabFn('todayMS'),
  grabFn('saveSRS'),
  grabFn('ensureSRS'),
  grabFn('getDueCount'),
  grabFn('getSRSQueue'),
  grabFn('recordSRS'),
].join('\n');

// mock 环境
const store = {};
const sandbox = {
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  DRUGS: [{ zh: '舍曲林' }, { zh: '氟西汀' }, { zh: '奥氮平' }],
  GAM: null,
  saveGamCalls: 0,
  shuffle: (a) => a, // 稳定排序便于断言
  checkGoal: () => {},
  updateSRSHomeUI: () => {},
  console,
};

const fn = new Function(
  'localStorage', 'DRUGS', 'shuffle', 'checkGoal', 'updateSRSHomeUI', 'console', 'saveGamHook',
  src + `
  var GAM = defaultGam();
  var SRS = ensureSRS();
  function bindSRS(){ SRS=ensureSRS(); }
  function saveGam(){ saveGamHook(); }
  return {
    get GAM(){return GAM;}, set GAM(v){GAM=v;},
    get SRS(){return SRS;}, set SRS(v){SRS=v;},
    bindSRS, saveSRS, recordSRS, getDueCount, getSRSQueue, ensureSRS, defaultGam, todayMS
  };`
);

const api = fn(sandbox.localStorage, sandbox.DRUGS, sandbox.shuffle, sandbox.checkGoal, sandbox.updateSRSHomeUI, console, () => { sandbox.saveGamCalls++; });

let pass = 0, fail = 0;
function t(name, cond) { if (cond) { console.log('  [OK] ' + name); pass++; } else { console.log('  [!!] ' + name); fail++; } }

console.log('SRS 并入 GAM 逻辑测试\n');

// 1. 默认补全
t('所有药物都有 SRS 条目', sandbox.DRUGS.every((d) => api.SRS[d.zh] && api.SRS[d.zh].reps === 0));
t('SRS 即 GAM.srs（同一引用）', api.GAM.srs === api.SRS);

// 2. 记住 → 间隔递进
const before = sandbox.saveGamCalls;
api.recordSRS('舍曲林', true);
const s1 = api.SRS['舍曲林'];
t('记住后 reps=1', s1.reps === 1);
t('记住后 interval=1 天', s1.interval === 1);
t('nextReview 为明天', s1.nextReview > api.todayMS());
t('recordSRS 触发 saveGam（进而触发云同步）', sandbox.saveGamCalls > before);

// 第二次记住 → 3 天
api.recordSRS('舍曲林', true);
t('第二次记住 interval=3', api.SRS['舍曲林'].interval === 3);
t('ease 上升', api.SRS['舍曲林'].ease > 2.5);

// 3. 没记住 → 重置（ease 应相对下降前变小，而非对比固定值）
const easeBefore = api.SRS['舍曲林'].ease;
api.recordSRS('舍曲林', false);
const s2 = api.SRS['舍曲林'];
t('没记住后 reps 重置为 0', s2.reps === 0);
t('没记住后 interval=1', s2.interval === 1);
t('没记住后 ease 相对下降', s2.ease < easeBefore);
t('ease 不低于下限 1.3', s2.ease >= 1.3);

// 4. 到期队列：舍曲林/氟西汀 nextReview=明天（未到期），仅奥氮平（新卡 nextReview=0）计入
api.recordSRS('氟西汀', true); t('新卡记录后进入已学', api.SRS['氟西汀'].reps === 1);
const dueBefore = api.getDueCount();
t('仅未到期/新卡计入待复习（预期 1）', dueBefore === 1);
// 舍曲林忘记后 reps 重置=0 → 与奥氮平同归「新卡」批，均排在已学卡（氟西汀）之前
const q = api.getSRSQueue();
t('队列元素全为数字索引（防对象混入）', q.every((x) => typeof x === 'number'));
t('新卡/重置卡优先于已学卡', q.indexOf(1) > Math.max(q.indexOf(0), q.indexOf(2)));
t('队列覆盖全部 3 味药', q.length === 3 && new Set(q).size === 3);

// 5. 远程覆盖后重绑
const remote = api.defaultGam();
remote.srs = { '舍曲林': { interval: 30, nextReview: 0, reps: 5, ease: 2.8 } };
api.GAM = remote;
api.bindSRS();
t('远程 GAM 覆盖后 SRS 重绑成功', api.SRS === remote.srs);
t('远程 SRS 数据生效', api.SRS['舍曲林'].reps === 5);
t('重绑后缺失药物自动补全', api.SRS['奥氮平'] && api.SRS['奥氮平'].reps === 0);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
