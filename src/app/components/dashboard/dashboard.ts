import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../services/item'; // Or item.service depending on your filename

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
  allMarketplaceItems: any[] = []; // The 'Master List' that holds everything fetched from DB
  marketplaceItems: any[] = [];    // The 'Display List' that updates when you search/filter

  // 2. BIDDING ROOM ARRAY (Static for now, Admin only later)
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
    private cdr: ChangeDetectorRef // Gives us the power to force screen updates
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
      this.loadMarketplace(); // Fetch real items on load
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Fetches items from the PHP backend and organizes them for the UI
   */
  loadMarketplace() {
    // Pass the user ID so the backend knows whose "Likes" to check
    this.itemService.getItems(this.user.id).subscribe({
      next: (data) => {
        // Map the SQL 1/0 'is_liked' to a strict true/false boolean for Angular's UI
        this.allMarketplaceItems = data.map(item => ({
          ...item,
          isLiked: item.is_liked == 1 // Converts SQL result to a boolean
        })).sort((a, b) => b.id - a.id);

        // Run the filters immediately to populate the screen
        this.applyFilters();
      },
      error: (err) => console.error("Error loading items:", err)
    });
  }

  /**
   * Changes the active category and triggers the filter
   */
  setCategory(category: string) {
    this.activeCategory = category;
    this.applyFilters();
  }

  /**
   * The core filtering engine: handles both search text and categories
   */
  applyFilters() {
    let filteredList = this.allMarketplaceItems;

    // Step 1: Filter by Category (if not 'All')
    if (this.activeCategory !== 'All') {
      filteredList = filteredList.filter(item => item.category === this.activeCategory);
    }

    // Step 2: Filter by Search Text (if user typed something)
    if (this.searchQuery.trim() !== '') {
      const lowerCaseQuery = this.searchQuery.toLowerCase();
      filteredList = filteredList.filter(item =>
        item.name.toLowerCase().includes(lowerCaseQuery)
      );
    }

    // Step 3: Update the display array and force a screen refresh
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

  submitItem() {
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
          this.loadMarketplace(); // Refresh the grid automatically
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

  /**
   * Handles the Smart Like/Unlike toggling
   */
  toggleLike(item: any) {
    // 1. Optimistic Update: Flip the UI instantly
    item.isLiked = !item.isLiked;
    // Add 1 if liked, subtract 1 if unliked
    item.likes = Number(item.likes) + (item.isLiked ? 1 : -1);
    this.cdr.detectChanges(); // Force screen update

    // 2. Sync with Backend
    this.itemService.likeItem(item.id, this.user.id).subscribe({
      error: (err) => {
        // Rollback UI if the server fails or connection drops
        item.isLiked = !item.isLiked;
        item.likes = Number(item.likes) + (item.isLiked ? 1 : -1);
        this.cdr.detectChanges();
        console.error("Could not sync like state:", err);
      }
    });
  }
}
