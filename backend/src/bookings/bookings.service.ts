import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BookingStatus, VehicleStatus, Role } from '@prisma/client';
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
  IBookingSearchResult,
  IBookingAvailabilityResult,
  ICouponValidationResult,
  BookingResponse,
} from './booking.interface';

@Injectable()
export class BookingsService implements IBookingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<BookingResponse> {
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
    } = createBookingDto;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate dates
    this.validateBookingDates(startDate, endDate, startTime, endTime);

    // Check vehicle availability
    await this.checkVehicleAvailabilityInternal(vehicleId, startDate, endDate);

    // Get vehicle details for pricing
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException('Vehicle is not available for booking');
    }

    // Calculate pricing
    const pricing = await this.calculatePricingInternal(
      vehicle,
      startDate,
      endDate,
      startTime,
      endTime,
      isHourlyBooking,
      couponCode,
    );

    // Apply coupon if provided
    let coupon = null;
    if (couponCode) {
      coupon = await this.validateAndApplyCoupon(couponCode, pricing.subtotal);
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate,
        endDate,
        startTime,
        endTime,
        pickupLocation,
        dropoffLocation: dropoffLocation || pickupLocation,
        totalDays: pricing.totalDays,
        totalHours: pricing.totalHours,
        pricePerDay: pricing.pricePerDay,
        pricePerHour: pricing.pricePerHour,
        subtotal: pricing.subtotal,
        taxes: pricing.taxes,
        fees: pricing.fees,
        discount: pricing.discount + (coupon?.discountAmount || 0),
        totalAmount: pricing.totalAmount - (coupon?.discountAmount || 0),
        notes,
        couponId: coupon?.id,
      },
      include: {
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
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
        payment: true,
      },
    });

    // Update vehicle status
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: VehicleStatus.RENTED },
    });

    // Increment coupon usage
    if (coupon) {
      await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Send booking confirmation email
    await this.emailService.sendBookingConfirmation({
      user: booking.user,
      booking: booking as any,
      supportUrl: `${process.env.FRONTEND_URL}/support`,
      policyUrl: `${process.env.FRONTEND_URL}/policies`,
    });

    return this.enhanceBookingResponse(booking);
  }

  async findAll(options: IBookingSearchOptions): Promise<IBookingSearchResult> {
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
    } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (vehicleId) where.vehicleId = vehicleId;

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
        orderBy: { createdAt: 'desc' },
        include: includeOptions,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map(booking => this.enhanceBookingResponse(booking, userRole, isPublic)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: Role,
  ): Promise<BookingResponse> {
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

    return this.enhanceBookingResponse(booking, userRole, isPublic);
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingResponse> {
    const booking = await this.findOne(id, userId, userRole);

    // Check if booking is modifiable
    if (!this.isBookingModifiable(booking)) {
      throw new BadRequestException('Booking cannot be modified in its current state');
    }

    // Customers can only modify their own bookings
    if (userRole === Role.CUSTOMER && booking.userId !== userId) {
      throw new ForbiddenException('You can only modify your own bookings');
    }

    // If dates are being updated, validate them and check availability
    if (updateBookingDto.startDate || updateBookingDto.endDate) {
      const startDate = updateBookingDto.startDate ? new Date(updateBookingDto.startDate) : booking.startDate;
      const endDate = updateBookingDto.endDate ? new Date(updateBookingDto.endDate) : booking.endDate;

      this.validateBookingDates(startDate, endDate, updateBookingDto.startTime, updateBookingDto.endTime);
      await this.checkVehicleAvailabilityInternal(booking.vehicleId, startDate, endDate, id);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateBookingDto,
      include: {
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
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
        payment: true,
      },
    });

    return this.enhanceBookingResponse(updatedBooking, userRole);
  }

  async updateStatus(
    id: string,
    statusUpdateDto: BookingStatusUpdateDto,
    userRole: Role,
  ): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        vehicle: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate status transition
    this.validateStatusTransition(booking.status, statusUpdateDto.status, userRole);

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: statusUpdateDto.status,
        cancellationReason: statusUpdateDto.reason,
      },
      include: {
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
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
        payment: true,
      },
    });

    // Update vehicle status based on booking status
    if (statusUpdateDto.status === BookingStatus.COMPLETED || statusUpdateDto.status === BookingStatus.CANCELLED) {
      await this.prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    return this.enhanceBookingResponse(updatedBooking, userRole);
  }

  async cancel(
    id: string,
    cancelBookingDto: CancelBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingResponse> {
    const booking = await this.findOne(id, userId, userRole);

    // Check if booking is cancellable
    if (!this.isBookingCancellable(booking)) {
      throw new BadRequestException('Booking cannot be cancelled in its current state');
    }

    // Customers can only cancel their own bookings
    if (userRole === Role.CUSTOMER && booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    const cancellationFee = this.calculateCancellationFee(booking);

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancelBookingDto.cancellationReason,
      },
      include: {
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
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
        payment: true,
      },
    });

    // Update vehicle status
    await this.prisma.vehicle.update({
      where: { id: booking.vehicleId },
      data: { status: VehicleStatus.AVAILABLE },
    });

    // Process refund if requested and applicable
    if (cancelBookingDto.requestRefund && booking.payment) {
      const refundAmount = booking.totalAmount - cancellationFee;
      if (refundAmount > 0) {
        await this.processRefund(booking.payment.id, refundAmount);
      }
    }

    // Send cancellation email
    await this.emailService.sendBookingCancellation({
      user: updatedBooking.user,
      booking: updatedBooking as any,
      cancellationReason: cancelBookingDto.cancellationReason,
      refundAmount: booking.totalAmount - cancellationFee,
      refundProcessingDays: 5,
    });

    return this.enhanceBookingResponse(updatedBooking, userRole);
  }

  async checkAvailability(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<IBookingAvailabilityResult> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const conflicts = await this.prisma.booking.findMany({
      where: {
        vehicleId,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE, BookingStatus.PENDING],
        },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }

  async calculateBookingPrice(
    vehicleId: string,
    startDate: string,
    endDate: string,
    startTime?: string,
    endTime?: string,
    isHourlyBooking = false,
    couponCode?: string,
  ): Promise<PricingBreakdownDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.calculatePricingInternal(
      vehicle,
      new Date(startDate),
      new Date(endDate),
      startTime,
      endTime,
      isHourlyBooking,
      couponCode,
    );
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
      const start = new Date(`${startDate.toDateString()} ${startTime}`);
      const end = new Date(`${startDate.toDateString()} ${endTime}`);
      
      if (end <= start) {
        throw new BadRequestException('End time must be after start time');
      }
    }
  }

  // Made this method private since it's internal implementation
  private async checkVehicleAvailabilityInternal(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ): Promise<void> {
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
  ): Promise<PricingBreakdownDto> {
    let totalDays = 0;
    let totalHours = 0;
    let basePrice = 0;

    if (isHourlyBooking && startTime && endTime) {
      const start = new Date(`${startDate.toDateString()} ${startTime}`);
      const end = new Date(`${endDate.toDateString()} ${endTime}`);
      totalHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      basePrice = (vehicle.pricePerHour || 0) * totalHours;
    } else {
      totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      basePrice = vehicle.pricePerDay * totalDays;
    }

    const subtotal = basePrice;
    const taxes = subtotal * 0.1; // 10% tax
    const fees = subtotal * 0.05; // 5% service fee
    let discount = 0;
    let couponDiscount = 0;

    // Apply coupon discount
    if (couponCode) {
      const coupon = await this.validateAndApplyCoupon(couponCode, subtotal);
      if (coupon) {
        couponDiscount = coupon.discountAmount;
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
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      id: coupon.id,
      discountAmount,
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

  private calculateCancellationFee(booking: any): number {
    const now = new Date();
    const startDate = new Date(booking.startDate);
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilStart >= 48) {
      return 0; // Free cancellation
    } else if (hoursUntilStart >= 24) {
      return booking.totalAmount * 0.25; // 25% fee
    } else {
      return booking.totalAmount * 0.5; // 50% fee
    }
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
      [BookingStatus.COMPLETED]: [], // No transitions allowed
      [BookingStatus.CANCELLED]: [], // No transitions allowed
      [BookingStatus.REJECTED]: [], // No transitions allowed
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Additional role-based restrictions - FIXED: Use proper BookingStatus enum values
    if (userRole === Role.AGENT) {
      const agentAllowedTransitions: BookingStatus[] = [BookingStatus.ACTIVE, BookingStatus.COMPLETED];
      if (!agentAllowedTransitions.includes(newStatus)) {
        throw new ForbiddenException('Agents can only mark bookings as active or completed');
      }
    }
  }

  private async processRefund(paymentId: string, amount: number): Promise<void> {
    // Implement refund logic here
    // This would integrate with your payment provider
    console.log(`Processing refund of ${amount} for payment ${paymentId}`);
  }

  private getIncludeOptions(isPublic: boolean, userRole?: Role) {
    if (isPublic) {
      // For public access, only include basic vehicle info and no user data
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

    // For authenticated users, include full data
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
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          country: true,
        },
      },
      coupon: {
        select: {
          code: true,
          discountValue: true,
          discountType: true,
        },
      },
      payment: true,
    };
  }

  private enhanceBookingResponse(booking: any, userRole?: Role, isPublic = false): BookingResponse {
    const response: BookingResponse = {
      ...booking,
      isModifiable: !isPublic && this.isBookingModifiable(booking),
      isCancellable: !isPublic && this.isBookingCancellable(booking),
    };

    // For public access, remove sensitive information
    if (isPublic) {
      // Remove user information completely for public access
      delete response.user;
      // Remove sensitive booking details
      delete response.notes;
      delete response.cancellationReason;
      // Only show basic status and vehicle info
    }

    return response;
  }
}
