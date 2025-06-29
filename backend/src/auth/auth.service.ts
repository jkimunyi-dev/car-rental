import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { IAuthService } from './auth.interface';

@Injectable()
export class AuthService implements IAuthService {
  public readonly refreshTokenExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
  public readonly accessTokenExpiresIn = 60 * 60 * 1000; // 1 hour
  public readonly maxLoginAttempts = 5;
  public readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: registerDto.email }, { phone: registerDto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        dateOfBirth: registerDto.dateOfBirth
          ? new Date(registerDto.dateOfBirth)
          : null,
        role: Role.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
      },
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Store verification token in database
    await this.prisma.systemSettings.create({
      data: {
        key: `email_verification_${user.id}`,
        value: JSON.stringify({
          token: hashedVerificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      },
    });

    // Generate auth tokens
    const tokens = await this.generateTokens(user.id);

    // Send welcome email with verification URL
    await this.emailService.sendWelcomeEmail({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      verificationUrl: this.generateVerificationUrl(verificationToken),
    });

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Check rate limiting
    await this.checkRateLimit(loginDto.email);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      await this.recordFailedAttempt(loginDto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      await this.recordFailedAttempt(loginDto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is verified - NEW CHECK
    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox for the verification email.',
      );
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(loginDto.email);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, loginDto.rememberMe);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    try {
      this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      });

      // Find refresh token in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if user is still active
      if (!storedToken.user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(storedToken.userId);

      // Remove old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return {
        user: {
          id: storedToken.user.id,
          email: storedToken.user.email,
          firstName: storedToken.user.firstName,
          lastName: storedToken.user.lastName,
          role: storedToken.user.role,
          avatar: storedToken.user.avatar,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.accessTokenExpiresIn,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store hashed token in database (you might want to add a PasswordReset model)
    // For now, we'll use a system setting
    await this.prisma.systemSettings.upsert({
      where: { key: `password_reset_${user.id}` },
      update: {
        value: JSON.stringify({
          token: hashedToken,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        }),
      },
      create: {
        key: `password_reset_${user.id}`,
        value: JSON.stringify({
          token: hashedToken,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        }),
      },
    });

    // Send password reset email
    await this.emailService.sendPasswordReset({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      resetUrl: this.generateResetUrl(resetToken),
      expiresIn: '1 hour',
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: resetPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get stored reset token
    const resetData = await this.prisma.systemSettings.findUnique({
      where: { key: `password_reset_${user.id}` },
    });

    if (!resetData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const { token: storedToken, expiresAt } = JSON.parse(resetData.value);

    // Check if token has expired
    if (new Date() > new Date(expiresAt)) {
      throw new BadRequestException('Reset token has expired');
    }

    // Verify token
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetPasswordDto.token)
      .digest('hex');
    if (hashedToken !== storedToken) {
      throw new BadRequestException('Invalid reset token');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Remove reset token
    await this.prisma.systemSettings.delete({
      where: { key: `password_reset_${user.id}` },
    });

    // Logout all sessions
    await this.logoutAll(user.id);
  }

  async verifyEmail(token: string): Promise<void> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    // Hash the provided token to match stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find all verification tokens and check each one
    const verificationEntries = await this.prisma.systemSettings.findMany({
      where: {
        key: { startsWith: 'email_verification_' },
      },
    });

    let matchingEntry: any = null;
    let userId: string = '';

    // Check each entry for matching token
    for (const entry of verificationEntries) {
      try {
        const storedData = JSON.parse(entry.value);
        if (storedData.token === hashedToken) {
          matchingEntry = { ...entry, parsedValue: storedData };
          userId = entry.key.replace('email_verification_', '');
          break;
        }
      } catch (error) {
        // Skip malformed entries
        continue;
      }
    }

    if (!matchingEntry) {
      throw new BadRequestException('Invalid verification token');
    }

    // Check if token has expired
    if (new Date() > new Date(matchingEntry.parsedValue.expiresAt)) {
      // Clean up expired token
      await this.prisma.systemSettings.delete({
        where: { id: matchingEntry.id },
      });
      throw new BadRequestException('Verification token has expired');
    }

    // Verify the user exists and update
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      // Clean up token and return success
      await this.prisma.systemSettings.delete({
        where: { id: matchingEntry.id },
      });
      return; // Email already verified
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    // Remove verification token from database
    await this.prisma.systemSettings.delete({
      where: { id: matchingEntry.id },
    });
  }

  async generateTokens(userId: string, rememberMe = false) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '1h',
    });

    const refreshTokenExpiry = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + this.refreshTokenExpiresIn);

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      expiresIn: rememberMe ? '30d' : '7d',
    });

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: refreshTokenExpiry,
      },
    });

    return { accessToken, refreshToken };
  }

  async checkRateLimit(email: string): Promise<void> {
    const key = `login_attempts_${email}`;
    const attempts = await this.prisma.systemSettings.findUnique({
      where: { key },
    });

    if (attempts) {
      const { count, lockedUntil } = JSON.parse(attempts.value);

      if (lockedUntil && new Date() < new Date(lockedUntil)) {
        throw new UnauthorizedException(
          'Account temporarily locked due to too many failed attempts',
        );
      }

      if (count >= this.maxLoginAttempts) {
        const lockUntil = new Date(Date.now() + this.lockoutDuration);
        await this.prisma.systemSettings.update({
          where: { key },
          data: {
            value: JSON.stringify({ count, lockedUntil: lockUntil }),
          },
        });
        throw new UnauthorizedException(
          'Account temporarily locked due to too many failed attempts',
        );
      }
    }
  }

  async recordFailedAttempt(email: string): Promise<void> {
    const key = `login_attempts_${email}`;
    const attempts = await this.prisma.systemSettings.findUnique({
      where: { key },
    });

    const currentCount = attempts ? JSON.parse(attempts.value).count : 0;
    const newCount = currentCount + 1;

    await this.prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: JSON.stringify({ count: newCount }),
      },
      create: {
        key,
        value: JSON.stringify({ count: newCount }),
      },
    });
  }

  async resetFailedAttempts(email: string): Promise<void> {
    const key = `login_attempts_${email}`;
    await this.prisma.systemSettings.deleteMany({
      where: { key },
    });
  }

  private generateVerificationUrl(verificationToken: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return `${frontendUrl}/verify-email?token=${verificationToken}`;
  }

  private generateResetUrl(resetToken: string): string {
    // Implement your password reset URL generation logic
    return `http://your-frontend.com/reset-password?token=${resetToken}`;
  }

  // Add method to resend verification email
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Update or create verification token in database
    await this.prisma.systemSettings.upsert({
      where: { key: `email_verification_${user.id}` },
      update: {
        value: JSON.stringify({
          token: hashedVerificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }),
      },
      create: {
        key: `email_verification_${user.id}`,
        value: JSON.stringify({
          token: hashedVerificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }),
      },
    });

    // Send verification email
    await this.emailService.sendEmailVerification({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      verificationUrl: this.generateVerificationUrl(verificationToken),
      expiresIn: '24 hours',
    });
  }
}
