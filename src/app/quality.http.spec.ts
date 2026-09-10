import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './services/user.service';
import { AppointmentService } from './services/appointment.service';
import { AvailabilityService } from './services/availability.service';
import { CartService } from './services/cart.service';
import { PostApiService } from './services/post-api.service';
import { AuthStateService } from './core/state/auth-state.service';
import { environment } from '../environments/environment';

// Contratos HTTP: se intercepta el transporte, se ejecutan los servicios reales.
describe('Contratos HTTP del alcance F01-F04 F07 F13-F17 F26-F27', () => {
  let http: HttpTestingController;
  const base = environment.API_BASE;
  const jwt = (payload: unknown) => `header.${btoa(JSON.stringify(payload))}.signature`;
  beforeEach(() => {
    for (const key of ['token', 'role', 'name']) localStorage.removeItem(key);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    for (const key of ['token', 'role', 'name']) localStorage.removeItem(key);
  });
  it('F01/F03/F04 rutas, payload y cabecera de sesión', () => {
    const user = TestBed.inject(UserService);
    user.register({ name: 'Camila' }).subscribe(r => expect(r).toEqual({ success: true }));
    const register = http.expectOne(base + '/user/register'); expect(register.request.method).toBe('POST'); register.flush({ success: true });
    user.login('a@lamorada.test', 'Morada123!').subscribe();
    const login = http.expectOne(base + '/auth/login'); expect(login.request.body.email).toBe('a@lamorada.test'); login.flush({ token: 'jwt' });
    user.setToken('jwt'); user.logout().subscribe();
    const logout = http.expectOne(base + '/auth/logout'); expect(logout.request.headers.get('Authorization')).toBe('Bearer jwt'); logout.flush({});
  });
  it('F03/F04 almacenamiento y estado se actualizan y se limpian', () => {
    const user = TestBed.inject(UserService), state = TestBed.inject(AuthStateService);
    let current: any; const sub = state.state$.subscribe(s => current = s);
    user.setToken('jwt'); user.setRole('patient'); user.setName('Camila');
    expect(user.getRole()).toBe('patient'); expect(user.getName()).toBe('Camila'); expect(current.isLogged).toBeTrue();
    state.refreshFromStorage(); expect(current.name).toBe('Camila');
    state.setAuth({}); expect(current.token).toBe('jwt');
    user.clearToken(); expect(user.getToken()).toBeNull(); expect(current.isLogged).toBeFalse(); sub.unsubscribe();
  });
  it('F03/F07 SSR no lee ni escribe almacenamiento', () => {
    const serverState = new AuthStateService('server');
    const user = new UserService(TestBed.inject(HttpClient), 'server', serverState);
    user.setToken('ignored'); user.setRole('patient'); user.setName('Ignored'); user.clearToken();
    expect(user.getToken()).toBeNull(); expect(user.getName()).toBeNull();
    serverState.refreshFromStorage();
    user.bootstrapFromToken().subscribe(r => expect(r).toEqual({}));
  });
  for (const payload of [
    { _id: 'p1', role: 'patient', name: 'Camila', email: 'c@lamorada.test', age: 25, phone: '3000000001', specialty: 'A' },
    { id: 'p1' }, { user_id: 'p1' }, { sub: 'p1' },
    { user: { _id: 'p1', role: 'patient', name: 'Camila', email: 'c@lamorada.test', age: 25, phone: '3000000001', specialty: 'A' } },
    { user: { id: 'p1' } },
  ]) {
    it(`F03/F07 reconoce identidad JWT ${JSON.stringify(payload)}`, () => {
      const user = TestBed.inject(UserService); user.setToken(jwt(payload));
      expect(user.profileFromToken(user.getToken()).id).toBe('p1');
      user.bootstrapFromToken().subscribe(r => expect(r).toEqual(jasmine.any(Object)));
    });
  }
  it('F03/F07 token ausente, sin identidad o dañado no inventa ID', () => {
    const user = TestBed.inject(UserService);
    for (const value of [null, 'broken', 'a.!.b', jwt({})]) expect(user.profileFromToken(value).id).toBeUndefined();
    user.updateMeCompat({ name: 'Laura' }).subscribe(r => expect(r.error).toBe('NO_ID_IN_TOKEN'));
    http.expectNone(r => r.method === 'PUT');
  });
  it('F07 PUT usa exclusivamente la identidad del token', () => {
    const user = TestBed.inject(UserService); user.setToken(jwt({ user_id: 'p/1', role: 'patient' }));
    user.updateMeCompat({ name: 'Laura' }).subscribe(r => expect(r.success).toBeTrue());
    const req = http.expectOne(base + '/user/p%2F1');
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual({ name: 'Laura' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + user.getToken()); req.flush({ success: true });
  });
  it('F07 propaga un rechazo de permisos sin convertirlo en éxito', () => {
    const user = TestBed.inject(UserService);
    user.updateMe('p1', {}).subscribe({ next: () => fail('No debe aprobar'), error: e => expect(e.status).toBe(403) });
    http.expectOne(base + '/user/p1').flush({ message: 'Acceso denegado' }, { status: 403, statusText: 'Forbidden' });
  });
  it('F07 perfil de paciente proviene del token sin consulta externa', () => {
    const user = TestBed.inject(UserService); user.setToken(jwt({ _id: 'p1', role: 'patient', name: 'Camila' }));
    user.getMe().subscribe(me => expect(me.name).toBe('Camila'));
    http.expectNone(base + '/user/get-psychologists');
  });
  for (const wrapper of ['users', 'psychologists', 'data']) {
    it(`F03/F07 perfil profesional admite respuesta ${wrapper}`, () => {
      const user = TestBed.inject(UserService); user.setToken(jwt({ _id: 'ps1', role: 'psychologist', name: 'Token' }));
      user.getMe().subscribe(me => expect(me._id).toBe('ps1'));
      http.expectOne(base + '/user/get-psychologists').flush({ [wrapper]: [{ _id: 'other' }, { _id: 'ps1', name: 'API' }] });
    });
  }
  it('F03/F07 falla de consulta conserva perfil base', () => {
    const user = TestBed.inject(UserService); user.setToken(jwt({ _id: 'ps1', role: 'psychologist' }));
    user.getMe().subscribe(me => expect(me._id).toBe('ps1'));
    http.expectOne(base + '/user/get-psychologists').flush({}, { status: 500, statusText: 'Error' });
  });
  for (const wrapper of ['users', 'psychologists', 'missing']) {
    it(`F13 normaliza listado de profesionales ${wrapper}`, () => {
      const user = TestBed.inject(UserService); user.getPsychologists().subscribe(r => expect(r.list).toHaveSize(wrapper === 'missing' ? 0 : 1));
      http.expectOne(base + '/user/get-psychologists').flush({ [wrapper]: [{ _id: 'ps1', name: 'Laura' }, {}] });
    });
  }
  it('F13 error de profesionales se transforma en lista vacía y conserva error', () => {
    TestBed.inject(UserService).getPsychologists().subscribe(r => { expect(r.list).toEqual([]); expect(r.error.status).toBe(500); });
    http.expectOne(base + '/user/get-psychologists').flush({}, { status: 500, statusText: 'Error' });
  });
  it('F13 consulta pacientes autenticados', () => {
    localStorage.setItem('token', 'jwt'); TestBed.inject(UserService).getPatients().subscribe();
    const req = http.expectOne(base + '/user/get-patients'); expect(req.request.headers.get('Authorization')).toBe('Bearer jwt'); req.flush([]);
  });
  it('F13-F16 servicios de cita respetan verbo, payload e identidad', () => {
    localStorage.setItem('token', 'jwt'); const svc = TestBed.inject(AppointmentService);
    svc.create({ psychologist_id: 'ps1', start: '2030-01-01T15:00:00Z' }).subscribe();
    const create = http.expectOne(base + '/appointment'); expect(create.request.method).toBe('POST'); expect(create.request.headers.get('Authorization')).toBe('Bearer jwt'); create.flush({});
    svc.getAll().subscribe(); const list = http.expectOne(base + '/appointment'); expect(list.request.method).toBe('GET'); list.flush([]);
    svc.updateStatus('a1', 'confirmada').subscribe(); const status = http.expectOne(base + '/appointment/a1/status'); expect(status.request.body).toEqual({ status: 'confirmada' }); status.flush({});
    svc.delete('a1').subscribe(); const cancel = http.expectOne(base + '/appointment/a1'); expect(cancel.request.method).toBe('DELETE'); cancel.flush({});
  });
  for (const reply of [{ availability: null }, { availability: { days: ['lunes'], slots: [] } }, { days: ['lunes'], slots: [] }, null]) {
    it(`F13 lee disponibilidad ${JSON.stringify(reply)}`, () => {
      TestBed.inject(AvailabilityService).getAvailability().subscribe(value => expect(value).toEqual((reply && 'availability' in reply ? reply.availability : reply) ?? null));
      http.expectOne(base + '/availability').flush(reply);
    });
  }
  for (const reply of [{ cart: { products_id: [], total: 12 } }, { products_id: [], total: 0 }, {}]) {
    it(`F26/F27 normaliza carrito persistido ${JSON.stringify(reply)}`, () => {
      const svc = TestBed.inject(CartService); let total = -1;
      const sub = svc.cart$.subscribe(r => total = r.total);
      svc.getCart().subscribe(r => expect(r.products_id).toEqual([]));
      http.expectOne(base + '/cart').flush(reply); expect(total).toBe('cart' in reply ? 12 : 0); sub.unsubscribe();
    });
  }
  it('F26 agrega cantidad y actualiza el estado del carrito', () => {
    localStorage.setItem('token', 'jwt'); TestBed.inject(CartService).addProduct('book1', 2).subscribe(r => expect(r.total).toBe(40000));
    const req = http.expectOne(base + '/cart/add'); expect(req.request.body).toEqual({ product_id: 'book1', quantity: 2 });
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt'); req.flush({ cart: { products_id: [{ product_id: 'book1', quantity: 2 }], total: 40000 } });
  });
  for (const status of [404, 405]) {
    it(`F17 fallback de creación solo ante ${status}`, () => {
      localStorage.setItem('token', 'jwt'); const dto = { title: 'Título', content: 'Contenido de prueba', active: false };
      TestBed.inject(PostApiService).create(dto).subscribe(r => expect(r).toEqual({ success: true }));
      http.expectOne(base + '/post/create').flush({}, { status, statusText: 'Missing' });
      const fallback = http.expectOne(base + '/post'); expect(fallback.request.method).toBe('POST'); expect(fallback.request.body).toEqual(dto);
      expect(fallback.request.headers.get('Authorization')).toBe('Bearer jwt'); fallback.flush({ success: true });
    });
  }
  it('F17 403 no reintenta ni oculta el error', () => {
    TestBed.inject(PostApiService).create({ title: 'Título', content: 'Contenido' }).subscribe({ next: () => fail('No debe aprobar'), error: e => expect(e.status).toBe(403) });
    http.expectOne(base + '/post/create').flush({}, { status: 403, statusText: 'Forbidden' }); http.expectNone(base + '/post');
  });
  it('F17 éxito directo y refresco toleran envoltorio y lista', () => {
    const svc = TestBed.inject(PostApiService);
    svc.create({ title: 'Título', content: 'Contenido' }).subscribe(r => expect(r).toEqual({ success: true }));
    http.expectOne(base + '/post/create').flush({ success: true });
    for (const reply of [[], { posts: [] }, {}]) {
      svc.getAllRawAuth().subscribe(posts => expect(posts).toEqual([])); http.expectOne(base + '/post').flush(reply);
    }
  });
});
