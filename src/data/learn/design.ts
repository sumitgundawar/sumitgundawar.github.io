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
            "Delete the derived keys in the same transaction as the price write",
            "Versioned keys, so a write changes the key instead of requiring every delete",
            "Shorter TTLs, so any missed invalidation self-corrects within seconds",
            "Write through the cache, so it is updated rather than invalidated",
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
          "Redis stores structures, not just strings. Sorted sets give you leaderboards and time-ordered feeds with range queries. Hashes let you update one field of an object without rewriting the whole thing.",
          "Sets handle membership and deduplication, lists work as simple queues, and streams add consumer groups and acknowledgements for real message processing. Picking the right one is often the difference between a single operation and a read-modify-write round trip.",
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
            "A stampede on one hot key, whose misses all reach the database at once",
            "Connection pool exhaustion at the top of the hour, when cron jobs start",
            "A cache avalanche — identical TTLs mean the whole set expires together",
            "The eviction policy reclaiming memory in one pass rather than gradually",
          ],
          correctIndex: 2,
          explain: "Keys created together with identical TTLs expire together. Adding random jitter to each TTL spreads expiry and flattens the spike.",
        },
      },
      {
        id: "what-not-to-cache",
        title: "What not to cache",
        level: "advanced",
        body: [
          "Caching adds a second source of truth and a new class of bug. It earns that when reads dominate, the data tolerates staleness, and recomputation is genuinely expensive.",
          "Data that changes on nearly every read gains nothing — you pay the write cost and still miss — and per-user data with no reuse usually lands there too. Anything where stale means wrong, such as permissions or balances, should be read from the source, or cached with very tight bounds and explicit invalidation.",
        ],
        why: "The honest question is not what to cache but what staleness is acceptable for. If the answer is none, caching is the wrong tool and the fix is a faster query or a better index.",
        check: {
          prompt: "Which is the weakest candidate for caching?",
          options: [
            "An expensive aggregate report that is regenerated once every night",
            "A product catalogue page that is read several thousand times an hour",
            "A session token's validity, checked on every request across the fleet",
            "A user's permission set, where a stale entry grants access already revoked",
          ],
          correctIndex: 3,
          explain:
            "Stale permissions are a security bug rather than a performance tradeoff: the failure grants access instead of costing latency. Session validity is the close call — it is cached constantly in practice, but with seconds-long TTLs and a revocation list precisely because it carries the same risk in weaker form.",
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
          "Least connections routes to whichever server is handling fewest requests, which copes far better with uneven work.",
          "Consistent hashing sends the same key to the same server, which matters when servers hold local state or a cache.",
          "The choice follows from what your requests look like. Uniform and stateless, and round robin is enough. Wildly variable durations, and it is least connections. Anything cached or held per server, and it is hashing — accepting that you have just made your traffic distribution depend on your key distribution.",
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
          "Hashing a key modulo the number of servers works until that number changes. Add one server and almost every key maps somewhere new, which invalidates every cache at once.",
          "Consistent hashing places servers and keys on a ring, so adding or removing a node only moves the keys between it and its neighbour — roughly one over n of the total. Virtual nodes spread each physical server across many ring positions, which evens out a distribution that would otherwise be lumpy.",
        ],
        why: "This is the technique that makes distributed caches and sharded stores survivable. Without it, scaling the cluster is an outage.",
        inPractice: "Used by Cassandra, DynamoDB and every serious distributed cache for exactly this reason.",
        check: {
          prompt: "Why is hash modulo N poor for distributing cache keys?",
          options: [
            "The modulus biases keys toward lower-numbered nodes as N grows",
            "Changing N remaps nearly every key, emptying the whole cache at once",
            "Hash collisions put unrelated keys on one node, causing contention",
            "It cannot weight nodes differently when their capacities are unequal",
          ],
          correctIndex: 1,
          explain:
            "The modulus is part of the mapping, so changing the server count changes nearly every result and the cache empties at the worst possible moment. Uneven node capacity is a real weakness of plain modulo too, but consistent hashing fixes it separately, with virtual nodes.",
        },
      },
      {
        id: "health-checks",
        title: "Health checks and draining",
        level: "intermediate",
        body: [
          "A shallow health check confirms the process is alive. A deep one confirms it can reach its dependencies.",
          "Deep checks catch more, and can take an entire fleet out when a shared dependency wobbles. The failure is correlated by construction: every node checks the same database, so every node fails the check in the same second.",
          "The usual compromise is a deep check that degrades rather than fails. Report unhealthy only after several consecutive failures, and never let a dependency the request path does not need mark you down.",
          "Connection draining then lets a server finish its in-flight requests before it leaves the pool, so a deploy does not drop live traffic. Keep readiness and liveness separate while you are there — not ready yet and needs restarting call for very different responses.",
        ],
        why: "Making the health check depend on the database means a brief database blip marks every server unhealthy simultaneously, turning a degraded system into a total outage.",
        check: {
          prompt: "Why can a deep health check that queries the database be dangerous?",
          options: [
            "The check competes with real traffic for the same connection pool slots",
            "Load balancers time out before a deep check completes, so nodes flap",
            "A read replica can pass the check while the primary is unreachable",
            "One brief database blip marks the entire fleet unhealthy at the same moment",
          ],
          correctIndex: 3,
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
          "A queue lets a request return before the work is done. The user gets a fast response, and the work happens behind them. It also absorbs spikes: a burst that would overwhelm a synchronous system becomes a backlog that drains at whatever rate the workers manage.",
          "The cost is that the system is now eventually consistent, and you owe the user a way to see the outcome.",
        ],
        why: "Adding a queue converts a latency problem into a state problem. That is usually a good trade for email, image processing or reports, and a bad one for anything the user is waiting to see.",
        check: {
          prompt: "You move a piece of work behind a queue. What does the caller lose the moment it receives its response?",
          options: [
            "Throughput, since the broker adds a network hop to every unit of work",
            "The ability to scale that work independently of the request path",
            "Certainty the work is done — the response now means accepted, not completed",
            "Ordering, which the broker cannot preserve once there are several workers",
          ],
          correctIndex: 2,
          explain: "The response now means accepted, not done. That is fine if the interface reflects it, and confusing if it pretends the work is complete.",
        },
      },
      {
        id: "delivery-guarantees",
        title: "At-most-once, at-least-once, exactly-once",
        level: "intermediate",
        body: [
          "At-most-once may drop messages. At-least-once may deliver twice. Exactly-once is what everyone wants, and end to end in a distributed system it is not achievable.",
          "What gets sold as exactly-once is at-least-once delivery plus idempotent processing, so a duplicate has no additional effect. That is a real and reachable goal, and it puts the responsibility in the consumer rather than the broker — which is why buying a broker does not buy it for you.",
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
          "Keying by entity — user id, order id — puts all of that entity's events in one partition and preserves their order relative to each other, which is almost always the ordering you actually needed. Global ordering means one partition, which means one consumer, which means no parallelism. That is the trade.",
        ],
        why: "Wanting strict global ordering usually means the design is wrong. Per-entity ordering is almost always what is actually needed, and it parallelises.",
        check: {
          prompt: "Events for one user arrive out of order across partitions. Best fix?",
          options: [
            "Add a sequence number and have the consumer buffer and reorder them",
            "Collapse the topic to a single partition so every event is globally ordered",
            "Have producers send synchronously, so each event is acked before the next",
            "Partition by user id, so all of one user's events land in one partition",
          ],
          correctIndex: 3,
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
            "So the total wait converges faster than pure exponential growth would",
            "So retrying clients spread out instead of all waking at the same instants",
            "So a retry cannot land while the previous attempt is still in flight",
            "So the broker can tell a retry from a fresh publish of the same message",
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
          "Replication is asynchronous by default, so a replica is always slightly behind — usually milliseconds, occasionally a great deal more under load.",
          "That gap causes read-your-own-writes bugs. A user saves something, the next read lands on a replica, and they see the old value and conclude it did not save.",
          "The fix is not stronger consistency but a narrower rule: after a user writes, pin that user's reads to the primary for a few seconds. It costs almost nothing and it removes the only staleness anybody actually notices.",
        ],
        why: "The standard fix is to route a user's reads to the primary briefly after they write. Making all reads go to the primary defeats the point of having replicas at all.",
        check: {
          prompt: "A user updates their profile and immediately sees the old version. Cause?",
          options: [
            "The write is still inside an uncommitted transaction on the primary",
            "A CDN or proxy served a cached copy of the profile response",
            "The read went to a replica that had not yet received that write",
            "The ORM returned the pre-update object from its identity map",
          ],
          correctIndex: 2,
          explain: "Classic replication lag. Pin that user's reads to the primary for a short window after their write.",
        },
      },
      {
        id: "sharding",
        title: "Sharding and choosing a key",
        level: "advanced",
        body: [
          "Sharding splits data across databases so writes scale. The shard key decides which shard holds a row, and it is the hardest decision to reverse.",
          "A poor key creates hotspots. Sharding by country puts most traffic on one shard; sharding by timestamp puts every current write on the newest one.",
          "Queries that span shards get slow and complicated, so the key has to match how the data is read, not how it is naturally grouped.",
          "Resharding later means moving live data while still serving traffic from it. That is why the honest order is replicas, caching, better indexes and a bigger machine first — all of which are reversible, and none of which this is.",
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
            "A quorum rule, so only the side holding a majority accepts the writes",
            "Idempotency keys, so a write replayed after healing is not applied twice",
            "Monotonic timestamps, so the later write is always the one that survives",
            "Conflict resolution for the writes that diverged, once the partition heals",
          ],
          correctIndex: 3,
          explain:
            "Choosing availability means accepting divergence, so you owe a resolution rule. Last-write-wins by timestamp is one such rule, not an alternative to having one — and it is the lossiest, since it silently discards the losing write and depends on clocks you do not control. A quorum is the other branch entirely: it is what you choose when you would rather refuse the write than reconcile it.",
        },
      },
      {
        id: "eventual-consistency",
        title: "Eventual consistency in the interface",
        level: "advanced",
        body: [
          "Eventual consistency means replicas converge given no new writes. It says nothing about how long that takes, and users notice the gap.",
          "The engineering work is mostly in the interface: show the pending state, use optimistic updates, and do not pretend an action is complete when it is merely queued. Read-your-own-writes is the guarantee users actually care about, and it is far cheaper than full consistency.",
        ],
        why: "Most consistency complaints are interface problems, not database problems. Showing 'processing' honestly costs nothing and removes the perception of a bug.",
        check: {
          prompt: "Cheapest way to stop eventual consistency feeling broken to users?",
          options: [
            "Route every read through the primary, which removes the lag entirely",
            "Guarantee read-your-own-writes, and show pending state honestly in the UI",
            "Raise the replica count so a stale replica is less likely to be chosen",
            "Add a short delay before the redirect, giving replication time to catch up",
          ],
          correctIndex: 1,
          explain:
            "Users notice their own actions going missing, and almost never notice someone else's arriving late. Routing every read to the primary does fix it, by throwing away the reason you added replicas — the question asked for the cheapest fix, and honest pending state costs nothing.",
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
          "A fixed window counter is simple, and it allows double the limit across a boundary: a full quota at the end of one window, another full quota at the start of the next.",
          "A sliding window smooths that by weighting the previous window; a token bucket refills at a steady rate and permits bursts up to the bucket size. Token bucket usually fits an API best, because real traffic is bursty and a strictly even rate feels broken to whoever is using it.",
        ],
        why: "Choose based on whether bursts are acceptable. Token bucket permits them deliberately; sliding window suppresses them. Fixed window is simplest and has a known flaw at the edges.",
        check: {
          prompt: "With a fixed window of 100 requests per minute, how many can a client send in a two-second span?",
          options: [
            "100, since that is what the limit permits in any sixty-second period",
            "150, once the partially elapsed first window has been accounted for",
            "200, by straddling the boundary between two adjacent windows",
            "Unlimited, because a fixed window resets on the first request it sees",
          ],
          correctIndex: 2,
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
            "A longer timeout, so the call completes rather than being abandoned midway",
            "Retries with backoff, so a slow call is abandoned and tried again later",
            "A bulkhead, giving that dependency its own bounded pool of threads",
            "Tight timeouts, plus a breaker that fails fast once the errors accumulate",
          ],
          correctIndex: 3,
          explain:
            "Waiting longer holds resources longer, so failing fast is what stops the failure spreading. A bulkhead is genuinely part of the answer and pairs with a breaker rather than replacing it: it caps how much of you one dependency can consume, but on its own it lets every call into that pool keep waiting the full 30 seconds.",
        },
      },
      {
        id: "graceful-degradation",
        title: "Graceful degradation",
        level: "advanced",
        body: [
          "Not every dependency is essential. If recommendations are down, the product page should still render without them.",
          "That requires deciding in advance which features are optional and what each fallback is — cached data, a default, or simply hiding the section. The alternative is that any dependency failure becomes a total failure, which is a design decision made by omission.",
        ],
        why: "This is the difference between an outage and a degraded experience most users never notice. It costs almost nothing at design time and is expensive to retrofit.",
        inPractice: "Netflix's home page renders with cached or default rows when the personalisation service is unavailable, rather than failing the page.",
        check: {
          prompt: "The recommendation service is down. What is the correct product page behaviour?",
          options: [
            "Return a 503 with a Retry-After, so clients know to come back shortly",
            "Render the page without recommendations, or with a cached or default set",
            "Block on a retry loop until the service answers or the request times out",
            "Redirect to a status page so the user knows something is degraded",
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
          "An average hides the tail. A system averaging 100ms can still be taking five seconds on one request in a hundred, and p50 describes the typical experience while p95 and p99 describe the worst of it.",
          "The tail is where users churn, and it is invisible in the mean. One caution while you are moving to percentiles: averaging them across servers is meaningless. A percentile has to be computed over the whole population, not averaged out of per-host summaries.",
        ],
        why: "Reporting p99 rather than mean is a small change that surfaces problems users complain about but dashboards do not show. It also makes capacity conversations honest.",
        check: {
          prompt: "Average latency is 100ms and users complain of slowness. Most likely explanation?",
          options: [
            "The mean includes fast health check requests, which drag the number down",
            "A long tail — p99 may be seconds while the mean stays comfortably low",
            "Latency is measured server-side, so it excludes network and render time",
            "The average covers too long a window to show the recent spikes",
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
          "An SLI is a measurement, such as the fraction of requests served under 300ms. An SLO is the target for it. The gap between that target and 100 percent is the error budget.",
          "The budget turns reliability into a resource. Spend it shipping quickly; when it runs out, stop shipping and fix stability. That replaces the argument about whether features or reliability come first with a number both sides already agreed to.",
        ],
        why: "Chasing 100 percent is the wrong target: each extra nine costs disproportionately more, and perfect reliability means you shipped too slowly. The budget makes the trade explicit rather than political.",
        check: {
          prompt: "What is the point of an error budget?",
          options: [
            "To decide when to stop shipping features and spend a sprint on reliability",
            "To give on-call a threshold at which an alert is worth waking someone for",
            "To make the reliability-versus-velocity trade explicit, and agreed in advance",
            "To hold teams to a number, so that a regression has a named owner",
          ],
          correctIndex: 2,
          explain: "It converts a recurring argument into an agreed number: budget remaining means ship, budget exhausted means stabilise.",
        },
      },
    ],
  },
];
