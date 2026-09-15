# Evaluación manual de métricas de La Morada

Fecha de revisión: 14 de septiembre de 2026, America/Bogota. Esta hoja contiene cálculos razonados por inspección del código y una comprobación independiente asistida. No se atribuye su ejecución al profesor ni se sustituye la aprobación del equipo.

## Unidad de comparación

Se comparan los mismos 67 archivos del análisis académico. Antes: frontend `63114e4`, backend `7cb440f`, análisis `d474671c-c764-4494-bb86-a8ec64a032d8`. Después: código y hashes del análisis final indicados en RESULTADOS.md. No se equipara este subconjunto con toda la aplicación.

La evaluación manual profundiza en PostService, UserService, CartComponent y ProductComponent: permisos y persistencia, identidad, estado del carrito y presentación asíncrona. El inventario asistido amplía la comprobación numérica a los 51 archivos JS/TS, incluidos modelos sin sentencias ejecutables. Los otros 16 archivos son plantillas y estilos. La tabla por archivo conserva las diferencias; no se presenta una muestra como si fuera una inspección manual exhaustiva de todos los algoritmos.

## Complejidad ciclomática calculada por inspección

Para un grafo conectado con una entrada y una salida común: V(G) = E − N + 2. En decisiones binarias sin casos especiales también puede calcularse como decisiones + 1. Se modelan los `throw` explícitos como salidas que confluyen; no se añaden aristas por cada posible excepción de MongoDB. Contar esas excepciones implícitas sería otro modelo.

### Ejemplo reproducible F20 updatePost

Archivo backend/src/modules/post/post-service.js. Nodos:

1. Entrada.
2. Buscar publicación.
3. Decidir si existe.
4. Lanzar POST NOT FOUND.
5. Comparar autor.
6. Lanzar ACCESS DENIED.
7. Comprobar título definido.
8. Asignar título.
9. Comprobar contenido definido.
10. Asignar contenido.
11. Comprobar active definido.
12. Asignar active.
13. Guardar y registrar.
14. Salida común.

Aristas: 1→2, 2→3, 3→4, 4→14, 3→5, 5→6, 6→14, 5→7, 7→8, 8→9, 7→9, 9→10, 10→11, 9→11, 11→12, 12→13, 11→13, 13→14.

Hay N=14, E=18 y P=1. Por tanto V=18−14+2=6. Por decisiones: existencia, autor y tres campos opcionales dan 5+1=6. Se conserva antes y después: no se cambió el algoritmo de permisos para conseguir cobertura.

Una base de seis caminos es: inexistente; autor ajeno; propietario sin campos; solo título; solo contenido; solo active. Las pruebas de rubric.unit.test.js ejecutan esos seis casos y además todos los campos simultáneamente. Cobertura de ramas no implica por sí sola cobertura de todas las combinaciones: son criterios diferentes.

### Recuento de PostService completo

| Método | Decisiones explícitas | V antes | V después |
|---|---:|---:|---:|
| createPost | 1 | 2 | 2 |
| getPosts | 0 | 1 | 1 |
| getPostById | 1 | 2 | 2 |
| updatePost | 5 | 6 | 6 |
| deletePost | 2 | 3 | 3 |
| Total del archivo | 9 | 14 | 14 |

SonarQube también informa 14 en ambas ejecuciones. No hay contradicción entre mantener V y mejorar cobertura: cambió la evidencia de ejecución, no el flujo de esos métodos.

### Recuento de la refactorización del carrito

Para comparar con el analizador JS/TS se cuentan además funciones anónimas y operadores de cortocircuito, incluidos `??`. No se suman otra vez los callbacks dentro del V del método padre. El JSON de inventario conserva cada operador y línea para repetir el recuento.

Antes, el grupo `dec` y sus callbacks aporta 9; `onQtyChange` y callbacks aporta 7: total 16. Después, `dec` aporta 5, `onQtyChange` 3 y `replaceQuantity` con callbacks 4: total 12. Los otros métodos permanecen en 31. Archivo completo: 47→43. Sonar coincide.

El protocolo de retirar y reinsertar queda concentrado en un lugar. No se convirtió en operación atómica: si falla la reinserción, el producto puede permanecer retirado. Esa limitación se conserva y se prueba, no se disfraza como transacción segura.

## Líneas de código

NCLOC cuenta líneas con código, no blancos ni líneas que contienen únicamente comentarios. Una llave o un import cuentan; una línea con varias sentencias cuenta una sola vez. No equivale a líneas ejecutables ni a número de pruebas.

PostService tiene 67 líneas según el contador del servidor, de las cuales 48 contienen código. Por inspección: 3 imports, apertura de clase, cinco métodos, cierres y exportación; el inventario enumera las 48 líneas, permitiendo contrastar qué quedó fuera. Las 19 restantes son blancos o comentarios, incluido el tratamiento del salto final del archivo.

| Archivo | NCLOC antes | NCLOC después | Interpretación |
|---|---:|---:|---|
| PostService | 48 | 48 | Las pruebas añadidas no aumentan el código productivo |
| UserService | 92 | 92 | Correcciones de sintaxis y API sin cambio de tamaño |
| CartComponent | 101 | 95 | Seis líneas menos por centralizar el protocolo |
| ProductComponent | 114 | 119 | Cinco líneas netas adicionales por separar expresión e introducir actualización de vista |

Los cuatro valores coinciden con Sonar en cada versión. No se persigue reducir LOC a cualquier costo: la corrección visual agrega código útil.

## Acoplamiento

Se cuenta Ce como número de módulos distintos importados directamente. La lista incluye dependencias externas y propias; es verificable en imports/require. No se llama CBO a este número, porque CBO cuenta clases relacionadas y requeriría otra definición para interfaces, tipos y módulos estáticos.

| Unidad | Dependencias inspeccionadas | Ce antes | Ce después |
|---|---|---:|---:|
| PostService | Post, User, logger | 3 | 3 |
| UserService | User, Cart, validador, hash, logger, crypto, Redis, correo | 8 | 8 |
| CartComponent | Angular core, common, router, CartService | 4 | 4 |
| ProductComponent | Angular core, common, forms, ProductService, CartService, RxJS | 6 | 6 |

ChangeDetectorRef ya pertenece a Angular core, por lo que no aumenta Ce por módulos. Sí aumenta el número de colaboradores inyectados de ProductComponent de 3 a 4; esta diferencia se declara en lugar de ocultarla. Su costo es acoplar la actualización de vista al ciclo de Angular, justificado por el fallo visual reproducido.

UserService es el más acoplado de la muestra: mezcla registro, perfil, directorio, recuperación y eliminación. Los dobles aíslan esas dependencias en pruebas; no reducen el acoplamiento productivo. Una futura separación de recuperación de credenciales sería una decisión arquitectónica adicional, no un resultado de este ciclo.

## Cohesión

Se aplica un juicio semántico explícito y se complementa con relaciones entre métodos. PostService tiene 5/5 operaciones dirigidas a publicaciones y todas dependen de Post: alta cohesión temática. UserService reúne al menos cinco responsabilidades relacionadas con identidad pero con colaboradores distintos: cohesión más débil que PostService, aunque ambas clases obtengan A de mantenibilidad en Sonar.

En CartComponent, `dec` y `onQtyChange` comparten ahora `replaceQuantity`, que concentra la secuencia retirar→añadir y sus fallos. Los helpers de presentación siguen unidos por `isObj` y por el modelo CartLine. ProductComponent continúa gestionando catálogo y agregado al carrito; extraer mensajes o presentación puede considerarse después.

No se publica un LCOM numérico inventado: PostService y UserService son servicios estáticos sin atributos de instancia, por lo que aplicar ingenuamente LCOM de atributos produciría una cifra poco representativa. SonarQube de esta instalación tampoco expone Ce ni LCOM como medidas equivalentes; en la comparación se registran como no disponibles, no como cero.

## Mantenibilidad y complejidad cognitiva

El índice de deuda es una estimación del analizador, no un cronómetro de trabajo. Antes hay cinco code smells con 5+5+2+5+5=22 minutos de deuda de mantenibilidad. Los tres bugs son hallazgos de fiabilidad y no se añaden automáticamente a ese total. Después no quedan smells y la deuda informada es 0. La calificación de mantenibilidad ya era A y sigue A; fiabilidad cambia de C a A.

En ProductComponent.search se separó el ternario anidado de normalización: la complejidad cognitiva del archivo baja 19→18, mientras la ciclomática sigue 24. El primer indicador penaliza anidamiento; el segundo cuenta bifurcaciones. CartComponent pasa de V=47 a 43, pero su complejidad cognitiva permanece 10. No todas las métricas deben disminuir con cada refactorización.

No se calcula Maintainability Index de Halstead sin disponer de sus operandos y operadores bajo una convención acordada. La letra A no equivale a ausencia de brechas funcionales ni a seguridad clínica.

## Cobertura recalculada

Se emplea la fórmula combinada C = 100 × (líneas cubiertas + resultados de condiciones cubiertos) / (líneas a cubrir + resultados de condiciones a cubrir). Los datos proceden de instrumentación Jest/Karma importada por Sonar; la operación aritmética se revisa aquí, sin atribuirle ejecución manual de todas esas líneas.

Antes: líneas cubiertas=1468−265=1203; resultados cubiertos=772−195=577. C=100×1780/2240=79,4643 %, mostrado como 79,5 %.

Después: líneas cubiertas=1467−14=1453; resultados cubiertos=772−92=680. C=100×2133/2239=95,2657 %, mostrado como 95,3 %.

Código nuevo: 530/538×100=98,5130 %, mostrado como 98,5 %. Q10 evalúa esa cobertura nueva. La rúbrica también se verifica contra cobertura global; ambas superan 90 %. No se cambió la fecha de referencia ni se excluyeron los métodos difíciles.

La cobertura de ramas global por separado es 680/772=88,1 %: no se debe presentar como 95,3 % ni afirmar 100 % de caminos. La rúbrica pide cobertura combinada del proyecto, no un 90 % de ramas por archivo.

## Comparación completa y límites

INVENTARIO_POR_ARCHIVO.md compara cada JS/TS con Sonar en ambas ejecuciones. El cálculo AST es un control asistido, separado de los ejemplos razonados anteriores. Sus sumas excluyen HTML/CSS; no se comparan sin aclaración con el total de 67 archivos. Los valores globales se muestran en RESULTADOS.md.

No se inventan eficacia de eliminación de defectos, densidad de defectos reales, DRE, MTBF ni satisfacción de usuarios: faltan un registro completo de defectos y observaciones de producción. Los ocho issues resueltos son hallazgos estáticos, no ocho requisitos corregidos. La revisión funcional tiene su registro propio en REVISION_MANUAL.md.

Fuentes: material docente Clase09 Métricas de Software, diapositivas de complejidad, LOC, acoplamiento y cobertura disponibles en el workspace; [definiciones oficiales de SonarQube](https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition). Se conserva el código y el inventario utilizado para que el profesor pueda reproducir los conteos.
