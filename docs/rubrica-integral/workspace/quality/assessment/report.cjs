const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const catalog = require('./catalog.cjs');
const evidence = process.env.EVIDENCE_DIR || JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence/latest.json'))).directory;
const read = name => fs.existsSync(path.join(evidence, name)) ? JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8')) : null;
const rows = [];
function make(id, title, status, actual, links, category) {
  const definition = catalog[id] || { category, objective: title, expected: 'Cumplir las aserciones específicas del caso en el archivo de prueba identificado por la suite.' };
  rows.push({ id, title, ...definition, status, actual, evidence: links });
}
for (const file of fs.readdirSync(evidence).filter(f => f.endsWith('.cy.js.json'))) {
  const result = read(file);
  for (const test of result.tests) {
    const title = test.title.at(-1), id = title.match(/^(\w+-\d+)/)?.[1] || title;
    const attempt = test.attempts?.at(-1); const actual = read(id + '.json');
    const observation = actual?.violations ? `axe ${actual.axeVersion}: ${actual.violations.length} violaciones A/AA; ${actual.passes.length} reglas aprobadas; ${actual.url}. Ver nodos en ${id}.json.` : actual ? JSON.stringify(actual) : null;
    const screenshots = result.screenshots.filter(s => (s.name || path.basename(s.path)).startsWith(id + '-') || path.basename(s.path).includes(' -- ' + id + ' ')).map(s => path.relative(evidence, s.path).replaceAll('\\', '/'));
    make(id, title, test.state, test.state === 'passed' ? (observation || `Todas las aserciones del escenario aprobadas; ${test.duration ?? attempt?.wallClockDuration ?? '?'} ms. Ver fuente y video para los valores verificados.`) : (test.displayError || attempt?.error?.message || 'No completado; consultar log.'), [file, ...(actual ? [id + '.json'] : []), ...screenshots, ...(result.video ? [path.relative(evidence, result.video).replaceAll('\\', '/')] : [])], 'Cypress');
  }
}
const backend = read('backend-regression.json');
let backendIndex = 0;
if (backend) backend.testResults.forEach(suite => suite.assertionResults.forEach((test, n) => {
  make(`BE-${++backendIndex}`, test.fullName, test.status, test.status === 'passed' ? `Aserciones aprobadas (${test.duration} ms).` : test.failureMessages.join('\n'), ['backend-regression.json', 'backend-regression.log', path.relative(evidence, suite.name).replaceAll('\\', '/')], 'Regresión backend / integración o unidad según suite');
}));
const security = read('security-limiter.json');
if (security) security.testResults.forEach(suite => suite.assertionResults.forEach(test => make('SEC-07', test.fullName, test.status, test.status === 'passed' ? '5 respuestas 401 del controlador y sexta 429 con Retry-After > 0; ver aserciones y resultado Jest.' : test.failureMessages.join('\n'), ['security-limiter.json', 'security-limiter.log'], 'Seguridad')));
const components = read('components.json');
if (components) components.cases.forEach((test, n) => {
  const id = test.description.match(/^(COMP-\d+)/)?.[1] || `FE-${n + 1}`;
  make(id, [...test.suite, test.description].join(' > '), test.skipped ? 'pending' : test.success ? 'passed' : 'failed', test.success ? `Aserciones aprobadas (${test.timeMs} ms). Plantilla/servicios bajo dobles cuando la suite los configura.` : test.log.join('\n'), ['components.json', 'components.log'], 'Componentes / regresión frontend');
});
const perf = read('performance.json');
if (perf) perf.stages.forEach(s => make(s.id, `${s.users} usuarios`, s.passed ? 'passed' : 'failed', `${s.requests} solicitudes; p50=${s.p50Ms} ms; p95=${s.p95Ms} ms; p99=${s.p99Ms} ms; errores=${s.errors} (${(s.errorRate * 100).toFixed(2)}%); throughput=${s.throughputRps} req/s.`, ['performance.json', 'performance.log'], 'Rendimiento'));
const katalon = JSON.parse(fs.readFileSync(path.join(__dirname, 'katalon/cases.json')));
katalon.forEach(test => {
  catalog[test.id] = { category: 'E2E Katalon Recorder', objective: test.objective, expected: test.expected };
  make(test.id, test.objective, 'NOT_EXECUTED', test.result, ['../../katalon/LaMorada-Recorder.html', '../../katalon/login.csv', '../../katalon/LEEME.md'], 'E2E Katalon Recorder');
});
const summary = rows.reduce((out, row) => { out[row.status] = (out[row.status] || 0) + 1; return out; }, {});
fs.writeFileSync(path.join(evidence, 'cases.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary, cases: rows }, null, 2));
const clean = s => String(s ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('\r', '');
const md = [`# Resultados — La Morada`, '', `Generado: ${new Date().toISOString()}. Véase manifest.json para fechas, entorno, código y estados reales.`, '', `Estados: ${JSON.stringify(summary)}. Katalon requiere ejecución en la extensión del usuario.`, '', `## Cada prueba`, '', `| ID | Tipo / objetivo | Esperado | Obtenido | Estado | Evidencia |`, `|---|---|---|---|---|---|`, ...rows.map(r => `| ${r.id} | ${clean(r.category)}: ${clean(r.objective)} | ${clean(r.expected)} | ${clean(r.actual)} | ${r.status} | ${r.evidence.map(l => `[${path.basename(l)}](${encodeURI(l)})`).join(', ')} |`)];
fs.writeFileSync(path.join(evidence, 'RESULTADOS.md'), md.join('\n') + '\n');
const esc = s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>La Morada — resultados</title><style>body{font:15px system-ui;margin:32px;color:#221137}h1{color:#5b2394}table{border-collapse:collapse;width:100%}th,td{padding:12px;border:1px solid #ddd;text-align:left;vertical-align:top}th{background:#efe7f7}tr.failed{background:#ffeded}tr.NOT_EXECUTED{background:#fff6dd}small{color:#555}td{overflow-wrap:anywhere}</style><h1>La Morada — evidencias de pruebas</h1><p>${esc(JSON.stringify(summary))}</p><p>Fecha, entorno y hashes: <a href="manifest.json">manifest.json</a>. Evidencia original por caso. Katalon: pendiente de ejecución en Recorder.</p><table><thead><tr><th>ID / categoría</th><th>Objetivo</th><th>Esperado</th><th>Obtenido / estado</th><th>Evidencia</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.status}"><td>${esc(r.id)}<br><small>${esc(r.category)}</small></td><td>${esc(r.objective)}</td><td>${esc(r.expected)}</td><td><strong>${esc(r.status)}</strong><br>${esc(r.actual)}</td><td>${r.evidence.map(l => `<a href="${esc(encodeURI(l))}">${esc(path.basename(l))}</a>`).join('<br>')}</td></tr>`).join('')}</tbody></table></html>`;
fs.writeFileSync(path.join(evidence, 'RESULTADOS.html'), html);
const hashes = {};
function visit(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) visit(file); else if (item.name !== 'evidence-hashes.json') hashes[path.relative(evidence, file).replaceAll('\\', '/')] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } }
visit(evidence); fs.writeFileSync(path.join(evidence, 'evidence-hashes.json'), JSON.stringify(hashes, null, 2));
console.log(`Informe: ${rows.length} casos. ${JSON.stringify(summary)}`);
