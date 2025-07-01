import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../core/services/auth';

declare var Swiper: any;
declare var ScrollReveal: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit, AfterViewInit {
  title = 'CarRental';
  isAuthenticated = false;
  currentUser: any = null;
  userInitials = '';
  showProfileDropdown = false;

  @ViewChild('menuBtn') menuBtn!: ElementRef;
  @ViewChild('navLinks') navLinks!: ElementRef;
  @ViewChild('selectPrice') selectPrice!: ElementRef;

  private swiper: any;
  private price = ["225", "455", "275", "625", "395"];

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

    this.loadExternalScripts();
    this.setupClickOutsideListener();
  }

  ngAfterViewInit() {
    this.initializeMenu();
    
    setTimeout(() => {
      this.initializeScrollReveal();
      this.initializeSwiper();
      this.initializeBanner();
    }, 100);
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

  private loadExternalScripts() {
    // Load ScrollReveal
    if (!(window as any).ScrollReveal) {
      const scrollRevealScript = document.createElement('script');
      scrollRevealScript.src = 'https://unpkg.com/scrollreveal';
      document.head.appendChild(scrollRevealScript);
    }

    // Load Swiper
    if (!(window as any).Swiper) {
      const swiperCSS = document.createElement('link');
      swiperCSS.rel = 'stylesheet';
      swiperCSS.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      document.head.appendChild(swiperCSS);

      const swiperScript = document.createElement('script');
      swiperScript.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
      document.head.appendChild(swiperScript);
    }
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

  private initializeSwiper() {
    if (!(window as any).Swiper) {
      setTimeout(() => this.initializeSwiper(), 100);
      return;
    }

    const selectCards = document.querySelectorAll('.select__card');
    if (selectCards.length > 0) {
      selectCards[0].classList.add('show__info');
    }

    this.swiper = new Swiper('.swiper', {
      loop: true,
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      coverflowEffect: {
        rotate: 0,
        depth: 500,
        modifier: 1,
        scale: 0.75,
        slideShadows: false,
        stretch: -100,
      },
      on: {
        slideChangeTransitionStart: () => {
          const index = this.swiper.realIndex;
          if (this.selectPrice?.nativeElement) {
            this.selectPrice.nativeElement.innerText = this.price[index];
          }
          selectCards.forEach((item) => {
            item.classList.remove('show__info');
          });
          if (selectCards[index]) {
            selectCards[index].classList.add('show__info');
          }
        }
      }
    });
  }

  private initializeBanner() {
    const banner = document.querySelector('.banner__wrapper');
    if (banner) {
      const bannerContent = Array.from(banner.children);
      bannerContent.forEach((item) => {
        const duplicateNode = item.cloneNode(true) as Element;
        duplicateNode.setAttribute('aria-hidden', 'true');
        banner.appendChild(duplicateNode);
      });
    }
  }

  private initializeScrollReveal() {
    const ScrollReveal = (window as any).ScrollReveal;
    if (!ScrollReveal) {
      setTimeout(() => this.initializeScrollReveal(), 100);
      return;
    }

    const scrollRevealOption = {
      origin: 'bottom',
      distance: '50px',
      duration: 1000,
    };

    // Header animations
    ScrollReveal().reveal('.header__container h1', {
      ...scrollRevealOption,
    });
    ScrollReveal().reveal('.header__container form', {
      ...scrollRevealOption,
      delay: 500,
    });
    ScrollReveal().reveal('.header__container img', {
      ...scrollRevealOption,
      delay: 1000,
    });

    // Range cards
    ScrollReveal().reveal('.range__card', {
      duration: 1000,
      interval: 500,
    });

    // Location section
    ScrollReveal().reveal('.location__image img', {
      ...scrollRevealOption,
      origin: 'right',
    });
    ScrollReveal().reveal('.location__content .section__header', {
      ...scrollRevealOption,
      delay: 500,
    });
    ScrollReveal().reveal('.location__content p', {
      ...scrollRevealOption,
      delay: 1000,
    });
    ScrollReveal().reveal('.location__content .btn', {
      ...scrollRevealOption,
      delay: 1500,
    });

    // Story cards
    ScrollReveal().reveal('.story__card', {
      ...scrollRevealOption,
      interval: 500,
    });

    // Download section
    ScrollReveal().reveal('.download__image img', {
      ...scrollRevealOption,
      origin: 'right',
    });
    ScrollReveal().reveal('.download__content .section__header', {
      ...scrollRevealOption,
      delay: 500,
    });
    ScrollReveal().reveal('.download__links', {
      ...scrollRevealOption,
      delay: 1000,
    });
  }
}