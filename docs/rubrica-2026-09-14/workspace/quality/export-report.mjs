import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
const require = createRequire(import.meta.url);
const { root, features, sourceFiles } = require('./scope.cjs');
const { classify } = require('./classify.cjs');
const ruleNotes = require('./rule-notes.cjs');
const server = (process.env.SONAR_HOST_URL || 'http://localhost:9000').replace(/\/$/, '');
const tokenFile = path.join(root, '.sonar-token');
const token = process.env.SONAR_TOKEN || (fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '');
if (!token) throw new Error('Missing SONAR_TOKEN or .sonar-token. No results have been fabricated.');
const project = process.env.SONAR_PROJECT_KEY || 'la-morada-despues';
const dir = path.join(root, 'quality/reports');
fs.mkdirSync(dir, { recursive: true });
async function api(endpoint, params = {}) {
  const url = new URL(endpoint, server);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}. Check token Browse/Execute Analysis permissions.`);
  return res.json();
}
async function pages(endpoint, field, params) {
  const values = [];
  for (let p = 1; p <= 100; p++) {
    const result = await api(endpoint, { ...params, p, ps: 100 });
    values.push(...(result[field] || []));
    const total = result.paging?.total ?? result.total;
    if (total === undefined) throw new Error(`Missing pagination total: ${endpoint}`);
    if (values.length >= total) return values;
    if (!(result[field]?.length)) throw new Error(`Incomplete pagination: ${endpoint}`);
  }
  throw new Error(`API result limit exceeded: ${endpoint}`);
}
const taskText = fs.readFileSync(path.join(root, '.scannerwork/report-task.txt'), 'utf8');
const ceTaskId = taskText.match(/^ceTaskId=(.+)$/m)?.[1].trim();
if (!ceTaskId) throw new Error('Missing CE task ID; run the scanner first.');
let task;
let previous;
for (let attempt = 0; attempt < 90; attempt++) {
  ({ task } = await api('/api/ce/task', { id: ceTaskId }));
  if (task.status !== previous) console.log(`SonarQube background task: ${task.status}`);
  previous = task.status;
  if (task.status === 'SUCCESS') break;
  if (['FAILED', 'CANCELED'].includes(task.status)) throw new Error(`Analysis ${task.status}: ${task.errorMessage || ''}`);
  await sleep(2000);
}
if (task.status !== 'SUCCESS') throw new Error('Analysis not completed. Run this exporter again later.');
const metricKeys = 'ncloc,coverage,line_coverage,branch_coverage,lines_to_cover,uncovered_lines,conditions_to_cover,uncovered_conditions,duplicated_lines_density,complexity,cognitive_complexity';
const [issues, hotspots, measures, gate, status, components] = await Promise.all([
  pages('/api/issues/search', 'issues', { componentKeys: project, resolved: false }),
  pages('/api/hotspots/search', 'hotspots', { projectKey: project }),
  api('/api/measures/component', { component: project, metricKeys }),
  api('/api/qualitygates/project_status', { analysisId: task.analysisId }),
  api('/api/system/status'),
  pages('/api/measures/component_tree', 'components', { component: project, metricKeys, qualifiers: 'FIL' }),
]);
function normalize(issue, hotspot = false) {
  const file = typeof issue.component === 'string' ? issue.component.replace(`${project}:`, '') : issue.component?.path;
  const line = issue.line || issue.textRange?.startLine || null;
  return {
    key: issue.key, file, line, ...classify(file || '', line),
    rule: issue.rule || issue.ruleKey, severity: issue.severity || issue.vulnerabilityProbability,
    impacts: issue.impacts || [], type: hotspot ? 'SECURITY_HOTSPOT' : issue.type,
    status: issue.status, message: issue.message, effort: issue.effort || null,
    url: hotspot ? `${server}/security_hotspots?id=${project}&hotspots=${encodeURIComponent(issue.key)}` : `${server}/project/issues?id=${project}&issues=${encodeURIComponent(issue.key)}&open=${encodeURIComponent(issue.key)}`,
  };
}
const normalized = issues.map(i => normalize(i));
const normalizedHotspots = hotspots.map(i => normalize(i, true));
const scoped = normalized.filter(i => i.features.length);
const featureSummary = Object.fromEntries(Object.entries(features).map(([id, name]) => [id, {
  name, direct: scoped.filter(i => i.features.includes(id) && i.relation === 'direct').length,
  shared: scoped.filter(i => i.features.includes(id) && i.relation === 'shared').length,
  hotspots: normalizedHotspots.filter(i => i.features.includes(id)).length,
}]));
const sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'scan-manifest.json'), 'utf8'));
if (JSON.stringify(manifest.sourceHashes) !== JSON.stringify(sourceHashes)) throw new Error('Source changed after scanning: rerun the scanner before exporting.');
const output = {
  generatedAt: new Date().toISOString(), server, project, serverVersion: status.version,
  analysisId: task.analysisId, taskId: ceTaskId, gate: gate.projectStatus, measures: measures.component.measures,
  counts: { totalServerIssues: issues.length, scopeUniqueIssues: scoped.length, testIssues: normalized.filter(i => i.relation === 'test').length, outsideScopeIssues: normalized.filter(i => i.relation === 'outside').length, scopeHotspots: normalizedHotspots.filter(i => i.features.length).length },
  features: featureSummary, issues: normalized, hotspots: normalizedHotspots, components, sourceHashes,
};
fs.writeFileSync(path.join(dir, 'sonarqube-raw.json'), JSON.stringify({ task, issues, hotspots, measures, gate, status, components }, null, 2));
fs.writeFileSync(path.join(dir, 'issues-by-feature.json'), JSON.stringify(output, null, 2));
const esc = s => String(s ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('<', '&lt;');
const metric = name => output.measures.find(m => m.metric === name)?.value ?? 'N/D';
let md = `# La Morada — issues de SonarQube por funcionalidad\n\nFecha: ${output.generatedAt}. SonarQube ${status.version}. Análisis: ${task.analysisId}.\n\n[Panel del proyecto](${server}/dashboard?id=${project}) · [Issues](${server}/project/issues?id=${project})\n\n`;
md += `Quality Gate: **${output.gate.status}**. Cobertura: **${metric('coverage')}%**. Duplicación: **${metric('duplicated_lines_density')}%**. Líneas de código: **${metric('ncloc')}**.\n\n`;
md += `El servidor informa ${issues.length} issues abiertos en los archivos analizados: **${scoped.length} issues únicos de producción dentro del alcance**, ${output.counts.testIssues} en pruebas y ${output.counts.outsideScopeIssues} en métodos o controles ajenos que comparten archivo. Estos últimos se conservan en el JSON de evidencia, pero no se atribuyen a las funciones solicitadas.\n\n`;
if (!output.gate.conditions.length) md += '**Interpretación del Quality Gate:** la API devolvió conditions=[]. El estado OK de esta línea base no significa que se hayan aprobado límites de cobertura ni que no existan issues. No se cambiaron el gate Sonar way ni sus reglas para conseguir un resultado verde.\n\n';
md += `Los contadores por función incluyen código compartido: **no deben sumarse entre sí**. F01 y F02 comparten el registro. Los hotspots requieren revisión humana y no se presentan como vulnerabilidades confirmadas. SonarQube analiza archivos completos; el mapeo a Fxx es una clasificación local por archivo y método, no una etiqueta emitida por SonarQube. Las métricas globales corresponden al conjunto de archivos, no solamente a los métodos.\n\n`;
md += '| Función | Descripción | Issues propios | Issues compartidos | Hotspots |\n|---|---|---:|---:|---:|\n';
for (const [id, row] of Object.entries(featureSummary)) md += `| ${id} | ${row.name} | ${row.direct} | ${row.shared} | ${row.hotspots} |\n`;
md += '\n## Cómo interpretar y priorizar los hallazgos\n\n';
md += 'SonarQube reporta issues por regla y ubicación: un mismo campo puede generar dos reglas de accesibilidad. Un issue no equivale automáticamente a una funcionalidad rota. Las siguientes explicaciones son orientación local; el listado posterior conserva el mensaje original y el enlace de evidencia.\n\n';
md += '| Regla | Issues únicos del alcance | Explicación y siguiente acción |\n|---|---:|---|\n';
const rules = [...new Set(scoped.map(i => i.rule))];
for (const rule of rules) md += `| ${esc(rule)} | ${scoped.filter(i => i.rule === rule).length} | ${esc(ruleNotes[rule.split(':').at(-1)] || 'Revisar la explicación de la regla en el enlace del issue.')} |\n`;
if (output.gate.conditions.length) {
  md += '\n## Condiciones evaluadas del Quality Gate\n\n';
  md += '| Métrica evaluada | Valor | Umbral | Estado |\n|---|---:|---:|---|\n';
  for (const c of output.gate.conditions) md += `| ${c.metricKey} | ${c.actualValue} | ${c.errorThreshold} | ${c.status} |\n`;
  md += '\nEl código nuevo se define respecto a la línea base de cada proyecto en el servidor. Para comparar proyectos diferentes se deben usar las métricas globales y el mismo alcance, no solo los colores del Quality Gate.\n\n';
}
md += '\n## Pruebas existentes y límites de interpretación\n\n';
const tests = JSON.parse(fs.readFileSync(path.join(dir, 'backend-tests.json'), 'utf8'));
const testRun = JSON.parse(fs.readFileSync(path.join(dir, 'test-run.json'), 'utf8'));
const frontendLog = fs.readFileSync(path.join(dir, 'frontend-tests.log'), 'utf8');
const frontendCount = frontendLog.match(/TOTAL: (\d+) SUCCESS/)?.[1] || '?';
md += `Backend: ${tests.numPassedTests}/${tests.numTotalTests} pruebas aprobadas. Frontend: ${testRun.frontend ? `${frontendCount} pruebas aprobadas` : 'falló'}. Se ejecutaron las suites originales, sonar-regression y las suites plan20/quality enumeradas en run-tests.cjs y jest.config.cjs. MongoDB/Redis fueron contenedores desechables separados.\n\n`;
md += '**Brecha funcional documentada F02 (no es un issue de SonarQube):** el registro fuerza role=patient incluso si se solicita psychologist. La prueba de caja negra F-02 aprueba cuando reproduce esa brecha; por eso una suite verde no significa que el registro de psicólogos esté implementado correctamente.\n\n';
for (const [id, name] of Object.entries(features)) {
  const rows = scoped.filter(i => i.features.includes(id));
  md += `## ${id} — ${name}\n\n`;
  if (!rows.length) md += 'SonarQube no reportó issues abiertos atribuibles en este análisis. Esto no demuestra ausencia de defectos funcionales.\n\n';
  else {
    md += '| Severidad | Regla | Ubicación | Hallazgo | Relación | Evidencia |\n|---|---|---|---|---|---|\n';
    for (const i of rows) {
      const local = path.join(root, i.file).replaceAll('\\', '/') + (i.line ? `:${i.line}` : '');
      md += `| ${esc(i.severity)} | ${esc(i.rule)} | [${esc(i.file)}:${i.line ?? 'archivo'}](<${local}>) | ${esc(i.message)} | ${i.relation === 'shared' ? `Compartido: ${i.features.join(', ')}` : 'Propio'}${i.method ? ` · ${esc(i.method)}` : ''} | [Abrir issue](${i.url}) |\n`;
    }
    md += '\n';
  }
  for (const i of normalizedHotspots.filter(i => i.features.includes(id))) md += `- Hotspot ${i.severity}: ${esc(i.message)}. ${i.file}:${i.line}. [Revisar](${i.url}).\n`;
  md += '\n';
}
md += '## Issues en las pruebas (separados de producción)\n\n';
for (const i of normalized.filter(i => i.relation === 'test')) md += `- ${i.file}:${i.line}: ${esc(i.message)}. [Issue](${i.url}).\n`;
md += '\n## Condiciones originales del Quality Gate\n\n```json\n' + JSON.stringify(output.gate, null, 2) + '\n```\n';
fs.writeFileSync(path.join(dir, 'ISSUES_POR_FUNCIONALIDAD.md'), md);
console.log(JSON.stringify({ analysisId: output.analysisId, gate: output.gate.status, counts: output.counts, features: featureSummary }, null, 2));
console.log('Report: quality/reports/ISSUES_POR_FUNCIONALIDAD.md');
