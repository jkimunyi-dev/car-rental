import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { User } from '../../core/models/auth.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  user = signal<User | null>(null);
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isLoading = signal<boolean>(false);
  error = signal<string>('');
  successMessage = signal<string>('');
  activeTab = signal<string>('profile');

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{ value: '', disabled: true }],
      phone: [''],
      dateOfBirth: [''],
      address: [''],
      city: [''],
      country: [''],
      zipCode: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.user.set(currentUser);
      this.profileForm.patchValue({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        // Add other fields as they become available in the User model
      });
    }
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
    this.error.set('');
    this.successMessage.set('');
  }

  onUpdateProfile() {
    if (this.profileForm.valid) {
      this.isLoading.set(true);
      this.error.set('');
      this.successMessage.set('');

      // Implement profile update API call here
      // For now, just simulate success
      setTimeout(() => {
        this.successMessage.set('Profile updated successfully!');
        this.isLoading.set(false);
      }, 1000);
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  onChangePassword() {
    if (this.passwordForm.valid) {
      this.isLoading.set(true);
      this.error.set('');
      this.successMessage.set('');

      // Implement password change API call here
      // For now, just simulate success
      setTimeout(() => {
        this.successMessage.set('Password changed successfully!');
        this.passwordForm.reset();
        this.isLoading.set(false);
      }, 1000);
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');

    if (!newPassword || !confirmPassword) return null;

    if (newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword.errors?.['passwordMismatch']) {
        delete confirmPassword.errors['passwordMismatch'];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }

    return null;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) {
        const minLength = field.errors['minlength'].requiredLength;
        return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
      }
      if (field.errors['passwordMismatch']) return 'Passwords do not match';
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      dateOfBirth: 'Date of birth',
      address: 'Address',
      city: 'City',
      country: 'Country',
      zipCode: 'ZIP Code'
    };
    return labels[fieldName] || fieldName;
  }

  onLogout() {
    this.authService.logout();
  }

  getUserInitials(): string {
    const user = this.user();
    if (user) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  }

  getUserFullName(): string {
    const user = this.user();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'User';
  }
}