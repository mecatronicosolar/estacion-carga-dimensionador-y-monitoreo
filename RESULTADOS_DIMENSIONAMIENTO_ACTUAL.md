# Pruebas del dimensionamiento — ejecución solicitada por el usuario

Fecha: 2026-11-08 (America/Bogota). Rama: mejora-web-tg. Base de esta ejecución: a329efc. Sin publicación en GitHub.

## Resultado

- Antes de ampliar las pruebas extremas: 18 casos unitarios/estáticos y 31 comprobaciones de navegador aprobados. Los escenarios normales no detectaron fallos.
- Al añadir seis regresiones numéricas: cinco fallaron y una pasó. Se confirmó Infinity por divisiones con valores positivos casi nulos, subdesbordamiento de energía a cero y autonomía infinita.
- Después de corregir: **24 pruebas automatizadas aprobadas, 0 fallidas**, y **12 comprobaciones finales de interfaz aprobadas, 0 fallidas**. No se suman las ejecuciones repetidas como casos únicos nuevos.
- No se observaron errores en los registros de consola consultados. El formulario se dejó reiniciado.

## Corrección aplicada

motor.js valida que los resultados positivos de energía, FV, batería/autonomía y conductor DC sean finitos y no se hayan convertido en cero por subdesbordamiento. mejoras.js aplica esa comprobación antes de presentar la energía de sesión. El navegador informa del error y deja el resultado vacío.

Se detectó además una carga del motor anterior desde caché en el primer ensayo de interfaz posterior al cambio: todavía aparecía Infinity. Se añadieron versiones en las URLs de motor.js y mejoras.js, se cargó la página con URL de validación nueva y se verificó de nuevo el rechazo correcto. Esa ejecución intermedia no se considera aprobada. tests/static.cjs ahora resuelve recursos locales con query de versión. package.json incluye las seis regresiones nuevas en npm test.

## Datos de prueba y oráculos

Banco sintético: módulo12 V/100 Ah/100 A/10 kg; DoD0,8; inversor η0,85. Carga800 W,1 h,1 vehículo. No son especificaciones de un componente comercial recomendado.

Panel sintético:200 W; Voc24 V; Vmp20 V; Isc11 A; Imp10 A; βVoc−0,3%/°C; βVmp−0,4%/°C; Tmin0°C; Tmax célula60°C. Controlador de prueba: Voc máximo100 V; MPPT15–80 V; arranque15 V; corriente operativa30 A; Isc admisible40 A; potencia1000 W; salida80 A; banco12 V; eficiencia0,95.

Contrastes: E=P×t; I_DC=P/(Vη)=78,431372549 A; E_AC=12×100×0,8×0,85=816 Wh; FV=800/(4×0,8)=250 Wp. Tres sesiones:2400/(4×0,8)=750 Wp. Caída DC=2ρLI/S, con ρ0,021 Ω·mm²/m. Tolerancias de funciones normales:1e-8 unidades absolutas para fixtures moderados; presentación de dos decimales, ±0,005 unidades de redondeo. Rechazos/estados se comparan de forma exacta o mediante el mensaje de error.

## Repetir pruebas automatizadas

```sh
node --test tests/unit.cjs tests/static.cjs tests/extremos-dimensionamiento.cjs
```

Pruebas interactivas realizadas mediante el navegador abierto en esta conversación. Los scripts browser.cjs y boundaries.cjs ya existentes permiten repetir los flujos generales con Chrome/Playwright; no se afirma haber ejecutado esos dos scripts en esta nueva ronda. La suite de consola incluye U14 de telemetría, ajena al dimensionamiento: se informa separadamente para no atribuir los 24 casos exclusivamente a cálculos eléctricos.

## Evidencia

- evidence/dimensionamiento-actual/unit-static.log: primera ejecución de18 casos.
- evidence/dimensionamiento-actual/extremos-antes.log: cinco fallos previos a corrección, conservados.
- evidence/dimensionamiento-actual/unit-static-final.log:24 casos aprobados tras corrección.
- evidence/dimensionamiento-actual/ui-results.json: resumen de31 verificaciones iniciales y12 finales.
- evidence/dimensionamiento-actual/source-sha256.json: huellas de las fuentes probadas.
- evidence/dimensionamiento-actual/rechazo-extremo.png: captura real del error controlado de precisión.

## Verificaciones de interfaz ejecutadas

| ID | Fase | Función/entrada | Resultado obtenido | Estado |
|---|---|---|---|---|
| D01 | antes de ampliar protección numérica | Potencia vacía | Error próximo al campo | aprobado |
| D02 | antes de ampliar protección numérica | Potencia negativa | Error próximo al campo | aprobado |
| D03 | antes de ampliar protección numérica | Potencia cero | Error próximo al campo | aprobado |
| D04 | antes de ampliar protección numérica | Energía por sesión | 800 W × 1 h = 800 Wh | aprobado |
| D05 | antes de ampliar protección numérica | Banco de referencia de prueba | 78,43 A DC; 1200 Wh nominales; 960 Wh DC utilizables; 816 Wh AC | aprobado |
| D06 | antes de ampliar protección numérica | Repetición de cálculo | Resultado idéntico | aprobado |
| D07 | antes de ampliar protección numérica | FV HSP4/PR0,8 | 250 Wp | aprobado |
| D08 | antes de ampliar protección numérica | MPPT externo | 3 opciones admisibles | aprobado |
| D09 | antes de ampliar protección numérica | Inversor 12 V/110 V/60 Hz | Pasa comprobaciones preliminares | aprobado |
| D10 | antes de ampliar protección numérica | Editar inversor | Resultado anterior eliminado | aprobado |
| D11 | antes de ampliar protección numérica | Inversor nominal24 V con banco12 V | INCOMPATIBLE | aprobado |
| D12 | antes de ampliar protección numérica | Inversor50 Hz con carga60 Hz | Salida AC/frecuencia INCOMPATIBLE | aprobado |
| D13 | antes de ampliar protección numérica | Editar MPPT | Selección y tarjetas eliminadas | aprobado |
| D14 | antes de ampliar protección numérica | MPPT salida1 A | Ninguna solución | aprobado |
| D15 | antes de ampliar protección numérica | AC800 W/110 V/20 m | 12 AWG preliminar; 7,27 A; caída1,85 V (1,68%) | aprobado |
| D16 | antes de ampliar protección numérica | Editar corrección AC | Resultado eliminado | aprobado |
| D17 | antes de ampliar protección numérica | Corrección AC0,5 | 8 AWG preliminar; ampacidad corregida20 A | aprobado |
| D18 | antes de ampliar protección numérica | DC2 m/25 mm²/120 A/factor0,9 | 98,04 A de diseño; caída0,26 V (2,20%); pasa | aprobado |
| D19 | antes de ampliar protección numérica | DC20 m | Caída21,96%; no pasa | aprobado |
| D20 | antes de ampliar protección numérica | Distancia AC0 | Rechazada | aprobado |
| D21 | antes de ampliar protección numérica | Banco12 V/módulo8 V | Serie incompatible rechazada | aprobado |
| D22 | antes de ampliar protección numérica | Duración0,5 h | 400 Wh | aprobado |
| D23 | antes de ampliar protección numérica | Vehículos1,5 | Rechazado | aprobado |
| D24 | antes de ampliar protección numérica | PR0 | Rechazado | aprobado |
| D25 | antes de ampliar protección numérica | PR1,1 | Rechazado | aprobado |
| D26 | antes de ampliar protección numérica | Tres sesiones/día | 750 Wp | aprobado |
| D27 | antes de ampliar protección numérica | Coeficiente térmico vacío | Cálculo bloqueado con error | aprobado |
| D28 | antes de ampliar protección numérica | Trifásico nativo | Número de unidades deshabilitado en1 | aprobado |
| D29 | antes de ampliar protección numérica | MPPT integrado/perfil solar50% | 125 Wp; 3 opciones | aprobado |
| D30 | antes de ampliar protección numérica | Editar potencia | Banco, FV y selección eliminados | aprobado |
| D31 | antes de ampliar protección numérica | Reinicio | Potencia vacía; DoD0,8; eficiencia0,85; PR0,8; unidades1 | aprobado |
| R01 | regresión final con scripts versionados | Energía normal | 800 Wh | aprobado |
| R02 | regresión final con scripts versionados | Banco normal | 78,43 A y 816 Wh AC | aprobado |
| R03 | regresión final con scripts versionados | FV normal | 250 Wp | aprobado |
| R04 | regresión final con scripts versionados | HSP1e-320 | Error de precisión; resultado vacío; sin Infinity | aprobado |
| R05 | regresión final con scripts versionados | PR1e-320 | Error de precisión; resultado vacío; sin Infinity | aprobado |
| R06 | regresión final con scripts versionados | MPPT externo normal | 3 opciones | aprobado |
| R07 | regresión final con scripts versionados | Inversor normal | Pasa comprobaciones preliminares | aprobado |
| R08 | regresión final con scripts versionados | Conductor AC normal | 12 AWG preliminar | aprobado |
| R09 | regresión final con scripts versionados | Conductor DC normal | Pasa; caída0,26 V (2,20%) | aprobado |
| R10 | regresión final con scripts versionados | Sección DC1e-320 | Error de precisión; resultado vacío; sin Infinity | aprobado |
| R11 | regresión final con scripts versionados | Producto1e-200 W × 1e-200 h | Error de precisión; resultado vacío | aprobado |
| R12 | regresión final con scripts versionados | Reinicio tras errores | Potencia vacía; duración1; DoD0,8; eficiencia0,85; PR0,8 | aprobado |

## Alcance pendiente

Son pruebas de software con datos sintéticos, no validación física, metrológica ni normativa. Se mantienen las verificaciones pendientes de fichas comerciales, curvas de batería, BMS, protecciones y condiciones reales de instalación del protocolo original. Esta ronda no incluye una nueva revisión responsive completa ni prueba de hardware.
