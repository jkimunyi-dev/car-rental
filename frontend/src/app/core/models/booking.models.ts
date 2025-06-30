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
  cancellationReason?: string;
  isModifiable: boolean;
  isCancellable: boolean;
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
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  coupon?: {
    code: string;
    discountValue: number;
    discountType: string;
  };
  couponId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingDto {
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  notes?: string;
  couponCode?: string;
  isHourlyBooking?: boolean;
}

export interface UpdateBookingDto {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  notes?: string;
}

export interface PricingBreakdownDto {
  basePrice: number;
  totalDays: number;
  totalHours?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  couponDiscount?: number;
  totalAmount: number;
  pricePerDay: number;
  pricePerHour?: number;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts?: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
  }>;
}

export interface CancelBookingDto {
  cancellationReason: string;
  requestRefund?: boolean;
}

export interface BookingStatusUpdateDto {
  status: BookingStatus;
  reason?: string;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface BookingSearchOptions {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  userId?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface BookingSearchResult {
  data: BookingResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}