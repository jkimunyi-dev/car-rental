import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BookingResponse {
  id: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  totalHours?: number;
  pricePerDay: number;
  pricePerHour?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  totalAmount: number;
  status: BookingStatus;
  notes?: string;
  cancellationReason?: string;
  isModifiable: boolean;
  isCancellable: boolean;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    images?: string[];
    category?: string;
    location?: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  coupon?: {
    code: string;
    discountValue: number;
    discountType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingDto {
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  notes?: string;
  couponCode?: string;
  isHourlyBooking?: boolean;
}

export interface PricingBreakdownDto {
  basePrice: number;
  totalDays: number;
  totalHours?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  couponDiscount?: number;
  totalAmount: number;
  pricePerDay: number;
  pricePerHour?: number;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts?: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
  }>;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

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
  getBookings(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(this.apiUrl, { params });
  }

  // Get user's bookings
  getMyBookings(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/my-bookings`, { params });
  }

  // Get booking by ID
  getBookingById(bookingId: string): Observable<BookingResponse> {
    return this.http.get<BookingResponse>(`${this.apiUrl}/${bookingId}`);
  }

  // Update booking
  updateBooking(bookingId: string, updateData: any): Observable<BookingResponse> {
    return this.http.patch<BookingResponse>(`${this.apiUrl}/${bookingId}`, updateData);
  }

  // Cancel booking
  cancelBooking(bookingId: string, cancellationData: { cancellationReason: string; requestRefund?: boolean }): Observable<BookingResponse> {
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