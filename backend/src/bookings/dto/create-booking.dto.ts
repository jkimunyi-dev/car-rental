import { IsString, IsDateString, IsOptional } from 'class-validator';
import { BookingStatus } from '@prisma/client';

// src/bookings/dto/create-booking.dto.ts
export class CreateBookingDto {
  @IsString()
  vehicleId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsString()
  pickupLocation: string;

  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

// src/bookings/dto/booking-response.dto.ts
export class BookingResponseDto {
  id: string;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  totalAmount: number;
  status: BookingStatus;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    images: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
