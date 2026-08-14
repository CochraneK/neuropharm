/* 药枢 NeuroPharm · 账号与同步客户端（UI 层）
 * 依赖：主脚本全局 GAM / defaultGam / saveGam / updateGamUI / showToast
 * 依赖：sync.js 全局 NPSync
 */
const NPAuth = (function () {
  const LS = 'neuropharm_auth_v1';
  const API_BASE = (localStorage.getItem('neuropharm_api_base')) ||
    'https://neuropharm-sync.cunyikang.workers.dev';

  function get() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } }
  function set(a) { localStorage.setItem(LS, JSON.stringify(a)); }
  function clear() { localStorage.removeItem(LS); }
  function token() { const a = get(); return a && a.token; }
  function uid() { const a = get(); return a && a.uid; }
  function email() { const a = get(); return a && a.email; }

  async function request(path, opts) {
    opts = opts || {};
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    const res = await fetch(API_BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || ('请求失败 (' + res.status + ')'));
    return data;
  }

  async function register(email, password) {
    const d = await request('/auth/register', { method: 'POST', body: { email, password } });
    set({ uid: d.uid, token: d.token, email });
    return d;
  }
  async function login(email, password) {
    const d = await request('/auth/login', { method: 'POST', body: { email, password } });
    set({ uid: d.uid, token: d.token, email });
    return d;
  }
  function logout() { clear(); }

  return { get, token, uid, email, register, login, logout, request, API_BASE };
})();

/* ---------- 登录门 + 同步中心 ---------- */
let _authMode = 'login';

function setAuthMode(m) {
  _authMode = m;
  const btn = document.getElementById('authSubmit');
  const sw = document.getElementById('authSwitch');
  if (btn) btn.textContent = (m === 'login' ? '登录' : '注册');
  if (sw) sw.textContent = (m === 'login' ? '没有账号？注册一个' : '已有账号？去登录');
  const msg = document.getElementById('authMsg');
  if (msg) msg.textContent = '';
}

function fmtAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
  return Math.floor(s / 86400) + ' 天前';
}

function renderSyncStatus() {
  const st = document.getElementById('syncStatus');
  if (!st) return;
  const nowRow = document.getElementById('syncNowRow');
  const devRow = document.getElementById('syncDevicesRow');
  const loRow = document.getElementById('logoutRow');
  const lrRow = document.getElementById('syncLoginRow');

  if (!NPAuth.token()) {
    st.textContent = '本地模式（不同步）';
    if (nowRow) nowRow.style.opacity = '.4';
    if (loRow) loRow.style.display = 'none';
    if (devRow) devRow.style.display = 'none';
    if (lrRow) lrRow.style.display = '';
    const c = document.getElementById('syncDevCount'); if (c) c.textContent = '—';
    return;
  }
  if (nowRow) nowRow.style.opacity = '1';
  if (loRow) loRow.style.display = '';
  if (devRow) devRow.style.display = '';
  if (lrRow) lrRow.style.display = 'none';

  const ls = (window.NPSync && NPSync.lastSync()) || 0;
  st.textContent = ls ? ('上次同步 ' + fmtAgo(ls)) : '尚未同步';
  if (window.NPSync) {
    NPSync.listDevices().then((devs) => {
      const c = document.getElementById('syncDevCount');
      if (c) c.textContent = ((devs && devs.length) || 1) + ' 台';
    });
  }
}

function proceed() {
  const g = document.getElementById('authGate');
  if (g) g.style.display = 'none';
  if (NPAuth.token() && window.NPSync) {
    NPSync.pull().then(() => { updateGamUI(); renderSyncStatus(); });
  }
  updateGamUI();
  renderSyncStatus();
}

async function authSubmit() {
  const emailEl = document.getElementById('authEmail');
  const pwdEl = document.getElementById('authPwd');
  const msg = document.getElementById('authMsg');
  const email = (emailEl && emailEl.value || '').trim();
  const pwd = (pwdEl && pwdEl.value || '');
  if (!email || !pwd) { if (msg) msg.textContent = '请输入邮箱和密码'; return; }
  if (msg) msg.textContent = '处理中…';
  try {
    if (_authMode === 'login') await NPAuth.login(email, pwd);
    else await NPAuth.register(email, pwd);
    proceed();
  } catch (e) {
    if (msg) msg.textContent = e.message || '出错了，请重试';
  }
}

function initAuth() {
  const submit = document.getElementById('authSubmit');
  const sw = document.getElementById('authSwitch');
  const local = document.getElementById('authLocal');
  if (submit) submit.onclick = authSubmit;
  if (sw) sw.onclick = () => setAuthMode(_authMode === 'login' ? 'register' : 'login');
  if (local) local.onclick = () => proceed(); // 本地体验，不登录
  setAuthMode('login');

  const sn = document.getElementById('syncNowRow');
  if (sn) sn.onclick = () => {
    if (!NPAuth.token()) return;
    if (window.NPSync) NPSync.pushNow().then(renderSyncStatus);
    if (typeof showToast === 'function') showToast('已同步 ✓');
  };
  const lo = document.getElementById('logoutRow');
  if (lo) lo.onclick = () => {
    if (confirm('退出登录？本机学习记录仍会保留在此设备上。')) { NPAuth.logout(); location.reload(); }
  };
  const lr = document.getElementById('syncLoginRow');
  if (lr) lr.onclick = () => { const g = document.getElementById('authGate'); if (g) g.style.display = 'flex'; };

  if (NPAuth.token()) proceed();
  else { const g = document.getElementById('authGate'); if (g) g.style.display = 'flex'; }
}

initAuth();
