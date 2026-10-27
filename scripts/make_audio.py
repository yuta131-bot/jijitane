#!/usr/bin/env python3
"""サイトの読み上げ用の音声（VOICEVOX）を作る。

  python3 scripts/make_audio.py --dist dist --cache audio-cache --voicevox http://localhost:50021

- 組み立てたサイト（dist/news/日付.html）を Playwright で開き、ページの読み上げと同じ順番で文を取り出す
- 1記事（1ニュース）につき mp3 と、各文が何秒から始まるかの JSON を作る
- 作った音声は --cache に置き、文が変わっていない記事は作り直さない
- 古い号（--days より前）の音声は消す（その号は端末の声で読み上げる）
- 最後に --cache の中身を dist/audio にコピーする
"""
import argparse, datetime, hashlib, json, shutil, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voicevox as vv

SPEED = 1.05  # サイトの読み上げの速さ（前に決めた 1.05 倍）

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', default='dist')
    ap.add_argument('--cache', default='audio-cache')
    ap.add_argument('--voicevox', required=True)
    ap.add_argument('--days', type=int, default=30)
    ap.add_argument('--max', type=int, default=12, help='1回で新しく作る記事の数の上限')
    args = ap.parse_args()
    root = Path(__file__).resolve().parent.parent
    dist = (root / args.dist).resolve(); cache = (root / args.cache).resolve(); cache.mkdir(parents=True, exist_ok=True)
    today = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    cutoff = (today - datetime.timedelta(days=args.days)).strftime('%Y-%m-%d')
    dates = sorted([p.stem for p in (root / 'content').glob('20*.json') if p.stem >= cutoff], reverse=True)

    # 古い音声を消す
    for f in cache.glob('*'):
        if f.name[:10] < cutoff:
            f.unlink()

    vv.setup_dict(args.voicevox)
    from playwright.sync_api import sync_playwright
    made = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for d in dates:
            page = dist / 'news' / f'{d}.html'
            if not page.exists():
                continue
            pg.goto(page.as_uri())
            queues = pg.evaluate("Array.from(document.querySelectorAll('article[id^=news]')).map(a => window.__jtVoiceQueue ? window.__jtVoiceQueue(a) : [])")
            for i, q in enumerate(queues):
                if not q:
                    continue
                key = f'{d}-{i + 1}'
                h = hashlib.sha1(json.dumps([q, vv.SPEAKER, SPEED, vv.WORDS], ensure_ascii=False).encode()).hexdigest()[:16]
                jf = cache / f'{key}.json'
                if jf.exists():
                    try:
                        if json.loads(jf.read_text())['hash'] == h:
                            continue
                    except Exception:
                        pass
                if made >= args.max:
                    print('上限に達したので、残りは次回に作ります'); break
                pcm = bytearray(); items = []
                for it in q:
                    wav, _ = vv.tts(args.voicevox, it['text'], SPEED)
                    start = len(pcm) / 2 / vv.RATE
                    pcm += vv.pcm(wav)
                    items.append([round(start, 2), round(len(pcm) / 2 / vv.RATE, 2)])
                    pcm += vv.silence_pcm(min(0.6, max(0.05, it['pause'] / 1000)))
                tmp = cache / f'{key}.wav'
                vv.write_wav(tmp, bytes(pcm))
                mp3 = cache / f'{key}-{h[:8]}.mp3'
                for old in cache.glob(f'{key}-*.mp3'):
                    old.unlink()
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', str(mp3)], check=True)
                tmp.unlink()
                jf.write_text(json.dumps({'hash': h, 'src': mp3.name, 'credit': vv.CREDIT, 'items': items}, ensure_ascii=False))
                made += 1
                print(f'作成：{key}（{len(q)}文・{items[-1][1]:.0f}秒）')
            else:
                continue
            break
        b.close()

    out = dist / 'audio'
    shutil.rmtree(out, ignore_errors=True)
    shutil.copytree(cache, out)
    print(f'OK：新しく {made} 記事・サイトに {len(list(out.glob("*.json")))} 記事分の音声')

if __name__ == '__main__':
    main()
