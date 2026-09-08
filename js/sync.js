/* 药枢 NeuroPharm · 数据同步客户端（LWW by updatedAt）
 * 依赖：主脚本全局 GAM / defaultGam / saveGam / updateGamUI
 * 依赖：auth.js 全局 NPAuth
 */
const NPSync = (function () {
  let _timer = null;
  let _applyingRemote = false;
  const LS_LAST = 'neuropharm_last_sync_v1';

  function deviceInfo() {
    let id = localStorage.getItem('neuropharm_device_id');
    if (!id) {
      id = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('neuropharm_device_id', id);
    }
    return { id, name: (navigator.platform || '网页'), ua: (navigator.userAgent || '') };
  }

  function markLocalRev() {
    if (!GAM._rev) GAM._rev = 0;
    GAM._rev = Math.max(GAM._rev || 0, Date.now());
  }

  function schedulePush() {
    if (_applyingRemote) return;
    if (!window.NPAuth || !NPAuth.token()) return; // 本地模式不推送
    markLocalRev();
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(() => { _timer = null; pushNow(); }, 800);
  }

  async function pushNow() {
    if (!window.NPAuth || !NPAuth.token()) return;
    try {
      markLocalRev();
      await NPAuth.request('/sync/push', { method: 'POST', body: { state: GAM, device: deviceInfo() } });
      const now = Date.now();
      localStorage.setItem(LS_LAST, String(now));
      if (typeof updateGamUI === 'function') updateGamUI();
    } catch (e) {
      console.warn('[NPSync] push failed', e);
    }
  }

  async function pull() {
    if (!window.NPAuth || !NPAuth.token()) return false;
    try {
      const d = await NPAuth.request('/sync/pull');
      const serverRev = d.updatedAt || 0;
      const localRev = GAM._rev || 0;
      if (d.state && serverRev >= localRev) {
        // 服务端数据更新或持平 → 采用服务端（覆盖本地）
        _applyingRemote = true;
        GAM = Object.assign((typeof defaultGam === 'function' ? defaultGam() : {}), d.state);
        GAM._rev = serverRev;
        if (typeof saveGam === 'function') saveGam(); // 本地持久化（_applyingRemote 阻止推送）
        _applyingRemote = false;
        if (typeof updateGamUI === 'function') updateGamUI();
        return true;
      }
      if (localRev > serverRev) {
        // 本地更新更新 → 推送本地
        await pushNow();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[NPSync] pull failed', e);
      return false;
    }
  }

  function lastSync() {
    return Number(localStorage.getItem(LS_LAST) || '0');
  }

  async function listDevices() {
    if (!window.NPAuth || !NPAuth.token()) return [];
    try {
      const d = await NPAuth.request('/devices/list');
      return (d && d.devices) || [];
    } catch (e) { return []; }
  }

  async function revoke(devId) {
    if (!window.NPAuth || !NPAuth.token() || !devId) return;
    try {
      await NPAuth.request('/devices/revoke', { method: 'POST', body: { deviceId: devId } });
    } catch (e) {}
  }

  return { schedulePush, pushNow, pull, lastSync, listDevices, revoke, deviceInfo };
})();

/* 让 saveGam 在本地保存后自动安排同步（800ms 防抖） */
(function () {
  if (typeof window.saveGam !== 'function') return;
  const orig = window.saveGam;
  window.saveGam = function () {
    if (orig) orig();
    if (window.NPSync) NPSync.schedulePush();
  };
})();
