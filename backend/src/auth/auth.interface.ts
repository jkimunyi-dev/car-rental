import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, MessageResponseDto, RegisterResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshToken as PrismaRefreshToken, Prisma } from '@prisma/client';

/**
 * Authentication Interface
 * Defines all authentication-related operations and contracts
 */
export interface IAuthInterface {
  // Authentication Operations
  register(registerDto: RegisterDto): Promise<RegisterResponseDto>; // Changed
  login(loginDto: LoginDto): Promise<AuthResponseDto>;
  refreshTokens(refreshToken: string): Promise<AuthResponseDto>;
  logout(refreshToken: string): Promise<MessageResponseDto>; // Changed
  logoutAll(userId: string): Promise<MessageResponseDto>; // Changed

  // Password Management
  forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<MessageResponseDto>; // Changed
  resetPassword(resetPasswordDto: ResetPasswordDto): Promise<MessageResponseDto>; // Changed

  // Email Verification
  verifyEmail(token: string): Promise<MessageResponseDto>; // Changed
  resendVerificationEmail(email: string): Promise<MessageResponseDto>; // Changed
}

/**
 * Token Generation Interface
 * Defines token generation contracts
 */
export interface ITokenService {
  generateTokens(
    userId: string,
    rememberMe?: boolean,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
}

/**
 * Rate Limiting Interface
 * Defines rate limiting and security contracts
 */
export interface IRateLimitService {
  checkRateLimit(email: string): Promise<void>;
  recordFailedAttempt(email: string): Promise<void>; // Fixed: was "recordFailed Attempt"
  resetFailedAttempts(email: string): Promise<void>;
}

/**
 * Authentication Configuration Interface
 * Defines authentication system configuration
 */
export interface IAuthConfig {
  readonly refreshTokenExpiresIn: number; // 7 days in milliseconds
  readonly accessTokenExpiresIn: number; // 1 hour in milliseconds
  readonly maxLoginAttempts: number; // Maximum login attempts
  readonly lockoutDuration: number; // Account lockout duration in milliseconds
}

/**
 * User Authentication Data Interface
 * Defines the structure of authenticated user data
 */
export type IAuthUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    firstName: true;
    lastName: true;
    role: true;
    avatar: true;
    isActive: true;
    isVerified: true;
  };
}>;

/**
 * JWT Payload Interface
 * Defines the structure of JWT token payload
 */
export interface IJwtPayload {
  sub: string; // User ID
  iat?: number; // Issued at
  exp?: number; // Expires at
}

/**
 * Refresh Token Data Interface
 * Defines the structure of stored refresh token data
 */
export type RefreshToken = PrismaRefreshToken;

export type IRefreshTokenData = Prisma.RefreshTokenGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
        role: true;
        avatar: true;
        isActive: true;
        isVerified: true;
      };
    };
  };
}>;

/**
 * Password Reset Data Interface
 * Defines the structure of password reset token data
 */
export interface IPasswordResetData {
  token: string;
  expiresAt: Date;
}

/**
 * Login Attempt Data Interface
 * Defines the structure of login attempt tracking
 */
export interface ILoginAttemptData {
  count: number;
  lockedUntil?: Date;
}

/**
 * Email Verification Data Interface
 * Defines the structure of email verification token data
 */
export interface IEmailVerificationData {
  token: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Authentication Response Interface
 * Defines the complete authentication response structure
 */
export interface IAuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Authentication Service Implementation Interface
 * Complete interface that the AuthService should implement
 */
export interface IAuthService
  extends IAuthInterface,
    ITokenService,
    IRateLimitService {
  // Configuration properties
  readonly refreshTokenExpiresIn: number;
  readonly accessTokenExpiresIn: number;
  readonly maxLoginAttempts: number;
  readonly lockoutDuration: number;
}

/**
 * Authentication Error Types
 * Defines custom error types for authentication
 */
export interface IAuthError {
  code: string;
  message: string;
  statusCode: number;
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    statusCode: 401,
  },
  ACCOUNT_LOCKED: {
    code: 'ACCOUNT_LOCKED',
    message: 'Account temporarily locked due to too many failed attempts',
    statusCode: 401,
  },
  ACCOUNT_DEACTIVATED: {
    code: 'ACCOUNT_DEACTIVATED',
    message: 'Account is deactivated',
    statusCode: 401,
  },
  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Please verify your email address before logging in',
    statusCode: 401,
  }, // NEW ERROR
  USER_EXISTS: {
    code: 'USER_EXISTS',
    message: 'User with this email or phone already exists',
    statusCode: 409,
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid or expired token',
    statusCode: 401,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Token has expired',
    statusCode: 401,
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    statusCode: 404,
  },
  EMAIL_ALREADY_VERIFIED: {
    code: 'EMAIL_ALREADY_VERIFIED',
    message: 'Email address is already verified',
    statusCode: 400,
  }, // NEW ERROR
} as const;

/**
 * Authentication Events Interface
 * Defines events that can be emitted during authentication operations
 */
export interface IAuthEvents {
  USER_REGISTERED: 'user.registered';
  USER_LOGGED_IN: 'user.logged_in';
  USER_LOGGED_OUT: 'user.logged_out';
  PASSWORD_RESET_REQUESTED: 'password.reset_requested';
  PASSWORD_RESET_COMPLETED: 'password.reset_completed';
  EMAIL_VERIFIED: 'email.verified';
  ACCOUNT_LOCKED: 'account.locked';
  FAILED_LOGIN_ATTEMPT: 'login.failed_attempt';
}

/**
 * Authentication Middleware Interface
 * Defines middleware contracts for authentication
 */
export interface IAuthMiddleware {
  validateToken(token: string): Promise<IAuthUser>;
  extractTokenFromRequest(request: any): string | null;
  handleUnauthorized(): void;
}

/**
 * Complete Authentication System Interface
 * Main interface that defines the entire authentication system
 */
export interface IAuthSystem {
  service: IAuthService;
  middleware: IAuthMiddleware;
  config: IAuthConfig;
  errors: typeof AUTH_ERRORS;
  events: IAuthEvents;
}
