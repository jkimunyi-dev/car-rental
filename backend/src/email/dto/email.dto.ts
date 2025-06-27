import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateNested,
  IsEmail,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EmailTemplate, EmailPriority } from '../email.interface';

export class EmailRecipientDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class SendBulkEmailDto {
  @ApiProperty({ type: [EmailRecipientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  recipients: EmailRecipientDto[];

  @ApiProperty({ enum: EmailTemplate })
  @IsEnum(EmailTemplate)
  template: EmailTemplate;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsObject()
  baseContext: any;

  @ApiProperty({ enum: EmailPriority, required: false })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiProperty({ required: false, minimum: 1, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  batchSize?: number;
}

export class SendMarketingCampaignDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: EmailTemplate })
  @IsEnum(EmailTemplate)
  template: EmailTemplate;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsObject()
  context: any;

  @ApiProperty()
  @IsObject()
  targetAudience: {
    roles?: string[];
    isActive?: boolean;
    isVerified?: boolean;
    lastLoginAfter?: Date;
    customFilter?: any;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  scheduledAt?: Date;

  @ApiProperty({ enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'] })
  @IsString()
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sentCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  deliveredCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  failedCount?: number;
}
