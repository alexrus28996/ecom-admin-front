import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatDrawer } from '@angular/material/sidenav';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { ToastService } from '../../../core/toast.service';
import { ShipmentFormComponent, ShipmentFormData } from './shipment-form.component';

export interface ShipmentStatusHistoryEntry {
  status: string;
  updatedAt?: string;
  note?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled' | string;
  createdAt?: string;
  updatedAt?: string;
  estimatedDeliveryDate?: string;
  statusHistory?: ShipmentStatusHistoryEntry[];
  history?: ShipmentStatusHistoryEntry[];
  [key: string]: any;
}

@Component({
  selector: 'app-shipments-list',
  templateUrl: './shipments-list.component.html',
  styleUrls: ['./shipments-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
// TODO: Add bulk import/export of shipments.
// TODO: Add label printing workflow for generated shipments.
// TODO: Integrate with carrier APIs for live tracking updates.
export class ShipmentsListComponent implements OnInit, OnDestroy {
  readonly filterForm = this.fb.group({
    status: [''],
    carrier: [''],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly displayedColumns = ['id', 'order', 'carrier', 'trackingNumber', 'status', 'createdAt', 'updatedAt', 'actions'];
  readonly statusOptions = [
    { value: '', labelKey: 'shipments.list.filters.status.options.all' },
    { value: 'pending', labelKey: 'shipments.list.filters.status.options.pending' },
    { value: 'shipped', labelKey: 'shipments.list.filters.status.options.shipped' },
    { value: 'delivered', labelKey: 'shipments.list.filters.status.options.delivered' },
    { value: 'cancelled', labelKey: 'shipments.list.filters.status.options.cancelled' }
  ];
  readonly skeletonRows = Array.from({ length: 6 });
  readonly pageSizeOptions = [10, 25, 50];

  shipments: Shipment[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = false;
  errorKey: string | null = null;
  lastError: any = null;
  selected: Shipment | null = null;

  @ViewChild(MatDrawer) drawer?: MatDrawer;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly admin: AdminService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const formValue = this.filterForm.value;
    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };
    if (formValue.status) params.status = formValue.status;
    if (formValue.carrier) params.carrier = formValue.carrier;
    const start = formValue.range?.start;
    const end = formValue.range?.end;
    if (start) params.from = new Date(start).toISOString();
    if (end) params.to = new Date(end).toISOString();

    this.admin
      .listShipments(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.shipments = (res?.items || []).map((item: any) => this.normalizeShipment(item));
          this.total = res?.total || this.shipments.length;
          this.pageIndex = Math.max(0, (res?.page || 1) - 1);
          this.loading = false;

          if (this.selected) {
            const selectedId = this.selected.id;
            this.selected = this.shipments.find((row) => row.id === selectedId) || null;
            if (this.selected) {
              setTimeout(() => this.drawer?.open(), 0);
            }
          }

          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.lastError = err;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'shipments.list.errors.loadFailed';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  resetFilters(): void {
    this.filterForm.reset({ status: '', carrier: '', range: { start: null, end: null } });
    this.applyFilters();
  }

  onPage(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openCreate(): void {
    const data: ShipmentFormData = { mode: 'create' };
    const ref = this.dialog.open(ShipmentFormComponent, {
      width: '520px',
      data
    });
    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        this.toast.success(this.translate.instant('shipments.list.toasts.created'));
        this.load();
      }
    });
  }

  editShipment(shipment: Shipment): void {
    const ref = this.dialog.open(ShipmentFormComponent, {
      width: '520px',
      data: {
        mode: 'edit',
        shipment
      } satisfies ShipmentFormData
    });

    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        this.toast.success(this.translate.instant('shipments.list.toasts.updated'));
        this.load();
      }
    });
  }

  deleteShipment(shipment: Shipment): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'shipments.list.dialogs.delete.title',
        messageKey: 'shipments.list.dialogs.delete.message',
        confirmKey: 'shipments.list.dialogs.delete.confirm',
        cancelKey: 'common.actions.cancel'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.loading = true;
      this.cdr.markForCheck();
      this.admin
        .deleteShipment(shipment.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toast.success(this.translate.instant('shipments.list.toasts.deleted'));
            if (this.selected?.id === shipment.id) {
              this.closeDetails();
            }
            this.load();
          },
          error: (err) => {
            this.loading = false;
            this.lastError = err;
            const code = err?.error?.error?.code;
            this.errorKey = code ? `errors.backend.${code}` : 'shipments.list.errors.deleteFailed';
            this.toast.error(this.translate.instant('shipments.list.errors.deleteFailedToast'));
            this.cdr.markForCheck();
          }
        });
    });
  }

  openDetails(row: Shipment): void {
    this.selected = row;
    this.drawer?.open();
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.drawer?.close();
    this.selected = null;
    this.cdr.markForCheck();
  }

  statusBadgeClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'delivered':
        return 'status-badge status-badge--success';
      case 'shipped':
        return 'status-badge status-badge--info';
      case 'cancelled':
        return 'status-badge status-badge--danger';
      default:
        return 'status-badge status-badge--warning';
    }
  }

  trackById(_: number, item: Shipment): string {
    return item.id;
  }

  trackHistoryEntry(index: number, item: ShipmentStatusHistoryEntry): string {
    return `${item.status}-${item.updatedAt || index}`;
  }

  private normalizeShipment(raw: any): Shipment {
    const id = raw?.id || raw?._id;
    return {
      id,
      orderId: raw?.orderId || raw?.order?.id || raw?.order?._id,
      carrier: raw?.carrier,
      trackingNumber: raw?.trackingNumber,
      status: (raw?.status || 'pending') as Shipment['status'],
      createdAt: raw?.createdAt,
      updatedAt: raw?.updatedAt,
      estimatedDeliveryDate: raw?.estimatedDeliveryDate,
      statusHistory: raw?.statusHistory || raw?.history,
      ...raw
    } as Shipment;
  }
}
