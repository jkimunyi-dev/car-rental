import { IsEnum } from 'class-validator';
import { VehicleStatus } from '@prisma/client';

export class AvailabilityUpdateDto {
  @IsEnum(VehicleStatus)
  status: VehicleStatus;
}