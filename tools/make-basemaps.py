import json, math, sys
src = sys.argv[1]
G = json.load(open(src))
MAPS = {
  'japan':     dict(lon0=122, lon1=149, lat0=23.5, lat1=46, W=360),
  'typhoon':   dict(lon0=118, lon1=148, lat0=15, lat1=40, W=360),
  'southwest': dict(lon0=121, lon1=137, lat0=23, lat1=35.5, W=360),
}
def clip(ring, xmin, ymin, xmax, ymax):
    def inside(p, e):
        x,y=p
        return [x>=xmin, x<=xmax, y>=ymin, y<=ymax][e]
    def inter(p,q,e):
        (x1,y1),(x2,y2)=p,q
        if e<2:
            xv = xmin if e==0 else xmax
            t=(xv-x1)/(x2-x1); return (xv, y1+t*(y2-y1))
        yv = ymin if e==2 else ymax
        t=(yv-y1)/(y2-y1); return (x1+t*(x2-x1), yv)
    out=ring
    for e in range(4):
        inp=out; out=[]
        if not inp: break
        s=inp[-1]
        for p in inp:
            if inside(p,e):
                if not inside(s,e): out.append(inter(s,p,e))
                out.append(p)
            elif inside(s,e): out.append(inter(s,p,e))
            s=p
    return out
def dp(pts, eps):
    if len(pts)<3: return pts
    stack=[(0,len(pts)-1)]; keep={0,len(pts)-1}
    while stack:
        a,b=stack.pop(); (x1,y1),(x2,y2)=pts[a],pts[b]
        dx,dy=x2-x1,y2-y1; L=math.hypot(dx,dy) or 1e-9
        best,bi=0,None
        for i in range(a+1,b):
            x,y=pts[i]; d=abs(dy*x-dx*y+x2*y1-y2*x1)/L
            if d>best: best,bi=d,i
        if bi is not None and best>eps:
            keep.add(bi); stack+= [(a,bi),(bi,b)]
    return [pts[i] for i in sorted(keep)]
def area(r):
    return abs(sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r))))/2
out={}
for name,m in MAPS.items():
    latc=(m['lat0']+m['lat1'])/2; c=math.cos(math.radians(latc))
    kx=m['W']/(m['lon1']-m['lon0']); ky=kx/c
    H=round((m['lat1']-m['lat0'])*ky,1)
    P=lambda lon,lat:((lon-m['lon0'])*kx,(m['lat1']-lat)*ky)
    parts=[]
    for f in G['features']:
        g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for ring in poly:
                xs=[p[0] for p in ring]; ys=[p[1] for p in ring]
                if max(xs)<m['lon0']-1 or min(xs)>m['lon1']+1 or max(ys)<m['lat0']-1 or min(ys)>m['lat1']+1: continue
                pr=[P(a,b) for a,b in ring]
                pr=clip(pr,-2,-2,m['W']+2,H+2)
                if len(pr)<3 or area(pr)<0.12: continue
                far=max(range(len(pr)),key=lambda i:(pr[i][0]-pr[0][0])**2+(pr[i][1]-pr[0][1])**2)
                pr=dp(pr[:far+1],0.35)[:-1]+dp(pr[far:]+[pr[0]],0.35)[:-1]
                if len(pr)<3: continue
                parts.append('M'+'L'.join(f'{x:.1f} {y:.1f}' for x,y in pr).replace('.0 ',' ').replace('.0L','L')+'Z')
    out[name]=dict(m, H=H, kx=round(kx,3), ky=round(ky,3), d=''.join(parts))
    print(name, 'H',H,'kx',round(kx,3),'ky',round(ky,3),'bytes',len(out[name]['d']), file=sys.stderr)
json.dump(out, open(sys.argv[2],'w'), separators=(',',':'))
