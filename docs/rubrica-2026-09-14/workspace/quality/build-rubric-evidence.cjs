const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { root, sourceFiles } = require('./scope.cjs');
const evidence = path.join(root, 'quality/evidence/rubrica-2026-09-14');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const before = read('quality/evidence/rubrica-2026-09-14/before/sonar-full.json');
const after = read('quality/evidence/rubrica-2026-09-14/after/sonar-full.json');
const report = read('quality/reports/issues-by-feature.json');
const oldReport = read('quality/evidence/rubrica-2026-09-14/before/reports/issues-by-feature.json');
const tests = read('quality/reports/backend-tests.json');
const testRun = read('quality/reports/test-run.json');
const audit = read('quality/reports/Q10-AUDIT.json');
const globalGate = read('quality/reports/RUBRICA-GLOBAL.json');
const inventory = read('quality/evidence/rubrica-2026-09-14/inventario-independiente.json');
const frontLog = fs.readFileSync(path.join(root, 'quality/reports/frontend-tests.log'), 'utf8');
const frontCount = Number(frontLog.match(/TOTAL: (\d+) SUCCESS/)?.[1]);
const metric = (snapshot, key) => snapshot.measures.component.measures.find(m => m.metric === key)?.value ?? snapshot.measures.component.measures.find(m => m.metric === key)?.period?.value ?? 'N/D';
assert.equal(report.analysisId, after.analyses.analyses[0].key);
assert.equal(report.gate.status, 'OK'); assert.equal(globalGate.status, 'OK');
assert.ok(testRun.backend && testRun.frontend && frontCount > 0);
assert.equal(tests.numFailedTests, 0);
assert.deepEqual(Object.keys(oldReport.sourceHashes).sort(), [...sourceFiles].sort());
for (const [file, hash] of Object.entries(report.sourceHashes)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), hash, 'Código cambiado: ' + file);
}
const rows = [
  ['Cobertura global', 'coverage', '%'], ['Cobertura nueva Q10', 'new_coverage', '%'],
  ['Cobertura de líneas', 'line_coverage', '%'], ['Cobertura de ramas', 'branch_coverage', '%'],
  ['Duplicación global', 'duplicated_lines_density', '%'], ['Bugs', 'bugs', ''], ['Vulnerabilidades', 'vulnerabilities', ''],
  ['Code smells', 'code_smells', ''], ['Deuda de mantenibilidad', 'software_quality_maintainability_remediation_effort', ' min'],
  ['NCLOC', 'ncloc', ''], ['Complejidad ciclomática', 'complexity', ''], ['Complejidad cognitiva', 'cognitive_complexity', ''],
];
let md = '# Resultados de La Morada para la rúbrica de septiembre\n\n';
md += `Cierre: ${report.generatedAt}. **Q10 OK**, cobertura global **${metric(after,'coverage')} %**, cobertura nueva **${metric(after,'new_coverage')} %**. Pasan **${tests.numPassedTests} pruebas backend y ${frontCount} frontend**, ${tests.numPassedTests + frontCount} en total. Se mantienen los mismos **67 archivos** productivos del antes.\n\n`;
md += '| Métrica | Antes | Después |\n|---|---:|---:|\n';
for (const [label,key,unit] of rows) md += `| ${label} | ${metric(before,key)}${unit} | ${metric(after,key)}${unit} |\n`;
md += '\nCalificaciones: mantenibilidad A→A, fiabilidad C→A, seguridad A→A. No se atribuye una mejora inexistente a la mantenibilidad: ya tenía A; su deuda sí bajó de 22 a 0 minutos. No hay hotspots nuevos; su condición no aparece evaluada, lo cual no equivale a una revisión humana de seguridad.\n\n';
md += '## Quality Gate y criterios globales\n\nQ10 conserva su referencia PREVIOUS_VERSION del 8 de septiembre y sus umbrales. Se aplica además un control independiente sobre código global: cobertura ≥90 %, duplicación ≤2 %, deuda ≤90 minutos y calificaciones A. `npm run quality` falla si cualquiera de ambos controles falla. No se reducen umbrales ni se oculta código sin cobertura.\n\n';
md += '| Condición Q10 evaluada | Valor final | Umbral | Estado |\n|---|---:|---:|---|\n';
for (const c of report.gate.conditions) md += `| ${c.metricKey} | ${c.actualValue} | ${c.comparator} ${c.errorThreshold} | ${c.status} |\n`;
md += '\n## Correcciones verificadas\n\n';
md += '| Issue anterior | Regla | Corrección | Estado final |\n|---|---|---|---|\n';
const changes = {
  'javascript:S7772':'Importación explícita node:crypto', 'javascript:S7780':'Escape literal con String.raw', 'javascript:S7773':'Number.parseInt',
  'Web:InputWithoutLabelCheck':'Label e ID asociados en búsqueda y cantidad', 'css:S7924':'Gradiente oscuro del botón Buscar',
  'typescript:S6544':'ngOnInit devuelve void y delega operación asíncrona', 'typescript:S3358':'Normalización sin ternario anidado',
};
for (const issue of oldReport.issues) md += `| ${issue.key} | ${issue.rule} | ${changes[issue.rule] || 'Consultar diff'} | ${report.issues.some(i => i.key === issue.key) ? 'Pendiente' : 'No presente entre issues abiertos'} |\n`;
md += '\nAdemás, CartComponent centraliza retirar/reinsertar: NCLOC 101→95 y complejidad 47→43. La revisión visual detectó que ProductComponent no refrescaba el mensaje de fallo asíncrono; se añadió markForCheck y una prueba de plantilla que verifica el DOM sin otro clic. Es un defecto funcional observado, separado de los ocho issues estáticos.\n\n';
md += '## Pruebas y métricas manuales\n\n';
md += `Las pruebas backend se distribuyen en ${tests.testResults.map(s => `${path.basename(s.name)} (${s.assertionResults.length})`).join(', ')}. El frontend ejecuta siete suites seleccionadas; el registro conserva ${frontCount} casos aprobados. No se denominan unitarias puras las suites con MongoDB/Redis real.\n\n`;
md += '- [Plan actualizado 2.1](PLAN_DE_PRUEBAS_2_1.md): alcance y apartados 10–20, manteniendo intacto el DOCX 2.0.\n- [AAA, FIRST y cinco dobles](PRUEBAS_AAA_FIRST_DOBLES.md): ejemplos ejecutables y límites.\n- [Métricas manuales](METRICAS_MANUALES.md): grafo F20, conteos, acoplamiento, cohesión y aritmética de cobertura.\n- [Comparación por archivo](INVENTARIO_POR_ARCHIVO.md): control independiente de los 51 JS/TS en ambas versiones.\n- [Revisión manual](REVISION_MANUAL.md): observaciones reales y recorridos aún pendientes de aceptación.\n\n';
md += '## Qué mostrar al profesor\n\n1. Presentar arquitectura, 67 archivos seleccionados y límites del plan 2.1.\n2. Abrir el caso F06 del fake Redis y el caso F25 del DOM para explicar AAA; distinguir los cinco dobles.\n3. Recalcular F20: 18 aristas − 14 nodos + 2 = 6 y mostrar sus seis caminos probados.\n4. Contrastar NCLOC, complejidad y cobertura antes/después; explicar por qué ramas 88,1 % no es cobertura combinada 95,3 %.\n5. Abrir Sonar, mostrar Q10, métricas globales, calificaciones y actividad.\n6. Abrir los PR y commits de pruebas/refactorización/evidencia.\n7. Declarar brechas funcionales y pendientes de aceptación; no prometer certificación productiva ni una nota específica.\n\n';
md += '## Evidencia identificada\n\n';
md += `- Proyecto final: [la-morada-despues](http://localhost:9000/dashboard?id=la-morada-despues).\n- Análisis anterior: ${before.analyses.analyses[0].key}.\n- Análisis final: ${report.analysisId}.\n- Inicio de pruebas: ${testRun.startedAt}; fin: ${testRun.finishedAt}.\n- Git anterior frontend: 63114e434cd633b80d507b837e0a28042b13e44c.\n- Git anterior backend: 7cb440f76da8e2717d939a10c38185dfd30e4c0c.\n- PR y merge del ciclo: consultar MERGES.md cuando se complete la integración.\n- antes-sonar.json y despues-sonar.json: respuestas API con IDs de análisis y métricas.\n- Q10-AUDIT.json y RUBRICA-GLOBAL.json: definición, denominadores y condiciones.\n- test-run.json, casos-backend.json, frontend-tests.txt y lcov.info: ejecución y cobertura.\n- inventario-independiente.json: tokens, métodos, dependencias y revisiones comparadas.\n\n`;
md += 'La interfaz de Sonar requiere iniciar sesión; no se fabricaron capturas autenticadas. Las instantáneas JSON permiten revisar los números sin publicar el token. El proyecto original la-morada y los informes de ciclos anteriores se conservan.\n\n';
md += '## Límites que siguen abiertos\n\nF02 conserva la brecha de rol patient; F07 profesional conserva el desacuerdo de specialty; frontend/backend de F17 difieren en longitudes admitidas. El fallo de red del catálogo ya se ve, pero su mensaje de transporte puede aparecer en inglés. Sonar no detecta necesariamente estas diferencias de producto. Los recorridos manuales de aceptación listados como pendientes no se contabilizan como aprobados.\n';
let table = '# Comparación independiente por archivo\n\nEste inventario es un cálculo asistido sobre código Git anterior y código final, no una ejecución manual de cada algoritmo. La revisión razonada está en METRICAS_MANUALES.md. Se incluyen los 51 JS/TS; los 16 HTML/CSS permanecen dentro del análisis Sonar global. V incluye funciones, callbacks, decisiones y cortocircuitos, también a nivel superior.\n\n| Archivo | LOC local antes/después | LOC Sonar antes/después | V local antes/después | V Sonar antes/después | Ce antes/después |\n|---|---:|---:|---:|---:|---:|\n';
for (let i = 0; i < inventory.before.length; i++) {
  const b = inventory.before[i], a = inventory.after[i];
  const cm = (s,key) => Number(s.components.find(c=>c.path===b.file)?.measures.find(m=>m.metric===key)?.value || 0);
  assert.equal(b.nclocLocal, cm(before,'ncloc'), b.file); assert.equal(a.nclocLocal,cm(after,'ncloc'),a.file);
  assert.equal(b.complexityLocal,cm(before,'complexity'),b.file); assert.equal(a.complexityLocal,cm(after,'complexity'),a.file);
  table += `| ${b.file} | ${b.nclocLocal}/${a.nclocLocal} | ${cm(before,'ncloc')}/${cm(after,'ncloc')} | ${b.complexityLocal}/${a.complexityLocal} | ${cm(before,'complexity')}/${cm(after,'complexity')} | ${b.ce}/${a.ce} |\n`;
}
table += '\nLos recuentos coinciden en este corpus. Esa coincidencia no convierte Ce en una métrica nativa de Sonar ni garantiza que el contador local soporte todos los lenguajes o construcciones posibles. Sonar cuenta también complejidad de código incrustado en plantillas; por eso no se compara la suma JS/TS con todo el proyecto sin separar esos archivos.\n';
const cases = tests.testResults.map(s => ({ file: 'backend/tests/' + path.basename(s.name), cases: s.assertionResults.map(t=>({name:t.fullName,status:t.status,durationMs:t.duration})) }));
const clean = text => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'');
fs.writeFileSync(path.join(root,'quality/rubrica/RESULTADOS.md'),md);
fs.writeFileSync(path.join(root,'quality/rubrica/INVENTARIO_POR_ARCHIVO.md'),table);
fs.cpSync(path.join(root,'quality/reports'),path.join(evidence,'after/reports'),{recursive:true});
for (const pkg of ['frontend','backend']) {
  const dest = path.join(root,pkg,'docs/rubrica-2026-09-14'); fs.mkdirSync(dest,{recursive:true});
  for (const name of fs.readdirSync(path.join(root,'quality/rubrica'))) fs.copyFileSync(path.join(root,'quality/rubrica',name),path.join(dest,name));
  for (const [name, data] of [['antes-sonar.json',before],['despues-sonar.json',after],['Q10-AUDIT.json',audit],['RUBRICA-GLOBAL.json',globalGate],['test-run.json',testRun],['casos-backend.json',cases],['inventario-independiente.json',inventory],['issues-finales.json',report],['issues-anteriores.json',oldReport]]) fs.writeFileSync(path.join(dest,name),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(dest,'frontend-tests.txt'),clean(frontLog));
  fs.copyFileSync(path.join(root,'quality/reports/lcov.info'),path.join(dest,'lcov.info'));
  fs.copyFileSync(path.join(evidence,'before/revisions.json'),path.join(dest,'revisions-antes.json'));
  fs.cpSync(path.join(evidence,'manual'),path.join(dest,'manual'),{recursive:true});
}
const workspace = path.join(root,'frontend/docs/rubrica-2026-09-14/workspace'); fs.mkdirSync(path.join(workspace,'quality'),{recursive:true});
for (const name of ['package.json','.gitignore','sonar-project.properties']) fs.copyFileSync(path.join(root,name),path.join(workspace,name));
for (const name of fs.readdirSync(path.join(root,'quality'))) if (/\.(cjs|mjs|yml|md)$/.test(name)) fs.copyFileSync(path.join(root,'quality',name),path.join(workspace,'quality',name));
fs.cpSync(path.join(root,'quality/rubrica'),path.join(workspace,'quality/rubrica'),{recursive:true});
console.log(JSON.stringify({analysis:report.analysisId,tests:tests.numPassedTests+frontCount,coverage:metric(after,'coverage'),newCoverage:metric(after,'new_coverage'),files:sourceFiles.length,jsTsCompared:inventory.after.length},null,2));
