import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  dark = signal(false);
  scrolled = signal(false);

  ngOnInit() {
    let stored: string | null = null;
    try { stored = localStorage.getItem('theme'); } catch {}
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : prefersDark;
    if (isDark) {
      this.dark.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 40);
  }

  toggleTheme() {
    this.dark.update(v => !v);
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : '');
    try { localStorage.setItem('theme', this.dark() ? 'dark' : 'light'); } catch {}
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
