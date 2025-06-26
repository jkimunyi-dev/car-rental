import { Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}
