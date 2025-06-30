import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BookingService } from '../booking.service';
import { BookingResponse, BookingStatus, BookingSearchOptions } from '../../../core/models/booking.models';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './booking-list.html',
  styleUrl: './booking-list.scss'
})
export class BookingList implements OnInit {
  bookings: BookingResponse[] = [];
  isLoading = true;
  error: string | null = null;

  // Filters
  filters: BookingSearchOptions = {
    page: 1,
    limit: 10,
    status: undefined,
    search: ''
  };

  totalBookings = 0;
  totalPages = 0;

  // Modal states
  showCancelModal = false;
  selectedBooking: BookingResponse | null = null;
  cancellationReason = '';
  requestRefund = false;

  bookingStatuses = Object.values(BookingStatus);

  constructor(private bookingService: BookingService) {}

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.isLoading = true;
    this.error = null;
    
    this.bookingService.getMyBookings(this.filters).subscribe({
      next: (response) => {
        this.bookings = response.data;
        this.totalBookings = response.meta.total;
        this.totalPages = response.meta.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load bookings. Please try again.';
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
    this.filters.page = page;
    this.loadBookings();
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

    const cancellationData = {
      cancellationReason: this.cancellationReason,
      requestRefund: this.requestRefund
    };

    this.bookingService.cancelBooking(this.selectedBooking.id, cancellationData).subscribe({
      next: (updatedBooking) => {
        // Update the booking in the list
        const index = this.bookings.findIndex(b => b.id === this.selectedBooking!.id);
        if (index > -1) {
          this.bookings[index] = updatedBooking;
        }
        this.closeCancelModal();
      },
      error: (error) => {
        console.error('Error cancelling booking:', error);
        // Handle error (show toast, etc.)
      }
    });
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
}
