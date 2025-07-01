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
  averageRating?: number;
  totalReviews?: number;
  totalBookings?: number;
  createdAt: string;
  updatedAt: string;
}

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
  location: string;
  description?: string;
  features?: string[];
  images?: File[];
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {
  id: string;
  imagesToRemove?: string[];
  newImages?: File[];
}

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

export interface VehicleSearchFilters {
  search?: string;
  category?: VehicleCategory;
  status?: VehicleStatus;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  minSeats?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VehicleApiResponse {
  data: Vehicle[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// File upload interfaces
export interface FileUploadResult {
  url: string;
  publicId: string;
  fileName: string;
  size: number;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}