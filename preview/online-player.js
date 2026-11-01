import{initializeApp}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";import{getAuth,signInAnonymously,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";import{getDatabase,ref,onValue,set,serverTimestamp,runTransaction}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
const cfg={apiKey:"AIzaSyDl5jB8zlBsGAPJ029KWNL6mis9VFCM9zY",authDomain:"nashyak-207a0.firebaseapp.com",databaseURL:"https://nashyak-207a0-default-rtdb.europe-west1.firebasedatabase.app",projectId:"nashyak-207a0",appId:"1:298642237818:web:f4b14eafbe81af60548ec3"};const auth=getAuth(initializeApp(cfg)),db=getDatabase(),room=new URLSearchParams(location.search).get("room");
if(room){
const el=id=>document.getElementById(id),player=el("player"),buzz=el("buzz"),status=el("status"),name=el("name"),score=el("score"),choose=el("onlineChoose"),choices=el("onlineChoices"),confirm=el("onlineConfirm");
player.hidden=true;choose.hidden=false;document.querySelector(".scorecard").hidden=true;buzz.hidden=true;document.querySelector(".foot").textContent="Онлайн-режим · кімната "+room;
let state=null,uid="",claims={},selected=null,pending=null,pressed="",busy=false,winner=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const render=()=>{
 const list=state?.players||[];
 if(uid){const mine=Object.entries(claims).find(([i,v])=>v===uid);selected=mine?Number(mine[0]):null}
 const confirmed=selected!==null&&selected<list.length&&claims[String(selected)]===uid;
 choose.hidden=confirmed;document.querySelector(".scorecard").hidden=!confirmed;buzz.hidden=!confirmed;
 if(!confirmed){
   choices.hidden=pending!==null;confirm.hidden=pending===null;
   choices.innerHTML=list.map((p,i)=>'<button class="choice" data-index="'+i+'" '+(claims[String(i)]?'disabled':'')+'>'+esc(p.name)+(claims[String(i)]?' · зайнято':'')+'</button>').join("");
   choices.querySelectorAll("button:not(:disabled)").forEach(b=>b.onclick=()=>{pending=Number(b.dataset.index);render()});
   el("onlineConfirmName").textContent=pending===null?"":"Закріпити за цим телефоном: "+(list[pending]?.name||"")+"?";
 }
 const p=list[selected];name.textContent=confirmed?p.name:"Гравець";score.textContent=(confirmed?(p?.score||0):0).toLocaleString("uk-UA");
 const active=!!state?.questionId&&state?.stage==="question";
 buzz.disabled=!confirmed||!uid||!active||busy||!!(winner&&winner.questionId===state?.questionId)||pressed===state?.questionId;
 status.textContent=active&&winner?.questionId===state?.questionId?(winner.uid===uid?"🏆 Ти натиснула першою!":"Першим натиснув: "+winner.name):!uid?"Підключення до Firebase…":!state?"Очікування кімнати":!list.length?"Ведуча ще не додала гравців":!confirmed?"Обери вільного гравця та підтвердь":!active?"Очікування запитання":pressed===state.questionId?"Кнопку натиснуто!":"Можна натискати!";
};
el("onlineNo").onclick=()=>{pending=null;render()};
el("onlineYes").onclick=async()=>{if(pending===null||!uid)return;const idx=pending;el("onlineYes").disabled=true;try{
 const result=await runTransaction(ref(db,"rooms/"+room+"/claims/"+idx),current=>current===null?uid:undefined,{applyLocally:false});
 if(!result.committed){status.textContent="Цього гравця вже зайняли. Обери іншого."}
 else{selected=idx;pending=null}
}catch(e){status.textContent="Помилка закріплення: "+e.code}finally{el("onlineYes").disabled=false;render()}};
buzz.onclick=async()=>{if(buzz.disabled||!uid||selected===null)return;const q=state.questionId;busy=true;pressed=q;render();try{const result=await runTransaction(ref(db,"rooms/"+room+"/winner"),v=>v===null?{uid,playerIndex:selected,name:state.players[selected]?.name||"Гравець",questionId:q}:undefined,{applyLocally:false});winner=result.snapshot.val();if(!result.committed&&winner?.questionId!==q)status.textContent="Натискання не зараховано: запитання змінилося."}catch(e){pressed="";status.textContent="Помилка кнопки: "+e.code}finally{busy=false;render()}};
onValue(ref(db,"rooms/"+room+"/winner"),snap=>{winner=snap.val();render()},e=>status.textContent="Помилка результату: "+e.code);
onAuthStateChanged(auth,u=>{uid=u?.uid||"";render()});
signInAnonymously(auth).catch(e=>{status.textContent=e.code==="auth/admin-restricted-operation"?"У Firebase потрібно ввімкнути Anonymous у Authentication.":"Помилка входу: "+e.code});
onValue(ref(db,"rooms/"+room+"/state"),snap=>{const prev=state?.questionId;state=snap.val();if(prev!==state?.questionId)pressed="";render()},e=>status.textContent="Помилка доступу: "+e.code);
onValue(ref(db,"rooms/"+room+"/claims"),snap=>{claims=snap.val()||{};render()},e=>status.textContent="Помилка списку: "+e.code);
}
