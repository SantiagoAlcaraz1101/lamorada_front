const request = require("supertest");
const app = require("../src/app");
const User = require("../src/modules/user/models/user");
const Cart = require("../src/modules/cart/models/cart");
const Product = require("../src/modules/product/models/product");
const { hashPassword } = require("../src/modules/auth/strategies/password-strategy");

const PASSWORD = "Morada123!";

function registrationData(id, email, extra = {}) {
  return {
    _id: id,
    document_type: "CC",
    email,
    name: "Camila",
    last_name1: "Rojas",
    last_name2: "Lopez",
    age: 25,
    phone: `300${id.slice(-7)}`,
    password: PASSWORD,
    rePassword: PASSWORD,
    ...extra,
  };
}

async function registerPatient(id = "2000000001", email = "paciente@lamorada.test") {
  return request(app).post("/user/register").send(registrationData(id, email));
}

async function createPsychologist() {
  return User.create({
    _id: "1000000001",
    document_type: "CC",
    email: "psicologa@lamorada.test",
    name: "Laura",
    last_name1: "Moreno",
    last_name2: "Diaz",
    age: 34,
    password: await hashPassword(PASSWORD),
    role: "psychologist",
    phone: "3000000001",
    specialty: "Ansiedad",
  });
}

async function login(email, password = PASSWORD) {
  return request(app).post("/auth/login").send({ email, password });
}

async function createAppointmentScenario() {
  const psychologist = await createPsychologist();
  await registerPatient();
  const psychologistToken = (await login(psychologist.email)).body.token;
  const patientToken = (await login("paciente@lamorada.test")).body.token;
  await request(app)
    .post("/availability")
    .set("Authorization", `Bearer ${psychologistToken}`)
    .send({
      days: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"],
      slots: [{ start: "08:00", end: "18:00" }],
    });
  const future = new Date(Date.now() + 72 * 60 * 60 * 1000);
  future.setUTCHours(15, 0, 0, 0);
  const created = await request(app)
    .post("/appointment")
    .set("Authorization", `Bearer ${patientToken}`)
    .send({ psychologist_id: psychologist._id, start: future.toISOString() });
  expect(created.status).toBe(201);
  return { psychologist, psychologistToken, patientToken, appointment: created.body.appointment };
}

describe("caja negra F-01 a F-04, F-13 a F-16, F-26 y F-27", () => {
  test("F-01: registra paciente, oculta password y crea carrito; rechaza duplicado", async () => {
    const created = await registerPatient();
    expect(created.status).toBe(201);
    expect(created.body.user.role).toBe("patient");
    expect(created.body.user.password).toBeUndefined();
    expect(await Cart.findOne({ user_id: "2000000001" })).not.toBeNull();

    const duplicate = await registerPatient();
    expect(duplicate.status).toBe(409);
  });

  test("F-02: evidencia la brecha: solicitar psychologist termina almacenando patient", async () => {
    const response = await request(app)
      .post("/user/register")
      .send(registrationData("1000000002", "aspirante.psicologia@lamorada.test", {
        role: "psychologist",
        specialty: "Ansiedad",
      }));

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe("patient");
    const stored = await User.findById("1000000002");
    expect(stored.role).toBe("patient");
  });

  test("F-03: inicia sesion con credenciales validas y rechaza password incorrecto", async () => {
    await registerPatient();
    const ok = await login("paciente@lamorada.test");
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.user.password).toBeUndefined();

    const rejected = await login("paciente@lamorada.test", "Incorrecta1!");
    expect(rejected.status).toBe(401);
    expect(rejected.body.success).toBe(false);
  });

  test("F-04: logout invalida el token y evita reutilizarlo", async () => {
    await registerPatient();
    const signedIn = await login("paciente@lamorada.test");
    const token = signedIn.body.token;

    const logout = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);

    const reused = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${token}`);
    expect(reused.status).toBe(401);

    const withoutToken = await request(app).post("/auth/logout");
    expect(withoutToken.status).toBe(401);
  });

  test("F-13: crea cita disponible y rechaza horario cruzado y fecha pasada", async () => {
    const psychologist = await createPsychologist();
    await registerPatient();
    const psychologistToken = (await login(psychologist.email)).body.token;
    const patientToken = (await login("paciente@lamorada.test")).body.token;

    const availability = await request(app)
      .post("/availability")
      .set("Authorization", `Bearer ${psychologistToken}`)
      .send({
        days: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"],
        slots: [{ start: "08:00", end: "18:00" }],
      });
    expect(availability.status).toBe(200);

    const future = new Date(Date.now() + 72 * 60 * 60 * 1000);
    future.setUTCHours(15, 0, 0, 0);
    const payload = { psychologist_id: psychologist._id, start: future.toISOString() };

    const created = await request(app)
      .post("/appointment")
      .set("Authorization", `Bearer ${patientToken}`)
      .send(payload);
    expect(created.status).toBe(201);
    expect(created.body.appointment.status).toBe("pendiente");

    const overlap = await request(app)
      .post("/appointment")
      .set("Authorization", `Bearer ${patientToken}`)
      .send(payload);
    expect(overlap.status).toBe(409);

    const past = await request(app)
      .post("/appointment")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ psychologist_id: psychologist._id, start: "2025-01-01T15:00:00.000Z" });
    expect(past.status).toBe(400);
  });

  test("F-14: paciente y psicologo consultan únicamente sus citas autenticadas", async () => {
    const scenario = await createAppointmentScenario();

    const patientList = await request(app)
      .get("/appointment")
      .set("Authorization", `Bearer ${scenario.patientToken}`);
    const psychologistList = await request(app)
      .get("/appointment")
      .set("Authorization", `Bearer ${scenario.psychologistToken}`);
    const withoutToken = await request(app).get("/appointment");

    expect(patientList.status).toBe(200);
    expect(patientList.body.appointments).toHaveLength(1);
    expect(patientList.body.appointments[0].patient_id).toBe("2000000001");
    expect(psychologistList.status).toBe(200);
    expect(psychologistList.body.appointments).toHaveLength(1);
    expect(withoutToken.status).toBe(401);
  });

  test("F-15: psicologo confirma su cita y el paciente no puede completarla", async () => {
    const scenario = await createAppointmentScenario();
    const id = scenario.appointment._id;

    const patientAttempt = await request(app)
      .put(`/appointment/${id}/status`)
      .set("Authorization", `Bearer ${scenario.patientToken}`)
      .send({ status: "completada" });
    const confirmed = await request(app)
      .put(`/appointment/${id}/status`)
      .set("Authorization", `Bearer ${scenario.psychologistToken}`)
      .send({ status: "confirmada" });

    expect(patientAttempt.status).toBe(403);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.appointment.status).toBe("confirmada");
  });

  test("F-16: un tercero no cancela la cita y el paciente propietario si puede", async () => {
    const scenario = await createAppointmentScenario();
    await registerPatient("2000000002", "otro@lamorada.test");
    const otherToken = (await login("otro@lamorada.test")).body.token;
    const id = scenario.appointment._id;

    const forbidden = await request(app)
      .delete(`/appointment/${id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    const cancelled = await request(app)
      .delete(`/appointment/${id}`)
      .set("Authorization", `Bearer ${scenario.patientToken}`);

    expect(forbidden.status).toBe(403);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.appointment.status).toBe("cancelada");
  });

  test("F-26: agrega un producto al carrito y rechaza solicitudes invalidas", async () => {
    await registerPatient();
    const token = (await login("paciente@lamorada.test")).body.token;
    const product = await Product.create({
      title: "Recurso de autocuidado",
      author: "Equipo La Morada",
      publish_year: 2026,
      price: 50000,
      cover_url: "https://example.test/autocuidado.jpg",
    });

    const withoutToken = await request(app)
      .post("/cart/add")
      .send({ product_id: product._id, quantity: 1 });
    const invalidQuantity = await request(app)
      .post("/cart/add")
      .set("Authorization", `Bearer ${token}`)
      .send({ product_id: product._id, quantity: 0 });
    const added = await request(app)
      .post("/cart/add")
      .set("Authorization", `Bearer ${token}`)
      .send({ product_id: product._id, quantity: 2 });

    expect(withoutToken.status).toBe(401);
    expect(invalidQuantity.status).toBe(400);
    expect(added.status).toBe(200);
    expect(added.body.cart.products_id[0].quantity).toBe(2);
    expect(added.body.cart.total).toBe(100000);
  });

  test("F-27: consulta el carrito autenticado con productos y total calculado", async () => {
    await registerPatient();
    const token = (await login("paciente@lamorada.test")).body.token;
    const product = await Product.create({
      title: "Guia de bienestar",
      author: "Equipo La Morada",
      publish_year: 2026,
      price: 45000,
      cover_url: "https://example.test/bienestar.jpg",
    });
    await request(app)
      .post("/cart/add")
      .set("Authorization", `Bearer ${token}`)
      .send({ product_id: product._id, quantity: 2 });

    const cart = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${token}`);

    expect(cart.status).toBe(200);
    expect(cart.body.cart.products_id).toHaveLength(1);
    expect(cart.body.cart.products_id[0].product_id.title).toBe("Guia de bienestar");
    expect(cart.body.cart.total).toBe(90000);
  });
});
