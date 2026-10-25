/* PDF.js is loaded only after a local generation request; assets are served by this site. */
(function(root){
'use strict';
let library;
function abortError(){return new DOMException('Leitura cancelada.','AbortError');}
function linesFromItems(items,width){
 const useful=items.filter(i=>typeof i.str==='string'&&i.str.trim()&&Array.isArray(i.transform));
 const rows=[];
 for(const item of useful){
  const y=item.transform[5],x=item.transform[4];
  let row=rows.find(r=>Math.abs(r.y-y)<Math.max(2,Math.abs(item.height||10)*.25));
  if(!row){row={y,items:[]};rows.push(row);}row.items.push({x,end:x+(item.width||0),text:item.str});
 }
 rows.sort((a,b)=>b.y-a.y);
 let splitRows=0;
 for(const r of rows){
  r.items.sort((a,b)=>a.x-b.x);r.parts=[];let text='',end=0,start=0;
  for(const i of r.items){
   if(text&&i.x-end>Math.max(40,width*.075)){r.parts.push({text,x:start});text='';}
   if(!text)start=i.x;
   text+=(text&&i.x-end>1?' ':'')+i.text;end=i.end;
  }
  if(text)r.parts.push({text,x:start});
  if(r.parts.length>1)splitRows++;
 }
 const columnRows=rows.filter(r=>r.parts.length===2&&r.parts[1].x>width*.42&&r.parts[1].x<width*.72);
 const tableLike=rows.filter(r=>r.parts.length>2).length>Math.max(2,rows.length*.2);
 if(tableLike)return {lines:rows.filter(r=>r.parts.length===1).map(r=>r.parts[0].text),complex:true};
 if(columnRows.length>=Math.max(4,rows.length*.3)){
  const left=[],right=[],spanning=[];
  for(const r of rows){if(r.parts.length===2){left.push(r.parts[0].text);right.push(r.parts[1].text);}else if(r.parts[0]){if(r.parts[0].x>width*.42)right.push(r.parts[0].text);else left.push(r.parts[0].text);}}
  return {lines:[...spanning,...left,...right],complex:true};
 }
 return {lines:rows.map(r=>r.parts.map(p=>p.text).join(' ')),complex:splitRows>Math.max(3,rows.length*.35)};
}
async function read(file,{signal,onProgress=()=>{}}={}){
 if(location.protocol==='file:')throw new Error('A geração local de PDF precisa de HTTPS ou do servidor local. Abra o site publicado; a importação de JSON continua disponível.');
 if(signal?.aborted)throw abortError();
 onProgress({stage:'Carregando leitor de PDF…',current:0,total:0});
 try{library??=import(new URL('pdf.min.mjs',document.baseURI).href);var pdfjs=await library;}
 catch{library=null;throw new Error('Não foi possível carregar o leitor de PDF. Confira a conexão e tente novamente.');}
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.min.mjs',document.baseURI).href;
 if(signal?.aborted)throw abortError();
 const bytes=await file.arrayBuffer();
 if(signal?.aborted)throw abortError();
 const task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true,disableFontFace:true,stopAtErrors:true});
 const cancel=()=>{task.destroy().catch(()=>{});};
 signal?.addEventListener('abort',cancel,{once:true});
 let pdf;
 try{
  pdf=await task.promise;
  if(pdf.numPages>200)throw new Error('Este PDF tem '+pdf.numPages+' páginas. Para manter a leitura leve, use um arquivo com até 200 páginas.');
  const pages=[],empty=[],complex=[];let chars=0;
  for(let n=1;n<=pdf.numPages;n++){
   if(signal?.aborted)throw abortError();
   onProgress({stage:'Lendo o documento',current:n,total:pdf.numPages});
   const page=await pdf.getPage(n),content=await page.getTextContent();
   const layout=linesFromItems(content.items,page.getViewport({scale:1}).width);
   const text=layout.lines.join('\n').normalize('NFKC').replace(/\u00ad/g,'');
   chars+=text.length;
   if(chars>1500000)throw new Error('O documento contém texto demais para processar com segurança no navegador. Divida-o em partes menores.');
   if(text.replace(/\s/g,'').length<80)empty.push(n);
   if(layout.complex)complex.push(n);
   pages.push({number:n,text});page.cleanup();
   await new Promise(r=>setTimeout(r,0));
  }
  if(signal?.aborted)throw abortError();
  if(chars<200||empty.length===pages.length)throw new Error('Não encontrei texto selecionável suficiente. Este PDF pode ser escaneado. Use uma versão com texto ou aplique OCR antes de importar.');
  return {pages,empty,complex,characters:chars,name:file.name};
 }catch(error){
  if(signal?.aborted)throw abortError();
  if(error.name==='PasswordException')throw new Error('Este PDF está protegido por senha. Abra-o no seu leitor e salve uma cópia desbloqueada para continuar.');
  if(error.name==='InvalidPDFException'||error.name==='FormatError')throw new Error('Não foi possível interpretar o PDF. Ele pode estar danificado; tente exportá-lo novamente.');
  throw error;
 }finally{signal?.removeEventListener('abort',cancel);await task.destroy().catch(()=>{});}
}
root.QuizPDF={read,linesFromItems};
})(globalThis);

