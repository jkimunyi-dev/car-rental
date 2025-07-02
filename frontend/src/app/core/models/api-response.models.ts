import { VehicleWithStats } from "./vehicle.models";

// API Response wrapper interfaces to match your backend
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Vehicle-specific API response types
export interface VehicleListApiResponse extends ApiResponse<PaginatedResponse<VehicleWithStats>> {}

export interface VehicleResponseApiResponse extends ApiResponse<VehicleWithStats> {}