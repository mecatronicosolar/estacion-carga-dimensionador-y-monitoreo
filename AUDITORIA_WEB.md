# Auditoría web — 2026-11-08
Base inspeccionada: `9e63004b367f6a6cbc0e12d2cbe3ff6d7569daaf`. Rama de trabajo: mejora-web-tg. Auditoría inicial realizada antes de modificar código.

## Inventario y flujo
11 archivos: tres HTML, dos CSS, calculos.js (605 líneas), cables_ac.js (296), ayuda_dimensionador.js (33), app.js (4), README y VALIDACION_DIMENSIONAMIENTO. Sin gestor de dependencias ni tests versionados. HTML estático compatible con rutas relativas de GitHub Pages. `estado` léxico en calculos.js comparte resultados con cables_ac.js; no hay persistencia entre páginas. app.js contiene otra calculadora obsoleta sin formulario asociado. No hay firmware ni exportación/configuración de ThingsBoard para comprobar nombres reales.

| ID | Prioridad | Tipo | Evidencia inicial | Acción prevista |
|---|---|---|---|---|
| A01 | P1 | Confirmado | registrarHSP usa E_bat=E/DoD/eta como demanda diaria | Separar capacidad de almacenamiento y energía diaria; sesiones/día y PR editables |
| A02 | P1 | Confirmado | calcularPaso2_3 usa P/V_nominal y solo 3 opciones, MPPT externo sin rango/arranque/salida | Vmp/Imp reales, temperatura, límites y enumeración simétrica |
| A03 | P1 | Confirmado | calcularPaso3 comprueba solo W y corriente, declara compatible | Comprobar banco DC, rango, AC/Hz y no garantizar conexiones múltiples |
| A04 | P1 | Confirmado | No hay invalidación general al editar campos | Invalidación por etapa y limpieza de selecciones |
| A05 | P1 | Confirmado | beta/Tmin aceptan valores no finitos; productos pueden desbordarse | Motor numérico validado y límites explícitos de alcance |
| A06 | P1 | Confirmado | Inicio incluye 520 W/78 % sin etiqueta próxima; monitoreo mezcla valores demo y dashboard | Inicio sin mediciones ficticias; demo voluntaria separada y estado externo no verificable |
| A07 | P1 | Riesgo | iframe de otro origen sin API de salud ni timestamps verificables | No inferir conexión por onload; timeout/error/reintento y acceso directo |
| A08 | P2 | Confirmado | mínimo arbitrario 1 h, PR fijo 0.75, alerta >15 paneles | Escenarios editables y eliminar límites injustificados |
| A09 | P2 | Confirmado | baterías no muestra energía instalada nominal/utilizable/AC | Añadir métricas y advertencias BMS/tasa/temperatura |
| A10 | P2 | Confirmado | AC asume FP=1, sin corrección térmica/agrupamiento; no módulo DC | Mantener cálculo AC explícitamente preliminar, factores editables y añadir caída DC |
| A11 | P2 | Confirmado | estilos dispares, degradados, ayudas inconsistentes | Sistema visual compartido y accesibilidad |
| A12 | P1 | Confirmado | VALIDACION menciona tests/dimensionamiento.cjs ausente y fórmulas antiguas | Pruebas nuevas reproducibles y documento histórico identificado |
| A13 | P2 | Confirmado | app.js calculadora muerta y timer simulado permanente | Retirar código muerto; demo explícita |
| A14 | P1 | Bloqueado | Sin hardware, credenciales ni fichas comerciales | No certificar instalación, telemetría ni componentes |

P0: ninguno identificado en la inspección inicial. PublicId de dashboard es identificador de acceso público, no secreto de dispositivo. La búsqueda de patrones se repetirá al finalizar; no equivale a una auditoría de secretos de todo el historial remoto. No hay accionamiento físico en el código inspeccionado.

## Alcance eléctrico y normativo
Es una herramienta preliminar, no certificación. El perfil UI no determina el modo IEC de carga. 800 W/110 V/60 Hz son escenario de referencia, no especificación comercial verificada. La arquitectura prevista es FV → MPPT → batería → inversor → carga, respaldo de red con conmutación y protecciones por verificar. ADS1015/Raspberry Pi/ThingsBoard son previstos; su implementación física no está demostrada por este repositorio.

Fuentes oficiales consultadas el 2026-11-08:
- RETIE: https://minenergia.gov.co/es/misional/energia-electrica-2/reglamentos-tecnicos/reglamento-t%C3%A9cnico-de-instalaciones-el%C3%A9ctricas-retie/ identifica Resolución 40284 de 2026. Aplicabilidad y transición dependen de instalación/fecha, fuera de lo demostrable por software.
- IEC 61851-1: https://webstore.iec.ch/en/publication/33644 requisitos generales EVSE. Requiere conocer equipo, modo y ensayos para aplicar cláusulas.
- IEC 62196-1:2025: https://webstore.iec.ch/en/publication/86313 y 62196-2:2025 https://webstore.iec.ch/en/publication/86317: requisitos de accesorios/conectores; verificar parte/edición y conector efectivamente seleccionado. Las fichas públicas consultadas no sustituyen texto normativo completo.
- NTC 2050: instalación, conductores y protecciones deben revisarse con edición oficial aplicable. Tabla AC heredada se conserva como referencia académica, no declaración normativa.

Pendiente de diseño físico: PE/equipotencialidad, diferencial compatible con EVSE, sobrecorriente DC/AC, capacidad de corte, sobretensiones, seccionamiento, enclavamiento red/inversor, BMS, límites de tensión reales y temperatura. No se pueden seleccionar protecciones definitivas solo con W y V.

## Correcciones implementadas y verificación

| Hallazgos | Estado de esta revisión | Evidencia |
|---|---|---|
| A01, A08 | Corregidos: demanda diaria independiente de DoD; PR y sesiones editables; duración fraccionaria; desaparece alerta arbitraria de 15 paneles | U01–U03, E01/E05, B04 |
| A02 | Corregido en el alcance preliminar: datos reales, térmica, rango/arranque, corrientes FV y salida, potencia y banco; MPPT externo e integrado | U06–U08, B04, E02–E04 |
| A03 | Corregido: comparación DC con banco y AC con carga; no declarar compatibilidad comercial completa; múltiples unidades sin aval de sincronización | U09, B05 |
| A04 | Corregido: invalidación conservadora por etapa y selección | B05/B07/B08, E03/E05 |
| A05 | Corregido en rutas activas: límites y errores numéricos; campos térmicos firmados validados | U10, B02, E04 |
| A06, A07 | Corregida presentación: inicio sin mediciones ficticias, demo optativa, timestamps/caducidad por variable, estado no verificable y fallo/reintento de iframe | U14, B10/B11 |
| A09 | Corregido: nominal/utilizable DC/AC, autonomía y advertencias de ficha | U03/U05, B03 |
| A10 | Ampliado: corrección/FP AC y evaluación DC; no selecciona protecciones definitivas ni certifica tabla | U11–U13, B06 |
| A11 | Implementado: identidad compartida, menú, salto al contenido, foco, ayudas, navegación por etapas y móvil | B01, E07; capturas evidence/after |
| A12, A13 | Corregidos: pruebas reales versionadas, documentación histórica identificada y retirada calculadora JS muerta/timer engañoso | S03, suites y protocolo |
| A14 | Bloqueado para validación física y comercial, sin ocultar incertidumbre | H01–H06 en matriz |

Las partes útiles existentes de calculos.js (baterías, configuración y selector) y cables_ac.js se conservaron y extendieron. motor.js permite prueba sin DOM; mejoras.js adapta nuevas validaciones al flujo heredado. No se agregaron dependencias de producción; Playwright es herramienta de desarrollo. El conmutador visual de carga se retiró porque no representaba una función física; sigue existiendo una demo de datos expresamente identificada. El dashboard externo y su enlace se conservaron.

### RETIE comprobado en fuente primaria
Se consultó el [Libro 3 oficial, artículo 3.17.7, páginas 77–79](https://www.minenergia.gov.co/documents/15921/Libro-3-Resolucion-40284-23-06-2026.pdf). El requisito del circuito exclusivo mínimo 20 A se refiere al contexto domiciliario/similar; por eso la calculadora mantiene el selector de entorno. La temperatura límite del conductor debe verificarse en instalación real. La columna de ampacidad de referencia a 60 °C no prueba por sí sola la temperatura de operación. El perfil de cálculo de la web no clasifica el modo IEC de carga ni acredita cumplimiento.

### Riesgos residuales explícitos
No se inspeccionó todo el historial remoto: clon superficial. El escaneo de secretos por patrones no garantiza detectar cualquier secreto. La API de telemetría real está ausente, no incompleta detrás de cifras demo. No se pueden confirmar estado de conexión, alarmas, calidad de sensor ni claves sin firmware/configuración. El dashboard es de otro origen y puede requerir permisos que esta web no controla. Búsqueda FV limitada, sin múltiples trackers; límites nominales no sustituyen curvas ni tensión mínima real del banco. Accesibilidad automatizada/básica de teclado no equivale a conformidad WCAG completa. Pruebas de Chrome no acreditan Safari/Firefox.

## Hallazgo adicional A15 — precisión con entradas extremas

P1, confirmado mediante pruebas nuevas: entradas positivas subnormales podían producir Infinity, energía cero por subdesbordamiento o autonomía infinita. Cinco pruebas nuevas fallaron antes de corregir. Se añadieron comprobaciones de resultado positivo/finito al motor y al flujo de energía de sesión. Las seis regresiones extremas pasan después; total automatizado24/24 y regresión final de interfaz12/12. También se versionaron los dos scripts modificados para evitar conservar la revisión anterior en caché. Ver RESULTADOS_DIMENSIONAMIENTO_ACTUAL.md y evidence/dimensionamiento-actual/ para fallos previos y resultados finales reales.
