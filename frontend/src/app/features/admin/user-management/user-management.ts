import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { UserService } from '../../../core/services/user.service';
import { AdminUser, CreateUserDto, UpdateUserDto, UserFilters } from '../../../core/models/user.models';
import { UserAvatarComponent } from '../../../shared/components/user-avatar/user-avatar.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UserAvatarComponent],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss']
})
export class UserManagement implements OnInit {
  Math = Math;
  
  users: AdminUser[] = [];
  isLoading = true;
  selectedUsers: string[] = [];
  
  // Forms - Initialize with FormBuilder
  userForm!: FormGroup;
  searchForm!: FormGroup;
  
  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showBulkActionModal = false;
  selectedUser: AdminUser | null = null;
  
  // File handling
  selectedAvatar: File | null = null;
  avatarPreview: string | null = null;
  
  // Filters - Fix the type to match UserFilters interface
  filters: UserFilters = {
    search: '',
    role: '',
    isActive: null,
    isVerified: null,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  totalUsers = 0;
  totalPages = 0;

  // Roles for dropdown
  userRoles = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'AGENT', label: 'Agent' },
    { value: 'CUSTOMER', label: 'Customer' }
  ];

  // Bulk actions
  bulkActions = [
    { value: 'activate', label: 'Activate Users' },
    { value: 'deactivate', label: 'Deactivate Users' },
    { value: 'verify', label: 'Verify Users' },
    { value: 'unverify', label: 'Unverify Users' },
    { value: 'delete', label: 'Delete Users' }
  ];
  selectedBulkAction = '';
  bulkActionReason = '';

  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadUsers();
  }

  initializeForms() {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      role: ['CUSTOMER', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      licenseNumber: [''],
      address: [''],
      city: [''],
      country: [''],
      zipCode: [''],
      dateOfBirth: ['']
    });

    this.searchForm = this.fb.group({
      search: [''],
      role: [''],
      isActive: [null],
      isVerified: [null]
    });
  }

  loadUsers() {
    this.isLoading = true;
    this.userService.getUsers(this.filters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users = response.data.users || [];
          const pagination = response.data.pagination;
          this.totalUsers = pagination.total;
          this.totalPages = pagination.totalPages;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showErrorMessage('Error loading users');
        this.isLoading = false;
      }
    });
  }

  onFilterChange() {
    this.filters.page = 1;
    this.loadUsers();
  }

  onPageChange(page: number) {
    this.filters.page = page;
    this.loadUsers();
  }

  onSort(column: string) {
    if (this.filters.sortBy === column) {
      this.filters.sortOrder = this.filters.sortOrder === 'desc' ? 'asc' : 'desc';
    } else {
      this.filters.sortBy = column;
      this.filters.sortOrder = 'desc';
    }
    this.loadUsers();
  }

  // File handling
  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedAvatar = file;
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatarPreview() {
    this.selectedAvatar = null;
    this.avatarPreview = null;
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  triggerFileInput() {
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // CRUD Operations
  openCreateModal() {
    this.showCreateModal = true;
    this.userForm.reset({
      role: 'CUSTOMER'
    });
    this.selectedAvatar = null;
    this.avatarPreview = null;
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.userForm.reset();
    this.selectedAvatar = null;
    this.avatarPreview = null;
  }

  createUser() {
    if (this.userForm.valid) {
      const userData: CreateUserDto = {
        ...this.userForm.value,
        avatar: this.selectedAvatar
      };

      this.userService.createUser(userData).subscribe({
        next: (response) => {
          this.showSuccessMessage('User created successfully');
          this.closeCreateModal();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.showErrorMessage('Failed to create user');
        }
      });
    } else {
      this.markFormGroupTouched(this.userForm);
    }
  }

  openEditModal(user: AdminUser) {
    this.selectedUser = user;
    this.showEditModal = true;
    
    // Patch form with user data
    this.userForm.patchValue({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      licenseNumber: '', // These fields might not be available in AdminUser
      address: '',
      city: '',
      country: '',
      zipCode: '',
      dateOfBirth: ''
    });
    
    // Add controls for edit mode
    if (!this.userForm.get('isActive')) {
      this.userForm.addControl('isActive', this.fb.control(user.isActive));
    }
    if (!this.userForm.get('isVerified')) {
      this.userForm.addControl('isVerified', this.fb.control(user.isVerified));
    }
    
    // Remove password requirement for edit
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    
    this.selectedAvatar = null;
    this.avatarPreview = user.avatar || null;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.selectedAvatar = null;
    this.avatarPreview = null;
    
    // Remove the edit-only controls
    this.userForm.removeControl('isActive');
    this.userForm.removeControl('isVerified');
    
    // Restore password requirement
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  updateUser() {
    if (this.userForm.valid && this.selectedUser) {
      const updateData: UpdateUserDto = { ...this.userForm.value };
      
      // Fix: Handle password field properly - only include if not empty
      if (!updateData.password || updateData.password.trim() === '') {
        delete (updateData as any).password; // Type assertion to avoid TS error
      }
      
      // Handle avatar file
      if (this.selectedAvatar) {
        updateData.newAvatar = this.selectedAvatar;
      }

      this.userService.updateUser(this.selectedUser.id, updateData).subscribe({
        next: (response) => {
          this.showSuccessMessage('User updated successfully');
          this.closeEditModal();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.showErrorMessage('Error updating user');
        }
      });
    } else {
      this.markFormGroupTouched(this.userForm);
      this.showErrorMessage('Please fill in all required fields');
    }
  }

  openDeleteModal(user: AdminUser) {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  deleteUser() {
    if (!this.selectedUser) return;

    this.userService.deleteUser(this.selectedUser.id).subscribe({
      next: () => {
        this.showSuccessMessage('User deleted successfully');
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.showErrorMessage('Failed to delete user');
      }
    });
  }

  // Selection and bulk operations
  toggleUserSelection(userId: string) {
    const index = this.selectedUsers.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(userId);
    }
  }

  selectAllUsers() {
    if (this.selectedUsers.length === this.users.length) {
      this.selectedUsers = [];
    } else {
      this.selectedUsers = this.users.map(user => user.id);
    }
  }

  openBulkActionModal() {
    if (this.selectedUsers.length === 0) {
      this.showErrorMessage('Please select users first');
      return;
    }
    this.showBulkActionModal = true;
    this.selectedBulkAction = '';
    this.bulkActionReason = '';
  }

  closeBulkActionModal() {
    this.showBulkActionModal = false;
    this.selectedBulkAction = '';
    this.bulkActionReason = '';
  }

  executeBulkAction() {
    if (!this.selectedBulkAction || this.selectedUsers.length === 0) {
      return;
    }

    const action = {
      userIds: this.selectedUsers,
      action: this.selectedBulkAction,
      reason: this.bulkActionReason
    };

    this.userService.bulkUserAction(action).subscribe({
      next: (response) => {
        this.showSuccessMessage(`Bulk action completed. ${response.data.successCount} users processed successfully.`);
        this.closeBulkActionModal();
        this.selectedUsers = [];
        this.loadUsers();
      },
      error: (error: any) => {
        console.error('Error executing bulk action:', error);
        this.showErrorMessage('Failed to execute bulk action');
      }
    });
  }

  updateUserRole(userId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const role = target.value;
    
    this.userService.updateUserRole(userId, role).subscribe({
      next: (response) => {
        this.showSuccessMessage('User role updated successfully');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error updating user role:', error);
        this.showErrorMessage('Failed to update user role');
        // Reset the select value
        target.value = this.users.find(u => u.id === userId)?.role || '';
      }
    });
  }

  updateUserStatus(userId: string, isActive: boolean) {
    this.userService.updateUserStatus(userId, isActive).subscribe({
      next: (response) => {
        this.showSuccessMessage(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        this.showErrorMessage('Failed to update user status');
      }
    });
  }

  // Utility methods
  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  showSuccessMessage(message: string) {
    // Implement success message display
    console.log('Success:', message);
  }

  showErrorMessage(message: string) {
    // Implement error message display
    console.error('Error:', message);
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'AGENT': return 'bg-blue-100 text-blue-800';
      case 'CUSTOMER': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getVerificationColor(isVerified: boolean): string {
    return isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  }

  // Export functionality
  exportUsers(format: 'csv' | 'json' = 'csv') {
    this.userService.exportUsers(format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting users:', error);
        this.showErrorMessage('Failed to export users');
      }
    });
  }

  // Add the validation helper methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors) {
      const errors = field.errors;
      if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
      if (errors['email']) return 'Please enter a valid email address';
      if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
      if (errors['pattern']) return `${this.getFieldDisplayName(fieldName)} format is invalid`;
    }
    return '';
  }

  getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      role: 'Role',
      licenseNumber: 'License Number',
      address: 'Address',
      city: 'City',
      country: 'Country',
      zipCode: 'ZIP Code',
      dateOfBirth: 'Date of Birth'
    };
    return displayNames[fieldName] || fieldName;
  }
}