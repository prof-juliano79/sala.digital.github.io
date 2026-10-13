import {initializeApp,deleteApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,createUserWithEmailAndPassword} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,addDoc,getDocs,query,where,deleteDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {getStorage,ref,uploadBytes,getDownloadURL,deleteObject} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';
import {firebaseConfig} from './firebase-config.js';
const fb=initializeApp(firebaseConfig),auth=getAuth(fb),db=getFirestore(fb),storage=getStorage(fb);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validKinds=['contents','activities','notices'];
let profile=null,classes=[],selected='',page='home',posts={contents:[],activities:[],notices:[]},comments={};
function message(s){$('message').textContent=s}
function teacher(){return profile?.role==='professor'}
function displayDate(s){return s||'Sem data'}
function sorted(a){return [...a].sort((x,y)=>(y.date||'').localeCompare(x.date||''))}
async function readAll(){
 if(!profile)return;
 let docs=[];
 if(teacher())docs=(await getDocs(query(collection(db,'classes'),where('teacherId','==',auth.currentUser.uid)))).docs;
 else docs=(await Promise.all((profile.classIds||[]).map(id=>getDoc(doc(db,'classes',id))))).filter(s=>s.exists());
 classes=docs.map(d=>({id:d.id,...d.data()}));
 if(!classes.some(c=>c.id===selected))selected=classes[0]?.id||'';
 await readClass();
}
async function readClass(){
 posts={contents:[],activities:[],notices:[]};comments={};
 if(selected){
  const all=await Promise.all(validKinds.map(k=>getDocs(collection(db,'classes',selected,k))));
  validKinds.forEach((k,i)=>posts[k]=all[i].docs.map(d=>({id:d.id,...d.data()})));
  const pairs=await Promise.all(['activities','notices'].flatMap(k=>posts[k].map(async p=>{
   const s=await getDocs(collection(db,'classes',selected,k,p.id,'comments'));
   return [k+'/'+p.id,s.docs.map(d=>({id:d.id,...d.data()}))];
  })));
  pairs.forEach(([key,val])=>comments[key]=val);
 }
 render();
}
function attachmentsView(item){
 return (item.attachments||[]).length?`<div class="attachments"><strong>Anexos</strong><ul>${item.attachments.map(a=>`<li><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">📎 ${esc(a.name)}</a></li>`).join('')}</ul></div>`:'';
}
function commentView(kind,item){
 const key=kind+'/'+item.id;
 const entries=(comments[key]||[]).slice().sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
 return `<div class="discussion"><h4>Comentários (${entries.length})</h4>${entries.map(c=>`<div class="comment"><div><strong>${esc(c.authorName||'Usuário')}</strong> <span class="pill">${c.role==='professor'?'Professor':'Aluno'}</span></div><p class="pre">${esc(c.body)}</p></div>`).join('')||'<p class="muted">Ainda não há comentários.</p>'}<form class="commentForm" data-kind="${kind}" data-post="${esc(item.id)}"><label>${teacher()?'Responder ou comentar':'Adicionar comentário'}<textarea name="body" required maxlength="2000" placeholder="Escreva sua mensagem..."></textarea></label><button>Enviar comentário</button></form></div>`;
}
function cards(kind){
 const titles={contents:'Conteúdo',activities:'Atividade',notices:'Aviso'};
 return sorted(posts[kind]).map((item,i)=>`<article class="tile"><div class="date">${titles[kind]} ${i+1} · ${esc(displayDate(item.date))}</div><h3>${esc(item.title)}</h3><p class="pre">${esc(item.body)}</p>${attachmentsView(item)}${['activities','notices'].includes(kind)?commentView(kind,item):''}${teacher()?`<button class="danger" data-delete="${kind}" data-id="${esc(item.id)}">Excluir publicação</button>`:''}</article>`).join('')||'<p>Nenhuma publicação nesta turma.</p>';
}
function classForm(){return `<section class="card"><h2>Cadastrar turma</h2><form id="classForm"><label>Turma<input name="name" required maxlength="100" placeholder="Ex.: 7º ano A"></label><label>Disciplina<input name="subject" required maxlength="100" placeholder="Ex.: História"></label><button>Cadastrar turma</button></form></section>`}
function render(){
 if(!profile)return;
 $('greeting').textContent=`Olá, ${profile.name||auth.currentUser.email}`;
 $('subtitle').textContent=teacher()?'Painel do professor':'Área do aluno';
 const tabs=[['home','Início'],...(teacher()?[['classes','Turmas']]:[]),['contents','Conteúdos publicados'],['activities','Atividades'],['notices','Avisos'],...(teacher()?[['students','Cadastrar alunos']]:[])];
 $('nav').innerHTML=tabs.map(([k,label])=>`<button data-page="${k}" class="${page===k?'active':''}">${label}</button>`).join('');
 let h=`<section class="card"><label>Turma<select id="classSelect" ${classes.length?'':'disabled'}>${classes.length?classes.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)} — ${esc(c.subject)}</option>`).join(''):'<option>Nenhuma turma disponível</option>'}</select></label></section>`;
 if(page==='home'){
  h+=`<div class="grid">${[['contents','Conteúdos'],['activities','Atividades'],['notices','Avisos']].map(([k,t])=>`<section class="card"><h2>${t}</h2><p>${posts[k].length} publicação(ões)</p><button data-page="${k}">Ver ${t.toLowerCase()}</button></section>`).join('')}</div>`;
  if(teacher())h+=classForm();
 }else if(page==='classes'&&teacher()){
  h+=`<section class="card"><h2>Minhas turmas</h2>${classes.map(c=>`<div class="tile"><strong>${esc(c.name)}</strong><p>${esc(c.subject)}</p><button data-open-class="${esc(c.id)}">Abrir turma</button></div>`).join('')||'<p>Você ainda não cadastrou turmas.</p>'}</section>`+classForm();
 }else if(validKinds.includes(page)){
  const labels={contents:'Conteúdos publicados',activities:'Atividades para consulta',notices:'Avisos da turma'};
  h+=`<section class="card"><h2>${labels[page]}</h2><p class="muted">${page==='activities'?'As atividades são propostas para leitura; alunos podem comentar.':page==='notices'?'Comunicados da turma, com espaço para comentários.':'Materiais publicados para consulta.'}</p></section>`;
  h+=cards(page);
  if(teacher()&&selected)h+=`<section class="card"><h2>Publicar ${page==='contents'?'conteúdo':page==='activities'?'atividade':'aviso'}</h2><form id="publishForm"><label>Título<input name="title" required maxlength="180"></label><label>Data<input type="date" name="date" required></label><label>Texto e orientações<textarea name="body" required maxlength="15000"></textarea></label>${page==='activities'?'<label>Fotos e documentos (até 5 arquivos de 10 MB cada)<input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.odt,.txt"></label>':''}<button>Publicar</button></form></section>`;
 }else if(page==='students'&&teacher()){
  h+=`<section class="card"><h2>Cadastrar aluno</h2><p class="muted">Cadastre e-mail e senha individual e escolha a turma do estudante.</p><form id="studentForm"><label>Nome<input name="name" required></label><label>E-mail<input type="email" name="email" required></label><label>Senha provisória (mínimo 8 caracteres)<input name="password" type="password" minlength="8" required></label><label>Turma<select name="classIds" required>${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.subject)}</option>`).join('')}</select></label><button ${classes.length?'':'disabled'}>Criar conta</button></form></section>`;
 }
 $('view').innerHTML=h;
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);$('password').value='';message('')}catch(err){message('Não foi possível entrar. Verifique e-mail, senha e cadastro autorizado.')}
});
$('logout').addEventListener('click',()=>signOut(auth));
onAuthStateChanged(auth,async u=>{
 profile=null;classes=[];selected='';page='home';$('app').hidden=true;$('userbar').hidden=true;$('login').hidden=!!u;
 if(!u){message('');return}
 try{
  const snap=await getDoc(doc(db,'users',u.uid));
  if(!snap.exists()||!['professor','aluno'].includes(snap.data().role)){message('Conta autenticada, mas ainda não autorizada. Cadastre o perfil em Firestore.');await signOut(auth);return}
  profile=snap.data();$('login').hidden=true;$('app').hidden=false;$('userbar').hidden=false;$('username').textContent=profile.name;
  await readAll();message('');
 }catch(err){message('Erro ao carregar dados: '+(err.code||err.message));}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||!profile)return;
 if(b.dataset.page){page=b.dataset.page;render();return}
 if(b.dataset.openClass){selected=b.dataset.openClass;page='contents';try{await readClass()}catch(err){message('Erro ao abrir turma: '+err.code)}return}
 if(b.dataset.delete&&teacher()&&selected&&confirm('Excluir esta publicação? Os comentários também serão removidos.')){
  const kind=b.dataset.delete,id=b.dataset.id;
  try{
   // Delete comments first, then uploaded files, then the post.
   if(['activities','notices'].includes(kind)){
    const s=await getDocs(collection(db,'classes',selected,kind,id,'comments'));
    for(const c of s.docs)await deleteDoc(c.ref);
   }
   const original=posts[kind].find(x=>x.id===id);
   for(const a of (original?.attachments||[]))if(a.path){try{await deleteObject(ref(storage,a.path))}catch(err){console.warn('Anexo não removido',err)}}
   await deleteDoc(doc(db,'classes',selected,kind,id));await readClass();message('Publicação excluída.');
  }catch(err){message('Erro ao excluir: '+(err.code||err.message))}
 }
});
document.addEventListener('change',async e=>{if(e.target.id==='classSelect'&&classes.length){selected=e.target.value;try{await readClass()}catch(err){message('Erro ao abrir turma: '+err.code)}}});
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(!['classForm','publishForm','studentForm'].includes(f.id)&&!f.classList.contains('commentForm')||!profile)return;
 e.preventDefault();const button=f.querySelector('button');button.disabled=true;
 try{
  const data=new FormData(f);
  if(f.classList.contains('commentForm')){
   const kind=f.dataset.kind,id=f.dataset.post;
   if(!selected||!['activities','notices'].includes(kind))throw Error('Comentário inválido');
   await addDoc(collection(db,'classes',selected,kind,id,'comments'),{body:data.get('body').trim(),authorId:auth.currentUser.uid,authorName:profile.name||auth.currentUser.email,role:profile.role,createdAt:serverTimestamp()});
   await readClass();message('Comentário enviado.');return;
  }
  if(!teacher())return;
  if(f.id==='classForm'){
   const created=await addDoc(collection(db,'classes'),{name:data.get('name').trim(),subject:data.get('subject').trim(),teacherId:auth.currentUser.uid,createdAt:serverTimestamp()});
   selected=created.id;await readAll();message('Turma cadastrada.');
  }else if(f.id==='publishForm'){
   const kind=page;
   if(!validKinds.includes(kind)||!selected)throw Error('Selecione uma turma');
   const files=[...f.querySelector('input[type=file]')?.files||[]];
   if(files.length>5)throw Error('Selecione no máximo 5 arquivos.');
   const allowed=['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.oasis.opendocument.text','text/plain'];
   for(const file of files)if(file.size>10*1024*1024||!allowed.includes(file.type))throw Error('Arquivo não permitido ou maior que 10 MB: '+file.name);
   const payload={title:data.get('title').trim(),body:data.get('body').trim(),date:data.get('date'),createdAt:serverTimestamp()};
   if(kind==='activities')payload.attachments=[];
   const post=await addDoc(collection(db,'classes',selected,kind),payload);
   try{
    if(files.length){
     const attachments=[];
     for(const file of files){
      const path=`classFiles/${selected}/${post.id}/${crypto.randomUUID()}`;
      const object=ref(storage,path);
      await uploadBytes(object,file,{contentType:file.type,customMetadata:{originalName:file.name}});
      attachments.push({name:file.name,url:await getDownloadURL(object),path});
     }
     await setDoc(post,{attachments},{merge:true});
    }
   }catch(err){message('Publicação criada, mas algum anexo falhou: '+(err.code||err.message));await readClass();return}
   await readClass();message('Publicação salva para os alunos matriculados.');
  }else if(f.id==='studentForm'){
   const email=data.get('email').trim(),password=data.get('password'),name=data.get('name').trim(),classIds=data.getAll('classIds');
   if(!classIds.length)throw Error('Selecione uma turma.');
   const secondary=initializeApp(firebaseConfig,'register-'+Date.now());
   try{
    const secondaryAuth=getAuth(secondary),cred=await createUserWithEmailAndPassword(secondaryAuth,email,password);
    await setDoc(doc(db,'users',cred.user.uid),{name,email,role:'aluno',teacherId:auth.currentUser.uid,classIds});
    await signOut(secondaryAuth);
   }finally{await deleteApp(secondary)}
   f.reset();message('Aluno cadastrado. Compartilhe a senha de forma privada.');
  }
 }catch(err){message('Não foi possível concluir: '+(err.code||err.message))}
 finally{button.disabled=false}
});
