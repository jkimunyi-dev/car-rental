import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { VehicleService } from '../../../core/services/vehicle.service';
import { 
  VehicleWithStats, 
  VehicleSearchFilters, 
  VehicleListResponse,
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleCategory,
  TransmissionType,
  FuelType,
  VehicleStatus
} from '../../../core/models/vehicle.models';

interface VehicleImage {
  url: string;
  publicId: string;
  alt?: string;
}

@Component({
  selector: 'app-vehicle-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vehicle-management.html',
  styleUrls: ['./vehicle-management.scss']
})
export class VehicleManagement implements OnInit {
  Math = Math;
  currentYear = new Date().getFullYear();
  
  vehicles: VehicleWithStats[] = [];
  isLoading = true;
  selectedVehicles: string[] = [];
  
  // Forms
  vehicleForm!: FormGroup;
  searchForm!: FormGroup;
  editForm: any = {};

  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showBulkActionModal = false;
  showImageModal = false;
  selectedVehicle: VehicleWithStats | null = null;
  selectedImageUrl = '';
  
  // File handling
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  maxImages = 10;
  allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  // Filters
  filters: VehicleSearchFilters & { status?: string } = {
    search: '',
    category: '',
    status: '',
    location: '',
    minPrice: undefined,
    maxPrice: undefined,
    isActive: undefined,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
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
    private vehicleService: VehicleService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadVehicles();
  }

  initializeForms() {
    this.vehicleForm = this.fb.group({
      make: ['', [Validators.required, Validators.minLength(2)]],
      model: ['', [Validators.required, Validators.minLength(1)]],
      year: [this.currentYear, [
        Validators.required, 
        Validators.min(2000), 
        Validators.max(this.currentYear + 1)
      ]],
      category: ['', Validators.required],
      transmission: ['', Validators.required],
      fuelType: ['', Validators.required],
      seats: [5, [Validators.required, Validators.min(1), Validators.max(12)]],
      doors: [4, [Validators.required, Validators.min(2), Validators.max(6)]],
      color: ['', Validators.required],
      licensePlate: ['', [Validators.required, Validators.minLength(3)]],
      vin: [''],
      pricePerDay: [0, [Validators.required, Validators.min(0.01)]],
      pricePerHour: [0, [Validators.min(0)]],
      location: ['', Validators.required],
      description: [''],
      features: ['']
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
    
    const searchFilters: any = { ...this.filters };

    // Convert empty strings to undefined for enum fields
    if (searchFilters.category === '') {
      delete searchFilters.category;
    }
    
    if (searchFilters.status === '') {
      delete searchFilters.status;
    }

    // Remove undefined/null/empty values
    Object.keys(searchFilters).forEach(key => {
      const value = searchFilters[key];
      if (value === undefined || value === null || value === '') {
        delete searchFilters[key];
      }
    });

    console.log('Sending filters:', searchFilters);

    this.vehicleService.getVehicles(searchFilters).subscribe({
      next: (response: VehicleListResponse) => {
        this.vehicles = response.data || [];
        this.totalVehicles = response.meta?.total || 0;
        this.totalPages = response.meta?.totalPages || 0;
        this.isLoading = false;
        console.log('Loaded vehicles:', this.vehicles);
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.showErrorMessage('Failed to load vehicles');
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

  // Image handling methods
  onImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    
    // Validate file types
    const validFiles = files.filter(file => this.allowedImageTypes.includes(file.type));
    const invalidFiles = files.filter(file => !this.allowedImageTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      this.showErrorMessage(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Only JPEG, PNG, and WebP are allowed.`);
    }
    
    // Check total image limit
    if (this.selectedImages.length + validFiles.length > this.maxImages) {
      this.showErrorMessage(`Maximum ${this.maxImages} images allowed`);
      return;
    }
    
    // Add valid files
    this.selectedImages = [...this.selectedImages, ...validFiles];
    
    // Generate previews for new files
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImagePreview(index: number) {
    this.selectedImages.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  // Get primary image for vehicle display
  getVehiclePrimaryImage(vehicle: VehicleWithStats): string {
    if (vehicle.images && vehicle.images.length > 0) {
      // Handle both string array and object array formats
      const firstImage = vehicle.images[0];
      if (typeof firstImage === 'string') {
        return firstImage;
      } else if (typeof firstImage === 'object' && firstImage && 'url' in firstImage) {
        return (firstImage as any).url;
      }
    }
    return '/assets/images/no-vehicle-image.png'; // Fallback image
  }

  // Get all image URLs for vehicle
  getVehicleImages(vehicle: VehicleWithStats): string[] {
    if (!vehicle.images || vehicle.images.length === 0) {
      return [];
    }
    
    return vehicle.images.map((image: any) => {
      if (typeof image === 'string') {
        return image;
      } else if (typeof image === 'object' && image && 'url' in image) {
        return image.url;
      }
      return '';
    }).filter(url => url !== '');
  }

  // View vehicle images
  viewVehicleImages(vehicle: VehicleWithStats) {
    this.selectedVehicle = vehicle;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.selectedVehicle = null;
    this.selectedImageUrl = '';
  }

  selectImage(imageUrl: string) {
    this.selectedImageUrl = imageUrl;
  }

  // Remove image from existing vehicle
  removeVehicleImage(vehicle: VehicleWithStats, imageUrl: string) {
    if (confirm('Are you sure you want to remove this image?')) {
      this.vehicleService.removeVehicleImage(vehicle.id, imageUrl).subscribe({
        next: () => {
          this.showSuccessMessage('Image removed successfully');
          this.loadVehicles();
        },
        error: (error) => {
          console.error('Error removing image:', error);
          this.showErrorMessage('Failed to remove image');
        }
      });
    }
  }

  // CRUD Operations
  openCreateModal() {
    this.showCreateModal = true;
    this.vehicleForm.reset({
      year: this.currentYear,
      seats: 5,
      doors: 4,
      pricePerDay: 0,
      pricePerHour: 0,
      category: '',
      transmission: '',
      fuelType: '',
      features: ''
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
      const formValues = this.vehicleForm.value;
      
      // Process features
      let features: string[] = [];
      if (formValues.features && typeof formValues.features === 'string') {
        features = formValues.features.split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
      }

      const vehicleData: CreateVehicleDto = {
        ...formValues,
        features,
        images: this.selectedImages // Add selected images
      };

      console.log('Creating vehicle with data:', vehicleData);

      this.vehicleService.createVehicle(vehicleData).subscribe({
        next: (response) => {
          this.showSuccessMessage('Vehicle created successfully');
          this.closeCreateModal();
          this.loadVehicles();
        },
        error: (error) => {
          console.error('Error creating vehicle:', error);
          this.showErrorMessage('Failed to create vehicle: ' + (error.error?.message || error.message));
        }
      });
    } else {
      this.markFormGroupTouched(this.vehicleForm);
      this.showErrorMessage('Please fill in all required fields');
    }
  }

  openEditModal(vehicle: VehicleWithStats) {
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
      features: Array.isArray(vehicle.features) ? vehicle.features.join(', ') : ''
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
      const formValues = this.vehicleForm.value;
      
      // Process features
      let features: string[] = [];
      if (formValues.features && typeof formValues.features === 'string') {
        features = formValues.features.split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
      }

      const vehicleData: UpdateVehicleDto = {
        ...formValues,
        features,
        newImages: this.selectedImages // Add new images to upload
      };

      console.log('Updating vehicle with data:', vehicleData);

      this.vehicleService.updateVehicle(this.selectedVehicle.id, vehicleData).subscribe({
        next: (response) => {
          this.showSuccessMessage('Vehicle updated successfully');
          this.closeEditModal();
          this.loadVehicles();
        },
        error: (error) => {
          console.error('Error updating vehicle:', error);
          this.showErrorMessage('Failed to update vehicle: ' + (error.error?.message || error.message));
        }
      });
    } else {
      this.markFormGroupTouched(this.vehicleForm);
      this.showErrorMessage('Please fill in all required fields');
    }
  }

  openDeleteModal(vehicle: VehicleWithStats) {
    this.selectedVehicle = vehicle;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedVehicle = null;
  }

  deleteVehicle() {
    if (!this.selectedVehicle) return;

    this.vehicleService.deleteVehicle(this.selectedVehicle.id).subscribe({
      next: () => {
        this.showSuccessMessage('Vehicle deleted successfully');
        this.closeDeleteModal();
        this.loadVehicles();
      },
      error: (error) => {
        console.error('Error deleting vehicle:', error);
        this.showErrorMessage('Failed to delete vehicle: ' + (error.error?.message || error.message));
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
    if (this.selectedVehicles.length === 0) {
      this.showErrorMessage('Please select at least one vehicle');
      return;
    }
    this.showBulkActionModal = true;
    this.selectedBulkAction = '';
  }

  closeBulkActionModal() {
    this.showBulkActionModal = false;
  }

  executeBulkAction() {
    if (!this.selectedBulkAction || this.selectedVehicles.length === 0) return;

    if (this.selectedBulkAction === 'delete') {
      this.executeBulkDelete();
    } else {
      this.executeBulkStatusUpdate();
    }
  }

  private executeBulkDelete() {
    const deletePromises = this.selectedVehicles.map(vehicleId => 
      this.vehicleService.deleteVehicle(vehicleId).toPromise()
    );

    Promise.allSettled(deletePromises).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.showSuccessMessage(`Bulk delete completed: ${successful} successful, ${failed} failed`);
      this.closeBulkActionModal();
      this.selectedVehicles = [];
      this.loadVehicles();
    });
  }

  private executeBulkStatusUpdate() {
    let status: VehicleStatus;
    switch (this.selectedBulkAction) {
      case 'activate':
        status = VehicleStatus.AVAILABLE;
        break;
      case 'deactivate':
        status = VehicleStatus.INACTIVE;
        break;
      case 'maintenance':
        status = VehicleStatus.MAINTENANCE;
        break;
      case 'available':
        status = VehicleStatus.AVAILABLE;
        break;
      default:
        return;
    }

    const updatePromises = this.selectedVehicles.map(vehicleId => 
      this.vehicleService.updateVehicleAvailability(vehicleId, status).toPromise()
    );

    Promise.allSettled(updatePromises).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.showSuccessMessage(`Bulk update completed: ${successful} successful, ${failed} failed`);
      this.closeBulkActionModal();
      this.selectedVehicles = [];
      this.loadVehicles();
    });
  }

  updateVehicleStatus(vehicleId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const status = target.value as VehicleStatus;

    this.vehicleService.updateVehicleAvailability(vehicleId, status).subscribe({
      next: () => {
        this.showSuccessMessage('Vehicle status updated successfully');
        this.loadVehicles();
      },
      error: (error) => {
        console.error('Error updating vehicle status:', error);
        this.showErrorMessage('Failed to update vehicle status');
      }
    });
  }

  // Clear filters method
  clearFilters() {
    this.filters = {
      search: '',
      category: '' as any,
      location: '',
      minPrice: undefined,
      maxPrice: undefined,
      isActive: undefined,
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    (this.filters as any).status = '';
    this.onFilterChange();
  }

  // Validation helper methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.vehicleForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.vehicleForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      const errors = field.errors;
      if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
      if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
      if (errors['min']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['min'].min}`;
      if (errors['max']) return `${this.getFieldDisplayName(fieldName)} must be at most ${errors['max'].max}`;
    }
    return '';
  }

  getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      make: 'Make',
      model: 'Model',
      year: 'Year',
      category: 'Category',
      transmission: 'Transmission',
      fuelType: 'Fuel Type',
      seats: 'Seats',
      doors: 'Doors',
      color: 'Color',
      licensePlate: 'License Plate',
      vin: 'VIN',
      pricePerDay: 'Price Per Day',
      pricePerHour: 'Price Per Hour',
      location: 'Location',
      description: 'Description'
    };
    return displayNames[fieldName] || fieldName;
  }

  // Utility methods
  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  showSuccessMessage(message: string) {
    console.log('Success:', message);
    alert(message);
  }

  showErrorMessage(message: string) {
    console.error('Error:', message);
    alert(message);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'AVAILABLE': 'text-green-600',
      'RENTED': 'text-blue-600',
      'MAINTENANCE': 'text-yellow-600',
      'INACTIVE': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'ECONOMY': 'text-blue-600',
      'COMPACT': 'text-green-600',
      'SEDAN': 'text-purple-600',
      'SUV': 'text-orange-600',
      'LUXURY': 'text-yellow-600',
      'VAN': 'text-indigo-600',
      'TRUCK': 'text-red-600'
    };
    return colors[category] || 'text-gray-600';
  }

  // Export functionality
  exportVehicles(format: 'csv' | 'json' = 'csv') {
    this.vehicleService.exportVehicles(format).subscribe({
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