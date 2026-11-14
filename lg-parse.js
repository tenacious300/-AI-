/* LG 가전구독 단가표 · 활성화 요약 엑셀 → 계산기 데이터 변환 (브라우저 관리자 업로드 · 기본 데이터 생성 공용)
   - 단가표 시트 : '전자랜드_MMDD'  (제품군 · 모델명 · 케어십형태 · 케어십구분 · 방문주기 · 계약기간 · 결합유형 · 할인율 · 소상공인구분 · 기본요금 · 결합할인 · 활성화 · 최종요금 · 선납 …)
   - 활성화 시트 : "구독 활성화 요약('YY년 M월 N주말)"  (모델명 · 활성화 월중/추가(K원) · 기간 · 유형 · 비고)
*/
(function (root) {
  var PRICE_RE = /^전자랜드_(\d{4})$/;
  var ACT_RE = /^구독 활성화 요약\('(\d+)년\s*(\d+)월\s*([\d,]+)주말\)$/;

  function str(v) { return v == null ? '' : String(v).trim(); }
  function num(v) { if (typeof v === 'number') return v; var n = +String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''); return isNaN(n) ? 0 : n; }

  /** 시트 목록에서 단가표 · 활성화 시트 후보와 기본 선택값 */
  function sheetChoices(names, today) {
    var t = today || new Date(), md = ('0' + (t.getMonth() + 1)).slice(-2) + ('0' + t.getDate()).slice(-2);
    var price = names.filter(function (n) { return PRICE_RE.test(n); });
    var ps = price.slice().sort(function (a, b) { return a < b ? 1 : -1; });
    var pDef = ps.filter(function (n) { return n.slice(-4) <= md; })[0] || ps[0] || '';
    var act = names.filter(function (n) { return ACT_RE.test(n); });
    var key = function (n) { var m = ACT_RE.exec(n); return (+m[1]) * 10000 + (+m[2]) * 100 + Math.max.apply(null, m[3].split(',').map(Number)); };
    var as = act.slice().sort(function (a, b) { return key(b) - key(a); });
    return { price: ps, priceDef: pDef, act: as, actDef: as[0] || '' };
  }

  /** '10/29~11/16', '11/1~31', '11/13' → {s:'2026-10-29', e:'2026-11-16'} */
  function parsePeriod(txt, year) {
    txt = str(txt).replace(/\s/g, '');
    var m = /^(\d{1,2})\/(\d{1,2})(?:~(?:(\d{1,2})\/)?(\d{1,2}))?$/.exec(txt);
    if (!m) return null;
    var sm = +m[1], sd = +m[2], em = m[3] ? +m[3] : sm, ed = m[4] ? +m[4] : sd;
    var ey = em < sm ? year + 1 : year;
    var last = new Date(ey, em, 0).getDate(); if (ed > last) ed = last;
    var f = function (y, mo, d) { return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2); };
    return { s: f(year, sm, sd), e: f(ey, em, ed) };
  }

  function aoaOf(XLSX, wb, name) { return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }); }

  function parsePrice(aoa) {
    var h = -1, col = {};
    for (var i = 0; i < Math.min(aoa.length, 15); i++) {
      var r = aoa[i] || [];
      if (r.some(function (v) { return str(v) === '모델명'; }) && r.some(function (v) { return str(v) === '최종요금'; })) { h = i; break; }
    }
    if (h < 0) throw new Error('단가표 시트에서 \'모델명\' · \'최종요금\' 제목 줄을 찾지 못했어요');
    aoa[h].forEach(function (v, k) { var s = str(v).replace(/\s+/g, ''); if (s && col[s] === undefined) col[s] = k; });
    var need = ['제품군', '모델명', '케어십형태', '케어십구분', '방문주기', '계약기간', '결합유형', '기본요금', '최종요금'];
    need.forEach(function (n) { if (col[n] === undefined) throw new Error('단가표에 \'' + n + '\' 열이 없어요'); });
    var C = function (n) { return col[n] === undefined ? -1 : col[n]; };
    var cRate = C('할인율'), cSb = C('소상공인구분'), cBd = C('결합할인'), cAct = C('활성화'),
      cList = C('기준가'), cPre = C('선납가능정률'), cPmin = C('선납정액최소금액'), cPmax = C('선납정액최대금액'), cNote = C('비고');

    var dict = { cats: [], ct: [], cs: [], cy: [], bd: ['결합없음', '신규결합', '기존결합', '소상공인'], sb: ['', '1대', '2대이상', '4대이상'], pre: [''], notes: [''] };
    var idx = function (arr, v) { var k = arr.indexOf(v); if (k < 0) { arr.push(v); k = arr.length - 1; } return k; };
    var models = {}, order = [], n = 0;
    for (var j = h + 1; j < aoa.length; j++) {
      var r2 = aoa[j]; if (!r2) continue;
      var code = str(r2[col['모델명']]); if (!code) continue;
      var term = num(r2[col['계약기간']]), fin = num(r2[col['최종요금']]);
      if (!term || !fin) continue;
      var cat = str(r2[col['제품군']]);
      if (!models[code]) { models[code] = [code, idx(dict.cats, cat), [], 0]; order.push(code); }
      if (cList >= 0 && !models[code][3]) models[code][3] = num(r2[cList]);
      var g = function (k) { return k < 0 ? null : r2[k]; };
      models[code][2].push([
        idx(dict.ct, str(r2[col['케어십형태']])),
        idx(dict.cs, str(r2[col['케어십구분']])),
        idx(dict.cy, str(r2[col['방문주기']])),
        term,
        idx(dict.bd, str(r2[col['결합유형']]) || '결합없음'),
        idx(dict.sb, str(g(cSb))),
        Math.round(num(g(cRate)) * (String(g(cRate)).indexOf('%') >= 0 || num(g(cRate)) >= 1 ? 1 : 100)),
        num(r2[col['기본요금']]),
        num(g(cBd)),
        num(g(cAct)),
        fin,
        idx(dict.pre, str(g(cPre)).replace(/\s/g, '')),
        num(g(cPmin)),
        num(g(cPmax)),
        idx(dict.notes, str(g(cNote)))
      ]);
      n++;
    }
    dict.m = order.map(function (c) { return models[c]; });
    dict.rows = n;
    return dict;
  }

  function parseAct(aoa, year) {
    var h = -1, mc = -1;
    for (var i = 0; i < Math.min(aoa.length, 15); i++) {
      var r = aoa[i] || [];
      for (var k = 0; k < r.length; k++) if (str(r[k]) === '모델명') { h = i; mc = k; break; }
      if (h >= 0) break;
    }
    if (h < 0) throw new Error('활성화 시트에서 \'모델명\' 제목 줄을 찾지 못했어요');
    var start = h + 1;
    for (var s = h + 1; s < Math.min(aoa.length, h + 6); s++) { if (aoa[s] && str(aoa[s][mc]) === '필터') { start = s + 1; break; } }
    var out = {}, cat = '', sub = '';
    for (var j = start; j < aoa.length; j++) {
      var r2 = aoa[j]; if (!r2) continue;
      if (str(r2[mc - 2])) cat = str(r2[mc - 2]);
      if (str(r2[mc - 1])) sub = str(r2[mc - 1]);
      var code = str(r2[mc]); if (!code || !/[A-Z0-9]/.test(code)) continue;
      var mid = num(r2[mc + 1]), add = num(r2[mc + 2]);
      var per = parsePeriod(r2[mc + 3], year);
      var t1 = str(r2[mc + 5]), t2 = str(r2[mc + 6]);
      var type = [t2, t1].filter(function (t) { return t === '요금인하' || t === '모상'; })[0] || '';
      var note = str(r2[mc + 7]); if (note === '-' || note === '0') note = '';
      if (!mid && !add && !note) continue;
      out[code] = [mid, add, per ? per.s : '', per ? per.e : '', type, note, cat + (sub ? ' · ' + sub : '')];
    }
    return out;
  }

  /** wb(SheetJS) → 계산기 데이터 */
  function build(XLSX, wb, priceSheet, actSheet) {
    var data = parsePrice(aoaOf(XLSX, wb, priceSheet));
    var am = ACT_RE.exec(actSheet || ''), year = am ? 2000 + (+am[1]) : new Date().getFullYear();
    data.act = actSheet ? parseAct(aoaOf(XLSX, wb, actSheet), year) : {};
    data.meta = { price: priceSheet, act: actSheet || '', at: new Date().toISOString().slice(0, 10) };
    return data;
  }

  var api = { sheetChoices: sheetChoices, build: build, parsePeriod: parsePeriod };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LGParse = api;
})(this);
