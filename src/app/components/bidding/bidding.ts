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
    this.pollingTimer = setInterval(() => this.refreshRoom(), 5000);
  }

  ngOnDestroy() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  refreshRoom() {
    this.itemService.getBiddingItems().subscribe(res => {
      // Logic: Take only the first 3 active artifacts
      this.artifacts = res.slice(0, 3);
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
