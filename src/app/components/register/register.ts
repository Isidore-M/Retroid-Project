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
  // Main data model for the registration form
  registerData = {
    username: '',
    password: '',
    confirmPassword: '',
    avatar_id: 1        // Default avatar selected on load
  };

  // State object to hold validation error messages displayed in the UI
  errors = {
    username: '',
    password: '',
    confirmPassword: ''
  };

  // Array representing the 10 available avatar IDs in the public/avatars folder
  avatars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(private authService: AuthService, private router: Router) {}

  /**
   * Updates the selected avatar ID when a user clicks an avatar icon
   * @param id The numeric ID of the selected avatar
   */
  selectAvatar(id: number) {
    this.registerData.avatar_id = id;
  }

  /**
   * Validates input fields and sends data to the PHP backend.
   * On success, performs an "Auto-login" by saving user data to localStorage.
   */
  onRegister() {
    // Reset all error messages at the start of every attempt
    this.errors = { username: '', password: '', confirmPassword: '' };
    let hasError = false;

    // 1. Validate Username (Required)
    if (!this.registerData.username.trim()) {
      this.errors.username = 'Pseudo is required';
      hasError = true;
    }

    // 2. Validate Password Length (Minimum 8 characters per request)
    if (this.registerData.password.length < 8) {
      this.errors.password = 'Password must be at least 8 characters';
      hasError = true;
    }

    // 3. Validate Password Confirmation (Must match exactly)
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errors.confirmPassword = 'Passwords do not match';
      hasError = true;
    }

    // Stop execution if any local validation failed
    if (hasError) return;

    // 4. Clean data: Remove confirmPassword before sending to the database
    const { confirmPassword, ...dataToSend } = this.registerData;

    // 5. API Call to backend/api/register.php
    this.authService.register(dataToSend).subscribe({
      next: (response: any) => {
        /**
         * AUTO-LOGIN LOGIC:
         * Instead of redirecting to /login, we save the session data immediately.
         * We check if the server sent back the specific user object;
         * otherwise, we build one using the data we sent.
         */
        const sessionUser = response.user || {
          username: dataToSend.username,
          avatar_id: dataToSend.avatar_id,
          points: 50 // Default starting points
        };

        // Store the user in localStorage so DashboardComponent can access it
        localStorage.setItem('user', JSON.stringify(sessionUser));

        // Redirect directly to the Homepage (Dashboard)
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        // Handle backend errors (e.g., "Username already taken")
        // Mapping server error message to the username field for visibility
        this.errors.username = err.error?.message || 'Server error occurred during registration';
      }
    });
  }
}
