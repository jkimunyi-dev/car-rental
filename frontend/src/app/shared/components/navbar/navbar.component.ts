import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  isAuthenticated = false;
  currentUser: any = null;
  userInitials = '';
  showProfileDropdown = false;

  @ViewChild('menuBtn') menuBtn!: ElementRef;
  @ViewChild('navLinks') navLinks!: ElementRef;

  constructor(
    private router: Router,
    private authService: Auth
  ) {}

  ngOnInit() {
    this.isAuthenticated = this.authService.isUserAuthenticated();
    
    if (this.isAuthenticated) {
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.userInitials = this.generateInitials(user.firstName, user.lastName);
        }
      });
    }

    this.setupClickOutsideListener();
  }

  ngAfterViewInit() {
    this.initializeMenu();
  }

  generateInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  onSignIn() {
    this.router.navigate(['/auth/login']);
  }

  onSignUp() {
    this.router.navigate(['/auth/register']);
  }

  onProfileClick() {
    this.router.navigate(['/profile']);
    this.showProfileDropdown = false;
  }

  onLogout() {
    this.authService.logout();
    this.showProfileDropdown = false;
  }

  onAdminDashboard() {
    this.router.navigate(['/admin']);
    this.showProfileDropdown = false;
  }

  isAdmin(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  toggleProfileDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  private setupClickOutsideListener() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const profileDropdown = document.querySelector('.profile-dropdown');
      
      if (profileDropdown && !profileDropdown.contains(target)) {
        this.showProfileDropdown = false;
      }
    });
  }

  private initializeMenu() {
    const menuBtn = this.menuBtn?.nativeElement;
    const navLinks = this.navLinks?.nativeElement;
    
    if (menuBtn && navLinks) {
      const menuBtnIcon = menuBtn.querySelector('i');
      
      menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        const isOpen = navLinks.classList.contains('open');
        if (menuBtnIcon) {
          menuBtnIcon.className = isOpen ? 'ri-close-line' : 'ri-menu-line';
        }
      });

      navLinks.addEventListener('click', () => {
        navLinks.classList.remove('open');
        if (menuBtnIcon) {
          menuBtnIcon.className = 'ri-menu-line';
        }
      });
    }
  }
}