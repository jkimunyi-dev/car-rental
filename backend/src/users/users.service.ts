import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

interface FindAllOptions {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
}

interface ActivityLogOptions {
  page: number;
  limit: number;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { phone: createUserDto.phone },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        dateOfBirth: createUserDto.dateOfBirth ? new Date(createUserDto.dateOfBirth) : null,
      },
    });

    // Log activity
    await this.logActivity(user.id, 'USER_CREATED', 'User account created');

    return this.formatUserResponse(user);
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, search, role, isActive } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.formatUserResponse),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUserResponse(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for email/phone conflicts
    if (updateUserDto.email || updateUserDto.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                { email: updateUserDto.email },
                { phone: updateUserDto.phone },
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('Email or phone already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        dateOfBirth: updateUserDto.dateOfBirth ? new Date(updateUserDto.dateOfBirth) : undefined,
      },
    });

    // Log activity
    await this.logActivity(id, 'USER_UPDATED', 'User profile updated by admin');

    return this.formatUserResponse(updatedUser);
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateProfileDto,
        dateOfBirth: updateProfileDto.dateOfBirth ? new Date(updateProfileDto.dateOfBirth) : undefined,
      },
    });

    // Log activity
    await this.logActivity(id, 'PROFILE_UPDATED', 'User updated their profile');

    return this.formatUserResponse(updatedUser);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Upload to Cloudinary
      const uploadResult = await this.uploadService.uploadImage(file, 'users/avatars');

      // Update user avatar
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { avatar: uploadResult.secure_url },
      });

      // Log activity
      await this.logActivity(userId, 'AVATAR_UPDATED', 'User updated their avatar');

      return {
        message: 'Avatar uploaded successfully',
        avatarUrl: updatedUser.avatar,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload avatar');
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Log activity
    await this.logActivity(userId, 'PASSWORD_CHANGED', 'User changed their password');

    // Logout all sessions (remove all refresh tokens)
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    // Log activity
    await this.logActivity(id, 'USER_DELETED', 'User account deleted by admin');
  }

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });

    // Log activity
    const action = isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
    const description = isActive ? 'User account activated' : 'User account deactivated';
    await this.logActivity(id, action, description);

    // If deactivating, remove all refresh tokens
    if (!isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }
  }

  async getUserActivity(userId: string, options: ActivityLogOptions) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.systemSettings.findMany({
        where: {
          key: { startsWith: `activity_${userId}_` },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.systemSettings.count({
        where: {
          key: { startsWith: `activity_${userId}_` },
        },
      }),
    ]);

    const formattedActivities = activities.map((activity) => {
      const data = JSON.parse(activity.value);
      return {
        id: activity.id,
        action: data.action,
        description: data.description,
        timestamp: activity.createdAt,
        metadata: data.metadata || {},
      };
    });

    return {
      data: formattedActivities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async logActivity(
    userId: string,
    action: string,
    description: string,
    metadata: any = {},
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const key = `activity_${userId}_${timestamp}`;

    await this.prisma.systemSettings.create({
      data: {
        key,
        value: JSON.stringify({
          action,
          description,
          metadata,
          userId,
        }),
      },
    });
  }

  private formatUserResponse(user: any): UserResponseDto {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}