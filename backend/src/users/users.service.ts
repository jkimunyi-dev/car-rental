import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { EmailService } from '../email/email.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationDto } from '../common/dto/api-response.dto';
import { CloudinaryUploadResult } from './user.interface';

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
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createUserDto.email }, { phone: createUserDto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        dateOfBirth: createUserDto.dateOfBirth
          ? new Date(createUserDto.dateOfBirth)
          : null,
      },
    });

    // Log activity
    await this.logActivity(user.id, 'USER_CREATED', 'User account created');

    return this.formatUserResponse(user);
  }

  async createAgent(createAgentDto: CreateAgentDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createAgentDto.email }, { phone: createAgentDto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createAgentDto.password, 12);

    // Create agent user
    const agent = await this.prisma.user.create({
      data: {
        email: createAgentDto.email,
        password: hashedPassword,
        firstName: createAgentDto.firstName,
        lastName: createAgentDto.lastName,
        phone: createAgentDto.phone,
        dateOfBirth: createAgentDto.dateOfBirth
          ? new Date(createAgentDto.dateOfBirth)
          : null,
        role: Role.AGENT,
        isVerified: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        isActive: true,
        avatar: true,
        createdAt: true,
      },
    });

    // Generate verification token for agent
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Store verification token in database
    await this.prisma.systemSettings.create({
      data: {
        key: `email_verification_${agent.id}`,
        value: JSON.stringify({
          token: hashedVerificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }),
      },
    });

    // Send welcome email to agent with verification URL
    await this.emailService.sendWelcomeEmail({
      user: {
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
      },
      verificationUrl: `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`,
    });

    return {
      success: true,
      message: 'Agent created successfully. Please check email for verification.',
      data: agent,
    };
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

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
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
        dateOfBirth: updateUserDto.dateOfBirth
          ? new Date(updateUserDto.dateOfBirth)
          : undefined,
      },
    });

    // Log activity
    await this.logActivity(id, 'USER_UPDATED', 'User profile updated by admin');

    return this.formatUserResponse(updatedUser);
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateProfileDto,
        dateOfBirth: updateProfileDto.dateOfBirth
          ? new Date(updateProfileDto.dateOfBirth)
          : undefined,
      },
    });

    // Log activity
    await this.logActivity(id, 'PROFILE_UPDATED', 'User updated their profile');

    return this.formatUserResponse(updatedUser);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId },
      select: { 
        id: true, 
        avatar: true
        // avatarPublicId: true // Temporarily commented out
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Delete old avatar if exists - temporarily disabled
      // if (user.avatarPublicId) {
      //   try {
      //     await this.uploadService.deleteImage(user.avatarPublicId);
      //   } catch (deleteError) {
      //     console.warn('Failed to delete old avatar:', deleteError);
      //   }
      // }

      // Upload new avatar to Cloudinary
      const uploadResult = (await this.uploadService.uploadImage(
        file,
        'users/avatars'
      )) as CloudinaryUploadResult;

      // Update user avatar in database
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { 
          avatar: uploadResult.secure_url
          // avatarPublicId: uploadResult.public_id // Temporarily commented out
        },
      });

      // Log activity
      await this.logActivity(
        userId,
        'AVATAR_UPDATED',
        'User updated their avatar',
        {
          // oldPublicId: user.avatarPublicId, // Temporarily commented out
          newPublicId: uploadResult.public_id,
          imageUrl: uploadResult.secure_url
        }
      );

      return {
        message: 'Avatar uploaded successfully',
        avatarUrl: updatedUser.avatar,
        publicId: uploadResult.public_id,
      };
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      throw new BadRequestException('Failed to upload avatar');
    }
  }

  async deleteAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        avatar: true
        // avatarPublicId: true // Temporarily commented out
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatar) {
      throw new BadRequestException('User has no avatar to delete');
    }

    try {
      // For now, we'll skip Cloudinary deletion since we don't have publicId
      // await this.uploadService.deleteImage(user.avatarPublicId);

      // Update user in database
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          avatar: null
          // avatarPublicId: null // Temporarily commented out
        },
      });

      // Log activity
      await this.logActivity(
        userId,
        'AVATAR_DELETED',
        'User deleted their avatar',
        {
          // deletedPublicId: user.avatarPublicId, // Temporarily commented out
          deletedUrl: user.avatar
        }
      );

      return {
        message: 'Avatar deleted successfully',
      };
    } catch (error) {
      console.error('Delete avatar error:', error);
      throw new BadRequestException('Failed to delete avatar');
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      select: { 
        id: true
        // avatarPublicId: true // Temporarily commented out
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete avatar from Cloudinary if exists - temporarily disabled
    // if (user.avatarPublicId) {
    //   try {
    //     await this.uploadService.deleteImage(user.avatarPublicId);
    //   } catch (error) {
    //     console.warn('Failed to delete user avatar during account deletion:', error);
    //   }
    // }

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
    const description = isActive
      ? 'User account activated'
      : 'User account deactivated';
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

  async updateUserRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: `User role updated to ${role}`,
      data: updatedUser,
    };
  }

  async getUsersByRole(role: Role, query: PaginationDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          isVerified: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where: { role } }),
    ]);

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

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
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Log activity
    await this.logActivity(
      userId,
      'PASSWORD_CHANGED',
      'User changed their password',
    );

    // Remove all refresh tokens to force re-login
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
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
    // Destructure to remove password and other sensitive data
    const { password: _password, avatarPublicId: _avatarPublicId, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
