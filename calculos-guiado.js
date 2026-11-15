/*
 * Dimensionador Solar - Secciones 1, 2 y 3. La Sección 4 está en cables_ac.js.
 * Los pasos se calculan con sus botones, en orden. Si cambias un dato, se invalidan los pasos posteriores.
 */
(function () {
  'use strict';

  const CONFIG = Object.freeze({
    FP: 1.25,
    nbat: 1,
    naut: 1,
    maxBaterias: 8,
    maxPanelesAviso: 15,
    tensionesPanel: Object.freeze([12, 24, 48]),
    dod: Object.freeze({ plomo: 0.5, litio: 0.8 }),
    nombreTipo: Object.freeze({ plomo: 'Plomo', litio: 'Litio' })
  });

  const EPS = 1e-9;
  const ORDEN = ['1.2', '1.3', '1.4', '2.1', '2.3'];
  const esPositivo = v => Number.isFinite(v) && v >= 1e-6 && v <= 1e12;
  const fmt = (n, d = 2) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d });
  const $ = id => document.getElementById(id);
  const numero = id => Number($(id)?.value);
  const radio = name => document.querySelector(`input[name="${name}"]:checked`);

  const estado = {
    P: null, t: null, E_sesion: null, n: null, E_aut: null,
    banco: null, Vbat: null,
    HSP: null, P_arreglo: null,
    opciones: [], seleccion: null
  };

  // estilos.css oculta .resultado salvo que tenga la clase "visible".
  // Las variantes de color son "error" y "warning".
  function mostrar(el, html, clase) {
    if (!el) return;
    const variante = { error: 'error', advertencia: 'warning' }[clase];
    el.className = 'resultado visible' + (variante ? ' ' + variante : '');
    el.innerHTML = html;
    el.setAttribute('role', clase === 'error' ? 'alert' : 'status');
  }
  function limpiar(el) {
    if (!el) return;
    el.className = 'resultado';
    el.innerHTML = '';
  }

  // Limpia el paso indicado y todos los posteriores.
  function invalidar(desde) {
    const pasos = ORDEN.slice(ORDEN.indexOf(desde));
    if (pasos.includes('1.2')) { estado.t = null; estado.E_sesion = null; limpiar($('resultado-1-2')); }
    if (pasos.includes('1.3')) { estado.n = null; estado.E_aut = null; limpiar($('resultado-1-3')); }
    if (pasos.includes('1.4')) { estado.banco = null; estado.Vbat = null; limpiar($('resultado-1-4')); }
    if (pasos.includes('2.1')) {
      estado.HSP = null;
      estado.P_arreglo = null;
      limpiar($('resultado-2-1'));
      limpiar($('resultado-2-2'));
      const paso22 = $('paso-2-2');
      if (paso22) paso22.style.display = 'none';
    }
    if (pasos.includes('2.3')) {
      estado.opciones = [];
      estado.seleccion = null;
      limpiar($('resultado-2-3'));
      const cont = $('opciones-container');
      if (cont) cont.innerHTML = '';
      const sel = $('selector-opciones');
      if (sel) sel.style.display = 'none';
      limpiar($('resultado-3'));
    }
  }

  // ================= SECCIÓN 1 =================

  function calcularPaso1_1() {
    const out = $('resultado-1-1');
    const P = numero('P_dispositivo');
    if (!esPositivo(P)) return mostrar(out, 'Ingresa una potencia de carga mayor que 0 W.', 'error');
    invalidar('1.2');
    estado.P = P;
    mostrar(out, `Potencia registrada: <strong>${fmt(P, 0)} W</strong>.`, 'ok');
  }

  function calcularPaso1_2() {
    const out = $('resultado-1-2');
    if (!esPositivo(estado.P)) return mostrar(out, 'Primero registra la potencia en el Paso 1.1.', 'error');
    const t = numero('t_sesion');
    if (!esPositivo(t)) return mostrar(out, 'Ingresa una duración de sesión mayor que 0 h.', 'error');
    invalidar('1.3');
    estado.t = t;
    estado.E_sesion = estado.P * t;
    if (!esPositivo(estado.E_sesion)) { estado.E_sesion = null; return mostrar(out, 'La energía calculada está fuera del rango admitido. Revisa potencia y duración.', 'error'); }
    mostrar(out, `Energía por sesión: <strong>${fmt(estado.E_sesion, 0)} Wh</strong> (${fmt(estado.P, 0)} W × ${fmt(t)} h).`, 'ok');
  }

  function calcularPaso1_3() {
    const out = $('resultado-1-3');
    if (!esPositivo(estado.E_sesion)) return mostrar(out, 'Completa el Paso 1.2 antes de continuar.', 'error');
    const n = numero('num_dispositivos');
    if (!Number.isInteger(n) || n < 1) return mostrar(out, 'Ingresa un número entero de vehículos mayor que 0.', 'error');
    invalidar('1.4');
    estado.n = n;
    estado.E_aut = estado.E_sesion * n;
    if (!esPositivo(estado.E_aut)) { estado.E_aut = null; return mostrar(out, 'La energía total está fuera del rango admitido.', 'error'); }
    mostrar(out, `
      <p>Energía requerida: <strong>${fmt(estado.E_aut, 0)} Wh</strong> (${n} vehículo(s) × ${fmt(estado.E_sesion, 0)} Wh por sesión).</p>
      <p class="recomendacion"><strong>Recomendación de batería:</strong> La energía útil AC del banco, después de pérdidas, debe ser igual o mayor a <strong>${fmt(estado.E_aut, 0)} Wh</strong>.</p>
      <p class="nota">Esta es la energía teórica para alimentar simultáneamente ${n} vehículo(s) durante ${fmt(estado.t)} hora(s). Para seleccionar el banco comercial, considera además su capacidad utilizable y las pérdidas del sistema.</p>`, 'ok');
  }

  // Paso 1.4: número de baterías del banco
  function calcularPaso1_4() {
    const out = $('resultado-1-4');
    if (!esPositivo(estado.E_aut)) return mostrar(out, 'Completa el Paso 1.3 antes de calcular el banco.', 'error');

    const tipo = $('tipo_bateria')?.value;
    if (!CONFIG.dod[tipo]) return mostrar(out, 'Selecciona el tipo de batería: plomo o litio.', 'error');

    const modo = radio('modo_bateria')?.value;
    let Ebat, Vbat = null;
    if (modo === 'voltaje_capacidad') {
      const V = numero('V_bat');
      const C = numero('C_ah');
      if (!esPositivo(V) || !esPositivo(C)) return mostrar(out, 'Ingresa un voltaje nominal y una capacidad mayores que 0.', 'error');
      Vbat = V;
      Ebat = V * C * CONFIG.nbat / CONFIG.naut;
    } else if (modo === 'energia') {
      Ebat = numero('Ebat_wh');
      if (!esPositivo(Ebat)) return mostrar(out, 'Ingresa la energía de la batería mayor que 0 Wh.', 'error');
    } else {
      return mostrar(out, 'Elige cómo ingresar los datos de la batería.', 'error');
    }

    const dod = CONFIG.dod[tipo];
    const eta = numero('eta_bateria');
    if (!(eta > 0 && eta <= 1) || !esPositivo(Ebat)) return mostrar(out, 'Revisa la energía de la batería y la eficiencia (mayor que 0 y hasta 1).', 'error');
    const Eutil = Ebat * dod * eta;
    const n = Math.ceil(estado.E_aut / Eutil);
    if (!Number.isSafeInteger(n) || n < 1) return mostrar(out, 'La cantidad de baterías queda fuera del rango admitido.', 'error');
    const Ebanco = n * Eutil;

    invalidar('2.1');
    if (n > CONFIG.maxBaterias) {
      return mostrar(out,
        `Se requieren ${n} baterías, más del máximo de ${CONFIG.maxBaterias}. Considera adquirir una batería individual de mayor energía o capacidad y vuelve a calcular.`,
        'advertencia');
    }

    estado.banco = { tipo, dod, Ebat, Eutil, n, Ebanco };
    estado.Vbat = Vbat;

    const lineaPlomo = tipo === 'plomo'
      ? `<p class="advertencia"><strong>Baterías de plomo en paralelo:</strong> no se recomienda el paralelo automáticamente. Prefiere una unidad de mayor capacidad; confirma la configuración permitida, el reparto de corriente y las protecciones con el fabricante. Un controlador de carga no elimina por sí solo los desequilibrios.</p>`
      : '';

    mostrar(out, `
      <p>Energía nominal por batería (Ebat): <strong>${fmt(Ebat, 0)} Wh</strong></p>
      <p>DoD de ${CONFIG.nombreTipo[tipo]} (${dod}) × eficiencia (${eta}): energía útil AC por batería: <strong>${fmt(Eutil, 0)} Wh</strong></p>
      <p>Número de baterías: <strong>${n}</strong></p>
      <p>Energía del banco: <strong>E_banco = ${n} × ${fmt(Eutil, 0)} = ${fmt(Ebanco, 0)} Wh</strong>, igual o mayor que la energía requerida de ${fmt(estado.E_aut, 0)} Wh.</p>
      <p class="recomendacion"><strong>Recomendación:</strong> ${n === 1 ? "Una batería cubre el criterio energético." : "La cantidad calculada es un mínimo energético, no una autorización de conexión en paralelo."} Comprueba tensión del banco, corriente continua y compatibilidad con el inversor; usa únicamente conexiones admitidas por el fabricante.</p>
      ${lineaPlomo}
      <p class="nota">Este cálculo no incluye envejecimiento ni reserva adicional. Usa la misma referencia de batería en todo el banco. Conecta las baterías con el mismo estado de carga, usa cables de igual longitud y calibre, y respeta el máximo de baterías en paralelo que indique el fabricante.</p>`, 'ok');
  }

  function togglePaso14() {
    const modo = radio('modo_bateria')?.value;
    const a = $('campos-voltaje-capacidad');
    const b = $('campos-energia');
    if (a) a.hidden = modo !== 'voltaje_capacidad';
    if (b) b.hidden = modo !== 'energia';
  }

  // ================= SECCIÓN 2 =================

  // Paso 2.1: registra HSP, calcula E_pp y P_arreglo (paso 2.2)
  function registrarHSP() {
    const out = $('resultado-2-1');
    if (!estado.banco) return mostrar(out, 'Completa el Paso 1.4 para calcular el banco de baterías antes de registrar las HSP.', 'error');
    const HSP = numero('HSP');
    if (!esPositivo(HSP) || HSP > 24) return mostrar(out, 'Ingresa horas solar pico mayores que 0 y hasta 24.', 'error');

    invalidar('2.3');
    estado.HSP = HSP;
    const Epp = estado.E_aut * CONFIG.FP;   // energía diaria consumida × factor de pérdidas
    estado.P_arreglo = Epp / HSP;

    mostrar(out, `HSP registradas: <strong>${fmt(HSP)} h</strong>.`, 'ok');
    mostrar($('resultado-2-2'), `
      <p>Energía a producir (E_pp = E_autosuficiencia × ${CONFIG.FP}): <strong>${fmt(Epp, 0)} Wh/día</strong></p>
      <p>Potencia del arreglo (P_arreglo = E_pp ÷ HSP): <strong>${fmt(estado.P_arreglo, 0)} W</strong></p>`, 'ok');
    $('paso-2-2').style.display = 'block';
    calcularOpciones(true);
  }

  // Paso 2.3: número de paneles y tres configuraciones
  function calcularOpciones(silencioso) {
    const out = $('resultado-2-3');
    if (!esPositivo(estado.P_arreglo)) return;
    const P = numero('P_panel');
    const V = numero('V_nominal');

    if (!esPositivo(P) || !CONFIG.tensionesPanel.includes(V)) {
      if (!silencioso) {
        mostrar(out, !esPositivo(P)
          ? 'Ingresa la potencia nominal del panel mayor que 0.'
          : 'Selecciona el voltaje nominal del panel.', 'error');
      }
      return;
    }

    invalidar('2.3');
    const N = Math.ceil(estado.P_arreglo / P);
    if (!Number.isSafeInteger(N) || N < 1 || N > 100000) return mostrar(out, 'La cantidad de paneles queda fuera del rango de esta herramienta. Revisa los datos.', 'error');
    estado.panel = { N, P };
    estado.opciones = [1, 2, 3].map((p, i) => {
      const S = Math.ceil(N / p - EPS);
      const total = S * p;
      return {
        letra: ['A', 'B', 'C'][i],
        S, P: p, total,
        V_arr: V * S,
        I_arr: (P / V) * p,          // aproximación: no se pide Imp
        P_final: total * P,
        config: `${S}S × ${p}P`
      };
    });

    mostrar(out, `
      <p>Paneles necesarios (mínimo): <strong>${N}</strong> de ${fmt(P, 0)} W.</p>
      ${N > CONFIG.maxPanelesAviso ? `<p class="advertencia">Se necesitan más de ${CONFIG.maxPanelesAviso} paneles. Considera un panel de mayor potencia.</p>` : ''}
      <p class="nota">Las configuraciones se completan a un arreglo simétrico, por lo que pueden tener paneles adicionales. Las tensiones y corrientes son aproximaciones; la compatibilidad real se verifica con Voc, Vmp, Imp, Isc y el controlador.</p>`, 'ok');
    renderOpciones();
  }

  function autoCalcularPaso2_3() {
    calcularOpciones(false);
  }

  // Verificación de la opción elegida: cantidad de paneles y potencia frente a lo requerido.
  function verificarOpcion(op) {
    const { N } = estado.panel;
    const Preq = estado.P_arreglo;
    const cumpleCantidad = op.total >= N;
    const cumplePotencia = op.P_final >= Preq;
    const ok = cumpleCantidad && cumplePotencia;
    const extra = op.total - N;
    return `
      <div class="resultado visible ${ok ? '' : 'error'}" style="grid-column:1/-1;">
        <strong>Verificación de la Opción ${op.letra}: ${ok ? 'cubre cantidad y potencia estimadas' : 'no cubre cantidad y potencia'}</strong>
        <ul style="margin:8px 0 0 18px;">
          <li>Paneles requeridos: ${N} · Paneles de la opción: ${op.total}${extra > 0 ? ` (${extra} adicional(es))` : ''} · ${cumpleCantidad ? '✓' : '✗'}</li>
          <li>Potencia requerida del arreglo: ${fmt(Preq, 0)} W · Potencia final: ${fmt(op.P_final, 0)} W · ${cumplePotencia ? '✓' : '✗'}</li>
          <li>Voltaje nominal aproximado del arreglo: ${fmt(op.V_arr, 0)} V · Corriente aproximada (P/V nominal): ${fmt(op.I_arr)} A</li>
        </ul>
        <p class="nota">Compara el voltaje y la corriente con Voc, Vmp, Imp y los límites del controlador antes de elegir el equipo.</p>
      </div>`;
  }

  function renderOpciones() {
    const cont = $('opciones-container');
    if (!cont) return;
    const sel = estado.seleccion;
    const tarjetas = estado.opciones.map(o => {
      const marcada = o.letra === sel;
      const estilo = marcada
        ? 'border:2px solid #28a745;background:#d4edda;color:#155724;'
        : 'border:1px solid #cbd7d1;background:#fff;';
      return `
      <div style="border-radius:12px;padding:16px;${estilo}">
        <strong>Opción ${o.letra} · ${o.config}${marcada ? ' ✓' : ''}</strong>
        <ul style="margin:8px 0 12px 18px;">
          <li>Paneles totales: ${o.total}</li>
          <li>Voltaje nominal aproximado del arreglo: ${fmt(o.V_arr, 0)} V</li>
          <li>Corriente aproximada (P/V nominal): ${fmt(o.I_arr)} A</li>
          <li>Potencia final del arreglo: ${fmt(o.P_final, 0)} W</li>
        </ul>
        <button type="button" class="btn-calcular" data-opcion="${o.letra}">${marcada ? 'Opción seleccionada' : 'Seleccionar esta opción'}</button>
      </div>`;
    }).join('');
    const op = estado.opciones.find(o => o.letra === sel);
    cont.innerHTML = tarjetas + (op ? verificarOpcion(op) : '');
    $('selector-opciones').style.display = 'block';
  }

  function seleccionarOpcion(letra) {
    estado.seleccion = letra;
    renderOpciones();
    calcularSeccion3();
  }

  // ================= SECCIÓN 3 =================

  function calcularSeccion3() {
    const out = $('resultado-3');
    const op = estado.opciones.find(o => o.letra === estado.seleccion);
    if (!op) return mostrar(out, 'Selecciona una configuración en la sección 2 para ver las especificaciones del inversor.', 'pendiente');
    if (!esPositivo(estado.P)) return mostrar(out, 'Falta la potencia de consumo del Paso 1.1.', 'error');

    const tension = $('tension_salida')?.value;
    if (!tension) return mostrar(out, 'Selecciona si la salida será 110/120 V o 220/240 V.', 'pendiente');
    const salida = tension === '220' ? '220/240 V' : '110/120 V';

    const potenciaTotal = estado.P * estado.n;
    const lineaVoltaje = estado.Vbat
      ? `El voltaje de entrada DC del inversor debe ser compatible con la tensión nominal y el rango de operación del banco: <strong>${fmt(estado.Vbat, 0)} V</strong>.`
      : 'El voltaje de entrada DC del inversor debe coincidir con el del banco de baterías. Verifícalo en la ficha del banco antes de elegirlo.';

    mostrar(out, `
      <p><strong>Entrada (arreglo solar, Opción ${op.letra}):</strong> ${fmt(op.P_final, 0)} W</p>
      <p><strong>Salida (consumo, Paso 1.1):</strong> ${fmt(potenciaTotal, 0)} W (${estado.n} cargas simultáneas)</p>
      <p class="recomendacion"><strong>Recomendación:</strong> busca un inversor con potencia continua de salida de al menos ${fmt(potenciaTotal, 0)} W, con salida en ${salida}, y margen para los picos de la carga. Si usas un inversor híbrido, verifica su entrada FV; si usas un MPPT externo, verifica el arreglo con ese controlador. La potencia FV no es la entrada DC de batería del inversor.</p>
      <p class="advertencia">${lineaVoltaje}</p>`, 'ok');
  }

  // ================= REINICIO E INICIO =================

  function reiniciarApp() {
    document.querySelectorAll('#seccion-baterias input, #seccion-baterias select, #seccion-paneles input, #seccion-paneles select, #seccion-inversor select')
      .forEach(el => {
        if (el.type === 'radio') el.checked = false;
        else el.value = el.id === 'eta_bateria' ? '0.90' : '';
      });
    document.querySelectorAll('.error-campo').forEach(p => { p.hidden = true; p.textContent = ''; });
    estado.P = null;
    invalidar('1.2');
    limpiar($('resultado-1-1'));
    togglePaso14();
  }

  function iniciar() {
    document.querySelectorAll('input[name="modo_bateria"]').forEach(r => r.addEventListener('change', togglePaso14));
    $('opciones-container')?.addEventListener('click', e => {
      const b = e.target.closest('button[data-opcion]');
      if (b) seleccionarOpcion(b.dataset.opcion);
    });
    $('tension_salida')?.addEventListener('change', calcularSeccion3);
    const dependencias = { P_dispositivo:'1.2', t_sesion:'1.2', num_dispositivos:'1.3', tipo_bateria:'1.4', V_bat:'1.4', C_ah:'1.4', Ebat_wh:'1.4', eta_bateria:'1.4', HSP:'2.1', P_panel:'2.3', V_nominal:'2.3' };
    for (const [id, desde] of Object.entries(dependencias)) {
      const el = $(id);
      el?.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (id === 'P_dispositivo') { estado.P = null; limpiar($('resultado-1-1')); }
        invalidar(desde);
      });
    }
    document.querySelectorAll('input[name="modo_bateria"]').forEach(el => el.addEventListener('change', () => invalidar('1.4')));
    togglePaso14();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  // Funciones llamadas desde los atributos onclick / onchange del HTML
  Object.assign(window, {
    calcularPaso1_1, calcularPaso1_2, calcularPaso1_3, calcularPaso1_4,
    registrarHSP, autoCalcularPaso2_3, reiniciarApp
  });
})();
