import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly usersUrl = `${environment.apiUrl}/users`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadCurrentUser();
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.usersUrl}/profile`).pipe(
      tap(response => {
        if (response && (response as any).data) {
          this.currentUserSubject.next((response as any).data);
        }
      })
    );
  }

  private loadCurrentUser() {
    const token = localStorage.getItem('accessToken');
    if (token) {
      this.getCurrentUser().subscribe({
        next: () => {
          // User loaded successfully
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  hasRole(role: string): boolean {
    const currentUser = this.currentUserSubject.value;
    return currentUser && currentUser.role === role;
  }
}