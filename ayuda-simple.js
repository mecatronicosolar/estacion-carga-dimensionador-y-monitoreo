// Validación de campos al salir del campo (blur). Los cálculos están en calculos.js.
(() => {
  'use strict';
  const reglas = {
    P_dispositivo: { valida: v => v > 0, msg: 'Ingresa un número mayor que 0.' },
    t_sesion: { valida: v => v > 0, msg: 'Ingresa un número de horas mayor que 0.' },
    num_dispositivos: { valida: v => Number.isInteger(v) && v >= 1, msg: 'Ingresa un entero mayor o igual que 1.' },
    HSP: { valida: v => v > 0, msg: 'Ingresa horas solar pico mayores que 0.' },
    P_panel: { valida: v => v > 0, msg: 'Ingresa una potencia mayor que 0.' }
  };

  const setError = (id, texto) => {
    const p = document.getElementById('error-' + id);
    if (!p) return;
    p.textContent = texto || '';
    p.hidden = !texto;
  };

  for (const [id, regla] of Object.entries(reglas)) {
    const campo = document.getElementById(id);
    if (!campo) continue;
    campo.addEventListener('input', () => setError(id, ''));
    campo.addEventListener('blur', () => {
      if (campo.value.trim() === '') return setError(id, '');
      const v = Number(campo.value);
      setError(id, regla.valida(v) ? '' : regla.msg);
    });
  }
})();
