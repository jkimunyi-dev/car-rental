import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Delete,
  Patch,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { DarajaCallbackDto } from './dto/daraja-payment.dto';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(@Body() createPaymentDto: CreatePaymentDto, @Req() req) {
    return this.paymentsService.createPayment(createPaymentDto, req.user.id);
  }

  @Post('daraja/callback')
  async handleDarajaCallback(@Body() callbackData: DarajaCallbackDto) {
    return this.paymentsService.handleDarajaCallback(callbackData);
  }

  @Post('daraja/confirmation')
  async handleDarajaConfirmation(@Body() _confirmationData: any) {
    // Handle confirmation callback - data received but not processed in this implementation
    return { ResultCode: 0, ResultDesc: 'Confirmation received successfully' };
  }

  @Post('daraja/validation')
  async handleDarajaValidation(@Body() _validationData: any) {
    // Handle validation callback - data received but not processed in this implementation
    return { ResultCode: 0, ResultDesc: 'Validation successful' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPayments(@Query() query: QueryPaymentDto, @Req() req) {
    return this.paymentsService.getPayments(req.user.id, req.user.role, query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getPaymentStats(@Req() req) {
    const userId = req.user.role === Role.ADMIN ? undefined : req.user.id;
    return this.paymentsService.getPaymentStats(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentById(@Param('id') id: string, @Req() req) {
    return this.paymentsService.getPaymentById(id, req.user.id, req.user.role);
  }

  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard)
  async downloadInvoice(
    @Param('id') id: string,
    @Req() req,
    @Res() res: Response,
  ) {
    const invoice = await this.paymentsService.generateInvoice(
      id,
      req.user.id,
      req.user.role,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
    });

    res.send(invoice);
  }

  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async processRefund(
    @Param('id') id: string,
    @Body() body: { refundAmount?: number },
  ) {
    return this.paymentsService.processRefund(id, body.refundAmount);
  }

  // Payment Methods endpoints
  @Post('methods')
  @UseGuards(JwtAuthGuard)
  async createPaymentMethod(
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
    @Req() req,
  ) {
    return this.paymentsService.createPaymentMethod(
      req.user.id,
      createPaymentMethodDto,
    );
  }

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethods(@Req() req) {
    return this.paymentsService.getPaymentMethods(req.user.id);
  }

  @Delete('methods/:id')
  @UseGuards(JwtAuthGuard)
  async deletePaymentMethod(@Param('id') id: string, @Req() req) {
    return this.paymentsService.deletePaymentMethod(id, req.user.id);
  }
}
