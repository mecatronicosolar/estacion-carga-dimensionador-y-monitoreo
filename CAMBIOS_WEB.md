# Cambios web — web-tg-2026.11.08.1

Fecha 2026-11-08. Rama local mejora-web-tg, base 9e63004b367f6a6cbc0e12d2cbe3ff6d7569daaf. Sin publicación remota.

## Código modificado

- index.html: arquitectura eléctrica completa, referencias 800 W/110 V/60 Hz/800 Wh/12 V, separación de diseño previsto, web implementada y validación física pendiente; retiradas cifras que parecían mediciones.
- dimensionamiento.html: conserva configuración, energía, banco, FV/MPPT, selector, inversor y AC; añade sesiones/día, PR global editable, datos reales FV/térmica/límites MPPT, parámetros DC/AC del inversor, FP/corrección AC y evaluación de conductor DC. Navegación por etapas y ayudas actualizadas.
- calculos.js: conserva flujo, estado, baterías y selector. Corrige etiquetas/unidades y redondeo prematuro de Wh, valores de referencia, duración positiva y reinicio. Fórmulas FV/inversor anteriores sustituidas por adaptadores comprobables.
- cables_ac.js: conserva tabla y copia de resultados. Añade corrección de ampacidad/FP, muestra base y corregida, valida distancia/factores; corrige reconstrucción del resultado al pulsar Copiar.
- ayuda_dimensionador.js: corrige ID t_respaldo.
- app.js: menú, Escape, aria-current y salto al contenido; elimina calculadora muerta y variación automática de cifras simuladas.
- monitoreo.html: separa dashboard externo, estado no verificable y demo optativa. Conserva enlace público; retira conmutador visual de carga para evitar confundirlo con operación física.
- styles.css: paleta compartida, fondos sobrios, tipografía/espaciados, estados y responsive, foco visible y reducción de movimiento. estilos.css heredado permanece sin reescritura completa; overrides del sistema compartido se cargan después.

## Código nuevo

- motor.js: funciones puras de demanda, batería, FV/MPPT, inversor, DC y validadores.
- mejoras.js: adaptadores DOM, errores por campo, invalidación por etapas y métricas de banco instalado.
- telemetria.js: evaluación de validez y antigüedad de muestras.
- monitoreo.js: demo optativa con caducidad y disponibilidad del iframe sin inferir conexión de estación.
- tests/unit.cjs, static.cjs, browser.cjs, boundaries.cjs: 38 casos automatizados con varias aserciones por caso.
- tests/generar_informe.py: reconstruye matriz y reportes desde evidencias guardadas; no ejecuta tests.
- package.json y .gitignore: comandos de prueba y dependencia de desarrollo fijada; sin dependencias de producción.

## Documentos y evidencia

AUDITORIA_WEB.md, PROTOCOLO_PRUEBAS_WEB.md, RESULTADOS_PRUEBAS_WEB.md, esta bitácora y README actualizado. VALIDACION_DIMENSIONAMIENTO.md conserva contenido heredado, con advertencia de carácter histórico. evidence/ contiene capturas antes/después, resultados JSON, logs y huellas de código. MATRIZ_VALIDACION_WEB.xlsx reproduce los casos y bloqueos para filtrarlos en Excel.

## Límites y aprobación

No se modificaron credenciales, configuración ThingsBoard, firmware ni componentes físicos. No hay push, merge ni publicación. Antes de desplegar deben revisarse el diff, evidencia y alcance con el propietario; solo después de autorización procede publicar la rama y tramitar integración. Hardware, integración real, fichas y conformidad normativa siguen pendientes de evidencia externa, como indica la matriz H01–H06.

## Actualización del dashboard aportado por el propietario

Se sustituyó el dashboard heredado por `61f1b9b0-cfe8-11f1-b97c-dd43a7f35a7a`, publicId `e2064c40-cfe5-11f1-868a-d954e9b50a21`, en el enlace externo y fuente del iframe. HTTPS devuelve HTTP 200. Se repitieron S01–S04: 4 aprobadas. Comprobación adicional de navegador del enlace, data-src, src y reintento registrada en evidence/dashboard-update.json. No acredita conexión física ni contenido IoT. Las capturas y matriz anteriores corresponden a la revisión previa a este cambio de URL; source-sha256.json conserva esa referencia y el JSON nuevo registra la nueva huella de monitoreo.html. Sin publicación remota.

## Rediseño gráfico 02 — solicitado tras revisión visual

Se reemplazó el sistema de estilos compartido para consolidar una identidad gráfica de ingeniería: verde solar, azul oscuro y acento ámbar; logotipo vectorial, navegación con iconos y componentes consistentes.

- Inicio: nueva composición editorial, esquema vectorial conceptual propio, franja de parámetros de referencia y accesos principales al dimensionador/monitoreo.
- Monitoreo: dashboard en primer plano, panel lateral con fuente/estado y referencias, demo separada debajo y detalles técnicos desplegables. Se conserva el dashboard proporcionado por el propietario. Nuevo estado gráfico de carga y fallback; no se infiere conexión del equipo por la carga del iframe.
- Dimensionamiento: campos agrupados y alineados en dos columnas en escritorio, una en móvil, navegación numerada por etapas, introducción compacta y ayudas con mejor legibilidad. Se conservaron IDs, formularios, botones, fórmulas y validación.
- Estilos anteriores duplicados/de componentes inactivos retirados de styles.css. estilos.css continúa aportando estructura heredada del dimensionador, con el sistema visual compartido aplicado después.
- Pruebas de navegador configuradas para desactivar GPU en ejecución headless y ampliar tiempo de captura ante demoras de renderizado del entorno. No cambia el comportamiento de la web del usuario.

Las evidencias del rediseño se registran en evidence/redesign/ y las capturas de la última ejecución en evidence/after/. El registro original de pruebas y la matriz Excel corresponden a la auditoría previa; no se altera retrospectivamente su alcance. Sin publicación remota.

## Pruebas de dimensionamiento y precisión numérica

Se ejecutaron31 verificaciones iniciales en el navegador abierto. Al ampliar a magnitudes positivas casi nulas se reprodujeron cinco fallos de precisión; se corrigieron en motor.js y mejoras.js, conservando sus logs previos. Se añadieron tests/extremos-dimensionamiento.cjs y su ejecución en npm test; los scripts modificados se sirven con query de versión. tests/static.cjs admite esas rutas. Resultado final:24 pruebas de consola y12 comprobaciones de interfaz aprobadas. Informe: RESULTADOS_DIMENSIONAMIENTO_ACTUAL.md. Sin cambios de permisos ni publicación remota.
