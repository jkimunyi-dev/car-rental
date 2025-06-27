import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  BookingResponse,
  IBookingService,
  IBookingSearchOptions,
  IBookingSearchResult,
  IBookingAvailabilityResult,
  ICouponValidationResult,
} from './booking.interface';
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingStatusUpdateDto,
  CancelBookingDto,
  PricingBreakdownDto,
} from './dto/create-booking.dto';
import { Role, VehicleStatus, BookingStatus } from '@prisma/client';
import { differenceInHours, isBefore, isAfter } from 'date-fns';

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
    await this.checkVehicleAvailability(vehicleId, startDate, endDate);

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
    const pricing = await this.calculatePricing(
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
      booking: booking as any, // Type assertion for email context
      supportUrl: `${process.env.FRONTEND_URL}/support`,
      policyUrl: `${process.env.FRONTEND_URL}/policies`,
    });

    return this.formatBookingResponse(booking);
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
    } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (vehicleId) where.vehicleId = vehicleId;

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({ startDate: { gte: new Date(startDate) } });
      }
      if (endDate) {
        where.AND.push({ endDate: { lte: new Date(endDate) } });
      }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map(this.formatBookingResponse),
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
    const booking = await this.prisma.booking.findUnique({
      where: { id },
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

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check access permissions
    if (userRole === Role.CUSTOMER && booking.userId !== userId) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    return this.formatBookingResponse(booking);
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { vehicle: true, user: true, payment: true, coupon: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (userRole === Role.CUSTOMER && booking.userId !== userId) {
      throw new ForbiddenException('You can only modify your own bookings');
    }

    // Check if booking is modifiable
    if (!this.isBookingModifiable(booking)) {
      throw new BadRequestException(
        'Booking cannot be modified in its current state',
      );
    }

    const updateData: any = {};
    let recalculatePricing = false;

    // Handle date changes
    if (updateBookingDto.startDate || updateBookingDto.endDate) {
      const newStartDate = updateBookingDto.startDate
        ? new Date(updateBookingDto.startDate)
        : booking.startDate;
      const newEndDate = updateBookingDto.endDate
        ? new Date(updateBookingDto.endDate)
        : booking.endDate;

      this.validateBookingDates(newStartDate, newEndDate);

      // Check availability for new dates (excluding current booking)
      await this.checkVehicleAvailability(
        booking.vehicleId,
        newStartDate,
        newEndDate,
        id,
      );

      updateData.startDate = newStartDate;
      updateData.endDate = newEndDate;
      recalculatePricing = true;
    }

    // Handle time changes
    if (updateBookingDto.startTime !== undefined) {
      updateData.startTime = updateBookingDto.startTime;
      recalculatePricing = true;
    }
    if (updateBookingDto.endTime !== undefined) {
      updateData.endTime = updateBookingDto.endTime;
      recalculatePricing = true;
    }

    // Handle location changes
    if (updateBookingDto.pickupLocation) {
      updateData.pickupLocation = updateBookingDto.pickupLocation;
    }
    if (updateBookingDto.dropoffLocation !== undefined) {
      updateData.dropoffLocation = updateBookingDto.dropoffLocation;
    }
    if (updateBookingDto.notes !== undefined) {
      updateData.notes = updateBookingDto.notes;
    }

    // Recalculate pricing if dates/times changed
    if (recalculatePricing) {
      const pricing = await this.calculatePricing(
        booking.vehicle,
        updateData.startDate || booking.startDate,
        updateData.endDate || booking.endDate,
        updateData.startTime || booking.startTime,
        updateData.endTime || booking.endTime,
        !!booking.totalHours,
      );

      Object.assign(updateData, {
        totalDays: pricing.totalDays,
        totalHours: pricing.totalHours,
        subtotal: pricing.subtotal,
        taxes: pricing.taxes,
        fees: pricing.fees,
        totalAmount: pricing.totalAmount - booking.discount,
      });
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateData,
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

    return this.formatBookingResponse(updatedBooking);
  }

  async updateStatus(
    id: string,
    statusUpdateDto: BookingStatusUpdateDto,
    userRole: Role,
  ): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { vehicle: true, user: true, payment: true, coupon: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate status transition
    this.validateStatusTransition(
      booking.status,
      statusUpdateDto.status,
      userRole,
    );

    const updateData: any = {
      status: statusUpdateDto.status,
      updatedAt: new Date(),
    };

    // Handle specific status changes
    switch (statusUpdateDto.status) {
      case BookingStatus.CONFIRMED:
        await this.prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.RENTED },
        });
        break;
      case BookingStatus.ACTIVE:
        await this.prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.RENTED },
        });
        break;
      case BookingStatus.COMPLETED:
        await this.prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
        break;
      case BookingStatus.CANCELLED:
      case BookingStatus.REJECTED:
        await this.prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
        if (statusUpdateDto.reason) {
          updateData.cancellationReason = statusUpdateDto.reason;
        }
        break;
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateData,
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

    return this.formatBookingResponse(updatedBooking);
  }

  async cancel(
    id: string,
    cancelBookingDto: CancelBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        payment: true,
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
        coupon: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (userRole === Role.CUSTOMER && booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    // Check if booking is cancellable
    if (!this.isBookingCancellable(booking)) {
      throw new BadRequestException(
        'Booking cannot be cancelled in its current state',
      );
    }

    // Calculate cancellation fees based on timing
    const cancellationFee = this.calculateCancellationFee(booking);
    const refundAmount = booking.totalAmount - cancellationFee;

    // Update booking status
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancelBookingDto.cancellationReason,
        updatedAt: new Date(),
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

    // Return vehicle to available status
    await this.prisma.vehicle.update({
      where: { id: booking.vehicleId },
      data: { status: VehicleStatus.AVAILABLE },
    });

    // Handle refund if requested and payment exists
    if (cancelBookingDto.requestRefund && booking.payment && refundAmount > 0) {
      // Implement refund logic here
      await this.processRefund(booking.payment.id, refundAmount);
    }

    // Send cancellation email
    await this.emailService.sendBookingCancellation({
      user: booking.user,
      booking: updatedBooking as any, // Type assertion for email context
      cancellationReason: cancelBookingDto.cancellationReason,
      refundAmount,
      refundProcessingDays: 5,
    });

    return this.formatBookingResponse(updatedBooking);
  }

  async checkAvailability(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<IBookingAvailabilityResult> {
    try {
      await this.checkVehicleAvailability(
        vehicleId,
        new Date(startDate),
        new Date(endDate),
      );
      return { available: true };
    } catch {
      // Remove unused error parameter
      return {
        available: false,
        conflicts: [], // You could populate this with actual conflicts
      };
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
  ): Promise<PricingBreakdownDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const pricing = await this.calculatePricing(
      vehicle,
      new Date(startDate),
      new Date(endDate),
      startTime,
      endTime,
      isHourlyBooking,
      couponCode,
    );

    return pricing;
  }

  // Helper methods
  validateBookingDates(
    startDate: Date,
    endDate: Date,
    startTime?: string,
    endTime?: string,
  ): void {
    const now = new Date();

    if (isBefore(startDate, now)) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    if (isAfter(startDate, endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // For same-day bookings, validate times
    if (startDate.toDateString() === endDate.toDateString()) {
      if (!startTime || !endTime) {
        throw new BadRequestException(
          'Times are required for same-day bookings',
        );
      }
      if (startTime >= endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }
  }

  async checkVehicleAvailability(
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

    if (!vehicle.isActive) {
      throw new BadRequestException('Vehicle is not active');
    }

    // Check for overlapping bookings
    const whereClause: any = {
      vehicleId,
      status: {
        in: [
          BookingStatus.CONFIRMED,
          BookingStatus.ACTIVE,
          BookingStatus.PENDING,
        ],
      },
      OR: [
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } },
          ],
        },
      ],
    };

    if (excludeBookingId) {
      whereClause.id = { not: excludeBookingId };
    }

    const conflictingBookings = await this.prisma.booking.findMany({
      where: whereClause,
    });

    if (conflictingBookings.length > 0) {
      throw new BadRequestException(
        'Vehicle is not available for the selected dates',
      );
    }
  }

  async calculatePricing(
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

    if (isHourlyBooking && startTime && endTime && vehicle.pricePerHour) {
      // Calculate hours between start and end time
      const start = new Date(`${startDate.toDateString()} ${startTime}`);
      const end = new Date(`${endDate.toDateString()} ${endTime}`);
      totalHours = differenceInHours(end, start);
      basePrice = totalHours * vehicle.pricePerHour;
    } else {
      // Calculate days
      totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (totalDays === 0) totalDays = 1; // Minimum 1 day
      basePrice = totalDays * vehicle.pricePerDay;
    }

    const subtotal = basePrice;
    const taxes = subtotal * 0.1; // 10% tax
    const fees = subtotal * 0.05; // 5% service fee
    let discount = 0;

    // Apply coupon discount if provided
    if (couponCode) {
      const couponValidation = await this.validateAndApplyCoupon(
        couponCode,
        subtotal,
      );
      if (couponValidation) {
        discount = couponValidation.discountAmount;
      }
    }

    const totalAmount = subtotal + taxes + fees - discount;

    return {
      basePrice,
      totalDays,
      totalHours: isHourlyBooking ? totalHours : undefined,
      subtotal,
      taxes,
      fees,
      discount,
      totalAmount,
      pricePerDay: vehicle.pricePerDay,
      pricePerHour: vehicle.pricePerHour,
    };
  }

  async validateAndApplyCoupon(
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
      discountAmount = subtotal * (coupon.discountValue / 100);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return { id: coupon.id, discountAmount };
  }

  isCouponValid(coupon: any, subtotal: number): boolean {
    const now = new Date();

    return (
      coupon.isActive &&
      coupon.validFrom <= now &&
      coupon.validUntil >= now &&
      (!coupon.minAmount || subtotal >= coupon.minAmount) &&
      (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
    );
  }

  isBookingModifiable(booking: any): boolean {
    return [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(
      booking.status,
    );
  }

  isBookingCancellable(booking: any): boolean {
    return [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(
      booking.status,
    );
  }

  calculateCancellationFee(booking: any): number {
    const now = new Date();
    const hoursUntilStart = differenceInHours(booking.startDate, now);

    // Cancellation policy
    if (hoursUntilStart >= 48) {
      return 0; // Free cancellation
    } else if (hoursUntilStart >= 24) {
      return booking.totalAmount * 0.1; // 10% fee
    } else if (hoursUntilStart >= 2) {
      return booking.totalAmount * 0.25; // 25% fee
    } else {
      return booking.totalAmount * 0.5; // 50% fee
    }
  }

  validateStatusTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus,
    userRole: Role,
  ): void {
    // Implement status transition validation logic
    // This is a simplified version - you can expand based on your business rules
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CONFIRMED]: [
        BookingStatus.ACTIVE,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.ACTIVE]: [BookingStatus.COMPLETED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.REJECTED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Role-based restrictions - Fix the type check
    if (
      userRole === Role.CUSTOMER &&
      (newStatus === BookingStatus.CONFIRMED ||
        newStatus === BookingStatus.REJECTED)
    ) {
      throw new ForbiddenException(
        'Only admins can confirm or reject bookings',
      );
    }
  }

  async processRefund(paymentId: string, amount: number): Promise<void> {
    // Implement refund logic here
    // This would typically involve calling a payment service
    console.log(`Processing refund of $${amount} for payment ${paymentId}`);
  }

  formatBookingResponse = (booking: any): BookingResponse => {
    return {
      ...booking,
      user: booking.user
        ? {
            id: booking.user.id,
            firstName: booking.user.firstName,
            lastName: booking.user.lastName,
            email: booking.user.email,
            phone: booking.user.phone,
            address: booking.user.address,
            city: booking.user.city,
            country: booking.user.country,
          }
        : undefined,
      vehicle: booking.vehicle
        ? {
            id: booking.vehicle.id,
            make: booking.vehicle.make,
            model: booking.vehicle.model,
            year: booking.vehicle.year,
            licensePlate: booking.vehicle.licensePlate,
            images: booking.vehicle.images,
            category: booking.vehicle.category,
            location: booking.vehicle.location,
          }
        : undefined,
    };
  };
}
