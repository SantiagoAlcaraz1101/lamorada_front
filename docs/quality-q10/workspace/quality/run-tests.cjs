const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const { root, sourceFiles } = require('./scope.cjs');
const reportDir = path.join(root, 'quality/reports');
fs.mkdirSync(reportDir, { recursive: true });
const env = {
  ...process.env, NODE_ENV: 'test', MAIL_MODE: 'console', NG_CLI_ANALYTICS: 'false',
  // Fixed disposable test containers, never the application databases.
  MONGO_URL: 'mongodb://127.0.0.1:27028', DB_NAME: 'la_morada_test', REDIS_URL: 'redis://127.0.0.1:6381/0',
  JWT_SECRET_KEY: require('node:crypto').randomBytes(32).toString('hex'),
};
function run(label, cwd, args) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout: 240000, maxBuffer: 20 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(reportDir, `${label}.log`), output);
  console.log(output);
  if (result.error) console.error(result.error.message);
  return result.status === 0;
}
const startedAt = new Date().toISOString();
const hashSources = () => Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const sourceHashes = hashSources();
const testFiles = [
  'backend/tests/whitebox.paths.test.js', 'backend/tests/delivery.functional.test.js',
  'backend/tests/plan20.whitebox.test.js', 'backend/tests/plan20.functional.test.js',
  'backend/tests/quality.regression.test.js', 'backend/tests/setup.js',
  'frontend/src/app/delivery.paths.spec.ts', 'frontend/src/app/sonar-regression.spec.ts',
  'frontend/src/app/plan20.profile.spec.ts', 'frontend/src/app/plan20.post.spec.ts',
  'frontend/src/app/quality.http.spec.ts', 'frontend/src/app/quality.ui.spec.ts',
  'quality/run-tests.cjs', 'quality/jest.config.cjs', 'quality/karma.conf.cjs', 'quality/scope.cjs',
];
const hashTests = () => Object.fromEntries(testFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const testHashes = hashTests();
const backend = run('backend-tests', `${root}/backend`, ['node_modules/jest/bin/jest.js', '--config', '../quality/jest.config.cjs', '--runInBand', '--json', '--outputFile', '../quality/reports/backend-tests.json']);
const frontend = run('frontend-tests', `${root}/frontend`, ['node_modules/@angular/cli/bin/ng.js', 'test', '--watch=false', '--browsers=ChromeHeadless', '--include=src/app/delivery.paths.spec.ts', '--include=src/app/sonar-regression.spec.ts', '--include=src/app/plan20.*.spec.ts', '--include=src/app/quality.*.spec.ts', '--code-coverage', '--karma-config=../quality/karma.conf.cjs']);
if (JSON.stringify(sourceHashes) !== JSON.stringify(hashSources())) throw new Error('El código cambió durante las pruebas; repetir antes de analizar.');
if (JSON.stringify(testHashes) !== JSON.stringify(hashTests())) throw new Error('Las pruebas o su configuración cambiaron durante la ejecución; repetir.');
fs.writeFileSync(path.join(reportDir, 'test-run.json'), JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), backend, frontend, sourceHashes, testHashes }, null, 2));
if (!backend || !frontend) process.exit(1);
const allowed = new Set(sourceFiles);
const records = [];
for (const pkg of ['backend', 'frontend']) {
  const lcov = fs.readFileSync(path.join(reportDir, pkg, 'lcov.info'), 'utf8');
  for (const block of lcov.split('end_of_record')) {
    const match = block.match(/^SF:(.+)$/m);
    if (!match) continue;
    let source = match[1].trim().replaceAll('\\', '/');
    if (path.isAbsolute(source)) source = path.relative(root, source).replaceAll('\\', '/');
    else if (!source.startsWith(`${pkg}/`)) source = `${pkg}/${source.replace(/^\.\//, '')}`;
    if (!allowed.has(source)) continue;
    records.push(block.trim().replace(/^SF:.+$/m, `SF:${source}`) + '\nend_of_record');
  }
}
if (!records.length) throw new Error('No in-scope LCOV records were generated');
fs.writeFileSync(path.join(reportDir, 'lcov.info'), records.join('\n') + '\n');
console.log(`LCOV ready: ${records.length} in-scope files. Files without tests remain uncovered in SonarQube.`);
