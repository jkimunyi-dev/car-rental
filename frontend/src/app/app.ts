import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, effect } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from './core/services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, AfterViewInit {
  protected title = 'Motii';
  
  @ViewChild('menuBtn') menuBtn!: ElementRef;
  @ViewChild('navLinks') navLinks!: ElementRef;

  constructor(
    public authService: Auth,
    private router: Router
  ) {
    // React to authentication state changes
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        console.log('User logged in:', user);
      }
    });
  }

  ngOnInit() {
    this.loadScrollReveal();
  }

  ngAfterViewInit() {
    this.initializeMenu();
    
    setTimeout(() => {
      this.initializeScrollReveal();
    }, 100);
  }

  onSignIn() {
    this.router.navigate(['/auth/login']);
  }

  onSignUp() {
    this.router.navigate(['/auth/register']);
  }

  onLogout() {
    this.authService.logout();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get isAuthenticated() {
    return this.authService.isAuthenticated();
  }

  private loadScrollReveal() {
    if (!(window as any).ScrollReveal) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/scrollreveal';
      script.onload = () => {
        setTimeout(() => {
          this.initializeScrollReveal();
        }, 100);
      };
      document.head.appendChild(script);
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

  private initializeScrollReveal() {
    const ScrollReveal = (window as any).ScrollReveal;
    if (!ScrollReveal) return;

    const scrollRevealOption = {
      distance: '50px',
      origin: 'bottom',
      duration: 1000,
    };

    ScrollReveal().reveal('.header__image img', {
      ...scrollRevealOption,
      origin: 'right',
    });
    ScrollReveal().reveal('.header__content h1', {
      ...scrollRevealOption,
      delay: 500,
    });
    ScrollReveal().reveal('.header__content p', {
      ...scrollRevealOption,
      delay: 1000,
    });
    ScrollReveal().reveal('.header__links', {
      ...scrollRevealOption,
      delay: 1500,
    });

    ScrollReveal().reveal('.steps__card', {
      ...scrollRevealOption,
      interval: 500,
    });

    ScrollReveal().reveal('.service__image img', {
      ...scrollRevealOption,
      origin: 'left',
    });
    ScrollReveal().reveal('.service__content .section__subheader', {
      ...scrollRevealOption,
      delay: 500,
    });
    ScrollReveal().reveal('.service__content .section__header', {
      ...scrollRevealOption,
      delay: 1000,
    });
    ScrollReveal().reveal('.service__list li', {
      ...scrollRevealOption,
      delay: 1500,
      interval: 500,
    });

    ScrollReveal().reveal('.experience__card', {
      duration: 1000,
      interval: 500,
    });

    ScrollReveal().reveal('.download__image img', {
      ...scrollRevealOption,
      origin: 'right',
    });
    ScrollReveal().reveal('.download__content .section__header', {
      ...scrollRevealOption,
      delay: 500,
    });
    ScrollReveal().reveal('.download__content p', {
      ...scrollRevealOption,
      delay: 1000,
    });
    ScrollReveal().reveal('.download__links', {
      ...scrollRevealOption,
      delay: 1500,
    });
  }
}
