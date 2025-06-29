import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/api-response.dto';

export class AddToWishlistDto {
  @ApiProperty({ description: 'Vehicle ID to add to wishlist' })
  @IsString()
  vehicleId: string;
}

export class RemoveFromWishlistDto {
  @ApiProperty({ description: 'Vehicle ID to remove from wishlist' })
  @IsString()
  vehicleId: string;
}

export class WishlistNotificationDto {
  @ApiProperty({ description: 'Vehicle ID for notification' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ 
    description: 'Notification type',
    enum: ['availability', 'price_drop']
  })
  @IsEnum(['availability', 'price_drop'])
  type: 'availability' | 'price_drop';

  @ApiProperty({ description: 'Enable/disable notification', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ShareWishlistDto {
  @ApiProperty({ description: 'Array of email addresses to share with' })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty({ description: 'Optional message to include', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class WishlistQueryDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by availability', required: false })
  @IsOptional()
  @IsBoolean()
  availableOnly?: boolean;

  @ApiProperty({ description: 'Filter by location', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Filter by vehicle category', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}

export class WishlistItemResponseDto {
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

export class WishlistResponseDto {
  items: WishlistItemResponseDto[];
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