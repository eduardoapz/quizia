(function(root){
'use strict';
const DURATION=45*60*1000;
function start(quiz,now=Date.now()){return {quiz,answers:{},startedAt:now,endsAt:now+DURATION,finishedAt:null,status:'active'};}
function selected(state,id){return Object.hasOwn(state.answers,id)?state.answers[id]:[];}
function answer(state,questionId,optionId,checked,now=Date.now()){
 if(state.status!=='active'||now>=state.endsAt)return false;
 const q=state.quiz.questions.find(q=>q.id===questionId);
 if(!q||!q.options.some(o=>o.id===optionId))return false;
 const old=selected(state,questionId);
 const values=q.type==='multiple'?(checked?[...new Set([...old,optionId])]:old.filter(id=>id!==optionId)):[optionId];
 Object.defineProperty(state.answers,questionId,{value:values,enumerable:true,configurable:true,writable:true});
 return true;
}
function count(state){return state.quiz.questions.filter(q=>selected(state,q.id).length).length;}
function finish(state,now=Date.now()){if(state.status==='active'){state.status='finished';state.finishedAt=Math.max(state.startedAt,Math.min(now,state.endsAt));}}
root.QuizEngine={DURATION,start,selected,answer,count,finish};
})(globalThis);
