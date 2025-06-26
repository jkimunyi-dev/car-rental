import { VehicleCategory, TransmissionType, FuelType, VehicleStatus } from '@prisma/client';

export class VehicleResponseDto {
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
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  createdAt: Date;
  updatedAt: Date;
}
