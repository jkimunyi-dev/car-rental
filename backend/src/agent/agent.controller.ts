import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { AgentService, AgentBookingApprovalDto } from './agent.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Agent')
@ApiBearerAuth()
@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard) // Fix: Use JwtAuthGuard
@Roles(Role.AGENT, Role.ADMIN)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get agent dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats(@Request() req: any) {
    return this.agentService.getDashboardStats(req.user.sub);
  }

  @Get('bookings/pending')
  @ApiOperation({ summary: 'Get pending bookings for agent review' })
  @ApiResponse({ status: 200, description: 'Pending bookings retrieved successfully' })
  async getPendingBookings(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    return this.agentService.getPendingBookings(req.user.sub, pageNum, limitNum);
  }

  @Get('bookings/:id/review')
  @ApiOperation({ summary: 'Get booking details for agent review' })
  @ApiResponse({ status: 200, description: 'Booking details retrieved successfully' })
  async getBookingForReview(
    @Request() req: any,
    @Param('id') bookingId: string,
  ) {
    return this.agentService.getBookingForReview(req.user.sub, bookingId);
  }

  @Post('bookings/:id/approve')
  @ApiOperation({ summary: 'Approve a booking' })
  @ApiResponse({ status: 200, description: 'Booking approved successfully' })
  async approveBooking(
    @Request() req: any,
    @Param('id') bookingId: string,
    @Body() body: { reason?: string; notes?: string },
  ) {
    return this.agentService.processBookingApproval(
      req.user.sub,
      bookingId,
      'approve',
      body.reason,
      body.notes,
    );
  }

  @Post('bookings/:id/reject')
  @ApiOperation({ summary: 'Reject a booking' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully' })
  async rejectBooking(
    @Request() req: any,
    @Param('id') bookingId: string,
    @Body() body: { reason?: string; notes?: string },
  ) {
    return this.agentService.processBookingApproval(
      req.user.sub,
      bookingId,
      'reject',
      body.reason,
      body.notes,
    );
  }

  @Post('bookings/bulk-process')
  @ApiOperation({ summary: 'Bulk approve or reject bookings' })
  @ApiResponse({ status: 200, description: 'Bulk processing completed' })
  async bulkProcessBookings(
    @Request() req: any,
    @Body() approvalDto: AgentBookingApprovalDto,
  ) {
    return this.agentService.bulkProcessBookings(req.user.sub, approvalDto);
  }
}
