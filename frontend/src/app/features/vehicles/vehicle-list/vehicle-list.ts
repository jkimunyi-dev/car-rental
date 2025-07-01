import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VehicleService, Vehicle, VehicleSearchParams } from '../vehicle';
import { WishlistService } from '../../../core/services/wishlist.service';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.scss'
})
export class VehicleList implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string>('');
  totalPages = signal<number>(0);
  currentPage = signal<number>(1);
  totalVehicles = signal<number>(0);

  // Search filters
  searchParams: VehicleSearchParams = {
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  // Filter options
  categories = [
    { value: '', label: 'All Categories' },
    { value: 'ECONOMY', label: 'Economy' },
    { value: 'COMPACT', label: 'Compact' },
    { value: 'SEDAN', label: 'Sedan' },
    { value: 'SUV', label: 'SUV' },
    { value: 'LUXURY', label: 'Luxury' },
    { value: 'VAN', label: 'Van' },
    { value: 'TRUCK', label: 'Truck' }
  ];

  transmissionTypes = [
    { value: '', label: 'All Transmissions' },
    { value: 'MANUAL', label: 'Manual' },
    { value: 'AUTOMATIC', label: 'Automatic' },
    { value: 'CVT', label: 'CVT' }
  ];

  fuelTypes = [
    { value: '', label: 'All Fuel Types' },
    { value: 'PETROL', label: 'Petrol' },
    { value: 'DIESEL', label: 'Diesel' },
    { value: 'ELECTRIC', label: 'Electric' },
    { value: 'HYBRID', label: 'Hybrid' }
  ];

  sortOptions = [
    { value: 'createdAt', label: 'Newest First' },
    { value: 'pricePerDay', label: 'Price' },
    { value: 'averageRating', label: 'Rating' },
    { value: 'make', label: 'Make' }
  ];

  wishlistVehicles = signal<Set<string>>(new Set());

  constructor(
    private vehicleService: VehicleService,
    private wishlistService: WishlistService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadVehicles();
    this.loadWishlistStatus();
  }

  loadVehicles() {
    this.isLoading.set(true);
    this.error.set('');

    this.vehicleService.getVehicles(this.searchParams).subscribe({
      next: (response) => {
        if (response.success) {
          this.vehicles.set(response.data.data);
          this.totalPages.set(response.data.meta.totalPages);
          this.currentPage.set(response.data.meta.page);
          this.totalVehicles.set(response.data.meta.total);
        } else {
          this.error.set(response.message || 'Failed to load vehicles');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load vehicles');
        this.isLoading.set(false);
      }
    });
  }

  loadWishlistStatus() {
    this.wishlistService.getWishlist().subscribe({
      next: (response) => {
        if (response.success) {
          const wishlistIds = new Set(response.data.items.map((item: any) => item.vehicleId));
          this.wishlistVehicles.set(wishlistIds);
        }
      }
    });
  }

  onSearch() {
    this.searchParams.page = 1;
    this.loadVehicles();
  }

  onFilterChange() {
    this.searchParams.page = 1;
    this.loadVehicles();
  }

  onPageChange(page: number) {
    this.searchParams.page = page;
    this.loadVehicles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSortChange() {
    this.searchParams.page = 1;
    this.loadVehicles();
  }

  toggleWishlist(vehicleId: string) {
    const isInWishlist = this.wishlistVehicles().has(vehicleId);
    
    if (isInWishlist) {
      this.wishlistService.removeFromWishlist(vehicleId).subscribe({
        next: (response) => {
          if (response.success) {
            const updated = new Set(this.wishlistVehicles());
            updated.delete(vehicleId);
            this.wishlistVehicles.set(updated);
          }
        }
      });
    } else {
      this.wishlistService.addToWishlist(vehicleId).subscribe({
        next: (response) => {
          if (response.success) {
            const updated = new Set(this.wishlistVehicles());
            updated.add(vehicleId);
            this.wishlistVehicles.set(updated);
          }
        }
      });
    }
  }

  viewVehicleDetails(vehicleId: string) {
    this.router.navigate(['/vehicles', vehicleId]);
  }

  bookVehicle(vehicleId: string) {
    this.router.navigate(['/bookings/create'], { 
      queryParams: { vehicleId } 
    });
  }

  getImageUrl(images: string[]): string {
    return images && images.length > 0 ? images[0] : '/assets/placeholder-car.jpg';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(price);
  }

  getRatingStars(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('star-fill');
    }
    
    if (hasHalfStar) {
      stars.push('star-half');
    }
    
    while (stars.length < 5) {
      stars.push('star-line');
    }
    
    return stars;
  }

  clearFilters() {
    this.searchParams = {
      page: 1,
      limit: 12,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    this.loadVehicles();
  }

  isInWishlist(vehicleId: string): boolean {
    return this.wishlistVehicles().has(vehicleId);
  }
}
