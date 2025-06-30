import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Admin } from '../admin';
import { AdminUser } from '../../../core/models/admin.models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss']
})
export class UserManagement implements OnInit {
  // Add Math property
  Math = Math;

  users: AdminUser[] = [];
  isLoading = true;
  selectedUsers: string[] = [];
  
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

  // Modals
  showBulkActionModal = false;
  bulkAction = '';
  bulkActionReason = '';

  constructor(private adminService: Admin) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.adminService.getUsers(this.filters).subscribe({
      next: (response) => {
        this.users = response.data.users;
        this.totalUsers = response.data.pagination.total;
        this.totalPages = response.data.pagination.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
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

  updateUserRole(userId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const role = target.value;
    
    this.adminService.updateUserRole(userId, role).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === userId);
        if (index > -1) {
          this.users[index] = updatedUser;
        }
      },
      error: (error) => {
        console.error('Error updating user role:', error);
      }
    });
  }

  updateUserStatus(userId: string, isActive: boolean) {
    this.adminService.updateUserStatus(userId, isActive).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === userId);
        if (index > -1) {
          this.users[index] = updatedUser;
        }
      },
      error: (error) => {
        console.error('Error updating user status:', error);
      }
    });
  }

  openBulkActionModal() {
    this.showBulkActionModal = true;
  }

  closeBulkActionModal() {
    this.showBulkActionModal = false;
    this.bulkAction = '';
    this.bulkActionReason = '';
  }

  executeBulkAction() {
    if (!this.bulkAction || this.selectedUsers.length === 0) return;

    const action = {
      userIds: this.selectedUsers,
      action: this.bulkAction,
      reason: this.bulkActionReason
    };

    this.adminService.bulkUserAction(action).subscribe({
      next: (result) => {
        console.log('Bulk action result:', result);
        this.loadUsers();
        this.selectedUsers = [];
        this.closeBulkActionModal();
      },
      error: (error) => {
        console.error('Error executing bulk action:', error);
      }
    });
  }
}