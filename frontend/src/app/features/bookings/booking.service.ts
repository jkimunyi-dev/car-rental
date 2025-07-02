import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BookingResponse,
  CreateBookingDto,
  UpdateBookingDto,
  PricingBreakdownDto,
  AvailabilityResult,
  CancelBookingDto,
  BookingSearchOptions,
  BookingSearchResult,
  BookingStatus,
  BookingStatusUpdateDto
} from '../../core/models/booking.models';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly apiUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) { }

  // Create a new booking
  createBooking(bookingData: CreateBookingDto): Observable<{ success: boolean; message: string; data: BookingResponse }> {
    return this.http.post<{ success: boolean; message: string; data: BookingResponse }>(this.apiUrl, bookingData);
  }

  // Get all bookings with filters (admin/agent only)
  getBookings(filters: BookingSearchOptions = {}): Observable<{ success: boolean; message: string; data: BookingSearchResult }> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof BookingSearchOptions] !== undefined && filters[key as keyof BookingSearchOptions] !== null) {
        params = params.set(key, filters[key as keyof BookingSearchOptions]!.toString());
      }
    });
    return this.http.get<{ success: boolean; message: string; data: BookingSearchResult }>(this.apiUrl, { params });
  }

  // Get user's own bookings
  getMyBookings(filters: BookingSearchOptions = {}): Observable<{ success: boolean; message: string; data: BookingSearchResult }> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof BookingSearchOptions] !== undefined && filters[key as keyof BookingSearchOptions] !== null) {
        params = params.set(key, filters[key as keyof BookingSearchOptions]!.toString());
      }
    });
    return this.http.get<{ success: boolean; message: string; data: BookingSearchResult }>(`${this.apiUrl}/my-bookings`, { params });
  }

  // Get booking by ID
  getBookingById(bookingId: string): Observable<{ success: boolean; message: string; data: BookingResponse }> {
    return this.http.get<{ success: boolean; message: string; data: BookingResponse }>(`${this.apiUrl}/${bookingId}`);
  }

  // Update booking
  updateBooking(bookingId: string, updateData: UpdateBookingDto): Observable<{ success: boolean; message: string; data: BookingResponse }> {
    return this.http.patch<{ success: boolean; message: string; data: BookingResponse }>(`${this.apiUrl}/${bookingId}`, updateData);
  }

  // Update booking status (admin/agent only)
  updateBookingStatus(bookingId: string, statusData: BookingStatusUpdateDto): Observable<{ success: boolean; message: string; data: BookingResponse }> {
    return this.http.patch<{ success: boolean; message: string; data: BookingResponse }>(`${this.apiUrl}/${bookingId}/status`, statusData);
  }

  // Cancel booking
  cancelBooking(bookingId: string, cancellationData: CancelBookingDto): Observable<{ success: boolean; message: string; data: BookingResponse }> {
    return this.http.post<{ success: boolean; message: string; data: BookingResponse }>(`${this.apiUrl}/${bookingId}/cancel`, cancellationData);
  }

  // Check vehicle availability
  checkAvailability(vehicleId: string, startDate: string, endDate: string): Observable<{ success: boolean; message: string; data: AvailabilityResult }> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<{ success: boolean; message: string; data: AvailabilityResult }>(`${this.apiUrl}/check-availability/${vehicleId}`, { params });
  }

  // Calculate booking price
  calculatePrice(
    vehicleId: string, 
    startDate: string, 
    endDate: string, 
    options: {
      startTime?: string;
      endTime?: string;
      isHourlyBooking?: boolean;
      couponCode?: string;
    } = {}
  ): Observable<{ success: boolean; message: string; data: PricingBreakdownDto }> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (options.startTime) params = params.set('startTime', options.startTime);
    if (options.endTime) params = params.set('endTime', options.endTime);
    if (options.isHourlyBooking) params = params.set('isHourlyBooking', options.isHourlyBooking.toString());
    if (options.couponCode) params = params.set('couponCode', options.couponCode);

    return this.http.get<{ success: boolean; message: string; data: PricingBreakdownDto }>(`${this.apiUrl}/calculate-price/${vehicleId}`, { params });
  }

  // Get booking statistics (admin/agent only)
  getBookingStatistics(userId?: string): Observable<{ success: boolean; message: string; data: any }> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get<{ success: boolean; message: string; data: any }>(`${this.apiUrl}/statistics`, { params });
  }

  // Bulk update booking status (admin/agent only)
  bulkUpdateStatus(bookingIds: string[], status: BookingStatus): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.post<{ success: boolean; message: string; data: any }>(`${this.apiUrl}/bulk-update-status`, {
      bookingIds,
      status
    });
  }
}