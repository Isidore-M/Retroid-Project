import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Model for adding to Bidding Room
  newArtifact: any = {
    name: '',
    price: null,
    image: null as File | null
  };

  constructor(
    private itemService: ItemService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Get current admin details
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
      next: (res) => {
        if (res.status === 'success') {
          this.users = res.data.users;
          this.allItems = res.data.items;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Could not load oversight data:", err)
    });
  }

  /**
   * Switches tabs and refreshes data if needed
   */
  setTab(tab: 'users' | 'market' | 'bidding') {
    this.activeTab = tab;
    this.loadAllData(); // Refresh data whenever we switch tabs
  }

  /**
   * Drops the Ban Hammer
   */
  blockUser(user: any) {
  const reason = prompt(`Why are you blocking ${user.username}?`);

  if (reason !== null && reason.trim() !== '') {
    this.itemService.blockUser(user.id, reason).subscribe({
      next: (res: any) => { // Fixed: Explicitly typed 'res'
        if (res.status === 'success') {
          user.status = 'blocked';
          user.block_reason = reason;
          this.cdr.detectChanges();
        }
      },
      error: () => alert("Failed to drop the hammer.") // Fixed: Removed unused 'err'
    });
  }
}

  /**
   * Restores a user's access
   */
  unblockUser(user: any) {
  if (confirm(`Are you sure you want to unblock ${user.username}?`)) {
    this.itemService.unblockUser(user.id).subscribe({
      next: (res: any) => { // Fixed: Explicitly typed 'res'
        if (res.status === 'success') {
          user.status = 'active';
          user.block_reason = null;
          this.cdr.detectChanges();
        }
      },
      error: () => alert("Could not unblock user.") // Fixed: Removed unused 'err'
    });
  }
}

  /**
   * Handles image selection for the Bidding Room Artifact
   */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newArtifact.image = file;
    }
  }

  /**
   * Deploys a new artifact to the Bidding Room
   */
  postArtifact() {
    if (!this.newArtifact.name || !this.newArtifact.price || !this.newArtifact.image) {
      alert("Please fill all artifact details including the image.");
      return;
    }

    const formData = new FormData();
    formData.append('name', this.newArtifact.name);
    formData.append('price', this.newArtifact.price.toString());
    formData.append('image', this.newArtifact.image);
    formData.append('user_id', this.adminUser.id); // Set the admin as the creator
    formData.append('is_bidding', '1'); // Crucial flag for bidding room logic

    this.itemService.postItem(formData).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          alert("Artifact deployed to the Bidding Room!");
          this.resetArtifactForm();
          this.loadAllData();
        }
      },
      error: (err) => console.error("Artifact deployment failed:", err)
    });
  }

  private resetArtifactForm() {
    this.newArtifact = { name: '', price: null, image: null };
  }
}
