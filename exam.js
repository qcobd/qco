import {initializeApp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,updateDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";
import {firebaseConfig,firebaseConfigured} from "./firebase-config.js";
const $=id=>document.getElementById(id),quizId=new URLSearchParams(location.search).get("id");
if(!firebaseConfigured||!quizId){$("examStatus").textContent="Invalid or unavailable examination link.";$("examStatus").className="message error"}
else{
 const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
 onAuthStateChanged(auth,async user=>{
  if(!user){$("examStatus").textContent="Sign in with your QCO student account to take this exam. ";const a=document.createElement("a");a.href="login.html";a.textContent="Student Login";$("examStatus").append(a);return}
  try{
   const profile=await getDoc(doc(db,"users",user.uid));if(!profile.exists()||profile.data().role!=="student"){await signOut(auth);$("examStatus").textContent="Only registered QCO students can take this exam.";return}
   const snap=await getDoc(doc(db,"quizzes",quizId));if(!snap.exists()||snap.data().published!==true){$("examStatus").textContent="This examination is not available.";return}
   renderExam(db,user,quizId,snap.data());
  }catch(e){console.error(e);$("examStatus").textContent="Could not load exam: "+(e.code||e.message);$("examStatus").className="message error"}
 });
}
function renderExam(db,user,id,quiz){
 const questions=Array.isArray(quiz.questions)?quiz.questions:[];if(!questions.length){$("examStatus").textContent="No questions are available.";return}
 $("examTitle").textContent=quiz.title||"QCO Examination";$("examDescription").textContent=quiz.description||"Read each question carefully and submit before time ends.";
 $("examMeta").textContent=questions.length+" questions · "+(quiz.totalMarks||questions.length)+" marks · "+quiz.durationMinutes+" minutes";
 const root=$("examContent"),ref=doc(db,"submissions",user.uid+"_"+id);root.replaceChildren();
 const start=document.createElement("button");start.type="button";start.className="primary-btn";start.textContent="Start Examination";root.append(start);
 start.onclick=async()=>{
  start.disabled=true;
  try{
   const old=await getDoc(ref);if(old.exists()&&old.data().status!=="in_progress"){$("examStatus").textContent="You have already submitted this examination.";return}
   const duration=Math.max(1,Math.min(240,Number(quiz.durationMinutes)||20)),started=old.exists()?old.data().startedAt:Date.now();
   if(!old.exists())await setDoc(ref,{uid:user.uid,quizId:id,quizTitle:quiz.title||"QCO Exam",status:"in_progress",startedAt:started,durationMinutes:duration,questionCount:questions.length,createdAt:serverTimestamp()});
   showExam(root,ref,user.uid,id,questions,duration,started);
  }catch(e){$("examStatus").textContent="Could not start: "+e.message;start.disabled=false}
 };
}
function showExam(root,ref,uid,id,questions,duration,started){
 root.replaceChildren();const timer=document.createElement("p");timer.className="exam-timer";const form=document.createElement("form");form.className="exam-form";const getters=[];
 const key="qco_exam_"+uid+"_"+id;let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||"[]")}catch{}
 questions.forEach((q,i)=>{
  const field=document.createElement("fieldset");field.className="exam-question";const legend=document.createElement("legend");legend.textContent=(i+1)+". "+q.text;field.append(legend);
  (Array.isArray(q.options)?q.options:[]).forEach((opt,j)=>{const label=document.createElement("label");label.className="exam-option";const radio=document.createElement("input");radio.type="radio";radio.name="question_"+i;radio.value=String(j);if(saved[i]===j)radio.checked=true;radio.onchange=()=>{const vals=getters.map(fn=>fn());vals[i]=j;try{localStorage.setItem(key,JSON.stringify(vals))}catch{}};label.append(radio,document.createTextNode(" "+String.fromCharCode(65+j)+". "+opt));field.append(label)});
  form.append(field);getters.push(()=>{const x=form.querySelector('input[name="question_'+i+'"]:checked');return x?Number(x.value):-1});
 });
 const submit=document.createElement("button");submit.type="submit";submit.className="primary-btn";submit.textContent="Submit Examination";form.append(submit);const note=document.createElement("p");note.className="message";root.append(timer,form,note);
 const deadline=started+duration*60000;let busy=false,done=false;
 async function send(auto=false){
  if(busy||done)return;if(!auto&&getters.some(fn=>fn()<0)){note.textContent="Please answer every question before submitting.";return}
  if(!auto&&!confirm("Submit your answers? You cannot take this exam again."))return;
  busy=true;submit.disabled=true;note.textContent=auto?"Time is over. Submitting…":"Submitting…";
  try{await updateDoc(ref,{answers:getters.map(fn=>fn()),status:"submitted",submittedAt:serverTimestamp(),submittedClientAt:Date.now()});try{localStorage.removeItem(key)}catch{}done=true;clearInterval(timerId);form.remove();timer.remove();note.className="message success";note.textContent="Your exam has been submitted. Results will be published after QCO review."}
  catch(e){busy=false;submit.disabled=false;note.className="message error";note.textContent="Submission failed: "+e.message}
 }
 const tick=()=>{const left=Math.max(0,deadline-Date.now()),m=Math.floor(left/60000),s=Math.floor(left%60000/1000);timer.textContent="Time remaining: "+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");if(left===0)send(true)};
 const timerId=setInterval(tick,1000);tick();form.onsubmit=e=>{e.preventDefault();send(false)};
}