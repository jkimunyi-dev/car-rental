import {
  Payment as PrismaPayment,
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus,
  Role,
  Prisma,
} from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { DarajaCallbackDto } from './dto/daraja-payment.dto';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

// Use Prisma types
export type Payment = PrismaPayment;
export type PaymentMethod = PrismaPaymentMethod;

export type CreatePaymentData = Omit<Prisma.PaymentCreateInput, 'booking'> & {
  bookingId: string;
};

export type CreatePaymentMethodData = Omit<
  Prisma.PaymentMethodCreateInput,
  'user'
> & {
  userId: string;
};

// Use Prisma's payload for relations
export type PaymentWithDetails = Prisma.PaymentGetPayload<{
  include: {
    booking: {
      include: {
        user: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
            phone: true;
            address: true;
            city: true;
            country: true;
          };
        };
        vehicle: {
          select: {
            id: true;
            make: true;
            model: true;
            year: true;
            licensePlate: true;
          };
        };
      };
    };
  };
}>;

// Keep interfaces that don't exist in Prisma (external APIs, business logic)
export interface IPaymentProvider {
  processPayment(paymentData: IPaymentRequest): Promise<IPaymentResponse>;
  queryPaymentStatus(transactionId: string): Promise<IPaymentStatusResponse>;
  processRefund(paymentId: string, amount?: number): Promise<IRefundResponse>;
}

export interface IPaymentRequest {
  amount: number;
  currency: string;
  phoneNumber?: string;
  accountReference: string;
  transactionDesc: string;
  paymentMethod: string;
}

export interface IPaymentResponse {
  success: boolean;
  transactionId?: string;
  checkoutRequestId?: string;
  message: string;
  data?: any;
}

export interface IPaymentStatusResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  receiptNumber?: string;
  transactionDate?: Date;
  phoneNumber?: string;
}

export interface IRefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  message: string;
}

export interface IPaymentCallbackData {
  transactionId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  receiptNumber?: string;
  transactionDate?: Date;
  phoneNumber?: string;
}

export interface IPaymentMethod {
  id: string;
  userId: string;
  type: string;
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentStats {
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalRevenue: number;
}

export interface IPaginatedPayments {
  payments: PaymentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IPaymentService {
  createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<any>;
  handleDarajaCallback(
    callbackData: DarajaCallbackDto,
  ): Promise<{ success: boolean; message: string }>;
  getPayments(
    userId: string,
    userRole: Role,
    query: QueryPaymentDto,
  ): Promise<IPaginatedPayments>;
  getPaymentById(
    paymentId: string,
    userId: string,
    userRole: Role,
  ): Promise<PaymentWithDetails>;
  processRefund(
    paymentId: string,
    refundAmount?: number,
  ): Promise<PaymentWithDetails>;
  generateInvoice(
    paymentId: string,
    userId: string,
    userRole: Role,
  ): Promise<Buffer>;
  createPaymentMethod(
    userId: string,
    createPaymentMethodDto: CreatePaymentMethodDto,
  ): Promise<IPaymentMethod>;
  getPaymentMethods(userId: string): Promise<IPaymentMethod[]>;
  deletePaymentMethod(
    paymentMethodId: string,
    userId: string,
  ): Promise<IPaymentMethod>;
  getPaymentStats(userId?: string): Promise<IPaymentStats>;
}

export interface IDarajaService extends IPaymentProvider {
  stkPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ): Promise<any>;
  queryTransaction(checkoutRequestId: string): Promise<any>;
}

export interface IInvoiceService {
  generateInvoice(paymentId: string): Promise<Buffer>;
}
