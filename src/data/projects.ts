export type ProjectCategory =
  | "API & Integrations"
  | "Full-stack"
  | "Distributed Systems"
  | "Systems & Reliability"
  | "AI Support"
  | "Data Platforms"
  | "Research";

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ProjectCaseStudy {
  slug: string;
  title: string;
  category: ProjectCategory;
  timeframe: string;
  context: string;
  summary: string;
  tags: string[];
  highlights: string[];
  whatIBuilt: string[];
  reliabilityAndObservability: string[];
  developerExperience: string[];
  impact: string[];
  links: ProjectLink[];
  image: string;
  featured?: boolean;
  confidentialityNote?: string;
}

export const projectCategories: Array<{ label: string; value: ProjectCategory | "All" }> = [
  { label: "All", value: "All" },
  { label: "API & Integrations", value: "API & Integrations" },
  { label: "Full-stack", value: "Full-stack" },
  { label: "Distributed Systems", value: "Distributed Systems" },
  { label: "Systems & Reliability", value: "Systems & Reliability" },
  { label: "AI Support", value: "AI Support" },
  { label: "Data Platforms", value: "Data Platforms" },
  { label: "Research", value: "Research" },
];

export const projects: ProjectCaseStudy[] = [
  {
    slug: "public-api-platform-by-dr-vali",
    title: "Public API Platform + Admin APIs",
    category: "API & Integrations",
    timeframe: "2025 — Present",
    context: "By Dr Vali (London, UK)",
    summary:
      "Designed and operated public-facing and internal APIs with authentication, rate limiting, documentation, and production observability.",
    tags: ["Node.js", "Express", "TypeScript", "OAuth", "RBAC", "Rate limiting", "API docs"],
    highlights: [
      "Public + admin APIs with clear separation of concerns",
      "Google OAuth + token-based access + role-based permissions",
      "Rate limiting at ~5,000 req/sec/IP with safeguards",
      "Owned API contracts, docs, and onboarding guides",
    ],
    whatIBuilt: [
      "REST API endpoints for internal tooling and external consumers",
      "Authentication/authorization flows (OAuth + tokens + roles)",
      "API versioning + backward-compatible contract changes",
      "Documentation and onboarding material for engineers and partners",
    ],
    reliabilityAndObservability: [
      "Defensive design: input validation, idempotent operations where needed, and clear error semantics",
      "Monitoring and production debugging loops to keep reliability high during live operations",
      "Rate limiting and abuse protections to keep the platform stable under load",
    ],
    developerExperience: [
      "Clear API contracts, examples, and onboarding guides to reduce integration time",
      "Inline documentation + pragmatic ergonomics for internal teams",
    ],
    impact: [
      "Enabled faster integrations by internal teams and partners through stable contracts + docs",
      "Improved platform stability via rate limiting and production monitoring practices",
    ],
    links: [{ label: "Company site", href: "https://bydrvali.com" }],
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb",
    featured: true,
    confidentialityNote: "Details are shared at a system level to respect customer privacy and internal confidentiality.",
  },
  {
    slug: "dropshipping-ecommerce-platform",
    title: "Dropshipping E-commerce Platform",
    category: "Full-stack",
    timeframe: "2025 — Present",
    context: "Personal project (London, UK)",
    summary:
      "Built a full-stack e-commerce platform with a React frontend, Node.js backend, and Stripe payments, with basic monitoring for API/server health.",
    tags: ["React", "TypeScript", "Node.js", "Stripe", "CI/CD", "Monitoring"],
    highlights: [
      "Stripe integration for secure payments",
      "React + Node.js architecture with REST APIs",
      "Monitoring scripts for API performance and server health",
    ],
    whatIBuilt: [
      "Frontend UI for browsing and checkout flows",
      "Backend REST APIs for products/orders and payment flows",
      "Stripe payment integration and secure handoffs",
    ],
    reliabilityAndObservability: [
      "Basic monitoring scripts to track uptime and surface degradation early",
      "Defensive handling of payment/webhook-style flows (retries and safe reprocessing where applicable)",
    ],
    developerExperience: [
      "Clear local setup and deployment workflow, built with repeatability in mind",
    ],
    impact: [
      "A hands-on reference project demonstrating end-to-end product delivery and integrations",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
  },
  {
    slug: "workshop-booking-system",
    title: "Workshop Booking System",
    category: "Full-stack",
    timeframe: "2025 — Present",
    context: "Personal project (London, UK)",
    summary:
      "Built a responsive booking experience with React/TypeScript and backend APIs for auth, session management, and payments, plus automated booking confirmations.",
    tags: ["React", "TypeScript", "REST APIs", "Auth", "Payments", "Alerts"],
    highlights: [
      "Responsive booking UI built for high concurrency",
      "REST APIs for auth/session management and payments",
      "Automated confirmation and reminder alerts",
    ],
    whatIBuilt: [
      "Booking UI and scheduling flows",
      "Backend APIs for user authentication and booking management",
      "Notification/alert logic for confirmations and reminders",
    ],
    reliabilityAndObservability: [
      "Practical validation around booking state transitions to avoid double-booking",
      "Operational alerting for failed confirmations/reminders",
    ],
    developerExperience: [
      "Well-defined API endpoints and predictable booking state machine",
    ],
    impact: [
      "Improved customer engagement via automated confirmations and reminders (per project goals)",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
  },
  {
    slug: "stripe-shopify-magento-intercom-integrations",
    title: "Stripe + Shopify + Magento + Intercom Integrations",
    category: "API & Integrations",
    timeframe: "2025 — Present",
    context: "By Dr Vali (London, UK)",
    summary:
      "Built and maintained strategic integrations and near-real-time data synchronization across payments, commerce, and support systems.",
    tags: ["Webhooks", "Queues/workers", "Idempotency", "Stripe", "Shopify", "Magento", "Intercom"],
    highlights: [
      "Webhook-driven sync with retries and failure handling",
      "Idempotent processing and durable workflows for consistency",
      "End-to-end ownership: schema → implementation → monitoring → iteration",
    ],
    whatIBuilt: [
      "Integration workflows for payments, orders, and customer data across multiple vendors",
      "Webhook ingestion with signature verification, deduplication, and replay protection",
      "Background processing patterns (queues/workers) for near-real-time sync and backfills",
    ],
    reliabilityAndObservability: [
      "Retry strategies and dead-letter style failure handling for webhook events",
      "Idempotency keys and deduplication for at-least-once delivery models",
      "Operational dashboards/logging to debug data mismatches and bottlenecks",
    ],
    developerExperience: [
      "Consistent event schemas and internal interfaces for adding new sources quickly",
      "Documentation for integration setup, failure modes, and operational runbooks",
    ],
    impact: [
      "Reduced manual support load by improving data consistency across systems",
      "Improved operational visibility into sync health and failure reasons",
    ],
    links: [{ label: "Company site", href: "https://bydrvali.com" }],
    image: "https://images.unsplash.com/photo-1553877522-43269d4ea984",
    featured: true,
    confidentialityNote: "Specific vendor configurations and internal identifiers are intentionally omitted.",
  },
  {
    slug: "ai-enabled-support-with-intercom",
    title: "AI-Enabled Customer Support with Intercom (Fin)",
    category: "AI Support",
    timeframe: "2025 — Present",
    context: "By Dr Vali (London, UK)",
    summary:
      "Operated Intercom as the primary support platform and improved resolution through AI configuration, feedback loops, and workflow automation.",
    tags: ["Intercom", "Fin AI", "Support workflows", "Feedback loops", "Operational insights"],
    highlights: [
      "Configured and trained Fin AI using brand language and historical conversations",
      "Introduced summarisation and feedback loops to improve outcomes over time",
      "Used support insights to drive API improvements and bug fixes",
    ],
    whatIBuilt: [
      "Support workflows and automation patterns aligned with customer journeys",
      "Process for iterating on AI behavior based on resolved/failed conversations",
    ],
    reliabilityAndObservability: [
      "Created feedback loops to identify failure modes and reduce repeat issues",
      "Operational discipline: triage, incident response, and closing the loop via product fixes",
    ],
    developerExperience: ["Translated support pain points into API/platform improvements (DX + reliability)"],
    impact: [
      "Contributed to 13+ shipped projects and supported ~£80k revenue growth through improved reliability and customer experience",
    ],
    links: [{ label: "Intercom", href: "https://www.intercom.com/" }],
    image: "https://images.unsplash.com/photo-1552581234-26160f608093",
    featured: true,
    confidentialityNote: "No customer conversations or personally identifiable data are included.",
  },
  {
    slug: "magento-ecommerce-rebuild",
    title: "Magento E-commerce Platform Rebuild",
    category: "Distributed Systems",
    timeframe: "2025 — Present",
    context: "bydrvali.com",
    summary:
      "Rebuilt a Magento-based e-commerce platform and implemented distributed order/warehouse/dispatch workflows across external systems.",
    tags: ["Magento", "Docker", "CI/CD", "Order workflows", "Integrations"],
    highlights: [
      "Full rebuild supporting 120+ services and high-volume customer traffic",
      "Distributed order, warehouse, and dispatch workflows across vendors",
      "Introduced Docker environments and CI/CD for faster, safer deployments",
    ],
    whatIBuilt: [
      "Workflow orchestration across order creation, fulfillment, and dispatch",
      "Deployment improvements via Docker-based environments and CI pipelines",
    ],
    reliabilityAndObservability: [
      "Operational runbooks and production incident response for live operations",
      "Guardrails to prevent inconsistent state across multi-system workflows",
    ],
    developerExperience: ["Repeatable local environments to reduce onboarding and deployment friction"],
    impact: ["Improved deployment reliability and iteration speed via CI/CD + containerized environments"],
    links: [{ label: "Website", href: "https://bydrvali.com" }],
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  },
  {
    slug: "enterprise-forecast-pipeline-system",
    title: "Enterprise Forecast Pipeline System",
    category: "Systems & Reliability",
    timeframe: "2021 — 2023",
    context: "PepsiCo Supply Chain Analytics (Remote)",
    summary:
      "Architected an end-to-end automated processing system for forecast generation with Linux automation, monitoring, and fault-tolerant recovery mechanisms.",
    tags: ["Linux", "Shell scripting", "Automation", "Monitoring", "Fault tolerance", "Dashboards"],
    highlights: [
      "Linux-based automation for scheduling, monitoring, and error handling",
      "System health monitoring for resource utilization under load",
      "Fault-tolerant recovery mechanisms to reduce failures (reported ~65%)",
    ],
    whatIBuilt: [
      "Automation scripts for orchestration, scheduling, and safe re-runs",
      "Operational dashboards for real-time pipeline status and system health",
      "Runbooks and maintenance procedures for reliable operations",
    ],
    reliabilityAndObservability: [
      "Alerting on bottlenecks/anomalies before user impact",
      "Automatic recovery steps for common failure modes",
      "Operational metrics to guide performance tuning",
    ],
    developerExperience: [
      "Clear operational documentation and predictable tooling for support engineers",
    ],
    impact: [
      "Improved production reliability and reduced operational toil through automation and better visibility",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f",
    confidentialityNote: "Client identifiers and internal system names are omitted.",
  },
  {
    slug: "system-performance-optimization-initiative",
    title: "System Performance Optimization Initiative",
    category: "Systems & Reliability",
    timeframe: "2022 — 2023",
    context: "Hilton (Client project)",
    summary:
      "Led a cross-functional effort to identify bottlenecks and improve throughput via monitoring, resource allocation tuning, and automated integrity checks.",
    tags: ["Performance tuning", "Monitoring", "Automation", "Dashboards", "Testing"],
    highlights: [
      "Identified and eliminated performance bottlenecks in production systems",
      "Improved throughput via resource allocation optimization (reported ~45%)",
      "Automated testing frameworks to validate integrity after updates",
    ],
    whatIBuilt: [
      "Monitoring solutions tracking system health across distributed environments",
      "Dashboards for operational insights and trend analysis",
      "Automation to validate system integrity after changes",
    ],
    reliabilityAndObservability: [
      "Proactive detection of degradation using health signals and alerts",
      "Repeatable validation checks to reduce regression risk after maintenance",
    ],
    developerExperience: [
      "Shared diagnostics and dashboards to align engineering and stakeholder conversations",
    ],
    impact: [
      "Improved system performance and reliability by turning ad-hoc investigations into durable tooling and processes",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2",
    confidentialityNote: "Client details are described at a high level only.",
  },
  {
    slug: "bdv-portal-clinical-platform",
    title: "BDV Portal — Internal Clinical Platform",
    category: "API & Integrations",
    timeframe: "2025 — Present",
    context: "By Dr Vali (London, UK)",
    summary:
      "Built a secure internal platform used daily by clinicians to manage patient data, treatments, and protocol-generation workflows.",
    tags: ["Node.js", "Express", "MongoDB Atlas", "RBAC", "Operational ownership"],
    highlights: [
      "Secure data models and authorization layers",
      "Automated protocol-generation logic to reduce manual effort",
      "On-call ownership with production incident response",
    ],
    whatIBuilt: [
      "Clinician workflows for patient records and treatment management",
      "Authorization and audit-friendly data access patterns",
      "Automation to generate and maintain protocol/aftercare guidance",
    ],
    reliabilityAndObservability: [
      "Incident response and debugging practices to maintain high availability",
      "Defensive validation and failure handling around critical workflows",
    ],
    developerExperience: ["Maintained stable contracts and predictable workflows for internal teams"],
    impact: ["Improved day-to-day clinician operations by centralizing workflows and reducing manual protocol creation"],
    links: [],
    image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c",
    confidentialityNote: "Patient data and internal tooling details are not shared publicly.",
  },
  {
    slug: "event-driven-forecasting-platform-pepsico",
    title: "Event-Driven Forecasting Data Platform (PepsiCo)",
    category: "Data Platforms",
    timeframe: "2021 — 2023",
    context: "LatentView Analytics — PepsiCo Supply Chain Analytics (Azure/Databricks)",
    summary:
      "Built distributed pipelines processing 25M+ weekly records and triggering forecasting workflows to generate 8-week demand forecasts.",
    tags: ["PySpark", "Azure Databricks", "Event-driven pipelines", "Fault tolerance", "Observability"],
    highlights: [
      "25M+ weekly records processed via distributed data pipelines",
      "Automated triggers from ingestion → forecasting pipeline",
      "Optimized processing time from ~13h to ~8h",
    ],
    whatIBuilt: [
      "Multi-stage pipelines for ingestion, validation, transformation, and output datasets",
      "Trigger-based orchestration patterns to run forecasting on data arrival",
      "Data quality checks and failure handling for production reliability",
    ],
    reliabilityAndObservability: [
      "Fault-tolerant workflows across storage and compute layers",
      "Monitoring/alerts for pipeline failures and data quality regressions",
    ],
    developerExperience: ["Clear runbooks and stakeholder-friendly dashboards for operational transparency"],
    impact: ["Contributed to forecasting/optimization systems with $200M+ revenue impact"],
    links: [],
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
    confidentialityNote: "Client data, internal dataset names, and proprietary metrics are excluded.",
  },
  {
    slug: "llm-response-validator",
    title: "LLM Response Validator",
    category: "AI Support",
    timeframe: "2025",
    context: "University of East London",
    summary:
      "Built an evaluation framework to assess LLM responses for accuracy/consistency/safety, with an automated test pipeline across multiple providers and a monitoring dashboard.",
    tags: ["Python", "LLMs", "Evaluation", "Hallucination detection", "Streamlit", "Automation"],
    highlights: [
      "Evaluation framework across accuracy, consistency, and harmful content detection",
      "Automated test pipeline for multiple LLM providers against benchmarks",
      "Dashboard for tracking response quality and model drift",
    ],
    whatIBuilt: [
      "Scoring metrics and benchmark harness for repeatable evaluation",
      "Automation to run test suites and compare providers and versions",
      "A lightweight dashboard for observability into response quality",
    ],
    reliabilityAndObservability: [
      "Repeatable benchmarks to catch regressions and drift",
      "Quality signals to surface hallucination and factual inconsistency patterns",
    ],
    developerExperience: [
      "Clear reporting outputs to support iteration and decision-making",
    ],
    impact: [
      "Reduced manual validation time by automating scoring and reporting (per project results)",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995",
  },
  {
    slug: "covid-mortality-socio-demographic-analysis",
    title: "Socio-Demographic Analysis of COVID-19 Mortality",
    category: "Research",
    timeframe: "2023 — 2024",
    context: "University of East London",
    summary:
      "Analyzed socio-demographic factors influencing COVID-19 mortality using statistical modeling and robust preprocessing to communicate public-health insights.",
    tags: ["Python", "R", "Statistical modeling", "Regression", "PCA", "Data preprocessing"],
    highlights: [
      "Regression + factor analysis to explain variance in mortality outcomes (reported ~45%)",
      "Robust preprocessing pipelines for complex demographic datasets",
      "Clear visualizations for communicating disparities and insights",
    ],
    whatIBuilt: [
      "Data preprocessing and feature selection workflows",
      "Modeling experiments (regression/factor analysis) with validation checks",
      "Visualization outputs for stakeholder-friendly interpretation",
    ],
    reliabilityAndObservability: [
      "Disciplined statistical testing and validation to avoid misleading conclusions",
    ],
    developerExperience: [
      "Well-structured analysis artifacts to make results reproducible and reviewable",
    ],
    impact: [
      "Produced actionable insights and methodology for policy-relevant analysis in a regulated domain",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
  },
  {
    slug: "customer-data-architecture-hilton",
    title: "Customer Data Architecture + Analytics (Hilton)",
    category: "Data Platforms",
    timeframe: "2022 — 2023",
    context: "LatentView Analytics — Hilton",
    summary:
      "Built analytics pipelines across 100+ behavioral features and delivered segmentation/pattern models to improve retention.",
    tags: ["Analytics", "ML", "Segmentation", "Pipelines", "Behavioral data"],
    highlights: ["100+ behavioral features analyzed for segmentation and pattern discovery", "Improved retention by ~26% and ~$10M annual revenue"],
    whatIBuilt: ["Feature pipelines and dataset preparation for analysis and modeling", "Segmentation and pattern analysis models to power targeting decisions"],
    reliabilityAndObservability: ["Validation steps to keep feature definitions stable over time"],
    developerExperience: ["Stakeholder-friendly outputs and dashboards to operationalize results"],
    impact: ["Improved customer retention by ~26% and enabled ~$10M annual revenue uplift"],
    links: [],
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1",
    confidentialityNote: "Specific datasets and customer identifiers are not included.",
  },
  {
    slug: "deep-learning-research-projects",
    title: "Deep Learning Research Projects",
    category: "Research",
    timeframe: "2020 — 2024",
    context: "UEL + VIT",
    summary:
      "Research work across anomaly detection and computer vision, including an IEEE-published transfer learning project.",
    tags: ["Deep learning", "TensorFlow", "Anomaly detection", "Computer vision", "Cloud"],
    highlights: [
      "Master’s thesis: anomaly detection in stock market data using deep learning on cloud platforms",
      "IEEE publication: transfer learning on CIFAR-10 (reported ~96% accuracy)",
    ],
    whatIBuilt: ["Training and evaluation pipelines for deep learning models", "Experiments for feature engineering, model selection, and validation"],
    reliabilityAndObservability: ["Reproducible experiments and disciplined evaluation to avoid misleading results"],
    developerExperience: ["Documented experiments and results to communicate findings clearly"],
    impact: ["Published research and delivered distinction-grade thesis work"],
    links: [],
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
  },
];

export const getProjectBySlug = (slug: string) => projects.find((project) => project.slug === slug);
