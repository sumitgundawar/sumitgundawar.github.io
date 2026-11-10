export const GROUPS = {
  languages: ["programming-foundations", "python", "javascript", "sql", "java", "go"],
  foundations: ["data-structures", "networking", "databases-basics", "concurrency"],
  design: ["caching", "load-balancing", "queues", "scaling-data", "resilience", "observability"],
  design2: ["api-design", "realtime", "search", "storage-media", "identity", "coordination", "data-pipelines"],
  design3: ["event-driven", "gateways", "ml-systems", "edge"],
  delivery: ["containers", "cicd", "cloud"],
  practice: ["testing", "code-quality", "engineering-models"],
  caseStudies: ["netflix", "uber", "twitter-feed", "whatsapp", "classic-designs", "discord", "cloudflare", "dynamodb", "slack"],
  caseStudies2: ["payments", "web-search", "google-maps", "dropbox", "figma"],
  interview: ["sd-interview", "seniority"],
  companies: ["company-questions"],
  security: ["appsec", "isolation", "replication-depth"],
  dissections: ["cursor-git", "openai-agents"],
  systems: ["consensus", "query-planning", "memory-model", "distributed-time"],
} as const;

export type GroupName = keyof typeof GROUPS;
