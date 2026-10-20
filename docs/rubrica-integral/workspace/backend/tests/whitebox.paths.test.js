jest.mock("../src/modules/user/models/user", () => jest.fn());
jest.mock("../src/modules/cart/models/cart", () => jest.fn());
jest.mock("../src/modules/user/validators/user-validator", () => ({ validateUser: jest.fn() }));
jest.mock("../src/modules/auth/validators/auth-validator", () => ({
  validateLogin: jest.fn(), validatePassword: jest.fn(), validateRole: jest.fn(),
}));
jest.mock("../src/modules/auth/strategies/jwt-strategy", () => ({
  generateToken: jest.fn(), verifyToken: jest.fn(), invalidateToken: jest.fn(),
}));
jest.mock("../src/modules/auth/strategies/password-strategy", () => ({ hashPassword: jest.fn() }));
jest.mock("../src/modules/appointment/models/appointment", () => ({
  findOne: jest.fn(), findById: jest.fn(), find: jest.fn(), create: jest.fn(),
}));
jest.mock("../src/modules/product/models/product", () => ({ findById: jest.fn(), find: jest.fn() }));
jest.mock("../src/modules/availability/models/availability", () => ({ findById: jest.fn() }));
jest.mock("../src/modules/twilio/twilio-service", () => ({
  sendAppointmentEmail: jest.fn(), sendPasswordResetEmail: jest.fn(),
}));
jest.mock("../src/handlers/error-handler", () => ({ handleError: jest.fn() }));

const User = require("../src/modules/user/models/user");
const Cart = require("../src/modules/cart/models/cart");
const UserValidator = require("../src/modules/user/validators/user-validator");
const AuthValidator = require("../src/modules/auth/validators/auth-validator");
const JwtStrategy = require("../src/modules/auth/strategies/jwt-strategy");
const { hashPassword } = require("../src/modules/auth/strategies/password-strategy");
const Appointment = require("../src/modules/appointment/models/appointment");
const Product = require("../src/modules/product/models/product");
const Availability = require("../src/modules/availability/models/availability");
const TwilioService = require("../src/modules/twilio/twilio-service");
const { handleError } = require("../src/handlers/error-handler");
const UserService = require("../src/modules/user/user-service");
const AuthService = require("../src/modules/auth/auth-service");
const AppointmentService = require("../src/modules/appointment/appointment-service");
const AppointmentController = require("../src/modules/appointment/appointment-controller");
const CartService = require("../src/modules/cart/cart-service");

const validRegistration = {
  _id: "2000000001", document_type: "CC", email: "paciente@lamorada.test",
  name: "Camila", last_name1: "Rojas", last_name2: "Lopez", age: 25,
  phone: "3000000001", password: "Morada123!",
};

function mockStoredUser(data) {
  const stored = {
    ...data, _id: data._id, save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn(() => ({ ...data })),
  };
  User.mockImplementation(() => stored);
  const cart = { _id: "cart-1", save: jest.fn().mockResolvedValue(undefined) };
  Cart.mockImplementation(() => cart);
  return { stored, cart };
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  User.findById = jest.fn(); User.findOne = jest.fn();
  hashPassword.mockResolvedValue("hashed");
  Appointment.findOne.mockReset(); Appointment.findById.mockReset(); Appointment.create.mockReset();
  Product.findById.mockReset(); Availability.findById.mockReset();
});

describe.each([
  ["F01", validRegistration],
  ["F02", { ...validRegistration, _id: "1000000002", email: "aspirante@lamorada.test", role: "psychologist", specialty: "Ansiedad" }],
])("%s - UserService.register (3 caminos exactos)", (feature, payload) => {
  test(`${feature}-B-P1: existingById verdadero`, async () => {
    User.findById.mockResolvedValue({ _id: payload._id });
    await expect(UserService.register({ ...payload })).rejects.toThrow("ID EXISTS");
    expect(User.findOne).not.toHaveBeenCalled();
  });
  test(`${feature}-B-P2: ID libre y existingByEmail verdadero`, async () => {
    User.findById.mockResolvedValue(null); User.findOne.mockResolvedValue({ email: payload.email });
    await expect(UserService.register({ ...payload })).rejects.toThrow("EMAIL EXISTS");
  });
  test(`${feature}-B-P3: ID y correo libres completan el registro`, async () => {
    User.findById.mockResolvedValue(null); User.findOne.mockResolvedValue(null);
    const { stored } = mockStoredUser({ ...payload, password: "hashed", role: "patient" });
    const result = await UserService.register({ ...payload });
    expect(UserValidator.validateUser).toHaveBeenCalled();
    expect(User).toHaveBeenCalledWith(expect.objectContaining({ role: "patient" }));
    expect(stored.save).toHaveBeenCalledTimes(2);
    expect(result.password).toBeUndefined();
  });
});

describe("F03 - AuthService.loginUser (2 caminos exactos)", () => {
  test("F03-B-P1: usuario no encontrado", async () => {
    User.findOne.mockResolvedValue(null);
    await expect(AuthService.loginUser("nadie@lamorada.test", "Morada123!"))
      .rejects.toThrow("USER NOT FOUND");
  });
  test("F03-B-P2: usuario encontrado completa validaciones y genera token", async () => {
    const user = {
      _id: "2000000001", password: "hash", role: "patient",
      toObject: () => ({ _id: "2000000001", password: "hash", role: "patient" }),
    };
    User.findOne.mockResolvedValue(user); JwtStrategy.generateToken.mockResolvedValue("jwt-prueba");
    const result = await AuthService.loginUser("paciente@lamorada.test", "Morada123!");
    expect(AuthValidator.validateLogin).toHaveBeenCalled();
    expect(AuthValidator.validatePassword).toHaveBeenCalledWith("hash", "Morada123!");
    expect(AuthValidator.validateRole).toHaveBeenCalled();
    expect(result).toEqual({ user: { _id: "2000000001", role: "patient" }, token: "jwt-prueba" });
  });
});

describe("F04 - AuthService.logoutUser (3 caminos exactos)", () => {
  test("F04-B-P1: token ausente", async () => {
    await expect(AuthService.logoutUser()).rejects.toThrow("TOKEN REQUIRED");
  });
  test("F04-B-P2: token presente pero inválido", async () => {
    JwtStrategy.verifyToken.mockResolvedValue(null);
    await expect(AuthService.logoutUser("token-invalido")).rejects.toThrow("INVALID TOKEN");
  });
  test("F04-B-P3: token válido se invalida", async () => {
    JwtStrategy.verifyToken.mockResolvedValue({ user_id: "2000000001" });
    await expect(AuthService.logoutUser("token-valido")).resolves.toBe(true);
    expect(JwtStrategy.invalidateToken).toHaveBeenCalledWith("2000000001");
  });
});

describe("F13 - AppointmentService.createAppointment (9 caminos exactos)", () => {
  const patient = { _id: "2000000001", role: "patient" };
  const psychologist = { _id: "1000000001", role: "psychologist", availability_id: "av-1" };
  const future = new Date(Date.now() + 72 * 60 * 60 * 1000);
  future.setUTCHours(15, 0, 0, 0);
  const data = { patient_id: patient._id, psychologist_id: psychologist._id, start: future.toISOString() };
  const allDays = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const participants = (p = patient, psy = psychologist) => {
    User.findById.mockResolvedValueOnce(p).mockResolvedValueOnce(psy);
  };
  test("F13-B-P1: paciente inválido", async () => {
    participants(null, psychologist);
    await expect(AppointmentService.createAppointment(data)).rejects.toThrow("INVALID PATIENT");
  });
  test("F13-B-P2: psicólogo inválido", async () => {
    participants(patient, null);
    await expect(AppointmentService.createAppointment(data)).rejects.toThrow("INVALID PSYCHOLOGIST");
  });
  test("F13-B-P3: disponibilidad inexistente", async () => {
    participants(); Availability.findById.mockResolvedValue(null);
    await expect(AppointmentService.createAppointment(data)).rejects.toThrow("PSYCHOLOGIST HAS NO AVAILABILITY");
  });
  test("F13-B-P4: fecha inválida", async () => {
    participants(); Availability.findById.mockResolvedValue({ days: allDays, slots: [] });
    await expect(AppointmentService.createAppointment({ ...data, start: "no-fecha" })).rejects.toThrow("INVALID START DATE");
  });
  test("F13-B-P5: fecha no futura", async () => {
    participants(); Availability.findById.mockResolvedValue({ days: allDays, slots: [] });
    await expect(AppointmentService.createAppointment({ ...data, start: "2025-01-01T15:00:00.000Z" })).rejects.toThrow("DATE MUST BE IN THE FUTURE");
  });
  test("F13-B-P6: día no disponible", async () => {
    participants(); Availability.findById.mockResolvedValue({ days: [], slots: [] });
    await expect(AppointmentService.createAppointment(data)).rejects.toThrow("DAY NOT AVAILABLE");
  });
  test("F13-B-P7: hora fuera de los slots", async () => {
    participants(); Availability.findById.mockResolvedValue({ days: allDays, slots: [{ start: "16:00", end: "18:00" }] });
    await expect(AppointmentService.createAppointment(data)).rejects.toThrow("TIME NOT AVAILABLE IN SLOT");
  });
  test("F13-B-P8: horario ocupado", async () => {
    participants(); Availability.findById.mockResolvedValue({ days: allDays, slots: [{ start: "00:00", end: "23:59" }] });
    Appointment.findOne.mockResolvedValue({ _id: "existente" });
    await expect(AppointmentService.createAppointment(data)).rejects.toThrow("TIME ALREADY BOOKED");
  });
  test("F13-B-P9: horario libre crea cita", async () => {
    participants(); Availability.findById.mockResolvedValue({ days: allDays, slots: [{ start: "00:00", end: "23:59" }] });
    Appointment.findOne.mockResolvedValue(null);
    const created = { _id: "cita-1", status: "pendiente" }; Appointment.create.mockResolvedValue(created);
    await expect(AppointmentService.createAppointment(data)).resolves.toBe(created);
    expect(TwilioService.sendAppointmentEmail).toHaveBeenCalled();
  });
});

describe("F14 - AppointmentController.getAll (3 caminos exactos)", () => {
  function response() { return { json: jest.fn() }; }
  test("F14-B-P1: rol patient consulta por paciente", async () => {
    jest.spyOn(AppointmentService, "getAppointmentsByPatient").mockResolvedValue([{ _id: "c1" }]);
    jest.spyOn(AppointmentService, "getAppointmentsByPsychologist").mockResolvedValue([]);
    const req = { user: { role: "patient", user_id: "2000000001" } }; const res = response();
    await AppointmentController.getAll(req, res);
    expect(AppointmentService.getAppointmentsByPatient).toHaveBeenCalledWith("2000000001");
    expect(AppointmentService.getAppointmentsByPsychologist).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, appointments: [{ _id: "c1" }] });
  });
  test("F14-B-P2: rol distinto de patient consulta por psicólogo", async () => {
    jest.spyOn(AppointmentService, "getAppointmentsByPatient").mockResolvedValue([]);
    jest.spyOn(AppointmentService, "getAppointmentsByPsychologist").mockResolvedValue([{ _id: "c2" }]);
    const req = { user: { role: "psychologist", user_id: "1000000001" } }; const res = response();
    await AppointmentController.getAll(req, res);
    expect(AppointmentService.getAppointmentsByPsychologist).toHaveBeenCalledWith("1000000001");
    expect(AppointmentService.getAppointmentsByPatient).not.toHaveBeenCalled();
  });
  test("F14-B-P3: excepción delegada a handleError", async () => {
    const err = new Error("fallo controlado");
    jest.spyOn(AppointmentService, "getAppointmentsByPatient").mockRejectedValue(err);
    const req = { user: { role: "patient", user_id: "2000000001" } }; const res = response();
    await AppointmentController.getAll(req, res);
    expect(handleError).toHaveBeenCalledWith(res, err);
  });
});

describe("F15 - AppointmentService.updateAppointmentStatus (7 caminos exactos)", () => {
  const psychologist = { user_id: "1000000001", role: "psychologist" };
  const patient = { user_id: "2000000001", role: "patient" };
  const stored = (status = "pendiente") => ({
    _id: "cita-1", patient_id: patient.user_id, psychologist_id: psychologist.user_id,
    status, save: jest.fn().mockResolvedValue(undefined),
  });
  test("F15-B-P1: cita inexistente", async () => {
    Appointment.findById.mockResolvedValue(null);
    await expect(AppointmentService.updateAppointmentStatus("cita-1", psychologist, "confirmada")).rejects.toThrow("APPOINTMENT NOT FOUND");
  });
  test("F15-B-P2: usuario ajeno", async () => {
    Appointment.findById.mockResolvedValue(stored());
    await expect(AppointmentService.updateAppointmentStatus("cita-1", { user_id: "otro", role: "psychologist" }, "confirmada")).rejects.toThrow("ACCESS DENIED");
  });
  test("F15-B-P3: estado inválido", async () => {
    Appointment.findById.mockResolvedValue(stored());
    await expect(AppointmentService.updateAppointmentStatus("cita-1", psychologist, "reabierta")).rejects.toThrow("INVALID STATUS");
  });
  test("F15-B-P4: paciente intenta estado distinto de cancelada", async () => {
    Appointment.findById.mockResolvedValue(stored());
    await expect(AppointmentService.updateAppointmentStatus("cita-1", patient, "confirmada")).rejects.toThrow("ACCESS DENIED");
  });
  test("F15-B-P5: cita completada", async () => {
    Appointment.findById.mockResolvedValue(stored("completada"));
    await expect(AppointmentService.updateAppointmentStatus("cita-1", psychologist, "confirmada")).rejects.toThrow("CANNOT CHANGE COMPLETED APPOINTMENT");
  });
  test("F15-B-P6: cita cancelada", async () => {
    Appointment.findById.mockResolvedValue(stored("cancelada"));
    await expect(AppointmentService.updateAppointmentStatus("cita-1", psychologist, "confirmada")).rejects.toThrow("CANNOT CHANGE CANCELLED APPOINTMENT");
  });
  test("F15-B-P7: cambio permitido", async () => {
    const appointment = stored(); Appointment.findById.mockResolvedValue(appointment);
    const result = await AppointmentService.updateAppointmentStatus("cita-1", psychologist, "confirmada");
    expect(result.status).toBe("confirmada"); expect(appointment.save).toHaveBeenCalled();
  });
});

describe("F16 - AppointmentService.deleteAppointment (3 caminos exactos)", () => {
  const patient = { user_id: "2000000001", role: "patient" };
  test("F16-B-P1: cita inexistente", async () => {
    Appointment.findById.mockResolvedValue(null);
    await expect(AppointmentService.deleteAppointment("cita-1", patient)).rejects.toThrow("APPOINTMENT NOT FOUND");
  });
  test("F16-B-P2: usuario ajeno", async () => {
    Appointment.findById.mockResolvedValue({ patient_id: "otro", psychologist_id: "psico" });
    await expect(AppointmentService.deleteAppointment("cita-1", patient)).rejects.toThrow("ACCESS DENIED");
  });
  test("F16-B-P3: propietario cambia estado a cancelada", async () => {
    const appointment = { patient_id: patient.user_id, psychologist_id: "1000000001", status: "pendiente", save: jest.fn().mockResolvedValue(undefined) };
    Appointment.findById.mockResolvedValue(appointment);
    const result = await AppointmentService.deleteAppointment("cita-1", patient);
    expect(result.status).toBe("cancelada"); expect(appointment.save).toHaveBeenCalled();
  });
});

describe("F26 - CartService.addProduct (3 caminos exactos)", () => {
  const storedCart = (products_id = []) => ({ products_id, save: jest.fn().mockResolvedValue(undefined), populate: jest.fn().mockResolvedValue({ ok: true }) });
  test("F26-B-P1: producto inexistente", async () => {
    Product.findById.mockResolvedValue(null);
    await expect(CartService.addProduct("u1", "p1", 1)).rejects.toThrow("PRODUCT NOT FOUND");
  });
  test("F26-B-P2: producto nuevo usa rama else", async () => {
    Product.findById.mockResolvedValue({ _id: "p1" }); const cart = storedCart();
    jest.spyOn(CartService, "getOrCreateCart").mockResolvedValue(cart);
    jest.spyOn(CartService, "calculateTotal").mockResolvedValue(undefined);
    await CartService.addProduct("u1", "p1", 2);
    expect(cart.products_id).toEqual([{ product_id: "p1", quantity: 2 }]);
  });
  test("F26-B-P3: producto existente usa rama if", async () => {
    Product.findById.mockResolvedValue({ _id: "p1" }); const cart = storedCart([{ product_id: "p1", quantity: 1 }]);
    jest.spyOn(CartService, "getOrCreateCart").mockResolvedValue(cart);
    jest.spyOn(CartService, "calculateTotal").mockResolvedValue(undefined);
    await CartService.addProduct("u1", "p1", 2);
    expect(cart.products_id[0].quantity).toBe(3);
  });
});

describe("F27 - CartService.getCart (1 camino lineal)", () => {
  test("F27-B-P1: obtiene, recalcula, guarda y popula", async () => {
    const populated = { _id: "cart-1" };
    const cart = { save: jest.fn().mockResolvedValue(undefined), populate: jest.fn().mockResolvedValue(populated) };
    jest.spyOn(CartService, "getOrCreateCart").mockResolvedValue(cart);
    jest.spyOn(CartService, "calculateTotal").mockResolvedValue(undefined);
    await expect(CartService.getCart("u1")).resolves.toBe(populated);
    expect(CartService.calculateTotal).toHaveBeenCalledWith(cart);
    expect(cart.save).toHaveBeenCalled();
  });
});
