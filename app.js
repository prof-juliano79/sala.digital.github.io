import {initializeApp,deleteApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,createUserWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,collection,addDoc,getDocs,query,where,deleteDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
const fb=initializeApp(firebaseConfig),auth=getAuth(fb),db=getFirestore(fb);
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let profile=null,classes=[],selected="",page="home",contents=[],activities=[],students=[];
function message(s){$("message").textContent=s}
async function readAll(){if(!profile)return;
 let docs=[];
 if(profile.role==="professor"){
   const snap=await getDocs(query(collection(db,"classes"),where("teacherId","==",auth.currentUser.uid)));
   docs=snap.docs;
 }else{
   const snapshots=await Promise.all((profile.classIds||[]).map(id=>getDoc(doc(db,"classes",id))));
   docs=snapshots.filter(s=>s.exists());
 }
 classes=docs.map(d=>({id:d.id,...d.data()}));
 if(!classes.some(c=>c.id===selected))selected=classes[0]?.id||"";
 await readClass();
}
async function readClass(){
 contents=[];activities=[];
 if(selected){
  const [a,b]=await Promise.all(["contents","activities"].map(type=>getDocs(collection(db,"classes",selected,type))));
  contents=a.docs.map(d=>({id:d.id,...d.data()}));activities=b.docs.map(d=>({id:d.id,...d.data()}));
 }
 render();
}
function cardList(items,type){
 return items.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map((x,i)=>`<article class="tile"><div class="date">${type} ${i+1} · ${esc(x.date||"Sem data")}</div><h3>${esc(x.title)}</h3><p class="pre">${esc(x.body)}</p>${profile.role==="professor"?`<button class="danger" data-delete="${type==='Conteúdo'?'contents':'activities'}" data-id="${esc(x.id)}">Excluir</button>`:""}</article>`).join("")||'<p>Nenhuma publicação nesta turma.</p>';
}
function render(){
 $("greeting").textContent=`Olá, ${profile.name||auth.currentUser.email}`;
 $("subtitle").textContent=profile.role==="professor"?"Painel do professor":"Área do aluno";
 const tabs=[["home","Início"],["contents","Conteúdos publicados"],["activities","Atividades"],...(profile.role==="professor"?[["students","Cadastrar alunos"]]:[])];
 $("nav").innerHTML=tabs.map(([key,label])=>`<button data-page="${key}" class="${page===key?"active":""}">${label}</button>`).join("");
 let h=`<section class="card"><label>Turma<select id="classSelect">${classes.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?"selected":""}>${esc(c.name)} — ${esc(c.subject)}</option>`).join("")}</select></label></section>`;
 if(page==="home"){
 h+=`<div class="grid"><section class="card"><h2>Conteúdos</h2><p>${contents.length} publicação(ões)</p><button data-page="contents">Ver conteúdos</button></section><section class="card"><h2>Atividades</h2><p>${activities.length} publicação(ões)</p><button data-page="activities">Ver atividades</button></section></div>`;
 if(profile.role==="professor")h+=`<section class="card"><h2>Cadastrar turma</h2><form id="classForm"><label>Turma<input name="name" required></label><label>Disciplina<input name="subject" required></label><button>Cadastrar turma</button></form></section>`;
 }else if(page==="contents"||page==="activities"){
 const isContent=page==="contents";
 h+=`<section class="card"><h2>${isContent?"Conteúdos publicados":"Atividades para consulta"}</h2><p class="muted">Materiais organizados por data, disponíveis aos alunos matriculados.</p></section>`;
 h+=cardList(isContent?contents:activities,isContent?"Conteúdo":"Atividade");
 if(profile.role==="professor"&&selected)h+=`<section class="card"><h2>Publicar ${isContent?"conteúdo":"atividade"}</h2><form id="publishForm"><label>Título<input name="title" required maxlength="180"></label><label>Data<input type="date" name="date" required></label><label>Texto e orientações<textarea name="body" required maxlength="15000"></textarea></label><button>Publicar</button></form></section>`;
 }else if(page==="students"&&profile.role==="professor"){
 h+=`<section class="card"><h2>Cadastrar aluno</h2><p class="muted">Crie uma conta de teste com e-mail e senha individual. O aluno poderá acessar somente as turmas selecionadas.</p><form id="studentForm"><label>Nome<input name="name" required></label><label>E-mail<input type="email" name="email" required></label><label>Senha provisória (mínimo 8 caracteres)<input name="password" type="password" minlength="8" required></label><label>Turmas<select name="classIds" required>${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.subject)}</option>`).join("")}</select></label><button>Criar conta</button></form></section>`;
 }
 $("view").innerHTML=h;
}
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);$("password").value="";message("")}catch(err){message("Não foi possível entrar. Verifique e-mail, senha e cadastro autorizado.")}});
$("logout").addEventListener("click",()=>signOut(auth));
onAuthStateChanged(auth,async u=>{
 profile=null;classes=[];selected="";page="home";$("app").hidden=true;$("userbar").hidden=true;$("login").hidden=!!u;
 if(!u){message("");return}
 try{
  const snap=await getDoc(doc(db,"users",u.uid));
  if(!snap.exists()||!["professor","aluno"].includes(snap.data().role)){message("Conta autenticada, mas ainda não autorizada. Cadastre o perfil em Firestore.");await signOut(auth);return}
  profile=snap.data();$("login").hidden=true;$("app").hidden=false;$("userbar").hidden=false;$("username").textContent=profile.name;
  await readAll();message("");
 }catch(err){message("Erro ao carregar dados. Confira as regras do Firestore: "+err.code);await signOut(auth)}
});
document.addEventListener("click",async e=>{
 const b=e.target.closest("button");if(!b||!profile)return;
 if(b.dataset.page){page=b.dataset.page;render();return}
 if(b.dataset.delete&&profile.role==="professor"&&selected&&confirm("Excluir esta publicação?")){
  try{await deleteDoc(doc(db,"classes",selected,b.dataset.delete,b.dataset.id));await readClass();message("Publicação excluída.")}catch(err){message("Erro ao excluir: "+err.code)}
 }
});
document.addEventListener("change",async e=>{if(e.target.id==="classSelect"){selected=e.target.value;try{await readClass()}catch(err){message("Erro ao abrir turma: "+err.code)}}});
document.addEventListener("submit",async e=>{
 const f=e.target;if(!["classForm","publishForm","studentForm"].includes(f.id))return;
 e.preventDefault();if(profile?.role!=="professor")return;
 const data=new FormData(f),button=f.querySelector("button");button.disabled=true;
 try{
  if(f.id==="classForm"){
   await addDoc(collection(db,"classes"),{name:data.get("name").trim(),subject:data.get("subject").trim(),teacherId:auth.currentUser.uid,createdAt:serverTimestamp()});
   await readAll();message("Turma cadastrada.");
  }else if(f.id==="publishForm"){
   await addDoc(collection(db,"classes",selected,page),{title:data.get("title").trim(),body:data.get("body").trim(),date:data.get("date"),createdAt:serverTimestamp()});
   await readClass();message("Publicação salva para os alunos matriculados.");
  }else if(f.id==="studentForm"){
   const email=data.get("email").trim(),password=data.get("password"),name=data.get("name").trim(),classIds=data.getAll("classIds");
   if(!classIds.length)throw Error("Selecione uma turma.");
   // Secondary Firebase instance avoids signing out the professor.
   const secondary=initializeApp(firebaseConfig,"register-"+Date.now());
   try{
    const secondaryAuth=getAuth(secondary);
    const cred=await createUserWithEmailAndPassword(secondaryAuth,email,password);
    await setDoc(doc(db,"users",cred.user.uid),{name,email,role:"aluno",teacherId:auth.currentUser.uid,classIds});
    await signOut(secondaryAuth);
   }finally{await deleteApp(secondary)}
   f.reset();message("Aluno cadastrado. Compartilhe a senha de forma privada.");
  }
 }catch(err){message("Não foi possível concluir: "+(err.code||err.message))}
 finally{button.disabled=false}
});
