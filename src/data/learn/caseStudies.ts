import type { Card } from "./types";

/* The classic system design interview questions, answered the way a senior or
   staff candidate would: the constraint first, then the decision it forces. */

export const caseStudies: Card[] = [
  {
    id: "netflix",
    title: "Netflix",
    summary: "Streaming to hundreds of millions: why the hard part is delivery, not video.",
    track: "case-study",
    topics: [
      {
        id: "netflix-cdn",
        title: "Open Connect: their own CDN",
        level: "intermediate",
        body: [
          "Netflix is a large share of internet traffic at peak. Buying that from a commercial CDN would be enormously expensive and still not fast enough.",
          "So they build Open Connect appliances and give them to ISPs free, installed inside the ISP's own network, the video is already past the congested peering links before your request happens. Popular titles are pushed to those boxes overnight, during off-peak hours, predicted per region.",
        ],
        why: "The insight is that streaming is a predictable, cacheable workload. You know tomorrow's popular titles, so you can pre-position the bytes and turn a bandwidth problem into a storage problem, storage being far cheaper.",
        diagram: {
          caption: "Playback: control plane on AWS, bytes from a box inside your ISP",
          columns: [
            [{ id: "app", label: "Client app", sub: "TV, phone, browser", kind: "client" }],
            [
              { id: "api", label: "Playback API", sub: "AWS", kind: "service" },
              { id: "steer", label: "Steering service", sub: "picks best OCA", kind: "service" },
            ],
            [
              { id: "oca", label: "Open Connect", sub: "inside the ISP", kind: "edge" },
              { id: "meta", label: "Metadata + auth", sub: "AWS", kind: "data" },
            ],
            [{ id: "s3", label: "Master storage", sub: "S3, all renditions", kind: "data" }],
          ],
          edges: [
            { from: "app", to: "api", label: "play title" },
            { from: "api", to: "meta", label: "entitlement" },
            { from: "api", to: "steer" },
            { from: "steer", to: "app", label: "returns OCA URL" },
            { from: "app", to: "oca", label: "video segments" },
            { from: "s3", to: "oca", label: "pre-positioned overnight", async: true },
          ],
        },
        check: {
          prompt: "Why can Netflix pre-position content but a social feed cannot?",
          options: [
            "Video is immutable once encoded, while a feed changes on every write",
            "A feed must be strongly consistent, which an edge cache cannot offer",
            "ISPs will host video appliances but not general-purpose caches",
            "A finite catalogue with predictable demand, so tomorrow's hits go tonight",
          ],
          correctIndex: 3,
          explain: "Pre-positioning needs predictable demand over a bounded catalogue. A feed is generated per user from content that did not exist an hour ago.",
        },
      },
      {
        id: "netflix-microservices",
        title: "Microservices and the failure budget",
        level: "advanced",
        body: [
          "The Netflix backend is hundreds of services. A single home page assembles rows from many of them, so the probability that all are healthy at once is low.",
          "The system is therefore designed to render with whatever is available: if personalisation fails, show a sensible default row instead of an error.",
          "Chaos engineering came from here. Terminating instances deliberately in production is how you find out whether the fallbacks actually work.",
        ],
        why: "At that number of dependencies, treating any failure as fatal guarantees constant outages. Fallbacks are not a nicety, they are what makes the architecture viable at all.",
        check: {
          prompt: "With 200 services each 99.9% available, what does that imply for a page needing all of them?",
          options: [
            "Still 99.9%, since the services fail independently of one another",
            "Roughly 82%, independent failures compound across every dependency",
            "About 99.5%, because only the slowest service actually gates the page",
            "Around 80%, but only if the calls are made in sequence rather than parallel",
          ],
          correctIndex: 1,
          explain: "0.999 to the power of 200 is about 0.82. Compounding is why every non-essential dependency needs a fallback.",
        },
      },
      {
        id: "netflix-caching",
        title: "EVCache and cache invalidation across regions",
        level: "advanced",
        body: [
          "EVCache is Netflix's distributed cache layer, built on memcached, replicated within a region and across availability zones.",
          "Rather than coordinating precise global invalidation, they lean on short TTLs and versioned keys: a write bumps a version, and old entries simply become unreachable and expire. Cross-region coordinated deletes would be slower, more fragile, and would fail exactly when the network was already degraded.",
        ],
        why: "This is the practical answer to cache invalidation at global scale: make staleness bounded and self-healing instead of trying to make it zero. A delete that must succeed everywhere is a distributed transaction in disguise.",
        check: {
          prompt: "Why prefer versioned keys and short TTLs over coordinated global invalidation?",
          options: [
            "Cross-region deletes add latency to the write path, which users feel on every save",
            "Short TTLs already bound staleness, so invalidation messages become redundant",
            "A delete must reach every region to be correct; a new key version needs no coordination",
            "Versioned keys let each region choose which version to serve, avoiding contention",
          ],
          correctIndex: 2,
          explain: "Coordinated invalidation is a distributed transaction across regions and fails when the network does. Versioning degrades gracefully instead.",
        },
      },
    ],
  },

  {
    id: "uber",
    title: "Uber",
    summary: "Matching riders to drivers in real time, over geography, at city scale.",
    track: "case-study",
    topics: [
      {
        id: "uber-geo",
        title: "Geospatial indexing with H3",
        level: "advanced",
        body: [
          "Finding nearby drivers by comparing latitude and longitude means scanning everything, because neither coordinate on its own narrows the search usefully.",
          "Uber divides the world into hexagonal cells, their H3 library, so a location becomes a cell id, and finding nearby drivers becomes looking up a handful of ids. Hexagons rather than squares because every neighbour is equidistant, which makes expanding the search ring uniform.",
        ],
        why: "The move is turning a continuous two-dimensional problem into a discrete key lookup. Once location is a key, ordinary tools, hash maps, caches, shards, all work again.",
        diagram: {
          caption: "A ride request: match on cells, then track over a persistent connection",
          columns: [
            [
              { id: "rider", label: "Rider app", kind: "client" },
              { id: "driver", label: "Driver app", sub: "pings location", kind: "client" },
            ],
            [{ id: "gw", label: "API gateway", sub: "WebSocket", kind: "edge" }],
            [
              { id: "match", label: "Matching", sub: "supply and demand", kind: "service" },
              { id: "loc", label: "Location service", sub: "H3 cell index", kind: "service" },
              { id: "price", label: "Pricing", sub: "surge by cell", kind: "service" },
            ],
            [
              { id: "geo", label: "Driver index", sub: "Redis, cell to drivers", kind: "data" },
              { id: "trips", label: "Trip store", sub: "sharded by city", kind: "data" },
              { id: "kafka", label: "Event stream", sub: "Kafka", kind: "queue" },
            ],
          ],
          edges: [
            { from: "driver", to: "gw", label: "location every few sec" },
            { from: "gw", to: "loc" },
            { from: "loc", to: "geo", label: "update cell" },
            { from: "rider", to: "gw", label: "request ride" },
            { from: "gw", to: "match" },
            { from: "match", to: "geo", label: "drivers in nearby cells" },
            { from: "match", to: "price" },
            { from: "match", to: "trips", label: "create trip" },
            { from: "trips", to: "kafka", label: "events", async: true },
          ],
        },
        check: {
          prompt: "Why does cell-based indexing beat comparing latitude and longitude ranges?",
          options: [
            "It keeps nearby points close in the index, so a scan reads fewer pages",
            "It stores a precomputed distance, so no trigonometry runs at query time",
            "It turns a two-dimensional range scan into a lookup of a few discrete keys",
            "It bounds the error, so results stay correct regardless of cell size",
          ],
          correctIndex: 2,
          explain: "A bounding-box query on two independent columns cannot use one index efficiently. A cell id is a single key, so hashing and sharding work normally.",
        },
      },
      {
        id: "uber-surge",
        title: "Surge pricing as a control loop",
        level: "advanced",
        body: [
          "Surge is not primarily a revenue mechanism, it is a feedback loop balancing supply and demand within a geographic cell.",
          "When requests outnumber available drivers in a cell, the multiplier rises. That suppresses some demand and attracts drivers from neighbouring cells, and the imbalance closes.",
          "It must be computed per small area and updated continuously, because conditions differ street by street and change within minutes.",
        ],
        why: "Framing it as a control system, not a pricing lever, explains the design: it needs fast feedback, small granularity, and damping so it does not oscillate.",
        check: {
          prompt: "What does surge pricing primarily do to the system?",
          options: [
            "It rations scarce supply to the riders who value the trip most highly",
            "It raises revenue per ride, which funds driver incentives in that area",
            "It signals to riders that waiting a few minutes will be materially cheaper",
            "It is a feedback loop, cutting demand and drawing supply until the gap closes",
          ],
          correctIndex: 3,
          explain: "It is a control loop over a local imbalance. Revenue is a side effect; the function is clearing the market in that cell.",
        },
      },
      {
        id: "uber-sharding",
        title: "Sharding by city",
        level: "intermediate",
        body: [
          "Trips are overwhelmingly local. A rider and a driver are in the same city, and almost no query needs to join across cities.",
          "That makes city, or region, an excellent shard key: traffic distributes naturally and cross-shard queries are rare. It also isolates failure and allows per-city configuration, which matters because regulation and pricing differ by market.",
        ],
        why: "A good shard key follows a natural boundary in the domain. City works because it matches how the data is actually queried; user id would scatter the two halves of every trip.",
        check: {
          prompt: "Why is city a good shard key for trips?",
          options: [
            "Trips are local, so almost every query stays inside a single shard",
            "Cities are roughly equal in size, so the shards stay well balanced",
            "City is immutable for a trip, so a row never moves between shards",
            "It keeps the shard count low enough to fit in one connection pool",
          ],
          correctIndex: 0,
          explain: "Locality is the point: rider, driver and trip share a city, so queries rarely cross shards. Uneven city sizes are handled by splitting large ones.",
        },
      },
    ],
  },

  {
    id: "twitter-feed",
    title: "Twitter and news feeds",
    summary: "Fan-out on write versus read, and the celebrity problem.",
    track: "case-study",
    topics: [
      {
        id: "fanout",
        title: "Fan-out on write or on read",
        level: "advanced",
        body: [
          "Fan-out on write pushes each post into every follower's precomputed timeline. Reads become a single fast lookup, and writes get expensive.",
          "Fan-out on read builds the timeline when it is requested, by querying everyone you follow. Writes are cheap and reads are expensive.",
          "Neither survives the extremes. A million followers means a million inserts per post; following thousands of accounts means an enormous query on every refresh.",
          "Which is why real systems run both. Fan out on write for ordinary accounts, leave the handful with millions of followers out of it entirely, and merge their posts in at read time. The cost then tracks the median user, not the most extreme one in the system.",
        ],
        why: "Neither works alone, which is the actual answer: fan out on write for ordinary accounts, and merge in celebrity posts at read time. The hybrid exists because the follower distribution is extremely skewed.",
        diagram: {
          caption: "Hybrid: precomputed timelines for most, merged at read for large accounts",
          columns: [
            [{ id: "poster", label: "User posts", kind: "client" }],
            [{ id: "write", label: "Write service", kind: "service" }],
            [
              { id: "fan", label: "Fan-out worker", sub: "normal accounts", kind: "queue" },
              { id: "celeb", label: "Celebrity store", sub: "not fanned out", kind: "data" },
            ],
            [
              { id: "tl", label: "Timeline cache", sub: "Redis per user", kind: "data" },
              { id: "reader", label: "Read service", sub: "merges both", kind: "service" },
            ],
          ],
          edges: [
            { from: "poster", to: "write" },
            { from: "write", to: "fan", label: "if followers < threshold", async: true },
            { from: "write", to: "celeb", label: "if large account" },
            { from: "fan", to: "tl", label: "insert per follower", async: true },
            { from: "tl", to: "reader" },
            { from: "celeb", to: "reader", label: "merged at read" },
          ],
        },
        check: {
          prompt: "Why is pure fan-out on write impractical for accounts with millions of followers?",
          options: [
            "Timelines for inactive followers get written and then never read",
            "Follower lists change during the fan-out, so some followers are missed",
            "Redis cannot hold that many timeline keys in one instance's memory",
            "One post becomes millions of writes, a spike that delays delivery for everyone",
          ],
          correctIndex: 3,
          explain: "The write amplification is the problem. Excluding large accounts from fan-out and merging them at read keeps both paths bounded.",
        },
      },
      {
        id: "timeline-ranking",
        title: "Ranking a timeline",
        level: "advanced",
        body: [
          "Reverse chronological is simple and predictable. Ranked feeds score each candidate on predicted engagement, recency, affinity and content type.",
          "Ranking needs candidates first: retrieve a few hundred plausible posts cheaply, then score those expensively, because scoring everything is not affordable. That two-stage shape, cheap retrieval, expensive ranking, is how very nearly every recommendation system is built.",
        ],
        why: "Candidate generation then ranking is the general pattern worth carrying into any recommendation question. It bounds the expensive step regardless of corpus size.",
        check: {
          prompt: "Why do feed systems separate candidate generation from ranking?",
          options: [
            "Scoring everything is unaffordable, so a cheap step narrows it down first",
            "The ranking model needs features that exist only after candidates are chosen",
            "Candidate generation can run offline, while ranking must run per request",
            "It lets each source of candidates be tuned without retraining the model",
          ],
          correctIndex: 0,
          explain: "It bounds the cost of the expensive stage. Retrieval is cheap and approximate; ranking is precise and applied to a small set.",
        },
      },
    ],
  },

  {
    id: "whatsapp",
    title: "WhatsApp and chat",
    summary: "Delivery guarantees, ordering and end-to-end encryption at billions of messages.",
    track: "case-study",
    topics: [
      {
        id: "chat-delivery",
        title: "Delivery, receipts and offline users",
        level: "intermediate",
        body: [
          "A message is stored server-side until delivered, then usually deleted. The server is a relay with a queue attached, not an archive.",
          "The three ticks, sent, delivered, read, are acknowledgements flowing back at each stage, each one a separate event. Offline users make this a queue-per-recipient problem, drained when the device finally reconnects.",
        ],
        why: "Treating chat as a per-recipient queue instead of a shared log is what makes offline delivery and multi-device sync tractable.",
        diagram: {
          caption: "Message path with an offline recipient",
          columns: [
            [{ id: "a", label: "Sender", kind: "client" }],
            [{ id: "gw", label: "Gateway", sub: "persistent socket", kind: "edge" }],
            [
              { id: "msg", label: "Message service", kind: "service" },
              { id: "q", label: "Per-user queue", sub: "undelivered", kind: "queue" },
            ],
            [
              { id: "b", label: "Recipient", sub: "offline, then reconnects", kind: "client" },
              { id: "push", label: "Push notification", sub: "APNs, FCM", kind: "external" },
            ],
          ],
          edges: [
            { from: "a", to: "gw", label: "send" },
            { from: "gw", to: "msg" },
            { from: "msg", to: "q", label: "store if offline" },
            { from: "msg", to: "push", label: "wake device", async: true },
            { from: "q", to: "b", label: "drain on reconnect" },
            { from: "b", to: "msg", label: "delivered ack" },
            { from: "msg", to: "a", label: "ticks", async: true },
          ],
        },
        check: {
          prompt: "Why does the server queue per recipient rather than keeping one shared log?",
          options: [
            "Group messages would otherwise be stored once per group, not per member",
            "Each recipient has their own delivery state, and their copy goes once received",
            "Per-recipient queues let each device acknowledge at its own pace",
            "A shared log cannot be ordered per conversation across many recipients",
          ],
          correctIndex: 1,
          explain: "Delivery is per device and per user. A per-recipient queue makes 'what does this device still need' a direct question.",
        },
      },
      {
        id: "e2e",
        title: "End-to-end encryption and its consequences",
        level: "advanced",
        body: [
          "With end-to-end encryption the server relays ciphertext it cannot read. Keys live on devices, and each conversation has its own session.",
          "That removes entire categories of server-side feature: search across history, server-side spam classification on content, and web access without a linked device.",
          "Multi-device support becomes hard, because each device needs its own keys and its own copy of the session state.",
        ],
        why: "This is the clearest example of a security decision constraining the product. Choosing E2E means accepting that the server cannot help with anything requiring message content.",
        check: {
          prompt: "Which of these does end-to-end encryption make structurally hard, rather than merely fiddly?",
          options: [
            "Delivering to a second device, which needs the message re-encrypted per device",
            "Searching a user's history server-side, since the server holds only ciphertext",
            "Group messaging, which needs a separate key exchange with every member",
            "Delivery receipts, which must be produced without the server reading anything",
          ],
          correctIndex: 1,
          explain: "The server holds only ciphertext, so it cannot index content. Search must happen on-device over locally decrypted messages.",
        },
      },
    ],
  },

  {
    id: "classic-designs",
    title: "Classic interview systems",
    summary: "URL shortener, rate limiter, ticket booking, file sync, the ones that come up most.",
    track: "case-study",
    topics: [
      {
        id: "url-shortener",
        title: "URL shortener",
        level: "beginner",
        body: [
          "The core is a mapping from short key to long URL, read far more often than it is written, which makes it a caching problem more than a storage one.",
          "Keys can be generated by base62-encoding a counter, or by hashing and handling collisions. A counter gives short sequential keys and leaks your volume to anyone who looks; hashing does not.",
          "Redirects should be 301 or 302 deliberately. A 301 is cached by the browser, which is fast and makes click analytics impossible.",
          "The scale is smaller than it looks. Seven base62 characters is about 3.5 trillion keys, and the hot set fits in memory on one machine. This is a question about which tradeoffs you notice, not about capacity.",
        ],
        why: "The 301-versus-302 choice is the interesting decision. If you need per-click analytics you must use 302 and accept the traffic, because a cached 301 never reaches your server again.",
        check: {
          prompt: "A URL shortener redirects with 302 rather than 301. What does it gain, and what does it pay?",
          options: [
            "It gets a cacheable response, at the cost of never being able to change the target",
            "It avoids a redirect chain, at the cost of a slower first resolution",
            "It sees every click, at the cost of a request to its servers on each one",
            "It signals permanence to search engines, at the cost of losing link equity",
          ],
          correctIndex: 2,
          explain: "Permanent redirects are cached aggressively. That is a performance win and an analytics loss, so the answer depends on which you need.",
        },
      },
      {
        id: "ticket-booking",
        title: "Ticket booking and seat reservation",
        level: "advanced",
        body: [
          "The defining constraint is that a seat must not be sold twice, under a load spike concentrated on a few popular events.",
          "Seats are held with a short-lived reservation, typically a few minutes, created atomically, so a user has exclusive claim while paying.",
          "Expired holds must be released reliably, which means a background reaper or a TTL, not just an application timer.",
        ],
        why: "This is where optimistic concurrency stops working. Under contention for the same rows, optimistic retries mostly fail, so an explicit hold with a TTL is the correct model.",
        check: {
          prompt: "Why hold a seat rather than only checking availability at payment time?",
          options: [
            "The seat map would have to be re-read on every page, which is expensive",
            "Payment providers require the item reserved before a charge is authorised",
            "Refunds are harder than holds, so failing early is cheaper operationally",
            "Without an exclusive hold, two users both pass the check and both pay",
          ],
          correctIndex: 3,
          explain: "The gap between checking and paying is where the race lives. An atomic hold closes it, and the TTL stops abandoned carts locking inventory forever.",
        },
      },
      {
        id: "file-sync",
        title: "File sync, Dropbox style",
        level: "advanced",
        body: [
          "Files are split into chunks, each hashed. Only chunks whose hash changed are uploaded, so editing one page of a large document transfers very little.",
          "Identical chunks across users are stored once, which is deduplication and a large storage saving.",
          "Conflicts happen when two devices edit while offline. The usual resolution is to keep both as a conflicted copy instead of silently picking a winner.",
        ],
        why: "Content-addressed chunking gives deduplication, delta sync and integrity checking from one idea. Preferring a conflicted copy over automatic merge is a deliberate choice: silent data loss is worse than a confusing filename.",
        check: {
          prompt: "Why hash file chunks rather than whole files?",
          options: [
            "Only changed chunks upload, and identical chunks are stored once for everyone",
            "Chunk hashes are shorter, so the whole index of them fits in memory",
            "A whole-file hash changes on any edit, so nothing could ever be cached",
            "Chunks can be verified in parallel, which a single file hash cannot be",
          ],
          correctIndex: 0,
          explain: "Chunk-level hashing gives delta sync and cross-user deduplication together. A whole-file hash tells you only that something changed.",
        },
      },
    ],
  },
];
