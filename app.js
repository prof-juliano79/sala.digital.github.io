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
let requests=[],profile=null,classes=[],selected='',page='home',posts={contents:[],activities:[],notices:[]},comments={},students=[],teachers=[];
let allActivities=[],reads={},activeEdit=null,filterText='',filterMonth='',filterOrder='new',calendarMonth=new Date().toISOString().slice(0,7);
let accessibility={font:'normal',contrast:false,simple:false};
try{accessibility={...accessibility,...JSON.parse(localStorage.getItem('msd-accessibility-v13')||'{}')}}catch{}
function setAccessibility(){document.body.classList.toggle('contrast',accessibility.contrast);document.body.classList.toggle('simple-reading',accessibility.simple);document.body.classList.toggle('large-font',accessibility.font==='large');}
setAccessibility();
function datePart(v){return (v||'').slice(0,10)}
function keyRead(kind,id){return kind+'/'+id}
function selectedPosts(){return validKinds.flatMap(k=>posts[k].map(p=>({...p,kind:k})))}
function readCount(kind,id){return (reads[keyRead(kind,id)]||[]).length}
async function loadOverview(){allActivities=[];if(!classes.length)return;
 const snaps=await Promise.all(classes.map(async c=>({c,s:await getDocs(collection(db,'classes',c.id,'activities'))})));
 allActivities=snaps.flatMap(({c,s})=>s.docs.map(d=>({id:d.id,classId:c.id,className:c.name,subject:c.subject,...d.data()})));
}
async function loadReads(){reads={};if(!selected)return;
 const jobs=validKinds.flatMap(k=>posts[k].map(async post=>{
 const path=['classes',selected,k,post.id,'reads'];
 if(teacher()){const snap=await getDocs(collection(db,...path));return [keyRead(k,post.id),snap.docs.map(d=>({id:d.id,...d.data()}))]}
 const snap=await getDoc(doc(db,...path,auth.currentUser.uid));return [keyRead(k,post.id),snap.exists()?[{id:snap.id,...snap.data()}]:[]];
 }));(await Promise.all(jobs)).forEach(([k,v])=>reads[k]=v);
}
function filterBar(){return `<section class="card filters"><h2>Pesquisar e filtrar</h2><div class="filter-grid"><label>Buscar por título ou texto<input id="filterText" value="${esc(filterText)}" placeholder="Palavra-chave"></label><label>Mês da publicação<input id="filterMonth" type="month" value="${esc(filterMonth)}"></label><label>Ordenar<select id="filterOrder"><option value="new" ${filterOrder==='new'?'selected':''}>Mais recentes</option><option value="old" ${filterOrder==='old'?'selected':''}>Mais antigas</option><option value="az" ${filterOrder==='az'?'selected':''}>Título (A–Z)</option></select></label></div><button type="button" data-clear-filters class="outline">Limpar filtros</button></section>`}
function filtered(items){let out=items.filter(p=>(!filterText||((p.title||'')+' '+(p.body||'')).toLocaleLowerCase('pt-BR').includes(filterText.toLocaleLowerCase('pt-BR')))&&(!filterMonth||datePart(p.publishedAt||p.date).startsWith(filterMonth)));
 return out.sort((a,b)=>filterOrder==='az'?(a.title||'').localeCompare(b.title||'','pt-BR'):filterOrder==='old'?(a.publishedAt||a.date||'').localeCompare(b.publishedAt||b.date||''):(b.publishedAt||b.date||'').localeCompare(a.publishedAt||a.date||''));}
function editForm(kind,item){return `<form class="editPostForm edit-form" data-kind="${kind}" data-id="${esc(item.id)}"><h4>Editar publicação</h4><label>Título<input name="title" required maxlength="180" value="${esc(item.title)}"></label><label>Data e hora<input type="datetime-local" name="publishedAt" required value="${esc(item.publishedAt||(item.date?item.date+'T08:00':localNow()))}"></label>${kind==='activities'?`<label>Prazo de entrega (opcional)<input type="datetime-local" name="dueAt" value="${esc(item.dueAt||'')}"></label>`:''}<label>Texto<textarea name="body" required maxlength="15000">${esc(item.body)}</textarea></label>${kind==='activities'?`<fieldset><legend>Anexos por link (opcionais)</legend>${[1,2,3,4,5].map((i)=>`<label>Nome do anexo ${i}<input name="attachmentName${i}" value="${esc((item.attachments||[])[i-1]?.name||'')}"></label><label>URL do anexo ${i}<input type="url" name="attachmentUrl${i}" value="${esc((item.attachments||[])[i-1]?.url||'')}"></label>`).join('')}</fieldset>`:''}<button>Salvar edição</button><button type="button" class="outline" data-cancel-edit>Cancelar</button></form>`}
function reading(kind,item){const entries=reads[keyRead(kind,item.id)]||[];
 return `<div class="reading"><span class="muted">${teacher()?`Leitura confirmada: ${entries.length} aluno(s)`:(entries.length?'✓ Você confirmou a leitura':'Você ainda não confirmou a leitura')}</span> ${teacher()?`<button type="button" class="outline" data-toggle-readers="${kind}/${esc(item.id)}">Ver confirmações</button><div class="readers" hidden id="readers-${kind}-${esc(item.id)}">${entries.map(r=>`<p>${esc(r.name||r.email||'Aluno')}</p>`).join('')||'<p>Nenhuma confirmação.</p>'}</div>`:entries.length?'':`<button type="button" data-read="${kind}" data-id="${esc(item.id)}">Marcar como lido</button>`}</div>`}
function dashboard(){const today=new Date().toISOString().slice(0,10);const due=allActivities.filter(a=>a.dueAt&&datePart(a.dueAt)>=today).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)).slice(0,6);
 const total=teacher()?students.length:classes.length;
 return `<div class="grid dashboard">${[['Turmas',classes.length,'classes'],[teacher()?'Alunos':'Turmas matriculadas',total,teacher()?'students':'calendar'],['Atividades',allActivities.length,'activities'],['Avisos nesta turma',posts.notices.length,'notices']].map(([title,n,nav])=>`<section class="card"><h2>${title}</h2><p class="metric">${n}</p><button class="outline" data-page="${nav}">Visualizar</button></section>`).join('')}</div><section class="card"><h2>Próximas entregas</h2>${due.length?due.map(a=>`<div class="due-item"><strong>${esc(a.title)}</strong><span>${esc(a.className)} · ${esc(dateTimeBR(a.dueAt))}</span></div>`).join(''):'<p class="muted">Nenhuma atividade com entrega futura cadastrada.</p>'}</section>`}
function calendar(){const [year,month]=calendarMonth.split('-').map(Number),start=new Date(year,month-1,1),days=new Date(year,month,0).getDate(),offset=(start.getDay()+6)%7;
 const buckets={};for(const a of allActivities){const date=datePart(a.dueAt||a.publishedAt||a.date);if(date.startsWith(calendarMonth))(buckets[Number(date.slice(8))]??=[]).push(a)}
 return `<section class="card"><div class="calendar-top"><div><h2>Calendário de atividades</h2><p class="muted">As datas de entrega têm prioridade; sem prazo, é exibida a publicação.</p></div><div><button class="outline" data-calendar="prev" aria-label="Mês anterior">←</button><strong>${start.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</strong><button class="outline" data-calendar="next" aria-label="Próximo mês">→</button></div></div><div class="calendar-grid">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=>`<div class="calendar-week">${d}</div>`).join('')}${Array.from({length:offset},()=>'<div class="calendar-empty"></div>').join('')}${Array.from({length:days},(_,i)=>{const day=i+1;return `<div class="calendar-day"><strong>${day}</strong>${(buckets[day]||[]).map(a=>`<div class="calendar-event" title="${esc(a.title)} — ${esc(a.className)}">${esc(a.title)}<small>${esc(a.className)}</small></div>`).join('')}</div>`}).join('')}</div></section>`}
function accessibilityPanel(){return `<section class="card"><h2>Acessibilidade</h2><p class="muted">Suas preferências ficam salvas neste navegador.</p><form id="accessForm"><label>Tamanho do texto<select name="font"><option value="normal" ${accessibility.font==='normal'?'selected':''}>Normal</option><option value="large" ${accessibility.font==='large'?'selected':''}>Ampliado</option></select></label><label class="checkline"><input type="checkbox" name="contrast" ${accessibility.contrast?'checked':''}> Alto contraste</label><label class="checkline"><input type="checkbox" name="simple" ${accessibility.simple?'checked':''}> Leitura simplificada (menos elementos decorativos)</label><button>Salvar preferências</button></form></section>`}

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
 if(teacher()){
  await readStudents();
  // As solicitações são um recurso adicional da versão 1.4.
  // Regras antigas não devem impedir a abertura do painel principal.
  try { await loadRequests(); }
  catch(err) {
   requests=[];
   console.warn('Não foi possível consultar as solicitações. Publique as regras Firestore da versão 1.4:',err);
   if(err.code==='permission-denied'){
    message('Painel carregado. Para visualizar as solicitações de cadastro, publique as regras do Firestore da versão 1.4.');
   }
  }
 }
 await loadOverview();
 await readClass();
}
async function loadRequests(){
 const email=(auth.currentUser?.email||'').trim().toLowerCase();
 const snap=await getDocs(query(collection(db,'users'),where('requestedTeacherEmail','==',email)));
 requests=snap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>
  u.role==='professor_pendente'||(u.role==='aluno'&&!u.teacherId));
}
function requestPanel(){return `<section class="card"><h2>Solicitações de cadastro (${requests.length})</h2><p class="muted">Confira a identidade dos solicitantes antes de aprovar. Alunos precisam de uma turma; professores receberão permissão para criar turmas e contas.</p>${requests.map(u=>`<div class="tile"><strong>${esc(u.name)}</strong><p class="muted">${esc(u.email)} · ${u.role==='professor_pendente'?'Professor':'Aluno'}</p><form class="approveRequestForm" data-uid="${esc(u.id)}"><label>${u.role==='professor_pendente'?'Perfil solicitado':'Turma para matrícula'}${u.role==='professor_pendente'?'<p>Professor (requer confirmação)</p>':`<select name="classId" required><option value="">Selecione uma turma</option>${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.subject)}</option>`).join('')}</select>`}</label><button type="submit">Aprovar cadastro</button></form></div>`).join('')||'<p>Não há solicitações pendentes.</p>'}</section>`}
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
  await loadReads();
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
 return filtered(posts[kind]).map((item,i)=>`<article class="tile"><div class="date">${titles[kind]} ${i+1} · ${esc(item.publishedAt?dateTimeBR(item.publishedAt):displayDate(item.date))}${item.dueAt?' · Entrega até '+esc(dateTimeBR(item.dueAt)):''}</div><h3>${esc(item.title)}</h3><p class="pre">${esc(item.body)}</p>${attachmentsView(item)}${reading(kind,item)}${['activities','notices'].includes(kind)?commentView(kind,item):''}${teacher()?`<div class="actions"><button class="outline" data-edit="${kind}" data-id="${esc(item.id)}">Editar</button><button class="danger" data-delete="${kind}" data-id="${esc(item.id)}">Excluir publicação</button></div>${activeEdit===kind+'/'+item.id?editForm(kind,item):''}`:''}</article>`).join('')||'<p>Nenhuma publicação corresponde aos filtros nesta turma.</p>';
}
function classForm(){return `<section class="card"><h2>Cadastrar turma</h2><form id="classForm"><label>Turma<input name="name" required maxlength="100" placeholder="Ex.: 7º ano A"></label><label>Disciplina<input name="subject" required maxlength="100" placeholder="Ex.: História"></label><button>Cadastrar turma</button></form></section>`}
function render(){
 if(!profile)return;
 $('greeting').textContent=`Olá, ${profile.name||auth.currentUser.email}`;
 $('subtitle').textContent=teacher()?'Painel do professor':'Área do aluno';
 const tabs=[['home','Início'],['calendar','Calendário'],...(teacher()?[['classes','Turmas']]:[]),['contents','Conteúdos publicados'],['activities','Atividades'],['notices','Avisos'],['accessibility','Acessibilidade'],...(teacher()?[['students','Gerenciar alunos'],['accounts','Criar contas'],['teachers','Professores'],['requests','Solicitações'+(requests.length?' ('+requests.length+')':'')]]:[])];
 $('nav').innerHTML=tabs.map(([k,label])=>`<button data-page="${k}" class="${page===k?'active':''}">${label}</button>`).join('');
 let h=`<section class="card"><label>Turma<select id="classSelect" ${classes.length?'':'disabled'}>${classes.length?classes.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)} — ${esc(c.subject)}</option>`).join(''):'<option>Nenhuma turma disponível</option>'}</select></label></section>`;
 if(page==='home'){
  h+=dashboard();
  h+=`<div class="grid">${[['contents','Conteúdos'],['activities','Atividades'],['notices','Avisos']].map(([k,t])=>`<section class="card"><h2>${t}</h2><p>${posts[k].length} publicação(ões)</p><button data-page="${k}">Ver ${t.toLowerCase()}</button></section>`).join('')}</div>`;
  if(teacher())h+=classForm();
 }else if(page==='calendar'){h+=calendar();}
 else if(page==='accessibility'){h+=accessibilityPanel();}
 else if(page==='classes'&&teacher()){
  h+=`<section class="card"><h2>Minhas turmas</h2>${classes.map(c=>`<div class="tile"><strong>${esc(c.name)}</strong><p>${esc(c.subject)}</p><p class="muted">${students.filter(st=>(st.classIds||[]).includes(c.id)).length} aluno(s) matriculado(s)</p><button data-open-class="${esc(c.id)}">Abrir turma</button><form class="renameClassForm" data-class="${esc(c.id)}"><label>Nome da turma<input name="name" value="${esc(c.name)}" required maxlength="100"></label><label>Disciplina<input name="subject" value="${esc(c.subject)}" required maxlength="100"></label><button type="submit">Salvar alterações</button><button type="button" class="danger" data-delete-class="${esc(c.id)}">Excluir turma</button></form></div>`).join('')||'<p>Você ainda não cadastrou turmas.</p>'}</section>`+classForm();
 }else if(validKinds.includes(page)){
  const labels={contents:'Conteúdos publicados',activities:'Atividades para consulta',notices:'Avisos da turma'};
  h+=`<section class="card"><h2>${labels[page]}</h2><p class="muted">${page==='activities'?'As atividades são propostas para leitura; alunos podem comentar.':page==='notices'?'Comunicados da turma, com espaço para comentários.':'Materiais publicados para consulta.'}</p></section>`;
  h+=filterBar();
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
 if(page==='requests'&&teacher())h+=requestPanel();
 if(!teacher()&&!classes.length)h+=`<section class="card"><h2>Aguardando matrícula</h2><p>Seu cadastro foi criado. Aguarde o professor responsável aprovar sua solicitação e incluir você em uma turma.</p><button type="button" data-refresh-profile>Atualizar situação</button></section>`;
 $('view').innerHTML=h;
}
$('showRegister').addEventListener('click',()=>{$('login').hidden=true;$('register').hidden=false;message('')});
$('cancelRegister').addEventListener('click',()=>{$('register').hidden=true;$('login').hidden=false;message('')});
$('selfRegisterForm').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]');button.disabled=true;
 const data=new FormData(form),role=String(data.get('role')),
  email=String(data.get('email')).trim().toLowerCase(),name=String(data.get('name')).trim(),
  password=String(data.get('password')),requestedTeacherEmail=String(data.get('teacherEmail')).trim().toLowerCase();
 try{
  if(!['aluno','professor_pendente'].includes(role)||name.length<3||password.length<8)throw Error('Verifique os campos do formulário.');
  if(email===requestedTeacherEmail)throw Error('Informe o e-mail de outro professor responsável pela aprovação.');
  const second=initializeApp(firebaseConfig,'self-register-'+Date.now());
  try{
   const secondaryAuth=getAuth(second),secondaryDB=getFirestore(second);
   const cred=await createUserWithEmailAndPassword(secondaryAuth,email,password);
   await setDoc(doc(secondaryDB,'users',cred.user.uid),role==='aluno'
    ?{name,email,role:'aluno',teacherId:'',classIds:[],requestedTeacherEmail}
    :{name,email,role:'professor_pendente',requestedTeacherEmail});
   await signOut(secondaryAuth);
  }finally{await deleteApp(second)}
  $('register').hidden=true;form.reset();
  await signInWithEmailAndPassword(auth,email,password);
  message('Cadastro registrado. Aguarde a aprovação do professor informado.');
 }catch(err){message('Não foi possível criar a conta: '+(err.code||err.message))}
 finally{button.disabled=false}
});
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);$('password').value='';message('')}catch(err){message('Não foi possível entrar. Verifique e-mail, senha e cadastro autorizado.')}
});
$('logout').addEventListener('click',()=>signOut(auth));
onAuthStateChanged(auth,async u=>{
 profile=null;classes=[];requests=[];selected='';page='home';$('app').hidden=true;$('userbar').hidden=true;
 $('register').hidden=true;$('login').hidden=!!u;
 if(!u){return}
 try{
  const snap=await getDoc(doc(db,'users',u.uid));
  if(!snap.exists()){message('Conta autenticada, mas sem perfil. Contate o responsável.');await signOut(auth);return}
  profile=snap.data();
  $('login').hidden=true;$('app').hidden=false;$('userbar').hidden=false;$('username').textContent=profile.name;
  if(profile.role==='professor_pendente'){
   $('greeting').textContent='Cadastro aguardando aprovação';$('subtitle').textContent='Solicitação de professor enviada';
   $('nav').innerHTML='';$('view').innerHTML='<section class="card"><h2>Aguardando autorização</h2><p>Sua conta foi criada, mas o professor responsável precisa aprovar seu acesso. Até lá, você não pode criar turmas ou visualizar materiais.</p><button type="button" data-refresh-profile>Verificar aprovação</button></section>';
  }else if(['professor','aluno'].includes(profile.role)){await readAll()}
  else{message('Perfil inválido. Entre em contato com o administrador.');return}
 }catch(err){message('Erro ao carregar dados: '+(err.code||err.message))}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||!profile)return;
 if(b.dataset.refreshProfile!==undefined){location.reload();return;}
 if(b.dataset.page){page=b.dataset.page;activeEdit=null;filterText='';filterMonth='';render();return}
 if(b.dataset.clearFilters!==undefined){filterText='';filterMonth='';filterOrder='new';render();return}
 if(b.dataset.cancelEdit!==undefined){activeEdit=null;render();return}
 if(b.dataset.calendar){const [y,m]=calendarMonth.split('-').map(Number);const d=new Date(y,m-1+(b.dataset.calendar==='next'?1:-1),1);calendarMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;render();return}
 if(b.dataset.toggleReaders){const node=document.getElementById('readers-'+b.dataset.toggleReaders.replace('/','-'));if(node)node.hidden=!node.hidden;return}
 if(b.dataset.edit&&teacher()){activeEdit=b.dataset.edit+'/'+b.dataset.id;render();return}
 if(b.dataset.read&&!teacher()&&selected){
  const kind=b.dataset.read,id=b.dataset.id;
  if(!validKinds.includes(kind)||!posts[kind].some(x=>x.id===id))return;
  b.disabled=true;
  try{await setDoc(doc(db,'classes',selected,kind,id,'reads',auth.currentUser.uid),{name:profile.name||auth.currentUser.email,email:auth.currentUser.email,readAt:serverTimestamp()});await loadReads();render();message('Leitura confirmada.')}catch(err){message('Não foi possível confirmar a leitura: '+(err.code||err.message))}
  return;
 }
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
     const readSn=await getDocs(collection(db,'classes',cid,kind,post.id,'reads'));
     for(const r of readSn.docs)await deleteDoc(r.ref);
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
   const rs=await getDocs(collection(db,'classes',selected,kind,id,'reads'));for(const r of rs.docs)await deleteDoc(r.ref);
   await deleteDoc(doc(db,'classes',selected,kind,id));await loadOverview();await readClass();message('Publicação excluída.');
  }catch(err){message('Erro ao excluir: '+(err.code||err.message))}
 }
});
document.addEventListener('change',async e=>{if(e.target.id==='filterText'){filterText=e.target.value.trim();render();return}if(e.target.id==='filterMonth'){filterMonth=e.target.value;render();return}if(e.target.id==='filterOrder'){filterOrder=e.target.value;render();return}if(e.target.id==='newRole'){const field=$('newClassField');if(field)field.hidden=e.target.value==='professor';return}if(e.target.id==='classSelect'&&classes.length){selected=e.target.value;try{await readClass()}catch(err){message('Erro ao abrir turma: '+err.code)}}});
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(!['classForm','publishForm','accountForm','accessForm'].includes(f.id)&&!f.classList.contains('commentForm')&&!f.classList.contains('enrollmentForm')&&!f.classList.contains('renameClassForm')&&!f.classList.contains('editPostForm')&&!f.classList.contains('approveRequestForm')||!profile)return;
 e.preventDefault();const button=f.querySelector('button');button.disabled=true;
 try{
  const data=new FormData(f);
  if(f.classList.contains('commentForm')){
   const kind=f.dataset.kind,id=f.dataset.post;
   if(!selected||!['activities','notices'].includes(kind))throw Error('Comentário inválido');
   await addDoc(collection(db,'classes',selected,kind,id,'comments'),{body:data.get('body').trim(),authorId:auth.currentUser.uid,authorName:profile.name||auth.currentUser.email,role:profile.role,createdAt:serverTimestamp()});
   await readClass();message('Comentário enviado.');return;
  }
  if(f.id==='accessForm'){
   accessibility={font:data.get('font')==='large'?'large':'normal',contrast:data.has('contrast'),simple:data.has('simple')};
   localStorage.setItem('msd-accessibility-v13',JSON.stringify(accessibility));setAccessibility();render();message('Preferências de acessibilidade salvas.');return;
  }
  if(!teacher())return;
  if(f.classList.contains('approveRequestForm')){
   const applicant=requests.find(u=>u.id===f.dataset.uid);
   if(!applicant)throw Error('Solicitação não encontrada');
   if(applicant.role==='professor_pendente'){
    if(!confirm(`Conceder a ${applicant.name} permissão de professor, incluindo criar turmas e outras contas?`))return;
    await updateDoc(doc(db,'users',applicant.id),{role:'professor',createdBy:auth.currentUser.uid});
   }else{
    const cid=String(data.get('classId')||'');
    if(!classes.some(c=>c.id===cid))throw Error('Selecione uma de suas turmas');
    await updateDoc(doc(db,'users',applicant.id),{teacherId:auth.currentUser.uid,classIds:[cid]});
   }
   await readStudents();await loadRequests();render();message('Cadastro aprovado com sucesso.');return;
  }
  if(f.classList.contains('editPostForm')){
   const kind=f.dataset.kind,id=f.dataset.id;
   if(!validKinds.includes(kind)||!posts[kind].some(p=>p.id===id))throw Error('Publicação não encontrada');
   const publishedAt=String(data.get('publishedAt')||''),dueAt=String(data.get('dueAt')||'');
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(publishedAt))throw Error('Data inválida');
   if(kind==='activities'&&dueAt&&dueAt<publishedAt)throw Error('O prazo deve ser posterior à publicação');
   const payload={title:String(data.get('title')||'').trim(),body:String(data.get('body')||'').trim(),publishedAt,date:publishedAt.slice(0,10)};
   if(kind==='activities'){
    payload.dueAt=dueAt;
    const attachments=[];
    for(let i=1;i<=5;i++){
     const url=String(data.get('attachmentUrl'+i)||'').trim(),name=String(data.get('attachmentName'+i)||'').trim();
     if(!url&&!name)continue;
     if(!url||!name||!safeUrl(url)||name.length>160||url.length>1500)throw Error('Anexo inválido');
     attachments.push({url,name});
    }
    payload.attachments=attachments;
   }
   await updateDoc(doc(db,'classes',selected,kind,id),payload);
   activeEdit=null;await loadOverview();await readClass();message('Publicação atualizada sem perder os comentários.');return;
  }
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
   await loadOverview();await readClass();message('Publicação salva para os alunos matriculados.');
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
