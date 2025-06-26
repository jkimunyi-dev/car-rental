import { Vehicle } from "./vehicle.model";

// src/app/core/models/booking.model.ts
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface Booking {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  totalHours?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  totalAmount: number;
  status: BookingStatus;
  notes?: string;
  vehicle: Vehicle;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  notes?: string;
  couponCode?: string;
}