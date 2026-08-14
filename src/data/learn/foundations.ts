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
          "Typing a URL sets off DNS resolution, a TCP handshake, a TLS handshake, then the HTTP request itself. Each costs at least one round trip — TLS 1.3 needs one and TLS 1.2 needs two — and round trips are the thing that costs you.",
          "A user 200ms away pays that 200ms per round trip. Four round trips before a single byte of content is 800ms of nothing on screen. This is why latency, not bandwidth, dominates perceived speed.",
          "Once you can name the steps, most performance work becomes obvious: remove round trips, or move the server closer to the user.",
        ],
        why: "Interviewers open with this because it reveals whether you think in terms of round trips or in terms of vague slowness. The answer that names DNS, TCP, TLS and HTTP separately is the one that can then reason about a CDN.",
        check: {
          prompt: "A page takes 900ms to start rendering for users in Australia and 120ms in London, on the same server in London. What is the dominant cause?",
          options: [
            "The origin runs out of worker threads once distant connections pile up",
            "Peering between Australian ISPs and the London origin is congested",
            "Round-trip latency from distance, multiplied by every handshake in the chain",
            "TLS session resumption is unavailable, forcing those clients into a full handshake",
          ],
          correctIndex: 2,
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
            "UDP's lower per-packet overhead matters once you are sending at video bitrates",
            "TCP congestion control throttles the stream below the bitrate a call needs",
            "UDP still delivers packets in order, but without acknowledging each one",
            "A retransmitted frame arrives too late to use, and waiting stalls everything after",
          ],
          correctIndex: 3,
          explain: "In a call, a frame from 400ms ago is worthless. TCP would stall the stream waiting for it; UDP drops it and moves on, which is what you want.",
        },
      },
      {
        id: "http-versions",
        title: "HTTP/1.1, HTTP/2 and HTTP/3",
        level: "intermediate",
        body: [
          "HTTP/1.1 pipelining is in the spec but effectively unused, so in practice a connection carries one request at a time. Browsers open six per host and developers bundle files to work around it.",
          "HTTP/2 multiplexes many streams over one connection, which removes the need for most bundling tricks. It still runs on TCP, so one lost packet blocks every stream sharing that connection.",
          "HTTP/3 moves to QUIC over UDP, where each stream is independent. Loss affects one stream instead of all of them, which matters most on mobile networks.",
        ],
        why: "Sprite sheets, domain sharding and aggressive bundling were workarounds for an HTTP/1.1 limit. Carrying them into an HTTP/2 or HTTP/3 world adds complexity for no gain, and can hurt caching.",
        check: {
          prompt: "Why does HTTP/2 still suffer head-of-line blocking despite multiplexing?",
          options: [
            "Multiplexing is capped at six concurrent streams per connection by default",
            "It runs over TCP, which is ordered, so one lost packet stalls every stream",
            "TLS record boundaries do not align with stream frames, forcing serialisation",
            "Header compression state is shared, so one stream must finish before the next",
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
            "The change propagates down from the root servers, which takes hours",
            "Negative caching of the old record persists independently of its TTL",
            "Clients that already opened a connection keep using it until it closes",
            "TTL is advisory — some resolvers and clients cache for longer than you ask",
          ],
          correctIndex: 3,
          explain:
            "TTL is a request, not a guarantee, and some resolvers cache well past it. Propagation from the root is the folk explanation and it is wrong: the root is never consulted for a record already cached downstream. Plan cutovers so the old address keeps working, or fail over behind a stable address instead.",
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
            "Serving from edge locations near users, which removes most of the round trips",
            "Adding application servers in the same region, to cut queueing under load",
            "Enabling HTTP/3, so the connection survives the packet loss on long paths",
            "Raising the connection pool size, so distant clients stop waiting for a slot",
          ],
          correctIndex: 0,
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
            "Constant factors dominate at small n, and insertion sort's overhead is tiny",
            "Insertion sort runs in O(n) on the nearly-sorted runs that partitioning leaves",
            "Recursing into small partitions risks overflowing the call stack",
            "It avoids the scratch buffer that merge sort has to allocate",
          ],
          correctIndex: 0,
          explain:
            "Big-O drops constants, and constants are exactly what decides it at small n. Insertion sort's near-zero overhead wins despite the worse asymptotic class. Its behaviour on nearly-sorted input is real and is what Timsort exploits, but that is not why quicksort hands off to it — the handoff happens on partitions of arbitrary order.",
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
            "Unbounded key length lets an attacker make each hash computation expensive",
            "Resizing rehashes every entry, so growth pauses the map under insert load",
            "Keys chosen to collide into one bucket turn every lookup into a linear scan",
            "Without synchronisation, concurrent writes can corrupt a bucket's chain",
          ],
          correctIndex: 2,
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
            "Binary trees degrade to a linked list unless rebalanced on every insert",
            "High fanout keeps the tree shallow, and each level costs an expensive read",
            "Node size is matched to the disk page, so no read is ever wasted",
            "B-trees keep the keys in each node sorted, which binary trees cannot do",
          ],
          correctIndex: 1,
          explain:
            "Disk reads dominate, so the goal is fewer levels. Packing many keys per node makes a lookup cost a handful of reads rather than one per level. Matching node size to the page is true and it is how fanout gets high in the first place — it is the mechanism, not the reason.",
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
          prompt: "What can a Bloom filter tell you with certainty about a particular key?",
          options: [
            "That it is present, with a false positive rate you configure up front",
            "That it is definitely absent, on the occasions when the filter says so",
            "That it is present or absent exactly, once sized for the expected key count",
            "That it was inserted before any other key currently held in the filter",
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
          prompt: "Two transactions SELECT a balance of 100 into application code, each compute 40, and each write it back. What prevents the lost update by default?",
          options: [
            "Row locks, which serialise the two writes so the second sees the first",
            "Atomicity, which is precisely the property the A in ACID is naming here",
            "The database detects the write-write conflict and aborts one transaction",
            "Nothing at read committed — you need a higher isolation level, or a lock",
          ],
          correctIndex: 3,
          explain: "Read committed permits this because the value was read into the application and written back later. Note that a single UPDATE ... SET balance = balance - 60 would be safe: row locks serialise it. The gap between reading and writing is what creates the bug.",
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
          prompt: "You have an index on (country, city). Which query can it not seek on efficiently?",
          options: [
            "WHERE country = 'UK'",
            "WHERE country = 'UK' AND city = 'London'",
            "WHERE city = 'London'",
            "WHERE country = 'UK' ORDER BY city",
          ],
          correctIndex: 2,
          explain: "A composite index is sorted by its leading column, so without country there is no seekable prefix for city. Some engines can still skip-scan or use it as a narrower substitute for a full table scan, but neither is a real seek.",
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
            "Every duplicated copy is another place the data can drift out of sync",
            "Writes get slower, since each one now has to touch several tables",
            "The planner loses the foreign key it used to choose a join order",
            "Extra disk space, which stops being negligible at large row counts",
          ],
          correctIndex: 0,
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
            "Schema changes need no migration, so the team can ship features faster",
            "Write throughput is higher, since there are no constraints to check",
            "Records vary in shape and are nearly always read whole, by their id",
            "Horizontal sharding is available there and is not available in Postgres",
          ],
          correctIndex: 2,
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
            "Raise max_connections on the database so the slots stop running out",
            "Put a pooler in front, multiplexing many clients onto few real connections",
            "Add read replicas, spreading the connections over more instances",
            "Shorten the statement timeout so connections return to the pool sooner",
          ],
          correctIndex: 1,
          explain:
            "The limit is connection slots, not query capacity, and a pooler multiplexes many clients onto few real ones. Raising max_connections is the tempting fix and it buys very little: each connection is a backend process with its own memory, so the ceiling moves a bit and then the database runs out of RAM instead.",
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
            "The report holds a database connection, starving other requests of one",
            "Garbage collection from the report's allocations pauses the whole process",
            "Async frameworks serialise requests that land on the same route handler",
            "Report generation is CPU-bound, so it blocks the loop with nothing to yield to",
          ],
          correctIndex: 3,
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
            "A conditional update that only applies if stock still equals what you read",
            "Wrap each request in a transaction, which isolates it from the other",
            "Re-read the stock value immediately before writing, and abort if it changed",
            "Serialise writes through a single queue consumer, one order at a time",
          ],
          correctIndex: 0,
          explain:
            "Removing the read-then-write gap removes the race, and a conditional update does it without serialising unrelated traffic. Re-reading just before the write is the answer that feels careful and is not: it narrows the window without closing it, because the check and the write are still two statements.",
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
            "Have the client poll for the payment's status before deciding to retry",
            "Make the endpoint a PUT, since PUT is idempotent by HTTP semantics",
            "An idempotency key, so the server knows a retry from a new request",
            "Raise the timeout past the payment provider's worst-case response time",
          ],
          correctIndex: 2,
          explain:
            "A timeout is ambiguous by nature; the key lets the server tell a retry from a new request. PUT being idempotent is a statement about what the method promises, not about what your handler does — naming it PUT and charging the card twice breaks the promise rather than fulfilling it.",
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
            "It rejects work early and visibly, rather than failing catastrophically later",
            "It bounds memory, so the process stays inside its container's limit",
            "It keeps latency predictable, since the queue cannot grow past its bound",
            "A fixed-size buffer can be preallocated, avoiding allocation under load",
          ],
          correctIndex: 0,
          explain:
            "The bound turns silent accumulation into a signal callers can act on, while the system stays up. Bounding memory and stabilising latency are both real consequences, but they follow from the rejection; a queue that filled and then quietly dropped work would achieve them too, and would be worse than the crash.",
        },
      },
    ],
  },
];
