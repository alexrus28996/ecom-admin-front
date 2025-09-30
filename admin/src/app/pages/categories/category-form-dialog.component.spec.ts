import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { CategoryFormDialogComponent } from './category-form-dialog.component';
import { MaterialModule } from '../../shared/material.module';
import { CategoryService } from '../../services/category.service';
import { UploadService } from '../../services/upload.service';
import { CategoryFormDialogData, CategoryParentOption } from './category.models';

class MockDialogRef {
  close = jasmine.createSpy('close');
}

class MockCategoryService {
  create = jasmine.createSpy('create').and.returnValue(of({ _id: 'new', name: 'New', parent: null }));
  update = jasmine.createSpy('update').and.returnValue(of({ _id: 'new', name: 'New', parent: null }));
}

class MockUploadService {
  upload = jasmine.createSpy('upload');
}

describe('CategoryFormDialogComponent', () => {
  let fixture: ComponentFixture<CategoryFormDialogComponent>;
  let component: CategoryFormDialogComponent;
  let categoryService: MockCategoryService;

  const parents: CategoryParentOption[] = [
    { id: null, label: 'Root' },
    { id: 'parent', label: 'Parent' }
  ];

  beforeEach(async () => {
    categoryService = new MockCategoryService();

    await TestBed.configureTestingModule({
      declarations: [CategoryFormDialogComponent],
      imports: [FormsModule, ReactiveFormsModule, MaterialModule, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useClass: MockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'create', parents } as CategoryFormDialogData },
        { provide: CategoryService, useValue: categoryService },
        { provide: UploadService, useClass: MockUploadService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should auto-generate slug from name until manually edited', fakeAsync(() => {
    component.form.get('name')?.setValue('Summer Collection');
    tick();
    expect(component.form.get('slug')?.value).toBe('summer-collection');

    component.onSlugInput();
    component.form.get('name')?.setValue('Winter Drop');
    tick();
    expect(component.form.get('slug')?.value).toBe('summer-collection');
  }));

  it('should not submit when form is invalid', () => {
    component.form.get('name')?.setValue('');
    component.save();
    expect(categoryService.create).not.toHaveBeenCalled();
  });

  it('should add keywords uniquely', () => {
    component.addKeyword({ value: 'SEO', chipInput: { clear: () => {} } } as unknown as any);
    component.addKeyword({ value: 'seo', chipInput: { clear: () => {} } } as unknown as any);
    expect(component.metaKeywords.length).toBe(1);
  });
});
