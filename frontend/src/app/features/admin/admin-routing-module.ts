import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboard } from './dashboard/dashboard';
import { UserManagement } from './user-management/user-management';
import { BookingManagement } from './booking-management/booking-management';
import { VehicleManagement } from './vehicle-management/vehicle-management';
import { DashboardOverview } from './dashboard-overview/dashboard-overview';

const routes: Routes = [
  {
    path: '',
    component: AdminDashboard,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: DashboardOverview },
      { path: 'users', component: UserManagement },
      { path: 'bookings', component: BookingManagement },
      { path: 'vehicles', component: VehicleManagement }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
