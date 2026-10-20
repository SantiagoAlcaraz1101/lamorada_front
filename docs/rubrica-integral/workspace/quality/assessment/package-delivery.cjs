const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./env.cjs');
const destination = path.join(root, 'frontend/docs/rubrica-integral');
fs.mkdirSync(destination, { recursive: true });
for (const name of ['README.md', 'PLAN.md', 'SUSTENTACION.md', 'UX_NIELSEN_IA.md', 'SEGURIDAD_RENDIMIENTO.md']) {
  if (fs.existsSync(path.join(__dirname, name))) fs.copyFileSync(path.join(__dirname, name), path.join(destination, name));
}
const harness = path.join(destination, 'workspace/quality/assessment');
fs.mkdirSync(harness, { recursive: true });
for (const item of fs.readdirSync(__dirname, { withFileTypes: true })) {
  if (['node_modules', 'runtime', 'evidence'].includes(item.name)) continue;
  fs.cpSync(path.join(__dirname, item.name), path.join(harness, item.name), { recursive: true });
}
for (const name of ['jest.config.cjs', 'scope.cjs', 'compose.tests.yml']) fs.copyFileSync(path.join(__dirname, '..', name), path.join(destination, 'workspace/quality', name));
fs.copyFileSync(path.join(root, 'package.json'), path.join(destination, 'workspace/package.json'));
const latest = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence/latest.json'))).directory;
for (const folder of [latest, path.join(__dirname, 'evidence/before-valid')]) fs.cpSync(folder, path.join(harness, 'evidence', path.basename(folder)), { recursive: true });
for (const file of fs.readdirSync(path.join(__dirname, 'evidence')).filter(f => f.startsWith('dependency-audit-') && f.endsWith('.json'))) fs.copyFileSync(path.join(__dirname, 'evidence', file), path.join(harness, 'evidence', file));
fs.writeFileSync(path.join(harness, 'evidence/latest.json'), JSON.stringify({ directory: latest, relativeDirectory: path.basename(latest) }, null, 2));
fs.cpSync(path.join(__dirname, 'katalon'), path.join(destination, 'katalon'), { recursive: true });
for (const file of ['backend/tests/assessment.security.test.js', 'frontend/src/app/assessment.components.spec.ts']) {
  const target = path.join(destination, 'workspace', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(root, file), target);
}
fs.writeFileSync(path.join(destination, 'ENTREGA.md'), `# Entrega versionable\n\nArnés: workspace/quality/assessment. Copia workspace a la raíz LaMorada junto a\nfrontend y backend; instala npm ci en los tres paquetes, inicia Docker y sigue\nel README del arnés. Conserva las fuentes y pruebas de ambos repositorios.\n\nEjecución final: [RESULTADOS.html](workspace/quality/assessment/evidence/${path.basename(latest)}/RESULTADOS.html).\nEvidencia original: ${latest}.\n\nNo se incluyen node_modules, runtime, secretos ni bases. Los estados Katalon y\nrevisión humana siguen pendientes hasta registrar sus evidencias reales.\n`);
console.log(destination);
