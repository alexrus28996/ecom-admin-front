import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { STORAGE_KEYS } from '../../constants/storage.constants';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly supportedLanguages = ['en'];
  private readonly languageSubject = new BehaviorSubject<string>('en');

  readonly language$ = this.languageSubject.asObservable();

  constructor(private readonly translate: TranslateService) {
    this.translate.addLangs(this.supportedLanguages);
    this.translate.setDefaultLang('en');
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.language);
    const initialLanguage = this.isSupported(savedLanguage) ? savedLanguage! : 'en';
    this.setLanguage(initialLanguage);
  }

  get languages(): string[] {
    return this.supportedLanguages;
  }

  setLanguage(language: string) {
    if (!this.isSupported(language)) {
      return;
    }
    this.translate.use(language);
    this.languageSubject.next(language);
    localStorage.setItem(STORAGE_KEYS.language, language);
  }

  private isSupported(language: string | null): language is string {
    return !!language && this.supportedLanguages.includes(language);
  }
}
