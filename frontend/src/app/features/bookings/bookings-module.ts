import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { BookingsRoutingModule } from './bookings-routing-module';
import { BookingList } from './booking-list/booking-list';
import { BookingForm } from './booking-form/booking-form';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    BookingsRoutingModule,
    BookingList,
    BookingForm
  ]
})
export class BookingsModule { }
