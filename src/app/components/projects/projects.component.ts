import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';
import { ArchitectureStoryComponent } from '../architecture-story/architecture-story.component';
import { ArchitectureDiagram, HEALTHCARE_PLATFORM_DIAGRAMS } from './architecture-diagrams.data';

interface Project {
  num: string;
  title: string;
  desc: string;
  stack: string[];
  logo: string;
  architectureDiagrams?: ArchitectureDiagram[];
  highlights?: { value: string; label: string }[];
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RevealDirective, ArchitectureStoryComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent implements AfterViewInit, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);

  /** -1 = the card's intro; 0..n-1 = which diagram slide is showing */
  step = signal(-1);
  /** true shortly before the pinned card reaches the screen (start rendering diagrams) */
  armed = signal(false);
  private cleanup: Array<() => void> = [];
  private static readonly TOP = 80;   // sticky offset, below the navbar

  projects: Project[] = [
    {
      num: '01',
      title: 'Healthcare Microservices Platform',
      desc: 'Cloud-native reference architecture: nine independently deployable Spring Boot services combining REST/GraphQL at the edge, gRPC for internal synchronous calls, Kafka for event-driven workflows, and RabbitMQ for reliable notification retry/DLQ processing. Database-per-service on PostgreSQL, deployed to Kubernetes with Prometheus/Grafana observability.',
      stack: ['Spring Boot', 'Kafka', 'gRPC', 'GraphQL', 'RabbitMQ', 'Kubernetes'],
      logo: 'healthcare_platform_logo.svg',
      architectureDiagrams: HEALTHCARE_PLATFORM_DIAGRAMS,
      highlights: [
        { value: '9', label: 'independent services' },
        { value: '3', label: 'API styles: REST · GraphQL · gRPC' },
        { value: '2', label: 'brokers: Kafka · RabbitMQ' },
        { value: '1:1', label: 'database per service' },
      ],
    },
    {
      num: '02',
      title: 'Aya Lab',
      desc: 'CS-education tooling: a full-stack LeetCode-style coding-practice app on a Spring Boot / Angular architecture, plus an interactive linked-list learning game that makes pointer mechanics tangible.',
      stack: ['Spring Boot', 'Angular', 'TypeScript', 'Docker'],
      logo: 'aya_lab.png',
    },
  ];

  ngAfterViewInit() {
    const pin = this.host.nativeElement.querySelector('.pin') as HTMLElement | null;
    const stick = pin?.querySelector('.pin-stick') as HTMLElement | null;
    if (!pin || !stick) return;
    const total = (this.storyProject?.architectureDiagrams?.length ?? 0) + 1;   // intro + one slide per diagram

    this.zone.runOutsideAngular(() => {
      let last = -2;
      const onScroll = () => {
        const rect = pin.getBoundingClientRect();
        if (!this.armed() && rect.top < window.innerHeight * 1.6 && rect.bottom > 0) this.zone.run(() => this.armed.set(true));
        const track = pin.offsetHeight - stick.offsetHeight;
        const progress = track > 0 ? Math.min(1, Math.max(0, (ProjectsComponent.TOP - rect.top) / track)) : 0;
        const slot = Math.min(total - 1, Math.floor(progress * total));
        const step = slot - 1;
        if (step !== last) { last = step; this.zone.run(() => this.step.set(step)); }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      this.cleanup.push(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); });
      onScroll();
    });
  }

  ngOnDestroy() {
    this.cleanup.forEach((fn) => fn());
  }

  /** the project whose architecture is told inside its card */
  get storyProject(): Project | undefined {
    return this.projects.find((p) => p.architectureDiagrams?.length);
  }

  /** scroll the pinned card to a slide (0..n-1) */
  jumpTo(slide: number) {
    const pin = this.host.nativeElement.querySelector('.pin') as HTMLElement | null;
    const stick = pin?.querySelector('.pin-stick') as HTMLElement | null;
    if (!pin || !stick) return;
    const total = (this.storyProject?.architectureDiagrams?.length ?? 0) + 1;
    if (window.matchMedia('(max-height: 520px), (prefers-reduced-motion: reduce)').matches) {
      pin.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const track = pin.offsetHeight - stick.offsetHeight;
    const start = window.scrollY + pin.getBoundingClientRect().top - ProjectsComponent.TOP;
    window.scrollTo({ top: start + (track / total) * (slide + 1) + 10, behavior: 'smooth' });
  }
}
