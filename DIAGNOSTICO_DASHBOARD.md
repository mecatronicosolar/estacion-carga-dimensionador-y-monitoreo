# Diagnóstico del dashboard público

Fecha de revisión: 2026-11-08. Revisión posterior al rediseño gráfico 02.

## Comprobación realizada en navegador

Se inspeccionó la pestaña abierta por el usuario con el enlace directo:

https://thingsboard.cloud/dashboard/61f1b9b0-cfe8-11f1-b97c-dd43a7f35a7a?publicId=e2064c40-cfe5-11f1-868a-d954e9b50a21

La página se identifica como **Raspberry Solar Dashboard**. La vista directa, fuera del iframe local, presenta:

- Solar PV Power: N/A y No data to display on widget.
- AC Power: N/A y No data to display on widget.
- Photovoltaic Voltages y Battery Voltage: sin datos.
- Temperatures: No entities found, 1–0 of 0.
- Los restantes gráficos de corriente, batería y salida AC también indican ausencia de datos.

No se encontraron mensajes de advertencia/error en los últimos ocho registros solicitados mediante el inspector de la pestaña. Esto no demuestra ausencia de errores de backend ni sustituye la revisión de configuración.

## Conclusión comprobada

La falta de datos se reproduce fuera de la web local. No está limitada al iframe, al CSS ni al indicador de carga de la página. No se ha establecido todavía la causa interna en ThingsBoard.

## Hipótesis pendientes, no hechos confirmados

1. El dashboard es público, pero el dispositivo/asset o su grupo no tiene los permisos públicos correspondientes.
2. El alias de entidad o un filtro no resuelve el dispositivo real. El mensaje No entities found justifica revisar esta configuración.
3. Las claves de los widgets no coinciden con la telemetría recibida, no hay muestras o la ventana temporal no contiene datos.

La documentación oficial de ThingsBoard Cloud distingue publicación de grupos de dashboards y publicación de los grupos de datos asociados:
https://thingsboard.io/docs/paas/user-guide/dashboards/

## Siguiente comprobación necesaria

Comparar el mismo dashboard dentro de la sesión de administrador:

- Si allí hay datos: revisar permisos de las entidades/grupos usados por el dashboard público.
- Si allí tampoco hay datos: revisar Entity aliases, entidad resuelta, Latest telemetry del dispositivo, claves exactas de cada widget y ventana temporal.

Para corregir el origen hace falta inspeccionar esa configuración en la sesión autorizada o disponer de una exportación del dashboard y el esquema de telemetría. No se han alterado permisos, credenciales, dispositivos ni datos. No se han creado mediciones para rellenar widgets vacíos.
