import {collection,doc,writeBatch,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
export function initExamCodeStudio(db,auth,onPublished){
 const editor=$("examHtmlCode"),previewBtn=$("previewExamCode"),publishBtn=$("publishExamCode"),status=$("examCodeStatus"),preview=$("examCodePreview");
 if(!editor||!previewBtn||!publishBtn||!status||!preview)return;
 let parsed=null;
 previewBtn.addEventListener("click",()=>{
  parsed=null;publishBtn.disabled=true;preview.hidden=true;preview.replaceChildren();
  try{parsed=parseExamHtml(editor.value);renderPreview(preview,parsed);preview.hidden=false;publishBtn.disabled=false;status.textContent="Valid: "+parsed.questions.length+" questions, "+parsed.totalMarks+" marks.";status.className="message success"}
  catch(e){status.textContent=e.message;status.className="message error"}
 });
 editor.addEventListener("input",()=>{parsed=null;publishBtn.disabled=true;preview.hidden=true;status.textContent="Code changed. Validate it again.";status.className="message"});
 publishBtn.addEventListener("click",async()=>{
  if(!parsed||!auth.currentUser){status.textContent="Validate the HTML and sign in again.";status.className="message error";return}
  publishBtn.disabled=true;previewBtn.disabled=true;status.textContent="Publishing examination…";
  try{
   const batch=writeBatch(db),quizRef=doc(collection(db,"quizzes")),keyRef=doc(db,"quizKeys",quizRef.id);
   batch.set(quizRef,{title:parsed.title,description:parsed.description,durationMinutes:parsed.durationMinutes,totalMarks:parsed.totalMarks,questionCount:parsed.questions.length,questions:parsed.questions,published:true,source:"admin-html",createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});
   batch.set(keyRef,{quizId:quizRef.id,answers:parsed.answers,marks:parsed.marks,totalMarks:parsed.totalMarks,createdAt:serverTimestamp()});
   await batch.commit();
   const url=new URL("exam.html?id="+encodeURIComponent(quizRef.id),location.href).toString();
   status.replaceChildren(document.createTextNode("Published. Exam link: "));
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";a.textContent=url;status.append(a);
   const copy=document.createElement("button");copy.type="button";copy.className="outline-btn";copy.textContent="Copy link";copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);copy.textContent="Copied"}catch{copy.textContent="Copy unavailable"}};status.append(document.createTextNode(" "),copy);status.className="message success";
   editor.value="";parsed=null;preview.hidden=true;preview.replaceChildren();await onPublished();
  }catch(e){console.error(e);status.textContent="Publish failed: "+(e.message||"Unknown error");status.className="message error";publishBtn.disabled=false}
  finally{previewBtn.disabled=false}
 });
}
function parseExamHtml(source){
 if(!source.trim())throw new Error("Paste your HTML exam code first.");
 if(source.length>500000)throw new Error("Maximum HTML size is 500 KB.");
 const parsed=new DOMParser().parseFromString(source,"text/html"),root=parsed.querySelector("[data-qco-exam]");
 if(!root)throw new Error('Add a root element with the "data-qco-exam" attribute.');
 const title=(root.getAttribute("data-title")||"").trim(),description=(root.getAttribute("data-description")||"").trim();
 const durationMinutes=Number(root.getAttribute("data-duration")),declared=Number(root.getAttribute("data-total-marks"));
 if(!title||title.length>120)throw new Error("Set data-title (maximum 120 characters).");
 if(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>240)throw new Error("data-duration must be 1–240 whole minutes.");
 if(!Number.isFinite(declared)||declared<=0||declared>10000)throw new Error("Set valid data-total-marks.");
 if(description.length>1000)throw new Error("Description maximum is 1,000 characters.");
 const cards=[...root.querySelectorAll("[data-question]")];if(!cards.length||cards.length>200)throw new Error("Add 1–200 data-question elements.");
 const questions=[],answers=[],marks=[];
 cards.forEach((card,i)=>{
  const text=(card.querySelector("[data-question-text],h1,h2,h3,h4,p")?.textContent||card.getAttribute("data-text")||"").trim();
  const options=[...card.querySelectorAll("[data-option]")].map(el=>el.textContent.trim());
  const raw=(card.getAttribute("data-correct")||"").trim().toUpperCase(),answer=/^[A-D]$/.test(raw)?raw.charCodeAt(0)-65:Number(raw),mark=Number(card.getAttribute("data-marks")||1);
  if(!text||text.length>2000)throw new Error("Question "+(i+1)+" needs question text.");
  if(options.length!==4||options.some(x=>!x||x.length>500))throw new Error("Question "+(i+1)+" needs exactly four non-empty options.");
  if(!Number.isInteger(answer)||answer<0||answer>3)throw new Error("Question "+(i+1)+" needs data-correct 0–3 or A–D.");
  if(!Number.isFinite(mark)||mark<=0||mark>1000)throw new Error("Question "+(i+1)+" has invalid data-marks.");
  questions.push({text,options,marks:mark});answers.push(answer);marks.push(mark);
 });
 const totalMarks=marks.reduce((a,b)=>a+b,0);if(totalMarks!==declared)throw new Error("Question marks total "+totalMarks+" but data-total-marks says "+declared+".");
 return {title,description,durationMinutes,totalMarks,questions,answers,marks};
}
function renderPreview(root,exam){
 root.replaceChildren();const h=document.createElement("h3");h.textContent=exam.title;const meta=document.createElement("p");meta.textContent=exam.description+" · "+exam.durationMinutes+" min · "+exam.totalMarks+" marks · "+exam.questions.length+" questions";root.append(h,meta);
 exam.questions.forEach((q,i)=>{const row=document.createElement("div");row.className="exam-code-preview-item";const b=document.createElement("b");b.textContent=(i+1)+". "+q.text;const p=document.createElement("p");p.textContent=q.options.map((o,n)=>String.fromCharCode(65+n)+". "+o).join(" | ")+" · "+q.marks+" mark(s)";row.append(b,p);root.append(row)});
}