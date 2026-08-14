import type { Card } from "./types";

/* Second half of the system design track: APIs, real-time, search, storage,
   identity, coordination, and the data plane. */

export const design2: Card[] = [
  {
    id: "api-design",
    title: "API design",
    summary: "REST, GraphQL, gRPC and webhooks — and which problem each one actually solves.",
    track: "design",
    topics: [
      {
        id: "rest",
        title: "REST and resource modelling",
        level: "beginner",
        body: [
          "REST models the system as resources addressed by URL, with HTTP verbs describing the action and status codes describing the outcome.",
          "The value is that everything already understands it: caches, proxies, browsers and load balancers all act correctly on a GET without being told anything.",
          "Most APIs called RESTful are really HTTP-with-JSON, which is fine. The parts worth keeping are correct verbs, correct status codes and cacheable GETs.",
        ],
        why: "Sticking to standard verbs and codes is not pedantry: it is what lets a CDN cache your GET, a proxy retry safely, and a client library behave sensibly without custom logic.",
        check: {
          prompt: "Why does using POST for a read-only search endpoint cost you something?",
          options: [
            "POST is slower than GET",
            "POST responses are not cacheable by default, so CDNs and browsers cannot help",
            "POST cannot carry parameters",
            "It breaks HTTPS",
          ],
          correctIndex: 1,
          explain: "Verbs carry meaning to infrastructure. A GET can be cached and safely retried; a POST is assumed to change state and is neither.",
        },
      },
      {
        id: "graphql",
        title: "GraphQL and its costs",
        level: "intermediate",
        body: [
          "GraphQL lets the client ask for exactly the fields it needs in one request, which solves over-fetching and the round trips of chatty REST APIs.",
          "It moves complexity to the server. Arbitrary client queries can be arbitrarily expensive, so you need query depth limits, cost analysis and dataloader batching to avoid N+1 database calls.",
          "HTTP caching largely stops working, because every query is a POST to one endpoint.",
        ],
        why: "GraphQL earns its keep with many clients that need different shapes of the same data — a mobile app and a web app, say. For a single first-party client it is usually complexity without payoff.",
        check: {
          prompt: "What is the main operational cost of adopting GraphQL?",
          options: [
            "It requires a specific database",
            "Clients can compose expensive queries, and HTTP-level caching no longer applies",
            "It cannot express mutations",
            "It only works with JavaScript",
          ],
          correctIndex: 1,
          explain: "Query flexibility is the feature and the risk. You take on cost limiting, batching, and your own caching layer.",
        },
      },
      {
        id: "grpc",
        title: "gRPC and binary protocols",
        level: "intermediate",
        body: [
          "gRPC uses Protocol Buffers over HTTP/2: a compact binary encoding with a schema, code generation for clients, and streaming in both directions.",
          "It is markedly faster and smaller on the wire than JSON, and the schema makes breaking changes visible at build time.",
          "It is awkward from browsers without a proxy, and much harder to debug by hand because you cannot read it.",
        ],
        why: "The usual split is gRPC between your own services, where performance and schemas matter, and REST or GraphQL at the public edge, where reach and debuggability matter more.",
        check: {
          prompt: "Where does gRPC typically fit best?",
          options: [
            "Public browser-facing APIs",
            "Internal service-to-service calls where performance and schema enforcement matter",
            "Static asset delivery",
            "Webhook delivery to third parties",
          ],
          correctIndex: 1,
          explain: "Browsers need a proxy and third parties expect JSON. Internally, where both ends are yours, the performance and typing are worth it.",
        },
      },
      {
        id: "webhooks",
        title: "Webhooks and delivery",
        level: "advanced",
        body: [
          "A webhook inverts the direction: instead of clients polling you, you call them when something happens. It removes polling load and reduces latency.",
          "You now own a delivery problem. Receivers go down, respond slowly, or fail intermittently, so you need retries with backoff, a dead letter path and visibility into failures.",
          "Receivers need to verify the payload came from you, usually via an HMAC signature over the body with a shared secret, plus a timestamp to prevent replay.",
        ],
        why: "Sending a webhook is easy; delivering reliably is the actual product. Without signing, your webhook endpoint is an unauthenticated write API for anyone who learns the URL.",
        inPractice: "Stripe signs every webhook with an HMAC and a timestamp, and retries with exponential backoff for up to three days.",
        check: {
          prompt: "Why sign webhook payloads with an HMAC rather than relying on a secret URL?",
          options: [
            "To compress the payload",
            "A URL can leak and cannot be verified; a signature proves the body came from you and was not altered",
            "To support HTTP/2",
            "To allow retries",
          ],
          correctIndex: 1,
          explain: "A secret URL is a bearer token in a place that leaks — logs, referrers, proxies. A signature over the body authenticates every individual request.",
        },
      },
      {
        id: "versioning",
        title: "Versioning and breaking changes",
        level: "advanced",
        body: [
          "Additive changes are safe: new optional fields, new endpoints. Removing a field, renaming one, or tightening validation breaks existing clients.",
          "URL versioning is explicit and easy to route. Header versioning keeps URLs stable. Either works; consistency matters more than the choice.",
          "The hard part is retirement. Old versions live as long as clients use them, so you need usage telemetry per version and a deprecation process with real deadlines.",
        ],
        why: "Most teams version and then never remove anything, so every version is maintained forever. Measuring usage per version is what makes deprecation possible at all.",
        check: {
          prompt: "Which is a backwards-compatible API change?",
          options: [
            "Renaming a response field for clarity",
            "Adding a new optional response field",
            "Making an optional request field required",
            "Changing a status code from 200 to 204",
          ],
          correctIndex: 1,
          explain: "Additions are safe because existing clients ignore unknown fields. Renames, new requirements and changed codes all break someone.",
        },
      },
    ],
  },

  {
    id: "realtime",
    title: "Real-time and push",
    summary: "WebSockets, SSE, polling and pub/sub — and how to scale a connection you keep open.",
    track: "design",
    topics: [
      {
        id: "push-options",
        title: "Polling, long polling, SSE, WebSockets",
        level: "beginner",
        body: [
          "Polling asks repeatedly on a timer. Simple, wasteful, and latency is bounded by the interval. Long polling holds the request open until there is news, which cuts waste but ties up a connection.",
          "Server-sent events are a one-way stream from server to client over plain HTTP, with automatic reconnection built in.",
          "WebSockets give a persistent two-way channel, which is what you need when the client also sends frequently.",
        ],
        why: "SSE is underrated: if data only flows server to client — notifications, live prices, progress — it is far simpler than WebSockets and works through ordinary HTTP infrastructure.",
        check: {
          prompt: "A dashboard receives live updates but never sends anything back. Simplest fit?",
          options: ["WebSockets", "Server-sent events", "Long polling", "gRPC streaming"],
          correctIndex: 1,
          explain: "One-way server to client is exactly what SSE is for, and it reconnects automatically over standard HTTP. WebSockets add bidirectional capability you would not use.",
        },
      },
      {
        id: "scaling-connections",
        title: "Scaling persistent connections",
        level: "advanced",
        body: [
          "Persistent connections are stateful, which breaks the usual assumption that any server can handle any request. A message for a user must reach the exact server holding that user's socket.",
          "The standard answer is a pub/sub layer: servers subscribe to channels, and a publish fans out to whichever server holds the connection.",
          "Deploys become disruptive, because restarting a server drops every connection it holds. Clients need reconnection with backoff, and ideally resume from a last-seen message id.",
        ],
        why: "This is why chat and presence systems are hard. Statelessness is what makes normal web services easy to scale, and holding a socket throws it away.",
        inPractice: "Slack and Discord both route messages through a pub/sub tier so any gateway node can deliver to any connected client.",
        check: {
          prompt: "With users' WebSockets spread across many servers, how does a message reach the right one?",
          options: [
            "Sticky sessions at the load balancer",
            "A pub/sub layer that fans the message out to whichever server holds that connection",
            "Broadcasting to every client",
            "Polling the database from each server",
          ],
          correctIndex: 1,
          explain: "Stickiness routes a client to a server; it does not help a message originating elsewhere find that server. Pub/sub decouples the sender from the connection's location.",
        },
      },
      {
        id: "presence",
        title: "Presence and typing indicators",
        level: "advanced",
        body: [
          "Presence looks trivial and is one of the most expensive features in a chat product. Every state change potentially notifies everyone who can see that user.",
          "The volume is quadratic in the worst case, and the data is worthless within seconds, so it is usually kept in memory with short TTLs rather than persisted.",
          "Typing indicators are throttled hard and often dropped under load, because they are the first thing worth sacrificing.",
        ],
        why: "Presence is the standard example of a feature whose cost is invisible in the spec. Recognising it as a fan-out problem rather than a storage problem is the insight being tested.",
        check: {
          prompt: "Why is presence expensive at scale?",
          options: [
            "Presence data is large",
            "Each change fans out to everyone subscribed to that user, so cost grows with the size of the social graph",
            "It requires strong consistency",
            "It cannot be cached",
          ],
          correctIndex: 1,
          explain: "The payload is tiny; the fan-out is the cost. A user with many watchers generates many notifications per state change.",
        },
      },
    ],
  },

  {
    id: "search",
    title: "Search and ranking",
    summary: "Inverted indexes, relevance, and why your database LIKE query does not scale.",
    track: "design",
    topics: [
      {
        id: "inverted-index",
        title: "The inverted index",
        level: "intermediate",
        body: [
          "A normal index maps a row to its values. An inverted index maps each term to the list of documents containing it, which is what makes full-text search fast.",
          "Text is normalised first: lowercased, split into tokens, stemmed so 'running' matches 'run', and stripped of stop words.",
          "A LIKE '%term%' query cannot use a B-tree index at all, so it scans every row. That is fine at ten thousand rows and hopeless at ten million.",
        ],
        why: "This is why search moves to a dedicated engine. It is not that the database is slow; it is that the data structure required for text search is a different one.",
        check: {
          prompt: "Why can't a B-tree index serve LIKE '%shoes%'?",
          options: [
            "B-trees do not store text",
            "The leading wildcard means there is no prefix to seek on, so the index ordering is useless",
            "LIKE is not supported on indexed columns",
            "Text columns cannot be indexed",
          ],
          correctIndex: 1,
          explain: "B-trees are sorted by prefix. A leading wildcard removes the starting point, forcing a full scan.",
        },
      },
      {
        id: "relevance",
        title: "Relevance and ranking",
        level: "advanced",
        body: [
          "Matching is the easy half. Ranking decides which of ten thousand matches appear first, and that is what users judge.",
          "TF-IDF and BM25 weight terms by how often they appear in a document against how common they are overall, so rare terms count for more.",
          "Real systems blend text relevance with business signals: recency, popularity, stock, personalisation. Tuning that blend is ongoing work, not a one-off.",
        ],
        why: "Treating search as a matching problem produces technically correct results that feel broken. The measurable target is click-through and successful sessions, not recall.",
        check: {
          prompt: "Search returns correct matches but users complain. Most likely cause?",
          options: [
            "The index is stale",
            "Ranking — the right documents are present but not near the top",
            "The query parser is broken",
            "Too few shards",
          ],
          correctIndex: 1,
          explain: "If matches are correct, the failure is ordering. Users rarely look past the first few results, so ranking is the product.",
        },
      },
      {
        id: "search-sync",
        title: "Keeping the index in sync",
        level: "advanced",
        body: [
          "The search index is a second copy of the data, so it can drift. Dual writes — writing to the database and index in the same request — fail when one succeeds and the other does not.",
          "The reliable pattern is to write to the database, then derive the index from the change log, so the database remains the single source of truth.",
          "You also need a full reindex path, because index mappings change and drift accumulates.",
        ],
        why: "Change data capture beats dual writes because it has one commit point. With dual writes there is always a window where a crash leaves the two permanently inconsistent.",
        check: {
          prompt: "Why are dual writes to database and search index fragile?",
          options: [
            "They are slower",
            "There is no shared transaction, so a failure after the first write leaves them permanently divergent",
            "Search engines do not accept writes",
            "They require more connections",
          ],
          correctIndex: 1,
          explain: "Two systems, two commits, no atomicity. Deriving the index from the database's change log gives one authoritative ordering.",
        },
      },
    ],
  },

  {
    id: "storage-media",
    title: "Storage and media",
    summary: "Object storage, uploads, and delivering video without paying for it twice.",
    track: "design",
    topics: [
      {
        id: "object-storage",
        title: "Object storage versus databases and disks",
        level: "beginner",
        body: [
          "Object storage such as S3 holds immutable blobs addressed by key, with effectively unlimited capacity and very low cost per gigabyte.",
          "Storing files in a database inflates backups, slows replication and wastes expensive storage on data that needs no querying.",
          "The standard shape is the file in object storage and its metadata — key, size, owner, content type — in the database.",
        ],
        why: "The rule is to store what you query in the database and what you serve in object storage. Blobs in Postgres make every operational task on that database slower forever.",
        check: {
          prompt: "Where should user-uploaded images live?",
          options: [
            "As BLOBs in the primary database",
            "In object storage, with metadata rows in the database",
            "On the application server's local disk",
            "In Redis",
          ],
          correctIndex: 1,
          explain: "Blobs bloat backups and replication; local disk is lost when the instance is replaced. Object storage plus metadata is the durable, cheap split.",
        },
      },
      {
        id: "presigned-uploads",
        title: "Direct uploads with pre-signed URLs",
        level: "intermediate",
        body: [
          "Routing uploads through your API means large files consume your bandwidth, memory and request timeouts for no benefit.",
          "A pre-signed URL lets your server authorise an upload and hand the client a time-limited URL to send the bytes straight to object storage.",
          "The server then learns about completion via an event, and validates type and size before treating the object as real.",
        ],
        why: "This removes an entire scaling problem rather than solving it. Your API stays small and fast because the large payloads never touch it.",
        check: {
          prompt: "Main benefit of pre-signed direct uploads?",
          options: [
            "Files are compressed automatically",
            "Large payloads bypass your servers entirely, so upload size stops affecting API capacity",
            "Uploads become transactional",
            "It removes the need for authentication",
          ],
          correctIndex: 1,
          explain: "The server authorises but never carries the bytes, so a 2GB upload costs it one small signing request.",
        },
      },
      {
        id: "video-delivery",
        title: "Video: transcoding and adaptive bitrate",
        level: "advanced",
        body: [
          "An uploaded video is transcoded into several resolutions and bitrates, then split into short segments with a manifest listing what is available.",
          "The player measures throughput and switches between renditions per segment, so a dropping connection degrades quality instead of stalling.",
          "This is HLS or DASH, and it is why streaming survives a train tunnel while a single MP4 does not.",
        ],
        why: "Adaptive bitrate exists because bandwidth is variable and unpredictable. Serving one file forces a choice between buffering for slow connections and wasting quality on fast ones.",
        inPractice: "Netflix encodes each title into many renditions and tunes them per title — an animated film and a dark action film need different bitrates for the same perceived quality.",
        check: {
          prompt: "Why segment video and offer multiple renditions?",
          options: [
            "To reduce total storage",
            "So the player can switch quality per segment as available bandwidth changes",
            "To enable DRM",
            "Because CDNs cannot cache large files",
          ],
          correctIndex: 1,
          explain: "Per-segment switching turns a bandwidth drop into lower quality rather than a stall, which is what users actually tolerate.",
        },
      },
    ],
  },

  {
    id: "identity",
    title: "Identity, auth and security",
    summary: "Sessions, tokens, OAuth, and the mistakes that become incidents.",
    track: "design",
    topics: [
      {
        id: "authn-authz",
        title: "Authentication and authorisation",
        level: "beginner",
        body: [
          "Authentication establishes who you are. Authorisation decides what you may do. They fail differently and are often confused in code.",
          "Most serious access-control bugs are authorisation bugs: the user is correctly identified, and the system simply never checks whether this user may touch this record.",
          "Checking ownership at the data layer, rather than in each handler, is what stops one missed check becoming a breach.",
        ],
        why: "Insecure direct object reference — changing an id in a URL and seeing someone else's data — is consistently among the most common real vulnerabilities, and it is purely a missing authorisation check.",
        check: {
          prompt: "A logged-in user changes an id in the URL and sees another customer's invoice. What failed?",
          options: [
            "Authentication",
            "Authorisation — identity was established but ownership was never checked",
            "Encryption",
            "Session management",
          ],
          correctIndex: 1,
          explain: "They authenticated correctly. Nothing verified that this invoice belongs to them, which is an authorisation failure.",
        },
      },
      {
        id: "sessions-vs-jwt",
        title: "Sessions or JWTs",
        level: "intermediate",
        body: [
          "A session id is a reference: the server holds the state and can revoke it instantly. It requires a lookup per request.",
          "A JWT carries claims and a signature, so it validates without a lookup. That is also why it cannot be revoked before it expires.",
          "The usual compromise is short-lived access tokens with longer-lived refresh tokens that can be revoked.",
        ],
        why: "JWTs are frequently chosen for statelessness and then paired with a revocation list, which reintroduces the lookup and leaves you with the drawbacks of both.",
        check: {
          prompt: "Why can't you immediately revoke a standard JWT?",
          options: [
            "It is encrypted",
            "It is self-contained and validated by signature, so the server consults no state that could mark it invalid",
            "It has no expiry",
            "Only the client can revoke it",
          ],
          correctIndex: 1,
          explain: "Validation is local by design. Revocation requires shared state, which is exactly what the token was chosen to avoid.",
        },
      },
      {
        id: "oauth",
        title: "OAuth and OpenID Connect",
        level: "advanced",
        body: [
          "OAuth is delegated authorisation: it lets an application act on a user's behalf without holding their password. It is not a login protocol.",
          "OpenID Connect is the layer on top that adds identity, returning an ID token describing who the user is.",
          "'Sign in with Google' is OpenID Connect. Using raw OAuth for login means inferring identity from an access token, which is the source of several classic vulnerabilities.",
        ],
        why: "Conflating the two is the common error. If you need to know who the user is, you want OIDC's ID token, not an access token that merely proves you may call an API.",
        check: {
          prompt: "What does OpenID Connect add to OAuth?",
          options: [
            "Encryption of tokens",
            "An identity layer — an ID token stating who the user is",
            "Refresh tokens",
            "Rate limiting",
          ],
          correctIndex: 1,
          explain: "OAuth grants access to resources. OIDC adds authenticated identity, which is what login actually requires.",
        },
      },
      {
        id: "secrets",
        title: "Secrets and encryption",
        level: "intermediate",
        body: [
          "Secrets belong in a manager with rotation and audit, not in environment variables committed to a repository or baked into images.",
          "Passwords are hashed with a slow algorithm designed for it — bcrypt, scrypt or Argon2 — never a fast general-purpose hash like SHA-256, which is trivially brute-forced.",
          "Encryption in transit is table stakes. Encryption at rest matters mostly for stolen disks and compliance, and protects far less than people assume.",
        ],
        why: "Using SHA-256 for passwords is fast, which is precisely the flaw: an attacker with the hashes can try billions per second. The slowness of bcrypt is the feature.",
        check: {
          prompt: "Why is SHA-256 the wrong choice for password hashing?",
          options: [
            "It is not cryptographically secure",
            "It is fast, so offline brute-force attacks are cheap — password hashing needs deliberate slowness",
            "It produces collisions",
            "It cannot be salted",
          ],
          correctIndex: 1,
          explain: "SHA-256 is fine as a hash and wrong here. bcrypt and Argon2 are deliberately expensive with a tunable cost factor.",
        },
      },
    ],
  },

  {
    id: "coordination",
    title: "Coordination and distributed state",
    summary: "Leader election, consensus, distributed transactions and unique ids.",
    track: "design",
    topics: [
      {
        id: "leader-election",
        title: "Leader election",
        level: "advanced",
        body: [
          "Many systems need exactly one node doing something — running a scheduled job, accepting writes, coordinating a cluster. Leader election picks that node and replaces it when it dies.",
          "Doing it correctly is subtle: two nodes both believing they are leader is a split brain, and it corrupts data quietly.",
          "Almost nobody should implement this. Use etcd, ZooKeeper or a database lease with fencing tokens.",
        ],
        why: "The naive version — a lock row with a timeout — fails when the leader pauses for garbage collection, wakes up believing it still holds the lock, and writes over the new leader. Fencing tokens exist to reject those late writes.",
        check: {
          prompt: "A leader stalls for 30s, its lease expires, a new leader is elected, then the old one resumes and writes. What prevents corruption?",
          options: [
            "A longer lease",
            "Fencing tokens — each leadership term has an increasing number, and stale-term writes are rejected",
            "Retrying the write",
            "A faster health check",
          ],
          correctIndex: 1,
          explain: "You cannot prevent the pause, so the storage layer must reject writes carrying an old term number. That is what fencing does.",
        },
      },
      {
        id: "consensus",
        title: "Consensus: Raft and Paxos",
        level: "advanced",
        body: [
          "Consensus is getting a group of nodes to agree on a value despite failures. Raft and Paxos are the standard algorithms; Raft is deliberately easier to understand.",
          "They work by majority quorum, which is why clusters are sized 3 or 5. A majority must agree, so the cluster survives losing fewer than half its members.",
          "Every write costs a round trip to a quorum, so consensus is correctness bought with latency.",
        ],
        why: "This is why you size clusters odd and why cross-region consensus is painful: a quorum spanning continents pays the worst inter-region latency on every write.",
        check: {
          prompt: "Why are consensus clusters usually 3 or 5 nodes rather than 4?",
          options: [
            "Odd numbers are faster",
            "Fault tolerance is floor((n-1)/2), so 4 nodes tolerate the same single failure as 3 while costing more",
            "Even clusters cannot elect a leader",
            "It is a licensing constraint",
          ],
          correctIndex: 1,
          explain: "3 and 4 both tolerate one failure, so the fourth node adds cost and no resilience; 5 is the next step that tolerates two. Note the common explanation — that odd sizes avoid ties — is wrong: a majority of 4 is 3, so a majority quorum cannot tie.",
        },
      },
      {
        id: "saga",
        title: "Distributed transactions and sagas",
        level: "advanced",
        body: [
          "A transaction across several services cannot use a database transaction. Two-phase commit exists but blocks when the coordinator fails, so it is rare in practice.",
          "A saga breaks the work into local transactions, each with a compensating action that undoes it. Book the flight, book the hotel, and if the hotel fails, cancel the flight.",
          "Compensation is not rollback: the intermediate state was visible, and undoing may be impossible for actions like sending an email.",
        ],
        why: "The design work is deciding what compensation means for each step. Some actions genuinely cannot be undone, which forces you to order the saga so the irreversible steps come last.",
        check: {
          prompt: "How does a saga differ from a database transaction?",
          options: [
            "It is faster",
            "Intermediate states are visible and undo happens via compensating actions, not rollback",
            "It guarantees isolation",
            "It only works within one service",
          ],
          correctIndex: 1,
          explain: "Each step commits locally, so partial state is observable. Compensation is a new action that reverses effects, which is not always fully possible.",
        },
      },
      {
        id: "unique-ids",
        title: "Generating unique ids at scale",
        level: "intermediate",
        body: [
          "Auto-increment ids need a single coordinator, which becomes a bottleneck and does not survive sharding.",
          "Random UUIDs need no coordination but are large and, being random, scatter B-tree inserts across the index, which hurts write performance badly.",
          "Snowflake-style ids pack a timestamp, a machine id and a counter into 64 bits: unique without coordination, and roughly time-ordered so inserts stay sequential.",
        ],
        why: "Time ordering is the underrated property. Random UUIDs as a primary key cause page splits across the whole index; UUIDv7 and Snowflake ids keep inserts near the end where they belong.",
        check: {
          prompt: "Why can random UUID primary keys hurt insert performance?",
          options: [
            "They are strings",
            "Random values scatter inserts across the whole B-tree, causing page splits and poor cache locality",
            "They cannot be indexed",
            "They collide frequently",
          ],
          correctIndex: 1,
          explain: "Sequential keys append at the end of the index. Random keys write everywhere, fragmenting pages and thrashing cache. Time-sortable ids fix it.",
        },
      },
    ],
  },

  {
    id: "data-pipelines",
    title: "Data pipelines and analytics",
    summary: "Batch, streaming, OLTP versus OLAP, and getting data out without hurting production.",
    track: "design",
    topics: [
      {
        id: "oltp-olap",
        title: "OLTP and OLAP",
        level: "beginner",
        body: [
          "Transactional databases are tuned for many small reads and writes of individual rows, stored row by row.",
          "Analytical stores are tuned for scanning a few columns across billions of rows, stored column by column so unread columns cost nothing.",
          "Running heavy analytics on your production database competes for the same resources serving users, which is how a dashboard causes an outage.",
        ],
        why: "Columnar storage is the reason a warehouse scans a billion rows in seconds. It is a different physical layout, not just a bigger machine.",
        check: {
          prompt: "Why is columnar storage faster for analytics?",
          options: [
            "It compresses better only",
            "A query touching three columns reads only those columns, instead of every row in full",
            "It avoids indexes",
            "It keeps everything in memory",
          ],
          correctIndex: 1,
          explain: "Row storage forces reading whole rows. Columnar reads just the columns referenced, which for wide tables is a large multiple less IO.",
        },
      },
      {
        id: "batch-vs-stream",
        title: "Batch and streaming",
        level: "intermediate",
        body: [
          "Batch processes bounded chunks on a schedule. It is simpler, easy to reason about, cheap to re-run, and results are as old as the last run.",
          "Streaming processes events as they arrive, giving low latency at the cost of handling late and out-of-order data, and windowing.",
          "Most organisations need batch and think they need streaming. The question is whether a decision is actually made on fresher data.",
        ],
        why: "Streaming is meaningfully harder to operate and debug. It is worth it when freshness changes an outcome — fraud, pricing, alerting — and rarely worth it for dashboards read each morning.",
        check: {
          prompt: "What is the strongest justification for streaming over nightly batch?",
          options: [
            "It is more modern",
            "A decision or action depends on data being minutes old rather than hours",
            "It uses less compute",
            "It is easier to debug",
          ],
          correctIndex: 1,
          explain: "Freshness must change behaviour to justify the complexity. If nobody acts on the data until morning, batch is the correct answer.",
        },
      },
      {
        id: "cdc",
        title: "Change data capture",
        level: "advanced",
        body: [
          "CDC reads the database's own replication log and turns committed changes into a stream of events. It captures every change, in commit order, without the application doing anything.",
          "Compared with polling for updated rows, it misses nothing, catches deletes, and adds no query load.",
          "It is the standard way to feed search indexes, caches, warehouses and downstream services from a single source of truth.",
        ],
        why: "CDC solves the dual-write problem structurally: there is one commit, and everything downstream derives from it. That is why it beats having the application publish events alongside its writes.",
        inPractice: "Debezium reading Postgres or MySQL logs into Kafka is the common implementation.",
        check: {
          prompt: "Advantage of CDC over polling for changed rows?",
          options: [
            "It requires no database access",
            "It captures every change in commit order including deletes, without adding query load",
            "It is easier to set up",
            "It works without a message broker",
          ],
          correctIndex: 1,
          explain: "Polling on an updated_at column misses deletes and intermediate states, and adds load. The log has everything, already ordered.",
        },
      },
    ],
  },
];
