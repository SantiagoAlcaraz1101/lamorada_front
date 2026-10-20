import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, NgIf, NgFor, isPlatformBrowser, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PaymentService } from '../../services/payment.service';
import { CartService, CartLine as ApiCartLine, CartProduct } from '../../services/cart.service';

type PaymentRow = {
  _id: string;
  card_last4: string;
  card_brand: string;
  card_name: string;
  expiration_date: string;
};

type CartLine = {
  product_id: string;
  title?: string;
  price: number;
  quantity: number;
  cover_url?: string;
};

@Component({
  standalone: true,
  selector: 'app-checkout',
  imports: [CommonModule, NgIf, NgFor, RouterLink, CurrencyPipe],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
})
export class CheckoutComponent {
  constructor(
    private pay: PaymentService,
    private cartSrv: CartService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  loadingPayments = true;
  loadingCart = true;
  paying = false;
  cards: PaymentRow[] = [];
  lines: CartLine[] = [];
  subtotal = 0;
  total = 0;

  get isBrowser() { return isPlatformBrowser(this.platformId); }

  ngOnInit() {
    if (!this.isBrowser) {
      this.loadingPayments = false;
      this.loadingCart = false;
      return;
    }
    this.loadPayments();
    this.loadCart();
  }

  private loadPayments() {
    this.loadingPayments = true;
    this.pay.getPayments()
      .pipe(finalize(() => (this.loadingPayments = false)))
      .subscribe({
        next: (response) => {
          const raw = response?.payments ?? response ?? [];
          this.cards = Array.isArray(raw) ? raw : [];
        },
        error: () => { this.cards = []; },
      });
  }

  private loadCart() {
    this.loadingCart = true;
    this.cartSrv.getCart()
      .pipe(finalize(() => (this.loadingCart = false)))
      .subscribe({
        next: (cart) => {
          this.lines = this.mapLines(cart.products_id);
          this.recalc();
        },
        error: () => {
          this.lines = [];
          this.recalc();
        },
      });
  }

  private mapLines(lines: ApiCartLine[]): CartLine[] {
    return (lines || []).map((line) => {
      const product = typeof line.product_id === 'string'
        ? null
        : line.product_id as CartProduct;
      return {
        product_id: product?._id ?? String(line.product_id),
        title: product?.title ?? '',
        price: Number(product?.price ?? 0),
        quantity: Number(line.quantity ?? 1),
        cover_url: product?.cover_url ?? '',
      };
    });
  }

  private recalc() {
    this.subtotal = this.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    this.total = this.subtotal;
  }

  mask(last4: string) {
    return `**** **** **** ${String(last4 ?? '').slice(-4)}`;
  }

  onPay(card: PaymentRow) {
    if (!this.lines.length) {
      alert('Tu carrito está vacío.');
      return;
    }

    this.paying = true;
    this.pay.processCheckout(card._id)
      .pipe(finalize(() => (this.paying = false)))
      .subscribe({
        next: (response) => {
          const transaction = response?.transaction;
          alert(
            `Pago simulado aprobado con ${this.mask(card.card_last4)} ` +
            `por ${Number(transaction?.amount ?? this.total).toLocaleString('es-CO', {
              style: 'currency',
              currency: 'COP',
            })}`,
          );
          this.lines = [];
          this.recalc();
          this.router.navigateByUrl('/product');
        },
        error: (error) => {
          alert(error?.error?.message || 'No se pudo procesar el pago simulado.');
        },
      });
  }

  goToAddCard() {
    this.router.navigateByUrl('/payment');
  }
}