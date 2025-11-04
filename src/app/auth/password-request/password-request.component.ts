import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from './../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-password-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-request.component.html',
  styleUrls: ['./password-request.component.css'],
})
export class PasswordRequestComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private router = inject(Router);

  loading = false;
  message: string | null = null;
  error: string | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.message = null;
    this.error = null;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading = true;
    this.userService.requestPasswordReset(this.form.value.email!).subscribe({
      next: () => {
        this.message = 'Código enviado. 📧 Revisa tu correo electrónico.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/password-reset']), 2500);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al solicitar el código.';
        this.loading = false;
      },
    });
  }
}
