import { Role, BookingStatus } from '@prisma/client';
import { BookingWithDetails } from '../bookings/booking.interface';
import { SafeUser } from '../users/user.interface';

/**
 * Admin Dashboard Analytics Interface
 */
export interface IAdminAnalytics {
  // Overview Metrics
  totalUsers: number;
  totalVehicles: number;
  totalBookings: number;
  totalRevenue: number;

  // Growth Metrics (compared to previous period)
  userGrowth: number;
  vehicleGrowth: number;
  bookingGrowth: number;
  revenueGrowth: number;

  // Status Breakdowns
  usersByRole: Record<Role, number>;
  bookingsByStatus: Record<BookingStatus, number>;
  vehiclesByStatus: Record<string, number>;

  // Time-based Metrics
  recentActivity: IRecentActivity[];
  monthlyRevenue: IMonthlyMetric[];
  monthlyBookings: IMonthlyMetric[];

  // Top Performers
  topVehicles: ITopVehicle[];
  topCustomers: ITopCustomer[];
}

export interface IRecentActivity {
  id: string;
  type: 'booking' | 'user' | 'payment' | 'vehicle';
  description: string;
  timestamp: Date;
  userId?: string;
  bookingId?: string;
  amount?: number;
}

export interface IMonthlyMetric {
  month: string;
  value: number;
  count?: number;
}

export interface ITopVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  bookingCount: number;
  totalRevenue: number;
  averageRating: number;
}

export interface ITopCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bookingCount: number;
  totalSpent: number;
  joinDate: Date;
}

/**
 * Admin User Management Interface
 */
export interface IAdminUserFilters {
  role?: Role;
  isActive?: boolean;
  isVerified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface IAdminUserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  newUsersThisMonth: number;
  usersByRole: Record<Role, number>;
  userGrowthTrend: Array<{
    month: string;
    total: number;
    new: number;
  }>;
}

export interface IBulkUserAction {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'verify' | 'unverify' | 'delete';
  reason?: string;
}

export interface IBulkActionResult {
  successful: string[];
  failed: Array<{
    userId: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

/**
 * Admin Booking Management Interface
 */
export interface IAdminBookingFilters {
  status?: BookingStatus;
  userId?: string;
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IAdminBookingStats {
  totalBookings: number;
  pendingApproval: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  bookingsByStatus: Record<BookingStatus, number>;
  revenueByMonth: IMonthlyMetric[];
}

export interface IBookingAction {
  bookingId: string;
  action: 'approve' | 'reject' | 'cancel' | 'complete';
  reason?: string;
  notes?: string;
}

export interface IBookingDispute {
  id: string;
  bookingId: string;
  customerId: string;
  type: 'damage' | 'billing' | 'service' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  resolution?: string;
  adminNotes?: string;
}

/**
 * System Settings Interface
 */
export interface ISystemSettings {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISystemSettingsCategory {
  category: string;
  displayName: string;
  description: string;
  settings: ISystemSettings[];
}

export interface IUpdateSystemSetting {
  key: string;
  value: string;
}

/**
 * Admin Reports Interface
 */
export interface IAdminReportFilters {
  type: 'revenue' | 'bookings' | 'users' | 'vehicles' | 'performance';
  dateFrom: string;
  dateTo: string;
  format?: 'json' | 'csv' | 'pdf';
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export interface IRevenueReport {
  totalRevenue: number;
  totalBookings: number;
  averageBookingValue: number;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    bookings: number;
  }>;
  revenueByVehicleCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  topRevenueVehicles: ITopVehicle[];
}

export interface IPerformanceReport {
  systemUptime: number;
  averageResponseTime: number;
  errorRate: number;
  activeUsers: number;
  peakUsageHours: Array<{
    hour: number;
    usage: number;
  }>;
  popularFeatures: Array<{
    feature: string;
    usage: number;
  }>;
}

/**
 * Complete Admin Service Interface
 */
export interface IAdminService {
  // Analytics
  getAnalytics(
    period?: 'day' | 'week' | 'month' | 'year',
  ): Promise<IAdminAnalytics>;

  // User Management
  getUsers(filters: IAdminUserFilters): Promise<{
    users: SafeUser[];
    stats: IAdminUserStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;

  updateUserRole(userId: string, role: Role): Promise<SafeUser>;
  updateUserStatus(userId: string, isActive: boolean): Promise<SafeUser>;
  bulkUserAction(action: IBulkUserAction): Promise<IBulkActionResult>;

  // Booking Management
  getBookings(filters: IAdminBookingFilters): Promise<{
    bookings: BookingWithDetails[];
    stats: IAdminBookingStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;

  handleBookingAction(action: IBookingAction): Promise<BookingWithDetails>;
  getDisputes(): Promise<IBookingDispute[]>;
  updateDispute(
    disputeId: string,
    updates: Partial<IBookingDispute>,
  ): Promise<IBookingDispute>;

  // System Settings
  getSystemSettings(): Promise<ISystemSettingsCategory[]>;
  updateSystemSetting(setting: IUpdateSystemSetting): Promise<ISystemSettings>;

  // Reports
  generateReport(filters: IAdminReportFilters): Promise<any>;
}

/**
 * Admin Dashboard Configuration
 */
export interface IAdminConfig {
  readonly maxBulkActionSize: number;
  readonly defaultPageSize: number;
  readonly maxPageSize: number;
  readonly reportRetentionDays: number;
  readonly systemSettingsCategories: string[];
}

/**
 * Admin Error Types
 */
export const ADMIN_ERRORS = {
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions for this operation',
    statusCode: 403,
  },
  BULK_ACTION_TOO_LARGE: {
    code: 'BULK_ACTION_TOO_LARGE',
    message: 'Bulk action size exceeds maximum allowed',
    statusCode: 400,
  },
  INVALID_SYSTEM_SETTING: {
    code: 'INVALID_SYSTEM_SETTING',
    message: 'Invalid system setting key or value',
    statusCode: 400,
  },
  REPORT_GENERATION_FAILED: {
    code: 'REPORT_GENERATION_FAILED',
    message: 'Failed to generate report',
    statusCode: 500,
  },
} as const;
