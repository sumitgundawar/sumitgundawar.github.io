import type { Card } from "./types";

/* Application security. The identity card covers who you are and what you may
   do; this covers everything an attacker does with input you accepted.
   Correct answers are distributed across positions deliberately, and the
   distractors are the mistakes people actually make. */

export const security: Card[] = [
  {
    id: "appsec",
    title: "Application security",
    summary: "Injection, XSS, CSRF, SSRF, the failures that turn a bug into a breach.",
    track: "practice",
    topics: [
      {
        id: "sql-injection",
        title: "Injection and parameterised queries",
        level: "beginner",
        body: [
          "Injection happens when input is concatenated into a command, SQL, a shell line, an LDAP filter, so the input can end the data and start being instruction.",
          "Escaping is the wrong fix, because it requires getting every context right forever. Parameterised queries send the statement and the values on separate channels, so the value can never be parsed as syntax.",
          "An ORM is not automatic protection. Most expose a raw query escape hatch, and that is where injection reappears.",
        ],
        why: "Parameterisation removes the class of bug rather than the instance. Escaping means every new call site is another chance to get it wrong, and one miss is enough.",
        check: {
          prompt: "Your ORM is used everywhere and one report endpoint builds SQL by string concatenation for a dynamic ORDER BY. What is the exposure?",
          options: [
            "None, the ORM parameterises the values, and only values can be injected",
            "Injection via ORDER BY, which takes an identifier and so needs an allowlist",
            "Injection, but only if the column name is taken from the URL query string",
            "None, provided the value is escaped for quotes before concatenation",
          ],
          correctIndex: 1,
          explain: "Identifiers such as column names are not bindable as parameters, so dynamic ORDER BY needs an allowlist. Quote-escaping does not help when the injection point is an identifier rather than a string literal.",
        },
      },
      {
        id: "xss",
        title: "Cross-site scripting",
        level: "intermediate",
        body: [
          "XSS is injection into a page rather than a query: attacker-controlled text is rendered as markup, so their script runs with your origin's privileges, including the user's session.",
          "React escapes interpolated values by default, which removes most of it. The holes are dangerouslySetInnerHTML, injecting into a href or src, and anything written into a script or style context.",
          "A Content Security Policy limits the damage when something does slip through, by refusing to execute inline or third-party script.",
        ],
        why: "Framework escaping handles the common path, so the remaining risk concentrates in the few places you deliberately bypass it. Those are worth auditing by name rather than trusting the framework globally.",
        check: {
          prompt: "A profile field is rendered with React interpolation. Where does XSS remain possible?",
          options: [
            "In the interpolated text, if it contains a script tag written as markup",
            "If the field is placed in a title attribute, which React does not escape",
            "If the field is used as a link href, since javascript: URLs are not escaped",
            "Only when the page is server-rendered, since hydration re-parses the HTML",
          ],
          correctIndex: 2,
          explain: "Interpolated text is escaped, but a value used as a URL is not validated as one. A javascript: href executes on click, so URL fields need a scheme allowlist.",
        },
      },
      {
        id: "csrf",
        title: "CSRF and SameSite",
        level: "intermediate",
        body: [
          "CSRF abuses the fact that browsers attach cookies automatically. Another site submits a form to yours, the cookie rides along, and the request is authenticated even though the user never intended it.",
          "SameSite=Lax on session cookies stops the cross-site case for form posts, and is the default in current browsers. A synchroniser token is the belt-and-braces version.",
          "Authorization headers are not attached automatically, so token-in-header APIs are not exposed to classic CSRF the way cookie sessions are.",
        ],
        why: "Whether you need CSRF protection follows directly from how you carry the session. Cookies are ambient authority and need it; an explicit Authorization header is not sent by a third-party page and does not.",
        check: {
          prompt: "Your API authenticates with a bearer token in an Authorization header, set by your SPA. Do you need CSRF tokens?",
          options: [
            "Yes, since any state-changing endpoint needs a synchroniser token",
            "Only if the token is also mirrored into a cookie for convenience",
            "Only when the API and the SPA are served from different origins",
            "Not for classic CSRF, the browser does not attach that header cross-site",
          ],
          correctIndex: 3,
          explain: "CSRF depends on credentials being sent automatically. A header your own script sets is not, so the cross-site form post arrives unauthenticated. Move the token to a cookie and the exposure returns.",
        },
      },
      {
        id: "ssrf",
        title: "SSRF and the metadata endpoint",
        level: "advanced",
        body: [
          "SSRF is making your server fetch a URL an attacker chose. Any feature that takes a URL, webhook registration, image import, link preview, is a candidate.",
          "The damage is that your server sits inside the network. It can reach internal services, admin panels and, on a cloud instance, the metadata endpoint that hands out credentials.",
          "Blocklisting hostnames fails. DNS can resolve to an internal address, and a redirect moves the target after you have validated it.",
          "What works is checking the resolved address rather than the string, re-checking it on every redirect hop, or egressing through a proxy that only permits known hosts. The proxy is the only one of the three that stays correct when somebody adds a new URL-fetching feature and never hears about the rule.",
        ],
        why: "Validating the URL string is the intuitive fix and the one that does not hold, because the string is not what gets connected to. The check has to happen on the resolved address, at connect time, on every hop.",
        inPractice: "The 2019 Capital One breach began with SSRF used to reach the instance metadata service and retrieve role credentials.",
        check: {
          prompt:
            "You reject submitted webhook URLs whose host is in any private or link-local range. Assume the range list is complete. Why is this still insufficient?",
          options: [
            "The hostname is resolved after the check, so DNS and redirects can retarget the request",
            "The list omits the IPv6 forms of those ranges, which resolve to the same services",
            "Requiring HTTPS closes the gap, since internal services lack a valid certificate",
            "Range blocking rejects legitimate customers whose endpoints sit behind NAT",
          ],
          correctIndex: 0,
          explain:
            "Every option here describes something real, but only the first survives a complete range list. You validated a string; the connection is made to whatever the name resolves to at connect time, and a 302 moves the target again after that. Validation has to happen on the resolved IP, on every hop.",
        },
      },
      {
        id: "supply-chain",
        title: "Dependencies and supply chain",
        level: "advanced",
        body: [
          "Most of what ships is code you did not write. A postinstall script in any transitive dependency runs with your build's privileges, which is a direct path to your CI secrets.",
          "Lockfiles pin versions, which is necessary and not sufficient, a compromised version can be published under a number you have already pinned to, and typosquatted names sit one keystroke from real ones.",
          "The cheap wins are a lockfile, automated updates so you are never far behind, minimal CI token scope, and treating the dependency count itself as a cost.",
        ],
        why: "The threat model is that adding a dependency grants its author execution on your build machine. That reframes 'is this library any good' into 'do I trust this author with my deploy credentials', which is the question that actually matters.",
        check: {
          prompt: "Which most reduces supply chain risk for a small team?",
          options: [
            "Reviewing the source of every direct dependency before adding it to the tree",
            "Pinning every version and holding them, so no unreviewed code ever arrives",
            "Fewer dependencies, a lockfile, prompt updates, and least-privilege CI tokens",
            "Vendoring everything into the repository, so builds never fetch anything",
          ],
          correctIndex: 2,
          explain: "Auditing everything does not scale and never updating accumulates known vulnerabilities. Reducing count, staying current, and limiting what a compromised build can reach are the levers a small team can actually pull.",
        },
      },
    ],
  },

  {
    id: "isolation",
    title: "Transactions and isolation",
    summary: "MVCC, snapshot isolation, write skew, and the anomalies your default level allows.",
    track: "design",
    topics: [
      {
        id: "isolation-levels",
        title: "The four levels and what each permits",
        level: "intermediate",
        body: [
          "The four levels are defined by the anomalies they forbid, which is a more useful way to hold them than as a ladder of strength. Read uncommitted allows dirty reads, seeing another transaction's uncommitted work. Read committed forbids that and still allows non-repeatable reads: the same query run twice in one transaction can return different values, because someone committed in between.",
          "Repeatable read forbids that too for rows already read, and in the classical definition still permits phantoms: rows appearing in a range you queried earlier. Serializable is the only level that guarantees the outcome matches some serial order of the transactions, which is the guarantee people assume they have all along.",
          "The defaults differ and matter more than the definitions. Postgres defaults to read committed and its repeatable read is really snapshot isolation, which does prevent phantoms in the classical sense while still permitting write skew. MySQL InnoDB defaults to repeatable read and prevents many phantoms with gap locks, which is a different mechanism with different deadlock behaviour. Two engines, the same words, materially different behaviour.",
          "Serializable is implemented in two very different ways, and knowing which decides how it fails. Two-phase locking makes transactions wait, so contention appears as blocking. Postgres uses serializable snapshot isolation, which lets them run and aborts one when a dangerous pattern is detected, so contention appears as failed transactions your application must retry. Turning on serializable without a retry loop turns a rare anomaly into a visible error rate.",
          "The practical approach is per transaction rather than per system. Leave the default in place for the majority, and raise the level only on the specific paths where a business rule spans rows, with a retry on the serialisation failures that follow. A blanket serializable default is usually a way of paying for isolation everywhere to protect two code paths.",
          "The one thing not to do is assume. The letters ACID are a promise about a configuration, the configuration has a default nobody chose, and the anomalies permitted at that default are the shape of the bugs you will eventually be debugging with no error message to guide you.",
        ],
        why: "Every level above read committed costs concurrency, which is why nobody defaults to serializable. The engineering question is which anomalies your specific workload can tolerate, not which level sounds safest.",
        check: {
          prompt: "Under read committed, you run the same SELECT twice in one transaction and get different results. Is this a bug?",
          options: [
            "Yes, a transaction must observe one consistent snapshot for its lifetime",
            "Only if rows were deleted; committed updates stay hidden until you commit",
            "No, non-repeatable reads are permitted there; use repeatable read for stability",
            "No, but only because the second read saw data committed before you began",
          ],
          correctIndex: 2,
          explain: "Read committed only guarantees you never see uncommitted data. Other transactions committing between your two reads is expected behaviour at that level.",
        },
        checks: [
          {
            prompt: "Postgres and MySQL both offer repeatable read. Why does behaviour still differ?",
            options: [
              "Postgres implements it as snapshot isolation; InnoDB uses gap locks",
              "MySQL applies it per statement, whereas Postgres applies it per transaction",
              "Postgres upgrades it to serializable when a conflict is detected",
              "MySQL only honours it for tables with an explicit primary key",
            ],
            correctIndex: 0,
            explain:
              "The same words describe different mechanisms with different failure modes, one aborting on conflict and one blocking with gap locks. Reading the engine's own documentation is the only way to know what your default gives you.",
          },
          {
            prompt: "What must accompany switching a path to serializable in Postgres?",
            options: [
              "A retry loop, because conflicting transactions abort rather than block",
              "A longer lock timeout, since transactions now wait behind each other",
              "A read replica, so long queries do not hold the serialisable snapshot",
              "An explicit lock on every row that the transaction intends to read",
            ],
            correctIndex: 0,
            explain:
              "Serializable snapshot isolation detects dangerous patterns and aborts one participant. Without a retry, a rare anomaly is replaced by a visible error rate, which is a worse trade than the one you meant to make.",
          },
          {
            prompt: "Why raise the isolation level per transaction rather than for the whole system?",
            options: [
              "Most transactions do not need it, and every level above the default costs",
              "Mixed levels let the planner choose cheaper plans for read-only work",
              "A system-wide level cannot be changed once the connections are pooled",
              "Higher levels are available only on the primary, never on a replica",
            ],
            correctIndex: 0,
            explain:
              "Isolation is bought with concurrency and with aborts. Paying for it on the two paths where a rule spans rows is very different from paying for it on every request the service handles.",
          },
        ],
      },
      {
        id: "mvcc",
        title: "MVCC and snapshot isolation",
        level: "advanced",
        body: [
          "Multi-version concurrency control keeps several versions of each row rather than updating in place. A reader sees the snapshot that existed when its transaction began, while writers create new versions alongside. Readers do not block writers and writers do not block readers, which is the property that makes a database usable under mixed load and is the reason MVCC won.",
          "An update is therefore an insert of a new version plus a mark on the old one, not an overwrite. That has consequences people meet later: an update costs roughly what an insert costs, updating one column of a wide row still writes the whole row in Postgres, and every index entry has to be maintained for the new version unless the update qualifies for the in-page optimisation.",
          "The old versions accumulate and have to be reclaimed, which is what vacuum does. It can only remove a version once no transaction might still need it, so the oldest open transaction sets the horizon for the entire database. That is the mechanism behind the classic production incident: a connection left idle in transaction by a pool or a debugger, holding the horizon still while a busy table bloats and its queries slow down, with write volume completely normal.",
          "Bloat is the visible symptom and the space is not returned to the operating system by ordinary vacuum, only made reusable, so a table that ballooned stays large until it is rewritten. Autovacuum is tuned per table for a reason: a hot table with a high update rate frequently needs it running more aggressively than the defaults, and the settings that matter are the scale factor and the cost limits.",
          "What MVCC buys at the isolation level is snapshot isolation, and it is worth being precise that this is not serializable. A snapshot is consistent, so every read in a transaction agrees with every other, and two transactions can still each read a consistent snapshot, each check a rule that holds in it, and each write something that makes the rule false. That is write skew, and it is the subject of the next topic.",
          "The practical habits follow directly. Keep transactions short, never hold one open across user interaction or an external call, monitor the age of the oldest transaction as a first-class metric, and treat idle in transaction as an alertable state rather than a curiosity in a connection list.",
        ],
        why: "The failure this creates in production is rarely a correctness bug, it is an idle transaction left open by a connection pool, blocking vacuum until the table bloats and queries slow down.",
        check: {
          prompt: "Table bloat is growing and queries are slowing, but write volume is normal. Most likely cause under MVCC?",
          options: [
            "Autovacuum is being outrun by the update rate on that particular table",
            "A long-running or idle-in-transaction session pinning old row versions",
            "Indexes have bloated, since every row version needs its own entry",
            "The isolation level is serializable, which retains more versions than needed",
          ],
          correctIndex: 1,
          explain: "Old versions can only be removed once no transaction might still need them. One forgotten open transaction pins the horizon for the whole table.",
        },
        checks: [
          {
            prompt: "Under MVCC, what does updating a single column of a wide row cost?",
            options: [
              "A new version of the entire row, plus index maintenance for it",
              "An in-place write of that column, with the old value kept in the log",
              "A new version of the changed column only, linked to the original row",
              "A copy of the row into an overflow area, leaving the original intact",
            ],
            correctIndex: 0,
            explain:
              "There is no partial update: the new version is a whole row. That is why update-heavy wide tables generate far more write volume than the size of the change suggests.",
          },
          {
            prompt: "Which metric best warns of the classic MVCC production problem?",
            options: [
              "The age of the oldest open transaction on the database",
              "The number of rows updated per second on the busiest table",
              "The ratio of index size to table size across the schema",
              "The number of connections currently held by the pool",
            ],
            correctIndex: 0,
            explain:
              "Everything downstream, bloat, slow queries, vacuum falling behind, follows from one transaction holding the horizon still. Alerting on idle in transaction catches it before the table has to be rewritten.",
          },
          {
            prompt: "Why does a bloated table stay large after vacuum has run?",
            options: [
              "Ordinary vacuum makes space reusable rather than returning it to the disk",
              "Vacuum defers reclamation until the table is next written to",
              "Index entries keep the pages pinned until the indexes are rebuilt",
              "Statistics are not updated, so the planner still assumes the old size",
            ],
            correctIndex: 0,
            explain:
              "The space is available for future rows and the file does not shrink. Returning it needs a rewrite, which is why avoiding the bloat is much cheaper than fixing it.",
          },
        ],
      },
      {
        id: "write-skew",
        title: "Write skew",
        level: "advanced",
        body: [
          "Write skew is the anomaly people are most confident their database prevents. Two transactions read an overlapping set of rows, each checks a rule that still holds in its own snapshot, and each writes a different row. Neither touches what the other wrote, so nothing conflicts, both commit, and the rule is now false.",
          "The textbook case is on-call cover: two doctors each check that at least one other doctor remains on duty, each sees a snapshot where that is true, and each takes themselves off the rota. Both checks passed. Nobody is on call. No database error was raised at any point, because from each transaction's perspective nothing was wrong.",
          "The shape to recognise is a rule about a set combined with a write to a member of that set. Reserving the last seat, keeping a balance above zero across several accounts, enforcing at most one active subscription, allocating unique meeting rooms, maintaining a minimum staffing level. Every one of those is a constraint that no single row can express, which is exactly why the database cannot enforce it for you.",
          "There are three fixes and they trade differently. Serializable isolation detects the dangerous read-write pattern and aborts one transaction, which is correct and needs a retry loop. Materialising the conflict gives the rule a row of its own, a rota row or a counter, that every participant must lock, which turns an invisible predicate into a real write conflict the database can see. A predicate lock does the same explicitly where the engine supports it.",
          "The cheapest fix is often to change the model rather than the isolation level. A unique constraint or an exclusion constraint expresses many of these rules directly, and a constraint is checked by the database on every path, including the script somebody runs by hand at midnight. Where the rule can be made into a constraint, that is a better answer than any transaction setting.",
          "The reason this stays hidden is that it needs concurrency and a rule spanning rows, which no unit test has and every production system does. It will not appear in review, will not appear in staging, and will appear on the day two people click at the same moment, which is why recognising the shape is worth more than remembering the name.",
        ],
        why: "This is the anomaly people assume their database prevents. It is invisible in testing because it needs concurrency and a constraint spanning rows, which is exactly the shape of most real business rules.",
        check: {
          prompt: "Two transactions each verify at least one doctor remains on call, then each remove a different doctor. Both commit and nobody is on call. What happened?",
          options: [
            "A lost update, since the second commit overwrote the first one's decision",
            "A phantom read, because a row matching the predicate appeared mid-transaction",
            "A deadlock the database resolved by committing both instead of aborting one",
            "Write skew, the constraint spans rows, and neither wrote what the other read",
          ],
          correctIndex: 3,
          explain: "They wrote disjoint rows, so nothing conflicted. Snapshot isolation allows this; serializable, or forcing both through one shared row, does not.",
        },
      },
      {
        id: "wal-outbox",
        title: "The write-ahead log and the outbox",
        level: "advanced",
        body: [
          "Writing to your database and then publishing an event is two operations that can fail independently. Commit succeeds, the process dies before the publish, and the event is gone: the order exists and nothing downstream will ever hear about it. Publish first and you have the opposite problem, an event for an order that was never created.",
          "The outbox pattern makes it one operation. The event is written to an outbox table in the same transaction as the data, so both commit or neither does. A separate relay reads that table and publishes, marking rows as sent.",
          "Delivery is still at-least-once. The relay can publish and die before recording that it did, so the same event goes out twice, which is why consumers stay idempotent. What the outbox removes is the possibility of losing an event entirely, and losing one is far worse than seeing one twice.",
          "The relay can poll the table or read the database's replication log directly. Polling every second is simple and adds a query and a second of latency; change data capture via the write-ahead log has no polling delay and no query load, at the cost of running Debezium or similar. Either way the outbox needs an index on unsent rows and a cleanup job, because a table nobody prunes becomes the slowest part of the write path.",
        ],
        why:
          "This is dual writes solved properly rather than mitigated. Retries and reconciliation reduce how often the gap between commit and publish loses an event; putting the event inside the transaction removes the gap.",
        diagram: {
          "caption": "The event is written in the same transaction as the data, so it cannot be lost",
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
                "id": "tx",
                "label": "One transaction",
                "sub": "row + outbox row",
                "kind": "data"
              }
            ],
            [
              {
                "id": "bus",
                "label": "Broker",
                "sub": "relayed from the outbox",
                "kind": "queue"
              }
            ]
          ],
          "edges": [
            {
              "from": "app",
              "to": "tx",
              "label": "commit both or neither"
            },
            {
              "from": "tx",
              "to": "bus",
              "label": "relay publishes, at least once",
              "async": true
            }
          ]
        },
        check: {
          prompt: "Why does the outbox pattern beat publishing an event right after the transaction commits?",
          options: [
            "It closes the window where the commit succeeds and the publish does not",
            "It guarantees exactly-once delivery, since the row is only ever written once",
            "It preserves event order, since the outbox is drained in primary key order",
            "It removes the broker, since consumers can poll the outbox table directly",
          ],
          correctIndex: 0,
          explain: "The gap between commit and publish is where events are lost. Writing the event in the same transaction closes it, delivery is still at-least-once, so consumers stay idempotent.",
        },
      },
    ],
  },

  {
    id: "replication-depth",
    title: "Quorums, PACELC and failure domains",
    summary: "Leaderless replication, the part of CAP nobody quotes, and containing blast radius.",
    track: "design",
    topics: [
      {
        id: "quorums",
        title: "Quorum reads and writes",
        level: "advanced",
        body: [
          "In a leaderless system every replica accepts writes, so there is no failover and no leader election to get wrong. With N replicas, a write waits for W acknowledgements before returning and a read collects R responses before answering. Those three numbers are the entire consistency model, exposed as configuration.",
          "When R plus W exceeds N the read set and the write set must overlap in at least one replica, so a read is guaranteed to see at least one copy of the latest acknowledged write. That is the whole argument, and it is the same overlap argument that makes consensus work. Versioning then decides which of the returned values is newest, usually with vector clocks or a last-write-wins timestamp.",
          "Tuning those numbers tunes the trade rather than switching a mode. W equal to N gives maximally durable writes and no write availability if a single node is unreachable. W of one returns quickly and risks losing the write if that node dies before replicating. R of one is a fast possibly-stale read; R equal to N is a slow read that has consulted everyone.",
          "The guarantee is weaker than it looks in several specific ways worth knowing, because they are how quorum systems surprise people. A write that reaches fewer than W nodes may still have been applied on some of them, so a failed write is not an undone write. Concurrent writes to different replicas produce siblings that the application must reconcile. And with sloppy quorums, where unavailable nodes are substituted by others holding hinted handoffs, R plus W greater than N no longer guarantees overlap at all.",
          "Repair is the part that makes it work in practice. Read repair fixes stale replicas it notices while answering a read, hinted handoff replays writes to a node that was down when it returns, and anti-entropy compares replicas in the background using Merkle trees so differences are found without transferring everything. Without those, a quorum system converges only where traffic happens to look.",
          "The reason to know this is that it is the design behind Dynamo, Cassandra and Riak, and it explains why those systems ask you to choose consistency per query rather than per cluster. The dial is genuinely yours, which is a feature when you have workloads with different needs and a hazard when nobody decided.",
        ],
        why: "R plus W greater than N is where consistency becomes a dial rather than a mode. It is also the answer to why Dynamo-style stores can offer both behaviours from one design.",
        check: {
          prompt: "With N=3, which configuration guarantees a read sees the latest acknowledged write?",
          options: [
            "R=1, W=1",
            "R=1, W=2",
            "R=2, W=2",
            "R=1, W=3 is the only option",
          ],
          correctIndex: 2,
          explain: "Overlap needs R + W > N. With N=3, R=2 and W=2 gives 4 > 3. R=1,W=3 also works but sacrifices all write availability; R=2,W=2 tolerates one node down on both paths.",
        },
        checks: [
          {
            prompt: "A quorum write fails to reach W nodes and returns an error. What is the state?",
            options: [
              "Nothing was written, since the write is atomic across the quorum",
              "The write may be applied on some replicas and will be read later",
              "The write is queued and retried automatically until W is reached",
              "The coordinator rolls back the replicas that did acknowledge it",
            ],
            correctIndex: 1,
            explain:
              "There is no rollback in a leaderless system. A failed write is not an undone write, so the client sees an error while a subsequent read may still return that value.",
          },
          {
            prompt: "What does a sloppy quorum give up in exchange for write availability?",
            options: [
              "The overlap guarantee, since substitutes are not the intended replicas",
              "Durability, because hinted handoffs are held only in memory",
              "Ordering, because substitute nodes apply writes out of sequence",
              "Read repair, which cannot run while hints remain undelivered",
            ],
            correctIndex: 0,
            explain:
              "R plus W greater than N only guarantees overlap when both sets are drawn from the same N. Once unavailable nodes are substituted, a read quorum can miss the write entirely.",
          },
          {
            prompt: "Why do quorum systems need anti-entropy as well as read repair?",
            options: [
              "Read repair only fixes what traffic happens to touch",
              "Read repair cannot correct deletes, only stale values",
              "Anti-entropy is required to establish the version vector ordering",
              "Read repair runs on the coordinator, which may itself be stale",
            ],
            correctIndex: 0,
            explain:
              "Rarely read data would stay divergent indefinitely. Background comparison with Merkle trees finds differences without depending on someone asking for them first.",
          },
        ],
      },
      {
        id: "pacelc",
        title: "PACELC: the half of CAP nobody quotes",
        level: "advanced",
        body: [
          "CAP describes behaviour during a partition, which is a real but rare event. PACELC adds the branch that dominates every other day: else, when the network is healthy, you still trade latency against consistency on every single request. Both halves are decisions; only one of them is a decision you make thousands of times a second.",
          "The else branch is concrete. Reading from the nearest replica is fast and possibly stale. Reading through a quorum is consistent and pays the round trips to reach it. Acknowledging a write locally is fast and risks losing it; waiting for a remote replica is durable and slower by the distance between them. No partition is required for any of those choices to exist.",
          "The notation is worth reading properly, because it says two things. A system described as PA/EL chooses availability when partitioned and latency the rest of the time, which is Dynamo and Cassandra with their default settings. PC/EC chooses consistency in both, which is a system like a single-primary relational database with synchronous replication. Some are PC/EL: strict during a partition, fast when healthy, which is a legitimate and common combination.",
          "It also explains a class of decision that CAP alone makes look arbitrary. When a database offers strongly consistent reads at higher cost and eventually consistent ones by default, that is the else branch exposed as an API parameter. The same design answering both is not a contradiction; it is a system that declined to make the trade on your behalf.",
          "The habit worth forming is to state both halves when describing a system. During a partition, this refuses writes to these entities and accepts them for those. In normal operation, reads default to the nearest replica and these three paths pay for quorum. That is a specification. The letter on its own is a slogan.",
          "And the geography question follows immediately, because latency in the else branch is set by distance. A quorum spanning continents pays the worst inter-region round trip on every write, which is why systems that need both properties shard so that each shard's quorum stays inside one region.",
        ],
        why: "Partitions are rare and the else branch is every single request. Discussing only CAP means discussing the exceptional case and ignoring the one that determines how the system feels in normal operation.",
        check: {
          prompt: "Your database is healthy, no partition. You still choose to read from a local replica rather than a quorum. Which tradeoff is that?",
          options: [
            "Consistency against availability, which is the CAP tradeoff",
            "Durability against throughput, since the replica acknowledges sooner",
            "Latency against consistency, the E and the L of PACELC",
            "None, without a partition there is nothing left to trade away",
          ],
          correctIndex: 2,
          explain: "This is exactly the else branch. The choice exists on every request, which is why it matters more day to day than the partition case CAP describes.",
        },
        checks: [
          {
            prompt: "A store offers eventually consistent reads by default and strong reads for twice the cost. What is that?",
            options: [
              "The else branch of PACELC exposed as a per-request parameter",
              "A CAP choice made per query rather than per cluster deployment",
              "A pricing decision unrelated to the consistency model itself",
              "A guarantee that strong reads survive a partition unchanged",
            ],
            correctIndex: 0,
            explain:
              "It is the latency against consistency trade, handed to the caller instead of decided by the system. A partition is not involved, which is precisely the point PACELC makes.",
          },
          {
            prompt: "What does a PC/EL system do?",
            options: [
              "Refuses writes during a partition, and favours latency when healthy",
              "Accepts writes during a partition, and favours consistency when healthy",
              "Refuses writes in both cases, prioritising consistency at all times",
              "Accepts writes in both cases, prioritising availability at all times",
            ],
            correctIndex: 0,
            explain:
              "The two halves are independent. Being strict about the rare case and fast about the common one is a legitimate and frequently chosen combination.",
          },
          {
            prompt: "Why does the else branch make cross-region quorums expensive?",
            options: [
              "Every consistent read or write waits for a round trip across the distance",
              "Partitions between regions are more frequent than within one region",
              "Replicas in other regions cannot participate in read repair",
              "Clock skew between regions forces additional coordination rounds",
            ],
            correctIndex: 0,
            explain:
              "Consistency is bought with waiting, and distance sets the price. That cost applies on every request in normal operation, not only when something has gone wrong.",
          },
        ],
      },
      {
        id: "cells",
        title: "Cells, bulkheads and blast radius",
        level: "advanced",
        body: [
          "A cell is a complete, independent copy of the stack serving a subset of users: its own compute, its own database, its own cache. Nothing is shared, which is the entire property. A failure inside one cell has no path to the others, not because it is unlikely to spread but because there is no mechanism by which it could.",
          "That converts availability from a probability into arithmetic. Instead of arguing about how likely a total outage is, you decide in advance that the worst single failure affects one over n of your users. A bad deploy, a poison request, a corrupted cache, a runaway migration: each is contained to the cell it happened in, and the incident is a fraction rather than an event.",
          "Deploys follow the same structure and become the main day-to-day benefit. Ship to one cell, watch it, then continue, which is a canary with a hard boundary rather than a percentage of traffic that shares a database with the other 95 per cent. Most bad changes are caught with one cell's users affected, and rolling back is a decision about one cell.",
          "The routing layer is the part that has to be right, because it is shared by definition. It maps a user or tenant to a cell and must be simple enough to be nearly incapable of failing: a lookup, a hash, a static assignment, ideally cached at the edge and statically stable so it keeps working when its own control plane is unavailable. A clever, dynamic router is a single point of failure in front of an architecture built to have none.",
          "The costs are real and worth stating. More infrastructure, because each cell needs its own everything and cannot pool spare capacity with its neighbours. Anything genuinely global, a report across all users, a search over everything, a migration, becomes a fan-out across cells with its own coordination. Cells also have to be sized, and a tenant that outgrows one is an awkward conversation.",
          "AWS builds this way and publishes the reasoning, which is that a fault should have a bounded and known set of affected customers. That is the sentence worth keeping: not that failures are prevented, but that their extent is decided in advance rather than discovered during the incident.",
        ],
        why: "It converts availability from a probability into an arithmetic fact. Rather than arguing about how likely total failure is, you decide in advance that the worst single failure affects one over n of your users.",
        inPractice: "AWS builds services from cells within an availability zone specifically so a fault has a bounded, known set of affected customers.",
        check: {
          prompt: "What does cell-based architecture primarily buy you?",
          options: [
            "Lower latency, since each cell is placed near the users that it serves",
            "Cheaper infrastructure, since cells can be sized to their actual load",
            "A bounded blast radius, one failure hits one cell's users, not all of them",
            "Simpler operations, since every cell is identical and deployed on its own",
          ],
          correctIndex: 2,
          explain: "It costs more infrastructure and does nothing for latency or consistency. What it gives is containment: the worst case becomes a fraction you chose rather than a number you hope about.",
        },
        checks: [
          {
            prompt: "Which component is the real risk in a cell-based architecture?",
            options: [
              "The routing layer, which is shared by every cell by definition",
              "The database in each cell, since data cannot be replicated between them",
              "The deploy pipeline, which must apply changes to all cells at once",
              "The monitoring stack, which has to aggregate across independent cells",
            ],
            correctIndex: 0,
            explain:
              "Everything else is isolated on purpose; the router is not, so it must be simple, statically stable and nearly incapable of failing. A clever dynamic router undoes the architecture it fronts.",
          },
          {
            prompt: "How does cell-based deployment differ from a percentage canary?",
            options: [
              "The blast radius is a hard boundary rather than a share of shared infrastructure",
              "It requires no monitoring, because failures are contained automatically",
              "Rollback is unnecessary, since a failed cell is replaced rather than reverted",
              "It removes the need to test changes before they reach production",
            ],
            correctIndex: 0,
            explain:
              "A five per cent canary usually still shares a database with the other ninety-five. A cell shares nothing, so a bad change cannot reach beyond the users in it.",
          },
          {
            prompt: "What becomes structurally harder once a system is split into cells?",
            options: [
              "Anything genuinely global: cross-user reports, search, migrations",
              "Deploying a change, which must now be coordinated across cells",
              "Monitoring, since each cell emits its own independent metrics",
              "Scaling, because a cell cannot be given additional capacity",
            ],
            correctIndex: 0,
            explain:
              "Isolation is the feature and the bill. Any operation that spans all users becomes a fan-out with its own coordination, which is the price paid for a bounded blast radius.",
          },
        ],
      },
      {
        id: "tail-at-scale",
        title: "Tail latency: hedged requests and Little's Law",
        level: "advanced",
        body: [
          "In a request that fans out to many services, the slowest response decides the total. Fan out to a hundred and your p99 per service becomes roughly your median overall.",
          "A hedged request sends a duplicate to another replica once the first exceeds some threshold, and takes whichever answers. A small percentage of extra load buys a large cut in the tail.",
          "Little's Law connects the three numbers you actually control: concurrency equals arrival rate multiplied by latency. If latency doubles under load, in-flight work doubles with it, which is how queues run away.",
        ],
        why: "Tail latency is a structural property of fan-out, not a slow service you can find and fix. Hedging attacks the distribution directly, which is why it works when tuning individual services has stopped helping.",
        check: {
          prompt: "A request fans out to 100 services, each with p99 of 100ms. What is the rough expectation for the overall request?",
          options: [
            "About 100ms overall, since the hundred calls all happen in parallel",
            "Most requests wait on at least one slow call, so 100ms becomes typical",
            "Ten seconds, since a hundred calls at a hundred milliseconds each sum",
            "Roughly unchanged, since an event at p99 is by definition uncommon",
          ],
          correctIndex: 1,
          explain: "With 100 calls, the chance that all land inside p99 is 0.99^100, about 37 percent. So roughly two thirds of requests hit at least one slow call, the tail becomes the norm.",
        },
      },
    ],
  },
];
