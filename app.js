import {initializeApp,deleteApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,createUserWithEmailAndPassword} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,addDoc,getDocs,query,where,deleteDoc,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
const fb=initializeApp(firebaseConfig),auth=getAuth(fb),db=getFirestore(fb);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validKinds=['contents','activities','notices'];
const dateTimeBR=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
const localNow=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
let profile=null,classes=[],selected='',page='home',posts={contents:[],activities:[],notices:[]},comments={},students=[],teachers=[];
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
 if(teacher())await readStudents();
 await readClass();
}
async function readStudents(){
 const snap=await getDocs(query(collection(db,'users'),where('teacherId','==',auth.currentUser.uid),where('role','==','aluno')));
 students=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.role==='aluno');
 const staff=await getDocs(query(collection(db,'users'),where('createdBy','==',auth.currentUser.uid),where('role','==','professor')));
 teachers=staff.docs.map(d=>({id:d.id,...d.data()}));
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
function safeUrl(url){
 try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}
}
function attachmentsView(item){
 return (item.attachments||[]).length?`<div class="attachments"><strong>Anexos</strong><ul>${item.attachments.filter(a=>safeUrl(a.url)).map(a=>`<li><a href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener noreferrer">📎 ${esc(a.name)}</a></li>`).join('')}</ul></div>`:'';
}
function commentView(kind,item){
 const key=kind+'/'+item.id;
 const entries=(comments[key]||[]).slice().sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
 return `<div class="discussion"><h4>Comentários (${entries.length})</h4>${entries.map(c=>`<div class="comment"><div><strong>${esc(c.authorName||'Usuário')}</strong> <span class="pill">${c.role==='professor'?'Professor':'Aluno'}</span></div><p class="pre">${esc(c.body)}</p></div>`).join('')||'<p class="muted">Ainda não há comentários.</p>'}<form class="commentForm" data-kind="${kind}" data-post="${esc(item.id)}"><label>${teacher()?'Responder ou comentar':'Adicionar comentário'}<textarea name="body" required maxlength="2000" placeholder="Escreva sua mensagem..."></textarea></label><button>Enviar comentário</button></form></div>`;
}
function cards(kind){
 const titles={contents:'Conteúdo',activities:'Atividade',notices:'Aviso'};
 return sorted(posts[kind]).map((item,i)=>`<article class="tile"><div class="date">${titles[kind]} ${i+1} · ${esc(item.publishedAt?dateTimeBR(item.publishedAt):displayDate(item.date))}${item.dueAt?' · Entrega até '+esc(dateTimeBR(item.dueAt)):''}</div><h3>${esc(item.title)}</h3><p class="pre">${esc(item.body)}</p>${attachmentsView(item)}${['activities','notices'].includes(kind)?commentView(kind,item):''}${teacher()?`<button class="danger" data-delete="${kind}" data-id="${esc(item.id)}">Excluir publicação</button>`:''}</article>`).join('')||'<p>Nenhuma publicação nesta turma.</p>';
}
function classForm(){return `<section class="card"><h2>Cadastrar turma</h2><form id="classForm"><label>Turma<input name="name" required maxlength="100" placeholder="Ex.: 7º ano A"></label><label>Disciplina<input name="subject" required maxlength="100" placeholder="Ex.: História"></label><button>Cadastrar turma</button></form></section>`}
function render(){
 if(!profile)return;
 $('greeting').textContent=`Olá, ${profile.name||auth.currentUser.email}`;
 $('subtitle').textContent=teacher()?'Painel do professor':'Área do aluno';
 const tabs=[['home','Início'],...(teacher()?[['classes','Turmas']]:[]),['contents','Conteúdos publicados'],['activities','Atividades'],['notices','Avisos'],...(teacher()?[['students','Gerenciar alunos'],['accounts','Criar contas'],['teachers','Professores']]:[])];
 $('nav').innerHTML=tabs.map(([k,label])=>`<button data-page="${k}" class="${page===k?'active':''}">${label}</button>`).join('');
 let h=`<section class="card"><label>Turma<select id="classSelect" ${classes.length?'':'disabled'}>${classes.length?classes.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)} — ${esc(c.subject)}</option>`).join(''):'<option>Nenhuma turma disponível</option>'}</select></label></section>`;
 if(page==='home'){
  h+=`<div class="grid">${[['contents','Conteúdos'],['activities','Atividades'],['notices','Avisos']].map(([k,t])=>`<section class="card"><h2>${t}</h2><p>${posts[k].length} publicação(ões)</p><button data-page="${k}">Ver ${t.toLowerCase()}</button></section>`).join('')}</div>`;
  if(teacher())h+=classForm();
 }else if(page==='classes'&&teacher()){
  h+=`<section class="card"><h2>Minhas turmas</h2>${classes.map(c=>`<div class="tile"><strong>${esc(c.name)}</strong><p>${esc(c.subject)}</p><p class="muted">${students.filter(st=>(st.classIds||[]).includes(c.id)).length} aluno(s) matriculado(s)</p><button data-open-class="${esc(c.id)}">Abrir turma</button><form class="renameClassForm" data-class="${esc(c.id)}"><label>Nome da turma<input name="name" value="${esc(c.name)}" required maxlength="100"></label><label>Disciplina<input name="subject" value="${esc(c.subject)}" required maxlength="100"></label><button type="submit">Salvar alterações</button><button type="button" class="danger" data-delete-class="${esc(c.id)}">Excluir turma</button></form></div>`).join('')||'<p>Você ainda não cadastrou turmas.</p>'}</section>`+classForm();
 }else if(validKinds.includes(page)){
  const labels={contents:'Conteúdos publicados',activities:'Atividades para consulta',notices:'Avisos da turma'};
  h+=`<section class="card"><h2>${labels[page]}</h2><p class="muted">${page==='activities'?'As atividades são propostas para leitura; alunos podem comentar.':page==='notices'?'Comunicados da turma, com espaço para comentários.':'Materiais publicados para consulta.'}</p></section>`;
  h+=cards(page);
  if(teacher()&&selected)h+=`<section class="card"><h2>Publicar ${page==='contents'?'conteúdo':page==='activities'?'atividade':'aviso'}</h2><form id="publishForm"><label>Título<input name="title" required maxlength="180"></label><label>Data e hora da publicação<input type="datetime-local" name="publishedAt" value="${localNow()}" required></label>${page==='activities'?'<label>Data e hora de entrega (opcional)<input type="datetime-local" name="dueAt"></label>':''}<label>Texto e orientações<textarea name="body" required maxlength="15000"></textarea></label>${page==='activities'?`<fieldset><legend>Fotos e documentos por link (opcional)</legend><p class="muted">Envie o arquivo ao GitHub ou a um serviço com link acessível e cole o endereço completo (https://). Até 5 anexos.</p>${[1,2,3,4,5].map(i=>`<div class="attachment-input"><label>Nome do anexo ${i}<input name="attachmentName${i}" placeholder="Ex.: Mapa histórico.pdf"></label><label>Link do arquivo ${i}<input name="attachmentUrl${i}" type="url" placeholder="https://..."></label></div>`).join('')}</fieldset>`:''}<button>Publicar</button></form></section>`;
 }else if(page==='students'&&teacher()){
  h+=`<section class="card"><h2>Gerenciar alunos por turma</h2><p class="muted">Crie novas contas na aba <strong>Criar contas</strong>. Aqui você pode matricular ou desmatricular estudantes das suas turmas.</p></section>`;
  h+=`<section class="card"><h2>Alunos cadastrados (${students.length})</h2><p class="muted">Marque as turmas em que cada aluno está matriculado e clique em Salvar matrículas. Retirar todas as turmas suspende o acesso aos materiais, mas mantém a conta.</p>${students.length?students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(st=>`<form class="enrollmentForm tile" data-student="${esc(st.id)}"><strong>${esc(st.name)}</strong><p class="muted">${esc(st.email)}</p><div class="checks">${classes.map(c=>`<label><input type="checkbox" name="classIds" value="${esc(c.id)}" ${(st.classIds||[]).includes(c.id)?'checked':''}> ${esc(c.name)} — ${esc(c.subject)}</label>`).join('')||'<p>Cadastre uma turma primeiro.</p>'}</div><button>Salvar matrículas</button></form>`).join(''):'<p>Nenhum aluno cadastrado.</p>'}</section>`;
 }
 else if(page==='accounts'&&teacher()){
  h+=`<section class="card"><h2>Criar conta de aluno ou professor</h2><p class="muted">Selecione o perfil e informe os dados de acesso. Professores terão suas próprias turmas e poderão cadastrar outras contas; alunos acessarão apenas as turmas em que estiverem matriculados.</p><form id="accountForm"><label>Tipo de conta<select id="newRole" name="role"><option value="aluno">Aluno</option><option value="professor">Professor</option></select></label><label>Nome completo<input name="name" required maxlength="150"></label><label>E-mail<input type="email" name="email" required></label><label>Senha provisória (mínimo 8 caracteres)<input name="password" type="password" minlength="8" required></label><div id="newClassField"><label>Turma inicial<select name="classIds"><option value="">Selecione uma turma</option>${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.subject)}</option>`).join('')}</select></label></div><button>Criar conta</button></form></section>`;
  h+=`<section class="card"><h2>Professores cadastrados (${teachers.length})</h2><p class="muted">Consulte também na aba Professores.</p>${teachers.map(t=>`<div class="tile"><strong>${esc(t.name)}</strong><p class="muted">${esc(t.email)}</p></div>`).join('')||'<p>Nenhum professor adicional cadastrado por esta conta.</p>'}</section>`;
 }
 else if(page==='teachers'&&teacher()){
  h+=`<section class="card"><h2>Professores cadastrados</h2><p class="muted">Contas de professor criadas por você. Cada professor administra suas próprias turmas. Para cadastrar outro, use a aba Criar contas e escolha Professor.</p>${teachers.length?teachers.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(t=>`<div class="tile"><strong>${esc(t.name)}</strong><p class="muted">${esc(t.email)}</p><span class="pill">Professor</span></div>`).join(''):'<p>Nenhum professor adicional cadastrado.</p>'}<button type="button" data-page="accounts">Criar conta de professor</button></section>`;
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
 if(b.dataset.deleteClass&&teacher()){
  const cid=b.dataset.deleteClass;
  if(!classes.some(c=>c.id===cid))return;
  if(!confirm('Excluir esta turma e TODOS os conteúdos, atividades, avisos e comentários dela? Os alunos não serão apagados. Esta ação não pode ser desfeita.'))return;
  b.disabled=true;
  try{
   // Remove enrollment first: no student should point to a deleted class.
   for(const st of students.filter(st=>(st.classIds||[]).includes(cid))){
    await updateDoc(doc(db,'users',st.id),{classIds:st.classIds.filter(x=>x!==cid)});
   }
   for(const kind of validKinds){
    const list=await getDocs(collection(db,'classes',cid,kind));
    for(const post of list.docs){
     if(kind==='activities'||kind==='notices'){
      const thread=await getDocs(collection(db,'classes',cid,kind,post.id,'comments'));
      for(const c of thread.docs)await deleteDoc(c.ref);
     }
     await deleteDoc(post.ref);
    }
   }
   await deleteDoc(doc(db,'classes',cid));selected='';await readAll();message('Turma excluída.');
  }catch(err){message('Exclusão interrompida: '+(err.code||err.message)+'; tente novamente antes de continuar.')}finally{b.disabled=false}
  return;
 }
 if(b.dataset.delete&&teacher()&&selected&&confirm('Excluir esta publicação? Os comentários também serão removidos.')){
  const kind=b.dataset.delete,id=b.dataset.id;
  try{
   // Delete comments before the post.
   if(['activities','notices'].includes(kind)){
    const s=await getDocs(collection(db,'classes',selected,kind,id,'comments'));
    for(const c of s.docs)await deleteDoc(c.ref);
   }
   await deleteDoc(doc(db,'classes',selected,kind,id));await readClass();message('Publicação excluída.');
  }catch(err){message('Erro ao excluir: '+(err.code||err.message))}
 }
});
document.addEventListener('change',async e=>{if(e.target.id==='newRole'){const field=$('newClassField');if(field)field.hidden=e.target.value==='professor';return}if(e.target.id==='classSelect'&&classes.length){selected=e.target.value;try{await readClass()}catch(err){message('Erro ao abrir turma: '+err.code)}}});
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(!['classForm','publishForm','accountForm'].includes(f.id)&&!f.classList.contains('commentForm')&&!f.classList.contains('enrollmentForm')&&!f.classList.contains('renameClassForm')||!profile)return;
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
  if(f.classList.contains('enrollmentForm')){
   const student=students.find(st=>st.id===f.dataset.student);
   if(!student)throw Error('Aluno não encontrado');
   const classIds=data.getAll('classIds');
   if(classIds.some(id=>!classes.some(c=>c.id===id)))throw Error('Turma não autorizada');
   await updateDoc(doc(db,'users',student.id),{classIds});
   await readStudents();render();message('Matrículas atualizadas.');return;
  }
  if(f.classList.contains('renameClassForm')){
   const id=f.dataset.class;
   if(!classes.some(c=>c.id===id))throw Error('Turma não autorizada');
   await updateDoc(doc(db,'classes',id),{name:String(data.get('name')).trim(),subject:String(data.get('subject')).trim()});
   await readAll();message('Turma atualizada.');return;
  }
  if(f.id==='classForm'){
   const created=await addDoc(collection(db,'classes'),{name:data.get('name').trim(),subject:data.get('subject').trim(),teacherId:auth.currentUser.uid,createdAt:serverTimestamp()});
   selected=created.id;await readAll();message('Turma cadastrada.');
  }else if(f.id==='publishForm'){
   const kind=page;
   if(!validKinds.includes(kind)||!selected)throw Error('Selecione uma turma');
   const attachments=[];
   if(kind==='activities')for(let i=1;i<=5;i++){
    const url=String(data.get('attachmentUrl'+i)||'').trim();
    const name=String(data.get('attachmentName'+i)||'').trim();
    if(!url&&!name)continue;
    if(!url||!name||!safeUrl(url)||name.length>160||url.length>1500)throw Error('Preencha nome e link HTTPS/HTTP válido para cada anexo.');
    attachments.push({name,url});
   }
   const publishedAt=String(data.get('publishedAt')||'');
   const dueAt=kind==='activities'?String(data.get('dueAt')||''):'';
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(publishedAt))throw Error('Data e hora inválidas');
   if(dueAt&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueAt)||dueAt<publishedAt))throw Error('Entrega deve ser posterior à publicação');
   const payload={title:data.get('title').trim(),body:data.get('body').trim(),date:publishedAt.slice(0,10),publishedAt,createdAt:serverTimestamp()};
   if(kind==='activities'&&dueAt)payload.dueAt=dueAt;
   if(kind==='activities')payload.attachments=attachments;
   await addDoc(collection(db,'classes',selected,kind),payload);
   await readClass();message('Publicação salva para os alunos matriculados.');
  }else if(f.id==='accountForm'){
   const email=data.get('email').trim(),password=data.get('password'),name=data.get('name').trim(),role=data.get('role');
   if(!['aluno','professor'].includes(role))throw Error('Tipo de conta inválido');
   const classIds=role==='aluno'?[String(data.get('classIds')||'')]:[];
   if(role==='aluno'&&!classes.some(c=>c.id===classIds[0]))throw Error('Selecione uma turma válida');
   const secondary=initializeApp(firebaseConfig,'register-'+Date.now());
   try{
    const secondaryAuth=getAuth(secondary),cred=await createUserWithEmailAndPassword(secondaryAuth,email,password);
    await setDoc(doc(db,'users',cred.user.uid),role==='aluno'
     ?{name,email,role:'aluno',teacherId:auth.currentUser.uid,classIds}
     :{name,email,role:'professor',createdBy:auth.currentUser.uid});
    await signOut(secondaryAuth);
   }finally{await deleteApp(secondary)}
   await readStudents();render();message(role==='professor'?'Conta de professor criada. Acesse a aba Professores para consultar. Compartilhe a senha de forma privada.':'Conta de aluno criada. Compartilhe a senha de forma privada.');
  }
 }catch(err){message('Não foi possível concluir: '+(err.code||err.message))}
 finally{button.disabled=false}
});
