export interface ArchitectureDiagram {
  id: string;
  title: string;
  summary: string;
  definition: string;
}

export const HEALTHCARE_PLATFORM_DIAGRAMS: ArchitectureDiagram[] = [
  {
    id: 'system-context',
    title: 'System Context',
    summary:
      'Who and what sits outside the platform: patients, doctors, and admins reach it through the frontend; an external payer is verified over SOAP for insurance eligibility.',
    definition: `flowchart LR
    Patient(["Patient"])
    DoctorUser(["Doctor / Clinical Staff"])
    Admin(["Administrator"])

    System["Healthcare Microservices Platform"]

    Payer["External Payer / Clearinghouse\\n(SOAP eligibility check)"]
    Notify["Email / SMS / Push channel\\n(simulated in this build)"]

    Patient -->|"Book / view appointments"| System
    DoctorUser -->|"Manage availability, view patients"| System
    Admin -->|"Manage platform, view audit / analytics"| System

    System -->|"On-demand eligibility check"| Payer
    System -->|"Notification delivery"| Notify`,
  },
  {
    id: 'high-level',
    title: 'High-Level Architecture',
    summary:
      'Nine independently deployable Spring Boot services plus a GraphQL BFF, fronted by a single NGINX Ingress. Only five services get a direct route; the rest are reached through gRPC/REST fan-out or Kafka.',
    definition: `flowchart TB
    User(["Patient / Doctor / Staff"]) --> Frontend["Frontend SPA"]
    Frontend --> Ingress["NGINX Ingress"]

    Ingress -->|"/api/v1/auth"| Identity["identity-service"]
    Ingress -->|"/api/v1/patients"| Patient["patient-service"]
    Ingress -->|"/api/v1/doctors"| Doctor["doctor-service"]
    Ingress -->|"/api/v1/appointments"| Appointment["appointment-service"]
    Ingress -->|"/graphql"| GraphQL["graphql-gateway (BFF)"]

    Identity --> IdentityDB[("identity_db")]
    Patient --> PatientDB[("patient_db")]
    Doctor --> DoctorDB[("doctor_db")]
    Appointment --> AppointmentDB[("appointment_db")]

    GraphQL -.->|gRPC| Patient
    GraphQL -.->|gRPC| Doctor
    GraphQL -.->|REST| Appointment
    GraphQL -.->|REST| Billing

    subgraph Internal["Internal-only, no Ingress route"]
        EMR["emr-service"]
        Billing["billing-service"]
        Notification["notification-service"]
        Audit["audit-service"]
        Analytics["analytics-service"]
    end

    Appointment ==>|"AppointmentCreated"| Kafka[("Kafka")]
    Kafka ==> Billing
    Kafka ==> Audit
    Kafka ==> Analytics
    Kafka -.-> Notification
    Notification --> RabbitMQ[("RabbitMQ")]`,
  },
  {
    id: 'container',
    title: 'Container Architecture',
    summary:
      'The deployable units and how they connect: each service owns its own database, gRPC handles internal lookups, and Kafka carries domain events between them.',
    definition: `flowchart TB
    Browser["Client Browser"] --> SPA["Frontend"]
    SPA --> Ingress["NGINX Ingress"]

    Ingress --> Identity["identity-service :8081"]
    Ingress --> Patient["patient-service :8082"]
    Ingress --> Doctor["doctor-service :8083"]
    Ingress --> Appointment["appointment-service :8084"]
    Ingress --> GraphQL["graphql-gateway :8090"]

    GraphQL -->|gRPC| Patient
    GraphQL -->|gRPC| Doctor
    GraphQL -->|REST| Appointment
    GraphQL -->|REST| Billing["billing-service :8086"]

    Appointment -->|gRPC| Patient
    Appointment -->|gRPC| Doctor
    Appointment ==> Kafka[("Kafka")]

    EMR["emr-service :8085"] -->|REST| Patient
    EMR ==> Kafka

    Kafka ==> Billing
    Kafka ==> Notification["notification-service :8087"]
    Kafka ==> Audit["audit-service :8088"]
    Kafka ==> Analytics["analytics-service :8089"]

    Notification --> RabbitMQ[("RabbitMQ")]

    Identity --> IdentityDB[("identity_db")]
    Patient --> PatientDB[("patient_db")]
    Doctor --> DoctorDB[("doctor_db")]
    Appointment --> AppointmentDB[("appointment_db")]
    EMR --> EMRDB[("emr_db")]
    Billing --> BillingDB[("billing_db")]`,
  },
  {
    id: 'service-domains',
    title: 'Service Architecture',
    summary:
      'The nine domain services grouped by responsibility rather than listed flat: identity, clinical, scheduling, financial, and supporting/cross-cutting.',
    definition: `flowchart LR
    subgraph Identity["Identity & Access"]
        IdentitySvc["identity-service"]
    end

    subgraph Clinical["Clinical Domain"]
        PatientSvc["patient-service"]
        DoctorSvc["doctor-service"]
        EMRSvc["emr-service"]
    end

    subgraph Scheduling["Scheduling"]
        AppointmentSvc["appointment-service"]
    end

    subgraph Financial["Financial"]
        BillingSvc["billing-service"]
    end

    subgraph Supporting["Supporting / Cross-Cutting"]
        NotificationSvc["notification-service"]
        AuditSvc["audit-service"]
        AnalyticsSvc["analytics-service"]
    end

    subgraph Edge["Edge / API Layer"]
        GraphQLSvc["graphql-gateway (BFF)"]
    end`,
  },
  {
    id: 'sync-communication',
    title: 'Synchronous Communication (gRPC)',
    summary:
      'Patient and Doctor services each expose two purpose-built gRPC contracts: a narrow existence check for booking validation, and a wider directory read for the GraphQL gateway, rather than one general-purpose service.',
    definition: `flowchart LR
    Appointment["appointment-service"] -->|"gRPC PatientLookup\\n(exists check)"| Patient["patient-service"]
    Appointment -->|"gRPC DoctorLookup\\n(exists check)"| Doctor["doctor-service"]

    Gateway["graphql-gateway"] -->|"gRPC PatientDirectory\\n(full record)"| Patient
    Gateway -->|"gRPC DoctorDirectory\\n(full record)"| Doctor
    Gateway -->|"REST"| AppointmentSvc["appointment-service"]
    Gateway -->|"REST"| Billing["billing-service"]

    EMR["emr-service"] -->|"REST\\n(role-based access)"| Patient`,
  },
  {
    id: 'event-topology',
    title: 'Event-Driven Architecture',
    summary:
      'Kafka is the cross-service event backbone, written through a transactional outbox. RabbitMQ is scoped to a single service, so it is not a shared bus between services.',
    definition: `flowchart LR
    Patient["patient-service"] -->|patient.events| Kafka[("Kafka")]
    Doctor["doctor-service"] -->|doctor.events| Kafka
    Appointment["appointment-service"] -->|appointment.events| Kafka
    EMR["emr-service"] -->|emr.events| Kafka

    Kafka -->|appointment.events| Billing["billing-service"]
    Billing -->|billing.events| Kafka

    Kafka -->|"5 domain topics"| Audit["audit-service"]
    Kafka -->|"5 domain topics"| Analytics["analytics-service"]

    Appointment -.->|"notification.requests\\n(scheduled reminder job)"| Kafka
    EMR -.->|notification.requests| Kafka
    Kafka -.->|notification.requests| Notification["notification-service"]
    Notification --> RabbitMQ[("RabbitMQ\\nretry / DLQ")]`,
  },
  {
    id: 'data-architecture',
    title: 'Data Architecture',
    summary:
      'Database-per-service, plus polyglot persistence: no service reaches into another’s tables, and all cross-service data access goes through APIs, gRPC, or events.',
    definition: `flowchart TB
    subgraph Services
        Identity["identity-service"]
        Patient["patient-service"]
        Doctor["doctor-service"]
        Appointment["appointment-service"]
        EMR["emr-service"]
        Billing["billing-service"]
    end

    subgraph PostgreSQL["PostgreSQL, one logical DB per service"]
        IdentityDB[("identity_db")]
        PatientDB[("patient_db")]
        DoctorDB[("doctor_db")]
        AppointmentDB[("appointment_db")]
        EMRDB[("emr_db")]
        BillingDB[("billing_db")]
    end

    Identity --> IdentityDB
    Patient --> PatientDB
    Doctor --> DoctorDB
    Appointment --> AppointmentDB
    EMR --> EMRDB
    Billing --> BillingDB

    Patient -.->|cache| Redis[("Redis")]
    Doctor -.->|cache| Redis
    EMR -.->|attachments| MinIO[("MinIO")]`,
  },
  {
    id: 'security',
    title: 'Security Architecture',
    summary:
      'identity-service is the sole token issuer; every other service verifies JWTs independently using a shared verification component rather than calling back per request.',
    definition: `sequenceDiagram
    participant User
    participant Frontend
    participant Identity as identity-service
    participant Service as Business Service

    User->>Frontend: Login (credentials)
    Frontend->>Identity: POST /api/v1/auth/login
    Identity-->>Frontend: JWT access token (HS256)

    Frontend->>Service: API request + Bearer token
    Service->>Service: Verify JWT signature + role

    alt Valid + authorized role
        Service-->>Frontend: 200 / requested data
    else Invalid or wrong role
        Service-->>Frontend: 401 / 403
    end`,
  },
  {
    id: 'deployment',
    title: 'Kubernetes Deployment',
    summary:
      'One Deployment per service behind a single NGINX Ingress, with Kustomize overlays layering datastores and messaging infrastructure on top of the base application manifests.',
    definition: `flowchart TB
    Internet["Internet"] --> LB["Load Balancer"]
    LB --> Ingress["NGINX Ingress Controller"]

    subgraph Cluster["Kubernetes Cluster, healthcare-platform namespace"]
        Ingress --> Frontend["frontend"]
        Ingress --> Identity["identity-service"]
        Ingress --> Patient["patient-service"]
        Ingress --> Doctor["doctor-service"]
        Ingress --> Appointment["appointment-service"]
        Ingress --> GraphQL["graphql-gateway"]

        EMR["emr-service"]
        Billing["billing-service"]
        Notification["notification-service"]
        Audit["audit-service"]
        Analytics["analytics-service"]

        Postgres[("postgres")]
        Kafka[("kafka + zookeeper")]
        RabbitMQ[("rabbitmq")]
        Redis[("redis")]
        MinIO[("minio")]

        subgraph Observability["Observability"]
            Prometheus["prometheus"]
            Grafana["grafana"]
        end
    end`,
  },
  {
    id: 'observability',
    title: 'Observability Architecture',
    summary:
      'All ten services expose Prometheus metrics and Actuator health checks wired to Kubernetes liveness/readiness probes, the part of the observability stack that is fully live today.',
    definition: `flowchart LR
    Services["Spring Boot Services\\n(all 10)"]

    Services -->|"/actuator/prometheus"| Prometheus["Prometheus"]
    Prometheus --> Grafana["Grafana dashboards"]

    Services -->|"/actuator/health"| Actuator["Spring Boot Actuator"]
    Kubernetes["Kubernetes"] -->|"liveness / readiness"| Actuator`,
  },
  {
    id: 'booking-sequence',
    title: 'Appointment Booking Sequence',
    summary:
      'Synchronous gRPC validation combined with an asynchronous, choreographed reaction: the client gets its response before billing, audit, and analytics ever run.',
    definition: `sequenceDiagram
    autonumber
    participant Client
    participant Appointment as appointment-service
    participant Patient as patient-service
    participant Doctor as doctor-service
    participant DB as appointment_db
    participant Kafka
    participant Billing as billing-service
    participant Audit as audit-service
    participant Analytics as analytics-service

    Client->>Appointment: POST /api/v1/appointments

    Appointment->>Patient: gRPC PatientLookup (exists check)
    Patient-->>Appointment: Exists

    Appointment->>Doctor: gRPC DoctorLookup (exists check)
    Doctor-->>Appointment: Exists

    rect rgb(240, 240, 240)
    note right of Appointment: Single transaction
    Appointment->>DB: INSERT appointment + outbox event
    end

    Appointment-->>Client: 201 Created

    Appointment->>Kafka: Publish AppointmentCreatedEvent

    par Independent async consumers
        Kafka->>Billing: AppointmentCreatedEvent
        Billing->>Kafka: InvoiceGeneratedEvent
    and
        Kafka->>Audit: AppointmentCreatedEvent
    and
        Kafka->>Analytics: AppointmentCreatedEvent
    end`,
  },
];
