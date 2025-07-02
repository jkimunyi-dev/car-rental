import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, VehicleSearchDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { AvailabilityUpdateDto } from './dto/availability-update.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { ApiResponse, PaginatedResponse } from '../common/dto/api-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new vehicle (Admin only)' })
  @SwaggerApiResponse({ status: 201, description: 'Vehicle created successfully' })
  async create(
    @Body() createVehicleDto: CreateVehicleDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<ApiResponse<VehicleResponseDto>> {
    try {
      console.log('Raw received data:', createVehicleDto);
      console.log('Features type:', typeof createVehicleDto.features);
      console.log('Features value:', createVehicleDto.features);

      // Process features if it's a string (from multipart form data)
      if (createVehicleDto.features && typeof createVehicleDto.features === 'string') {
        console.log('Processing features as string:', createVehicleDto.features);
        
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(createVehicleDto.features as string);
          createVehicleDto.features = parsed;
          console.log('Features parsed as JSON:', parsed);
        } catch (e) {
          // If JSON parsing fails, treat as comma-separated string
          const featuresArray = (createVehicleDto.features as string)
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0);
        
          createVehicleDto.features = featuresArray;
          console.log('Features parsed as CSV:', featuresArray);
        }
      }

      // Ensure features is always an array
      if (!Array.isArray(createVehicleDto.features)) {
        console.log('Features is not array, converting to empty array');
        createVehicleDto.features = [];
      }

      console.log('Final processed vehicle data:', createVehicleDto);
      console.log('Final features:', createVehicleDto.features);
      
      return await this.vehiclesService.create(createVehicleDto, images);
    } catch (error) {
      console.error('Error in vehicle creation:', error);
      throw error;
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all vehicles with search and filtering' })
  @SwaggerApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async findAll(@Query() searchDto: VehicleSearchDto): Promise<ApiResponse<PaginatedResponse<VehicleResponseDto>>> {
    return await this.vehiclesService.findAll(searchDto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Advanced vehicle search' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async search(@Query() searchDto: VehicleSearchDto): Promise<ApiResponse<PaginatedResponse<VehicleResponseDto>>> {
    return await this.vehiclesService.findAll(searchDto);
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Export vehicles data' })
  @SwaggerApiResponse({ status: 200, description: 'Data exported successfully' })
  async export(
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const response = await this.vehiclesService.exportVehicles(format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=vehicles.csv');
      res.send(response.data);
    } else {
      res.json(response);
    }
  }

  @Post('bulk-import')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import vehicles from CSV (Admin only)' })
  @SwaggerApiResponse({ status: 200, description: 'Bulk import completed' })
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() bulkImportDto: BulkImportDto,
  ): Promise<ApiResponse<{ success: number; failed: number; errors: string[] }>> {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (file.mimetype !== 'text/csv') {
      throw new BadRequestException('File must be CSV format');
    }

    return await this.vehiclesService.bulkImport(file, bulkImportDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Vehicle retrieved successfully',
    type: VehicleResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<ApiResponse<VehicleResponseDto>> {
    return await this.vehiclesService.findOne(id);
  }

  @Get(':id/availability/:year/:month')
  @Public()
  @ApiOperation({ summary: 'Get vehicle availability calendar' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Availability calendar retrieved successfully',
  })
  async getAvailabilityCalendar(
    @Param('id') id: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ): Promise<ApiResponse<any>> {
    return await this.vehiclesService.getAvailabilityCalendar(id, year, month);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update vehicle (Admin/Agent)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Vehicle updated successfully',
    type: VehicleResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: any,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<ApiResponse<VehicleResponseDto>> {
    try {
      // Process features if it's a string (from multipart form data)
      if (updateVehicleDto.features && typeof updateVehicleDto.features === 'string') {
        try {
          // Try to parse as JSON first
          updateVehicleDto.features = JSON.parse(updateVehicleDto.features as string);
        } catch (e) {
          // If JSON parsing fails, treat as comma-separated string
          updateVehicleDto.features = (updateVehicleDto.features as string)
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0);
        }
      }

      // Convert numeric string fields to numbers
      if (typeof updateVehicleDto.year === 'string') {
        updateVehicleDto.year = parseInt(updateVehicleDto.year);
      }
      if (typeof updateVehicleDto.seats === 'string') {
        updateVehicleDto.seats = parseInt(updateVehicleDto.seats);
      }
      if (typeof updateVehicleDto.doors === 'string') {
        updateVehicleDto.doors = parseInt(updateVehicleDto.doors);
      }
      if (typeof updateVehicleDto.pricePerDay === 'string') {
        updateVehicleDto.pricePerDay = parseFloat(updateVehicleDto.pricePerDay);
      }
      if (typeof updateVehicleDto.pricePerHour === 'string') {
        updateVehicleDto.pricePerHour = parseFloat(updateVehicleDto.pricePerHour);
      }

      return await this.vehiclesService.update(id, updateVehicleDto, images, user.role);
    } catch (error) {
      console.error('Error in vehicle update:', error);
      throw error;
    }
  }

  @Patch(':id/availability')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Update vehicle availability (Admin/Agent)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Availability updated successfully',
  })
  async updateAvailability(
    @Param('id') id: string,
    @Body() availabilityDto: AvailabilityUpdateDto,
  ): Promise<ApiResponse<{ message: string }>> {
    return await this.vehiclesService.updateAvailability(id, availabilityDto);
  }

  @Delete(':id/images')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Remove vehicle image (Admin/Agent)' })
  @SwaggerApiResponse({ status: 200, description: 'Image removed successfully' })
  async removeImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ): Promise<ApiResponse<null>> {
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    return await this.vehiclesService.removeImage(id, imageUrl);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete vehicle (Admin only)' })
  @SwaggerApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    return await this.vehiclesService.remove(id);
  }
}
