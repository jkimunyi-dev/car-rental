import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

import { EmailService } from './email.service';
import { SendBulkEmailDto, SendMarketingCampaignDto } from './dto/email.dto';

@ApiTags('Email')
@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
  async getEmailStats(@Query('period') period?: 'day' | 'week' | 'month') {
    return this.emailService.getEmailStats(period);
  }

  @Get('queue/stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get email queue statistics' })
  async getQueueStats() {
    return this.emailService.getQueueStats();
  }

  @Post('bulk-send')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send bulk emails' })
  @ApiBody({ type: SendBulkEmailDto })
  async sendBulkEmail(@Body() bulkEmailData: SendBulkEmailDto) {
    await this.emailService.sendBulkEmail(bulkEmailData);
    return {
      success: true,
      message: `Bulk email queued for ${bulkEmailData.recipients.length} recipients`,
    };
  }

  @Post('campaign')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send marketing campaign' })
  @ApiBody({ type: SendMarketingCampaignDto })
  async sendMarketingCampaign(@Body() campaignData: SendMarketingCampaignDto) {
    await this.emailService.sendMarketingCampaign(campaignData);
    return {
      success: true,
      message: `Marketing campaign "${campaignData.name}" has been queued`,
    };
  }

  @Post('test')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send test email' })
  async sendTestEmail(
    @Body() testData: { to: string; template: string; context?: any },
  ) {
    await this.emailService.addEmailToQueue({
      to: testData.to,
      template: testData.template as any,
      subject: 'Test Email',
      context: testData.context || { user: { firstName: 'Test User' } },
    });

    return {
      success: true,
      message: 'Test email queued successfully',
    };
  }
}
