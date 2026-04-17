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

  // 1. MARKETPLACE ARRAY (Dynamic from Database)
  marketplaceItems: any[] = [];

  // 2. BIDDING ROOM ARRAY (Static for now, Admin only later)
  biddingItems: any[] = [
    { id: 1, name: 'Gameboy Color', category: 'Consoles', price: 300, currency_type: 'points' },
    { id: 2, name: 'Mario Kart', category: 'Games', price: 150, currency_type: 'points' }
  ];

  // Model for the "Post Item" form
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
    private cdr: ChangeDetectorRef // 👈 INJECTED HERE: Gives us the power to force screen updates
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
    this.itemService.getItems().subscribe({
      next: (data) => {
        // Marketplace logic: show all uploaded items, newest first
        this.marketplaceItems = [...data].sort((a, b) => b.id - a.id);

        // 👈 THE FIX: Force Angular to redraw the screen immediately!
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error loading items:", err)
    });
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
}
