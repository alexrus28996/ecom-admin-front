import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { Shipment } from './shipments-list.component';

export interface ShipmentFormData {
  mode: 'create' | 'edit';
  shipment?: Shipment;
  orderId?: string;
}

interface OrderOption {
  id: string;
  label: string;
  raw: any;
}

@Component({
  selector: 'app-shipment-form',
  templateUrl: './shipment-form.component.html',
  styleUrls: ['./shipment-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShipmentFormComponent implements OnInit, OnDestroy {
  readonly form = this.fb.group({
    orderId: ['', Validators.required],
    carrier: ['', Validators.required],
    trackingNumber: ['', Validators.required],
    estimatedDeliveryDate: [null as Date | null],
    status: ['pending', Validators.required]
  });

  readonly statuses = ['pending', 'shipped', 'delivered', 'cancelled'];

  orderOptions: OrderOption[] = [];
  filteredOrders: OrderOption[] = [];
  loadingOrders = false;
  loading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dialogRef: MatDialogRef<ShipmentFormComponent, boolean>,
    private readonly fb: FormBuilder,
    private readonly admin: AdminService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public readonly data: ShipmentFormData
  ) {}

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.shipment) {
      const shipment = this.data.shipment;
      this.form.patchValue({
        orderId: shipment.orderId,
        carrier: shipment.carrier || '',
        trackingNumber: shipment.trackingNumber || '',
        estimatedDeliveryDate: shipment.estimatedDeliveryDate ? new Date(shipment.estimatedDeliveryDate) : null,
        status: shipment.status || 'pending'
      });
      this.form.get('orderId')?.disable();
    }

    if (!this.isEdit) {
      this.form.get('status')?.disable({ emitEvent: false });
    }

    if (!this.isEdit && this.data.orderId) {
      this.form.patchValue({ orderId: this.data.orderId });
    }

    this.loadOrders();

    this.form
      .get('orderId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((term) => {
        if (this.isEdit) {
          return;
        }
        this.filterOrders(String(term || ''));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      carrier: raw.carrier,
      trackingNumber: raw.trackingNumber,
      estimatedDeliveryDate: raw.estimatedDeliveryDate ? new Date(raw.estimatedDeliveryDate).toISOString() : undefined
    } as any;

    this.loading = true;
    this.cdr.markForCheck();

    if (this.isEdit && this.data.shipment) {
      if (raw.status) {
        payload.status = raw.status;
      }
      this.admin
        .updateShipment(this.data.shipment.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      this.admin
        .createShipment(raw.orderId!, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  onOrderSelected(value: string): void {
    this.form.get('orderId')?.setValue(value);
  }

  private loadOrders(): void {
    if (this.isEdit && this.data.shipment) {
      this.orderOptions = [
        {
          id: this.data.shipment.orderId,
          label: this.data.shipment.orderId,
          raw: null
        }
      ];
      this.filteredOrders = this.orderOptions;
      this.cdr.markForCheck();
      return;
    }

    this.loadingOrders = true;
    this.cdr.markForCheck();
    const orderControl = this.form.get('orderId');
    orderControl?.disable({ emitEvent: false });
    this.admin
      .listOrders({ page: 1, limit: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.orderOptions = (res?.items || []).map((order: any) => ({
            id: order.id || order._id,
            label: `${order.id || order._id} — ${order.customer?.email || order.status || ''}`.trim(),
            raw: order
          }));
          this.filteredOrders = this.orderOptions;
          this.loadingOrders = false;
          orderControl?.enable({ emitEvent: false });
          if (!this.isEdit && this.data.orderId) {
            const match = this.orderOptions.find((option) => option.id === this.data.orderId);
            if (match) {
              this.form.patchValue({ orderId: match.id }, { emitEvent: false });
            }
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingOrders = false;
          this.filteredOrders = [];
          orderControl?.enable({ emitEvent: false });
          this.cdr.markForCheck();
        }
      });
  }

  private filterOrders(term: string): void {
    const value = term.toLowerCase();
    this.filteredOrders = this.orderOptions.filter((option) => option.label.toLowerCase().includes(value));
    this.cdr.markForCheck();
  }
}
