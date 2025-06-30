import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Re-export everything from booking.service.ts for backwards compatibility
export * from './booking.service';

@Injectable({
  providedIn: 'root'
})
export class Booking {
  private readonly apiUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) { }

  // Legacy methods for backwards compatibility
  getBookings(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(this.apiUrl, { params });
  }

  getBookingById(bookingId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${bookingId}`);
  }

  createBooking(bookingData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, bookingData);
  }

  updateBooking(bookingId: string, updateData: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${bookingId}`, updateData);
  }

  cancelBooking(bookingId: string, cancellationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${bookingId}/cancel`, cancellationData);
  }
}
