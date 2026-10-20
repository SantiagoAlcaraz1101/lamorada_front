const request = require("supertest");
const app = require("../src/app");
const User = require("../src/modules/user/models/user");
const Cart = require("../src/modules/cart/models/cart");
const Product = require("../src/modules/product/models/product");
const { hashPassword } = require("../src/modules/auth/strategies/password-strategy");

const PASSWORD = "Morada123!";

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

async function registerPatient(id, email, name = "Camila") {
  return request(app).post("/user/register").send({
    _id: id,
    document_type: "CC",
    email,
    name,
    last_name1: "Rojas",
    last_name2: "Lopez",
    age: 25,
    phone: `300${id.slice(-7)}`,
    password: PASSWORD,
    rePassword: PASSWORD,
  });
}

async function login(email) {
  const response = await request(app).post("/auth/login").send({ email, password: PASSWORD });
  expect(response.status).toBe(200);
  return response.body.token;
}

describe("La Morada API integration", () => {
  test("health endpoint responds", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("register creates a patient and its associated cart", async () => {
    const response = await registerPatient("2000000001", "paciente@lamorada.test");
    expect(response.status).toBe(201);
    expect(await Cart.findOne({ user_id: "2000000001" })).not.toBeNull();
  });

  test("cart persists products for the authenticated patient", async () => {
    await registerPatient("2000000001", "paciente@lamorada.test");
    const token = await login("paciente@lamorada.test");
    const product = await Product.create({
      title: "Habitos atomicos",
      author: "James Clear",
      publish_year: 2018,
      price: 65000,
      cover_url: "https://example.test/cover.jpg",
    });

    const add = await request(app)
      .post("/cart/add")
      .set("Authorization", `Bearer ${token}`)
      .send({ product_id: product._id, quantity: 2 });
    expect(add.status).toBe(200);

    const get = await request(app).get("/cart").set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.cart.products_id).toHaveLength(1);
    expect(get.body.cart.total).toBe(130000);
  });

  test("psychologist can confirm own appointment and another patient cannot alter it", async () => {
    const psychologist = await createPsychologist();
    await registerPatient("2000000001", "paciente@lamorada.test");
    await registerPatient("2000000002", "otro@lamorada.test", "Mario");

    const psychologistToken = await login(psychologist.email);
    const patientToken = await login("paciente@lamorada.test");
    const otherToken = await login("otro@lamorada.test");

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

    const create = await request(app)
      .post("/appointment")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ psychologist_id: psychologist._id, start: future.toISOString() });
    expect(create.status).toBe(201);

    const appointmentId = create.body.appointment._id;
    const confirm = await request(app)
      .put(`/appointment/${appointmentId}/status`)
      .set("Authorization", `Bearer ${psychologistToken}`)
      .send({ status: "confirmada" });
    expect(confirm.status).toBe(200);
    expect(confirm.body.appointment.status).toBe("confirmada");

    const forbidden = await request(app)
      .delete(`/appointment/${appointmentId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(forbidden.status).toBe(403);
  });

  test("payment reference stores only last four digits and checkout clears the cart", async () => {
    await registerPatient("2000000001", "paciente@lamorada.test");
    const token = await login("paciente@lamorada.test");
    const product = await Product.create({
      title: "Recurso de prueba",
      author: "Equipo QA",
      publish_year: 2026,
      price: 50000,
      cover_url: "https://example.test/test.jpg",
    });

    await request(app)
      .post("/cart/add")
      .set("Authorization", `Bearer ${token}`)
      .send({ product_id: product._id, quantity: 1 });

    const payment = await request(app)
      .post("/payment")
      .set("Authorization", `Bearer ${token}`)
      .send({
        card_number: "4242424242424242",
        card_name: "Camila Rojas",
        expiration_date: "12/30",
        cvv: "123",
      });

    expect(payment.status).toBe(201);
    expect(payment.body.payment.card_last4).toBe("4242");
    expect(payment.body.payment.card_number).toBeUndefined();
    expect(payment.body.payment.cvv).toBeUndefined();

    const checkout = await request(app)
      .post("/payment/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ payment_id: payment.body.payment._id });
    expect(checkout.status).toBe(200);
    expect(checkout.body.transaction.status).toBe("simulated_approved");

    const cart = await request(app).get("/cart").set("Authorization", `Bearer ${token}`);
    expect(cart.body.cart.products_id).toHaveLength(0);
  });
});