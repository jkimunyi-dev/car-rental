import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Admin } from '../admin';
import { AdminBooking } from '../../../core/models/admin.models';

@Component({
  selector: 'app-booking-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-management.html',
  styleUrls: ['./booking-management.scss']
})
export class BookingManagement implements OnInit {
  bookings: AdminBooking[] = [];
  isLoading = true;
  
  filters = {
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  };

  totalBookings = 0;
  totalPages = 0;

  // Modal states
  showActionModal = false;
  selectedBooking: AdminBooking | null = null;
  bookingAction = '';
  actionReason = '';
  actionNotes = '';

  bookingStatuses = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  constructor(private adminService: Admin) {}

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.isLoading = true;
    this.adminService.getBookings(this.filters).subscribe({
      next: (response) => {
        this.bookings = response.data.bookings;
        this.totalBookings = response.data.pagination.total;
        this.totalPages = response.data.pagination.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.isLoading = false;
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

  onSort(column: string) {
    if (this.filters.sortBy === column) {
      this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sortBy = column;
      this.filters.sortOrder = 'asc';
    }
    this.loadBookings();
  }

  openActionModal(booking: AdminBooking) {
    this.selectedBooking = booking;
    this.showActionModal = true;
    this.bookingAction = '';
    this.actionReason = '';
    this.actionNotes = '';
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedBooking = null;
    this.bookingAction = '';
    this.actionReason = '';
    this.actionNotes = '';
  }

  executeBookingAction() {
    if (!this.selectedBooking || !this.bookingAction) return;

    const action = {
      action: this.bookingAction,
      reason: this.actionReason,
      notes: this.actionNotes
    };

    this.adminService.handleBookingAction(this.selectedBooking.id, action).subscribe({
      next: (updatedBooking) => {
        const index = this.bookings.findIndex(b => b.id === this.selectedBooking!.id);
        if (index > -1) {
          this.bookings[index] = updatedBooking;
        }
        this.closeActionModal();
      },
      error: (error) => {
        console.error('Error executing booking action:', error);
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

  getAvailableActions(booking: AdminBooking): string[] {
    const actions: Record<string, string[]> = {
      'PENDING': ['approve', 'reject'],
      'CONFIRMED': ['cancel', 'complete'],
      'ACTIVE': ['complete', 'cancel'],
      'COMPLETED': [],
      'CANCELLED': [],
      'REJECTED': []
    };
    return actions[booking.status] || [];
  }
}