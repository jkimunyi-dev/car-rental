import {
  Booking as PrismaBooking,
  BookingStatus,
  Role,
  Prisma,
} from '@prisma/client';
import { ApiResponse, PaginatedResponse } from '../common/dto/api-response.dto';
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

// Enhanced booking response with relations
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
        avatar: true;
        licenseNumber: true;
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
        pricePerDay: true;
        pricePerHour: true;
        features: true;
        status: true;
      };
    };
    payment: true;
    coupon: {
      select: {
        id: true;
        code: true;
        discountValue: true;
        discountType: true;
        description: true;
      };
    };
  };
}>;

// Enhanced booking response interface
export interface BookingResponseData extends PrismaBooking {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    avatar?: string;
    licenseNumber?: string;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    images?: any[];
    category?: string;
    location?: string;
    pricePerDay?: number;
    pricePerHour?: number;
    features?: string[];
    status?: string;
  };
  payment?: any;
  coupon?: {
    id: string;
    code: string;
    discountValue: number;
    discountType: string;
    description?: string;
  };
  isModifiable?: boolean;
  isCancellable?: boolean;
  canRate?: boolean;
  estimatedTotal?: number;
}

// API Response types using the wrapper
export type BookingApiResponse = ApiResponse<BookingResponseData>;
export type BookingsListApiResponse = ApiResponse<PaginatedResponse<BookingResponseData>>;
export type BookingAvailabilityApiResponse = ApiResponse<IBookingAvailabilityResult>;
export type BookingPricingApiResponse = ApiResponse<PricingBreakdownDto>;

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
  isPublic?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateRange?: 'today' | 'week' | 'month' | 'year';
  location?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Booking Availability Check Result Interface
 */
export interface IBookingAvailabilityResult {
  available: boolean;
  vehicleId: string;
  requestedPeriod: {
    startDate: string;
    endDate: string;
  };
  conflicts?: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    status: BookingStatus;
    bookingReference?: string;
  }>;
  suggestedAlternatives?: Array<{
    startDate: Date;
    endDate: Date;
    available: boolean;
  }>;
  nextAvailableDate?: Date;
}

/**
 * Coupon Validation Result Interface
 */
export interface ICouponValidationResult {
  id: string;
  code: string;
  discountAmount: number;
  discountType: string;
  isValid: boolean;
  validationMessage?: string;
}

/**
 * Booking Search Result Interface
 */
export interface IBookingSearchResult {
  data: BookingResponseData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Core Booking Operations Interface
 */
export interface IBookingOperations {
  create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<BookingApiResponse>;

  findAll(options: IBookingSearchOptions): Promise<BookingsListApiResponse>;

  findOne(
    id: string,
    userId?: string,
    userRole?: Role,
  ): Promise<BookingApiResponse>;

  update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingApiResponse>;

  updateStatus(
    id: string,
    statusUpdateDto: BookingStatusUpdateDto,
    userRole: Role,
  ): Promise<BookingApiResponse>;

  cancel(
    id: string,
    cancelBookingDto: CancelBookingDto,
    userId: string,
    userRole: Role,
  ): Promise<BookingApiResponse>;
}

/**
 * Booking Availability Interface
 */
export interface IBookingAvailability {
  checkAvailability(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<BookingAvailabilityApiResponse>;
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
  ): Promise<BookingPricingApiResponse>;
}

/**
 * Complete Booking Service Interface
 */
export interface IBookingService
  extends IBookingOperations,
    IBookingAvailability,
    IBookingPricing {
  // Statistics and analytics
  getBookingStatistics(
    userId?: string,
    userRole?: Role,
  ): Promise<ApiResponse<IBookingStatistics>>;
  
  // Bulk operations
  bulkUpdateStatus(
    bookingIds: string[],
    status: BookingStatus,
    userRole: Role,
  ): Promise<ApiResponse<IBulkUpdateResult>>;
}

/**
 * Additional interfaces for enhanced functionality
 */
export interface IBookingStatistics {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  bookingsByStatus: Record<BookingStatus, number>;
  bookingsByMonth: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
  topVehicles: Array<{
    vehicleId: string;
    make: string;
    model: string;
    bookingCount: number;
    revenue: number;
  }>;
  customerMetrics: {
    newCustomers: number;
    repeatCustomers: number;
    customerRetentionRate: number;
  };
}

export interface IBulkUpdateResult {
  successful: string[];
  failed: Array<{
    bookingId: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
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
  readonly insuranceRates: {
    basic: number;
    comprehensive: number;
    premium: number;
  };
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
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions for this operation',
    statusCode: 403,
  },
  INVALID_COUPON: {
    code: 'INVALID_COUPON',
    message: 'Invalid or expired coupon code',
    statusCode: 400,
  },
  PAYMENT_REQUIRED: {
    code: 'PAYMENT_REQUIRED',
    message: 'Payment is required to complete the booking',
    statusCode: 402,
  },
} as const;
