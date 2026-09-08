const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const features = {
  F01: 'Registro de pacientes', F02: 'Registro de psicólogos',
  F03: 'Inicio de sesión', F04: 'Cierre de sesión',
  F13: 'Crear cita', F14: 'Listar citas del usuario autenticado',
  F15: 'Actualizar estado de cita autorizada', F16: 'Cancelar cita autorizada',
  F26: 'Agregar producto al carrito', F27: 'Consultar carrito persistido',
};
const entries = {};
function file(name, defaults, methods = {}, onlyMethods = false) {
  if (!fs.existsSync(path.join(root, name))) throw new Error(`Missing scope file: ${name}`);
  entries[name] = { defaults, methods, onlyMethods };
}
function directory(name, defaults) {
  for (const item of fs.readdirSync(path.join(root, name), { withFileTypes: true })) {
    const child = `${name}/${item.name}`;
    if (item.isDirectory()) directory(child, defaults);
    else if (/\.(js|ts|html|css)$/.test(child) && !child.endsWith('.spec.ts')) file(child, defaults);
  }
}
const identity = ['F01', 'F02', 'F03', 'F04'];
const appointments = ['F13', 'F14', 'F15', 'F16'];
const cart = ['F26', 'F27'];
directory('backend/src/modules/auth', ['F03', 'F04']);
directory('backend/src/modules/user', ['F01', 'F02']);
directory('backend/src/modules/appointment', appointments);
directory('backend/src/modules/cart', cart);
// This legacy validator is not called by the appointment routes or service.
delete entries['backend/src/modules/appointment/validators/appointment-validator.js'];
const register = { register: ['F01', 'F02'], getPatients: ['F13'], getPsychologists: ['F13', 'F14'] };
file('backend/src/modules/user/user-service.js', ['F01', 'F02'], register, true);
file('backend/src/modules/user/user-controller.js', ['F01', 'F02'], register, true);
file('backend/src/modules/auth/auth-service.js', ['F03', 'F04'], { loginUser: ['F03'], logoutUser: ['F04'] });
file('backend/src/modules/auth/auth-controller.js', ['F03', 'F04'], { login: ['F03'], logout: ['F04'] });
file('backend/src/modules/auth/strategies/password-strategy.js', ['F01', 'F02', 'F03']);
file('backend/src/modules/auth/validators/auth-validator.js', ['F03']);
file('backend/src/modules/appointment/appointment-service.js', appointments, {
  createAppointment: ['F13'], updateAppointmentStatus: ['F15'], deleteAppointment: ['F16'],
  getAppointmentsByPatient: ['F14'], getAppointmentsByPsychologist: ['F14'],
  normalizeDay: ['F13'], localDateParts: ['F13'], addHour: ['F13'], ownsAppointment: ['F15', 'F16'],
});
file('backend/src/modules/appointment/appointment-controller.js', appointments, {
  create: ['F13'], getAll: ['F14'], updateStatus: ['F15'], remove: ['F16'],
});
file('backend/src/modules/cart/cart-service.js', cart, {
  addProduct: ['F26'], getCart: ['F27'], calculateTotal: cart, getOrCreateCart: cart,
}, true);
file('backend/src/modules/cart/cart-controller.js', cart, { addProduct: ['F26'], getCart: ['F27'] }, true);
file('backend/src/modules/product/models/product.js', cart);
file('backend/src/modules/availability/models/availability.js', ['F13']);
file('backend/src/middlewares/jwt-middleware.js', ['F04', ...appointments, ...cart]);
file('backend/src/middlewares/role-middleware.js', [...appointments, ...cart]);
file('backend/src/middlewares/rate-limit-middleware.js', ['F03']);
directory('frontend/src/app/auth/sign-up', ['F01', 'F02']);
directory('frontend/src/app/auth/sign-in', ['F03']);
directory('frontend/src/app/layout/header', ['F04']);
directory('frontend/src/app/pages/appointment', appointments);
directory('frontend/src/app/pages/cart', ['F27']);
for (const extension of ['ts', 'html', 'css']) file(`frontend/src/app/pages/product/product.component.${extension}`, ['F26']);
file('frontend/src/app/pages/product/product.component.ts', ['F26'], { addToCart: ['F26'], isLogged: ['F26'], constructor: ['F26'] }, true);
file('frontend/src/app/pages/cart/cart.component.ts', ['F27'], {
  ngOnInit: ['F27'], isObj: ['F27'], idOf: ['F27'], titleOf: ['F27'], coverOf: ['F27'], priceOf: ['F27'],
}, true);
file('frontend/src/app/pages/appointment/appointment.component.ts', appointments, {
  create: ['F13'], refreshList: ['F14'], setStatus: ['F15'], delete: ['F16'],
  weekdayEsPlain: ['F13'], hoursFromSlots: ['F13'], filterPastHoursForToday: ['F13'], regenerateHours: ['F13'],
  fetchPsychologists: ['F13'], fetchPatients: ['F13'], fetchMyAvailability: ['F13'], findUserName: ['F14'],
});
file('frontend/src/app/services/user.service.ts', identity, {
  login: ['F03'], logout: ['F04'], register: ['F01', 'F02'], clearToken: ['F04'],
  setToken: ['F03'], setRole: ['F03'], setName: ['F03'], bootstrapFromToken: ['F03'],
  isBrowser: ['F03', 'F04'], lsGet: ['F03', 'F04'], lsSet: ['F03'], lsRemove: ['F04'],
  getToken: ['F03', 'F04'], getRole: ['F03'], getName: ['F03'], getAuthHeaders: ['F03', 'F04'],
  decodeJwt: ['F03'], profileFromToken: ['F03'], getMe: ['F03'], constructor: identity,
  getPatients: ['F13'], getPsychologists: ['F13'],
}, true);
file('frontend/src/app/services/appointment.service.ts', appointments, { create: ['F13'], getAll: ['F14'], delete: ['F16'], updateStatus: ['F15'] });
file('frontend/src/app/services/cart.service.ts', cart, { addProduct: ['F26'], getCart: ['F27'], headers: cart, unwrap: cart, constructor: cart }, true);
file('frontend/src/app/core/state/auth-state.service.ts', ['F03', 'F04']);
file('frontend/src/app/core/interceptors/auth.interceptor.ts', ['F04', ...appointments, ...cart]);
file('frontend/src/app/guards/auth-role.guard.ts', ['F03', ...appointments, ...cart]);
file('frontend/src/app/guards/client-only.guard.ts', cart);
file('frontend/src/app/models/appointment.model.ts', appointments);
file('frontend/src/app/models/cart.models.ts', cart);
file('frontend/src/app/core/utils/jwt.ts', ['F03']);
file('frontend/src/app/models/availability.model.ts', ['F13']);
file('frontend/src/app/services/availability.service.ts', ['F13'], {
  getAvailability: ['F13'], isBrowser: ['F13'], headers: ['F13'], constructor: ['F13'],
}, true);
// Mixed templates: exclude controls for search, quantity editing and checkout.
entries['frontend/src/app/pages/product/product.component.html'].blocks = [
  { start: '<form class="search"', end: '</form>', features: [] },
];
entries['frontend/src/app/pages/product/product.component.css'].blocks = [
  { start: '\n.btn {', end: '\n}', features: [] },
];
entries['frontend/src/app/pages/cart/cart.component.html'].blocks = [
  { start: '<div class="qty"', end: '</div>', features: [] },
  { start: '<div class="actions"', end: '</div>', features: [] },
];
entries['frontend/src/app/services/user.service.ts'].blocks = [
  { start: 'type JwtPayload = {', end: '};', features: ['F03'] },
];
entries['backend/src/modules/user/user-service.js'].lineOverrides = [
  { text: 'const crypto = require(', features: [] },
];
entries['backend/src/modules/appointment/appointment-service.js'].lineOverrides = [
  { text: 'const ALLOWED_STATUSES =', features: ['F15'] },
];
module.exports = { root, features, entries, sourceFiles: Object.keys(entries).sort() };
