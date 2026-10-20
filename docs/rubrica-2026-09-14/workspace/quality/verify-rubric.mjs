import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const token = process.env.SONAR_TOKEN || fs.readFileSync(path.join(root, '.sonar-token'), 'utf8').trim();
const project = process.env.SONAR_PROJECT_KEY || 'la-morada-despues';
const server = process.env.SONAR_HOST_URL || 'http://localhost:9000';
const keys = ['coverage', 'duplicated_lines_density', 'software_quality_maintainability_remediation_effort', 'software_quality_maintainability_rating', 'software_quality_reliability_rating', 'software_quality_security_rating'];
const url = new URL('/api/measures/component', server);
url.searchParams.set('component', project); url.searchParams.set('metricKeys', keys.join(','));
const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error('No se pudieron verificar métricas globales: ' + response.status);
const payload = await response.json();
const values = Object.fromEntries(payload.component.measures.map(m => [m.metric, Number(m.value)]));
for (const key of keys) if (!Number.isFinite(values[key])) throw new Error('Métrica no disponible: ' + key);
const conditions = [
  { metric: 'coverage', value: values.coverage, requirement: '>= 90', passed: values.coverage >= 90 },
  { metric: 'duplicated_lines_density', value: values.duplicated_lines_density, requirement: '<= 2', passed: values.duplicated_lines_density <= 2 },
  { metric: 'software_quality_maintainability_remediation_effort', value: values.software_quality_maintainability_remediation_effort, requirement: '<= 90 min', passed: values.software_quality_maintainability_remediation_effort <= 90 },
  ...keys.filter(k => k.endsWith('_rating')).map(metric => ({ metric, value: values[metric], requirement: 'A = 1', passed: values[metric] === 1 })),
];
const result = { checkedAt: new Date().toISOString(), project, status: conditions.every(c => c.passed) ? 'OK' : 'ERROR', scope: 'Overall code; control adicional, no reemplaza Q10 de código nuevo', conditions };
fs.writeFileSync(path.join(root, 'quality/reports/RUBRICA-GLOBAL.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'OK') process.exit(2);
