# Pruebas unitarias y dobles de prueba

## Qué se ejecuta realmente

Backend utiliza Jest para unidades aisladas y Supertest con MongoDB/Redis desechables para integración. Frontend utiliza Jasmine/Karma y Chrome Headless, con pruebas de componentes, plantillas y contratos HTTP. SonarQube analiza código y consume LCOV; no ejecuta las pruebas por sí mismo.

Las suites con base de datos no se denominan unitarias puras. La cifra total combina niveles; RESULTADOS.md publica los subtotales. Todas las pruebas anteriores se conservan y los casos nuevos tienen nombres vinculados a Fxx o extensiones EX.

## AAA

Arrange prepara los datos y colaboradores; Act invoca el comportamiento real; Assert verifica respuesta, estado, DOM o interacción. En backend/tests/rubric.unit.test.js, el caso F06 con Redis falso tiene las tres fases señaladas. En frontend/src/app/quality.expanded.spec.ts, el caso de error asíncrono del catálogo también las separa y comprueba el DOM real.

Ejemplo F06: preparar usuario válido y almacén vacío; solicitar y consumir un código mediante UserService real; verificar hash almacenado, eliminación del código y rechazo de reutilización. Ejemplo F25: preparar ProductComponent y Subject del transporte; emitir un error después del render; verificar mensaje visible y retirada del indicador de carga sin otro clic.

Los tests tabulados comparten Arrange y Assert, pero cada combinación se ejecuta como caso independiente. Los tests de varios contratos HTTP contienen subciclos AAA; son pruebas de contrato agrupadas, no una única unidad de negocio.

## FIRST con evidencia y límites

| Principio | Aplicación | Evidencia o limitación |
|---|---|---|
| Fast | Unidades backend sin red y transporte frontend interceptado | No se confunde su velocidad con la integración en contenedores |
| Independent | resetAllMocks, restoreAllMocks, TestBed, verificación de peticiones pendientes y limpieza de datos sintéticos | Se preserva y restaura RESET_CODE_TTL en suite nueva; no depende de orden de casos |
| Repeatable | Bases exclusivas, datos sintéticos, of/Subject y fakeAsync en vez de esperas arbitrarias | Las suites completas se ejecutaron más de una vez; fechas de citas futuras siguen siendo una dependencia que hay que mantener |
| Self validating | Assertions sobre resultados y errores; runner falla cuando falla una suite o Q10 | No exige inspeccionar consola para decidir si el caso pasó |
| Timely | Se añadieron caracterizaciones antes de las refactorizaciones; la revisión visual motivó una regresión adicional | No se afirma TDD histórico ni desarrollo de todas las pruebas antes del código original |

## Los cinco tipos de dobles

Se usa la taxonomía Dummy, Stub, Spy, Mock y Fake. No son cinco librerías distintas; una misma herramienta puede desempeñar papeles diferentes. [Fowler explica la distinción entre stubs y mocks](https://martinfowler.com/articles/mocksArentStubs.html).

| Tipo | Ejemplo concreto ejecutable | Qué permite comprobar |
|---|---|---|
| Dummy | CartService vacío en los tests de catálogo de quality.expanded.spec.ts | Satisface el constructor, no participa en la búsqueda; usarlo accidentalmente haría fallar el caso |
| Stub | User.findOne.mockResolvedValue y Post.findById en rubric.unit.test.js | Entrega datos predefinidos de existente, inexistente o autor ajeno |
| Spy | mail.sendPasswordResetEmail y res.status/json | Registra argumentos y número de llamadas para comprobar efectos |
| Mock | Caso F21 de eliminación con expectativa de protocolo preparada y función verify | Exige exactamente una eliminación del ID autorizado; un resultado correcto no basta si la interacción es incorrecta |
| Fake | Map que implementa setEx/get/del en el ciclo F05/F06 | Conserva estado entre operaciones y comprueba que un código consumido no se reutiliza |

El fake Redis no implementa expiración real ni concurrencia. No prueba el TTL del servidor: el caso separado verifica que el servicio solicita 900 o 120 segundos. Las pruebas de integración conservan Redis real. Un spy con respuesta predefinida puede cumplir simultáneamente el papel de stub; se clasifica aquí por su propósito en cada caso.

## Alcance añadido y límites de aceptación

- F05/F06/F08/F09: servicios y controladores backend; transporte frontend donde existe en los archivos analizados. Correo siempre simulado.
- F18–F21: lectura, actualización y eliminación de publicaciones; validaciones de existencia, autoría, payload y errores. No se inventa una pantalla de edición inexistente.
- F10/F11/F12: contratos frontend de AvailabilityService, incluido fallback de días. No se presenta como certificación integral del módulo backend de disponibilidad.
- F25: carga, búsqueda, SSR, respuesta vacía y error visible del catálogo. No incluye crear productos F24.
- F28 y EX02: retiro, vaciado y cantidades; errores de ambas fases de retirar/reinsertar.
- EX01: eliminación propia. El plan 2.0 no le asigna ID; no se renumeran otras funcionalidades para hacerlo encajar.

Persisten diferencias conocidas: F02 guarda patient aunque se solicite psychologist; F07 envía specialty desde la pantalla profesional pero el backend lo rechaza; las reglas de longitud de F17 son distintas en frontend y backend. Se distinguen pruebas de caracterización de requisitos satisfechos. Estos asuntos necesitan decisiones de producto y no desaparecen porque Q10 esté verde.
