import { expect as should } from 'chai';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CartResponse, CartService } from './services/cart.service';
import { environment } from '../environments/environment';

describe('Regresión Clase 15: carrito con AAA y Fluent Assertions', () => {
  let service: CartService;
  let http: HttpTestingController;
  let previousToken: string | null;
  const url = `${environment.API_BASE}/cart`;

  beforeEach(() => {
    previousToken = localStorage.getItem('token');
    localStorage.setItem('token', 'regression-token');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (previousToken === null) localStorage.removeItem('token');
    else localStorage.setItem('token', previousToken);
    http.verify();
  });

  it('FA10 conserva el carrito persistido, la sesión y su publicación a la vista', async () => {
    // Arrange: backend HTTP simulado y observador del estado.
    const cart: CartResponse = { products_id: [{ product_id: 'book-1', quantity: 2 }], total: 40000 };
    const states: CartResponse[] = [];
    const subscription = service.cart$.subscribe(value => states.push(value));
    // Act
    const response = firstValueFrom(service.getCart());
    const request = http.expectOne(url);
    request.flush({ cart });
    const result = await response;
    subscription.unsubscribe();
    // Assert
    should(request.request.method).to.equal('GET');
    should(request.request.headers.get('Authorization')).to.equal('Bearer regression-token');
    should(result).to.deep.equal(cart);
    should(states).to.deep.equal([{ products_id: [], total: 0 }, cart]);
    should(result.products_id).to.have.lengthOf(1);
  });

  it('FA11 conserva producto y cantidad enviados al agregar al carrito', async () => {
    // Arrange
    const cart = { products_id: [{ product_id: 'book-1', quantity: 2 }], total: 40000 };
    // Act
    const response = firstValueFrom(service.addProduct('book-1', 2));
    const request = http.expectOne(`${url}/add`);
    request.flush({ cart });
    const result = await response;
    // Assert
    should(request.request.method).to.equal('POST');
    should(request.request.body).to.deep.equal({ product_id: 'book-1', quantity: 2 });
    should(result).to.deep.equal(cart);
  });

  it('FA12 vaciar el carrito también actualiza el estado observado', async () => {
    // Arrange
    const initial = firstValueFrom(service.getCart());
    http.expectOne(url).flush({ products_id: [{ product_id: 'book-1', quantity: 1 }], total: 20000 });
    await initial;
    const states: CartResponse[] = [];
    const subscription = service.cart$.subscribe(value => states.push(value));
    // Act
    const response = firstValueFrom(service.clearCart());
    const request = http.expectOne(`${url}/clear`);
    request.flush({ cart: { products_id: [], total: 0 } });
    const result = await response;
    subscription.unsubscribe();
    // Assert
    should(request.request.method).to.equal('POST');
    should(result.products_id).to.be.an('array').that.is.empty;
    should(result.total).to.equal(0);
    should(states).to.have.lengthOf(2);
    should(states[1]).to.deep.equal({ products_id: [], total: 0 });
  });

  it('FA13 un fallo HTTP conserva el carrito previo y llega al consumidor', async () => {
    // Arrange
    const cart = { products_id: [{ product_id: 'book-1', quantity: 1 }], total: 20000 };
    const initial = firstValueFrom(service.getCart());
    http.expectOne(url).flush(cart);
    await initial;
    const states: CartResponse[] = [];
    const subscription = service.cart$.subscribe(value => states.push(value));
    // Act: capturar ambos resultados evita falsos positivos si no se rechaza.
    const response = firstValueFrom(service.removeProduct('book-1')).then(
      value => ({ succeeded: true, status: 200, value }),
      error => ({ succeeded: false, status: error.status, value: undefined }),
    );
    http.expectOne(`${url}/remove`).flush('No disponible', { status: 503, statusText: 'Unavailable' });
    const result = await response;
    subscription.unsubscribe();
    // Assert
    should(result.succeeded).to.be.false;
    should(result.status).to.equal(503);
    should(states).to.deep.equal([cart]);
  });
});
