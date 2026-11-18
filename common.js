/* 삼성 · LG · 쿠쿠 계산기가 같이 쓰는 코드 (한 번 고치면 세 계산기에 모두 반영)
   - 테스트 화면은 test/common.js, 정식은 루트 common.js를 씀 → tools/promote.py promote 로 옮김
   - 페이지 코드는 함수로 감싸져 있어 직접 못 봄 → 각 페이지가 window.PG 에 meGet · esc · toast · fuLog · markAct · emp 를 넘겨 줌 */

/* 📸 견적 캡처: 화면의 '맞춤 구독 견적' 카드(.card.sum)를 그대로 이미지로 · 아래에 로그인 사번의 지점명 */
function capBr(){var m=PG.meGet(),b=m&&m.br?String(m.br).replace(/^전자랜드\s*/,'').trim():'';return '전자랜드'+(b?' '+b:'');}
function capLib(){if(window.html2canvas)return Promise.resolve();return new Promise(function(res,rej){var sc=document.createElement('script');sc.src=(/\/test\//.test(location.pathname)?'../':'')+'vendor/html2canvas.min.js?v=1.4.1';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});}
function capShot(){
  var el=document.querySelector('.card.sum');if(!el)return Promise.reject('no');
  var dt=new Date(),ds=dt.getFullYear()+'.'+(dt.getMonth()+1)+'.'+dt.getDate();
  return capLib().then(function(){var w=el.offsetWidth;
    return html2canvas(el,{scale:Math.min(3,Math.max(2,1000/w)),backgroundColor:null,useCORS:true,logging:false,imageTimeout:4000,
      onclone:function(doc){var c=doc.querySelector('.card.sum');if(!c)return;c.classList.add('cap-mode');c.style.position='static';
        var f=doc.createElement('div');f.className='cap-foot';f.innerHTML='<span>'+PG.esc(capBr())+(PG.emp()?' · 담당 '+PG.esc(PG.emp()):'')+' · '+ds+' 견적</span><span>※ 참고용 견적 · 최종 금액은 계약 시 확인</span>';c.appendChild(f);
        [].forEach.call(c.querySelectorAll('.lumpin input'),function(ip){var sp=doc.createElement('b');sp.className='cap-val';sp.textContent=ip.value||'미입력';ip.replaceWith(sp);});
        [].forEach.call(c.querySelectorAll('.sgrp'),function(g){if(g.querySelector('.lumpin')&&!g.querySelector('.lumpin .cap-val:not(:empty)')){}if(g.querySelector('.lumpin')&&![].some.call(g.querySelectorAll('.cap-val'),function(v){return v.textContent!=='미입력';}))g.style.display='none';});
        [].forEach.call(c.querySelectorAll('img'),function(im){if(!im.complete||!im.naturalWidth){var sp=doc.createElement('span');sp.textContent='📦';im.replaceWith(sp);}});}});});}
function capSave(c){if(!c){PG.toast('담은 모델이 없어요');return;}PG.fuLog('capture');PG.markAct('견적 캡처');
  var dt=new Date(),name='구독견적_'+dt.getFullYear()+('0'+(dt.getMonth()+1)).slice(-2)+('0'+dt.getDate()).slice(-2)+'_'+('0'+dt.getHours()).slice(-2)+('0'+dt.getMinutes()).slice(-2)+'.png';
  c.toBlob(function(b){if(!b){PG.toast('이미지를 만들지 못했어요');return;}
    var file=null;try{file=new File([b],name,{type:'image/png'});}catch(e){}
    var mobile=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if(mobile&&file&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:'맞춤 구독 견적'}).catch(function(){});return;}
    var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
    var msg='견적 이미지를 저장했어요';
    if(navigator.clipboard&&window.ClipboardItem){navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(function(){PG.toast(msg+' · 복사도 됐어요 (카톡에 Ctrl+V)');},function(){PG.toast(msg);});}else PG.toast(msg);},'image/png');}

/* ⏰ 프로모션 마감 알림: 담은 모델에 걸린 기간 혜택의 종료일 · D-day 를 견적 카드(#sDue)에 표시 (캡처에도 나옴)
   list: [{label:'혜택 이름', end:'2026-11-24'}] · 이미 끝난 것은 빼고, 같은 혜택은 한 번만, 빨리 끝나는 순 */
function dueDays(end){var t=new Date(),a=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()),p=String(end).split('-'),b=Date.UTC(+p[0],+p[1]-1,+p[2]);return Math.round((b-a)/864e5);}
function dueText(end){var n=dueDays(end),p=String(end).split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);var md=(+p[1])+'/'+(+p[2])+'('+'일월화수목금토'.charAt(d.getDay())+')';return {n:n,tag:n<=0?'오늘 종료':'D-'+n,md:md};}
function dueSet(list){var el=document.getElementById('sDue');if(!el)return;var seen={},L=[];
  (list||[]).forEach(function(x){if(!x||!x.end||!/^\d{4}-\d{2}-\d{2}$/.test(x.end))return;var k=x.label+'|'+x.end;if(seen[k])return;seen[k]=1;if(dueDays(x.end)<0)return;L.push(x);});
  L.sort(function(a,b){return a.end<b.end?-1:a.end>b.end?1:0;});
  if(!L.length){el.innerHTML='';el.style.display='none';return;}
  el.style.display='';el.innerHTML=L.slice(0,4).map(function(x){var t=dueText(x.end);return '<div class="due'+(t.n<=2?' hot':'')+'">⏰ <b>'+PG.esc(x.label)+'</b> <em>'+t.tag+'</em> · '+t.md+(t.n<=0?'':' 종료')+'</div>';}).join('');}

/* 📢 단가 바뀐 점 요약: 이 기기에 저장해 둔 지난 단가와 지금 단가를 비교해서, 바뀌었으면 한 번 보여 줌
   - 처음 쓰는 기기는 조용히 저장만 (다음 단가 교체부터 보여 줌)
   - map: { 모델코드: 대표 월 요금(가장 싼 요금) }, name: 화면에 쓸 브랜드 이름 */
function snapCheck(brand,name,map){
  if(document.querySelector('#gate.on')||document.querySelector('#termsPop.on')){setTimeout(function(){snapCheck(brand,name,map);},3000);return;}
  var key='snap_'+brand,h=0,ks=Object.keys(map).sort();ks.forEach(function(k){var t=k+':'+map[k]+';';for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;});
  var old=null;try{old=JSON.parse(localStorage.getItem(key)||'null');}catch(e){}
  var save=function(){try{localStorage.setItem(key,JSON.stringify({h:h,m:map,at:new Date().toISOString().slice(0,10)}));}catch(e){}};
  if(!old||!old.m){save();return;}
  if(old.h===h)return;
  var up=[],dn=[],nw=[],gone=[];
  ks.forEach(function(k){var a=old.m[k],b=map[k];if(a==null)nw.push([k,b]);else if(b>a)up.push([k,a,b]);else if(b<a)dn.push([k,a,b]);});
  Object.keys(old.m).forEach(function(k){if(map[k]==null)gone.push([k,old.m[k]]);});
  save();
  if(!up.length&&!dn.length&&!nw.length&&!gone.length)return;
  up.sort(function(a,b){return (b[2]-b[1])-(a[2]-a[1]);});dn.sort(function(a,b){return (a[2]-a[1])-(b[2]-b[1]);});
  var W=function(n){return Number(n).toLocaleString()+'원';},E=PG.esc;
  var sec=function(title,cls,L,fmt){if(!L.length)return '';var row=function(x){return '<div class="sc-r"><b>'+E(x[0])+'</b><span>'+fmt(x)+'</span></div>';};
    return '<div class="sc-s"><div class="sc-h '+cls+'">'+title+' <small>'+L.length+'개</small></div>'+L.slice(0,6).map(row).join('')+(L.length>6?'<details><summary>나머지 '+(L.length-6)+'개 보기</summary>'+L.slice(6).map(row).join('')+'</details>':'')+'</div>';};
  var d=document.createElement('div');d.className='sc-ov';
  d.innerHTML='<div class="sc-box"><div class="sc-t">📢 '+E(name)+' 단가가 바뀌었어요</div><div class="sc-sub">지난번 접속('+E(old.at||'')+') 이후 바뀐 모델이에요 · 모델별 가장 싼 월 요금 기준</div><div class="sc-body">'
    +sec('⬇ 내린 모델','dn',dn,function(x){return W(x[1])+' → <b>'+W(x[2])+'</b> <i class="dn">'+W(x[2]-x[1])+'</i>';})
    +sec('⬆ 오른 모델','up',up,function(x){return W(x[1])+' → <b>'+W(x[2])+'</b> <i class="up">+'+W(x[2]-x[1])+'</i>';})
    +sec('🆕 새로 생긴 모델','nw',nw,function(x){return '월 '+W(x[1])+'부터';})
    +sec('🚫 빠진 모델','gone',gone,function(x){return '전에는 월 '+W(x[1]);})
    +'</div><button class="sc-ok">확인했어요</button></div>';
  document.body.appendChild(d);d.querySelector('.sc-ok').onclick=function(){d.remove();};
  try{PG.fuLog('pricediff');}catch(e){}
}

/* 💡 추천 팝업 (모델을 담으면 뜸 · 담기 / 바꾸기 / 괜찮아요)
   - ⬆ 한 단계 위: 같은 품목에서 월 1만원 안쪽으로 더 내면 되는 모델
   - ⬇ 더 저렴한: 같은 품목에서 조금 더 싼 모델 (바꾸기)
   - 🤝 함께 담기: 인쇄 · 견적 기록에서 같이 담긴 모델 (기록이 없으면 같이 쓰면 좋은 품목)
   페이지가 window.REC_PAGE 로 넘겨 줌: brand · all() → [{code,grp,cat,price}] · add(code) · cart() → [코드] · removeAt(i)
   💰 최저 조합: REC_PAGE.best() → {rows:[{code,from,to,save}], apply()} */
var REC={pairs:null,pop:{},fb:{},busy:false,off:false};
try{REC.off=localStorage.getItem('recOff')==='1';}catch(e){}
var REC_WITH={'냉장고':['김치냉장고','정수기'],'김치냉장고':['냉장고'],'세탁기':['건조기','에어드레서'],'건조기':['세탁기'],'TV':['오디오','사운드바'],'에어컨':['공기청정기','제습기'],'공기청정기':['에어컨','정수기'],'정수기':['공기청정기','비데'],'식기세척기':['전기레인지','정수기'],'전기레인지':['식기세척기','후드'],'청소기':['공기청정기'],'비데':['정수기'],'밥솥':['정수기','인덕션']};
function recLoadPairs(){if(REC.pairs||!window.REC_PAGE)return;REC.pairs={};
  try{gsrCommon('getPairs',REC_PAGE.brand,function(r){REC.pairs=(r&&r.pairs)||{};REC.pop=(r&&r.pop)||{};REC.fb=(r&&r.fb)||{};});}catch(e){}}
/* 쓸수록 바뀌는 순위: 인기(최근 30일 조회 · 담기 · 인쇄 · 보관) + 추천 반응(보였을 때 담기/바꾸기를 누른 비율) */
function recScore(code,x){var p=REC.pop[code]||0,f=REC.fb[code]||[0,0];return Math.log(1+p)+4*((f[1]+1)/(f[0]+5))+((x&&x.boost)||0);}  /* boost: 판촉 · 활성화 대상 모델 가산점 (페이지가 넣어 줌) */
/* 페이지마다 서버 호출 함수 이름이 달라서(gsr / api) 페이지가 PG.call 로 넘겨 줌 */
function gsrCommon(fn,arg,cb){if(PG.call)PG.call(fn,arg,cb,function(){});}
function recWon(n){return Number(n).toLocaleString()+'원';}
function recFind(code){var A=REC_PAGE.all(),me=null;A.forEach(function(x){if(x.code===code)me=x;});if(!me)return null;
  var cart=REC_PAGE.cart(),inCart=function(c){return cart.indexOf(c)>=0;};
  var same=A.filter(function(x){return x.grp===me.grp&&x.code!==code&&!inCart(x.code)&&x.price>0;});
  var up=same.filter(function(x){return x.price>me.price&&x.price-me.price<=10000;}).sort(function(a,b){return recScore(b.code,b)-recScore(a.code,a)||a.price-b.price;}).slice(0,2);
  var dn=same.filter(function(x){return x.price<me.price&&x.price>=me.price*0.6;}).sort(function(a,b){return recScore(b.code,b)-recScore(a.code,a)||b.price-a.price;}).slice(0,2);
  var withL=[],P=(REC.pairs||{})[code]||[];
  P.forEach(function(p){if(withL.length>=2||inCart(p[0]))return;A.forEach(function(x){if(x.code===p[0])withL.push({x:x,n:p[1]});});});
  if(!withL.length){var cats=[];Object.keys(REC_WITH).forEach(function(k){if(String(me.cat).indexOf(k)>=0)cats=cats.concat(REC_WITH[k]);});
    cats.forEach(function(c){if(withL.length>=2)return;var L=A.filter(function(x){return String(x.cat).indexOf(c)>=0&&!inCart(x.code)&&x.price>0&&cart.every(function(k){var y=null;A.forEach(function(z){if(z.code===k)y=z;});return !y||String(y.cat).indexOf(c)<0;});}).sort(function(a,b){return recScore(b.code,b)-recScore(a.code,a)||a.price-b.price;});
      if(L.length)withL.push({x:L[0],n:0,rule:c});});}
  return {me:me,up:up,dn:dn,withL:withL};}
function recAfterAdd(code){if(REC.off||REC.busy||!window.REC_PAGE)return;recLoadPairs();var r=recFind(code);if(!r)return;
  if(!r.up.length&&!r.dn.length&&!r.withL.length)return;
  var E=PG.esc,me=r.me,row=function(x,kind,note){var d=x.price-me.price;
    var btn=kind==='swap'?'<button class="rc-b sw" data-swap="'+E(x.code)+'">바꾸기</button>':'<button class="rc-b" data-add="'+E(x.code)+'">담기</button>';
    return '<div class="rc-r"><div><b>'+E(x.code)+'</b><small>'+E(x.cat)+(note?' · '+note:'')+'</small>'+(x.tag?'<em class="rc-tag">'+E(x.tag)+'</em>':'')+'</div><div class="rc-p">월 '+recWon(x.price)+(kind==='with'?'':'<i class="'+(d>0?'up':'dn')+'">'+(d>0?'+':'')+recWon(d)+'</i>')+'</div>'+btn+'</div>';};
  var h='<div class="rc-box"><div class="rc-t">💡 '+E(me.code)+' 담았어요</div><div class="rc-sub">'+E(REC_PAGE.priceLabel||'요금은 모델별 가장 싼 월 요금 기준')+'</div><div class="rc-body">';
  if(r.up.length)h+='<div class="rc-h">⬆ 조금만 더 내면 한 단계 위</div>'+r.up.map(function(x){return row(x,'add');}).join('');
  if(r.dn.length)h+='<div class="rc-h">⬇ 비슷한 모델, 더 저렴하게</div>'+r.dn.map(function(x){return row(x,'swap');}).join('');
  if(r.withL.length)h+='<div class="rc-h">'+(r.withL.some(function(w){return w.n;})?'🤝 함께 많이 담는 모델':'🤝 같이 쓰면 좋은 품목')+'</div>'+r.withL.map(function(w){return row(w.x,'with',w.n?'같이 담긴 견적 '+w.n+'건':'');}).join('');
  h+='</div><label class="rc-off"><input type="checkbox" id="rcOff"> 다음부터 담을 때 추천 안 보기</label><button class="rc-x">괜찮아요</button></div>';
  var d=document.createElement('div');d.className='rc-ov';d.innerHTML=h;document.body.appendChild(d);
  var shown=r.up.concat(r.dn).map(function(x){return x.code;}).concat(r.withL.map(function(w){return w.x.code;})),okL=[],sent=false;
  var fb=function(){if(sent)return;sent=true;try{gsrCommon('recFb',{brand:REC_PAGE.brand,shown:shown,ok:okL,test:!!window.TEST_MODE},function(){});}catch(e){}
    shown.forEach(function(c){var f=REC.fb[c]||(REC.fb[c]=[0,0]);f[0]++;});okL.forEach(function(c){var f=REC.fb[c]||(REC.fb[c]=[0,0]);f[1]++;});};
  var close=function(){fb();if(d.querySelector('#rcOff').checked){REC.off=true;try{localStorage.setItem('recOff','1');}catch(e){}try{PG.fuLog('rec:off');}catch(e){}PG.toast('추천을 껐어요 · 💰 최저 조합 버튼 옆에서 다시 켤 수 있어요');}d.remove();};
  d.querySelector('.rc-x').onclick=close;d.onclick=function(e){if(e.target===d)close();};
  d.querySelector('.rc-body').onclick=function(e){var b=e.target.closest('button');if(!b)return;REC.busy=true;
    okL.push(b.dataset.swap||b.dataset.add);try{if(b.dataset.swap){var i=REC_PAGE.cart().lastIndexOf(me.code);if(i>=0)REC_PAGE.removeAt(i);REC_PAGE.add(b.dataset.swap);PG.fuLog('rec:swap');}
      else{REC_PAGE.add(b.dataset.add);PG.fuLog('rec:add');}}finally{REC.busy=false;}
    b.disabled=true;b.textContent=b.dataset.swap?'바꿨어요':'담았어요';if(b.dataset.swap)setTimeout(close,500);};
  PG.fuLog('rec:show');}
/* 💰 최저 조합 찾기: 담은 모델마다 (케어 · 서비스는 그대로) 월 납부가 가장 적은 약정을 찾아 보여 주고, 적용하면 한 번에 바꿈 */
function recBest(){if(!window.REC_PAGE||!REC_PAGE.best)return;var b=REC_PAGE.best();if(!b||!b.rows.length){PG.toast('담은 모델이 없어요');return;}
  var E=PG.esc,sv=b.rows.reduce(function(a,x){return a+x.save;},0);
  var h='<div class="rc-box"><div class="rc-t">💰 최저 조합 찾기</div><div class="rc-sub">케어 · 서비스는 그대로 두고, 약정 기간을 바꿔 월 납부가 가장 적은 조합이에요 · 카드 · 패키지 할인은 화면에서 그대로 적용</div><div class="rc-body">'
    +b.rows.map(function(x){return '<div class="rc-r"><div><b>'+E(x.code)+'</b><small>'+E(x.from)+' → <b>'+E(x.to)+'</b></small></div><div class="rc-p">'+(x.save>0?'<i class="dn">월 −'+recWon(x.save)+'</i>':'<i>지금이 최저</i>')+'</div></div>';}).join('')
    +'</div>'+(sv>0?'<div class="rc-sum">모두 바꾸면 <b>월 '+recWon(sv)+'</b> 줄어요 <small>(약정 기간이 길어질 수 있어요)</small></div><button class="rc-b big" id="rcApply">이 조합으로 바꾸기</button>':'<div class="rc-sum">지금 담은 조합이 이미 가장 저렴해요</div>')
    +'<label class="rc-off"><input type="checkbox" id="rcOn"'+(REC.off?'':' checked')+'> 모델 담을 때 추천 팝업 보기</label><button class="rc-x">닫기</button></div>';
  var d=document.createElement('div');d.className='rc-ov';d.innerHTML=h;document.body.appendChild(d);
  var close=function(){var was=REC.off;REC.off=!d.querySelector('#rcOn').checked;if(was!==REC.off)try{PG.fuLog(REC.off?'rec:off':'rec:on');}catch(e){}try{localStorage.setItem('recOff',REC.off?'1':'');}catch(e){}d.remove();};
  d.querySelector('.rc-x').onclick=close;d.onclick=function(e){if(e.target===d)close();};
  var ap=d.querySelector('#rcApply');if(ap)ap.onclick=function(){b.apply();PG.fuLog('rec:best');PG.toast('월 '+recWon(sv)+' 줄어드는 조합으로 바꿨어요');close();};
  PG.fuLog('rec:bestshow');}

/* 🛒 판매순위 변동: 직전 순위(R.prev · ss_rank.py 가 순위가 바뀔 때마다 저장)와 비교 → ▲2 · ▼1 · NEW · - */
function rkMove(R,cat,code,i){var P=R&&R.prev&&R.prev[cat];if(!P||!P.length)return '';var j=P.indexOf(code);
  if(j<0)return '<span class="rk-mv nw">NEW</span>';var d=j-i;
  return d>0?'<span class="rk-mv up">▲'+d+'</span>':d<0?'<span class="rk-mv dn">▼'+(-d)+'</span>':'<span class="rk-mv eq">-</span>';}
function rkPrevNote(R){return R&&R.prev&&R.prevAt?' · 옆 ▲▼는 직전 순위('+String(R.prevAt).slice(5).replace('-','.')+') 대비':'';}
