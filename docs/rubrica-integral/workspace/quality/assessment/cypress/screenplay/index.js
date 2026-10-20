// Actor + habilidad + tareas + interacciones + preguntas + aserción explícita.
// Cada operación devuelve la cadena Cypress para respetar su cola y sincronización.
export class BrowseTheWeb {
  static usingCypress() { return new BrowseTheWeb(); }
  visit(path) { return cy.visit(path); }
  element(target) { return cy.get(target); }
}
export class Actor {
  constructor(name) { this.name = name; this.abilities = new Map(); }
  static named(name) { return new Actor(name); }
  whoCan(ability) { this.abilities.set(ability.constructor, ability); return this; }
  abilityTo(type) { const ability = this.abilities.get(type); if (!ability) throw new Error(`${this.name} no tiene ${type.name}`); return ability; }
  attemptsTo(...activities) { return activities.reduce((chain, activity) => chain.then(() => activity.performAs(this)), cy.wrap(null, { log: false })); }
  asks(question) { return question.answeredBy(this); }
}
export const Open = path => ({ performAs: actor => actor.abilityTo(BrowseTheWeb).visit(path) });
export const Enter = (target, value, options) => ({ performAs: actor => actor.abilityTo(BrowseTheWeb).element(target).clear().type(value, options) });
export const Click = target => ({ performAs: actor => actor.abilityTo(BrowseTheWeb).element(target).should('be.visible').and('not.be.disabled').click() });
export const LogIn = (email, password) => ({
  performAs: actor => actor.attemptsTo(Open('/sign-in'), Enter('#signin-email', email), Enter('#signin-password', password, { log: false }), Click('[data-testid="signin-submit"]')),
});
export const SearchFor = query => ({ performAs: actor => actor.attemptsTo(Open('/product'), Enter('#product-search', query), Click('[data-testid="product-search-submit"]')) });
export const AddBookToCart = () => ({ performAs: actor => actor.attemptsTo(SearchFor('Habitos atomicos QA'), Click('[data-testid="product-add"]')) });
export const TextOf = target => ({ answeredBy: actor => actor.abilityTo(BrowseTheWeb).element(target).invoke('text') });
export const CurrentPath = () => ({ answeredBy: actor => { actor.abilityTo(BrowseTheWeb); return cy.location('pathname'); } });
export const CartQuantity = () => ({ answeredBy: actor => actor.abilityTo(BrowseTheWeb).element('input[type="number"]').invoke('val') });
export const Ensure = (question, expected) => ({ performAs: actor => actor.asks(question).should(value => expect(value).to.equal(expected)) });
export const EnsureContains = (question, expected) => ({ performAs: actor => actor.asks(question).should(value => expect(value).to.contain(expected)) });
