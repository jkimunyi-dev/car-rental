import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { 
  AddToWishlistDto, 
  WishlistQueryDto, 
  WishlistNotificationDto, 
  ShareWishlistDto,
  WishlistResponseDto,
  WishlistItemResponseDto
} from './dto/wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async addToWishlist(userId: string, addToWishlistDto: AddToWishlistDto): Promise<WishlistItemResponseDto> {
    const { vehicleId } = addToWishlistDto;

    // Check if vehicle exists
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Check if already in wishlist
    const existingWishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });

    if (existingWishlistItem) {
      throw new ConflictException('Vehicle is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await this.prisma.wishlist.create({
      data: {
        userId,
        vehicleId,
      },
      include: {
        vehicle: {
          include: {
            reviews: true,
            bookings: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });

    return this.formatWishlistItem(wishlistItem);
  }

  async removeFromWishlist(userId: string, vehicleId: string): Promise<{ message: string }> {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Vehicle not found in your wishlist');
    }

    await this.prisma.wishlist.delete({
      where: {
        id: wishlistItem.id,
      },
    });

    // Also remove related notifications
    await this.prisma.wishlistNotification.deleteMany({
      where: {
        userId,
        vehicleId,
      },
    });

    return { message: 'Vehicle removed from wishlist successfully' };
  }

  async getWishlist(userId: string, queryDto: WishlistQueryDto): Promise<WishlistResponseDto> {
    const { page = 1, limit = 10, availableOnly, location, category, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId,
    };

    if (availableOnly !== undefined || location || category) {
      where.vehicle = {};
      
      if (availableOnly) {
        where.vehicle.status = 'AVAILABLE';
      }
      
      if (location) {
        where.vehicle.location = {
          contains: location,
          mode: 'insensitive',
        };
      }
      
      if (category) {
        where.vehicle.category = category;
      }
    }

    // Get wishlist items with pagination
    const [wishlistItems, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where,
        include: {
          vehicle: {
            include: {
              reviews: true,
              bookings: {
                where: {
                  status: 'ACTIVE',
                },
              },
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.wishlist.count({ where }),
    ]);

    // Format response
    const items = wishlistItems.map(item => this.formatWishlistItem(item));
    
    // Calculate stats
    const stats = await this.calculateWishlistStats(userId);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  async checkIfInWishlist(userId: string, vehicleId: string): Promise<{ inWishlist: boolean }> {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });

    return { inWishlist: !!wishlistItem };
  }

  async setNotification(userId: string, notificationDto: WishlistNotificationDto): Promise<{ message: string }> {
    const { vehicleId, type, isActive = true } = notificationDto;

    // Check if vehicle exists in wishlist
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Vehicle not found in your wishlist');
    }

    // Upsert notification
    await this.prisma.wishlistNotification.upsert({
      where: {
        userId_vehicleId_type: {
          userId,
          vehicleId,
          type,
        },
      },
      update: {
        isActive,
      },
      create: {
        userId,
        vehicleId,
        type,
        isActive,
      },
    });

    return { 
      message: `${type} notification ${isActive ? 'enabled' : 'disabled'} successfully` 
    };
  }

//   async shareWishlist(userId: string, shareDto: ShareWishlistDto): Promise<{ message: string }> {
//     const { emails, message } = shareDto;

//     // Get user's wishlist
//     const wishlistItems = await this.prisma.wishlist.findMany({
//       where: { userId },
//       include: {
//         vehicle: true,
//         user: {
//           select: {
//             firstName: true,
//             lastName: true,
//             email: true,
//           },
//         },
//       },
//     });

//     if (wishlistItems.length === 0) {
//       throw new NotFoundException('Your wishlist is empty');
//     }

//     // Send emails to all recipients
//     for (const email of emails) {
//       await this.emailService.sendWishlistShare({
//         recipientEmail: email,
//         sharedBy: `${wishlistItems[0].user.firstName} ${wishlistItems[0].user.lastName}`,
//         wishlistItems: wishlistItems.map(item => ({
//           vehicle: item.vehicle,
//           addedAt: item.createdAt,
//         })),
//         message,
//       });
//     }

//     return { message: `Wishlist shared with ${emails.length} recipient(s) successfully` };
//   }

  async quickBookFromWishlist(userId: string, vehicleId: string): Promise<{ bookingUrl: string }> {
    // Check if vehicle exists in wishlist
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_vehicleId: {
          userId,
          vehicleId,
        },
      },
      include: {
        vehicle: true,
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Vehicle not found in your wishlist');
    }

    if (wishlistItem.vehicle.status !== 'AVAILABLE') {
      throw new ForbiddenException('Vehicle is not available for booking');
    }

    // Generate booking URL with pre-filled vehicle data
    const bookingUrl = `${process.env.FRONTEND_URL}/booking?vehicleId=${vehicleId}&fromWishlist=true`;

    return { bookingUrl };
  }

  async clearWishlist(userId: string): Promise<{ message: string }> {
    await this.prisma.$transaction([
      this.prisma.wishlistNotification.deleteMany({
        where: { userId },
      }),
      this.prisma.wishlist.deleteMany({
        where: { userId },
      }),
    ]);

    return { message: 'Wishlist cleared successfully' };
  }

  // Helper methods
  private formatWishlistItem(wishlistItem: any): WishlistItemResponseDto {
    const avgRating = wishlistItem.vehicle.reviews.length > 0
      ? wishlistItem.vehicle.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / wishlistItem.vehicle.reviews.length
      : 0;

    const isAvailable = wishlistItem.vehicle.status === 'AVAILABLE' && wishlistItem.vehicle.bookings.length === 0;

    return {
      id: wishlistItem.id,
      userId: wishlistItem.userId,
      vehicleId: wishlistItem.vehicleId,
      createdAt: wishlistItem.createdAt,
      vehicle: {
        id: wishlistItem.vehicle.id,
        make: wishlistItem.vehicle.make,
        model: wishlistItem.vehicle.model,
        year: wishlistItem.vehicle.year,
        category: wishlistItem.vehicle.category,
        pricePerDay: wishlistItem.vehicle.pricePerDay,
        pricePerHour: wishlistItem.vehicle.pricePerHour,
        images: wishlistItem.vehicle.images,
        status: wishlistItem.vehicle.status,
        location: wishlistItem.vehicle.location,
        averageRating: Number(avgRating.toFixed(1)),
        isAvailable,
        priceChanged: false, // This would require price history tracking
        previousPrice: undefined,
      },
    };
  }

  private async calculateWishlistStats(userId: string) {
    const [total, available] = await Promise.all([
      this.prisma.wishlist.count({
        where: { userId },
      }),
      this.prisma.wishlist.count({
        where: {
          userId,
          vehicle: {
            status: 'AVAILABLE',
          },
        },
      }),
    ]);

    return {
      totalItems: total,
      availableItems: available,
      unavailableItems: total - available,
      priceDrops: 0, // Would need price history tracking
    };
  }

  // Admin/System methods for notifications
  async checkPriceDrops() {
    // This would be called by a cron job to check for price drops
    const notifications = await this.prisma.wishlistNotification.findMany({
      where: {
        type: 'price_drop',
        isActive: true,
      },
      include: {
        user: true,
        vehicle: true,
      },
    });

    // Implementation would compare current prices with stored previous prices
    // and send notifications when prices drop
  }

  async checkAvailability() {
    // This would be called by a cron job to check for availability changes
    const notifications = await this.prisma.wishlistNotification.findMany({
      where: {
        type: 'availability',
        isActive: true,
      },
      include: {
        user: true,
        vehicle: true,
      },
    });

    // Implementation would check vehicle availability and send notifications
  }
}
