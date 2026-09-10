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
        sources: [
          {
            label: "Nishtala et al., Scaling Memcache at Facebook (NSDI 2013)",
            url: "https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf",
            supports: "That the deployment is cache-aside, and that the published account is mostly about failure modes rather than about the hit path.",
          },
        ],
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
        sources: [
          {
            label: "Nishtala et al., Scaling Memcache at Facebook (NSDI 2013)",
            url: "https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf",
            supports: "The stale set failure and the lease token issued at read time that lets the cache reject a late write.",
          },
        ],
        title: "Invalidation: TTL, explicit, and versioned keys",
        level: "intermediate",
        body: [
          "TTL expiry is the simplest thing that works: entries die after a set time, and you accept staleness up to that time in exchange for writing no invalidation logic at all. The reason it survives contact with production is that it is self-healing. Any bug, any missed path, any inconsistency corrects itself within one TTL, which is a property none of the cleverer schemes have.",
          "Explicit invalidation deletes the key when the underlying data changes. It is fresher and it is fragile, because every write path must know every key derived from that data. Add a new page that composes the same record into a different key, forget the delete, and you have a permanently stale entry that no amount of waiting will fix, discovered eventually by a customer who says the price is wrong.",
          "Versioned keys sidestep deletion entirely. Put a version or an updated-at timestamp in the key, bump it on write, and old entries become unreachable rather than wrong. Invalidation becomes one write to one value instead of a fan-out of deletes, and the stale entries age out on their own. This is usually the best of the three, and the cost is that the old entries occupy memory until they expire, which is a memory problem rather than a correctness one.",
          "Whichever you choose, jitter the TTLs. Entries created together with identical lifetimes expire together, and a cache populated at deploy time will empty itself in one synchronised moment some hours later, which arrives as an unexplained database spike at an odd hour. A random spread of ten to twenty per cent is enough to turn the cliff into a slope.",
          "Distributed invalidation is where this gets genuinely hard, because deletes have to reach every node in every region, and a delete that is lost in transit leaves one region serving stale data indefinitely with nothing to detect it. The pragmatic answer most large systems reach is to stop trying: short TTLs plus versioned keys, so correctness never depends on a message arriving. There is one more failure worth naming: the stale set. A client reads a value, is slow, and writes what it read into the cache after a concurrent update has already invalidated it, so the cache now holds an old value with a fresh lifetime. Facebook's leases exist partly for this, since a lease token issued at read time can be invalidated by an intervening write, letting the cache reject the late set.",
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
        sources: [
          {
            label: "Redis: cluster specification",
            url: "https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/",
            supports: "The 16,384 hash slots, and that a multi-key operation requires its keys in one slot, which is what hash tags exist to force.",
          },
          {
            label: "Redis: key eviction",
            url: "https://redis.io/docs/latest/develop/reference/eviction/",
            supports: "That the default policy is noeviction, which returns errors on writes at maxmemory rather than making room, and that LRU and LFU are both sampled approximations.",
          },
        ],
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
        sources: [
          {
            label: "Nishtala et al., Scaling Memcache at Facebook (NSDI 2013)",
            url: "https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf",
            supports: "The lease mechanism described here, which addresses both the stampede and the stale set with one token, alongside the regional pools and the gutter tier.",
          },
        ],
        title: "Stampedes, avalanches and hot keys",
        level: "advanced",
        body: [
          "A stampede happens when a popular key expires and every concurrent request misses at once, so all of them hit the database together to compute the same value. The load is proportional to concurrency rather than to traffic, which is why it appears suddenly at a scale that was fine yesterday. The standard fix is a short lock: one request wins the right to recompute while the others wait briefly or serve the stale value they can still see. Facebook's version is a lease. On a miss the cache hands one client a token granting permission to recompute, and tells everyone else to wait or use stale data. It is the same shape as a lock, expressed as something the cache issues, which also lets the cache reject a set whose lease was invalidated by an intervening write. Probabilistic early expiry is the other approach: as an entry approaches its TTL, each reader has a small and rising chance of refreshing it early, so the recomputation happens before the expiry rather than at it, spread across readers.",
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
        sources: [
          {
            label: "RFC 5861: HTTP Cache-Control extensions for stale content",
            url: "https://www.rfc-editor.org/rfc/rfc5861.html",
            supports: "The stale-while-revalidate and stale-if-error directives described here.",
          },
          {
            label: "GitHub REST API, conditional requests and rate limits",
            url: "https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api",
            supports: "That a conditional request returning 304 Not Modified does not count against the primary rate limit, which is a limit designed to reward correct caching.",
          },
        ],
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
        sources: [
          {
            label: "AWS IAM, changes that I make are not always immediately visible",
            url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_general.html#troubleshoot_general_eventual-consistency",
            supports: "That IAM is eventually consistent by design and documents the propagation delay, which is the honest form of caching a permission decision.",
          },
        ],
        title: "What not to cache",
        level: "advanced",
        body: [
          "Caching adds a second source of truth and a new class of bug, and it earns that when three things are true: reads dominate writes, the data tolerates some staleness, and recomputing it is genuinely expensive. Miss any one of them and you have added complexity for nothing, or worse, for a correctness problem that shows up as a customer complaint rather than as an alert.",
          "Data that changes on nearly every read gains nothing. You pay the write cost, then miss anyway, and the cache becomes a tax on the read path plus an extra system to operate. Per-user data with no reuse is usually the same story: a cache entry read once before it expires has cost more than it saved, and a million of them evict the entries that were actually working.",
          "Anything where stale means wrong deserves a different answer entirely. A permission set cached for five minutes means access revoked five minutes ago still works, and that is a security failure rather than a latency tradeoff. If you must cache it, cache it for seconds, with an explicit revocation path, and write the staleness into the contract so it is a known property rather than an accident.",
          "The arithmetic of hit ratios is worth internalising, because it is not linear and people reason about it as if it were. At a 1ms hit and a 50ms miss, a 95% hit ratio gives an average of about 3.5ms, and 99% gives about 1.5ms. That looks like a modest difference until you look at the origin instead of the average: going from 99% to 98% doubles the load reaching your database, and from 99% to 95% multiplies it by five. Cache work should be judged by what it does to the miss rate, not by what it does to the mean.",
          "It follows that a cache is not a fix for a slow query, it is a way to run a slow query less often. The queries still run, on every miss, on every eviction, and on every cold start, which is exactly the moment you are least able to absorb them: a restart after an incident empties the cache and sends the full read load at a database that has just recovered. If the origin cannot survive its own traffic without the cache, the cache has become a load-bearing part of the system, and it should be designed as one rather than described as an optimisation. The honest question, then, is not what to cache but what staleness is acceptable for, and for how long. Answer it per dataset, write the answer down next to the TTL, and the caching design follows. If the answer is none, the fix is a faster query, a better index, or a different shape of data, and no amount of caching will substitute for it.",
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
        sources: [
          {
            label: "Envoy, supported load balancers",
            url: "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers",
            supports: "That Envoy's default policy is round robin, and that two random choices is the algorithm used by its least-request policy, where the number of hosts sampled defaults to two.",
          },
          {
            label: "Mitzenmacher, The power of two choices in randomized load balancing",
            url: "https://www.eecs.harvard.edu/~michaelm/postscripts/mythesis.pdf",
            supports: "The result that sampling two servers at random and choosing the less loaded gets close to the best possible balance without any global state.",
          },
        ],
        title: "Round robin, least connections, hashing",
        level: "beginner",
        body: [
          "Round robin sends each request to the next server in turn. It is the default nearly everywhere and it is correct when requests cost roughly the same, because then counting requests is a good proxy for counting work. It stops being correct the moment one endpoint takes thirty seconds and another takes five milliseconds, since the balancer keeps feeding a server that is already saturated.",
          "Least connections routes to whichever server currently has the fewest requests in flight, which is a much better proxy for load when durations vary. Least response time goes further and weights by observed latency, so a server that is degraded but still accepting connections gets less traffic rather than the same amount.",
          "Consistent hashing sends the same key to the same server, which is what you want when servers hold local state, a cache, or a session. It is also the option that makes your traffic distribution depend on your key distribution, so a single hot key becomes a single hot server and no amount of capacity elsewhere helps.",
          "Two more worth knowing. Weighted round robin lets a fleet of mixed instance sizes share work in proportion to capacity, which matters during a migration between instance types. Power of two random choices is the elegant one: pick two servers at random and send the request to the less busy of the two. It needs no global state, and it gets remarkably close to least connections, which is why it is common in large distributed proxies where maintaining an exact count everywhere is impractical.",
          "Layer 4 and layer 7 is the other axis. A layer 4 balancer forwards packets by address and port and knows nothing about requests, so it is fast and it balances connections. A layer 7 balancer terminates the connection, reads the request, and can balance per request, route by path, retry a failure and add headers. With long-lived connections such as gRPC or HTTP/2, layer 4 balancing pins every request from a client to one backend, which is the trap that makes adding capacity do nothing at all.",
          "The choice, then, follows from the traffic rather than from a preference. Uniform and stateless: round robin. Wildly variable durations: least connections or two random choices. Anything cached or held per server: hashing, with the hot key risk accepted deliberately. Long-lived connections: layer 7, or client-side balancing that knows the backend set.",
        ],
        why: "Round robin is the default and is wrong whenever request cost varies wildly, one slow endpoint drags a server down while the balancer keeps feeding it work.",
        inPractice:
          "Two random choices is what large proxies reach for when exact counts are impractical, and it is worth being precise about who does what. Envoy's default policy is round robin; two random choices is the algorithm behind its least-request policy, where the number of hosts sampled defaults to two. Linkerd's proxy goes further and makes it the default, combining it with an exponentially weighted moving average of observed latency so the less busy of the two is also the historically faster one.",
        check: {
          prompt: "Requests range from 5ms to 30s. Which algorithm distributes load best?",
          options: ["Round robin", "Least connections", "Random", "IP hash"],
          correctIndex: 1,
          explain: "Round robin counts requests, not work in flight. Least connections notices a server tied up with long requests and routes around it.",
        },
        checks: [
          {
            prompt: "Why does power of two random choices work nearly as well as least connections?",
            options: [
              "Random selection converges on an even distribution as traffic grows",
              "Comparing two candidates avoids the herd that one global answer creates",
              "It samples the whole fleet cheaply, so its view of load is more current",
              "It weights servers by their capacity, which least connections does not",
            ],
            correctIndex: 1,
            explain:
              "Always choosing the globally least busy server sends every concurrent decision to the same node. Comparing two at random keeps most of the benefit, needs no shared state, and avoids the stampede.",
          },
          {
            prompt: "A gRPC service gets no faster when replicas are added behind a layer 4 balancer. Why?",
            options: [
              "Connections are balanced, and each carries many requests to one backend",
              "Layer 4 cannot read HTTP/2 frames, so it drops multiplexed streams",
              "Protobuf payloads bypass the balancer's connection accounting entirely",
              "New replicas are not registered until their health check has passed twice",
            ],
            correctIndex: 0,
            explain:
              "A long-lived connection is assigned once and then carries everything. Request-level balancing at layer 7, or client-side balancing with a resolver, is what actually spreads the load.",
          },
          {
            prompt: "What does consistent hashing cost you compared with least connections?",
            options: [
              "The ability to weight servers differently by their capacity",
              "Traffic distribution now depends on how evenly the keys are spread",
              "The balancer must terminate TLS to read the key from the request",
              "Requests can no longer be retried against a different server",
            ],
            correctIndex: 1,
            explain:
              "Routing by key means a hot key is a hot server, and spare capacity elsewhere cannot absorb it. That is the price of sending the same key to the same place, which is exactly why you chose it.",
          },
        ],
        diagram: {
          caption: "Counting requests is not counting work",
          columns: [
            [{ id: "in", label: "Requests", sub: "5ms and 30s mixed", kind: "client" }],
            [
              { id: "rr", label: "Round robin", sub: "next in turn", kind: "edge", alternative: true },
              { id: "lc", label: "Least connections", sub: "fewest in flight", kind: "edge" },
            ],
            [
              { id: "busy", label: "Server A", sub: "three long requests", kind: "service" },
              { id: "idle", label: "Server B", sub: "idle", kind: "service" },
            ],
          ],
          edges: [
            { from: "in", to: "rr", label: "one policy" },
            { from: "in", to: "lc", label: "the other" },
            { from: "rr", to: "busy", label: "keeps feeding it" },
            { from: "lc", to: "idle", label: "routes around" },
          ],
        },
      },
      {
        id: "consistent-hashing",
        diagram: {
          caption: "Adding a node moves one node's worth of keys, not nearly all of them",
          columns: [
            [{ id: "keys", label: "Keys", sub: "hashed onto a ring", kind: "client" }],
            [{ id: "mod", label: "hash mod N", sub: "N changes, everything moves", kind: "service", alternative: true },
             { id: "ring", label: "Ring, clockwise", sub: "with ~100 virtual nodes each", kind: "service" }],
            [{ id: "empty", label: "Cache empties", sub: "4 keys in 5 relocate", kind: "data", alternative: true },
             { id: "slice", label: "One slice moves", sub: "roughly 1/N of keys", kind: "data" }],
            [{ id: "hot", label: "A single hot key", sub: "still lands on one node", kind: "external" }],
          ],
          edges: [
            { from: "keys", to: "mod", label: "add a fifth node" },
            { from: "mod", to: "empty", label: "cold reads at origin" },
            { from: "keys", to: "ring", label: "add a fifth node" },
            { from: "ring", to: "slice", label: "the rest undisturbed" },
            { from: "slice", to: "hot", label: "different problem", async: true },
          ],
        },
        sources: [
          {
            label: "Karger et al., Consistent hashing and random trees (STOC 1997)",
            url: "https://dl.acm.org/doi/10.1145/258533.258660",
            supports: "The original construction, and the property that a membership change relocates only a 1/N share of keys.",
          },
          {
            label: "Google Research, Consistent hashing with bounded loads",
            url: "https://research.google/blog/consistent-hashing-with-bounded-loads/",
            supports: "The bounded-load refinement, where a node at its capacity share passes a key onward rather than accepting it.",
          },
        ],
        title: "Consistent hashing",
        level: "advanced",
        body: [
          "Hashing a key modulo the number of servers works perfectly until that number changes. With four servers and a fifth added, the modulus changes for every key, so roughly four keys in five map somewhere new. Every cache empties simultaneously, every request misses, and the database receives the entire working set as cold reads at the exact moment you were adding capacity because you were already under load.",
          "Consistent hashing places both servers and keys on a ring of hash values, and a key belongs to the first server clockwise from it. Add a node and only the keys between it and its predecessor move, which is roughly one over n of the total rather than nearly all of it. Remove a node and its keys go to its successor, and nothing else is disturbed.",
          "Plain rings are lumpy, because a handful of random positions rarely divide a circle evenly, and one server can end up owning a third of the space. Virtual nodes fix it: each physical server takes many positions on the ring, typically a hundred or more, so the law of large numbers does the balancing. It also gives you weighting for free, since a larger machine can simply be given more positions.",
          "Two refinements are worth recognising. Bounded loads add a capacity limit per node, so a node that is already at its share passes the key onward rather than accepting it, which stops a hot region overwhelming one server. Rendezvous hashing reaches the same goal by a different route: hash the key with each server's name and pick the highest score, which needs no ring and handles weighting cleanly.",
          "The property to hold on to is that this is a technique for making membership changes cheap, not for making distribution perfect. A single very hot key still lands on a single server whatever the scheme, and the answer to that is replication of that key or a small cache in front, which is a different problem with a different fix.",
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
        checks: [
          {
            prompt: "What problem do virtual nodes solve in a consistent hashing ring?",
            options: [
              "A few random positions divide the ring unevenly, so shares are lumpy",
              "Keys cluster around popular hash prefixes, biasing one region",
              "Nodes joining simultaneously can claim the same ring position",
              "The ring cannot be rebalanced without moving every key once",
            ],
            correctIndex: 0,
            explain:
              "With one position each, a handful of servers rarely split a circle evenly. Many positions per server let averages do the balancing, and they make weighting trivial: a bigger machine takes more positions.",
          },
          {
            prompt: "Adding a fifth server to a modulo-4 cache scheme causes a database spike. Why?",
            options: [
              "The new server starts cold and absorbs a fifth of all traffic at once",
              "The modulus changed, so about four keys in five now hash elsewhere",
              "Rebalancing copies existing entries between nodes over the network",
              "Clients keep the old mapping cached until their connections recycle",
            ],
            correctIndex: 1,
            explain:
              "The server count is part of the mapping, so changing it remaps nearly everything. Every request misses at once and the origin sees the whole working set as cold reads.",
          },
          {
            prompt: "Consistent hashing is in place and one key is overwhelming its node. What helps?",
            options: [
              "Adding virtual nodes, which spreads that key over more positions",
              "Switching to rendezvous hashing, which distributes hot keys evenly",
              "Replicating that key under several names, or caching it in-process",
              "Increasing the ring size, so the key occupies a smaller arc",
            ],
            correctIndex: 2,
            explain:
              "Every scheme that routes a key deterministically sends a hot key to one place. The fix is to stop it being one key, by replicating it or holding it in front, which is a different problem from membership changes.",
          },
        ],
      },
      {
        id: "health-checks",
        title: "Health checks and draining",
        level: "intermediate",
        body: [
          "A health check answers a question the load balancer is about to act on, so what it asks decides what happens during a failure. A shallow check confirms the process is alive and listening, which is cheap and catches a crashed or hung process. A deep check confirms the instance can reach the dependencies it needs to serve a request, which catches far more and is where the danger is.",
          "The danger is correlation, and it is a property of the design rather than bad luck. Every instance checks the same database, so when that database wobbles every instance fails its check in the same second, the balancer removes all of them, and a dependency that was merely slow becomes a total outage with no healthy targets left to receive traffic. The failure path amplified the failure, which is worse than having no failure path at all, because at least some requests would have succeeded.",
          "The compromise that works is a deep check that degrades rather than fails. Require several consecutive failures before reporting unhealthy, so a single slow response does not remove an instance. Give the check its own short timeout, well inside the interval, so a hanging dependency does not make the check itself hang. Never let a dependency the request path does not need mark you down, which sounds obvious and is routinely violated by a check that pings six services because six were available to ping. And where the balancer supports it, use the setting that stops removing instances once too few remain healthy, which converts the correlated failure into degraded service rather than none.",
          "Keep readiness and liveness separate, because they answer different questions and conflating them is how a slow dependency becomes a restart loop. Liveness asks whether to restart this process, so it should be shallow and almost never fail: a process that is running should say yes even while a dependency is down, because restarting it will not fix the database. Readiness asks whether to send it traffic, so it may legitimately say no while a cache warms or a migration finishes. Point liveness at a deep check and a database blip restarts the fleet, which loses the warm caches and the in-flight requests as well.",
          "Connection draining is the other half and it is what makes deploys invisible. When an instance is removed, in-flight requests need time to finish before the process exits, so the balancer stops sending new work, waits for a grace period longer than a normal request, and only then lets it go. Without it a rolling deploy drops live traffic on every step, which shows up as a small error spike at each deploy that everybody eventually stops noticing. The sequence that works is to fail readiness first, keep serving for a few seconds while the balancer notices, then stop accepting and finish what is open.",
        ],
        why: "Making the health check depend on the database means a brief database blip marks every server unhealthy simultaneously, turning a degraded system into a total outage. The check is part of the failure path, and a failure path that amplifies is worse than no failure path at all.",
        inPractice:
          "Kubernetes separates liveness, readiness and startup probes precisely because they answer different questions: restart me, do not send me traffic yet, and I am still booting. Conflating the first two is how a slow dependency turns into a restart loop that removes the fleet.",
        diagram: {
          caption: "A shared dependency makes health correlated across the fleet",
          columns: [
            [{ id: "lb", label: "Load balancer", sub: "polls each node", kind: "edge" }],
            [
              { id: "n1", label: "Node 1", kind: "service" },
              { id: "n2", label: "Node 2", kind: "service" },
              { id: "n3", label: "Node 3", kind: "service" },
            ],
            [
              { id: "shallow", label: "Shallow check", sub: "process is alive", kind: "data" },
              { id: "deep", label: "Deep check", sub: "queries the database", kind: "data", alternative: true },
            ],
            [{ id: "db", label: "Database", sub: "one brief blip", kind: "data" }],
          ],
          edges: [
            { from: "lb", to: "n1", label: "healthy?" },
            { from: "lb", to: "n2", label: "healthy?" },
            { from: "lb", to: "n3", label: "healthy?" },
            { from: "n1", to: "shallow", label: "answers locally" },
            { from: "n2", to: "deep", label: "answers for the database" },
            { from: "deep", to: "db", label: "all nodes fail together" },
          ],
        },
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
        checks: [
          {
            prompt: "What is the difference between a liveness and a readiness check?",
            options: [
              "Liveness runs at startup; readiness runs continuously afterwards",
              "Liveness means restart me; readiness means do not send me traffic yet",
              "Liveness is shallow by definition; readiness is always deep",
              "Liveness is checked by the balancer; readiness by the orchestrator",
            ],
            correctIndex: 1,
            explain:
              "They call for opposite responses. Failing readiness should remove a node from rotation until it recovers; failing liveness should kill it. Conflating them turns a slow dependency into a restart loop.",
          },
          {
            prompt: "Why require several consecutive failures before marking a node unhealthy?",
            options: [
              "A single failure is usually a transient blip rather than a broken node",
              "Load balancers cache health state, so one result is often stale",
              "It gives connection draining time to finish the in-flight requests",
              "Health endpoints are unauthenticated, so results can be spoofed once",
            ],
            correctIndex: 0,
            explain:
              "Removing a healthy node concentrates load on the rest, which makes the next check more likely to fail. Requiring a run of failures keeps one dropped packet from starting that cascade.",
          },
          {
            prompt: "What does connection draining prevent during a deploy?",
            options: [
              "New requests arriving at a node that has already begun shutting down",
              "In-flight requests being dropped when the node leaves the pool",
              "The balancer routing to a node before its startup probe has passed",
              "A node rejoining the pool before its caches have been repopulated",
            ],
            correctIndex: 1,
            explain:
              "Draining stops new work while letting existing requests finish, so a rolling deploy does not turn into a small burst of errors for whoever was mid-request.",
          },
        ],
      },
      {
        id: "global-routing",
        title: "Getting traffic to the right region",
        level: "advanced",
        body: [
          "Load balancing inside a region is a solved problem with well-understood algorithms. Getting a request to the right region in the first place is a different question with three common answers, and they differ in how quickly they can change their mind.",
          "DNS-based routing hands out different addresses by geography or by health, which is simple and works everywhere. Its weakness is the one every DNS topic returns to: the answer is cached by resolvers and clients for a duration you request and do not control, so failing over means waiting for other people's caches to expire.",
          "Anycast advertises the same address from many locations and lets the network choose, so a client reaches whichever site is closest in routing terms. Failover happens in the routing layer within seconds, no cache is involved, and the address never changes. This is how large CDNs and public DNS resolvers work, and it is why they can lose a location without anybody noticing.",
          "The third option is a global load balancer at the provider: one address, health-checked backends in several regions, traffic steered by latency or by policy. It is the least work and it puts the provider's control plane on the critical path, which is a dependency worth naming rather than assuming.",
          "Whichever routes the traffic, the harder problem sits underneath: data. Serving reads from a nearby region is straightforward; accepting writes in several is a consistency design, not a routing one. Most systems that describe themselves as multi-region are read-local and write-to-one, and being explicit about that is more honest than the label.",
        ],
        why:
          "The routing choice is really a choice about how fast you can change your mind. DNS is minutes to hours because caches decide; anycast and provider load balancers are seconds because the network or the control plane decides. Everything else about them is secondary to that.",
        inPractice:
          "Cloudflare and Google Public DNS both run anycast from hundreds of locations, which is why a site can be withdrawn for maintenance without a DNS change. The equivalent lesson in the other direction is any migration that planned around a 60 second TTL and was still receiving traffic on the old address hours later.",
        diagram: {
          caption: "Three ways to reach a region, and how fast each fails over",
          columns: [
            [{ id: "u", label: "User", kind: "client" }],
            [
              { id: "dns", label: "DNS routing", sub: "caches decide, minutes", kind: "edge", alternative: true },
              { id: "any", label: "Anycast", sub: "routing decides, seconds", kind: "edge" },
              { id: "glb", label: "Global balancer", sub: "control plane decides", kind: "edge" },
            ],
            [
              { id: "r1", label: "Region A", sub: "healthy", kind: "service" },
              { id: "r2", label: "Region B", sub: "degraded", kind: "service" },
            ],
            [{ id: "data", label: "The real problem", sub: "where writes go", kind: "data" }],
          ],
          edges: [
            { from: "u", to: "dns", label: "resolve" },
            { from: "u", to: "any", label: "one address" },
            { from: "u", to: "glb", label: "one address" },
            { from: "any", to: "r1", label: "withdrawn in seconds" },
            { from: "dns", to: "r2", label: "still cached" },
            { from: "r1", to: "data", label: "reads local, writes central" },
          ],
        },
        check: {
          prompt: "Why is anycast failover faster than DNS failover?",
          options: [
            "Routes are withdrawn in the network, with no cached answer to expire",
            "Anycast health checks run more frequently than DNS health checks do",
            "Clients reconnect immediately when an anycast address stops responding",
            "The address is shorter, so resolution completes in fewer round trips",
          ],
          correctIndex: 0,
          explain:
            "DNS failover waits for every resolver and client cache to expire, and those honour your TTL only approximately. Anycast changes which location advertises the route, and the address the client holds never changes.",
        },
        checks: [
          {
            prompt: "What does a provider's global load balancer add to the critical path?",
            options: [
              "The provider's control plane, which is now a dependency of routing",
              "An extra network hop, which adds latency to every single request",
              "A second DNS lookup, since the balancer resolves backends by name",
              "A shared address space, which limits how many regions can be used",
            ],
            correctIndex: 0,
            explain:
              "It is the least work and it moves a decision into somebody else's system. Worth naming explicitly, because a control plane incident there becomes a routing incident here.",
          },
          {
            prompt: "A system is described as multi-region. What is usually true underneath?",
            options: [
              "Reads are served locally and writes go to one region",
              "Every region accepts writes and conflicts are resolved automatically",
              "Each region holds a complete independent copy with no coordination",
              "Regions are active in turn, with traffic switched on a schedule",
            ],
            correctIndex: 0,
            explain:
              "Routing traffic to a nearby region is straightforward. Accepting writes in several is a consistency design with conflict resolution attached, and most systems that use the label have not done it.",
          },
          {
            prompt: "What actually determines how quickly a routing strategy can change its mind?",
            options: [
              "Who holds the decision: caches, the network, or a control plane",
              "How many locations are advertising the service at that moment",
              "Whether health checks are shallow or deep at each location",
              "The geographic distance between the failing and the healthy region",
            ],
            correctIndex: 0,
            explain:
              "That is the whole comparison. DNS puts the decision in caches you do not control, anycast puts it in the routing layer, and a global balancer puts it in the provider's control plane.",
          },
        ],
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
        diagram: {
          caption: "A queue decouples the arrival rate from the processing rate, and nothing more",
          columns: [
            [{ id: "spike", label: "Spike", sub: "4x average arrivals", kind: "client" }],
            [{ id: "sync", label: "Synchronous", sub: "a worker per arrival", kind: "service", alternative: true },
             { id: "q", label: "Queue", sub: "bounded, monitored by age", kind: "queue" }],
            [{ id: "fail", label: "Errors at the door", sub: "sized for average, not peak", kind: "data", alternative: true },
             { id: "workers", label: "Workers", sub: "steady rate, drains the backlog", kind: "service" }],
            [{ id: "owed", label: "What you now owe", sub: "a status, and a notification", kind: "external" },
             { id: "runaway", label: "Sustained overload", sub: "backlog grows without bound", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "spike", to: "sync", label: "needs a worker now" },
            { from: "sync", to: "fail", label: "falls over" },
            { from: "spike", to: "q", label: "accepted immediately" },
            { from: "q", to: "workers", label: "drains over minutes" },
            { from: "workers", to: "owed", label: "eventual consistency" },
            { from: "q", to: "runaway", label: "a queue adds no throughput", async: true },
          ],
        },
        title: "What a queue actually buys you",
        level: "beginner",
        body: [
          "A queue lets a request return before the work is done. The user gets a fast response, and the work happens behind them. That is the obvious benefit and the least interesting one; what a queue really buys is that the arrival rate and the processing rate stop having to match. Absorbing spikes is the clearest form of that. A synchronous system sized for average traffic falls over at four times average, because every arriving request needs a worker at the moment it arrives. The same system behind a queue turns that spike into a backlog that drains over the next few minutes, and nobody sees an error. You have traded latency for survival, deliberately, for work where latency is cheap.",
          "It also decouples failure. When the email provider is down, a synchronous handler fails the user's request; a queued one keeps accepting work and drains when the provider returns. The blast radius of a dependency shrinks to the queue depth, which is a number you can watch, rather than to your error rate, which is a number your users watch.",
          "The costs are real and they are all the same cost in different clothes: the system is now eventually consistent. You owe the user a way to see the outcome, which means a status somewhere and usually a notification. You owe yourself a way to see the backlog, which means monitoring the age of the oldest message rather than only its depth. And you owe the on-call an answer to what happens when the queue is 200,000 deep at 3am, which is a question worth answering before it is asked.",
          "The failure people underestimate is that a queue hides overload instead of removing it. If the sustained arrival rate exceeds what the workers can process, the backlog grows without bound and the queue is now a very expensive way of delaying an outage: the work is late by a growing margin and eventually irrelevant. A queue smooths bursts. It cannot create throughput, and treating a growing backlog as something that will sort itself out is how a two-hour incident becomes a two-day one.",
          "So the test for whether work belongs behind a queue is not whether it is slow. It is whether the caller needs the result to continue. Sending an email, generating a report, transcoding a video, syncing to a third party: none of those are things the user is watching. Charging a card while the customer looks at a spinner is, and putting it behind a queue means building a way to tell them what happened, which is more work than the queue saved.",
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
        checks: [
          {
            prompt: "Arrival rate exceeds processing rate for an hour. What does the queue do about it?",
            options: [
              "It sheds the excess automatically once the configured depth is reached",
              "It spreads the load evenly, so each worker sees the same arrival rate",
              "Nothing: the backlog grows, and the work is late by a growing margin",
              "It applies backpressure to producers, slowing them to the drain rate",
            ],
            correctIndex: 2,
            explain:
              "A queue smooths bursts and cannot create throughput. Sustained overload becomes an unbounded backlog, which is a delayed outage rather than an avoided one, unless something sheds load or adds workers.",
          },
          {
            prompt: "Which metric best tells you a queue is in trouble?",
            options: [
              "The age of the oldest unprocessed message in the queue",
              "The number of messages currently waiting to be processed",
              "The rate at which producers are publishing new messages",
              "The number of consumers currently connected to the broker",
            ],
            correctIndex: 0,
            explain:
              "Depth alone is ambiguous: 10,000 messages is fine at 5,000 a second and an outage at five a second. Age answers the question a user would ask, which is how long the work has been waiting.",
          },
          {
            prompt: "Which piece of work is the worst candidate for a queue?",
            options: [
              "Transcoding an uploaded video into several output formats",
              "Sending a receipt by email after an order is completed",
              "Charging a card while the customer waits on the checkout page",
              "Rebuilding a search index after a batch of records changes",
            ],
            correctIndex: 2,
            explain:
              "The caller needs that result to continue. Making it asynchronous means building a status channel and explaining a pending state to the user, which is more work than the queue saved.",
          },
        ],
      },
      {
        id: "delivery-guarantees",
        inPractice:
          "Kafka's exactly-once semantics are real and are worth knowing the boundary of: they cover reading from a topic, writing to a topic and committing the offset as one atomic unit inside Kafka, using an idempotent producer and transactions. The moment a handler calls a payment provider or writes to another database, the guarantee has left the building, which is why the durable answer is still at-least-once delivery plus an idempotent consumer.",
        sources: [
          {
            label: "Apache Kafka: transactions and exactly-once semantics",
            url: "https://kafka.apache.org/documentation/#semantics",
            supports: "That Kafka's exactly-once guarantee is scoped to a read, process and write cycle within Kafka rather than end to end across external systems.",
          },
        ],
        title: "At-most-once, at-least-once, exactly-once",
        level: "intermediate",
        body: [
          "At-most-once may drop messages. At-least-once may deliver twice. Exactly-once is what everyone wants, and end to end in a distributed system it is not achievable, because the acknowledgement itself can be lost and the sender cannot tell a lost ack from a lost message.",
          "What gets sold as exactly-once is at-least-once delivery plus idempotent processing, so a duplicate has no additional effect. Kafka's exactly-once semantics are real but scoped: they cover reading from a topic, writing to a topic, and committing the offset, as one atomic unit inside Kafka. The moment your handler calls Stripe, that guarantee has left the building.",
          "The rate is the part worth understanding, and it is not a single number anyone can quote across brokers. In steady state duplicates are rare enough that a system can run for weeks without one being noticed. They do not arrive uniformly: they cluster during a consumer group rebalance, a partition, a failover or a deploy that restarts a worker mid-batch, which is precisely when everything else is also going wrong and nobody has the attention to reason about them. So the number to design against is not the average rate but the burst, and the only design that survives a burst is a handler where a repeat costs nothing.",
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
        checks: [
          {
            prompt: "Why can no messaging system offer end-to-end exactly-once delivery?",
            options: [
              "Message ids can collide, so a duplicate cannot always be recognised",
              "A lost acknowledgement is indistinguishable from a lost message",
              "Clock skew means the receiver cannot order two attempts reliably",
              "Brokers cannot hold a message long enough to guarantee one delivery",
            ],
            correctIndex: 1,
            explain:
              "The sender times out and cannot tell whether the message never arrived or the acknowledgement did not come back. It must choose to resend or not, which is at-least-once or at-most-once, and there is no third option.",
          },
          {
            prompt: "Where should the idempotency check live in a consumer?",
            options: [
              "In the same transaction as the work, keyed by a unique constraint",
              "In a cache checked before the work, with a short expiry per message",
              "In the broker, which refuses to redeliver an acknowledged message",
              "In a nightly job that removes the duplicate rows after the fact",
            ],
            correctIndex: 0,
            explain:
              "Anything outside the transaction can succeed while the work fails, or the reverse. Inserting the id and doing the work atomically means a duplicate hits the constraint and rolls back having changed nothing.",
          },
          {
            prompt: "Why is an order id often a better idempotency key than the broker's message id?",
            options: [
              "Message ids are longer, so they cost more to index at high volume",
              "Message ids are not visible to the consumer in every broker",
              "A republished message gets a new id but is the same unit of work",
              "Order ids are sequential, which makes the unique index cheaper",
            ],
            correctIndex: 2,
            explain:
              "Anything that republishes, a redrive from a dead letter queue or a producer retry, mints a fresh message id for work you have already done. A natural key from the payload survives that.",
          },
        ],
      },
      {
        id: "ordering",
        sources: [
          {
            label: "Apache Kafka: design and guarantees",
            url: "https://kafka.apache.org/documentation/#design",
            supports: "That order is guaranteed within a partition and not across partitions, and that a partition is the unit of consumer parallelism, so the partition count caps the consumers in a group.",
          },
        ],
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
        checks: [
          {
            prompt: "Why is increasing a topic's partition count a one-way door in practice?",
            options: [
              "Existing messages must be rewritten into the new partition layout",
              "Consumers cannot rebalance while the partition count is changing",
              "Keys hash differently, so one entity's events split across old and new",
              "Retention is per partition, so older messages expire immediately",
            ],
            correctIndex: 2,
            explain:
              "The partition for a key is a function of the partition count. Change it and events for the same entity land in a different partition from their predecessors, so the per-entity ordering you added partitioning to protect is exactly what breaks.",
          },
          {
            prompt: "A topic has ten partitions and a consumer group of sixteen. What happens?",
            options: [
              "Six consumers sit idle, since a partition has at most one consumer",
              "Each partition is shared by two consumers, halving per-partition latency",
              "The broker rejects the group until the counts match exactly",
              "Messages are round-robined across all sixteen, losing per-key order",
            ],
            correctIndex: 0,
            explain:
              "A partition is the unit of parallelism and is assigned to one consumer in a group. Extra consumers are spare capacity for failover, not throughput, which is why the partition count is a capacity decision.",
          },
          {
            prompt: "When is global ordering across a whole topic genuinely the right choice?",
            options: [
              "When consumers are stateless and cannot buffer out-of-order events",
              "When the throughput of one partition and one consumer is enough",
              "When events for different entities can affect one another indirectly",
              "When the producer cannot compute a stable key for each message",
            ],
            correctIndex: 1,
            explain:
              "Global ordering means one partition and one consumer, so it is a throughput decision before it is a correctness one. For a ledger or an audit log that is often fine, and it should come with a measured number rather than an assumption.",
          },
        ],
      },
      {
        id: "dead-letter",
        sources: [
          {
            label: "Amazon SQS: dead-letter queues and redrive",
            url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html",
            supports: "The redrive policy described here: a maximum receive count after which a message moves automatically, and a redrive action to send messages back once the bug is fixed.",
          },
        ],
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
        checks: [
          {
            prompt: "A schema-invalid message is retried eight times over a day. What should happen instead?",
            options: [
              "Retry it with a longer ceiling, since the schema may be fixed later",
              "Send it to the dead letter queue immediately, with the error attached",
              "Acknowledge and drop it, since a broken message cannot be processed",
              "Hold it at the head of the queue until an operator inspects it",
            ],
            correctIndex: 1,
            explain:
              "Retrying a permanent failure only delays the moment someone finds out, while occupying a consumer slot. Transient failures deserve the ladder; permanent ones deserve a dead letter with the reason recorded.",
          },
          {
            prompt: "What makes a dead letter queue worth having rather than a slower delete?",
            options: [
              "The retry count it records, which shows how long the failure persisted",
              "The alert that fires when the first message arrives in it",
              "Someone reads it, and there is a path to replay after the fix",
              "The separate storage, which keeps the main queue's latency low",
            ],
            correctIndex: 2,
            explain:
              "Preserving failures is only useful if the failures are examined and can be put back. A dead letter queue nobody reads, with no redrive path, is a more expensive way of dropping messages.",
          },
          {
            prompt: "One poison message sits at the head of a partition. Why is that worse than a normal failure?",
            options: [
              "It blocks every message behind it in that partition until it is resolved",
              "It is redelivered to every consumer in the group simultaneously",
              "It cannot be acknowledged, so the consumer group rebalances repeatedly",
              "It causes the broker to stop accepting new messages for that topic",
            ],
            correctIndex: 0,
            explain:
              "In a log-based broker, order means the consumer cannot simply skip it, so the whole partition waits on one message. That is the case a bounded retry count and a dead letter path exist to end.",
          },
        ],
      },
      {
        id: "broker-choice",
        sources: [
          {
            label: "Amazon SQS: visibility timeout",
            url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html",
            supports: "That the default visibility timeout is 30 seconds and the maximum is 12 hours, and that a handler overrunning it without extending will see the message delivered again.",
          },
          {
            label: "Redis: Streams",
            url: "https://redis.io/docs/latest/develop/data-types/streams/",
            supports: "That consumer groups, acknowledgements and a pending entries list give real queue semantics, with durability bounded by the append-only file's fsync policy.",
          },
        ],
        title: "Choosing a broker",
        level: "advanced",
        body: [
          "The first distinction is between a queue and a log, and most confusion about brokers comes from missing it. A queue holds work: a message is delivered, acknowledged, and removed, and the queue is empty when the work is done. A log holds a record: messages are appended and kept for a retention period, consumers track their own position, and reading does not consume anything. SQS and RabbitMQ are queues; Kafka is a log.",
          "That difference decides more than it looks. In a log, a new consumer can start from the beginning and rebuild its state, several independent consumers can read the same stream at their own pace, and replaying a bad day is a matter of resetting an offset. In a queue, a message read by one consumer is gone, which is exactly what you want for a unit of work and useless for anything wanting a second opinion on the same events.",
          "SQS is the low-operations option: no cluster to run, effectively unlimited depth, at-least-once with best-effort ordering. Its mechanism worth knowing is the visibility timeout, which hides a message from other consumers while one works on it, defaulting to 30 seconds and extendable to twelve hours. A handler that takes longer than the timeout without extending it will find the same message being processed by somebody else, which is the most common way people discover their consumer is not idempotent. FIFO queues add ordering and deduplication with a throughput ceiling that standard queues do not have.",
          "Kafka is the option that buys retention and fan-out, and charges in operational complexity. Ordering is per partition, consumers commit offsets, and the retention window is a design parameter rather than an implementation detail: it decides how far back you can replay and how long a consumer can be down before it loses data. RabbitMQ sits between them, with routing rules rich enough to express most topologies and per-message acknowledgement, and it is the right answer more often than its unfashionability suggests.",
          "Redis Streams deserve a mention because they are already installed. Consumer groups, acknowledgements and a pending entries list give real queue semantics, at a fraction of the operational cost, with the caveat that durability is Redis durability: an append-only file with a one-second fsync loses up to a second of messages on a hard failure. For work that can be recomputed, that is fine and the simplicity is worth a great deal.",
          "The decision, then, is three questions rather than a comparison table. Does anything need to read these events more than once, or later, which means a log. Does the work need ordering, and within what, which sets the partitioning. And who operates it at 3am, which is the question that most often decides between running a cluster and paying someone else to.",
        ],
        why:
          "Almost every broker argument is actually an argument about queue semantics versus log semantics, and it resolves the moment someone asks whether the events need to be readable twice. The operational question is the other half: a managed queue with fewer features is usually a better system than a self-hosted log nobody has time to run.",
        inPractice:
          "SQS defaults to a 30 second visibility timeout, extendable to twelve hours, and a handler that overruns it without extending will see the message processed twice. Kafka's retention window is the parameter that decides how long a consumer can be down or how far back you can replay, which is why it is a design decision rather than a default to leave alone.",
        diagram: {
          caption: "A queue empties as work completes; a log keeps what happened",
          columns: [
            [{ id: "prod", label: "Producer", kind: "service" }],
            [
              { id: "q", label: "Queue", sub: "SQS, RabbitMQ", kind: "queue" },
              { id: "log", label: "Log", sub: "Kafka, retention", kind: "queue" },
            ],
            [
              { id: "w1", label: "Worker", sub: "acks, message gone", kind: "service" },
              { id: "c1", label: "Consumer A", sub: "own offset", kind: "service" },
              { id: "c2", label: "Consumer B", sub: "own offset, replayable", kind: "service" },
            ],
          ],
          edges: [
            { from: "prod", to: "q", label: "one unit of work" },
            { from: "prod", to: "log", label: "one event" },
            { from: "q", to: "w1", label: "delivered once, then removed" },
            { from: "log", to: "c1", label: "read, not consumed" },
            { from: "log", to: "c2", label: "reads the same events" },
          ],
        },
        check: {
          prompt: "Two independent services need to react to the same events, and a third will be added later. Queue or log?",
          options: [
            "A queue, with the producer publishing one message per consumer",
            "A log, since consumers read at their own pace and can start from the past",
            "A queue with a fan-out exchange, which delivers a copy to each consumer",
            "A log, but only if the consumers can tolerate messages arriving twice",
          ],
          correctIndex: 1,
          explain:
            "A log keeps the events, so a consumer added next year can read history rather than needing the producer changed. Fan-out on a queue works for known consumers today and requires a change every time the list grows.",
        },
        checks: [
          {
            prompt: "An SQS handler takes 45 seconds and the visibility timeout is the default. What happens?",
            options: [
              "The message is deleted when the handler eventually acknowledges it",
              "The message becomes visible again and a second consumer processes it",
              "The broker extends the timeout automatically while the handler runs",
              "The handler is cancelled at 30 seconds and the message is retried",
            ],
            correctIndex: 1,
            explain:
              "The visibility timeout hides the message rather than locking it. Overrun it and the same work runs twice concurrently, which is how most teams discover their consumer was never idempotent.",
          },
          {
            prompt: "What does a log's retention window actually determine?",
            options: [
              "How long a consumer can be down, and how far back a replay can go",
              "How much disk each broker needs, and nothing about the consumers",
              "How long the broker waits before compacting duplicate keys away",
              "How long an unacknowledged message stays hidden from other readers",
            ],
            correctIndex: 0,
            explain:
              "Retention is the recovery budget. A consumer offline for longer than the window has lost data with no way to catch up, which makes the number an availability decision rather than a storage one.",
          },
          {
            prompt: "Why might Redis Streams be the right broker despite weaker durability?",
            options: [
              "They provide exactly-once processing without idempotent consumers",
              "They preserve global ordering across all consumers in a group",
              "It is already running, and the work can be recomputed if lost",
              "They retain messages indefinitely at no additional memory cost",
            ],
            correctIndex: 2,
            explain:
              "For work that can be regenerated, losing up to a second of messages on a hard failure costs little, and not operating another cluster is worth a great deal. The judgement is about what the messages are, not about which broker is best.",
          },
        ],
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
        sources: [
          {
            label: "GitHub, October 21 post-incident analysis (2018)",
            url: "https://github.blog/news-insights/company-news/oct21-post-incident-analysis/",
            supports: "The incident described here: a network partition left replicas behind the primary, and the decision to serve stale data rather than fail.",
          },
        ],
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
        checks: [
          {
            prompt: "Why do read replicas do nothing for a write-heavy workload?",
            options: [
              "Every replica must apply every write, so write capacity is unchanged",
              "Replicas refuse writes, so the application has to buffer them locally",
              "Write latency rises with each replica added to the replication set",
              "Replication is synchronous by default, so writes wait for every replica",
            ],
            correctIndex: 0,
            explain:
              "A replica is a copy: it performs the same writes as the primary and adds read capacity only. If writes are the constraint, replicas move the ceiling not at all, which is when sharding starts being the honest answer.",
          },
          {
            prompt: "When is replication lag usually at its worst?",
            options: [
              "During low traffic, when the replica applies queued maintenance work",
              "Immediately after a replica restarts and rebuilds its connection pool",
              "Under peak load and bulk writes, exactly when reads are heaviest",
              "During schema migrations, which pause replication until they complete",
            ],
            correctIndex: 2,
            explain:
              "Lag grows when the primary produces changes faster than a replica can apply them, which is peak traffic and bulk updates. The stale reads therefore arrive when the most users are looking, not when the system is quiet.",
          },
          {
            prompt: "Why pin only the writing user's reads to the primary rather than all reads?",
            options: [
              "Only that user can tell the difference, and only for a few seconds",
              "The primary cannot serve reads for more than one session at a time",
              "Other users' reads are served from cache, so they never reach a replica",
              "Pinning everyone would break replication by adding read load to the primary",
            ],
            correctIndex: 0,
            explain:
              "Nobody notices someone else's write arriving late; everybody notices their own going missing. Pinning the writer costs a fraction of the traffic, and pinning everyone throws away the reason the replicas exist.",
          },
        ],
      },
      {
        id: "sharding",
        sources: [
          {
            label: "Notion, Herding elephants: lessons learned from sharding Postgres at Notion (2021)",
            url: "https://www.notion.com/blog/sharding-postgres-at-notion",
            supports: "That the shard key was chosen as the workspace because almost every query in the product is scoped to one, and that the migration was measured in months.",
          },
        ],
        title: "Sharding and choosing a key",
        level: "advanced",
        body: [
          "Sharding splits data across independent databases so that writes scale, which is the one thing replicas cannot do. The shard key decides which shard holds a row, and it is the hardest decision in the system to reverse, because it is embedded in every query, every foreign key that no longer works, and every piece of application code that assumed a join was possible.",
          "A poor key creates hotspots, and the two classic mistakes are geography and time. Sharding by country puts most of the traffic on whichever country you are largest in. Sharding by timestamp puts every current write on the newest shard while the others sit idle holding history, which is the worst possible arrangement: all the storage cost of many machines and the write capacity of one.",
          "Hashing an identifier distributes evenly regardless of skew, and gives up range queries in exchange. Range partitioning keeps ordered scans cheap and invites hotspots. Directory-based sharding, a lookup table saying which shard holds which entity, keeps the flexibility to move one noisy tenant on its own and costs a lookup on every query plus a component that must never be unavailable. Each is a real answer for a different read pattern.",
          "The key has to match how the data is read, not how it is naturally grouped. A query that can be answered from one shard is a normal query; one that spans shards becomes a scatter-gather, where the slowest shard sets the latency and the application does the joining and sorting that the database used to do. Notion sharded Postgres by workspace precisely because almost every query in that product is scoped to one workspace, which turns nearly all reads into single-shard reads.",
          "Then there is everything you lose that nobody mentions in the design review. Cross-shard transactions are gone unless you build two-phase commit or sagas. Unique constraints across shards are gone, so identifiers have to be globally unique by construction. Auto-increment ids stop working, which is why Snowflake-style ids exist. Aggregate queries over the whole dataset need a separate analytics path. Each of these is solvable and each is work that did not exist the week before. Resharding later means moving live data while still serving traffic from it: double writes, backfill, verification, cutover, and a rollback plan for each. It is measured in months for a real system, which is why the honest order is a bigger machine, better indexes, caching and read replicas first. All four are reversible in an afternoon. Sharding is a change to the data model that you will live inside for years.",
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
        checks: [
          {
            prompt: "What does sharding by created_at do to a write-heavy table?",
            options: [
              "It balances writes, since rows arrive at a steady rate over time",
              "It concentrates every current write on the newest shard while others idle",
              "It makes range scans expensive, because rows are spread by timestamp",
              "It prevents resharding, since timestamps cannot be rehashed later",
            ],
            correctIndex: 1,
            explain:
              "All new rows share the newest range, so one shard takes the entire write load while the rest hold cold history. You pay for many machines and get the write capacity of one.",
          },
          {
            prompt: "Which capability is lost the moment a table is sharded, unless it is rebuilt by hand?",
            options: [
              "Secondary indexes on any column other than the shard key",
              "The ability to run the same query against more than one row",
              "Transactions and unique constraints that span more than one shard",
              "Point lookups by primary key, which now require a routing table",
            ],
            correctIndex: 2,
            explain:
              "Each shard is an independent database, so atomicity and uniqueness stop at its boundary. Getting them back means two-phase commit or sagas, and globally unique identifiers generated outside the database.",
          },
          {
            prompt: "Why is directory-based sharding chosen despite the extra lookup?",
            options: [
              "It allows one noisy tenant to be moved without rehashing everything",
              "It removes the need for the shard key to appear in every query",
              "It keeps range scans cheap while distributing writes evenly",
              "It lets shards be added without any data movement at all",
            ],
            correctIndex: 0,
            explain:
              "A lookup table means placement is data rather than arithmetic, so a single heavy tenant can be relocated on its own. The price is a component on the path of every query that must never be down.",
          },
        ],
        diagram: {
          caption: "Two keys, two very different write distributions",
          columns: [
            [{ id: "w", label: "Writes", sub: "arriving now", kind: "service" }],
            [
              { id: "hash", label: "Hash of tenant id", sub: "even spread", kind: "edge" },
              { id: "time", label: "Range by created_at", sub: "one hot shard", kind: "edge", alternative: true },
            ],
            [
              { id: "s1", label: "Shard 1", sub: "even share", kind: "data" },
              { id: "s2", label: "Shard 2", sub: "even share", kind: "data" },
              { id: "s3", label: "Shard 3", sub: "all of it, or none", kind: "data" },
            ],
          ],
          edges: [
            { from: "w", to: "hash", label: "chosen key" },
            { from: "w", to: "time", label: "the tempting key" },
            { from: "hash", to: "s1", label: "a third" },
            { from: "hash", to: "s2", label: "a third" },
            { from: "time", to: "s3", label: "everything current" },
          ],
        },
      },
      {
        id: "cap",
        diagram: {
          caption: "A partition forces one answer, and the else branch is every other request",
          columns: [
            [{ id: "part", label: "Network partition", sub: "or a GC pause that looks like one", kind: "external" }],
            [{ id: "refuse", label: "Refuse the write", sub: "consistent, unavailable", kind: "service" },
             { id: "accept", label: "Accept the write", sub: "available, may diverge", kind: "service" }],
            [{ id: "merge", label: "The merge rule", sub: "the interesting engineering", kind: "data" }],
            [{ id: "els", label: "No partition", sub: "latency against consistency", kind: "data" }],
          ],
          edges: [
            { from: "part", to: "refuse", label: "ledger" },
            { from: "part", to: "accept", label: "cash machine" },
            { from: "accept", to: "merge", label: "reconcile afterwards" },
            { from: "refuse", to: "els", label: "and the rest of the year" },
            { from: "accept", to: "els", label: "and the rest of the year" },
          ],
        },
        sources: [
          {
            label: "Brewer, CAP twelve years later: how the rules have changed (IEEE, 2012)",
            url: "https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/",
            supports: "That the choice is not a one-off classification, the cash machine illustration, and that consistency in CAP means linearizability rather than the C in ACID.",
          },
          {
            label: "Amazon DynamoDB: read consistency",
            url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html",
            supports: "That the trade is exposed per read as a parameter, eventually consistent by default and strongly consistent on request at twice the capacity cost.",
          },
        ],
        title: "CAP, stated usefully",
        level: "intermediate",
        body: [
          "When a network partition splits your system, you either refuse requests in order to stay consistent, or answer them and risk divergence. That is the whole choice, and everything else written about CAP is commentary on those two sentences.",
          "Partitions are not optional. Cables are cut, switches fail, a routing change isolates a rack, and a garbage collection pause long enough to miss every heartbeat looks exactly like a partition from outside. So sacrificing partition tolerance is not on the menu, and a system described as CA is a system whose behaviour during a partition has not been decided.",
          "The choice is rarely uniform within one company, and this is where the theory becomes useful rather than academic. A core ledger chooses consistency and refuses the write. The cash machine in the lobby chooses availability, dispenses the money anyway, and reconciles afterwards with an overdraft fee, which is Brewer's own illustration and a reminder that the resolution rule can be a commercial decision rather than a technical one.",
          "The extension worth knowing is PACELC: if there is a partition, choose availability or consistency, else, in normal operation, choose latency or consistency. That second half describes the trade you make every day, unlike the first half which describes a bad afternoon once a year. Every synchronous replication decision, every quorum size, every strongly consistent read is the else branch being answered.",
          "Consistency in CAP is also narrower than the word suggests: it means linearizability, one register behaving as though there is a single copy. It is not the C in ACID, which is about invariants holding within a transaction. Conflating the two is the most common way a CAP discussion goes wrong, and noticing the difference is a reliable signal that someone has read past the triangle diagram.",
          "So the answer that carries weight is never a letter. It is: during a partition this system refuses writes to these entities and accepts them for those, conflicts on the second group resolve by this rule, and here is what a user sees while it happens. Anything shorter has left the interesting part out.",
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
        checks: [
          {
            prompt: "What does the else half of PACELC describe?",
            options: [
              "The behaviour of a system that has no partition tolerance at all",
              "The latency and consistency trade made during normal operation",
              "The fallback applied once a partition has finished healing",
              "The consistency level chosen for reads rather than for writes",
            ],
            correctIndex: 1,
            explain:
              "Partitions are rare; the daily decision is whether to wait for other replicas before answering. PACELC names that trade explicitly, which is why it describes real systems better than CAP alone.",
          },
          {
            prompt: "Consistency in CAP means something narrower than the word usually implies. What?",
            options: [
              "Linearizability: the system behaves as though there is one copy",
              "That invariants declared in the schema hold after every transaction",
              "That all replicas hold identical bytes at every instant in time",
              "That reads always return the value written by the same client",
            ],
            correctIndex: 0,
            explain:
              "It is the C of a single register behaving atomically, not the C of ACID, which is about invariants inside a transaction. Conflating the two derails most CAP conversations.",
          },
          {
            prompt: "Why is describing a system as CA a warning sign?",
            options: [
              "Partitions happen regardless, so its behaviour during one is undefined",
              "It means the system has no replicas, so it cannot be highly available",
              "CA systems cannot be deployed across more than one availability zone",
              "It implies synchronous replication, which is too slow to be practical",
            ],
            correctIndex: 0,
            explain:
              "You do not get to opt out of partitions; you only get to decide what happens during one. A CA label usually means nobody has made that decision, and the answer will be improvised during the incident.",
          },
        ],
      },
      {
        id: "eventual-consistency",
        sources: [
          {
            label: "DeCandia et al., Dynamo: Amazon's highly available key-value store (SOSP 2007)",
            url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
            supports: "That conflicting shopping basket versions are merged by taking the union, so a partition can lose a removal but never a purchase, and that this is stated as a business decision expressed as a merge rule.",
          },
        ],
        title: "Eventual consistency in the interface",
        level: "advanced",
        body: [
          "Eventual consistency means replicas converge given no new writes. Read the definition carefully: it promises convergence and says nothing whatsoever about when, and in a system that is always being written to, the condition it depends on never actually occurs. The guarantee is real and it is weaker than the phrase makes it sound. There is a ladder of stronger session guarantees, and each is far cheaper than linearizability. Read-your-own-writes: you see your own changes. Monotonic reads: you never see time run backwards, which is what happens when consecutive reads hit replicas at different lag. Consistent prefix: you see writes in the order they were made, so a reply never appears before the message it answers. Most complaints filed as database inconsistency are one of these three, and each can be bought with routing rather than with consensus.",
          "The engineering is mostly in the interface. Show the pending state, use an optimistic update so the change appears immediately, and do not pretend an action is complete when it is merely accepted. A spinner that says processing is honest; a green tick for work that is queued is a lie that generates a support ticket when the work later fails.",
          "Convergence needs a merge rule, and choosing it is a product decision wearing technical clothes. Last write wins is the default in many stores and is the lossiest: it discards a write silently and depends on clocks you do not control. Amazon's shopping basket takes the union of conflicting versions, which can resurrect a removed item but can never lose an added one, because losing a purchase costs more than an unexpected item at checkout.",
          "CRDTs are the version where the merge is a property of the data type rather than a decision at read time. A grow-only counter, an add-wins set, a sequence for collaborative text: each is defined so that merging in any order gives the same answer, which removes conflict resolution from the application entirely. They are not free, since the metadata to make that work can outgrow the data, and they are the right tool for exactly the cases they fit.",
          "The practical test for a design is to ask what a user sees during the gap and what happens if two people act in it. If the answer to the first is nothing at all and to the second is one of them silently loses, the consistency model has not been designed, it has been inherited from a default.",
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
        checks: [
          {
            prompt: "A user refreshes twice and the second page shows older data than the first. Which guarantee is missing?",
            options: [
              "Read-your-own-writes, since the user cannot see their own change",
              "Monotonic reads, so successive reads never go backwards in time",
              "Consistent prefix, so writes appear in the order they were made",
              "Linearizability, so every read reflects the most recent write",
            ],
            correctIndex: 1,
            explain:
              "Consecutive reads landed on replicas with different lag, so time appeared to run backwards. Sticky routing to one replica per session buys monotonic reads without any consensus protocol.",
          },
          {
            prompt: "Why does Amazon's basket merge conflicting versions by union?",
            options: [
              "Union is the only merge that converges regardless of arrival order",
              "It keeps the basket small, since duplicates collapse into one entry",
              "Resurrecting a removed item costs less than losing an added one",
              "It avoids depending on timestamps, which are unreliable across regions",
            ],
            correctIndex: 2,
            explain:
              "The merge rule encodes a commercial judgement: an unexpected item is noticed at checkout, a missing purchase is lost revenue. Dynamo's paper is explicit that this is a business decision expressed as a merge.",
          },
          {
            prompt: "What do CRDTs change about conflict resolution?",
            options: [
              "The merge is defined by the data type, so any order gives one answer",
              "Conflicts are detected at write time and rejected before they diverge",
              "A coordinator picks a winner, so applications never see two versions",
              "Replicas exchange full state, so the newest copy always wins outright",
            ],
            correctIndex: 0,
            explain:
              "The structure is designed so merging is commutative and associative, which takes the decision out of the application. The cost is metadata that can outgrow the data it describes.",
          },
        ],
        diagram: {
          caption: "Session guarantees are bought with routing, not consensus",
          columns: [
            [{ id: "u", label: "One user", sub: "writes then reads", kind: "client" }],
            [{ id: "rt", label: "Router", sub: "reads the session", kind: "edge" }],
            [
              { id: "pri", label: "Primary", sub: "read-your-own-writes", kind: "data" },
              { id: "same", label: "One sticky replica", sub: "monotonic reads", kind: "data" },
              { id: "any", label: "Any replica", sub: "time can go backwards", kind: "data", alternative: true },
            ],
          ],
          edges: [
            { from: "u", to: "rt", label: "request" },
            { from: "rt", to: "pri", label: "just wrote" },
            { from: "rt", to: "same", label: "same session" },
            { from: "rt", to: "any", label: "no rule at all" },
          ],
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
        sources: [
          {
            label: "Stripe, Scaling your API with rate limiters",
            url: "https://stripe.com/blog/rate-limiters",
            supports: "That Stripe runs four limiters side by side, a request rate limiter, a concurrent request limiter and two load shedders reserving capacity for critical traffic.",
          },
          {
            label: "Cloudflare, How we built rate limiting capable of scaling to millions of domains",
            url: "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/",
            supports: "The counting method quoted here, current window plus previous window weighted by the fraction not yet elapsed, and the reported 0.003 per cent divergence from a true sliding window across 400 million requests.",
          },
        ],
        title: "Token bucket and sliding window",
        level: "intermediate",
        body: [
          "A fixed window counter is simple, and it allows double the limit across a boundary: a full quota at the end of one window, another full quota at the start of the next. A limit of 100 a minute permits 200 in the two seconds either side of the boundary, which is exactly the burst you were trying to prevent, and it arrives at the least convenient moment because every client with a cron job fires on the minute.",
          "A sliding window fixes that by weighting the previous window and counting the current one in full: the estimate is the current count plus the previous count times one minus the fraction elapsed. Twenty seconds into a sixty second window that is everything counted so far plus two thirds of the last window, and the previous window's contribution fades linearly to nothing as the current one fills. It is an approximation, and it is cheap, two counters per key rather than a timestamp per request, which is why it is what large edge platforms actually run. Cloudflare reported that across 400 million requests only 0.003 per cent were allowed or rejected differently from a true sliding window, which is the number that justifies the approximation. A true sliding log, keeping every request timestamp, is exact and costs memory proportional to traffic, which is the wrong trade at the edge and the right one for a small number of very expensive operations.",
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
        sources: [
          {
            label: "Amazon Builders' Library, Timeouts, retries and backoff with jitter",
            url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/",
            supports: "The recommendation to choose timeouts from the observed latency distribution rather than from round numbers, on the grounds that a timeout chosen without data either never fires or fires constantly.",
          },
          {
            label: "gRPC: deadlines",
            url: "https://grpc.io/docs/guides/deadlines/",
            supports: "That a gRPC call carries a deadline as part of the call and propagates the remaining time to downstream calls, rather than each hop starting a fresh clock.",
          },
        ],
        title: "Timeouts and deadlines",
        level: "intermediate",
        body: [
          "A timeout is the number that decides how long you are willing to hold a resource for an answer that may never come, and most systems get it by accident. The default in many HTTP clients is no timeout at all, or a connect timeout with no read timeout, which is the same thing where it matters: a socket that opens and then goes quiet holds a worker forever.",
          "Little's Law gives you the arithmetic and it is worth doing on paper before an incident does it for you. Concurrency equals arrival rate times latency. A service taking 100 requests a second at 50ms needs 5 concurrent workers. The same service at 30 seconds needs 3,000. Nothing about the traffic changed and nothing about the code changed; the only thing that moved was latency, and the pool that comfortably held 5 is now short by a factor of six hundred. This is why a slow dependency is more dangerous than a dead one: the dead one returns instantly and you handle it.",
          "Timeouts have to decrease as you go down the call tree. If a browser gives up after 10 seconds, the API waiting 30 for a service that waits 30 for the database means every layer is working on a result nobody is waiting for, holding connections that live requests need. The rule is that each hop's timeout is shorter than its caller's, with room for a retry if the layer retries.",
          "The better version of the rule is a deadline rather than a timeout: a wall-clock instant that travels with the request, so each hop passes on the time remaining rather than starting a fresh clock. gRPC does this natively, and it is why a deep call tree there degrades sensibly. Over HTTP you carry it yourself in a header and enforce it in a middleware. The difference shows up in the tail: with independent timeouts, four hops of 2 seconds each can spend 8 seconds serving a client that left after 3.",
          "Choose the number from the latency distribution, not from a round figure. A timeout at the 99th percentile plus a margin cuts off the pathological tail without failing the merely slow. Setting it at the mean fails a fifth of good requests; setting it at ten times the p99 means it never fires and you have written a comment rather than a control. The instinct during an incident is to raise the timeout, and it reliably makes things worse: the calls that were failing now wait longer before failing, holding more resources for longer, and the failure spreads from one dependency to everything sharing that pool. Failing fast is what frees capacity, and it is what turns a broken dependency into a degraded page instead of a total outage.",
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
        sources: [
          {
            label: "AWS Architecture Blog, Exponential backoff and jitter (2015)",
            url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
            supports: "That full jitter, a random wait between zero and the capped exponential interval, produced substantially less contention and less total work than plain exponential backoff.",
          },
          {
            label: "Google SRE Book, Handling overload",
            url: "https://sre.google/sre-book/handling-overload/",
            supports: "The client-side retry budget of around ten per cent of requests, and the practice of servers signalling explicitly when a request should not be retried.",
          },
        ],
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
        sources: [
          {
            label: "Netflix TechBlog, Hystrix is no longer in active development",
            url: "https://github.com/Netflix/Hystrix/blob/master/README.md",
            supports: "That Netflix retired Hystrix in favour of adaptive concurrency limits, which infer the safe level of in-flight work from observed latency rather than from hand-chosen thresholds.",
          },
        ],
        title: "Circuit breakers and bulkheads",
        level: "intermediate",
        body: [
          "A circuit breaker counts failures over a window and trips once they cross a threshold, then fails fast for a cooling period, then lets a single trial request through to test recovery. Closed, open, half-open. The half-open state is the part that matters: without it, the full load arrives the instant the timer expires, knocks the recovering dependency over again, and the breaker flaps between states while everyone watches the dashboard oscillate. What a breaker buys you is not error handling, it is capacity. When it is open, calls fail in microseconds instead of holding a worker for the timeout, so the pool stays available for the requests that can still be served. It converts a dependency's failure from something that consumes your service into something that returns an error from one part of your service.",
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
        sources: [
          {
            label: "Facebook, Fail at scale (ACM Queue, 2015)",
            url: "https://queue.acm.org/detail.cfm?id=2839461",
            supports: "That request queues were switched to last-in-first-out with a controlled-delay controller under overload, on the reasoning that an old queued request has probably already been abandoned.",
          },
          {
            label: "Amazon Builders' Library, Static stability using availability zones",
            url: "https://aws.amazon.com/builders-library/static-stability-using-availability-zones/",
            supports: "The static stability property described here: a system keeps working with the data it already has while its control plane is unavailable, so only changes stop.",
          },
        ],
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
    summary: "Logs, metrics, traces, percentiles, error budgets and alerts that are worth waking up for.",
    track: "design",
    topics: [
      {
        id: "logs-metrics-traces",
        sources: [
          {
            label: "Sigelman et al., Dapper, a large-scale distributed systems tracing infrastructure (Google, 2010)",
            url: "https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/",
            supports: "The span and trace model most tracing systems still follow, and the aggressive sampling described for high-throughput services, as low as one request in 1,024.",
          },
          {
            label: "W3C Trace Context",
            url: "https://www.w3.org/TR/trace-context/",
            supports: "That the traceparent header is a standard, which is what allows a trace to survive crossing between systems written by different people.",
          },
        ],
        title: "Logs, metrics and traces",
        level: "beginner",
        body: [
          "The three signals answer different questions and are priced very differently, which is why the choice between them is an engineering decision rather than a matter of taste. Metrics are numbers aggregated over time: cheap to store, cheap to query, and they tell you that something is wrong. Traces follow one request across every service it touches and tell you where the time went. Logs record discrete events with full detail and tell you why.",
          "Run only on logs and you are paying to store the answer to questions a metric answers instantly, then waiting on a text search to compute what a counter already knew. Run only on metrics and you know the error rate rose without knowing which call, which customer, or which deploy. Most teams arrive at the right mix by overspending on one of them first.",
          "A trace is a tree of spans, each with a start, a duration, and a parent, tied together by identifiers that travel with the request. That propagation is the whole mechanism, and it is standardised: W3C Trace Context defines the traceparent header so a trace survives crossing between systems written by different people. Miss the propagation in one hop and the trace silently splits into two unrelated halves, which is the most common reason tracing is installed and not useful.",
          "Sampling is unavoidable at volume, since keeping every span for every request costs more than the service. Head-based sampling decides at the start, cheap and blind: Google's Dapper paper describes sampling as low as one request in 1,024 for high-throughput services. Tail-based sampling buffers the spans and decides after the fact, so you can keep every trace that was slow or errored and discard the boring majority, which is what you actually want and costs more to run.",
          "Logs earn their keep when they are structured. A line of prose has to be parsed with a regular expression that breaks the next time someone rewords the message; a JSON object with the same fields on every line can be filtered, counted and grouped without anyone writing a parser. Emit the request id in every line, and the log becomes a joinable dataset rather than a story. The connective tissue matters more than any of the three individually. A metric that alerts should link to the trace that shows the slow hop, and the trace should link to the logs for that request id. Without those links each signal is an island and every investigation starts with someone copying identifiers between four browser tabs at two in the morning.",
        ],
        why: "Metrics tell you something is wrong, traces tell you where, logs tell you why, and the cost per question rises in that order. Reaching for the expensive signal first is how observability bills grow faster than traffic while investigations stay slow.",
        inPractice:
          "Google's Dapper described the design most tracing systems still follow, including aggressive sampling for high-throughput services. W3C Trace Context is now the standard for carrying trace identity between systems, which is what makes a trace survive the boundary between your service and someone else's.",
        diagram: {
          caption: "Three signals, one request id joining them",
          columns: [
            [{ id: "req", label: "Request", sub: "id generated", kind: "client" }],
            [
              { id: "m", label: "Metrics", sub: "counters, histograms", kind: "data" },
              { id: "t", label: "Trace", sub: "spans per hop", kind: "data" },
              { id: "l", label: "Logs", sub: "structured, with id", kind: "data" },
            ],
            [{ id: "alert", label: "Alert fires", sub: "from a metric", kind: "edge" }],
            [{ id: "inv", label: "Investigation", sub: "trace then logs", kind: "service" }],
          ],
          edges: [
            { from: "req", to: "m", label: "counted" },
            { from: "req", to: "t", label: "sampled" },
            { from: "req", to: "l", label: "written" },
            { from: "m", to: "alert", label: "threshold crossed" },
            { from: "alert", to: "inv", label: "link to the trace" },
          ],
        },
        check: {
          prompt: "Latency has risen across a request path spanning six services. Which signal localises it fastest?",
          options: ["Application logs", "Distributed traces", "CPU metrics", "Error counts"],
          correctIndex: 1,
          explain: "A trace shows time spent per service for one request, which points at the slow hop immediately. Logs would mean correlating six services by hand.",
        },
        checks: [
          {
            prompt: "Tracing is installed everywhere, and traces stop at the third service. What is the likely cause?",
            options: [
              "That service samples at a lower rate than the two services above it",
              "Its spans exceed the collector's size limit and are dropped silently",
              "It does not propagate the trace headers, so downstream starts a new trace",
              "Its clock is skewed, so the spans are ordered outside the trace window",
            ],
            correctIndex: 2,
            explain:
              "A trace exists because the identifiers travel with the request. One hop that drops the headers splits the trace into two unrelated halves, each of which looks complete on its own.",
          },
          {
            prompt: "What does tail-based sampling give you that head-based sampling cannot?",
            options: [
              "A guarantee that every trace from a given customer is retained",
              "The ability to keep exactly the slow and failed traces, decided after the fact",
              "Lower overhead, since the decision is made once per service rather than per span",
              "Consistent sampling across services without propagating a sampling flag",
            ],
            correctIndex: 1,
            explain:
              "Deciding at the start means keeping a random sample, which is mostly healthy requests. Buffering the spans and deciding at the end lets you keep the interesting ones, at the cost of holding them until the request finishes.",
          },
          {
            prompt: "Why does structured logging matter more than log volume?",
            options: [
              "Structured lines compress better, so retention costs fall sharply",
              "Fields can be filtered and counted without a parser that breaks on rewording",
              "Structured logs can be sampled safely, whereas prose logs cannot",
              "It allows log lines to be written asynchronously without losing order",
            ],
            correctIndex: 1,
            explain:
              "Consistent fields turn a log into a queryable dataset. Prose has to be parsed by pattern, and the pattern breaks the next time somebody improves the wording of a message.",
          },
        ],
      },
      {
        id: "percentiles",
        sources: [
          {
            label: "Dean and Barroso, The Tail at Scale (CACM, 2013)",
            url: "https://research.google/pubs/the-tail-at-scale/",
            supports: "That with 100 servers per request, a one-in-a-hundred slow response at a component becomes a roughly two-in-three chance at the request.",
          },
        ],
        title: "Percentiles, not averages",
        level: "intermediate",
        body: [
          "An average hides the tail, and the tail is what people complain about. A system averaging 100ms can be taking five seconds on one request in a hundred: the mean barely moves, and the hundredth user is the one who writes to support. p50 describes the typical experience, p95 and p99 describe the worst of it, and only the second pair predicts churn.",
          "The tail is also structurally worse than it looks in a system made of many services, and the arithmetic is the most useful thing in this topic. If a request fans out to 100 servers and each has a 1% chance of taking over a second, the chance that at least one of them does is 1 minus 0.99 to the power of 100, which is about 63%. A one-in-a-hundred event at the component becomes a two-in-three event at the request. That is the result from Dean and Barroso's paper on tail latency, and it explains why large systems fight for the 99th percentile of their dependencies rather than the mean.",
          "There is a trap on the way to percentiles that catches almost everyone: you cannot average them. The mean of each host's p99 is not the fleet's p99, and it is not any statistic at all. Percentiles have to be computed over the whole population, which is why metric systems store histograms with fixed buckets, or sketches such as t-digest, rather than the summary number each host computed for itself.",
          "Choose the percentile from the number of chances a user gets to hit it. A page that makes 20 API calls gives the p95 twenty opportunities to appear, so roughly two thirds of page loads will contain at least one p95 request. For anything a user does repeatedly, p99 and p99.9 are the honest targets, and for a nightly batch job the mean is genuinely fine.",
          "Measure at the edge as well as inside. Server-side latency excludes queueing before your process, DNS, connection setup, the mobile network and the time the browser spends rendering, and those can dominate. A service that is fast in its own dashboards and slow to its users usually has that gap, and finding it means measuring where the user is rather than where the code is.",
          "Finally, watch the shape and not only the number. A bimodal distribution, fast on cache hits and slow on misses, has a p50 and a p99 that describe two different populations and a mean that describes neither. Histograms show that immediately; a single summary number never will.",
        ],
        why: "Reporting p99 instead of the mean is a small change that surfaces the problems users complain about and dashboards do not show. It also makes capacity conversations honest, because the tail is where a system runs out of headroom first.",
        inPractice:
          "Dean and Barroso's The Tail at Scale is the canonical treatment: at 100 servers per request, a one-in-a-hundred slow response at a component becomes a roughly two-in-three chance at the request. It is the reason large systems chase tail latency in their dependencies rather than averages.",
        diagram: {
          caption: "A one-in-a-hundred component tail becomes a two-in-three request tail",
          columns: [
            [{ id: "u", label: "One request", kind: "client" }],
            [{ id: "fan", label: "Fan-out", sub: "100 services", kind: "service" }],
            [
              { id: "ok", label: "99 fast replies", sub: "under 100ms", kind: "data" },
              { id: "slow", label: "1 slow reply", sub: "over 1s, 1% each", kind: "data", alternative: true },
            ],
            [{ id: "res", label: "Response", sub: "63% exceed 1s", kind: "edge" }],
          ],
          edges: [
            { from: "u", to: "fan", label: "one page" },
            { from: "fan", to: "ok", label: "99% each" },
            { from: "fan", to: "slow", label: "1% each" },
            { from: "slow", to: "res", label: "the slowest decides" },
          ],
        },
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
        checks: [
          {
            prompt: "A dashboard averages each host's p99 to show a fleet-wide p99. What is wrong with that?",
            options: [
              "It weights busy hosts equally with idle ones, biasing the result low",
              "It cannot be computed in real time, so the value is always stale",
              "The mean of percentiles is not a percentile of the population at all",
              "It hides which host is slow, so the number cannot be acted on",
            ],
            correctIndex: 2,
            explain:
              "Percentiles do not average. The fleet p99 has to be computed over all requests, which is why metric systems store histograms or sketches rather than each host's summary number.",
          },
          {
            prompt: "A page makes 20 API calls. What does that do to the latency a user experiences?",
            options: [
              "It averages out, so the page tracks the median call latency closely",
              "It gives the tail twenty chances, so p95 calls show up on most loads",
              "It reduces the tail, since slow calls overlap with fast ones in parallel",
              "It shifts the distribution up by exactly twenty times the median",
            ],
            correctIndex: 1,
            explain:
              "The page is as slow as its slowest call, and twenty draws from the distribution make an unlikely event likely. This is why services that fan out care about their dependencies' tail rather than their mean.",
          },
          {
            prompt: "Latency looks fine server-side but users report slowness. What is the first thing to check?",
            options: [
              "Whether measurement starts at the process rather than at the user",
              "Whether the metric is a gauge rather than a histogram",
              "Whether the sampling rate is high enough to catch rare requests",
              "Whether the percentile is computed over too short a window",
            ],
            correctIndex: 0,
            explain:
              "Server-side timing excludes queueing before your process, DNS, connection setup, the mobile network and rendering. Any of those can dominate, and none of them appear in a dashboard that starts the clock inside the handler.",
          },
        ],
      },
      {
        id: "slo",
        sources: [
          {
            label: "Google SRE Book, Service level objectives",
            url: "https://sre.google/sre-book/service-level-objectives/",
            supports: "The SLI, SLO and error budget formulation, and the policy that an exhausted budget stops feature launches until reliability work restores it.",
          },
        ],
        title: "SLIs, SLOs and error budgets",
        level: "advanced",
        body: [
          "An SLI is a measurement, such as the proportion of requests served successfully in under 300ms. An SLO is the target for that measurement over a window, say 99.9% over 30 days. The gap between the target and 100% is the error budget, and it is the most useful idea in the set because it turns reliability from a virtue into a quantity. The budget makes the trade explicit. Spend it shipping quickly. When it is exhausted, stop shipping and spend the time on stability instead. That replaces a recurring argument about whether features or reliability come first with a number both sides agreed to in advance, when nobody was under pressure and nobody was defending a decision they had already made.",
          "The arithmetic is worth knowing because the nines are less intuitive than they look. 99.9% over 30 days is about 43 minutes of budget; 99.99% is about 4 minutes and 20 seconds, which is less time than most teams take to acknowledge a page. Each additional nine costs disproportionately more and buys less, and choosing one because it sounds serious is how a team ends up permanently over budget and ignoring the whole scheme.",
          "The SLI has to be measured where the user is, and it has to describe something a user would recognise. The fraction of successful requests at the load balancer is a reasonable proxy; CPU utilisation is not an SLI at all, because no user has ever noticed it directly. The good ones are usually availability, latency, correctness and freshness, and the test for a candidate is whether a person could describe it in a sentence without using the word server.",
          "Perfect reliability is the wrong target, and this is the part that sounds like heresy until you cost it. If the network between the user and you fails more often than your service does, the last nine you bought is invisible to everyone, and it was paid for with the features that were not shipped. An error budget that is never spent is a signal that you are shipping too slowly, and it should prompt exactly as much discussion as one that is exhausted.",
          "None of this works without agreement about who owns the number. An SLO written by an infrastructure team and imposed on a product team becomes a stick; one agreed by both, with the budget policy written down before the first breach, becomes the thing that ends the argument. The mechanism is social as much as technical, which is why the SRE literature spends more pages on the policy than on the maths.",
        ],
        why: "Chasing 100% is the wrong target: each extra nine costs disproportionately more, and perfect reliability means you shipped too slowly. The budget makes the trade explicit rather than political, and it is the rare metric that both sides of that argument can accept because they set it together.",
        inPractice:
          "Google's SRE practice is the origin of the error budget, including the policy that an exhausted budget freezes feature launches until reliability work restores it. The arithmetic is unforgiving: 99.9% over 30 days is 43 minutes, and 99.99% is 4 minutes and 20 seconds.",
        diagram: {
          caption: "The budget is a resource, and the policy is agreed before it runs out",
          columns: [
            [{ id: "sli", label: "SLI", sub: "good requests / all", kind: "data" }],
            [{ id: "slo", label: "SLO", sub: "99.9% over 30 days", kind: "service" }],
            [{ id: "bud", label: "Error budget", sub: "43 minutes", kind: "data" }],
            [
              { id: "ship", label: "Budget remaining", sub: "keep shipping", kind: "service" },
              { id: "freeze", label: "Budget spent", sub: "stabilise first", kind: "external" },
            ],
          ],
          edges: [
            { from: "sli", to: "slo", label: "measured against" },
            { from: "slo", to: "bud", label: "the gap to 100%" },
            { from: "bud", to: "ship", label: "under budget" },
            { from: "bud", to: "freeze", label: "over budget" },
          ],
        },
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
        checks: [
          {
            prompt: "A team sets an SLO of 99.99% over 30 days. How much unavailability does that allow?",
            options: [
              "About 43 minutes, roughly one moderate incident in a calendar month",
              "About 4 minutes 20 seconds, less than most teams take to answer a page",
              "About 7 hours, because the target applies only during business hours",
              "About 30 seconds, since each nine divides the previous budget by ten",
            ],
            correctIndex: 1,
            explain:
              "Four nines over 30 days is roughly 4 minutes 20 seconds. Choosing it because it sounds serious is how a team ends up permanently over budget and quietly ignoring the whole scheme.",
          },
          {
            prompt: "Which of these is a poor SLI?",
            options: [
              "The share of requests answered successfully within 300 milliseconds",
              "The share of data pipeline runs finishing inside their stated window",
              "Mean CPU utilisation across the fleet, measured in business hours",
              "The share of writes visible to a following read within one second",
            ],
            correctIndex: 2,
            explain:
              "An SLI has to describe something a user would recognise. Nobody has ever noticed CPU utilisation directly; it is a cause, and causes belong on dashboards rather than in the contract.",
          },
          {
            prompt: "A team never spends its error budget. What should that prompt?",
            options: [
              "A discussion about shipping more, since the reliability is being overpaid for",
              "A tighter SLO, so that the budget matches the reliability being achieved",
              "Nothing, since an unspent budget is the goal the SLO was set to reach",
              "A review of the SLI, since it is probably measuring the wrong thing",
            ],
            correctIndex: 0,
            explain:
              "An unspent budget means reliability was bought with features that were not shipped. It should prompt as much discussion as an exhausted one, which is the part of the idea teams usually skip.",
          },
        ],
      },
      {
        id: "alerting",
        sources: [
          {
            label: "Google SRE Workbook, Alerting on SLOs",
            url: "https://sre.google/workbook/alerting-on-slos/",
            supports: "The multi-window multi-burn-rate approach, including that a 14.4 times burn rate over one hour consumes two per cent of a 30-day budget and is worth paging on, while a slower burn over six hours is a ticket.",
          },
          {
            label: "Google SRE Book, Monitoring distributed systems",
            url: "https://sre.google/sre-book/monitoring-distributed-systems/",
            supports: "The four golden signals of latency, traffic, errors and saturation, and the argument for alerting on symptoms rather than causes.",
          },
        ],
        title: "Alerts worth waking up for",
        level: "advanced",
        body: [
          "An alert is a claim that a human should stop what they are doing right now. Judged that way, most alerting rules do not qualify, and the cost of the ones that do not is not the interruption but the habit: a person who has ignored forty pages will ignore the forty-first, and that is the one that mattered.",
          "The first rule is to alert on symptoms rather than causes. Users notice slow pages and failed requests; they do not notice a full disk, a restarted pod or a queue with 4,000 messages in it, unless one of those is making pages slow, in which case the symptom alert already fired. Cause-based rules multiply as fast as the system grows and go stale silently, because nothing tells you when a threshold stopped mattering.",
          "What to measure for a symptom is well-trodden ground. Google's four golden signals are latency, traffic, errors and saturation. The RED method for request-driven services is rate, errors and duration; the USE method for resources is utilisation, saturation and errors. They overlap deliberately, and any of them is enough. Picking one and applying it consistently is worth more than picking the best one.",
          "Alert on error budget burn rate rather than on a raw threshold, because a raw threshold either pages on a blip or misses a slow bleed. The SRE Workbook's approach is multi-window and multi-burn-rate: page when the recent burn is fast enough to exhaust a meaningful share of the budget quickly, for example 14.4 times the sustainable rate over an hour, which spends 2% of a 30-day budget in that hour, and confirm it with a longer window so a one-minute spike cannot page anyone. A slower burn, several times the sustainable rate over six hours, is a ticket rather than a page.",
          "Every page needs a runbook link, an owner and an action. If the honest answer to what should I do is wait and see, it should not have woken anyone, and the fix is to make it a dashboard or a ticket. This is also the test that keeps an alerting system from growing without limit: nobody adds an alert they have to write a runbook for unless they mean it.",
          "Finally, review pages the way you review code. Count them per week, name the ones that were not actionable, and delete or demote them in the same meeting. An alerting configuration is the only part of most systems that nobody ever deletes from, which is precisely why it ends up describing a system that stopped existing two architectures ago.",
        ],
        why: "The scarce resource is the attention of the person carrying the pager, and it is spent whether the alert was useful or not. Alerting on symptoms with burn rates keeps the volume proportional to actual user harm, which is the only thing that makes a pager sustainable to carry.",
        inPractice:
          "The SRE Workbook's multi-window multi-burn-rate alerts are the standard reference: a 14.4 times burn over an hour spends 2% of a 30-day budget and is worth a page, while a slower burn over six hours is a ticket. The four golden signals, RED and USE all exist to answer the same question of what to measure, and consistency beats the choice between them.",
        diagram: {
          caption: "Two windows agreeing before anyone is woken",
          columns: [
            [{ id: "sli", label: "SLI stream", sub: "good vs bad requests", kind: "data" }],
            [
              { id: "fast", label: "1 hour window", sub: "burn 14.4x", kind: "service" },
              { id: "slow", label: "5 minute window", sub: "confirms it is now", kind: "service" },
            ],
            [{ id: "page", label: "Page", sub: "runbook attached", kind: "edge" }],
            [{ id: "ticket", label: "Ticket", sub: "6 hour slow burn", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "sli", to: "fast", label: "budget spend rate" },
            { from: "sli", to: "slow", label: "recent rate" },
            { from: "fast", to: "page", label: "both agree" },
            { from: "slow", to: "page", label: "both agree" },
            { from: "fast", to: "ticket", label: "slower burn", async: true },
          ],
        },
        check: {
          prompt: "Why alert on symptoms rather than on causes such as high CPU or a full queue?",
          options: [
            "Cause alerts are harder to compute accurately across a large fleet",
            "Symptom alerts fire earlier, giving on-call more time to respond",
            "Causes multiply as the system grows and go stale without anyone noticing",
            "Symptoms can be measured client-side, which causes cannot be",
          ],
          correctIndex: 2,
          explain:
            "A user notices slow pages and failed requests, not a full disk. Cause-based rules grow with the architecture and quietly stop mattering, while the symptom alert stays true regardless of how the system is built underneath.",
        },
        checks: [
          {
            prompt: "What does a multi-window burn rate alert prevent that a single threshold does not?",
            options: [
              "Paging on a brief spike, while still catching a fast sustained burn",
              "Alerting during a deploy, when errors are expected to rise briefly",
              "Duplicate pages when several services breach the same SLO at once",
              "Missing a breach that occurs entirely outside working hours",
            ],
            correctIndex: 0,
            explain:
              "The long window says the burn is fast enough to matter, the short one says it is still happening. Either alone gives you a pager that fires on noise or one that notices an outage an hour late.",
          },
          {
            prompt: "An alert has no runbook and the usual response is to wait and see. What should happen to it?",
            options: [
              "Raise its threshold so that it fires less often during normal operation",
              "Route it to the secondary on-call so the primary is never interrupted",
              "Demote it to a dashboard or a ticket, since nobody should be woken",
              "Keep it, because a human deciding to wait is still a human decision",
            ],
            correctIndex: 2,
            explain:
              "A page is a claim that someone should act now. If there is no action, the alert is spending the pager's attention for nothing, and the cost is that the next real page is trusted a little less.",
          },
          {
            prompt: "Why review the alerting configuration on a regular schedule?",
            options: [
              "Thresholds drift as traffic grows, so every number needs periodic rescaling",
              "Nobody ever deletes an alert, so the config describes an older architecture",
              "Alert definitions expire quietly, and stale ones stop firing without warning",
              "Review is required to keep the on-call rota compliant with company policy",
            ],
            correctIndex: 1,
            explain:
              "Alerts are added during incidents and removed almost never, so the configuration slowly becomes a description of a system that no longer exists. Counting pages weekly and deleting the useless ones is the only thing that keeps it honest.",
          },
        ],
      },
      {
        id: "cardinality",
        sources: [
          {
            label: "Prometheus documentation, Cautions on cardinality",
            url: "https://prometheus.io/docs/practices/naming/#labels",
            supports: "That every distinct label combination is a separate time series, so an unbounded label such as a user identifier can take the monitoring system down while the service it monitors stays healthy.",
          },
        ],
        title: "Cardinality, sampling and the bill",
        level: "advanced",
        body: [
          "Observability costs scale with the questions you might ask, not with the questions you do ask, and the mechanism is cardinality. A metric is stored as one time series per distinct combination of its labels, so a request counter labelled by endpoint (50), status code (6) and region (3) is 900 series, which is nothing. Add customer id with 10,000 values and it is 9 million, and the monitoring system falls over before the service does.",
          "The rule that follows is that labels are for values you would group by, and identifiers are not among them. User id, request id, session id, full URL paths with ids in them, and error messages containing a stack trace all belong in logs or traces, where the cost is per event rather than per distinct combination held in memory forever. The tell is a label whose set of values grows with your customer count.",
          "High-cardinality questions are legitimate, which is why the answer is not simply do not do that. What is this specific customer seeing, why is this one request slow: those need per-event data. The design that works is metrics for the aggregate and cheap alerting, traces and structured logs for the detail, sampled hard, and an index that lets you find the events belonging to one id. Trying to make one store do both is how observability bills come to rival compute bills.",
          "Sampling is the other lever, and it should be deliberate rather than emergent. Head sampling at a fixed rate is cheap and keeps a representative picture but loses the rare failure, which is the thing you wanted. Tail sampling keeps what was slow or wrong. A practical compromise is to keep a small uniform sample for baselines and everything anomalous on top, and to make the sampling rate visible so nobody computes a rate from sampled data and forgets to scale it.",
          "Retention deserves the same scrutiny as volume, because the value of a log line falls off a cliff after about a week while its storage cost does not. Most of the questions asked of observability data are asked within hours. Keeping metrics for a year at low resolution and logs for two weeks at full detail costs a fraction of keeping everything for a year, and answers almost every real question. There is a failure mode worth naming: monitoring that takes the system down. An exporter that scrapes every series on every request, a logging call inside a tight loop, or a debug level left on in production can consume more resources than the work being observed. Instrumentation is code that runs on the hot path, and it deserves the same review as the rest of it.",
        ],
        why: "Observability is the one system whose cost is driven by the questions you might ask rather than by traffic, and cardinality is where that cost hides. Keeping identifiers out of labels and pushing per-entity detail into sampled events is what keeps the bill proportional to the service rather than to the customer list.",
        inPractice:
          "Prometheus and its successors hold an in-memory index of active series, which is why a single unbounded label can take the monitoring system down while the service it monitors stays healthy. The standard split is aggregate metrics for alerting and sampled traces or structured logs for per-entity questions.",
        diagram: {
          caption: "One unbounded label turns 900 series into 9 million",
          columns: [
            [{ id: "src", label: "Request counter", sub: "one metric", kind: "service" }],
            [
              { id: "safe", label: "endpoint, status, region", sub: "50 x 6 x 3 = 900", kind: "data" },
              { id: "bad", label: "plus customer id", sub: "x 10,000 = 9M", kind: "data", alternative: true },
            ],
            [{ id: "tsdb", label: "Metrics store", sub: "index held in memory", kind: "data" }],
            [{ id: "trace", label: "Sampled traces", sub: "per-entity questions", kind: "data" }],
          ],
          edges: [
            { from: "src", to: "safe", label: "bounded labels" },
            { from: "src", to: "bad", label: "unbounded label" },
            { from: "safe", to: "tsdb", label: "cheap" },
            { from: "bad", to: "tsdb", label: "takes it down" },
            { from: "bad", to: "trace", label: "belongs here instead", async: true },
          ],
        },
        check: {
          prompt: "Which label is most likely to take a metrics system down?",
          options: [
            "HTTP status code, which has a few dozen possible values",
            "Deployment version, which changes on every release",
            "Customer id, whose distinct values grow with the business",
            "Region, which has one value per data centre in use",
          ],
          correctIndex: 2,
          explain:
            "Series count is the product of label cardinalities, and an identifier is unbounded by construction. Deployment version is a slower version of the same problem and is usually worth the cost; a customer id never is.",
        },
        checks: [
          {
            prompt: "You need to answer why one specific customer's requests are slow. Where should that data live?",
            options: [
              "In metrics, labelled by customer, so the question can be graphed directly",
              "In sampled traces and structured logs, indexed by the customer id",
              "In a separate metrics instance dedicated to per-customer series",
              "In an aggregate percentile per region, filtered down to that customer",
            ],
            correctIndex: 1,
            explain:
              "Per-entity questions need per-event data. Metrics are for aggregates and alerting; putting an identifier in a label buys one question and an unbounded series count.",
          },
          {
            prompt: "What is the risk of computing a request rate from tail-sampled trace data?",
            options: [
              "Trace timestamps are not precise enough to compute a rate from them",
              "Sampling keeps the unusual, so the count is not proportional to traffic",
              "Tail sampling discards spans well before the request has completed",
              "Rates can only be derived from counters, never from individual events",
            ],
            correctIndex: 1,
            explain:
              "Tail sampling deliberately over-represents slow and failed requests, so counting them measures the sampling policy rather than the traffic. Rates come from metrics; traces answer why.",
          },
          {
            prompt: "Why keep metrics for a year but logs for two weeks?",
            options: [
              "Logs compress poorly, so their storage cost grows faster than their volume",
              "Metrics are usually needed for compliance, whereas logs rarely are at all",
              "A log loses its value within days, while its storage cost stays the same",
              "Long log retention slows down queries over recent data in most systems",
            ],
            correctIndex: 2,
            explain:
              "Almost every question asked of a log is asked within hours of the event, while a metric is genuinely useful a year later for trends and capacity. Matching retention to how the data is actually used is usually the largest single saving available.",
          },
        ],
      },
    ],
  },
];
