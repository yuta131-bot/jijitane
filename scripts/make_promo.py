#!/usr/bin/env python3
"""覚えるシートのPDFを、SNS用の画像（4:5・JPEG）にする。

  python3 scripts/make_promo.py --dist dist --out promo

dist/gift/sheet-{id}.pdf の各ページを、1080x1350 の画像にして promo/{id}-{ページ}.jpg に書き出す。
Instagram の写真は JPEG・縦横比 4:5〜1.91:1 が条件なので、A4 のページを 4:5 の台紙の中央に置く。
"""
import argparse
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

W, H = 1080, 1350
BG = (240, 246, 251)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', default='dist')
    ap.add_argument('--out', default='promo')
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for pdf in sorted(Path(args.dist, 'gift').glob('sheet-*.pdf')):
        sid = pdf.stem[len('sheet-'):]
        with tempfile.TemporaryDirectory() as td:
            subprocess.run(['pdftoppm', '-r', '170', '-png', str(pdf), f'{td}/p'], check=True)
            pages = sorted(Path(td).glob('p-*.png'))
            for i, f in enumerate(pages, 1):
                im = Image.open(f).convert('RGB')
                ph = H - 50                       # 上下に少し余白
                pw = round(im.width * ph / im.height)
                im = im.resize((pw, ph), Image.LANCZOS)
                canvas = Image.new('RGB', (W, H), BG)
                canvas.paste(im, ((W - pw) // 2, (H - ph) // 2))
                canvas.save(out / f'{sid}-{i}.jpg', quality=90)
            print(f'{sid}: {len(pages)} ページ')


if __name__ == '__main__':
    main()
