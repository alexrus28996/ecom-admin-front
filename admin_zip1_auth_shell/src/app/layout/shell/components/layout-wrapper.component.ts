import { Component } from '@angular/core';

@Component({
  selector: 'app-layout-wrapper',
  templateUrl: './layout-wrapper.component.html'
})
export class LayoutWrapperComponent {
  sidebarOpen = true;
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
}
