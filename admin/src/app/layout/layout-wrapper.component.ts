import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { LayoutNavItem, BreadcrumbItem } from './layout.models';

@Component({
  selector: 'app-layout-wrapper',
  templateUrl: './layout-wrapper.component.html',
  styleUrls: ['./layout-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutWrapperComponent implements OnInit {
  readonly navItems: LayoutNavItem[] = [
    { label: 'Dashboard', icon: 'grid_view', route: '/dashboard', exact: true },
    { label: 'Products', icon: 'inventory_2', route: '/admin/products', roles: ['admin'] },
    { label: 'Orders', icon: 'receipt_long', route: '/admin/orders', roles: ['admin'] },
    { label: 'Users', icon: 'group', route: '/admin/users', roles: ['admin'] },
    { label: 'Inventory', icon: 'warehouse', route: '/admin/inventory', roles: ['admin'] },
    { label: 'Returns', icon: 'assignment_return', route: '/admin/returns', roles: ['admin'] },
    { label: 'Reviews', icon: 'reviews', route: '/admin/reviews', roles: ['admin'] },
    { label: 'Shipments', icon: 'local_shipping', route: '/admin/shipments', roles: ['admin'] },
    { label: 'Coupons', icon: 'confirmation_number', route: '/admin/coupons', roles: ['admin'] },
    { label: 'Settings', icon: 'settings', route: '/admin/settings', roles: ['admin'] }
  ];

  readonly searchControl = new FormControl('');
  readonly isHandset$: Observable<boolean>;
  readonly visibleNav$: Observable<LayoutNavItem[]>;

  isDark = false;
  navCollapsed = false;
  mobileNavOpen = false;
  breadcrumbs: BreadcrumbItem[] = [];

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly theme: ThemeService,
    breakpointObserver: BreakpointObserver,
    private readonly destroyRef: DestroyRef
  ) {
    this.isHandset$ = breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]).pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.visibleNav$ = this.auth.user$.pipe(
      map(() => this.navItems.filter((item) => this.auth.hasAnyRole(item.roles))),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  ngOnInit(): void {
    this.theme.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((mode) => {
      this.isDark = mode === 'dark';
    });

    this.isHandset$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isHandset) => {
      if (!isHandset) {
        this.mobileNavOpen = false;
      }
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.mobileNavOpen = false;
        this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
      });

    // Seed initial breadcrumbs on load
    this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleSidebar(): void {
    if (this.mobileNavOpen) {
      this.mobileNavOpen = false;
      return;
    }

    this.navCollapsed = !this.navCollapsed;
  }

  openMobileNav(): void {
    this.mobileNavOpen = true;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  submitSearch(value?: string): void {
    const raw = value ?? this.searchControl.value;
    const search = (raw || '').toString().trim();

    if (!search) {
      return;
    }

    this.router.navigate(['/admin/products'], { queryParams: { q: search } });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private buildBreadcrumbs(route: ActivatedRoute, url = '', breadcrumbs: BreadcrumbItem[] = []): BreadcrumbItem[] {
    const children = route.children;

    if (!children || children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      if (child.outlet !== 'primary') {
        continue;
      }

      const routeURL = child.snapshot.url.map((segment) => segment.path).join('/');
      const nextUrl = routeURL ? `${url}/${routeURL}` : url;
      const data = child.snapshot.data;

      if (data && data['breadcrumb']) {
        breadcrumbs = [
          ...breadcrumbs,
          { label: data['breadcrumb'] as string, url: nextUrl || '/' }
        ];
      }

      return this.buildBreadcrumbs(child, nextUrl, breadcrumbs);
    }

    return breadcrumbs;
  }
}
