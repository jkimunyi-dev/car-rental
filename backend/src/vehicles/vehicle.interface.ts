import {
  Vehicle as PrismaVehicle,
  VehicleCategory,
  TransmissionType,
  FuelType,
  VehicleStatus,
  Role,
  BookingStatus,
  Prisma,
} from '@prisma/client';

// Use Prisma's generated Vehicle type instead of custom Vehicle interface
export type Vehicle = PrismaVehicle;

// For creation, use Prisma's CreateInput type with customizations
export type CreateVehicleData = Omit<
  Prisma.VehicleCreateInput,
  'bookings' | 'reviews'
>;

// For updates, use Prisma's UpdateInput type
export type UpdateVehicleData = Omit<
  Prisma.VehicleUpdateInput,
  'bookings' | 'reviews'
>;

// Only create custom interfaces for computed/extended data
export interface VehicleResponseData extends PrismaVehicle {
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  reviews?: VehicleReview[];
}

// Keep interfaces that don't exist in Prisma
export interface VehicleReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// Use Prisma's include/select types for relations
export type VehicleWithReviews = Prisma.VehicleGetPayload<{
  include: {
    reviews: {
      include: {
        user: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            avatar: true;
          };
        };
      };
    };
  };
}>;

export type VehicleWithBookings = Prisma.VehicleGetPayload<{
  include: {
    bookings: true;
  };
}>;

// Vehicle search and filtering options
export interface VehicleSearchOptions {
  page?: number;
  limit?: number;
  location?: string;
  category?: VehicleCategory;
  startDate?: string | Date;
  endDate?: string | Date;
  minPrice?: number;
  maxPrice?: number;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  minSeats?: number;
  search?: string;
  userId?: string;
  userRole?: Role;
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Paginated vehicle response
export interface PaginatedVehicleResponse {
  data: VehicleResponseData[];
  meta: PaginationMeta;
}

// Availability update data
export interface AvailabilityUpdateData {
  status: VehicleStatus;
}

// Availability calendar interfaces
export interface BookingSlot {
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
}

export interface AvailabilityCalendar {
  vehicleStatus: VehicleStatus;
  bookings: BookingSlot[];
  year: number;
  month: number;
}

// Bulk import interfaces
export interface BulkImportOptions {
  overwriteExisting?: boolean;
  defaultLocation?: string;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface CsvVehicleData {
  make: string;
  model: string;
  year: string;
  category?: string;
  transmission?: string;
  fuelType?: string;
  seats?: string;
  doors?: string;
  color?: string;
  licensePlate: string;
  vin?: string;
  pricePerDay: string;
  pricePerHour?: string;
  location?: string;
  description?: string;
  features?: string;
  imageUrls?: string;
  mileage?: string;
  status?: string;
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

export interface ImageUploadResult {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

// Vehicle statistics interface
export interface VehicleStatistics {
  totalVehicles: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  rentedVehicles: number;
  vehiclesByCategory: Record<VehicleCategory, number>;
  vehiclesByLocation: Record<string, number>;
  averageRating: number;
  totalBookings: number;
  popularVehicles: VehicleResponseData[];
}

// Service interface
export interface IVehiclesService {
  create(
    createVehicleDto: CreateVehicleData,
    images?: Express.Multer.File[],
  ): Promise<VehicleResponseData>;

  findAll(options: VehicleSearchOptions): Promise<PaginatedVehicleResponse>;

  findOne(id: string): Promise<VehicleResponseData>;

  update(
    id: string,
    updateVehicleDto: UpdateVehicleData,
    images?: Express.Multer.File[],
    userRole?: Role,
  ): Promise<VehicleResponseData>;

  remove(id: string): Promise<void>;

  updateAvailability(
    id: string,
    availabilityDto: AvailabilityUpdateData,
  ): Promise<{ message: string }>;

  getAvailabilityCalendar(
    vehicleId: string,
    year: number,
    month: number,
  ): Promise<AvailabilityCalendar>;

  removeImage(vehicleId: string, imageUrl: string): Promise<void>;

  bulkImport(
    file: Express.Multer.File,
    bulkImportDto: BulkImportOptions,
  ): Promise<BulkImportResult>;

  exportVehicles(format?: 'csv' | 'json'): Promise<string | Vehicle[]>;
}

// Repository interface for database operations
export interface VehicleRepository {
  create(vehicleData: CreateVehicleData): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByLicensePlate(licensePlate: string): Promise<Vehicle | null>;
  findMany(options: VehicleSearchOptions): Promise<PaginatedVehicleResponse>;
  update(id: string, vehicleData: UpdateVehicleData): Promise<Vehicle>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: VehicleStatus): Promise<void>;
  count(filters?: Partial<VehicleSearchOptions>): Promise<number>;
  checkAvailability(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean>;
}

// Error interfaces
export interface VehicleError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
