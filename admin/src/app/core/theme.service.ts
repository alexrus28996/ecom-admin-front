import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

type Mode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';
  private readonly changesSubject: BehaviorSubject<Mode>;
  readonly changes: Observable<Mode>;

  constructor() {
    const initial = this.resolveInitialMode();
    this.changesSubject = new BehaviorSubject<Mode>(initial);
    this.changes = this.changesSubject.asObservable();
    this.apply(initial, false);
  }

  set(mode: Mode): void {
    this.apply(mode);
  }

  toggle(): void {
    const next = this.changesSubject.value === 'dark' ? 'light' : 'dark';
    this.apply(next);
  }

  private resolveInitialMode(): Mode {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    try {
      const stored = window.localStorage.getItem(this.storageKey) as Mode | null;
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (err) {
      console.warn('Unable to access theme preference storage.', err);
    }

    const mediaQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    if (mediaQuery && !mediaQuery.matches) {
      return 'light';
    }

    return 'dark';
  }

  private apply(mode: Mode, persist: boolean = true): void {
    if (typeof document === 'undefined') {
      this.changesSubject.next(mode);
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const themeClass = mode === 'dark' ? 'theme-dark' : 'theme-light';

    root.classList.remove('theme-dark', 'theme-light');
    body.classList.remove('theme-dark', 'theme-light');

    root.classList.add(themeClass);
    body.classList.add(themeClass, 'mat-app-background');

    if (persist && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, mode);
      } catch (err) {
        console.warn('Failed to persist theme preference.', err);
      }
    }

    this.changesSubject.next(mode);
  }
}
