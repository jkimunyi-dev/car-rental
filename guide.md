# Car Rental Project - Complete Setup Guide

## Table of Contents
1. [Project Structure](#project-structure)
2. [Backend Setup Guide](#backend-setup-guide)
3. [Frontend Setup Guide](#frontend-setup-guide)
4. [Prisma Schema](#prisma-schema)
5. [Backend DTOs & API Objects](#backend-dtos--api-objects)
6. [Frontend DTOs & API Objects](#frontend-dtos--api-objects)
7. [Authentication Integration](#authentication-integration)
8. [Feature Implementation Guides](#feature-implementation-guides)

## Project Structure

```
car-rental-app/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   └── strategies/
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   └── dto/
│   │   ├── vehicles/
│   │   │   ├── vehicles.controller.ts
│   │   │   ├── vehicles.service.ts
│   │   │   ├── vehicles.module.ts
│   │   │   └── dto/
│   │   ├── bookings/
│   │   │   ├── bookings.controller.ts
│   │   │   ├── bookings.service.ts
│   │   │   ├── bookings.module.ts
│   │   │   └── dto/
│   │   ├── payments/
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── payments.module.ts
│   │   │   └── dto/
│   │   ├── admin/
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── admin.module.ts
│   │   │   └── dto/
│   │   ├── common/
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── interceptors/
│   │   │   └── pipes/
│   │   ├── email/
│   │   │   ├── email.service.ts
│   │   │   ├── email.module.ts
│   │   │   └── templates/
│   │   ├── upload/
│   │   │   ├── upload.service.ts
│   │   │   └── upload.module.ts
│   │   ├── prisma/
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── templates/
│   │   └── email/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   └── models/
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   ├── pipes/
│   │   │   │   └── directives/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── vehicles/
│   │   │   │   ├── bookings/
│   │   │   │   ├── profile/
│   │   │   │   └── admin/
│   │   │   ├── layouts/
│   │   │   └── app.component.ts
│   │   ├── assets/
│   │   └── environments/
│   └── package.json
└── README.md
```

## Backend Setup Guide

### Dependencies Installation

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/config @nestjs/mapped-types
npm install @prisma/client prisma
npm install bcryptjs class-validator class-transformer
npm install nodemailer @nestjs-modules/mailer ejs
npm install cloudinary multer @nestjs/platform-express
npm install @types/bcryptjs @types/nodemailer @types/multer --save-dev
```

### Environment Configuration

Create `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/car_rental_db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASS="your-app-password"
FRONTEND_URL="http://localhost:4200"
```

## Frontend Setup Guide

### Dependencies Installation

```bash
ng new car-rental-frontend
cd car-rental-frontend
npm install @angular/common @angular/forms @angular/router
npm install @angular/common/http
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install lucide-angular
npm install @angular/cdk
```

### Tailwind CSS Setup

```bash
npx tailwindcss init
```

Configure `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  AGENT
  CUSTOMER
}

enum BookingStatus {
  PENDING
  CONFIRMED
  ACTIVE
  COMPLETED
  CANCELLED
  REJECTED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum VehicleStatus {
  AVAILABLE
  RENTED
  MAINTENANCE
  INACTIVE
}

enum TransmissionType {
  MANUAL
  AUTOMATIC
  CVT
}

enum FuelType {
  PETROL
  DIESEL
  ELECTRIC
  HYBRID
}

enum VehicleCategory {
  ECONOMY
  COMPACT
  SEDAN
  SUV
  LUXURY
  VAN
  TRUCK
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  phone         String?  @unique
  password      String
  firstName     String
  lastName      String
  dateOfBirth   DateTime?
  licenseNumber String?
  role          Role     @default(CUSTOMER)
  isActive      Boolean  @default(true)
  isVerified    Boolean  @default(false)
  avatar        String?
  address       String?
  city          String?
  country       String?
  zipCode       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  bookings      Booking[]
  reviews       Review[]
  paymentMethods PaymentMethod[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Vehicle {
  id            String          @id @default(cuid())
  make          String
  model         String
  year          Int
  category      VehicleCategory
  transmission  TransmissionType
  fuelType      FuelType
  seats         Int
  doors         Int
  color         String
  licensePlate  String          @unique
  vin           String?         @unique
  mileage       Float           @default(0)
  status        VehicleStatus   @default(AVAILABLE)
  pricePerDay   Float
  pricePerHour  Float?
  description   String?
  location      String
  features      String[] // JSON array of features
  images        String[] // Array of image URLs
  isActive      Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  // Relations
  bookings      Booking[]
  reviews       Review[]

  @@map("vehicles")
}

model Booking {
  id            String        @id @default(cuid())
  userId        String
  vehicleId     String
  startDate     DateTime
  endDate       DateTime
  startTime     String?
  endTime       String?
  pickupLocation String
  dropoffLocation String?
  totalDays     Int
  totalHours    Int?
  pricePerDay   Float
  pricePerHour  Float?
  subtotal      Float
  taxes         Float         @default(0)
  fees          Float         @default(0)
  discount      Float         @default(0)
  totalAmount   Float
  status        BookingStatus @default(PENDING)
  notes         String?
  cancellationReason String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relations
  user          User          @relation(fields: [userId], references: [id])
  vehicle       Vehicle       @relation(fields: [vehicleId], references: [id])
  payment       Payment?
  coupon        Coupon?       @relation(fields: [couponId], references: [id])
  couponId      String?

  @@map("bookings")
}

model Payment {
  id              String        @id @default(cuid())
  bookingId       String        @unique
  amount          Float
  currency        String        @default("USD")
  paymentMethod   String        // stripe, paypal, etc.
  transactionId   String?
  status          PaymentStatus @default(PENDING)
  paidAt          DateTime?
  refundedAt      DateTime?
  refundAmount    Float?
  stripePaymentIntentId String?
  receiptUrl      String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  booking         Booking       @relation(fields: [bookingId], references: [id])

  @@map("payments")
}

model PaymentMethod {
  id          String   @id @default(cuid())
  userId      String
  type        String   // card, bank_account
  last4       String
  brand       String?  // visa, mastercard, etc.
  expiryMonth Int?
  expiryYear  Int?
  isDefault   Boolean  @default(false)
  stripePaymentMethodId String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  user        User     @relation(fields: [userId], references: [id])

  @@map("payment_methods")
}

model Review {
  id        String   @id @default(cuid())
  userId    String
  vehicleId String
  rating    Int      // 1-5
  comment   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user      User     @relation(fields: [userId], references: [id])
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [id])

  @@unique([userId, vehicleId])
  @@map("reviews")
}

model Coupon {
  id            String    @id @default(cuid())
  code          String    @unique
  description   String?
  discountType  String    // percentage, fixed
  discountValue Float
  minAmount     Float?    // minimum booking amount
  maxDiscount   Float?    // maximum discount amount
  usageLimit    Int?      // max number of uses
  usedCount     Int       @default(0)
  isActive      Boolean   @default(true)
  validFrom     DateTime
  validUntil    DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  bookings      Booking[]

  @@map("coupons")
}

model SystemSettings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("system_settings")
}
```

## Backend DTOs & API Objects

### Common DTOs

```typescript
// src/common/dto/api-response.dto.ts
export class ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  path?: string;

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message = 'Operation successful'): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }

  static error(message: string, error?: string): ApiResponse<null> {
    return new ApiResponse(false, message, null, error);
  }
}

// src/common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Auth DTOs

```typescript
// src/auth/dto/register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain lowercase, uppercase and number'
  })
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

// src/auth/dto/login.dto.ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

// src/auth/dto/auth-response.dto.ts
export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### User DTOs

```typescript
// src/users/dto/update-profile.dto.ts
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

// src/users/dto/user-response.dto.ts
export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Vehicle DTOs

```typescript
// src/vehicles/dto/create-vehicle.dto.ts
export class CreateVehicleDto {
  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @IsEnum(TransmissionType)
  transmission: TransmissionType;

  @IsEnum(FuelType)
  fuelType: FuelType;

  @IsInt()
  @Min(1)
  @Max(12)
  seats: number;

  @IsInt()
  @Min(2)
  @Max(6)
  doors: number;

  @IsString()
  color: string;

  @IsString()
  licensePlate: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

// src/vehicles/dto/vehicle-search.dto.ts
export class VehicleSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsInt()
  @Min(1)
  minSeats?: number;
}
```

### Booking DTOs

```typescript
// src/bookings/dto/create-booking.dto.ts
export class CreateBookingDto {
  @IsString()
  vehicleId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsString()
  pickupLocation: string;

  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

// src/bookings/dto/booking-response.dto.ts
export class BookingResponseDto {
  id: string;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  totalAmount: number;
  status: BookingStatus;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    images: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Frontend DTOs & API Objects

### Core Models

```typescript
// src/app/core/models/api-response.model.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// src/app/core/models/user.model.ts
export enum Role {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  createdAt: string;
  updatedAt: string;
}

// src/app/core/models/auth.model.ts
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### Vehicle Models

```typescript
// src/app/core/models/vehicle.model.ts
export enum VehicleCategory {
  ECONOMY = 'ECONOMY',
  COMPACT = 'COMPACT',
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  LUXURY = 'LUXURY',
  VAN = 'VAN',
  TRUCK = 'TRUCK'
}

export enum TransmissionType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  CVT = 'CVT'
}

export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID'
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  doors: number;
  color: string;
  licensePlate: string;
  pricePerDay: number;
  pricePerHour?: number;
  location: string;
  description?: string;
  features: string[];
  images: string[];
  isActive: boolean;
  averageRating?: number;
  reviewCount?: number;
}

export interface VehicleSearchRequest {
  location?: string;
  category?: VehicleCategory;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  minSeats?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### Booking Models

```typescript
// src/app/core/models/booking.model.ts
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface Booking {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  totalHours?: number;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  totalAmount: number;
  status: BookingStatus;
  notes?: string;
  vehicle: Vehicle;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  notes?: string;
  couponCode?: string;
}
```

## Authentication Integration

### Backend JWT Strategy

```typescript
// src/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
```

### Frontend Auth Service

```typescript
// src/app/core/services/auth.service.ts
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.setSession(response.data);
            return response.data;
          }
          throw new Error(response.message);
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/auth/register`, userData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.setSession(response.data);
            return response.data;
          }
          throw new Error(response.message);
        })
      );
  }

  private setSession(authResult: AuthResponse): void {
    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('refresh_token', authResult.refreshToken);
    localStorage.setItem('current_user', JSON.stringify(authResult.user));
    this.currentUserSubject.next(authResult.user);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: Role): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
}
```

### HTTP Interceptor

```typescript
// src/app/core/interceptors/auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('access_token');

    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(authReq);
    }

    return next.handle(req);
  }
}
```

## Feature Implementation Guides

### Backend Features

#### 1. Authentication Module Setup
- **JWT Configuration**: Configure JWT with access and refresh tokens
- **Password Hashing**: Use bcryptjs for secure password storage
- **Email Verification**: Implement email verification workflow
- **Social Auth**: Optional integration with Google/Facebook OAuth
- **Rate Limiting**: Implement login attempt limiting

#### 2. User Management
- **Profile Management**: CRUD operations for user profiles
- **Avatar Upload**: Integration with Cloudinary for image storage
- **Role-Based Access**: Guards for Admin, Agent, and Customer roles
- **User Activity Tracking**: Log important user actions

#### 3. Vehicle Management
- **CRUD Operations**: Complete vehicle lifecycle management
- **Image Upload**: Multiple image upload with Cloudinary
- **Search & Filtering**: Advanced search with multiple criteria
- **Availability Calendar**: Real-time availability tracking
- **Bulk Operations**: Import/export vehicle data

#### 4. Booking System
- **Availability Check**: Real-time vehicle availability validation
- **Pricing Calculator**: Dynamic pricing based on duration and vehicle
- **Conflict Prevention**: Prevent double bookings with database constraints
- **Status Management**: Automated status transitions (pending → confirmed → active → completed)
- **Modification Handling**: Allow booking changes with business rules
- **Cancellation Logic**: Implement cancellation policies and refund rules

#### 5. Payment Integration
- **Stripe Integration**: Secure payment processing
- **Payment Methods**: Save and manage customer payment methods
- **Refund Processing**: Automated refund handling
- **Invoice Generation**: PDF invoice generation
- **Payment Webhooks**: Handle Stripe webhook events

#### 6. Email Service
- **Template Engine**: EJS templates for different email types
- **Transactional Emails**: Booking confirmations, reminders, receipts
- **Bulk Emails**: Marketing campaigns and notifications
- **Email Queue**: Background job processing for email delivery

#### 7. Admin Dashboard
- **Analytics Service**: Generate business metrics and reports
- **User Management**: Admin tools for managing users and roles
- **Booking Management**: Approve/reject bookings, handle disputes
- **System Settings**: Configurable application settings

#### 8. File Upload Service
- **Cloudinary Integration**: Image optimization and CDN delivery
- **Multiple File Upload**: Handle vehicle images and user avatars
- **File Validation**: Size, format, and security validation
- **Image Transformations**: Automatic resizing and optimization

### Frontend Features

#### 1. Authentication Module
```typescript
// Features to implement:
- Login/Register forms with validation
- Password strength indicator
- Email verification flow
- Forgot password functionality
- Social login integration
- Auto-logout on token expiry
- Remember me functionality
```

#### 2. Vehicle Search & Catalog
```typescript
// Components needed:
- VehicleSearchComponent: Advanced search form
- VehicleListComponent: Grid/list view with pagination
- VehicleCardComponent: Individual vehicle display
- VehicleDetailComponent: Detailed vehicle information
- VehicleFilterComponent: Side filters for search
- VehicleCompareComponent: Compare multiple vehicles
```

#### 3. Booking Flow
```typescript
// Booking process components:
- BookingFormComponent: Multi-step booking form
- DatePickerComponent: Custom date range picker
- PricingCalculatorComponent: Real-time price calculation
- PaymentFormComponent: Stripe payment integration
- BookingConfirmationComponent: Booking success page
- BookingHistoryComponent: User's booking history
```

#### 4. User Profile Management
```typescript
// Profile components:
- ProfileOverviewComponent: User dashboard
- ProfileEditComponent: Edit personal information
- PaymentMethodsComponent: Manage saved cards
- BookingHistoryComponent: Past and current bookings
- ReviewsComponent: User's reviews and ratings
- NotificationsComponent: User preferences
```

#### 5. Admin Dashboard
```typescript
// Admin components:
- AdminDashboardComponent: Main analytics dashboard
- UserManagementComponent: Manage users and roles
- VehicleManagementComponent: CRUD operations for vehicles
- BookingManagementComponent: Handle bookings approval
- ReportsComponent: Generate business reports
- SettingsComponent: System configuration
```

#### 6. Shared Components
```typescript
// Reusable components:
- LoadingSpinnerComponent: Loading states
- ModalComponent: Generic modal wrapper
- ToastComponent: Notification messages
- PaginationComponent: Data pagination
- ConfirmDialogComponent: Confirmation dialogs
- StarRatingComponent: Rating display and input
- ImageGalleryComponent: Image carousel
- DateRangePickerComponent: Custom date picker
```

### Advanced Backend Implementation

#### Email Templates Setup

```typescript
// src/email/templates/booking-confirmation.ejs
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Confirmation</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .booking-details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; }
        .footer { background-color: #6b7280; color: white; padding: 15px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
            <p>Hello <%= user.firstName %>,</p>
            <p>Your booking has been confirmed. Here are your booking details:</p>
            
            <div class="booking-details">
                <h3>Booking Information</h3>
                <p><strong>Booking ID:</strong> <%= booking.id %></p>
                <p><strong>Vehicle:</strong> <%= booking.vehicle.make %> <%= booking.vehicle.model %></p>
                <p><strong>Pickup Date:</strong> <%= booking.startDate %></p>
                <p><strong>Return Date:</strong> <%= booking.endDate %></p>
                <p><strong>Pickup Location:</strong> <%= booking.pickupLocation %></p>
                <p><strong>Total Amount:</strong> $<%= booking.totalAmount %></p>
            </div>
            
            <p>Thank you for choosing our service!</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Car Rental Service. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

#### Validation Pipes

```typescript
// src/common/pipes/parse-date.pipe.ts
@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: string): Date {
    if (!value) return null;
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    
    return date;
  }
}

// src/common/decorators/roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// src/common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

#### Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient, Role, VehicleCategory, TransmissionType, FuelType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@carental.com' },
    update: {},
    create: {
      email: 'admin@carental.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  // Create sample vehicles
  const vehicles = [
    {
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      category: VehicleCategory.SEDAN,
      transmission: TransmissionType.AUTOMATIC,
      fuelType: FuelType.PETROL,
      seats: 5,
      doors: 4,
      color: 'Silver',
      licensePlate: 'ABC-123',
      pricePerDay: 45.00,
      location: 'Downtown',
      features: ['Air Conditioning', 'Bluetooth', 'GPS Navigation'],
      images: ['https://example.com/camry1.jpg', 'https://example.com/camry2.jpg']
    },
    {
      make: 'Honda',
      model: 'CR-V',
      year: 2023,
      category: VehicleCategory.SUV,
      transmission: TransmissionType.AUTOMATIC,
      fuelType: FuelType.PETROL,
      seats: 7,
      doors: 4,
      color: 'Blue',
      licensePlate: 'XYZ-789',
      pricePerDay: 65.00,
      location: 'Airport',
      features: ['Air Conditioning', 'All-Wheel Drive', '4WD', 'GPS Navigation'],
      images: ['https://example.com/crv1.jpg', 'https://example.com/crv2.jpg']
    }
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { licensePlate: vehicle.licensePlate },
      update: {},
      create: vehicle,
    });
  }

  // Create sample coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: 'Welcome discount for new users',
      discountType: 'percentage',
      discountValue: 10,
      usageLimit: 100,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Advanced Frontend Implementation

#### State Management Service

```typescript
// src/app/core/services/app-state.service.ts
@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private searchFiltersSubject = new BehaviorSubject<VehicleSearchRequest>({});
  public searchFilters$ = this.searchFiltersSubject.asObservable();

  private cartSubject = new BehaviorSubject<BookingCart | null>(null);
  public cart$ = this.cartSubject.asObservable();

  updateSearchFilters(filters: Partial<VehicleSearchRequest>): void {
    const currentFilters = this.searchFiltersSubject.value;
    this.searchFiltersSubject.next({ ...currentFilters, ...filters });
  }

  setBookingCart(cart: BookingCart): void {
    this.cartSubject.next(cart);
    localStorage.setItem('booking_cart', JSON.stringify(cart));
  }

  clearBookingCart(): void {
    this.cartSubject.next(null);
    localStorage.removeItem('booking_cart');
  }
}

interface BookingCart {
  vehicle: Vehicle;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  subtotal: number;
  taxes: number;
  totalAmount: number;
}
```

#### Form Validators

```typescript
// src/app/shared/validators/custom-validators.ts
export class CustomValidators {
  static futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return selectedDate >= today ? null : { futureDate: true };
  }

  static dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;
    
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start < end ? null : { dateRange: true };
  }

  static passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value;
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isLengthValid = value.length >= 8;
    
    const valid = hasLower && hasUpper && hasNumber && hasSpecial && isLengthValid;
    
    return valid ? null : {
      passwordStrength: {
        hasLower,
        hasUpper,
        hasNumber,
        hasSpecial,
        isLengthValid
      }
    };
  }
}
```

#### Route Guards

```typescript
// src/app/core/guards/auth.guard.ts
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}

// src/app/core/guards/role.guard.ts
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const requiredRoles = route.data['roles'] as Role[];
    const user = this.authService.getCurrentUser();

    if (!user) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}
```

#### Utility Services

```typescript
// src/app/core/services/notification.service.ts
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  public notifications$ = this.notificationSubject.asObservable();

  success(message: string, title?: string): void {
    this.showNotification({
      type: 'success',
      message,
      title: title || 'Success',
      duration: 5000
    });
  }

  error(message: string, title?: string): void {
    this.showNotification({
      type: 'error',
      message,
      title: title || 'Error',
      duration: 7000
    });
  }

  warning(message: string, title?: string): void {
    this.showNotification({
      type: 'warning',
      message,
      title: title || 'Warning',
      duration: 6000
    });
  }

  info(message: string, title?: string): void {
    this.showNotification({
      type: 'info',
      message,
      title: title || 'Info',
      duration: 5000
    });
  }

  private showNotification(notification: Notification): void {
    this.notificationSubject.next(notification);
  }
}

interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title: string;
  duration: number;
}

// src/app/core/services/loading.service.ts
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private requestCount = 0;

  setLoading(loading: boolean): void {
    if (loading) {
      this.requestCount++;
    } else {
      this.requestCount = Math.max(0, this.requestCount - 1);
    }
    
    this.loadingSubject.next(this.requestCount > 0);
  }
}
```

### Deployment Preparation

#### Environment Configuration

```typescript
// Backend - src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  },
  email: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  },
});

// Frontend - src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api',
  stripePublicKey: 'pk_live_your_stripe_public_key',
  googleMapsApiKey: 'your_google_maps_api_key',
};
```

#### Docker Configuration

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]

# Frontend Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build --prod

FROM nginx:alpine
COPY --from=build /app/dist/car-rental-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Testing Strategy

#### Backend Testing

```typescript
// src/auth/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('register', () => {
    it('should create a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: '1',
        ...registerDto,
        role: Role.CUSTOMER,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser);

      const result = await service.register(registerDto);
      
      expect(result).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
    });
  });
});
```

#### Frontend Testing

```typescript
// src/app/core/services/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should login user successfully', () => {
    const mockAuthResponse: AuthResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: Role.CUSTOMER,
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600
    };

    service.login({ email: 'test@example.com', password: 'password' })
      .subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: mockAuthResponse });
  });
});
```

This comprehensive guide provides everything you need to build a complete car rental application with NestJS backend and Angular frontend. The structure includes detailed DTOs, API responses, authentication integration, and implementation guides for all major features.