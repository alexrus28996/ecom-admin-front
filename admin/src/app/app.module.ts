import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { LayoutModule } from '@angular/cdk/layout';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app.routing';
import { AppComponent } from './components/app.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductsListComponent } from './pages/products/products-list.component';
import { ProductFormComponent } from './pages/products/product-form.component';
import { ProductVariantsDialogComponent } from './pages/products/product-variants-dialog.component';
import { AdminUsersComponent } from './pages/admin/admin-users.component';
import { AdminUsersListComponent } from './pages/admin/users-list.component';
import { UserPermissionsDialogComponent } from './pages/admin/user-permissions-dialog.component';
import { AdminUserDetailComponent } from './pages/admin/user-detail.component';
import { AdminOrdersListComponent } from './pages/admin/orders-admin-list.component';
import { AdminOrderDetailComponent } from './pages/admin/order-admin-detail.component';
import { AdminReturnsListComponent } from './pages/admin/returns-admin-list.component';
import { AdminInventoryComponent } from './pages/admin/inventory-admin.component';
import { InventoryAdjustmentDialogComponent } from './pages/admin/inventory-adjustment-dialog.component';
import { InventoryLocationDialogComponent } from './pages/admin/inventory-location-dialog.component';
import { InventoryTransferDialogComponent } from './pages/admin/inventory-transfer-dialog.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { CategoryFormDialogComponent } from './pages/categories/category-form-dialog.component';
import { CategoryReorderDialogComponent } from './pages/categories/category-reorder-dialog.component';
import { AddressManagementComponent, AddressFormDialogComponent } from './pages/addresses/address-management.component';
import { RegisterComponent } from './pages/register/register.component';
import { CartComponent } from './pages/cart/cart.component';
import { OrdersListComponent } from './pages/orders/orders-list.component';
import { OrderDetailComponent } from './pages/orders/order-detail.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ForgotComponent } from './pages/auth-forgot/forgot.component';
import { ResetComponent } from './pages/auth-reset/reset.component';
import { EmailVerifyComponent } from './pages/email-verify/email-verify.component';
import { ToastsComponent } from './components/toasts.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import { LoadingComponent } from './shared/loading.component';
import { AccessDeniedComponent } from './pages/denied/access-denied.component';
import { ErrorBannerComponent } from './shared/error-banner.component';
import { LayoutWrapperComponent } from './layout/layout-wrapper.component';
import { SidebarComponent } from './layout/sidebar.component';
import { TopbarComponent } from './layout/topbar.component';
import { BreadcrumbComponent } from './layout/breadcrumb.component';
import { AdminSettingsPlaceholderComponent } from './pages/admin/placeholders/admin-settings-placeholder.component';
import { ShipmentsListComponent } from './pages/admin/shipments/shipments-list.component';
import { ShipmentFormComponent } from './pages/admin/shipments/shipment-form.component';
import { CouponsListComponent } from './pages/admin/coupons/coupons-list.component';
import { CouponFormComponent } from './pages/admin/coupons/coupon-form.component';
import { ReviewsListComponent } from './pages/admin/reviews/reviews-list.component';
import { DebugUserComponent } from './shared/debug-user.component';
import { PermissionsSettingsComponent } from './pages/admin/permissions/permissions-settings.component';

import { MaterialModule } from './shared/material.module';
import { AuthInterceptor } from './core/auth.interceptor';

export function translateHttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    ProductsListComponent,
    ProductFormComponent,
    ProductVariantsDialogComponent,
    CartComponent,
    OrdersListComponent,
    OrderDetailComponent,
    ProfileComponent,
    ForgotComponent,
    ResetComponent,
    EmailVerifyComponent,
    ToastsComponent,
    AdminUsersListComponent,
    AdminUserDetailComponent,
    AdminOrdersListComponent,
    AdminOrderDetailComponent,
    CategoriesComponent,
    CategoryFormDialogComponent,
    CategoryReorderDialogComponent,
    AdminUsersComponent,
    UserPermissionsDialogComponent,
    ConfirmDialogComponent,
    AdminReturnsListComponent,
    AdminInventoryComponent,
    InventoryAdjustmentDialogComponent,
    InventoryLocationDialogComponent,
    InventoryTransferDialogComponent,
    ErrorBannerComponent,
    LoadingComponent,
    AccessDeniedComponent,
    AddressManagementComponent,
    AddressFormDialogComponent,
    LayoutWrapperComponent,
    SidebarComponent,
    TopbarComponent,
    BreadcrumbComponent,
    ReviewsListComponent,
    ShipmentsListComponent,
    ShipmentFormComponent,
    AdminSettingsPlaceholderComponent,
    CouponsListComponent,
    CouponFormComponent,
    PermissionsSettingsComponent,
    DebugUserComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    LayoutModule,
    MaterialModule,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: translateHttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    AppRoutingModule
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule {}
