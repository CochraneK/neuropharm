/**
 * 本地验证 crypto.mjs（Node 22 自带 Web Crypto / btoa / atob）
 * 运行：node neuropharm-worker/_smoke.mjs
 */
import { hashPassword, verifyPassword, makeToken, verifyToken } from './crypto.mjs';

const t0 = Date.now();

const { salt, hash, iter } = await hashPassword('secret123');
console.log('1) hash length      :', hash.length, '(expect > 0)');
console.log('2) verify correct   :', await verifyPassword('secret123', salt, iter, hash), '(expect true)');
console.log('3) verify wrong     :', await verifyPassword('wrongpass', salt, iter, hash), '(expect false)');

const tok = await makeToken('user-1', 'test-secret');
console.log('4) token parts      :', tok.split('.').length, '(expect 3)');
console.log('5) verify token     :', await verifyToken(tok, 'test-secret'), '(expect user-1)');
console.log('6) bad secret       :', await verifyToken(tok, 'other-secret'), '(expect null)');

const expTok = await makeToken('user-2', 'test-secret', -1000); // 已过期
console.log('7) expired token    :', await verifyToken(expTok, 'test-secret'), '(expect null)');

console.log('elapsed             :', Date.now() - t0, 'ms');
console.log('SMOKE OK');
