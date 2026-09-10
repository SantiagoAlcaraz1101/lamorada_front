import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PostEditorComponent } from './pages/post/post-editor.component';
import { PostApiService } from './services/post-api.service';
import { UserService } from './services/user.service';

// F17: creación y sus dependencias de borrador, identidad y refresco. No se prueba remove/F21.
describe('F17 - crear publicación: caminos y plantilla', () => {
  let api: jasmine.SpyObj<PostApiService>;
  let user: jasmine.SpyObj<UserService>;
  const token = (data: unknown) => `header.${btoa(JSON.stringify(data))}.signature`;
  function make(platform = 'browser') {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform },
      { provide: PostApiService, useValue: api }, { provide: UserService, useValue: user }] });
    return TestBed.runInInjectionContext(() => new PostEditorComponent());
  }
  function valid(component: PostEditorComponent) {
    component.form.setValue({ title: 'Título de prueba', content: 'Contenido académico.', active: true });
  }
  beforeEach(() => {
    localStorage.removeItem('post_editor_draft_v1');
    api = jasmine.createSpyObj('PostApiService', ['create', 'getAllRawAuth']);
    api.create.and.returnValue(of({ success: true })); api.getAllRawAuth.and.returnValue(of([]));
    user = jasmine.createSpyObj('UserService', ['getToken']);
    user.getToken.and.returnValue(token({ user_id: 'ps1', role: 'psychologist' }));
  });
  afterEach(() => {
    if (jasmine.isSpy(Storage.prototype.removeItem)) (Storage.prototype.removeItem as jasmine.Spy).and.callThrough();
    localStorage.removeItem('post_editor_draft_v1');
  });
  it('F17-F-P1 SSR no consulta ni crea', () => {
    const c = make('server'); valid(c); c.create(); c.fetchMine();
    expect(api.getAllRawAuth).not.toHaveBeenCalled(); expect(api.create).not.toHaveBeenCalled();
  });
  it('F17-F-P2 formulario inválido no envía y marca controles', () => {
    const c = make(); c.create();
    expect(api.create).not.toHaveBeenCalled(); expect(c.form.controls.title.touched).toBeTrue();
  });
  for (const [titleLength, contentLength, accepted] of [[160, 10, true], [161, 10, false], [1, 9, false], [0, 10, false]] as const) {
    it(`F17-F-V límites título=${titleLength}, contenido=${contentLength}`, () => {
      const c = make(); c.form.setValue({ title: 'T'.repeat(titleLength), content: 'C'.repeat(contentLength), active: false });
      expect(c.form.valid).toBe(accepted); c.create();
      expect(api.create.calls.count()).toBe(accepted ? 1 : 0);
    });
  }
  it('F17-F-P3 éxito envía DTO, limpia borrador y refresca', () => {
    const c = make(); valid(c); expect(localStorage.getItem('post_editor_draft_v1')).not.toBeNull();
    c.create();
    expect(api.create).toHaveBeenCalledWith({ title: 'Título de prueba', content: 'Contenido académico.', active: true });
    expect(c.msg()).toBe('Publicación creada.'); expect(c.saving()).toBeFalse();
    expect(c.form.value.title).toBe(''); expect(localStorage.getItem('post_editor_draft_v1')).toBeNull();
    expect(api.getAllRawAuth).toHaveBeenCalledTimes(2);
  });
  for (const [status, message] of [[401, 'Tu sesión expiró o no estás autenticado.'], [403, 'No tienes permisos para esta acción.'],
    [404, 'Endpoint de creación no encontrado.'], [500, 'No se pudo crear la publicación.']] as const) {
    it(`F17-F-P4 error ${status} mantiene el borrador y libera saving`, () => {
      api.create.and.returnValue(throwError(() => ({ status })));
      const c = make(); valid(c); c.create();
      expect(c.err()).toBe(message); expect(c.saving()).toBeFalse();
      expect(c.form.value.title).toBe('Título de prueba'); expect(localStorage.getItem('post_editor_draft_v1')).not.toBeNull();
    });
  }
  it('F17-F-P5 muestra mensaje de validación recibido del servidor', () => {
    api.create.and.returnValue(throwError(() => ({ status: 400, error: { message: 'Título inválido' } })));
    const c = make(); valid(c); c.create(); expect(c.err()).toBe('Título inválido');
  });
  it('F17-F-P6 atajo no duplica solicitud pendiente', () => {
    const pending = new Subject<any>(); api.create.and.returnValue(pending);
    const c = make(); c.submitShortcut(); expect(api.create).not.toHaveBeenCalled();
    valid(c); c.submitShortcut(); c.submitShortcut();
    expect(api.create).toHaveBeenCalledTimes(1); expect(c.saving()).toBeTrue();
    pending.next({}); pending.complete(); expect(c.saving()).toBeFalse();
  });
  for (const draft of ['not-json', 'null', '12', '{}', '{"title":"Borrador","content":"Texto de prueba","active":false}']) {
    it(`F17-F-P7 restaura de forma tolerante el borrador ${draft}`, () => {
      localStorage.setItem('post_editor_draft_v1', draft);
      const c = make(); expect(api.create).not.toHaveBeenCalled();
      expect(c.form.value.title).toBe(draft.includes('Borrador') ? 'Borrador' : '');
    });
  }
  it('F17-F-P8 bloqueo de almacenamiento no impide crear', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'removeItem').and.throwError('blocked');
    const c = make(); valid(c); c.create(); expect(c.msg()).toBe('Publicación creada.');
  });
  it('F17-F-P9 filtra el refresco por autor, admite referencia poblada', () => {
    api.getAllRawAuth.and.returnValue(of([{ _id: 'a', psychologist_id: 'ps1' }, { _id: 'b', psychologist_id: { _id: 'ps1' } },
      { _id: 'c', psychologist_id: 'otro' }, { _id: 'd' }]));
    const c = make(); expect(c.myPosts().map(p => p._id)).toEqual(['a', 'b']);
    expect(c.loading()).toBeFalse();
  });
  it('F17-F-P10 error al refrescar no deja cargando', () => {
    api.getAllRawAuth.and.returnValue(throwError(() => new Error('offline')));
    const c = make(); expect(c.err()).toBe('No se pudieron cargar tus publicaciones.');
    expect(c.loading()).toBeFalse();
  });
  it('F17-F-P10b respuesta de refresco no iterable se presenta como lista vacía', () => {
    api.getAllRawAuth.and.returnValue(of(null as any));
    const c = make(); expect(c.myPosts()).toEqual([]); expect(c.loading()).toBeFalse();
  });
  for (const [identity, expectedId] of [[null, null], ['malformed', null], [token({ user: { id: 'ps1', role: 'psychologist' } }), 'ps1'], [token({ role: 'patient' }), null]]) {
    it(`F17-F-P11 identidad alternativa ${identity?.slice(0, 12) ?? 'ausente'}`, () => {
      user.getToken.and.returnValue(identity); const c = make();
      expect(c.meId).toBe(expectedId);
      expect(api.create).not.toHaveBeenCalled();
    });
  }
  it('F17-F-P12 plantillas y contadores actualizan el contenido sin publicar', () => {
    const c = make();
    for (const key of ['respiro', 'mind', 'tips'] as const) c.insertTemplate(key);
    expect(c.words).toBeGreaterThan(10); expect(c.contentLen).toBe(c.form.value.content?.length ?? 0);
    c.form.patchValue({ content: 'a\n', title: 'T'.repeat(160) }); c.insertTemplate('tips');
    expect(c.titlePct).toBe(100); expect(api.create).not.toHaveBeenCalled();
  });
  it('F17-UI el formulario real muestra validación y confirmación de creación', () => {
    TestBed.configureTestingModule({ imports: [PostEditorComponent], providers: [
      { provide: PostApiService, useValue: api }, { provide: UserService, useValue: user }] });
    const fixture = TestBed.createComponent(PostEditorComponent); fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    expect(form.querySelector('button:not([type])')?.hasAttribute('disabled')).toBeTrue();
    valid(fixture.componentInstance); fixture.detectChanges();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Publicación creada.');
    expect(api.create).toHaveBeenCalledTimes(1); fixture.destroy();
  });
});
