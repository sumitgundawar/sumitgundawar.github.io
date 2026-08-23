/* Which module each card's material lives in.
 *
 * This is the one piece of the split that has to be written by hand, because it
 * is the mapping the bundler needs before it can see the data: a dynamic import
 * has to name its module literally, or Vite cannot make a chunk out of it.
 *
 * Kept honest by generation rather than by discipline. The manifest generator
 * fails the build if a card is missing here, so adding a card to a file and
 * forgetting this list is a build error rather than a page that will not open.
 */
export const GROUPS = {
  languages: ["programming-foundations", "python", "javascript", "sql", "java", "go"],
  foundations: ["data-structures", "networking", "databases-basics", "concurrency"],
  design: ["caching", "load-balancing", "queues", "scaling-data", "resilience", "observability"],
  design2: ["api-design", "realtime", "search", "storage-media", "identity", "coordination", "data-pipelines"],
  delivery: ["containers", "cicd", "cloud"],
  practice: ["testing", "code-quality", "engineering-models"],
  caseStudies: ["netflix", "uber", "twitter-feed", "whatsapp", "classic-designs"],
  interview: ["sd-interview", "seniority"],
  companies: ["company-questions"],
  security: ["appsec", "isolation", "replication-depth"],
} as const;

export type GroupName = keyof typeof GROUPS;
