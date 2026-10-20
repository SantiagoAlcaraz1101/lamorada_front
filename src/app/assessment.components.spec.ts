import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { SignInComponent } from './auth/sign-in/sign-in.component';
import { UserService } from './services/user.service';
import { ProductComponent } from './pages/product/product.component';
import { ProductService } from './services/product.service';
import { CartService } from './services/cart.service';
import { CartComponent } from './pages/cart/cart.component';

describe('Componentes de aceptación de la rúbrica integral', () => {
  describe('Carrito — sincronización con la API', () => {
    let fixture: ComponentFixture<CartComponent>;
    let response: Subject<any>;
    beforeEach(async () => {
      response = new Subject<any>();
      const cart = { cart$: new BehaviorSubject({ products_id: [], total: 0 }), getCart: () => response };
      await TestBed.configureTestingModule({ imports: [CartComponent], providers: [provideRouter([]), { provide: CartService, useValue: cart }] }).compileComponents();
      fixture = TestBed.createComponent(CartComponent); fixture.detectChanges();
    });
    it('COMP-07 estado local vacío no oculta carga pendiente', () => {
      expect(fixture.componentInstance.loading).toBeTrue();
      expect(fixture.nativeElement.querySelector('[data-testid="cart-loading"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.empty')).toBeNull();
      response.next({ products_id: [], total: 0 }); fixture.detectChanges();
      expect(fixture.componentInstance.loading).toBeFalse(); expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('No tienes productos');
    });
    it('COMP-08 fallo inicial del carrito se informa y termina carga', () => {
      response.error({ status: 503 }); fixture.detectChanges();
      expect(fixture.componentInstance.loading).toBeFalse();
      expect(fixture.nativeElement.querySelector('[aria-live="assertive"]').textContent).toContain('No se pudo cargar el carrito');
    });
  });
  describe('Login — plantilla real con servicio controlado', () => {
    let fixture: ComponentFixture<SignInComponent>;
    let user: jasmine.SpyObj<any>;
    let router: Router;
    beforeEach(async () => {
      user = jasmine.createSpyObj('UserService', ['login', 'setToken', 'setRole', 'setName', 'getRole', 'getMe']);
      user.getRole.and.returnValue('patient');
      await TestBed.configureTestingModule({ imports: [SignInComponent], providers: [provideRouter([]), { provide: UserService, useValue: user }] }).compileComponents();
      fixture = TestBed.createComponent(SignInComponent); router = TestBed.inject(Router); spyOn(router, 'navigateByUrl').and.resolveTo(true); fixture.detectChanges();
    });
    it('COMP-01 formulario vacío e email inválido bloquean envío', () => {
      const c = fixture.componentInstance;
      expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
      c.form.setValue({ email: 'sin-email', password: 'Morada123!' }); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
      c.onSubmit(); expect(user.login).not.toHaveBeenCalled();
    });
    it('COMP-02 login correcto guarda token y navega', async () => {
      const token = `h.${btoa(JSON.stringify({ role: 'patient' }))}.s`;
      user.login.and.returnValue(of({ token }));
      fixture.componentInstance.form.setValue({ email: 'paciente@lamorada.test', password: 'Morada123!' });
      await fixture.componentInstance.onSubmit(); fixture.detectChanges();
      expect(user.login).toHaveBeenCalledWith('paciente@lamorada.test', 'Morada123!'); expect(user.setToken).toHaveBeenCalledWith(token); expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    });
    it('COMP-03 error 401 muestra mensaje en región de alerta', async () => {
      user.login.and.returnValue(throwError(() => ({ status: 401 })));
      fixture.componentInstance.form.setValue({ email: 'paciente@lamorada.test', password: 'Incorrecta123!' });
      await fixture.componentInstance.onSubmit(); fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alert.textContent).toContain('Credenciales inválidas'); expect(alert.getAttribute('aria-live')).toBe('assertive'); expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
    it('COMP-04 solicitud pendiente desactiva botón y anuncia carga', async () => {
      const response = new Subject<any>(); user.login.and.returnValue(response);
      fixture.componentInstance.form.setValue({ email: 'paciente@lamorada.test', password: 'Morada123!' });
      const pending = fixture.componentInstance.onSubmit(); fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('[data-testid="signin-submit"]');
      expect(button.disabled).toBeTrue(); expect(button.textContent).toContain('Entrando'); expect(button.getAttribute('aria-busy')).toBe('true');
      response.error({ status: 503 }); await pending; fixture.detectChanges(); expect(button.disabled).toBeFalse();
    });
  });
  describe('Productos — plantilla real con servicio controlado', () => {
    let fixture: ComponentFixture<ProductComponent>;
    let products: jasmine.SpyObj<any>;
    beforeEach(async () => {
      products = jasmine.createSpyObj('ProductService', ['getAll', 'getByTitle']); products.getAll.and.returnValue(of({ products: [] }));
      await TestBed.configureTestingModule({ imports: [ProductComponent], providers: [{ provide: ProductService, useValue: products }, { provide: CartService, useValue: jasmine.createSpyObj('CartService', ['addProduct']) }] }).compileComponents();
      fixture = TestBed.createComponent(ProductComponent); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    });
    it('COMP-05 catálogo vacío tiene mensaje comprensible', () => {
      expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('No encontramos productos'); expect(fixture.nativeElement.querySelector('.card')).toBeNull();
    });
    it('COMP-06 fallo HTTP permite nueva búsqueda exitosa', async () => {
      products.getByTitle.and.returnValue(throwError(() => ({ error: { message: 'Sin conexión' } })));
      fixture.componentInstance.q = 'libro'; await fixture.componentInstance.search(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.banner.err').textContent).toContain('Sin conexión');
      products.getByTitle.and.returnValue(of({ products: [{ _id: 'qa1', title: 'Libro QA', author: 'Autora', price: 65000, publish_year: 2020 }] }));
      await fixture.componentInstance.search(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('h3').textContent).toBe('Libro QA'); expect(fixture.nativeElement.querySelector('.banner.err')).toBeNull();
    });
  });
});
