"""ショート動画を YouTube にアップロードする（YouTube Data API v3・標準ライブラリだけで動く）

使い方：
  python scripts/upload_youtube.py --date 2026-10-30 --dir dist-video --privacy unlisted

必要な環境変数（GitHub の Secrets）：YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN
動画は「子ども向け」として上げる。アップロードの返事にある公開範囲を表示する
（審査前のプロジェクトでは「非公開」に固定されることがあるため）。
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TOKEN_URL = 'https://oauth2.googleapis.com/token'
UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status'


def request(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'replace')
        sys.exit(f'YouTube API のエラー（{e.code}）：{body[:2000]}')


def access_token():
    missing = [k for k in ('YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN') if not os.environ.get(k)]
    if missing:
        sys.exit('Secrets が足りません：' + ', '.join(missing))
    data = urllib.parse.urlencode({
        'client_id': os.environ['YT_CLIENT_ID'],
        'client_secret': os.environ['YT_CLIENT_SECRET'],
        'refresh_token': os.environ['YT_REFRESH_TOKEN'],
        'grant_type': 'refresh_token',
    }).encode()
    _, _, body = request(TOKEN_URL, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    return json.loads(body)['access_token']


def clean(s, limit):
    # YouTube はタイトル・説明文の < > を受け付けない
    s = s.replace('<', '＜').replace('>', '＞').strip()
    return s[:limit]


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--date', required=True)
    p.add_argument('--dir', default='dist-video')
    p.add_argument('--privacy', choices=['private', 'unlisted', 'public'], default='unlisted')
    args = p.parse_args()

    d = Path(args.dir)
    mp4 = d / f'short-{args.date}.mp4'
    title = clean((d / f'short-{args.date}-title.txt').read_text(encoding='utf-8'), 100)
    desc = clean((d / f'short-{args.date}.txt').read_text(encoding='utf-8'), 5000)

    meta = {
        'snippet': {
            'title': title,
            'description': desc,
            'categoryId': '27',  # 教育
            'defaultLanguage': 'ja',
            'defaultAudioLanguage': 'ja',
            'tags': ['中学受験', '時事問題', 'ニュース', 'Shorts'],
        },
        'status': {
            'privacyStatus': args.privacy,
            'selfDeclaredMadeForKids': True,
            'embeddable': True,
        },
    }

    token = access_token()
    size = mp4.stat().st_size
    _, headers, _ = request(UPLOAD_URL, data=json.dumps(meta).encode('utf-8'), method='POST', headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': str(size),
    })
    location = headers.get('Location') or headers.get('location')
    if not location:
        sys.exit('アップロード先の URL が返りませんでした')

    _, _, body = request(location, data=mp4.read_bytes(), method='PUT', headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'video/mp4',
        'Content-Length': str(size),
    })
    video = json.loads(body)
    vid = video['id']

    # 返ってきた公開範囲を確かめる（審査前だと「非公開」に固定されることがある）。
    # youtube.upload の許可では videos.list が使えないので、アップロードの返事を見る。
    status = video.get('status', {})
    got = status.get('privacyStatus')

    url = f'https://youtube.com/shorts/{vid}'
    lines = [
        f'YouTube に上げました：{url}',
        f'公開範囲：指定 {args.privacy} → 実際 {got}',
        f'子ども向け：{status.get("madeForKids")}',
    ]
    if got != args.privacy:
        lines.append('指定と違う公開範囲になっています。「非公開」に固定された場合は、YouTube API の監査の申請が必要です。')
    lines.append('少しあとに「非公開（ロック）」に変わることもあるので、YouTube Studio でも確かめてください。')
    print('\n'.join(lines))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
