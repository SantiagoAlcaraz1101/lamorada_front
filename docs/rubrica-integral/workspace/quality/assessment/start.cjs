const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { root, env } = require('./env.cjs');
const children = [];
const logDir = path.join(__dirname, 'runtime');
fs.mkdirSync(logDir, { recursive: true });
async function main() {
  for (const port of [3000, 4200]) {
    const net = require('node:net');
    await new Promise((resolve, reject) => {
      const s = net.createServer().once('error', () => reject(new Error(`Puerto ${port} ocupado. Detén ese servidor antes de iniciar el entorno aislado.`)));
      s.listen(port, '127.0.0.1', () => s.close(resolve));
    });
  }
  function launch(name, args, cwd) {
    const descriptor = fs.openSync(path.join(logDir, `${name}.log`), 'w');
    const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', descriptor, descriptor] });
    children.push(child);
    child.on('exit', code => {
      fs.closeSync(descriptor);
      fs.appendFileSync(path.join(logDir, 'process-events.jsonl'), JSON.stringify({ name, pid: child.pid, code, exitedAt: new Date().toISOString() }) + '\n');
      if (code && code !== 0) console.error(`${name} terminó con ${code}; consulta runtime/${name}.log`);
    });
    return child;
  }
  await new Promise((resolve, reject) => {
    const seed = launch('seed', [path.join(__dirname, 'seed.cjs')], path.join(root, 'backend'));
    seed.on('exit', code => code === 0 ? resolve() : reject(new Error('No se pudieron crear datos de prueba. Inicia quality:infra.')));
  });
  launch('backend', ['server.js'], path.join(root, 'backend'));
  launch('frontend', ['node_modules/@angular/cli/bin/ng.js', 'serve', '--host=127.0.0.1', '--port=4200'], path.join(root, 'frontend'));
  const urls = ['http://localhost:3000/health', 'http://localhost:4200'];
  for (const url of urls) {
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      try { ready = (await fetch(url, { signal: AbortSignal.timeout(2000) })).ok; } catch {}
      if (!ready) await new Promise(r => setTimeout(r, 1000));
    }
    if (!ready) throw new Error(`No arrancó ${url}; consulta runtime/`);
  }
  fs.writeFileSync(path.join(logDir, 'ready.json'), JSON.stringify({ startedAt: new Date().toISOString(), db: env.DB_NAME, mongo: env.MONGO_URL, redis: env.REDIS_URL, api: urls[0], web: urls[1], pids: children.map(c => c.pid) }, null, 2));
  console.log('Entorno aislado listo: http://localhost:4200 (API :3000). Ctrl+C detiene los servidores.');
}
function stop() { for (const child of children) child.kill(); }
process.on('SIGINT', () => { stop(); process.exit(); });
process.on('SIGTERM', () => { stop(); process.exit(); });
main().catch(e => { console.error(e.message); stop(); process.exitCode = 1; });
