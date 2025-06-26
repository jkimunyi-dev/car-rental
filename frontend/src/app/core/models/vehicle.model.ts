
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
  pricePerDay: number;
  pricePerHour?: number;
  location: string;
  description?: string;
  features: string[];
  images: string[];
  isActive: boolean;
  averageRating?: number;
  reviewCount?: number;
}

export interface VehicleSearchRequest {
  location?: string;
  category?: VehicleCategory;
  startDate?: string;
  endDate?: string;
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