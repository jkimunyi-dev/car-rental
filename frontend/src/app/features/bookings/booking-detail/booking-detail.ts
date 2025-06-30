import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BookingService } from '../booking.service';
import { BookingResponse } from '../../../core/models/booking.models';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-detail.html',
  styleUrls: ['./booking-detail.scss']
})
export class BookingDetail implements OnInit {
  booking: BookingResponse | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService
  ) {}

  ngOnInit() {
    const bookingId = this.route.snapshot.params['id'];
    if (bookingId) {
      this.loadBooking(bookingId);
    }
  }

  loadBooking(id: string) {
    this.isLoading = true;
    this.bookingService.getBookingById(id).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load booking details';
        this.isLoading = false;
        console.error('Error loading booking:', error);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: Date): string {
    return new Date(dateString).toLocaleDateString();
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
}