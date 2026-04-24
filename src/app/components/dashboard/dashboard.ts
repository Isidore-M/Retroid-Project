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
  notifications: any[] = [];

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
  //5. Notification initialisation
    unreadCount: number = 0;
  showNotifDropdown: boolean = false;

  imagePreview: string | ArrayBuffer | null = null;

  constructor(
    private router: Router,
    private itemService: ItemService,
    public toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

 private timerInterval: any;

ngOnInit() {
  const savedUser = localStorage.getItem('user');

  if (savedUser) {
    try {
      this.user = JSON.parse(savedUser);

      if (this.user) {
        this.user.is_admin = Number(this.user.is_admin);
      }

      this.loadMarketplace();

      // START THE TIMER HEARTBEAT
      // This runs every second to update all bidding cards at once
      this.timerInterval = setInterval(() => {
        this.updateTimers();
      }, 1000);

    } catch (e) {
      console.error("Failed to parse user session", e);
      this.logout();
    }
  } else {
    this.router.navigate(['/login']);
  }
}

// CRITICAL: Clean up the interval when the user leaves the dashboard
ngOnDestroy() {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
  }
}

loadMarketplace() {
  // 1. Refresh User Data (Points sync)
  this.itemService.getUserProfile(this.user.id).subscribe({
    next: (res: any) => {
      if (res && res.status === 'success' && res.user) {
        this.user.points = Number(res.user.points);
        this.user.is_admin = Number(res.user.is_admin);
        this.user.status = res.user.status;
        localStorage.setItem('user', JSON.stringify(this.user));
        this.cdr.detectChanges();
      }
    },
    error: (err) => console.error("Identity sync failed:", err)
  });

  // 2. Load Regular Marketplace Items (With Dynamic Like Sync)
this.itemService.getItems(this.user.id).subscribe({
  next: (data: any[]) => {
    this.allMarketplaceItems = data
      .filter((item: any) => Number(item.is_bidding || 0) === 0)
      .map((item: any) => ({
        ...item,
        // Force the count to be a number
        likes: Number(item.likes || 0),
        // A value of 1 or more means the current user liked it
        isLiked: Number(item.is_liked) > 0,
        image_path: item.image_path || 'placeholder.jpg'
      }));
    this.applyFilters();
    this.cdr.detectChanges();
  }
});

  // 3. Load Bidding Room Artifacts + Winner Check
  this.itemService.getBiddingItems().subscribe({
    next: (data) => {
      this.biddingItems = Array.isArray(data) ? data.map(item => ({
        ...item,
        price: Number(item.price),
        current_bid: item.current_bid ? Number(item.current_bid) : null,
        highest_bidder_id: item.highest_bidder_id,
        // Also map likes for bidding items if they exist
        likes: Number(item.likes || 0),
        isLiked: Number(item.is_liked) > 0
      })) : [];

      const now = new Date().getTime();
      this.biddingItems.forEach(item => {
        if (item.expiry_time) {
          const end = new Date(item.expiry_time).getTime();
          if (end < now && Number(item.highest_bidder_id) === Number(this.user.id)) {
            if (!item.hasNotified) {
              this.toastService.show(`CONGRATULATIONS! You won the ${item.name}!`, "success");
              item.hasNotified = true;
            }
          }
        }
      });
      this.cdr.detectChanges();
    },
    error: (err) => console.error("Bidding load error", err)
  });

  // 4. Load Notifications (Likes & Bids)
  this.itemService.getNotifications(this.user.id).subscribe({
    next: (res: any) => {
      if (res && res.status === 'success') {
        this.notifications = res.notifications || [];
        this.unreadCount = Number(res.unread_count || 0);
        this.cdr.detectChanges();
      }
    },
    error: (err) => console.error("Notification load error", err)
  });
}

// Add this helper to toggle the dropdown in the nav
toggleNotificationDropdown() {
  this.showNotifDropdown = !this.showNotifDropdown;

  // If opening the dropdown, we might want to mark them as read in the DB later
  if (!this.showNotifDropdown) {
    this.unreadCount = 0; // Temporary UI reset
  }
}


updateTimers() {
  if (!this.biddingItems || this.biddingItems.length === 0) return;

  this.biddingItems.forEach(item => {
    if (item.expiry_time) {
      const total = Date.parse(item.expiry_time) - Date.now();

      if (total <= 0) {
        item.displayTimer = "CLOSED";
        item.isEndingSoon = false;
      } else {
        item.displayTimer = this.getTimeRemaining(total);
        // Turn red/pulse if less than 5 minutes left
        item.isEndingSoon = total < 300000;
      }
    }
  });

  // Force Angular to update the view for every tick
  this.cdr.detectChanges();
}

private getTimeRemaining(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const h = hours < 10 ? '0' + hours : hours;
  const m = minutes < 10 ? '0' + minutes : minutes;
  const s = seconds < 10 ? '0' + seconds : seconds;

  return `${h}:${m}:${s}`;
}
  /**
   * MODAL CLOSER HELPER
   * Clicks the hidden close button to ensure Bootstrap dismisses the backdrop properly
   */
  private triggerModalClose(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const closeButton = modalElement.querySelector('.btn-close') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      } else {
        const dismissBtn = modalElement.querySelector('[data-bs-dismiss="modal"]') as HTMLElement;
        if (dismissBtn) dismissBtn.click();
      }
    }
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
      filteredList = filteredList.filter(item => item.name.toLowerCase().includes(lowerCaseQuery));
    }
    this.marketplaceItems = filteredList;
    this.cdr.detectChanges();
  }

  openBiddingModal(item: any) {
    this.selectedItem = item;
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
    const userPoints = Number(this.user.points);
    const bidValue = Number(this.bidAmount);

    if (bidValue > userPoints) {
      this.toastService.show("Insufficient XP! You need more coins.", "error");
      return;
    }

    if (bidValue <= currentPrice) {
      this.toastService.show(`Bid too low! Must be higher than ${currentPrice} XP.`, "warning");
      return;
    }

    this.itemService.placeBid(this.selectedItem.id, this.user.id, bidValue).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toastService.show("BID REGISTERED: You are now the leader!", "success");

          // Sync wallet with server response
          this.user.points = res.new_balance !== undefined ? Number(res.new_balance) : (userPoints - bidValue);
          localStorage.setItem('user', JSON.stringify(this.user));

          this.loadMarketplace();
          this.triggerModalClose('bidModal'); // Close modal
        } else {
          this.toastService.show(res.message || "Bid failed.", "error");
        }
      },
      error: () => this.toastService.show("Connection Error: Auction house unreachable.", "error")
    });
  }

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
          this.triggerModalClose('postItemModal'); // Close modal
        } else {
          this.toastService.show(res.message || "Upload failed.", "error");
        }
      },
      error: () => this.toastService.show("Upload failed. Check PHP connection.", "error")
    });
  }

 toggleLike(item: any) {
  // 1. Optimistic UI update (feels faster)
  const wasLiked = item.isLiked;
  item.isLiked = !item.isLiked;
  item.likes = Number(item.likes) + (item.isLiked ? 1 : -1);

  this.itemService.likeItem(item.id, this.user.id).subscribe({
    next: (res: any) => {
      if (res.status === 'success') {
        // 2. Sync with the actual count from DB
        item.likes = res.new_count;
        this.cdr.detectChanges();
      }
    },
    error: (err) => {
      // Revert if API fails
      item.isLiked = wasLiked;
      item.likes = Number(item.likes) + (wasLiked ? 1 : -1);
      this.toastService.show("Server desync: Like failed", "error");
      this.cdr.detectChanges();
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

  markAllAsRead() {
  if (this.unreadCount === 0) return;

  this.itemService.markNotificationsAsRead(this.user.id).subscribe({
    next: (res: any) => {
      if (res.status === 'success') {
        // 1. Instantly clear the red badge
        this.unreadCount = 0;

        // 2. Update local list to show they are read (removes green background)
        this.notifications.forEach(n => n.is_read = 1);

        // 3. Close the dropdown (optional, but feels smoother)
        // this.showNotifDropdown = false;

        this.cdr.detectChanges();
        this.toastService.show("Notifications cleared", "success");
      }
    },
    error: (err) => console.error("Failed to mark as read", err)
  });
}

  // Inside DashboardComponent

// Helper to format the time (HH:MM:SS)







}
