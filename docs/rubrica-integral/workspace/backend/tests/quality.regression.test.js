// Regresión de dependencias del alcance: validación, sesión y permisos.
process.env.JWT_ONE_DAY_EXPIRES = '600';
jest.mock('../src/modules/auth/strategies/jwt-strategy', () => ({ verifyToken: jest.fn(), generateToken: jest.fn() }));
jest.mock('../src/config/redis-config', () => ({ get: jest.fn(), ttl: jest.fn() }));
jest.mock('argon2', () => ({ verify: jest.fn(), hash: jest.fn(), argon2id: 2 }));
const Jwt = require('../src/modules/auth/strategies/jwt-strategy');
const redis = require('../src/config/redis-config');
const argon2 = require('argon2');
const AuthValidator = require('../src/modules/auth/validators/auth-validator');
const Password = require('../src/modules/auth/strategies/password-strategy');
const { validToken } = require('../src/middlewares/jwt-middleware');
const { authorizeRoles } = require('../src/middlewares/role-middleware');
const { validateUser } = require('../src/modules/user/validators/user-validator');
beforeEach(() => jest.resetAllMocks());

describe('F03 - decisiones de validación de credenciales', () => {
  test.each([
    ['', 'Morada123!', 'MISSING CREDENTIALS'], ['a@lamorada.test', '', 'MISSING CREDENTIALS'],
    ['invalido', 'Morada123!', 'INVALID EMAIL'], ['a@lamorada.test', 'debil', 'INVALID PASSWORD'],
  ])('F03-V1 %s / %s rechaza con %s', (email, password, reason) => {
    expect(() => AuthValidator.validateLogin(email, password)).toThrow(reason);
  });
  test('F03-V2 acepta credenciales válidas', () => {
    expect(AuthValidator.validateLogin('a@lamorada.test', 'Morada123!')).toBe(true);
  });
  test.each([true, false])('F03-V3 verificación de contraseña %s', async matches => {
    argon2.verify.mockResolvedValue(matches);
    if (matches) await expect(AuthValidator.validatePassword('hash', 'plain')).resolves.toBe(true);
    else await expect(AuthValidator.validatePassword('hash', 'plain')).rejects.toThrow('WRONG PASSWORD');
  });
  test('F03-V4 roles permitidos y prohibidos', () => {
    expect(AuthValidator.validateRole('patient', ['patient', 'psychologist'])).toBe(true);
    expect(() => AuthValidator.validateRole('admin', ['patient', 'psychologist'])).toThrow('ACCESS DENIED');
  });
  test('F01/F03 fallo de verificación del hash devuelve falso', async () => {
    argon2.verify.mockRejectedValue(new Error('invalid hash'));
    await expect(Password.verifyPassword('damaged', 'plain')).resolves.toBe(false);
  });
});

describe('F04/F07/F13-F17/F26-F27 - decisiones de sesión y autorización', () => {
  function scenario() {
    const req = { headers: { authorization: 'Bearer session-token' } };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    Jwt.verifyToken.mockResolvedValue({ user_id: 'p1', role: 'patient' });
    redis.get.mockResolvedValue('session-token'); redis.ttl.mockResolvedValue(3600);
    return { req, res, next };
  }
  test('SES01 no acepta token sin cabecera', async () => {
    const s = scenario(); s.req.headers = {}; await validToken(s.req, s.res, s.next);
    expect(s.next).toHaveBeenCalledWith(expect.objectContaining({ message: 'TOKEN REQUIRED' }));
  });
  test('SES02 rechaza token inválido', async () => {
    const s = scenario(); Jwt.verifyToken.mockResolvedValue(null); await validToken(s.req, s.res, s.next);
    expect(s.next).toHaveBeenCalledWith(expect.objectContaining({ message: 'INVALID TOKEN' }));
  });
  test.each([null, 'other-token'])('SES03 sesión revocada o diferente %s', async stored => {
    const s = scenario(); redis.get.mockResolvedValue(stored); await validToken(s.req, s.res, s.next);
    expect(s.next).toHaveBeenCalledWith(expect.objectContaining({ message: 'INVALID TOKEN' }));
  });
  test.each([599, 600])('SES04 límite de renovación TTL=%i', async ttl => {
    const s = scenario(); redis.ttl.mockResolvedValue(ttl); Jwt.generateToken.mockResolvedValue('renewed');
    await validToken(s.req, s.res, s.next);
    expect(s.req.user).toEqual({ user_id: 'p1', role: 'patient' }); expect(s.next).toHaveBeenCalledWith();
    if (ttl < 600) expect(s.res.setHeader).toHaveBeenCalledWith('x-new-token', 'renewed');
    else expect(s.res.setHeader).not.toHaveBeenCalled();
  });
  test('SES05 indisponibilidad Redis no autoriza', async () => {
    const s = scenario(); redis.get.mockRejectedValue(new Error('offline')); await validToken(s.req, s.res, s.next);
    expect(s.next).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' })); expect(s.req.user).toBeUndefined();
  });
  test.each([undefined, { role: 'patient' }, { role: 'psychologist' }])('ROL01 decisión de autor %j', user => {
    const s = scenario(); authorizeRoles(['psychologist'])({ user }, s.res, s.next);
    if (user?.role === 'psychologist') expect(s.next).toHaveBeenCalledWith();
    else { expect(s.next).not.toHaveBeenCalled(); expect(s.res.status).toHaveBeenCalledWith(403); }
  });
  test('ROL02 sin lista de roles no concede acceso', () => {
    const s = scenario(); authorizeRoles()({ user: { role: 'patient' } }, s.res, s.next);
    expect(s.res.status).toHaveBeenCalledWith(403);
  });
});

describe('F01/F02/F07 - particiones de datos de usuario', () => {
  const valid = { _id: '12345', document_type: 'CC', name: 'María', last_name1: 'Rojas', last_name2: 'Lopez',
    email: 'maria@lamorada.test', age: 25, phone: '3000000001', password: 'Morada123!' };
  test.each([
    ['_id', '', 'INVALID ID'], ['_id', '1'.repeat(16), 'INVALID ID'], ['document_type', 'PAS', 'INVALID DOC TYPE'],
    ['name', '123', 'INVALID NAME'], ['last_name1', '', 'INVALID LASTNAME1'], ['last_name2', '', 'INVALID LASTNAME2'],
    ['age', 111, 'INVALID AGE'], ['email', 'incorrecto', 'INVALID EMAIL'], ['phone', '123', 'INVALID PHONE'],
    ['password', 'debil', 'INVALID PASSWORD'],
  ])('USR01 %s fuera del contrato', (field, value, reason) => {
    expect(() => validateUser({ ...valid, [field]: value })).toThrow(reason);
  });
  test.each([1, 15])('USR02 longitud ID válida %i', length => {
    expect(() => validateUser({ ...valid, _id: '1'.repeat(length) })).not.toThrow();
  });
  test.each([7, 15])('USR03 longitud teléfono válida %i', length => {
    expect(() => validateUser({ ...valid, phone: '1'.repeat(length) })).not.toThrow();
  });
  test('USR04 actualizar sin contraseña conserva validación de otros campos', () => {
    expect(() => validateUser({ ...valid, password: undefined }, { validatePassword: false })).not.toThrow();
  });
});
