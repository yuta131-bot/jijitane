#!/usr/bin/env python3
"""週ごとの「今週の時事 1枚プリント」を PDF にする。

  python3 scripts/make_print.py --dist dist

dist/weekly/週の月曜-print.html（build.mjs が作る）を Chromium で開き、A4 の PDF を dist/weekly/週の月曜.pdf に書き出す。
"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', default='dist')
    args = ap.parse_args()
    wk = Path(args.dist).resolve() / 'weekly'
    pages = sorted(wk.glob('*-print.html'))
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for f in pages:
            pg.goto(f.as_uri(), wait_until='networkidle')
            pg.evaluate('document.fonts.ready')
            out = wk / (f.name.replace('-print.html', '') + '.pdf')
            pg.pdf(path=str(out), format='A4', print_background=True, prefer_css_page_size=True)
            print('作成：', out.name)
        b.close()

if __name__ == '__main__':
    main()
