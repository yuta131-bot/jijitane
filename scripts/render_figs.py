#!/usr/bin/env python3
"""見直し用に、その日の図（svg）をサイトと同じ見た目の画像にする。

  python3 scripts/render_figs.py --date 2026-10-30   → .review/figs/2026-10-30-1.png など（スマホの幅に近い 720px）
"""
import argparse, json, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
VARS = ('--paper:#F5FAFE;--grid:#DDEAF4;--card:#FFFFFF;--ink:#1D2B44;--muted:#56677F;--line:#C9D8E6;--sci:#1E9A72;--soc:#DB7420;'
        '--sky:#2E78C9;--sea:#BFE0F5;--land:#F1E3C6;--landline:#C9AE7C;--soft:#EEF5FB;--marker:#FFE36E;--mark-bg:#FFE36E;--mark-ink:inherit')

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--date', required=True); args = ap.parse_args()
    a = json.loads((ROOT / 'content' / f'{args.date}.json').read_text(encoding='utf-8'))
    svgs = json.loads(subprocess.run(
        ['node', '-e', "import('./src/markup.mjs').then(m=>{const a=JSON.parse(require('fs').readFileSync(0,'utf8'));"
         "process.stdout.write(JSON.stringify(a.map((s,i)=>m.safeSvg(s,'r'+i))))})"],
        input=json.dumps([n.get('svg', '') for n in a['news']]), capture_output=True, text=True, cwd=ROOT, check=True).stdout)
    out = ROOT / '.review' / 'figs'; out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 720, 'height': 800})
        for i, svg in enumerate(svgs):
            html = (f'<!doctype html><html><head><meta charset="utf-8"><style>:root{{{VARS}}}body{{margin:0;background:#fff;'
                    f'font-family:"Noto Sans CJK JP",sans-serif}}svg{{display:block;width:720px;height:auto}}</style></head><body>{svg}</body></html>')
            pg.set_content(html)
            el = pg.query_selector('svg')
            path = out / f'{args.date}-{i + 1}.png'
            (el or pg).screenshot(path=str(path))
            print('作成：', path.relative_to(ROOT))
        b.close()

if __name__ == '__main__':
    main()
