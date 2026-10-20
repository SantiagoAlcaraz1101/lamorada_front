Esta es la copia versionable. Los logs y el arnés están en `workspace/quality/assessment`; comenzar por [ENTREGA.md](ENTREGA.md) y [el informe](INFORME.md).

# La Morada — rúbrica integral de pruebas

Esta entrega amplía las pruebas existentes. No reemplaza los informes históricos
de SonarQube ni declara ejecutadas pruebas que requieren intervención humana.

## Requisitos y reproducción

Node.js 24, npm, Chrome, Docker Desktop. Backend y frontend requieren `npm ci`
en sus carpetas. Desde `LaMorada/quality/assessment`, ejecutar `npm ci` para
instalar Cypress 16.1.1 y axe-core 4.14.0 fijados en el lockfile.

Desde **LaMorada**, iniciar exclusivamente la infraestructura de pruebas:

```powershell
npm run quality:infra
```

En una primera terminal, desde **LaMorada/quality/assessment**:

```powershell
npm start
```

Espera el mensaje «Entorno aislado listo». En una segunda terminal, en la misma
carpeta:

```powershell
npm test
```

No ejecutar ambas suites E2E a la vez: el sistema mantiene una sesión Redis por
usuario, y logins simultáneos invalidan el token de la sesión previa. Después
de Cypress, importar [la suite Recorder](katalon/LaMorada-Recorder.html) y seguir
[sus instrucciones](katalon/LEEME.md).

`npm test` ejecuta el limitador en configuración de producción, regresión
Jest de backend, todos los componentes/regresiones Jasmine en Chrome, Cypress
con API real y la carga. Usa procesos separados para aislar sus configuraciones.
Salida 0 significa que las etapas automáticas aprobaron y no cambió el código
durante la ejecución. Katalon y la revisión humana tienen su estado propio:
el código 0 no los convierte en aprobados.

## Datos y aislamiento

MongoDB: `127.0.0.1:27028`, base `la_morada_assessment` para E2E y
`la_morada_test` para Jest. Redis: `127.0.0.1:6381/1` para E2E, `/0` para Jest.
No usar las bases de desarrollo, ni cambiar estas URLs para apuntar a datos reales.
Los tests antiguos limpian colecciones de la base `la_morada_test` y Redis `/0`.
El seed nuevo solo prepara usuarios ficticios y el libro QA en assessment.
Correos: `MAIL_MODE=console`; sin envíos. Pagos fuera del recorrido nuevo.

API `http://localhost:3000`; Angular `http://localhost:4200`; Karma `127.0.0.1:9876`.
Se rechaza el arranque si 3000/4200 están ocupados, para no probar otra aplicación.
Contraseña exclusivamente académica: `Morada123!`.
Usuarios: `paciente@lamorada.test` y `psicologa@lamorada.test`.

## Entregables

- [Informe final y estado por criterio](INFORME.md).
- [Plan y criterios de aceptación](PLAN.md).
- [Resultados e interpretación de seguridad y rendimiento](SEGURIDAD_RENDIMIENTO.md).
- [UX, diez heurísticas y análisis de IA](UX_NIELSEN_IA.md).
- [Guía de sustentación por criterio](SUSTENTACION.md).
- `evidence/latest.json`: ubicación de la última ejecución automática.
- `evidence/<fecha>/RESULTADOS.html`, `.md` y `cases.json`: objetivo,
  esperado, obtenido y evidencias de **cada caso**, incluidos estados pendientes.
- Logs originales, JSON de resultados, capturas y videos Cypress.
- `manifest.json`: hashes del código y arnés, versiones, fechas y salidas.
- `evidence-hashes.json`: SHA-256 de las evidencias generadas.
- `evidence/before-valid/`: diagnóstico de accesibilidad previo a las correcciones.
  En esa fase los audits solo recogen hallazgos; no exigen cero violaciones.
- `evidence/2026-10-11T18-01-15-553Z/`: ejecución diagnóstica con fallos;
  se conserva para explicar correcciones de sincronización, configuración y móvil.
- `evidence/before/`: primer intento del arnés fallido por integración axe/Cypress;
  no sirve como resultado de accesibilidad del producto. No se borra ni se oculta.

La carpeta padre LaMorada no es un repositorio Git. `package-delivery.cjs` prepara
una copia versionable del arnés y la documentación en frontend/docs/rubrica-integral,
sin node_modules, runtime, credenciales, ni bases de datos. Las evidencias originales
se mantienen en assessment. Un archivo generado o una prueba preparada no equivale
a ejecución aprobada.

## Ejecuciones por separado

```powershell
npm run test:cypress
npm run test:performance
npm run report
```

Los dos primeros requieren el entorno listo. Para conservar una ejecución parcial
en otra carpeta se puede definir `EVIDENCE_DIR` antes del comando. Cada ejecución
integral usa un directorio nuevo y nunca elimina el histórico. No usar `npm run
quality:test` como sustituto: su directorio histórico y alcance son diferentes.

## Fuentes técnicas

- [Cypress: configuración](https://docs.cypress.io/app/references/configuration).
- [Katalon Recorder: muestras oficiales](https://github.com/katalon-studio/katalon-recorder-samples).
- [axe-core: alcance y API](https://github.com/dequelabs/axe-core).
- [Heurísticas de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/).
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/).
