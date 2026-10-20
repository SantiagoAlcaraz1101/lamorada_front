// Ampliación autorizada 2026-09-14. BP02: contratos existentes, datos sintéticos.
jest.mock('../src/modules/user/models/user', () => ({ findById: jest.fn(), findOne: jest.fn(), find: jest.fn(), findByIdAndDelete: jest.fn() }));
jest.mock('../src/modules/post/models/post', () => ({ findById: jest.fn(), findByIdAndDelete: jest.fn() }));
jest.mock('../src/modules/cart/models/cart', () => ({ findOne: jest.fn(), create: jest.fn() }));
jest.mock('../src/modules/product/models/product', () => ({ find: jest.fn() }));
jest.mock('../src/config/redis-config', () => ({ setEx: jest.fn(), get: jest.fn(), del: jest.fn() }));
jest.mock('../src/modules/twilio/twilio-service', () => ({ sendPasswordResetEmail: jest.fn() }));
jest.mock('../src/modules/auth/strategies/password-strategy', () => ({ hashPassword: jest.fn() }));
const User = require('../src/modules/user/models/user');
const Post = require('../src/modules/post/models/post');
const Cart = require('../src/modules/cart/models/cart');
const Product = require('../src/modules/product/models/product');
const redis = require('../src/config/redis-config');
const mail = require('../src/modules/twilio/twilio-service');
const { hashPassword } = require('../src/modules/auth/strategies/password-strategy');
const UserService = require('../src/modules/user/user-service');
const PostService = require('../src/modules/post/post-service');
const CartService = require('../src/modules/cart/cart-service');
const AuthService = require('../src/modules/auth/auth-service');
const UserController = require('../src/modules/user/user-controller');
const PostController = require('../src/modules/post/post-controller');
const CartController = require('../src/modules/cart/cart-controller');
const AuthController = require('../src/modules/auth/auth-controller');
const { validatePost } = require('../src/modules/post/validators/post-validator');
const { validateCartItem } = require('../src/modules/cart/validators/cart-validator');
const originalTTL = process.env.RESET_CODE_TTL;
beforeEach(() => { jest.resetAllMocks(); hashPassword.mockResolvedValue('hashed'); delete process.env.RESET_CODE_TTL; });
afterEach(() => { jest.restoreAllMocks(); if (originalTTL === undefined) delete process.env.RESET_CODE_TTL; else process.env.RESET_CODE_TTL = originalTTL; });
function userFixture() {
  const user = { _id: '2000000001', document_type: 'CC', name: 'Camila', last_name1: 'Rojas', last_name2: 'Lopez', email: 'camila@lamorada.test', phone: '3000000001', age: 25, password: 'old-hash', save: jest.fn().mockResolvedValue(undefined) };
  user.toObject = () => ({ ...user });
  User.findOne.mockResolvedValue(user); User.findById.mockResolvedValue(user);
  return user;
}
describe('F05 F06 F08 F09 y eliminación propia - servicios aislados', () => {
  test.each([undefined, '120'])('F05 genera código, TTL %s y correo simulado', async ttl => {
    // Arrange: stub de usuario; espías de persistencia y correo, no hay red.
    const user = userFixture(); if (ttl) process.env.RESET_CODE_TTL = ttl;
    // Act
    const result = await UserService.requestPasswordReset(user.email);
    // Assert
    expect(result.message).toBe('Reset code sent to your email.');
    expect(redis.setEx).toHaveBeenCalledWith('reset:' + user.email, ttl ? 120 : 900, expect.stringMatching(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/));
    expect(mail.sendPasswordResetEmail).toHaveBeenCalledWith(user, redis.setEx.mock.calls[0][2]);
  });
  test('F05 inexistente no envía correo', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(UserService.requestPasswordReset('missing@lamorada.test')).rejects.toThrow('USER NOT FOUND');
    expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
  test.each(['storage', 'mail'])('F05 propaga fallo %s sin éxito falso', async source => {
    userFixture(); (source === 'storage' ? redis.setEx : mail.sendPasswordResetEmail).mockRejectedValue(new Error('offline'));
    await expect(UserService.requestPasswordReset('camila@lamorada.test')).rejects.toThrow('offline');
    if (source === 'storage') expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
  test.each([[null, 'CODE EXPIRED OR NOT FOUND'], ['OTHER', 'INVALID CODE']])('F06 código %s rechazado sin guardar', async (stored, error) => {
    const user = userFixture(); redis.get.mockResolvedValue(stored);
    await expect(UserService.resetPassword(user.email, 'ABC234', 'Nueva123!')).rejects.toThrow(error);
    expect(user.save).not.toHaveBeenCalled(); expect(redis.del).not.toHaveBeenCalled();
  });
  test('F06 usuario inexistente', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(UserService.resetPassword('none', 'ABC234', 'Nueva123!')).rejects.toThrow('USER NOT FOUND');
    expect(redis.get).not.toHaveBeenCalled();
  });
  test('F06 contraseña débil no consume el código', async () => {
    const user = userFixture(); redis.get.mockResolvedValue('ABC234');
    await expect(UserService.resetPassword(user.email, 'ABC234', 'weak')).rejects.toThrow('INVALID PASSWORD');
    expect(redis.del).not.toHaveBeenCalled(); expect(user.save).not.toHaveBeenCalled();
  });
  test('F06 fake Redis conserva estado entre solicitud y uso y evita reutilización', async () => {
    // Arrange: fake funcional en memoria; se reemplaza infraestructura, NO el servicio probado.
    const values = new Map(); const user = userFixture();
    redis.setEx.mockImplementation(async (key, ttl, value) => { values.set(key, value); });
    redis.get.mockImplementation(async key => values.get(key));
    redis.del.mockImplementation(async key => values.delete(key));
    // Act
    await UserService.requestPasswordReset(user.email);
    const code = values.get('reset:' + user.email);
    const result = await UserService.resetPassword(user.email, code, 'Nueva123!');
    // Assert: estado y segunda operación, no solo llamadas.
    expect(result.message).toBe('Password successfully updated.');
    expect(user.password).toBe('hashed'); expect(user.save).toHaveBeenCalledTimes(1);
    expect(values.has('reset:' + user.email)).toBe(false);
    await expect(UserService.resetPassword(user.email, code, 'Otra123!')).rejects.toThrow('CODE EXPIRED OR NOT FOUND');
  });
  test.each(['getPatients', 'getPsychologists'])('%s proyecta sin contraseña', async method => {
    const rows = [{ _id: 'p1' }]; const select = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }); User.find.mockReturnValue({ select });
    const result = await UserService[method]();
    expect(result).toEqual(rows); expect(select).toHaveBeenCalledWith('-password');
    expect(User.find).toHaveBeenCalledWith({ role: method === 'getPatients' ? 'patient' : 'psychologist' });
  });
  test.each([undefined, '', 42])('F09 rechaza filtro inválido %s', async value => {
    await expect(UserService.getPsychologistsBySpecialty(value)).rejects.toThrow('INVALID PARAMS');
    expect(User.find).not.toHaveBeenCalled();
  });
  test('F09 escapa metacaracteres y no los interpreta como expresión del usuario', async () => {
    User.find.mockReturnValue({ select: () => ({ lean: async () => [] }) });
    await expect(UserService.getPsychologistsBySpecialty('C.*(A)')).resolves.toEqual([]);
    const filter = User.find.mock.calls[0][0];
    expect(filter.role).toBe('psychologist'); expect(filter.specialty.test('c.*(a)')).toBe(true); expect(filter.specialty.test('CualquierA')).toBe(false);
  });
  test('EX01 elimina solo el ID solicitado', async () => {
    userFixture();
    await expect(UserService.delete('2000000001')).resolves.toEqual({ message: 'User successfully deleted' });
    expect(User.findByIdAndDelete).toHaveBeenCalledWith('2000000001');
  });
  test('EX01 inexistente no ejecuta borrado', async () => {
    User.findById.mockResolvedValue(null);
    await expect(UserService.delete('none')).rejects.toThrow('USER NOT FOUND');
    expect(User.findByIdAndDelete).not.toHaveBeenCalled();
  });
});
describe('F19 F20 F21 - autor y publicación', () => {
  test.each([null, { _id: 'post1' }])('F19 consulta %j', async post => {
    const populate = jest.fn().mockResolvedValue(post); Post.findById.mockReturnValue({ populate });
    const action = PostService.getPostById('post1');
    if (post) await expect(action).resolves.toBe(post); else await expect(action).rejects.toThrow('POST NOT FOUND');
    expect(populate).toHaveBeenCalledWith('psychologist_id', 'name last_name1 last_name2');
  });
  test.each(['updatePost', 'deletePost'])('%s bloquea inexistente y autor ajeno', async method => {
    const args = method === 'updatePost' ? ['post1', { title: 'Nuevo' }, 'other'] : ['post1', 'other'];
    Post.findById.mockResolvedValue(null);
    await expect(PostService[method](...args)).rejects.toThrow('POST NOT FOUND');
    const save = jest.fn(); Post.findById.mockResolvedValue({ psychologist_id: 'owner', save });
    await expect(PostService[method](...args)).rejects.toThrow('ACCESS DENIED');
    expect(save).not.toHaveBeenCalled(); expect(Post.findByIdAndDelete).not.toHaveBeenCalled();
  });
  test.each([{}, { title: 'Nuevo' }, { content: 'Texto nuevo' }, { active: false }, { title: 'Nuevo', content: 'Texto nuevo', active: false }])('F20 conserva omitidos y aplica definidos %j', async updates => {
    const post = { psychologist_id: 'owner', title: 'Antes', content: 'Original', active: true, save: jest.fn().mockResolvedValue(undefined) }; Post.findById.mockResolvedValue(post);
    const result = await PostService.updatePost('post1', updates, 'owner');
    expect(result).toBe(post); expect(post.title).toBe(updates.title ?? 'Antes'); expect(post.content).toBe(updates.content ?? 'Original'); expect(post.active).toBe(updates.active ?? true); expect(post.save).toHaveBeenCalledTimes(1);
  });
  test('F21 mock con expectativa de interacción elimina exactamente la publicación propia', async () => {
    // Arrange: expectativa del protocolo del colaborador.
    const post = { psychologist_id: 'owner' }; Post.findById.mockResolvedValue(post);
    const verify = () => { expect(Post.findByIdAndDelete).toHaveBeenCalledTimes(1); expect(Post.findByIdAndDelete).toHaveBeenCalledWith('post1'); };
    // Act
    const result = await PostService.deletePost('post1', 'owner');
    // Assert
    verify(); expect(result).toBe(post);
  });
  test('F20 ID opcional inválido se rechaza', () => {
    expect(() => validatePost({ title: 'A', content: 'B', post_id: 'bad' })).toThrow('INVALID ID');
    expect(() => validatePost({ title: 'A', content: 'B', post_id: '507f1f77bcf86cd799439011' })).not.toThrow();
  });
});
describe('F28 - persistencia del carrito', () => {
  function cartFixture() {
    const cart = { products_id: [{ product_id: 'a', quantity: 2 }, { product_id: 'b', quantity: 1 }], total: 25, save: jest.fn().mockResolvedValue(undefined), populate: jest.fn() };
    cart.populate.mockResolvedValue(cart); Cart.findOne.mockResolvedValue(cart); Product.find.mockReturnValue({ lean: async () => [{ _id: 'b', price: 5 }] }); return cart;
  }
  test('F27 crea el carrito ausente', async () => {
    Cart.findOne.mockResolvedValue(null); Cart.create.mockResolvedValue({ user_id: 'p1', products_id: [], total: 0 });
    await expect(CartService.getOrCreateCart('p1')).resolves.toEqual({ user_id: 'p1', products_id: [], total: 0 });
    expect(Cart.create).toHaveBeenCalledWith({ user_id: 'p1', products_id: [], total: 0 });
  });
  test('F28 retira solo el producto indicado y recalcula', async () => {
    const cart = cartFixture();
    await CartService.removeProduct('p1', 'a');
    expect(cart.products_id).toEqual([{ product_id: 'b', quantity: 1 }]); expect(cart.total).toBe(5); expect(cart.save).toHaveBeenCalledTimes(1);
  });
  test('F28 vacía productos y total y guarda', async () => {
    const cart = cartFixture();
    await CartService.clearCart('p1');
    expect(cart.products_id).toEqual([]); expect(cart.total).toBe(0); expect(cart.save).toHaveBeenCalledTimes(1);
  });
  test('F26 ID obligatorio no pasa validación', () => { expect(() => validateCartItem({ quantity: 1 })).toThrow('INVALID PRODUCT_ID'); });
});
describe('Controladores - contratos HTTP con servicio doble', () => {
  const cases = [
    [UserController, UserService, 'getPatients', 'getPatients', {}, []],
    [UserController, UserService, 'getPsychologists', 'getPsychologists', {}, []],
    [UserController, UserService, 'getPsychologistsBySpecialty', 'getPsychologistsBySpecialty', { query: { specialty: 'A' } }, ['A']],
    [UserController, UserService, 'deleteUser', 'delete', { user: { user_id: 'p1' } }, ['p1']],
    [UserController, UserService, 'requestPasswordReset', 'requestPasswordReset', { body: { email: 'a@lamorada.test' } }, ['a@lamorada.test']],
    [UserController, UserService, 'resetPassword', 'resetPassword', { body: { email: 'a', code: 'ABC234', newPassword: 'Nueva123!', confirmPassword: 'Nueva123!' } }, ['a', 'ABC234', 'Nueva123!']],
    [PostController, PostService, 'getPostById', 'getPostById', { params: { id: 'post1' } }, ['post1']],
    [PostController, PostService, 'updatePost', 'updatePost', { params: { id: 'post1' }, user: { user_id: 'ps1' }, body: { title: 'A', content: 'B' } }, ['post1', { title: 'A', content: 'B' }, 'ps1']],
    [PostController, PostService, 'deletePost', 'deletePost', { params: { id: 'post1' }, user: { user_id: 'ps1' } }, ['post1', 'ps1']],
    [CartController, CartService, 'getCart', 'getCart', { user: { user_id: 'p1' } }, ['p1']],
    [CartController, CartService, 'removeProduct', 'removeProduct', { user: { user_id: 'p1' }, body: { product_id: '507f1f77bcf86cd799439011' } }, ['p1', '507f1f77bcf86cd799439011']],
    [CartController, CartService, 'clearCart', 'clearCart', { user: { user_id: 'p1' } }, ['p1']],
  ];
  for (const [controller, service, method, serviceMethod, req, args] of cases) {
    test(`${controller.name}.${method} responde 200 y delega argumentos correctos`, async () => {
      // Arrange: stub de respuesta del servicio; spy de la respuesta HTTP.
      const dependency = jest.spyOn(service, serviceMethod).mockResolvedValue({ message: 'OK' });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      // Act
      await controller[method](req, res);
      // Assert
      expect(dependency).toHaveBeenCalledWith(...args); expect(res.status).toHaveBeenCalledWith(200); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
    test(`${controller.name}.${method} propaga fallo como 500`, async () => {
      jest.spyOn(service, serviceMethod).mockRejectedValue(new Error('offline'));
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await controller[method](req, res);
      expect(res.status).toHaveBeenCalledWith(500); expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error interno del servidor' });
    });
  }
  test.each([['register', { password: 'A', rePassword: 'B' }], ['resetPassword', { newPassword: 'A', confirmPassword: 'B' }]])('%s bloquea confirmación diferente', async (method, body) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await UserController[method]({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Las contraseñas no coinciden' });
  });
  test.each([[undefined, 403], ['Bearer', 401]])('F04 encabezado %s no revoca', async (authorization, status) => {
    const revoke = jest.spyOn(AuthService, 'logoutUser'); const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await AuthController.logout({ headers: { authorization } }, res);
    expect(res.status).toHaveBeenCalledWith(status); expect(revoke).not.toHaveBeenCalled();
  });
});
