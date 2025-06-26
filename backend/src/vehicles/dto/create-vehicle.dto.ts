import {
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';
import { VehicleCategory, TransmissionType, FuelType } from '@prisma/client';
import { PaginationDto } from '../../common/dto/api-response.dto';

export class CreateVehicleDto {
  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @IsEnum(TransmissionType)
  transmission: TransmissionType;

  @IsEnum(FuelType)
  fuelType: FuelType;

  @IsInt()
  @Min(1)
  @Max(12)
  seats: number;

  @IsInt()
  @Min(2)
  @Max(6)
  doors: number;

  @IsString()
  color: string;

  @IsString()
  licensePlate: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

// src/vehicles/dto/vehicle-search.dto.ts
export class VehicleSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsInt()
  @Min(1)
  minSeats?: number;
}
