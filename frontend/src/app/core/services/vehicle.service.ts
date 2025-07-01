import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Vehicle, 
  CreateVehicleDto, 
  UpdateVehicleDto, 
  VehicleSearchFilters, 
  VehicleApiResponse,
  FileUploadResult 
} from '../models/vehicle.models';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly apiUrl = `${environment.apiUrl}/vehicles`;

  constructor(private http: HttpClient) {}

  // Get all vehicles with filters
  getVehicles(filters: VehicleSearchFilters = {}): Observable<VehicleApiResponse> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof VehicleSearchFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<VehicleApiResponse>(this.apiUrl, { params });
  }

  // Get vehicle by ID
  getVehicle(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  // Create vehicle with Cloudinary image upload
  createVehicle(vehicleData: CreateVehicleDto): Observable<Vehicle> {
    const formData = new FormData();
    
    // Add vehicle data
    Object.keys(vehicleData).forEach(key => {
      const value = vehicleData[key as keyof CreateVehicleDto];
      if (key === 'images' && Array.isArray(value)) {
        // Handle image files for Cloudinary upload - Fixed type checking
        value.forEach((item: any) => {
          if (item instanceof File) {
            formData.append('images', item);
          }
        });
      } else if (key === 'features' && Array.isArray(value)) {
        // Handle features array
        formData.append('features', JSON.stringify(value));
      } else if (value !== undefined && value !== null && key !== 'images') {
        formData.append(key, value.toString());
      }
    });

    return this.http.post<Vehicle>(this.apiUrl, formData);
  }

  // Update vehicle with Cloudinary image handling
  updateVehicle(id: string, vehicleData: UpdateVehicleDto): Observable<Vehicle> {
    const formData = new FormData();
    
    // Fix the file handling
    Object.keys(vehicleData).forEach(key => {
      const value = vehicleData[key as keyof UpdateVehicleDto];
      if (key === 'images' && Array.isArray(value)) {
        // Handle new image files
        value.forEach((item: any) => {
          if (item instanceof File) {
            formData.append('images', item);
          }
        });
      } else if (key === 'newImages' && Array.isArray(value)) {
        (value as File[]).forEach((file: File) => {
          formData.append('newImages', file);
        });
      } else if (value !== undefined && value !== null && key !== 'images' && key !== 'newImages') {
        formData.append(key, String(value));
      }
    });

    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}`, formData);
  }

  // Delete vehicle
  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Update vehicle status
  updateVehicleStatus(id: string, status: string): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}/availability`, { status });
  }

  // Remove specific vehicle image from Cloudinary
  removeVehicleImage(id: string, imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/images`, {
      body: { imageUrl }
    });
  }

  // Upload single image to Cloudinary
  uploadImage(file: File, folder: string = 'vehicles'): Observable<FileUploadResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    return this.http.post<FileUploadResult>(`${this.apiUrl}/upload-image`, formData);
  }

  // Upload multiple images to Cloudinary
  uploadImages(files: File[], folder: string = 'vehicles'): Observable<FileUploadResult[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    formData.append('folder', folder);
    return this.http.post<FileUploadResult[]>(`${this.apiUrl}/upload-images`, formData);
  }

  // Get vehicle availability calendar
  getVehicleAvailability(id: string, year: number, month: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/availability/${year}/${month}`);
  }

  // Export vehicles
  exportVehicles(format: 'csv' | 'json' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, {
      responseType: 'blob'
    });
  }

  // Bulk import vehicles
  bulkImportVehicles(file: File, options: any = {}): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });
    return this.http.post(`${this.apiUrl}/bulk-import`, formData);
  }

  // Search vehicles with advanced filters
  searchVehicles(searchTerm: string, filters: VehicleSearchFilters = {}): Observable<VehicleApiResponse> {
    const searchFilters = { ...filters, search: searchTerm };
    return this.getVehicles(searchFilters);
  }

  // Get featured vehicles
  getFeaturedVehicles(limit: number = 6): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/featured?limit=${limit}`);
  }

  // Get popular vehicles
  getPopularVehicles(limit: number = 6): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/popular?limit=${limit}`);
  }

  // Get vehicle statistics
  getVehicleStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  // Bulk operations
  bulkUpdateVehicles(vehicleIds: string[], updates: Partial<Vehicle>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/bulk-update`, {
      vehicleIds,
      updates
    });
  }

  bulkDeleteVehicles(vehicleIds: string[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bulk-delete`, {
      body: { vehicleIds }
    });
  }

  // Vehicle maintenance
  scheduleMaintenanceLog(vehicleId: string, maintenanceData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${vehicleId}/maintenance`, maintenanceData);
  }

  getMaintenanceHistory(vehicleId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${vehicleId}/maintenance`);
  }
}