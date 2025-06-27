import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class QueryPaymentDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
