import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,doc,getDoc,collection,getDocs,query,where,setDoc,updateDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {firebaseConfig,firebaseConfigured} from "./firebase-config.js";
const $=id=>document.getElementById(id);
if(!firebaseConfigured){$("quizList").textContent="Firebase setup is required. See SETUP.md.";$("resultList").textContent="Firebase setup is required.";}
else{
 const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
 $("logoutBtn").addEventListener("click",()=>signOut(auth).then(()=>location.replace("login.html")));
 onAuthStateChanged(auth,async user=>{
  if(!user){location.replace("login.html");return}
  try{
   const profileSnap=await getDoc(doc(db,"users",user.uid));
   if(!profileSnap.exists()||profileSnap.data().role!=="student"){await signOut(auth);location.replace("login.html");return}
   const profile=profileSnap.data(),name=profile.name||user.displayName||"Student";
   $("studentName").textContent=name;$("welcomeName").textContent=name.split(" ")[0];$("profileName").textContent=name;$("profileEmail").textContent=user.email||"—";$("profileId").textContent=user.uid;
   const [quizSnap,resultSnap,submissionSnap]=await Promise.all([
    getDocs(query(collection(db,"quizzes"),where("published","==",true))),
    getDocs(query(collection(db,"results"),where("uid","==",user.uid))),
    getDocs(query(collection(db,"submissions"),where("uid","==",user.uid)))
   ]);
   $("quizCount").textContent=quizSnap.size;$("completedCount").textContent=resultSnap.size;
   let total=0;resultSnap.forEach(r=>total+=Number(r.data().score||0));$("averageScore").textContent=resultSnap.size?Math.round(total/resultSnap.size)+"%":"—";
   const submissions=new Map(submissionSnap.docs.map(s=>[s.data().quizId,{id:s.id,...s.data()}]));
   $("quizList").replaceChildren();
   if(quizSnap.empty){$("quizList").textContent="No published quizzes yet. Check back soon."}
   quizSnap.forEach(q=>{
    const d=q.data(),old=submissions.get(q.id),card=document.createElement("div");card.className="student-quiz-card";
    const info=document.createElement("div"),title=document.createElement("b"),meta=document.createElement("small");
    title.textContent=d.title||"Untitled quiz";meta.textContent=(d.description||"QCO quiz")+" · "+(d.durationMinutes||20)+" min · "+(d.questionCount||d.questions?.length||0)+" questions";info.append(title,meta);
    const btn=document.createElement("button");btn.type="button";btn.className="primary-btn exam-start";
    const status=document.createElement("p");status.className="message muted";
    if(old?.status==="submitted"||old?.status==="graded"){btn.textContent="Submitted";btn.disabled=true;status.textContent=old.status==="graded"?"Result published: "+old.score+"%":"Your answers are submitted. Result is pending."}
    else{btn.textContent=old?.status==="in_progress"?"Continue Exam":"Start Exam";btn.addEventListener("click",()=>beginExam(user.uid,q.id,d,old,btn,status,card))}
    card.append(info,btn,status);$("quizList").append(card);
   });
   $("resultList").replaceChildren();
   if(resultSnap.empty){$("resultList").textContent="Your published results will appear here."}
   resultSnap.forEach(r=>{const d=r.data(),row=document.createElement("div");row.className="list-row";const t=document.createElement("b"),m=document.createElement("small");t.textContent=d.quizTitle||"Quiz";m.textContent="Score: "+(d.score??"—")+"%";row.append(t,m);$("resultList").append(row)});
  }catch(e){console.error(e);$("quizList").textContent="Could not load dashboard data. "+(e.code||e.message||"Check Firestore rules.");}
 });
}
async function beginExam(uid,quizId,quiz,existing,button,status,card){
 button.disabled=true;status.textContent="Preparing your exam…";
 try{
  const submissionRef=doc(dbGlobal(),"submissions",uid+"_"+quizId);
  let submission=existing;
  if(!submission){
   await setDoc(submissionRef,{uid,quizId,quizTitle:quiz.title||"QCO Quiz",status:"in_progress",answers:[],startedAt:serverTimestamp(),durationMinutes:Math.max(1,Number(quiz.durationMinutes)||20),questionCount:quiz.questions.length});
   const snap=await getDoc(submissionRef);submission={id:snap.id,...snap.data(),startedAt:snap.data().startedAt.toMillis()};
  }else if(submission.startedAt?.toMillis){submission.startedAt=submission.startedAt.toMillis()}
  renderExam(submission,quiz,card);
 }catch(e){status.textContent=e.message||"Could not start exam.";button.disabled=false;}
}
function dbGlobal(){return getFirestore(getAuth().app)}
function renderExam(submission,quiz,card){
 card.replaceChildren();
 const heading=document.createElement("h3");heading.textContent=quiz.title||"QCO Quiz";
 const timer=document.createElement("p");timer.className="exam-timer";timer.setAttribute("aria-live","polite");
 const form=document.createElement("form");form.className="exam-form";
 const answers=[];
 (Array.isArray(quiz.questions)?quiz.questions:[]).forEach((item,index)=>{
  const field=document.createElement("fieldset");field.className="exam-question";
  const legend=document.createElement("legend");legend.textContent=(index+1)+". "+(item.text||"Question");field.append(legend);
  const group="q_"+index;
  (Array.isArray(item.options)?item.options:[]).forEach((option,optIndex)=>{
   const label=document.createElement("label");label.className="exam-option";
   const radio=document.createElement("input");radio.type="radio";radio.name=group;radio.value=String(optIndex);
   label.append(radio,document.createTextNode(" "+String.fromCharCode(65+optIndex)+". "+option));field.append(label);
  });
  form.append(field);answers.push(()=>{const selected=form.querySelector('input[name="'+group+'"]:checked');return selected?Number(selected.value):-1});
 });
 const submit=document.createElement("button");submit.type="submit";submit.className="primary-btn";submit.textContent="Submit Exam";form.append(submit);
 const note=document.createElement("p");note.className="message";
 card.append(heading,timer,form,note);
 const deadline=submission.startedAt+submission.durationMinutes*60000;let finished=false,saving=false;
 async function sendAnswers(auto=false){
  if(saving||finished)return;
  const selected=answers.map(get=>get());
  if(!auto&&selected.some(a=>a<0)){note.textContent="Please answer every question before submitting.";return}
  if(!auto&&!confirm("Submit your answers now? You cannot retake this quiz."))return;
  saving=true;finished=true;clearInterval(interval);submit.disabled=true;note.textContent=auto?"Time is over. Submitting your answers…":"Submitting your answers…";
  try{
   await updateDoc(doc(dbGlobal(),"submissions",submission.id),{answers:selected,status:"submitted",submittedAt:serverTimestamp()});
   form.remove();timer.remove();note.className="message success";note.textContent="Your exam has been submitted. The QCO admin will review your answers and publish your result.";
  }catch(err){saving=false;finished=false;submit.disabled=false;note.className="message error";note.textContent=err.message||"Submission failed. Please contact QCO administration."}
 }
 const interval=setInterval(()=>{const left=Math.max(0,deadline-Date.now()),mins=Math.floor(left/60000),secs=Math.floor((left%60000)/1000);timer.textContent="Time remaining: "+String(mins).padStart(2,"0")+":"+String(secs).padStart(2,"0");if(left<=0&&!finished)sendAnswers(true)},1000);
 const initialLeft=Math.max(0,deadline-Date.now());timer.textContent="Time remaining: "+String(Math.floor(initialLeft/60000)).padStart(2,"0")+":"+String(Math.floor((initialLeft%60000)/1000)).padStart(2,"0");if(initialLeft===0)sendAnswers(true);
 form.addEventListener("submit",async e=>{e.preventDefault();await sendAnswers(false)});
}
