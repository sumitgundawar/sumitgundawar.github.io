import type { Card } from "./types";

export const design3: Card[] = [
  {
    id: "event-driven",
    title: "Event-driven architecture",
    summary: "Events against commands, the outbox, choreography and the debugging problem nobody mentions.",
    track: "design",
    topics: [
      {
        id: "events-vs-commands",
        title: "Events, commands and who decides",
        level: "intermediate",
        body: [
          "A command says do this and names a recipient. An event says this happened and names nobody. That grammatical difference is the whole architecture: a command couples the sender to the receiver and to the outcome, and an event couples the publisher to nothing at all, because it is a statement of fact that has already occurred.",
          "The consequence is where the decision lives. With commands, the caller decides what should happen next, so adding a behaviour means changing the caller. With events, each consumer decides whether it cares, so adding a behaviour means adding a subscriber and changing nothing that already works. That is the property people are buying when they say decoupled, and it is real.",
          "It is also why events are named in the past tense and describe facts rather than intentions. OrderPlaced is an event; SendConfirmationEmail is a command wearing an event's clothing, and publishing it means the publisher has decided what the consumer does, which is the coupling it was supposed to remove. If the publisher would be upset that nobody handled it, it was a command.",
          "Event content is the next decision and it has two ends. A thin event carrying only an identifier forces every consumer to call back for the details, which is simple and puts read load on the publisher and reintroduces a runtime dependency. A fat event carrying the full state removes that call and means the payload is a copy that can be stale and must be versioned. The middle, an identifier plus the fields consumers actually need, is where most systems end up after trying both.",
          "The honest summary is that events move the complexity rather than removing it. What was an explicit call becomes an implicit contract, and the system gains the ability to add consumers freely and loses the ability to read one file and know what happens next.",
        ],
        why: "The choice is about who decides what happens next. Commands put that decision in the caller and keep it visible; events put it in each consumer and make it extensible. Both are legitimate, and the failure is publishing commands as events and expecting the decoupling anyway.",
        inPractice:
          "The naming test is the practical one: an event is a past-tense fact and a command is an imperative with a recipient. Anything called something like SendEmail published to a topic is a command, and the publisher will find out when nobody handles it.",
        diagram: {
          caption: "A command names its recipient; an event names nobody",
          columns: [
            [{ id: "svc", label: "Order service", kind: "service" }],
            [
              { id: "cmd", label: "Command", sub: "SendConfirmation", kind: "edge", alternative: true },
              { id: "evt", label: "Event", sub: "OrderPlaced", kind: "edge" },
            ],
            [
              { id: "one", label: "One known receiver", sub: "caller decides", kind: "service" },
              { id: "many", label: "Any subscriber", sub: "each decides for itself", kind: "service" },
            ],
            [{ id: "add", label: "Adding a behaviour", sub: "change the caller, or add a consumer", kind: "data" }],
          ],
          edges: [
            { from: "svc", to: "cmd" },
            { from: "svc", to: "evt" },
            { from: "cmd", to: "one" },
            { from: "evt", to: "many" },
            { from: "many", to: "add", label: "nothing existing changes" },
          ],
        },
        check: {
          prompt: "Which of these is a command rather than an event?",
          options: [
            "PaymentCaptured, published when the provider confirms",
            "SendWelcomeEmail, published when an account is created",
            "OrderCancelled, published when a customer cancels",
            "InventoryAdjusted, published when a count is corrected",
          ],
          correctIndex: 1,
          explain:
            "It is an imperative addressed to somebody, so the publisher has decided what happens next. The event version is AccountCreated, and whether that sends an email is the consumer's decision.",
        },
        checks: [
          {
            prompt: "What does a thin event carrying only an identifier cost?",
            options: [
              "Every consumer calls back, so the publisher takes the read load",
              "Consumers cannot filter, since the payload has no fields to match on",
              "Ordering is lost, because the identifier does not carry a sequence",
              "The event cannot be replayed, since the record may have changed",
            ],
            correctIndex: 0,
            explain:
              "It reintroduces a runtime dependency on the publisher and multiplies reads by the number of consumers. Fat events avoid that and carry a copy that can be stale and must be versioned.",
          },
          {
            prompt: "Why are events named in the past tense?",
            options: [
              "They state a fact that already happened, which nobody can refuse",
              "It distinguishes them from database triggers, which use the present",
              "Past tense sorts consistently when topics are listed alphabetically",
              "It signals that the event has already been persisted by the broker",
            ],
            correctIndex: 0,
            explain:
              "A fact needs no recipient and cannot fail. An imperative implies somebody must act, which puts the decision back with the publisher and removes the decoupling.",
          },
          {
            prompt: "What does an event-driven design give up?",
            options: [
              "The ability to read one file and know what happens next",
              "Ordering guarantees, which only synchronous calls can provide",
              "Transactional consistency within a single service boundary",
              "The ability to add new consumers without a schema change",
            ],
            correctIndex: 0,
            explain:
              "The flow exists as the sum of everyone's subscriptions. That is the price of adding behaviour without touching what works, and it is why discoverability tooling matters more here than in a call graph.",
          },
        ],
      },
      {
        id: "outbox",
        title: "The outbox, and why dual writes fail",
        level: "advanced",
        body: [
          "The most common bug in an event-driven system is not in the broker. It is that a service updates its database and then publishes an event, and those are two commits with nothing tying them together. The process can die in between. The broker can be unreachable for the second. The result is a database that says the order is placed and a world that never heard about it, or the reverse.",
          "Retrying does not fix it, because the failure is that there is no atomicity, not that the publish was unlucky. Publishing first and writing second has the same problem with the halves swapped. Wrapping both in a database transaction does nothing, since the broker is not a participant, and adding a distributed transaction across the two is the two-phase commit that everybody avoided for good reasons.",
          "The outbox pattern removes the problem rather than mitigating it. The event is written into a table in the same transaction as the state change, so either both are committed or neither is. A separate process then reads that table and publishes, marking rows as sent. There is still exactly one commit that matters, and the publisher becomes a retryable background job rather than part of the request.",
          "Delivery is then at least once by construction, because a crash after publishing and before marking the row means the event goes out twice. That is the correct trade: duplicates are survivable with an idempotent consumer, and a lost event is not. Anyone who wants exactly once is asking for something the network does not offer, and the honest version is at least once plus deduplication at the consumer.",
          "Change data capture is the same idea with less code, reading the database's replication log and turning committed changes into events without an outbox table at all. It removes the polling process and adds a coupling to the physical schema, which is why teams that want a designed event contract keep the outbox and teams that want the plumbing to disappear reach for the log.",
        ],
        why: "Two commits with no atomicity is the whole problem, and no retry policy repairs it. The outbox turns it into one commit plus a retryable delivery, which is the same move as every other durable-work design: write the intention transactionally, then perform it separately.",
        inPractice:
          "Debezium reading a replication log into Kafka is the common implementation of the log-based variant, and the outbox table is the version teams choose when they want the published event to be a designed contract rather than a mirror of their columns.",
        diagram: {
          caption: "One commit, then a retryable publish",
          columns: [
            [{ id: "req", label: "Request", kind: "client" }],
            [{ id: "tx", label: "One transaction", sub: "state and event together", kind: "service" }],
            [
              { id: "state", label: "Order row", kind: "data" },
              { id: "out", label: "Outbox row", sub: "unsent", kind: "data" },
            ],
            [{ id: "pub", label: "Publisher", sub: "reads, sends, marks sent", kind: "service" }],
            [
              { id: "broker", label: "Broker", sub: "at least once", kind: "queue" },
              { id: "dual", label: "Dual write", sub: "two commits, no atomicity", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "req", to: "tx" },
            { from: "tx", to: "state" },
            { from: "tx", to: "out", label: "same commit" },
            { from: "out", to: "pub", label: "polled or streamed" },
            { from: "pub", to: "broker", label: "duplicates possible" },
            { from: "req", to: "dual", label: "the tempting shape", async: true },
          ],
        },
        check: {
          prompt: "A service writes to its database and then publishes an event. What is wrong?",
          options: [
            "Two commits with no atomicity, so a crash between them loses one",
            "The publish adds latency to a request that has already succeeded",
            "The broker may reorder the event relative to the database write",
            "Consumers may read the event before the transaction is visible",
          ],
          correctIndex: 0,
          explain:
            "The database and the broker are separate systems with no shared transaction. Retrying does not help because the problem is atomicity, which is why the event has to be written in the same commit as the state.",
        },
        checks: [
          {
            prompt: "Why is outbox delivery at least once rather than exactly once?",
            options: [
              "A crash after publishing and before marking sent republishes the row",
              "The broker cannot deduplicate messages from an outbox publisher",
              "Rows are read in batches, so the boundary duplicates one message",
              "Marking sent happens in a separate transaction from the insert",
            ],
            correctIndex: 0,
            explain:
              "The gap between the send and the mark is unavoidable, and duplicating is the safe side of it. Idempotent consumers make duplicates harmless; nothing makes a lost event harmless.",
          },
          {
            prompt: "What does change data capture trade against the outbox?",
            options: [
              "Less code, in exchange for coupling consumers to the physical schema",
              "Stronger ordering, in exchange for higher latency on each event",
              "Exactly-once delivery, in exchange for a dependency on the broker",
              "Lower database load, in exchange for a larger replication lag",
            ],
            correctIndex: 0,
            explain:
              "The log already exists, so there is no table and no polling process. What you publish is then your columns, which is why teams wanting a designed contract add a translation layer or keep the outbox.",
          },
          {
            prompt: "Why does wrapping the write and the publish in a transaction not help?",
            options: [
              "The broker is not a participant in the database's transaction",
              "The transaction commits before the publish is acknowledged",
              "Brokers reject messages sent inside an open transaction",
              "The database releases its locks before the publish completes",
            ],
            correctIndex: 0,
            explain:
              "A transaction covers what the database controls. Making the broker a participant means two-phase commit across systems, which is the blocking protocol everybody avoided in the first place.",
          },
        ],
      },
      {
        id: "event-schema",
        sources: [
          {
            label: "Confluent Schema Registry: compatibility types",
            url: "https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html",
            supports: "That the registry refuses a producer schema change that would break existing consumers, which is what converts the compatibility rules from an intention into a failing deployment.",
          },
        ],
        title: "Schemas, versioning and the contract nobody owns",
        level: "advanced",
        body: [
          "A synchronous API has an owner, a version and a small set of callers who can be found. An event topic has a publisher, an unknown set of consumers, and messages that may be replayed from months ago. That combination makes schema evolution harder than in a request-response system, and it is the part most teams discover late.",
          "The rules that hold are the familiar compatibility rules applied strictly. Adding an optional field is safe. Removing a field or renaming one breaks any consumer reading it, and you cannot know who that is. Changing the meaning of a field while keeping its name is the change no schema check catches, and in an event stream it also silently rewrites the meaning of history.",
          "A schema registry is the mechanism that turns this from a convention into a check. Producers register a schema and the registry refuses an incompatible change, so the break happens at deploy time rather than in a consumer nobody remembered. Formats with defined evolution rules, Avro and Protocol Buffers among them, exist largely because this problem is old and the rules are known.",
          "Replay makes versioning permanent in a way request-response does not. If events are retained so a new consumer can rebuild its state from the beginning, then every schema version that was ever written is a version some consumer must still be able to read. Either the old messages are upgraded on read, or the consumers keep the code for every version, and choosing that deliberately is much cheaper than discovering it during a rebuild.",
          "The organisational point sits underneath the technical one. An event is a public interface published by a team who often does not know who depends on it, so the discipline that makes it work is treating the schema as a product with an owner, a documented meaning per field, and a deprecation process, rather than as a serialisation detail of whatever the producing service happens to store.",
        ],
        why: "An event schema is a public interface with anonymous consumers and a history that can be replayed, which makes it stricter than an API rather than looser. The registry is what converts the compatibility rules from good intentions into a deployment that fails.",
        inPractice:
          "Confluent's schema registry enforces compatibility on producers, refusing a change that would break existing consumers, and Avro and Protocol Buffers both define what counts as compatible. Those tools exist because the problem is old enough to have known answers.",
        diagram: {
          caption: "Anonymous consumers and replayable history make the schema strict",
          columns: [
            [{ id: "prod", label: "Producer", sub: "registers a schema", kind: "service" }],
            [{ id: "reg", label: "Registry", sub: "refuses incompatible changes", kind: "edge" }],
            [{ id: "topic", label: "Topic", sub: "months of retained events", kind: "queue" }],
            [
              { id: "known", label: "Known consumers", kind: "service" },
              { id: "unknown", label: "Forgotten consumers", kind: "service" },
              { id: "new", label: "New consumer", sub: "replays from the start", kind: "service" },
            ],
          ],
          edges: [
            { from: "prod", to: "reg", label: "checked at deploy" },
            { from: "reg", to: "topic" },
            { from: "topic", to: "known" },
            { from: "topic", to: "unknown", label: "cannot be surveyed" },
            { from: "topic", to: "new", label: "reads every old version" },
          ],
        },
        check: {
          prompt: "Why is event schema evolution stricter than evolving an HTTP API?",
          options: [
            "Consumers are unknown, and retained events replay old versions forever",
            "Events cannot carry a version field, unlike an HTTP request path",
            "Brokers validate payloads, so an incompatible change is rejected at runtime",
            "Event consumers cannot be updated without redeploying the producer",
          ],
          correctIndex: 0,
          explain:
            "You cannot enumerate who reads a topic, and a consumer rebuilding from history reads every schema version ever written. Both make removal and renaming much more expensive than in a request-response API.",
        },
        checks: [
          {
            prompt: "What does a schema registry actually change?",
            options: [
              "An incompatible change fails at deploy rather than in a consumer",
              "Consumers automatically upgrade to the newest schema version",
              "Old messages are rewritten into the current schema on retention",
              "Producers and consumers negotiate a version per connection",
            ],
            correctIndex: 0,
            explain:
              "It converts a convention into a check with a failure attached. Without it, compatibility depends on everyone remembering rules that only bite in somebody else's service.",
          },
          {
            prompt: "Which change does no schema check catch?",
            options: [
              "Redefining what a field means while keeping its name and type",
              "Removing a field that some consumers still read from",
              "Adding a required field with no default value defined",
              "Narrowing a numeric type from a wider to a smaller range",
            ],
            correctIndex: 0,
            explain:
              "It passes every compatibility rule and quietly changes what consumers compute, and in an event stream it also rewrites the meaning of every message already retained.",
          },
          {
            prompt: "What does retaining events for replay imply about old schema versions?",
            options: [
              "Every version ever written must remain readable by someone",
              "Old versions can be dropped once all known consumers have upgraded",
              "The registry rewrites retained messages when a schema changes",
              "Replay is limited to the retention window of the newest version",
            ],
            correctIndex: 0,
            explain:
              "A consumer rebuilding from the beginning meets all of them. Either messages are upgraded on read or the code for each version stays, and deciding that in advance is far cheaper than discovering it mid-rebuild.",
          },
        ],
      },
      {
        id: "event-debugging",
        sources: [
          {
            label: "OpenTelemetry: messaging semantic conventions",
            url: "https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/",
            supports: "That context propagation is defined for messaging as well as HTTP, which is what allows a single trace to span a publish and its consumers.",
          },
        ],
        title: "Debugging a system with no call stack",
        level: "advanced",
        body: [
          "The cost nobody quotes when adopting events is that the flow disappears. In a synchronous system a request has a call stack and a trace, and you can read the code to see what happens next. In an event-driven system what happens next is the set of everything subscribed, which lives in configuration across several repositories, and there is no single place that describes the sequence.",
          "So tracing has to be deliberate rather than emergent. A correlation identifier created at the edge must be carried in every event and logged by every consumer, or a business flow spanning six services is six unrelated log streams. Modern tracing standards define how to propagate context through messaging as well as HTTP, and using them is what makes an event-driven system observable rather than merely instrumented.",
          "The failure modes are different too, and they are quieter. A consumer that is down is not an error anybody sees, it is a lag number that has to be watched. A poison message stalls a partition, which appears as one entity's updates having stopped while everything else looks healthy. A consumer that processes events out of order writes a state nobody can explain from the events themselves. None of these produces a failed request, so none of them alerts unless somebody built the alert.",
          "Consumer lag is therefore the central metric, and the useful version is the age of the oldest unprocessed event rather than the count. Depth is ambiguous, because ten thousand messages is fine at high throughput and an incident at low, while age answers the question a user would ask, which is how far behind reality this system currently is.",
          "The last practice is to make replay a designed capability rather than an emergency measure. Being able to reprocess a topic from a position, into a fresh consumer, with idempotent handlers, is what turns a bug in a consumer into a re-run rather than a manual reconciliation. Systems that can do this recover from consumer bugs in an afternoon, and systems that cannot spend a week writing scripts to repair state by hand.",
        ],
        why: "Removing the call stack removes the thing that made debugging tractable, and nothing replaces it by default. Correlation identifiers, lag measured as age, and a rehearsed replay path are what put back the ability to answer what happened to this order.",
        inPractice:
          "OpenTelemetry defines context propagation for messaging as well as for HTTP, which is what allows one trace to span a publish and its consumers. Without it, a flow across six services is six log streams with no shared key.",
        diagram: {
          caption: "No call stack, so the correlation id is the thread",
          columns: [
            [{ id: "edge", label: "Edge", sub: "creates the correlation id", kind: "client" }],
            [{ id: "topic", label: "Topic", sub: "id carried in every event", kind: "queue" }],
            [
              { id: "c1", label: "Consumer A", sub: "logs the id", kind: "service" },
              { id: "c2", label: "Consumer B", sub: "logs the id", kind: "service" },
              { id: "c3", label: "Consumer C", sub: "stalled on a poison message", kind: "service", alternative: true },
            ],
            [
              { id: "trace", label: "One trace", sub: "the flow, reconstructed", kind: "data" },
              { id: "lag", label: "Lag: age of oldest", sub: "the alert that matters", kind: "edge" },
            ],
          ],
          edges: [
            { from: "edge", to: "topic" },
            { from: "topic", to: "c1" },
            { from: "topic", to: "c2" },
            { from: "topic", to: "c3", label: "silently behind" },
            { from: "c1", to: "trace" },
            { from: "c3", to: "lag", label: "no failed request anywhere" },
          ],
        },
        check: {
          prompt: "A consumer stops processing. Why might nothing alert?",
          options: [
            "No request failed, so the only signal is a lag metric somebody added",
            "Brokers suppress consumer errors to avoid duplicate notifications",
            "The publisher continues successfully, which resets the error rate",
            "Lag is reported only when the retention window is exceeded",
          ],
          correctIndex: 0,
          explain:
            "Everything upstream is fine and every dashboard is green. The absence of a failing request is exactly what makes event-driven failures quiet, and it is why lag is the metric that has to exist.",
        },
        checks: [
          {
            prompt: "Why is the age of the oldest unprocessed event better than queue depth?",
            options: [
              "Depth is ambiguous at different rates; age says how far behind",
              "Depth cannot be measured accurately across partitioned topics",
              "Age is reported by brokers natively, whereas depth has to be derived",
              "Depth counts retries, so it overstates the amount of real work left",
            ],
            correctIndex: 0,
            explain:
              "Ten thousand messages is unremarkable at five thousand a second and an incident at five. Age is the number a user would recognise, which is what makes it the right thing to alert on.",
          },
          {
            prompt: "What makes replay a capability rather than an emergency measure?",
            options: [
              "Idempotent handlers and the ability to reprocess from a position",
              "A dead letter queue that retains everything that ever failed",
              "Retention long enough that no event is ever removed from the log",
              "A staging environment holding a copy of the production topic",
            ],
            correctIndex: 0,
            explain:
              "Those two together turn a consumer bug into a re-run. Without them the repair is a bespoke script reconstructing state by hand, which is where the week goes.",
          },
          {
            prompt: "What replaces the call stack for understanding a flow?",
            options: [
              "A correlation id created at the edge and logged by every consumer",
              "A central registry listing every subscription in the estate",
              "The broker's own delivery log, which records each hop",
              "A diagram maintained alongside the service definitions",
            ],
            correctIndex: 0,
            explain:
              "It is the only thing that ties six log streams into one story. A registry and a diagram both help and both go stale; the identifier is present in the evidence itself.",
          },
        ],
      },
    ],
  },

  {
    id: "gateways",
    title: "Gateways, proxies and service meshes",
    summary: "What belongs at the edge, what belongs beside each service, and what a mesh actually buys.",
    track: "design",
    topics: [
      {
        id: "api-gateway",
        title: "What an API gateway is for",
        level: "intermediate",
        body: [
          "A gateway is the single front door to a set of services, and its job is the work that would otherwise be repeated in each of them: terminating TLS, authenticating the caller, applying rate limits, routing by path or host, and emitting consistent logs and metrics. Doing those once, correctly, is worth more than doing them eleven times with three subtle differences.",
          "The clearest argument for it is security. Authentication implemented per service is authentication implemented inconsistently, and the service that gets it wrong is the one nobody remembers exists. Terminating at the gateway means one implementation to audit, one place to rotate keys, and a uniform answer to who is calling, which the services behind it can then trust rather than reimplement.",
          "The clearest argument against a large one is that gateways attract logic. Request transformation, response shaping, per-client special cases, a small amount of business rule that had nowhere else to go, and eventually the gateway is a shared component that every team must change and nobody owns. That is the enterprise service bus reborn with a modern name, and the reason to state the boundary explicitly: routing, authentication, limits and observability, and no domain logic at all.",
          "Aggregation is the case that genuinely justifies more. A mobile client on a slow network making eleven calls to render one screen is paying eleven round trips, and a backend for frontends, a gateway specific to that client, can make those calls internally and return one response. The important part is that it is owned by the client team and is one per client type, rather than a shared layer with every client's needs in it.",
          "The failure to plan for is that the gateway is now on the path of everything. It must be stateless and horizontally scaled, its configuration must be deployable without a restart, and its own failure has to be understood, because a gateway that is down is an outage of everything behind it regardless of how healthy those services are.",
        ],
        why: "The gateway exists to make cross-cutting concerns consistent, and it earns its place exactly as long as it holds that line. Every piece of domain logic added to it converts a component nobody has to think about into one that every team must coordinate through.",
        inPractice:
          "The backend for frontends pattern, one gateway per client type owned by that client's team, is the version that survives, because it puts the aggregation where its requirements come from rather than in a shared layer with every client's needs mixed together.",
        diagram: {
          caption: "Cross-cutting work once, at the door",
          columns: [
            [
              { id: "web", label: "Web client", kind: "client" },
              { id: "mob", label: "Mobile client", kind: "client" },
            ],
            [{ id: "gw", label: "Gateway", sub: "TLS, auth, limits, routing", kind: "edge" }],
            [
              { id: "s1", label: "Service A", sub: "trusts the identity", kind: "service" },
              { id: "s2", label: "Service B", kind: "service" },
              { id: "s3", label: "Service C", kind: "service" },
            ],
            [{ id: "logic", label: "Business logic here", sub: "the slide into a bus", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "web", to: "gw" },
            { from: "mob", to: "gw" },
            { from: "gw", to: "s1" },
            { from: "gw", to: "s2" },
            { from: "gw", to: "s3" },
            { from: "gw", to: "logic", label: "resist this", async: true },
          ],
        },
        check: {
          prompt: "What belongs in an API gateway?",
          options: [
            "Authentication, rate limiting, routing and consistent observability",
            "Request validation against each service's domain rules",
            "Orchestration of multi-step business workflows across services",
            "Caching of computed results specific to each downstream service",
          ],
          correctIndex: 0,
          explain:
            "Cross-cutting concerns done once and consistently. Domain logic in the gateway makes it a shared component every team must change, which is the enterprise service bus with a new name.",
        },
        checks: [
          {
            prompt: "Why is per-service authentication worse than terminating at the gateway?",
            options: [
              "Implemented in eleven places, it is implemented inconsistently",
              "Services cannot verify tokens without a shared secret store",
              "It adds latency, since each service repeats the same validation",
              "It prevents the gateway from applying rate limits per caller",
            ],
            correctIndex: 0,
            explain:
              "One implementation to audit and one place to rotate keys is the security argument. The service that gets it wrong is the one nobody remembers exists.",
          },
          {
            prompt: "What problem does a backend for frontends solve?",
            options: [
              "A client making eleven calls to render one screen over a slow link",
              "Different clients needing different authentication mechanisms",
              "Services whose APIs change faster than clients can be updated",
              "Rate limits that need to differ between web and mobile traffic",
            ],
            correctIndex: 0,
            explain:
              "The aggregation happens close to the services and one response crosses the slow network. Owning it per client type is what stops it becoming a shared layer with everyone's requirements in it.",
          },
          {
            prompt: "What must be true of a gateway given its position?",
            options: [
              "Stateless, horizontally scaled, and reconfigurable without a restart",
              "Colocated with the services so that a failure is contained",
              "Able to cache every response so a backend outage is invisible",
              "Owned by a central platform team rather than by product teams",
            ],
            correctIndex: 0,
            explain:
              "It is on the path of everything, so its failure is an outage of everything behind it. Those three properties are what keep that risk proportionate.",
          },
        ],
      },
      {
        id: "service-mesh",
        sources: [
          {
            label: "Istio: ambient mode",
            url: "https://istio.io/latest/docs/ambient/overview/",
            supports: "The sidecar-free direction described here, which exists because the per-pod proxy cost was the main objection to running a mesh.",
          },
        ],
        title: "Service meshes, and whether you need one",
        level: "advanced",
        body: [
          "A mesh moves the concerns of service-to-service communication out of the application and into a proxy deployed beside each instance. Retries, timeouts, circuit breaking, mutual TLS, traffic splitting and per-call telemetry become configuration rather than library code, and crucially they become uniform across services written in different languages by different teams.",
          "That last point is the honest argument. In a single-language estate, a shared client library does most of this, and a library is simpler to operate than a fleet of proxies. In a polyglot estate, a library means implementing and maintaining the same behaviour four times, which is where the sidecar's per-instance cost starts looking cheap.",
          "The features that are genuinely hard to get any other way are mutual TLS everywhere with automatic certificate rotation, consistent traffic shifting for canaries at the network level, and telemetry that is identical across services because it is emitted by the same proxy. Each of those is possible without a mesh and each is fiddly enough that most teams do not do it consistently.",
          "The cost is a second network to understand. A proxy per instance is CPU, memory and a latency addition on every hop, the control plane is a new dependency in the request path's configuration, and debugging now involves asking whether the problem is the application, its sidecar, the other sidecar or the control plane. That is a genuine increase in the number of places a failure can live.",
          "So the honest test is the number of services and the number of languages. A handful of services in one language does not need a mesh and will feel the cost immediately. Fifty services in four languages, with a platform team to run it, is where the uniformity pays for the complexity. Everything in between is a judgement, and the sidecar-free variants that push the same functions into the kernel are a live attempt to lower the price.",
        ],
        why: "A mesh buys uniformity across services you do not control and cannot rewrite, which is worth a great deal at fifty services and nothing at five. The question is not whether the features are useful but whether a library would give you them for less.",
        inPractice:
          "Istio and Linkerd are the common implementations, and the recent direction of travel is toward reducing the per-pod cost, with ambient and sidecar-free modes moving functions out of a proxy per instance. That effort exists because the sidecar tax was the main objection.",
        diagram: {
          caption: "The same behaviour, in a library or in a proxy beside each instance",
          columns: [
            [{ id: "app", label: "Service", sub: "any language", kind: "service" }],
            [
              { id: "lib", label: "Shared library", sub: "one per language", kind: "edge", alternative: true },
              { id: "side", label: "Sidecar proxy", sub: "one per instance", kind: "edge" },
            ],
            [{ id: "feat", label: "Retries and mTLS", sub: "uniform either way", kind: "data" }],
            [
              { id: "cost1", label: "Once per language", kind: "external", alternative: true },
              { id: "cost2", label: "A second network", kind: "external" },
            ],
          ],
          edges: [
            { from: "app", to: "lib" },
            { from: "app", to: "side" },
            { from: "lib", to: "feat" },
            { from: "side", to: "feat" },
            { from: "lib", to: "cost1" },
            { from: "side", to: "cost2" },
          ],
        },
        check: {
          prompt: "When does a service mesh most clearly pay for itself?",
          options: [
            "Many services in several languages, with a team to operate it",
            "A small number of services that need mutual TLS between them",
            "Any estate running on Kubernetes, where sidecars are standard",
            "Services with strict latency budgets that cannot afford retries",
          ],
          correctIndex: 0,
          explain:
            "Uniformity across code you cannot rewrite is what it sells. In one language a shared library gives most of the same behaviour for far less operational cost.",
        },
        checks: [
          {
            prompt: "What does a mesh add to the debugging surface?",
            options: [
              "The application, its sidecar, the peer sidecar and the control plane",
              "A second copy of every log, emitted by the proxy and the service",
              "Encrypted traffic that cannot be inspected during an incident",
              "Asynchronous delivery, so failures surface away from the call",
            ],
            correctIndex: 0,
            explain:
              "Every hop now has more participants, each of which can be the problem. That is the concrete form of the operational cost, and it is why a platform team is part of the requirement.",
          },
          {
            prompt: "Which mesh feature is hardest to reproduce without one?",
            options: [
              "Mutual TLS everywhere with certificates rotated automatically",
              "Retries with backoff, which any client library can implement",
              "Timeouts per call, available in every HTTP client",
              "Per-service dashboards, which any metrics library can emit",
            ],
            correctIndex: 0,
            explain:
              "The other three are library features people already have. Identity and rotation across every service, uniformly, is the one most teams never manage to do consistently by hand.",
          },
          {
            prompt: "Why are sidecar-free mesh modes being developed?",
            options: [
              "A proxy per instance costs CPU, memory and latency on every hop",
              "Sidecars cannot terminate TLS without the application's private key",
              "Control planes cannot configure more than a few thousand sidecars",
              "Kubernetes is removing support for injecting containers into pods",
            ],
            correctIndex: 0,
            explain:
              "That tax was the main objection to meshes, so the direction of travel is toward providing the same functions without one proxy per workload.",
          },
        ],
      },
      {
        id: "north-south-east-west",
        sources: [
          {
            label: "NIST SP 800-207: zero trust architecture",
            url: "https://csrc.nist.gov/pubs/sp/800/207/final",
            supports: "The argument that a request should be authenticated regardless of its network position, because a flat trusted interior turns one compromised component into access to everything on it.",
          },
        ],
        title: "The edge and the interior are different problems",
        level: "intermediate",
        body: [
          "Traffic entering the estate and traffic moving inside it have almost nothing in common, and conflating them produces designs that are wrong at one end. External traffic comes from clients you do not control, over networks you cannot measure, with credentials that may be stolen and volumes that may be hostile. Internal traffic comes from services you deployed, in a network you configured, and every caller has an identity you issued.",
          "So the concerns differ. At the edge: authentication of untrusted callers, per-tenant rate limiting, request size limits, bot mitigation, TLS termination and caching for anonymous traffic. Inside: identity between services, timeouts and retries with budgets, circuit breaking, load balancing that understands long-lived connections, and tracing that spans the whole call tree.",
          "Zero trust is the idea that the interior should not be treated as safe simply because it is the interior. A flat internal network where any service can call any other with no identity means one compromised component reaches everything, which is how a modest breach becomes a total one. Mutual TLS and per-service authorisation make lateral movement a series of separate obstacles rather than one.",
          "The mistake in the other direction is applying edge machinery inside. A heavyweight gateway between every pair of internal services adds a hop, a failure domain and a bottleneck to calls that were fine. Internal calls want the lightest thing that provides identity, timeouts and telemetry, which is the argument for a sidecar or a library rather than for a second gateway.",
          "The practical layering that most estates converge on is a CDN and a public gateway at the edge for untrusted traffic, and a mesh or a shared library inside for identity and resilience between services. Naming which layer a requirement belongs to is usually enough to settle an argument about where a feature should live.",
        ],
        why: "The two directions differ in who the caller is and what can be trusted about them, and every feature decision follows from that. The most common design error is a single layer expected to serve both, which ends up too heavy for internal calls and too naive for external ones.",
        inPractice:
          "Zero trust guidance from NIST and others makes the same argument for the interior: authenticate every call regardless of network position, because a flat trusted network turns one compromised component into access to everything on it.",
        diagram: {
          caption: "Untrusted callers at the edge, issued identities inside",
          columns: [
            [{ id: "world", label: "The internet", sub: "unknown callers", kind: "client" }],
            [{ id: "cdn", label: "CDN and gateway", sub: "auth, limits, bots, TLS", kind: "edge" }],
            [
              { id: "a", label: "Service A", sub: "identity issued by you", kind: "service" },
              { id: "b", label: "Service B", kind: "service" },
            ],
            [
              { id: "mesh", label: "Mesh or library", sub: "mTLS, timeouts, tracing", kind: "edge" },
              { id: "flat", label: "Flat, trusted", sub: "one breach reaches all", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "world", to: "cdn", label: "hostile until proven otherwise" },
            { from: "cdn", to: "a" },
            { from: "a", to: "mesh" },
            { from: "mesh", to: "b", label: "authenticated hop" },
            { from: "a", to: "flat", label: "no identity between services", async: true },
          ],
        },
        check: {
          prompt: "Why is a heavyweight gateway between internal services usually wrong?",
          options: [
            "It adds a hop, a bottleneck and a failure domain to calls that were fine",
            "Internal services cannot present the credentials a gateway requires",
            "Gateways cannot route traffic that does not originate externally",
            "It duplicates the load balancing already performed by the platform",
          ],
          correctIndex: 0,
          explain:
            "Internal calls want the lightest thing that gives identity, timeouts and telemetry. Edge machinery exists to handle untrusted callers, and inside there are none of those.",
        },
        checks: [
          {
            prompt: "What does zero trust say about the internal network?",
            options: [
              "Authenticate every call regardless of where it comes from",
              "Encrypt internal traffic but keep authentication at the edge",
              "Segment the network so that services can only reach their peers",
              "Treat internal callers as trusted once they pass the gateway",
            ],
            correctIndex: 0,
            explain:
              "Position on a network is not evidence of anything. Without per-call identity, one compromised component can reach everything, which is how a modest breach becomes a total one.",
          },
          {
            prompt: "Which concern belongs at the edge rather than inside?",
            options: [
              "Bot mitigation and per-tenant rate limiting of untrusted callers",
              "Timeouts and retry budgets between two of your own services",
              "Circuit breaking when a downstream dependency degrades",
              "Tracing context propagated across a multi-service call tree",
            ],
            correctIndex: 0,
            explain:
              "It exists because the caller is unknown and possibly hostile. The other three are properties of calls between components you deployed and can identify.",
          },
          {
            prompt: "What usually settles an argument about where a feature belongs?",
            options: [
              "Naming whether the caller is untrusted or one you issued identity to",
              "Measuring which layer adds less latency to the request path",
              "Deciding which team has capacity to own the implementation",
              "Checking whether the platform already provides it by default",
            ],
            correctIndex: 0,
            explain:
              "The two directions differ in what can be assumed about the caller, and nearly every requirement lands cleanly on one side once that question is asked out loud.",
          },
        ],
      },
    ],
  },

  {
    id: "ml-systems",
    title: "Machine learning systems in production",
    summary: "Serving, features, drift and evaluation, treated as an operational problem rather than a modelling one.",
    track: "design",
    topics: [
      {
        id: "ml-serving",
        title: "Serving a model",
        level: "intermediate",
        body: [
          "A model in production is a service with unusual resource requirements and entirely ordinary operational needs. It has a latency budget, a capacity limit, a deployment process and a rollback path, and treating it as a research artefact that happens to be reachable over HTTP is how most of the problems start.",
          "The first decision is online against batch. Batch inference computes predictions on a schedule and stores them, which is simple, cheap, easy to monitor, and only works when the input is known in advance: recommendations for known users, risk scores updated nightly. Online inference computes on request, which is required when the input arrives with the request and costs you a latency budget and capacity planning for peak.",
          "Batching and hardware dominate the cost of the online path. Model inference is far more efficient on batches than on single requests, so a server collects requests for a few milliseconds and runs them together, which trades a little latency for a large increase in throughput. Deciding that window is the main tuning knob, and it is the same accumulate-then-flush trade as everywhere else in this material.",
          "Loading is the operational trap. Large models take a long time to load into memory, so a naive autoscaling policy scales up long after the traffic arrived and a rolling deploy briefly halves capacity. Pre-warming, keeping a spare instance and treating model load time as a first-class number in the deployment plan are what stop that being discovered during a spike.",
          "Everything else is ordinary discipline applied to an unusual payload. Version the model, be able to roll back to the previous one without a rebuild, keep the preprocessing code alongside the weights so they cannot drift apart, and log the inputs and outputs, which is the only way anything in the next three topics is possible.",
        ],
        why: "Most production failures in machine learning systems are ordinary systems failures: capacity, deployment, versioning and rollback. Treating the model as a normal service with an expensive payload gets you most of the way, and the parts that are genuinely different come later, in the data.",
        inPractice:
          "Serving frameworks batch incoming requests on a short window precisely because inference is far more efficient per item on a batch, which is why the request-level trade is the first thing tuned in any latency-sensitive deployment.",
        diagram: {
          caption: "Two shapes, with a different bill each",
          columns: [
            [{ id: "req", label: "Prediction needed", kind: "client" }],
            [
              { id: "batch", label: "Batch", sub: "precomputed, stored", kind: "service" },
              { id: "online", label: "Online", sub: "computed on request", kind: "service" },
            ],
            [
              { id: "store", label: "Lookup", sub: "cheap, possibly stale", kind: "data" },
              { id: "win", label: "Micro-batch window", sub: "few ms, big throughput win", kind: "edge" },
            ],
            [{ id: "load", label: "Model load time", sub: "the autoscaling trap", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "req", to: "batch", label: "input known in advance" },
            { from: "req", to: "online", label: "input arrives with it" },
            { from: "batch", to: "store" },
            { from: "online", to: "win" },
            { from: "online", to: "load", label: "scale up arrives late", async: true },
          ],
        },
        check: {
          prompt: "When is batch inference the right choice?",
          options: [
            "When the input is known in advance and staleness is acceptable",
            "When the model is too large to load into a serving instance",
            "When predictions must reflect the most recent user action",
            "When the latency budget is under a hundred milliseconds",
          ],
          correctIndex: 0,
          explain:
            "Precomputing on a schedule is simpler, cheaper and easier to monitor. It stops being possible the moment the input arrives with the request, which is what forces the online path.",
        },
        checks: [
          {
            prompt: "Why do serving systems batch requests over a few milliseconds?",
            options: [
              "Inference is far more efficient per item on a batch than singly",
              "It smooths bursts so autoscaling has time to add capacity",
              "It allows requests from one user to be deduplicated before scoring",
              "It is required to use a graphics processor rather than a CPU",
            ],
            correctIndex: 0,
            explain:
              "A little latency buys a large throughput increase, which is the same accumulate-then-flush trade as batching writes or coalescing updates. The window size is the main tuning knob.",
          },
          {
            prompt: "Why does model load time matter for autoscaling?",
            options: [
              "New capacity arrives long after the traffic that triggered it",
              "Loading blocks the health check, so instances are marked unhealthy",
              "Each load re-reads the weights from storage, which is billed per read",
              "Instances cannot serve while another instance is loading a model",
            ],
            correctIndex: 0,
            explain:
              "A scale-up that takes minutes is not a response to a spike that lasts minutes. Pre-warming and keeping headroom are the answers, and treating load time as a planned number is what prevents the surprise.",
          },
          {
            prompt: "Why keep preprocessing code alongside the model weights?",
            options: [
              "Otherwise the two drift apart and inputs are transformed differently",
              "Otherwise the model cannot be loaded without recompiling it",
              "Otherwise the weights cannot be versioned independently of the code",
              "Otherwise batch and online paths cannot share the same artefact",
            ],
            correctIndex: 0,
            explain:
              "The model was trained on transformed inputs, so the transformation is part of it. Versioning them separately is how a deployment starts scoring differently for reasons nobody can find.",
          },
        ],
      },
      {
        id: "ml-features",
        title: "Features, and the skew that ruins them",
        level: "advanced",
        body: [
          "A model consumes features, which are values computed from raw data: how many orders this customer placed in the last week, the average basket size, whether the address changed recently. Computing those consistently is most of the engineering, and getting it inconsistent is the defining failure of production machine learning.",
          "Training and serving skew is that failure. Training features are computed in a batch job over historical data, and serving features are computed in a service on a live request, and the two are written by different people at different times in different languages. Any difference in a default, a time zone, a rounding rule or a null handling produces a model that performs well in evaluation and worse in production, with nothing failing anywhere.",
          "Time travel is the subtler version and it flatters the model instead. If a training example for a purchase on Tuesday includes a feature computed from data that only existed on Wednesday, the model has learned from the future, and its offline accuracy is excellent and meaningless. Every feature has to be computed as of the moment the prediction would have been made, which is a discipline the data makes very easy to violate.",
          "A feature store exists to make those two problems structural rather than a matter of care. One definition per feature, used to compute both the training set and the serving values, with point-in-time correct joins for the historical case. Whether the tool is worth its complexity depends on scale, and the property it enforces is worth having even when the implementation is a shared library and a convention.",
          "The freshness question then splits the store in two. Features derived from slow-moving data can be computed in batch and read at serving time, while features that depend on what the user did thirty seconds ago need a streaming path. Most production systems run both, and knowing which features need which is a product decision rather than an engineering preference.",
        ],
        why: "The model is rarely the problem. Features computed one way for training and another for serving produce a system that evaluates well and performs badly, and nothing in the pipeline reports an error, which is why the same definition has to feed both paths.",
        inPractice:
          "Feature stores exist specifically to serve one definition to both training and inference, with point-in-time correct joins for historical data. The property matters more than the product: even a shared library beats two implementations that agree by coincidence.",
        diagram: {
          caption: "One definition, two paths, or a discrepancy nobody sees",
          columns: [
            [{ id: "raw", label: "Raw data", kind: "data" }],
            [
              { id: "def", label: "One definition", sub: "feature store or library", kind: "service" },
              { id: "two", label: "Two implementations", sub: "batch and service", kind: "service", alternative: true },
            ],
            [
              { id: "train", label: "Training set", sub: "point-in-time correct", kind: "data" },
              { id: "serve", label: "Serving values", kind: "data" },
            ],
            [
              { id: "good", label: "Evaluation misleads", kind: "edge" },
              { id: "skew", label: "Good offline only", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "raw", to: "def" },
            { from: "raw", to: "two" },
            { from: "def", to: "train" },
            { from: "def", to: "serve" },
            { from: "train", to: "good" },
            { from: "two", to: "skew", label: "no error anywhere" },
          ],
        },
        check: {
          prompt: "A model performs well in evaluation and worse in production. What is the classic cause?",
          options: [
            "Training and serving features computed by different implementations",
            "A model too large to run within the serving latency budget",
            "Insufficient training data for the population seen in production",
            "A random seed that differed between training and evaluation runs",
          ],
          correctIndex: 0,
          explain:
            "Any difference in a default, a time zone or a null rule changes the input the model sees. Nothing errors, which is why it is diagnosed slowly and why one definition feeding both paths is the structural fix.",
        },
        checks: [
          {
            prompt: "What is time travel in a training set?",
            options: [
              "A feature computed from data that did not exist at prediction time",
              "A training example whose label was recorded before its features",
              "A pipeline that reprocesses old data with a newer feature definition",
              "A model evaluated on a period that overlaps its training window",
            ],
            correctIndex: 0,
            explain:
              "The model learns from the future, so offline accuracy is excellent and meaningless. Point-in-time correctness means every feature is computed as of the moment the prediction would have been made.",
          },
          {
            prompt: "Why do most production systems run both batch and streaming feature paths?",
            options: [
              "Slow-moving features are cheap in batch; recent behaviour is not",
              "Batch is used for training and streaming exclusively for serving",
              "Streaming is a fallback for when the batch job fails to complete",
              "Regulators require that historical features be recomputed daily",
            ],
            correctIndex: 0,
            explain:
              "Freshness requirements differ per feature. Deciding which features genuinely need to reflect the last thirty seconds is a product question, and answering it wholesale in either direction is expensive.",
          },
          {
            prompt: "What property matters more than the feature store product itself?",
            options: [
              "That one definition computes both training and serving values",
              "That features are stored in a low-latency key-value database",
              "That every feature has an owner and a documented meaning",
              "That historical features are retained for model reproducibility",
            ],
            correctIndex: 0,
            explain:
              "Two implementations agreeing by coincidence is the failure. A shared library and a convention deliver the property; the product is one way to enforce it at scale.",
          },
        ],
      },
      {
        id: "ml-drift",
        title: "Drift, monitoring and knowing it still works",
        level: "advanced",
        body: [
          "A deployed model degrades without anything changing in its code, because the world it was trained on moves. Data drift is the input distribution shifting: new customer segments, a new device type, a marketing campaign bringing different traffic. Concept drift is the relationship changing: behaviour that predicted fraud last year predicts nothing now because the fraudsters adapted.",
          "That makes monitoring a model different from monitoring a service. Latency and error rate say nothing about whether the predictions are still any good, and a model that has quietly stopped working produces perfectly healthy dashboards. What has to be watched is the input distribution against training, the output distribution over time, and, wherever possible, the actual outcome.",
          "Ground truth usually arrives late and sometimes never. Whether a transaction was fraudulent is known when a chargeback arrives weeks later; whether a recommendation was good is inferred from a click that may mean several things. So monitoring has to work in two layers: proxy signals available immediately, such as the score distribution and the rate of predictions near a decision boundary, and the real measure when it eventually lands.",
          "Feedback loops are the failure that is specific to this domain. A model that ranks items influences which items are seen, which produces the training data for the next model, which learns from a world its predecessor shaped. Without deliberate randomisation, or holdout traffic that the model does not influence, a system can become extremely confident about a world it created rather than one it observed.",
          "Retraining is therefore a scheduled operational activity rather than a response to a complaint, and it needs the same rigour as a deploy: a new model version, an evaluation against a held-out set, a shadow or canary period against live traffic, and a rollback path. A model updated by copying a file onto a server is a deployment with none of the controls anyone would accept for code.",
        ],
        why: "A model can stop working while every service metric stays green, because the failure is in the relationship between input and outcome rather than in the software. That is why input and output distributions, and a path to real outcomes however delayed, are the monitoring that actually matters.",
        inPractice:
          "Holdout traffic that the model does not influence is the standard defence against feedback loops, because it is the only source of data about a world the system did not shape. It costs a slice of performance and it is what keeps the evaluation honest.",
        diagram: {
          caption: "Green dashboards, degrading predictions",
          columns: [
            [{ id: "world", label: "The world", sub: "moves without telling you", kind: "client" }],
            [
              { id: "data", label: "Data drift", sub: "inputs shift", kind: "external" },
              { id: "concept", label: "Concept drift", sub: "the relationship shifts", kind: "external" },
            ],
            [{ id: "model", label: "Model", sub: "latency and errors fine", kind: "service" }],
            [
              { id: "proxy", label: "Proxy signals", sub: "score distribution now", kind: "data" },
              { id: "truth", label: "Ground truth", sub: "weeks later, if ever", kind: "data" },
              { id: "loop", label: "Feedback loop", sub: "trained on its own effects", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "world", to: "data" },
            { from: "world", to: "concept" },
            { from: "data", to: "model" },
            { from: "concept", to: "model" },
            { from: "model", to: "proxy", label: "watch immediately" },
            { from: "model", to: "truth", label: "confirm later" },
            { from: "model", to: "loop", label: "unless traffic is held out", async: true },
          ],
        },
        check: {
          prompt: "Why is service monitoring insufficient for a deployed model?",
          options: [
            "Latency and errors say nothing about whether predictions are still good",
            "Models emit no metrics unless the framework is configured to do so",
            "Inference errors are swallowed by the batching layer before reporting",
            "Model failures always appear as increased latency rather than errors",
          ],
          correctIndex: 0,
          explain:
            "The failure is in the relationship between input and outcome, which no service metric measures. A model that has stopped working produces entirely healthy dashboards.",
        },
        checks: [
          {
            prompt: "What is the difference between data drift and concept drift?",
            options: [
              "One is the inputs changing; the other is what they imply changing",
              "One happens gradually; the other happens as a sudden step change",
              "One affects training data; the other affects serving data only",
              "One is detectable offline; the other only through live experiments",
            ],
            correctIndex: 0,
            explain:
              "New traffic from a different segment is data drift. Fraudsters adapting so old signals no longer indicate fraud is concept drift, and only the second means the model has learned something that stopped being true.",
          },
          {
            prompt: "Why is holdout traffic worth its cost?",
            options: [
              "It is the only data about a world the model did not shape",
              "It provides a control group for measuring latency improvements",
              "It allows the previous model version to be kept warm for rollback",
              "It reduces load, giving the serving fleet headroom during spikes",
            ],
            correctIndex: 0,
            explain:
              "Without it, tomorrow's training data is a product of today's model, and the system becomes confident about a world it created. That is the feedback loop specific to this domain.",
          },
          {
            prompt: "How should retraining be treated operationally?",
            options: [
              "As a deployment: versioned, evaluated, canaried, with a rollback",
              "As a data pipeline run, monitored for completion and freshness",
              "As a research activity, validated offline before being copied over",
              "As a scheduled maintenance task performed during a quiet window",
            ],
            correctIndex: 0,
            explain:
              "A new model is new behaviour in production. Copying a file onto a server is a deployment with none of the controls anybody would accept for a code change.",
          },
        ],
      },
    ],
  },

  {
    id: "edge",
    title: "Computing at the edge",
    summary: "What moves to the edge, what cannot, and the constraints that make edge code a different runtime.",
    track: "design",
    topics: [
      {
        id: "edge-what-moves",
        title: "What actually belongs at the edge",
        level: "intermediate",
        body: [
          "The edge stopped being a cache some time ago. Code now runs in the same locations that serve cached bytes, which means work can happen close to the user instead of at an origin that may be a continent away, and the interesting question is which work.",
          "The clear wins are decisions that need little or no state. Routing, redirects, A/B assignment, geographic personalisation, request rewriting, authentication checks against a token that can be verified locally, and bot filtering. Each removes a round trip to origin for a decision that takes microseconds, and on a connection with a hundred millisecond round trip that is the entire perceived improvement.",
          "The clear losses are anything that needs the database. If the code has to read the primary to decide, running it near the user has made the situation worse: the user's request now crosses the ocean from the edge rather than from a nearby origin, and it has added a hop. Edge compute is fast because it is near the user, and that advantage is spent the moment it has to talk to something that is not.",
          "Between those sits the genuinely interesting case: serving a cached page and personalising it at the edge, so the invariant part is a cache hit for everyone and the variable part is filled in nearby. That is the technique that makes personalised pages cacheable at all, and it is why edge compute changed what a CDN is for rather than merely making it faster.",
          "The rule to carry is that the edge is for decisions, not for data. A decision needs the request and a small amount of local information, and a decision made in three milliseconds near the user beats the same decision made in one millisecond a hundred milliseconds away, every time.",
        ],
        why: "Moving computation near the user only helps when the computation does not immediately need something far away. That single test, does this need the database, sorts almost every candidate workload correctly and prevents the usual mistake of moving a data-dependent handler to the edge and making it slower.",
        inPractice:
          "This site runs its API in edge workers and keeps the learning material in prerendered static files precisely on that division: decisions and small stateful operations near the reader, and the large body of content served as bytes that need no computation at all.",
        diagram: {
          caption: "Decisions near the user; data where the data is",
          columns: [
            [{ id: "user", label: "User", sub: "100ms from origin", kind: "client" }],
            [{ id: "edge", label: "Edge", sub: "3ms away", kind: "edge" }],
            [
              { id: "dec", label: "Decisions", sub: "routing, auth, tests", kind: "service" },
              { id: "data", label: "Needs the database", sub: "worse at the edge", kind: "service", alternative: true },
            ],
            [{ id: "origin", label: "Origin", sub: "and the primary database", kind: "data" }],
          ],
          edges: [
            { from: "user", to: "edge" },
            { from: "edge", to: "dec", label: "answered locally" },
            { from: "edge", to: "data", label: "still has to cross" },
            { from: "data", to: "origin", label: "an extra hop, not fewer" },
          ],
        },
        check: {
          prompt: "Which workload is a poor fit for edge compute?",
          options: [
            "A handler that must read the primary database to decide",
            "An A/B assignment based on a hash of the request",
            "A redirect chosen from the visitor's country",
            "A token verified against a public key held locally",
          ],
          correctIndex: 0,
          explain:
            "The advantage is proximity to the user, and it is spent immediately if the code must talk to something far away. That adds a hop rather than removing one.",
        },
        checks: [
          {
            prompt: "What did edge compute change about caching personalised pages?",
            options: [
              "The invariant part can be cached and the variable part filled in nearby",
              "Personalised responses can now be cached per user at each location",
              "Cache keys can include the user identity without splitting the cache",
              "Origins no longer need to mark personalised responses as private",
            ],
            correctIndex: 0,
            explain:
              "The reason personalised pages could not be cached was that one piece varied. Assembling the page at the edge lets the shared part be a hit for everybody while the personal part is computed close to them.",
          },
          {
            prompt: "What is the single most useful test for an edge workload?",
            options: [
              "Does it need something that lives far away in order to decide",
              "Does it complete within the platform's CPU time limit",
              "Is the response cacheable for more than a few seconds",
              "Does it require more memory than the runtime provides",
            ],
            correctIndex: 0,
            explain:
              "The other three are real constraints and they are secondary. Proximity is the whole benefit, and a workload that immediately reaches back to origin has spent it before doing anything.",
          },
          {
            prompt: "Why does removing one round trip matter so much at the edge?",
            options: [
              "On a high-latency connection the round trip is most of the wait",
              "Each round trip forces a new TLS handshake at the origin",
              "Round trips are billed individually by most edge platforms",
              "Browsers limit how many round trips a page may perform",
            ],
            correctIndex: 0,
            explain:
              "A decision taking microseconds is irrelevant next to a hundred milliseconds of travel. That is why the improvement from moving a decision to the edge is so much larger than its compute time suggests.",
          },
        ],
      },
      {
        id: "edge-constraints",
        title: "A different runtime, with different rules",
        level: "advanced",
        body: [
          "Edge platforms do not run ordinary servers. They run many small isolated contexts inside a shared runtime, started per request in microseconds rather than as containers, which is what makes them cheap enough to place in hundreds of locations. That model buys the startup time and imposes constraints that surprise anyone porting existing code.",
          "The limits are real and worth knowing in advance. CPU time per request is measured in milliseconds rather than seconds. Memory is tens of megabytes. The available APIs are web standard rather than the full runtime of the language, so a library depending on the filesystem or on raw sockets may simply not work. And the process does not persist, so nothing can be kept in memory between requests as though it were a server.",
          "Statelessness is the constraint that shapes the design. There is no local disk and no reliable in-process cache, so state lives in a platform service: a key-value store with eventual consistency, an object store, a database designed to be reachable from many locations, or a coordination primitive that pins a piece of state to one place. Each has a latency and consistency profile that has to be chosen deliberately.",
          "Data locality then becomes the central design question, because a globally distributed compute layer over a single-region database is a distributed system with a hundred fast front ends and one slow shared dependency. The patterns that work are reading locally from replicated storage, writing to a home region, and pushing anything genuinely global through a mechanism designed for it rather than through the database by accident.",
          "None of this makes the edge unsuitable, it makes it a specific tool. Small, fast, stateless work with a nearby state store is what it does extremely well. A long-running job, a large in-memory model, or a handler that needs a transaction against a primary is what it does badly, and knowing the boundary is more valuable than any amount of tuning on the wrong side of it.",
        ],
        why: "The edge is a different runtime rather than a nearer server: milliseconds of CPU, tens of megabytes, web-standard APIs and no persistence between requests. Those constraints are what make the model cheap enough to place everywhere, and they decide what can be moved there without a rewrite.",
        inPractice:
          "The isolate model, many lightweight contexts in one runtime rather than a container per tenant, is what removes cold starts and makes hundreds of locations economic. The constraints on CPU, memory and available APIs follow directly from that choice.",
        diagram: {
          caption: "The constraints follow from the model that makes it cheap",
          columns: [
            [{ id: "iso", label: "Isolate per request", sub: "starts in microseconds", kind: "edge" }],
            [
              { id: "cpu", label: "Milliseconds of CPU", kind: "data" },
              { id: "mem", label: "Tens of MB", kind: "data" },
              { id: "api", label: "Web-standard APIs", kind: "data" },
            ],
            [{ id: "state", label: "No persistence", sub: "nothing kept between requests", kind: "external" }],
            [
              { id: "kv", label: "Edge key-value", sub: "eventually consistent", kind: "data" },
              { id: "home", label: "Home region", sub: "for writes and transactions", kind: "data" },
            ],
          ],
          edges: [
            { from: "iso", to: "cpu" },
            { from: "iso", to: "mem" },
            { from: "iso", to: "api" },
            { from: "iso", to: "state" },
            { from: "state", to: "kv", label: "read locally" },
            { from: "state", to: "home", label: "write centrally" },
          ],
        },
        check: {
          prompt: "Why do edge platforms impose tight CPU and memory limits?",
          options: [
            "Many isolates share a runtime, which is what removes the cold start",
            "Edge locations use lower-powered hardware than a central region",
            "Limits prevent a single tenant from exhausting network bandwidth",
            "Billing is per invocation, so limits keep the pricing predictable",
          ],
          correctIndex: 0,
          explain:
            "The constraints and the startup time come from the same design decision. A container per tenant would remove the limits and reintroduce the cold start that makes placing code everywhere impractical.",
        },
        checks: [
          {
            prompt: "What is the practical consequence of no persistence between requests?",
            options: [
              "State must live in a platform service chosen for its consistency profile",
              "Every request must re-authenticate, since sessions cannot be cached",
              "Responses cannot be cached, because there is nowhere to store them",
              "Long-lived connections are impossible at the edge in any form",
            ],
            correctIndex: 0,
            explain:
              "There is no local disk and no dependable in-process cache, so the design question becomes which store and with what guarantees, rather than whether to keep something in memory.",
          },
          {
            prompt: "What goes wrong with edge compute over a single-region database?",
            options: [
              "A hundred fast front ends sharing one slow distant dependency",
              "Connection limits, since each location opens its own pool",
              "Writes arrive out of order because locations have independent clocks",
              "Queries are billed per location rather than per query executed",
            ],
            correctIndex: 0,
            explain:
              "The compute is distributed and the data is not, so every request still crosses the distance. Connection pressure is a real secondary effect and the geography is the primary one.",
          },
          {
            prompt: "Which workload is well matched to an edge runtime?",
            options: [
              "Small stateless work with a nearby state store",
              "A long-running job that processes a large batch of records",
              "An in-memory model of several gigabytes serving predictions",
              "A handler that opens a transaction against the primary database",
            ],
            correctIndex: 0,
            explain:
              "The runtime is built for short, cheap, isolated work. The other three run into CPU time, memory and locality limits respectively, and no tuning moves them to the right side of that boundary.",
          },
        ],
      },
      {
        id: "edge-security",
        title: "The edge as the security boundary",
        level: "intermediate",
        body: [
          "The most valuable property of the edge is not speed, it is that hostile traffic can be refused before it reaches anything you own. A request absorbed in a location near its source never consumes origin capacity, never opens a database connection and never runs a line of your code, which is a different kind of protection from a service that handles the request efficiently.",
          "Volumetric attacks make the argument by themselves. A distributed denial of service that would saturate an origin's link is spread across hundreds of locations, each seeing a fraction, and absorbed by capacity that exists anyway for legitimate traffic. No origin-side rate limiter helps with an attack that fills the pipe before arriving, because the damage is done upstream of anything you control.",
          "The layer above that is deciding who is worth serving. Bot management, filtering by reputation, challenges for suspicious clients and blocking obviously malformed requests all belong here, because each is a decision needing only the request and some shared intelligence. Doing the same work at origin means paying for the connection and the compute to reject something you did not want.",
          "Rate limiting at the edge is subtly better than at origin for a reason worth stating: the edge sees the whole picture. A limiter running on each origin instance sees only its own share of the traffic, so a limit of a hundred a minute becomes a hundred per instance, while the edge counts the caller across every location and applies the limit that was actually intended.",
          "The mistake is treating the edge as sufficient. It is a filter, not an authorisation system, and anything reachable by a request that gets past it still needs its own checks, because a leaked origin address, an internal caller or a rule that is one release out of date will all bypass it. Defence in depth means the edge removes the volume and the origin still refuses what it should refuse.",
        ],
        why: "Refusing traffic near its source is qualitatively different from handling it efficiently at origin, because the cost is paid by capacity that already exists for other reasons. The corollary is that the edge is a filter rather than a control: everything behind it still has to defend itself.",
        inPractice:
          "Large content networks absorb volumetric attacks by spreading them across hundreds of locations, which is capacity no individual origin could justify. The same distribution that makes them fast is what makes them able to soak up traffic nobody wants.",
        diagram: {
          caption: "Refuse it before it costs you anything",
          columns: [
            [
              { id: "good", label: "Real users", kind: "client" },
              { id: "bad", label: "Attack traffic", sub: "volumetric or scripted", kind: "client", alternative: true },
            ],
            [{ id: "edge", label: "Edge", sub: "hundreds of locations", kind: "edge" }],
            [
              { id: "drop", label: "Refused here", sub: "no origin cost at all", kind: "data" },
              { id: "pass", label: "Passed through", sub: "rate limited globally", kind: "data" },
            ],
            [{ id: "origin", label: "Origin", sub: "still checks everything", kind: "service" }],
          ],
          edges: [
            { from: "good", to: "edge" },
            { from: "bad", to: "edge" },
            { from: "edge", to: "drop", label: "absorbed near the source" },
            { from: "edge", to: "pass" },
            { from: "pass", to: "origin", label: "authorised again here" },
          ],
        },
        check: {
          prompt: "Why can an origin-side rate limiter not defend against a volumetric attack?",
          options: [
            "The link is saturated before the request reaches anything you control",
            "Rate limiters cannot count requests quickly enough at attack volumes",
            "Attack traffic arrives on connections the limiter does not inspect",
            "The limiter itself becomes the bottleneck once it starts rejecting",
          ],
          correctIndex: 0,
          explain:
            "The damage happens upstream of your code. Absorbing it across hundreds of locations uses capacity that exists anyway, which is protection an origin cannot provide for itself at any efficiency.",
        },
        checks: [
          {
            prompt: "Why is rate limiting at the edge more accurate than at each origin instance?",
            options: [
              "The edge counts a caller across every location rather than per instance",
              "The edge sees the client's real address before any proxy rewrites it",
              "Origin limiters cannot apply per-tenant limits without a shared store",
              "The edge can reject before TLS termination, which origins cannot",
            ],
            correctIndex: 0,
            explain:
              "A per-instance limiter turns a limit of a hundred a minute into a hundred per instance. Counting where the traffic converges applies the limit that was actually intended.",
          },
          {
            prompt: "What must remain true even with a well-configured edge?",
            options: [
              "Everything behind it still authorises requests for itself",
              "The origin address must never appear in any DNS record",
              "All internal traffic must be routed back out through the edge",
              "The edge rules must be redeployed with every application release",
            ],
            correctIndex: 0,
            explain:
              "It is a filter, not an authorisation system. A leaked origin address, an internal caller or a stale rule all bypass it, which is why defence in depth is the arrangement rather than a slogan.",
          },
          {
            prompt: "Which work is best done at the edge rather than at origin?",
            options: [
              "Rejecting malformed and obviously hostile requests before they cost anything",
              "Checking whether the authenticated user owns the record being requested",
              "Validating that a request body matches the endpoint's expected schema",
              "Deciding which database replica should serve a particular query",
            ],
            correctIndex: 0,
            explain:
              "It needs only the request and some shared intelligence, and rejecting it there costs nothing. The other three need context the edge does not have and belong where that context lives.",
          },
        ],
      },
    ],
  },
];
