(function () {
    'use strict';
    const D = Store.data, E = Store.escape, $ = id => document.getElementById(id);
    let role = '', student = null, page = 'home', classId = D.classes[0]?.id || '', editId = null;
    const val = id => $(id)?.value.trim() || '';
    const myClasses = () => role === 'professor' ? D.classes : D.classes.filter(c => (student?.classIds || []).includes(c.id));
    const inClass = arr => arr.filter(x => x.classId === classId);
    const fmt = d => d ? d.split('-').reverse().join('/') : 'Sem data';
    function notice(s) { $('feedback').textContent = s; }
    function save(s) { const ok = Store.save(); render(); notice(ok ? s : 'Não foi possível salvar no navegador.'); }
    function enter(r, u) { role = r; student = u || null; page = 'home'; classId = myClasses()[0]?.id || ''; $('welcome').hidden = true; $('workspace').hidden = false; $('role-label').textContent = r === 'professor' ? 'Professor' : `Aluno · ${u.name}`; render(); notice('Bem-vindo!'); }
    function render() {
        const cs = myClasses(); if (!cs.some(c => c.id === classId)) classId = cs[0]?.id || '';
        $('workspace-title').textContent = role === 'professor' ? 'Painel do professor' : `Olá, ${student.name}`;
        $('workspace-subtitle').textContent = role === 'professor' ? 'Gerencie aulas, turmas e contas de alunos.' : 'Consulte os materiais disponibilizados pelo professor.';
        const tabs = [['home', 'Início'], ['contents', 'Conteúdos publicados'], ['activities', 'Atividades'], ['announcements', 'Avisos'], ...(role === 'professor' ? [['classes', 'Gerenciar turmas'], ['students', 'Cadastrar alunos']] : [])];
        $('navigation').innerHTML = tabs.map(([id, label]) => `<button type="button" data-action="tab" data-page="${id}" class="${page === id ? 'active' : ''}">${label}</button>`).join('');
        $('class-select').innerHTML = cs.map(c => `<option value="${E(c.id)}" ${c.id === classId ? 'selected' : ''}>${E(c.name)} — ${E(c.subject)}</option>`).join('');
        $('view').innerHTML = ({ home, contents, activities, announcements, classes, students }[page] || home)();
    }
    function home() { return `<div class="grid"><article class="panel"><h2>Conteúdos publicados</h2><div class="stat">${inClass(D.contents).length}</div><p>Aulas organizadas por data.</p><button data-action="tab" data-page="contents">Ver conteúdos</button></article><article class="panel"><h2>Atividades</h2><div class="stat">${inClass(D.activities).length}</div><p>Atividades publicadas para consulta e estudo.</p><button data-action="tab" data-page="activities">Ver atividades</button></article><article class="panel"><h2>Avisos</h2><div class="stat">${inClass(D.announcements).length}</div><button data-action="tab" data-page="announcements">Ver avisos</button></article></div><div class="panel"><h2>Bem-vindo!</h2><p>${role === 'professor' ? 'Publique materiais e atividades. Cadastre alunos e vincule-os às turmas.' : 'Selecione uma turma e acesse os materiais publicados pelo professor.'}</p></div>` }
    function contents() {
        let list = inClass(D.contents).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        let h = '<section class="panel"><h2>Conteúdos publicados</h2><p class="muted">Conteúdos numerados e organizados por data.</p></section>';
        h += list.map((c, i) => `<article class="content-card"><div class="content-head"><h3><span class="pill">Conteúdo ${String(i + 1).padStart(2, '0')}</span> ${E(c.title)}</h3><span class="content-date">📅 ${fmt(c.date)}</span></div><p style="white-space:pre-wrap">${E(c.body)}</p>${role === 'professor' ? `<div class="actions"><button data-action="editContent" data-id="${E(c.id)}">Editar</button><button class="danger" data-action="deleteContent" data-id="${E(c.id)}">Excluir</button></div>` : ''}</article>`).join('') || '<div class="panel">Nenhum conteúdo publicado.</div>';
        if (role === 'professor') h += `<section class="panel"><h2>${editId ? 'Editar conteúdo' : 'Publicar conteúdo'}</h2><form id="content-form"><label>Título</label><input id="ct" required><label>Data da aula</label><input id="cd" type="date" required><label>Texto</label><textarea id="cb" required></textarea><button type="submit">${editId ? 'Salvar alterações' : 'Publicar'}</button>${editId ? '<button type="button" class="secondary" data-action="cancelEdit">Cancelar</button>' : ''}</form></section>`;
        return h;
    }
    function activities() {
        let h = '<section class="panel"><h2>Atividades publicadas</h2><p class="muted">Materiais e orientações disponibilizados pelo professor. Não é necessário responder pelo site.</p></section>';
        h += inClass(D.activities).slice().reverse().map((a, i) => `<article class="content-card"><div class="content-head"><h3><span class="pill">Atividade ${String(i + 1).padStart(2, '0')}</span> ${E(a.title)}</h3><span class="content-date">📅 ${fmt(a.date || a.due)}</span></div><p style="white-space:pre-wrap">${E(a.body || a.question || '')}</p>${role === 'professor' ? `<button class="danger" data-action="deleteActivity" data-id="${E(a.id)}">Excluir</button>` : ''}</article>`).join('') || '<div class="panel">Nenhuma atividade publicada.</div>';
        if (role === 'professor') h += `<section class="panel"><h2>Publicar atividade</h2><form id="activity-form"><label>Título</label><input id="at" required><label>Data</label><input id="ad" type="date" required><label>Descrição, enunciado ou orientações</label><textarea id="ab" required></textarea><button>Publicar atividade</button></form></section>`;
        return h;
    }
    function announcements() {
        let h = '<section class="panel"><h2>Avisos</h2>' + inClass(D.announcements).map(a => `<article class="item"><strong>${E(a.title)}</strong> <small>${fmt(a.date)}</small><p>${E(a.body)}</p>${role === 'professor' ? `<button class="danger" data-action="deleteNotice" data-id="${E(a.id)}">Excluir</button>` : ''}</article>`).join('');
        if (role === 'professor') h += '<h3>Novo aviso</h3><form id="notice-form"><label>Título</label><input id="nt" required><label>Mensagem</label><textarea id="nb" required></textarea><button>Publicar aviso</button></form>';
        return h + '</section>';
    }
    function classes() {
        if (role !== 'professor') return home();
        return `<section class="panel"><h2>Turmas</h2>${D.classes.map(c => `<div class="item"><strong>${E(c.name)}</strong> · ${E(c.subject)} <button class="danger" data-action="deleteClass" data-id="${E(c.id)}">Excluir</button></div>`).join('')}<h3>Nova turma</h3><form id="class-form"><label>Nome</label><input id="cn" required><label>Disciplina</label><input id="cs" required><label>Turno</label><select id="shift"><option>Matutino</option><option>Vespertino</option><option>Noturno</option></select><button>Cadastrar turma</button></form></section>`;
    }
    function students() {
        if (role !== 'professor') return home();
        return `<section class="panel"><h2>Contas de alunos</h2><p class="muted">Os alunos usam usuário e senha individuais. Cadastro local apenas para testes.</p>${D.students.map(s => `<div class="item"><strong>${E(s.name)}</strong> · Usuário: ${E(s.username)}<p class="muted">Turmas: ${(s.classIds || []).map(id => E(D.classes.find(c => c.id === id)?.name || 'Turma excluída')).join(', ') || 'Nenhuma'}</p><button class="danger" data-action="deleteStudent" data-id="${E(s.id)}">Excluir aluno</button></div>`).join('')}<h3>Cadastrar aluno</h3><form id="student-create"><label>Nome</label><input id="sn" required><label>Usuário (único)</label><input id="su" required minlength="3" autocomplete="off"><label>Senha (mínimo 8 caracteres)</label><input id="sp" type="password" required minlength="8" autocomplete="new-password"><label>Turmas (Ctrl+clique para selecionar mais de uma)</label><select id="sc" multiple size="5" required>${D.classes.map(c => `<option value="${E(c.id)}">${E(c.name)} — ${E(c.subject)}</option>`).join('')}</select><button>Cadastrar aluno</button></form></section>`;
    }
    $('login-form').addEventListener('submit', e => { e.preventDefault(); if (Auth.checkProfessor(val('password'))) { $('password').value = ''; enter('professor') } else notice('Senha do professor incorreta.') });
    $('student-form').addEventListener('submit', e => { e.preventDefault(); const u = val('student-user').toLowerCase(), p = val('student-password'); const s = D.students.find(x => x.username === u && x.passwordHash === Auth.hash(p)); if (s) { $('student-password').value = ''; enter('aluno', s) } else notice('Usuário ou senha de aluno incorretos.') });
    $('logout').addEventListener('click', () => { role = ''; student = null; editId = null; $('workspace').hidden = true; $('welcome').hidden = false; $('role-label').textContent = 'Versão 2.2 · Site de testes'; notice('Você saiu da conta.') });
    $('class-select').addEventListener('change', e => { classId = e.target.value; render() });
    document.addEventListener('click', e => {
        const b = e.target.closest('button[data-action]'); if (!b) return; const a = b.dataset.action, id = b.dataset.id;
        if (a === 'tab') { page = b.dataset.page; editId = null; render(); return }
        if (role !== 'professor') return;
        if (a === 'editContent') { const c = D.contents.find(x => x.id === id); if (!c) return; editId = id; render(); $('ct').value = c.title; $('cd').value = c.date; $('cb').value = c.body; $('ct').focus() }
        if (a === 'cancelEdit') { editId = null; render() }
        if (a === 'deleteContent' && confirm('Excluir conteúdo?')) { D.contents = D.contents.filter(x => x.id !== id); save('Conteúdo excluído.') }
        if (a === 'deleteActivity' && confirm('Excluir atividade?')) { D.activities = D.activities.filter(x => x.id !== id); save('Atividade excluída.') }
        if (a === 'deleteNotice' && confirm('Excluir aviso?')) { D.announcements = D.announcements.filter(x => x.id !== id); save('Aviso excluído.') }
        if (a === 'deleteStudent' && confirm('Excluir conta deste aluno?')) { D.students = D.students.filter(x => x.id !== id); save('Conta excluída.') }
        if (a === 'deleteClass' && confirm('Excluir turma e seus materiais?')) { D.classes = D.classes.filter(x => x.id !== id); D.contents = D.contents.filter(x => x.classId !== id); D.activities = D.activities.filter(x => x.classId !== id); D.announcements = D.announcements.filter(x => x.classId !== id); D.students.forEach(s => s.classIds = s.classIds.filter(x => x !== id)); save('Turma excluída.') }
    });
    document.addEventListener('submit', e => {
        const f = e.target; if (!['content-form', 'activity-form', 'class-form', 'notice-form', 'student-create'].includes(f.id)) return; e.preventDefault(); if (role !== 'professor') return;
        if (f.id === 'content-form') { const item = { id: editId || Store.id(), classId, title: val('ct'), date: val('cd'), body: val('cb') }; if (!item.title || !item.date || !item.body) return; const i = D.contents.findIndex(x => x.id === editId); if (i >= 0) D.contents[i] = item; else D.contents.push(item); editId = null; save('Conteúdo salvo.') }
        if (f.id === 'activity-form') { D.activities.push({ id: Store.id(), classId, title: val('at'), date: val('ad'), body: val('ab') }); save('Atividade publicada.') }
        if (f.id === 'class-form') { const c = { id: Store.id(), name: val('cn'), subject: val('cs'), shift: val('shift') }; D.classes.push(c); classId = c.id; save('Turma cadastrada.') }
        if (f.id === 'notice-form') { D.announcements.push({ id: Store.id(), classId, title: val('nt'), body: val('nb'), date: new Date().toISOString().slice(0, 10) }); save('Aviso publicado.') }
        if (f.id === 'student-create') { const username = val('su').toLowerCase(), password = val('sp'), selected = [...$('sc').selectedOptions].map(x => x.value); if (D.students.some(x => x.username === username)) { notice('Esse usuário já existe.'); return } if (password.length < 8 || selected.length === 0) { notice('Senha com 8+ caracteres e ao menos uma turma são obrigatórias.'); return } D.students.push({ id: Store.id(), name: val('sn'), username, passwordHash: Auth.hash(password), classIds: selected }); save('Aluno cadastrado.') }
    });
})();