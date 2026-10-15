import { Component, ElementRef, inject, signal } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';
import { AnalyticsService } from '../../core/analytics.service';
import { ArchitectureStoryComponent } from '../architecture-story/architecture-story.component';
import { ArchitectureDiagram, HEALTHCARE_PLATFORM_DIAGRAMS } from './architecture-diagrams.data';

interface Project {
  num: string;
  title: string;
  /** a short handwritten line under the title */
  kicker: string;
  desc: string;
  stack: string[];
  /** the decision / idea, written as a sticky note */
  noteTitle: string;
  note: string;
  /** a real screenshot taped to the page (otherwise the architecture sketch is used, if there is one) */
  shot?: string;
  shotAlt?: string;
  shotCaption?: string;
  links?: { label: string; url: string }[];
  architectureDiagrams?: ArchitectureDiagram[];
  highlights?: { value: string; label: string }[];
}

/**
 * Projects as pages of a sketchbook: handwritten title, the idea in a margin note, a taped screenshot (or a napkin sketch of
 * the architecture) and one sticky note with the decision behind it. The full architecture diagrams open inline.
 */
@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [RevealDirective, ArchitectureStoryComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent {
  private host = inject(ElementRef<HTMLElement>);
  private analytics = inject(AnalyticsService);

  /** the architecture viewer is closed until asked for */
  archOpen = signal(false);
  /** which diagram is showing */
  archStep = signal(0);

  projects: Project[] = [
    {
      num: '01',
      title: 'Healthcare Microservices Platform',
      kicker: 'a reference architecture',
      desc: 'Cloud-native reference architecture: nine independently deployable Spring Boot services combining REST/GraphQL at the edge, gRPC for internal synchronous calls, Kafka for event-driven workflows, and RabbitMQ for reliable notification retry/DLQ processing. Database-per-service on PostgreSQL, deployed to Kubernetes with Prometheus/Grafana observability.',
      stack: ['Spring Boot', 'Kafka', 'gRPC', 'GraphQL', 'RabbitMQ', 'Kubernetes'],
      noteTitle: 'the call',
      note: 'Kafka carries the events, through a transactional outbox. RabbitMQ is scoped to one service, for notification retries and dead letters. One database per service.',
      architectureDiagrams: HEALTHCARE_PLATFORM_DIAGRAMS,
      highlights: [
        { value: '9', label: 'independent services' },
        { value: '3', label: 'API styles: REST, GraphQL, gRPC' },
        { value: '2', label: 'brokers: Kafka, RabbitMQ' },
        { value: '1:1', label: 'database per service' },
      ],
    },
    {
      num: '02',
      title: 'Aya Lab',
      kicker: 'learn by doing',
      desc: 'CS-education tooling: a full-stack LeetCode-style coding-practice app on a Spring Boot / Angular architecture, plus an interactive linked-list learning game that makes pointer mechanics tangible.',
      stack: ['Spring Boot', 'Angular', 'TypeScript', 'Docker'],
      noteTitle: 'the idea',
      note: 'Make pointers tangible: a linked-list game next to a LeetCode-style practice app.',
      shot: 'projects/ayalab.jpg',
      shotAlt: 'Aya Lab on a phone: progress ring showing 10 of 33 problems solved, with filters for difficulty and topic',
      shotCaption: 'ayalab.co',
      links: [
        { label: 'Live site', url: 'https://ayalab.co/' },
        { label: 'GitHub (backend)', url: 'https://github.com/ayia-hosni/ayalab-backend' },
      ],
    },
    {
      num: '03',
      title: 'StudySync',
      kicker: 'study together',
      desc: 'A study platform for students: live study sessions over plugNmeet video meetings, community posts, a habit tracker to build a daily study routine, and student challenges to keep everyone motivated. Live now and built in the open under the StudySync-Platform GitHub organization.',
      stack: ['plugNmeet', 'Posts', 'Habit tracker', 'Student challenges'],
      noteTitle: 'the idea',
      note: 'Study together online: live sessions, posts, habits and challenges in one place.',
      shot: 'projects/studysync.jpg',
      shotAlt: 'StudySync on a phone: a welcome card, weekly habit progress at 75 percent and a daily writing club habit',
      shotCaption: 'study.ayalab.co',
      links: [
        { label: 'Live site', url: 'https://study.ayalab.co/' },
        { label: 'GitHub', url: 'https://github.com/StudySync-Platform' },
      ],
    },
  ];

  openArchitecture(article: HTMLElement) {
    this.archStep.set(0);
    this.archOpen.set(true);
    // once the panel is rendered, bring it into view
    setTimeout(() => article.querySelector('.arch-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  hideArchitecture(article: HTMLElement) {
    this.archOpen.set(false);
    setTimeout(() => article.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  setStep(i: number, total: number) {
    this.archStep.set(i);
    // how far into the diagrams the visitor got (once per session each)
    if (i >= 2) this.analytics.trackOnce('architecture-depth', { slide: 3 });
    if (i >= total - 1) this.analytics.trackOnce('architecture-depth', { slide: total });
  }
}
