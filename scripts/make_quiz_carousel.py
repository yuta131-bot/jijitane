#!/usr/bin/env python3
"""「今週の時事 6問チャレンジ」のInstagram用カルーセル画像（1080x1350・JPEG）を作る。

  python3 scripts/make_quiz_carousel.py --end 2026-11-07 --out quiz-promo

end の日までの7日間の記事（content/日付.json）にある3択クイズから、6問を選ぶ。
  ・1つの記事から1問まで／できるだけ ちがう科目・ちがう日から／記事を読まないと解けない問題は除く
できるもの：quiz-promo/quiz-{end}-{1..9}.jpg と quiz-promo/quiz-{end}.json（問題・答え・投稿文）
  1 表紙 / 2〜7 問題 / 8 答え合わせ / 9 LINEの案内
"""
import argparse
import datetime as dt
import glob
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
INK = (31, 41, 64)
BG = (240, 246, 251)
GREEN = (6, 199, 85)
GOLD = (255, 214, 79)
COLORS = [((219, 234, 254), (37, 99, 235)), ((254, 226, 226), (220, 38, 38)), ((220, 252, 231), (22, 163, 74))]   # A:青 B:赤 C:緑
LET = 'ABC'


def strip(t):
    return re.sub(r'\{([^{}|]+)\|[^{}|]+\}', r'\1', t).replace('**', '').replace('==', '')


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
    d.rectangle([0, 0, W, 130], fill=INK)
    d.text((50, 30), '中受 じじニュースのたね', font=font(40), fill=(255, 255, 255))
    d.text((50, 84), title, font=font(30), fill=(190, 205, 230))
    if tag:
        d.rounded_rectangle([W - 250, 28, W - 40, 100], radius=36, fill=GOLD)
        d.text((W - 145, 64), tag, font=font(38), fill=INK, anchor='mm')
    return im, d


def pick(end, n=6):
    items = []   # 新しい日から順に（日付, 科目, 問題）
    for k in range(7):
        day = (end - dt.timedelta(days=k)).isoformat()
        p = Path('content') / f'{day}.json'
        if not p.exists():
            continue
        for ni, news in enumerate(json.loads(p.read_text(encoding='utf-8'))['news']):
            q = news['quiz']
            text = strip(q['q'])
            if len(q['choices']) != 3 or re.search(r'この(記事|ニュース)|きょう|今日', text):
                continue
            items.append(dict(day=day, subj=news.get('subject_key', ''), q=text, ch=[strip(c) for c in q['choices']], ans=q['answer'], a=strip(q.get('a', '')), title=strip(news.get('short_title') or news['title'])))
    chosen, used_subj, used_day = [], collections_counter(), collections_counter()
    # まず、科目も日もまだ使っていないものを。足りなければ、ゆるめて足す
    for rule in (lambda it: used_subj[it['subj']] < 3 and used_day[it['day']] < 1, lambda it: used_day[it['day']] < 2, lambda it: True):
        for it in items:
            if len(chosen) >= n:
                break
            if it in chosen or not rule(it):
                continue
            chosen.append(it); used_subj[it['subj']] += 1; used_day[it['day']] += 1
    return chosen[:n]


def collections_counter():
    import collections
    return collections.defaultdict(int)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--end', required=True, help='最後の日（この日までの7日間から選ぶ）例：2026-11-07')
    ap.add_argument('--out', default='quiz-promo')
    args = ap.parse_args()
    end = dt.date.fromisoformat(args.end)
    qs = pick(end)
    if len(qs) < 6:
        raise SystemExit(f'問題が足りません（{len(qs)}問）')
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(Path('site.config.json').read_text(encoding='utf-8'))
    # 答えの位置が、A・B・Cにかたよらないよう、そのまま使う（問題ごとにちがう）
    start = end - dt.timedelta(days=6)
    span = f'{start.month}/{start.day}〜{end.month}/{end.day}'
    imgs = []

    # 1 表紙
    im, d = base(f'今週の時事チャレンジ｜{span}')
    d.text((W // 2, 330), '今週のニュースから', font=font(58), fill=INK, anchor='mm')
    d.text((W // 2, 470), '時事クイズ', font=font(150), fill=(220, 38, 38), anchor='mm')
    d.text((W // 2, 640), '6問チャレンジ！', font=font(110), fill=INK, anchor='mm')
    d.rounded_rectangle([140, 780, W - 140, 930], radius=70, fill=INK)
    d.text((W // 2, 855), '6問中、何問わかる？', font=font(66), fill=(255, 255, 255), anchor='mm')
    d.text((W // 2, 1040), '3択クイズ・答えは8ページ目', font=font(50), fill=INK, anchor='mm')
    d.text((W // 2, 1120), 'まずは親子で考えてみてね', font=font(44), fill=(70, 90, 130), anchor='mm')
    d.text((W // 2, 1255), 'スワイプして、はじめよう  →', font=font(46), fill=(37, 99, 235), anchor='mm')
    imgs.append(im)

    # 2〜7 問題
    for i, it in enumerate(qs, 1):
        im, d = base(f'今週の時事チャレンジ｜{span}', f'Q{i}/6')
        f = font(60)
        lines = wrap(d, it['q'], f, W - 160)
        y = 190
        for ln in lines[:6]:
            d.text((80, y), ln, font=f, fill=INK)
            y += 86
        top = y + 90
        fc = font(50)
        for k, c in enumerate(it['ch']):
            bgc, fg = COLORS[k]
            cl = wrap(d, c, fc, W - 300)[:3]
            hgt = 60 + 62 * len(cl)
            d.rounded_rectangle([60, top, W - 60, top + hgt], radius=34, fill=bgc, outline=fg, width=4)
            d.ellipse([88, top + hgt // 2 - 40, 168, top + hgt // 2 + 40], fill=fg)
            d.text((128, top + hgt // 2), LET[k], font=font(52), fill=(255, 255, 255), anchor='mm')
            for j, ln in enumerate(cl):
                d.text((200, top + 30 + 62 * j), ln, font=fc, fill=INK)
            top += hgt + 28
        d.text((W // 2, H - 50), '答えは8ページ目  →', font=font(38), fill=(70, 90, 130), anchor='mm')
        imgs.append(im)

    # 8 答え合わせ
    im, d = base(f'今週の時事チャレンジ｜{span}', '答え')
    d.text((W // 2, 205), '答え合わせ', font=font(70), fill=INK, anchor='mm')
    f, fs = font(38), font(54)
    y = 280
    for i, it in enumerate(qs, 1):
        txt = it['ch'][it['ans']]
        lines = wrap(d, txt, f, W - 330)[:2]
        hgt = max(120, 40 + 48 * len(lines))
        bgc, fg = COLORS[it['ans']]
        d.rounded_rectangle([50, y, W - 50, y + hgt], radius=28, fill=(255, 255, 255), outline=fg, width=4)
        d.text((100, y + hgt // 2), f'Q{i}', font=fs, fill=INK, anchor='mm')
        d.ellipse([160, y + hgt // 2 - 36, 232, y + hgt // 2 + 36], fill=fg)
        d.text((196, y + hgt // 2), LET[it['ans']], font=font(46), fill=(255, 255, 255), anchor='mm')
        for j, ln in enumerate(lines):
            d.text((260, y + (hgt - 48 * len(lines)) // 2 + 48 * j), ln, font=f, fill=INK)
        y += hgt + 14
    d.text((W // 2, H - 60), 'くわしい解説・図解は、毎日のニュースで', font=font(38), fill=(70, 90, 130), anchor='mm')
    imgs.append(im)

    # 9 LINE の案内
    im, d = base('覚えるシートをプレゼント')
    d.text((W // 2, 280), '時事も、算数も、社会も', font=font(58), fill=INK, anchor='mm')
    d.text((W // 2, 400), '覚えるシート', font=font(130), fill=(220, 38, 38), anchor='mm')
    d.text((W // 2, 520), '全15種類・印刷OK（PDF）', font=font(56), fill=INK, anchor='mm')
    d.text((W // 2, 650), '憲法・三権／国連／環境／単位・割合', font=font(38), fill=(70, 90, 130), anchor='mm')
    d.text((W // 2, 710), '図形／年表／都道府県／部首', font=font(38), fill=(70, 90, 130), anchor='mm')
    d.rounded_rectangle([60, 830, W - 60, 1150], radius=44, fill=GREEN)
    d.text((W // 2, 920), 'LINEで「シート」と送ってね', font=font(66), fill=(255, 255, 255), anchor='mm')
    d.text((W // 2, 1020), 'PDFがすぐに届きます', font=font(48), fill=(255, 255, 255), anchor='mm')
    d.text((W // 2, 1090), 'プロフィールのリンクから友だち追加', font=font(38), fill=(220, 250, 232), anchor='mm')
    d.text((W // 2, 1250), '毎朝7:30、中学受験の時事ニュース3本', font=font(42), fill=INK, anchor='mm')
    imgs.append(im)

    for i, im in enumerate(imgs, 1):
        im.save(out / f'quiz-{args.end}-{i}.jpg', quality=90)
    letters = ' '.join(f'Q{i}={LET[it["ans"]]}' for i, it in enumerate(qs, 1))
    caption = (f'【今週の時事チャレンジ】{span}のニュースから、3択クイズ6問！\n6問中、何問わかるかな？ 答えは8ページ目にあります。\n\n'
               + '\n'.join(f'Q{i} {it["q"]}' for i, it in enumerate(qs, 1))
               + f'\n\n親子で考えて、コメントで答えを教えてね。\n覚えるシート（全8種・印刷OKのPDF）は、LINEで「シート」と送ると届きます。LINEの友だち追加は、プロフィールのリンクからできます。\n'
               + '\n#中学受験 #中受 #時事問題 #時事クイズ #小学生の勉強 #家庭学習 #親子で学ぶ')
    (out / f'quiz-{args.end}.json').write_text(json.dumps(dict(end=args.end, span=span, caption=caption, answers=letters, count=len(imgs),
                                                                 questions=[dict(day=q['day'], q=q['q'], ch=q['ch'], ans=q['ans']) for q in qs]), ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'作成：{len(imgs)}枚（{span}）答え：{letters}')


if __name__ == '__main__':
    main()
