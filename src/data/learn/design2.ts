import type { Card } from "./types";

/* Second half of the system design track: APIs, real-time, search, storage,
   identity, coordination, and the data plane. */

export const design2: Card[] = [
  {
    id: "api-design",
    title: "API design",
    summary: "REST, GraphQL, gRPC and webhooks, and which problem each one actually solves.",
    track: "design",
    topics: [
      {
        id: "rest",
        title: "REST and resource modelling",
        level: "beginner",
        body: [
          "REST models the system as resources addressed by URL, with HTTP verbs describing the action and status codes describing the outcome.",
          "The value is that everything already understands it, caches, proxies, browsers and load balancers all act correctly on a GET without being told anything about your application. Most APIs called RESTful are really HTTP-with-JSON, which is fine; the parts worth keeping are correct verbs, correct status codes, and cacheable GETs.",
        ],
        why: "Sticking to standard verbs and codes is not pedantry: it is what lets a CDN cache your GET, a proxy retry safely, and a client library behave sensibly without custom logic.",
        check: {
          prompt: "Why does using POST for a read-only search endpoint cost you something?",
          options: [
            "POST forces a CORS preflight in the browser, adding a round trip",
            "POST bodies are not logged by proxies, so the query vanishes from traces",
            "POST responses are not cacheable by default, so CDNs and browsers cannot help",
            "POST will not be retried by infrastructure, so a dropped response re-runs it",
          ],
          correctIndex: 2,
          explain:
            "Verbs carry meaning to infrastructure that never reads your code. A GET can be cached at the edge and retried by anything in the path; a POST is assumed to change state and gets neither. The preflight and the lost retry are real costs too, they are all the same cause, which is that you told the network this was a write.",
        },
      },
      {
        id: "graphql",
        title: "GraphQL and its costs",
        level: "intermediate",
        body: [
          "GraphQL lets the client ask for exactly the fields it needs in one request, which solves over-fetching and the round trips of a chatty REST API.",
          "It moves the complexity to the server. Arbitrary client queries can be arbitrarily expensive, so you need depth limits, cost analysis and dataloader batching to avoid N+1 database calls, and HTTP caching largely stops working, because every query is a POST to a single endpoint.",
        ],
        why: "GraphQL earns its keep with many clients that need different shapes of the same data, a mobile app and a web app, say. For a single first-party client it is usually complexity without payoff.",
        check: {
          prompt: "What is the main operational cost of adopting GraphQL?",
          options: [
            "Errors come back with a 200 status, so proxies cannot spot a failure",
            "Clients compose arbitrarily expensive queries, and HTTP caching stops applying",
            "Every field resolves separately, so a list of n items costs n+1 queries",
            "The schema must be redeployed whenever a client needs an extra field",
          ],
          correctIndex: 1,
          explain:
            "Query flexibility is the feature and the bill: you take on depth limits, cost analysis and your own caching. N+1 is real but it is a solved problem, dataloader batching is standard equipment. Arbitrary query cost is the part that never fully goes away, because the client decides it.",
        },
      },
      {
        id: "grpc",
        title: "gRPC and binary protocols",
        level: "intermediate",
        body: [
          "gRPC uses Protocol Buffers over HTTP/2: a compact binary encoding with a schema, generated clients, and streaming in both directions.",
          "It is markedly faster and smaller on the wire than JSON, and the schema makes breaking changes visible at build time. It is also awkward from a browser without a proxy, and much harder to debug by hand, because you cannot read it.",
        ],
        why: "The usual split is gRPC between your own services, where performance and schemas matter, and REST or GraphQL at the public edge, where reach and debuggability matter more.",
        check: {
          prompt: "Where does gRPC typically fit best?",
          options: [
            "Public APIs for third parties, who benefit most from generated clients",
            "Streaming telemetry from browsers, where binary framing saves bandwidth",
            "Webhook delivery, since a schema stops receivers mis-parsing the payload",
            "Internal service-to-service calls, where performance and typing both pay",
          ],
          correctIndex: 3,
          explain: "Browsers need a proxy and third parties expect JSON. Internally, where both ends are yours, the performance and typing are worth it.",
        },
      },
      {
        id: "webhooks",
        title: "Webhooks and delivery",
        level: "advanced",
        body: [
          "A webhook inverts the direction. Instead of clients polling you, you call them when something happens, which removes the polling load and cuts the latency.",
          "You now own a delivery problem. Receivers go down, respond slowly, or fail intermittently, so you need retries with backoff, a dead letter path, and visibility into what is failing.",
          "Receivers need to verify the payload came from you: an HMAC signature over the body with a shared secret, plus a timestamp so an old delivery cannot be replayed.",
          "Order is the part people forget. Retries mean a later event can arrive before an earlier one, so the payload should carry a sequence number or a timestamp, and the receiver should be willing to ignore anything older than what it already holds.",
        ],
        why: "Sending a webhook is easy; delivering reliably is the actual product. Without signing, your webhook endpoint is an unauthenticated write API for anyone who learns the URL.",
        inPractice: "Stripe signs every webhook with an HMAC and a timestamp, and retries with exponential backoff for up to three days.",
        check: {
          prompt: "Why sign webhook payloads with an HMAC rather than relying on a secret URL?",
          options: [
            "A secret URL cannot be rotated without every receiver redeploying at the same time",
            "TLS already authenticates the caller, so the secret in the URL is doing nothing",
            "A URL leaks into logs and proxies, and proves nothing about the body that arrived with it",
            "Signing lets the receiver replay a delivery safely, which is what makes retries possible",
          ],
          correctIndex: 2,
          explain:
            "A secret URL is a bearer token in the one place that leaks by default, access logs, referrers, proxies. A signature authenticates each individual body instead. TLS is not the answer: it authenticates the server being called, and tells the receiver nothing about who called it.",
        },
      },
      {
        id: "versioning",
        title: "Versioning and breaking changes",
        level: "advanced",
        body: [
          "Additive changes are safe: new optional fields, new endpoints. Removing a field, renaming one, or tightening validation breaks existing clients.",
          "URL versioning is explicit and easy to route. Header versioning keeps URLs stable. Either works, and consistency matters more than which you pick.",
          "The hard part is retirement. Old versions live exactly as long as clients use them, so you need usage telemetry per version and a deprecation process with real deadlines.",
          "Without that telemetry every version is maintained forever, because nobody can prove it is safe to remove. Measuring per-version usage is what turns deprecation into a decision rather than a hope.",
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
    summary: "WebSockets, SSE, polling and pub/sub, and how to scale a connection you keep open.",
    track: "design",
    topics: [
      {
        id: "push-options",
        title: "Polling, long polling, SSE, WebSockets",
        level: "beginner",
        body: [
          "Polling asks repeatedly on a timer. Simple, wasteful, and latency is bounded by whatever interval you chose.",
          "Long polling holds the request open until there is news, which cuts the waste but ties up a connection for the duration.",
          "Server-sent events are a one-way stream from server to client over plain HTTP, with automatic reconnection built into the browser.",
          "WebSockets give a persistent two-way channel, which is what you need when the client also sends frequently. Read the four as a cost ladder: each step buys lower latency and charges you in held connections and server-side state.",
        ],
        why: "SSE is underrated: if data only flows server to client, notifications, live prices, progress, it is far simpler than WebSockets and works through ordinary HTTP infrastructure.",
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
            "Sticky sessions, so a user's messages always route to their own server",
            "A shared Redis map of user to server, which the sender reads before sending",
            "Each server polls the database for messages addressed to its connections",
            "A pub/sub layer that fans the message to whichever server holds that socket",
          ],
          correctIndex: 3,
          explain: "Stickiness routes a client to a server; it does not help a message originating elsewhere find that server. Pub/sub decouples the sender from the connection's location.",
        },
      },
      {
        id: "presence",
        title: "Presence and typing indicators",
        level: "advanced",
        body: [
          "Presence looks trivial and is one of the most expensive features in a chat product. Every state change potentially notifies everyone who can see that user, which is quadratic in the worst case.",
          "The data is also worthless within seconds, so it lives in memory behind short TTLs rather than being persisted. Typing indicators get throttled hard and dropped under load, because they are the first thing worth sacrificing.",
        ],
        why: "Presence is the standard example of a feature whose cost is invisible in the spec. Recognising it as a fan-out problem rather than a storage problem is the insight being tested.",
        check: {
          prompt: "Why is presence expensive at scale?",
          options: [
            "Each change fans out to everyone subscribed, so cost tracks the social graph",
            "Presence changes far more often than any other field on a user record",
            "It cannot be cached, since a stale presence value is worse than none",
            "It needs strong consistency, so every read crosses a quorum of replicas",
          ],
          correctIndex: 0,
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
          "Postgres will do this for you with a GIN index over a tsvector, which is usually the right first move. A separate search cluster is a second datastore to keep in sync, and that cost only starts paying once you need ranking, faceting, or a scale the database cannot reach.",
        ],
        why: "This is why search moves to a dedicated engine. It is not that the database is slow; it is that the data structure required for text search is a different one.",
        check: {
          prompt: "Why can't a B-tree index serve LIKE '%shoes%'?",
          options: [
            "A leading wildcard leaves no prefix to seek on, so the ordering is useless",
            "LIKE comparisons are evaluated after rows are fetched, never in the index",
            "The index stores a hash of the value, which cannot match a substring",
            "Text columns are stored out of line, so the index holds a pointer to them",
          ],
          correctIndex: 0,
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
            "Recall, the best documents are not being matched by the query at all",
            "The index is stale, so recently updated documents show their old content",
            "Ranking, the right documents are present but not near the top",
            "Query parsing, which is dropping terms the user considered important",
          ],
          correctIndex: 2,
          explain:
            "The question says the matches are correct, which rules recall out, the documents are being found. What is left is ordering, and since users rarely look past the first few results, ranking is the product rather than a refinement of it.",
        },
      },
      {
        id: "search-sync",
        title: "Keeping the index in sync",
        level: "advanced",
        body: [
          "The search index is a second copy of the data, so it can drift.",
          "Dual writes, writing to the database and the index in the same request, fail the moment one succeeds and the other does not, and nothing about that failure is visible until somebody searches for the missing thing.",
          "The reliable pattern is to write to the database and derive the index from its change log, so the database stays the single source of truth and the index is always a function of it.",
          "You also need a full reindex path. Mappings change, drift accumulates, and eventually the only honest fix is to rebuild into a fresh index and swap the alias over.",
        ],
        why: "Change data capture beats dual writes because it has one commit point. With dual writes there is always a window where a crash leaves the two permanently inconsistent.",
        check: {
          prompt: "Why are dual writes to database and search index fragile?",
          options: [
            "The engine indexes asynchronously, so the write returns before it is visible",
            "No shared transaction, so a failure after the first write diverges them for good",
            "Reindexing throughput is lower, so the index steadily falls behind writes",
            "Two writes double the latency of every request that touches both systems",
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
          "Object storage such as S3 holds immutable blobs addressed by key, with effectively unlimited capacity and a very low cost per gigabyte.",
          "Putting files in a database instead inflates backups, slows replication, and spends expensive storage on data nothing will ever query. The standard shape is the file in object storage and its metadata, key, size, owner, content type, in the database.",
        ],
        why: "The rule is to store what you query in the database and what you serve in object storage. Blobs in Postgres make every operational task on that database slower forever.",
        check: {
          prompt: "Where should user-uploaded images live?",
          options: [
            "As BLOBs in the primary database, so uploads join the same transaction",
            "On the application server's disk, fronted by the CDN for all reads",
            "In object storage, with the bytes also mirrored into Redis for hot files",
            "In object storage, with the metadata rows kept in the database",
          ],
          correctIndex: 3,
          explain: "Blobs bloat backups and replication; local disk is lost when the instance is replaced. Object storage plus metadata is the durable, cheap split.",
        },
      },
      {
        id: "presigned-uploads",
        title: "Direct uploads with pre-signed URLs",
        level: "intermediate",
        body: [
          "Routing uploads through your API means large files consume your bandwidth, your memory and your request timeouts, to nobody's benefit.",
          "A pre-signed URL lets your server authorise the upload and hand the client a time-limited URL to send the bytes straight to object storage. The server hears about completion from an event, and validates type and size before treating the object as real.",
        ],
        why: "This removes an entire scaling problem rather than solving it. Your API stays small and fast because the large payloads never touch it.",
        check: {
          prompt: "Main benefit of pre-signed direct uploads?",
          options: [
            "Large payloads bypass your servers, so upload size stops costing API capacity",
            "The URL expires, so an upload cannot be replayed once the window closes",
            "The client uploads parts in parallel, which your server could not coordinate",
            "Storage is billed to the client's own account rather than to yours",
          ],
          correctIndex: 0,
          explain: "The server authorises but never carries the bytes, so a 2GB upload costs it one small signing request.",
        },
      },
      {
        id: "video-delivery",
        title: "Video: transcoding and adaptive bitrate",
        level: "advanced",
        body: [
          "An uploaded video is transcoded into several resolutions and bitrates, then split into short segments with a manifest listing what is available.",
          "The player measures throughput and switches renditions per segment, so a failing connection degrades quality instead of stalling. This is HLS or DASH, and it is why streaming survives a train tunnel when a single MP4 does not.",
        ],
        why: "Adaptive bitrate exists because bandwidth is variable and unpredictable. Serving one file forces a choice between buffering for slow connections and wasting quality on fast ones.",
        inPractice: "Netflix encodes each title into many renditions and tunes them per title, an animated film and a dark action film need different bitrates for the same perceived quality.",
        check: {
          prompt: "Why segment video and offer multiple renditions?",
          options: [
            "So the CDN can cache the popular opening minutes without the whole file",
            "So a seek only has to fetch the segments around the target position",
            "So the player can change quality per segment as available bandwidth moves",
            "So each rendition can use a codec suited to the device requesting it",
          ],
          correctIndex: 2,
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
          "Authentication establishes who you are. Authorisation decides what you may do. They fail differently, and they are constantly confused in code.",
          "Most serious access-control bugs are authorisation bugs. The user is correctly identified, and the system simply never checks whether this user may touch this particular record.",
          "The reason is structural. Authentication happens once, in one place, so it is hard to forget. Authorisation happens on every request against every resource, so it is easy to miss exactly one.",
          "Which is why the durable fix is to check ownership where the data is fetched rather than in each handler. A query that cannot return another tenant's row is safer than a hundred handlers that each have to remember to ask.",
        ],
        why: "Insecure direct object reference, changing an id in a URL and seeing someone else's data, is consistently among the most common real vulnerabilities, and it is purely a missing authorisation check.",
        check: {
          prompt: "A logged-in user changes an id in the URL and sees another customer's invoice. What failed?",
          options: [
            "Session management, since the session was never bound to the resource",
            "Authorisation, identity was established, but ownership was never checked",
            "Authentication, because the identity was not re-verified on this request",
            "Input validation, which should have rejected an id outside their range",
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
          "A session id is a reference. The server holds the state, can revoke it instantly, and pays a lookup on every request.",
          "A JWT carries its claims and a signature, so it validates without a lookup, and that is exactly why it cannot be revoked before it expires.",
          "The usual compromise is short-lived access tokens alongside longer-lived refresh tokens that can be revoked.",
          "Worth saying plainly: for one application talking to a database it already has open, a session is simpler and better. JWTs earn their keep when the validating service cannot reach your session store, across services, across companies, or at an edge with no database at all.",
        ],
        why: "JWTs are frequently chosen for statelessness and then paired with a revocation list, which reintroduces the lookup and leaves you with the drawbacks of both.",
        check: {
          prompt: "Why can't you immediately revoke a standard JWT?",
          options: [
            "The signature covers an expiry claim, which cannot be altered after issue",
            "It is held only by the client, so the server has no stored copy it could delete",
            "Validation is local by design, so no server reads state that could mark it dead",
            "Revoking means rotating the signing key, which invalidates every token at once",
          ],
          correctIndex: 2,
          explain:
            "Validation is local by design, and revocation needs shared state, precisely what the token was chosen to avoid. Rotating the signing key does revoke it, but it revokes everyone's at once, which is a blast radius rather than a mechanism.",
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
            "Refresh tokens, so a client can stay signed in without re-prompting",
            "Signed and time-limited tokens, which plain OAuth does not require",
            "Proof that the access token was issued to this client, by way of PKCE",
            "An identity layer, an ID token that states who the user actually is",
          ],
          correctIndex: 3,
          explain: "OAuth grants access to resources. OIDC adds authenticated identity, which is what login actually requires.",
        },
      },
      {
        id: "secrets",
        title: "Secrets and encryption",
        level: "intermediate",
        body: [
          "Secrets belong in a manager with rotation and an audit trail, not in environment variables committed to a repository or baked into an image.",
          "Passwords are a separate problem. They are hashed with a slow algorithm built for the job, bcrypt, scrypt or Argon2, never a fast general-purpose hash like SHA-256, which is brute-forced trivially.",
          "Encryption in transit is table stakes, and essentially free.",
          "Encryption at rest is worth less than people assume. It defends against a stolen disk and it satisfies an auditor. It does nothing against an attacker holding application credentials, which is how the data usually leaves.",
        ],
        why: "Using SHA-256 for passwords is fast, which is precisely the flaw: an attacker with the hashes can try billions per second. The slowness of bcrypt is the feature.",
        check: {
          prompt: "Why is SHA-256 the wrong choice for password hashing?",
          options: [
            "It is fast by design, and password hashing needs deliberate slowness",
            "It takes no salt, so identical passwords produce identical digests",
            "Its 256-bit output is short enough to be searched exhaustively today",
            "It is vulnerable to length extension, which leaks the original password",
          ],
          correctIndex: 0,
          explain:
            "SHA-256 is a good hash and the wrong tool here, speed is its virtue and the whole problem. bcrypt and Argon2 are deliberately expensive, with a cost factor you raise as hardware improves. Salting is a separate fix for a separate bug: it stops one rainbow table covering every user, but a salted fast hash is still brute-forced per user.",
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
          "Many systems need exactly one node doing something, running a scheduled job, accepting writes, coordinating a cluster. Leader election picks that node and replaces it when it dies.",
          "Doing it correctly is subtle, and two nodes both believing they lead is a split brain that corrupts data quietly. Almost nobody should implement this themselves: use etcd, ZooKeeper, or a database lease with fencing tokens.",
        ],
        why: "The naive version, a lock row with a timeout, fails when the leader pauses for garbage collection, wakes up believing it still holds the lock, and writes over the new leader. Fencing tokens exist to reject those late writes.",
        check: {
          prompt: "A leader stalls for 30s, its lease expires, a new leader is elected, then the old one resumes and writes. What prevents corruption?",
          options: [
            "A lease longer than the worst-case pause, so expiry cannot happen mid-write",
            "The old leader notices the new one on resume and stands down before writing",
            "Quorum writes, since the old leader can no longer reach a majority of replicas",
            "Fencing tokens, storage rejects any write carrying a superseded term number",
          ],
          correctIndex: 3,
          explain:
            "A longer lease is the tempting answer and it does not work: there is no bound on how long a process can be paused by GC, a hypervisor, or a swapped-out page, so any lease you pick can be exceeded. You cannot prevent the pause. The storage layer has to reject the write, which is what a fencing token lets it do.",
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
            "An even cluster can split into equal halves, so neither side has a majority",
            "Each extra node adds a round trip, so latency grows with the cluster size",
            "Fault tolerance is floor((n-1)/2), so 4 tolerates the same single failure as 3",
            "An odd size lets the leader break a tie with its own vote when votes are even",
          ],
          correctIndex: 2,
          explain: "3 and 4 both tolerate one failure, so the fourth node adds cost and no resilience; 5 is the next step that tolerates two. Note the common explanation, that odd sizes avoid ties, is wrong: a majority of 4 is 3, so a majority quorum cannot tie.",
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
            "It spans services, so no single database holds the locks a rollback needs",
            "Intermediate states are visible, and undo is a compensating action not a rollback",
            "It runs asynchronously, so the caller cannot be told whether it succeeded",
            "It gives up atomicity but keeps isolation, since each step commits alone",
          ],
          correctIndex: 1,
          explain:
            "Each step commits locally, so partial state is observable and compensation is a new action rather than a rollback, and not always a complete one, since you cannot unsend an email. Spanning services is the reason a saga exists, not what makes it different; the difference is what it gives up once it does.",
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
            "They are 16 bytes rather than 8, so every secondary index doubles in size",
            "They sort lexically, so index order no longer matches insertion order",
            "Generating one needs a syscall for entropy on every single insert",
            "Random values scatter inserts across the B-tree, splitting pages constantly",
          ],
          correctIndex: 3,
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
          "Transactional databases are tuned for many small reads and writes of individual rows, and store data row by row. Analytical stores are tuned for scanning a few columns across billions of rows, and store it column by column, so the columns you did not ask for cost nothing.",
          "Running heavy analytics on your production database puts them in competition for the same resources that are serving users. That is how a dashboard causes an outage.",
        ],
        why: "Columnar storage is the reason a warehouse scans a billion rows in seconds. It is a different physical layout, not just a bigger machine.",
        check: {
          prompt: "Why is columnar storage faster for analytics?",
          options: [
            "A query touching three columns reads only those, not every row in full",
            "Values in a column are alike, so they compress far better than mixed rows",
            "Column stores keep the working set in memory, avoiding disk entirely",
            "Aggregates are precomputed per column at the time the data is written",
          ],
          correctIndex: 0,
          explain:
            "Row storage forces you to read whole rows to reach three fields; columnar reads only what the query names, which on a wide table is a large multiple less IO. Compression is the honourable second answer and it is real, like values sit together and compress hard, but it multiplies a win that column pruning already delivered.",
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
        why: "Streaming is meaningfully harder to operate and debug. It is worth it when freshness changes an outcome, fraud, pricing, alerting, and rarely worth it for dashboards read each morning.",
        check: {
          prompt: "What is the strongest justification for streaming over nightly batch?",
          options: [
            "Load is spread evenly instead of concentrating in one nightly window",
            "Reprocessing is cheaper, since only the changed records are recomputed",
            "A decision or action depends on data being minutes old rather than hours",
            "Failures surface immediately rather than at 3am when the batch runs",
          ],
          correctIndex: 2,
          explain: "Freshness must change behaviour to justify the complexity. If nobody acts on the data until morning, batch is the correct answer.",
        },
      },
      {
        id: "cdc",
        title: "Change data capture",
        level: "advanced",
        body: [
          "CDC reads the database's own replication log and turns committed changes into a stream of events. It captures every change, in commit order, without the application doing anything at all.",
          "Compared with polling for updated rows it misses nothing, it catches deletes, and it adds no query load. That is what makes it the standard way to feed search indexes, caches, warehouses and downstream services from one source of truth.",
        ],
        why: "CDC solves the dual-write problem structurally: there is one commit, and everything downstream derives from it. That is why it beats having the application publish events alongside its writes.",
        inPractice: "Debezium reading Postgres or MySQL logs into Kafka is the common implementation.",
        check: {
          prompt: "Advantage of CDC over polling for changed rows?",
          options: [
            "It reads the replication log, so it sees changes before they are committed",
            "It captures every change in commit order, including deletes, with no query load",
            "It needs no updated_at column, which polling requires the schema to carry",
            "It delivers exactly once, since the reader checkpoints its log position",
          ],
          correctIndex: 1,
          explain:
            "Polling an updated_at column misses deletes and every intermediate state, and adds query load to the primary. The log has all of it, already in commit order. It does not read uncommitted data, the log is written at commit, and it does not deliver exactly once, so consumers still need to be idempotent.",
        },
      },
    ],
  },
];
