import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';

interface Project {
  num: string;
  title: string;
  desc: string;
  stack: string[];
  logo: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent {
  projects: Project[] = [
    {
      num: '01',
      title: 'Brain Health USA Platform',
      desc: 'Production telehealth backend with OfficeAlly clearinghouse integration, multi-payer insurance eligibility, EMR sync pipelines and WebRTC telehealth. Solved a Redis race condition in the sync queue with distributed locking and added Prometheus-based observability across services.',
      stack: ['Spring Boot', 'Kafka', 'Redis', 'MySQL', 'AWS EKS', 'Prometheus'],
      logo: 'brain_health_usa_logo.jpeg',
    },
    {
      num: '02',
      title: 'Aya Lab',
      desc: 'CS-education tooling: a full-stack LeetCode-style coding-practice app on a Spring Boot / Angular architecture, plus an interactive linked-list learning game that makes pointer mechanics tangible.',
      stack: ['Spring Boot', 'Angular', 'TypeScript', 'Docker'],
      logo: 'aya_lab.png',
    },
  ];
}
