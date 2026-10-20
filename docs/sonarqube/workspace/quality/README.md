# SonarQube — La Morada

Integración local para F01–F04 (identidad), F13–F16 (citas) y F26–F27 (carrito).
La raíz de análisis es **LaMorada**, que contiene frontend y backend. El archivo
`sonar-project.properties` va allí. Este análisis representa los archivos del
alcance académico; sus porcentajes no describen toda la aplicación.

## Ejecución

Requisitos ya comprobados: Docker Desktop, Node.js 24, Chrome, dependencias del
frontend y backend y SonarScanner for NPM 5.0.0 instalado en frontend. Para otra
copia, instalar las dependencias con `npm ci` dentro de cada paquete que tenga
package-lock.json. No es necesario instalar Java manualmente: el scanner usado
aprovisiona su JRE 21 desde el servidor.

Desde LaMorada, con Docker Desktop abierto:

```powershell
npm run quality
```

El comando inicia el contenedor SonarQube existente `sonarqube`, levanta dos
contenedores exclusivos de pruebas, ejecuta las 3 suites del alcance, unifica
la cobertura, envía el análisis y espera su procesamiento antes de exportar.
El Quality Gate se informa aunque resulte ERROR; una ejecución técnica exitosa
no debe confundirse con la aprobación del Quality Gate.

Pasos individuales, también desde LaMorada:

```powershell
npm run quality:server
npm run quality:infra
npm run quality:test
npm run sonar
npm run sonar:report
```

`npm run sonar` desde frontend también funciona: vuelve automáticamente a la
raíz LaMorada. El scanner 5 instalado usa la API `scan`; el comando antiguo
`sonar` que estaba en package.json no corresponde al binario de esa versión.

Servidor: http://localhost:9000. El proyecto la-morada conserva el ANTES;
la-morada-despues contiene las correcciones. El scanner rechaza la-morada para
proteger la evidencia anterior. Se reutilizó el contenedor existente.
La imagen ejecutada se identificó como
SonarQube Community Build 26.9.0.129388, digest
`sonarqube@sha256:62930c7f510534bb2bf551ca69ad3ee6f8e12b4116d394597c64cefccbb3313b`.
Es una instalación local académica. Para reproducir el servidor desde cero,
utilizar la imagen fijada con persistencia y una base de datos compatible según
la documentación oficial; los scripts actuales esperan tu contenedor existente.

## Token

El scanner y exportador leen `SONAR_TOKEN` del entorno o, en su defecto, el
archivo local `LaMorada/.sonar-token`. Este archivo contiene solo el token y
está excluido de Git. No se inserta el valor en los comandos del scanner, la
configuración ni los informes. El usuario del token necesita Execute Analysis
y Browse en el proyecto. El exportador también consulta hotspots.

## Alcance y atribución

`scope.cjs` enumera los archivos y asigna métodos a las funciones. `classify.cjs`
usa el parser de TypeScript para localizar métodos de JS/TS por sus líneas.
Los controles de búsqueda de productos, edición de cantidad y pago se excluyen
de la atribución mediante marcadores. No se analizan módulos de publicaciones,
podcasts ni pagos. Se incluyen dependencias de las funciones, por ejemplo la
decodificación JWT del login y la consulta de disponibilidad para crear citas.

SonarQube analiza archivos completos: un archivo compartido puede contener
métodos ajenos. El informe los separa, sin borrar ni ocultar sus issues en el
servidor. Un mismo issue de soporte compartido puede aparecer en varias Fxx;
las filas por función no deben sumarse para obtener el total único.

`sonar.javascript.lcov.reportPaths` sirve para JavaScript y TypeScript. Jest
genera cobertura backend y Karma/Jasmine la del frontend; el script normaliza
las rutas relativas a LaMorada. Los archivos sin cobertura no se excluyen para
elevar artificialmente el porcentaje. La cobertura global incluye métodos
ajenos que comparten archivo con el alcance. Las pruebas de caminos cubren
escenarios específicos y usan dobles en las suites de caja blanca.

Las pruebas funcionales realizan limpieza de MongoDB y Redis. Por ello el
runner fuerza MongoDB `127.0.0.1:27028` y Redis `127.0.0.1:6381/0`, contenedores
desechables de `compose.tests.yml`. No utiliza las bases de desarrollo. No
ejecuta seed ni envía correos: MAIL_MODE=console.

## Evidencias

En `quality/reports/`:

- `ISSUES_POR_FUNCIONALIDAD.md`: listado por Fxx con archivo, línea, regla,
  severidad y enlace al issue real.
- `issues-by-feature.json`: clasificación, métricas, Quality Gate y hashes SHA-256.
- `sonarqube-raw.json`: respuestas originales del servidor, sin credenciales.
- `scan-manifest.json`: hashes del código antes del análisis; el exportador
  verifica que el código no haya cambiado antes de atribuir las líneas.
- `backend-tests.json`, `backend-tests.log`, `frontend-tests.log`: pruebas ejecutadas.
- `lcov.info`, `backend/`, `frontend/`: cobertura y resúmenes.
- `scanner.log`: registro de la ejecución completa mediante `npm run quality`.

La primera línea base puede mostrar Quality Gate OK sin condiciones evaluadas;
consultar siempre `gate.conditions` en la evidencia. Un hotspot exige revisión
humana y no equivale a una vulnerabilidad confirmada. Una prueba verde tampoco
equivale al cumplimiento de un requisito: la F02 actual aprueba reproduciendo
la brecha conocida de que el registro guarda patient en lugar de psychologist.

Se corrigieron los hallazgos del alcance sin ampliar las reglas de negocio.
Las 98 pruebas originales siguen pasando. Se añadieron 4 pruebas de plantillas,
ejecutadas separadamente y sin mezclarlas con la cobertura comparativa:

Desde frontend:

~~~powershell
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include=src/app/sonar-regression.spec.ts
~~~

Consultar quality/evidence/COMPARACION_SONARQUBE.md y, en cada repositorio,
docs/sonarqube/COMPARACION.md. Los merges de evidencia usan las ramas
fix/sonarqube-alcance y evidencia/sonarqube-comparacion, sin modificar main.
Los dos repositorios se analizan juntos: elegir JS/TS & Web en el asistente.
La configuración se ubica en LaMorada, junto a frontend/ y backend/, no dentro
de uno solo. La carpeta padre no tiene repositorio Git: una copia de los scripts
y de la configuración queda versionada en frontend/docs/sonarqube/workspace/.
Para una instalación nueva, copiar su contenido a LaMorada y disponer allí de
los dos repositorios con esos nombres. No copiar ni publicar el token.

## Documentación oficial

- [Cobertura JS/TS](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/test-coverage/javascript-typescript-test-coverage)
- [Parámetros del análisis](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui)
- [Consulta de issues](https://docs.sonarsource.com/sonarqube-community-build/user-guide/issues/retrieving)
