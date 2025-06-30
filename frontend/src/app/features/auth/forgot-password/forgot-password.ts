import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  forgotPasswordForm: FormGroup;
  success = signal<boolean>(false);
  error = signal<string>('');
  message = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get isLoading() {
    return this.authService.isLoading;
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.error.set('');
      const email = this.forgotPasswordForm.value.email;
      
      this.authService.forgotPassword({ email }).subscribe({
        next: (response) => {
          this.success.set(true);
          this.message.set(
            response.message || 
            'Password reset instructions have been sent to your email address.'
          );
        },
        error: (err) => {
          console.error('Forgot password error:', err);
          this.error.set(
            err.error?.message || 
            'Failed to send reset email. Please try again.'
          );
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      const control = this.forgotPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.forgotPasswordForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return 'Email is required';
      if (field.errors['email']) return 'Please enter a valid email address';
    }
    return '';
  }
}
