// ===== CONSTANTES =====
let PR_REFERENCIA = 0.8;      // Referencia ilustrativa. No es un valor medido para este prototipo y puede cambiar.
const T_RESPALDO_MINIMO_H = 0;   // Se admiten duraciones positivas; 1 h es referencia.
const UMBRAL_110V_W = 1760;      // ~16 A a 110 V: por encima, el equipo de carga debe soportar esa corriente.

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
    if (num <= 0 || num > 1e9) {
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
    if (t > 168) { mostrarError("Duración fuera del alcance (máximo 168 h).", "t_respaldo"); return; }
    estado.E_sesion = estado.P_dispositivo * t;

    const aviso = t > 1
        ? `<p class="aviso-cable"><strong>Nota:</strong> con más de 1 h de respaldo, el banco crece en proporción: el doble de horas implica el doble de capacidad.</p>`
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
    estado.E_auto = estado.E_sesion * N;

    mostrarResultado('resultado-1-3', `
        <h4>Energía requerida por la carga</h4>
        <p class="ecuacion">E_auto = E_sesion × num_dispositivos</p>
        <p class="ecuacion">E_auto = ${estado.E_sesion.toFixed(2)} Wh × ${N}</p>
        <p>E_auto = <span class="valor">${estado.E_auto}</span> <span class="unidad">Wh</span></p>
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
        ? 'Capacidad nominal mínima requerida'
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
// ===== REINICIO =====
function aplicarValoresPorDefecto() {
    document.getElementById('DoD').value = '0.8';
    document.getElementById('eta_inversor').value = '0.85';
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
    document.dispatchEvent(new Event('reinicio-solar'));
}

// ===== INICIO =====
aplicarValoresPorDefecto();
aplicarConfiguracion();
