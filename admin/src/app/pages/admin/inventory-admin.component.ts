import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import { InventoryService, InventoryQuery, LedgerQuery, ReservationQuery } from '../../services/inventory.service';
import { LocationService } from '../../services/location.service';
import { TransferService, TransferQuery, TransferStatusPayload } from '../../services/transfer.service';
import {
  InventoryLocation,
  InventoryReservation,
  ReservationStatus,
  StockItem,
  StockLedgerEntry,
  TransferOrder,
  TransferStatus
} from '../../services/api.types';
import { AuditService } from '../../services/audit.service';
import { ToastService } from '../../core/toast.service';
import { PermissionsService } from '../../core/permissions.service';
import {
  InventoryAdjustmentDialogComponent,
  InventoryAdjustmentDialogData
} from './inventory-adjustment-dialog.component';
import {
  InventoryLocationDialogComponent,
  InventoryLocationDialogData,
  InventoryLocationDialogResult
} from './inventory-location-dialog.component';
import {
  InventoryTransferDialogComponent,
  InventoryTransferDialogData,
  InventoryTransferDialogResult
} from './inventory-transfer-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { TranslateService } from '@ngx-translate/core';

interface DataState<T> {
  items: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
  loading: boolean;
  error?: string | null;
}

interface StockRow {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  variantSku?: string;
  locationId?: string;
  locationName?: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt?: string;
  reorderPoint?: number | null;
  status: 'in-stock' | 'low' | 'out';
}

interface ReservationRow {
  id: string;
  orderId?: string;
  productName: string;
  variantName?: string;
  reservedQty: number;
  status: ReservationStatus;
  expiresAt?: string | null;
  isExpired: boolean;
}

interface TransferRow {
  id: string;
  fromLocationName: string;
  toLocationName: string;
  status: TransferStatus;
  createdAt?: string;
  updatedAt?: string;
  lineCount: number;
  linesSummary: string;
}

interface LedgerRow {
  id: string;
  productName: string;
  variantName?: string;
  locationName?: string;
  quantity: number;
  direction: string;
  reason?: string;
  refType?: string;
  refId?: string;
  occurredAt: string;
  actor?: string;
}

interface LocationRow {
  id: string;
  code: string;
  name: string;
  type?: string;
  priority?: number | null;
  active: boolean;
  deletedAt?: string | null;
}

@Component({
  selector: 'app-admin-inventory',
  templateUrl: './inventory-admin.component.html',
  styleUrls: ['./inventory-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInventoryComponent implements OnInit, OnDestroy {
  readonly stockFilters = this.fb.group({
    product: [''],
    variant: [''],
    locationId: ['']
  });

  readonly lowFilters = this.fb.group({
    product: [''],
    variant: [''],
    locationId: ['']
  });

  readonly reservationFilters = this.fb.group({
    product: [''],
    status: ['ALL']
  });

  readonly transferFilters = this.fb.group({
    status: [''],
    fromLocationId: [''],
    toLocationId: ['']
  });

  readonly ledgerFilters = this.fb.group({
    product: [''],
    locationId: [''],
    from: [''],
    to: ['']
  });

  readonly stockState: DataState<StockRow> = { items: [], total: 0, pageIndex: 0, pageSize: 10, loading: false, error: null };
  readonly lowState: DataState<StockRow> = { items: [], total: 0, pageIndex: 0, pageSize: 10, loading: false, error: null };
  readonly reservationState: DataState<ReservationRow> = {
    items: [],
    total: 0,
    pageIndex: 0,
    pageSize: 10,
    loading: false,
    error: null
  };
  readonly transferState: DataState<TransferRow> = { items: [], total: 0, pageIndex: 0, pageSize: 10, loading: false, error: null };
  readonly ledgerState: DataState<LedgerRow> = { items: [], total: 0, pageIndex: 0, pageSize: 10, loading: false, error: null };
  readonly locationState: DataState<LocationRow> = {
    items: [],
    total: 0,
    pageIndex: 0,
    pageSize: 10,
    loading: false,
    error: null
  };

  readonly reservationStatusOptions: Array<'ALL' | ReservationStatus> = ['ALL', 'ACTIVE', 'RELEASED', 'EXPIRED'];
  readonly transferStatuses: TransferStatus[] = ['DRAFT', 'REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'];

  locationOptions: InventoryLocation[] = [];
  selectedTab = 0;

  private locationEntities: InventoryLocation[] = [];

  readonly permissions$ = combineLatest({
    adjust: this.permissionAny$('inventory:adjust'),
    transfer: this.permissionAny$('inventory:transfer', 'inventory:transfer:create'),
    transferUpdate: this.permissionAny$('inventory:transfer', 'inventory:transfer:edit', 'inventory:transfer:update'),
    locationCreate: this.permissionAny$('inventory:location:create'),
    locationEdit: this.permissionAny$('inventory:location:edit'),
    locationDelete: this.permissionAny$('inventory:location:delete')
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly inventory: InventoryService,
    private readonly locations: LocationService,
    private readonly transfers: TransferService,
    private readonly audit: AuditService,
    private readonly toast: ToastService,
    private readonly permissions: PermissionsService,
    private readonly dialog: MatDialog,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly i18n: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadStock();
    this.loadLowStock();
    this.loadReservations();
    this.loadTransfers();
    this.loadLedger();
    this.loadLocationsTable();
    this.refreshLocationOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    if (index === 1 && !this.lowState.items.length && !this.lowState.loading) {
      this.loadLowStock();
    }
    if (index === 2 && !this.reservationState.items.length && !this.reservationState.loading) {
      this.loadReservations();
    }
    if (index === 3 && !this.transferState.items.length && !this.transferState.loading) {
      this.loadTransfers();
    }
    if (index === 4 && !this.ledgerState.items.length && !this.ledgerState.loading) {
      this.loadLedger();
    }
  }

  loadStock(): void {
    this.stockState.loading = true;
    this.stockState.error = null;
    this.cdr.markForCheck();
    const { product, variant, locationId } = this.stockFilters.value;
    const query: InventoryQuery = {
      productId: product || undefined,
      variantId: variant || undefined,
      locationId: locationId || undefined,
      page: this.stockState.pageIndex + 1,
      limit: this.stockState.pageSize
    };

    this.inventory
      .getInventory(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response.items ?? response.data ?? []) as StockItem[];
          this.stockState.items = items.map((item) => this.mapStockItem(item));
          this.stockState.total = this.resolveTotal(response, items.length);
          this.stockState.pageIndex = this.resolvePage(response);
          this.stockState.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.stockState.loading = false;
          this.stockState.error = this.resolveErrorMessage(error, 'Unable to load inventory overview.');
          this.cdr.markForCheck();
        }
      });
  }

  loadLowStock(): void {
    this.lowState.loading = true;
    this.lowState.error = null;
    this.cdr.markForCheck();
    const { product, variant, locationId } = this.lowFilters.value;
    const query: InventoryQuery = {
      productId: product || undefined,
      variantId: variant || undefined,
      locationId: locationId || undefined,
      page: this.lowState.pageIndex + 1,
      limit: this.lowState.pageSize
    };

    this.inventory
      .getLowStock(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response.items ?? response.data ?? []) as StockItem[];
          this.lowState.items = items.map((item) => this.mapStockItem(item));
          this.lowState.total = this.resolveTotal(response, items.length);
          this.lowState.pageIndex = this.resolvePage(response);
          this.lowState.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.lowState.loading = false;
          this.lowState.error = this.resolveErrorMessage(error, 'Unable to load low stock items.');
          this.cdr.markForCheck();
        }
      });
  }

  loadReservations(): void {
    this.reservationState.loading = true;
    this.reservationState.error = null;
    this.cdr.markForCheck();
    const { product, status } = this.reservationFilters.value;
    const query: ReservationQuery = {
      productId: product || undefined,
      status: status && status !== 'ALL' ? (status as ReservationStatus) : undefined,
      page: this.reservationState.pageIndex + 1,
      limit: this.reservationState.pageSize
    };

    this.inventory
      .getReservations(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response.items ?? response.data ?? []) as InventoryReservation[];
          this.reservationState.items = items.map((item) => this.mapReservation(item));
          this.reservationState.total = this.resolveTotal(response, items.length);
          this.reservationState.pageIndex = this.resolvePage(response);
          this.reservationState.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.reservationState.loading = false;
          this.reservationState.error = this.resolveErrorMessage(error, 'Unable to load reservations.');
          this.cdr.markForCheck();
        }
      });
  }

  loadTransfers(): void {
    this.transferState.loading = true;
    this.transferState.error = null;
    this.cdr.markForCheck();
    const { status, fromLocationId, toLocationId } = this.transferFilters.value;
    const transferStatus = status ? (status as TransferStatus) : undefined;
    const query: TransferQuery = {
      status: transferStatus,
      fromLocationId: fromLocationId || undefined,
      toLocationId: toLocationId || undefined,
      page: this.transferState.pageIndex + 1,
      limit: this.transferState.pageSize
    };

    this.transfers
      .list(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response.items ?? response.data ?? []) as TransferOrder[];
          this.transferState.items = items.map((item) => this.mapTransfer(item));
          this.transferState.total = this.resolveTotal(response, items.length);
          this.transferState.pageIndex = this.resolvePage(response);
          this.transferState.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.transferState.loading = false;
          this.transferState.error = this.resolveErrorMessage(error, 'Unable to load transfer orders.');
          this.cdr.markForCheck();
        }
      });
  }

  loadLedger(): void {
    this.ledgerState.loading = true;
    this.ledgerState.error = null;
    this.cdr.markForCheck();
    const { product, locationId, from, to } = this.ledgerFilters.value;
    const query: LedgerQuery = {
      productId: product || undefined,
      locationId: locationId || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      page: this.ledgerState.pageIndex + 1,
      limit: this.ledgerState.pageSize
    };

    this.inventory
      .getLedger(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response.items ?? response.data ?? []) as StockLedgerEntry[];
          this.ledgerState.items = items.map((item) => this.mapLedger(item));
          this.ledgerState.total = this.resolveTotal(response, items.length);
          this.ledgerState.pageIndex = this.resolvePage(response);
          this.ledgerState.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.ledgerState.loading = false;
          this.ledgerState.error = this.resolveErrorMessage(error, 'Unable to load ledger entries.');
          this.cdr.markForCheck();
        }
      });
  }

  loadLocationsTable(): void {
    this.locationState.loading = true;
    this.locationState.error = null;
    this.cdr.markForCheck();
    this.locations
      .list({ includeDeleted: true, page: this.locationState.pageIndex + 1, limit: this.locationState.pageSize, sort: 'priority', order: 'asc' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response.items ?? response.data ?? []) as InventoryLocation[];
          this.locationEntities = items;
          this.locationState.items = items.map((item) => this.mapLocation(item));
          this.locationState.total = this.resolveTotal(response, items.length);
          this.locationState.pageIndex = this.resolvePage(response);
          this.locationState.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.locationState.loading = false;
          this.locationState.error = this.resolveErrorMessage(error, 'Unable to load locations.');
          this.cdr.markForCheck();
        }
      });
  }

  refreshLocationOptions(): void {
    this.locations
      .list({ includeDeleted: false, page: 1, limit: 200, sort: 'priority', order: 'asc' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = (response.items ?? response.data ?? []) as InventoryLocation[];
          this.locationOptions = items;
          this.cdr.markForCheck();
        },
        error: () => {
          this.locationOptions = [];
          this.cdr.markForCheck();
        }
      });
  }

  pageStock(event: { pageIndex: number; pageSize: number }): void {
    this.stockState.pageIndex = event.pageIndex;
    this.stockState.pageSize = event.pageSize;
    this.loadStock();
  }

  pageLow(event: { pageIndex: number; pageSize: number }): void {
    this.lowState.pageIndex = event.pageIndex;
    this.lowState.pageSize = event.pageSize;
    this.loadLowStock();
  }

  pageReservations(event: { pageIndex: number; pageSize: number }): void {
    this.reservationState.pageIndex = event.pageIndex;
    this.reservationState.pageSize = event.pageSize;
    this.loadReservations();
  }

  pageTransfers(event: { pageIndex: number; pageSize: number }): void {
    this.transferState.pageIndex = event.pageIndex;
    this.transferState.pageSize = event.pageSize;
    this.loadTransfers();
  }

  pageLedger(event: { pageIndex: number; pageSize: number }): void {
    this.ledgerState.pageIndex = event.pageIndex;
    this.ledgerState.pageSize = event.pageSize;
    this.loadLedger();
  }

  pageLocations(event: { pageIndex: number; pageSize: number }): void {
    this.locationState.pageIndex = event.pageIndex;
    this.locationState.pageSize = event.pageSize;
    this.loadLocationsTable();
  }

  openAdjustmentDialog(row?: StockRow): void {
    const data: InventoryAdjustmentDialogData = row
      ? {
          productId: row.productId,
          productName: row.productName,
          variantId: row.variantId,
          productSku: row.variantSku,
          defaultLocationId: row.locationId
        }
      : {};
    const ref = this.dialog.open(InventoryAdjustmentDialogComponent, {
      width: '640px',
      data
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result?.refresh) {
        this.loadStock();
        this.loadLowStock();
        this.loadLedger();
      }
    });
  }

  openLocationDialog(location?: InventoryLocation): void {
    const ref = this.dialog.open<InventoryLocationDialogComponent, InventoryLocationDialogData, InventoryLocationDialogResult>(
      InventoryLocationDialogComponent,
      {
        width: '540px',
        data: { location } 
      }
    );
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result?.updated) {
        this.toast.success(this.i18n.instant('inventory.locations.toasts.saved') || 'Location saved');
        this.audit
          .log({
            action: location ? 'inventory.location.update' : 'inventory.location.create',
            entity: 'inventoryLocation',
            entityId: result.location?._id,
            metadata: {
              code: result.location?.code,
              active: result.location?.active
            }
          })
          .subscribe();
        this.loadLocationsTable();
        this.refreshLocationOptions();
      }
    });
  }

  deleteLocation(row: LocationRow): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titleKey: 'Delete location',
        messageKey: `Are you sure you want to deactivate "${row.name}"?`,
        confirmKey: 'Delete'
      }
    });
    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirm) => {
        if (!confirm) {
          return;
        }
        this.locations
          .delete(row.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toast.success(this.i18n.instant('inventory.locations.toasts.deleted') || 'Location deleted');
              this.audit
                .log({
                  action: 'inventory.location.delete',
                  entity: 'inventoryLocation',
                  entityId: row.id
                })
                .subscribe();
              this.loadLocationsTable();
              this.refreshLocationOptions();
            },
            error: (error) => {
              this.toast.error(this.resolveErrorMessage(error, 'Unable to delete location.'));
            }
          });
      });
  }

  restoreLocation(row: LocationRow): void {
    this.locations
      .restore(row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location) => {
          this.toast.success(this.i18n.instant('inventory.locations.toasts.restored') || 'Location restored');
          this.audit
            .log({
              action: 'inventory.location.restore',
              entity: 'inventoryLocation',
              entityId: location._id
            })
            .subscribe();
          this.loadLocationsTable();
          this.refreshLocationOptions();
        },
        error: (error) => {
          this.toast.error(this.resolveErrorMessage(error, 'Unable to restore location.'));
        }
      });
  }

  releaseReservation(row: ReservationRow): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'Release reservation',
        messageKey: `Release ${row.reservedQty} reserved units for ${row.productName}?`,
        confirmKey: 'Release'
      }
    });
    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirm) => {
        if (!confirm) {
          return;
        }
        this.inventory
          .releaseReservation(row.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toast.success(this.i18n.instant('inventory.reservations.toasts.released') || 'Reservation released');
              this.audit
                .log({
                  action: 'inventory.reservation.release',
                  entity: 'inventoryReservation',
                  entityId: row.id,
                  metadata: { qty: row.reservedQty }
                })
                .subscribe();
              this.loadReservations();
              this.loadStock();
              this.loadLedger();
            },
            error: (error) => {
              this.toast.error(this.resolveErrorMessage(error, 'Unable to release reservation.'));
            }
          });
      });
  }

  openTransferDialog(): void {
    const ref = this.dialog.open<InventoryTransferDialogComponent, InventoryTransferDialogData, InventoryTransferDialogResult>(
      InventoryTransferDialogComponent,
      {
        width: '720px',
        data: { locations: this.locationOptions }
      }
    );
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result?.created && result.transfer) {
        this.toast.success(this.i18n.instant('inventory.transfers.toasts.created') || 'Transfer created');
        this.audit
          .log({
            action: 'inventory.transfer.create',
            entity: 'inventoryTransfer',
            entityId: result.transfer._id,
            metadata: {
              from: result.transfer.fromLocation,
              to: result.transfer.toLocation,
              status: result.transfer.status
            }
          })
          .subscribe();
        this.loadTransfers();
        this.loadStock();
      }
    });
  }

  updateTransferStatus(row: TransferRow, status: TransferStatus): void {
    if (row.status === status) {
      return;
    }
    const payload: TransferStatusPayload = { status };
    this.transfers
      .updateStatus(row.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transfer) => {
          this.toast.success(this.i18n.instant('inventory.transfers.toasts.updated') || 'Transfer updated');
          this.audit
            .log({
              action: 'inventory.transfer.updateStatus',
              entity: 'inventoryTransfer',
              entityId: transfer._id,
              metadata: { status: transfer.status }
            })
            .subscribe();
          this.loadTransfers();
          this.loadStock();
          this.loadLedger();
        },
        error: (error) => {
          this.toast.error(this.resolveErrorMessage(error, 'Unable to update transfer.'));
        }
      });
  }

  getLocationEntity(id: string): InventoryLocation | undefined {
    return this.locationEntities.find((location) => location._id === id || (location as any).id === id);
  }

  private mapStockItem(item: StockItem): StockRow {
    const rawItem = item as Record<string, any>;
    const product: any = typeof item.product === 'string' ? {} : item.product;
    const variant: any = typeof item.variant === 'string' ? {} : item.variant;
    const location: any = typeof item.location === 'string' ? { _id: item.location } : item.location;
    const onHand = Number(item.onHand ?? rawItem.quantity ?? 0);
    const reserved = Number(item.reserved ?? rawItem.reserved ?? 0);
    const available = Number(item.available ?? onHand - reserved);
    let status: 'in-stock' | 'low' | 'out' = 'in-stock';
    if (available <= 0) {
      status = 'out';
    } else if (item.reorderPoint !== undefined && item.reorderPoint !== null && available <= Number(item.reorderPoint)) {
      status = 'low';
    }
    return {
      id: item._id || rawItem.id || `${product?._id || 'product'}-${variant?._id || 'default'}-${location?._id || 'global'}`,
      productId: product?._id || (typeof item.product === 'string' ? item.product : ''),
      productName: product?.name || rawItem.productName || (typeof item.product === 'string' ? item.product : ''),
      variantId: variant?._id || (typeof item.variant === 'string' ? item.variant : undefined),
      variantName: variant?.name || rawItem.variantName || undefined,
      variantSku: variant?.sku || rawItem.variantSku || undefined,
      locationId: location?._id || undefined,
      locationName: location?.name || rawItem.locationName || undefined,
      onHand,
      reserved,
      available,
      updatedAt: item.updatedAt,
      reorderPoint: item.reorderPoint ?? null,
      status
    };
  }

  private mapReservation(item: InventoryReservation): ReservationRow {
    const rawReservation = item as Record<string, any>;
    const product: any = typeof item.product === 'string' ? {} : item.product;
    const variant: any = typeof item.variant === 'string' ? {} : item.variant;
    const expiresAt = item.expiresAt || null;
    const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
    return {
      id: item._id || rawReservation.id || `${product?._id || 'product'}-${item.reservedQty}`,
      orderId: item.orderId,
      productName: product?.name || rawReservation.productName || (typeof item.product === 'string' ? item.product : ''),
      variantName: variant?.name || rawReservation.variantName || undefined,
      reservedQty: Number(item.reservedQty ?? 0),
      status: item.status,
      expiresAt,
      isExpired
    };
  }

  private mapTransfer(item: TransferOrder): TransferRow {
    const rawTransfer = item as Record<string, any>;
    const fromLocation: any = typeof item.fromLocation === 'string' ? { name: item.fromLocation } : item.fromLocation;
    const toLocation: any = typeof item.toLocation === 'string' ? { name: item.toLocation } : item.toLocation;
    const lineCount = item.lines?.length ?? 0;
    const linesSummary = (item.lines || [])
      .map((line) => {
        const product: any = typeof line.product === 'string' ? { name: line.product } : line.product;
        const variant: any = typeof line.variant === 'string' ? { name: line.variant } : line.variant;
        return `${line.quantity} × ${variant?.sku || variant?.name || product?.name || line.product}`;
      })
      .join(', ');
    return {
      id: item._id || rawTransfer.id || `${fromLocation?.name || 'from'}-${toLocation?.name || 'to'}`,
      fromLocationName: fromLocation?.name || fromLocation?.code || '',
      toLocationName: toLocation?.name || toLocation?.code || '',
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lineCount,
      linesSummary
    };
  }

  private mapLedger(item: StockLedgerEntry): LedgerRow {
    const rawLedger = item as Record<string, any>;
    const product: any = typeof item.product === 'string' ? { name: item.product } : item.product;
    const variant: any = typeof item.variant === 'string' ? { name: item.variant } : item.variant;
    const location: any = typeof item.location === 'string' ? { name: item.location } : item.location;
    const actor: any = typeof item.actor === 'string' ? { name: item.actor } : item.actor;
    return {
      id: item._id || rawLedger.id || `${product?.name || 'entry'}-${item.occurredAt}`,
      productName: product?.name || (typeof item.product === 'string' ? item.product : ''),
      variantName: variant?.name || variant?.sku || undefined,
      locationName: location?.name || location?.code || undefined,
      quantity: Number(item.quantity ?? 0),
      direction: item.direction,
      reason: item.reason,
      refType: item.refType,
      refId: item.refId,
      occurredAt: item.occurredAt || item.updatedAt || item.createdAt || '',
      actor: actor?.name || actor?.email || (typeof item.actor === 'string' ? item.actor : undefined)
    };
  }

  private mapLocation(item: InventoryLocation): LocationRow {
    const rawLocation = item as Record<string, any>;
    return {
      id: item._id || rawLocation.id,
      code: item.code,
      name: item.name,
      type: item.type,
      priority: item.priority ?? null,
      active: item.active,
      deletedAt: rawLocation.deletedAt || null
    };
  }

  private resolveTotal(response: any, fallback: number): number {
    if (typeof response.total === 'number') {
      return response.total;
    }
    if (response.pagination?.total) {
      return response.pagination.total;
    }
    return fallback;
  }

  private resolvePage(response: any): number {
    if (typeof response.page === 'number') {
      return Math.max(response.page - 1, 0);
    }
    if (response.pagination?.page) {
      return Math.max(response.pagination.page - 1, 0);
    }
    return 0;
  }

  private resolveErrorMessage(error: any, fallbackMessage: string): string {
    const code = error?.error?.error?.code;
    if (code) {
      const translated = this.i18n.instant(`errors.backend.${code}`);
      if (translated && translated !== `errors.backend.${code}`) {
        return translated;
      }
    }
    const message = error?.error?.error?.message;
    if (message) {
      return message;
    }
    return fallbackMessage;
  }

  private permissionAny$(...permissions: string[]): Observable<boolean> {
    if (!permissions.length) {
      return new Observable<boolean>((subscriber) => {
        subscriber.next(false);
        subscriber.complete();
      });
    }
    const streams = permissions.map((permission) => this.permissions.can$(permission));
    return combineLatest(streams).pipe(map((values) => values.some((value) => !!value)));
  }
}
