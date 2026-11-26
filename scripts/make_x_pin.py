#!/usr/bin/env python3
"""X の固定ポスト用の画像（1600x900）。覚えるシートの種類数は content/sheets の数から自動で入れる。
  python3 scripts/make_x_pin.py --pdfdir DIR --out OUT.png
"""
import argparse, glob, sys, tempfile, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).parent))
import make_sheet_intro as mi  # noqa: E402

W, H = 1600, 900


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdfdir', required=True)
    ap.add_argument('--out', default='x-pin.png')
    a = ap.parse_args()
    ids = [Path(f).stem for f in sorted(glob.glob('content/sheets/*.json'))]
    feat = [i for i, _, _ in mi.FEATURED]
    order = feat + [i for i in ids if i not in feat]
    pages = mi.load_pages(a.pdfdir, order)
    n = len(ids)
    im = Image.new('RGBA', (W, H), (255, 248, 236))
    d = ImageDraw.Draw(im)
    for y in range(H):
        k = y / H
        d.line([(0, y), (W, y)], fill=(255, round(248 - 22 * k), round(236 - 50 * k)))
    d = ImageDraw.Draw(im, 'RGBA')
    for yy in range(30, H, 70):
        for xx in range(30 + (yy // 70 % 2) * 35, W, 70):
            d.ellipse([xx - 3, yy - 3, xx + 3, yy + 3], fill=(255, 255, 255, 120))
    # 右：シートの表紙を重ねて並べる
    xs = [(1040, 470, -6), (1230, 420, 3), (1420, 470, 8), (1140, 560, 0)]
    for (cx, cy, ang), i in zip(xs, [feat[0], feat[1], feat[2], feat[3]]):
        c = mi.card(pages[i], 14, 330)
        if ang:
            c = c.rotate(ang, resample=Image.BICUBIC, expand=True)
        mi.put(im, c, cx, cy)
    d = ImageDraw.Draw(im)
    mi.draw_logo(d, 70, 60, 70)
    d.text((155, 78), '中受 じじニュースのたね', font=mi.font(36), fill=mi.INK)
    d.text((70, 200), '中学受験の', font=mi.font(60), fill=mi.INK)
    d.text((70, 295), 'おぼえるシート', font=mi.font(100), fill=mi.ORANGE)
    d.rounded_rectangle([70, 440, 640, 452], radius=6, fill=mi.YELLOW)
    d.text((70, 480), f'{n}種類', font=mi.font(130), fill=mi.INK)
    d.text((70, 650), '印刷OK・ぜんぶ無料・登録なし', font=mi.font(46), fill=(90, 100, 120))
    d.rounded_rectangle([70, 740, 640, 830], radius=45, fill=mi.GREEN)
    d.text((355, 785), 'jijitane.com/sheets', font=mi.font(46), fill=(255, 255, 255), anchor='mm')
    im.convert('RGB').save(a.out, quality=92)
    print(a.out, n)


if __name__ == '__main__':
    main()
