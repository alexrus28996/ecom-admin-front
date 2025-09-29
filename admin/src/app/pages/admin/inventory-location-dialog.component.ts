import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { InventoryLocation, LocationType } from '../../services/api.types';
import { LocationPayload, LocationService } from '../../services/location.service';
import { ToastService } from '../../core/toast.service';

export interface InventoryLocationDialogData {
  location?: InventoryLocation;
}

export interface InventoryLocationDialogResult {
  updated: boolean;
  location?: InventoryLocation;
}

@Component({
  selector: 'app-inventory-location-dialog',
  templateUrl: './inventory-location-dialog.component.html',
  styleUrls: ['./inventory-location-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryLocationDialogComponent {
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['WAREHOUSE' as LocationType],
    priority: [null as number | null],
    active: [true],
    geo: this.fb.group({
      address1: [''],
      address2: [''],
      city: [''],
      region: [''],
      postalCode: [''],
      country: ['']
    })
  });

  readonly locationTypes: LocationType[] = ['WAREHOUSE', 'STORE', 'DISTRIBUTION', 'FULFILLMENT', 'VENDOR', 'OTHER'];
  saving = false;

  constructor(
    private readonly dialogRef: MatDialogRef<InventoryLocationDialogComponent, InventoryLocationDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public readonly data: InventoryLocationDialogData,
    private readonly fb: FormBuilder,
    private readonly locations: LocationService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {
    if (data.location) {
      this.patchLocation(data.location);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.createPayload();
    this.saving = true;
    this.cdr.markForCheck();

    const request$ = this.data.location
      ? this.locations.update(this.data.location._id || (this.data.location as any).id, payload)
      : this.locations.create(payload);

    request$.subscribe({
      next: (location) => {
        this.saving = false;
        this.cdr.markForCheck();
        this.dialogRef.close({ updated: true, location });
      },
      error: (error) => {
        this.saving = false;
        this.toast.error(this.resolveError(error));
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.dialogRef.close({ updated: false });
  }

  private patchLocation(location: InventoryLocation): void {
    this.form.patchValue({
      code: location.code,
      name: location.name,
      type: (location.type as LocationType) || 'WAREHOUSE',
      priority: location.priority ?? null,
      active: location.active,
      geo: {
        address1: location.geo?.address1 || '',
        address2: location.geo?.address2 || '',
        city: location.geo?.city || '',
        region: location.geo?.region || '',
        postalCode: location.geo?.postalCode || '',
        country: location.geo?.country || ''
      }
    });
  }

  private createPayload(): LocationPayload {
    const raw = this.form.getRawValue();
    const code = (raw.code || '').trim();
    const name = (raw.name || '').trim();
    return {
      code,
      name,
      type: raw.type || undefined,
      priority: raw.priority === null ? null : Number(raw.priority),
      active: raw.active ?? true,
      geo: {
        address1: raw.geo?.address1?.trim() || undefined,
        address2: raw.geo?.address2?.trim() || undefined,
        city: raw.geo?.city?.trim() || undefined,
        region: raw.geo?.region?.trim() || undefined,
        postalCode: raw.geo?.postalCode?.trim() || undefined,
        country: raw.geo?.country?.trim() || undefined
      }
    };
  }

  private resolveError(error: any): string {
    return (
      error?.error?.error?.message ||
      error?.message ||
      'Unable to save location. Please try again.'
    );
  }
}
