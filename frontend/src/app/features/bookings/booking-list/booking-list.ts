import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BookingService } from '../booking.service';
import { BookingResponse, BookingStatus } from '../../../core/models/booking.models';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './booking-list.html',
  styleUrls: ['./booking-list.scss']
})
export class BookingList implements OnInit {
  bookings: BookingResponse[] = [];
  isLoading = true;
  error: string | null = null;
  totalPages = 0;

  // Filter options
  filters = {
    page: 1,
    limit: 10,
    status: undefined as BookingStatus | undefined,
    search: ''
  };

  bookingStatuses = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED'];

  // Cancel modal
  showCancelModal = false;
  selectedBooking: BookingResponse | null = null;
  cancellationReason = '';
  requestRefund = false;

  constructor(private bookingService: BookingService) {}

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.isLoading = true;
    this.error = null;

    this.bookingService.getMyBookings(this.filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.bookings = response.data.data;
          this.totalPages = response.data.totalPages;
        } else {
          this.error = response.message || 'Failed to load bookings';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load bookings';
        this.isLoading = false;
        console.error('Error loading bookings:', error);
      }
    });
  }

  onFilterChange() {
    this.filters.page = 1;
    this.loadBookings();
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadBookings();
    }
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'COMPLETED': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'REJECTED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString: Date): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  openCancelModal(booking: BookingResponse) {
    this.selectedBooking = booking;
    this.showCancelModal = true;
    this.cancellationReason = '';
    this.requestRefund = false;
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.selectedBooking = null;
    this.cancellationReason = '';
    this.requestRefund = false;
  }

  cancelBooking() {
    if (!this.selectedBooking || !this.cancellationReason.trim()) return;

    const cancelData = {
      cancellationReason: this.cancellationReason,
      requestRefund: this.requestRefund
    };

    this.bookingService.cancelBooking(this.selectedBooking.id, cancelData).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeCancelModal();
          this.loadBookings(); // Reload bookings
        } else {
          this.error = response.message || 'Failed to cancel booking';
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to cancel booking';
        console.error('Error cancelling booking:', error);
      }
    });
  }
}
