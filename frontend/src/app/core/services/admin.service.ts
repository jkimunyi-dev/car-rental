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
} from '../models/admin.models';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // Analytics
  getAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Observable<AdminAnalytics> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ApiResponse<AdminAnalytics>>(`${this.apiUrl}/analytics`, { params })
      .pipe(map(response => response.data));
  }

  // User Management - Full CRUD
  getUsers(filters: any = {}): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/users`, { params });
  }

  createUser(userData: any): Observable<AdminUser> {
    const formData = new FormData();

    Object.keys(userData).forEach(key => {
      const value = userData[key];
      // Fix: Add proper type checking for File
      if (key === 'avatar' && value && typeof value === 'object' && value instanceof File) {
        formData.append('avatar', value);
      } else if (value !== undefined && value !== null && key !== 'avatar') {
        formData.append(key, value.toString());
      }
    });

    return this.http.post<ApiResponse<AdminUser>>(`${this.apiUrl}/users`, formData)
      .pipe(map(response => response.data));
  }

  getUserById(userId: string): Observable<AdminUser> {
    return this.http.get<ApiResponse<AdminUser>>(`${this.apiUrl}/users/${userId}`)
      .pipe(map(response => response.data));
  }

  updateUser(userId: string, userData: Partial<AdminUser>): Observable<AdminUser> {
    const formData = new FormData();
    
    // Fix: Proper type checking with type guards
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof AdminUser];
      if (key === 'avatar' && this.isFile(value)) {
        formData.append('avatar', value);
      } else if (key === 'newAvatar' && this.isFile(value)) {
        formData.append('avatar', value);
      } else if (value !== undefined && value !== null && key !== 'avatar' && key !== 'newAvatar') {
        formData.append(key, String(value));
      }
    });
    
    return this.http.put<ApiResponse<AdminUser>>(`${this.apiUrl}/users/${userId}`, formData)
      .pipe(map(response => response.data));
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
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

  // Booking Management - Full CRUD
  getBookings(filters: any = {}): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/bookings`, { params });
  }

  getBookingById(bookingId: string): Observable<AdminBooking> {
    return this.http.get<ApiResponse<AdminBooking>>(`${this.apiUrl}/bookings/${bookingId}`)
      .pipe(map(response => response.data));
  }

  updateBooking(bookingId: string, bookingData: Partial<AdminBooking>): Observable<AdminBooking> {
    return this.http.put<ApiResponse<AdminBooking>>(`${this.apiUrl}/bookings/${bookingId}`, bookingData)
      .pipe(map(response => response.data));
  }

  deleteBooking(bookingId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bookings/${bookingId}`);
  }

  handleBookingAction(bookingId: string, action: any): Observable<AdminBooking> {
    return this.http.put<ApiResponse<AdminBooking>>(`${this.apiUrl}/bookings/${bookingId}/action`, action)
      .pipe(map(response => response.data));
  }

  // Add bulk booking action method
  handleBulkBookingAction(bookingIds: string[], actionData: any): Observable<BulkActionResult> {
    const requestData = {
      bookingIds,
      ...actionData
    };
    return this.http.post<ApiResponse<BulkActionResult>>(`${this.apiUrl}/bookings/bulk-action`, requestData)
      .pipe(map(response => response.data));
  }

  // Vehicle Management - Full CRUD with Cloudinary Integration
  getVehicles(filters: any = {}): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/vehicles`, { params });
  }

  getVehicleById(vehicleId: string): Observable<AdminVehicle> {
    return this.http.get<ApiResponse<AdminVehicle>>(`${this.apiUrl}/vehicles/${vehicleId}`)
      .pipe(map(response => response.data));
  }

  createVehicle(vehicleData: any): Observable<AdminVehicle> {
    const formData = new FormData();
    
    Object.keys(vehicleData).forEach(key => {
      const value = vehicleData[key];
      if (key === 'images' && Array.isArray(value)) {
        // Handle image files for Cloudinary upload
        value.forEach((file: unknown) => {
          if (this.isFile(file)) {
            formData.append('images', file);
          }
        });
      } else if (key === 'features' && Array.isArray(value)) {
        // Handle features array
        formData.append('features', JSON.stringify(value));
      } else if (value !== undefined && value !== null && key !== 'images') {
        formData.append(key, value.toString());
      }
    });
    
    return this.http.post<ApiResponse<AdminVehicle>>(`${this.apiUrl}/vehicles`, formData)
      .pipe(map(response => response.data));
  }

  updateVehicle(vehicleId: string, vehicleData: any): Observable<AdminVehicle> {
    const formData = new FormData();

    Object.keys(vehicleData).forEach(key => {
      const value = vehicleData[key];
      
      if (key === 'images' && Array.isArray(value)) {
        // Check if it's an array of Files
        value.forEach((item: unknown) => {
          if (this.isFile(item)) {
            formData.append('images', item);
          }
        });
      } else if (key === 'newImages' && Array.isArray(value)) {
        // Check if it's an array of Files
        value.forEach((item: unknown) => {
          if (this.isFile(item)) {
            formData.append('newImages', item);
          }
        });
      } else if (value !== undefined && value !== null && key !== 'images' && key !== 'newImages') {
        formData.append(key, String(value));
      }
    });
    
    return this.http.put<ApiResponse<AdminVehicle>>(`${this.apiUrl}/vehicles/${vehicleId}`, formData)
      .pipe(map(response => response.data));
  }

  deleteVehicle(vehicleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicles/${vehicleId}`);
  }

  updateVehicleStatus(vehicleId: string, status: string): Observable<AdminVehicle> {
    return this.http.put<ApiResponse<AdminVehicle>>(`${this.apiUrl}/vehicles/${vehicleId}/status`, { status })
      .pipe(map(response => response.data));
  }

  removeVehicleImage(vehicleId: string, imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicles/${vehicleId}/images`, {
      body: { imageUrl }
    });
  }

  // Bulk vehicle operations
  bulkVehicleAction(action: any): Observable<BulkActionResult> {
    return this.http.post<ApiResponse<BulkActionResult>>(`${this.apiUrl}/vehicles/bulk-action`, action)
      .pipe(map(response => response.data));
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

  // Reports and Analytics
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

  getDashboardStats(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/stats`)
      .pipe(map(response => response.data));
  }

  // Export data
  exportUsers(format: 'csv' | 'xlsx' | 'json' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/users/export?format=${format}`, {
      responseType: 'blob'
    });
  }

  exportBookings(format: 'csv' | 'xlsx' | 'json' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/bookings/export?format=${format}`, {
      responseType: 'blob'
    });
  }

  exportVehicles(format: 'csv' | 'xlsx' | 'json' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/vehicles/export?format=${format}`, {
      responseType: 'blob'
    });
  }

  // File upload utilities
  uploadFile(file: File, folder: string = 'uploads'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  deleteFile(fileUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/files`, {
      body: { fileUrl }
    });
  }

  // Search functionality
  globalSearch(query: string, filters: any = {}): Observable<any> {
    let params = new HttpParams().set('q', query);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/search`, { params });
  }

  // Notification management
  getNotifications(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/notifications`)
      .pipe(map(response => response.data));
  }

  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  // Activity logs
  getActivityLogs(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/activity-logs`, { params });
  }

  // Private helper method for type checking
  private isFile(value: any): value is File {
    return value instanceof File;
  }
}