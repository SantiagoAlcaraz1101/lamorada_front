const product = '650000000000000000000001';
describe('API real — contratos positivos y negativos', () => {
  it('API-01 salud y cabeceras', () => cy.api('GET', '/health').then(r => {
    expect(r.status).eq(200); expect(r.body).deep.eq({ status: 'ok', service: 'la-morada-back' });
    expect(r.headers['x-content-type-options']).eq('nosniff'); expect(r.headers).not.have.property('x-powered-by');
    cy.observe('API-01', { status: r.status, body: r.body, headers: r.headers });
  }));
  it('API-02 login correcto sin contraseña expuesta', () => cy.api('POST', '/auth/login', { email: 'paciente@lamorada.test', password: 'Morada123!' }).then(r => {
    expect(r.status).eq(200); expect(r.body.token).a('string'); expect(r.body.user.role).eq('patient'); expect(r.body.user).not.have.property('password');
    cy.observe('API-02', { status: r.status, role: r.body.user.role, tokenPresent: !!r.body.token, passwordExposed: 'password' in r.body.user });
  }));
  for (const [id, body, status] of [
    ['API-03', {}, 400], ['API-04', { email: 'invalido', password: 'Morada123!' }, 400],
    ['API-05', { email: 'paciente@lamorada.test', password: 'Incorrecta123!' }, 401],
    ['API-06', { email: { $ne: null }, password: 'Morada123!' }, 400],
  ]) it(`${id} rechazo de credenciales inválidas`, () => cy.api('POST', '/auth/login', body).then(r => {
    expect(r.status).eq(status); expect(r.body.success).eq(false); expect(r.body).not.have.property('token'); cy.observe(id, { status: r.status, body: r.body });
  }));
  it('API-07 catálogo y búsqueda existente', () => cy.api('GET', '/product/?title=Habitos').then(r => {
    expect(r.status).eq(200); expect(r.body.products.some(p => p._id === product)).eq(true); cy.observe('API-07', { status: r.status, count: r.body.products.length });
  }));
  it('API-08 búsqueda sin coincidencias', () => cy.api('GET', '/product/?title=ZZZsincoincidencias').then(r => {
    expect(r.status).eq(200); expect(r.body.products).deep.eq([]); cy.observe('API-08', { status: r.status, body: r.body });
  }));
  it('API-09 carrito positivo y cálculo de total', () => cy.loginApi().then(token => {
    cy.api('POST', '/cart/clear', {}, token).its('status').should('eq', 200);
    cy.api('POST', '/cart/add', { product_id: product, quantity: 2 }, token).then(r => {
      expect(r.status).eq(200); expect(r.body.cart.total).eq(130000); expect(r.body.cart.products_id[0].quantity).eq(2); cy.observe('API-09', { status: r.status, body: r.body });
    });
    cy.api('POST', '/cart/clear', {}, token).its('status').should('eq', 200);
  }));
  it('API-10 cantidad negativa no modifica carrito', () => cy.loginApi().then(token => {
    cy.api('POST', '/cart/clear', {}, token);
    cy.api('POST', '/cart/add', { product_id: product, quantity: -1 }, token).then(r => { expect(r.status).eq(400); cy.observe('API-10', { status: r.status, body: r.body }); });
    cy.api('GET', '/cart', undefined, token).its('body.cart.total').should('eq', 0);
  }));
  it('API-11 ID inválido y producto inexistente', () => cy.loginApi().then(token => {
    cy.api('POST', '/cart/add', { product_id: 'bad', quantity: 1 }, token).its('status').should('eq', 400);
    cy.api('POST', '/cart/add', { product_id: '650000000000000000000099', quantity: 1 }, token).then(r => { expect(r.status).eq(404); cy.observe('API-11', { status: r.status, body: r.body }); });
  }));
  it('SEC-01 recursos privados exigen token', () => cy.api('GET', '/cart').then(r => { expect(r.status).eq(401); cy.observe('SEC-01', { status: r.status, body: r.body }); }));
  it('SEC-02 token manipulado rechazado', () => cy.api('GET', '/cart', undefined, 'eyJ.fake.signature').then(r => { expect(r.status).eq(401); cy.observe('SEC-02', { status: r.status, body: r.body }); }));
  it('SEC-03 paciente no crea productos', () => cy.loginApi().then(token => cy.api('POST', '/product', { title: 'No autorizado' }, token).then(r => { expect(r.status).eq(403); cy.observe('SEC-03', { status: r.status, body: r.body }); })));
  it('SEC-04 logout revoca sesión', () => cy.loginApi().then(token => {
    cy.api('POST', '/auth/logout', {}, token).its('status').should('eq', 200);
    cy.api('GET', '/cart', undefined, token).then(r => { expect(r.status).eq(401); cy.observe('SEC-04', { status: r.status, body: r.body }); });
  }));
  it('SEC-05 CORS rechaza origen desconocido', () => cy.request({ url: Cypress.expose('api') + '/health', headers: { Origin: 'https://untrusted.example' }, failOnStatusCode: false }).then(r => {
    expect(r.status).eq(403); expect(r.headers).not.have.property('access-control-allow-origin'); cy.observe('SEC-05', { status: r.status, body: r.body });
  }));
  it('SEC-06 aislamiento entre carritos', () => cy.loginApi().then(patient => {
    cy.api('POST', '/cart/clear', {}, patient);
    cy.api('POST', '/cart/add', { product_id: product, quantity: 1 }, patient).its('status').should('eq', 200);
    cy.loginApi('psychologist').then(psychologist => {
      cy.api('POST', '/cart/clear', {}, psychologist);
      cy.api('GET', '/cart', undefined, psychologist).then(r => { expect(r.body.cart.products_id).deep.eq([]); cy.observe('SEC-06', { status: r.status, ownCartEmpty: true }); });
    });
    cy.api('GET', '/cart', undefined, patient).its('body.cart.total').should('eq', 65000);
    cy.api('POST', '/cart/clear', {}, patient);
  }));
});
