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
