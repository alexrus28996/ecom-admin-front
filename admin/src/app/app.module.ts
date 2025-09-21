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
import { AdminOrdersListComponent } from './pages/admin/orders-admin-list.component';
import { AdminOrderDetailComponent } from './pages/admin/order-admin-detail.component';
import { AdminReturnsListComponent } from './pages/admin/returns-admin-list.component';
import { AdminInventoryComponent } from './pages/admin/inventory-admin.component';
import { CategoriesComponent } from './pages/categories/categories.component';
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
import { LayoutShellComponent } from './core/layout/layout-shell.component';
import { AdminCouponsPlaceholderComponent } from './pages/admin/placeholders/admin-coupons-placeholder.component';
import { AdminReviewsPlaceholderComponent } from './pages/admin/placeholders/admin-reviews-placeholder.component';
import { AdminShipmentsPlaceholderComponent } from './pages/admin/placeholders/admin-shipments-placeholder.component';
import { AdminSettingsPlaceholderComponent } from './pages/admin/placeholders/admin-settings-placeholder.component';

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
    AdminOrdersListComponent,
    AdminOrderDetailComponent,
    CategoriesComponent,
    AdminUsersComponent,
    ConfirmDialogComponent,
    AdminReturnsListComponent,
    AdminInventoryComponent,
    ErrorBannerComponent,
    LoadingComponent,
    AccessDeniedComponent,
    AddressManagementComponent,
    AddressFormDialogComponent,
    LayoutShellComponent,
    AdminCouponsPlaceholderComponent,
    AdminReviewsPlaceholderComponent,
    AdminShipmentsPlaceholderComponent,
    AdminSettingsPlaceholderComponent
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
