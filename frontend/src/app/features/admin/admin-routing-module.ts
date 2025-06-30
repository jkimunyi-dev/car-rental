import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboard } from './dashboard/dashboard';
import { UserManagement } from './user-management/user-management';
import { BookingManagement } from './booking-management/booking-management';
import { VehicleManagement } from './vehicle-management/vehicle-management';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: AdminDashboard },
  { path: 'users', component: UserManagement },
  { path: 'bookings', component: BookingManagement },
  { path: 'vehicles', component: VehicleManagement }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
