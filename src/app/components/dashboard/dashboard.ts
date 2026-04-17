import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'; // 1. Ensure this is imported
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  user: any;

  // 2. The 'private' keyword is mandatory here to fix your error
  constructor(private router: Router) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']); // 3. Now 'this.router' will be recognized
  }
}
