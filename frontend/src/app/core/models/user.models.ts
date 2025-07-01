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

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive?: boolean;
  isVerified?: boolean;
  password: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  dateOfBirth?: string;
  avatar?: File;
}

export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'password'>> {
  newAvatar?: File;
}

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

export interface UserApiResponse {
  data: {
    users: AdminUser[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}