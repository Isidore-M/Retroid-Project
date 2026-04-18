import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // Added for the 'Exit to Market' link
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // Added RouterModule
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
  biddingItems: any[] = []; // Array specifically for the bidding management view

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
    // Get current admin details from session
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

          // Filter items that are currently in the bidding room for the management tab
          this.biddingItems = this.allItems.filter(item => item.is_bidding == 1);

          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Could not load oversight data:", err)
    });
  }

  setTab(tab: 'users' | 'market' | 'bidding') {
    this.activeTab = tab;
    // We don't always need to refresh the whole DB on tab switch,
    // but it ensures the Admin always sees real-time data.
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
            alert(`${user.username} has been restricted.`);
            this.cdr.detectChanges();
          }
        },
        error: () => alert("System error: The hammer failed to drop.")
      });
    }
  }

  unblockUser(user: any) {
    if (confirm(`Restore access for ${user.username}?`)) {
      this.itemService.unblockUser(user.id).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            user.status = 'active';
            user.block_reason = null;
            alert(`Access restored for ${user.username}.`);
            this.cdr.detectChanges();
          }
        },
        error: () => alert("Could not communicate with the security server.")
      });
    }
  }

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
      alert("Artifact blueprints incomplete! Name, price, and image required.");
      return;
    }

    const formData = new FormData();
    formData.append('name', this.newArtifact.name);
    formData.append('price', this.newArtifact.price.toString());
    formData.append('category', 'Artifact');
    formData.append('image', this.newArtifact.image);
    formData.append('user_id', this.adminUser.id);
    formData.append('is_bidding', '1'); // Routes it to the bidding room

    this.itemService.postItem(formData).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          alert("DEPLOYMENT SUCCESSFUL: Artifact is now live in the Bidding Room.");
          this.resetArtifactForm();
          this.loadAllData(); // Refresh list to show new artifact
        }
      },
      error: (err) => alert("Deployment failed. Check server logs.")
    });
  }

  private resetArtifactForm() {
    this.newArtifact = { name: '', price: null, image: null };
    // Clear the file input manually if needed
  }

  /**
   * Admin-only deletion for marketplace oversight
   */
  deleteItem(itemId: number) {
    if (confirm("Permanently delete this marketplace listing?")) {
      // You can implement this in your ItemService later
      console.log("Deleting item:", itemId);
    }
  }
}
