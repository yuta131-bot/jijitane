#!/usr/bin/env python3
"""覚えるシートの紹介動画（YouTube ショート用・1080x1920）を作る。

  python3 scripts/make_sheet_video.py --sheet zukei --dist dist --out dist-video [--voicevox http://localhost:50021]

- 画面：シートのPDFから、いま話している所（表やカードのブロック）だけを切り取って、ゆっくりズームインしながら見せる。
        下に、話している言葉を字幕で出す。最後に、シートの画像を並べて「LINEで『シート』と送ってね」を出す
- 声：VOICEVOX（毎朝のショートと同じ冥鳴ひまり）。content/sheets/{id}.json の pages[].voice（1文ごとに、どのブロックを見せるか f で指定）
- 音楽：この場で作る、オリジナルの明るい曲（著作権の心配なし）。声の下で小さく流す
できるもの：sheet-{id}.mp4 / sheet-{id}-title.txt / sheet-{id}.txt
"""
import argparse
import json
import math
import re
import struct
import subprocess
import sys
import tempfile
import glob
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import voicevox as vv  # noqa: E402
import make_promo as mp  # noqa: E402  （サイトのスマホ表示から、項目ごとの大きな画像を撮る）
from playwright.sync_api import sync_playwright  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

RATE = vv.RATE
OUTRO = 'プリントできるPDFは、LINEで、シート、と送ってね。'


def bgm_pcm(seconds):
    """やさしいマリンバ風の曲（C → Am → F → G のくり返し）を、seconds 秒ぶん作る。"""
    beat = 0.5                                   # 120 BPM
    chords = [  # 各小節のコード：(ベース, アルペジオの音)
        (130.81, [261.63, 329.63, 392.00, 523.25]),   # C
        (110.00, [220.00, 261.63, 329.63, 440.00]),   # Am
        (87.31, [174.61, 261.63, 349.23, 440.00]),    # F
        (98.00, [196.00, 246.94, 293.66, 392.00]),    # G
    ]
    melody = [659.25, 0, 783.99, 659.25, 587.33, 0, 523.25, 0, 523.25, 587.33, 659.25, 0, 587.33, 0, 0, 0]   # 4小節ぶん×2で16音
    n = int(RATE * seconds)
    buf = [0.0] * n

    def note(start, freq, length, vol, harm=0.35):
        s0 = int(start * RATE)
        m = int(length * RATE)
        for i in range(m):
            j = s0 + i
            if j >= n:
                break
            t = i / RATE
            env = math.exp(-t * 5.0) * min(1.0, i / (RATE * 0.004))
            buf[j] += vol * env * (math.sin(2 * math.pi * freq * t) + harm * math.sin(4 * math.pi * freq * t))

    bars = int(seconds / (beat * 4)) + 1
    for bar in range(bars):
        bass, arp = chords[bar % 4]
        t0 = bar * beat * 4
        note(t0, bass, 1.6, 0.30)
        for k in range(8):                       # 8分音符のアルペジオ
            note(t0 + k * beat / 2, arp[[0, 1, 2, 3, 2, 1, 2, 3][k]], 0.5, 0.12)
        for k in range(4):                       # メロディ（4拍ぶん）
            f = melody[(bar % 4) * 4 + k]
            if f:
                note(t0 + k * beat, f, 0.7, 0.16)
    # 終わりに向かってフェードアウト
    out = bytearray()
    fade = int(RATE * 1.5)
    peak = max(1e-9, max(abs(x) for x in buf))
    for i, x in enumerate(buf):
        g = min(1.0, (n - i) / fade)
        out += struct.pack('<h', int(32767 * 0.9 * g * x / peak))
    return bytes(out)



W, H = 1080, 1920
FPS = 30
BG = (240, 246, 251)
INK = (31, 41, 64)
GREEN = (6, 199, 85)
# Instagram のリールは、下のおよそ3割（投稿者名・説明文）と右のボタンが画面の上にかぶさる。
# そのため、字幕は見出しのすぐ下、画像は左寄せの幅900・下端1480まで（下のかぶさりは薄いので、大きさとの兼ね合いで）
IMG_TOP, IMG_BOT = 470, 1480
CX, CW = 30, 900                   # 画像を出す左端と幅（右端の ♡💬 ボタンにかからない）
PAD = 0.012                        # ブロックのまわりの余白（ページの幅に対する割合）


def font(size):
    for pat in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', '/usr/share/fonts/**/*CJK*Bold*.ttc', '/usr/share/fonts/**/*CJK*.ttc'):
        for f in glob.glob(pat, recursive=True):
            return ImageFont.truetype(f, size, index=0)
    raise SystemExit('日本語フォント（fonts-noto-cjk）が見つかりません')


def wrap(draw, text, fnt, width):
    lines, cur = [], ''
    for ch in text:
        if draw.textlength(cur + ch, font=fnt) > width and cur and ch not in '。、」）！？':   # 句読点が行の先頭に来ないようにする
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    return lines + ([cur] if cur else [])


def short_label(t):
    t = re.sub(r'[（(][^）)]*[）)]', '', t)
    return t.strip()[:18]


def scene_bg(brand, label, caption, card=None):
    """見出しと字幕つきの背景（毎フレームの土台）。card=(x,y,w,h) に白いカードを敷く。"""
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 215], fill=INK)
    d.text((54, 34), brand, font=font(34), fill=(190, 205, 230))
    d.text((54, 92), label, font=font(78 if len(label) <= 12 else 60), fill=(255, 255, 255))
    if card:
        x, y, w, h = card
        d.rounded_rectangle([x - 14, y - 14, x + w + 14, y + h + 14], radius=26, fill=(255, 255, 255), outline=(205, 218, 235), width=3)
    if caption:
        f = font(46)
        lines = wrap(d, caption, f, W - 150)[:3]
        bh = 30 + 62 * len(lines)
        top = 232
        d.rounded_rectangle([30, top, W - 30, top + bh], radius=30, fill=(255, 255, 255), outline=INK, width=4)
        for i, ln in enumerate(lines):
            d.text((65, top + 16 + 62 * i), ln, font=f, fill=INK)
    return im


class Scene:
    def __init__(self, bg, src, box, dur, zoom=0):
        self.bg, self.src, self.box, self.dur, self.zoom = bg, src, box, dur, zoom   # box = src 上の切り取り範囲 (x0,y0,x1,y1)
        x0, y0, x1, y1 = box
        cw, ch = x1 - x0, y1 - y0
        self.disp = None   # 表示サイズ（呼び出し側で決めてある）

    def frames(self, disp):
        n = max(1, round(self.dur * FPS))
        tw, th = disp
        x0, y0, x1, y1 = self.box
        ox, oy = CX + (CW - tw) // 2, IMG_TOP + (IMG_BOT - IMG_TOP - th) // 2
        if (tw, th) == (W, H):
            ox, oy = 0, 0      # 全画面の場面（案内）はそのまま
        full = self.src.resize((tw, th), Image.LANCZOS, box=(x0, y0, x1, y1))   # 切り取った範囲を、はみ出さずにそのまま見せる
        for i in range(n):
            # 場面の頭の0.3秒だけ、少し小さい所から ふわっと大きくなる（見切れないよう、拡大はしない）
            t = min(1.0, i / (FPS * 0.3))
            k = 0.94 + 0.06 * (1 - (1 - t) ** 2)
            view = full if k >= 0.999 else full.resize((round(tw * k), round(th * k)), Image.BILINEAR)
            fr = self.bg.copy()
            fr.paste(view, (ox + (tw - view.width) // 2, oy + (th - view.height) // 2))
            yield fr


def fit(cw, ch, maxw=CW, maxh=IMG_BOT - IMG_TOP - 20):
    s = min(maxw / cw, maxh / ch)
    return max(1, round(cw * s)), max(1, round(ch * s))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', required=True)
    ap.add_argument('--dist', default='dist')
    ap.add_argument('--out', default='dist-video')
    ap.add_argument('--voicevox', default='', help='VOICEVOX エンジンの URL。なければ声なし（音楽だけ）')
    ap.add_argument('--sec', type=float, default=4.0, help='声がないときの、1場面の秒数')
    args = ap.parse_args()
    cfg = json.loads(Path('site.config.json').read_text(encoding='utf-8'))
    sh = json.loads(Path(f'content/sheets/{args.sheet}.json').read_text(encoding='utf-8'))
    strip = lambda t: re.sub(r'\{([^|}]*)\|[^}]*\}', r'\1', t).replace('**', '').replace('==', '')
    title, sub = strip(sh['title']), strip(sh.get('sub', ''))
    brand = f'{cfg.get("brandPrefix", "")} {cfg.get("brandMain", cfg["siteName"])}'
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    pdf = Path(args.dist) / 'gift' / f'sheet-{args.sheet}.pdf'
    info = json.loads((Path(args.dist) / 'gift' / f'sheet-{args.sheet}.blocks.json').read_text(encoding='utf-8'))
    tmp = Path(tempfile.mkdtemp())
    subprocess.run(['pdftoppm', '-r', '200', '-png', str(pdf), str(tmp / 'p')], check=True)
    pages = [Image.open(f).convert('RGB') for f in sorted(tmp.glob('p-*.png'))]
    PW, PH = pages[0].size
    MM = PW / 210.0                                    # 1mm あたりのピクセル（A4 横210mm）

    def block_box(pi, keyword):
        """pi ページ目で、見出しに keyword をふくむブロックの切り取り範囲（PDF画像上）。なければページ全体。"""
        pg = info[pi]
        ew_mm = 192.0
        eh_mm = ew_mm * pg['h'] / pg['w']
        bl = next((b for b in pg['blocks'] if keyword and keyword in b['t']), None)
        if not bl:
            if keyword:
                print(f'警告：ページ{pi + 1}に「{keyword}」のブロックがありません。ページ全体を出します')
            return (9 * MM, 8 * MM, 201 * MM, (8 + eh_mm) * MM), '' if not keyword else keyword
        x0 = (9 + (bl['x'] - PAD) * ew_mm) * MM
        x1 = (9 + (bl['x'] + bl['w'] + PAD) * ew_mm) * MM
        y0 = (8 + (bl['y'] - PAD * 0.7) * eh_mm) * MM
        y1 = (8 + (bl['y'] + bl['h'] + PAD * 0.7) * eh_mm) * MM
        return (max(0, x0), max(0, y0), min(PW, x1), min(PH, y1)), short_label(bl['t'])

    # 場面のならび：①名乗り（ページ1全体）②各ページの各ブロック ③シートの画像を並べて案内
    plan = [dict(text=f'じじたねの、覚えるシート。{title}。', page=0, key='', label=title, intro=True)]
    for pi, p in enumerate(sh['pages']):
        for seg in p.get('voice', []):
            seg = seg if isinstance(seg, dict) else {'t': seg, 'f': ''}
            plan.append(dict(text=seg['t'], page=pi, key=seg.get('f', ''), label=None))
    plan.append(dict(text='プリントできるPDFは、LINEで、シート、と送ってね。', outro=True))

    # 各項目を、サイトのスマホ表示から大きく撮る（A4のPDFを切るだけだと、横長で文字が小さくなるため）
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg_ = br.new_page(viewport={'width': 380, 'height': 900}, device_scale_factor=3.2, color_scheme='light')
        _, _, shots = mp.grab(pg_, (Path(args.dist).resolve() / 'sheets' / f'{args.sheet}.html').as_uri(), args.sheet)
        br.close()

    voice = bytearray()
    for sc in plan:
        if args.voicevox:
            wav, sec = vv.tts(args.voicevox, sc['text'])
            voice += vv.pcm(wav) + vv.silence_pcm(0.35)
            sc['dur'] = sec + 0.35
        else:
            voice += vv.silence_pcm(args.sec)
            sc['dur'] = args.sec
    total = sum(sc['dur'] for sc in plan)
    print('場面ごとの秒数：', [round(sc['dur'], 1) for sc in plan], '合計', round(total, 1))
    if total > 58:
        print('警告：60秒をこえるので、ショートにならないかもしれません')
    if args.voicevox:
        vv.setup_dict(args.voicevox)

    vpath, bpath = out / f'{args.sheet}-voice.wav', out / f'{args.sheet}-bgm.wav'
    vv.write_wav(vpath, bytes(voice))
    vv.write_wav(bpath, bgm_pcm(total + 0.5))
    mp4 = out / f'sheet-{args.sheet}.mp4'
    ff = subprocess.Popen([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-i', str(vpath), '-i', str(bpath),
        '-filter_complex', '[1:a]volume=1.0[va];[2:a]volume=0.22[ba];[va][ba]amix=inputs=2:duration=first:normalize=0,aresample=44100[a]',
        '-map', '0:v', '-map', '[a]', '-t', f'{total:.2f}',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(mp4),
    ], stdin=subprocess.PIPE)

    def emit(frames):
        for fr in frames:
            ff.stdin.write(fr.tobytes())

    for sc in plan:
        if sc.get('outro'):
            # シートの画像を並べる（3枚まで。多いときは最初・まん中・最後）
            idx = list(range(len(pages))) if len(pages) <= 3 else [0, len(pages) // 2, len(pages) - 1]
            canvas = Image.new('RGB', (960, 1250), BG)
            cd = ImageDraw.Draw(canvas)
            pos = [(0, 150), (240, 10), (480, 110)] if len(idx) == 3 else [(120, 80), (360, 180)][:len(idx)]
            pw_ = 480
            for pi, (x, y) in zip(idx, pos):
                im = pages[pi].resize((pw_, round(pw_ * PH / PW)), Image.LANCZOS)
                cd.rectangle([x - 4, y - 4, x + im.width + 4, y + im.height + 4], fill=(200, 212, 230))
                canvas.paste(im, (x, y))
            canvas = canvas.resize((720, 938), Image.LANCZOS)
            bg = scene_bg(brand, 'このPDFを、プレゼント！', '')
            d = ImageDraw.Draw(bg)
            d.rounded_rectangle([CX, 1195, CX + CW, 1350], radius=36, fill=GREEN)
            d.text((CX + CW // 2, 1240), 'LINEで「シート」と送ってね', font=font(52), fill=(255, 255, 255), anchor='mm')
            d.text((CX + CW // 2, 1302), '全15種類・印刷OK／プロフィールのリンクから友だち追加', font=font(29), fill=(230, 252, 238), anchor='mm')
            bg.paste(canvas, (CX + (CW - 720) // 2, 240))
            emit(Scene(bg, bg, (0, 0, W, H), sc['dur'], 0).frames((W, H)))
            continue
        hit = next(((t, im) for t, im in shots if sc['key'] and sc['key'] in t), None) if not sc.get('intro') else None
        if hit:
            src = hit[1]
            box, lab = (0, 0, src.width, src.height), short_label(hit[0])
        else:
            box, lab = block_box(sc['page'], sc['key'])
            src = pages[sc['page']]
        label = sc['label'] or lab or title
        disp = fit(box[2] - box[0], box[3] - box[1])
        bg = scene_bg(brand if not sc.get('intro') else 'じじたねの 覚えるシート', label, sc['text'], card=(CX + (CW - disp[0]) // 2, IMG_TOP + (IMG_BOT - IMG_TOP - disp[1]) // 2, disp[0], disp[1]))
        emit(Scene(bg, src, box, sc['dur']).frames(disp))
    ff.stdin.close()
    if ff.wait() != 0:
        raise SystemExit('ffmpeg が失敗しました')

    (out / f'sheet-{args.sheet}-title.txt').write_text(f'【覚えるシート】{title} #中学受験 #shorts', encoding='utf-8')
    desc = (f'{title}\n{sub}\n\n印刷できるPDF（A4）は、LINEで「シート」と送ると届きます。\n{cfg.get("lineUrl", "")}\n'
            f'ページで見る：{cfg["siteUrl"].rstrip("/")}/sheets/{args.sheet}.html\n\n'
            '覚えるシートは全15種類。ほかのシートも、毎日1つずつ紹介しています。\n'
            f'音声：{vv.CREDIT}／音楽：自作\n\n#中学受験 #中受 #家庭学習 #小学生の勉強')
    (out / f'sheet-{args.sheet}.txt').write_text(desc, encoding='utf-8')
    print(f'作成：{mp4}（{len(plan)}場面）')


if __name__ == '__main__':
    main()
