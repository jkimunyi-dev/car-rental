import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  doors: number;
  color: string;
  licensePlate: string;
  pricePerDay: number;
  pricePerHour?: number;
  description?: string;
  location: string;
  features: string[];
  images: string[];
  status: string;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviews?: VehicleReview[];
}

export interface VehicleReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface VehicleSearchParams {
  page?: number;
  limit?: number;
  location?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  transmission?: string;
  fuelType?: string;
  minSeats?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VehicleSearchResponse {
  data: Vehicle[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly apiUrl = `${environment.apiUrl}/vehicles`;

  constructor(private http: HttpClient) {}

  getVehicles(params?: VehicleSearchParams): Observable<{ success: boolean; data: VehicleSearchResponse; message: string }> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof VehicleSearchParams] !== undefined && params[key as keyof VehicleSearchParams] !== null) {
          httpParams = httpParams.set(key, params[key as keyof VehicleSearchParams]!.toString());
        }
      });
    }

    return this.http.get<{ success: boolean; data: VehicleSearchResponse; message: string }>(this.apiUrl, { params: httpParams });
  }

  getVehicle(id: string): Observable<{ success: boolean; data: Vehicle; message: string }> {
    return this.http.get<{ success: boolean; data: Vehicle; message: string }>(`${this.apiUrl}/${id}`);
  }

  searchVehicles(params: VehicleSearchParams): Observable<{ success: boolean; data: VehicleSearchResponse; message: string }> {
    return this.getVehicles(params);
  }

  getAvailabilityCalendar(vehicleId: string, year: number, month: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${vehicleId}/availability/${year}/${month}`);
  }
}
