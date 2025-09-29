import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { PermissionGuard } from './permission.guard';
import { PermissionsService } from './permissions.service';
import { ToastService } from './toast.service';

class MockPermissionsService {
  canSpy = jasmine.createSpy('can').and.returnValue(true);
  loadSpy = jasmine.createSpy('load').and.returnValue(of({}));

  can(permission: string, fallback?: boolean): boolean {
    return this.canSpy(permission, fallback);
  }

  load() {
    return this.loadSpy();
  }
}

class MockToastService {
  error = jasmine.createSpy('error');
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let permissions: MockPermissionsService;
  let toast: MockToastService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        PermissionGuard,
        { provide: PermissionsService, useClass: MockPermissionsService },
        { provide: ToastService, useClass: MockToastService },
      ],
    });

    guard = TestBed.inject(PermissionGuard);
    permissions = TestBed.inject(PermissionsService) as unknown as MockPermissionsService;
    toast = TestBed.inject(ToastService) as unknown as MockToastService;
    router = TestBed.inject(Router);
  });

  it('allows activation when permission is granted', (done) => {
    const route = { data: { permissions: ['product:create'] } } as ActivatedRouteSnapshot;
    const state = { url: '/admin/products' } as RouterStateSnapshot;

    guard.canActivate(route, state).subscribe((result) => {
      expect(result).toBeTrue();
      expect(permissions.canSpy).toHaveBeenCalledWith('product:create', false);
      done();
    });
  });

  it('redirects to denied when permission is missing', (done) => {
    let call = 0;
    permissions.canSpy.and.callFake(() => {
      call += 1;
      return call > 1 ? false : false;
    });
    permissions.loadSpy.and.returnValue(of({}));

    const route = { data: { permissions: ['product:create'] } } as ActivatedRouteSnapshot;
    const state = { url: '/admin/products' } as RouterStateSnapshot;

    guard.canActivate(route, state).subscribe((result) => {
      expect(toast.error).toHaveBeenCalledWith("You don’t have permission.");
      expect(result).toEqual(router.parseUrl('/denied'));
      done();
    });
  });

  it('redirects to denied when load fails', (done) => {
    permissions.canSpy.and.returnValue(false);
    permissions.loadSpy.and.returnValue(throwError(() => new Error('failure')));

    const route = { data: { permissions: ['product:create'] } } as ActivatedRouteSnapshot;
    const state = { url: '/admin/products' } as RouterStateSnapshot;

    guard.canActivate(route, state).subscribe((result) => {
      expect(toast.error).toHaveBeenCalledWith("You don’t have permission.");
      expect(result).toEqual(router.parseUrl('/denied'));
      done();
    });
  });
});
