import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { UsersModule } from './users/users.module';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { PaymentsModule } from './payments/payments.module';

import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UploadService } from './upload/upload.service';
import { UploadModule } from './upload/upload.module';
import { EmailService } from './email/email.service';
import { EmailModule } from './email/email.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { BookingsModule } from './bookings/bookings.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AdminModule } from './admin/admin.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    AuthModule,
    UsersModule,
    PaymentsModule,
    PrismaModule,
    UploadModule,
    EmailModule,
    VehiclesModule,
    BookingsModule,
    AdminModule,
  ],
  controllers: [
    AppController,
    AuthController,
    UsersController,
    PaymentsController,
    AdminController,
  ],
  providers: [
    AppService,
    UsersService,
    PaymentsService,
    PrismaService,
    UploadService,
    EmailService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AdminService,
  ],
})
export class AppModule {}
