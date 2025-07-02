import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VehicleService, Vehicle, VehicleSearchParams } from '../vehicle.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.scss'
})
export class VehicleList implements OnInit {
  Math = Math;
  vehicles = signal<Vehicle[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string>('');
  totalPages = signal<number>(0);
  currentPage = signal<number>(1);
  totalVehicles = signal<number>(0);
  isAuthenticated = signal<boolean>(false);

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
    private authService: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    this.isAuthenticated.set(this.authService.isUserAuthenticated());
    this.loadVehicles();
    if (this.isAuthenticated()) {
      this.loadWishlistStatus();
    }
  }

  loadVehicles() {
    this.isLoading.set(true);
    this.error.set('');

    this.vehicleService.getVehicles(this.searchParams).subscribe({
      next: (response) => {
        if (response.success) {
          this.vehicles.set(response.data.data);
          this.totalPages.set(response.data.totalPages);
          this.currentPage.set(response.data.page);
          this.totalVehicles.set(response.data.total);
        } else {
          this.error.set(response.message || 'Failed to load vehicles');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading vehicles:', err);
        this.error.set('Failed to load vehicles');
        this.isLoading.set(false);
      }
    });
  }

  loadWishlistStatus() {
    if (!this.isAuthenticated()) return;
    
    this.wishlistService.getWishlist().subscribe({
      next: (response) => {
        if (response.success) {
          const wishlistIds = new Set(response.data.items.map((item: any) => item.vehicleId));
          this.wishlistVehicles.set(wishlistIds);
        }
      },
      error: () => {
        // Silently handle error for wishlist
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
    if (!this.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

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
    if (!this.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.router.navigate(['/bookings/create'], { 
      queryParams: { vehicleId } 
    });
  }

  getImageUrl(images: any[]): string {
    if (images && images.length > 0) {
      // Handle both string arrays and object arrays
      if (typeof images[0] === 'string') {
        return images[0];
      } else if (images[0].url) {
        return images[0].url;
      }
    }
    return '/assets/placeholder-car.jpg';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

  getPaginationPages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];
    
    // Show first page
    if (current > 3) pages.push(1);
    
    // Show ellipsis
    if (current > 4) pages.push(-1);
    
    // Show pages around current
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }
    
    // Show ellipsis
    if (current < total - 3) pages.push(-1);
    
    // Show last page
    if (current < total - 2) pages.push(total);
    
    return pages;
  }
}
