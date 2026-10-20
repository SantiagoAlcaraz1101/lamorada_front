const path = require('node:path');
module.exports = { rootDir: path.resolve(__dirname, '../../backend'), testEnvironment: 'node', testMatch: ['<rootDir>/tests/assessment.security.test.js'], setupFilesAfterEnv: [] };
