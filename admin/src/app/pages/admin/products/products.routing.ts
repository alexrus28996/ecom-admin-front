import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { PermissionGuard } from '../../../core/permission.guard';
import { RoleGuard } from '../../../core/role.guard';
import { ProductsListComponent } from './components/products-list.component';
import { ProductFormComponent } from './components/product-form.component';
import { ProductViewComponent } from './components/product-view.component';

const adminGuards = [() => inject(RoleGuard).canActivate(), () => inject(PermissionGuard).canActivate()];

export const productsRoutes: Routes = [
  {
    path: '',
    component: ProductsListComponent,
    canActivate: adminGuards,
    data: { roles: ['admin'], permissions: ['product:read'], breadcrumb: 'products' }
  },
  {
    path: 'new',
    component: ProductFormComponent,
    canActivate: adminGuards,
    data: { roles: ['admin'], permissions: ['product:create'], breadcrumb: 'createProduct' }
  },
  {
    path: ':id',
    component: ProductFormComponent,
    canActivate: adminGuards,
    data: { roles: ['admin'], permissions: ['product:edit'], breadcrumb: 'editProduct' }
  },
  {
    path: ':id/view',
    component: ProductViewComponent,
    canActivate: adminGuards,
    data: { roles: ['admin'], permissions: ['product:read'], breadcrumb: 'viewProduct' }
  }
];
