#!/usr/bin/env python3
"""자동 점검: 삼성 · LG · 쿠쿠 계산기를 실제 브라우저(휴대폰 크기)로 열어 기본 흐름을 돌려 봐요.

  python3 tools/smoke.py          # 테스트 화면(test/) 점검
  python3 tools/smoke.py prod     # 정식 화면 점검

점검 내용 (서버 · 외부 사이트는 가짜 응답으로 막고, 저장소 파일만 씀)
  1. 사번으로 입장 (약관 동의 팝업 통과)
  2. 모델 검색 → 담기 → 견적 금액이 0원이 아닌지
  3. 📸 견적 캡처 → 이미지 파일이 만들어지는지 · 지점명 표시
  4. (삼성) 관리자 비밀번호 → 탭을 하나씩 모두 열어 보기 (관리자 코드 admin.js는 이때 처음 불러옴)
  5. 화면 오류(자바스크립트 에러)가 하나도 없는지
필요: pip install playwright && playwright install chromium
"""
import asyncio, json, os, sys, subprocess, socket, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = '' if (len(sys.argv) > 1 and sys.argv[1] == 'prod') else 'test/'
EMP, BR = '100100', '순천점'
OUT = '/tmp/smoke'
os.makedirs(OUT, exist_ok=True)

# 가짜 서버(Apps Script) 응답
def fake(fn):
    if fn == 'adminStats':
        return {'ok': True, 'todayEmps': [], 'online': 1, 'sessions': [], 'days': [], 'blocks': [], 'rmap': {}, 'rex': {}, 'nrlog': [], 'total': 0, 'at': 'now'}
    if fn == 'adminEmpUsage':
        return {'ok': True, 'from': '20261017', 'to': '20261116', 'at': 'now', 'rows': {}, 'roster': {EMP: ['테스트', BR, '사원']}, 'terms': {EMP: ['2026-11-16 17:00:00', 1]}}
    if fn == 'adminEmpDaily':
        rows = [{'e': EMP, 'f': '09:02', 'l': '20:40', 'n': 3, 'am': 62, 'v': 14, 'ad': 5, 'c': 2, 'p': 2, 's': 1, 'b': [5, 2, 0], 'u': [1, 1, 0], 'dev': 'iPhone'}]
        return {'ok': True, 'date': '20261117', 'today': '20261117', 'rows': rows, 'roster': {EMP: ['테스트', BR, '사원'], '100200': ['미접속', BR, '사원']},
                'trend': [{'d': '202611%02d' % (4 + i), 'u': i % 5, 'am': i * 10, 'ad': i, 'q': 1} for i in range(14)],
                'report': {'to': 'kiss5586@gmail.com', 'on': None, 'last': '', 'err': ''}, 'at': 'now'}
    if fn == 'adminEmpHistory':
        return {'ok': True, 'emp': EMP, 'days': 30, 'list': [{'d': '20261117', 'f': '09:02', 'l': '20:40', 'n': 3, 'am': 62, 'v': 14, 'ad': 5, 'c': 2, 'p': 2, 's': 1, 'b': [5, 2, 0], 'u': [1, 1, 0]}]}
    if fn in ('listQuotes',):
        return []
    return {'ok': True, 'me': {'name': '테스트', 'br': BR, 'rank': '사원'}}


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


async def run():
    port = free_port()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    U = 'http://127.0.0.1:%d/%s' % (port, BASE)
    fails = []
    def ok(cond, msg):
        print(('  ✅ ' if cond else '  ❌ ') + msg)
        if not cond: fails.append(msg)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            # 삼성 · LG · 쿠쿠 (검색어는 저장소 단가 데이터의 첫 모델에서 가져옴)
            for page, label, first in [('index.html', '삼성', "window.SUB_DATA&&SUB_DATA.models?SUB_DATA.models[0][0]:''"),
                                       ('lg.html', 'LG', "window.LG_DATA&&LG_DATA.m?LG_DATA.m[0][0]:''"),
                                       ('cuckoo.html', '쿠쿠', "window.CK_DATA&&CK_DATA.m?CK_DATA.m[0][0]:''")]:
                print('■', label, BASE + page)
                ctx = await b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                async def route(r):
                    u = r.request.url
                    if u.startswith('http://127.0.0.1'):
                        await r.continue_()
                    elif 'script.google' in u:
                        d = json.loads(r.request.post_data or '{}')
                        await r.fulfill(status=200, content_type='application/json', body=json.dumps({'r': fake(d.get('fn'))}))
                    else:
                        await r.abort()
                await pg.route('**/*', route)
                await pg.add_init_script("localStorage.setItem('calcEmp','%s');sessionStorage.setItem('calcEmpS','%s');sessionStorage.setItem('calcTermsS','%s');var _d=new Date();localStorage.setItem('calcTermsD','%s|'+_d.getFullYear()+'-'+('0'+(_d.getMonth()+1)).slice(-2)+'-'+('0'+_d.getDate()).slice(-2));localStorage.setItem('calcMe',JSON.stringify({emp:'%s',name:'테스트',br:'%s',rank:'사원'}));" % (EMP, EMP, EMP, EMP, EMP, BR))
                await pg.goto(U + page + ('?brand=ss' if page == 'index.html' else ''))
                await pg.wait_for_timeout(1500)
                ok(not await pg.is_visible('#gate'), '사번으로 바로 입장')
                ok(not await pg.evaluate("performance.getEntriesByType('resource').some(function(e){return /admin\\.js/.test(e.name);})"), '직원 화면은 관리자 코드(admin.js)를 내려받지 않음')
                if await pg.is_visible('#termsPop'):
                    await pg.click('#termsOk'); await pg.wait_for_timeout(300)
                code = await pg.evaluate(first)
                ok(bool(code), '단가 데이터 읽음 (' + str(code) + ')')
                try:
                    await pg.fill('#q', code[:8]); await pg.wait_for_timeout(400)
                    await pg.click('#qList .it >> nth=0', timeout=5000)
                    await pg.wait_for_timeout(300)
                    await pg.click('#addBtn', timeout=5000); await pg.wait_for_timeout(600)
                    await pg.wait_for_timeout(400)
                    rec = await pg.is_visible('.rc-ov')
                    if await pg.evaluate('!!window.REC_PAGE'): ok(rec, '💡 추천 팝업 뜸')
                    if rec:
                        await pg.click('.rc-x'); await pg.wait_for_timeout(300)
                    for ov in ('.sc-ov .sc-ok',):
                        if await pg.is_visible(ov): await pg.click(ov)
                    big = (await pg.inner_text('#sBig')).strip()
                    ok(big not in ('', '0원'), '모델 담기 → 견적 금액 ' + big)
                except Exception as e:
                    ok(False, '모델 담기 실패: ' + str(e).split('\n')[0][:120])
                try:
                    async with pg.expect_download(timeout=20000) as dl:
                        await pg.click('#capBtn')
                    f = await dl.value
                    path = os.path.join(OUT, page.replace('.html', '') + '.png')
                    await f.save_as(path)
                    ok(os.path.getsize(path) > 20000, '📸 견적 캡처 이미지 ' + str(os.path.getsize(path) // 1024) + 'KB → ' + path)
                except Exception as e:
                    ok(False, '견적 캡처 실패: ' + str(e).split('\n')[0][:120])
                br = await pg.evaluate("typeof capBr==='function'?capBr():''")
                ok(br == '전자랜드 ' + BR, '캡처 지점명: ' + br)
                ok(not errs, '화면 오류 없음' + ('' if not errs else ': ' + ' | '.join(errs)[:300]))
                await ctx.close()
            # 관리자: 사번 입력 화면의 '⚙ 관리자' → 비밀번호 → 탭을 하나씩 모두 열기
            print('■ 관리자', BASE + 'index.html')
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/*', route)
            await pg.goto(U + 'index.html'); await pg.wait_for_timeout(1200)
            try:
                await pg.click('#gateAdm'); await pg.wait_for_selector('#admPw', timeout=5000)  # admin.js를 불러온 뒤 비밀번호 칸이 나옴
                await pg.fill('#admPw', '1234'); await pg.click('#admGo'); await pg.wait_for_timeout(1200)
                tabs = await pg.eval_on_selector_all('#admTabs .chip', 'b=>b.map(x=>x.dataset.v)')
                for t in tabs:
                    await pg.click('#admTabs .chip[data-v="%s"]' % t); await pg.wait_for_timeout(400)
                ok(len(tabs) > 5, '관리자 탭 %d개 모두 열어 봄' % len(tabs))
            except Exception as e:
                ok(False, '관리자 화면 실패: ' + str(e).split('\n')[0][:120])
            ok(not errs, '화면 오류 없음' + ('' if not errs else ': ' + ' | '.join(errs)[:300]))
            await ctx.close()
            await b.close()
    finally:
        srv.terminate()
    print('\n결과:', '모두 통과 ✅' if not fails else '%d개 실패 ❌' % len(fails))
    return 1 if fails else 0

if __name__ == '__main__':
    sys.exit(asyncio.run(run()))
