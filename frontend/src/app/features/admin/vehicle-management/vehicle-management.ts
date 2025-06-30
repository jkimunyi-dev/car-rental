import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Admin } from '../admin';
import { AdminVehicle } from '../../../core/models/admin.models';

@Component({
  selector: 'app-vehicle-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-management.html',
  styleUrls: ['./vehicle-management.scss']
})
export class VehicleManagement implements OnInit {
  vehicles: AdminVehicle[] = [];
  isLoading = true;
  selectedVehicles: string[] = [];
  
  // Filters
  filters = {
    search: '',
    category: '',
    status: '',
    location: '',
    minPrice: null as number | null,
    maxPrice: null as number | null,
    isActive: null as boolean | null,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  };

  totalVehicles = 0;
  totalPages = 0;

  // Modal states
  showEditModal = false;
  showDeleteModal = false;
  selectedVehicle: AdminVehicle | null = null;
  editForm: Partial<AdminVehicle> = {};

  vehicleCategories = [
    { value: '', label: 'All Categories' },
    { value: 'ECONOMY', label: 'Economy' },
    { value: 'COMPACT', label: 'Compact' },
    { value: 'SEDAN', label: 'Sedan' },
    { value: 'SUV', label: 'SUV' },
    { value: 'LUXURY', label: 'Luxury' },
    { value: 'VAN', label: 'Van' },
    { value: 'TRUCK', label: 'Truck' }
  ];

  vehicleStatuses = [
    { value: '', label: 'All Status' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'RENTED', label: 'Rented' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  constructor(private adminService: Admin) {}

  ngOnInit() {
    this.loadVehicles();
  }

  loadVehicles() {
    this.isLoading = true;
    this.adminService.getVehicles(this.filters).subscribe({
      next: (response) => {
        this.vehicles = response.data.vehicles;
        this.totalVehicles = response.data.pagination.total;
        this.totalPages = response.data.pagination.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.isLoading = false;
      }
    });
  }

  onFilterChange() {
    this.filters.page = 1;
    this.loadVehicles();
  }

  onPageChange(page: number) {
    this.filters.page = page;
    this.loadVehicles();
  }

  onSort(column: string) {
    if (this.filters.sortBy === column) {
      this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sortBy = column;
      this.filters.sortOrder = 'asc';
    }
    this.loadVehicles();
  }

  toggleVehicleSelection(vehicleId: string) {
    const index = this.selectedVehicles.indexOf(vehicleId);
    if (index > -1) {
      this.selectedVehicles.splice(index, 1);
    } else {
      this.selectedVehicles.push(vehicleId);
    }
  }

  selectAllVehicles() {
    if (this.selectedVehicles.length === this.vehicles.length) {
      this.selectedVehicles = [];
    } else {
      this.selectedVehicles = this.vehicles.map(vehicle => vehicle.id);
    }
  }

  updateVehicleStatus(vehicleId: string, status: string) {
    this.adminService.updateVehicleStatus(vehicleId, status).subscribe({
      next: (updatedVehicle) => {
        const index = this.vehicles.findIndex(v => v.id === vehicleId);
        if (index > -1) {
          this.vehicles[index] = updatedVehicle;
        }
      },
      error: (error) => {
        console.error('Error updating vehicle status:', error);
      }
    });
  }

  openEditModal(vehicle: AdminVehicle) {
    this.selectedVehicle = vehicle;
    this.editForm = { ...vehicle };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedVehicle = null;
    this.editForm = {};
  }

  saveVehicle() {
    if (!this.selectedVehicle || !this.editForm) return;

    this.adminService.updateVehicle(this.selectedVehicle.id, this.editForm).subscribe({
      next: (updatedVehicle) => {
        const index = this.vehicles.findIndex(v => v.id === this.selectedVehicle!.id);
        if (index > -1) {
          this.vehicles[index] = updatedVehicle;
        }
        this.closeEditModal();
      },
      error: (error) => {
        console.error('Error updating vehicle:', error);
      }
    });
  }

  openDeleteModal(vehicle: AdminVehicle) {
    this.selectedVehicle = vehicle;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedVehicle = null;
  }

  deleteVehicle() {
    if (!this.selectedVehicle) return;

    this.adminService.deleteVehicle(this.selectedVehicle.id).subscribe({
      next: () => {
        this.vehicles = this.vehicles.filter(v => v.id !== this.selectedVehicle!.id);
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Error deleting vehicle:', error);
      }
    });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'AVAILABLE': 'bg-green-100 text-green-800',
      'RENTED': 'bg-blue-100 text-blue-800',
      'MAINTENANCE': 'bg-yellow-100 text-yellow-800',
      'INACTIVE': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'ECONOMY': 'bg-blue-100 text-blue-800',
      'COMPACT': 'bg-green-100 text-green-800',
      'SEDAN': 'bg-purple-100 text-purple-800',
      'SUV': 'bg-orange-100 text-orange-800',
      'LUXURY': 'bg-yellow-100 text-yellow-800',
      'VAN': 'bg-indigo-100 text-indigo-800',
      'TRUCK': 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  }
}