import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Role } from '@prisma/client';

import { 
  IPaymentService, 
  PaymentWithDetails, 
  IPaginatedPayments, 
  IPaymentMethod, 
  IPaymentStats 
} from './payment.interface';
import { DarajaService } from './daraja.service';
import { InvoiceService } from './invoice.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { DarajaCallbackDto } from './dto/daraja-payment.dto';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentsService implements IPaymentService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly isMockMode = process.env.NODE_ENV !== 'production' || process.env.PAYMENT_MODE === 'mock';

  constructor(
    private prisma: PrismaService,
    private darajaService: DarajaService,
    private invoiceService: InvoiceService,
  ) {}

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<any> {
    const {
      bookingId,
      amount,
      currency,
      paymentMethod,
      phoneNumber,
      accountReference,
      transactionDesc,
    } = createPaymentDto;

    // Verify booking exists and belongs to user
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });

    if (existingPayment) {
      throw new BadRequestException('Payment already exists for this booking');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount,
        currency: currency || 'KES',
        paymentMethod,
        status: PaymentStatus.PENDING,
      },
      include: {
        booking: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    // Process payment based on method and mode
    if (this.isMockMode) {
      // Mock payment - always successful
      await this.processMockPayment(payment.id);
      
      return {
        ...payment,
        status: PaymentStatus.COMPLETED,
        transactionId: `MOCK_TXN_${Date.now()}`,
        paidAt: new Date(),
        message: 'Payment completed successfully (Mock Mode)',
      };
    }

    // Real payment processing
    if (paymentMethod === 'daraja') {
      const result = await this.darajaService.stkPush(
        phoneNumber!,
        amount,
        accountReference || bookingId,
        transactionDesc || `Payment for booking ${bookingId}`,
      );

      if (result.success) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { transactionId: result.checkoutRequestId },
        });
      }

      return { ...payment, ...result };
    }

    return payment;
  }

  private async processMockPayment(paymentId: string): Promise<void> {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update payment to completed
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        transactionId: `MOCK_TXN_${Date.now()}`,
        paidAt: new Date(),
      },
    });

    // Update booking status
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (payment) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });
    }
  }

  async handleDarajaCallback(
    callbackData: DarajaCallbackDto,
  ): Promise<{ success: boolean; message: string }> {
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      callbackData;

    // Find payment by transaction ID
    const payment = await this.prisma.payment.findFirst({
      where: { transactionId: CheckoutRequestID },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (ResultCode === 0) {
      // Payment successful
      const receiptNumber = CallbackMetadata?.Item?.find(
        (item) => item.Name === 'MpesaReceiptNumber',
      )?.Value;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          receiptUrl: receiptNumber,
        },
      });

      // Update booking status
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });

      return { success: true, message: 'Payment completed successfully' };
    } else {
      // Payment failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      return { success: false, message: ResultDesc };
    }
  }

  async getPayments(
    userId: string,
    userRole: Role,
    query: QueryPaymentDto,
  ): Promise<IPaginatedPayments> {
    const {
      status,
      paymentMethod,
      startDate,
      endDate,
      page = '1',
      limit = '10',
    } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};

    // Users can only see their own payments, admins can see all
    if (userRole !== Role.ADMIN) {
      where.booking = { userId };
    }

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              user: true,
              vehicle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments: payments as PaymentWithDetails[],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async getPaymentById(
    paymentId: string,
    userId: string,
    userRole: Role,
  ): Promise<PaymentWithDetails> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Users can only see their own payments
    if (userRole !== Role.ADMIN && payment.booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return payment as PaymentWithDetails;
  }

  async processRefund(
    paymentId: string,
    refundAmount?: number,
  ): Promise<PaymentWithDetails> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    const refundAmountFinal = refundAmount || payment.amount;

    if (refundAmountFinal > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    // Update payment with refund details
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount: refundAmountFinal,
      },
      include: {
        booking: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    // Update booking status
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CANCELLED' },
    });

    return updatedPayment as PaymentWithDetails;
  }

  async generateInvoice(
    paymentId: string,
    userId: string,
    userRole: Role,
  ): Promise<Buffer> {
    const payment = await this.getPaymentById(paymentId, userId, userRole);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Invoice can only be generated for completed payments',
      );
    }

    return this.invoiceService.generateInvoice(paymentId);
  }

  // NEW METHOD: Send invoice via email (updated implementation)
  async sendInvoiceByEmail(
    paymentId: string,
    userId: string,
    userRole: Role,
  ): Promise<{ success: boolean; message: string }> {
    const payment = await this.getPaymentById(paymentId, userId, userRole);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Invoice can only be generated for completed payments',
      );
    }

    try {
      // Use the new method that generates and sends the invoice
      await this.invoiceService.generateAndSendInvoice(paymentId);
      
      return {
        success: true,
        message: `Invoice has been generated and sent to ${payment.booking.user.email}`,
      };
    } catch (error) {
      this.logger.error('Failed to send invoice by email', error);
      throw new BadRequestException('Failed to send invoice by email');
    }
  }

  // Payment Methods Management
  async createPaymentMethod(
    userId: string,
    createPaymentMethodDto: CreatePaymentMethodDto,
  ): Promise<IPaymentMethod> {
    const { isDefault, ...paymentMethodData } = createPaymentMethodDto;

    // If this is set as default, update other payment methods
    if (isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        ...paymentMethodData,
        userId,
        isDefault: isDefault || false,
      },
    });

    return paymentMethod as IPaymentMethod;
  }

  async getPaymentMethods(userId: string): Promise<IPaymentMethod[]> {
    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return paymentMethods as IPaymentMethod[];
  }

  async deletePaymentMethod(
    paymentMethodId: string,
    userId: string,
  ): Promise<IPaymentMethod> {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (paymentMethod.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const deletedPaymentMethod = await this.prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    return deletedPaymentMethod as IPaymentMethod;
  }

  async getPaymentStats(userId?: string): Promise<IPaymentStats> {
    const where = userId ? { booking: { userId } } : {};

    const [total, completed, pending, failed, revenueResult] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.COMPLETED } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.PENDING } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
      this.prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments: total,
      completedPayments: completed,
      pendingPayments: pending,
      failedPayments: failed,
      totalRevenue: revenueResult._sum.amount || 0,
    };
  }
}
