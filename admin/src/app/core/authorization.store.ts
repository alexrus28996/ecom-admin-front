import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import type { PublicUser } from './auth.service';

export interface AuthorizationState {
  user: PublicUser | null;
  roles: string[];
  permissions: string[];
  loaded: boolean;
  loading: boolean;
  lastSyncedAt: number | null;
}

const INITIAL_STATE: AuthorizationState = {
  user: null,
  roles: [],
  permissions: [],
  loaded: false,
  loading: false,
  lastSyncedAt: null
};

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

@Injectable({ providedIn: 'root' })
export class AuthorizationStore {
  private readonly stateSubject = new BehaviorSubject<AuthorizationState>({ ...INITIAL_STATE });
  readonly state$ = this.stateSubject.asObservable();
  readonly user$ = this.state$.pipe(map((state) => state.user), distinctUntilChanged());
  readonly roles$ = this.state$.pipe(
    map((state) => state.roles),
    distinctUntilChanged((prev, curr) => arraysEqual(prev, curr))
  );
  readonly permissions$ = this.state$.pipe(
    map((state) => state.permissions),
    distinctUntilChanged((prev, curr) => arraysEqual(prev, curr))
  );

  get snapshot(): AuthorizationState {
    return this.stateSubject.value;
  }

  patch(partial: Partial<AuthorizationState>): void {
    const current = this.snapshot;
    const next: AuthorizationState = {
      ...current,
      ...partial,
      roles: partial.roles ? [...partial.roles] : current.roles,
      permissions: partial.permissions ? [...partial.permissions] : current.permissions
    };
    this.stateSubject.next(next);
  }

  reset(): void {
    this.stateSubject.next({ ...INITIAL_STATE });
  }
}
