
/* A importação de JSON é a fronteira para futuras integrações de IA. */
(function(){
'use strict';
const $=id=>document.getElementById(id),app=$('app'),E=QuizEngine,T=QuizTimer;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=null,pdf=null,pdfFile=null,ready=null,previous=[],interval=null,lastError='',rawJSON='',storageWarned=false,importToken=0,pdfToken=0;
const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 14h8M8 18h5"/></svg>';
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function persist(){if(!QuizStorage.save({state,pdf,previous})&&!storageWarned){storageWarned=true;notice('Não foi possível salvar no navegador. Mantenha esta página aberta: uma atualização pode perder a avaliação.');}}
function home(){
 clearInterval(interval);app.onchange=null;document.body.classList.remove('in-quiz');
 app.innerHTML=`
 <section class="hero"><div class="eyebrow"><span class="mini-star">✦</span> APRENDA COM O SEU PRÓPRIO MATERIAL</div><h1>Transforme seu conhecimento<br>em <span>resultados.</span></h1><p>Seu material de estudo, uma nova forma de aprender.<br>Prepare seu questionário e descubra o quanto você já sabe.</p><div class="facts"><span>◎ &nbsp;25 questões</span><span>◷ &nbsp;45 minutos</span><span>✓ &nbsp;Correção com explicações</span></div></section>
 <section class="workspace" aria-label="Preparar avaliação"><div class="flow-tabs"><span class="active"><b>1</b> Seu material</span><span><b>2</b> Gere na plataforma</span><span><b>3</b> Revise e comece</span></div>
 <div class="workspace-body"><section class="material"><div class="section-heading"><span class="step">01</span><div><h2>Comece pelo seu PDF</h2><p>Escolha o conteúdo que você quer dominar.</p></div></div>
 <input type="file" id="pdf-input" accept=".pdf,application/pdf" class="visually-hidden">
 <button id="dropzone" class="dropzone" aria-label="Selecionar PDF"><span class="file-icon">${icon}</span><strong>Arraste seu PDF até aqui</strong><span>ou <u>selecione um arquivo</u></span><small>Documento PDF até 50 MB</small></button>
 <div id="pdf-selected" class="selected-file" hidden><span class="file-icon small">${icon}</span><div><strong id="pdf-name"></strong><small id="pdf-size"></small></div><button id="remove-pdf" class="icon-button" aria-label="Remover PDF">×</button></div>
 <div class="privacy"><span>♧</span><p>Seu PDF fica no seu dispositivo.<br>Nenhum arquivo é enviado automaticamente.</p></div>
 <div class="generation"><span class="eyebrow">PRÓXIMO PASSO</span><h3>Leve seu material ao ChatGPT</h3><p>Copie o prompt, anexe o PDF no ChatGPT e aguarde o questionário em JSON. Depois, volte aqui para importar.</p><button id="generate">Copiar prompt e abrir ChatGPT <span>↗</span></button><p class="micro">A geração usa sua própria conta, sujeita aos limites do plano gratuito. Não há integração automática.</p><a id="open-chat" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" hidden>Abrir ChatGPT manualmente ↗</a></div></section>
 <section class="import-panel"><div class="section-heading"><span class="step">02</span><div><h2>Seu questionário, pronto para usar</h2><p>Aceita JSON compacto v2 e o formato original v1.</p></div></div><label for="json-text" class="text-label">Cole o JSON do questionário</label><textarea id="json-text" spellcheck="false" placeholder='{ "v": 2, "titulo": "...", "questoes": [...] }'></textarea><div class="import-actions"><button id="validate-json" class="secondary">Validar JSON</button><span>ou</span><label class="file-button" for="json-input">↑ Importar arquivo .json</label><input id="json-input" class="visually-hidden" type="file" accept=".json,application/json"></div>
 <div id="validation" role="status" class="validation">○ Aguardando seu questionário</div><button id="repair" class="text-button" hidden>Copiar prompt para corrigir o JSON</button><div class="start-block"><button id="start" disabled>Iniciar avaliação <span>→</span></button><p>O cronômetro começa apenas quando você iniciar.</p></div><div class="tip"><strong>Primeira vez por aqui?</strong><p>Experimente a interface com 25 questões fictícias.</p><span class="demo-note">Importe o arquivo <a href="demo-compacto.json" download>demo-compacto.json ↓</a> incluído no projeto.</span></div></section></div></section>
 <section class="how"><div><span>01 / PREPARE</span><h3>O conteúdo é seu.</h3><p>Use apostilas, manuais ou materiais de estudo em PDF.</p></div><div><span>02 / PRATIQUE</span><h3>Aprenda fazendo.</h3><p>Responda no seu ritmo, com tudo em uma única página.</p></div><div><span>03 / EVOLUA</span><h3>Entenda cada resposta.</h3><p>Veja a correção completa e retome o que precisa de atenção.</p></div></section>`;
 updatePdf();
 $('pdf-input').onchange=e=>choosePdf(e.target.files[0]);
 const drop=$('dropzone');drop.onclick=()=>$('pdf-input').click();
 drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};
 drop.ondragleave=()=>drop.classList.remove('dragging');
 drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');choosePdf(e.dataTransfer.files[0]);};
 $('remove-pdf').onclick=()=>{++pdfToken;QuizLocalUI.invalidate();pdf=null;pdfFile=null;ready=null;previous=[];$('pdf-input').value='';resetValidation();updatePdf();persist();};
 $('generate').onclick=()=>{if(!pdf){notice('Selecione um PDF antes de copiar o prompt.');drop.focus();return;}copy(QuizPrompt.master(pdf.name,previous),true);};
 $('validate-json').onclick=()=>importQuiz($('json-text').value);
 $('json-input').onchange=async e=>{
  const file=e.target.files[0];if(!file){notice('Nenhum arquivo JSON selecionado.');return;}
  resetValidation();
  if(file.size>2000000){rawJSON='';showError('O arquivo JSON deve ter até 2 MB.');return;}
  try{const text=await file.text();$('json-text').value=text;await importQuiz(text);}catch{showError('Erro ao ler o arquivo. Selecione um JSON acessível.');}
  e.target.value='';
 };
 $('json-text').oninput=resetValidation;
 $('repair').onclick=()=>copy(QuizPrompt.repair(rawJSON,lastError),false);
 $('start').onclick=()=>{if(ready)begin(ready);};
 QuizLocalUI.mount({getPdf:()=>pdfFile,selectPdf:choosePdf,start:begin});
}
function updatePdf(){
 if(!$('pdf-name'))return;
 $('pdf-selected').hidden=!pdf;$('dropzone').classList.toggle('compact',!!pdf);
 if(pdf){$('pdf-name').textContent=pdf.name;$('pdf-size').textContent=(pdf.size/1024/1024).toFixed(2)+' MB PDF selecionado';}
}
async function choosePdf(file){
 const token=++pdfToken;
 if(!file){notice('Nenhum arquivo selecionado.');return;}
 if(!/\.pdf$/i.test(file.name)||file.size>50*1024*1024||file.size<5){notice('PDF inválido. Escolha um arquivo .pdf de até 50 MB.');return;}
 try{
  const signature=await file.slice(0,1024).text();if(token!==pdfToken)return;
  if(!signature.includes('%PDF-')){notice('PDF inválido: a assinatura do documento não foi encontrada.');return;}
  QuizLocalUI.invalidate();pdfFile=file;pdf={name:file.name,size:file.size};ready=null;previous=[];resetValidation();updatePdf();persist();notice('PDF selecionado. Gere as questões diretamente na plataforma.');
 }catch{notice('Não foi possível ler o PDF. Selecione novamente.');}
}
function resetValidation(){++importToken;ready=null;if($('start')){$('start').disabled=true;$('validation').className='validation';$('validation').textContent='Aguardando validação do questionário';$('repair').hidden=true;}}
function showError(message){ready=null;lastError=message;if($('validation')){$('validation').textContent=message;$('validation').className='validation error';$('start').disabled=true;$('repair').hidden=false;}}
async function importQuiz(text){
 resetValidation();rawJSON=text;
 if(!text.trim()){showError('Cole o JSON ou selecione um arquivo antes de validar.');return;}
 const token=importToken,loader=document.createElement('div');loader.className='loading';loader.setAttribute('role','status');
 loader.innerHTML='<span class="spinner"></span><h2>Preparando sua avaliação...</h2><p>Validando as questões e organizando as alternativas.</p>';document.body.append(loader);
 // Permite apresentar o estado de validação sem inventar percentuais.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 try{
  const data=QuizValidation.parse(text);if(token!==importToken)return;
  ready=data;$('validation').className='validation success';$('validation').textContent='✓ '+data.title+' — 25 questões validadas. Tudo pronto!';$('start').disabled=false;$('repair').hidden=true;notice('');
 }catch(error){if(token===importToken)showError(error.message);}
 finally{loader.remove();}
}
async function copy(text,open){
 if(open){window.open('https://chatgpt.com/','_blank','noopener,noreferrer');if($('open-chat'))$('open-chat').hidden=false;}
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
  else{const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok)throw new Error();}
  notice(open?'Prompt copiado! Cole no ChatGPT e anexe o PDF. Depois importe o JSON aqui.':'Prompt de correção copiado. Cole no ChatGPT junto com o PDF original.');
 }catch{$('copy-text').value=text;$('copy-dialog').showModal();$('copy-text').focus();$('copy-text').select();}
}
function begin(quiz){state=E.start(quiz);ready=null;notice('');persist();renderQuiz();window.scrollTo(0,0);}
const typeNames={single:'Selecione uma alternativa',multiple:'Selecione todas as corretas',true_false:'Verdadeiro ou falso',incorrect:'Selecione a alternativa incorreta',fill_blank:'Selecione para completar'};
const difficulties={easy:'Fácil',medium:'Média',hard:'Difícil'};
function questionCard(q,index,detail){
 const review=!!detail,selected=E.selected(state,q.id);
 return `<article class="question-card ${review?(detail.correct?'was-correct':'was-incorrect'):''}"><div class="question-meta"><span class="eyebrow">QUESTÃO ${String(index+1).padStart(2,'0')}</span><span class="topic">${esc(q.topic)} ${difficulties[q.difficulty] ? '· '+difficulties[q.difficulty] : ''}</span>${review?'<strong class="'+(detail.correct?'green':'red')+'">'+(detail.unanswered?'Não respondida':detail.correct?'✓ Acertou':'✕ Errou')+'</strong>':''}</div>
 <fieldset ${review?'disabled':''}><legend>${esc(q.statement)}</legend><p class="question-help">${typeNames[q.type]}</p><div class="options">${q.options.map((o,j)=>{
 const isSelected=selected.includes(o.id),right=review&&q.correctAnswers.includes(o.id),wrong=review&&isSelected&&!right;
 return `<label class="option ${isSelected?'selected':''} ${right?'correct':''} ${wrong?'wrong':''}"><input type="${q.type==='multiple'?'checkbox':'radio'}" name="question-${index}" data-question="${index}" data-option="${j}" ${isSelected?'checked':''}><span class="letter">${String.fromCharCode(65+j)}</span><span>${esc(o.text)}</span>${right?'<small>✓ Correta</small>':wrong?'<small>✕ Sua resposta</small>':''}</label>`;
 }).join('')}</div></fieldset>${review?`<div class="explanation"><strong>${detail.unanswered?'Você não respondeu.':'Sua resposta: '+esc(selected.map(id=>q.options.find(o=>o.id===id).text).join(' • '))}</strong><p><b>Gabarito:</b> ${esc(q.options.filter(o=>q.correctAnswers.includes(o.id)).map(o=>o.text).join(' • '))}</p><p>${esc(q.explanation)}</p><small>${q.sourcePage?'Referência: página '+q.sourcePage+' do PDF':'Página de referência não informada.'}</small></div>`:''}</article>`;
}
function renderQuiz(){
 document.body.classList.add('in-quiz');
 app.innerHTML=`<div class="exam-header"><div><span class="eyebrow">AVALIAÇÃO EM ANDAMENTO</span><h1>${esc(state.quiz.title)}</h1></div><div class="timer-box"><small>Tempo restante</small><strong id="timer" role="timer"></strong></div><div class="progress-row"><span id="answered"></span><span>25 questões 4 pontos cada</span></div><progress id="progress" max="25" value="0" aria-label="Questões respondidas"></progress></div><section class="question-list">${state.quiz.questions.map((q,i)=>questionCard(q,i)).join('')}<div class="finish-area"><p>Revise suas respostas antes de concluir.</p><button id="finish">FINALIZAR AVALIAÇÃO →</button></div></section>`;
 app.onchange=e=>{
 const input=e.target;if(!input.matches('input[data-question]'))return;
 const q=state.quiz.questions[Number(input.dataset.question)],o=q.options[Number(input.dataset.option)];
 if(!E.answer(state,q.id,o.id,input.checked)){tick();return;}
 input.closest('.options').querySelectorAll('.option').forEach(label=>label.classList.toggle('selected',label.querySelector('input').checked));persist();updateProgress();
 };
 $('finish').onclick=()=>{
 tick();if(state.status!=='active')return;const n=E.count(state);
 $('confirm-summary').textContent=n+' respondidas '+(25-n)+' sem resposta '+T.format(T.remaining(state.endsAt))+' restantes';
 $('confirm-warning').textContent=n===0?'Você ainda não respondeu nenhuma questão. Finalizar agora resultará em zero pontos.':n<25?'As questões sem resposta serão consideradas incorretas.':'Todas as questões foram respondidas.';$('confirm').showModal();
 };
 updateProgress();clearInterval(interval);tick();if(state.status==='active')interval=setInterval(tick,250);
}
function updateProgress(){if($('answered')){$('answered').textContent=E.count(state)+' de 25 respondidas';$('progress').value=E.count(state);}}
function tick(){if(!state||state.status!=='active')return;const seconds=T.remaining(state.endsAt);if(!seconds){finish(true);return;}if($('timer')){$('timer').textContent=T.format(seconds);$('timer').classList.toggle('urgent',seconds<300);}}
function finish(automatic=false){
 if(!state||state.status!=='active')return;E.finish(state);clearInterval(interval);$('confirm').close();persist();renderResults();window.scrollTo(0,0);
 if(automatic)notice('O tempo terminou. A avaliação foi finalizada automaticamente com as respostas registradas.');
}
function renderResults(){
 document.body.classList.remove('in-quiz');app.onchange=null;clearInterval(interval);const result=QuizResults.evaluate(state);
 app.innerHTML=`<section class="result-hero"><span class="eyebrow">MAIS UM PASSO NA SUA EVOLUÇÃO</span><h1>Avaliação concluída!</h1><p>${esc(state.quiz.title)}</p><div class="score-orbit"><strong>${result.score}<small>%</small></strong><span>de aproveitamento</span></div><h2>${result.correct} de 25 questões corretas</h2><div class="result-stats"><div><strong class="green">${result.correct}</strong><span>Acertos</span></div><div><strong class="red">${result.incorrect}</strong><span>Erros*</span></div><div><strong>${result.unanswered}</strong><span>Sem resposta</span></div><div><strong>${T.format(result.seconds)}</strong><span>Tempo utilizado</span></div></div><p class="micro">*Os erros incluem questões sem resposta. Cada acerto vale 4 pontos; sem pontuação parcial.</p><div class="result-actions"><button id="new-questions">Gerar novas questões ↗</button><button class="secondary" id="repeat">Repetir as mesmas questões</button><button class="secondary" id="reset">Carregar outro PDF</button></div></section><section class="question-list"><div class="review-heading"><h2>Sua correção, questão por questão.</h2><p>Entenda os acertos. Aprenda com cada tentativa.</p></div>${result.details.map((d,i)=>questionCard(d.question,i,d)).join('')}</section>`;
 $('repeat').onclick=()=>begin(state.quiz);
 $('reset').onclick=()=>{QuizLocalUI.invalidate();state=null;pdf=null;pdfFile=null;ready=null;previous=[];QuizStorage.clear();notice('');home();window.scrollTo(0,0);};
 $('new-questions').onclick=()=>{if(state.quiz.generator==='rules-1.0'){const keys=state.quiz.questions.map(q=>q.sourceKey);state=null;ready=null;persist();home();QuizLocalUI.newRound(keys);window.scrollTo(0,0);return;}previous=state.quiz.questions.map(q=>q.statement);const name=pdf?.name||state.quiz.sourceDocument;state=null;ready=null;persist();home();window.scrollTo(0,0);copy(QuizPrompt.master(name,previous),true);notice('Solicite 25 novas questões no ChatGPT e importe o novo JSON. Use o mesmo PDF; ele precisa ser anexado manualmente.');};
}
$('confirm-finish').onclick=()=>finish();
$('close-copy').onclick=()=>$('copy-dialog').close();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
window.addEventListener('pageshow',tick);
const saved=QuizStorage.load();state=saved.state||null;
pdf=saved.pdf&&typeof saved.pdf.name==='string'&&Number.isFinite(saved.pdf.size)?saved.pdf:null;
previous=Array.isArray(saved.previous)?saved.previous.filter(x=>typeof x==='string'):[];
if(state){if(state.status==='active'){if(Date.now()>=state.endsAt)finish(true);else{renderQuiz();notice('Avaliação recuperada. Respostas preservadas; o prazo original continua valendo.');}}else renderResults();}else home();
if(saved.error)notice(saved.error);
})();



