import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  private refreshKey = 'refresh_token';
  private userKey = 'auth_user';
  private _user$ = new BehaviorSubject<PublicUser | null>(null);
  user$ = this._user$.asObservable();

  constructor(private http: HttpClient) {
    // Try restore from storage
    const token = localStorage.getItem(this.tokenKey);
    const userRaw = localStorage.getItem(this.userKey);
    if (token && userRaw) {
      try { this._user$.next(JSON.parse(userRaw)); } catch {}
    }
  }

  get token(): string | null { return localStorage.getItem(this.tokenKey); }
  get user(): PublicUser | null { return this._user$.value; }
  get isLoggedIn(): boolean { return !!this.token; }
  get isAdmin(): boolean { return !!this.user?.roles?.includes('admin'); }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.token);
        if (res.refreshToken) localStorage.setItem(this.refreshKey, res.refreshToken);
        localStorage.setItem(this.userKey, JSON.stringify(res.user));
        this._user$.next(res.user);
      })
    );
  }

  fetchMe(): Observable<{ user: PublicUser }> {
    return this.http.get<{ user: PublicUser }>(`${environment.apiBaseUrl}/auth/me`).pipe(
      tap(({ user }) => {
        this._user$.next(user);
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }),
      catchError((err) => {
        this.logout();
        return of({ user: null as any });
      })
    );
  }

  logout() {
    const refreshToken = localStorage.getItem(this.refreshKey);
    if (refreshToken) {
      this.http.post(`${environment.apiBaseUrl}/auth/logout`, { refreshToken }).pipe(catchError(() => of(null))).subscribe();
    }
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem(this.userKey);
    this._user$.next(null);
  }

  register(name: string, email: string, password: string): Observable<{ user: PublicUser }> {
    return this.http.post<{ user: PublicUser }>(`${environment.apiBaseUrl}/auth/register`, { name, email, password });
  }

  refresh(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem(this.refreshKey);
    if (!refreshToken) return of(null as any);
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken }).pipe(
      tap((res) => {
        if (res?.token) localStorage.setItem(this.tokenKey, res.token);
        if (res?.refreshToken) localStorage.setItem(this.refreshKey, res.refreshToken);
        if (res?.user) {
          localStorage.setItem(this.userKey, JSON.stringify(res.user));
          this._user$.next(res.user);
        }
      })
    );
  }

  updateProfileName(name: string): Observable<{ user: PublicUser }> {
    return this.http.patch<{ user: PublicUser }>(`${environment.apiBaseUrl}/auth/profile`, { name }).pipe(
      tap(({ user }) => { this._user$.next(user); localStorage.setItem(this.userKey, JSON.stringify(user)); })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiBaseUrl}/auth/password/change`, { currentPassword, newPassword });
  }

  requestPasswordReset(email: string, baseUrl?: string): Observable<{ success: boolean }> {
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

  getPreferences(): Observable<{ preferences: UserPreferences }> {
    return this.http.get<{ preferences: UserPreferences }>(`${environment.apiBaseUrl}/auth/preferences`);
  }

  updatePreferences(prefs: UserPreferences): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${environment.apiBaseUrl}/auth/preferences`, prefs);
  }
}
