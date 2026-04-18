import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 👈 IMPORTANT: Add this for [(ngModel)]
import { ItemService } from '../../../services/item';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], // 👈 Added FormsModule here
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any;

  // Data Arrays
  myItems: any[] = [];
  likedItems: any[] = [];

  // Form State
  editUsername: string = ''; // 👈 Holds the temporary value for the input field

  // UI State
  activeTab: 'info' | 'listings' | 'notifications' = 'info';

  constructor(
    private router: Router,
    private itemService: ItemService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
      this.editUsername = this.user.username; // Initialize the edit field immediately
      this.loadProfileData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadProfileData() {
    this.itemService.getUserProfile(this.user.id).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.myItems = res.my_items;
          this.likedItems = res.liked_items.map((item: any) => ({
            ...item,
            isLiked: true
          }));
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Error loading profile:", err)
    });
  }

  /**
   * Saves the updated username to the database
   */
  saveInfo() {
    if (!this.editUsername.trim() || this.editUsername === this.user.username) {
      return; // Don't save if empty or unchanged
    }

    this.itemService.updateUserInfo(this.user.id, this.editUsername).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          // 1. Update the local object
          this.user.username = this.editUsername;

          // 2. Sync with localStorage so the navbar updates too
          localStorage.setItem('user', JSON.stringify(this.user));

          alert("Profile updated! Your new handle is now live.");
          this.cdr.detectChanges();
        } else {
          alert("Error: " + res.message);
        }
      },
      error: (err) => console.error("Update failed:", err)
    });
  }

  /**
   * Placeholder for Password logic
   */
  updatePassword() {
    console.log("Password update triggered - logic coming soon!");
    // We can build the api/update_password.php next
  }

  setTab(tab: 'info' | 'listings' | 'notifications', event: Event) {
    event.preventDefault();
    this.activeTab = tab;
  }

  triggerBannerUpload() {
    console.log("Banner edit clicked!");
  }

  triggerAvatarUpload() {
    console.log("Avatar edit clicked!");
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
