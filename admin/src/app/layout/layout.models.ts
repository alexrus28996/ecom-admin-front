export interface LayoutNavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly roles?: readonly string[];
  readonly exact?: boolean;
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly url?: string;
  readonly icon?: string;
  readonly translationKey?: string;
}
