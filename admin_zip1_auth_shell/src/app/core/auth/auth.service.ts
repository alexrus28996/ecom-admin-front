import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { TokenResponse, User, LoginRequest } from '../models/auth.models';
import { STORAGE_KEYS } from '../constants/app.constants';

const API = (window as any).__env?.apiBase || '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser$ = new BehaviorSubject<User | null>(this.restoreUser());
  private accessToken: string | null = localStorage.getItem(STORAGE_KEYS.accessToken);
  private refreshToken: string | null = localStorage.getItem(STORAGE_KEYS.refreshToken);
  private refreshTimerSub: any;

  constructor(private http: HttpClient) {}

  private restoreUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) as User : null;
  }

  userChanges(): Observable<User | null> { return this.currentUser$.asObservable(); }
  get user(): User | null { return this.currentUser$.value; }
  get token(): string | null { return this.accessToken; }

  login(payload: LoginRequest): Observable<User> {
    return this.http.post<TokenResponse>(`${API}/auth/login`, { email: payload.email, password: payload.password })
      .pipe(
        tap(resp => this.persistTokens(resp)),
        map(resp => resp.user),
        tap(u => this.setUser(u))
      );
  }

  me(): Observable<User> {
    return this.http.get<{ user: User }>(`${API}/auth/me`).pipe(
      map(r => r.user),
      tap(u => this.setUser(u))
    );
  }

  refresh(): Observable<boolean> {
    if (!this.refreshToken) return throwError(() => new Error('No refresh token'));
    return this.http.post<TokenResponse>(`${API}/auth/refresh`, { refreshToken: this.refreshToken }).pipe(
      tap(resp => this.persistTokens(resp)),
      map(() => true)
    );
  }

  logout(): Observable<void> {
    const rt = this.refreshToken;
    this.clear();
    if (!rt) return of(void 0);
    return this.http.post<{success: boolean}>(`${API}/auth/logout`, { refreshToken: rt }).pipe(map(() => void 0));
  }

  private persistTokens(resp: TokenResponse) {
    this.accessToken = resp.token;
    this.refreshToken = resp.refreshToken;
    localStorage.setItem(STORAGE_KEYS.accessToken, resp.token);
    localStorage.setItem(STORAGE_KEYS.refreshToken, resp.refreshToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(resp.user));
    this.scheduleRefresh(resp.token);
  }

  private setUser(user: User | null) {
    localStorage.setItem(STORAGE_KEYS.user, user ? JSON.stringify(user) : '');
    this.currentUser$.next(user);
  }

  private clear() {
    this.accessToken = null; this.refreshToken = null;
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    this.setUser(null);
    if (this.refreshTimerSub) { this.refreshTimerSub.unsubscribe(); }
  }

  private decodeJwt(expToken: string): number | null {
    try {
      const payload = JSON.parse(atob(expToken.split('.')[1]));
      return payload.exp ? Number(payload.exp) : null;
    } catch { return null; }
  }

  private scheduleRefresh(token: string) {
    const exp = this.decodeJwt(token);
    if (!exp) return;
    const msUntilExpiry = exp * 1000 - Date.now();
    const msUntilRefresh = Math.max(5_000, msUntilExpiry - 60_000);
    if (this.refreshTimerSub) this.refreshTimerSub.unsubscribe();
    this.refreshTimerSub = timer(msUntilRefresh).pipe(switchMap(() => this.refresh())).subscribe({
      next: () => console.debug('[Auth] token refreshed'),
      error: (e) => console.warn('[Auth] refresh failed', e)
    });
  }
}
