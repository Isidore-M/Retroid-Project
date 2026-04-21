import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toast$ = new BehaviorSubject<Toast | null>(null);
  currentToast = this.toast$.asObservable();

  show(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.toast$.next({ message, type });
    setTimeout(() => this.toast$.next(null), 4000); // Auto-hide after 4s
  }
}
