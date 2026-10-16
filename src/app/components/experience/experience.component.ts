import { Component, signal } from '@angular/core';
import { AnalyticsService } from '../../core/analytics.service';

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
 * Experience as a timeline of company boxes. Brain Health USA unfolds into eight slides: each pairs a hand-drawn
 * illustration with what was built.
 */
@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss',
})
export class ExperienceComponent {

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

  /** the career at a glance: one card per company, in the order shown (add `period: 'Jan 2024 – Mar 2025'` to a card to show dates) */
  readonly companies: {
    id: 'bh' | 'brmja' | 'keel' | 'ipda3';
    plain?: boolean;   // nothing to unfold yet
    name: string;
    note: string;
    noteLogo?: string;
    role: string;
    period: string;
    blurb: string;
    logo: string;
    event: string;
  }[] = [
    {
      id: 'bh',
      name: 'Brain Health USA',
      note: 'via Idaam Cloud',
      noteLogo: 'idaamcloud_logo.jpeg',
      role: 'Backend & DevOps Engineer',
      period: '',
      blurb: 'HIPAA-compliant US EMR and telehealth platform used by 450+ providers.',
      logo: 'brain_health_usa_logo.jpeg',
      event: 'company-brain-health',
    },
    {
      id: 'brmja',
      name: 'OFOQ',
      note: 'formerly BRMJA.TECH',
      noteLogo: 'brmja_tech.jpeg',
      role: 'Backend & DevOps Engineer',
      period: '',
      blurb: 'A doctor referral system for Canada, built in Python with MedGemma.',
      logo: 'ofoq.png',
      event: 'company-ofoq',
    },
    {
      id: 'keel',
      plain: true,
      name: 'KeelWorks',
      note: '',
      role: 'Site Reliability Engineer',
      period: '',
      blurb: 'Learning to live. Living to learn.',
      logo: 'keelworks.jpeg',
      event: 'company-keelworks',
    },
    {
      id: 'ipda3',
      name: 'Ipda3 Tech',
      note: '',
      role: 'Backend Intern',
      period: 'Oct 2023 – Feb 2024 · 5 months',
      blurb: 'A blood bank system: dashboard, API and Firebase mobile notifications.',
      logo: 'ipda3_tech.jpeg',
      event: 'company-ipda3',
    },
  ];

  /** boxes that are unfolded: everything with details starts open, and each box has a Hide details button */
  open = signal<Set<string>>(new Set(['bh', 'brmja', 'ipda3']));

  isOpen(id: string) { return this.open().has(id); }

  /** the slide showing in the Brain Health USA box */
  slide = signal(0);

  constructor(private analytics: AnalyticsService) {}

  toggle(id: string, scroll = false) {
    const opening = !this.isOpen(id);
    this.open.update((o) => { const n = new Set(o); opening ? n.add(id) : n.delete(id); return n; });
    if (!scroll) return;
    // after folding or unfolding, keep the box's top just under the navbar
    setTimeout(() => {
      const box = document.querySelector<HTMLElement>(`app-experience [data-co="${id}"]`);
      if (box) window.scrollTo({ top: window.scrollY + box.getBoundingClientRect().top - 96, behavior: 'smooth' });
    }, 60);
  }

  go(i: number) {
    const n = this.chapters.length;
    const to = Math.min(n - 1, Math.max(0, i));
    if (to === this.slide()) return;
    this.slide.set(to);
    // how far into the slides the visitor got (once per session each)
    this.analytics.trackOnce('story-start');
    if (to >= 2) this.analytics.trackOnce('story-depth', { chapter: 3 });
    if (to >= n - 1) this.analytics.trackOnce('story-depth', { chapter: n });
  }
  next() { this.go(this.slide() + 1); }
  prev() { this.go(this.slide() - 1); }

  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
  }

  /** swipe on touch screens */
  private swipeX = 0;
  swipeStart(e: PointerEvent) { this.swipeX = e.clientX; }
  swipeEnd(e: PointerEvent) {
    if (e.pointerType === 'mouse') return;
    const dx = e.clientX - this.swipeX;
    if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
  }

  pad(n: number) {
    return String(n).padStart(2, '0');
  }
}
