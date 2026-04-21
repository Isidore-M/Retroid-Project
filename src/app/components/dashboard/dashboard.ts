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
  // 1. Refresh User Data (To catch XP Refunds if outbid)
 // 1. Refresh User Data (To catch XP Refunds if outbid)
this.itemService.getUserProfile(this.user.id).subscribe({
  next: (res: any) => {
    // We check for res.user because the PHP now returns { status: 'success', user: {...} }
    if (res && res.status === 'success' && res.user) {

      // Update only specific properties to avoid wiping out session data
      // Force Number conversion to prevent math glitches in the Modal *ngIf
      this.user.points = Number(res.user.points);

      // Keep the Admin flag synced so the Control Center tab doesn't vanish
      this.user.is_admin = Number(res.user.is_admin);

      // Update the user status (e.g., if an admin blocks you mid-session)
      this.user.status = res.user.status;

      // Sync the updated object to LocalStorage for persistence
      localStorage.setItem('user', JSON.stringify(this.user));

      // Tell Angular to refresh the UI immediately
      this.cdr.detectChanges();
    }
  },
  error: (err) => console.error("Identity sync failed:", err)
});

  // 2. Load Regular Marketplace Items
  this.itemService.getItems(this.user.id).subscribe({
    next: (data) => {
      if (!data || !Array.isArray(data)) {
        this.allMarketplaceItems = [];
      } else {
        this.allMarketplaceItems = data
          .filter((item: any) => Number(item.is_bidding || 0) === 0)
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

  // 3. Load Bidding Room Artifacts + Winner Check
  this.itemService.getBiddingItems().subscribe({
    next: (data) => {
      // Ensure current_bid and price are numbers for the modal math
      this.biddingItems = Array.isArray(data) ? data.map(item => ({
        ...item,
        price: Number(item.price),
        current_bid: item.current_bid ? Number(item.current_bid) : null
      })) : [];

      // CHECK FOR WINNERS
      const now = new Date().getTime();
      this.biddingItems.forEach(item => {
        if (item.expiry_time) {
          const end = new Date(item.expiry_time).getTime();

          // Check if ended and user is leader
          if (end < now && Number(item.highest_bidder_id) === Number(this.user.id)) {
            if (!item.hasNotified) {
              this.toastService.show(`CONGRATULATIONS! You won the ${item.name}! Check your vault.`, "success");
              item.hasNotified = true;
            }
          }
        }
      });

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
        // --- THE CONFIRMATION MESSAGE ---
        this.toastService.show("BID REGISTERED: You are now the highest bidder!", "success");

        // 4. Update the local wallet immediately using the server's response
        // This ensures the header and the database are perfectly in sync
        if (res.new_balance !== undefined) {
          this.user.points = Number(res.new_balance);
        } else {
          // Fallback if PHP doesn't send new_balance
          this.user.points -= this.bidAmount!;
        }

        // Save updated points to storage
        localStorage.setItem('user', JSON.stringify(this.user));

        // 5. Refresh the marketplace to update the yellow tags for everyone
        this.loadMarketplace();

        // 6. Close the Modal
        const modalElement = document.getElementById('bidModal');
        const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      } else {
        // Handle server-side errors (like someone outbidding you at the last second)
        this.toastService.show(res.message || "Bid failed. Please try again.", "error");
      }
    },
    error: () => {
      this.toastService.show("Connection Error: The auction house is currently unreachable.", "error");
    }
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
