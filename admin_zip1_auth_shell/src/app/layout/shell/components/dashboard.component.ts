import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  cards = [
    { titleKey: 'dashboard.cards.revenue', value: '₹ 0.00' },
    { titleKey: 'dashboard.cards.orders', value: '0' },
    { titleKey: 'dashboard.cards.customers', value: '0' },
    { titleKey: 'dashboard.cards.products', value: '0' },
  ];
}
