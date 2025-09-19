import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Mode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly key = 'theme';
  private readonly changesSubject = new BehaviorSubject<Mode>('light');
  readonly changes = this.changesSubject.asObservable();

  constructor() {
    const saved = (localStorage.getItem(this.key) as Mode) || 'light';
    this.apply(saved);
  }

  set(mode: Mode) {
    this.apply(mode);
  }

  toggle() {
    this.apply(this.changesSubject.value === 'dark' ? 'light' : 'dark');
  }

  private apply(mode: Mode) {
    const root = document.documentElement;
    const body = document.body;

    if (mode === 'dark') {
      root.classList.add('theme-dark');
      body.classList.add('theme-dark');
    } else {
      root.classList.remove('theme-dark');
      body.classList.remove('theme-dark');
    }

    body.classList.add('mat-app-background');
    localStorage.setItem(this.key, mode);
    this.changesSubject.next(mode);
  }
}
