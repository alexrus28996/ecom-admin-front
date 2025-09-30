import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { distinctUntilChanged, finalize, map, shareReplay } from 'rxjs/operators';

import { AuthService } from './auth.service';

export type PermissionNode = boolean | PermissionTree;
export interface PermissionTree {
  [key: string]: PermissionNode;
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly permissions$ = new BehaviorSubject<PermissionTree>({});
  private inFlight$?: Observable<PermissionTree>;
  private loaded = false;
  private loading = false;
  private hasUniversalAccess = false;

  constructor(private readonly auth: AuthService) {
    this.auth.authorization$.subscribe((state) => {
      this.applyPermissions(state.permissions, state.roles.includes('admin'), state.loaded);
    });
  }

  get snapshot(): PermissionTree {
    return this.permissions$.value;
  }

  stream(): Observable<PermissionTree> {
    return this.permissions$.asObservable();
  }

  load(force = false): Observable<PermissionTree> {
    if (!force && this.loaded) {
      return of(this.snapshot);
    }

    if (this.loading && this.inFlight$) {
      return this.inFlight$;
    }

    this.loading = true;

    const request$ = this.auth
      .loadContext({ force })
      .pipe(
        map(() => this.snapshot),
        finalize(() => {
          this.loading = false;
          this.inFlight$ = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );

    this.inFlight$ = request$;
    return request$;
  }

  clear(): void {
    this.loaded = false;
    this.loading = false;
    this.hasUniversalAccess = false;
    this.permissions$.next({});
  }

  can(permission: string, fallback = false): boolean {
    if (!permission) {
      return fallback;
    }

    if (this.hasUniversalAccess || this.auth.isAdmin) {
      return true;
    }

    const value = this.resolve(this.snapshot, permission);
    return value === undefined ? fallback : !!value;
  }

  can$(permission: string, fallback = false): Observable<boolean> {
    return this.auth.authorization$.pipe(
      map(() => this.can(permission, fallback)),
      distinctUntilChanged()
    );
  }

  private applyPermissions(permissions: readonly string[], isAdmin: boolean, loaded: boolean): void {
    const normalizedPermissions = Array.isArray(permissions) ? permissions : [];
    const hasWildcard = isAdmin || normalizedPermissions.includes('*');
    this.hasUniversalAccess = hasWildcard;

    const isLoaded = loaded || hasWildcard || normalizedPermissions.length > 0;

    if (hasWildcard) {
      this.permissions$.next({});
      this.loaded = isLoaded;
      return;
    }

    const tree = this.normalizeFromArray(normalizedPermissions);
    this.permissions$.next(tree);
    this.loaded = isLoaded;
  }

  private normalizeFromArray(values: readonly string[]): PermissionTree {
    const tree: PermissionTree = {};
    values
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .forEach((permission) => this.assign(tree, permission, true));
    return tree;
  }

  private assign(target: PermissionTree, path: string, value: boolean): void {
    const segments = path.split(/[.:]/).filter((segment) => !!segment);
    if (!segments.length) {
      return;
    }

    let node: PermissionTree = target;
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        node[segment] = value;
        return;
      }

      const next = node[segment];
      if (!next || typeof next !== 'object') {
        node[segment] = {};
      }
      node = node[segment] as PermissionTree;
    });
  }

  private resolve(tree: PermissionTree, path: string): boolean | undefined {
    const segments = path.split(/[.:]/).filter((segment) => !!segment);
    let node: PermissionNode = tree;

    for (const segment of segments) {
      if (!node || typeof node !== 'object') {
        return undefined;
      }
      if (!(segment in node)) {
        return undefined;
      }
      node = (node as PermissionTree)[segment];
    }

    if (typeof node === 'boolean') {
      return node;
    }

    if (node && typeof node === 'object') {
      const allowValue = (node as PermissionTree)['allow'];
      if (typeof allowValue === 'boolean') {
        return allowValue;
      }
    }

    return undefined;
  }
}
