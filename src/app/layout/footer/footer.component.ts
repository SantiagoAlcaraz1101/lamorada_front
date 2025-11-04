import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent implements AfterViewInit, OnDestroy {
  year = new Date().getFullYear();

  @ViewChild('root', { static: true })
  root!: ElementRef<HTMLElement>;

  private isBrowser = false;
  private ro: ResizeObserver | null = null;
  private removeResizeListener?: () => void;

  constructor(
    private rd: Renderer2,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    const body = this.doc.body;
    const html = this.doc.documentElement;
    const footerEl = this.root.nativeElement;

    // 🔹 Asegura que el body use layout flexible
    this.rd.addClass(body, 'lm-has-fixed-footer');

    const setVar = (h: number) => {
      html.style.setProperty('--lm-footer-h', `${Math.max(1, Math.round(h))}px`);
    };

    const updateSize = () => {
      const rect = footerEl.getBoundingClientRect();
      setVar(rect.height || 96);
    };

    // 🔹 Usa ResizeObserver si está disponible
    const RO: any = (window as any).ResizeObserver;
    if (RO) {
      this.ro = new RO(() => updateSize());
      if (this.ro) {
        this.ro.observe(footerEl); // ✅ Tipado seguro
      }
    } else {
      const onResize = () => updateSize();
      window.addEventListener('resize', onResize);
      this.removeResizeListener = () => window.removeEventListener('resize', onResize);
    }

    // 🔹 Calcula la altura inicial y una segunda tras la carga de fuentes
    updateSize();
    setTimeout(updateSize, 120);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    // 🔹 Limpieza de observers y listeners
    try {
      if (this.ro && typeof this.ro.disconnect === 'function') {
        this.ro.disconnect();
      }
    } catch {
      /* noop */
    }

    this.removeResizeListener?.();

    // 🔹 Limpia las clases y variables globales
    const body = this.doc.body;
    const html = this.doc.documentElement;
    this.rd.removeClass(body, 'lm-has-fixed-footer');
    html.style.removeProperty('--lm-footer-h');
  }
}
