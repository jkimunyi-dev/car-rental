import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import {
  BookingApiResponse,
  BookingsListApiResponse,
  BookingAvailabilityApiResponse,
  BookingPricingApiResponse,
} from './booking.interface';
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingStatusUpdateDto,
  CancelBookingDto,
} from './dto/create-booking.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { BookingStatus, Role } from '@prisma/client';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Create a new booking (Authentication required)' })
  @SwaggerApiResponse({
    status: 201,
    description: 'Booking created successfully',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid booking data or vehicle not available',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Vehicle not found',
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingApiResponse> {
    return this.bookingsService.create(createBookingDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'Get all bookings with filtering (Public - limited data for non-authenticated users)',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Bookings retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BookingStatus,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @CurrentUser() user?: any,
  ): Promise<BookingsListApiResponse> {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      vehicleId,
      startDate,
      endDate,
      search,
      location,
      sortBy,
      sortOrder,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      userId: user?.role === Role.CUSTOMER ? user.id : undefined,
      userRole: user?.role,
      isPublic: !user,
    };

    return this.bookingsService.findAll(options);
  }

  @Get('my-bookings')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get current user bookings (Authentication required)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User bookings retrieved successfully',
  })
  async getMyBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BookingStatus,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
  ): Promise<BookingsListApiResponse> {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      search,
      userId: user.id,
      userRole: user.role,
    };

    return this.bookingsService.findAll(options);
  }

  @Get('check-availability/:vehicleId')
  @Public()
  @ApiOperation({ summary: 'Check vehicle availability for specific dates (Public)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Availability check completed',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid date parameters',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Vehicle not found',
  })
  async checkAvailability(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<BookingAvailabilityApiResponse> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    return this.bookingsService.checkAvailability(
      vehicleId,
      startDate,
      endDate,
    );
  }

  @Get('calculate-price/:vehicleId')
  @Public()
  @ApiOperation({ summary: 'Calculate booking price (Public)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Price calculated successfully',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid parameters',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Vehicle not found',
  })
  async calculatePrice(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('isHourlyBooking') isHourlyBooking?: string,
    @Query('couponCode') couponCode?: string,
  ): Promise<BookingPricingApiResponse> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    return this.bookingsService.calculateBookingPrice(
      vehicleId,
      startDate,
      endDate,
      startTime,
      endTime,
      isHourlyBooking === 'true',
      couponCode,
    );
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get booking by ID (Public - limited data for non-authenticated users)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Booking retrieved successfully',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ): Promise<BookingApiResponse> {
    return this.bookingsService.findOne(id, user?.id, user?.role);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update booking details (Authentication required)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Booking updated successfully',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Booking cannot be modified',
  })
  @SwaggerApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingApiResponse> {
    return this.bookingsService.update(
      id,
      updateBookingDto,
      user.id,
      user.role,
    );
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Update booking status (Admin/Agent only)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Booking status updated successfully',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid status transition',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() statusUpdateDto: BookingStatusUpdateDto,
    @CurrentUser() user: any,
  ): Promise<BookingApiResponse> {
    return this.bookingsService.updateStatus(id, statusUpdateDto, user.role);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cancel a booking (Authentication required)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Booking cannot be cancelled',
  })
  @SwaggerApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async cancel(
    @Param('id') id: string,
    @Body() cancelBookingDto: CancelBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingApiResponse> {
    return this.bookingsService.cancel(
      id,
      cancelBookingDto,
      user.id,
      user.role,
    );
  }
}
