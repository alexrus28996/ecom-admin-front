import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { STORAGE_KEYS } from '../../constants/storage.constants';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly darkClass = 'dark';
  private readonly state$ = new BehaviorSubject<boolean>(false);

  readonly isDark$ = this.state$.asObservable();

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const storedPreference = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = storedPreference ? storedPreference === 'dark' : prefersDark;
    this.setDarkTheme(initial);
  }

  toggle() {
    this.setDarkTheme(!this.state$.value);
  }

  setDarkTheme(isDark: boolean) {
    this.state$.next(isDark);
    if (isDark) {
      this.document.documentElement.classList.add(this.darkClass);
      localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    } else {
      this.document.documentElement.classList.remove(this.darkClass);
      localStorage.setItem(STORAGE_KEYS.theme, 'light');
    }
  }
}
