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
    var cs = wb.SheetNames.filter(function (n) { return /카드/.test(n); })[0];
    if (!res.meta.label) {   /* 파일 이름에 달이 없으면 엑셀 안의 '26년 11월 기준' 같은 문구에서 */
      wb.SheetNames.some(function (n) { var a = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }).slice(0, 3).map(function (r) { return (r || []).join(' '); }).join(' ');
        var m2 = /(\d{2,4})\s*년\s*(\d{1,2})\s*월/.exec(a); if (m2) { res.meta.label = (m2[1].length === 2 ? '20' + m2[1] : m2[1]) + '.' + ('0' + m2[2]).slice(-2); return true; } return false; });
    }
    if (cs) { try { var cards = parseCards(XLSX.utils.sheet_to_json(wb.Sheets[cs], { header: 1, raw: true, defval: null })); if (cards && cards.length) { res.cards = cards; res.meta.cards = cards.length; } } catch (e) {} }
    return res;
  }

  /* ---------- '카드 판촉' 시트 → 제휴카드 [{id,name,rank,tiers:[[실적만,기본,신규추가]],baseM,promoM,fee,ars,img,extra}] ---------- */
  var CARD_ID = { '롯데': 'lotte', '우리': 'woori', '삼성': 'samsung', '현대': 'hyundai', '신한': 'shinhan', 'KB국민': 'kb', '국민': 'kb', 'KB': 'kb', '하나': 'hana', '농협': 'nh', 'NH': 'nh', 'BC': 'bc' };
  function cellTier(v) {
    var s = String(v == null ? '' : v), u = /(\d+)\s*만/.exec(s); if (!u) return null;
    var rest = s.slice(u.index + u[0].length), a = /([\d,]+)\s*원/.exec(rest);
    return [+u[1], a ? +a[1].replace(/,/g, '') : 0];
  }
  function parseCards(aoa) {
    var h = -1;
    for (var i = 0; i < Math.min(aoa.length, 12); i++) if (str((aoa[i] || [])[0]) === '구분') { h = i; break; }
    if (h < 0) return null;
    var head = aoa[h], cards = [], cols = [];
    head.forEach(function (v, k) { if (k === 0 || !str(v)) return;
      var t = String(v), m = /\[(.+?)\]/.exec(t), nm = str(t.replace(/\[.+?\]/, ''));
      cols.push(k); cards.push({ id: (m && CARD_ID[m[1]]) || ('c' + k), short: m ? m[1] : nm, name: m && nm.indexOf(m[1].replace(/KB/, '')) < 0 ? m[1] + ' ' + nm : nm, rank: 0, base: [], promo: [], baseM: 60, promoM: 60, fee: '', ars: '', extra: '' }); });
    var mode = '';
    for (var j = h + 1; j < aoa.length; j++) {
      var r = aoa[j] || [], lab = str(r[0]).replace(/\s/g, '');
      if (/^▶\s*기본/.test(str(r[0]))) { mode = 'b'; continue; }
      if (/^▶\s*신규/.test(str(r[0]))) { mode = 'p'; continue; }
      if (/^▶/.test(str(r[0]))) { mode = ''; continue; }
      if (lab.indexOf('기본') === 0) mode = 'b'; else if (lab.indexOf('신규') === 0) mode = 'p'; else if (lab.indexOf('月') === 0 || lab.indexOf('합계') >= 0) mode = '';
      if (lab === '혜택기간') { cols.forEach(function (k, i) { var m2 = /(\d+)\s*개월/.exec(str(r[k])); if (m2) cards[i].baseM = cards[i].promoM = +m2[1]; }); mode = ''; continue; }
      if (lab === '연회비') { cols.forEach(function (k, i) { cards[i].fee = str(r[k]).replace(/,000원$/, '천원').replace(/^(\d+)천원$/, function (_, x) { return (+x / 10) + '만원'; }); }); continue; }
      if (lab.indexOf('ARS') === 0) { cols.forEach(function (k, i) { cards[i].ars = str(r[k]); }); continue; }
      if (mode) cols.forEach(function (k, i) { var t = cellTier(r[k]); if (t) { cards[i][mode === 'b' ? 'base' : 'promo'].push(t); if (mode === 'p' && /최대/.test(String(r[k]))) cards[i].mx = 1; } });
    }
    /* 위쪽 안내 : '★ 1순위 : 롯데카드 …' · 그 밖의 줄은 이름이 들어간 카드의 참고 문구 */
    for (var q = 0; q < h; q++) String((aoa[q] || [])[0] || '').split('\n').forEach(function (ln) {
      ln = str(ln); if (!ln) return;
      var rk = /★\s*(\d+)\s*순위\s*:\s*([^\s—-]+)/.exec(ln);
      if (rk) { cards.forEach(function (c) { if (rk[2].indexOf(c.short) === 0) c.rank = +rk[1]; }); return; }
      cards.forEach(function (c) { if (ln.indexOf(c.name) >= 0) c.extra = ln.replace(/^\s*\d{2}\.\d{2}\.\d{2}\s*~\s*/, function (m0) { return m0; }); });
    });
    return cards.filter(function (c) { return c.base.length; }).map(function (c) {
      var tiers = c.base.map(function (b) { var p = c.promo.filter(function (x) { return x[0] === b[0]; })[0]; return [b[0], b[1], p ? p[1] : 0]; });
      return { id: c.id, name: c.name, rank: c.rank, tiers: tiers, baseM: c.baseM, promoM: tiers.some(function (t) { return t[2]; }) ? c.promoM : 0, fee: c.fee, ars: c.ars, img: c.id, extra: c.extra || (c.mx ? '신규발급 추가할인은 \'최대\' 금액이에요' : '') };
    });
  }

  /* ---------- 다품목 캐시백 가이드 엑셀 → { meta, label, dbl:[[시작,끝]], dblEx:[품목], cards, lump:[[품목,모델,캐시백]], subRaw:[[전자랜드 코드,캐시백]] } ---------- */
  function buildMulti(XLSX, wb, fileName) {
    var aoaOf = function (n) { return XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }); };
    var notice = wb.SheetNames.filter(function (n) { return /공지|요약/.test(n); })[0], list = wb.SheetNames.filter(function (n) { return /모델/.test(n); })[0];
    if (!list) list = wb.SheetNames.filter(function (n) { return n !== notice; })[0];
    if (!list) throw new Error("'모델리스트' 시트를 찾지 못했어요");
    var text = notice ? aoaOf(notice).map(function (r) { return (r || []).map(function (v) { return v == null ? '' : String(v); }).join('\t'); }).join('\n') : '';
    var ym = /(\d{4})\s*년\s*(\d{1,2})\s*월/.exec(text) || /(\d{4})\.(\d{1,2})/.exec(text + ' ' + (fileName || '')) || /(\d{2})\.(\d{1,2})/.exec(fileName || '');
    var Y = ym ? (+ym[1] < 100 ? 2000 + (+ym[1]) : +ym[1]) : new Date().getFullYear(), M = ym ? +ym[2] : new Date().getMonth() + 1;
    var ds = function (m, d) { var y = Y; if (m - M > 6) y--; else if (M - m > 6) y++; return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); };
    var dbl = [], line = function (key) { var L = text.split('\n').filter(function (l) { return l.replace(/\s/g, '').indexOf(key) >= 0; })[0] || ''; return L; };
    var dl = text.slice(Math.max(0, text.indexOf('더블기간')), text.indexOf('더블 제외') > 0 ? text.indexOf('더블 제외') : undefined);
    var re = /(\d{1,2})\/(\d{1,2})\s*~\s*(?:(\d{1,2})\/)?(\d{1,2})/g, m;
    while ((m = re.exec(dl))) { var sm = +m[1], em = m[3] ? +m[3] : sm; dbl.push([ds(sm, +m[2]), ds(em, +m[4])]); }
    var ex = line('더블제외').split('\t').slice(1).join(' ').replace(/ㆍ/g, '').replace(/\(.*?\)/g, '');
    var dblEx = ex.split(/[,，·]/).map(function (x) { return str(x); }).filter(Boolean);
    var cl = /\(([^)]+)\)/.exec(line('대상카드')), cards = cl ? cl[1].replace(/ㆍ/g, ' · ') : '';
    var aoa = aoaOf(list), h = -1, ia = [];
    for (var i = 0; i < Math.min(aoa.length, 12); i++) { var r = aoa[i] || [], k = []; r.forEach(function (v, c) { if (str(v) === '적용 모델') k.push(c); }); if (k.length) { h = i; ia = k; break; } }
    if (h < 0) throw new Error("'적용 모델' 제목 줄을 찾지 못했어요");
    var lump = [], subRaw = [], seen = {}, cat = '';
    for (var j = h + 1; j < aoa.length; j++) {
      var row = aoa[j] || [];
      if (ia.length > 1 || true) {   // 왼쪽 표 = 일시불
        var c0 = ia[0];
        if (str(row[c0 - 1])) cat = str(row[c0 - 1]);
        var nm = str(row[c0]), amt = num(row[c0 + 1]);
        if (nm && amt && !seen[nm]) { seen[nm] = 1; lump.push([cat, nm, amt]); }
      }
      if (ia.length > 1) { var c1 = ia[1], sc = str(row[c1]), sa = num(row[c1 + 1]); if (sc && sa) subRaw.push([sc, sa]); }
    }
    if (!lump.length && !subRaw.length) throw new Error('캐시백 모델을 하나도 읽지 못했어요');
    var label = Y + '.' + ('0' + M).slice(-2);
    return { meta: { label: label, file: fileName || '', lump: lump.length, sub: subRaw.length, dbl: dbl.length }, label: label, dbl: dbl, dblEx: dblEx, cards: cards, lump: lump, subRaw: subRaw };
  }

  var api = { sheetChoices: sheetChoices, parse: parse, build: build, baseOf: baseOf, parseCards: parseCards, buildMulti: buildMulti };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CKParse = api;
})(this);
