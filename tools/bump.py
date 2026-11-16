#!/usr/bin/env python3
"""버전업: 삼성 · LG · 쿠쿠 화면(정식 · 테스트 6개 파일)의 버전 번호와 수정 내역을 한 번에 바꿔요.

  python3 tools/bump.py v8.50 "📸 바뀐 점 1" "🧾 바뀐 점 2"
  python3 tools/bump.py next "바뀐 점"        # 지금 버전에서 0.01 올림 (v8.49 → v8.50)

- 버전 번호(var VERSION)는 화면이 새 버전을 알아채는 데 쓰여서 각 화면 파일에 그대로 둬요.
- 수정 내역(CHANGELOG)은 삼성 화면(index.html)에만 있어요. 맨 위에 한 줄 추가돼요.
- 날짜는 오늘(한국 시간)로 들어가요.
"""
import sys, os, re, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ['index.html', 'lg.html', 'cuckoo.html', 'test/index.html', 'test/lg.html', 'test/cuckoo.html']


def jsq(t):
    return t.replace('\\', '\\\\').replace("'", "\\'")


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    ver, items = sys.argv[1], sys.argv[2:]
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
    cur = re.search(r"var VERSION='(v[0-9.]+)'", open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()).group(1)
    if ver == 'next':
        ver = 'v%.2f' % (float(cur[1:]) + 0.01)
    if not re.fullmatch(r'v\d+\.\d+', ver):
        sys.exit('버전은 v8.50 처럼 써 주세요')
    md, ymd = '%d.%d' % (now.month, now.day), now.strftime('%Y.%m.%d')
    line = "  ['%s','%s',[%s]],\n" % (ver, md, ','.join("'" + jsq(t) + "'" for t in items))
    for f in FILES:
        p = os.path.join(ROOT, f)
        s = open(p, encoding='utf-8').read()
        s, n = re.subn(r"var VERSION='v[0-9.]+'", "var VERSION='%s'" % ver, s, count=1)
        assert n == 1, f
        s = re.sub(r"VER_DATE='[0-9.]+'", "VER_DATE='%s'" % ymd, s, count=1)
        if f.endswith('index.html'):
            if "  ['%s'," % ver in s:
                s = s.replace(re.search(r"  \['%s',.*\n" % re.escape(ver), s).group(0), line, 1)  # 같은 버전이면 내역 교체
            else:
                s = s.replace('var CHANGELOG=[\n', 'var CHANGELOG=[\n' + line, 1)
        open(p, 'w', encoding='utf-8', newline='').write(s)
    print('%s → %s (%s) · %d개 파일' % (cur, ver, md, len(FILES)))


if __name__ == '__main__':
    main()
