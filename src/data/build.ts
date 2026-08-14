/* The questionnaire behind /build, and the rules that turn answers into an
   architecture.

   The point of the page is to talk people out of over-engineering, so the
   recommendation is driven mostly by scale, and every component carries the
   reasoning and the alternatives rather than being presented as the answer. */

export type Scale = "tiny" | "small" | "medium" | "large";

export interface Option {
  id: string;
  label: string;
  hint?: string;
}

export interface Question {
  id: string;
  prompt: string;
  help?: string;
  options: Option[];
  /** Skipping is allowed everywhere; this is what is assumed if you do. */
  skipDefault: string;
}

export const questions: Question[] = [
  {
    id: "kind",
    prompt: "What are you building?",
    help: "This mostly decides which components you need at all.",
    options: [
      { id: "content", label: "Content or marketing site", hint: "Articles, portfolio, docs" },
      { id: "saas", label: "SaaS or learning platform", hint: "Accounts, dashboards, subscriptions" },
      { id: "commerce", label: "E-commerce", hint: "Catalogue, cart, payments, stock" },
      { id: "social", label: "Social or community", hint: "Feeds, profiles, user content" },
      { id: "internal", label: "Internal tool", hint: "Known users, behind a login" },
    ],
    skipDefault: "saas",
  },
  {
    id: "scale",
    prompt: "How many visitors a month, realistically?",
    help: "Be honest rather than aspirational. This is the single biggest driver of everything below, and most answers are smaller than people expect.",
    options: [
      { id: "tiny", label: "Under 10,000", hint: "About 4 requests a minute at peak" },
      { id: "small", label: "10,000 to 100,000", hint: "Still comfortably one server" },
      { id: "medium", label: "100,000 to 1 million", hint: "Caching and a replica start to matter" },
      { id: "large", label: "Over 1 million", hint: "Now the distributed pieces earn their keep" },
    ],
    skipDefault: "small",
  },
  {
    id: "accounts",
    prompt: "Do users sign in?",
    options: [
      { id: "none", label: "No accounts" },
      { id: "simple", label: "Yes, individual accounts" },
      { id: "teams", label: "Yes, with teams, roles or permissions" },
    ],
    skipDefault: "simple",
  },
  {
    id: "media",
    prompt: "Are you storing files or media?",
    options: [
      { id: "none", label: "No" },
      { id: "images", label: "Images and documents" },
      { id: "video", label: "Video or audio", hint: "Adds transcoding and streaming" },
    ],
    skipDefault: "images",
  },
  {
    id: "realtime",
    prompt: "Does anything need to be live?",
    help: "Live means the user sees a change without refreshing.",
    options: [
      { id: "none", label: "No" },
      { id: "notify", label: "Notifications or activity updates" },
      { id: "collab", label: "Live collaboration or chat", hint: "Persistent connections" },
    ],
    skipDefault: "none",
  },
  {
    id: "search",
    prompt: "How will people find things?",
    options: [
      { id: "none", label: "They will not need to search" },
      { id: "filters", label: "Filters and sorting" },
      { id: "fulltext", label: "Free-text search across content" },
    ],
    skipDefault: "filters",
  },
  {
    id: "payments",
    prompt: "Are you taking money?",
    options: [
      { id: "none", label: "No" },
      { id: "oneoff", label: "One-off payments" },
      { id: "subs", label: "Subscriptions" },
    ],
    skipDefault: "none",
  },
  {
    id: "budget",
    prompt: "What matters more right now?",
    help: "There is no wrong answer, but it changes what gets recommended.",
    options: [
      { id: "free", label: "Spending as close to nothing as possible" },
      { id: "balanced", label: "A sensible balance" },
      { id: "perf", label: "Performance and headroom, cost second" },
    ],
    skipDefault: "balanced",
  },
  {
    id: "team",
    prompt: "Who is building and running it?",
    help: "Operational capacity is a real constraint, and ignoring it is how teams end up with infrastructure nobody can maintain.",
    options: [
      { id: "solo", label: "Me, and this is fairly new to me" },
      { id: "small", label: "One or two experienced engineers" },
      { id: "team", label: "A team with someone on infrastructure" },
    ],
    skipDefault: "small",
  },
  {
    id: "compliance",
    prompt: "Any data rules to worry about?",
    options: [
      { id: "none", label: "Nothing specific" },
      { id: "gdpr", label: "EU users, so GDPR", hint: "Affects where data lives" },
      { id: "regulated", label: "Regulated data", hint: "Health, financial, government" },
    ],
    skipDefault: "none",
  },
];

export type Answers = Record<string, string>;

export interface Recommendation {
  id: string;
  /** Layer, used for both diagram placement and colour. */
  kind: "client" | "edge" | "service" | "data" | "queue" | "external";
  name: string;
  pick: string;
  /** Why this component exists in your architecture at all. */
  why: string;
  /** Where it runs and roughly what it costs. */
  where: string;
  /** Real alternatives, so the recommendation reads as a choice not a verdict. */
  alternatives: { name: string; when: string }[];
  /** Set when the component is only needed above a certain scale. */
  optional?: boolean;
}

const scaleRank: Record<string, number> = { tiny: 0, small: 1, medium: 2, large: 3 };

export function recommend(a: Answers): Recommendation[] {
  const scale = scaleRank[a.scale ?? "small"] ?? 1;
  const cheap = a.budget === "free";
  const solo = a.team === "solo";
  const out: Recommendation[] = [];

  out.push({
    id: "client",
    kind: "client",
    name: "Front end",
    pick: a.kind === "content" ? "Static site" : "React single-page app",
    why:
      a.kind === "content"
        ? "Content that changes rarely should be built once and served as files. There is no server to run, nothing to patch, and it is effectively free to host."
        : "An interface with accounts and state needs a real client application. Rendering on the server is worth adding later if search visibility or first-load speed becomes a problem.",
    where: "Built in CI and served from a CDN. No running server.",
    alternatives: [
      { name: "Next.js or Remix", when: "You need server rendering for SEO or fast first paint on content-heavy pages." },
      { name: "Plain HTML", when: "The site is a handful of pages and will stay that way." },
    ],
  });

  out.push({
    id: "cdn",
    kind: "edge",
    name: "CDN and edge",
    pick: cheap ? "Cloudflare (free tier)" : "Cloudflare or CloudFront",
    why:
      "This is the highest-value component for the money at any scale. It puts your assets physically near users, which attacks latency rather than throughput, and absorbs traffic spikes before they reach anything you pay per-request for.",
    where: "Global edge network. Free tier covers most projects under a million visits.",
    alternatives: [
      { name: "Fastly", when: "You need fine-grained cache control and edge logic." },
      { name: "No CDN", when: "Your users are all in one city and latency genuinely does not matter." },
    ],
  });

  if (a.accounts !== "none") {
    out.push({
      id: "auth",
      kind: "service",
      name: "Authentication",
      pick: solo || cheap ? "Managed auth (Clerk, Auth0, Supabase Auth)" : a.accounts === "teams" ? "Managed auth with roles" : "Managed auth",
      why:
        "Rolling your own authentication is the most common way a small team introduces a serious vulnerability. Password reset, session handling, MFA and account recovery are each easy to get subtly wrong, and the failure is a breach rather than a bug.",
      where: "Third-party service. Usually free below a few thousand active users.",
      alternatives: [
        { name: "Your framework's built-in auth", when: "You have someone who has done it before and wants no third-party dependency." },
        { name: "SSO only", when: "Internal tool where everyone already has a company identity." },
      ],
    });
  }

  out.push({
    id: "api",
    kind: "service",
    name: "Application server",
    pick:
      scale <= 1
        ? cheap
          ? "Serverless functions"
          : "One small container"
        : scale === 2
          ? "Managed containers, autoscaled"
          : "Autoscaled container fleet",
    why:
      scale <= 1
        ? "At this traffic a single small instance is idle almost all the time. Anything more is paying for capacity you will not use and operating complexity you do not need."
        : scale === 2
          ? "Traffic is now uneven enough that one instance is a single point of failure. A managed platform gives you autoscaling and rolling deploys without a cluster to operate."
          : "At this volume you need horizontal scaling, health checking and gradual rollout as first-class features.",
    where: cheap && scale <= 1 ? "Cloud Run, Lambda or Fly.io. Often within free tiers." : "Cloud Run, ECS Fargate or App Runner. Tens to hundreds a month.",
    alternatives: [
      { name: "Kubernetes", when: "Many services with different scaling profiles, and someone whose job is the cluster." },
      { name: "A single VM", when: "You want full control and are comfortable operating a host." },
    ],
  });

  out.push({
    id: "db",
    kind: "data",
    name: "Database",
    pick: "Managed PostgreSQL",
    why:
      "Postgres handles far more load than most products ever reach, and it does JSON well enough that a separate document store is rarely justified. Choosing something else should follow from an access pattern you can describe, not from expected scale.",
    where: cheap ? "Supabase, Neon or RDS. Free tiers exist; small instances are single-digit monthly." : "RDS, Cloud SQL or Neon. Tens to low hundreds a month.",
    alternatives: [
      { name: "DynamoDB or similar", when: "Access is always by a single known key at very high volume." },
      { name: "MongoDB", when: "Records vary in shape and are almost always read whole." },
    ],
  });

  if (scale >= 2) {
    out.push({
      id: "cache",
      kind: "data",
      name: "Cache",
      pick: "Managed Redis",
      why:
        "Above roughly a hundred thousand visits, the same expensive queries repeat constantly. A cache in front of them is usually a bigger win than a larger database, and considerably cheaper.",
      where: "Upstash, ElastiCache or Memorystore. From a few pounds a month.",
      alternatives: [
        { name: "In-process cache", when: "One server, and a little staleness per instance is fine." },
        { name: "No cache yet", when: "You have not measured which queries are actually hot." },
      ],
      optional: true,
    });
  }

  if (scale >= 3) {
    out.push({
      id: "replica",
      kind: "data",
      name: "Read replica",
      pick: "Postgres read replica",
      why:
        "Read-heavy traffic at this scale can outgrow a single primary. Replicas add read capacity, at the cost of replication lag — so a user's own reads should still go to the primary briefly after they write.",
      where: "Same managed service. Roughly the cost of another instance.",
      alternatives: [
        { name: "More caching first", when: "Reads are repetitive; cache before you replicate." },
        { name: "A bigger primary", when: "Simpler, and often enough." },
      ],
      optional: true,
    });
  }

  if (a.media && a.media !== "none") {
    out.push({
      id: "storage",
      kind: "data",
      name: "File storage",
      pick: cheap ? "Cloudflare R2" : "S3 or R2",
      why:
        "Files belong in object storage with metadata in the database. Keeping blobs in Postgres inflates every backup and slows replication forever, and local disk disappears when an instance is replaced.",
      where: cheap ? "R2 charges no egress fee, which is the usual surprise on an image-heavy site." : "S3 or R2. Pennies per gigabyte; watch egress.",
      alternatives: [
        { name: "S3", when: "You are already deep in AWS and egress volume is modest." },
        { name: "Uploadthing or Cloudinary", when: "You want transforms and delivery handled for you." },
      ],
    });
  }

  if (a.media === "video") {
    out.push({
      id: "transcode",
      kind: "queue",
      name: "Video pipeline",
      pick: "Mux or Cloudflare Stream",
      why:
        "Transcoding into multiple renditions, packaging for adaptive bitrate and delivering it is a substantial system on its own. Buying it is almost always right until video is your core product.",
      where: "Per-minute encoding plus delivery. Priced per minute stored and streamed.",
      alternatives: [
        { name: "MediaConvert plus your own CDN", when: "High volume and you want control over the ladder." },
        { name: "ffmpeg in a worker", when: "Low volume and simple requirements." },
      ],
    });
  }

  if (a.realtime === "collab") {
    out.push({
      id: "ws",
      kind: "service",
      name: "Realtime layer",
      pick: "Managed WebSockets (Ably, Pusher, Supabase Realtime)",
      why:
        "Persistent connections break the assumption that any server can serve any request, which is what makes ordinary web scaling easy. You need a pub/sub tier so a message reaches whichever node holds that user's socket.",
      where: "Priced per connection and message. Free tiers cover early usage.",
      alternatives: [
        { name: "Your own WebSocket servers plus Redis pub/sub", when: "Volume makes per-connection pricing expensive." },
        { name: "Server-sent events", when: "Data only flows server to client." },
      ],
    });
  } else if (a.realtime === "notify") {
    out.push({
      id: "sse",
      kind: "service",
      name: "Push updates",
      pick: "Server-sent events",
      why:
        "Notifications flow one way, so a full bidirectional socket is more machinery than the job needs. SSE runs over ordinary HTTP and reconnects on its own.",
      where: "Runs on your existing application server. No extra cost.",
      alternatives: [
        { name: "Polling", when: "Updates are rare and a minute of delay is fine." },
        { name: "WebSockets", when: "The client will later need to send frequently too." },
      ],
    });
  }

  if (a.search === "fulltext") {
    out.push({
      id: "search",
      kind: "data",
      name: "Search",
      pick: scale >= 2 ? "Typesense or Algolia" : "Postgres full-text search",
      why:
        scale >= 2
          ? "Beyond a few hundred thousand documents, ranking quality and typo tolerance become the product. That is what a dedicated engine gives you over a LIKE query."
          : "Postgres full-text search is genuinely good and already in your stack. Adding a search service before you have the content to justify it is a second system to keep in sync for no gain.",
      where: scale >= 2 ? "Managed search, tens per month." : "No extra infrastructure.",
      alternatives: [
        { name: "Elasticsearch or OpenSearch", when: "You need deep customisation and have someone to operate it." },
        { name: "Postgres trigram search", when: "Fuzzy matching on names and titles is enough." },
      ],
      optional: scale < 2,
    });
  }

  if (a.payments && a.payments !== "none") {
    out.push({
      id: "payments",
      kind: "external",
      name: "Payments",
      pick: a.payments === "subs" ? "Stripe Billing" : "Stripe",
      why:
        "Never hold card details. Using a hosted checkout keeps you out of the strictest parts of PCI compliance entirely, and subscription billing has far more edge cases than it appears — proration, dunning, tax, failed renewals.",
      where: "Per transaction. Roughly 1.5 to 3 percent plus a fixed fee.",
      alternatives: [
        { name: "Paddle or Lemon Squeezy", when: "You want the merchant of record to handle sales tax for you." },
        { name: "Adyen", when: "Large volume and you want direct acquiring." },
      ],
    });
  }

  if (scale >= 2 || a.payments !== "none" || (a.media && a.media !== "none")) {
    out.push({
      id: "queue",
      kind: "queue",
      name: "Background jobs",
      pick: cheap ? "Database-backed queue" : "SQS or a managed queue",
      why:
        "Email, webhooks, image processing and report generation should not happen inside a request. A queue keeps responses fast and absorbs spikes, at the cost of the result no longer existing when the response returns.",
      where: cheap ? "A jobs table plus a worker. No extra service." : "SQS, Cloud Tasks or a hosted queue. Usually pennies.",
      alternatives: [
        { name: "Kafka", when: "You need durable event streams for several consumers, not just task execution." },
        { name: "Inline", when: "The work is fast and failure can surface directly to the user." },
      ],
      optional: scale < 2,
    });
  }

  out.push({
    id: "obs",
    kind: "external",
    name: "Monitoring",
    pick: cheap ? "Sentry free tier plus platform metrics" : "Sentry and a metrics platform",
    why:
      "You cannot operate what you cannot see, and the moment to install this is before the first incident rather than during it. Error tracking is the highest-value first step, because most outages surface as an exception someone should have seen.",
    where: "Free tiers are generous. Cost tracks event volume.",
    alternatives: [
      { name: "Datadog or Grafana Cloud", when: "You need traces and dashboards across several services." },
      { name: "Platform logs only", when: "Very early, and you check them by hand." },
    ],
  });

  return out;
}

/** Rough monthly cost band, deliberately vague — the point is the order of
 *  magnitude, not a quote. */
export function costBand(a: Answers): string {
  const scale = scaleRank[a.scale ?? "small"] ?? 1;
  if (a.budget === "free" && scale <= 1) return "Close to nothing — most of this fits inside free tiers";
  if (scale <= 1) return "Roughly £0–25 a month";
  if (scale === 2) return "Roughly £50–250 a month";
  return "Several hundred a month and up, depending heavily on media and egress";
}

export function headline(a: Answers): string {
  const scale = scaleRank[a.scale ?? "small"] ?? 1;
  if (scale <= 1)
    return "This is a small system, and that is the most important thing about it. Almost everything below is a managed service precisely so there is nothing to operate.";
  if (scale === 2)
    return "Real but moderate traffic. Caching and a managed container platform do most of the work; there is still no reason for a cluster.";
  return "At this volume the distributed pieces start to earn their cost. Add them in the order below, and only when you have measured the need.";
}
