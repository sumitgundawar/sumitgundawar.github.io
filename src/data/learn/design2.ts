import type { Card } from "./types";

/* Second half of the system design track: APIs, real-time, search, storage,
   identity, coordination, and the data plane. */

export const design2: Card[] = [
  {
    id: "api-design",
    title: "API design",
    summary: "REST, GraphQL, gRPC, webhooks and versioning, and which problem each one actually solves.",
    track: "design",
    topics: [
      {
        id: "rest",
        title: "REST and resource modelling",
        level: "beginner",
        body: [
          "REST models a system as resources addressed by URL, with HTTP methods describing the action and status codes describing the outcome. The name comes from Roy Fielding's 2000 dissertation, which describes an architectural style with six constraints. Almost nothing called RESTful today satisfies all six, and that is fine: the constraint that pays for itself in practice is the uniform interface, the agreement that GET means read, that 404 means the thing is not there, and that these mean the same on your API as on everyone else's.",
          "The reason to care is that a large amount of infrastructure acts on those meanings without ever reading your code. RFC 9110, the current HTTP semantics specification, divides methods into safe ones that do not change state (GET, HEAD, OPTIONS, TRACE) and idempotent ones that can be repeated without additional effect (those four plus PUT and DELETE). POST is neither. A CDN will cache a GET response at the edge. A proxy, a load balancer or a client library will retry an idempotent request after a dropped connection. Neither will do anything of the sort for a POST, because you have told the network that repeating it might charge a card twice.",
          "Status codes are the other half of that contract, and the common failure is returning 200 with an error inside the body. Every layer above you now believes the call succeeded: the load balancer keeps the backend in rotation, the retry policy never fires, the dashboard shows a healthy service, and the only place the failure exists is in a field that nothing except your own client parses. A 5xx is not an admission of guilt, it is how you tell the rest of the system what happened.",
          "Resource modelling is where people get stuck, usually on actions that are not obviously nouns. Publishing an article, refunding a payment, resending an invite. The trick that works most of the time is to notice that the action produces a thing, and to make that thing the resource: POST /payments/123/refunds creates a refund, which has its own id, its own status and its own history, all of which you wanted anyway the first time someone asked why a refund failed. Where that genuinely does not fit, a verb endpoint is better than a contorted noun. Consistency is worth more than purity.",
          "Getting the method wrong has a measurable price. A search implemented as POST /search cannot be cached by a CDN or the browser, cannot be bookmarked or shared, will not be retried by anything in the path, and in a browser it triggers a CORS preflight because a JSON content type is not on the short list of simple requests, which adds a full round trip before the real request leaves. The honest reason to use POST for search is a query too large for a URL, where roughly 2,000 characters is the safe practical ceiling across proxies and servers. That is a real constraint, and it deserves a comment in the code saying so.",
          "Pagination deserves the same care, because it is the endpoint most likely to be hit by a script. Offset pagination, page=47, gets slower the deeper it goes, since the database still has to walk the rows it is about to discard, and it produces duplicates and gaps when rows are inserted mid-scan. Cursor pagination hands back an opaque marker for the last row seen and asks for what follows it, which is stable under writes and stays flat as the offset grows. Almost every large API has migrated in that direction, and the ones that have not are the ones with a slow page 500.",
        ],
        why: "Standard verbs and codes are not pedantry, they are leverage: they are how you get caching, retries, health checking and client library behaviour without writing or operating any of it. Every deviation is a piece of infrastructure you now have to replace with your own code, and the bill arrives later than the decision.",
        inPractice:
          "Stripe's API is the usual reference for the boring conventions done properly: correct methods, correct status codes, and an idempotency key accepted on every mutating call so a retry after a timeout cannot charge twice. GitHub's REST API leans on conditional requests, and a request that returns 304 Not Modified does not count against your rate limit, which turns polite polling into something the platform actively rewards.",
        diagram: {
          caption: "What the network does for free when the method is correct",
          columns: [
            [{ id: "client", label: "Client", sub: "browser or service", kind: "client" }],
            [{ id: "cdn", label: "CDN", sub: "caches GET only", kind: "edge" }],
            [{ id: "lb", label: "Load balancer", sub: "retries idempotent", kind: "edge" }],
            [{ id: "api", label: "API", sub: "your code", kind: "service" }],
            [{ id: "db", label: "Database", sub: "the expensive part", kind: "data" }],
          ],
          edges: [
            { from: "client", to: "cdn", label: "GET /articles/9" },
            { from: "cdn", to: "lb", label: "on miss only" },
            { from: "lb", to: "api", label: "retry on 502" },
            { from: "api", to: "db", label: "read" },
            { from: "client", to: "lb", label: "POST bypasses cache" },
          ],
        },
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
            "Methods carry meaning to infrastructure that never reads your code. A GET can be cached at the edge and retried by anything in the path; a POST is assumed to change state and gets neither. The preflight and the lost retry are real costs too, and they all have the same cause, which is that you told the network this was a write.",
        },
        checks: [
          {
            prompt: "An API returns 200 with an error object in the body when a call fails. What breaks?",
            options: [
              "Clients written against the schema will fail to parse the error object",
              "Every layer above the service believes the call succeeded and acts on it",
              "The error object cannot carry a machine readable code for the client",
              "Responses become uncacheable, so the edge stops serving repeat reads",
            ],
            correctIndex: 1,
            explain:
              "Load balancers keep the backend in rotation, retry policies never fire, dashboards stay green, and the failure exists only in a field that nothing but your own client reads. The status code is the channel the rest of the system is listening on.",
          },
          {
            prompt: "Why does cursor pagination beat page numbers on a large, actively written table?",
            options: [
              "Cursors let a client jump directly to any position in the result set",
              "Cursors compress better, so the response payload is smaller per page",
              "Offsets make the database walk and discard every row before the page",
              "Offsets require a sort, and cursors let the database skip sorting",
            ],
            correctIndex: 2,
            explain:
              "Deep offsets get slower the further you go, because the rows before the page still have to be produced and thrown away, and concurrent inserts shift the window so readers see duplicates and gaps. A cursor says continue after this row, which is stable and stays flat.",
          },
          {
            prompt: "Which change makes an endpoint safe for a proxy to retry automatically?",
            options: [
              "Returning 202 Accepted rather than 201 Created on success",
              "Moving the request payload from the body into query parameters",
              "Documenting the retry policy clearly in the API reference",
              "Making it idempotent, so a repeat has the same effect as one call",
            ],
            correctIndex: 3,
            explain:
              "Retries are decided by the method's semantics, not by documentation. PUT and DELETE are idempotent by definition; a POST becomes safe to repeat only when you add an idempotency key and honour it server side.",
          },
        ],
      },
      {
        id: "graphql",
        title: "GraphQL and its costs",
        level: "intermediate",
        body: [
          "GraphQL began at Facebook in 2012, driven by a specific problem: the mobile news feed needed a different shape of data from the web one, over a slower network, and every screen change meant either a new bespoke endpoint or several round trips. The specification was published in 2015 and moved to the GraphQL Foundation in 2018. The idea is that the client sends a query describing exactly the fields it wants, and gets back a response with that shape and nothing else.",
          "The wins are real and they are mostly about clients. Over-fetching disappears, because nobody is shipping thirty fields to a screen that renders four. Round trips collapse, because a screen that was five REST calls with dependencies between them becomes one request. The schema is typed and introspectable, so tooling, autocomplete and generated client types come for free, and a breaking change is visible before it ships rather than after a client crashes.",
          "The first thing you give up is HTTP caching, and it is a bigger loss than it sounds. Every query is a POST to a single endpoint, so the CDN, the browser cache and every proxy in between have nothing to work with, and a system that was serving most reads from an edge cache is suddenly serving all of them from origin. The standard recovery is persisted queries: register the query text once, send a hash of it, and let the request be a GET again so the edge can cache on the hash. It works, and it is one more piece of machinery you now operate.",
          "The second thing you give up is control over cost, because the client now writes the query. A nested selection can fan out into thousands of database reads without anything in the request looking unusual. The defences are depth limiting, complexity analysis and pricing. GitHub's GraphQL API does the last of these openly: a query is scored before it runs, a call cannot request more than 500,000 nodes, and each token has a budget of 5,000 points an hour rather than a count of requests. That is the right shape of answer, because the honest unit of work is not one request.",
          "The third is N+1, which is structural rather than accidental. Resolvers run per field, so a list of fifty authors resolves the author field fifty times, each with its own database call. DataLoader style batching collects the calls made within a single tick and issues one query for the fifty keys. It is standard equipment, it works, and it has to be applied deliberately at every level that can fan out. Nobody notices the missing one in development, because the list has three items.",
          "Finally, errors arrive with a 200 and an errors array beside partial data, which is deliberate: half a screen is better than none. It also means every dashboard, alert and load balancer health check that reads the status code sees a healthy service while a resolver is failing on a third of requests. Your monitoring has to parse the body, and this is the single most common reason a GraphQL outage is discovered by a customer rather than by a graph.",
        ],
        why: "GraphQL earns its keep when several clients need different shapes of the same data and you would otherwise be shipping a bespoke endpoint per screen. For a single first-party client it is usually complexity without payoff: you have given up edge caching and taken on query costing to solve a problem you did not have.",
        inPractice:
          "GitHub prices queries rather than counting them: a computed cost per call against a 5,000 point hourly budget, with a hard ceiling of 500,000 nodes per query. Netflix runs a federated graph in front of many backing services, which is the other case where it pays, one graph over teams that each own their slice, rather than one client asking for fewer fields.",
        diagram: {
          caption: "One request, and everything you now own behind it",
          columns: [
            [{ id: "app", label: "Client", sub: "writes the query", kind: "client" }],
            [{ id: "gate", label: "Cost analysis", sub: "depth and points", kind: "edge" }],
            [{ id: "exec", label: "Executor", sub: "resolves per field", kind: "service" }],
            [{ id: "loader", label: "DataLoader", sub: "batches per tick", kind: "service" }],
            [
              { id: "svc1", label: "Users service", sub: "one query for 50 ids", kind: "data" },
              { id: "svc2", label: "Posts service", sub: "one query for 50 ids", kind: "data" },
            ],
          ],
          edges: [
            { from: "app", to: "gate", label: "POST /graphql" },
            { from: "gate", to: "exec", label: "under budget" },
            { from: "exec", to: "loader", label: "50 field resolves" },
            { from: "loader", to: "svc1", label: "1 batched call" },
            { from: "loader", to: "svc2", label: "1 batched call" },
          ],
        },
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
            "Query flexibility is the feature and the bill: you take on depth limits, cost analysis and your own caching. N+1 is real but it is a solved problem, and batching is standard equipment. Arbitrary query cost is the part that never fully goes away, because the client decides it.",
        },
        checks: [
          {
            prompt: "Why do persisted queries matter for a public GraphQL API at scale?",
            options: [
              "They let the request be a GET on a hash, so the edge can cache it",
              "They remove the need for depth limiting, since the query is fixed",
              "They compress the query text, cutting request size on mobile networks",
              "They let the server reject any query it has not seen before this week",
            ],
            correctIndex: 0,
            explain:
              "Sending a hash instead of query text turns the call back into a cacheable GET, which recovers the CDN you gave up when everything became a POST to one endpoint. Locking the allowed set is a useful side effect, not the main event.",
          },
          {
            prompt: "GitHub charges GraphQL calls in points rather than counting requests. Why?",
            options: [
              "Points can be sold, so heavy users can be billed for what they consume",
              "Counting requests would penalise clients that batch several screens",
              "One request can mean one row or half a million, so requests are not the unit",
              "Point budgets reset hourly, which is simpler to implement than sliding windows",
            ],
            correctIndex: 2,
            explain:
              "When the client writes the query, request count stops correlating with work done. Scoring the query before it runs prices the actual fan-out, which is the thing the backend has to survive.",
          },
          {
            prompt: "A GraphQL service is failing on a third of calls, and the dashboards are green. Why?",
            options: [
              "Partial failures return 200 with an errors array, so status codes look fine",
              "The failing resolvers are batched, so their errors are collapsed into one",
              "Persisted queries are served from cache, hiding the failures from origin",
              "Cost analysis rejects the query before any status code is recorded",
            ],
            correctIndex: 0,
            explain:
              "GraphQL returns partial data deliberately, so the transport says success while a field is failing. Any monitoring that reads only the status code is blind to it, which is why GraphQL error rates have to be extracted from the response body.",
          },
        ],
      },
      {
        id: "grpc",
        title: "gRPC and binary protocols",
        level: "intermediate",
        body: [
          "gRPC is Protocol Buffers over HTTP/2: a compact binary encoding with a schema, generated client and server stubs in a dozen languages, and four call shapes rather than one. Unary is the familiar request and response; the other three stream, from the server, from the client, or in both directions at once over a single connection. It was open sourced by Google in 2015, and it is the public version of an internal system, Stubby, that had already been carrying the traffic between Google's services for over a decade.",
          "The efficiency comes from several places at once. Protobuf writes a field as a small numeric tag plus a value rather than a repeated field name, and tags 1 to 15 fit in a single byte, which is why the convention is to spend those numbers on the fields that appear most often. HTTP/2 compresses headers with HPACK, so the repeated metadata that dominates small JSON calls largely disappears. Multiplexing lets many calls share one connection without queueing behind each other. And there is no JSON parsing, which on a service doing hundreds of thousands of small calls a second is not a rounding error.",
          "The schema is the part that changes how teams work, because it makes compatibility a build-time question. The rules are simple and unforgiving: field numbers are the wire identity, so they are never reused, and a removed field's number is marked reserved so nobody can accidentally take it. Unknown fields are preserved through a decode and re-encode, so an old intermediary does not silently strip data written by a newer one. Break those rules and the failure is not a parse error, it is a value quietly landing in the wrong field.",
          "Deadlines are the underrated feature. A gRPC call carries a deadline as part of the call itself, and it propagates: a service that received a call with 300ms remaining passes what is left to whatever it calls next, so the whole tree agrees on when the work stops being useful. Do that with REST and you are wiring an X-Request-Deadline header through every hop by hand, and getting it wrong somewhere, which is how a client that gave up eight seconds ago ends up paying for a database query that is still running.",
          "The costs are mostly at the edges. Browsers cannot emit or read HTTP/2 trailers, where gRPC puts its status, so calling gRPC from a browser needs gRPC-Web and a proxy such as Envoy to translate. Debugging by hand is harder, because you cannot read the bytes without the schema, and the tooling (grpcurl and friends) is one more thing to install on a machine where curl was already there.",
          "There is an operational trap worth knowing before it finds you. gRPC holds long-lived connections, so a layer 4 load balancer that balances connections rather than requests will pin every call from a client to one backend, and adding capacity does nothing at all: the new instances sit idle while one melts. The fixes are a proxy that understands HTTP/2 request-level balancing, or client-side load balancing with a resolver that knows the backend set. The usual arrangement is gRPC between your own services and REST or GraphQL at the public edge, which is Google's own split.",
        ],
        why: "gRPC buys performance, typed contracts and propagating deadlines, and charges you in reach and legibility. Both ends being yours is the condition that makes the trade sensible, which is why the boundary between internal and public traffic is usually also the boundary between gRPC and JSON.",
        inPractice:
          "Google runs gRPC internally at very large scale and exposes REST and JSON publicly, and the recommendation to split it that way is theirs. Kubernetes components speak protobuf to the API server for the same reasons, while the same API is available as JSON for everyone reading it with kubectl and curl.",
        diagram: {
          caption: "Internal binary, public JSON, and the proxy where they meet",
          columns: [
            [{ id: "browser", label: "Browser", sub: "no HTTP/2 trailers", kind: "client" }],
            [{ id: "edge", label: "Edge proxy", sub: "Envoy, gRPC-Web", kind: "edge" }],
            [{ id: "gw", label: "API gateway", sub: "REST and JSON", kind: "service" }],
            [
              { id: "svc-a", label: "Service A", sub: "gRPC, deadline 300ms", kind: "service" },
              { id: "svc-b", label: "Service B", sub: "gRPC, deadline 180ms", kind: "service" },
            ],
            [{ id: "store", label: "Store", sub: "cancelled with the call", kind: "data" }],
          ],
          edges: [
            { from: "browser", to: "edge", label: "gRPC-Web" },
            { from: "edge", to: "gw", label: "translated" },
            { from: "gw", to: "svc-a", label: "gRPC unary" },
            { from: "svc-a", to: "svc-b", label: "deadline propagates" },
            { from: "svc-b", to: "store", label: "query" },
          ],
        },
        check: {
          prompt: "Where does gRPC typically fit best?",
          options: [
            "Public APIs for third parties, who benefit most from generated clients",
            "Streaming telemetry from browsers, where binary framing saves bandwidth",
            "Webhook delivery, since a schema stops receivers mis-parsing the payload",
            "Internal service-to-service calls, where performance and typing both pay",
          ],
          correctIndex: 3,
          explain:
            "Browsers need a proxy and third parties expect JSON. Internally, where both ends are yours and you can regenerate both at once, the performance and the typed contract are worth it.",
        },
        checks: [
          {
            prompt: "A team adds three replicas behind a layer 4 balancer and gRPC latency does not improve. Why?",
            options: [
              "HTTP/2 multiplexing serialises calls, so one connection cannot go faster",
              "Connections are balanced, not requests, so every call sticks to one backend",
              "Protobuf decoding is single threaded, so replicas cannot share the load",
              "Deadlines propagate, so the new replicas inherit an already expired budget",
            ],
            correctIndex: 1,
            explain:
              "gRPC keeps connections open for a long time. A balancer that picks a backend per connection picks once and then sends everything there, so new capacity sits idle. You need request-level balancing at layer 7, or client-side balancing that knows the backend set.",
          },
          {
            prompt: "Why must a removed protobuf field number be marked reserved rather than left free?",
            options: [
              "Reserved numbers are excluded from the wire size calculation at encode time",
              "The compiler needs the number to generate a deprecation warning for clients",
              "Reusing it makes old and new peers read the same bytes as different fields",
              "Unreserved numbers are reassigned automatically when the schema is compiled",
            ],
            correctIndex: 2,
            explain:
              "The number is the field's identity on the wire, not the name. Reuse it and an old writer's value is decoded into the new field, so the data lands somewhere plausible and wrong, with no parse error to notice.",
          },
          {
            prompt: "What does a propagating deadline give you that a per-service timeout does not?",
            options: [
              "The whole call tree agrees when the work stops being worth doing",
              "Each service can extend the budget when it knows the work is nearly done",
              "Retries become safe, because a deadline makes every call idempotent",
              "Slow downstream calls are cancelled before their connection is opened",
            ],
            correctIndex: 0,
            explain:
              "Independent timeouts let a client give up while work continues below it, paying for results nobody will read. A deadline carried through the call passes the remaining budget down, so the whole tree stops together.",
          },
        ],
      },
      {
        id: "webhooks",
        title: "Webhooks and delivery",
        level: "advanced",
        body: [
          "A webhook inverts the direction. Instead of clients polling you, you call them when something happens, which removes the polling load and cuts the latency from an average of half the poll interval to roughly the time of one request.",
          "The saving is larger than it looks. A thousand integrators polling a quiet endpoint every thirty seconds is 2,880,000 requests a day, and if events arrive for one integrator in a hundred per poll then 99% of that traffic exists to learn that nothing happened. The same information as webhooks is about 29,000 calls, made only when there is something to say.",
          "What you have bought instead is a delivery problem, and it is yours rather than theirs. Receivers go down, respond in eight seconds, return 200 while failing internally, or vanish for a fortnight. So a webhook sender is really four things: a queue, a retry policy, a dead letter path, and somewhere an integrator can see what failed and why.",
          "Retries need a budget and a shape. Immediate, then 1 minute, 5, 30, 2 hours, 6 hours, and stop at 24 gives eight attempts across a day and covers both a deploy and a night of downtime; Stripe runs the same idea out to three days. Jitter every interval, because a receiver that fell over under load will otherwise be hit by every sender's retry at the same second and fall over again.",
          "Receivers have to verify the call came from you. An HMAC-SHA256 over the raw body with a shared secret, sent as a header, and a timestamp in the signed payload so a captured request cannot be replayed a week later. Sign the raw bytes, not the parsed object: a receiver that re-serialises JSON before checking will compute a different digest for the same message and reject you, which is one of the more annoying afternoons in this line of work.",
          "Order is the part people forget. Retries mean the second event can land before the first, so a payload carries a sequence number or an event timestamp, and the receiver is expected to ignore anything older than what it already holds. Without that, a customer.updated for a stale version arriving after the current one silently reverts a record, and nobody notices until a support ticket says the address changed back on its own.",
        ],
        why:
          "Sending a webhook is easy and delivering one reliably is the actual product, which is why the interesting design is all on the failure path. Signing matters most of all: without it, your webhook endpoint is an unauthenticated write API for anyone who learns the URL, and the URL leaks the moment it appears in a log.",
        inPractice:
          "Stripe signs every webhook with an HMAC and a timestamp, retries with exponential backoff for up to three days, and shows integrators each attempt and response in the dashboard. GitHub signs with SHA-256 and keeps a delivery log you can replay, which is the feature people actually ask for once they have debugged one of these.",
        diagram: {
          caption: "Delivery is the product: sign it, retry it, and give failures somewhere to go",
          columns: [
            [{ id: "ev", label: "Event happens", sub: "order paid", kind: "service" }],
            [{ id: "out", label: "Delivery queue", sub: "signed and retried", kind: "queue" }],
            [
              { id: "rcv", label: "Receiver", sub: "customer endpoint", kind: "external" },
              { id: "dlq", label: "Dead letter", sub: "after N attempts", kind: "queue" },
            ],
          ],
          edges: [
            { from: "ev", to: "out", label: "HMAC over body" },
            { from: "out", to: "rcv", label: "POST, with retries" },
            { from: "out", to: "dlq", label: "attempts exhausted", async: true },
          ],
        },
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
        checks: [
          {
            prompt: "Why must a receiver verify the signature against the raw request bytes?",
            options: [
              "Parsing first exposes the receiver to injection through crafted JSON values",
              "Re-serialising changes key order and spacing, so the digest no longer matches",
              "The raw body is the only form that includes the timestamp header in scope",
              "Frameworks discard the body after parsing, so the check has to run early",
            ],
            correctIndex: 1,
            explain:
              "An HMAC is over exact bytes. Decode and re-encode and you get a semantically identical document with different whitespace or key order, a different digest, and a rejected delivery that nothing in either system explains.",
          },
          {
            prompt: "Retries mean events can arrive out of order. What does the payload need?",
            options: [
              "A sequence number or event timestamp the receiver compares before writing",
              "A delivery id, so duplicates of the same attempt can be discarded",
              "A retry counter, so the receiver knows how many attempts came before",
              "A signature over the previous event, chaining deliveries together",
            ],
            correctIndex: 0,
            explain:
              "Without an ordering token the receiver cannot tell a stale event from a current one, so a retried update lands after the newer one and silently reverts the record. A delivery id gives you deduplication, which is a different problem.",
          },
          {
            prompt: "Why jitter the retry schedule rather than retry on fixed intervals?",
            options: [
              "Fixed intervals let a receiver fingerprint and rate limit your sender",
              "Jitter spreads the load so a recovering receiver is not hit by every retry at once",
              "Jitter increases the number of attempts that fit inside the retry budget",
              "Fixed intervals drift over time as clocks differ between sender and receiver",
            ],
            correctIndex: 1,
            explain:
              "Every failed delivery in the same minute becomes a retry in the same later minute, so a receiver that fell over under load gets a synchronised wave the moment it comes back. Jitter turns the wave into a slope.",
          },
        ],
      },
      {
        id: "versioning",
        title: "Versioning and breaking changes",
        level: "advanced",
        body: [
          "Start from what actually breaks, because it is narrower than people assume. Adding an optional request field, adding a response field, adding an endpoint or a new enum value in a field the client only writes: all safe, provided clients are tolerant readers that ignore what they do not recognise. Removing or renaming a field, tightening validation, making an optional input required, changing a status code, or changing the meaning of an existing value while keeping its name: all breaking, and the last one is the worst, because nothing in any schema catches it.",
          "Where the version number lives matters less than people argue. In the path (/v2/charges) it is explicit, trivially routable and visible in every log line. In a header or media type it keeps URLs stable so a resource has one identity across versions. Both work. What does not work is mixing them, or versioning at three different granularities in the same API, because then no one can answer what version they are on without reading your source.",
          "Stripe's model is the most demanding and the most instructive. An account is pinned to the API version that was current when it first integrated, and requests and responses are passed through a chain of transformations between that version and the current internal one. The cost is that every backwards-incompatible change ever made must exist forever as a piece of running code. What it buys is that they have effectively never broken an existing integration, on an API where breaking one means someone stops taking payments.",
          "Retirement is the part almost everyone skips, and it is the only part that determines whether versioning was worth doing. A version lives exactly as long as clients use it, so the prerequisite is per-version usage telemetry broken down by client: not how many requests hit v1, but which twelve integrators are responsible for them and when each last called. Without that, nobody can prove removal is safe, so nothing is ever removed and every version is maintained forever.",
          "With the telemetry, deprecation becomes a process rather than a hope. Announce with a date. Advertise it in the responses themselves, using the Sunset header from RFC 8594 and the Deprecation header standardised in RFC 9745, so the machinery can see it and not only the mailing list nobody reads. Contact the identified clients directly, because they are a list rather than a crowd. Then run brownouts, short deliberate outages of the old version at announced times, which is the only reliable way to find the integrations whose owners left the company two years ago. Google's deprecation policy commits to a year of notice for stable APIs; a year with brownouts works, and a year of silence followed by a switch-off does not.",
          "The last piece of advice is to version the smallest thing that changed. A global version bump forces every client to revalidate everything to receive one new field, so it gets deferred, so the old version never empties. A new field behind a flag, a new endpoint beside the old one, or a per-resource version keeps the blast radius proportionate to the change, and keeps the migration something a client can do in an afternoon.",
        ],
        why: "Most teams version and then never remove anything, which is the worst of both worlds: all the cost of maintaining parallel behaviour and none of the freedom to change. Per-version usage telemetry is what turns retirement into a decision someone can actually make.",
        inPractice:
          "Stripe pins each account to the version it integrated against and transforms between versions on every call, and has kept old integrations working for over a decade. At the other extreme, Twitter's retirement of v1.1 in 2023 shows the other lever: when the old version genuinely must go, the deadline has to be real, and the ecosystem finds out who was still on it the hard way.",
        diagram: {
          caption: "A pinned version, and the transforms that keep an old client working",
          columns: [
            [
              { id: "old", label: "Old client", sub: "pinned 2019-08", kind: "client" },
              { id: "new", label: "New client", sub: "current version", kind: "client" },
            ],
            [{ id: "ver", label: "Version router", sub: "reads the pin", kind: "edge" }],
            [{ id: "xform", label: "Transform chain", sub: "2019-08 to current", kind: "service" }],
            [{ id: "core", label: "Core API", sub: "one internal shape", kind: "service" }],
            [{ id: "usage", label: "Usage telemetry", sub: "per version, per client", kind: "data" }],
          ],
          edges: [
            { from: "old", to: "ver", label: "request" },
            { from: "new", to: "ver", label: "request" },
            { from: "ver", to: "xform", label: "old versions only" },
            { from: "xform", to: "core", label: "normalised" },
            { from: "ver", to: "usage", label: "who is on what", async: true },
          ],
        },
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
        checks: [
          {
            prompt: "What has to exist before an old API version can actually be retired?",
            options: [
              "A migration guide covering every breaking change in the new version",
              "Per-version usage telemetry showing which clients still call it, and when",
              "A contractual notice period agreed with every integrator in advance",
              "A compatibility layer that rewrites old requests into the new shape",
            ],
            correctIndex: 1,
            explain:
              "Without knowing who is on the old version, removal can never be proved safe, so it never happens. The named list is also what makes the deprecation tractable: it is usually a dozen integrators, not a crowd.",
          },
          {
            prompt: "Why do teams run deliberate brownouts of a deprecated version before switching it off?",
            options: [
              "To measure whether the new version can absorb the additional load",
              "To satisfy the notice requirements set out in RFC 8594 and RFC 9745",
              "To surface integrations whose owners never read the deprecation notice",
              "To let clients test their fallback path against a controlled failure",
            ],
            correctIndex: 2,
            explain:
              "Announcements reach the people who are still reading. A short, announced outage reaches everyone else, because it produces a support ticket from exactly the integrations that no notice ever reached.",
          },
          {
            prompt: "Which change is breaking even though the schema is unchanged?",
            options: [
              "Adding a new value to an enum the client only ever sends",
              "Returning an existing field in a different order within the object",
              "Adding an optional query parameter that defaults to the old behaviour",
              "Redefining what an existing field means while keeping its name and type",
            ],
            correctIndex: 3,
            explain:
              "A field that changes meaning passes every schema check and every contract test, and quietly changes what the client computes. It is the one breaking change that no tooling catches, which is why it is worth naming explicitly.",
          },
        ],
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
          "Polling asks repeatedly on a timer. It is simple, it works through every proxy ever built, and it is wasteful in a way worth quantifying: a thousand clients polling every five seconds is 17 million requests a day, and if something happens once an hour per client then 99.9 per cent of that traffic exists to learn that nothing happened. Latency is bounded by the interval, so halving the latency doubles the load.",
          "Long polling holds the request open until there is news or a timeout, which removes the waste and keeps the simplicity, at the cost of a held connection per waiting client and a proxy somewhere that will close it after 30 or 60 seconds regardless of what you intended. It is the pragmatic choice more often than its reputation suggests.",
          "Server-sent events are a one-way stream from server to client over ordinary HTTP. The browser reconnects automatically, and it will send the last event id it saw so the server can resume rather than restart, which is a feature people reimplement badly on top of WebSockets. Everything in the path treats it as a normal HTTP response, so compression, authentication and proxies all behave.",
          "WebSockets give a persistent two-way channel after an HTTP upgrade handshake. That is what you want when the client also sends frequently: chat, collaborative editing, games, live cursors. What you have taken on is a protocol of your own design, since the frames carry bytes and nothing above that: message types, acknowledgements, resumption and heartbeats are now yours to define.",
          "Read the four as a cost ladder rather than as a ranking. Each step buys lower latency and charges you in held connections, server-side state and operational complexity. The right answer for a dashboard that updates every few seconds is often the one at the bottom of the ladder, and choosing WebSockets for it means writing reconnection logic to solve a problem polling never had.",
          "Two practical notes that decide real implementations. Intermediaries close idle connections, so anything long-lived needs a heartbeat every 30 seconds or so, and both SSE and WebSockets need to tolerate a reconnect at any moment, which in turn means the server must be able to answer what did I miss. And HTTP/2 changed the arithmetic for SSE: the old six-connection-per-host limit that made it awkward applies per connection rather than per stream, so many streams now share one.",
        ],
        why: "SSE is underrated: if data only flows server to client, notifications, live prices, progress, it is far simpler than WebSockets and works through ordinary HTTP infrastructure.",
        check: {
          prompt: "A dashboard receives live updates but never sends anything back. Simplest fit?",
          options: ["WebSockets", "Server-sent events", "Long polling", "gRPC streaming"],
          correctIndex: 1,
          explain: "One-way server to client is exactly what SSE is for, and it reconnects automatically over standard HTTP. WebSockets add bidirectional capability you would not use.",
        },
        checks: [
          {
            prompt: "What does SSE give you for free that WebSocket implementations usually rebuild?",
            options: [
              "Automatic reconnection, and a last event id so the server can resume",
              "Message framing, so a partial message is never delivered to the client",
              "Compression of the event stream, which WebSockets cannot negotiate",
              "Backpressure, since the browser slows the server when it falls behind",
            ],
            correctIndex: 0,
            explain:
              "The browser reconnects on its own and replays the last id it saw, which is exactly the resumption logic teams write by hand on top of WebSockets and often get subtly wrong.",
          },
          {
            prompt: "Why does any long-lived connection need a heartbeat every 30 seconds or so?",
            options: [
              "To measure round-trip latency for the client's own quality reporting",
              "Because intermediaries close connections they consider idle",
              "To keep the TLS session key fresh within its rotation window",
              "Because browsers throttle background tabs with no network activity",
            ],
            correctIndex: 1,
            explain:
              "Proxies, load balancers and mobile network gateways all reap idle connections, and the client usually finds out only when it tries to send. Periodic traffic keeps them open and detects a dead peer.",
          },
          {
            prompt: "A dashboard updates every few seconds and never sends data upward. Why is polling often still right?",
            options: [
              "It is the only option that works reliably through corporate proxies",
              "Its latency is lower than SSE once the interval is short enough",
              "It holds no server-side state, and there is no reconnection to design",
              "It compresses better, since each response is a complete document",
            ],
            correctIndex: 2,
            explain:
              "The ladder costs held connections and state at every step. When the update interval is measured in seconds, a stateless poll avoids reconnection logic, resumption and heartbeats entirely.",
          },
        ],
        diagram: {
          caption: "A cost ladder: latency down, held state up",
          columns: [
            [{ id: "poll", label: "Polling", sub: "no state held", kind: "client" }],
            [{ id: "long", label: "Long polling", sub: "one held request", kind: "edge" }],
            [{ id: "sse", label: "SSE", sub: "stream, auto resume", kind: "edge" }],
            [{ id: "ws", label: "WebSocket", sub: "two-way, your protocol", kind: "service" }],
            [{ id: "cost", label: "What you now own", sub: "reconnect, heartbeat, resume", kind: "data" }],
          ],
          edges: [
            { from: "poll", to: "long", label: "less waste" },
            { from: "long", to: "sse", label: "server pushes" },
            { from: "sse", to: "ws", label: "client pushes too" },
            { from: "ws", to: "cost", label: "the bill" },
          ],
        },
      },
      {
        id: "scaling-connections",
        title: "Scaling persistent connections",
        level: "advanced",
        body: [
          "Persistent connections are stateful, which breaks the assumption that makes web services easy: that any server can handle any request. A message for a user must reach the exact process holding that user's socket, and nothing in a normal load balancer helps with that, because the message did not arrive as a request from that user.",
          "The standard answer is a pub/sub layer. Each gateway subscribes to the channels for the connections it holds, and a publish from anywhere fans out to whichever gateway is holding the socket. The sender no longer needs to know where anyone is connected, which is the property that makes the design scale. Slack and Discord both work this way.",
          "The alternative, a shared map of user to server, looks simpler and ages badly: it needs updating on every connect and disconnect, it is wrong during the seconds after a crash, and every sender must read it before sending. It is a directory that must be perfectly accurate to be useful, which is a hard property to buy.",
          "Capacity is a memory question rather than a CPU one. Each idle connection costs kernel buffers plus whatever your runtime allocates per connection, so the ceiling per machine is usually measured in tens or hundreds of thousands and is decided by that per-connection overhead. The classic C10K work, and the C10M writing that followed, is entirely about driving that number down: event loops instead of threads, careful buffer sizing, and avoiding per-connection allocations.",
          "Deploys are the part that surprises people. Restarting a gateway drops every connection it holds, so a rolling deploy across ten nodes is ten thundering herds of reconnections, each one a handshake and an authentication. Reconnect with exponential backoff and jitter on the client, drain connections gradually rather than all at once, and expect the reconnect storm to be the largest load your authentication path ever sees.",
          "Finally, resumption is what makes reconnection invisible. The client remembers the last message id it processed and asks for what followed; the server keeps a short buffer per channel to answer that. Without it, every reconnect is either a gap in the conversation or a full resynchronisation, and at scale the second one is its own outage.",
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
        checks: [
          {
            prompt: "What limits how many idle WebSocket connections one machine can hold?",
            options: [
              "CPU, since each connection is polled by the event loop every cycle",
              "Memory: kernel buffers plus whatever the runtime allocates per connection",
              "Network bandwidth, which is consumed by keepalive frames",
              "The operating system's hard limit of 65,536 connections per interface",
            ],
            correctIndex: 1,
            explain:
              "Idle connections use almost no CPU and almost no bandwidth. Per-connection memory is the ceiling, which is why the C10K work is mostly about buffer sizes and avoiding per-connection allocation.",
          },
          {
            prompt: "A rolling deploy across ten gateway nodes causes an authentication outage. Why?",
            options: [
              "Each restart drops its connections, and they all reconnect at once",
              "Sessions are invalidated on deploy, forcing every client to sign in again",
              "The pub/sub layer replays buffered messages to every reconnecting client",
              "New nodes reject connections until their health checks have passed",
            ],
            correctIndex: 0,
            explain:
              "Every dropped connection becomes a handshake and an authentication within seconds. Backoff with jitter on the client and gradual draining on the server turn the wall into a slope.",
          },
          {
            prompt: "Why is a shared map of user to server a weaker design than pub/sub?",
            options: [
              "It cannot express a user connected from more than one device",
              "It must be perfectly accurate to be useful, including during a crash",
              "It requires the sender to hold an open connection to every gateway",
              "It cannot be sharded, so it becomes a single point of contention",
            ],
            correctIndex: 1,
            explain:
              "A directory is only as good as its freshness, and it is wrong exactly when things are failing. Publishing to a channel lets whichever gateway currently holds the socket answer, with no directory to keep correct.",
          },
        ],
        diagram: {
          caption: "The sender does not need to know where anyone is connected",
          columns: [
            [{ id: "send", label: "Sender", sub: "any service", kind: "service" }],
            [{ id: "ps", label: "Pub/sub", sub: "channel per user", kind: "queue" }],
            [
              { id: "g1", label: "Gateway 1", sub: "holds Alice", kind: "service" },
              { id: "g2", label: "Gateway 2", sub: "holds Bob", kind: "service" },
            ],
            [
              { id: "a", label: "Alice", sub: "WebSocket", kind: "client" },
              { id: "b", label: "Bob", sub: "WebSocket", kind: "client" },
            ],
          ],
          edges: [
            { from: "send", to: "ps", label: "publish to user:alice" },
            { from: "ps", to: "g1", label: "subscribed" },
            { from: "ps", to: "g2", label: "not subscribed" },
            { from: "g1", to: "a", label: "delivered" },
            { from: "g2", to: "b", label: "waiting" },
          ],
        },
      },
      {
        id: "presence",
        title: "Presence and typing indicators",
        level: "advanced",
        body: [
          "Presence looks trivial in a specification and is among the most expensive features in a chat product. Every state change potentially notifies everyone who can see that user, so the cost tracks the social graph rather than the number of events. In a workspace of 10,000 people where everyone can see everyone, one person arriving in the morning is 10,000 notifications, and a morning is 10,000 of those.",
          "The data is worthless within seconds, which is the property that makes it tractable. It lives in memory behind short expiries rather than in a database: a heartbeat every 30 seconds refreshes a key with a 45-second lifetime, and absence of a heartbeat is absence of a user. Nothing needs to be deleted, nothing needs to be reconciled after a crash, and a lost update corrects itself within one interval.",
          "Fan-out is reduced by scoping rather than by cleverness. Only notify people who could actually observe the change: those with the conversation open, in the same channel, on the same screen. That turns a graph-sized problem into a viewport-sized one, and it is why presence is usually accurate for the handful of people you are looking at and stale for everyone else, which is exactly the right trade.",
          "Batching does the rest. Collect changes over a second or two and send one update rather than twenty, coalesce repeated transitions so a flapping connection produces one event, and let the client interpolate. Typing indicators are throttled hardest of all, often to one event every few seconds per conversation, because they are the first thing worth sacrificing under load and nobody notices their absence for a moment.",
          "The last piece is degradation. Under pressure, presence should stop first, then typing indicators, then read receipts, before anything touches message delivery. Deciding that order in advance is what makes the feature safe to ship, because presence is exactly the kind of feature that will otherwise consume the capacity that messages needed.",
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
        checks: [
          {
            prompt: "Why is presence stored with a short expiry rather than as a status field?",
            options: [
              "A missed heartbeat expires the key, so a crash needs no cleanup",
              "Expiring keys are cheaper to write than updating an existing row",
              "It prevents a user appearing online in more than one session",
              "Short expiries let the store compress presence data more aggressively",
            ],
            correctIndex: 0,
            explain:
              "Absence of a heartbeat is absence of a user, so a process that dies leaves nothing to reconcile. A status field written on disconnect is wrong the moment a disconnect is not clean, which is most of them.",
          },
          {
            prompt: "What most reduces presence fan-out in a large workspace?",
            options: [
              "Compressing the payload, which is repeated across every recipient",
              "Notifying only the people who can currently observe that user",
              "Sharding presence state by user id across more cache nodes",
              "Increasing the heartbeat interval so state changes less often",
            ],
            correctIndex: 1,
            explain:
              "The cost is the number of recipients, so scoping to whoever has that conversation on screen turns a graph-sized problem into a viewport-sized one. Everything else trims constants.",
          },
          {
            prompt: "Under load, in what order should a chat product shed these features?",
            options: [
              "Message delivery last, after presence, typing and read receipts",
              "Typing first, then message delivery, then presence and receipts",
              "Read receipts first, then message delivery, then presence",
              "All of them together, so the degradation is uniform and predictable",
            ],
            correctIndex: 0,
            explain:
              "Presence and typing are enhancements; delivery is the product. Deciding the order before the incident is what stops an enhancement consuming the capacity the messages needed.",
          },
        ],
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
          "A normal index maps a row to its values. An inverted index turns that around: each term points at the list of documents containing it, so a search for shoes reads one posting list rather than examining every row. That inversion is the entire reason full-text search is fast, and it is why the structure has to be different rather than merely bigger.",
          "Text is normalised before it is indexed, and the same pipeline runs over the query so the two can meet. Lowercasing, tokenisation, stemming so running matches run, stop word removal, and often synonyms. Indexing and querying must use the same analyser: a mismatch produces a search that finds nothing for reasons no error message explains, which is among the more frustrating afternoons available.",
          "A LIKE query with a leading wildcard cannot use a B-tree at all, because a B-tree is ordered by prefix and a leading wildcard removes the prefix. So it scans every row, which is fine at ten thousand rows and hopeless at ten million. That is not the database being slow; it is the wrong data structure for the question.",
          "Postgres will do this for you with a GIN index over a tsvector, and that is usually the right first move. It gives stemming, ranking with ts_rank and phrase search inside the database you already run, with no second system to keep in sync. Trigram indexes cover the other common case, fuzzy and substring matching, which full-text search deliberately does not do.",
          "A dedicated engine starts paying when you need what an engine has and a database does not: faceting and aggregations over results, per-field boosting and tuneable relevance, typo tolerance, suggestions, and a scale where the index outgrows the primary. Those are real features rather than a performance argument, and they are the honest reason to take on a second datastore.",
          "The cost of that decision is one thing, repeated: the index is a second copy of the data and it can drift. Everything else, the mappings, the analysers, the ranking, is tuning. The copy is the design problem, and it is why the next topic exists.",
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
        checks: [
          {
            prompt: "Search returns nothing for a term that plainly appears in a document. What is the classic cause?",
            options: [
              "The query and the index were processed by different analysers",
              "The posting list for that term exceeded its maximum length",
              "The document was indexed before the field was added to the mapping",
              "Stop word removal ran on the index but the term is not a stop word",
            ],
            correctIndex: 0,
            explain:
              "Both sides have to be normalised the same way for the tokens to match. A mismatch produces silence rather than an error, which is why analyser configuration is the first thing to check.",
          },
          {
            prompt: "When is a dedicated search engine genuinely worth the second datastore?",
            options: [
              "When the table has grown past a few million rows and scans are slow",
              "When you need faceting, tuneable relevance and typo tolerance",
              "When the text columns are large enough to slow down ordinary queries",
              "When search traffic would otherwise compete with transactional load",
            ],
            correctIndex: 1,
            explain:
              "Those are capabilities a relational database does not have. Size alone is usually answered by a GIN index, and the second system brings a copy of the data that can drift.",
          },
          {
            prompt: "Which problem do trigram indexes solve that full-text search does not?",
            options: [
              "Ranking results by how often each term appears in the corpus",
              "Fuzzy and substring matching, including a leading wildcard",
              "Searching across several columns with a single index",
              "Keeping the index current as rows are inserted and updated",
            ],
            correctIndex: 1,
            explain:
              "Full-text search matches tokens after stemming, so it is deliberately not a substring search. Trigrams index overlapping three-character sequences, which is what makes contains and misspelling queries workable.",
          },
        ],
        diagram: {
          caption: "The same analyser on both sides, or nothing matches",
          columns: [
            [
              { id: "doc", label: "Document", sub: "Running Shoes", kind: "data" },
              { id: "q", label: "Query", sub: "running shoe", kind: "client" },
            ],
            [{ id: "an", label: "Analyser", sub: "lowercase, stem", kind: "service" }],
            [{ id: "terms", label: "Terms", sub: "run, shoe", kind: "data" }],
            [{ id: "post", label: "Posting lists", sub: "term to documents", kind: "data" }],
          ],
          edges: [
            { from: "doc", to: "an", label: "at index time" },
            { from: "q", to: "an", label: "at query time" },
            { from: "an", to: "terms", label: "same pipeline" },
            { from: "terms", to: "post", label: "lookup, not scan" },
          ],
        },
      },
      {
        id: "relevance",
        title: "Relevance and ranking",
        level: "advanced",
        body: [
          "Matching is the easy half and it is the half that gets built. Ranking decides which of ten thousand matches appear in the first five results, and since almost nobody looks past those, ranking is what users experience as the quality of your search.",
          "The classical scoring is TF-IDF and its better-behaved successor BM25: a term counts for more when it appears often in a document and less when it appears in many documents, so rare words carry the signal and common ones do not. BM25 adds saturation, so the twentieth occurrence of a word adds almost nothing, and length normalisation, so a long document does not win simply by containing more words. That saturation is the practical difference and it is why BM25 is the default in every serious engine.",
          "Text score alone produces results that are correct and feel wrong, because relevance in a product is not only about words. Real ranking blends the text score with business signals: recency for news, popularity or conversion rate for commerce, stock availability, distance, and whatever personalisation you can justify. Each is a weight, and the weights are a product decision rather than a technical one.",
          "Two search-specific mechanics are worth knowing. Boosting weights a field or a condition, so a match in the title counts for more than one in the body, which is usually the single highest-value tuning change available. Faceting turns the result set into counts by attribute, which lets people narrow rather than reformulate, and it is often more valuable than any ranking improvement because it changes what the user can do rather than what they are shown.",
          "Measure it, or the tuning is a matter of taste. Click-through on the top results, the rate of searches that return nothing, the rate that lead to a session ending without a click, and the position of the item people eventually chose. Those numbers tell you whether a change helped, and they are the difference between search as an engineering exercise and search as a product.",
          "The failure worth naming is the zero-result search. It is the clearest signal you have and it is usually caused by something fixable: no synonym handling, no typo tolerance, or a filter silently applied. Logging those queries and reading them weekly is the cheapest search improvement available, and it needs no model at all.",
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
        checks: [
          {
            prompt: "What does BM25 add over plain TF-IDF?",
            options: [
              "Saturation, so repeated terms stop adding score, plus length normalisation",
              "Support for phrase queries, which TF-IDF scoring cannot express",
              "Per-field boosting, so a title match outweighs a body match",
              "Stemming, which reduces related words to a shared root before scoring",
            ],
            correctIndex: 0,
            explain:
              "Without saturation, a page repeating a word forty times outranks a better one that says it twice. Length normalisation stops long documents winning by sheer volume of words.",
          },
          {
            prompt: "Which is usually the highest-value tuning change in a product search?",
            options: [
              "Increasing the number of results returned on the first page",
              "Boosting matches in the title over matches in the description",
              "Lowering the minimum score required for a document to appear",
              "Adding more index shards so queries are answered in parallel",
            ],
            correctIndex: 1,
            explain:
              "A title is a human summary of what a thing is, so a match there is far stronger evidence than one buried in a body field. Boosting it is one line and moves the results people notice.",
          },
          {
            prompt: "Why are zero-result searches the most useful thing to log?",
            options: [
              "They indicate an index that has fallen behind the source of truth",
              "They are the clearest failure, and usually have a fixable cause",
              "They are the only searches that can be replayed safely for testing",
              "They correlate with slow queries, which is where tuning pays most",
            ],
            correctIndex: 1,
            explain:
              "Someone asked for something and got nothing, which is unambiguous. The causes are typically missing synonyms, no typo tolerance, or a filter quietly applied, and all three are cheap to fix once you can read the queries.",
          },
        ],
      },
      {
        id: "search-sync",
        title: "Keeping the index in sync",
        level: "advanced",
        body: [
          "The search index is a second copy of the data, so it can drift. Dual writes, writing to the database and the index in the same request, fail the moment one succeeds and the other does not, and nothing about that failure is visible until somebody searches for the missing thing.",
          "Drift is silent and cumulative. Each individual miss is rare, a failed call here, a timeout there, but nothing corrects them, so the index degrades steadily and the only signal is a user saying they cannot find a product that plainly exists. By then the gap is weeks old and there is no log of which writes were lost.",
          "The reliable pattern is to write to the database and derive the index from its change log, so the database stays the single source of truth and the index is always a function of it. Deletes come through as well, which polling an updated_at column misses entirely: a deleted row simply stops appearing in the query, and the document stays in the index forever.",
          "You also need a full reindex path, and you will use it more than you expect. Mappings change, an analyser is wrong, a bug corrupts a field. Build into a new index under a versioned name and swap an alias when it is ready: the swap is atomic, search never goes down, and the previous index is still there when the new one turns out to be worse.",
        ],
        why:
          "Two systems, two commits and no atomicity is the whole problem, and no amount of retrying fixes it. Deriving one from the other's log replaces coordination with a single authoritative ordering.",
        diagram: {
          "caption": "Derive the index from the log, so the database stays the only source of truth",
          "columns": [
            [
              {
                "id": "app",
                "label": "Service",
                "kind": "service"
              }
            ],
            [
              {
                "id": "db",
                "label": "Database",
                "sub": "source of truth",
                "kind": "data"
              }
            ],
            [
              {
                "id": "idx",
                "label": "Search index",
                "sub": "derived from the change log",
                "kind": "data"
              }
            ]
          ],
          "edges": [
            {
              "from": "app",
              "to": "db",
              "label": "write once"
            },
            {
              "from": "db",
              "to": "idx",
              "label": "changes, in commit order",
              "async": true
            }
          ]
        },
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
        checks: [
          {
            prompt: "Why does polling an updated_at column miss deletions?",
            options: [
              "Deleted rows stop appearing in the query, so nothing signals removal",
              "The column is not updated on delete, only when a row actually changes",
              "Polling reads a replica, where the delete may not have arrived yet",
              "Deletes are applied out of order relative to updates in most engines",
            ],
            correctIndex: 0,
            explain:
              "A poll can only see what is still there. The document stays in the index indefinitely, which is why a change log, where a delete is an event, is the reliable version.",
          },
          {
            prompt: "Why build a reindex into a new index and swap an alias?",
            options: [
              "The swap is atomic, and the old index remains if the new one is worse",
              "It avoids the write amplification of updating documents in place",
              "Aliases allow both indexes to serve queries at the same time",
              "A new index inherits the mappings of the old one automatically",
            ],
            correctIndex: 0,
            explain:
              "Search never goes down during the rebuild, the cutover is one operation, and rollback is that operation reversed. You will use it more often than expected, because mappings and analysers change.",
          },
          {
            prompt: "What makes index drift particularly hard to notice?",
            options: [
              "Each miss is rare and nothing corrects it, so the gap grows silently",
              "The engine reports success for documents it has rejected internally",
              "Drift affects only recent documents, which are rarely searched for",
              "Search latency rises with drift, which masks the missing results",
            ],
            correctIndex: 0,
            explain:
              "There is no error and no alert, only a user eventually reporting that something visible in the product cannot be found. By then the losses are weeks old with no record of which writes went missing.",
          },
        ],
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
          "Authentication establishes who you are. Authorisation decides what you may do. They fail differently, they are fixed differently, and they are confused constantly in both code and conversation.",
          "Most serious access-control bugs are authorisation bugs. The user is correctly identified, the session is valid, and the system simply never checks whether this particular user may touch this particular record. Changing an identifier in a URL and seeing someone else's data has sat near the top of the OWASP list for years, and it is not a clever attack; it is a missing line.",
          "The reason is structural rather than careless. Authentication happens once, in one place, at the edge, so it is nearly impossible to forget. Authorisation happens on every request against every resource, in every handler, so forgetting exactly one is the default outcome as a codebase grows. Counting on discipline across two hundred endpoints is not a security model.",
          "The durable fix is to make the check impossible to skip by moving it to where the data is fetched. A repository whose queries always carry the tenant or owner constraint cannot return another tenant's row, whatever the handler above it forgot. Row-level security in the database is the strongest version of the same idea, since it holds even for a query someone writes by hand during an incident.",
          "Then there is the model itself. Role-based access control assigns permissions to roles and roles to users, which is simple and gets awkward when the answer depends on the object rather than the person: the same editor may edit their own drafts and not someone else's. Attribute-based rules describe the condition instead, and relationship-based systems, like Google's Zanzibar, store who is related to what and answer questions about the graph. Most products start with roles and grow a relationship model whether or not they name it.",
          "Two rules survive every model. Deny by default, so a missing rule refuses rather than permits, and check on every request rather than only when rendering a link, because the button being hidden is not a control when the endpoint is still open.",
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
        checks: [
          {
            prompt: "Why do authorisation bugs outnumber authentication bugs so heavily?",
            options: [
              "Authentication libraries are mature, and authorisation ones are not",
              "Authentication is checked once centrally; authorisation on every request",
              "Authorisation runs after the data is loaded, so failures come too late",
              "Authentication failures are visible immediately, so they get fixed first",
            ],
            correctIndex: 1,
            explain:
              "One check in one place is hard to forget. Hundreds of checks across every handler and every resource means forgetting exactly one is the normal outcome, which is why the check belongs where the data is fetched.",
          },
          {
            prompt: "A UI hides the delete button for users without permission. Is that an access control?",
            options: [
              "Yes, provided the same role check is applied when rendering the page",
              "Yes, since a user cannot issue a request the interface never offers",
              "No, the endpoint is still reachable by anyone who sends the request",
              "No, unless the button is removed from the server-rendered markup",
            ],
            correctIndex: 2,
            explain:
              "Hiding a control changes what is convenient, not what is possible. Anyone can send the request directly, so the check has to exist on the server for every request that acts.",
          },
          {
            prompt: "What makes row-level security in the database stronger than a check in the handler?",
            options: [
              "It applies to every query, including ones written by hand later",
              "It runs before authentication, so unauthenticated access is impossible",
              "It is enforced by the connection pool rather than by application code",
              "It cannot be bypassed by an administrator with database credentials",
            ],
            correctIndex: 0,
            explain:
              "The constraint lives where the data is rather than in the path that happens to be reading it, so a new endpoint, a script, or a query typed during an incident all inherit it.",
          },
        ],
        diagram: {
          caption: "Put the check where the data is, not in every handler",
          columns: [
            [{ id: "req", label: "Request", sub: "authenticated", kind: "client" }],
            [
              { id: "h1", label: "Handler A", sub: "remembers to check", kind: "service" },
              { id: "h2", label: "Handler B", sub: "forgot", kind: "service", alternative: true },
            ],
            [{ id: "repo", label: "Repository", sub: "tenant always in the query", kind: "service" }],
            [{ id: "db", label: "Database", sub: "row-level security", kind: "data" }],
          ],
          edges: [
            { from: "req", to: "h1", label: "fetch invoice" },
            { from: "req", to: "h2", label: "fetch invoice" },
            { from: "h1", to: "repo", label: "scoped" },
            { from: "h2", to: "repo", label: "still scoped" },
            { from: "repo", to: "db", label: "cannot return another tenant" },
          ],
        },
      },
      {
        id: "sessions-vs-jwt",
        title: "Sessions or JWTs",
        level: "intermediate",
        body: [
          "A session id is a reference: an opaque random string that means nothing on its own. The server holds the state it points at, can change or delete it instantly, and pays a lookup on every request. That lookup is a cache hit in practice, measured in a fraction of a millisecond, which is worth remembering when statelessness is being justified on performance grounds.",
          "A JWT carries its claims and a signature, so any service holding the public key can validate it without asking anyone. That is the entire feature, and the cost follows directly from it: a token that validates locally cannot be revoked locally, because revocation is shared state and shared state is what the design removed. A user who logs out, an employee who is dismissed, a token that leaks: each stays valid until it expires.",
          "The usual compromise is a short-lived access token, minutes rather than hours, alongside a longer-lived refresh token that is stored server side and can be revoked. That is a session with extra steps, and it is the right answer when the validating services genuinely cannot reach a shared store. It is worth being honest that the revocation window is now the access token lifetime, and choosing that number is choosing how long a compromised token keeps working.",
          "Where the token is stored matters as much as its format. A cookie with HttpOnly is unreadable by JavaScript, which removes the main consequence of a cross-site scripting bug, and needs SameSite and a CSRF defence because the browser attaches it automatically. Local storage is readable by any script on the page, so one compromised dependency takes every token, and it is chosen mainly because it is convenient for a single-page application.",
          "The claims themselves need care. Verify the signature before reading anything, reject the none algorithm outright, check the issuer and audience so a token minted for another service is not accepted by yours, and keep the payload small because it travels on every request and is readable by anyone holding it. A JWT is signed, not encrypted; putting anything private in it publishes it.",
          "Said plainly: for one application talking to a database it already has open, a session is simpler, revocable and better. JWTs earn their keep when the validator cannot reach your store, across services, across companies, or at an edge with no database at all.",
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
        checks: [
          {
            prompt: "Why is an HttpOnly cookie usually safer than local storage for a token?",
            options: [
              "Cookies are encrypted by the browser before being written to disk",
              "Any script on the page can read local storage, including a dependency",
              "Local storage is shared between subdomains, so tokens leak sideways",
              "Cookies expire automatically, whereas local storage persists forever",
            ],
            correctIndex: 1,
            explain:
              "HttpOnly keeps the token out of reach of JavaScript, so a cross-site scripting bug or a compromised package cannot exfiltrate it. The price is CSRF protection, because the browser now sends it automatically.",
          },
          {
            prompt: "Which check is most often missed when validating a JWT?",
            options: [
              "That the signature matches, which some libraries skip by default",
              "That the token has not expired, which requires a synchronised clock",
              "That the issuer and audience match this service, not another one",
              "That the payload is small enough to fit within header size limits",
            ],
            correctIndex: 2,
            explain:
              "A validly signed token issued for a different service will pass a naive check. Verifying issuer and audience is what stops a token minted elsewhere in the same estate being accepted here.",
          },
          {
            prompt: "A team adds a revocation list to their JWT setup. What have they built?",
            options: [
              "A session, with an extra signature and a lookup on every request",
              "A refresh token flow, which is the standard remedy for revocation",
              "A blocklist that scales better than sessions, since entries are short-lived",
              "A stateless system, since the list can be replicated to every validator",
            ],
            correctIndex: 0,
            explain:
              "The lookup that statelessness was meant to remove is back, and the signature is now doing work a session id already did. It is sometimes the right answer, and it should be chosen knowingly rather than arrived at.",
          },
        ],
      },
      {
        id: "oauth",
        title: "OAuth and OpenID Connect",
        level: "advanced",
        body: [
          "OAuth is delegated authorisation: it lets an application act on a user's behalf without ever holding their password. The user is sent to the provider, approves a specific scope, and the application receives a token that grants exactly that. It is not a login protocol, and the many systems that treat it as one have a class of vulnerability in common.",
          "OpenID Connect is the thin layer on top that adds identity. Alongside the access token it returns an ID token, a signed JWT stating who the user is, which issuer authenticated them, which client it was issued for and when. Sign in with Google is OIDC. Inferring identity from an access token instead is the classic mistake, because an access token proves the bearer may call an API and says nothing about who the bearer is.",
          "The flow worth knowing in detail is authorisation code with PKCE, which is now the recommendation for every client type rather than only for mobile. The application redirects the user with a challenge derived from a secret it keeps, the provider returns a short-lived code through the browser, and the application exchanges that code plus the original secret for tokens over a back channel. The code alone is useless to anyone who intercepts it, which is what PKCE exists to guarantee.",
          "Two parameters carry most of the remaining security. The redirect URI must be matched exactly against a registered value, because a wildcard or a loose prefix lets an attacker have the code delivered to a host they control. The state parameter must be generated, sent and verified on return, since it is the cross-site request forgery defence for the callback and skipping it is easy because everything works without it.",
          "The implicit flow, which returned tokens directly in the URL fragment, is deprecated for good reason: tokens ended up in browser history, in referrer headers and in server logs. If you find it in an existing integration, that is a finding rather than a style preference.",
          "Scopes deserve a moment of thought rather than a copied list. Ask for the narrowest scope that does the job, because the consent screen is where users decide whether to trust you and because a token stolen from you can do whatever it was granted. An integration that requests full account access to read a profile is both a security risk and a conversion problem.",
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
        checks: [
          {
            prompt: "What does PKCE protect against in the authorisation code flow?",
            options: [
              "An intercepted authorisation code being exchanged by an attacker",
              "A user approving a scope broader than the application requested",
              "A provider issuing a token for the wrong audience by mistake",
              "An access token being replayed after the user has signed out",
            ],
            correctIndex: 0,
            explain:
              "The code travels through the browser and can be captured. Without the original secret behind the challenge, the code cannot be exchanged, which is why PKCE is now recommended for every client type.",
          },
          {
            prompt: "Why must the redirect URI be matched exactly rather than by prefix?",
            options: [
              "A prefix match breaks when the provider appends query parameters",
              "Exact matching is required for the state parameter to be verified",
              "A loose match lets an attacker have the code delivered to their host",
              "Providers cache the redirect target, so it must never change shape",
            ],
            correctIndex: 2,
            explain:
              "Anything that widens the match widens where the code can be sent. Since the code is the credential in flight, a redirect an attacker controls is a full account takeover in a single step.",
          },
          {
            prompt: "An integration needs the user's name and email. Which scope request is appropriate?",
            options: [
              "Full account access, which avoids a second consent prompt later",
              "The narrowest scope covering profile and email, and nothing more",
              "Read and write on the profile, so it can keep the details in sync",
              "Whatever scope the provider marks as recommended for new clients",
            ],
            correctIndex: 1,
            explain:
              "The token you hold is the token an attacker holds if you are compromised, and the consent screen is where users decide whether to trust you. Both argue for the smallest scope that does the job.",
          },
        ],
        diagram: {
          caption: "Authorisation code with PKCE: the code is useless without the verifier",
          columns: [
            [{ id: "u", label: "User", sub: "redirected", kind: "client" }],
            [{ id: "app", label: "Application", sub: "keeps the verifier", kind: "service" }],
            [{ id: "idp", label: "Provider", sub: "authenticates", kind: "external" }],
            [
              { id: "code", label: "Code", sub: "via the browser", kind: "data" },
              { id: "tok", label: "Tokens", sub: "back channel only", kind: "data" },
            ],
          ],
          edges: [
            { from: "u", to: "app", label: "sign in" },
            { from: "app", to: "idp", label: "challenge, exact redirect" },
            { from: "idp", to: "code", label: "short-lived code" },
            { from: "code", to: "app", label: "returned to the app" },
            { from: "app", to: "tok", label: "code plus verifier" },
          ],
        },
      },
      {
        id: "secrets",
        title: "Secrets and encryption",
        level: "intermediate",
        body: [
          "Secrets belong in a manager with rotation and an audit trail, not in environment variables committed to a repository or baked into an image. The property that matters is not secrecy alone but revocability: when a credential leaks, the question is how quickly it can be replaced and how confidently you can tell what it touched. A secret nobody can rotate without a deploy is a secret that will not be rotated.",
          "Assume every secret leaks eventually, and design for the aftermath. Short lifetimes, one credential per service rather than one shared everywhere, and scoped permissions all shrink what a leak costs. Scanning for committed secrets is worth having, and rotating anything a scanner finds is the only correct response, because a secret that reached a repository has reached everyone who cloned it.",
          "Passwords are a separate problem with a settled answer. Hash them with an algorithm designed to be slow and memory-hard, Argon2id by preference, bcrypt or scrypt where it is not available, with a per-user salt that the algorithm handles for you. Never a fast general-purpose hash such as SHA-256: a modern graphics card tries billions of those a second, so the speed that makes it a good checksum makes it a poor password hash.",
          "Encryption in transit is table stakes and essentially free. Encryption at rest is worth less than people assume: it defends against a stolen disk and it satisfies an auditor, and it does nothing at all against an attacker holding valid application credentials, which is how data actually leaves. Field-level encryption for the few genuinely sensitive columns, with keys held separately, is the version that changes an attacker's outcome.",
          "Key management is the part that decides whether any of it holds. Keys in the same store as the data they protect are decoration. A key management service, an envelope scheme where a data key is encrypted by a master key, and a documented rotation path are the difference between encryption as a control and encryption as a checkbox.",
          "Finally, secrets leak through channels nobody calls a secret store: log lines, error messages, exception trackers, URL query strings, and the analytics tool watching the page. Redacting at the logging boundary, and keeping credentials out of URLs, closes the most common route, and it is cheaper than discovering a token in a third-party tool's search index.",
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
        checks: [
          {
            prompt: "What property of a secrets manager matters most in practice?",
            options: [
              "Encryption at rest, so a stolen backup reveals nothing usable",
              "Revocability: a leaked credential can be replaced quickly and audited",
              "Central storage, so every service reads secrets from one place",
              "Access logging, which shows which service used which secret when",
            ],
            correctIndex: 1,
            explain:
              "Every secret leaks eventually, so the useful question is how fast it can be replaced and what it touched. A secret that needs a deploy to rotate is a secret that will not be rotated.",
          },
          {
            prompt: "What does encryption at rest not protect you from?",
            options: [
              "A disk removed from a decommissioned server in a data centre",
              "A backup file copied from storage that was left publicly readable",
              "An attacker using valid application credentials to query the data",
              "A cloud provider engineer with physical access to the hardware",
            ],
            correctIndex: 2,
            explain:
              "The application decrypts as a matter of course, so anything holding its credentials reads plaintext. That is how data usually leaves, which is why field-level encryption with separate keys is the version that changes the outcome.",
          },
          {
            prompt: "A secret is found committed in git history from two years ago. What is the correct response?",
            options: [
              "Rotate it now, since anyone who cloned the repository already has it",
              "Rewrite the history to remove it, then confirm the scanner is clean",
              "Restrict repository access, then rotate at the next scheduled window",
              "Check the access logs, and rotate only if the secret was actually used",
            ],
            correctIndex: 0,
            explain:
              "History rewriting does not reach clones, forks, mirrors or caches. The credential must be treated as public from the moment it was pushed, and rotation is the only action that changes anything.",
          },
        ],
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
