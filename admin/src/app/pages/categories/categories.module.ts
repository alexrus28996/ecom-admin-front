import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { CategoriesComponent } from './categories.component';
import { CategoryFormDialogComponent } from './category-form-dialog.component';
import { MaterialModule } from '../../shared/material.module';

@NgModule({
  declarations: [CategoriesComponent, CategoryFormDialogComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule, TranslateModule],
  exports: [CategoriesComponent]
})
export class CategoriesModule {}
