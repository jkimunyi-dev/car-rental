export interface AdminAnalytics {
  totalUsers: number;
  totalVehicles: number;
  totalBookings: number;
  totalRevenue: number;
  userGrowth: number;
  vehicleGrowth: number;
  bookingGrowth: number;
  revenueGrowth: number;
  usersByRole: Record<string, number>;
  bookingsByStatus: Record<string, number>;
  vehiclesByStatus: Record<string, number>;
  recentActivity: RecentActivity[];
  monthlyRevenue: MonthlyMetric[];
  monthlyBookings: MonthlyMetric[];
  topVehicles: TopVehicle[];
  topCustomers: TopCustomer[];
}

export interface RecentActivity {
  id: string;
  type: 'booking' | 'user' | 'payment' | 'vehicle';
  description: string;
  timestamp: string;
  userId?: string;
  bookingId?: string;
  amount?: number;
}

export interface MonthlyMetric {
  month: string;
  value: number;
  count?: number;
}

export interface TopVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  bookingCount: number;
  totalRevenue: number;
  averageRating: number;
}

export interface TopCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bookingCount: number;
  totalSpent: number;
  joinDate: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBooking {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface AdminVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: string;
  pricePerDay: number;
  status: string;
  location: string;
  licensePlate?: string;
  images?: string[];
  description?: string;
  features?: string[];
  transmission?: string;
  fuelType?: string;
  seats?: number;
  mileage?: number;
  isAvailable?: boolean;
  createdAt: string;
  updatedAt?: string;
  doors?: number;
  color?: string;
  vin?: string;
  pricePerHour?: number;
}

export interface BulkActionResult {
  successful: string[];
  failed: Array<{
    userId: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  category: string;
  type: string;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}