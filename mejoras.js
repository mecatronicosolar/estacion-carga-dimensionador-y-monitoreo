/* Extiende el flujo existente sin cambiar sus enlaces ni eliminar etapas. */
'use strict';
const M = MotorSolar;
function dato(id, min=0, max=1e9) {
 try { return M.num(v(id), document.querySelector(`label[for="${id}"]`)?.textContent || id,min,max); }
 catch(e){mostrarError(e.message,id);e.campo=id;throw e;}
}
function firmado(id,min,max){try{return M.real(v(id),id,min,max);}catch(e){mostrarError(e.message,id);e.campo=id;throw e;}}
function seguro(fn){return function(...args){try{return fn(...args);}catch(e){if(!e.campo)mostrarError(e.message);}};}
function borrarDesde(stage){
 const ids=['resultado-1-1','resultado-1-2','resultado-1-3','resultado-1-4','resultado-2-1','resultado-2-2','resultado-2-3','resultado-3','resultado-4','resultado-dc'];
 const starts=[0,1,2,3,4,6,7,8,9];
 ids.slice(starts[stage] ?? 0).forEach(limpiarResultado);
 if(stage<=0)estado.P_dispositivo=null;
 if(stage<=1){estado.t_respaldo=null;estado.E_sesion=null;}
 if(stage<=2){estado.num_dispositivos=null;estado.E_auto=null;}
 if(stage<=3){estado.N_bancos_total=null;estado.I_DC=null;estado.bateria=null;}
 if(stage<=4){estado.P_arreglo=null;document.getElementById('paso-2-2').style.display='none';}
 if(stage<=5){estado.paneles_confirmados=false;estado.arreglo_seleccionado=null;estado.opciones_arreglo=[];document.getElementById('selector-opciones').style.display='none';document.getElementById('opciones-container').replaceChildren();}
 document.dispatchEvent(new Event('cambio-solar'));
}
const etapas = {
 P_dispositivo:0,t_respaldo:1,num_dispositivos:2,DoD:3,eta_inversor:3,V_sistema:3,C_banco:3,V_banco:3,I_max_banco:3,masa_banco:3,
 HSP:4,PR:4,sesiones_dia:4,objetivo_solar:4,
 P_unidad_inversor:6,N_unidades_inversor:6,inv_nominal:6,inv_min:6,inv_max:6,inv_ac:6,inv_hz:6,frecuencia_carga:6,
 distancia_ac:7,tension_ac:7,entorno_ac:7,factor_ac:7,fp_ac:7,dc_longitud:8,dc_seccion:8,dc_ampacidad:8,dc_factor:8,dc_caida:8
};
for(const el of document.querySelectorAll('input,select')){
 const stage=etapas[el.id]??(['nivel','alimentacion','tension_nivel','tipo_equipo','mppt'].includes(el.id)?0:5);
 const invalidar=()=>{limpiarErrorCampo(el.id);document.getElementById('error-dimensionador').hidden=true;borrarDesde(stage);};
 el.addEventListener('input',invalidar);el.addEventListener('change',invalidar);
 // campos heredados sin error individual
 if(!document.getElementById('error-'+el.id)){const msg=document.createElement('p');msg.id='error-'+el.id;msg.className='error-campo';msg.hidden=true;msg.setAttribute('role','alert');el.after(msg);el.setAttribute('aria-describedby',msg.id);}
}
const paso11=calcularPaso1_1,paso12=calcularPaso1_2,paso13=calcularPaso1_3,paso14=calcularPaso1_4;
calcularPaso1_1=seguro(()=>{borrarDesde(0);dato('P_dispositivo',0,1e6);paso11();document.dispatchEvent(new Event('cambio-solar'));});
calcularPaso1_2=seguro(()=>{borrarDesde(1);const duration=dato('t_respaldo',0,168);if(estado.P_dispositivo)M.demanda(estado.P_dispositivo,duration,1);paso12();});
calcularPaso1_3=seguro(()=>{borrarDesde(2);try{M.entero(v('num_dispositivos'),'Vehículos');}catch(e){mostrarError(e.message,'num_dispositivos');e.campo='num_dispositivos';throw e;}paso13();});
calcularPaso1_4=seguro(()=>{
 borrarDesde(3);if(!estado.E_auto)throw new Error('Primero completa energía y vehículos.');
 const b=M.bateria({energyWh:estado.E_auto,powerW:estado.P_dispositivo*estado.num_dispositivos,dod:dato('DoD',0,1),eta:dato('eta_inversor',0,1),voltage:dato('V_sistema'),moduleV:dato('V_banco'),ah:dato('C_banco'),maxA:dato('I_max_banco')});
 dato('masa_banco');paso14();if(!estado.N_bancos_total)return;estado.bateria=b;
 document.getElementById('resultado-1-4').insertAdjacentHTML('beforeend',`<h4>Banco instalado estimado</h4><p>Nominal: <strong>${b.nominalWh.toFixed(2)} Wh</strong> · utilizable DC: ${b.usableWh.toFixed(2)} Wh · disponible AC: ${b.acWh.toFixed(2)} Wh.</p><p>Autonomía estimada: ${b.autonomyH.toFixed(2)} h. Capacidad instalada: ${(estado.C_banco*b.parallel).toFixed(2)} Ah a ${estado.V_sistema} V.</p><p class="advertencia">Confirmar tasa de descarga, temperatura, envejecimiento, límites BMS, equilibrio entre ramas y autorización del fabricante para serie/paralelo. La corriente real crece al caer la tensión.</p>`);
});
function registrarHSP(){return seguro(()=>{
 borrarDesde(4);if(!estado.N_bancos_total)throw new Error('Primero calcula el banco de baterías.');
 const h=dato('HSP',0,24),pr=dato('PR',0,1),sessions=M.entero(v('sesiones_dia'),'Sesiones/día',1000),fraction=v('nivel')==='2'?dato('objetivo_solar',0,1):1;
 const daily=M.demanda(estado.P_dispositivo,estado.t_respaldo,estado.num_dispositivos,sessions).dailyWh;
 PR_REFERENCIA=pr;Object.assign(estado,{HSP:h,PR:pr,dailyWh:daily,objetivo_solar:fraction,P_arreglo:M.solar(daily,h,pr,fraction)});
 mostrarResultado('resultado-2-1',`<h4>Demanda diaria</h4><p>${daily.toFixed(2)} Wh AC/día · ${sessions} sesiones por vehículo · HSP ${h} h · PR global ${pr}.</p><p>DoD dimensiona capacidad, no multiplica la energía a reponer diariamente. PR incluye pérdidas globales.</p>`);
 document.getElementById('paso-2-2').style.display='block';
 mostrarResultado('resultado-2-2',`<h4>Potencia FV preliminar</h4><p>P = ${daily} Wh × ${fraction} / (${h} h × ${pr}) = <strong>${estado.P_arreglo.toFixed(2)} Wp</strong>.</p><p>Balance diario estimado. No garantiza suministro instantáneo ni producción meteorológica.</p>`);
 })();}
function calcularPaso2_3(){return seguro(()=>{
 borrarDesde(5);if(!estado.P_arreglo)throw new Error('Primero calcula la potencia FV.');const ext=v('mppt')==='externo';
 const bank=dato('mppt_banco');if(bank!==estado.V_sistema)throw new Error('MPPT: tensión de banco documentada incompatible.');
 const c={p:dato('P_panel'),voc:dato('Voc_panel'),vmp:dato('Vmp_panel'),isc:dato('Isc_panel'),imp:dato('Imp_panel'),beta:firmado('beta_Voc',-2,0),betaMp:firmado('beta_Vmp',-2,0),tmin:firmado('T_min_diseno',-80,85),tmax:firmado('T_max_celda',-80,120),vmax:dato(ext?'Vmax_mppt':'Voc_max_inversor'),vmin:dato(ext?'mppt_min_comun':'Vmppt_min'),vhigh:dato(ext?'mppt_max_comun':'Vmppt_max'),start:dato('mppt_arranque'),imax:dato(ext?'Imax_mppt':'mppt_i_comun'),iscmax:dato('mppt_isc'),out:dato('mppt_salida'),pmax:dato(ext?'Pmax_mppt':'mppt_p_comun'),bank,eta:dato('eta_mppt',0,1),required:estado.P_arreglo};
 const options=M.arreglos(c);estado.P_panel=c.p;
 estado.opciones_arreglo=options.map((o,i)=>({nombre:String(i+1),N_serie:o.series,N_paralelo:o.parallel,N_total:o.total,V_arreglo:o.voltageV,I_arreglo:o.currentA,cumple_mppt:true,motivo_rechazo:'',advertencia:`Voc frío ${o.coldVoc.toFixed(2)} V · Vmp caliente ${o.hotVmp.toFixed(2)} V · salida estimada ${o.outputA.toFixed(2)} A · producción ${(o.powerW*estado.HSP*estado.PR).toFixed(2)} Wh AC/día` }));
 mostrarResultado('resultado-2-3',`<h4>${options.length} configuraciones preliminares admisibles</h4><p>Usa Voc frío, Vmp caliente/frío, Imp, 1,25 Isc, rango/arranque y límites FV/salida del MPPT. Búsqueda hasta 1000 módulos en serie y 1000 ramas. Se presenta el paralelo mínimo por serie.</p><p>${options.length?'Selecciona una opción.':'No hay solución con estos datos y límites de búsqueda. Revisa el motivo eléctrico antes de cambiar componentes.'}</p><p>No garantiza compatibilidad: confirmar tensión mínima real de batería, algoritmo de carga, fusibles de ramas y curvas del fabricante.</p>`);
 if(options.length)generarSelectorOpciones();
 })();}
function calcularPaso3(){return seguro(()=>{
 limpiarResultado('resultado-3');if(!estado.bateria)throw new Error('Primero calcula la batería.');
 const r=M.inversor({bank:estado.V_sistema,min:dato('inv_min'),max:dato('inv_max'),nominal:dato('inv_nominal'),ac:dato('inv_ac'),expectedAc:Number(v('tension_nivel')),hz:dato('inv_hz'),expectedHz:dato('frecuencia_carga'),power:dato('P_unidad_inversor'),units:M.entero(v('N_unidades_inversor'),'Unidades'),load:estado.P_dispositivo*estado.num_dispositivos});
 const acI=estado.P_dispositivo*estado.num_dispositivos/(Number(v('tension_nivel'))*(v('alimentacion')==='trifasica'?Math.sqrt(3):1));
 mostrarResultado('resultado-3',`<h4>Comprobaciones del inversor alimentado por batería</h4><p>Banco DC nominal/rango: ${r.dc?'admisible a tensión nominal':'INCOMPATIBLE'} · salida AC/frecuencia: ${r.ac?'coincide':'INCOMPATIBLE'} · potencia continua: ${r.power?'suficiente':'INSUFICIENTE'}.</p><p>I DC nominal: ${estado.I_DC.toFixed(2)} A · I AC: ${acI.toFixed(2)} A (FP=1; ajustar con dato de placa).</p><p>${r.multiple?'Conjunto de unidades: sincronización, reparto de carga y formación de fases NO verificados. No basta sumar W.':'Una unidad: verificar capacidad de arranque y potencia pico de la carga.'}</p><p class="advertencia">${r.dc&&r.ac&&r.power&&!r.multiple?'Pasa las comprobaciones preliminares introducidas.':'No se puede aceptar la configuración con los datos actuales.'} Pendientes: ventana completa DC de batería, BMS, ficha/curva de eficiencia, onda AC, puesta a tierra y protecciones. El arreglo FV se compara con el MPPT, nunca con la entrada de batería del inversor.</p>`);
 })();}
function calcularDC(){return seguro(()=>{limpiarResultado('resultado-dc');if(!estado.I_DC)throw new Error('Primero calcula la batería.');const r=M.conductorDC({current:estado.I_DC,length:dato('dc_longitud'),voltage:estado.V_sistema,section:dato('dc_seccion'),ampacity:dato('dc_ampacidad'),factor:dato('dc_factor',0,1),drop:dato('dc_caida',0,10)});mostrarResultado('resultado-dc',`<h4>${r.ok?'Pasa criterios introducidos':'No pasa criterios introducidos'}</h4><p>Diseño ×1,25: ${r.designA.toFixed(2)} A · ampacidad corregida: ${r.ampacityA.toFixed(2)} A · caída: ${r.dropV.toFixed(2)} V (${r.dropPercent.toFixed(2)} %).</p><p>Revisar a tensión mínima de batería y condiciones reales. No dimensiona protección ni acredita conformidad.</p>`);})();}
document.addEventListener('reinicio-solar',()=>{
 document.querySelectorAll('input').forEach(el=>{if(['PR','sesiones_dia','frecuencia_carga','factor_ac','fp_ac','dc_factor','dc_caida'].includes(el.id))el.value=el.defaultValue;limpiarErrorCampo(el.id);});
 document.getElementById('N_unidades_inversor').value='1';borrarDesde(0);aplicarConfiguracion();
});
document.querySelectorAll('.resultado').forEach(el=>el.setAttribute('aria-live','polite'));
