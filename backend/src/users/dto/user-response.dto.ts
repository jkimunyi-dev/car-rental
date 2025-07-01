import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: '+1234567890', required: false })
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ 
    example: 'https://res.cloudinary.com/yourcloud/image/upload/v1234567890/users/avatars/abc123.jpg',
    required: false 
  })
  avatar?: string;

  @ApiProperty({ example: '1990-01-01T00:00:00.000Z', required: false })
  dateOfBirth?: Date;

  @ApiProperty({ example: 'DL123456789', required: false })
  licenseNumber?: string;

  @ApiProperty({ example: '123 Main St', required: false })
  address?: string;

  @ApiProperty({ example: 'New York', required: false })
  city?: string;

  @ApiProperty({ example: 'USA', required: false })
  country?: string;

  @ApiProperty({ example: '10001', required: false })
  zipCode?: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
