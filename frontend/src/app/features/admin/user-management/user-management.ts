import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { UserService } from '../../../core/services/user.service';
import { AdminUser, BulkActionResult } from '../../../core/models/admin.models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
  
  // Filters
  filters = {
    search: '',
    role: '',
    isActive: null as boolean | null,
    isVerified: null as boolean | null,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
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
      isActive: [true],
      isVerified: [false],
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
        // Fix: Handle different response structures
        if (response.data && response.data.users) {
          this.users = response.data.users;
          this.totalUsers = response.data.pagination?.total || 0;
          this.totalPages = response.data.pagination?.totalPages || Math.ceil(this.totalUsers / this.filters.limit);
        } else if (Array.isArray(response.data)) {
          this.users = response.data;
          this.totalUsers = response.data.length;
          this.totalPages = Math.ceil(this.totalUsers / this.filters.limit);
        } else {
          this.users = [];
          this.totalUsers = 0;
          this.totalPages = 0;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showErrorMessage('Failed to load users');
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
      this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sortBy = column;
      this.filters.sortOrder = 'asc';
    }
    this.loadUsers();
  }

  // File handling
  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showErrorMessage('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showErrorMessage('File size must be less than 5MB');
        return;
      }

      this.selectedAvatar = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatarPreview() {
    this.selectedAvatar = null;
    this.avatarPreview = null;
    // Reset file input
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // CRUD Operations
  openCreateModal() {
    this.showCreateModal = true;
    this.userForm.reset({
      role: 'CUSTOMER',
      isActive: true,
      isVerified: false
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
      const userData = { ...this.userForm.value };
      
      // Add avatar if selected
      if (this.selectedAvatar) {
        userData.avatar = this.selectedAvatar;
      }

      this.userService.createUser(userData).subscribe({
        next: (response) => {
          this.users.unshift(response.data);
          this.totalUsers++;
          this.showSuccessMessage('User created successfully');
          this.closeCreateModal();
        },
        error: (error) => {
          console.error('Error creating user:', error);
          const errorMessage = error.error?.message || 'Failed to create user';
          this.showErrorMessage(errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched(this.userForm);
      this.showErrorMessage('Please fill in all required fields correctly');
    }
  }

  openEditModal(user: AdminUser) {
    this.selectedUser = user;
    this.showEditModal = true;
    
    this.userForm.patchValue({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      licenseNumber: '',
      address: '',
      city: '',
      country: '',
      zipCode: '',
      dateOfBirth: ''
    });
    
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
    
    // Restore password requirement
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  updateUser() {
    if (this.userForm.valid && this.selectedUser) {
      const userData = { ...this.userForm.value };
      
      // Remove password if not provided
      if (!userData.password) {
        delete userData.password;
      }
      
      // Add avatar if selected
      if (this.selectedAvatar) {
        userData.newAvatar = this.selectedAvatar;
      }

      this.userService.updateUser(this.selectedUser.id, userData).subscribe({
        next: (response) => {
          const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
          if (index > -1) {
            this.users[index] = response.data;
          }
          this.showSuccessMessage('User updated successfully');
          this.closeEditModal();
        },
        error: (error) => {
          console.error('Error updating user:', error);
          const errorMessage = error.error?.message || 'Failed to update user';
          this.showErrorMessage(errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched(this.userForm);
      this.showErrorMessage('Please fill in all required fields correctly');
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
        this.users = this.users.filter(u => u.id !== this.selectedUser!.id);
        this.totalUsers--;
        this.showSuccessMessage('User deleted successfully');
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        const errorMessage = error.error?.message || 'Failed to delete user';
        this.showErrorMessage(errorMessage);
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
      this.selectedUsers = this.users.map(u => u.id);
    }
  }

  openBulkActionModal() {
    if (this.selectedUsers.length === 0) {
      this.showErrorMessage('Please select at least one user');
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
      this.showErrorMessage('Please select an action and users');
      return;
    }

    const action = {
      userIds: this.selectedUsers,
      action: this.selectedBulkAction,
      reason: this.bulkActionReason
    };

    this.userService.bulkUserAction(action).subscribe({
      next: (response) => {
        // Fix: Extract result from response.data
        const result = response.data;
        
        // Handle successful actions
        result.successful.forEach((id) => {
          const index = this.users.findIndex(u => u.id === id);
          if (index > -1) {
            if (this.selectedBulkAction === 'delete') {
              this.users.splice(index, 1);
            } else if (this.selectedBulkAction === 'activate') {
              this.users[index].isActive = true;
            } else if (this.selectedBulkAction === 'deactivate') {
              this.users[index].isActive = false;
            } else if (this.selectedBulkAction === 'verify') {
              this.users[index].isVerified = true;
            } else if (this.selectedBulkAction === 'unverify') {
              this.users[index].isVerified = false;
            }
          }
        });

        let message = `${result.successCount} users ${this.selectedBulkAction}d successfully`;
        if (result.failureCount > 0) {
          message += `, ${result.failureCount} failed`;
        }
        
        this.showSuccessMessage(message);
        this.selectedUsers = [];
        this.closeBulkActionModal();
      },
      error: (error: any) => {
        console.error('Error executing bulk action:', error);
        const errorMessage = error.error?.message || 'Failed to execute bulk action';
        this.showErrorMessage(errorMessage);
      }
    });
  }

  updateUserRole(userId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const role = target.value;
    
    this.userService.updateUserRole(userId, role).subscribe({
      next: (response) => {
        const index = this.users.findIndex(u => u.id === userId);
        if (index > -1) {
          this.users[index].role = response.data.role;
        }
        this.showSuccessMessage('User role updated successfully');
      },
      error: (error) => {
        console.error('Error updating user role:', error);
        const errorMessage = error.error?.message || 'Failed to update user role';
        this.showErrorMessage(errorMessage);
        // Reset select to original value
        const user = this.users.find(u => u.id === userId);
        if (user) {
          target.value = user.role;
        }
      }
    });
  }

  updateUserStatus(userId: string, isActive: boolean) {
    this.userService.updateUserStatus(userId, isActive).subscribe({
      next: (response) => {
        const index = this.users.findIndex(u => u.id === userId);
        if (index > -1) {
          this.users[index].isActive = response.data.isActive;
        }
        this.showSuccessMessage(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        const errorMessage = error.error?.message || 'Failed to update user status';
        this.showErrorMessage(errorMessage);
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
    // Simple implementation - you can replace with a proper toast service
    alert(`Success: ${message}`);
  }

  showErrorMessage(message: string) {
    // Simple implementation - you can replace with a proper toast service
    alert(`Error: ${message}`);
  }

  getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'AGENT': 'bg-blue-100 text-blue-800',
      'CUSTOMER': 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters long`;
      }
    }
    return '';
  }

  getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'email': 'Email',
      'password': 'Password',
      'phone': 'Phone',
      'role': 'Role'
    };
    return displayNames[fieldName] || fieldName;
  }
}