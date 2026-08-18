import type { Card } from "./types";

export const design: Card[] = [
  {
    id: "caching",
    title: "Caching and Redis",
    summary: "Strategies, invalidation, TTLs, edge caching, and what actually goes wrong at scale.",
    track: "design",
    topics: [
      {
        id: "cache-strategies",
        title: "Cache-aside, write-through, write-behind",
        level: "beginner",
        body: [
          "Cache-aside is the default nearly everywhere: the application checks the cache, and on a miss it reads the database and populates the cache itself. The cache knows nothing about the database, which is the whole appeal. Any store can sit behind it, only the data actually asked for is ever cached, and the failure mode is mild, since a cache that is empty or unreachable costs you a database read rather than an error.",
          "Read-through moves that logic into the cache or its client library: the application asks the cache, and the cache fetches from the source on a miss. The behaviour is identical from outside; what changes is where the code lives and who is responsible for getting it right. It is worth having when a dozen services read the same data, because otherwise each of them implements the miss path slightly differently and one of them forgets the TTL.",
          "Write-through writes to the cache and the database together, so the cache is never stale for data that has been written through it. Every write pays both costs, and you have made the cache part of the write path, which means a cache outage is now a write outage unless you are careful. It fits read-heavy data with strict freshness needs and a modest write rate.",
          "Write-behind acknowledges the write once it is in the cache and flushes to the database later, in batches. It is the fastest option and the only one that can lose committed data: anything not yet flushed when the node dies is gone, and the application already told the user it was saved. That is acceptable for view counters and session activity, and not for anything a person would notice missing.",
          "Refresh-ahead is the fifth and least discussed: refresh an entry before it expires, based on the prediction that something read this often will be read again. It keeps hit rates high for a known hot set and wastes work on everything else, so it belongs on a small, identified set of expensive keys rather than as a general policy.",
          "The choice is usually not about performance, because all five are fast on a hit. It is about what happens on a miss, on a write, and when the cache is unavailable, and those are three questions with different answers per dataset. A system with one caching strategy applied uniformly is a system where four of those questions were never asked.",
        ],
        why: "Cache-aside wins by default because its failure mode is mild and its coupling is low: the cache can be flushed, restarted or lost entirely and the system still answers, more slowly. Write-behind trades durability for speed, which is only honest when the data is genuinely disposable, and write-through puts the cache in the write path, which is a decision worth making deliberately rather than inheriting from a library default.",
        inPractice:
          "Facebook's memcached deployment is cache-aside, and their 2013 paper is mostly about the failure modes that shape causes rather than about the caching itself. That is the tell: at scale the interesting part of a cache is never the hit path.",
        diagram: {
          caption: "Cache-aside: the application owns the miss path",
          columns: [
            [{ id: "app", label: "Application", kind: "service" }],
            [{ id: "cache", label: "Cache", sub: "hit in under 1ms", kind: "data" }],
            [{ id: "db", label: "Database", sub: "miss costs 50ms", kind: "data" }],
          ],
          edges: [
            { from: "app", to: "cache", label: "1. read" },
            { from: "cache", to: "db", label: "2. on miss, app reads" },
            { from: "db", to: "cache", label: "3. app populates" },
          ],
        },
        check: {
          prompt: "Which strategy risks losing committed writes if the cache node dies?",
          options: ["Cache-aside", "Write-through", "Write-behind", "Read-through"],
          correctIndex: 2,
          explain: "Write-behind acknowledges the write once it is in cache and flushes later. Anything not yet flushed is gone.",
        },
        checks: [
          {
            prompt: "Why is cache-aside the safer default when the cache tier goes down entirely?",
            options: [
              "Requests fall through to the database and the system serves more slowly",
              "The application retries against a replica until the cache tier returns",
              "Writes are buffered locally and replayed when the cache comes back",
              "The client library falls back to an in-process cache automatically",
            ],
            correctIndex: 0,
            explain:
              "Nothing in cache-aside depends on the cache existing. It degrades to a slower system rather than a broken one, which is not true of a write-through path where the cache sits inside the write.",
          },
          {
            prompt: "When does write-through earn its extra cost over cache-aside?",
            options: [
              "When writes vastly outnumber reads and must be acknowledged quickly",
              "When reads dominate, freshness matters, and the write rate is modest",
              "When the dataset is too large to fit in the cache tier's memory",
              "When several services need to read the same keys concurrently",
            ],
            correctIndex: 1,
            explain:
              "Paying the cache write on every database write only makes sense when many reads follow each write and a stale read would be a real problem. With a heavy write rate you are paying twice for entries that are often never read.",
          },
          {
            prompt: "Refresh-ahead keeps hit rates high. Why is it a poor general policy?",
            options: [
              "It requires write-through semantics, which most caches cannot provide",
              "It refreshes keys nobody will read again, spending work on cold data",
              "It cannot be combined with TTL expiry, so entries never leave the cache",
              "It doubles memory use, since old and new values are both retained",
            ],
            correctIndex: 1,
            explain:
              "Predicting the next read is only cheap for a small, identified hot set. Applied to everything it becomes a background job recomputing entries on the chance somebody wants them, which is work you did not have to do.",
          },
        ],
      },
      {
        id: "invalidation",
        title: "Invalidation: TTL, explicit, and versioned keys",
        level: "intermediate",
        body: [
          "TTL expiry is the simplest thing that works: entries die after a set time, and you accept staleness up to that time in exchange for writing no invalidation logic at all. The reason it survives contact with production is that it is self-healing. Any bug, any missed path, any inconsistency corrects itself within one TTL, which is a property none of the cleverer schemes have.",
          "Explicit invalidation deletes the key when the underlying data changes. It is fresher and it is fragile, because every write path must know every key derived from that data. Add a new page that composes the same record into a different key, forget the delete, and you have a permanently stale entry that no amount of waiting will fix, discovered eventually by a customer who says the price is wrong.",
          "Versioned keys sidestep deletion entirely. Put a version or an updated-at timestamp in the key, bump it on write, and old entries become unreachable rather than wrong. Invalidation becomes one write to one value instead of a fan-out of deletes, and the stale entries age out on their own. This is usually the best of the three, and the cost is that the old entries occupy memory until they expire, which is a memory problem rather than a correctness one.",
          "Whichever you choose, jitter the TTLs. Entries created together with identical lifetimes expire together, and a cache populated at deploy time will empty itself in one synchronised moment some hours later, which arrives as an unexplained database spike at an odd hour. A random spread of ten to twenty per cent is enough to turn the cliff into a slope.",
          "Distributed invalidation is where this gets genuinely hard, because deletes have to reach every node in every region, and a delete that is lost in transit leaves one region serving stale data indefinitely with nothing to detect it. The pragmatic answer most large systems reach is to stop trying: short TTLs plus versioned keys, so correctness never depends on a message arriving.",
          "There is one more failure worth naming: the stale set. A client reads a value, is slow, and writes what it read into the cache after a concurrent update has already invalidated it, so the cache now holds an old value with a fresh lifetime. Facebook's leases exist partly for this, since a lease token issued at read time can be invalidated by an intervening write, letting the cache reject the late set.",
        ],
        why: "Versioned keys make invalidation a property of the read path rather than a duty of every write path, and duties spread across write paths rot as the system grows. The general principle: prefer schemes where a missed step degrades to a slower read rather than to a wrong answer that persists.",
        inPractice:
          "Netflix leans on short TTLs and versioned keys rather than precise cross-region invalidation, with EVCache replicating within a region. A coordinated global delete is slower and less reliable than letting stale entries age out, and it fails silently when it fails at all.",
        diagram: {
          caption: "A version bump makes old keys unreachable instead of wrong",
          columns: [
            [{ id: "w", label: "Write", sub: "price changes", kind: "service" }],
            [{ id: "vk", label: "Version key", sub: "product:9:v", kind: "data" }],
            [{ id: "rd", label: "Read path", sub: "builds the key", kind: "service" }],
            [
              { id: "new", label: "product:9:v8", sub: "fresh, populated", kind: "data" },
              { id: "old", label: "product:9:v7", sub: "unreachable, expires", kind: "data", alternative: true },
            ],
          ],
          edges: [
            { from: "w", to: "vk", label: "v7 becomes v8" },
            { from: "vk", to: "rd", label: "read the version" },
            { from: "rd", to: "new", label: "miss, then populate" },
            { from: "rd", to: "old", label: "never requested again", async: true },
          ],
        },
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
        checks: [
          {
            prompt: "What is a stale set, and why does a TTL not protect you from it?",
            options: [
              "A late write of an old value that arrives with a fresh lifetime",
              "An entry written with no TTL, so it is never reclaimed by expiry",
              "A value cached before the schema changed, so it fails to deserialise",
              "A key that survives eviction because it is read on every request",
            ],
            correctIndex: 0,
            explain:
              "A slow reader can populate the cache after an update has invalidated it, so the cache holds an old value that will now live a full TTL. Leases and versioned keys both prevent it; a shorter TTL only shortens the damage.",
          },
          {
            prompt: "Why jitter TTLs rather than give a whole dataset the same lifetime?",
            options: [
              "Jitter improves the hit ratio by keeping popular entries alive longer",
              "Entries created together expire together, producing a synchronised miss storm",
              "Identical TTLs prevent the eviction policy from sampling keys fairly",
              "A varying TTL lets the cache compress entries with similar lifetimes",
            ],
            correctIndex: 1,
            explain:
              "A cache warmed at deploy time empties itself in one instant hours later, and the database gets the whole dataset as a cold read at once. Ten to twenty per cent of randomness turns that cliff into a slope.",
          },
          {
            prompt: "Why do large systems often abandon precise cross-region cache invalidation?",
            options: [
              "Regional caches cannot be addressed individually from another region",
              "The delete message costs more bandwidth than the value it removes",
              "A lost delete leaves a region permanently stale with nothing detecting it",
              "Invalidation messages arrive out of order and cannot be sequenced",
            ],
            correctIndex: 2,
            explain:
              "Correctness that depends on a message arriving fails silently when the message does not. Short TTLs and versioned keys make the failure self-healing, which is a better property than being right most of the time.",
          },
        ],
      },
      {
        id: "redis-structures",
        title: "Redis beyond get and set",
        level: "intermediate",
        body: [
          "Redis stores structures, not just strings, and treating it as a string cache is the most common way to leave performance on the table. Sorted sets maintain order by score and answer rank and range queries directly, which is a leaderboard or a time-ordered feed without the application fetching everything to sort it. Hashes let you update one field of an object without rewriting the whole record. Sets handle membership and deduplication. Streams add consumer groups and acknowledgements, which is real message processing rather than a list pretending to be a queue.",
          "The operational model matters as much as the data model, and the key fact is that Redis executes commands on a single thread. Redis 6 added threaded I/O for reading and writing sockets, but the commands themselves still run one at a time, which has two consequences. One slow command blocks everything, so a KEYS scan over a large keyspace or an O(n) operation on a million-element set is an outage rather than a slow query. And a single hot key is bounded by one core, no matter how many nodes you add.",
          "Memory is managed by an eviction policy you choose, and the default is the one that surprises people: noeviction, which starts returning errors on writes when maxmemory is reached rather than making room. For a cache you almost certainly want allkeys-lru or allkeys-lfu. Both are approximations, sampling a handful of keys and evicting the worst rather than maintaining a true ordering, because exact LRU across millions of keys costs more than it saves. LFU, added in Redis 4.0, is the better choice when a small set is genuinely hot, since one burst of scanning traffic cannot evict everything the way it can with LRU.",
          "Expiry and eviction are different mechanisms and get confused constantly. Expiry removes a key because its TTL passed; it is checked lazily on access and sampled by a background cycle, so an expired key can occupy memory for a while after it logically died. Eviction removes a key because you are out of memory, regardless of TTL. A cache filling up with keys that have no TTL at all will evict things you wanted while holding things you did not.",
          "Clustering shards the keyspace across 16,384 hash slots assigned to nodes, and the constraint to design around is that a multi-key operation only works when the keys live in the same slot. Hash tags, the braces in user:{42}:profile, force related keys together for exactly this reason. Get that wrong and transactions and Lua scripts that worked on a single node start failing in the cluster with a cross-slot error, usually the week after launch.",
          "Finally, persistence. Redis offers RDB snapshots and an append-only file, and both are useful, and neither turns a cache into a database. RDB loses everything since the last snapshot; AOF with the default fsync policy loses up to a second. Both are reasonable for a cache that would rather restart warm than cold, and neither is a promise you should make to a user about their data.",
        ],
        why: "Choosing the right structure often turns a read-modify-write round trip into one server-side operation, which is the difference between three network hops and one. The single-threaded execution model is the constraint behind most Redis incidents: it makes one expensive command everyone's problem, and it makes a hot key a single-core problem that horizontal scale does not solve.",
        inPractice:
          "Redis Cluster's 16,384 slots and hash tags are the mechanism behind most real sharding designs on it, and the cross-slot error is the standard rite of passage. Netflix's EVCache and Facebook's memcached tiers both take the opposite route, staying with a simpler key-value model and putting the intelligence in the client, which is a legitimate answer to the same problem.",
        diagram: {
          caption: "One thread executes commands: a slow one blocks everyone",
          columns: [
            [
              { id: "c1", label: "Client A", sub: "GET user:9", kind: "client" },
              { id: "c2", label: "Client B", sub: "KEYS *", kind: "client" },
            ],
            [{ id: "io", label: "I/O threads", sub: "Redis 6+", kind: "edge" }],
            [{ id: "cmd", label: "Command loop", sub: "single threaded", kind: "service" }],
            [
              { id: "fast", label: "O(1) commands", sub: "microseconds", kind: "data" },
              { id: "slow", label: "O(n) scan", sub: "blocks the loop", kind: "data", alternative: true },
            ],
          ],
          edges: [
            { from: "c1", to: "io", label: "request" },
            { from: "c2", to: "io", label: "request" },
            { from: "io", to: "cmd", label: "queued in order" },
            { from: "cmd", to: "fast", label: "returns at once" },
            { from: "cmd", to: "slow", label: "everything waits" },
          ],
        },
        check: {
          prompt: "You need a live leaderboard with rank lookups. Which Redis structure fits?",
          options: ["A string per player", "A sorted set scored by points", "A list of players", "A hash of player to score"],
          correctIndex: 1,
          explain: "Sorted sets maintain order by score and support rank and range queries directly. A hash stores scores but cannot rank without fetching everything.",
        },
        checks: [
          {
            prompt: "Why is running KEYS against a large Redis keyspace in production dangerous?",
            options: [
              "It returns more data than most client libraries can buffer safely",
              "Commands run on one thread, so a long scan blocks every other client",
              "It resets the LRU information used by the eviction policy",
              "It bypasses the cluster router and queries only one shard",
            ],
            correctIndex: 1,
            explain:
              "Redis executes commands one at a time. An O(n) scan over millions of keys is not a slow query for one caller, it is a pause for everyone, which is why SCAN with a cursor exists.",
          },
          {
            prompt: "A Redis cache reaches its memory limit and starts refusing writes. What is the likely cause?",
            options: [
              "The eviction policy is noeviction, which errors instead of making room",
              "Expiry is lazy, so expired keys are never reclaimed automatically",
              "The keyspace exceeded the 16,384 slot limit of a clustered deployment",
              "Persistence is enabled, so memory is reserved for the snapshot fork",
            ],
            correctIndex: 0,
            explain:
              "noeviction is the default and is right for a data store, not a cache. A cache wants allkeys-lru or allkeys-lfu so that memory pressure costs you hit rate rather than availability.",
          },
          {
            prompt: "Why do related keys in Redis Cluster often carry a hash tag such as user:{42}:profile?",
            options: [
              "It shortens the key, which reduces memory overhead per entry",
              "It marks the key as exempt from eviction under memory pressure",
              "It forces related keys into the same slot so multi-key commands work",
              "It lets the client route reads to a replica rather than the primary",
            ],
            correctIndex: 2,
            explain:
              "Only the part inside the braces is hashed, so tagged keys land on the same node. Without it, transactions and Lua scripts touching several keys fail with a cross-slot error once you move from a single node to a cluster.",
          },
        ],
      },
      {
        id: "cache-failures",
        title: "Stampedes, avalanches and hot keys",
        level: "advanced",
        body: [
          "A stampede happens when a popular key expires and every concurrent request misses at once, so all of them hit the database together to compute the same value. The load is proportional to concurrency rather than to traffic, which is why it appears suddenly at a scale that was fine yesterday. The standard fix is a short lock: one request wins the right to recompute while the others wait briefly or serve the stale value they can still see.",
          "Facebook's version is a lease. On a miss the cache hands one client a token granting permission to recompute, and tells everyone else to wait or use stale data. It is the same shape as a lock, expressed as something the cache issues, which also lets the cache reject a set whose lease was invalidated by an intervening write. Probabilistic early expiry is the other approach: as an entry approaches its TTL, each reader has a small and rising chance of refreshing it early, so the recomputation happens before the expiry rather than at it, spread across readers.",
          "An avalanche is the same problem multiplied: many keys given identical TTLs expire simultaneously, usually because the cache was warmed in one pass at deploy time. The database sees the entire working set arrive as cold reads in a few seconds. Jitter fixes it, and it is worth adding at the moment you write the TTL rather than after the first incident.",
          "A hot key is one entry so popular that a single node becomes the bottleneck, and it is not solved by adding nodes, because the key still hashes to one of them. Redis executing commands on a single thread makes it a single-core limit. The two fixes are replication of that key under several suffixed names with clients choosing at random, and a small in-process cache in front of the shared one, holding the top few keys for a second or two. The second is the more effective and the more dangerous, since every process now has its own slightly different copy.",
          "Cache penetration is the quieter cousin: requests for keys that do not exist anywhere, so nothing is ever cached and every one becomes a database read. It appears naturally with user-supplied identifiers and it is the standard shape of a cheap denial of service. The fixes are negative caching, storing a short-lived marker meaning this does not exist, and a Bloom filter holding the set of ids that do exist, which answers definitely not present in memory.",
          "The pattern behind all four is synchronisation. Requests miss together, keys expire together, traffic concentrates on one key, or absent keys share a path with no memory. Each fix is a deliberate desynchronisation: a lock so one goes first, jitter so they separate, replication so they spread, a marker so the second one is cheap. When you can name which of the four you are looking at, the fix is usually already obvious.",
        ],
        why: "These are the failures that only appear under real traffic, which is why they are asked about in interviews and why they arrive on a Friday in production. They are also the failures where the cache makes things worse than no cache at all, because a stampede concentrates load that would otherwise have been spread across the whole period.",
        inPractice:
          "Facebook's leases fix both the stampede and the stale set with one mechanism, and their memcached paper describes them alongside the regional pools and the gutter tier that catch the other failure modes. It is the most honest published account of what caching costs at scale, and almost none of it is about the hit path.",
        diagram: {
          caption: "One recomputes, the rest serve stale: the shape of every stampede fix",
          columns: [
            [{ id: "many", label: "1,000 requests", sub: "same expired key", kind: "client" }],
            [{ id: "cache", label: "Cache", sub: "issues one lease", kind: "data" }],
            [
              { id: "one", label: "Winner", sub: "recomputes", kind: "service" },
              { id: "rest", label: "Everyone else", sub: "stale or brief wait", kind: "service" },
            ],
            [{ id: "db", label: "Database", sub: "sees one query", kind: "data" }],
          ],
          edges: [
            { from: "many", to: "cache", label: "all miss" },
            { from: "cache", to: "one", label: "lease granted" },
            { from: "cache", to: "rest", label: "lease refused" },
            { from: "one", to: "db", label: "single read" },
            { from: "one", to: "cache", label: "populates", async: true },
          ],
        },
        check: {
          prompt: "Every hour, database load spikes hard for a few seconds. Caches were warmed at deploy with the same TTL. What is happening?",
          options: [
            "A stampede on one hot key, whose misses all reach the database at once",
            "Connection pool exhaustion at the top of the hour, when cron jobs start",
            "A cache avalanche, identical TTLs mean the whole set expires together",
            "The eviction policy reclaiming memory in one pass rather than gradually",
          ],
          correctIndex: 2,
          explain: "Keys created together with identical TTLs expire together. Adding random jitter to each TTL spreads expiry and flattens the spike.",
        },
        checks: [
          {
            prompt: "Adding cache nodes does not help with a hot key. Why?",
            options: [
              "The key hashes to one node, so the extra capacity is never addressed",
              "Replication lag means the copies serve stale values under load",
              "Clients pin connections to one node for the lifetime of a session",
              "Hot keys are evicted first, so they are recomputed on every node",
            ],
            correctIndex: 0,
            explain:
              "Sharding spreads keys, not requests for one key. You either replicate that key under several names and pick at random, or hold it in a tiny in-process cache in front of the shared tier.",
          },
          {
            prompt: "Requests for ids that do not exist bypass the cache entirely and hit the database. What is the fix?",
            options: [
              "Increase the TTL, so surviving entries absorb more of the traffic",
              "Cache the absence itself, or keep a Bloom filter of ids that exist",
              "Reject unknown ids at the edge with a rate limit per client address",
              "Warm the cache with every id in the database at deployment time",
            ],
            correctIndex: 1,
            explain:
              "Nothing is cached because nothing exists to cache, so every request is a database read. A short-lived marker meaning not found, or a membership filter in memory, makes the second request cheap.",
          },
          {
            prompt: "What does probabilistic early expiry do that a plain lock does not?",
            options: [
              "It guarantees only one client can recompute a given key at a time",
              "It removes the need for a TTL, since entries refresh continuously",
              "It moves the recomputation before the expiry, so no request ever misses",
              "It spreads the recomputation cost across every reader equally",
            ],
            correctIndex: 2,
            explain:
              "As the entry ages, each reader has a rising chance of refreshing it early. The value is replaced while it is still valid, so the moment of expiry never arrives with a thousand requests waiting on it.",
          },
        ],
      },
      {
        id: "http-caching",
        title: "Caching at the edge",
        level: "intermediate",
        body: [
          "The cheapest cache is the one you do not operate. HTTP has caching built into it, and a correctly labelled response can be held by the browser, by any proxy in the path and by a CDN with a few hundred points of presence, none of which you pay for or run. The whole mechanism is a handful of headers, which is why getting them wrong is both easy and expensive.",
          "Cache-Control carries the instructions. max-age is how long any cache may reuse the response; s-maxage overrides it for shared caches only, which is how you say five seconds at the CDN and none in the browser. private means only the browser may store it, which is what you want for anything user-specific. no-store means keep no copy at all, and it is what people mean when they wrongly write no-cache, which actually means store it but revalidate before reuse.",
          "Validators handle the revalidation. The server sends an ETag or a Last-Modified, the client sends it back as If-None-Match or If-Modified-Since, and the server answers 304 Not Modified with no body when nothing changed. The saving is the payload, and on APIs it can be most of the traffic: GitHub does not count a conditional request that returns 304 against your rate limit, which turns polite polling into something the platform actively encourages.",
          "Two extensions from RFC 5861 are worth more than they cost. stale-while-revalidate lets a cache serve a slightly stale copy immediately and refresh in the background, so the person waiting never pays for the refresh. stale-if-error lets it serve stale content when the origin is failing, which converts an origin outage into slightly old pages for anyone whose request the edge can answer.",
          "The cache key is the part that bites. By default it is the URL, and Vary adds request headers to it, so Vary: Accept-Encoding is fine and Vary: User-Agent shatters your hit ratio into thousands of fragments, one per browser string. Query parameters count too, which is why an analytics parameter appended to a shared link produces a fresh miss for every recipient of that link. Normalising the key is often the single largest hit-ratio improvement available.",
          "Purging is where people reach first and should reach last. Content-addressed URLs, the hashed filenames every bundler emits, make purging unnecessary: a new build is a new URL, so the old one can be cached forever and the new one is never stale. That works precisely because the URL identifies the bytes. Applying the same immutable policy to a URL whose content can change is how a site serves a year-old page to everyone who visited during a bad deploy, and no purge fixes the copies already held in browsers.",
        ],
        why: "An edge cache is the only tier that reduces latency and origin load at the same time, for a cost of nothing. The reason it is under-used is that its controls live in headers rather than in code, so they are invisible in review and nobody owns them, which is also why one wrong header can sit in production for months.",
        inPractice:
          "GitHub exempts conditional requests that return 304 from its rate limits, which is a rate limit designed to reward correct caching. This site learned the other half the hard way: an immutable Cache-Control applied by path rather than by response meant the SPA fallback was cached under asset URLs for a year, and the fix was to decide the header from what the response actually is.",
        diagram: {
          caption: "Three caches before your origin, and the headers that drive them",
          columns: [
            [{ id: "b", label: "Browser cache", sub: "max-age", kind: "client" }],
            [{ id: "p", label: "Shared proxy", sub: "s-maxage", kind: "edge" }],
            [{ id: "cdn", label: "CDN", sub: "stale-while-revalidate", kind: "edge" }],
            [{ id: "org", label: "Origin", sub: "sees the misses", kind: "service" }],
            [{ id: "v", label: "304 Not Modified", sub: "ETag matched", kind: "data" }],
          ],
          edges: [
            { from: "b", to: "p", label: "on miss" },
            { from: "p", to: "cdn", label: "on miss" },
            { from: "cdn", to: "org", label: "on miss or revalidate" },
            { from: "org", to: "v", label: "unchanged: no body" },
          ],
        },
        check: {
          prompt: "What does Cache-Control: no-cache actually instruct a cache to do?",
          options: [
            "Store nothing, so every request goes to the origin for a fresh copy",
            "Store the response, but revalidate with the origin before reusing it",
            "Store the response only in the browser, never in a shared proxy",
            "Store the response and serve it stale whenever the origin is failing",
          ],
          correctIndex: 1,
          explain:
            "no-cache permits storage and requires revalidation, which is usually cheap because it ends in a 304 with no body. The directive that forbids storing anything is no-store, and confusing the two is the most common mistake in this area.",
        },
        checks: [
          {
            prompt: "An API adds Vary: User-Agent to its responses. What happens to the CDN hit ratio?",
            options: [
              "It improves, because responses are tailored to each client type",
              "It is unchanged, since Vary only affects browser caches, not shared ones",
              "It collapses, because each distinct user agent string is a separate entry",
              "It collapses only for authenticated requests, which already vary by token",
            ],
            correctIndex: 2,
            explain:
              "Vary adds the named headers to the cache key. User-Agent has effectively unbounded cardinality, so one shared entry becomes thousands of near-identical ones, most of which are never hit twice.",
          },
          {
            prompt: "Why can hashed asset filenames be cached for a year with no purge mechanism?",
            options: [
              "CDNs purge hashed paths automatically when a new build is deployed",
              "The hash is checked by the browser before the cached copy is reused",
              "The URL identifies the bytes, so new content is always a new URL",
              "Immutable responses are revalidated cheaply using their ETag",
            ],
            correctIndex: 2,
            explain:
              "Content addressing removes the possibility of staleness: the old URL is still correct for the old bytes and simply stops being requested. The same policy on a URL whose content can change is how caches end up serving a wrong page nobody can recall.",
          },
          {
            prompt: "What does stale-if-error buy you during an origin outage?",
            options: [
              "The edge keeps serving the last good copy instead of an error page",
              "The edge retries the origin until one of the attempts succeeds",
              "Requests are queued at the edge and replayed once the origin recovers",
              "The edge falls back to a second origin in another region entirely",
            ],
            correctIndex: 0,
            explain:
              "It converts an origin outage into slightly old content for everyone the edge can answer from cache. For a content site that is close to invisible, and it costs one directive.",
          },
        ],
      },
      {
        id: "what-not-to-cache",
        title: "What not to cache",
        level: "advanced",
        body: [
          "Caching adds a second source of truth and a new class of bug, and it earns that when three things are true: reads dominate writes, the data tolerates some staleness, and recomputing it is genuinely expensive. Miss any one of them and you have added complexity for nothing, or worse, for a correctness problem that shows up as a customer complaint rather than as an alert.",
          "Data that changes on nearly every read gains nothing. You pay the write cost, then miss anyway, and the cache becomes a tax on the read path plus an extra system to operate. Per-user data with no reuse is usually the same story: a cache entry read once before it expires has cost more than it saved, and a million of them evict the entries that were actually working.",
          "Anything where stale means wrong deserves a different answer entirely. A permission set cached for five minutes means access revoked five minutes ago still works, and that is a security failure rather than a latency tradeoff. If you must cache it, cache it for seconds, with an explicit revocation path, and write the staleness into the contract so it is a known property rather than an accident.",
          "The arithmetic of hit ratios is worth internalising, because it is not linear and people reason about it as if it were. At a 1ms hit and a 50ms miss, a 95% hit ratio gives an average of about 3.5ms, and 99% gives about 1.5ms. That looks like a modest difference until you look at the origin instead of the average: going from 99% to 98% doubles the load reaching your database, and from 99% to 95% multiplies it by five. Cache work should be judged by what it does to the miss rate, not by what it does to the mean.",
          "It follows that a cache is not a fix for a slow query, it is a way to run a slow query less often. The queries still run, on every miss, on every eviction, and on every cold start, which is exactly the moment you are least able to absorb them: a restart after an incident empties the cache and sends the full read load at a database that has just recovered. If the origin cannot survive its own traffic without the cache, the cache has become a load-bearing part of the system, and it should be designed as one rather than described as an optimisation.",
          "The honest question, then, is not what to cache but what staleness is acceptable for, and for how long. Answer it per dataset, write the answer down next to the TTL, and the caching design follows. If the answer is none, the fix is a faster query, a better index, or a different shape of data, and no amount of caching will substitute for it.",
        ],
        why: "Every cache is a bet that stale data is cheaper than slow data, and the bet has to be made per dataset rather than per system. The failure mode people miss is the cold start: a cache is an optimisation right up until the origin cannot survive without it, at which point it is a dependency with a much weaker durability story than the database behind it.",
        inPractice:
          "AWS IAM is eventually consistent by design and documents it: a policy change may take seconds to propagate globally. That is the honest form of caching permissions, with the staleness written into the contract rather than hidden inside an implementation detail that surprises someone during an incident.",
        diagram: {
          caption: "Hit ratio compounds at the origin, not in the average",
          columns: [
            [{ id: "t", label: "10,000 reads", kind: "client" }],
            [
              { id: "h99", label: "99% hit", sub: "100 reach origin", kind: "data" },
              { id: "h95", label: "95% hit", sub: "500 reach origin", kind: "data", alternative: true },
            ],
            [{ id: "db", label: "Database", sub: "five times the load", kind: "data" }],
          ],
          edges: [
            { from: "t", to: "h99", label: "same traffic" },
            { from: "t", to: "h95", label: "same traffic" },
            { from: "h99", to: "db", label: "100 queries" },
            { from: "h95", to: "db", label: "500 queries" },
          ],
        },
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
            "Stale permissions are a security bug, not a performance tradeoff: the failure grants access instead of costing latency. Session validity is the close call, it is cached constantly in practice, but with seconds-long TTLs and a revocation list precisely because it carries the same risk in weaker form.",
        },
        checks: [
          {
            prompt: "A cache hit ratio falls from 99% to 98%. What happens at the database?",
            options: [
              "Load roughly doubles, because the miss rate has doubled",
              "Load rises by about one per cent, matching the ratio change",
              "Average latency doubles, but the query count is unchanged",
              "Nothing changes until the ratio falls below the eviction threshold",
            ],
            correctIndex: 0,
            explain:
              "Origin load is the miss rate, not the hit rate. One per cent to two per cent is twice as many queries, which is why cache work should be measured against misses rather than against averages.",
          },
          {
            prompt: "Why is a cold cache after a restart particularly dangerous?",
            options: [
              "Eviction policies behave unpredictably until the keyspace is populated",
              "The full read load arrives at a database that has just recovered",
              "Connection pools are re-established more slowly than caches populate",
              "Warming the cache requires writes, which contend with normal traffic",
            ],
            correctIndex: 1,
            explain:
              "The cache was absorbing most reads, and now none of them. If the origin cannot survive its own traffic unaided, the cache is load-bearing, and restarting the system is the moment that becomes visible.",
          },
          {
            prompt: "What is the right first question before adding a cache to a dataset?",
            options: [
              "Which structure and eviction policy suit the access pattern best",
              "Whether the data fits in memory at the current growth rate",
              "How much staleness is acceptable here, and for how long",
              "Whether the read path can tolerate an extra network hop",
            ],
            correctIndex: 2,
            explain:
              "Everything else follows from the staleness budget: TTL, invalidation strategy, whether to cache at all. If the acceptable staleness is zero, the answer is a faster query rather than a cache.",
          },
        ],
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
          "The choice follows from what your requests look like. Uniform and stateless, and round robin is enough. Wildly variable durations, and it is least connections. Anything cached or held per server, and it is hashing, accepting that you have just made your traffic distribution depend on your key distribution.",
        ],
        why: "Round robin is the default and is wrong whenever request cost varies wildly, one slow endpoint drags a server down while the balancer keeps feeding it work.",
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
          "Consistent hashing places servers and keys on a ring, so adding or removing a node only moves the keys between it and its neighbour, roughly one over n of the total. Virtual nodes spread each physical server across many ring positions, which evens out a distribution that would otherwise be lumpy.",
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
          "The usual compromise is a deep check that degrades instead of failing. Report unhealthy only after several consecutive failures, and never let a dependency the request path does not need mark you down.",
          "Connection draining then lets a server finish its in-flight requests before it leaves the pool, so a deploy does not drop live traffic. Keep readiness and liveness separate while you are there, not ready yet and needs restarting call for very different responses.",
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
        inPractice:
          "Stripe's API returns a charge in a pending state and sends the final outcome by webhook, so the response means accepted rather than settled. The interface is honest about the difference, which is the part that makes asynchrony tolerable.",
        check: {
          prompt: "You move a piece of work behind a queue. What does the caller lose the moment it receives its response?",
          options: [
            "Throughput, since the broker adds a network hop to every unit of work",
            "The ability to scale that work independently of the request path",
            "Certainty the work is done, the response now means accepted, not completed",
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
          "At-most-once may drop messages. At-least-once may deliver twice. Exactly-once is what everyone wants, and end to end in a distributed system it is not achievable, because the acknowledgement itself can be lost and the sender cannot tell a lost ack from a lost message.",
          "What gets sold as exactly-once is at-least-once delivery plus idempotent processing, so a duplicate has no additional effect. Kafka's exactly-once semantics are real but scoped: they cover reading from a topic, writing to a topic, and committing the offset, as one atomic unit inside Kafka. The moment your handler calls Stripe, that guarantee has left the building.",
          "The rate matters for how much you care. Duplicates are rare, in the region of one in ten thousand under normal operation, and then arrive in a cluster during a rebalance or a network partition, which is exactly when you are least able to reason about them. Designing for the average rate is how you get a bad afternoon during an incident.",
          "Idempotency in practice is a table of processed message ids with a unique constraint, checked inside the same transaction as the work. Insert the id, do the work, commit. A duplicate hits the constraint and rolls back having done nothing. Keep the ids for longer than your broker's maximum redelivery window, and remember that a natural key from the payload, an order id, is often better than the broker's message id, which changes on republish.",
        ],
        why:
          "The question is never whether duplicates happen; it is whether the second one costs anything. Once the handler is idempotent, at-least-once is sufficient and the broker's guarantees stop being interesting, which is why buying a broker that advertises exactly-once buys you very little.",
        diagram: {
          "caption": "Exactly-once is at-least-once plus a consumer that can absorb a repeat",
          "columns": [
            [
              {
                "id": "p",
                "label": "Producer",
                "kind": "service"
              }
            ],
            [
              {
                "id": "b",
                "label": "Broker",
                "sub": "may redeliver",
                "kind": "queue"
              }
            ],
            [
              {
                "id": "c",
                "label": "Consumer",
                "sub": "idempotent, guards side effects",
                "kind": "service"
              }
            ]
          ],
          "edges": [
            {
              "from": "p",
              "to": "b",
              "label": "publish"
            },
            {
              "from": "b",
              "to": "c",
              "label": "deliver, sometimes twice"
            }
          ]
        },
        check: {
          prompt: "Your broker advertises exactly-once. Do consumers still need to be idempotent?",
          options: [
            "No, the broker deduplicates by message ID, so a handler is entered at most once",
            "Yes, the guarantee covers broker state, not the email or charge your handler performs",
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
          "Ordering guarantees are usually per partition, not global. Kafka orders within a partition; across partitions there is no order at all, and a consumer reading two partitions sees them interleaved arbitrarily.",
          "Keying by entity is what makes this workable. Hash the user id, or the order id, and every event for that entity lands in the same partition and arrives in the order it was produced. That is almost always the ordering you actually needed: nobody cares whether user A's update preceded user B's, but everyone cares that A's address change is not overtaken by A's earlier one.",
          "The cost is that a partition is the unit of parallelism. Ten partitions means at most ten consumers in a group, and adding an eleventh does nothing. Choosing the count is a one-way door in practice, because increasing it changes which partition a key hashes to, so events for one entity end up split across the old and new partitions and ordering breaks for exactly the keys you were protecting.",
          "Global ordering means one partition, one consumer, and no parallelism. It is occasionally the right answer, for a ledger or an audit log, and it should be a deliberate decision with a throughput number attached rather than something arrived at by accident.",
        ],
        why:
          "The useful question is not whether you need ordering but what you need it within. Almost every system that thinks it needs global ordering needs per-entity ordering, and the difference is the entire throughput of the system.",
        diagram: {
          "caption": "Key by entity: order within a user, parallelism across users",
          "columns": [
            [
              {
                "id": "e",
                "label": "Events",
                "sub": "many users",
                "kind": "service"
              }
            ],
            [
              {
                "id": "k",
                "label": "Partition by user id",
                "kind": "edge"
              }
            ],
            [
              {
                "id": "p0",
                "label": "Partition 0",
                "sub": "user A, in order",
                "kind": "queue"
              },
              {
                "id": "p1",
                "label": "Partition 1",
                "sub": "user B, in order",
                "kind": "queue"
              }
            ]
          ],
          "edges": [
            {
              "from": "e",
              "to": "k"
            },
            {
              "from": "k",
              "to": "p0"
            },
            {
              "from": "k",
              "to": "p1"
            }
          ]
        },
        inPractice:
          "Kafka guarantees order within a partition and nothing across partitions, which is why keying by entity id is the standard practice rather than a trick. LinkedIn built it that way for exactly this reason.",
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
          "A message that fails is usually retried. Without a limit, a permanently broken message is retried forever: it consumes a consumer slot, it is redelivered ahead of newer work in some brokers, and it can hold up an entire partition while everything behind it waits.",
          "A dead letter queue is where a message goes once it has failed enough times. The main queue keeps flowing, the failure is preserved rather than dropped, and someone can look at it. That last part is the point and the part usually skipped: a dead letter queue nobody reads is a slower way of deleting messages.",
          "Retries need backoff with jitter. Pure exponential backoff keeps every client synchronised, because they all wait the same intervals from the same failure, so the failing dependency is hit by the whole fleet at once, recovers, and is hit again. Full jitter, a random wait between zero and the current ceiling, spreads them out. AWS published the arithmetic on this and the difference is not marginal.",
          "Distinguish what is worth retrying. A 503 or a timeout is transient and deserves the full ladder; a 400, a schema violation or a foreign key that will never exist is permanent, and retrying it eight times over a day just delays the moment someone finds out. Route those to the dead letter immediately, with the error attached, so the queue tells you what is wrong rather than only that something is.",
        ],
        why:
          "The retry policy is where a queue stops being a buffer and becomes a system with behaviour. Getting the limit and the backoff right is what decides whether a downstream blip is invisible or becomes your outage too.",
        diagram: {
          "caption": "Bounded retries, then somewhere to put what will never succeed",
          "columns": [
            [
              {
                "id": "q",
                "label": "Main queue",
                "kind": "queue"
              }
            ],
            [
              {
                "id": "w",
                "label": "Worker",
                "sub": "backoff with jitter",
                "kind": "service"
              }
            ],
            [
              {
                "id": "ok",
                "label": "Done",
                "kind": "data"
              },
              {
                "id": "dl",
                "label": "Dead letter",
                "sub": "inspect, fix, replay",
                "kind": "queue"
              }
            ]
          ],
          "edges": [
            {
              "from": "q",
              "to": "w"
            },
            {
              "from": "w",
              "to": "ok",
              "label": "success"
            },
            {
              "from": "w",
              "to": "q",
              "label": "retry, backed off",
              "async": true
            },
            {
              "from": "w",
              "to": "dl",
              "label": "attempts exhausted"
            }
          ]
        },
        inPractice:
          "AWS SQS has a redrive policy: set a maximum receive count and the message moves to a dead letter queue automatically, with a redrive action to send them back once the bug is fixed. The replay path is the part worth copying.",
        check: {
          prompt: "Why add jitter to exponential backoff?",
          options: [
            "So the total wait converges faster than pure exponential growth would",
            "So retrying clients spread out instead of all waking at the same instants",
            "So a retry cannot land while the previous attempt is still in flight",
            "So the broker can tell a retry from a fresh publish of the same message",
          ],
          correctIndex: 1,
          explain: "Pure exponential backoff keeps clients synchronised, they all wait the same intervals and retry together. Jitter breaks that alignment.",
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
          "A read replica copies the primary and serves reads, which scales read capacity. Writes still go to one place, so this buys nothing for a write-heavy workload; it is the right move when reads outnumber writes by ten to one or more, which most applications do.",
          "Replication is asynchronous by default, so a replica is always slightly behind. Usually single-digit milliseconds, and then a bulk update, a long transaction or a network hiccup pushes it to seconds or minutes, and the lag is worst exactly when traffic is highest.",
          "That gap causes read-your-own-writes bugs. A user saves their profile, the next read lands on a replica that has not caught up, and they see the old value and conclude it did not save. They press save again. Now you have a duplicate, and a support ticket that says the site is broken, which it is.",
          "The fix is not stronger consistency but a narrower rule: after a user writes, pin that user's reads to the primary for a few seconds. A cookie or a session flag carrying a timestamp is enough, and it costs almost nothing because only the writing user pays. The alternatives are worse: reading everything from the primary throws away the reason you added replicas, and waiting for synchronous replication makes every write as slow as your slowest replica.",
        ],
        why:
          "Replication lag is not a bug to be eliminated, it is the price of the read capacity. The engineering is in deciding which reads can tolerate it, and the honest answer is nearly all of them except the ones belonging to the person who just wrote.",
        diagram: {
          "caption": "Reads scale out; the write path does not, and the gap is what users notice",
          "columns": [
            [
              {
                "id": "u",
                "label": "User",
                "kind": "client"
              }
            ],
            [
              {
                "id": "rt",
                "label": "Router",
                "sub": "read or write",
                "kind": "edge"
              }
            ],
            [
              {
                "id": "pri",
                "label": "Primary",
                "sub": "all writes",
                "kind": "data"
              },
              {
                "id": "rep",
                "label": "Replicas",
                "sub": "milliseconds behind",
                "kind": "data"
              }
            ]
          ],
          "edges": [
            {
              "from": "u",
              "to": "rt"
            },
            {
              "from": "rt",
              "to": "pri",
              "label": "writes, and reads just after one"
            },
            {
              "from": "rt",
              "to": "rep",
              "label": "everything else"
            },
            {
              "from": "pri",
              "to": "rep",
              "label": "replication lag",
              "async": true
            }
          ]
        },
        inPractice:
          "GitHub's 2018 incident report describes a network partition that left replicas behind the primary, and the decision to serve stale data rather than fail. The write-up is a good account of what read-your-own-writes costs when it is not designed in.",
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
          "Resharding later means moving live data while still serving traffic from it. That is why the honest order is replicas, caching, better indexes and a bigger machine first, all of which are reversible, and none of which this is.",
        ],
        why: "Shard last. Read replicas, caching, better indexes and a bigger instance all come first, because they are reversible. Sharding changes your data model permanently.",
        inPractice:
          "Notion sharded Postgres by workspace in 2021 and wrote it up honestly: the migration took months, the key was chosen because almost every query is scoped to one workspace, and resharding later was the part they most wanted to avoid.",
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
          "It is rarely uniform within one company. A core ledger chooses consistency and refuses; the ATM in the lobby chooses availability, dispenses anyway, and reconciles later with an overdraft fee, which is Brewer's own illustration of the trade.",
        ],
        why: "'We chose AP' is meaningless without saying what happens to conflicting writes afterwards. The interesting engineering is the reconciliation, not the letter.",
        inPractice:
          "DynamoDB lets you choose per read: eventually consistent by default, strongly consistent on request at twice the cost and higher latency. The tradeoff is a parameter rather than a property of the system.",
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
            "Choosing availability means accepting divergence, so you owe a resolution rule. Last-write-wins by timestamp is one such rule, not an alternative to having one, and it is the lossiest, since it silently discards the losing write and depends on clocks you do not control. A quorum is the other branch entirely: it is what you choose when you would rather refuse the write than reconcile it.",
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
        inPractice:
          "Amazon's shopping basket resolves conflicting writes by taking the union, so a partition can lose a removal but never a purchase. Dynamo's paper is explicit that this is a business decision expressed as a merge rule.",
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
            "Users notice their own actions going missing, and almost never notice someone else's arriving late. Routing every read to the primary does fix it, by throwing away the reason you added replicas, the question asked for the cheapest fix, and honest pending state costs nothing.",
        },
      },
    ],
  },

  {
    id: "resilience",
    title: "Rate limiting and resilience",
    summary: "Timeouts, retries, breakers, limits and degradation: staying up when a dependency does not.",
    track: "design",
    topics: [
      {
        id: "rate-limiting",
        title: "Token bucket and sliding window",
        level: "intermediate",
        body: [
          "A fixed window counter is simple, and it allows double the limit across a boundary: a full quota at the end of one window, another full quota at the start of the next. A limit of 100 a minute permits 200 in the two seconds either side of the boundary, which is exactly the burst you were trying to prevent, and it arrives at the least convenient moment because every client with a cron job fires on the minute.",
          "A sliding window fixes that by weighting the previous window: twenty seconds into the current one, it counts a third of the current window plus two thirds of the last. It is an approximation, and it is cheap, one counter per window per key rather than a timestamp per request, which is why it is what large edge platforms actually run. A true sliding log, keeping every request timestamp, is exact and costs memory proportional to traffic, which is the wrong trade at the edge and the right one for a small number of very expensive operations.",
          "A token bucket takes a different approach: refill at a steady rate up to a maximum, spend one token per request. It usually fits an API best, because real traffic is bursty and a strictly even rate feels broken to whoever is using it. A bucket of 100 refilling at 10 a second lets a client that has idled for ten seconds fire 100 requests immediately, then settle to 10 a second, which is what a paginating script or a page loading twelve resources actually does. The leaky bucket is the same shape with the burst removed: a queue that drains at a fixed rate, right when the thing you are protecting cannot absorb a spike at all.",
          "Where you count matters as much as how you count. Per-IP catches obvious abuse and punishes an office behind one NAT, or every user of a mobile carrier's gateway. Per-key is right for an authenticated API and useless before login, which is where the credential stuffing happens. Per-user-per-endpoint is the most correct and carries the most state. Most real systems run several limiters at once, on different keys, for different reasons.",
          "Stripe published theirs, and the shape is worth copying: a request rate limiter for sustained traffic, a concurrency limiter for calls in flight at once because a slow endpoint can starve a fleet without ever breaching a rate, and two load shedders that reserve capacity for critical traffic when the fleet is under pressure, so a runaway batch job cannot stop a card being charged.",
          "Whatever you choose, tell the caller. Return 429 with a Retry-After, and publish the remaining budget and reset time on every response, not just the rejected ones. A client that cannot see the limit either hammers you until it hits the wall or backs off so conservatively that it never uses what it paid for. Both are worse for you than telling it, and the second one generates a support ticket saying your API is slow.",
        ],
        why:
          "Limits exist to protect a resource, so the shape should follow what that resource cannot absorb. A bucket that permits bursts is right when the cost is throughput; a strict rate is right when the cost is a downstream call you pay for per invocation; a concurrency limit is right when the cost is a held connection. Picking the algorithm before naming the resource is how you end up with a limit that blocks good traffic and misses the bad.",
        inPractice:
          "GitHub returns the remaining budget and the reset time on every response, so a client can pace itself rather than discover the limit by hitting it. Stripe runs four limiters side by side, rate, concurrency and two load shedders, because the ways an API can be overwhelmed are not variations of one another.",
        diagram: {
          caption: "A bucket refills at a steady rate and permits a burst up to its size",
          columns: [
            [{ id: "c", label: "Caller", kind: "client" }],
            [{ id: "lim", label: "Token bucket", sub: "refills per second", kind: "edge" }],
            [
              { id: "app", label: "Your API", kind: "service" },
              { id: "no", label: "429", sub: "with Retry-After", kind: "external" },
            ],
          ],
          edges: [
            { from: "c", to: "lim", label: "request" },
            { from: "lim", to: "app", label: "token available" },
            { from: "lim", to: "no", label: "bucket empty" },
          ],
        },
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
        checks: [
          {
            prompt: "An endpoint holds a connection for 30 seconds. A rate limit of 100 a minute is in place and the fleet still falls over. Why?",
            options: [
              "The limiter counts requests, not the calls still open at any moment",
              "Long requests are counted when they finish, so the window is wrong",
              "Retry-After is ignored by clients on connections already established",
              "The limiter refills faster than long requests can be completed",
            ],
            correctIndex: 0,
            explain:
              "Rate and concurrency are different resources. A hundred slow calls a minute can mean fifty open at once, each holding a worker, which a rate limiter never sees. That is why a concurrency limiter usually sits beside the rate limiter rather than instead of it.",
          },
          {
            prompt: "Why do large edge platforms use a weighted sliding window rather than a sliding log?",
            options: [
              "A log cannot be shared across the many nodes serving one customer",
              "A log stores a timestamp per request, so memory scales with traffic",
              "A weighted window is exact, and a log is only ever an approximation",
              "A log cannot express bursts, which is what real clients actually send",
            ],
            correctIndex: 1,
            explain:
              "The exact answer costs memory proportional to the traffic you are trying to survive. Two counters per key and a weighting is close enough at the edge, and the error is small compared to the cost of being precise about it.",
          },
          {
            prompt: "Rate limiting per IP address is the default in many gateways. What does it get wrong?",
            options: [
              "It cannot be applied before a request has been authenticated",
              "It requires storing an identifier that counts as personal data",
              "One office or carrier behind one address shares a single budget",
              "Addresses rotate too often for a counter to accumulate usefully",
            ],
            correctIndex: 2,
            explain:
              "Thousands of legitimate users behind one NAT or mobile gateway look like one very busy client, while an attacker with a pool of addresses looks like thousands of quiet ones. It is the cheapest key available before login, and it is a poor proxy for a user.",
          },
        ],
      },
      {
        id: "timeouts",
        title: "Timeouts and deadlines",
        level: "intermediate",
        body: [
          "A timeout is the number that decides how long you are willing to hold a resource for an answer that may never come, and most systems get it by accident. The default in many HTTP clients is no timeout at all, or a connect timeout with no read timeout, which is the same thing where it matters: a socket that opens and then goes quiet holds a worker forever.",
          "Little's Law gives you the arithmetic and it is worth doing on paper before an incident does it for you. Concurrency equals arrival rate times latency. A service taking 100 requests a second at 50ms needs 5 concurrent workers. The same service at 30 seconds needs 3,000. Nothing about the traffic changed and nothing about the code changed; the only thing that moved was latency, and the pool that comfortably held 5 is now short by a factor of six hundred. This is why a slow dependency is more dangerous than a dead one: the dead one returns instantly and you handle it.",
          "Timeouts have to decrease as you go down the call tree. If a browser gives up after 10 seconds, the API waiting 30 for a service that waits 30 for the database means every layer is working on a result nobody is waiting for, holding connections that live requests need. The rule is that each hop's timeout is shorter than its caller's, with room for a retry if the layer retries.",
          "The better version of the rule is a deadline rather than a timeout: a wall-clock instant that travels with the request, so each hop passes on the time remaining rather than starting a fresh clock. gRPC does this natively, and it is why a deep call tree there degrades sensibly. Over HTTP you carry it yourself in a header and enforce it in a middleware. The difference shows up in the tail: with independent timeouts, four hops of 2 seconds each can spend 8 seconds serving a client that left after 3.",
          "Choose the number from the latency distribution, not from a round figure. A timeout at the 99th percentile plus a margin cuts off the pathological tail without failing the merely slow. Setting it at the mean fails a fifth of good requests; setting it at ten times the p99 means it never fires and you have written a comment rather than a control.",
          "The instinct during an incident is to raise the timeout, and it reliably makes things worse: the calls that were failing now wait longer before failing, holding more resources for longer, and the failure spreads from one dependency to everything sharing that pool. Failing fast is what frees capacity, and it is what turns a broken dependency into a degraded page instead of a total outage.",
        ],
        why:
          "Every timeout is a statement about how long a result stays worth having, and that is a product question as much as an engineering one. Systems that survive dependency failures are the ones where that number was chosen deliberately, propagated down the tree, and set lower than the patience of whoever is waiting.",
        inPractice:
          "gRPC carries a deadline on every call and propagates the remainder to downstream calls automatically, which is the mechanism most teams end up reimplementing badly over HTTP. Amazon's Builders' Library recommends picking timeouts from the observed latency distribution rather than round numbers, on the grounds that a timeout chosen without data is either never reached or fires constantly.",
        diagram: {
          caption: "A deadline travels with the request; independent timeouts do not",
          columns: [
            [{ id: "user", label: "Browser", sub: "gives up at 10s", kind: "client" }],
            [{ id: "api", label: "API", sub: "budget 9s", kind: "service" }],
            [{ id: "svc", label: "Service", sub: "budget 6s left", kind: "service" }],
            [{ id: "db", label: "Database", sub: "budget 3s left", kind: "data" }],
            [{ id: "drop", label: "Cancelled work", sub: "nobody is waiting", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "user", to: "api", label: "deadline set" },
            { from: "api", to: "svc", label: "time remaining" },
            { from: "svc", to: "db", label: "time remaining" },
            { from: "db", to: "drop", label: "without a deadline", async: true },
          ],
        },
        check: {
          prompt: "A service handling 100 requests a second sees latency go from 50ms to 30s. How many concurrent requests is it now holding?",
          options: [
            "About 5, since the request rate has not changed at all",
            "About 300, one for every hundredth of the new latency",
            "About 3,000, because concurrency is arrival rate times latency",
            "About 30,000, one per second of latency per request in flight",
          ],
          correctIndex: 2,
          explain:
            "Little's Law: concurrency equals arrival rate times latency. 100 per second times 30 seconds is 3,000 in flight, against a pool sized for 5. The traffic did not change; only the time each request holds a worker did.",
        },
        checks: [
          {
            prompt: "Why must a deeper service have a shorter timeout than the one calling it?",
            options: [
              "Deeper services are slower, so they need a tighter budget to compensate",
              "Otherwise it keeps working on a result its caller has already abandoned",
              "Shorter timeouts deeper down reduce the total number of retries attempted",
              "The connection pool is shared, so the deepest timeout sets the limit",
            ],
            correctIndex: 1,
            explain:
              "If the layer below waits longer than the layer above, the caller times out first and everything underneath keeps holding connections for an answer nobody will read. Budgets have to shrink as you descend, leaving room for any retry the layer performs.",
          },
          {
            prompt: "What does a propagated deadline give you that per-hop timeouts do not?",
            options: [
              "Every hop knows the time actually left, not a fresh full budget",
              "Slow hops are automatically retried within the remaining budget",
              "Downstream services can extend the deadline when work is nearly done",
              "The client is told in advance how long the whole call will take",
            ],
            correctIndex: 0,
            explain:
              "Independent timeouts each start a new clock, so four hops of two seconds can add up to eight while the client left after three. A deadline is an instant, not a duration, so every hop is working against the same wall clock.",
          },
          {
            prompt: "During an incident, raising a timeout from 2s to 30s usually makes things worse. Why?",
            options: [
              "Longer timeouts increase the chance of a retry landing on a healthy node",
              "The extra latency pushes the service past its rate limit at the edge",
              "Requests that used to fail fast now hold workers for fifteen times longer",
              "Clients interpret slow responses as failures and open new connections",
            ],
            correctIndex: 2,
            explain:
              "The failing calls do not start succeeding, they just occupy the pool for longer, so the queue behind them grows and the failure spreads to everything sharing that pool. Failing fast is what returns capacity to the requests that can still be served.",
          },
        ],
      },
      {
        id: "retries-backoff",
        title: "Retries, backoff and jitter",
        level: "intermediate",
        body: [
          "A retry is the cheapest available fix for a transient failure and the fastest available way to turn a small problem into an outage. Both are true, and which one you get depends on three decisions: whether the call is safe to repeat, how long you wait between attempts, and whether the system as a whole has a budget for retrying at all.",
          "Safety comes first. Retrying a non-idempotent call after a timeout is how a customer gets charged twice, because a timeout tells you nothing about whether the work happened. The fix is an idempotency key generated by the client, stored server side with the result, so a repeat returns the original outcome rather than performing the work again. Without that, the only correct retry policy for a payment is no retries.",
          "Immediate retries are the wrong shape because the thing you are retrying is usually overload, and hitting it again straight away adds to exactly the load that caused the failure. Exponential backoff, doubling the wait each attempt with a ceiling, gives the dependency room to recover. But backoff alone leaves every client synchronised: they all failed at the same instant, so they all retry at the same instant, and the recovering service is hit by a wall.",
          "Jitter is what breaks the synchronisation, and AWS published the arithmetic in 2015. Full jitter, sleeping a random duration between zero and the capped exponential interval, produced substantially less contention and less total work than plain exponential backoff in their simulations. It feels wrong to make the delay random and it is the single highest-value line in most retry implementations.",
          "The failure that surprises people is amplification. Three attempts at each of four layers is not three times the load, it is up to 3^4, or 81 times, because every layer multiplies the layer below it. A dependency that is slightly unhealthy receives a load spike caused entirely by the reaction to its own slowness, which guarantees it stays unhealthy. Retry at one layer, ideally the one closest to the user, and let the others fail through.",
          "The systemic answer is a retry budget rather than a per-call limit. Google's SRE practice caps retries at around 10% of requests over a window: below the cap, retries proceed; above it, they are refused, so a broadly failing dependency cannot be flooded by a fleet doing what each node individually considers reasonable. Pair it with servers that say which failures are worth retrying, since a 429 or a 503 with Retry-After is an invitation and a 400 is not, and never retry a call whose deadline has already passed.",
        ],
        why:
          "Retries convert independent failures into correlated load, which is the opposite of what they are meant to do. Everything in a good retry policy, backoff, jitter, budgets, retrying at one layer only, exists to stop the reaction to a failure from being larger than the failure.",
        inPractice:
          "The AWS SDKs default to exponential backoff with jitter and a small attempt count, and their guidance is to retry at one layer rather than at every layer. Google's SRE book describes both the client-side retry budget of roughly 10% and servers signalling explicitly when a request should not be retried, which is the pair that keeps a partial failure from becoming a total one.",
        diagram: {
          caption: "Retry at one layer, with jitter, inside a budget",
          columns: [
            [{ id: "cl", label: "Client", sub: "retries here only", kind: "client" }],
            [{ id: "budget", label: "Retry budget", sub: "10% of requests", kind: "edge" }],
            [{ id: "a", label: "Service A", sub: "no retries", kind: "service" }],
            [{ id: "b", label: "Service B", sub: "no retries", kind: "service" }],
            [
              { id: "dep", label: "Dependency", sub: "recovering", kind: "external" },
              { id: "storm", label: "3 retries per layer", sub: "81x load", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "cl", to: "budget", label: "attempt" },
            { from: "budget", to: "a", label: "under budget" },
            { from: "a", to: "b", label: "fail through" },
            { from: "b", to: "dep", label: "one attempt" },
            { from: "b", to: "storm", label: "if every layer retries", async: true },
          ],
        },
        check: {
          prompt: "Each of four layers retries a failing call three times. How much load does the bottom dependency see?",
          options: [
            "Three times the original, since retries at each layer share one budget",
            "Twelve times, three attempts added at each of the four layers",
            "Up to 81 times, because each layer multiplies the one below it",
            "The same as normal, because failed calls never reach the bottom layer",
          ],
          correctIndex: 2,
          explain:
            "Retries compound rather than add: three attempts per layer over four layers is 3 to the power of 4. The dependency's slowness produces a load spike caused entirely by the reaction to it, which is how it stays slow.",
        },
        checks: [
          {
            prompt: "Why add jitter to an exponential backoff schedule?",
            options: [
              "It spreads clients out, so a recovering service is not hit all at once",
              "It increases the number of attempts that fit within the retry budget",
              "It prevents a client from being fingerprinted by its retry pattern",
              "It compensates for clock differences between client and server",
            ],
            correctIndex: 0,
            explain:
              "Clients that failed together back off together and return together. Randomising the wait turns a wall of traffic into a slope, and AWS measured it as less total work as well as less contention.",
          },
          {
            prompt: "When is retrying a request after a timeout genuinely unsafe?",
            options: [
              "When the call is a read, since the result may have changed since",
              "When the response was already streamed partially to the client",
              "When the endpoint has no idempotency key, so a repeat may act twice",
              "When the deadline is measured by the server rather than the client",
            ],
            correctIndex: 2,
            explain:
              "A timeout does not tell you whether the work happened. Without an idempotency key stored with its result, the retry may perform the action a second time, which for a payment or a message send is the failure users actually notice.",
          },
          {
            prompt: "What does a retry budget across a fleet achieve that a per-call retry limit does not?",
            options: [
              "It guarantees each individual request is eventually served successfully",
              "It stops a broadly failing dependency being flooded by the whole fleet",
              "It allows more retries per call when the dependency is healthy again",
              "It removes the need for backoff, since the total rate is already capped",
            ],
            correctIndex: 1,
            explain:
              "Every node retrying three times is reasonable in isolation and catastrophic in aggregate. A budget measured against total requests caps the fleet's collective reaction, which is the quantity the dependency actually experiences.",
          },
        ],
      },
      {
        id: "circuit-breakers",
        title: "Circuit breakers and bulkheads",
        level: "intermediate",
        body: [
          "A circuit breaker counts failures over a window and trips once they cross a threshold, then fails fast for a cooling period, then lets a single trial request through to test recovery. Closed, open, half-open. The half-open state is the part that matters: without it, the full load arrives the instant the timer expires, knocks the recovering dependency over again, and the breaker flaps between states while everyone watches the dashboard oscillate.",
          "What a breaker buys you is not error handling, it is capacity. When it is open, calls fail in microseconds instead of holding a worker for the timeout, so the pool stays available for the requests that can still be served. It converts a dependency's failure from something that consumes your service into something that returns an error from one part of your service.",
          "The threshold should be a rate over a window with a minimum request count, not a raw count. Five failures means nothing at 10,000 requests a second and everything at ten a minute, and a breaker that trips on the first five errors after a quiet night will open on ordinary noise. The usual shape is at least twenty requests in the window and a failure rate above half.",
          "A bulkhead solves the neighbouring problem: it gives a dependency its own bounded pool of connections or threads, so calls to it cannot consume the resources that every other request needs. The name is from ship compartments, and the point is the same, one flooded compartment does not sink the vessel. A breaker stops you waiting on a broken thing; a bulkhead stops one thing taking everything with it while it breaks. They pair, and neither replaces the other.",
          "The modern criticism of hand-tuned breakers is that the numbers are guesses that age badly. Netflix built Hystrix, ran it at scale, and then retired it in favour of adaptive concurrency limits, which infer the safe level of in-flight work from observed latency rather than from constants a human chose in 2014. The pattern survived; the fixed thresholds did not, and the lesson worth taking is that a threshold set once will be wrong after the next capacity change.",
          "Whatever trips has to have somewhere to go. A breaker that opens and returns a 500 has only made the failure faster, which is genuinely valuable, but the better outcome is a fallback: last known good data, a default, or the feature quietly absent from the page. That decision belongs at design time, per dependency, and it is the difference between an incident and a slightly worse page.",
        ],
        why:
          "Waiting longer holds resources longer, which is why the instinct to raise the timeout during an outage makes it worse. Failing fast frees capacity, and combined with a bulkhead it confines the damage: one broken dependency becomes one broken section rather than an unavailable service.",
        inPractice:
          "Netflix built Hystrix for exactly this and then retired it, concluding that adaptive concurrency limits beat hand-tuned thresholds. The pattern is what most teams take from it; the more useful lesson is the one Netflix took, that the numbers should not be constants.",
        diagram: {
          caption: "Fail fast so a slow dependency cannot hold your threads",
          columns: [
            [{ id: "req", label: "Request", kind: "client" }],
            [{ id: "br", label: "Breaker", sub: "closed, open, half-open", kind: "edge" }],
            [
              { id: "dep", label: "Dependency", sub: "slow at 30s", kind: "external" },
              { id: "fb", label: "Fallback", sub: "cached or default", kind: "data" },
            ],
          ],
          edges: [
            { from: "req", to: "br" },
            { from: "br", to: "dep", label: "closed: try, with a timeout" },
            { from: "br", to: "fb", label: "open: return at once" },
            { from: "dep", to: "br", label: "errors trip it", async: true },
          ],
        },
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
            "Waiting longer holds resources longer, so failing fast is what stops the failure spreading. A bulkhead is genuinely part of the answer and pairs with a breaker instead of replacing it: it caps how much of you one dependency can consume, but on its own it lets every call into that pool keep waiting the full 30 seconds.",
        },
        checks: [
          {
            prompt: "What is the half-open state actually for?",
            options: [
              "It lets one request test recovery instead of the full load returning",
              "It allows reads through while writes remain blocked during recovery",
              "It halves the traffic to the dependency until errors stop appearing",
              "It keeps the breaker open until an operator confirms the fix",
            ],
            correctIndex: 0,
            explain:
              "Without it, everything resumes the moment the timer expires and knocks over a dependency that had barely recovered, so the breaker flaps. One trial request is enough to decide, and it costs one request to be wrong.",
          },
          {
            prompt: "Why should a breaker trip on a failure rate with a minimum volume, not a raw count?",
            options: [
              "Rates can be compared between services with different traffic levels",
              "Counts are expensive to maintain accurately across many instances",
              "Five errors is noise at high traffic and a total outage at low traffic",
              "A minimum volume ensures the breaker resets between deployments",
            ],
            correctIndex: 2,
            explain:
              "The same absolute number means completely different things at different traffic levels. Requiring a minimum sample before the rate is trusted stops the breaker opening on the ordinary noise of a quiet period.",
          },
          {
            prompt: "A bulkhead and a circuit breaker are often deployed together. What does the bulkhead add?",
            options: [
              "It fails calls faster once the dependency has started returning errors",
              "It caps how much of your service one dependency can ever consume",
              "It retries the failed calls in a separate pool to avoid interference",
              "It detects slow calls earlier by measuring latency per connection",
            ],
            correctIndex: 1,
            explain:
              "The breaker decides when to stop calling; the bulkhead decides how much of you is at risk while you are still calling. With a bounded pool per dependency, a slow one exhausts its own compartment and leaves the rest of the service intact.",
          },
        ],
      },
      {
        id: "graceful-degradation",
        title: "Graceful degradation and load shedding",
        level: "advanced",
        body: [
          "Not every dependency is essential, but a system only knows that if someone wrote it down. If recommendations are down, the product page should still render, with a cached set, a default set, or without that section at all. Absent an explicit decision, the default behaviour is that any dependency failure becomes a total failure, and that is a design choice made by omission rather than by anyone in particular.",
          "The exercise is to classify each dependency as critical or optional, and to give every optional one a named fallback: last known good value, a static default, or hide it. This costs almost nothing at design time and is expensive to retrofit, because by then the call is buried three layers down inside a function whose contract says it returns a list of recommendations, not a list or nothing.",
          "Load shedding is the same idea applied to your own capacity. Past a certain arrival rate, some requests will not be served, and the only question is whether you choose which ones or let a queue choose for you. Choosing means rejecting cheaply at the edge with a 503 and a Retry-After, ideally by priority, so a checkout still works while a report export waits. Not choosing means every request sits in a queue getting slower until they all time out together, which is the strictly worse outcome where nobody is served and you paid for the work anyway.",
          "Queues need bounds and an eviction policy for the same reason. An unbounded queue during overload fills with requests that will have timed out by the time they are picked up, so the server spends its capacity producing answers nobody is waiting for. Facebook's answer was to switch the queue to LIFO under load with a CoDel-style controlled delay: serve the newest requests, which still have a chance of being useful, and discard the oldest, which almost certainly do not. It feels unfair and it is the correct behaviour.",
          "Static stability is the other half. A system is statically stable when it keeps working with the data it already has while its control plane is unavailable: the caches keep serving, the routing keeps routing, and only changes stop. AWS designs this way deliberately, which is why running instances survive control plane incidents. It is a useful test to apply to your own design: if the configuration service is down for an hour, does traffic keep flowing, or does everything stop the moment a cache entry expires?",
          "Finally, degradation has to be visible or it becomes a lie. If the page renders without personalisation, something needs to say so, in a log at minimum and often in the interface, or the next person to look will conclude the personalisation service is fine because the page looks normal. The failure is confined, not fixed, and the difference matters to whoever is on call.",
        ],
        why:
          "This is the difference between an outage and a degraded experience most users never notice, and the decision has to be made before the incident, because during one nobody has time to work out which of forty dependencies are optional. Shedding load deliberately is the same argument applied to yourself: partial service by choice beats total failure by queueing.",
        inPractice:
          "Netflix renders its home page with cached or default rows when personalisation is unavailable, rather than failing the page. Facebook shifted request queues to LIFO with controlled delay under overload, on the reasoning that an old queued request is probably already abandoned, so serving the newest first maximises the number of requests that are still worth answering.",
        diagram: {
          caption: "Optional dependencies fall back; excess load is refused at the edge",
          columns: [
            [{ id: "u", label: "Request", kind: "client" }],
            [{ id: "shed", label: "Load shedder", sub: "503 by priority", kind: "edge" }],
            [{ id: "page", label: "Page assembly", sub: "critical path only", kind: "service" }],
            [
              { id: "core", label: "Catalogue", sub: "critical", kind: "data" },
              { id: "recs", label: "Recommendations", sub: "optional", kind: "external" },
            ],
            [{ id: "cache", label: "Last known good", sub: "or hide the section", kind: "data" }],
          ],
          edges: [
            { from: "u", to: "shed", label: "arrives" },
            { from: "shed", to: "page", label: "accepted" },
            { from: "page", to: "core", label: "must succeed" },
            { from: "page", to: "recs", label: "may fail" },
            { from: "recs", to: "cache", label: "on failure", async: true },
          ],
        },
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
        checks: [
          {
            prompt: "Under overload, why is shedding load at the edge better than queueing everything?",
            options: [
              "A queue reorders requests, so the ones that matter arrive last",
              "Shedding lets some requests succeed instead of all of them timing out",
              "Rejected requests are cheaper to log than requests that time out later",
              "Queues cannot apply priority, so shedding is the only way to rank work",
            ],
            correctIndex: 1,
            explain:
              "Capacity is capacity. Queueing everything means each request waits longer until they all fail together, and you paid for the work regardless. Refusing some early keeps the rest inside their deadlines.",
          },
          {
            prompt: "Why did Facebook switch request queues to LIFO under overload?",
            options: [
              "Newest requests are cheapest to serve, since their data is still cached",
              "LIFO keeps the queue shorter, which reduces memory pressure per node",
              "The oldest queued requests have probably been abandoned already",
              "FIFO cannot be combined with a controlled delay eviction policy",
            ],
            correctIndex: 2,
            explain:
              "During overload the front of a FIFO queue is full of requests whose clients gave up minutes ago, so serving them spends capacity on answers nobody reads. Newest first maximises the share of served requests that are still wanted.",
          },
          {
            prompt: "What does it mean for a system to be statically stable?",
            options: [
              "It keeps operating on existing data when the control plane is unavailable",
              "Its capacity is fixed in advance, so load never changes its behaviour",
              "Its configuration is immutable, so no change can be applied at runtime",
              "It fails into a read-only mode whenever a write dependency is degraded",
            ],
            correctIndex: 0,
            explain:
              "Static stability means the data plane keeps running on what it already holds while changes are impossible. Running EC2 instances surviving a control plane incident is the canonical example, and the same test applies to your own configuration and cache dependencies.",
          },
        ],
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
        why: "Reporting p99 instead of the mean is a small change that surfaces problems users complain about but dashboards do not show. It also makes capacity conversations honest.",
        check: {
          prompt: "Average latency is 100ms and users complain of slowness. Most likely explanation?",
          options: [
            "The mean includes fast health check requests, which drag the number down",
            "A long tail, p99 may be seconds while the mean stays comfortably low",
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
        why: "Chasing 100 percent is the wrong target: each extra nine costs disproportionately more, and perfect reliability means you shipped too slowly. The budget makes the trade explicit instead of political.",
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
