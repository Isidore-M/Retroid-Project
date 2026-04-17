import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  user: any;

  // Placeholder arrays to prevent "Property does not exist on type number" errors
  // Once your PHP API is ready, you will fill these with real data from the database
  biddingItems = [
    { id: 1, name: 'Gameboy Color', category: 'Consoles', price: 300, currencyType: 'points' },
    { id: 2, name: 'Mario Kart', category: 'Games', price: 150, currencyType: 'points' },
    { id: 3, name: 'Zelda Poster', category: 'Collectibles', price: 50, currencyType: 'points' },
    { id: 4, name: 'NES Controller', category: 'Others', price: 80, currencyType: 'points' },
    { id: 5, name: 'Sonic Plush', category: 'Collectibles', price: 120, currencyType: 'points' }
  ];

  popularItems = [
    { id: 1, name: 'Sega Genesis', username: 'isidore', category: 'Consoles', price: 120, currencyType: 'dollars', likes: 15 },
    { id: 2, name: 'Pokemon Blue', username: 'kheren', category: 'Games', price: 400, currencyType: 'points', likes: 22 },
    { id: 3, name: 'Retro T-Shirt', username: 'isdor', category: 'Others', price: 25, currencyType: 'dollars', likes: 10 }
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

  constructor(private router: Router) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    } else {
      this.router.navigate(['/login']);
    }
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

    // Prepare FormData for the future API call
    const formData = new FormData();
    formData.append('name', this.newItem.name);
    formData.append('category', this.newItem.category);
    formData.append('price', this.newItem.price.toString());
    formData.append('currency', this.newItem.currencyType);
    formData.append('image', this.newItem.image);
    formData.append('user_id', this.user.id);

    console.log('Posting Item...', this.newItem);
    this.resetForm();
    // You'll need to use Bootstrap JS or a ViewChild to close the modal programmatically
  }

  /**
   * Helper to format price in the template
   * Usage in HTML: {{ getFormattedPrice(item.price, item.currencyType) }}
   */
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
