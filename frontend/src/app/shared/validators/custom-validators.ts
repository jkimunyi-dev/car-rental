import { AbstractControl, ValidationErrors } from '@angular/forms';

// src/app/shared/validators/custom-validators.ts
export class CustomValidators {
  static futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return selectedDate >= today ? null : { futureDate: true };
  }

  static dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;
    
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start < end ? null : { dateRange: true };
  }

  static passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value;
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isLengthValid = value.length >= 8;
    
    const valid = hasLower && hasUpper && hasNumber && hasSpecial && isLengthValid;
    
    return valid ? null : {
      passwordStrength: {
        hasLower,
        hasUpper,
        hasNumber,
        hasSpecial,
        isLengthValid
      }
    };
  }
}