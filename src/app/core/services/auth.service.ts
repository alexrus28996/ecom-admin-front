import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  map,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { Router } from '@angular/router';
import { API_ENDPOINTS } from '../../constants/api.constants';
import { DASHBOARD_ROUTE, LOGIN_ROUTE } from '../../constants/routes.constants';
import { STORAGE_KEYS } from '../../constants/storage.constants';
import {
  LoginPayload,
  LogoutResponse,
  MeResponse,
  RefreshResponse,
  TokenResponse,
  User,
} from '../models/auth.model';
import { UserRole } from '../../constants/roles.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshInFlight$: Observable<string> | null = null;

  readonly user$ = this.userSubject.asObservable();

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    this.accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    this.refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  }

  get isAuthenticated(): boolean {
    return !!this.userSubject.value && !!this.accessToken;
  }

  get currentUserSnapshot(): User | null {
    return this.userSubject.value;
  }

  initialize(): Promise<void> {
    if (!this.accessToken) {
      this.clearSession();
      return Promise.resolve();
    }

    return firstValueFrom(
      this.http.get<MeResponse>(API_ENDPOINTS.auth.me).pipe(
        tap((response) => this.userSubject.next(response.user)),
        map(() => void 0),
        catchError(() => {
          this.clearSession();
          return of(void 0);
        }),
      ),
    );
  }

  login(payload: LoginPayload): Observable<User> {
    return this.http.post<TokenResponse>(API_ENDPOINTS.auth.login, payload).pipe(
      tap((response) => this.persistSession(response)),
      map((response) => response.user),
    );
  }

  logout(): Observable<boolean> {
    const refreshToken = this.refreshToken;
    const body = refreshToken ? { refreshToken } : {};

    return this.http
      .post<LogoutResponse>(API_ENDPOINTS.auth.logout, body)
      .pipe(
        map((response) => response.success),
        catchError((error) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          this.clearSession();
          this.router.navigateByUrl(LOGIN_ROUTE);
        }),
      );
  }

  refreshAccessToken(): Observable<string> {
    if (!this.refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<RefreshResponse>(API_ENDPOINTS.auth.refresh, {
        refreshToken: this.refreshToken,
      })
      .pipe(
        tap((response) => this.persistSession(response)),
        map((response) => response.token),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  hasRole(role: UserRole): boolean {
    return this.userSubject.value?.roles.includes(role) ?? false;
  }

  handleSessionExpired() {
    this.clearSession();
    this.router.navigateByUrl(LOGIN_ROUTE);
  }

  navigateToDashboard() {
    this.router.navigateByUrl(DASHBOARD_ROUTE);
  }

  private persistSession(response: TokenResponse | RefreshResponse) {
    this.accessToken = response.token;
    this.refreshToken = response.refreshToken;
    localStorage.setItem(STORAGE_KEYS.accessToken, this.accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, this.refreshToken);
    this.userSubject.next(response.user);
  }

  private clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    this.userSubject.next(null);
  }
}
