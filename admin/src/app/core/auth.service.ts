import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map, finalize, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PublicUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  isVerified?: boolean;
  avatarUrl?: string;
}

export interface UserPreferences {
  locale?: string;
  notifications?: { email?: boolean; sms?: boolean; push?: boolean };
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
  refreshToken?: string;
}

export interface PreferencesResponse {
  preferences: UserPreferences;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  private refreshKey = 'refresh_token';
  private userKey = 'auth_user';
  private _user$ = new BehaviorSubject<PublicUser | null>(null);
  user$ = this._user$.asObservable();
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshRequest$?: Observable<LoginResponse | null>;
  private readonly refreshingSubject = new BehaviorSubject<boolean>(false);
  readonly refreshing$ = this.refreshingSubject.asObservable();
  private readonly refreshLeadTimeMs = 60_000;
  private readonly minRefreshIntervalMs = 5_000;

  constructor(private http: HttpClient) {
    // Try restore from storage
    const storedToken = localStorage.getItem(this.tokenKey);
    const storedRefresh = localStorage.getItem(this.refreshKey);
    const userRaw = localStorage.getItem(this.userKey);

    this.accessToken = storedToken;
    this.refreshTokenValue = storedRefresh;

    if (userRaw) {
      try {
        this._user$.next(JSON.parse(userRaw));
      } catch {
        this._user$.next(null);
      }
    }

    if (storedToken) {
      this.scheduleTokenRefresh(storedToken);
    }
  }

  get token(): string | null { return this.accessToken; }
  get refreshToken(): string | null { return this.refreshTokenValue; }
  get user(): PublicUser | null { return this._user$.value; }
  get isLoggedIn(): boolean { return this.hasValidAccessToken(); }
  get roles(): string[] { return this.user?.roles ?? []; }
  get isAdmin(): boolean { return this.hasRole('admin'); }
  get hasRefreshToken(): boolean { return !!this.refreshToken; }

  hasRole(role: string): boolean {
    if (!role) {
      return false;
    }
    return this.roles.includes(role);
  }

  hasAnyRole(roles?: readonly string[] | null): boolean {
    if (!roles || roles.length === 0) {
      return true;
    }

    const userRoles = this.roles;
    return roles.some((role) => userRoles.includes(role));
  }

  hasAllRoles(roles?: readonly string[] | null): boolean {
    if (!roles || roles.length === 0) {
      return true;
    }

    const userRoles = this.roles;
    return roles.every((role) => userRoles.includes(role));
  }

  private setUser(user: PublicUser | null): void {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
      this._user$.next(user);
    } else {
      localStorage.removeItem(this.userKey);
      this._user$.next(null);
    }
  }

  private persistSession(response: LoginResponse | null): void {
    if (!response) {
      return;
    }

    if (response.token) {
      this.setAccessToken(response.token);
      this.scheduleTokenRefresh(response.token);
    }
    if (response.refreshToken) {
      this.setRefreshToken(response.refreshToken);
    }
    if (response.user) {
      this.setUser(response.user);
    }
  }

  private clearSession(): void {
    this.cancelScheduledRefresh();
    this.refreshingSubject.next(false);
    this.refreshRequest$ = undefined;
    this.setAccessToken(null);
    this.setRefreshToken(null);
    this.setUser(null);
  }

  register(name: string, email: string, password: string): Observable<{ user: PublicUser }> {
    return this.http.post<{ user: PublicUser }>(`${environment.apiBaseUrl}/auth/register`, { name, email, password });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password }).pipe(
      tap((res) => this.persistSession(res))
    );
  }

  refresh(options: { force?: boolean } = {}): Observable<LoginResponse | null> {
    const { force = false } = options;
    const token = this.refreshToken;
    if (!token) {
      return of(null);
    }

    if (this.refreshRequest$ && !force) {
      return this.refreshRequest$;
    }

    if (this.refreshRequest$ && force) {
      return this.refreshRequest$;
    }

    this.refreshingSubject.next(true);

    const request$ = this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken: token })
      .pipe(
        tap((res) => this.persistSession(res)),
        map((res) => res ?? null),
        catchError((error) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshingSubject.next(false);
          this.refreshRequest$ = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );

    this.refreshRequest$ = request$;
    return request$;
  }

  logout(refreshToken?: string): void {
    const token = refreshToken ?? this.refreshToken;
    if (token) {
      this.http
        .post(`${environment.apiBaseUrl}/auth/logout`, { refreshToken: token })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }

    this.clearSession();
  }

  getCurrentUser(): Observable<PublicUser | null> {
    return this.http.get<{ user: PublicUser }>(`${environment.apiBaseUrl}/auth/me`).pipe(
      map(({ user }) => user),
      tap((user) => this.setUser(user)),
      catchError((err) => {
        this.clearSession();
        return of(null);
      })
    );
  }

  updateProfile(data: Partial<Pick<PublicUser, 'name' | 'avatarUrl'>> & Record<string, unknown>): Observable<PublicUser> {
    return this.http.patch<{ user: PublicUser }>(`${environment.apiBaseUrl}/auth/profile`, data).pipe(
      map(({ user }) => user),
      tap((user) => this.setUser(user))
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/auth/password/change`, { currentPassword, newPassword });
  }

  forgotPassword(email: string, baseUrl?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/auth/password/forgot`, { email, baseUrl });
  }

  resetPassword(token: string, password: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/auth/password/reset`, { token, password });
  }

  requestEmailVerification(baseUrl?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/auth/email/verify/request`, { baseUrl });
  }

  verifyEmail(token: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/auth/email/verify`, { token });
  }

  requestEmailChange(newEmail: string, baseUrl?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/auth/email/change/request`, { newEmail, baseUrl });
  }

  getPreferences(): Observable<PreferencesResponse> {
    return this.http.get<PreferencesResponse>(`${environment.apiBaseUrl}/auth/preferences`);
  }

  updatePreferences(prefs: UserPreferences): Observable<PreferencesResponse> {
    return this.http.patch<PreferencesResponse>(`${environment.apiBaseUrl}/auth/preferences`, prefs);
  }

  hasValidAccessToken(offsetMs = 0): boolean {
    const token = this.token;
    if (!token) {
      return false;
    }

    const expiresAt = this.getTokenExpiration(token);
    if (!expiresAt) {
      return true;
    }

    return expiresAt - offsetMs > Date.now();
  }

  private setAccessToken(token: string | null): void {
    this.accessToken = token;
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  private setRefreshToken(token: string | null): void {
    this.refreshTokenValue = token;
    if (token) {
      localStorage.setItem(this.refreshKey, token);
    } else {
      localStorage.removeItem(this.refreshKey);
    }
  }

  private scheduleTokenRefresh(token: string): void {
    this.cancelScheduledRefresh();

    const expiresAt = this.getTokenExpiration(token);
    if (!expiresAt) {
      return;
    }

    const now = Date.now();
    const msUntilExpiration = expiresAt - now;

    if (msUntilExpiration <= this.refreshLeadTimeMs) {
      this.triggerRefresh();
      return;
    }

    const delay = Math.max(msUntilExpiration - this.refreshLeadTimeMs, this.minRefreshIntervalMs);
    this.refreshTimer = setTimeout(() => this.triggerRefresh(), delay);
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private triggerRefresh(): void {
    if (!this.hasRefreshToken) {
      return;
    }

    this.refresh({ force: true }).pipe(catchError(() => of(null))).subscribe();
  }

  private getTokenExpiration(token: string): number | null {
    const claims = this.decodeTokenClaims(token);
    const exp = claims?.['exp'];
    if (typeof exp === 'number' && Number.isFinite(exp)) {
      return exp * 1000;
    }
    return null;
  }

  private decodeTokenClaims(token: string): Record<string, unknown> | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const payload = parts[1];
      const decoded = this.base64UrlDecode(payload);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = padding ? normalized.padEnd(normalized.length + (4 - padding), '=') : normalized;
    const globalRef: any = globalThis as any;

    if (globalRef?.atob) {
      return globalRef.atob(padded);
    }

    if (globalRef?.Buffer) {
      return globalRef.Buffer.from(padded, 'base64').toString('utf-8');
    }

    throw new Error('No base64 decoder available');
  }
}
