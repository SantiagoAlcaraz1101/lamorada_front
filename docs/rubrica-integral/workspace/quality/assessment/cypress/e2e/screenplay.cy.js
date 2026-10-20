import { Actor, BrowseTheWeb, LogIn, SearchFor, AddBookToCart, Open, Click, Ensure, EnsureContains, TextOf, CurrentPath, CartQuantity } from '../screenplay';
describe('E2E — Screenplay con API, MongoDB y Redis reales', () => {
  let camila;
  beforeEach(() => { camila = Actor.named('Camila, paciente').whoCan(BrowseTheWeb.usingCypress()); });
  it('SP-01 acceso exitoso y cierre de sesión', () => {
    camila.attemptsTo(LogIn('paciente@lamorada.test', 'Morada123!'), Ensure(CurrentPath(), '/home'), EnsureContains(TextOf('nav'), 'Carrito'), Click('[data-testid="logout"]'), EnsureContains(TextOf('nav'), 'Crear cuenta'));
  });
  it('SP-02 contraseña incorrecta mantiene formulario', () => {
    camila.attemptsTo(LogIn('paciente@lamorada.test', 'Incorrecta123!'), EnsureContains(TextOf('[aria-live="assertive"]'), 'Credenciales inválidas'), Ensure(CurrentPath(), '/sign-in'));
  });
  it('SP-03 buscar libro y búsqueda alternativa sin resultados', () => {
    camila.attemptsTo(SearchFor('Habitos atomicos QA'), EnsureContains(TextOf('[data-testid="product-card"]'), 'Habitos atomicos QA'), SearchFor('ZZZsincoincidencias'), EnsureContains(TextOf('.empty'), 'No encontramos productos'));
  });
  it('SP-04 agregar aumentar eliminar y verificar carrito', () => {
    cy.loginApi().then(token => cy.api('POST', '/cart/clear', {}, token).its('status').should('eq', 200));
    camila.attemptsTo(LogIn('paciente@lamorada.test', 'Morada123!'), Ensure(CurrentPath(), '/home'), AddBookToCart(), EnsureContains(TextOf('[aria-live="polite"]'), 'Producto agregado'), Open('/cart'), Ensure(CartQuantity(), '1'), Click('[aria-label="Aumentar"]'), Ensure(CartQuantity(), '2'), EnsureContains(TextOf('tfoot'), '130,000'), Click('[data-testid="cart-remove"]'), EnsureContains(TextOf('.empty'), 'No tienes productos'));
  });
  it('SP-05 invitado no agrega ni entra a carrito privado', () => {
    camila.attemptsTo(AddBookToCart(), EnsureContains(TextOf('[aria-live="assertive"]'), 'Debes iniciar sesión'), Open('/cart'), Ensure(CurrentPath(), '/sign-in'));
  });
  it('SP-06 paciente no entra a crear productos', () => {
    camila.attemptsTo(LogIn('paciente@lamorada.test', 'Morada123!'), Ensure(CurrentPath(), '/home'), Open('/product/create'), Ensure(CurrentPath(), '/home'));
  });
});
