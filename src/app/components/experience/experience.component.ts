import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, signal } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

interface Chapter {
  kicker: string;      // the story beat
  title: string;
  image: string;
  alt: string;
  caption: string;     // handwritten caption under the illustration
  metrics?: { value: string; label: string }[];
  points: string[];
  tags: string[];
}

/**
 * Brain Health USA, told as a story: a pinned scroll section where each of the eight chapters
 * pairs a hand-drawn illustration with what was built. Scrolling advances the chapter.
 */
@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss',
})
export class ExperienceComponent implements AfterViewInit, OnDestroy {
  @ViewChild('story', { static: true }) story!: ElementRef<HTMLElement>;

  readonly chapters: Chapter[] = [
    {
      kicker: 'It starts with scale.',
      title: 'Global scale',
      image: 'experience/global-scale.webp',
      alt: 'A person holding a compass over a world map with 50+ locations',
      caption: '450+ providers, 50+ clinics',
      metrics: [
        { value: '450+', label: 'healthcare providers' },
        { value: '50+', label: 'clinics' },
        { value: '~2k', label: 'daily appointments' },
      ],
      points: [
        'A HIPAA-compliant US EMR/EHR and telehealth SaaS platform, with roughly 1,500–2,000 patient appointments every day.',
        'I contributed across backend services, frontend integrations, distributed workflows, AI-powered automation and cloud infrastructure.',
      ],
      tags: ['HIPAA', 'EMR / EHR', 'Telehealth'],
    },
    {
      kicker: 'Then the foundation.',
      title: 'Core backend',
      image: 'experience/core-backend.webp',
      alt: 'A developer at a desk sending patient records to several clinics through Laravel and Python APIs',
      caption: 'backend services, 15k–40k events/day',
      metrics: [{ value: '15–40k', label: 'production events a day' }],
      points: [
        'Backend services for EMR/EHR workflows: patients, appointments, clinical documentation, insurance, pharmacy integrations and secure medical documents.',
        'REST and GraphQL APIs on Laravel and Python services, feeding the frontend applications.',
        'Asynchronous, event-driven workflows for high-volume healthcare data.',
      ],
      tags: ['Laravel', 'Python', 'REST', 'GraphQL', 'Redis', 'Kafka', 'RabbitMQ', 'NATS'],
    },
    {
      kicker: 'Then it had to go faster.',
      title: 'Optimization',
      image: 'experience/optimization.webp',
      alt: 'A person speeding up a sync process with a stopwatch showing 7x speed',
      caption: '7× sync throughput, 85% less time',
      metrics: [
        { value: '7×', label: 'sync throughput' },
        { value: '−85%', label: 'sync time' },
        { value: '−60–70%', label: 'search latency' },
      ],
      points: [
        'Patient and appointment synchronization about 7× faster, through async processing, batching, Redis coordination and tuned queue workers.',
        'Elasticsearch and Redis caching for patient, provider, appointment and document search.',
      ],
      tags: ['Queue workers', 'Batching', 'Redis', 'Elasticsearch'],
    },
    {
      kicker: 'Then it learned to do the legwork.',
      title: 'AI automation',
      image: 'experience/ai-automation.webp',
      alt: 'An operator watching an automation robot work in a live browser stream next to AI services and a clearinghouse',
      caption: 'Playwright agent, AI clinical notes',
      points: [
        'A Playwright (JavaScript) agent that works in a legacy healthcare clearinghouse, retrieving patient and clinical data and structuring it for downstream AI services.',
        'The live browser session is streamed to the frontend, with progress and events over WebSockets, so users watch the agent work in real time.',
        'Ollama for AI-assisted clinical note generation inside the documentation workflow.',
      ],
      tags: ['Playwright', 'WebSockets', 'Ollama', 'AI'],
    },
    {
      kicker: 'Then it went live.',
      title: 'Real-time telehealth',
      image: 'experience/telehealth.webp',
      alt: 'A doctor and a patient on a live video call',
      caption: 'video, WebRTC, live notifications',
      points: [
        'Frontend features in Vue.js on top of the REST and GraphQL APIs.',
        'WebSockets for live automation status, notifications and backend events.',
        'Real-time telehealth video built on WebRTC, LiveKit and PlugNMeet, inside the healthcare platform.',
      ],
      tags: ['Vue.js', 'WebSockets', 'WebRTC', 'LiveKit', 'PlugNMeet'],
    },
    {
      kicker: 'Then it had to be trusted.',
      title: 'Security & compliance',
      image: 'experience/security.webp',
      alt: 'A guard unlocking a HIPAA safe, with a PHI shield and an OWASP Top 10 checklist',
      caption: 'PHI protected, secure auth (OAuth2)',
      points: [
        'OWASP Top 10 reviews of authentication and authorization: Broken Access Control, IDOR, CSRF, session management and JWT issues found and fixed.',
        'Stronger authentication with OAuth2, secure cookies (HttpOnly, Secure, SameSite), CSRF protection, token rotation and RBAC.',
        'Encryption, TLS and audit logging to protect PHI and support HIPAA compliance.',
      ],
      tags: ['OWASP Top 10', 'OAuth2', 'RBAC', 'TLS', 'Audit logging', 'PHI'],
    },
    {
      kicker: 'Then it needed a home that doesn’t fall over.',
      title: 'AWS infrastructure',
      image: 'experience/aws-infra.webp',
      alt: 'An engineer loading Docker and Kubernetes containers onto ships under an EKS banner',
      caption: 'AWS EKS, Docker, Kubernetes',
      points: [
        'Laravel applications deployed on AWS EKS with Docker and Kubernetes, behind Kong API Gateway and Kubernetes Ingress for routing, authentication and rate limiting.',
        'AWS security and compliance controls: CloudTrail, CloudWatch, VPC Flow Logs, Security Groups, KMS, TLS, encrypted EBS/RDS/S3 and S3 Block Public Access.',
        'Highly available by design: Multi-AZ RDS, automated backups, point-in-time recovery, EKS RBAC, encrypted Secrets, network policies and SSM Session Manager.',
      ],
      tags: ['AWS EKS', 'Docker', 'Kubernetes', 'Kong', 'KMS', 'Multi-AZ RDS'],
    },
    {
      kicker: 'And finally, we could see it all.',
      title: 'Monitoring & CI/CD',
      image: 'experience/monitoring.webp',
      alt: 'An engineer in front of Prometheus, Grafana and ELK dashboards and a deployment pipeline',
      caption: 'Prometheus, Grafana, ELK, GitLab/GitHub CI/CD',
      points: [
        'CI/CD pipelines on GitHub Actions and GitLab CI/CD to automate build, test and deployment.',
        'Prometheus and Grafana dashboards, with application logs centralized in the ELK Stack, for clear production visibility and faster troubleshooting.',
      ],
      tags: ['GitHub Actions', 'GitLab CI/CD', 'Prometheus', 'Grafana', 'ELK'],
    },
  ];

  active = signal(0);
  staticMode = signal(false);
  seen = signal<Set<number>>(new Set());

  /** the chapter shown in the counter: the pinned index, or (stacked) the furthest chapter reached */
  cur() {
    if (!this.staticMode()) return this.active();
    const s = this.seen();
    return s.size ? Math.max(...s) : 0;
  }

  isOn(i: number) {
    return this.staticMode() ? this.seen().has(i) : i === this.active();
  }
  private cleanup: Array<() => void> = [];
  private countFrame = 0;
  private static readonly STATIC_LAYOUT = '(max-height: 520px), (prefers-reduced-motion: reduce)';

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      const section = this.story.nativeElement;
      const total = this.chapters.length;
      let last = -1;
      const onScroll = () => {
        const rect = section.getBoundingClientRect();
        const track = section.offsetHeight - window.innerHeight;
        const progress = track > 0 ? Math.min(1, Math.max(0, -rect.top / track)) : 0;
        const step = Math.min(total - 1, Math.floor(progress * total));
        if (step !== last) {
          last = step;
          this.zone.run(() => this.active.set(step));
          this.countMetrics(step);
        }
      };
      const mq = window.matchMedia(ExperienceComponent.STATIC_LAYOUT);
      const syncMode = () => this.zone.run(() => this.staticMode.set(mq.matches));
      syncMode();
      mq.addEventListener('change', syncMode);
      const io = new IntersectionObserver(
        (entries) => {
          entries.filter((e) => e.isIntersecting).forEach((e) => {
            const i = +(e.target as HTMLElement).dataset['i']!;
            if (!this.seen().has(i)) {
              this.zone.run(() => this.seen.update((s) => new Set([...s, i])));
              this.countMetrics(i);
            }
          });
        },
        { threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
      );
      section.querySelectorAll('.chapter').forEach((el) => io.observe(el));
      this.cleanup.push(() => { mq.removeEventListener('change', syncMode); io.disconnect(); });

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      this.cleanup.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
      onScroll();
      this.initTilt();
    });
  }

  /** the numbers in a chapter's metric cards count up from zero when the chapter becomes active */
  private countMetrics(chapter: number) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.from(this.story.nativeElement.querySelectorAll<HTMLElement>(`.chapter[data-i="${chapter}"] .metric b`));
    if (!els.length) return;
    cancelAnimationFrame(this.countFrame);
    const start = performance.now() + 450;
    const dur = 1100;
    const fmt = (final: string, k: number) =>
      final.replace(/\d+(\.\d+)?/g, (n) => {
        const dec = n.includes('.') ? n.split('.')[1].length : 0;
        return (parseFloat(n) * k).toFixed(dec);
      });
    els.forEach((el) => (el.textContent = fmt(el.dataset['final']!, 0)));
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      const k = 1 - Math.pow(1 - t, 3);
      els.forEach((el) => (el.textContent = fmt(el.dataset['final']!, k)));
      if (t < 1) this.countFrame = requestAnimationFrame(tick);
    };
    this.countFrame = requestAnimationFrame(tick);
  }

  /** illustration card tilts toward the pointer; the artwork inside shifts a little the other way */
  private initTilt() {
    if (window.matchMedia(ExperienceComponent.STATIC_LAYOUT).matches) return;
    const card = this.story.nativeElement.querySelector<HTMLElement>('.art-card');
    if (!card) return;
    let raf = 0;
    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };
    const step = () => {
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      card.style.setProperty('--px', cur.x.toFixed(3));
      card.style.setProperty('--py', cur.y.toFixed(3));
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      target = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
      if (!raf) raf = requestAnimationFrame(step);
    };
    const leave = () => { target = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(step); };
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    this.cleanup.push(() => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.countFrame);
    this.cleanup.forEach((fn) => fn());
  }

  words(t: string) {
    return t.split(' ');
  }

  chars(t: string) {
    return Array.from(t);
  }

  pad(n: number) {
    return String(n).padStart(2, '0');
  }

  /** jump to a chapter by scrolling the pinned section to its slice */
  goTo(i: number) {
    if (window.matchMedia(ExperienceComponent.STATIC_LAYOUT).matches) {
      this.story.nativeElement.querySelector<HTMLElement>(`.chapter[data-i="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const section = this.story.nativeElement;
    const track = section.offsetHeight - window.innerHeight;
    const top = window.scrollY + section.getBoundingClientRect().top + (track / this.chapters.length) * i + 10;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  start() {
    this.story.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
