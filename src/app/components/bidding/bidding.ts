import { Component, OnInit, OnDestroy } from '@angular/core';
import { ItemService } from '../../services/item';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-bidding-room',
  templateUrl: './bidding.html',
  imports: [UpperCasePipe],
  styleUrls: ['./bidding.css'],
  providers: [UpperCasePipe] // Provides the pipe if not globally available
})
export class BiddingRoomComponent implements OnInit, OnDestroy {
  artifacts: any[] = [];
  user: any;
  pollingTimer: any;
  selectedArtifact: any; // Property to hold the item for the modal

  constructor(
    private itemService: ItemService,
    private upperCasePipe: UpperCasePipe
  ) {}

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.refreshRoom();
    // Pulse: Updates the room and the terminal feeds every 5 seconds
    this.pollingTimer = setInterval(() => this.refreshRoom(), 5000);
  }

  ngOnDestroy() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  // FIX: Added the missing method called by your HTML (click)
  openBiddingModal(item: any) {
    this.selectedArtifact = item;
    // If using Bootstrap, you can trigger the modal here
    // or let the [attr.data-bs-target] handle the opening.
    console.log("Viewing artifact details:", item.name);
  }

  refreshRoom() {
    this.itemService.getBiddingItems().subscribe(res => {
      // Logic: Take only the first 3 active artifacts
      const activeItems = res.slice(0, 3);

      // Fetch history for each item to populate the terminal feed
      activeItems.forEach((art: any) => {
        // Ensure this method exists in your ItemService!
        this.itemService.getItemHistory(art.id).subscribe((history: any) => {
          art.history = history;
        });
      });

      this.artifacts = activeItems;
    });
  }

  placeBid(item: any, bidInput: HTMLInputElement) {
    const amount = Number(bidInput.value);
    const currentPrice = Number(item.current_bid || item.price);

    if (amount <= currentPrice) {
      alert(`The bid must be higher than ${currentPrice} XP!`);
      return;
    }

    if (this.user.points < amount) {
      alert("Insufficient XP balance for this maneuver.");
      return;
    }

    this.itemService.placeBid(item.id, this.user.id, amount).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          alert("High bid recorded! You are now the leading bidder.");

          // Update local user points for immediate feedback
          this.user.points = res.new_balance;
          localStorage.setItem('user', JSON.stringify(this.user));

          bidInput.value = '';
          this.refreshRoom();
        } else {
          alert("Error: " + res.message);
        }
      }
    });
  }

  getRemainingTime(expiryDate: string): string {
    const now = new Date().getTime();
    const end = new Date(expiryDate).getTime();
    const diff = end - now;

    if (diff <= 0) return "AUCTION CLOSED";

    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }
}
