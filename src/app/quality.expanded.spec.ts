import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CartService } from './services/cart.service';
import { UserService } from './services/user.service';
import { PostApiService } from './services/post-api.service';
import { AvailabilityService } from './services/availability.service';
import { ProductComponent } from './pages/product/product.component';
import { ProductService } from './services/product.service';
import { CartComponent } from './pages/cart/cart.component';
import { PostEditorComponent } from './pages/post/post-editor.component';
import { ProfileEditComponent } from './pages/profile-edit/profile-edit.component';
import { HeaderComponent } from './layout/header/header.component';
import { AuthStateService } from './core/state/auth-state.service';
import { environment } from '../environments/environment';

// Rúbrica 2026-09-14: expansión de métodos compartidos, contratos BP02.
describe('Rúbrica - contratos HTTP ampliados', () => {
  let http: HttpTestingController;
  const base = environment.API_BASE;
  beforeEach(() => {
    localStorage.removeItem('token');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('token'); });
  it('F05 F06 F09 EX01 rutas y payloads reales', () => {
    // Arrange
    const svc = TestBed.inject(UserService);
    const reset = { email: 'a@lamorada.test', code: 'ABC234', newPassword: 'Nueva123!', confirmPassword: 'Nueva123!' };
    // Act + Assert por contrato, transporte interceptado sin API externa.
    svc.requestPasswordReset(reset.email).subscribe();
    const request = http.expectOne(base + '/user/request-password-reset'); expect(request.request.body).toEqual({ email: reset.email }); request.flush({});
    svc.resetPassword(reset).subscribe(); const password = http.expectOne(base + '/user/reset-password'); expect(password.request.body).toEqual(reset); password.flush({});
    svc.getPsychologistsBySpecialty('A & B').subscribe(); http.expectOne(base + '/user/by-specialty?specialty=A%20%26%20B').flush([]);
    localStorage.setItem('token', 'jwt'); svc.deleteMe().subscribe(); const remove = http.expectOne(base + '/user/delete-me'); expect(remove.request.method).toBe('DELETE'); expect(remove.request.headers.get('Authorization')).toBe('Bearer jwt'); remove.flush({});
  });
  for (const reply of [[], { posts: [{ _id: 'p1' }] }, null, {}]) {
    it(`F18 listado público normaliza ${JSON.stringify(reply)}`, () => {
      TestBed.inject(PostApiService).getPublic().subscribe(result => expect(result).toEqual((reply as any)?.posts ?? (Array.isArray(reply) ? reply : [])));
      const request = http.expectOne(base + '/post'); expect(request.request.headers.has('Authorization')).toBeFalse(); request.flush(reply);
    });
  }
  it('F20 F21 envían autor autenticado por cabecera', () => {
    localStorage.setItem('token', 'jwt'); const svc = TestBed.inject(PostApiService);
    svc.update('p1', { active: false }).subscribe(); const update = http.expectOne(base + '/post/p1'); expect(update.request.method).toBe('PUT'); expect(update.request.body).toEqual({ active: false }); update.flush({});
    svc.remove('p1').subscribe(); const remove = http.expectOne(base + '/post/p1'); expect(remove.request.method).toBe('DELETE'); expect(remove.request.headers.get('Authorization')).toBe('Bearer jwt'); remove.flush({});
  });
  it('F28 retirar y vaciar actualizan estado desde respuesta', () => {
    const svc = TestBed.inject(CartService); let state: any; const sub = svc.cart$.subscribe(value => state = value);
    svc.removeProduct('p1').subscribe(); const remove = http.expectOne(base + '/cart/remove'); expect(remove.request.body).toEqual({ product_id: 'p1' }); remove.flush({ cart: { products_id: [], total: 0 } });
    svc.clearCart().subscribe(); const clear = http.expectOne(base + '/cart/clear'); expect(clear.request.body).toEqual({}); clear.flush({ products_id: [], total: 0 });
    expect(state).toEqual({ products_id: [], total: 0 }); sub.unsubscribe();
  });
  for (const wrapped of [true, false]) {
    it(`F10 guarda disponibilidad respuesta envuelta=${wrapped}`, () => {
      const doc: any = { days: ['monday'], slots: [] };
      TestBed.inject(AvailabilityService).upsertAvailability(doc).subscribe(value => expect(value).toEqual(doc));
      const request = http.expectOne(base + '/availability'); expect(request.request.body).toEqual(doc); request.flush(wrapped ? { availability: doc } : doc);
    });
  }
  for (const days of [['monday', 'martes'], undefined]) {
    it(`F10 fallback convierte solo días conocidos ${JSON.stringify(days)}`, () => {
      const svc = TestBed.inject(AvailabilityService); const doc: any = { days, slots: [] };
      svc.upsertAvailability(doc).subscribe(value => expect(value.days).toEqual(days ? ['lunes', 'martes'] : []));
      http.expectOne(base + '/availability').flush({ message: 'Día inválido' }, { status: 400, statusText: 'Bad Request' });
      const retry = http.expectOne(base + '/availability'); expect(retry.request.body.days).toEqual(days ? ['lunes', 'martes'] : []); retry.flush({ availability: retry.request.body });
    });
  }
  it('F10 error del fallback conserva el error original', () => {
    TestBed.inject(AvailabilityService).upsertAvailability({ days: ['monday'], slots: [] } as any).subscribe({ next: () => fail('No debe aprobar'), error: e => expect(e.error.message).toBe('dia invalido') });
    http.expectOne(base + '/availability').flush({ message: 'dia invalido' }, { status: 400, statusText: 'Bad Request' });
    http.expectOne(base + '/availability').flush({}, { status: 500, statusText: 'Error' });
  });
  for (const error of [{ status: 403, message: 'dia invalido' }, { status: 400, message: 'otro error' }]) {
    it(`F10 no reintenta ${JSON.stringify(error)}`, () => {
      TestBed.inject(AvailabilityService).upsertAvailability({ days: [], slots: [] } as any).subscribe({ next: () => fail('No debe aprobar'), error: e => expect(e.status).toBe(error.status) });
      http.expectOne(base + '/availability').flush({ message: error.message }, { status: error.status, statusText: 'Error' }); http.expectNone(base + '/availability');
    });
  }
  it('F12 SSR elimina con ID codificado sin leer almacenamiento', () => {
    const svc = new AvailabilityService(TestBed.inject(HttpClient), 'server'); svc.deleteAvailability('a/b').subscribe();
    const request = http.expectOne(base + '/availability/a%2Fb'); expect(request.request.method).toBe('DELETE'); expect(request.request.headers.get('Authorization')).toBe(''); request.flush({});
  });
});

describe('Rúbrica - acciones del carrito F26 F28', () => {
  let svc: jasmine.SpyObj<CartService>; let component: CartComponent;
  beforeEach(() => {
    svc = jasmine.createSpyObj('CartService', ['addProduct', 'removeProduct', 'clearCart']);
    for (const method of ['addProduct', 'removeProduct', 'clearCart'] as const) svc[method].and.returnValue(of({ products_id: [], total: 0 }));
    TestBed.configureTestingModule({ providers: [{ provide: CartService, useValue: svc }] });
    component = TestBed.runInInjectionContext(() => new CartComponent());
  });
  for (const action of ['inc', 'dec', 'remove', 'onQtyChange'] as const) {
    it(`${action} ignora línea sin ID`, () => {
      component[action]({ product_id: undefined, quantity: 2 } as any, '2');
      expect(svc.addProduct).not.toHaveBeenCalled(); expect(svc.removeProduct).not.toHaveBeenCalled();
    });
  }
  it('inc conserva loading hasta recibir resultado', () => {
    // Arrange: stub controlable para comprobar un estado intermedio, no temporizador real.
    const pending = new Subject<any>(); svc.addProduct.and.returnValue(pending);
    // Act
    component.inc({ product_id: 'a', quantity: 1 });
    // Assert
    expect(component.loading).toBeTrue(); expect(svc.addProduct).toHaveBeenCalledWith('a', 1);
    pending.next({}); pending.complete(); expect(component.loading).toBeFalse();
  });
  it('dec con una unidad retira, con tres añade dos después de retirar', () => {
    component.dec({ product_id: 'a', quantity: 1 }); expect(svc.addProduct).not.toHaveBeenCalled();
    component.dec({ product_id: 'a', quantity: 3 }); expect(svc.addProduct).toHaveBeenCalledWith('a', 2); expect(component.loading).toBeFalse();
  });
  for (const raw of ['', '0', '4']) {
    it(`cambio de cantidad ${raw} respeta mínimo uno`, () => {
      component.onQtyChange({ product_id: 'a', quantity: 2 }, raw);
      expect(svc.addProduct).toHaveBeenCalledWith('a', raw === '4' ? 4 : 1); expect(component.loading).toBeFalse();
    });
  }
  it('remove y clear informan éxito', () => {
    component.remove({ product_id: 'a', quantity: 1 }); expect(component.msg).toBe('Producto eliminado.');
    component.clear(); expect(component.msg).toBe('Carrito vacío.'); expect(component.loading).toBeFalse();
  });
  for (const action of ['inc', 'dec', 'onQtyChange', 'remove', 'clear'] as const) {
    it(`${action} informa fallo del primer servicio y termina loading`, () => {
      const method = action === 'inc' ? 'addProduct' : action === 'clear' ? 'clearCart' : 'removeProduct';
      svc[method].and.returnValue(throwError(() => new Error('offline')));
      component[action]({ product_id: 'a', quantity: 3 }, '2');
      expect(component.err).toContain('No se pudo'); expect(component.loading).toBeFalse();
    });
  }
  for (const action of ['dec', 'onQtyChange'] as const) {
    it(`${action} informa fallo al reinsertar, sin éxito falso`, () => {
      svc.addProduct.and.returnValue(throwError(() => new Error('offline')));
      component[action]({ product_id: 'a', quantity: 3 }, '2');
      expect(component.err).toContain('No se pudo'); expect(component.loading).toBeFalse();
    });
  }
});

describe('Rúbrica - catálogo F25', () => {
  let prod: any; let component: ProductComponent;
  beforeEach(() => {
    prod = jasmine.createSpyObj('ProductService', ['getAll', 'getByTitle']); prod.getAll.and.returnValue(of([])); prod.getByTitle.and.returnValue(of([]));
    // Dummy: el carrito satisface la firma, pero catálogo no debe usarlo.
    component = new ProductComponent(prod, {} as CartService, 'browser', { markForCheck: jasmine.createSpy('markForCheck') } as any);
  });
  for (const response of [[{ _id: 'a' }], { products: [{ _id: 'a' }] }, {}]) {
    it(`carga inicial ${JSON.stringify(response)}`, async () => {
      prod.getAll.and.returnValue(of(response)); await component.ngOnInit();
      expect(component.products).toEqual(Array.isArray(response) ? response : (response as any).products ?? []); expect(component.loading).toBeFalse();
    });
  }
  it('SSR no consulta ni busca', async () => {
    component = new ProductComponent(prod, {} as CartService, 'server', { markForCheck: jasmine.createSpy('markForCheck') } as any); await component.ngOnInit(); await component.search();
    expect(prod.getAll).not.toHaveBeenCalled(); expect(prod.getByTitle).not.toHaveBeenCalled();
  });
  it('búsqueda vacía recarga catálogo', async () => {
    component.q = '  '; await component.search(); expect(prod.getAll).toHaveBeenCalledTimes(1); expect(prod.getByTitle).not.toHaveBeenCalled();
  });
  for (const response of [[{ _id: 'a' }], { products: [{ _id: 'a' }] }, { _id: 'a' }, null]) {
    it(`búsqueda normaliza ${JSON.stringify(response)}`, async () => {
      prod.getByTitle.and.returnValue(of(response)); component.q = ' Libro '; await component.search();
      expect(prod.getByTitle).toHaveBeenCalledWith('Libro'); expect(component.products.map(p => p._id)).toEqual(response ? ['a'] : []); expect(component.loading).toBeFalse();
    });
  }
  for (const action of ['ngOnInit', 'search'] as const) {
    for (const error of [{ error: { message: 'Servidor no disponible' } }, {}]) {
      it(`${action} muestra error ${JSON.stringify(error)}`, async () => {
        prod.getAll.and.returnValue(throwError(() => error)); prod.getByTitle.and.returnValue(throwError(() => error)); component.q = 'Libro';
        await component[action](); expect(component.products).toEqual([]); expect(component.err).toBe((error as any).error?.message ?? (action === 'search' ? 'No se pudo buscar' : 'No se pudieron cargar los productos')); expect(component.loading).toBeFalse();
      });
    }
  }
});

describe('Rúbrica - eliminación de publicación y cuenta', () => {
  it('EX01 cancelación no elimina ni navega', () => {
    const user = jasmine.createSpyObj('UserService', ['deleteMe']); const router = jasmine.createSpyObj('Router', ['navigate']);
    spyOn(window, 'confirm').and.returnValue(false);
    new ProfileEditComponent(new FormBuilder(), user, router).deleteAccount();
    expect(user.deleteMe).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled();
  });
  it('EX01 éxito elimina sesión y redirige', () => {
    const user = jasmine.createSpyObj('UserService', ['deleteMe', 'clearToken']); user.deleteMe.and.returnValue(of({})); const router = jasmine.createSpyObj('Router', ['navigate']);
    spyOn(window, 'confirm').and.returnValue(true); spyOn(window, 'alert');
    new ProfileEditComponent(new FormBuilder(), user, router).deleteAccount();
    expect(user.clearToken).toHaveBeenCalledTimes(1); expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
  });
  for (const error of [{ error: { message: 'No permitido' } }, { message: 'Offline' }, {}]) {
    it(`EX01 error ${JSON.stringify(error)} conserva sesión`, () => {
      const user = jasmine.createSpyObj('UserService', ['deleteMe', 'clearToken']); user.deleteMe.and.returnValue(throwError(() => error));
      spyOn(window, 'confirm').and.returnValue(true); const alert = spyOn(window, 'alert');
      new ProfileEditComponent(new FormBuilder(), user, {} as Router).deleteAccount();
      expect(alert).toHaveBeenCalledWith((error as any).error?.message || (error as any).message || 'No se pudo eliminar la cuenta.'); expect(user.clearToken).not.toHaveBeenCalled();
    });
  }
  function editor() {
    const api = jasmine.createSpyObj('PostApiService', ['remove', 'getAllRawAuth']); api.remove.and.returnValue(of({})); api.getAllRawAuth.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }, { provide: PostApiService, useValue: api }, { provide: UserService, useValue: {} }] });
    const component = TestBed.runInInjectionContext(() => new PostEditorComponent()); component.meId = 'owner'; component.isBrowser = true; return { component, api };
  }
  it('F21 no permite autor ajeno ni cancelación', () => {
    const { component, api } = editor(); const confirm = spyOn(window, 'confirm').and.returnValue(false);
    component.remove({ _id: 'a', title: 'A', content: 'B', psychologist_id: 'other' }); expect(confirm).not.toHaveBeenCalled();
    component.remove({ _id: 'a', title: 'A', content: 'B', psychologist_id: 'owner' }); expect(confirm).toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
  });
  it('F21 elimina propia y refresca', () => {
    const { component, api } = editor(); spyOn(window, 'confirm').and.returnValue(true);
    component.remove({ _id: 'a', title: 'A', content: 'B', psychologist_id: 'owner' });
    expect(api.remove).toHaveBeenCalledWith('a'); expect(api.getAllRawAuth).toHaveBeenCalledTimes(1); expect(component.msg()).toBe('Publicación eliminada.'); expect(component.loading()).toBeFalse();
  });
  for (const [error, expected] of [[{ status: 401 }, 'No autenticado.'], [{ status: 403 }, 'No autorizado (solo el autor puede eliminarla).'], [{ error: { message: 'Offline' } }, 'Offline'], [{}, 'No se pudo eliminar.']] as const) {
    it(`F21 error ${JSON.stringify(error)}`, () => {
      const { component, api } = editor(); api.remove.and.returnValue(throwError(() => error)); spyOn(window, 'confirm').and.returnValue(true);
      component.remove({ _id: 'a', title: 'A', content: 'B', psychologist_id: 'owner' });
      expect(component.err()).toBe(expected); expect(component.loading()).toBeFalse(); expect(api.getAllRawAuth).not.toHaveBeenCalled();
    });
  }
});

describe('F25 - regresión de plantilla tras fallo asíncrono', () => {
  it('muestra el error y retira carga sin requerir otro clic', async () => {
    // Arrange: componente y plantilla reales, solo transporte sustituido.
    const response = new Subject<any>();
    const prod = jasmine.createSpyObj('ProductService', ['getAll']); prod.getAll.and.returnValue(response);
    TestBed.configureTestingModule({ imports: [ProductComponent], providers: [
      { provide: ProductService, useValue: prod }, { provide: CartService, useValue: {} },
    ] });
    const fixture = TestBed.createComponent(ProductComponent); fixture.autoDetectChanges();
    // Act: error posterior al render inicial.
    response.error({ error: { message: 'Servidor no disponible QA' } });
    await fixture.whenStable();
    // Assert: DOM visible, no acceso al estado privado ni detectChanges manual.
    expect(fixture.nativeElement.querySelector('.banner.err')?.textContent).toContain('Servidor no disponible QA');
    expect(fixture.nativeElement.querySelector('.skel')).toBeNull();
    expect(fixture.nativeElement.querySelector('label[for="product-search"]')?.textContent).toContain('Buscar por título');
  });
});

describe('Rúbrica - cabecera reactiva F03 F04', () => {
  for (const platform of ['browser', 'server']) {
    it(`inicializa estado ${platform}`, () => {
      const state = { state$: of({ isLogged: true, role: 'patient', name: 'Camila' }), refreshFromStorage: jasmine.createSpy('refresh') };
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }, { provide: AuthStateService, useValue: state }, { provide: UserService, useValue: {} }, { provide: Router, useValue: {} }] });
      const component = TestBed.runInInjectionContext(() => new HeaderComponent()); component.ngOnInit();
      expect(component.name).toBe('Camila'); expect(component.isLogged).toBeTrue(); expect(state.refreshFromStorage).toHaveBeenCalledTimes(platform === 'browser' ? 1 : 0);
    });
  }
});
