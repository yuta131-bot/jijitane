#!/usr/bin/env python3
"""覚えるシートを、Instagram 用のスライド画像（1080x1350・JPEG）にする。

  python3 scripts/make_promo.py --dist dist --out promo

サイトの /sheets/{id}.html（スマホ幅）を Chromium で開き、項目（表・カードなど）ごとに大きく撮って、
  1 表紙（A4の1ページ目を小さく載せる）
  2〜 項目ごとのスライド（小さい項目は、1枚にまとめる）
  最後 PDF のダウンロード案内（3枚の表紙と、LINE で「シート」と送る案内、ポスターとして貼るすすめ）
を promo/{id}-{n}.jpg に書き出す。Instagram のカルーセルは10枚までなので、おさまるまで大きさを調整する。
"""
import argparse
import glob
import hashlib
import re
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from playwright.sync_api import sync_playwright

W, H = 1080, 1350
INK = (31, 41, 64)
BG = (240, 246, 251)
GREEN = (6, 199, 85)
GOLD = (255, 214, 79)
MAX_SLIDES = 10
HEAD = 130
BODY_TOP, BODY_BOTTOM = HEAD + 30, H - 115
GAP = 26


def font(size):
    for pat in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', '/usr/share/fonts/**/*CJK*Bold*.ttc', '/usr/share/fonts/**/*CJK*.ttc'):
        for f in glob.glob(pat, recursive=True):
            return ImageFont.truetype(f, size, index=0)
    raise SystemExit('日本語フォント（fonts-noto-cjk）が見つかりません')


def wrap(d, text, f, width):
    lines, cur = [], ''
    for ch in text:
        if d.textlength(cur + ch, font=f) > width and cur and ch not in '。、」）！？':
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    return lines + ([cur] if cur else [])


def base(title, tag=''):
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, HEAD], fill=INK)
    d.text((50, 26), '中受 じじニュースのたね', font=font(40), fill=(255, 255, 255))
    d.text((50, 80), title, font=font(30), fill=(190, 205, 230))
    if tag:
        d.rounded_rectangle([W - 230, 28, W - 40, 100], radius=36, fill=GOLD)
        d.text((W - 135, 64), tag, font=font(38), fill=INK, anchor='mm')
    return im, d


def card(im, x, y, w, h, r=26):
    """白いカード（うすい影つき）"""
    sh = Image.new('RGBA', (w + 60, h + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([30, 36, 30 + w, 36 + h], radius=r, fill=(31, 41, 64, 50))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    im.paste(sh, (x - 30, y - 30), sh)
    ImageDraw.Draw(im).rounded_rectangle([x, y, x + w, y + h], radius=r, fill=(255, 255, 255))


def pdf_page1(pdf, dpi=110):
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(['pdftoppm', '-r', str(dpi), '-f', '1', '-l', '1', '-png', str(pdf), f'{td}/p'], check=True)
        return Image.open(sorted(Path(td).glob('p-*.png'))[0]).convert('RGB')


def grab(page, url, sid):
    """シートのページから、項目ごとの画像・題名・説明文をとる"""
    page.goto(url, wait_until='load')
    page.evaluate("document.documentElement.dataset.theme='light'")
    page.add_style_tag(content='*::-webkit-scrollbar{display:none!important}*{scrollbar-width:none!important}')
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(600)
    title = page.title().split('｜')[0]
    desc = page.evaluate("document.querySelector('meta[name=description]')?.content || ''")
    items = []
    n = len(page.query_selector_all('section.sx-b'))
    over = """el => [...el.querySelectorAll('*')].some(x => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).display !== 'inline')"""
    for i in range(n):
        im = None
        for vw in (380, 440, 520, 620, 760):          # 表がはみ出すときは、ページの幅を広げて撮る（あとで縮めて使う）
            page.set_viewport_size({'width': vw, 'height': 900})
            page.wait_for_timeout(120)
            el = page.query_selector_all('section.sx-b')[i]
            if not el.evaluate(over):
                break
        head = el.query_selector('h4')
        t = (head.inner_text() if head else '').strip()
        if t.startswith('まちがえた問題をメモ'):
            continue
        im = Image.open(BytesIO(el.screenshot())).convert('RGB')
        items.append((t, im))
    page.set_viewport_size({'width': 380, 'height': 900})
    return title, desc, items


def pack(items, width):
    """項目を、1枚に入るだけ上から順につめる"""
    avail = BODY_BOTTOM - BODY_TOP - 40
    slides, cur, used = [], [], 0
    for t, im in items:
        s = min(width / im.width, avail / im.height)
        h = round(im.height * s)
        if cur and used + GAP + h > avail:
            slides.append(cur)
            cur, used = [], 0
        used += (GAP if cur else 0) + h
        cur.append((t, im, s))
    if cur:
        slides.append(cur)
    return slides


WIDTHS = (960, 880, 800, 720, 650, 580)
# 枚数が10枚をこえるときに、先に外す項目（上から順）
DROP = ('白地図', '確認テスト', 'ここがポイント', '地理をおぼえるコ', '今のニュースとつ', 'まちがえやすい')


def fit(items):
    """10枚におさまるように、大きさを小さくし、それでも多ければ重要でない項目を外す"""
    items = list(items)
    while True:
        for width in WIDTHS:
            groups = pack(items, width)
            if len(groups) + 2 <= MAX_SLIDES:
                return groups, width
        for key in DROP:
            hit = [it for it in items if it[0].startswith(key)]
            if hit:
                items.remove(hit[0])
                break
        else:
            items.pop()


def cover(title, desc, thumb, total):
    im, d = base('覚えるシート')
    f = font(70)
    y = 190
    for ln in wrap(d, title, f, W - 160)[:3]:
        d.text((W // 2, y), ln, font=f, fill=INK, anchor='mm')
        y += 100
    sub = desc.split('。')[0] if desc else ''
    fs = font(36)
    for ln in wrap(d, sub, fs, W - 160)[:3]:
        d.text((W // 2, y + 20), ln, font=fs, fill=(70, 90, 130), anchor='mm')
        y += 50
    th = 700
    tw = round(thumb.width * th / thumb.height)
    ty = max(y + 50, 440)
    card(im, (W - tw) // 2, ty, tw, th, r=8)
    im.paste(thumb.resize((tw, th), Image.LANCZOS), ((W - tw) // 2, ty))
    d.rounded_rectangle([140, H - 150, W - 140, H - 60], radius=45, fill=GOLD)
    d.text((W // 2, H - 105), 'スワイプして、項目ごとに大きく見よう', font=font(40), fill=INK, anchor='mm')
    return im


def content(title, blocks, n, total):
    im, d = base(title, f'{n}/{total}')
    # 余白があれば、枚の中でいっぱいまで大きくする（最大1.5倍）
    avail = BODY_BOTTOM - BODY_TOP - 50
    cur_h = sum(b.height * s for _, b, s in blocks) + GAP * (len(blocks) - 1)
    cur_w = max(b.width * s for _, b, s in blocks)
    k = max(1.0, min(1.5, (W - 90) / cur_w, avail / cur_h))
    blocks = [(t, b, s * k) for t, b, s in blocks]
    hs = [round(b.height * s) for _, b, s in blocks]
    tot = sum(hs) + GAP * (len(hs) - 1)
    y = BODY_TOP + (BODY_BOTTOM - BODY_TOP - tot) // 2
    for (t, b, s), h in zip(blocks, hs):
        w = round(b.width * s)
        pad = 22
        card(im, (W - w) // 2 - pad, y - pad, w + 2 * pad, h + 2 * pad)
        im.paste(b.resize((w, h), Image.LANCZOS), ((W - w) // 2, y))
        y += h + GAP + 2 * pad - pad
    d.text((W // 2, H - 48), '保存して、何度も見返そう', font=font(34), fill=(70, 90, 130), anchor='mm')
    return im


def last(sid, thumbs, count, total):
    im, d = base('覚えるシートをプレゼント', f'{total}/{total}')
    d.text((W // 2, 215), 'PDFを無料でダウンロード', font=font(64), fill=INK, anchor='mm')
    d.text((W // 2, 290), f'覚えるシート　全{count}種類・A4で印刷OK', font=font(40), fill=(220, 38, 38), anchor='mm')
    tw, th, gap = 300, 424, 40
    x0 = (W - (3 * tw + 2 * gap)) // 2
    for i, t in enumerate(thumbs[:3]):
        x = x0 + i * (tw + gap)
        card(im, x, 350, tw, th, r=6)
        im.paste(t.resize((tw, th), Image.LANCZOS), (x, 350))
    d.rounded_rectangle([60, 830, W - 60, 1060], radius=44, fill=GREEN)
    d.text((W // 2, 905), 'LINEで「シート」と送ってね', font=font(62), fill=(255, 255, 255), anchor='mm')
    d.text((W // 2, 985), 'PDFがすぐに届きます（プロフィールのリンクから友だち追加）', font=font(32), fill=(220, 250, 232), anchor='mm')
    d.text((W // 2, 1140), '印刷して、ポスターにしよう', font=font(52), fill=INK, anchor='mm')
    d.text((W // 2, 1210), 'トイレ・部屋・食卓に貼って、毎日ながめて覚える', font=font(36), fill=(70, 90, 130), anchor='mm')
    d.text((W // 2, 1275), '毎朝7:30、中学受験の時事ニュース3本', font=font(34), fill=(70, 90, 130), anchor='mm')
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', default='dist')
    ap.add_argument('--out', default='promo')
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    dist = Path(args.dist).resolve()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pdfs = {p.stem[len('sheet-'):]: p for p in sorted((dist / 'gift').glob('sheet-*.pdf'))}
    ids = list(pdfs)
    thumbs = {i: pdf_page1(p) for i, p in pdfs.items()}
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={'width': 380, 'height': 900}, device_scale_factor=3.2, color_scheme='light')
        for sid in ids:
            if args.only and sid != args.only:
                continue
            title, desc, items = grab(page, (dist / 'sheets' / f'{sid}.html').as_uri(), sid)
            for old in out.glob(f'{sid}-*.jpg'):
                old.unlink()
            groups, width = fit(items)
            total = len(groups) + 2
            # 案内の3枚：このシート＋ほかの2つ（シートごとに決まった組み合わせ）
            others = [i for i in ids if i != sid]
            h = int(hashlib.md5(sid.encode()).hexdigest(), 16)
            pick = [others[h % len(others)], others[(h // 7) % len(others)]]
            if pick[0] == pick[1]:
                pick[1] = others[(others.index(pick[0]) + 1) % len(others)]
            tl = [thumbs[sid], thumbs[pick[0]], thumbs[pick[1]]]
            slides = [cover(title, desc, thumbs[sid], total)]
            slides += [content(title, g, i + 2, total) for i, g in enumerate(groups)]
            slides.append(last(sid, tl, len(ids), total))
            for i, im in enumerate(slides, 1):
                im.save(out / f'{sid}-{i}.jpg', quality=90)
            print(f'{sid}: {len(slides)}枚（幅{width}）')
        b.close()


if __name__ == '__main__':
    main()
