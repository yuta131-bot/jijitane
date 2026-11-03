#!/usr/bin/env python3
"""週ごとの「今週の時事 1枚プリント」を PDF にする。

  python3 scripts/make_print.py --dist dist

dist/weekly/週の月曜-print.html（build.mjs が作る）を Chromium で開き、A4 の PDF を dist/weekly/週の月曜.pdf に書き出す。
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', default='dist')
    args = ap.parse_args()
    dist = Path(args.dist).resolve()
    # 週ごとの1枚プリント（weekly/）と、DM・LINEで配る出題予想TOP20（gift/）
    pages = sorted(dist.glob('weekly/*-print.html')) + sorted(dist.glob('gift/*-print.html'))
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for f in pages:
            pg.goto(f.as_uri(), wait_until='networkidle')
            pg.evaluate('document.fonts.ready')
            pg.evaluate('window.__fit && window.__fit()')   # 覚えるシート：フォントがそろってから、A4に合わせて大きさを決めなおす
            if f.name.startswith('sheet-'):
                # 覚えるシート：ブロック（表・カードなど）の位置を書き出す（紹介動画で、話している所をアップにするため）
                info = pg.evaluate('''() => [...document.querySelectorAll('.sx-pg')].map(el => {
                    const r = el.getBoundingClientRect();
                    return {w: r.width, h: r.height, blocks: [...el.querySelectorAll('section.sx-b')].map(b => {
                        const q = b.getBoundingClientRect(), h = b.querySelector('h4');
                        let t = ''; if (h) { const c = h.cloneNode(true); c.querySelectorAll('small').forEach(x => x.remove()); t = c.textContent; }
                        return {t, x: (q.left - r.left) / r.width, y: (q.top - r.top) / r.height, w: q.width / r.width, h: q.height / r.height};
                    })};
                })''')
                (f.parent / (f.name.replace('-print.html', '') + '.blocks.json')).write_text(json.dumps(info, ensure_ascii=False), encoding='utf-8')
            out = f.parent / (f.name.replace('-print.html', '') + '.pdf')
            pg.pdf(path=str(out), format='A4', print_background=True, prefer_css_page_size=True)
            print('作成：', out.name)
        b.close()

if __name__ == '__main__':
    main()
