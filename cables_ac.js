/*
 * Dimensionamiento preliminar de conductores AC.
 * Monofásico: 110, 120, 220 o 240 V (L-N o L1-L2).
 * Trifásico: 380 V entre fases (3 fases equilibradas).
 * Cobre, FP=1, criterio de caída 3 %, ρ = 0,021 Ω·mm²/m.
 * Uso académico. No sustituye el diseño de instalación por personal competente.
 */
(function (root) {
  'use strict';

  const CONFIG = Object.freeze({
    defaultVoltage: 110,
    supportedVoltages: Object.freeze([110, 120, 220, 240, 380]),
    maxDropPercent: 3,
    copperResistivityOhmMm2PerM: 0.021,
    powerFactor: 1,
    minCircuitAmps: 20,
    continuousLoadFactor: 1.25,
    prototypeCurrentLimit: 10,
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

  function calculateAcCable(distanceM, powerW, voltageV = CONFIG.defaultVoltage, residential = true, correction = 1, pf = 1) {
    const distance = Number(distanceM);
    const power = Number(powerW);
    const voltage = Number(voltageV);

    if (!CONFIG.supportedVoltages.includes(voltage)) {
      return { ok: false, error: 'Selecciona una tensión admitida: 110, 120, 220, 240 o 380 V.' };
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      return { ok: false, error: 'La distancia debe ser mayor que 0 m.' };
    }
    if (!Number.isFinite(power) || power <= 0) {
      return { ok: false, error: 'Registra primero la potencia de carga en el paso 1.1.' };
    }
    if (distance > 10000 || power > 50000) {
      return { ok: false, error: 'Los valores exceden el alcance de esta herramienta de dimensionamiento preliminar.' };
    }

    if (!Number.isFinite(correction) || correction <= 0 || correction > 1 || !Number.isFinite(pf) || pf <= 0 || pf > 1) return {ok:false,error:'Factor de corrección y FP deben estar entre 0 y 1.'};
    const trifasica = voltage === 380;
    // Monofásico: ΔV = 2·ρ·L·I/A (ida y retorno)
    // Trifásico:  ΔV = √3·ρ·L·I/A (tres conductores equilibrados)
    const k = trifasica ? Math.sqrt(3) : 2;
    const currentA = trifasica
      ? power / (Math.sqrt(3) * voltage * pf)
      : power / (voltage * pf);
    const designCurrentA = currentA * CONFIG.continuousLoadFactor;
    const nominalCircuitA = Math.max(designCurrentA, residential ? CONFIG.minCircuitAmps : 0);
    const maxDropV = voltage * CONFIG.maxDropPercent / 100;
    const minimumSectionDropMm2 =
      k * CONFIG.copperResistivityOhmMm2PerM * distance * currentA / maxDropV;

    const byAmpacity = CONFIG.sizes.find(c => c.ampacityA * correction >= nominalCircuitA);
    const byDrop = CONFIG.sizes.find(c => c.sectionMm2 >= minimumSectionDropMm2);
    const cable = CONFIG.sizes.find(c => c.ampacityA * correction >= nominalCircuitA &&
      c.sectionMm2 >= minimumSectionDropMm2);

    if (!cable) {
      return {
        ok: false,
        error: 'No hay un calibre en la tabla de referencia que satisfaga ambos criterios. Se requiere un diseño especializado.',
        currentA, designCurrentA, minimumSectionDropMm2
      };
    }

    const dropV = k * CONFIG.copperResistivityOhmMm2PerM * distance * currentA / cable.sectionMm2;
    const dropPercent = 100 * dropV / voltage;
    const mechanism = cable.awg === byAmpacity.awg && cable.awg === byDrop.awg
      ? 'Ampacidad y caída de tensión'
      : cable.awg === byAmpacity.awg ? 'Ampacidad' : 'Caída de tensión';

    let connection, wireNames, formulaText, sectionFormula, assumptions;
    if (trifasica) {
      connection = '3 fases (380 V entre fases)';
      wireNames = 'fases A, B y C';
      formulaText = `I = P ÷ (√3 × ${voltage} V × FP)`;
      sectionFormula = '√3·ρ·L·I ÷ ΔV_máx';
      assumptions = `Circuito trifásico equilibrado, cobre; FP=${pf}; distancia de ida (ΔV = √3·ρ·L·I/A); ampacidad Cu a 60 °C, ambiente 30 °C, hasta tres portadores en tabla base; carga continua ×1,25; ${residential ? 'mínimo 20 A domiciliario/similar' : 'estación dedicada sin mínimo domiciliario'}. Neutro y conductor de protección (PE) no dimensionados.`;
    } else {
      connection = voltage <= 120 ? 'L-N (fase y neutro)' : 'L1-L2 (dos líneas)';
      wireNames = voltage <= 120 ? 'fase y neutro' : 'L1 y L2';
      formulaText = `I = P ÷ (${voltage} V × ${pf})`;
      sectionFormula = '2·ρ·L·I ÷ ΔV_máx';
      assumptions = `Circuito AC monofásico ${voltage <= 120 ? 'L-N' : 'L1-L2'}, cobre; FP=${pf}; ida y retorno; ampacidad Cu a 60 °C, ambiente 30 °C, hasta tres portadores en tabla base; carga continua ×1,25; ${residential ? 'mínimo 20 A domiciliario/similar' : 'estación dedicada sin mínimo domiciliario'}.`;
    }

    return {
      ok: true,
      correctedAmpacityA: cable.ampacityA * correction,
      distanceM: distance,
      powerW: power,
      voltageV: voltage,
      connection,
      wireNames,
      formulaText,
      sectionFormula,
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
      assumptions: assumptions + ` Factor corrector aplicado: ${correction}; FP aplicado: ${pf}. Caída resistiva conservadora, sin reactancia.`,
    };
  }

  root.calcularConductorAC = calculateAcCable;
  root.calcularConductorAC110 = (distance, power) => calculateAcCable(distance, power, 110);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateAcCable, CONFIG };
  }

  if (typeof document === 'undefined') return;

  // ===== INTERFAZ =====
  const distanceEl = document.getElementById('distancia_ac');
  const voltageEl = document.getElementById('tension_ac');
  const environmentEl = document.getElementById('entorno_ac');
  const connectionEl = document.getElementById('configuracion_ac');
  const powerDisplay = document.getElementById('potencia_ac_origen');
  const status = document.getElementById('estado-potencia-ac');
  const out = document.getElementById('resultado-4');
  const btn = document.getElementById('btn-calcular-ac');
  if (!distanceEl || !voltageEl || !out || !btn) return;

  const fmt = (number, decimals = 2) => Number(number).toLocaleString('es-CO', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });

  // Lee la potencia REGISTRADA en el paso 1.1 (estado de calculos.js),
  // no el texto del campo, que puede estar escrito pero sin registrar.
  function potenciaRegistrada() {
    if (typeof estado === 'undefined' || !estado) return null;
    const p = Number(estado.P_dispositivo);
    return Number.isFinite(p) && p > 0 ? p : null;
  }

  function showPowerSource() {
    const v = Number(voltageEl.value);
    if (connectionEl) {
      connectionEl.textContent = v === 380
        ? '380 V · 3 fases'
        : v <= 120 ? `${v} V · fase y neutro (L-N)` : `${v} V · dos líneas (L1-L2)`;
    }
    const p = potenciaRegistrada();
    if (powerDisplay) powerDisplay.textContent = p ? `${fmt(p, 0)} W` : 'Sin registrar';
    if (status) {
      status.textContent = p
        ? 'Se usa la potencia registrada en el Paso 1.1.'
        : 'Registra la potencia en el Paso 1.1 con el botón «Registrar potencia».';
    }
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
        ? `<p class="aviso-cable"><strong>Corriente superior a 10 A:</strong> la corriente calculada (${fmt(res.currentA)} A) supera el umbral ilustrativo de 10 A; no hay límite de placa documentado; los componentes del caso deben soportarla.</p>`
        : '',
      res.outsidePrototypeVoltage
        ? `<p class="aviso-cable"><strong>Tensión fuera del escenario de 110 V:</strong> ${res.voltageV} V corresponde a un caso de dimensionamiento adicional. Verifica inversor, EVSE, vehículo y protecciones para esta tensión.</p>`
        : ''
    ].join('');

    out.className = 'resultado resultado-ac visible';
    out.innerHTML = `
      <div class="calibre-ac-principal">
        <span>Conductores ${res.wireNames} · recomendación preliminar</span>
        <strong>${res.wire.awg} AWG</strong>
        <span>${fmt(res.wire.sectionMm2)} mm² · cobre</span>
      </div>
      <div class="datos-cable-grid">
        <div><small>Potencia de carga</small><strong>${fmt(res.powerW, 0)} W</strong></div>
        <div><small>Distancia de ida</small><strong>${fmt(res.distanceM)} m</strong></div>
        <div><small>Tensión y conexión</small><strong>${res.voltageV} V · ${res.connection}</strong></div>
        <div><small>Corriente de carga</small><strong>${fmt(res.currentA)} A</strong></div>
        <div><small>Corriente de diseño (×1,25)</small><strong>${fmt(res.designCurrentA)} A</strong></div>
        <div><small>Ampacidad base / corregida</small><strong>${fmt(res.wire.ampacityA, 0)} / ${fmt(res.correctedAmpacityA)} A</strong></div>
        <div><small>Caída de tensión calculada</small><strong>${fmt(res.voltageDropV)} V (${fmt(res.voltageDropPercent)} %)</strong></div>
        <div><small>Caída máxima objetivo</small><strong>${fmt(res.voltageDropLimitV)} V (3,00 %)</strong></div>
        <div><small>Sección por caída, teórica</small><strong>${fmt(res.minimumSectionDropMm2)} mm²</strong></div>
        <div><small>Tensión al final (estimada)</small><strong>${fmt(res.receivedVoltageV)} V</strong></div>
        <div><small>Condición determinante</small><strong>${res.controllingCriterion}</strong></div>
      </div>
      ${warnings}
      <p class="nota-ac"><strong>Supuestos aplicados:</strong> ${res.assumptions}</p>
      <p class="nota-ac"><strong>Cómo se obtuvo:</strong> ${res.formulaText}; I<sub>diseño</sub> = 1,25·I; S<sub>caída</sub> = ${res.sectionFormula}, con ρ = 0,021 Ω·mm²/m. Se selecciona el primer AWG que cumpla caída ≤ 3 % y ampacidad corregida ≥ ${fmt(res.minimumCircuitAmpacityA)} A.</p>
      <p class="nota-ac"><strong>Verificación pendiente:</strong> revisar NTC 2050 y RETIE aplicables, terminales, ficha del equipo, protección (MCB), diferencial y conductor de protección (PE). El mínimo de 20 A aplica a circuitos domiciliarios o similares según RETIE, art. 3.17.7(b).</p>
      <div class="acciones-cable"><button type="button" class="btn-copiar-ac" id="copiar-ac">Copiar resultados</button><span id="mensaje-copiar-ac" aria-live="polite"></span></div>
    `;

    const copy = document.getElementById('copiar-ac');
    copy.addEventListener('click', () => {
      const summary = `Dimensionamiento conductor AC ${res.voltageV} V (preliminar)
Conexión: ${res.connection}
Potencia: ${fmt(res.powerW, 0)} W
Distancia de ida: ${fmt(res.distanceM)} m
Corriente: ${fmt(res.currentA)} A
Corriente de diseño: ${fmt(res.designCurrentA)} A
${res.wireNames}: ${res.wire.awg} AWG Cu (${fmt(res.wire.sectionMm2)} mm²)
Caída de tensión: ${fmt(res.voltageDropV)} V (${fmt(res.voltageDropPercent)} %)
Criterio: ${res.controllingCriterion}
Sujeto a revisión de RETIE/NTC 2050, condiciones de montaje y protecciones.`;
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
    const p = potenciaRegistrada();
    if (!p) {
      markError('Registra primero la potencia en el Paso 1.1 con el botón «Registrar potencia», y luego vuelve aquí.');
      return;
    }
    limpiarErrorCampo('distancia_ac');
    const d = distanceEl.value.trim();
    if (d === '') {
      mostrarError('Ingresa una distancia de ida mayor que cero.', 'distancia_ac');
      return;
    }
    if (!Number.isFinite(Number(d)) || Number(d) <= 0 || Number(d) > 10000) { mostrarError('Distancia fuera del alcance (0 a 10000 m).', 'distancia_ac'); return; }
    for (const id of ['factor_ac','fp_ac']) { const n=Number(document.getElementById(id).value); if (!(n>0 && n<=1)) { mostrarError('Introduce una fracción mayor que 0 y hasta 1.',id); return; } limpiarErrorCampo(id); }
    const res = calculateAcCable(Number(d), p, Number(voltageEl.value), environmentEl.value === 'domiciliario', Number(document.getElementById('factor_ac').value), Number(document.getElementById('fp_ac').value));
    if (!res.ok) {
      markError(res.error);
      return;
    }
    showResult(res);
  }

  // Cada vez que se pulsa un botón de la página (por ejemplo "Registrar potencia"),
  // se actualiza la potencia mostrada en la sección 4.
  document.addEventListener('click', () => {
    setTimeout(() => {
      showPowerSource();
    }, 0);
  }, true);

  btn.addEventListener('click', run);
  if (environmentEl) environmentEl.addEventListener('change', () => { if (out.classList.contains('visible')) run(); });
  voltageEl.addEventListener('change', () => { showPowerSource(); if (out.classList.contains('visible')) run(); });
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
    if (environmentEl) environmentEl.value = 'domiciliario';
    out.className = 'resultado resultado-ac';
    out.replaceChildren();
    showPowerSource();
  });

  document.addEventListener('cambio-solar', showPowerSource);
  showPowerSource();
})(typeof globalThis === 'object' ? globalThis : this);
