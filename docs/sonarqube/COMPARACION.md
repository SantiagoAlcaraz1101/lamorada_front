# La Morada — evidencia antes y después de SonarQube

Fecha: 8 de septiembre de 2026. Análisis conjunto del frontend Angular/TypeScript y backend Node.js/JavaScript.

## Resultado comprobado

| Indicador | Antes | Después |
| --- | ---: | ---: |
| Hallazgos únicos de producción del alcance | 93 | 0 |
| Bugs del alcance | 14 | 0 |
| Code smells del alcance | 79 | 0 |
| Hallazgos totales del servidor | 104 | 11 |
| Hallazgos en pruebas | 2 | 2 |
| Hallazgos en métodos ajenos al alcance | 9 | 9 |
| Cobertura global de los archivos analizados | 46.8% | 46.5% |
| Duplicación de líneas | 0.0% | 0.0% |
| Pruebas originales aprobadas | 98 | 98 |

Se corrigieron 93 hallazgos; NO se afirma que toda la aplicación esté libre de problemas. La cobertura bajó 0,3 puntos porcentuales: se conservaron las suites y archivos de cobertura, pero cambió la estructura instrumentada. No se excluyeron archivos sin pruebas para elevar el porcentaje.

## Funcionalidades

| Código | Funcionalidad | Antes: directos | Antes: compartidos | Después: total asociado |
| --- | --- | ---: | ---: | ---: |
| F01 | Registro de pacientes | 0 | 36 | 0 |
| F02 | Registro de psicólogos | 0 | 36 | 0 |
| F03 | Inicio de sesión | 16 | 9 | 0 |
| F04 | Cierre de sesión | 6 | 7 | 0 |
| F13 | Crear cita | 5 | 14 | 0 |
| F14 | Listar citas del usuario autenticado | 0 | 14 | 0 |
| F15 | Actualizar estado de cita autorizada | 1 | 14 | 0 |
| F16 | Cancelar cita autorizada | 0 | 14 | 0 |
| F26 | Agregar producto al carrito | 2 | 5 | 0 |
| F27 | Consultar carrito persistido | 9 | 5 | 0 |

Los compartidos se atribuyen a varias funcionalidades: NO sumar las filas. El total único es 93. La clasificación usa archivo y método; los 9 hallazgos ajenos permanecen visibles en SonarQube.

## Análisis reales y comparación equivalente

- [ANTES: la-morada](http://localhost:9000/dashboard?id=la-morada). Análisis: 3c39d019-b105-47da-84bd-6f450d91125e.
- [DESPUÉS: la-morada-despues](http://localhost:9000/dashboard?id=la-morada-despues). Análisis: dc21c2e0-1f47-4c8f-ba9b-02b283ead1e8.
- Mismos 55 archivos de producción y 3 archivos de pruebas analizados, mismo servidor 26.9.0.129388, mismos perfiles Sonar way JS, TS, HTML y CSS. Ver verificacion.json.
- Las 4 pruebas adicionales de renderizado se ejecutan aparte: etiquetas de login/registro, carrito lleno/vacío y vistas de citas por rol. Pasan las cuatro y no se mezclaron con la cobertura comparativa.
- Los hashes SHA-256 en antes.json/despues.json vinculan los datos a cada archivo. Se verificó que el código anterior coincide con Git, normalizando solo LF/CRLF.

Quality Gate: antes ERROR, después OK. No son puertas comparables sobre el mismo código nuevo: el proyecto nuevo tiene un historial independiente. En el análisis final solo se evaluaron new_violations y new_duplicated_lines_density; no se evaluó new_coverage. El OK NO acredita 80% de cobertura. Las condiciones completas están en los JSON.

## Correcciones y merges

Frontend: etiquetas asociadas a campos, contraste de botones morados, semántica de tabla, interfaces OnInit, dependencias readonly, eliminación de APIs obsoletas y migración de las plantillas de citas/carrito a @if/@for. Backend: simplificaciones equivalentes de validación y JWT, eliminación explícita de la contraseña de la respuesta de login y conjunto de estados permitidos de citas.

Los cambios se proponen mediante PR desde fix/sonarqube-alcance hacia evidencia/sonarqube-comparacion en cada fork del estudiante. Se utiliza merge commit (dos padres), no squash. main y los repositorios upstream no se modifican.

- frontend: [commit ANTES](https://github.com/SantiagoAlcaraz1101/lamorada_front/commit/faed5bb2f8d41f1f6891e31e915240995a2de6ab), [rama de evidencia](https://github.com/SantiagoAlcaraz1101/lamorada_front/tree/evidencia/sonarqube-comparacion).
- backend: [commit ANTES](https://github.com/SantiagoAlcaraz1101/la-morada-back/commit/40db2d3a738b28dc4f205e43ea5d2056d6290f5b), [rama de evidencia](https://github.com/SantiagoAlcaraz1101/la-morada-back/tree/evidencia/sonarqube-comparacion).

Los commits de línea base separan las pruebas y dependencias que ya existían localmente de las correcciones realizadas ahora. El diff del PR muestra únicamente las correcciones y su documentación.

## Cómo mostrarlo al profesor

1. Abrir los dos PR y mostrar el estado Merged, Files changed y el commit de merge.
2. Abrir el proyecto ANTES: Overview e Issues. Mostrar los 104 totales y la atribución de 93 al alcance.
3. Abrir el proyecto DESPUÉS: Overview e Issues. Mostrar los 11 restantes y por qué corresponden a pruebas o métodos ajenos.
4. Consultar esta tabla por Fxx y los archivos antes.json/despues.json para el detalle de regla, archivo y línea.
5. Explicar las pruebas, la cobertura real y la brecha F02.

Los enlaces localhost funcionan en el equipo donde corre SonarQube; no abren el servidor del estudiante desde el computador del profesor. Para evaluación remota usar los informes versionados en GitHub o compartir pantalla. No se publicó el servidor en Internet.

## Límite funcional importante

F02 sigue registrando patient en lugar de psychologist. La prueba actual reproduce ese defecto y por eso puede pasar sin cumplir el requisito. Cero issues de SonarQube no significa que el requisito esté implementado; no se habilitó autoasignación de rol profesional para ocultar esta brecha.

## Configuración y reproducción

La opción del asistente es JS/TS & Web. La raíz de análisis es LaMorada/, que contiene frontend/ y backend/ como repositorios independientes. sonar-project.properties y quality/ van en esa carpeta padre.

En el repositorio frontend se conserva una copia de la configuración y scripts en docs/sonarqube/workspace/. Para otra instalación, disponer ambos repositorios como frontend/ y backend/ dentro de LaMorada y copiar el contenido de workspace/ a esa carpeta padre. Consultar workspace/quality/README.md para requisitos, instalación de dependencias, contenedor SonarQube existente y token local.

Desde LaMorada ejecutar npm run quality. El runner usa bases MongoDB/Redis desechables en puertos 27028/6381; no ejecuta la limpieza contra las bases de desarrollo. El scanner protege el proyecto ANTES. No versionar el token ni pegarlo en las propiedades.
