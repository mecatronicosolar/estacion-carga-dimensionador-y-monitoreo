(function(root){
'use strict';
function estadoDato(sample,now=Date.now(),maxAge=60000){
 if(!sample||typeof sample.value!=='number'||!Number.isFinite(sample.value)||!Number.isFinite(sample.ts)||sample.ts<=0||sample.ts>now+5000||sample.valid===false)return 'no-disponible';
 return now-sample.ts>maxAge?'antiguo':'actual';
}
root.estadoDato=estadoDato;if(typeof module!=='undefined')module.exports={estadoDato};
})(globalThis);
