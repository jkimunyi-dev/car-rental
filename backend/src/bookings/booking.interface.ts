import {
  Booking as PrismaBooking,
  BookingStatus,
  Role,
  Prisma,
} from '@prisma/client';
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingStatusUpdateDto,
  CancelBookingDto,
  PricingBreakdownDto,
} from './dto/create-booking.dto';

// Use Prisma's generated types
export type Booking = PrismaBooking;

export type CreateBookingData = Omit<
  Prisma.BookingCreateInput,
  'user' | 'vehicle' | 'payment' | 'coupon'
> & {
  userId: string;
  vehicleId: string;
  couponId?: string;
};

export type UpdateBookingData = Omit<
  Prisma.BookingUpdateInput,
  'user' | 'vehicle' | 'payment' | 'coupon'
>;

// Use Prisma's payload types for relations
export type BookingWithDetails = Prisma.BookingGetPayload<{
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
        images: true;
        category: true;
        location: true;
      };
    };
    payment: true;
    coupon: true;
  };
}>;

// Use a single response type that extends PrismaBooking
export interface BookingResponse extends PrismaBooking {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    country?: string;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    images?: string[];
    category?: string;
    location?: string;
  };
  payment?: any;
  coupon?: {
    code: string;
    discountValue: number;
    discountType: string;
  };
}

// Remove BookingResponseDto and use BookingResponse everywhere
export type BookingResponseDto = BookingResponse;

/**
 * Booking Search Options Interface
 */
export interface IBookingSearchOptions {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  userId?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  userRole?: Role;
}

/**
 * Booking Availability Check Result Interface
 */
export interface IBookingAvailabilityResult {
  available: boolean;
  conflicts?: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    status: BookingStatus;
  }>;
}

/**
 * Coupon Validation Result Interface
 */
export interface ICouponValidationResult {
  id: string;
  discountAmount: number;
}

/**
 * Booking Search Result Interface
 */
export interface IBookingSearchResult {
  data: BookingResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Core Booking Operations Interface
 */
export interface IBookingOperations {
  create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<BookingResponse>;

  findAll(options: IBookingSearchOptions): Promise<IBookingSearchResult>;

  findOne(
    id: string,
    userId?: string,
    userRole?: Role,
  ): Promise<BookingResponse>;

  update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingResponse>;

  updateStatus(
    id: string,
    statusUpdateDto: BookingStatusUpdateDto,
    userRole: Role,
  ): Promise<BookingResponse>;

  cancel(
    id: string,
    cancelBookingDto: CancelBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingResponse>;
}

/**
 * Booking Availability Interface
 */
export interface IBookingAvailability {
  checkAvailability(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<IBookingAvailabilityResult>;

  checkVehicleAvailability(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ): Promise<void>;
}

/**
 * Booking Pricing Interface
 */
export interface IBookingPricing {
  calculateBookingPrice(
    vehicleId: string,
    startDate: string,
    endDate: string,
    startTime?: string,
    endTime?: string,
    isHourlyBooking?: boolean,
    couponCode?: string,
  ): Promise<PricingBreakdownDto>;

  calculatePricing(
    vehicle: any,
    startDate: Date,
    endDate: Date,
    startTime?: string,
    endTime?: string,
    isHourlyBooking?: boolean,
    couponCode?: string,
  ): Promise<PricingBreakdownDto>;
}

/**
 * Complete Booking Service Interface
 */
export interface IBookingService
  extends IBookingOperations,
    IBookingAvailability,
    IBookingPricing {
  // Add any additional methods specific to the service
}

/**
 * Booking Configuration Interface
 */
export interface IBookingConfig {
  readonly minimumAdvanceBookingHours: number;
  readonly maxBookingDurationDays: number;
  readonly cancellationPolicyHours: {
    free: number;
    lowFee: number;
    mediumFee: number;
    highFee: number;
  };
  readonly cancellationFeeRates: {
    low: number;
    medium: number;
    high: number;
  };
  readonly taxRate: number;
  readonly serviceFeeRate: number;
}

/**
 * Booking Error Types
 */
export const BOOKING_ERRORS = {
  VEHICLE_NOT_FOUND: {
    code: 'VEHICLE_NOT_FOUND',
    message: 'Vehicle not found',
    statusCode: 404,
  },
  VEHICLE_NOT_AVAILABLE: {
    code: 'VEHICLE_NOT_AVAILABLE',
    message: 'Vehicle is not available for booking',
    statusCode: 400,
  },
  BOOKING_NOT_FOUND: {
    code: 'BOOKING_NOT_FOUND',
    message: 'Booking not found',
    statusCode: 404,
  },
  BOOKING_NOT_MODIFIABLE: {
    code: 'BOOKING_NOT_MODIFIABLE',
    message: 'Booking cannot be modified in its current state',
    statusCode: 400,
  },
  INVALID_DATES: {
    code: 'INVALID_DATES',
    message: 'Invalid booking dates provided',
    statusCode: 400,
  },
  VEHICLE_CONFLICT: {
    code: 'VEHICLE_CONFLICT',
    message: 'Vehicle is not available for the selected dates',
    statusCode: 409,
  },
} as const;
