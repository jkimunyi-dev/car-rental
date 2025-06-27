import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IDarajaService,
  IPaymentRequest,
  IPaymentResponse,
  IPaymentStatusResponse,
  IRefundResponse,
} from './payment.interface';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class DarajaService implements IDarajaService {
  private readonly logger = new Logger(DarajaService.name);
  private accessToken: string;
  private tokenExpiry: Date;

  constructor(private configService: ConfigService) {}

  async processPayment(
    paymentData: IPaymentRequest,
  ): Promise<IPaymentResponse> {
    return this.stkPushInternal(
      paymentData.phoneNumber!,
      paymentData.amount,
      paymentData.accountReference,
      paymentData.transactionDesc,
    );
  }

  async queryPaymentStatus(
    transactionId: string,
  ): Promise<IPaymentStatusResponse> {
    const result = await this.queryTransaction(transactionId);

    return {
      transactionId,
      status:
        result.ResultCode === 0
          ? PaymentStatus.COMPLETED
          : PaymentStatus.FAILED,
      amount:
        result.CallbackMetadata?.Item?.find(
          (item: any) => item.Name === 'Amount',
        )?.Value || 0,
      receiptNumber: result.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'MpesaReceiptNumber',
      )?.Value,
      transactionDate: result.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'TransactionDate',
      )?.Value
        ? new Date(
            result.CallbackMetadata.Item.find(
              (item: any) => item.Name === 'TransactionDate',
            ).Value,
          )
        : undefined,
      phoneNumber: result.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'PhoneNumber',
      )?.Value,
    };
  }

  async processRefund(
    _paymentId: string,
    _amount?: number,
  ): Promise<IRefundResponse> {
    // M-Pesa refunds require manual processing or specific reversal API
    this.logger.warn('M-Pesa refund requested but requires manual processing');
    throw new BadRequestException(
      'M-Pesa refunds require manual processing through Safaricom',
    );
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const consumerKey = this.configService.get('DARAJA_CONSUMER_KEY');
    const consumerSecret = this.configService.get('DARAJA_CONSUMER_SECRET');
    const environment = this.configService.get('DARAJA_ENVIRONMENT');

    const baseUrl =
      environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      'base64',
    );

    try {
      const response = await axios.get(
        `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Daraja access token', error);
      throw new BadRequestException('Failed to authenticate with Daraja API');
    }
  }

  async stkPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ): Promise<any> {
    return this.stkPushInternal(
      phoneNumber,
      amount,
      accountReference,
      transactionDesc,
    );
  }

  private async stkPushInternal(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ): Promise<IPaymentResponse> {
    const accessToken = await this.getAccessToken();
    const environment = this.configService.get('DARAJA_ENVIRONMENT');
    const shortCode = this.configService.get('DARAJA_SHORTCODE');
    const passkey = this.configService.get('DARAJA_PASSKEY');
    const callbackUrl = this.configService.get('DARAJA_CALLBACK_URL');

    const baseUrl =
      environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, -3);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString(
      'base64',
    );

    // Format phone number (remove + and ensure it starts with 254)
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const finalPhone = formattedPhone.startsWith('254')
      ? formattedPhone
      : `254${formattedPhone.substring(1)}`;

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: finalPhone,
      PartyB: shortCode,
      PhoneNumber: finalPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    try {
      const response = await axios.post(
        `${baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log('STK Push initiated successfully', response.data);

      return {
        success: response.data.ResponseCode === '0',
        checkoutRequestId: response.data.CheckoutRequestID,
        message:
          response.data.ResponseDescription || response.data.CustomerMessage,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        'STK Push failed',
        error.response?.data || error.message,
      );

      return {
        success: false,
        message: 'Failed to initiate M-Pesa payment',
        data: error.response?.data,
      };
    }
  }

  async queryTransaction(checkoutRequestId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const environment = this.configService.get('DARAJA_ENVIRONMENT');
    const shortCode = this.configService.get('DARAJA_SHORTCODE');
    const passkey = this.configService.get('DARAJA_PASSKEY');

    const baseUrl =
      environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, -3);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString(
      'base64',
    );

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    try {
      const response = await axios.post(
        `${baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        'Transaction query failed',
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to query transaction status');
    }
  }
}
