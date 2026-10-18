import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NavLink { id: string; label: string; }

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('linksEl', { static: true }) linksEl!: ElementRef<HTMLElement>;

  private host = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);

  readonly links: NavLink[] = [
    { id: 'about', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'work', label: 'Projects' },
    { id: 'contact', label: 'Contact' },
  ];

  dark = signal(false);
  scrolled = signal(false);
  open = signal(false);
  /** id of the section currently under the navbar ('' while still on the welcome screen) */
  active = signal('');
  indX = signal(0);
  indW = signal(0);
  indOn = signal(false);

  private cleanup: Array<() => void> = [];

  ngOnInit() {
    let stored: string | null = null;
    try { stored = localStorage.getItem('theme'); } catch {}
    // light is the default whatever the device prefers; dark only when the visitor chose it with the toggle
    if (stored === 'dark') {
      this.dark.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      let raf = 0;
      const progress = this.host.nativeElement.querySelector('.progress') as HTMLElement | null;

      const update = () => {
        raf = 0;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress?.style.setProperty('--p', max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : '0');

        const scrolled = y > 40;
        let active = '';
        const probe = y + 150;
        for (const l of this.links) {
          const el = document.getElementById(l.id);
          if (el && el.getBoundingClientRect().top + y <= probe) active = l.id;
        }
        if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) active = 'contact';

        if (scrolled !== this.scrolled() || active !== this.active()) {
          this.zone.run(() => {
            this.scrolled.set(scrolled);
            if (active !== this.active()) { this.active.set(active); setTimeout(() => this.moveIndicator(), 30); }   // wait for Angular to apply the .active class
          });
        }
      };
      const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };

      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', () => { schedule(); this.moveIndicator(); });
      document.fonts?.ready.then(() => this.moveIndicator());     // link widths change once the web font loads
      setTimeout(schedule, 300);
      schedule();

      this.cleanup.push(() => { window.removeEventListener('scroll', schedule); cancelAnimationFrame(raf); });
    });
  }

  ngOnDestroy() {
    this.cleanup.forEach((fn) => fn());
  }

  /** place the highlighter behind the active link */
  private moveIndicator() {
    const ul = this.linksEl.nativeElement;
    const a = ul.querySelector<HTMLElement>('a.active');
    this.zone.run(() => {
      if (!a) { this.indOn.set(false); return; }
      const li = a.parentElement as HTMLElement;      // offsetLeft is measured from the list, not the link
      this.indX.set(li.offsetLeft);
      this.indW.set(li.offsetWidth);
      this.indOn.set(true);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.open.set(false); }

  /** tapping outside the open menu closes it */
  @HostListener('document:pointerdown', ['$event'])
  onOutside(e: Event) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  toggleMenu() { this.open.update((v) => !v); }

  toggleTheme() {
    this.dark.update(v => !v);
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : '');
    try { localStorage.setItem('theme', this.dark() ? 'dark' : 'light'); } catch {}
  }

  go(e: Event, id: string) {
    e.preventDefault();
    this.open.set(false);
    if (id === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
