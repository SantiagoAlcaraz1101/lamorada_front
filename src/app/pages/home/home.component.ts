import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  email = '';
  note: string | null = null;

  onEmailInput(e: Event) {
    this.email = (e.target as HTMLInputElement).value;
  }

  subscribe(event: Event) {
    event.preventDefault();
    const value = (this.email || '').trim();
    if (!value) {
      this.note = 'Por favor escribe tu correo.';
      return;
    }
    this.note = 'Las suscripciones aún no están disponibles. Puedes explorar nuestros recursos desde el menú.';
  }
}
