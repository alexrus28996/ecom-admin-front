import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductsListComponent } from './pages/products/products-list.component';
import { ProductFormComponent } from './pages/products/product-form.component';
import { AdminUsersComponent } from './pages/admin/admin-users.component';
import { AdminUsersListComponent } from './pages/admin/users-list.component';
import { AdminOrdersListComponent } from './pages/admin/orders-admin-list.component';
import { AdminOrderDetailComponent } from './pages/admin/order-admin-detail.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { AdminReturnsListComponent } from './pages/admin/returns-admin-list.component';
import { RegisterComponent } from './pages/register/register.component';
import { CartComponent } from './pages/cart/cart.component';
import { OrdersListComponent } from './pages/orders/orders-list.component';
import { OrderDetailComponent } from './pages/orders/order-detail.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ForgotComponent } from './pages/auth-forgot/forgot.component';
import { ResetComponent } from './pages/auth-reset/reset.component';
import { AccessDeniedComponent } from './pages/denied/access-denied.component';
import { AdminInventoryComponent } from './pages/admin/inventory-admin.component';
import { EmailVerifyComponent } from './pages/email-verify/email-verify.component';
import { AddressManagementComponent } from './pages/addresses/address-management.component';
import { AuthGuard } from './core/auth.guard';
import { AdminGuard } from './core/admin.guard';
import { LayoutShellComponent } from './core/layout/layout-shell.component';
import { AdminCouponsPlaceholderComponent } from './pages/admin/placeholders/admin-coupons-placeholder.component';
import { AdminReviewsPlaceholderComponent } from './pages/admin/placeholders/admin-reviews-placeholder.component';
import { AdminShipmentsPlaceholderComponent } from './pages/admin/placeholders/admin-shipments-placeholder.component';
import { AdminSettingsPlaceholderComponent } from './pages/admin/placeholders/admin-settings-placeholder.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot', component: ForgotComponent },
  { path: 'reset/:token', component: ResetComponent },
  { path: 'verify-email/:token', component: EmailVerifyComponent },
  { path: 'denied', component: AccessDeniedComponent },
  {
    path: '',
    component: LayoutShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'cart', component: CartComponent },
      { path: 'addresses', component: AddressManagementComponent },
      { path: 'orders', component: OrdersListComponent },
      { path: 'orders/:id', component: OrderDetailComponent },
      {
        path: 'products',
        component: ProductsListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'products/new',
        component: ProductFormComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'products/:id',
        component: ProductFormComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/users',
        component: AdminUsersListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/roles',
        component: AdminUsersComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/orders',
        component: AdminOrdersListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/orders/:id',
        component: AdminOrderDetailComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/returns',
        component: AdminReturnsListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/inventory',
        component: AdminInventoryComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/coupons',
        component: AdminCouponsPlaceholderComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/reviews',
        component: AdminReviewsPlaceholderComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/shipments',
        component: AdminShipmentsPlaceholderComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/settings',
        component: AdminSettingsPlaceholderComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'admin/categories',
        component: CategoriesComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'] }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
