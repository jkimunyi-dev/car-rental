import { Role } from '@prisma/client';

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
