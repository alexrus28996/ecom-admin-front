import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  userName = 'User';
  userEmail = '';
  userRole = 'user';
  isAdmin = false;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.user;
    this.userName = user?.name || 'User';
    this.userEmail = user?.email || 'No email';
    this.userRole = user?.roles?.[0] || 'user';
    this.isAdmin = this.auth.isAdmin;
  }
}
