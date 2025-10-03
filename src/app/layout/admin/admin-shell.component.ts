import { AsyncPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { RouterOutlet } from '@angular/router';
import { map, shareReplay, take } from 'rxjs';
import { SidebarComponent } from './components/sidebar.component';
import { TopbarComponent } from './components/topbar.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    LayoutModule,
    MatSidenavModule,
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
  ],
  template: `
    <mat-sidenav-container class="min-h-screen bg-slate-100 dark:bg-slate-950">
      <mat-sidenav
        #drawer
        class="border-r border-slate-200/70 dark:border-slate-800"
        [mode]="(isHandset$ | async) ? 'over' : 'side'"
        [opened]="(isHandset$ | async) ? mobileOpen : true"
        (closedStart)="mobileOpen = false"
      >
        <app-admin-sidebar
          [collapsed]="collapsed"
          (toggleCollapse)="setCollapsed($event)"
        />
      </mat-sidenav>

      <mat-sidenav-content class="flex min-h-screen flex-col">
        <app-admin-topbar (menuToggle)="handleMenuToggle()" />
        <main class="flex-1 bg-slate-50/60 p-6 dark:bg-slate-900/60">
          <div class="mx-auto w-full max-w-6xl">
            <router-outlet />
          </div>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  @ViewChild('drawer') drawer?: MatSidenav;

  collapsed = false;
  mobileOpen = false;

  readonly isHandset$ = this.breakpointObserver
    .observe([Breakpoints.Small, Breakpoints.XSmall])
    .pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  constructor(private readonly breakpointObserver: BreakpointObserver) {}

  handleMenuToggle() {
    this.isHandset$.pipe(take(1)).subscribe((isMobile) => {
      if (isMobile) {
        this.mobileOpen = true;
        this.drawer?.open();
      } else {
        this.collapsed = !this.collapsed;
      }
    });
  }

  setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed;
  }
}
