export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  licenseNumber?: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser extends User {
  // Additional admin-specific fields
}

// Update CreateUserDto to match AdminCreateUserDto from backend
export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  licenseNumber?: string;
  role: string; // Required field from AdminCreateUserDto
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  avatar?: File;
}

// Fix UpdateUserDto - password should be optional for updates
export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'password'>> {
  password?: string; // Make password optional for updates
  newAvatar?: File;
  isActive?: boolean;
  isVerified?: boolean;
}

// Fix the UserFilters interface to match component usage
export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean | null;
  isVerified?: boolean | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Fix the UserApiResponse interface to match backend response structure
export interface UserApiResponse {
  success: boolean;
  message: string;
  data: {
    users: AdminUser[];
    stats?: any;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}