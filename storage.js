/* Persistência local: não compartilha dados entre dispositivos. */
window.Store = (function(){
  'use strict';
  const KEY = 'minha-sala-digital-v21';
  const defaults = () => ({
    classes:[{id:'t1',name:'7º ano A',subject:'História',shift:'Matutino'},{id:'t2',name:'2º ano EM',subject:'História',shift:'Vespertino'}],
    contents:[{id:'c1',classId:'t1',title:'Expansão marítima',body:'Introdução às grandes navegações e às rotas comerciais europeias.',date:'2026-10-12'}],
    activities:[{id:'a1',classId:'t1',title:'Grandes Navegações',question:'Qual país iniciou as grandes navegações europeias?',options:['Portugal','Japão','Canadá'],correct:0,due:''}],
    submissions:[], announcements:[], students:[]
  });
  let data;
  try { const parsed=JSON.parse(localStorage.getItem(KEY)); data=parsed && Array.isArray(parsed.classes) && Array.isArray(parsed.contents) && Array.isArray(parsed.activities) && Array.isArray(parsed.submissions) ? parsed : defaults(); }
  catch(e){data=defaults();}
  if(!Array.isArray(data.announcements))data.announcements=[];
  if(!Array.isArray(data.students))data.students=[];
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch(e){return false}}
  function id(){return 'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
  function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  return {data,save,id,escape};
})();
