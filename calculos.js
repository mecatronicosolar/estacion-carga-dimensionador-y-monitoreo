// ===== CONSTANTES =====
const PR_REFERENCIA = 0.75;      // Referencia ilustrativa. No es un valor medido para este prototipo y puede cambiar.
const T_RESPALDO_MINIMO_H = 1;   // Mínimo de diseño para el tiempo de respaldo.
const UMBRAL_110V_W = 1600;      // ~16 A a 110 V: por encima, el equipo de carga debe soportar esa corriente.

// ===== ESTADO =====
function crearEstado() {
    return {
        P_dispositivo: null, t_respaldo: null, E_sesion: null, num_dispositivos: null, E_auto: null,
        tension_nivel: null,
        DoD: null, eta_inversor: null, V_sistema: null,
        C_banco: null, V_banco: null, I_max_banco: null, masa_banco: null,
        E_bat: null, C_total: null, I_DC: null,
        N_serie_bancos: null, N_paralelo_bancos: null, N_bancos_total: null, masa_bateria_total: null,
        HSP: null, objetivo_solar: null, P_arreglo: null,
        P_panel: null, V_nominal: null, N_paneles_total: null,
        opciones_arreglo: [], arreglo_seleccionado: null, paneles_confirmados: false
    };
}
let estado = crearEstado();

// ===== UTILIDADES DE VALIDACIÓN =====
function v(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function validarNumero(valor, nombre, campoId, enfocar = true) {
    if (valor === null || valor === undefined || valor === '') {
        mostrarError(`Completa el campo «${nombre}».`, campoId, enfocar);
        return false;
    }
    const num = Number(valor);
    if (!Number.isFinite(num)) {
        mostrarError(`Escribe un número válido en «${nombre}».`, campoId, enfocar);
        return false;
    }
    if (num <= 0) {
        mostrarError(`El valor de «${nombre}» debe ser mayor que cero.`, campoId, enfocar);
        return false;
    }
    limpiarErrorCampo(campoId);
    return num;
}

function validarEntero(valor, nombre, campoId, enfocar = true) {
    if (valor === null || valor === undefined || valor === '') {
        mostrarError(`Completa el campo «${nombre}».`, campoId, enfocar);
        return false;
    }
    const num = Number(valor);
    if (!Number.isFinite(num) || num <= 0 || !Number.isSafeInteger(num)) {
        mostrarError(`Escribe una cantidad entera mayor o igual que 1 en «${nombre}».`, campoId, enfocar);
        return false;
    }
    limpiarErrorCampo(campoId);
    return num;
}

function validarFraccion(valor, nombre, campoId, enfocar = true) {
    const num = validarNumero(valor, nombre, campoId, enfocar);
    if (!num) return false;
    if (num > 1) {
        mostrarError(`«${nombre}» se expresa como fracción entre 0 y 1, por ejemplo 0.5.`, campoId, enfocar);
        return false;
    }
    return num;
}

function limpiarErrorCampo(campoId) {
    if (!campoId) return;
    const campo = document.getElementById(campoId);
    const error = document.getElementById(`error-${campoId}`);
    if (campo) campo.removeAttribute('aria-invalid');
    if (error) { error.hidden = true; error.textContent = ''; }
}

function mostrarError(mensaje, campoId, enfocar = true) {
    const campo = campoId && document.getElementById(campoId);
    const error = campoId && document.getElementById(`error-${campoId}`);
    const general = document.getElementById('error-dimensionador');
    if (campo && error) {
        if (general) general.hidden = true;
        campo.setAttribute('aria-invalid', 'true');
        error.textContent = mensaje;
        error.hidden = false;
        if (enfocar) campo.focus();
    } else if (general) {
        general.textContent = mensaje;
        general.hidden = false;
        if (enfocar) general.focus();
    } else {
        alert(mensaje);
    }
}

function limpiarResultado(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('visible', 'error', 'warning'); el.innerHTML = ''; }
}

function mostrarResultado(id, contenido, clase = 'visible') {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = contenido; el.classList.add(clase); }
}

function redondearArriba(numero) {
    return Math.ceil(numero);
}

const SEP = '<hr style="margin: 12px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">';

// ===== PASO 0: CONFIGURACIÓN DE LA ESTACIÓN =====
function mostrarBloque(selector, visible) {
    document.querySelectorAll(selector).forEach(el => { el.hidden = !visible; });
}

function aplicarConfiguracion() {
    const nivel = v('nivel');
    const esNivel2 = nivel === '2';
    const alim = document.getElementById('alimentacion');
    const tension = document.getElementById('tension_nivel');
    const mppt = v('mppt');
    const tipo = v('tipo_equipo');
    const inputN = document.getElementById('N_unidades_inversor');

    // Alimentación: en nivel 1 es siempre monofásica
    alim.disabled = !esNivel2;
    if (!esNivel2) alim.value = 'monofasica';
    const trifasica = esNivel2 && alim.value === 'trifasica';

    // Tensiones admitidas según nivel y alimentación
    let opciones;
    if (!esNivel2) opciones = [['110', '110 V'], ['220', '220 V']];
    else if (trifasica) opciones = [['380', '380 V entre fases'], ['220', '220 V entre fases']];
    else opciones = [['220', '220 V']];
    const previa = tension.value;
    tension.innerHTML = opciones.map(([val, txt]) => `<option value="${val}">${txt}</option>`).join('');
    tension.value = opciones.some(([val]) => val === previa) ? previa : opciones[0][0];
    estado.tension_nivel = Number(tension.value);

    // Bloques según configuración
    mostrarBloque('.solo-nivel-2', esNivel2);
    mostrarBloque('.solo-trifasica', trifasica);
    mostrarBloque('.solo-mppt-externo', mppt === 'externo');
    mostrarBloque('.solo-mppt-integrado', mppt === 'integrado');

    // Trifásico nativo: una sola unidad
    if (trifasica && tipo === 'nativo') {
        inputN.value = '1';
        inputN.disabled = true;
    } else {
        inputN.disabled = false;
    }
}

// ===== SECCIÓN 1: BATERÍA =====

// PASO 1.1
function calcularPaso1_1() {
    limpiarResultado('resultado-1-1');
    const P = validarNumero(v('P_dispositivo'), 'Potencia de carga', 'P_dispositivo');
    if (!P) return;
    estado.P_dispositivo = P;
    mostrarResultado('resultado-1-1', `
        <h4>Potencia registrada</h4>
        <p>P_dispositivo = <span class="valor">${P.toFixed(2)}</span> <span class="unidad">W</span></p>
    `);
}

// PASO 1.2: tiempo de respaldo (mismo concepto en ambos niveles)
function calcularPaso1_2() {
    limpiarResultado('resultado-1-2');
    if (!estado.P_dispositivo) {
        mostrarError('Primero registra la potencia de carga (Paso 1.1).');
        return;
    }
    const t = validarNumero(v('t_respaldo'), 'Tiempo de respaldo', 't_respaldo');
    if (!t) return;
    if (t < T_RESPALDO_MINIMO_H) {
        mostrarError(`El tiempo de respaldo mínimo de diseño es ${T_RESPALDO_MINIMO_H} h.`, 't_respaldo');
        return;
    }
    estado.t_respaldo = t;
    estado.E_sesion = estado.P_dispositivo * t;

    const aviso = t > T_RESPALDO_MINIMO_H
        ? `<p class="aviso-cable"><strong>Nota:</strong> con más de ${T_RESPALDO_MINIMO_H} h de respaldo, el banco crece en proporción: el doble de horas implica el doble de capacidad.</p>`
        : '';

    mostrarResultado('resultado-1-2', `
        <h4>Energía por sesión</h4>
        <p class="ecuacion">E_sesion = P_dispositivo × t_respaldo</p>
        <p class="ecuacion">E_sesion = ${estado.P_dispositivo.toFixed(2)} W × ${t.toFixed(2)} h</p>
        <p>E_sesion = <span class="valor">${estado.E_sesion.toFixed(2)}</span> <span class="unidad">Wh</span></p>
        ${aviso}
    `);
}

// PASO 1.3: número de vehículos simultáneos
function calcularPaso1_3() {
    limpiarResultado('resultado-1-3');
    limpiarResultado('resultado-1-4');
    if (!estado.E_sesion) {
        mostrarError('Primero calcula la energía por sesión (Paso 1.2).');
        return;
    }
    const N = validarEntero(v('num_dispositivos'), 'Número de vehículos simultáneos', 'num_dispositivos');
    if (!N) return;
    estado.num_dispositivos = N;
    estado.E_auto = redondearArriba(estado.E_sesion * N);

    mostrarResultado('resultado-1-3', `
        <h4>Energía requerida por la carga</h4>
        <p class="ecuacion">E_auto = E_sesion × num_dispositivos</p>
        <p class="ecuacion">E_auto = ${estado.E_sesion.toFixed(2)} Wh × ${N}</p>
        <p>E_auto (redondeado) = <span class="valor">${estado.E_auto}</span> <span class="unidad">Wh</span></p>
        <p>Continúa con el Paso 1.4 para obtener la batería, con DoD y eficiencia del inversor.</p>
    `);
}

// PASO 1.4: batería, capacidad y cadenas
function calcularPaso1_4() {
    limpiarResultado('resultado-1-4');
    if (!estado.E_auto) {
        mostrarError('Primero calcula la energía requerida (Paso 1.3).');
        return;
    }
    const DoD = validarFraccion(v('DoD'), 'Profundidad de descarga (DoD)', 'DoD');
    const eta = validarFraccion(v('eta_inversor'), 'Eficiencia del inversor', 'eta_inversor');
    const Vsis = Number(v('V_sistema'));
    const Cb = validarNumero(v('C_banco'), 'Capacidad del banco', 'C_banco');
    const Vb = validarNumero(v('V_banco'), 'Tensión nominal del banco', 'V_banco');
    const Ib = validarNumero(v('I_max_banco'), 'Corriente máxima de descarga del banco', 'I_max_banco');
    const mb = validarNumero(v('masa_banco'), 'Masa del banco', 'masa_banco');
    if (!DoD || !eta || !Cb || !Vb || !Ib || !mb) return;
    if (!Vsis) {
        mostrarError('Selecciona la tensión del sistema DC.', 'V_sistema');
        return;
    }

    const serie = Vsis / Vb;
    if (serie < 1 || Math.abs(serie - Math.round(serie)) > 1e-9) {
        mostrarError(`La tensión del sistema (${Vsis} V) debe ser múltiplo de la tensión del banco (${Vb} V).`, 'V_sistema');
        return;
    }

    // E_bat = E_auto ÷ (DoD × η)
    const E_bat = estado.E_auto / (DoD * eta);
    const C_total = E_bat / Vsis;

    // Corriente de batería: potencia total de la carga
    const P_total = estado.P_dispositivo * estado.num_dispositivos;
    const I_DC = P_total / (eta * Vsis);

    // Cadenas: por capacidad y por corriente, se toma el mayor
    const N_serie = Math.round(serie);
    const N_paralelo = Math.max(redondearArriba(C_total / Cb), redondearArriba(I_DC / Ib));
    const N_total = N_serie * N_paralelo;
    const masa_total = N_total * mb;

    Object.assign(estado, {
        DoD, eta_inversor: eta, V_sistema: Vsis,
        C_banco: Cb, V_banco: Vb, I_max_banco: Ib, masa_banco: mb,
        E_bat, C_total, I_DC,
        N_serie_bancos: N_serie, N_paralelo_bancos: N_paralelo, N_bancos_total: N_total,
        masa_bateria_total: masa_total
    });

    const etiqueta = v('nivel') === '1'
        ? 'Energía diaria a recargar (solo lectura)'
        : 'Energía de batería requerida';

    mostrarResultado('resultado-1-4', `
        <h4>Batería requerida</h4>
        <p class="ecuacion">E_bat = E_auto ÷ (DoD × η_inversor)</p>
        <p class="ecuacion">E_bat = ${estado.E_auto} Wh ÷ (${DoD} × ${eta})</p>
        <p>${etiqueta} = <span class="valor">${E_bat.toFixed(2)}</span> <span class="unidad">Wh</span></p>
        ${SEP}
        <p class="ecuacion">C_total = E_bat ÷ V_sistema = ${C_total.toFixed(2)} Ah</p>
        <p class="ecuacion">I_DC = P_total ÷ (η × V_sistema) = ${I_DC.toFixed(2)} A</p>
        ${SEP}
        <p class="ecuacion">N_serie = V_sistema ÷ V_banco = ${N_serie}</p>
        <p class="ecuacion">N_paralelo = max( ceil(C_total ÷ C_banco), ceil(I_DC ÷ I_max_banco) ) = ${N_paralelo}</p>
        <p>Corriente por cadena = <span class="valor">${(I_DC / N_paralelo).toFixed(2)}</span> A (límite del banco: ${Ib} A)</p>
        ${SEP}
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8;">
            <p><strong>Bancos totales:</strong> ${N_total} (${N_serie} en serie × ${N_paralelo} en paralelo)</p>
            <p><strong>Masa total estimada:</strong> ${masa_total.toFixed(1)} kg</p>
        </div>
    `);
}

// ===== SECCIÓN 2: PANELES =====

// PASO 2.1: HSP y objetivo solar
function registrarHSP() {
    limpiarResultado('resultado-2-1');
    limpiarResultado('resultado-2-2');
    if (!estado.N_bancos_total) {
        mostrarError('Primero calcula la batería (Paso 1.4).');
        return;
    }
    const HSP = validarNumero(v('HSP'), 'Horas solares pico', 'HSP');
    if (!HSP) return;

    const nivel = v('nivel');
    let objetivo = 1;
    let E_req = estado.E_bat;   // Nivel 1: el sol recarga la energía que entrega la batería
    if (nivel === '2') {
        objetivo = validarFraccion(v('objetivo_solar'), 'Objetivo de aprovechamiento solar', 'objetivo_solar');
        if (!objetivo) return;
        E_req = estado.E_auto;  // Nivel 2: fracción de la energía de carga
    }

    estado.HSP = HSP;
    estado.objetivo_solar = nivel === '2' ? objetivo : null;
    estado.P_arreglo = objetivo * E_req / (HSP * PR_REFERENCIA);

    mostrarResultado('resultado-2-1', `
        <h4>Horas solares pico registradas</h4>
        <p>HSP = <span class="valor">${HSP.toFixed(2)}</span> h</p>
        <p>PR de referencia = <span class="valor">${PR_REFERENCIA}</span> <span class="unidad">(valor ilustrativo, sujeto a cambios)</span></p>
    `);

    document.getElementById('paso-2-2').style.display = 'block';
    const formula = nivel === '2'
        ? `P_arreglo = objetivo × E_auto ÷ (HSP × PR)`
        : `P_arreglo = E_bat ÷ (HSP × PR)`;
    mostrarResultado('resultado-2-2', `
        <h4>Potencia del arreglo solar</h4>
        <p class="ecuacion">${formula}</p>
        <p class="ecuacion">P_arreglo = ${(objetivo * E_req).toFixed(2)} Wh ÷ (${HSP.toFixed(2)} h × ${PR_REFERENCIA})</p>
        <p>P_arreglo = <span class="valor">${estado.P_arreglo.toFixed(2)}</span> <span class="unidad">W</span></p>
    `);
}

// PASO 2.3: paneles y verificación con MPPT (externo o integrado)
function calcularPaso2_3() {
    limpiarResultado('resultado-2-3');
    document.getElementById('selector-opciones').style.display = 'none';
    if (!estado.P_arreglo) {
        mostrarError('Primero registra las HSP (Paso 2.1).');
        return;
    }

    const mppt = v('mppt');
    const P_panel = validarNumero(v('P_panel'), 'Potencia nominal del panel', 'P_panel');
    if (!P_panel) return;
    if (!v('V_nominal')) {
        mostrarError('Selecciona el voltaje nominal del panel.', 'V_nominal');
        return;
    }
    const V_nominal = Number(v('V_nominal'));
    const Voc = validarNumero(v('Voc_panel'), 'Tensión de circuito abierto (Voc)', 'Voc_panel');
    const Isc = validarNumero(v('Isc_panel'), 'Corriente de cortocircuito (Isc)', 'Isc_panel');
    if (!Voc || !Isc) return;
    if (v('beta_Voc') === '') { mostrarError('Completa el coeficiente β_Voc.', 'beta_Voc'); return; }
    if (v('T_min_diseno') === '') { mostrarError('Completa la temperatura mínima de diseño.', 'T_min_diseno'); return; }
    const beta = Number(v('beta_Voc'));
    const Tmin = Number(v('T_min_diseno'));

    // Voc corregido por temperatura mínima
    const Voc_frio = Voc * (1 + (beta / 100) * (Tmin - 25));

    let L;
    if (mppt === 'externo') {
        const Vmax = validarNumero(v('Vmax_mppt'), 'Tensión máxima del MPPT', 'Vmax_mppt');
        const Imax = validarNumero(v('Imax_mppt'), 'Corriente máxima del MPPT', 'Imax_mppt');
        const Pmax = validarNumero(v('Pmax_mppt'), 'Potencia máxima del MPPT', 'Pmax_mppt');
        if (!Vmax || !Imax || !Pmax) return;
        L = {
            N_serie_max: Math.floor(Vmax / Voc_frio),
            N_paralelo_max: Math.floor(Imax / (1.25 * Isc)),
            Pmax, Vmax, Imax
        };
    } else {
        const Vmp = validarNumero(v('Vmp_panel'), 'Tensión en punto de máxima potencia (Vmp)', 'Vmp_panel');
        const Vocinv = validarNumero(v('Voc_max_inversor'), 'Tensión máxima de entrada del inversor', 'Voc_max_inversor');
        const Vmin = validarNumero(v('Vmppt_min'), 'Mínimo del rango MPPT del inversor', 'Vmppt_min');
        const Vmaxr = validarNumero(v('Vmppt_max'), 'Máximo del rango MPPT del inversor', 'Vmppt_max');
        if (!Vmp || !Vocinv || !Vmin || !Vmaxr) return;
        L = { Vmp, Voc_max_inv: Vocinv, Vmppt_min: Vmin, Vmppt_max: Vmaxr };
    }

    const N_paneles = redondearArriba(estado.P_arreglo / P_panel);
    estado.N_paneles_total = N_paneles;
    estado.P_panel = P_panel;
    estado.V_nominal = V_nominal;

    const I_panel = P_panel / V_nominal;
    const base = [
        { nombre: 'A', N_serie: N_paneles, N_paralelo: 1 },
        { nombre: 'B', N_serie: redondearArriba(N_paneles / 2), N_paralelo: 2 },
        { nombre: 'C', N_serie: redondearArriba(N_paneles / 3), N_paralelo: 3 }
    ];

    estado.opciones_arreglo = base.map(c => {
        const N_total = c.N_serie * c.N_paralelo;
        let cumple, motivo = '', V_arreglo;
        if (mppt === 'externo') {
            const t = c.N_serie <= L.N_serie_max;
            const i = c.N_paralelo <= L.N_paralelo_max;
            const p = N_total * P_panel <= L.Pmax;
            cumple = t && i && p;
            V_arreglo = V_nominal * c.N_serie;
            if (!t) motivo = `Supera la tensión máxima del MPPT (máx. ${L.N_serie_max} en serie)`;
            else if (!i) motivo = `Supera la corriente máxima del MPPT (máx. ${L.N_paralelo_max} ramas)`;
            else if (!p) motivo = `Supera la potencia máxima del MPPT (${L.Pmax} W)`;
        } else {
            const Voc_total = c.N_serie * Voc_frio;
            const Vmp_total = c.N_serie * L.Vmp;
            const t = Voc_total <= L.Voc_max_inv;
            const r = Vmp_total >= L.Vmppt_min && Vmp_total <= L.Vmppt_max;
            cumple = t && r;
            V_arreglo = Vmp_total;
            if (!t) motivo = `Voc en frío (${Voc_total.toFixed(1)} V) supera el máximo del inversor (${L.Voc_max_inv} V)`;
            else if (!r) motivo = `Vmp (${Vmp_total.toFixed(1)} V) fuera del rango MPPT (${L.Vmppt_min}–${L.Vmppt_max} V)`;
        }
        return {
            nombre: c.nombre,
            N_serie: c.N_serie,
            N_paralelo: c.N_paralelo,
            N_total,
            V_arreglo,
            I_arreglo: I_panel * c.N_paralelo,
            advertencia: N_total > N_paneles ? `Se agregó ${N_total - N_paneles} panel(es) según el diseño del arreglo` : '',
            cumple_mppt: cumple,
            motivo_rechazo: motivo
        };
    });

    // Verificaciones de aprovechamiento
    let verificacion = '';
    if (v('nivel') === '1') {
        const t_recarga = estado.E_bat / (N_paneles * P_panel * PR_REFERENCIA);
        const ok = t_recarga <= estado.HSP;
        verificacion = `
            <p>Tiempo de recarga diaria = <span class="valor">${t_recarga.toFixed(2)}</span> h (horas de sol disponibles: ${estado.HSP} h)</p>
            <p style="font-weight:600; color:${ok ? '#155724' : '#721c24'};">${ok ? '✓ La batería se recarga en el día.' : '✗ La batería no se recarga en el día con este arreglo. Aumenta los paneles.'}</p>
        `;
    } else {
        const fraccion = Math.min(1, N_paneles * P_panel * estado.HSP * PR_REFERENCIA / estado.E_auto);
        const objetivo = estado.objetivo_solar;
        const ok = fraccion >= objetivo;
        verificacion = `
            <p>Aprovechamiento solar alcanzado = <span class="valor">${(fraccion * 100).toFixed(0)} %</span> (objetivo: ${(objetivo * 100).toFixed(0)} %)</p>
            <p style="font-weight:600; color:${ok ? '#155724' : '#721c24'};">${ok ? '✓ El arreglo cumple el objetivo.' : '✗ Faltan paneles para alcanzar el objetivo.'}</p>
        `;
    }

    const bloqueMPPT = mppt === 'externo'
        ? `<p class="ecuacion">Voc_frío = Voc × [1 + (β_Voc ÷ 100) × (T_min − 25)] = ${Voc_frio.toFixed(2)} V</p>
           <p>Máximo en serie: <span class="valor">${L.N_serie_max}</span> · Máximo de ramas: <span class="valor">${L.N_paralelo_max}</span></p>`
        : `<p class="ecuacion">Voc_frío = ${Voc_frio.toFixed(2)} V</p>
           <p>Rango MPPT del inversor: ${L.Vmppt_min}–${L.Vmppt_max} V · Voc máx.: ${L.Voc_max_inv} V</p>`;

    const advertenciaLimite = N_paneles > 15
        ? `<div class="resultado warning" style="display: block; margin-bottom: 20px;">
             <strong>⚠️ Advertencia de diseño:</strong> se necesitan ${N_paneles} paneles, por encima del límite recomendado de 15-16. Considera paneles de mayor potencia.
           </div>`
        : '';

    mostrarResultado('resultado-2-3', `
        ${advertenciaLimite}
        <h4>Cantidad de paneles y verificación del MPPT</h4>
        <p class="ecuacion">N_paneles = ceil(P_arreglo ÷ P_panel) = ${N_paneles}</p>
        ${bloqueMPPT}
        ${SEP}
        ${verificacion}
        <p><strong>Se generaron 3 opciones simétricas.</strong> Solo las compatibles pueden seleccionarse.</p>
    `);

    generarSelectorOpciones();
}

function generarSelectorOpciones() {
    const contenedor = document.getElementById('opciones-container');
    contenedor.innerHTML = '';
    estado.opciones_arreglo.forEach(op => {
        const bloqueada = !op.cumple_mppt;
        contenedor.innerHTML += `
            <div class="opcion-arreglo${bloqueada ? ' rechazada' : ''}" id="opcion-${op.nombre}">
                <h4>Opción ${op.nombre}</h4>
                ${op.advertencia ? `<div class="advertencia">⚠️ ${op.advertencia}</div>` : ''}
                ${bloqueada ? `<div class="advertencia" style="background:#f8d7da;border-left-color:#dc3545;color:#721c24;">✗ No cumple con el MPPT: ${op.motivo_rechazo}</div>` : ''}
                <div class="detalle">
                    <div class="detalle-item"><label>Paneles totales</label><div class="valor">${op.N_total}</div></div>
                    <div class="detalle-item"><label>En serie × Paralelo</label><div class="valor">${op.N_serie} × ${op.N_paralelo}</div></div>
                    <div class="detalle-item"><label>Tensión del arreglo</label><div class="valor">${op.V_arreglo.toFixed(2)} V</div></div>
                    <div class="detalle-item"><label>Corriente del arreglo</label><div class="valor">${op.I_arreglo.toFixed(2)} A</div></div>
                </div>
                <button class="btn-seleccionar" ${bloqueada ? 'disabled' : ''} onclick="seleccionarOpcion('${op.nombre}')">${bloqueada ? 'No disponible' : 'Seleccionar esta opción'}</button>
            </div>`;
    });
    document.getElementById('selector-opciones').style.display = 'block';
}

function seleccionarOpcion(nombre) {
    const op = estado.opciones_arreglo.find(o => o.nombre === nombre);
    if (!op || !op.cumple_mppt) return;
    estado.arreglo_seleccionado = op;
    estado.paneles_confirmados = true;

    document.querySelectorAll('.opcion-arreglo').forEach(el => {
        el.classList.remove('seleccionada');
        const b = el.querySelector('.btn-seleccionar');
        if (b && !el.classList.contains('rechazada')) { b.disabled = false; b.textContent = 'Seleccionar esta opción'; }
    });
    const elegida = document.getElementById(`opcion-${nombre}`);
    elegida.classList.add('seleccionada');
    elegida.querySelector('.btn-seleccionar').disabled = true;

    limpiarResultado('resultado-3');
    document.getElementById('seccion-inversor').scrollIntoView({ behavior: 'smooth' });
}

// ===== SECCIÓN 3: INVERSOR =====
function calcularPaso3() {
    limpiarResultado('resultado-3');
    if (!estado.paneles_confirmados || !estado.arreglo_seleccionado) {
        mostrarError('Primero selecciona una configuración de arreglo válida en la Sección 2.');
        return;
    }
    if (!estado.N_bancos_total) {
        mostrarError('Primero completa la batería (Paso 1.4).');
        return;
    }

    const P_unidad = validarNumero(v('P_unidad_inversor'), 'Potencia nominal de salida por unidad', 'P_unidad_inversor');
    const N = validarEntero(v('N_unidades_inversor'), 'Número de unidades', 'N_unidades_inversor');
    if (!P_unidad || !N) return;

    const P_total = estado.P_dispositivo * estado.num_dispositivos;
    const capacidad = N * P_unidad;
    const cumple_potencia = capacidad >= P_total;
    const min_unidades = Math.ceil(P_total / P_unidad);

    const I_disp = estado.N_paralelo_bancos * estado.I_max_banco;
    const cumple_bateria = I_disp >= estado.I_DC;

    const cumple_todo = cumple_potencia && cumple_bateria;
    const trifasica = v('nivel') === '2' && v('alimentacion') === 'trifasica';
    const descripcionEquipo = trifasica
        ? (v('tipo_equipo') === 'nativo' ? 'Trifásico nativo (1 equipo)' : `${N} monofásicos en paralelo`)
        : 'Monofásico';

    const aviso110 = estado.tension_nivel === 110 && P_total > UMBRAL_110V_W
        ? `<div class="aviso-cable"><strong>Advertencia:</strong> a 110 V, ${P_total} W superan ~16 A. El equipo de carga debe soportar esa corriente.</div>`
        : '';

    mostrarResultado('resultado-3', `
        <h4>Verificación del inversor</h4>
        <p>Equipo: ${descripcionEquipo}</p>
        <p class="ecuacion">Capacidad = N × P_unidad = ${N} × ${P_unidad} W = ${capacidad} W</p>
        <p>Potencia requerida (P × N_vehículos) = <span class="valor">${P_total}</span> W</p>
        <p style="font-weight:600; color:${cumple_potencia ? '#155724' : '#721c24'};">
            ${cumple_potencia ? '✓ La potencia cubre la carga.' : `✗ No alcanza. Se requieren al menos ${min_unidades} unidad(es) de ${P_unidad} W.`}
        </p>
        ${SEP}
        <p class="ecuacion">I_DC = ${estado.I_DC.toFixed(2)} A (requerida)</p>
        <p>Corriente disponible de bancos = ${estado.N_paralelo_bancos} cadena(s) × ${estado.I_max_banco} A = <span class="valor">${I_disp.toFixed(2)}</span> A</p>
        <p style="font-weight:600; color:${cumple_bateria ? '#155724' : '#721c24'};">
            ${cumple_bateria ? '✓ Los bancos entregan la corriente requerida.' : '✗ Los bancos no entregan la corriente requerida. Aumenta las cadenas en paralelo.'}
        </p>
        ${aviso110}
        <div style="background: ${cumple_todo ? '#d4edda' : '#f8d7da'}; padding: 15px; border-radius: 6px; margin-top: 15px; font-weight: 600; color: ${cumple_todo ? '#155724' : '#721c24'};">
            ${cumple_todo ? '✓ Configuración compatible.' : '✗ Configuración no compatible. Corrige los puntos marcados.'}
        </div>
    `);
}

// ===== REINICIO =====
function aplicarValoresPorDefecto() {
    document.getElementById('DoD').value = '0.5';
    document.getElementById('eta_inversor').value = '0.9';
    document.getElementById('t_respaldo').value = '1';
    document.getElementById('objetivo_solar').value = '0.5';
}

function reiniciarApp() {
    document.querySelectorAll('input[type="number"]').forEach(el => { el.value = ''; });
    document.getElementById('V_sistema').value = '';
    document.getElementById('nivel').value = '1';
    document.getElementById('alimentacion').value = 'monofasica';
    document.getElementById('mppt').value = 'externo';
    document.getElementById('tipo_equipo').value = 'nativo';
    aplicarValoresPorDefecto();
    aplicarConfiguracion();

    [
        'resultado-1-1', 'resultado-1-2', 'resultado-1-3', 'resultado-1-4',
        'resultado-2-1', 'resultado-2-2', 'resultado-2-3', 'resultado-3'
    ].forEach(limpiarResultado);
    document.getElementById('paso-2-2').style.display = 'none';
    document.getElementById('selector-opciones').style.display = 'none';

    estado = crearEstado();
    document.querySelector('.encabezado').scrollIntoView({ behavior: 'smooth' });
    alert('Aplicación reiniciada. Puedes comenzar nuevamente.');
}

// ===== INICIO =====
aplicarValoresPorDefecto();
aplicarConfiguracion();
