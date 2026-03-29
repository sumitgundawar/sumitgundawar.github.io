export type ProjectCategory =
  | "Product"
  | "Data & ML"
  | "AI"
  | "Research";

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ImpactMetric {
  label: string;
  value: string;
}

export interface ProjectCaseStudy {
  slug: string;
  title: string;
  category: ProjectCategory;
  timeframe: string;
  context: string;
  role?: string;
  summary: string;
  tags: string[];
  highlights: string[];
  whatIBuilt: string[];
  impact: string[];
  impactMetrics?: ImpactMetric[];
  links: ProjectLink[];
  image: string;
  featured?: boolean;
  confidentialityNote?: string;
}

export const projectCategories: Array<{ label: string; value: ProjectCategory | "All" }> = [
  { label: "All", value: "All" },
  { label: "Product", value: "Product" },
  { label: "Data & ML", value: "Data & ML" },
  { label: "AI", value: "AI" },
  { label: "Research", value: "Research" },
];

export const projects: ProjectCaseStudy[] = [
  {
    slug: "bdvfit-learning-platform",
    title: "bdvfit.com - Online Learning Platform",
    category: "Product",
    timeframe: "2025",
    context: "By Dr Vali",
    role: "Sole Engineer",
    summary:
      "Full-stack online learning platform for doctors and dentists to gain CPD-accredited Level 7 certification. Built solo from scratch in 6 months.",
    tags: ["React", "Node.js", "TypeScript", "MongoDB", "Stripe"],
    highlights: [
      "25+ screens and 20+ API modules",
      "Video lessons, quizzes, and written assignments",
      "Stripe payments and automated certificate generation",
      "18-page admin panel for content and user management",
    ],
    whatIBuilt: [
      "Complete frontend with responsive UI and video player",
      "Backend API with authentication, authorization, and role management",
      "Stripe integration for course purchases and subscription handling",
      "Automated certificate generation and delivery on course completion",
      "Admin panel for managing courses, users, content, and analytics",
    ],
    impact: [
      "Fully operational platform serving medical professionals",
      "Solo delivery - designed, built, deployed, and maintained by one engineer",
    ],
    impactMetrics: [
      { label: "Screens", value: "25+" },
      { label: "API modules", value: "20+" },
      { label: "Build time", value: "6 months" },
    ],
    links: [{ label: "Visit bdvfit.com", href: "https://bdvfit.com" }],
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    featured: true,
  },
  {
    slug: "bydrvali-ecommerce",
    title: "bydrvali.com - E-commerce Store",
    category: "Product",
    timeframe: "2025 - Present",
    context: "By Dr Vali",
    role: "Sole Engineer",
    summary:
      "E-commerce store for 5 skin care products that has generated over £500k in revenue since July 2025.",
    tags: ["Shopify", "Stripe", "Integrations", "Payments"],
    highlights: [
      "Over 500k in revenue since launch",
      "5 skin care products",
      "End-to-end payment and fulfillment flow",
    ],
    whatIBuilt: [
      "Product catalog and checkout experience",
      "Payment processing via Stripe",
      "Order management and fulfillment integration",
    ],
    impact: [
      "Over 500k in revenue generated since July 2025",
    ],
    impactMetrics: [
      { label: "Revenue", value: "£500k+" },
      { label: "Products", value: "5" },
    ],
    links: [{ label: "Visit bydrvali.com", href: "https://bydrvali.com" }],
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    featured: true,
  },
  {
    slug: "pepsico-demand-forecasting",
    title: "PepsiCo Demand Forecasting",
    category: "Data & ML",
    timeframe: "2021 - 2023",
    context: "LatentView Analytics",
    role: "Data Analyst",
    summary:
      "Custom demand forecasting model at the most granular level - store by product, 8 weeks ahead. Improved forecast accuracy from 51% to 83%, used directly by PepsiCo's Supply Chain Director.",
    tags: ["SAS", "Azure Databricks", "Teradata", "Presto", "PowerBI"],
    highlights: [
      "Store-and-product level 8-week forecast model",
      "Improved accuracy from 51% to 83% with bias of +/-6%",
      "Used directly by the Supply Chain Director",
      "Contributed to over £200M in annual revenue impact",
    ],
    whatIBuilt: [
      "Multi-stage forecasting pipeline with data ingestion, validation, and transformation",
      "Trigger-based orchestration running forecasting on data arrival",
      "Operational dashboards for forecast monitoring and stakeholder reporting",
      "Data quality checks and failure handling across distributed compute",
    ],
    impact: [
      "Contributed to over £200M in annual revenue impact",
      "32 percentage point accuracy improvement (51% to 83%)",
    ],
    impactMetrics: [
      { label: "Revenue impact", value: "£200M+" },
      { label: "Accuracy", value: "51% to 83%" },
      { label: "Bias", value: "+/-6%" },
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    featured: true,
    confidentialityNote: "Details shared at a system level to respect client confidentiality.",
  },
  {
    slug: "bdvportal-clinic-management",
    title: "bdvportal.com - Clinic Management System",
    category: "Product",
    timeframe: "2025 - Present",
    context: "By Dr Vali",
    role: "Sole Engineer",
    summary:
      "Clinic management system handling personalised treatment protocols across 120+ services for a high-profile client base including celebrities.",
    tags: ["React", "Node.js", "MongoDB", "REST APIs", "RBAC"],
    highlights: [
      "120+ services with personalised protocols",
      "High-profile client base including celebrities",
      "Secure data models and authorization layers",
    ],
    whatIBuilt: [
      "Clinician workflows for patient records and treatment management",
      "Automated protocol generation for aftercare guidance",
      "Role-based access control and audit-friendly data patterns",
    ],
    impact: [
      "Centralised operations and reduced manual protocol creation",
    ],
    impactMetrics: [
      { label: "Services", value: "120+" },
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
    featured: true,
    confidentialityNote: "Patient data and internal details are not shared publicly.",
  },
  {
    slug: "bydrvaliportal-project-tracker",
    title: "bydrvaliportal.com - Internal Project Tracker",
    category: "Product",
    timeframe: "2025 - Present",
    context: "By Dr Vali",
    role: "Sole Engineer",
    summary:
      "Internal project tracker with team management, automated approval workflows, and real-time reporting for the CEO.",
    tags: ["React", "Node.js", "MongoDB", "Workflows"],
    highlights: [
      "Team management and task tracking",
      "Automated approval workflows",
      "Real-time reporting dashboard",
    ],
    whatIBuilt: [
      "Project tracking interface with status management",
      "Automated approval and notification workflows",
      "Executive reporting dashboard",
    ],
    impact: [
      "Streamlined internal project coordination and reporting",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
  },
  {
    slug: "ai-chatbots-legal",
    title: "AI Chatbots for Legal Team",
    category: "AI",
    timeframe: "2025",
    context: "By Dr Vali",
    role: "Sole Engineer",
    summary:
      "AI chatbots for the legal team using document indexing and retrieval to answer queries accurately and fast.",
    tags: ["RAG", "LLM", "Document Indexing", "Node.js"],
    highlights: [
      "Document indexing and retrieval pipeline",
      "Accurate query answering from legal documents",
      "Built for speed and reliability",
    ],
    whatIBuilt: [
      "Document ingestion and indexing pipeline",
      "RAG-based query system for legal document search",
      "Conversational interface for the legal team",
    ],
    impact: [
      "Reduced time spent on manual document search",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
  },
  {
    slug: "warehouse-picker-accuracy",
    title: "Warehouse Picker Accuracy System",
    category: "Data & ML",
    timeframe: "2022 - 2023",
    context: "LatentView Analytics",
    role: "Data Analyst",
    summary:
      "Real-time per-hour and per-day accuracy tracking for warehouse staff across US operations.",
    tags: ["Python", "Azure", "PowerBI"],
    highlights: [
      "13% accuracy improvement",
      "60k average revenue increase per warehouse",
      "Per-hour and per-day performance tracking",
    ],
    whatIBuilt: [
      "Real-time performance tracking system",
      "Analytics dashboards for warehouse operations",
      "Automated reporting for management",
    ],
    impact: [
      "13% accuracy improvement across US operations",
      "60k average revenue increase per warehouse",
    ],
    impactMetrics: [
      { label: "Accuracy gain", value: "13%" },
      { label: "Revenue per warehouse", value: "£60k" },
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80",
    confidentialityNote: "Client identifiers and internal metrics are omitted.",
  },
  {
    slug: "hilton-customer-analytics",
    title: "Customer Data Architecture - Hilton",
    category: "Data & ML",
    timeframe: "2022 - 2023",
    context: "LatentView Analytics",
    role: "Data Analyst",
    summary:
      "Analytics pipelines across 100+ behavioral features, delivering segmentation and pattern models to improve retention.",
    tags: ["Analytics", "ML", "Segmentation", "Pipelines"],
    highlights: [
      "100+ behavioral features analysed",
      "26% retention improvement",
      "10M annual revenue uplift",
    ],
    whatIBuilt: [
      "Feature pipelines and dataset preparation for analysis",
      "Segmentation and pattern analysis models",
      "Stakeholder-friendly dashboards",
    ],
    impact: [
      "Improved customer retention by 26%",
      "Enabled approximately 10M annual revenue uplift",
    ],
    impactMetrics: [
      { label: "Retention", value: "+26%" },
      { label: "Revenue uplift", value: "£10M" },
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
    confidentialityNote: "Specific datasets and customer identifiers are not included.",
  },
  {
    slug: "llm-response-validator",
    title: "LLM Response Validator",
    category: "AI",
    timeframe: "2024",
    context: "University of East London",
    summary:
      "Evaluation framework to assess LLM responses for accuracy, consistency, and safety, with an automated test pipeline across multiple providers.",
    tags: ["Python", "LLMs", "Evaluation", "Streamlit"],
    highlights: [
      "Evaluation across accuracy, consistency, and harmful content",
      "Automated test pipeline for multiple LLM providers",
      "Dashboard for tracking response quality and model drift",
    ],
    whatIBuilt: [
      "Scoring metrics and benchmark harness",
      "Automated test suite for provider comparison",
      "Quality monitoring dashboard",
    ],
    impact: [
      "Reduced manual validation time through automated scoring",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
  },
  {
    slug: "anomaly-detection-thesis",
    title: "Anomaly Detection in Stock Market Data",
    category: "Research",
    timeframe: "2023 - 2024",
    context: "University of East London",
    summary:
      "Master's thesis on anomaly detection in stock market data using deep learning on cloud platforms. Awarded Distinction.",
    tags: ["Deep Learning", "TensorFlow", "Cloud", "Python"],
    highlights: [
      "Distinction-grade thesis",
      "Deep learning models for financial anomaly detection",
      "Cloud-based training and evaluation pipeline",
    ],
    whatIBuilt: [
      "Training and evaluation pipelines for deep learning models",
      "Feature engineering and model selection experiments",
      "Cloud deployment for scalable training",
    ],
    impact: [
      "Awarded Distinction for thesis work",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  },
  {
    slug: "ieee-transfer-learning",
    title: "Object Detection via Transfer Learning",
    category: "Research",
    timeframe: "2020 - 2021",
    context: "Vellore Institute of Technology",
    summary:
      "IEEE published research on transfer learning applied to CIFAR-10, achieving 96% accuracy.",
    tags: ["Deep Learning", "Transfer Learning", "CIFAR-10", "IEEE"],
    highlights: [
      "Published at IEEE International Conference",
      "96% accuracy on CIFAR-10",
      "Transfer learning methodology",
    ],
    whatIBuilt: [
      "Transfer learning pipeline for image classification",
      "Experimental framework for model comparison",
    ],
    impact: [
      "Published research at IEEE International Conference",
    ],
    links: [],
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  },
];

export const getProjectBySlug = (slug: string) => projects.find((project) => project.slug === slug);

export const getFeaturedProjects = () => projects.filter((project) => project.featured);
