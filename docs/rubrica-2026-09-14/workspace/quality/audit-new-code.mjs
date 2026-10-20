import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { root, sourceFiles } = require('./scope.cjs');
const { classify } = require('./classify.cjs');
const project = 'la-morada-despues';
const token = process.env.SONAR_TOKEN || fs.readFileSync(path.join(root, '.sonar-token'), 'utf8').trim();
const server = process.env.SONAR_HOST_URL || 'http://localhost:9000';
async function api(endpoint, params) {
  const url = new URL(endpoint, server);
  for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
  return response.json();
}
const [definition, association, measures] = await Promise.all([
  api('/api/qualitygates/show', { name: 'Q10' }),
  api('/api/qualitygates/get_by_project', { project }),
  api('/api/measures/component', { component: project, metricKeys: 'new_coverage,new_lines_to_cover,new_uncovered_lines,new_conditions_to_cover,new_uncovered_conditions' }),
]);
if (association.qualityGate.name !== 'Q10') throw new Error('El proyecto ya no tiene Q10 aplicado.');
const rows = [];
for (const file of sourceFiles.filter(name => /\.[jt]s$/.test(name))) {
  const lines = (await api('/api/sources/lines', { key: `${project}:${file}`, from: 1, to: 10000 })).sources;
  for (const line of lines.filter(item => item.isNew)) {
    const lineUnits = line.lineHits === undefined ? 0 : 1;
    const conditions = line.conditions || 0;
    if (!lineUnits && !conditions) continue;
    const covered = (line.lineHits > 0 ? 1 : 0) + (line.coveredConditions || 0);
    rows.push({ file, line: line.line, ...classify(file, line.line), units: lineUnits + conditions, covered });
  }
}
const sum = (list, name) => list.reduce((value, row) => value + row[name], 0);
const outside = rows.filter(row => !row.features.length);
const inScope = rows.filter(row => row.features.length);
const denominator = sum(rows, 'units');
const metric = name => Number(measures.component.measures.find(item => item.metric === name)?.period?.value || 0);
if (denominator !== metric('new_lines_to_cover') + metric('new_conditions_to_cover')) throw new Error('La auditoría no coincide con el denominador oficial de SonarQube.');
const result = {
  generatedAt: new Date().toISOString(), project, definition, association, measures: measures.component.measures,
  denominator, covered: sum(rows, 'covered'),
  inScope: { units: sum(inScope, 'units'), covered: sum(inScope, 'covered') },
  outside: { units: sum(outside, 'units'), covered: sum(outside, 'covered') },
  ceilingWithoutExpandingTests: denominator ? 100 * (sum(inScope, 'units') + sum(outside, 'covered')) / denominator : null,
  uncovered: rows.filter(row => row.covered < row.units),
};
fs.writeFileSync(path.join(root, 'quality/reports/Q10-AUDIT.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ newCoverage: metric('new_coverage'), denominator, inScope: result.inScope, outside: result.outside, ceilingWithoutExpandingTests: result.ceilingWithoutExpandingTests }, null, 2));
