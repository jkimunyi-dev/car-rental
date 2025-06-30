import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookingList } from './booking-list/booking-list';
import { BookingForm } from './booking-form/booking-form';

const routes: Routes = [
  { path: '', component: BookingList },
  { path: 'new/:vehicleId', component: BookingForm },
  { path: ':id', loadComponent: () => import('./booking-detail/booking-detail').then(m => m.BookingDetail) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BookingsRoutingModule { }
