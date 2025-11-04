import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from './../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.css'],
})
export class PasswordResetComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private router = inject(Router);

  loading = false;
  message: string | null = null;
  error: string | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.message = null;
    this.error = null;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    // 🔹 Aseguramos que todo sea string y no null/undefined
    const email = this.form.value.email?.toString().trim() || '';
    const code = this.form.value.code?.toString().trim() || '';
    const newPassword = this.form.value.newPassword?.toString().trim() || '';
    const confirmPassword = this.form.value.confirmPassword?.toString().trim() || '';

    // 🔹 Validaciones previas
    if (!email || !code || !newPassword || !confirmPassword) {
      this.error = 'Todos los campos son obligatorios.';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;

    // 🔹 Llamada segura al backend
    this.userService.resetPassword({ email, code, newPassword, confirmPassword }).subscribe({
      next: () => {
        this.message = 'Contraseña actualizada correctamente ✅';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/sign-in']), 2500);
      },
      error: (err) => {
        const raw = (err?.error?.message || '').toUpperCase();
        if (raw.includes('INVALID CODE')) this.error = 'El código no es válido.';
        else if (raw.includes('CODE EXPIRED')) this.error = 'El código ha expirado.';
        else this.error = 'No se pudo restablecer la contraseña.';
        this.loading = false;
      },
    });
  }
}
