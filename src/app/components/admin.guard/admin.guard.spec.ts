import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let component: AdminGuard;
  let fixture: ComponentFixture<AdminGuard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGuard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminGuard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
