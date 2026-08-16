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
          "Read uncommitted allows dirty reads. Read committed prevents those but allows non-repeatable reads: the same query twice in one transaction can return different rows.",
          "Repeatable read fixes that for rows you have read. Serializable is the only level that guarantees the result matches some serial order of the transactions.",
          "Postgres defaults to read committed; MySQL InnoDB defaults to repeatable read. Knowing which you are on is the difference between a guarantee and an assumption.",
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
      },
      {
        id: "mvcc",
        title: "MVCC and snapshot isolation",
        level: "advanced",
        body: [
          "Multi-version concurrency control keeps several versions of each row, so a reader sees a consistent snapshot from when its transaction began while writers carry on. Readers do not block writers and writers do not block readers.",
          "The cost is that old versions accumulate and must be cleaned up, Postgres calls this vacuum, and a long-running transaction holds back the cleanup for everyone.",
          "Snapshot isolation is what this buys, and it is not serializable: it permits write skew.",
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
      },
      {
        id: "write-skew",
        title: "Write skew",
        level: "advanced",
        body: [
          "Two transactions read an overlapping set, each check a constraint that still holds, and each write a different row. Neither conflicts directly, both commit, and the constraint is now violated.",
          "The textbook case is on-call: two doctors each check that someone else is on duty and each take themselves off. Both checks passed against the pre-write state.",
          "Snapshot isolation permits it. Fixes are serializable isolation, materialising the conflict onto a single row both must lock, or an explicit predicate lock.",
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
          "Databases write changes to a log before applying them, which is what makes durability and crash recovery possible, and what replication and change data capture read from.",
          "The outbox pattern uses this. Instead of writing to the database and publishing an event separately, you insert the event into an outbox table inside the same transaction, and a relay reads that table and publishes.",
          "One commit, so the event and the state change cannot disagree. The relay may publish twice, which is why consumers still need idempotency.",
        ],
        why: "This is the concrete answer to the dual-write problem. Publishing after commit means a crash in between loses the event; publishing before means it may describe a state that rolled back. The outbox makes both impossible with the transaction you already have.",
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
          "In a leaderless system every replica accepts writes. With N replicas, a write waits for W acknowledgements and a read collects R responses.",
          "When R plus W exceeds N, the read and write sets must overlap, so a read is guaranteed to see at least one copy of the latest write. Versioning decides which of the returned values wins.",
          "Tuning the numbers tunes the tradeoff: W equal to N gives durable writes and no write availability if any node is down; W of one is the reverse.",
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
      },
      {
        id: "pacelc",
        title: "PACELC: the half of CAP nobody quotes",
        level: "advanced",
        body: [
          "CAP describes behaviour during a partition. PACELC adds the case that actually dominates: else, when the network is fine, you still trade latency against consistency.",
          "Reading from the nearest replica is fast and possibly stale. Reading through a quorum is consistent and pays the round trips. No partition is required for that choice to exist.",
          "So a system is described as PA/EL or PC/EC, what it does when partitioned, and what it does the rest of the time.",
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
      },
      {
        id: "cells",
        title: "Cells, bulkheads and blast radius",
        level: "advanced",
        body: [
          "A cell is a complete, independent copy of the stack serving a subset of users. Nothing is shared between cells, so a failure inside one cannot reach the others.",
          "This bounds the blast radius by construction: a bad deploy or a poison request takes out one cell's users rather than everyone. Deploys go cell by cell for the same reason.",
          "The cost is real, more infrastructure, and any operation genuinely spanning all users becomes awkward.",
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
