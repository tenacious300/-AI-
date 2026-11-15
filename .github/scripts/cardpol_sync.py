"""LG 카드 정책 이미지: Apps Script(드라이브 원본) → 저장소 cardpol/ 폴더로 옮겨 담기.
바뀐 게 없으면 아무것도 안 하고 끝나요. (토큰 필요 없음 · 공개 함수만 호출)"""
import base64, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(ROOT, 'cardpol')
cfg = open(os.path.join(ROOT, 'config.js'), encoding='utf-8').read()
m = re.search(r"https://script\.google\.com/macros/s/[^'\"]+/exec", cfg)
if not m:
    sys.exit('config.js 에서 API_URL 을 찾지 못했어요')
API = os.environ.get('CARDPOL_API') or m.group(0)

def call(fn, arg=None):
    req = urllib.request.Request(API, data=json.dumps({'fn': fn, 'arg': arg or {}}).encode(), headers={'Content-Type': 'text/plain'})
    with urllib.request.urlopen(req, timeout=60) as r:
        out = json.loads(r.read().decode('utf-8'))
    if '__err' in out:
        raise RuntimeError(out['__err'])
    return out['r']

pol = call('getCardPolicy')
os.makedirs(DIR, exist_ok=True)
lp = os.path.join(DIR, 'list.json')
cur = {}
if os.path.exists(lp):
    try: cur = json.load(open(lp, encoding='utf-8'))
    except Exception: cur = {}
if cur.get('src') == pol.get('at') and all(os.path.exists(os.path.join(DIR, x['f'])) for x in cur.get('imgs', [])):
    print('바뀐 것 없음', pol.get('at')); sys.exit(0)

imgs, keep = [], {'list.json'}
for x in pol.get('imgs', []):
    fid = re.sub(r'[^0-9A-Za-z_-]', '', x['id'])
    f = fid + '.' + (x.get('ext') or 'jpg')
    keep.add(f)
    path = os.path.join(DIR, f)
    if not os.path.exists(path):
        r = call('cardPolImage', {'id': x['id']})
        if not r or not r.get('ok'):
            print('건너뜀', x['id']); continue
        open(path, 'wb').write(base64.b64decode(r['data']))
        print('추가', f)
    imgs.append({'f': f, 'name': x.get('name', ''), 'w': x.get('w', 0), 'h': x.get('h', 0)})
for n in os.listdir(DIR):
    if n not in keep:
        os.remove(os.path.join(DIR, n)); print('삭제', n)
json.dump({'at': (pol.get('at') or '')[:16], 'src': pol.get('at'), 'imgs': imgs}, open(lp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('목록 갱신', len(imgs), '장')
