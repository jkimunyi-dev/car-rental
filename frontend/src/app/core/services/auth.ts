import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { 
  User, 
  AuthResponse, 
  RegisterResponse, 
  MessageResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest
} from '../models/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  // Signals for reactive UI
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getAccessToken();
    const user = this.getStoredUser();
    
    if (token && user) {
      this.setUser(user);
      this.setAuthenticated(true);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);
    
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterRequest): Observable<RegisterResponse> {
    this.isLoading.set(true);
    
    return this.http.post<RegisterResponse>(`${this.API_URL}/register`, userData).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<MessageResponse> {
    this.isLoading.set(true);
    
    return this.http.post<MessageResponse>(`${this.API_URL}/forgot-password`, request).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<MessageResponse> {
    this.isLoading.set(true);
    
    return this.http.post<MessageResponse>(`${this.API_URL}/reset-password`, request).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  verifyEmail(request: VerifyEmailRequest): Observable<MessageResponse> {
    this.isLoading.set(true);
    
    return this.http.get<MessageResponse>(`${this.API_URL}/verify-email?token=${request.token}`).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  resendVerificationEmail(request: ResendVerificationRequest): Observable<MessageResponse> {
    this.isLoading.set(true);
    
    return this.http.post<MessageResponse>(`${this.API_URL}/resend-verification`, request).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken) {
      this.http.post<MessageResponse>(`${this.API_URL}/logout`, { refreshToken }).subscribe({
        complete: () => this.handleLogout()
      });
    } else {
      this.handleLogout();
    }
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, { refreshToken }).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        this.handleLogout();
        return throwError(() => error);
      })
    );
  }

  private handleAuthSuccess(response: AuthResponse): void {
    const { user, tokens } = response.data;
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    this.setUser(user);
    this.setAuthenticated(true);
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(user));
  }

  private handleLogout(): void {
    this.clearTokens();
    this.setUser(null);
    this.setAuthenticated(false);
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }

  private setUser(user: User | null): void {
    this.currentUser.set(user);
    this.currentUserSubject.next(user);
  }

  private setAuthenticated(isAuth: boolean): void {
    this.isAuthenticated.set(isAuth);
    this.isAuthenticatedSubject.next(isAuth);
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private getStoredUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  // Add method to check if user is authenticated
  isUserAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  // Add method to check user roles
  hasRole(role: string): boolean {
    const currentUser = this.currentUser();
    return currentUser ? currentUser.role === role : false;
  }

  // Add method to get current user
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  // Observables for components that need reactive updates
  get currentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }
}
