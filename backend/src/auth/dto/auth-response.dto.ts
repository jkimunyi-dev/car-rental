import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BaseResponseDto, DataResponseDto } from './base-response.dto';

export class UserDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role: Role;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar?: string;
}

export class AuthTokensDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 3600 })
  expiresIn: number;
}

export class AuthDataDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;
}

export class AuthResponseDto extends DataResponseDto<AuthDataDto> {
  constructor(user: UserDto, tokens: AuthTokensDto, message: string = 'Authentication successful') {
    super(true, message, { user, tokens });
  }
}

export class RegisterDataDto {
  @ApiProperty({ example: 'cuid123' })
  userId: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

export class RegisterResponseDto extends DataResponseDto<RegisterDataDto> {
  constructor(userId: string, email: string, message: string = 'Registration successful. Please check your email to verify your account.') {
    super(true, message, { userId, email });
  }
}

export class MessageResponseDto extends BaseResponseDto {
  constructor(message: string, success: boolean = true) {
    super(success, message);
  }
}
