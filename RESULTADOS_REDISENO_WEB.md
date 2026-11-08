# Validación del rediseño gráfico 02

La interfaz de Inicio, Dimensionamiento y Monitoreo se rediseñó en la rama local mejora-web-tg. No se publicó en GitHub Pages.

## Resultado ejecutado

38 casos de regresión aprobados: 18 unitarios/estáticos, 12 de navegador principal y 8 de escenarios límite. No hubo fallos en la ejecución final. Las vistas de 375, 768 y 1440 px se probaron con navegación móvil, formularios, cálculo, reinicio, invalidación, teclado y monitoreo simulado. Las fórmulas eléctricas no se alteraron en esta revisión visual.

## Evidencia

- evidence/redesign/unit-static.log, browser.log y boundaries.log: salidas de esta ejecución.
- evidence/redesign/browser-results.json y boundary-results.json: resultados detallados.
- evidence/redesign/source-sha256.json: huellas de las fuentes actuales.
- evidence/after/: capturas del rediseño en las tres resoluciones y de escenarios de prueba. Las versiones visuales previas se conservan en los commits anteriores.

Se inspeccionaron visualmente Inicio de escritorio/móvil, Monitoreo de escritorio/móvil y el dimensionador de escritorio. El dashboard se bloquea deliberadamente durante los tests para no depender de contenido remoto. No se interpreta una captura de fallo inducido como evidencia de indisponibilidad real.

El primer intento exploratorio independiente de captura agotó 30 s; se repitió correctamente con GPU desactivada y más tiempo. No se contó ese intento como prueba aprobada. Los casos H01–H06 y N01 del protocolo original conservan sus bloqueos/pendientes: no se ejecutó validación física, normativa ni ensayo con usuarios/lector de pantalla.
