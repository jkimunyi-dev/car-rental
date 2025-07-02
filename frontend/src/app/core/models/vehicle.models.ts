import { PaginatedResponse } from "./api-response.models";

// Enums to match backend Prisma schema
export enum VehicleCategory {
  ECONOMY = 'ECONOMY',
  COMPACT = 'COMPACT',  
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  LUXURY = 'LUXURY',
  VAN = 'VAN',
  TRUCK = 'TRUCK'
}

export enum TransmissionType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  CVT = 'CVT'
}

export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID'
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE'
}

// Main Vehicle interface
export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  doors: number;
  color: string;
  licensePlate: string;
  vin?: string;
  mileage: number;
  status: VehicleStatus;
  pricePerDay: number;
  pricePerHour?: number;
  description?: string;
  location: string;
  features: string[];
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Extended vehicle with computed fields (from backend response)
export interface VehicleWithStats extends Vehicle {
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  reviews?: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  }>;
}

// Create Vehicle DTO
export interface CreateVehicleDto {
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  doors: number;
  color: string;
  licensePlate: string;
  vin?: string;
  pricePerDay: number;
  pricePerHour?: number;
  description?: string;
  location: string;
  features?: string[];
  images?: File[]; // For image uploads
}

// Update Vehicle DTO - Fix the type handling
export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {
  newImages?: File[]; // For adding new images
  removeImages?: string[]; // URLs of images to remove
  images?: File[]; // Alternative field for images
}

// Vehicle search filters
export interface VehicleSearchFilters {
  search?: string;
  location?: string;
  category?: VehicleCategory | ''; // Allow empty string for form binding
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  minSeats?: number;
  status?: VehicleStatus | ''; // Allow empty string for form binding
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Add a separate interface for clean API calls
export interface CleanVehicleSearchFilters {
  search?: string;
  location?: string;
  category?: VehicleCategory;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  minSeats?: number;
  status?: VehicleStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response interfaces
export interface VehicleApiResponse {
  success: boolean;
  message: string;
  data: {
    vehicles?: Vehicle[];
    vehicle?: Vehicle;
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    meta?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

// For paginated vehicle lists
export interface VehicleListResponse {
  data: VehicleWithStats[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Add the missing VehicleListApiResponse interface
export interface VehicleListApiResponse {
  success: boolean;
  message: string;
  data: PaginatedResponse<VehicleWithStats>;
  timestamp: string;
  path?: string;
}

// File upload result
export interface FileUploadResult {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

// Availability calendar
export interface VehicleAvailability {
  vehicleStatus: VehicleStatus;
  bookings: Array<{
    startDate: string;
    endDate: string;
    status: string;
  }>;
  year: number;
  month: number;
}

// Bulk operations
export interface BulkVehicleAction {
  vehicleIds: string[];
  action: 'activate' | 'deactivate' | 'maintenance' | 'available' | 'delete';
  reason?: string;
}

export interface BulkActionResult {
  successful: string[];
  failed: Array<{
    vehicleId: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

// Import/Export
export interface BulkImportOptions {
  overwriteExisting?: boolean;
  defaultLocation?: string;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: string[];
}