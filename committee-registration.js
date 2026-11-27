import {initializeApp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import {getFirestore,doc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";
import {firebaseConfig,firebaseConfigured} from "./firebase-config.js";
const form=document.getElementById("committeeForm"),status=document.getElementById("applicationStatus"),button=document.getElementById("submitApplication"),photoInput=document.getElementById("applicantPhoto"),photoPreview=document.getElementById("photoPreview");\nlet photoData="";\nphotoInput.addEventListener("change",async()=>{const file=photoInput.files?.[0];photoData="";photoPreview.hidden=true;if(!file)return;if(!file.type.startsWith("image/")){show("শুধু ছবির ফাইল নির্বাচন করুন।");photoInput.value="";return}if(file.size>5*1024*1024){show("ছবির আকার 5 MB-এর কম হতে হবে।");photoInput.value="";return}try{photoData=await compressPhoto(file);photoPreview.src=photoData;photoPreview.hidden=false;show("ছবি যুক্ত হয়েছে।","success")}catch(e){console.error(e);show("ছবিটি প্রস্তুত করা যায়নি। অন্য ছবি চেষ্টা করুন।");photoInput.value="";photoData=""}});\nfunction compressPhoto(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const scale=Math.min(1,600/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);let quality=.76;let out=canvas.toDataURL("image/jpeg",quality);while(out.length>520000&&quality>.35){quality-=.08;out=canvas.toDataURL("image/jpeg",quality)}if(out.length>520000){reject(new Error("Image too large after compression"));return}resolve(out)};img.src=reader.result};reader.readAsDataURL(file)})}
function show(message,type="error"){status.textContent=message;status.className="committee-status "+type}
if(!firebaseConfigured){show("QCO Firebase configuration পাওয়া যায়নি।");button.disabled=true}
else{
 const app=initializeApp(firebaseConfig),db=getFirestore(app);
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const data={fullName:document.getElementById("fullName").value.trim(),email:document.getElementById("email").value.trim().toLowerCase(),mobile:document.getElementById("mobile").value.trim(),school:document.getElementById("school").value.trim(),studentClass:document.getElementById("studentClass").value.trim(),preferredDepartment:document.getElementById("department").value,experience:document.getElementById("experience").value.trim(),motivation:document.getElementById("motivation").value.trim(),...(photoData?{photoData}:{}),status:"pending",createdAt:serverTimestamp()};
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