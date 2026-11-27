import {initializeApp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import {getFirestore,doc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";
import {firebaseConfig,firebaseConfigured} from "./firebase-config.js";

const form=document.getElementById("committeeForm");
const status=document.getElementById("applicationStatus");
const button=document.getElementById("submitApplication");
const confirmation=document.getElementById("applicationConfirmation");

function show(message,type="error"){
  status.textContent=message;
  status.className="committee-status "+type;
}

if(!firebaseConfigured){
  show("QCO Firebase configuration পাওয়া যায়নি।");
  button.disabled=true;
}else{
  const app=initializeApp(firebaseConfig);
  const db=getFirestore(app);

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const data={
      fullName:document.getElementById("fullName").value.trim(),
      email:document.getElementById("email").value.trim().toLowerCase(),
      mobile:document.getElementById("mobile").value.trim(),
      school:document.getElementById("school").value.trim(),
      studentClass:document.getElementById("studentClass").value.trim(),
      preferredDepartment:document.getElementById("department").value,
      experience:document.getElementById("experience").value.trim(),
      motivation:document.getElementById("motivation").value.trim(),
      status:"pending",
      createdAt:serverTimestamp()
    };

    if(data.fullName.length<2||!data.email||!data.mobile||data.school.length<2||!data.studentClass||!data.preferredDepartment||data.motivation.length<10){
      show("সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন। আগ্রহ/কারণের বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।");
      return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)){
      show("সঠিক ইমেইল ঠিকানা লিখুন।");
      return;
    }

    button.disabled=true;
    show("আপনার আবেদন জমা হচ্ছে…","success");

    try{
      const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(data.email));
      const applicationId=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
      await setDoc(doc(db,"committeeApplications",applicationId),data);

      form.hidden=true;
      status.hidden=true;
      confirmation.hidden=false;
      confirmation.scrollIntoView({behavior:"smooth",block:"center"});
    }catch(error){
      console.error("QCO committee registration error:",error);
      if(error.code==="permission-denied"){
        show("আবেদন জমা হয়নি। Firebase Firestore Rules আপডেট ও Publish হয়েছে কি না দেখুন। একই ইমেইল দিয়ে আগে আবেদন করা থাকলেও এই সমস্যা হতে পারে।");
      }else if(error.code==="unavailable"){
        show("সার্ভারে সংযোগ পাওয়া যাচ্ছে না। ইন্টারনেট পরীক্ষা করে আবার চেষ্টা করুন।");
      }else{
        show("আবেদন জমা হয়নি: "+(error.message||"অনুগ্রহ করে আবার চেষ্টা করুন।"));
      }
      button.disabled=false;
    }
  });
}