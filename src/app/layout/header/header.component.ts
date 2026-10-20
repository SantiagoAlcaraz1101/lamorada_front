import { Component, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../services/user.service';
import { AuthStateService } from '../../core/state/auth-state.service';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  private readonly userSvc = inject(UserService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authState = inject(AuthStateService);

  isLogged = false;
  role: 'patient' | 'psychologist' | null = null;
  name: string | null = null;

  get isBrowser() { return isPlatformBrowser(this.platformId); }

  ngOnInit() {
    // Suscripción reactiva: cualquier cambio de sesión actualiza el header
    this.authState.state$.subscribe((s) => {
      this.isLogged = s.isLogged;
      this.role = s.role;
      this.name = s.name;
    });

    // Estado inicial desde storage (sin golpear el backend)
    if (this.isBrowser) this.authState.refreshFromStorage();
  }

  async onLogout() {
    try { await firstValueFrom(this.userSvc.logout()); } catch {}
    this.userSvc.clearToken();               // limpia storage + emite estado
    this.router.navigateByUrl('/sign-in');   // UI coherente
  }
}
