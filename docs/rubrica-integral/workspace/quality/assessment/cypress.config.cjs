const { defineConfig } = require('cypress');
const fs = require('node:fs');
const path = require('node:path');
const evidence = path.resolve(process.env.EVIDENCE_DIR || path.join(__dirname, 'evidence/local'));
fs.mkdirSync(evidence, { recursive: true });
module.exports = defineConfig({
  video: true, screenshotOnRunFailure: true, retries: 0,
  viewportWidth: 1280, viewportHeight: 800, defaultCommandTimeout: 10000,
  screenshotsFolder: path.join(evidence, 'screenshots'), videosFolder: path.join(evidence, 'videos'),
  expose: { api: 'http://localhost:3000', phase: process.env.ASSESSMENT_PHASE || 'after' },
  e2e: {
    baseUrl: 'http://localhost:4200', specPattern: 'cypress/e2e/**/*.cy.js', supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      on('task', {
        evidence({ name, data }) { fs.writeFileSync(path.join(evidence, name.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.json'), JSON.stringify(data, null, 2)); return null; },
      });
      on('after:spec', (spec, result) => {
        if (result) fs.writeFileSync(path.join(evidence, spec.name + '.json'), JSON.stringify({ spec: spec.relative, stats: result.stats, tests: result.tests, screenshots: result.screenshots, video: result.video }, null, 2));
      });
      return config;
    },
  },
});
