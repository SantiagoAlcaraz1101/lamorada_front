const { root, sourceFiles } = require('./scope.cjs');
const common = { rootDir: `${root}/backend`, testEnvironment: 'node' };
module.exports = {
  rootDir: root,
  projects: [
    { ...common, displayName: 'whitebox', testMatch: ['<rootDir>/tests/whitebox.paths.test.js'], setupFilesAfterEnv: [] },
    { ...common, displayName: 'functional', testMatch: ['<rootDir>/tests/delivery.functional.test.js'], setupFilesAfterEnv: ['<rootDir>/tests/setup.js'] },
  ],
  collectCoverage: true,
  collectCoverageFrom: sourceFiles.filter(p => p.startsWith('backend/') && p.endsWith('.js')),
  coverageDirectory: `${root}/quality/reports/backend`,
  coverageReporters: ['lcovonly', 'json-summary', 'text-summary'],
};
