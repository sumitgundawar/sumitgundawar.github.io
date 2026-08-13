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

export interface LearnCheck {
  prompt: string;
  options: string[];
  correctIndex: number;
  explain: string;
}

export interface LearnConcept {
  id: string;
  title: string;
  body: string[];
  check: LearnCheck;
}

export interface LearnCategory {
  id: string;
  title: string;
  summary: string;
  concepts: LearnConcept[];
}

export const learnCategories: LearnCategory[] = [
  {
    id: "software-testing",
    title: "Software Testing",
    summary: "What a suite should actually catch, and where the standard checklist falls short.",
    concepts: [
      {
        id: "unanswerable-suites",
        title: "Unanswerable Test Suites",
        body: [
          "Most test suites only check whether the system got the right answer. An unanswerable suite checks the opposite: does it correctly refuse to answer when it doesn't have enough to go on?",
          "This matters most for AI systems, which will produce a fluent, confident answer to a question they have no basis for. A normal accuracy check never catches that, because there's no 'expected output' to compare against.",
          "Track the refusal rate directly, and anchor any factual claim to a real source document with a deterministic check, not another model's judgement.",
        ],
        check: {
          prompt: "Why doesn't a normal accuracy test catch an AI system that confidently answers a question it shouldn't?",
          options: [
            "Because accuracy tests only run in production, not staging",
            "Because there's no expected output to compare a wrong-but-fluent answer against",
            "Because AI systems don't support automated testing",
            "Because refusal rates are always 0% by design",
          ],
          correctIndex: 1,
          explain: "A confidently wrong answer to a question with no correct answer at all has nothing to compare against — you need a suite built to test refusal, not just correctness.",
        },
      },
      {
        id: "test-pyramid",
        title: "The Test Pyramid",
        body: [
          "Unit tests at the base: fast, cheap, narrow, and there should be a lot of them. Integration tests in the middle, checking components actually work together. End-to-end tests at the top: slow, expensive, brittle, and there should be very few.",
          "Invert it — heavy on end-to-end, light on unit — and you get a suite that's slow to run and painful to debug, because a single failure could be anywhere in the stack.",
          "The shape is a budget, not a rulebook: push verification down to the cheapest layer that can actually catch the bug.",
        ],
        check: {
          prompt: "What typically goes wrong when a suite inverts the pyramid — mostly end-to-end tests, very few unit tests?",
          options: [
            "Nothing, coverage is coverage",
            "The suite runs faster but is less accurate",
            "The suite becomes slow and failures are hard to localise",
            "Unit tests become unnecessary",
          ],
          correctIndex: 2,
          explain: "Without a strong base of fast, narrow unit tests, every failure turns into a slow investigation, because end-to-end failures could originate anywhere in the stack.",
        },
      },
    ],
  },
  {
    id: "system-design",
    title: "System Design",
    summary: "The decisions that hold up a system under load, explained with the trade-off attached.",
    concepts: [
      {
        id: "caching-ttl",
        title: "Caching: TTL, Expiry & Invalidation",
        body: [
          "A cache trades correctness for speed: you serve a stored copy of an answer instead of recomputing it. The whole discipline is deciding when that stored copy is too old to trust.",
          "TTL (time-to-live) sets a fixed lifespan on an entry — after N seconds it expires automatically, no matter what. Expiry is the general mechanism; TTL is the simplest policy for driving it.",
          "Invalidation is more precise: you actively remove or refresh an entry the moment its source data changes, instead of waiting for a timer. Harder to build correctly, but it avoids serving stale data for the full TTL window.",
          "Large-scale systems commonly layer something like Redis in front of a slower origin store for hot, frequently-read data: short TTLs for volatile data, explicit invalidation on write for anything where staleness would be visibly wrong.",
        ],
        check: {
          prompt: "You cache a user's account balance. A payment just changed it. Which is the safer policy?",
          options: [
            "TTL-only — simpler is always better",
            "Invalidation-on-write — the balance must be correct immediately, not eventually",
            "Neither — never cache anything financial",
            "Both are identical in practice",
          ],
          correctIndex: 1,
          explain: "TTL alone means the balance can be visibly wrong for the length of the TTL window after a write. Invalidate on write when correctness after a write matters; reserve TTL-only for data where brief staleness is acceptable.",
        },
      },
      {
        id: "load-balancing",
        title: "Load Balancing",
        body: [
          "A load balancer sits in front of multiple servers and spreads incoming requests across them, so no single instance is overwhelmed and one dying machine doesn't take the whole service down.",
          "Round-robin rotates requests through servers in order. Least-connections sends new requests to whichever server is doing the least work — better under uneven request costs.",
          "Health checks are what make it safe: the balancer stops routing to an instance the moment it fails to respond, and resumes once it recovers.",
        ],
        check: {
          prompt: "Why is a health check a required part of a load balancer, not an optional extra?",
          options: [
            "It isn't required, it just looks good in a diagram",
            "Without it, the balancer keeps sending traffic to a server that's already down",
            "It's only needed once you have more than 10 servers",
            "Health checks replace the need for multiple servers",
          ],
          correctIndex: 1,
          explain: "Without health checks, the balancer has no way to know an instance has failed, so it keeps routing requests to it — turning one dead server into failed requests for every user routed there.",
        },
      },
    ],
  },
  {
    id: "interview-prep",
    title: "Interview Preparation",
    summary: "The structures that make an answer land, for behavioural and technical rounds alike.",
    concepts: [
      {
        id: "star-method",
        title: "The STAR Method",
        body: [
          "Behavioural answers fall apart when they're vague. STAR forces specificity: Situation, Task, Action, Result.",
          "Situation and Task set the scene in a sentence or two. Action is the part interviewers actually care about — what you specifically did, not what the team did. Result closes with a measurable outcome wherever you have one.",
          "The most common failure isn't a bad story, it's skipping straight to Result without ever establishing what your own contribution was.",
        ],
        check: {
          prompt: "In the STAR method, which letter is most often shortchanged, and what's the failure mode?",
          options: [
            "Situation — candidates over-explain the background",
            "Action — candidates describe what the team did instead of what they personally did",
            "Result — candidates never mention an outcome",
            "Task — candidates skip it entirely and it's unimportant",
          ],
          correctIndex: 1,
          explain: "Interviewers are assessing you, not your team. An answer heavy on 'we' and light on what you specifically did fails to show individual contribution, which is what Action is meant to establish.",
        },
      },
      {
        id: "big-o",
        title: "Big-O, Fast",
        body: [
          "Big-O describes how an algorithm's cost grows as input size grows — not the exact runtime, the shape of the curve.",
          "O(1) constant, O(log n) logarithmic (binary search), O(n) linear (a single pass), O(n log n) (good sorting), O(n²) quadratic (nested loops over the same data), O(2^n) exponential (brute-force subsets).",
          "In an interview, naming the complexity isn't the point — explaining why a nested loop over the same array is O(n²), and what data structure brings it down to O(n), is.",
        ],
        check: {
          prompt: "A nested loop checks every pair in an array of size n for a match. What's the complexity, and the usual fix?",
          options: [
            "O(n), fix: nothing, it's already optimal",
            "O(n²), fix: use a hash set to check membership in O(1) per element",
            "O(log n), fix: sort the array first",
            "O(1), nested loops don't affect complexity",
          ],
          correctIndex: 1,
          explain: "Checking every pair is O(n²). Trading space for time with a hash set turns membership checks into O(1), bringing the whole pass down to O(n).",
        },
      },
    ],
  },
  {
    id: "engineering-models",
    title: "Engineering Models",
    summary: "How teams actually structure the work between a client's requirements and a shipped result.",
    concepts: [
      {
        id: "waterfall",
        title: "The Waterfall Model",
        body: [
          "Waterfall runs in a strict sequence: gather requirements from the client, plan the work, build it, then deliver it back for review — each stage finishing before the next starts.",
          "The client reviews the delivered version and gives feedback: new requirements, a changed feature, something they don't like. That feedback becomes the next version, which runs through the same sequence again — plan, build, deliver, review.",
          "It's one of the oldest and still most common models because it's easy to plan and easy to report on. Its weakness is the same as its strength: change is expensive once a stage is finished, because you don't discover you built the wrong thing until the review at the end of the cycle.",
        ],
        check: {
          prompt: "What is the main weakness of the Waterfall model?",
          options: [
            "It has no place for client feedback at all",
            "Change is expensive because problems surface only at the end of a stage",
            "It cannot be used for software projects",
            "It requires more engineers than other models",
          ],
          correctIndex: 1,
          explain: "Because each stage completes before the next begins, a misunderstood requirement isn't caught until the client reviews the finished version — by which point the wrong thing has already been fully built.",
        },
      },
      {
        id: "agile-scrum",
        title: "Agile & Scrum",
        body: [
          "Where Waterfall delivers once at the end of a long cycle, Agile delivers in short, repeated cycles, so feedback arrives every few weeks instead of once at the end.",
          "Scrum is the most common way to run Agile: work is broken into a backlog, pulled into fixed-length sprints (commonly two weeks), and reviewed with the client at the end of each one.",
          "The trade-off is the opposite of Waterfall's: less upfront predictability on scope and date, in exchange for catching a wrong assumption within weeks instead of months.",
        ],
        check: {
          prompt: "What does Agile trade away, compared to Waterfall, in exchange for catching mistakes earlier?",
          options: [
            "Nothing, Agile has no downside",
            "Upfront predictability on total scope and delivery date",
            "The ability to get client feedback at all",
            "Code quality",
          ],
          correctIndex: 1,
          explain: "Short cycles catch a wrong assumption within weeks, but because scope evolves sprint to sprint, you give up the fixed, plan-it-all-upfront predictability Waterfall offers.",
        },
      },
    ],
  },
  {
    id: "aws",
    title: "AWS",
    summary: "Amazon's platform, picked apart into the decisions that actually change your bill.",
    concepts: [
      {
        id: "ec2-vs-lambda",
        title: "EC2 vs Lambda",
        body: [
          "EC2 gives you a virtual machine that runs continuously: you pay for it whether it's handling one request or none, and you manage the OS, scaling, and patching yourself.",
          "Lambda runs your code only when triggered, scales automatically per request, and you pay per invocation and duration — nothing when idle.",
          "Steady, predictable, always-on traffic often costs less on EC2 or containers; spiky or low-volume traffic is usually cheaper and simpler on Lambda. Ten thousand visits a month rarely justifies a fleet of always-on instances.",
        ],
        check: {
          prompt: "A site expects roughly 10,000 visitors a month, mostly evenly spread. Which is the more defensible starting point?",
          options: [
            "A large EC2 fleet sized for millions of daily users",
            "A serverless option like Lambda, or a small always-on instance — matched to actual load",
            "Always start with the biggest instance available, scale down later",
            "AWS cannot serve fewer than 1 million users economically",
          ],
          correctIndex: 1,
          explain: "10,000 visitors a month is low, steady traffic. Provisioning for billions of users when you have thousands is over-engineering — it costs more and adds operational surface for no benefit.",
        },
      },
      {
        id: "s3-storage-classes",
        title: "S3 Storage Classes",
        body: [
          "S3 Standard is for data you read often: highest cost per GB, no retrieval fee, instant access.",
          "Infrequent Access and Glacier trade instant access for much lower storage cost, in exchange for either a retrieval fee (IA) or a retrieval delay measured in minutes to hours (Glacier).",
          "Lifecycle rules automate the move: an object written today can transition to IA after 30 days and Glacier after 90, without anyone touching it by hand.",
        ],
        check: {
          prompt: "You store logs read constantly for the first week, then almost never again. What's the sensible approach?",
          options: [
            "Keep everything in S3 Standard forever",
            "Delete the logs after a week",
            "Start in S3 Standard, use a lifecycle rule to transition to IA or Glacier after the active window",
            "Store logs outside S3 entirely",
          ],
          correctIndex: 2,
          explain: "A lifecycle rule automates exactly this pattern: pay for fast access while the data is hot, then let it age into cheaper storage once access drops off, with no manual intervention.",
        },
      },
    ],
  },
  {
    id: "gcp",
    title: "Google Cloud Platform",
    summary: "GCP's compute and data tools, and the point at which each one earns its cost.",
    concepts: [
      {
        id: "compute-vs-cloudrun",
        title: "Compute Engine vs Cloud Run",
        body: [
          "Compute Engine is GCP's equivalent of EC2: a virtual machine you provision, patch, and pay for continuously.",
          "Cloud Run runs a container on demand, scales to zero when there's no traffic, and charges only while a request is being handled.",
          "Cloud Run is usually the better starting point for a new service with unknown or modest traffic; Compute Engine earns its keep once workloads are steady enough that always-on capacity is actually cheaper than per-request billing.",
        ],
        check: {
          prompt: "What does 'scales to zero' mean for Cloud Run, and why does it matter for a low-traffic app?",
          options: [
            "It means the app crashes when traffic drops",
            "It means no containers run, and nothing is billed, when there's no traffic",
            "It means the app can only serve zero users",
            "It's a marketing term with no operational effect",
          ],
          correctIndex: 1,
          explain: "Scaling to zero means idle time costs nothing — for an app with low or spiky traffic, that avoids paying for capacity that sits unused most of the time.",
        },
      },
      {
        id: "bigquery-basics",
        title: "BigQuery Basics",
        body: [
          "BigQuery is a serverless data warehouse: load data in and query it with SQL, without provisioning or managing a cluster.",
          "It bills primarily on bytes scanned per query, not on infrastructure kept running — a query that scans a full table costs more than one narrowed by partitioning and clustering.",
          "Partitioning a table by date and clustering by a commonly-filtered column are the two highest-leverage changes for cutting both query cost and latency.",
        ],
        check: {
          prompt: "Why does partitioning a BigQuery table by date usually reduce cost?",
          options: [
            "It compresses the data further",
            "Queries filtered to a date range only scan the matching partitions, not the whole table",
            "Partitioning is only about query speed, not cost",
            "It removes the need for SQL",
          ],
          correctIndex: 1,
          explain: "BigQuery bills by bytes scanned. A date-filtered query against a date-partitioned table only reads the relevant partitions instead of the entire table, directly cutting the bytes scanned and the bill.",
        },
      },
    ],
  },
  {
    id: "azure",
    title: "Microsoft Azure",
    summary: "The managed-vs-control trade-off, worked through Azure's compute and storage options.",
    concepts: [
      {
        id: "app-service-vs-aks",
        title: "Azure App Service vs AKS",
        body: [
          "App Service is a managed platform for running a web app or API: push code or a container, Azure handles the OS, scaling, and patching.",
          "AKS (Azure Kubernetes Service) gives you a full Kubernetes cluster: far more control over networking, scheduling, and multi-service orchestration, at the cost of real operational complexity.",
          "App Service is the right default for a single service or a small number of services. AKS earns its complexity once you're running many interdependent services that genuinely need Kubernetes-level orchestration.",
        ],
        check: {
          prompt: "A team is shipping one API with modest traffic. What's the case against reaching straight for AKS?",
          options: [
            "AKS is always the wrong choice for every project",
            "AKS adds cluster operations overhead a single-service App Service deployment doesn't need",
            "AKS cannot run APIs",
            "App Service is deprecated",
          ],
          correctIndex: 1,
          explain: "Kubernetes brings real operational weight: cluster upgrades, networking, scheduling. For one service with modest traffic, App Service delivers the same outcome without that overhead.",
        },
      },
      {
        id: "blob-storage-tiers",
        title: "Azure Blob Storage Tiers",
        body: [
          "Hot tier: highest storage cost, lowest access cost — for data read or written frequently.",
          "Cool and Cold tiers: cheaper storage, an access fee per read, and a minimum retention period — for data accessed occasionally.",
          "Archive tier: the cheapest storage by far, but retrieval takes hours and also carries a minimum retention period — for data you must keep but rarely, if ever, need to touch.",
        ],
        check: {
          prompt: "What's the trade-off Azure Blob Storage tiers are built around?",
          options: [
            "There is no trade-off, Archive is strictly better than Hot",
            "Lower storage cost in exchange for higher access cost and/or slower retrieval",
            "Tiers only affect geographic replication, not cost",
            "Hot tier is cheapest for all use cases",
          ],
          correctIndex: 1,
          explain: "Each cheaper tier trades faster, low-friction access for lower storage cost — down to Archive, where storage is cheapest but a retrieval can take hours.",
        },
      },
    ],
  },
];

/* ---------- build a system ---------- */

export interface BuildOption {
  value: string;
  label: string;
}

export interface BuildQuestion {
  id: string;
  prompt: string;
  options: BuildOption[];
}

export const buildQuestions: BuildQuestion[] = [
  {
    id: "platform",
    prompt: "What are you building?",
    options: [
      { value: "ecommerce", label: "E-commerce" },
      { value: "elearning", label: "E-learning" },
      { value: "content", label: "Content / blog" },
      { value: "internal", label: "Internal tool" },
      { value: "api", label: "API / backend service" },
    ],
  },
  {
    id: "traffic",
    prompt: "Expected visitors per month?",
    options: [
      { value: "t1", label: "Under 1,000" },
      { value: "t2", label: "1,000 – 10,000" },
      { value: "t3", label: "10,000 – 100,000" },
      { value: "t4", label: "100,000 – 1,000,000" },
      { value: "t5", label: "1,000,000+" },
    ],
  },
  {
    id: "budget",
    prompt: "What matters more?",
    options: [
      { value: "cost", label: "Minimise cost — free or cheap tiers" },
      { value: "convenience", label: "Minimise ops — pay for managed convenience" },
    ],
  },
  {
    id: "ops",
    prompt: "How much infrastructure do you want to manage?",
    options: [
      { value: "managed", label: "As little as possible — fully managed" },
      { value: "control", label: "I'm comfortable managing infrastructure directly" },
    ],
  },
];

export interface BuildAnswers {
  platform?: string;
  traffic?: string;
  budget?: string;
  ops?: string;
}

/** One node in the request-flow diagram: what it is, and why that choice. */
export interface BuildComponent {
  short: string;
  value: string;
  why: string;
}

export interface BuildRecommendation {
  tier: string;
  tierNote: string;
  domain: BuildComponent;
  edge: BuildComponent;
  compute: BuildComponent;
  data: BuildComponent;
  principle: string;
}

const domain: BuildComponent = {
  short: "Any registrar",
  value:
    "Buy the domain wherever is convenient — a registrar like Squarespace, Namecheap, or Cloudflare Registrar.",
  why: "DNS is the only coupling between registrar and host. Point it at whichever edge network or platform sits in front of your actual compute, and which company sold you the name stops mattering.",
};

export function buildRecommendation(answers: BuildAnswers): BuildRecommendation {
  const { traffic = "t2", budget = "cost", ops = "managed" } = answers;
  const managed = ops === "managed";
  const costFirst = budget === "cost";

  let tier: string;
  let tierNote: string;
  let compute: BuildComponent;
  let data: BuildComponent;
  let edge: BuildComponent;

  if (traffic === "t1" || traffic === "t2") {
    tier = "Static / serverless";
    tierNote =
      "At this volume, a dedicated server or Kubernetes cluster is idle almost all the time. It costs more than serverless and adds operational surface for no benefit.";
    compute = costFirst
      ? {
          short: "Static + functions",
          value:
            "Static hosting on a CDN-backed free tier (e.g. Cloudflare Pages, GitHub Pages) with serverless functions for anything dynamic.",
          why: "You pay per request, not per idle hour — at this volume a free tier isn't a trial, it's the correct long-term fit.",
        }
      : {
          short: "Managed serverless",
          value: "A managed serverless platform (e.g. Vercel, Render, AWS App Runner) for both the frontend and any API routes.",
          why: "One platform for frontend and API means one deploy pipeline and one place to read logs — worth the extra cost at this size for the ops time it removes.",
        };
    data = {
      short: "None, or free tier",
      value: "A managed free-tier database if you need one at all — many sites this size get away with none.",
      why: "Provisioning a database before you have a reason to write to it is speculative cost, and one more thing to patch.",
    };
    edge = {
      short: "CDN only",
      value: "Route through Cloudflare (or the CDN bundled with your host). No load balancer, no autoscaling group.",
      why: "The CDN already does the job a load balancer would do at this volume, and it's free.",
    };
  } else if (traffic === "t3") {
    tier = "Small managed";
    tierNote =
      "This is past 'no backend needed' but well short of needing autoscaling or a cache layer. One well-chosen managed service covers it.";
    compute = managed
      ? {
          short: "Managed PaaS",
          value:
            "A managed PaaS container platform (e.g. Cloud Run, AWS App Runner, Azure App Service). Scales with traffic, no server to patch.",
          why: "Traffic here is uneven enough to want autoscaling, but not enough to justify owning the scaling policy yourself.",
        }
      : {
          short: "Sized instance",
          value: "A single right-sized compute instance or a small container group behind a load balancer.",
          why: "Direct control over the instance pays off once you know the workload well enough to size it instead of guessing.",
        };
    data = {
      short: "Managed DB + backups",
      value: "A managed database with automated backups. No read replica needed yet.",
      why: "One primary handles this read/write volume without contention — a replica here would sit idle.",
    };
    edge = {
      short: "CDN + direct",
      value: "CDN in front for static assets; direct to your host for dynamic requests.",
      why: "Static assets are the cheap win to offload; dynamic requests still need your app server's logic, so they bypass the CDN.",
    };
  } else if (traffic === "t4") {
    tier = "Scaling";
    tierNote = "At this volume a single instance is a single point of failure, and repeated reads of the same data are worth caching.";
    compute = {
      short: "Autoscaling, redundant",
      value: "An autoscaling compute group or container service behind a load balancer, with at least two instances for redundancy.",
      why: "The second instance isn't for load — it's so one bad deploy or crash doesn't take the whole site down.",
    };
    data = {
      short: "Replica + cache",
      value: "A managed database with a read replica, plus a cache layer (e.g. Redis) in front of the hottest reads.",
      why: "The same rows get read often enough at this volume that caching them is cheaper than scaling the database to serve them directly.",
    };
    edge = {
      short: "CDN absorbs spikes",
      value: "CDN/edge network in front for static assets and to absorb traffic spikes before they reach your origin.",
      why: "A spike that never reaches your origin is one your compute layer never has to autoscale for.",
    };
  } else {
    tier = "Scale";
    tierNote = "Only at this scale does the added complexity of multi-region and orchestration tooling start paying for itself.";
    compute = {
      short: "Multi-AZ + queue",
      value: "Multi-AZ autoscaling compute or containers behind a load balancer, with a queue for anything that can run asynchronously.",
      why: "Work that doesn't need to block the response — email, exports, webhooks — moves off the request path so one slow downstream call can't stall the site.",
    };
    data = {
      short: "Replicas + mandatory cache",
      value: "A managed database with read replicas and a mandatory cache layer for hot reads.",
      why: "At this volume the database is the first thing to fall over under load — the cache and replicas are load-bearing, not optional insurance.",
    };
    edge = {
      short: "Edge required",
      value: "CDN/edge required, not optional, with the origin sized to handle edge cache misses only.",
      why: "Sizing the origin for full traffic instead of cache-miss traffic means paying for capacity the edge was supposed to absorb.",
    };
  }

  const principle = costFirst
    ? "Cost-first: stay on a single cloud where practical. Cross-vendor traffic (e.g. one cloud's compute reading another's storage) usually adds egress fees that outweigh any per-service savings."
    : "Convenience-first: a managed platform costs more per unit of compute, but removes patching, scaling, and on-call for infrastructure you'd otherwise own.";

  return { tier, tierNote, domain, edge, compute, data, principle };
}
