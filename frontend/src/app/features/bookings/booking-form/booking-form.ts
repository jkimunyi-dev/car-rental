import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../booking.service';
import { PricingBreakdownDto, AvailabilityResult } from '../../../core/models/booking.models';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-form.html',
  styleUrls: ['./booking-form.scss']
})
export class BookingForm implements OnInit {
  bookingForm: FormGroup;
  vehicleId: string = '';
  isLoading = false;
  isCalculatingPrice = false;
  pricing: PricingBreakdownDto | null = null;
  availability: AvailabilityResult | null = null;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private bookingService: BookingService
  ) {
    this.bookingForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      startTime: [''],
      endTime: [''],
      pickupLocation: ['', Validators.required],
      dropoffLocation: [''],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^(07\d{8}|01\d{10})$/)
      ]],
      notes: [''],
      couponCode: [''],
      isHourlyBooking: [false],
      specialRequests: [''],
      insuranceLevel: ['BASIC'],
      driverAge: [25, [Validators.min(18), Validators.max(100)]]
    });
  }

  ngOnInit() {
    this.vehicleId = this.route.snapshot.params['vehicleId'] || this.route.snapshot.queryParams['vehicleId'];
    
    if (!this.vehicleId) {
      this.router.navigate(['/vehicles']);
      return;
    }

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    this.bookingForm.patchValue({
      startDate: today
    });

    // Listen to form changes for real-time price calculation
    this.bookingForm.valueChanges.subscribe(() => {
      if (this.bookingForm.get('startDate')?.value && this.bookingForm.get('endDate')?.value) {
        this.calculatePrice();
        this.checkAvailability();
      }
    });
  }

  calculatePrice() {
    if (!this.bookingForm.valid || this.isCalculatingPrice) return;

    this.isCalculatingPrice = true;
    const formValue = this.bookingForm.value;

    const options = {
      startTime: formValue.startTime,
      endTime: formValue.endTime,
      isHourlyBooking: formValue.isHourlyBooking,
      couponCode: formValue.couponCode
    };

    this.bookingService.calculatePrice(
      this.vehicleId,
      formValue.startDate,
      formValue.endDate,
      options
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.pricing = response.data;
        } else {
          console.error('Error calculating price:', response.message);
        }
        this.isCalculatingPrice = false;
      },
      error: (error) => {
        console.error('Error calculating price:', error);
        this.isCalculatingPrice = false;
      }
    });
  }

  checkAvailability() {
    const formValue = this.bookingForm.value;
    
    if (!formValue.startDate || !formValue.endDate) {
      this.availability = null;
      return;
    }
    
    this.bookingService.checkAvailability(
      this.vehicleId,
      formValue.startDate,
      formValue.endDate
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.availability = response.data;
          if (!this.availability.available) {
            this.error = 'Vehicle is not available for the selected dates. Please choose different dates.';
          } else {
            this.error = null;
          }
        } else {
          this.error = response.message || 'Error checking availability';
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Error checking availability';
        console.error('Error checking availability:', error);
      }
    });
  }

  onSubmit() {
    if (!this.bookingForm.valid) {
      this.markFormGroupTouched();
      this.error = 'Please fill in all required fields correctly.';
      return;
    }

    if (!this.availability?.available) {
      this.error = 'Vehicle is not available for the selected dates. Please check availability first.';
      return;
    }

    this.isLoading = true;
    this.error = null;

    const bookingData = {
      vehicleId: this.vehicleId,
      ...this.bookingForm.value
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/bookings', response.data.id], {
            queryParams: { success: 'true' }
          });
        } else {
          this.error = response.message || 'Failed to create booking';
          this.isLoading = false;
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create booking. Please try again.';
        this.isLoading = false;
        console.error('Booking creation error:', error);
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.bookingForm.controls).forEach(key => {
      const control = this.bookingForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.bookingForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.bookingForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['pattern']) {
        if (fieldName === 'phoneNumber') {
          return 'Phone number must be in format 07xxxxxxxx or 01xxxxxxxxxx';
        }
        return `Invalid ${fieldName} format`;
      }
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} must be at most ${field.errors['max'].max}`;
    }
    return '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}