import { Component, OnInit } from '@angular/core';
import { AuthService, PublicUser } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  isLoggedIn = false;
  userName = 'Guest';
  userEmail = '';
  isAdmin = false;

  constructor(private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn;

    if (!this.isLoggedIn) {
      this.resetUserDetails();
      return;
    }

    const user: PublicUser | null = this.auth.user;
    this.userName = user?.name?.trim() || 'User';
    this.userEmail = user?.email || '';
    this.isAdmin = this.auth.isAdmin;
  }

  private resetUserDetails(): void {
    this.userName = 'Guest';
    this.userEmail = '';
    this.isAdmin = false;
  }
}
