import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, switchMap, takeUntil } from 'rxjs';

import { Shipment } from '../../../services/api.types';
import { ShipmentsService } from '../../../services/shipments.service';
import { ToastService } from '../../../core/toast.service';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-shipment-detail',
  templateUrl: './shipment-detail.component.html',
  styleUrls: ['./shipment-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShipmentDetailComponent implements OnInit, OnDestroy {
  shipment?: Shipment;
  loading = true;
  error?: string;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly shipmentsService: ShipmentsService,
    private readonly toast: ToastService,
    private readonly audit: AuditService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.error = 'Shipment not found';
            this.loading = false;
            this.cdr.markForCheck();
            return EMPTY;
          }
          this.audit.log({ action: 'shipments.view', entity: 'shipment', entityId: id }).subscribe();
          this.loading = true;
          this.cdr.markForCheck();
          return this.shipmentsService.getShipment(id);
        })
      )
      .subscribe({
        next: (shipment) => {
          this.shipment = shipment;
          this.error = undefined;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.error?.message ?? 'Failed to load shipment detail';
          this.toast.error(this.error ?? 'Failed to load shipment detail');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  back(): void {
    this.router.navigate(['/admin/shipments']);
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
}
