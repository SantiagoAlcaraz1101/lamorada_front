
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { SignUpComponent } from '../../auth/sign-up/sign-up.component';
import { SignInComponent } from '../../auth/sign-in/sign-in.component';
import { ProfileEditComponent } from '../../pages/profile-edit/profile-edit.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { AppointmentComponent } from '../../pages/appointment/appointment.component';
import { UserService } from '../../services/user.service';
import { AuthStateService } from '../../core/state/auth-state.service';
import { AppointmentService } from '../../services/appointment.service';
import { AvailabilityService } from '../../services/availability.service';

describe('Santiago · componentes', () => {
  afterEach(() => TestBed.resetTestingModule());

  describe('F01 registro y límite de F02', () => {
    let f: ComponentFixture<SignUpComponent>; let usuario: jasmine.SpyObj<any>; let router: Router;
    const llenar = () => f.componentInstance.form.setValue({ _id: '2000019191', document_type: 'CC', name: 'Santiago', last_name1: 'Morada', last_name2: 'Prueba', age: 30, phone: '3000000101', email: 'componente@lamorada.test', password: 'Morada123!', confirmPassword: 'Morada123!' });
    beforeEach(async () => {
      usuario = jasmine.createSpyObj('UserService', ['register']);
      await TestBed.configureTestingModule({ imports: [SignUpComponent], providers: [provideRouter([]), { provide: UserService, useValue: usuario }] }).compileComponents();
      f = TestBed.createComponent(SignUpComponent); router = TestBed.inject(Router); spyOn(router, 'navigate').and.resolveTo(true); f.detectChanges();
    });
    it('S-COMP-01 · F01 · objetivo: bloquear registro vacío; esperado: formulario inválido y ninguna llamada de registro', async () => {
      await f.componentInstance.submit();
      expect(f.componentInstance.form.invalid).toBeTrue(); expect(usuario.register).not.toHaveBeenCalled();
    });
    it('S-COMP-02 · F01 · objetivo: registrar datos válidos; esperado: payload con confirmación, éxito visible y navegación al login', fakeAsync(() => {
      usuario.register.and.returnValue(of({ success: true })); llenar(); f.componentInstance.submit(); tick(); f.detectChanges();
      expect(usuario.register).toHaveBeenCalledWith(jasmine.objectContaining({ email: 'componente@lamorada.test', rePassword: 'Morada123!' }));
      expect(f.nativeElement.textContent).toContain('Cuenta creada correctamente'); expect(f.componentInstance.loading).toBeFalse();
      tick(2500); expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
    }));
    it('S-COMP-03 · F01 · objetivo: informar un rechazo del servidor; esperado: error visible y sin navegación', async () => {
      usuario.register.and.returnValue(throwError(() => ({ status: 409, error: { message: 'Correo electrónico ya registrado' } }))); llenar();
      await f.componentInstance.submit(); f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Correo electrónico ya registrado'); expect(f.componentInstance.loading).toBeFalse(); expect(router.navigate).not.toHaveBeenCalled();
    });
    it('S-COMP-04 · F02 · PENDIENTE: falta formulario/flujo de aprobación para alta profesional', () => {
      // Marcar pendiente es distinto de afirmar que se creó un profesional.
      pending('El componente público solo registra pacientes; F02 no está implementada.');
    });
  });

  describe('F03 autenticación', () => {
    let f: ComponentFixture<SignInComponent>; let usuario: jasmine.SpyObj<any>; let router: Router;
    beforeEach(async () => {
      usuario = jasmine.createSpyObj('UserService', ['login', 'setToken', 'setRole', 'setName', 'getRole', 'getMe']); usuario.getRole.and.returnValue('patient');
      await TestBed.configureTestingModule({ imports: [SignInComponent], providers: [provideRouter([]), { provide: UserService, useValue: usuario }] }).compileComponents();
      f = TestBed.createComponent(SignInComponent); router = TestBed.inject(Router); spyOn(router, 'navigateByUrl').and.resolveTo(true); f.detectChanges();
    });
    it('S-COMP-05 · F03 · objetivo: bloquear email mal formado; esperado: botón desactivado y servicio no invocado', async () => {
      f.componentInstance.form.setValue({ email: 'invalido', password: 'Morada123!' }); f.detectChanges(); await f.componentInstance.onSubmit();
      expect(f.nativeElement.querySelector('[data-testid="signin-submit"]').disabled).toBeTrue(); expect(usuario.login).not.toHaveBeenCalled();
    });
    it('S-COMP-06 · F03 · objetivo: guardar una sesión aceptada; esperado: token guardado y navegación a /home', async () => {
      const token = `h.${btoa(JSON.stringify({ user_id: '2000000101', role: 'patient' }))}.s`; usuario.login.and.returnValue(of({ token }));
      f.componentInstance.form.setValue({ email: 'santiago@lamorada.test', password: 'Morada123!' }); await f.componentInstance.onSubmit();
      expect(usuario.setToken).toHaveBeenCalledWith(token); expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    });
    it('S-COMP-07 · F03 · objetivo: representar HTTP 401; esperado: alerta accesible de credenciales inválidas y sin navegación', async () => {
      usuario.login.and.returnValue(throwError(() => ({ status: 401 })));
      f.componentInstance.form.setValue({ email: 'santiago@lamorada.test', password: 'Incorrecta123!' }); await f.componentInstance.onSubmit(); f.detectChanges();
      const alerta = f.nativeElement.querySelector('[role="alert"]'); expect(alerta.textContent).toContain('Credenciales inválidas'); expect(alerta.getAttribute('aria-live')).toBe('assertive'); expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('S-COMP-08 · F04 · objetivo: cerrar sesión desde Header; esperado: logout, limpieza local y navegación al login', async () => {
    const usuario = jasmine.createSpyObj('UserService', ['logout', 'clearToken']); usuario.logout.and.returnValue(of({ success: true }));
    const estado = { state$: new BehaviorSubject({ isLogged: true, role: 'patient', name: 'Santiago' }), refreshFromStorage: jasmine.createSpy('refresh') };
    await TestBed.configureTestingModule({ imports: [HeaderComponent], providers: [provideRouter([]), { provide: UserService, useValue: usuario }, { provide: AuthStateService, useValue: estado }] }).compileComponents();
    const f = TestBed.createComponent(HeaderComponent); const router = TestBed.inject(Router); spyOn(router, 'navigateByUrl').and.resolveTo(true); f.detectChanges();
    await f.componentInstance.onLogout(); expect(usuario.logout).toHaveBeenCalled(); expect(usuario.clearToken).toHaveBeenCalled(); expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-in');
  });

  describe('F07 perfil', () => {
    let f: ComponentFixture<ProfileEditComponent>; let usuario: jasmine.SpyObj<any>;
    beforeEach(async () => {
      usuario = jasmine.createSpyObj('UserService', ['profileFromToken', 'getToken', 'getMe', 'updateMeCompat', 'setName']);
      usuario.profileFromToken.and.returnValue({ id: '2000000101', role: 'patient', name: 'Santiago', email: 'santiago@lamorada.test' }); usuario.getMe.and.returnValue(of({ _id: '2000000101', name: 'Santiago', email: 'santiago@lamorada.test' }));
      await TestBed.configureTestingModule({ imports: [ProfileEditComponent], providers: [provideRouter([]), { provide: UserService, useValue: usuario }] }).compileComponents();
      f = TestBed.createComponent(ProfileEditComponent); f.detectChanges(); spyOn(window, 'alert');
    });
    it('S-COMP-09 · F07 · objetivo: impedir contraseña distinta; esperado: alerta y ninguna actualización', () => {
      f.componentInstance.form.patchValue({ password: 'Morada123!', rePassword: 'Otra123!' }); f.componentInstance.submit();
      expect(window.alert).toHaveBeenCalledWith('Las contraseñas no coinciden.'); expect(usuario.updateMeCompat).not.toHaveBeenCalled();
    });
    it('S-COMP-10 · F07 · objetivo: enviar confirmación requerida por API; esperado: password/rePassword y alerta de éxito', fakeAsync(() => {
      usuario.updateMeCompat.and.returnValue(of({ success: true })); f.componentInstance.form.patchValue({ name: 'Santiago Actualizado', password: 'Morada123!', rePassword: 'Morada123!' }); f.componentInstance.submit();
      expect(usuario.updateMeCompat).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Santiago Actualizado', password: 'Morada123!', rePassword: 'Morada123!' }));
      expect(window.alert).toHaveBeenCalledWith('Perfil actualizado correctamente ✅'); expect(f.componentInstance.saving).toBeFalse(); tick(1500);
    }));
  });

  it('S-COMP-11 · F13 · objetivo: bloquear formulario de cita incompleto; esperado: formulario inválido y servicio create sin invocar', async () => {
    const citas = jasmine.createSpyObj('AppointmentService', ['create', 'getAll']); citas.getAll.and.returnValue(of({ appointments: [] }));
    await TestBed.configureTestingModule({ imports: [AppointmentComponent], providers: [provideHttpClient(), { provide: AppointmentService, useValue: citas }, { provide: AvailabilityService, useValue: {} }] }).compileComponents();
    const f = TestBed.createComponent(AppointmentComponent);
    f.componentInstance.create(); expect(f.componentInstance.form.invalid).toBeTrue(); expect(citas.create).not.toHaveBeenCalled();
  });
});
