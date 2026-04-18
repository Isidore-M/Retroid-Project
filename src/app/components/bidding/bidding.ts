import { Component, OnInit } from '@angular/core';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-bidding-room',
  templateUrl: './bidding.html',
  styleUrls: ['./bidding.css']
})
export class BiddingRoomComponent implements OnInit {
  artifacts: any[] = [];
  user: any;

  constructor(private itemService: ItemService) {}

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.loadBiddingItems();
    setInterval(() => this.loadBiddingItems(), 10000);
  }

  loadBiddingItems() {
    // We'll create a new service method for this
    this.itemService.getBiddingItems().subscribe(res => {
      this.artifacts = res;
    });
  }

  placeBid(item: any, amount: number) {
    if (amount <= item.current_bid) {
      alert("Bid must be higher than the current price!");
      return;
    }
    if (this.user.points < amount) {
      alert("You don't have enough XP for this bid!");
      return;
    }

    this.itemService.placeBid(item.id, this.user.id, amount).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          alert("Bid Placed! You are currently the highest bidder.");
          this.loadBiddingItems();
        }
      }
    });
  }
}
