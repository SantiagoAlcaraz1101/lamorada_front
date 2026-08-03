import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CartProduct {
  _id: string;
  title: string;
  author: string;
  publish_year: number;
  price: number;
  cover_url: string;
}

export interface CartLine {
  product_id: string | CartProduct;
  quantity: number;
}

export interface CartResponse {
  products_id: CartLine[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly baseUrl = `${environment.API_BASE}/cart`;
  private readonly state = new BehaviorSubject<CartResponse>({ products_id: [], total: 0 });

  readonly cart$ = this.state.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  private headers(): HttpHeaders {
    let token: string | null = null;
    if (isPlatformBrowser(this.platformId)) {
      try { token = localStorage.getItem('token'); } catch {}
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  private unwrap(response: any): CartResponse {
    const raw = response?.cart ?? response ?? {};
    const cart = {
      products_id: Array.isArray(raw.products_id) ? raw.products_id : [],
      total: Number(raw.total ?? 0),
    };
    this.state.next(cart);
    return cart;
  }

  addProduct(product_id: string, quantity: number, _hint?: Partial<CartProduct>): Observable<CartResponse> {
    return this.http
      .post(this.baseUrl + '/add', { product_id, quantity }, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  getCart(): Observable<CartResponse> {
    return this.http
      .get(this.baseUrl, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  removeProduct(product_id: string): Observable<CartResponse> {
    return this.http
      .post(this.baseUrl + '/remove', { product_id }, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  clearCart(): Observable<CartResponse> {
    return this.http
      .post(this.baseUrl + '/clear', {}, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }
}