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
import { AuthGuard } from './core/auth.guard';
import { AdminGuard } from './core/admin.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot', component: ForgotComponent },
  { path: 'reset/:token', component: ResetComponent },
  { path: 'verify-email/:token', component: EmailVerifyComponent },
  { path: 'denied', component: AccessDeniedComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'products', component: ProductsListComponent, canActivate: [AuthGuard] },
  { path: 'products/new', component: ProductFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'products/:id', component: ProductFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'cart', component: CartComponent, canActivate: [AuthGuard] },
  { path: 'orders', component: OrdersListComponent, canActivate: [AuthGuard] },
  { path: 'orders/:id', component: OrderDetailComponent, canActivate: [AuthGuard] },
  { path: 'admin/users', component: AdminUsersListComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/roles', component: AdminUsersComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/orders', component: AdminOrdersListComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/orders/:id', component: AdminOrderDetailComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/returns', component: AdminReturnsListComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/inventory', component: AdminInventoryComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/categories', component: CategoriesComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
