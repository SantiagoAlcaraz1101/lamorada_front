# Plan de pruebas de La Morada

Versión 2.1. Actualización para la rúbrica de septiembre de 2026. Proyecto académico de bienestar psicológico. Equipo registrado en la versión 2.0: Santiago Alcaraz, Johan Marquez y David Taborda. Destinatario: Ing. Mauricio Ramírez V. Este documento actualiza el alcance, los criterios y las evidencias; no constituye aprobación del docente ni del equipo.

## 1 Introducción

El plan organiza pruebas unitarias, de integración, de interfaz y análisis estático de La Morada. Su finalidad es verificar comportamientos concretos y demostrar las métricas exigidas sin confundir cobertura de código con cumplimiento de requisitos. RESULTADOS.md reúne el cierre medido; METRICAS_MANUALES.md desarrolla los cálculos y REVISION_MANUAL.md registra las observaciones en pantalla.

La fuente anterior es Plan de Pruebas La Morada - 2.0.docx, que se conserva intacta. Allí se enumeran 28 funcionalidades, aunque el texto introductorio dice 30; esta versión toma como autoridad los identificadores F01–F28 de la tabla. Los apartados 10–20 estaban sin desarrollar y 8–9 todavía se referían a cinco funciones. Aquí se completan y se actualizan esas referencias. La copia vigente de este ciclo está en Markdown para que su evolución sea visible en Git; no se afirma haber actualizado el DOCX original.

## 2 Producto y arquitectura

La Morada tiene un frontend Angular y una API Node.js/Express con MongoDB y Redis. Permite registro y sesión, perfiles, disponibilidad, citas, publicaciones y carrito. Existen dos repositorios Git independientes, frontend y backend, bajo la carpeta LaMorada; la configuración conjunta de SonarQube se ejecuta desde esa carpeta padre.

Es un ambiente académico: no se evalúan diagnósticos clínicos, atención de emergencias, videollamadas ni pagos reales. Se utilizan datos sintéticos. Las pruebas de recuperación no envían correo a usuarios reales.

## 3 Base de pruebas

| ID | Fuente | Uso |
|---|---|---|
| BP01 | Plan 2.0 y material docente de plan y métricas | Estructura, nombres de funcionalidades y criterios de evaluación |
| BP02 | Código de las revisiones Git documentadas | Contratos implementados, validaciones, rutas y decisiones |
| BP03 | Pantallas inspeccionadas en el navegador | Etiquetas, mensajes, estados y navegación visibles |
| BP04 | Suites originales y nuevas, con registros de ejecución | Regresión, ejemplos y resultados reproducibles |
| BP05 | Rúbrica suministrada y autorización del usuario de completar lo faltante | Cobertura, calidad y ampliación de métodos compartidos |

Cuando el plan no especifica una regla de negocio, una prueba del contrato actual se identifica como caracterización. Una caracterización que reproduce un defecto no demuestra aceptación funcional.

## 4 Objetivos

Conservar las pruebas previas; ampliar F07/F17 y los métodos compartidos pendientes; aplicar AAA y revisar FIRST; demostrar dummy, stub, spy, mock y fake; alcanzar cobertura global y nueva de al menos 90 %; mantener duplicación hasta 2 % y deuda hasta 90 minutos; comparar las mismas unidades antes y después; registrar los resultados manuales sin inventar ejecuciones.

## 5 Alcance

El análisis estático mantiene exactamente los 67 archivos de la última evaluación. Los archivos sin pruebas no se eliminan del denominador. Las pruebas se amplían a comportamientos que ya estaban dentro de esos archivos, por autorización del usuario. No se incluyen automáticamente todos los módulos de la aplicación.

| Grupo | Identificadores | Nivel y límite |
|---|---|---|
| Identidad y perfil original | F01–F04 y F07 | Unidades, API con persistencia y componentes frontend; brechas conocidas registradas |
| Citas | F13–F16 | Permisos, creación, listado y estados; regresión original conservada |
| Creación de publicación | F17 | Backend funcional y unitario, formulario y transporte frontend |
| Carrito original | F26–F27 | Agregado y consulta persistida |
| Recuperación y directorio | F05–F06, F08–F09 | Métodos existentes de UserService/controladores y contratos frontend; correo simulado |
| Disponibilidad | F10–F12 | Contratos de AvailabilityService frontend; no certificación integral del backend de este módulo |
| Publicaciones ampliadas | F18–F21 | Lectura, consulta por ID y permisos de modificación/eliminación; frontend donde existe método o pantalla |
| Catálogo | F25 | Pantalla de listado y búsqueda; no incluye creación F24 |
| Carrito ampliado | F28 y EX02 | Retirar, vaciar y cambiar cantidad; se conserva el protocolo no atómico existente |
| Cuenta | EX01 | Eliminación propia existente en código; extensión sin Fxx en plan 2.0 |

Quedan fuera pagos, podcasts F22–F23, creación de productos F24, integraciones de correo reales, despliegue y pruebas de producción. El resultado global describe el subconjunto académico, no todo La Morada. La atribución de issues a Fxx se realiza localmente por archivo y método; un issue compartido no debe sumarse varias veces.

## 6 Estrategia

Se combina caja blanca para decisiones, caja negra para respuestas API, pruebas de contrato HTTP y pruebas de plantilla. Primero se preserva la instantánea anterior; después se añaden caracterizaciones, se refactoriza y se repiten las suites. La revisión visual complementa las comprobaciones automáticas. Las métricas manuales se obtienen por inspección y fórmulas; un inventario AST separado sirve como verificación asistida.

## 7 Niveles de prueba

Las unitarias aíslan colaboradores. Las de integración usan Supertest, MongoDB y Redis reales pero desechables. Las de componentes y plantillas ejecutan Angular; HttpTestingController sustituye transporte sin sustituir el servicio probado. Las observaciones en navegador no equivalen a una certificación de aceptación de todos los recorridos.

## 8 Tipos de prueba

Funcionales: respuestas, persistencia, permisos, validaciones y estados. No funcionales: inspección local de mensajes y accesibilidad de controles modificados. Estáticas: SonarQube, revisión manual de flujo y comparación de métricas. Regresión: suites originales más las ampliadas, sin retirar pruebas para mejorar resultados.

No se presenta un análisis estático sin issues como auditoría completa de seguridad, carga, concurrencia, accesibilidad o cumplimiento clínico.

## 9 Técnicas de diseño

Particiones válidas/inválidas, límites de campos, autor propio/ajeno, sesión válida/ausente/revocada, tablas de decisiones y estados. En F20 se deriva una base de seis caminos con V=6 y se ejecutan casos de inexistencia, autor ajeno, campos omitidos y cada campo aislado. En F10 se prueban días reconocidos, fallback y rechazo sin reintento. En F28 se comprueban fallos al retirar y reinsertar. Los cinco dobles y FIRST se documentan con referencias a casos concretos en PRUEBAS_AAA_FIRST_DOBLES.md.

## 10 Entorno

Windows, Node y dependencias fijadas por los lockfiles; Chrome Headless para Karma; Jest para backend; SonarQube local en localhost:9000. El runner prepara MongoDB en 127.0.0.1:27028 y Redis en 127.0.0.1:6381/0 mediante quality/compose.tests.yml. Fuerza NODE_ENV=test, DB_NAME=la_morada_test y correo simulado. No usar bases de desarrollo para suites que limpian datos.

Ejecutar `npm run quality` desde LaMorada. Los scripts y una copia reproducible de la configuración quedan versionados en docs/rubrica-2026-09-14/workspace del frontend. El token se guarda únicamente en .sonar-token o SONAR_TOKEN, excluido de Git.

## 11 Datos

Usuarios, IDs, publicaciones y productos sintéticos; dominios de correo lamorada.test; fechas futuras de citas y control explícito de temporizadores donde corresponde. Se crean fixtures por caso y se limpian los almacenes de integración. Los dobles no deben devolver datos reales ni enviar correo. El fake Redis comprueba consumo del código, no expiración de reloj real.

## 12 Criterios

Entrada: repositorios identificados, instantánea anterior guardada, dependencias instaladas, contenedores exclusivos disponibles y token autorizado. Suspender si las rutas de base de datos apuntan a desarrollo, si hay cambios concurrentes o si faltan fuentes para una regla de negocio.

Salida técnica: todas las pruebas seleccionadas pasan; cobertura global y nueva ≥90 %; duplicación ≤2 %; deuda ≤90 minutos; calificaciones A requeridas verificadas; Q10 OK con condiciones evaluadas. El runner conserva evidencia y devuelve fallo si no cumple Q10 o el control global de la rúbrica.

Aceptación funcional: requiere contrastar cada requisito con su prueba y resolver o aceptar expresamente las brechas. F02 y el guardado profesional de F07 siguen documentados como brechas; el éxito técnico no autoriza declararlos aceptados ni liberar a producción.

## 13 Gestión de defectos

Registrar ID, funcionalidad, fuente, versión, pasos, esperado, observado, severidad, estado, corrección y reejecución. Flujo: detectado→reproducido→corregido→verificado; o pendiente de decisión. Mantener separados issues estáticos y defectos funcionales. Los PR y documentos Git son la herramienta de seguimiento de este ciclo.

El fallo de refresco visual del catálogo se registra como M03 y tiene regresión DOM. Los ocho issues estáticos anteriores se relacionan por clave/regla con sus correcciones en RESULTADOS.md. No se asignan aprobaciones ni cierres a otras personas.

## 14 Riesgos

La calidad de los requisitos es parcial; hay diferencias entre frontend y backend. La medición de Sonar opera por archivo completo. Los dobles no reproducen todos los fallos de red ni condiciones de carrera. El carrito usa retirar y reinsertar, no una transacción. Fechas futuras y versiones de navegador requieren mantenimiento. El servidor Sonar es local y su interfaz exige sesión. Mitigaciones: trazabilidad, instantáneas, integración separada, contraste manual y límites explícitos.

## 15 Organización

Se conservan las responsabilidades de la tabla 5.1 del plan 2.0: Santiago para identidad/F13 y David para F14–F16/F26–F27. La asignación de las ampliaciones y la aprobación final corresponden al equipo; no se inventan responsables individuales. La ejecución asistida y sus registros son revisables por el equipo y el profesor.

## 16 Secuencia de trabajo

Primero preservar evidencia y revisiones; segundo ampliar pruebas; tercero refactorizar y volver a analizar; cuarto contrastar métricas y pantallas; quinto actualizar el plan y documentación; sexto integrar mediante PR en evidencia/sonarqube-comparacion. Las fechas reales se obtienen de test-run.json, análisis de Sonar y merges; no se reemplazan por un cronograma ficticio.

## 17 Métricas y seguimiento

Registrar cobertura combinada, de líneas y de ramas por separado; Q10 y control global; bugs, vulnerabilidades, smells, deuda y calificaciones; duplicación; NCLOC; complejidad ciclomática y cognitiva; acoplamiento y cohesión con definiciones explícitas. Comparar antes/después sobre archivos y versiones identificados. No calcular eficacia de eliminación de defectos o métricas de producción si faltan datos.

## 18 Entregables

Código y pruebas; plan 2.1; guía AAA/FIRST/dobles; evaluación manual y tabla por archivo; registro de revisión en navegador; instantáneas JSON y LCOV; resultados de pruebas; definición de Q10; listado de correcciones; PR y merges; guía de exposición en RESULTADOS.md. Los informes históricos se mantienen sin reescribir.

## 19 Informe final

RESULTADOS.md es el cierre cuantitativo, vinculado al análisis final y a los hashes del código probado. Se diferencia cumplimiento técnico, límites funcionales y verificaciones manuales pendientes. La nota académica depende del profesor; no se garantiza 100/100 por tener el gate verde.

## 20 Gestión del documento

Versión 2.0: fuente DOCX original. Versión 2.1: actualización de alcance, apartados 10–20, AAA/FIRST/dobles, métricas, criterios y evidencias de septiembre. El DOCX original no se modifica. Cualquier cambio posterior debe registrar revisión Git, motivo, pruebas y nuevo análisis cuando afecte código. Aprobación del equipo y del docente: pendiente de revisión, sin firmas atribuidas.
