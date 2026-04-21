import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../services/item';
import { ToastService } from '../../services/toast.service';

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
  biddingItems: any[] = [];

  // 2. BIDDING MODAL STATE
  selectedItem: any = null;
  bidAmount: number | null = null;

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
    public toastService: ToastService, // Added public for template access
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);

        // Force cast is_admin to a Number for template logic
        if (this.user) {
          this.user.is_admin = Number(this.user.is_admin);
        }

        this.loadMarketplace();
      } catch (e) {
        console.error("Failed to parse user session", e);
        this.logout();
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadMarketplace() {
    // 1. Load Regular Marketplace Items
    this.itemService.getItems(this.user.id).subscribe({
      next: (data) => {
        if (!data || !Array.isArray(data)) {
          this.allMarketplaceItems = [];
        } else {
          this.allMarketplaceItems = data
            .filter((item: any) => {
              const isBiddingValue = item.is_bidding !== undefined && item.is_bidding !== null
                                     ? Number(item.is_bidding)
                                     : 0;
              return isBiddingValue === 0;
            })
            .map((item: any) => ({
              ...item,
              isLiked: item.is_liked == 1,
              image_path: item.image_path || 'placeholder.jpg'
            }));
        }
        this.applyFilters();
      },
      error: (err) => console.error("Marketplace load error", err)
    });

    // 2. Load Bidding Room Artifacts
    this.itemService.getBiddingItems().subscribe({
      next: (data) => {
        this.biddingItems = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Bidding load error", err)
    });
  }

  setCategory(category: string) {
    this.activeCategory = category;
    this.applyFilters();
  }

  applyFilters() {
    let filteredList = [...this.allMarketplaceItems];

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

  /**
   * BIDDING LOGIC
   */
  openBiddingModal(item: any) {
    this.selectedItem = item;
    // Set default bid to current price + 1
    const currentPrice = Number(item.current_bid || item.price);
    this.bidAmount = currentPrice + 1;

    const modalElement = document.getElementById('bidModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  submitBid() {
    if (!this.selectedItem || !this.bidAmount) return;

    const currentPrice = Number(this.selectedItem.current_bid || this.selectedItem.price);

    // 1. XP Wallet Check
    if (this.bidAmount > this.user.points) {
      this.toastService.show("Insufficient XP! You need more coins to place this bid.", "error");
      return;
    }

    // 2. Minimum Bid Check
    if (this.bidAmount <= currentPrice) {
      this.toastService.show(`Bid too low! Must be higher than ${currentPrice} XP.`, "warning");
      return;
    }

    // 3. API Call
    this.itemService.placeBid(this.selectedItem.id, this.user.id, this.bidAmount).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toastService.show("Bid Successful! You are currently the highest bidder.", "success");

          // Visual feedback: Deduct points locally
          this.user.points -= this.bidAmount!;
          localStorage.setItem('user', JSON.stringify(this.user));

          this.loadMarketplace(); // Refresh lists

          // Close Modal
          const modalElement = document.getElementById('bidModal');
          const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        } else {
          this.toastService.show(res.message || "Bid failed.", "error");
        }
      },
      error: () => this.toastService.show("Server error. Could not place bid.", "error")
    });
  }

  /**
   * ITEM POSTING LOGIC
   */
  submitItem() {
    if (this.user.status === 'blocked') {
      this.toastService.show(`Blocked: ${this.user.block_reason || 'Guidelines violation'}`, "error");
      return;
    }

    if (!this.newItem.name || !this.newItem.category || !this.newItem.price || !this.newItem.image) {
      this.toastService.show("All fields are required to list an item.", "warning");
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
      next: (res: any) => {
        if (res.status === 'success') {
          this.toastService.show("Impeccable! Your item is now live.", "success");
          this.resetForm();
          this.loadMarketplace();
        } else {
          this.toastService.show(res.message, "error");
        }
      },
      error: () => this.toastService.show("Upload failed. Check PHP connection.", "error")
    });
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
        console.error("Like sync error", err);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newItem.image = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result;
      reader.readAsDataURL(file);
    }
  }

  resetForm() {
    this.newItem = { name: '', category: '', price: null, currencyType: 'points', image: null };
    this.imagePreview = null;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
