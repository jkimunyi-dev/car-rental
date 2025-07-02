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
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  VehicleCategory,
  TransmissionType,
  FuelType,
  VehicleStatus
} from '@prisma/client';
import { PaginationDto } from '../../common/dto/api-response.dto';
import { Transform } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  make: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty({ minimum: 1900, maximum: new Date().getFullYear() + 1 })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ enum: VehicleCategory })
  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @ApiProperty({ enum: TransmissionType })
  @IsEnum(TransmissionType)
  transmission: TransmissionType;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuelType: FuelType;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(12)
  seats: number;

  @ApiProperty({ minimum: 2, maximum: 6 })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(2)
  @Max(6)
  doors: number;

  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsString()
  licensePlate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({ minimum: 0 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    type: [String],
    description: 'Can be an array of strings or a JSON string for multipart form data'
  })
  @IsOptional()
  features?: string[] | string; // Allow both string and string array
}

export class VehicleSearchDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: VehicleCategory })
  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: TransmissionType })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minSeats?: number;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
