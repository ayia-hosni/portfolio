import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';

interface Project {
  num: string;
  title: string;
  desc: string;
  stack: string[];
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
    },
    {
      num: '02',
      title: 'Cancer Patient Evaluation Platform',
      desc: 'A 10-microservice system (5 Spring Boot + 5 FastAPI ML workers) for oncology evaluation, with FHIR R4 resources, HIPAA audit logging, and ML inference with ResNet-50, DeepSurv survival modeling and SHAP explainability.',
      stack: ['Spring Boot', 'FastAPI', 'FHIR R4', 'ResNet-50', 'DeepSurv', 'SHAP'],
    },
    {
      num: '03',
      title: 'DICOM Ingestion Backend',
      desc: 'A medical-imaging ingestion service handling DICOM studies end to end: parsing, storage, and downstream routing built around healthcare interoperability standards (HL7, FHIR R4, DICOM).',
      stack: ['Python', 'FastAPI', 'DICOM', 'HL7', 'Docker'],
    },
    {
      num: '04',
      title: 'Pointer Lab & PointerForge',
      desc: 'CS-education tooling: a full-stack LeetCode-style coding-practice app on a Spring Boot / Angular architecture, plus an interactive linked-list learning game that makes pointer mechanics tangible.',
      stack: ['Spring Boot', 'Angular', 'TypeScript', 'Docker'],
    },
  ];
}
