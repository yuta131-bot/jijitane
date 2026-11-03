#!/usr/bin/env python3
"""都道府県の地図データ（src/japan-pref.json）を作る。
Natural Earth（パブリックドメイン）の ne_10m_admin_1_states_provinces.geojson から、日本の47都道府県を取り出して、
・本州・北海道・四国・九州を1枚の地図に
・南西諸島（沖縄県と、鹿児島県の奄美などの島）は、右下の枠の中に小さくして
並べる。各県の番号（JISコード順）を置く場所も、いちばん広い所にくるように計算しておく。

  python3 tools/make-japan-pref.py path/to/ne_10m_admin_1_states_provinces.geojson
"""
import json, math, sys

src = sys.argv[1]
G = json.load(open(src))
JP = [f for f in G['features'] if f['properties'].get('iso_a2') == 'JP']
assert len(JP) == 47, len(JP)

LON0, LON1, LAT0, LAT1 = 127.5, 149.0, 30.0, 45.8
W = 560
KX = W / (LON1 - LON0)
KY = KX / math.cos(math.radians(37.5))
H = round((LAT1 - LAT0) * KY, 1)

def region(code):
    return 1 if code == 1 else 2 if code <= 7 else 3 if code <= 14 else 4 if code <= 23 else 5 if code <= 30 else 6 if code <= 35 else 7 if code <= 39 else 8

def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2

def dp(pts, eps):
    if len(pts) < 3:
        return pts
    keep = {0, len(pts) - 1}
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1e-9
        best, bi = 0, None
        for i in range(a + 1, b):
            x, y = pts[i]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L
            if d > best:
                best, bi = d, i
        if bi is not None and best > eps:
            keep.add(bi)
            stack += [(a, bi), (bi, b)]
    return [pts[i] for i in sorted(keep)]

def simplify_ring(pts, eps):
    """閉じた輪（始まりと終わりが同じ点）を、形をほぼ保ったまま、点を減らす"""
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    if len(pts) < 4:
        return pts
    far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    a = dp(pts[:far + 1], eps)
    b = dp(pts[far:] + [pts[0]], eps)
    return a[:-1] + b[:-1]

def inside(pt, ring):
    x, y = pt
    c = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            c = not c
        j = i
    return c

def segdist(pt, a, b):
    px, py = pt
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def pole(rings):
    ext = rings[0]
    xs = [p[0] for p in ext]
    ys = [p[1] for p in ext]
    best, bp = -1, (sum(xs) / len(xs), sum(ys) / len(ys))
    step = max(1.0, (max(xs) - min(xs)) / 40, (max(ys) - min(ys)) / 40)
    y = min(ys)
    while y <= max(ys):
        x = min(xs)
        while x <= max(xs):
            if inside((x, y), ext) and not any(inside((x, y), h) for h in rings[1:]):
                d = min(segdist((x, y), r[i - 1], r[i]) for r in rings for i in range(len(r)))
                if d > best:
                    best, bp = d, (x, y)
            x += step
        y += step
    return bp

# 1) 取り出す：本州・北海道・四国・九州の島は「本島」、沖縄・奄美などは「南西諸島」にまとめる
main, south = {}, {}
for f in JP:
    p = f['properties']
    code = int(p['iso_3166_2'].split('-')[1])
    name = p['name_ja']
    g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        xs = [q[0] for q in poly[0]]
        ys = [q[1] for q in poly[0]]
        lo0, lo1, la0, la1 = min(xs), max(xs), min(ys), max(ys)
        if la1 < LAT0:
            if lo1 < 132:
                south.setdefault((code, name), []).append(poly)   # 南西諸島
            continue                                              # 小笠原など、遠い島は載せない
        if lo1 < LON0 or lo0 > LON1 or la0 > LAT1:
            continue
        main.setdefault((code, name), []).append(poly)

# 北方領土（択捉島・国後島・色丹島・歯舞群島）は、データの上ではロシアのサハリン州に入っているので、北海道に加える
for f in G['features']:
    p = f['properties']
    if p.get('iso_a2') == 'RU' and 'Sakhalin' in (p.get('name') or ''):
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            xs = [q[0] for q in poly[0]]
            ys = [q[1] for q in poly[0]]
            if min(xs) >= 145.3 and max(xs) <= 149.0 and min(ys) >= 43.3 and max(ys) <= 45.6:
                main.setdefault((1, '北海道'), []).append(poly)

# 2) 南西諸島の位置と大きさ
sx = [q[0] for ps in south.values() for poly in ps for q in poly[0]]
sy = [q[1] for ps in south.values() for poly in ps for q in poly[0]]
S_LON0, S_LON1, S_LAT0, S_LAT1 = min(sx), max(sx), min(sy), max(sy)
SCALE = 0.8
inset_w = (S_LON1 - S_LON0) * KX * SCALE
inset_h = (S_LAT1 - S_LAT0) * KY * SCALE
PAD = 6
IX = W - inset_w - PAD * 2 - 4
IY = H - inset_h - PAD * 2 - 4

def proj_main(lon, lat):
    return ((lon - LON0) * KX, (LAT1 - lat) * KY)

def proj_south(lon, lat):
    return (IX + PAD + (lon - S_LON0) * KX * SCALE, IY + PAD + (S_LAT1 - lat) * KY * SCALE)

def build(groups, proj, eps):
    out = {}
    for (code, name), polys in groups.items():
        parts = []
        biggest, ba = None, -1
        for poly in polys:
            rings = []
            for r in poly:
                pr = [proj(a, b) for a, b in r]
                pr = simplify_ring(pr, eps)
                if len(pr) >= 3:
                    rings.append(pr)
            if not rings:
                continue
            a = area(rings[0])
            if a < 0.6:     # 小さすぎる島は省く
                continue
            parts.append(rings)
            if a > ba:
                ba, biggest = a, rings
        if not parts:
            continue
        d = ''.join('M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in r).replace(' ', ' ', 1) + 'Z' for rings in parts for r in rings)
        # 「M x y x y …」の形に直す（最初の点だけ M、あとは L）
        d = ''
        for rings in parts:
            for r in rings:
                d += 'M' + f'{r[0][0]:.1f} {r[0][1]:.1f}' + ''.join(f'L{x:.1f} {y:.1f}' for x, y in r[1:]) + 'Z'
        lx, ly = pole(biggest)
        out[code] = dict(code=code, name=name, region=region(code), d=d, lx=round(lx, 1), ly=round(ly, 1))
    return out

M = build(main, proj_main, 0.35)
S = build(south, proj_south, 0.3)
prefs = {}
for code in range(1, 48):
    if code in M:
        prefs[code] = M[code]
        if code in S:    # 鹿児島県など、本島と南西諸島の両方にある県
            prefs[code]['d'] += S[code]['d']
    elif code in S:
        prefs[code] = S[code]
assert len(prefs) == 47, sorted(set(range(1, 48)) - set(prefs))
# 沖縄県の番号は、南西諸島の枠の中に置く
if 47 in S:
    prefs[47]['lx'], prefs[47]['ly'] = S[47]['lx'], S[47]['ly']

out = dict(W=W, H=H, inset=dict(x=round(IX, 1), y=round(IY, 1), w=round(inset_w + PAD * 2, 1), h=round(inset_h + PAD * 2, 1)),
           prefs=[prefs[c] for c in range(1, 48)])
json.dump(out, open('src/japan-pref.json', 'w'), ensure_ascii=False, separators=(',', ':'))
import os
print('W', W, 'H', H, 'inset', out['inset'], 'size', os.path.getsize('src/japan-pref.json'))
