import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminBooking, BulkActionResult } from '../../../core/models/admin.models';

@Component({
  selector: 'app-booking-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking-management.html',
  styleUrls: ['./booking-management.scss']
})
export class BookingManagement implements OnInit {
  Math = Math;
  
  bookings: AdminBooking[] = [];
  isLoading = true;
  selectedBookings: string[] = [];
  
  // Forms - Initialize with FormBuilder
  searchForm!: FormGroup;
  selectedBookingAction = '';
  
  // Modal states
  showDetailsModal = false;
  showActionModal = false;
  showBulkActionModal = false;
  selectedBooking: AdminBooking | null = null;
  
  // Filters
  filters = {
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: null as number | null,
    maxAmount: null as number | null,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  };

  totalBookings = 0;
  totalPages = 0;

  // Booking statuses
  bookingStatuses = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  // Booking actions
  bookingActions = [
    { value: 'approve', label: 'Approve Booking' },
    { value: 'reject', label: 'Reject Booking' },
    { value: 'cancel', label: 'Cancel Booking' },
    { value: 'complete', label: 'Complete Booking' }
  ];

  // Bulk actions
  bulkActions = [
    { value: 'approve', label: 'Approve Selected' },
    { value: 'reject', label: 'Reject Selected' },
    { value: 'cancel', label: 'Cancel Selected' }
  ];

  selectedAction = '';
  actionReason = '';
  actionNotes = '';
  selectedBulkAction = '';

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadBookings();
  }

  initializeForms() {
    this.searchForm = this.fb.group({
      search: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  loadBookings() {
    this.isLoading = true;
    this.adminService.getBookings(this.filters).subscribe({
      next: (response) => {
        this.bookings = response.data.bookings || response.data;
        this.totalBookings = response.data.pagination?.total || response.data.length;
        this.totalPages = response.data.pagination?.totalPages || Math.ceil(this.totalBookings / this.filters.limit);
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

  // CRUD Operations
  createBooking(bookingData: any) {
    // Implementation for creating booking (if needed for admin)
    console.log('Create booking:', bookingData);
  }

  updateBooking(bookingId: string, bookingData: Partial<AdminBooking>) {
    this.adminService.updateBooking(bookingId, bookingData).subscribe({
      next: (updatedBooking) => {
        const index = this.bookings.findIndex(b => b.id === updatedBooking.id);
        if (index > -1) {
          this.bookings[index] = updatedBooking;
        }
        this.showSuccessMessage('Booking updated successfully');
      },
      error: (error) => {
        console.error('Error updating booking:', error);
        this.showErrorMessage('Failed to update booking');
      }
    });
  }

  deleteBooking(bookingId: string) {
    if (confirm('Are you sure you want to delete this booking?')) {
      this.adminService.deleteBooking(bookingId).subscribe({
        next: () => {
          this.bookings = this.bookings.filter(b => b.id !== bookingId);
          this.showSuccessMessage('Booking deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting booking:', error);
          this.showErrorMessage('Failed to delete booking');
        }
      });
    }
  }

  // Booking Actions
  openDetailsModal(booking: AdminBooking) {
    this.selectedBooking = booking;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedBooking = null;
  }

  openActionModal(booking: AdminBooking) {
    this.selectedBooking = booking;
    this.showActionModal = true;
    this.selectedAction = '';
    this.actionReason = '';
    this.actionNotes = '';
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedBooking = null;
    this.selectedAction = '';
    this.actionReason = '';
    this.actionNotes = '';
  }

  executeBookingAction() {
    if (!this.selectedBooking || !this.selectedAction) return;

    const actionData = {
      action: this.selectedAction,
      reason: this.actionReason,
      notes: this.actionNotes
    };

    this.adminService.handleBookingAction(this.selectedBooking.id, actionData).subscribe({
      next: (updatedBooking) => {
        const index = this.bookings.findIndex(b => b.id === updatedBooking.id);
        if (index > -1) {
          this.bookings[index] = updatedBooking;
        }
        this.showSuccessMessage('Booking action completed successfully');
        this.closeActionModal();
      },
      error: (error) => {
        console.error('Error executing booking action:', error);
        this.showErrorMessage('Failed to execute booking action');
      }
    });
  }

  // Selection and bulk operations
  toggleBookingSelection(bookingId: string) {
    const index = this.selectedBookings.indexOf(bookingId);
    if (index > -1) {
      this.selectedBookings.splice(index, 1);
    } else {
      this.selectedBookings.push(bookingId);
    }
  }

  selectAllBookings() {
    if (this.selectedBookings.length === this.bookings.length) {
      this.selectedBookings = [];
    } else {
      this.selectedBookings = this.bookings.map(b => b.id);
    }
  }

  openBulkActionModal() {
    this.showBulkActionModal = true;
    this.selectedBulkAction = '';
    this.actionReason = '';
  }

  closeBulkActionModal() {
    this.showBulkActionModal = false;
    this.selectedBulkAction = '';
    this.actionReason = '';
    this.actionNotes = '';
  }

  executeBulkAction() {
    if (this.selectedBookings.length === 0 || !this.selectedBulkAction) return;

    const actionData = {
      action: this.selectedBulkAction,
      reason: this.actionReason,
      notes: this.actionNotes
    };

    this.adminService.handleBulkBookingAction(this.selectedBookings, actionData).subscribe({
      next: (results: BulkActionResult) => {
        results.successful.forEach((id) => {
          const bookingIndex = this.bookings.findIndex(b => b.id === id);
          if (bookingIndex > -1) {
            // Update booking status based on action
          }
        });
        this.showSuccessMessage(`${results.successful.length} bookings ${this.selectedBulkAction}d successfully`);
        this.selectedBookings = [];
        this.closeBulkActionModal();
      },
      error: (error: any) => {
        console.error('Error executing bulk action:', error);
        this.showErrorMessage('Failed to execute bulk action');
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

  showSuccessMessage(message: string) {
    // Implement success message display logic
    console.log('Success:', message);
  }

  showErrorMessage(message: string) {
    // Implement error message display logic
    console.error('Error:', message);
  }
}