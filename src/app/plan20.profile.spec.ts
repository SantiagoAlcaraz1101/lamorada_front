import { FormBuilder } from '@angular/forms';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ProfileEditComponent } from './pages/profile-edit/profile-edit.component';
import { UserService } from './services/user.service';

// Plan 2.0 F07, BP02/BP03: reglas y mensajes de la pantalla existente.
describe('F07 - perfil propio: caminos y plantilla', () => {
  const profile = { id: '2000000001', role: 'patient', name: 'Camila', email: 'camila@lamorada.test', phone: '3000000001', age: 25 };
  let user: jasmine.SpyObj<UserService>;
  let router: jasmine.SpyObj<any>;
  let component: ProfileEditComponent;
  beforeEach(() => {
    user = jasmine.createSpyObj('UserService', ['profileFromToken', 'getToken', 'getMe', 'updateMeCompat', 'setName']);
    user.profileFromToken.and.returnValue(profile);
    user.getMe.and.returnValue(of({ _id: profile.id, ...profile }));
    user.updateMeCompat.and.returnValue(of({ success: true }));
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    component = new ProfileEditComponent(new FormBuilder(), user, router);
    component.hasIdentity = true;
    component.role = 'patient';
    component.form.patchValue({ name: 'Laura', email: 'laura@lamorada.test', phone: '3110000000', age: 30,
      password: 'Nueva123!', rePassword: 'Nueva123!' });
    spyOn(window, 'alert');
  });
  afterEach(() => component.ngOnDestroy());
  it('F07-F-P1 sin identidad redirige y no actualiza', () => {
    component.hasIdentity = false; component.submit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-up');
    expect(user.updateMeCompat).not.toHaveBeenCalled();
  });
  it('F07-F-P2 formulario inválido marca campos y no envía', () => {
    component.form.controls.email.setValue('inválido'); component.submit();
    expect(component.form.controls.email.touched).toBeTrue();
    expect(user.updateMeCompat).not.toHaveBeenCalled();
  });
  for (const [password, confirmation] of [
    ['', ''], [null, null], ['Nueva123!', ''], ['Nueva123!', 'Diferente1!'],
    ['Aa1!', 'Aa1!'], ['abcdefg1!', 'abcdefg1!'], ['ABCDEFG1!', 'ABCDEFG1!'],
    ['Abcdefgh!', 'Abcdefgh!'], ['Abcdefg12', 'Abcdefg12'],
  ]) {
    it(`F07-F-P3 rechaza par de contraseñas ${password || 'vacío'} / ${confirmation || 'vacío'}`, () => {
      component.form.patchValue({ password, rePassword: confirmation }); component.submit();
      expect(window.alert).toHaveBeenCalled();
      expect(user.updateMeCompat).not.toHaveBeenCalled();
      expect(component.saving).toBeFalse();
    });
  }
  it('F07-F-P4 guarda paciente sin specialty y vuelve a cargar', fakeAsync(() => {
    component.form.controls.name.setValue(' Laura ');
    component.submit();
    expect(user.updateMeCompat).toHaveBeenCalledWith({ name: 'Laura', email: 'laura@lamorada.test', phone: '3110000000', age: 30,
      password: 'Nueva123!', rePassword: 'Nueva123!' });
    expect(user.setName).toHaveBeenCalledWith('Laura');
    expect(component.saving).toBeFalse();
    tick(1500);
    expect(user.getMe).toHaveBeenCalledTimes(1);
    tick();
  }));
  it('F07-GAP01 psicólogo envía specialty: contrato que la API actualmente rechaza', fakeAsync(() => {
    component.role = 'psychologist'; component.form.controls.specialty.setValue(' Ansiedad ');
    component.submit();
    expect(user.updateMeCompat.calls.mostRecent().args[0].specialty).toBe('Ansiedad');
    tick(1500); tick();
  }));
  it('F07-F-P5 omite edad vacía y admite el límite mínimo de contraseña', fakeAsync(() => {
    component.form.patchValue({ age: null, password: 'Abcdef1!', rePassword: 'Abcdef1!' });
    component.submit();
    expect(user.updateMeCompat.calls.mostRecent().args[0].age).toBeUndefined();
    tick(1500); tick();
  }));
  it('F07-F-P6 respuesta sin ID no muestra éxito ni actualiza el nombre', () => {
    user.updateMeCompat.and.returnValue(of({ error: 'NO_ID_IN_TOKEN' })); component.submit();
    expect(window.alert).toHaveBeenCalledWith('Tu sesión no incluye ID de usuario. Vuelve a iniciar sesión.');
    expect(user.setName).not.toHaveBeenCalled();
  });
  for (const [message, expected] of [
    ['PASSWORD_MISMATCH', 'Las contraseñas no coinciden.'],
    ['INVALID PASSWORD', 'La contraseña no cumple la política.'],
    ['FIELDS NOT UPDATABLE', 'Algunos campos no pueden modificarse.'],
    ['USER NOT FOUND', 'No se encontró el usuario.'],
    ['', 'No se pudo actualizar el perfil.'],
  ]) {
    it(`F07-F-P7 fallo ${message || 'desconocido'} restablece saving`, () => {
      user.updateMeCompat.and.returnValue(throwError(() => ({ error: { message } })));
      component.submit();
      expect(window.alert).toHaveBeenCalledWith(expected);
      expect(component.saving).toBeFalse();
    });
  }
  it('F07-F-P8 mantiene saving mientras espera la respuesta', fakeAsync(() => {
    const pending = new Subject<any>(); user.updateMeCompat.and.returnValue(pending);
    component.submit(); expect(component.saving).toBeTrue();
    pending.next({ success: true }); pending.complete(); expect(component.saving).toBeFalse();
    tick(1500); tick();
  }));
  it('F07-F-P9 carga datos desde token y completa con API', fakeAsync(() => {
    user.getMe.and.returnValue(of({ _id: profile.id, name: 'Actual', speciality: 'Infancia' }));
    component.ngOnInit(); tick();
    expect(component.form.controls.name.value).toBe('Actual');
    expect(component.form.controls.specialty.value).toBe('Infancia');
    expect(component.hasIdentity).toBeTrue(); expect(component.loading).toBeFalse();
  }));
  it('F07-F-P10 sin identidad conserva formulario recuperable aunque API falle', fakeAsync(() => {
    user.profileFromToken.and.returnValue({} as any);
    user.getMe.and.returnValue(throwError(() => new Error('offline')));
    component.fetch(); tick();
    expect(component.role).toBe('unknown'); expect(component.missingDoc).toBeTrue();
    expect(component.loading).toBeFalse(); component.createNow();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-up');
  }));
  it('F07-F-P11 SSR no consulta API y libera suscripción al destruir', () => {
    spyOnProperty(component as any, 'isBrowser', 'get').and.returnValue(false);
    component.fetch();
    expect(user.getMe).not.toHaveBeenCalled(); expect(component.loading).toBeFalse();
    component.createNow(); expect(component.missingDoc).toBeFalse();
  });
  it('F07-F-P12 nueva carga cancela la consulta anterior y destroy la actual', () => {
    const pending = new Subject<any>(); user.getMe.and.returnValue(pending);
    component.fetch(); expect(pending.observed).toBeTrue();
    component.ngOnDestroy(); expect(pending.observed).toBeFalse();
  });
  it('F07-UI formulario real enlaza campos y muestra la identidad', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [ProfileEditComponent], providers: [provideRouter([]), { provide: UserService, useValue: user }] });
    const fixture = TestBed.createComponent(ProfileEditComponent);
    fixture.detectChanges(); tick(); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="name"]');
    expect(input.value).toBe('Camila');
    expect(fixture.nativeElement.querySelector('[formControlName="password"]')).not.toBeNull();
    fixture.destroy();
  }));
});
