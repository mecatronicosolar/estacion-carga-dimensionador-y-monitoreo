# Validación del dimensionamiento — 13 de octubre de 2026

Integración directa del HTML original; `calculos.js` recuperado del repositorio ramzz276/dimensionador-solar. Fórmulas solares conservadas. Corrección de interfaz: no regenerar tarjetas de paneles con valores idénticos al perder foco, evitando consumir el primer clic. CSS del dimensionador limitado a `.solar-sizing` para mantener intacta la navegación.

## Pruebas AC

Supuestos: Cu, FP 1, régimen continuo 125 %, instalación domiciliaria/similar con mínimo 20 A, columna de ampacidad 60 °C, ambiente 30 °C, no más de tres conductores portadores. Resistividad aproximada conservadora 0,021 Ω·mm²/m. Sección nominal AWG y caída a corriente de carga; el 125 % se aplica a ampacidad. Longitud eléctrica = 2 × distancia de ida.

| V | W | Ida m | I A | Diseño A | AWG | mm² | Caída V | Caída % |
|---|---|---|---|---|---|---|---|---|
|110|1100|20|10|12,5|12|3,31|2,538|2,307|
|120|1200|20|10|12,5|12|3,31|2,538|2,115|
|220|2200|20|10|12,5|12|3,31|2,538|1,154|
|240|2400|20|10|12,5|12|3,31|2,538|1,057|
|220|7000|25|31,818|39,773|8|8,37|3,992|1,814|
|240|7200|25|30|37,5|8|8,37|3,763|1,568|
|110|1100|100|10|12,5|6|13,30|3,158|2,871|

Resultados contrastados por R = ρ(ida + retorno)/S y ΔV = I·R; verificación de ampacidad y selección esperada independiente del resultado de la interfaz. Se rechazaron distancia cero/negativa, potencia vacía, no finita, excesiva y casos fuera de tabla. Cambios de potencia/tensión recalculan resultados. Se verificó ausencia de iframe, errores JS y desbordamiento horizontal en anchos 1440, 768 y 390 px.

## Pruebas solares

1100 W × 4 h = 4400 Wh por sesión; dos vehículos = 8800 Wh; HSP 4 = 2200 W de arreglo; panel 400 W/24 V = 6 paneles mínimos. Opción A: 6 serie × 1 paralelo, 144 V y 16,667 A; inversor original: entrada 2400 W y salida 1100 W. Flujo completo probado con los botones del navegador.

## Alcance normativo

- [RETIE vigente, Libro 3, Resolución 40284 de 2026](https://www.minenergia.gov.co/documents/15921/Libro-3-Resolucion-40284-23-06-2026.pdf), artículo 3.17.7: alimentación de cargadores sin calentamiento por encima de 60 °C, mínimo domiciliario de 20 A y protecciones del punto.
- NTC 2050 segunda actualización: tabla 310.15(B)(16), 210.19(A)(1), 625.41 y 625.42. [Consulta pública UPME](https://docs.upme.gov.co/DemandayEficiencia/Doc_Hemeroteca/Insumos_NTC_2050_Codigo_electrico_colombiano_V0_04212018.pdf) es un borrador, no sustituye la edición oficial ICONTEC. El RETIE no adopta indiscriminadamente toda la NTC 2050.
- El 3 % es un objetivo de diseño del circuito. No se certifica la instalación.
- Pendientes: ajustes de temperatura/agrupamiento, canalización, aislamiento, terminales, resistencia real del cable, placa EVSE, interruptor/diferencial, PE y condiciones locales. No se dimensiona PE copiando el conductor activo.
- Las fórmulas solares originales son estimaciones: no incorporan pérdidas/eficiencia, profundidad de descarga, envejecimiento, margen de inversor ni comprobación MPPT/Voc. Se conservaron por solicitud; requieren revisión antes del diseño definitivo.

## Ejecución de pruebas

La prueba local `tests/dimensionamiento.cjs` usa Node y Playwright. Admite `TEST_URL` para repetir contra GitHub Pages y `CHROME_PATH` para un Chrome instalado. No contiene secretos.
