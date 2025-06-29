import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  @ApiProperty({ 
    enum: Role, 
    example: Role.AGENT,
    description: 'New role to assign to the user'
  })
  @IsEnum(Role, {
    message: 'Role must be one of: ADMIN, AGENT, CUSTOMER'
  })
  role: Role;
}