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
  BookingStatus
} from '../../core/models/booking.models';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly apiUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) { }

  // Create a new booking
  createBooking(bookingData: CreateBookingDto): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(this.apiUrl, bookingData);
  }

  // Get all bookings with filters
  getBookings(filters: BookingSearchOptions = {}): Observable<BookingSearchResult> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof BookingSearchOptions] !== undefined && filters[key as keyof BookingSearchOptions] !== null) {
        params = params.set(key, filters[key as keyof BookingSearchOptions]!.toString());
      }
    });
    return this.http.get<BookingSearchResult>(this.apiUrl, { params });
  }

  // Get user's bookings
  getMyBookings(filters: BookingSearchOptions = {}): Observable<BookingSearchResult> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof BookingSearchOptions] !== undefined && filters[key as keyof BookingSearchOptions] !== null) {
        params = params.set(key, filters[key as keyof BookingSearchOptions]!.toString());
      }
    });
    return this.http.get<BookingSearchResult>(`${this.apiUrl}/my-bookings`, { params });
  }

  // Get booking by ID
  getBookingById(bookingId: string): Observable<BookingResponse> {
    return this.http.get<BookingResponse>(`${this.apiUrl}/${bookingId}`);
  }

  // Update booking
  updateBooking(bookingId: string, updateData: UpdateBookingDto): Observable<BookingResponse> {
    return this.http.patch<BookingResponse>(`${this.apiUrl}/${bookingId}`, updateData);
  }

  // Cancel booking
  cancelBooking(bookingId: string, cancellationData: CancelBookingDto): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.apiUrl}/${bookingId}/cancel`, cancellationData);
  }

  // Check vehicle availability
  checkAvailability(vehicleId: string, startDate: string, endDate: string): Observable<AvailabilityResult> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<AvailabilityResult>(`${this.apiUrl}/check-availability/${vehicleId}`, { params });
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
  ): Observable<PricingBreakdownDto> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (options.startTime) params = params.set('startTime', options.startTime);
    if (options.endTime) params = params.set('endTime', options.endTime);
    if (options.isHourlyBooking) params = params.set('isHourlyBooking', options.isHourlyBooking.toString());
    if (options.couponCode) params = params.set('couponCode', options.couponCode);

    return this.http.get<PricingBreakdownDto>(`${this.apiUrl}/calculate-price/${vehicleId}`, { params });
  }
}