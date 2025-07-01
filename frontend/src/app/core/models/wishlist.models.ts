export interface WishlistItem {
  id: string;
  userId: string;
  vehicleId: string;
  createdAt: Date;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    category: string;
    pricePerDay: number;
    pricePerHour?: number;
    images: string[];
    status: string;
    location: string;
    averageRating: number;
    isAvailable: boolean;
    priceChanged: boolean;
    previousPrice?: number;
  };
}

export interface WishlistResponse {
  items: WishlistItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalItems: number;
    availableItems: number;
    unavailableItems: number;
    priceDrops: number;
  };
}

export interface AddToWishlistDto {
  vehicleId: string;
}

export interface WishlistQueryDto {
  page?: number;
  limit?: number;
  availableOnly?: boolean;
  location?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WishlistNotificationDto {
  vehicleId: string;
  type: 'availability' | 'price_drop';
  isActive?: boolean;
}