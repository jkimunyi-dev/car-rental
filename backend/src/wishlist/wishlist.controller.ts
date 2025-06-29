import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { 
  AddToWishlistDto, 
  WishlistQueryDto, 
  WishlistNotificationDto, 
  ShareWishlistDto,
  WishlistResponseDto,
  WishlistItemResponseDto
} from './dto/wishlist.dto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @ApiOperation({ summary: 'Add vehicle to wishlist' })
  @ApiResponse({ status: 201, description: 'Vehicle added to wishlist successfully' })
  @ApiResponse({ status: 409, description: 'Vehicle already in wishlist' })
  async addToWishlist(
    @Request() req: any,
    @Body() addToWishlistDto: AddToWishlistDto,
  ): Promise<WishlistItemResponseDto> {
    return this.wishlistService.addToWishlist(req.user.id, addToWishlistDto);
  }

  @Delete(':vehicleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove vehicle from wishlist' })
  @ApiResponse({ status: 200, description: 'Vehicle removed from wishlist successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found in wishlist' })
  async removeFromWishlist(
    @Request() req: any,
    @Param('vehicleId') vehicleId: string,
  ): Promise<{ message: string }> {
    return this.wishlistService.removeFromWishlist(req.user.id, vehicleId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user wishlist with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully' })
  async getWishlist(
    @Request() req: any,
    @Query() queryDto: WishlistQueryDto,
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.getWishlist(req.user.id, queryDto);
  }

  @Get('check/:vehicleId')
  @ApiOperation({ summary: 'Check if vehicle is in wishlist' })
  @ApiResponse({ status: 200, description: 'Check completed successfully' })
  async checkIfInWishlist(
    @Request() req: any,
    @Param('vehicleId') vehicleId: string,
  ): Promise<{ inWishlist: boolean }> {
    return this.wishlistService.checkIfInWishlist(req.user.id, vehicleId);
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Set notification preferences for wishlist item' })
  @ApiResponse({ status: 200, description: 'Notification preference updated successfully' })
  async setNotification(
    @Request() req: any,
    @Body() notificationDto: WishlistNotificationDto,
  ): Promise<{ message: string }> {
    return this.wishlistService.setNotification(req.user.id, notificationDto);
  }

  @Post('share')
  @ApiOperation({ summary: 'Share wishlist with friends via email' })
  @ApiResponse({ status: 200, description: 'Wishlist shared successfully' })
  async shareWishlist(
    @Request() req: any,
    @Body() shareDto: ShareWishlistDto,
  ): Promise<{ message: string }> {
    return this.wishlistService.shareWishlist(req.user.id, shareDto);
  }

  @Get(':vehicleId/quick-book')
  @ApiOperation({ summary: 'Get quick booking URL for wishlisted vehicle' })
  @ApiResponse({ status: 200, description: 'Booking URL generated successfully' })
  async quickBookFromWishlist(
    @Request() req: any,
    @Param('vehicleId') vehicleId: string,
  ): Promise<{ bookingUrl: string }> {
    return this.wishlistService.quickBookFromWishlist(req.user.id, vehicleId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear entire wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared successfully' })
  async clearWishlist(@Request() req: any): Promise<{ message: string }> {
    return this.wishlistService.clearWishlist(req.user.id);
  }
}
