import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  nav = [
    { icon: 'dashboard', label: 'shell.dashboard', link: '/admin/dashboard' },
    { icon: 'inventory_2', label: 'shell.products', link: '/admin/products' },
    { icon: 'category', label: 'shell.categories', link: '/admin/categories' },
    { icon: 'group', label: 'shell.users', link: '/admin/users' },
    { icon: 'badge', label: 'shell.permissions', link: '/admin/permissions' },
    { icon: 'local_shipping', label: 'shell.inventory', link: '/admin/inventory' },
    { icon: 'receipt_long', label: 'shell.orders', link: '/admin/orders' },
    { icon: 'payments', label: 'shell.payments', link: '/admin/transactions' },
    { icon: 'bar_chart', label: 'shell.reports', link: '/admin/reports' },
    { icon: 'rule', label: 'shell.audit', link: '/admin/audit' }
  ];
}
