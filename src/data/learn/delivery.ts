import type { Card } from "./types";

export const delivery: Card[] = [
  {
    id: "containers",
    title: "Containers and orchestration",
    summary: "Docker, Kubernetes, and an honest answer about when you need neither.",
    track: "delivery",
    topics: [
      {
        id: "what-docker-solves",
        title: "What Docker actually solves",
        level: "beginner",
        body: [
          "A container packages your application with its dependencies and a filesystem, sharing the host kernel. It starts in milliseconds because there is no operating system to boot.",
          "The problem it solves is environment drift: the same image runs identically on a laptop, in CI and in production, because the image is the environment.",
          "A virtual machine gives stronger isolation by running its own kernel, at the cost of size and startup time.",
        ],
        why: "Containers are about reproducibility first and density second. If your deployment already produces an identical artefact — a single Go binary, a Lambda zip — the reproducibility argument is weaker and containers buy you less.",
        check: {
          prompt: "Why does a container start far faster than a VM?",
          options: [
            "Images are layered, so only the changed layer has to be read at startup",
            "The container image is smaller, so there is less to load from disk",
            "Processes start unprivileged, skipping the hardware setup a VM does",
            "It shares the host kernel, so there is no operating system left to boot",
          ],
          correctIndex: 3,
          explain: "The kernel is already running. A container is process isolation plus a filesystem, not a machine.",
        },
      },
      {
        id: "docker-vs-k8s",
        title: "Docker or Kubernetes, and why",
        level: "intermediate",
        body: [
          "Docker builds and runs containers. Kubernetes schedules them across many machines: restarting failures, rolling out new versions, scaling on demand and routing traffic to healthy instances.",
          "They are not alternatives. The real question is whether you need an orchestrator at all, and the honest answer for most products is no.",
          "Kubernetes brings genuine operational weight: networking, ingress, RBAC, upgrades, and a large surface to secure and debug.",
        ],
        why: "Reach for Kubernetes when you have many services with different scaling profiles, need bin-packing across a fleet, or are standardising across teams. For a handful of services, a managed container platform — ECS Fargate, Cloud Run, App Runner — gives most of the benefit with a fraction of the operational cost. Choosing Kubernetes for one service is buying a scheduling problem you did not have.",
        diagram: {
          caption: "Same container image, three levels of orchestration",
          columns: [
            [{ id: "img", label: "Container image", sub: "built once", kind: "service" }],
            [
              { id: "vm", label: "Single VM", sub: "docker run", kind: "service" },
              { id: "paas", label: "Managed platform", sub: "Cloud Run, Fargate", kind: "service" },
              { id: "k8s", label: "Kubernetes", sub: "your own cluster", kind: "service" },
            ],
            [
              { id: "simple", label: "You operate", sub: "the host, restarts, deploys", kind: "external" },
              { id: "little", label: "You operate", sub: "almost nothing", kind: "external" },
              { id: "lots", label: "You operate", sub: "cluster, ingress, RBAC, upgrades", kind: "external" },
            ],
          ],
          edges: [
            { from: "img", to: "vm" },
            { from: "img", to: "paas" },
            { from: "img", to: "k8s" },
            { from: "vm", to: "simple" },
            { from: "paas", to: "little" },
            { from: "k8s", to: "lots" },
          ],
        },
        check: {
          prompt: "You run three services with modest, similar traffic. What is the strongest argument against Kubernetes?",
          options: [
            "The operational surface — upgrades, networking, RBAC — costs more than it saves",
            "Three services cannot fill a node, so you pay for capacity that sits idle",
            "The control plane needs more resources than the three services do",
            "Autoscaling cannot help when traffic is modest and steady all day",
          ],
          correctIndex: 0,
          explain: "Kubernetes solves scheduling and fleet management. With three similar services there is little to schedule, so you take on the operational cost without the benefit.",
        },
      },
      {
        id: "image-hygiene",
        title: "Image size, layers and security",
        level: "intermediate",
        body: [
          "Images are layered and cached. Ordering a Dockerfile so dependencies install before source is copied means a code change rebuilds one layer instead of everything.",
          "Multi-stage builds compile in a full toolchain image and copy only the artefact into a minimal runtime, cutting hundreds of megabytes.",
          "Smaller images are also a smaller attack surface. A distroless or Alpine base contains far fewer packages that can carry a CVE.",
        ],
        why: "Layer ordering is the highest-leverage build optimisation available and costs nothing. Copying source before installing dependencies invalidates the dependency cache on every commit.",
        check: {
          prompt: "Why install dependencies before copying source in a Dockerfile?",
          options: [
            "Package managers need a clean directory, which a source copy would pollute",
            "Dependency layers are shared between images, and source layers never are",
            "Source changes every commit, so copying it first invalidates the dependency layer",
            "The build cache is keyed on file mtime, which a source edit always changes",
          ],
          correctIndex: 2,
          explain: "Layers cache in order and invalidate downward. Putting the volatile thing last preserves the expensive cached layers above it.",
        },
      },
    ],
  },

  {
    id: "cicd",
    title: "CI/CD and deployment",
    summary: "Getting changes to production safely and often.",
    track: "delivery",
    topics: [
      {
        id: "pipeline",
        title: "What a pipeline should do",
        level: "beginner",
        body: [
          "Continuous integration runs the checks — build, tests, lint, type check — on every change, so breakage is caught in minutes rather than at release.",
          "Continuous delivery keeps every passing commit deployable. Continuous deployment goes further and ships it automatically.",
          "The value is proportional to speed. A pipeline taking forty minutes stops being feedback and becomes something people work around.",
        ],
        why: "Pipeline duration is a product decision, not an infrastructure detail. Past roughly ten minutes people stop waiting, start batching changes, and the benefit of small deploys disappears.",
        check: {
          prompt: "What is the main cost of a slow CI pipeline?",
          options: [
            "Compute spend, since every run holds a runner far longer than it needs",
            "People batch changes to avoid the wait, making each deploy bigger and riskier",
            "Flaky tests get retried rather than fixed, because a rerun is the cheap option",
            "Feedback lands after the author has moved on, costing a context switch",
          ],
          correctIndex: 1,
          explain: "Slow feedback changes behaviour. Batching produces large, hard-to-debug releases — the opposite of what CI is for.",
        },
      },
      {
        id: "deploy-strategies",
        title: "Blue-green, canary and rolling",
        level: "intermediate",
        body: [
          "Rolling replaces instances gradually. Simple and cheap, but both versions run at once, so the change must be backwards compatible.",
          "Blue-green runs a complete second environment and switches traffic in one step, which makes rollback instant at the cost of double the infrastructure.",
          "Canary sends a small percentage to the new version and watches error rates before proceeding, which limits blast radius to the sampled traffic.",
        ],
        why: "Canary is the strongest default because it fails small: problems surface on one percent of traffic rather than all of it. It requires metrics good enough to make the go or no-go call automatically.",
        check: {
          prompt: "What must be true for a rolling deploy to be safe?",
          options: [
            "Health checks must be deep enough to catch a bad version before it takes traffic",
            "The instance count must exceed peak demand, to absorb the ones draining",
            "Sessions must be sticky, so a user does not bounce between the two versions",
            "The new and old versions must interoperate, since both serve traffic at once",
          ],
          correctIndex: 3,
          explain: "A rolling deploy is a period of mixed versions. Any change that breaks compatibility — a removed API field, an incompatible migration — breaks during the roll.",
        },
      },
      {
        id: "migrations",
        title: "Database migrations without downtime",
        level: "advanced",
        body: [
          "Schema changes and code deploys are not atomic, so during any deploy the old code may run against the new schema, or the reverse.",
          "The expand-and-contract pattern handles this: add the new column, write to both, backfill, switch reads, then drop the old column in a later release.",
          "Renaming or dropping a column in the same release as the code change guarantees a window where one of them is broken.",
        ],
        why: "This is the most common cause of self-inflicted deploy outages. Splitting a rename into three deploys feels slow and is the only version that stays up.",
        check: {
          prompt: "Why can't you rename a column and deploy the matching code together?",
          options: [
            "The rename holds an exclusive lock for as long as the table rewrite takes",
            "Rolling the deploy back would leave the new column name with no code reading it",
            "Deploy and migration are never simultaneous, so one side briefly sees the other's schema",
            "Pooled connections keep prepared statements bound to the old column name",
          ],
          correctIndex: 2,
          explain: "There is always a window where code and schema disagree. Expand and contract keeps both readable throughout.",
        },
      },
      {
        id: "feature-flags",
        title: "Feature flags",
        level: "intermediate",
        body: [
          "A flag separates deploying code from releasing behaviour. Code ships dark, then is enabled for a cohort, then for everyone.",
          "That makes rollback a configuration change rather than a redeploy, which is far faster during an incident.",
          "Flags accumulate. Every one is a branch in the code, and stale flags become permanent complexity, so removal has to be part of the process.",
        ],
        why: "Flags are how you deploy on Friday safely. The discipline that makes them work is deleting them: a codebase with two hundred live flags has an untestable number of behaviour combinations.",
        check: {
          prompt: "What is the main long-term cost of feature flags?",
          options: [
            "The flag service becomes a hard dependency, so its outage takes you down",
            "Every flag is a permanent branch, and stale flags multiply untested combinations",
            "Flag lookups add latency to every request that has to consult the service",
            "Flags let non-engineers change production behaviour without a code review",
          ],
          correctIndex: 1,
          explain: "The runtime cost is trivial. The real cost is combinatorial complexity in code that nobody removes.",
        },
      },
    ],
  },

  {
    id: "cloud",
    title: "Cloud platforms and cost",
    summary: "AWS, GCP and Azure, and right-sizing instead of over-engineering.",
    track: "delivery",
    topics: [
      {
        id: "core-services",
        title: "The core services, by concept",
        level: "beginner",
        body: [
          "The three major clouds offer the same primitives with different names: compute, object storage, managed relational databases, queues, and a CDN.",
          "AWS has the broadest catalogue and the most third-party support. GCP is strong on data and Kubernetes. Azure wins where an organisation already runs Microsoft identity and licensing.",
          "Learn the concepts, not the product names. An interviewer asking about object storage does not care whether you say S3, GCS or Blob Storage.",
        ],
        why: "Choosing a cloud is usually decided by existing commitments, team familiarity and pricing agreements rather than technical superiority. The technical differences matter far less than the migration cost of being wrong.",
        check: {
          prompt: "You need durable object storage, a managed relational database and a queue. Which cloud can do it?",
          options: [
            "Only AWS, since S3 and RDS have no direct equivalents elsewhere",
            "AWS and GCP, though Azure has no managed queue of that kind",
            "All three can, using different names for the same three primitives",
            "Any of them, but only with Kubernetes to tie the pieces together",
          ],
          correctIndex: 2,
          explain: "These are commodity primitives everywhere. The decision hinges on cost, existing skills and lock-in, not capability.",
        },
      },
      {
        id: "right-sizing",
        title: "Right-sizing: build for the traffic you have",
        level: "intermediate",
        body: [
          "Ten thousand visitors a month is roughly four requests a minute at peak. A single small server, or a static site on a CDN, handles that without noticing.",
          "Multi-region clusters, autoscaling groups and service meshes are answers to problems that begin several orders of magnitude higher.",
          "Over-engineering costs money, but the larger cost is complexity: more moving parts to operate, debug and secure, while the product is still unproven.",
        ],
        why: "The right architecture for an unvalidated product is the one you can change quickly. Premature scale locks in decisions before you know the access patterns, and those are the expensive ones to reverse.",
        diagram: {
          caption: "Scale the architecture to the traffic, not to the ambition",
          columns: [
            [
              { id: "t1", label: "Under 10k/month", sub: "~4 req/min peak", kind: "client" },
              { id: "t2", label: "10k to 1m/month", kind: "client" },
              { id: "t3", label: "Millions/month", kind: "client" },
            ],
            [
              { id: "a1", label: "Static site + CDN", sub: "Pages, Cloudflare", kind: "edge" },
              { id: "a2", label: "One app server", sub: "+ managed Postgres", kind: "service" },
              { id: "a3", label: "Autoscaled fleet", sub: "+ cache + replicas", kind: "service" },
            ],
            [
              { id: "c1", label: "About zero", kind: "data" },
              { id: "c2", label: "Tens per month", kind: "data" },
              { id: "c3", label: "Hundreds and up", kind: "data" },
            ],
          ],
          edges: [
            { from: "t1", to: "a1" },
            { from: "t2", to: "a2" },
            { from: "t3", to: "a3" },
            { from: "a1", to: "c1" },
            { from: "a2", to: "c2" },
            { from: "a3", to: "c3" },
          ],
        },
        check: {
          prompt: "A new product expects 10,000 visits a month. What does that imply?",
          options: [
            "Around 240 requests a minute, which still fits on a single instance",
            "Enough that a load balancer and two instances are the sensible floor",
            "Little in aggregate, though the peaks will still need autoscaling",
            "Roughly four requests a minute at peak — one small server is ample",
          ],
          correctIndex: 3,
          explain: "Convert to requests per second before choosing anything. The number is tiny, and the architecture should reflect that.",
        },
      },
      {
        id: "cost-drivers",
        title: "Where cloud bills actually come from",
        level: "advanced",
        body: [
          "Egress bandwidth is the most commonly underestimated line. Data leaving the cloud is charged, and serving media directly from object storage is expensive compared with a CDN in front.",
          "Idle provisioned capacity is the next: instances and databases sized for a peak that happens twice a year, running at that size continuously.",
          "Managed services trade money for operational time. That is usually a good trade for a small team and a bad one at very large scale, which is why big companies eventually build their own.",
        ],
        why: "Netflix building Open Connect and Dropbox moving off S3 are both the same calculation: past a certain volume, the margin a provider charges exceeds the cost of doing it yourself. Below that volume, managed wins easily.",
        check: {
          prompt: "Your bill is dominated by serving images from object storage. Best first move?",
          options: [
            "Put a CDN in front, so most requests never reach origin and incur egress",
            "Move the images to a cheaper storage class, since they are read rarely",
            "Serve smaller derivatives, so each request transfers far fewer bytes",
            "Move to a provider with free egress, which removes the charge entirely",
          ],
          correctIndex: 0,
          explain: "Egress is the cost. A CDN both reduces origin egress and usually charges less per gigabyte for what it does serve.",
        },
      },
      {
        id: "serverless",
        title: "Serverless, containers or VMs",
        level: "intermediate",
        body: [
          "Serverless functions scale to zero and cost nothing when idle, which suits spiky or low-volume workloads. Cold starts add latency, and long-running work does not fit.",
          "Containers on a managed platform give steady performance and no cold starts, at the cost of paying for idle capacity.",
          "VMs give the most control and the most operational responsibility, and remain the right answer for anything with unusual system requirements.",
        ],
        why: "The deciding factor is usually traffic shape, not preference. Spiky and low-volume favours serverless; steady and predictable favours containers, where always-on capacity is cheaper than per-invocation pricing.",
        check: {
          prompt: "A service handles steady, high traffic all day. Why might serverless be the wrong choice?",
          options: [
            "Per-invocation pricing loses to reserved capacity once there is no idle time to save",
            "Cold starts on every request add tail latency that steady traffic cannot amortise",
            "Functions cannot hold a connection pool, so each call reopens the database",
            "Account concurrency limits cap sustained throughput below a container fleet",
          ],
          correctIndex: 0,
          explain:
            "Serverless is priced for idle time you do not have. Note that cold starts are the wrong objection here: steady traffic is exactly the case where instances stay warm and you rarely pay one. The pricing argument is the one that survives.",
        },
      },
    ],
  },
];
