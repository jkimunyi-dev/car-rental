import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import * as bcrypt from 'bcryptjs';
import {
  IAdminService,
  IAdminAnalytics,
  IAdminUserFilters,
  IAdminBookingFilters,
  IRecentActivity,
  IMonthlyMetric,
  ITopVehicle,
  ITopCustomer,
  IAdminUserStats,
  IAdminBookingStats,
  IBulkUserAction,
  IBulkActionResult,
  IBookingAction,
  IBookingDispute,
  ISystemSettings,
  ISystemSettingsCategory,
  IUpdateSystemSetting,
  IAdminReportFilters,
  IRevenueReport,
  IPerformanceReport,
  ADMIN_ERRORS,
} from './admin.interface';
import { Role, BookingStatus, VehicleStatus } from '@prisma/client';
import { SafeUser } from '../users/user.interface';
import { BookingWithDetails } from '../bookings/booking.interface';

@Injectable()
export class AdminService implements IAdminService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async getAnalytics(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Promise<IAdminAnalytics> {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);
    const previousPeriodStart = this.getPeriodStart(periodStart, period);

    // Get current period metrics
    const [totalUsers, totalVehicles, totalBookings] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vehicle.count(),
      this.prisma.booking.count(),
    ]);

    // Get total revenue
    const totalRevenueResult = await this.prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const totalRevenue = totalRevenueResult._sum.amount || 0;

    // Get growth metrics
    const [userGrowth, vehicleGrowth, bookingGrowth, revenueGrowth] =
      await Promise.all([
        this.calculateGrowth('user', periodStart, previousPeriodStart),
        this.calculateGrowth('vehicle', periodStart, previousPeriodStart),
        this.calculateGrowth('booking', periodStart, previousPeriodStart),
        this.calculateRevenueGrowth(periodStart, previousPeriodStart),
      ]);

    // Get breakdowns
    const [usersByRole, bookingsByStatus, vehiclesByStatus] = await Promise.all(
      [
        this.getUsersByRole(),
        this.getBookingsByStatus(),
        this.getVehiclesByStatus(),
      ],
    );

    // Get time-based metrics
    const [recentActivity, monthlyRevenue, monthlyBookings] = await Promise.all(
      [
        this.getRecentActivity(),
        this.getMonthlyRevenue(),
        this.getMonthlyBookings(),
      ],
    );

    // Get top performers
    const [topVehicles, topCustomers] = await Promise.all([
      this.getTopVehicles(),
      this.getTopCustomers(),
    ]);

    return {
      totalUsers,
      totalVehicles,
      totalBookings,
      totalRevenue,
      userGrowth,
      vehicleGrowth,
      bookingGrowth,
      revenueGrowth,
      usersByRole,
      bookingsByStatus,
      vehiclesByStatus,
      recentActivity,
      monthlyRevenue,
      monthlyBookings,
      topVehicles,
      topCustomers,
    };
  }

  async getUsers(filters: IAdminUserFilters) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (typeof isVerified === 'boolean') where.isVerified = isVerified;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          isVerified: true,
          avatar: true,
          address: true,
          city: true,
          country: true,
          zipCode: true,
          createdAt: true,
          updatedAt: true,
          licenseNumber: true, // Include licenseNumber in user selection
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Get user stats
    const stats = await this.getUserStats();

    return {
      users: users as SafeUser[],
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserRole(userId: string, role: Role): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        avatar: true,
        address: true,
        city: true,
        country: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
        licenseNumber: true, // Include licenseNumber in user selection
      },
    });

    return updatedUser as SafeUser;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        avatar: true,
        address: true,
        city: true,
        country: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
        licenseNumber: true, // Include licenseNumber in user selection
      },
    });

    return updatedUser as SafeUser;
  }

  async bulkUserAction(action: IBulkUserAction): Promise<IBulkActionResult> {
    const { userIds, action: actionType, reason } = action;

    if (userIds.length > 100) {
      throw new BadRequestException(ADMIN_ERRORS.BULK_ACTION_TOO_LARGE.message);
    }

    const results: IBulkActionResult = {
      successful: [],
      failed: [],
      total: userIds.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const userId of userIds) {
      try {
        switch (actionType) {
          case 'activate':
            await this.prisma.user.update({
              where: { id: userId },
              data: { isActive: true },
            });
            break;
          case 'deactivate':
            await this.prisma.user.update({
              where: { id: userId },
              data: { isActive: false },
            });
            break;
          case 'verify':
            await this.prisma.user.update({
              where: { id: userId },
              data: { isVerified: true },
            });
            break;
          case 'unverify':
            await this.prisma.user.update({
              where: { id: userId },
              data: { isVerified: false },
            });
            break;
          case 'delete':
            await this.prisma.user.delete({ where: { id: userId } });
            break;
        }
        results.successful.push(userId);
        results.successCount++;
      } catch (error) {
        results.failed.push({
          userId,
          error: error.message,
        });
        results.failureCount++;
      }
    }

    return results;
  }

  async getBookings(filters: IAdminBookingFilters) {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      vehicleId,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount) where.totalAmount.gte = minAmount;
      if (maxAmount) where.totalAmount.lte = maxAmount;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { vehicle: { make: { contains: search, mode: 'insensitive' } } },
        { vehicle: { model: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get bookings and total count
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              country: true,
              avatar: true,
              licenseNumber: true,
            },
          },
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
              pricePerDay: true,    // Add missing field
              pricePerHour: true,   // Add missing field
              status: true,         // Add missing field
              features: true,       // Add missing field
            },
          },
          payment: true,
          coupon: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    // Get booking stats
    const stats = await this.getBookingStats();

    return {
      bookings: bookings as BookingWithDetails[],
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async handleBookingAction(
    action: IBookingAction,
  ): Promise<BookingWithDetails> {
    const { bookingId, action: actionType, reason, notes } = action;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
            avatar: true,
            licenseNumber: true,
          },
        },
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
            pricePerDay: true,    // Add missing field
            pricePerHour: true,   // Add missing field
            status: true,         // Add missing field
            features: true,       // Add missing field
          },
        },
        payment: true,
        coupon: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    let newStatus: BookingStatus;
    switch (actionType) {
      case 'approve':
        newStatus = BookingStatus.CONFIRMED;
        break;
      case 'reject':
        newStatus = BookingStatus.REJECTED;
        break;
      case 'cancel':
        newStatus = BookingStatus.CANCELLED;
        break;
      case 'complete':
        newStatus = BookingStatus.COMPLETED;
        break;
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        cancellationReason: reason,
        notes: notes || booking.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
            avatar: true,
            licenseNumber: true,
          },
        },
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
            pricePerDay: true,    // Add missing field
            pricePerHour: true,   // Add missing field
            status: true,         // Add missing field
            features: true,       // Add missing field
          },
        },
        payment: true,
        coupon: true,
      },
    });

    return updatedBooking as BookingWithDetails;
  }

  async getDisputes(): Promise<IBookingDispute[]> {
    // This would typically come from a disputes table
    // For now, returning empty array as the disputes table isn't in the schema
    return [];
  }

  async updateDispute(
    _disputeId: string,
    _updates: Partial<IBookingDispute>,
  ): Promise<IBookingDispute> {
    // This would update a dispute record
    // For now, throwing not implemented
    throw new Error(
      'Disputes feature not implemented - requires disputes table',
    );
  }

  async getSystemSettings(): Promise<ISystemSettingsCategory[]> {
    const settings = await this.prisma.systemSettings.findMany({
      orderBy: { key: 'asc' },
    });

    // Group settings by category (derived from key prefix)
    const categorizedSettings: Record<string, ISystemSettings[]> = {};

    settings.forEach((setting) => {
      const category = setting.key.split('.')[0] || 'general';
      if (!categorizedSettings[category]) {
        categorizedSettings[category] = [];
      }

      categorizedSettings[category].push({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        category,
        type: this.inferSettingType(setting.value),
        isEditable: true,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      });
    });

    // Convert to category format
    return Object.entries(categorizedSettings).map(([category, settings]) => ({
      category,
      displayName: this.getCategoryDisplayName(category),
      description: this.getCategoryDescription(category),
      settings,
    }));
  }

  async updateSystemSetting(
    setting: IUpdateSystemSetting,
  ): Promise<ISystemSettings> {
    const { key, value } = setting;

    const updatedSetting = await this.prisma.systemSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return {
      id: updatedSetting.id,
      key: updatedSetting.key,
      value: updatedSetting.value,
      category: updatedSetting.key.split('.')[0] || 'general',
      type: this.inferSettingType(updatedSetting.value),
      isEditable: true,
      createdAt: updatedSetting.createdAt,
      updatedAt: updatedSetting.updatedAt,
    };
  }

  async generateReport(filters: IAdminReportFilters): Promise<any> {
    const {
      type,
      dateFrom,
      dateTo,
      format = 'json',
      groupBy = 'month',
    } = filters;

    switch (type) {
      case 'revenue':
        return this.generateRevenueReport(dateFrom, dateTo, groupBy);
      case 'bookings':
        return this.generateBookingsReport(dateFrom, dateTo, groupBy);
      case 'users':
        return this.generateUsersReport(dateFrom, dateTo, groupBy);
      case 'vehicles':
        return this.generateVehiclesReport(dateFrom, dateTo, groupBy);
      case 'performance':
        return this.generatePerformanceReport(dateFrom, dateTo);
      default:
        throw new BadRequestException('Invalid report type');
    }
  }

  // Private helper methods
  private getPeriodStart(date: Date, period: string): Date {
    const result = new Date(date);
    switch (period) {
      case 'day':
        result.setDate(result.getDate() - 1);
        break;
      case 'week':
        result.setDate(result.getDate() - 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() - 1);
        break;
      case 'year':
        result.setFullYear(result.getFullYear() - 1);
        break;
    }
    return result;
  }

  private async calculateGrowth(
    entity: string,
    currentStart: Date,
    previousStart: Date,
  ): Promise<number> {
    const currentCount = await this.prisma[entity].count({
      where: { createdAt: { gte: currentStart } },
    });
    const previousCount = await this.prisma[entity].count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
    });

    if (previousCount === 0) return currentCount > 0 ? 100 : 0;
    return ((currentCount - previousCount) / previousCount) * 100;
  }

  private async calculateRevenueGrowth(
    currentStart: Date,
    previousStart: Date,
  ): Promise<number> {
    const currentRevenue = await this.prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: currentStart },
      },
      _sum: { amount: true },
    });

    const previousRevenue = await this.prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: previousStart,
          lt: currentStart,
        },
      },
      _sum: { amount: true },
    });

    const current = currentRevenue._sum.amount || 0;
    const previous = previousRevenue._sum.amount || 0;

    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getUsersByRole(): Promise<Record<Role, number>> {
    const userCounts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    const result: Record<Role, number> = {
      [Role.ADMIN]: 0,
      [Role.AGENT]: 0,
      [Role.CUSTOMER]: 0,
    };

    userCounts.forEach((count) => {
      result[count.role] = count._count.role;
    });

    return result;
  }

  private async getBookingsByStatus(): Promise<Record<BookingStatus, number>> {
    const bookingCounts = await this.prisma.booking.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const result: Record<BookingStatus, number> = {
      [BookingStatus.PENDING]: 0,
      [BookingStatus.CONFIRMED]: 0,
      [BookingStatus.ACTIVE]: 0,
      [BookingStatus.COMPLETED]: 0,
      [BookingStatus.CANCELLED]: 0,
      [BookingStatus.REJECTED]: 0,
    };

    bookingCounts.forEach((count) => {
      result[count.status] = count._count.status;
    });

    return result;
  }

  private async getVehiclesByStatus(): Promise<Record<string, number>> {
    const vehicleCounts = await this.prisma.vehicle.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const result: Record<string, number> = {
      [VehicleStatus.AVAILABLE]: 0,
      [VehicleStatus.RENTED]: 0,
      [VehicleStatus.MAINTENANCE]: 0,
      [VehicleStatus.INACTIVE]: 0,
    };

    vehicleCounts.forEach((count) => {
      result[count.status] = count._count.status;
    });

    return result;
  }

  private async getRecentActivity(): Promise<IRecentActivity[]> {
    // Get recent bookings, users, and payments
    const [recentBookings, recentUsers, recentPayments] = await Promise.all([
      this.prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true, vehicle: true },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { booking: { include: { user: true } } },
      }),
    ]);

    const activities: IRecentActivity[] = [];

    // Add booking activities
    recentBookings.forEach((booking) => {
      activities.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        description: `New booking by ${booking.user.firstName} ${booking.user.lastName} for ${booking.vehicle.make} ${booking.vehicle.model}`,
        timestamp: booking.createdAt,
        userId: booking.userId,
        bookingId: booking.id,
        amount: booking.totalAmount,
      });
    });

    // Add user activities
    recentUsers.forEach((user) => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user',
        description: `New user registered: ${user.firstName} ${user.lastName}`,
        timestamp: user.createdAt,
        userId: user.id,
      });
    });

    // Add payment activities
    recentPayments.forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        description: `Payment ${payment.status.toLowerCase()} for booking by ${payment.booking.user.firstName} ${payment.booking.user.lastName}`,
        timestamp: payment.createdAt,
        userId: payment.booking.userId,
        bookingId: payment.bookingId,
        amount: payment.amount,
      });
    });

    // Sort by timestamp and return top 10
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private async getMonthlyRevenue(): Promise<IMonthlyMetric[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.prisma.payment.groupBy({
      by: ['createdAt'],
      where: {
        status: 'COMPLETED',
        createdAt: { gte: sixMonthsAgo },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Group by month
    const monthlyRevenue: Record<string, { value: number; count: number }> = {};
    monthlyData.forEach((data) => {
      const month = data.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = { value: 0, count: 0 };
      }
      monthlyRevenue[month].value += data._sum.amount || 0;
      monthlyRevenue[month].count += data._count.id;
    });

    return Object.entries(monthlyRevenue).map(([month, data]) => ({
      month,
      value: data.value,
      count: data.count,
    }));
  }

  private async getMonthlyBookings(): Promise<IMonthlyMetric[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.prisma.booking.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });

    // Group by month
    const monthlyBookings: Record<string, number> = {};
    monthlyData.forEach((data) => {
      const month = data.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyBookings[month]) {
        monthlyBookings[month] = 0;
      }
      monthlyBookings[month] += data._count.id;
    });

    return Object.entries(monthlyBookings).map(([month, value]) => ({
      month,
      value,
    }));
  }

  private async getTopVehicles(): Promise<ITopVehicle[]> {
    const topVehicles = await this.prisma.vehicle.findMany({
      include: {
        bookings: {
          where: { status: 'COMPLETED' },
          include: { payment: true },
        },
        reviews: true,
      },
      take: 10,
    });

    return topVehicles
      .map((vehicle) => ({
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        bookingCount: vehicle.bookings.length,
        totalRevenue: vehicle.bookings.reduce(
          (sum, booking) => sum + (booking.payment?.amount || 0),
          0,
        ),
        averageRating:
          vehicle.reviews.length > 0
            ? vehicle.reviews.reduce((sum, review) => sum + review.rating, 0) /
              vehicle.reviews.length
            : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }

  private async getTopCustomers(): Promise<ITopCustomer[]> {
    const topCustomers = await this.prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      include: {
        bookings: {
          where: { status: 'COMPLETED' },
          include: { payment: true },
        },
      },
      take: 100,
    });

    return topCustomers
      .map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        bookingCount: user.bookings.length,
        totalSpent: user.bookings.reduce(
          (sum, booking) => sum + (booking.payment?.amount || 0),
          0,
        ),
        joinDate: user.createdAt,
      }))
      .filter((customer) => customer.bookingCount > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }

  private async getUserStats(): Promise<IAdminUserStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth,
      usersByRole,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.getUsersByRole(),
    ]);

    // Get user growth trend (last 6 months)
    const userGrowthTrend = await this.getUserGrowthTrend();

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth,
      usersByRole,
      userGrowthTrend,
    };
  }

  private async getUserGrowthTrend() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });

    // Group by month and calculate cumulative totals
    const monthlyGrowth: Record<string, { total: number; new: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().substring(0, 7);

      const totalUpToMonth = await this.prisma.user.count({
        where: {
          createdAt: {
            lte: new Date(date.getFullYear(), date.getMonth() + 1, 0),
          },
        },
      });

      const newInMonth = monthlyData
        .filter(
          (data) => data.createdAt.toISOString().substring(0, 7) === month,
        )
        .reduce((sum, data) => sum + data._count.id, 0);

      monthlyGrowth[month] = { total: totalUpToMonth, new: newInMonth };
    }

    return Object.entries(monthlyGrowth).map(([month, data]) => ({
      month,
      total: data.total,
      new: data.new,
    }));
  }

  private async getBookingStats(): Promise<IAdminBookingStats> {
    const [
      totalBookings,
      pendingApproval,
      activeBookings,
      completedBookings,
      cancelledBookings,
      totalRevenueResult,
      bookingsByStatus,
    ] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { status: BookingStatus.ACTIVE } }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.getBookingsByStatus(),
    ]);

    const totalRevenue = totalRevenueResult._sum.amount || 0;
    const averageBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const revenueByMonth = await this.getMonthlyRevenue();

    return {
      totalBookings,
      pendingApproval,
      activeBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      averageBookingValue,
      bookingsByStatus,
      revenueByMonth,
    };
  }

  private inferSettingType(
    value: string,
  ): 'string' | 'number' | 'boolean' | 'json' {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value))) return 'number';
    try {
      JSON.parse(value);
      return 'json';
    } catch {
      return 'string';
    }
  }

  private getCategoryDisplayName(category: string): string {
    const displayNames: Record<string, string> = {
      general: 'General Settings',
      email: 'Email Configuration',
      payment: 'Payment Settings',
      booking: 'Booking Configuration',
      security: 'Security Settings',
      app: 'Application Settings',
    };
    return (
      displayNames[category] ||
      category.charAt(0).toUpperCase() + category.slice(1)
    );
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      general: 'General application settings',
      email: 'Email service and template configuration',
      payment: 'Payment gateway and pricing settings',
      booking: 'Booking policies and restrictions',
      security: 'Security and authentication settings',
      app: 'Application behavior and features',
    };
    return descriptions[category] || `Settings for ${category}`;
  }

  private async generateRevenueReport(
    dateFrom: string,
    dateTo: string,
    groupBy: string,
  ): Promise<IRevenueReport> {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    const [totalRevenueResult, totalBookings, revenueByCategory] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
        this.prisma.booking.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        this.prisma.booking.groupBy({
          by: ['vehicleId'],
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: BookingStatus.COMPLETED,
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
      ]);

    const totalRevenue = totalRevenueResult._sum.amount || 0;
    const averageBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Get revenue by period (simplified)
    const revenueByPeriod = await this.getRevenueByPeriod(
      startDate,
      endDate,
      groupBy,
    );

    // Get revenue by vehicle category
    const vehicleCategories = await this.prisma.vehicle.findMany({
      where: {
        id: { in: revenueByCategory.map((r) => r.vehicleId) },
      },
      select: { id: true, category: true },
    });

    const revenueByVehicleCategory = Object.entries(
      revenueByCategory.reduce(
        (acc, revenue) => {
          const vehicle = vehicleCategories.find(
            (v) => v.id === revenue.vehicleId,
          );
          const category = vehicle?.category || 'UNKNOWN';
          if (!acc[category]) acc[category] = 0;
          acc[category] += revenue._sum.totalAmount || 0;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: (revenue / totalRevenue) * 100,
    }));

    const topRevenueVehicles = await this.getTopVehicles();

    return {
      totalRevenue,
      totalBookings,
      averageBookingValue,
      revenueByPeriod,
      revenueByVehicleCategory,
      topRevenueVehicles,
    };
  }

  private async getRevenueByPeriod(
    startDate: Date,
    endDate: Date,
    groupBy: string,
  ) {
    // Simplified implementation - in production, you'd want more sophisticated period grouping
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { booking: true },
    });

    // Group by period (simplified to monthly for now)
    const periodData: Record<string, { revenue: number; bookings: number }> =
      {};

    payments.forEach((payment) => {
      const period = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!periodData[period]) {
        periodData[period] = { revenue: 0, bookings: 0 };
      }
      periodData[period].revenue += payment.amount;
      periodData[period].bookings += 1;
    });

    return Object.entries(periodData).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      bookings: data.bookings,
    }));
  }

  private async generateBookingsReport(
    _dateFrom: string,
    _dateTo: string,
    _groupBy: string,
  ) {
    // Implementation for bookings report
    return {
      type: 'bookings',
      dateFrom: _dateFrom,
      dateTo: _dateTo,
      groupBy: _groupBy,
    };
  }

  private async generateUsersReport(
    _dateFrom: string,
    _dateTo: string,
    _groupBy: string,
  ) {
    // Implementation for users report
    return {
      type: 'users',
      dateFrom: _dateFrom,
      dateTo: _dateTo,
      groupBy: _groupBy,
    };
  }

  private async generateVehiclesReport(
    _dateFrom: string,
    _dateTo: string,
    _groupBy: string,
  ) {
    // Implementation for vehicles report
    return {
      type: 'vehicles',
      dateFrom: _dateFrom,
      dateTo: _dateTo,
      groupBy: _groupBy,
    };
  }

  private async generatePerformanceReport(
    dateFrom: string,
    dateTo: string,
  ): Promise<IPerformanceReport> {
    // Mock performance data - in production, you'd gather real metrics
    return {
      systemUptime: 99.9,
      averageResponseTime: 150,
      errorRate: 0.1,
      activeUsers: await this.prisma.user.count({ where: { isActive: true } }),
      peakUsageHours: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        usage: Math.floor(Math.random() * 100),
      })),
      popularFeatures: [
        { feature: 'Vehicle Search', usage: 85 },
        { feature: 'Booking Creation', usage: 70 },
        { feature: 'Payment Processing', usage: 68 },
        { feature: 'Profile Management', usage: 45 },
      ],
    };
  }

  async createUser(
    userData: any,
    avatarFile?: Express.Multer.File,
  ): Promise<SafeUser> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: userData.email }, { phone: userData.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    let avatarUrl: string | undefined;
    let avatarPublicId: string | undefined;

    // Handle avatar upload if provided
    if (avatarFile) {
      try {
        console.log('Uploading avatar for new user:', {
          filename: avatarFile.originalname,
          size: avatarFile.size,
          mimetype: avatarFile.mimetype,
        });

        const uploadResult = await this.uploadService.uploadImage(
          avatarFile,
          'users/avatars'
        );

        avatarUrl = uploadResult.secure_url;
        avatarPublicId = uploadResult.public_id;

        console.log('Avatar upload successful:', { avatarUrl, avatarPublicId });
      } catch (uploadError) {
        console.error('Avatar upload failed during user creation:', uploadError);
        // Continue with user creation without avatar
        console.log('Continuing user creation without avatar');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role,
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
        licenseNumber: userData.licenseNumber,
        address: userData.address,
        city: userData.city,
        country: userData.country,
        zipCode: userData.zipCode,
        avatar: avatarUrl,
        // avatarPublicId: avatarPublicId, // Temporarily commented out
        isActive: true,
        isVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        avatar: true,
        address: true,
        city: true,
        country: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
        licenseNumber: true, // Include licenseNumber in user selection
      },
    });

    return user as SafeUser;
  }

  async updateUserAvatar(
    userId: string,
    avatarFile: Express.Multer.File,
  ): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old avatar if exists
    if (user.avatar && user.avatarPublicId) {
      try {
        await this.uploadService.deleteImage(user.avatar);
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
      }
    }

    // Upload new avatar
    let avatar: string | null = null;
    let avatarPublicId: string | null = null;

    try {
      const uploadResult = await this.uploadService.uploadImage(
        avatarFile,
        'users/avatars',
        [
          { width: 200, height: 200, crop: 'fill', gravity: 'face' },
          { quality: 'auto' },
          { format: 'webp' },
        ],
      );
      avatar = uploadResult.secure_url;
      avatarPublicId = uploadResult.public_id;
    } catch (error) {
      throw new BadRequestException(`Avatar upload failed: ${error.message}`);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar, avatarPublicId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        avatar: true,
        address: true,
        city: true,
        country: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
        licenseNumber: true, // Include licenseNumber in user selection
      },
    });

    return updatedUser as SafeUser;
  }

  async deleteUserAvatar(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete avatar from Cloudinary if exists
    if (user.avatar && user.avatarPublicId) {
      try {
        await this.uploadService.deleteImage(user.avatar);
      } catch (error) {
        console.error('Failed to delete avatar:', error);
      }
    }

    // Update user to remove avatar
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null, avatarPublicId: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        avatar: true,
        address: true,
        city: true,
        country: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
        licenseNumber: true, // Include licenseNumber in user selection
      },
    });

    return updatedUser as SafeUser;
  }
}
