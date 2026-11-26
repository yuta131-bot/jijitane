#!/usr/bin/env python3
"""覚えるシートの「全体紹介」動画（Instagram のストーリーズ／リール用・1080x1920・声なし＋音楽）と、ハイライトの表紙を作る。

  python3 scripts/make_sheet_intro.py --pdfdir DIR --out OUT_DIR

DIR には sheet-<id>.pdf（または <id>.pdf）を置く。流れは
  フック → 教科タグつきでシートを1枚ずつ → 全種類の一覧 → 印刷 → ラミネート → 最後（リンクへ）
できるもの：sheet-intro.mp4 / sheet-intro-cover.png（ハイライト表紙）/ sheet-intro-contact.png（確認用）
上の約250px・下の約400pxは、ストーリーズの表示（名前・リンクのスタンプ）がかぶるので、大事なものを置かない。
"""
import argparse
import glob
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
import make_sheet_video as msv  # noqa: E402

W, H, FPS = 1080, 1920, 30
INK = (29, 43, 68)
GREEN = (30, 154, 114)
ORANGE = (240, 138, 62)
YELLOW = (255, 214, 90)

FEATURED = [
    ('todofuken', '社会 × 地理', '都道府県と県庁所在地'),
    ('nenpyo', '社会 × 歴史', '日本の歴史 年表'),
    ('zukei', '算数 × 図形', '図形の公式'),
    ('kotowaza', '国語 × ことば', 'ことわざ・慣用句'),
]


def font(size):
    for f in glob.glob('/usr/share/fonts/**/NotoSansCJK-Black.ttc', recursive=True):
        return ImageFont.truetype(f, size, index=0)
    raise SystemExit('日本語フォント（fonts-noto-cjk）が見つかりません')


def ease(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def text_c(d, y, s, f, fill, cx=W // 2):
    d.text((cx - d.textlength(s, font=f) / 2, y), s, font=f, fill=fill)


def bg(top, bottom, dot=(255, 255, 255, 40)):
    im = Image.new('RGB', (W, H), top)
    px = ImageDraw.Draw(im)
    for y in range(H):
        k = y / H
        px.line([(0, y), (W, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * k) for i in range(3)))
    im = im.convert('RGBA')
    d = ImageDraw.Draw(im, 'RGBA')
    for yy in range(40, H, 90):
        for xx in range(40 + (yy // 90 % 2) * 45, W, 90):
            d.ellipse([xx - 4, yy - 4, xx + 4, yy + 4], fill=dot)
    return im


def draw_logo(d, x, y, s):
    k = s / 40
    d.rounded_rectangle([x + 2 * k, y + 2 * k, x + 38 * k, y + 38 * k], radius=11 * k, fill=INK)
    lg = (159, 225, 203)
    d.line([x + 20 * k, y + 30 * k, x + 20 * k, y + 19 * k], fill=lg, width=max(2, round(3 * k)))
    d.ellipse([x + 10 * k, y + 14 * k, x + 20 * k, y + 20 * k], fill=lg)
    d.ellipse([x + 20 * k, y + 12 * k, x + 30 * k, y + 18 * k], fill=lg)
    d.ellipse([x + 17 * k, y + 28 * k, x + 23 * k, y + 34 * k], fill=YELLOW)


def tight(im):
    bb = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - 20), max(0, y0 - 20), min(im.width, x1 + 20), min(im.height, y1 + 20)))


def card(img, radius=22, width=None):
    """シートの画像に、角丸と影をつける（width を決めると、その幅に縮める）。"""
    im = tight(img).convert('RGB')
    if width:
        im = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
    out = Image.new('RGBA', (im.width + 80, im.height + 80), (0, 0, 0, 0))
    sh = Image.new('RGBA', out.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([40, 52, 40 + im.width, 52 + im.height], radius=radius, fill=(20, 30, 50, 110))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    out.paste(im, (40, 40), m)
    return out


def put(fr, im, cx, cy, scale=1.0, alpha=1.0):
    if scale != 1.0:
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.BILINEAR)
    if alpha < 1.0:
        im = im.copy()
        im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
    fr.alpha_composite(im, (round(cx - im.width / 2), round(cy - im.height / 2)))


def pill(fr, y, label, fill, size=44):
    d = ImageDraw.Draw(fr)
    f = font(size)
    w = d.textlength(label, font=f)
    d.rounded_rectangle([W / 2 - w / 2 - 40, y, W / 2 + w / 2 + 40, y + size + 40], radius=(size + 40) / 2, fill=fill)
    d.text((W / 2 - w / 2, y + 14), label, font=f, fill=(255, 255, 255))


def load_pages(pdfdir, ids):
    out, tmp = {}, Path(tempfile.mkdtemp())
    for i in ids:
        pdf = next((p for p in (Path(pdfdir) / f'sheet-{i}.pdf', Path(pdfdir) / f'{i}.pdf') if p.exists()), None)
        if not pdf:
            print('警告：PDFがありません', i)
            continue
        subprocess.run(['pdftoppm', '-r', '150', '-png', '-f', '1', '-l', '1', str(pdf), str(tmp / i)], check=True)
        out[i] = Image.open(sorted(tmp.glob(f'{i}-*.png'))[0]).convert('RGB')
    return out


def build(pages, ids, out):
    first = pages[ids[0]]
    cards = {i: card(pages[i], 22, 860) for i in ids}
    n_all = len(ids)

    def hook(t, dur):
        fr = bg((255, 177, 100), (244, 120, 70))
        for k, i in enumerate(ids[:6]):
            c = card(pages[i], 14, 300)
            x = 110 + (k % 2) * 860
            y = (k * 330 + t * 120) % 1980 - 60
            put(fr, c, x, y, 1.0, 0.85)
        d = ImageDraw.Draw(fr)
        d.rounded_rectangle([60, 520, W - 60, 1190], radius=48, fill=(255, 255, 255))
        k = ease(t / 0.5)
        text_c(d, 570 + (1 - k) * 50, '中学受験の', font(64), INK)
        text_c(d, 660 + (1 - k) * 50, 'おぼえるシート', font(126), ORANGE)
        d.rounded_rectangle([160, 850, W - 160, 862], radius=6, fill=YELLOW)
        text_c(d, 890, f'{n_all}種類', font(150), INK)
        text_c(d, 1080, '印刷して使える・ぜんぶ無料', font(48), (90, 100, 120))
        return fr

    def sheet_scene(i, tag, title):
        def f(t, dur):
            fr = bg((244, 249, 253), (222, 236, 247), (255, 255, 255, 120))
            d = ImageDraw.Draw(fr)
            k = ease(t / 0.35)
            pill(fr, 270 - round((1 - k) * 40), tag, GREEN)
            text_c(d, 385 - round((1 - k) * 40), title, font(76 if len(title) < 12 else 62), INK)
            kk = ease(t / 0.5)
            c = cards[i]
            sc = min(1.0, 1010 / (c.height - 80))
            put(fr, c, W / 2, 1010 + (1 - kk) * 120, sc * (0.92 + 0.08 * kk) * (1 + 0.03 * t / dur), kk)
            return fr
        return f

    def grid(t, dur):
        fr = bg((255, 248, 236), (255, 232, 200), (255, 255, 255, 120))
        d = ImageDraw.Draw(fr)
        pill(fr, 270, f'全{n_all}種類', ORANGE, 60)
        cols, tw, th = 6, 168, 218
        gx, gy = (W - cols * tw) // 2, 460
        for n, i in enumerate(ids):
            r, c = divmod(n, cols)
            k = ease((t - n * 0.05) / 0.3)
            put(fr, card(pages[i], 8, tw - 26), gx + c * tw + tw / 2, gy + r * (th - 6) + th / 2 + (1 - k) * 40, 1.0, k)
        text_c(d, 1420, '社会・算数・理科・国語', font(54), INK)
        return fr

    def printing(t, dur):
        fr = bg((244, 249, 253), (222, 236, 247), (255, 255, 255, 120))
        d = ImageDraw.Draw(fr)
        text_c(d, 290, '家のプリンターで', font(84), INK)
        d.rounded_rectangle([210, 410, W - 210, 520], radius=22, fill=YELLOW)
        text_c(d, 422, '印刷して', font(84), INK)
        k = ease(t / 1.4)
        sh = card(first, 10, 420)
        top = 1060 - round(k * (sh.height - 120))
        fr.alpha_composite(sh, (W // 2 - sh.width // 2, top))
        d = ImageDraw.Draw(fr)
        d.rounded_rectangle([190, 1000, 890, 1230], radius=40, fill=(205, 214, 226), outline=INK, width=6)
        d.rounded_rectangle([240, 1040, 840, 1075], radius=12, fill=INK)
        d.ellipse([790, 1130, 830, 1170], fill=GREEN)
        return fr

    def lami(t, dur):
        fr = bg((255, 248, 236), (255, 232, 200), (255, 255, 255, 120))
        d = ImageDraw.Draw(fr)
        text_c(d, 290, 'ラミネートすれば', font(84), ORANGE)
        text_c(d, 400, 'お風呂でも使える', font(84), INK)
        k = ease(t / 0.5)
        c = card(first, 10, 560)
        put(fr, c, W / 2, 960 + (1 - k) * 60, 1.0, k)
        d2 = ImageDraw.Draw(fr, 'RGBA')
        x = -200 + (t / dur) * 1500
        d2.polygon([(x, 700), (x + 70, 700), (x - 130, 1200), (x - 200, 1200)], fill=(255, 255, 255, 110))
        for n in range(6):
            yy = 1330 + 40 * ((t * 2 + n * 0.4) % 1)
            d2.ellipse([240 + n * 110, yy, 270 + n * 110, yy + 40], fill=(120, 190, 240, 170))
        return fr

    def ending(t, dur):
        fr = bg((29, 43, 68), (18, 28, 48), (255, 255, 255, 14))
        d = ImageDraw.Draw(fr)
        draw_logo(d, W // 2 - 90, 330, 180)
        text_c(d, 560, '中受 じじニュースのたね', font(54), (190, 205, 230))
        text_c(d, 650, 'おぼえるシート', font(110), (255, 255, 255))
        text_c(d, 790, f'{n_all}種類 ぜんぶ無料', font(72), YELLOW)
        d.rounded_rectangle([170, 960, W - 170, 1100], radius=70, fill=GREEN)
        text_c(d, 985, 'jijitane.com', font(76), (255, 255, 255))
        text_c(d, 1150, 'プロフィールのリンクから', font(50), (190, 205, 230))
        return fr

    scenes = [(hook, 3.0)]
    scenes += [(sheet_scene(i, tag, title), 3.2) for i, tag, title in FEATURED if i in pages]
    scenes += [(grid, 4.0), (printing, 3.2), (lami, 3.0), (ending, 3.6)]
    total = sum(d for _, d in scenes)

    wav = out / 'intro.wav'
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(msv.RATE)
        w.writeframes(msv.bgm_pcm(total + 0.5))

    mp4 = out / 'sheet-intro.mp4'
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-i', str(wav), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
                          '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', str(mp4)], stdin=subprocess.PIPE)
    stills = []
    for fn, dur in scenes:
        n = round(dur * FPS)
        for k in range(n):
            fr = fn(k / FPS, dur).convert('RGB')
            if k == int(n * 0.8):
                stills.append(fr.resize((360, 640)))
            p.stdin.write(fr.tobytes())
    p.stdin.close()
    p.wait()
    wav.unlink()
    sheet = Image.new('RGB', (360 * len(stills), 640), 'white')
    for n, s in enumerate(stills):
        sheet.paste(s, (n * 360, 0))
    sheet.save(out / 'sheet-intro-contact.png')
    return mp4


def cover(out):
    """ハイライトの表紙（丸く切り抜かれるので、真ん中の円の中に収める）。"""
    im = Image.new('RGB', (W, H), GREEN)
    d = ImageDraw.Draw(im)
    cx, cy = W // 2, H // 2
    d.ellipse([cx - 380, cy - 380, cx + 380, cy + 380], fill=(255, 255, 255))
    d.rounded_rectangle([cx - 170, cy - 270, cx + 170, cy + 110], radius=22, fill=(255, 248, 236), outline=INK, width=8)
    for r in range(5):
        y0 = cy - 225 + r * 62
        a, b = ((YELLOW, ORANGE) if r % 2 == 0 else ((200, 225, 245), (200, 225, 245)))
        d.rounded_rectangle([cx - 130, y0, cx - 40, y0 + 34], radius=8, fill=a)
        d.rounded_rectangle([cx - 20, y0, cx + 130, y0 + 34], radius=8, fill=b)
    text_c(d, cy + 140, 'シート', font(120), INK)
    im.save(out / 'sheet-intro-cover.png')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdfdir', required=True)
    ap.add_argument('--out', default='dist-video')
    ap.add_argument('--sheets', default='content/sheets')
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    ids = [Path(f).stem for f in sorted(glob.glob(f'{a.sheets}/*.json'))]
    feat = [i for i, _, _ in FEATURED]
    order = feat + [i for i in ids if i not in feat]
    pages = load_pages(a.pdfdir, order)
    cover(out)
    print(build(pages, [i for i in order if i in pages], out))


if __name__ == '__main__':
    main()
