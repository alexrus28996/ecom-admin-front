import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { Shipment } from '../../../services/api.types';
import { ShipmentsService } from '../../../services/shipments.service';
import { ToastService } from '../../../core/toast.service';
import { AuditService } from '../../../services/audit.service';
import { PermissionsService } from '../../../core/permissions.service';
import { ShipmentFormComponent } from './shipment-form.component';

@Component({
  selector: 'app-shipments-list',
  templateUrl: './shipments-list.component.html',
  styleUrls: ['./shipments-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShipmentsListComponent implements OnInit, OnDestroy {
  readonly filtersForm = this.fb.group({
    orderId: [''],
    carrier: [''],
    status: [''],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly displayedColumns = ['id', 'order', 'carrier', 'tracking', 'status', 'createdAt', 'actions'];
  readonly statusOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  shipments: Shipment[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 20;
  loading = false;
  canCreate = false;
  canView = true;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly shipmentsService: ShipmentsService,
    private readonly toast: ToastService,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.canCreate = this.permissions.can('shipment.create', false);
    this.canView = this.permissions.can('shipment.view', true);
    if (this.canView) {
      this.load();
    } else {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const params = this.buildFilters();
    params.page = this.pageIndex + 1;
    params.limit = this.pageSize;

    this.shipmentsService
      .getShipments(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.shipments = response.data ?? response.items ?? [];
          this.total = response.total ?? this.shipments.length;
          this.pageIndex = Math.max(0, (response.page ?? 1) - 1);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.error?.message ?? 'Unable to load shipments');
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
    this.audit.log({ action: 'shipments.filter', metadata: this.buildFilters() }).subscribe();
  }

  resetFilters(): void {
    this.filtersForm.reset({
      orderId: '',
      carrier: '',
      status: '',
      range: { start: null, end: null }
    });
    this.applyFilters();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  viewShipment(shipment: Shipment): void {
    this.audit.log({ action: 'shipments.view', entity: 'shipment', entityId: shipment._id }).subscribe();
    this.router.navigate(['/admin/shipments', shipment._id]);
  }

  openCreate(): void {
    if (!this.canCreate) {
      return;
    }
    const dialogRef = this.dialog.open(ShipmentFormComponent, {
      width: '560px',
      data: { mode: 'create' }
    });
    dialogRef.afterClosed().subscribe((created: boolean) => {
      if (created) {
        this.toast.success('Shipment created');
        this.audit.log({ action: 'shipments.create' }).subscribe();
        this.load();
      }
    });
  }

  statusClass(status: string): string {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'delivered') {
      return 'status-pill success';
    }
    if (normalized === 'pending') {
      return 'status-pill pending';
    }
    if (normalized === 'cancelled') {
      return 'status-pill error';
    }
    if (normalized === 'shipped') {
      return 'status-pill info';
    }
    return 'status-pill';
  }

  private buildFilters(): any {
    const value = this.filtersForm.value;
    const filters: any = {};
    if (value.orderId) filters.orderId = value.orderId;
    if (value.carrier) filters.carrier = value.carrier;
    if (value.status) filters.status = value.status;
    if (value.range?.start) filters.dateStart = new Date(value.range.start).toISOString();
    if (value.range?.end) filters.dateEnd = new Date(value.range.end).toISOString();
    return filters;
  }
}
