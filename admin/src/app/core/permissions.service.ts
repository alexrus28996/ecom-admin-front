import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

type PermissionNode = boolean | PermissionTree;
interface PermissionTree {
  [key: string]: PermissionNode;
}

interface PermissionsResponse {
  permissions?: unknown;
  data?: unknown;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly permissions$ = new BehaviorSubject<PermissionTree>({});
  private inFlight$?: Observable<PermissionTree>;
  private loaded = false;
  private loading = false;

  constructor(private readonly http: HttpClient) {}

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

    const request$ = this.http
      .get<PermissionsResponse>(`${environment.apiBaseUrl}/permissions/me`)
      .pipe(
        map((response) => this.normalize(response)),
        tap((tree) => {
          this.permissions$.next(tree);
          this.loaded = true;
        }),
        catchError(() => {
          this.permissions$.next({});
          this.loaded = false;
          return of({} as PermissionTree);
        }),
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
    this.permissions$.next({});
  }

  can(permission: string, fallback = false): boolean {
    if (!permission) {
      return fallback;
    }

    const value = this.resolve(this.snapshot, permission);
    return value === undefined ? fallback : !!value;
  }

  can$(permission: string, fallback = false): Observable<boolean> {
    return this.stream().pipe(
      map(() => this.can(permission, fallback)),
      distinctUntilChanged()
    );
  }

  private normalize(raw: PermissionsResponse | unknown): PermissionTree {
    if (!raw) {
      return {};
    }

    if (Array.isArray(raw)) {
      return this.normalizeFromArray(raw as unknown[]);
    }

    if (typeof raw === 'object') {
      const value = raw as PermissionsResponse;
      if (value.permissions) {
        return this.normalize(value.permissions);
      }
      if (value.data) {
        return this.normalize(value.data);
      }

      const tree: PermissionTree = {};
      Object.entries(value).forEach(([key, node]) => {
        if (node === null || node === undefined) {
          return;
        }
        if (typeof node === 'boolean') {
          tree[key] = node;
          return;
        }
        if (Array.isArray(node)) {
          const nested = this.normalizeFromArray(node as unknown[]);
          if (Object.keys(nested).length > 0) {
            tree[key] = nested;
          }
          return;
        }
        if (typeof node === 'object') {
          const normalizedChild = this.normalize(node);
          if (Object.keys(normalizedChild).length > 0) {
            tree[key] = normalizedChild;
          }
        }
      });
      return tree;
    }

    return {};
  }

  private normalizeFromArray(values: unknown[]): PermissionTree {
    const tree: PermissionTree = {};
    values
      .filter((value): value is string => typeof value === 'string')
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
