import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VehicleService, Vehicle } from '../vehicle.service';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-detail.html',
  styleUrl: './vehicle-detail.scss'
})
export class VehicleDetail implements OnInit {
  vehicle = signal<Vehicle | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string>('');
  selectedImageIndex = signal<number>(0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleService: VehicleService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadVehicle(id);
    } else {
      this.router.navigate(['/vehicles']);
    }
  }

  private loadVehicle(id: string) {
    this.isLoading.set(true);
    this.vehicleService.getVehicle(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.vehicle.set(response.data);
        } else {
          this.error.set(response.message || 'Vehicle not found');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading vehicle:', err);
        this.error.set('Failed to load vehicle details');
        this.isLoading.set(false);
      }
    });
  }

  selectImage(index: number) {
    this.selectedImageIndex.set(index);
  }

  getImageUrl(images: any[], index: number = 0): string {
    if (images && images.length > index) {
      // Handle both string arrays and object arrays
      if (typeof images[index] === 'string') {
        return images[index];
      } else if (images[index].url) {
        return images[index].url;
      }
    }
    return '/assets/placeholder-car.jpg';
  }

  bookVehicle() {
    const vehicleId = this.vehicle()?.id;
    if (vehicleId) {
      this.router.navigate(['/bookings/create'], { 
        queryParams: { vehicleId } 
      });
    }
  }

  goBack() {
    this.router.navigate(['/vehicles']);
  }
}