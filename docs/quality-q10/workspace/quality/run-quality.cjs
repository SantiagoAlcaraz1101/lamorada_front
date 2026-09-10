const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root } = require('./scope.cjs');
fs.mkdirSync(path.join(root, 'quality/reports'), { recursive: true });
function run(command, args, log) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 600000 });
  const output = (result.stdout || '') + (result.stderr || '');
  // Avoid persisting credentials even if a dependency accidentally logs one.
  const tokenPath = path.join(root, '.sonar-token');
  const token = process.env.SONAR_TOKEN || (fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8').trim() : '');
  const safeOutput = token ? output.replaceAll(token, '[REDACTED]') : output;
  console.log(safeOutput);
  if (log) fs.writeFileSync(path.join(root, 'quality/reports', log), safeOutput);
  if (result.status !== 0) process.exit(result.status || 1);
}
run('docker', ['start', 'sonarqube']);
run('docker', ['compose', '-f', 'quality/compose.tests.yml', 'up', '-d', '--wait']);
run(process.execPath, ['quality/run-tests.cjs'], 'tests.log');
run(process.execPath, ['quality/scan.mjs'], 'scanner.log');
run(process.execPath, ['quality/export-report.mjs'], 'export.log');
run(process.execPath, ['quality/audit-new-code.mjs'], 'q10-audit.log');
const report = JSON.parse(fs.readFileSync(path.join(root, 'quality/reports/issues-by-feature.json'), 'utf8'));
if (report.gate.status !== 'OK') {
  console.error('Q10 no aprobado. Los informes se conservaron; revisar las condiciones antes de integrar a una rama protegida.');
  process.exit(2);
}
