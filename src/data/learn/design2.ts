import type { Card } from "./types";

export const design2: Card[] = [
  {
    id: "api-design",
    title: "API design",
    summary: "REST, GraphQL, gRPC, webhooks and versioning, and which problem each one actually solves.",
    track: "design",
    topics: [
      {
        id: "rest",
        sources: [
          {
            label: "RFC 9110: HTTP semantics",
            url: "https://www.rfc-editor.org/rfc/rfc9110.html",
            supports: "The division of methods into safe ones that do not change state, GET, HEAD, OPTIONS and TRACE, and idempotent ones, those four plus PUT and DELETE, with POST in neither category.",
          },
          {
            label: "Fielding, Architectural styles and the design of network-based software architectures (2000)",
            url: "https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm",
            supports: "The origin of REST as an architectural style with a set of constraints, of which the uniform interface is the one that pays for itself in practice.",
          },
        ],
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
        sources: [
          {
            label: "GitHub, resource limitations on the GraphQL API",
            url: "https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api",
            supports: "That a call cannot request more than 500,000 nodes and that a token has a budget of 5,000 points an hour, scored per query, rather than a count of requests.",
          },
        ],
        title: "GraphQL and its costs",
        level: "intermediate",
        body: [
          "GraphQL began at Facebook in 2012, driven by a specific problem: the mobile news feed needed a different shape of data from the web one, over a slower network, and every screen change meant either a new bespoke endpoint or several round trips. The specification was published in 2015 and moved to the GraphQL Foundation in 2018. The idea is that the client sends a query describing exactly the fields it wants, and gets back a response with that shape and nothing else. The wins are real and they are mostly about clients. Over-fetching disappears, because nobody is shipping thirty fields to a screen that renders four. Round trips collapse, because a screen that was five REST calls with dependencies between them becomes one request. The schema is typed and introspectable, so tooling, autocomplete and generated client types come for free, and a breaking change is visible before it ships rather than after a client crashes.",
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
        sources: [
          {
            label: "Protocol Buffers: encoding",
            url: "https://protobuf.dev/programming-guides/encoding/",
            supports: "That a field is written as a numeric tag plus a value, and that tags 1 to 15 occupy a single byte, which is why they are spent on the most frequent fields.",
          },
          {
            label: "Protocol Buffers: proto best practices",
            url: "https://protobuf.dev/programming-guides/dos-donts/",
            supports: "That field numbers are the wire identity and must never be reused, and that a removed field's number is reserved so it cannot be taken by accident.",
          },
        ],
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
        sources: [
          {
            label: "Stripe: webhook signatures",
            url: "https://docs.stripe.com/webhooks/signature",
            supports: "That the signature is an HMAC over the raw body with a timestamp in the signed payload, and that the raw bytes must be used rather than a re-serialised object.",
          },
          {
            label: "Stripe: webhook builder and delivery behaviour",
            url: "https://docs.stripe.com/webhooks",
            supports: "That failed deliveries are retried with exponential backoff for up to three days, and that each attempt and response is visible to the integrator.",
          },
        ],
        title: "Webhooks and delivery",
        level: "advanced",
        body: [
          "A webhook inverts the direction. Instead of clients polling you, you call them when something happens, which removes the polling load and cuts the latency from an average of half the poll interval to roughly the time of one request.",
          "The saving is larger than it looks. A thousand integrators polling a quiet endpoint every thirty seconds is 2,880,000 requests a day, and if events arrive for one integrator in a hundred per poll then 99% of that traffic exists to learn that nothing happened. The same information as webhooks is about 29,000 calls, made only when there is something to say.",
          "What you have bought instead is a delivery problem, and it is yours rather than theirs. Receivers go down, respond in eight seconds, return 200 while failing internally, or vanish for a fortnight. So a webhook sender is really four things: a queue, a retry policy, a dead letter path, and somewhere an integrator can see what failed and why.",
          "Retries need a budget and a shape. Immediate, then 1 minute, 5, 30, 2 hours, 6 hours, and stop at 24 gives eight attempts across a day and covers both a deploy and a night of downtime; Stripe runs the same idea out to three days. Jitter every interval, because a receiver that fell over under load will otherwise be hit by every sender's retry at the same second and fall over again.",
          "Receivers have to verify the call came from you. An HMAC-SHA256 over the raw body with a shared secret, sent as a header, and a timestamp in the signed payload so a captured request cannot be replayed a week later. Sign the raw bytes, not the parsed object: a receiver that re-serialises JSON before checking will compute a different digest for the same message and reject you, which is one of the more annoying afternoons in this line of work. Order is the part people forget. Retries mean the second event can land before the first, so a payload carries a sequence number or an event timestamp, and the receiver is expected to ignore anything older than what it already holds. Without that, a customer.updated for a stale version arriving after the current one silently reverts a record, and nobody notices until a support ticket says the address changed back on its own.",
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
        sources: [
          {
            label: "RFC 8594: the Sunset HTTP header field",
            url: "https://www.rfc-editor.org/rfc/rfc8594.html",
            supports: "That a resource's forthcoming removal can be advertised in the response itself, so tooling can see a deprecation rather than only a mailing list.",
          },
          {
            label: "RFC 9745: the Deprecation HTTP header field",
            url: "https://www.rfc-editor.org/rfc/rfc9745.html",
            supports: "The standardised header for signalling that a resource is deprecated, alongside Sunset for when it will stop working.",
          },
          {
            label: "Stripe: API upgrades and versioning",
            url: "https://docs.stripe.com/upgrades",
            supports: "That an account is pinned to the API version current when it integrated, and that requests and responses are transformed between that version and the current internal one.",
          },
        ],
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
        sources: [
          {
            label: "MDN: using server-sent events",
            url: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events",
            supports: "That the browser reconnects automatically and sends the last event id it saw, so the server can resume rather than restart, which is the feature commonly reimplemented on top of WebSockets.",
          },
        ],
        title: "Polling, long polling, SSE, WebSockets",
        level: "beginner",
        body: [
          "Polling asks repeatedly on a timer. It is simple, it works through every proxy ever built, and it is wasteful in a way worth quantifying: a thousand clients polling every five seconds is 17 million requests a day, and if something happens once an hour per client then 99.9 per cent of that traffic exists to learn that nothing happened. Latency is bounded by the interval, so halving the latency doubles the load. Long polling holds the request open until there is news or a timeout, which removes the waste and keeps the simplicity, at the cost of a held connection per waiting client and a proxy somewhere that will close it after 30 or 60 seconds regardless of what you intended. It is the pragmatic choice more often than its reputation suggests.",
          "Server-sent events are a one-way stream from server to client over ordinary HTTP. The browser reconnects automatically, and it will send the last event id it saw so the server can resume rather than restart, which is a feature people reimplement badly on top of WebSockets. Everything in the path treats it as a normal HTTP response, so compression, authentication and proxies all behave.",
          "WebSockets give a persistent two-way channel after an HTTP upgrade handshake. That is what you want when the client also sends frequently: chat, collaborative editing, games, live cursors. What you have taken on is a protocol of your own design, since the frames carry bytes and nothing above that: message types, acknowledgements, resumption and heartbeats are now yours to define.",
          "Read the four as a cost ladder rather than as a ranking. Each step buys lower latency and charges you in held connections, server-side state and operational complexity. The right answer for a dashboard that updates every few seconds is often the one at the bottom of the ladder, and choosing WebSockets for it means writing reconnection logic to solve a problem polling never had.",
          "Two practical notes that decide real implementations. Intermediaries close idle connections, so anything long-lived needs a heartbeat every 30 seconds or so, and both SSE and WebSockets need to tolerate a reconnect at any moment, which in turn means the server must be able to answer what did I miss. And HTTP/2 changed the arithmetic for SSE: the old six-connection-per-host limit that made it awkward applies per connection rather than per stream, so many streams now share one.",
        ],
        why: "SSE is underrated: if data only flows server to client, notifications, live prices, progress, it is far simpler than WebSockets and works through ordinary HTTP infrastructure.",
        inPractice:
          "Server-sent events carry most of the streaming responses on this site, including the assistant's answers, for the reason given above: the browser reconnects and resumes on its own, and nothing in the path needed to learn a new protocol.",
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
        diagram: {
          caption: "Scope the fan-out to who can see it, and let absence expire",
          columns: [
            [{ id: "user", label: "One user arrives", sub: "in a 10,000 person workspace", kind: "client" }],
            [{ id: "hb", label: "Heartbeat", sub: "every 30s, key lives 45s", kind: "service" }],
            [{ id: "all", label: "Notify everyone", sub: "10,000 messages per arrival", kind: "data", alternative: true },
             { id: "view", label: "Notify the viewport", sub: "who has this open now", kind: "data" }],
            [{ id: "batch", label: "Batched, coalesced", sub: "one update per second or two", kind: "external" },
             { id: "shed", label: "Shed first", sub: "before typing, before delivery", kind: "external" }],
          ],
          edges: [
            { from: "user", to: "hb", label: "refreshes a key" },
            { from: "hb", to: "all", label: "graph-sized" },
            { from: "hb", to: "view", label: "viewport-sized" },
            { from: "view", to: "batch", label: "coalesce flapping" },
            { from: "batch", to: "shed", label: "defined as expendable", async: true },
          ],
        },
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
        inPractice:
          "Slack and Discord both throttle typing indicators hard and treat presence as expendable under load, which is the design decision rather than an implementation detail: the feature is defined as one that may be dropped.",
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
        sources: [
          {
            label: "PostgreSQL: full text search",
            url: "https://www.postgresql.org/docs/current/textsearch.html",
            supports: "That Postgres provides stemming, ranking and phrase search over a tsvector with a GIN index, and that trigram indexes cover the fuzzy and substring cases full-text search deliberately does not.",
          },
        ],
        title: "The inverted index",
        level: "intermediate",
        body: [
          "A normal index maps a row to its values. An inverted index turns that around: each term points at the list of documents containing it, so a search for shoes reads one posting list rather than examining every row. That inversion is the entire reason full-text search is fast, and it is why the structure has to be different rather than merely bigger.",
          "Text is normalised before it is indexed, and the same pipeline runs over the query so the two can meet. Lowercasing, tokenisation, stemming so running matches run, stop word removal, and often synonyms. Indexing and querying must use the same analyser: a mismatch produces a search that finds nothing for reasons no error message explains, which is among the more frustrating afternoons available.",
          "A LIKE query with a leading wildcard cannot use a B-tree at all, because a B-tree is ordered by prefix and a leading wildcard removes the prefix. So it scans every row, which is fine at ten thousand rows and hopeless at ten million. That is not the database being slow; it is the wrong data structure for the question.",
          "Postgres will do this for you with a GIN index over a tsvector, and that is usually the right first move. It gives stemming, ranking with ts_rank and phrase search inside the database you already run, with no second system to keep in sync. Trigram indexes cover the other common case, fuzzy and substring matching, which full-text search deliberately does not do.",
          "A dedicated engine starts paying when you need what an engine has and a database does not: faceting and aggregations over results, per-field boosting and tuneable relevance, typo tolerance, suggestions, and a scale where the index outgrows the primary. Those are real features rather than a performance argument, and they are the honest reason to take on a second datastore. The cost of that decision is one thing, repeated: the index is a second copy of the data and it can drift. Everything else, the mappings, the analysers, the ranking, is tuning. The copy is the design problem, and it is why the next topic exists.",
        ],
        why: "This is why search moves to a dedicated engine. It is not that the database is slow; it is that the data structure required for text search is a different one.",
        inPractice:
          "Postgres ships full-text search with GIN indexes over tsvector, and trigram indexes for fuzzy and substring matching, which between them cover most product search without a second datastore to keep in sync.",
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
        diagram: {
          caption: "Match, score, then blend the signals that are not about words",
          columns: [
            [{ id: "q", label: "Query", sub: "10,000 documents match", kind: "client" }],
            [{ id: "bm", label: "BM25", sub: "saturation and length norm", kind: "service" }],
            [{ id: "biz", label: "Business signals", sub: "recency, popularity, stock, distance", kind: "service" },
             { id: "boost", label: "Field boosting", sub: "title over body", kind: "service" }],
            [{ id: "ten", label: "Ten results", sub: "and facets to narrow with", kind: "data" }],
            [{ id: "measure", label: "Measured", sub: "zero-result rate, click position", kind: "external" }],
          ],
          edges: [
            { from: "q", to: "bm", label: "text score" },
            { from: "bm", to: "biz", label: "blend, with weights" },
            { from: "bm", to: "boost", label: "cheapest large win" },
            { from: "biz", to: "ten", label: "ranked" },
            { from: "boost", to: "ten", label: "ranked" },
            { from: "ten", to: "measure", label: "or it is taste", async: true },
          ],
        },
        sources: [
          {
            label: "Elasticsearch: theory behind relevance scoring",
            url: "https://www.elastic.co/guide/en/elasticsearch/guide/current/scoring-theory.html",
            supports: "That BM25 replaced TF-IDF as the default scoring function, and what saturation and length normalisation change about the result.",
          },
        ],
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
        inPractice:
          "Elasticsearch and OpenSearch both use BM25 as the default scoring function, having moved off TF-IDF, and both expose per-field boosting as a query parameter because it is the tuning knob that changes results most for the least effort.",
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
        sources: [
          {
            label: "Debezium documentation",
            url: "https://debezium.io/documentation/reference/stable/index.html",
            supports: "The implementation described here: reading a database's replication log and publishing each committed change, so the index is derived from the database rather than written alongside it.",
          },
        ],
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
        inPractice:
          "Debezium reading a database's replication log into Kafka is the common implementation, and the alias swap on reindex is standard practice in Elasticsearch for exactly the reason above: the cutover is one atomic operation with a way back.",
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
      {
        id: "autocomplete",
        sources: [
          {
            label: "Elasticsearch: suggesters",
            url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-suggesters.html",
            supports: "That the completion suggester is backed by a finite state transducer held in memory rather than reusing the normal search path, because prefix lookup and relevance search have different latency budgets.",
          },
        ],
        title: "Autocomplete and suggestions",
        level: "advanced",
        body: [
          "Autocomplete looks like a smaller version of search and is a different problem. The latency budget is a keystroke, so under about a hundred milliseconds end to end, and every character typed is a request, which means a search box generates an order of magnitude more traffic than the search itself.",
          "The data structure follows from the prefix requirement. A trie holds strings by shared prefix so a lookup walks the typed characters and returns the subtree, and the practical version precomputes the top few completions at each node so the answer is a read rather than a traversal plus a sort. Where a trie is inconvenient to operate, an inverted index with an edge n-gram analyser gets close enough by indexing every prefix as a term.",
          "Ranking matters more than matching here, because a prefix of three characters matches thousands of things and the box shows five. Popularity is the usual backbone, weighted toward recency so that what people searched for this week outranks last year, with personal history above both because someone's own previous searches are the strongest signal available about what they mean.",
          "The client is half the system. Debounce so a fast typist produces a handful of requests rather than one per character, cancel in-flight requests when a newer keystroke arrives, and be careful about out-of-order responses: the reply for a three-letter prefix arriving after the four-letter one will replace correct suggestions with stale ones unless each response is checked against the current input.",
          "Everything about this favours caching. Prefixes are short, popular ones are extremely popular, and results change slowly, so an edge cache with a short expiry absorbs most of the traffic. The remaining engineering is mostly about what not to suggest: profanity, other people's private data, and the long tail of queries that returned nothing, which should not be offered to the next person.",
        ],
        why:
          "The constraint that shapes the design is the latency budget rather than the corpus size, because a suggestion that arrives after the next keystroke is worse than no suggestion at all. That is why the answers are precomputed and cached rather than searched, and why ranking is decided before the request rather than during it.",
        inPractice:
          "Elasticsearch ships a dedicated completion suggester backed by a finite state transducer rather than reusing the normal search path, precisely because prefix lookup and relevance search are different problems with different latency budgets.",
        diagram: {
          caption: "Precompute the answer, cache the prefix, cancel the stale reply",
          columns: [
            [{ id: "k", label: "Keystroke", sub: "debounced", kind: "client" }],
            [{ id: "edge", label: "Edge cache", sub: "short expiry, hot prefixes", kind: "edge" }],
            [{ id: "trie", label: "Prefix store", sub: "top completions per node", kind: "data" }],
            [{ id: "rank", label: "Ranking", sub: "popularity, recency, history", kind: "service" }],
            [{ id: "stale", label: "Late response", sub: "discarded, input moved on", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "k", to: "edge", label: "3 characters" },
            { from: "edge", to: "trie", label: "on miss" },
            { from: "rank", to: "trie", label: "precomputed offline", async: true },
            { from: "edge", to: "stale", label: "arrives after the next keystroke" },
          ],
        },
        check: {
          prompt: "Why is autocomplete usually served from precomputed results rather than from a search query?",
          options: [
            "The latency budget is a keystroke, so the answer must be a read",
            "Prefix queries cannot be expressed in a normal search index",
            "Search relevance scoring is unavailable for partial words",
            "Precomputing is the only way to keep suggestions consistent",
          ],
          correctIndex: 0,
          explain:
            "Under about a hundred milliseconds, with a request per keystroke, there is no room to search and rank on the fly. The ranking is decided in advance and the request becomes a lookup.",
        },
        checks: [
          {
            prompt: "A four-character prefix returns results, then the three-character reply arrives and replaces them. What is missing?",
            options: [
              "A check that each response still matches the current input",
              "A debounce interval long enough to serialise the requests",
              "A cache, which would have returned both replies in order",
              "A sequence number on the request, which the server must echo",
            ],
            correctIndex: 0,
            explain:
              "Responses race. Cancelling in-flight requests helps and does not guarantee ordering, so the client has to discard anything that no longer matches what is in the box.",
          },
          {
            prompt: "Which ranking signal is strongest for an individual user?",
            options: [
              "Their own previous searches, above popularity and recency",
              "Global popularity, since it reflects the largest sample available",
              "Recency, because intent shifts faster than popularity does",
              "Alphabetical order, which is predictable and needs no data",
            ],
            correctIndex: 0,
            explain:
              "Personal history is the best available evidence of what this person means by three ambiguous characters. Popularity and recency are the backbone underneath it for everyone else.",
          },
          {
            prompt: "Which suggestions should be deliberately excluded?",
            options: [
              "Queries that returned nothing, and anything private or offensive",
              "Queries shorter than the prefix currently typed by the user",
              "Queries made by a single user, since they cannot be popular",
              "Queries whose results have changed since they were last run",
            ],
            correctIndex: 0,
            explain:
              "Offering a query that leads nowhere wastes the interaction, and suggestion boxes have repeatedly leaked private or embarrassing strings typed by other people. What not to suggest is most of the remaining work.",
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
        inPractice:
          "S3 has offered strong read-after-write consistency for all operations since December 2020, so an object is readable immediately after it is written and the elaborate workarounds built for the old eventually consistent model can be deleted. The durability figure quoted for the standard classes is eleven nines, which is a statement about object loss and not about your ability to overwrite something by accident, which is what versioning is for.",
        diagram: {
          caption: "What you query in the database, what you serve from the bucket",
          columns: [
            [{ id: "up", label: "Upload", sub: "a large immutable blob", kind: "client" }],
            [{ id: "db", label: "Database", sub: "key, size, owner, checksum", kind: "data" },
             { id: "bucket", label: "Object storage", sub: "the bytes, addressed by key", kind: "data" }],
            [{ id: "cdn", label: "CDN", sub: "cuts egress and latency", kind: "edge" },
             { id: "life", label: "Lifecycle rules", sub: "hot to infrequent to archive", kind: "service" }],
            [{ id: "bill", label: "The bill", sub: "egress, then requests, then bytes", kind: "external" }],
          ],
          edges: [
            { from: "up", to: "db", label: "metadata only" },
            { from: "up", to: "bucket", label: "the payload" },
            { from: "bucket", to: "cdn", label: "serve through it" },
            { from: "bucket", to: "life", label: "age it out", async: true },
            { from: "cdn", to: "bill", label: "egress paid once" },
          ],
        },
        sources: [
          {
            label: "AWS: Amazon S3 strong consistency",
            url: "https://aws.amazon.com/s3/consistency/",
            supports: "That S3 provides strong read-after-write consistency for all requests, delivered in December 2020.",
          },
        ],
        title: "Object storage versus databases and disks",
        level: "beginner",
        body: [
          "Object storage holds immutable blobs addressed by key, with effectively unlimited capacity, eleven nines of durability in the major services, and a cost per gigabyte an order of magnitude below block storage. It is not a filesystem: there are no directories, only keys that contain slashes, and there is no partial update, only replacing an object wholesale. Putting files in a database instead inflates every backup, slows every replica, and spends expensive storage on bytes that no query will ever filter on. The standard shape is the file in object storage and its metadata in the database: key, size, owner, content type, checksum. That split keeps the database small enough to restore quickly, which is the property you care about on the day it matters.",
          "Storage classes are where the money is. Hot storage for what is served, infrequent access for what is occasionally read, archival tiers for what is kept because someone must. The archival tiers are dramatically cheaper per gigabyte and charge for retrieval and for a minimum storage duration, so moving the wrong data there costs more than leaving it. Lifecycle rules automate the transition by age, and setting one up is usually the largest single saving on a storage bill.",
          "The costs that surprise people are not storage at all. Egress is charged per gigabyte leaving the provider and is frequently the largest line, which is why a CDN in front of a bucket pays for itself twice over: it cuts latency and it cuts the number of times the same object leaves the origin. Request charges matter too when the objects are small: a million tiny objects costs more in requests than in bytes.",
          "Consistency is no longer the trap it was. S3 has offered strong read-after-write consistency since December 2020, so an object is readable immediately after it is written, and the elaborate workarounds built for the old model can be deleted. Versioning is worth enabling deliberately, because it turns an accidental overwrite from a data loss incident into a lookup, and because it is what makes deletion recoverable.",
          "The rule that survives all of it: store what you query in the database and what you serve in object storage. Blobs in Postgres make every operational task on that database slower forever, and the pain is paid at restore time, when it is least welcome.",
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
        checks: [
          {
            prompt: "Which line on an object storage bill most often surprises teams?",
            options: [
              "Storage per gigabyte, which grows faster than anyone forecasts",
              "Egress, charged every time an object leaves the provider's network",
              "Replication between availability zones within the same region",
              "Encryption, which is billed per object rather than per request",
            ],
            correctIndex: 1,
            explain:
              "Bytes at rest are cheap and bytes leaving are not, which is why a CDN in front of a bucket pays for itself twice: fewer origin fetches and lower latency.",
          },
          {
            prompt: "What is the risk of moving data to an archival storage class too eagerly?",
            options: [
              "Retrieval fees and minimum durations can exceed what you saved",
              "Archived objects lose their versioning history on transition",
              "Objects become immutable, so metadata can no longer be updated",
              "Lifecycle rules cannot move data back to a hotter class later",
            ],
            correctIndex: 0,
            explain:
              "Archival tiers charge to read and charge for a minimum time stored. For anything read more than rarely, the retrieval cost is larger than the saving on storage.",
          },
          {
            prompt: "Why enable versioning on a bucket holding user uploads?",
            options: [
              "It turns an accidental overwrite or delete into a recoverable lookup",
              "It allows partial updates, so only changed bytes are rewritten",
              "It provides the checksum needed to verify integrity on download",
              "It is required for lifecycle rules to transition objects by age",
            ],
            correctIndex: 0,
            explain:
              "Objects are replaced wholesale, so without versions an overwrite is destruction. With them, both a bad deploy and a bad script are undone by reading an earlier version.",
          },
        ],
      },
      {
        id: "presigned-uploads",
        inPractice:
          "The completion signal is the part people get wrong: the client saying it finished is a claim, and the reliable version is an event from the storage service itself, which is also what lets you verify size, type and checksum before treating the object as real. S3 event notifications exist for exactly that, and the matching lifecycle rule to abort incomplete multipart uploads belongs in the same change, because incomplete parts linger and are billed.",
        sources: [
          {
            label: "AWS: uploading objects with presigned URLs",
            url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html",
            supports: "That the signature encodes the key, expiry and conditions, so the permission is narrow and expiring rather than a credential handed to a browser.",
          },
        ],
        title: "Direct uploads with pre-signed URLs",
        level: "intermediate",
        body: [
          "Routing uploads through your API means large files consume your bandwidth, your memory, your request timeouts and your autoscaling budget, to nobody's benefit. A single 2GB upload can occupy a worker for minutes, and a handful of them at once will exhaust a service sized perfectly well for its actual work.",
          "A pre-signed URL removes the problem rather than solving it. Your server authorises the upload and returns a time-limited URL; the client sends the bytes straight to object storage. The signature encodes what may be uploaded, to which key, until when, so the permission is narrow and expiring rather than a credential handed to a browser.",
          "The constraints belong in the signature, not in a check afterwards. Sign a specific key so a client cannot choose where the object lands, set a content length range so nobody uploads a hundred gigabytes, pin the content type, and keep the expiry short, minutes rather than hours. Anything you fail to constrain is something the holder of that URL may do.",
          "Completion has to be discovered rather than trusted. The client telling your API that it finished is a claim, and a malicious or merely buggy client can make it without uploading anything. The reliable signal is an event from the storage service itself, which is also what lets you verify size, type and checksum before treating the object as real.",
          "Two more things worth building in. Multipart upload splits a large file into parts that upload in parallel and resume individually, which is what makes uploads survive a mobile connection; incomplete multipart uploads then linger and are billed, so a lifecycle rule to abort them after a few days belongs in the same change. And validate the content rather than the extension, because a file named image.png that contains something else is the oldest trick in the list.",
          "The result is an API that stays small and fast because the large payloads never touch it. That is the general shape worth recognising: the best way to scale a piece of work is often to arrange for it not to arrive.",
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
        checks: [
          {
            prompt: "Which constraint must be inside the signature rather than checked afterwards?",
            options: [
              "The maximum content length the client is permitted to upload",
              "The virus scan applied to the object once it has landed",
              "The database row recording who owns the uploaded file",
              "The thumbnail generation triggered when the upload completes",
            ],
            correctIndex: 0,
            explain:
              "Anything not constrained by the signature is something the URL holder may do. A size range in the signature is enforced by the storage service; a check afterwards happens once the bytes are already paid for.",
          },
          {
            prompt: "Why not trust the client's message that its upload has finished?",
            options: [
              "The message can arrive before the storage service has finished writing",
              "A client can claim completion without having uploaded anything at all",
              "Clients cannot compute the checksum needed to confirm integrity",
              "Network retries mean the same completion arrives several times",
            ],
            correctIndex: 1,
            explain:
              "It is an unverified claim from the least trusted party. An event from the storage service is evidence, and it carries the size and checksum you need to validate before treating the object as real.",
          },
          {
            prompt: "What should accompany enabling multipart uploads?",
            options: [
              "A lifecycle rule aborting incomplete uploads, which are billed",
              "A larger request timeout on the API that issues the signatures",
              "A queue to serialise parts, since object storage cannot order them",
              "A second bucket for parts, kept separate from completed objects",
            ],
            correctIndex: 0,
            explain:
              "Parts of an abandoned upload sit in the bucket, invisible in a normal listing and charged for indefinitely. The abort rule is one line and it is the difference between a tidy bill and a mystery.",
          },
        ],
        diagram: {
          caption: "The bytes never touch your API",
          columns: [
            [{ id: "cl", label: "Client", sub: "2GB file", kind: "client" }],
            [{ id: "api", label: "API", sub: "signs, does not carry", kind: "service" }],
            [{ id: "s3", label: "Object storage", sub: "receives the bytes", kind: "data" }],
            [{ id: "ev", label: "Storage event", sub: "verified completion", kind: "queue" }],
            [{ id: "db", label: "Database", sub: "metadata row", kind: "data" }],
          ],
          edges: [
            { from: "cl", to: "api", label: "may I upload?" },
            { from: "api", to: "cl", label: "signed URL, 5 minutes" },
            { from: "cl", to: "s3", label: "PUT, direct" },
            { from: "s3", to: "ev", label: "object created", async: true },
            { from: "ev", to: "db", label: "size and type checked" },
          ],
        },
      },
      {
        id: "video-delivery",
        diagram: {
          caption: "A ladder, cut into segments, chosen by the player between them",
          columns: [
            [{ id: "mez", label: "Mezzanine", sub: "one very large master", kind: "client" }],
            [{ id: "enc", label: "Per-title encode", sub: "measure the content first", kind: "service" }],
            [{ id: "ladder", label: "Rendition ladder", sub: "each cut into segments", kind: "data" },
             { id: "man", label: "Manifest", sub: "lists what exists", kind: "data" }],
            [{ id: "player", label: "Player", sub: "buffer occupancy decides", kind: "external" }],
          ],
          edges: [
            { from: "mez", to: "enc", label: "paid once per title" },
            { from: "enc", to: "ladder", label: "bits where they are needed" },
            { from: "ladder", to: "man", label: "described" },
            { from: "man", to: "player", label: "plain HTTP, any CDN" },
            { from: "player", to: "ladder", label: "next segment, next rung" },
          ],
        },
        sources: [
          {
            label: "Netflix TechBlog, Dynamic optimizer (2018)",
            url: "https://netflixtechblog.com/dynamic-optimizer-a-perceptual-video-encoding-optimization-framework-e19f1e3a277f",
            supports: "The reported bitrate reductions at equal VMAF from measuring the content rather than applying a fixed ladder: 28.04 per cent for x264, 37.61 for libvpx VP9 and 33.51 for x265.",
          },
        ],
        title: "Video: transcoding and adaptive bitrate",
        level: "advanced",
        body: [
          "An uploaded video is transcoded into a ladder of resolutions and bitrates, then split into segments of a few seconds each, with a manifest listing what exists. The manifest is the whole protocol: the player reads it, decides which rendition to fetch next, and asks for one segment at a time over ordinary HTTP, which is why every CDN can serve video without knowing anything about video.",
          "The player measures throughput and switches renditions between segments, so a connection that degrades produces lower quality rather than a stall. That is adaptive bitrate, and it is the reason streaming survives a train tunnel when a single progressive MP4 does not. HLS and DASH differ in details and agree on this design.",
          "Transcoding is expensive and it is paid once per title against a saving on every playback, which is why it is worth doing carefully. A fixed ladder applied to every video is wrong in both directions at once: it wastes bits on an animation with flat colour and starves a grainy night scene. Per-title and per-shot encoding measure the content and choose the ladder for it, and Netflix has published savings in the region of 30 per cent at equal quality from exactly that.",
          "The startup sequence is what users judge, and it is a specific engineering problem rather than a consequence of good encoding. Start on a low rendition so playback begins quickly, then climb once throughput is known. Keep the first segments short so the first frame arrives sooner. Preload the manifest and the first segment when intent is obvious. Time to first frame is the metric that correlates with abandonment, not average bitrate.",
          "Live is a different problem wearing the same clothes. Segment duration sets the floor on latency, since a segment cannot be served until it exists, so ordinary HLS sits several seconds behind. Low-latency variants deliver partial segments to cut that, at the cost of more requests and more complexity in the packager, and the question to ask is whether the product needs seconds or needs to be honest that it does not. Then storage and rights. Every rendition of every title is another copy, so a ladder of six renditions is six times the storage before any language or subtitle variant. Digital rights management adds licence servers and encrypted segments, and it is a business requirement rather than a technical one, which is worth saying out loud because it is the part that most complicates an otherwise clean pipeline.",
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
        checks: [
          {
            prompt: "Why can any ordinary CDN serve adaptive bitrate video without understanding video?",
            options: [
              "Segments and manifests are plain HTTP objects fetched one at a time",
              "The CDN transcodes on demand using the codec named in the manifest",
              "Players open a streaming protocol connection that the CDN proxies",
              "Video segments are small enough to be held entirely in edge memory",
            ],
            correctIndex: 0,
            explain:
              "The intelligence sits in the player, which reads a manifest and requests files. To the CDN it is a sequence of cacheable GETs, which is why streaming rode on infrastructure built for web pages.",
          },
          {
            prompt: "What sets the floor on latency for live HLS?",
            options: [
              "The encoder's bitrate, which decides how fast a segment is produced",
              "Segment duration, since a segment cannot be served until it exists",
              "The player's buffer size, which is fixed by the specification",
              "CDN propagation time between the origin and the edge locations",
            ],
            correctIndex: 1,
            explain:
              "Nothing can be delivered before it has been written, so segment length is a hard floor. Low-latency variants exist precisely to deliver parts of a segment before it is complete.",
          },
          {
            prompt: "Which metric best predicts whether a viewer abandons before watching?",
            options: [
              "Average bitrate delivered across the whole session",
              "The number of rendition switches during the first minute",
              "Time to first frame after the play button is pressed",
              "Total rebuffering time measured across the session",
            ],
            correctIndex: 2,
            explain:
              "People leave before they can judge quality. Starting on a low rendition and climbing is a deliberate trade of early quality for a start that happens, which is why startup is engineered separately.",
          },
        ],
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
        inPractice:
          "Broken access control has sat at the top of the OWASP Top Ten since the 2021 edition, and the sub-category that dominates it is the one described here: the user is correctly identified and nothing checks whether they may touch this particular record. Row-level security in Postgres is the strongest available fix because it holds for a query somebody writes by hand during an incident, not only for the code paths that remembered.",
        sources: [
          {
            label: "OWASP Top Ten 2021: A01 Broken Access Control",
            url: "https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/",
            supports: "That authorisation failures, including changing an identifier to reach another user's record, rank first by prevalence rather than being an exotic attack.",
          },
          {
            label: "MITRE CWE-1345: OWASP Top Ten 2021 category A01",
            url: "https://cwe.mitre.org/data/definitions/1345.html",
            supports: "The same ranking, from a second independent index, along with the specific weaknesses OWASP grouped under it.",
          },
        ],
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
        inPractice:
          "The pattern that gives the game away is a JWT chosen for statelessness and then paired with a revocation list, which reintroduces the lookup the design removed and keeps the inability to revoke instantly. If a shared store is reachable, a session is simpler and strictly better. JWTs earn their place when the validator cannot reach your store: across companies, or at an edge with no database.",
        diagram: {
          caption: "A reference the server can revoke, or a claim it cannot",
          columns: [
            [{ id: "req", label: "Request", sub: "carries one or the other", kind: "client" }],
            [{ id: "sid", label: "Session id", sub: "opaque, means nothing alone", kind: "service" },
             { id: "jwt", label: "JWT", sub: "signed claims, self-contained", kind: "service" }],
            [{ id: "store", label: "Session store", sub: "a sub-millisecond lookup", kind: "data" },
             { id: "local", label: "Verified locally", sub: "no lookup, no revocation", kind: "data" }],
            [{ id: "rev", label: "Logout is instant", sub: "delete the record", kind: "external" },
             { id: "wait", label: "Valid until expiry", sub: "the window is the lifetime", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "req", to: "sid", label: "reference" },
            { from: "req", to: "jwt", label: "value" },
            { from: "sid", to: "store", label: "one lookup" },
            { from: "jwt", to: "local", label: "any holder of the key" },
            { from: "store", to: "rev", label: "revocable" },
            { from: "local", to: "wait", label: "not revocable" },
          ],
        },
        title: "Sessions or JWTs",
        level: "intermediate",
        body: [
          "A session id is a reference: an opaque random string that means nothing on its own. The server holds the state it points at, can change or delete it instantly, and pays a lookup on every request. That lookup is a cache hit in practice, measured in a fraction of a millisecond, which is worth remembering when statelessness is being justified on performance grounds. A JWT carries its claims and a signature, so any service holding the public key can validate it without asking anyone. That is the entire feature, and the cost follows directly from it: a token that validates locally cannot be revoked locally, because revocation is shared state and shared state is what the design removed. A user who logs out, an employee who is dismissed, a token that leaks: each stays valid until it expires.",
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
        inPractice:
          "The OAuth 2.0 security best current practice, published as RFC 9700, is now explicit on both of the points that matter here: authorisation code with PKCE for every client type, and the implicit flow no longer to be used. Finding implicit in an existing integration is a finding rather than a style preference, and it is the reason tokens ended up in browser history and referrer headers.",
        sources: [
          {
            label: "RFC 9700: best current practice for OAuth 2.0 security",
            url: "https://www.rfc-editor.org/rfc/rfc9700.html",
            supports: "That PKCE is recommended for all clients including confidential ones, that the implicit grant should not be used, and that redirect URIs must be compared by exact string match.",
          },
        ],
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
        inPractice:
          "OWASP's password storage guidance names Argon2id first, with scrypt and bcrypt as the fallbacks where it is unavailable, and rules out fast general-purpose hashes outright. The reasoning is the whole topic in one line: the property you want from a password hash is slowness, which is precisely the property that makes SHA-256 a good checksum and a poor password hash.",
        diagram: {
          caption: "Envelope encryption, and the channels a secret leaks through anyway",
          columns: [
            [{ id: "kms", label: "Key management", sub: "holds the master key", kind: "service" }],
            [{ id: "dek", label: "Data key", sub: "encrypted by the master", kind: "data" }],
            [{ id: "field", label: "Encrypted field", sub: "stored beside the data", kind: "data" },
             { id: "same", label: "Key beside the data", sub: "decoration, not a control", kind: "data", alternative: true }],
            [{ id: "leak", label: "Where it leaks", sub: "logs, URLs, error trackers", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "kms", to: "dek", label: "wraps it" },
            { from: "dek", to: "field", label: "encrypts the value" },
            { from: "dek", to: "same", label: "if stored together" },
            { from: "field", to: "leak", label: "redact at the boundary" },
          ],
        },
        sources: [
          {
            label: "OWASP password storage cheat sheet",
            url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
            supports: "That Argon2id is the first recommendation, with scrypt and bcrypt as alternatives, and that fast general-purpose hashes are unsuitable.",
          },
        ],
        title: "Secrets and encryption",
        level: "intermediate",
        body: [
          "Secrets belong in a manager with rotation and an audit trail, not in environment variables committed to a repository or baked into an image. The property that matters is not secrecy alone but revocability: when a credential leaks, the question is how quickly it can be replaced and how confidently you can tell what it touched. A secret nobody can rotate without a deploy is a secret that will not be rotated.",
          "Assume every secret leaks eventually, and design for the aftermath. Short lifetimes, one credential per service rather than one shared everywhere, and scoped permissions all shrink what a leak costs. Scanning for committed secrets is worth having, and rotating anything a scanner finds is the only correct response, because a secret that reached a repository has reached everyone who cloned it.",
          "Passwords are a separate problem with a settled answer. Hash them with an algorithm designed to be slow and memory-hard, Argon2id by preference, bcrypt or scrypt where it is not available, with a per-user salt that the algorithm handles for you. Never a fast general-purpose hash such as SHA-256: a modern graphics card tries billions of those a second, so the speed that makes it a good checksum makes it a poor password hash.",
          "Encryption in transit is table stakes and essentially free. Encryption at rest is worth less than people assume: it defends against a stolen disk and it satisfies an auditor, and it does nothing at all against an attacker holding valid application credentials, which is how data actually leaves. Field-level encryption for the few genuinely sensitive columns, with keys held separately, is the version that changes an attacker's outcome.",
          "Key management is the part that decides whether any of it holds. Keys in the same store as the data they protect are decoration. A key management service, an envelope scheme where a data key is encrypted by a master key, and a documented rotation path are the difference between encryption as a control and encryption as a checkbox. Finally, secrets leak through channels nobody calls a secret store: log lines, error messages, exception trackers, URL query strings, and the analytics tool watching the page. Redacting at the logging boundary, and keeping credentials out of URLs, closes the most common route, and it is cheaper than discovering a token in a third-party tool's search index.",
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
        inPractice:
          "etcd, ZooKeeper and Consul exist, do this correctly and have had their edge cases found by other people, which is the main argument against implementing it. etcd's own lease and election primitives are what Kubernetes uses to decide which controller manager is active, and that is the shape to copy: a coordination service decides who leads, and the resource being written to enforces it with a fencing token.",
        sources: [
          {
            label: "Kleppmann, How to do distributed locking",
            url: "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html",
            supports: "That a process pause invalidates a lease-based lock without the holder knowing, and that fencing tokens checked by the resource are the mitigation.",
          },
        ],
        title: "Leader election",
        level: "advanced",
        body: [
          "Many systems need exactly one node doing something: running a scheduled job, accepting writes, compacting a table, coordinating a cluster. Leader election is how that one node is chosen and how it is replaced when it dies, and the whole difficulty lies in the second half.",
          "Two nodes both believing they lead is a split brain, and it corrupts data quietly rather than loudly. Both are behaving correctly by their own reasoning; the system has simply given two nodes the same certainty. That is why the failure is usually discovered later, in inconsistent data, rather than at the moment it happens.",
          "The naive implementation is a lock row with a timeout, and it fails for a reason worth internalising: there is no bound on how long a process can be paused. Garbage collection, a hypervisor descheduling the VM, a page swapped to disk, a suspended laptop. The lease expires, a new leader is elected, and the old one wakes up with no idea that any time has passed and writes as though it still leads.",
          "You cannot prevent the pause, so the storage layer has to reject the write. Fencing tokens are the mechanism: the lock service issues a monotonically increasing number with each grant, every write carries it, and the resource refuses anything with a number lower than the highest it has seen. The zombie's write is rejected by the thing being written to, which is the only layer that can know.",
          "Leases need clocks, and clocks are the other soft spot. A lease based on absolute timestamps depends on clock synchronisation between the holder and the service; one based on elapsed monotonic time does not, and monotonic time is what you want here. Anything comparing wall-clock timestamps across machines to decide who leads is depending on NTP for correctness, which is a dependency nobody chose.",
          "Almost nobody should implement this from scratch. etcd, ZooKeeper and Consul exist, do it correctly and have had their edge cases found by other people, and a database lease with fencing tokens is a reasonable middle path when adding a coordination service is not worth it. The good outcome is to spend your thinking on what the leader does rather than on how it is chosen.",
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
        checks: [
          {
            prompt: "Why is split brain usually discovered long after it happens?",
            options: [
              "Both nodes behave correctly by their own reasoning, so nothing errors",
              "Monitoring samples leadership too slowly to catch the overlap window",
              "The second leader takes over silently once the first stops responding",
              "Election logs are written by the leader, so the loser records nothing",
            ],
            correctIndex: 0,
            explain:
              "Neither node is malfunctioning; each holds a certainty the system handed it. There is no error to raise, only data that stops agreeing, which surfaces days later as a reconciliation problem.",
          },
          {
            prompt: "Why should a lease use monotonic elapsed time rather than wall-clock timestamps?",
            options: [
              "Monotonic clocks have finer resolution on most operating systems",
              "Wall-clock comparison across machines makes NTP a correctness dependency",
              "Timestamps cannot be compared once a process has been paused",
              "Monotonic time survives a restart, which wall-clock time does not",
            ],
            correctIndex: 1,
            explain:
              "Comparing wall clocks between machines means clock skew decides who leads. Elapsed monotonic time on one machine needs no agreement with anyone, which is the property you want in the failure path.",
          },
          {
            prompt: "When is a database lease a reasonable substitute for etcd or ZooKeeper?",
            options: [
              "When the elected work is idempotent, so a double leader is harmless",
              "When fencing tokens are enforced by the resource being written to",
              "When the lease duration exceeds the longest observed pause in production",
              "When there are fewer than five candidate nodes in the election",
            ],
            correctIndex: 1,
            explain:
              "The lock service is not what makes this safe; the rejection of a stale token is. With that in place a database lease is fine, and without it no lock service saves you either.",
          },
        ],
        diagram: {
          caption: "You cannot stop the pause, so the resource rejects the write",
          columns: [
            [
              { id: "old", label: "Old leader", sub: "paused 30s", kind: "service", alternative: true },
              { id: "new", label: "New leader", sub: "token 43", kind: "service" },
            ],
            [{ id: "lock", label: "Lock service", sub: "issues rising tokens", kind: "edge" }],
            [{ id: "store", label: "Storage", sub: "highest seen: 43", kind: "data" }],
          ],
          edges: [
            { from: "lock", to: "new", label: "grant 43" },
            { from: "new", to: "store", label: "write with 43, accepted" },
            { from: "old", to: "store", label: "write with 42, rejected" },
          ],
        },
      },
      {
        id: "consensus",
        inPractice:
          "Raft is what almost everything built since uses, and the list is worth knowing because it tells you where consensus actually sits in a real system: etcd, Consul and CockroachDB all run it, and in each case it decides metadata, membership and leadership rather than carrying the primary data path. Kubernetes stores its entire cluster state in etcd for that reason, and the state is small precisely because every write pays a quorum round trip.",
        diagram: {
          caption: "Any two majorities overlap, which is the entire proof",
          columns: [
            [{ id: "w", label: "Write", sub: "proposed by the leader", kind: "client" }],
            [{ id: "n1", label: "Node 1", sub: "accepts", kind: "data" },
             { id: "n2", label: "Node 2", sub: "accepts", kind: "data" },
             { id: "n3", label: "Node 3", sub: "unreachable", kind: "data", alternative: true }],
            [{ id: "maj", label: "Majority of 3", sub: "2 is enough, tolerates 1 loss", kind: "service" }],
            [{ id: "cost", label: "A quorum round trip", sub: "per write, priced by distance", kind: "external" }],
          ],
          edges: [
            { from: "w", to: "n1", label: "replicate" },
            { from: "w", to: "n2", label: "replicate" },
            { from: "w", to: "n3", label: "no answer" },
            { from: "n1", to: "maj", label: "committed" },
            { from: "n2", to: "maj", label: "committed" },
            { from: "maj", to: "cost", label: "correctness bought with latency" },
          ],
        },
        sources: [
          {
            label: "Ongaro and Ousterhout, In search of an understandable consensus algorithm (USENIX ATC 2014)",
            url: "https://raft.github.io/raft.pdf",
            supports: "That Raft was designed for understandability rather than novelty, the 2f+1 sizing, term numbers, and randomised election timeouts.",
          },
        ],
        title: "Consensus: Raft and Paxos",
        level: "advanced",
        body: [
          "Consensus is getting a group of nodes to agree on a value despite some of them failing or being unreachable. Paxos came first and is famously hard to reason about; Raft was designed for understandability, which is why it is what almost everything built since uses. Both give the same guarantee: one agreed sequence of decisions that survives a minority failing. The mechanism is a majority quorum. A value is committed once more than half the members have accepted it, which means two conflicting majorities cannot exist, because any two majorities of the same group overlap in at least one member. That overlap is the whole proof, and it is worth being able to state, because everything else in the algorithm is machinery serving it.",
          "Cluster sizing follows from arithmetic rather than from tradition. Tolerating f failures needs 2f+1 members, so 3 tolerates one and 5 tolerates two. Four members tolerate exactly one, the same as three, while costing an extra machine and an extra acknowledgement, which is why even sizes are avoided. The common explanation about avoiding tie votes is wrong: a majority of four is three, so a majority cannot tie.",
          "Raft's structure is worth knowing in outline because it explains the failure modes. One leader takes all writes and replicates them to followers; a term number increases with each election so stale leaders are recognisable; a follower that misses heartbeats becomes a candidate and asks for votes. Randomised election timeouts stop every follower standing at once, which is the same desynchronisation trick as jitter in a retry policy.",
          "The cost is a round trip to a quorum on every write, so consensus is correctness bought with latency, and the price is set by geography. A cluster inside one data centre pays a millisecond; one spanning continents pays the worst inter-region round trip on every single write, which is why global systems shard so that each shard's consensus group stays local rather than stretching one group across the world.",
          "Finally, know what it is not for. Consensus is for metadata, membership, leadership, configuration, small critical state. Running your primary data path through a consensus group means every write pays quorum latency, which is why systems that need both usually keep a small consensus group deciding who may write and a fast replication path doing the writing.",
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
        checks: [
          {
            prompt: "Why can two conflicting values never both be committed by majority quorum?",
            options: [
              "Any two majorities of the same group share at least one member",
              "The leader serialises writes, so a second value is never proposed",
              "Term numbers increase, so the later value always supersedes the earlier",
              "Followers reject a second proposal until the first has been applied",
            ],
            correctIndex: 0,
            explain:
              "The overlap is the proof. A member that accepted the first value will refuse to accept a conflicting one, so no second majority can form, and everything else in the algorithm exists to make that hold under failure.",
          },
          {
            prompt: "Why do Raft implementations randomise the election timeout?",
            options: [
              "To spread elections over time, so followers do not all stand at once",
              "To ensure the node with the freshest log always times out first",
              "To keep leadership changes rare during periods of high write load",
              "To make the term number unpredictable to an outside observer",
            ],
            correctIndex: 0,
            explain:
              "Identical timeouts mean every follower becomes a candidate in the same instant, splitting the vote repeatedly. Randomising is the same desynchronisation trick as jitter in a retry schedule.",
          },
          {
            prompt: "What is the practical consequence of stretching one consensus group across continents?",
            options: [
              "Reads become inconsistent, since followers lag the leader by a region hop",
              "Every write pays the worst inter-region round trip before it commits",
              "Elections never complete, because heartbeats exceed the timeout",
              "The cluster loses fault tolerance, since a region is a single failure domain",
            ],
            correctIndex: 1,
            explain:
              "Quorum means waiting for a majority, and a majority spanning continents includes a far member. This is why global systems shard so each group stays local rather than stretching one group worldwide.",
          },
        ],
      },
      {
        id: "saga",
        inPractice:
          "Two-phase commit is not unavailable, it is unattractive: it does provide atomicity, and it blocks, so a coordinator failure after the prepare leaves participants holding locks and waiting. That is the trade sagas decline. The orchestrated variant is what durable workflow engines such as Temporal exist to run, which is the honest answer to the visibility problem, since the state machine and its current step become queryable rather than implied.",
        diagram: {
          caption: "Each step commits, so each step needs an offsetting action",
          columns: [
            [{ id: "start", label: "Book a trip", sub: "three services, no shared lock", kind: "client" }],
            [{ id: "f", label: "Flight booked", sub: "committed locally", kind: "service" },
             { id: "h", label: "Hotel fails", sub: "committed nothing", kind: "service", alternative: true },
             { id: "c", label: "Card charged", sub: "irreversible, so it goes last", kind: "service" }],
            [{ id: "comp", label: "Compensate", sub: "cancel the flight, refund", kind: "data" }],
            [{ id: "hist", label: "Both facts remain", sub: "booked, then cancelled", kind: "external" }],
          ],
          edges: [
            { from: "start", to: "f", label: "step one" },
            { from: "f", to: "h", label: "step two" },
            { from: "h", to: "comp", label: "run backwards" },
            { from: "comp", to: "hist", label: "not a rollback" },
            { from: "f", to: "c", label: "only if all else held" },
          ],
        },
        title: "Distributed transactions and sagas",
        level: "advanced",
        body: [
          "A transaction across several services cannot use a database transaction, because there is no single database holding the locks. Two-phase commit exists and does provide atomicity, and it is rare in practice for one reason: it blocks. If the coordinator fails after participants have prepared, they hold their locks and wait, and a system where one component's crash freezes several others is a poor trade for a guarantee you can usually work around.",
          "A saga is the usual alternative: break the work into local transactions, each committing on its own, each paired with a compensating action that undoes its effect. Book the flight, book the hotel, charge the card; if the hotel fails, cancel the flight and refund. Every step commits immediately, so nothing is held, and the price is that partial states are real and visible.",
          "Compensation is not rollback, and the distinction is the entire design problem. A rollback erases history; a compensation is a new fact that offsets an old one. The flight was booked and then cancelled, and both appear in the record. Some actions have no compensation at all: you cannot unsend an email or unpublish something someone screenshotted, which forces you to order the saga so the irreversible steps come last.",
          "Sagas are orchestrated or choreographed, and the choice matters more than it sounds. An orchestrator holds the state machine explicitly: one service knows the sequence, which makes the flow readable and the coordinator a component to run. Choreography spreads it across event handlers with no central owner, which couples less and means the actual sequence exists only in the aggregate of everyone's subscriptions, and can be reconstructed only by reading them all.",
          "Every step needs to be idempotent, because every step will be retried. A saga is a long-running process across unreliable networks, so duplicate deliveries and repeated compensations are normal operation rather than an exception. A compensation that runs twice must leave the same state as one that runs once, which usually means recording that it has run rather than checking whether it needs to.",
          "The last piece is visibility. A saga in progress is a state machine with a current step, and it needs to be inspectable: which sagas are running, which are stuck, which compensations failed. Without that you have a distributed process nobody can see, and the first sign of trouble is a customer noticing that a booking exists with no payment against it.",
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
        checks: [
          {
            prompt: "Why is two-phase commit rare despite providing atomicity?",
            options: [
              "It blocks: a coordinator failure leaves participants holding their locks",
              "It requires every participant to run the same database engine",
              "It cannot span more than two services without a nested protocol",
              "It provides atomicity but gives up durability on the participants",
            ],
            correctIndex: 0,
            explain:
              "Prepared participants wait for a decision that is not coming, holding locks the rest of the system needs. One component's crash freezing several others is usually a worse outcome than a visible partial state.",
          },
          {
            prompt: "How should a saga be ordered when one step cannot be compensated?",
            options: [
              "The irreversible step goes last, after everything else has committed",
              "The irreversible step goes first, so failure is discovered early",
              "The irreversible step is wrapped in a two-phase commit of its own",
              "The saga is split in two, with a manual approval between the halves",
            ],
            correctIndex: 0,
            explain:
              "Once the email is sent there is no undo, so everything that can fail should have failed already. Ordering by reversibility is the main design lever a saga gives you.",
          },
          {
            prompt: "What does orchestration give you that choreography does not?",
            options: [
              "Lower coupling between the services taking part in the saga",
              "One place where the sequence is written down and can be read",
              "Guaranteed ordering of the events emitted by each participant",
              "Automatic compensation when any participant reports a failure",
            ],
            correctIndex: 1,
            explain:
              "With choreography the flow exists only as the sum of everyone's subscriptions, so understanding it means reading every handler. An orchestrator is a component to run and a sequence you can point at.",
          },
        ],
      },
      {
        id: "unique-ids",
        inPractice:
          "UUIDv7 was standardised in RFC 9562 in May 2024 and is the sensible modern default when a UUID is wanted: a millisecond timestamp in the leading bits followed by randomness, so it is unique without coordination and still inserts near the end of the index. It gives most of what a Snowflake id gives with none of the machine identifier configuration, and it is why the old advice to avoid UUID primary keys needs qualifying by version.",
        diagram: {
          caption: "Coordination buys ordering; putting time in the high bits buys it back",
          columns: [
            [{ id: "need", label: "An id per row", sub: "at high write rates, sharded", kind: "client" }],
            [{ id: "seq", label: "Auto-increment", sub: "one coordinator, enumerable", kind: "service", alternative: true },
             { id: "v4", label: "UUIDv4", sub: "random, no coordination", kind: "service", alternative: true },
             { id: "v7", label: "UUIDv7 or Snowflake", sub: "time in the high bits", kind: "service" }],
            [{ id: "bott", label: "Bottleneck and leak", sub: "reveals volume, walkable", kind: "data", alternative: true },
             { id: "split", label: "Page splits", sub: "inserts land everywhere", kind: "data", alternative: true },
             { id: "end", label: "Inserts at the end", sub: "locality kept, no coordinator", kind: "data" }],
            [{ id: "pub", label: "Separate public id", sub: "opaque, for external use", kind: "external" }],
          ],
          edges: [
            { from: "need", to: "seq", label: "simplest" },
            { from: "need", to: "v4", label: "no coordination" },
            { from: "need", to: "v7", label: "both properties" },
            { from: "seq", to: "bott", label: "the cost" },
            { from: "v4", to: "split", label: "the cost" },
            { from: "v7", to: "end", label: "sortable and unique" },
            { from: "end", to: "pub", label: "still discloses time", async: true },
          ],
        },
        sources: [
          {
            label: "RFC 9562: universally unique identifiers",
            url: "https://www.rfc-editor.org/rfc/rfc9562.html",
            supports: "That UUIDv7 is standardised, that it places a millisecond timestamp in the leading bits, and that it is intended to give time-ordered locality without a coordinator.",
          },
        ],
        title: "Generating unique ids at scale",
        level: "intermediate",
        body: [
          "Auto-increment ids are perfect until they are not. They need a single coordinator to hand out the next value, which is a bottleneck at high write rates and stops working entirely once the table is sharded, because two shards would issue the same numbers. They also leak information: sequential ids in a URL tell a competitor your order volume and let anyone enumerate your records.",
          "Random UUIDs solve coordination completely and cost you index locality. Version 4 is random by construction, so consecutive inserts land in unrelated parts of the B-tree, which means constant page splits, a much larger working set in memory, and write performance that degrades as the table grows. At 16 bytes they also enlarge every secondary index that references them.",
          "Snowflake-style ids are the usual answer at scale: a timestamp in the high bits, a machine identifier, and a per-millisecond counter, packed into 64 bits. Unique without coordination, sortable by time, and small enough to be a comfortable primary key. The cost is that each generator needs a distinct machine id, which is a small piece of configuration that must genuinely be unique, and a clock that does not move backwards.",
          "UUIDv7 is the standardised version of the same idea and is the sensible modern default when a UUID is wanted: a millisecond timestamp in the leading bits followed by randomness, so it is globally unique with no coordination and still inserts near the end of the index. It gives most of Snowflake's benefit with none of the machine id configuration.",
          "Time-ordered ids have a cost worth naming: they disclose creation time and, with enough samples, creation rate. Where that matters, the fix is a separate opaque public identifier for external use, with the ordered id kept internal. That is also the clean answer to enumeration, since the internal key can stay sequential and useful while nothing outside can walk it. The general shape here appears in many places: coordination buys ordering, and avoiding coordination costs locality. The good designs recover the ordering some other way, usually by putting time in the high bits, rather than by reintroducing the coordinator they were trying to remove.",
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
        checks: [
          {
            prompt: "What does UUIDv7 change compared with UUIDv4?",
            options: [
              "A timestamp in the leading bits, so inserts stay near the end of the index",
              "A shorter representation, which halves the size of every foreign key",
              "A machine identifier, which removes the need for randomness entirely",
              "A checksum, so a corrupted identifier can be detected on read",
            ],
            correctIndex: 0,
            explain:
              "It keeps global uniqueness without coordination and recovers index locality by making the leading bits ordered. That is most of Snowflake's benefit with none of the machine id configuration.",
          },
          {
            prompt: "What does a Snowflake generator need that a random UUID does not?",
            options: [
              "A unique machine id, and a clock that does not move backwards",
              "A coordinator to allocate ranges before each batch of inserts",
              "A shared counter, so two generators cannot collide in a millisecond",
              "A registry of issued ids, to detect a collision after the fact",
            ],
            correctIndex: 0,
            explain:
              "Uniqueness rests on the machine id genuinely differing and on time advancing. Both are small pieces of configuration, and both cause duplicate ids when they are wrong.",
          },
          {
            prompt: "Time-ordered ids in public URLs leak something. What, and what is the fix?",
            options: [
              "Creation time and rate, fixed by a separate opaque public identifier",
              "The shard that holds the row, fixed by hashing the id before display",
              "The machine that generated it, fixed by rotating machine ids often",
              "The table it belongs to, fixed by prefixing ids with a type code",
            ],
            correctIndex: 0,
            explain:
              "Enough samples reveal when things were created and how quickly, which is business information. Keeping the ordered id internal and exposing an opaque one solves both that and enumeration.",
          },
        ],
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
        inPractice:
          "The two ends have converged enough that the product names are a poor guide and the physical layout is the reliable one. Postgres has columnar extensions, DuckDB puts a vectorised analytical engine in a single process on a laptop, and lakehouse formats such as Iceberg and Delta bring transactions to files sitting in object storage. What stays true is that row layout serves fetching whole records and column layout serves scanning a few fields across very many of them.",
        diagram: {
          caption: "The physical layout is the whole performance story",
          columns: [
            [{ id: "q1", label: "Fetch one order", sub: "every column of one row", kind: "client" },
             { id: "q2", label: "Revenue by month", sub: "3 columns of a billion rows", kind: "client" }],
            [{ id: "row", label: "Row store", sub: "one record, one read", kind: "data" },
             { id: "col", label: "Column store", sub: "unnamed columns cost nothing", kind: "data" }],
            [{ id: "compress", label: "Compression works", sub: "one kind of value per column", kind: "service" },
             { id: "contend", label: "Same buffer pool", sub: "a scan evicts the working set", kind: "service", alternative: true }],
            [{ id: "order", label: "Replica, then view", sub: "in that order", kind: "external" }],
          ],
          edges: [
            { from: "q1", to: "row", label: "contiguous" },
            { from: "q2", to: "col", label: "pruned" },
            { from: "col", to: "compress", label: "then vectorised" },
            { from: "q2", to: "contend" },
            { from: "contend", to: "order", label: "the remedies, cheapest first" },
          ],
        },
        title: "OLTP and OLAP",
        level: "beginner",
        body: [
          "Transactional databases are tuned for many small reads and writes of individual rows, and they store data row by row, so fetching one complete record is one contiguous read. Analytical stores are tuned for scanning a few columns across billions of rows, and store data column by column, so the columns a query does not name cost nothing at all to skip.",
          "That layout difference is the whole performance story, and it compounds. Column pruning means a query touching three of sixty columns reads a twentieth of the data. Compression then works far better, because a column holds values of one kind with low variety, so run-length and dictionary encoding do real work where mixed row data resists them. Vectorised execution processes a batch of values per instruction rather than a row at a time.",
          "Running heavy analytics on the production database puts the two workloads in competition for the same buffer pool, the same disk and the same connection slots. A single analyst running a wide scan can evict the working set that was serving customers, which is how a dashboard causes an outage without anything being obviously wrong.",
          "The order of remedies is worth knowing, because most teams jump to the last one. A read replica for reporting removes the contention for a small cost and no new technology. Materialised views precompute the expensive aggregates. Only when scans genuinely need to cross billions of rows does a warehouse earn its complexity, and by then the argument makes itself.",
          "Modelling differs too. Transactional schemas are normalised so a fact lives in one place; analytical schemas are deliberately denormalised into facts and dimensions, the star schema, because a join across billions of rows is expensive and storage is cheap. Bringing normalised thinking to a warehouse produces queries that are correct and slow.",
          "The two ends have been converging, and it is worth knowing where. Postgres has columnar extensions, DuckDB puts an analytical engine on a laptop, and lakehouse formats such as Iceberg and Delta bring transactions to files in object storage. The distinction that stays true is the physical layout, and that is what to reason about rather than the product names.",
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
        checks: [
          {
            prompt: "An analyst's wide scan slows the customer-facing app. What is happening?",
            options: [
              "The scan evicts the working set that was serving user queries",
              "The analytical query takes a table lock that writers then wait on",
              "The optimiser rewrites concurrent queries to share the same plan",
              "Replication lag rises, so reads return stale data more slowly",
            ],
            correctIndex: 0,
            explain:
              "Both workloads share one buffer pool. A scan of billions of rows pushes out the hot pages the transactional path depended on, and everything gets slower with nothing obviously broken.",
          },
          {
            prompt: "What should be tried before adopting a warehouse?",
            options: [
              "A read replica for reporting, then materialised views for aggregates",
              "Partitioning the production tables by month to shrink each scan",
              "Adding indexes on every column that appears in analytical filters",
              "Raising the connection limit so analysts do not compete for slots",
            ],
            correctIndex: 0,
            explain:
              "A replica removes the contention with no new technology, and precomputed aggregates remove most of the cost. A warehouse is right when scans genuinely span billions of rows, and by then the case is obvious.",
          },
          {
            prompt: "Why are analytical schemas deliberately denormalised?",
            options: [
              "Storage is cheap and a join across billions of rows is not",
              "Column stores cannot express foreign key relationships at all",
              "Denormalised tables compress better than normalised ones do",
              "Analysts cannot write joins, so the model must avoid them",
            ],
            correctIndex: 0,
            explain:
              "The star schema trades duplication for avoided joins, which is the opposite of the transactional trade and correct for the opposite reason. Normalised thinking in a warehouse produces queries that are right and slow.",
          },
        ],
      },
      {
        id: "batch-vs-stream",
        inPractice:
          "The Dataflow model is the standard reference for the part that makes streaming hard, and its framing is the useful one: what results are computed, where in event time, when in processing time they are emitted, and how later refinements relate to earlier ones. Those four questions are exactly the decisions a streaming pipeline cannot avoid, and watermarks are the mechanism for the third.",
        diagram: {
          caption: "Event time is when it happened; processing time is when it arrived",
          columns: [
            [{ id: "phone", label: "Offline for an hour", sub: "events buffered on the device", kind: "client" }],
            [{ id: "proc", label: "Group by arrival", sub: "an hour lands in one window", kind: "service", alternative: true },
             { id: "ev", label: "Group by event time", sub: "each lands where it happened", kind: "service" }],
            [{ id: "wm", label: "Watermark", sub: "how long to wait for stragglers", kind: "data" }],
            [{ id: "late", label: "Arrives after close", sub: "discard, restate, or hold longer", kind: "external" },
             { id: "replay", label: "Keep the log", sub: "a bug becomes a re-run", kind: "external" }],
          ],
          edges: [
            { from: "phone", to: "proc", label: "silently wrong" },
            { from: "phone", to: "ev", label: "correct" },
            { from: "ev", to: "wm", label: "needs a decision" },
            { from: "wm", to: "late", label: "no default is right" },
            { from: "ev", to: "replay", label: "what makes it survivable", async: true },
          ],
        },
        sources: [
          {
            label: "Akidau et al., The Dataflow model (VLDB 2015)",
            url: "https://research.google/pubs/the-dataflow-model-a-practical-approach-to-balancing-correctness-latency-and-cost-in-massive-scale-unbounded-out-of-order-data-processing/",
            supports: "The event time against processing time distinction, watermarks as the mechanism for deciding how long to wait, and the framing of late data as a choice between discarding, restating and waiting.",
          },
        ],
        title: "Batch and streaming",
        level: "intermediate",
        body: [
          "Batch processes a bounded chunk on a schedule. The inputs are fixed, so a run is reproducible; a failure is fixed by re-running it; and reasoning about correctness is tractable because the data stops moving while you look at it. The result is as old as the last run, which for most reporting is entirely acceptable. Streaming processes events as they arrive, which buys latency and charges in every dimension that batch made simple. The data never stops, so there is no natural moment at which a result is final, and the hard problems arrive with it: events out of order, events arriving late, and deciding what a window means when both are true.",
          "Event time and processing time is the distinction that makes streaming difficult. An event happened at one moment and reaches you at another, and grouping by when it arrived produces figures that are wrong in ways nobody notices: a mobile app that was offline for an hour delivers its events at once, and they land in the wrong window. Windowing by event time is correct and requires deciding how long to wait for stragglers, which is what watermarks express.",
          "So a streaming pipeline needs an explicit answer to what happens to data arriving after its window closed. Discard it, and totals quietly under-report during exactly the incidents you care about. Update the emitted result, and every downstream consumer must handle a figure that changes after publication. Hold windows open longer, and you have traded back the latency you paid for. There is no default that is right, only a decision.",
          "The pattern that resolves most of this is to keep the log and treat processing as replayable. If events are durable and ordered, a bug in the pipeline is fixed by correcting the code and reprocessing from a position rather than by reconciling by hand, which is the operational property that makes streaming survivable. That is also why the same architecture serves both: batch is a replay over a bounded range.",
          "Most organisations need batch and believe they need streaming. The honest test is whether a decision changes when the data is minutes old rather than hours: fraud, pricing, alerting and operational routing pass it, and a dashboard read each morning with coffee does not. Streaming for a report nobody reads before nine is complexity bought with no return.",
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
        checks: [
          {
            prompt: "Why group a stream by event time rather than by arrival time?",
            options: [
              "Arrival time is cheaper to compute but drifts under clock skew",
              "A batch of delayed events lands together and falsifies the wrong window",
              "Event time is monotonic, so windows can be closed without watermarks",
              "Arrival time cannot be recovered once an event has been persisted",
            ],
            correctIndex: 1,
            explain:
              "An app that was offline for an hour delivers everything at once, and grouping by arrival attributes all of it to now. The figures look plausible and are wrong exactly when something unusual happened.",
          },
          {
            prompt: "What must a streaming pipeline decide explicitly about late data?",
            options: [
              "Whether to discard it, revise the published result, or wait longer",
              "Whether to store it in the same partition as the on-time events",
              "Whether to reprocess the whole window or only the missing records",
              "Whether the producer or the consumer is responsible for buffering it",
            ],
            correctIndex: 0,
            explain:
              "Each option has a real cost: silent under-reporting, downstream figures that change after publication, or the latency you were buying. There is no correct default, only a decision someone has to make.",
          },
          {
            prompt: "What operational property makes a streaming pipeline survivable?",
            options: [
              "Exactly-once delivery guaranteed end to end by the broker",
              "A durable ordered log, so a fixed bug can be reprocessed from a position",
              "Autoscaling consumers, so a backlog is always drained within the window",
              "Schema validation at ingest, so malformed events never enter the stream",
            ],
            correctIndex: 1,
            explain:
              "Bugs in a pipeline are normal; being able to correct the code and replay is what turns them into a re-run instead of a manual reconciliation. It is also why batch and streaming share an architecture.",
          },
        ],
      },
      {
        id: "cdc",
        diagram: {
          caption: "One commit, and everything downstream derived from its log",
          columns: [
            [{ id: "app", label: "Application", sub: "one write, one commit", kind: "client" }],
            [{ id: "db", label: "Database", sub: "already writing a WAL", kind: "data" },
             { id: "dual", label: "Dual write", sub: "commit, then publish", kind: "data", alternative: true }],
            [{ id: "cdc", label: "Log reader", sub: "a second consumer of the WAL", kind: "service" },
             { id: "gap", label: "The gap", sub: "die in between, nothing detects it", kind: "service", alternative: true }],
            [{ id: "sinks", label: "Index, cache, DW", sub: "cannot disagree with the data", kind: "external" },
             { id: "slot", label: "Unread WAL slot", sub: "holds WAL, fills the disk", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "app", to: "db", label: "the only write" },
            { from: "app", to: "dual", label: "two operations" },
            { from: "dual", to: "gap", label: "no atomicity" },
            { from: "db", to: "cdc", label: "no query load" },
            { from: "cdc", to: "sinks", label: "ordered, includes deletes" },
            { from: "cdc", to: "slot", label: "if a consumer stalls", async: true },
          ],
        },
        title: "Change data capture",
        level: "advanced",
        body: [
          "Change data capture reads the database's own replication log and turns each committed change into an event. Every insert, update and delete, in commit order, with no cooperation from the application and no query load on the primary. The database is already writing that log for its replicas; CDC is a second reader of it.",
          "Compared with polling an updated_at column it misses nothing. Polling cannot see deletes, because a deleted row simply stops appearing; it cannot see intermediate states, because two updates between polls look like one; and it adds load to the primary on a schedule forever. The log has all of it, already ordered, already written.",
          "The structural argument is stronger than the practical one. Dual writes, where the application writes to the database and then publishes an event, have no atomicity: the process can die between the two, and nothing detects the gap. CDC has one commit, and everything downstream is derived from it, so the events cannot disagree with the data by construction. That is the same reasoning as the outbox pattern, and CDC is its lower-maintenance form.",
          "What you take on is a coupling to the database schema. Log events carry columns, so a rename that would be invisible behind an API breaks every consumer, and a consumer now depends on a physical detail rather than a contract. The usual discipline is a translation layer that maps log events into published domain events, so the schema can move without every downstream service moving with it.",
          "The operational details that bite are worth knowing in advance. A replication slot that no consumer is reading holds write-ahead log on the primary, and a stalled consumer over a long weekend can fill the disk of the database it was reading. Initial snapshots of a large table are heavy and need a strategy. And delivery is at least once, so consumers must be idempotent regardless of how ordered the source is.",
          "Used well, this is how one source of truth feeds a search index, a cache, a warehouse and three downstream services without any of them being able to drift, and without the application knowing they exist. That last part is the real prize: adding a consumer requires no change to the system that owns the data.",
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
        checks: [
          {
            prompt: "A CDC consumer is down for a long weekend. What is the risk to the database?",
            options: [
              "Its replication slot retains write-ahead log and can fill the disk",
              "The log is truncated on schedule, so the consumer loses those changes",
              "Writes block once the unread log exceeds the configured buffer size",
              "The primary promotes a replica, assuming the reader has failed over",
            ],
            correctIndex: 0,
            explain:
              "The slot exists to guarantee the consumer can still catch up, so the primary keeps the log it has not acknowledged. An unmonitored slot is one of the more memorable ways to take a database down.",
          },
          {
            prompt: "What coupling does CDC introduce that publishing domain events does not?",
            options: [
              "Consumers depend on the physical schema, so a rename breaks them",
              "Consumers must run the same database engine as the producer",
              "Consumers receive events before the transaction has committed",
              "Consumers must process changes strictly in the producer's order",
            ],
            correctIndex: 0,
            explain:
              "Log events carry columns rather than a designed contract. The usual remedy is a translation layer that publishes domain events, so the schema can change without every downstream service changing too.",
          },
          {
            prompt: "Why does CDC solve the dual-write problem rather than mitigate it?",
            options: [
              "It retries the event publish until the broker acknowledges it",
              "There is one commit, and the events are derived from it by construction",
              "It writes both the row and the event inside a single transaction",
              "It reconciles the two systems on a schedule and repairs differences",
            ],
            correctIndex: 1,
            explain:
              "Dual writes fail because two commits have no atomicity. With CDC there is nothing to keep in step: the event stream is a function of the committed data, so it cannot disagree with it.",
          },
        ],
      },
    ],
  },
];
