# La Morada: entrega de validación y verificación

La ejecución integral del 11 de octubre de 2026 aprobó **518 pruebas automáticas
y 3 fases de carga**: 209 pruebas backend, 268 frontend, 40 Cypress y 1 prueba
aislada del limitador de seguridad. El código no cambió durante la ejecución.
El build frontend también aprobó, con avisos de tamaño documentados.

Abrir [resultados por prueba](workspace/quality/assessment/evidence/2026-10-11T18-21-18-767Z/RESULTADOS.html):
cada fila contiene objetivo, resultado esperado, obtenido y enlaces de evidencia.
Los 8 casos Katalon aparecen como NO EJECUTADOS, separados de los 521 resultados
aprobados (518 pruebas + 3 fases). La revisión humana UX sigue pendiente.

## Cómo demostrar cada criterio

| Criterio | Demostración ante el profesor |
|---|---|
| 1. Regresión, API y componentes | Mostrar API-09 (cantidad 2, total 130000 COP) y API-10 (cantidad negativa, 400 sin cambiar el carrito), REG-03 (503 y recuperación), COMP-07 (la carga HTTP permanece visible). Abrir código, resultado y evidencia; repetir npm test. |
| 2. Seguridad y rendimiento | Mostrar SEC-01–07 y sus 401/403/429, el aislamiento de usuarios y las tres fases de carga. Comparar p95/errores con los umbrales, explicar condiciones y limitaciones y mostrar mejoras propuestas. |
| 3. UX, Nielsen, IA, interfaz y accesibilidad | Mostrar las diez filas Nielsen con severidad, before/after, correcciones y auditorías axe. UI-01 mide ancho móvil 360/360 sin desbordamiento. Completar el contraste propio del equipo y su evidencia de teclado/lector/zoom. |
| 4. Screenplay | Mostrar Actor, habilidad, tareas, interacciones y preguntas; ejecutar SP-04 con carrito real y SP-02/SP-05/SP-06 como alternativas. Abrir sus videos y aserciones. |
| 5. Katalon Recorder | Importar la suite de 8 casos, agregar login.csv y ejecutar Play Suite en la extensión de Chrome. Mostrar Log/Reports, capturas y ambas filas CSV; repetir para comprobar estabilidad. Registrar resultados reales. |

La explicación detallada y el orden de exposición están en
[SUSTENTACION.md](SUSTENTACION.md). Consulta también [PLAN.md](PLAN.md),
[UX_NIELSEN_IA.md](UX_NIELSEN_IA.md), [seguridad y rendimiento](SEGURIDAD_RENDIMIENTO.md)
y [ejecución de Recorder](katalon/LEEME.md).

## Correcciones y límites

Se corrigieron nombres accesibles de botones y marca, contraste, idioma,
autocomplete, foco y salto al contenido, moneda del catálogo, desbordamiento
móvil, carga y error inicial del carrito, y respuesta honesta del formulario de
suscripción. Las correcciones se comprobaron mediante pruebas nuevas y regresión.

Las suites históricas incluyen caracterización de comportamientos existentes;
por ejemplo BE-2 documenta que el registro solicitado como psychologist termina
como patient. Que esa aserción apruebe confirma el comportamiento registrado,
sin decidir si satisface el requisito de negocio. El informe no acredita cobertura
total ni convierte todos los casos históricos en pruebas de aceptación del producto.

Quedan recomendaciones UX (deshacer, ayuda, páginas de términos/privacidad),
vulnerabilidades en herramientas de desarrollo y pruebas prolongadas de carga.
Las auditorías actuales omitiendo dependencias de desarrollo reportan cero
vulnerabilidades conocidas; el detalle y las limitaciones están documentados.

Para completar la evidencia solicitada por la rúbrica faltan la ejecución real
de Katalon Recorder y el acta humana de contraste IA/equipo, con la revisión manual
de accesibilidad. Chrome y la extensión no están conectados a esta sesión, por
lo que su resultado no se inventa. No se asigna puntaje: lo determina el profesor.

La tabla original es inconsistente: los encabezados dicen 20 por criterio,
pero los máximos Alto son 15/15/30/20/20. Estos últimos suman 100; confirmar
la ponderación con el profesor sin modificarla por cuenta propia.
