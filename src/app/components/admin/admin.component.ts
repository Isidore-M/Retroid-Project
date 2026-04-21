import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ItemService } from '../../services/item';
import { ToastService } from '../../services/toast.service'; // Ensure this service exists

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  // UI State
  activeTab: 'users' | 'market' | 'bidding' = 'users';
  adminUser: any;

  // Data Arrays
  users: any[] = [];
  allItems: any[] = [];
  biddingItems: any[] = [];

  // Model for adding to Bidding Room
  newArtifact: any = {
    name: '',
    price: null,
    image: null as File | null,
    expiry_custom: '' // Field for the Admin-controlled timer
  };

  constructor(
    private itemService: ItemService,
    public toastService: ToastService, // Must be PUBLIC to avoid the template error
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.adminUser = JSON.parse(savedUser);
    }
    this.loadAllData();
  }

  /**
   * Fetches the complete "God View" of the system
   */
  loadAllData() {
    this.itemService.getAdminOversight().subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.users = res.data.users;
          this.allItems = res.data.items;
          this.biddingItems = this.allItems.filter(item => item.is_bidding == 1);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error("Oversight data error:", err);
        this.toastService.show("Failed to sync system data.", "error");
      }
    });
  }

  setTab(tab: 'users' | 'market' | 'bidding') {
    this.activeTab = tab;
    this.loadAllData();
  }

  /**
   * Ban Hammer Logic
   */
  blockUser(user: any) {
    const reason = prompt(`Why are you blocking ${user.username}?`);

    if (reason !== null && reason.trim() !== '') {
      this.itemService.blockUser(user.id, reason).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            user.status = 'blocked';
            user.block_reason = reason;
            this.toastService.show(`${user.username} has been restricted.`, "warning");
            this.cdr.detectChanges();
          }
        },
        error: () => this.toastService.show("System error: Hammer failed to drop.", "error")
      });
    }
  }

  unblockUser(user: any) {
    this.itemService.unblockUser(user.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          user.status = 'active';
          user.block_reason = null;
          this.toastService.show(`Access restored for ${user.username}.`, "success");
          this.cdr.detectChanges();
        }
      },
      error: () => this.toastService.show("Could not unblock user.", "error")
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newArtifact.image = file;
    }
  }

  /**
   * Deploys a new artifact with Admin-controlled Timer
   */
  postArtifact() {
    if (!this.newArtifact.name || !this.newArtifact.price || !this.newArtifact.image) {
      this.toastService.show("Blueprints incomplete! Image and data required.", "warning");
      return;
    }

    let mysqlExpiry = '';

    // Check if Admin set a custom date
    if (this.newArtifact.expiry_custom) {
      // Formats HTML5 datetime-local to MySQL format
      mysqlExpiry = this.newArtifact.expiry_custom.replace('T', ' ') + ':00';
    } else {
      // Default fallback: 24 Hours from now
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);
      mysqlExpiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');
    }

    const formData = new FormData();
    formData.append('name', this.newArtifact.name);
    formData.append('price', this.newArtifact.price.toString());
    formData.append('category', 'Artifact');
    formData.append('image', this.newArtifact.image);
    formData.append('user_id', this.adminUser.id);
    formData.append('is_bidding', '1');
    formData.append('expiry_time', mysqlExpiry);

    this.itemService.postItem(formData).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toastService.show("DEPLOYMENT SUCCESSFUL: Artifact is live!", "success");
          this.resetArtifactForm();
          this.loadAllData();
        } else {
          this.toastService.show("Server Error: " + res.message, "error");
        }
      },
      error: (err) => this.toastService.show("Deployment failed. Connection issue.", "error")
    });
  }

  private resetArtifactForm() {
    this.newArtifact = { name: '', price: null, image: null, expiry_custom: '' };
  }

  /**
   * Admin-only deletion for marketplace oversight
   */
  deleteItem(itemId: number) {
    if (confirm("Permanently delete this marketplace listing?")) {
      // Logic for deletion (can be added to ItemService)
      this.toastService.show("Item removed from marketplace.", "error");
    }
  }
}
