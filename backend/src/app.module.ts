import { Module } from '@nestjs/common';
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
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AdminModule } from './admin/admin.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UploadService } from './upload/upload.service';
import { UploadModule } from './upload/upload.module';
import { EmailService } from './email/email.service';
import { EmailModule } from './email/email.module';

@Module({
  imports: [AuthModule, UsersModule, PaymentsModule, AdminModule, PrismaModule, UploadModule, EmailModule],
  controllers: [AppController, AuthController, UsersController, PaymentsController, AdminController],
  providers: [AppService, UsersService, PaymentsService, AdminService, PrismaService, UploadService, EmailService],
})
export class AppModule {}
