#!/usr/bin/env python3
"""테스트 화면(test/) ↔ 정식 화면(루트) 옮기기

  python3 tools/promote.py check     # 테스트와 정식이 '테스트 표시'만 빼고 같은지 확인
  python3 tools/promote.py promote   # 테스트 → 정식 (확인 끝난 테스트를 정식에 적용)
  python3 tools/promote.py totest    # 정식 → 테스트 (정식에서 바로 고친 걸 테스트에도 맞추기)

테스트 화면에만 있는 것 (정식으로 옮길 때 빼고, 테스트로 만들 때 넣음)
  - 검색 제외(noindex) · 노란 '테스트 버전' 띠 · window.TEST_MODE
  - 공용 파일 경로 ../ (manifest · 아이콘 · 정수기 관리 사진)
  - 서비스워커 등록 안 함
"""
import sys, os, re, filecmp, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ['index.html', 'lg.html', 'cuckoo.html']
# 테스트 폴더에 같은 이름으로 따로 두는 파일 (그대로 복사)
FILES = ['common.js', 'ck-parse.js', 'lg-parse.js', 'config.js',
         'data/price.js', 'data/promo.js', 'data/lg.js', 'data/lg-img.js',
         'data/ck.js', 'data/ck-img.js', 'data/ck-multi.js', 'data/ss-rank.js', 'data/lg-rank.js']

SW_PROD = "navigator.serviceWorker.register('sw.js').catch(function(){});"
SW_TEST = "Promise.reject().catch(function(){});"
# (정식, 테스트) 경로 쌍
PATHS = [('href="manifest.webmanifest"', 'href="../manifest.webmanifest"'),
         ('href="icons/icon-192.png"', 'href="../icons/icon-192.png"'),
         ("var u='care/care_", "var u='../care/care_")]


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='') as f:
        f.write(s)


def test_block(s):
    """테스트 파일 머리의 테스트 전용 블록(noindex 줄 ~ TEST_MODE 스크립트 다음 빈 줄)"""
    i = s.find('<meta name="robots" content="noindex">\n')
    if i < 0:
        return None
    j = s.index('</script>\n', i) + len('</script>\n')
    if s[j:j + 1] == '\n':
        j += 1
    return i, j


def to_prod(s):
    b = test_block(s)
    if not b:
        raise SystemExit('테스트 표시 블록(noindex · TEST_MODE)을 찾지 못했어요')
    s = s[:b[0]] + s[b[1]:]
    for prod, test in PATHS:
        s = s.replace(test, prod)
    s = s.replace(SW_TEST, SW_PROD)
    assert 'TEST_MODE=true' not in s
    return s


def to_test(prod_s, test_s):
    """정식 파일에 테스트 표시를 다시 넣음 (테스트 블록 문구는 지금 테스트 파일 것을 그대로 씀)"""
    b = test_block(test_s)
    block = test_s[b[0]:b[1]]
    # 정식 파일에서 테스트 블록이 들어갈 자리: 지금 테스트 파일에서 블록 바로 앞에 오는 줄 다음
    anchor = test_s[:b[0]].rsplit('\n', 2)[-2] + '\n'
    k = prod_s.index(anchor) + len(anchor)
    s = prod_s[:k] + block + prod_s[k:]
    for prod, test in PATHS:
        s = s.replace(prod, test)
    s = s.replace(SW_PROD, SW_TEST)
    return s


def check():
    bad = 0
    for p in PAGES:
        if to_prod(read('test/' + p)) != read(p):
            bad += 1
            print('❌ 다름:', p, '(테스트에만 있거나 정식에만 있는 수정이 있어요)')
        else:
            print('✅ 같음:', p)
    for f in FILES:
        a, b = os.path.join(ROOT, f), os.path.join(ROOT, 'test', f)
        if not os.path.exists(a) and not os.path.exists(b):
            continue
        if not (os.path.exists(a) and os.path.exists(b) and filecmp.cmp(a, b, shallow=False)):
            bad += 1
            print('❌ 다름:', f)
        else:
            print('✅ 같음:', f)
    return bad


def promote():
    for p in PAGES:
        write(p, to_prod(read('test/' + p)))
    for f in FILES:
        b = os.path.join(ROOT, 'test', f)
        if os.path.exists(b):
            shutil.copyfile(b, os.path.join(ROOT, f))
    print('테스트 → 정식 적용 완료')


def totest():
    for p in PAGES:
        write('test/' + p, to_test(read(p), read('test/' + p)))
    for f in FILES:
        a = os.path.join(ROOT, f)
        if os.path.exists(a):
            os.makedirs(os.path.dirname(os.path.join(ROOT, 'test', f)), exist_ok=True)
            shutil.copyfile(a, os.path.join(ROOT, 'test', f))
    print('정식 → 테스트 맞춤 완료')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'check':
        sys.exit(1 if check() else 0)
    elif cmd == 'promote':
        promote(); sys.exit(1 if check() else 0)
    elif cmd == 'totest':
        totest(); sys.exit(1 if check() else 0)
    else:
        print(__doc__)
