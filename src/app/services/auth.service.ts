import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Centralized URL
  private baseUrl = 'http://localhost/Retroid/api';

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login.php`, credentials);
  }

  // Add this method to fix the 'Property does not exist' error
  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register.php`, userData);
  }
}
