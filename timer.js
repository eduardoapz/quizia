(function(root){
'use strict';
function remaining(endsAt,now=Date.now()){return Math.max(0,Math.ceil((endsAt-now)/1000));}
function format(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
root.QuizTimer={remaining,format};
})(globalThis);
