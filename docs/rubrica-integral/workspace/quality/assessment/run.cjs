const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { root, env } = require('./env.cjs');
const evidence = path.join(__dirname, 'evidence', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(evidence, { recursive: true });
const runEnv = { ...env, EVIDENCE_DIR: evidence };
const stages = [];
function run(name, cwd, args, timeout = 300000) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, args, { cwd, env: runEnv, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(path.join(evidence, name + '.log'), (result.stdout || '') + (result.stderr || '') + (result.error ? result.error.message : ''));
  stages.push({ name, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status, error: result.error?.message });
  console.log(`${name}: ${result.status === 0 ? 'APROBADO' : 'FALLÓ'} (ver ${name}.log)`);
}
function hashes(dir, prefix = '') {
  let out = {};
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'evidence', 'runtime', 'docs', 'dist', '.angular'].includes(item.name)) continue;
    const file = path.join(dir, item.name), key = prefix + item.name;
    if (item.isDirectory()) Object.assign(out, hashes(file, key + '/'));
    else if (/\.(js|cjs|ts|html|css|json|groovy|tc|rs|prj)$/.test(item.name)) out[key] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  return out;
}
async function main() {
  for (const url of ['http://localhost:3000/health', 'http://localhost:4200']) if (!(await fetch(url, { signal: AbortSignal.timeout(3000) })).ok) throw new Error(`Inicia npm start en assessment antes de probar: ${url}`);
  const readyPath = path.join(__dirname, 'runtime/ready.json');
  if (!fs.existsSync(readyPath) || JSON.parse(fs.readFileSync(readyPath)).db !== env.DB_NAME) throw new Error('Falta manifiesto del entorno aislado. Inicia npm start.');
  const snapshot = () => ({ frontend: hashes(path.join(root, 'frontend/src')), backend: hashes(path.join(root, 'backend/src')), backendTests: hashes(path.join(root, 'backend/tests')), harness: hashes(__dirname), dependencies: Object.fromEntries(['frontend/package.json', 'frontend/package-lock.json', 'backend/package.json', 'backend/package-lock.json', 'quality/jest.config.cjs', 'quality/scope.cjs'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) });
  const before = snapshot();
  run('security-limiter', path.join(root, 'backend'), ['node_modules/jest/bin/jest.js', '--config', '../quality/assessment/jest.security.cjs', '--runInBand', '--json', '--outputFile', path.join(evidence, 'security-limiter.json')]);
  run('backend-regression', path.join(root, 'backend'), ['node_modules/jest/bin/jest.js', '--config', '../quality/jest.config.cjs', '--runInBand', '--coverage=false', '--json', '--outputFile', path.join(evidence, 'backend-regression.json')]);
  run('components', path.join(root, 'frontend'), ['node_modules/@angular/cli/bin/ng.js', 'test', '--watch=false', '--browsers=ChromeHeadless', '--karma-config=../quality/assessment/karma.cjs']);
  run('cypress', __dirname, ['node_modules/cypress/bin/cypress', 'run', '--browser', 'chrome'], 600000);
  run('performance', __dirname, ['performance.cjs'], 120000);
  const after = snapshot();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  const manifest = { finishedAt: new Date().toISOString(), versions: { node: process.version, cypress: require('./node_modules/cypress/package.json').version, axe: require('./node_modules/axe-core/package.json').version, angular: require(path.join(root, 'frontend/node_modules/@angular/core/package.json')).version }, environment: JSON.parse(fs.readFileSync(readyPath)), stages, unchanged, hashes: before, katalon: { tool: 'Katalon Recorder (extensión Chrome)', status: 'NOT_EXECUTED', reason: 'Chrome y su extensión no están conectados al control de navegador de esta sesión. Suite HTML y CSV preparados para importación. No se sustituye por resultados de Cypress.' } };
  fs.writeFileSync(path.join(evidence, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(__dirname, 'evidence/latest.json'), JSON.stringify({ directory: evidence }, null, 2));
  run('report', __dirname, ['report.cjs']);
  console.log(`Evidencia: ${evidence}`);
  if (!unchanged || stages.some(s => s.exitCode !== 0)) process.exitCode = 1;
}
main().catch(e => { console.error(e.message); fs.writeFileSync(path.join(evidence, 'execution-error.json'), JSON.stringify({ error: e.message, timestamp: new Date().toISOString() })); process.exitCode = 1; });
