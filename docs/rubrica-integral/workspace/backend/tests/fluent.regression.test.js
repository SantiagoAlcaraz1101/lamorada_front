// Clase 15: AAA, doubles y aserciones fluidas con Chai.
const { expect: should } = require('chai');
process.env.JWT_ONE_DAY_EXPIRES = '600';
jest.mock('../src/modules/auth/strategies/jwt-strategy', () => ({ verifyToken: jest.fn(), generateToken: jest.fn() }));
jest.mock('../src/config/redis-config', () => ({ get: jest.fn(), ttl: jest.fn() }));
jest.mock('argon2', () => ({ verify: jest.fn() }));
const Jwt = require('../src/modules/auth/strategies/jwt-strategy');
const redis = require('../src/config/redis-config');
const argon2 = require('argon2');
const AuthValidator = require('../src/modules/auth/validators/auth-validator');
const Password = require('../src/modules/auth/strategies/password-strategy');
const { validToken } = require('../src/middlewares/jwt-middleware');
const { validateUser } = require('../src/modules/user/validators/user-validator');

beforeEach(() => jest.resetAllMocks());

describe('Regresión Clase 15: AAA y Fluent Assertions', () => {
  test('FA01 conserva el acceso con credenciales válidas', () => {
    // Arrange
    const email = 'paciente@lamorada.test';
    const password = 'Morada123!';
    // Act
    const result = AuthValidator.validateLogin(email, password);
    // Assert
    should(result, 'las credenciales válidas deben aceptarse').to.be.true;
  });

  test.each([
    ['', 'Morada123!', 'MISSING CREDENTIALS'],
    ['incorrecto', 'Morada123!', 'INVALID EMAIL'],
    ['paciente@lamorada.test', 'debil', 'INVALID PASSWORD'],
  ])('FA02 conserva el rechazo de credenciales: %s', (email, password, message) => {
    // Arrange: datos del caso parametrizado.
    // Act: acción diferida para comprobar la excepción.
    const action = () => AuthValidator.validateLogin(email, password);
    // Assert
    should(action).to.throw(Error, message);
  });

  test('FA03 conserva la denegación de un rol ajeno a la colección permitida', () => {
    // Arrange
    const allowedRoles = ['patient', 'psychologist'];
    // Act
    const action = () => AuthValidator.validateRole('admin', allowedRoles);
    // Assert
    should(action).to.throw(Error, 'ACCESS DENIED');
    should(allowedRoles).to.deep.equal(['patient', 'psychologist']);
  });

  test('FA04 un hash dañado sigue devolviendo falso', async () => {
    // Arrange: stub de la dependencia criptográfica.
    argon2.verify.mockRejectedValue(new Error('invalid hash'));
    // Act
    const result = await Password.verifyPassword('damaged', 'plain');
    // Assert
    should(result).to.be.false;
    should(argon2.verify.mock.calls).to.deep.equal([['damaged', 'plain']]);
  });

  test.each([599, 600])('FA05 conserva el límite de renovación TTL=%i', async ttl => {
    // Arrange: stubs de JWT/Redis y spies de la respuesta y continuación.
    const req = { headers: { authorization: 'Bearer session-token' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();
    Jwt.verifyToken.mockResolvedValue({ user_id: 'p1', role: 'patient' });
    Jwt.generateToken.mockResolvedValue('renewed');
    redis.get.mockResolvedValue('session-token');
    redis.ttl.mockResolvedValue(ttl);
    // Act
    await validToken(req, res, next);
    // Assert
    should(req.user).to.deep.equal({ user_id: 'p1', role: 'patient' });
    should(next.mock.calls).to.deep.equal([[]]);
    should(redis.get.mock.calls).to.deep.equal([['user:p1']]);
    should(res.setHeader.mock.calls).to.deep.equal(ttl < 600 ? [['x-new-token', 'renewed']] : []);
    should(Jwt.generateToken.mock.calls).to.deep.equal(ttl < 600 ? [['p1', 'patient']] : []);
  });

  test.each([null, 'revoked-token'])('FA06 una sesión revocada no autoriza: %s', async stored => {
    // Arrange
    const req = { headers: { authorization: 'Bearer session-token' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();
    Jwt.verifyToken.mockResolvedValue({ user_id: 'p1', role: 'patient' });
    redis.get.mockResolvedValue(stored);
    // Act
    await validToken(req, res, next);
    // Assert
    should(req).not.to.have.property('user');
    should(next.mock.calls).to.have.lengthOf(1);
    should(next.mock.calls[0][0]).to.be.an.instanceOf(Error).with.property('message', 'INVALID TOKEN');
    should(res.setHeader.mock.calls).to.be.empty;
  });

  const profile = { _id: '12345', document_type: 'CC', name: 'María', last_name1: 'Rojas',
    last_name2: 'López', email: 'maria@lamorada.test', age: 25, phone: '3000000001', password: 'Morada123!' };

  test.each([5, 110])('FA07 conserva la edad límite válida: %i', age => {
    // Arrange
    const user = { ...profile, age };
    // Act
    const action = () => validateUser(user);
    // Assert
    should(action).not.to.throw();
    should(user).to.deep.equal({ ...profile, age });
  });

  test.each([4, 111, 25.5])('FA08 conserva el rechazo de edad inválida: %s', age => {
    // Arrange
    const user = { ...profile, age };
    // Act
    const action = () => validateUser(user);
    // Assert
    should(action).to.throw(Error, 'INVALID AGE');
  });

  test('FA09 actualizar el perfil sin contraseña conserva los datos', () => {
    // Arrange
    const user = { ...profile, password: undefined };
    const original = { ...user };
    // Act
    const action = () => validateUser(user, { validatePassword: false });
    // Assert
    should(action).not.to.throw();
    should(user).to.deep.equal(original);
    should(user.name).to.be.a('string').and.contain('María');
  });
});
