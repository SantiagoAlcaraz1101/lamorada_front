# Plan de pruebas y trazabilidad

Fecha académica: 11 de octubre de 2026, America/Bogota. Las evidencias guardan
timestamps ISO UTC para facilitar reproducción y comparación.

## Objetivo general y alcance

Detectar regresiones y demostrar controles, accesibilidad, interfaz y recorridos
de La Morada mediante pruebas ejecutables. El alcance nuevo prioriza login,
catálogo, búsqueda, carrito, roles y sesión. Las suites existentes amplían la
regresión sobre perfiles, disponibilidad, citas, publicaciones y validadores.
El smoke de rutas públicas solo demuestra que cargan, no todo su comportamiento.
No se declara cobertura total del proyecto ni seguridad absoluta por tener casos verdes.

## Matriz de herramientas

| Criterio | Herramientas | Casos / evidencia |
|---|---|---|
| 1. Regresión, API y componentes | Cypress + Jest/Supertest + Karma/Jasmine | REG-01–05, API-01–11, COMP-01–08 y suites existentes; JSON/log/capturas/video |
| 2. Seguridad y rendimiento | Cypress HTTP, Supertest, npm audit, carga con Node fetch | SEC-01–07, PERF-01–03; códigos HTTP, métricas y muestras por solicitud |
| 3. UX, Nielsen, IA, accesibilidad e interfaz | Revisión visual/funcional, IA, axe-core, Chrome | UI-01–02, A11Y-01–10; before/after, severidad y acta humana |
| 4. Screenplay | Actor con habilidad BrowseTheWeb; tareas, interacciones y preguntas; Cypress | SP-01–06; recorridos correctos y alternativos, aserciones retryables |
| 5. Katalon | Katalon Recorder instalado por el usuario; HTML + CSV | KAT-01–08, ambos registros CSV; requiere reporte real de la extensión |

## Diseño y aceptación por caso

`catalog.cjs` define objetivo y resultado esperado de los nuevos casos.
`katalon/cases.json` define los de Recorder. `report.cjs` cruza estas definiciones
con resultados reales y conserva las fallas. Para casos históricos, el objetivo
es su descripción ejecutada y el esperado son sus aserciones explícitas en la
fuente, identificables por suite y nombre. El reporte registra cada uno por separado.

Pasos detallados y datos están en las suites; no se mantienen dos copias manuales
que puedan divergir. Los casos API registran códigos/cuerpo sanitizado cuando
corresponde; no guardan JWT ni hashes de contraseñas en las observaciones nuevas.
Los componentes usan plantillas reales y servicios controlados para cubrir cargas,
errores y recuperación. Los E2E nuevos atraviesan navegador, API, MongoDB y Redis.
REG-03 utiliza un 503 simulado explícito para probar recuperación de interfaz.

Aceptación funcional: todas las aserciones de cada escenario y ningún fallo
inesperado de ejecución. Accesibilidad automatizada: cero violaciones axe en los
estados examinados. Verificación manual adicional: teclado real, lector de pantalla,
zoom/reflow, comprensión y foco. Axe no verifica todos los requisitos WCAG.

## Condiciones de carga fijadas antes de medir

- API local con MongoDB y Redis locales; libro académico inicial; sin mocks.
- 20 solicitudes de calentamiento no incluidas en estadísticas.
- Modelo cerrado: fases de 1, 5 y 15 usuarios simultáneos, 10 segundos cada una.
- Mezcla aproximada: 2/3 catálogo y 1/3 búsqueda. Think time: 50 ms por usuario.
- Timeout por solicitud: 2 s. Se consume y valida el JSON, no solo la cabecera.
- Aceptación por fase: >=30 solicitudes, p95 <=500 ms y tasa de errores <=1%.
- Muestras originales por solicitud, HTTP/errores de conexión, p50/p95/p99/máximo,
  throughput y duración real. El último request puede extender ligeramente la fase.

Los umbrales son criterios académicos para este entorno, no un SLA contractual.
Este ensayo corto de lectura no prueba resistencia prolongada, capacidad máxima,
escrituras concurrentes, recuperación de fallos ni comportamiento en producción.
Una falla de proceso cuenta como error y obliga a interpretar y repetir; los
requests fallidos no se eliminan de la estadística. Hay una ejecución diagnóstica
preservada donde el proceso API terminó con código Windows 3221226505 durante la
tercera fase. No se atribuye una causa definitiva sin diagnóstico adicional.

## Controles de seguridad

Autenticación obligatoria, JWT manipulado, revocación, autorización por rol,
aislamiento por usuario, rechazo de operador NoSQL, cabeceras, CORS y rate limit.
El entorno E2E usa `NODE_ENV=test` y límite de login 100. SEC-07 inicia el middleware
real con `NODE_ENV=production` en un proceso Jest independiente y valida límite 5.
No confundir esa prueba del middleware con un ataque de carga al login productivo.
Las auditorías de dependencias reportan cadena, severidad y advisories; no equivalen
a explotación confirmada. Persisten riesgos que exigen seguimiento cuando no hay
parche compatible. No se aplican downgrades automáticos sugeridos por audit --force.

## Control de la evidencia

Cada ejecución integral crea carpeta nueva. Registrar escenario, entorno,
timestamp, versión, objetivo, esperado, obtenido, estado y enlace de evidencia.
La comparación de hashes antes/después invalida una ejecución si cambió el código
o el arnés durante ella. Fallos diagnósticos y pruebas no ejecutadas se conservan.
Los resultados de la revisión del equipo se registran con responsable, fecha,
acuerdo/desacuerdo y verificación. La evaluación de IA no se etiqueta como humana.

## Observación sobre el puntaje

El encabezado asigna 20 puntos a cada criterio, pero los máximos de nivel Alto
son 15, 15, 30, 20 y 20; estos sí suman 100. No cambiar ni normalizar la tabla
del profesor. Presentar evidencia para el nivel Alto y solicitarle que confirme
la ponderación. No autoasignarse una calificación ni prometer 100 puntos.
