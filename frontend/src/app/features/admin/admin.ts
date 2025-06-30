import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  AdminAnalytics, 
  AdminUser, 
  AdminBooking, 
  AdminVehicle,
  SystemSettings,
  BulkActionResult 
} from '../../core/models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class Admin {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  // Analytics
  getAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Observable<AdminAnalytics> {
    const params = new HttpParams().set('period', period);
    return this.http.get<AdminAnalytics>(`${this.apiUrl}/analytics`, { params });
  }

  // User Management
  getUsers(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/users`, { params });
  }

  updateUserRole(userId: string, role: string): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/users/${userId}/status`, { isActive });
  }

  bulkUserAction(action: any): Observable<BulkActionResult> {
    return this.http.post<BulkActionResult>(`${this.apiUrl}/users/bulk-action`, action);
  }

  // Booking Management
  getBookings(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/bookings`, { params });
  }

  handleBookingAction(bookingId: string, action: any): Observable<AdminBooking> {
    return this.http.put<AdminBooking>(`${this.apiUrl}/bookings/${bookingId}/action`, action);
  }

  // Vehicle Management
  getVehicles(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/vehicles`, { params });
  }

  updateVehicleStatus(vehicleId: string, status: string): Observable<AdminVehicle> {
    return this.http.put<AdminVehicle>(`${this.apiUrl}/vehicles/${vehicleId}/status`, { status });
  }

  updateVehicle(vehicleId: string, vehicleData: Partial<AdminVehicle>): Observable<AdminVehicle> {
    return this.http.put<AdminVehicle>(`${this.apiUrl}/vehicles/${vehicleId}`, vehicleData);
  }

  deleteVehicle(vehicleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicles/${vehicleId}`);
  }

  // System Settings
  getSystemSettings(): Observable<SystemSettings[]> {
    return this.http.get<SystemSettings[]>(`${this.apiUrl}/settings`);
  }

  updateSystemSetting(setting: SystemSettings): Observable<SystemSettings> {
    return this.http.put<SystemSettings>(`${this.apiUrl}/settings`, setting);
  }

  // Reports
  generateReport(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/reports/generate`, { params });
  }
}
