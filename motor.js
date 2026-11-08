/* Motor de estimación. Sin DOM ni dependencias. Unidades SI indicadas en nombres/resultados. */
(function(root){
'use strict';
function num(x,name,min=0,max=1e9){
 if(x===null||x===undefined||String(x).trim()===''||!Number.isFinite(Number(x))||Number(x)<=min||Number(x)>max) throw new Error(`${name}: valor fuera de alcance (${min}, ${max}].`);
 return Number(x);
}
function resultadoPositivo(x,name){if(!Number.isFinite(x)||x<=0)throw new Error(`${name}: resultado fuera de la precisión numérica; debe ser positivo y finito. Revisa la magnitud de las entradas.`);return x;}
function entero(x,name,max=10000){const n=num(x,name,0,max);if(!Number.isSafeInteger(n))throw new Error(`${name}: debe ser entero.`);return n;}
function real(x,name,min,max){if(x===null||x===undefined||String(x).trim()===''||!Number.isFinite(Number(x))||Number(x)<min||Number(x)>max)throw new Error(`${name}: fuera del intervalo ${min} a ${max}.`);return Number(x);}
function demanda(p,t,n,s=1){p=num(p,'Potencia',0,1e6);t=num(t,'Duración',0,168);n=entero(n,'Vehículos');s=entero(s,'Sesiones/día',1000);return {powerW:resultadoPositivo(p*n,'Potencia total'),sessionWh:resultadoPositivo(p*t,'Energía por sesión'),dailyWh:resultadoPositivo(p*t*n*s,'Energía diaria')};}
function bateria({energyWh,powerW,dod,eta,voltage,moduleV,ah,maxA}){
 energyWh=num(energyWh,'Energía');powerW=num(powerW,'Potencia');dod=num(dod,'DoD',0,1);eta=num(eta,'Eficiencia',0,1);voltage=num(voltage,'V sistema');moduleV=num(moduleV,'V módulo');ah=num(ah,'Ah');maxA=num(maxA,'A continuos');
 const ratio=voltage/moduleV;if(ratio<1||Math.abs(ratio-Math.round(ratio))>1e-9)throw new Error('Tensiones de batería incompatibles: la serie debe ser entera.');
 const requiredWh=energyWh/(dod*eta),currentA=powerW/(voltage*eta),series=Math.round(ratio),parallel=Math.max(Math.ceil(requiredWh/voltage/ah),Math.ceil(currentA/maxA));
 if(series*parallel>100000)throw new Error('Configuración fuera del alcance de 100000 módulos.');
 const nominalWh=resultadoPositivo(voltage*ah*parallel,'Energía nominal'),usableWh=resultadoPositivo(nominalWh*dod,'Energía utilizable'),acWh=resultadoPositivo(usableWh*eta,'Energía AC');
 resultadoPositivo(requiredWh,'Energía requerida');resultadoPositivo(currentA,'Corriente DC');const autonomyH=resultadoPositivo(acWh/powerW,'Autonomía');
 return {requiredWh,currentA,series,parallel,total:series*parallel,nominalWh,usableWh,acWh,autonomyH};
}
function solar(energy,hsp,pr,fraction=1){return resultadoPositivo(num(energy,'Wh')*num(fraction,'Fracción',0,1)/(num(hsp,'HSP',0,24)*num(pr,'PR',0,1)),'Potencia FV');}
function arreglos(c){
 const p=num(c.p,'W panel'),voc=num(c.voc,'Voc'),vmp=num(c.vmp,'Vmp'),isc=num(c.isc,'Isc'),imp=num(c.imp,'Imp');
 if(vmp>=voc||imp>isc||Math.abs(p-vmp*imp)/p>.1)throw new Error('Ficha del panel incoherente: Vmp < Voc, Imp ≤ Isc y P ≈ Vmp × Imp (10 %).');
 const beta=real(c.beta,'β Voc',-2,0),betaMp=real(c.betaMp,'β Vmp',-2,0),tmin=real(c.tmin,'T mínima',-80,85),tmax=real(c.tmax,'T máxima de célula',-80,120);
 if(tmax<tmin)throw new Error('La temperatura máxima debe superar la mínima.');
 const cold=voc*(1+beta/100*(tmin-25)),hot=vmp*(1+betaMp/100*(tmax-25)),coldMp=vmp*(1+betaMp/100*(tmin-25));
 if(hot<=0||cold<=0)throw new Error('Corrección térmica no física.');
 const vmax=num(c.vmax,'Voc máximo'),vmin=num(c.vmin,'MPPT mínimo'),vhigh=num(c.vhigh,'MPPT máximo'),start=num(c.start,'Arranque'),imax=num(c.imax,'I FV máximo'),iscmax=num(c.iscmax,'Isc FV admisible'),out=num(c.out,'I salida'),pmax=num(c.pmax,'W FV máximo'),bank=num(c.bank,'V banco'),eta=num(c.eta,'Eficiencia MPPT',0,1);
 if(vmin>=vhigh||vhigh>vmax||start>vmax)throw new Error('Rango MPPT/arranque incoherente.');
 const required=num(c.required,'W requeridos'),minPanels=Math.ceil(required/p);
 const maxS=Math.min(1000,Math.floor(vmax/cold)),maxP=Math.min(1000,Math.floor(imax/imp),Math.floor(iscmax/(1.25*isc)));
 const options=[];
 for(let s=1;s<=maxS;s++){
 const parallel=Math.ceil(minPanels/s),total=s*parallel;
 if(parallel>maxP||s*hot<vmin||s*coldMp>vhigh||s*hot<start||total*p>pmax||total*p*eta/bank>out)continue;
 options.push({series:s,parallel,total,voltageV:s*vmp,currentA:parallel*imp,coldVoc:s*cold,hotVmp:s*hot,powerW:total*p,outputA:total*p*eta/bank});
 }
 options.sort((a,b)=>a.total-b.total||a.series-b.series);return options;
}
function inversor({bank,min,max,nominal,ac,expectedAc,hz,expectedHz,power,units,load}){
 [bank,min,max,nominal,ac,expectedAc,hz,expectedHz,power,load].forEach(x=>num(x,'Inversor'));units=entero(units,'Unidades');if(min>max)throw new Error('Rango DC invertido.');
 return {dc:bank===nominal&&bank>=min&&bank<=max,ac:ac===expectedAc&&hz===expectedHz,power:power*units>=load,multiple:units>1};
}
function conductorDC({current,length,voltage,section,ampacity,factor=1,drop=3}){
 current=num(current,'A');length=num(length,'m',0,10000);voltage=num(voltage,'V');section=num(section,'mm²');ampacity=num(ampacity,'Ampacidad');factor=num(factor,'Corrección',0,1);drop=num(drop,'Caída %',0,10);
 const designA=current*1.25,dropV=2*.021*length*current/section,dropPercent=100*dropV/voltage;
 const ampacityA=resultadoPositivo(ampacity*factor,'Ampacidad corregida');
 for(const [name,value]of Object.entries({designA,dropV,dropPercent}))resultadoPositivo(value,name);
 return {designA,dropV,dropPercent,ampacityA,ok:designA<=ampacityA&&dropPercent<=drop};
}
const api={num,entero,real,demanda,bateria,solar,arreglos,inversor,conductorDC};root.MotorSolar=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
