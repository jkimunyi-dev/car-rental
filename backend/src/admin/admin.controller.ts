import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import {
  GetAnalyticsDto,
  AdminUserFiltersDto,
  AdminUpdateUserRoleDto,
  UpdateUserStatusDto,
  BulkUserActionDto,
  AdminBookingFiltersDto,
  BookingActionDto,
  UpdateDisputeDto,
  UpdateSystemSettingDto,
  GenerateReportDto,
  AdminCreateUserDto, // Update this import
  UpdateUserAvatarDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Analytics Endpoints
   */
  @Get('analytics')
  async getAnalytics(@Query() query: GetAnalyticsDto) {
    const analytics = await this.adminService.getAnalytics(query.period);
    return {
      success: true,
      message: 'Analytics retrieved successfully',
      data: analytics,
    };
  }

  /**
   * User Management Endpoints
   */
  @Get('users')
  async getUsers(@Query() filters: AdminUserFiltersDto) {
    const result = await this.adminService.getUsers(filters);
    return {
      success: true,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateUserRoleDto: AdminUpdateUserRoleDto,
  ) {
    const user = await this.adminService.updateUserRole(
      userId,
      updateUserRoleDto.role,
    );
    return {
      success: true,
      message: 'User role updated successfully',
      data: user,
    };
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    const user = await this.adminService.updateUserStatus(
      userId,
      updateUserStatusDto.isActive,
    );
    return {
      success: true,
      message: 'User status updated successfully',
      data: user,
    };
  }

  @Post('users/bulk-action')
  async bulkUserAction(@Body() bulkUserActionDto: BulkUserActionDto) {
    const result = await this.adminService.bulkUserAction(bulkUserActionDto);
    return {
      success: true,
      message: 'Bulk action completed',
      data: result,
    };
  }

  /**
   * Booking Management Endpoints
   */
  @Get('bookings')
  async getBookings(@Query() filters: AdminBookingFiltersDto) {
    const result = await this.adminService.getBookings(filters);
    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: result,
    };
  }

  @Put('bookings/:id/action')
  async handleBookingAction(
    @Param('id') bookingId: string,
    @Body() bookingActionDto: BookingActionDto,
  ) {
    const action = { ...bookingActionDto, bookingId };
    const booking = await this.adminService.handleBookingAction(action);
    return {
      success: true,
      message: 'Booking action completed successfully',
      data: booking,
    };
  }

  @Get('disputes')
  async getDisputes() {
    const disputes = await this.adminService.getDisputes();
    return {
      success: true,
      message: 'Disputes retrieved successfully',
      data: disputes,
    };
  }

  @Put('disputes/:id')
  async updateDispute(
    @Param('id') disputeId: string,
    @Body() updateDisputeDto: UpdateDisputeDto,
  ) {
    const dispute = await this.adminService.updateDispute(
      disputeId,
      updateDisputeDto,
    );
    return {
      success: true,
      message: 'Dispute updated successfully',
      data: dispute,
    };
  }

  /**
   * System Settings Endpoints
   */
  @Get('settings')
  async getSystemSettings() {
    const settings = await this.adminService.getSystemSettings();
    return {
      success: true,
      message: 'System settings retrieved successfully',
      data: settings,
    };
  }

  @Put('settings')
  async updateSystemSetting(
    @Body() updateSystemSettingDto: UpdateSystemSettingDto,
  ) {
    const settings = await this.adminService.updateSystemSetting(
      updateSystemSettingDto,
    );
    return {
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    };
  }

  /**
   * Reports Endpoints
   */
  @Get('reports/generate')
  @HttpCode(HttpStatus.OK)
  async generateReport(@Query() query: GenerateReportDto) {
    const report = await this.adminService.generateReport(query);
    return {
      success: true,
      message: 'Report generated successfully',
      data: report,
    };
  }

  /**
   * User Creation and Avatar Management
   */
  @Post('users')
  @UseInterceptors(FileInterceptor('avatar'))
  async createUser(
    @Body() createUserDto: AdminCreateUserDto, // Update this parameter type
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const user = await this.adminService.createUser(createUserDto, avatar);
    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  @Put('users/:id/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateUserAvatar(
    @Param('id') userId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    if (!avatar) {
      throw new BadRequestException('Avatar file is required');
    }

    const user = await this.adminService.updateUserAvatar(userId, avatar);
    return {
      success: true,
      message: 'User avatar updated successfully',
      data: user,
    };
  }

  @Delete('users/:id/avatar')
  async deleteUserAvatar(@Param('id') userId: string) {
    const user = await this.adminService.deleteUserAvatar(userId);
    return {
      success: true,
      message: 'User avatar deleted successfully',
      data: user,
    };
  }
}
