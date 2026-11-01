import{initializeApp}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";import{getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";import{getDatabase,ref,set,onValue,remove}from"https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
const config={apiKey:"AIzaSyDl5jB8zlBsGAPJ029KWNL6mis9VFCM9zY",authDomain:"nashyak-207a0.firebaseapp.com",databaseURL:"https://nashyak-207a0-default-rtdb.europe-west1.firebasedatabase.app",projectId:"nashyak-207a0",appId:"1:298642237818:web:f4b14eafbe81af60548ec3"};
const auth=getAuth(initializeApp(config)),db=getDatabase(),HOST="y6Pu3fI4XPebICpsZSmV3iuq2Q52";let room="",last="",stopBuzz=null,lastQuestion="",processed=new Set(),excluded=[],winner=null,resetting=false,revision=0;
const panel=document.createElement("div");panel.className="panel";panel.style="margin:16px auto;max-width:1400px";panel.innerHTML='<b>🌐 Онлайн-кімната (тест)</b><p id="onlineState">Увійди через Google для запуску онлайн-гри.</p><div class="tabs"><button id="onlineLogin" class="secondary">Увійти як ведуча</button><button id="onlineStart" disabled>Створити кімнату</button></div><p id="onlineLink"></p><p id="onlineBuzz" style="color:#f4c44e"></p>';document.querySelector("main").prepend(panel);
const $=id=>document.getElementById(id);
const live=document.createElement("div");live.id="onlineModalBuzz";live.style="margin:12px 0;padding:14px;border:2px solid #f4c44e;border-radius:12px;background:#10264c;color:#f4c44e;font-weight:800;font-size:20px;display:none";document.querySelector("#buzzStatus").before(live);
function showWinner(v){const active=!!v&&v.questionId===lastQuestion;live.style.display=active?"block":"none";live.textContent=active?"🏆 ПЕРШИМ НАТИСНУВ: "+v.name:"";$("onlineBuzz").textContent=live.textContent;if(active){const btn=document.querySelector('#buzzers [data-buzz="'+v.playerIndex+'"]');if(btn&&!btn.disabled)btn.click();}renderFinalWinner();}

$("onlineLogin").onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$("onlineState").textContent="Помилка входу: "+e.code}};
onAuthStateChanged(auth,u=>{if(u?.uid===HOST){$("onlineState").textContent="Ведуча підключена";$("onlineLogin").hidden=true;$("onlineStart").disabled=false}else{$("onlineState").textContent=u?"Цей Google-акаунт не має прав ведучої":"Увійди через Google";$("onlineStart").disabled=true}});
$("onlineStart").onclick=async()=>{if(auth.currentUser?.uid!==HOST)return;room=String(Math.floor(100000+Math.random()*900000));last="";processed.clear();try{await set(ref(db,"rooms/"+room),{status:"board",state:{stage:"board",players:[]},buzzes:{},createdAt:Date.now()});$("onlineState").textContent="Кімната "+room+" активна";const url=new URL("./player.html",location.href);url.searchParams.set("room",room);$("onlineLink").innerHTML='<a style="color:#f4c44e" target="_blank" rel="noopener" href="'+url.href+'">Посилання для гравців: '+url.href+'</a>';if(stopBuzz)stopBuzz();stopBuzz=onValue(ref(db,"rooms/"+room+"/winner"),snap=>{const v=snap.val();winner=v&&v.questionId===lastQuestion?v:null;showWinner(winner);},e=>{live.style.display="block";live.textContent="Помилка отримання натискання: "+e.code;});sync()}catch(e){$("onlineState").textContent="Помилка створення кімнати: "+e.code}};
async function sync(){if(!room||auth.currentUser?.uid!==HOST)return;let state;try{state=JSON.parse(localStorage.getItem("nashyak-preview-audience-v1"))}catch{return}if(!state)return;const isFinal=state.stage==="final"&&state.finalStage==="question";const questionId=isFinal?JSON.stringify(["ФІНАЛ",state.question?.category,state.question?.text]):state.stage==="question"&&!state.question?.modifier&&!state.question?.shown?JSON.stringify([state.round,state.question?.category,state.question?.points,state.question?.text]):"";const publicState={stage:isFinal?"question":state.stage,players:state.players||[],questionId,responding:state.responding||null,round:state.round||"",title:state.title||"НАШЯК",excluded};const str=JSON.stringify(publicState);if(str===last)return;last=str;if(questionId!==lastQuestion){lastQuestion=questionId;processed.clear();excluded=[];winner=null;showWinner(null);await remove(ref(db,"rooms/"+room+"/winner"));}try{await set(ref(db,"rooms/"+room+"/state"),publicState);await set(ref(db,"rooms/"+room+"/status"),questionId?"question":"board")}catch(e){$("onlineState").textContent="Помилка синхронізації: "+e.code}};
setInterval(sync,800);

document.getElementById("markWrong")?.addEventListener("click",async()=>{
 if(!room||!winner||resetting)return;
 const currentWinner=winner;resetting=true;
 try{
  excluded=[...new Set([...excluded,currentWinner.playerIndex])];
  await set(ref(db,"rooms/"+room+"/state/excluded"),excluded);
  await remove(ref(db,"rooms/"+room+"/winner"));
  winner=null;showWinner(null);
  $("onlineBuzz").textContent="❌ "+currentWinner.name+" відповів неправильно. Інші можуть натискати!";
  last="";
 }catch(e){$("onlineBuzz").textContent="Помилка повторного раунду: "+e.code}
 finally{resetting=false}
});

function finalActive(){let d;try{d=JSON.parse(localStorage.getItem("nashyak-preview-audience-v1"))}catch{return false}return d?.stage==="final"&&d?.finalStage==="question"}
function finalPrice(){const el=document.getElementById("finalCurrentValue");return Number(el?.textContent)||0}
function renderFinalWinner(){const message=document.getElementById("finalWinnerMessage"),correct=document.getElementById("finalCorrect"),wrong=document.getElementById("finalWrong");if(!message)return;const active=finalActive();message.textContent=winner&&active?"🏆 Першим натиснув: "+winner.name:active?"Очікуємо натискання гравця…":"Фінальне запитання не активне";if(correct)correct.disabled=!(winner&&active);if(wrong)wrong.disabled=!(winner&&active)}
window.addEventListener("nashyak-final-render",renderFinalWinner);
document.addEventListener("click",async e=>{
 const id=e.target?.id;if(id!=="finalCorrect"&&id!=="finalWrong")return;
 if(!room||!winner||!finalActive()||resetting)return;
 const current=winner;resetting=true;
 try{
  if(id==="finalCorrect"){
   const amount=finalPrice();const btn=document.querySelector('#scoreboard [data-add="'+current.playerIndex+'"]');
   const players=JSON.parse(localStorage.getItem("nashyak-preview-game-v1")||"null");
   const field=document.querySelector('#scoreboard [data-add="'+current.playerIndex+'"]');
   if(!field||!amount)throw Error("Не вдалося визначити гравця або бали");
   window.dispatchEvent(new CustomEvent("nashyak-final-score",{detail:{index:current.playerIndex,points:amount}}));
   await remove(ref(db,"rooms/"+room+"/winner"));winner=null;renderFinalWinner();
  }else{
   await remove(ref(db,"rooms/"+room+"/winner"));winner=null;
   window.dispatchEvent(new CustomEvent("nashyak-final-miss",{detail:{index:current.playerIndex}}));
   last="";renderFinalWinner();
  }
 }catch(err){const m=document.getElementById("finalWinnerMessage");if(m)m.textContent="Помилка: "+(err.code||err.message||err)}
 finally{resetting=false}
});
