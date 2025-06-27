import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

import {
  IEmailService,
  EmailTemplate,
  EmailPriority,
  EmailJobData,
  BulkEmailData,
  EmailCampaign,
  EmailStats,
  WelcomeEmailContext,
  EmailVerificationContext,
  PasswordResetContext,
  BookingConfirmationContext,
  BookingReminderContext,
  BookingCancellationContext,
  PaymentReceiptContext,
  PaymentFailedContext,
  ReviewRequestContext,
} from './email.interface';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:4200';
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(data: WelcomeEmailContext): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.WELCOME,
      subject: `Welcome to Car Rental Service, ${data.user.firstName}!`,
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
        supportEmail: this.configService.get('SUPPORT_EMAIL'),
      },
      priority: EmailPriority.HIGH,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(data: EmailVerificationContext): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.EMAIL_VERIFICATION,
      subject: 'Verify Your Email Address',
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
      },
      priority: EmailPriority.HIGH,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetContext): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.PASSWORD_RESET,
      subject: 'Reset Your Password',
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
      },
      priority: EmailPriority.HIGH,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    data: BookingConfirmationContext,
  ): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.BOOKING_CONFIRMATION,
      subject: `Booking Confirmed - ${data.booking.vehicle.make} ${data.booking.vehicle.model}`,
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
        bookingUrl: `${this.frontendUrl}/bookings/${data.booking.id}`,
      },
      priority: EmailPriority.HIGH,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send booking reminder email
   */
  async sendBookingReminder(data: BookingReminderContext): Promise<void> {
    const subject =
      data.reminderType === 'pickup'
        ? `Reminder: Vehicle Pickup in ${data.hoursUntil} hours`
        : `Reminder: Vehicle Return Due in ${data.hoursUntil} hours`;

    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.BOOKING_REMINDER,
      subject,
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
        bookingUrl: `${this.frontendUrl}/bookings/${data.booking.id}`,
      },
      priority: EmailPriority.NORMAL,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(
    data: BookingCancellationContext,
  ): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.BOOKING_CANCELLATION,
      subject: `Booking Cancelled - ${data.booking.vehicle.make} ${data.booking.vehicle.model}`,
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
        supportEmail: this.configService.get('SUPPORT_EMAIL'),
      },
      priority: EmailPriority.HIGH,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(data: PaymentReceiptContext): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.PAYMENT_RECEIPT,
      subject: `Payment Receipt - Booking #${data.booking.id}`,
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
        bookingUrl: `${this.frontendUrl}/bookings/${data.booking.id}`,
      },
      priority: EmailPriority.HIGH,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailed(data: PaymentFailedContext): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.PAYMENT_FAILED,
      subject: `Payment Failed - Action Required`,
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
        supportEmail: this.configService.get('SUPPORT_EMAIL'),
      },
      priority: EmailPriority.CRITICAL,
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send review request email
   */
  async sendReviewRequest(data: ReviewRequestContext): Promise<void> {
    const emailData: EmailJobData = {
      to: data.user.email,
      template: EmailTemplate.REVIEW_REQUEST,
      subject: `How was your experience with ${data.booking.vehicle.make} ${data.booking.vehicle.model}?`,
      context: {
        ...data,
        frontendUrl: this.frontendUrl,
      },
      priority: EmailPriority.LOW,
      delay: 24 * 60 * 60 * 1000, // 24 hours delay
    };

    await this.addEmailToQueue(emailData);
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(data: BulkEmailData): Promise<void> {
    const batchSize = data.batchSize || 100;
    const batches = this.chunkArray(data.recipients, batchSize);

    for (const batch of batches) {
      const batchJobs = batch.map((recipient) => ({
        to: recipient.email,
        template: data.template,
        subject: data.subject,
        context: {
          ...data.baseContext,
          user: recipient,
          unsubscribeUrl: `${this.frontendUrl}/unsubscribe?email=${recipient.email}`,
        },
        priority: data.priority || EmailPriority.LOW,
      }));

      await Promise.all(batchJobs.map((job) => this.addEmailToQueue(job)));

      // Add delay between batches to avoid overwhelming the email service
      await this.delay(5000); // 5 seconds
    }
  }

  /**
   * Send marketing campaign
   */
  async sendMarketingCampaign(campaign: EmailCampaign): Promise<void> {
    try {
      // Get target audience based on filters
      const recipients = await this.getTargetAudience(campaign.targetAudience);

      const bulkData: BulkEmailData = {
        recipients: recipients.map((user) => ({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userId: user.id,
        })),
        template: campaign.template,
        baseContext: campaign.context,
        subject: campaign.subject,
        priority: EmailPriority.LOW,
        batchSize: 50,
      };

      await this.sendBulkEmail(bulkData);

      this.logger.log(
        `Marketing campaign "${campaign.name}" sent to ${recipients.length} recipients`,
      );
    } catch (error) {
      this.logger.error(`Failed to send marketing campaign: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add email to queue
   */
  async addEmailToQueue(data: EmailJobData): Promise<void> {
    const jobOptions = {
      priority: this.getPriorityValue(data.priority || EmailPriority.NORMAL),
      delay: data.delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    await this.emailQueue.add('send-email', data, jobOptions);
  }

  /**
   * Get queue statistics
   */
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

  /**
   * Get email statistics
   */
  async getEmailStats() // _period: 'day' | 'week' | 'month' = 'week', // Prefix with underscore to indicate intentionally unused
  : Promise<EmailStats> {
    // This would typically come from a logging/analytics service
    // For now, return mock data
    return {
      totalSent: 1500,
      totalDelivered: 1425,
      totalFailed: 75,
      deliveryRate: 95,
      failureRate: 5,
      byTemplate: {} as any,
      recent: [],
    };
  }

  /**
   * Private helper methods
   */
  private getPriorityValue(priority: EmailPriority): number {
    const priorities = {
      [EmailPriority.CRITICAL]: 1,
      [EmailPriority.HIGH]: 2,
      [EmailPriority.NORMAL]: 3,
      [EmailPriority.LOW]: 4,
    };
    return priorities[priority];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getTargetAudience(filters: any): Promise<any[]> {
    const where: any = {};

    if (filters.roles) {
      where.role = { in: filters.roles };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}
