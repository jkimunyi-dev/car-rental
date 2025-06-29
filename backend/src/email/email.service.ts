import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  EmailJobData,
  BulkEmailData,
  EmailCampaign,
  EmailStats,
  IEmailService,
  EmailTemplate,
  EmailPriority,
  WelcomeEmailContext,
  EmailVerificationContext,
  PasswordResetContext,
  BookingConfirmationContext,
  BookingReminderContext,
  BookingCancellationContext,
  PaymentReceiptContext,
  PaymentFailedContext,
  MarketingContext,
  PromotionalOfferContext,
  ReviewRequestContext,
} from './email.interface';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // Direct email sending method (for immediate sending)
  async sendEmailDirect(emailData: EmailJobData): Promise<void> {
    try {
      const { to, template, context, subject, attachments } = emailData;

      // Enhance context with common variables
      const enhancedContext = {
        ...context,
        supportEmail: this.configService.get('SUPPORT_EMAIL') || 'support@carental.com',
        frontendUrl: this.configService.get('FRONTEND_URL') || 'http://localhost:4200',
        // Add bookingUrl if context has booking data
        bookingUrl: context.booking?.id 
          ? `${this.configService.get('FRONTEND_URL') || 'http://localhost:4200'}/bookings/${context.booking.id}`
          : `${this.configService.get('FRONTEND_URL') || 'http://localhost:4200'}/bookings`,
      };

      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`,
        context: enhancedContext,
        attachments,
      });

      this.logger.log(`Email sent successfully to ${to} with template ${template}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailData.to}: ${error.message}`);
      throw error;
    }
  }

  async addEmailToQueue(emailData: EmailJobData): Promise<void> {
    try {
      // For critical emails like invoices, send immediately
      if (emailData.priority === EmailPriority.CRITICAL || 
          emailData.template === EmailTemplate.PAYMENT_RECEIPT) {
        await this.sendEmailDirect(emailData);
        return;
      }

      // Otherwise, add to queue
      await this.emailQueue.add('send-email', emailData, {
        priority: this.getPriorityValue(emailData.priority),
        delay: emailData.delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log(`Email queued for ${emailData.to}`);
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`);
      // Fallback to direct sending if queue fails
      await this.sendEmailDirect(emailData);
    }
  }

  private getPriorityValue(priority?: EmailPriority): number {
    switch (priority) {
      case EmailPriority.CRITICAL:
        return 1;
      case EmailPriority.HIGH:
        return 25;
      case EmailPriority.NORMAL:
        return 50;
      case EmailPriority.LOW:
        return 100;
      default:
        return 50;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailContext): Promise<void> {
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.WELCOME,
      subject: `Welcome to Car Rental Service, ${data.user.firstName}!`,
      context: data,
      priority: EmailPriority.HIGH,
    });
  }

  async sendEmailVerification(data: {
    user: { firstName: string; lastName: string; email: string };
    verificationUrl: string;
    expiresIn: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: data.user.email,
      subject: 'Verify Your Email Address - Car Rental',
      template: './email-verification',
      context: {
        user: data.user,
        verificationUrl: data.verificationUrl,
        expiresIn: data.expiresIn,
      },
    });
  }

  async sendPasswordReset(data: PasswordResetContext): Promise<void> {
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.PASSWORD_RESET,
      subject: 'Reset Your Password',
      context: data,
      priority: EmailPriority.HIGH,
    });
  }

  async sendBookingConfirmation(data: BookingConfirmationContext): Promise<void> {
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.BOOKING_CONFIRMATION,
      subject: `Booking Confirmed - ${data.booking.vehicle.make} ${data.booking.vehicle.model}`,
      context: data,
      priority: EmailPriority.HIGH,
    });
  }

  async sendBookingReminder(data: BookingReminderContext): Promise<void> {
    const reminderType = data.reminderType === 'pickup' ? 'Pickup' : 'Return';
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.BOOKING_REMINDER,
      subject: `${reminderType} Reminder - ${data.booking.vehicle.make} ${data.booking.vehicle.model}`,
      context: data,
      priority: EmailPriority.HIGH,
    });
  }

  async sendBookingCancellation(data: BookingCancellationContext): Promise<void> {
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.BOOKING_CANCELLATION,
      subject: `Booking Cancelled - ${data.booking.vehicle.make} ${data.booking.vehicle.model}`,
      context: data,
      priority: EmailPriority.HIGH,
    });
  }

  async sendPaymentReceipt(data: PaymentReceiptContext): Promise<void> {
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.PAYMENT_RECEIPT,
      subject: `Payment Receipt - Invoice #${data.payment.id.substring(0, 8).toUpperCase()}`,
      context: data,
      priority: EmailPriority.CRITICAL, // Critical for immediate sending
      attachments: data.attachments,
    });
  }

  async sendPaymentFailed(data: PaymentFailedContext): Promise<void> {
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.PAYMENT_FAILED,
      subject: 'Payment Failed - Action Required',
      context: data,
      priority: EmailPriority.HIGH,
    });
  }

  async sendReviewRequest(data: ReviewRequestContext): Promise<void> {
    await this.addEmailToQueue({
      to: data.user.email,
      template: EmailTemplate.REVIEW_REQUEST,
      subject: 'How was your experience?',
      context: data,
      priority: EmailPriority.NORMAL,
    });
  }

  async sendBulkEmail(data: BulkEmailData): Promise<void> {
    const batchSize = data.batchSize || 100;
    const batches = this.chunkArray(data.recipients, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(recipient =>
        this.addEmailToQueue({
          to: recipient.email,
          template: data.template,
          subject: data.subject,
          context: {
            ...data.baseContext,
            user: {
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              email: recipient.email,
            },
          },
          priority: data.priority,
        })
      );

      await Promise.all(batchPromises);
    }
  }

  async sendMarketingCampaign(campaign: EmailCampaign): Promise<void> {
    // Implementation for marketing campaigns
    this.logger.log(`Marketing campaign "${campaign.name}" processing started`);
    // Add campaign logic here
  }

  async getQueueStats(): Promise<any> {
    const waiting = await this.emailQueue.getWaiting();
    const active = await this.emailQueue.getActive();
    const completed = await this.emailQueue.getCompleted();
    const failed = await this.emailQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async getEmailStats(period?: 'day' | 'week' | 'month'): Promise<EmailStats> {
    // Implementation for email statistics
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      deliveryRate: 0,
      failureRate: 0,
      byTemplate: {} as any,
      recent: [],
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
