import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingResponseDto,
  BookingStatusUpdateDto,
  CancelBookingDto,
  PricingBreakdownDto,
} from './dto/create-booking.dto';
import { BookingStatus, Role, VehicleStatus } from '@prisma/client';
import {
  differenceInDays,
  differenceInHours,
  isBefore,
  isAfter,
  addHours,
} from 'date-fns';

interface BookingSearchOptions {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  userId?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  userRole?: Role;
}

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<BookingResponseDto> {
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
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
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

    return this.formatBookingResponse(booking);
  }

  async findAll(options: BookingSearchOptions) {
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
            },
          },
          coupon: {
            select: {
              code: true,
              discountValue: true,
              discountType: true,
            },
          },
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
  ): Promise<BookingResponseDto> {
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
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
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
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { vehicle: true },
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
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
      },
    });

    return this.formatBookingResponse(updatedBooking);
  }

  async updateStatus(
    id: string,
    statusUpdateDto: BookingStatusUpdateDto,
    userRole: Role,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { vehicle: true },
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
        // Update vehicle status to rented
        await this.prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.RENTED },
        });
        break;

      case BookingStatus.ACTIVE:
        // Booking is now active (customer picked up vehicle)
        await this.prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.RENTED },
        });
        break;

      case BookingStatus.COMPLETED:
        // Return vehicle to available status
        await this.prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
        break;

      case BookingStatus.CANCELLED:
      case BookingStatus.REJECTED:
        // Return vehicle to available status
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
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
      },
    });

    return this.formatBookingResponse(updatedBooking);
  }

  async cancel(
    id: string,
    cancelBookingDto: CancelBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { vehicle: true, payment: true },
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
          },
        },
        coupon: {
          select: {
            code: true,
            discountValue: true,
            discountType: true,
          },
        },
      },
    });

    // Return vehicle to available status
    await this.prisma.vehicle.update({
      where: { id: booking.vehicleId },
      data: { status: VehicleStatus.AVAILABLE },
    });

    // Handle refund if requested and payment exists
    if (cancelBookingDto.requestRefund && booking.payment && refundAmount > 0) {
      await this.processRefund(booking.payment.id, refundAmount);
    }

    return this.formatBookingResponse(updatedBooking);
  }

  async checkAvailability(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ available: boolean; conflicts?: any[] }> {
    try {
      await this.checkVehicleAvailability(
        vehicleId,
        new Date(startDate),
        new Date(endDate),
      );
      return { available: true };
    } catch (error) {
      if (error instanceof ConflictException) {
        // Get conflicting bookings for detailed response
        const conflicts = await this.prisma.booking.findMany({
          where: {
            vehicleId,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
            OR: [
              {
                AND: [
                  { startDate: { lte: new Date(endDate) } },
                  { endDate: { gte: new Date(startDate) } },
                ],
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

        return { available: false, conflicts };
      }
      throw error;
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

  // Private helper methods
  private validateBookingDates(
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
          'Start and end times are required for same-day bookings',
        );
      }

      const startDateTime = new Date(
        `${startDate.toDateString()} ${startTime}`,
      );
      const endDateTime = new Date(`${endDate.toDateString()} ${endTime}`);

      if (isAfter(startDateTime, endDateTime)) {
        throw new BadRequestException('Start time must be before end time');
      }

      if (isBefore(startDateTime, addHours(now, 1))) {
        throw new BadRequestException(
          'Booking must be at least 1 hour in advance',
        );
      }
    }
  }

  private async checkVehicleAvailability(
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
      throw new ConflictException(
        'Vehicle is not available for the selected dates',
      );
    }
  }

  private async calculatePricing(
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
      const startDateTime = new Date(
        `${startDate.toDateString()} ${startTime}`,
      );
      const endDateTime = new Date(`${endDate.toDateString()} ${endTime}`);
      totalHours = differenceInHours(endDateTime, startDateTime);
      basePrice = totalHours * vehicle.pricePerHour;
    } else {
      totalDays = Math.max(1, differenceInDays(endDate, startDate));
      basePrice = totalDays * vehicle.pricePerDay;
    }

    const subtotal = basePrice;
    const taxes = subtotal * 0.1; // 10% tax
    const fees = subtotal * 0.05; // 5% service fee
    let discount = 0;

    // Apply coupon discount if provided
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (coupon && this.isCouponValid(coupon, subtotal)) {
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
          }
        } else {
          discount = coupon.discountValue;
        }
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

  private async validateAndApplyCoupon(
    couponCode: string,
    subtotal: number,
  ): Promise<{ id: string; discountAmount: number } | null> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon || !this.isCouponValid(coupon, subtotal)) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return { id: coupon.id, discountAmount };
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
    return [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(
      booking.status,
    );
  }

  private isBookingCancellable(booking: any): boolean {
    return [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(
      booking.status,
    );
  }

  private calculateCancellationFee(booking: any): number {
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

  private validateStatusTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus,
    userRole: Role,
  ): void {
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

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Check role permissions for status changes
    if (userRole === Role.CUSTOMER) {
      const customerAllowedTransitions = [BookingStatus.CANCELLED];
      if (!customerAllowedTransitions.includes(newStatus)) {
        throw new ForbiddenException('Customers can only cancel bookings');
      }
    }
  }

  private async processRefund(
    paymentId: string,
    amount: number,
  ): Promise<void> {
    // Update payment record with refund information
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundAmount: amount,
        refundedAt: new Date(),
      },
    });

    // In a real implementation, you would integrate with payment processor here
    // For example, Stripe refund API call
  }

  private formatBookingResponse = (booking: any): BookingResponseDto => {
    return {
      ...booking,
      isModifiable: this.isBookingModifiable(booking),
      isCancellable: this.isBookingCancellable(booking),
    };
  };
}
