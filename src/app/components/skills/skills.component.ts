import { Component } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

interface Tool { name: string; note?: string; }
interface Group { id: 'api' | 'data' | 'cloud'; title: string; hint: string; tools: Tool[]; }

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss',
})
export class SkillsComponent {
  /** only tools that already appear in the experience and "how I build" sections */
  readonly groups: Group[] = [
    {
      id: 'api',
      title: 'Services & APIs',
      hint: 'what the product talks through',
      tools: [
        { name: 'REST', note: 'public API' },
        { name: 'GraphQL' },
        { name: 'gRPC', note: 'between services' },
        { name: 'WebSockets' },
      ],
    },
    {
      id: 'data',
      title: 'Data & messaging',
      hint: 'where state lives and moves',
      tools: [
        { name: 'Kafka', note: 'events, via an outbox' },
        { name: 'RabbitMQ', note: 'retries' },
        { name: 'NATS' },
        { name: 'Redis' },
        { name: 'Elasticsearch' },
        { name: 'Multi-AZ RDS' },
      ],
    },
    {
      id: 'cloud',
      title: 'Cloud & DevOps',
      hint: 'how it ships and stays up',
      tools: [
        { name: 'AWS EKS' },
        { name: 'Kubernetes' },
        { name: 'Docker' },
        { name: 'Kong', note: 'gateway' },
        { name: 'GitHub Actions' },
        { name: 'GitLab CI/CD' },
        { name: 'Prometheus + Grafana', note: 'alert before the ticket' },
        { name: 'ELK' },
      ],
    },
  ];

  readonly security = ['OWASP Top 10', 'OAuth2', 'RBAC', 'TLS', 'Audit logging'];
}
