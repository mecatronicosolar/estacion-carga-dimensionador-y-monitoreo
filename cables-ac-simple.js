/*
 * Dimensionamiento preliminar de conductores AC para estaciones de carga a 110, 120, 220 o 240 V monofásicos
 * y 220 V trifásicos (línea a línea).
 * V1.1 - Uso académico. No sustituye el diseño de instalación por personal competente.
 * Entradas: potencia del paso 1.1 (P_dispositivo), tensión y servicio heredados de la salida del inversor
 * (tension_ac: "110", "220" o "220T") y distancia de ida (distancia_ac).
 * Configuración: cobre, FP=1.
 *   - Monofásico / bifásico (2 conductores activos): caída con factor de lazo 2 (ida y retorno).
 *   - Trifásico equilibrado (L1-L2-L3, sin neutro): I = P / (√3·V·FP) y caída con factor √3.
 * Criterio de caída de tensión: 3% en el circuito analizado.
 * Resistencia aproximada: rho = 0.021 ohm*mm2/m (cobre a ~75 °C), conservadora.
 * Ampacidades de referencia: columna 60 °C, Cu, tres conductores portadores o menos.
 * Sin factores de corrección por temperatura, agrupamiento o métodos de instalación.
 * Nota: el circuito se calcula con un mínimo de 20 A (circuito independiente y exclusivo,
 * RETIE 2026, Art. 3.17.7, literal b). Si la corriente de diseño supera 20 A, se usa esa corriente.
 * Distancia de ida limitada a 7,5 m como recomendación de la NTC 2050, art. 625.17.
 */
(function (root) {
  'use strict';
  const CONFIG = Object.freeze({
    defaultVoltage: 110,
    supportedVoltages: Object.freeze([110, 120, 220, 240]),
    threePhaseVoltage: 220,
    maxDropPercent: 3,
    copperResistivityOhmMm2PerM: 0.021,
    powerFactor: 1,
    minCircuitAmps: 20,
    continuousLoadFactor: 1.25,
    maxDistanceM: 7.5,
    // Calibres AWG 60 °C Cu: valores nominales empleados como referencia.
    sizes: Object.freeze([
      { awg: '14', sectionMm2: 2.08, ampacityA: 15 },
      { awg: '12', sectionMm2: 3.31, ampacityA: 20 },
      { awg: '10', sectionMm2: 5.26, ampacityA: 30 },
      { awg: '8', sectionMm2: 8.37, ampacityA: 40 },
      { awg: '6', sectionMm2: 13.30, ampacityA: 55 },
      { awg: '4', sectionMm2: 21.15, ampacityA: 70 },
      { awg: '3', sectionMm2: 26.67, ampacityA: 85 },
      { awg: '2', sectionMm2: 33.62, ampacityA: 95 },
      { awg: '1', sectionMm2: 42.41, ampacityA: 110 },
      { awg: '1/0', sectionMm2: 53.49, ampacityA: 125 },
      { awg: '2/0', sectionMm2: 67.43, ampacityA: 145 },
      { awg: '3/0', sectionMm2: 85.01, ampacityA: 165 },
      { awg: '4/0', sectionMm2: 107.22, ampacityA: 195 }
    ])
  });

  // Convierte el valor del campo tension_ac ("110", "220", "220T") en tensión y número de fases.
  function parseVoltageValue(raw) {
    const text = String(raw == null ? '' : raw).trim();
    return { voltage: Number(text.replace('T', '')), phases: text.endsWith('T') ? 3 : 1 };
  }

  function calculateAcCable(distanceM, powerW, voltageV = CONFIG.defaultVoltage, phases = 1) {
    const distance = Number(distanceM);
    const power = Number(powerW);
    const voltage = Number(voltageV);
    const threePhase = phases === 3;
    if (threePhase) {
      if (voltage !== CONFIG.threePhaseVoltage) {
        return { ok: false, error: 'El servicio trifásico admitido es de 220 V entre líneas.' };
      }
    } else if (!CONFIG.supportedVoltages.includes(voltage)) {
      return { ok: false, error: 'Selecciona una tensión admitida: 110, 120, 220 o 240 V.' };
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      return { ok: false, error: 'La distancia debe ser mayor que 0 m.' };
    }
    if (!Number.isFinite(power) || power <= 0) {
      return { ok: false, error: 'Primero registra una potencia de carga mayor que 0 W en la Sección 1.' };
    }
    if (power > 50000) {
      return { ok: false, error: 'La potencia excede el alcance de esta herramienta de dimensionamiento preliminar.' };
    }

    const sqrt3 = Math.sqrt(3);
    // Trifásico: I = P / (√3·V·FP), con V línea a línea. Monofásico/bifásico: I = P / (V·FP).
    const currentA = threePhase
      ? power / (sqrt3 * voltage * CONFIG.powerFactor)
      : power / (voltage * CONFIG.powerFactor);
    // Factor de lazo: 2 en monofásico/bifásico (ida y retorno); √3 en trifásico equilibrado.
    const loopFactor = threePhase ? sqrt3 : 2;
    const designCurrentA = currentA * CONFIG.continuousLoadFactor;
    // Piso de 20 A para circuito domiciliario independiente; si la corriente de diseño es mayor, se usa esa.
    const nominalCircuitA = Math.max(designCurrentA, CONFIG.minCircuitAmps);
    const maxDropV = voltage * CONFIG.maxDropPercent / 100;
    const minimumSectionDropMm2 =
      loopFactor * CONFIG.copperResistivityOhmMm2PerM * distance * currentA / maxDropV;

    const byAmpacity = CONFIG.sizes.find(c => c.ampacityA >= nominalCircuitA);
    const byDrop = CONFIG.sizes.find(c => c.sectionMm2 >= minimumSectionDropMm2);
    const cable = CONFIG.sizes.find(c => c.ampacityA >= nominalCircuitA &&
      c.sectionMm2 >= minimumSectionDropMm2);

    if (!cable) {
      return {
        ok: false,
        error: 'No hay un calibre en la tabla de referencia que satisfaga ambos criterios. Se requiere un diseño especializado.',
        currentA, designCurrentA, minimumSectionDropMm2
      };
    }

    const dropV = loopFactor * CONFIG.copperResistivityOhmMm2PerM * distance * currentA / cable.sectionMm2;
    const dropPercent = 100 * dropV / voltage;
    const mechanism = cable.awg === byAmpacity.awg && cable.awg === byDrop.awg
      ? 'Ampacidad y caída de tensión'
      : cable.awg === byAmpacity.awg ? 'Ampacidad' : 'Caída de tensión';

    const connection = threePhase
      ? 'L1-L2-L3 (tres fases)'
      : voltage <= 120 ? 'L-N (fase y neutro)' : 'L1-L2 (dos líneas)';
    const wireNames = threePhase
      ? 'tres fases (L1, L2 y L3)'
      : voltage <= 120 ? 'fase y neutro' : 'L1 y L2';
    const lineNote = threePhase
      ? 'trifásico equilibrado L1-L2-L3 sin neutro; caída con factor √3 (sin conductor de retorno)'
      : `monofásico ${voltage <= 120 ? 'L-N' : 'L1-L2'} con ida y retorno (factor 2)`;

    return {
      ok: true,
      distanceM: distance,
      powerW: power,
      voltageV: voltage,
      phases: threePhase ? 3 : 1,
      connection,
      wireNames,
      loopFactor,
      currentA,
      designCurrentA,
      minimumCircuitAmpacityA: nominalCircuitA,
      voltageDropLimitPercent: CONFIG.maxDropPercent,
      voltageDropLimitV: maxDropV,
      minimumSectionDropMm2,
      wire: { ...cable },
      voltageDropV: dropV,
      voltageDropPercent: dropPercent,
      receivedVoltageV: voltage - dropV,
      controllingCriterion: mechanism,
      assumptions: `Circuito AC ${lineNote}; cobre; FP=1; ampacidad Cu a 60 °C, ambiente 30 °C, hasta tres portadores sin ajustes; carga continua ×1,25; circuito independiente y exclusivo con mínimo 20 A; distancia de ida ≤ ${CONFIG.maxDistanceM} m.`
    };
  }

  root.calcularConductorAC = calculateAcCable;
  root.parseVoltageValue = parseVoltageValue;
  // Compatibilidad con la interfaz de 110 V anterior.
  root.calcularConductorAC110 = (distance, power) => calculateAcCable(distance, power, 110);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateAcCable, parseVoltageValue, CONFIG };
  }

  if (typeof document === 'undefined') return;
  const powerEl = document.getElementById('P_dispositivo');
  const distanceEl = document.getElementById('distancia_ac');
  const voltageEl = document.getElementById('tension_ac');
  const salidaEl = document.getElementById('tension_salida');
  const voltageTextEl = document.getElementById('tension_ac_valor');
  const connectionEl = document.getElementById('configuracion_ac');
  const out = document.getElementById('resultado-4');
  const btn = document.getElementById('btn-calcular-ac');
  const powerDisplay = document.getElementById('potencia_ac_origen');
  const status = document.getElementById('estado-potencia-ac');
  const suggestionEl = document.getElementById('sugerencia_distancia_ac');
  if (!powerEl || !distanceEl || !voltageEl || !out || !btn) return;

  // Tensión y servicio de la sección 4 se heredan de la salida elegida en la sección 3.
  const VOLTAGE_FROM_OUTPUT = Object.freeze({
    '110': { value: '110', text: '110 V · fase y neutro (L-N), salida 110/120 V del inversor' },
    '220': { value: '220', text: '220 V · dos líneas (L1-L2), salida 220/240 V del inversor' },
    '220T': { value: '220T', text: '220 V · tres fases (L1-L2-L3), salida trifásica del inversor' }
  });
  function syncVoltageFromInverter() {
    const key = salidaEl ? salidaEl.value : '';
    const mapped = VOLTAGE_FROM_OUTPUT[key];
    const previous = voltageEl.value;
    voltageEl.value = mapped ? mapped.value : '';
    if (voltageTextEl) {
      voltageTextEl.textContent = mapped ? mapped.text : 'Selecciona primero la tensión de salida en la sección 3';
    }
    if (previous !== voltageEl.value) voltageEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
  root.sincronizarTensionAC = syncVoltageFromInverter;
  if (salidaEl) salidaEl.addEventListener('change', syncVoltageFromInverter);

  const fmt = (number, decimals = 2) => number.toLocaleString('es-CO', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  function showPowerSource() {
    const { voltage: v, phases } = parseVoltageValue(voltageEl.value);
    if (connectionEl) {
      connectionEl.textContent = !v
        ? 'Tensión sin seleccionar'
        : phases === 3 ? `${v} V · tres fases (L1-L2-L3)`
        : v <= 120 ? `${v} V · fase y neutro (L-N)` : `${v} V · dos líneas (L1-L2)`;
    }
    const power = Number(powerEl.value);
    if (powerDisplay) powerDisplay.textContent = power > 0 && Number.isFinite(power)
      ? `${fmt(power, 0)} W`
      : 'Sin registrar';
    if (status) status.textContent = power > 0 && Number.isFinite(power)
      ? 'Se usa la potencia escrita en el Paso 1.1.'
      : 'Registra la potencia en el Paso 1.1 para habilitar este cálculo.';
  }
  function markError(message) {
    out.className = 'resultado resultado-ac visible error';
    out.replaceChildren();
    const p = document.createElement('p');
    p.textContent = message;
    out.appendChild(p);
  }
  function showResult(res) {
    const formulaDrop = res.phases === 3
      ? `S<sub>caída</sub> = √3·ρ·L·I / ${fmt(res.voltageDropLimitV)} V`
      : `S<sub>caída</sub> = 2·ρ·L·I / ${fmt(res.voltageDropLimitV)} V`;
    const formulaCurrent = res.phases === 3
      ? `I = P / (√3 · ${res.voltageV} V)`
      : `I = P / ${res.voltageV} V`;
    const phaseNote = res.phases === 3
      ? ' El cálculo supone carga trifásica equilibrada y no incluye neutro; si el equipo lo requiere, debe verificarse aparte.'
      : '';
    out.className = 'resultado resultado-ac visible';
    // Solo se interpolan números de salida del cálculo y texto interno controlado por el código.
    out.innerHTML = `
      <div class="calibre-ac-principal">
        <span>Conductores ${res.wireNames} · recomendación preliminar</span>
        <strong>${res.wire.awg} AWG</strong>
        <span>${fmt(res.wire.sectionMm2)} mm² · cobre</span>
      </div>
      <div class="datos-cable-grid">
        <div><small>Potencia de carga</small><strong>${fmt(res.powerW)} W</strong></div>
        <div><small>Distancia de ida</small><strong>${fmt(res.distanceM)} m</strong></div>
        <div><small>Tensión y conexión</small><strong>${res.voltageV} V · ${res.connection}</strong></div>
        <div><small>Corriente de carga</small><strong>${fmt(res.currentA)} A</strong></div>
        <div><small>Corriente de diseño (×1,25)</small><strong>${fmt(res.designCurrentA)} A</strong></div>
        <div><small>Corriente mínima del circuito</small><strong>${fmt(res.minimumCircuitAmpacityA)} A</strong></div>
        <div><small>Ampacidad de referencia</small><strong>${fmt(res.wire.ampacityA, 0)} A</strong></div>
        <div><small>Caída de tensión calculada</small><strong>${fmt(res.voltageDropV)} V (${fmt(res.voltageDropPercent)} %)</strong></div>
        <div><small>Caída máxima objetivo</small><strong>${fmt(res.voltageDropLimitV)} V (3,00 %)</strong></div>
        <div><small>Sección por caída, teórica</small><strong>${fmt(res.minimumSectionDropMm2)} mm²</strong></div>
        <div><small>Tensión al final (estimada)</small><strong>${fmt(res.receivedVoltageV)} V</strong></div>
        <div><small>Condición determinante</small><strong>${res.controllingCriterion}</strong></div>
      </div>
      <p class="nota-ac"><strong>Supuestos aplicados:</strong> ${res.assumptions}</p>
      <p class="nota-ac"><strong>Cómo se obtuvo:</strong> ${formulaCurrent}; I<sub>diseño</sub> = 1,25·I; ${formulaDrop}, con ρ = 0,021 Ω·mm²/m. Se selecciona el primer AWG que cumpla caída ≤ 3 % y ampacidad ≥ ${fmt(res.minimumCircuitAmpacityA)} A.</p>
      <p class="nota-ac"><strong>Verificación pendiente:</strong> el mínimo de 20 A corresponde a circuitos domiciliarios o similares para carga de VE según RETIE 2026, art. 3.17.7(b). No se incluyen correcciones de temperatura, agrupamiento, instalación o fabricante, ni dimensionamiento del conductor de protección (PE), del interruptor automático ni del diferencial.${phaseNote} El calibre debe validarse con la NTC 2050, el RETIE aplicable, las terminales y la ficha del equipo.</p>
      <div class="acciones-cable"><button type="button" class="btn-copiar-ac" id="copiar-ac">Copiar resultados</button><span id="mensaje-copiar-ac" aria-live="polite"></span></div>
    `;
    const copy = document.getElementById('copiar-ac');
    copy.addEventListener('click', () => {
      const summary = `Dimensionamiento conductor AC ${res.voltageV} V (preliminar)\nConexión: ${res.connection}\nPotencia: ${fmt(res.powerW)} W\nDistancia de ida: ${fmt(res.distanceM)} m\nCorriente: ${fmt(res.currentA)} A\nCorriente diseño: ${fmt(res.designCurrentA)} A\n${res.wireNames}: ${res.wire.awg} AWG Cu (${fmt(res.wire.sectionMm2)} mm²)\nCaída de tensión: ${fmt(res.voltageDropV)} V (${fmt(res.voltageDropPercent)} %)\nCriterio: ${res.controllingCriterion}\nSujeto a revisión de RETIE 2026/NTC 2050, condiciones de montaje y protecciones.`;
      const msg = document.getElementById('mensaje-copiar-ac');
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        msg.textContent = 'La función de copiar requiere un navegador con acceso al portapapeles.';
        return;
      }
      navigator.clipboard.writeText(summary)
        .then(() => { msg.textContent = 'Resultado copiado.'; })
        .catch(() => { msg.textContent = 'No se pudo copiar. Verifica los permisos del navegador.'; });
    });
  }
  // Sugerencia de distancia (NTC 2050, art. 625.17). Es una recomendación: no bloquea el cálculo.
  function updateSuggestion() {
    if (!suggestionEl) return;
    const base = `Recomendación NTC 2050, art. 625.17: distancia de ida de hasta ${fmt(CONFIG.maxDistanceM, 1)} m.`;
    const d = Number(distanceEl.value);
    if (distanceEl.value.trim() !== '' && d > CONFIG.maxDistanceM) {
      suggestionEl.textContent = `${base} Su distancia (${fmt(d)} m) la supera; el cálculo sigue disponible, pero revisa el recorrido.`;
    } else {
      suggestionEl.textContent = base;
    }
  }
  function run() {
    showPowerSource();
    const d = distanceEl.value.trim();
    if (d === '') return markError('Ingresa la distancia de ida entre el tablero/inversor y el EVSE.');
    const p = powerEl.value.trim();
    if (p === '') return markError('Ingresa primero la potencia del vehículo en el Paso 1.1.');
    if (!voltageEl.value) return markError('Elige la tensión de salida del inversor en la sección 3 para calcular los conductores.');
    const { voltage, phases } = parseVoltageValue(voltageEl.value);
    const res = calculateAcCable(Number(d), Number(p), voltage, phases);
    if (!res.ok) return markError(res.error);
    showResult(res);
  }
  btn.addEventListener('click', run);
  powerEl.addEventListener('input', () => {
    showPowerSource();
    if (out.classList.contains('visible')) run();
  });
  voltageEl.addEventListener('change', () => {
    showPowerSource();
    if (out.classList.contains('visible')) run();
  });
  distanceEl.addEventListener('input', () => {
    updateSuggestion();
    if (out.classList.contains('visible')) {
      if (distanceEl.value === '') {
        out.className = 'resultado resultado-ac';
        out.replaceChildren();
      } else run();
    }
  });
  const resetButton = document.querySelector('.btn-reiniciar');
  if (resetButton) resetButton.addEventListener('click', () => {
    distanceEl.value = '';
    out.className = 'resultado resultado-ac';
    out.replaceChildren();
    syncVoltageFromInverter();
    updateSuggestion();
    showPowerSource();
  });
  syncVoltageFromInverter();
  updateSuggestion();
  showPowerSource();
})(typeof globalThis === 'object' ? globalThis : this);
