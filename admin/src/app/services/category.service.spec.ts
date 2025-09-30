import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { CategoryService, CategoryPayload } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(CategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should list categories with filters applied', () => {
    service.list({ q: 'home', includeDeleted: true, limit: 200 }).subscribe((result) => {
      expect(result.items?.length).toBe(1);
      expect(result.items?.[0].id).toBe('cat-1');
      expect(result.items?.[0].status).toBe('active');
    });

    const req = http.expectOne((request) => request.url === '/api/categories');
    expect(req.request.params.get('q')).toBe('home');
    expect(req.request.params.get('includeDeleted')).toBe('true');
    expect(req.request.params.get('limit')).toBe('200');

    req.flush({
      items: [
        {
          _id: 'cat-1',
          name: 'Home',
          slug: 'home',
          parent: null,
          isActive: true
        }
      ],
      total: 1,
      page: 1,
      pages: 1
    });
  });

  it('should create category and normalise response', () => {
    const payload: CategoryPayload = { name: 'Lighting', slug: 'lighting', parent: null };

    service.create(payload).subscribe((category) => {
      expect(category.id).toBe('cat-2');
      expect(category.parentId).toBeNull();
      expect(category.status).toBe('active');
    });

    const req = http.expectOne('/api/categories');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      category: {
        _id: 'cat-2',
        name: 'Lighting',
        slug: 'lighting',
        parent: null,
        isActive: true
      }
    });
  });

  it('should reorder child categories for a parent', () => {
    const ids = ['cat-1', 'cat-2'];

    service.reorderChildren('parent-1', ids).subscribe((result) => {
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('cat-1');
    });

    const req = http.expectOne('/api/admin/categories/parent-1/reorder');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ids });

    req.flush({ items: [{ _id: 'cat-1', name: 'One' }, { _id: 'cat-2', name: 'Two' }] });
  });

  it('should bulk reassign parent', () => {
    service.bulkReassignParent(['cat-1', 'cat-2'], 'new-parent').subscribe();

    const first = http.expectOne('/api/categories/cat-1');
    expect(first.request.method).toBe('PUT');
    expect(first.request.body.parent).toBe('new-parent');
    first.flush({ category: { _id: 'cat-1', name: 'One', parent: 'new-parent' } });

    const second = http.expectOne('/api/categories/cat-2');
    expect(second.request.method).toBe('PUT');
    expect(second.request.body.parent).toBe('new-parent');
    second.flush({ category: { _id: 'cat-2', name: 'Two', parent: 'new-parent' } });
  });
});
