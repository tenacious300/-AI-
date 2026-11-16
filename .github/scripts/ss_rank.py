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
    if total < 100:   # 거의 못 받았으면 기존 파일 유지
        print('받은 모델이 너무 적어요 (%d) → 기존 파일 유지' % total); sys.exit(1)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')
    body = 'window.SS_RANK=' + json.dumps({'at': now, 'fail': fail, 'cats': got, 'info': info}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    head = '/* 삼성닷컴 AI 구독 품목별 판매량순 (최근 31일 판매 수량) · .github/scripts/ss_rank.py 가 매일 자동 갱신 */\n'
    for p in ('data/ss-rank.js', 'test/data/ss-rank.js'):
        with open(os.path.join(root, p), 'w', encoding='utf-8') as f: f.write(head + body)
    print('저장', now, {k: len(v) for k, v in got.items()}, '실패', fail)

if __name__ == '__main__':
    main()
