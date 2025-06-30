import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AdminRoutingModule } from './admin-routing-module';
import { AdminDashboard } from './dashboard/dashboard';
import { UserManagement } from './user-management/user-management';
import { BookingManagement } from './booking-management/booking-management';
import { VehicleManagement } from './vehicle-management/vehicle-management';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    AdminRoutingModule,
    AdminDashboard,
    UserManagement,
    BookingManagement,
    VehicleManagement
  ]
})
export class AdminModule { }
