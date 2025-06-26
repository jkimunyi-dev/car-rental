import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';

import { BookingStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Vehicle ID to book' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ description: 'Booking start date', example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Booking end date', example: '2024-01-18' })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Start time for hourly bookings',
    required: false,
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: 'End time for hourly bookings', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: 'Pickup location' })
  @IsString()
  pickupLocation: string;

  @ApiProperty({ description: 'Drop-off location', required: false })
  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @ApiProperty({
    description: 'Special notes for the booking',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Coupon code for discount', required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ description: 'Is this an hourly booking?', required: false })
  @IsOptional()
  @IsBoolean()
  isHourlyBooking?: boolean;
}

export class UpdateBookingDto {
  @ApiProperty({ description: 'Booking start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Booking end date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Start time', required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: 'End time', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: 'Pickup location', required: false })
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @ApiProperty({ description: 'Drop-off location', required: false })
  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @ApiProperty({ description: 'Special notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BookingStatusUpdateDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiProperty({ description: 'Reason for status change', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelBookingDto {
  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  cancellationReason: string;

  @ApiProperty({ description: 'Request full refund?', required: false })
  @IsOptional()
  @IsBoolean()
  requestRefund?: boolean;
}

// Enhanced booking response with pricing details
export class BookingResponseDto {
  id: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  totalHours?: number;
  pricePerDay: number;
  pricePerHour?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  totalAmount: number;
  status: BookingStatus;
  notes?: string;
  cancellationReason?: string;
  isModifiable: boolean;
  isCancellable: boolean;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    images: string[];
    category: string;
    location: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  coupon?: {
    code: string;
    discountValue: number;
    discountType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class PricingBreakdownDto {
  basePrice: number;
  totalDays: number;
  totalHours?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  couponDiscount?: number;
  totalAmount: number;
  pricePerDay: number;
  pricePerHour?: number;
}
