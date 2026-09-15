import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { scan } from '../frontend/node_modules/@sonar/scan/src/index.js';
const require = createRequire(import.meta.url);
const { root, sourceFiles } = require('./scope.cjs');
const projectKey = process.env.SONAR_PROJECT_KEY || 'la-morada-despues';
if (projectKey === 'la-morada') throw new Error('El proyecto la-morada conserva el ANTES. Use la-morada-despues para no sobrescribirlo.');
process.chdir(root);
const tokenFile = path.join(root, '.sonar-token');
const token = process.env.SONAR_TOKEN || (fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '');
if (!token) throw new Error('Set SONAR_TOKEN or save a new token locally in LaMorada/.sonar-token (ignored by Git).');
const tests = JSON.parse(fs.readFileSync('quality/reports/test-run.json', 'utf8'));
if (!tests.backend || !tests.frontend) throw new Error('Run quality/run-tests.cjs successfully before scanning.');
const sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
if (JSON.stringify(tests.sourceHashes) !== JSON.stringify(sourceHashes)) throw new Error('La cobertura no corresponde al código actual. Ejecutar quality/run-tests.cjs de nuevo.');
if (!tests.testHashes) throw new Error('Falta la evidencia de las pruebas actuales; repetir quality/run-tests.cjs.');
for (const [file, hash] of Object.entries(tests.testHashes)) {
  const current = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  if (current !== hash) throw new Error(`Prueba o configuración modificada: ${file}. Repetir las pruebas antes de analizar.`);
}
fs.writeFileSync('quality/reports/scan-manifest.json', JSON.stringify({ projectKey, startedAt: new Date().toISOString(), sourceHashes }, null, 2));
await scan({ serverUrl: process.env.SONAR_HOST_URL || 'http://localhost:9000', token, options: { 'sonar.projectKey': projectKey, 'sonar.projectBaseDir': root, 'sonar.inclusions': sourceFiles.join(',') } });
