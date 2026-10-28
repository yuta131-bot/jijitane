#!/usr/bin/env python3
"""その日の号から、YouTube ショート用の縦長動画（1080x1920・mp4）を作る。

  python3 scripts/make_short.py --date 2026-10-27 --out dist-video [--voicevox http://localhost:50021]

- 画面：記事データ（見出し・3行まとめ・図・クイズ）から HTML を作り、Playwright（Chromium）で画像にする
- 音声：VOICEVOX エンジン（--voicevox）で読み上げを作る。指定がなければ音声なしの試作版になる
- 字幕：読み上げている文を画面の下に大きく出す
- 合成：ffmpeg で画像と音声をつなぐ
"""
import argparse, json, os, re, shutil, subprocess, sys, urllib.parse, urllib.request, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
W, H = 1080, 1920
SPEAKER_CREDIT = os.environ.get('VOICEVOX_CREDIT', 'VOICEVOX:冥鳴ひまり')
SPEED = float(os.environ.get('VOICEVOX_SPEED', '1.15'))
GAP = 0.25  # 文と文のあいだの間（秒）

RUBY = re.compile(r'\{([^{}|]+)\|([^{}|]+)\}')
def disp(s):  # 画面に出す文（漢字のまま）
    return re.sub(r'\*\*(.+?)\*\*', r'\1', re.sub(r'==(.+?)==', r'\1', RUBY.sub(r'\1', s or '')))
def say(s):  # 読み上げる文（ふりがなの読みで読む）
    t = re.sub(r'\*\*(.+?)\*\*', r'\1', re.sub(r'==(.+?)==', r'\1', RUBY.sub(r'\2', s or '')))
    t = t.replace('jijitane.com', 'じじたね ドット コム').replace('%', 'パーセント').replace('％', 'パーセント')
    return t
def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def first_sentence(s):
    m = re.match(r'(.+?[。！？])', s or '')
    return m.group(1) if m else (s or '')

WD = '月火水木金土日'
def jp_date(iso):
    import datetime
    d = datetime.date.fromisoformat(iso)
    return f'{d.month}月{d.day}日', f'{d.month}月{d.day}日（{WD[d.weekday()]}）'

# ---------- 画面（HTML） ----------
SUBJ = {'rika': ('#1E9A72', 'ch-rika'), 'shakai': ('#DB7420', 'ch-shakai'), 'other': ('#2E78C9', 'ch-tenki')}
CSS_VARS = ('--paper:#F5FAFE;--grid:#DDEAF4;--card:#FFFFFF;--ink:#1D2B44;--muted:#56677F;--line:#C9D8E6;'
            '--sci:#1E9A72;--soc:#DB7420;--sky:#2E78C9;--sea:#BFE0F5;--land:#F1E3C6;--landline:#C9AE7C;--soft:#EEF5FB;'
            '--marker:#FFE36E;--mark-bg:#FFE36E;--mark-ink:inherit')

def sub_html(subtitle, progress=None):
    if subtitle and progress is not None:
        # 読んでいるところまで、字幕にマーカーをのばす（声の長さに合わせて文字数で按分）
        chars = list(subtitle); n = round(len(chars) * max(0.0, min(1.0, progress)))
        sub = f'<div class="sub"><span><span class="mk">{esc("".join(chars[:n]))}</span>{esc("".join(chars[n:]))}</span></div>'
    else:
        sub = f'<div class="sub"><span>{esc(subtitle)}</span></div>' if subtitle else ''
    return sub

def page(body, subtitle, credit=True, progress=None):
    sub = sub_html(subtitle, progress)
    cr = f'<div class="credit">{esc(SPEAKER_CREDIT)}</div>' if credit else ''
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=block" rel="stylesheet">
<style>
:root{{{CSS_VARS}}}
*{{box-sizing:border-box;margin:0}}
html,body{{width:{W}px;height:{H}px;overflow:hidden}}
body{{font-family:"Zen Maru Gothic","Noto Sans CJK JP","Hiragino Maru Gothic ProN",sans-serif;color:#1D2B44;
  background:#F5FAFE;background-image:linear-gradient(#DDEAF4 2px,transparent 2px),linear-gradient(90deg,#DDEAF4 2px,transparent 2px);background-size:54px 54px;position:relative}}
.top{{position:absolute;left:0;top:0;width:100%;height:200px;background:#8ED4FF;display:flex;align-items:center;gap:22px;padding:0 56px}}
.top svg.logo{{width:104px;height:104px;flex:none}}
.bp{{display:inline-block;background:#1D2B44;color:#fff;font-size:30px;font-weight:900;border-radius:10px;padding:2px 12px;margin-right:12px;vertical-align:8px}}
.brand{{font-size:52px;font-weight:900;line-height:1.1}}
.date{{font-size:34px;font-weight:700;margin-top:6px}}
.main{{position:absolute;left:56px;right:56px;top:240px;bottom:470px;display:flex;flex-direction:column;gap:28px}}
.sub{{position:absolute;left:44px;right:44px;bottom:110px;min-height:300px;background:rgba(20,28,44,.88);color:#fff;border-radius:36px;
  padding:34px 40px;font-size:54px;font-weight:700;line-height:1.45;display:flex;align-items:center}}
.mk{{background:linear-gradient(transparent 56%,rgba(255,214,64,.62) 56%);border-radius:4px;-webkit-box-decoration-break:clone;box-decoration-break:clone}}
.credit{{position:absolute;right:52px;bottom:44px;font-size:28px;color:#56677F;font-weight:700}}
.card{{background:#fff;border:4px solid #1D2B44;border-radius:30px;padding:26px 30px;display:flex;align-items:center;gap:24px}}
.num{{flex:none;width:84px;height:84px;border-radius:50%;color:#fff;font-size:50px;font-weight:900;display:flex;align-items:center;justify-content:center}}
.tag{{display:inline-block;color:#fff;font-size:34px;font-weight:700;border-radius:999px;padding:4px 22px}}
.h{{font-size:58px;font-weight:900;line-height:1.3}}
.fig{{background:#fff;border-radius:28px;padding:16px;display:flex;justify-content:center;align-items:center;flex:1;min-height:0}}
.fig svg{{height:100%;width:auto;max-width:100%}}
.fig svg text{{font-family:"Zen Maru Gothic","Noto Sans CJK JP",sans-serif}}
.choice{{background:#fff;border:4px solid #1D2B44;border-radius:28px;padding:22px 30px;font-size:52px;font-weight:700;display:flex;gap:22px;align-items:center}}
.choice b{{flex:none;width:72px;height:72px;border-radius:50%;background:#1D2B44;color:#fff;display:flex;align-items:center;justify-content:center;font-size:42px}}
.choice.ok{{background:#E3F6EE;border-color:#1E9A72;border-width:8px}}
.choice.ok b{{background:#1E9A72}}
.big{{position:absolute;left:0;right:0;top:640px;text-align:center;font-size:420px;font-weight:900;color:#DB7420;-webkit-text-stroke:10px #fff;paint-order:stroke}}
</style></head><body>{SYMBOLS}{body}{sub}{cr}</body></html>'''

def use(sym, w, h, style=''):
    return f'<svg viewBox="0 0 1 1" style="width:{w}px;height:{h}px;{style}"><use href="#{sym}" x="0" y="0" width="1" height="1"/></svg>'

def top(date_long):
    return (f'<div class="top"><svg class="logo" viewBox="0 0 40 40"><use href="#jt-logo" width="40" height="40"/></svg>'
            f'<div><div class="brand"><span class="bp">中受</span>じじニュースのたね</div><div class="date">{esc(date_long)}</div></div></div>')

def scene_open(a, date_short, date_long):
    rows = ''
    for i, n in enumerate(a['news']):
        c, ch = SUBJ.get(n.get('subject_key'), SUBJ['other'])
        rows += (f'<div class="card"><div class="num" style="background:{c}">{i+1}</div>'
                 f'<div style="font-size:50px;font-weight:900;line-height:1.3">{esc(disp(n.get("short_title") or n["title"]))}</div></div>')
    body = (top(date_long) + f'<div class="main" style="gap:34px"><div style="display:flex;align-items:center;gap:20px">'
            f'<div><span class="tag" style="background:#1D2B44">中学受験の保護者向け</span>'
            f'<div class="h" style="font-size:84px;margin-top:16px">{esc(date_short)}の<br>時事3本</div></div>'
            f'<div style="margin-left:auto">{use("ch-poppo", 300, 309)}</div></div>{rows}</div>')
    return body

def scene_news(n, i, svg, date_long):
    c, ch = SUBJ.get(n.get('subject_key'), SUBJ['other'])
    body = (top(date_long) + f'<div class="main"><div style="display:flex;align-items:center;gap:18px">'
            f'<div class="num" style="background:{c}">{i+1}</div><span class="tag" style="background:{c}">{esc(disp(n["subject"]))}</span>'
            f'<div style="margin-left:auto">{use(ch, 96, 129)}</div></div>'
            f'<div class="h">{esc(disp(n["title"]))}</div><div class="fig">{svg}</div></div>')
    return body

def scene_quiz(q, date_long, reveal=None, count=None):
    letters = 'ABCD'
    ch = ''
    for j, c in enumerate(q['choices']):
        ok = ' ok' if reveal is not None and j == reveal else ''
        ch += f'<div class="choice{ok}"><b>{letters[j]}</b><span>{esc(disp(c))}</span></div>'
    big = f'<div class="big">{count}</div>' if count else ''
    body = (top(date_long) + f'<div class="main"><div style="display:flex;align-items:flex-start;gap:20px">'
            f'<div style="flex:none">{use("ch-fuku", 220, 242)}</div>'
            f'<div><span class="tag" style="background:#DB7420">親子でクイズ</span><div class="h" style="font-size:54px;margin-top:14px">{esc(disp(q["q"]))}</div></div></div>'
            f'<div style="display:flex;flex-direction:column;gap:26px;margin-top:20px">{ch}</div></div>{big}')
    return body

def scene_end(date_long):
    body = (top(date_long) + '<div class="main" style="align-items:center;justify-content:center;gap:40px;text-align:center">'
            f'{use("ch-poppo", 360, 371)}<div class="h" style="font-size:62px">図解とくわしい解説は<br>サイトでどうぞ</div>'
            '<div style="font-size:96px;font-weight:900;color:#2E78C9">jijitane.com</div>'
            '<div style="font-size:44px;font-weight:700">お子さんとの会話のきっかけに<br>毎朝7時半に X でも配信中 @jijitane_news</div></div>')
    return body

# ---------- 音声（VOICEVOX：scripts/voicevox.py と同じ声・同じ読み方） ----------
sys.path.insert(0, str(Path(__file__).resolve().parent))
import voicevox as vv

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--date', required=True)
    ap.add_argument('--out', default='dist-video')
    ap.add_argument('--voicevox', default='')
    args = ap.parse_args()
    a = json.loads((ROOT / 'content' / f'{args.date}.json').read_text(encoding='utf-8'))
    out = (ROOT / args.out).resolve(); work = out / f'work-{args.date}'
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True)
    date_short, date_long = jp_date(args.date)

    # 図の SVG を、サイトと同じ方法で安全にし、ベースマップを地図に置きかえる
    svgs = json.loads(subprocess.run(
        ['node', '-e', "import('./src/markup.mjs').then(m=>{const a=JSON.parse(require('fs').readFileSync(0,'utf8'));"
         "process.stdout.write(JSON.stringify(a.map((s,i)=>m.safeSvg(s,'v'+i))))})"],
        input=json.dumps([n.get('svg', '') for n in a['news']]), capture_output=True, text=True, cwd=ROOT, check=True).stdout)

    # 場面ごとに（画面, [(画面に出す字幕, 読み上げる文)], 固定の秒数）
    scenes = []
    scenes.append((scene_open(a, date_short, date_long),
                   [('中学受験の保護者のみなさんへ。', '中学受験の、保護者のみなさんへ。'), (f'{date_short}の時事を3本、1分でおさえます。', f'{date_short}の時事を3本、1分でおさえます。')]))
    for i, n in enumerate(a['news']):
        lines = [(f'{i+1}本目。{disp(n["title"])}', f'{i+1}本目。{say(n["title"])}。')]
        lines += [(disp(p), say(p)) for p in n['points']]
        scenes.append((scene_news(n, i, svgs[i], date_long), lines))
    q = a['news'][0]['quiz']
    scenes.append((scene_quiz(q, date_long), [('親子でクイズ。お子さんに出してみてください。', f'親子でクイズです。{say(q["q"])}')]))
    for k in (3, 2, 1):
        scenes.append((scene_quiz(q, date_long, count=k), [('', None, 1.0, 'beep')]))
    ans = int(q.get('answer', 0))
    scenes.append((scene_quiz(q, date_long, reveal=ans),
                   [(f'正解は {disp(q["choices"][ans])} です。', f'正解は、{say(q["choices"][ans])}です。', None, 'chime'), (disp(first_sentence(q.get('a'))), say(first_sentence(q.get('a'))))]))
    scenes.append((scene_end(date_long), [('図解とくわしい解説は、サイトでどうぞ。', '図解とくわしい解説は、じじたねのサイトでどうぞ。')]))

    # 音声と長さ
    if args.voicevox:
        vv.setup_dict(args.voicevox)
    items = []  # (html, 字幕, 音声wav, 間wav, 秒)
    k = 0
    for html, lines in scenes:
        for ln in lines:
            sub, spoken = ln[0], ln[1]
            fixed = ln[2] if len(ln) > 2 else None
            sound = ln[3] if len(ln) > 3 else None
            data = b''
            sp_start = sp_len = 0.0
            if sound == 'beep':      # カウントダウンの「ピッ」
                data = vv.tone_pcm([880], each=0.16)
            elif sound == 'chime':   # 正解の「ピンポン」
                data = vv.tone_pcm([1047, 1319], each=0.16) + vv.silence_pcm(0.15)
            if spoken and args.voicevox:
                wb, _ = vv.tts(args.voicevox, spoken, SPEED)
                sp_start = len(data) / 2 / vv.RATE
                data += vv.pcm(wb)
                sp_len = len(data) / 2 / vv.RATE - sp_start
            sec = len(data) / 2 / vv.RATE
            if fixed and sec < fixed:
                data += vv.silence_pcm(fixed - sec); sec = fixed
            elif not args.voicevox and spoken:
                extra = max(1.2, len(spoken) * 0.13 + 0.4)
                sp_start, sp_len = sec, extra
                data += vv.silence_pcm(extra); sec += extra
            wav = work / f'a{k:03d}.wav'; vv.write_wav(wav, data)
            gap = 0 if sound == 'beep' else GAP
            pad = work / f'p{k:03d}.wav'; vv.write_wav(pad, vv.silence_pcm(gap) or b'\x00\x00')
            items.append((html, sub, wav, pad, sec + gap + (1 / vv.RATE if not gap else 0), sp_start, sp_len)); k += 1

    # 画面を画像に。読み上げ中の字幕は 0.2 秒ごとにマーカーをのばした画像を作る
    STEP = 0.2
    frames = []  # (画像ファイル名, 秒)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': W, 'height': H})
        cur_body = None
        def shot(body, sub, prog, dur):
            nonlocal cur_body
            if body != cur_body or not sub:
                pg.set_content(page(body, sub, progress=prog), wait_until='networkidle'); pg.evaluate('document.fonts.ready')
                cur_body = body if sub else None
            else:  # 同じ場面なら字幕だけ入れかえる
                pg.evaluate("h => { document.querySelector('.sub').outerHTML = h; }", sub_html(sub, prog))
            name = f'f{len(frames):04d}.png'
            pg.screenshot(path=str(work / name)); frames.append((name, dur))
        for (body, sub, _w, _p, total, sp_start, sp_len) in items:
            if not sub or sp_len <= 0:
                shot(body, sub, None, total); continue
            t = 0.0
            if sp_start > 0:  # 声の前（正解音など）
                shot(body, sub, 0.0, sp_start); t = sp_start
            while t < sp_start + sp_len - 1e-6:
                d = min(STEP, sp_start + sp_len - t)
                shot(body, sub, (t + d - sp_start) / sp_len, d); t += d
            if total - t > 1e-3:  # 読み終わり〜次の文まで
                shot(body, sub, 1.0, total - t)
        b.close()

    # つなぐ
    with open(work / 'v.txt', 'w') as f:
        for name, dur in frames:
            f.write(f"file '{name}'\nduration {dur:.3f}\n")
        f.write(f"file '{frames[-1][0]}'\n")
    with open(work / 'a.txt', 'w') as f:
        for it in items:
            f.write(f"file '{it[2].name}'\nfile '{it[3].name}'\n")
    out.mkdir(parents=True, exist_ok=True)
    mp4 = out / f'short-{args.date}.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'v.txt', '-f', 'concat', '-safe', '0', '-i', 'a.txt',
                    '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20',
                    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', str(mp4)], cwd=work, check=True)
    shutil.copy(work / frames[0][0], out / f'short-{args.date}-thumb.png')
    total = sum(it[4] for it in items)
    desc = (f'中学受験生の保護者向けに、入試に出そうな時事ニュースを毎朝1分でまとめています。\n\n'
            f'{date_long}の3本\n' + '\n'.join(f'{"①②③"[i]}{disp(n.get("short_title") or n["title"])}' for i, n in enumerate(a['news']))
            + f'\n\n図解つきのくわしい解説はサイトで（お子さんと一緒に読めます）\nhttps://jijitane.com/news/{args.date}.html\n\n'
            f'毎朝7時半に X でも配信中：https://x.com/jijitane_news\n'
            f'音声：{SPEAKER_CREDIT}\n\n#中学受験 #中学受験生の親 #時事問題 #Shorts')
    (out / f'short-{args.date}.txt').write_text(desc, encoding='utf-8')
    t0 = disp(a['news'][0].get('short_title') or a['news'][0]['title'])
    title = f'【中学受験・保護者向け】{date_short}の時事3本｜{t0} ほか #shorts'
    (out / f'short-{args.date}-title.txt').write_text(title, encoding='utf-8')
    print(f'OK: {mp4}（{total:.1f}秒）')

SYMBOLS = (ROOT / 'src' / 'characters.svg').read_text(encoding='utf-8')
if __name__ == '__main__':
    main()
