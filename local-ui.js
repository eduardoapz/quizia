/* Browser UI for local PDF generation; independent from imported JSON flow. */
(function(root){
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api,cache=null,controller=null,revision=0,draft=null,pool=[],excluded=[],lastFile=null;
const labels={single:'Conceito',fill_blank:'Completar trecho',true_false:'Verdadeiro ou falso'};
function message(text,error=false){const el=$('local-message');if(el){el.textContent=text;el.className='local-message'+(error?' error':'');}}
function invalidate(){
 revision++;controller?.abort();controller=null;cache=null;draft=null;pool=[];lastFile=null;excluded=[];
 $('local-review')?.remove();$('question-editor')?.remove();
 if($('local-generate'))$('local-generate').disabled=false;
 if($('local-cancel'))$('local-cancel').hidden=true;
 if($('read-progress'))$('read-progress').hidden=true;
 message('Selecione um PDF com texto para começar.');
}
function mount(config){
 api=config;const section=document.querySelector('.import-panel');if(!section)return;
 const old=document.createElement('div');old.id='import-content';
 while(section.firstChild)old.append(section.firstChild);
 section.append(old);old.hidden=true;
 const tabs=document.createElement('div');tabs.className='mode-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Como preparar o questionário');
 tabs.innerHTML='<button id="mode-local" class="active" aria-pressed="true">Gerar do PDF</button><button id="mode-json" aria-pressed="false">Importar JSON</button>';section.prepend(tabs);
 const local=document.createElement('div');local.id='local-panel';old.before(local);
 local.innerHTML='<div class="section-heading"><span class="step">02</span><div><h2>Do documento à prática.</h2><p>Questões geradas aqui, no seu navegador.</p></div></div>'+
 '<span class="local-tag">SEM API · SEM ENVIO DO PDF</span><p class="local-intro">Transforme definições, valores e orientações do seu material em exercícios com referência de página.</p>'+
 '<div class="local-settings"><label>Foco da revisão<select id="local-focus"><option value="balanced">Misto: conceitos e fatos</option><option value="concepts">Conceitos e definições</option><option value="facts">Valores, prazos e procedimentos</option></select></label>'+
 '<div class="page-range"><label>Da página<input id="page-from" type="number" min="1" max="200" value="1"></label><label>Até a página<input id="page-to" type="number" min="1" max="200" placeholder="Última"></label></div></div>'+
 '<button id="local-generate" class="local-primary">Gerar 25 questões <span>✦</span></button><button id="local-cancel" class="text-button" hidden>Cancelar leitura</button>'+
 '<div id="local-message" class="local-message" role="status" aria-live="polite">Selecione um PDF com texto para começar.</div><progress id="read-progress" max="1" value="0" hidden aria-label="Páginas lidas"></progress>'+
 '<div class="local-note"><strong>Revisão factual, com transparência.</strong><p>O gerador usa regras, não uma IA. As questões se apoiam em trechos explícitos; não avaliam interpretação profunda. Você poderá revisar, editar e trocar perguntas antes da prova.</p><small>Até 200 páginas e 50 MB. PDFs escaneados precisam de OCR. Tabelas e diagramações complexas podem exigir revisão.</small></div>'+
 '<p class="local-demo">Quer experimentar? <button class="text-button" id="local-demo">Usar PDF de demonstração →</button></p>';
 function mode(localMode){
  local.hidden=!localMode;old.hidden=localMode;
  $('mode-local').classList.toggle('active',localMode);$('mode-json').classList.toggle('active',!localMode);
  $('mode-local').setAttribute('aria-pressed',String(localMode));$('mode-json').setAttribute('aria-pressed',String(!localMode));
  if(!localMode){controller?.abort();$('local-review')?.remove();}else if(draft)renderReview();
 }
 $('mode-local').onclick=()=>mode(true);$('mode-json').onclick=()=>mode(false);
 $('local-generate').onclick=generate;
 $('local-cancel').onclick=()=>controller?.abort();
 $('local-demo').onclick=async()=>{
  const button=$('local-demo');button.disabled=true;
  try{
   message('Abrindo o material fictício de demonstração…');
   const response=await fetch(new URL('material-demonstracao.pdf',document.baseURI));if(!response.ok)throw new Error();
   const blob=await response.blob();await api.selectPdf(new File([blob],'material-demonstracao.pdf',{type:'application/pdf'}));
   message('Material de demonstração selecionado. Clique em Gerar 25 questões.');
  }catch{message('Não foi possível abrir a demonstração. Tente novamente ou selecione seu próprio PDF.',true);}
  finally{button.disabled=false;}
 };
 // ChatGPT remains an optional path. Existing handlers stay attached.
 const generation=document.querySelector('.generation');
 if(generation&&!generation.parentElement.classList.contains('chatgpt-optional')){
  const details=document.createElement('details');details.className='chatgpt-optional';const summary=document.createElement('summary');
  summary.textContent='Prefere questões elaboradas pelo ChatGPT?';details.append(summary);generation.before(details);details.append(generation);
 }
 if(draft)renderReview();
}
async function generate(){
 const file=api.getPdf();
 if(!file){message('Selecione novamente o PDF. O arquivo não fica salvo após recarregar a página.',true);document.getElementById('dropzone')?.focus();return;}
 const start=Number($('page-from').value),endText=$('page-to').value,end=endText?Number(endText):null;
 if(!Number.isInteger(start)||start<1||start>200||(end!==null&&(!Number.isInteger(end)||end<start||end>200))){message('Informe um intervalo válido de páginas entre 1 e 200.',true);return;}
 const token=++revision;controller?.abort();const own=new AbortController();controller=own;
 const button=$('local-generate');button.disabled=true;$('local-cancel').hidden=false;$('read-progress').hidden=false;
 try{
  if(!cache||lastFile!==file){
   cache=await QuizPDF.read(file,{signal:own.signal,onProgress:p=>{
    if(token!==revision)return;
    message(p.total?p.stage+' · página '+p.current+' de '+p.total:p.stage);
    if(p.total){$('read-progress').max=p.total;$('read-progress').value=p.current;}
   }});
   lastFile=file;
  }
  if(token!==revision||own.signal.aborted)return;
  if(start>cache.pages.length||(end!==null&&end>cache.pages.length))throw new Error('O documento tem '+cache.pages.length+' páginas. Ajuste o intervalo escolhido.');
  const selected=cache.pages.filter(p=>p.number>=start&&p.number<=(end??cache.pages.length));
  message('Selecionando fatos, alternativas e referências…');
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  if(token!==revision||own.signal.aborted)return;
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  const result=QuizRules.generate(selected,{seed,focus:$('local-focus').value,excluded,name:file.name});
  if(!result.quiz){
   draft=null;$('local-review')?.remove();
   message('Encontrei '+result.selected.length+' questões utilizáveis de 25 necessárias. Não vou repetir perguntas nem completar com conteúdo sem apoio. Amplie o intervalo, escolha o foco misto ou use um PDF com mais definições e fatos explícitos.'+(excluded.length?' As questões da prova anterior foram excluídas.':''),true);
   return;
  }
  const errors=QuizValidation.validate(result.quiz);if(errors.length)throw new Error(errors.join('\n'));
  draft=result.quiz;pool=result.pool;draft.generationStats=result.stats;
  draft.generationWarnings={empty:cache.empty.filter(n=>n>=start&&n<=(end??cache.pages.length)),complex:cache.complex.filter(n=>n>=start&&n<=(end??cache.pages.length))};
  message('25 questões preparadas a partir de '+result.stats.coveredPages+' páginas. Revise abaixo ou inicie a avaliação.');
  renderReview();$('local-review').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){
  if(token===revision)message(error.name==='AbortError'?'Leitura cancelada. Você pode tentar novamente.':error.message||'Não foi possível processar o arquivo.',error.name!=='AbortError');
 }finally{
  if(token===revision){button.disabled=false;$('local-cancel').hidden=true;$('read-progress').hidden=true;controller=null;}
 }
}
function renderReview(){
 if(!draft)return;
 let section=$('local-review');
 if(!section){section=document.createElement('section');section.id='local-review';section.className='local-review';document.querySelector('.workspace').after(section);}
 const stats=draft.generationStats,warnings=draft.generationWarnings;
 const counts=draft.questions.reduce((a,q)=>(a[q.type]=(a[q.type]||0)+1,a),{});
 section.innerHTML='<div class="review-top"><div><span class="eyebrow">PRONTO PARA PRATICAR</span><h2>Seu questionário nasceu do seu material.</h2><p>25 questões · '+stats.coveredPages+' páginas consultadas · '+esc(draft.sourceDocument)+'</p></div><span class="ready-pill">✓ Referências incluídas</span></div>'+
 '<div class="rule-counts">'+Object.entries(counts).map(([type,n])=>'<span>'+n+' '+esc(labels[type]||type)+'</span>').join('')+'</div>'+
 (warnings.empty.length?'<p class="source-warning">Páginas com pouco ou nenhum texto: '+warnings.empty.join(', ')+'. Imagens e páginas escaneadas não foram interpretadas.</p>':'')+
 (warnings.complex.length?'<p class="source-warning">Diagramação complexa detectada nas páginas '+warnings.complex.join(', ')+'. Confira os trechos e a ordem de leitura antes de usar.</p>':'')+
 '<p class="review-disclosure">Esta é uma revisão factual por regras. Abra uma questão para conferir o gabarito e o trecho original; isso revela a resposta antes da prova. Edite ou troque o que precisar.</p>'+
 '<div class="review-toolbar"><button id="local-start">Iniciar avaliação · 45 min →</button><button id="local-download" class="secondary">Baixar questionário JSON</button><button id="local-back" class="text-button">Voltar à preparação</button></div>'+
 '<div id="review-message" role="status" class="local-message"></div>'+
 '<div class="draft-list">'+draft.questions.map((q,i)=>'<details class="draft-item" data-index="'+i+'"><summary><span class="draft-number">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(q.statement)+'</span><small>Pág. '+q.sourcePage+'</small></summary>'+
 '<div class="draft-body"><div class="draft-meta">'+esc(labels[q.type]||q.type)+' · '+esc(q.topic)+(q.edited?' · Editada por você':'')+'</div><ul class="draft-options">'+q.options.map(o=>'<li class="'+(q.correctAnswers.includes(o.id)?'draft-correct':'')+'">'+(q.correctAnswers.includes(o.id)?'✓ ':'')+esc(o.text)+'</li>').join('')+'</ul>'+
 '<blockquote><span>FONTE · PÁGINA '+q.sourcePage+'</span>'+esc(q.evidence)+'</blockquote><p class="draft-explanation">'+esc(q.explanation)+'</p><div class="draft-actions"><button class="secondary" data-edit="'+i+'">Editar questão</button><button class="secondary" data-swap="'+i+'">Trocar questão</button></div></div></details>').join('')+'</div>';
 $('local-start').onclick=()=>{
  const errors=QuizValidation.validate(draft);if(errors.length){$('review-message').textContent=errors.join('\n');return;}
  const quiz=structuredClone(draft);$('local-review')?.remove();api.start(quiz);
 };
 $('local-back').onclick=()=>{$('local-review')?.remove();document.querySelector('.workspace').scrollIntoView({behavior:'smooth'});};
 $('local-download').onclick=()=>{
  const blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='quizia-revisao.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 section.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.edit)));
 section.querySelectorAll('[data-swap]').forEach(b=>b.onclick=()=>swap(Number(b.dataset.swap)));
}
function swap(index){
 const used=new Set([...excluded,...draft.questions.map(q=>q.sourceKey)]);
 const replacement=pool.find(q=>!used.has(q.sourceKey));
 if(!replacement){$('review-message').textContent='Não há outra questão inédita disponível neste conjunto. Você pode editar a pergunta ou gerar a partir de mais páginas.';return;}
 const old=draft.questions[index];excluded.push(old.sourceKey);
 draft.questions[index]={...structuredClone(replacement),id:old.id};draft.generationStats.coveredPages=new Set(draft.questions.map(q=>q.sourcePage)).size;
 renderReview();const item=$('local-review').querySelector('[data-index="'+index+'"]');item.open=true;item.scrollIntoView({block:'nearest'});$('review-message').textContent='Questão '+(index+1)+' substituída por outro trecho do documento.';
}
function edit(index){
 $('question-editor')?.remove();const q=draft.questions[index],dialog=document.createElement('dialog');dialog.id='question-editor';dialog.className='question-editor';
 dialog.innerHTML='<span class="eyebrow">REVISAR QUESTÃO '+(index+1)+'</span><h2>Ajuste com o documento em mãos.</h2><blockquote><span>FONTE · PÁGINA '+q.sourcePage+'</span>'+esc(q.evidence)+'</blockquote>'+
 '<label>Enunciado<textarea id="edit-statement" rows="3">'+esc(q.statement)+'</textarea></label>'+
 '<p class="micro">Marque a alternativa correta. O tipo desta questão é '+esc(labels[q.type]||q.type)+'.</p>'+
 q.options.map((o,j)=>'<div class="edit-option"><input type="'+(q.type==='multiple'?'checkbox':'radio')+'" name="edit-answer" value="'+j+'" aria-label="Alternativa '+(j+1)+' correta" '+(q.correctAnswers.includes(o.id)?'checked':'')+'><label>Alternativa '+(j+1)+'<textarea data-edit-option="'+j+'" rows="2" '+(q.type==='true_false'?'readonly':'')+'>'+esc(o.text)+'</textarea></label></div>').join('')+
 '<label>Explicação<textarea id="edit-explanation" rows="3">'+esc(q.explanation)+'</textarea></label><p id="edit-error" role="alert"></p><div class="actions"><button id="edit-cancel" class="secondary">Cancelar</button><button id="edit-save">Salvar revisão</button></div>';
 document.body.append(dialog);dialog.showModal();$('edit-cancel').onclick=()=>dialog.close();
 $('edit-save').onclick=()=>{
  const updated=structuredClone(q);updated.statement=$('edit-statement').value.trim();updated.explanation=$('edit-explanation').value.trim();
  updated.options.forEach((o,j)=>o.text=dialog.querySelector('[data-edit-option="'+j+'"]').value.trim());
  updated.correctAnswers=[...dialog.querySelectorAll('input[name="edit-answer"]:checked')].map(i=>updated.options[Number(i.value)].id);
  const proposal=structuredClone(draft);proposal.questions[index]=updated;
  const errors=QuizValidation.validate(proposal);
  if(new Set(updated.options.map(o=>QuizRules.key(o.text))).size!==updated.options.length)errors.push('As alternativas devem ter textos diferentes.');
  if(errors.length){$('edit-error').textContent=errors.join('\n');return;}
  updated.edited=true;draft.questions[index]=updated;dialog.close();renderReview();$('local-review').querySelector('[data-index="'+index+'"]').open=true;
 };
}
function newRound(keys){
 draft=null;excluded=keys.filter(Boolean);$('local-review')?.remove();
 if($('local-panel')){$('local-panel').hidden=false;$('import-content').hidden=true;}
 message('Gere outra avaliação com o mesmo PDF. Os trechos da prova anterior serão excluídos.');
}
root.QuizLocalUI={mount,invalidate,newRound};
})(globalThis);

