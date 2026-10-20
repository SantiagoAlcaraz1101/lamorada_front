const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { root, sourceFiles } = require('./scope.cjs');
const token = fs.readFileSync(path.join(root,'.sonar-token'),'utf8').trim();
const report = JSON.parse(fs.readFileSync(path.join(root,'quality/reports/issues-by-feature.json'),'utf8'));
const normalize = s => s.replace(/\r\n/g,'\n').trimEnd();
const repos = {frontend:'lamorada_front',backend:'la-morada-back'};
async function api(route) {
  const r = await fetch('http://localhost:9000/api/'+route,{headers:{Authorization:'Bearer '+token}});
  assert.ok(r.ok, 'Sonar HTTP '+r.status);
  return r;
}
(async()=>{
  let checked = 0;
  for (const pkg of Object.keys(repos)) {
    const cwd = path.join(root,pkg);
    const names = execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd}).toString().split('\0').filter(Boolean);
    for (const name of names) {
      const contents = fs.readFileSync(path.join(cwd,name));
      assert.ok(!contents.includes(Buffer.from(token)), 'Credencial presente; publicación bloqueada');
      assert.ok(!/sq[up]_[a-f0-9]{40}/i.test(contents.toString()), 'Patrón de credencial presente; publicación bloqueada');
    }
  }
  const latest = await (await api('project_analyses/search?project=la-morada-despues&ps=1')).json();
  assert.equal(latest.analyses[0].key,report.analysisId);
  const original = await (await api('project_analyses/search?project=la-morada&ps=1')).json();
  assert.equal(original.analyses[0].key,'3c39d019-b105-47da-84bd-6f450d91125e');
  for (const file of sourceFiles) {
    const sonar = await (await api('sources/raw?key='+encodeURIComponent('la-morada-despues:'+file))).text();
    assert.equal(normalize(fs.readFileSync(path.join(root,file),'utf8')),normalize(sonar),file);
    checked++;
  }
  console.log(JSON.stringify({analysis:report.analysisId,sourcesVerified:checked,secretCheck:'PASS',originalPreserved:true}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
