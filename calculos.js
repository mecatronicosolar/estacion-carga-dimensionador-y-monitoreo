// ===== VARIABLES GLOBALES PARA ALMACENAR RESULTADOS =====
let estado = {
    P_dispositivo: null,
    E_sesion: null,
    num_dispositivos: null,
    E_autosuficiencia: null, // energía teórica de sesión, sin corregir
    HSP: null,
    PR: null,
    P_arreglo: null,
    P_panel: null,
    V_nominal: null,
    N_paneles_total: null,
    opciones_arreglo: [],
    arreglo_seleccionado: null,
    paneles_confirmados: false,
    // --- Sección 1, batería (capacidad real) ---
    DoD: null,
    eta_inversor: null,
    dias_autonomia: null,
    E_bat_requerida: null,     // Wh, corregida por DoD, eta y autonomía
    V_sistema: null,           // V del sistema DC (bus batería/inversor)
    C_banco: null,             // Ah de un banco comercial
    V_banco: null,             // V nominal de un banco comercial
    I_max_banco: null,         // A, corriente máxima de descarga de un banco
    masa_banco: null,          // kg
    N_paralelo_bancos: null,
    N_serie_bancos: null,
    N_bancos_total: null,
    masa_bateria_total: null,
    // --- Sección 2, verificación MPPT ---
    Voc_panel: null,
    Isc_panel: null,
    beta_Voc: null,            // %/°C, típicamente negativo
    T_min_diseno: null,        // °C
    Vmax_mppt: null,
    Imax_mppt: null,
    Pmax_mppt: null,
    // --- Sección 3, inversor ---
    Vmax_inversor: null,
    Imax_inversor: null,
    Pmax_inversor: null
};

// ===== FUNCIONES DE VALIDACIÓN =====
function validarNumero(valor, nombre, campoId, enfocar = true) {
    if (valor === null || valor === undefined || valor === '') {
        mostrarError(`Completa el campo «${nombre}».`, campoId, enfocar);
        return false;
    }
    const num = Number(valor);
    if (!Number.isFinite(num)) {
        mostrarError(`Escribe un número válido y finito en «${nombre}».`, campoId, enfocar);
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
    if (!Number.isFinite(num)) {
        mostrarError(`Escribe un número entero válido en «${nombre}».`, campoId, enfocar);
        return false;
    }
    if (num <= 0) {
        mostrarError(`El valor de «${nombre}» debe ser igual o mayor que 1.`, campoId, enfocar);
        return false;
    }
    if (!Number.isSafeInteger(num)) {
        mostrarError(`Escribe una cantidad entera, sin decimales, en «${nombre}», como 1 o 2.`, campoId, enfocar);
        return false;
    }
    limpiarErrorCampo(campoId);
    return num;
}

function validarFraccion(valor, nombre, campoId, enfocar = true) {
    const num = validarNumero(valor, nombre, campoId, enfocar);
    if (!num) return false;
    if (num > 1) {
        mostrarError(`El valor de «${nombre}» se expresa como fracción entre 0 y 1, por ejemplo 0.5.`, campoId, enfocar);
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
        alert(`Error de validación: ${mensaje}`);
    }
}

function limpiarResultado(id) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.classList.remove('visible', 'error', 'warning');
        elemento.innerHTML = '';
    }
}

function mostrarResultado(id, contenido, clase = 'visible') {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.innerHTML = contenido;
        elemento.classList.add(clase);
    }
}

function redondearArriba(numero) {
    return Math.ceil(numero);
}

// ===== SECCIÓN 1: DIMENSIONAMIENTO DE BATERÍAS =====

// PASO 1.1: Registrar potencia requerida
function calcularPaso1_1() {
    limpiarResultado('resultado-1-1');

    const P_dispositivo_input = document.getElementById('P_dispositivo').value;
    const P_dispositivo = validarNumero(P_dispositivo_input, 'Potencia de carga', 'P_dispositivo');

    if (!P_dispositivo) return;

    estado.P_dispositivo = P_dispositivo;

    const contenido = `
        <h4>Potencia registrada</h4>
        <p>P_dispositivo = <span class="valor">${P_dispositivo.toFixed(2)}</span> <span class="unidad">W</span></p>
    `;
    mostrarResultado('resultado-1-1', contenido);
}

// PASO 1.2: Calcular energía de sesión
function calcularPaso1_2() {
    limpiarResultado('resultado-1-2');

    if (!estado.P_dispositivo) {
        mostrarError('Primero debes registrar la potencia del vehículo eléctrico (Paso 1.1)');
        return;
    }

    const t_sesion_input = document.getElementById('t_sesion').value;
    const t_sesion = validarNumero(t_sesion_input, 'Duración de la sesión', 't_sesion');

    if (!t_sesion) return;

    estado.t_sesion = t_sesion;

    // ECUACIÓN 1: E_sesion = P_dispositivo × t_sesion
    const E_sesion = estado.P_dispositivo * t_sesion;
    estado.E_sesion = E_sesion;

    const contenido = `
        <h4>Cálculo de energía por sesión</h4>
        <p class="ecuacion">E_sesion = P_dispositivo × t_sesion</p>
        <p class="ecuacion">E_sesion = ${estado.P_dispositivo.toFixed(2)} W × ${t_sesion.toFixed(2)} h</p>
        <p>E_sesion = <span class="valor">${E_sesion.toFixed(2)}</span> <span class="unidad">Wh</span></p>
    `;
    mostrarResultado('resultado-1-2', contenido);
}

// PASO 1.3: Calcular energía de autosuficiencia según dispositivos conectados
function calcularPaso1_3() {
    limpiarResultado('resultado-1-3');
    limpiarResultado('resultado-1-4');

    if (!estado.E_sesion) {
        mostrarError('Primero debes calcular la energía de sesión (Paso 1.2)');
        return;
    }

    const num_dispositivos_input = document.getElementById('num_dispositivos').value;
    const num_dispositivos = validarEntero(num_dispositivos_input, 'Número de vehículos simultáneos', 'num_dispositivos');

    if (!num_dispositivos) return;

    estado.num_dispositivos = num_dispositivos;

    // ECUACIÓN 2: E_autosuficiencia = E_sesion × num_dispositivos
    const E_autosuficiencia_base = estado.E_sesion * num_dispositivos;

    // Redondear hacia arriba
    const E_autosuficiencia = redondearArriba(E_autosuficiencia_base);
    estado.E_autosuficiencia = E_autosuficiencia;

    const contenido = `
        <h4>Cálculo de energía requerida (teórica)</h4>
        <p class="ecuacion">E_autosuficiencia = E_sesion × num_dispositivos</p>
        <p class="ecuacion">E_autosuficiencia = ${estado.E_sesion.toFixed(2)} Wh × ${num_dispositivos}</p>
        <p>E_autosuficiencia (base) = <span class="valor">${E_autosuficiencia_base.toFixed(2)}</span> <span class="unidad">Wh</span></p>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <p style="font-weight: 600;">E_autosuficiencia (redondeado) = <span class="valor">${E_autosuficiencia.toFixed(0)}</span> <span class="unidad">Wh</span></p>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin-top: 15px;">
            <h4 style="color: #0c5460; margin-bottom: 12px;">Energía teórica</h4>
            <p style="margin: 10px 0; color: #0c5460;">
                Esta es la energía teórica para alimentar simultáneamente
                ${num_dispositivos} vehículo(s) durante ${estado.t_sesion.toFixed(2)} hora(s), sin corregir por pérdidas.
            </p>
            <p style="margin: 10px 0; font-size: 0.9em; color: #0c5460;">
                Continúa con el <strong>Paso 1.4</strong> para obtener la capacidad real del banco de baterías,
                incluyendo profundidad de descarga, eficiencia del inversor y autonomía.
            </p>
        </div>
    `;
    mostrarResultado('resultado-1-3', contenido);
}

// PASO 1.4: Corregir energía por DoD/eficiencia/autonomía y dimensionar bancos comerciales
function calcularPaso1_4() {
    limpiarResultado('resultado-1-4');

    if (!estado.E_autosuficiencia) {
        mostrarError('Primero debes calcular la energía requerida (Paso 1.3)');
        return;
    }

    const DoD = validarFraccion(document.getElementById('DoD').value, 'Profundidad de descarga (DoD)', 'DoD');
    const eta_inversor = validarFraccion(document.getElementById('eta_inversor').value, 'Eficiencia del inversor', 'eta_inversor');
    const dias_autonomia = validarNumero(document.getElementById('dias_autonomia').value, 'Días de autonomía', 'dias_autonomia');
    const V_sistema_input = document.getElementById('V_sistema').value;
    const V_sistema = Number(V_sistema_input);
    const C_banco = validarNumero(document.getElementById('C_banco').value, 'Capacidad del banco', 'C_banco');
    const V_banco = validarNumero(document.getElementById('V_banco').value, 'Tensión nominal del banco', 'V_banco');
    const I_max_banco = validarNumero(document.getElementById('I_max_banco').value, 'Corriente máxima de descarga del banco', 'I_max_banco');
    const masa_banco = validarNumero(document.getElementById('masa_banco').value, 'Masa del banco', 'masa_banco');

    if (!DoD || !eta_inversor || !dias_autonomia) return;
    if (!V_sistema_input) {
        mostrarError('Selecciona la tensión del sistema DC.', 'V_sistema');
        return;
    }
    if (!C_banco || !V_banco || !I_max_banco || !masa_banco) return;

    estado.DoD = DoD;
    estado.eta_inversor = eta_inversor;
    estado.dias_autonomia = dias_autonomia;
    estado.V_sistema = V_sistema;
    estado.C_banco = C_banco;
    estado.V_banco = V_banco;
    estado.I_max_banco = I_max_banco;
    estado.masa_banco = masa_banco;

    // ECUACIÓN: energía real de batería, corregida
    // E_bat = E_autosuficiencia × días_autonomía ÷ (DoD × η_inversor)
    const E_bat_requerida = estado.E_autosuficiencia * dias_autonomia / (DoD * eta_inversor);
    estado.E_bat_requerida = E_bat_requerida;

    // Capacidad total del sistema en Ah
    const C_total = E_bat_requerida / V_sistema;

    // Número de bancos en paralelo (por capacidad) y en serie (por tensión)
    const N_paralelo_bancos = redondearArriba(C_total / C_banco);
    const N_serie_bancos = redondearArriba(V_sistema / V_banco);
    const N_bancos_total = N_paralelo_bancos * N_serie_bancos;
    estado.N_paralelo_bancos = N_paralelo_bancos;
    estado.N_serie_bancos = N_serie_bancos;
    estado.N_bancos_total = N_bancos_total;
    estado.masa_bateria_total = N_bancos_total * masa_banco;

    const contenido = `
        <h4>Corrección de energía de batería</h4>
        <p class="ecuacion">E_bat = E_autosuficiencia × días_autonomía ÷ (DoD × η_inversor)</p>
        <p class="ecuacion">E_bat = ${estado.E_autosuficiencia.toFixed(2)} Wh × ${dias_autonomia} ÷ (${DoD} × ${eta_inversor})</p>
        <p>E_bat (real) = <span class="valor">${E_bat_requerida.toFixed(2)}</span> <span class="unidad">Wh</span></p>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <p class="ecuacion">C_total = E_bat ÷ V_sistema</p>
        <p>C_total = <span class="valor">${C_total.toFixed(2)}</span> <span class="unidad">Ah</span></p>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <p class="ecuacion">N_paralelo = redondeo_arriba(C_total ÷ C_banco)</p>
        <p>N_paralelo = <span class="valor">${N_paralelo_bancos}</span></p>
        <p class="ecuacion">N_serie = redondeo_arriba(V_sistema ÷ V_banco)</p>
        <p>N_serie = <span class="valor">${N_serie_bancos}</span></p>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin-top: 15px;">
            <h4 style="color: #0c5460; margin-bottom: 12px;">Resultado</h4>
            <p style="margin: 6px 0;">Bancos totales necesarios: <strong>${N_bancos_total}</strong> (${N_serie_bancos} en serie × ${N_paralelo_bancos} en paralelo)</p>
            <p style="margin: 6px 0;">Masa total estimada de baterías: <strong>${estado.masa_bateria_total.toFixed(1)} kg</strong></p>
            <p style="margin: 10px 0; font-size: 0.9em;">
                Esta corrección usa DoD, eficiencia del inversor y días de autonomía.
                La verificación de que estos bancos soportan la corriente real se completa en la Sección 3,
                cuando se conoce la potencia del inversor.
            </p>
        </div>
    `;
    mostrarResultado('resultado-1-4', contenido);
}

// ===== SECCIÓN 2: DIMENSIONAMIENTO DE PANELES =====

// PASO 2.1: Registrar HSP y PR
function registrarHSP() {
    limpiarResultado('resultado-2-1');
    limpiarResultado('resultado-2-2');

    if (!estado.E_autosuficiencia) {
        mostrarError('Primero debes calcular la energía requerida en la Sección 1 (Paso 1.3)');
        return;
    }

    const HSP_input = document.getElementById('HSP').value;
    const HSP = validarNumero(HSP_input, 'Horas solares pico', 'HSP');
    const PR = validarFraccion(document.getElementById('PR').value, 'Rendimiento del sistema (PR)', 'PR');

    if (!HSP || !PR) return;

    estado.HSP = HSP;
    estado.PR = PR;

    // Mostrar resultado 2.1
    const contenido2_1 = `
        <h4>Horas Solar Pico y rendimiento registrados</h4>
        <p>Horas Solar Pico promedio anual = <span class="valor">${HSP.toFixed(2)}</span> <span class="unidad">h</span></p>
        <p>Rendimiento del sistema (PR) = <span class="valor">${PR}</span></p>
    `;
    mostrarResultado('resultado-2-1', contenido2_1);

    // Mostrar y calcular 2.2 automáticamente
    document.getElementById('paso-2-2').style.display = 'block';

    // ECUACIÓN: P_arreglo = E_autosuficiencia ÷ (HSP × PR)
    const P_arreglo = estado.E_autosuficiencia / (HSP * PR);
    estado.P_arreglo = P_arreglo;

    const contenido2_2 = `
        <h4>Cálculo de potencia del arreglo solar</h4>
        <p class="ecuacion">P_arreglo = E_autosuficiencia ÷ (Horas Solar Pico × PR)</p>
        <p class="ecuacion">P_arreglo = ${estado.E_autosuficiencia.toFixed(2)} Wh ÷ (${HSP.toFixed(2)} h × ${PR})</p>
        <p>P_arreglo = <span class="valor">${P_arreglo.toFixed(2)}</span> <span class="unidad">W</span></p>
    `;
    mostrarResultado('resultado-2-2', contenido2_2);
}

// PASO 2.3: Generar opciones de arreglo serie/paralelo, con verificación de MPPT
// Se ejecuta solo con el botón "Registrar datos del panel y MPPT", no con cada cambio de campo,
// para poder corregir varios campos con calma antes de recalcular.
function calcularPaso2_3() {
    limpiarResultado('resultado-2-3');
    document.getElementById('selector-opciones').style.display = 'none';

    if (!estado.P_arreglo) {
        mostrarError('Primero registra las Horas Solar Pico y el PR en el Paso 2.1.', null, false);
        return;
    }

    const P_panel_input = document.getElementById('P_panel').value;
    const V_nominal_input = document.getElementById('V_nominal').value;

    const P_panel = validarNumero(P_panel_input, 'Potencia nominal del panel', 'P_panel');
    if (!P_panel) return;
    if (!V_nominal_input) {
        mostrarError('Selecciona el voltaje nominal del panel.', 'V_nominal');
        return;
    }
    const V_nominal = parseFloat(V_nominal_input);

    // Datos para la verificación del MPPT
    const Voc_panel = validarNumero(document.getElementById('Voc_panel').value, 'Tensión de circuito abierto (Voc)', 'Voc_panel');
    const Isc_panel = validarNumero(document.getElementById('Isc_panel').value, 'Corriente de cortocircuito (Isc)', 'Isc_panel');
    const beta_input = document.getElementById('beta_Voc').value;
    const Tmin_input = document.getElementById('T_min_diseno').value;
    const Vmax_mppt = validarNumero(document.getElementById('Vmax_mppt').value, 'Tensión máxima del MPPT', 'Vmax_mppt');
    const Imax_mppt = validarNumero(document.getElementById('Imax_mppt').value, 'Corriente máxima del MPPT', 'Imax_mppt');
    const Pmax_mppt = validarNumero(document.getElementById('Pmax_mppt').value, 'Potencia máxima del MPPT', 'Pmax_mppt');

    if (!Voc_panel || !Isc_panel || !Vmax_mppt || !Imax_mppt || !Pmax_mppt) return;

    if (beta_input === '') {
        mostrarError('Completa el coeficiente de temperatura (β_Voc).', 'beta_Voc');
        return;
    }
    if (Tmin_input === '') {
        mostrarError('Completa la temperatura mínima de diseño.', 'T_min_diseno');
        return;
    }
    const beta_Voc = Number(beta_input);
    const T_min_diseno = Number(Tmin_input);
    if (!Number.isFinite(beta_Voc) || !Number.isFinite(T_min_diseno)) {
        mostrarError('Verifica el coeficiente de temperatura (β_Voc) y la temperatura mínima de diseño.', 'beta_Voc');
        return;
    }

    estado.P_panel = P_panel;
    estado.V_nominal = V_nominal;
    estado.Voc_panel = Voc_panel;
    estado.Isc_panel = Isc_panel;
    estado.beta_Voc = beta_Voc;
    estado.T_min_diseno = T_min_diseno;
    estado.Vmax_mppt = Vmax_mppt;
    estado.Imax_mppt = Imax_mppt;
    estado.Pmax_mppt = Pmax_mppt;

    // Voc corregido por temperatura mínima (β_Voc en %/°C, típicamente negativo)
    const Voc_frio = Voc_panel * (1 + (beta_Voc / 100) * (T_min_diseno - 25));

    // Límites del MPPT, con factor de seguridad de corriente 1.25 (criterio NTC 2050 Art. 690-8 a)
    const N_serie_max_mppt = Math.floor(Vmax_mppt / Voc_frio);
    const N_paralelo_max_mppt = Math.floor(Imax_mppt / (1.25 * Isc_panel));

    // ECUACIÓN 5: Cantidad total de paneles
    const N_paneles_float = estado.P_arreglo / P_panel;
    const N_paneles_total = redondearArriba(N_paneles_float);
    estado.N_paneles_total = N_paneles_total;

    // Verificar límite de 15-16 paneles
    let advertenciaLimite = '';
    if (N_paneles_total > 15) {
        advertenciaLimite = `
            <div class="resultado warning" style="display: block; margin-bottom: 20px;">
                <strong>⚠️ Advertencia de diseño:</strong><br>
                Se necesitan <strong>${N_paneles_total} paneles</strong>, lo que excede el límite recomendado de 15-16 paneles.
                Se recomienda seleccionar paneles con mayor potencia nominal para reducir la cantidad total.
            </div>
        `;
    }

    // Corriente de un panel (aproximación con la categoría nominal)
    const I_panel = P_panel / V_nominal;

    // Generar 3 opciones candidatas
    const candidatas = [
        { nombre: 'A', N_serie: N_paneles_total, N_paralelo: 1 },
        { nombre: 'B', N_serie: redondearArriba(N_paneles_total / 2), N_paralelo: 2 },
        { nombre: 'C', N_serie: redondearArriba(N_paneles_total / 3), N_paralelo: 3 }
    ];

    const opciones = candidatas.map(c => {
        const N_total = c.N_serie * c.N_paralelo;
        const P_total_real = N_total * P_panel;
        const cumple_tension = c.N_serie <= N_serie_max_mppt;
        const cumple_corriente = c.N_paralelo <= N_paralelo_max_mppt;
        const cumple_potencia = P_total_real <= Pmax_mppt;
        const cumple_mppt = cumple_tension && cumple_corriente && cumple_potencia;

        let motivo = '';
        if (!cumple_tension) motivo = `Supera la tensión máxima del MPPT (máx. ${N_serie_max_mppt} panel(es) en serie)`;
        else if (!cumple_corriente) motivo = `Supera la corriente máxima del MPPT (máx. ${N_paralelo_max_mppt} rama(s) en paralelo)`;
        else if (!cumple_potencia) motivo = `Supera la potencia máxima del MPPT (${Pmax_mppt} W)`;

        return {
            nombre: c.nombre,
            N_serie: c.N_serie,
            N_paralelo: c.N_paralelo,
            N_total,
            V_arreglo: V_nominal * c.N_serie,
            I_arreglo: I_panel * c.N_paralelo,
            advertencia: N_total > N_paneles_total ? `Se agregó ${N_total - N_paneles_total} panel(es) según el diseño del arreglo` : '',
            cumple_mppt,
            motivo_rechazo: motivo
        };
    });

    estado.opciones_arreglo = opciones;

    const contenido = `
        <h4>Cálculo de cantidad y opciones de arreglo</h4>
        <p class="ecuacion">N_paneles = redondeo_arriba(P_arreglo ÷ P_panel)</p>
        <p class="ecuacion">N_paneles = redondeo_arriba(${estado.P_arreglo.toFixed(2)} W ÷ ${P_panel.toFixed(2)} W)</p>
        <p>Cantidad de paneles necesarios = <span class="valor">${N_paneles_total}</span> <span class="unidad">paneles</span></p>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <h4>Verificación de compatibilidad con el MPPT</h4>
        <p class="ecuacion">Voc_frío = Voc × [1 + (β_Voc ÷ 100) × (T_min − 25)]</p>
        <p class="ecuacion">Voc_frío = ${Voc_panel.toFixed(2)} V × [1 + (${beta_Voc} ÷ 100) × (${T_min_diseno} − 25)]</p>
        <p>Voc_frío = <span class="valor">${Voc_frio.toFixed(2)}</span> <span class="unidad">V</span></p>
        <p>Máximo de paneles en serie permitido = <span class="valor">${N_serie_max_mppt}</span></p>
        <p>Máximo de ramas en paralelo permitido = <span class="valor">${N_paralelo_max_mppt}</span></p>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <p><strong>Se generaron 3 opciones de arreglo simétrico:</strong> solo las que cumplen con el MPPT pueden seleccionarse.</p>
    `;

    mostrarResultado('resultado-2-3', advertenciaLimite + contenido);

    // Mostrar selector de opciones
    generarSelectorOpciones();
}

function generarSelectorOpciones() {
    const contenedor = document.getElementById('opciones-container');
    contenedor.innerHTML = '';

    // Descripción inicial
    const descripcion = `
        <div class="descripcion-opciones">
            <p>
                <strong>Estas opciones son configuraciones orientativas.</strong>
                Las tensiones y corrientes se estiman con la categoría nominal seleccionada.
                La compatibilidad con el MPPT ya se verificó con Voc, Isc y los límites reales del controlador.
            </p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Mayor voltaje en serie → requiere inversor con entrada de voltaje más alta</li>
                <li>Mayor corriente en paralelo → requiere inversor con entrada de corriente más alta</li>
            </ul>
        </div>
    `;
    contenedor.insertAdjacentHTML('beforebegin', descripcion);

    estado.opciones_arreglo.forEach((opcion) => {
        const bloqueada = !opcion.cumple_mppt;
        const html = `
            <div class="opcion-arreglo${bloqueada ? ' rechazada' : ''}" id="opcion-${opcion.nombre}">
                <h4>Opción ${opcion.nombre}</h4>
                ${opcion.advertencia ? `<div class="advertencia">⚠️ ${opcion.advertencia}</div>` : ''}
                ${bloqueada ? `<div class="advertencia" style="background:#f8d7da;border-left-color:#dc3545;color:#721c24;">✗ No cumple con el MPPT: ${opcion.motivo_rechazo}</div>` : ''}
                <div class="detalle">
                    <div class="detalle-item">
                        <label>Paneles totales</label>
                        <div class="valor">${opcion.N_total}</div>
                    </div>
                    <div class="detalle-item">
                        <label>En serie × Paralelo</label>
                        <div class="valor">${opcion.N_serie} × ${opcion.N_paralelo}</div>
                    </div>
                    <div class="detalle-item">
                        <label>Voltaje del arreglo</label>
                        <div class="valor">${opcion.V_arreglo.toFixed(2)} V</div>
                    </div>
                    <div class="detalle-item">
                        <label>Corriente del arreglo</label>
                        <div class="valor">${opcion.I_arreglo.toFixed(2)} A</div>
                    </div>
                </div>
                <button class="btn-seleccionar" ${bloqueada ? 'disabled' : ''} onclick="seleccionarOpcion('${opcion.nombre}')">${bloqueada ? 'No disponible' : 'Seleccionar esta opción'}</button>
            </div>
        `;
        contenedor.innerHTML += html;
    });

    document.getElementById('selector-opciones').style.display = 'block';
}

function seleccionarOpcion(nombreOpcion) {
    const opcion = estado.opciones_arreglo.find(o => o.nombre === nombreOpcion);
    if (!opcion || !opcion.cumple_mppt) return;

    estado.arreglo_seleccionado = opcion;
    estado.paneles_confirmados = true;

    // Marcar como seleccionada
    document.querySelectorAll('.opcion-arreglo').forEach(el => {
        el.classList.remove('seleccionada');
        const boton = el.querySelector('.btn-seleccionar');
        if (boton && !el.classList.contains('rechazada')) {
            boton.disabled = false;
            boton.textContent = 'Seleccionar esta opción';
        }
    });

    const elementoSeleccionado = document.getElementById(`opcion-${nombreOpcion}`);
    elementoSeleccionado.classList.add('seleccionada');
    elementoSeleccionado.querySelector('.btn-seleccionar').disabled = true;

    alert(`✓ Opción ${nombreOpcion} confirmada: ${opcion.N_total} paneles (${opcion.N_serie} serie × ${opcion.N_paralelo} paralelo)`);

    // Limpiar un resultado previo del inversor: ahora requiere sus propios datos (Paso 3)
    limpiarResultado('resultado-3');

    // Scroll a sección 3
    document.getElementById('seccion-inversor').scrollIntoView({ behavior: 'smooth' });
}

// ===== SECCIÓN 3: DIMENSIONAMIENTO DEL INVERSOR =====

function calcularPaso3() {
    limpiarResultado('resultado-3');

    if (!estado.paneles_confirmados || !estado.arreglo_seleccionado) {
        mostrarError('Primero selecciona una configuración de arreglo válida en la Sección 2.');
        return;
    }

    if (!estado.P_dispositivo) {
        mostrarError('No hay suficientes datos calculados. Verifica que hayas completado todos los pasos anteriores.');
        return;
    }

    const Vmax_inversor = validarNumero(document.getElementById('Vmax_inversor').value, 'Tensión máxima de entrada del inversor', 'Vmax_inversor');
    const Imax_inversor = validarNumero(document.getElementById('Imax_inversor').value, 'Corriente máxima de entrada del inversor', 'Imax_inversor');
    const Pmax_inversor = validarNumero(document.getElementById('Pmax_inversor').value, 'Potencia nominal de salida del inversor', 'Pmax_inversor');

    if (!Vmax_inversor || !Imax_inversor || !Pmax_inversor) return;

    estado.Vmax_inversor = Vmax_inversor;
    estado.Imax_inversor = Imax_inversor;
    estado.Pmax_inversor = Pmax_inversor;

    const opcion = estado.arreglo_seleccionado;
    const P_entrada = opcion.V_arreglo * opcion.I_arreglo;
    const P_entrada_redonda = redondearArriba(P_entrada);
    const P_salida_redonda = redondearArriba(estado.P_dispositivo);

    const cumple_tension = Vmax_inversor >= opcion.V_arreglo;
    const cumple_corriente = Imax_inversor >= opcion.I_arreglo;
    const cumple_salida = Pmax_inversor >= estado.P_dispositivo;
    const cumple_todo = cumple_tension && cumple_corriente && cumple_salida;

    // Verificación de corriente de batería, ahora que se conoce la potencia AC
    let bloque_bateria = '';
    if (estado.V_sistema && estado.N_paralelo_bancos && estado.I_max_banco && estado.eta_inversor) {
        const I_bat_max = estado.P_dispositivo / (estado.eta_inversor * estado.V_sistema);
        const I_bat_disponible = estado.N_paralelo_bancos * estado.I_max_banco;
        const cumple_bateria = I_bat_disponible >= I_bat_max;
        bloque_bateria = `
            <hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
            <p><strong>Verificación de corriente de batería:</strong></p>
            <p class="ecuacion">I_bat = P_salida ÷ (η_inversor × V_sistema)</p>
            <p class="ecuacion">I_bat = ${estado.P_dispositivo.toFixed(2)} W ÷ (${estado.eta_inversor} × ${estado.V_sistema} V)</p>
            <p>I_bat requerida = <span class="valor">${I_bat_max.toFixed(2)}</span> A &nbsp;·&nbsp; I_bat disponible (bancos en paralelo) = <span class="valor">${I_bat_disponible.toFixed(2)}</span> A</p>
            <p style="font-weight:600; color: ${cumple_bateria ? '#155724' : '#721c24'};">
                ${cumple_bateria
                    ? '✓ Los bancos en paralelo definidos en el Paso 1.4 cubren la corriente requerida.'
                    : '✗ Los bancos en paralelo NO cubren la corriente requerida. Aumenta el número de bancos en paralelo en el Paso 1.4.'}
            </p>
        `;
    } else {
        bloque_bateria = `
            <hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
            <p style="color:#856404;">Completa el Paso 1.4 (capacidad real y selección de banco comercial) para verificar la corriente de la batería.</p>
        `;
    }

    const contenido = `
        <h4>Especificaciones y recomendaciones del inversor</h4>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <p><strong>Potencia de entrada del inversor:</strong></p>
        <p>Potencia proveniente del arreglo = <span class="valor">${P_entrada_redonda}</span> <span class="unidad">W</span></p>
        <p style="font-size: 0.85em; color: #666;">(calculada: ${P_entrada.toFixed(2)} W, redondeada al entero superior)</p>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <p><strong>Potencia de salida del inversor:</strong></p>
        <p>Potencia requerida por el vehículo eléctrico = <span class="valor">${P_salida_redonda}</span> <span class="unidad">W</span></p>
        <p style="font-size: 0.85em; color: #666;">(calculada: ${estado.P_dispositivo.toFixed(2)} W, redondeada al entero superior)</p>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        <h4>Verificación de compatibilidad del inversor seleccionado</h4>
        <p>Tensión de entrada del inversor (${Vmax_inversor} V) ${cumple_tension ? '≥' : '<'} tensión del arreglo (${opcion.V_arreglo.toFixed(2)} V): <strong style="color:${cumple_tension ? '#155724' : '#721c24'};">${cumple_tension ? 'cumple' : 'NO cumple'}</strong></p>
        <p>Corriente de entrada del inversor (${Imax_inversor} A) ${cumple_corriente ? '≥' : '<'} corriente del arreglo (${opcion.I_arreglo.toFixed(2)} A): <strong style="color:${cumple_corriente ? '#155724' : '#721c24'};">${cumple_corriente ? 'cumple' : 'NO cumple'}</strong></p>
        <p>Potencia de salida del inversor (${Pmax_inversor} W) ${cumple_salida ? '≥' : '<'} potencia requerida (${estado.P_dispositivo} W): <strong style="color:${cumple_salida ? '#155724' : '#721c24'};">${cumple_salida ? 'cumple' : 'NO cumple'}</strong></p>
        ${bloque_bateria}
        <div style="background: ${cumple_todo ? '#d4edda' : '#f8d7da'}; padding: 15px; border-radius: 6px; margin-top: 20px; font-weight: 600; color: ${cumple_todo ? '#155724' : '#721c24'};">
            ${cumple_todo ? '✓ El inversor seleccionado es compatible con esta configuración.' : '✗ El inversor seleccionado NO es compatible con esta configuración. Revisa sus especificaciones o cambia de opción de arreglo.'}
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <strong style="color: #856404;">⚠️ Precauciones importantes para la selección:</strong>
            <ul style="margin-left: 20px; margin-top: 10px; color: #856404;">
                <li>Verifica también la ficha del fabricante para rangos de MPPT, eficiencia a carga parcial y protecciones internas.</li>
                <li>El voltaje y la corriente del arreglo son aproximaciones con la categoría nominal del panel; confírmalos con Vmp e Imp reales.</li>
            </ul>
        </div>
    `;
    mostrarResultado('resultado-3', contenido);
}

// ===== FUNCIÓN DE REINICIO =====
function reiniciarApp() {
    // Limpiar todos los inputs
    const idsLimpiar = [
        'P_dispositivo', 't_sesion', 'num_dispositivos',
        'DoD', 'eta_inversor', 'dias_autonomia', 'V_sistema', 'C_banco', 'V_banco', 'I_max_banco', 'masa_banco',
        'HSP', 'PR', 'P_panel', 'V_nominal',
        'Voc_panel', 'Isc_panel', 'beta_Voc', 'T_min_diseno', 'Vmax_mppt', 'Imax_mppt', 'Pmax_mppt',
        'Vmax_inversor', 'Imax_inversor', 'Pmax_inversor'
    ];
    idsLimpiar.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Limpiar todos los resultados
    [
        'resultado-1-1', 'resultado-1-2', 'resultado-1-3', 'resultado-1-4',
        'resultado-2-1', 'resultado-2-2', 'resultado-2-3', 'resultado-3'
    ].forEach(limpiarResultado);

    document.getElementById('paso-2-2').style.display = 'none';
    document.getElementById('selector-opciones').style.display = 'none';

    // Resetear estado
    estado = {
        P_dispositivo: null,
        E_sesion: null,
        num_dispositivos: null,
        E_autosuficiencia: null,
        HSP: null,
        PR: null,
        P_arreglo: null,
        P_panel: null,
        V_nominal: null,
        N_paneles_total: null,
        opciones_arreglo: [],
        arreglo_seleccionado: null,
        paneles_confirmados: false,
        DoD: null,
        eta_inversor: null,
        dias_autonomia: null,
        E_bat_requerida: null,
        V_sistema: null,
        C_banco: null,
        V_banco: null,
        I_max_banco: null,
        masa_banco: null,
        N_paralelo_bancos: null,
        N_serie_bancos: null,
        N_bancos_total: null,
        masa_bateria_total: null,
        Voc_panel: null,
        Isc_panel: null,
        beta_Voc: null,
        T_min_diseno: null,
        Vmax_mppt: null,
        Imax_mppt: null,
        Pmax_mppt: null,
        Vmax_inversor: null,
        Imax_inversor: null,
        Pmax_inversor: null
    };

    // Scroll al inicio
    document.querySelector('.encabezado').scrollIntoView({ behavior: 'smooth' });
    alert('✓ Aplicación reiniciada. Puedes comenzar nuevamente.');
}
