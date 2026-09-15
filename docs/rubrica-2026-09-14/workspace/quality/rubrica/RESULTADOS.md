# Resultados de La Morada para la rúbrica de septiembre

Cierre: 2026-09-15T14:08:29.491Z. **Q10 OK**, cobertura global **95.3 %**, cobertura nueva **98.5 %**. Pasan **193 pruebas backend y 232 frontend**, 425 en total. Se mantienen los mismos **67 archivos** productivos del antes.

| Métrica | Antes | Después |
|---|---:|---:|
| Cobertura global | 79.5% | 95.3% |
| Cobertura nueva Q10 | 78.4% | 98.5% |
| Cobertura de líneas | 81.9% | 99.0% |
| Cobertura de ramas | 74.7% | 88.1% |
| Duplicación global | 0.0% | 0.0% |
| Bugs | 3 | 0 |
| Vulnerabilidades | 0 | 0 |
| Code smells | 5 | 0 |
| Deuda de mantenibilidad | 22 min | 0 min |
| NCLOC | 4944 | 4946 |
| Complejidad ciclomática | 803 | 799 |
| Complejidad cognitiva | 394 | 393 |

Calificaciones: mantenibilidad A→A, fiabilidad C→A, seguridad A→A. No se atribuye una mejora inexistente a la mantenibilidad: ya tenía A; su deuda sí bajó de 22 a 0 minutos. No hay hotspots nuevos; su condición no aparece evaluada, lo cual no equivale a una revisión humana de seguridad.

## Quality Gate y criterios globales

Q10 conserva su referencia PREVIOUS_VERSION del 8 de septiembre y sus umbrales. Se aplica además un control independiente sobre código global: cobertura ≥90 %, duplicación ≤2 %, deuda ≤90 minutos y calificaciones A. `npm run quality` falla si cualquiera de ambos controles falla. No se reducen umbrales ni se oculta código sin cobertura.

| Condición Q10 evaluada | Valor final | Umbral | Estado |
|---|---:|---:|---|
| new_coverage | 98.5 | LT 90 | OK |
| new_duplicated_lines_density | 0.0 | GT 2 | OK |
| new_software_quality_maintainability_remediation_effort | 0 | GT 90 | OK |
| new_violations | 0 | GT 0 | OK |

## Correcciones verificadas

| Issue anterior | Regla | Corrección | Estado final |
|---|---|---|---|
| 1fbb95ae-1aec-4553-9d81-840b029487fb | javascript:S7772 | Importación explícita node:crypto | No presente entre issues abiertos |
| c10eb60b-1a15-4f74-b2f9-468933656785 | javascript:S7780 | Escape literal con String.raw | No presente entre issues abiertos |
| 2b04623c-3794-4904-b7d9-629c1cac1203 | javascript:S7773 | Number.parseInt | No presente entre issues abiertos |
| 5d05c181-0281-40f0-b0f4-f87caa8f751c | Web:InputWithoutLabelCheck | Label e ID asociados en búsqueda y cantidad | No presente entre issues abiertos |
| 2ef51991-53b3-4382-8c27-ae1925642550 | css:S7924 | Gradiente oscuro del botón Buscar | No presente entre issues abiertos |
| e48fec0d-388d-4b1a-8efe-1f93560f75e6 | Web:InputWithoutLabelCheck | Label e ID asociados en búsqueda y cantidad | No presente entre issues abiertos |
| 9e1756e3-1852-4a26-a514-6771a24e8b33 | typescript:S6544 | ngOnInit devuelve void y delega operación asíncrona | No presente entre issues abiertos |
| ea3a4c38-cab9-47e7-b419-09cb340583db | typescript:S3358 | Normalización sin ternario anidado | No presente entre issues abiertos |

Además, CartComponent centraliza retirar/reinsertar: NCLOC 101→95 y complejidad 47→43. La revisión visual detectó que ProductComponent no refrescaba el mensaje de fallo asíncrono; se añadió markForCheck y una prueba de plantilla que verifica el DOM sin otro clic. Es un defecto funcional observado, separado de los ocho issues estáticos.

## Pruebas y métricas manuales

Las pruebas backend se distribuyen en delivery.functional.test.js (10), plan20.functional.test.js (33), plan20.whitebox.test.js (17), whitebox.paths.test.js (37), rubric.unit.test.js (61), quality.regression.test.js (35). El frontend ejecuta siete suites seleccionadas; el registro conserva 232 casos aprobados. No se denominan unitarias puras las suites con MongoDB/Redis real.

- [Plan actualizado 2.1](PLAN_DE_PRUEBAS_2_1.md): alcance y apartados 10–20, manteniendo intacto el DOCX 2.0.
- [AAA, FIRST y cinco dobles](PRUEBAS_AAA_FIRST_DOBLES.md): ejemplos ejecutables y límites.
- [Métricas manuales](METRICAS_MANUALES.md): grafo F20, conteos, acoplamiento, cohesión y aritmética de cobertura.
- [Comparación por archivo](INVENTARIO_POR_ARCHIVO.md): control independiente de los 51 JS/TS en ambas versiones.
- [Revisión manual](REVISION_MANUAL.md): observaciones reales y recorridos aún pendientes de aceptación.

## Qué mostrar al profesor

1. Presentar arquitectura, 67 archivos seleccionados y límites del plan 2.1.
2. Abrir el caso F06 del fake Redis y el caso F25 del DOM para explicar AAA; distinguir los cinco dobles.
3. Recalcular F20: 18 aristas − 14 nodos + 2 = 6 y mostrar sus seis caminos probados.
4. Contrastar NCLOC, complejidad y cobertura antes/después; explicar por qué ramas 88,1 % no es cobertura combinada 95,3 %.
5. Abrir Sonar, mostrar Q10, métricas globales, calificaciones y actividad.
6. Abrir los PR y commits de pruebas/refactorización/evidencia.
7. Declarar brechas funcionales y pendientes de aceptación; no prometer certificación productiva ni una nota específica.

## Evidencia identificada

- Proyecto final: [la-morada-despues](http://localhost:9000/dashboard?id=la-morada-despues).
- Análisis anterior: d474671c-c764-4494-bb86-a8ec64a032d8.
- Análisis final: 9b976abe-66fc-438b-859a-b1178d16d4fd.
- Inicio de pruebas: 2026-09-15T14:06:45.268Z; fin: 2026-09-15T14:07:50.561Z.
- Git anterior frontend: 63114e434cd633b80d507b837e0a28042b13e44c.
- Git anterior backend: 7cb440f76da8e2717d939a10c38185dfd30e4c0c.
- PR y merge del ciclo: consultar MERGES.md cuando se complete la integración.
- antes-sonar.json y despues-sonar.json: respuestas API con IDs de análisis y métricas.
- Q10-AUDIT.json y RUBRICA-GLOBAL.json: definición, denominadores y condiciones.
- test-run.json, casos-backend.json, frontend-tests.txt y lcov.info: ejecución y cobertura.
- inventario-independiente.json: tokens, métodos, dependencias y revisiones comparadas.

La interfaz de Sonar requiere iniciar sesión; no se fabricaron capturas autenticadas. Las instantáneas JSON permiten revisar los números sin publicar el token. El proyecto original la-morada y los informes de ciclos anteriores se conservan.

## Límites que siguen abiertos

F02 conserva la brecha de rol patient; F07 profesional conserva el desacuerdo de specialty; frontend/backend de F17 difieren en longitudes admitidas. El fallo de red del catálogo ya se ve, pero su mensaje de transporte puede aparecer en inglés. Sonar no detecta necesariamente estas diferencias de producto. Los recorridos manuales de aceptación listados como pendientes no se contabilizan como aprobados.
