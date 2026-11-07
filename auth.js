import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";
const message=document.getElementById("authMessage");
const loginForm=document.getElementById("loginForm"),registerForm=document.getElementById("registerForm");
const loginTab=document.getElementById("loginTab"),registerTab=document.getElementById("registerTab");
function showMessage(text,error=true){message.textContent=text;message.className="message "+(error?"error":"success")}
function switchTab(which){const isLogin=which==="login";loginForm.hidden=!isLogin;registerForm.hidden=isLogin;loginTab.classList.toggle("active",isLogin);registerTab.classList.toggle("active",!isLogin);message.textContent=""}
loginTab.addEventListener("click",()=>switchTab("login"));registerTab.addEventListener("click",()=>switchTab("register"));
if(!firebaseConfigured){showMessage("Firebase is not configured yet. Complete the setup in SETUP.md.");loginForm.querySelector("button").disabled=true;registerForm.querySelector("button").disabled=true}
else{
 const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
 onAuthStateChanged(auth,user=>{if(user)location.replace("student.html")});
 loginForm.addEventListener("submit",async e=>{e.preventDefault();const btn=loginForm.querySelector("button");btn.disabled=true;showMessage("Signing in…",false);try{await signInWithEmailAndPassword(auth,loginForm.loginEmail.value.trim(),loginForm.loginPassword.value)}catch(err){showMessage(err.code==="auth/invalid-credential"?"Email or password is incorrect.":err.message)}finally{btn.disabled=false}});
 registerForm.addEventListener("submit",async e=>{e.preventDefault();const name=document.getElementById("regName").value.trim(),email=document.getElementById("regEmail").value.trim(),password=document.getElementById("regPassword").value,confirm=document.getElementById("regConfirm").value; if(password!==confirm)return showMessage("Passwords do not match.");if(password.length<8)return showMessage("Use a password with at least 8 characters.");const btn=registerForm.querySelector("button");btn.disabled=true;showMessage("Creating your student account…",false);try{const cred=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(cred.user,{displayName:name});await setDoc(doc(db,"users",cred.user.uid),{uid:cred.user.uid,name,email,role:"student",createdAt:serverTimestamp()});location.replace("student.html")}catch(err){showMessage(err.code==="auth/email-already-in-use"?"This email is already registered.":err.message);btn.disabled=false}});
}