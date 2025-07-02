import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateVehicleDto, VehicleSearchDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { AvailabilityUpdateDto } from './dto/availability-update.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { ApiResponse, PaginatedResponse } from '../common/dto/api-response.dto';
import { Role } from '@prisma/client';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

interface SearchOptions extends VehicleSearchDto {
  userId?: string;
  userRole?: Role;
}

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(
    createVehicleDto: CreateVehicleDto,
    images?: Express.Multer.File[],
  ): Promise<ApiResponse<VehicleResponseDto>> {
    try {
      // Check if license plate already exists
      const existingVehicle = await this.prisma.vehicle.findUnique({
        where: { licensePlate: createVehicleDto.licensePlate },
      });

      if (existingVehicle) {
        throw new ConflictException('Vehicle with this license plate already exists');
      }

      // Upload images to Cloudinary
      let imageObjects: any[] = [];
      if (images && images.length > 0) {
        const uploadPromises = images.map(async (image) => {
          const result = await this.uploadService.uploadImage(image, 'vehicles');
          return {
            url: result.secure_url,
            publicId: result.public_id,
            alt: `${createVehicleDto.make} ${createVehicleDto.model}`
          };
        });
        
        imageObjects = await Promise.all(uploadPromises);
      }

      const vehicle = await this.prisma.vehicle.create({
        data: {
          ...createVehicleDto,
          features: Array.isArray(createVehicleDto.features) 
            ? createVehicleDto.features 
            : createVehicleDto.features 
            ? [createVehicleDto.features] 
            : [],
          images: imageObjects,
          primaryImage: imageObjects.length > 0 ? imageObjects[0].url : null,
          primaryImagePublicId: imageObjects.length > 0 ? imageObjects[0].publicId : null,
        },
      });

      const formattedVehicle = this.formatVehicleResponse(vehicle);
      return ApiResponse.success(formattedVehicle, 'Vehicle created successfully');
    } catch (error) {
      throw error;
    }
  }

  async findAll(options: SearchOptions): Promise<ApiResponse<PaginatedResponse<VehicleResponseDto>>> {
    try {
      const { page = 1, limit = 10, ...searchCriteria } = options;
      const skip = (page - 1) * limit;

      const where = this.buildSearchWhere(searchCriteria);

      const [vehicles, total] = await Promise.all([
        this.prisma.vehicle.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
        }),
        this.prisma.vehicle.count({ where }),
      ]);

      const formattedVehicles = vehicles.map(this.formatVehicleResponse);
      const totalPages = Math.ceil(total / limit);

      const paginatedResponse: PaginatedResponse<VehicleResponseDto> = {
        data: formattedVehicles,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return ApiResponse.success(paginatedResponse, 'Vehicles retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string): Promise<ApiResponse<VehicleResponseDto>> {
    try {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id },
        include: {
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      const formattedVehicle = this.formatVehicleResponse(vehicle);
      return ApiResponse.success(formattedVehicle, 'Vehicle retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    images?: Express.Multer.File[],
    userRole?: Role,
  ): Promise<ApiResponse<VehicleResponseDto>> {
    try {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      // Check permissions - agents can only update certain fields
      if (userRole === Role.AGENT) {
        const allowedFields = ['location', 'description', 'mileage', 'status'];
        const updateFields = Object.keys(updateVehicleDto);
        const unauthorizedFields = updateFields.filter(field => !allowedFields.includes(field));
        
        if (unauthorizedFields.length > 0) {
          throw new ForbiddenException(`Agents cannot update these fields: ${unauthorizedFields.join(', ')}`);
        }
      }

      // Check for license plate conflicts
      if (updateVehicleDto.licensePlate) {
        const existing = await this.prisma.vehicle.findUnique({
          where: { licensePlate: updateVehicleDto.licensePlate },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException('Vehicle with this license plate already exists');
        }
      }

      // Handle new images upload
      let currentImages = vehicle.images as any[] || [];
      if (images && images.length > 0) {
        const uploadPromises = images.map(async (image) => {
          const result = await this.uploadService.uploadImage(image, 'vehicles');
          return {
            url: result.secure_url,
            publicId: result.public_id,
            alt: `${updateVehicleDto.make || vehicle.make} ${updateVehicleDto.model || vehicle.model}`
          };
        });
        
        const newImageObjects = await Promise.all(uploadPromises);
        currentImages = [...currentImages, ...newImageObjects];
      }

      const updatedVehicle = await this.prisma.vehicle.update({
        where: { id },
        data: {
          ...updateVehicleDto,
          features: updateVehicleDto.features
            ? Array.isArray(updateVehicleDto.features)
              ? updateVehicleDto.features
              : [updateVehicleDto.features]
            : vehicle.features,
          images: currentImages,
          primaryImage: currentImages.length > 0 ? currentImages[0].url : null,
          primaryImagePublicId: currentImages.length > 0 ? currentImages[0].publicId : null,
        },
      });

      const formattedVehicle = this.formatVehicleResponse(updatedVehicle);
      return ApiResponse.success(formattedVehicle, 'Vehicle updated successfully');
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id },
        include: {
          bookings: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
            },
          },
        },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.bookings.length > 0) {
        throw new BadRequestException(
          'Cannot delete vehicle with active bookings',
        );
      }

      await this.prisma.vehicle.delete({ where: { id } });
      return ApiResponse.success(null, 'Vehicle deleted successfully');
    } catch (error) {
      throw error;
    }
  }

  async updateAvailability(
    id: string,
    availabilityDto: AvailabilityUpdateDto,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      await this.prisma.vehicle.update({
        where: { id },
        data: { status: availabilityDto.status },
      });

      return ApiResponse.success(
        { message: 'Vehicle availability updated successfully' },
        'Vehicle availability updated successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  async getAvailabilityCalendar(
    vehicleId: string,
    year: number,
    month: number,
  ): Promise<ApiResponse<any>> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const bookings = await this.prisma.booking.findMany({
        where: {
          vehicleId,
          status: { in: ['CONFIRMED', 'ACTIVE'] },
          OR: [
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } },
              ],
            },
          ],
        },
        select: {
          startDate: true,
          endDate: true,
          status: true,
        },
      });

      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { status: true },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      const calendarData = {
        vehicleStatus: vehicle.status,
        bookings: bookings.map((booking) => ({
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
        })),
        year,
        month,
      };

      return ApiResponse.success(calendarData, 'Availability calendar retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  async removeImage(vehicleId: string, imageUrl: string): Promise<ApiResponse<null>> {
    try {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      const currentImages = vehicle.images as any[] || [];
      const imageToRemove = currentImages.find((img: any) => img.url === imageUrl);
      
      if (!imageToRemove) {
        throw new NotFoundException('Image not found');
      }

      const updatedImages = currentImages.filter((img: any) => img.url !== imageUrl);

      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { 
          images: updatedImages,
          primaryImage: updatedImages.length > 0 ? updatedImages[0].url : null,
          primaryImagePublicId: updatedImages.length > 0 ? updatedImages[0].publicId : null,
        },
      });

      // Delete from Cloudinary
      try {
        await this.uploadService.deleteImage(imageToRemove.publicId);
      } catch (error) {
        console.error('Failed to delete image from Cloudinary:', error);
      }

      return ApiResponse.success(null, 'Image removed successfully');
    } catch (error) {
      throw error;
    }
  }

  async bulkImport(
    file: Express.Multer.File,
    bulkImportDto: BulkImportDto,
  ): Promise<ApiResponse<{ success: number; failed: number; errors: string[] }>> {
    try {
      const results = { success: 0, failed: 0, errors: [] };
      const csvData = [];

      // Parse CSV
      const stream = Readable.from(file.buffer.toString());

      const importResults = await new Promise<{ success: number; failed: number; errors: string[] }>((resolve) => {
        stream
          .pipe(csv())
          .on('data', (data) => csvData.push(data))
          .on('end', async () => {
            for (const row of csvData) {
              try {
                await this.createVehicleFromCsvRow(row, bulkImportDto);
                results.success++;
              } catch (error) {
                results.failed++;
                results.errors.push(
                  `Row ${results.success + results.failed}: ${error.message}`,
                );
              }
            }
            resolve(results);
          });
      });

      return ApiResponse.success(importResults, 'Bulk import completed successfully');
    } catch (error) {
      throw error;
    }
  }

  async exportVehicles(format: 'csv' | 'json' = 'csv'): Promise<ApiResponse<any>> {
    try {
      const vehicles = await this.prisma.vehicle.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (format === 'json') {
        return ApiResponse.success(vehicles, 'Vehicles exported successfully');
      }

      // Convert to CSV format
      const csvHeader = [
        'id',
        'make',
        'model',
        'year',
        'category',
        'transmission',
        'fuelType',
        'seats',
        'doors',
        'color',
        'licensePlate',
        'vin',
        'pricePerDay',
        'pricePerHour',
        'location',
        'status',
        'mileage',
        'description',
      ].join(',');

      const csvRows = vehicles.map((vehicle) =>
        [
          vehicle.id,
          vehicle.make,
          vehicle.model,
          vehicle.year,
          vehicle.category,
          vehicle.transmission,
          vehicle.fuelType,
          vehicle.seats,
          vehicle.doors,
          vehicle.color,
          vehicle.licensePlate,
          vehicle.vin || '',
          vehicle.pricePerDay,
          vehicle.pricePerHour || '',
          vehicle.location,
          vehicle.status,
          vehicle.mileage,
          vehicle.description || '',
        ].join(','),
      );

      const csvData = [csvHeader, ...csvRows].join('\n');
      return ApiResponse.success(csvData, 'Vehicles exported as CSV successfully');
    } catch (error) {
      throw error;
    }
  }

  private async createVehicleFromCsvRow(
    row: any,
    importOptions: BulkImportDto,
  ) {
    // Validate required fields
    const requiredFields = [
      'make',
      'model',
      'year',
      'licensePlate',
      'pricePerDay',
    ];
    for (const field of requiredFields) {
      if (!row[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check if vehicle already exists
    const existing = await this.prisma.vehicle.findUnique({
      where: { licensePlate: row.licensePlate },
    });

    if (existing && !importOptions.overwriteExisting) {
      throw new Error(
        `Vehicle with license plate ${row.licensePlate} already exists`,
      );
    }

    // Handle image upload from URLs
    let imageUrls: string[] = [];
    if (row.imageUrls) {
      const urls = row.imageUrls.split(',').map((url) => url.trim());
      imageUrls = await this.uploadImagesFromUrls(urls);
    }

    const vehicleData = {
      make: row.make,
      model: row.model,
      year: parseInt(row.year),
      category: row.category || 'ECONOMY',
      transmission: row.transmission || 'MANUAL',
      fuelType: row.fuelType || 'PETROL',
      seats: parseInt(row.seats) || 5,
      doors: parseInt(row.doors) || 4,
      color: row.color || 'Unknown',
      licensePlate: row.licensePlate,
      vin: row.vin || null,
      pricePerDay: parseFloat(row.pricePerDay),
      pricePerHour: row.pricePerHour ? parseFloat(row.pricePerHour) : null,
      location: row.location || importOptions.defaultLocation,
      description: row.description || null,
      features: row.features
        ? row.features.split(',').map((f) => f.trim())
        : [],
      images: imageUrls,
      mileage: row.mileage ? parseFloat(row.mileage) : 0,
      status: row.status || 'AVAILABLE',
    };

    if (existing && importOptions.overwriteExisting) {
      await this.prisma.vehicle.update({
        where: { id: existing.id },
        data: vehicleData,
      });
    } else {
      await this.prisma.vehicle.create({
        data: vehicleData,
      });
    }
  }

  private async uploadVehicleImages(
    images: Express.Multer.File[],
  ): Promise<string[]> {
    const uploadPromises = images.map((image) =>
      this.uploadService.uploadImage(image, 'vehicles'),
    );

    const results = await Promise.all(uploadPromises);
    return results.map((result: any) => result.secure_url);
  }

  private async uploadImagesFromUrls(urls: string[]): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const url of urls) {
      try {
        const uploadResult = await this.uploadService.uploadImageFromUrl(
          url,
          'vehicles',
        );
        uploadedUrls.push(uploadResult.secure_url);
      } catch (error) {
        console.error(`Failed to upload image from URL ${url}:`, error);
      }
    }

    return uploadedUrls;
  }

  private buildSearchWhere(criteria: any) {
    const where: any = {};

    // Basic filters
    if (criteria.location) {
      where.location = { contains: criteria.location, mode: 'insensitive' };
    }

    if (criteria.category) {
      where.category = criteria.category;
    }

    if (criteria.transmission) {
      where.transmission = criteria.transmission;
    }

    if (criteria.fuelType) {
      where.fuelType = criteria.fuelType;
    }

    if (criteria.minSeats) {
      where.seats = { gte: criteria.minSeats };
    }

    if (criteria.minPrice || criteria.maxPrice) {
      where.pricePerDay = {};
      if (criteria.minPrice) where.pricePerDay.gte = criteria.minPrice;
      if (criteria.maxPrice) where.pricePerDay.lte = criteria.maxPrice;
    }

    if (criteria.search) {
      where.OR = [
        { make: { contains: criteria.search, mode: 'insensitive' } },
        { model: { contains: criteria.search, mode: 'insensitive' } },
        { description: { contains: criteria.search, mode: 'insensitive' } },
      ];
    }

    // Availability filter
    if (criteria.startDate && criteria.endDate) {
      where.AND = [
        { status: 'AVAILABLE' },
        {
          NOT: {
            bookings: {
              some: {
                AND: [
                  { status: { in: ['CONFIRMED', 'ACTIVE'] } },
                  {
                    OR: [
                      {
                        AND: [
                          { startDate: { lte: new Date(criteria.endDate) } },
                          { endDate: { gte: new Date(criteria.startDate) } },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      ];
    }

    // Default to active vehicles only
    where.isActive = true;

    return where;
  }

  private formatVehicleResponse(vehicle: any): VehicleResponseDto {
    return {
      ...vehicle,
      averageRating:
        vehicle.reviews?.length > 0
          ? vehicle.reviews.reduce((sum, review) => sum + review.rating, 0) /
            vehicle.reviews.length
          : 0,
      totalReviews: vehicle._count?.reviews || 0,
      totalBookings: vehicle._count?.bookings || 0,
    };
  }
}
