export interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface DataResponse<T> extends BaseResponse {
  data: T;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthData {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterData {
  userId: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  dateOfBirth?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// Response Types
export type AuthResponse = DataResponse<AuthData>;
export type RegisterResponse = DataResponse<RegisterData>;
export type MessageResponse = BaseResponse;