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

  // Now uses an array for images to match the new backend
  newArtifact: any = {
    name: '',
    price: null,
    expiry_custom: '',
    description: '',
    rarity: 'Common',
    images: [] as File[]
  };

  imagePreviews: string[] = [];

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
          this.biddingItems = this.allItems.filter((item: any) => item.is_bidding == 1);
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
    const files = event.target.files;
    if (files) {
      const availableSlots = 3 - this.newArtifact.images.length;
      const limit = Math.min(files.length, availableSlots);

      for (let i = 0; i < limit; i++) {
        const file = files[i];
        this.newArtifact.images.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }

      event.target.value = '';
    }
  }

  removeImage(index: number) {
    this.newArtifact.images.splice(index, 1);
    this.imagePreviews.splice(index, 1);
    this.cdr.detectChanges();
  }

  postArtifact() {
    if (!this.newArtifact.name || !this.newArtifact.price || this.newArtifact.images.length === 0) {
      this.toastService.show("Blueprints incomplete! At least 1 image and data required.", "warning");
      return;
    }

    let mysqlExpiry = '';
    if (this.newArtifact.expiry_custom) {
      mysqlExpiry = this.newArtifact.expiry_custom.replace('T', ' ') + ':00';
    } else {
      // THE FIX: Exact Local Time calculation
      const now = new Date();
      now.setHours(now.getHours() + 24);

      // Offset UTC to get perfect local YYYY-MM-DD HH:mm:ss
      const offsetMs = now.getTimezoneOffset() * 60 * 1000;
      const localTime = new Date(now.getTime() - offsetMs);
      mysqlExpiry = localTime.toISOString().slice(0, 19).replace('T', ' ');
    }

    const formData = new FormData();
    formData.append('name', this.newArtifact.name);
    formData.append('price', this.newArtifact.price.toString());
    formData.append('category', 'Artifact');
    formData.append('user_id', this.adminUser.id);
    formData.append('is_bidding', '1');
    formData.append('expiry_time', mysqlExpiry);
    formData.append('description', this.newArtifact.description);
    formData.append('rarity', this.newArtifact.rarity);

    for (let i = 0; i < this.newArtifact.images.length; i++) {
      formData.append('images[]', this.newArtifact.images[i]);
    }

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
    this.newArtifact = { name: '', price: null, expiry_custom: '', description: '', rarity: 'Common', images: [] };
    this.imagePreviews = [];
  }

  deleteItem(itemId: number) {
    if (confirm("SYSTEM WARNING: Permanently delete this item? This cannot be undone.")) {
      this.itemService.adminDeleteAction(itemId).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.toastService.show("Item permanently erased.", "success");
            this.loadAllData();
          } else {
            this.toastService.show("Error: " + res.message, "error");
          }
        },
        error: () => this.toastService.show("Network failed during deletion.", "error")
      });
    }
  }
}
