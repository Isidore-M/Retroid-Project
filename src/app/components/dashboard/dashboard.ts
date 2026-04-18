import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  user: any;

  // 1. DATA ARRAYS
  allMarketplaceItems: any[] = [];
  marketplaceItems: any[] = [];

  // 2. BIDDING ROOM ARRAY
  biddingItems: any[] = [
    { id: 1, name: 'Gameboy Color', category: 'Consoles', price: 300, currency_type: 'points' },
    { id: 2, name: 'Mario Kart', category: 'Games', price: 150, currency_type: 'points' }
  ];

  // 3. FILTER & SEARCH STATES
  searchQuery: string = '';
  activeCategory: string = 'All';

  // 4. MODEL FOR THE "POST ITEM" FORM
  newItem = {
    name: '',
    category: '',
    price: null as number | null,
    currencyType: 'points',
    image: null as File | null
  };

  imagePreview: string | ArrayBuffer | null = null;

  constructor(
    private router: Router,
    private itemService: ItemService,
    private cdr: ChangeDetectorRef
  ) {}

ngOnInit() {
  const savedUser = localStorage.getItem('user');

  if (savedUser) {
    try {
      this.user = JSON.parse(savedUser);

      // DEBUG: Check your browser console (F12) to see these values!
      console.log('--- Retroid Session Debug ---');
      console.log('Username:', this.user?.username);
      console.log('Admin Flag:', this.user?.is_admin);
      console.log('Data Type:', typeof this.user?.is_admin);

      // Force cast is_admin to a Number to ensure the *ngIf works
      if (this.user) {
        this.user.is_admin = Number(this.user.is_admin);
      }

      this.loadMarketplace();
    } catch (e) {
      console.error("Failed to parse user session", e);
      this.logout(); // Clear bad data
    }
  } else {
    this.router.navigate(['/login']);
  }
}

  loadMarketplace() {
    this.itemService.getItems(this.user.id).subscribe({
      next: (data) => {
        this.allMarketplaceItems = data.map(item => ({
          ...item,
          isLiked: item.is_liked == 1
        })).sort((a, b) => b.id - a.id);

        this.applyFilters();
      },
      error: (err) => console.error("Error loading items:", err)
    });
  }

  setCategory(category: string) {
    this.activeCategory = category;
    this.applyFilters();
  }

  applyFilters() {
    let filteredList = this.allMarketplaceItems;

    if (this.activeCategory !== 'All') {
      filteredList = filteredList.filter(item => item.category === this.activeCategory);
    }

    if (this.searchQuery.trim() !== '') {
      const lowerCaseQuery = this.searchQuery.toLowerCase();
      filteredList = filteredList.filter(item =>
        item.name.toLowerCase().includes(lowerCaseQuery)
      );
    }

    this.marketplaceItems = filteredList;
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newItem.image = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * UPDATED: Now checks for Admin Block status before allowing upload
   */
  submitItem() {
    // 1. Check if user is blocked
    if (this.user.status === 'blocked') {
      alert(`STOP! You have been blocked by the admins due to: ${this.user.block_reason || 'Community Guidelines violation'}`);
      return;
    }

    // 2. Validate form
    if (!this.newItem.name || !this.newItem.category || !this.newItem.price || !this.newItem.image) {
      alert("All fields are required!");
      return;
    }

    const formData = new FormData();
    formData.append('name', this.newItem.name);
    formData.append('category', this.newItem.category);
    formData.append('price', (this.newItem.price ?? 0).toString());
    formData.append('currency', this.newItem.currencyType);
    formData.append('image', this.newItem.image);
    formData.append('user_id', this.user.id);

    this.itemService.postItem(formData).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          alert("Impeccable! Your item is now live.");
          this.resetForm();
          this.loadMarketplace();
        } else {
          alert("Upload issue: " + res.message);
        }
      },
      error: (err) => alert("Upload failed. Check your PHP connection.")
    });
  }

  getFormattedPrice(price: number | null, type: string): string {
    if (price === null) return '';
    return type === 'dollars' ? `$${price}` : `${price}`;
  }

  resetForm() {
    this.newItem = {
      name: '',
      category: '',
      price: null,
      currencyType: 'points',
      image: null
    };
    this.imagePreview = null;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  toggleLike(item: any) {
    item.isLiked = !item.isLiked;
    item.likes = Number(item.likes) + (item.isLiked ? 1 : -1);
    this.cdr.detectChanges();

    this.itemService.likeItem(item.id, this.user.id).subscribe({
      error: (err) => {
        item.isLiked = !item.isLiked;
        item.likes = Number(item.likes) + (item.isLiked ? 1 : -1);
        this.cdr.detectChanges();
        console.error("Could not sync like state:", err);
      }
    });
  }
}
