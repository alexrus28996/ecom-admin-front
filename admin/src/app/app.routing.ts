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
import { LayoutWrapperComponent } from './layout/layout-wrapper.component';
import { ReviewsListComponent } from './pages/admin/reviews/reviews-list.component';
import { ShipmentsListComponent } from './pages/admin/shipments/shipments-list.component';
import { AdminSettingsPlaceholderComponent } from './pages/admin/placeholders/admin-settings-placeholder.component';
import { CouponsListComponent } from './pages/admin/coupons/coupons-list.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot', component: ForgotComponent },
  { path: 'reset/:token', component: ResetComponent },
  { path: 'verify-email/:token', component: EmailVerifyComponent },
  { path: 'denied', component: AccessDeniedComponent },
  {
    path: '',
    component: LayoutWrapperComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { breadcrumb: 'Dashboard' } },
      { path: 'profile', component: ProfileComponent, data: { breadcrumb: 'Profile' } },
      { path: 'cart', component: CartComponent, data: { breadcrumb: 'Cart' } },
      { path: 'addresses', component: AddressManagementComponent, data: { breadcrumb: 'Addresses' } },
      { path: 'orders', component: OrdersListComponent, data: { breadcrumb: 'Orders' } },
      { path: 'orders/:id', component: OrderDetailComponent, data: { breadcrumb: 'Order Detail' } },
      {
        path: 'products',
        redirectTo: 'admin/products',
        pathMatch: 'full'
      },
      {
        path: 'admin/products',
        component: ProductsListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Products' }
      },
      {
        path: 'admin/products/new',
        component: ProductFormComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Create Product' }
      },
      {
        path: 'admin/products/:id/edit',
        component: ProductFormComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Edit Product' }
      },
      {
        path: 'admin/users',
        component: AdminUsersListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Users' }
      },
      {
        path: 'admin/roles',
        component: AdminUsersComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Roles' }
      },
      {
        path: 'admin/orders',
        component: AdminOrdersListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Orders' }
      },
      {
        path: 'admin/orders/:id',
        component: AdminOrderDetailComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Order Detail' }
      },
      {
        path: 'admin/returns',
        component: AdminReturnsListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Returns' }
      },
      {
        path: 'admin/inventory',
        component: AdminInventoryComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Inventory' }
      },
      {
        path: 'admin/coupons',
        component: CouponsListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Coupons' }
      },
      {
        path: 'admin/reviews',
        component: ReviewsListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Reviews' }
      },
      {
        path: 'admin/shipments',
        component: ShipmentsListComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Shipments' }
      },
      {
        path: 'admin/settings',
        component: AdminSettingsPlaceholderComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Settings' }
      },
      {
        path: 'admin/categories',
        component: CategoriesComponent,
        canActivate: [AdminGuard],
        data: { roles: ['admin'], breadcrumb: 'Categories' }
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
