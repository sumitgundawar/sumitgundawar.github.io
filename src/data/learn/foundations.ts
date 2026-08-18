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
          "Typing a URL sets off DNS resolution, a TCP handshake, a TLS handshake, and then the HTTP request itself. Naming those four steps separately is most of the skill, because each one costs a round trip and round trips are what you actually pay for.",
          "The prices are known. DNS is one round trip if nothing is cached, and often several as the resolver walks the chain. TCP's three-way handshake is one. TLS 1.3 is one, TLS 1.2 is two, and TLS 1.3 with session resumption can be zero for a returning client. Then the request itself. A user 200ms away pays that 200ms on each of them: four round trips is 800ms of blank screen before a single byte of content moves.",
          "Bandwidth does not help with any of this. The pipe is not full during a handshake, it is idle and waiting, which is why upgrading a connection from 50 to 500 megabits changes page load far less than people expect and why moving the server closer changes it far more. Above a few megabits, latency decides perceived speed and bandwidth decides how long large files take.",
          "It gets worse in sequence. Anything that has to happen in order pays the price again: a redirect from the apex to www is one extra round trip plus, if it crosses to a different host, another DNS lookup and another handshake. A page that fetches a script that then fetches configuration that then fetches data is three sequential trips before anything renders, and the browser cannot start any of them early because it does not know they exist.",
          "Then the connection is reused, which is the part that makes the arithmetic bearable. Keep-alive means subsequent requests on the same connection skip DNS, TCP and TLS entirely, so the first request is expensive and the tenth is nearly free. That is why third-party scripts on other hosts are disproportionately costly, and why domain sharding, once a performance technique, is now the opposite.",
          "The practical conclusion is short. Remove a round trip, move the server closer, or make the trips happen in parallel rather than in sequence. Everything else in web performance is a variation on one of those three.",
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
        checks: [
          {
            prompt: "Your API's p50 is 40ms and its p99 is 2.1s. Which explanation fits that shape best?",
            options: [
              "The server is undersized, so every single request runs slower than it should",
              "A few requests take a slower path: a cache miss, or a cold pool connection",
              "The network between the client and the server is dropping and resending packets",
              "The client is measuring it wrong and the real distribution is much flatter",
            ],
            correctIndex: 1,
            explain:
              "An undersized server moves the whole distribution, including p50. A long tail with a fast median means most requests take one path and a few take a slower one: a cache miss, a cold pool connection, a garbage collection pause, a retry. Averages hide this entirely, which is why p99 is the number worth alerting on.",
          },
          {
            prompt: "Why does adding a second sequential request to a page hurt distant users far more than nearby ones?",
            options: [
              "Bandwidth is lower over long distances, so every response takes longer to transfer",
              "Distant connections drop more often, and each dropped request has to be retried",
              "Every request in sequence pays the round trip again, and distance prices round trips",
              "TLS has to be renegotiated on each request once the connection is far enough away",
            ],
            correctIndex: 2,
            explain:
              "Distance costs latency per round trip, not per byte. Bandwidth to Australia is fine; the 250ms it takes for a packet to get there and back is not, and every request you make in sequence pays it again. This is why batching and parallelism matter more the further away your reader is.",
          },
          {
            prompt: "Why does a redirect from example.com to www.example.com cost more than it looks?",
            options: [
              "The browser discards the connection and repeats DNS, TCP and TLS",
              "Redirects are never cached, so the cost is paid on every page view",
              "Search engines penalise the second request, which delays rendering",
              "The redirect response cannot be compressed, so it transfers slowly",
            ],
            correctIndex: 0,
            explain:
              "A cross-host redirect starts the whole sequence again on a different name. That is a round trip for the redirect plus the handshakes for the new host, which is why the canonical host should be the one people are sent to first.",
          },
          {
            prompt: "Upgrading users from 50 to 500 megabits barely changes page load. Why?",
            options: [
              "The origin server becomes the bottleneck once client bandwidth rises",
              "Browsers cap per-connection throughput to avoid saturating a network",
              "Handshakes and sequential requests spend time waiting, not transferring",
              "Compression means the payload is already too small to benefit further",
            ],
            correctIndex: 2,
            explain:
              "Most of a page load is round trips, and a round trip takes the same time on a fast link as a slow one. Bandwidth decides how long large files take; latency decides how long the page takes to start.",
          },
        ],
        inPractice:
          "TLS 1.3 cut the handshake from two round trips to one and added a zero round trip mode for returning clients, which is the single largest protocol-level latency improvement most sites have received. It only helps because the handshake was pure waiting, which is the point.",
        diagram: {
          caption: "Four round trips before the first byte of content",
          columns: [
            [{ id: "u", label: "Browser", sub: "200ms away", kind: "client" }],
            [{ id: "dns", label: "DNS", sub: "1 round trip", kind: "edge" }],
            [{ id: "tcp", label: "TCP handshake", sub: "1 round trip", kind: "edge" }],
            [{ id: "tls", label: "TLS 1.3", sub: "1 round trip", kind: "edge" }],
            [{ id: "http", label: "HTTP request", sub: "1 round trip", kind: "service" }],
          ],
          edges: [
            { from: "u", to: "dns", label: "name to address" },
            { from: "dns", to: "tcp", label: "connect" },
            { from: "tcp", to: "tls", label: "negotiate" },
            { from: "tls", to: "http", label: "finally ask" },
          ],
        },
      },
      {
        id: "tcp-vs-udp",
        title: "TCP and UDP",
        level: "beginner",
        body: [
          "TCP guarantees delivery and order: lost packets are retransmitted, and the receiver holds everything after the gap until it is filled. UDP does neither. It sends a datagram and forgets it, and anything that arrives, arrives.",
          "That guarantee is not free, and the price is head-of-line blocking. One lost packet stalls everything queued behind it, which is exactly right for a file, where byte 400 is meaningless without byte 399, and useless for a live call, where a frame retransmitted 400ms later is worthless by the time it lands. Video calls, games and DNS run on UDP and handle loss themselves; nearly everything else takes the guarantee and is glad of it.",
          "TCP also does congestion control, which is the part people forget when they reach for UDP. It probes for available capacity, backs off when it sees loss, and shares the path with other flows in a roughly fair way. Choosing UDP means either implementing that yourself or being the traffic that ruins the network for everyone else, and the internet works partly because most flows are well behaved.",
          "There is a third cost worth knowing: connection setup. TCP's three-way handshake is a full round trip before any data, and TLS adds one or two more on top. UDP has no handshake at all, which is why DNS uses it for a query and a reply that would otherwise cost three exchanges to set up a connection carrying one small message.",
          "QUIC is the interesting middle. It runs on UDP and rebuilds reliability, ordering and congestion control in user space, per stream rather than per connection, so a lost packet stalls only the stream it belonged to. It also folds the transport and TLS handshakes together, so a connection is established in one round trip and a resumed one in zero. That is TCP's guarantees without TCP's blocking, at the cost of being much newer and living in user space where it can be updated.",
          "The rule of thumb is unchanged: take the guarantee unless stale data is worthless. If you find yourself adding sequence numbers, acknowledgements and retransmission on top of UDP, you are reimplementing TCP, and the version you write will be worse than the one in the kernel.",
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
        checks: [
          {
            prompt: "Besides reliability, what does a team give up by choosing raw UDP?",
            options: [
              "Encryption, which TCP provides at the transport layer by default",
              "Congestion control, so the flow no longer shares the path fairly",
              "Port numbers, which have to be multiplexed by the application",
              "Checksums, so corrupted payloads are delivered without detection",
            ],
            correctIndex: 1,
            explain:
              "TCP probes for capacity and backs off on loss. Without that, an application either implements it or becomes the flow that degrades the network for everyone, which is why raw UDP is a bigger commitment than skipping retransmissions.",
          },
          {
            prompt: "Why does DNS use UDP for ordinary queries?",
            options: [
              "Its responses are too small to benefit from ordered delivery",
              "Resolvers cannot keep connections open to thousands of servers",
              "A handshake would cost more than the single exchange it protects",
              "UDP responses can be cached by intermediaries, whereas TCP cannot",
            ],
            correctIndex: 2,
            explain:
              "One question and one answer would need three exchanges to set up a connection first. Retrying a lost query is cheaper than establishing a connection for it, which is exactly the trade UDP is for.",
          },
          {
            prompt: "How does QUIC get TCP's guarantees without TCP's head-of-line blocking?",
            options: [
              "It retransmits lost packets before the receiver notices the gap",
              "It orders bytes per stream, so a loss stalls only that stream",
              "It disables ordering entirely and reassembles in the application",
              "It sends every packet twice, so a single loss is always recoverable",
            ],
            correctIndex: 1,
            explain:
              "TCP orders one byte stream, so any gap holds up everything. QUIC keeps ordering per stream, so a lost packet blocks the stream it belonged to and the others continue.",
          },
        ],
      },
      {
        id: "http-versions",
        title: "HTTP/1.1, HTTP/2 and HTTP/3",
        level: "intermediate",
        body: [
          "HTTP/1.1 carries one request at a time per connection. Pipelining is in the specification and is effectively unused, because a slow response blocks the ones behind it and proxies handled it badly, so browsers instead open around six connections per host and developers bundled files to fit more work through them.",
          "That constraint produced an entire generation of workarounds: sprite sheets combining twenty icons into one image, inlined CSS, concatenated JavaScript, and domain sharding, which spread assets across asset1, asset2 and asset3 to get eighteen connections instead of six. Every one of them was a workaround for a protocol limit, and every one of them costs something: a sprite sheet invalidates entirely when one icon changes, and sharding multiplies DNS lookups and handshakes.",
          "HTTP/2 multiplexes many streams over one connection, which removes the reason for all of it. It also compresses headers with HPACK, which matters more than it sounds when a request carries a kilobyte of cookies and the body is a hundred bytes, and it supports server push, which was so hard to use correctly that Chrome removed support for it.",
          "What HTTP/2 does not fix is that it still runs on TCP. TCP delivers one ordered byte stream, so a single lost packet stalls every stream sharing that connection, which is worse than HTTP/1.1's six independent connections on a lossy network. On a good connection HTTP/2 wins comfortably; on a bad mobile link the comparison is closer than the version numbers suggest.",
          "HTTP/3 moves to QUIC over UDP, where each stream is ordered independently, so loss affects one stream instead of all of them. It also merges the transport and TLS handshakes into one round trip, and connections are identified by a connection id rather than by the four-tuple of addresses and ports, so a phone moving from wifi to mobile data keeps its connection instead of starting again.",
          "The practical advice is to stop carrying the workarounds forward. Bundling still helps a little, because compression works better across concatenated files and there is per-request overhead even when multiplexed, but the aggressive version hurts caching: one changed line invalidates a megabyte. Domain sharding is now actively harmful, since it defeats connection reuse and adds handshakes that HTTP/2 was designed to avoid.",
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
        checks: [
          {
            prompt: "Why is domain sharding now harmful rather than helpful?",
            options: [
              "Browsers ignore extra hostnames and reuse the first connection anyway",
              "It defeats connection reuse and adds a DNS lookup and handshake per host",
              "Shared hostnames cannot be covered by a single TLS certificate",
              "Assets on separate hosts are excluded from the browser cache",
            ],
            correctIndex: 1,
            explain:
              "It existed to get around the six-connection limit that HTTP/2 removed. Now each extra host costs its own resolution and handshake, and splits traffic that would have multiplexed over one warm connection.",
          },
          {
            prompt: "What does a QUIC connection id give a phone moving from wifi to mobile data?",
            options: [
              "The connection survives the address change instead of being re-established",
              "The handshake is cached, so the new network reuses the old session key",
              "Packets in flight on the old network are retransmitted on the new one",
              "The server can keep sending while the client has no address at all",
            ],
            correctIndex: 0,
            explain:
              "TCP identifies a connection by addresses and ports, so changing network kills it. QUIC identifies it by an id that travels in the packets, so the same connection continues from a new address.",
          },
          {
            prompt: "On a lossy mobile link, why can HTTP/1.1 sometimes beat HTTP/2?",
            options: [
              "HTTP/1.1 responses are smaller because headers are not compressed",
              "Six separate connections isolate loss; one shared connection does not",
              "HTTP/2 requires TLS, and the extra handshake dominates on slow links",
              "Multiplexed streams are processed serially by most server implementations",
            ],
            correctIndex: 1,
            explain:
              "One lost packet stalls the whole TCP byte stream, and with HTTP/2 every stream is in it. With six connections, a loss affects one sixth of the work, which is the case HTTP/3 was built to settle.",
          },
        ],
        inPractice:
          "Chrome removed support for HTTP/2 server push, which is the clearest evidence that a protocol feature nobody can use correctly is not a feature. HTTP/3 is now carried by every major browser and CDN, and the connection id is why it noticeably improves mobile browsing rather than benchmarks.",
      },
      {
        id: "dns",
        title: "DNS and why it hurts you",
        level: "intermediate",
        body: [
          "DNS turns a name into an address, and the answer is cached at every layer between you and the client: the browser, the operating system, the corporate resolver, the ISP's resolver. Each holds it for as long as the TTL you published, which makes TTL the single most consequential number in a migration plan. Low TTL means fast changes and more lookups; high TTL means the reverse.",
          "The catch is that your TTL is a request, not an instruction. Some resolvers clamp it to a minimum of their own, some ignore it, and some clients cache for the life of the process regardless. A migration planned around 60 seconds can still be sending traffic to the old address hours later, from a client nobody can identify, which is why the old address has to keep working rather than being decommissioned on schedule.",
          "The folk explanation, that changes take hours to propagate down from the root servers, is wrong and worth unlearning. Nothing propagates: authoritative servers are updated immediately, and the delay is entirely caches holding the previous answer until it expires. That distinction matters because it tells you what to do, which is to lower the TTL well in advance rather than to wait and hope.",
          "The practical technique follows. Days before a cutover, drop the TTL to 60 seconds and let the old, long TTL expire everywhere. Make the change. Keep the old address serving, ideally proxying to the new one, until traffic to it has stopped for longer than any plausible cache. Then raise the TTL again, because a permanently low TTL costs a lookup on every cold client and makes your resolver a hard dependency of every page load.",
          "Better still, do not fail over in DNS at all. Point the name at something stable, a load balancer or an anycast address, and move traffic behind it. Then a failover takes effect in seconds for everyone, rather than in an interval decided by other people's caches. This is why every large system's public name resolves to an address that has not changed in years.",
          "One more property worth knowing: negative answers are cached too. If a name does not exist when someone looks it up, that absence is cached according to the SOA record's minimum, so creating a record after a client has already asked for it can leave that client failing for the duration. Create the record before you tell anyone to try it.",
        ],
        why: "Lowering TTL days ahead of a migration, then failing over at the load balancer instead of in DNS, is the difference between a clean cutover and a long tail of traffic hitting a decommissioned box.",
        check: {
          prompt: "You set a 60-second DNS TTL and cut over. Hours later, some traffic still hits the old server. Why?",
          options: [
            "The change propagates down from the root servers, which takes hours",
            "Negative caching of the old record persists independently of its TTL",
            "Clients that already opened a connection keep using it until it closes",
            "TTL is advisory, some resolvers and clients cache for longer than you ask",
          ],
          correctIndex: 3,
          explain:
            "TTL is a request, not a guarantee, and some resolvers cache well past it. Propagation from the root is the folk explanation and it is wrong: the root is never consulted for a record already cached downstream. Plan cutovers so the old address keeps working, or fail over behind a stable address instead.",
        },
        checks: [
          {
            prompt: "Why do large systems avoid failing over by changing DNS records?",
            options: [
              "The change takes effect at a time decided by other people's caches",
              "Authoritative servers rate limit updates during an active incident",
              "Records cannot be changed without a registrar confirmation delay",
              "Anycast addresses cannot be represented in a DNS record at all",
            ],
            correctIndex: 0,
            explain:
              "A DNS failover completes when the last cache expires, which is unknowable. Pointing the name at a stable address and moving traffic behind it makes the switch take seconds for everyone.",
          },
          {
            prompt: "A record is created after a client has already looked the name up and failed. What happens?",
            options: [
              "The client retries immediately, since a failed lookup is never cached",
              "The absence is cached, so that client keeps failing for a while",
              "The resolver falls back to the root servers on the next attempt",
              "The new record is pushed to resolvers that recorded the failure",
            ],
            correctIndex: 1,
            explain:
              "Negative answers are cached according to the zone's SOA minimum. Creating the record before anyone is told to use it avoids a class of failure that looks like the record was never created.",
          },
          {
            prompt: "Why raise the TTL again after a migration is complete?",
            options: [
              "A low TTL forces a lookup on every cold client, on every page load",
              "Low TTLs are rejected by some resolvers, which substitute their own",
              "Long TTLs are required for a domain to be eligible for DNSSEC",
              "A low TTL prevents the record from being served by secondary servers",
            ],
            correctIndex: 0,
            explain:
              "A permanently low TTL makes your resolver a hard dependency of every page load, and DNS is one of the few dependencies with no fallback. Lower it for the migration, then put it back.",
          },
        ],
      },
      {
        id: "cdn",
        title: "CDNs and edge caching",
        level: "intermediate",
        body: [
          "A CDN puts copies of your content in data centres near your users, so the round trips that dominate page load take tens of milliseconds instead of hundreds. Nothing about your origin got faster. The distance got shorter, and distance was the bill.",
          "It helps even when nothing is cached, which surprises people. The connection is established with a nearby edge node, so the expensive handshakes happen over a short path, and the edge holds a warm, tuned connection back to your origin. A cache miss served through an edge is often meaningfully faster than the same miss served directly, purely from terminating TLS close to the user.",
          "Static assets are the easy part, and the reason they are easy is content addressing: a hashed filename can be cached forever because a new build is a new URL. The interesting work is caching HTML and API responses, where you have to be deliberate about the cache key and about invalidation, which are the two things that go wrong and the two things nobody owns.",
          "Cache keys are where hit ratios are won and lost. The key is the URL plus whatever Vary names, so an analytics parameter appended to a shared link produces a distinct entry per recipient, and Vary on a header with high cardinality shatters one entry into thousands. Normalising the key, stripping parameters that do not change the response, is routinely the largest single improvement available and costs nothing to run.",
          "Modern edge platforms also run code at those locations, which changes what can be moved. Authentication checks, personalisation, redirects, A/B assignment and geographic routing can happen near the user rather than at origin, so a personalised page can still be served from a cached shell with the personal part filled in at the edge. That is the difference between a CDN as a file server and a CDN as part of the application.",
          "The failure mode to respect is that an edge cache is very good at holding whatever you told it to hold. A wrong header applied by path rather than by response can pin the wrong content under the right URL for as long as you specified, and no purge reaches copies already held in browsers. Immutable caching is a promise about the URL, and it should only be made where the URL identifies the bytes.",
        ],
        why: "A CDN is usually the highest-leverage performance change available, because it attacks latency instead of throughput. Adding servers makes a busy system faster; moving content closer makes a distant system faster.",
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
        checks: [
          {
            prompt: "How can a CDN help a request that misses the cache entirely?",
            options: [
              "It compresses the response better than most origin servers do",
              "It retries the origin automatically if the first attempt is slow",
              "The handshakes happen nearby, and the edge holds a warm link to origin",
              "It serves a stale copy while fetching, so the miss is never visible",
            ],
            correctIndex: 2,
            explain:
              "Terminating TLS near the user moves the expensive round trips off the long path, and the connection from edge to origin is already established and tuned. Serving stale is a separate feature that has to be asked for.",
          },
          {
            prompt: "Which change most often produces the largest hit ratio improvement?",
            options: [
              "Normalising the key by stripping parameters that do not vary the response",
              "Raising the max-age on the assets that are already cached at the edge",
              "Adding more edge locations closer to the largest group of your users",
              "Enabling compression on the responses that are currently sent without it",
            ],
            correctIndex: 0,
            explain:
              "A tracking parameter on a shared link makes one popular page into thousands of unique entries, each hit once. Removing parameters that do not change the response collapses them back into one.",
          },
          {
            prompt: "What does running code at the edge make possible that a plain cache does not?",
            options: [
              "Serving a cached shell while personalising the response near the user",
              "Caching responses that vary by cookie without splitting the cache key",
              "Purging content from browser caches that already hold a stale copy",
              "Guaranteeing a cache hit for the first request from each location",
            ],
            correctIndex: 0,
            explain:
              "The reason personalised pages usually cannot be cached is that one piece varies. Running logic at the edge lets the invariant part be cached and the variable part filled in nearby, rather than sending everything to origin.",
          },
        ],
        diagram: {
          caption: "The edge shortens the round trips, cached or not",
          columns: [
            [{ id: "user", label: "User", sub: "Sydney", kind: "client" }],
            [{ id: "pop", label: "Edge node", sub: "10ms away", kind: "edge" }],
            [
              { id: "hit", label: "Cache hit", sub: "answered locally", kind: "data" },
              { id: "miss", label: "Cache miss", sub: "warm link to origin", kind: "data" },
            ],
            [{ id: "origin", label: "Origin", sub: "London, 250ms", kind: "service" }],
          ],
          edges: [
            { from: "user", to: "pop", label: "handshakes here" },
            { from: "pop", to: "hit", label: "most requests" },
            { from: "pop", to: "miss", label: "the rest" },
            { from: "miss", to: "origin", label: "one long trip, reused" },
          ],
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
            "Big-O drops constants, and constants are exactly what decides it at small n. Insertion sort's near-zero overhead wins despite the worse asymptotic class. Its behaviour on nearly-sorted input is real and is what Timsort exploits, but that is not why quicksort hands off to it, the handoff happens on partitions of arbitrary order.",
        },
      },
      {
        id: "hash-maps",
        title: "Hash maps and their worst case",
        level: "beginner",
        body: [
          "A hash map gives average constant-time lookup by turning a key into a bucket index, handling collisions by chaining or by open addressing.",
          "The average case assumes keys spread evenly. Let an attacker choose keys that all hash to one bucket and every lookup degrades to scanning a list, which turns your hash map into a denial-of-service vector. Languages now randomise the hash seed per process for exactly this reason.",
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
          "A B-tree stores many keys per node, matched to the size of a disk page. Fanout is high, depth is low, and a lookup in a large table takes a handful of reads instead of dozens.",
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
            "Disk reads dominate, so the goal is fewer levels. Packing many keys per node makes a lookup cost a handful of reads instead of one per level. Matching node size to the page is true and it is how fanout gets high in the first place, it is the mechanism, not the reason.",
        },
      },
      {
        id: "bloom-filters",
        title: "Bloom filters",
        level: "advanced",
        body: [
          "A Bloom filter answers one question cheaply: is this item definitely absent, or possibly present. False positives happen. False negatives cannot.",
          "That asymmetry is the whole point. Put one in front of an expensive lookup and everything definitely not there skips the lookup entirely, for a few bits per item, far less than storing the keys would cost.",
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
          "Atomicity: all of a transaction happens, or none of it. Consistency: it moves the database between valid states, meaning the constraints you declared still hold afterwards. Isolation: concurrent transactions do not see each other's partial work. Durability: once committed, it survives a crash.",
          "Three of those four are largely settled and you can rely on them without thinking. Isolation is where the detail lives, where the defaults differ between databases, and where the surprises are.",
          "Most databases default to read committed rather than serialisable, because full isolation is expensive: the database must behave as though transactions ran one after another, and enforcing that costs either locks that others wait on or aborts that the application must retry. The default is a performance decision made on your behalf, and it is usually right and occasionally the cause of a bug nobody can reproduce.",
          "What read committed permits is worth stating concretely. Two transactions read a balance of 100 into application memory, each subtracts 60, each writes 40, and the second write silently overwrites the first. Nothing errors. The same operation expressed as a single update statement is safe, because the row lock serialises it, so the bug lives entirely in the gap between reading and writing rather than in the database.",
          "Durability also has a dial that people rarely look at. A commit is durable once the write-ahead log is flushed to disk, and most databases let you relax that: Postgres has synchronous_commit, MySQL has its flush setting, and turning either down makes writes markedly faster while putting the last fraction of a second at risk in a hard crash. That is a legitimate choice for analytics ingestion and a poor one for orders.",
          "The useful habit is to state the level you are running at and the anomalies it permits, rather than saying you use a relational database and therefore have ACID. The letters are a promise about a configuration, and the configuration has a default that nobody chose.",
        ],
        why: "'We use a relational database so we get ACID' is only true at the isolation level you actually configured. Knowing your default is the difference between a guarantee and an assumption.",
        check: {
          prompt: "Two transactions SELECT a balance of 100 into application code, each compute 40, and each write it back. What prevents the lost update by default?",
          options: [
            "Row locks, which serialise the two writes so the second sees the first",
            "Atomicity, which is precisely the property the A in ACID is naming here",
            "The database detects the write-write conflict and aborts one transaction",
            "Nothing at read committed, you need a higher isolation level, or a lock",
          ],
          correctIndex: 3,
          explain: "Read committed permits this because the value was read into the application and written back later. Note that a single UPDATE ... SET balance = balance - 60 would be safe: row locks serialise it. The gap between reading and writing is what creates the bug.",
        },
        checks: [
          {
            prompt: "Why do most databases default to read committed rather than serialisable?",
            options: [
              "Serialisable is not implemented by every storage engine in common use",
              "Full isolation costs either waiting on locks or retrying aborted work",
              "Read committed is required for replication to remain consistent",
              "Serialisable would prevent read replicas from serving any queries",
            ],
            correctIndex: 1,
            explain:
              "Behaving as though transactions ran one at a time has to be paid for somewhere. The default trades a class of rare anomaly for throughput, which is usually right and is a decision made on your behalf.",
          },
          {
            prompt: "What does turning down synchronous commit actually trade away?",
            options: [
              "Atomicity, since a partially applied transaction may survive a crash",
              "Isolation, because other transactions can observe uncommitted rows",
              "Durability, risking the last fraction of a second of commits in a crash",
              "Consistency, because constraints are checked asynchronously afterwards",
            ],
            correctIndex: 2,
            explain:
              "The commit returns before the log reaches disk, so a hard failure loses recently acknowledged writes. Reasonable for analytics ingestion, poor for orders, and worth being an explicit decision either way.",
          },
          {
            prompt: "Which rewrite removes a lost update without changing the isolation level?",
            options: [
              "Reading the row a second time immediately before writing the new value",
              "Expressing the change as one update that computes from the stored value",
              "Wrapping the read and the write in an explicit transaction block",
              "Adding a unique index on the column being read and written back",
            ],
            correctIndex: 1,
            explain:
              "A single statement takes the row lock and computes from what is stored, so the two transactions serialise. Re-reading just before writing narrows the window without closing it, and a transaction alone does not prevent it at read committed.",
          },
        ],
      },
      {
        id: "indexes",
        title: "Indexes and their cost",
        level: "beginner",
        body: [
          "An index is a sorted structure, in nearly every case a B-tree, that turns a full table scan into a targeted lookup. On a large table that is the difference between reading a million pages and reading four, which is why the first index on a hot query is often a thousandfold improvement and the fifteenth is not.",
          "Every index must be maintained on write, so each one slows inserts, updates and deletes and occupies disk and memory. An unused index is pure cost with no benefit, and most mature databases can tell you which of theirs have never been scanned. Removing those is the rare optimisation that improves writes without risking reads.",
          "Composite indexes follow the prefix rule, which is the single most useful piece of indexing knowledge: an index on (a, b) serves a query on a, and on a and b together, and cannot seek on b alone. It is a phone book ordered by surname then first name. Choosing the column order is choosing which queries the index can answer, and the usual guidance is equality columns first, then the range or ordering column.",
          "A covering index is the next step: if the index contains every column the query needs, the database answers from the index without touching the table at all. On a read-heavy endpoint that removes half the work, and it is why adding one included column sometimes beats adding a cache.",
          "There are ways to disable an index by accident, and they are worth memorising because each looks harmless in review. Wrapping the column in a function, comparing it against a different type so the database has to cast, and starting a LIKE pattern with a wildcard all mean the index's ordering no longer matches the question being asked. Expression indexes exist for the first case, when the function is genuinely needed.",
          "Finally, indexes are not only B-trees. Hash indexes serve equality alone, GIN and inverted indexes serve containment and full text, and BRIN indexes are tiny and effective for columns that correlate with physical order, such as an append-only timestamp. Recognising when the default is the wrong shape is worth more than tuning the default.",
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
        checks: [
          {
            prompt: "A query filters on a column wrapped in lower(). The index on that column is unused. Why?",
            options: [
              "The index stores raw values, and the query asks about a computed one",
              "Functions force a sequential scan because their cost cannot be estimated",
              "Case-insensitive comparison requires a collation the index does not carry",
              "The planner disables indexes whenever a function appears in the predicate",
            ],
            correctIndex: 0,
            explain:
              "The index is ordered by the stored value, and the predicate is about lower(value), which is a different ordering. An index on the expression itself restores the seek.",
          },
          {
            prompt: "What does a covering index give you that an ordinary one does not?",
            options: [
              "The query is answered from the index without reading the table",
              "The index is kept entirely in memory rather than paged from disk",
              "Writes become cheaper, since fewer table pages have to be touched",
              "The planner can use it even when the leading column is not filtered",
            ],
            correctIndex: 0,
            explain:
              "If every column the query needs is in the index, there is no need to fetch the row itself. On a hot read path that removes half the work, which is sometimes a better answer than adding a cache.",
          },
          {
            prompt: "Which index is unused on a table with fifteen of them, and how would you know?",
            options: [
              "The largest one, since size correlates with how rarely it is chosen",
              "The newest one, because the planner prefers established statistics",
              "Whichever the database reports as never scanned in its own statistics",
              "The one on the column with the fewest distinct values in the table",
            ],
            correctIndex: 2,
            explain:
              "Databases track index usage, so this is a question with a measured answer rather than a guess. Dropping never-scanned indexes speeds up every write and risks nothing that was being read.",
          },
        ],
      },
      {
        id: "normalisation",
        title: "Normalisation and when to break it",
        level: "intermediate",
        body: [
          "Normalising means storing each fact exactly once, so an update touches one row and the data cannot contradict itself. The customer's address lives in the customer table and every order refers to it. That is the default, it is right most of the time, and it costs joins on read.",
          "Denormalising duplicates data to avoid those joins. Reads get faster and simpler, and every copy becomes a thing that can drift from the original. The trade is write complexity for read speed, and it is worth making when reads dominate and there is a reliable mechanism for keeping the copies current: a trigger, an outbox, a stream consumer, a scheduled rebuild.",
          "There is a category of duplication that is not denormalisation at all, and confusing the two causes real bugs. The price on an order line is not a cached copy of the product price; it is the price at the time of sale, and it must not change when the product is repriced. Any value that is part of a historical record belongs on that record permanently. Copying it is correct modelling rather than an optimisation.",
          "The usual mature shape is a normalised source of truth plus deliberately denormalised read models, updated asynchronously. That is the same idea as a materialised view, and where the database offers one, using it is preferable to hand-rolled duplication, because the refresh path is somebody else's tested code rather than yours.",
          "The classical normal forms are worth knowing at a level of one sentence each. First: no repeating groups, one value per column. Second: every non-key column depends on the whole key. Third: and on nothing but the key. Almost every practical schema stops there, and the higher forms exist mostly in exam papers.",
          "The one thing to avoid is denormalising early because joins feel expensive. A join on an indexed foreign key is one of the cheapest operations a relational database performs, and the intuition that it is slow usually comes from a missing index rather than from the join itself.",
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
        checks: [
          {
            prompt: "An order line stores the product price at the time of sale. Is that denormalisation?",
            options: [
              "Yes, and it needs a mechanism to keep it in step with the product",
              "No, it is a different fact: the price then, not the price now",
              "Yes, but it is acceptable because prices change infrequently",
              "No, because the value can be recomputed from the product history",
            ],
            correctIndex: 1,
            explain:
              "It must not change when the product is repriced, so it is not a copy of anything. Historical records own their values, and treating that as duplication leads to invoices that rewrite themselves.",
          },
          {
            prompt: "Why is denormalising because joins feel slow usually a mistake?",
            options: [
              "Joins are cheap on an indexed foreign key, so the intuition is wrong",
              "The planner can rewrite a join into a lookup when statistics are fresh",
              "Duplicated columns are excluded from indexes in most engines",
              "The cost of a join grows only with the number of tables, not rows",
            ],
            correctIndex: 0,
            explain:
              "A join on an indexed key is among the cheapest things a relational database does. The feeling that joins are slow almost always traces back to a missing index rather than to the join.",
          },
          {
            prompt: "What does third normal form require, in one sentence?",
            options: [
              "Every column holds one value, with no repeating groups in a row",
              "Every non-key column depends on the whole key and on nothing else",
              "Every table has a surrogate key rather than a natural composite one",
              "Every foreign key is indexed and declared with a referential action",
            ],
            correctIndex: 1,
            explain:
              "The key, the whole key, and nothing but the key. Almost every practical schema stops at third normal form, and the higher forms rarely earn their complexity.",
          },
        ],
      },
      {
        id: "sql-vs-nosql",
        title: "Relational or document",
        level: "intermediate",
        body: [
          "Relational databases are the default for reasons that are easy to undervalue until they are gone: you can query the data in ways nobody anticipated, the database enforces constraints rather than trusting every writer, and a transaction can span several rows in several tables. Choose otherwise with a reason you can state in a sentence.",
          "Document stores suit data that is read as a whole unit and whose shape varies per record: a product with wildly different attributes per category, an event payload, a document that genuinely is a document. The gain is that the record matches the object, and the loss is that a question the schema did not anticipate becomes a scan or a second copy of the data.",
          "Key-value stores serve lookups by one known key at very high volume, and nothing else. Wide-column stores such as Cassandra sit near them and are designed around the query: you model the tables from the access patterns, accept duplication as normal, and get linear write scaling and no ad hoc querying at all.",
          "The honest summary is that most applications fit a relational model, and a managed Postgres will carry far more load than most products ever see. It also handles JSON well, with indexing on document fields, which covers the semi-structured part of a schema without a second database and a second operational burden.",
          "Schemaless is the claim that deserves the most scepticism, because there is always a schema: it either lives in the database, where it is enforced once, or in every piece of code that reads the data, where each has its own slightly different idea of what a record looks like. The second option is not the absence of a schema, it is a schema nobody can query and nobody maintains.",
          "The strongest argument for a second store is a genuinely different access pattern rather than a performance claim: full text search, time series at high ingest rates, a graph traversal that would be a self-join twelve levels deep. Those are real, and they are much rarer than the number of polyglot architectures in the wild suggests.",
        ],
        why: "'It scales better' is not a reason on its own, a managed Postgres handles more load than most products ever see. The reasons that hold up are access pattern and data shape.",
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
        checks: [
          {
            prompt: "What is wrong with describing a document store as schemaless?",
            options: [
              "Documents still validate against a schema, it is simply implicit",
              "The schema moves into every reader, where nobody can query or enforce it",
              "Schemas are required for indexing, so one is generated automatically",
              "The term refers to migrations, which document stores still require",
            ],
            correctIndex: 1,
            explain:
              "The structure does not disappear; it stops being enforced in one place and starts being assumed in many. That is a schema nobody maintains rather than no schema.",
          },
          {
            prompt: "Which is the strongest reason to add a second datastore alongside Postgres?",
            options: [
              "Write throughput has reached the limits of a single primary instance",
              "The team prefers a document model for new services being written",
              "An access pattern Postgres serves badly, such as high-rate time series",
              "Schema migrations have become slow enough to delay every release",
            ],
            correctIndex: 2,
            explain:
              "A genuinely different access pattern is a reason; a preference or a performance claim usually is not. Every additional store is another thing to back up, monitor, upgrade and reason about during an incident.",
          },
          {
            prompt: "What does a wide-column store such as Cassandra ask you to do differently?",
            options: [
              "Model tables from the queries first, and accept duplication as normal",
              "Normalise more aggressively, since joins are performed on the client",
              "Define the schema up front, because columns cannot be added later",
              "Keep all related data in one partition to preserve transactionality",
            ],
            correctIndex: 0,
            explain:
              "The design starts from the access pattern rather than from the entities, and the same data is written into several tables shaped for different queries. Ad hoc querying is what you give up in exchange for linear write scaling.",
          },
        ],
      },
      {
        id: "connection-pooling",
        title: "Connection pooling",
        level: "advanced",
        body: [
          "Each database connection costs memory and, in Postgres, an entire backend process. It struggles well before most people expect, often in the low hundreds.",
          "Serverless makes this worse. Every instance opens its own connections, and instances scale with traffic, so connections multiply exactly when load is highest.",
          "A pooler sits in front and multiplexes many client connections onto a small number of real ones.",
          "Which pooling mode you pick decides how much that buys you. Session pooling holds a real connection for the client's whole session and helps very little. Transaction pooling hands it back at every commit and helps enormously, at the price of losing anything that outlives a transaction: prepared statements, session variables, advisory locks.",
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
        checks: [
          {
            prompt: "What does transaction pooling give up compared with session pooling?",
            options: [
              "Anything living beyond a transaction: prepared statements, session state",
              "Transactional guarantees, since a commit may land on another connection",
              "Read consistency, because successive queries can reach different replicas",
              "Connection reuse, since each transaction opens a connection of its own",
            ],
            correctIndex: 0,
            explain:
              "The real connection is returned at every commit, so nothing that outlives a transaction survives. That is what makes it effective, and it is why session variables and advisory locks stop working.",
          },
          {
            prompt: "Why does serverless make connection exhaustion worse?",
            options: [
              "Cold starts hold a connection open while the runtime initialises",
              "Instances scale with traffic, and each opens its own connections",
              "Serverless runtimes cannot reuse a connection between invocations",
              "Managed databases reserve slots per region rather than per client",
            ],
            correctIndex: 1,
            explain:
              "Connection count follows instance count, and instance count follows load, so the demand for slots peaks exactly when the database is busiest. A pooler decouples the two.",
          },
          {
            prompt: "Why does adding read replicas not fix connection exhaustion on the primary?",
            options: [
              "Replicas share the primary's connection limit through replication slots",
              "Writes still go to the primary, and those connections are unchanged",
              "Replicas require their own poolers, which consume primary slots",
              "The application cannot route reads without a proxy in front of both",
            ],
            correctIndex: 1,
            explain:
              "Replicas add read capacity, and the exhaustion is slots on the primary held by every instance that might write. It is a different resource from the one replicas add.",
          },
        ],
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
          "Processes have separate memory and are isolated: one crashing does not take the others with it, and communication between them costs a copy through the kernel. Threads share memory within a process, which makes communication free and data races possible in the same breath. Async runs many tasks on one thread, switching whenever a task waits, which makes concurrency cheap and parallelism impossible.",
          "The distinction that matters is concurrency versus parallelism. Concurrency is dealing with many things at once, which is a structure. Parallelism is doing many things at once, which needs cores. Async gives you the first and none of the second, and most of the confusion in this area comes from a system that needed the second being given the first.",
          "Async suits IO-bound work, where tasks spend most of their time waiting on a network or a disk. A web handler that spends 95% of its time waiting on a database can serve hundreds of concurrent requests from one thread, because at any moment nearly all of them are parked. That is not a trick, it is the correct shape for work that is mostly waiting.",
          "It does nothing for CPU-bound work, because there is no waiting to exploit. A CPU-heavy function in Node or in Python's asyncio blocks the event loop until it returns, and every other request on that loop waits, including the health check. This is why an image resize or a large JSON parse dropped into an async handler produces a service that is fast until someone uploads a large photograph.",
          "The costs of threads are worth naming, because the usual advice to just use threads has a bill. Each one carries a stack, typically measured in megabytes of reserved address space, so tens of thousands of threads is not a plan. Every context switch costs the kernel a few microseconds and evicts cache lines that were warm. And shared memory means locks, which means contention and the possibility of deadlock. Async avoids all three by making the switching explicit and cooperative, at the cost of one badly behaved task ruining everything.",
          "In practice the answer is usually all three in layers: processes for isolation and for using every core, a small pool of threads inside each for CPU-bound work, and async for the IO-bound majority. The question is never which model is best, it is what this particular work waits on, and there is usually more than one answer in one service.",
        ],
        why: "Choosing async for CPU-bound work is a common and expensive mistake. The question is what the work waits on, not which model is modern.",
        inPractice:
          "Node and Python's asyncio both run application code on one loop, which is why both ship worker threads or process pools for the CPU-bound cases. Nginx made the same argument years earlier against a thread per connection, and won it.",
        diagram: {
          caption: "One loop for waiting, a pool for computing",
          columns: [
            [{ id: "reqs", label: "Requests", sub: "mostly IO-bound", kind: "client" }],
            [{ id: "loop", label: "Event loop", sub: "one thread", kind: "service" }],
            [
              { id: "io", label: "Awaiting IO", sub: "hundreds parked", kind: "data" },
              { id: "cpu", label: "CPU-bound work", sub: "blocks the loop", kind: "data", alternative: true },
            ],
            [{ id: "pool", label: "Worker pool", sub: "threads or processes", kind: "service" }],
          ],
          edges: [
            { from: "reqs", to: "loop", label: "accepted" },
            { from: "loop", to: "io", label: "yields while waiting" },
            { from: "loop", to: "cpu", label: "never yields" },
            { from: "cpu", to: "pool", label: "move it here", async: true },
          ],
        },
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
        checks: [
          {
            prompt: "What is the difference between concurrency and parallelism?",
            options: [
              "Concurrency is a structure for interleaving work; parallelism needs cores",
              "Concurrency applies to threads, and parallelism applies to processes",
              "Concurrency is cooperative scheduling; parallelism is preemptive scheduling",
              "Concurrency requires shared memory; parallelism requires message passing",
            ],
            correctIndex: 0,
            explain:
              "A single core can be concurrent and cannot be parallel. Async gives you interleaving, which is enough when the work is mostly waiting and useless when the work is computing.",
          },
          {
            prompt: "Why is a thread per connection a poor design at tens of thousands of connections?",
            options: [
              "Threads cannot wait on sockets without consuming CPU while blocked",
              "Each thread reserves stack space, and switching between them costs time",
              "The kernel refuses to schedule more than a few thousand threads at once",
              "Shared memory between many threads makes cache invalidation impossible",
            ],
            correctIndex: 1,
            explain:
              "Stacks are reserved per thread and context switches cost the kernel time and cache warmth. That is the pressure that produced event loops, not any inability of threads to wait.",
          },
          {
            prompt: "Where does CPU-bound work belong in an async service?",
            options: [
              "In the handler, wrapped so it yields to the loop between iterations",
              "In a worker thread pool or a separate process, off the event loop",
              "In a queue consumed by the same process during idle periods",
              "In the handler, with a longer timeout to absorb the extra latency",
            ],
            correctIndex: 1,
            explain:
              "Nothing that computes can share a loop with work that waits, because it never yields. Moving it to a thread pool or another process is the only fix that keeps the loop responsive.",
          },
        ],
      },
      {
        id: "race-conditions",
        title: "Race conditions and locks",
        level: "intermediate",
        body: [
          "A race condition is a correctness bug that depends on timing, which is why it passes every test on a laptop and appears in production at a rate proportional to traffic. Read-modify-write is the classic shape: two requests read the same value, both compute from it, and one result is silently lost. Nothing errors, nothing logs, and the total is simply wrong.",
          "Locks prevent it by serialising access, and they are the first instinct because they are the most obvious. The costs are contention, since everyone waits their turn on the hot row, and deadlock, when two paths take the same two locks in opposite orders and each waits for the other forever. Deadlock is preventable by always acquiring locks in a fixed global order, which is a rule that has to be written down somewhere because it cannot be enforced by the type system.",
          "The better fix is usually to remove the gap rather than guard it. An atomic increment does the read and the write as one operation the database cannot interleave. A conditional update, set stock to 0 where stock is currently 1, fails cleanly when someone else got there first, and the caller retries or reports a conflict. Both turn a timing bug into a visible outcome.",
          "That conditional update is optimistic concurrency control, and the general form is a version column: read the row and its version, write with a condition that the version is unchanged, and bump it. Zero locks are held between the read and the write, which is the point, because the user's thinking time is not something to hold a lock across. It is the right default when conflicts are rare, and the wrong one when they are common, because every conflict costs a wasted round trip.",
          "Pessimistic locking is the other half of that pair: take the lock first, hold it for the duration, and make everyone else wait. SELECT FOR UPDATE is the usual form. It is right when conflicts are frequent enough that retrying is more expensive than queueing, and it needs a timeout, because a lock held by a process that died is a lock held forever unless something reclaims it.",
          "Distributed locks deserve suspicion. Once the lock lives in another system, a process can be paused by garbage collection, lose its lease, and resume believing it still holds it, while another process holds it for real. Fencing tokens are the standard mitigation: the lock hands out an increasing number, the resource rejects any write carrying a number lower than the highest it has seen, and the zombie's late write is refused. If you can restructure the problem to avoid needing the lock, that is almost always cheaper than getting this right.",
        ],
        why: "Reaching for a lock is the first instinct and rarely the best one. Making the operation atomic removes the race instead of guarding it, with no contention and no deadlock.",
        inPractice:
          "Every relational database ships the tools for this: a conditional update, a unique constraint, SELECT FOR UPDATE and a version column. The bugs almost always come from doing the check in application code between two statements, where the database cannot help.",
        diagram: {
          caption: "The gap between read and write is the whole bug",
          columns: [
            [
              { id: "r1", label: "Request A", sub: "reads stock = 1", kind: "client" },
              { id: "r2", label: "Request B", sub: "reads stock = 1", kind: "client" },
            ],
            [
              { id: "gap", label: "Read then write", sub: "two statements", kind: "service", alternative: true },
              { id: "cond", label: "Conditional update", sub: "one statement", kind: "service" },
            ],
            [
              { id: "bad", label: "Both sell", sub: "stock = 0, two orders", kind: "data", alternative: true },
              { id: "good", label: "One wins", sub: "the other sees a conflict", kind: "data" },
            ],
          ],
          edges: [
            { from: "r1", to: "gap", label: "checks, then writes" },
            { from: "r2", to: "gap", label: "checks, then writes" },
            { from: "gap", to: "bad", label: "interleaved" },
            { from: "r1", to: "cond", label: "where stock = 1" },
            { from: "cond", to: "good", label: "the second matches nothing" },
          ],
        },
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
        checks: [
          {
            prompt: "When is optimistic concurrency the wrong choice?",
            options: [
              "When the same rows are contended often, so conflicts are the common case",
              "When the transaction spans several tables rather than a single row",
              "When the client cannot be trusted to send back the version it read",
              "When reads vastly outnumber writes on the rows being protected",
            ],
            correctIndex: 0,
            explain:
              "Optimistic control is cheap when it usually succeeds. Under heavy contention most attempts fail and retry, so you pay for the work twice and add latency, which is exactly when taking the lock up front wins.",
          },
          {
            prompt: "What problem do fencing tokens solve in distributed locking?",
            options: [
              "They stop two clients acquiring the same lock at the same instant",
              "They let a lock be released safely by a process other than the holder",
              "They let the resource reject a write from a holder whose lease expired",
              "They order lock acquisition globally, which prevents deadlock entirely",
            ],
            correctIndex: 2,
            explain:
              "A paused process can resume believing it still holds a lock that has since expired. An increasing token checked by the resource means its late write is refused, which is protection the lock service alone cannot provide.",
          },
          {
            prompt: "Two code paths deadlock when they update the same pair of rows. What is the standard fix?",
            options: [
              "Shorten the transactions, so the window in which both are held is smaller",
              "Acquire the locks in the same order everywhere, by a rule written down",
              "Set a lock timeout, so one transaction aborts and releases the other",
              "Move one of the updates outside the transaction so only one lock is held",
            ],
            correctIndex: 1,
            explain:
              "Deadlock needs a cycle, and a consistent global acquisition order makes a cycle impossible. Timeouts turn a hang into an error, which is better than hanging and is not a fix.",
          },
        ],
      },
      {
        id: "idempotency",
        title: "Idempotency",
        level: "intermediate",
        body: [
          "An idempotent operation can run repeatedly with the same result as running once. This matters because networks make retries unavoidable, and a timeout tells you nothing at all about whether the work happened: the request may never have arrived, or it may have completed and the response been lost on the way back.",
          "The standard approach is an idempotency key supplied by the client, unique per logical operation rather than per attempt. The server records the key alongside its result, and returns the stored result if the key comes back. Without it, a retried payment is simply a second payment.",
          "The subtlety is what you store and when. Recording the key before doing the work means a crash mid-operation leaves a key with no result and the retry is refused forever. Recording it after means two concurrent retries both pass the check. The usual answer is to insert the key immediately with a pending state, under a unique constraint so the second attempt collides, then update it with the result. A pending key older than a few minutes is stale and can be reclaimed.",
          "Not everything needs a key. GET, PUT and DELETE are idempotent by their own semantics, and an update that sets an absolute value is naturally safe to repeat where one that increments is not. The key is for the operations that are neither, which in practice means anything that creates something or moves money.",
        ],
        why:
          "The interesting half is the concurrency, not the concept. Storing a key is easy; deciding what happens when two retries arrive at once, or when the first attempt died between charging the card and writing the result, is where the design actually lives.",
        inPractice: "Stripe requires an idempotency key on payment creation for exactly this reason.",
        diagram: {
          "caption": "The key is what lets the server tell a retry from a new request",
          "columns": [
            [
              {
                "id": "cl",
                "label": "Client",
                "sub": "sends a key",
                "kind": "client"
              }
            ],
            [
              {
                "id": "api",
                "label": "API",
                "sub": "looks the key up",
                "kind": "service"
              }
            ],
            [
              {
                "id": "store",
                "label": "Key store",
                "sub": "key to result",
                "kind": "data"
              },
              {
                "id": "pay",
                "label": "Payment provider",
                "kind": "external"
              }
            ]
          ],
          "edges": [
            {
              "from": "cl",
              "to": "api",
              "label": "POST + key"
            },
            {
              "from": "api",
              "to": "store",
              "label": "seen before?"
            },
            {
              "from": "store",
              "to": "api",
              "label": "yes: stored result"
            },
            {
              "from": "api",
              "to": "pay",
              "label": "no: charge once"
            }
          ]
        },
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
            "A timeout is ambiguous by nature; the key lets the server tell a retry from a new request. PUT being idempotent is a statement about what the method promises, not about what your handler does, naming it PUT and charging the card twice breaks the promise instead of keeping it.",
        },
        checks: [
          {
            prompt: "Why insert the idempotency key with a pending state before doing the work?",
            options: [
              "So a concurrent retry collides on the unique constraint rather than passing",
              "So the client can poll the key to discover how far the work has got",
              "So the key can be reclaimed automatically once the work has completed",
              "So the work and the key are written in a single database statement",
            ],
            correctIndex: 0,
            explain:
              "Writing the key afterwards lets two retries both pass the check and both do the work. Inserting first under a unique constraint means the second one collides, and the pending row is what the first attempt later fills in.",
          },
          {
            prompt: "An idempotency key is generated fresh on every retry attempt. What breaks?",
            options: [
              "Nothing, provided the server stores the result against each key it sees",
              "The server sees each attempt as new work and performs it every time",
              "The unique constraint rejects the second attempt as a duplicate key",
              "The stored results accumulate, so the key table grows without bound",
            ],
            correctIndex: 1,
            explain:
              "The key identifies the logical operation, not the attempt. Regenerating it per attempt makes every retry a distinct request, which is precisely the situation the key exists to prevent.",
          },
          {
            prompt: "Which operation needs no idempotency key of its own?",
            options: [
              "Creating a refund against a payment that has already settled",
              "Appending an entry to an audit log for a user action",
              "Setting a user's email address to a specific new value",
              "Incrementing a counter of failed sign-in attempts by one",
            ],
            correctIndex: 2,
            explain:
              "Setting an absolute value is naturally idempotent: doing it twice leaves the same state. Creating something, appending, and incrementing all change the result when repeated, so each needs a key.",
          },
        ],
      },
      {
        id: "backpressure",
        title: "Backpressure",
        level: "advanced",
        body: [
          "When a system accepts work faster than it can finish it, the backlog grows, and there is no version of that story with a happy ending. Queues fill, memory climbs, latency climbs, and the failure arrives at the worst possible moment, which is later and larger than the failure you would have had if you had simply said no at the start.",
          "Backpressure is the mechanism for saying no: refusing or slowing intake when what is downstream cannot keep up. Bounded queues, load shedding, rejecting early with a 503 and a Retry-After. It feels like worse behaviour and it is better behaviour, because a rejection is a signal the caller can act on while a growing backlog is information nobody has.",
          "TCP is the reference implementation and it is worth studying because everyone already depends on it. The receiver advertises a window, the amount it is prepared to accept; when the application stops reading, the window shrinks to zero and the sender stops sending. No messages are lost, no buffer grows without bound, and the pressure propagates back to the source through nothing more than an advertised number. Every good backpressure design is a version of that.",
          "In an application it usually means bounding the things that are unbounded by default. A queue with a maximum depth that rejects rather than growing. A connection pool with a fixed size and a short wait, so a slow database produces immediate errors rather than a thousand threads waiting on a pool. A concurrency limit per dependency. Each of these converts an invisible accumulation into an error with a name.",
          "The subtle failure is backpressure that stops at a boundary. A service that rejects work correctly, in front of a queue that accepts everything, has moved the unbounded buffer one step upstream and made it someone else's surprise. The property you want holds end to end: if the slowest component in a chain can only manage 100 a second, the intake at the front should be admitting roughly 100 a second, not 10,000 into a buffer.",
          "Where it cannot propagate, drop deliberately and say so. For a live telemetry stream or a metrics pipeline, the right answer under overload is to shed the excess and record how much was shed, because stale telemetry has no value and a growing buffer of it has negative value. That decision belongs in the design with a number attached, rather than emerging at 3am as an out-of-memory kill.",
        ],
        why: "Unbounded queues look like resilience and are the opposite: they convert a visible, recoverable rejection into a hidden backlog that fails later and harder.",
        inPractice:
          "TCP has propagated backpressure through an advertised receive window since the 1980s, which is why a slow reader never causes a sender to exhaust memory. Reactive Streams exists to give application code the same property, and the specification is mostly about who is allowed to send how much.",
        diagram: {
          caption: "The limit belongs at the intake, not at the buffer",
          columns: [
            [{ id: "in", label: "Arrivals", sub: "10,000 a second", kind: "client" }],
            [
              { id: "admit", label: "Admission limit", sub: "503 with Retry-After", kind: "edge" },
              { id: "unb", label: "Unbounded queue", sub: "accepts everything", kind: "queue", alternative: true },
            ],
            [{ id: "work", label: "Workers", sub: "100 a second", kind: "service" }],
            [{ id: "oom", label: "Out of memory", sub: "later and larger", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "in", to: "admit", label: "admits 100" },
            { from: "admit", to: "work", label: "matched rate" },
            { from: "in", to: "unb", label: "accepts 10,000" },
            { from: "unb", to: "oom", label: "grows without bound", async: true },
          ],
        },
        check: {
          prompt: "Under heavy load, a service with an unbounded in-memory queue eventually crashes. Why is a bounded queue better?",
          options: [
            "It rejects work early and visibly, instead of failing catastrophically later",
            "It bounds memory, so the process stays inside its container's limit",
            "It keeps latency predictable, since the queue cannot grow past its bound",
            "A fixed-size buffer can be preallocated, avoiding allocation under load",
          ],
          correctIndex: 0,
          explain:
            "The bound turns silent accumulation into a signal callers can act on, while the system stays up. Bounding memory and stabilising latency are both real consequences, but they follow from the rejection; a queue that filled and then quietly dropped work would achieve them too, and would be worse than the crash.",
        },
        checks: [
          {
            prompt: "How does TCP apply backpressure to a sender?",
            options: [
              "It drops packets once the receive buffer is full, forcing a retransmit",
              "The receiver advertises a window, and it shrinks to zero when unread",
              "It reduces the congestion window whenever an acknowledgement is late",
              "It sends an explicit pause frame that suspends the connection briefly",
            ],
            correctIndex: 1,
            explain:
              "The receive window is an advertised number saying how much more the receiver will accept. When the application stops reading it reaches zero and the sender stops, with nothing lost and no buffer growing.",
          },
          {
            prompt: "A service rejects excess work correctly, but sits behind an unbounded queue. What has been achieved?",
            options: [
              "The backlog has moved upstream and is now somebody else's surprise",
              "Nothing changes, since the queue absorbs the rejections transparently",
              "Latency improves, because the queue smooths the rejection rate",
              "The system is protected, since the queue is not the constrained resource",
            ],
            correctIndex: 0,
            explain:
              "Backpressure is only useful if it propagates to the source. A bounded consumer in front of an unbounded buffer has relocated the problem, and the buffer will fail later and less visibly.",
          },
          {
            prompt: "When is dropping data the correct response to overload?",
            options: [
              "When the data can be regenerated later from a durable source",
              "When the data is telemetry whose value expires almost immediately",
              "When the buffer holding it has exceeded its configured memory limit",
              "When the consumer has been unavailable for longer than the retention",
            ],
            correctIndex: 1,
            explain:
              "Stale telemetry has no value and buffering it has negative value. The important part is that the drop is a design decision with a recorded count, rather than an out-of-memory kill discovered afterwards.",
          },
        ],
      },
    ],
  },
];
