import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { VehicleSearchRequest, Vehicle } from "../models/vehicle.model";

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private searchFiltersSubject = new BehaviorSubject<VehicleSearchRequest>({});
  public searchFilters$ = this.searchFiltersSubject.asObservable();

  private cartSubject = new BehaviorSubject<BookingCart | null>(null);
  public cart$ = this.cartSubject.asObservable();

  updateSearchFilters(filters: Partial<VehicleSearchRequest>): void {
    const currentFilters = this.searchFiltersSubject.value;
    this.searchFiltersSubject.next({ ...currentFilters, ...filters });
  }

  setBookingCart(cart: BookingCart): void {
    this.cartSubject.next(cart);
    localStorage.setItem('booking_cart', JSON.stringify(cart));
  }

  clearBookingCart(): void {
    this.cartSubject.next(null);
    localStorage.removeItem('booking_cart');
  }
}

interface BookingCart {
  vehicle: Vehicle;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropoffLocation?: string;
  totalDays: number;
  subtotal: number;
  taxes: number;
  totalAmount: number;
}