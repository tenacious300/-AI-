#!/usr/bin/env python3
"""삼성닷컴 스펙 → data/spec/ss/<모델>.json  (계산기 📋 스펙 비교용)
   1) 품목별 전체 상품 목록에서 모델 → 상품번호(goodsId)  2) 계산기 삼성 모델마다 스펙 목록을 받아 저장
   상품 페이지 '스펙' 탭이 쓰는 주소 (공식 공개 API 아님 · 실패한 모델은 기존 파일 유지)"""
import json, os, re, sys, time, html, datetime, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CATS = [36010000, 36020000, 100043932, 37090000, 37010000, 37040000, 100043590, 37030000, 36080000,
        36070000, 100027453, 100020195, 34060000, 39030000, 41040000, 33020000, 39120000]
LIST = ('https://www.samsung.com/sec/cxhr/pf/goodsList?dispClsfNo={}&sortType=100&page={}&rows=200&ehcacheYn=Y'
        '&soldOutExceptYn=N&pfFasterUseYn=Y&secApp=false&secIos=false&aiscCtgYn=N&tcPlantCode=')
SPEC = 'https://www.samsung.com/sec/xhr/goods/getGoodsSpecList'
HEAD = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept': '*/*', 'Referer': 'https://www.samsung.com/sec/', 'X-Requested-With': 'XMLHttpRequest'}
SKIP_SEC = re.compile(r'인증|EMC|기본정보|상품 기본|RF모듈')

def get(url, data=None):
    h = dict(HEAD)
    if data is not None:
        h['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
        data = urllib.parse.urlencode(data).encode()
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=40) as r:
        return r.read().decode('utf-8', 'replace')

def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s)).replace('\xa0', ' ')).strip()

def parse(t):
    out = []
    for dl in re.findall(r'<dl>(.*?)</dl>', t, re.S):
        m = re.search(r'<dt>(.*?)</dt>', dl, re.S)
        sec = clean(m.group(1)) if m else ''
        if not sec or SKIP_SEC.search(sec): continue
        for li in re.findall(r'<li>(.*?)</li>', dl, re.S):
            k = re.search(r'class="spec-title"[^>]*>(.*?)</(?:button|strong)>', li, re.S)
            v = re.search(r'class="spec-desc"[^>]*>(.*?)</p>', li, re.S)
            if k: out.append([sec, clean(k.group(1)), clean(v.group(1)) if v else ''])
    return out

def fetch_spec(g):
    """일반 상품은 바로, 패키지(에어컨 세트 · 청소기 패키지 등)는 구성품 목록에서 첫 번째(본체) 스펙"""
    sp = parse(get(SPEC, {'goodsId': g}))
    if sp: return sp, ''
    parts = re.findall(r'data-cstrt-goods-id="(G\d+)"[^>]*data-disp-nm="([^"]*)"', get('https://www.samsung.com/sec/xhr/goods/goodsSpec', {'goodsId': g, 'goodsTpCd': '20'}))
    if not parts: return [], ''
    time.sleep(0.2)
    sp = parse(get(SPEC, {'goodsId': parts[0][0], 'goodsTpCd': '20'}))
    return sp, ' + '.join(html.unescape(n) for _, n in parts)

def fname(c):   # 파일 이름에 못 쓰는 글자 (예: HW-Q990H/KR) → _
    return re.sub(r'[^A-Za-z0-9._-]', '_', c)

def calc_models():
    t = open(os.path.join(ROOT, 'data/price.js'), encoding='utf-8').read()
    d = json.loads(t[t.index('{'):t.rindex('}') + 1])
    return [m[0] for m in d['models']]

def main():
    gid, name = {}, {}
    for c in CATS:
        for page in range(1, 8):
            try: L = json.loads(get(LIST.format(c, page))).get('products') or []
            except Exception as e: print('목록 실패', c, page, e); break
            for p in L:
                code, g = p.get('mdlCode'), p.get('goodsId')
                if not code or not g: continue
                # 같은 모델이 여러 상품(구독관 · 일반)으로 있으면 구독관(ai-subs) 상품을 우선
                if code not in gid or 'ai-subs' in str(p.get('goodsDetailUrl') or ''):
                    gid[code] = g; name[code] = p.get('goodsNm') or ''
            if len(L) < 200: break
            time.sleep(0.3)
    print('상품번호', len(gid))
    models = calc_models()
    def match(c):   # 정확히 같은 모델 → 없으면 색상만 다른 같은 시리즈(코드 끝 1~2자리)
        if c in gid: return c
        for k in (1, 2):
            if len(c) - k < 8: break
            for x in gid:
                if len(x) == len(c) and x[:-k] == c[:-k]: return x
        return None
    outdir = os.path.join(ROOT, 'data/spec/ss'); os.makedirs(outdir, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d')
    ok = miss = fail = 0; cache = {}; index = {}
    for c in models:
        src = match(c)
        if not src: miss += 1; continue
        try:
            if src not in cache:
                cache[src] = fetch_spec(gid[src]); time.sleep(0.25)
            sp, parts = cache[src]
            if not sp: fail += 1; continue
            with open(os.path.join(outdir, fname(c) + '.json'), 'w', encoding='utf-8') as f:
                json.dump({'code': c, 'src': src, 'name': name.get(src, ''), 'parts': parts, 'at': now, 'spec': sp}, f, ensure_ascii=False, separators=(',', ':'))
            index[c] = src; ok += 1
        except Exception as e:
            fail += 1; print('스펙 실패', c, e)
    with open(os.path.join(outdir, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'at': now, 'm': index}, f, ensure_ascii=False, separators=(',', ':'))
    print('저장 %d · 삼성닷컴에 없음 %d · 실패 %d' % (ok, miss, fail))
    if ok < 100: sys.exit(1)

if __name__ == '__main__':
    main()
