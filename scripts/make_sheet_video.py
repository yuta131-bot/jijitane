#!/usr/bin/env python3
"""覚えるシートの紹介動画（YouTube ショート用・1080x1920・音声なし）を作る。

  python3 scripts/make_sheet_video.py --sheet zukei --promo promo --out dist-video

promo/{id}-{ページ}.jpg（make_promo.py の画像）を、1ページ5秒ずつ並べる。
できるもの：sheet-{id}.mp4 / sheet-{id}-title.txt（YouTube のタイトル）/ sheet-{id}.txt（説明文）
"""
import argparse
import json
import re
import subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', required=True)
    ap.add_argument('--promo', default='promo')
    ap.add_argument('--out', default='dist-video')
    ap.add_argument('--sec', type=float, default=5.0)
    args = ap.parse_args()
    cfg = json.loads(Path('site.config.json').read_text(encoding='utf-8'))
    sh = json.loads(Path(f'content/sheets/{args.sheet}.json').read_text(encoding='utf-8'))
    strip = lambda t: re.sub(r'\{([^|}]*)\|[^}]*\}', r'\1', t).replace('**', '').replace('==', '')
    title, sub = strip(sh['title']), strip(sh.get('sub', ''))

    pages = sorted(Path(args.promo).glob(f'{args.sheet}-*.jpg'), key=lambda f: int(f.stem.rsplit('-', 1)[1]))
    if not pages:
        raise SystemExit(f'{args.sheet} の画像がありません')
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    lst = out / f'{args.sheet}.ffconcat'
    lines = []
    for f in pages:
        lines += [f"file '{f.resolve()}'", f'duration {args.sec}']
    lines.append(f"file '{pages[-1].resolve()}'")   # concat は最後の1枚を2回書く決まり
    lst.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    mp4 = out / f'sheet-{args.sheet}.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst),
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-vf', 'scale=1080:1350,pad=1080:1920:0:285:color=0xF0F6FB,fps=30,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', str(mp4),
    ], check=True)
    (out / f'sheet-{args.sheet}-title.txt').write_text(f'【覚えるシート】{title} #中学受験 #shorts', encoding='utf-8')
    desc = (f'{title}\n{sub}\n\n印刷できるPDF（A4）は、LINEで「シート」と送ると届きます。\n{cfg.get("lineUrl", "")}\n'
            f'ページで見る：{cfg["siteUrl"].rstrip("/")}/sheets/{args.sheet}.html\n\n'
            '覚えるシートは全8種類。ほかのシートも、毎日1つずつ紹介しています。\n\n#中学受験 #中受 #家庭学習 #小学生の勉強')
    (out / f'sheet-{args.sheet}.txt').write_text(desc, encoding='utf-8')
    print(f'作成：{mp4}（{len(pages)}ページ）')


if __name__ == '__main__':
    main()
