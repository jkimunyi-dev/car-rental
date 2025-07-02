import { IsOptional, IsEnum, IsString, IsBoolean, IsInt, Min, Max, IsArray, IsEmail, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Role, BookingStatus } from '@prisma/client';

export class GetAnalyticsDto {
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  period?: 'day' | 'week' | 'month' | 'year';
}

export class AdminUserFiltersDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class AdminUpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
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
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
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

export class UpdateSystemSettingDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}

export class GenerateReportDto {
  @IsEnum(['revenue', 'bookings', 'users', 'vehicles', 'performance'])
  type: 'revenue' | 'bookings' | 'users' | 'vehicles' | 'performance';

  @IsString()
  dateFrom: string;

  @IsString()
  dateTo: string;

  @IsOptional()
  @IsEnum(['json', 'csv', 'pdf'])
  format?: 'json' | 'csv' | 'pdf';

  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class UpdateUserAvatarDto {
  @IsString()
  userId: string;
}
