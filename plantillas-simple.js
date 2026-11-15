/* Precarga de diseños para el dimensionador sencillo del ZIP del usuario.
   Los cálculos siguen siendo los originales: las fichas solo rellenan valores
   disponibles. HSP, distancias y características no documentadas no se inventan. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const selector = $('selector-diseno');
  if (!selector) return;

  const plantillas = Object.freeze({
    '800w': {
      titulo: '800 W · Movilidad ligera',
      potencia: 800, tiempo: 1, vehiculos: 1,
      tipoBateria: 'litio', modoBateria: 'voltaje_capacidad',
      voltajeBateria: 12.8, capacidadBateria: 200,
      potenciaPanel: 550, voltajeSalida: '110', tensionAC: '110',
      componentes: ['1 × Suntech de 550 Wp', 'Victron SuperPack NG · 12,8 V / 200 Ah', 'BELTTT BEP1000S · 1.000 W · 110 V', 'Victron SmartSolar 100/50'],
      costo: '$6.595.442 COP'
    },
    '3-7kw': {
      titulo: '3,7 kW · Vehículo eléctrico',
      potencia: 3700, tiempo: 1, vehiculos: 1,
      tipoBateria: 'litio', modoBateria: 'voltaje_capacidad',
      voltajeBateria: 51.2, capacidadBateria: 200,
      potenciaPanel: 620, voltajeSalida: '220', tensionAC: '220',
      componentes: ['6 × JA Solar de 620 Wp', 'MUST LP16-48200 · 51,2 V / 200 Ah', 'MUST PV33-4048 TLV · 4 kW', 'Victron SmartSolar 150/100'],
      costo: '$22.353.941 COP'
    },
    '7kw': {
      titulo: '7 kW · Carga residencial',
      potencia: 7000, tiempo: 1, vehiculos: 1,
      tipoBateria: 'litio', modoBateria: 'voltaje_capacidad',
      voltajeBateria: 51.2, capacidadBateria: 300,
      potenciaPanel: 710, voltajeSalida: '220', tensionAC: '220',
      componentes: ['Tensite de 710 Wp', 'MUST LP16-48300 · 51,2 V / 300 Ah', 'MUST PV36-8048 TLV · 8 kW', 'Victron SmartSolar 150/35'],
      costo: '$25.523.604 COP'
    },
    '11kw': {
      titulo: '11 kW · Carga trifásica',
      potencia: 11000, tiempo: 1, vehiculos: 1,
      tipoBateria: 'litio', modoBateria: 'energia', energiaBateria: 16000,
      potenciaPanel: 710, voltajeSalida: '', tensionAC: '', trifasico: true,
      componentes: ['Tensite de 710 Wp', '2 × Deye SE-F16 · 16 kWh por módulo', 'Deye SUN-16K-SG05LP3-EU-SM2 · 16 kW', 'MPPT integrado'],
      costo: '$38.767.038 COP'
    }
  });

  const controlIds = ['P_dispositivo','t_sesion','num_dispositivos','tipo_bateria',
    'V_bat','C_ah','Ebat_wh','HSP','P_panel','V_nominal',
    'tension_salida','tension_ac','distancia_ac','entorno_ac'];

  function ajustarTrifasica(activa) {
    $('aviso-trifasico').hidden = !activa;
    $('aviso-inversor-trifasico').hidden = !activa;
    $('tension_ac').disabled = activa;
    $('tension_salida').disabled = activa;
    $('btn-calcular-ac').disabled = activa;
    if (activa) {
      const out4=$('resultado-4');
      out4.className='resultado resultado-ac'; out4.replaceChildren();
      $('resultado-3').className='resultado'; $('resultado-3').replaceChildren();
    }
  }

  function limpiarFormulario() {
    reiniciarApp(); // Limpia estado interno de baterías, paneles e inversor.
    controlIds.forEach(id => {const campo=$(id); if (campo) campo.value='';});
    document.querySelectorAll('input[name="modo_bateria"]').forEach(c => {c.checked=false;});
    $('campos-voltaje-capacidad').hidden=true;
    $('campos-energia').hidden=true;
    const out4=$('resultado-4');
    out4.className='resultado resultado-ac'; out4.replaceChildren();
    document.querySelectorAll('.error-campo').forEach(e => {e.textContent=''; e.hidden=true;});
    document.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    const general=$('error-dimensionador'); general.hidden=true; general.textContent='';
    ajustarTrifasica(false);
    // Actualiza la vista AC para no mostrar valores del diseño anterior.
    $('tension_ac').dispatchEvent(new Event('change', {bubbles:true}));
  }

  function actualizarURL(id) {
    const u=new URL(window.location.href);
    if (id) u.searchParams.set('diseno', id); else u.searchParams.delete('diseno');
    if (window.history?.replaceState) window.history.replaceState(null,'',u.pathname+u.search+u.hash);
  }

  function resumenPlantilla(t) {
    const el=$('resumen-diseno');
    el.replaceChildren();
    const titulo=document.createElement('h2');titulo.textContent=`Diseño cargado: ${t.titulo}`;
    const intro=document.createElement('p');intro.textContent='Datos conocidos precargados. Puedes editarlos y calcular cada paso. Las HSP, la distancia del cable y el voltaje nominal del panel dependen de la instalación o su ficha técnica.';
    const tabla=document.createElement('dl');tabla.className='resumen-referencia';
    const datos=[['Paneles de referencia',t.componentes[0]], ['Batería de referencia',t.componentes[1]], ['Inversor de referencia',t.componentes[2]],['Controlador',t.componentes[3]], ['Costo estimado',t.costo]];
    for (const [k,v] of datos) {const dt=document.createElement('dt');dt.textContent=k; const dd=document.createElement('dd');dd.textContent=v;tabla.append(dt,dd);}
    const nota=document.createElement('p');nota.className='nota-plantilla';
    nota.textContent=t.trifasico
      ? 'El diseño es trifásico (380 V). El dimensionamiento de cables AC e inversor trifásico queda fuera del alcance de la calculadora sencilla del ZIP. El número calculado de baterías puede diferir del presupuesto del proyecto.'
      : 'El número de paneles y baterías calculado puede diferir del diseño de referencia según las HSP, la duración de carga y los supuestos del dimensionador.';
    el.append(titulo,intro,tabla,nota); el.hidden=false;
  }

  function cargarPlantilla(id) {
    const t=plantillas[id]; if (!t) return;
    limpiarFormulario();
    $('P_dispositivo').value=String(t.potencia);
    $('t_sesion').value=String(t.tiempo);
    $('num_dispositivos').value=String(t.vehiculos);
    $('tipo_bateria').value=t.tipoBateria;
    document.querySelector(`input[name="modo_bateria"][value="${t.modoBateria}"]`).checked=true;
    document.querySelector(`input[name="modo_bateria"][value="${t.modoBateria}"]`).dispatchEvent(new Event('change', {bubbles:true}));
    if (t.modoBateria==='energia') $('Ebat_wh').value=String(t.energiaBateria);
    else { $('V_bat').value=String(t.voltajeBateria); $('C_ah').value=String(t.capacidadBateria); }
    $('P_panel').value=String(t.potenciaPanel);
    $('tension_salida').value=t.voltajeSalida;
    $('tension_ac').value=t.tensionAC;
    ajustarTrifasica(Boolean(t.trifasico));
    selector.value=id;
    actualizarURL(id);
    resumenPlantilla(t);
    // Registrar la energía básica con el mismo motor del ZIP; no calcular FV
    // si no se dispone de HSP o de la tensión nominal del panel.
    calcularPaso1_1(); calcularPaso1_2(); calcularPaso1_3(); calcularPaso1_4();
    $('tension_ac').dispatchEvent(new Event('change', {bubbles:true}));
  }

  function borrarTodo() {
    limpiarFormulario();
    selector.value=''; $('resumen-diseno').replaceChildren();$('resumen-diseno').hidden=true;
    actualizarURL('');
  }

  $('borrar-todo-superior').addEventListener('click',borrarTodo);
  $('borrar-todo-inferior').addEventListener('click',borrarTodo);
  selector.addEventListener('change',()=>{if (selector.value) cargarPlantilla(selector.value);else borrarTodo();});

  const buscado=new URLSearchParams(window.location.search).get('diseno');
  if (buscado && Object.hasOwn(plantillas,buscado)) cargarPlantilla(buscado);
  else {limpiarFormulario();}
})();
