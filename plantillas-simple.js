/* Precarga de diseños para el dimensionador sencillo del ZIP del usuario.
   Los cálculos siguen siendo los originales: las fichas solo rellenan valores
   disponibles. HSP, distancias y características no documentadas no se inventan. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const selector = $('selector-diseno');
  if (!selector) return;

  const plantillas = Object.freeze({
  "800w": {
    "titulo": "800 W · Movilidad ligera",
    "potencia": 800,
    "tiempo": 1,
    "vehiculos": 1,
    "tipoBateria": "litio",
    "modoBateria": "energia",
    "energiaBateria": 2560,
    "potenciaPanel": 550,
    "voltajeSalida": "110",
    "componentes": [
      "1 × Suntech de 550 Wp",
      "Felicity FLA24100 · 24 V / 100 Ah · 2,56 kWh",
      "BELTTT · 1.000 W / 24 V DC",
      "SRNE ML2440 · 24 V / 40 A"
    ],
    "costo": "$6.595.442 COP",
    "nota": "Configuración de litio de Costos 800W: banco de 24 V e inversor de 24 V. No corresponde al conjunto Victron de 12 V de Revision final.",
    "fuente": "Costos 800W",
    "cantidadBaterias": 1
  },
  "3-7kw": {
    "titulo": "3,7 kW · Vehículo eléctrico",
    "potencia": 3700,
    "tiempo": 1,
    "vehiculos": 1,
    "tipoBateria": "litio",
    "modoBateria": "energia",
    "energiaBateria": 8750,
    "potenciaPanel": 620,
    "voltajeSalida": "",
    "componentes": [
      "6 × JA Solar de 620 Wp",
      "Felicity FLA48171-EU · 48 V nominales · 8,75 kWh",
      "MUST PV33-4048 TLV · 4 kW / 48 V DC",
      "MPPT integrado · sin controlador externo presupuestado"
    ],
    "costo": "$17.301.251 COP",
    "nota": "La tabla de litio indica 110 V y la tabla GEL 220 V. Confirma la tensión de salida y la revisión del inversor; la precarga deja esa tensión sin seleccionar.",
    "fuente": "Costos 3.7kW",
    "cantidadBaterias": 1
  },
  "7kw": {
    "titulo": "7 kW · Carga residencial",
    "potencia": 7000,
    "tiempo": 1,
    "vehiculos": 1,
    "tipoBateria": "litio",
    "modoBateria": "energia",
    "energiaBateria": 8750,
    "potenciaPanel": 710,
    "voltajeSalida": "220",
    "componentes": [
      "4 × Tensite de 710 Wp",
      "2 × Felicity FLA48171-EU · 8,75 kWh por módulo",
      "MUST PV36-8048 TLV · 8 kW / 48 V DC",
      "MPPT integrado · sin controlador externo presupuestado"
    ],
    "costo": "$25.523.604 COP",
    "nota": "La alternativa de litio usa cuatro paneles y dos módulos Felicity. No se aplican las autonomías ni la fracción solar de Revision final.",
    "fuente": "Costos 7kW",
    "cantidadBaterias": 2
  },
  "11kw": {
    "titulo": "11 kW · Carga trifásica",
    "potencia": 11000,
    "tiempo": 1,
    "vehiculos": 1,
    "tipoBateria": "litio",
    "modoBateria": "energia",
    "energiaBateria": 11800,
    "potenciaPanel": 710,
    "voltajeSalida": "220T",
    "componentes": [
      "6 × Tensite de 710 Wp",
      "2 × Felicity FLA48230-EU · 11,8 kWh por módulo",
      "Deye híbrido trifásico · 12 kW · 127/220 V según enlace",
      "MPPT integrado · sin controlador externo presupuestado"
    ],
    "costo": "$38.767.038 COP",
    "nota": "Configuración presupuestada a 220 V trifásicos. Confirma la referencia exacta del Deye y la compatibilidad del cargador; no equivale a la revisión de 380 V.",
    "fuente": "Costos 11kW",
    "cantidadBaterias": 2,
    "trifasico": true
  }
});

  const controlIds = ['P_dispositivo','t_sesion','num_dispositivos','tipo_bateria',
    'V_bat','C_ah','Ebat_wh','HSP','P_panel','V_nominal',
    'tension_salida','tension_ac','distancia_ac','entorno_ac'];

  // El inversor trifásico de 380 V del diseño de 11 kW no se verifica en la sección 3.
  // Los conductores AC sí se calculan para 220 V trifásico.
  function ajustarTrifasica(activa) {
    $('aviso-inversor-trifasico').hidden = !activa;
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
    if (window.sincronizarTensionAC) window.sincronizarTensionAC();
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
    const datos=[['Paneles de referencia',t.componentes[0]], ['Batería de referencia',t.componentes[1]], ['Inversor de referencia',t.componentes[2]],['Controlador',t.componentes[3]], ['Costo estimado',t.costo], ['Baterías presupuestadas',String(t.cantidadBaterias)], ['Fuente',t.fuente]];
    for (const [k,v] of datos) {const dt=document.createElement('dt');dt.textContent=k; const dd=document.createElement('dd');dd.textContent=v;tabla.append(dt,dd);}
    const nota=document.createElement('p');nota.className='nota-plantilla';
    nota.textContent=t.nota + ' ' + (t.trifasico
      ? 'El diseño es trifásico (220 V, según Costos). Los conductores AC se calculan para 220 V trifásico; el inversor trifásico no se verifica en esta calculadora. El número calculado de baterías puede diferir del presupuesto del proyecto.'
      : 'El número de paneles y baterías calculado puede diferir del diseño de referencia según las HSP, la duración de carga y los supuestos del dimensionador.');
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
    if (window.sincronizarTensionAC) window.sincronizarTensionAC();
    ajustarTrifasica(Boolean(t.trifasico));
    selector.value=id;
    actualizarURL(id);
    resumenPlantilla(t);
    // Registrar la energía básica con el mismo motor del ZIP; no calcular FV
    // si no se dispone de HSP o de la tensión nominal del panel.
    calcularPaso1_1(); calcularPaso1_2(); calcularPaso1_3(); calcularPaso1_4();
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
