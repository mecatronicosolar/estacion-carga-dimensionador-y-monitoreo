# Resultados de pruebas web

Fecha: 2026-11-08 (America/Bogota). Versión: web-tg-2026.11.08.1. Base: 9e63004b367f6a6cbc0e12d2cbe3ff6d7569daaf. Rama mejora-web-tg.

## Ejecución registrada

38 casos automatizados aprobados, 0 fallidos, 6 bloqueados y 1 no ejecutado. Las suites unitarias/estáticas contienen 18 casos; navegador principal12 y límites8. Un caso agrupa varias aserciones: el conteo no representa todas las combinaciones posibles.

- evidence/unit-static.log: salida real de Node.
- evidence/browser-results.json y evidence/boundary-results.json: estados obtenidos de cada caso.
- evidence/validation-matrix.json y PROTOCOLO_PRUEBAS_WEB.md: matriz de entradas, procedimiento, esperados, obtenidos y bloqueos.
- evidence/source-sha256.json: versión exacta de las fuentes probadas. Documentación y Excel no forman parte del hash de código.

## Valores contrastados

800 W durante 1 h =800 Wh. Con 12 V y eficiencia0,85: 78,431372549 A DC (78,43 A en UI). Banco sintético12 V/100 Ah, DoD0,8: 1200 Wh nominales, 960 Wh DC utilizables y 816 Wh AC. FV para800 Wh/día, HSP4 y PR0,8:250 Wp; no se divide otra vez por DoD o eficiencia del inversor. Serie12 V/8 V rechazada. Límites MPPT y entrada de batería del inversor contrastados con fixtures independientes de fichas comerciales.

## Evidencia visual real

Antes: evidence/before/index.png, dimensionamiento.png y monitoreo.png. Capturadas de la copia base servida localmente antes de modificar fuentes. Después: evidence/after/[página]-375.png, -768.png y -1440.png, además dashboard-fallo.png y mppt-integrado.png. Se inspeccionaron visualmente Inicio de escritorio/móvil y las vistas iniciales de Dimensionamiento/Monitoreo; las suites comprueban adicionalmente ancho, navegación y flujo. Las capturas no demuestran funcionamiento físico ni datos IoT reales.

## Integración externa y límites

Se hizo solicitud HTTPS GET al enlace público ThingsBoard: respondió200 con HTML (4177 bytes). Solo demuestra entrega del contenedor de aplicación en ese momento; no autentica ni confirma telemetría, dispositivo, nombres reales o disponibilidad interna. Las pruebas de fallo fueron deliberadamente simuladas y están identificadas.

H01–H06 bloqueados: firmware/configuración, acceso/cuenta, hardware, instrumentos, fichas y evaluación eléctrica no disponibles. N01 pendiente: evaluación con usuarios y lector de pantalla; teclado básico sí probado. Escaneo S04 acotado al código público actual, no detector exhaustivo ni revisión de todo el historial remoto (clon superficial). La documentación heredada no se usa para declarar pruebas nuevas.

No se publicó ni se cambió main/Pages. No se conoce un defecto P0/P1 de software pendiente dentro de los escenarios ejecutados; esto no extiende la validación a instalación física, datos comerciales ausentes u otros navegadores. La aprobación del propietario sigue siendo necesaria antes de publicar.

## Detalle de estados ejecutados

| ID | Caso | Estado | Evidencia |
|---|---|---|---|
| U01 | 800 W × 1 h y sesiones/día | aprobado | evidence/unit-static.log |
| U02 | FV HSP4 PR0.8, independiente de DoD | aprobado | evidence/unit-static.log |
| U03 | batería corriente y energía instalada | aprobado | evidence/unit-static.log |
| U04 | serie eléctricamente incompatible | aprobado | evidence/unit-static.log |
| U05 | ramas por corriente además de Ah | aprobado | evidence/unit-static.log |
| U06 | MPPT tensión térmica y corriente reales | aprobado | evidence/unit-static.log |
| U07 | límites MPPT bloquean configuraciones | aprobado | evidence/unit-static.log |
| U08 | ficha FV incoherente o temperatura inválida | aprobado | evidence/unit-static.log |
| U09 | inversor compara batería DC y salida AC | aprobado | evidence/unit-static.log |
| U10 | vacíos, negativos, cero, NaN, infinito y extremos | aprobado | evidence/unit-static.log |
| U11 | conductor AC regresión caída independiente | aprobado | evidence/unit-static.log |
| U12 | AC trifásico, límites y factores | aprobado | evidence/unit-static.log |
| U13 | DC caída ida/retorno y ampacidad | aprobado | evidence/unit-static.log |
| U14 | timestamps y validez de telemetría | aprobado | evidence/unit-static.log |
| S01 | enlaces, recursos locales y anchors existentes | aprobado | evidence/unit-static.log |
| S02 | IDs únicos, labels, descripción accesible y enlaces externos | aprobado | evidence/unit-static.log |
| S03 | sintaxis de todos los scripts públicos | aprobado | evidence/unit-static.log |
| S04 | búsqueda acotada de secretos y accionamientos públicos | aprobado | evidence/unit-static.log |
| B01 | Tres páginas y navegación responsive sin overflow | aprobado | evidence/browser-results.json |
| B02 | Vacíos y negativos con error próximo | aprobado | evidence/browser-results.json |
| B03 | Flujo batería 800 Wh, 78.43 A y repetición | aprobado | evidence/browser-results.json |
| B04 | HSP4 PR0.8 calcula 250 Wp y MPPT externo | aprobado | evidence/browser-results.json |
| B05 | Inversor DC/AC y edición invalida resultado | aprobado | evidence/browser-results.json |
| B06 | AC y DC cálculos y corrección editable | aprobado | evidence/browser-results.json |
| B07 | Editar panel elimina selección e inversor | aprobado | evidence/browser-results.json |
| B08 | Editar potencia elimina dependientes | aprobado | evidence/browser-results.json |
| B09 | Reinicio conserva valores iniciales editables | aprobado | evidence/browser-results.json |
| B10 | Monitoreo sin datos y demo explícita que caduca | aprobado | evidence/browser-results.json |
| B11 | Fallo dashboard y reintento sin indicar conexión | aprobado | evidence/browser-results.json |
| B12 | Sin errores JavaScript | aprobado | evidence/browser-results.json |
| E01 | UI rechaza serie incompatible y acepta duración fraccionaria | aprobado | evidence/boundary-results.json |
| E02 | Perfil trifásico integrado sin perder funciones | aprobado | evidence/boundary-results.json |
| E03 | MPPT salida insuficiente no conserva opciones | aprobado | evidence/boundary-results.json |
| E04 | Campo térmico vacío y negativo no físico | aprobado | evidence/boundary-results.json |
| E05 | Sesiones y PR editables invalidan FV | aprobado | evidence/boundary-results.json |
| E06 | Copiar AC funciona sin destruir evidencia | aprobado | evidence/boundary-results.json |
| E07 | Teclado alcanza contenido y menú, Escape cierra | aprobado | evidence/boundary-results.json |
| E08 | Sin persistencia falsa al recargar | aprobado | evidence/boundary-results.json |
| H01 | Claves, unidades, timestamp y calibración | bloqueado | AUDITORIA_WEB.md |
| H02 | Pérdida de conexión física | bloqueado | AUDITORIA_WEB.md |
| H03 | Protecciones y conmutación | bloqueado | AUDITORIA_WEB.md |
| H04 | Compatibilidad comercial completa | bloqueado | AUDITORIA_WEB.md |
| H05 | Aplicabilidad y conformidad | bloqueado | AUDITORIA_WEB.md |
| H06 | Contenido y vigencia del dashboard externo | bloqueado | AUDITORIA_WEB.md |
| N01 | Evaluación con usuarios y lector de pantalla | no ejecutado | PROTOCOLO_PRUEBAS_WEB.md |
