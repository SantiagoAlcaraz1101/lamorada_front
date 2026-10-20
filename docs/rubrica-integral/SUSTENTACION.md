# Cómo sustentar la rúbrica ante el profesor

Abre primero el informe de la última ejecución indicada por `evidence/latest.json`.
Cada fila tiene objetivo, esperado, obtenido, estado y enlaces. Empieza por un
caso concreto, abre su prueba y su evidencia y luego explica el alcance.
Presenta también los fallos iniciales y las correcciones: demuestran que la suite
detecta problemas. No conviertas un pendiente de ejecución en aprobado.

## 1. Regresión, API y componentes

**Qué mostrar:** REG-01–05, API-01–11, COMP-01–08, las suites existentes y los JSON
Jest/Karma. Escoge API-09 (dos libros = 130000 COP) y API-10 (cantidad -1 =400 sin
alterar total). Después COMP-04 (botón deshabilitado mientras espera) y COMP-06
(un fallo de red permite recuperarse).

**Qué decir:** «Probamos caminos correctos y negativos. Cypress recorre la
aplicación y prueba los contratos HTTP; Jasmine monta plantillas con servicios
controlados y Jest/Supertest amplía la regresión del backend. Una prueba negativa
aprueba cuando rechaza el dato inválido con el estado y efectos esperados».

**Demostración:** ejecuta `npm test` desde assessment, o `npm run test:rubric` desde
LaMorada. Abre una fila API y su JSON de observación; muestra el `expect` de código
HTTP y total. Abre COMP-07: prueba el fallo de carga prematura encontrado y corregido.
No digas que el número de pruebas equivale a cobertura de todos los requisitos.

## 2. Seguridad y rendimiento

**Qué mostrar:** SEC-01 autenticación, SEC-02 firma manipulada, SEC-03 roles,
SEC-04 revocación, SEC-05 CORS, SEC-06 aislamiento, API-06 NoSQL y SEC-07 rate limit.
En seguridad enseña el rechazo real: 401/403/429 y ninguna modificación indebida.

**Qué decir:** «Las restricciones se validan en API, además de la interfaz.
El ambiente E2E permite 100 logins para no interferir entre casos; el limitador
de producción se prueba aparte y bloquea la sexta solicitud. El análisis de
dependencias detecta paquetes vulnerables, sin afirmar que todos sean explotables
desde la aplicación».

**Carga:** abre performance.json y explica 1/5/15 usuarios, 10 segundos por fase,
50 ms de espera por usuario, calentamiento y mezcla de consultas. Presenta p95,
tasa de errores y throughput frente a los umbrales, no solo un promedio.

**Interpretación:** «Son medidas locales de una carga corta de lectura. No
representan usuarios reales de producción ni la capacidad máxima. Conservamos
una fase inicial donde la API se cerró; registramos el código de proceso y
repetimos sin borrar los fallos. Recomendamos prueba prolongada, más volumen de
datos, escrituras concurrentes, métricas de CPU/memoria y diagnóstico de cierres».
En SEGURIDAD_RENDIMIENTO.md están las vulnerabilidades residuales y prioridades.

## 3. UX, Nielsen, accesibilidad, interfaz y análisis de IA

**Qué mostrar:** UX_NIELSEN_IA.md con sus diez filas, el prompt de IA, la escala,
evidencias before/after y el acta del equipo. Abre A11Y-04 antes: dos botones sin
nombre, contraste del selector y nombre de la marca. Después abre la auditoría
posterior y muestra los cambios de HTML/CSS.

**Qué decir:** «La IA sugirió hallazgos; los contrastamos con código y ejecución.
Nuestro equipo debe aceptar, rechazar o ajustar cada conclusión, con responsables
y razones. Los resultados automáticos se distinguen de la evaluación humana».

**Correcciones para demostrar:** nombres Mostrar/Ocultar, idioma español,
autocomplete, salto al contenido, foco visible, moneda COP, ancho móvil y mensajes
de carga/error honestos. UI-01 conserva dimensiones medibles y captura; no se
oculta el desbordamiento horizontal para hacer pasar el caso.

**Para completar el nivel Alto:** un integrante debe registrar su revisión propia,
con evidencias de recorridos, teclado, lector de pantalla y zoom. Hasta completarla,
no presentar el acta como aprobada. «Cero errores axe» describe los estados
auditados y no significa certificación WCAG completa.

## 4. E2E con Screenplay

**Qué mostrar:** cypress/screenplay/index.js y screenplay.cy.js. Identifica:

| Elemento | Implementación | Qué explicar |
|---|---|---|
| Actor | Actor.named('Camila, paciente') | Representa a quien usa el sistema. |
| Habilidad | BrowseTheWeb.usingCypress() | Da al actor acceso al navegador y localizadores. |
| Tareas | LogIn, SearchFor, AddBookToCart | Expresan objetivos del usuario y componen interacciones. |
| Interacciones | Open, Enter, Click | Operan controles y esperan estados válidos. |
| Preguntas | TextOf, CurrentPath, CartQuantity | Consultan resultados observables de la aplicación. |
| Verificación | Ensure, EnsureContains | Compara las respuestas con lo esperado usando aserciones retryables. |

**Demostración:** SP-04 atraviesa login, catálogo, API y carrito real; comprueba
cantidad y total y termina vacío. SP-02/SP-05/SP-06 prueban alternativas de error,
invitado y rol. Muestra el video y las aserciones. Explica la corrección de
sincronización: esperar /home después del login antes de iniciar otra tarea.
No es Serenity: es una implementación explícita de Screenplay sobre Cypress.
No confundir Screenplay con una colección de funciones sin actor ni preguntas.

## 5. E2E con Katalon

**Qué mostrar:** LaMorada-Recorder.html importado en **Katalon Recorder**, los
ocho casos y login.csv. Localizadores por ID, data-testid y atributos accesibles;
setTimeout 15000 y waitFor* esperan cambios reales, después assert* verifica.

**Demostración:** ejecutar KAT-05 y comprobar 1→2, total 130000 y eliminación.
Ejecutar KAT-08 y mostrar las dos filas CSV: acceso correcto y contraseña
incorrecta. Repetir la suite sin modificar datos; KAT-05 prepara y limpia su carrito.
Los comandos captureEntirePageScreenshot guardan captura por caso/fila.

**Evidencia necesaria:** Log/Reports de la extensión con estado y pasos de cada
caso, capturas, fecha, versión de Chrome/Recorder y resultado obtenido. Guardarla
según katalon/LEEME.md y actualizar cases.json. Hasta ejecutarlo en la extensión,
el resultado es NO EJECUTADO. Un video de Cypress no cuenta como evidencia Katalon.
La rúbrica dice Katalon sin especificar Studio: confirmar con el profesor si
acepta Recorder, que es la herramienta instalada por el usuario.

## Orden sugerido de exposición

1. Arquitectura, alcance, datos ficticios y entorno aislado (1 min).
2. API positivo/negativo y componente con error/carga (2 min).
3. Seguridad, métricas de carga, fallo encontrado y mejoras (2 min).
4. Hallazgos Nielsen/IA, contraste humano y before/after (3 min).
5. Actor Screenplay y recorrido alternativo (2 min).
6. Ejecución real en Katalon Recorder con CSV y evidencias (2 min).

Lleva el informe HTML, logs/JSON originales, capturas, videos, código y acta humana.
El profesor asigna los puntos. Los máximos Alto de su tabla son 15/15/30/20/20,
aunque los encabezados anuncian 20 por criterio; confirmar ponderación sin alterar
su rúbrica.
