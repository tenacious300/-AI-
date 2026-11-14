// 관리자 비밀번호: 공개 저장소라 코드에 적지 않고 Apps Script '스크립트 속성'(ADMIN_PW)에만 저장
var ADMIN_PW = PropertiesService.getScriptProperties().getProperty('ADMIN_PW') || ('\u0000' + Utilities.getUuid());
var ONLINE_SEC = 180;
var LONG_IDLE_MIN = 30;             // 이 시간(분) 넘게 조작이 없으면 접속자 수에서 제외 (목록에는 💤로 표시)              // 마지막 신호 후 이 시간(초) 안이면 '접속 중'으로 계산 (신호 간격 75초)
var TZ = 'Asia/Seoul';
var CARE_FOLDER_NAME = '삼성AI구독_케어가이드';   // 구글 드라이브에 올린 케어 가이드 이미지 폴더 이름

var NEW_SITE_URL = 'https://tenacious300.github.io/-AI-/';   // 계산기 새 주소 (깃허브)

/** 예전 주소로 접속하면 깃허브 새 주소로 자동 이동 (API는 doPost에서 계속 동작) */
function doGet() {
  var html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<base target="_top"><style>body{margin:0;font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:#0f1d45;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px;box-sizing:border-box}' +
    '.b{background:#fff;color:#111827;border-radius:20px;padding:28px 22px;max-width:380px;width:100%}h2{margin:0 0 8px;font-size:20px}p{color:#5f6b7c;font-size:14px;margin:0 0 18px;line-height:1.6}' +
    'a.btn{display:block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:800;border-radius:12px;padding:14px;font-size:16px}small{display:block;margin-top:12px;color:#94a3b8;font-size:12px;word-break:break-all}</style></head><body>' +
    '<div class="b"><h2>계산기 주소가 바뀌었어요</h2><p>잠시 후 새 주소로 이동해요.<br>이동하지 않으면 아래 버튼을 눌러주세요.<br>새 주소를 즐겨찾기에 추가해 주세요.</p>' +
    '<a class="btn" href="' + NEW_SITE_URL + '" target="_top">새 주소로 이동하기 →</a><small>' + NEW_SITE_URL + '</small></div>' +
    '<script>setTimeout(function(){try{window.top.location.href="' + NEW_SITE_URL.replace(/\//g, '\\/') + '";}catch(e){}},800);</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('삼성 AI 구독 계산기 · 새 주소')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 깃허브(GitHub Pages) 화면에서 호출하는 API 창구 */
var API_FUNCS = {
  heartbeat: heartbeat, logEvent: logEvent, getData: getData, getCareList: getCareList, getCareImage: getCareImage,
  saveQuote: saveQuote, listQuotes: listQuotes, deleteQuote: deleteQuote,
  adminStats: adminStats, adminDataInfo: adminDataInfo, adminSaveData: adminSaveData, adminResetData: adminResetData,
  adminListQuotes: adminListQuotes, adminDeleteQuote: adminDeleteQuote,
  checkEmp: checkEmp, adminRoster: adminRoster, adminSaveRoster: adminSaveRoster, adminRosterMode: adminRosterMode, adminRosterEx: adminRosterEx,
  getBest: getBest, adminBest: adminBest, adminFeatures: adminFeatures, adminSetMinVer: adminSetMinVer,
  adminBlock: adminBlock, adminUnblock: adminUnblock, adminSendMsg: adminSendMsg,
  getNotice: getNotice, ackNotice: ackNotice, adminNotice: adminNotice, adminPostNotice: adminPostNotice, adminEditNotice: adminEditNotice, adminClearNotice: adminClearNotice
};
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    var fn = API_FUNCS[req.fn];
    if (!fn) out = { __err: 'unknown function' };
    else out = { r: fn(req.arg) };
  } catch (err) {
    out = { __err: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** 업로드된 단가표/판촉 원본 (깃허브 화면이 받아감) */
function getData(kind) {
  kind = kind === 'promo' ? 'promo' : 'price';
  var t = readDataFile_(kind);
  return t ? JSON.parse(t) : null;
}

/** 업로드 데이터 버전 (변경 시각) — 없으면 '' */
function dataVersion_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('dv');
  if (c) return JSON.parse(c);
  var dv = { price: '', promo: '' }, folder = dataFolder_();
  ['price', 'promo'].forEach(function (k) {
    var it = folder.getFilesByName(k + '.json');
    if (it.hasNext()) dv[k] = String(it.next().getLastUpdated().getTime());
  });
  cache.put('dv', JSON.stringify(dv), 21600);
  return dv;
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function cleanEmp_(v) {
  return String(v || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 15).toUpperCase();
}

function today_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyyMMdd');
}

function readPresence_(cache) {
  var raw = cache.get('presence');
  var map = raw ? JSON.parse(raw) : {};
  var now = Date.now(), out = {};
  Object.keys(map).forEach(function (k) {
    if (now - map[k].last < ONLINE_SEC * 1000) out[k] = map[k];
  });
  return out;
}

function idleOf_(s) { var m = /^idle:(\d+)/.exec(s && s.act || ''); return m ? Number(m[1]) : 0; }
function activeCount_(map) { return Object.keys(map).filter(function (k) { return idleOf_(map[k]) < LONG_IDLE_MIN; }).length; }

/** 직원별 오늘 활동 (실사용 초 · 조회 · 담기 · 캡처) - 캐시에 누적 */
function uaAdd_(cache, emp, sec, ev, fu) {
  if (!emp) return;
  var k = 'ua_' + today_(), ua = JSON.parse(cache.get(k) || '{}'), a = ua[emp] || [0, 0, 0, 0];
  a[0] += Math.max(0, Math.round(sec));
  (ev || []).forEach(function (e) { if (e && e[1] === 'view') a[1]++; else if (e && e[1] === 'add') a[2]++; });
  if (fu && fu.capture) a[3] += Math.min(50, Number(fu.capture) || 0);
  ua[emp] = a;
  cache.put(k, JSON.stringify(ua), 21600);
}

/** 관리자 → 직원 개별 메시지 (다음 접속 신호 때 화면에 뜸) */
function adminSendMsg(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var emp = cleanEmp_(arg.emp), text = cleanStr_(arg.text, 300);
  if (!emp || !text) return { ok: false };
  var m = { id: Utilities.getUuid().slice(0, 8), text: text, at: Utilities.formatDate(new Date(), TZ, 'HH:mm') };
  CacheService.getScriptCache().put('msg_' + emp, JSON.stringify(m), 21600);
  return { ok: true, id: m.id };
}

/** 사용자 화면에서 75초마다 호출: 접속 상태 기록 + 현재 접속자 수 반환 (동시 접속 대비 경량화) */
function heartbeat(info) {
  info = info || {};
  var sid = String(info.sid || '').slice(0, 40);
  if (!sid) return { online: 0 };
  if (isBlocked_(info.emp, info.did)) return { blocked: true };
  if (!rosterAllowed_(info.emp)) { nrLog_(info.emp, 'b', info); return { blocked: true, reason: 'roster' }; }
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) {
    // 혼잡할 때는 기록을 건너뛰고 마지막 접속자 수만 돌려줌
    return { online: Number(cache.get('onlineN') || 0) || -1, nid: noticeId_() };
  }
  var online = 0, isFirst = !!info.first, d = today_();
  try {
    var map = readPresence_(cache);
    var now = Date.now();
    var prev = map[sid] || { start: now };
    try { uaAdd_(cache, cleanEmp_(info.emp), (prev.last && !info.away) ? Math.min(now - prev.last, 90000) / 1000 : 0, info.ev, info.fu); } catch (e) {}
    map[sid] = {
      start: prev.start,
      last: now,
      dev: String(info.dev || '').slice(0, 30),
      cart: Number(info.cart) || 0,
      models: String(info.models || '').slice(0, 120),
      ver: String(info.ver || '').slice(0, 10),
      emp: cleanEmp_(info.emp),
      did: String(info.did || '').slice(0, 16),
      act: String(info.act || '').slice(0, 20),
      away: !!info.away
    };
    cache.put('presence', JSON.stringify(map), 21600);
    online = activeCount_(map);
    cache.put('onlineN', String(online), 600);
    if (info.ev && info.ev.length) mvBuffer_(cache, info.ev);
    if (info.fu && typeof info.fu === 'object') fuBuffer_(cache, info.fu, cleanEmp_(info.emp));
  } finally {
    lock.releaseLock();
  }
  // 저장소(Properties) 쓰기는 첫 접속과 최대 동시접속 갱신 때만
  var peakKey = 'peakC_' + d;
  var needPeak = online > Number(cache.get(peakKey) || 0);
  if (isFirst || needPeak) {
    var lock2 = LockService.getScriptLock();
    if (lock2.tryLock(3000)) {
      try {
        var props = PropertiesService.getScriptProperties();
        if (isFirst) {
          props.setProperty('visits_' + d, String(Number(props.getProperty('visits_' + d) || 0) + 1));
          props.setProperty('visits_total', String(Number(props.getProperty('visits_total') || 0) + 1));
          var emp = cleanEmp_(info.emp);
          if (emp) {
            var em = JSON.parse(props.getProperty('emps_' + d) || '{}');
            var e = em[emp] || { n: 0, first: Utilities.formatDate(new Date(), TZ, 'HH:mm') };
            e.n += 1; e.last = Utilities.formatDate(new Date(), TZ, 'HH:mm'); e.dev = String(info.dev || '').slice(0, 30);
            em[emp] = e;
            if (Object.keys(em).length <= 300) props.setProperty('emps_' + d, JSON.stringify(em));
          }
        }
        if (needPeak) {
          var saved = Number(props.getProperty('peak_' + d) || 0);
          if (online > saved) props.setProperty('peak_' + d, String(online));
          cache.put(peakKey, String(Math.max(online, saved)), 21600);
        }
      } finally {
        lock2.releaseLock();
      }
    }
  }
  try { mvMaybeFlush_(); } catch (e) {}
  var res = { online: online, nid: noticeId_(), mv: minVer_() };
  try {
    var memp = cleanEmp_(info.emp), mraw = memp && CacheService.getScriptCache().get('msg_' + memp);
    if (mraw) { var mm = JSON.parse(mraw); if (mm.id !== String(info.msgAck || '')) res.msg = mm; }
  } catch (e) {}
  if (isFirst) { try { res.dv = dataVersion_(); } catch (e) {} try { res.me = meInfo_(info.emp); } catch (e) {} }
  return res;
}

/** 견적 인쇄·복사 횟수 집계 */
function logEvent(arg) {
  var name = typeof arg === 'string' ? arg : (arg && arg.name);
  var emp = typeof arg === 'string' ? '' : cleanEmp_(arg && arg.emp);
  if (['print', 'copy', 'save'].indexOf(name) < 0) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) { return; }
  try {
    var props = PropertiesService.getScriptProperties();
    var k = name + '_' + today_();
    props.setProperty(k, String(Number(props.getProperty(k) || 0) + 1));
    if (emp && name !== 'copy') {   // 사번별 오늘 인쇄 · 보관 횟수
      var ek = 'emps_' + today_(), em = JSON.parse(props.getProperty(ek) || '{}');
      if (em[emp]) { em[emp][name === 'print' ? 'p' : 's'] = (em[emp][name === 'print' ? 'p' : 's'] || 0) + 1; props.setProperty(ek, JSON.stringify(em)); }
    }
  } finally {
    lock.releaseLock();
  }
}

/** 관리자 상세 정보 (비밀번호 확인 후에만 반환) */
function getP_(all, k) { return all[k] == null ? null : all[k]; }

function adminStats(pw) {
  if (String(pw) !== ADMIN_PW) return { ok: false };
  var cache = CacheService.getScriptCache();
  var map = readPresence_(cache);
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();   // 한 번에 읽어서 저장소 읽기 횟수 절약
  var now = Date.now();
  var sessions = Object.keys(map).map(function (k) {
    var s = map[k];
    return {
      id: k.slice(-4).toUpperCase(),
      emp: s.emp || '', did: s.did || '', act: s.act || '', away: !!s.away, idle: idleOf_(s), dev: s.dev, cart: s.cart, models: s.models, ver: s.ver,
      startMin: Math.round((now - s.start) / 60000),
      lastSec: Math.round((now - s.last) / 1000)
    };
  }).sort(function (a, b) { return b.startMin - a.startMin; });
  var days = [];
  for (var i = 0; i < 7; i++) {
    var dt = new Date(now - i * 86400000);
    var d = Utilities.formatDate(dt, TZ, 'yyyyMMdd');
    days.push({
      date: Utilities.formatDate(dt, TZ, 'MM.dd'),
      emps: Object.keys(JSON.parse(getP_(all,'emps_' + d) || '{}')).length,
      visits: Number(getP_(all,'visits_' + d) || 0),
      peak: Number(getP_(all,'peak_' + d) || 0),
      prints: Number(getP_(all,'print_' + d) || 0),
      copies: Number(getP_(all,'copy_' + d) || 0),
      saves: Number(getP_(all,'save_' + d) || 0)
    });
  }
  var em = JSON.parse(getP_(all,'emps_' + today_()) || '{}');
  var ua = JSON.parse(cache.get('ua_' + today_()) || '{}');
  var todayEmps = Object.keys(em).map(function (k) {
    var u = ua[k] || [0, 0, 0, 0];
    return { emp: k, n: em[k].n, first: em[k].first, last: em[k].last, dev: em[k].dev || '', p: em[k].p || 0, s: em[k].s || 0,
      am: Math.round(u[0] / 60), v: u[1], ad: u[2], c: u[3] };
  }).sort(function (a, b) { return a.first < b.first ? -1 : 1; });
  return {
    ok: true,
    todayEmps: todayEmps,
    online: activeCount_(map),
    sessions: sessions,
    days: days,
    blocks: blockList_(),
    mv: minVer_(),
    rmap: rosterMap_(), rmode: rosterMode_(), rex: rosterEx_(), nrlog: nrToday_(),
    total: Number(getP_(all,'visits_total') || 0),
    at: Utilities.formatDate(new Date(), TZ, 'yyyy.MM.dd HH:mm:ss')
  };
}

/** 케어 가이드 폴더 찾기 (없으면 새로 만듦) */
function careFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('careFolderId');
  try { if (id) return DriveApp.getFolderById(id); } catch (e) {}
  var it = DriveApp.getFoldersByName(CARE_FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(CARE_FOLDER_NAME);
  props.setProperty('careFolderId', folder.getId());
  return folder;
}

/** 폴더(또는 드라이브)에 올린 zip 파일을 풀어서 care_01.jpg ~ 이미지를 폴더에 저장 */
function setupCareImages() {
  var folder = careFolder_();
  var zips = [];
  var f1 = folder.getFiles();
  while (f1.hasNext()) { var f = f1.next(); if (/\.zip$/i.test(f.getName())) zips.push(f); }
  if (!zips.length) {
    var f2 = DriveApp.searchFiles("title contains '케어가이드' and trashed = false");
    while (f2.hasNext()) { var z = f2.next(); if (/\.zip$/i.test(z.getName())) zips.push(z); }
  }
  if (!zips.length) return '압축파일(.zip)을 찾지 못했어요. ' + CARE_FOLDER_NAME + ' 폴더에 zip 파일을 올려주세요.';
  var blobs = Utilities.unzip(zips[0].getBlob().setContentType('application/zip'));
  var made = 0;
  blobs.forEach(function (b) {
    var name = String(b.getName()).split('/').pop();
    if (!/^care_\d+\.jpg$/i.test(name)) return;
    if (folder.getFilesByName(name).hasNext()) return;
    folder.createFile(b.setName(name).setContentType('image/jpeg'));
    made++;
  });
  return '케어 이미지 ' + made + '장을 ' + CARE_FOLDER_NAME + ' 폴더에 만들었어요.';
}

/** 케어 가이드 이미지 (폴더의 care_01.jpg ~ care_59.jpg). 이미지가 없으면 zip을 자동으로 풀어서 만듦 */
function getCareImage(no) {
  no = Number(no);
  if (!(no >= 1 && no <= 99)) return null;
  var name = 'care_' + (no < 10 ? '0' : '') + no + '.jpg';
  var folder = careFolder_();
  var files = folder.getFilesByName(name);
  if (!files.hasNext()) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(25000);
      if (!folder.getFilesByName(name).hasNext()) setupCareImages();
    } catch (e) {
    } finally {
      try { lock.releaseLock(); } catch (e2) {}
    }
    files = folder.getFilesByName(name);
    if (!files.hasNext()) return null;
  }
  var blob = files.next().getBlob();
  return 'data:image/jpeg;base64,' + Utilities.base64Encode(blob.getBytes());
}

/* ===================== 견적 보관함 (구글 시트에 저장) ===================== */
var QUOTE_SHEET_NAME = '삼성AI구독_견적보관함';
var QUOTE_HEAD = ['ID', '사번', '저장일시', '고객명', '연락처', '메모', '모델 요약', '월 납부액', '선납금', '데이터'];

function quoteSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('quoteSheetId');
  var ss = null;
  try { if (id) ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  if (!ss) {
    var it = DriveApp.getFilesByName(QUOTE_SHEET_NAME);
    ss = it.hasNext() ? SpreadsheetApp.open(it.next()) : SpreadsheetApp.create(QUOTE_SHEET_NAME);
    props.setProperty('quoteSheetId', ss.getId());
  }
  var sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(QUOTE_HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, QUOTE_HEAD.length).setFontWeight('bold').setBackground('#e7eefd');
  }
  return sh;
}

function cleanStr_(v, n) { return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, n); }

/** 견적 저장 (id가 있고 같은 사번이면 덮어쓰기) */
function saveQuote(q) {
  q = q || {};
  var emp = cleanEmp_(q.emp);
  var name = cleanStr_(q.name, 30);
  if (!emp || !name) return { ok: false, msg: '사번과 고객명이 필요해요.' };
  var state = String(q.state || '');
  if (state.length > 45000) return { ok: false, msg: '견적 데이터가 너무 커요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { ok: false, msg: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sh = quoteSheet_();
    var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
    var row = [null, emp, now, name, cleanStr_(q.phone, 20), cleanStr_(q.memo, 200),
               cleanStr_(q.summary, 300), Number(q.monthly) || 0, Number(q.prepay) || 0, state];
    if (q.id) {
      var data = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(q.id) && String(data[i][1]) === emp) {
          row[0] = q.id;
          sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
          return { ok: true, id: q.id, updated: true };
        }
      }
    }
    row[0] = Utilities.getUuid().slice(0, 8);
    sh.appendRow(row);
    return { ok: true, id: row[0] };
  } finally {
    lock.releaseLock();
  }
}

/** 내 사번의 견적 목록 (최신순) */
function listQuotes(emp) {
  emp = cleanEmp_(emp);
  if (!emp) return [];
  var sh = quoteSheet_();
  var n = sh.getLastRow();
  if (n < 2) return [];
  var data = sh.getRange(2, 1, n - 1, QUOTE_HEAD.length).getValues();
  var out = [];
  data.forEach(function (r) {
    if (String(r[1]) !== emp) return;
    out.push({ id: String(r[0]), ts: String(r[2]), name: String(r[3]), phone: String(r[4]), memo: String(r[5]),
               summary: String(r[6]), monthly: Number(r[7]) || 0, prepay: Number(r[8]) || 0, state: String(r[9]) });
  });
  out.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
  return out.slice(0, 300);
}

/** 견적 삭제 (같은 사번만) */
function deleteQuote(arg) {
  arg = arg || {};
  var emp = cleanEmp_(arg.emp), id = String(arg.id || '');
  if (!emp || !id) return { ok: false };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { ok: false }; }
  try {
    var sh = quoteSheet_();
    var data = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === id && String(data[i][1]) === emp) { sh.deleteRow(i + 1); return { ok: true }; }
    }
    return { ok: false };
  } finally {
    lock.releaseLock();
  }
}

/* ===================== 관리자: 단가표 · 추가 판촉 데이터 ===================== */
var DATA_FOLDER_NAME = '삼성AI구독_데이터';

function dataFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('dataFolderId');
  try { if (id) return DriveApp.getFolderById(id); } catch (e) {}
  var it = DriveApp.getFoldersByName(DATA_FOLDER_NAME);
  var f = it.hasNext() ? it.next() : DriveApp.createFolder(DATA_FOLDER_NAME);
  props.setProperty('dataFolderId', f.getId());
  return f;
}

function readDataFile_(kind) {
  var cache = CacheService.getScriptCache();
  var n = cache.get(kind + '_n');
  if (n !== null && n !== undefined) {
    if (n === '0') return null;
    var keys = []; for (var i = 0; i < Number(n); i++) keys.push(kind + '_' + i);
    var got = cache.getAll(keys), parts = [];
    for (var j = 0; j < keys.length; j++) { if (got[keys[j]] == null) { parts = null; break; } parts.push(got[keys[j]]); }
    if (parts) return parts.join('');
  }
  var files = dataFolder_().getFilesByName(kind + '.json');
  var txt = files.hasNext() ? files.next().getBlob().getDataAsString('UTF-8') : null;
  try {
    if (!txt) { cache.put(kind + '_n', '0', 21600); }
    else {
      var chunks = {}, size = 90000, c = 0;
      for (var p = 0; p < txt.length; p += size) { chunks[kind + '_' + c] = txt.slice(p, p + size); c++; }
      chunks[kind + '_n'] = String(c);
      cache.putAll(chunks, 21600);
    }
  } catch (e) {}
  return txt;
}

function clearDataCache_(kind) {
  var cache = CacheService.getScriptCache();
  var keys = [kind + '_n', 'dv']; for (var i = 0; i < 30; i++) keys.push(kind + '_' + i);
  cache.removeAll(keys);
}

/** Index.html 에서 호출: 업로드된 단가표/판촉이 있으면 그것을, 없으면 기본(Data.html)을 사용 */
function dataScript() {
  var base = HtmlService.createHtmlOutputFromFile('Data').getContent();
  var out = base;
  var price = null, promo = null;
  try { price = readDataFile_('price'); } catch (e) {}
  try { promo = readDataFile_('promo'); } catch (e) {}
  var extra = [];
  if (price) {
    var p = JSON.parse(price);
    extra.push('window.SUB_DATA=' + safeJson_(p.data) + ';');
    extra.push('window.PRICE_META=' + safeJson_(p.meta) + ';');
  }
  if (promo) {
    var q = JSON.parse(promo);
    if (q.cleared) { extra.push('window.PROMO_DATA={};window.PROMO_META=null;'); }
    else {
      extra.push('window.PROMO_DATA=' + safeJson_(q.data) + ';');
      extra.push('window.PROMO_META=' + safeJson_(q.meta) + ';');
    }
  }
  if (extra.length) out += '\n<script>' + extra.join('') + '</script>';
  return out;
}

function safeJson_(o) {
  return JSON.stringify(o).replace(/<\//g, '<\\/').replace(/\/\//g, '\\/\\/');
}

/** 관리자: 현재 적용 데이터 정보 */
function adminDataInfo(pw) {
  if (String(pw) !== ADMIN_PW) return { ok: false };
  var info = { ok: true, price: null, promo: null, history: [] };
  try { var p = readDataFile_('price'); if (p) info.price = JSON.parse(p).meta; } catch (e) {}
  try { var q = readDataFile_('promo'); if (q) { var qq = JSON.parse(q); info.promo = qq.cleared ? { cleared: true } : qq.meta; } } catch (e) {}
  var it = dataFolder_().getFiles();
  while (it.hasNext()) {
    var f = it.next(), n = f.getName();
    if (/^(price|promo)_\d+\.json$/.test(n)) info.history.push({ name: n, at: Utilities.formatDate(f.getDateCreated(), TZ, 'yyyy-MM-dd HH:mm') });
  }
  info.history.sort(function (a, b) { return a.name < b.name ? 1 : -1; });
  info.history = info.history.slice(0, 20);
  return info;
}

/** 관리자: 단가표(price) 또는 추가 판촉(promo) 저장. payload = JSON 문자열 {data, meta} */
function adminSaveData(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
  var kind = arg.kind === 'promo' ? 'promo' : 'price';
  var txt = String(arg.payload || '');
  try { JSON.parse(txt); } catch (e) { return { ok: false, msg: '데이터 형식이 올바르지 않아요.' }; }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, msg: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var folder = dataFolder_();
    var stamp = Utilities.formatDate(new Date(), TZ, 'yyyyMMddHHmm');
    var it = folder.getFilesByName(kind + '.json');
    if (it.hasNext()) { var old = it.next(); old.makeCopy(kind + '_' + stamp + '.json', folder); old.setContent(txt); }
    else folder.createFile(kind + '.json', txt, 'application/json');
    clearDataCache_(kind);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** 관리자: 업로드 데이터 해제 (단가표는 기본값으로, 판촉은 기본값/종료) */
function adminResetData(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var kind = arg.kind === 'promo' ? 'promo' : 'price';
  var folder = dataFolder_();
  var stamp = Utilities.formatDate(new Date(), TZ, 'yyyyMMddHHmm');
  var it = folder.getFilesByName(kind + '.json');
  if (kind === 'promo' && arg.mode === 'end') {
    var txt = JSON.stringify({ cleared: true });
    if (it.hasNext()) { var f = it.next(); f.makeCopy('promo_' + stamp + '.json', folder); f.setContent(txt); }
    else folder.createFile('promo.json', txt, 'application/json');
  } else if (it.hasNext()) {
    var g = it.next(); g.makeCopy(kind + '_' + stamp + '.json', folder); g.setTrashed(true);
  }
  clearDataCache_(kind);
  return { ok: true };
}

/** 케어 가이드 이미지 목록 {번호: 파일ID} — 한 번만 호출, 이미지는 드라이브 공개 링크로 바로 표시 (서버 부하 없음) */
function getCareList() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('careList');
  if (c) return JSON.parse(c);
  var folder = careFolder_();
  var it = folder.getFiles(), list = {}, n = 0;
  while (it.hasNext()) {
    var f = it.next(), m = f.getName().match(/^care_(\d+)\.jpg$/i);
    if (m) { list[Number(m[1])] = f.getId(); n++; }
  }
  if (!n) {
    setupCareImages();
    it = folder.getFiles();
    while (it.hasNext()) { var g = it.next(), mm = g.getName().match(/^care_(\d+)\.jpg$/i); if (mm) { list[Number(mm[1])] = g.getId(); n++; } }
  }
  var props = PropertiesService.getScriptProperties();
  if (n && props.getProperty('careShared') !== 'Y') {
    try { shareCareImages(); } catch (e) {}
  }
  cache.put('careList', JSON.stringify(list), 21600);
  return list;
}

/** 케어 가이드 폴더와 이미지를 '링크가 있는 모든 사용자 보기'로 공유 (한 번만 실행되면 됨) */
function shareCareImages() {
  var folder = careFolder_();
  try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  var it = folder.getFiles(), n = 0;
  while (it.hasNext()) {
    var f = it.next();
    if (!/^care_\d+\.jpg$/i.test(f.getName())) continue;
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); n++;
  }
  PropertiesService.getScriptProperties().setProperty('careShared', 'Y');
  CacheService.getScriptCache().remove('careList');
  return '케어 이미지 ' + n + '장을 링크 공유로 설정했어요.';
}

/** 관리자: 전체 견적 목록 (모든 사번) */
function adminListQuotes(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var sh = quoteSheet_();
  var n = sh.getLastRow(), out = [];
  if (n >= 2) {
    sh.getRange(2, 1, n - 1, QUOTE_HEAD.length).getValues().forEach(function (r) {
      if (!r[0]) return;
      out.push({ id: String(r[0]), emp: String(r[1]), ts: String(r[2]), name: String(r[3]), memo: String(r[5]),
                 summary: String(r[6]), monthly: Number(r[7]) || 0, prepay: Number(r[8]) || 0, state: String(r[9]) });
    });
  }
  out.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
  return { ok: true, list: out.slice(0, 1000), total: out.length, url: sh.getParent().getUrl() };
}

/** 관리자: 견적 삭제 (사번 상관없이) */
function adminDeleteQuote(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var id = String(arg.id || '');
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { ok: false }; }
  try {
    var sh = quoteSheet_();
    var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    for (var i = ids.length - 1; i >= 1; i--) {
      if (String(ids[i][0]) === id) { sh.deleteRow(i + 1); return { ok: true }; }
    }
    return { ok: false };
  } finally {
    lock.releaseLock();
  }
}


/* ===================== 공지사항 ===================== */
var NOTICE_SHEET = '공지확인';
var NOTICE_HEAD = ['공지ID', '사번', '기기', '확인일시'];

/** 현재 공지 ID (캐시 우선, 하트비트마다 호출되므로 가볍게) */
function noticeId_() {
  var cache = CacheService.getScriptCache();
  var v = cache.get('nid');
  if (v == null) {
    var n = readNotice_();
    v = n ? n.id : '';
    cache.put('nid', v, 21600);
  }
  return v;
}
function readNotice_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('notice') || 'null'); } catch (e) { return null; }
}
function noticeSheet_() {
  var ss = quoteSheet_().getParent();
  var sh = ss.getSheetByName(NOTICE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(NOTICE_SHEET);
    sh.appendRow(NOTICE_HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, NOTICE_HEAD.length).setFontWeight('bold').setBackground('#e7eefd');
  }
  return sh;
}
/** 직원: 현재 공지 내용 */
function getNotice() {
  return readNotice_();
}
/** 직원: 확인 누름 기록 (같은 사번 중복 기록 안 함) */
function ackNotice(arg) {
  arg = arg || {};
  var id = String(arg.id || ''), emp = cleanEmp_(arg.emp);
  var cur = readNotice_();
  if (!cur || cur.id !== id || !emp) return { ok: false };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false };
  try {
    var sh = noticeSheet_(), n = sh.getLastRow();
    if (n >= 2) {
      var rows = sh.getRange(2, 1, n - 1, 2).getValues();
      for (var i = 0; i < rows.length; i++) if (String(rows[i][0]) === id && String(rows[i][1]) === emp) return { ok: true, dup: true };
    }
    sh.appendRow([id, emp, cleanStr_(arg.dev, 30), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]);
  } finally { lock.releaseLock(); }
  return { ok: true };
}
/** 관리자: 현재 공지 + 확인한 사람 목록 */
function adminNotice(pw) {
  if (String(pw) !== ADMIN_PW) return { ok: false };
  var cur = readNotice_(), acks = [];
  if (cur) {
    var sh = noticeSheet_(), n = sh.getLastRow();
    if (n >= 2) sh.getRange(2, 1, n - 1, 4).getValues().forEach(function (r) {
      if (String(r[0]) === cur.id) acks.push({ emp: String(r[1]), dev: String(r[2]), at: String(r[3]).slice(5, 16) });
    });
  }
  return { ok: true, notice: cur, acks: acks };
}
/** 관리자: 새 공지 올리기 (이전 공지는 내려감) */
function adminPostNotice(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var items = (arg.items || []).slice(0, 40).map(function (x) { return String(x).slice(0, 300); });
  var n = { id: 'n' + Date.now(), title: String(arg.title || '').slice(0, 60), body: String(arg.body || '').slice(0, 1000), items: items, at: Date.now() };
  while (n.items.length && Utilities.newBlob(JSON.stringify(n)).getBytes().length > 8500) n.items.pop();   // 저장소 한 칸 용량(9KB) 이내
  PropertiesService.getScriptProperties().setProperty('notice', JSON.stringify(n));
  CacheService.getScriptCache().put('nid', n.id, 21600);
  noticeSheet_();
  return { ok: true, id: n.id };
}
/** 관리자: 현재 공지 수정 (renotify면 새 공지로 다시 띄우고 확인 기록은 새로 시작) */
function adminEditNotice(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var cur = readNotice_();
  if (!cur) return { ok: false, msg: '수정할 공지가 없어요.' };
  var items = (arg.items || []).slice(0, 40).map(function (x) { return String(x).slice(0, 300); });
  var n = { id: arg.renotify ? 'n' + Date.now() : cur.id, title: String(arg.title || '').slice(0, 60), body: String(arg.body || '').slice(0, 1000), items: items,
            at: arg.renotify ? Date.now() : cur.at, edited: Date.now() };
  while (n.items.length && Utilities.newBlob(JSON.stringify(n)).getBytes().length > 8500) n.items.pop();
  PropertiesService.getScriptProperties().setProperty('notice', JSON.stringify(n));
  CacheService.getScriptCache().put('nid', n.id, 21600);
  return { ok: true, id: n.id };
}
/** 관리자: 공지 내리기 */
function adminClearNotice(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  PropertiesService.getScriptProperties().deleteProperty('notice');
  CacheService.getScriptCache().put('nid', '', 21600);
  return { ok: true };
}


/* ===================== 접속 차단 ===================== */
var BLOCK_SHEET = '차단목록';
function readBlocks_() {
  var cache = CacheService.getScriptCache();
  var v = cache.get('blocks');
  if (v == null) {
    v = PropertiesService.getScriptProperties().getProperty('blocks') || '{"e":{},"d":{}}';
    cache.put('blocks', v, 21600);
  }
  try { var b = JSON.parse(v); b.e = b.e || {}; b.d = b.d || {}; return b; } catch (e) { return { e: {}, d: {} }; }
}
function saveBlocks_(b) {
  var v = JSON.stringify(b);
  PropertiesService.getScriptProperties().setProperty('blocks', v);
  CacheService.getScriptCache().put('blocks', v, 21600);
  try {   // 구글 시트 '차단목록' 탭에도 현재 목록을 그대로 남김
    var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(BLOCK_SHEET) || ss.insertSheet(BLOCK_SHEET);
    sh.clearContents();
    var rows = [['구분', '대상', '기기 정보', '메모', '차단 일시']];
    blockList_(b).forEach(function (x) { rows.push([x.type === 'emp' ? '사번' : '기기', x.type === 'emp' ? x.key : '#' + x.key.slice(0, 4).toUpperCase() + ' (' + x.key + ')', x.dev || '', x.memo || '', x.at || '']); });
    sh.getRange(1, 1, rows.length, 5).setValues(rows);
    sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#fde2e2');
  } catch (e) {}
}
function isBlocked_(emp, did) {
  var b = readBlocks_();
  emp = cleanEmp_(emp); did = String(did || '');
  return !!((emp && b.e[emp]) || (did && b.d[did]));
}
function blockList_(b) {
  b = b || readBlocks_();
  var out = [];
  Object.keys(b.e).forEach(function (k) { out.push({ type: 'emp', key: k, memo: b.e[k].memo, at: b.e[k].at, dev: b.e[k].dev || '' }); });
  Object.keys(b.d).forEach(function (k) { out.push({ type: 'did', key: k, memo: b.d[k].memo, at: b.d[k].at, dev: b.d[k].dev || '' }); });
  return out.sort(function (a, c) { return a.at < c.at ? 1 : -1; });
}
/** 관리자: 사번 / 기기 차단 */
function adminBlock(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var emp = cleanEmp_(arg.emp), did = String(arg.did || '').slice(0, 16);
  if (!emp && !did) return { ok: false };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false };
  try {
    var b = readBlocks_(), at = Utilities.formatDate(new Date(), TZ, 'MM.dd HH:mm');
    var rec = { memo: cleanStr_(arg.memo, 40), at: at, dev: cleanStr_(arg.dev, 30) };
    if (emp) b.e[emp] = rec;
    if (did) b.d[did] = rec;
    saveBlocks_(b);
  } finally { lock.releaseLock(); }
  return { ok: true };
}
/** 관리자: 차단 해제 */
function adminUnblock(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false };
  try {
    var b = readBlocks_();
    if (arg.type === 'emp') delete b.e[String(arg.key)]; else delete b.d[String(arg.key)];
    saveBlocks_(b);
  } finally { lock.releaseLock(); }
  return { ok: true };
}


/* ===================== 베스트 모델 (모델별 조회 · 담기 · 인쇄 · 보관 집계) ===================== */
var MV_SHEET = '모델통계';
var MV_TYPES = ['view', 'add', 'print', 'save'];
/** 하트비트로 들어온 이벤트를 캐시에 모아둠 (락 안에서 호출) */
function mvBuffer_(cache, ev) {
  var buf = JSON.parse(cache.get('mvbuf') || '{}'), d = today_();
  ev.slice(0, 60).forEach(function (e) {
    var code = String(e && e[0] || '').replace(/[^0-9A-Za-z\-]/g, '').slice(0, 30), t = MV_TYPES.indexOf(e && e[1]);
    if (!code || t < 0) return;
    var k = d + '|' + code, a = buf[k] || [0, 0, 0, 0];
    a[t]++; buf[k] = a;
  });
  cache.put('mvbuf', JSON.stringify(buf), 21600);
}
function mvSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(MV_SHEET);
  if (!sh) {
    sh = ss.insertSheet(MV_SHEET);
    sh.appendRow(['날짜', '모델', '조회', '담기', '인쇄', '보관']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#fff4d6');
  }
  return sh;
}
/** 5분마다 한 번 캐시에 모인 집계를 시트에 반영 */
function mvMaybeFlush_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('mvflushT')) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return;
  try {
    if (cache.get('mvflushT')) return;
    cache.put('mvflushT', '1', 300);
    var buf = JSON.parse(cache.get('mvbuf') || '{}'), keys = Object.keys(buf);
    if (!keys.length) { try { fuFlush_(cache); } catch (e) {} return; }
    var sh = mvSheet_(), n = sh.getLastRow(), idx = {}, vals = [];
    if (n >= 2) { vals = sh.getRange(2, 1, n - 1, 6).getValues(); vals.forEach(function (r, i) { idx[String(r[0]) + '|' + String(r[1])] = i; }); }
    var add = [];
    keys.forEach(function (k) {
      var a = buf[k], i = idx[k];
      if (i != null) { for (var j = 0; j < 4; j++) vals[i][2 + j] = Number(vals[i][2 + j] || 0) + a[j]; }
      else { var p = k.split('|'); add.push([p[0], p[1], a[0], a[1], a[2], a[3]]); }
    });
    if (vals.length) sh.getRange(2, 1, vals.length, 6).setValues(vals);
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 6).setValues(add);
    cache.put('mvbuf', '{}', 21600);
    try { fuFlush_(cache); } catch (e) {}
    cache.remove('best_1'); cache.remove('best_7'); cache.remove('best_30');
  } finally { lock.releaseLock(); }
}
function mvDay_(offset) { return Utilities.formatDate(new Date(Date.now() - offset * 86400000), TZ, 'yyyyMMdd'); }
/** 기간별 모델 집계 (시트 + 아직 반영 안 된 캐시) */
function mvAgg_(from, to) {
  var out = {}, sh = mvSheet_(), n = sh.getLastRow();
  var addRow = function (d, code, a) { if (d < from || d > to) return; var o = out[code] || (out[code] = [0, 0, 0, 0]); for (var j = 0; j < 4; j++) o[j] += Number(a[j] || 0); };
  if (n >= 2) sh.getRange(2, 1, n - 1, 6).getValues().forEach(function (r) { addRow(String(r[0]), String(r[1]), [r[2], r[3], r[4], r[5]]); });
  var buf = JSON.parse(CacheService.getScriptCache().get('mvbuf') || '{}');
  Object.keys(buf).forEach(function (k) { var p = k.split('|'); addRow(p[0], p[1], buf[k]); });
  return out;
}
function mvRank_(agg) {
  return Object.keys(agg).map(function (k) { return [k].concat(agg[k]); })
    .sort(function (a, b) { return (b[1] + b[2] * 2) - (a[1] + a[2] * 2) || b[1] - a[1]; });
}
/** 직원: 베스트 모델 TOP 20 (5분 캐시) */
function getBest(arg) {
  var days = [1, 7, 30].indexOf(Number(arg && arg.days)) >= 0 ? Number(arg.days) : 7;
  var cache = CacheService.getScriptCache(), ck = 'best_' + days, c = cache.get(ck);
  if (c) return JSON.parse(c);
  var cur = mvRank_(mvAgg_(mvDay_(days - 1), mvDay_(0))), prev = mvRank_(mvAgg_(mvDay_(days * 2 - 1), mvDay_(days)));
  var pr = {}; prev.forEach(function (r, i) { pr[r[0]] = i + 1; });
  var res = { days: days, at: Utilities.formatDate(new Date(), TZ, 'HH:mm'),
    list: cur.slice(0, 20).map(function (r) { return { code: r[0], view: r[1], add: r[2], print: r[3], save: r[4], prev: pr[r[0]] || 0 }; }) };
  cache.put(ck, JSON.stringify(res), 300);
  return res;
}
/** 관리자: 전체 모델 집계 */
function adminBest(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var days = [1, 7, 30].indexOf(Number(arg.days)) >= 0 ? Number(arg.days) : 7;
  var rows = mvRank_(mvAgg_(mvDay_(days - 1), mvDay_(0)));
  var tot = [0, 0, 0, 0]; rows.forEach(function (r) { for (var j = 0; j < 4; j++) tot[j] += r[1 + j]; });
  return { ok: true, days: days, total: tot, models: rows.length, list: rows.slice(0, 300) };
}


/* ===================== 강제 업데이트 (최소 버전) ===================== */
function minVer_() {
  var cache = CacheService.getScriptCache(), v = cache.get('minVer');
  if (v == null) { v = PropertiesService.getScriptProperties().getProperty('minVer') || ''; cache.put('minVer', v, 21600); }
  return v;
}
/** 관리자: 이 버전보다 낮은 화면은 자동으로 새로고침 (v7.6 이상 화면에서 동작) */
function adminSetMinVer(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var v = String(arg.ver || '').replace(/[^v0-9.]/g, '').slice(0, 10);
  PropertiesService.getScriptProperties().setProperty('minVer', v);
  CacheService.getScriptCache().put('minVer', v, 21600);
  return { ok: true, ver: v };
}


/* ===================== 기능 사용 통계 ===================== */
var FU_SHEET = '기능통계';
function fuBuffer_(cache, fu, emp) {
  var buf = JSON.parse(cache.get('fubuf') || '{}'), d = today_(), n = 0;
  Object.keys(fu).slice(0, 80).forEach(function (k) {
    var key = String(k).replace(/[^0-9A-Za-z가-힣:_\-]/g, '').slice(0, 30), v = Math.min(500, Number(fu[k]) || 0);
    if (!key || !v) return;
    var bk = d + '|' + key, a = buf[bk] || [0, ''];
    a[0] += v;
    if (emp && key.indexOf(':') < 0 && (',' + a[1] + ',').indexOf(',' + emp + ',') < 0 && a[1].length < 3000) a[1] = a[1] ? a[1] + ',' + emp : emp;
    buf[bk] = a; n++;
  });
  if (n) cache.put('fubuf', JSON.stringify(buf), 21600);
}
function fuSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(FU_SHEET);
  if (!sh) {
    sh = ss.insertSheet(FU_SHEET);
    sh.appendRow(['날짜', '기능', '횟수', '사번']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#e0e7ff');
  }
  return sh;
}
/** mvMaybeFlush_ 안(락 보유)에서 호출 */
function fuFlush_(cache) {
  var buf = JSON.parse(cache.get('fubuf') || '{}'), keys = Object.keys(buf);
  if (!keys.length) return;
  var sh = fuSheet_(), n = sh.getLastRow(), idx = {}, vals = [];
  if (n >= 2) { vals = sh.getRange(2, 1, n - 1, 4).getValues(); vals.forEach(function (r, i) { idx[String(r[0]) + '|' + String(r[1])] = i; }); }
  var add = [];
  keys.forEach(function (k) {
    var a = buf[k], i = idx[k];
    if (i != null) {
      vals[i][2] = Number(vals[i][2] || 0) + a[0];
      if (a[1]) { var set = {}; String(vals[i][3] || '').split(',').concat(a[1].split(',')).forEach(function (e) { if (e) set[e] = 1; }); vals[i][3] = Object.keys(set).join(',').slice(0, 40000); }
    } else { var p = k.split('|'); add.push([p[0], p[1], a[0], a[1]]); }
  });
  if (vals.length) sh.getRange(2, 1, vals.length, 4).setValues(vals);
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 4).setValues(add);
  cache.put('fubuf', '{}', 21600);
}
function fuAgg_(from, to) {
  var out = {}, sh = fuSheet_(), n = sh.getLastRow();
  var addRow = function (d, k, c, emps) {
    if (d < from || d > to) return;
    var o = out[k] || (out[k] = { n: 0, e: {} });
    o.n += Number(c || 0);
    String(emps || '').split(',').forEach(function (e) { if (e) o.e[e] = 1; });
  };
  if (n >= 2) sh.getRange(2, 1, n - 1, 4).getValues().forEach(function (r) { addRow(String(r[0]), String(r[1]), r[2], r[3]); });
  var buf = JSON.parse(CacheService.getScriptCache().get('fubuf') || '{}');
  Object.keys(buf).forEach(function (k) { var p = k.split('|'); addRow(p[0], p[1], buf[k][0], buf[k][1]); });
  return out;
}
/** 최근 n일 날짜별 기능 사용 합계 · 사번 수 */
function fuDaily_(nDays) {
  var from = mvDay_(nDays - 1), to = mvDay_(0), out = {};
  for (var i = 0; i < nDays; i++) out[mvDay_(i)] = { n: 0, e: {} };
  var add = function (d, k, c, emps) {
    if (d < from || d > to || String(k).indexOf(':') >= 0 || !out[d]) return;
    out[d].n += Number(c || 0);
    String(emps || '').split(',').forEach(function (e) { if (e) out[d].e[e] = 1; });
  };
  var sh = fuSheet_(), n = sh.getLastRow();
  if (n >= 2) sh.getRange(2, 1, n - 1, 4).getValues().forEach(function (r) { add(String(r[0]), String(r[1]), r[2], r[3]); });
  var buf = JSON.parse(CacheService.getScriptCache().get('fubuf') || '{}');
  Object.keys(buf).forEach(function (k) { var p = k.split('|'); add(p[0], p[1], buf[k][0], buf[k][1]); });
  return Object.keys(out).sort().map(function (d) { return { d: d, n: out[d].n, u: Object.keys(out[d].e).length }; });
}
/** 관리자: 기능 사용 통계 */
function adminFeatures(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var days = [1, 7, 30].indexOf(Number(arg.days)) >= 0 ? Number(arg.days) : 7, cur, prev, date = String(arg.date || '').replace(/[^0-9]/g, '');
  if (date.length === 8) {   // 특정 날짜 하루 (이전 날과 비교)
    var dt = new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)));
    var pd = Utilities.formatDate(new Date(dt.getTime() - 86400000), TZ, 'yyyyMMdd');
    cur = fuAgg_(date, date); prev = fuAgg_(pd, pd); days = 1;
  } else { cur = fuAgg_(mvDay_(days - 1), mvDay_(0)); prev = fuAgg_(mvDay_(days * 2 - 1), mvDay_(days)); }
  var users = {}, list = Object.keys(cur).map(function (k) {
    if (k.indexOf(':') < 0) Object.keys(cur[k].e).forEach(function (e) { users[e] = 1; });
    return { k: k, n: cur[k].n, u: Object.keys(cur[k].e).length, prev: prev[k] ? prev[k].n : 0 };
  }).sort(function (a, b) { return b.n - a.n; });
  var addE = cur.add ? cur.add.e : {}, done = 0;
  Object.keys(addE).forEach(function (e) { if ((cur.print && cur.print.e[e]) || (cur.save && cur.save.e[e]) || (cur.copy && cur.copy.e[e])) done++; });
  return { ok: true, days: days, date: date.length === 8 ? date : '', list: list, users: Object.keys(users).length, addUsers: Object.keys(addE).length, done: done, daily: fuDaily_(14) };
}


/* ===================== 직원 명부 (드라이브에만 저장 · 공개 안 됨) ===================== */
/** 명부 { emp: [성명, 부서, 직책, 사원구분, 협력업체명] } */
function rosterMap_() {
  var t = readDataFile_('roster');
  if (!t) return {};
  try { return JSON.parse(t).map || {}; } catch (e) { return {}; }
}
function rosterMode_() { return PropertiesService.getScriptProperties().getProperty('rosterMode') || 'strict'; }
function rosterEx_() {
  var cache = CacheService.getScriptCache(), v = cache.get('rosterEx');
  if (v == null) { v = PropertiesService.getScriptProperties().getProperty('rosterEx') || '{}'; cache.put('rosterEx', v, 21600); }
  try { return JSON.parse(v); } catch (e) { return {}; }
}
function saveRosterEx_(ex) {
  var v = JSON.stringify(ex);
  PropertiesService.getScriptProperties().setProperty('rosterEx', v);
  CacheService.getScriptCache().put('rosterEx', v, 21600);
}
/** 입장 가능 여부: 명부가 비어 있거나 '누구나 입장' 모드면 항상 허용 */
function rosterAllowed_(emp) {
  emp = cleanEmp_(emp);
  if (!emp) return true;
  var cache = CacheService.getScriptCache(), mode = cache.get('rosterModeC');
  if (mode == null) { mode = rosterMode_(); cache.put('rosterModeC', mode, 21600); }
  if (mode !== 'strict') return true;
  var map = rosterMap_();
  if (!Object.keys(map).length) return true;
  if (map[emp]) return true;
  var e = rosterEx_()[emp];
  if (e && (!e.until || e.until >= Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'))) return true;
  return false;
}
/** 직원: 입장 전 사번 확인 */
function checkEmp(arg) {
  var emp = typeof arg === 'object' && arg ? arg.emp : arg, did = typeof arg === 'object' && arg ? arg.did : '';
  if (isBlocked_(emp, did)) return { ok: false, reason: 'blocked' };
  if (!rosterAllowed_(emp)) { nrLog_(emp, 'r', typeof arg === 'object' ? arg : {}); return { ok: false, reason: 'roster' }; }
  return { ok: true, me: meInfo_(emp) };
}
/** 본인 사번의 이름 · 지점 · 직책 (견적서 담당자 표시용) */
function meInfo_(emp) {
  try { var r = rosterMap_()[cleanEmp_(emp)]; return r ? { name: r[0] || '', br: r[1] || '', rank: r[2] || '' } : null; } catch (e) { return null; }
}
/** 관리자: 명부 + 설정 */
function adminRoster(pw) {
  if (String(pw) !== ADMIN_PW) return { ok: false };
  var t = readDataFile_('roster'), d = null;
  try { d = t ? JSON.parse(t) : null; } catch (e) { d = null; }
  return { ok: true, map: d ? d.map : {}, meta: d ? d.meta : null, mode: rosterMode_(), ex: rosterEx_() };
}
/** 관리자: 명부 저장 (이전 명부는 백업) */
function adminSaveRoster(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
  var map = arg.map || {}, n = Object.keys(map).length;
  if (!n || n > 5000) return { ok: false, msg: '명부 인원이 올바르지 않아요.' };
  var clean = {};
  Object.keys(map).forEach(function (k) { var e = cleanEmp_(k), r = map[k] || []; if (e) clean[e] = [0, 1, 2, 3, 4].map(function (i) { return String(r[i] == null ? '' : r[i]).slice(0, 30); }); });
  var meta = { file: cleanStr_(arg.file, 80), at: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), count: Object.keys(clean).length };
  var txt = JSON.stringify({ meta: meta, map: clean });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, msg: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var folder = dataFolder_(), it = folder.getFilesByName('roster.json');
    if (it.hasNext()) { var old = it.next(); old.makeCopy('roster_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHHmm') + '.json', folder); old.setContent(txt); }
    else folder.createFile('roster.json', txt, 'application/json');
    var cache = CacheService.getScriptCache(), keys = ['roster_n']; for (var i = 0; i < 30; i++) keys.push('roster_' + i);
    cache.removeAll(keys);
    var ex = rosterEx_(), ch = false;   // 명부에 들어온 사번은 예외 목록에서 자동 정리
    Object.keys(ex).forEach(function (k) { if (clean[k]) { delete ex[k]; ch = true; } });
    if (ch) saveRosterEx_(ex);
  } finally { lock.releaseLock(); }
  return { ok: true, meta: meta };
}
/** 관리자: 입장 방식 (strict = 명부 사번만, open = 누구나) */
function adminRosterMode(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var m = arg.mode === 'open' ? 'open' : 'strict';
  PropertiesService.getScriptProperties().setProperty('rosterMode', m);
  CacheService.getScriptCache().put('rosterModeC', m, 21600);
  return { ok: true, mode: m };
}
/** 관리자: 예외 허용 추가 / 해제 */
function adminRosterEx(arg) {
  arg = arg || {};
  if (String(arg.pw) !== ADMIN_PW) return { ok: false };
  var emp = cleanEmp_(arg.emp);
  if (!emp) return { ok: false };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false };
  try {
    var ex = rosterEx_();
    if (arg.op === 'del') delete ex[emp];
    else {
      var days = Number(arg.days) || 0;
      ex[emp] = { memo: cleanStr_(arg.memo, 40), at: Utilities.formatDate(new Date(), TZ, 'MM.dd HH:mm'),
        until: days ? Utilities.formatDate(new Date(Date.now() + days * 86400000), TZ, 'yyyy-MM-dd') : '' };
    }
    saveRosterEx_(ex);
    return { ok: true, ex: ex };
  } finally { lock.releaseLock(); }
}


/* ===================== 명부 외 접속 기록 ===================== */
/** type: r = 입장 거부, b = 접속 중 돌려보냄 */
function nrLog_(emp, type, info) {
  emp = cleanEmp_(emp); info = info || {};
  if (!emp) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return;
  try {
    var props = PropertiesService.getScriptProperties(), k = 'nr_' + today_(), now = Utilities.formatDate(new Date(), TZ, 'HH:mm');
    var raw = props.getProperty(k);
    if (!raw) { try { props.deleteProperty('nr_' + Utilities.formatDate(new Date(Date.now() - 8 * 86400000), TZ, 'yyyyMMdd')); } catch (x) {} }
    var o = JSON.parse(raw || '{}'), e = o[emp];
    if (!e) {
      if (Object.keys(o).length >= 80) return;
      e = o[emp] = { r: 0, first: now };
    }
    var firstOfType = type === 'r' ? !e.r : !e.b;
    if (type === 'r') { e.r++; e.last = now; }
    else if (!e.b) {
      e.b = now;
      var em = JSON.parse(props.getProperty('emps_' + today_()) || '{}')[emp];
      if (em) { e.n = em.n; e.p = em.p || 0; }
      e.m = String(info.models || '').slice(0, 80);
    }
    e.dev = String(info.dev || e.dev || '').slice(0, 30); e.did = String(info.did || e.did || '').slice(0, 16);
    props.setProperty(k, JSON.stringify(o));
    if (firstOfType) {
      try {
        var ss = quoteSheet_().getParent(), sh = ss.getSheetByName('명부외접속');
        if (!sh) { sh = ss.insertSheet('명부외접속'); sh.appendRow(['일시', '사번', '구분', '기기', '기기ID']); sh.setFrozenRows(1); sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#fee2e2'); }
        sh.appendRow([Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), emp, type === 'r' ? '입장 거부' : '접속 중 돌려보냄', e.dev, e.did]);
      } catch (x) {}
    }
  } finally { lock.releaseLock(); }
}
function nrToday_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('nr_' + today_()) || '{}'); } catch (e) { return {}; }
}
