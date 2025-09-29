import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { MaterialModule } from '../../../shared/material.module';
import { PermissionsSettingsComponent } from './permissions-settings.component';
import { UserPermissionsDialogComponent } from './user-permissions-dialog.component';

@NgModule({
  declarations: [PermissionsSettingsComponent, UserPermissionsDialogComponent],
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, TranslateModule],
  exports: [PermissionsSettingsComponent, UserPermissionsDialogComponent],
})
export class PermissionsModule {}
