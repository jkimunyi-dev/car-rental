import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WishlistService } from '../../../core/services/wishlist.service';
import { WishlistItem, WishlistResponse, WishlistQueryDto } from '../../../core/models/wishlist.models';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './wishlist.html',
  styleUrls: ['./wishlist.scss']
})
export class Wishlist implements OnInit {
  wishlistData = signal<WishlistResponse | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string>('');

  // Filters
  filters: WishlistQueryDto = {
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

  sortOptions = [
    { value: 'createdAt', label: 'Date Added' },
    { value: 'pricePerDay', label: 'Price' },
    { value: 'make', label: 'Make' },
    { value: 'year', label: 'Year' }
  ];

  constructor(
    private wishlistService: WishlistService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadWishlist();
  }

  loadWishlist() {
    this.isLoading.set(true);
    this.error.set('');

    this.wishlistService.getWishlist(this.filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.wishlistData.set(response.data);
        } else {
          this.error.set(response.message || 'Failed to load wishlist');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load wishlist');
        this.isLoading.set(false);
      }
    });
  }

  removeFromWishlist(vehicleId: string) {
    this.wishlistService.removeFromWishlist(vehicleId).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadWishlist(); // Refresh the list
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to remove item');
      }
    });
  }

  clearWishlist() {
    if (confirm('Are you sure you want to clear your entire wishlist? This action cannot be undone.')) {
      this.wishlistService.clearWishlist().subscribe({
        next: (response) => {
          if (response.success) {
            this.loadWishlist();
          }
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to clear wishlist');
        }
      });
    }
  }

  onFilterChange() {
    this.filters.page = 1;
    this.loadWishlist();
  }

  onPageChange(page: number) {
    this.filters.page = page;
    this.loadWishlist();
  }

  onSortChange() {
    this.filters.page = 1;
    this.loadWishlist();
  }

  viewVehicleDetails(vehicleId: string) {
    this.router.navigate(['/vehicles', vehicleId]);
  }

  quickBook(vehicleId: string) {
    this.wishlistService.getQuickBookingUrl(vehicleId).subscribe({
      next: (response) => {
        if (response.success) {
          // Navigate to booking page with pre-filled vehicle
          this.router.navigate(['/bookings/create'], { 
            queryParams: { vehicleId } 
          });
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to initiate booking');
      }
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

  getAvailabilityText(item: WishlistItem): string {
    return item.vehicle.isAvailable ? 'Available' : 'Not Available';
  }

  getAvailabilityClass(item: WishlistItem): string {
    return item.vehicle.isAvailable ? 'text-green-600' : 'text-red-600';
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
}