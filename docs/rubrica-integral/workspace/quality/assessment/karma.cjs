const fs = require('node:fs');
const path = require('node:path');
module.exports = function (config) {
  const evidence = path.resolve(process.env.EVIDENCE_DIR || path.join(__dirname, 'evidence/local'));
  const cases = [];
  function EvidenceReporter(baseReporterDecorator) {
    baseReporterDecorator(this);
    this.onSpecComplete = (browser, result) => cases.push({ suite: result.suite, description: result.description, success: result.success, skipped: result.skipped, timeMs: result.time, log: result.log });
    this.onRunComplete = (_, results) => { fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(path.join(evidence, 'components.json'), JSON.stringify({ finishedAt: new Date().toISOString(), results, cases }, null, 2)); };
  }
  EvidenceReporter.$inject = ['baseReporterDecorator'];
  config.set({ port: 9876, hostname: '127.0.0.1', listenAddress: '127.0.0.1' });
  config.set({ frameworks: ['jasmine'], plugins: [require('../../frontend/node_modules/karma-jasmine'), require('../../frontend/node_modules/karma-chrome-launcher'), { 'reporter:evidence': ['type', EvidenceReporter] }], reporters: ['progress', 'evidence'], browsers: ['ChromeHeadless'], singleRun: true, restartOnFileChange: false });
};
