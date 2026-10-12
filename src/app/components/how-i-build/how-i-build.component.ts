import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

type Step = { num: string; title: string; text: string; tags: string[]; art: 'boundaries' | 'pipelines' | 'delivery' | 'observability' };

/**
 * Intro statement + a pinned "how I build" scroll story: scrolling through the tall section
 * moves the timeline pointer down the four steps and expands the active one.
 */
@Component({
  selector: 'app-how-i-build',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './how-i-build.component.html',
  styleUrl: './how-i-build.component.scss',
})
export class HowIBuildComponent implements AfterViewInit, OnDestroy {
  @ViewChild('how', { static: true }) how!: ElementRef<HTMLElement>;

  readonly steps: Step[] = [
    {
      num: '01',
      title: 'Architecture & Boundaries',
      text: 'Clean service boundaries decide whether a system survives real traffic. I design and run distributed services in Java / Spring Boot and PHP / Laravel, with clear ownership and contracts between them.',
      tags: ['Java', 'Spring Boot', 'PHP', 'Laravel'],
      art: 'boundaries',
    },
    {
      num: '02',
      title: 'Pipelines & State',
      text: 'Event-driven pipelines and idempotent jobs, coordinated through Kafka and Redis, so a retry never double-processes and state stays consistent under load.',
      tags: ['Kafka', 'Redis', 'Event-driven', 'Idempotent jobs'],
      art: 'pipelines',
    },
    {
      num: '03',
      title: 'Delivery & Cloud',
      text: 'Kubernetes on AWS EKS behind rigorous CI/CD, so every release is repeatable, automated and uneventful.',
      tags: ['Kubernetes', 'AWS EKS', 'CI/CD'],
      art: 'delivery',
    },
    {
      num: '04',
      title: 'Observability & Code',
      text: 'Prometheus and Grafana dashboards, so problems show up on a screen before they show up in a ticket, and code the next engineer can reason about.',
      tags: ['Prometheus', 'Grafana', 'Clean code'],
      art: 'observability',
    },
  ];

  active = signal(0);
  /** stacked layout (phones): steps animate in as they scroll into view instead of following the pinned progress */
  staticMode = signal(false);
  seen = signal<Set<number>>(new Set());

  isOn(i: number) {
    return this.staticMode() ? this.seen().has(i) : i === this.active();
  }

  private cleanup: Array<() => void> = [];
  private static readonly STATIC_LAYOUT = '(max-height: 520px), (prefers-reduced-motion: reduce)';

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      const section = this.how.nativeElement;
      const total = this.steps.length;
      let last = -1;

      const onScroll = () => {
        const rect = section.getBoundingClientRect();
        const track = section.offsetHeight - window.innerHeight;
        const progress = track > 0 ? Math.min(1, Math.max(0, -rect.top / track)) : 0;
        const step = Math.min(total - 1, Math.floor(progress * total));
        if (step !== last) {
          last = step;
          this.zone.run(() => this.active.set(step)); // re-render only when the step changes
        }
      };

      const mq = window.matchMedia(HowIBuildComponent.STATIC_LAYOUT);
      const syncMode = () => this.zone.run(() => this.staticMode.set(mq.matches));
      syncMode();
      mq.addEventListener('change', syncMode);
      const io = new IntersectionObserver(
        (entries) => {
          const fresh = entries.filter((e) => e.isIntersecting).map((e) => +(e.target as HTMLElement).dataset['i']!);
          if (fresh.length) this.zone.run(() => this.seen.update((s) => new Set([...s, ...fresh])));
        },
        { threshold: 0.3, rootMargin: '0px 0px -8% 0px' }
      );
      section.querySelectorAll('.step').forEach((el) => io.observe(el));
      this.cleanup.push(() => { mq.removeEventListener('change', syncMode); io.disconnect(); });

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      this.cleanup.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
      onScroll();
    });
  }

  ngOnDestroy() {
    this.cleanup.forEach((fn) => fn());
  }

  /** Clicking a heading scrolls the pinned section to that step */
  goTo(index: number) {
    if (window.matchMedia(HowIBuildComponent.STATIC_LAYOUT).matches) return;
    const section = this.how.nativeElement;
    const track = section.offsetHeight - window.innerHeight;
    const top = window.scrollY + section.getBoundingClientRect().top + (track / this.steps.length) * index + 10;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  scrollToSteps() {
    this.how.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
