import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail implements OnInit {
  verificationStatus = signal<'pending' | 'success' | 'error' | 'resend'>('pending');
  message = signal<string>('');
  email = signal<string>('');
  isLoading = signal<boolean>(false);
  resendForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: Auth,
    private fb: FormBuilder
  ) {
    this.resendForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Get email from query params if available
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email.set(params['email']);
        this.resendForm.patchValue({ email: params['email'] });
      }
    });

    // Check for verification token
    const token = this.route.snapshot.queryParams['token'];
    if (token) {
      this.verifyEmailToken(token);
    } else {
      // No token provided, show resend form
      this.verificationStatus.set('resend');
      this.message.set('Please check your email for the verification link, or request a new one below.');
    }
  }

  private verifyEmailToken(token: string): void {
    this.isLoading.set(true);
    this.verificationStatus.set('pending');
    this.message.set('Verifying your email address...');

    this.authService.verifyEmail({ token }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.verificationStatus.set('success');
        this.message.set(response.message || 'Email verified successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login'], {
            queryParams: { message: 'Email verified! You can now log in.' }
          });
        }, 3000);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.verificationStatus.set('error');
        this.message.set(
          error.error?.message || 
          'Email verification failed. The link may be expired or invalid.'
        );
      }
    });
  }

  onResendVerification(): void {
    if (this.resendForm.valid) {
      this.isLoading.set(true);
      const email = this.resendForm.value.email;

      this.authService.resendVerificationEmail({ email }).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.verificationStatus.set('success');
          this.message.set(response.message || 'Verification email sent successfully!');
        },
        error: (error) => {
          this.isLoading.set(false);
          this.verificationStatus.set('error');
          this.message.set(
            error.error?.message || 
            'Failed to send verification email. Please try again.'
          );
        }
      });
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.resendForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return 'Email is required';
      if (field.errors['email']) return 'Please enter a valid email address';
    }
    return '';
  }
}
