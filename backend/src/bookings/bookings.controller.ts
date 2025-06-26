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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingResponseDto,
  BookingStatusUpdateDto,
  CancelBookingDto,
} from './dto/create-booking.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BookingStatus, Role } from '@prisma/client';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.create(createBookingDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Bookings retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BookingStatus,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      vehicleId,
      startDate,
      endDate,
      userId: user.role === Role.CUSTOMER ? user.id : undefined,
      userRole: user.role,
    };

    return this.bookingsService.findAll(options);
  }

  @Get('my-bookings')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiResponse({
    status: 200,
    description: 'User bookings retrieved successfully',
  })
  async getMyBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BookingStatus,
    @CurrentUser() user?: any,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      userId: user.id,
      userRole: user.role,
    };

    return this.bookingsService.findAll(options);
  }

  @Get('check-availability/:vehicleId')
  @ApiOperation({ summary: 'Check vehicle availability for specific dates' })
  @ApiResponse({
    status: 200,
    description: 'Availability check completed',
  })
  async checkAvailability(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    return this.bookingsService.checkAvailability(vehicleId, startDate, endDate);
  }

  @Get('calculate-price/:vehicleId')
  @ApiOperation({ summary: 'Calculate booking price' })
  @ApiResponse({
    status: 200,
    description: 'Price calculated successfully',
  })
  async calculatePrice(
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('isHourlyBooking') isHourlyBooking?: string,
    @Query('couponCode') couponCode?: string,
  ) {
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
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking retrieved successfully',
    type: BookingResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update booking details' })
  @ApiResponse({
    status: 200,
    description: 'Booking updated successfully',
    type: BookingResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.update(id, updateBookingDto, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Update booking status (Admin/Agent only)' })
  @ApiResponse({
    status: 200,
    description: 'Booking status updated successfully',
    type: BookingResponseDto,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() statusUpdateDto: BookingStatusUpdateDto,
    @CurrentUser() user: any,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.updateStatus(id, statusUpdateDto, user.role);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    type: BookingResponseDto,
  })
  async cancel(
    @Param('id') id: string,
    @Body() cancelBookingDto: CancelBookingDto,
    @CurrentUser() user: any,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.cancel(id, cancelBookingDto, user.id, user.role);
  }
}