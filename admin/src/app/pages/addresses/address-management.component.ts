import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

import { AddressService, Address, AddressInput, AddressType } from '../../services/address.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

type BackendError = unknown;

interface DialogData {
  address?: Address | null;
}

@Component({
  selector: 'app-address-management',
  templateUrl: './address-management.component.html',
  styleUrls: ['./address-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressManagementComponent implements OnInit {
  readonly filterForm = this.fb.group({
    type: ['']
  });

  readonly displayedColumns: string[] = ['name', 'type', 'location', 'phone', 'default', 'actions'];

  dataSource: Address[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50];

  loading = false;
  errorKey: string | null = null;
  lastError: BackendError = null;

  constructor(
    private readonly addresses: AddressService,
    private readonly fb: UntypedFormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const type = (this.filterForm.value.type || '') as AddressType | '';
    this.addresses
      .list({
        type: (type || undefined) as AddressType | undefined,
        page: this.pageIndex + 1,
        limit: this.pageSize
      })
      .subscribe({
        next: (res) => {
          this.dataSource = res.items || [];
          this.total = res.total || 0;
          this.pageIndex = (res.page || 1) - 1;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.lastError = err;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'addresses.errors.loadFailed';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openCreate(): void {
    this.dialog
      .open(AddressFormDialogComponent, {
        width: '520px',
        data: {}
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.toast.success(this.translate.instant('addresses.toasts.created'));
          this.load();
        }
      });
  }

  openEdit(address: Address): void {
    this.dialog
      .open(AddressFormDialogComponent, {
        width: '520px',
        data: { address }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.toast.success(this.translate.instant('addresses.toasts.updated'));
          this.load();
        }
      });
  }

  confirmDelete(address: Address): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'addresses.delete.title',
        messageKey: 'addresses.delete.message',
        messageParams: { name: address.name || address.line1 },
        confirmKey: 'addresses.delete.confirm'
      }
    });

    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.delete(address);
      }
    });
  }

  setDefault(address: Address): void {
    if (!address?._id) {
      return;
    }
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.addresses.setDefault(address._id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('addresses.toasts.defaultSet'));
        this.load();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'addresses.errors.defaultFailed';
        this.lastError = err;
        this.loading = false;
        this.toast.error(this.translate.instant('addresses.errors.defaultFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  trackById(_: number, address: Address): string {
    return address._id || address.line1;
  }

  private delete(address: Address): void {
    if (!address?._id) {
      return;
    }

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.addresses.delete(address._id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('addresses.toasts.deleted'));
        this.load();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'addresses.errors.deleteFailed';
        this.lastError = err;
        this.loading = false;
        this.toast.error(this.translate.instant('addresses.errors.deleteFailed'));
        this.cdr.markForCheck();
      }
    });
  }
}

@Component({
  selector: 'app-address-form-dialog',
  templateUrl: './address-form-dialog.component.html',
  styleUrls: ['./address-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressFormDialogComponent {
  readonly form: UntypedFormGroup = this.fb.group({
    type: ['shipping', Validators.required],
    name: [''],
    company: [''],
    line1: ['', [Validators.required, Validators.minLength(3)]],
    line2: [''],
    city: [''],
    region: [''],
    postalCode: [''],
    country: ['', Validators.required],
    phone: [''],
    isDefault: [false]
  });

  loading = false;
  errorKey: string | null = null;

  readonly typeOptions: Array<{ value: AddressType; labelKey: string }> = [
    { value: 'shipping', labelKey: 'addresses.form.type.shipping' },
    { value: 'billing', labelKey: 'addresses.form.type.billing' }
  ];

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly dialogRef: MatDialogRef<AddressFormDialogComponent>,
    private readonly addresses: AddressService,
    private readonly cdr: ChangeDetectorRef,
    private readonly translate: TranslateService,
    private readonly toast: ToastService,
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogData
  ) {
    if (data?.address) {
      const { address } = data;
      this.form.patchValue({
        type: address.type || 'shipping',
        name: address.name || '',
        company: address.company || '',
        line1: address.line1 || '',
        line2: address.line2 || '',
        city: address.city || '',
        region: address.region || '',
        postalCode: address.postalCode || '',
        country: address.country || '',
        phone: address.phone || '',
        isDefault: !!address.isDefault
      });
    }
  }

  save(): void {
    if (this.loading) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.data?.address?._id
      ? this.addresses.update(this.data.address._id, payload)
      : this.addresses.create(payload);

    this.loading = true;
    this.errorKey = null;
    this.cdr.markForCheck();

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.dialogRef.close(true);
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'addresses.errors.saveFailed';
        this.loading = false;
        this.cdr.markForCheck();
        const message = this.translate.instant('addresses.errors.saveFailed');
        this.toast.error(message);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private buildPayload(): AddressInput {
    const raw = this.form.getRawValue();
    return {
      type: raw.type,
      name: raw.name?.trim() || null,
      company: raw.company?.trim() || null,
      line1: raw.line1?.trim() || '',
      line2: raw.line2?.trim() || null,
      city: raw.city?.trim() || null,
      region: raw.region?.trim() || null,
      postalCode: raw.postalCode?.trim() || null,
      country: raw.country?.trim() || '',
      phone: raw.phone?.trim() || null,
      isDefault: !!raw.isDefault
    };
  }
}
