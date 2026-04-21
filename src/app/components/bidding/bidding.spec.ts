import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddingRoomComponent } from './bidding';

describe('Bidding', () => {
  let component: BiddingRoomComponent;
  let fixture: ComponentFixture<BiddingRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddingRoomComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddingRoomComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
