import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { UserService } from '../../services/user.service';

type Role = 'patient' | 'psychologist' | 'unknown';

type MeForm = FormGroup<{
  name: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  age: FormControl<number | null>;
  specialty: FormControl<string | null>;
  password: FormControl<string | null>;
  rePassword: FormControl<string | null>;
}>;

@Component({
  standalone: true,
  selector: 'app-profile-edit',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.css'],
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  form!: MeForm;
  loading = true;
  saving = false;

  role: Role = 'unknown';
  hasIdentity = false;
  missingDoc = false;

  private sub?: Subscription;

  private get isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  constructor(private readonly fb: FormBuilder, private readonly userSrv: UserService, private readonly router: Router) {
    this.form = this.fb.group({
      name: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      phone: this.fb.control<string>('', { nonNullable: true }),
      age: this.fb.control<number | null>(null),
      specialty: this.fb.control<string | null>(null),
      password: this.fb.control<string | null>(null),
      rePassword: this.fb.control<string | null>(null),
    });
  }

  ngOnInit() {
    this.fetch();
  }
  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private safeOff() {
    this.loading = false;
    if (this.isBrowser) setTimeout(() => (this.loading = false), 0);
  }

  /** Validación de par de contraseñas */
  private validatePasswordPair(): string | null {
    const p = (this.form.controls.password.value ?? '').trim();
    const r = (this.form.controls.rePassword.value ?? '').trim();

    if (!p || !r) {
      return 'Debes escribir una contraseña válida en ambos campos (puede ser la actual).';
    }
    if (p !== r) return 'Las contraseñas no coinciden.';

    const okLen = p.length >= 8;
    const hasU = /[A-Z]/.test(p);
    const hasL = /[a-z]/.test(p);
    const hasD = /\d/.test(p);
    const hasS = /[@$!%*?&]/.test(p);
    if (!(okLen && hasU && hasL && hasD && hasS)) {
      return 'La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.';
    }
    return null;
  }

  /** Carga inicial del perfil */
  public fetch() {
    this.sub?.unsubscribe();

    const t = this.userSrv.profileFromToken(this.userSrv.getToken());
    this.role = t.role === 'patient' || t.role === 'psychologist' ? (t.role as Role) : 'unknown';
    this.hasIdentity = !!t.id;
    this.missingDoc = !this.hasIdentity;

    this.form.patchValue({
      name: String(t.name ?? ''),
      email: String(t.email ?? ''),
      phone: String(t.phone ?? ''),
      age: t.age != null ? Number(t.age) : null,
      specialty: t.specialty ?? null,
    });

    if (!this.isBrowser) {
      this.safeOff();
      return;
    }

    this.loading = true;
    this.sub = this.userSrv
      .getMe()
      .pipe(finalize(() => this.safeOff()))
      .subscribe({
        next: (me) => {
          if (me) {
            this.form.patchValue({
              name: String(me?.name ?? this.form.controls.name.value ?? ''),
              email: String(me?.email ?? this.form.controls.email.value ?? ''),
              phone: String(me?.phone ?? this.form.controls.phone.value ?? ''),
              age: me?.age != null ? Number(me?.age) : this.form.controls.age.value,
              specialty: me?.specialty ?? me?.speciality ?? this.form.controls.specialty.value,
            });
            if (me?._id) {
              this.hasIdentity = true;
              this.missingDoc = false;
            }
          }
        },
        error: () => {},
      });
  }

  createNow() {
    if (!this.hasIdentity) {
      this.router.navigateByUrl('/sign-up');
      return;
    }
    this.missingDoc = false;
  }

  /** Guardar cambios de perfil */
  submit() {
    if (!this.hasIdentity) {
      this.router.navigateByUrl('/sign-up');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const pErr = this.validatePasswordPair();
    if (pErr) {
      alert(pErr);
      return;
    }

    const raw = this.form.getRawValue();
    const data: any = {
      name: raw.name?.trim(),
      email: raw.email?.trim(),
      phone: raw.phone?.trim(),
    };
    if (raw.age != null && raw.age !== ('' as any)) data.age = Number(raw.age);
    if (this.role === 'psychologist') data.specialty = (raw.specialty ?? '').toString().trim();

    data.password = (raw.password ?? '').trim();
    data.rePassword = (raw.rePassword ?? '').trim();

    this.saving = true;
    this.userSrv
      .updateMeCompat(data)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          if (res?.error === 'NO_ID_IN_TOKEN') {
            alert('Tu sesión no incluye ID de usuario. Vuelve a iniciar sesión.');
            return;
          }
          if (data.name) this.userSrv.setName(data.name);
          alert('Perfil actualizado correctamente ✅');
          setTimeout(() => this.fetch(), 1500);
        },
        error: (err) => {
          const raw = (err?.error?.message || err?.message || '').toUpperCase();
          let msg = 'No se pudo actualizar el perfil.';
          if (raw.includes('PASSWORD_MISMATCH')) msg = 'Las contraseñas no coinciden.';
          else if (raw.includes('INVALID PASSWORD')) msg = 'La contraseña no cumple la política.';
          else if (raw.includes('FIELDS NOT UPDATABLE')) msg = 'Algunos campos no pueden modificarse.';
          else if (raw.includes('USER NOT FOUND')) msg = 'No se encontró el usuario.';
          alert(msg);
        },
      });
  }

  /** 🗑️ Eliminar cuenta del usuario */
  deleteAccount() {
    const confirmDelete = confirm(
      '⚠️ Esta acción eliminará tu cuenta permanentemente. ¿Deseas continuar?'
    );
    if (!confirmDelete) return;

    this.userSrv.deleteMe().subscribe({
      next: () => {
        alert('Cuenta eliminada exitosamente 🗑️');
        this.userSrv.clearToken();
        this.router.navigate(['/sign-in']);
      },
      error: (err) => {
        const msg = (err?.error?.message || err?.message || '').toString();
        alert(msg || 'No se pudo eliminar la cuenta.');
      },
    });
  }
}
