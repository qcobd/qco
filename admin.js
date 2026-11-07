import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,doc,getDoc,collection,getDocs,query,where,limit,writeBatch,serverTimestamp,updateDoc,setDoc} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {firebaseConfig,firebaseConfigured} from "./firebase-config.js";
const $=id=>document.getElementById(id),loginCard=$("adminLoginCard"),dashboard=$("adminDashboard"),msg=$("adminMessage");
let auth,db;
if(!firebaseConfigured){msg.textContent="Firebase is not configured. Follow SETUP.md.";$("adminLoginForm").querySelector("button").disabled=true}
else{
 const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);
 async function verifyAdmin(user){const p=await getDoc(doc(db,"users",user.uid));return p.exists()&&p.data().role==="admin"}
 onAuthStateChanged(auth,async user=>{if(!user){loginCard.hidden=false;dashboard.hidden=true;return}try{const approved=await verifyAdmin(user);if(!approved){msg.textContent="This account does not have administrator permission.";await signOut(auth);return}loginCard.hidden=true;dashboard.hidden=false;const status=$("adminDashboardMessage");status.textContent="";try{await loadAdminData();addQuestion()}catch(e){console.error("QCO admin data loading error:",e);status.textContent="Dashboard is open, but some data could not load: "+(e.code||e.message||"Unknown error")+". Please check the latest Firestore Rules.";status.className="message error"}}catch(e){console.error("QCO admin verification error:",e);msg.textContent="Could not verify administrator: "+(e.code||e.message||"Unknown error");}});
 $("adminLoginForm").addEventListener("submit",async e=>{e.preventDefault();const b=e.target.querySelector("button");b.disabled=true;msg.textContent="Verifying account…";try{await signInWithEmailAndPassword(auth,$("adminEmail").value.trim(),$("adminPassword").value)}catch(err){msg.textContent=err.code==="auth/invalid-credential"?"Invalid email or password.":err.message}finally{b.disabled=false}});
 $("adminLogout").addEventListener("click",()=>signOut(auth).then(()=>location.reload()));
 $("addQuestion").addEventListener("click",addQuestion);$("quizForm").addEventListener("submit",saveQuiz);$("downloadStudentsPdf").addEventListener("click",()=>window.print());
}
function addQuestion(){
 const card=document.createElement("fieldset");card.className="question-card";const legend=document.createElement("legend");legend.textContent="Question "+($("questionBuilder").children.length+1);card.append(legend);
 const qLabel=document.createElement("label");qLabel.textContent="Question";const q=document.createElement("textarea");q.rows=2;q.required=true;q.maxLength=500;q.className="q-text";q.placeholder="Write your question";qLabel.append(q);card.append(qLabel);
 const grid=document.createElement("div");grid.className="options-grid";["A","B","C","D"].forEach(letter=>{const l=document.createElement("label");l.textContent="Option "+letter;const input=document.createElement("input");input.required=true;input.maxLength=200;input.className="q-option";input.placeholder="Option "+letter;l.append(input);grid.append(l)});card.append(grid);
 const footer=document.createElement("div");footer.className="question-footer";const l=document.createElement("label");l.textContent="Correct answer";const select=document.createElement("select");select.className="q-correct";["A","B","C","D"].forEach((x,i)=>{const o=document.createElement("option");o.value=i;o.textContent=x;select.append(o)});l.append(select);footer.append(l);
 const remove=document.createElement("button");remove.type="button";remove.className="text-danger";remove.textContent="Remove question";remove.onclick=()=>{card.remove();[...$("questionBuilder").children].forEach((c,i)=>c.querySelector("legend").textContent="Question "+(i+1))};footer.append(remove);card.append(footer);$("questionBuilder").append(card);
}
async function loadAdminData(){
 const [students,quizzes,results,attempts]=await Promise.all([getDocs(query(collection(db,"users"),where("role","==","student"),limit(200))),getDocs(query(collection(db,"quizzes"),limit(200))),getDocs(query(collection(db,"results"),limit(200))),getDocs(query(collection(db,"submissions"),where("status","==","submitted"),limit(200)))]);
 $("adminStudentCount").textContent=students.size;$("adminQuizCount").textContent=quizzes.docs.filter(d=>d.data().published===true).length;$("adminResultCount").textContent=results.size;
 const body=$("studentRows");body.replaceChildren();if(students.empty){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=8;td.textContent="No registered students yet.";tr.append(td);body.append(tr)}
 students.forEach(s=>{const d=s.data(),tr=document.createElement("tr");[s.id,d.name||"Student",d.email||"—",d.mobile||"—",d.school||"—",d.studentClass||"—",d.createdAt?.toDate?.().toLocaleDateString()||"—"].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td)});const action=document.createElement("td"),edit=document.createElement("button");edit.type="button";edit.className="outline-btn";edit.textContent="Edit";edit.onclick=()=>editStudent(s.id,d);action.append(edit);tr.append(action);body.append(tr)}); 
 const resultRows=$("resultRows");resultRows.replaceChildren();if(results.empty){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No published results yet.";tr.append(td);resultRows.append(tr)}results.forEach(x=>{const d=x.data(),tr=document.createElement("tr");[d.uid||"—",d.quizTitle||d.quizId||"Quiz",String(d.score??"—")+"%",String(d.correct??"—"),String(d.total??"—"),d.gradedAt?.toDate?.().toLocaleDateString()||"—"].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td)});resultRows.append(tr)});
 const reviewRoot=$("submissionReview");if(reviewRoot){reviewRoot.replaceChildren();if(attempts.empty)reviewRoot.textContent="No submissions waiting for review.";attempts.forEach(s=>{const d=s.data(),row=document.createElement("div");row.className="quiz-library-row";const info=document.createElement("div"),title=document.createElement("b"),meta=document.createElement("small");title.textContent=d.quizTitle||"Quiz submission";meta.textContent=(d.uid||"Student")+" · "+(d.questionCount||0)+" questions";info.append(title,meta);const grade=document.createElement("button");grade.className="primary-btn";grade.type="button";grade.textContent="Review & publish result";grade.onclick=()=>gradeSubmission(s.id,d,grade);row.append(info,grade);reviewRoot.append(row)})}
 const root=$("quizLibrary");root.replaceChildren();if(quizzes.empty)root.textContent="No quizzes created yet.";
 quizzes.docs.forEach(s=>{const d=s.data(),row=document.createElement("div");row.className="quiz-library-row";const info=document.createElement("div"),title=document.createElement("b"),meta=document.createElement("small");title.textContent=d.title||"Untitled quiz";meta.textContent=(d.questionCount||0)+" questions · "+(d.durationMinutes||"—")+" minutes · "+(d.published?"Published":"Draft");info.append(title,meta);const actions=document.createElement("div");actions.className="quiz-actions";const toggle=document.createElement("button");toggle.className="outline-btn";toggle.textContent=d.published?"Unpublish":"Publish";toggle.onclick=()=>changePublish(s.id,!d.published);const del=document.createElement("button");del.className="text-danger";del.textContent="Delete";del.onclick=()=>deleteQuiz(s.id,d.title||"this quiz");actions.append(toggle,del);row.append(info,actions);root.append(row)});
}
async function saveQuiz(e){
 e.preventDefault();const note=$("quizMessage"),btn=$("saveQuizBtn"),cards=[...$("questionBuilder").children];if(!cards.length){note.textContent="Add at least one question.";note.className="message error";return}
 const questions=[],answers=[];for(const c of cards){const text=c.querySelector(".q-text").value.trim(),options=[...c.querySelectorAll(".q-option")].map(x=>x.value.trim());if(!text||options.some(x=>!x)){note.textContent="Complete every question and all four options.";note.className="message error";return}questions.push({text,options});answers.push(Number(c.querySelector(".q-correct").value))}
 const title=$("quizTitle").value.trim(),duration=Number($("quizDuration").value);if(!title||!Number.isInteger(duration)||duration<1||duration>240){note.textContent="Enter a title and duration from 1 to 240 minutes.";note.className="message error";return}
 btn.disabled=true;note.textContent="Saving quiz…";try{const batch=writeBatch(db),quizRef=doc(collection(db,"quizzes")),keyRef=doc(db,"quizKeys",quizRef.id);batch.set(quizRef,{title,description:$("quizDescription").value.trim(),durationMinutes:duration,questionCount:questions.length,questions,published:$("publishOnCreate").checked,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});batch.set(keyRef,{quizId:quizRef.id,answers,createdAt:serverTimestamp()});await batch.commit();$("quizForm").reset();$("quizDuration").value="20";$("questionBuilder").replaceChildren();addQuestion();note.textContent="Quiz saved successfully.";note.className="message success";await loadAdminData()}catch(err){console.error(err);note.textContent="Could not save quiz: "+err.message;note.className="message error"}finally{btn.disabled=false}
}
async function changePublish(id,published){try{await updateDoc(doc(db,"quizzes",id),{published,updatedAt:serverTimestamp()});await loadAdminData()}catch(e){alert("Could not update quiz: "+e.message)}}
async function deleteQuiz(id,title){if(!confirm('Delete "'+title+'" permanently?'))return;try{const batch=writeBatch(db);batch.delete(doc(db,"quizzes",id));batch.delete(doc(db,"quizKeys",id));await batch.commit();await loadAdminData()}catch(e){alert("Could not delete quiz: "+e.message)}}

async function gradeSubmission(attemptId,data,button){
 if(!confirm("Check this submission and publish its result?"))return;
 button.disabled=true;button.textContent="Checking…";
 try{
  const attemptRef=doc(db,"submissions",attemptId),keyRef=doc(db,"quizKeys",data.quizId),keySnap=await getDoc(keyRef);
  if(!keySnap.exists())throw new Error("Answer key not found.");
  const keys=keySnap.data().answers,answers=data.answers;
  if(!Array.isArray(keys)||!Array.isArray(answers)||keys.length!==answers.length)throw new Error("Submission does not match the answer key.");
  let correct=0;keys.forEach((key,i)=>{if(answers[i]===key)correct++});
  const score=Math.round(correct/keys.length*100),resultRef=doc(db,"results",attemptId);
  await setDoc(resultRef,{uid:data.uid,quizId:data.quizId,quizTitle:data.quizTitle||"QCO Quiz",score,correct,total:keys.length,submittedAt:data.submittedAt||serverTimestamp(),gradedAt:serverTimestamp()});
  await updateDoc(attemptRef,{status:"graded",score,gradedAt:serverTimestamp()});
  alert("Result published: "+score+"% ("+correct+"/"+keys.length+").");await loadAdminData();
 }catch(e){alert("Could not publish result: "+e.message);button.disabled=false;button.textContent="Review & publish result"}
}

async function editStudent(uid,data){
 const name=prompt("Student name:",data.name||"");if(name===null)return;
 const mobile=prompt("Mobile number:",data.mobile||"");if(mobile===null)return;
 const school=prompt("School:",data.school||"");if(school===null)return;
 const studentClass=prompt("Class:",data.studentClass||"");if(studentClass===null)return;
 try{await updateDoc(doc(db,"users",uid),{name:name.trim(),mobile:mobile.trim(),school:school.trim(),studentClass:studentClass.trim(),updatedAt:serverTimestamp()});await loadAdminData();alert("Student profile updated.")}catch(e){alert("Could not update student: "+e.message)}
}
