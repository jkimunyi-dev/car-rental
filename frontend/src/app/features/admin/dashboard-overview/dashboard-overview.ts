import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Admin } from '../admin';
import { AdminAnalytics } from '../../../core/models/admin.models';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-overview.html',
  styleUrls: ['./dashboard-overview.scss']
})
export class DashboardOverview implements OnInit {
  analytics: AdminAnalytics | null = null;
  isLoading = true;
  selectedPeriod: 'day' | 'week' | 'month' | 'year' = 'month';
  periods: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month', 'year'];

  constructor(private adminService: Admin) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.isLoading = true;
    this.adminService.getAnalytics(this.selectedPeriod).subscribe({
      next: (response) => {
        this.analytics = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.isLoading = false;
      }
    });
  }

  onPeriodChange(period: 'day' | 'week' | 'month' | 'year') {
    this.selectedPeriod = period;
    this.loadAnalytics();
  }

  getGrowthColor(growth: number): string {
    return growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600';
  }

  getGrowthIcon(growth: number): string {
    return growth > 0 ? '↗' : growth < 0 ? '↙' : '→';
  }
}