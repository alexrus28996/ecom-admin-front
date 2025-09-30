import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { productsRoutes } from './products.routing';
import { ProductsListComponent } from './components/products-list.component';
import { ProductFormComponent } from './components/product-form.component';
import { ProductAttributesPanelComponent } from './components/product-attributes-panel.component';
import { ProductVariantsPanelComponent } from './components/product-variants-panel.component';
import { VariantMatrixDialogComponent } from './components/variant-matrix-dialog.component';
import { ImageUploaderComponent } from './components/image-uploader.component';
import { ProductDeleteReferencesDialogComponent } from './components/product-delete-references-dialog.component';
import { AttributeFormDialog } from './dialogs/attribute-form.dialog';
import { OptionFormDialog } from './dialogs/option-form.dialog';
import { VariantEditDialog } from './dialogs/variant-edit.dialog';
import { ProductViewComponent } from './components/product-view.component';

@NgModule({
  declarations: [
    ProductsListComponent,
    ProductFormComponent,
    ProductAttributesPanelComponent,
    ProductVariantsPanelComponent,
    VariantMatrixDialogComponent,
    ImageUploaderComponent,
    ProductDeleteReferencesDialogComponent,
    AttributeFormDialog,
    OptionFormDialog,
    VariantEditDialog,
    ProductViewComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(productsRoutes),
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatMenuModule,
    DragDropModule,
    ClipboardModule,
    MatDividerModule,
    MatListModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatRadioModule,
    MatCardModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class ProductsModule {}
