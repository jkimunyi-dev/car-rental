import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DarajaService } from './daraja.service';
import { InvoiceService } from './invoice.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module'; // Add EmailModule

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule], // Include EmailModule
  controllers: [PaymentsController],
  providers: [PaymentsService, DarajaService, InvoiceService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
