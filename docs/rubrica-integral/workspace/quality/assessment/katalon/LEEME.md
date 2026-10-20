# Katalon Recorder — La Morada

La herramienta del usuario es la extensión **Katalon Recorder** de Chrome.
La rúbrica dice Katalon sin especificar Studio. Estos casos están hechos para
Recorder; confirmar con el profesor si exige específicamente Studio.

## Ejecutar

1. Inicia Docker y el entorno aislado con los comandos del README de assessment.
2. Abre `http://localhost:4200` en Chrome. Abre la extensión Katalon Recorder.
3. Usa **Open Test Suite** (icono de carpeta/abrir) e importa `LaMorada-Recorder.html`.
   Si tu versión solo importa un caso a la vez, importa `KAT-01.html` a `KAT-08.html`.
4. Para KAT-08 abre **Test Data**, usa **Add CSV** y selecciona `login.csv`.
   Conserva ese nombre: `loadVars` lo usa exactamente.
5. Ejecuta **Play Suite**. No ejecutes Cypress ni otro login paralelo: cada login
   renueva la sesión del mismo usuario en Redis y puede invalidar el token anterior.
6. Cada caso usa `setTimeout 15000` y esperas por estado del DOM. No usa pausas
   fijas ni XPath por posición. Los selectores son IDs, atributos `data-testid` y
   atributos accesibles. Las esperas se acompañan de `assert*` que detienen un fallo.
7. Abre **Screenshots**: los comandos `captureEntirePageScreenshot` generan
   capturas identificadas por caso. Guarda las capturas y el registro de Log/Reports
   de tu versión bajo `quality/assessment/evidence/katalon/<fecha>/`.
   Conserva el resultado por caso, fecha, versión de Chrome y versión de Recorder.
8. Repite la suite sin cambiar los datos. La inicialización borra solo la sesión
   local del sitio; KAT-05 vacía el carrito académico antes del recorrido y lo deja
   vacío. Los usuarios y productos son ficticios del entorno de prueba.

## Registrar la ejecución real

`cases.json` contiene objetivo, esperado y el estado inicial NO EJECUTADO.
Completa cada resultado con lo observado y la ruta a Log/Reports y captura;
una captura del sitio sola no demuestra ejecución en Katalon. Para KAT-08
registra ambas filas del CSV y sus verificaciones. Si aparece un fallo, conserva
el log y la captura, explica la causa y repite después de corregirla.

La importación y ejecución desde tu Chrome quedan pendientes: el navegador
Chrome y sus extensiones no están conectados a las herramientas de esta sesión.
Las ejecuciones de Cypress no se reportan como ejecuciones Katalon.

## Corrección de importación — 13 de octubre de 2026

El archivo inicial contenía celdas de destino completamente vacías en endIf y
endLoadVars. El parser público de Recorder accede al primer nodo de la celda;
si no existe, rechaza el archivo y su controlador puede dejar el error sin un
mensaje visible. Se corrigieron la suite y los ocho archivos individuales para
usar el formato nativo con datalist/option, incluso cuando el destino está vacío.

Selecciona de nuevo LaMorada-Recorder.html con **Open Test Suite**. Deben aparecer
ocho casos en **Test Suites**. Para probar primero una importación más pequeña,
abre KAT-01.html: debe aparecer un caso con sus comandos. Si la misma selección
no dispara la importación después del intento fallido, cierra y vuelve a abrir
la ventana de Recorder antes de seleccionar el archivo corregido.

La validación del formato mediante el parser público no equivale a ejecutar los
recorridos en tu extensión. Si sigue sin importar, registra el nombre y versión
de la extensión en chrome://extensions y consulta la consola de la ventana
Recorder (F12 → Console) al seleccionar el archivo.

Referencia del parser: https://github.com/katalon-studio/katalon-recorder/blob/master/panel/js/UI/services/helper-service/parser.js

Formato y comandos basados en los [ejemplos oficiales de Katalon Recorder](https://github.com/katalon-studio/katalon-recorder-samples/blob/master/Katalon%20Recorder%20Samples.html).
