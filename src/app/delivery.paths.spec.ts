import { PLATFORM_ID } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { SignInComponent } from './auth/sign-in/sign-in.component';
import { HeaderComponent } from './layout/header/header.component';
import { AppointmentComponent } from './pages/appointment/appointment.component';
import { ProductComponent } from './pages/product/product.component';
import { CartComponent } from './pages/cart/cart.component';
import { UserService } from './services/user.service';
import { CartService } from './services/cart.service';
import { AuthStateService } from './core/state/auth-state.service';

describe('Caminos exactos por función - frontend', () => {
  const registrationValues = {
    _id: '2000000001', document_type: 'CC', name: 'Camila', last_name1: 'Rojas',
    last_name2: 'Lopez', age: 25, phone: '3000000001',
    email: 'paciente@lamorada.test', password: 'Morada123!', confirmPassword: 'Morada123!',
  };

  ([
    ['F01', registrationValues],
    ['F02', { ...registrationValues, _id: '1000000002', email: 'aspirante@lamorada.test' }],
  ] as const).forEach(([feature, formValue]) => describe(feature + ' - SignUpComponent.submit (4 caminos)', () => {
    function setup() {
      const user = jasmine.createSpyObj('UserService', ['register']);
      const router = jasmine.createSpyObj('Router', ['navigate']);
      const component = new SignUpComponent(new FormBuilder(), user, router);
      return { component, user, router };
    }

    it(`${feature}-F-P1: formulario inválido termina sin registrar`, async () => {
      const { component, user } = setup();
      await component.submit();
      expect(user.register).not.toHaveBeenCalled();
    });

    it(`${feature}-F-P2: respuesta success false muestra error y termina`, async () => {
      const { component, user } = setup();
      user.register.and.returnValue(of({ success: false, message: 'ID EXISTS' }));
      component.form.setValue(formValue);
      await component.submit();
      expect(component.error).toBe('El ID ya existe.');
      expect(component.loading).toBeFalse();
    });

    it(`${feature}-F-P3: respuesta exitosa confirma y programa navegación`, async () => {
      const { component, user } = setup();
      user.register.and.returnValue(of({ success: true }));
      component.form.setValue(formValue);
      await component.submit();
      const payload = user.register.calls.mostRecent().args[0] as any;
      expect(component.msg).toContain('Cuenta creada correctamente');
      expect(payload.role).toBeUndefined();
      expect(payload.specialty).toBeUndefined();
    });

    it(`${feature}-F-P4: excepción del observable se procesa en catch`, async () => {
      const { component, user } = setup();
      user.register.and.returnValue(throwError(() => ({ error: { message: 'EMAIL EXISTS' } })));
      component.form.setValue(formValue);
      await component.submit();
      expect(component.error).toBe('Ese correo ya está registrado.');
      expect(component.loading).toBeFalse();
    });
  }));

  describe('F03 - SignInComponent.onSubmit (12 caminos)', () => {
    const credentials = { email: 'paciente@lamorada.test', password: 'Morada123!' };
    const token = (payload: any) => `cabecera.${btoa(JSON.stringify(payload))}.firma`;
    function setup(platform: Object = 'browser') {
      const user = jasmine.createSpyObj('UserService', ['login', 'setToken', 'getRole', 'setRole', 'setName', 'getMe']);
      const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
      const component = new SignInComponent(new FormBuilder(), user, router, platform);
      component.form.setValue(credentials);
      return { component, user, router };
    }

    it('F03-F-P1: condición inicial verdadera termina sin login', async () => {
      const { component, user } = setup(); component.form.reset();
      await component.onSubmit(); expect(user.login).not.toHaveBeenCalled();
    });
    it('F03-F-P2: error 401 usa la primera rama del ternario del catch externo', async () => {
      const { component, user } = setup(); user.login.and.returnValue(throwError(() => ({ status: 401 })));
      await component.onSubmit(); expect(component.err).toBe('Credenciales inválidas.');
    });
    it('F03-F-P3: otro error usa el mensaje de la segunda rama del ternario', async () => {
      const { component, user } = setup(); user.login.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Fallo controlado' } })));
      await component.onSubmit(); expect(component.err).toBe('Fallo controlado');
    });
    it('F03-F-P4: respuesta sin token termina antes de guardar sesión', async () => {
      const { component, user } = setup(); user.login.and.returnValue(of({}));
      await component.onSubmit(); expect(component.err).toContain('no devolvió token'); expect(user.setToken).not.toHaveBeenCalled();
    });
    it('F03-F-P5: token no decodificable entra al catch interno y conserva rol existente', async () => {
      const { component, user, router } = setup(); user.login.and.returnValue(of({ token: 'invalido' })); user.getRole.and.returnValue('patient');
      await component.onSubmit(); expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    });
    it('F03-F-P6: token con role y name ejecuta ambos if y omite getMe', async () => {
      const { component, user } = setup(); user.login.and.returnValue(of({ token: token({ role: 'patient', name: 'Camila' }) })); user.getRole.and.returnValue('patient');
      await component.onSubmit(); expect(user.setRole).toHaveBeenCalledWith('patient'); expect(user.setName).toHaveBeenCalledWith('Camila'); expect(user.getMe).not.toHaveBeenCalled();
    });
    it('F03-F-P7: token con role y sin name omite setName', async () => {
      const { component, user } = setup(); user.login.and.returnValue(of({ token: token({ role: 'patient' }) })); user.getRole.and.returnValue('patient');
      await component.onSubmit(); expect(user.setRole).toHaveBeenCalled(); expect(user.setName).not.toHaveBeenCalled();
    });
    it('F03-F-P8: token con name y rol local existente omite setRole y getMe', async () => {
      const { component, user } = setup(); user.login.and.returnValue(of({ token: token({ name: 'Camila' }) })); user.getRole.and.returnValue('patient');
      await component.onSubmit(); expect(user.setRole).not.toHaveBeenCalled(); expect(user.setName).toHaveBeenCalledWith('Camila'); expect(user.getMe).not.toHaveBeenCalled();
    });
    it('F03-F-P9: sin rol local, getMe devuelve role y name', async () => {
      const { component, user } = setup(); user.login.and.returnValue(of({ token: token({}) })); user.getRole.and.returnValue(null); user.getMe.and.returnValue(of({ role: 'patient', name: 'Camila' }));
      await component.onSubmit(); expect(user.setRole).toHaveBeenCalledWith('patient'); expect(user.setName).toHaveBeenCalledWith('Camila');
    });
    it('F03-F-P10: getMe devuelve solo role', async () => {
      const { component, user } = setup(); user.login.and.returnValue(of({ token: token({}) })); user.getRole.and.returnValue(null); user.getMe.and.returnValue(of({ role: 'patient' }));
      await component.onSubmit(); expect(user.setRole).toHaveBeenCalled(); expect(user.setName).not.toHaveBeenCalled();
    });
    it('F03-F-P11: getMe devuelve solo name', async () => {
      const { component, user } = setup(); user.login.and.returnValue(of({ token: token({}) })); user.getRole.and.returnValue(null); user.getMe.and.returnValue(of({ name: 'Camila' }));
      await component.onSubmit(); expect(user.setRole).not.toHaveBeenCalled(); expect(user.setName).toHaveBeenCalled();
    });
    it('F03-F-P12: error de getMe entra al catch interno y aun navega', async () => {
      const { component, user, router } = setup(); user.login.and.returnValue(of({ token: token({}) })); user.getRole.and.returnValue(null); user.getMe.and.returnValue(throwError(() => new Error('red')));
      await component.onSubmit(); expect(router.navigateByUrl).toHaveBeenCalledWith('/home'); expect(component.loading).toBeFalse();
    });
  });

  describe('F04 - HeaderComponent.onLogout (2 caminos)', () => {
    function setup(logoutResult: any) {
      const user = jasmine.createSpyObj('UserService', ['logout', 'clearToken']);
      const router = jasmine.createSpyObj('Router', ['navigateByUrl']); user.logout.and.returnValue(logoutResult);
      TestBed.resetTestingModule(); TestBed.configureTestingModule({ providers: [
        { provide: UserService, useValue: user }, { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthStateService, useValue: { state$: of({ isLogged: true, role: 'patient', name: 'Camila' }), refreshFromStorage: () => {} } },
      ] });
      return { component: TestBed.runInInjectionContext(() => new HeaderComponent()), user, router };
    }
    it('F04-F-P1: logout resuelve y continúa con limpieza y navegación', async () => {
      const { component, user, router } = setup(of({ success: true })); await component.onLogout();
      expect(user.clearToken).toHaveBeenCalled(); expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-in');
    });
    it('F04-F-P2: logout falla, catch vacío y continúa', async () => {
      const { component, user, router } = setup(throwError(() => new Error('red'))); await component.onLogout();
      expect(user.clearToken).toHaveBeenCalled(); expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-in');
    });
  });

  function appointmentSetup(platform: Object = 'browser') {
    const appointment = jasmine.createSpyObj('AppointmentService', ['create', 'getAll', 'updateStatus', 'delete']);
    const availability = jasmine.createSpyObj('AvailabilityService', ['getAvailability']);
    const cdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);
    const component = new AppointmentComponent(new FormBuilder(), {} as any, appointment, availability, cdr, platform);
    return { component, appointment, cdr };
  }
  function validAppointment(component: AppointmentComponent, role: 'patient' | 'psychologist' = 'patient') {
    component.role = role;
    component.form.setValue({ date: '2027-08-24', hour: '10:00', psychologist_id: '1000000001', patient_id: role === 'psychologist' ? '2000000001' : null });
  }
  const row = (id = 'c1', status: any = 'pendiente') => ({
    _id: id, patient_id: 'u1', psychologist_id: 'p1', day: 'lunes', start: '09:00', end: '10:00', status,
  } as any);

  describe('F13 - AppointmentComponent.create (7 caminos)', () => {
    it('F13-F-P1: fuera de browser termina inmediatamente', () => {
      const { component, appointment } = appointmentSetup('server'); component.create(); expect(appointment.create).not.toHaveBeenCalled();
    });
    it('F13-F-P2: formulario inválido se marca y termina', () => {
      const { component, appointment } = appointmentSetup(); component.create(); expect(appointment.create).not.toHaveBeenCalled();
    });
    it('F13-F-P3: psyId vacío muestra alerta', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert');
      component.form.controls.psychologist_id.clearValidators(); validAppointment(component); component.form.controls.psychologist_id.setValue(''); component.form.controls.psychologist_id.updateValueAndValidity();
      component.create(); expect(window.alert).toHaveBeenCalledWith('Selecciona un psicólogo.'); expect(appointment.create).not.toHaveBeenCalled();
    });
    it('F13-F-P4: psicólogo sin patient_id muestra alerta', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); validAppointment(component, 'psychologist'); component.form.controls.patient_id.setValue(null);
      component.create(); expect(window.alert).toHaveBeenCalledWith('Selecciona un paciente válido.'); expect(appointment.create).not.toHaveBeenCalled();
    });
    it('F13-F-P5: paciente crea cita sin patient_id explícito', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); validAppointment(component); appointment.create.and.returnValue(of({ success: true })); spyOn(component, 'refreshList');
      component.create(); expect(appointment.create.calls.mostRecent().args[0].patient_id).toBeUndefined(); expect(component.refreshList).toHaveBeenCalled();
    });
    it('F13-F-P6: psicólogo crea cita con patient_id', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); validAppointment(component, 'psychologist'); appointment.create.and.returnValue(of({ success: true })); spyOn(component, 'refreshList');
      component.create(); expect(appointment.create.calls.mostRecent().args[0].patient_id).toBe('2000000001');
    });
    it('F13-F-P7: error del observable muestra mensaje mapeado', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); validAppointment(component); appointment.create.and.returnValue(throwError(() => ({ error: { message: 'TIME ALREADY BOOKED' } })));
      component.create(); expect(window.alert).toHaveBeenCalledWith('Ya existe una cita en ese horario.'); expect(component.creating).toBeFalse();
    });
  });

  describe('F14 - AppointmentComponent.refreshList (4 caminos)', () => {
    it('F14-F-P1: respuesta array usa la rama verdadera del ternario', () => {
      const { component, appointment } = appointmentSetup(); appointment.getAll.and.returnValue(of([{ ...row('c2'), day: 'martes' }, row('c1')]));
      component.refreshList(); expect(component.appointments.map(x => x._id)).toEqual(['c1', 'c2']); expect(component.listing).toBeFalse();
    });
    it('F14-F-P2: respuesta objeto usa appointments en la rama falsa', () => {
      const { component, appointment } = appointmentSetup(); appointment.getAll.and.returnValue(of({ appointments: [row('c1')] }));
      component.refreshList(); expect(component.appointments).toHaveSize(1);
    });
    it('F14-F-P3: excepción al normalizar entra al catch interno', () => {
      const { component, appointment } = appointmentSetup(); const bad: any = {}; Object.defineProperty(bad, 'appointments', { get: () => { throw new Error('dato inválido'); } }); appointment.getAll.and.returnValue(of(bad));
      component.refreshList(); expect(component.appointments).toEqual([]); expect(component.listing).toBeFalse();
    });
    it('F14-F-P4: error del observable vacía la lista', () => {
      const { component, appointment } = appointmentSetup(); component.appointments = [row()]; appointment.getAll.and.returnValue(throwError(() => new Error('red')));
      component.refreshList(); expect(component.appointments).toEqual([]); expect(component.listing).toBeFalse();
    });
  });

  describe('F15 - AppointmentComponent.setStatus (6 caminos)', () => {
    it('F15-F-P1: paciente no puede confirmar ni completar', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); component.role = 'patient'; component.setStatus(row(), 'confirmada'); expect(appointment.updateStatus).not.toHaveBeenCalled();
    });
    it('F15-F-P2: psicólogo no reabre una cita completada', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); component.role = 'psychologist'; component.setStatus(row('c1', 'completada'), 'confirmada'); expect(appointment.updateStatus).not.toHaveBeenCalled();
    });
    it('F15-F-P3: psicólogo no cambia una cita cancelada', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); component.role = 'psychologist'; component.setStatus(row('c1', 'cancelada'), 'confirmada'); expect(appointment.updateStatus).not.toHaveBeenCalled();
    });
    it('F15-F-P4: éxito actualiza el elemento cuyo id coincide', () => {
      const { component, appointment } = appointmentSetup(); component.role = 'psychologist'; component.appointments = [row('c1'), row('c2')]; appointment.updateStatus.and.returnValue(of({ appointment: { status: 'confirmada' } }));
      component.setStatus(component.appointments[0], 'confirmada'); expect(component.appointments[0].status).toBe('confirmada');
    });
    it('F15-F-P5: el map conserva los elementos cuyo id no coincide', () => {
      const { component, appointment } = appointmentSetup(); component.role = 'psychologist'; const untouched = row('c2'); component.appointments = [row('c1'), untouched]; appointment.updateStatus.and.returnValue(of({ status: 'confirmada' }));
      component.setStatus(component.appointments[0], 'confirmada'); expect(component.appointments[1]).toBe(untouched);
    });
    it('F15-F-P6: error del observable muestra alerta', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'alert'); component.role = 'psychologist'; appointment.updateStatus.and.returnValue(throwError(() => new Error('red')));
      component.setStatus(row(), 'confirmada'); expect(window.alert).toHaveBeenCalledWith('No se pudo actualizar el estado.');
    });
  });

  describe('F16 - AppointmentComponent.delete (4 caminos)', () => {
    it('F16-F-P1: confirmación negativa termina sin llamar el servicio', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'confirm').and.returnValue(false); component.delete('c1'); expect(appointment.delete).not.toHaveBeenCalled();
    });
    it('F16-F-P2: éxito elimina el elemento cuyo id coincide', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'confirm').and.returnValue(true); component.appointments = [row('c1'), row('c2')]; appointment.delete.and.returnValue(of({}));
      component.delete('c1'); expect(component.appointments.map(x => x._id)).toEqual(['c2']);
    });
    it('F16-F-P3: el filter conserva los elementos cuyo id no coincide', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'confirm').and.returnValue(true); const untouched = row('c2'); component.appointments = [untouched]; appointment.delete.and.returnValue(of({}));
      component.delete('c1'); expect(component.appointments[0]).toBe(untouched);
    });
    it('F16-F-P4: error del observable muestra alerta', () => {
      const { component, appointment } = appointmentSetup(); spyOn(window, 'confirm').and.returnValue(true); spyOn(window, 'alert'); appointment.delete.and.returnValue(throwError(() => new Error('red')));
      component.delete('c1'); expect(window.alert).toHaveBeenCalledWith('No se pudo cancelar la cita.');
    });
  });

  describe('F26 - ProductComponent.addToCart (7 caminos)', () => {
    const product = { _id: 'p1', title: 'Libro', author: 'Autor', publish_year: 2026, price: 50000, cover_url: 'portada' };
    function setup(platform: Object = 'browser') {
      const prod = jasmine.createSpyObj('ProductService', ['getAll']); const cart = jasmine.createSpyObj('CartService', ['addProduct']);
      return { component: new ProductComponent(prod, cart, platform), cart };
    }
    afterEach(() => localStorage.removeItem('token'));
    it('F26-F-P1: fuera de browser termina inmediatamente', async () => {
      const { component, cart } = setup('server'); await component.addToCart(product); expect(cart.addProduct).not.toHaveBeenCalled();
    });
    it('F26-F-P2: usuario no autenticado termina con mensaje', async () => {
      const { component, cart } = setup(); await component.addToCart(product); expect(component.err).toContain('iniciar sesión'); expect(cart.addProduct).not.toHaveBeenCalled();
    });
    it('F26-F-P3: producto sin id termina con mensaje', async () => {
      localStorage.setItem('token', 't'); const { component, cart } = setup(); await component.addToCart({ ...product, _id: '' }); expect(component.err).toContain('identificador'); expect(cart.addProduct).not.toHaveBeenCalled();
    });
    it('F26-F-P4: servicio exitoso muestra confirmación', async () => {
      localStorage.setItem('token', 't'); const { component, cart } = setup(); cart.addProduct.and.returnValue(of({})); await component.addToCart(product); expect(component.msg).toBe('Producto agregado al carrito'); expect(component.addingId).toBeNull();
    });
    it('F26-F-P5: error 401 usa el primer if del catch', async () => {
      localStorage.setItem('token', 't'); const { component, cart } = setup(); cart.addProduct.and.returnValue(throwError(() => ({ status: 401 }))); await component.addToCart(product); expect(component.err).toContain('sesión expiró');
    });
    it('F26-F-P6: error 403 usa el else if', async () => {
      localStorage.setItem('token', 't'); const { component, cart } = setup(); cart.addProduct.and.returnValue(throwError(() => ({ status: 403 }))); await component.addToCart(product); expect(component.err).toContain('permisos');
    });
    it('F26-F-P7: otro error usa el else', async () => {
      localStorage.setItem('token', 't'); const { component, cart } = setup(); cart.addProduct.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Fallo controlado' } }))); await component.addToCart(product); expect(component.err).toBe('Fallo controlado');
    });
  });

  it('F27-F-P1 - CartComponent.ngOnInit: ejecuta su único camino lineal', () => {
    const cart = jasmine.createSpyObj('CartService', ['getCart']);
    cart.cart$ = of({ products_id: [{ product_id: 'p1', quantity: 2 }], total: 100000 }); cart.getCart.and.returnValue(of({}));
    TestBed.resetTestingModule(); TestBed.configureTestingModule({ providers: [{ provide: CartService, useValue: cart }] });
    const component = TestBed.runInInjectionContext(() => new CartComponent()); component.ngOnInit();
    expect(cart.getCart).toHaveBeenCalled(); expect(component.items).toHaveSize(1); expect(component.total).toBe(100000); expect(component.loading).toBeFalse();
  });
});
