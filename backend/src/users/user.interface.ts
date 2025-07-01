import { User as PrismaUser, Role, Prisma } from '@prisma/client';

// Use Prisma's generated User type
export type User = PrismaUser;

// Safe user without password
export type SafeUser = Omit<PrismaUser, 'password'>;

// Use Prisma's input types for creation and updates
export type CreateUserData = Omit<
  Prisma.UserCreateInput,
  'bookings' | 'reviews' | 'paymentMethods' | 'refreshTokens'
>;

export type UpdateUserData = Omit<
  Prisma.UserUpdateInput,
  'bookings' | 'reviews' | 'paymentMethods' | 'refreshTokens'
>;

// Profile update excludes role and admin fields
export type UpdateProfileData = Pick<
  Prisma.UserUpdateInput,
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'dateOfBirth'
  | 'licenseNumber'
  | 'address'
  | 'city'
  | 'country'
  | 'zipCode'
  | 'avatar'
  // | 'avatarPublicId' // Temporarily commented out
>;

// Use Prisma's select for specific user data
export type UserAuthData = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    role: true;
    isActive: true;
    isVerified: true;
  };
}>;

export type UserWithBookings = Prisma.UserGetPayload<{
  include: {
    bookings: true;
  };
}>;

// Keep custom interfaces that don't exist in Prisma
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Query options for finding users
export interface FindUsersOptions {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// User list response
export interface UsersListResponse extends PaginatedResponse<SafeUser> {
  // Adding a discriminator to avoid empty interface warning
  readonly _type?: 'UsersListResponse';
}

// Activity log interfaces
export interface ActivityLogData {
  action: string;
  description: string;
  metadata?: Record<string, any>;
  userId: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface ActivityLogOptions {
  page: number;
  limit: number;
}

export interface ActivityLogResponse
  extends PaginatedResponse<ActivityLogEntry> {
  // Adding a discriminator to avoid empty interface warning
  readonly _type?: 'ActivityLogResponse';
}

// File upload interfaces
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface AvatarUploadResponse {
  message: string;
  avatarUrl: string;
  publicId: string;
}

// Enhanced Cloudinary upload result interface
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  resource_type: string;
  created_at: string;
  version: number;
  type: string;
  url: string;
  [key: string]: any;
}

// Image data interface
export interface ImageData {
  url: string;
  publicId: string;
  alt?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

// Service method response interfaces
export interface UserServiceResponse {
  success: boolean;
  message: string;
  data?: SafeUser | SafeUser[] | any;
}

export interface PasswordChangeResponse {
  message: string;
}

export interface UserStatusUpdateResponse {
  message: string;
}

export interface UserDeleteResponse {
  message: string;
}

// User statistics interface (for dashboard/admin use)
export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  usersByRole: Record<Role, number>;
  recentUsers: SafeUser[];
}

// User preferences interface
export interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  language: string;
  timezone: string;
  currency: string;
}

// Extended user interface with preferences
export interface UserWithPreferences extends SafeUser {
  preferences?: UserPreferences;
}

// User validation interfaces
export interface UserValidationRules {
  email: {
    required: boolean;
    format: RegExp;
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  phone: {
    required: boolean;
    format: RegExp;
  };
  name: {
    minLength: number;
    maxLength: number;
  };
}

// User session interface
export interface UserSession {
  userId: string;
  sessionId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

// Bulk operations interfaces
export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'verify' | 'unverify';
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    userId: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

// User export/import interfaces
export interface UserExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields?: string[];
  filters?: FindUsersOptions;
}

export interface UserImportData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isActive?: boolean;
}

export interface UserImportResult {
  imported: number;
  failed: Array<{
    row: number;
    data: UserImportData;
    errors: string[];
  }>;
  duplicates: string[];
}

// Error interfaces
export interface UserError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Repository interface (for database operations)
export interface UserRepository {
  create(userData: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findMany(options: FindUsersOptions): Promise<PaginatedResponse<User>>;
  update(id: string, userData: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, isActive: boolean): Promise<void>;
  count(filters?: Partial<FindUsersOptions>): Promise<number>;
}

// Service interface
export interface IUsersService {
  create(createUserDto: CreateUserData): Promise<SafeUser>;
  findAll(options: FindUsersOptions): Promise<UsersListResponse>;
  findOne(id: string): Promise<SafeUser>;
  update(id: string, updateUserDto: UpdateUserData): Promise<SafeUser>;
  updateProfile(
    id: string,
    updateProfileDto: UpdateProfileData,
  ): Promise<SafeUser>;
  uploadAvatar(
    userId: string,
    file: UploadedFile,
  ): Promise<AvatarUploadResponse>;
  changePassword(
    userId: string,
    changePasswordDto: ChangePasswordData,
  ): Promise<void>;
  remove(id: string): Promise<void>;
  updateStatus(id: string, isActive: boolean): Promise<void>;
  getUserActivity(
    userId: string,
    options: ActivityLogOptions,
  ): Promise<ActivityLogResponse>;
}
