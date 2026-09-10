import { PLATFORM_ID } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AppointmentComponent } from './pages/appointment/appointment.component';
import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthRoleGuard } from './guards/auth-role.guard';
import { clientOnlyGuard } from './guards/client-only.guard';

describe('F13/F14 - carga y disponibilidad de la pantalla de citas', () => {
  let c: AppointmentComponent;
  let http: jasmine.SpyObj<any>, appointments: jasmine.SpyObj<any>, availability: jasmine.SpyObj<any>;
  beforeEach(() => {
    http = jasmine.createSpyObj('HttpClient', ['get']); http.get.and.returnValue(of({ users: [{ _id: 'ps1', name: 'Laura' }] }));
    appointments = jasmine.createSpyObj('AppointmentService', ['getAll']); appointments.getAll.and.returnValue(of([]));
    availability = jasmine.createSpyObj('AvailabilityService', ['getAvailability']); availability.getAvailability.and.returnValue(of(null));
    const cdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);
    c = new AppointmentComponent(new FormBuilder(), http, appointments, availability, cdr, 'browser');
    localStorage.removeItem('token');
  });
  afterEach(() => localStorage.removeItem('token'));
  for (const role of ['patient', 'psychologist']) {
    it(`F13-C01 inicio como ${role} obtiene dependencias y lista`, fakeAsync(() => {
      localStorage.setItem('token', `header.${btoa(JSON.stringify({ user_id: 'u1', role }))}.signature`);
      c.ngOnInit(); flushMicrotasks();
      expect(c.loading).toBeFalse(); expect(c.role).toBe(role); expect(c.userId).toBe('u1');
      expect(c.psychologists[0].name).toBe('Laura'); expect(appointments.getAll).toHaveBeenCalled();
      expect(availability.getAvailability.calls.count()).toBe(role === 'psychologist' ? 1 : 0);
      c.form.controls.date.setValue('2030-01-07'); c.form.controls.psychologist_id.setValue('ps1');
      expect(c.hours.length).toBeGreaterThan(0);
    }));
  }
  it('F13-C02 SSR termina carga sin HTTP', () => {
    spyOn(c, 'isBrowser').and.returnValue(false); c.ngOnInit();
    expect(c.loading).toBeFalse(); expect(http.get).not.toHaveBeenCalled();
  });
  it('F13-C03 token inválido no fabrica identidad', fakeAsync(() => {
    localStorage.setItem('token', 'invalid'); c.ngOnInit(); flushMicrotasks();
    expect(c.role).toBe('unknown'); expect(c.userId).toBeNull();
  }));
  for (const shape of ['array', 'users', 'data', 'items', 'legacy', 'none']) {
    it(`F13-C04 normaliza usuarios ${shape}`, fakeAsync(() => {
      const list = [{ id: 123, fullName: 'Laura' }, { email: 'sin-id@lamorada.test' }];
      http.get.and.returnValue(of(shape === 'array' ? list : shape === 'none' ? null : { [shape]: list }));
      c.ngOnInit(); flushMicrotasks();
      expect(c.psychologists).toHaveSize(shape === 'none' ? 0 : 1);
      if (shape !== 'none') expect(c.psychologists[0]._id).toBe('123');
    }));
  }
  it('F13-C05 disponibilidad propia filtra día y conserva hora válida', () => {
    c.role = 'psychologist'; c.myAvailability = { days: ['lunes'], slots: [{ start: '08:00', end: '10:00' }] };
    c.form.controls.date.setValue('2030-01-07'); c.regenerateHours();
    expect(c.hours).toEqual(['08:00', '09:00']); expect(c.form.controls.hour.value).toBe('08:00');
    c.form.controls.hour.setValue('09:00'); c.regenerateHours(); expect(c.form.controls.hour.value).toBe('09:00');
    c.form.controls.date.setValue('2030-01-08'); c.regenerateHours(); expect(c.hours).toEqual([]);
    expect(c.form.controls.hour.value).toBe('');
  });
  it('F13-C06 disponibilidad vacía no inventa horas', () => {
    c.role = 'psychologist'; c.myAvailability = { days: ['lunes'], slots: [] };
    c.form.controls.date.setValue('2030-01-07'); c.regenerateHours(); expect(c.hours).toEqual([]);
    c.form.controls.date.setValue(''); c.regenerateHours(); expect(c.form.controls.hour.value).toBe('');
  });
  it('F13-C07 hoy solo ofrece horas posteriores a la actual', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2030, 0, 7, 9, 15));
      c.form.controls.date.setValue('2030-01-07'); c.regenerateHours(); expect(c.hours[0]).toBe('10:00');
      jasmine.clock().mockDate(new Date(2030, 0, 7, 23, 15)); c.regenerateHours(); expect(c.hours).toEqual([]);
    } finally { jasmine.clock().uninstall(); }
  });
  it('F14-C01 ordena el listado y resuelve nombres', () => {
    appointments.getAll.and.returnValue(of({ data: [{ _id: 'b', day: 'lunes', start: '10:00' }, { _id: 'a', day: 'lunes', start: '09:00' }] }));
    c.refreshList(); expect(c.appointments.map(a => a._id)).toEqual(['a', 'b']); expect(c.listing).toBeFalse();
    c.patients = [{ _id: 'p1', name: 'Camila' }]; c.psychologists = [{ _id: 'ps1', name: 'Laura' }];
    expect(c.findUserName('p1')).toBe('Camila'); expect(c.findUserName('ps1')).toBe('Laura');
    expect(c.findUserName('missing')).toBe('missing'); expect(c.findUserName('')).toBe('');
  });
  it('F14-C02 error o forma inesperada muestran lista vacía y apagan carga', () => {
    appointments.getAll.and.returnValue(throwError(() => new Error('offline'))); c.refreshList();
    expect(c.appointments).toEqual([]); expect(c.listing).toBeFalse();
    appointments.getAll.and.returnValue(of({ appointments: 'not-array' })); c.refreshList(); expect(c.appointments).toEqual([]);
  });
});

describe('F01/F02 - ayudas de validación y mensajes del registro', () => {
  let c: SignUpComponent;
  beforeEach(() => { c = new SignUpComponent(new FormBuilder(), jasmine.createSpyObj('UserService', ['register']), jasmine.createSpyObj('Router', ['navigate'])); });
  for (const [password, score, label] of [['', 0, '–'], ['a', 0, 'Muy débil'], ['Abcdefgh', 50, 'Débil'], ['Abcdefg1', 75, 'Media'], ['Abcdefg1!', 100, 'Fuerte']] as const) {
    it(`F01/F02-V1 fuerza ${label}`, () => { c.form.controls['password'].setValue(password); expect(c.passwordStrength).toEqual({ score, label }); });
  }
  it('F01/F02-V2 mensajes distinguen campo sin tocar, requerido y patrón', () => {
    expect(c.passwordErrors).toBeNull(); c.form.controls['password'].markAsTouched(); expect(c.passwordErrors).toContain('obligatoria');
    c.form.controls['password'].setValue('weak'); expect(c.passwordErrors).toContain('8+');
    c.form.controls['password'].setValue('Morada123!'); expect(c.passwordErrors).toBeNull();
    c.form.controls['confirmPassword'].setValue('distinta'); expect(c.form.hasError('passwordsMismatch')).toBeTrue();
    expect(c.confirm.value).toBe('distinta');
  });
  it('F01/F02-V3 controles de visibilidad y logo alternativo', () => {
    c.togglePw(); c.toggleCpw(); expect(c.pwVisible).toBeTrue(); expect(c.cpwVisible).toBeTrue();
    c.togglePw(); c.toggleCpw(); expect(c.pwVisible).toBeFalse(); expect(c.cpwVisible).toBeFalse();
    c.onLogoError(); expect(c.logoUrl).toContain('data:image/svg+xml');
  });
});

describe('F03/F04 y funciones autenticadas - guardas e interceptor', () => {
  beforeEach(() => localStorage.removeItem('token'));
  afterEach(() => localStorage.removeItem('token'));
  for (const [platform, role, expected] of [['server', null, true], ['browser', null, false], ['browser', 'patient', false], ['browser', 'psychologist', true]] as const) {
    it(`GUARD01 ${platform} / ${role ?? 'sin token'}`, () => {
      const router = jasmine.createSpyObj('Router', ['navigate']);
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }, { provide: Router, useValue: router }] });
      if (role) localStorage.setItem('token', `h.${btoa(JSON.stringify({ role }))}.s`);
      const allowed = TestBed.runInInjectionContext(() => AuthRoleGuard({ data: { expectedRoles: ['psychologist'] } } as any, {} as any));
      expect(allowed).toBe(expected);
      expect(TestBed.runInInjectionContext(() => clientOnlyGuard({}, []))).toBe(platform === 'browser');
    });
  }
  it('SES-F01 interceptor añade token y guarda su renovación', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    localStorage.setItem('token', 'old');
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse({ headers: new HttpHeaders({ 'x-new-token': 'renewed' }) })));
    TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', '/appointment'), next)).subscribe();
    expect(next.calls.mostRecent().args[0].headers.get('Authorization')).toBe('Bearer old');
    expect(localStorage.getItem('token')).toBe('renewed');
  });
  for (const [platform, url] of [['browser', '/auth/login'], ['server', '/appointment']]) {
    it(`SES-F02 no añade token en ${platform} ${url}`, () => {
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
      localStorage.setItem('token', 'old'); const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse()));
      TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', url), next)).subscribe();
      expect(next.calls.mostRecent().args[0].headers.has('Authorization')).toBeFalse();
    });
  }
});
