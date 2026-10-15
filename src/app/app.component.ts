import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { SplitIntroComponent } from './components/split-intro/split-intro.component';
import { HowIBuildComponent } from './components/how-i-build/how-i-build.component';
import { ExperienceComponent } from './components/experience/experience.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { SectionNavComponent } from './components/section-nav/section-nav.component';
import { ContactComponent } from './components/contact/contact.component';
import { AnalyticsService } from './core/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    SplitIntroComponent,
    HowIBuildComponent,
    ExperienceComponent,
    ProjectsComponent,
    ContactComponent,
    SectionNavComponent,
  ],
  template: `
    <!-- Shared pencil-grain filter used by the .pencil-ink class -->
    <svg class="pencil-defs" aria-hidden="true" width="0" height="0">
      <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" result="rough" />
        <feComponentTransfer in="rough">
          <feFuncA type="discrete" tableValues="0 .55 .8 .9 1" />
        </feComponentTransfer>
      </filter>
      <filter id="crayon" x="-4%" y="-40%" width="108%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="wavy" />
        <feTurbulence type="fractalNoise" baseFrequency="0.75 0.95" numOctaves="3" seed="2" result="grain" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.4 0 0 0 -1.05" result="wax" />
        <feComposite in="wavy" in2="wax" operator="in" />
      </filter>
      <filter id="crayonSoft" x="-4%" y="-20%" width="108%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" result="wavy" />
        <feTurbulence type="fractalNoise" baseFrequency="0.8 1" numOctaves="3" seed="4" result="grain" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.55" result="wax" />
        <feComposite in="wavy" in2="wax" operator="in" />
      </filter>
      <filter id="crayonInk" x="-4%" y="-20%" width="108%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="wavy" />
        <feTurbulence type="fractalNoise" baseFrequency="0.8 1" numOctaves="3" seed="6" result="grain" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -0.1" result="wax" />
        <feComposite in="wavy" in2="wax" operator="in" />
      </filter>
      <filter id="wobble" x="-100%" y="0" width="300%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="sketchy" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
      </filter>
    </svg>
    <app-navbar />
    <app-section-nav />
    <main>
      <app-hero />
      <app-split-intro />
      <app-how-i-build />
      <app-experience />
      <app-projects />
      <app-contact />
    </main>
  `,
  styles: [`.pencil-defs { position: absolute; } main { display: flex; flex-direction: column; }`],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private io?: IntersectionObserver;

  constructor(private analytics: AnalyticsService) {}

  /** one `section-view` per section per session: the funnel About → Experience → Projects → Contact */
  ngAfterViewInit() {
    if (typeof IntersectionObserver === 'undefined') return;
    // "seen" = 35% of the section, or 35% of the screen when the section is taller than that (phones: Projects is ~3 screens)
    const thresholds = Array.from({ length: 51 }, (_, i) => i / 50);
    this.io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        const seen = e.intersectionRatio >= 0.35 || e.intersectionRect.height >= window.innerHeight * 0.35;
        if (!e.isIntersecting || !seen) return;
        this.analytics.trackOnce('section-view', { section: (e.target as HTMLElement).id });
        this.io?.unobserve(e.target);
      }),
      { threshold: thresholds }
    );
    ['about', 'experience', 'work', 'contact'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) this.io!.observe(el);
    });
  }

  ngOnDestroy() {
    this.io?.disconnect();
  }
}
