import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  WishlistResponse, 
  WishlistItem, 
  AddToWishlistDto, 
  WishlistQueryDto,
  WishlistNotificationDto 
} from '../models/wishlist.models';
import { ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly apiUrl = `${environment.apiUrl}/wishlist`;
  private wishlistItemsSubject = new BehaviorSubject<WishlistItem[]>([]);
  public wishlistItems$ = this.wishlistItemsSubject.asObservable();

  constructor(private http: HttpClient) {}

  addToWishlist(vehicleId: string): Observable<ApiResponse<WishlistItem>> {
    const dto: AddToWishlistDto = { vehicleId };
    return this.http.post<ApiResponse<WishlistItem>>(this.apiUrl, dto).pipe(
      tap(() => this.refreshWishlist())
    );
  }

  removeFromWishlist(vehicleId: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.apiUrl}/${vehicleId}`).pipe(
      tap(() => this.refreshWishlist())
    );
  }

  getWishlist(query?: WishlistQueryDto): Observable<ApiResponse<WishlistResponse>> {
    let params = new HttpParams();
    
    if (query) {
      Object.keys(query).forEach(key => {
        if (query[key as keyof WishlistQueryDto] !== undefined && query[key as keyof WishlistQueryDto] !== null) {
          params = params.set(key, query[key as keyof WishlistQueryDto]!.toString());
        }
      });
    }

    return this.http.get<ApiResponse<WishlistResponse>>(this.apiUrl, { params }).pipe(
      tap(response => {
        if (response.success) {
          this.wishlistItemsSubject.next(response.data.items);
        }
      })
    );
  }

  checkIfInWishlist(vehicleId: string): Observable<ApiResponse<{ inWishlist: boolean }>> {
    return this.http.get<ApiResponse<{ inWishlist: boolean }>>(`${this.apiUrl}/check/${vehicleId}`);
  }

  setNotification(notification: WishlistNotificationDto): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.apiUrl}/notifications`, notification);
  }

  clearWishlist(): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(this.apiUrl).pipe(
      tap(() => this.wishlistItemsSubject.next([]))
    );
  }

  getQuickBookingUrl(vehicleId: string): Observable<ApiResponse<{ bookingUrl: string }>> {
    return this.http.get<ApiResponse<{ bookingUrl: string }>>(`${this.apiUrl}/${vehicleId}/quick-book`);
  }

  private refreshWishlist(): void {
    this.getWishlist().subscribe();
  }

  // Helper method to get current wishlist count
  getWishlistCount(): Observable<number> {
    return this.wishlistItems$.pipe(
      map(items => items.length)
    );
  }

  // Helper method to check if a vehicle is in wishlist
  isInWishlist(vehicleId: string): Observable<boolean> {
    return this.wishlistItems$.pipe(
      map(items => items.some(item => item.vehicleId === vehicleId))
    );
  }
}