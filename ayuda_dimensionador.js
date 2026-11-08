// Ayudas accesibles de la interfaz. Las fórmulas permanecen en calculos.js y cables_ac.js.
(() => {
    const nombres = {
        P_dispositivo: 'Potencia de carga',
        t_respaldo: 'Duración de la sesión',
        num_dispositivos: 'Número de vehículos simultáneos',
        HSP: 'Horas solares pico',
        P_panel: 'Potencia nominal del panel'
    };
    const general = document.getElementById('error-dimensionador');
    for (const [id, nombre] of Object.entries(nombres)) {
        const campo = document.getElementById(id);
        if (!campo) continue;
        campo.addEventListener('input', () => {
            limpiarErrorCampo(id);
            if (general) general.hidden = true;
        });
        campo.addEventListener('blur', () => {
            if (campo.value === '' && !campo.validity.badInput) return;
            if (id === 'num_dispositivos') validarEntero(campo.value, nombre, id, false);
            else validarNumero(campo.value, nombre, id, false);
        });
    }
    document.querySelectorAll('.btn-calcular, .btn-seleccionar').forEach(boton => {
        boton.addEventListener('click', () => {
            if (general) general.hidden = true;
        }, true);
    });
    document.querySelector('.btn-reiniciar')?.addEventListener('click', () => {
        for (const id of Object.keys(nombres)) limpiarErrorCampo(id);
        if (general) { general.hidden = true; general.textContent = ''; }
    });
})();
