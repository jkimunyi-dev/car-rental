import { IsString, IsNumber } from 'class-validator';

export class DarajaPaymentDto {
  @IsString()
  phoneNumber: string;

  @IsNumber()
  amount: number;

  @IsString()
  accountReference: string;

  @IsString()
  transactionDesc: string;
}

export class DarajaCallbackDto {
  @IsString()
  MerchantRequestID: string;

  @IsString()
  CheckoutRequestID: string;

  @IsNumber()
  ResultCode: number;

  @IsString()
  ResultDesc: string;

  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value: any;
    }>;
  };
}
