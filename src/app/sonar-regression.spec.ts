import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { SignInComponent } from './auth/sign-in/sign-in.component';
import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { CartComponent } from './pages/cart/cart.component';
import { AppointmentComponent } from './pages/appointment/appointment.component';
import { UserService } from './services/user.service';
import { CartService, CartResponse } from './services/cart.service';
import { AppointmentService } from './services/appointment.service';
import { AvailabilityService } from './services/availability.service';

describe('Regresion de las plantillas corregidas por SonarQube', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(),
      { provide: UserService, useValue: {} },
      { provide: AppointmentService, useValue: {} },
      { provide: AvailabilityService, useValue: {} }],
  }));

  it('asocia las etiquetas con los dos campos de inicio de sesion', () => {
    const fixture = TestBed.createComponent(SignInComponent);
    fixture.detectChanges();
    const controls: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('[formControlName]');
    expect(controls).toHaveSize(2);
    controls.forEach(control => expect(control.labels?.length).toBe(1));
    expect(fixture.nativeElement.querySelector('form button').disabled).toBeTrue();
  });

  it('asocia las etiquetas con los diez campos de registro', () => {
    const fixture = TestBed.createComponent(SignUpComponent);
    fixture.detectChanges();
    const controls: NodeListOf<HTMLInputElement | HTMLSelectElement> = fixture.nativeElement.querySelectorAll('[formControlName]');
    expect(controls).toHaveSize(10);
    controls.forEach(control => expect(control.labels?.length).toBe(1));
    expect(fixture.componentInstance.form.invalid).toBeTrue();
  });

  it('pinta el carrito persistido y cambia al estado vacio', () => {
    const state = new BehaviorSubject<CartResponse>({ products_id: [{
      product_id: { _id: 'book-1', title: 'Libro de prueba', author: 'Autora',
        publish_year: 2026, price: 20000, cover_url: '' }, quantity: 2,
    }], total: 40000 });
    const getCart = jasmine.createSpy('getCart').and.returnValue(of(state.value));
    TestBed.overrideProvider(CartService, { useValue: { cart$: state.asObservable(), getCart } });
    const fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(getCart).toHaveBeenCalledTimes(1);
    expect(root.querySelectorAll('tbody tr')).toHaveSize(1);
    expect(root.querySelector('tbody')?.textContent).toContain('Libro de prueba');
    expect(root.querySelector('tfoot th')?.getAttribute('scope')).toBe('row');
    expect(root.querySelectorAll('tfoot th')).toHaveSize(1);
    expect(root.querySelector('tfoot td.total')?.textContent).toContain('40,000');
    state.next({ products_id: [], total: 0 });
    fixture.detectChanges();
    expect(root.querySelector('table')).toBeNull();
    expect(root.textContent).toContain('No tienes productos en el carrito.');
    state.complete();
  });

  it('conserva las acciones por rol y el estado vacio de citas', () => {
    // Solo verifica la plantilla: las peticiones y autorizaciones tienen sus suites propias.
    spyOn(AppointmentComponent.prototype, 'ngOnInit').and.stub();
    const fixture = TestBed.createComponent(AppointmentComponent);
    const component = fixture.componentInstance;
    component.loading = false;
    component.role = 'patient';
    component.appointments = [{ _id: 'a1', patient_id: 'p1', psychologist_id: 'ps1',
      day: 'lunes', start: '09:00', end: '10:00', status: 'pendiente' }];
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.list li')).toHaveSize(1);
    expect(root.querySelectorAll('.row3 button')).toHaveSize(1);
    expect(root.querySelector('[formControlName="patient_id"]')).toBeNull();
    component.role = 'psychologist';
    fixture.detectChanges();
    expect(root.querySelectorAll('.row3 button')).toHaveSize(4);
    expect(root.querySelector('[formControlName="patient_id"]')).not.toBeNull();
    component.appointments = [];
    fixture.detectChanges();
    expect(root.querySelector('.list')).toBeNull();
    expect(root.textContent).toContain('No hay citas.');
  });
});
