/**
 * 药枢 NeuroPharm · 同步后端（独立 Cloudflare Worker）
 * 路由：/auth/register /auth/login /sync/pull /sync/push /devices/list /devices/revoke
 * 存储：Cloudflare D1（users / states / devices）
 * 认证：邮箱 + 密码（PBKDF2-SHA256），HMAC-SHA256 自签 token（HS256，30 天）
 */
import { hashPassword, verifyPassword, makeToken, verifyToken } from './crypto.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS });
}

function getBearer(req) {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function authUid(req, env) {
  const tok = getBearer(req);
  if (!tok) return null;
  return await verifyToken(tok, env.JWT_SECRET);
}

function normEmail(e) {
  return (e || '').trim().toLowerCase();
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return corsPreflight();

    const url = new URL(request.url);
    const p = url.pathname;

    /* ---------- 注册 ---------- */
    if (p === '/auth/register' && request.method === 'POST') {
      const { email, password } = await request.json().catch(() => ({}));
      const em = normEmail(email);
      if (!em || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return json({ error: '邮箱格式不正确' }, 400);
      if (!password || password.length < 6) return json({ error: '密码至少 6 位' }, 400);

      const existing = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(em).first();
      if (existing) return json({ error: '该邮箱已注册' }, 409);

      const { salt, hash, iter } = await hashPassword(password);
      const uid = crypto.randomUUID();
      try {
        await env.DB.prepare(
          'INSERT INTO users (id,email,salt,pw_hash,iter,created_at) VALUES (?,?,?,?,?,?)'
        ).bind(uid, em, salt, hash, iter, Date.now()).run();
      } catch (e) {
        return json({ error: '该邮箱已注册' }, 409);
      }
      const token = await makeToken(uid, env.JWT_SECRET);
      return json({ uid, token });
    }

    /* ---------- 登录 ---------- */
    if (p === '/auth/login' && request.method === 'POST') {
      const { email, password } = await request.json().catch(() => ({}));
      const em = normEmail(email);
      const u = await env.DB.prepare('SELECT id,salt,pw_hash,iter FROM users WHERE email=?').bind(em).first();
      if (!u) return json({ error: '邮箱或密码错误' }, 401);
      const ok = await verifyPassword(password, u.salt, u.iter, u.pw_hash);
      if (!ok) return json({ error: '邮箱或密码错误' }, 401);
      const token = await makeToken(u.id, env.JWT_SECRET);
      return json({ uid: u.id, token });
    }

    /* ---------- 以下均需登录 ---------- */
    const uid = await authUid(request, env);
    if (!uid) return json({ error: '未登录或登录已过期' }, 401);

    /* ---------- 拉取状态 ---------- */
    if (p === '/sync/pull' && request.method === 'GET') {
      const row = await env.DB.prepare('SELECT state, updated_at FROM states WHERE user_id=?').bind(uid).first();
      if (!row) return json({ state: null, updatedAt: 0 });
      let state = null;
      try { state = row.state ? JSON.parse(row.state) : null; } catch (e) {}
      return json({ state, updatedAt: row.updated_at || 0 });
    }

    /* ---------- 推送状态 ---------- */
    if (p === '/sync/push' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (body.state === undefined) return json({ error: '缺少 state' }, 400);
      const now = Date.now();
      await env.DB.prepare(
        'INSERT INTO states (user_id,state,updated_at) VALUES (?,?,?) ' +
        'ON CONFLICT(user_id) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at'
      ).bind(uid, JSON.stringify(body.state), now).run();

      const dev = body.device || {};
      const devId = dev.id || 'web';
      await env.DB.prepare(
        'INSERT INTO devices (user_id,device_id,name,ua,last_seen) VALUES (?,?,?,?,?) ' +
        'ON CONFLICT(user_id,device_id) DO UPDATE SET name=excluded.name, ua=excluded.ua, last_seen=excluded.last_seen'
      ).bind(uid, devId, dev.name || '网页', dev.ua || '', now).run();

      return json({ updatedAt: now });
    }

    /* ---------- 设备列表 ---------- */
    if (p === '/devices/list' && request.method === 'GET') {
      const rows = await env.DB.prepare(
        'SELECT device_id,name,ua,last_seen FROM devices WHERE user_id=? ORDER BY last_seen DESC'
      ).bind(uid).all();
      return json({ devices: rows.results || [] });
    }

    /* ---------- 撤销设备 ---------- */
    if (p === '/devices/revoke' && request.method === 'POST') {
      const { deviceId } = await request.json().catch(() => ({}));
      if (!deviceId) return json({ error: '缺少 deviceId' }, 400);
      await env.DB.prepare('DELETE FROM devices WHERE user_id=? AND device_id=?').bind(uid, deviceId).run();
      return json({ ok: true });
    }

    return json({ error: 'Not Found' }, 404);
  },
};
