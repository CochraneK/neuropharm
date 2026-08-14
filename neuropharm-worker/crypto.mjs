/**
 * 药枢 NeuroPharm · 加密工具（纯函数，零依赖）
 * 同时被 worker.js（Cloudflare Workers）与 _smoke.mjs（Node 本地验证）复用。
 * - 密码哈希：PBKDF2-SHA256（Workers 原生 Web Crypto 支持，无需 scrypt/argon2 运行时）
 * - Token：HMAC-SHA256 自签（类 JWT 结构，HS256）
 */

export function toB64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

export function fromB64(b64) {
  const s = atob(b64);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

function b64url(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return s;
}

/** 哈希密码；saltB64 不传则随机生成。返回 {salt, hash, iter}。 */
export async function hashPassword(password, saltB64, iter = 120000) {
  const enc = new TextEncoder();
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    km,
    256
  );
  return { salt: toB64(salt), hash: toB64(new Uint8Array(bits)), iter };
}

/** 验证密码：用存储的 salt/iter 重算并常量时间比较。 */
export async function verifyPassword(password, saltB64, iter, expectedHash) {
  const h = await hashPassword(password, saltB64, iter);
  if (h.hash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.hash.length; i++) diff |= h.hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toB64(sig);
}

async function hmacVerify(message, sigB64, secret) {
  const expected = await hmacSign(message, secret);
  if (expected.length !== sigB64.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sigB64.charCodeAt(i);
  return diff === 0;
}

/** 签发 token：header.payload.sig（HS256）。默认 30 天有效。 */
export async function makeToken(uid, secret, ttlMs = 1000 * 60 * 60 * 24 * 30) {
  if (!secret) throw new Error('JWT_SECRET missing');
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: uid, exp: Date.now() + ttlMs };
  const h = b64url(toB64(new TextEncoder().encode(JSON.stringify(header))));
  const p = b64url(toB64(new TextEncoder().encode(JSON.stringify(payload))));
  const sig = await hmacSign(h + '.' + p, secret);
  return h + '.' + p + '.' + b64url(sig);
}

/** 校验 token：返回 uid（合法且未过期），否则 null。 */
export async function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const ok = await hmacVerify(h + '.' + p, fromB64url(sig), secret);
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64(p)));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload.sub;
  } catch (e) {
    return null;
  }
}
