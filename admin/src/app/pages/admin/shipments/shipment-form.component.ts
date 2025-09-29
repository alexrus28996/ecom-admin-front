import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { OrdersService, Order } from '../../../services/orders.service';
import { ShipmentsService, CreateShipmentPayload } from '../../../services/shipments.service';
import { ToastService } from '../../../core/toast.service';
import { AuditService } from '../../../services/audit.service';

export interface ShipmentFormData {
  mode: 'create';
  orderId?: string;
}

@Component({
  selector: 'app-shipment-form',
  templateUrl: './shipment-form.component.html',
  styleUrls: ['./shipment-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShipmentFormComponent implements OnDestroy {
  readonly form = this.fb.group({
    orderId: ['', Validators.required],
    carrier: ['', Validators.required],
    tracking: ['', Validators.required],
    service: [''],
    items: this.fb.array([] as any[])
  });

  order?: Order;
  loadingOrder = false;
  submitting = false;
  orderError?: string;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dialogRef: MatDialogRef<ShipmentFormComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ShipmentFormData,
    private readonly fb: FormBuilder,
    private readonly ordersService: OrdersService,
    private readonly shipmentsService: ShipmentsService,
    private readonly toast: ToastService,
    private readonly audit: AuditService,
    private readonly cdr: ChangeDetectorRef
  ) {
    if (this.data.orderId) {
      this.form.patchValue({ orderId: this.data.orderId });
      this.loadOrder();
    }
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrder(): void {
    const orderId = this.form.get('orderId')?.value;
    if (!orderId) {
      this.toast.error('Enter an order ID to load');
      return;
    }

    this.loadingOrder = true;
    this.orderError = undefined;
    this.items.clear();
    this.cdr.markForCheck();

    this.ordersService
      .getAdminOrder(orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          if (!this.isOrderPaid(order)) {
            this.orderError = 'Shipments can only be created for paid orders';
            this.loadingOrder = false;
            this.order = undefined;
            this.toast.error(this.orderError ?? 'Shipments can only be created for paid orders');
            this.cdr.markForCheck();
            return;
          }
          this.order = order;
          order.items.forEach((item) => {
            const productName = typeof item.product === 'string' ? undefined : item.product?.name;
            this.items.push(
              this.fb.group({
                itemId: [item._id || item.id, Validators.required],
                name: [item.name || productName || 'Item'],
                ordered: [item.quantity],
                quantity: [item.quantity, [Validators.required, Validators.min(1), Validators.max(item.quantity)]]
              })
            );
          });
          this.loadingOrder = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingOrder = false;
          this.orderError = err?.error?.error?.message ?? 'Unable to load order';
          this.toast.error(this.orderError ?? 'Unable to load order');
          this.order = undefined;
          this.cdr.markForCheck();
        }
      });
  }

  submit(): void {
    if (this.form.invalid || !this.order) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: CreateShipmentPayload = {
      carrier: this.form.value.carrier!,
      tracking: this.form.value.tracking!,
      service: this.form.value.service || undefined,
      items: this.items.controls
        .map((control) => ({
          itemId: control.get('itemId')?.value,
          quantity: Number(control.get('quantity')?.value || 0)
        }))
        .filter((item) => item.quantity > 0)
    };

    if (!payload.items.length) {
      this.toast.error('Select at least one item to ship');
      return;
    }

    this.submitting = true;
    this.cdr.markForCheck();

    this.shipmentsService
      .createShipment(this.order._id || this.order.id!, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.audit.log({ action: 'shipments.create', entity: 'order', entityId: this.order?._id || this.order?.id }).subscribe();
          this.submitting = false;
          this.toast.success('Shipment created');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.submitting = false;
          this.toast.error(err?.error?.error?.message ?? 'Failed to create shipment');
          this.cdr.markForCheck();
        }
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private isOrderPaid(order: Order): boolean {
    const paymentStatus = (order.paymentStatus || '').toLowerCase();
    return ['paid', 'captured', 'completed', 'succeeded'].includes(paymentStatus);
  }
}
