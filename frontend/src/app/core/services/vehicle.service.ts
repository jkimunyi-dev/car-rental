import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  Vehicle, 
  VehicleWithStats,
  CreateVehicleDto, 
  UpdateVehicleDto, 
  VehicleSearchFilters, 
  VehicleApiResponse,
  VehicleListResponse,
  VehicleListApiResponse, // Add this import
  VehicleAvailability,
  FileUploadResult,
  BulkVehicleAction,
  BulkActionResult,
  BulkImportOptions,
  BulkImportResult
} from '../models/vehicle.models';
import { ApiResponse, PaginatedResponse } from '../models/api-response.models';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly apiUrl = `${environment.apiUrl}/vehicles`;

  constructor(private http: HttpClient) {}

  // Get all vehicles with filters (Public endpoint) - FIXED
  getVehicles(filters: VehicleSearchFilters = {}): Observable<VehicleListResponse> {
    let params = new HttpParams();
    
    // Only add parameters that have values
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof VehicleSearchFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    console.log('API Request params:', params.toString()); // Debug log
    
    return this.http.get<VehicleListApiResponse>(this.apiUrl, { params })
      .pipe(
        map(response => ({
          data: response.data.data,
          meta: {
            total: response.data.total,
            page: response.data.page,
            limit: response.data.limit,
            totalPages: response.data.totalPages
          }
        }))
      );
  }

  // Advanced search (Public endpoint)
  searchVehicles(filters: VehicleSearchFilters = {}): Observable<VehicleListResponse> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof VehicleSearchFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<VehicleListResponse>(`${this.apiUrl}/search`, { params });
  }

  // Get vehicle by ID (Public endpoint)
  getVehicle(id: string): Observable<VehicleWithStats> {
    return this.http.get<VehicleWithStats>(`${this.apiUrl}/${id}`);
  }

  // Get vehicle availability calendar (Public endpoint)
  getVehicleAvailability(id: string, year: number, month: number): Observable<VehicleAvailability> {
    return this.http.get<VehicleAvailability>(`${this.apiUrl}/${id}/availability/${year}/${month}`);
  }

  // Create vehicle (Admin only) - FIXED to return proper type
  createVehicle(vehicleData: CreateVehicleDto): Observable<VehicleWithStats> {
    // Always use JSON for vehicle creation without images
    const cleanData = { ...vehicleData };
    
    // Ensure features is always an array with proper type handling
    if (!cleanData.features) {
      cleanData.features = [];
    } else if (typeof cleanData.features === 'string') {
      cleanData.features = (cleanData.features as string).split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
    }
    
    // Remove images array if it's empty
    if (!cleanData.images || cleanData.images.length === 0) {
      delete cleanData.images;
    }
    
    // If we have images, use FormData
    if (cleanData.images && cleanData.images.length > 0) {
      const formData = new FormData();
      
      // Add all vehicle data except images
      Object.keys(cleanData).forEach(key => {
        const value = cleanData[key as keyof CreateVehicleDto];
        if (key === 'images' && Array.isArray(value)) {
          // Handle image files
          value.forEach((file: any) => {
            if (file instanceof File) {
              formData.append('images', file);
            }
          });
        } else if (key === 'features' && Array.isArray(value)) {
          // Handle features array - send as JSON string
          formData.append('features', JSON.stringify(value));
        } else if (value !== undefined && value !== null && key !== 'images') {
          formData.append(key, value.toString());
        }
      });

      return this.http.post<ApiResponse<VehicleWithStats>>(this.apiUrl, formData)
        .pipe(map(response => response.data));
    } else {
      // Use JSON for data without files
      return this.http.post<ApiResponse<VehicleWithStats>>(this.apiUrl, cleanData, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).pipe(map(response => response.data));
    }
  }

  // Update vehicle (Admin/Agent) - FIXED
  updateVehicle(id: string, vehicleData: UpdateVehicleDto): Observable<Vehicle> {
    // Check if we have files to upload
    const hasFiles = (vehicleData.images && vehicleData.images.length > 0) || 
                     (vehicleData.newImages && vehicleData.newImages.length > 0);
    
    if (hasFiles) {
      // Use FormData for file uploads
      const formData = new FormData();
      
      Object.keys(vehicleData).forEach(key => {
        const value = vehicleData[key as keyof UpdateVehicleDto];
        
        if (key === 'images' && Array.isArray(value)) {
          // Handle image files
          value.forEach((item: any) => {
            if (item instanceof File) {
              formData.append('images', item);
            }
          });
        } else if (key === 'newImages' && Array.isArray(value)) {
          // Handle new images
          value.forEach((item: any) => {
            if (item instanceof File) {
              formData.append('images', item);
            }
          });
        } else if (key === 'features' && Array.isArray(value)) {
          // Handle features array
          formData.append('features', JSON.stringify(value));
        } else if (key === 'removeImages' && Array.isArray(value)) {
          // Handle image URLs to remove
          formData.append('removeImages', JSON.stringify(value));
        } else if (value !== undefined && value !== null && 
                   key !== 'images' && key !== 'newImages' && key !== 'removeImages') {
          formData.append(key, String(value));
        }
      });

      return this.http.patch<Vehicle>(`${this.apiUrl}/${id}`, formData);
    } else {
      // Use JSON for data without files
      const cleanData = { ...vehicleData };
      delete cleanData.images;
      delete cleanData.newImages;
      delete cleanData.removeImages;
      
      return this.http.patch<Vehicle>(`${this.apiUrl}/${id}`, cleanData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Update vehicle availability (Admin/Agent)
  updateVehicleAvailability(id: string, status: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/availability`, { status });
  }

  // Remove vehicle image (Admin/Agent)
  removeVehicleImage(id: string, imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/images`, {
      body: { imageUrl }
    });
  }

  // Delete vehicle (Admin only)
  deleteVehicle(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Export vehicles (Admin/Agent)
  exportVehicles(format: 'csv' | 'json' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, {
      responseType: 'blob'
    });
  }

  // Bulk import vehicles (Admin only)
  bulkImportVehicles(file: File, options: BulkImportOptions = {}): Observable<BulkImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(options).forEach(key => {
      const value = options[key as keyof BulkImportOptions];
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });
    return this.http.post<BulkImportResult>(`${this.apiUrl}/bulk-import`, formData);
  }

  // Bulk operations (Helper methods for admin operations)
  bulkUpdateVehicles(vehicleIds: string[], updates: Partial<Vehicle>): Observable<BulkActionResult> {
    return this.http.patch<BulkActionResult>(`${this.apiUrl}/bulk-update`, {
      vehicleIds,
      updates
    });
  }

  bulkDeleteVehicles(vehicleIds: string[]): Observable<BulkActionResult> {
    return this.http.delete<BulkActionResult>(`${this.apiUrl}/bulk-delete`, {
      body: { vehicleIds }
    });
  }

  // Get featured vehicles (Public - if implemented on backend)
  getFeaturedVehicles(limit: number = 6): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/featured?limit=${limit}`);
  }

  // Get popular vehicles (Public - if implemented on backend)  
  getPopularVehicles(limit: number = 6): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/popular?limit=${limit}`);
  }

  // Get vehicle statistics (Admin - if implemented on backend)
  getVehicleStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  // Helper method to build query parameters
  private buildParams(filters: any): HttpParams {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return params;
  }
}