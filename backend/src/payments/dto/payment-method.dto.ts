import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  type: string;

  @IsString()
  last4: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsNumber()
  @IsOptional()
  expiryMonth?: number;

  @IsNumber()
  @IsOptional()
  expiryYear?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  stripePaymentMethodId?: string;
}
