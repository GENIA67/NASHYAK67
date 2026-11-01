import{initializeApp}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";import{getAuth,signInAnonymously,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";import{getDatabase,ref,onValue,set,serverTimestamp,runTransaction}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
const cfg={apiKey:"AIzaSyDl5jB8zlBsGAPJ029KWNL6mis9VFCM9zY",authDomain:"nashyak-207a0.firebaseapp.com",databaseURL:"https://nashyak-207a0-default-rtdb.europe-west1.firebasedatabase.app",projectId:"nashyak-207a0",appId:"1:298642237818:web:f4b14eafbe81af60548ec3"};const auth=getAuth(initializeApp(cfg)),db=getDatabase(),room=new URLSearchParams(location.search).get("room");
if(room){
const el=id=>document.getElementById(id),player=el("player"),buzz=el("buzz"),status=el("status"),name=el("name"),score=el("score"),choose=el("onlineChoose"),choices=el("onlineChoices"),confirm=el("onlineConfirm");
player.hidden=true;choose.hidden=false;document.querySelector(".scorecard").hidden=true;buzz.hidden=true;document.querySelector(".foot").textContent="Онлайн-режим · кімната "+room;
let exited=false;let state=null,uid="",claims={},selected=null,pending=null,pressed="",busy=false,winner=null,errorMessage="";
const describeError=e=>String(e?.code||e?.message||e||"невідома помилка");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const render=()=>{
 const list=state?.players||[];
 if(uid){const mine=Object.entries(claims).find(([i,v])=>v===uid&&i!=="0");selected=mine?Number(mine[0]):null}
 const ended=state?.stage==="awards"||state?.stage==="finished";
 const results=el("onlineResults");results.hidden=!ended||exited;
 if(ended&&!exited){
 const ranked=list.map((p,i)=>({name:p.name,score:Number(p.score)||0,index:p.index??i})).filter(p=>p.index!==0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const top=ranked[0]?.score;const mine=ranked.find(p=>p.index===selected);
 const rank=mine?1+ranked.filter(p=>p.score>mine.score).length:null;
 el("resultTitle").textContent=mine&&mine.score===top?"🏆 Вітаємо з перемогою!":"🏆 Підсумки гри";
 el("resultMine").textContent=mine?"Твій результат: "+mine.score.toLocaleString("uk-UA")+" балів · "+rank+" місце з "+ranked.length:"Підсумкові результати";
 el("resultList").innerHTML=ranked.map(p=>'<div class="resultRow '+(p.index===selected?'mine ':'')+(p.score===top?'top':'')+'"><span>'+(1+ranked.filter(x=>x.score>p.score).length)+'. '+esc(p.name)+(p.index===selected?' (ти)':'')+'</span><b>'+p.score.toLocaleString("uk-UA")+'</b></div>').join("");
 el("resultSession").textContent=state.stage==="finished"?"Сесію завершено. Дякуємо за гру!":"Очікуємо завершення сесії ведучою";
 el("onlineExit").hidden=state.stage!=="finished";
 }
 
 const confirmed=selected!==null&&claims[String(selected)]===uid&&list.some((p,i)=>(p.index??i)===selected);
 choose.hidden=ended||exited||confirmed;document.querySelector(".scorecard").hidden=ended||exited||!confirmed;buzz.hidden=ended||exited||!confirmed;
 if(!confirmed){
   choices.hidden=pending!==null;confirm.hidden=pending===null;
   choices.innerHTML=list.map((p,i)=>i===0?"":'<button class="choice" data-index="'+i+'" '+(claims[String(i)]?'disabled':'')+'>'+esc(p.name)+(claims[String(i)]?' · зайнято':'')+'</button>').join("");
   choices.querySelectorAll("button:not(:disabled)").forEach(b=>b.onclick=()=>{pending=Number(b.dataset.index);render()});
   el("onlineConfirmName").textContent=pending===null?"":"Закріпити за цим телефоном: "+(list[pending]?.name||"")+"?";
 }
 const p=list.find((p,i)=>(p.index??i)===selected);name.textContent=confirmed?p.name:"Гравець";score.textContent=(confirmed?(p?.score||0):0).toLocaleString("uk-UA");
 const active=!exited&&!!state?.questionId&&state?.stage==="question",excluded=(state?.excluded||[]).includes(selected);
 buzz.disabled=!confirmed||!uid||!active||excluded||busy||!!(winner&&winner.questionId===state?.questionId);
 status.textContent=exited?"Ти вийшла з гри. Можна закрити цю вкладку.":ended?"":errorMessage?errorMessage:excluded&&active?"Ти вже відповідав на це запитання":active&&winner?.questionId===state?.questionId?(winner.uid===uid?"🏆 Ти натиснула першою!":"Першим натиснув: "+winner.name):!uid?"Підключення до Firebase…":!state?"Очікування кімнати":!list.length?"Ведуча ще не додала гравців":!confirmed?"Обери вільного гравця та підтвердь":!active?"Очікування запитання":pressed===state.questionId?"Кнопку натиснуто!":"Можна натискати!";
};
el("onlineExit").onclick=()=>{exited=true;render()};
el("onlineNo").onclick=()=>{pending=null;render()};
el("onlineYes").onclick=async()=>{if(pending===null||pending===0||!uid)return;const idx=pending;el("onlineYes").disabled=true;try{
 const result=await runTransaction(ref(db,"rooms/"+room+"/claims/"+idx),current=>current===null?uid:undefined,{applyLocally:false});
 if(!result.committed){status.textContent="Цього гравця вже зайняли. Обери іншого."}
 else{selected=idx;pending=null}
}catch(e){status.textContent="Помилка закріплення: "+describeError(e)}finally{el("onlineYes").disabled=false;render()}};
buzz.onclick=async()=>{if(buzz.disabled||!uid||selected===null)return;const q=state.questionId;errorMessage="";busy=true;pressed=q;render();try{const result=await runTransaction(ref(db,"rooms/"+room+"/winner"),v=>v===null?{uid,playerIndex:selected,name:state.players[selected]?.name||"Гравець",questionId:q}:undefined,{applyLocally:false});winner=result.snapshot.val();if(!result.committed&&winner?.questionId!==q)errorMessage="Натискання не зараховано: запитання змінилося.";else if(!result.committed&&!winner)errorMessage="Не вдалося зафіксувати натискання. Спробуй ще раз."}catch(e){pressed="";errorMessage="Помилка кнопки: "+describeError(e)}finally{busy=false;render()}};
onValue(ref(db,"rooms/"+room+"/winner"),snap=>{winner=snap.val();if(!winner)errorMessage="";render()},e=>status.textContent="Помилка результату: "+describeError(e));
onAuthStateChanged(auth,u=>{uid=u?.uid||"";render()});
signInAnonymously(auth).catch(e=>{status.textContent=e.code==="auth/admin-restricted-operation"?"У Firebase потрібно ввімкнути Anonymous у Authentication.":"Помилка входу: "+e.code});
onValue(ref(db,"rooms/"+room+"/state"),snap=>{const prev=state?.questionId;state=snap.val();if(prev!==state?.questionId){pressed="";errorMessage=""}render()},e=>status.textContent="Помилка доступу: "+e.code);
onValue(ref(db,"rooms/"+room+"/claims"),snap=>{claims=snap.val()||{};render()},e=>status.textContent="Помилка списку: "+e.code);
}
