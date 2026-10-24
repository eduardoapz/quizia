(function(root){
'use strict';
function evaluate(state){
 const details=state.quiz.questions.map(q=>{const selected=root.QuizEngine.selected(state,q.id);return {question:q,selected,correct:selected.length===q.correctAnswers.length&&q.correctAnswers.every(id=>selected.includes(id)),unanswered:selected.length===0};});
 const correct=details.filter(d=>d.correct).length;
 return {details,correct,incorrect:25-correct,unanswered:details.filter(d=>d.unanswered).length,score:correct*4,seconds:Math.floor(((state.finishedAt??state.endsAt)-state.startedAt)/1000)};
}
root.QuizResults={evaluate};
})(globalThis);
