# La Morada Plan 2.0 y Quality Gate Q10

## Resultado y limitación pendiente

Se amplió exclusivamente el alcance solicitado con F07 (actualizar perfil propio) y F17 (crear publicación). Pasan 132 pruebas de backend y 173 de frontend. Se conservan las 98 originales y se incorporan las cuatro pruebas de plantilla anteriores al runner de cobertura.

**Q10 sigue en ERROR por cobertura nueva: 78.4% frente a 90%. No se presenta como aprobado.** No se cambiaron umbrales, exclusiones de cobertura, período de código nuevo ni se marcaron issues como falsos positivos.

| Indicador | Antes de este ciclo | Después |
| --- | ---: | ---: |
| Cobertura sobre los mismos 55 archivos | 46.5% | 79.8% |
| Cobertura global del análisis | 46,5% (55 archivos) | 79.5% (67 archivos) |
| Pruebas backend | 47 | 132 |
| Pruebas frontend del runner | 51 | 173 |
| Issues únicos del alcance | 0 (sin F07/F17) | 0 (incluye F07/F17) |
| Issues totales | 11 | 8 |
| Issues de pruebas | 2 | 0 |

Los 67 archivos conservan todos los 55 anteriores y añaden 12 necesarios para F07/F17. Para una comparación justa se muestra también la intersección de 55 archivos. Los denominadores de ramas pueden variar al instrumentar código antes no ejercitado; se publican numeradores y denominadores en comparacion.json.

## Evaluación real de Q10

| Condición | Valor | Umbral de error | Estado |
| --- | ---: | ---: | --- |
| new_coverage | 78.4 | LT 90 | ERROR |
| new_duplicated_lines_density | 0.0 | GT 2 | OK |
| new_software_quality_maintainability_remediation_effort | 0 | GT 90 | OK |
| new_violations | 0 | GT 0 | OK |

La condición de hotspots nuevos revisados existe en Q10, pero no aparece evaluada porque no hay hotspots nuevos. No equivale a afirmar que se realizó una auditoría de seguridad de producción.

### Por qué no es posible llegar a 90% solo con este alcance

La API de SonarQube informa 513 unidades nuevas de cobertura (líneas ejecutables más resultados de condiciones). 107 pertenecen a métodos o ramas fuera del alcance y solo 3 están ejercitadas incidentalmente. Aunque se cubriera el resto de todas las unidades atribuidas al alcance, la cota por líneas sería 79.73%, menor que 90%.

Los métodos restantes incluyen F19 (consultar publicación por ID), F20 (actualizar publicación), F21 (eliminar publicación), consulta pública independiente y eliminación de cuenta. Sonar mide archivos completos. No se excluyeron estos métodos del cálculo para mejorar el número; solo se separan al atribuir resultados por funcionalidad.

Llegar al 90% requiere autorización para ampliar las pruebas a esos comportamientos, o acordar una reorganización real de responsabilidades del código. No se ejecutó ninguna de esas ampliaciones por cuenta propia. Q10-AUDIT.json conserva la definición del gate, el denominador oficial y las líneas pendientes.

## Evidencia y trazabilidad

- Proyecto: [la-morada-despues](http://localhost:9000/dashboard?id=la-morada-despues).
- Análisis ANTES de este ciclo con Q10: 6cf14d21-535a-4220-8f63-8bd938bc59aa.
- Análisis DESPUÉS: d474671c-c764-4494-bb86-a8ec64a032d8.
- El proyecto original la-morada permanece como evidencia anterior.
- La rama test/q10-f07-f17 se integra mediante PR a evidencia/sonarqube-comparacion en cada fork; main y upstream no se modifican.
- antes.json/despues.json: resultados y hashes del código. casos-backend.json: nombres y estados de todas las pruebas backend. frontend-tests.txt: ejecución real del navegador.
- PLAN_Y_TRAZABILIDAD.md explica cada familia de casos y las diferencias observadas.

## Límites funcionales que no se ocultaron

- F02: registrar solicitando psychologist sigue almacenando patient. La prueba de brecha pasa al reproducirlo, no al cumplir el requisito.
- F07: el formulario del psicólogo envía specialty y el backend lo rechaza. El guardado de campos permitidos funciona en la API para ambos roles; esto no significa que ese recorrido completo de la pantalla del psicólogo esté resuelto.
- F07: la pantalla exige contraseña y confirmación para guardar; la API permite cambios parciales sin contraseña. Se prueban ambos contratos existentes.
- F17: la pantalla limita título a 160 caracteres y exige contenido de al menos 10; la API solo valida presencia y tipo. Se documenta la diferencia sin inventar un requisito de negocio no especificado.

## Reproducir

La configuración vigente está versionada en frontend/docs/quality-q10/workspace/. Copiar su contenido a la carpeta padre LaMorada que contiene los repositorios frontend y backend, sin copiar credenciales. Desde LaMorada ejecutar npm run quality. Consultar workspace/quality/README.md para dependencias y servidor.

El runner usa exclusivamente MongoDB/Redis de pruebas en puertos 27028/6381, datos sintéticos y correo simulado. Verifica que la cobertura corresponda al código actual. Conserva informes y devuelve código 2 cuando Q10 no aprueba; no está diseñado para saltarse un gate en una rama protegida.

Los enlaces localhost solo funcionan en el equipo del estudiante. Los informes de GitHub permiten revisar la evidencia sin exponer el servidor ni su token.
