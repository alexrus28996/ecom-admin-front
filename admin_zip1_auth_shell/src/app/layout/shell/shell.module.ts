import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../shared/material.module';
import { LayoutWrapperComponent } from './components/layout-wrapper.component';
import { TopbarComponent } from './components/topbar.component';
import { SidebarComponent } from './components/sidebar.component';
import { BreadcrumbsComponent } from './components/breadcrumbs.component';
import { DashboardComponent } from './components/dashboard.component';

@NgModule({
  declarations: [LayoutWrapperComponent, TopbarComponent, SidebarComponent, BreadcrumbsComponent, DashboardComponent],
  imports: [CommonModule, RouterModule, MaterialModule],
})
export class ShellModule {}
