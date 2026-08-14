// deploy.mjs — 一键部署 neuropharm-sync 后端
// 前置：已 `npm install wrangler`（本目录 node_modules/.bin/wrangler）
// 凭证：从 neuropharm-worker/.cf_env 读取（避免明文写在脚本里）
//   CLOUDFLARE_API_TOKEN=xxxx          # 自定义令牌：Account > Workers Scripts:Edit + D1:Edit
//   CLOUDFLARE_ACCOUNT_ID=xxxx         # 仪表盘首页右侧的账户 ID（非机密）
// 运行：node deploy.mjs

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const WR = join(ROOT, 'node_modules', '.bin', 'wrangler');
const SECRET_FILE = join(ROOT, '.jwt_secret_tmp');
const APP_ROOT = join(ROOT, '..');

// ── 1. 载入凭证 ───────────────────────────────────────────────
const envPath = join(ROOT, '.cf_env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!TOKEN) { console.error('✗ 缺少 CLOUDFLARE_API_TOKEN（写入 .cf_env 或导出到环境变量）'); process.exit(1); }
if (!ACCOUNT) { console.error('✗ 缺少 CLOUDFLARE_ACCOUNT_ID（写入 .cf_env 或导出到环境变量）'); process.exit(1); }
process.env.CLOUDFLARE_API_TOKEN = TOKEN;
process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;

function run(cmd, input) {
  const opts = { cwd: ROOT, stdio: 'inherit' };
  if (input !== undefined) opts.input = input;
  return execSync(cmd, opts);
}
function capture(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' });
}
const log = (...a) => console.log('\x1b[36m•\x1b[0m', ...a);

// ── 2. 写入 account_id ────────────────────────────────────────
log('写入 account_id 到 wrangler.toml');
let toml = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8');
toml = toml.replace(/account_id\s*=\s*"[^"]*"/, `account_id = "${ACCOUNT}"`);
writeFileSync(join(ROOT, 'wrangler.toml'), toml);

// ── 3. 创建 D1（幂等：已存在则改用 d1 list 解析 id）────────────
log('创建 D1 数据库 neuropharm …');
let dbId = null;
try {
  const out = capture(`"${WR}" d1 create neuropharm`);
  const m = out.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (m) dbId = m[1];
} catch { /* 已存在 */ }
if (!dbId) {
  const out = capture(`"${WR}" d1 list`);
  for (const line of out.split('\n')) {
    if (/neuropharm/i.test(line)) {
      const m = line.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) { dbId = m[1]; break; }
    }
  }
}
if (!dbId) { console.error('✗ 无法确定 D1 database_id'); process.exit(1); }
log('D1 database_id =', dbId);
toml = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8')
  .replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${dbId}"`);
writeFileSync(join(ROOT, 'wrangler.toml'), toml);

// ── 4. 注入 JWT_SECRET（从 .jwt_secret_tmp 读取）──────────────
if (!existsSync(SECRET_FILE)) { console.error('✗ 找不到 .jwt_secret_tmp（请先生成密钥）'); process.exit(1); }
const secret = readFileSync(SECRET_FILE, 'utf8').trim();
log('注入 JWT_SECRET（wrangler secret put）…');
run(`"${WR}" secret put JWT_SECRET`, secret + '\n');

// ── 5. 建表 ──────────────────────────────────────────────────
log('执行 schema.sql 建表 …');
run(`"${WR}" d1 execute neuropharm --remote --file=./schema.sql`);

// ── 6. 部署 ──────────────────────────────────────────────────
log('部署 Worker …');
const deployOut = capture(`"${WR}" deploy`);
console.log(deployOut);
let url = (deployOut.match(/https:\/\/[^\s'"]+\.workers\.dev/i) || [null])[0];
if (!url) { console.error('⚠ 未能从部署输出解析 workers.dev URL，请手动确认后回填 auth.js'); process.exit(2); }
log('Worker URL =', url);

// ── 7. 回填 auth.js 的 API_BASE ──────────────────────────────
const authPath = join(APP_ROOT, 'auth.js');
let auth = readFileSync(authPath, 'utf8');
const before = auth;
auth = auth.replace(/'https:\/\/[^']*workers\.dev'/, `'${url}'`);
if (auth === before) { console.error('⚠ auth.js 未匹配到占位 URL，请手动更新 API_BASE'); }
else { writeFileSync(authPath, auth); log('已回填 auth.js ->', url); }

console.log('\n\x1b[32m✅ 部署完成：多设备同步后端已上线。\x1b[0m');
