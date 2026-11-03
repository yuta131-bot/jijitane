#!/usr/bin/env python3
"""覚えるシートの紹介動画（YouTube ショート用・1080x1920）を作る。

  python3 scripts/make_sheet_video.py --sheet zukei --promo promo --out dist-video [--voicevox http://localhost:50021]

- 画像：promo/{id}-{ページ}.jpg（make_promo.py）。1ページごとに、そのページの紹介の声（content/sheets/{id}.json の pages[].voice）の長さだけ見せる
- 声：VOICEVOX（毎朝のショートと同じ冥鳴ひまり）。全部は読まず、何が書いてあるか・どう役に立つかを伝える
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
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import voicevox as vv  # noqa: E402

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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', required=True)
    ap.add_argument('--promo', default='promo')
    ap.add_argument('--out', default='dist-video')
    ap.add_argument('--voicevox', default='', help='VOICEVOX エンジンの URL。なければ音声なし（音楽だけ）')
    ap.add_argument('--sec', type=float, default=5.0, help='声がないときの、1ページの秒数')
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

    # 声：1ページ＝1つの語り。最初に「じじたね」、最後にLINEの案内を足す
    voice, durs = bytearray(), []
    texts = [p.get('voice', '') for p in sh['pages']]
    if args.voicevox:
        vv.setup_dict(args.voicevox)
    for i in range(len(pages)):
        t = texts[i] if i < len(texts) else ''
        if i == 0:
            t = f'じじたねの、覚えるシート。{title}。{t}'
        if i == len(pages) - 1:
            t = f'{t}{OUTRO}'
        if args.voicevox and t:
            wav, sec = vv.tts(args.voicevox, t)
            seg = vv.pcm(wav) + vv.silence_pcm(0.6)
            voice += seg
            durs.append(sec + 0.6)
        else:
            voice += vv.silence_pcm(args.sec)
            durs.append(args.sec)
    total = sum(durs)
    print('1ページごとの秒数：', [round(d, 1) for d in durs], '合計', round(total, 1))
    if total > 58:
        print('警告：60秒をこえるので、ショートにならないかもしれません')

    vpath, bpath = out / f'{args.sheet}-voice.wav', out / f'{args.sheet}-bgm.wav'
    vv.write_wav(vpath, bytes(voice))
    vv.write_wav(bpath, bgm_pcm(total + 0.5))

    lst = out / f'{args.sheet}.ffconcat'
    lines = []
    for f, d in zip(pages, durs):
        lines += [f"file '{f.resolve()}'", f'duration {d:.2f}']
    lines.append(f"file '{pages[-1].resolve()}'")   # concat は最後の1枚を2回書く決まり
    lst.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    mp4 = out / f'sheet-{args.sheet}.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', str(vpath), '-i', str(bpath),
        '-filter_complex',
        '[0:v]scale=1080:1350,pad=1080:1920:0:285:color=0xF0F6FB,fps=30,format=yuv420p[v];'
        '[1:a]volume=1.0[va];[2:a]volume=0.22[ba];[va][ba]amix=inputs=2:duration=first:normalize=0,aresample=44100[a]',
        '-map', '[v]', '-map', '[a]', '-t', f'{total:.2f}',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(mp4),
    ], check=True)

    (out / f'sheet-{args.sheet}-title.txt').write_text(f'【覚えるシート】{title} #中学受験 #shorts', encoding='utf-8')
    desc = (f'{title}\n{sub}\n\n印刷できるPDF（A4）は、LINEで「シート」と送ると届きます。\n{cfg.get("lineUrl", "")}\n'
            f'ページで見る：{cfg["siteUrl"].rstrip("/")}/sheets/{args.sheet}.html\n\n'
            '覚えるシートは全8種類。ほかのシートも、毎日1つずつ紹介しています。\n'
            f'音声：{vv.CREDIT}／音楽：自作\n\n#中学受験 #中受 #家庭学習 #小学生の勉強')
    (out / f'sheet-{args.sheet}.txt').write_text(desc, encoding='utf-8')
    print(f'作成：{mp4}（{len(pages)}ページ）')


if __name__ == '__main__':
    main()
