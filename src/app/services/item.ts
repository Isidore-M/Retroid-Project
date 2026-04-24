import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  /**
   * IMPORTANT: Ensure this matches your XAMPP folder structure.
   * If your project is in htdocs/retroid, use: 'http://localhost/retroid/api'
   */
  private apiUrl = 'http://localhost/Retroid/api';

  constructor(private http: HttpClient) { }

  /**
   * Sends Item data + Image to PHP
   */
  postItem(formData: FormData): Observable<any> {
    console.log("Service: Initiating POST to:", `${this.apiUrl}/post_item.php`);

    return this.http.post(`${this.apiUrl}/post_item.php`, formData).pipe(
      tap(response => console.log("✅ Server Response:", response)),
      catchError(this.handleError)
    );
  }

  /**
   * Fetches all marketplace items
   */
  getItems(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/get_items.php?user_id=${userId}`).pipe(
      catchError(this.handleError)
    );
  }
  /**
   * Global Error Handler to pinpoint connection issues
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

      if (error.status === 0) {
        errorMessage = "Connection Refused! Check if Apache is running and your URL is correct.";
      } else if (error.status === 404) {
        errorMessage = "404 Not Found! PHP file path is wrong.";
      }
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

 likeItem(itemId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/like_item.php`, {
      item_id: itemId,
      user_id: userId
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Fetches the user's uploaded items and liked items for the profile page
   */
  getUserProfile(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/get_profile.php?user_id=${userId}`).pipe(
      catchError(this.handleError)
    );
  }
updateUserInfo(userId: number, username: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/update_user_info.php`, {
    user_id: userId,
    username: username
  });
}

getAdminOversight(): Observable<any> {
  return this.http.get(`${this.apiUrl}/get_admin_oversight.php`);
}

// And the block action
blockUser(userId: number, reason: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/admin_actions.php`, {
    action: 'block',
    user_id: userId,
    reason: reason
  });
}


// Inside ItemService class
unblockUser(userId: number): Observable<any> {
  return this.http.post(`${this.apiUrl}/admin_actions.php`, {
    action: 'unblock',
    user_id: userId
  });
}



// Fetch artifacts specifically for the Bidding Room
getBiddingItems(): Observable<any> {
  // This will call a PHP script that filters items where is_bidding = 1
  return this.http.get(`${this.apiUrl}/get_bidding_items.php`);
}

// Post a new bid to the bids table
placeBid(itemId: number, userId: number, amount: number): Observable<any> {
  return this.http.post(`${this.apiUrl}/place_bid.php`, {
    item_id: itemId,
    user_id: userId,
    amount: amount
  });
}

getAllUsers(): Observable<any> {
  return this.http.get(`${this.apiUrl}/get_all_users.php`);
}



getNotifications(userId: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/get_notifications.php?user_id=${userId}`);
}

markNotificationsAsRead(userId: number): Observable<any> {
  return this.http.post(`${this.apiUrl}/mark_notifications_read.php`, { user_id: userId });
}

sendWinnerNotification(userId: number, itemId: number, itemName: string) {
  return this.http.post(`${this.apiUrl}/notify_winner.php`, {
    user_id: userId,
    item_id: itemId,
    item_name: itemName
  });
}


sendMessageInquiry(senderId: number, ownerId: number, itemId: number, message: string) {
  return this.http.post(`${this.apiUrl}/send_inquiry.php`, {
    sender_id: senderId,
    owner_id: ownerId,
    item_id: itemId,
    message: message
  });
}







}
