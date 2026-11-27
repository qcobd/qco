import {initializeApp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import {getFirestore,doc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";
import {firebaseConfig,firebaseConfigured} from "./firebase-config.js";
const form=document.getElementById("committeeForm"),status=document.getElementById("applicationStatus"),button=document.getElementById("submitApplication");
function show(message,type="error"){status.textContent=message;status.className="committee-status "+type}
if(!firebaseConfigured){show("QCO Firebase configuration পাওয়া যায়নি।");button.disabled=true}
else{
 const app=initializeApp(firebaseConfig),db=getFirestore(app);
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const data={fullName:document.getElementById("fullName").value.trim(),email:document.getElementById("email").value.trim().toLowerCase(),mobile:document.getElementById("mobile").value.trim(),school:document.getElementById("school").value.trim(),studentClass:document.getElementById("studentClass").value.trim(),preferredDepartment:document.getElementById("department").value,experience:document.getElementById("experience").value.trim(),motivation:document.getElementById("motivation").value.trim(),status:"pending",createdAt:serverTimestamp()};
  if(data.fullName.length<2||!data.email||!data.mobile||!data.school||!data.studentClass||!data.preferredDepartment||data.motivation.length<10){show("সব প্রয়োজনীয় তথ্য পূরণ করুন। কারণ/আগ্রহের বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।");return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)){show("সঠিক ইমেইল ঠিকানা লিখুন।");return}
  button.disabled=true;show("আবেদন জমা হচ্ছে…","success");
  try{
   const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(data.email));
   const id=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
   await setDoc(doc(db,"committeeApplications",id),data);
   form.querySelectorAll("input,select,textarea,button").forEach(x=>x.disabled=true);
   show("আপনার আবেদন সফলভাবে জমা হয়েছে। QCO কর্তৃপক্ষ পর্যালোচনা করবে।","success");
  }catch(err){
   console.error(err);
   show(err.code==="permission-denied"?"এই ইমেইল থেকে আগে আবেদন জমা হয়েছে অথবা Firebase Rules এখনো Publish করা হয়নি।":"আবেদন জমা হয়নি: "+(err.message||"আবার চেষ্টা করুন।"));
   button.disabled=false;
  }
 });
}