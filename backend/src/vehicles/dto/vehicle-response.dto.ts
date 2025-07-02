import {
  VehicleCategory,
  TransmissionType,
  FuelType,
  VehicleStatus,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  make: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  year: number;

  @ApiProperty({ enum: VehicleCategory })
  category: VehicleCategory;

  @ApiProperty({ enum: TransmissionType })
  transmission: TransmissionType;

  @ApiProperty({ enum: FuelType })
  fuelType: FuelType;

  @ApiProperty()
  seats: number;

  @ApiProperty()
  doors: number;

  @ApiProperty()
  color: string;

  @ApiProperty()
  licensePlate: string;

  @ApiProperty({ required: false })
  vin?: string;

  @ApiProperty()
  mileage: number;

  @ApiProperty({ enum: VehicleStatus })
  status: VehicleStatus;

  @ApiProperty()
  pricePerDay: number;

  @ApiProperty({ required: false })
  pricePerHour?: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  location: string;

  @ApiProperty({ type: [String] })
  features: string[];

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  totalBookings: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
