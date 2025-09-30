import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/auth.service';
import { MaterialModule } from '../../shared/material.module';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      user: { name: 'Test User', email: 'test@test.com', roles: ['admin'], isActive: true },
      isAdmin: true
    });

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [MaterialModule, RouterTestingModule, BrowserAnimationsModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with user data from AuthService', () => {
    fixture.detectChanges();

    expect(component.userName).toBe('Test User');
    expect(component.userEmail).toBe('test@test.com');
    expect(component.userRole).toBe('admin');
    expect(component.isAdmin).toBe(true);
  });

  it('should handle null user gracefully', () => {
    Object.defineProperty(authService, 'user', { value: null, writable: true });
    Object.defineProperty(authService, 'isAdmin', { value: false, writable: true });

    fixture.detectChanges();

    expect(component.userName).toBe('User');
    expect(component.userEmail).toBe('No email');
    expect(component.userRole).toBe('user');
    expect(component.isAdmin).toBe(false);
  });

  it('should render welcome card with user name', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const welcomeText = compiled.querySelector('h1')?.textContent;

    expect(welcomeText).toContain('Welcome, Test User!');
  });

  it('should show admin action cards when user is admin', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const actionCards = compiled.querySelectorAll('.action-card');

    // Should show: Profile + Products + Orders + Users = 4 cards
    expect(actionCards.length).toBeGreaterThanOrEqual(4);
  });

  it('should hide admin action cards when user is not admin', () => {
    Object.defineProperty(authService, 'isAdmin', { value: false, writable: true });
    component.isAdmin = false;

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const productsCard = compiled.querySelector('[routerLink="/admin/products"]');

    expect(productsCard).toBeNull();
  });
});
