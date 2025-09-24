import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
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
  get roles(): string[] { return this.user?.roles ?? []; }
  get isAdmin(): boolean { return this.hasRole('admin'); }

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
    console.log('hasAnyRole check:', { required: roles, userRoles, result: roles.some((role) => userRoles.includes(role)) });
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
      localStorage.setItem(this.tokenKey, response.token);
    }
    if (response.refreshToken) {
      localStorage.setItem(this.refreshKey, response.refreshToken);
    }
    if (response.user) {
      this.setUser(response.user);
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
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

  refresh(refreshToken?: string): Observable<LoginResponse | null> {
    const token = refreshToken ?? localStorage.getItem(this.refreshKey);
    if (!token) {
      return of(null);
    }

    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken: token }).pipe(
      tap((res) => this.persistSession(res))
    );
  }

  logout(refreshToken?: string): void {
    const token = refreshToken ?? localStorage.getItem(this.refreshKey);
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
}
