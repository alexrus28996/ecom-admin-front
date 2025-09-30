import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { LayoutNavItem, BreadcrumbItem } from './layout.models';
import { PermissionsService } from '../core/permissions.service';
import { ContextSearchService, ContextSearchState } from '../core/context-search.service';

@Component({
  selector: 'app-layout-wrapper',
  templateUrl: './layout-wrapper.component.html',
  styleUrls: ['./layout-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutWrapperComponent implements OnInit {
  navItems: LayoutNavItem[] = [];
  private readonly navItemsSubject = new BehaviorSubject<LayoutNavItem[]>([]);

  readonly searchControl = new FormControl('');
  readonly isHandset$: Observable<boolean>;
  readonly visibleNav$: Observable<LayoutNavItem[]>;

  isDark = false;
  navCollapsed = false;
  mobileNavOpen = false;
  breadcrumbs: BreadcrumbItem[] = [];
  searchModuleLabel: string | null = 'Global';
  searchPlaceholder = 'Search products, orders, customers…';
  searchHint: string | null = null;
  searchIcon = 'search';
  searchEnabled = true;
  private searchNavigateTo: string | null = '/admin/products';
  private searchQueryParam = 'q';
  private searchQueryExtras: Record<string, string | number | boolean | null | undefined> | undefined;

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly theme: ThemeService,
    private readonly permissions: PermissionsService,
    private readonly translate: TranslateService,
    private readonly contextSearch: ContextSearchService,
    breakpointObserver: BreakpointObserver
  ) {
    this.isHandset$ = breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]).pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.visibleNav$ = combineLatest([
      this.auth.user$,
      this.navItemsSubject.asObservable()
    ]).pipe(
      map(([, items]) => items.filter((item) => this.auth.hasAnyRole(item.roles))),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.contextSearch.state$
      .pipe(takeUntilDestroyed())
      .subscribe((state) => this.applySearchState(state));
  }

  ngOnInit(): void {
    this.initializeNavItems();

    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.initializeNavItems());

    this.theme.changes.pipe(takeUntilDestroyed()).subscribe((mode) => {
      this.isDark = mode === 'dark';
    });

    this.isHandset$.pipe(takeUntilDestroyed()).subscribe((isHandset) => {
      if (!isHandset) {
        this.mobileNavOpen = false;
      }
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.mobileNavOpen = false;
        this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
      });

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
    if (!this.searchEnabled || !this.searchNavigateTo) {
      return;
    }

    const raw = value ?? this.searchControl.value;
    const search = (raw || '').toString().trim();

    if (!search) {
      return;
    }

    const queryParams: Record<string, string | number | boolean | null | undefined> = {
      ...(this.searchQueryExtras ?? {})
    };

    if (this.searchQueryParam) {
      queryParams[this.searchQueryParam] = search;
    }

    this.contextSearch.configure({ presetValue: search });

    this.router.navigate([this.searchNavigateTo], {
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  logout(): void {
    this.auth.logout();
    this.permissions.clear();
    this.router.navigate(['/login']);
  }

  private initializeNavItems(): void {
    const items: LayoutNavItem[] = [
      { label: this.translate.instant('shell.nav.dashboard'), icon: 'grid_view', route: '/dashboard', exact: true },
      { label: this.translate.instant('shell.nav.orders'), icon: 'receipt_long', route: '/orders' },
      { label: this.translate.instant('shell.nav.cart'), icon: 'shopping_cart', route: '/cart' },
      { label: this.translate.instant('shell.nav.addresses'), icon: 'location_on', route: '/addresses' },
      { label: this.translate.instant('shell.nav.profile'), icon: 'person', route: '/profile' },
      { label: this.translate.instant('shell.nav.products'), icon: 'inventory_2', route: '/admin/products', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.orders'), icon: 'receipt_long', route: '/admin/orders', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.users'), icon: 'group', route: '/admin/users', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.permissions'), icon: 'lock', route: '/admin/permissions', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.categories'), icon: 'category', route: '/admin/categories', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.inventory'), icon: 'warehouse', route: '/admin/inventory', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.returns'), icon: 'assignment_return', route: '/admin/returns', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.reviews'), icon: 'reviews', route: '/admin/reviews', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.shipments'), icon: 'local_shipping', route: '/admin/shipments', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.coupons'), icon: 'confirmation_number', route: '/admin/coupons', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.settings'), icon: 'settings', route: '/admin/settings', roles: ['admin'] }
    ];

    this.navItems = items;
    this.navItemsSubject.next(items);
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
        const breadcrumbKey = `breadcrumb.${data['breadcrumb']}`;
        breadcrumbs = [
          ...breadcrumbs,
          {
            label: data['breadcrumb'] as string,
            url: nextUrl || '/',
            translationKey: breadcrumbKey
          }
        ];
      }

      return this.buildBreadcrumbs(child, nextUrl, breadcrumbs);
    }

    return breadcrumbs;
  }

  private applySearchState(state: ContextSearchState): void {
    this.searchModuleLabel = state.moduleLabel;
    this.searchPlaceholder = state.placeholder;
    this.searchHint = state.hint;
    this.searchIcon = state.icon;
    this.searchEnabled = state.enabled;
    this.searchNavigateTo = state.navigateTo;
    this.searchQueryParam = state.queryParam;
    this.searchQueryExtras = state.queryExtras;

    const preset = state.presetValue ?? '';
    if (preset !== (this.searchControl.value ?? '')) {
      this.searchControl.setValue(preset, { emitEvent: false });
    }
  }
}
