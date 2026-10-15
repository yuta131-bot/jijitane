// SNS・OGP 用のカード画像（1200x675 PNG）を作る
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { esc, plain, jpDate } from './markup.mjs';

const FONT_DIR = path.resolve('fonts');
const FONTS = {
  'ZenMaruGothic-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/ZenMaruGothic-Bold.ttf',
  'ZenMaruGothic-Medium.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/ZenMaruGothic-Medium.ttf',
};

export async function ensureFonts() {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  for (const [name, url] of Object.entries(FONTS)) {
    const p = path.join(FONT_DIR, name);
    if (fs.existsSync(p) && fs.statSync(p).size > 100000) continue;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`フォントを取得できませんでした: ${url}`);
    fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  }
}

// 全角を2、半角を1として幅をざっくり測り、はみ出す分を「…」で切る
function clip(s, max) {
  let w = 0, out = '';
  for (const ch of s) {
    w += /[\x00-\x7f]/.test(ch) ? 1 : 2;
    if (w > max) return out + '…';
    out += ch;
  }
  return out;
}

export function cardSvg(a, cfg) {
  const dt = jpDate(a.date);
  const colors = { rika: '#1E9A72', shakai: '#DB7420', other: '#2E78C9' };
  const rows = a.news.map((n, i) => {
    const y = 250 + i * 110;
    const c = colors[n.subject_key] || colors.other;
    return `<rect x="70" y="${y}" width="1060" height="92" rx="20" fill="#fff" stroke="#1D2B44" stroke-width="4"/>
<circle cx="126" cy="${y + 46}" r="30" fill="${c}"/>
<text x="126" y="${y + 58}" text-anchor="middle" font-size="34" font-weight="700" fill="#fff">${i + 1}</text>
<text x="180" y="${y + 60}" font-size="40" font-weight="700" fill="#1D2B44">${esc(clip(plain(n.short_title || n.title), 46))}</text>`;
  }).join('\n');
  const grid = Array.from({ length: 50 }, (_, i) => `<line x1="${i * 24}" y1="0" x2="${i * 24}" y2="675" stroke="#DDEAF4" stroke-width="2"/>`).join('')
    + Array.from({ length: 29 }, (_, i) => `<line x1="0" y1="${i * 24}" x2="1200" y2="${i * 24}" stroke="#DDEAF4" stroke-width="2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" font-family="Zen Maru Gothic">
<rect width="1200" height="675" fill="#F5FAFE"/>${grid}
${cfg.brandPrefix ? `<rect x="70" y="72" width="96" height="60" rx="12" fill="#fff" stroke="#1D2B44" stroke-width="4"/><text x="118" y="116" text-anchor="middle" font-size="36" font-weight="700" fill="#1D2B44">${esc(cfg.brandPrefix)}</text><text x="184" y="128" font-size="62" font-weight="700" fill="#1D2B44">${esc(cfg.brandMain)}</text>` : `<text x="70" y="128" font-size="76" font-weight="700" fill="#1D2B44">${esc(cfg.siteName)}</text>`}
<text x="1130" y="128" text-anchor="end" font-size="40" font-weight="700" fill="#1D2B44">${esc(dt.label)}</text>
<rect x="70" y="152" width="1060" height="8" fill="#1D2B44"/>
<rect x="70" y="182" width="${Math.min(1060, 30 + clip(cfg.taglineShort || cfg.tagline, 60).length * 30)}" height="44" rx="22" fill="#FFE36E"/>
<text x="92" y="215" font-size="28" font-weight="500" fill="#1D2B44">${esc(clip(cfg.taglineShort || cfg.tagline, 60))}</text>
${rows}
<text x="70" y="632" font-size="30" font-weight="700" fill="#DB7420">Q.</text>
<text x="118" y="632" font-size="30" font-weight="500" fill="#1D2B44">${esc(clip(plain(a.news[0].quiz.q), 64))}</text>
</svg>`;
}

export async function renderCard(a, cfg, outPath) {
  await ensureFonts();
  const resvg = new Resvg(cardSvg(a, cfg), {
    font: {
      fontFiles: Object.keys(FONTS).map((f) => path.join(FONT_DIR, f)),
      loadSystemFonts: false,
      defaultFontFamily: 'Zen Maru Gothic',
    },
  });
  const png = resvg.render().asPng();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);
  return png;
}
