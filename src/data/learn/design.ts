import type { Card } from "./types";

export const design: Card[] = [
  {
    id: "caching",
    title: "Caching and Redis",
    summary: "Strategies, invalidation, TTLs, and what actually goes wrong at scale.",
    track: "design",
    topics: [
      {
        id: "cache-strategies",
        title: "Cache-aside, write-through, write-behind",
        level: "beginner",
        body: [
          "Cache-aside: the application checks the cache, and on a miss reads the database and populates the cache. Simple, and the default nearly everywhere.",
          "Write-through: writes go to cache and database together. The cache is never stale, but every write pays both costs.",
          "Write-behind: writes go to cache and are flushed to the database later. Fastest writes, and a crash between the two loses data.",
        ],
        why: "Cache-aside wins by default because the failure mode is mild — a miss costs a database read. Write-behind trades durability for speed, which is only acceptable when the data is genuinely disposable.",
        check: {
          prompt: "Which strategy risks losing committed writes if the cache node dies?",
          options: ["Cache-aside", "Write-through", "Write-behind", "Read-through"],
          correctIndex: 2,
          explain: "Write-behind acknowledges the write once it is in cache and flushes later. Anything not yet flushed is gone.",
        },
      },
      {
        id: "invalidation",
        title: "Invalidation: TTL, explicit, and versioned keys",
        level: "intermediate",
        body: [
          "TTL expiry is the simplest: entries die after a set time. You accept staleness up to the TTL in exchange for needing no invalidation logic at all.",
          "Explicit invalidation deletes the key when the underlying data changes. Fresher, but every write path must know every key it affects, and one missed path means permanently stale data.",
          "Versioned keys sidestep deletion entirely. Include a version or timestamp in the key, and bump it on write. Old entries are never read again and expire on their own.",
        ],
        why: "Versioned keys are usually the best of the three because they make invalidation a write to one value rather than a fan-out of deletes. Deleting keys correctly requires knowing every key derived from a piece of data, and that knowledge rots.",
        inPractice: "Netflix leans on short TTLs plus versioned keys rather than trying to invalidate precisely across regions — with EVCache replicating within a region, a coordinated global delete is slower and less reliable than simply letting stale entries age out.",
        check: {
          prompt: "A product appears with an old price on some pages after an update. Which approach avoids this class of bug most reliably?",
          options: [
            "Longer TTLs so the cache settles",
            "Versioned cache keys, so a write changes the key rather than requiring every derived key to be deleted",
            "Disabling caching for products",
            "Deleting the whole cache on every write",
          ],
          correctIndex: 1,
          explain: "The bug is a missed delete path. Versioning removes the need to enumerate derived keys: bump the version and every old key becomes unreachable.",
        },
      },
      {
        id: "redis-structures",
        title: "Redis beyond get and set",
        level: "intermediate",
        body: [
          "Redis stores structures, not just strings. Sorted sets give you leaderboards and time-ordered feeds with range queries. Hashes let you update one field of an object without rewriting it.",
          "Sets handle membership and deduplication. Lists work as simple queues. Streams add consumer groups and acknowledgements for real message processing.",
          "Using the right structure is often the difference between one operation and a read-modify-write round trip.",
        ],
        why: "Treating Redis as a string cache is the most common way to leave performance on the table. A sorted set does ranking server-side; strings force you to fetch, sort in the application, and write back.",
        check: {
          prompt: "You need a live leaderboard with rank lookups. Which Redis structure fits?",
          options: ["A string per player", "A sorted set scored by points", "A list of players", "A hash of player to score"],
          correctIndex: 1,
          explain: "Sorted sets maintain order by score and support rank and range queries directly. A hash stores scores but cannot rank without fetching everything.",
        },
      },
      {
        id: "cache-failures",
        title: "Stampedes, avalanches and hot keys",
        level: "advanced",
        body: [
          "A stampede happens when a popular key expires and every concurrent request misses at once, all hitting the database together. The fix is a short lock so one request recomputes while others wait or serve stale.",
          "An avalanche is the same thing at scale: many keys given identical TTLs expire simultaneously. Jitter the TTLs so expiry spreads out.",
          "A hot key is one entry so popular that a single Redis node becomes the bottleneck. Replicate it across nodes or add a small local in-process cache in front.",
        ],
        why: "These are the failures that only appear under real traffic, which is why they are asked about. All three are caused by synchronised behaviour, and all three are fixed by deliberately desynchronising it.",
        check: {
          prompt: "Every hour, database load spikes hard for a few seconds. Caches were warmed at deploy with the same TTL. What is happening?",
          options: [
            "A hot key on one node",
            "A cache avalanche — identical TTLs cause mass simultaneous expiry",
            "The database is running a scheduled job",
            "Connection pool exhaustion",
          ],
          correctIndex: 1,
          explain: "Keys created together with identical TTLs expire together. Adding random jitter to each TTL spreads expiry and flattens the spike.",
        },
      },
      {
        id: "what-not-to-cache",
        title: "What not to cache",
        level: "advanced",
        body: [
          "Caching adds a second source of truth and a new class of bug. It is worth it when reads dominate, the data tolerates staleness, and recomputation is genuinely expensive.",
          "Data that changes on nearly every read gains nothing: you pay the write cost and still miss. Per-user data with no reuse often falls here too.",
          "Anything where stale means wrong, such as permissions or balances, should be read from the source or cached with very tight bounds and explicit invalidation.",
        ],
        why: "The honest question is not what to cache but what staleness is acceptable for. If the answer is none, caching is the wrong tool and the fix is a faster query or a better index.",
        check: {
          prompt: "Which is the weakest candidate for caching?",
          options: [
            "A product catalogue page read thousands of times an hour",
            "A user's current permission set, where stale data grants access that was revoked",
            "An expensive aggregate report regenerated nightly",
            "Static configuration",
          ],
          correctIndex: 1,
          explain: "Stale permissions are a security bug, not a performance tradeoff. Where staleness means incorrect, caching needs tight bounds or should be avoided.",
        },
      },
    ],
  },

  {
    id: "load-balancing",
    title: "Load balancing and traffic",
    summary: "Spreading requests, and what breaks when a node disappears.",
    track: "design",
    topics: [
      {
        id: "lb-algorithms",
        title: "Round robin, least connections, hashing",
        level: "beginner",
        body: [
          "Round robin sends each request to the next server. Fine when requests cost roughly the same, poor when they do not.",
          "Least connections routes to whichever server is handling fewest requests, which handles uneven work better.",
          "Consistent hashing sends the same key to the same server, which matters when servers hold local state or cache.",
        ],
        why: "Round robin is the default and is wrong whenever request cost varies wildly — one slow endpoint drags a server down while the balancer keeps feeding it work.",
        check: {
          prompt: "Requests range from 5ms to 30s. Which algorithm distributes load best?",
          options: ["Round robin", "Least connections", "Random", "IP hash"],
          correctIndex: 1,
          explain: "Round robin counts requests, not work in flight. Least connections notices a server tied up with long requests and routes around it.",
        },
      },
      {
        id: "consistent-hashing",
        title: "Consistent hashing",
        level: "advanced",
        body: [
          "Hashing a key modulo the number of servers works until the count changes. Add one server and almost every key maps somewhere new, which invalidates every cache at once.",
          "Consistent hashing places servers and keys on a ring. Adding or removing a node only moves the keys between it and its neighbour, roughly one over n of the total.",
          "Virtual nodes spread each physical server across many ring positions, which evens out the distribution.",
        ],
        why: "This is the technique that makes distributed caches and sharded stores survivable. Without it, scaling the cluster is an outage.",
        inPractice: "Used by Cassandra, DynamoDB and every serious distributed cache for exactly this reason.",
        check: {
          prompt: "Why is hash modulo N poor for distributing cache keys?",
          options: [
            "It is computationally expensive",
            "Changing N remaps nearly every key, invalidating the whole cache at once",
            "It cannot handle string keys",
            "It requires a central coordinator",
          ],
          correctIndex: 1,
          explain: "The modulus is part of the mapping, so changing the server count changes almost every result. Consistent hashing limits the churn to roughly one over n.",
        },
      },
      {
        id: "health-checks",
        title: "Health checks and draining",
        level: "intermediate",
        body: [
          "A shallow health check confirms the process is alive. A deep one confirms it can reach its dependencies. Deep checks catch more, and can take an entire fleet out when a shared dependency wobbles.",
          "Connection draining lets a server finish in-flight requests before it is removed, so deploys do not drop live traffic.",
          "Separating readiness from liveness matters: not ready yet and needs restarting are different conditions with different responses.",
        ],
        why: "Making the health check depend on the database means a brief database blip marks every server unhealthy simultaneously, turning a degraded system into a total outage.",
        check: {
          prompt: "Why can a deep health check that queries the database be dangerous?",
          options: [
            "It is slower to execute",
            "A brief database problem marks every server unhealthy at once, removing the whole fleet",
            "It requires more permissions",
            "Load balancers cannot run SQL",
          ],
          correctIndex: 1,
          explain: "Shared dependencies make health correlated. Every node fails the check together, so a partial problem becomes a complete outage.",
        },
      },
    ],
  },

  {
    id: "queues",
    title: "Queues and asynchronous work",
    summary: "Decoupling, delivery guarantees, and the ordering problem nobody mentions.",
    track: "design",
    topics: [
      {
        id: "why-queues",
        title: "What a queue actually buys you",
        level: "beginner",
        body: [
          "A queue lets a request return before the work is done. The user gets a fast response and the work happens behind them.",
          "It also absorbs spikes. A burst that would overwhelm a synchronous system becomes a backlog that drains at whatever rate the workers manage.",
          "The cost is that the system is now eventually consistent, and you owe the user a way to see the outcome.",
        ],
        why: "Adding a queue converts a latency problem into a state problem. That is usually a good trade for email, image processing or reports, and a bad one for anything the user is waiting to see.",
        check: {
          prompt: "What does moving work to a queue actually cost you?",
          options: [
            "Throughput",
            "Immediate consistency — the result no longer exists when the response returns",
            "Reliability, always",
            "The ability to scale workers",
          ],
          correctIndex: 1,
          explain: "The response now means accepted, not done. That is fine if the interface reflects it, and confusing if it pretends the work is complete.",
        },
      },
      {
        id: "delivery-guarantees",
        title: "At-most-once, at-least-once, exactly-once",
        level: "intermediate",
        body: [
          "At-most-once may drop messages. At-least-once may deliver twice. Exactly-once is what everyone wants and is not achievable end to end in a distributed system.",
          "What people call exactly-once is at-least-once delivery combined with idempotent processing, so duplicates have no additional effect.",
          "That is a real and achievable goal, and it puts the responsibility in the consumer rather than the broker.",
        ],
        why: "Selecting a broker for its exactly-once badge and skipping idempotency is the classic mistake. The guarantee applies within the broker, not across your side effects — a duplicate email has already been sent.",
        check: {
          prompt: "Your broker advertises exactly-once. Do consumers still need to be idempotent?",
          options: [
            "No — the broker deduplicates by message ID, so a handler is entered at most once",
            "Yes — the guarantee covers broker state, not the email or charge your handler performs",
            "Only above the throughput where the broker degrades to at-least-once delivery",
            "Only when consumers are spread across groups, since each group gets its own copy",
          ],
          correctIndex: 1,
          explain: "Exactly-once is scoped to the broker's own state. Once your handler sends an email or charges a card, only idempotency protects you.",
        },
      },
      {
        id: "ordering",
        title: "Ordering and partitions",
        level: "advanced",
        body: [
          "Ordering guarantees are usually per partition, not global. Kafka orders within a partition; across partitions there is no order at all.",
          "Keying by entity, such as user id, puts all events for that entity in one partition and preserves their order relative to each other.",
          "Global ordering means one partition, which means one consumer, which means no parallelism. That is the trade.",
        ],
        why: "Wanting strict global ordering usually means the design is wrong. Per-entity ordering is almost always what is actually needed, and it parallelises.",
        check: {
          prompt: "Events for one user arrive out of order across partitions. Best fix?",
          options: [
            "Use a single partition for the whole topic",
            "Partition by user id so all of one user's events land in the same partition",
            "Add timestamps and sort in the consumer",
            "Increase the consumer count",
          ],
          correctIndex: 1,
          explain: "Keying by user gives ordering where it matters while keeping parallelism across users. One partition would order everything and destroy throughput.",
        },
      },
      {
        id: "dead-letter",
        title: "Retries and dead letter queues",
        level: "intermediate",
        body: [
          "A message that fails is usually retried. Without a limit, a permanently broken message is retried forever, consuming capacity and burying real work.",
          "A dead letter queue holds messages that failed repeatedly, so the main queue keeps flowing and failures can be inspected.",
          "Retries should back off exponentially with jitter, or every consumer retries in lockstep and hammers the failing dependency together.",
        ],
        why: "An unmonitored dead letter queue is the same as dropping messages, just slower. The queue is only useful if someone is alerted when it fills.",
        check: {
          prompt: "Why add jitter to exponential backoff?",
          options: [
            "To make retries faster overall",
            "So retrying clients spread out instead of all retrying at the same moments",
            "To satisfy the broker protocol",
            "To preserve message ordering",
          ],
          correctIndex: 1,
          explain: "Pure exponential backoff keeps clients synchronised — they all wait the same intervals and retry together. Jitter breaks that alignment.",
        },
      },
    ],
  },

  {
    id: "scaling-data",
    title: "Replication, sharding and consistency",
    summary: "Scaling past one database, and what you give up when you do.",
    track: "design",
    topics: [
      {
        id: "read-replicas",
        title: "Read replicas and replication lag",
        level: "intermediate",
        body: [
          "A read replica copies the primary and serves reads, which scales read capacity. Writes still go to one place.",
          "Replication is asynchronous by default, so a replica is always slightly behind. Usually milliseconds, occasionally much more under load.",
          "That gap causes read-your-own-writes bugs: a user saves something, is read from a replica, and sees the old value.",
        ],
        why: "The standard fix is to route a user's reads to the primary briefly after they write. Making all reads go to the primary defeats the point of having replicas at all.",
        check: {
          prompt: "A user updates their profile and immediately sees the old version. Cause?",
          options: [
            "Browser caching only",
            "The read went to a replica that had not yet received the write",
            "The write failed silently",
            "The primary is overloaded",
          ],
          correctIndex: 1,
          explain: "Classic replication lag. Pin that user's reads to the primary for a short window after their write.",
        },
      },
      {
        id: "sharding",
        title: "Sharding and choosing a key",
        level: "advanced",
        body: [
          "Sharding splits data across databases so writes scale. The shard key decides which shard holds a row, and it is the hardest decision to reverse.",
          "A poor key creates hotspots. Sharding by country puts most traffic on one shard. Sharding by timestamp puts all current writes on the newest shard.",
          "Queries that span shards become slow and complicated, so the key should match how the data is actually read.",
        ],
        why: "Shard last. Read replicas, caching, better indexes and a bigger instance all come first, because they are reversible. Sharding changes your data model permanently.",
        check: {
          prompt: "Which shard key most likely creates a hotspot for a global consumer app?",
          options: ["Hash of user id", "Country", "Random UUID", "Hash of account id"],
          correctIndex: 1,
          explain: "Users are not evenly spread across countries. Hashing an identifier distributes evenly regardless of the underlying skew.",
        },
      },
      {
        id: "cap",
        title: "CAP, stated usefully",
        level: "intermediate",
        body: [
          "When a network partition splits your system, you either refuse requests to stay consistent, or answer them and risk divergence. That is the whole choice.",
          "Partitions are not optional, so the real question is what to do during one, not whether to sacrifice partition tolerance.",
          "It is rarely uniform within one company. A core ledger chooses consistency and refuses; the ATM in the lobby chooses availability, dispenses anyway, and reconciles later with an overdraft fee — which is Brewer's own illustration of the trade.",
        ],
        why: "'We chose AP' is meaningless without saying what happens to conflicting writes afterwards. The interesting engineering is the reconciliation, not the letter.",
        check: {
          prompt: "During a partition, your system keeps accepting writes on both sides. What must you also design?",
          options: [
            "A faster network",
            "Conflict resolution for divergent writes once the partition heals",
            "Stronger authentication",
            "A larger connection pool",
          ],
          correctIndex: 1,
          explain: "Choosing availability means accepting divergence. Without a resolution rule — last write wins, CRDTs, or manual merge — you have data corruption.",
        },
      },
      {
        id: "eventual-consistency",
        title: "Eventual consistency in the interface",
        level: "advanced",
        body: [
          "Eventual consistency means replicas converge given no new writes. It says nothing about how long that takes, and users notice the gap.",
          "The engineering work is mostly in the interface: show the pending state, use optimistic updates, and avoid pretending an action is complete when it is queued.",
          "Read-your-own-writes is usually the guarantee users actually care about, and it is much cheaper than full consistency.",
        ],
        why: "Most consistency complaints are interface problems, not database problems. Showing 'processing' honestly costs nothing and removes the perception of a bug.",
        check: {
          prompt: "Cheapest way to stop eventual consistency feeling broken to users?",
          options: [
            "Switch to strong consistency everywhere",
            "Guarantee read-your-own-writes and show pending state honestly in the interface",
            "Increase replica count",
            "Cache more aggressively",
          ],
          correctIndex: 1,
          explain: "Users care about seeing their own actions reflected. That is far cheaper than global strong consistency and removes most of the perceived breakage.",
        },
      },
    ],
  },

  {
    id: "resilience",
    title: "Rate limiting and resilience",
    summary: "Staying up when a dependency does not.",
    track: "design",
    topics: [
      {
        id: "rate-limiting",
        title: "Token bucket and sliding window",
        level: "intermediate",
        body: [
          "A fixed window counter is simple and allows double the limit across a boundary: full quota at the end of one window, full quota at the start of the next.",
          "A sliding window smooths that by weighting the previous window. A token bucket refills at a steady rate and allows bursts up to the bucket size.",
          "Token bucket is usually the best fit for APIs because real traffic is bursty and a strict rate feels broken.",
        ],
        why: "Choose based on whether bursts are acceptable. Token bucket permits them deliberately; sliding window suppresses them. Fixed window is simplest and has a known flaw at the edges.",
        check: {
          prompt: "With a fixed window of 100 requests per minute, how many can a client send in a two-second span?",
          options: ["100", "200, straddling the window boundary", "50", "Unlimited"],
          correctIndex: 1,
          explain: "100 at the end of one window and 100 at the start of the next lands 200 in quick succession. Sliding windows and token buckets avoid this.",
        },
      },
      {
        id: "circuit-breakers",
        title: "Circuit breakers and timeouts",
        level: "intermediate",
        body: [
          "A slow dependency is worse than a dead one: callers pile up waiting, threads and connections are consumed, and the failure spreads upstream.",
          "A circuit breaker trips after repeated failures and fails fast for a while, then lets a trial request through to test recovery.",
          "Every network call needs a timeout. A missing timeout means waiting indefinitely, which is how one slow service takes down everything that calls it.",
        ],
        why: "Retries without a breaker amplify an outage — a struggling service gets more traffic exactly when it is least able to serve it. The breaker is what stops retries becoming an attack on your own system.",
        check: {
          prompt: "A downstream service slows to 30s per call. Your service becomes unavailable too. What prevents this?",
          options: [
            "Increasing your own timeout",
            "Aggressive timeouts plus a circuit breaker that fails fast once errors accumulate",
            "More retries",
            "A larger thread pool",
          ],
          correctIndex: 1,
          explain: "Waiting longer holds resources longer. Failing fast frees them and stops the failure propagating; a bigger pool only delays the same collapse.",
        },
      },
      {
        id: "graceful-degradation",
        title: "Graceful degradation",
        level: "advanced",
        body: [
          "Not every dependency is essential. If recommendations are down, the product page should still render without them.",
          "That requires deciding in advance which features are optional and what the fallback is: cached data, a default, or simply hiding the section.",
          "The alternative is that any dependency failure becomes a total failure, which is a design choice made by omission.",
        ],
        why: "This is the difference between an outage and a degraded experience most users never notice. It costs almost nothing at design time and is expensive to retrofit.",
        inPractice: "Netflix's home page renders with cached or default rows when the personalisation service is unavailable, rather than failing the page.",
        check: {
          prompt: "The recommendation service is down. What is the correct product page behaviour?",
          options: [
            "Return a 500 for the page",
            "Render the page without recommendations, or with a cached or default set",
            "Retry until it responds",
            "Redirect to a status page",
          ],
          correctIndex: 1,
          explain: "Recommendations are enhancement, not core. Rendering without them keeps the product usable and confines the failure to one section.",
        },
      },
    ],
  },

  {
    id: "observability",
    title: "Observability",
    summary: "Knowing what is happening, and what to measure instead of averages.",
    track: "design",
    topics: [
      {
        id: "logs-metrics-traces",
        title: "Logs, metrics and traces",
        level: "beginner",
        body: [
          "Logs record discrete events with detail. Metrics are aggregated numbers over time, cheap to store and query. Traces follow one request across services.",
          "Metrics tell you something is wrong. Traces tell you where. Logs tell you why.",
          "Using only logs means expensive storage and slow answers to simple questions; using only metrics means knowing something broke without knowing what.",
        ],
        why: "The three are complementary and priced very differently. Logging everything at high volume is a large bill for questions a metric answers instantly.",
        check: {
          prompt: "Latency has risen across a request path spanning six services. Which signal localises it fastest?",
          options: ["Application logs", "Distributed traces", "CPU metrics", "Error counts"],
          correctIndex: 1,
          explain: "A trace shows time spent per service for one request, which points at the slow hop immediately. Logs would mean correlating six services by hand.",
        },
      },
      {
        id: "percentiles",
        title: "Percentiles, not averages",
        level: "intermediate",
        body: [
          "An average hides the tail. A system with 100ms average latency can still have one request in a hundred taking five seconds.",
          "p50 describes the typical experience, p95 and p99 describe the worst of it. The tail is where users churn, and it is invisible in the mean.",
          "Averaging percentiles across servers is meaningless. Percentiles must be computed over the whole population.",
        ],
        why: "Reporting p99 rather than mean is a small change that surfaces problems users complain about but dashboards do not show. It also makes capacity conversations honest.",
        check: {
          prompt: "Average latency is 100ms and users complain of slowness. Most likely explanation?",
          options: [
            "The average is measured incorrectly",
            "A long tail — p99 may be seconds while the mean stays low",
            "Users are exaggerating",
            "The frontend is slow, not the backend",
          ],
          correctIndex: 1,
          explain: "A small fraction of very slow requests barely moves the mean but is highly visible to the users who hit it. Look at p95 and p99.",
        },
      },
      {
        id: "slo",
        title: "SLIs, SLOs and error budgets",
        level: "advanced",
        body: [
          "An SLI is a measurement, such as the fraction of requests served under 300ms. An SLO is the target for it. The gap between the target and 100 percent is the error budget.",
          "The budget turns reliability into a resource. Spend it on shipping quickly; when it runs out, stop shipping and fix stability.",
          "This replaces arguments about whether to prioritise features or reliability with a number both sides already agreed.",
        ],
        why: "Chasing 100 percent is the wrong target: each extra nine costs disproportionately more, and perfect reliability means you shipped too slowly. The budget makes the trade explicit rather than political.",
        check: {
          prompt: "What is the point of an error budget?",
          options: [
            "To assign blame after an incident",
            "To make the reliability-versus-velocity trade explicit and agreed in advance",
            "To set the on-call rota",
            "To calculate infrastructure cost",
          ],
          correctIndex: 1,
          explain: "It converts a recurring argument into an agreed number: budget remaining means ship, budget exhausted means stabilise.",
        },
      },
    ],
  },
];
