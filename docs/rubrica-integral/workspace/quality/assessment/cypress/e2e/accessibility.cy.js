describe('Accesibilidad WCAG 2.1 A/AA — axe y comprobaciones funcionales', () => {
  for (const [id, route] of [['A11Y-01', '/home'], ['A11Y-02', '/sign-in'], ['A11Y-03', '/product'], ['A11Y-04', '/sign-up'], ['A11Y-05', '/password-request'], ['A11Y-06', '/profile'], ['A11Y-07', '/post']]) {
    it(`${id} auditoría ${route}`, () => {
      cy.visit(route); cy.get('main').should('be.visible');
      if (route === '/product') cy.contains('h3', 'Habitos atomicos QA').should('be.visible');
      cy.audit(id);
    });
  }
  it('A11Y-08 salto de teclado al contenido', () => {
    cy.visit('/home'); cy.get('.skip-link').focus().should('be.focused').click(); cy.get('#main-content').should('be.focused');
    cy.get('html').should('have.attr', 'lang', 'es');
  });
  it('A11Y-09 campos login y error accesible', () => {
    cy.visit('/sign-in'); cy.get('#signin-email').should('have.attr', 'autocomplete', 'username').focus().type('paciente@lamorada.test');
    cy.get('#signin-password').should('have.attr', 'autocomplete', 'current-password').focus().type('Incorrecta123!', { log: false });
    cy.get('[data-testid="signin-submit"]').focus().should('be.focused').click(); cy.get('[role="alert"]').should('contain', 'Credenciales inválidas'); cy.audit('A11Y-09');
  });
  it('A11Y-10 carrito autenticado', () => {
    cy.loginApi().then(token => {
      cy.api('POST', '/cart/clear', {}, token); cy.api('POST', '/cart/add', { product_id: '650000000000000000000001', quantity: 1 }, token);
      cy.visit('/cart', { onBeforeLoad(win) { win.localStorage.setItem('token', token); win.localStorage.setItem('role', 'patient'); } });
      cy.get('table').should('be.visible'); cy.audit('A11Y-10');
      cy.api('POST', '/cart/clear', {}, token);
    });
  });
});
