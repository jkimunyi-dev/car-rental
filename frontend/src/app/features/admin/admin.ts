import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  AdminAnalytics, 
  AdminUser, 
  AdminBooking, 
  AdminVehicle,
  SystemSettings,
  BulkActionResult 
} from '../../core/models/admin.models';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class Admin {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  // Analytics
  getAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Observable<ApiResponse<AdminAnalytics>> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ApiResponse<AdminAnalytics>>(`${this.apiUrl}/analytics`, { params });
  }

  // User Management
  getUsers(filters: any = {}): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/users`, { params });
  }

  updateUserRole(userId: string, role: string): Observable<AdminUser> {
    return this.http.put<ApiResponse<AdminUser>>(`${this.apiUrl}/users/${userId}/role`, { role })
      .pipe(map(response => response.data));
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<AdminUser> {
    return this.http.put<ApiResponse<AdminUser>>(`${this.apiUrl}/users/${userId}/status`, { isActive })
      .pipe(map(response => response.data));
  }

  bulkUserAction(action: any): Observable<BulkActionResult> {
    return this.http.post<ApiResponse<BulkActionResult>>(`${this.apiUrl}/users/bulk-action`, action)
      .pipe(map(response => response.data));
  }

  // Booking Management
  getBookings(filters: any = {}): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/bookings`, { params });
  }

  handleBookingAction(bookingId: string, action: any): Observable<AdminBooking> {
    return this.http.put<ApiResponse<AdminBooking>>(`${this.apiUrl}/bookings/${bookingId}/action`, action)
      .pipe(map(response => response.data));
  }

  // Vehicle Management
  getVehicles(filters: any = {}): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/vehicles`, { params });
  }

  updateVehicleStatus(vehicleId: string, status: string): Observable<AdminVehicle> {
    return this.http.put<ApiResponse<AdminVehicle>>(`${this.apiUrl}/vehicles/${vehicleId}/status`, { status })
      .pipe(map(response => response.data));
  }

  updateVehicle(vehicleId: string, vehicleData: Partial<AdminVehicle>): Observable<AdminVehicle> {
    return this.http.put<ApiResponse<AdminVehicle>>(`${this.apiUrl}/vehicles/${vehicleId}`, vehicleData)
      .pipe(map(response => response.data));
  }

  deleteVehicle(vehicleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicles/${vehicleId}`);
  }

  // System Settings
  getSystemSettings(): Observable<SystemSettings[]> {
    return this.http.get<ApiResponse<SystemSettings[]>>(`${this.apiUrl}/settings`)
      .pipe(map(response => response.data));
  }

  updateSystemSetting(setting: SystemSettings): Observable<SystemSettings> {
    return this.http.put<ApiResponse<SystemSettings>>(`${this.apiUrl}/settings`, setting)
      .pipe(map(response => response.data));
  }

  // Reports
  generateReport(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/generate`, { params })
      .pipe(map(response => response.data));
  }
}