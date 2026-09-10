# Base de pruebas y trazabilidad del ciclo Q10

Fuente: Plan de Pruebas La Morada - 2.0.docx, apartado 2.4. SHA-256: e60c9d1deffcd73ea55726e657591ea4365ce3344eb49cbfba91dfef00b50c5a.
Se leyó el documento sin editarlo. La sección 2.4 define F-07 Actualizar el perfil propio y F-17 Crear publicación. Las secciones 5.1, 8 y 9 todavía describen una selección anterior; la ampliación de este ciclo procede de la solicitud expresa del usuario.

BP02 (código), BP03 (interfaz) y BP04 (pruebas existentes) permiten concretar contratos donde el plan no especifica valores. No se añadieron reglas de negocio por inferencia.

| Función y nivel | Familias de casos | Comprobaciones |
| --- | --- | --- |
| F07 API / persistencia | F07-BB01 a BB07 | Ambos roles, campos permitidos, contraseña cifrada, perfil ajeno, sesión, particiones inválidas, edades 5/110 y límites 4/111 |
| F07 caja blanca backend | F07-B-P1 a P6 | Usuario inexistente, campos protegidos, validación, actualización parcial, hash y fallo al guardar |
| F07 frontend | F07-F-P1 a P12, F07-UI | Identidad, validación de formulario y contraseñas, carga, guardado, estados de espera, errores, SSR y plantilla real |
| F07 HTTP frontend | Casos F07 en quality.http.spec.ts | PUT con ID extraído del JWT, cabecera, propagación de error y NO_ID_IN_TOKEN |
| F17 API / persistencia | F17-BB01 a BB04 | Rol profesional, autor desde sesión, campos y active, persistencia y refresco tras crear |
| F17 caja blanca backend | F17-B-P0 a P3, F17-B-V | Error de refresco, autor inexistente/no profesional, valor active predeterminado, fallo de guardado y validación |
| F17 frontend | F17-F-P1 a P12, F17-F-V, F17-UI | Límites 160/161 y 9/10, borradores, éxito, errores 401/403/404/500, atajo, identidad, vista previa y formulario real |
| F17 HTTP frontend | Casos F17 en quality.http.spec.ts | POST /post/create, fallback solo ante 404/405, rechazo 403 y refresco de lista |
| Regresión de alcance anterior | quality.regression.test.js, quality.http.spec.ts, quality.ui.spec.ts | Sesión y TTL 599/600, permisos, validadores, contratos de citas/carrito y disponibilidad usada por F13 |

Las familias parametrizadas son casos independientes; el detalle exacto y su resultado están en los registros. No se afirma cobertura exhaustiva de todos los caminos posibles ni se equiparan mocks de transporte con una prueba E2E.

## Pruebas de brechas separadas del cumplimiento

F07-GAP01 en backend y frontend reproduce el contrato incompatible de specialty. F17-GAP01 reproduce la diferencia de longitudes entre pantalla y API. Estos casos verdes indican reproducción consistente de la diferencia, no aceptación del requisito. La brecha F02 anterior se mantiene explícita.

## Alcance de dependencias

F17 usa PostEditorComponent y PostApiService: NO se añadió PostService del frontend porque no es el servicio que utiliza esa pantalla. getPosts/getAllRawAuth se ejercitan solo como dependencia del refresco después de crear, no como certificación independiente de F18. No se prueban edición/eliminación de publicaciones, eliminación de cuenta, recuperación de contraseña ni pagos.

El código compartido se analiza completo, sin exclusiones de cobertura añadidas. scope.cjs atribuye hallazgos por archivo y método. La validación positiva de post_id no es parte del POST de creación, que solo pasa title/content/active al validador; esa rama queda fuera de F17.

## Cambios de producción

Solo correcciones equivalentes de mantenibilidad/accesibilidad: Set de campos permitidos conservando exactamente sus elementos, comprobación opcional del rol existente, readonly, interfaces OnInit/OnDestroy y contraste de botones. No se añadieron campos permitidos ni permisos nuevos.
