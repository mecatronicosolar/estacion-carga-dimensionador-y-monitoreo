# Estación de carga solar — revisión de trabajo de grado

Versión `web-tg-2026.11.08.1`, rama local `mejora-web-tg`. Base: `9e63004b367f6a6cbc0e12d2cbe3ff6d7569daaf`. No se ha publicado esta versión.

Web estática sin dependencias de producción, compatible con GitHub Pages en subdirectorio.

## Revisar localmente

Desde la carpeta del repositorio:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8765/ en navegador. No abrir como `file://` para probar portapapeles y comportamiento HTTP.

- Inicio: alcance del proyecto, referencias y arquitectura prevista.
- Dimensionamiento: conservar orden batería → demanda diaria/FV → MPPT; el inversor se evalúa con banco DC y carga, sin compararlo con el FV. AC calcula un punto individual; DC evalúa el tramo común batería–inversor.
- Monitoreo: dashboard externo independiente, sin API de mediciones autenticada. Demo voluntaria con datos locales etiquetados y caducidad. Sin accionamientos físicos.

## Pruebas

Node.js 20 o superior. No hace falta instalar paquetes para pruebas matemáticas/estáticas:

```sh
node --test tests/unit.cjs tests/static.cjs tests/extremos-dimensionamiento.cjs
```

Para navegador, instalar únicamente herramientas de desarrollo:

```sh
npm install
```

Mantener el servidor anterior abierto. Con Google Chrome instalado en macOS:

```sh
node tests/browser.cjs
node tests/boundaries.cjs
```

En otro sistema, indicar la ruta del navegador con `CHROME_PATH` y opcionalmente otra base con `TEST_URL` (debe terminar en `/`). Ejemplo:

```sh
CHROME_PATH='/ruta/al/chrome' TEST_URL='http://127.0.0.1:8765/' npm run test:browser
```

Los scripts usan Playwright 1.62.1 y Chrome local; no requieren instalar navegadores adicionales. Generan JSON y capturas en `evidence/`. `npm test` agrupa pruebas unitarias y estáticas. Los tests del dashboard bloquean su red para reproducir fallos, no verifican hardware ni contenido remoto.

En la sesión de implementación se utilizó Node y Playwright del runtime de Codex mediante `NODE_PATH`; no se ejecutó `npm install` ni se generó lockfile. La dependencia de desarrollo está fijada en package.json. Los comandos Node anteriores sí se ejecutaron realmente.

## Supuestos del modelo

- Energía por sesión: P × h. Energía diaria: P × h × vehículos × sesiones/día.
- Batería de respaldo: energía simultánea / (DoD × eficiencia inversor). DoD no multiplica consumo diario. Se dimensionan ramas por Ah y corriente continua; series estrictamente enteras.
- FV: energía AC diaria × fracción solar / (HSP × PR). PR es global desde potencia nominal FV hasta energía AC útil: no duplicar eficiencias.
- MPPT: datos reales Voc/Vmp/Isc/Imp, coeficientes y temperaturas de célula; límites FV y carga de batería. β Vmp faltante bloquea cálculo térmico; no se inventa. Arranque se exige conservadoramente a Vmp caliente. Salida se estima a tensión nominal; confirmar a batería mínima y con ficha.
- Búsqueda FV: hasta 1000 paneles en serie y 1000 ramas; muestra el paralelo mínimo por serie que cubre energía. No explora múltiples trackers ni sobredimensionamiento con clipping admitido por fabricante.
- Inversor: tensión nominal/rango DC a nominal del banco, W continuos y V/Hz AC. Múltiples unidades no se declaran compatibles sin evidencia de sincronización. Pico y ventana real de batería quedan pendientes.
- AC: tabla heredada de cobre 60 °C, corrección y FP editables; caída resistiva conservadora usando corriente RMS sin reactancia. Factor 1 no significa instalación validada. DC: sección/ampacidad documentadas introducidas por usuario, ρ aproximada 0,021 Ω·mm²/m; diseño ×1,25. No se seleccionan fusibles, PE ni diferencial.
- Límites numéricos son alcance del modelo, no límites comerciales: potencia por vehículo hasta 1 MW, duración hasta 168 h, vehículos hasta 10000, sesiones/día hasta 1000, HSP hasta 24 h y hasta 100000 módulos de batería. Se rechazan valores fuera de alcance.

## Datos y seguridad

Estado solo en memoria, sin persistencia entre recargas/páginas; editar invalida etapas dependientes. No se guardan credenciales. `publicId` es un identificador de dashboard público y no prueba que el contenido o los datos sean reales. La web no puede inspeccionar datos/timestamps dentro de un iframe de otro origen.

El README anterior enumeraba claves de telemetría como propuestas, sin firmware que las respalde. Candidatas aportadas: batteryVoltage, panelVoltage, batteryTemperature, voltageMeasurementValid, relayOn, ledOn. Ninguna se afirma verificada en hardware. Integración real requiere firmware/configuración ThingsBoard, mapeo de claves/unidades, origen y timestamps, validación/calibración y backend seguro si hay operaciones privadas.

## Documentación de validación

- AUDITORIA_WEB.md: inventario, hallazgos, correcciones y alcance normativo.
- PROTOCOLO_PRUEBAS_WEB.md: metodología y matriz completa.
- RESULTADOS_PRUEBAS_WEB.md: resultados realmente ejecutados y bloqueos.
- CAMBIOS_WEB.md: archivos y cambios.
- evidence/: capturas antes/después, logs, JSON y huellas SHA-256.
- VALIDACION_DIMENSIONAMIENTO.md: referencia histórica del repositorio; sus pruebas no se adoptan como evidencia de esta versión.

## Despliegue — requiere autorización del propietario

No se hizo push, merge ni cambio de GitHub Pages. Para revisar el parche: `git diff main...mejora-web-tg` después del commit local; antes del commit, `git diff` y `git status`.

Tras autorización expresa: publicar la rama de mejora, abrir/revisar PR contra main, integrar y conservar configuración Pages de la raíz. Los tres HTML y todos los JS/CSS deben desplegarse juntos. No copiar node_modules. Repetir pruebas con TEST_URL apuntando a la URL final; contrastar rutas y estado del iframe. Reversión: revertir el commit aprobado, sin reescribir historial. No cambiar configuración eléctrica, tokens ni ThingsBoard para desplegar archivos estáticos.
