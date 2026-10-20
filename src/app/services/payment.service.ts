import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly baseUrl = `${environment.API_BASE}/payment`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private getAuthHeaders(): HttpHeaders {
    let token: string | null = null;
    if (isPlatformBrowser(this.platformId)) {
      try { token = localStorage.getItem('token'); } catch {}
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  createPayment(data: {
    card_number: string;
    card_name: string;
    expiration_date: string;
    cvv: string;
  }): Observable<any> {
    return this.http.post(this.baseUrl, data, { headers: this.getAuthHeaders() });
  }

  getPayments(): Observable<any> {
    return this.http.get(this.baseUrl, { headers: this.getAuthHeaders() });
  }

  processCheckout(paymentId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/checkout`,
      { payment_id: paymentId },
      { headers: this.getAuthHeaders() },
    );
  }

  deletePayment(paymentId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/${encodeURIComponent(paymentId)}`,
      { headers: this.getAuthHeaders() },
    );
  }
}