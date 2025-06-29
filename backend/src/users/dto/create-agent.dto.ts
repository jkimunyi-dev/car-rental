import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsPhoneNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: 'agent@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain lowercase, uppercase and number',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Agent' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ example: '+254700000001' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'Nairobi Office', required: false })
  @IsOptional()
  @IsString()
  workLocation?: string;

  @ApiProperty({ example: 'AGT001', required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;
}