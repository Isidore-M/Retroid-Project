import { Component, OnInit, OnDestroy } from '@angular/core';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-bidding-room',
  templateUrl: './bidding.html',
  styleUrls: ['./bidding.css']
})
export class BiddingRoomComponent implements OnInit, OnDestroy {
  artifacts: any[] = [];
  user: any;
  pollingTimer: any;

  constructor(private itemService: ItemService) {}

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.refreshRoom();

    // Pulse: Refresh prices every 5 seconds to show new bids
    this.pollingTimer = setInterval(() => this.refreshRoom(), 5000);
  }

  ngOnDestroy() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  refreshRoom() {
    this.itemService.getBiddingItems().subscribe(res => {
      this.artifacts = res;
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
          bidInput.value = '';
          this.refreshRoom();
        } else {
          alert("Error: " + res.message);
        }
      }
    });
  }

  // Add this to your BiddingRoomComponent class

getRemainingTime(expiryDate: string): string {
  const now = new Date().getTime();
  const end = new Date(expiryDate).getTime();
  const diff = end - now;

  if (diff <= 0) return "AUCTION CLOSED";

  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Return formatted as 00h 00m 00s
  return `${hours}h ${minutes}m ${seconds}s`;
}
}
