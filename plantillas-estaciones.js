/* Referencias: fichas de los cuatro diseños publicadas en index.html.
   Se cargan SOLO datos que constan en esas fichas, o supuestos explícitos
   del dimensionador; los parámetros no documentados se dejan vacíos. */
(() => {
  'use strict';
  const plantillas = Object.freeze({
    '800w': {
      titulo: '800 W · Movilidad ligera',
      paneles: '1 × Suntech de 550 Wp',
      bateria: 'Victron SuperPack NG · 12,8 V / 200 Ah',
      inversor: 'BELTTT BEP1000S · 1.000 W · 110 V AC',
      controlador: 'Victron SmartSolar 100/50',
      costo: '$6.595.442 COP',
      respaldo: '1,65 h (estimación de referencia)',
      campos: {
        nivel: '1', alimentacion: 'monofasica', tension_nivel: '110',
        mppt: 'externo', P_dispositivo: '800', t_respaldo: '1',
        num_dispositivos: '1', V_sistema: '12.8',
        V_banco: '12.8', C_banco: '200', P_panel: '550',
        P_unidad_inversor: '1000', N_unidades_inversor: '1',
        inv_ac: '110', tension_ac: '110'
      },
      pendiente: 'Corriente continua máxima y masa de la batería; características de placa de panel, MPPT e inversor; irradiación local y cableado.'
    },
    '3-7kw': {
      titulo: '3,7 kW · Vehículo eléctrico',
      paneles: '6 × JA Solar de 620 Wp',
      bateria: 'MUST LP16-48200 · 51,2 V / 200 Ah',
      inversor: 'MUST PV33-4048 TLV · 4 kW',
      controlador: 'Victron SmartSolar 150/100 (48 V nominales)',
      costo: '$22.353.941 COP',
      respaldo: '1,35 h (estimación de referencia)',
      campos: {
        nivel: '2', alimentacion: 'monofasica', tension_nivel: '220',
        mppt: 'externo', P_dispositivo: '3700', t_respaldo: '1',
        num_dispositivos: '1', V_sistema: '51.2',
        V_banco: '51.2', C_banco: '200', P_panel: '620',
        P_unidad_inversor: '4000', N_unidades_inversor: '1',
        tension_ac: '220'
      },
      pendiente: 'Corriente de descarga (150 A indicado como revisión, no validado), masa de batería, datos de placa de panel/inversor/MPPT, HSP y cableado.'
    },
    '7kw': {
      titulo: '7 kW · Carga residencial',
      paneles: '2 × Tensite de 710 Wp (referencia eléctrica)',
      bateria: 'MUST LP16-48300 · 51,2 V / 300 Ah',
      inversor: 'MUST PV36-8048 TLV · 8 kW',
      controlador: 'Victron SmartSolar 150/35',
      costo: '$25.523.604 COP',
      respaldo: '1,13 h (estimación de referencia)',
      campos: {
        nivel: '2', alimentacion: 'monofasica', tension_nivel: '220',
        mppt: 'externo', P_dispositivo: '7000', t_respaldo: '1',
        num_dispositivos: '1', V_sistema: '51.2',
        V_banco: '51.2', C_banco: '300', P_panel: '710',
        P_unidad_inversor: '8000', N_unidades_inversor: '1',
        tension_ac: '220'
      },
      pendiente: 'Corriente de descarga (200 A indicado como revisión, no validado), masa de batería, ficha de panel e inversor, límites del MPPT, HSP y distancias de cableado.'
    },
    '11kw': {
      titulo: '11 kW · Carga trifásica',
      paneles: '6 × Tensite de 710 Wp (referencia eléctrica)',
      bateria: '2 × Deye SE-F16 · 16 kWh por módulo',
      inversor: 'Deye SUN-16K-SG05LP3-EU-SM2 · 16 kW',
      controlador: 'MPPT integrado',
      costo: '$38.767.038 COP',
      respaldo: '1,59 h (estimación de referencia)',
      campos: {
        nivel: '2', alimentacion: 'trifasica', tension_nivel: '380',
        tipo_equipo: 'nativo', mppt: 'integrado',
        P_dispositivo: '11000', t_respaldo: '1',
        num_dispositivos: '1', P_panel: '710',
        P_unidad_inversor: '16000', N_unidades_inversor: '1',
        tension_ac: '380'
      },
      pendiente: 'Tensión nominal, Ah, masa y corriente de descarga de cada batería (la ficha disponible solo indica kWh); parámetros DC/AC del inversor, límites MPPT, datos del panel, HSP y cableado.'
    }
  });

  const selector = document.getElementById('selector-diseno');
  const resumen = document.getElementById('resumen-diseno');
  const botonSuperior = document.getElementById('borrar-todo-superior');
  const camposNumericos = Array.from(document.querySelectorAll('input[type="number"]'));
  const camposSelect = Array.from(document.querySelectorAll('.solar-sizing select')).filter(el => el !== selector);

  // A diferencia de "reiniciar cálculos", deja TODAS las entradas numéricas vacías.
  // Conserva selecciones estructurales neutras para mostrar los bloques del formulario.
  function limpiarFormulario() {
    reiniciarApp();  // limpia estado, cálculos dependientes, opciones y mensajes.
    for (const el of camposSelect) el.selectedIndex = 0;
    document.getElementById('nivel').value = '1';
    document.getElementById('alimentacion').value = 'monofasica';
    document.getElementById('mppt').value = 'externo';
    document.getElementById('tipo_equipo').value = 'nativo';
    aplicarConfiguracion();
    for (const el of camposNumericos) el.value = '';
    document.querySelectorAll('.error-campo').forEach(el => {el.hidden = true; el.textContent = '';});
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const general = document.getElementById('error-dimensionador');
    if (general) {general.hidden = true; general.textContent = '';}
    document.dispatchEvent(new Event('cambio-solar'));
  }

  function actualizarURL(id) {
    if (!window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('diseno', id);
    else url.searchParams.delete('diseno');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function cargarPlantilla(id) {
    const plantilla = plantillas[id];
    if (!plantilla) return;
    limpiarFormulario();
    // La configuración genera dinámicamente las tensiones admisibles.
    for (const campo of ['nivel', 'alimentacion', 'tipo_equipo', 'mppt']) {
      const el = document.getElementById(campo);
      if (el && Object.hasOwn(plantilla.campos, campo)) el.value = plantilla.campos[campo];
    }
    aplicarConfiguracion();
    for (const [campo, valor] of Object.entries(plantilla.campos)) {
      const el = document.getElementById(campo);
      if (el && !['nivel', 'alimentacion', 'tipo_equipo', 'mppt'].includes(campo)) el.value = valor;
    }
    aplicarConfiguracion();
    selector.value = id;
    actualizarURL(id);
    const lista = document.createElement('dl');
    lista.className = 'resumen-referencia';
    const datos = [
      ['Paneles previstos', plantilla.paneles],
      ['Batería', plantilla.bateria],
      ['Inversor', plantilla.inversor],
      ['Controlador', plantilla.controlador],
      ['Costo estimado', plantilla.costo],
      ['Respaldo estimado', plantilla.respaldo]
    ];
    for (const [etiqueta, valor] of datos) {
      const dt = document.createElement('dt'); dt.textContent = etiqueta;
      const dd = document.createElement('dd'); dd.textContent = valor;
      lista.append(dt, dd);
    }
    resumen.replaceChildren();
    const titulo = document.createElement('h2');
    titulo.textContent = `Diseño cargado: ${plantilla.titulo}`;
    const nota = document.createElement('p');
    nota.textContent = 'Se completaron los campos disponibles en la ficha del proyecto. Los campos vacíos requieren datos reales del fabricante o de la instalación; los resultados NO se calculan automáticamente.';
    const faltantes = document.createElement('p');
    const strong = document.createElement('strong'); strong.textContent = 'Por confirmar: ';
    faltantes.append(strong, document.createTextNode(plantilla.pendiente));
    const notaPanel = document.createElement('p');
    notaPanel.className = 'nota-paneles';
    notaPanel.textContent = 'La cantidad de paneles indicada es una referencia del diseño; la calculadora determina el arreglo que resulte de los datos y criterios introducidos. Tiempo inicial: 1 h y supuestos de eficiencia/DoD editables.';
    resumen.append(titulo, nota, lista, faltantes, notaPanel);
    resumen.hidden = false;
    document.dispatchEvent(new Event('cambio-solar'));
  }

  function borrarTodo() {
    limpiarFormulario();
    selector.value = '';
    resumen.replaceChildren();
    resumen.hidden = true;
    actualizarURL('');
  }

  window.borrarTodoDimensionador = borrarTodo;
  botonSuperior?.addEventListener('click', borrarTodo);
  selector?.addEventListener('change', () => {
    if (selector.value) cargarPlantilla(selector.value);
    else borrarTodo();
  });

  const parametro = new URLSearchParams(window.location.search).get('diseno');
  if (parametro && Object.hasOwn(plantillas, parametro)) cargarPlantilla(parametro);
})();
