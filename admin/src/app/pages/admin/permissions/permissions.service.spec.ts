import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PermissionsService } from './permissions.service';
import { environment } from '../../../../environments/environment';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(PermissionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch users with query params', () => {
    service
      .listUsers({ page: 2, limit: 25, q: 'alex', sort: 'name', direction: 'desc' })
      .subscribe((response) => {
        expect(response.items.length).toBe(1);
        expect(response.items[0].email).toBe('alex@example.com');
        expect(response.total).toBe(42);
        expect(response.page).toBe(2);
        expect(response.limit).toBe(25);
      });

    const req = httpMock.expectOne((request) => request.method === 'GET' && request.url === `${environment.apiBaseUrl}/admin/users`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('25');
    expect(req.request.params.get('q')).toBe('alex');
    expect(req.request.params.get('sort')).toBe('name');
    expect(req.request.params.get('direction')).toBe('desc');

    req.flush({
      items: [{ id: '1', email: 'alex@example.com', roles: ['admin'], status: 'active' }],
      total: 42,
      page: 2,
      limit: 25,
    });
  });

  it('should replace user permissions', () => {
    service.replaceUserPermissions('user-1', ['product:create']).subscribe((permissions) => {
      expect(permissions).toEqual(['product:create', 'product:update']);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/user-1/permissions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ permissions: ['product:create'] });

    req.flush({ permissions: ['product:create', 'product:update'] });
  });
});
