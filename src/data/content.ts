/* All public content for the site. Voice: dry, precise, confident.
   No emoji, no exclamation marks, no buzzwords. Employer stays unnamed. */

export const identity = {
  name: "Sumit Gundawar",
  title: "Software Engineer & Innovation Integration",
  location: "London, UK",
  site: "sumitgundawar.com",
  linkedin: "https://linkedin.com/in/sumit-gundawar-759470129",
  linkedinLabel: "linkedin.com/in/sumit-gundawar-759470129",
  email: "sumitgundawar3@gmail.com",
  status: "Open to roles",
  availability: "Open to software engineering and data roles, London or remote.",
  bio: "Software and data engineer with dual Master's degrees (Distinction). Builds API platforms, integrations, and AI-enabled products in London's health-tech sector. Previously engineered enterprise data pipelines and forecasting systems contributing to $200M+ in revenue impact at PepsiCo and Hilton.",
  careerStart: "2019-06-01T00:00:00Z",
};

export type Health = "ok" | "warn" | "crit";

export interface TimelineRow {
  key: string;
  label: string; // NOW / PREVIOUSLY / EDUCATION
  title: string;
  line: string;
  dates: string;
  tags?: string[];
  health: Health;
}

export const timeline: TimelineRow[] = [
  {
    key: "now",
    label: "Now",
    title: "Software Engineer & Innovation Integration · By Dr Vali",
    line: "Builds public and admin REST APIs (Node.js/Express, OAuth, RBAC, rate limiting to 5,000 req/sec/IP) and webhook-driven integrations across Stripe, Magento, and Intercom with idempotency and retries. Led a full Magento rebuild and shipped 13+ products end to end, from schema design to on-call.",
    dates: "May 2025 — present",
    tags: ["Node.js", "Express", "TypeScript", "React", "Next.js", "MongoDB", "Redis", "Docker", "Stripe", "Magento"],
    health: "ok",
  },
  {
    key: "prev",
    label: "Previously",
    title: "Data Analyst · Enterprise Pipelines & ML · LatentView Analytics",
    line: "Architected event-driven distributed pipelines processing 25M+ weekly records with PySpark on Azure Databricks for PepsiCo's global supply chain; cut processing time 38% (13h → 8h). ML segmentation for Hilton delivered +26% retention and $10M annual uplift. Clients: PepsiCo, Hilton, Unilever.",
    dates: "Jun 2021 — Jun 2023",
    tags: ["PySpark", "Azure Databricks", "Teradata", "Presto", "SQL Server", "Power BI"],
    health: "ok",
  },
];

export interface EduRow {
  school: string;
  degree: string;
  detail: string;
  dates: string;
  place: string;
  tags?: string[];
}

export const education: EduRow[] = [
  {
    school: "University of East London",
    degree: "MSc, Data Science — Distinction",
    detail: "GPA 8.5/10. Thesis (Distinction): anomaly detection in stock-market data with deep learning on cloud platforms. Built an LLM response-evaluation framework for hallucination and safety testing. Access and Participation Board member.",
    dates: "Sep 2023 — Sep 2024",
    place: "London, UK",
    tags: ["LLM evaluation", "Deep learning", "Cloud"],
  },
  {
    school: "Vellore Institute of Technology",
    degree: "MCA, Computer Applications — IEEE Published",
    detail: "GPA 9.26/10. IEEE paper: object detection via transfer learning on CIFAR-10, 96% accuracy. Merit Scholarship recipient.",
    dates: "Jul 2019 — Jun 2021",
    place: "Tamil Nadu, India",
    tags: ["Deep learning", "Research"],
  },
  {
    school: "Savitribai Phule Pune University",
    degree: "BSc, Computer Science",
    detail: "Foundations in computer science.",
    dates: "Jun 2016 — Apr 2019",
    place: "Maharashtra, India",
  },
];

export interface SkillGroup {
  key: string;
  label: string;
  items: string[];
}

export const skills: SkillGroup[] = [
  {
    key: "fullstack",
    label: "Full-stack",
    items: ["Node.js", "Express", "Next.js", "MongoDB"],
  },
  {
    key: "ml",
    label: "Data science / ML",
    items: [
      "Python",
      "Demand forecasting",
      "Hallucination evaluation",
      "RAG systems",
    ],
  },
  {
    key: "bi",
    label: "Analytics & BI",
    items: [
      "Looker Studio",
      "Data modelling",
      "Multi-source integration",
    ],
  },
  {
    key: "ops",
    label: "Cloud & ops",
    items: ["Google Workspace admin", "Google Apps Script"],
  },
];

export interface Kpi {
  value: string;
  label: string;
  note: string;
}

export const kpis: Kpi[] = [
  { value: "$200M+", label: "revenue impact", note: "PepsiCo supply-chain forecasting" },
  { value: "25M+", label: "weekly records", note: "distributed data pipelines" },
  { value: "$10M", label: "revenue uplift", note: "+26% retention, Hilton" },
  { value: "13+", label: "products shipped", note: "as sole engineer" },
];

export interface ServiceNode {
  id: string;
  name: string;
  slo: string; // one-line description
  stack: string[];
  health: Health;
  url?: string;
  urlLabel?: string;
}

export const services: ServiceNode[] = [
  {
    id: "api",
    name: "API Platform & Integration Hub",
    slo: "Production REST API platform: OAuth, role-based access, and rate limiting at 5,000 req/sec/IP, integrating Stripe, Magento, and Intercom via webhook workflows with idempotency, retries, and failure handling at live scale.",
    stack: ["Node.js", "Express", "OAuth", "Webhooks", "Docker", "Redis"],
    health: "ok",
  },
  {
    id: "pepsico",
    name: "Enterprise Forecast Pipeline",
    slo: "Event-driven distributed pipeline processing 25M+ weekly records for PepsiCo's global supply chain. Cut processing time 38% (13h → 8h); contributed to systems with $200M+ in enterprise revenue impact.",
    stack: ["PySpark", "Azure Databricks", "Teradata", "SQL Server"],
    health: "ok",
  },
  {
    id: "hilton",
    name: "Customer Retention Analytics",
    slo: "Segmentation and behavioural pattern models over 100+ features for Hilton. Delivered a 26% retention improvement and $10M annual revenue uplift.",
    stack: ["Python", "ML", "Azure", "Power BI"],
    health: "ok",
  },
  {
    id: "bdvfit",
    name: "Certified E-Learning Platform",
    slo: "CPD-accredited Level 7 platform for doctors and dentists: 25+ screens, 20+ API modules, video lessons, quizzes, Stripe payments, auto-generated certificates, and an 18-page admin panel. Built solo in six months.",
    stack: ["React", "TypeScript", "Vite", "Express", "Prisma", "MongoDB", "Stripe"],
    health: "ok",
    url: "https://bdvfit.com",
    urlLabel: "bdvfit.com",
  },
  {
    id: "ecommerce",
    name: "Magento E-Commerce Rebuild",
    slo: "Full Magento platform rebuild supporting 120+ services and high-volume traffic, with Docker environments and CI/CD pipelines for reliable, fast deployments.",
    stack: ["Magento 2", "PHP", "MySQL", "Docker", "CI/CD"],
    health: "ok",
    url: "https://bydrvali.com",
    urlLabel: "bydrvali.com",
  },
  {
    id: "llm-eval",
    name: "LLM Response Evaluation Framework",
    slo: "Automated harness testing hallucination, factual accuracy, consistency, and safety across multiple LLM providers, with a model-drift monitoring dashboard. MSc research, awarded Distinction.",
    stack: ["Python", "LLM APIs", "Monitoring"],
    health: "ok",
  },
];

export interface Product {
  name: string;
  line: string;
  url?: string;
  org: string;
}

/* Full list behind the "view all" popup. Drawn from the CV and work repos. */
export const allProducts: Product[] = [
  { name: "bdvfit.com", line: "CPD-accredited Level 7 e-learning platform for doctors and dentists.", url: "https://bdvfit.com", org: "By Dr Vali" },
  { name: "bydrvali.com", line: "Magento e-commerce store for premium health products. £500k+ revenue since launch.", url: "https://bydrvali.com", org: "By Dr Vali" },
  { name: "bdvportal.com", line: "Clinic management system: 120+ services, treatment protocols, PDF and camera capture.", url: "https://bdvportal.com", org: "By Dr Vali" },
  { name: "bydrvaliportal.com", line: "Jira-style project management platform: real-time updates, approval workflows, calendar, and CEO reporting. Built on the MERN stack.", url: "https://bydrvaliportal.com", org: "By Dr Vali" },
  { name: "BDV Partner Program", line: "Partner referral program with a dashboard, a Typeform-style lead form, and HubSpot integration. Next.js.", org: "By Dr Vali" },
  { name: "Legal AI Assistants", line: "Retrieval-augmented chatbots over internal documents for the legal team.", org: "By Dr Vali" },
  { name: "BDV Claude Marketplace", line: "Internal Claude Code plugin suite: podcast-scripting skills plus scheduled agents that email a weekly trend briefing.", org: "By Dr Vali" },
  { name: "UGC Tool", line: "Next.js application for user-generated content workflows.", org: "By Dr Vali" },
  { name: "Deck Links", line: "Next.js tool for shareable deck and link management.", org: "By Dr Vali" },
  { name: "PepsiCo Demand Forecasting", line: "Store × product, eight-week-ahead model. 51% → 83% accuracy, £200M+ revenue impact.", org: "LatentView" },
  { name: "Warehouse Picker Accuracy", line: "Per-hour and per-day accuracy tracking across US operations. +13% accuracy.", org: "LatentView" },
];

export interface Article {
  id: string;
  title: string;
  publication: string;
  date: string; // display
  iso: string;
  url: string;
  summary: string; // two sentences, his voice
  framework?: string;
}

export const articles: Article[] = [
  {
    id: "unanswerable",
    title:
      "The Unanswerable Test Suite: How to Test AI Systems That Sound Right When They Are Wrong",
    publication: "Software Testing News",
    date: "17 Jul 2026",
    iso: "2026-07-17",
    url: "https://softwaretestingnews.co.uk/the-unanswerable-test-suite/",
    summary:
      "Argues that testing an AI system needs a suite built from questions it should refuse, not just ones it should answer, opening with a consulting firm's AI-generated report caught citing sources that never existed. Proposes tracking refusal rates directly and anchoring factual claims to source documents with deterministic checks, not another model's judgement.",
  },
  {
    id: "cache",
    title:
      "The Quiet Failure Mode of AI Features: When Your Cached Outputs Go Stale",
    publication: "AITechTrend",
    date: "13 Jul 2026",
    iso: "2026-07-13",
    url: "https://aitechtrend.com/ai-cached-outputs/",
    summary:
      "Traces a semantic-search bug to a bulk update that bypassed the save hook, leaving cached embeddings stale with no visible error. Lays out a three-layer defence: mark on change, recompute in the background, and run a reconciliation sweep that catches whatever the first two miss.",
  },
  {
    id: "embedding",
    title: "You Might Not Need a Hosted Embedding API",
    publication: "AITechTrend",
    date: "1 Jul 2026",
    iso: "2026-07-01",
    url: "https://aitechtrend.com/embedding-api/",
    summary:
      "Opens with the 2025 Shai-Hulud npm worm harvesting credentials straight out of build environments, to question why small corpora default to a hosted embedding API. For a few thousand documents, argues for a local model behind an abstracted scoring layer: no per-query cost, a smaller attack surface, and room to graduate to a hosted service if scale ever demands it.",
  },
  {
    id: "jvs",
    title:
      "The JVS Audit: Why Your Cross-Platform Dashboards Are Quietly Lying to You",
    publication: "AITechTrend",
    date: "4 Jun 2026",
    iso: "2026-06-04",
    url: "https://aitechtrend.com/the-jvs-audit-why-your-cross-platform-dashboards-are-quietly-lying-to-you/",
    summary:
      "A tool-agnostic audit for cross-platform dashboards, opening with the 2020 case where nearly 16,000 COVID results were lost to a spreadsheet row limit. JVS is Join, Validate, Standardise: catch silent row multiplication, measure key match rates, and hold one authoritative definition per metric.",
    framework: "JVS Audit",
  },
  {
    id: "frame",
    title: "Design your AI agents around how they fail, not what they can do",
    publication: "Dataconomy",
    date: "1 Jun 2026",
    iso: "2026-06-01",
    url: "https://dataconomy.com/2026/06/01/design-your-ai-agents-around-how-they-fail-not-what-they-can-do/",
    summary:
      "Argues agentic systems should be designed from their failure modes, opening with the Moffatt v. Air Canada chatbot case. Introduces FRAME: failure classification, recovery logic, awareness boundaries, monitoring hooks, and an escalation protocol.",
    framework: "FRAME",
  },
  {
    id: "migration",
    title: "Treat every data migration like it will go wrong",
    publication: "Dataconomy",
    date: "25 May 2026",
    iso: "2026-05-25",
    url: "https://dataconomy.com/2026/05/25/treat-every-data-migration-like-it-will-go-wrong/",
    summary:
      "Makes the case for applying the same rigour to data scripts as to application code, opening with the 2017 GitLab data-loss incident. Advocates dry-run-by-default, idempotent markers, paired verification scripts, and a migration log.",
  },
  {
    id: "time",
    title: "Time is a feature: One decision that removes a whole class of bugs",
    publication: "Dataconomy",
    date: "18 May 2026",
    iso: "2026-05-18",
    url: "https://dataconomy.com/2026/05/18/time-is-a-feature-one-decision-that-removes-a-whole-class-of-bugs/",
    summary:
      "Treats time as a design decision, opening with the 2012 leap-second outage. Store timestamps in UTC, choose one human-facing timezone, declare schedules against a fixed zone, compare against start-of-day, and freeze the clock in tests.",
  },
];

export const authorPage = "https://dataconomy.com/author/sumit-gundawar/";

export interface Podcast {
  id: string;
  show: string;
  title: string;
  when: string;
  url: string;
  summary: string; // 2-3 sentences on why it's worth watching
}

export const podcasts: Podcast[] = [
  {
    id: "talkpython",
    show: "Talk Python To Me",
    title: "Trustworthy AI in Healthcare and Longevity",
    when: "2026",
    url: "https://www.youtube.com/live/pp2v9paEoq4?is=-7SHomqBQn-lqj0F",
    summary:
      "A guest conversation on what it actually takes to earn trust for AI in healthcare and longevity research. Covers where a confident-sounding model still needs a deterministic check behind it, and how that changes what you test before shipping.",
  },
  {
    id: "testassociates",
    show: "Test Associates Podcast",
    title: "Building Safe, Testable AI in Healthcare & Longevity",
    when: "2026",
    url: "https://youtu.be/bfHSMCYQNp4?is=l7aSCyJS-hzjlSmy",
    summary:
      "A follow-on conversation for a testing-focused audience, covering the same healthcare AI territory from the QA side: what 'safe' has to mean before a testable claim about a system can be made at all.",
  },
];

export interface Incident {
  id: string;
  year: string;
  title: string;
  cause: string;
  blastRadius: string;
  lesson: string;
  articleId: string;
}

export const incidents: Incident[] = [
  {
    id: "phe",
    year: "2020",
    title: "Public Health England",
    cause:
      "Test results were collated in an old spreadsheet format capped at 65,536 rows. Anything past the limit was silently dropped.",
    blastRadius:
      "Close to 16,000 COVID cases went unreported for days, so contacts were never traced during a pandemic.",
    lesson:
      "A row limit is a silent failure mode. Validate that what went in is what came out.",
    articleId: "jvs",
  },
  {
    id: "gitlab",
    year: "2017",
    title: "GitLab database deletion",
    cause:
      "An engineer ran a removal command against the wrong host during an incident. Five of five backup and replication methods were then found to be broken or untested.",
    blastRadius:
      "Roughly 300 GB of production data gone, six hours of project data unrecoverable.",
    lesson:
      "A backup you have never restored is not a backup. Treat every destructive script as if it will go wrong.",
    articleId: "migration",
  },
  {
    id: "aircanada",
    year: "2024",
    title: "Moffatt v. Air Canada",
    cause:
      "A support chatbot invented a bereavement-fare policy that did not exist. The airline argued it was not responsible for its own bot.",
    blastRadius:
      "A tribunal held the airline liable for what its agent said. The bot's confident wrong answer became a binding promise.",
    lesson:
      "An agent with no awareness of what it does not know will fail confidently. Design around the failure, not the demo.",
    articleId: "frame",
  },
  {
    id: "leapsecond",
    year: "2012",
    title: "The leap-second outage",
    cause:
      "An extra second was inserted into UTC. Kernel timekeeping hit a code path that spun CPUs to 100% across the internet at once.",
    blastRadius:
      "Reddit, Mozilla, Yelp, and airline reservation systems stalled simultaneously, all from one second.",
    lesson:
      "Time is not a given, it is a design decision. Make it explicit before it makes itself explicit.",
    articleId: "time",
  },
];

export interface Framework {
  abbr: string;
  expansion: string;
  domain: string;
  layers?: string[];
}

export const frameworks: Framework[] = [
  {
    abbr: "FRAME",
    expansion: "Failure-Recovery Architecture for Multi-step Execution",
    domain: "AI agents",
    layers: [
      "Failure classification",
      "Recovery logic",
      "Awareness boundaries",
      "Monitoring hooks",
      "Escalation protocol",
    ],
  },
  {
    abbr: "JVS Audit",
    expansion: "Join, Validate, Standardise",
    domain: "Cross-platform dashboards",
    layers: ["Join: cardinality checks", "Validate: key match rate", "Standardise: one definition per metric"],
  },
  {
    abbr: "FRC Pipeline",
    expansion: "Feature, Retrain, Consume",
    domain: "Production ML",
  },
];

export interface Recognition {
  role: string;
  org: string;
  when: string;
  url: string;
  extraUrl?: string;
  extraLabel?: string;
}

export const recognition: Recognition[] = [
  {
    role: "Judge",
    org: "The AI Awards",
    when: "2026",
    url: "https://theaiawards.co.uk/",
    extraUrl: "https://theaiawards.co.uk/awards-photos-2026/",
    extraLabel: "photos",
  },
];

export interface Talk {
  venue: string;
  title: string;
  when: string;
  url?: string;
  placeholder?: boolean;
}

export const speaking: Talk[] = [
  {
    venue: "JAX London 2026",
    title: "Designing APIs and Integrations That Don't Fall Apart at Scale",
    when: "2026",
    url: "https://jaxlondon.com/speaker/sumit-gundawar/",
  },
];

/* System graph nodes for the Overview. */
export const graphNodes = [
  { id: "platforms", label: "Full-stack platforms" },
  { id: "ai", label: "AI systems" },
  { id: "pipelines", label: "Data pipelines" },
  { id: "analytics", label: "Analytics / BI" },
  { id: "writing", label: "Writing" },
] as const;

/* ---------- learn engineering ---------- */
