import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemDetailsModal } from './item-details-modal';

describe('ItemDetailsModal', () => {
  let component: ItemDetailsModal;
  let fixture: ComponentFixture<ItemDetailsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemDetailsModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemDetailsModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
