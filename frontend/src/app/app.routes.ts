import { Routes } from '@angular/router';
import { UnauthGuard } from './core/guards/unauth.guard';
import { EmailVerificationGuard } from './core/guards/email-verification.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.Home)
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
