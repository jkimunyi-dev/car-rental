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

  // Admin functions
  getUsers(filters: UserFilters = {}): Observable<UserApiResponse> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof UserFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<UserApiResponse>(this.adminUrl, { params });
  }

  createUser(userData: CreateUserDto): Observable<{ data: AdminUser }> {
    const formData = new FormData();
    
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof CreateUserDto];
      if (key === 'avatar' && value instanceof File) {
        formData.append('avatar', value);
      } else if (value !== undefined && value !== null && key !== 'avatar') {
        formData.append(key, value.toString());
      }
    });

    return this.http.post<{ data: AdminUser }>(this.adminUrl, formData);
  }

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

    return this.http.patch<{ data: AdminUser }>(`${this.adminUrl}/${id}`, formData);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.adminUrl}/${id}`);
  }

  updateUserStatus(id: string, isActive: boolean): Observable<{ data: AdminUser }> {
    const endpoint = isActive ? 'activate' : 'deactivate';
    return this.http.patch<{ data: AdminUser }>(`${this.adminUrl}/${id}/${endpoint}`, {});
  }

  updateUserRole(id: string, role: string): Observable<{ data: AdminUser }> {
    return this.http.patch<{ data: AdminUser }>(`${this.adminUrl}/${id}/role`, { role });
  }

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