// 「LINEで受け取る」の計測用ページ（/go/line-○○.html）。押された回数は、このページの表示回数として、Cloudflare の計測に出る
import { esc } from './markup.mjs';

export const lineGoHref = (base, src) => `${base}/go/line-${src}.html`;

export function goPage(cfg, url) {
  const beacon = cfg.analytics?.cloudflare ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: String(cfg.analytics.cloudflare) }).replace(/'/g, '')}'></script>` : '';
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LINEを開いています</title>
<style>body{font-family:system-ui,"Hiragino Sans","Noto Sans JP",sans-serif;background:#F5FAFE;color:#1D2B44;text-align:center;padding:64px 20px}a{color:#06A64A;font-weight:900}</style>
${beacon}</head><body><p>LINEを開いています…</p><p><a href="${esc(url)}">開かないときは、こちらをタップ</a></p>
<script>setTimeout(function(){location.replace(${JSON.stringify(url)})},1200)</script></body></html>
`;
}
