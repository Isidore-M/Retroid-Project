import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  // Model for the registration form
  registerData = {
    username: '',
    password: '',
    confirmPassword: '', // Added for validation
    avatar_id: 1        // Default avatar
  };

  // IDs for the 10 avatar images
  avatars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(private authService: AuthService, private router: Router) {}

  // Change selected avatar
  selectAvatar(id: number) {
    this.registerData.avatar_id = id;
  }

  onRegister() {
    // 1. Check if fields are empty
    if (!this.registerData.username || !this.registerData.password) {
      alert('Please enter both a pseudo and a password.');
      return;
    }

    // 2. Check if passwords match
    if (this.registerData.password !== this.registerData.confirmPassword) {
      alert('Passwords do not match! Please check again.');
      return;
    }

    // 3. Prepare data (we don't send confirmPassword to the PHP)
    const payload = {
      username: this.registerData.username,
      password: this.registerData.password,
      avatar_id: this.registerData.avatar_id
    };

    // 4. Send to Backend
    this.authService.register(payload).subscribe({
      next: () => {
        alert('Account created successfully!');
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        alert(err.error?.message || 'Registration failed.');
      }
    });
  }
}
