import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';

export class AvailabilityUpdateDto {
  @ApiProperty({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  status: VehicleStatus;
}
