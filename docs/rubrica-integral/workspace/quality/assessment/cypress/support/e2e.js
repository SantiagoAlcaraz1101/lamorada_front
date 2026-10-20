Cypress.Commands.add('api', (method, route, body, token) => cy.request({ method, url: Cypress.expose('api') + route, body, failOnStatusCode: false, headers: token ? { Authorization: `Bearer ${token}` } : {} }));
Cypress.Commands.add('loginApi', (role = 'patient') => cy.api('POST', '/auth/login', { email: role === 'patient' ? 'paciente@lamorada.test' : 'psicologa@lamorada.test', password: 'Morada123!' }).then(r => {
  expect(r.status).to.equal(200); expect(r.body.token).to.be.a('string'); return r.body.token;
}));
Cypress.Commands.add('observe', (name, data) => cy.task('evidence', { name, data }));
Cypress.Commands.add('audit', name => cy.readFile('node_modules/axe-core/axe.min.js').then(source => cy.window().then(async win => {
  const script = win.document.createElement('script'); script.textContent = source; win.document.head.appendChild(script);
  const results = await win.axe.run(win.document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
  return { url: win.location.href, timestamp: new Date().toISOString(), axeVersion: results.testEngine.version, violations: results.violations, passes: results.passes.map(x => ({ id: x.id, nodes: x.nodes.length })) };
})).then(result => {
  cy.observe(name, result);
  if (Cypress.expose('phase') !== 'before') expect(result.violations, 'Violaciones WCAG A/AA detectadas por axe').to.have.length(0);
}));
afterEach(function () {
  if (Cypress.currentTest) cy.screenshot(Cypress.currentTest.title.replace(/[^\w-]+/g, '-'), { capture: 'fullPage' });
});
