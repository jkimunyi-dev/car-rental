import { User } from '@prisma/client';
import { BookingWithDetails } from '../bookings/booking.interface';
import { PaymentWithDetails } from '../payments/payment.interface';

/**
 * Email Template Types
 */
export enum EmailTemplate {
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email-verification',
  PASSWORD_RESET = 'password-reset',
  BOOKING_CONFIRMATION = 'booking-confirmation',
  BOOKING_REMINDER = 'booking-reminder',
  BOOKING_CANCELLATION = 'booking-cancellation',
  PAYMENT_RECEIPT = 'payment-receipt',
  PAYMENT_FAILED = 'payment-failed',
  MARKETING_NEWSLETTER = 'marketing-newsletter',
  PROMOTIONAL_OFFER = 'promotional-offer',
  VEHICLE_RETURN_REMINDER = 'vehicle-return-reminder',
  BOOKING_COMPLETED = 'booking-completed',
  REVIEW_REQUEST = 'review-request',
}

/**
 * Email Priority Levels
 */
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Email Context Data Interfaces
 */
export interface WelcomeEmailContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  verificationUrl?: string;
}

export interface EmailVerificationContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  verificationUrl: string;
  expiresIn: string;
}

export interface PasswordResetContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  resetUrl: string;
  expiresIn: string;
}

export interface BookingConfirmationContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  booking: BookingWithDetails;
  supportUrl: string;
  policyUrl: string;
}

export interface BookingReminderContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  booking: BookingWithDetails;
  reminderType: 'pickup' | 'return';
  hoursUntil: number;
}

export interface BookingCancellationContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  booking: BookingWithDetails;
  cancellationReason?: string;
  refundAmount?: number;
  refundProcessingDays: number;
}

export interface PaymentReceiptContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  payment: PaymentWithDetails;
  booking: BookingWithDetails;
  receiptUrl?: string;
  attachments?: EmailAttachment[]; // Add this field
}

export interface PaymentFailedContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  booking: BookingWithDetails;
  failureReason: string;
  retryUrl: string;
}

export interface MarketingContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export interface PromotionalOfferContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  offerTitle: string;
  offerDescription: string;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  couponCode: string;
  validUntil: Date;
  ctaUrl: string;
  unsubscribeUrl: string;
}

export interface ReviewRequestContext {
  user: Pick<User, 'firstName' | 'lastName' | 'email'>;
  booking: BookingWithDetails;
  reviewUrl: string;
}

/**
 * Email Job Data Interface
 */
export interface EmailJobData {
  to: string | string[];
  template: EmailTemplate;
  context: any;
  subject: string;
  priority?: EmailPriority;
  delay?: number;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string;
}

/**
 * Bulk Email Interface
 */
export interface BulkEmailData {
  recipients: Array<{
    email: string;
    firstName: string;
    lastName: string;
    userId?: string;
  }>;
  template: EmailTemplate;
  baseContext: any;
  subject: string;
  priority?: EmailPriority;
  batchSize?: number;
}

/**
 * Email Campaign Interface
 */
export interface EmailCampaign {
  id: string;
  name: string;
  template: EmailTemplate;
  subject: string;
  context: any;
  targetAudience: {
    roles?: string[];
    isActive?: boolean;
    isVerified?: boolean;
    lastLoginAfter?: Date;
    customFilter?: any;
  };
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  createdAt: Date;
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
}

/**
 * Email Statistics Interface
 */
export interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  failureRate: number;
  byTemplate: Record<
    EmailTemplate,
    {
      sent: number;
      delivered: number;
      failed: number;
    }
  >;
  recent: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

/**
 * Email Service Interface
 */
export interface IEmailService {
  // Single email methods
  sendWelcomeEmail(data: WelcomeEmailContext): Promise<void>;
  sendEmailVerification(data: EmailVerificationContext): Promise<void>;
  sendPasswordReset(data: PasswordResetContext): Promise<void>;
  sendBookingConfirmation(data: BookingConfirmationContext): Promise<void>;
  sendBookingReminder(data: BookingReminderContext): Promise<void>;
  sendBookingCancellation(data: BookingCancellationContext): Promise<void>;
  sendPaymentReceipt(data: PaymentReceiptContext): Promise<void>;
  sendPaymentFailed(data: PaymentFailedContext): Promise<void>;
  sendReviewRequest(data: ReviewRequestContext): Promise<void>;

  // Bulk email methods
  sendBulkEmail(data: BulkEmailData): Promise<void>;
  sendMarketingCampaign(campaign: EmailCampaign): Promise<void>;

  // Queue management
  addEmailToQueue(data: EmailJobData): Promise<void>;
  getQueueStats(): Promise<any>;

  // Statistics
  getEmailStats(period?: 'day' | 'week' | 'month'): Promise<EmailStats>;
}
