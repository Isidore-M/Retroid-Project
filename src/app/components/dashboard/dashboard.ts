import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
export class DashboardComponent implements OnInit, OnDestroy {
  user: any;

  // --- INTERVAL DECLARATIONS ADDED HERE ---
  timerInterval: any;
  syncInterval: any;

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

  // 4. MODEL FOR THE "POST ITEM" FORM (UPDATED FOR MULTIPLE IMAGES)
  newItem = {
    name: '',
    category: '',
    price: null as number | null,
    currencyType: 'points',
    description: '',
    images: [] as File[]
  };

  // 5. NOTIFICATIONS & UI STATE
  unreadCount: number = 0;
  showNotifDropdown: boolean = false;

  // --- NEW: MULTI-IMAGE & CAROUSEL STATE ---
  imagePreviews: string[] = [];
  currentImageIndex: number = 0;

  constructor(
    private router: Router,
    private itemService: ItemService,
    public toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);

        if (this.user) {
          this.user.is_admin = Number(this.user.is_admin);
        }

        // Initial data load
        this.loadMarketplace();

        // 1. START THE TIMER HEARTBEAT
        this.timerInterval = setInterval(() => {
          this.updateTimers();
        }, 1000);

        // 2. START THE LIVE SYNC
        this.syncInterval = setInterval(() => {
          const modalElement = document.getElementById('bidModal');
          const isModalOpen = modalElement && modalElement.classList.contains('show');

          if (!isModalOpen) {
            this.loadMarketplace();
          }
        }, 5000);

      } catch (e) {
        console.error("Failed to parse user session", e);
        this.logout();
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  loadMarketplace() {
    // 1. Refresh User Data
    this.itemService.getUserProfile(this.user.id).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success' && res.user) {
          this.user.points = Number(res.user.points);
          this.user.is_admin = Number(this.user.is_admin);
          this.user.status = res.user.status;
          localStorage.setItem('user', JSON.stringify(this.user));
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Identity sync failed:", err)
    });

    // 2. Load Regular Marketplace Items
    this.itemService.getItems(this.user.id).subscribe({
      next: (data: any[]) => {
        this.allMarketplaceItems = data
          .filter((item: any) => Number(item.is_bidding || 0) === 0)
          .map((item: any) => ({
            ...item,
            likes: Number(item.likes || 0),
            isLiked: Number(item.is_liked) > 0,
            image_path: item.image_path || 'placeholder.jpg'
          }));
        this.applyFilters();
        this.cdr.detectChanges();
      }
    });

    // 3. Load Bidding Room Artifacts
    this.itemService.getBiddingItems().subscribe({
      next: (data) => {
        const now = new Date().getTime();

        this.biddingItems = Array.isArray(data) ? data.map(item => {
          const endTime = item.expiry_time ? new Date(item.expiry_time).getTime() : 0;
          const isExpired = endTime > 0 && endTime < now;

          const mappedItem = {
            ...item,
            price: Number(item.price),
            current_bid: item.current_bid ? Number(item.current_bid) : null,
            highest_bidder_id: item.highest_bidder_id ? Number(item.highest_bidder_id) : null,
            likes: Number(item.likes || 0),
            isLiked: Number(item.is_liked) > 0,
            displayTimer: isExpired ? 'CLOSED' : item.displayTimer,
            isWinner: isExpired && Number(item.highest_bidder_id) === Number(this.user.id)
          };

          if (mappedItem.isWinner && !item.has_notified_winner) {
            this.toastService.show(`Congratulations ${this.user.username}, you won the bid for ${item.name}!`, "success");
            this.itemService.sendWinnerNotification(this.user.id, item.id, item.name).subscribe({
              next: () => item.has_notified_winner = 1,
              error: (e) => console.error("Could not save win notification", e)
            });
          }

          return mappedItem;
        }) : [];

        this.cdr.detectChanges();
      },
      error: (err) => console.error("Bidding load error", err)
    });

    // 4. Load Notifications
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

  toggleNotificationDropdown() {
    this.showNotifDropdown = !this.showNotifDropdown;
    if (!this.showNotifDropdown) {
      this.unreadCount = 0;
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
          item.isEndingSoon = total < 300000;
        }
      }
    });

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
    this.bidAmount = currentPrice + 10;

    const modalElement = document.getElementById('bidModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // --- NEW: MULTI-IMAGE SELECTION LOGIC ---
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.newItem.images = [];
      this.imagePreviews = [];

      // Limit to max 3 files
      const limit = Math.min(files.length, 3);

      for (let i = 0; i < limit; i++) {
        const file = files[i];
        this.newItem.images.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => this.imagePreviews.push(e.target.result);
        reader.readAsDataURL(file);
      }
    }
  }

  // --- NEW: MULTI-IMAGE SUBMIT LOGIC ---
  submitItem() {
    if (this.user.status === 'blocked') {
      this.toastService.show(`Blocked: ${this.user.block_reason || 'Guidelines violation'}`, "error");
      return;
    }

    if (!this.newItem.name || !this.newItem.category || !this.newItem.price || this.newItem.images.length === 0) {
      this.toastService.show("All fields and at least one image are required.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append('name', this.newItem.name);
    formData.append('category', this.newItem.category);
    formData.append('price', (this.newItem.price ?? 0).toString());
    formData.append('currency', this.newItem.currencyType);
    formData.append('description', this.newItem.description);
    formData.append('user_id', this.user.id);

    // Append multiple files
    for (let i = 0; i < this.newItem.images.length; i++) {
      formData.append('images[]', this.newItem.images[i]);
    }

    this.itemService.postItem(formData).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toastService.show("Impeccable! Your item is now live.", "success");
          this.resetForm();
          this.loadMarketplace();
          this.triggerModalClose('postItemModal');
        } else {
          this.toastService.show(res.message || "Upload failed.", "error");
        }
      },
      error: () => this.toastService.show("Upload failed. Check PHP connection.", "error")
    });
  }

  resetForm() {
    this.newItem = { name: '', category: '', price: null, currencyType: 'points', description: '', images: [] };
    this.imagePreviews = [];
  }

  toggleLike(item: any) {
    const wasLiked = item.isLiked;
    item.isLiked = !item.isLiked;
    item.likes = Number(item.likes) + (item.isLiked ? 1 : -1);

    this.itemService.likeItem(item.id, this.user.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          item.likes = res.new_count;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        item.isLiked = wasLiked;
        item.likes = Number(item.likes) + (wasLiked ? 1 : -1);
        this.toastService.show("Server desync: Like failed", "error");
        this.cdr.detectChanges();
      }
    });
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
          this.unreadCount = 0;
          this.notifications.forEach(n => n.is_read = 1);
          this.cdr.detectChanges();
          this.toastService.show("Notifications cleared", "success");
        }
      },
      error: (err) => console.error("Failed to mark as read", err)
    });
  }

  selectedMarketItem: any = null;
  customMessage: string = '';

  // --- NEW: CAROUSEL GETTER & NAVIGATION ---
  get parsedImages(): string[] {
    if (!this.selectedMarketItem || !this.selectedMarketItem.image_path) {
      return ['placeholder.jpg'];
    }
    return this.selectedMarketItem.image_path.split(',');
  }

  nextImage() {
    const images = this.parsedImages;
    if (images.length > 1) {
      this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
    }
  }

  prevImage() {
    const images = this.parsedImages;
    if (images.length > 1) {
      this.currentImageIndex = (this.currentImageIndex - 1 + images.length) % images.length;
    }
  }

  openItemDetail(item: any) {
    this.selectedMarketItem = item;
    this.currentImageIndex = 0; // Reset to the first image every time
    this.customMessage = '';
    this.cdr.detectChanges();
  }

 sendInquiry(item: any, customMsg?: string) {
    const message = customMsg || "I'm interested, can we make a deal?";

    if (!this.user || !this.user.id) {
      console.error("User not logged in!");
      return;
    }

    this.itemService.sendMessageInquiry(this.user.id, item.user_id, item.id, message).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toastService.show("Message sent to owner!", "success");

          // 1. Clear the form and state
          this.selectedMarketItem = null;
          this.customMessage = '';

          // 2. MODAL CLOSE
          const modalElement = document.getElementById('itemDetailModal');
          if (modalElement) {
            const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
              modalInstance.hide();
            }
          }

        } else {
          console.warn("Server returned error:", res.message);
          this.toastService.show(res.message || "Failed to send message.", "error");
        }
      },
      error: (err) => {
        console.error("HTTP Error occurred:", err);
        this.toastService.show("Connection error.", "error");
      }
    });
  }

  viewNotification(notif: any) {
    if (notif.type === 'message') {
      this.router.navigate(['/profile'], {
        queryParams: {
          tab: 'messages',
          partnerId: notif.sender_id,
          itemId: notif.item_id
        }
      });
    }
  }

  placeBid(inputValue: string) {
    if (!this.selectedItem) {
      this.toastService.show("System error: No artifact selected.", "error");
      return;
    }

    const bidValue = Number(inputValue);
    const currentPrice = Number(this.selectedItem.current_bid || this.selectedItem.price);
    const userPoints = Number(this.user.points);

    if (!bidValue || bidValue <= currentPrice) {
      this.toastService.show(`Bid too low! Must be higher than ${currentPrice} XP.`, "warning");
      return;
    }

    if (bidValue > userPoints) {
      this.toastService.show("Insufficient XP! You need more coins.", "error");
      return;
    }

    this.itemService.placeBid(this.selectedItem.id, this.user.id, bidValue).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          const msg = res.message || "BID REGISTERED: You are now the leader!";
          this.toastService.show(msg, "success");

          if (res.new_balance !== undefined) {
            this.user.points = Number(res.new_balance);
            localStorage.setItem('user', JSON.stringify(this.user));
          }

          this.selectedItem.current_bid = bidValue;
          this.selectedItem.highest_bidder = this.user.username;
          this.loadMarketplace();

        } else {
          this.toastService.show(res.message || "Bidding failed.", "error");
        }

        const modalElement = document.getElementById('bidModal');
        if (modalElement) {
          const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      },
      error: (err) => {
        console.error("HTTP Error:", err);
        this.toastService.show("Connection Error: Auction house unreachable.", "error");
      }
    });
  }
}
