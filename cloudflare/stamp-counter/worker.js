// スタンプ帳の「回数だけ」を数える Cloudflare Worker（個人を特定する情報は受け取らない・保存しない）
//   受け取るもの：スタンプを押したときの「累計の個数 n」だけ（例：n=7）
//   数えるもの  ：その日（日本時間）に、スタンプを押した人の数／はじめて押した人の数／称号の個数に届いた人の数
//   保存先      ：KV（バインド名 STAMPS）。120日で自動で消える
//   見るとき    ：GET /stats?days=14 （Authorization: Bearer <STATS_TOKEN> が必要）
const RANKS = [5, 10, 20, 30, 50, 100];
const ORIGINS = ['https://jijitane.com', 'https://www.jijitane.com'];
const jst = (off = 0) => new Date(Date.now() + 9 * 3600e3 + off * 86400e3).toISOString().slice(0, 10);

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === 'POST') {
      if (!ORIGINS.includes(req.headers.get('Origin') || '')) return new Response(null, { status: 204 });
      const m = /n=(\d{1,3})/.exec(await req.text());
      const n = m ? parseInt(m[1], 10) : 0;
      if (n < 1 || n > 400) return new Response(null, { status: 204 });
      const day = jst();
      const bump = async (k) => {
        const key = `d:${day}:${k}`;
        const v = parseInt((await env.STAMPS.get(key)) || '0', 10);
        await env.STAMPS.put(key, String(v + 1), { expirationTtl: 60 * 60 * 24 * 120 });
      };
      await bump('active');
      if (n === 1) await bump('new');
      if (RANKS.includes(n)) await bump('r' + n);
      return new Response(null, { status: 204 });
    }
    if (req.method === 'GET' && u.pathname === '/stats') {
      if (!env.STATS_TOKEN || req.headers.get('Authorization') !== `Bearer ${env.STATS_TOKEN}`) return new Response('no', { status: 401 });
      const days = Math.min(60, Math.max(1, parseInt(u.searchParams.get('days') || '14', 10)));
      const out = [];
      for (let i = days; i >= 1; i--) {
        const date = jst(-i), row = { date };
        for (const k of ['active', 'new', ...RANKS.map((r) => 'r' + r)]) row[k] = parseInt((await env.STAMPS.get(`d:${date}:${k}`)) || '0', 10);
        out.push(row);
      }
      return new Response(JSON.stringify({ days: out }), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('ok');
  },
};
