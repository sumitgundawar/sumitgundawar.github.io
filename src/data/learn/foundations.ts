import type { Card } from "./types";

export const foundations: Card[] = [
  {
    id: "networking",
    title: "Networking and the web",
    summary: "What actually happens between a browser and your server, and where the time goes.",
    track: "foundations",
    topics: [
      {
        id: "request-lifecycle",
        title: "The life of a request",
        level: "beginner",
        body: [
          "Typing a URL sets off DNS resolution, a TCP handshake, a TLS handshake, then the HTTP request itself. Each is a round trip, and round trips are the thing that costs you.",
          "A user 200ms away pays that 200ms per round trip. Four round trips before a single byte of content is 800ms of nothing on screen. This is why latency, not bandwidth, dominates perceived speed.",
          "Once you can name the steps, most performance work becomes obvious: remove round trips, or move the server closer to the user.",
        ],
        why: "Interviewers open with this because it reveals whether you think in terms of round trips or in terms of vague slowness. The answer that names DNS, TCP, TLS and HTTP separately is the one that can then reason about a CDN.",
        check: {
          prompt: "A page takes 900ms to start rendering for users in Australia and 120ms in London, on the same server in London. What is the dominant cause?",
          options: [
            "The server is under-provisioned",
            "Round-trip latency from physical distance, multiplied by each handshake",
            "The database is slow for those users",
            "Australian ISPs throttle HTTPS",
          ],
          correctIndex: 1,
          explain: "Same server, same load, different distance. Each handshake costs a round trip, and distance multiplies every one of them. Moving content closer via a CDN removes most of it.",
        },
      },
      {
        id: "tcp-vs-udp",
        title: "TCP and UDP",
        level: "beginner",
        body: [
          "TCP guarantees delivery and order. Lost packets are retransmitted, and the receiver waits. UDP does neither: it sends and forgets.",
          "That guarantee is not free. A single lost packet stalls everything behind it, which is fine for a file and terrible for a live call where the late data is worthless by the time it arrives.",
          "Video calls, games and DNS use UDP and handle loss themselves. Almost everything else uses TCP.",
        ],
        why: "Choosing UDP is choosing to write your own reliability for the parts that need it. Worth it when stale data is useless; a mistake when you end up reimplementing TCP badly.",
        check: {
          prompt: "Why do live video calls generally use UDP rather than TCP?",
          options: [
            "UDP is encrypted and TCP is not",
            "A retransmitted frame arrives too late to be useful, and waiting for it stalls everything after",
            "TCP cannot carry video data",
            "UDP has higher bandwidth",
          ],
          correctIndex: 1,
          explain: "In a call, a frame from 400ms ago is worthless. TCP would stall the stream waiting for it; UDP drops it and moves on, which is what you want.",
        },
      },
      {
        id: "http-versions",
        title: "HTTP/1.1, HTTP/2 and HTTP/3",
        level: "intermediate",
        body: [
          "HTTP/1.1 allows one outstanding request per connection, so browsers open six connections per host and developers bundle files to work around it.",
          "HTTP/2 multiplexes many streams over one connection, which removes the need for most bundling tricks. It still runs on TCP, so one lost packet blocks every stream sharing that connection.",
          "HTTP/3 moves to QUIC over UDP, where each stream is independent. Loss affects one stream instead of all of them, which matters most on mobile networks.",
        ],
        why: "Sprite sheets, domain sharding and aggressive bundling were workarounds for an HTTP/1.1 limit. Carrying them into an HTTP/2 or HTTP/3 world adds complexity for no gain, and can hurt caching.",
        check: {
          prompt: "Why does HTTP/2 still suffer head-of-line blocking despite multiplexing?",
          options: [
            "It only allows one stream at a time",
            "It runs over TCP, which delivers bytes in order, so a lost packet stalls every stream on that connection",
            "Browsers do not implement it correctly",
            "TLS forces sequential delivery",
          ],
          correctIndex: 1,
          explain: "Multiplexing happens above TCP. TCP still guarantees ordered delivery of the whole byte stream, so one lost packet holds up everything behind it. QUIC solves it by making streams independent.",
        },
      },
      {
        id: "dns",
        title: "DNS and why it hurts you",
        level: "intermediate",
        body: [
          "DNS turns a name into an address, and answers are cached at many layers with a TTL you set. A low TTL means fast changes and more lookups; a high TTL means the opposite.",
          "The catch is that not everyone honours your TTL. Some resolvers hold answers longer, so a migration planned around a 60-second TTL can still send traffic to the old address for hours.",
          "This is why cutovers are done by changing what the address points at, rather than changing the address.",
        ],
        why: "Lowering TTL days ahead of a migration, then failing over at the load balancer rather than in DNS, is the difference between a clean cutover and a long tail of traffic hitting a decommissioned box.",
        check: {
          prompt: "You set a 60-second DNS TTL and cut over. Hours later, some traffic still hits the old server. Why?",
          options: [
            "The TTL only applies to IPv6",
            "Some resolvers and clients ignore short TTLs and cache longer than you asked",
            "DNS changes take 48 hours by specification",
            "The old server is refusing to shut down",
          ],
          correctIndex: 1,
          explain: "TTL is a request, not a guarantee. Some resolvers cache longer. Plan cutovers so the old address keeps working, or fail over behind a stable address instead.",
        },
      },
      {
        id: "cdn",
        title: "CDNs and edge caching",
        level: "intermediate",
        body: [
          "A CDN puts copies of your content in data centres near users. The round trips that dominate page load then happen over tens of milliseconds instead of hundreds.",
          "Static assets are easy. The interesting work is caching HTML and API responses at the edge, which means being deliberate about cache keys and invalidation.",
          "Modern edge platforms also run code at those locations, so personalisation and auth checks can happen near the user rather than at origin.",
        ],
        why: "A CDN is usually the highest-leverage performance change available, because it attacks latency rather than throughput. Adding servers makes a busy system faster; moving content closer makes a distant system faster.",
        inPractice: "Cloudflare and Fastly serve most of their traffic from cache; origin servers see a small fraction of total requests.",
        check: {
          prompt: "Your API is fast under load tests but slow for real users abroad. What helps most?",
          options: [
            "A bigger database instance",
            "Serving from edge locations near users, cutting the round-trip distance",
            "More application servers in the same region",
            "Raising the connection pool size",
          ],
          correctIndex: 1,
          explain: "Load tests run near the server, so they never measure distance. If the system is fast under load but slow abroad, the problem is geography, not capacity.",
        },
      },
    ],
  },

  {
    id: "data-structures",
    title: "Data structures and complexity",
    summary: "The handful that come up constantly, and how to talk about cost without hand-waving.",
    track: "foundations",
    topics: [
      {
        id: "big-o",
        title: "Big-O without the ritual",
        level: "beginner",
        body: [
          "Big-O describes how cost grows as input grows. It deliberately ignores constants, because for large inputs the shape of the curve dominates everything else.",
          "That also makes it misleading for small inputs. An O(n log n) algorithm with a heavy constant loses to an O(n squared) one on a list of twenty items, which is why real sort implementations switch to insertion sort for small slices.",
          "Say which n you mean. 'O(n) in the number of users' and 'O(n) in the number of requests' are very different claims.",
        ],
        why: "Quoting complexity without naming n is the most common way to sound rigorous and say nothing. Naming it is what turns the answer into engineering.",
        check: {
          prompt: "Why do production sort implementations fall back to insertion sort for small arrays?",
          options: [
            "Insertion sort is O(n log n) for small inputs",
            "Constant factors dominate when n is small, and insertion sort has very low overhead",
            "Quicksort is incorrect below sixteen elements",
            "It reduces memory to zero",
          ],
          correctIndex: 1,
          explain: "Big-O drops constants, but constants are exactly what matters at small n. Insertion sort's tiny overhead wins there despite the worse asymptotic class.",
        },
      },
      {
        id: "hash-maps",
        title: "Hash maps and their worst case",
        level: "beginner",
        body: [
          "A hash map gives average constant-time lookup by turning a key into a bucket index. Collisions are handled by chaining or open addressing.",
          "The average case assumes keys spread evenly. If an attacker can choose keys that all hash to one bucket, every lookup degrades to scanning a list, and the map becomes a denial-of-service vector.",
          "Languages now randomise hash seeds per process for exactly this reason.",
        ],
        why: "Reaching for a hash map is right almost always. Knowing the degenerate case is what separates using one from being able to defend the choice.",
        check: {
          prompt: "How can a hash map become a denial-of-service vector?",
          options: [
            "By using too much memory at startup",
            "If an attacker submits keys that all collide into one bucket, turning lookups into linear scans",
            "Because hash maps are not thread safe",
            "By exceeding the maximum key length",
          ],
          correctIndex: 1,
          explain: "Deliberate collisions collapse average constant time into linear time on every operation. Randomised per-process hash seeds make the attack impractical.",
        },
      },
      {
        id: "trees-indexes",
        title: "B-trees and why databases use them",
        level: "intermediate",
        body: [
          "A balanced binary tree is fine in memory. On disk it is poor, because each level is a separate read and disk reads are expensive.",
          "A B-tree stores many keys per node, matched to the size of a disk page. Fanout is high, depth is low, and a lookup in a large table takes a handful of reads rather than dozens.",
          "This is why almost every relational index is a B-tree, and why index depth barely grows as tables get large.",
        ],
        why: "The structure is chosen to match the storage medium, not for elegance. That is the general lesson: data structure choice follows the cost model of where the data lives.",
        check: {
          prompt: "Why do databases index with B-trees rather than binary search trees?",
          options: [
            "Binary trees cannot store integers",
            "High fanout means fewer levels, and each level is an expensive disk read",
            "B-trees use less memory in every case",
            "Binary trees cannot be balanced",
          ],
          correctIndex: 1,
          explain: "Disk reads dominate. Packing many keys per node keeps the tree shallow, so a lookup costs a few reads instead of one per level.",
        },
      },
      {
        id: "bloom-filters",
        title: "Bloom filters",
        level: "advanced",
        body: [
          "A Bloom filter answers one question cheaply: is this item definitely absent, or possibly present. It can produce false positives but never false negatives.",
          "That asymmetry is the whole point. Put one in front of an expensive lookup and you skip the lookup entirely for items that are definitely not there.",
          "The cost is a few bits per item, far less than storing the keys themselves.",
        ],
        why: "Useful precisely where a definite no is valuable and a maybe is cheap to verify. Storage engines use them to avoid reading files that cannot contain a key.",
        inPractice: "Cassandra and most LSM-tree storage engines keep a Bloom filter per data file to avoid pointless disk reads.",
        check: {
          prompt: "What can a Bloom filter guarantee?",
          options: [
            "That an item is definitely present",
            "That an item is definitely absent, when it says so",
            "Exact membership with no error",
            "Ordering of inserted items",
          ],
          correctIndex: 1,
          explain: "A negative is definitive; a positive means maybe, and needs confirming. That is what makes it a cheap filter in front of an expensive check.",
        },
      },
    ],
  },

  {
    id: "databases-basics",
    title: "Databases and data modelling",
    summary: "Transactions, indexes, normalisation, and choosing between relational and document stores.",
    track: "foundations",
    topics: [
      {
        id: "acid",
        title: "ACID, stated plainly",
        level: "beginner",
        body: [
          "Atomicity: all of a transaction happens or none of it. Consistency: it moves the database between valid states. Isolation: concurrent transactions do not see each other's partial work. Durability: once committed, it survives a crash.",
          "Isolation is where the detail lives. Most databases default to read committed, not full serialisability, because full isolation is expensive.",
          "That default allows anomalies most developers never think about, including two transactions reading and updating the same row based on stale reads.",
        ],
        why: "'We use a relational database so we get ACID' is only true at the isolation level you actually configured. Knowing your default is the difference between a guarantee and an assumption.",
        check: {
          prompt: "Two transactions read a balance of 100 and each subtract 60, both committing. What prevents this by default?",
          options: [
            "Atomicity, in every database",
            "Nothing at read committed — you need a higher isolation level or explicit locking",
            "Durability handles it",
            "The database always serialises writes to the same row",
          ],
          correctIndex: 1,
          explain: "This is a lost update, and read committed permits it. Fix it with SELECT FOR UPDATE, an atomic decrement, or serialisable isolation.",
        },
      },
      {
        id: "indexes",
        title: "Indexes and their cost",
        level: "beginner",
        body: [
          "An index is a sorted structure that turns a full table scan into a targeted lookup. Reads get faster, sometimes by orders of magnitude.",
          "Every index must be updated on write, so each one makes inserts and updates slower and takes disk space. An unused index is pure cost.",
          "Composite indexes only help when the query uses a leading prefix of the columns, in order. An index on (a, b) helps a query on a, and on a and b, but not one on b alone.",
        ],
        why: "The instinct to add an index per slow query produces tables with fifteen indexes and slow writes. The question is always which queries matter, not which are slow.",
        check: {
          prompt: "You have an index on (country, city). Which query does it not help?",
          options: [
            "WHERE country = 'UK'",
            "WHERE country = 'UK' AND city = 'London'",
            "WHERE city = 'London'",
            "WHERE country = 'UK' ORDER BY city",
          ],
          correctIndex: 2,
          explain: "A composite index is sorted by the leading column first. Without country, the index has no useful ordering for city, so the database falls back to a scan.",
        },
      },
      {
        id: "normalisation",
        title: "Normalisation and when to break it",
        level: "intermediate",
        body: [
          "Normalising stores each fact once, so updates touch one row and the data cannot contradict itself. It costs joins on read.",
          "Denormalising duplicates data to avoid those joins. Reads get faster and simpler; every copy is now something that can drift out of sync.",
          "The usual shape is a normalised source of truth plus deliberately denormalised read models kept up to date asynchronously.",
        ],
        why: "Denormalisation is not a shortcut, it is a trade of write complexity for read speed. Make it when reads dominate and you have a reliable way to keep copies current.",
        check: {
          prompt: "What is the real cost of denormalising?",
          options: [
            "More disk space, which is cheap",
            "Every duplicated copy is somewhere the data can drift out of sync",
            "Queries become harder to write",
            "You can no longer index the table",
          ],
          correctIndex: 1,
          explain: "Space is the trivial part. The real cost is consistency: each copy needs updating, and any missed path leaves the system contradicting itself.",
        },
      },
      {
        id: "sql-vs-nosql",
        title: "Relational or document",
        level: "intermediate",
        body: [
          "Relational databases are the default for a reason: flexible querying, real constraints, and transactions across rows. Choose otherwise only with a reason you can state.",
          "Document stores suit data read as a whole unit, with a shape that varies per record. Key-value stores suit lookups by a single known key at very high volume.",
          "The honest version is that most applications fit a relational model, and Postgres handles JSON well enough to cover the semi-structured parts.",
        ],
        why: "'It scales better' is not a reason on its own — a managed Postgres handles more load than most products ever see. The reasons that hold up are access pattern and data shape.",
        check: {
          prompt: "Which is a sound reason to pick a document store over Postgres?",
          options: [
            "Documents are always faster",
            "Records vary in shape and are almost always read whole, by id",
            "Relational databases cannot scale past one server",
            "Schemas slow down development in all cases",
          ],
          correctIndex: 1,
          explain: "The defensible reason is access pattern and shape. Blanket performance and scaling claims do not survive contact with a properly indexed relational database.",
        },
      },
      {
        id: "connection-pooling",
        title: "Connection pooling",
        level: "advanced",
        body: [
          "Each database connection costs memory and a backend process. Postgres in particular struggles well before most people expect, often in the low hundreds of connections.",
          "Serverless platforms make this worse: every instance opens its own connections, and instances scale with traffic, so connections multiply exactly when load is highest.",
          "A pooler sits in front and multiplexes many client connections onto a small number of real ones.",
        ],
        why: "This is the failure that looks like a database problem and is not. The database is fine; you have exhausted its connection slots. Adding read replicas does not help, and a pooler does.",
        inPractice: "PgBouncer in transaction mode, or a managed equivalent such as Supabase's pooler or RDS Proxy, is the standard fix.",
        check: {
          prompt: "A serverless API starts failing with 'too many connections' under load. Best first fix?",
          options: [
            "Add read replicas",
            "Put a connection pooler in front of the database",
            "Increase the instance size",
            "Retry failed queries more aggressively",
          ],
          correctIndex: 1,
          explain: "The limit is connection slots, not query capacity. A pooler multiplexes many clients onto few real connections. Retrying harder makes it worse.",
        },
      },
    ],
  },

  {
    id: "concurrency",
    title: "Concurrency and operating systems",
    summary: "Threads, processes, async, and the bugs that only appear under load.",
    track: "foundations",
    topics: [
      {
        id: "process-thread-async",
        title: "Processes, threads and async",
        level: "beginner",
        body: [
          "Processes have separate memory and are isolated. Threads share memory within a process, which makes communication cheap and data races possible. Async runs many tasks on one thread by switching whenever a task waits.",
          "Async suits IO-bound work, where tasks spend most of their time waiting on network or disk. It does nothing for CPU-bound work, because there is no waiting to exploit.",
          "Node.js and Python asyncio are single-threaded and async. A CPU-heavy function blocks everything until it finishes.",
        ],
        why: "Choosing async for CPU-bound work is a common and expensive mistake. The question is what the work waits on, not which model is modern.",
        check: {
          prompt: "Your single-threaded async server stalls whenever a report is generated. Why?",
          options: [
            "Async is only for small applications",
            "Report generation is CPU-bound, so it blocks the event loop with nothing to switch to",
            "The database connection is saturated",
            "Async requires more memory",
          ],
          correctIndex: 1,
          explain: "Async multiplexes waiting, not computing. CPU-bound work must move to a worker thread, separate process, or background job.",
        },
      },
      {
        id: "race-conditions",
        title: "Race conditions and locks",
        level: "intermediate",
        body: [
          "A race condition is a correctness bug that depends on timing. Read-modify-write is the classic shape: two requests read the same value, both compute from it, and one result is lost.",
          "Locks prevent it by serialising access, at the cost of contention and the risk of deadlock when locks are taken in different orders.",
          "Often the better fix is to avoid the read entirely: an atomic increment, or a conditional update that fails if the row changed.",
        ],
        why: "Reaching for a lock is the first instinct and rarely the best one. Making the operation atomic removes the race instead of guarding it, with no contention and no deadlock.",
        check: {
          prompt: "Two requests both read stock = 1 and both sell the item. Cleanest fix?",
          options: [
            "Retry the failed request",
            "A conditional update that only succeeds if stock is still what you read, or an atomic decrement with a check",
            "Add a queue in front of the whole API",
            "Cache the stock value",
          ],
          correctIndex: 1,
          explain: "Removing the read-then-write gap removes the race. Conditional or atomic updates do this without locking or serialising unrelated traffic.",
        },
      },
      {
        id: "idempotency",
        title: "Idempotency",
        level: "intermediate",
        body: [
          "An idempotent operation can run repeatedly with the same result as running once. This matters because networks make retries unavoidable, and a timeout tells you nothing about whether the work happened.",
          "The standard approach is an idempotency key supplied by the client. The server records the key with its result and returns the stored result if the key reappears.",
          "Without it, a retried payment is a second payment.",
        ],
        why: "Any endpoint that changes state and can be retried needs this. It is the difference between at-least-once delivery being safe and being a liability.",
        inPractice: "Stripe requires an idempotency key on payment creation for exactly this reason.",
        check: {
          prompt: "A payment request times out. The client does not know whether it succeeded. What makes retrying safe?",
          options: [
            "Retrying only once",
            "An idempotency key, so the server recognises the retry and returns the original result",
            "A longer timeout",
            "Making the endpoint a GET",
          ],
          correctIndex: 1,
          explain: "A timeout is ambiguous by nature. The key lets the server tell a retry from a new request and avoid charging twice.",
        },
      },
      {
        id: "backpressure",
        title: "Backpressure",
        level: "advanced",
        body: [
          "When a system accepts work faster than it can complete it, the backlog grows. Queues fill, memory grows, latency climbs, and eventually it fails at the worst possible moment.",
          "Backpressure means refusing or slowing intake when downstream cannot keep up. Bounded queues, load shedding and rejecting early are all forms of it.",
          "Failing fast under overload is better behaviour than accepting everything and collapsing.",
        ],
        why: "Unbounded queues look like resilience and are the opposite: they convert a visible, recoverable rejection into a hidden backlog that fails later and harder.",
        check: {
          prompt: "Under heavy load, a service with an unbounded in-memory queue eventually crashes. Why is a bounded queue better?",
          options: [
            "It uses less memory in normal operation",
            "It rejects work early and visibly instead of accumulating a backlog that fails catastrophically later",
            "Bounded queues are faster to read from",
            "It removes the need for retries",
          ],
          correctIndex: 1,
          explain: "The bound turns silent accumulation into an explicit signal that callers can respond to, while the system stays alive.",
        },
      },
    ],
  },
];
