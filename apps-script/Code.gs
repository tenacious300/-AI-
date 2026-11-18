// 관리자 비밀번호: 공개 저장소라 코드에 적지 않고 Apps Script '스크립트 속성'(ADMIN_PW)에만 저장
var ADMIN_PW = PropertiesService.getScriptProperties().getProperty('ADMIN_PW') || ('\u0000' + Utilities.getUuid());
var ONLINE_SEC = 180;
var LONG_IDLE_MIN = 30;             // 이 시간(분) 넘게 조작이 없으면 접속자 수에서 제외 (목록에는 💤로 표시)              // 마지막 신호 후 이 시간(초) 안이면 '접속 중'으로 계산 (신호 간격 75초)
var TZ = 'Asia/Seoul';

/* ---------- 관리자 비밀번호 잠금 ----------
   15분 안에 10번 틀리면 15분 동안 모든 관리자 로그인을 막아요 (맞는 비밀번호도 거절).
   틀린 시도는 스크립트 속성 'pwfail_log'에 최근 50건(시각 · 화면에서 보낸 기기 정보)만 남겨요. */
var PW_MAX_FAIL = 10, PW_LOCK_SEC = 900;
function pwLocked_() { return Number(CacheService.getScriptCache().get('pwfail') || 0) >= PW_MAX_FAIL; }
function pwOk_(pw) {
  var c = CacheService.getScriptCache(), n = Number(c.get('pwfail') || 0);
  if (n >= PW_MAX_FAIL) return false;
  if (String(pw) === ADMIN_PW) return true;
  c.put('pwfail', String(n + 1), PW_LOCK_SEC);
  try {
    var props = PropertiesService.getScriptProperties(), L = JSON.parse(props.getProperty('pwfail_log') || '[]');
    L.unshift(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss') + (n + 1 >= PW_MAX_FAIL ? ' (잠김)' : ''));
    props.setProperty('pwfail_log', JSON.stringify(L.slice(0, 50)));
  } catch (e) {}
  return false;
}
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
  getDataVer: getDataVer,
  getBest: getBest, adminBest: adminBest, adminFeatures: adminFeatures, adminEmpUsage: adminEmpUsage, adminEmpDaily: adminEmpDaily, adminEmpHistory: adminEmpHistory, adminReportSet: adminReportSet, termsAgree: termsAgree, pinInfo: pinInfo, adminPinReset: adminPinReset, adminPinRequiredSet: adminPinRequiredSet, adminPinInfo: adminPinInfo, adminPinList: adminPinList,
  getCardPolicy: getCardPolicy, cardPolImage: cardPolImage, adminCardPolicyUpload: adminCardPolicyUpload, adminCardPolicySet: adminCardPolicySet, adminSetMinVer: adminSetMinVer,
  adminBlock: adminBlock, adminUnblock: adminUnblock, adminSendMsg: adminSendMsg,
  logQuote: logQuote, getPairs: getPairs, recFb: recFb, adminQuoteLog: adminQuoteLog,
  getBanner: getBanner, adminBannerSet: adminBannerSet,
  sendFeedback: sendFeedback, myFeedback: myFeedback, adminFeedback: adminFeedback, adminFeedbackSet: adminFeedbackSet,
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
var DATA_KINDS = ['price', 'promo', 'lg', 'ck', 'ckm'];   // lg = LG 가전구독 단가표+활성화 · ck = 쿠쿠 구독 단가+카드 · ckm = 쿠쿠 다품목 캐시백 가이드
function kindOf_(k) { return DATA_KINDS.indexOf(k) >= 0 ? k : 'price'; }
function getData(kind) {
  kind = kindOf_(kind);
  var t = readDataFile_(kind);
  return t ? JSON.parse(t) : null;
}

/** LG 계산기 등에서 데이터 버전만 확인 */
function getDataVer() { return dataVersion_(); }

/** 업로드 데이터 버전 (변경 시각) — 없으면 '' */
function dataVersion_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('dv');
  if (c) return JSON.parse(c);
  var dv = { price: '', promo: '', lg: '', ck: '', ckm: '' }, folder = dataFolder_();
  DATA_KINDS.forEach(function (k) {
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
    return { online: Number(cache.get('onlineN') || 0) || -1, nid: noticeId_(), pinReq: pinRequired_() };
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
  try { dayMaybeSnap_(); } catch (e) {}
  var res = { online: online, nid: noticeId_(), mv: minVer_(), mva: minVerAt_() };
  try {
    var memp = cleanEmp_(info.emp), mraw = memp && CacheService.getScriptCache().get('msg_' + memp);
    if (mraw) { var mm = JSON.parse(mraw); if (mm.id !== String(info.msgAck || '')) res.msg = mm; }
  } catch (e) {}
  if (isFirst) { try { res.dv = dataVersion_(); } catch (e) {} try { if (!pinRequired_() || tokOk_(info.emp, info.tok)) res.me = meInfo_(info.emp); } catch (e) {}   /* PIN 필수면 열쇠 있는 기기에만 이름 · 지점 */ }
  res.pinReq = pinRequired_();
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
  if (!pwOk_(pw)) return pwLocked_() ? { ok: false, locked: true, msg: '비밀번호를 여러 번 틀려 15분 동안 관리자 로그인이 잠겼어요.' } : { ok: false };
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
  if (emp && !quoteAuth_(emp, q.tok)) return { ok: false, msg: '다시 로그인해 주세요 (PIN 확인 필요).', auth: true };
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
function listQuotes(arg) {
  var emp = cleanEmp_(typeof arg === 'object' && arg ? arg.emp : arg);
  if (!emp) return [];
  if (!quoteAuth_(emp, typeof arg === 'object' && arg ? arg.tok : '')) return [];
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
  if (!quoteAuth_(emp, arg.tok)) return { ok: false, auth: true };
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
  var keys = [kind + '_n', 'dv']; for (var i = 0; i < 60; i++) keys.push(kind + '_' + i);
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
  if (!pwOk_(pw)) return { ok: false };
  var info = { ok: true, price: null, promo: null, lg: null, ck: null, ckm: null, history: [] };
  try { var p = readDataFile_('price'); if (p) info.price = JSON.parse(p).meta; } catch (e) {}
  try { var l = readDataFile_('lg'); if (l) info.lg = JSON.parse(l).meta; } catch (e) {}
  try { var c1 = readDataFile_('ck'); if (c1) info.ck = JSON.parse(c1).meta; } catch (e) {}
  try { var c2 = readDataFile_('ckm'); if (c2) info.ckm = JSON.parse(c2).meta; } catch (e) {}
  try { var q = readDataFile_('promo'); if (q) { var qq = JSON.parse(q); info.promo = qq.cleared ? { cleared: true } : qq.meta; } } catch (e) {}
  var it = dataFolder_().getFiles();
  while (it.hasNext()) {
    var f = it.next(), n = f.getName();
    if (/^(price|promo|lg|ck|ckm)_\d+\.json$/.test(n)) info.history.push({ name: n, at: Utilities.formatDate(f.getDateCreated(), TZ, 'yyyy-MM-dd HH:mm') });
  }
  info.history.sort(function (a, b) { return a.name < b.name ? 1 : -1; });
  info.history = info.history.slice(0, 20);
  return info;
}

/** 관리자: 단가표(price) 또는 추가 판촉(promo) 저장. payload = JSON 문자열 {data, meta} */
function adminSaveData(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
  var kind = kindOf_(arg.kind);
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
  if (!pwOk_(arg.pw)) return { ok: false };
  var kind = kindOf_(arg.kind);
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
  if (!pwOk_(pw)) return { ok: false };
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
  if (!pwOk_(arg.pw)) return { ok: false };
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
  // brand 'lg' → LG 계산기에서 보낸 모델('LG--' 접두어)만, 그 외에는 삼성 모델만
  // brand 'ck' → 쿠쿠 계산기 모델('CK--' 접두어)만
  var br = String(arg && arg.brand), lg = br === 'lg', kk = br === 'ck';
  var cache = CacheService.getScriptCache(), ck = 'best_' + (lg ? 'lg_' : kk ? 'ck_' : '') + days, c = cache.get(ck);
  if (c) return JSON.parse(c);
  var pick = function (rows) { return rows.filter(function (r) { var k = String(r[0]); return lg ? k.indexOf('LG--') === 0 : kk ? k.indexOf('CK--') === 0 : (k.indexOf('LG--') !== 0 && k.indexOf('CK--') !== 0); }); };
  var cur = pick(mvRank_(mvAgg_(mvDay_(days - 1), mvDay_(0)))), prev = pick(mvRank_(mvAgg_(mvDay_(days * 2 - 1), mvDay_(days))));
  var pr = {}; prev.forEach(function (r, i) { pr[r[0]] = i + 1; });
  var res = { days: days, at: Utilities.formatDate(new Date(), TZ, 'HH:mm'),
    list: cur.slice(0, 20).map(function (r) { return { code: r[0], view: r[1], add: r[2], print: r[3], save: r[4], prev: pr[r[0]] || 0 }; }) };
  cache.put(ck, JSON.stringify(res), 300);
  return res;
}
/** 관리자: 전체 모델 집계 */
function adminBest(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var days = [1, 7, 30].indexOf(Number(arg.days)) >= 0 ? Number(arg.days) : 7;
  var rows = mvRank_(mvAgg_(mvDay_(days - 1), mvDay_(0)));
  var tot = [0, 0, 0, 0]; rows.forEach(function (r) { for (var j = 0; j < 4; j++) tot[j] += r[1 + j]; });
  return { ok: true, days: days, total: tot, models: rows.length, list: rows.slice(0, 300) };
}


/* ===================== 강제 업데이트 (최소 버전) ===================== */
function minVerAt_() {
  var cache = CacheService.getScriptCache(), v = cache.get('minVerAt');
  if (v == null) { v = PropertiesService.getScriptProperties().getProperty('minVerAt') || '0'; cache.put('minVerAt', v, 21600); }
  return Number(v) || 0;
}
function minVer_() {
  var cache = CacheService.getScriptCache(), v = cache.get('minVer');
  if (v == null) { v = PropertiesService.getScriptProperties().getProperty('minVer') || ''; cache.put('minVer', v, 21600); }
  return v;
}
/** 관리자: 이 버전보다 낮은 화면은 자동으로 새로고침 (v7.6 이상 화면에서 동작) */
function adminSetMinVer(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var v = String(arg.ver || '').replace(/[^v0-9.]/g, '').slice(0, 10);
  var at = String(Date.now());
  PropertiesService.getScriptProperties().setProperty('minVer', v);
  PropertiesService.getScriptProperties().setProperty('minVerAt', at);   // 강제 업데이트 누른 시각 (이전에 로그인한 화면은 로그아웃)
  CacheService.getScriptCache().put('minVer', v, 21600);
  CacheService.getScriptCache().put('minVerAt', at, 21600);
  return { ok: true, ver: v };
}


/* ===================== 기능 사용 통계 ===================== */
var FU_SHEET = '기능통계';
/* ---------- 이용 약관 동의 기록 (로그인할 때마다 한 줄) ---------- */
var TERMS_SHEET = '약관동의';
function termsSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(TERMS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(TERMS_SHEET);
    sh.appendRow(['동의 시각', '사번', '이름', '지점', '직책', '기기', '계산기']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e0e7ff');
  }
  return sh;
}
function termsAgree(arg) {
  arg = arg || {};
  var emp = cleanEmp_(arg.emp);
  if (!emp) return { ok: false };
  var me = meInfo_(emp) || {}, b = { ss: '삼성', lg: 'LG', ck: '쿠쿠' }[arg.b] || '';
  var lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) {}
  try {
    termsSheet_().appendRow([Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'), "'" + emp, me.name || '', me.br || '', me.rank || '', String(arg.dev || '').slice(0, 60), b]);
  } finally { try { lock.releaseLock(); } catch (e) {} }
  return { ok: true };
}
/** 기간 안의 사번별 약관 동의 → { 사번: [마지막 시각, 횟수] } */
function termsMap_(from, to) {
  var sh = termsSheet_(), n = sh.getLastRow(), o = {};
  if (n < 2) return o;
  sh.getRange(2, 1, n - 1, 2).getDisplayValues().forEach(function (r) {
    var t = String(r[0]), d = t.slice(0, 10).replace(/-/g, ''), e = cleanEmp_(r[1]);
    if (!e || d < from || d > to) return;
    var a = o[e] || (o[e] = ['', 0]);
    a[1]++; if (t > a[0]) a[0] = t;
  });
  return o;
}
function fuBuffer_(cache, fu, emp) {
  var buf = JSON.parse(cache.get('fubuf') || '{}'), d = today_(), n = 0;
  Object.keys(fu).slice(0, 80).forEach(function (k) {
    var key = String(k).replace(/[^0-9A-Za-z가-힣:_\-]/g, '').slice(0, 30), v = Math.min(500, Number(fu[k]) || 0);
    if (!key || !v) return;
    var bk = d + '|' + key, a = buf[bk] || [0, '', {}];
    a[0] += v;
    if (emp && key.indexOf(':') < 0 && (',' + a[1] + ',').indexOf(',' + emp + ',') < 0 && a[1].length < 3000) a[1] = a[1] ? a[1] + ',' + emp : emp;
    if (emp && key.indexOf(':') < 0) { var c = a[2] || (a[2] = {}); c[emp] = (c[emp] || 0) + v; }   // 사번별 횟수
    buf[bk] = a; n++;
  });
  if (n) cache.put('fubuf', JSON.stringify(buf), 21600);
}
function fuSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(FU_SHEET);
  if (!sh) {
    sh = ss.insertSheet(FU_SHEET);
    sh.appendRow(['날짜', '기능', '횟수', '사번', '사번별 횟수']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e0e7ff');
  }
  return sh;
}
/** '135792:3,246810:1' ↔ {135792:3, 246810:1} */
function fuCntParse_(s) {
  var o = {};
  String(s || '').split(',').forEach(function (p) { var i = p.lastIndexOf(':'); if (i > 0) { var e = p.slice(0, i); o[e] = (o[e] || 0) + (Number(p.slice(i + 1)) || 0); } });
  return o;
}
function fuCntStr_(o) { return Object.keys(o || {}).map(function (e) { return e + ':' + o[e]; }).join(',').slice(0, 45000); }
/** mvMaybeFlush_ 안(락 보유)에서 호출 */
function fuFlush_(cache) {
  var buf = JSON.parse(cache.get('fubuf') || '{}'), keys = Object.keys(buf);
  if (!keys.length) return;
  var sh = fuSheet_(), n = sh.getLastRow(), idx = {}, vals = [];
  if (!sh.getRange(1, 5).getValue()) sh.getRange(1, 5).setValue('사번별 횟수').setFontWeight('bold').setBackground('#e0e7ff');
  if (n >= 2) { vals = sh.getRange(2, 1, n - 1, 5).getValues(); vals.forEach(function (r, i) { idx[String(r[0]) + '|' + String(r[1])] = i; }); }
  var add = [];
  keys.forEach(function (k) {
    var a = buf[k], i = idx[k];
    if (i != null) {
      vals[i][2] = Number(vals[i][2] || 0) + a[0];
      if (a[1]) { var set = {}; String(vals[i][3] || '').split(',').concat(a[1].split(',')).forEach(function (e) { if (e) set[e] = 1; }); vals[i][3] = Object.keys(set).join(',').slice(0, 40000); }
      if (a[2] && Object.keys(a[2]).length) { var c = fuCntParse_(vals[i][4]); Object.keys(a[2]).forEach(function (e) { c[e] = (c[e] || 0) + a[2][e]; }); vals[i][4] = fuCntStr_(c); }
    } else { var p = k.split('|'); add.push([p[0], p[1], a[0], a[1], fuCntStr_(a[2])]); }
  });
  if (vals.length) sh.getRange(2, 1, vals.length, 5).setValues(vals);
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 5).setValues(add);
  cache.put('fubuf', '{}', 21600);
}
/** 브랜드 구분: LG 화면 기록은 'L_' 접두어. brand '' = 전체(접두어 떼고 합침), 'ss' = 삼성만, 'lg' = LG만 */
function fuKey_(k, brand) {
  k = String(k);
  if (k === 'lg') return null;   // 예전 LG 입장 표시
  var isLg = k.indexOf('L_') === 0, isCk = k.indexOf('K_') === 0, b = isLg ? 'lg' : isCk ? 'ck' : 'ss';   // 쿠쿠 화면 기록은 'K_' 접두어
  if (brand && brand !== b) return null;
  return isLg || isCk ? k.slice(2) : k;
}
function fuAgg_(from, to, brand) {
  var out = {}, sh = fuSheet_(), n = sh.getLastRow();
  var addRow = function (d, k, c, emps) {
    if (d < from || d > to) return;
    k = fuKey_(k, brand); if (k == null) return;
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
function fuDaily_(nDays, brand) {
  var from = mvDay_(nDays - 1), to = mvDay_(0), out = {};
  for (var i = 0; i < nDays; i++) out[mvDay_(i)] = { n: 0, e: {} };
  var add = function (d, k, c, emps) {
    k = fuKey_(k, brand);
    if (k == null || d < from || d > to || k.indexOf(':') >= 0 || !out[d]) return;
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
  if (!pwOk_(arg.pw)) return { ok: false };
  var days = [1, 7, 30].indexOf(Number(arg.days)) >= 0 ? Number(arg.days) : 7, cur, prev, date = String(arg.date || '').replace(/[^0-9]/g, '');
  var brand = arg.brand === 'ss' || arg.brand === 'lg' || arg.brand === 'ck' ? arg.brand : '';
  if (date.length === 8) {   // 특정 날짜 하루 (이전 날과 비교)
    var dt = new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)));
    var pd = Utilities.formatDate(new Date(dt.getTime() - 86400000), TZ, 'yyyyMMdd');
    cur = fuAgg_(date, date, brand); prev = fuAgg_(pd, pd, brand); days = 1;
  } else { cur = fuAgg_(mvDay_(days - 1), mvDay_(0), brand); prev = fuAgg_(mvDay_(days * 2 - 1), mvDay_(days), brand); }
  var users = {}, list = Object.keys(cur).map(function (k) {
    if (k.indexOf(':') < 0) Object.keys(cur[k].e).forEach(function (e) { users[e] = 1; });
    return { k: k, n: cur[k].n, u: Object.keys(cur[k].e).length, prev: prev[k] ? prev[k].n : 0 };
  }).sort(function (a, b) { return b.n - a.n; });
  var addE = cur.add ? cur.add.e : {}, done = 0;
  Object.keys(addE).forEach(function (e) { if ((cur.print && cur.print.e[e]) || (cur.save && cur.save.e[e]) || (cur.copy && cur.copy.e[e])) done++; });
  return { ok: true, brand: brand, days: days, date: date.length === 8 ? date : '', list: list, users: Object.keys(users).length, addUsers: Object.keys(addE).length, done: done, daily: fuDaily_(14, brand) };
}


/** 관리자: 사번별 삼성 · LG 이용 현황 (기능통계 시트의 사번 기록으로 계산)
 *  삼성 = 'L_' 없는 기능 · LG = 'L_' 기능 또는 예전 'lg' 입장 표시. ':' 들어간 항목은 사번이 없어 제외
 *  반환 rows: emp → [삼성 이용일, 삼성 담은 날, 삼성 견적 낸 날, 삼성 마지막, LG 4칸, 쿠쿠 4칸('K_' 기능)] */
function adminEmpUsage(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var days = [7, 30, 90].indexOf(Number(arg.days)) >= 0 ? Number(arg.days) : 0;
  var from = days ? mvDay_(days - 1) : '00000000', to = mvDay_(0), U = {}, first = '';
  var QK = { print: 1, copy: 1, save: 1 };
  var add = function (d, k, emps, cn) {
    k = String(k); d = String(d); cn = cn || {};
    if (!emps || d < from || d > to || k.indexOf(':') >= 0) return;
    var lg = k === 'lg' || k.indexOf('L_') === 0, ckb = k.indexOf('K_') === 0, b = lg ? 1 : ckb ? 2 : 0, kk = (k.indexOf('L_') === 0 || ckb) ? k.slice(2) : k;
    if (!first || d < first) first = d;
    String(emps).split(',').forEach(function (e) {
      e = cleanEmp_(e); if (!e) return;
      var u = U[e] || (U[e] = [{}, {}, {}]), o = u[b], c = Number(cn[e]) || 1;
      (o.d || (o.d = {}))[d] = 1;
      if (kk !== 'open' && k !== 'lg') { var f = o.f || (o.f = {}); (f[kk] || (f[kk] = {}))[d] = 1; var fn = o.fn || (o.fn = {}); fn[kk] = (fn[kk] || 0) + c; o.n = (o.n || 0) + c; }
      if (kk === 'add') { (o.a || (o.a = {}))[d] = 1; o.an = (o.an || 0) + c; }
      if (QK[kk]) { (o.q || (o.q = {}))[d] = 1; o.qn = (o.qn || 0) + c; }
    });
  };
  var sh = fuSheet_(), n = sh.getLastRow();
  if (n >= 2) sh.getRange(2, 1, n - 1, 5).getValues().forEach(function (r) { add(r[0], r[1], r[3], fuCntParse_(r[4])); });
  var buf = JSON.parse(CacheService.getScriptCache().get('fubuf') || '{}');
  Object.keys(buf).forEach(function (k) { var p = k.split('|'); add(p[0], p[1], buf[k][1], buf[k][2]); });
  var cnt = function (o) { return o ? Object.keys(o).length : 0; }, last = function (o) { var k = o ? Object.keys(o).sort() : []; return k.length ? k[k.length - 1] : ''; };
  var rows = {}, feats = {}, cnts = {}, featN = {};
  var fd = function (o) { var r = {}; Object.keys(o.f || {}).forEach(function (k) { r[k] = cnt(o.f[k]); }); return r; };
  Object.keys(U).forEach(function (e) { var s = U[e][0], l = U[e][1], q = U[e][2] || {};
    rows[e] = [cnt(s.d), cnt(s.a), cnt(s.q), last(s.d), cnt(l.d), cnt(l.a), cnt(l.q), last(l.d), cnt(q.d), cnt(q.a), cnt(q.q), last(q.d)];
    feats[e] = [fd(s), fd(l), fd(q)];   // 사번별 기능 → 쓴 날 수
    cnts[e] = [[s.n || 0, s.an || 0, s.qn || 0], [l.n || 0, l.an || 0, l.qn || 0], [q.n || 0, q.an || 0, q.qn || 0]];   // 기능 · 담기 · 견적 횟수
    featN[e] = [s.fn || {}, l.fn || {}, q.fn || {}]; });   // 사번별 기능 → 횟수
  var terms = {}; try { terms = termsMap_(from, to); } catch (e) {}
  return { ok: true, days: days, from: days ? from : first, to: to, rows: rows, feats: feats, cnts: cnts, featN: featN, terms: terms, roster: rosterMap_(),
    at: Utilities.formatDate(new Date(), TZ, 'yyyy.MM.dd HH:mm') };
}


/* ===================== LG 카드 정책 이미지 =====================
 * 관리자가 올린 원본은 드라이브에 보관 → 깃허브 액션(5분마다)이 저장소 cardpol/ 폴더로 옮겨 담아
 * 직원 화면은 깃허브 페이지에서 바로 빠르게 읽음 (토큰 필요 없음) */
var CARDPOL_FOLDER_NAME = '삼성AI구독_LG카드정책';
function cardPolFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('cardPolFolderId');
  try { if (id) return DriveApp.getFolderById(id); } catch (e) {}
  var it = DriveApp.getFoldersByName(CARDPOL_FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(CARDPOL_FOLDER_NAME);
  props.setProperty('cardPolFolderId', folder.getId());
  return folder;
}
function cardPolRead_() {
  var v = PropertiesService.getScriptProperties().getProperty('cardPol');
  try { var o = v ? JSON.parse(v) : null; if (o && o.imgs) return o; } catch (e) {}
  return { at: '', imgs: [] };
}
function cardPolSave_(o) {
  o.at = Utilities.formatDate(new Date(), TZ, 'yyyy.MM.dd HH:mm:ss');
  PropertiesService.getScriptProperties().setProperty('cardPol', JSON.stringify(o));
  return o;
}
/** 누구나 (깃허브 동기화용): 현재 목록 */
function getCardPolicy() { return cardPolRead_(); }
/** 누구나 (깃허브 동기화용): 목록에 있는 이미지 한 장의 원본 */
function cardPolImage(arg) {
  var id = String(arg && arg.id || ''), o = cardPolRead_();
  if (!o.imgs.some(function (x) { return x.id === id; })) return { ok: false };
  var b = DriveApp.getFileById(id).getBlob();
  return { ok: true, mime: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) };
}
/** 관리자: 이미지 한 장 올리기 (data: base64) → 목록 끝에 추가 */
function adminCardPolicyUpload(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
  var m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(arg.data || ''));
  if (!m) return { ok: false, msg: '이미지 파일만 올릴 수 있어요.' };
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 8 * 1024 * 1024) return { ok: false, msg: '이미지가 너무 커요 (8MB 이하).' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, msg: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[m[1]];
    var f = cardPolFolder_().createFile(Utilities.newBlob(bytes, m[1], 'cardpol_' + Date.now() + '.' + ext));
    var o = cardPolRead_();
    o.imgs.push({ id: f.getId(), ext: ext, name: cleanStr_(arg.name, 60), w: Number(arg.w) || 0, h: Number(arg.h) || 0 });
    return { ok: true, pol: cardPolSave_(o) };
  } finally { lock.releaseLock(); }
}
/** 관리자: 순서 바꾸기 · 빠진 이미지는 드라이브 휴지통으로 */
function adminCardPolicySet(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, msg: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var o = cardPolRead_(), keep = (arg.ids || []).map(String), by = {};
    o.imgs.forEach(function (x) { by[x.id] = x; });
    o.imgs.forEach(function (x) { if (keep.indexOf(x.id) < 0) { try { DriveApp.getFileById(x.id).setTrashed(true); } catch (e) {} } });
    o.imgs = keep.filter(function (id) { return by[id]; }).map(function (id) { return by[id]; });
    return { ok: true, pol: cardPolSave_(o) };
  } finally { lock.releaseLock(); }
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
/* ---------- 직원 PIN (4자리) ----------
   - 관리자 화면 'PIN 필수'(스크립트 속성 PIN_REQUIRED=Y)를 켜야 PIN을 확인해요. 꺼져 있으면 지금처럼 사번만으로 입장.
   - 테스트 화면은 꺼져 있어도 PIN을 확인해요 (pinMode:'test').
   - 켜면 토큰 없는 견적 보관함 요청도 막아요. 화면은 heartbeat의 pinReq로 알아채고, 토큰 없는 기기는 PIN 입력 화면으로 보내요.
   - PIN은 원문이 아니라 해시로 견적 시트 파일의 'PIN' 탭에 저장. 사번당 5번 틀리면 30분 잠금. */
var PIN_SHEET = 'PIN', PIN_MAX_FAIL = 5, PIN_LOCK_SEC = 1800;
/* PIN 필수 여부: heartbeat(75초마다)에서도 읽어서 캐시에 10분 보관 (스크립트 속성 읽기는 하루 5만 번 제한) */
function pinRequired_() {
  var cache = CacheService.getScriptCache(), v = cache.get('pinReq');
  if (v == null) { v = PropertiesService.getScriptProperties().getProperty('PIN_REQUIRED') === 'Y' ? 'Y' : 'N'; cache.put('pinReq', v, 600); }
  return v === 'Y';
}
function pinSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(PIN_SHEET);
  if (!sh) { sh = ss.insertSheet(PIN_SHEET); sh.appendRow(['사번', 'PIN 해시', '토큰', '설정 시각']); sh.setFrozenRows(1); }
  return sh;
}
function pinSalt_() {
  var p = PropertiesService.getScriptProperties(), v = p.getProperty('PIN_SALT');
  if (!v) { v = Utilities.getUuid(); p.setProperty('PIN_SALT', v); }
  return v;
}
function pinHash_(emp, pin) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, emp + ':' + pin + ':' + pinSalt_(), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function pinRow_(sh, emp) {
  var n = sh.getLastRow(); if (n < 2) return 0;
  var v = sh.getRange(2, 1, n - 1, 1).getDisplayValues();
  for (var i = 0; i < v.length; i++) if (cleanEmp_(v[i][0]) === emp) return i + 2;
  return 0;
}
/** 새 토큰 (기기마다 하나 · 사번당 최근 5개) */
function pinIssue_(sh, row, emp) {
  var tok = Utilities.getUuid().replace(/-/g, ''), c = sh.getRange(row, 3), L = String(c.getValue() || '').split(',').filter(String);
  L.unshift(tok); c.setValue(L.slice(0, 5).join(','));
  CacheService.getScriptCache().remove('tok_' + emp);
  return tok;
}
function tokOk_(emp, tok) {
  emp = cleanEmp_(emp); tok = String(tok || '');
  if (!emp || !/^[0-9a-f]{32}$/.test(tok)) return false;
  var c = CacheService.getScriptCache(), k = 'tok_' + emp, v = c.get(k);
  if (v == null) { var sh = pinSheet_(), r = pinRow_(sh, emp); v = r ? String(sh.getRange(r, 3).getValue() || '') : ''; c.put(k, v, 600); }
  return v.split(',').indexOf(tok) >= 0;
}
/** 견적 보관함: 토큰을 보냈으면 반드시 맞아야 하고, PIN_REQUIRED면 토큰이 있어야 함 */
function quoteAuth_(emp, tok) {
  if (tok) return tokOk_(emp, tok);
  return !pinRequired_();
}
/** 입장할 때 PIN 확인 → { ok, tok } 또는 { ok:false, reason: pin_new | pin | pin_bad | pin_locked } */
function pinCheck_(emp, arg) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(8000); } catch (e) { return { ok: false, reason: 'busy' }; }
  try {
    var sh = pinSheet_(), row = pinRow_(sh, emp), now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    if (!row) {
      var np = String(arg.newPin || '');
      if (!/^[0-9]{4}$/.test(np)) return { ok: false, reason: 'pin_new' };
      sh.appendRow(["'" + emp, pinHash_(emp, np), '', now]); row = sh.getLastRow();
      return { ok: true, tok: pinIssue_(sh, row, emp), pinNew: true };
    }
    var c = CacheService.getScriptCache(), fk = 'pinf_' + emp, f = Number(c.get(fk) || 0);
    if (f >= PIN_MAX_FAIL) return { ok: false, reason: 'pin_locked' };
    var pin = String(arg.pin || '');
    if (!/^[0-9]{4}$/.test(pin)) return { ok: false, reason: 'pin' };
    if (pinHash_(emp, pin) !== String(sh.getRange(row, 2).getValue())) {
      c.put(fk, String(f + 1), PIN_LOCK_SEC);
      return { ok: false, reason: f + 1 >= PIN_MAX_FAIL ? 'pin_locked' : 'pin_bad', left: PIN_MAX_FAIL - f - 1 };
    }
    c.remove(fk);
    return { ok: true, tok: pinIssue_(sh, row, emp) };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
/** 사번 입력 화면 안내용: PIN 필수가 켜졌는지만 알려 줌 */
function pinInfo() { return { on: pinRequired_() }; }
/** 관리자: PIN 필수 켜기 · 끄기 (켜면 모든 화면에서 PIN 입장 · 토큰 없는 보관함 요청 차단) */
function adminPinRequiredSet(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
  var props = PropertiesService.getScriptProperties();
  if (arg.on) props.setProperty('PIN_REQUIRED', 'Y'); else props.deleteProperty('PIN_REQUIRED');
  CacheService.getScriptCache().put('pinReq', arg.on ? 'Y' : 'N', 600);   /* 바로 반영 */
  return { ok: true, on: pinRequired_() };
}
/** 관리자: PIN 상태 (필수 여부 · PIN 정한 인원) */
function adminPinInfo(pw) {
  if (!pwOk_(pw)) return { ok: false };
  var sh = pinSheet_();
  return { ok: true, on: pinRequired_(), n: Math.max(0, sh.getLastRow() - 1) };
}
/** 관리자: PIN 정한 사번 목록 { 사번: 설정 시각 } */
function adminPinList(pw) {
  if (!pwOk_(pw)) return { ok: false };
  var sh = pinSheet_(), n = sh.getLastRow(), o = {};
  if (n >= 2) sh.getRange(2, 1, n - 1, 4).getDisplayValues().forEach(function (r) { var e = cleanEmp_(r[0]); if (e) o[e] = String(r[3] || ''); });
  return { ok: true, on: pinRequired_(), pins: o };
}
/** 관리자: 직원 PIN 초기화 (다음 입장 때 새로 정함 · 기존 기기 토큰도 모두 무효) */
function adminPinReset(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
  var emp = cleanEmp_(arg.emp); if (!emp) return { ok: false, msg: '사번을 확인해 주세요.' };
  var sh = pinSheet_(), row = pinRow_(sh, emp);
  if (!row) return { ok: false, msg: '아직 PIN을 정하지 않은 사번이에요.' };
  sh.deleteRow(row);
  var c = CacheService.getScriptCache(); c.remove('tok_' + emp); c.remove('pinf_' + emp);
  return { ok: true };
}
function checkEmp(arg) {
  var emp = typeof arg === 'object' && arg ? arg.emp : arg, did = typeof arg === 'object' && arg ? arg.did : '';
  if (isBlocked_(emp, did)) return { ok: false, reason: 'blocked' };
  if (!rosterAllowed_(emp)) { nrLog_(emp, 'r', typeof arg === 'object' ? arg : {}); return { ok: false, reason: 'roster' }; }
  if ((typeof arg === 'object' && arg && arg.pinMode === 'test') || pinRequired_()) {
    if (!(typeof arg === 'object' && arg)) return { ok: false, reason: 'pin' };
    var pr = pinCheck_(cleanEmp_(emp), arg);
    if (!pr.ok) return pr;
    return { ok: true, me: meInfo_(emp), tok: pr.tok, pinNew: !!pr.pinNew };
  }
  return { ok: true, me: meInfo_(emp) };
}
/** 본인 사번의 이름 · 지점 · 직책 (견적서 담당자 표시용) */
function meInfo_(emp) {
  try { var r = rosterMap_()[cleanEmp_(emp)]; return r ? { name: r[0] || '', br: r[1] || '', rank: r[2] || '' } : null; } catch (e) { return null; }
}
/** 관리자: 명부 + 설정 */
function adminRoster(pw) {
  if (!pwOk_(pw)) return { ok: false };
  var t = readDataFile_('roster'), d = null;
  try { d = t ? JSON.parse(t) : null; } catch (e) { d = null; }
  return { ok: true, map: d ? d.map : {}, meta: d ? d.meta : null, mode: rosterMode_(), ex: rosterEx_() };
}
/** 관리자: 명부 저장 (이전 명부는 백업) */
function adminSaveRoster(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false, msg: '비밀번호가 맞지 않아요.' };
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
  if (!pwOk_(arg.pw)) return { ok: false };
  var m = arg.mode === 'open' ? 'open' : 'strict';
  PropertiesService.getScriptProperties().setProperty('rosterMode', m);
  CacheService.getScriptCache().put('rosterModeC', m, 21600);
  return { ok: true, mode: m };
}
/** 관리자: 예외 허용 추가 / 해제 */
function adminRosterEx(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
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

/* ===================== 인쇄 기록 (누가 · 언제 · 어떤 모델로 견적서를 인쇄했는지) ===================== */
var QLOG_SHEET = '인쇄기록';
var QLOG_HEAD = ['일시', '사번', '브랜드', '견적서', '모델 수', '모델 상세', '월 납부액', '조건', '구분'];
var QLOG_BRAND = { ss: '삼성', lg: 'LG', ck: '쿠쿠' };
function qlogSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(QLOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(QLOG_SHEET);
    sh.appendRow(QLOG_HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, QLOG_HEAD.length).setFontWeight('bold').setBackground('#e8f3ff');
    sh.setColumnWidth(6, 520);
  }
  return sh;
}
/** 직원 화면: 견적서를 인쇄할 때 한 줄 기록 */
/** 추천 데이터 (1시간 캐시 · 모델 코드와 횟수만, 사번 · 고객 정보 없음)
    pairs: 인쇄 · 견적 기록에서 같은 견적에 같이 들어간 모델 쌍 { 모델: [[같이 담긴 모델, 횟수], …최대 5] }
    pop: 최근 30일 인기 점수 { 모델: 점수 } · fb: 추천 반응 { 모델: [보인 횟수, 누른 횟수] } */
function getPairs(brand) {
  var bn = QLOG_BRAND[brand]; if (!bn) return { pairs: {} };
  var cache = CacheService.getScriptCache(), ck = 'pairs_' + brand, hit = cache.get(ck);
  if (hit) return JSON.parse(hit);
  var sh = qlogSheet_(), n = sh.getLastRow(), cnt = {};
  if (n >= 2) sh.getRange(2, 1, n - 1, 9).getValues().forEach(function (r) {
    if (String(r[2]) !== bn || String(r[8]) === '테스트') return;
    var codes = String(r[5] || '').split(' / ').map(function (x) { return x.split(' (')[0].trim(); }).filter(String);
    codes = codes.filter(function (c, i) { return codes.indexOf(c) === i; });
    if (codes.length < 2) return;
    codes.forEach(function (a) { codes.forEach(function (b) { if (a === b) return; var o = cnt[a] || (cnt[a] = {}); o[b] = (o[b] || 0) + 1; }); });
  });
  var out = {};
  Object.keys(cnt).forEach(function (a) { out[a] = Object.keys(cnt[a]).map(function (b) { return [b, cnt[a][b]]; }).sort(function (x, y) { return y[1] - x[1]; }).slice(0, 5); });
  /* 인기: 최근 30일 조회 + 담기×3 + 인쇄×5 + 보관×4 (모델통계) */
  var pre = brand === 'lg' ? 'LG--' : brand === 'ck' ? 'CK--' : '', pop = {};
  try {
    var ag = mvAgg_(mvDay_(29), mvDay_(0));
    Object.keys(ag).forEach(function (k) {
      var isLg = k.indexOf('LG--') === 0, isCk = k.indexOf('CK--') === 0;
      if (pre ? k.indexOf(pre) !== 0 : (isLg || isCk)) return;
      var a = ag[k], v = a[0] + a[1] * 3 + a[2] * 5 + a[3] * 4; if (v > 0) pop[pre ? k.slice(pre.length) : k] = v;
    });
  } catch (e) {}
  var res = { pairs: out, pop: pop, fb: recFbMap_(brand) };
  try { var t = JSON.stringify(res); if (t.length < 95000) cache.put(ck, t, 3600); } catch (e) {}
  return res;
}
/* 추천 반응: 추천 팝업에 보인 횟수 · 담기/바꾸기 누른 횟수 (견적 시트 파일의 '추천반응' 탭) */
var RECFB_SHEET = '추천반응';
function recFbSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(RECFB_SHEET);
  if (!sh) { sh = ss.insertSheet(RECFB_SHEET); sh.appendRow(['브랜드', '모델', '보인 횟수', '누른 횟수', '마지막']); sh.setFrozenRows(1); }
  return sh;
}
function recFbMap_(brand) {
  var sh = recFbSheet_(), n = sh.getLastRow(), o = {};
  if (n >= 2) sh.getRange(2, 1, n - 1, 4).getValues().forEach(function (r) { if (String(r[0]) === brand) o[String(r[1])] = [Number(r[2]) || 0, Number(r[3]) || 0]; });
  return o;
}
/** 화면에서 추천 팝업을 닫을 때 한 번: { brand, shown:[모델…], ok:[누른 모델…] } */
function recFb(arg) {
  arg = arg || {};
  var brand = QLOG_BRAND[arg.brand] ? arg.brand : '';
  if (!brand || arg.test) return { ok: false };
  var shown = (Array.isArray(arg.shown) ? arg.shown : []).slice(0, 10).map(function (c) { return cleanStr_(c, 40); }).filter(String);
  var okL = (Array.isArray(arg.ok) ? arg.ok : []).slice(0, 10).map(function (c) { return cleanStr_(c, 40); }).filter(String);
  if (!shown.length) return { ok: false };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false };
  try {
    var sh = recFbSheet_(), n = sh.getLastRow(), rows = n >= 2 ? sh.getRange(2, 1, n - 1, 5).getValues() : [], idx = {};
    rows.forEach(function (r, i) { idx[r[0] + '|' + r[1]] = i; });
    var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
    var bump = function (c, col) { var k = brand + '|' + c, i = idx[k]; if (i === undefined) { rows.push([brand, c, 0, 0, now]); i = idx[k] = rows.length - 1; } rows[i][col] = (Number(rows[i][col]) || 0) + 1; rows[i][4] = now; };
    shown.forEach(function (c) { bump(c, 2); });
    okL.forEach(function (c) { bump(c, 3); });
    if (rows.length) sh.getRange(2, 1, rows.length, 5).setValues(rows);
  } finally { lock.releaseLock(); }
  return { ok: true };
}
function logQuote(arg) {
  arg = arg || {};
  var items = Array.isArray(arg.items) ? arg.items.slice(0, 30) : [];
  if (!items.length) return { ok: false };
  var detail = items.map(function (i) {
    i = i || {};
    return cleanStr_(i.code, 40) + ' (' + [cleanStr_(i.name, 60), cleanStr_(i.term, 60), cleanStr_(i.mon, 20)].filter(function (x) { return x; }).join(' · ') + ')';
  }).join(' / ');
  var row = [Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), cleanEmp_(arg.emp) || '-', QLOG_BRAND[arg.brand] || cleanStr_(arg.brand, 10),
             cleanStr_(arg.doc, 30), items.length, detail.slice(0, 3000), cleanStr_(arg.total, 30), cleanStr_(arg.cond, 200), arg.test ? '테스트' : '정식'];
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false };
  try { qlogSheet_().appendRow(row); } finally { lock.releaseLock(); }
  return { ok: true };
}
/** 관리자: 최근 인쇄 기록 (기간 · 최신순) */
function adminQuoteLog(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var days = [1, 7, 30, 90].indexOf(Number(arg.days)) >= 0 ? Number(arg.days) : 7;
  var from = Utilities.formatDate(new Date(Date.now() - (days - 1) * 86400000), TZ, 'yyyy-MM-dd');
  var sh = qlogSheet_(), n = sh.getLastRow(), out = [];
  if (n >= 2) {
    var start = Math.max(2, n - 4999);
    sh.getRange(start, 1, n - start + 1, QLOG_HEAD.length).getDisplayValues().forEach(function (r) {
      if (String(r[0]).slice(0, 10) < from) return;
      out.push({ ts: r[0], emp: r[1], brand: r[2], doc: r[3], n: Number(r[4]) || 0, detail: r[5], total: r[6], cond: r[7], src: r[8] });
    });
  }
  out.reverse();
  return { ok: true, days: days, list: out.slice(0, 1000), total: out.length, url: sh.getParent().getUrl() + '#gid=' + sh.getSheetId() };
}

/* ===================== 개선 요청 (직원 → 관리자, 관리자 답변 · 상태) ===================== */
var FB_SHEET = '개선요청';
var FB_HEAD = ['ID', '일시', '사번', '브랜드', '종류', '내용', '화면 정보', '상태', '답변', '답변일시', '구분'];
var FB_KINDS = ['불편한 점', '오류 신고', '새 기능', '계산 확인', '기타'];
var FB_STATUS = ['접수', '검토중', '반영완료', '보류'];
function fbSheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(FB_SHEET);
  if (!sh) {
    sh = ss.insertSheet(FB_SHEET);
    sh.appendRow(FB_HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, FB_HEAD.length).setFontWeight('bold').setBackground('#fff4d6');
    sh.setColumnWidth(6, 420); sh.setColumnWidth(9, 300);
  }
  return sh;
}
function fbText_(v, n) { return String(v == null ? '' : v).replace(/\r/g, '').replace(/\t/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n); }
function fbRow_(r) { return { id: String(r[0]), ts: String(r[1]), emp: String(r[2]), brand: String(r[3]), kind: String(r[4]), text: String(r[5]), info: String(r[6]), status: String(r[7] || '접수'), reply: String(r[8] || ''), rts: String(r[9] || ''), src: String(r[10] || '') }; }
function fbAll_() {
  var sh = fbSheet_(), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, FB_HEAD.length).getDisplayValues().filter(function (r) { return r[0]; }).map(fbRow_);
}
/** 직원: 개선 요청 보내기 */
function sendFeedback(arg) {
  arg = arg || {};
  var text = fbText_(arg.text, 1500);
  if (text.length < 2) return { ok: false, msg: '내용을 적어 주세요.' };
  var kind = FB_KINDS.indexOf(arg.kind) >= 0 ? arg.kind : '기타';
  var row = [Utilities.getUuid().slice(0, 8), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), cleanEmp_(arg.emp) || '-',
             QLOG_BRAND[arg.brand] || cleanStr_(arg.brand, 10), kind, text, cleanStr_(arg.info, 300), '접수', '', '', arg.test ? '테스트' : '정식'];
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return { ok: false, msg: '잠시 후 다시 시도해 주세요.' };
  try { fbSheet_().appendRow(row); } finally { lock.releaseLock(); }
  return { ok: true, id: row[0] };
}
/** 직원: 내가 보낸 요청 (최신순) */
function myFeedback(arg) {
  var emp = cleanEmp_(arg && arg.emp);
  if (!emp) return { ok: true, list: [] };
  var L = fbAll_().filter(function (x) { return x.emp === emp; }).reverse().slice(0, 30);
  L.forEach(function (x) { delete x.info; });
  return { ok: true, list: L };
}
/** 관리자: 전체 요청 */
function adminFeedback(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var sh = fbSheet_(), L = fbAll_().reverse();
  return { ok: true, list: L.slice(0, 500), total: L.length, url: sh.getParent().getUrl() + '#gid=' + sh.getSheetId() };
}
/** 관리자: 상태 · 답변 저장 */
function adminFeedbackSet(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var id = String(arg.id || ''), st = FB_STATUS.indexOf(arg.status) >= 0 ? arg.status : null;
  if (!id) return { ok: false };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return { ok: false };
  try {
    var sh = fbSheet_(), n = sh.getLastRow();
    if (n < 2) return { ok: false };
    var ids = sh.getRange(2, 1, n - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) !== id) continue;
      if (st) sh.getRange(i + 2, 8).setValue(st);
      if (arg.reply != null) { sh.getRange(i + 2, 9, 1, 2).setValues([[fbText_(arg.reply, 1000), arg.reply ? Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') : '']]); }
      return { ok: true };
    }
    return { ok: false };
  } finally { lock.releaseLock(); }
}

/* ===================== 상단 배너 (브랜드별 · 관리자가 켜고 끔) ===================== */
// mode: on(직접 입력한 배너) · off(숨김)
var BN_BRANDS = ['ss', 'lg', 'ck'];
function bnKey_(brand, test) { return 'banner_' + brand + (test ? '_test' : ''); }
function bnClean_(c) {
  c = c || {};
  var mode = c.mode === 'on' ? 'on' : 'off';   // 직접 입력 · 끄기 (자동 없음)
  var url = cleanStr_(c.url, 300);
  if (url && !/^https:\/\//i.test(url)) url = '';
  return { mode: mode, icon: cleanStr_(c.icon, 4), title: cleanStr_(c.title, 40), date: cleanStr_(c.date, 30), desc: cleanStr_(c.desc, 80),
           btn: cleanStr_(c.btn, 16), url: url, color: ['brand', 'red', 'dark', 'gold'].indexOf(c.color) >= 0 ? c.color : 'brand',
           at: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') };
}
/** 직원 화면: 이 계산기의 상단 배너 설정 (설정 전이면 null) */
function getBanner(arg) {
  arg = arg || {};
  var b = BN_BRANDS.indexOf(arg.brand) >= 0 ? arg.brand : 'ss';
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty(bnKey_(b, !!arg.test)) || (arg.test ? props.getProperty(bnKey_(b, false)) : null);
  return { ok: true, b: t ? JSON.parse(t) : null };
}
/** 관리자: 배너 저장 (테스트 화면에서 저장하면 테스트 화면에만 적용) */
function adminBannerSet(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var b = BN_BRANDS.indexOf(arg.brand) >= 0 ? arg.brand : null;
  if (!b) return { ok: false };
  var c = bnClean_(arg.cfg);
  if (c.mode === 'on' && !c.title) return { ok: false, msg: '배너 제목을 적어 주세요.' };
  PropertiesService.getScriptProperties().setProperty(bnKey_(b, !!arg.test), JSON.stringify(c));
  return { ok: true, b: c };
}



/* ===================== 사번별 일별 이용 기록 + 매일 밤 9시 엑셀 메일 =====================
 * - '일별이용' 시트에 날짜 × 사번 한 줄씩 영구 보관 (실사용 시간 · 조회 · 담기 · 캡처는 캐시에만 있어서 30분마다 시트로 옮겨 둠)
 * - 관리자 화면 '🧾 사번별 이용 > 📅 일별 기록'에서 날짜별 · 사번별로 확인
 * - 매일 21시: 오늘 · 누적 기록을 보기 좋게 정리한 엑셀(.xlsx)을 관리자 메일로 발송
 * 처음 한 번: Apps Script 편집기에서 setupDailyReport 함수를 실행해 권한 허용 (메일 발송 · 예약 실행 권한) */
var DAY_SHEET = '일별이용';
var DAY_HEAD = ['날짜', '사번', '이름', '지점', '첫 접속', '마지막 접속', '접속 횟수', '실사용(분)', '모델 조회', '모델 담기', '견적 캡처', '인쇄', '보관', '삼성 기능', 'LG 기능', '쿠쿠 기능', '이용 계산기', '기기'];
var REPORT_TO_DEFAULT = 'kiss5586@gmail.com';
var REPORT_FOLDER_NAME = 'AI구독계산기_일일리포트';
var BRAND_N = ['삼성', 'LG', '쿠쿠'];

function daySheet_() {
  var ss = quoteSheet_().getParent(), sh = ss.getSheetByName(DAY_SHEET);
  if (!sh) {
    sh = ss.insertSheet(DAY_SHEET);
    sh.getRange(1, 1, 1, DAY_HEAD.length).setValues([DAY_HEAD]).setFontWeight('bold').setBackground('#dbeafe');
    sh.setFrozenRows(1);
    sh.getRange('A:F').setNumberFormat('@');   // 날짜 · 사번 · 시각은 글자 그대로
  }
  return sh;
}
function dayFmt_(d) { return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8); }
function dayNorm_(v) { var s = String(v || '').replace(/[^0-9]/g, ''); return s.length >= 8 ? s.slice(0, 8) : ''; }
function dayEmpty_() { return { f: '', l: '', n: 0, am: 0, v: 0, ad: 0, c: 0, p: 0, s: 0, b: [0, 0, 0], u: [0, 0, 0], dev: '' }; }
function dayUsedTxt_(u) { return BRAND_N.filter(function (x, i) { return u[i]; }).join('·'); }

/** 기능통계 시트(+아직 시트에 안 들어간 캐시) → { 날짜: { 사번: { b:[브랜드별 기능 횟수], u:[쓴 브랜드], ad, q, cap } } } */
function fuEmpDays_(from, to) {
  var out = {};
  var add = function (d, k, emps, cn) {
    d = dayNorm_(d); k = String(k);
    if (!d || !emps || d < from || d > to || k.indexOf(':') >= 0) return;
    var lg = k === 'lg' || k.indexOf('L_') === 0, ckb = k.indexOf('K_') === 0, b = lg ? 1 : ckb ? 2 : 0, kk = (k.indexOf('L_') === 0 || ckb) ? k.slice(2) : k;
    var D = out[d] || (out[d] = {});
    String(emps).split(',').forEach(function (e) {
      e = cleanEmp_(e); if (!e) return;
      var o = D[e] || (D[e] = { b: [0, 0, 0], u: [0, 0, 0], ad: 0, q: 0, cap: 0 }), c = Number(cn && cn[e]) || 1;
      o.u[b] = 1;
      if (kk !== 'open' && k !== 'lg') o.b[b] += c;
      if (kk === 'add') o.ad += c;
      if (kk === 'print' || kk === 'save' || kk === 'copy') o.q += c;
      if (kk === 'capture') o.cap += c;
    });
  };
  var sh = fuSheet_(), n = sh.getLastRow();
  if (n >= 2) sh.getRange(2, 1, n - 1, 5).getValues().forEach(function (r) { add(r[0], r[1], r[3], fuCntParse_(r[4])); });
  var buf = JSON.parse(CacheService.getScriptCache().get('fubuf') || '{}');
  Object.keys(buf).forEach(function (k) { var p = k.split('|'); add(p[0], p[1], buf[k][1], buf[k][2]); });
  return out;
}

/** 저장소(접속 기록) + 캐시(실사용 · 조회 · 담기 · 캡처) + 기능통계로 그날 사번별 기록 만들기 */
function dayLive_(d, Fd, allProps) {
  var P = {}, U = {};
  try { P = JSON.parse((allProps ? allProps['emps_' + d] : PropertiesService.getScriptProperties().getProperty('emps_' + d)) || '{}'); } catch (e) {}
  try { U = JSON.parse(CacheService.getScriptCache().get('ua_' + d) || '{}'); } catch (e) {}
  Fd = Fd || {};
  var keys = {}, out = {};
  [P, U, Fd].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
  Object.keys(keys).forEach(function (e) {
    var p = P[e] || {}, u = U[e] || [0, 0, 0, 0], f = Fd[e] || { b: [0, 0, 0], u: [0, 0, 0], ad: 0, q: 0, cap: 0 }, r = dayEmpty_();
    r.f = p.first || ''; r.l = p.last || ''; r.n = Number(p.n) || 0; r.dev = p.dev || '';
    r.am = Math.round((Number(u[0]) || 0) / 60); r.v = Number(u[1]) || 0; r.ad = Math.max(Number(u[2]) || 0, f.ad); r.c = Math.max(Number(u[3]) || 0, f.cap);
    r.p = Number(p.p) || 0; r.s = Number(p.s) || 0; r.b = f.b.slice(); r.u = f.u.slice();
    if (!r.u[0] && !r.u[1] && !r.u[2] && (r.n || r.am || r.v)) r.u[0] = 1;   // 기능 기록이 없으면 삼성(기본 화면)으로
    out[e] = r;
  });
  return out;
}
/** 같은 날 기록 두 개 합치기 (숫자는 큰 값 · 첫 접속은 이른 값 · 마지막은 늦은 값) */
function dayMerge_(a, b) {
  var out = {};
  [a || {}, b || {}].forEach(function (src) {
    Object.keys(src).forEach(function (e) {
      var x = src[e], o = out[e];
      if (!o) { out[e] = JSON.parse(JSON.stringify(x)); return; }
      ['n', 'am', 'v', 'ad', 'c', 'p', 's'].forEach(function (k) { o[k] = Math.max(o[k] || 0, x[k] || 0); });
      if (x.f && (!o.f || x.f < o.f)) o.f = x.f;
      if (x.l && (!o.l || x.l > o.l)) o.l = x.l;
      for (var i = 0; i < 3; i++) { o.b[i] = Math.max(o.b[i] || 0, x.b[i] || 0); o.u[i] = (o.u[i] || x.u[i]) ? 1 : 0; }
      if (x.dev) o.dev = x.dev;
    });
  });
  return out;
}
/** 일별이용 시트 읽기 → { 날짜: { 사번: 기록 } } */
function dayRead_(from, to) {
  var sh = daySheet_(), n = sh.getLastRow(), out = {};
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, DAY_HEAD.length).getDisplayValues().forEach(function (r) {
    var d = dayNorm_(r[0]), e = cleanEmp_(r[1]);
    if (!d || !e || d < from || d > to) return;
    var used = String(r[16] || ''), x = dayEmpty_();
    x.f = r[4]; x.l = r[5]; x.n = Number(r[6]) || 0; x.am = Number(r[7]) || 0; x.v = Number(r[8]) || 0; x.ad = Number(r[9]) || 0; x.c = Number(r[10]) || 0;
    x.p = Number(r[11]) || 0; x.s = Number(r[12]) || 0; x.b = [Number(r[13]) || 0, Number(r[14]) || 0, Number(r[15]) || 0];
    x.u = BRAND_N.map(function (b, i) { return used.indexOf(b) >= 0 || x.b[i] > 0 ? 1 : 0; }); x.dev = r[17];
    (out[d] || (out[d] = {}))[e] = x;
  });
  return out;
}
/** 기간 기록: 시트 + (오늘 · 시트에 아직 없는 날은 실시간 계산) */
function dayRange_(from, to) {
  var S = dayRead_(from, to), F = fuEmpDays_(from, to), t = today_(), all = PropertiesService.getScriptProperties().getProperties(), out = {}, ds = {};
  Object.keys(S).forEach(function (d) { ds[d] = 1; });
  Object.keys(F).forEach(function (d) { ds[d] = 1; });
  Object.keys(all).forEach(function (k) { var m = /^emps_(\d{8})$/.exec(k); if (m && m[1] >= from && m[1] <= to) ds[m[1]] = 1; });
  if (t >= from && t <= to) ds[t] = 1;
  Object.keys(ds).forEach(function (d) {
    var v = (d === t || !S[d]) ? dayMerge_(S[d], dayLive_(d, F[d], all)) : S[d];
    if (Object.keys(v).length) out[d] = v;
  });
  return out;
}
/** 그날 기록을 시트에 저장 (이미 있으면 바꿔 씀) */
function daySnap_(d, F, all) {
  F = F || fuEmpDays_(d, d);
  var sh = daySheet_(), n = sh.getLastRow(), old = dayRead_(d, d)[d] || {};
  var rec = dayMerge_(old, dayLive_(d, F[d], all));
  var R = rosterMap_(), emps = Object.keys(rec);
  if (!emps.length) return 0;
  emps.sort(function (a, b) { return (rec[a].f || '99') < (rec[b].f || '99') ? -1 : 1; });
  var rows = emps.map(function (e) {
    var x = rec[e], m = R[e] || [];
    return [dayFmt_(d), e, m[0] || '', m[1] || '', x.f, x.l, x.n, x.am, x.v, x.ad, x.c, x.p, x.s, x.b[0], x.b[1], x.b[2], dayUsedTxt_(x.u), x.dev];
  });
  // 그날 줄 지우기 (아래쪽부터 연속 구간 단위)
  if (n >= 2) {
    var col = sh.getRange(2, 1, n - 1, 1).getDisplayValues(), runs = [], st = -1;
    for (var i = 0; i <= col.length; i++) {
      var hit = i < col.length && dayNorm_(col[i][0]) === d;
      if (hit && st < 0) st = i;
      if (!hit && st >= 0) { runs.push([st + 2, i - st]); st = -1; }
    }
    for (var j = runs.length - 1; j >= 0; j--) sh.deleteRows(runs[j][0], runs[j][1]);
  }
  var at = sh.getLastRow() + 1;
  sh.getRange(at, 1, rows.length, 6).setNumberFormat('@');
  sh.getRange(at, 1, rows.length, DAY_HEAD.length).setValues(rows);
  return rows.length;
}
/** 30분마다 한 번 (하트비트에서) 오늘 기록을 시트로 옮겨 둠 — 캐시가 사라져도 남도록 */
function dayMaybeSnap_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('daySnapT')) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return;
  try {
    if (cache.get('daySnapT')) return;
    cache.put('daySnapT', '1', 1800);
    daySnap_(today_());
  } catch (e) {
  } finally { lock.releaseLock(); }
}
/** 지난 날 중 시트에 없는 날 채우기 + 오래된 접속 기록(저장소) 정리 */
function dayBackfill_() {
  var props = PropertiesService.getScriptProperties(), all = props.getProperties(), t = today_(), S = dayRead_('00000000', t), F = null, n = 0;
  var keep = mvDay_(10);   // 접속 현황 탭(최근 7일)이 쓰는 기록은 남김
  Object.keys(all).forEach(function (k) {
    var m = /^emps_(\d{8})$/.exec(k); if (!m || m[1] >= t) return;
    if (!S[m[1]] || m[1] === mvDay_(1)) { F = F || fuEmpDays_('00000000', t); daySnap_(m[1], F, all); if (!S[m[1]]) n++; }
    else if (m[1] < keep) { try { props.deleteProperty(k); } catch (e) {} }
  });
  return n;
}

/** 관리자: 하루 사번별 기록 + 최근 14일 추이 */
function adminEmpDaily(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var t = today_(), d = dayNorm_(arg.date) || t;
  if (d > t) d = t;
  var dt = new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)), 12);
  var from = Utilities.formatDate(new Date(dt.getTime() - 13 * 86400000), TZ, 'yyyyMMdd');
  var A = dayRange_(from, d), cur = A[d] || {}, trend = [];
  for (var i = 13; i >= 0; i--) {
    var k = Utilities.formatDate(new Date(dt.getTime() - i * 86400000), TZ, 'yyyyMMdd'), o = A[k] || {}, s = { d: k, u: 0, am: 0, ad: 0, q: 0 };
    Object.keys(o).forEach(function (e) { var x = o[e]; s.u++; s.am += x.am; s.ad += x.ad; s.q += x.p + x.s; });
    trend.push(s);
  }
  var rows = Object.keys(cur).map(function (e) { var x = cur[e]; x.e = e; return x; });
  return { ok: true, date: d, today: t, rows: rows, trend: trend, roster: rosterMap_(), report: reportInfo_(), at: Utilities.formatDate(new Date(), TZ, 'yyyy.MM.dd HH:mm') };
}
/** 관리자: 한 사번의 날짜별 기록 */
function adminEmpHistory(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var emp = cleanEmp_(arg.emp), days = [30, 90].indexOf(Number(arg.days)) >= 0 ? Number(arg.days) : 0;
  if (!emp) return { ok: false };
  var A = dayRange_(days ? mvDay_(days - 1) : '00000000', today_()), list = [];
  Object.keys(A).sort().reverse().forEach(function (d) { var x = A[d][emp]; if (x) { x.d = d; list.push(x); } });
  return { ok: true, emp: emp, days: days, list: list };
}

/* ---------- 매일 21시 엑셀 메일 ---------- */
function reportTo_() { return PropertiesService.getScriptProperties().getProperty('REPORT_TO') || REPORT_TO_DEFAULT; }
function reportInfo_() {
  var p = PropertiesService.getScriptProperties(), on = false;
  try { on = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'dailyReport'; }); } catch (e) { on = null; }   // null = 아직 권한 허용 전
  return { to: reportTo_(), on: on, last: p.getProperty('REPORT_LAST') || '', err: p.getProperty('REPORT_ERR') || '' };
}
/** 처음 한 번 편집기에서 실행: 권한 허용 + 매일 21시 발송 · 23시 45분 기록 저장 예약 + 지난 기록 채우기 + 테스트 메일 */
function setupDailyReport() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['dailyReport', 'daySnapNight'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyReport').timeBased().everyDays(1).atHour(21).nearMinute(0).inTimezone(TZ).create();
  ScriptApp.newTrigger('daySnapNight').timeBased().everyDays(1).atHour(23).nearMinute(45).inTimezone(TZ).create();
  var n = dayBackfill_();
  var r = sendDailyReport_('[테스트] ');
  Logger.log('예약 완료 · 지난 기록 ' + n + '일 채움 · 테스트 메일 → ' + reportTo_() + ' (' + r + ')');
}
/** 자정 직전 오늘 기록 마무리 저장 */
function daySnapNight() { try { daySnap_(today_()); } catch (e) {} }
/** 예약 실행 (매일 21시) */
function dailyReport() { sendDailyReport_(''); }
/** 관리자: 받는 주소 바꾸기 · 예약 켜기/끄기 · 지금 보내기 */
function adminReportSet(arg) {
  arg = arg || {};
  if (!pwOk_(arg.pw)) return { ok: false };
  var p = PropertiesService.getScriptProperties();
  if (arg.to != null) {
    var to = String(arg.to).split(/[,;\s]+/).filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); }).slice(0, 5).join(',');
    if (!to) return { ok: false, msg: '메일 주소를 확인해 주세요' };
    p.setProperty('REPORT_TO', to);
  }
  try {
    if (arg.on === true && !reportInfo_().on) { ScriptApp.newTrigger('dailyReport').timeBased().everyDays(1).atHour(21).nearMinute(0).inTimezone(TZ).create(); ScriptApp.newTrigger('daySnapNight').timeBased().everyDays(1).atHour(23).nearMinute(45).inTimezone(TZ).create(); }
    if (arg.on === false) ScriptApp.getProjectTriggers().forEach(function (t) { if (['dailyReport', 'daySnapNight'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  } catch (e) { return { ok: false, msg: '권한 허용이 필요해요. Apps Script 편집기에서 setupDailyReport를 한 번 실행해 주세요.', info: reportInfo_() }; }
  if (arg.send) {
    var r = sendDailyReport_('[수동] ');
    if (r !== 'ok') return { ok: false, msg: r, info: reportInfo_() };
  }
  return { ok: true, info: reportInfo_() };
}

/** 엑셀 만들고 메일 보내기 → 'ok' 또는 오류 문구 */
function sendDailyReport_(tag) {
  var p = PropertiesService.getScriptProperties();
  try {
    try { daySnap_(today_()); } catch (e) {}
    try { dayBackfill_(); } catch (e) {}
    var R = buildReport_(today_());
    MailApp.sendEmail({ to: reportTo_(), subject: tag + R.subject, htmlBody: R.html, attachments: [R.blob], name: 'AI 구독 계산기' });
    p.setProperty('REPORT_LAST', Utilities.formatDate(new Date(), TZ, 'yyyy.MM.dd HH:mm') + ' → ' + reportTo_());
    try { tgReport_(tag, R); } catch (e) {}
    p.deleteProperty('REPORT_ERR');
    return 'ok';
  } catch (e) {
    var m = String(e && e.message || e).slice(0, 300);
    p.setProperty('REPORT_ERR', Utilities.formatDate(new Date(), TZ, 'MM.dd HH:mm') + ' ' + m);
    return m;
  }
}
/* ---------- 텔레그램 봇 ----------
   스크립트 속성 TG_TOKEN 에 봇 토큰을 넣고, 받을 사람이 봇에게 아무 말이나 한 번 보내면
   다음 리포트부터 그 채팅방으로 요약 + 엑셀 파일이 같이 가요. (받는 채팅방은 TG_CHAT 에 저장 · 쉼표로 여러 개) */
function tgToken_() { return PropertiesService.getScriptProperties().getProperty('TG_TOKEN') || ''; }
function tgApi_(method, payload) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + tgToken_() + '/' + method, { method: 'post', payload: payload, muteHttpExceptions: true });
  var j = JSON.parse(res.getContentText() || '{}');
  if (!j.ok) throw new Error('텔레그램 ' + method + ': ' + (j.description || res.getResponseCode()));
  return j.result;
}
/** 받을 채팅방: 저장된 것 + 봇에게 새로 말을 건 사람 */
function tgChats_() {
  var p = PropertiesService.getScriptProperties(), L = (p.getProperty('TG_CHAT') || '').split(',').filter(String);
  try {
    tgApi_('getUpdates', { timeout: 0 }).forEach(function (u) {
      var m = u.message || u.my_chat_member || {}, c = m.chat && String(m.chat.id);
      if (c && L.indexOf(c) < 0) L.push(c);
    });
  } catch (e) {}
  L = L.slice(0, 5);
  if (L.length) p.setProperty('TG_CHAT', L.join(','));
  return L;
}
function tgReport_(tag, R) {
  if (!tgToken_()) return;
  var p = PropertiesService.getScriptProperties();
  try {
    tgChats_().forEach(function (c) {
      tgApi_('sendMessage', { chat_id: c, text: tag + R.text });
      tgApi_('sendDocument', { chat_id: c, document: R.blob });
    });
    p.deleteProperty('TG_ERR');
  } catch (e) { p.setProperty('TG_ERR', Utilities.formatDate(new Date(), TZ, 'MM.dd HH:mm') + ' ' + String(e && e.message || e).slice(0, 200)); }
}
/** 편집기에서 실행: 채팅방 확인 + 테스트 메시지 */
function setupTelegram() {
  if (!tgToken_()) { Logger.log('스크립트 속성에 TG_TOKEN 을 먼저 넣어 주세요'); return; }
  var L = tgChats_();
  if (!L.length) { Logger.log('봇에게 아무 말이나 한 번 보낸 뒤 다시 실행해 주세요'); return; }
  L.forEach(function (c) { tgApi_('sendMessage', { chat_id: c, text: '✅ AI 구독 계산기 연결됐어요. 매일 21시 이용 리포트를 여기로 보내 드려요.' }); });
  Logger.log('연결 완료: ' + L.join(', '));
}
function reportFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('reportFolderId');
  try { if (id) return DriveApp.getFolderById(id); } catch (e) {}
  var it = DriveApp.getFoldersByName(REPORT_FOLDER_NAME), f = it.hasNext() ? it.next() : DriveApp.createFolder(REPORT_FOLDER_NAME);
  props.setProperty('reportFolderId', f.getId());
  return f;
}
/** 표 하나 쓰기: 제목 줄 꾸미기 · 줄무늬 · 칸 너비 */
function rpTable_(sh, row, head, rows, color) {
  var w = head.length;
  if (rows.length) head.forEach(function (h, i) { if (h === '사번') sh.getRange(row + 1, i + 1, rows.length, 1).setNumberFormat('@'); });   // 사번 앞자리 0 유지
  sh.getRange(row, 1, 1, w).setNumberFormat('@').setValues([head]).setFontWeight('bold').setFontColor('#ffffff').setBackground(color || '#1d4ed8')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(row, 30);
  if (rows.length) {
    var rg = sh.getRange(row + 1, 1, rows.length, w);
    rg.setValues(rows).setVerticalAlignment('middle');
    for (var i = 1; i < rows.length; i += 2) sh.getRange(row + 1 + i, 1, 1, w).setBackground('#f8fafc');
  }
  sh.getRange(row, 1, rows.length + 1, w).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  return row + rows.length + 1;
}
function rpTitle_(sh, row, text, sub) {
  sh.getRange(row, 1).setValue(text).setFontSize(13).setFontWeight('bold').setFontColor('#0f172a');
  if (sub) sh.getRange(row + 1, 1).setValue(sub).setFontColor('#64748b').setFontSize(9);
  return row + (sub ? 2 : 1);
}
function rpHeat_(sh, a1, color) {
  var rules = sh.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule().setGradientMinpointWithValue('#ffffff', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMaxpoint(color || '#3b82f6').setRanges([sh.getRange(a1)]).build());
  sh.setConditionalFormatRules(rules);
}
function rpPct_(a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; }
function rpMin_(m) { m = Number(m) || 0; return m >= 60 ? Math.floor(m / 60) + '시간 ' + (m % 60) + '분' : m + '분'; }

/** 리포트 엑셀 만들기 → { blob, subject, html } */
function buildReport_(t) {
  var A = dayRange_('00000000', t), R = rosterMap_(), dates = Object.keys(A).sort();
  var yd = mvDay_(1), all = PropertiesService.getScriptProperties().getProperties();
  var nm = function (e) { return (R[e] || [])[0] || ''; }, br = function (e) { return (R[e] || [])[1] || (R[e] ? '(지점 없음)' : '(명부 없음)'); }, rk = function (e) { return (R[e] || [])[2] || ''; };
  var bk = function (e) { return R[e] ? br(e) : '\uffff'; };   // 정렬용: 명부에 없는 사번은 맨 아래
  var daySum = function (d) {
    var o = A[d] || {}, s = { r: 0, u: 0, n: 0, am: 0, v: 0, ad: 0, c: 0, p: 0, s: 0, b: [0, 0, 0] };
    Object.keys(o).forEach(function (e) { var x = o[e]; s.u++; if (R[e]) s.r++; s.n += x.n; s.am += x.am; s.v += x.v; s.ad += x.ad; s.c += x.c; s.p += x.p; s.s += x.s; for (var i = 0; i < 3; i++) if (x.u[i]) s.b[i]++; });
    s.peak = Number(all['peak_' + d] || 0); s.visits = Number(all['visits_' + d] || 0);
    return s;
  };
  // 누적 (사번별)
  var C = {};
  dates.forEach(function (d) {
    Object.keys(A[d]).forEach(function (e) {
      var x = A[d][e], o = C[e] || (C[e] = { days: 0, d7: 0, first: d, last: d, n: 0, am: 0, v: 0, ad: 0, c: 0, p: 0, s: 0, bd: [0, 0, 0], bn: [0, 0, 0] });
      o.days++; if (d >= mvDay_(6)) o.d7++; if (d < o.first) o.first = d; if (d > o.last) o.last = d;
      ['n', 'am', 'v', 'ad', 'c', 'p', 's'].forEach(function (k) { o[k] += x[k] || 0; });
      for (var i = 0; i < 3; i++) { if (x.u[i]) o.bd[i]++; o.bn[i] += x.b[i] || 0; }
    });
  });
  var T = daySum(t), Y = daySum(yd), rosterN = Object.keys(R).length, cumUsers = Object.keys(C).length, cumR = Object.keys(C).filter(function (e) { return R[e]; }).length;
  var tdy = A[t] || {};

  var name = 'AI구독계산기_이용리포트_' + dayFmt_(t);
  var ss = SpreadsheetApp.create(name);
  try { DriveApp.getFileById(ss.getId()).moveTo(reportFolder_()); } catch (e) {}

  /* 1. 요약 */
  var sh = ss.getSheets()[0]; sh.setName('요약'); sh.setHiddenGridlines(true);
  var row = rpTitle_(sh, 1, '📊 AI 구독 계산기 이용 리포트 — ' + dayFmt_(t) + ' (' + Utilities.formatDate(new Date(), TZ, 'HH:mm') + ' 기준)',
    '명부 ' + rosterN + '명 · 기록 시작 ' + (dates[0] ? dayFmt_(dates[0]) : '-') + ' · 실사용 시간은 화면을 실제로 보고 있던 시간 (11/17 이후 정확)');
  row++;
  var kp = [['이용 인원 (명)', T.u, Y.u], ['  └ 명부 직원', T.r, Y.r], ['  └ 명부에 없는 사번', T.u - T.r, Y.u - Y.r], ['명부 직원 이용률 (%)', rpPct_(T.r, rosterN), rpPct_(Y.r, rosterN)], ['접속 횟수', T.n, Y.n], ['실사용 합계 (분)', T.am, Y.am],
    ['모델 조회', T.v, Y.v], ['모델 담기', T.ad, Y.ad], ['견적 캡처', T.c, Y.c], ['인쇄', T.p, Y.p], ['보관', T.s, Y.s],
    ['삼성 이용 인원', T.b[0], Y.b[0]], ['LG 이용 인원', T.b[1], Y.b[1]], ['쿠쿠 이용 인원', T.b[2], Y.b[2]], ['최대 동시 접속', T.peak, Y.peak]];
  var k0 = row;
  row = rpTable_(sh, row, ['항목', '오늘 ' + dayFmt_(t).slice(5), '어제 ' + dayFmt_(yd).slice(5), '증감'], kp.map(function (r) { return [r[0], r[1], r[2], Math.round((r[1] - r[2]) * 10) / 10]; }));
  var dRg = sh.getRange(k0 + 1, 4, kp.length, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#15803d').setRanges([dRg]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#dc2626').setRanges([dRg]).build()]);
  sh.getRange(k0 + 1, 2, kp.length, 3).setNumberFormat('#,##0.##;-#,##0.##;0').setHorizontalAlignment('right');
  sh.getRange(k0 + 1, 1, kp.length, 1).setFontWeight('bold');
  row++;
  row = rpTitle_(sh, row, '누적 (기록 시작 이후)');
  row = rpTable_(sh, row, ['누적 이용 인원', '명부 직원', '명부 직원 이용률 (%)', '누적 이용일 합계', '누적 실사용', '누적 담기', '누적 인쇄 + 보관'],
    [[cumUsers, cumR, rpPct_(cumR, rosterN), dates.reduce(function (a, d) { return a + Object.keys(A[d]).length; }, 0),
      rpMin_(Object.keys(C).reduce(function (a, e) { return a + C[e].am; }, 0)), Object.keys(C).reduce(function (a, e) { return a + C[e].ad; }, 0),
      Object.keys(C).reduce(function (a, e) { return a + C[e].p + C[e].s; }, 0)]], '#0f766e');
  row++;
  // 지점별
  var B = {};
  Object.keys(R).concat(Object.keys(C)).forEach(function (e) {
    var k = br(e), b = B[k] || (B[k] = { k: k, n: 0, seen: {}, td: 0, cum: 0, d7: 0, am: 0, amT: 0 });
    if (b.seen[e]) return; b.seen[e] = 1;
    if (R[e]) b.n++;
    if (tdy[e]) { b.td++; b.amT += tdy[e].am; }
    if (C[e]) { b.cum++; b.am += C[e].am; if (C[e].d7) b.d7++; }
  });
  var BL = Object.keys(B).map(function (k) { return B[k]; }).sort(function (a, b) { return b.n - a.n || (a.k < b.k ? -1 : 1); });
  row = rpTitle_(sh, row, '지점별 이용 현황', '이용률 = 이용 인원 ÷ 명부 인원');
  var b0 = row;
  row = rpTable_(sh, row, ['지점', '명부 인원', '오늘 이용', '오늘 이용률 (%)', '오늘 실사용 (분)', '최근 7일 이용', '누적 이용', '누적 이용률 (%)', '누적 실사용 (분)'],
    BL.map(function (b) { return [b.k, b.n, b.td, rpPct_(b.td, b.n), b.amT, b.d7, b.cum, rpPct_(b.cum, b.n), b.am]; }), '#7c3aed');
  if (BL.length) { rpHeat_(sh, 'D' + (b0 + 1) + ':D' + (b0 + BL.length), '#a78bfa'); rpHeat_(sh, 'H' + (b0 + 1) + ':H' + (b0 + BL.length), '#a78bfa'); }
  sh.setColumnWidth(1, 190); for (var ci = 2; ci <= 9; ci++) sh.setColumnWidth(ci, 105);

  /* 2. 오늘 사번별 */
  var s2 = ss.insertSheet('오늘 사번별');
  var L2 = Object.keys(tdy).sort(function (a, b) { return bk(a) < bk(b) ? -1 : bk(a) > bk(b) ? 1 : (tdy[b].am - tdy[a].am); });
  rpTable_(s2, 1, ['지점', '이름', '직책', '사번', '첫 접속', '마지막 접속', '접속 횟수', '실사용 (분)', '모델 조회', '모델 담기', '견적 캡처', '인쇄', '보관', '삼성 기능', 'LG 기능', '쿠쿠 기능', '이용 계산기', '기기'],
    L2.map(function (e) { var x = tdy[e]; return [br(e), nm(e), rk(e), e, x.f, x.l, x.n, x.am, x.v, x.ad, x.c, x.p, x.s, x.b[0], x.b[1], x.b[2], dayUsedTxt_(x.u), x.dev]; }));
  if (L2.length) { rpHeat_(s2, 'H2:H' + (L2.length + 1), '#60a5fa'); s2.getRange(1, 1, L2.length + 1, 18).createFilter(); }
  s2.setFrozenRows(1); s2.setFrozenColumns(2);

  /* 3. 누적 사번별 (명부 전원 · 미사용 포함) */
  var s3 = ss.insertSheet('누적 사번별'), seen = {}, L3 = [];
  Object.keys(R).concat(Object.keys(C)).forEach(function (e) { if (!seen[e]) { seen[e] = 1; L3.push(e); } });
  L3.sort(function (a, b) { return bk(a) < bk(b) ? -1 : bk(a) > bk(b) ? 1 : ((C[b] ? C[b].days : 0) - (C[a] ? C[a].days : 0)) || (nm(a) < nm(b) ? -1 : 1); });
  rpTable_(s3, 1, ['지점', '이름', '직책', '사번', '상태', '오늘 이용', '누적 이용일', '최근 7일 이용일', '첫 이용일', '마지막 이용일', '누적 실사용 (분)', '접속 횟수', '모델 조회', '모델 담기', '견적 캡처', '인쇄', '보관', '삼성 이용일', 'LG 이용일', '쿠쿠 이용일'],
    L3.map(function (e) {
      var o = C[e], st = !o ? '미사용' : o.d7 ? (o.d7 >= 3 ? '활발' : '최근 사용') : '7일 넘게 미사용';
      return o ? [br(e), nm(e), rk(e), e, st, tdy[e] ? 'O' : '', o.days, o.d7, dayFmt_(o.first), dayFmt_(o.last), o.am, o.n, o.v, o.ad, o.c, o.p, o.s, o.bd[0], o.bd[1], o.bd[2]]
        : [br(e), nm(e), rk(e), e, st, '', 0, 0, '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }), '#0f766e');
  if (L3.length) {
    var st3 = s3.getRange('E2:E' + (L3.length + 1)), rules3 = [];
    [['미사용', '#fee2e2', '#991b1b'], ['7일 넘게 미사용', '#ffedd5', '#9a3412'], ['활발', '#dcfce7', '#166534'], ['최근 사용', '#e0f2fe', '#075985']].forEach(function (c) {
      rules3.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(c[0]).setBackground(c[1]).setFontColor(c[2]).setBold(true).setRanges([st3]).build()); });
    s3.setConditionalFormatRules(rules3);
    rpHeat_(s3, 'G2:G' + (L3.length + 1), '#34d399'); rpHeat_(s3, 'K2:K' + (L3.length + 1), '#60a5fa');
    s3.getRange(1, 1, L3.length + 1, 20).createFilter();
  }
  s3.setFrozenRows(1); s3.setFrozenColumns(2);

  /* 4. 일별 추이 */
  var s4 = ss.insertSheet('일별 추이'), D4 = dates.slice().reverse();
  rpTable_(s4, 1, ['날짜', '요일', '이용 인원', '명부 직원 이용률 (%)', '접속 횟수', '실사용 (분)', '1인당 실사용 (분)', '모델 조회', '모델 담기', '견적 캡처', '인쇄', '보관', '삼성 이용', 'LG 이용', '쿠쿠 이용', '최대 동시 접속'],
    D4.map(function (d) { var s = daySum(d), dw = '일월화수목금토'.charAt(new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8))).getDay());
      return [dayFmt_(d), dw, s.u, rpPct_(s.r, rosterN), s.n, s.am, s.u ? Math.round(s.am / s.u) : 0, s.v, s.ad, s.c, s.p, s.s, s.b[0], s.b[1], s.b[2], s.peak]; }), '#0369a1');
  if (D4.length) { rpHeat_(s4, 'C2:C' + (D4.length + 1), '#38bdf8'); rpHeat_(s4, 'F2:F' + (D4.length + 1), '#60a5fa'); }
  s4.setFrozenRows(1);

  /* 5. 사번 × 날짜 (최근 31일 실사용 분 · 실사용 기록 전 날은 접속 횟수 대신 1) */
  var s5 = ss.insertSheet('사번×날짜'), D5 = [];
  for (var i = 30; i >= 0; i--) D5.push(mvDay_(i));
  var L5 = L3.filter(function (e) { return C[e] && D5.some(function (d) { return A[d] && A[d][e]; }); });
  rpTable_(s5, 1, ['지점', '이름', '사번', '31일 이용일'].concat(D5.map(function (d) { return Number(d.slice(4, 6)) + '/' + Number(d.slice(6, 8)); })),
    L5.map(function (e) { var cnt = 0, cells = D5.map(function (d) { var x = A[d] && A[d][e]; if (!x) return ''; cnt++; return x.am || 1; }); return [br(e), nm(e), e, cnt].concat(cells); }), '#334155');
  if (L5.length) { rpHeat_(s5, s5.getRange(2, 5, L5.length, D5.length).getA1Notation(), '#2563eb'); rpHeat_(s5, 'D2:D' + (L5.length + 1), '#34d399'); }
  for (var c5 = 5; c5 <= 4 + D5.length; c5++) s5.setColumnWidth(c5, 44);
  s5.setFrozenRows(1); s5.setFrozenColumns(3);
  s5.getRange(L5.length + 3, 1).setValue('칸의 숫자 = 그날 실사용(분), 1 = 들어왔지만 실사용 시간 기록 전이거나 1분 미만, 빈칸 = 안 들어옴 · 진할수록 오래 사용').setFontColor('#64748b');

  /* 6. 일별 원본 */
  var s6 = ss.insertSheet('일별 원본'), raw = [];
  D4.forEach(function (d) { Object.keys(A[d]).sort(function (a, b) { return bk(a) < bk(b) ? -1 : bk(a) > bk(b) ? 1 : 0; }).forEach(function (e) { var x = A[d][e];
    raw.push([dayFmt_(d), br(e), nm(e), e, x.f, x.l, x.n, x.am, x.v, x.ad, x.c, x.p, x.s, x.b[0], x.b[1], x.b[2], dayUsedTxt_(x.u)]); }); });
  rpTable_(s6, 1, ['날짜', '지점', '이름', '사번', '첫 접속', '마지막 접속', '접속 횟수', '실사용 (분)', '모델 조회', '모델 담기', '견적 캡처', '인쇄', '보관', '삼성 기능', 'LG 기능', '쿠쿠 기능', '이용 계산기'], raw, '#475569');
  if (raw.length) s6.getRange(1, 1, raw.length + 1, 17).createFilter();
  s6.setFrozenRows(1);

  [s2, s3, s4, s6].forEach(function (s) { try { s.autoResizeColumns(1, s.getLastColumn()); for (var c = 1; c <= s.getLastColumn(); c++) s.setColumnWidth(c, Math.max(70, Math.min(170, s.getColumnWidth(c) + 14))); } catch (e) {} });
  try { s5.autoResizeColumns(1, 3); } catch (e) {}
  SpreadsheetApp.flush();

  var blob = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } })
    .getBlob().setName(name + '.xlsx');

  // 메일 본문 (요약)
  var td = function (v, s) { return '<td style="padding:6px 10px;border:1px solid #e2e8f0;' + (s || '') + '">' + v + '</td>'; };
  var dlt = function (a, b) { var d = Math.round((a - b) * 10) / 10; return d > 0 ? '<span style="color:#15803d">▲' + d + '</span>' : d < 0 ? '<span style="color:#dc2626">▼' + (-d) + '</span>' : '-'; };
  var html = '<div style="font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#0f172a;max-width:640px">'
    + '<h2 style="margin:0 0 4px">📊 AI 구독 계산기 이용 리포트</h2><div style="color:#64748b;margin-bottom:14px">' + dayFmt_(t) + ' ' + Utilities.formatDate(new Date(), TZ, 'HH:mm') + ' 기준 · 명부 ' + rosterN + '명</div>'
    + '<table style="border-collapse:collapse;font-size:14px"><tr style="background:#1d4ed8;color:#fff">' + td('항목') + td('오늘') + td('어제') + td('증감') + '</tr>'
    + kp.map(function (r) { return '<tr>' + td('<b>' + r[0] + '</b>') + td(r[1], 'text-align:right') + td(r[2], 'text-align:right;color:#64748b') + td(dlt(r[1], r[2]), 'text-align:right') + '</tr>'; }).join('')
    + '</table><p style="margin:14px 0 6px"><b>누적</b> 이용 인원 ' + cumUsers + '명 (명부 직원 ' + cumR + '명 · ' + rpPct_(cumR, rosterN) + '%) · 기록 ' + dates.length + '일</p>'
    + '<p style="margin:0 0 6px"><b>오늘 많이 쓴 직원</b> ' + Object.keys(tdy).sort(function (a, b) { return tdy[b].am - tdy[a].am; }).slice(0, 5).map(function (e) { return (nm(e) || e) + '(' + br(e) + ' ' + rpMin_(tdy[e].am) + ')'; }).join(', ') + '</p>'
    + '<p style="color:#64748b;font-size:12px;margin-top:16px">첨부 엑셀: 요약 · 오늘 사번별 · 누적 사번별(미사용 직원 포함) · 일별 추이 · 사번×날짜 · 일별 원본<br>구글 드라이브 \'' + REPORT_FOLDER_NAME + '\' 폴더에도 같은 시트가 보관돼요.</p></div>';
  var top = Object.keys(tdy).sort(function (a, b) { return tdy[b].am - tdy[a].am; }).slice(0, 5).map(function (e) { return (nm(e) || e) + '(' + br(e) + ' ' + rpMin_(tdy[e].am) + ')'; }).join(', ');
  var text = '📊 AI 구독 계산기 이용 리포트\n' + dayFmt_(t) + ' ' + Utilities.formatDate(new Date(), TZ, 'HH:mm') + ' 기준 · 명부 ' + rosterN + '명\n\n'
    + kp.map(function (r) { return String(r[0]).replace(/^\s*└\s*/, ' · ') + ': ' + r[1] + ' (어제 ' + r[2] + ')'; }).join('\n')
    + '\n\n누적 이용 ' + cumUsers + '명 (명부 직원 ' + cumR + '명 · ' + rpPct_(cumR, rosterN) + '%) · 기록 ' + dates.length + '일'
    + (top ? '\n오늘 많이 쓴 직원: ' + top : '');
  return { blob: blob, subject: 'AI 구독 계산기 이용 리포트 ' + dayFmt_(t) + ' — 오늘 ' + T.u + '명 이용', html: html, text: text };
}
