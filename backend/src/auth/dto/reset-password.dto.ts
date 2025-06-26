import { IsEmail, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @IsString()
  email: string;

  @IsString()
  token: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain lowercase, uppercase and number',
  })
  newPassword: string;
}
