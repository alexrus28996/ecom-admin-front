import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { PermissionsService } from '../core/permissions.service';

@Component({
  selector: 'app-debug-user',
  template: `
    <div style="background: #f5f5f5; padding: 1rem; margin: 1rem; border-radius: 4px;">
      <h3>Debug User Info</h3>
      <p><strong>Is Logged In:</strong> {{ auth.isLoggedIn }}</p>
      <p><strong>Token:</strong> {{ auth.token ? 'Present' : 'None' }}</p>
      <p><strong>User:</strong> {{ auth.user | json }}</p>
      <p><strong>Roles:</strong> {{ auth.roles | json }}</p>
      <p><strong>Is Admin:</strong> {{ auth.isAdmin }}</p>
      <p><strong>Has Admin Role:</strong> {{ auth.hasRole('admin') }}</p>
      <p><strong>Has Customer Role:</strong> {{ auth.hasRole('customer') }}</p>
      <hr>
      <h4>Test Role Checks</h4>
      <p><strong>hasAnyRole(['admin']):</strong> {{ auth.hasAnyRole(['admin']) }}</p>
      <p><strong>hasAnyRole(['customer']):</strong> {{ auth.hasAnyRole(['customer']) }}</p>
      <p><strong>hasAnyRole([]):</strong> {{ auth.hasAnyRole([]) }}</p>
      <p><strong>hasAnyRole(null):</strong> {{ auth.hasAnyRole(null) }}</p>
      <hr>
      <h4>Permissions</h4>
      <p><strong>Permissions Snapshot:</strong> {{ permissions.snapshot | json }}</p>
      <hr>
      <button (click)="refresh()">Refresh User Data</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DebugUserComponent {
  constructor(
    public auth: AuthService,
    public permissions: PermissionsService
  ) {}

  refresh(): void {
    console.log('Manual refresh triggered');
    this.auth.getCurrentUser().subscribe({
      next: (user) => console.log('Manual refresh - user:', user),
      error: (err) => console.error('Manual refresh - error:', err)
    });
  }
}