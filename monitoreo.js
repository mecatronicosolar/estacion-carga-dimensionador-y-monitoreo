'use strict';
const data=[['batteryVoltage','Tensión de batería','V',12.4],['panelVoltage','Tensión FV','V',20.1],['batteryTemperature','Temperatura de batería','°C',30]];
const grid=document.getElementById('telemetria');
const demo=document.getElementById('modo-demo');
const samples=new Map();
function render(){
 grid.replaceChildren();
 for(const [key,label,unit] of data){const sample=samples.get(key),state=estadoDato(sample),article=document.createElement('article');const title=document.createElement('span');title.textContent=label;const val=document.createElement('strong');val.textContent=state==='actual'?`${sample.value} ${unit}`:'—';const meta=document.createElement('small');meta.textContent=`${key} · ${demo.checked?'DEMO local':'Sin fuente real conectada'} · ${state==='antiguo'?'Dato antiguo, no vigente':state==='actual'?'Ejemplo, no medición':'Sin datos'}`;const time=document.createElement('small');time.textContent=sample?`Muestra: ${new Date(sample.ts).toLocaleString('es-CO')} · ${sample.value} ${unit} (histórico)`:'Última actualización: no disponible';article.append(title,val,meta,time);grid.append(article);}
 document.getElementById('estado-estacion').textContent=demo.checked?'Demostración local · sin conexión física':'Conexión de estación: no verificable';
}
demo.addEventListener('change',()=>{samples.clear();if(demo.checked)for(const [key,,,value]of data)samples.set(key,{value,ts:Date.now()});render();});
setInterval(render,1000);render();
const frame=document.getElementById('dashboard'),status=document.getElementById('estado-dashboard');let timer;
const loading=document.getElementById('carga-dashboard');
function timeout(){if(loading){loading.hidden=false;loading.querySelector('strong').textContent='Vista externa no confirmada';loading.querySelector('p').textContent='Puedes reintentar o abrir el dashboard en otra pestaña.';loading.classList.add('load-unavailable');}status.textContent='No se pudo confirmar la disponibilidad del dashboard. Abre la vista externa o reintenta. El estado de conexión de la estación sigue sin verificar.';document.getElementById('reintentar').hidden=false;}
function cargar(){clearTimeout(timer);if(loading){loading.hidden=false;loading.classList.remove('load-unavailable');loading.querySelector('strong').textContent='Abriendo el dashboard';loading.querySelector('p').textContent='Conectando con la vista externa de ThingsBoard Cloud.';}status.textContent='Cargando vista externa… La web no puede leer telemetría ni autenticación de este iframe.';document.getElementById('reintentar').hidden=true;frame.src=frame.dataset.src;timer=setTimeout(timeout,12000);}
frame.addEventListener('load',()=>{clearTimeout(timer);if(loading)loading.hidden=true;status.textContent='El marco terminó de cargar; esto no confirma autenticación, mediciones vigentes ni conexión de la estación. Revisa timestamps y fuente en ThingsBoard.';document.getElementById('reintentar').hidden=false;});
frame.addEventListener('error',()=>{clearTimeout(timer);timeout();});document.getElementById('reintentar').addEventListener('click',cargar);cargar();
