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
      notes: [''],
      couponCode: [''],
      isHourlyBooking: [false]
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
      next: (pricing) => {
        this.pricing = pricing;
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
    
    this.bookingService.checkAvailability(
      this.vehicleId,
      formValue.startDate,
      formValue.endDate
    ).subscribe({
      next: (availability) => {
        this.availability = availability;
      },
      error: (error) => {
        console.error('Error checking availability:', error);
      }
    });
  }

  onSubmit() {
    if (!this.bookingForm.valid || !this.availability?.available) return;

    this.isLoading = true;
    this.error = null;

    const bookingData = {
      vehicleId: this.vehicleId,
      ...this.bookingForm.value
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: (booking) => {
        this.router.navigate(['/bookings', booking.id], {
          queryParams: { success: 'true' }
        });
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create booking. Please try again.';
        this.isLoading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}