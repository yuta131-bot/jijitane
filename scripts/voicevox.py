"""VOICEVOX エンジン（読み上げ）を使うための共通部分。ショート動画とサイトの読み上げで同じ声・同じ読み方にする。"""
import io, json, math, os, struct, urllib.parse, urllib.request, wave

SPEAKER = int(os.environ.get('VOICEVOX_SPEAKER', '14'))  # 14 = 冥鳴ひまり（ノーマル）
CREDIT = os.environ.get('VOICEVOX_CREDIT', 'VOICEVOX:冥鳴ひまり')
RATE = 24000  # VOICEVOX の出力（モノラル・16bit）

# 読み方を直したい言葉（表記, カタカナの読み, アクセント核の位置＝何拍目のあとで音が下がるか）
#   じじたね：「じじ↓たね」＝2拍目のあとで下がる
WORDS = [
    ('じじたね', 'ジジタネ', 2),
    ('ジジタネ', 'ジジタネ', 2),
]

def _req(url, method='GET', data=None, headers=None, timeout=300):
    r = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    return urllib.request.urlopen(r, timeout=timeout).read()

def setup_dict(base):
    """ユーザー辞書に言葉を登録する（すでにあれば何もしない）。"""
    try:
        have = json.loads(_req(f'{base}/user_dict'))
    except Exception:
        have = {}
    surfaces = {v.get('surface') for v in have.values()}
    for surface, pron, acc in WORDS:
        # 辞書の表記は全角に正規化されるので、両方で確かめる
        if surface in surfaces:
            continue
        q = urllib.parse.urlencode({'surface': surface, 'pronunciation': pron, 'accent_type': acc, 'word_type': 'PROPER_NOUN'})
        try:
            _req(f'{base}/user_dict_word?{q}', method='POST')
        except Exception as e:  # 辞書が使えなくても読み上げは続ける
            print('辞書の登録に失敗:', surface, e)

def tts(base, text, speed=1.15):
    """text を読み上げた WAV（bytes）と秒数を返す。"""
    q = json.loads(_req(f'{base}/audio_query?text={urllib.parse.quote(text)}&speaker={SPEAKER}', method='POST'))
    q['speedScale'] = speed
    q['prePhonemeLength'] = 0.05
    q['postPhonemeLength'] = 0.1
    q['outputSamplingRate'] = RATE
    q['outputStereo'] = False
    wav = _req(f'{base}/synthesis?speaker={SPEAKER}', method='POST', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})
    with wave.open(io.BytesIO(wav)) as w:
        return wav, w.getnframes() / w.getframerate()

def pcm(wav_bytes):
    with wave.open(io.BytesIO(wav_bytes)) as w:
        return w.readframes(w.getnframes())

def silence_pcm(sec):
    return b'\x00\x00' * int(RATE * sec)

def tone_pcm(freqs, each=0.14, vol=0.35):
    """ピッ・ピンポンなどの短い音（freqs を順に鳴らす）。"""
    out = bytearray()
    n = int(RATE * each)
    for f in freqs:
        for i in range(n):
            env = min(1, i / (RATE * 0.005), (n - i) / (RATE * 0.03))
            out += struct.pack('<h', int(32767 * vol * env * math.sin(2 * math.pi * f * i / RATE)))
    return bytes(out)

def write_wav(path, pcm_bytes):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm_bytes)
