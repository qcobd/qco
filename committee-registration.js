import {initializeApp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js";
import {getFirestore,collection,addDoc,serverTimestamp,query,where,getDocs,limit} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";
import {firebaseConfig,firebaseConfigured} from "./firebase-config.js";
const form=document.getElementById("committeeForm"),status=document.getElementById("applicationStatus"),button=document.getElementById("submitApplication");
function show(message,type="error"){status.textContent=message;status.className="committee-status "+type}
if(!firebaseConfigured){show("QCO Firebase configuration পাওয়া যায়নি।");button.disabled=true}
else{
 const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
 onAuthStateChanged(auth,async user=>{
  if(!user){location.replace("login.html?next=committee-registration.html");return}
  document.getElementById("email").value=user.email||"";
  try{
   const snap=await getDocs(query(collection(db,"users"),where("uid","==",user.uid),limit(1)));
   if(!snap.empty){const d=snap.docs[0].data();document.getElementById("fullName").value=d.name||user.displayName||"";document.getElementById("mobile").value=d.mobile||"";document.getElementById("school").value=d.school||"";document.getElementById("studentClass").value=d.studentClass||""}
   const existing=await getDocs(query(collection(db,"committeeApplications"),where("uid","==",user.uid),limit(1)));
   if(!existing.empty){form.querySelectorAll("input,select,textarea,button").forEach(x=>x.disabled=true);show("আপনার একটি আবেদন ইতোমধ্যে জমা আছে। Admin Panel থেকে সেটি পর্যালোচনা করা হবে।","success")}
  }catch(e){console.error(e);show("আপনার প্রোফাইল তথ্য লোড করা যায়নি। প্রয়োজনীয় তথ্য নিজে পূরণ করুন।")}
 });
 form.addEventListener("submit",async e=>{
  e.preventDefault();const user=auth.currentUser;if(!user){show("আবেদন করতে আগে লগইন করুন।");return}
  const data={uid:user.uid,fullName:document.getElementById("fullName").value.trim(),email:user.email||"",mobile:document.getElementById("mobile").value.trim(),school:document.getElementById("school").value.trim(),studentClass:document.getElementById("studentClass").value.trim(),preferredDepartment:document.getElementById("department").value,experience:document.getElementById("experience").value.trim(),motivation:document.getElementById("motivation").value.trim(),status:"pending",createdAt:serverTimestamp()};
  if(data.fullName.length<2||!data.mobile||!data.school||!data.studentClass||!data.preferredDepartment||data.motivation.length<10){show("সব প্রয়োজনীয় তথ্য পূরণ করুন। কারণ/আগ্রহের বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।");return}
  button.disabled=true;show("আবেদন জমা হচ্ছে…","success");
  try{
   const old=await getDocs(query(collection(db,"committeeApplications"),where("uid","==",user.uid),limit(1)));
   if(!old.empty)throw new Error("আপনার আবেদন ইতোমধ্যে জমা আছে।");
   await addDoc(collection(db,"committeeApplications"),data);
   form.querySelectorAll("input,select,textarea,button").forEach(x=>x.disabled=true);show("আপনার আবেদন সফলভাবে জমা হয়েছে। QCO কর্তৃপক্ষ পর্যালোচনা করবে।","success");
  }catch(err){console.error(err);show("আবেদন জমা হয়নি: "+(err.message||"আবার চেষ্টা করুন।"));button.disabled=false}
 });
}