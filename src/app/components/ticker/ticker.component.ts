import { Component } from '@angular/core';

@Component({
  selector: 'app-ticker',
  standalone: true,
  template: `
    <div class="ticker-wrap">
      <div class="marquee-track">
        <div class="marquee-inner" aria-hidden="true">
          @for (item of items; track item) {
            <span class="marquee-item">{{ item }}<span class="sep">●</span></span>
          }
          @for (item of items; track item) {
            <span class="marquee-item">{{ item }}<span class="sep">●</span></span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ticker-wrap {
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 1rem 0;
      background: var(--tint);
      transition: background 0.4s var(--ease);
    }
  `],
})
export class TickerComponent {
  items = [
    'Spring Boot',
    'Kafka',
    'Redis',
    'Kubernetes',
    'AWS EKS',
    'HIPAA Compliance',
    'FHIR R4',
    'HL7',
    'DICOM',
    'FastAPI',
    'Prometheus',
    'Distributed Systems',
    'CI / CD',
    'Grafana',
    'Docker',
    'PostgreSQL',
  ];
}
