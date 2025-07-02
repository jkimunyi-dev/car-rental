import { Routes } from '@angular/router';
import { UnauthGuard } from './core/guards/unauth.guard';
import { EmailVerificationGuard } from './core/guards/email-verification.guard';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.Home)
  },
  {
    path: 'vehicles',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/vehicles/vehicle-list/vehicle-list').then(m => m.VehicleList)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/vehicles/vehicle-detail/vehicle-detail').then(m => m.VehicleDetail)
      }
    ]
  },
  {
    path: 'bookings',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/bookings/booking-list/booking-list').then(m => m.BookingList)
      },
      {
        path: 'create',
        loadComponent: () => import('./features/bookings/booking-form/booking-form').then(m => m.BookingForm)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/bookings/booking-detail/booking-detail').then(m => m.BookingDetail)
      }
    ]
  },
  {
    path: 'wishlist',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/wishlist/list/wishlist').then(m => m.Wishlist)
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/profile/profile').then(m => m.Profile)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.AdminDashboard),
    children: [
      { 
        path: '', 
        redirectTo: 'overview', 
        pathMatch: 'full' 
      },
      {
        path: 'overview',
        loadComponent: () => import('./features/admin/dashboard-overview/dashboard-overview').then(m => m.DashboardOverview)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/user-management/user-management').then(m => m.UserManagement)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/admin/booking-management/booking-management').then(m => m.BookingManagement)
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./features/admin/vehicle-management/vehicle-management').then(m => m.VehicleManagement)
      }
    ]
  },
  {
    path: 'auth',
    canActivate: [UnauthGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
      },
      {
        path: 'verify-email',
        canActivate: [EmailVerificationGuard],
        loadComponent: () => import('./features/auth/verify-email/verify-email').then(m => m.VerifyEmail)
      },
      {
        path: 'resend-verification',
        loadComponent: () => import('./features/auth/resend-verification/resend-verification').then(m => m.ResendVerification)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPassword)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
