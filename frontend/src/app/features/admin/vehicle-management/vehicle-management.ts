import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminVehicle, BulkActionResult } from '../../../core/models/admin.models';
import { VehicleCategory, TransmissionType, FuelType, VehicleStatus } from '../../../core/models/vehicle.models';

@Component({
  selector: 'app-vehicle-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vehicle-management.html',
  styleUrls: ['./vehicle-management.scss']
})
export class VehicleManagement implements OnInit {
  Math = Math;
  
  vehicles: AdminVehicle[] = [];
  isLoading = true;
  selectedVehicles: string[] = [];
  
  // Forms - Initialize with FormBuilder
  vehicleForm!: FormGroup;
  searchForm!: FormGroup;
  editForm: any = {};

  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showBulkActionModal = false;
  selectedVehicle: AdminVehicle | null = null;
  
  // File handling
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  
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

  // Enums for dropdowns
  vehicleCategories = Object.values(VehicleCategory).map(cat => ({ value: cat, label: cat }));
  transmissionTypes = Object.values(TransmissionType).map(trans => ({ value: trans, label: trans }));
  fuelTypes = Object.values(FuelType).map(fuel => ({ value: fuel, label: fuel }));
  vehicleStatuses = Object.values(VehicleStatus).map(status => ({ value: status, label: status }));

  // Bulk actions
  bulkActions = [
    { value: 'activate', label: 'Activate' },
    { value: 'deactivate', label: 'Deactivate' },
    { value: 'maintenance', label: 'Set to Maintenance' },
    { value: 'available', label: 'Set to Available' },
    { value: 'delete', label: 'Delete' }
  ];
  selectedBulkAction = '';

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadVehicles();
  }

  initializeForms() {
    this.vehicleForm = this.fb.group({
      make: ['', Validators.required],
      model: ['', Validators.required],
      year: [new Date().getFullYear(), Validators.required],
      category: ['', Validators.required],
      transmission: ['', Validators.required],
      fuelType: ['', Validators.required],
      seats: [5, [Validators.required, Validators.min(1)]],
      doors: [4, [Validators.required, Validators.min(2)]],
      color: ['', Validators.required],
      licensePlate: ['', Validators.required],
      vin: [''],
      pricePerDay: [0, [Validators.required, Validators.min(0)]],
      pricePerHour: [0, Validators.min(0)],
      location: ['', Validators.required],
      description: [''],
      features: [[]]
    });

    this.searchForm = this.fb.group({
      search: [''],
      category: [''],
      status: [''],
      location: ['']
    });
  }

  loadVehicles() {
    this.isLoading = true;
    this.adminService.getVehicles(this.filters).subscribe({
      next: (response) => {
        this.vehicles = response.data.vehicles || response.data;
        this.totalVehicles = response.data.pagination?.total || response.data.length;
        this.totalPages = response.data.pagination?.totalPages || Math.ceil(this.totalVehicles / this.filters.limit);
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

  // File handling
  onImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.selectedImages = files;
    
    // Generate previews
    this.imagePreviews = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviews.push(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImagePreview(index: number) {
    this.selectedImages.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  // CRUD Operations
  openCreateModal() {
    this.showCreateModal = true;
    this.vehicleForm.reset({
      year: new Date().getFullYear(),
      seats: 5,
      doors: 4,
      pricePerDay: 0,
      features: []
    });
    this.selectedImages = [];
    this.imagePreviews = [];
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.vehicleForm.reset();
    this.selectedImages = [];
    this.imagePreviews = [];
  }

  createVehicle() {
    if (this.vehicleForm.valid) {
      const vehicleData = { ...this.vehicleForm.value };
      if (this.selectedImages.length > 0) {
        vehicleData.images = this.selectedImages;
      }

      this.adminService.createVehicle(vehicleData).subscribe({
        next: (newVehicle) => {
          this.vehicles.unshift(newVehicle);
          this.showSuccessMessage('Vehicle created successfully');
          this.closeCreateModal();
        },
        error: (error) => {
          console.error('Error creating vehicle:', error);
          this.showErrorMessage('Failed to create vehicle');
        }
      });
    } else {
      this.markFormGroupTouched(this.vehicleForm);
    }
  }

  saveVehicle() {
    if (this.selectedVehicle) {
      this.updateVehicle();
    } else {
      this.createVehicle();
    }
  }

  openEditModal(vehicle: AdminVehicle) {
    this.selectedVehicle = vehicle;
    this.editForm = { ...vehicle };
    this.showEditModal = true;
    
    this.vehicleForm.patchValue({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      category: vehicle.category,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seats: vehicle.seats,
      doors: vehicle.doors,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      pricePerDay: vehicle.pricePerDay,
      pricePerHour: vehicle.pricePerHour,
      location: vehicle.location,
      description: vehicle.description,
      features: vehicle.features || []
    });
    
    this.selectedImages = [];
    this.imagePreviews = [];
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedVehicle = null;
    this.vehicleForm.reset();
    this.selectedImages = [];
    this.imagePreviews = [];
  }

  updateVehicle() {
    if (this.vehicleForm.valid && this.selectedVehicle) {
      const vehicleData = { ...this.vehicleForm.value };
      if (this.selectedImages.length > 0) {
        vehicleData.images = this.selectedImages;
      }

      this.adminService.updateVehicle(this.selectedVehicle.id, vehicleData).subscribe({
        next: (updatedVehicle) => {
          const index = this.vehicles.findIndex(v => v.id === updatedVehicle.id);
          if (index > -1) {
            this.vehicles[index] = updatedVehicle;
          }
          this.showSuccessMessage('Vehicle updated successfully');
          this.closeEditModal();
        },
        error: (error) => {
          console.error('Error updating vehicle:', error);
          this.showErrorMessage('Failed to update vehicle');
        }
      });
    }
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
        this.showSuccessMessage('Vehicle deleted successfully');
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Error deleting vehicle:', error);
        this.showErrorMessage('Failed to delete vehicle');
      }
    });
  }

  // Selection and bulk operations
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
      this.selectedVehicles = this.vehicles.map(v => v.id);
    }
  }

  openBulkActionModal() {
    this.showBulkActionModal = true;
    this.selectedBulkAction = '';
  }

  closeBulkActionModal() {
    this.showBulkActionModal = false;
    this.selectedBulkAction = '';
  }

  executeBulkAction() {
    if (!this.selectedBulkAction || this.selectedVehicles.length === 0) return;

    const actionData = {
      vehicleIds: this.selectedVehicles,
      action: this.selectedBulkAction
    };

    this.adminService.bulkVehicleAction(actionData).subscribe({
      next: (result: BulkActionResult) => {
        result.successful.forEach((id) => {
          const vehicleIndex = this.vehicles.findIndex(v => v.id === id);
          if (vehicleIndex > -1) {
            if (this.selectedBulkAction === 'delete') {
              this.vehicles.splice(vehicleIndex, 1);
            }
          }
        });
        this.showSuccessMessage(`${result.successful.length} vehicles ${this.selectedBulkAction}d successfully`);
        this.selectedVehicles = [];
        this.closeBulkActionModal();
      },
      error: (error) => {
        console.error('Error executing bulk action:', error);
        this.showErrorMessage('Failed to execute bulk action');
      }
    });
  }

  updateVehicleStatus(vehicleId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const status = target.value;
    
    this.adminService.updateVehicleStatus(vehicleId, status).subscribe({
      next: (updatedVehicle) => {
        const index = this.vehicles.findIndex(v => v.id === vehicleId);
        if (index > -1) {
          this.vehicles[index] = updatedVehicle;
        }
        this.showSuccessMessage('Vehicle status updated successfully');
      },
      error: (error) => {
        console.error('Error updating vehicle status:', error);
        this.showErrorMessage('Failed to update vehicle status');
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
    console.log('Success:', message);
  }

  showErrorMessage(message: string) {
    console.error('Error:', message);
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
      'LUXURY': 'bg-pink-100 text-pink-800',
      'VAN': 'bg-indigo-100 text-indigo-800',
      'TRUCK': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  }

  // Export functionality
  exportVehicles(format: 'csv' | 'json' = 'csv') {
    this.adminService.exportVehicles(format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vehicles.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting vehicles:', error);
        this.showErrorMessage('Failed to export vehicles');
      }
    });
  }
}