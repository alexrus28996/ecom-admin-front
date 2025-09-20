import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { ToastService } from '../../core/toast.service';
import { CartService, Cart, CartItem, MoneyAmount, SavedCart } from '../../services/cart.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

type BackendError = unknown;

interface DisplayMoney {
  amount: number;
  currency: string;
}

interface DisplayCartItem {
  id: string;
  productId: string;
  name: string;
  sku?: string | null;
  quantity: number;
  unit: DisplayMoney;
  line: DisplayMoney;
  image?: string | null;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  loading = false;
  clearing = false;
  couponLoading = false;

  errorKey: string | null = null;
  lastError: BackendError = null;
  couponErrorMessage: string | null = null;
  couponSuccessMessage: string | null = null;

  pendingItemId: string | null = null;

  readonly displayedColumns: string[] = ['product', 'price', 'qty', 'line', 'actions'];

  readonly couponForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(2)]]
  });

  viewItems: DisplayCartItem[] = [];
  summary = {
    subtotal: { amount: 0, currency: 'USD' } as DisplayMoney,
    discount: null as DisplayMoney | null,
    shipping: null as DisplayMoney | null,
    tax: null as DisplayMoney | null,
    total: { amount: 0, currency: 'USD' } as DisplayMoney
  };
  couponSavings: DisplayMoney | null = null;
  cartUpdatedAt: string | null = null;

  private cartCurrency = 'USD';
  private readonly cartItemsById = new Map<string, CartItem>();

  readonly saveForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  savedCarts: SavedCart[] = [];
  savedTotal = 0;
  savedPageIndex = 0;
  savedPageSize = 5;
  readonly savedPageSizeOptions = [5, 10, 20];
  savedLoading = false;
  savedErrorKey: string | null = null;
  savedLastError: BackendError = null;
  savingCart = false;

  constructor(
    private readonly cartSvc: CartService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadSaved();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.cartSvc.get().subscribe({
      next: ({ cart }) => {
        this.updateCart(cart);
        this.loading = false;
        this.resetCouponMessages();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'cart.errors.loadFailed';
        this.cdr.markForCheck();
      }
    });
  }

  inc(itemId: string): void {
    const item = this.cartItemsById.get(itemId);
    if (!item) {
      return;
    }
    const next = this.coerceQuantity(item.quantity) + 1;
    this.updateQuantity(itemId, item, next);
  }

  dec(itemId: string): void {
    const item = this.cartItemsById.get(itemId);
    if (!item) {
      return;
    }
    const next = Math.max(this.coerceQuantity(item.quantity) - 1, 1);
    this.updateQuantity(itemId, item, next);
  }

  remove(itemId: string): void {
    const item = this.cartItemsById.get(itemId);
    if (!item) {
      return;
    }

    const endpointId = this.resolveItemEndpointId(item);
    if (!endpointId) {
      return;
    }

    this.pendingItemId = itemId;
    this.cdr.markForCheck();

    this.cartSvc.removeItem(endpointId).subscribe({
      next: ({ cart }) => {
        this.updateCart(cart);
        this.pendingItemId = null;
        const message = this.translate.instant('cart.toasts.itemRemoved', {
          name: this.resolveItemName(item)
        });
        this.toast.success(message);
        this.cdr.markForCheck();
      },
      error: () => {
        this.pendingItemId = null;
        const message = this.translate.instant('cart.errors.removeFailed');
        this.toast.error(message);
        this.cdr.markForCheck();
      }
    });
  }

  confirmClear(): void {
    if (!this.viewItems.length || this.clearing || this.loading) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'cart.clearConfirm.title',
        messageKey: 'cart.clearConfirm.message',
        confirmKey: 'cart.actions.clear'
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.clearCart();
      }
    });
  }

  applyCoupon(): void {
    if (this.couponForm.invalid || this.couponLoading || this.clearing || !!this.pendingItemId) {
      this.couponForm.markAllAsTouched();
      return;
    }

    const rawCode = this.couponForm.value.code ?? '';
    const code = rawCode.trim();
    if (!code) {
      this.couponForm.markAllAsTouched();
      return;
    }

    this.couponLoading = true;
    this.couponErrorMessage = null;
    this.couponSuccessMessage = null;
    this.cdr.markForCheck();

    this.cartSvc.applyCoupon(code).subscribe({
      next: ({ cart }) => {
        this.updateCart(cart);
        this.couponLoading = false;
        const message = this.translate.instant('cart.toasts.couponApplied', { code });
        this.couponSuccessMessage = message;
        this.toast.success(message);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.couponLoading = false;
        this.couponErrorMessage = this.resolveErrorMessage(err, 'cart.coupon.applyFailed', { code });
        this.toast.error(this.couponErrorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  removeCoupon(): void {
    if (this.couponLoading || this.clearing || !!this.pendingItemId) {
      return;
    }

    this.couponLoading = true;
    this.couponErrorMessage = null;
    this.couponSuccessMessage = null;
    this.cdr.markForCheck();

    this.cartSvc.removeCoupon().subscribe({
      next: ({ cart }) => {
        this.updateCart(cart);
        this.couponLoading = false;
        const message = this.translate.instant('cart.toasts.couponRemoved');
        this.couponSuccessMessage = message;
        this.toast.success(message);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.couponLoading = false;
        this.couponErrorMessage = this.resolveErrorMessage(err, 'cart.coupon.removeFailed');
        this.toast.error(this.couponErrorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  saveCart(): void {
    if (this.saveForm.invalid || this.savingCart) {
      this.saveForm.markAllAsTouched();
      return;
    }

    const payload = this.saveForm.getRawValue();

    this.savingCart = true;
    this.savedErrorKey = null;
    this.savedLastError = null;
    this.cdr.markForCheck();

    this.cartSvc.saveCurrent({
      name: payload.name?.trim() || undefined,
      description: payload.description?.trim() || undefined
    }).subscribe({
      next: ({ savedCart }) => {
        this.savingCart = false;
        this.toast.success(this.translate.instant('cart.saved.toasts.saved'));
        this.saveForm.reset({ name: '', description: '' });
        this.savedCarts = [savedCart, ...this.savedCarts];
        this.loadSaved();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savingCart = false;
        this.savedLastError = err;
        const code = err?.error?.error?.code;
        this.savedErrorKey = code ? `errors.backend.${code}` : 'cart.saved.errors.saveFailed';
        this.toast.error(this.translate.instant('cart.saved.errors.saveFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  onSavedPage(event: any): void {
    this.savedPageSize = event.pageSize;
    this.savedPageIndex = event.pageIndex;
    this.loadSaved();
  }

  restoreCart(saved: SavedCart): void {
    if (!saved?._id || this.savedLoading || this.loading) {
      return;
    }
    this.savedLoading = true;
    this.savedErrorKey = null;
    this.savedLastError = null;
    this.cdr.markForCheck();

    this.cartSvc.restoreSaved(saved._id).subscribe({
      next: ({ cart }) => {
        this.savedLoading = false;
        this.updateCart(cart);
        this.toast.success(this.translate.instant('cart.saved.toasts.restored'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savedLoading = false;
        this.savedLastError = err;
        const code = err?.error?.error?.code;
        this.savedErrorKey = code ? `errors.backend.${code}` : 'cart.saved.errors.restoreFailed';
        this.toast.error(this.translate.instant('cart.saved.errors.restoreFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  confirmDeleteSaved(saved: SavedCart): void {
    if (!saved?._id) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'cart.saved.delete.title',
        messageKey: 'cart.saved.delete.message',
        messageParams: { name: saved.name || saved._id },
        confirmKey: 'cart.saved.delete.confirm'
      }
    });

    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.deleteSaved(saved);
      }
    });
  }

  trackById(_: number, item: DisplayCartItem): string {
    return item.id;
  }

  savedTotalDisplay(saved: SavedCart): DisplayMoney {
    return this.normalizeMoney(saved.totals?.total, this.cartCurrency);
  }

  private loadSaved(): void {
    this.savedLoading = true;
    this.savedErrorKey = null;
    this.savedLastError = null;
    this.cdr.markForCheck();

    this.cartSvc
      .listSaved({ page: this.savedPageIndex + 1, limit: this.savedPageSize })
      .subscribe({
        next: (res) => {
          this.savedCarts = res.items || [];
          this.savedTotal = res.total || 0;
          this.savedPageIndex = (res.page || 1) - 1;
          this.savedLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.savedLastError = err;
          const code = err?.error?.error?.code;
          this.savedErrorKey = code ? `errors.backend.${code}` : 'cart.saved.errors.loadFailed';
          this.savedLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private deleteSaved(saved: SavedCart): void {
    if (!saved?._id) {
      return;
    }

    this.savedLoading = true;
    this.savedErrorKey = null;
    this.savedLastError = null;
    this.cdr.markForCheck();

    this.cartSvc.deleteSaved(saved._id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('cart.saved.toasts.deleted'));
        this.savedLoading = false;
        this.loadSaved();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savedLoading = false;
        this.savedLastError = err;
        const code = err?.error?.error?.code;
        this.savedErrorKey = code ? `errors.backend.${code}` : 'cart.saved.errors.deleteFailed';
        this.toast.error(this.translate.instant('cart.saved.errors.deleteFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  private updateCart(cart: Cart): void {
    const prevCode = this.cart?.coupon?.code || '';
    const nextCode = cart?.coupon?.code || '';
    const currency = this.detectCurrency(cart);
    this.cartCurrency = currency;

    this.cartItemsById.clear();
    this.viewItems = (cart.items ?? []).map((item, index) => {
      const id = this.resolveItemId(item, index);
      const quantity = this.coerceQuantity(item.quantity);
      const unit = this.normalizeMoney(item.unitPrice ?? item.totals?.unit ?? item.price, currency);
      const lineSource =
        item.lineTotal ?? item.totals?.line ?? (typeof item.price === 'number' ? item.price * quantity : undefined);
      const line = this.normalizeMoney(lineSource, unit.currency);
      const productId = this.resolveProductId(item, id);
      const name = this.resolveItemName(item);
      const sku = item.sku ?? item.productData?.sku ?? null;
      const image = item.image ?? null;

      this.cartItemsById.set(id, item);

      return { id, productId, name, sku, quantity, unit, line, image };
    });

    const subtotal = this.normalizeMoney(cart.totals?.subtotal ?? cart.subtotal, currency);
    const discountValue = cart.totals?.discountTotal ?? cart.discountTotal ?? cart.coupon?.discountAmount ?? cart.coupon?.amountOff;
    const discount = this.normalizeMoney(discountValue, currency);
    const shipping = this.normalizeMoney(cart.totals?.shippingTotal ?? cart.shipping, currency);
    const tax = this.normalizeMoney(cart.totals?.taxTotal ?? cart.tax, currency);
    const totalSource =
      cart.totals?.total ??
      cart.total ??
      subtotal.amount - (discount.amount > 0 ? discount.amount : 0) + (shipping.amount > 0 ? shipping.amount : 0) + (tax.amount > 0 ? tax.amount : 0);
    const total = this.normalizeMoney(totalSource, currency);

    this.summary = {
      subtotal,
      discount: discount.amount > 0 ? discount : null,
      shipping: shipping.amount > 0 ? shipping : null,
      tax: tax.amount > 0 ? tax : null,
      total
    };

    if (cart.coupon) {
      const couponSavings = this.summary.discount ?? this.normalizeMoney(cart.coupon.discountAmount ?? cart.coupon.amountOff, currency);
      this.couponSavings = couponSavings.amount > 0 ? couponSavings : null;
    } else {
      this.couponSavings = null;
    }

    this.cartUpdatedAt = this.resolveUpdatedAt(cart);

    this.cart = cart;
    if (prevCode !== nextCode) {
      this.couponForm.patchValue({ code: nextCode }, { emitEvent: false });
    }
  }

  private clearCart(): void {
    this.clearing = true;
    this.cdr.markForCheck();

    this.cartSvc.clear().subscribe({
      next: ({ cart }) => {
        this.updateCart(cart);
        this.clearing = false;
        const message = this.translate.instant('cart.toasts.cleared');
        this.toast.success(message);
        this.resetCouponMessages();
        this.cdr.markForCheck();
      },
      error: () => {
        this.clearing = false;
        const message = this.translate.instant('cart.errors.clearFailed');
        this.toast.error(message);
        this.cdr.markForCheck();
      }
    });
  }

  private updateQuantity(displayId: string, item: CartItem, quantity: number): void {
    const endpointId = this.resolveItemEndpointId(item);
    if (!endpointId) {
      return;
    }

    this.pendingItemId = displayId;
    this.cdr.markForCheck();

    this.cartSvc.updateItem(endpointId, quantity).subscribe({
      next: ({ cart }) => {
        this.updateCart(cart);
        this.pendingItemId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.pendingItemId = null;
        const message = this.translate.instant('cart.errors.updateFailed');
        this.toast.error(message);
        this.cdr.markForCheck();
      }
    });
  }

  private resolveErrorMessage(err: any, fallbackKey: string, params?: Record<string, unknown>): string {
    const code = err?.error?.error?.code;
    const key = code ? `errors.backend.${code}` : fallbackKey;
    return this.translate.instant(key, params);
  }

  private resetCouponMessages(): void {
    this.couponErrorMessage = null;
    this.couponSuccessMessage = null;
  }

  private detectCurrency(cart: Cart): string {
    const fromCart =
      cart.currency ||
      this.extractCurrency(cart.totals?.total) ||
      this.extractCurrency(cart.totals?.subtotal) ||
      this.extractCurrency(cart.totals?.discountTotal);
    if (fromCart) {
      return fromCart;
    }

    for (const item of cart.items ?? []) {
      const itemCurrency =
        item.currency ||
        this.extractCurrency(item.unitPrice) ||
        this.extractCurrency(item.totals?.unit) ||
        this.extractCurrency(item.lineTotal) ||
        this.extractCurrency(item.totals?.line);
      if (itemCurrency) {
        return itemCurrency;
      }
    }

    return 'USD';
  }

  private extractCurrency(value: number | MoneyAmount | null | undefined): string | null {
    if (this.isMoneyAmount(value) && value.currency) {
      return value.currency;
    }
    return null;
  }

  private normalizeMoney(value: number | MoneyAmount | null | undefined, fallbackCurrency: string): DisplayMoney {
    if (this.isMoneyAmount(value)) {
      const amount = Number(value.amount ?? 0);
      const currency = value.currency || fallbackCurrency || this.cartCurrency || 'USD';
      return { amount: Number.isFinite(amount) ? amount : 0, currency };
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return { amount: value, currency: fallbackCurrency || this.cartCurrency || 'USD' };
    }

    return { amount: 0, currency: fallbackCurrency || this.cartCurrency || 'USD' };
  }

  private resolveItemId(item: CartItem, index: number): string {
    return item._id || item.itemId || item.product || item.productId || `row-${index}`;
  }

  private resolveItemEndpointId(item: CartItem): string | null {
    return item._id || item.itemId || item.product || item.productId || null;
  }

  private resolveProductId(item: CartItem, fallback: string): string {
    return item.product || item.productId || fallback;
  }

  private resolveItemName(item: CartItem): string {
    return item.name || item.productData?.name || item.product || item.productId || this.translate.instant('cart.table.unknownProduct');
  }

  private coerceQuantity(quantity: number | null | undefined): number {
    if (typeof quantity === 'number' && Number.isFinite(quantity)) {
      return quantity;
    }
    return 0;
  }

  private isMoneyAmount(value: unknown): value is MoneyAmount {
    return typeof value === 'object' && value !== null && 'amount' in value;
  }

  private resolveUpdatedAt(cart: Cart): string | null {
    if (cart.updatedAt) {
      return cart.updatedAt;
    }

    const legacyTimestamps = cart as Cart & {
      updated?: unknown;
      updated_at?: unknown;
    };

    if (typeof legacyTimestamps.updated === 'string') {
      return legacyTimestamps.updated;
    }

    if (typeof legacyTimestamps.updated_at === 'string') {
      return legacyTimestamps.updated_at;
    }

    return null;
  }
}
