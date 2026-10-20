
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AppointmentComponent } from '../../pages/appointment/appointment.component';
import { AppointmentService } from '../../services/appointment.service';
import { AvailabilityService } from '../../services/availability.service';
import { PostEditorComponent } from '../../pages/post/post-editor.component';
import { PostApiService } from '../../services/post-api.service';
import { UserService } from '../../services/user.service';
import { CartComponent } from '../../pages/cart/cart.component';
import { CartService } from '../../services/cart.service';

describe('David · componentes', () => {
  afterEach(() => { TestBed.resetTestingModule(); localStorage.removeItem('post_editor_draft_v1'); });

  describe('F14/F15/F16 citas', () => {
    let f: ComponentFixture<AppointmentComponent>; let citas: jasmine.SpyObj<any>;
    const cita = () => ({ _id: 'cita-academica', patient_id: '2000000201', psychologist_id: '1000000201', day: 'lunes', start: '10:00', end: '11:00', status: 'pendiente' as const });
    beforeEach(async () => {
      citas = jasmine.createSpyObj('AppointmentService', ['getAll', 'updateStatus', 'delete']); citas.getAll.and.returnValue(of({ appointments: [cita()] }));
      await TestBed.configureTestingModule({ imports: [AppointmentComponent], providers: [provideHttpClient(), { provide: AppointmentService, useValue: citas }, { provide: AvailabilityService, useValue: {} }] }).compileComponents();
      // Angular obtiene los hooks del prototipo; se sustituye antes de construir el componente.
      // El listado y sus botones se prueban sin las consultas de catálogos de ngOnInit.
      spyOn(AppointmentComponent.prototype, 'ngOnInit');
      f = TestBed.createComponent(AppointmentComponent);
      f.componentInstance.loading = false; f.componentInstance.role = 'patient'; f.detectChanges();
    });
    it('D-COMP-01 · F14 · objetivo: representar citas cargadas; esperado: fila con hora y estado pendiente', () => {
      f.componentInstance.refreshList(); f.detectChanges();
      const fila = f.nativeElement.querySelector('[data-appointment-id="cita-academica"]');
      expect(fila).not.toBeNull(); expect(fila.textContent).toContain('10:00'); expect(fila.getAttribute('data-status')).toBe('pendiente'); expect(f.componentInstance.listing).toBeFalse();
    });
    it('D-COMP-02 · F15 · objetivo: impedir confirmación por paciente; esperado: botón profesional ausente, alerta y servicio no invocado', () => {
      f.componentInstance.refreshList(); f.detectChanges(); spyOn(window, 'alert'); f.componentInstance.setStatus(cita(), 'confirmada');
      expect(f.nativeElement.querySelector('[data-testid="appointment-confirm"]')).toBeNull(); expect(window.alert).toHaveBeenCalledWith('No tienes permisos para esa acción.'); expect(citas.updateStatus).not.toHaveBeenCalled();
    });
    it('D-COMP-03 · F15 · objetivo: representar confirmación aceptada al profesional; esperado: estado de fila confirmada', () => {
      f.componentInstance.role = 'psychologist'; f.componentInstance.appointments = [cita()]; citas.updateStatus.and.returnValue(of({ appointment: { ...cita(), status: 'confirmada' } }));
      f.componentInstance.setStatus(cita(), 'confirmada'); f.detectChanges();
      expect(citas.updateStatus).toHaveBeenCalledWith('cita-academica', 'confirmada'); expect(f.nativeElement.querySelector('[data-appointment-id="cita-academica"]').getAttribute('data-status')).toBe('confirmada');
    });
    it('D-COMP-04 · F16 · objetivo: respetar cancelación del diálogo; esperado: no llamar DELETE y conservar fila', () => {
      f.componentInstance.appointments = [cita()]; spyOn(window, 'confirm').and.returnValue(false); f.componentInstance.delete('cita-academica');
      expect(window.confirm).toHaveBeenCalledWith('¿Cancelar esta cita?'); expect(citas.delete).not.toHaveBeenCalled(); expect(f.componentInstance.appointments.length).toBe(1);
    });
    it('D-COMP-05 · F16 · objetivo: cancelar tras confirmar diálogo; esperado: servicio DELETE invocado y fila retirada', () => {
      f.componentInstance.appointments = [cita()]; spyOn(window, 'confirm').and.returnValue(true); citas.delete.and.returnValue(of({ success: true }));
      f.componentInstance.delete('cita-academica'); f.detectChanges(); expect(citas.delete).toHaveBeenCalledWith('cita-academica'); expect(f.nativeElement.querySelector('[data-appointment-id="cita-academica"]')).toBeNull();
    });
  });

  describe('F17 publicaciones', () => {
    let f: ComponentFixture<PostEditorComponent>; let publicaciones: jasmine.SpyObj<any>;
    beforeEach(async () => {
      localStorage.removeItem('post_editor_draft_v1'); publicaciones = jasmine.createSpyObj('PostApiService', ['getAllRawAuth', 'create']); publicaciones.getAllRawAuth.and.returnValue(of([]));
      const token = `h.${btoa(JSON.stringify({ user_id: '1000000201', role: 'psychologist' }))}.s`;
      await TestBed.configureTestingModule({ imports: [PostEditorComponent], providers: [{ provide: PostApiService, useValue: publicaciones }, { provide: UserService, useValue: { getToken: () => token } }] }).compileComponents();
      f = TestBed.createComponent(PostEditorComponent); f.detectChanges();
    });
    it('D-COMP-06 · F17 · objetivo: bloquear contenido corto; esperado: botón desactivado y servicio sin llamada', () => {
      f.componentInstance.form.setValue({ title: 'Título válido', content: 'corto', active: true }); f.detectChanges(); f.componentInstance.create();
      expect(f.nativeElement.querySelector('form button:not([type="button"])').disabled).toBeTrue(); expect(publicaciones.create).not.toHaveBeenCalled();
    });
    it('D-COMP-07 · F17 · objetivo: crear publicación válida; esperado: DTO correcto, confirmación visible y formulario limpio', () => {
      publicaciones.create.and.returnValue(of({ success: true })); const datos = { title: 'Publicación David', content: 'Contenido de más de diez caracteres.', active: true };
      f.componentInstance.form.setValue(datos); f.componentInstance.create(); f.detectChanges();
      expect(publicaciones.create).toHaveBeenCalledWith(datos); expect(f.nativeElement.querySelector('.banner.ok').textContent).toContain('Publicación creada.'); expect(f.componentInstance.form.controls.title.value).toBe(''); expect(f.componentInstance.saving()).toBeFalse();
    });
    it('D-COMP-08 · F17 · objetivo: explicar rechazo 403; esperado: error visible, carga terminada y contenido conservado', () => {
      publicaciones.create.and.returnValue(throwError(() => ({ status: 403 }))); f.componentInstance.form.setValue({ title: 'Publicación David', content: 'Contenido de más de diez caracteres.', active: true });
      f.componentInstance.create(); f.detectChanges(); expect(f.nativeElement.querySelector('.banner.err').textContent).toContain('No tienes permisos para esta acción.'); expect(f.componentInstance.saving()).toBeFalse(); expect(f.componentInstance.form.controls.title.value).toBe('Publicación David');
    });
  });

  describe('F26/F27 carrito', () => {
    let f: ComponentFixture<CartComponent>; let carrito: jasmine.SpyObj<any>; let estado: BehaviorSubject<any>; let respuesta: Subject<any>;
    const linea = { product_id: { _id: '650000000000000000000001', title: 'Libro de prueba', author: 'Autora académica', publish_year: 2020, cover_url: '', price: 65000 }, quantity: 2 };
    beforeEach(async () => {
      estado = new BehaviorSubject<any>({ products_id: [], total: 0 }); respuesta = new Subject<any>();
      carrito = jasmine.createSpyObj('CartService', ['getCart', 'addProduct']); carrito.cart$ = estado; carrito.getCart.and.returnValue(respuesta);
      await TestBed.configureTestingModule({ imports: [CartComponent], providers: [provideRouter([]), { provide: CartService, useValue: carrito }] }).compileComponents();
      f = TestBed.createComponent(CartComponent); f.detectChanges();
    });
    it('D-COMP-09 · F27 · objetivo: distinguir carga de carrito vacío; esperado: indicador de carga y después mensaje vacío', () => {
      expect(f.nativeElement.querySelector('[data-testid="cart-loading"]')).not.toBeNull(); expect(f.nativeElement.querySelector('.empty')).toBeNull();
      respuesta.next({ products_id: [], total: 0 }); f.detectChanges(); expect(f.componentInstance.loading).toBeFalse(); expect(f.nativeElement.querySelector('.empty').textContent).toContain('No tienes productos');
    });
    it('D-COMP-10 · F27 · objetivo: representar dos unidades y total recibido; esperado: libro, cantidad 2 y total numérico 130000', () => {
      estado.next({ products_id: [linea], total: 130000 }); respuesta.next({ products_id: [linea], total: 130000 }); f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Libro de prueba'); expect(f.nativeElement.querySelector('input[type="number"]').value).toBe('2'); expect(f.componentInstance.total).toBe(130000); expect(f.nativeElement.querySelector('tfoot td.total')).not.toBeNull();
    });
    it('D-COMP-11 · F26 · objetivo: añadir una unidad desde carrito; esperado: addProduct(id,1) y sincronización del estado', () => {
      carrito.addProduct.and.callFake(() => { estado.next({ products_id: [{ ...linea, quantity: 3 }], total: 195000 }); return of({ success: true }); });
      f.componentInstance.inc(linea); f.detectChanges(); expect(carrito.addProduct).toHaveBeenCalledWith('650000000000000000000001', 1); expect(f.componentInstance.items[0].quantity).toBe(3); expect(f.componentInstance.total).toBe(195000); expect(f.componentInstance.loading).toBeFalse();
    });
    it('D-COMP-12 · F27 · objetivo: informar fallo HTTP inicial; esperado: mensaje accesible y carga terminada', () => {
      respuesta.error({ status: 503 }); f.detectChanges(); expect(f.componentInstance.loading).toBeFalse(); expect(f.nativeElement.querySelector('[aria-live="assertive"]').textContent).toContain('No se pudo cargar el carrito');
    });
  });
});
