import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service'; // Fix: Use BookingsService
import { EmailService } from '../email/email.service';
import {  BookingStatus, Role } from '@prisma/client';
import { ApiResponse } from '../common/dto/api-response.dto';

export interface AgentBookingApprovalDto {
  bookingIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
  notes?: string;
}

export interface AgentDashboardStats {
  pendingBookings: number;
  approvedToday: number;
  rejectedToday: number;
  totalRevenue: number;
  activeBookings: number;
  completedBookings: number;
}

@Injectable()
export class AgentService {
  constructor(
    private prisma: PrismaService,
    private bookingService: BookingsService, // Fix: Use BookingsService
    private emailService: EmailService,
  ) {}

  // Get agent dashboard statistics
  async getDashboardStats(agentId: string): Promise<ApiResponse<AgentDashboardStats>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        pendingBookings,
        approvedToday,
        rejectedToday,
        activeBookings,
        completedBookings,
        revenueResult
      ] = await Promise.all([
        this.prisma.booking.count({
          where: { status: BookingStatus.PENDING }
        }),
        this.prisma.booking.count({
          where: {
            status: BookingStatus.CONFIRMED,
            updatedAt: { gte: today, lt: tomorrow }
          }
        }),
        this.prisma.booking.count({
          where: {
            status: BookingStatus.REJECTED,
            updatedAt: { gte: today, lt: tomorrow }
          }
        }),
        this.prisma.booking.count({
          where: { status: BookingStatus.ACTIVE }
        }),
        this.prisma.booking.count({
          where: { status: BookingStatus.COMPLETED }
        }),
        this.prisma.booking.aggregate({
          where: {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE, BookingStatus.COMPLETED] }
          },
          _sum: { totalAmount: true }
        })
      ]);

      const stats: AgentDashboardStats = {
        pendingBookings,
        approvedToday,
        rejectedToday,
        totalRevenue: revenueResult._sum.totalAmount || 0,
        activeBookings,
        completedBookings,
      };

      return ApiResponse.success(stats, 'Dashboard statistics retrieved successfully');
    } catch (error) {
      throw new BadRequestException('Failed to get dashboard statistics: ' + error.message);
    }
  }

  // Get pending bookings for agent review
  async getPendingBookings(
    agentId: string,
    page = 1,
    limit = 10
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;

      const [bookings, total] = await Promise.all([
        this.prisma.booking.findMany({
          where: { status: BookingStatus.PENDING },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                licenseNumber: true,
                createdAt: true,
                // Remove 'profile' as it doesn't exist
              }
            },
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                year: true,
                licensePlate: true,
                category: true,
                location: true,
                pricePerDay: true,
                pricePerHour: true,
                images: true,
              }
            },
            coupon: {
              select: {
                id: true,
                code: true,
                discountValue: true,
                discountType: true,
              }
            }
          }
        }),
        this.prisma.booking.count({
          where: { status: BookingStatus.PENDING }
        })
      ]);

      // Enhance bookings with risk assessment
      const enhancedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const riskAssessment = await this.assessBookingRisk(booking);
          const conflicts = await this.checkBookingConflicts(
            booking.vehicleId,
            booking.startDate,
            booking.endDate,
            booking.id
          );

          return {
            ...booking,
            riskAssessment,
            conflicts,
            recommendedAction: this.getRecommendedAction(riskAssessment, conflicts),
          };
        })
      );

      const result = {
        data: enhancedBookings,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      return ApiResponse.success(result, 'Pending bookings retrieved successfully');
    } catch (error) {
      throw new BadRequestException('Failed to get pending bookings: ' + error.message);
    }
  }

  // Approve or reject a single booking
  async processBookingApproval(
    agentId: string,
    bookingId: string,
    action: 'approve' | 'reject',
    reason?: string,
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          vehicle: true,
        }
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException('Booking is not in pending status');
      }

      const newStatus = action === 'approve' ? BookingStatus.CONFIRMED : BookingStatus.REJECTED;
      
      // Use the booking service to update status
      const result = await this.bookingService.updateStatus(
        bookingId,
        {
          status: newStatus,
          reason: reason || `${action === 'approve' ? 'Approved' : 'Rejected'} by agent`,
        },
        Role.AGENT
      );

      // Log agent action (comment out agentActivity since it doesn't exist in schema)
      // await this.logAgentAction(agentId, {
      //   action: `booking_${action}`,
      //   bookingId,
      //   reason,
      //   notes,
      //   userId: booking.userId,
      //   vehicleId: booking.vehicleId,
      // });

      // Send notification email to customer
      await this.sendBookingDecisionEmail(booking, action, reason);

      return ApiResponse.success(
        result.data,
        `Booking ${action}d successfully`
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to ${action} booking: ` + error.message);
    }
  }

  // Bulk approve/reject bookings
  async bulkProcessBookings(
    agentId: string,
    approvalDto: AgentBookingApprovalDto
  ): Promise<ApiResponse<any>> {
    try {
      const { bookingIds, action, reason, notes } = approvalDto;
      const results = {
        successful: [] as string[],
        failed: [] as { bookingId: string; error: string }[],
      };

      for (const bookingId of bookingIds) {
        try {
          await this.processBookingApproval(agentId, bookingId, action, reason, notes);
          results.successful.push(bookingId);
        } catch (error) {
          results.failed.push({
            bookingId,
            error: error.message,
          });
        }
      }

      return ApiResponse.success(
        {
          ...results,
          total: bookingIds.length,
          successCount: results.successful.length,
          failureCount: results.failed.length,
        },
        `Bulk ${action} completed: ${results.successful.length} successful, ${results.failed.length} failed`
      );
    } catch (error) {
      throw new BadRequestException('Failed to process bulk bookings: ' + error.message);
    }
  }

  // Get booking details for agent review
  async getBookingForReview(
    agentId: string,
    bookingId: string
  ): Promise<ApiResponse<any>> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              licenseNumber: true,
              createdAt: true,
            }
          },
          vehicle: true,
          coupon: true,
        }
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const riskAssessment = await this.assessBookingRisk(booking);
      const conflicts = await this.checkBookingConflicts(
        booking.vehicleId,
        booking.startDate,
        booking.endDate,
        booking.id
      );

      const enhancedBooking = {
        ...booking,
        riskAssessment,
        conflicts,
        recommendedAction: this.getRecommendedAction(riskAssessment, conflicts),
      };

      return ApiResponse.success(enhancedBooking, 'Booking details retrieved successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get booking details: ' + error.message);
    }
  }

  // Private helper methods
  private async assessBookingRisk(booking: any): Promise<any> {
    const factors = {
      isNewCustomer: false,
      hasPaymentIssues: false,
      longBookingDuration: false,
      highValueBooking: false,
      weekendBooking: false,
      lastMinuteBooking: false,
    };

    // Check if new customer (account created within last 30 days)
    const userAge = new Date().getTime() - booking.user.createdAt.getTime();
    factors.isNewCustomer = userAge < (30 * 24 * 60 * 60 * 1000);

    // Check booking duration
    const duration = new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime();
    const days = duration / (1000 * 60 * 60 * 24);
    factors.longBookingDuration = days > 7;

    // Check if high value booking
    factors.highValueBooking = booking.totalAmount > 500;

    // Check if weekend booking
    const startDay = new Date(booking.startDate).getDay();
    factors.weekendBooking = startDay === 0 || startDay === 6;

    // Check if last minute booking (within 24 hours)
    const bookingAdvance = new Date(booking.startDate).getTime() - booking.createdAt.getTime();
    factors.lastMinuteBooking = bookingAdvance < (24 * 60 * 60 * 1000);

    // Calculate risk score (0-100)
    let riskScore = 0;
    if (factors.isNewCustomer) riskScore += 20;
    if (factors.hasPaymentIssues) riskScore += 30;
    if (factors.longBookingDuration) riskScore += 15;
    if (factors.highValueBooking) riskScore += 10;
    if (factors.weekendBooking) riskScore += 5;
    if (factors.lastMinuteBooking) riskScore += 10;

    const riskLevel = riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MEDIUM' : 'HIGH';

    return {
      factors,
      riskScore,
      riskLevel,
      recommendations: this.getRiskRecommendations(factors, riskScore),
    };
  }

  private async checkBookingConflicts(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId: string
  ): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: {
        vehicleId,
        id: { not: excludeBookingId },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        bookingReference: true,
      },
    });
  }

  private getRiskRecommendations(factors: any, riskScore: number): string[] {
    const recommendations = [];

    if (factors.isNewCustomer) {
      recommendations.push('Verify customer documentation thoroughly');
    }
    if (factors.longBookingDuration) {
      recommendations.push('Consider requiring additional security deposit');
    }
    if (factors.highValueBooking) {
      recommendations.push('Verify payment method and customer identity');
    }
    if (factors.lastMinuteBooking) {
      recommendations.push('Confirm pickup arrangements and contact details');
    }
    if (riskScore > 60) {
      recommendations.push('Consider requesting additional verification or security');
    }

    return recommendations;
  }

  private getRecommendedAction(riskAssessment: any, conflicts: any[]): string {
    if (conflicts.length > 0) {
      return 'REJECT - Vehicle scheduling conflict detected';
    }
    if (riskAssessment.riskLevel === 'HIGH') {
      return 'REVIEW - High risk factors detected, additional verification recommended';
    }
    if (riskAssessment.riskLevel === 'MEDIUM') {
      return 'APPROVE WITH CAUTION - Medium risk, monitor closely';
    }
    return 'APPROVE - Low risk booking';
  }

  // Comment out agentActivity logging since the table doesn't exist
  // private async logAgentAction(agentId: string, actionData: any): Promise<void> {
  //   await this.prisma.agentActivity.create({
  //     data: {
  //       agentId,
  //       action: actionData.action,
  //       resourceType: 'booking',
  //       resourceId: actionData.bookingId,
  //       details: JSON.stringify(actionData),
  //       timestamp: new Date(),
  //     },
  //   });
  // }

  private async sendBookingDecisionEmail(booking: any, action: string, reason?: string): Promise<void> {
    const emailData = {
      user: booking.user,
      booking,
      decision: action,
      reason,
      dashboardUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}`,
    };

    if (action === 'approve') {
      await this.emailService.sendBookingApproval(emailData);
    } else {
      await this.emailService.sendBookingRejection(emailData);
    }
  }
}
