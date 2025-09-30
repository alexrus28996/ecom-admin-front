import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ContextSearchState {
  /** Human readable module name shown beside the search field. */
  moduleLabel: string | null;
  /** Placeholder that appears inside the search input. */
  placeholder: string;
  /** Optional helper text rendered below the search input. */
  hint: string | null;
  /** Optional icon shown as the prefix of the search control. */
  icon: string;
  /** Whether the global search control should be visible. */
  enabled: boolean;
  /** Route to navigate to when submitting a search. */
  navigateTo: string | null;
  /** Query param that should contain the search term. */
  queryParam: string;
  /** Optional static query params merged on navigation. */
  queryExtras?: Record<string, string | number | boolean | null | undefined>;
  /** Optional preset value to prime the search control. */
  presetValue?: string | null;
}

const DEFAULT_STATE: ContextSearchState = {
  moduleLabel: 'Global',
  placeholder: 'Search products, orders, customers…',
  hint: null,
  icon: 'search',
  enabled: true,
  navigateTo: '/admin/products',
  queryParam: 'q',
  queryExtras: undefined,
  presetValue: null
};

@Injectable({ providedIn: 'root' })
export class ContextSearchService {
  private readonly stateSubject = new BehaviorSubject<ContextSearchState>(DEFAULT_STATE);
  readonly state$: Observable<ContextSearchState> = this.stateSubject.asObservable();

  configure(state: Partial<ContextSearchState>): void {
    const current = this.stateSubject.value;
    const next: ContextSearchState = {
      ...DEFAULT_STATE,
      ...current,
      ...state
    };
    this.stateSubject.next(next);
  }

  reset(): void {
    this.stateSubject.next(DEFAULT_STATE);
  }
}
