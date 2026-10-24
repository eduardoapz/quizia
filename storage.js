(function(root){
'use strict'; const KEY='quizia.session.v1';
function save(payload){try{sessionStorage.setItem(KEY,JSON.stringify(payload));return true;}catch{return false;}}
function clear(){try{sessionStorage.removeItem(KEY);}catch{}}
function load(){
 let raw;try{raw=sessionStorage.getItem(KEY);}catch{return {error:'Armazenamento bloqueado. Não será possível recuperar a prova ao atualizar a página.'};}
 if(!raw)return {};
 try{
 const p=JSON.parse(raw),s=p.state;
 if(s){
 if(root.QuizValidation.validate(s.quiz).length||!['active','finished'].includes(s.status)||!Number.isFinite(s.startedAt)||!Number.isFinite(s.endsAt)||s.endsAt-s.startedAt!==root.QuizEngine.DURATION||(s.status==='finished'&&(!Number.isFinite(s.finishedAt)||s.finishedAt<s.startedAt||s.finishedAt>s.endsAt))||!s.answers||typeof s.answers!=='object'||Array.isArray(s.answers))throw new Error();
 for(const [id,values] of Object.entries(s.answers)){
 const q=s.quiz.questions.find(q=>q.id===id);
 if(!q||!Array.isArray(values)||values.some(v=>!q.options.some(o=>o.id===v))||new Set(values).size!==values.length||(q.type!=='multiple'&&values.length>1))throw new Error();
 }
 }
 return p;
 }catch{clear();return {error:'A avaliação interrompida contém dados locais inválidos. Importe novamente o JSON para começar.'};}
}
root.QuizStorage={save,load,clear};
})(globalThis);
