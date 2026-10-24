/* Contrato 1.0: nunca corrige silenciosamente perguntas ou gabaritos. */
(function(root) {
'use strict';
const types=['single','multiple','true_false','incorrect','fill_blank'];
const filled=v=>typeof v==='string' && v.trim().length>0;
function validate(data) {
 const errors=[];
 if (!data || typeof data!=='object' || Array.isArray(data)) return ['O JSON deve conter um objeto de avaliação.'];
 if(data.version!=='1.0') errors.push('A versão deve ser "1.0".');
 if(!filled(data.title)) errors.push('Informe o título.');
 if(!filled(data.sourceDocument)) errors.push('Informe sourceDocument.');
 // Aceita a omissão de questionCount do exemplo original; o prompt sempre inclui o campo.
 if(data.questionCount!==undefined && data.questionCount!==25) errors.push('questionCount deve ser 25.');
 if(!Array.isArray(data.questions)) return [...errors,'questions deve ser uma lista.'];
 if(data.questions.length!==25) errors.push('São necessárias exatamente 25 questões; encontradas '+data.questions.length+'.');
 const ids=new Set();
 data.questions.forEach((q,i)=>{
  const err=t=>errors.push('Questão '+(i+1)+': '+t);
  if(!q || typeof q!=='object' || Array.isArray(q)) {err('formato inválido.');return;}
  if(!filled(q.id)) err('ID obrigatório.'); else if(ids.has(q.id)) err('ID duplicado.');
  ids.add(q.id);
  if(!types.includes(q.type)) err('tipo inválido.');
  if(!['easy','medium','hard'].includes(q.difficulty)) err('difficulty deve ser easy, medium ou hard.');
  if(!filled(q.topic)) err('assunto obrigatório.');
  if(!filled(q.statement)) err('enunciado obrigatório.');
  if(!filled(q.explanation)) err('explicação obrigatória.');
  if(q.sourcePage!==null && (!Number.isInteger(q.sourcePage)||q.sourcePage<1)) err('sourcePage deve ser inteiro positivo ou null.');
  if(!Array.isArray(q.options)||q.options.length<2) {err('informe pelo menos duas alternativas.');return;}
  const optionIds=new Set();
  q.options.forEach(o=>{
   if(!o||!filled(o.id)||!filled(o.text)){err('alternativa precisa de ID e texto.');return;}
   if(optionIds.has(o.id)) err('IDs de alternativas duplicados.');
   optionIds.add(o.id);
  });
  if(!Array.isArray(q.correctAnswers)||!q.correctAnswers.length) err('gabarito ausente ou vazio.');
  else {
   if(q.correctAnswers.some(id=>!optionIds.has(id))) err('gabarito contém ID inexistente.');
   if(new Set(q.correctAnswers).size!==q.correctAnswers.length) err('gabarito tem IDs repetidos.');
   if(q.type!=='multiple'&&q.correctAnswers.length!==1) err('seleção única exige uma resposta correta.');
  }
  if(q.type==='true_false') {
   const labels=q.options.map(o=>String(o?.text).trim().toLowerCase());
   if(labels.length!==2||!labels.includes('verdadeiro')||!labels.includes('falso')) err('use exatamente "Verdadeiro" e "Falso".');
  }
 });
 return errors;
}
function parse(text) {
 if(typeof text!=='string'||text.length>2000000) throw new Error('O JSON deve ter até 2 MB.');
 let data; try{data=JSON.parse(text);}catch{throw new Error('JSON inválido. Cole somente JSON, sem Markdown, comentários ou texto adicional.');}
 const errors=validate(data); if(errors.length) throw new Error(errors.join('\n'));
 return data;
}
root.QuizValidation={validate,parse};
})(globalThis);
