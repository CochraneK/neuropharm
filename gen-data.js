/* 药枢 NeuroPharm · 单数据源生成器
 *
 * 唯一需要手改的文件是 drugs.json（药品清单）。
 * 本脚本把它转成 drugs-data.js：window.DRUGS = [...]
 * 这样网页版（https）和 Android App（file:///android_asset/）都能用
 * <script src="drugs-data.js"></script> 直接加载，避开 WebView 对 fetch(file://) 的 CORS 限制。
 *
 * 用法：node gen-data.js
 * 也可在 CI（pages.yml / build-apk.yml）里先跑这一步，保证 drugs-data.js 始终与 drugs.json 同步。
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'drugs.json');
const out = path.join(root, 'drugs-data.js');

const drugs = JSON.parse(fs.readFileSync(src, 'utf-8'));
const js = '/* AUTO-GENERATED from drugs.json — 不要手改本文件，改 drugs.json 后跑 node gen-data.js */\n'
  + 'window.DRUGS = ' + JSON.stringify(drugs) + ';\n';

fs.writeFileSync(out, js, 'utf-8');
console.log('[gen-data] ' + drugs.length + ' 味药 -> drugs-data.js');
