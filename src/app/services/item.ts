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
    console.log("🚀 Service: Initiating POST to:", `${this.apiUrl}/post_item.php`);

    return this.http.post(`${this.apiUrl}/post_item.php`, formData).pipe(
      tap(response => console.log("✅ Server Response:", response)),
      catchError(this.handleError)
    );
  }

  /**
   * Fetches all marketplace items
   */
  getItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/get_items.php`).pipe(
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
        errorMessage = "⚠️ Connection Refused! Check if Apache is running and your URL is correct.";
      } else if (error.status === 404) {
        errorMessage = "⚠️ 404 Not Found! PHP file path is wrong.";
      }
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
