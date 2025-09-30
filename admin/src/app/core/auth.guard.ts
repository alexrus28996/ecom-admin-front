import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (!environment.production) {
      console.log('[AuthGuard] Current user:', this.auth.currentUser);
    }
    if (this.auth.hasValidAccessToken()) {
      return true;
    }

    if (!this.auth.hasRefreshToken) {
      this.auth.logout();
      return this.router.parseUrl('/login');
    }

    return this.auth.refresh({ force: true }).pipe(
      map((response) => {
        if (response && this.auth.hasValidAccessToken()) {
          return true;
        }
        this.auth.logout();
        return this.redirectToLogin(state.url);
      }),
      catchError(() => {
        this.auth.logout();
        return of(this.redirectToLogin(state.url));
      })
    );
  }

  private redirectToLogin(redirectUrl?: string): UrlTree {
    if (!redirectUrl) {
      return this.router.parseUrl('/login');
    }

    return this.router.createUrlTree(['/login'], {
      queryParams: { redirectTo: redirectUrl }
    });
  }
}

