import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductsListComponent } from './pages/products/products-list.component';
import { ProductFormComponent } from './pages/products/product-form.component';
import { AdminUsersComponent } from './pages/admin/admin-users.component';
import { AdminUsersListComponent } from './pages/admin/users-list.component';
import { AdminUserDetailComponent } from './pages/admin/user-detail.component';
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
import { RoleGuard } from './core/role.guard';
import { PermissionGuard } from './core/permission.guard';
import { LayoutWrapperComponent } from './layout/layout-wrapper.component';
import { ReviewsListComponent } from './pages/admin/reviews/reviews-list.component';
import { ShipmentsListComponent } from './pages/admin/shipments/shipments-list.component';
import { ShipmentDetailComponent } from './pages/admin/shipments/shipment-detail.component';
import { AdminSettingsPlaceholderComponent } from './pages/admin/placeholders/admin-settings-placeholder.component';
import { PermissionsSettingsComponent } from './pages/admin/permissions/permissions-settings.component';
import { CouponsListComponent } from './pages/admin/coupons/coupons-list.component';
import { TransactionsListComponent } from './pages/admin/transactions/transactions-list.component';
import { TransactionDetailComponent } from './pages/admin/transactions/transaction-detail.component';
import { RefundsListComponent } from './pages/admin/refunds/refunds-list.component';
import { RefundDetailComponent } from './pages/admin/refunds/refund-detail.component';
import { ReportsDashboardComponent } from './pages/admin/reports/reports-dashboard.component';

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
      { path: 'dashboard', component: DashboardComponent, data: { breadcrumb: 'dashboard' } },
      { path: 'profile', component: ProfileComponent, data: { breadcrumb: 'profile' } },
      { path: 'cart', component: CartComponent, data: { breadcrumb: 'cart' } },
      { path: 'addresses', component: AddressManagementComponent, data: { breadcrumb: 'addresses' } },
      { path: 'orders', component: OrdersListComponent, data: { breadcrumb: 'orders' } },
      { path: 'orders/:id', component: OrderDetailComponent, data: { breadcrumb: 'orderDetail' } },
      {
        path: 'products',
        redirectTo: 'admin/products',
        pathMatch: 'full'
      },
      {
        path: 'admin/products',
        component: ProductsListComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['product:read'], breadcrumb: 'products' }
      },
      {
        path: 'admin/products/new',
        component: ProductFormComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['product:create'], breadcrumb: 'createProduct' }
      },
      {
        path: 'admin/products/:id/edit',
        component: ProductFormComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['product:update'], breadcrumb: 'editProduct' }
      },
      {
        path: 'admin/users',
        component: AdminUsersListComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'], breadcrumb: 'users' }
      },
      {
        path: 'admin/users/:id',
        component: AdminUserDetailComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'], breadcrumb: 'userDetail' }
      },
      {
        path: 'admin/roles',
        component: AdminUsersComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'], breadcrumb: 'roles' }
      },
      {
        path: 'admin/orders',
        component: AdminOrdersListComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['order:manage'], breadcrumb: 'orders' }
      },
      {
        path: 'admin/orders/:id',
        component: AdminOrderDetailComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['order:manage'], breadcrumb: 'orderDetail' }
      },
      {
        path: 'admin/returns',
        component: AdminReturnsListComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['return:manage'], breadcrumb: 'returns' }
      },
      {
        path: 'admin/inventory',
        component: AdminInventoryComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['inventory:adjust'], breadcrumb: 'inventory' }
      },
      {
        path: 'admin/coupons',
        component: CouponsListComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['custom:manage'], breadcrumb: 'coupons' }
      },
      {
        path: 'admin/permissions',
        component: PermissionsSettingsComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['permissions:manage'], breadcrumb: 'permissions' }
      },
      {
        path: 'admin/reviews',
        component: ReviewsListComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'], breadcrumb: 'reviews' }
      },
      {
        path: 'admin/shipments',
        component: ShipmentsListComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['shipment:manage'], breadcrumb: 'shipments' }
      },
      {
        path: 'admin/shipments/:id',
        component: ShipmentDetailComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['shipment:manage'], breadcrumb: 'shipmentDetail' }
      },
      {
        path: 'admin/transactions',
        component: TransactionsListComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['report:view'], breadcrumb: 'transactions' }
      },
      {
        path: 'admin/transactions/:id',
        component: TransactionDetailComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['report:view'], breadcrumb: 'transactionDetail' }
      },
      {
        path: 'admin/refunds',
        component: RefundsListComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['return:manage'], breadcrumb: 'refunds' }
      },
      {
        path: 'admin/refunds/:id',
        component: RefundDetailComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['return:manage'], breadcrumb: 'refundDetail' }
      },
      {
        path: 'admin/reports',
        component: ReportsDashboardComponent,
        canActivate: [RoleGuard, PermissionGuard],
        data: { roles: ['admin'], permissions: ['report:view'], breadcrumb: 'reports' }
      },
      {
        path: 'admin/settings',
        component: AdminSettingsPlaceholderComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'], breadcrumb: 'settings' }
      },
      {
        path: 'admin/categories',
        component: CategoriesComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin'], breadcrumb: 'categories' }
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
