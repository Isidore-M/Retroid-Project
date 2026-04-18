import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      const user = JSON.parse(savedUser);
      // Check the is_admin flag we added to the DB
      if (user.is_admin === 1 || user.is_admin === true) {
        return true;
      }
    }

    // If not admin, kick them back to dashboard
    alert("ACCESS DENIED: Administrative Privileges Required.");
    this.router.navigate(['/dashboard']);
    return false;
  }
}
