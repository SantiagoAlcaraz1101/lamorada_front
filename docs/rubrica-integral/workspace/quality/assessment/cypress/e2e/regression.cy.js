describe('Regresión e interfaz', () => {
  it('REG-01 navegar desde inicio al catálogo', () => {
    cy.visit('/home'); cy.contains('a', 'Ver productos').click(); cy.location('pathname').should('eq', '/product');
    cy.contains('h3', 'Habitos atomicos QA').should('be.visible');
  });
  it('REG-02 formulario inválido no envía solicitud', () => {
    let calls = 0;
    cy.intercept('POST', '**/auth/login', req => { calls++; req.continue(); });
    cy.visit('/sign-in'); cy.get('#signin-email').type('correo-invalido'); cy.get('#signin-password').type('Morada123!', { log: false });
    cy.get('[data-testid="signin-submit"]').should('be.disabled'); cy.then(() => expect(calls).eq(0));
  });
  it('REG-03 error de red visible y recuperación al buscar', () => {
    cy.intercept('GET', '**/product/all', { statusCode: 503, body: { message: 'Servicio temporalmente no disponible' } }).as('unavailable');
    cy.visit('/product'); cy.wait('@unavailable'); cy.get('[aria-live="assertive"]').should('contain', 'Servicio temporalmente no disponible');
    cy.get('#product-search').type('Habitos'); cy.get('[data-testid="product-search-submit"]').click(); cy.contains('h3', 'Habitos atomicos QA').should('be.visible'); cy.get('.banner.err').should('not.exist');
  });
  it('REG-04 rutas públicas no producen error fatal', () => {
    for (const route of ['/post', '/profile', '/podcast', '/availability', '/sign-up', '/password-request']) {
      cy.visit(route); cy.get('main').should('be.visible'); cy.get('app-header nav').should('be.visible'); cy.location('pathname').should('eq', route);
    }
  });
  it('REG-05 suscripción no anuncia un envío inexistente', () => {
    cy.visit('/home'); cy.get('.newsletter input').type('qa@lamorada.test'); cy.contains('button', 'Suscribirme').click();
    cy.get('.newsletter [aria-live="polite"]').should('contain', 'Las suscripciones aún no están disponibles');
    cy.get('.newsletter input').should('have.value', 'qa@lamorada.test');
  });
  it('UI-01 inicio móvil sin desbordamiento horizontal', () => {
    cy.viewport(375, 812); cy.visit('/home'); cy.contains('h1', 'LaMorada').should('be.visible');
    cy.document().then(d => {
      const width = d.documentElement.clientWidth;
      const result = { viewport: '375x812', route: '/home', clientWidth: width, scrollWidth: d.documentElement.scrollWidth, overflowElements: [...d.querySelectorAll('body *')].map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right, left: el.getBoundingClientRect().left })).filter(el => el.right > width + 1 || el.left < -1) };
      return cy.observe('UI-01', result).then(() => expect(result.scrollWidth).at.most(width));
    });
  });
  it('UI-02 catálogo móvil y moneda consistente', () => {
    cy.viewport(375, 812); cy.visit('/product'); cy.contains('h3', 'Habitos atomicos QA').should('be.visible');
    cy.get('.price').should('contain', 'COP'); cy.document().then(d => expect(d.documentElement.scrollWidth).at.most(d.documentElement.clientWidth));
  });
});
