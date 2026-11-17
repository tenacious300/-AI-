/* ⚙ 관리자 모드 코드 (삼성 · LG · 쿠쿠 공통 관리자)
   - index.html에서 ⚙ 관리자를 열 때만 한 번 불러와요 (직원 화면은 이 파일을 내려받지 않음)
   - index.html 계산기 코드 안에서 실행돼서 계산기의 변수 · 함수($ · gsr · S · D · ADM · toast …)를 그대로 써요
   - 수정은 test/admin.js 먼저 → python3 tools/smoke.py → python3 tools/promote.py promote
*/
function admLogin(){
  $('#admBody').innerHTML='<div style="font-size:13px;color:var(--sub);margin-top:4px">관리자 비밀번호를 입력하면 상세 정보를 볼 수 있어요.</div>'
    +'<div class="adm-pw"><input type="password" id="admPw" inputmode="numeric" placeholder="관리자 비밀번호" autocomplete="off"><button class="btn pri" id="admGo">확인</button></div><div id="admMsg" class="hint"></div>';
  var go=function(){var pw=$('#admPw').value.trim();if(!pw)return;$('#admMsg').textContent='확인 중…';
    if(!HAS_GS){$('#admMsg').textContent='배포된 웹앱 화면에서만 확인할 수 있어요.';return;}
    gsr('adminStats',pw,function(r){if(!r||!r.ok){$('#admMsg').textContent=r&&r.locked?r.msg:'비밀번호가 맞지 않아요.';return;}ADM.pw=pw;ADM.tab=ADMIN_LG?'lg':ADMIN_CK?'ck':'stat';rsLoad();admShow(r);if(ADMIN_LG||ADMIN_CK)admRender();admInfo();renderVer();
      clearInterval(ADM.t);ADM.t=setInterval(admRefresh,30000);},function(){$('#admMsg').textContent='서버에 연결하지 못했어요.';});};
  $('#admGo').onclick=go;$('#admPw').addEventListener('keydown',function(e){if(e.key==='Enter')go();});
  setTimeout(function(){$('#admPw').focus();},50);
}
function admRefresh(){if(!ADM.pw||!$('#admModal').classList.contains('on')||(ADM.tab&&ADM.tab!=='stat'))return;gsr('adminStats',ADM.pw,function(r){if(r&&r.ok)admShow(r);});}
function admShow(r){ADM.stat=r;if(r.rex){RS.ex=r.rex;if(RS.data)RS.data.ex=r.rex;}var qf=document.activeElement&&document.activeElement.id==='admQ';if((ADM.tab||'stat')==='stat'){if(qf)admTodayList();else admRender();}if(!FB.on){$('#liveN').textContent=r.online;$('#liveBtn').classList.remove('off');}}
function admStatHtml(r){
  var t=r.days[0]||{},te=r.todayEmps||[],bl=r.blocks||[],seg=ADM.seg||'now';
  var groups={};(r.sessions||[]).forEach(function(x){var k=x.emp||('#'+x.id);var g=groups[k];if(!g)g=groups[k]={k:k,list:[]};g.list.push(x);});
  var G=Object.keys(groups).map(function(k){var g=groups[k],act=g.list.filter(function(x){return !x.away;});g.main=(act.length?act:g.list).sort(function(a,b){return a.lastSec-b.lastSec;})[0];g.away=!act.length;
    g.lidle=g.list.every(function(x){return (x.idle||0)>=30;});var dd={};g.list.forEach(function(x){if(x.did)dd[x.did]=1;});g.devs=Object.keys(dd).length;
    var ri=g.main.emp&&rInfo(g.main.emp);g.br=ri?ri[1]:'';return g;});
  G.sort(function(a,b){return (a.lidle-b.lidle)||(a.away-b.away)||(b.main.startMin-a.main.startMin);});ADM.groups=G;
  var nowN=FB.on?FB.n:r.online;
  var NL=r.nrlog||{},nrNow=rHasMap()?G.filter(function(g){return g.main.emp&&!rInfo(g.main.emp);}):[],onE={};nrNow.forEach(function(g){onE[g.main.emp]=1;});var nrRej=Object.keys(NL).filter(function(k){return NL[k].r&&!rInfo(k)&&!onE[k];}),nrB=Object.keys(NL).filter(function(k){return NL[k].b&&!NL[k].r&&!rInfo(k)&&!onE[k];});
  var nrN={now:nrNow.length,rej:nrRej.length,b:nrB.length,all:nrNow.length+nrRej.length+nrB.length};
  var h='<div class="adm-kpi"><div><span>지금 접속'+(FB.on?' ⚡':'')+'</span><b style="color:var(--ok)">'+nowN+'</b></div><div><span>오늘 사번</span><b>'+te.length+'</b></div>'+(rHasMap()?(function(){var M=r.rmap,tot=Object.keys(M).length,inR=te.filter(function(x){return M[x.emp];}).length,out=te.length-inR;return '<div><span>명부 대비 접속</span><b>'+Math.round(inR/tot*100)+'%</b><small style="font-size:11px;color:var(--sub)">'+inR+' / '+tot+'명</small></div><div style="'+(out||nrN.rej?'background:#fef2f2;outline:2px solid #fecaca':'')+'"><span>명부 외</span><b style="color:'+(out?'#dc2626':'var(--ok)')+'">'+out+'</b>'+(nrN.rej?'<small style="font-size:11px;color:#b91c1c">거부 '+nrN.rej+'건</small>':'')+'</div>';})():'<div><span>오늘 방문</span><b>'+(t.visits||0)+'</b></div><div><span>오늘 최대 동시</span><b>'+(t.peak||0)+'</b></div>')+'<div><span>오늘 인쇄 · 보관</span><b>'+(t.prints||0)+' · '+(t.saves||0)+'</b></div></div>';
  h+='<div class="seg" id="admSeg">'+[['now','🟢 지금 접속',G.length]].concat(rHasMap()?[['nr','⚠️ 명부 외',nrN.all]]:[]).concat([['today','📅 오늘 기록',te.length]]).concat(rHasMap()?[['branch','🏬 지점별',null]]:[]).concat([['week','📈 7일 추이',null],['block','🚫 차단',bl.length]]).map(function(x){var red=x[0]==='nr'&&x[2];return '<button data-seg="'+x[0]+'" class="'+(seg===x[0]?'on':'')+'"'+(red?' style="color:#b91c1c"':'')+'>'+x[1]+(x[2]!=null?'<small'+(red?' style="background:#fee2e2;color:#b91c1c"':'')+'>'+x[2]+'</small>':'')+'</button>';}).join('')+'</div>';
  if(seg==='now'){
    var oldN=G.filter(function(g){return g.main.ver&&verLt(g.main.ver,VERSION);}).length,mvNow=r.mv||'';
    h+='<div class="adm-card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:0"><div style="flex:1;min-width:200px">구버전 사용 중 <b style="color:'+(oldN?'#dc2626':'var(--ok)')+'">'+oldN+'명</b> · 최신 '+VERSION+(mvNow?'<br><small style="color:var(--sub)">강제 업데이트 기준: '+esc(mvNow)+' 미만</small>':'')+'</div><button class="btn pri sm" id="admForce">⚡ 전원 '+VERSION+'으로 강제 업데이트</button></div>';
    var multiN=G.filter(function(g){return g.devs>1;}).length,idleN=G.filter(function(g){return g.lidle;}).length,brs={};G.forEach(function(g){brs[g.br||'명부 외']=(brs[g.br||'명부 외']||0)+1;});
    if(multiN)h+='<div class="adm-card" style="margin-top:0;background:#fef2f2;border-color:#fecaca;color:#b91c1c;font-size:13.5px">⚠️ <b>한 사번으로 여러 기기 동시 접속 '+multiN+'명</b> · 사번 공유나 도용일 수 있어요. 카드의 빨간 표시를 확인하세요.</div>';
    if(rHasMap()&&Object.keys(brs).length>1)h+='<div class="adm-tool" style="margin-top:0"><select id="admNbr"><option value="">전체 지점 ('+G.length+')</option>'+Object.keys(brs).sort().map(function(b){return '<option value="'+esc(b)+'" '+(ADM.nbr===b?'selected':'')+'>'+esc(b)+' ('+brs[b]+')</option>';}).join('')+'</select>'+(idleN?'<small style="color:var(--sub)">💤 30분 넘게 조작 없는 '+idleN+'명은 접속자 수에서 빠져요</small>':'')+'</div>';
    else if(idleN)h+='<div class="hint" style="margin:0 0 6px">💤 30분 넘게 조작 없는 '+idleN+'명은 접속자 수에서 빠져요</div>';
    var GV=G.map(function(g,k){g.k2=k;return g;}).filter(function(g){return !ADM.nbr||(g.br||'명부 외')===ADM.nbr;});
    h+=GV.length?GV.map(function(g){var k=g.k2,x=g.main,sus=x.emp&&empSus(x.emp),old=x.ver&&x.ver!==VERSION,mob=/모바일/.test(x.dev||'');
      var models=(x.models||'').split(', ').filter(function(v){return v;});
      var nr=rHasMap()&&x.emp&&!rInfo(x.emp)&&!(RS.ex&&RS.ex[x.emp]);sus=sus||nr||g.devs>1;
      return '<div class="uc'+(sus?' sus':'')+'"'+(g.lidle&&!sus?' style="opacity:.6"':'')+'><div class="av">'+(mob?'📱':'💻')+'<span class="dot" style="background:'+(g.away?'#cbd5e1':'#22c55e')+'"></span></div><div>'
        +'<div class="e">'+(x.emp?rWho(x.emp,1):esc(g.k))+(sus&&!nr&&!rHasMap()?' <span class="ack-chip" style="margin:0">의심</span>':'')+' <small>'+esc(x.dev||'')+(x.did?' · 기기 '+didTag(x.did):'')+(g.list.length>1?' · 창 '+g.list.length+'개':'')+'</small>'+(g.devs>1?' <span class="nr">⚠️ 기기 '+g.devs+'대 동시 접속</span>':'')+'</div>'
        +'<div class="m">'+awayTxt(g,x)+' · 접속 '+(x.startMin<1?'방금':x.startMin>=60?Math.floor(x.startMin/60)+'시간 '+(x.startMin%60)+'분':x.startMin+'분')+' · '+(old?'<span style="color:#dc2626;font-weight:700">'+esc(x.ver)+' (구버전)</span>':esc(x.ver||''))+'</div>'
        +'<div>'+(models.length?models.map(function(c){return '<span class="c2">🛒 '+esc(c)+'</span>';}).join(''):'<span class="c2" style="background:none;color:#94a3b8;padding-left:0">담은 모델 없음</span>')+'</div></div>'
        +'<div style="display:flex;gap:6px">'+(nr?'<button class="btn line sm" style="color:#16a34a;border-color:#86efac" data-rxok="'+esc(x.emp)+'">✅ 허용</button>':'')+(x.emp?'<button class="btn line sm" data-msg="'+esc(x.emp)+'" title="메시지 보내기">💬</button>':'')+'<button class="btn del sm" data-blkg="'+k+'" title="차단">🚫</button></div></div>';}).join('')
      :'<div class="empty" style="margin-top:8px">'+(G.length?'이 지점은 지금 접속한 사람이 없어요.':'지금 접속한 사람이 없어요.')+'</div>';
    h+='<div class="note">● 보는 중(하는 일) · ○ 자리 비움(다른 창·앱으로 이동했거나 5분 넘게 조작 없음 · 화면만 켜 두면 여기로 가요) · 구버전은 빨간색 · 💤 30분 넘게 조작 없음(접속자 수 제외) · 같은 사번이 창을 여러 개 열면 한 줄로 묶어요 · 💬 누르면 그 직원 화면에 메시지가 떠요 (75초 안). 하는 일은 75초마다 갱신돼요.</div>';
  }else if(seg==='nr'){
    var EX=r.rex||{},mode=r.rmode||'strict',ago=function(m){return m<1?'방금':m>=60?Math.floor(m/60)+'시간 '+(m%60)+'분':m+'분';};
    var card=function(o){return '<div class="uc" style="'+(o.c==='r'?'background:#fef2f2;border-color:#fecaca':o.c==='y'?'background:#fffbeb;border-color:#fde68a':'background:#f8fafc')+'"><div class="av">'+(/모바일/.test(o.dev||'')?'📱':'💻')+'</div><div><div class="e"><b style="font-size:15px">'+esc(o.emp)+'</b> '+o.badge+(empSus(o.emp)?' <span class="ack-chip" style="margin:0">의심</span>':'')+' <small>'+esc(o.dev||'')+(o.did?' · 기기 '+didTag(o.did):'')+'</small></div><div class="m">'+o.line+'</div>'+(o.models?'<div>'+o.models.split(', ').filter(function(v){return v;}).map(function(c){return '<span class="c2">🛒 '+esc(c)+'</span>';}).join('')+'</div>':'')+'</div><div style="display:flex;gap:6px">'+o.btns+'</div></div>';};
    var bl=function(o){return '<button class="btn del sm" data-nrblk="'+esc(o.emp)+'|'+esc(o.did||'')+'|'+esc(o.dev||'')+'">🚫</button>';},al=function(e){return '<button class="btn line sm" style="color:#16a34a;border-color:#86efac" data-rxok="'+esc(e)+'">✅ 허용</button>';};
    h+='<div class="hint" style="margin:0 0 8px">'+(mode==='open'?'🔓 지금 입장 방식: <b>누구나 입장</b> · 명부에 없는데 접속한 사람이 여기에 모여요.':'🔒 지금 입장 방식: <b>명부 사번만 입장</b> · 명부에 없는 사번이 접속하거나 입장을 시도하면 여기에 모여요.')+'</div>';
    if(!nrN.all)h+='<div class="empty">오늘은 명부 외 접속 · 입장 시도가 없어요.</div>';
    if(nrNow.length){h+='<div class="adm-sec">🟢 지금 접속 중 <small>'+(mode==='open'?'명부에 없는 사번':'예외 허용으로 들어온 사번')+'</small></div>';
      h+=nrNow.map(function(g){var x=g.main,ex=EX[x.emp];return card({emp:x.emp,c:ex?'y':'r',dev:x.dev,did:x.did,models:x.models,
        badge:ex?'<span class="tp w">예외 허용</span>':'<span class="nr">명부에 없음</span>',
        line:awayTxt(g,x)+' · 접속 '+ago(x.startMin)+(ex?' · 메모: '+esc(ex.memo||'-')+' · <b>'+(ex.until?esc(ex.until.slice(5).replace('-','.'))+'까지':'기한 없음')+'</b>':''),
        btns:(ex?(ex.until?'<button class="btn line sm" data-rxext="'+esc(x.emp)+'">기한 연장</button>':''):al(x.emp))+bl(x)});}).join('');}
    if(nrRej.length){h+='<div class="adm-sec" style="margin-top:16px">⛔ 오늘 입장 거부 <small>명부에 없어 들어오지 못한 사번 · 실제 직원이면 허용</small></div>';
      h+=nrRej.sort(function(a,b){return NL[a].last<NL[b].last?1:-1;}).map(function(k){var e=NL[k];return card({emp:k,c:'r',dev:e.dev,did:e.did,badge:'<span class="nr">명부에 없음</span>',
        line:'<b style="color:#b91c1c">입장 시도 '+e.r+'회</b> · '+(e.first!==e.last?'처음 '+esc(e.first)+' → 마지막 '+esc(e.last):esc(e.last||e.first))+(EX[k]?' · <b style="color:#16a34a">이후 예외 허용됨</b>':''),btns:(EX[k]?'':al(k))+bl({emp:k,did:e.did,dev:e.dev})});}).join('');}
    if(nrB.length){h+='<div class="adm-sec" style="margin-top:16px">↩️ 접속 중 입장 화면으로 돌려보낸 사번 <small>명부 적용 · 예외 해제 전부터 쓰던 사람</small></div>';
      h+=nrB.map(function(k){var e=NL[k];return card({emp:k,c:'g',dev:e.dev,did:e.did,models:e.m,badge:'<span class="nr">명부에 없음</span>',
        line:'<b style="color:#64748b">↩️ '+esc(e.b)+' 돌려보냄</b>'+(e.n?' · 그 전 오늘 접속 '+e.n+'회':'')+(e.p?' · 견적 인쇄 '+e.p:'')+(EX[k]?' · <b style="color:#16a34a">이후 예외 허용됨</b>':''),btns:(EX[k]?'':al(k))+bl({emp:k,did:e.did,dev:e.dev})});}).join('');}
    h+='<div class="note">✅ 허용 = 예외 목록에 추가 → 다음 입장부터 바로 들어올 수 있어요. 🚫 = 사번 · 기기 차단. 이 목록은 매일 새로 시작하고, 기록은 시트 \'명부외접속\' 탭에 남아요.</div>';
  }else if(seg==='branch'){
    var M=r.rmap,B={},tm={};te.forEach(function(x){tm[x.emp]=x;});Object.keys(M).forEach(function(k){var b=M[k][1]||'기타',o=B[b]||(B[b]={n:0,on:0,hq:/본부|지부/.test(b)});o.n++;if(tm[k])o.on++;});
    var exOn=te.filter(function(x){return !M[x.emp];}).length;
    var BL=Object.keys(B).sort(function(a,b){return (B[a].hq-B[b].hq)||(B[b].on/B[b].n-B[a].on/B[a].n)||(B[b].n-B[a].n);});
    h+='<div class="brg">'+BL.map(function(b){var o=B[b];return '<div class="'+(o.hq?'hq':'')+'"><b>'+esc(b)+'</b> <span style="float:right">'+o.on+'/'+o.n+'</span><div class="bb"><i style="width:'+Math.round(o.on/o.n*100)+'%"></i></div></div>';}).join('')
      +(exOn?'<div class="hq"><b>명부 외</b> <span style="float:right">'+exOn+'명</span><div class="bb"><i style="width:100%;background:#fca5a5"></i></div></div>':'')+'</div>';
    h+='<div class="note">명부 인원 중 오늘 한 번이라도 접속한 사람 수예요. 본부 · 지부는 회색 칸으로 표시해요.</div>';
  }else if(seg==='today'){
    var brs={};if(rHasMap())Object.keys(r.rmap).forEach(function(k){brs[r.rmap[k][1]]=1;});
    h+='<div class="adm-tool"><input type="text" id="admQ" placeholder="🔍 사번 · 이름 검색" value="'+esc(ADM.q||'')+'">'+(rHasMap()?'<select id="admBr"><option value="">전체 소속</option>'+Object.keys(brs).sort().map(function(b){return '<option '+(ADM.tbr===b?'selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select>':'')+'<select id="admSort">'+[['last','최근 접속순'],['am','실사용 많은순'],['v','조회 많은순'],['n','접속 많은순'],['first','첫 접속순'],['p','인쇄 많은순']].map(function(x){return '<option value="'+x[0]+'" '+((ADM.sort||'last')===x[0]?'selected':'')+'>'+x[1]+'</option>';}).join('')+'</select><button class="btn line sm" id="admCsv">⬇ CSV</button></div><div id="admList"></div>';
  }else if(seg==='week'){
    var D=r.days.slice().reverse(),mx=Math.max.apply(null,[1].concat(D.map(function(d){return d.visits;})));
    h+='<div style="font-size:12.5px;color:var(--sub)"><span style="display:inline-block;width:10px;height:10px;background:#93c5fd;border-radius:3px"></span> 방문 &nbsp; <span style="display:inline-block;width:10px;height:10px;background:#1d4ed8;border-radius:3px"></span> 사번 수</div>';
    h+='<div class="bars">'+D.map(function(d){return '<div><b style="color:#0f172a">'+d.visits+'</b><span style="display:flex;align-items:flex-end;gap:3px;width:100%;justify-content:center;height:110px"><i style="height:'+Math.round(d.visits/mx*110)+'px;width:40%"></i><i class="e" style="height:'+Math.round((d.emps||0)/mx*110)+'px;width:25%"></i></span></div>';}).join('')+'</div><div class="bl">'+D.map(function(d){return '<span>'+esc(d.date)+'</span>';}).join('')+'</div>';
    h+='<div class="scroll" style="margin-top:12px"><table class="tbl"><tr><th>날짜</th><th>방문</th><th>사번 수</th><th>최대 동시</th><th>견적 인쇄</th><th>견적 보관</th><th>견적 복사</th></tr>'+r.days.map(function(d,k){return '<tr><td>'+esc(d.date)+(k===0?' <small style="color:var(--sub)">(오늘)</small>':'')+'</td><td>'+d.visits+'</td><td>'+(d.emps||0)+'</td><td>'+d.peak+'</td><td>'+d.prints+'</td><td>'+(d.saves||0)+'</td><td>'+d.copies+'</td></tr>';}).join('')+'</table></div>';
  }else{
    h+=bl.length?'<div class="scroll"><table class="tbl"><tr><th>구분</th><th>대상</th><th>메모</th><th>차단 일시</th><th></th></tr>'+bl.map(function(b){
      return '<tr><td><span class="tag" style="'+(b.type==='emp'?'background:#fee2e2;color:#991b1b':'background:#ede9fe;color:#5b21b6')+'">'+(b.type==='emp'?'사번':'기기')+'</span></td><td><b>'+esc(b.type==='emp'?b.key:didTag(b.key))+'</b>'+(b.dev?'<br><small style="color:var(--sub)">'+esc(b.dev)+'</small>':'')+'</td><td style="text-align:left">'+esc(b.memo||'-')+'</td><td>'+esc(b.at||'')+'</td><td><button class="btn line sm" data-unblk="'+esc(b.type+':'+b.key)+'">해제</button></td></tr>';}).join('')+'</table></div>'
      :'<div class="empty" style="margin-top:8px">차단한 사번 · 기기가 없어요. 지금 접속 탭에서 🚫를 누르면 차단할 수 있어요.</div>';
  }
  h+='<div style="display:flex;gap:8px;margin-top:14px;align-items:center"><button class="btn line sm" id="admRef">지금 새로고침</button><button class="btn line sm" id="admOut">로그아웃</button><small style="color:var(--sub);margin-left:auto">'+esc(r.at)+' 기준 · 30초마다 갱신</small></div>';
  return h;
}
function admTodayList(){var el=$('#admList');if(!el||!ADM.stat)return;var q=(ADM.q||'').trim(),srt=ADM.sort||'last';
  var L=(ADM.stat.todayEmps||[]).filter(function(x){var r=rInfo(x.emp);if(ADM.tbr&&(!r||r[1]!==ADM.tbr))return false;return !q||(x.emp+' '+(r?r.join(' '):'')).indexOf(q)>=0;}).slice();
  L.sort(function(a,b){return srt==='am'?(b.am||0)-(a.am||0):srt==='v'?(b.v||0)-(a.v||0):srt==='n'?b.n-a.n:srt==='first'?(a.first<b.first?-1:1):srt==='p'?((b.p||0)-(a.p||0)):(a.last<b.last?1:-1);});
  var mx=Math.max.apply(null,[1].concat(L.map(function(x){return x.n;}))),lim=ADM.more?L.length:30;
  el.innerHTML=L.length?'<div class="scroll" style="margin-top:10px"><table class="tbl"><tr><th>사번</th>'+(rHasMap()?'<th>성명 · 소속</th>':'')+'<th>접속 시간</th><th>실사용</th><th style="width:20%">접속 횟수</th><th>조회 · 담기 · 캡처</th><th>인쇄 · 보관</th><th>기기</th></tr>'+L.slice(0,lim).map(function(x){var ri=rInfo(x.emp),nr=rHasMap()&&!ri,sus=empSus(x.emp)||nr;
    return '<tr'+(sus?' class="sus"':'')+'><td><b>'+esc(x.emp)+'</b>'+(nr?' <span class="nr">명부에 없음</span>':sus?' <span class="ack-chip" style="margin:0">의심</span>':'')+'</td>'+(rHasMap()?'<td style="text-align:left">'+(ri?'<b>'+esc(ri[0])+'</b> <small style="color:var(--sub)">'+esc(ri[1])+'</small>':'-')+'</td>':'')+'<td>'+esc(x.first)+' → '+esc(x.last)+'</td><td><b>'+fmtMin(x.am)+'</b></td><td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;background:#eef2ff;border-radius:99px;height:8px"><div style="width:'+Math.max(4,Math.round(x.n/mx*100))+'%;height:8px;background:#6366f1;border-radius:99px"></div></div><b style="min-width:38px;text-align:right">'+x.n+'회</b></div></td><td>'+(x.v||0)+' · '+(x.ad||0)+' · '+(x.c||0)+'</td><td>'+(x.p||0)+' · '+(x.s||0)+'</td><td>'+esc(x.dev)+'</td></tr>';}).join('')+'</table></div>'
    +(L.length>lim?'<a href="#" class="link" id="admMore" style="display:inline-block;margin-top:8px;font-size:13px">'+L.length+'명 중 '+lim+'명 표시 · 모두 보기 ▾</a>':'')
    :'<div class="empty" style="margin-top:10px">'+(q?'검색 결과가 없어요.':'오늘 접속 기록이 없어요.')+'</div>';
  var mo=$('#admMore');if(mo)mo.onclick=function(e){e.preventDefault();ADM.more=true;admTodayList();};}
function fmtMin(m){m=m||0;return m<1?'-':m>=60?Math.floor(m/60)+'시간 '+(m%60)+'분':m+'분';}
function admCsv(){var L=(ADM.stat&&ADM.stat.todayEmps)||[];var rows=[['사번','성명','소속','첫 접속','마지막 접속','실사용(분)','접속 횟수','모델 조회','모델 담기','견적 캡처','인쇄','보관','기기']].concat(L.map(function(x){var ri=rInfo(x.emp)||['',''];return [x.emp,ri[0],ri[1],x.first,x.last,x.am||0,x.n,x.v||0,x.ad||0,x.c||0,x.p||0,x.s||0,x.dev];}));
  csvDown(rows,'접속기록_'+todayStr()+'.csv');}
function csvDown(rows,name){var t='﻿'+rows.map(function(r){return r.map(function(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');}).join('\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
var FNAME={rank:['🛒','구독 판매순위 보기'],'rank:add':['🛒','판매순위에서 담기'],spec:['📋','스펙 비교'],rec:['💡','추천 팝업'],'rec:show':['💡','추천 팝업 뜸'],'rec:add':['💡','추천 모델 담기'],'rec:swap':['💡','추천 모델로 바꾸기'],'rec:off':['🔕','추천 팝업 다시 보지 않기'],'rec:on':['🔔','추천 팝업 다시 켜기'],'rec:best':['💰','최저 조합 찾기'],'rec:bestshow':['💰','최저 조합 결과 보기'],pricediff:['📢','단가 변경 요약 보기'],capture:['📸','견적 캡처'],search:['🔍','모델 검색'],add:['➕','모델 담기'],best:['🔥','많이 찾는 모델 클릭'],cmp:['💰','가격 비교'],feel:['🔥','체감가 보기'],print:['🖨','견적 인쇄'],ai:['🎯','혜택 TOP'],save:['💾','견적 보관'],box:['📁','보관함 열기'],care:['🛠','케어 가이드'],win:['🏆','판촉 모델 보기'],copy:['📋','견적 복사'],multi:['💳','카드 여러 장 결제'],detail:['📊','자세히보기'],xcmp:['🆚','삼성 vs LG 비교'],install:['📲','앱 설치 완료'],instguide:['📲','앱 설치 안내 보기']};
var AFEAT={days:7,data:null,brand:''};
var LGCARD_N={shinhan:'신한 더구독케어',wooripl:'우리 Platinum',woori:'우리 LG전자',lotte:'롯데 구독엔로카',kb:'KB국민 LG전자',hyundai:'현대 LG전자',hana:'하나 플러스',nh:'NH 올원 BEST',best:'광주/전북 베스트케어'};
function fnm(k){if(k==='win')return AFEAT.brand==='lg'?'활성화 모델 보기':AFEAT.brand==='ss'?'판촉 모델 보기':AFEAT.brand==='ck'?'반값 모델 보기':'판촉 · 활성화 · 반값 모델 보기';if(k==='cardpol'&&AFEAT.brand==='ck')return '카드 혜택표 보기';return FNAME[k][1];}
function afBrandTag(){return AFEAT.brand==='ss'?'삼성_':AFEAT.brand==='lg'?'LG_':AFEAT.brand==='ck'?'쿠쿠_':'';}
function admFeatLoad(){AFEAT.data=null;gsr('adminFeatures',{pw:ADM.pw,brand:AFEAT.brand,days:AFEAT.days==='d'?1:AFEAT.days,date:AFEAT.days==='d'?(AFEAT.date||todayStr().replace(/-/g,'')):''},function(r){AFEAT.data=r&&r.ok?r:{ok:false};if(ADM.tab==='feat')admRender();},function(){AFEAT.data={ok:false};if(ADM.tab==='feat')admRender();});}
/* ---------- 🧾 사번별 이용 : 삼성 · LG 둘 다 써 봤는지 ---------- */
var AEMP={days:30,data:null,basis:'d',st:'all',br:'',q:'',open:'',mode:'day',date:'',dd:null,dq:'',dbr:'',dsort:'am',dnone:false,dopen:'',hist:{},hdays:30};
var AEXTRA={lump:['⚖️','일시불 비교'],fav:['⭐','즐겨찾기'],logout:['🚪','로그아웃']};
function aeFn(k,lg){if(k==='win')return ['🏆',lg===2?'반값 모델 보기':lg?'활성화 모델 보기':'판촉 모델 보기'];if(k==='lumpitem')return ['🛒','일시불 품목 넣기'];return FNAME[k]||AEXTRA[k]||null;}
function aeTop(f,lg){var k=Object.keys(f||{}).filter(function(k){return aeFn(k,lg)&&k!=='logout';}).sort(function(a,b){return f[b]-f[a];});return k;}
/* 관리자: 인쇄 기록 (누가 · 언제 · 어떤 모델로 견적서를 인쇄했는지) */
var PLOG={days:7,data:null,brand:'',q:'',src:'정식'};
function admPlogLoad(){PLOG.data=null;gsr('adminQuoteLog',{pw:ADM.pw,days:PLOG.days},function(r){PLOG.data=r&&r.ok?r:{ok:false};if(ADM.tab==='plog')admRender();},function(){PLOG.data={ok:false};if(ADM.tab==='plog')admRender();});}
function admPlogHtml(){
  var R=PLOG.data,chip=function(k,v,l,cur){return '<button class="chip sm '+(cur===v?'on':'')+'" data-'+k+'="'+v+'">'+l+'</button>';};
  var h='<div class="pl-bar"><div class="chips" style="margin:0">'+[[1,'오늘'],[7,'7일'],[30,'30일'],[90,'90일']].map(function(x){return chip('pld',x[0],x[1],PLOG.days);}).join('')+'</div>'
    +'<div class="chips" style="margin:0">'+[['','전체'],['삼성','삼성'],['LG','LG'],['쿠쿠','쿠쿠']].map(function(x){return chip('plb',x[0],x[1],PLOG.brand);}).join('')+'</div>'
    +'<div class="chips" style="margin:0">'+[['정식','정식'],['테스트','테스트'],['','모두']].map(function(x){return chip('pls',x[0],x[1],PLOG.src);}).join('')+'</div>'
    +'<input type="text" id="plQ" placeholder="사번 · 모델코드 검색" value="'+esc(PLOG.q)+'" autocomplete="off"></div>';
  if(!R)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(!R.ok)return h+'<div class="empty" style="margin-top:12px">기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>';
  var q=PLOG.q.trim().toUpperCase().replace(/\s/g,'');
  var L=R.list.filter(function(x){return (!PLOG.brand||x.brand===PLOG.brand)&&(!PLOG.src||x.src===PLOG.src)&&(!q||(x.emp+x.detail).toUpperCase().replace(/\s/g,'').indexOf(q)>=0);});
  var emps={},models=0;L.forEach(function(x){emps[x.emp]=1;models+=x.n;});
  h+='<div class="adm-kpi" style="grid-template-columns:repeat(3,1fr)"><div><span>인쇄 건수</span><b>'+L.length+'</b></div><div><span>인쇄한 사번</span><b>'+Object.keys(emps).length+'</b></div><div><span>견적 모델 수</span><b>'+models+'</b></div></div>';
  h+='<div class="adm-sec">최근 인쇄 <small>'+(R.url?'<a class="link" href="'+esc(R.url)+'" target="_blank" rel="noopener">구글 시트로 전체 보기 ↗</a>':'')+'</small></div>';
  if(!L.length)return h+'<div class="empty" style="margin-top:8px">조건에 맞는 인쇄 기록이 없어요.</div>';
  var BC={'삼성':'ss','LG':'lg','쿠쿠':'ck'};
  h+=L.slice(0,300).map(function(x){
    var ms=String(x.detail||'').split(' / ').map(function(d){var m=/^(\S+) \((.*)\)$/.exec(d);return m?'<div class="pl-m"><b>'+esc(m[1])+'</b><span>'+esc(m[2])+'</span></div>':'<div class="pl-m"><span>'+esc(d)+'</span></div>';}).join('');
    return '<div class="pl-it"><div class="pl-h"><span class="pl-br '+(BC[x.brand]||'')+'">'+esc(x.brand)+'</span><b>👤 '+esc(x.emp)+'</b><span class="pl-ts">'+esc(String(x.ts).slice(5,16))+'</span>'+(x.src==='테스트'?'<span class="pl-t">테스트</span>':'')+'</div>'
      +'<div class="pl-doc">'+esc(x.doc)+'</div>'+ms
      +'<div class="pl-f"><span>'+esc(x.cond||'')+'</span><b>월 '+esc(String(x.total||'').replace(/^월\s*/,''))+'</b></div></div>';}).join('')
    +(L.length>300?'<div class="hint">최근 300건만 보여요. 전체는 구글 시트에서 확인하세요.</div>':'');
  return h;}
function admPlogBind(){
  var b=$('#admBody');if(!b)return;
  [].forEach.call(b.querySelectorAll('[data-pld]'),function(x){x.onclick=function(){PLOG.days=+x.dataset.pld;admPlogLoad();admRender();};});
  [].forEach.call(b.querySelectorAll('[data-plb]'),function(x){x.onclick=function(){PLOG.brand=x.dataset.plb;admRender();};});
  [].forEach.call(b.querySelectorAll('[data-pls]'),function(x){x.onclick=function(){PLOG.src=x.dataset.pls;admRender();};});
  var i=$('#plQ');if(i){i.oninput=function(){PLOG.q=i.value;clearTimeout(PLOG.t);PLOG.t=setTimeout(function(){admRender();var j=$('#plQ');if(j){j.focus();j.setSelectionRange(j.value.length,j.value.length);}},250);};}
}
/* 관리자: 개선 요청 (상태 변경 · 답변) */
var AFB={data:null,st:'',src:'정식',open:null},AFB_ST=['접수','검토중','반영완료','보류'],AFB_C={'접수':'s0','검토중':'s1','반영완료':'s2','보류':'s3'};
function admFbLoad(){AFB.data=null;gsr('adminFeedback',{pw:ADM.pw},function(r){AFB.data=r&&r.ok?r:{ok:false};if(ADM.tab==='fb')admRender();},function(){AFB.data={ok:false};if(ADM.tab==='fb')admRender();});}
function admFbHtml(){
  var R=AFB.data,chip=function(k,v,l,cur){return '<button class="chip sm '+(cur===v?'on':'')+'" data-'+k+'="'+v+'">'+l+'</button>';};
  if(!R)return '<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(!R.ok)return '<div class="empty" style="margin-top:12px">요청을 불러오지 못했어요.</div>';
  var all=R.list.filter(function(x){return !AFB.src||x.src===AFB.src;}),cnt={};all.forEach(function(x){cnt[x.status]=(cnt[x.status]||0)+1;});
  var L=all.filter(function(x){return !AFB.st||x.status===AFB.st;});
  var h='<div class="pl-bar"><div class="chips" style="margin:0">'+chip('fbs','','전체 '+all.length,AFB.st)+AFB_ST.map(function(s){return chip('fbs',s,s+' '+(cnt[s]||0),AFB.st);}).join('')+'</div>'
    +'<div class="chips" style="margin:0">'+[['정식','정식'],['테스트','테스트'],['','모두']].map(function(x){return chip('fbsrc',x[0],x[1],AFB.src);}).join('')+'</div></div>'
    +'<div class="adm-sec">직원 요청 <small>'+(R.url?'<a class="link" href="'+esc(R.url)+'" target="_blank" rel="noopener">구글 시트로 보기 ↗</a>':'')+'</small></div>';
  if(!L.length)return h+'<div class="empty" style="margin-top:8px">해당하는 요청이 없어요.</div>';
  return h+L.map(function(x){var op=AFB.open===x.id;
    return '<div class="pl-it afb-it"><div class="pl-h"><span class="fb-st '+(AFB_C[x.status]||'s0')+'">'+esc(x.status)+'</span><b>'+esc(x.kind)+'</b><span class="pl-br">'+esc(x.brand)+'</span><span>👤 '+esc(x.emp)+'</span><span class="pl-ts">'+esc(String(x.ts).slice(5,16))+'</span>'+(x.src==='테스트'?'<span class="pl-t">테스트</span>':'')+'</div>'
      +'<div class="fb-tx">'+esc(x.text)+'</div>'+(x.info?'<div class="pl-doc" style="margin:6px 0 0">'+esc(x.info)+'</div>':'')
      +(x.reply&&!op?'<div class="fb-rp"><b>답변 · '+esc(String(x.rts).slice(5,16))+'</b>'+esc(x.reply)+'</div>':'')
      +(op?'<div class="afb-ed"><div class="chips">'+AFB_ST.map(function(s){return '<button class="chip sm '+(x.status===s?'on':'')+'" data-fbset="'+s+'">'+s+'</button>';}).join('')+'</div>'
          +'<textarea class="fb-ta" id="afbRp" placeholder="직원에게 보일 답변 (비워두면 답변 없음)">'+esc(x.reply)+'</textarea><div style="display:flex;gap:8px;margin-top:8px"><button class="btn line sm" data-fbcancel="1">취소</button><button class="btn pri sm" data-fbsave="'+esc(x.id)+'" style="flex:1">저장</button></div></div>'
        :'<div style="text-align:right;margin-top:6px"><button class="btn line sm" data-fbopen="'+esc(x.id)+'">'+(x.reply?'답변 수정':'상태 변경 · 답변')+'</button></div>')+'</div>';}).join('');}
function admFbBind(){
  var b=$('#admBody');if(!b)return;var sel=null;
  [].forEach.call(b.querySelectorAll('[data-fbs]'),function(x){x.onclick=function(){AFB.st=x.dataset.fbs;admRender();};});
  [].forEach.call(b.querySelectorAll('[data-fbsrc]'),function(x){x.onclick=function(){AFB.src=x.dataset.fbsrc;admRender();};});
  [].forEach.call(b.querySelectorAll('[data-fbopen]'),function(x){x.onclick=function(){AFB.open=x.dataset.fbopen;admRender();var t=$('#afbRp');if(t)t.focus();};});
  [].forEach.call(b.querySelectorAll('[data-fbcancel]'),function(x){x.onclick=function(){AFB.open=null;admRender();};});
  [].forEach.call(b.querySelectorAll('[data-fbset]'),function(x){x.onclick=function(){sel=x.dataset.fbset;[].forEach.call(x.parentNode.children,function(y){y.classList.toggle('on',y===x);});};});
  [].forEach.call(b.querySelectorAll('[data-fbsave]'),function(x){x.onclick=function(){var id=x.dataset.fbsave,it=AFB.data.list.filter(function(y){return y.id===id;})[0],rp=$('#afbRp').value.trim(),st=sel||(it?it.status:'접수');
    if(st==='접수'&&rp)st='검토중';x.disabled=true;x.textContent='저장 중…';
    gsr('adminFeedbackSet',{pw:ADM.pw,id:id,status:st,reply:rp},function(r){if(r&&r.ok){toast('저장했어요');AFB.open=null;admFbLoad();}else{toast('저장하지 못했어요');x.disabled=false;x.textContent='저장';}},function(){toast('저장하지 못했어요');x.disabled=false;x.textContent='저장';});};});
}
/* 관리자: 브랜드별 상단 배너 (자동 · 직접 입력 · 끄기) */
var ABN={br:'ss',cfg:{},loaded:{}},ABN_N={ss:'삼성',lg:'LG',ck:'쿠쿠'};
function admBnLoad(){['ss','lg','ck'].forEach(function(b){gsr('getBanner',{brand:b,test:!!window.TEST_MODE},function(r){var c=r&&r.b;ABN.cfg[b]=(c&&c.mode!=='auto')?c:{mode:'off'};ABN.loaded[b]=1;if(ADM.tab==='bn')admRender();},function(){ABN.loaded[b]=-1;if(ADM.tab==='bn')admRender();});});}
function bnPrevHtml(c){var e=esc;if(c.mode==='off')return '<div class="bn-pv-off">상단 배너가 보이지 않아요</div>';
  return '<div class="promo-bn bn-c-'+(c.color||'brand')+'" id="bnPrevBox" style="border-radius:14px"><div class="promo-in"><span class="pb-t">'+(c.icon?e(c.icon)+' ':'')+'<b>'+e(c.title||'배너 제목')+'</b></span>'+(c.date?'<span class="pb-d">'+e(c.date)+'</span>':'')+(c.desc?'<span class="pb-s">'+e(c.desc)+'</span>':'')+(c.btn?'<button type="button">'+e(c.btn)+'</button>':'')+'</div></div>';}
function admBnHtml(){
  var b=ABN.br,c=ABN.cfg[b],chip=function(k,v,l,cur){return '<button class="chip sm '+(cur===v?'on':'')+'" data-'+k+'="'+v+'">'+l+'</button>';};
  var h='<div class="pl-bar">'+['ss','lg','ck'].map(function(x){var m=ABN.cfg[x]?ABN.cfg[x].mode:'';return chip('bnb',x,ABN_N[x]+(m?' · '+(m==='on'?'켜짐':'꺼짐'):''),b);}).join('')+'</div>'
    +(window.TEST_MODE?'<div class="hint" style="margin-top:8px">🧪 테스트 화면에서 저장한 배너는 <b>테스트 화면에만</b> 보여요. 직원 화면은 정식 관리자 모드에서 바꿔 주세요.</div>':'');
  if(!ABN.loaded[b])return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(ABN.loaded[b]<0)return h+'<div class="empty" style="margin-top:12px">설정을 불러오지 못했어요.</div>';
  h+='<div class="adm-sec">'+ABN_N[b]+' 계산기 상단 배너</div><div class="chips" style="margin-top:8px">'+chip('bnm','on','✏️ 직접 입력',c.mode)+chip('bnm','off','🚫 끄기',c.mode)+'</div>';
  if(c.mode==='on'){var f=function(id,lb,v,ph,mx,w){return '<label class="bn-f'+(w?' '+w:'')+'"><span>'+lb+'</span><input type="text" id="'+id+'" value="'+esc(v||'')+'" placeholder="'+ph+'" maxlength="'+mx+'"></label>';};
    h+='<div class="bn-form">'+f('bnIc','아이콘',c.icon,'🎉',4,'s')+f('bnTi','제목 *',c.title,'예) 연말 감사 페스타',40,'l')+f('bnDt','기간',c.date,'예) 12/1(월) ~ 12/31(수)',30,'f')+f('bnDs','설명',c.desc,'예) 대상 모델 구독료 최대 3개월 지원',80,'f')+f('bnBt','버튼 문구',c.btn,'예) 자세히 보기 →',16)+f('bnUr','버튼 링크 (선택)',c.url,'https://…',300,'l')+'</div>'
      +'<div class="lbl" style="margin-top:12px">색상</div><div class="chips">'+[['brand','브랜드색'],['red','레드'],['gold','골드'],['dark','블랙']].map(function(x){return chip('bnc',x[0],x[1],c.color||'brand');}).join('')+'</div>';}
  h+='<div class="lbl" style="margin-top:14px">미리보기</div><div id="bnPrev">'+bnPrevHtml(c)+'</div>'
    +'<div style="display:flex;gap:8px;align-items:center;margin-top:14px"><small style="color:var(--sub);flex:1">'+(c.at?'마지막 저장 '+esc(c.at):'아직 저장한 적 없어요 (기본값)')+'</small><button class="btn pri" id="bnSave">'+ABN_N[b]+' 배너 저장</button></div>';
  return h;}
function admBnBind(){
  var B=$('#admBody');if(!B)return;var b=ABN.br,c=ABN.cfg[b];
  [].forEach.call(B.querySelectorAll('[data-bnb]'),function(x){x.onclick=function(){ABN.br=x.dataset.bnb;admRender();};});
  [].forEach.call(B.querySelectorAll('[data-bnm]'),function(x){x.onclick=function(){c.mode=x.dataset.bnm;if(c.mode==='on'&&!c.title&&b==='ss'){var t=function(id){var e=document.getElementById(id);return e?e.textContent.trim():'';};c.icon=c.icon||'🏆';c.title=t('pbName');c.date=t('pbDate');c.desc=t('pbDesc');c.btn=c.btn||'';}admRender();};});
  [].forEach.call(B.querySelectorAll('[data-bnc]'),function(x){x.onclick=function(){c.color=x.dataset.bnc;admRender();};});
  var map={bnIc:'icon',bnTi:'title',bnDt:'date',bnDs:'desc',bnBt:'btn',bnUr:'url'};
  Object.keys(map).forEach(function(id){var i=$('#'+id);if(i)i.oninput=function(){c[map[id]]=i.value;$('#bnPrev').innerHTML=bnPrevHtml(c);};});
  var s=$('#bnSave');if(s)s.onclick=function(){if(c.mode==='on'&&!(c.title||'').trim()){toast('배너 제목을 적어 주세요');var t=$('#bnTi');if(t)t.focus();return;}
    if(c.url&&!/^https:\/\//i.test(c.url)){toast('링크는 https:// 로 시작해야 해요');return;}
    s.disabled=true;s.textContent='저장 중…';
    gsr('adminBannerSet',{pw:ADM.pw,brand:b,cfg:c,test:!!window.TEST_MODE},function(r){s.disabled=false;
      if(r&&r.ok){ABN.cfg[b]=r.b;toast(ABN_N[b]+' 배너를 저장했어요'+(window.TEST_MODE?' (테스트 화면)':''));if(b==='ss'&&window.__bnApply)window.__bnApply(r.b);admRender();}
      else{toast((r&&r.msg)||'저장하지 못했어요');s.textContent=ABN_N[b]+' 배너 저장';}},function(){s.disabled=false;s.textContent=ABN_N[b]+' 배너 저장';toast('저장하지 못했어요');});};
}
function admEmpLoad(){if(AEMP.mode==='day'){aedLoad();return;}AEMP.data=null;gsr('adminEmpUsage',{pw:ADM.pw,days:AEMP.days},function(r){AEMP.data=r&&r.ok?r:{ok:false};if(ADM.tab==='emp')admRender();},function(){AEMP.data={ok:false};if(ADM.tab==='emp')admRender();});}
function aeList(){var R=AEMP.data,ro=R.roster||{},rows=R.rows||{},seen={},L=[],bi={d:[0,4,8],a:[1,5,9],q:[2,6,10]}[AEMP.basis];
  var push=function(e){if(seen[e])return;seen[e]=1;var r=rows[e]||[0,0,0,'',0,0,0,'',0,0,0,''],m=ro[e],s=r[bi[0]]>0,l=r[bi[1]]>0,k=(r[bi[2]]||0)>0;if(r.length<12)r=r.concat([0,0,0,'']);
    var fe=(R.feats||{})[e]||[{},{},{}],cn=(R.cnts||{})[e]||[[0,0,0],[0,0,0],[0,0,0]],fn=(R.featN||{})[e]||[{},{},{}];L.push({c:cn,fn:fn,f:fe,k:k,e:e,name:m?m[0]||'':'',br:m?(m[1]||''):'',rank:m?m[2]||'':'',inR:!!m,r:r,s:s,l:l,st:s&&l?'both':s?'ss':l?'lg':'none'});};
  Object.keys(ro).forEach(push);Object.keys(rows).forEach(push);return L;}
function aeMd(d){return d?(+d.slice(4,6))+'/'+(+d.slice(6,8)):'';}
function admEmpHtml(){return aeModeHtml()+(AEMP.mode==='day'?aedHtml():aeSumHtml());}
function aeSumHtml(){var R=AEMP.data,h='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px"><div class="chips" style="margin:0">'+[[7,'7일'],[30,'30일'],[90,'90일'],[0,'전체 기간']].map(function(x){return '<button class="chip sm '+(AEMP.days===x[0]?'on':'')+'" data-aed="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div><button class="btn line sm" id="aeCsv">⬇ CSV</button></div>'
   +'<div class="afb">'+[['d','들어와서 사용'],['a','모델 담기'],['q','견적 냄 (인쇄·복사·보관)']].map(function(x){return '<button class="'+(AEMP.basis===x[0]?'on':'')+'" data-aeb="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  if(!R)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(!R.ok)return h+'<div class="warn" style="margin-top:12px">불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
  var L=aeList(),C={all:L.length,both:0,ss:0,lg:0,none:0,ck:0};L.forEach(function(x){C[x.st]++;if(x.k)C.ck++;});
  var pc=function(n){return C.all?Math.round(n/C.all*100)+'%':'-';};
  h+='<div class="hint" style="margin:8px 0 0">'+aeMd(R.from)+' ~ '+aeMd(R.to)+' 기록 · 명부 '+Object.keys(R.roster||{}).length+'명 · 기준: <b>'+{d:'계산기에 들어와 기능을 하나라도 쓴 날',a:'모델을 담은 날',q:'견적서를 인쇄 · 복사 · 보관한 날'}[AEMP.basis]+'</b> · '+esc(R.at)+'</div>';
  h+='<div class="adm-kpi ae">'+[['all','대상 인원',C.all,''],['both','✅ 둘 다',C.both,pc(C.both)],['ss','삼성만',C.ss,pc(C.ss)],['lg','LG만',C.lg,pc(C.lg)],['ck','🅲 쿠쿠 사용',C.ck,pc(C.ck)],['none','미사용 (삼성 · LG)',C.none,pc(C.none)]].map(function(x){return '<div class="'+(AEMP.st===x[0]?'on':'')+'" data-aes="'+x[0]+'"><span>'+x[1]+'</span><b>'+x[2]+'</b>'+(x[3]?'<em>'+x[3]+'</em>':'')+'</div>';}).join('')+'</div>';
  /* 지점별 */
  var B={};L.forEach(function(x){var k=x.br||(x.inR?'(지점 없음)':'(명부 없음)'),b=B[k]||(B[k]={k:k,n:0,both:0,ss:0,lg:0,none:0,ck:0});b.n++;b[x.st]++;if(x.k)b.ck++;});
  var BL=Object.keys(B).map(function(k){return B[k];}).sort(function(a,b){return b.n-a.n||(a.k<b.k?-1:1);});
  h+='<details class="fold" style="margin-top:12px"'+(AEMP.br?'':' open')+'><summary>지점별 현황 ('+BL.length+'곳)</summary><div class="scroll" style="margin-top:8px;max-height:320px"><table class="ae-tbl"><tr><th>지점</th><th style="text-align:right">인원</th><th style="text-align:right">둘 다</th><th style="text-align:right">삼성만</th><th style="text-align:right">LG만</th><th style="text-align:right;color:#c8102e">쿠쿠</th><th style="text-align:right">미사용</th><th>둘 다 비율</th></tr>'
    +BL.map(function(b){var w=function(n){return (n/b.n*100).toFixed(1)+'%';};return '<tr data-aebr="'+esc(b.k)+'" style="cursor:pointer'+(AEMP.br===b.k?';background:#eef2ff':'')+'"><td><b>'+esc(b.k)+'</b></td><td class="n">'+b.n+'</td><td class="n" style="color:#15803d;font-weight:800">'+b.both+'</td><td class="n">'+b.ss+'</td><td class="n">'+b.lg+'</td><td class="n" style="color:#c8102e;font-weight:700">'+b.ck+'</td><td class="n">'+b.none+'</td><td><div style="display:flex;align-items:center;gap:6px"><div class="ae-bar"><i style="width:'+w(b.both)+';background:#22c55e"></i><i style="width:'+w(b.ss)+';background:#818cf8"></i><i style="width:'+w(b.lg)+';background:#f472b6"></i></div><small>'+Math.round(b.both/b.n*100)+'%</small></div></td></tr>';}).join('')
    +'</table></div><div class="hint" style="margin:6px 0 0">지점을 누르면 아래 목록이 그 지점만 보여요 · 막대: <span style="color:#22c55e">■</span> 둘 다 <span style="color:#818cf8">■</span> 삼성만 <span style="color:#f472b6">■</span> LG만</div></details>';
  /* 목록 */
  var q=AEMP.q.trim().toLowerCase(),F=L.filter(function(x){return (AEMP.st==='all'||(AEMP.st==='ck'?x.k:x.st===AEMP.st))&&(!AEMP.br||(x.br||(x.inR?'(지점 없음)':'(명부 없음)'))===AEMP.br)&&(!q||(x.e+' '+x.name+' '+x.br+' '+x.rank).toLowerCase().indexOf(q)>=0);});
  var ord={none:0,ss:1,lg:1,both:2};F.sort(function(a,b){return ord[a.st]-ord[b.st]||(a.br<b.br?-1:a.br>b.br?1:0)||(a.name<b.name?-1:1);});
  h+='<div class="ae-tools"><select id="aeBr"><option value="">전체 지점</option>'+BL.map(function(b){return '<option'+(AEMP.br===b.k?' selected':'')+'>'+esc(b.k)+'</option>';}).join('')+'</select><input type="search" id="aeQ" placeholder="사번 · 이름 · 직책 검색" value="'+esc(AEMP.q)+'" autocomplete="off"></div>';
  var cell=function(r,o,c){if(!r[o])return '<td class="bs z">—</td>';c=c||[0,0,0];return '<td class="bs"><b>'+r[o]+'일 · '+c[0]+'회</b> <small>· 담기 '+c[1]+'회 · 견적 '+c[2]+'회</small><br><small>마지막 '+aeMd(r[o+3])+'</small></td>';};
  var BN={both:'✅ 둘 다',ss:'삼성만',lg:'LG만',none:'미사용'};
  h+='<div class="adm-sec">목록 <small>'+F.length+'명'+(F.length>400?' · 앞 400명만 표시 (CSV에는 전체)':'')+' · 미사용 → 한쪽만 → 둘 다 순 · 이름을 누르면 많이 쓴 기능</small></div>'
    +'<div class="scroll" style="margin-top:6px;max-height:560px;border:1px solid var(--line);border-radius:12px"><table class="ae-tbl"><tr><th>이름 · 사번</th><th>상태</th><th style="color:#1428a0">삼성 이용</th><th style="color:#a50034">LG 이용</th><th style="color:#c8102e">쿠쿠 이용</th><th>약관 동의</th><th>지점</th><th>직책</th></tr>'
    +(F.length?F.slice(0,400).map(function(x){var op=AEMP.open===x.e;return '<tr data-aeo="'+esc(x.e)+'" style="cursor:pointer'+(op?';background:#eef2ff':'')+'"><td><b>'+(op?'▾ ':'▸ ')+esc(x.name||'-')+'</b><br><small style="color:var(--sub)">'+esc(x.e)+'</small>'+(x.inR?'':' <small style="color:#ea580c">명부 없음</small>')+'</td><td><span class="ae-b '+x.st+'">'+BN[x.st]+'</span></td>'+cell(x.r,0,x.c[0])+cell(x.r,4,x.c[1])+cell(x.r,8,x.c[2])+aeTerms(x.e)+'<td>'+esc(x.br||'-')+'</td><td>'+esc(x.rank||'-')+'</td></tr>'+(op?aeDetail(x):'');}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--sub);padding:24px">해당하는 직원이 없어요</td></tr>')
    +'</table></div>';
  h+='<div class="note">· 이용일은 그 기간에 해당 계산기를 쓴 날 수예요 (같은 날 여러 번은 1일). ○회는 기능을 쓴 횟수, 담기 · 견적도 횟수예요. 횟수는 11/16부터 정확히 쌓이고, 그 전 기록은 하루 1회로 셌어요.<br>· LG 기록은 LG 계산기를 연 11/14부터 쌓였고, 들어오기만 하고 아무 기능도 안 쓴 날은 v8.28부터 기록돼요.<br>· 쿠쿠 기록은 v8.34(쿠쿠 계산기)부터 쌓여요. \'쿠쿠 사용\'은 삼성 · LG 상태와 겹쳐서 세요.<br>· 명부에 없는 사번은 명부 대조 없이 사번만 보여요.<br>· 약관 동의는 v8.49부터 로그인(새로 열기)할 때마다 기록돼요. 원본은 구글 시트 \'약관동의\' 탭에 시각 · 사번 · 기기와 함께 쌓여요.</div>';
  return h;}
function aeTm(e){return ((AEMP.data&&AEMP.data.terms)||{})[e];}
function aeTerms(e){var t=aeTm(e);return t?'<td class="bs"><b style="color:#15803d">✅ '+t[1]+'회</b><br><small>마지막 '+esc(t[0].slice(5,16).replace('-','/'))+'</small></td>':'<td class="bs"><b style="color:#dc2626">미동의</b></td>';}
function aeDetail(x){var col=function(f,lg,r,o){f=f||{};var N=(x.fn&&x.fn[lg])||{},v=function(k){return N[k]||f[k];},ks=aeTop(f,lg).sort(function(a,b){return v(b)-v(a);}),mx=Math.max.apply(null,[1].concat(ks.map(v))),c=lg===2?'#c8102e':lg?'#a50034':'#1428a0';
    return '<div style="flex:1;min-width:230px;background:#fff;border-radius:10px;padding:10px 12px;border-top:3px solid '+c+'"><b style="color:'+c+'">'+(lg===2?'쿠쿠':lg?'LG':'삼성')+'</b> <small style="color:var(--sub)">'+(r[o]?'이용 '+r[o]+'일 · '+((x.c&&x.c[lg]||[0])[0])+'회 · 마지막 '+aeMd(r[o+3]):'이 기간 사용 없음')+'</small>'
      +(ks.length?ks.map(function(k){var n=aeFn(k,lg);return '<div style="display:grid;grid-template-columns:22px 1fr 80px 64px;gap:6px;align-items:center;margin-top:6px;font-size:12.5px"><span>'+n[0]+'</span><span>'+n[1]+'</span><div class="ae-bar" style="min-width:0;height:8px"><i style="width:'+Math.round(v(k)/mx*100)+'%;background:'+c+'"></i></div><b style="text-align:right;white-space:nowrap">'+v(k)+'회 <small style="font-weight:500;color:var(--sub)">'+f[k]+'일</small></b></div>';}).join('')
        :'<div style="margin-top:8px;font-size:12.5px;color:var(--sub)">'+(r[o]?'들어오기만 하고 기능은 안 썼어요':'—')+'</div>')+'</div>';};
  return '<tr><td colspan="8" style="background:#f8fafc;white-space:normal;padding:10px"><div style="position:sticky;left:10px;max-width:calc(100vw - 72px)"><div style="display:flex;gap:10px;flex-wrap:wrap">'+col(x.f[0],0,x.r,0)+col(x.f[1],1,x.r,4)+col(x.f[2],2,x.r,8)+'</div><div style="font-size:11.5px;color:var(--sub);margin-top:6px">굵은 숫자는 그 기능을 쓴 횟수, 옆 작은 숫자는 쓴 날 수예요 (11/16 이전 기록은 하루 1회로 셈)</div>'+aehHtml(x.e)+'</div></td></tr>';}
/* ✅ 약관 동의 탭: 명부 기준으로 동의 · 미동의를 한눈에 (원본은 구글 시트 '약관동의' 탭) */
var ATM={days:30,data:null,st:'all',br:'',q:'',view:'terms',pin:null};
function admTmLoad(){ATM.data=null;ATM.pin=null;gsr('adminPinList',ADM.pw,function(r){ATM.pin=r&&r.ok?r:{ok:false};if(ADM.tab==='terms')admRender();},function(){ATM.pin={ok:false};if(ADM.tab==='terms')admRender();});gsr('adminEmpUsage',{pw:ADM.pw,days:ATM.days},function(r){ATM.data=r&&r.ok?r:{ok:false};if(ADM.tab==='terms')admRender();},function(){ATM.data={ok:false};if(ADM.tab==='terms')admRender();});}
function admTmList(){var R=ATM.data,ro=R.roster||{},tm=R.terms||{},seen={},L=[];
  var PV=ATM.view==='pin',pn=(ATM.pin&&ATM.pin.pins)||{};var push=function(e){if(seen[e])return;seen[e]=1;var m=ro[e],t=tm[e],pa=pn[e];L.push({e:e,name:m?m[0]||'':'',br:m?(m[1]||''):'',rank:m?m[2]||'':'',inR:!!m,t:t,pa:pa,ok:PV?pa!==undefined:!!t});};
  Object.keys(ro).forEach(push);Object.keys(PV?pn:tm).forEach(push);return L;}
function admTmHtml(){var PV=ATM.view==='pin',R=ATM.data,h='<div class="afb" style="margin-top:12px">'+[['terms','✅ 약관 동의'],['pin','🔐 PIN 설정']].map(function(x){return '<button class="'+(ATM.view===x[0]?'on':'')+'" data-tmv="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>'+'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px"><div class="chips" style="margin:0">'+[[1,'오늘'],[7,'7일'],[30,'30일'],[90,'90일'],[0,'전체 기간']].map(function(x){return '<button class="chip sm '+(ATM.days===x[0]?'on':'')+'" data-tmd="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div><button class="btn line sm" id="tmCsv">⬇ CSV</button></div>';
  var LB=PV?{ok:'PIN 정함',no:'안 정함',rate:'설정률',col:'PIN',first:'안 정함 먼저'}:{ok:'동의',no:'미동의',rate:'동의율',col:'약관 동의',first:'미동의 먼저'};
  if(PV&&!ATM.pin)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(PV&&!ATM.pin.ok)return h+'<div class="warn" style="margin-top:12px">PIN 현황을 불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
  if(!R)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(!R.ok)return h+'<div class="warn" style="margin-top:12px">불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
  var L=admTmList(),ok=L.filter(function(x){return x.ok;}).length,no=L.length-ok,pc=function(n){return L.length?Math.round(n/L.length*100)+'%':'-';};
  h+=PV?'<div class="hint" style="margin:8px 0 0">명부 '+Object.keys(R.roster||{}).length+'명 기준 · PIN 필수 '+(ATM.pin.on?'<b style="color:#15803d">켜짐</b>':'꺼짐')+' · 켜고 끄기 · 초기화는 👥 직원 명부 탭</div>':'<div class="hint" style="margin:8px 0 0">'+aeMd(R.from)+' ~ '+aeMd(R.to)+' 기간에 동의한 기록 기준 · 명부 '+Object.keys(R.roster||{}).length+'명 · '+esc(R.at||'')+'</div>';
  h+='<div class="adm-kpi ae">'+[['all','대상 인원',L.length,''],['ok',PV?'🔐 PIN 정함':'✅ 동의',ok,pc(ok)],['no',PV?'⏳ 안 정함':'❌ 미동의',no,pc(no)]].map(function(x){return '<div class="'+(ATM.st===x[0]?'on':'')+'" data-tms="'+x[0]+'"><span>'+x[1]+'</span><b>'+x[2]+'</b>'+(x[3]?'<em>'+x[3]+'</em>':'')+'</div>';}).join('')+'</div>';
  var B={};L.forEach(function(x){var k=x.br||(x.inR?'(지점 없음)':'(명부 없음)'),b=B[k]||(B[k]={k:k,n:0,ok:0});b.n++;if(x.ok)b.ok++;});
  var BL=Object.keys(B).map(function(k){return B[k];}).sort(function(a,b){return a.ok/a.n-b.ok/b.n||b.n-a.n;});
  h+='<details class="fold" style="margin-top:12px"'+(ATM.br?'':' open')+'><summary>지점별 '+LB.ok+' 현황 ('+BL.length+'곳 · '+LB.rate+' 낮은 순)</summary><div class="scroll" style="margin-top:8px;max-height:320px"><table class="ae-tbl"><tr><th>지점</th><th style="text-align:right">인원</th><th style="text-align:right">'+LB.ok+'</th><th style="text-align:right">'+LB.no+'</th><th>'+LB.rate+'</th></tr>'
    +BL.map(function(b){var p=Math.round(b.ok/b.n*100);return '<tr data-tmbr="'+esc(b.k)+'" style="cursor:pointer'+(ATM.br===b.k?';background:#eef2ff':'')+'"><td><b>'+esc(b.k)+'</b></td><td class="n">'+b.n+'</td><td class="n" style="color:#15803d;font-weight:800">'+b.ok+'</td><td class="n" style="color:#dc2626;font-weight:700">'+(b.n-b.ok)+'</td><td><div style="display:flex;align-items:center;gap:6px"><div class="ae-bar"><i style="width:'+p+'%;background:#22c55e"></i></div><small>'+p+'%</small></div></td></tr>';}).join('')
    +'</table></div><div class="hint" style="margin:6px 0 0">지점을 누르면 아래 목록이 그 지점만 보여요</div></details>';
  var q=ATM.q.trim().toLowerCase(),F=L.filter(function(x){return (ATM.st==='all'||(ATM.st==='ok')===x.ok)&&(!ATM.br||(x.br||(x.inR?'(지점 없음)':'(명부 없음)'))===ATM.br)&&(!q||(x.e+' '+x.name+' '+x.br+' '+x.rank).toLowerCase().indexOf(q)>=0);});
  F.sort(function(a,b){return (a.ok-b.ok)||(a.br<b.br?-1:a.br>b.br?1:0)||(a.name<b.name?-1:1);});
  h+='<div class="ae-tools"><select id="tmBr"><option value="">전체 지점</option>'+BL.map(function(b){return '<option'+(ATM.br===b.k?' selected':'')+'>'+esc(b.k)+'</option>';}).join('')+'</select><input type="search" id="tmQ" placeholder="사번 · 이름 · 직책 검색" value="'+esc(ATM.q)+'" autocomplete="off"></div>';
  h+='<div class="adm-sec">목록 <small>'+F.length+'명'+(F.length>400?' · 앞 400명만 표시 (CSV에는 전체)':'')+' · '+LB.first+'</small></div>'
    +'<div class="scroll" style="margin-top:6px;max-height:560px;border:1px solid var(--line);border-radius:12px"><table class="ae-tbl"><tr><th>이름 · 사번</th><th>'+LB.col+'</th><th>지점</th><th>직책</th></tr>'
    +(F.length?F.slice(0,400).map(function(x){return '<tr><td><b>'+esc(x.name||'-')+'</b><br><small style="color:var(--sub)">'+esc(x.e)+'</small>'+(x.inR?'':' <small style="color:#ea580c">명부 없음</small>')+'</td>'+(PV?(x.pa!==undefined?'<td class="bs"><b style="color:#15803d">🔐 정함</b><br><small>'+esc(String(x.pa).slice(5,16).replace('-','/'))+'</small></td>':'<td class="bs"><b style="color:#dc2626">⏳ 안 정함</b></td>'):x.t?'<td class="bs"><b style="color:#15803d">✅ 동의 '+x.t[1]+'회</b><br><small>마지막 '+esc(String(x.t[0]).slice(5,16).replace('-','/'))+'</small></td>':'<td class="bs"><b style="color:#dc2626">❌ 미동의</b></td>')+'<td>'+esc(x.br||'-')+'</td><td>'+esc(x.rank||'-')+'</td></tr>';}).join(''):'<tr><td colspan="4" style="text-align:center;color:var(--sub);padding:24px">해당하는 직원이 없어요</td></tr>')
    +'</table></div><div class="note">· 계산기를 새로 열 때마다 동의 팝업이 뜨고, 동의할 때마다 한 번씩 셉니다. 고른 기간 안에 한 번이라도 동의했으면 \'동의\'예요.<br>· 원본은 구글 시트 \'약관동의\' 탭에 시각 · 사번 · 기기 · 계산기와 함께 쌓여요.</div>';
  return h;}
function admTmBind(){
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-tmv]'),function(b){b.onclick=function(){ATM.view=b.dataset.tmv;ATM.st='all';admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-tmd]'),function(b){b.onclick=function(){var v=+b.dataset.tmd;if(ATM.days===v)return;ATM.days=v;admTmLoad();admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-tms]'),function(b){b.onclick=function(){ATM.st=b.dataset.tms;admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody tr[data-tmbr]'),function(b){b.onclick=function(){ATM.br=ATM.br===b.dataset.tmbr?'':b.dataset.tmbr;admRender();};});
  var s=$('#tmBr');if(s)s.onchange=function(){ATM.br=s.value;admRender();};
  var qi=$('#tmQ');if(qi)qi.oninput=function(){ATM.q=qi.value;var p=qi.selectionStart;admRender();var n=$('#tmQ');if(n){n.focus();try{n.setSelectionRange(p,p);}catch(x){}}};
  var cv=$('#tmCsv');if(cv)cv.onclick=function(){if(!ATM.data||!ATM.data.ok)return;csvDown([['사번','이름','지점','직책','약관 동의','동의 횟수','마지막 동의','PIN','PIN 정한 시각','명부']].concat(admTmList().map(function(x){return [x.e,x.name,x.br,x.rank,x.t?'동의':'미동의',x.t?x.t[1]:0,x.t?x.t[0]:'',x.pa!==undefined?'정함':'안 정함',x.pa||'',x.inR?'O':'X'];})),'약관동의_'+(ATM.days?ATM.days+'일':'전체')+'_'+todayStr().replace(/-/g,'')+'.csv');};}
function admEmpBind(){aeModeBind();if(AEMP.mode==='day'){aedBind();return;}aehBind();
  Array.prototype.forEach.call(document.querySelectorAll('#admBody tr[data-aeo]'),function(b){b.onclick=function(){AEMP.open=AEMP.open===b.dataset.aeo?'':b.dataset.aeo;var sc=b.closest('.scroll'),top=sc?sc.scrollTop:0;admRender();var n=document.querySelector('#admBody tr[data-aeo="'+b.dataset.aeo+'"]'),s2=n&&n.closest('.scroll');if(s2)s2.scrollTop=top;};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aed]'),function(b){b.onclick=function(){var v=+b.dataset.aed;if(AEMP.days===v)return;AEMP.days=v;admEmpLoad();admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aeb]'),function(b){b.onclick=function(){AEMP.basis=b.dataset.aeb;admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aes]'),function(b){b.onclick=function(){AEMP.st=b.dataset.aes;admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody tr[data-aebr]'),function(b){b.onclick=function(){AEMP.br=AEMP.br===b.dataset.aebr?'':b.dataset.aebr;admRender();var t=$('#aeQ');if(t)t.scrollIntoView({block:'start',behavior:'smooth'});};});
  var sb=$('#aeBr');if(sb)sb.onchange=function(){AEMP.br=this.value;admRender();};
  var qi=$('#aeQ');if(qi)qi.oninput=function(){AEMP.q=this.value;var p=this.selectionStart;admRender();var n=$('#aeQ');if(n){n.focus();try{n.setSelectionRange(p,p);}catch(e){}}};
  var cv=$('#aeCsv');if(cv)cv.onclick=function(){var R=AEMP.data;if(!R||!R.ok)return;var BN={both:'둘 다',ss:'삼성만',lg:'LG만',none:'미사용'};
    var tf=function(f,lg,N){N=N||{};return aeTop(f,lg).sort(function(a,b){return (N[b]||f[b])-(N[a]||f[a]);}).slice(0,5).map(function(k){return aeFn(k,lg)[1]+' '+(N[k]||f[k])+'회('+f[k]+'일)';}).join(' / ');};
    csvDown([['사번','이름','지점','직책','삼성 이용일','삼성 담은 날','삼성 견적 낸 날','삼성 마지막','LG 이용일','LG 담은 날','LG 견적 낸 날','LG 마지막','쿠쿠 이용일','쿠쿠 담은 날','쿠쿠 견적 낸 날','쿠쿠 마지막','삼성 기능 횟수','삼성 담기 횟수','삼성 견적 횟수','LG 기능 횟수','LG 담기 횟수','LG 견적 횟수','쿠쿠 기능 횟수','쿠쿠 담기 횟수','쿠쿠 견적 횟수','약관 동의 횟수','약관 마지막 동의','상태 (삼성 · LG)','명부','삼성 많이 쓴 기능','LG 많이 쓴 기능','쿠쿠 많이 쓴 기능']].concat(aeList().map(function(x){var r=x.r;return [x.e,x.name,x.br,x.rank,r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11]].concat(x.c[0],x.c[1],x.c[2]).concat([(aeTm(x.e)||[0,0])[1],(aeTm(x.e)||[''])[0],BN[x.st],x.inR?'O':'X',tf(x.f[0],0,x.fn[0]),tf(x.f[1],1,x.fn[1]),tf(x.f[2]||{},2,x.fn[2])]);})),'사번별이용_'+(AEMP.days?AEMP.days+'일':'전체')+'_'+todayStr().replace(/-/g,'')+'.csv');};
}
function afDs(d){return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8);}
function afMd(d){return (+d.slice(4,6))+'/'+(+d.slice(6,8));}
function afShift(d,k){var t=new Date(+d.slice(0,4),+d.slice(4,6)-1,+d.slice(6,8)+k);return t.getFullYear()+('0'+(t.getMonth()+1)).slice(-2)+('0'+t.getDate()).slice(-2);}
function admFeatHtml(){var R=AFEAT.data,day=AFEAT.days==='d',td=todayStr().replace(/-/g,''),h='<div class="afb">'+[['','전체'],['ss','삼성'],['lg','LG'],['ck','쿠쿠']].map(function(x){return '<button class="'+(AFEAT.brand===x[0]?'on':'')+'" data-afb="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>'+(AFEAT.brand==='lg'?'<div class="hint" style="margin:6px 0 0">LG 계산기 기능 기록은 v8.24부터 쌓여요.</div>':AFEAT.brand==='ck'?'<div class="hint" style="margin:6px 0 0">쿠쿠 계산기 기능 기록은 v8.34부터 쌓여요.</div>':'')+'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><div class="chips" style="margin:0">'+[[1,'오늘'],[7,'7일'],[30,'30일'],['d','📅 날짜별']].map(function(x){return '<button class="chip sm '+(AFEAT.days===x[0]?'on':'')+'" data-afd="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div><button class="btn line sm" id="afCsv">⬇ CSV</button></div>';
  if(day){var dd=AFEAT.date||td;
    h+='<div class="afd-nav"><button class="btn line sm" data-afs="-1">‹ 전날</button><input type="date" id="afDate" value="'+afDs(dd)+'" max="'+afDs(td)+'"><button class="btn line sm" data-afs="1" '+(dd>=td?'disabled':'')+'>다음날 ›</button></div>';
    if(R&&R.ok&&R.daily){var mx2=Math.max.apply(null,[1].concat(R.daily.map(function(x){return x.n;})));
      h+='<div class="afd-chart">'+R.daily.map(function(x){var w=['일','월','화','수','목','금','토'][new Date(+x.d.slice(0,4),+x.d.slice(4,6)-1,+x.d.slice(6,8)).getDay()];
        return '<button data-afday="'+x.d+'" class="'+(x.d===dd?'on':'')+'" title="'+x.n+'회 · '+x.u+'명"><em>'+(x.n?x.n:'')+'</em><i style="height:'+Math.max(2,Math.round(x.n/mx2*70))+'px"></i><span>'+afMd(x.d)+'</span><small class="'+(w==='일'?'su':w==='토'?'sa':'')+'">'+w+'</small></button>';}).join('')+'</div><div class="hint" style="margin:4px 0 0">최근 14일 · 막대를 누르면 그날 기록을 봐요</div>';}
  }
  if(!R)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(!R.ok)return h+'<div class="warn" style="margin-top:12px">불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
  var L=R.list.filter(function(x){return FNAME[x.k];}),D={};R.list.forEach(function(x){D[x.k]=x;});
  var tot=L.reduce(function(a,x){return a+x.n;},0),mx=Math.max.apply(null,[1].concat(L.map(function(x){return x.n;})));
  h+='<div class="adm-kpi" style="margin-top:10px"><div><span>총 사용</span><b>'+tot.toLocaleString()+'</b></div><div><span>사용 사번</span><b>'+R.users+'</b></div><div><span>1인 평균</span><b>'+(R.users?Math.round(tot/R.users):0)+'회</b></div><div><span>견적 완성률</span><b>'+(R.addUsers?Math.round(R.done/R.addUsers*100):0)+'%</b></div><div><span>가장 많이 쓴 기능</span><b style="font-size:16px">'+(L[0]?fnm(L[0].k):'-')+'</b></div></div>';
  h+='<div class="adm-sec">'+(day?afMd(AFEAT.date||td)+' ':'')+'기능별 사용 순위 <small>'+(day?'전날':'이전 '+(AFEAT.days===1?'날':AFEAT.days+'일'))+' 대비 · 사번 = 그 기능을 쓴 사람 수</small></div>';
  var dv=function(x){if(!x.prev)return '<span style="color:#16a34a">NEW</span>';var d=Math.round((x.n-x.prev)/x.prev*100);return d>0?'<span style="color:#dc2626">▲'+d+'%</span>':d<0?'<span style="color:#2563eb">▼'+(-d)+'%</span>':'<span style="color:#94a3b8">–</span>';};
  h+=L.length?'<div class="fu fuh"><span></span><span>기능</span><span>사용 횟수</span><span style="text-align:right">횟수</span><span style="text-align:right">사번</span><span style="text-align:right">변화</span></div>'+L.map(function(x){var f=FNAME[x.k];return '<div class="fu"><span class="ic">'+f[0]+'</span><span class="nm">'+fnm(x.k)+'</span><span class="fbar"><i style="width:'+Math.max(2,x.n/mx*100)+'%"></i></span><span class="n">'+x.n.toLocaleString()+'</span><span class="u">'+x.u+'명</span><span class="d">'+dv(x)+'</span></div>';}).join('')
    :'<div class="empty" style="margin-top:8px">아직 기록이 없어요. v7.7 이상 화면에서 쓴 기능부터 쌓여요.</div>';
  var grp=function(pre,names,cols){var a=names.map(function(n,i){var x=D[pre+n[0]];return [n[1],x?x.n:0,cols[i]];}),s=a.reduce(function(t,v){return t+v[1];},0);if(!s)return '';
    a=a.filter(function(v){return v[1];}).map(function(v){return [v[0],Math.round(v[1]/s*100),v[2]];});
    return '<div><h5>'+'</h5><div class="sb">'+a.map(function(v){return '<span style="width:'+v[1]+'%;background:'+v[2]+'"></span>';}).join('')+'</div><div class="sl">'+a.map(function(v){return '<span><i style="background:'+v[2]+'"></i>'+esc(v[0])+' '+v[1]+'%</span>';}).join('')+'</div></div>';};
  var G=[['고객 유형',grp('cust:',[['combo',AFEAT.brand==='ck'?'패키지 자동':'신규 결합'],['single',AFEAT.brand==='ck'?'단건':'신규 단건'],['exist','기존 구독'],['sb','소상공인']],['#6366f1','#93c5fd','#f59e0b','#10b981'])],
    ['견적 인쇄 종류',grp('print:',[['basic','기본'],['feel','체감가'],['lump','일시불 비교'],['feellump','체감가+일시불']],['#64748b','#e11d48','#0284c7','#7c3aed'])],
    ['선택한 제휴카드',grp('card:',CARDS.map(function(c){return [c.id,c.name.replace('카드','').replace('은행BC','BC')+(AFEAT.brand?'':' (삼성)')];}).concat(Object.keys(LGCARD_N).map(function(k){return ['lg-'+k,LGCARD_N[k]+(AFEAT.brand?'':' (LG)')];})).concat(Object.keys(CKCARD_N).map(function(k){return ['ck-'+k,CKCARD_N[k]+(AFEAT.brand?'':' (쿠쿠)')];})),['#1d4ed8','#f59e0b','#ef4444','#0ea5e9','#10b981','#94a3b8','#a50034','#7c3aed','#db2777','#0d9488','#ea580c','#65a30d','#475569','#be123c','#0369a1'])],
    ['선납 선택',grp('pre:',[['0','안 함'],['20','20%'],['30','30%'],['40','40%'],['50','50%'],['rate','비율 선납 (LG)'],['fix','정액 선납 (LG)']],['#cbd5e1','#a5b4fc','#818cf8','#6366f1','#4338ca','#f472b6','#be185d'])],
    ['사용 기기',grp('dev:',[['PC','PC'],['모바일','모바일']],['#334155','#22c55e'])],
    ['계약 기간',grp('term:',[['max','최장'],['other','그 외']],['#16a34a','#cbd5e1'])]].filter(function(g){return g[1];});
  if(G.length)h+='<div class="adm-sec" style="margin-top:16px">어떻게 쓰고 있나요</div><div class="split">'+G.map(function(g){return g[1].replace('<h5></h5>','<h5>'+g[0]+'</h5>');}).join('')+'</div>';
  var hrs=[];for(var t=7;t<=21;t++)hrs.push([t,(D['h:'+('0'+t).slice(-2)]||{n:0}).n]);var hm=Math.max.apply(null,[1].concat(hrs.map(function(x){return x[1];})));
  if(hm>1||hrs.some(function(x){return x[1];}))h+='<div class="adm-sec" style="margin-top:16px">시간대별 사용</div><div style="display:flex;align-items:flex-end;gap:4px;height:90px;border-bottom:1px solid var(--line)">'+hrs.map(function(x){var v=Math.round(x[1]/hm*80);return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%" title="'+x[1]+'회"><div style="width:70%;height:'+v+'px;background:'+(x[1]>=hm*0.85?'#6366f1':'#c7d2fe')+';border-radius:4px 4px 0 0"></div></div>';}).join('')+'</div><div style="display:flex;gap:4px;font-size:11px;color:var(--sub)">'+hrs.map(function(x){return '<span style="flex:1;text-align:center">'+x[0]+'시</span>';}).join('')+'</div>';
  return h+'<div class="note">견적 완성률 = 모델을 담은 사번 중 인쇄 · 보관 · 복사까지 한 비율. 기능 사용은 화면 신호(75초)에 묶어 보내고 5분마다 시트(기능통계)에 반영돼요.</div>';}
function rInfo(e){var M=ADM.stat&&ADM.stat.rmap;return M&&M[e]||null;}
function rHasMap(){var M=ADM.stat&&ADM.stat.rmap;return !!(M&&Object.keys(M).length);}
function rTp(t){return t==='직원'?'<span class="tp s">직원</span>':t==='윈윈'?'<span class="tp w">윈윈</span>':t?'<span class="tp p">'+esc(t)+'</span>':'';}
function rWho(e,big){var r=rInfo(e);if(r)return '<span class="who"><b'+(big?' style="font-size:15px"':'')+'>'+esc(e)+'</b><span class="nm">'+esc(r[0])+'</span><span class="br">'+esc(r[1])+'</span><span class="rk">'+esc(r[2])+'</span>'+rTp(r[3])+(r[4]?'<span class="rk">· '+esc(r[4])+'</span>':'')+'</span>';
  return '<span class="who"><b'+(big?' style="font-size:15px"':'')+'>'+esc(e)+'</b>'+(rHasMap()?(RS.ex&&RS.ex[e]?'<span class="tp w">예외 허용</span>':'<span class="nr">명부에 없음</span>'):'')+'</span>';}
var RS={data:null,up:null,q:'',br:'',tp:''};
function rsLoad(){gsr('adminRoster',ADM.pw,function(r){RS.data=r&&r.ok?r:{ok:false};RS.ex=RS.data.ex||{};if(ADM.tab==='roster'||ADM.tab==='stat')admRender();},function(){RS.data={ok:false};if(ADM.tab==='roster')admRender();});}
function parseRosterWB(wb){var aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:null}),h=-1,col={};
  for(var r=0;r<Math.min(15,aoa.length);r++){if((aoa[r]||[]).some(function(c){return nz(c)==='사번';})){h=r;break;}}
  if(h<0)return {err:'\'사번\' 열을 찾지 못했어요.'};
  (aoa[h]||[]).forEach(function(c,i){var t=nz(c);if(t==='사번')col.e=i;else if(/성명|이름/.test(t))col.n=i;else if(/부서|지점|소속/.test(t)&&col.b==null)col.b=i;else if(/직책|직급/.test(t))col.k=i;else if(/사원구분|구분/.test(t)&&col.t==null)col.t=i;else if(/협력|업체/.test(t))col.c=i;});
  var map={},n=0;for(var k=h+1;k<aoa.length;k++){var row=aoa[k]||[],e=String(row[col.e]==null?'':row[col.e]).replace(/[^0-9A-Za-z]/g,'').toUpperCase();if(!e)continue;
    var g=function(i){return i==null||row[i]==null?'':String(row[i]).trim();};map[e]=[g(col.n),g(col.b),g(col.k),g(col.t),g(col.c)];n++;}
  if(!n)return {err:'읽을 수 있는 사번이 없어요.'};return {map:map,n:Object.keys(map).length,cols:col};}
function rsDiff(nm){var om=(RS.data&&RS.data.map)||{},add=0,del=0,ch=0;Object.keys(nm).forEach(function(k){if(!om[k])add++;else if(JSON.stringify(om[k])!==JSON.stringify(nm[k]))ch++;});Object.keys(om).forEach(function(k){if(!nm[k])del++;});return {add:add,del:del,ch:ch};}
function admRosterHtml(){var D=RS.data,h='';h+='<div class="adm-sec">🔐 PIN 필수 입장 <small id="pinState">확인 중…</small></div><div class="ae-tools"><button class="btn sm" id="pinReqBtn" disabled>…</button></div><div class="hint" style="margin:4px 0 10px">켜면 모든 직원이 입장할 때 PIN 4자리를 넣어요 (처음이면 새로 정함). 끄면 지금처럼 사번만으로 입장해요. 견적 보관함은 PIN으로 입장한 기기에서만 열려요.</div>';h+='<div class="adm-sec">🔐 직원 PIN 초기화 <small>PIN을 잊은 직원 · 다음 입장 때 새로 정해요</small></div><div class="ae-tools"><input type="search" id="pinRsEmp" placeholder="사번 6자리" inputmode="numeric" maxlength="6" autocomplete="off"><button class="btn line sm" id="pinRsGo">초기화</button></div>';if(!D)return '<div class="empty" style="margin-top:12px">불러오는 중…</div>';if(!D.ok)return '<div class="warn" style="margin-top:12px">불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
  var map=D.map||{},keys=Object.keys(map),cnt={},brs={};keys.forEach(function(k){var r=map[k];cnt[r[3]]=(cnt[r[3]]||0)+1;brs[r[1]]=(brs[r[1]]||0)+1;});
  h+='<div class="adm-card">현재 명부: '+(D.meta?'<b>'+esc(D.meta.file)+'</b> · '+esc(D.meta.at)+' 업로드 · <b>'+keys.length+'명</b> ('+Object.keys(cnt).map(function(k){return esc(k||'기타')+' '+cnt[k];}).join(' · ')+') · 소속 '+Object.keys(brs).length+'곳':'<b>아직 올린 명부가 없어요</b> · 명부가 없으면 누구나 입장할 수 있어요')+'</div>';
  h+='<label class="rs-drop">📂 <b>명부 엑셀(.xlsx) 올리기</b><br><small>성명 · 사번 · 부서 · 직책 · 사원구분 · 협력업체명 열을 자동으로 찾아요</small><input type="file" id="rsFile" accept=".xlsx,.xls" style="display:none"></label>';
  var U=RS.up;if(U&&U.err)h+='<div class="warn">'+esc(U.err)+'</div>';
  if(U&&U.map){var df=rsDiff(U.map);h+='<div class="adm-sec" style="margin-top:12px">올린 파일 비교 <small>'+esc(U.file)+'</small></div><div class="rs-diff"><div>새 명부<b>'+U.n+'명</b></div><div>신규<b style="color:#16a34a">+'+df.add+'</b></div><div>제외(퇴사 · 이동)<b style="color:#dc2626">−'+df.del+'</b></div><div>정보 변경<b style="color:#d97706">'+df.ch+'</b></div></div>'
    +'<div style="display:flex;gap:8px;margin-top:10px"><button class="btn pri" id="rsApply" style="flex:1">✅ 이 명부로 적용</button><button class="btn line" id="rsCancel">취소</button></div>';}
  h+='<div class="adm-sec" style="margin-top:14px">🔐 입장 방식</div><div class="acc"><button data-rmode="strict" class="'+(D.mode!=='open'?'on':'')+'"><b>명부 사번만 입장</b><span>명부에 없는 사번은 입장 불가.<br>아래 예외 허용 목록은 들어올 수 있어요.</span></button><button data-rmode="open" class="'+(D.mode==='open'?'on':'')+'"><b>누구나 입장 (표시만)</b><span>명부에 없어도 입장 가능.<br>관리자 화면에 "명부에 없음"으로만 표시돼요.</span></button></div>';
  var exk=Object.keys(D.ex||{});
  h+='<div class="hint" style="margin-top:6px">'+(!keys.length?'⚠️ 명부가 없어서 지금은 누구나 입장할 수 있어요.':D.mode!=='open'?'🔒 지금: 명부 사번'+(exk.length?' + 예외 허용 '+exk.length+'명':'')+'만 입장할 수 있어요. 바꾸면 75초 안에 모든 화면에 적용돼요.':'🔓 지금: 누구나 입장할 수 있어요. 명부에 없는 사번은 접속 현황에서 빨간색으로 보여요.')+'</div>';
  h+='<div class="adm-sec" style="margin-top:16px">✅ 예외 허용 (명부에 없어도 입장) <small>신입 · 타 지점 지원 · 협력사 등</small></div><div class="adm-tool"><input id="rxEmp" placeholder="사번 6자리" inputmode="numeric" maxlength="6" style="max-width:130px"><input id="rxMemo" placeholder="이름 / 메모 (예: 신입 · 12월 명부 반영 예정)"><select id="rxDays"><option value="0">기한 없음</option><option value="7">7일</option><option value="30">30일</option></select><button class="btn pri sm" id="rxAdd">+ 허용</button></div>';
  h+='<div class="exl">'+(exk.length?exk.map(function(k){var x=D.ex[k];return '<div class="r"><b>'+esc(k)+'</b><span>'+esc(x.memo||'-')+'</span><small>'+(x.until?esc(x.until.slice(5).replace('-','.'))+'까지':'기한 없음')+'</small><button class="btn line sm" data-rxdel="'+esc(k)+'">해제</button></div>';}).join(''):'<div class="hint">예외 허용한 사번이 없어요.</div>')+'</div>';
  if(keys.length){var te={};((ADM.stat&&ADM.stat.todayEmps)||[]).forEach(function(x){te[x.emp]=x;});
    h+='<div class="adm-sec" style="margin-top:16px">명부 검색 <small>오늘 접속 여부 함께 표시</small></div><div class="adm-tool"><input id="rsQ" placeholder="🔍 이름 · 사번 · 소속 검색" value="'+esc(RS.q)+'"><select id="rsBr"><option value="">전체 소속</option>'+Object.keys(brs).sort().map(function(b){return '<option '+(RS.br===b?'selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select><select id="rsTp"><option value="">전체 구분</option>'+Object.keys(cnt).map(function(t){return '<option '+(RS.tp===t?'selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select><select id="rsOn"><option value="">접속 전체</option><option value="y" '+(RS.on==='y'?'selected':'')+'>오늘 접속</option><option value="n" '+(RS.on==='n'?'selected':'')+'>미접속</option></select><button class="btn line sm" id="rsCsv">⬇ CSV</button></div><div id="rsList"></div>';}
  return h+'<div class="note">명부는 공개 깃허브가 아닌 구글 드라이브(서버)에만 저장돼요. 이름은 관리자 화면에서만 보이고, 직원 화면 · 견적서에는 나오지 않아요.</div>';}
function rsRows(){var D=RS.data,map=D.map||{},te={};((ADM.stat&&ADM.stat.todayEmps)||[]).forEach(function(x){te[x.emp]=x;});var q=RS.q.trim();
  return Object.keys(map).filter(function(k){var r=map[k];if(RS.br&&r[1]!==RS.br)return false;if(RS.tp&&r[3]!==RS.tp)return false;if(RS.on==='y'&&!te[k])return false;if(RS.on==='n'&&te[k])return false;return !q||(k+' '+r.join(' ')).indexOf(q)>=0;})
    .sort(function(a,b){return (map[a][1]<map[b][1]?-1:map[a][1]>map[b][1]?1:0)||(te[b]?1:0)-(te[a]?1:0);}).map(function(k){return [k,map[k],te[k]];});}
function rsList(){var el=$('#rsList');if(!el)return;var L=rsRows(),lim=RS.more?L.length:50;
  el.innerHTML=L.length?'<div class="scroll" style="margin-top:8px"><table class="tbl"><tr><th>사번</th><th>성명</th><th>소속</th><th>직책</th><th>구분</th><th>오늘</th></tr>'+L.slice(0,lim).map(function(x){var r=x[1],t=x[2];return '<tr><td><b>'+esc(x[0])+'</b></td><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+esc(r[2])+'</td><td>'+rTp(r[3])+(r[4]?' <small style="color:var(--sub)">'+esc(r[4])+'</small>':'')+'</td><td>'+(t?'<b style="color:#16a34a">● '+t.n+'회</b> <small style="color:var(--sub)">'+esc(t.last)+'</small>':'<span style="color:#94a3b8">미접속</span>')+'</td></tr>';}).join('')+'</table></div>'
    +(L.length>lim?'<a href="#" class="link" id="rsMore" style="display:inline-block;margin-top:8px;font-size:13px">'+L.length+'명 중 '+lim+'명 표시 · 모두 보기 ▾</a>':'<div class="hint" style="margin-top:6px">'+L.length+'명</div>'):'<div class="empty" style="margin-top:8px">검색 결과가 없어요.</div>';
  var m=$('#rsMore');if(m)m.onclick=function(e){e.preventDefault();RS.more=true;rsList();};}
function admRosterBind(){var prb=$('#pinReqBtn');if(prb){var pinUi=function(r){if(!r||!r.ok){$('#pinState').textContent='불러오지 못했어요';return;}$('#pinState').innerHTML=(r.on?'<b style="color:#15803d">켜짐</b>':'<b style="color:#64748b">꺼짐</b>')+' · PIN 정한 직원 '+r.n+'명';prb.disabled=false;prb.dataset.on=r.on?1:'';prb.textContent=r.on?'PIN 필수 끄기':'PIN 필수 켜기';prb.className='btn sm '+(r.on?'line':'pri');};
  gsr('adminPinInfo',ADM.pw,pinUi,function(){$('#pinState').textContent='서버에 연결하지 못했어요';});
  prb.onclick=function(){var on=!prb.dataset.on;if(!confirm(on?'PIN 필수를 켤까요?\n\n모든 직원이 다음 입장 때 PIN을 넣어야 해요 (처음이면 새로 정함).':'PIN 필수를 끌까요?\n\n사번만으로 입장하게 돼요.'))return;prb.disabled=true;
    gsr('adminPinRequiredSet',{pw:ADM.pw,on:on},function(r){if(!r||!r.ok){toast((r&&r.msg)||'바꾸지 못했어요');prb.disabled=false;return;}toast(r.on?'PIN 필수를 켰어요':'PIN 필수를 껐어요');gsr('adminPinInfo',ADM.pw,pinUi);},function(){prb.disabled=false;toast('서버에 연결하지 못했어요');});};}
var pg=$('#pinRsGo');if(pg)pg.onclick=function(){var e=($('#pinRsEmp').value||'').replace(/[^0-9]/g,'');if(e.length!==6){toast('사번 6자리를 입력해 주세요');return;}if(!confirm(e+' 사번의 PIN을 초기화할까요?'))return;gsr('adminPinReset',{pw:ADM.pw,emp:e},function(r){toast(r&&r.ok?e+' PIN을 초기화했어요':(r&&r.msg)||'초기화하지 못했어요');if(r&&r.ok)$('#pinRsEmp').value='';},function(){toast('서버에 연결하지 못했어요');});};var f=$('#rsFile');if(f)f.onchange=function(){var file=f.files[0];if(!file)return;toast('명부를 읽는 중…');readXlsxFile(file,function(wb){var r=parseRosterWB(wb);RS.up={file:file.name,map:r.map,n:r.n,err:r.err};admRender();});};
  var ap=$('#rsApply');if(ap)ap.onclick=function(){ap.disabled=true;ap.textContent='적용 중…';gsr('adminSaveRoster',{pw:ADM.pw,map:RS.up.map,file:RS.up.file},function(r){if(r&&r.ok){toast('명부를 적용했어요 · '+r.meta.count+'명');RS.up=null;rsLoad();admRefresh();}else{toast((r&&r.msg)||'적용하지 못했어요');admRender();}},function(){toast('서버에 연결하지 못했어요');admRender();});};
  var cc=$('#rsCancel');if(cc)cc.onclick=function(){RS.up=null;admRender();};
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-rmode]'),function(b){b.onclick=function(){var m=b.dataset.rmode;if(m===RS.data.mode)return;
    if(m==='strict'&&!confirm('명부에 없는 사번은 입장할 수 없게 돼요.\n지금 접속 중인 명부 외 사번은 75초 안에 입장 화면으로 돌아가요. 바꿀까요?'))return;
    gsr('adminRosterMode',{pw:ADM.pw,mode:m},function(r){if(r&&r.ok){RS.data.mode=r.mode;toast(r.mode==='open'?'누구나 입장으로 바꿨어요':'명부 사번만 입장으로 바꿨어요');admRender();}});};});
  var ra=$('#rxAdd');if(ra)ra.onclick=function(){var e=$('#rxEmp').value.replace(/[^0-9]/g,'');if(!empOk(e)){toast('사번 6자리를 입력해 주세요');return;}rsExAdd(e,$('#rxMemo').value,$('#rxDays').value);};
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-rxdel]'),function(b){b.onclick=function(){var e=b.dataset.rxdel;if(!confirm(e+' 예외 허용을 해제할까요?'))return;gsr('adminRosterEx',{pw:ADM.pw,op:'del',emp:e},function(r){if(r&&r.ok){RS.data.ex=RS.ex=r.ex;toast('해제했어요');admRender();}});};});
  var q=$('#rsQ');if(q){q.oninput=function(){RS.q=this.value;RS.more=false;rsList();};$('#rsBr').onchange=function(){RS.br=this.value;rsList();};$('#rsTp').onchange=function(){RS.tp=this.value;rsList();};$('#rsOn').onchange=function(){RS.on=this.value;rsList();};
    $('#rsCsv').onclick=function(){csvDown([['사번','성명','소속','직책','구분','협력업체','오늘 접속','마지막 접속']].concat(rsRows().map(function(x){return [x[0]].concat(x[1]).concat([x[2]?x[2].n:0,x[2]?x[2].last:'']);})),'직원명부_접속_'+todayStr()+'.csv');};rsList();}}
function rsExAdd(e,memo,days){gsr('adminRosterEx',{pw:ADM.pw,op:'add',emp:e,memo:memo||'',days:+days||0},function(r){if(r&&r.ok){if(RS.data)RS.data.ex=r.ex;RS.ex=r.ex;toast(e+' 예외 허용했어요');admRender();}else toast('허용하지 못했어요');});}
var ABEST={days:7,data:null,load:false,br:''};
function abBr(code){code=String(code);return code.indexOf('LG--')===0?'lg':code.indexOf('CK--')===0?'ck':'ss';}
function admBestLoad(){ABEST.load=true;ABEST.data=null;gsr('adminBest',{pw:ADM.pw,days:ABEST.days},function(r){ABEST.load=false;ABEST.data=r&&r.ok?r:{ok:false};if(ADM.tab==='best')admRender();},function(){ABEST.load=false;ABEST.data={ok:false};if(ADM.tab==='best')admRender();});}
function admBestHtml(){var R=ABEST.data,h='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><div class="chips" style="margin:0">'+[[1,'오늘'],[7,'7일'],[30,'30일']].map(function(x){return '<button class="chip sm '+(ABEST.days===x[0]?'on':'')+'" data-abd="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div><button class="btn line sm" id="abCsv">⬇ 엑셀(CSV)</button></div><div class="afb">'+[['','전체'],['ss','삼성'],['lg','LG'],['ck','쿠쿠']].map(function(x){return '<button class="'+(ABEST.br===x[0]?'on':'')+'" data-abb="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  if(!R)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(R.ok&&ABEST.br){var LL=R.list.filter(function(x){return abBr(x[0])===ABEST.br;}),TT=[0,0,0,0];LL.forEach(function(x){for(var j=0;j<4;j++)TT[j]+=x[1+j];});R={ok:true,list:LL,total:TT,models:LL.length};}
  if(!R.ok)return h+'<div class="warn" style="margin-top:12px">불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
  var T=R.total;h+='<div class="adm-kpi" style="margin-top:10px"><div><span>조회 모델 수</span><b>'+R.models+'</b></div><div><span>총 조회</span><b>'+T[0].toLocaleString()+'</b></div><div><span>담기</span><b>'+T[1].toLocaleString()+'</b></div><div><span>인쇄</span><b>'+T[2].toLocaleString()+'</b></div><div><span>보관</span><b>'+T[3].toLocaleString()+'</b></div></div>';
  h+=R.list.length?'<div class="scroll" style="margin-top:10px"><table class="tbl"><tr><th>순위</th><th>모델</th><th>조회</th><th>담기</th><th>인쇄</th><th>보관</th><th>담기율</th></tr>'+R.list.slice(0,100).map(function(x,i){var m=byCode[x[0]];
    return '<tr><td><b>'+(i+1)+'</b></td><td style="text-align:left"><b>'+esc(String(x[0]).replace(/^(LG|CK)--/,''))+'</b>'+({lg:' <small style="color:#a50034;font-weight:800">LG</small>',ck:' <small style="color:#c8102e;font-weight:800">쿠쿠</small>'}[abBr(x[0])]||'')+(m?'<br><small style="color:var(--sub)">'+esc(catOf(m))+' · '+esc(subOf(m))+'</small>':'')+'</td><td>'+x[1]+'</td><td>'+x[2]+'</td><td>'+x[3]+'</td><td>'+x[4]+'</td><td>'+(x[1]?Math.round(x[2]/x[1]*100)+'%':'-')+'</td></tr>';}).join('')+'</table></div>':'<div class="empty" style="margin-top:12px">아직 집계된 기록이 없어요.</div>';
  return h+'<div class="note">조회 = 모델을 눌러 선택한 횟수 (같은 사번도 매번 집계) · 담기 = 담은 모델에 추가 · 인쇄/보관 = 견적에 포함된 횟수. 순위는 조회 + 담기×2 기준, 5분마다 반영돼요.</div>';}
function admVerHtml(){return '<div class="hint" style="margin-top:10px">현재 버전 <b>'+VERSION+'</b> ('+VER_DATE+') · 수정 내역은 관리자만 볼 수 있어요</div>'+CHANGELOG.map(function(c,k){return '<div class="cl"><div class="h">'+c[0]+' <small>'+c[1]+'</small>'+(k===0?'<span class="new">NEW</span>':'')+'</div><ul>'+c[2].map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>';}).join('');}
function admQuoteLoad(){ADM.qload=true;gsr('adminListQuotes',{pw:ADM.pw},function(r){ADM.qload=false;if(r&&r.ok){ADM.quotes=r;}else ADM.quotes={ok:false};if(ADM.tab==='quote')admRender();},function(){ADM.qload=false;ADM.quotes={ok:false,err:1};if(ADM.tab==='quote')admRender();});}
function admQuoteHtml(){
  if(!ADM.quotes){if(!ADM.qload)admQuoteLoad();return '<div class="empty" style="margin-top:12px">견적 목록을 불러오는 중…</div>';}
  var Q=ADM.quotes;if(!Q.ok)return '<div class="warn" style="margin-top:12px">견적 목록을 불러오지 못했어요.'+(HAS_GS?'':' (서버 연결이 없는 상태예요)')+'</div>';
  var td=todayStr(),list=Q.list||[],emps={};list.forEach(function(x){emps[x.emp]=(emps[x.emp]||0)+1;});
  var todayN=list.filter(function(x){return String(x.ts).indexOf(td)===0;}).length;
  var h='<div class="adm-kpi"><div><span>전체 견적</span><b>'+(Q.total||list.length)+'</b></div><div><span>오늘 저장</span><b>'+todayN+'</b></div><div><span>저장한 사번</span><b>'+Object.keys(emps).length+'</b></div></div>';
  h+='<div style="display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap"><div class="search" style="flex:1;min-width:200px"><svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="text" id="aqQ" placeholder="사번 · 고객명 · 모델 · 메모 검색" value="'+esc(ADM.aqq||'')+'" autocomplete="off"></div>'
    +'<button class="btn line sm" id="aqRef">새로고침</button>'+(Q.url?'<a class="btn line sm" style="text-decoration:none;display:inline-flex;align-items:center" href="'+esc(Q.url)+'" target="_blank" rel="noopener">구글 시트 열기 ↗</a>':'')+'</div>';
  h+='<div id="aqList" style="margin-top:10px"></div>';
  return h;
}
function admQuoteList(){
  var el=$('#aqList');if(!el||!ADM.quotes||!ADM.quotes.ok)return;
  var q=String(ADM.aqq||'').toLowerCase().replace(/-/g,''),list=ADM.quotes.list||[];
  var f=list.filter(function(x){return !q||(x.emp+' '+x.name+' '+x.summary+' '+x.memo).toLowerCase().replace(/-/g,'').indexOf(q)>=0;});
  el.innerHTML='<div class="hint">'+(q?'검색 결과 '+f.length+'건':'최근 저장순 '+f.length+'건')+'</div>'+(f.length?f.slice(0,300).map(function(x){
    return '<div class="qi" style="border:1px solid var(--line)"><div class="qi-h"><div><b>'+esc(x.name)+'</b> <span class="tag gr">사번 '+esc(x.emp)+'</span></div><div class="ts">'+esc(x.ts)+'</div></div>'
      +'<div class="mo">월 '+won(x.monthly)+(x.prepay?' <span style="font-size:12.5px;color:var(--sub);font-weight:600">· 선납 '+won(x.prepay)+'</span>':'')+'</div>'
      +'<div class="sm">'+esc(x.summary)+(x.memo?'<br>📝 '+esc(x.memo):'')+'</div>'
      +'<div class="act"><button class="btn pri" data-aload="'+esc(x.id)+'">불러오기</button><button class="btn del" data-adel="'+esc(x.id)+'">삭제</button></div></div>';}).join('')
    :'<div class="empty">'+(list.length?'검색 결과가 없어요.':'아직 보관된 견적이 없어요.')+'</div>');
}
function admQuoteBind(){
  admQuoteList();
  var i=$('#aqQ');if(i)i.oninput=function(){ADM.aqq=i.value;admQuoteList();};
  var r=$('#aqRef');if(r)r.onclick=function(){ADM.quotes=null;admRender();};
  var L=$('#aqList');if(L)L.onclick=function(e){
    var a=e.target.closest('[data-aload]');if(a){var q=(ADM.quotes.list||[]).filter(function(x){return x.id===a.dataset.aload;})[0];if(q){$('#admModal').classList.remove('on');loadQuote(q);}return;}
    var d=e.target.closest('[data-adel]');if(d){
      if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='한 번 더 누르면 삭제';setTimeout(function(){if(d.isConnected){d.dataset.sure='';d.textContent='삭제';}},3000);return;}
      d.disabled=true;gsr('adminDeleteQuote',{pw:ADM.pw,id:d.dataset.adel},function(res){if(res&&res.ok){ADM.quotes.list=ADM.quotes.list.filter(function(x){return x.id!==d.dataset.adel;});ADM.quotes.total=(ADM.quotes.total||1)-1;toast('삭제했어요');admRender();}else{d.disabled=false;toast('삭제하지 못했어요');}});}
  };
}
function admTabsHtml(){var t=ADM.tab||'stat';return '<div class="adm-tabs" id="admTabs">'+[['stat','📊 접속 현황'],['roster','👥 직원 명부'],['best','🔥 베스트 모델'],['feat','📈 기능 사용'],['emp','🧾 사번별 이용'],['terms','✅ 약관 · PIN'],['plog','🖨 인쇄 기록'],['fb','💡 개선 요청'],['bn','📣 상단 배너'],['price','💰 단가표'],['promo','🏆 추가 판촉'],['lg','🅻 LG 단가 · 카드정책'],['ck','🅲 쿠쿠 단가 · 프로모션'],['notice','📢 공지'],['quote','📁 견적 관리'],['ver','📝 수정 내역']].map(function(x){return '<button class="chip sm '+(t===x[0]?'on':'')+'" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';}
function admNoticeLoad(){NT.load=true;gsr('adminNotice',ADM.pw,function(r){NT.load=false;NT.info=r&&r.ok?r:{ok:false};if(ADM.tab==='notice')admRender();},function(){NT.load=false;NT.info={ok:false};if(ADM.tab==='notice')admRender();});
  if(!ADM.stat)gsr('adminStats',ADM.pw,function(r){if(r&&r.ok){ADM.stat=r;if(ADM.tab==='notice')admRender();}});}
function ntPicked(){var out=[],d=NT.draft;if(NT.edit&&d.extra)d.extra.forEach(function(x,j){if(d.exOn[j]!==false)out.push(x);});CHANGELOG.forEach(function(v,k){v[2].forEach(function(x,j){if(NT.draft.pick[k+'_'+j])out.push(x);});});return out;}
function admNoticeHtml(){
  var I=NT.info,h='',d=NT.draft,seg=NT.seg||'cur',pk=ntPicked().length;
  var pc=0,n=I&&I.ok&&I.notice;
  if(n){var ack0=I.acks||[],te0=(ADM.stat&&ADM.stat.todayEmps||[]).length,base0=Math.max(te0,ack0.length);pc=base0?Math.round(ack0.length/base0*100):0;}
  h+='<div class="nt2-seg"><button data-ntseg="cur" class="'+(seg==='cur'?'on':'')+'">📌 현재 공지'+(n?' <small>확인 '+pc+'%</small>':'')+'</button><button data-ntseg="new" class="'+(seg==='new'?'on':'')+'">'+(NT.edit?'✏️ 공지 수정 <small>수정 중</small>':'✏️ 새 공지 작성'+(d.title||pk?' <small>작성 중</small>':''))+'</button></div>';
  if(seg==='cur'){
    if(!I)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
    if(!I.ok)return h+'<div class="warn" style="margin-top:12px">공지 정보를 불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
    if(!n)return h+'<div class="nt2-empty"><div style="font-size:30px">📭</div><b>지금 올라간 공지가 없어요</b><span>새 공지를 올리면 직원 화면에 팝업으로 떠요.</span><button class="btn pri sm" data-ntseg="new">✏️ 새 공지 작성하기</button></div>';
    var ack=I.acks||[],ackE={};ack.forEach(function(a){ackE[a.emp]=1;});
    var te=(ADM.stat&&ADM.stat.todayEmps||[]).map(function(x){return x.emp;}),un=te.filter(function(e){return !ackE[e];});
    var who=function(e){var r=rInfo(e);return r?'<b>'+esc(r[0])+'</b> <small>'+esc(r[1])+'</small>':'<b>'+esc(e)+'</b>';};
    h+='<div class="nt2-card"><div class="nt2-top"><span class="nt2-live">● 게시 중</span><small>'+ntFmt(n.at)+' 게시'+(n.edited?' · '+ntFmt(n.edited)+' 수정':'')+'</small></div>'
      +'<div class="nt2-title">'+esc(n.title)+'</div>'
      +(n.body?'<div class="nt2-body">'+esc(n.body)+'</div>':'')
      +(n.items&&n.items.length?'<div class="nt2-items">📝 업데이트 내용 '+n.items.length+'개 첨부</div>':'')
      +'<div class="nt2-stat"><div class="nt2-pc"><b>'+pc+'</b>%</div><div style="flex:1"><div>확인 <b style="color:var(--ok)">'+ack.length+'명</b>'+(te.length?' <span style="color:var(--sub)">/ 오늘 접속 '+te.length+'명</span>':'')+'</div><div class="ack-bar"><i style="width:'+pc+'%"></i></div></div></div>'
      +'<div class="nt2-act"><button class="btn line sm" id="ntView">👀 공지 보기</button><button class="btn line sm" id="ntEdit">✏️ 수정</button><button class="btn line sm" id="ntReload">↻</button><button class="btn del sm" id="ntDel" style="margin-left:auto">공지 내리기</button></div></div>';
    h+=un.length?'<details class="nt2-det un"'+(NT.unOpen?' open':'')+'><summary><span>⏳ 아직 확인 안 함</span><b>'+un.length+'명</b><small>오늘 접속한 직원 기준</small><i>▾</i></summary><div class="nt2-chips" style="padding-bottom:12px">'+un.map(function(e){return '<span class="nt2-chip">'+who(e)+'</span>';}).join('')+'</div></details>'
      :'<div class="nt2-ok" style="margin-top:14px">🎉 오늘 접속한 직원 모두 확인했어요</div>';
    h+='<details class="nt2-det"'+(NT.ackOpen?' open':'')+'><summary><span>✅ 확인한 직원</span><b>'+ack.length+'명</b><i>▾</i></summary>'
      +(ack.length?'<div class="nt2-list">'+ack.map(function(a){return '<div>'+who(a.emp)+'<span>'+esc(a.dev)+'</span><time>'+esc(a.at)+'</time></div>';}).join('')+'</div>':'<div class="empty" style="margin:8px 0 0">아직 확인한 사람이 없어요.</div>')+'</details>';
    return h;
  }
  if(NT.edit)h+='<div class="nt2-editbar">✏️ 지금 올라간 공지를 수정하고 있어요<a href="#" id="ntEditX">수정 취소</a></div>';
  h+='<div class="nt2-card"><label class="nt2-l">제목 <small id="ntTc">'+d.title.length+'/60</small></label><input type="text" id="ntTitle" maxlength="60" placeholder="예: 12월 정책 안내" value="'+esc(d.title)+'">'
    +'<label class="nt2-l" style="margin-top:10px">내용 <small id="ntBc">'+d.body.length+'/1000</small></label><textarea class="nt-ta" id="ntText" rows="5" maxlength="1000" placeholder="직원들에게 전할 내용을 적어주세요">'+esc(d.body)+'</textarea></div>';
  if(NT.edit&&d.extra&&d.extra.length)h+='<div class="nt2-sec"><span>📎 기존 첨부 항목</span><small>체크 해제하면 빠져요</small></div><div class="nt2-ver sel" style="margin-top:8px"><div class="b">'+d.extra.map(function(x,j){return '<label><input type="checkbox" data-ex="'+j+'" '+(d.exOn[j]!==false?'checked':'')+'>'+esc(x)+'</label>';}).join('')+'</div></div>';
  h+='<div class="nt2-sec"><span>📝 업데이트 내역 첨부</span><b>'+pk+'개 선택</b>'+(pk?'<a href="#" id="ntClr">선택 해제</a>':'<small>선택한 항목이 공지 아래에 붙어요</small>')+'</div>';
  var shown=NT.more?CHANGELOG:CHANGELOG.slice(0,5);NT.open=NT.open||{};
  h+='<div class="nt2-vers">'+shown.map(function(v,k){var c=v[2].filter(function(x,j){return d.pick[k+'_'+j];}).length,all=c===v[2].length,op=NT.open[k];
    return '<div class="nt2-ver'+(c?' sel':'')+'"><div class="h"><label><input type="checkbox" data-ver="'+k+'" '+(all?'checked':'')+'><b>'+esc(v[0])+'</b><small>'+esc(v[1])+'</small></label><button type="button" data-vop="'+k+'">'+(c?'<em>'+c+'/'+v[2].length+'</em>':v[2].length+'개 항목')+' '+(op?'▴':'▾')+'</button></div>'
      +(op?'<div class="b">'+v[2].map(function(x,j){return '<label><input type="checkbox" data-cl="'+k+'_'+j+'" '+(d.pick[k+'_'+j]?'checked':'')+'>'+esc(x)+'</label>';}).join('')+'</div>':'<div class="p">'+esc(v[2][0])+(v[2].length>1?' 외 '+(v[2].length-1)+'개':'')+'</div>')+'</div>';}).join('')+'</div>';
  if(CHANGELOG.length>5)h+='<a href="#" class="link" id="ntMore" style="display:inline-block;margin-top:8px;font-size:13px">'+(NT.more?'접기 ▴':'이전 버전 더 보기 ▾ ('+(CHANGELOG.length-5)+'개)')+'</a>';
  if(NT.edit)h+='<label class="nt2-re"><input type="checkbox" id="ntRe" '+(NT.re?'checked':'')+'> <span><b>직원들에게 다시 알리기</b><small>체크하면 확인한 직원에게도 다시 팝업이 뜨고 확인 기록이 새로 시작돼요. 체크 안 하면 오타 수정처럼 조용히 바뀌어요.</small></span></label>';
  h+='<div class="nt2-bar"><button class="btn line" id="ntPrev">👀 미리보기</button><button class="btn pri" id="ntPost">'+(NT.edit?'💾 수정 저장':'📢 공지 올리기')+'</button></div>'
   +'<div class="note">올리면 직원 화면에 75초 안에 팝업으로 떠요. "확인했어요"를 누른 직원에게는 다시 뜨지 않고, 새 공지를 올리면 이전 공지는 내려가요.</div>';
  return h;
}
function admNoticeBind(){
  var d=NT.draft;
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-ntseg]'),function(b){b.onclick=function(){NT.seg=b.dataset.ntseg;admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody .nt2-det'),function(dt){dt.ontoggle=function(){if(dt.classList.contains('un'))NT.unOpen=dt.open;else NT.ackOpen=dt.open;};});
  var tt=$('#ntTitle');if(tt){tt.oninput=function(){d.title=this.value;$('#ntTc').textContent=this.value.length+'/60';};$('#ntText').oninput=function(){d.body=this.value;$('#ntBc').textContent=this.value.length+'/1000';};}
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-ver]'),function(c){c.onchange=function(){var k=+c.dataset.ver;CHANGELOG[k][2].forEach(function(x,j){d.pick[k+'_'+j]=c.checked;});admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-cl]'),function(c){c.onchange=function(){d.pick[c.dataset.cl]=c.checked;admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-vop]'),function(b){b.onclick=function(){var k=b.dataset.vop;NT.open[k]=!NT.open[k];admRender();};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-ex]'),function(c){c.onchange=function(){d.exOn[+c.dataset.ex]=c.checked;admRender();};});
  var re=$('#ntRe');if(re)re.onchange=function(){NT.re=this.checked;};
  var ex=$('#ntEditX');if(ex)ex.onclick=function(e){e.preventDefault();NT.edit=false;NT.draft=NT.saved||{title:'',body:'',pick:{}};NT.saved=null;NT.seg='cur';admRender();};
  var ed=$('#ntEdit');if(ed)ed.onclick=function(){var n=NT.info.notice;if(!NT.edit)NT.saved=NT.draft;
    var pick={},extra=[];(n.items||[]).forEach(function(x){var f=null;CHANGELOG.forEach(function(v,k){v[2].forEach(function(y,j){if(!f&&y===x)f=k+'_'+j;});});if(f)pick[f]=1;else extra.push(x);});
    NT.draft={title:n.title||'',body:n.body||'',pick:pick,extra:extra,exOn:{}};NT.edit=true;NT.re=false;NT.seg='new';admRender();};
  var cl=$('#ntClr');if(cl)cl.onclick=function(e){e.preventDefault();d.pick={};admRender();};
  var m=$('#ntMore');if(m)m.onclick=function(e){e.preventDefault();NT.more=!NT.more;admRender();};
  var pv=$('#ntPrev');if(pv)pv.onclick=function(){ntShow({title:d.title,body:d.body,items:ntPicked(),at:Date.now()},true);};
  var po=$('#ntPost');if(po)po.onclick=function(){var items=ntPicked();if(!d.title.trim()){toast('제목을 적어주세요');$('#ntTitle').focus();return;}
    var b=this;b.disabled=true;b.textContent='올리는 중…';
    var ed=NT.edit,fn=ed?'adminEditNotice':'adminPostNotice';
    gsr(fn,{pw:ADM.pw,title:d.title.trim(),body:d.body.trim(),items:items,renotify:ed&&NT.re},function(r){b.disabled=false;
      if(r&&r.ok){toast(ed?(NT.re?'공지를 수정하고 다시 알렸어요':'공지를 수정했어요'):'공지를 올렸어요');NT.draft=ed&&NT.saved?NT.saved:{title:'',body:'',pick:{}};NT.edit=false;NT.saved=null;NT.seg='cur';admNoticeLoad();}else{toast((r&&r.msg)||(ed?'수정하지 못했어요':'공지를 올리지 못했어요'));admRender();}},
      function(){toast('서버에 연결하지 못했어요');admRender();});};
  var v=$('#ntView');if(v)v.onclick=function(){ntShow(NT.info.notice,true);};
  var rl=$('#ntReload');if(rl)rl.onclick=function(){NT.info=null;admRender();admNoticeLoad();};
  var dl=$('#ntDel');if(dl)dl.onclick=function(){if(!confirm('현재 공지를 내릴까요? 직원 화면에 더 이상 뜨지 않아요.'))return;gsr('adminClearNotice',{pw:ADM.pw},function(){toast('공지를 내렸어요');admNoticeLoad();});};
}
function admRender(){
  var t=ADM.tab||'stat',h=admTabsHtml();
  if(t==='stat')h+=ADM.stat?admStatHtml(ADM.stat):'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  else if(t==='price')h+=admPriceHtml();
  else if(t==='promo')h+=admPromoHtml();
  else if(t==='lg')h+=admLgHtml();
  else if(t==='ck')h+=admCkHtml();
  else if(t==='roster')h+=admRosterHtml();
  else if(t==='best')h+=admBestHtml();
  else if(t==='feat')h+=admFeatHtml();
  else if(t==='emp')h+=admEmpHtml();
  else if(t==='terms')h+=admTmHtml();
  else if(t==='plog')h+=admPlogHtml();
  else if(t==='fb')h+=admFbHtml();
  else if(t==='bn')h+=admBnHtml();
  else if(t==='notice')h+=admNoticeHtml();
  else if(t==='quote')h+=admQuoteHtml();
  else h+=admVerHtml();
  $('#admBody').innerHTML=h;
  onChip($('#admTabs'),function(v){ADM.tab=v;if(v==='quote')ADM.quotes=null;if(v==='notice')admNoticeLoad();if(v==='best')admBestLoad();if(v==='feat')admFeatLoad();if(v==='emp')admEmpLoad();if(v==='terms')admTmLoad();if(v==='plog')admPlogLoad();if(v==='fb')admFbLoad();if(v==='bn')admBnLoad();if(v==='roster'){RS.data=null;rsLoad();}admRender();if(v==='stat')admRefresh();else if(v!=='quote'&&v!=='ver')admInfo();});
  var r=$('#admRef');if(r)r.onclick=admRefresh;
  var o=$('#admOut');if(o)o.onclick=function(){ADM.pw=null;ADM.stat=null;ADM.tab='stat';clearInterval(ADM.t);admLogin();renderVer();};
  if(t==='price'||t==='promo')admBind(t);
  if(t==='lg'){admLgBind();cpaBind();}
  if(t==='ck')admCkBind();
  if(t==='emp')admEmpBind();
  if(t==='terms')admTmBind();
  if(t==='plog')admPlogBind();
  if(t==='fb')admFbBind();
  if(t==='bn')admBnBind();
  if(t==='quote')admQuoteBind();
  if(t==='notice')admNoticeBind();
  if(t==='roster'&&RS.data&&RS.data.ok)admRosterBind();
  if(t==='feat'){Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-afb]'),function(b){b.onclick=function(){if(AFEAT.brand===b.dataset.afb)return;AFEAT.brand=b.dataset.afb;admFeatLoad();admRender();};});
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-afd]'),function(b){b.onclick=function(){AFEAT.days=b.dataset.afd==='d'?'d':+b.dataset.afd;admFeatLoad();admRender();};});
    var afGo=function(d){var td=todayStr().replace(/-/g,'');if(!d||d>td)return;AFEAT.date=d;admFeatLoad();admRender();};
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-afs]'),function(b){b.onclick=function(){afGo(afShift(AFEAT.date||todayStr().replace(/-/g,''),+b.dataset.afs));};});
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-afday]'),function(b){b.onclick=function(){afGo(b.dataset.afday);};});
    var adi=$('#afDate');if(adi)adi.onchange=function(){afGo(this.value.replace(/-/g,''));};
    var fc=$('#afCsv');if(fc)fc.onclick=function(){var R=AFEAT.data;if(!R||!R.ok)return;csvDown([['기능','횟수','사번 수','이전 기간']].concat(R.list.map(function(x){return [FNAME[x.k]?fnm(x.k):x.k,x.n,x.u,x.prev];})),(AFEAT.days==='d'?'기능사용_'+afBrandTag()+(AFEAT.date||todayStr().replace(/-/g,''))+'.csv':'기능사용_'+afBrandTag()+AFEAT.days+'일_'+todayStr()+'.csv'));};}
  if(t==='best'){Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-abd]'),function(b){b.onclick=function(){ABEST.days=+b.dataset.abd;admBestLoad();admRender();};});
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-abb]'),function(b){b.onclick=function(){ABEST.br=b.dataset.abb;admRender();};});
    var ac=$('#abCsv');if(ac)ac.onclick=function(){var R=ABEST.data;if(!R||!R.ok)return;csvDown([['순위','모델','품목','조회','담기','인쇄','보관']].concat(R.list.map(function(x,i){var m=byCode[x[0]];return [i+1,x[0],m?catOf(m)+' '+subOf(m):'',x[1],x[2],x[3],x[4]];})),'베스트모델_'+ABEST.days+'일_'+todayStr()+'.csv');};}
  if(t==='stat'){
    var fz=$('#admForce');if(fz)fz.onclick=function(){if(!confirm('열려 있는 모든 화면을 '+VERSION+'으로 업데이트할까요?\n(v7.6 이상 화면은 75초 안에 자동 새로고침, 담은 모델은 유지돼요)\n직원들은 자동 로그아웃되어 사번을 다시 입력해야 해요.'))return;
      gsr('adminSetMinVer',{pw:ADM.pw,ver:VERSION},function(x){toast(x&&x.ok?'강제 업데이트를 걸었어요 · 75초 안에 반영돼요':'설정하지 못했어요');admRefresh();});};
    Array.prototype.forEach.call(document.querySelectorAll('#admSeg [data-seg]'),function(b){b.onclick=function(){ADM.seg=b.dataset.seg;ADM.more=false;admRender();};});
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-nrblk]'),function(b){b.onclick=function(){var v=b.dataset.nrblk.split('|');blkOpen({emp:v[0],did:v[1],dev:v[2]});};});
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-rxext]'),function(b){b.onclick=function(){var e=b.dataset.rxext,x=(RS.ex||{})[e]||{};if(!confirm(e+' 예외 허용 기한을 오늘부터 30일로 늘릴까요?'))return;rsExAdd(e,x.memo||'',30);setTimeout(admRefresh,600);};});
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-rxok]'),function(b){b.onclick=function(){var e=b.dataset.rxok,m=prompt(e+' 사번을 예외 허용할까요? 이름이나 메모를 적어주세요 (선택)','');if(m===null)return;rsExAdd(e,m,0);setTimeout(admRefresh,600);};});
    var nbr=$('#admNbr');if(nbr)nbr.onchange=function(){ADM.nbr=this.value;admRender();};
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-msg]'),function(b){b.onclick=function(){var e=b.dataset.msg,ri=rInfo(e),t=prompt((ri?ri[0]+' ('+e+')':e)+' 화면에 띄울 메시지를 적어주세요 (300자까지)','');if(!t||!t.trim())return;
      gsr('adminSendMsg',{pw:ADM.pw,emp:e,text:t.trim()},function(x){toast(x&&x.ok?'메시지를 보냈어요 · 75초 안에 화면에 떠요':'보내지 못했어요 (서버 업데이트 후 다시 시도)');},function(){toast('보내지 못했어요');});};});
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-blkg]'),function(b){b.onclick=function(){var g=ADM.groups[+b.dataset.blkg];blkOpen(g&&g.main);};});
    var aq=$('#admQ');if(aq){aq.oninput=function(){ADM.q=this.value.trim();ADM.more=false;admTodayList();};$('#admSort').onchange=function(){ADM.sort=this.value;admTodayList();};var abr=$('#admBr');if(abr)abr.onchange=function(){ADM.tbr=this.value;ADM.more=false;admTodayList();};$('#admCsv').onclick=admCsv;admTodayList();}
    Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-unblk]'),function(b){b.onclick=function(){var kv=b.dataset.unblk.split(':');
      if(!confirm((kv[0]==='emp'?'사번 '+kv[1]:'기기 '+didTag(kv[1]))+' 차단을 해제할까요?'))return;
      gsr('adminUnblock',{pw:ADM.pw,type:kv[0],key:kv[1]},function(){toast('차단을 해제했어요');admRefresh();});};});
  }
}
var BLK={x:null,mode:'both'};
function blkOpen(x){if(!x)return;BLK.x=x;BLK.mode=x.emp?'both':'did';
  $('#blkWho').innerHTML='사번 <b>'+esc(x.emp||'-')+'</b> · '+esc(x.dev||'')+(x.did?' · 기기 <b>'+didTag(x.did)+'</b>':'');
  $('#blkE').textContent=(x.emp||'-')+'(으)로는 어떤 기기에서도 입장 불가';$('#blkD').textContent='기기 '+(x.did?didTag(x.did):'(정보 없음)')+'는 다른 사번을 써도 입장 불가';
  $('#blkMemo').value=x.emp&&empSus(x.emp)?'가짜 사번 의심':'';blkMode();$('#blkModal').classList.add('on');}
function blkMode(){Array.prototype.forEach.call(document.querySelectorAll('#blkModal [data-bm]'),function(b){var m=b.dataset.bm,dis=(m!=='emp'&&!BLK.x.did)||(m!=='did'&&!BLK.x.emp);
  b.disabled=dis;b.style.opacity=dis?.4:1;b.classList.toggle('sel',m===BLK.mode);});}
Array.prototype.forEach.call(document.querySelectorAll('#blkModal [data-bm]'),function(b){b.onclick=function(){if(b.disabled)return;BLK.mode=b.dataset.bm;blkMode();};});
$('#blkClose').onclick=function(){$('#blkModal').classList.remove('on');};
$('#blkGo').onclick=function(){var x=BLK.x,m=BLK.mode,bt=this;bt.disabled=true;
  gsr('adminBlock',{pw:ADM.pw,emp:(m==='emp'||m==='both')?x.emp:'',did:(m==='did'||m==='both')?x.did:'',dev:x.dev,memo:$('#blkMemo').value.trim()},function(r){bt.disabled=false;
    if(r&&r.ok){$('#blkModal').classList.remove('on');toast('차단했어요 · 75초 안에 해당 화면이 잠겨요');admRefresh();}else toast('차단하지 못했어요');},function(){bt.disabled=false;toast('서버에 연결하지 못했어요');});};
var XLSX_URL='https:\/\/cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function loadXLSX(cb){if(window.XLSX){cb();return;}var sc=document.createElement('script');sc.src=XLSX_URL;sc.onload=cb;sc.onerror=function(){toast('엑셀 읽기 도구를 불러오지 못했어요');};document.head.appendChild(sc);}
function readXlsxFile(file,cb){loadXLSX(function(){var fr=new FileReader();fr.onload=function(){try{cb(XLSX.read(new Uint8Array(fr.result),{type:'array'}));}catch(e){toast('엑셀 파일을 읽지 못했어요');}};fr.readAsArrayBuffer(file);});}
function nz(v){return String(v==null?'':v).replace(/\s+/g,'').replace(/\(.*?\)/g,'');}
var CAT_ORDER=['TV','냉장고','김치냉장고','세탁기','건조기','에어드레서','에어컨','공기청정기','제습기','청소기','식기세척기','전기레인지','후드','정수기','모니터','오디오','갤럭시 탭','갤럭시 북'];
function subFix(c2,code){if(String(code).indexOf('RM')===0){if(c2==='양문형')return '4도어';if(c2==='양문형 냉장고 + 스탠드형 김치냉장고')return '4도어 냉장고 + 스탠드형 김치냉장고';}return c2;}
function parsePriceWB(wb){
  var rows=[],warn=[],sheets=[],dup=0,seen={};
  wb.SheetNames.forEach(function(sn){
    var aoa=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});var h=-1,col={};
    for(var r=0;r<Math.min(12,aoa.length);r++){var row=aoa[r]||[];if(row.some(function(c){return /모델(코드|명)/.test(nz(c));})){h=r;break;}}
    if(h<0){warn.push('['+sn+'] 머리글(모델코드)을 찾지 못해 건너뜀');return;}
    (aoa[h]||[]).forEach(function(c,i){var t=nz(c);if(!t)return;
      if(/모델(코드|명)/.test(t)&&col.model==null)col.model=i;else if(t==='품목1'||(t==='품목'&&col.c1==null))col.c1=i;else if(t==='품목2')col.c2=i;
      else if(/계약기간/.test(t))col.y=i;else if(/서비스유형/.test(t))col.type=i;else if(/월구독료/.test(t))col.mon=i;else if(/총구독료/.test(t))col.tot=i;});
    if(col.c1==null||col.y==null||col.type==null||(col.mon==null&&col.tot==null)){warn.push('['+sn+'] 필요한 열(품목·계약 기간·서비스 유형·월구독료)이 없어 건너뜀');return;}
    var n=0;
    for(var k=h+1;k<aoa.length;k++){var row=aoa[k]||[];var code=String(row[col.model]==null?'':row[col.model]).trim();if(!code)continue;
      var y=parseInt(String(row[col.y]).replace(/[^0-9]/g,''),10);if(!(y>=1&&y<=10))continue;
      var mon=Number(String(row[col.mon]==null?'':row[col.mon]).replace(/[^0-9.]/g,''));if(!mon&&col.tot!=null){var tt=Number(String(row[col.tot]).replace(/[^0-9.]/g,''));if(tt)mon=Math.round(tt/(y*12));}
      if(!mon)continue;
      var c1=String(row[col.c1]==null?'':row[col.c1]).trim();if(!c1)continue;
      var c2=col.c2!=null&&row[col.c2]!=null?String(row[col.c2]).trim():c1;c2=subFix(c2,code);
      var type=String(row[col.type]==null?'':row[col.type]).trim();if(!type)continue;
      var key=code+'|'+y+'|'+type;if(seen[key])dup++;seen[key]={c1:c1,c2:c2,code:code,y:y,type:type,mon:Math.round(mon)};n++;}
    sheets.push({name:sn,rows:n});
  });
  Object.keys(seen).forEach(function(k){rows.push(seen[k]);});
  if(!rows.length)return {err:'읽을 수 있는 요금 행이 없어요. 기존 요금표와 같은 양식인지 확인해 주세요.',warn:warn};
  var cats=[];rows.forEach(function(r){if(cats.indexOf(r.c1)<0)cats.push(r.c1);});
  cats.sort(function(a,b){var ia=CAT_ORDER.indexOf(a),ib=CAT_ORDER.indexOf(b);ia=ia<0?99:ia;ib=ib<0?99:ib;return ia-ib||(a<b?-1:a>b?1:0);});
  var subs=[],types=[];rows.forEach(function(r){var s2=r.c1+'|'+r.c2;if(subs.indexOf(s2)<0)subs.push(s2);if(types.indexOf(r.type)<0)types.push(r.type);});subs.sort();types.sort();
  var mm={};rows.forEach(function(r){var e=mm[r.code];if(!e)e=mm[r.code]=[r.code,cats.indexOf(r.c1),subs.indexOf(r.c1+'|'+r.c2),[]];e[3].push([r.y,types.indexOf(r.type),r.mon]);});
  var models=Object.keys(mm).map(function(k){var e=mm[k];e[3].sort(function(a,b){return b[0]-a[0]||a[1]-b[1];});return e;});
  models.sort(function(a,b){return a[1]-b[1]||a[2]-b[2]||(a[0]<b[0]?-1:1);});
  var cc={};models.forEach(function(m){cc[cats[m[1]]]=(cc[cats[m[1]]]||0)+1;});
  return {data:{cats:cats,subs:subs,types:types,models:models},rows:rows.length,models:models.length,sheets:sheets,catCount:cc,dup:dup,warn:warn};
}
function priceDiff(nd){
  var cur={};D.models.forEach(function(m){m[3].forEach(function(p){cur[m[0]+'|'+p[0]+'|'+D.types[p[1]]]=p[2];});});
  var nw={},up=0,down=0,same=0,add=0;nd.models.forEach(function(m){m[3].forEach(function(p){var k=m[0]+'|'+p[0]+'|'+nd.types[p[1]];nw[k]=1;if(cur[k]==null)add++;else if(cur[k]<p[2])up++;else if(cur[k]>p[2])down++;else same++;});});
  var rem=0;Object.keys(cur).forEach(function(k){if(!nw[k])rem++;});
  var cm={};D.models.forEach(function(m){cm[m[0]]=1;});var nm={};nd.models.forEach(function(m){nm[m[0]]=1;});
  var newM=Object.keys(nm).filter(function(k){return !cm[k];}),remM=Object.keys(cm).filter(function(k){return !nm[k];});
  return {up:up,down:down,same:same,add:add,rem:rem,newM:newM,remM:remM};
}
function parsePromoWB(wb){
  var aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:null}),mc=-1,hr=-1;
  for(var r=0;r<Math.min(8,aoa.length)&&mc<0;r++){(aoa[r]||[]).forEach(function(c,i){if(mc<0&&/모델/.test(nz(c))){mc=i;hr=r;}});}
  if(mc<0)return {err:'모델명(모델코드) 열을 찾지 못했어요.'};
  var start=hr+1;while(start<aoa.length&&aoa[start]&&!/[0-9]/.test(String(aoa[start][mc]||'')))start++;
  var width=0;aoa.forEach(function(r){if(r&&r.length>width)width=r.length;});
  var lab=[];for(var c=0;c<width;c++){var t='';for(var rr=0;rr<start;rr++){t+=nz((aoa[rr]||[])[c]);}lab.push(t);}
  var num=[];for(c=0;c<width;c++){if(c===mc)continue;var cnt=0,tot=0;for(rr=start;rr<Math.min(aoa.length,start+50);rr++){var v=(aoa[rr]||[])[c];if(v==null||v==='')continue;tot++;if(!isNaN(Number(v)))cnt++;}if(tot&&cnt/tot>.8)num.push(c);}
  var fc=-1;num.forEach(function(c){if(fc<0&&/최종|합계|총/.test(lab[c]))fc=c;});
  var rest=num.filter(function(c){return c!==fc;});
  var bc=-1,ec=-1;rest.forEach(function(c){if(bc<0&&/페스티벌|기본|기존/.test(lab[c]))bc=c;});rest.forEach(function(c){if(ec<0&&c!==bc&&/우승|추가|판촉/.test(lab[c]))ec=c;});
  rest.forEach(function(c){if(bc<0&&c!==ec)bc=c;});rest.forEach(function(c){if(ec<0&&c!==bc)ec=c;});
  var data={},n=0;
  for(rr=start;rr<aoa.length;rr++){var row=aoa[rr]||[];var code=String(row[mc]==null?'':row[mc]).trim();if(!code)continue;
    var b=bc>=0?Number(row[bc])||0:0,x=ec>=0?Number(row[ec])||0:0,f=fc>=0?Number(row[fc])||0:b+x;if(!f&&!b)continue;data[code]=[b,x,f];n++;}
  return {data:data,n:Object.keys(data).length,labels:{model:lab[mc],base:bc>=0?lab[bc]:'-',extra:ec>=0?lab[ec]:'-',fin:fc>=0?lab[fc]:'(합산)'}};
}
function admInfo(){gsr('adminDataInfo',ADM.pw,function(r){if(r&&r.ok){ADM.info=r;if(ADM.tab!=='stat')admRender();}});}
function admPriceHtml(){
  var i=ADM.info,pm=i&&i.price,u=ADM.up.price;
  var h='<div class="adm-card">현재 적용: <b>'+(pm?esc(pm.label):'기본 단가표 (11월, 11/05 모델 추가)')+'</b>'+(pm?'<br>파일 '+esc(pm.file)+' · '+esc(pm.at)+' 업로드 · 모델 '+pm.models+'개 · 요금 '+pm.rows+'행':'<br>모델 '+D.models.length+'개')+'</div>';
  h+='<div class="adm-form"><div class="full"><label>단가표 이름 (화면 하단에 표시)</label><input type="text" id="prLabel" placeholder="예: 삼성 AI 구독 요금표 12월" value="'+esc(u&&u.label||'')+'"></div></div>';
  h+='<label class="file-drop">📂 단가표 엑셀(.xlsx) 선택<br><small>기존 요금표와 같은 양식 (모델코드 · 계약 기간 · 서비스 유형 · 월구독료 열)</small><input type="file" id="prFile" accept=".xlsx,.xls"></label>';
  if(u&&u.err)h+='<div class="warn">'+esc(u.err)+'</div>';
  if(u&&u.res&&!u.res.err){var r=u.res,d=u.diff;
    h+='<div class="adm-card"><b>'+esc(u.file)+'</b> 읽기 완료<br>시트: '+r.sheets.map(function(x){return esc(x.name)+' '+x.rows+'행';}).join(', ')+'<br>모델 <b>'+r.models+'</b>개 · 요금 <b>'+r.rows+'</b>행'+(r.dup?' · 중복 '+r.dup+'행(마지막 값 사용)':'')
      +'<br>품목: '+Object.keys(r.catCount).map(function(c){return esc(c)+' '+r.catCount[c];}).join(' · ')
      +'<br><br><b>현재 단가표와 비교</b><br>신규 모델 '+d.newM.length+'개 · 없어진 모델 '+d.remM.length+'개<br>요금 인상 '+d.up+' · 인하 '+d.down+' · 동일 '+d.same+' · 신규 요금 '+d.add+' · 삭제 요금 '+d.rem
      +(d.newM.length?'<br><small>신규: '+esc(d.newM.slice(0,12).join(', '))+(d.newM.length>12?' 외':'')+'</small>':'')
      +(d.remM.length?'<br><small>없어짐: '+esc(d.remM.slice(0,12).join(', '))+(d.remM.length>12?' 외':'')+'</small>':'')
      +(r.warn.length?'<br><span class="warn-t">'+r.warn.map(esc).join('<br>')+'</span>':'')+'</div>'
      +'<button class="btn pri block" id="prApply" style="margin-top:12px">이 단가표로 적용하기</button>';}
  if(pm)h+='<button class="btn line sm" id="prReset" style="margin-top:12px">기본 단가표로 되돌리기</button>';
  h+='<div class="note">적용하면 이 화면은 바로 바뀌고, 다른 사용자는 새로 접속(새로고침)할 때부터 적용돼요. 이전 단가표는 드라이브 \'삼성AI구독_데이터\' 폴더에 백업돼요.</div>';
  return h;
}
function admPromoHtml(){
  var i=ADM.info,pm=i&&i.promo,u=ADM.up.promo||{},cur=PMETA||{};
  var h='<div class="adm-card">현재 판촉: '+(pm&&pm.cleared?'<b>없음 (종료됨)</b>':(PMETA?'<b>'+esc(cur.name||PN)+'</b> · '+esc(cur.start||'')+' ~ '+esc(cur.end||'')+' · 대상 '+Object.keys(PROMO).length+'개 모델'+(pm?'':' <small>(기본값)</small>'):'<b>없음</b>'))+'</div>';
  var v=function(k,d){return esc(u[k]!=null?u[k]:(cur[k]!=null?cur[k]:d));};
  h+='<div class="adm-form"><div class="full"><label>판촉명 (배너 제목)</label><input type="text" id="poName" value="'+v('name','')+'" placeholder="예: 삼성라이온즈 우승기념 판촉"></div>'
    +'<div><label>짧은 이름 (버튼 · 체크박스)</label><input type="text" id="poShort" value="'+v('short','')+'" placeholder="예: 우승기념"></div>'
    +'<div><label>기본 지원 이름</label><input type="text" id="poBase" value="'+v('base','구독페스티벌')+'" placeholder="예: 구독페스티벌"></div>'
    +'<div><label>시작일</label><input type="date" id="poStart" value="'+v('start','')+'"></div>'
    +'<div><label>종료일</label><input type="date" id="poEnd" value="'+v('end','')+'"></div>'
    +'<div class="full"><label>안내 문구 (배너)</label><input type="text" id="poDesc" value="'+v('desc','')+'" placeholder="예: 대상 모델 구독료 최대 12개월 상당 포인트 지원"></div></div>';
  h+='<label class="file-drop">📂 대상 모델 엑셀(.xlsx) 선택<br><small>모델명 · 기본 지원 개월 · 추가 판촉 개월 · 최종 개월 열 (파일 없이 적용하면 이름·기간만 바뀜)</small><input type="file" id="poFile" accept=".xlsx,.xls"></label>';
  if(u.err)h+='<div class="warn">'+esc(u.err)+'</div>';
  if(u.res){var r=u.res,match=Object.keys(r.data).filter(function(k){return byCode[k];}).length,dist={};Object.keys(r.data).forEach(function(k){var f=r.data[k][2];dist[f]=(dist[f]||0)+1;});
    h+='<div class="adm-card"><b>'+esc(u.file)+'</b> 읽기 완료<br>대상 모델 <b>'+r.n+'</b>개 (현재 단가표에 있는 모델 '+match+'개)<br>인식한 열: 모델='+esc(r.labels.model)+' · 기본='+esc(r.labels.base)+' · 추가='+esc(r.labels.extra)+' · 최종='+esc(r.labels.fin)
      +'<br>최종 개월: '+Object.keys(dist).sort(function(a,b){return a-b;}).map(function(k){return k+'개월 '+dist[k]+'개';}).join(' · ')+'</div>';}
  h+='<button class="btn pri block" id="poApply" style="margin-top:12px">판촉 적용하기</button>';
  h+='<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn line sm" id="poEnd2">판촉 종료 (숨기기)</button>'+(pm?'<button class="btn line sm" id="poReset">기본값으로 되돌리기</button>':'')+'</div>';
  h+='<div class="note">적용하면 상단 배너 · 오른쪽 대상 모델 메뉴 · 담은 모델의 판촉 체크 · 포인트 계산에 바로 반영돼요. 종료일이 지나면 배너는 자동으로 숨겨져요.</div>';
  return h;
}
/* ---------- LG 단가표 (전자랜드 단가표 + 구독 활성화 요약) ---------- */
var LGA={wb:null,file:'',res:null,err:'',ps:'',as:'',cur:null};
/* ---------- 🅲 쿠쿠 단가 · 프로모션 (관리자) : 구독 단가 엑셀(ck) · 다품목 캐시백 가이드(ckm) ---------- */
function ckMd(s){var p=String(s||'').split('-');return p.length<3?s:(+p[1])+'/'+(+p[2]);}
var CKA={ck:{file:'',res:null,err:''},ckm:{file:'',res:null,err:''}};
var CKCARD_N={lotte:'쿠쿠 롯데',woori:'쿠쿠 우리',samsung:'쿠쿠 삼성',hyundai:'쿠쿠 현대',shinhan:'쿠쿠 신한',kb:'KB 쿠쿠렌탈Ⅱ',hana:'쿠쿠 하나'};
function ckLoadLibs(cb){var need=[];if(!window.CKParse)need.push('ck-parse.js');if(!window.CK_DATA)need.push('data/ck.js');if(!window.CK_MULTI)need.push('data/ck-multi.js');
  var n=need.length;if(!n){cb();return;}need.forEach(function(src){var sc=document.createElement('script');sc.src=src+'?d='+Date.now();sc.onload=sc.onerror=function(){if(--n===0)cb();};document.head.appendChild(sc);});}
function ckNow(){var n=new Date();return n.getFullYear()+'-'+('0'+(n.getMonth()+1)).slice(-2)+'-'+('0'+n.getDate()).slice(-2)+' '+('0'+n.getHours()).slice(-2)+':'+('0'+n.getMinutes()).slice(-2);}
function ckDiff(r){var od=window.CK_DATA;if(!od||!od.m)return null;var ob={},o={newM:[],remM:[],up:0,down:0,same:0};od.m.forEach(function(m){ob[m[0]]=m;});
  var mn=function(m){return Math.min.apply(null,m[2].map(function(x){return x[3];}));};
  r.m.forEach(function(m){var a=ob[m[0]];if(!a){o.newM.push(m[0]);return;}var x=mn(m),y=mn(a);if(x>y)o.up++;else if(x<y)o.down++;else o.same++;});
  var nb={};r.m.forEach(function(m){nb[m[0]]=1;});od.m.forEach(function(m){if(!nb[m[0]])o.remM.push(m[0]);});return o;}
function admCkHtml(){
  var i=ADM.info||{},u1=i.ck,u2=i.ckm,A=CKA.ck,B=CKA.ckm,cd=window.CK_DATA,cm=window.CK_MULTI;
  var h='<div class="adm-sec" style="margin-top:12px">① 쿠쿠 구독 단가 엑셀 <small>\'구독 모델별 내용\' 시트 (+ \'카드 판촉\' 시트가 있으면 제휴카드도 같이)</small></div>';
  h+='<div class="adm-card">현재 적용: <b>'+(u1?esc(u1.file||u1.label||'-'):'기본 단가표 (저장소)')+'</b>'+(u1?' · '+esc(u1.at||'')+' 업로드 · 모델 '+(u1.models||'-')+'개 · 요금 '+(u1.rows||'-')+'행'+(u1.cards?' · 카드 '+u1.cards+'종':''):(cd&&cd.m?' · 모델 '+cd.m.length+'개':''))+'</div>';
  h+='<label class="file-drop">📂 쿠쿠 구독 단가 엑셀(.xlsx) 선택<br><small>예: 쿠쿠 구독 모델별 내용 2026.11.xlsx · 수당 · 수수료 등 판매사 정보는 읽지 않아요</small><input type="file" id="ckFile" accept=".xlsx,.xls"></label>';
  if(A.err)h+='<div class="warn">'+esc(A.err)+'</div>';
  if(A.res){var r=A.res,d=ckDiff(r),cats={};r.m.forEach(function(m){var c=r.cats[m[1]];cats[c]=(cats[c]||0)+1;});
    h+='<div class="adm-card"><b>'+esc(A.file)+'</b> 읽기 완료 · 기준 <b>'+esc(r.meta.label||'-')+'</b><br>모델 <b>'+r.m.length+'</b>개 · 요금 <b>'+r.rows+'</b>행'+(r.cards?' · 제휴카드 <b>'+r.cards.length+'</b>종 ('+r.cards.map(function(c){return esc(c.name);}).join(', ')+')':' · 카드 판촉 시트 없음 (지금 카드 혜택 유지)')
      +'<br>품목: '+Object.keys(cats).map(function(c){return esc(c)+' '+cats[c];}).join(' · ')
      +(d?'<br><br><b>지금 단가표와 비교</b><br>신규 모델 '+d.newM.length+'개 · 없어진 모델 '+d.remM.length+'개 · 최저 월요금 인상 '+d.up+' · 인하 '+d.down+' · 동일 '+d.same
        +(d.newM.length?'<br><small>신규: '+esc(d.newM.slice(0,12).join(', '))+(d.newM.length>12?' 외':'')+'</small>':'')+(d.remM.length?'<br><small>없어짐: '+esc(d.remM.slice(0,12).join(', '))+(d.remM.length>12?' 외':'')+'</small>':''):'')
      +'<div class="hint" style="margin:8px 0 0">기준 달 ('+esc(r.meta.label||'파일 이름에서 못 찾음')+')은 파일 이름의 2026.11 같은 표기에서 읽어요 · 아래에서 바꿀 수 있어요</div>'
      +'<div class="adm-form" style="margin-top:6px"><div><label>기준 달 (YYYY.MM)</label><input id="ckLabel" value="'+esc(r.meta.label||'')+'" placeholder="2026.11"></div></div></div>'
      +'<button class="btn pri block" id="ckApply" style="margin-top:10px">이 단가표로 적용하기</button>';}
  if(u1)h+='<button class="btn line sm" id="ckReset" style="margin-top:10px">기본 단가표로 되돌리기</button>';

  h+='<div class="adm-sec" style="margin-top:22px;border-top:1px solid var(--line);padding-top:16px">② 쿠쿠 다품목 캐시백 가이드 <small>\'공지요약\' (더블 기간 · 제외 품목 · 대상카드) + \'모델리스트\' (일시불 · 구독 캐시백)</small></div>';
  h+='<div class="adm-card">현재 적용: <b>'+(u2?esc(u2.file||u2.label||'-'):'기본 가이드 (저장소)')+'</b>'+(u2?' · '+esc(u2.at||'')+' 업로드 · 일시불 '+(u2.lump||'-')+'개 · 구독 '+(u2.sub||'-')+'개 · 더블 '+(u2.dbl||0)+'회':(cm&&cm.lump?' · 일시불 '+cm.lump.length+'개':''))+'</div>';
  h+='<label class="file-drop">💰 다품목 캐시백 가이드 엑셀(.xlsx) 선택<br><small>예: 쿠쿠 다품목 캐시백 가이드 26.11.xlsx</small><input type="file" id="ckmFile" accept=".xlsx,.xls"></label>';
  if(B.err)h+='<div class="warn">'+esc(B.err)+'</div>';
  if(B.res){var q=B.res,cnt={};q.lump.forEach(function(x){cnt[x[0]]=(cnt[x[0]]||0)+1;});
    h+='<div class="adm-card"><b>'+esc(B.file)+'</b> 읽기 완료 · 기준 <b>'+esc(q.label)+'</b><br>일시불 대상 <b>'+q.lump.length+'</b>개 · 구독 대상 <b>'+q.subRaw.length+'</b>개 (전자랜드 상품코드)'
      +'<br>더블 기간: '+(q.dbl.length?q.dbl.map(function(p){return ckMd(p[0])+"~"+ckMd(p[1]);}).join(' · '):'<b style="color:#dc2626">없음</b>')
      +'<br>더블 제외: '+(q.dblEx.length?esc(q.dblEx.join(', ')):'없음')+' · 대상카드: '+esc(q.cards||'-')
      +'<br><small>일시불 품목: '+Object.keys(cnt).map(function(c){return esc(c)+' '+cnt[c];}).join(' · ')+'</small></div>'
      +'<button class="btn pri block" id="ckmApply" style="margin-top:10px">이 가이드로 적용하기</button>';}
  if(u2)h+='<button class="btn line sm" id="ckmReset" style="margin-top:10px">기본 가이드로 되돌리기</button>';
  h+='<div class="note">적용하면 쿠쿠 계산기에 바로 반영되고, 직원 화면은 새로 접속하거나 다음 접속 때 자동으로 새로 불러와요. 이전 파일은 드라이브 \'삼성AI구독_데이터\' 폴더에 백업돼요. 사진 · 기본 구독료(쿠쿠 홈페이지)는 그대로 유지돼요.</div>';
  if(ADMIN_CK)h+='<a class="btn line sm" href="cuckoo.html" style="margin-top:10px;display:inline-flex;text-decoration:none">← 쿠쿠 계산기로 돌아가기</a>';
  return h;}
function admCkBind(){
  if(!window.CKParse||!window.CK_DATA||!window.CK_MULTI)ckLoadLibs(function(){if(ADM.tab==='ck')admRender();});
  var f=$('#ckFile');if(f)f.onchange=function(){var file=f.files[0];if(!file)return;toast('엑셀을 읽는 중…');
    ckLoadLibs(function(){readXlsxFile(file,function(wb){var A=CKA.ck;A.file=file.name;try{A.res=CKParse.build(XLSX,wb,null,file.name);A.err='';}catch(e){A.res=null;A.err=String(e.message||e);}admRender();});});};
  var g=$('#ckmFile');if(g)g.onchange=function(){var file=g.files[0];if(!file)return;toast('엑셀을 읽는 중…');
    ckLoadLibs(function(){readXlsxFile(file,function(wb){var B=CKA.ckm;B.file=file.name;try{B.res=CKParse.buildMulti(XLSX,wb,file.name);B.err='';}catch(e){B.res=null;B.err=String(e.message||e);}admRender();});});};
  var save=function(kind,btn,r,label,done){btn.disabled=true;btn.textContent='저장 중… (20초쯤 걸릴 수 있어요)';
    gsr('adminSaveData',{pw:ADM.pw,kind:kind,payload:JSON.stringify(r)},function(x){if(!x||!x.ok){btn.disabled=false;btn.textContent=label;toast((x&&x.msg)||'저장하지 못했어요');return;}done();admInfo();},
      function(){btn.disabled=false;btn.textContent=label;toast('서버에 연결하지 못했어요');});};
  var a=$('#ckApply');if(a)a.onclick=function(){var r=CKA.ck.res;if(!r)return;var lb=($('#ckLabel').value||'').trim();if(lb&&!/^\d{4}\.\d{2}$/.test(lb)){toast('기준 달은 2026.11처럼 적어 주세요');return;}
    r.meta.label=lb||r.meta.label;r.meta.at=ckNow();r.meta.file=CKA.ck.file;r.meta.models=r.m.length;r.meta.by=EMP||'';delete r.rows;
    save('ck',a,r,'이 단가표로 적용하기',function(){window.CK_DATA=r;CKA.ck={file:'',res:null,err:''};toast('쿠쿠 단가표를 적용했어요 ('+r.m.length+'개 모델)');});};
  var b=$('#ckmApply');if(b)b.onclick=function(){var r=CKA.ckm.res;if(!r)return;r.meta.at=ckNow();r.meta.by=EMP||'';
    save('ckm',b,r,'이 가이드로 적용하기',function(){window.CK_MULTI=r;CKA.ckm={file:'',res:null,err:''};toast('다품목 캐시백 가이드를 적용했어요');});};
  [['ckReset','ck','쿠쿠 기본 단가표'],['ckmReset','ckm','기본 다품목 가이드']].forEach(function(x){var rs=$('#'+x[0]);if(rs)rs.onclick=function(){if(rs.dataset.s!=='1'){rs.dataset.s='1';rs.textContent='한 번 더 누르면 되돌려요';return;}
    gsr('adminResetData',{pw:ADM.pw,kind:x[1]},function(){toast(x[2]+'로 되돌렸어요');if(x[1]==='ck')window.CK_DATA=null;else window.CK_MULTI=null;ckLoadLibs(function(){});admInfo();});};});
}
function lgLoadLibs(cb){var need=[];if(!window.LGParse)need.push('lg-parse.js');if(!window.LG_DATA)need.push('data/lg.js');
  var n=need.length;if(!n){cb();return;}need.forEach(function(src){var sc=document.createElement('script');sc.src=src+'?d='+Date.now();sc.onload=sc.onerror=function(){if(--n===0)cb();};document.head.appendChild(sc);});}
function lgCur(){var i=ADM.info;return i&&i.lg?i.lg:(window.LG_DATA?window.LG_DATA.meta:null);}
function lgMin(d,m){var b=null;m[2].forEach(function(r){if(d.bd[r[4]]==='소상공인')return;if(b===null||r[10]<b)b=r[10];});return b;}
function lgDiff(nd){var od=window.LG_DATA;if(!od)return null;var ob={},nb={},o={newM:[],remM:[],up:0,down:0,same:0};od.m.forEach(function(m){ob[m[0]]=m;});
  nd.m.forEach(function(m){nb[m[0]]=1;var x=ob[m[0]];if(!x){o.newM.push(m[0]);return;}var a=lgMin(od,x),b=lgMin(nd,m);if(a===b)o.same++;else if(b>a)o.up++;else o.down++;});
  od.m.forEach(function(m){if(!nb[m[0]])o.remM.push(m[0]);});return o;}
function admLgHtml(){
  var i=ADM.info,up=i&&i.lg,cur=lgCur(),u=LGA;
  var h='<div class="adm-card">현재 적용: <b>'+(cur?esc(cur.price||'-'):'불러오는 중…')+'</b>'+(cur&&cur.act?' + <b>'+esc(cur.act)+'</b>':'')
    +(up?'<br>'+esc(up.file||'')+' · '+esc(up.at||'')+' 업로드'+(up.models?' · 모델 '+up.models+'개 · 요금 '+up.rows+'행 · 활성화 '+up.acts+'개':''):'<br>기본 단가표 (저장소)'+(window.LG_DATA?' · 모델 '+window.LG_DATA.m.length+'개':''))+'</div>';
  h+='<label class="file-drop">📂 LG 단가 엑셀(.xlsx) 선택<br><small>\'전자랜드_MMDD\' 단가표 시트 + \'구독 활성화 요약(\'YY년 M월 N주말)\' 시트가 들어 있는 파일</small><input type="file" id="lgFile" accept=".xlsx,.xls"></label>';
  if(u.err)h+='<div class="warn">'+esc(u.err)+'</div>';
  if(u.wb){var ch=LGParse.sheetChoices(u.wb.SheetNames);
    var sel=function(id,list,def,none){return '<select id="'+id+'">'+(none?'<option value="">(활성화 없음)</option>':'')+list.map(function(n){return '<option'+(n===def?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select>';};
    h+='<div class="adm-form"><div class="full"><label>단가표 시트</label>'+sel('lgPs',ch.price,u.ps||ch.priceDef)+'</div><div class="full"><label>활성화 요약 시트</label>'+sel('lgAs',ch.act,u.as!==''&&u.as!=null?u.as:ch.actDef,true)+'</div></div>';}
  if(u.res){var r=u.res,d=lgDiff(r),cats={};r.m.forEach(function(m){var c=String(r.cats[m[1]]).replace(/\s*\(.*$/,'');cats[c]=(cats[c]||0)+1;});
    h+='<div class="adm-card"><b>'+esc(u.file)+'</b> 읽기 완료<br>단가표 <b>'+esc(r.meta.price)+'</b> · 활성화 <b>'+esc(r.meta.act||'없음')+'</b><br>모델 <b>'+r.m.length+'</b>개 · 요금 <b>'+r.rows+'</b>행 · 활성화 <b>'+Object.keys(r.act).length+'</b>개'
      +'<br>품목: '+Object.keys(cats).map(function(c){return esc(c)+' '+cats[c];}).join(' · ')
      +(d?'<br><br><b>현재 단가표와 비교</b><br>신규 모델 '+d.newM.length+'개 · 없어진 모델 '+d.remM.length+'개<br>최저 월요금 인상 '+d.up+' · 인하 '+d.down+' · 동일 '+d.same
        +(d.newM.length?'<br><small>신규: '+esc(d.newM.slice(0,12).join(', '))+(d.newM.length>12?' 외':'')+'</small>':'')
        +(d.remM.length?'<br><small>없어짐: '+esc(d.remM.slice(0,12).join(', '))+(d.remM.length>12?' 외':'')+'</small>':''):'')+'</div>'
      +'<button class="btn pri block" id="lgApply" style="margin-top:12px">이 단가표로 적용하기</button>';}
  if(up)h+='<button class="btn line sm" id="lgReset" style="margin-top:12px">기본 단가표로 되돌리기</button>';
  h+='<div class="note">적용하면 LG 계산기에 바로 반영되고, 다른 사용자는 새로 접속(새로고침)할 때부터 적용돼요. 이전 단가표는 드라이브 \'삼성AI구독_데이터\' 폴더에 백업돼요.</div>';
  h+=cpaHtml();
  if(ADMIN_LG)h+='<a class="btn line sm" href="lg.html" style="margin-top:10px;display:inline-flex;text-decoration:none">← LG 계산기로 돌아가기</a>';
  return h;
}
/* ---------- 💳 LG 카드 정책 이미지 (관리자) : 올리면 서버(드라이브)에 저장 → 깃허브가 5분마다 cardpol/ 로 옮겨 담음 ---------- */
var CPA={pol:null,pub:null,busy:'',err:''};
function cpaPubLoad(){fetch((window.TEST_MODE?'../':'')+'cardpol/list.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(o){CPA.pub=o||{src:''};if(ADM.tab==='lg')admRender();}).catch(function(){CPA.pub={src:''};});}
function cpaHtml(){var o=CPA.pol,h='<div class="adm-sec" style="margin-top:22px;border-top:1px solid var(--line);padding-top:16px">💳 LG 카드 정책 이미지 <small>LG 계산기 오른쪽 \'💳 카드 정책\' 탭에 보여요</small></div>';
  if(!o)return h+(CPA.err?'<div class="warn" style="margin-top:8px">'+esc(CPA.err)+'</div>':'<div class="empty" style="margin-top:8px">불러오는 중…</div>');
  h+='<label class="file-drop" style="margin-top:8px">🖼 정책 이미지 올리기 (여러 장 가능)<br><small>JPG · PNG · 캡처 이미지 · 저장소(깃허브)로 옮겨져 직원 화면에 빠르게 보여요</small><input type="file" id="cpaFile" accept="image/*" multiple></label>';
  if(CPA.busy)h+='<div class="hint" style="margin-top:6px">⏳ '+esc(CPA.busy)+'</div>';
  if(CPA.err)h+='<div class="warn" style="margin-top:6px">'+esc(CPA.err)+'</div>';
  var synced=CPA.pub&&CPA.pub.src===o.at;
  h+='<div class="hint" style="margin-top:6px">'+(o.imgs.length?'지금 '+o.imgs.length+'장':'아직 올린 이미지가 없어요')+(o.at?' · '+esc(o.at.slice(0,16))+' 저장':'')
    +(o.at?' · '+(CPA.pub==null?'반영 확인 중…':synced?'<b style="color:#15803d">✅ 직원 화면 반영 완료</b>':'<b style="color:#ea580c">⏳ 직원 화면 반영 대기 (5~10분 안에 자동 반영)</b> <a href="#" id="cpaRe">다시 확인</a>'):'')+'</div>';
  if(o.imgs.length)h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:8px">'+o.imgs.map(function(x,i){var pf=CPA.pub&&CPA.pub.imgs?CPA.pub.imgs.filter(function(y){return y.f.indexOf(x.id.replace(/[^0-9A-Za-z_-]/g,''))===0;})[0]:null;
      var src=pf?(window.TEST_MODE?'../':'')+'cardpol/'+encodeURIComponent(pf.f):'https://drive.google.com/thumbnail?id='+encodeURIComponent(x.id)+'&sz=w400';
      return '<div style="border:1px solid var(--line);border-radius:10px;padding:6px;background:#fff"><img src="'+src+'" alt="" loading="lazy" style="width:100%;height:150px;object-fit:contain;background:var(--soft);border-radius:6px">'
        +'<div style="font-size:11.5px;color:var(--sub);margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(i+1)+'. '+esc(x.name||'')+'</div>'
        +'<div style="display:flex;gap:4px"><button class="btn line sm" data-cpm="'+i+'|-1" '+(i?'':'disabled')+'>↑</button><button class="btn line sm" data-cpm="'+i+'|1" '+(i<o.imgs.length-1?'':'disabled')+'>↓</button><button class="btn line sm" data-cpd="'+i+'" style="margin-left:auto;color:#dc2626">삭제</button></div></div>';}).join('')+'</div>';
  if(o.imgs.length)h+='<button class="btn line sm" id="cpaClear" style="color:#dc2626;margin-top:10px">🗑 모두 지우기 (새 달 정책 올리기 전에)</button>';
  h+='<div class="note">매달 바꿀 때: <b>모두 지우기</b> → 새 이미지 올리기. 올린 이미지는 깃허브 저장소 <b>cardpol/</b> 폴더로 자동으로 옮겨져(5~10분) 직원 화면에서 빠르게 열려요.</div>';
  return h;}
function cpaLoad(){CPA.err='';gsr('getCardPolicy',{},function(r){CPA.pol=r&&r.imgs?r:{at:'',imgs:[]};if(ADM.tab==='lg')admRender();},function(){CPA.err='불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.';if(ADM.tab==='lg')admRender();});cpaPubLoad();}
function cpaSet(ids,msg){CPA.busy='저장하는 중…';CPA.err='';admRender();
  gsr('adminCardPolicySet',{pw:ADM.pw,ids:ids},function(r){CPA.busy='';if(r&&r.ok){CPA.pol=r.pol;toast(msg+' · 5~10분 안에 직원 화면에 반영돼요');}else CPA.err=(r&&r.msg)||'저장하지 못했어요';admRender();},function(){CPA.busy='';CPA.err='저장하지 못했어요';admRender();});}
function cpaShrink(file,cb){var fr=new FileReader();fr.onload=function(){var img=new Image();img.onload=function(){var mw=1800,w=img.width,h=img.height,k=Math.min(1,mw/w);
      if(k===1&&file.size<900000&&/jpe?g|png|webp/.test(file.type)){cb(fr.result,w,h);return;}
      var c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.88),c.width,c.height);};
    img.onerror=function(){cb(null);};img.src=fr.result;};fr.readAsDataURL(file);}
function cpaBind(){
  if(!CPA.pol&&!CPA.err)cpaLoad();
  var re=$('#cpaRe');if(re)re.onclick=function(e){e.preventDefault();CPA.pub=null;admRender();cpaPubLoad();};
  var f=$('#cpaFile');if(f)f.onchange=function(){var files=Array.prototype.slice.call(f.files||[]).filter(function(x){return /^image\//.test(x.type);});if(!files.length)return;var i=0,okN=0;
    var next=function(){if(i>=files.length){CPA.busy='';admRender();if(okN)toast(okN+'장 올렸어요 · 5~10분 안에 직원 화면에 반영돼요');return;}var file=files[i++];CPA.busy=file.name+' 올리는 중… ('+i+'/'+files.length+')';CPA.err='';admRender();
      cpaShrink(file,function(data,w,h){if(!data){next();return;}gsr('adminCardPolicyUpload',{pw:ADM.pw,data:data,name:file.name,w:w,h:h},function(r){if(r&&r.ok){CPA.pol=r.pol;okN++;}else toast((r&&r.msg)||'올리지 못했어요');next();},function(){toast(file.name+' 올리지 못했어요');next();});});};
    next();};
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-cpm]'),function(b){b.onclick=function(){var p=b.dataset.cpm.split('|'),i=+p[0],j=i+(+p[1]),ids=CPA.pol.imgs.map(function(x){return x.id;}),t=ids[i];ids[i]=ids[j];ids[j]=t;cpaSet(ids,'순서를 바꿨어요');};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-cpd]'),function(b){b.onclick=function(){if(!confirm('이 이미지를 지울까요?'))return;var i=+b.dataset.cpd;cpaSet(CPA.pol.imgs.filter(function(x,k){return k!==i;}).map(function(x){return x.id;}),'지웠어요');};});
  var cl=$('#cpaClear');if(cl)cl.onclick=function(){if(!confirm('올려 둔 카드 정책 이미지를 모두 지울까요?'))return;cpaSet([],'모두 지웠어요');};
}
function admLgBind(){
  if(!window.LGParse||!window.LG_DATA){lgLoadLibs(function(){if(ADM.tab==='lg')admRender();});}
  var parse=function(){var u=LGA;u.ps=$('#lgPs')?$('#lgPs').value:u.ps;u.as=$('#lgAs')?$('#lgAs').value:u.as;
    try{u.res=LGParse.build(XLSX,u.wb,u.ps,u.as);u.res.meta.file=u.file;u.err='';}catch(e){u.res=null;u.err=String(e.message||e);}admRender();};
  var f=$('#lgFile');if(f)f.onchange=function(){var file=f.files[0];if(!file)return;toast('엑셀을 읽는 중… (10초쯤 걸려요)');
    lgLoadLibs(function(){readXlsxFile(file,function(wb){var ch=LGParse.sheetChoices(wb.SheetNames);LGA={wb:wb,file:file.name,res:null,err:ch.price.length?'':'\'전자랜드_MMDD\' 이름의 단가표 시트를 찾지 못했어요',ps:ch.priceDef,as:ch.actDef};
      if(ch.price.length)setTimeout(parse,30);else admRender();});});};
  ['lgPs','lgAs'].forEach(function(id){var el=$('#'+id);if(el)el.onchange=function(){toast('다시 읽는 중…');setTimeout(parse,30);};});
  var a=$('#lgApply');if(a)a.onclick=function(){var r=LGA.res;if(!r)return;
    var now=new Date(),at=now.getFullYear()+'-'+('0'+(now.getMonth()+1)).slice(-2)+'-'+('0'+now.getDate()).slice(-2)+' '+('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2);
    r.meta.at=at;r.meta.file=LGA.file;r.meta.models=r.m.length;r.meta.rows=r.rows;r.meta.acts=Object.keys(r.act).length;r.meta.by=EMP||'';
    a.disabled=true;a.textContent='저장 중… (20초쯤 걸릴 수 있어요)';
    gsr('adminSaveData',{pw:ADM.pw,kind:'lg',payload:JSON.stringify(r)},function(x){
      if(!x||!x.ok){a.disabled=false;a.textContent='이 단가표로 적용하기';toast((x&&x.msg)||'저장하지 못했어요');return;}
      window.LG_DATA=r;LGA={wb:null,file:'',res:null,err:''};toast('LG 단가표를 적용했어요 ('+r.m.length+'개 모델)');admInfo();},function(){a.disabled=false;a.textContent='이 단가표로 적용하기';toast('서버에 연결하지 못했어요');});};
  var rs=$('#lgReset');if(rs)rs.onclick=function(){if(rs.dataset.s!=='1'){rs.dataset.s='1';rs.textContent='한 번 더 누르면 되돌려요';return;}
    gsr('adminResetData',{pw:ADM.pw,kind:'lg'},function(){toast('LG 기본 단가표로 되돌렸어요');window.LG_DATA=null;lgLoadLibs(function(){});admInfo();});};
}
function admBind(t){
  if(t==='price'){
    var f=$('#prFile');if(f)f.onchange=function(){var file=f.files[0];if(!file)return;toast('엑셀을 읽는 중…');var lbl=$('#prLabel').value;
      readXlsxFile(file,function(wb){var res=parsePriceWB(wb);ADM.up.price={file:file.name,label:lbl,res:res,err:res.err,diff:res.err?null:priceDiff(res.data)};admRender();});};
    var a=$('#prApply');if(a)a.onclick=function(){var u=ADM.up.price,label=$('#prLabel').value.trim()||u.file.replace(/\.xlsx?$/i,'');
      var now=new Date(),at=now.getFullYear()+'-'+('0'+(now.getMonth()+1)).slice(-2)+'-'+('0'+now.getDate()).slice(-2)+' '+('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2);
      var meta={label:label,file:u.file,at:at,models:u.res.models,rows:u.res.rows,by:EMP||''};
      a.disabled=true;a.textContent='저장 중…';
      gsr('adminSaveData',{pw:ADM.pw,kind:'price',payload:JSON.stringify({data:u.res.data,meta:meta})},function(r){
        if(!r||!r.ok){a.disabled=false;a.textContent='이 단가표로 적용하기';toast((r&&r.msg)||'저장하지 못했어요');return;}
        window.PRICE_META=meta;applyData(u.res.data);ADM.up.price=null;toast('단가표를 적용했어요 ('+meta.models+'개 모델)');admInfo();},function(){a.disabled=false;a.textContent='이 단가표로 적용하기';toast('서버에 연결하지 못했어요');});};
    var rs=$('#prReset');if(rs)rs.onclick=function(){if(rs.dataset.s!=='1'){rs.dataset.s='1';rs.textContent='한 번 더 누르면 되돌려요';return;}
      gsr('adminResetData',{pw:ADM.pw,kind:'price'},function(){toast('기본 단가표로 되돌렸어요. 새로고침하면 적용돼요');admInfo();});};
  }else{
    var keep=function(){var u=ADM.up.promo=ADM.up.promo||{};['name','short','base','start','end','desc'].forEach(function(k){var el=$('#po'+k.charAt(0).toUpperCase()+k.slice(1));if(el)u[k]=el.value;});return u;};
    var pf=$('#poFile');if(pf)pf.onchange=function(){var file=pf.files[0];if(!file)return;var u=keep();toast('엑셀을 읽는 중…');
      readXlsxFile(file,function(wb){var res=parsePromoWB(wb);u.file=file.name;u.err=res.err;u.res=res.err?null:res;admRender();});};
    var pa=$('#poApply');if(pa)pa.onclick=function(){var u=keep();
      var meta={name:(u.name||'').trim(),short:(u.short||'').trim()||'추가판촉',base:(u.base||'').trim()||'구독페스티벌',start:u.start||'',end:u.end||'',desc:(u.desc||'').trim()};
      if(!meta.name){toast('판촉명을 입력해 주세요');return;}
      if(meta.start&&meta.end&&meta.start>meta.end){toast('종료일이 시작일보다 빨라요');return;}
      var data=u.res?u.res.data:PROMO;if(!Object.keys(data).length){toast('대상 모델 엑셀을 선택해 주세요');return;}
      pa.disabled=true;pa.textContent='저장 중…';
      gsr('adminSaveData',{pw:ADM.pw,kind:'promo',payload:JSON.stringify({data:data,meta:meta})},function(r){
        if(!r||!r.ok){pa.disabled=false;pa.textContent='판촉 적용하기';toast((r&&r.msg)||'저장하지 못했어요');return;}
        applyData(null,data,meta);ADM.up.promo=null;toast(meta.name+' 판촉을 적용했어요');admInfo();},function(){pa.disabled=false;pa.textContent='판촉 적용하기';toast('서버에 연결하지 못했어요');});};
    var pe=$('#poEnd2');if(pe)pe.onclick=function(){if(pe.dataset.s!=='1'){pe.dataset.s='1';pe.textContent='한 번 더 누르면 종료돼요';return;}
      gsr('adminResetData',{pw:ADM.pw,kind:'promo',mode:'end'},function(){applyData(null,{},null);toast('판촉을 종료했어요');admInfo();});};
    var pr=$('#poReset');if(pr)pr.onclick=function(){gsr('adminResetData',{pw:ADM.pw,kind:'promo'},function(){toast('기본값으로 되돌렸어요. 새로고침하면 적용돼요');admInfo();});};
  }
}
/* index.html이 부르는 입구 (관리자 열기 · 다시 그리기 · 단가 정보) */
ADMX={admLogin:admLogin,admRender:admRender,admInfo:admInfo};
//# sourceURL=admin.js

/* ===== 🧾 사번별 이용 > 📅 일별 기록 (v8.72) =====
   날짜를 골라 그날 사번별 접속 · 실사용 · 조회 · 담기 · 캡처 · 인쇄 · 보관 · 계산기별 사용을 확인
   이름을 누르면 그 직원의 날짜별 기록 (최근 30일 · 90일 · 전체) */
function aeModeHtml(){return '<div class="afb" style="margin-top:12px">'+[['day','📅 일별 기록'],['sum','📊 기간 합계']].map(function(x){return '<button class="'+(AEMP.mode===x[0]?'on':'')+'" data-aem="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';}
function aeModeBind(){Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aem]'),function(b){b.onclick=function(){if(AEMP.mode===b.dataset.aem)return;AEMP.mode=b.dataset.aem;if(AEMP.mode==='day'){if(!AEMP.dd)aedLoad();}else if(!AEMP.data)admEmpLoad();admRender();};});}
function aedToday(){return todayStr().replace(/-/g,'');}
function aedLoad(){AEMP.dd=null;gsr('adminEmpDaily',{pw:ADM.pw,date:AEMP.date||aedToday()},function(r){AEMP.dd=r&&r.ok?r:{ok:false};if(r&&r.ok)AEMP.date=r.date;if(ADM.tab==='emp')admRender();},function(){AEMP.dd={ok:false};if(ADM.tab==='emp')admRender();});}
function aedShift(d,n){var t=new Date(+d.slice(0,4),+d.slice(4,6)-1,+d.slice(6,8)+n);return t.getFullYear()+('0'+(t.getMonth()+1)).slice(-2)+('0'+t.getDate()).slice(-2);}
function aedDw(d){return '일월화수목금토'.charAt(new Date(+d.slice(0,4),+d.slice(4,6)-1,+d.slice(6,8)).getDay());}
function aedBrands(x){var c=['#1428a0','#a50034','#c8102e'],n=['삼성','LG','쿠쿠'],o=[];for(var i=0;i<3;i++)if(x.u&&x.u[i])o.push('<span class="aed-bd" style="border-color:'+c[i]+';color:'+c[i]+'">'+n[i]+(x.b&&x.b[i]?' '+x.b[i]:'')+'</span>');return o.join(' ')||'<span style="color:#cbd5e1">—</span>';}
function aedRows(){var R=AEMP.dd,ro=R.roster||{},L=(R.rows||[]).map(function(x){var m=ro[x.e];x.name=m?m[0]||'':'';x.br=m?(m[1]||'(지점 없음)'):'(명부 없음)';x.rank=m?m[2]||'':'';x.inR=!!m;x.none=false;return x;});
  if(AEMP.dnone){var seen={};L.forEach(function(x){seen[x.e]=1;});Object.keys(ro).forEach(function(e){if(!seen[e])L.push({e:e,name:ro[e][0]||'',br:ro[e][1]||'(지점 없음)',rank:ro[e][2]||'',inR:true,none:true,n:0,am:0,v:0,ad:0,c:0,p:0,s:0,b:[0,0,0],u:[0,0,0],f:'',l:'',dev:''});});}
  return L;}
function aedHtml(){var R=AEMP.dd,d=AEMP.date||aedToday(),td=aedToday();
  var h='<div class="aed-nav"><button class="btn line sm" data-aeds="-1">◀ 전날</button><input type="date" id="aedDate" value="'+afDs(d)+'" max="'+afDs(td)+'"><span class="aed-dw">('+aedDw(d)+')'+(d===td?' 오늘':'')+'</span><button class="btn line sm" data-aeds="1"'+(d>=td?' disabled':'')+'>다음날 ▶</button>'+(d!==td?'<button class="btn line sm" data-aedt="1">오늘</button>':'')+'<button class="btn line sm" id="aedCsv" style="margin-left:auto">⬇ CSV</button></div>';
  if(!R)return h+'<div class="empty" style="margin-top:12px">불러오는 중…</div>';
  if(!R.ok)return h+'<div class="warn" style="margin-top:12px">불러오지 못했어요. Code.gs가 최신인지 확인해 주세요.</div>';
  var ro=R.roster||{},rn=Object.keys(ro).length,all=(R.rows||[]),S={u:all.length,am:0,ad:0,q:0,inR:0};all.forEach(function(x){S.am+=x.am||0;S.ad+=x.ad||0;S.q+=(x.p||0)+(x.s||0);if(ro[x.e])S.inR++;});
  var tr=R.trend||[],prev=tr.length>1?tr[tr.length-2]:null,dl=function(a,b){if(b==null)return '';var v=a-b;return v>0?'<em style="color:#15803d">▲'+v+'</em>':v<0?'<em style="color:#dc2626">▼'+(-v)+'</em>':'<em>-</em>';};
  h+='<div class="adm-kpi">'+[['이용 인원',S.u+'명',dl(S.u,prev&&prev.u)],['명부 대비',rn?Math.round(S.inR/rn*100)+'%':'-','<em>'+S.inR+'/'+rn+'</em>'],['실사용 합계',fmtMin(S.am),''],['모델 담기',S.ad+'회',dl(S.ad,prev&&prev.ad)],['견적 (인쇄 · 보관)',S.q+'회',dl(S.q,prev&&prev.q)]].map(function(x){return '<div><span>'+x[0]+'</span><b>'+x[1]+'</b>'+x[2]+'</div>';}).join('')+'</div>';
  /* 14일 추이 (막대를 누르면 그 날짜로) */
  var mx=Math.max.apply(null,[1].concat(tr.map(function(t){return t.u;})));
  h+='<div class="aed-trend">'+tr.map(function(t){return '<button data-aedday="'+t.d+'" class="'+(t.d===d?'on':'')+'" title="'+aeMd(t.d)+' '+t.u+'명 · 실사용 '+fmtMin(t.am)+'"><i style="height:'+Math.max(3,Math.round(t.u/mx*56))+'px"></i><b>'+t.u+'</b><small>'+aeMd(t.d)+'</small></button>';}).join('')+'</div><div class="hint" style="margin:2px 0 0">최근 14일 이용 인원 · 막대를 누르면 그 날짜로 이동</div>';
  h+=aedMailHtml(R.report);
  /* 목록 */
  var L=aedRows(),q=AEMP.dq.trim().toLowerCase(),BR={};L.forEach(function(x){BR[x.br]=1;});
  var F=L.filter(function(x){return (!AEMP.dbr||x.br===AEMP.dbr)&&(!q||(x.e+' '+x.name+' '+x.br+' '+x.rank).toLowerCase().indexOf(q)>=0);});
  var so=AEMP.dsort;F.sort(function(a,b){if(a.none!==b.none)return a.none?1:-1;return so==='first'?((a.f||'99')<(b.f||'99')?-1:1):so==='br'?(a.br<b.br?-1:a.br>b.br?1:(b.am-a.am)):so==='ad'?((b.ad+b.p+b.s)-(a.ad+a.p+a.s)):((b.am-a.am)||(b.n-a.n));});
  h+='<div class="ae-tools"><select id="aedBr"><option value="">전체 지점</option>'+Object.keys(BR).sort().map(function(b){return '<option'+(AEMP.dbr===b?' selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select><input type="search" id="aedQ" placeholder="사번 · 이름 · 지점 검색" value="'+esc(AEMP.dq)+'" autocomplete="off"></div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px"><div class="chips" style="margin:0">'+[['am','실사용 많은 순'],['first','먼저 온 순'],['ad','담기 · 견적 많은 순'],['br','지점 순']].map(function(x){return '<button class="chip sm '+(so===x[0]?'on':'')+'" data-aedo="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div><label style="margin-left:auto;font-size:13px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="aedNone"'+(AEMP.dnone?' checked':'')+'> 안 들어온 직원도 보기</label></div>';
  var used=F.filter(function(x){return !x.none;}).length;
  h+='<div class="adm-sec">'+aeMd(d)+'('+aedDw(d)+') 사번별 기록 <small>'+used+'명 이용'+(AEMP.dnone?' · '+(F.length-used)+'명 미접속':'')+' · 이름을 누르면 날짜별 기록</small></div>';
  h+='<div class="scroll" style="margin-top:6px;max-height:600px;border:1px solid var(--line);border-radius:12px"><table class="ae-tbl"><tr><th>이름 · 사번</th><th>지점</th><th>접속 시간</th><th style="text-align:right">실사용</th><th style="text-align:right">접속</th><th>조회 · 담기 · 캡처</th><th>인쇄 · 보관</th><th>쓴 계산기 (기능 횟수)</th><th>기기</th></tr>'
    +(F.length?F.slice(0,500).map(function(x){var op=AEMP.dopen===x.e;
      if(x.none)return '<tr data-aedo-e="'+esc(x.e)+'" style="cursor:pointer;color:#94a3b8'+(op?';background:#eef2ff':'')+'"><td><b>'+(op?'▾ ':'▸ ')+esc(x.name||'-')+'</b><br><small>'+esc(x.e)+'</small></td><td>'+esc(x.br)+'</td><td colspan="7">이날 안 들어옴</td></tr>'+(op?'<tr><td colspan="9" style="background:#f8fafc;white-space:normal;padding:10px">'+aehHtml(x.e)+'</td></tr>':'');
      return '<tr data-aedo-e="'+esc(x.e)+'" style="cursor:pointer'+(op?';background:#eef2ff':'')+'"><td><b>'+(op?'▾ ':'▸ ')+esc(x.name||'-')+'</b><br><small style="color:var(--sub)">'+esc(x.e)+'</small>'+(x.inR?'':' <small style="color:#ea580c">명부 없음</small>')+'</td><td>'+esc(x.br)+'<br><small style="color:var(--sub)">'+esc(x.rank)+'</small></td><td>'+(x.f?esc(x.f)+' → '+esc(x.l):'<span style="color:#cbd5e1">-</span>')+'</td><td class="n"><b>'+fmtMin(x.am)+'</b></td><td class="n">'+(x.n||0)+'회</td><td>'+(x.v||0)+' · '+(x.ad||0)+' · '+(x.c||0)+'</td><td>'+(x.p||0)+' · '+(x.s||0)+'</td><td>'+aedBrands(x)+'</td><td><small>'+esc(x.dev||'')+'</small></td></tr>'
        +(op?'<tr><td colspan="9" style="background:#f8fafc;white-space:normal;padding:10px">'+aehHtml(x.e)+'</td></tr>':'');}).join(''):'<tr><td colspan="9" style="text-align:center;color:var(--sub);padding:24px">'+(q||AEMP.dbr?'해당하는 직원이 없어요':'이날 이용 기록이 없어요')+'</td></tr>')
    +'</table></div>';
  h+='<div class="note">· 실사용은 계산기 화면을 실제로 보고 있던 시간이에요 (다른 앱 · 꺼진 화면 제외). 시간 기록은 이 기능을 넣은 11/17부터 날짜별로 남고, 그 전 날짜는 접속 · 담기 · 견적만 보여요.<br>· 기록은 30분마다 구글 시트 \'일별이용\' 탭에 저장돼요 (날짜 · 사번 한 줄씩).<br>· 접속 횟수는 계산기를 새로 연 횟수, 계산기 칸의 숫자는 그 계산기에서 기능을 쓴 횟수예요. · '+esc(R.at)+' 기준</div>';
  return h;}
function aedMailHtml(I){I=I||{};var st=I.on===true?'<b style="color:#15803d">● 켜짐</b>':I.on===false?'<b style="color:#64748b">○ 꺼짐</b>':'<b style="color:#ea580c">⚠ 권한 허용 필요</b>';
  return '<div class="aed-mail"><div style="flex:1;min-width:220px"><b>📧 매일 밤 9시 엑셀 리포트</b> '+st+'<br><small>받는 주소 <b>'+esc(I.to||'')+'</b>'+(I.last?' · 마지막 발송 '+esc(I.last.split(' → ')[0]):'')+'</small>'
    +(I.on==null?'<br><small style="color:#ea580c">Apps Script 편집기에서 <b>setupDailyReport</b> 함수를 한 번 실행해 권한을 허용하면 켜져요.</small>':'')+(I.err?'<br><small style="color:#dc2626">최근 오류: '+esc(I.err)+'</small>':'')
    +'<br><small style="color:var(--sub)">첨부: 요약 · 오늘 사번별 · 누적 사번별(미사용 포함) · 일별 추이 · 사번×날짜 · 일별 원본</small></div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button class="btn line sm" id="aedMailTo">주소 변경</button><button class="btn line sm" id="aedMailNow">지금 보내기</button>'+(I.on===true?'<button class="btn line sm" data-aedon="0">끄기</button>':I.on===false?'<button class="btn sm" data-aedon="1">켜기</button>':'')+'</div></div>';}
function aedMailSet(arg,btn,ok){arg.pw=ADM.pw;if(btn){btn.disabled=true;btn.textContent='처리 중…';}
  gsr('adminReportSet',arg,function(r){if(r&&r.info&&AEMP.dd)AEMP.dd.report=r.info;toast(r&&r.ok?ok:((r&&r.msg)||'처리하지 못했어요'));if(ADM.tab==='emp')admRender();},function(){toast('처리하지 못했어요');if(ADM.tab==='emp')admRender();});}
function aedBind(){
  var go=function(d){var td=aedToday();if(!d||d>td)d=td;AEMP.date=d;AEMP.dopen='';aedLoad();admRender();};
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aeds]'),function(b){b.onclick=function(){go(aedShift(AEMP.date||aedToday(),+b.dataset.aeds));};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aedt]'),function(b){b.onclick=function(){go(aedToday());};});
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aedday]'),function(b){b.onclick=function(){if(b.dataset.aedday!==AEMP.date)go(b.dataset.aedday);};});
  var di=$('#aedDate');if(di)di.onchange=function(){if(this.value)go(this.value.replace(/-/g,''));};
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aedo]'),function(b){b.onclick=function(){AEMP.dsort=b.dataset.aedo;admRender();};});
  var nb=$('#aedNone');if(nb)nb.onchange=function(){AEMP.dnone=this.checked;admRender();};
  var sb=$('#aedBr');if(sb)sb.onchange=function(){AEMP.dbr=this.value;admRender();};
  var qi=$('#aedQ');if(qi)qi.oninput=function(){AEMP.dq=this.value;var p=this.selectionStart;admRender();var n=$('#aedQ');if(n){n.focus();try{n.setSelectionRange(p,p);}catch(e){}}};
  Array.prototype.forEach.call(document.querySelectorAll('#admBody tr[data-aedo-e]'),function(b){b.onclick=function(){var e=b.getAttribute('data-aedo-e');AEMP.dopen=AEMP.dopen===e?'':e;if(AEMP.dopen&&!AEMP.hist[e])aehLoad(e);var sc=b.closest('.scroll'),top=sc?sc.scrollTop:0;admRender();var n=document.querySelector('#admBody .scroll');if(n)n.scrollTop=top;};});
  var mt=$('#aedMailTo');if(mt)mt.onclick=function(){var cur=(AEMP.dd&&AEMP.dd.report&&AEMP.dd.report.to)||'';var v=prompt('리포트를 받을 메일 주소 (여러 명은 쉼표로 구분, 최대 5명)',cur);if(v==null||!v.trim()||v.trim()===cur)return;aedMailSet({to:v.trim()},mt,'받는 주소를 바꿨어요');};
  var mn=$('#aedMailNow');if(mn)mn.onclick=function(){if(!confirm('지금까지의 기록으로 엑셀 리포트를 만들어 '+((AEMP.dd&&AEMP.dd.report&&AEMP.dd.report.to)||'관리자 메일')+'로 보낼까요?\n(30초쯤 걸려요)'))return;aedMailSet({send:true},mn,'리포트 메일을 보냈어요');};
  Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aedon]'),function(b){b.onclick=function(){var on=b.dataset.aedon==='1';aedMailSet({on:on},b,on?'매일 밤 9시 자동 발송을 켰어요':'자동 발송을 껐어요');};});
  aehBind();
  var cv=$('#aedCsv');if(cv)cv.onclick=function(){var R=AEMP.dd;if(!R||!R.ok)return;csvDown([['날짜','사번','이름','지점','직책','첫 접속','마지막 접속','접속 횟수','실사용(분)','모델 조회','모델 담기','견적 캡처','인쇄','보관','삼성 기능','LG 기능','쿠쿠 기능','이용 계산기','기기']].concat(aedRows().map(function(x){return [afDs(R.date),x.e,x.name,x.br,x.rank,x.f,x.l,x.n,x.am,x.v,x.ad,x.c,x.p,x.s,x.b[0],x.b[1],x.b[2],x.none?'미접속':['삼성','LG','쿠쿠'].filter(function(n,i){return x.u[i];}).join('·'),x.dev];})),'사번별일별_'+R.date+'.csv');};}
/* 한 사번의 날짜별 기록 */
function aehLoad(e){AEMP.hist[e]=null;gsr('adminEmpHistory',{pw:ADM.pw,emp:e,days:AEMP.hdays},function(r){AEMP.hist[e]=r&&r.ok?r:{ok:false};if(ADM.tab==='emp')admRender();},function(){AEMP.hist[e]={ok:false};if(ADM.tab==='emp')admRender();});}
function aehHtml(e){var H=AEMP.hist[e];
  var top='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px"><b style="font-size:13px">📅 날짜별 기록</b><div class="chips" style="margin:0">'+[[30,'30일'],[90,'90일'],[0,'전체']].map(function(x){return '<button class="chip sm '+(H!==undefined&&AEMP.hdays===x[0]?'on':'')+'" data-aehd="'+x[0]+'" data-aehe="'+esc(e)+'">'+x[1]+'</button>';}).join('')+'</div></div>';
  if(H===undefined)return top.replace('📅 날짜별 기록</b>','📅 날짜별 기록</b> <small style="color:var(--sub)">기간을 누르면 불러와요</small>');
  if(!H)return top+'<div style="font-size:12.5px;color:var(--sub);margin-top:6px">불러오는 중…</div>';
  if(!H.ok)return top+'<div class="warn" style="margin-top:6px">불러오지 못했어요.</div>';
  var L=H.list||[];if(!L.length)return top+'<div style="font-size:12.5px;color:var(--sub);margin-top:6px">이 기간 이용 기록이 없어요.</div>';
  var sm={am:0,ad:0,q:0};L.forEach(function(x){sm.am+=x.am||0;sm.ad+=x.ad||0;sm.q+=(x.p||0)+(x.s||0);});
  var mx=Math.max.apply(null,[1].concat(L.map(function(x){return x.am||0;})));
  return top+'<div style="font-size:12.5px;margin-top:6px">이용 <b>'+L.length+'일</b> · 실사용 <b>'+fmtMin(sm.am)+'</b> · 담기 <b>'+sm.ad+'회</b> · 견적 <b>'+sm.q+'회</b></div>'
    +'<div class="scroll" style="margin-top:6px;max-height:300px;background:#fff;border-radius:10px"><table class="ae-tbl"><tr><th>날짜</th><th>접속 시간</th><th>실사용</th><th style="text-align:right">접속</th><th>조회 · 담기 · 캡처</th><th>인쇄 · 보관</th><th>쓴 계산기</th></tr>'
    +L.map(function(x){return '<tr><td><b>'+aeMd(x.d)+'</b> <small style="color:var(--sub)">('+aedDw(x.d)+')</small></td><td>'+(x.f?esc(x.f)+' → '+esc(x.l):'-')+'</td><td><div style="display:flex;align-items:center;gap:6px"><div class="ae-bar" style="min-width:60px;height:7px"><i style="width:'+Math.round((x.am||0)/mx*100)+'%;background:#6366f1"></i></div><b>'+fmtMin(x.am)+'</b></div></td><td class="n">'+(x.n||0)+'회</td><td>'+(x.v||0)+' · '+(x.ad||0)+' · '+(x.c||0)+'</td><td>'+(x.p||0)+' · '+(x.s||0)+'</td><td>'+aedBrands(x)+'</td></tr>';}).join('')+'</table></div>';}
function aehBind(){Array.prototype.forEach.call(document.querySelectorAll('#admBody [data-aehd]'),function(b){b.onclick=function(ev){ev.stopPropagation();AEMP.hdays=+b.dataset.aehd;AEMP.hist={};aehLoad(b.dataset.aehe);admRender();};});}
