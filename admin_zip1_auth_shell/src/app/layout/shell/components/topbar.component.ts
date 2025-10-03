import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { ROUTES } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html'
})
export class TopbarComponent {
  constructor(public auth: AuthService, private router: Router) {}
  logout() {
    this.auth.logout().subscribe({ next: () => this.router.navigate(ROUTES.login) });
  }
}
