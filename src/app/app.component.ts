import { Component } from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { SplitIntroComponent } from './components/split-intro/split-intro.component';
import { HowIBuildComponent } from './components/how-i-build/how-i-build.component';
import { ExperienceComponent } from './components/experience/experience.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { SectionNavComponent } from './components/section-nav/section-nav.component';
import { ContactComponent } from './components/contact/contact.component';
import { VisitorTrackingService } from './core/visitor-tracking.service';

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
export class AppComponent {
  constructor(tracking: VisitorTrackingService) {
    tracking.trackPageView();
  }
}
