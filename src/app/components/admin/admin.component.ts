import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ItemService } from '../../services/item';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  activeTab: 'users' | 'market' | 'bidding' = 'users';
  adminUser: any;

  users: any[] = [];
  allItems: any[] = [];
  biddingItems: any[] = [];

  // UPDATED: Added description and rarity defaults
  newArtifact: any = {
    name: '',
    price: null,
    image: null as File | null,
    expiry_custom: '',
    description: '',
    rarity: 'Common'
  };

  constructor(
    private itemService: ItemService,
    public toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.adminUser = JSON.parse(savedUser);
    }
    this.loadAllData();
  }

  loadAllData() {
    this.itemService.getAdminOversight().subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.users = res.data.users;
          this.allItems = res.data.items;
          this.biddingItems = this.allItems.filter(item => item.is_bidding == 1);
          this.cdr.detectChanges();
        }
      }
    });
  }

  setTab(tab: 'users' | 'market' | 'bidding') {
    this.activeTab = tab;
    this.loadAllData();
  }

  blockUser(user: any) {
    const reason = prompt(`Why are you blocking ${user.username}?`);
    if (reason !== null && reason.trim() !== '') {
      this.itemService.blockUser(user.id, reason).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            user.status = 'blocked';
            user.block_reason = reason;
            this.toastService.show(`${user.username} has been restricted.`, "warning");
          }
        }
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
        }
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newArtifact.image = file;
    }
  }

  postArtifact() {
    if (!this.newArtifact.name || !this.newArtifact.price || !this.newArtifact.image) {
      this.toastService.show("Blueprints incomplete! Image and data required.", "warning");
      return;
    }

    let mysqlExpiry = '';
    if (this.newArtifact.expiry_custom) {
      mysqlExpiry = this.newArtifact.expiry_custom.replace('T', ' ') + ':00';
    } else {
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

    // NEW: Append description and rarity to the request
    formData.append('description', this.newArtifact.description);
    formData.append('rarity', this.newArtifact.rarity);

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
      error: () => this.toastService.show("Deployment failed. Connection issue.", "error")
    });
  }

  private resetArtifactForm() {
    // Reset the new fields too
    this.newArtifact = { name: '', price: null, image: null, expiry_custom: '', description: '', rarity: 'Common' };
  }

  // FIX: Real deletion logic bridging to your PHP file
  deleteItem(itemId: number) {
    if (confirm("SYSTEM WARNING: Permanently delete this item? This cannot be undone.")) {
      // Create this method in your item.service.ts
      this.itemService.adminDeleteAction(itemId).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.toastService.show("Item permanently erased.", "success");
            this.loadAllData(); // Refresh tables
          } else {
            this.toastService.show("Error: " + res.message, "error");
          }
        },
        error: () => this.toastService.show("Network failed during deletion.", "error")
      });
    }
  }
}
