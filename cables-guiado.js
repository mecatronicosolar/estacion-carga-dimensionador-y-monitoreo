/*
 * Dimensionamiento preliminar de conductores AC para estaciones de carga a 110, 120, 220 o 240 V.
 * V1.0 - Uso académico. No sustituye el diseño de instalación por personal competente.
 * Entradas: potencia del paso 1.1 (P_dispositivo), tensión (tension_ac) y distancia de ida (distancia_ac).
 * Configuración: cobre, circuito AC monofásico de 2 conductores activos: L-N (110/120 V) o L1-L2 (220/240 V), FP=1.
 * Criterio de caída de tensión: 3% en el circuito analizado.
 * Resistencia aproximada: rho = 0.021 ohm*mm2/m (cobre a ~75 °C), conservadora.
 * Ampacidades de referencia: columna 60 °C, Cu, tres conductores portadores o menos.
 * Sin factores de corrección por temperatura, agrupamiento o métodos de instalación.
 * Nota: se adopta circuito independiente de al menos 20 A para entornos domiciliarios
 * o similares según RETIE 2026, Art. 3.17.7, literal b. No aplica indiscriminadamente.
 */
(function (root) {
  'use strict';
  const CONFIG = Object.freeze({
    defaultVoltage: 110,
    supportedVoltages: Object.freeze([110, 120, 220, 240]),
    maxDropPercent: 3,
    copperResistivityOhmMm2PerM: 0.021,
    powerFactor: 1,
    minCircuitAmps: 20,
    continuousLoadFactor: 1.25,
    prototypeCurrentLimit: 10,
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

  function calculateAcCable(distanceM, powerW, voltageV = CONFIG.defaultVoltage, residential = true) {
    const distance = Number(distanceM);
    const power = Number(powerW);
    const voltage = Number(voltageV);
    if (!CONFIG.supportedVoltages.includes(voltage)) {
      return { ok: false, error: 'Selecciona una tensión admitida: 110, 120, 220 o 240 V.' };
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      return { ok: false, error: 'La distancia debe ser mayor que 0 m.' };
    }
    if (!Number.isFinite(power) || power <= 0) {
      return { ok: false, error: 'Primero registra una potencia de carga mayor que 0 W en la Sección 1.' };
    }
    if (distance > 10000 || power > 50000) {
      return { ok: false, error: 'Los valores exceden el alcance de esta herramienta de dimensionamiento preliminar.' };
    }

    const currentA = power / (voltage * CONFIG.powerFactor);
    const designCurrentA = currentA * CONFIG.continuousLoadFactor;
    const nominalCircuitA = Math.max(designCurrentA, residential ? CONFIG.minCircuitAmps : 0);
    const maxDropV = voltage * CONFIG.maxDropPercent / 100;
    const minimumSectionDropMm2 =
      2 * CONFIG.copperResistivityOhmMm2PerM * distance * currentA / maxDropV;

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

    const dropV = 2 * CONFIG.copperResistivityOhmMm2PerM * distance * currentA / cable.sectionMm2;
    const dropPercent = 100 * dropV / voltage;
    const mechanism = cable.awg === byAmpacity.awg && cable.awg === byDrop.awg
      ? 'Ampacidad y caída de tensión'
      : cable.awg === byAmpacity.awg ? 'Ampacidad' : 'Caída de tensión';

    return {
      ok: true,
      distanceM: distance,
      powerW: power,
      voltageV: voltage,
      connection: voltage <= 120 ? 'L-N (fase y neutro)' : 'L1-L2 (dos líneas)',
      wireNames: voltage <= 120 ? 'fase y neutro' : 'L1 y L2',
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
      overPrototypeLimit: currentA > CONFIG.prototypeCurrentLimit,
      outsidePrototypeVoltage: voltage !== CONFIG.defaultVoltage,
      assumptions: `Circuito AC monofásico ${voltage <= 120 ? 'L-N' : 'L1-L2'}, cobre; FP=1; ida y retorno; ampacidad Cu a 60 °C, ambiente 30 °C, hasta tres portadores sin ajustes; carga continua ×1,25; ${residential ? 'mínimo 20 A domiciliario/similar' : 'estación dedicada sin mínimo domiciliario'}.`
    };
  }

  root.calcularConductorAC = calculateAcCable;
  // Compatibilidad con la interfaz de 110 V anterior.
  root.calcularConductorAC110 = (distance, power) => calculateAcCable(distance, power, 110);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateAcCable, CONFIG };
  }

  if (typeof document === 'undefined') return;
  const powerEl = document.getElementById('P_dispositivo');
  const distanceEl = document.getElementById('distancia_ac');
  const voltageEl = document.getElementById('tension_ac');
  const environmentEl = document.getElementById('entorno_ac');
  const connectionEl = document.getElementById('configuracion_ac');
  const out = document.getElementById('resultado-4');
  const btn = document.getElementById('btn-calcular-ac');
  const powerDisplay = document.getElementById('potencia_ac_origen');
  const status = document.getElementById('estado-potencia-ac');
  if (!powerEl || !distanceEl || !voltageEl || !out || !btn) return;

  const fmt = (number, decimals = 2) => number.toLocaleString('es-CO', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  function showPowerSource() {
    const v = Number(voltageEl.value);
    if (connectionEl) connectionEl.textContent = v <= 120 ? `${v} V · fase y neutro (L-N)` : `${v} V · dos líneas (L1-L2)`;
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
    const warnings = [
      res.overPrototypeLimit
        ? `<p class="aviso-cable"><strong>Límite del prototipo:</strong> la corriente calculada (${fmt(res.currentA)} A) supera los 10 A previstos para el prototipo; no implica que sus componentes soporten esta carga.</p>`
        : '',
      res.outsidePrototypeVoltage
        ? `<p class="aviso-cable"><strong>Tensión fuera del escenario original:</strong> ${res.voltageV} V es un escenario de dimensionamiento adicional. Comprueba que inversor, EVSE, vehículo, protecciones y red admitan esta tensión; no se debe conectar el prototipo de 110 V a otra tensión sin rediseño.</p>`
        : ''
    ].join('');
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
        <div><small>Ampacidad de referencia</small><strong>${fmt(res.wire.ampacityA, 0)} A</strong></div>
        <div><small>Caída de tensión calculada</small><strong>${fmt(res.voltageDropV)} V (${fmt(res.voltageDropPercent)} %)</strong></div>
        <div><small>Caída máxima objetivo</small><strong>${fmt(res.voltageDropLimitV)} V (3,00 %)</strong></div>
        <div><small>Sección por caída, teórica</small><strong>${fmt(res.minimumSectionDropMm2)} mm²</strong></div>
        <div><small>Tensión al final (estimada)</small><strong>${fmt(res.receivedVoltageV)} V</strong></div>
        <div><small>Condición determinante</small><strong>${res.controllingCriterion}</strong></div>
      </div>
      ${warnings}
      <p class="nota-ac"><strong>Supuestos aplicados:</strong> ${res.assumptions}</p>
      <p class="nota-ac"><strong>Cómo se obtuvo:</strong> I = P / ${res.voltageV}; I<sub>diseño</sub> = 1,25·I; S<sub>caída</sub> = 2·ρ·L·I / ${fmt(res.voltageDropLimitV)} V, con ρ = 0,021 Ω·mm²/m. Se selecciona el primer AWG que cumpla caída ≤ 3 % y ampacidad ≥ ${fmt(res.minimumCircuitAmpacityA)} A.</p>
      <p class="nota-ac"><strong>Verificación pendiente:</strong> el mínimo de 20 A corresponde a circuitos domiciliarios o similares para carga de VE según RETIE 2026, art. 3.17.7(b). No se incluyen correcciones de temperatura, agrupamiento, instalación o fabricante, ni dimensionamiento del conductor de protección (PE), del interruptor automático ni del diferencial. Para 220/240 V la configuración mostrada usa L1-L2, no fase-neutro; el PE sigue siendo obligatorio según corresponda. El calibre debe validarse con la NTC 2050, el RETIE aplicable, las terminales y la ficha del equipo.</p>
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
  function run() {
    showPowerSource();
    const d = distanceEl.value.trim();
    if (d === '') return markError('Ingresa la distancia de ida entre el tablero/inversor y el EVSE.');
    const p = powerEl.value.trim();
    if (p === '') return markError('Ingresa primero la potencia del vehículo en el Paso 1.1.');
    const res = calculateAcCable(Number(d), Number(p), Number(voltageEl.value), environmentEl.value === 'domiciliario');
    if (!res.ok) return markError(res.error);
    showResult(res);
  }
  btn.addEventListener('click', run);
  environmentEl.addEventListener('change', () => { if (out.classList.contains('visible')) run(); });
  powerEl.addEventListener('input', () => {
    showPowerSource();
    if (out.classList.contains('visible')) run();
  });
  voltageEl.addEventListener('change', () => {
    showPowerSource();
    if (out.classList.contains('visible')) run();
  });
  distanceEl.addEventListener('input', () => {
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
    voltageEl.value = String(CONFIG.defaultVoltage);
    environmentEl.value = 'domiciliario';
    out.className = 'resultado resultado-ac';
    out.replaceChildren();
    showPowerSource();
  });
  showPowerSource();
})(typeof globalThis === 'object' ? globalThis : this);
