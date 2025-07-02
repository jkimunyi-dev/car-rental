import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  User, 
  AdminUser, 
  CreateUserDto, 
  UpdateUserDto, 
  UserFilters, 
  UserApiResponse 
} from '../models/user.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly adminUrl = `${environment.apiUrl}/admin/users`;

  constructor(private http: HttpClient) {}

  // Get current user profile
  getProfile(): Observable<{ data: User }> {
    return this.http.get<{ data: User }>(`${this.apiUrl}/profile`);
  }

  // Update user profile
  updateProfile(userData: Partial<UpdateUserDto>): Observable<{ data: User }> {
    const formData = new FormData();
    
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof UpdateUserDto];
      if (key === 'newAvatar' && value instanceof File) {
        formData.append('avatar', value);
      } else if (value !== undefined && value !== null && key !== 'newAvatar') {
        formData.append(key, value.toString());
      }
    });

    return this.http.patch<{ data: User }>(`${this.apiUrl}/profile`, formData);
  }

  // Upload avatar
  uploadAvatar(file: File): Observable<{ data: { avatarUrl: string } }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<{ data: { avatarUrl: string } }>(`${this.apiUrl}/profile/avatar`, formData);
  }

  // Change password
  changePassword(passwords: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/change-password`, passwords);
  }

  // Admin functions - Fix the return type and parameter handling
  getUsers(filters: UserFilters = {}): Observable<UserApiResponse> {
    let params = new HttpParams();
    
    // Handle null values properly
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof UserFilters];
      if (value !== undefined && value !== null && value !== '') {
        // Convert boolean values to string
        if (typeof value === 'boolean') {
          params = params.set(key, value.toString());
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    
    return this.http.get<UserApiResponse>(this.adminUrl, { params });
  }

  // Create user - Use admin endpoint
  createUser(userData: CreateUserDto): Observable<{ data: AdminUser }> {
    const formData = new FormData();
    
    // Only include fields that exist in AdminCreateUserDto
    const allowedFields = [
      'email', 'password', 'firstName', 'lastName', 'phone', 'dateOfBirth',
      'licenseNumber', 'role', 'address', 'city', 'country', 'zipCode'
    ];
    
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof CreateUserDto];
      if (key === 'avatar' && value instanceof File) {
        formData.append('avatar', value);
      } else if (value !== undefined && value !== null && key !== 'avatar' && allowedFields.includes(key)) {
        formData.append(key, value.toString());
      }
    });

    return this.http.post<{ data: AdminUser }>(this.adminUrl, formData);
  }

  // Update user - Use users endpoint (not admin)
  updateUser(id: string, userData: UpdateUserDto): Observable<{ data: AdminUser }> {
    const formData = new FormData();
    
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof UpdateUserDto];
      if (key === 'newAvatar' && value instanceof File) {
        formData.append('avatar', value);
      } else if (value !== undefined && value !== null && key !== 'newAvatar') {
        formData.append(key, value.toString());
      }
    });

    // Use the users endpoint, not admin endpoint
    return this.http.patch<{ data: AdminUser }>(`${environment.apiUrl}/users/${id}`, formData);
  }

  // Delete user - Use users endpoint (not admin)
  deleteUser(id: string): Observable<{ message: string }> {
    // Use the users endpoint, not admin endpoint
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/users/${id}`);
  }

  // Update user status - Use admin endpoint
  updateUserStatus(id: string, isActive: boolean): Observable<{ data: AdminUser }> {
    return this.http.put<{ data: AdminUser }>(`${this.adminUrl}/${id}/status`, { isActive });
  }

  // Update user role - Use admin endpoint
  updateUserRole(id: string, role: string): Observable<{ data: AdminUser }> {
    return this.http.put<{ data: AdminUser }>(`${this.adminUrl}/${id}/role`, { role });
  }

  // Bulk user action - Use admin endpoint
  bulkUserAction(action: {
    userIds: string[];
    action: string;
    reason?: string;
  }): Observable<{
    data: {
      successful: string[];
      failed: Array<{ userId: string; error: string }>;
      total: number;
      successCount: number;
      failureCount: number;
    };
  }> {
    return this.http.post<any>(`${this.adminUrl}/bulk-action`, action);
  }

  exportUsers(format: 'csv' | 'json' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.adminUrl}/export?format=${format}`, {
      responseType: 'blob'
    });
  }
}