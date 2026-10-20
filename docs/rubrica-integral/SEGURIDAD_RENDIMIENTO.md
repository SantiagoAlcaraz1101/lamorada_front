# Seguridad y rendimiento: resultados e interpretación

Ejecución final: `evidence/2026-10-11T18-21-18-767Z`. Finalizó el 11 de octubre
de 2026 a las 18:23 UTC (13:23, Bogotá). Los hashes de fuentes, pruebas,
dependencias y arnés permanecieron iguales durante la ejecución (`unchanged=true`).
Cada caso tiene objetivo, esperado, obtenido y evidencia en RESULTADOS.html.

## Controles comprobados

| Casos | Objetivo y aceptación | Resultado obtenido / evidencia |
|---|---|---|
| SEC-01/02 | Rechazar acceso sin JWT o con firma manipulada | 401; JSON de observación y api.cy.js.json |
| SEC-03 | Impedir a paciente crear productos | 403; SEC-03.json; SP-06 comprueba además la navegación |
| SEC-04 | Impedir reutilizar JWT después de logout | 401; SEC-04.json |
| SEC-05 | Rechazar un origen CORS no permitido | 403; SEC-05.json. CORS no sustituye autenticación |
| SEC-06 | Separar carritos de dos usuarios | El carrito ajeno permanece vacío; SEC-06.json |
| API-06 | Rechazar email con operador NoSQL | 400; API-06.json |
| API-01 | Verificar health y cabeceras pertinentes | 200, nosniff y ausencia de X-Powered-By; API-01.json |
| SEC-07 | Verificar límite real de login de producción | Cinco respuestas 401 y sexta 429 con Retry-After > 0; security-limiter.json/log |

La suite E2E usa límite de 100 logins en NODE_ENV=test para ejecutar sus escenarios.
SEC-07 prueba el middleware real, configurado como producción, en proceso separado;
no presenta el límite de prueba como si fuera el productivo. Los datos son ficticios.
No se realizaron ataques a servicios de terceros ni pagos/correos externos.

## Dependencias

Auditorías npm guardadas en `evidence/dependency-audit-*.json`. Son una instantánea
del registro de advisories al ejecutar el análisis; no acreditan ausencia universal
de vulnerabilidades ni demuestran explotación en el proyecto.

| Paquete / alcance | Antes | Después |
|---|---|---|
| Backend, árbol completo | 11: 4 moderadas, 6 altas, 1 crítica | 22: 19 moderadas, 3 altas, 0 críticas |
| Frontend, árbol completo | 38: 12 moderadas, 23 altas, 3 críticas | 8 altas, 0 críticas |
| Backend, omitiendo devDependencies | No se capturó baseline comparable | 0 reportadas |
| Frontend, omitiendo devDependencies | No se capturó baseline comparable | 0 reportadas |

Se actualizaron dependencias compatibles y Angular a 20.3.33, CLI/build/SSR a
20.3.39. Los lockfiles fijan las versiones; las suites completas y el build
aprobaron después. El aumento del conteo backend no se oculta: npm propaga avisos
a paquetes dependientes y el conteo de nodos no equivale a fallos explotables
independientes. El criterio no es reducir el número mediante versiones obsoletas.

Pendientes: braces en cadenas de nodemon/Karma; sprintf-js en la cadena Jest;
node-forge en el scanner Sonar. El audit propone, entre otras opciones, bajar a
Jest 25, nodemon 1.14 o Karma 4, y no ofrece arreglo para la cadena Sonar. No se
aplicaron esas sustituciones incompatibles. Revisar una migración mantenida de
herramientas y volver a auditar cuando haya parches; procesar únicamente patrones,
configuraciones y certificados confiables en estas herramientas mientras tanto.
Los árboles y advisories exactos están en los JSON, incluyendo `via` y `fixAvailable`.

Fuentes de los avisos: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
y [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

## Carga definida antes de ejecutar

Node 24.15.0 en Windows, CPU i5-11400H de 12 procesadores lógicos y 15,7 GB RAM;
MongoDB/Redis locales en Docker, un libro inicial de prueba. API real. Se prueban
lecturas de catálogo (aprox. 2/3) y búsqueda (aprox. 1/3), consumiendo y validando
el JSON. Modelo cerrado: 1, 5 y 15 usuarios, 10 s por fase, think time 50 ms por
usuario, 20 requests de calentamiento y timeout de 2 s.

Aceptación por fase: al menos 30 solicitudes, p95 <= 500 ms, errores <= 1%.
Errores incluyen conexión, timeout, HTTP inesperado y contenido inválido.

| Caso / usuarios | Solicitudes | p50 ms | p95 ms | p99 ms | Máximo ms | Errores | req/s | Resultado |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| PERF-01 / 1 | 160 | 3,366 | 4,613 | 6,921 | 7,597 | 0 (0%) | 15,93 | Aprobado |
| PERF-02 / 5 | 800 | 4,183 | 6,964 | 8,261 | 14,133 | 0 (0%) | 79,54 | Aprobado |
| PERF-03 / 15 | 2385 | 7,700 | 11,954 | 14,677 | 19,128 | 0 (0%) | 238,19 | Aprobado |

Evidencia: performance.json conserva condiciones, duración real y cada muestra;
performance.log resume las fases. P95 significa que el 95% de las muestras está
en ese tiempo o por debajo; no garantiza tiempos de todos los usuarios futuros.
El incremento de p95 con concurrencia es observable, pero estas fases cortas
no bastan para encontrar saturación ni capacidad máxima. No hubo error observado
en la ejecución final; esto no demuestra estabilidad prolongada.

## Fallo diagnóstico y prioridades

La ejecución `evidence/2026-10-11T18-01-15-553Z` registró cierre de la API durante
15 usuarios: 2340 errores de 2370 requests. Código Windows 3221226505 (0xc0000409).
El p95 de ese intento no se interpreta como saludable porque las conexiones
fallidas también terminan rápido. Se conservan resultados y logs; la causa del
cierre no se determinó. Se cambió el arnés para escribir logs directamente a
archivo, se reinició y se repitió, además de actualizar dependencias. Las
ejecuciones posteriores aprobaron, sin afirmar que alguno de esos cambios
resolviera por sí solo una causa comprobada.

Prioridades: diagnosticar el cierre nativo si reaparece; prueba de 30–60 minutos
con datos mayores, escrituras y sesiones concurrentes; recopilar CPU/memoria/GC
del servidor y métricas Mongo/Redis; probar recuperación frente a caída de un
servicio; repetir en un entorno parecido al despliegue y fijar umbrales propios.
Estas son mejoras propuestas, no ejecuciones ya realizadas.

## Compilación complementaria

`npm run build` del frontend terminó con código 0. Evidencia: build.log y
build-summary.json dentro de la ejecución final. Advertencias: bundle inicial
562,59 kB frente al presupuesto de 500 kB; CSS de registro, podcast, inicio y
pago supera el presupuesto de aviso de 4 kB. Revisar carga diferida y reglas
CSS repetidas; no se aumentaron los presupuestos para ocultar los avisos.
