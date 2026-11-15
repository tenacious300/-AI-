/* 쿠쿠 구독 엑셀 → 계산기 데이터 변환 (브라우저 관리자 업로드 · 기본 데이터 생성 공용)
   - 시트 : '구독 모델별 내용'  (품목군 · 모델명 · 관리내용 · 관리상세 · 전자랜드 상품코드 · ERP 상품명 · 약정/소유권 · 약정 개월 수 · 약정 할인가 · 구독료 할인 개월 수 · 패키지할인 · 다품목 캐시백 …)
   - 수당 · 수수료 · SIM가 · 시상 같은 판매사 정보는 읽지 않아요.
   결과 : { meta, cats:[], cares:[], dets:[], own:[], m:[[모델, 품목idx, [row…]]] }
   row  : [관리유형idx, 관리상세idx, 계약월, 약정할인가, 반값개월, 패키지할인(+원 / −%), 다품목캐시백, 소유권idx, ERP 상품명, 전자랜드 상품코드]
*/
(function (root) {
  var SHEET_RE = /구독\s*모델별/;
  function str(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
  function num(v) { if (typeof v === 'number') return v; var n = +String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''); return isNaN(n) ? 0 : n; }

  function sheetChoices(names) {
    var s = names.filter(function (n) { return SHEET_RE.test(n); });
    return { list: s.length ? s : names.slice(), def: s[0] || names[0] || '' };
  }

  /** ERP 상품명 → 모델 코드 (예: 'CP-AMS100(S)(E/60M/4C/할인/6M반값)' → 'CP-AMS100') */
  function baseOf(erp) { return str(erp).split('(')[0].trim(); }
  /** '방문관리\n(4개월)' → '방문관리 (4개월)' · 비어 있으면 ERP의 '12C' 로 만들기 */
  function careOf(v, erp) {
    var s = str(v).replace(/\s*\(\s*/g, ' (').replace(/\s*\)\s*/g, ') ').trim();
    if (s && s !== '-') return s;
    var m = /\/(\d+)C\b/.exec(erp);
    return m ? '방문관리 (' + m[1] + '개월)' : '기본';
  }
  function pkgOf(v) {
    var s = str(v);
    if (!s || /^x$/i.test(s)) return 0;
    var p = /(\d+)\s*%/.exec(s); if (p) return -(+p[1]);
    return num(s);
  }

  function parse(aoa, srcName) {
    var h = -1, col = {};
    for (var i = 0; i < Math.min(aoa.length, 15); i++) {
      var r = aoa[i] || [];
      if (r.some(function (v) { return str(v) === 'ERP 상품명'; }) && r.some(function (v) { return str(v) === '약정/소유권'; })) { h = i; break; }
    }
    if (h < 0) throw new Error("'ERP 상품명' · '약정/소유권' 제목 줄을 찾지 못했어요");
    var head = aoa[h], sub = aoa[h + 1] || [];
    /* 같은 이름 열이 두 번 나오면(왼쪽 상품코드 · ERP 상품명 복사본) 오른쪽 표 기준으로 */
    var idxs = function (name) { var o = []; head.forEach(function (v, k) { if (str(v).replace(/\s/g, '') === name) o.push(k); }); return o; };
    var cOwn = idxs('약정/소유권')[0];
    var pick = function (name) { var L = idxs(name); var r = L.filter(function (k) { return k < cOwn; }); return r.length ? r[r.length - 1] : (L[0] === undefined ? -1 : L[0]); };
    col.cat = pick('품목군'); col.model = pick('모델명'); col.care = pick('관리내용'); col.det = pick('관리상세');
    col.code = pick('전자랜드상품코드'); col.erp = pick('ERP상품명'); col.own = cOwn;
    /* '약정' 아래 '개월 수' · '할인가', '구독료 할인' 아래 '개월 수', '다품목' 아래 '캐시백' */
    var after = function (name) { var L = idxs(name); return L.length ? L[0] : -1; };
    var cY = after('약정');
    col.term = cY; col.fee = cY + 1;
    if (str(sub[cY]).indexOf('개월') < 0) { /* 아래 줄 제목으로 다시 찾기 */
      sub.forEach(function (v, k) { if (k > cOwn && str(v) === '개월 수' && col.term === cY) { col.term = k; col.fee = k + 1; } });
    }
    col.half = after('구독료할인'); col.pkg = after('패키지할인'); col.cb = after('다품목');
    ['cat', 'model', 'erp', 'own', 'term', 'fee'].forEach(function (k) { if (col[k] < 0) throw new Error('엑셀에서 \'' + k + '\' 열을 찾지 못했어요'); });

    var dict = { cats: [], cares: [], dets: [''], own: [] };
    var idx = function (arr, v) { var k = arr.indexOf(v); if (k < 0) { arr.push(v); k = arr.length - 1; } return k; };
    var models = {}, order = [], n = 0, cat = '', lastModel = '', care = '', det = '';
    for (var j = h + 2; j < aoa.length; j++) {
      var r2 = aoa[j]; if (!r2) continue;
      var erp = str(r2[col.erp]); if (!erp) continue;
      var term = num(r2[col.term]), fee = num(r2[col.fee]);
      if (!term || !fee) continue;
      if (str(r2[col.cat])) cat = str(r2[col.cat]);
      var mdl = str(r2[col.model]);
      if (mdl && mdl !== lastModel) { lastModel = mdl; care = ''; det = ''; }
      if (col.care >= 0 && str(r2[col.care])) care = str(r2[col.care]);
      if (col.det >= 0 && str(r2[col.det])) det = String(r2[col.det]).trim();
      var code = baseOf(erp);
      if (!models[code]) { models[code] = [code, idx(dict.cats, cat), []]; order.push(code); }
      var hv = col.half >= 0 ? str(r2[col.half]) : '';
      models[code][2].push([
        idx(dict.cares, careOf(care, erp)),
        det ? idx(dict.dets, det) : 0,
        term,
        fee,
        /^\d+$/.test(hv) ? +hv : 0,
        col.pkg >= 0 ? pkgOf(r2[col.pkg]) : 0,
        col.cb >= 0 ? num(r2[col.cb]) : 0,
        idx(dict.own, str(r2[col.own])),
        erp,
        col.code >= 0 ? str(r2[col.code]) : ''
      ]);
      n++;
    }
    if (!n) throw new Error('요금 줄을 하나도 읽지 못했어요');
    return { meta: { src: srcName || '', models: order.length, rows: n }, cats: dict.cats, cares: dict.cares, dets: dict.dets, own: dict.own, m: order.map(function (c) { return models[c]; }), rows: n };
  }

  function build(XLSX, wb, sheetName, fileName) {
    var name = sheetName || sheetChoices(wb.SheetNames).def;
    var aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
    var res = parse(aoa, name);
    var m = /(\d{4})\.(\d{1,2})/.exec(fileName || '') || /(\d{2})년\s*(\d{1,2})월/.exec(fileName || '');
    res.meta.label = m ? (m[1].length === 2 ? '20' + m[1] : m[1]) + '.' + ('0' + m[2]).slice(-2) : '';
    res.meta.file = fileName || '';
    return res;
  }

  var api = { sheetChoices: sheetChoices, parse: parse, build: build, baseOf: baseOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CKParse = api;
})(this);
