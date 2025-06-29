import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-resend-verification',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './resend-verification.html',
  styleUrl: './resend-verification.scss'
})
export class ResendVerification {
  resendForm: FormGroup;
  isLoading = signal<boolean>(false);
  error = signal<string>('');
  success = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {
    this.resendForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.resendForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.success.set('');

    const { email } = this.resendForm.value;

    this.authService.resendVerificationEmail({ email }).subscribe({
      next: (response) => {
        this.success.set(response.message);
        this.isLoading.set(false);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'Failed to resend verification email');
        this.isLoading.set(false);
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.resendForm.controls).forEach(key => {
      const control = this.resendForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.resendForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }
}
