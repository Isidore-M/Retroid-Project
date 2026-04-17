import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Import for ngModel
import { CommonModule } from '@angular/common'; // Useful for *ngIf or *ngFor

@Component({
  selector: 'app-login',
  standalone: true, // This tells Angular it doesn't need a Module
  imports: [FormsModule, CommonModule,RouterModule], 
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginData = {
    username: '',
    password: ''
  };

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        console.log('Success!', response);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        alert('Login failed: ' + (err.error?.message || 'Server error'));
      }
    });
  }
}
