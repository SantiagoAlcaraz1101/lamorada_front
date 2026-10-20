// BP02 + plan 2.0, apartado 2.4: F07 perfil propio y F17 crear publicación.
// HTTP real y persistencia real; usuarios sintéticos y sesiones de preparación.
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/modules/user/models/user');
const Post = require('../src/modules/post/models/post');
const Jwt = require('../src/modules/auth/strategies/jwt-strategy');
const { hashPassword, verifyPassword } = require('../src/modules/auth/strategies/password-strategy');
let passwordHash;
beforeAll(async () => { passwordHash = await hashPassword('Morada123!'); });

async function account(role = 'patient', id = '2000000001') {
  const user = await User.create({ _id: id, document_type: 'CC', name: 'Camila',
    last_name1: 'Rojas', last_name2: 'Lopez', email: `${id}@lamorada.test`, age: 25,
    phone: '3000000001', password: passwordHash, role });
  const token = await Jwt.generateToken(id, role);
  return { user, token };
}
const update = (id, token, body) => request(app).put(`/user/${id}`).set('Authorization', `Bearer ${token}`).send(body);
const publication = { title: 'Autocuidado', content: 'Contenido académico de prueba.' };
const publish = (token, body = publication) => request(app).post('/post/create').set('Authorization', `Bearer ${token}`).send(body);

describe('F07 - caja negra: actualización del perfil propio', () => {
  test.each(['patient', 'psychologist'])('F07-BB01 %s conserva cambios permitidos y oculta contraseña', async role => {
    const { user, token } = await account(role);
    const response = await update(user.id, token, { name: 'Laura', email: 'nuevo@lamorada.test', phone: '3110000000', age: 30 });
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ name: 'Laura', age: 30 });
    expect(response.body.user.password).toBeUndefined();
    const stored = await User.findById(user.id);
    expect(stored.email).toBe('nuevo@lamorada.test');
    expect(stored.role).toBe(role);
    expect(stored.password).toBe(passwordHash);
  });
  test('F07-BB02 cambia la contraseña con confirmación y la almacena cifrada', async () => {
    const { user, token } = await account();
    const response = await update(user.id, token, { password: 'Nueva123!', rePassword: 'Nueva123!' });
    expect(response.status).toBe(200);
    const stored = await User.findById(user.id);
    expect(stored.password).not.toBe('Nueva123!');
    expect(await verifyPassword(stored.password, 'Nueva123!')).toBe(true);
  });
  test('F07-BB03 no permite modificar un perfil ajeno', async () => {
    const owner = await account();
    const other = await account('patient', '2000000002');
    expect((await update(owner.user.id, other.token, { name: 'Cambio' })).status).toBe(403);
    expect((await User.findById(owner.user.id)).name).toBe('Camila');
  });
  test('F07-BB04 requiere sesión y rechaza token inválido', async () => {
    expect((await request(app).put('/user/2000000001').send({ name: 'Laura' })).status).toBe(401);
    expect((await update('2000000001', 'invalid-token', { name: 'Laura' })).status).toBe(401);
  });
  test.each([
    ['name', '', 'Nombre inválido'], ['name', 'A'.repeat(31), 'Nombre inválido'],
    ['last_name1', '123', 'Primer apellido inválido'], ['last_name2', '', 'Segundo apellido inválido'],
    ['email', 'sin-arroba', 'Correo electrónico inválido'], ['phone', '123456', 'Teléfono inválido'],
    ['phone', '1'.repeat(16), 'Teléfono inválido'], ['age', 4, 'Edad inválida'],
    ['age', 111, 'Edad inválida'], ['age', 5.5, 'Edad inválida'],
    ['role', 'psychologist', 'Algunos campos no se pueden actualizar'],
    ['_id', '999', 'Algunos campos no se pueden actualizar'],
  ])('F07-BB05 partición inválida %s=%s no persiste', async (field, value, message) => {
    const { user, token } = await account();
    const response = await update(user.id, token, { [field]: value });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(message);
    expect((await User.findById(user.id)).name).toBe('Camila');
  });
  test.each([5, 110])('F07-BB06 acepta edad límite %i', async age => {
    const { user, token } = await account();
    expect((await update(user.id, token, { age })).status).toBe(200);
    expect((await User.findById(user.id)).age).toBe(age);
  });
  test('F07-BB07 contraseñas diferentes o débiles no se guardan', async () => {
    const { user, token } = await account();
    expect((await update(user.id, token, { password: 'Nueva123!', rePassword: 'Otra123!' })).status).toBe(400);
    expect((await update(user.id, token, { password: 'debil', rePassword: 'debil' })).status).toBe(400);
    expect((await User.findById(user.id)).password).toBe(passwordHash);
  });
  test('F07-GAP01 reproduce rechazo de specialty enviado por la pantalla del psicólogo', async () => {
    const { user, token } = await account('psychologist');
    const response = await update(user.id, token, { name: 'Laura', specialty: 'Ansiedad', password: 'Morada123!', rePassword: 'Morada123!' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Algunos campos no se pueden actualizar');
    expect((await User.findById(user.id)).name).toBe('Camila');
  });
});

describe('F17 - caja negra: crear publicación', () => {
  test.each([undefined, true, false])('F17-BB01 psicólogo crea y persiste con active=%s', async active => {
    const { user, token } = await account('psychologist');
    const response = await publish(token, { ...publication, active, psychologist_id: '9999999999' });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    const stored = await Post.findById(response.body.post._id);
    expect(stored).toMatchObject({ title: publication.title, content: publication.content, psychologist_id: user.id, active: active ?? true });
    expect(stored.created_at).toBeInstanceOf(Date);
    expect(await Post.countDocuments()).toBe(1);
    // La pantalla F17 refresca su lista después del POST; comprobar esa integración.
    const refreshed = await request(app).get('/post/').set('Authorization', `Bearer ${token}`);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.posts.map(post => post._id)).toContain(response.body.post._id);
  });
  test('F17-BB02 rechaza paciente y solicitudes sin sesión', async () => {
    const { token } = await account();
    expect((await publish(token)).status).toBe(403);
    expect((await request(app).post('/post/create').send(publication)).status).toBe(401);
    expect(await Post.countDocuments()).toBe(0);
  });
  test.each([
    ['title', '', 'Título inválido'], ['title', 12, 'Título inválido'],
    ['content', '', 'Contenido inválido'], ['content', 12, 'Contenido inválido'],
    ['active', 'true', 'Estado activo inválido'], ['active', null, 'Estado activo inválido'],
  ])('F17-BB03 valida %s=%s antes de guardar', async (field, value, message) => {
    const { token } = await account('psychologist');
    const response = await publish(token, { ...publication, [field]: value });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(message);
    expect(await Post.countDocuments()).toBe(0);
  });
  test('F17-BB04 revalida al autor en la base de datos', async () => {
    const { user, token } = await account('psychologist');
    await User.updateOne({ _id: user.id }, { role: 'patient' });
    expect((await publish(token)).status).toBe(403);
    expect(await Post.countDocuments()).toBe(0);
  });
  test('F17-GAP01 documenta que la API no impone los límites 160/10 de la pantalla', async () => {
    const { token } = await account('psychologist');
    const response = await publish(token, { title: 'T'.repeat(161), content: 'corto' });
    expect(response.status).toBe(201);
    expect((await Post.findById(response.body.post._id)).content).toBe('corto');
  });
});
