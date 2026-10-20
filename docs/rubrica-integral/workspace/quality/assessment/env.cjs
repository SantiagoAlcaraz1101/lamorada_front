const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const env = {
  ...process.env, NODE_ENV: 'test', MAIL_MODE: 'console', NG_CLI_ANALYTICS: 'false',
  MONGO_URL: 'mongodb://127.0.0.1:27028', DB_NAME: 'la_morada_assessment',
  REDIS_URL: 'redis://127.0.0.1:6381/1', PORT: '3000',
  JWT_SECRET_KEY: crypto.randomBytes(32).toString('hex'), JWT_ACCESS_EXPIRES: '3600',
  JWT_ONE_DAY_EXPIRES: '600', CORS_ORIGIN: 'http://localhost:4200',
};
module.exports = { root, env };
