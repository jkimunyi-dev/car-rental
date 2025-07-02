export interface BookingResponse {
  id: string;
  userId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  phoneNumber: string; // Add this field
  totalDays: number;
  totalHours?: number;
  pricePerDay: number;
  pricePerHour?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  totalAmount: number;
  status: BookingStatus;
  notes?: string;
  specialRequests?: string;
  insuranceLevel?: string;
  cancellationReason?: string;
  bookingReference?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  vehicle?: any;
  payment?: any;
  coupon?: any;
  isModifiable?: boolean;
  isCancellable?: boolean;
  canRate?: boolean;
}

export interface CreateBookingDto {
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  phoneNumber: string; // Make this required
  notes?: string;
  couponCode?: string;
  isHourlyBooking?: boolean;
  specialRequests?: string;
  insuranceLevel?: 'BASIC' | 'COMPREHENSIVE' | 'PREMIUM';
  driverAge?: number;
  additionalDrivers?: AdditionalDriver[];
}

export interface AdditionalDriver {
  firstName: string;
  lastName: string;
  licenseNumber: string;
  age: number;
}

export interface UpdateBookingDto {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  notes?: string;
  specialRequests?: string;
  insuranceLevel?: 'BASIC' | 'COMPREHENSIVE' | 'PREMIUM';
  additionalDrivers?: AdditionalDriver[];
}

export interface BookingStatusUpdateDto {
  status: BookingStatus;
  reason?: string;
}

export interface CancelBookingDto {
  cancellationReason: string;
  requestRefund?: boolean;
}

export interface PricingBreakdownDto {
  basePrice: number;
  totalDays: number;
  totalHours?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  insuranceFee?: number;
  discount: number;
  couponDiscount?: number;
  totalAmount: number;
  pricePerDay: number;
  pricePerHour?: number;
  breakdown?: {
    vehicleRental: number;
    insurance: number;
    taxes: number;
    serviceFees: number;
    discounts: number;
    finalTotal: number;
  };
}

export interface AvailabilityResult {
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

export interface BookingSearchOptions {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  search?: string;
}

export interface BookingSearchResult {
  data: BookingResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}