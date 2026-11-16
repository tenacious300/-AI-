#!/usr/bin/env python3
"""삼성닷컴 'AI 구독' 품목별 판매량순(최근 31일 판매 수량, 매일 02시 갱신) → data/ss-rank.js
   계산기 삼성 추천에서 같은 조건이면 삼성닷컴 판매 상위 모델을 먼저 보여 줘요.
   (삼성닷컴 상품 목록 화면이 쓰는 주소 · 공식 공개 API가 아니라 사이트가 바뀌면 실패할 수 있음 → 실패하면 파일을 그대로 둠)"""
import json, urllib.request, datetime, sys, os

CATS = {  # 계산기 품목 이름: 삼성닷컴 전시 분류 번호
    '냉장고': 36010000, '김치냉장고': 36020000, '세탁기': 100043932, '건조기': 100043932,
    '에어드레서': 37090000, '에어컨': 37010000, '공기청정기': 37040000, '제습기': 100043590,
    '청소기': 37030000, '식기세척기': 36080000, '전기레인지': 36070000, '후드': 100027453,
    '정수기': 100020195, 'TV': 34060000, '모니터': 39030000, '오디오': 41040000,
    '갤럭시 탭': 33020000, '갤럭시 북': 39120000,
}
URL = ('https://www.samsung.com/sec/cxhr/pf/goodsList?searchFilter=only-ai-subs&dispClsfNo={}&sortType=100'
       '&page=1&rows=500&ehcacheYn=Y&soldOutExceptYn=N&pfFasterUseYn=Y&secApp=false&secIos=false'
       '&aiscCtgYn=N&tcPlantCode=&onlyAiscGoods=Y')
HEAD = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*', 'Referer': 'https://www.samsung.com/sec/refrigerators/all-refrigerators/?only-ai-subs',
        'X-Requested-With': 'XMLHttpRequest'}

def fetch(no, info):
    req = urllib.request.Request(URL.format(no), headers=HEAD)
    with urllib.request.urlopen(req, timeout=40) as r:
        L = [p for p in (json.loads(r.read().decode('utf-8')).get('products') or []) if p.get('mdlCode')]
    for p in L:   # 모델: [상품명, 판매가, 월 구독료(최저), 약정 년수, 서비스]
        m = p.get('minAiscGoodsPriceInfo') or {}
        info[p['mdlCode']] = [p.get('goodsNm') or '', int(p.get('salePrice') or 0), int(p.get('monSsbPrc') or 0), int(m.get('cntrPrd') or 0), m.get('svcTpCdNm') or '']
    return [p['mdlCode'] for p in L]

def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    got, cache, fail, info = {}, {}, [], {}
    for cat, no in CATS.items():
        try:
            if no not in cache: cache[no] = fetch(no, info)
            got[cat] = cache[no]
        except Exception as e:
            fail.append(cat); print('실패', cat, e)
    total = sum(len(v) for v in got.values())
    lg_ok = lg_main(root)
    if total < 100:   # 거의 못 받았으면 기존 파일 유지
        print('받은 모델이 너무 적어요 (%d) → 기존 파일 유지' % total); sys.exit(0 if lg_ok else 1)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')
    body = 'window.SS_RANK=' + json.dumps({'at': now, 'fail': fail, 'cats': got, 'info': info}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    head = '/* 삼성닷컴 AI 구독 품목별 판매량순 (최근 31일 판매 수량) · .github/scripts/ss_rank.py 가 매일 자동 갱신 */\n'
    for p in ('data/ss-rank.js', 'test/data/ss-rank.js'):
        with open(os.path.join(root, p), 'w', encoding='utf-8') as f: f.write(head + body)
    print('저장', now, {k: len(v) for k, v in got.items()}, '실패', fail)



# ---------- LG전자 '베스트 랭킹 · 가전 구독' 품목별 순위 → data/lg-rank.js ----------
LG_CATS = [  # (LG닷컴 품목 이름, 상위 분류, 품목 분류)
    ('냉장고', 'CT50000174', 'CT50178000'), ('정수기', 'CT50000174', 'CT50000175'), ('전기레인지', 'CT50000174', 'CT50000180'),
    ('식기세척기', 'CT50000174', 'CT50000181'), ('광파오븐', 'CT50000174', 'CT50259000'),
    ('세탁기', 'CT50000183', 'CT50136000'), ('세탁 건조기', 'CT50000183', 'CT50390000'), ('의류건조기', 'CT50000183', 'CT50000178'),
    ('의류관리기', 'CT50000183', 'CT50000179'), ('청소기', 'CT50000183', 'CT50150000'), ('안마의자', 'CT50000183', 'CT50000182'),
    ('에어컨', 'CT50000184', 'CT50080000'), ('공기청정기', 'CT50000184', 'CT50000177'), ('제습기', 'CT50000184', 'CT50273000'),
    ('가습기', 'CT50000184', 'CT50226000'), ('TV', 'CT50238000', 'CT50238002'), ('노트북', 'CT50238000', 'CT50238004'),
]
LG_URL = 'https://www.lge.co.kr/best-ranking/subscribe?superCategoryId={}&categoryId={}'

def lg_main(root):
    import re, html
    got, info, fail = {}, {}, []
    for name, sup, cat in LG_CATS:
        try:
            req = urllib.request.Request(LG_URL.format(sup, cat), headers={**HEAD, 'Referer': 'https://www.lge.co.kr/best-ranking/subscribe', 'Accept': 'text/html'})
            with urllib.request.urlopen(req, timeout=40) as r: t = r.read().decode('utf-8', 'replace')
            L = []
            for m in re.finditer(r'<div class="ranking__item item_subscribe"([^>]*)>', t):
                g = lambda k: html.unescape((re.search(k + r'="([^"]*)"', m.group(1)) or [None, ''])[1])
                sku = g('data-sku')
                if not sku or sku in L: continue
                L.append(sku)   # 모델: [이름, 월 정가, 월 할인가]
                info[sku] = [g('data-modelDisplayName'), int(g('data-obsOriginalPrice') or 0), int(g('data-obsSellingPrice') or 0)]
            got[name] = L
        except Exception as e:
            fail.append(name); print('LG 실패', name, e)
    total = sum(len(v) for v in got.values())
    if total < 50:
        print('LG 받은 모델이 너무 적어요 (%d) → 기존 파일 유지' % total); return False
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')
    body = 'window.LG_RANK=' + json.dumps({'at': now, 'fail': fail, 'cats': got, 'info': info}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    head = '/* LG전자 베스트 랭킹 · 가전 구독 품목별 순위 · .github/scripts/ss_rank.py 가 매일 자동 갱신 */\n'
    for p in ('data/lg-rank.js', 'test/data/lg-rank.js'):
        with open(os.path.join(root, p), 'w', encoding='utf-8') as f: f.write(head + body)
    print('LG 저장', now, {k: len(v) for k, v in got.items()}, '실패', fail)
    return True


if __name__ == '__main__':
    main()
