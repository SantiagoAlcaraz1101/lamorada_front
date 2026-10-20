import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stage = process.argv[2];
if (!['before', 'after'].includes(stage)) throw new Error('Usar before o after');
const token = fs.readFileSync(path.join(root, '.sonar-token'), 'utf8').trim();
const project = 'la-morada-despues';
async function api(endpoint, params = {}) {
  const url = new URL(endpoint, 'http://localhost:9000');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(endpoint + ': ' + response.status);
  return response.json();
}
const keys = ['ncloc','lines','comment_lines','complexity','cognitive_complexity','coverage','line_coverage','branch_coverage','lines_to_cover','uncovered_lines','conditions_to_cover','uncovered_conditions','duplicated_lines_density','duplicated_lines','bugs','vulnerabilities','code_smells','sqale_index','sqale_rating','sqale_debt_ratio','reliability_rating','security_rating','security_hotspots','security_hotspots_reviewed','software_quality_maintainability_rating','software_quality_maintainability_remediation_effort','software_quality_reliability_rating','software_quality_security_rating','new_coverage','new_duplicated_lines_density','new_software_quality_maintainability_remediation_effort','new_violations'];
const metrics = await api('/api/metrics/search', { ps: 500 });
const available = new Set(metrics.metrics.map(m => m.key));
const metricKeys = keys.filter(key => available.has(key)).join(',');
const [measures, analyses, gate, definition, period] = await Promise.all([
  api('/api/measures/component', { component: project, metricKeys }),
  api('/api/project_analyses/search', { project, ps: 10 }),
  api('/api/qualitygates/project_status', { projectKey: project }),
  api('/api/qualitygates/get_by_project', { project }),
  api('/api/new_code_periods/show', { project }),
]);
const components = [];
for (let p = 1; ; p++) {
  const batch = await api('/api/measures/component_tree', { component: project, metricKeys, qualifiers: 'FIL', ps: 100, p });
  components.push(...batch.components); if (components.length >= batch.paging.total) break;
}
const result = { capturedAt: new Date().toISOString(), project, missingMetricKeys: keys.filter(key => !available.has(key)), measures, analyses, gate, definition, period, components };
const dest = path.join(root, 'quality/evidence/rubrica-2026-09-14', stage);
fs.mkdirSync(dest, { recursive: true });
const file = path.join(dest, 'sonar-full.json');
if (fs.existsSync(file) && stage === 'before') throw new Error('No sobrescribir línea base');
fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ stage, analysis: analyses.analyses[0]?.key, gate: gate.projectStatus.status, measures: measures.component.measures }, null, 2));
