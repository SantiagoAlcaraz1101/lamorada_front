const path = require('node:path');
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    plugins: [require('../frontend/node_modules/karma-jasmine'), require('../frontend/node_modules/karma-chrome-launcher'), require('../frontend/node_modules/karma-coverage')],
    reporters: ['progress', 'coverage'],
    browsers: ['ChromeHeadless'], singleRun: true, restartOnFileChange: false,
    coverageReporter: {
      dir: path.join(__dirname, 'reports/frontend'), subdir: '.',
      reporters: [{ type: 'lcovonly' }, { type: 'json' }, { type: 'json-summary' }, { type: 'text-summary' }],
    },
  });
};
