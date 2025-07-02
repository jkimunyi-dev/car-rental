import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  vin?: string;
  pricePerDay: number;
  pricePerHour?: number;
  location: string;
  description?: string;
  features: string[];
  images: any[];
  status: string;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  transmission?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  minSeats?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private baseUrl = 'http://localhost:3000/api/vehicles';

  constructor(private http: HttpClient) {}

  getVehicles(params?: VehicleSearchParams): Observable<ApiResponse<PaginatedResponse<Vehicle>>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof VehicleSearchParams];
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<PaginatedResponse<Vehicle>>>(this.baseUrl, { params: httpParams });
  }

  getVehicle(id: string): Observable<ApiResponse<Vehicle>> {
    return this.http.get<ApiResponse<Vehicle>>(`${this.baseUrl}/${id}`);
  }
}