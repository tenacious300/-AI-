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
