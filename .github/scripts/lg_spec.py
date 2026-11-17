#!/usr/bin/env python3
"""LG닷컴 스펙 → data/spec/lg/<모델>.json  (계산기 📋 스펙 비교용 · 우리 LG 단가표(data/lg.js) 모델만)
   LG닷컴 구독 상품 페이지(/care-solutions/<품목>/<모델>) 안에 들어 있는 스펙표를 읽음 (공식 공개 API 아님)"""
import json, os, re, sys, time, html, datetime, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HEAD = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept': 'text/html', 'Referer': 'https://www.lge.co.kr/best-ranking/subscribe'}
# 계산기 LG 품목 → LG닷컴 구독 상품 경로 (앞에서부터 차례로 시도)
PATHS = [('김치냉장고', ['refrigerators', 'kimchi-refrigerators']), ('얼음정수기', ['water-purifiers', 'refrigerators']),
         ('냉장고', ['refrigerators']), ('정수기', ['water-purifiers']), ('건조기', ['dryers']), ('워시콤보', ['all-in-one-laundry', 'washing_machines']),
         ('워시타워', ['washing_machines', 'all-in-one-laundry']), ('세탁기', ['washing_machines']), ('스타일러', ['lg-styler']), ('슈케어', ['lg-styler', 'shoecare']),
         ('스탠바이미', ['tvs']), ('TV', ['tvs']), ('노트북', ['notebook']), ('로봇청소기', ['vacuum-cleaners']), ('청소기', ['vacuum-cleaners']),
         ('에어로', ['air-purifiers']), ('공기청정기', ['air-purifiers']), ('가습기', ['humidifiers']), ('제습기', ['dehumidifiers']),
         ('에어컨', ['air-conditioners']), ('바스에어', ['bath-air-system']), ('광파오븐', ['microwaves-and-ovens']),
         ('전기레인지', ['electric-stoves']), ('식기세척기', ['dishwashers'])]
SEC = re.compile(r'\\"title\\":\\"((?:[^"\\]|\\\\.)*?)\\",\\"items\\":\[(.*?)\]\}', re.S)
ITEM = re.compile(r'\\"name\\":\\"((?:[^"\\]|\\\\.)*?)\\",\\"value\\":\\"((?:[^"\\]|\\\\.)*?)\\"', re.S)
SKIP = re.compile(r'고지정보|인증|제조')

def clean(v):
    v = re.sub(r'\\\\u003c.*?\\\\u003e', ' ', v)
    v = v.replace('\\\\n', ' ').replace('\\\\"', '"').replace('\\\\/', '/')
    return re.sub(r'\s+', ' ', html.unescape(v)).strip()

def parse(t):
    out, seen = [], set()
    for m in SEC.finditer(t):
        sec = clean(m.group(1))
        if not sec or SKIP.search(sec): continue
        for n, v in ITEM.findall(m.group(2)):
            k = (sec, clean(n))
            if k in seen: continue
            seen.add(k); out.append([sec, k[1], clean(v)])
    return out

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEAD), timeout=40) as r:
        return r.read().decode('utf-8', 'replace')

def paths(cat):
    for k, p in PATHS:
        if k in cat: return p
    return []

def fname(c): return re.sub(r'[^A-Za-z0-9._-]', '_', c)

def main():
    t = open(os.path.join(ROOT, 'data/lg.js'), encoding='utf-8').read()
    d = json.loads(t[t.index('{'):t.rindex('}') + 1])
    outdir = os.path.join(ROOT, 'data/spec/lg'); os.makedirs(outdir, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d')
    cache, index, ok, miss = {}, {}, 0, 0
    for m in d['m']:
        code, cat = m[0], d['cats'][m[1]]
        base = code.split('.')[0].lower()
        if base not in cache:
            cache[base] = None
            for p in paths(cat):
                try:
                    h = get('https://www.lge.co.kr/care-solutions/%s/%s' % (p, base)); time.sleep(0.4)
                except Exception:
                    continue
                sp = parse(h)
                if len(sp) >= 5:
                    tm = re.search(r'<title>([^<|]*)', h)
                    cache[base] = (sp, html.unescape(tm.group(1)).strip() if tm else '', p); break
        got = cache[base]
        if not got: miss += 1; continue
        sp, name, p = got
        with open(os.path.join(outdir, fname(code) + '.json'), 'w', encoding='utf-8') as f:
            json.dump({'code': code, 'name': name, 'at': now, 'spec': sp}, f, ensure_ascii=False, separators=(',', ':'))
        index[code] = p; ok += 1
    with open(os.path.join(outdir, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'at': now, 'm': index}, f, ensure_ascii=False, separators=(',', ':'))
    print('LG 스펙 저장 %d · 못 찾음 %d (모델 페이지 %d개 확인)' % (ok, miss, len(cache)))
    if ok < 50: sys.exit(1)

if __name__ == '__main__':
    main()
