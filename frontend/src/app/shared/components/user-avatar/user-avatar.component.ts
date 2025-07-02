import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center rounded-full bg-gray-300 text-white font-semibold"
         [class]="sizeClass"
         [style.background-color]="backgroundColor">
      <span *ngIf="!user.avatar && initials" [class]="textSizeClass">
        {{ initials }}
      </span>
      <img *ngIf="user.avatar" 
           [src]="user.avatar" 
           [alt]="user.firstName + ' ' + user.lastName"
           class="w-full h-full object-cover rounded-full">
    </div>
  `,
  styles: [`
    .size-sm { width: 32px; height: 32px; }
    .size-md { width: 40px; height: 40px; }
    .size-lg { width: 48px; height: 48px; }
    .size-xl { width: 64px; height: 64px; }
    
    .text-sm { font-size: 12px; }
    .text-md { font-size: 14px; }
    .text-lg { font-size: 16px; }
    .text-xl { font-size: 20px; }
  `]
})
export class UserAvatarComponent {
  @Input() user!: { firstName: string; lastName: string; avatar?: string };
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  get initials(): string {
    if (!this.user) return '';
    return `${this.user.firstName?.charAt(0) || ''}${this.user.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  get sizeClass(): string {
    return `size-${this.size}`;
  }

  get textSizeClass(): string {
    return `text-${this.size}`;
  }

  get backgroundColor(): string {
    // Generate a consistent color based on user's name
    const colors = [
      '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    const hash = this.user.firstName.charCodeAt(0) + this.user.lastName.charCodeAt(0);
    return colors[hash % colors.length];
  }
}