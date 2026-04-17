import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ItemService } from '../../../services/item';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any;

  // Data Arrays
  myItems: any[] = [];
  likedItems: any[] = [];

  // UI State
  activeTab: 'listings' | 'favorites' = 'listings';

  constructor(
    private router: Router,
    private itemService: ItemService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
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

          // Map the liked items so the hearts show up red automatically
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

  setTab(tab: 'listings' | 'favorites', event: Event) {
    event.preventDefault(); // Stop page jump
    this.activeTab = tab;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
