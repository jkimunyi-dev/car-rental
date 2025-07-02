import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class AdditionalDriverDto {
  @ApiProperty({ description: 'Additional driver first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Additional driver last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Additional driver license number' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({ description: 'Additional driver age' })
  @IsInt()
  @Min(18)
  @Max(100)
  age: number;
}

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
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({
    description: 'End time for hourly bookings',
    required: false,
    example: '17:00',
  })
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
    description: 'Phone number (Kenyan format: 07xxxxxxxx or 01xxxxxxxxxx)',
    example: '0712345678'
  })
  @IsString()
  @Matches(/^(07\d{8}|01\d{10})$/, {
    message: 'Phone number must be in format 07xxxxxxxx or 01xxxxxxxxxx'
  })
  phoneNumber: string;

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

  @ApiProperty({
    description: 'Special requests for the booking',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({
    description: 'Insurance level',
    required: false,
    enum: ['BASIC', 'COMPREHENSIVE', 'PREMIUM'],
  })
  @IsOptional()
  @IsEnum(['BASIC', 'COMPREHENSIVE', 'PREMIUM'])
  insuranceLevel?: string;

  @ApiProperty({
    description: 'Additional drivers',
    required: false,
    type: [AdditionalDriverDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalDriverDto)
  additionalDrivers?: AdditionalDriverDto[];

  @ApiProperty({
    description: 'Driver age for insurance purposes',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  driverAge?: number;
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

  @ApiProperty({ 
    description: 'Phone number (Kenyan format)',
    required: false,
    example: '0712345678'
  })
  @IsOptional()
  @IsString()
  @Matches(/^(07\d{8}|01\d{10})$/, {
    message: 'Phone number must be in format 07xxxxxxxx or 01xxxxxxxxxx'
  })
  phoneNumber?: string;

  @ApiProperty({ description: 'Special notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Special requests', required: false })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({
    description: 'Insurance level',
    required: false,
    enum: ['BASIC', 'COMPREHENSIVE', 'PREMIUM'],
  })
  @IsOptional()
  @IsEnum(['BASIC', 'COMPREHENSIVE', 'PREMIUM'])
  insuranceLevel?: string;

  @ApiProperty({
    description: 'Additional drivers',
    required: false,
    type: [AdditionalDriverDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalDriverDto)
  additionalDrivers?: AdditionalDriverDto[];
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

export class PricingBreakdownDto {
  @ApiProperty({ description: 'Base price before taxes and fees' })
  basePrice: number;

  @ApiProperty({ description: 'Total number of days' })
  totalDays: number;

  @ApiProperty({ description: 'Total number of hours', required: false })
  totalHours?: number;

  @ApiProperty({ description: 'Subtotal amount' })
  subtotal: number;

  @ApiProperty({ description: 'Tax amount' })
  taxes: number;

  @ApiProperty({ description: 'Service fees' })
  fees: number;

  @ApiProperty({ description: 'Insurance fee', required: false })
  insuranceFee?: number;

  @ApiProperty({ description: 'Discount amount' })
  discount: number;

  @ApiProperty({ description: 'Coupon discount', required: false })
  couponDiscount?: number;

  @ApiProperty({ description: 'Final total amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Price per day' })
  pricePerDay: number;

  @ApiProperty({ description: 'Price per hour', required: false })
  pricePerHour?: number;

  @ApiProperty({ description: 'Pricing breakdown details', required: false })
  breakdown?: {
    vehicleRental: number;
    insurance: number;
    taxes: number;
    serviceFees: number;
    discounts: number;
    finalTotal: number;
  };
}
