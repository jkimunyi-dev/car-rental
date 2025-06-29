import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class EmailVerificationGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const token = route.queryParams['token'];
    const email = route.queryParams['email'];
    
    // Allow access if there's a token (for verification) or email (for resend form)
    if (token || email) {
      return true;
    }
    
    // No token or email, redirect to login
    this.router.navigate(['/auth/login']);
    return false;
  }
}