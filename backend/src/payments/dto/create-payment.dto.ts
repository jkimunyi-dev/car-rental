import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  bookingId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'KES';

  @IsEnum(['daraja', 'card', 'bank'])
  paymentMethod: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string; // For Daraja payments

  @IsString()
  @IsOptional()
  accountReference?: string;

  @IsString()
  @IsOptional()
  transactionDesc?: string;
}
