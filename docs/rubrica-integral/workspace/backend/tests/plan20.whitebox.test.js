// BP02, F07/F17: decisiones de servicios; sin red ni bases de desarrollo.
jest.mock('../src/modules/user/models/user', () => ({ findById: jest.fn() }));
jest.mock('../src/modules/post/models/post', () => jest.fn());
jest.mock('../src/modules/auth/strategies/password-strategy', () => ({ hashPassword: jest.fn() }));
const User = require('../src/modules/user/models/user');
const Post = require('../src/modules/post/models/post');
const { hashPassword } = require('../src/modules/auth/strategies/password-strategy');
const UserService = require('../src/modules/user/user-service');
const PostService = require('../src/modules/post/post-service');
const PostController = require('../src/modules/post/post-controller');
const { validatePost } = require('../src/modules/post/validators/post-validator');
beforeEach(() => { jest.resetAllMocks(); hashPassword.mockResolvedValue('new-hash'); });
function storedUser() {
  const user = { _id: '2000000001', document_type: 'CC', name: 'Camila', last_name1: 'Rojas', last_name2: 'Lopez',
    email: 'camila@lamorada.test', age: 25, phone: '3000000001', role: 'patient', password: 'old-hash',
    save: jest.fn().mockResolvedValue(undefined) };
  user.toObject = () => ({ ...user, save: undefined, toObject: undefined });
  User.findById.mockResolvedValue(user);
  return user;
}
describe('F07 - caminos de actualización', () => {
  test('F07-B-P1 usuario inexistente termina sin hash', async () => {
    User.findById.mockResolvedValue(null);
    await expect(UserService.update('missing', { name: 'Laura' })).rejects.toThrow('USER NOT FOUND');
    expect(hashPassword).not.toHaveBeenCalled();
  });
  test('F07-B-P2 campo protegido termina sin persistir', async () => {
    const user = storedUser();
    await expect(UserService.update(user._id, { role: 'psychologist' })).rejects.toThrow('FIELDS NOT UPDATABLE');
    expect(user.save).not.toHaveBeenCalled();
  });
  test('F07-B-P3 datos inválidos terminan sin persistir', async () => {
    const user = storedUser();
    await expect(UserService.update(user._id, { age: 111 })).rejects.toThrow('INVALID AGE');
    expect(user.save).not.toHaveBeenCalled();
  });
  test('F07-B-P4 actualiza campos definidos y conserva el hash si no cambia contraseña', async () => {
    const user = storedUser();
    const result = await UserService.update(user._id, { name: 'Laura' });
    expect(user.name).toBe('Laura');
    expect(user.phone).toBe('3000000001');
    expect(hashPassword).not.toHaveBeenCalled();
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(result.password).toBeUndefined();
  });
  test('F07-B-P5 cifra la contraseña y no la devuelve', async () => {
    const user = storedUser();
    const result = await UserService.update(user._id, { password: 'Nueva123!' });
    expect(hashPassword).toHaveBeenCalledWith('Nueva123!');
    expect(user.password).toBe('new-hash');
    expect(result.password).toBeUndefined();
  });
  test('F07-B-P6 propaga fallo del almacenamiento', async () => {
    const user = storedUser(); user.save.mockRejectedValue(new Error('storage unavailable'));
    await expect(UserService.update(user._id, { name: 'Laura' })).rejects.toThrow('storage unavailable');
  });
});
describe('F17 - caminos de creación', () => {
  test('F17-B-P0 error del refresco posterior a crear se informa, no se silencia', async () => {
    const read = jest.spyOn(PostService, 'getPosts').mockRejectedValue(new Error('offline'));
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    try {
      await PostController.getPosts({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    } finally { read.mockRestore(); }
  });
  test.each([null, { role: 'patient' }])('F17-B-P1 autor inválido %j no crea', async user => {
    User.findById.mockResolvedValue(user);
    await expect(PostService.createPost('ps1', 'Título', 'Contenido')).rejects.toThrow('USER NOT FOUND OR NOT PSYCHOLOGIST');
    expect(Post).not.toHaveBeenCalled();
  });
  test.each([undefined, false])('F17-B-P2 creación conserva active=%s', async active => {
    User.findById.mockResolvedValue({ role: 'psychologist' });
    const post = { save: jest.fn().mockResolvedValue(undefined) };
    Post.mockImplementation(() => post);
    await expect(PostService.createPost('ps1', 'Título', 'Contenido', active)).resolves.toBe(post);
    expect(Post).toHaveBeenCalledWith({ psychologist_id: 'ps1', title: 'Título', content: 'Contenido', active: active ?? true });
    expect(post.save).toHaveBeenCalledTimes(1);
  });
  test('F17-B-P3 fallo al guardar no se convierte en éxito', async () => {
    User.findById.mockResolvedValue({ role: 'psychologist' });
    Post.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(new Error('storage unavailable')) }));
    await expect(PostService.createPost('ps1', 'Título', 'Contenido')).rejects.toThrow('storage unavailable');
  });
  test.each([
    [{ content: 'Texto' }, 'INVALID TITLE'], [{ title: 1, content: 'Texto' }, 'INVALID TITLE'],
    [{ title: 'Título' }, 'INVALID CONTENT'], [{ title: 'Título', content: [] }, 'INVALID CONTENT'],
    [{ title: 'Título', content: 'Texto', active: 1 }, 'INVALID ACTIVE'],
  ])('F17-B-V valida partición %j', (payload, message) => {
    expect(() => validatePost(payload)).toThrow(message);
  });
});
