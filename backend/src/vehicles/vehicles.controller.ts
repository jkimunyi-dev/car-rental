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
  ApiResponse,
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
  @ApiResponse({
    status: 201,
    description: 'Vehicle created successfully',
    type: VehicleResponseDto,
  })
  async create(
    @Body() createVehicleDto: CreateVehicleDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(createVehicleDto, images);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all vehicles with search and filtering' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async findAll(@Query() searchDto: VehicleSearchDto) {
    return this.vehiclesService.findAll(searchDto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Advanced vehicle search' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async search(@Query() searchDto: VehicleSearchDto) {
    return this.vehiclesService.findAll(searchDto);
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Export vehicles data' })
  @ApiResponse({ status: 200, description: 'Data exported successfully' })
  async export(
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const data = await this.vehiclesService.exportVehicles(format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=vehicles.csv');
      res.send(data);
    } else {
      res.json(data);
    }
  }

  @Post('bulk-import')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import vehicles from CSV (Admin only)' })
  @ApiResponse({ status: 200, description: 'Bulk import completed' })
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() bulkImportDto: BulkImportDto,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (file.mimetype !== 'text/csv') {
      throw new BadRequestException('File must be CSV format');
    }

    return this.vehiclesService.bulkImport(file, bulkImportDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle retrieved successfully',
    type: VehicleResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<VehicleResponseDto> {
    return this.vehiclesService.findOne(id);
  }

  @Get(':id/availability/:year/:month')
  @Public()
  @ApiOperation({ summary: 'Get vehicle availability calendar' })
  @ApiResponse({
    status: 200,
    description: 'Availability calendar retrieved successfully',
  })
  async getAvailabilityCalendar(
    @Param('id') id: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.vehiclesService.getAvailabilityCalendar(id, year, month);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update vehicle (Admin/Agent)' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle updated successfully',
    type: VehicleResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: any,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.update(id, updateVehicleDto, images, user.role);
  }

  @Patch(':id/availability')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Update vehicle availability (Admin/Agent)' })
  @ApiResponse({
    status: 200,
    description: 'Availability updated successfully',
  })
  async updateAvailability(
    @Param('id') id: string,
    @Body() availabilityDto: AvailabilityUpdateDto,
  ) {
    return this.vehiclesService.updateAvailability(id, availabilityDto);
  }

  @Delete(':id/images')
  @Roles(Role.ADMIN, Role.AGENT)
  @ApiOperation({ summary: 'Remove vehicle image (Admin/Agent)' })
  @ApiResponse({ status: 200, description: 'Image removed successfully' })
  async removeImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    await this.vehiclesService.removeImage(id, imageUrl);
    return { message: 'Image removed successfully' };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete vehicle (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.vehiclesService.remove(id);
    return { message: 'Vehicle deleted successfully' };
  }
}
