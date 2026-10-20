// Carga de API real. Modelo cerrado: N usuarios esperan antes de repetir.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const evidence = path.resolve(process.env.EVIDENCE_DIR || path.join(__dirname, 'evidence/local'));
fs.mkdirSync(evidence, { recursive: true });
const base = 'http://localhost:3000';
const durationMs = Number(process.env.LOAD_DURATION_MS || 10000);
const stages = [1, 5, 15];
const records = [];
const criteria = { p95Ms: 500, errorRateMax: 0.01, minRequests: 30, timeoutMs: 2000 };
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)];
async function main() {
  if (!(await fetch(base + '/health', { signal: AbortSignal.timeout(2000) })).ok) throw new Error('API no disponible');
  for (let i = 0; i < 20; i++) await (await fetch(base + '/product/all')).arrayBuffer();
  const startedAt = new Date().toISOString();
  for (const users of stages) {
    const stage = []; const start = performance.now();
    await Promise.all(Array.from({ length: users }, async (_, user) => {
      let i = 0;
      while (performance.now() - start < durationMs) {
        const route = i++ % 3 === 0 ? '/product/?title=Habitos' : '/product/all';
        const at = performance.now(); let status = 0; let valid = false; let error;
        try {
          const res = await fetch(base + route, { signal: AbortSignal.timeout(criteria.timeoutMs) });
          status = res.status; const body = await res.json(); valid = res.ok && body.success === true && Array.isArray(body.products) && body.products.length > 0;
        } catch (e) { error = { name: e.name, message: e.message, cause: e.cause?.code || e.cause?.message }; }
        stage.push({ user, route, status, valid, ms: Number((performance.now() - at).toFixed(3)), error });
        await new Promise(r => setTimeout(r, 50));
      }
    }));
    const elapsed = performance.now() - start; const times = stage.map(r => r.ms); const failures = stage.filter(r => !r.valid).length;
    const result = { id: `PERF-${String(stages.indexOf(users) + 1).padStart(2, '0')}`, users, plannedDurationMs: durationMs, elapsedMs: +elapsed.toFixed(2), thinkTimeMs: 50, requests: stage.length, errors: failures, errorRate: failures / stage.length, throughputRps: +(stage.length * 1000 / elapsed).toFixed(2), p50Ms: percentile(times, .5), p95Ms: percentile(times, .95), p99Ms: percentile(times, .99), maxMs: Math.max(...times), statusCounts: stage.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {}), samples: stage };
    result.passed = result.requests >= criteria.minRequests && result.p95Ms <= criteria.p95Ms && result.errorRate <= criteria.errorRateMax;
    records.push(result); console.log(`${result.id}: ${users} usuarios, ${result.requests} req, p95 ${result.p95Ms} ms, errores ${failures}, ${result.passed ? 'APROBADO' : 'FALLÓ'}`);
  }
  fs.writeFileSync(path.join(evidence, 'performance.json'), JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), conditions: { base, loadModel: 'closed', warmupRequests: 20, criteria, cpus: os.cpus().length, cpu: os.cpus()[0].model, memoryGB: +(os.totalmem() / 1024 ** 3).toFixed(1), node: process.version, platform: os.platform(), database: 'MongoDB local de prueba; 1 libro inicial; sin mocks; catálogo y búsqueda; sin login durante carga' }, stages: records }, null, 2));
  if (records.some(r => !r.passed)) process.exitCode = 1;
}
main().catch(e => { fs.writeFileSync(path.join(evidence, 'performance-error.json'), JSON.stringify({ error: e.message, timestamp: new Date().toISOString() })); console.error(e.message); process.exitCode = 1; });
