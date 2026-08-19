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
          "A container is a process on the host kernel with a restricted view of the world. Two Linux features do the work: namespaces, which decide what a process can see, its own process table, network stack, mount table and hostname, and cgroups, which decide what it can use, its share of CPU, memory and IO. There is no virtual machine and no second kernel, which is why it starts in milliseconds.",
          "The problem it solves is environment drift. Before containers, works on my machine was a real and expensive category of bug, because the machine included a particular library version, a particular locale, a particular environment variable set by someone in 2019. An image is the environment, so the same artefact runs identically on a laptop, in CI and in production, and the failure mode moves from mysterious to reproducible.",
          "A virtual machine gives stronger isolation by running its own kernel, at the cost of size and startup time. That distinction matters for security: a container escape is a kernel exploit away, which is why untrusted multi-tenant workloads use VMs, or lightweight VMs such as Firecracker that keep the isolation while approaching container startup times.",
          "The other half of the value is immutability. A container is replaced rather than updated, so there is no configuration drift accumulating on long-lived servers and no question of what has been done to a machine since it was provisioned. That property is what makes rollbacks trivial: the previous image still exists and still runs exactly as it did.",
          "What containers do not solve is worth stating plainly. They are not a security boundary strong enough to run untrusted code, they do not make a stateful service stateless, and they do not remove the need to think about how data outlives the process. A database in a container is a database with a storage question, not a solved problem.",
          "So the argument is reproducibility first and density second. If the deployment already produces one identical artefact, a static binary, a zip for a serverless runtime, the reproducibility case is weaker and containers buy less, which is worth acknowledging before adopting the ecosystem that comes with them.",
        ],
        why: "Containers are about reproducibility first and density second. If your deployment already produces an identical artefact, a single Go binary, a Lambda zip, the reproducibility argument is weaker and containers buy you less.",
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
        checks: [
          {
            prompt: "Which two kernel features do most of the work in a container?",
            options: [
              "Namespaces for what a process can see, cgroups for what it can use",
              "Chroot for the filesystem, and seccomp for the system calls allowed",
              "The hypervisor for isolation, and the union filesystem for layering",
              "Capabilities for privileges, and the scheduler for CPU fairness",
            ],
            correctIndex: 0,
            explain:
              "Namespaces restrict the view, cgroups restrict the resources. Everything else, the image format, the layering, the tooling, is built on those two.",
          },
          {
            prompt: "Why do multi-tenant platforms run untrusted code in VMs rather than containers?",
            options: [
              "A container shares the host kernel, so an escape is a kernel exploit away",
              "Containers cannot enforce memory limits reliably under contention",
              "Container images can be modified at runtime by the tenant that owns them",
              "VMs start faster once the guest image has been cached on the host",
            ],
            correctIndex: 0,
            explain:
              "The shared kernel is the isolation boundary, and it is a large one. Lightweight VMs such as Firecracker exist to keep VM-grade isolation while approaching container startup times.",
          },
          {
            prompt: "What does immutability buy in practice?",
            options: [
              "Rollback is running the previous image, which still exists unchanged",
              "Configuration can be edited in place without rebuilding the image",
              "Long-lived hosts accumulate patches without needing to be replaced",
              "Secrets can be baked in safely, since the image cannot be modified",
            ],
            correctIndex: 0,
            explain:
              "Replacing rather than updating means no drift accumulates and the previous state is still available exactly as it was. Baking secrets into an image is the opposite of a benefit.",
          },
        ],
      },
      {
        id: "docker-vs-k8s",
        title: "Docker or Kubernetes, and why",
        level: "intermediate",
        body: [
          "Docker builds and runs containers on one machine. Kubernetes schedules them across many: restarting what fails, rolling out new versions, scaling on demand, routing traffic to whatever is currently healthy. They are not alternatives, and the question that matters is not which to choose but whether an orchestrator is needed at all.",
          "What Kubernetes genuinely gives you is a declarative control loop. You describe the desired state and controllers work continuously to make reality match it, which is why a killed pod comes back and a failed node's work moves elsewhere without anyone acting. That model is the reason it won, and it is genuinely powerful when there is a fleet to manage.",
          "The weight is equally real. Networking with its own model, ingress, RBAC, storage classes, cluster upgrades on a cadence you do not control, and an API surface large enough that expertise in it is a full-time skill. Debugging spans several layers, each with its own failure modes, and the mean time to understand an incident goes up before it comes down.",
          "The middle option is the one most teams skip. A managed container platform, Cloud Run, ECS Fargate, App Runner, takes the same image and runs it with autoscaling, rollouts and health checking while handing you almost none of a cluster. For a handful of services with similar shapes, that is most of the benefit for a small fraction of the cost, and it covers a great many systems that reached past it.",
          "The honest signals that Kubernetes is right: many services with different scaling profiles that benefit from bin-packing, a platform team standardising across several product teams, workloads that need scheduling features such as affinity or GPUs, or a multi-cloud requirement that is real rather than aspirational. One service and three engineers is not that list.",
          "The cost that decides it is people rather than money. A cluster needs somebody who understands it when it misbehaves at three in the morning, and if that person is also the only backend engineer, the orchestrator has been bought with the time that was going into the product.",
        ],
        why: "Reach for Kubernetes when you have many services with different scaling profiles, need bin-packing across a fleet, or are standardising across teams. For a handful of services, a managed container platform, ECS Fargate, Cloud Run, App Runner, gives most of the benefit with a fraction of the operational cost. Choosing Kubernetes for one service is buying a scheduling problem you did not have.",
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
            "The operational surface, upgrades, networking, RBAC, costs more than it saves",
            "Three services cannot fill a node, so you pay for capacity that sits idle",
            "The control plane needs more resources than the three services do",
            "Autoscaling cannot help when traffic is modest and steady all day",
          ],
          correctIndex: 0,
          explain: "Kubernetes solves scheduling and fleet management. With three similar services there is little to schedule, so you take on the operational cost without the benefit.",
        },
        checks: [
          {
            prompt: "What is the core idea that makes Kubernetes powerful?",
            options: [
              "Controllers reconcile actual state toward a declared desired state",
              "Containers are scheduled onto the node with the most free memory",
              "The API server queues changes so deployments are applied in order",
              "Every workload gets its own network namespace and routable address",
            ],
            correctIndex: 0,
            explain:
              "The control loop is why failures self-heal without anyone acting. Everything else is machinery serving that idea, and it is also why partial configuration produces confident, continuous, wrong behaviour.",
          },
          {
            prompt: "Which signal genuinely argues for Kubernetes over a managed container platform?",
            options: [
              "Many services with different scaling profiles that reward bin-packing",
              "A requirement to run containers rather than virtual machine images",
              "A need for zero-downtime deploys and automatic restarts on failure",
              "Traffic that varies enough to need autoscaling throughout the day",
            ],
            correctIndex: 0,
            explain:
              "Restarts, rollouts and autoscaling come with the managed platforms too. Scheduling a heterogeneous fleet is the thing they do not do, and it is what an orchestrator is for.",
          },
          {
            prompt: "What is the cost of Kubernetes that usually decides the question?",
            options: [
              "Someone must understand the cluster when it misbehaves at 3am",
              "The control plane consumes a fixed share of every node's memory",
              "Managed clusters carry a monthly charge per control plane",
              "Images must be rebuilt to include the orchestrator's agent",
            ],
            correctIndex: 0,
            explain:
              "The money is rarely the problem. Operating it competently is a skill, and on a small team it is bought with the time that was going into the product.",
          },
        ],
      },
      {
        id: "image-hygiene",
        title: "Image size, layers and security",
        level: "intermediate",
        body: [
          "Images are built as layers and each layer is cached by the instruction that produced it and everything above it. Ordering a Dockerfile so dependency installation happens before source is copied means a code change rebuilds one small layer rather than reinstalling every package, which is the highest-leverage build optimisation available and costs nothing but attention.",
          "Multi-stage builds are the second. Compile in an image with the full toolchain, then copy only the artefact into a minimal runtime image, and hundreds of megabytes of compilers, headers and package caches never ship. The build stays convenient and the thing you deploy is small, which shortens every pull on every node on every deploy.",
          "Smaller is also safer, because most of a large base image is packages you never call and every one of them can carry a vulnerability that a scanner will report and someone will have to triage. Distroless images contain your application and its runtime and not a shell, which removes an entire category of post-exploitation. Alpine is small for a different reason, musl rather than glibc, which is occasionally a compatibility problem worth knowing about in advance.",
          "Secrets must not end up in layers. A file copied in and deleted in a later instruction is still present in the earlier layer and still readable by anyone with the image, which is a recurring way credentials leak. Build secrets exist for this, mounted for one instruction and never committed to a layer, and they are worth learning before the alternative teaches you.",
          "Tags deserve more care than they get. Deploying latest means the image you tested and the image that runs are related only by hope, and a rollback has nothing to point at. Tag with the commit, or better with the image digest, so a deployment names exactly one artefact and can be reproduced next year.",
          "Two habits complete the picture: run as a non-root user, because the default is root and a container escape from root is a much better day for an attacker, and scan images in the pipeline so a known vulnerability is a build result rather than a discovery.",
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
        checks: [
          {
            prompt: "A credential is copied into an image and deleted in a later instruction. Is it gone?",
            options: [
              "No, it remains in the earlier layer and can be read from the image",
              "Yes, the final filesystem is what ships and the file is not in it",
              "Yes, provided the delete happens in the same stage of the build",
              "No, but only if the image is pushed to a public registry",
            ],
            correctIndex: 0,
            explain:
              "Layers are additive history, not a final state. Anyone with the image can read the layer where the file existed, which is why build secrets are mounted rather than copied.",
          },
          {
            prompt: "Why deploy by image digest rather than by a tag such as latest?",
            options: [
              "A digest names exactly one artefact, so a rollback has a target",
              "Digests are resolved faster by the registry than mutable tags are",
              "Tags are mutable only in public registries, and digests in both",
              "A digest lets the runtime skip verifying the image signature",
            ],
            correctIndex: 0,
            explain:
              "A tag can be moved, so the image you tested and the image that runs are connected only by convention. A digest is the content, which is what reproducibility actually requires.",
          },
          {
            prompt: "What does a distroless base image remove that a slim one does not?",
            options: [
              "The shell and package manager, and with them a class of exploitation",
              "The application's own runtime, which must then be statically linked",
              "The layer cache, which forces every build to start from scratch",
              "The need to run the process as a non-root user inside the container",
            ],
            correctIndex: 0,
            explain:
              "Without a shell, an attacker who achieves execution has far less to work with. It also removes a long tail of packages whose vulnerabilities you would otherwise be triaging.",
          },
        ],
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
          "Continuous integration runs the checks, build, tests, lint, type check, on every change, so breakage surfaces in minutes, not at release. Continuous delivery keeps every passing commit deployable; continuous deployment goes further and ships it automatically.",
          "The value is proportional to speed. A pipeline taking forty minutes has stopped being feedback and become something people work around.",
        ],
        why: "Pipeline duration is a product decision, not an infrastructure detail. Past roughly ten minutes people stop waiting, start batching changes, and the benefit of small deploys disappears.",
        check: {
          prompt: "What is the main cost of a slow CI pipeline?",
          options: [
            "Compute spend, since every run holds a runner far longer than it needs",
            "People batch changes to avoid the wait, making each deploy bigger and riskier",
            "Flaky tests get retried instead of fixed, because a rerun is the cheap option",
            "Feedback lands after the author has moved on, costing a context switch",
          ],
          correctIndex: 1,
          explain: "Slow feedback changes behaviour. Batching produces large, hard-to-debug releases, the opposite of what CI is for.",
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
        why: "Canary is the strongest default because it fails small: problems surface on one percent of traffic, not on all of it. It requires metrics good enough to make the go or no-go call automatically.",
        check: {
          prompt: "What must be true for a rolling deploy to be safe?",
          options: [
            "Health checks must be deep enough to catch a bad version before it takes traffic",
            "The instance count must exceed peak demand, to absorb the ones draining",
            "Sessions must be sticky, so a user does not bounce between the two versions",
            "The new and old versions must interoperate, since both serve traffic at once",
          ],
          correctIndex: 3,
          explain: "A rolling deploy is a period of mixed versions. Any change that breaks compatibility, a removed API field, an incompatible migration, breaks during the roll.",
        },
      },
      {
        id: "migrations",
        title: "Database migrations without downtime",
        level: "advanced",
        body: [
          "Schema changes and code deploys are not atomic, so during any deploy the old code may run against the new schema, or the reverse.",
          "The expand-and-contract pattern handles this: add the new column, write to both, backfill, switch reads, and drop the old column in a later release.",
          "Renaming or dropping a column in the same release as the code change guarantees a window where one of the two is broken.",
          "Watch the lock as well. Adding a nullable column is instant on a modern Postgres; changing a type, or building an index the ordinary way, takes a lock that queues every other query behind it. CREATE INDEX CONCURRENTLY exists precisely because the obvious version takes the table down.",
        ],
        why: "This is the most common cause of self-inflicted deploy outages. Splitting a rename into three deploys feels slow and is the only version that stays up.",
        check: {
          prompt: "Why can't you rename a column and deploy the matching code together?",
          options: [
            "The rename holds an exclusive lock for as long as the table rewrite takes",
            "Rolling the deploy back would leave the new column name with no code reading it",
            "Deploy and migration are never simultaneous, so one side sees the other's schema",
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
          "A flag separates deploying code from releasing behaviour. Code ships dark, is enabled for a cohort, then for everyone, which turns a rollback into a configuration change, not a redeploy, and that is a great deal faster during an incident.",
          "Flags accumulate. Every one is a branch in the code, and stale flags become permanent complexity, so removing them has to be part of the process, not something everyone means to get to.",
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
          "The three major clouds offer the same primitives under different names: compute, object storage, managed relational databases, queues, a CDN. AWS has the broadest catalogue and the most third-party support; GCP is strong on data and Kubernetes; Azure wins where an organisation already runs Microsoft identity and licensing.",
          "Learn the concepts, not the product names. An interviewer asking about object storage does not care whether you say S3, GCS or Blob Storage.",
        ],
        why: "Choosing a cloud is usually decided by existing commitments, team familiarity and pricing agreements, and seldom on technical superiority. The technical differences matter far less than the migration cost of being wrong.",
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
          "Ten thousand visitors a month is roughly four requests a minute at peak. A single small server, or a static site on a CDN, handles that without noticing. Multi-region clusters, autoscaling groups and service meshes answer problems that begin several orders of magnitude higher.",
          "Over-engineering costs money, and the larger cost is complexity, more moving parts to operate, debug and secure, while the product is still unproven.",
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
            "Roughly four requests a minute at peak, one small server is ample",
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
