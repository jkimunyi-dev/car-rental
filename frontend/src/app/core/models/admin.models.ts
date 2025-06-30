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
  recentActivity: any[];
  monthlyRevenue: any[];
  monthlyBookings: any[];
  topVehicles: any[];
  topCustomers: any[];
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
  createdAt: Date;
}

export interface AdminBooking {
  id: string;
  userId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalAmount: number;
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
}

export interface AdminVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: string;
  status: string;
  pricePerDay: number;
  location: string;
  licensePlate: string;
  images: string[];
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
}

export interface BulkActionResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}