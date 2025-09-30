import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';

import { PermissionGuard } from './permission.guard';
import { PermissionsService } from './permissions.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { TranslateService } from '@ngx-translate/core';

class MockPermissionsService {
  canSpy = jasmine.createSpy('can').and.returnValue(true);

  can(permission: string, fallback?: boolean): boolean {
    return this.canSpy(permission, fallback);
  }
}

class MockToastService {
  error = jasmine.createSpy('error');
}

class MockTranslateService {
  instant = jasmine.createSpy('instant').and.callFake((key: string) => {
    if (key === 'auth.errors.accessDenied') {
      return 'Access Denied';
    }
    return key;
  });
}

class MockAuthService {
  private _user: any = { roles: ['manager'], permissions: [] };
  private _permissions: string[] = [];
  loadContextSpy = jasmine.createSpy('loadContext').and.returnValue(of({}));

  get currentUser(): any {
    return this._user;
  }

  set currentUser(user: any) {
    this._user = user;
  }

  get permissions(): string[] {
    return this._permissions;
  }

  set permissions(list: string[]) {
    this._permissions = list;
  }

  loadContext(options?: any) {
    return this.loadContextSpy(options);
  }
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let permissions: MockPermissionsService;
  let toast: MockToastService;
  let router: Router;
  let auth: MockAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        PermissionGuard,
        { provide: PermissionsService, useClass: MockPermissionsService },
        { provide: ToastService, useClass: MockToastService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: TranslateService, useClass: MockTranslateService }
      ]
    });

    guard = TestBed.inject(PermissionGuard);
    permissions = TestBed.inject(PermissionsService) as unknown as MockPermissionsService;
    toast = TestBed.inject(ToastService) as unknown as MockToastService;
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService) as unknown as MockAuthService;
  });

  it('allows activation when permission is granted', (done) => {
    permissions.canSpy.and.returnValue(true);
    auth.permissions = [];

    const route = { data: { permissions: ['product:create'] } } as ActivatedRouteSnapshot;
    const state = { url: '/admin/products' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    if (result instanceof Observable) {
      result.subscribe((value) => {
        expect(value).toBeTrue();
        expect(permissions.canSpy).toHaveBeenCalledWith('product:create', false);
        expect(auth.loadContextSpy).not.toHaveBeenCalled();
        done();
      });
    } else {
      fail('Expected observable result');
    }
  });

  it('redirects to denied when permission is missing', (done) => {
    permissions.canSpy.and.returnValue(false);
    auth.permissions = [];
    auth.loadContextSpy.and.callFake(() => {
      auth.permissions = [];
      return of({});
    });

    const route = { data: { permissions: ['product:create'] } } as ActivatedRouteSnapshot;
    const state = { url: '/admin/products' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    if (result instanceof Observable) {
      result.subscribe((value) => {
        expect(auth.loadContextSpy).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Access Denied');
        expect(value).toEqual(router.parseUrl('/denied'));
        done();
      });
    } else {
      fail('Expected observable result');
    }
  });

  it('redirects to denied when load fails', (done) => {
    permissions.canSpy.and.returnValue(false);
    auth.permissions = [];
    auth.loadContextSpy.and.returnValue(throwError(() => new Error('failure')));

    const route = { data: { permissions: ['product:create'] } } as ActivatedRouteSnapshot;
    const state = { url: '/admin/products' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    if (result instanceof Observable) {
      result.subscribe((value) => {
        expect(toast.error).toHaveBeenCalledWith('Access Denied');
        expect(value).toEqual(router.parseUrl('/denied'));
        done();
      });
    } else {
      fail('Expected observable result');
    }
  });

  it('allows activation for admin users without checking permissions', (done) => {
    auth.currentUser = { roles: ['admin'], permissions: [] };
    auth.permissions = [];
    permissions.canSpy.and.returnValue(false);

    const route = { data: { permissions: ['product:create'] } } as ActivatedRouteSnapshot;
    const state = { url: '/admin/products' } as RouterStateSnapshot;

    const result = guard.canActivate(route, state);
    if (result instanceof Observable) {
      result.subscribe((value) => {
        expect(value).toBeTrue();
        expect(permissions.canSpy).not.toHaveBeenCalled();
        done();
      });
    } else {
      fail('Expected observable result');
    }
  });
});
