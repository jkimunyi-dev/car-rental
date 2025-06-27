import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  IsDateString,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Role, BookingStatus } from '@prisma/client';

/**
 * Analytics DTOs
 */
export class GetAnalyticsDto {
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  period?: 'day' | 'week' | 'month' | 'year';
}

/**
 * User Management DTOs
 */
export class AdminUserFiltersDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkUserActionDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsEnum(['activate', 'deactivate', 'verify', 'unverify', 'delete'])
  action: 'activate' | 'deactivate' | 'verify' | 'unverify' | 'delete';

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Booking Management DTOs
 */
export class AdminBookingFiltersDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class BookingActionDto {
  @IsEnum(['approve', 'reject', 'cancel', 'complete'])
  action: 'approve' | 'reject' | 'cancel' | 'complete';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDisputeDto {
  @IsOptional()
  @IsEnum(['open', 'investigating', 'resolved', 'closed'])
  status?: 'open' | 'investigating' | 'resolved' | 'closed';

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

/**
 * System Settings DTOs
 */
export class UpdateSystemSettingDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}

/**
 * Report Generation DTOs
 */
export class GenerateReportDto {
  @IsEnum(['revenue', 'bookings', 'users', 'vehicles', 'performance'])
  type: 'revenue' | 'bookings' | 'users' | 'vehicles' | 'performance';

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsOptional()
  @IsEnum(['json', 'csv', 'pdf'])
  format?: 'json' | 'csv' | 'pdf';

  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

/**
 * Response DTOs
 */
export class AdminAnalyticsResponseDto {
  totalUsers: number;
  totalVehicles: number;
  totalBookings: number;
  totalRevenue: number;
  userGrowth: number;
  vehicleGrowth: number;
  bookingGrowth: number;
  revenueGrowth: number;
  usersByRole: Record<Role, number>;
  bookingsByStatus: Record<BookingStatus, number>;
  vehiclesByStatus: Record<string, number>;
  recentActivity: any[];
  monthlyRevenue: any[];
  monthlyBookings: any[];
  topVehicles: any[];
  topCustomers: any[];
}

export class AdminUsersResponseDto {
  users: any[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    newUsersThisMonth: number;
    usersByRole: Record<Role, number>;
    userGrowthTrend: any[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AdminBookingsResponseDto {
  bookings: any[];
  stats: {
    totalBookings: number;
    pendingApproval: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    averageBookingValue: number;
    bookingsByStatus: Record<BookingStatus, number>;
    revenueByMonth: any[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
