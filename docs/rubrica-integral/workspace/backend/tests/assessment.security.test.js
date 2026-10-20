// Este test NO usa setup.js ni bases de datos. Comprueba el limitador real por HTTP.
const express = require('express');
const request = require('supertest');
describe('SEC-07 límite de login en configuración de producción', () => {
  const previous = process.env.NODE_ENV;
  afterAll(() => { process.env.NODE_ENV = previous; });
  test('SEC-07 cinco solicitudes aceptadas y sexta 429 con Retry-After', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { loginLimiter } = require('../src/middlewares/rate-limit-middleware');
    const app = express(); app.post('/auth/login', loginLimiter, (_, res) => res.status(401).json({ success: false }));
    for (let i = 0; i < 5; i++) expect((await request(app).post('/auth/login')).status).toBe(401);
    const limited = await request(app).post('/auth/login');
    expect(limited.status).toBe(429); expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(limited.text).toContain('Demasiados intentos');
  });
});
