import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';

interface StackCard {
  label: string;
  items: string[];
}

@Component({
  selector: 'app-stack',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  templateUrl: './stack.component.html',
  styleUrl: './stack.component.scss',
})
export class StackComponent {
  cards: StackCard[] = [
    {
      label: 'Languages & Frameworks',
      items: ['Java / Spring Boot', 'Python / FastAPI', 'PHP / Laravel', 'TypeScript / Angular'],
    },
    {
      label: 'Data & Messaging',
      items: ['Kafka', 'Redis', 'MySQL', 'MongoDB'],
    },
    {
      label: 'Infra & DevOps',
      items: ['Docker', 'Kubernetes', 'AWS EKS', 'CI/CD pipelines'],
    },
    {
      label: 'Observability & Domain',
      items: ['Prometheus / Grafana', 'Filebeat', 'HL7 / FHIR R4 / DICOM', 'HIPAA compliance'],
    },
  ];
}
