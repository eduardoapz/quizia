/* QuizIA Rules 1.0 — deterministic, source-grounded factual practice.
   No model, network request or semantic guarantee. Every candidate retains its evidence. */
(function(root){
'use strict';
const norm=s=>String(s).normalize('NFKC').replace(/\u00ad/g,'').replace(/[ \t]+/g,' ').trim();
const key=s=>norm(s).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const words=s=>key(s).split(' ').filter(Boolean);
const unique=list=>[...new Map(list.map(x=>[key(x),x])).values()];
function random(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function shuffle(list,rng){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
const forbidden=/https?:|www\.|@\w|\.{3,}|sumário|índice remissivo|todos os direitos|copyright|referências bibliográficas/i;
const dependent=/^(?:ele|ela|eles|elas|isso|isto|essa|esse|esta|este|esses|essas|estes|estas|também|portanto|assim|além disso|nesse|neste|conforme acima|na figura|na tabela)\b/i;
function passages(pages){
 const repeats=new Map();
 for(const p of pages){for(const line of new Set(p.text.split('\n').map(key).filter(s=>s.length>3&&s.length<100)))repeats.set(line,(repeats.get(line)||0)+1);}
 const found=[],seen=new Set();
 for(const p of pages){
  const lines=p.text.split(/\r?\n/).map(norm).filter(line=>line&&!/^(?:página\s*)?\d+(?:\s*(?:\/|de)\s*\d+)?$/i.test(line)&&!(pages.length>=3&&(repeats.get(key(line))||0)>=Math.max(3,Math.ceil(pages.length*.65))));
  let topic='Página '+p.number,buffer='';
  function emit(value){
   for(const chunk of value.split(/(?<=[.!?;])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\d])/u)){
    const text=norm(chunk).replace(/^[•●▪◦\-–]\s*/,'');
    const k=key(text),n=words(text).length;
    if(text.length<45||text.length>420||n<8||n>72||forbidden.test(text)||dependent.test(text)||/[?]/.test(text)||seen.has(k))continue;
    if((text.match(/[|]/g)||[]).length>1)continue;
    seen.add(k);found.push({text,page:p.number,topic});
   }
  }
  for(const line of lines){
   const heading=line.length>=4&&line.length<=75&&words(line).length<=9&&!/[.!?:;]$/.test(line)&&!/(?:^|\s)(?:é|são|deve|devem|significa|representa|consiste|permite|ocorre|possui|inclui)(?:\s|$)/i.test(line)&&(!buffer||/[.!?;]$/.test(buffer));
   if(heading){if(buffer){emit(buffer);buffer='';}topic=line.replace(/^\d+(?:\.\d+)*[.)]?\s+/,'');continue;}
   if(buffer&&(/[.!?;]$/.test(buffer)||/^[•●▪◦]/.test(line))){emit(buffer);buffer='';}
   if(buffer.length+line.length>600){emit(buffer);buffer='';}
   buffer+=(buffer?' ':'')+line;
  }
  if(buffer)emit(buffer);
 }
 return found;
}
function numericAlternatives(target,all,rng){
 const m=target.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/u);if(!m)return [];
 const number=Number(m[1].replace(',','.')),unit=m[2],decimals=(m[1].split(/[.,]/)[1]||'').length;
 if(!Number.isFinite(number)||number<=0||number>100000000)return [];
 const unitKey=key(unit);
 let alternatives=all.filter(x=>{const a=x.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/u);return a&&key(a[2])===unitKey&&Number(a[1].replace(',','.'))!==number;});
 const step=decimals?1/(10**decimals):Math.max(1,Math.round(number*.15));
 const format=n=>n.toFixed(decimals).replace('.',m[1].includes(',')?',':'.')+(unit?' '+unit:'');
 for(const delta of [-step,step,-2*step,2*step,-3*step,3*step]){
  const n=Number((number+delta).toFixed(decimals));
  if(n>0&&(!unit.includes('%')||n<=100)&&n!==number)alternatives.push(format(n));
 }
 // Compare numeric values too: "10 %" and "10%" must never be distinct answers.
 const byValue=new Map();
 for(const value of shuffle(alternatives,rng)){const n=Number(value.match(/^\d+(?:[.,]\d+)?/)[0].replace(',','.'));if(n!==number)byValue.set(n,value);}
 return [...byValue.values()].slice(0,3);
}
function analyze(pages){
 const source=passages(pages),facts=[];
 for(const p of source){
  const text=p.text;
  const definition=text.match(/^(.{3,85}?)\s+(?:é|são|significa|significam|refere-se a|consiste em|corresponde a|representa)\s+(.{30,300})[.!;]?$/iu);
  const colon=!definition&&text.match(/^([\p{L}][\p{L}\p{N}\s()/-]{3,65}):\s+(.{35,280})$/u);
  const d=definition||colon;
  if(d){
   const term=norm(d[1]).replace(/^(?:O|A|Os|As|Um|Uma)\s+/i,'').replace(/[,:;]$/,'');
   const description=norm(d[2]).replace(/[.!;]$/,'');
   if(words(term).length<=9&&term.length>=4&&!/^(?:o|a|um|uma|seu|sua|quando|para|segundo)\b/i.test(term)&&!/\b(?:não|nunca|nenhum|nenhuma|apenas)\b/i.test(d[1])&&words(description).length>=6&&!key(description).includes(key(term))){
    facts.push({...p,kind:'definition',answer:term,description,score:9,sourceKey:hash(key(text))});continue;
   }
  }
  const numbers=[...text.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:%|dias?\b|horas?\b|minutos?\b|segundos?\b|meses\b|mês\b|anos?\b|semanas?\b|reais\b|vezes\b|unidades?\b|pontos?\b|GB\b|MB\b|TB\b|Mbps\b|Gbps\b|km\b|metros?\b|litros?\b|kg\b)/giu)];
  if(numbers.length===1){
   const m=numbers[0],answer=norm(m[0]);const number=Number(answer.match(/^\d+(?:[.,]\d+)?/)[0].replace(',','.'));
   if(number>0&&words(text.slice(0,m.index)).length>=3&&!/\b(?:exemplo|hipoteticamente|suponha|ilustrativo)\b/i.test(text)){
    facts.push({...p,kind:'numeric',answer,start:m.index,end:m.index+m[0].length,score:8,sourceKey:hash(key(text))});continue;
   }
  }
  const action=text.match(/^(.{8,100}?\b(?:deve|devem|precisa|precisam)\s+)(.{20,180}?)[.!;]?$/iu);
  if(action&&!/^(?:ser|estar|ter|haver)\b/i.test(action[2])&&words(action[2]).length>=4){
   facts.push({...p,kind:'action',answer:action[2].replace(/[.!;]$/,''),prefix:action[1],score:7,sourceKey:hash(key(text))});
  }
 }
 const groups=[...new Set(facts.map(f=>f.page))].map(page=>facts.filter(f=>f.page===page));
 const bounded=[];for(let i=0;bounded.length<800&&groups.some(g=>g[i]);i++)for(const g of groups)if(g[i]&&bounded.length<800)bounded.push(g[i]);
 return {passages:source,facts:bounded};
}
function similarity(a,b){const x=new Set(words(a)),y=new Set(words(b));let n=0;for(const w of x)if(y.has(w))n++;return n/Math.max(1,Math.min(x.size,y.size));}
function candidates(pages,seed=1,focus='balanced'){
 const rng=random(seed),analysis=analyze(pages),out=[];
 for(const fact of analysis.facts){
  if(focus==='concepts'&&fact.kind!=='definition')continue;
  if(focus==='facts'&&fact.kind==='definition')continue;
  let distractors=[];
  if(fact.kind==='numeric')distractors=numericAlternatives(fact.answer,analysis.facts.filter(f=>f.kind==='numeric').map(f=>f.answer),rng);
  else{
   let pool=analysis.facts.filter(f=>f.kind===fact.kind&&key(f.answer)!==key(fact.answer)&&!key(fact.text).includes(key(f.answer))&&!key(f.answer).includes(key(fact.answer))&&!key(fact.answer).includes(key(f.answer)));
   pool=pool.filter(f=>!(fact.kind==='definition'&&similarity(f.description,fact.description)>.85));
   pool=pool.filter(f=>Math.abs(words(f.answer).length-words(fact.answer).length)<=Math.max(4,words(fact.answer).length*.6)&&similarity(f.answer,fact.answer)<.75);
   pool.sort((a,b)=>(a.page===fact.page?-2:0)-(b.page===fact.page?-2:0));
   distractors=unique(shuffle(pool.slice(0,24),rng).map(f=>f.answer)).slice(0,3);
  }
  if(distractors.length!==3)continue;
  const all=shuffle([fact.answer,...distractors],rng);
  const q={id:'',type:fact.kind==='definition'?'single':'fill_blank',difficulty:'unspecified',topic:fact.topic,
   statement:fact.kind==='definition'?'Qual conceito o documento descreve como “'+fact.description+'”?':'Complete o trecho conforme o documento:\n“'+(fact.kind==='numeric'?fact.text.slice(0,fact.start)+'_____'+fact.text.slice(fact.end):fact.prefix+'_____.')+'”',
   options:all.map((text,i)=>({id:'o'+(i+1),text})),correctAnswers:['o'+(all.indexOf(fact.answer)+1)],
   explanation:'O trecho que fundamenta a resposta é: “'+fact.text+'”',sourcePage:fact.page,
   sourceKey:fact.sourceKey,evidence:fact.text,ruleKind:fact.kind,score:fact.score};
  // Reserve numeric statements for some true/false items; exact single substitution only.
  if(fact.kind==='numeric'&&rng()<.28){
   const truth=rng()<.5;
   const assertion=truth?fact.text:fact.text.slice(0,fact.start)+distractors[0]+fact.text.slice(fact.end);
   q.type='true_false';q.statement='A afirmação abaixo corresponde ao que está escrito no documento?\n“'+assertion+'”';
   q.options=[{id:'o1',text:'Verdadeiro'},{id:'o2',text:'Falso'}];q.correctAnswers=[truth?'o1':'o2'];
   q.explanation=(truth?'A afirmação reproduz o documento. ':'O valor foi alterado; o documento informa '+fact.answer+'. ')+'Trecho original: “'+fact.text+'”';
  }
  out.push(q);
 }
 return {pool:out,passageCount:analysis.passages.length,factCount:analysis.facts.length};
}
function select(pool,count=25,excluded=[]){
 const blocked=new Set(excluded),available=pool.filter(q=>!blocked.has(q.sourceKey)),chosen=[],pageCounts=new Map(),kindCounts=new Map();
 while(chosen.length<count&&available.length){
  available.sort((a,b)=>{
   const rank=q=>q.score-(pageCounts.get(q.sourcePage)||0)*3-(kindCounts.get(q.type)||0)*.35;
   return rank(b)-rank(a);
  });
  const q=available.shift();
  if(chosen.some(x=>x.sourceKey===q.sourceKey||similarity(x.evidence,q.evidence)>.88))continue;
  chosen.push(q);pageCounts.set(q.sourcePage,(pageCounts.get(q.sourcePage)||0)+1);kindCounts.set(q.type,(kindCounts.get(q.type)||0)+1);
 }
 return chosen;
}
function generate(pages,{seed=1,focus='balanced',excluded=[],name='material.pdf'}={}){
 const result=candidates(pages,seed,focus),chosen=select(result.pool,25,excluded);
 const questions=chosen.map((q,i)=>({...q,id:'q'+String(i+1).padStart(3,'0')}));
 const quiz=questions.length===25?{version:'1.0',title:'Revisão · '+name.replace(/\.pdf$/i,''),sourceDocument:name,questionCount:25,generator:'rules-1.0',questions}:null;
 return {...result,selected:questions,quiz,stats:{pages:pages.length,usable:questions.length,available:result.pool.length,coveredPages:new Set(chosen.map(q=>q.sourcePage)).size}};
}
root.QuizRules={norm,key,passages,analyze,candidates,select,generate};
})(globalThis);

