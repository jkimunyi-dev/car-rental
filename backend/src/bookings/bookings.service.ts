import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BookingStatus, Role, VehicleStatus } from '@prisma/client';
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingStatusUpdateDto,
  CancelBookingDto,
  PricingBreakdownDto,
} from './dto/create-booking.dto';
import {
  IBookingService,
  IBookingSearchOptions,
  IBookingAvailabilityResult,
  IBookingStatistics,
  IBulkUpdateResult,
  ICouponValidationResult,
  BookingApiResponse,
  BookingsListApiResponse,
  BookingAvailabilityApiResponse,
  BookingPricingApiResponse,
  BookingResponseData,
  BookingWithDetails,
} from './booking.interface';
import { ApiResponse, PaginatedResponse } from '../common/dto/api-response.dto';

@Injectable()
export class BookingsService implements IBookingService {
  private readonly logger = new Logger(BookingsService.name); // Add logger property

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<BookingApiResponse> {
    try {
      const {
        vehicleId,
        startDate: startDateStr,
        endDate: endDateStr,
        startTime,
        endTime,
        pickupLocation,
        dropoffLocation,
        notes,
        couponCode,
        isHourlyBooking = false,
        specialRequests,
        insuranceLevel,
        additionalDrivers,
        phoneNumber, // Add phone number
      } = createBookingDto;

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      // Validate dates
      this.validateBookingDates(startDate, endDate, startTime, endTime);

      // Validate phone number
      if (!phoneNumber || !this.isValidPhoneNumber(phoneNumber)) {
        throw new BadRequestException('Valid phone number is required (07... or 01... format)');
      }

      // Check vehicle availability (this will throw if not available)
      await this.checkVehicleAvailabilityInternal(vehicleId, startDate, endDate);

      // Get vehicle details for pricing
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.status !== 'AVAILABLE') {
        throw new BadRequestException('Vehicle is not available for booking');
      }

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          licenseNumber: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // TEMPORARILY REMOVE LICENSE VALIDATION
      // if (!user.licenseNumber) {
      //   throw new BadRequestException('Valid driving license is required for booking');
      // }

      // Calculate pricing
      const pricing = await this.calculatePricingInternal(
        vehicle,
        startDate,
        endDate,
        startTime,
        endTime,
        isHourlyBooking,
        couponCode,
        insuranceLevel,
      );

      // Apply coupon if provided
      let coupon = null;
      if (couponCode) {
        const couponValidation = await this.validateAndApplyCoupon(couponCode, pricing.subtotal);
        if (couponValidation?.isValid) {
          coupon = { connect: { id: couponValidation.id } };
        }
      }

      // Generate booking reference
      const bookingReferenceValue = await this.generateBookingReference();

      // Create booking with phone number
      const newBooking = await this.prisma.booking.create({
        data: {
          user: { connect: { id: userId } },
          vehicle: { connect: { id: vehicleId } },
          startDate,
          endDate,
          startTime,
          endTime,
          pickupLocation,
          dropoffLocation,
          phoneNumber, // This field now exists in the schema
          totalDays: pricing.totalDays,
          totalHours: pricing.totalHours,
          pricePerDay: pricing.pricePerDay,
          pricePerHour: pricing.pricePerHour,
          subtotal: pricing.subtotal,
          taxes: pricing.taxes,
          fees: pricing.fees,
          discount: pricing.discount,
          totalAmount: pricing.totalAmount,
          status: BookingStatus.PENDING,
          notes,
          specialRequests,
          insuranceLevel,
          bookingReference: bookingReferenceValue,
          coupon: coupon ? { connect: { id: coupon.id } } : undefined,
        },
        include: this.getIncludeOptions(false, Role.CUSTOMER),
      });

      const enhancedBooking = this.enhanceBookingResponse(newBooking, Role.CUSTOMER);

      // Send confirmation email
      await this.emailService.sendBookingConfirmation({
        user: user as any,
        booking: enhancedBooking as any,
        supportUrl: `${process.env.FRONTEND_URL}/support`,
        policyUrl: `${process.env.FRONTEND_URL}/policy`,
      });

      return ApiResponse.success(enhancedBooking, 'Booking created successfully');
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create booking: ' + error.message);
    }
  }

  async findAll(options: IBookingSearchOptions): Promise<BookingsListApiResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        userId,
        vehicleId,
        startDate,
        endDate,
        userRole,
        isPublic = false,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        location,
        minAmount,
        maxAmount,
      } = options;
      
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (vehicleId) where.vehicleId = vehicleId;
      if (location) where.pickupLocation = { contains: location, mode: 'insensitive' };
      
      if (minAmount || maxAmount) {
        where.totalAmount = {};
        if (minAmount) where.totalAmount.gte = minAmount;
        if (maxAmount) where.totalAmount.lte = maxAmount;
      }

      if (search) {
        where.OR = [
          { bookingReference: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { vehicle: { make: { contains: search, mode: 'insensitive' } } },
          { vehicle: { model: { contains: search, mode: 'insensitive' } } },
          { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (startDate || endDate) {
        where.AND = [];
        if (startDate) {
          where.AND.push({
            startDate: { gte: new Date(startDate) },
          });
        }
        if (endDate) {
          where.AND.push({
            endDate: { lte: new Date(endDate) },
          });
        }
      }

      // Define what data to include based on whether it's a public request
      const includeOptions = this.getIncludeOptions(isPublic, userRole);

      const [bookings, total] = await Promise.all([
        this.prisma.booking.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: includeOptions,
        }),
        this.prisma.booking.count({ where }),
      ]);

      const enhancedBookings = bookings.map(booking => 
        this.enhanceBookingResponse(booking, userRole, isPublic)
      );

      const paginatedData: PaginatedResponse<BookingResponseData> = {
        data: enhancedBookings,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      return ApiResponse.success(
        paginatedData,
        `Retrieved ${enhancedBookings.length} bookings successfully`
      );
    } catch (error) {
      throw new BadRequestException('Failed to retrieve bookings: ' + error.message);
    }
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: Role,
  ): Promise<BookingApiResponse> {
    try {
      const isPublic = !userId;
      const includeOptions = this.getIncludeOptions(isPublic, userRole);

      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: includeOptions,
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // For authenticated users, check if they can access this booking
      if (!isPublic) {
        if (userRole === Role.CUSTOMER && booking.userId !== userId) {
          throw new ForbiddenException('You can only view your own bookings');
        }
      }

      const enhancedBooking = this.enhanceBookingResponse(booking, userRole, isPublic);

      return ApiResponse.success(
        enhancedBooking,
        'Booking retrieved successfully'
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve booking: ' + error.message);
    }
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingApiResponse> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: {
          vehicle: true,
          user: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Check permissions
      if (userRole === Role.CUSTOMER && booking.userId !== userId) {
        throw new ForbiddenException('You can only update your own bookings');
      }

      // Check if booking can be modified
      if (!this.isBookingModifiable(booking)) {
        throw new BadRequestException('Booking cannot be modified in its current state');
      }

      // If dates are being updated, check availability
      const startDate = updateBookingDto.startDate ? new Date(updateBookingDto.startDate) : booking.startDate;
      const endDate = updateBookingDto.endDate ? new Date(updateBookingDto.endDate) : booking.endDate;

      if (updateBookingDto.startDate || updateBookingDto.endDate) {
        await this.checkVehicleAvailabilityInternal(booking.vehicleId, startDate, endDate, id);
      }

      // Update booking
      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: {
          ...updateBookingDto,
          startDate: updateBookingDto.startDate ? new Date(updateBookingDto.startDate) : undefined,
          endDate: updateBookingDto.endDate ? new Date(updateBookingDto.endDate) : undefined,
          additionalDrivers: updateBookingDto.additionalDrivers 
            ? JSON.parse(JSON.stringify(updateBookingDto.additionalDrivers)) 
            : undefined,
        },
        include: this.getIncludeOptions(false, userRole),
      });

      const enhancedBooking = this.enhanceBookingResponse(updatedBooking, userRole);

      return ApiResponse.success(
        enhancedBooking,
        'Booking updated successfully'
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to update booking: ' + error.message);
    }
  }

  async updateStatus(
    id: string,
    statusUpdateDto: BookingStatusUpdateDto,
    userRole: Role,
  ): Promise<BookingApiResponse> {
    try {
      const { status, reason } = statusUpdateDto;

      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: this.getIncludeOptions(false, userRole),
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Validate status transition
      this.validateStatusTransition(booking.status, status, userRole);

      // Update booking with new status - remove statusHistory
      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
          // Remove statusHistory since it doesn't exist in the schema
        },
        include: this.getIncludeOptions(false, userRole),
      });

      // Handle post-status change logic
      await this.handleStatusChangeEffects(updatedBooking, status, reason);

      const enhancedBooking = this.enhanceBookingResponse(updatedBooking, userRole);

      return ApiResponse.success(enhancedBooking, `Booking status updated to ${status}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to update booking status: ' + error.message);
    }
  }

  // Fix the method signature to match the expected enum values
  private async handleStatusChangeEffects(booking: any, newStatus: BookingStatus, reason?: string): Promise<void> {
    // Only handle specific status changes that need email notifications
    if (newStatus === BookingStatus.CONFIRMED) {
      // Send booking confirmation email
      await this.emailService.sendBookingApproval({
        user: booking.user,
        booking,
        reason,
        dashboardUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}`,
      });
    } else if (newStatus === BookingStatus.REJECTED) {
      // Send booking rejection email
      await this.emailService.sendBookingRejection({
        user: booking.user,
        booking,
        reason,
        dashboardUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}`,
      });
    } else if (newStatus === BookingStatus.COMPLETED) {
      // Update vehicle status to available
      await this.prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'AVAILABLE' },
      });

      // Send review request email after a delay
      setTimeout(async () => {
        await this.emailService.sendReviewRequest({
          user: booking.user,
          booking,
          reviewUrl: `${process.env.FRONTEND_URL}/vehicles/${booking.vehicleId}/review`,
        });
      }, 24 * 60 * 60 * 1000); // 24 hours delay
    } else if (newStatus === BookingStatus.CANCELLED) {
      // Update vehicle status to available
      await this.prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'AVAILABLE' },
      });
    }
  }

  async cancel(
    id: string,
    cancelBookingDto: CancelBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingApiResponse> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: {
          vehicle: true,
          user: true,
          payment: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Check permissions
      if (userRole === Role.CUSTOMER && booking.userId !== userId) {
        throw new ForbiddenException('You can only cancel your own bookings');
      }

      // Check if booking can be cancelled
      if (!this.isBookingCancellable(booking)) {
        throw new BadRequestException('Booking cannot be cancelled in its current state');
      }

      // Calculate cancellation fee
      const cancellationFee = this.calculateCancellationFee(booking);
      
      // Update booking
      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: cancelBookingDto.cancellationReason,
        },
        include: this.getIncludeOptions(false, userRole),
      });

      // Update vehicle status
      await this.prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      // Process refund if requested and payment exists
      if (cancelBookingDto.requestRefund && booking.payment) {
        const refundAmount = booking.totalAmount - cancellationFee;
        if (refundAmount > 0) {
          await this.processRefund(booking.payment.id, refundAmount);
        }
      }

      const enhancedBooking = this.enhanceBookingResponse(updatedBooking, userRole);

      return ApiResponse.success(
        enhancedBooking,
        `Booking cancelled successfully. ${cancellationFee > 0 ? `Cancellation fee: $${cancellationFee}` : 'No cancellation fee applied.'}`
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to cancel booking: ' + error.message);
    }
  }

  async checkAvailability(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<BookingAvailabilityApiResponse> {
    try {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Validate dates
      this.validateBookingDates(startDateObj, endDateObj);

      // Check if vehicle exists and is active
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      // Check for conflicting bookings
      const conflictingBookings = await this.prisma.booking.findMany({
        where: {
          vehicleId,
          status: {
            in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE, BookingStatus.PENDING],
          },
          OR: [
            {
              startDate: { lte: endDateObj },
              endDate: { gte: startDateObj },
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

      const isAvailable = conflictingBookings.length === 0;

      // Find next available date if not available
      let nextAvailableDate: Date | undefined;
      if (!isAvailable) {
        // Find the earliest date after all conflicts
        const latestConflictEnd = Math.max(
          ...conflictingBookings.map(booking => booking.endDate.getTime())
        );
        nextAvailableDate = new Date(latestConflictEnd + 24 * 60 * 60 * 1000); // Add 1 day
      }

      const result: IBookingAvailabilityResult = {
        available: isAvailable,
        vehicleId,
        requestedPeriod: {
          startDate,
          endDate,
        },
        conflicts: conflictingBookings.length > 0 ? conflictingBookings : undefined,
        nextAvailableDate,
      };

      return ApiResponse.success(
        result,
        isAvailable 
          ? 'Vehicle is available for the requested dates'
          : 'Vehicle is not available for the requested dates'
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to check availability: ' + error.message);
    }
  }

  async calculateBookingPrice(
    vehicleId: string,
    startDate: string,
    endDate: string,
    startTime?: string,
    endTime?: string,
    isHourlyBooking = false,
    couponCode?: string,
  ): Promise<BookingPricingApiResponse> {
    try {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      const pricing = await this.calculatePricingInternal(
        vehicle,
        new Date(startDate),
        new Date(endDate),
        startTime,
        endTime,
        isHourlyBooking,
        couponCode,
      );

      return ApiResponse.success(
        pricing,
        'Booking price calculated successfully'
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to calculate price: ' + error.message);
    }
  }

  async getBookingStatistics(
    userId?: string,
    userRole?: Role,
  ): Promise<ApiResponse<IBookingStatistics>> {
    try {
      const where: any = {};
      if (userId && userRole === Role.CUSTOMER) {
        where.userId = userId;
      }

      const [
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
      ] = await Promise.all([
        this.prisma.booking.count({ where }),
        this.prisma.booking.count({ where: { ...where, status: BookingStatus.ACTIVE } }),
        this.prisma.booking.count({ where: { ...where, status: BookingStatus.COMPLETED } }),
        this.prisma.booking.count({ where: { ...where, status: BookingStatus.CANCELLED } }),
        this.prisma.booking.aggregate({
          where: { ...where, status: { in: [BookingStatus.COMPLETED] } },
          _sum: { totalAmount: true },
        }),
      ]);

      const averageBookingValue = totalBookings > 0 ? (totalRevenue._sum.totalAmount || 0) / totalBookings : 0;

      const statistics: IBookingStatistics = {
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        averageBookingValue,
        bookingsByStatus: {
          [BookingStatus.PENDING]: await this.prisma.booking.count({ where: { ...where, status: BookingStatus.PENDING } }),
          [BookingStatus.CONFIRMED]: await this.prisma.booking.count({ where: { ...where, status: BookingStatus.CONFIRMED } }),
          [BookingStatus.ACTIVE]: activeBookings,
          [BookingStatus.COMPLETED]: completedBookings,
          [BookingStatus.CANCELLED]: cancelledBookings,
          [BookingStatus.REJECTED]: await this.prisma.booking.count({ where: { ...where, status: BookingStatus.REJECTED } }),
        },
        bookingsByMonth: [], // Implement as needed
        topVehicles: [], // Implement as needed
        customerMetrics: {
          newCustomers: 0, // Implement as needed
          repeatCustomers: 0, // Implement as needed
          customerRetentionRate: 0, // Implement as needed
        },
      };

      return ApiResponse.success(statistics, 'Booking statistics retrieved successfully');
    } catch (error) {
      throw new BadRequestException('Failed to retrieve booking statistics: ' + error.message);
    }
  }

  async bulkUpdateStatus(
    bookingIds: string[],
    status: BookingStatus,
    userRole: Role,
  ): Promise<ApiResponse<IBulkUpdateResult>> {
    try {
      const results: IBulkUpdateResult = {
        successful: [],
        failed: [],
        total: bookingIds.length,
        successCount: 0,
        failureCount: 0,
      };

      for (const bookingId of bookingIds) {
        try {
          // Validate that the status transition is allowed
          const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
          });

          if (!booking) {
            results.failed.push({ bookingId, error: 'Booking not found' });
            continue;
          }

          // Validate status transition for each booking
          this.validateStatusTransition(booking.status, status, userRole);

          await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status, updatedAt: new Date() },
          });

          results.successful.push(bookingId);
        } catch (error) {
          results.failed.push({ bookingId, error: error.message });
        }
      }

      results.successCount = results.successful.length;
      results.failureCount = results.failed.length;

      return ApiResponse.success(results, `Bulk update completed: ${results.successCount} successful, ${results.failureCount} failed`);
    } catch (error) {
      throw new BadRequestException('Failed to bulk update bookings: ' + error.message);
    }
  }

  // Helper method to generate booking reference
  private async generateBookingReference(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `BK${timestamp}${random}`;
    
    // Ensure uniqueness
    const existing = await this.prisma.booking.findFirst({
      where: { bookingReference: reference },
    });
    
    if (existing) {
      return this.generateBookingReference(); // Recursive call if duplicate
    }
    
    return reference;
  }

  // Helper methods
  private validateBookingDates(
    startDate: Date,
    endDate: Date,
    startTime?: string,
    endTime?: string,
  ): void {
    const now = new Date();
    
    if (startDate <= now) {
      throw new BadRequestException('Start date must be in the future');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (startTime && endTime) {
      // Add time validation logic here
    }
  }

  private async checkVehicleAvailabilityInternal(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const where: any = {
      vehicleId,
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE, BookingStatus.PENDING],
      },
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const conflictingBooking = await this.prisma.booking.findFirst({
      where,
    });

    if (conflictingBooking) {
      throw new BadRequestException('Vehicle is not available for the selected dates');
    }
  }

  private async calculatePricingInternal(
    vehicle: any,
    startDate: Date,
    endDate: Date,
    startTime?: string,
    endTime?: string,
    isHourlyBooking = false,
    couponCode?: string,
    insuranceLevel?: string,
  ): Promise<PricingBreakdownDto> {
    let totalDays = 0;
    let totalHours = 0;
    let basePrice = 0;

    if (isHourlyBooking && startTime && endTime) {
      // Calculate hours
      totalHours = 8; // Example calculation
      basePrice = totalHours * vehicle.pricePerHour;
    } else {
      // Calculate days
      const timeDiff = endDate.getTime() - startDate.getTime();
      totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      basePrice = totalDays * vehicle.pricePerDay;
    }

    const subtotal = basePrice;
    const taxes = subtotal * 0.1;
    const fees = subtotal * 0.05;
    let discount = 0;
    let couponDiscount = 0;

    // Apply coupon discount
    if (couponCode) {
      const couponResult = await this.validateAndApplyCoupon(couponCode, subtotal);
      if (couponResult?.isValid) {
        couponDiscount = couponResult.discountAmount;
      }
    }

    const totalAmount = subtotal + taxes + fees - discount - couponDiscount;

    return {
      basePrice,
      totalDays,
      totalHours: isHourlyBooking ? totalHours : undefined,
      subtotal,
      taxes,
      fees,
      discount,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      totalAmount: Math.max(0, totalAmount),
      pricePerDay: vehicle.pricePerDay,
      pricePerHour: vehicle.pricePerHour,
    };
  }

  private async validateAndApplyCoupon(
    couponCode: string,
    subtotal: number,
  ): Promise<ICouponValidationResult | null> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon || !this.isCouponValid(coupon, subtotal)) {
      return null;
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      id: coupon.id,
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType,
      isValid: true,
    };
  }

  private isCouponValid(coupon: any, subtotal: number): boolean {
    const now = new Date();
    
    return (
      coupon.isActive &&
      coupon.validFrom <= now &&
      coupon.validUntil >= now &&
      (!coupon.minAmount || subtotal >= coupon.minAmount) &&
      (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
    );
  }

  private isBookingModifiable(booking: any): boolean {
    const now = new Date();
    const startDate = new Date(booking.startDate);
    
    return (
      booking.status === BookingStatus.PENDING &&
      startDate > now
    );
  }

  private isBookingCancellable(booking: any): boolean {
    const now = new Date();
    const startDate = new Date(booking.startDate);
    
    return (
      [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status) &&
      startDate > now
    );
  }

  private validateStatusTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus,
    userRole: Role,
  ): void {
    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.ACTIVE, BookingStatus.CANCELLED],
      [BookingStatus.ACTIVE]: [BookingStatus.COMPLETED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.REJECTED]: [],
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Additional role-based restrictions
    if (userRole === Role.AGENT) {
      const agentAllowedStatuses: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.REJECTED];
      if (!agentAllowedStatuses.includes(newStatus)) {
        throw new ForbiddenException('Agents can only confirm or reject bookings');
      }
    }
  }

  private getIncludeOptions(isPublic: boolean, userRole?: Role) {
    if (isPublic) {
      return {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            category: true,
            location: true,
          },
        },
      };
    }

    return {
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          licensePlate: true,
          images: true,
          category: true,
          location: true,
          pricePerDay: true,
          pricePerHour: true,
          features: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          licenseNumber: true,
        },
      },
      coupon: {
        select: {
          id: true,
          code: true,
          discountValue: true,
          discountType: true,
          description: true,
        },
      },
      payment: true,
    };
  }

  private enhanceBookingResponse(booking: any, userRole?: Role, isPublic = false): BookingResponseData {
    const response: BookingResponseData = {
      ...booking,
      isModifiable: !isPublic && this.isBookingModifiable(booking),
      isCancellable: !isPublic && this.isBookingCancellable(booking),
      canRate: !isPublic && booking.status === BookingStatus.COMPLETED && userRole === Role.CUSTOMER,
    };

    if (isPublic) {
      // Remove sensitive information for public access
      delete response.user;
      if (response.vehicle) {
        const { licensePlate, ...publicVehicle } = response.vehicle;
        response.vehicle = publicVehicle as any;
      }
    }

    return response;
  }

  // Add the missing calculateCancellationFee method
  private calculateCancellationFee(booking: any): number {
    const now = new Date();
    const startDate = new Date(booking.startDate);
    const hoursUntil = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Free cancellation if more than 24 hours
    if (hoursUntil > 24) {
      return 0;
    }
    
    // 50% fee if less than 24 hours but more than 2 hours
    if (hoursUntil > 2) {
      return booking.totalAmount * 0.5;
    }
    
    // Full amount if less than 2 hours
    return booking.totalAmount;
  }

  // Fix the processRefund method - remove refundAmount from booking update
  private async processRefund(booking: any, refundAmount: number): Promise<void> {
    try {
      this.logger.log(`Processing refund of ${refundAmount} for booking ${booking.id}`);
      
      // Note: In a real implementation, you would integrate with a payment processor
      // For now, we'll just log the refund and update the booking status
      
      // Don't update refundAmount in booking since it doesn't exist in the schema
      // Instead, you could store this in the notes or create a separate refund record
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          notes: booking.notes 
            ? `${booking.notes}\n\nRefund processed: $${refundAmount}`
            : `Refund processed: $${refundAmount}`,
        },
      });

      this.logger.log(`Refund processed successfully for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to process refund for booking ${booking.id}: ${error.message}`);
      throw new BadRequestException('Failed to process refund');
    }
  }

  // Fix the sendStatusUpdateNotification method
  private async sendStatusUpdateNotification(booking: any, newStatus: BookingStatus): Promise<void> {
    try {
      switch (newStatus) {
        case BookingStatus.CONFIRMED:
          await this.emailService.sendBookingApproval({
            user: booking.user,
            booking,
            dashboardUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}`,
          });
          break;
        
        case BookingStatus.REJECTED:
          await this.emailService.sendBookingRejection({
            user: booking.user,
            booking,
            dashboardUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}`,
          });
          break;
        
        case BookingStatus.ACTIVE:
          // Send pickup reminder
          await this.emailService.sendBookingReminder({
            user: booking.user,
            booking,
            reminderType: 'pickup',
            hoursUntil: 2, // 2 hours until pickup
          });
          break;
        
        case BookingStatus.COMPLETED:
          // Send completion confirmation
          await this.emailService.sendReviewRequest({
            user: booking.user,
            booking,
            reviewUrl: `${process.env.FRONTEND_URL}/vehicles/${booking.vehicleId}/review`,
          });
          break;
        
        case BookingStatus.CANCELLED:
          // Send cancellation confirmation
          await this.emailService.sendBookingCancellation({
            user: booking.user,
            booking,
            refundProcessingDays: 3,
          });
          break;
        
        default:
          this.logger.log(`No email notification configured for status: ${newStatus}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send status update notification: ${error.message}`);
      // Don't throw error here - email failure shouldn't block status update
    }
  }

  // Add phone number validation method
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Kenyan phone number patterns:
    
    const mobilePattern = /^07\d{8}$/;
    const landlinePattern = /^01\d{8}$/;
    
    const cleanNumber = phoneNumber.replace(/\s+/g, '');
    return mobilePattern.test(cleanNumber) || landlinePattern.test(cleanNumber);
  }
}
