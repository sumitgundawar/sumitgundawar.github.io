import type { Card } from "./types";

export const dissections: Card[] = [
  {
    id: "cursor-git",
    title: "Cursor: Git at any scale",
    summary:
      "Why Git repositories resist being distributed, what GitHub's Spokes did about it, and how a write-ahead log in an object store replaces three-phase commit.",
    track: "dissection",
    subject: {
      title: "Git at any scale",
      url: "https://cursor.com/blog/git-at-any-scale",
      publisher: "Cursor",
      published: "2026-08-17",
      note: "A rare thing: a storage design explained by someone who has maintained Git internals, with throughput numbers attached and the previous generation's architecture described fairly rather than as a foil.",
    },
    topics: [
      {
        id: "cursor-packfiles",
        title: "Why a Git repository resists being distributed",
        level: "intermediate",
        body: [
          "Start with what a repository actually is on disk, because every difficulty later follows from it. Git stores content as objects addressed by the hash of their contents: a blob for a file's bytes, a tree for a directory listing, a commit pointing at a tree and its parents.",
          "Written one file per object that would be unusable at any real size, so Git periodically gathers them into a packfile, a single large binary file holding many objects, delta-compressed against one another, with a separate index file mapping each object's hash to its offset.",
          "That format is very good at what it was designed for and hostile to everything else. Reading one object means consulting the index, seeking to an offset, and then walking a chain of deltas to reconstruct the content, each step landing somewhere unpredictable in a file that may be several gigabytes. It is random access across a large binary blob, repeated thousands of times to serve one clone, and the code doing it assumes a local filesystem because that is what it was written against.",
          "So the obvious move, putting the repository on network storage and letting any server read it, performs terribly. Every one of those small random reads becomes a network round trip, and there are an enormous number of them. This is the constraint the whole article is about: Git's storage format cannot simply be moved somewhere shared, so hosting it at scale means deciding what to distribute instead.",
          "There is a second property that matters as much and is easier to miss. A push is not an append. It is a negotiation, in which the client and server work out which objects the server lacks, followed by a packfile of exactly those objects, followed by an update to a reference such as a branch tip. The reference update is the part that must be atomic and ordered, because two people pushing to one branch is a conflict that has to be resolved by somebody, and the data itself is content-addressed and therefore harmless to have twice.",
          "Holding those two facts together explains the shape of every solution in this space. The bytes are immutable and addressed by their content, so they can be copied freely and never conflict. The references are small, mutable and contended, so they need consensus. Any hosting architecture is a choice about where each of those two halves lives, and most of the differences between designs are about the second half rather than the first.",
        ],
        why:
          "The temptation is to treat this as a storage problem and reach for a network filesystem, and the packfile format is the reason that fails: it was designed for random access on a local disk, and every random read becomes a round trip. Recognising that the immutable content and the mutable references have opposite requirements is what makes the rest of the design legible, because the content can be replicated carelessly and the references cannot be replicated at all without an ordering.",
        inPractice:
          "This is the same split that appears in any content-addressed system. A container registry separates immutable layers, which can be cached anywhere and deduplicated globally, from mutable tags, which need an authoritative answer. So does a package registry, and so does the artefact store in a build system. The immutable half is a distribution problem and the mutable half is a consensus problem, and conflating them is how both end up done badly.",
        diagram: {
          caption: "Immutable content copies freely; a mutable reference needs an order",
          columns: [
            [{ id: "push", label: "git push", sub: "negotiate, then send", kind: "client" }],
            [
              { id: "objs", label: "Objects", sub: "addressed by content hash", kind: "data" },
              { id: "ref", label: "Reference update", sub: "branch tip moves", kind: "data" },
            ],
            [
              { id: "pack", label: "Packfile", sub: "delta chains, random access", kind: "service" },
              { id: "order", label: "Needs an ordering", sub: "two pushes, one branch", kind: "service" },
            ],
            [
              { id: "nfs", label: "On network storage", sub: "every read is a round trip", kind: "external", alternative: true },
              { id: "local", label: "On local NVMe", sub: "what Git was written for", kind: "external" },
            ],
          ],
          edges: [
            { from: "push", to: "objs", label: "the bytes" },
            { from: "push", to: "ref", label: "the decision" },
            { from: "objs", to: "pack", label: "gathered and compressed" },
            { from: "ref", to: "order", label: "contended" },
            { from: "pack", to: "nfs", label: "the obvious move" },
            { from: "pack", to: "local", label: "what actually performs" },
          ],
        },
        check: {
          prompt: "Why does putting a Git repository on a network filesystem perform badly?",
          options: [
            "Serving one clone means thousands of small random reads, each a round trip",
            "Packfiles exceed the maximum object size that network storage will accept",
            "Git holds an exclusive lock on the packfile, which no shared mount permits",
            "Delta compression has to be recomputed whenever the file is read remotely",
          ],
          correctIndex: 0,
          explain:
            "Reading one object means an index lookup, a seek and a walk along a delta chain, landing unpredictably in a file that may be gigabytes. That pattern is fine on a local disk and ruinous when each access crosses a network, which is why the format cannot simply be relocated.",
        },
        checks: [
          {
            prompt: "Which half of a push genuinely needs an ordering, and why?",
            options: [
              "The reference update, because two pushes to one branch conflict",
              "The packfile, because objects must be applied in dependency order",
              "The negotiation, because both sides must agree what is missing",
              "The index rebuild, because offsets shift as objects are appended",
            ],
            correctIndex: 0,
            explain:
              "Objects are addressed by their content, so having one twice is harmless and copying them anywhere is safe. Moving a branch tip is a decision about which of two concurrent pushes won, and that cannot be resolved without an authoritative order.",
          },
          {
            prompt: "What is a packfile, in one sentence?",
            options: [
              "Many objects in one binary file, delta-compressed, with a hash index",
              "A compressed snapshot of the working tree at a particular commit",
              "The list of references and the commits each of them points at",
              "A journal of the operations applied since the last full checkout",
            ],
            correctIndex: 0,
            explain:
              "Writing one file per object is unusable at scale, so Git gathers objects together, compresses them against one another as deltas, and writes a side index mapping each hash to an offset. That packing is what makes local access fast and remote access painful.",
          },
          {
            prompt: "Why can Git objects be replicated without any coordination?",
            options: [
              "Their names are hashes of their contents, so two copies agree",
              "They are written once at push time and never read concurrently",
              "Each object records the replica that created it, breaking ties",
              "The protocol resends any object whose checksum fails to verify",
            ],
            correctIndex: 0,
            explain:
              "Content addressing means the name is derived from the bytes, so the same name cannot describe two different things and a duplicate is simply a duplicate. Immutability plus content addressing is what makes the data half of the problem easy.",
          },
        ],
        sources: [
          {
            label: "Cursor, Git at any scale (2026)",
            url: "https://cursor.com/blog/git-at-any-scale",
            supports: "The framing quoted here, that packfiles are large binary files which must exist on a filesystem for Git to access them, and that their random access pattern is what makes networked storage unsuitable.",
          },
          {
            label: "Git internals: packfiles",
            url: "https://git-scm.com/book/en/v2/Git-Internals-Packfiles",
            supports: "The object model and packfile format described here: blobs, trees and commits addressed by content hash, gathered into a pack with a separate offset index.",
          },
        ],
      },
      {
        id: "cursor-spokes",
        title: "GitHub's answer, and the wall it reaches",
        level: "advanced",
        body: [
          "GitHub's system, Spokes, has been the industry reference since around 2013, and the article is fair to it: its three central choices were correct for the problem as it stood. Replicate at the packfile level rather than trying to distribute Git itself, so ordinary Git tooling keeps working. Keep each replica as a real Git repository on local NVMe, so reads have the access pattern Git expects. And hold the replicas strongly consistent with three-phase commit, so a push is either everywhere or nowhere.",
          "Three-phase commit is worth understanding rather than treating as a label, because its cost is the whole reason for the article. A coordinator asks every replica whether it can accept the push, waits for all of them to say yes, tells them to prepare, waits again, then tells them to commit. Every phase waits for every participant, which means the latency of a push is set by the slowest replica in the set, not the median and not the fastest.",
          "That gives the architecture a property nobody wants: adding replicas makes writes worse. Three is the standard set, and three is plenty for a repository whose readers are humans. It is not plenty for a large enterprise monorepo whose readers are continuous integration jobs, where the read load is enormous and would happily be spread over dozens of machines. But going from three replicas to twelve means every push waits on twelve, so the thing that would fix reads directly damages writes. Read capacity and write throughput are coupled by the consistency protocol, and the coupling has the wrong sign.",
          "There is a second cost that is operational rather than architectural, and the article's phrase for it is the memorable one: the repositories are pets rather than cattle. Because a replica holds state that exists nowhere else in a directly usable form, the system has to know exactly which machines hold which repository, keep that mapping in an external database, and continuously check that each replica is healthy and in agreement. Every one of those is a component that can be wrong, and a stale mapping is a repository nobody can find.",
          "None of this is a design error. It is what happens when a set of correct decisions meets a load nobody was designing for, which in this case is two loads at once: monorepos whose CI fan-out wants many more readers than three, and a newer shape entirely, millions of small repositories created by agents, where the per-repository overhead of tracking and health-checking a pet dominates everything else about them.",
        ],
        why:
          "The lesson is not that three-phase commit is bad but that it couples two things a hosting system wants to scale independently. Because every phase waits for every replica, the replica count sets both the read capacity and the push latency, so there is no setting that serves a monorepo's CI fan-out and its developers at the same time. Any architecture with that coupling has a ceiling, and the ceiling arrives as a choice between slow pushes and insufficient read capacity.",
        inPractice:
          "The same coupling appears wherever strong replication is synchronous. A relational primary with synchronous replicas pays the slowest replica's latency on every commit, which is why the usual arrangement is one synchronous replica for durability and the rest asynchronous for reads. Consensus groups have it too, which is why systems that need both properties keep the consensus group small and put the bulk data on a separate replication path.",
        diagram: {
          caption: "Every phase waits for every replica, so more readers means slower writes",
          columns: [
            [{ id: "p", label: "Push", sub: "one branch update", kind: "client" }],
            [{ id: "coord", label: "Coordinator", sub: "three-phase commit", kind: "service" }],
            [
              { id: "r1", label: "Replica 1", sub: "real repo on NVMe", kind: "data" },
              { id: "r2", label: "Replica 2", sub: "real repo on NVMe", kind: "data" },
              { id: "r3", label: "Replica 3", sub: "the slow one today", kind: "data", alternative: true },
            ],
            [
              { id: "ci", label: "CI wants 30 readers", sub: "but each one slows the push", kind: "external", alternative: true },
              { id: "db", label: "Placement database", sub: "which machine holds what", kind: "external" },
            ],
          ],
          edges: [
            { from: "p", to: "coord", label: "can you accept?" },
            { from: "coord", to: "r1", label: "prepare, commit" },
            { from: "coord", to: "r2", label: "prepare, commit" },
            { from: "coord", to: "r3", label: "sets the latency" },
            { from: "r3", to: "ci", label: "adding replicas hurts" },
            { from: "coord", to: "db", label: "repos are pets" },
          ],
        },
        check: {
          prompt: "Under three-phase commit, why does adding replicas to serve more CI readers hurt?",
          options: [
            "Each phase waits for every replica, so push latency tracks the slowest",
            "The coordinator can hold only a fixed number of participants per commit",
            "Additional replicas must be seeded from the primary before they can read",
            "Read traffic and write traffic contend for the same NVMe on each replica",
          ],
          correctIndex: 0,
          explain:
            "The protocol makes every participant a gate on every phase, so the push cannot complete faster than the slowest machine in the set. That couples read capacity to write latency with the wrong sign: the change that would fix reads directly damages writes.",
        },
        checks: [
          {
            prompt: "What does calling the repositories pets rather than cattle mean here?",
            options: [
              "Each holds state found nowhere else, so it must be tracked and checked",
              "Each is configured by hand, so no two replicas are quite identical",
              "Each is named individually, so automation cannot address them in bulk",
              "Each is long-lived, so accumulated drift eventually requires a rebuild",
            ],
            correctIndex: 0,
            explain:
              "The consequence is the operational burden: an external database must record exactly which machines hold which repository, and something must continuously verify they are healthy and in agreement. A stale entry is a repository nobody can locate.",
          },
          {
            prompt: "Which of Spokes' three choices was about keeping Git's access pattern intact?",
            options: [
              "Storing each replica as a real repository on local NVMe",
              "Replicating at the packfile level rather than distributing Git",
              "Holding replicas strongly consistent using three-phase commit",
              "Recording replica placement in an external database of record",
            ],
            correctIndex: 0,
            explain:
              "Git expects a local filesystem and makes many small random reads, so keeping a genuine repository on fast local disk is what lets ordinary tooling perform. Packfile-level replication is about not rewriting Git, and the consensus choice is about correctness.",
          },
          {
            prompt: "Which newer workload does a pets-and-consensus design suit worst?",
            options: [
              "Millions of tiny repositories, where per-repo overhead dominates",
              "A single monorepo whose history has grown to several gigabytes",
              "A repository with very large binary files committed alongside code",
              "A team pushing continuously from many machines to one branch",
            ],
            correctIndex: 0,
            explain:
              "Tracking placement, health-checking replicas and running a consensus round per repository is affordable when a repository is a substantial thing. Spread across millions of small agent-created repositories, the fixed overhead per repository is the entire cost.",
          },
        ],
        sources: [
          {
            label: "Cursor, Git at any scale (2026)",
            url: "https://cursor.com/blog/git-at-any-scale",
            supports: "The three architectural choices attributed to Spokes, the observation that every step's latency is bound by the slowest server in the cluster, and the pets rather than cattle framing.",
          },
          {
            label: "GitHub Engineering, Stretching Spokes",
            url: "https://github.blog/engineering/infrastructure/stretching-spokes/",
            supports: "GitHub's own account of Spokes as a three-replica, strongly consistent repository replication system operating at the packfile level.",
          },
        ],
      },
      {
        id: "cursor-continuity",
        title: "Continuity: a write-ahead log in a bucket",
        level: "advanced",
        body: [
          "The replacement inverts what is authoritative. Instead of the repositories on disk being the truth and the object store being a backup, an append-only write-ahead log in S3-compatible object storage is the truth, and every repository on every disk is derived from it. Each entry in that log describes one accepted change, and the packfiles it refers to are stored as their own objects beside it, so the log stays small and the bulk data is separate.",
          "That is a familiar move with an unfamiliar substrate. A database's write-ahead log records the intention before the change is applied, so recovery is a matter of replaying it; here the same idea is applied across machines rather than across a crash, so a machine that has fallen behind is not repaired, it simply replays. What makes it possible at all is that object storage acquired the one primitive the design needs.",
          "That primitive is an atomic compare-and-swap.",
          "S3 now supports conditional writes: put this object only if it does not already exist, or only if its current version matches the one I read. That turns appending to the log into a race that exactly one participant wins, which is the ordering the mutable half of Git needs. So the consensus that Spokes ran between its own replicas is delegated to the object store, which already provides it, rather than being implemented and operated.",
          "The consistency claim that follows is unusually strong for something built this way, and the article states it plainly: no push is acknowledged until it has been fully persisted, all pushes are linearizable through those atomic operations, and every view of every repository is fully consistent. The order in that first clause is the important part. Persist, then acknowledge, which is the same discipline as a messaging server that stores a message before sending the tick, and for the same reason: the window between accepting and durably storing is the window in which a crash loses something the client believes is safe.",
          "The price is a round trip to object storage in the write path, and it is worth being clear that this is a real cost rather than a free lunch. What it buys is that durability and ordering both come from a service whose availability and durability are somebody else's problem, at eleven nines, with no cluster of your own to keep in agreement. For a workload where pushes are frequent but not latency-critical in the way a database commit is, that is an excellent trade, and the throughput numbers later in the piece are what make the case.",
        ],
        why:
          "The interesting move is not using object storage for bulk data, which everyone does, but making it the authority for ordering. That is only possible because conditional writes give a compare-and-swap, and it is what removes the consensus protocol from the system entirely: the ordering exists, and no cluster of yours has to agree on it. Delegating the hard guarantee to a service that already provides it is usually cheaper than implementing it, and until conditional writes existed this particular delegation was not available.",
        inPractice:
          "The same conditional-write primitive is what the open table formats now build on. Iceberg and Delta both need exactly one writer to win when advancing a table's current snapshot pointer, and both moved to compare-and-swap on object storage rather than depending on an external catalogue to serialise it. The pattern is worth recognising: an append-only log plus one atomically swapped pointer is enough to give a shared mutable thing a total order.",
        diagram: {
          caption: "The log in the bucket is the truth, and one writer wins the swap",
          columns: [
            [{ id: "push", label: "Push", sub: "not yet acknowledged", kind: "client" }],
            [{ id: "packs", label: "Packfile objects", sub: "immutable, written first", kind: "data" }],
            [
              { id: "cas", label: "Conditional write", sub: "compare and swap the log head", kind: "service" },
              { id: "lose", label: "Concurrent push", sub: "loses the swap, retries", kind: "service", alternative: true },
            ],
            [{ id: "wal", label: "Write-ahead log", sub: "append only, linearizable", kind: "data" }],
            [{ id: "ack", label: "Acknowledged", sub: "only after it is persisted", kind: "external" }],
          ],
          edges: [
            { from: "push", to: "packs", label: "content addressed" },
            { from: "packs", to: "cas", label: "then claim the order" },
            { from: "cas", to: "wal", label: "exactly one winner" },
            { from: "lose", to: "cas", label: "read again, retry" },
            { from: "wal", to: "ack", label: "persist, then acknowledge" },
          ],
        },
        check: {
          prompt: "Which object storage capability makes the write-ahead log design possible?",
          options: [
            "Conditional writes, which give an atomic compare-and-swap on an object",
            "Strong read-after-write consistency for newly created objects",
            "Multipart upload, which lets a large packfile be written in parallel",
            "Object versioning, which retains every previous state of the log",
          ],
          correctIndex: 0,
          explain:
            "Appending to the log has to have exactly one winner among concurrent pushes, and that is a compare-and-swap. Strong read consistency, versioning and multipart upload are all used and none of them provides an ordering, which is the guarantee the mutable half of Git actually needs.",
        },
        checks: [
          {
            prompt: "Why acknowledge a push only after it has been persisted?",
            options: [
              "A crash before persistence loses work the client believes is safe",
              "The client cannot compute the new reference until the log has advanced",
              "Object storage rejects an acknowledgement sent before the write lands",
              "Replicas cannot begin catching up until the acknowledgement is sent",
            ],
            correctIndex: 0,
            explain:
              "The window between accepting and durably storing is the window in which a failure silently loses something already confirmed. Persist then acknowledge is the same discipline a messaging server applies before showing a delivered tick.",
          },
          {
            prompt: "What is kept in the log itself rather than beside it?",
            options: [
              "An entry describing each accepted change, with packs as objects",
              "The full packfile contents, so one read recovers everything",
              "The working tree at each commit, so a checkout needs no rebuild",
              "A snapshot of every replica's state at the time of the push",
            ],
            correctIndex: 0,
            explain:
              "The log stays small because it records what changed and points at the bulk data, which lives as separate immutable objects. That separation is what keeps reading the log cheap enough to do on every request.",
          },
          {
            prompt: "What does delegating the ordering to object storage remove from the system?",
            options: [
              "A consensus protocol of its own, and the cluster that would run it",
              "The need to store packfiles anywhere other than in the bucket",
              "The requirement that any repository exist on a local disk at all",
              "The possibility of two clients pushing to one branch at once",
            ],
            correctIndex: 0,
            explain:
              "Spokes ran three-phase commit between its own replicas and had to operate it. Here the atomic operation already exists in a service with its own durability guarantees, so there is no agreement of yours to maintain. Concurrent pushes still happen; one simply loses the swap and retries.",
          },
        ],
        sources: [
          {
            label: "Cursor, Git at any scale (2026)",
            url: "https://cursor.com/blog/git-at-any-scale",
            supports: "That Continuity persists a write-ahead log to S3-compatible storage, that pushes are linearizable through atomic compare-and-swap, and the stated guarantee that no push is acknowledged until fully persisted.",
          },
          {
            label: "AWS, Amazon S3 conditional writes",
            url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-requests.html",
            supports: "That S3 supports conditional writes, which is the compare-and-swap primitive the design depends on for ordering.",
          },
        ],
      },
      {
        id: "cursor-warm-cache",
        title: "The repository on disk is a cache",
        level: "advanced",
        body: [
          "Once the log is authoritative, the repositories on disk change status entirely. They are no longer state that must be protected, tracked and health-checked; they are a warm cache, materialised from the log when a node needs one and discardable at any moment. The article's word for what that buys is stateless: nothing on a node is irreplaceable, so a node is interchangeable with any other node.",
          "That is the change that turns pets into cattle, and the consequences are mostly about what stops being necessary. No external database recording which machine holds which repository, because any machine can hold any repository. No continuous validation that replicas agree, because agreement is checked on every read against the log rather than maintained between peers. No careful repair of a divergent replica, because a divergent replica is thrown away and rebuilt from the log, which is strictly cheaper than reconciling it.",
          "Which node materialises which repository is then decided by rendezvous hashing rather than by a lookup. Every node can compute, from the repository's name and the current node list, which nodes should hold it: hash the name together with each node's name, sort the scores, take the top few. Because it is a computation rather than a stored mapping, there is nothing to keep current and nothing to be stale, and when the node list changes only the repositories whose top scores moved need to relocate. It is consistent hashing's cousin, and it handles weighting more cleanly.",
          "The replica count then becomes a per-repository dial rather than an architectural constant, which is the payoff for all of this. A large monorepo whose CI generates enormous read load can be materialised on hundreds of nodes, because replicas no longer participate in a consensus round and therefore no longer slow pushes down. At the other end, a tiny repository created by an agent can live on exactly one node, because the object store is the availability guarantee: if that node goes away, another materialises the repository from the log.",
          "It is worth noticing what the trade actually is. A read served by a node that does not yet hold the repository must wait for it to be materialised, which is a cold start, and the cost of that is proportional to the repository's size. The design does not eliminate that cost, it relocates it: cold starts happen on the read path instead of divergence happening on the write path, and a cold start is at least a failure mode that resolves itself.",
        ],
        why:
          "Making the on-disk repository a cache is what decouples the replica count from the write path, and that single decoupling is what the whole architecture was for. Spokes could not add readers without slowing writers because replicas were consensus participants; here they are caches, so the count can be one or hundreds according to the repository. Rendezvous hashing matters for the same reason the log does: a computed placement cannot go stale, so there is no mapping to maintain and nothing to be wrong.",
        inPractice:
          "The general form is worth recognising because it appears wherever a system stops treating local state as precious. A stateless application server materialises its cache on demand and is replaced rather than repaired. A CDN edge holds a copy that can be evicted at any moment because the origin is authoritative. In every case the enabling condition is the same: something else holds the truth, cheaply enough to rebuild from, which is exactly what a log in object storage is.",
        diagram: {
          caption: "Any node can hold any repository, because none of them holds the truth",
          columns: [
            [{ id: "wal", label: "Write-ahead log", sub: "the only authority", kind: "data" }],
            [{ id: "rv", label: "Rendezvous hashing", sub: "computed, never stale", kind: "service" }],
            [
              { id: "mono", label: "Monorepo", sub: "hundreds of replicas for CI", kind: "edge" },
              { id: "tiny", label: "Agent repository", sub: "one replica is enough", kind: "edge" },
            ],
            [
              { id: "disk", label: "Warm cache on disk", sub: "a normal Git repository", kind: "external" },
              { id: "cold", label: "Cold start", sub: "materialise on first read", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "wal", to: "rv", label: "name plus node list" },
            { from: "rv", to: "mono", label: "as many as reads need" },
            { from: "rv", to: "tiny", label: "the bucket is the backup" },
            { from: "mono", to: "disk", label: "materialised" },
            { from: "tiny", to: "cold", label: "the relocated cost" },
          ],
        },
        check: {
          prompt: "What does treating the on-disk repository as a cache make possible?",
          options: [
            "Setting the replica count per repository without slowing pushes down",
            "Serving reads directly from object storage without materialising anything",
            "Removing the need for packfiles, since the log holds every object",
            "Guaranteeing that every read is served by a node that already has it",
          ],
          correctIndex: 0,
          explain:
            "Replicas are no longer consensus participants, so adding them costs nothing on the write path. That is what lets a monorepo sit on hundreds of nodes for CI while an agent's repository sits on one, which is the decoupling the design exists to deliver.",
        },
        checks: [
          {
            prompt: "Why is rendezvous hashing preferred to a stored placement mapping?",
            options: [
              "It is computed from the name and node list, so it cannot go stale",
              "It guarantees an exactly even distribution across the available nodes",
              "It allows a repository to be moved without informing the other nodes",
              "It keeps related repositories together, which improves cache locality",
            ],
            correctIndex: 0,
            explain:
              "A stored mapping is a component that can be wrong, and a stale entry is a repository nobody can find. Because every node can compute the same answer from the same inputs, there is nothing to keep current.",
          },
          {
            prompt: "How is a replica that has diverged from the log repaired?",
            options: [
              "It is discarded and rebuilt, which is cheaper than reconciling it",
              "It is reconciled against a healthy peer holding the same repository",
              "It replays only the entries it is missing, applied in commit order",
              "It is quarantined until an operator decides which version is correct",
            ],
            correctIndex: 0,
            explain:
              "Nothing on a node is irreplaceable, so divergence is not a problem to solve. Throwing the cache away and materialising it again from the log removes an entire class of repair logic that a peer-consistency design has to get right.",
          },
          {
            prompt: "What cost does making the repository a cache introduce?",
            options: [
              "A cold start when a node must materialise a repository it lacks",
              "A write amplification, since every push is stored on every node",
              "A consistency gap, because a cache may serve an older reference",
              "A larger object store bill, since packs are duplicated per node",
            ],
            correctIndex: 0,
            explain:
              "The cost is relocated rather than removed: materialising a large repository takes time proportional to its size, and that lands on a read. It is a better failure mode than divergence on the write path, because it resolves itself.",
          },
        ],
        sources: [
          {
            label: "Cursor, Git at any scale (2026)",
            url: "https://cursor.com/blog/git-at-any-scale",
            supports: "That repositories on disk are treated as a warm cache materialised from the log, that rendezvous hashing decides node placement, and that replica counts range from one for tiny repositories to hundreds for monorepos.",
          },
          {
            label: "Thaler and Ravishankar, A name-based mapping scheme for rendezvous (1996)",
            url: "https://www.eecs.umich.edu/techreports/cse/96/CSE-TR-316-96.pdf",
            supports: "The rendezvous hashing algorithm itself: score each node against the key, take the highest, with no stored mapping and minimal disruption when the node list changes.",
          },
        ],
      },
      {
        id: "cursor-read-path",
        title: "How a read proves it is current",
        level: "intermediate",
        body: [
          "This is the part of the design that repays the most attention, because it is where the correctness actually comes from. When a replica is asked to serve a read, it does not assume that whatever it holds is up to date. It asks the object store, using a conditional GET with the ETag it already has for the log's head.",
          "There are exactly two answers and both are cheap. A 304 Not Modified means nothing has changed since the version the replica holds, so it can serve immediately from its warm on-disk repository; the article reports that this metadata-only operation takes less than 10ms on average. A 200 means the log has advanced and comes with the latest index, so the replica catches up on the entries it is missing before answering, and is then current by construction.",
          "So the guarantee is not that replication succeeded. It is that a stale replica cannot serve a stale answer, because it finds out that it is stale before it answers. That is a materially different property from the usual arrangement, where a replica serves whatever it has and the system's consistency is whatever the replication lag happens to be, and it is why the design can claim that every view of every repository is fully consistent while replicating optimistically.",
          "The cost is one small round trip to the object store per read, and this is the trade to weigh rather than skim. Ten milliseconds is a great deal next to a local disk read and almost nothing next to cloning a repository, which is what makes it acceptable here: Git operations are large enough that a fixed 10ms verification disappears into them, while the same overhead on a per-key cache lookup would be absurd. The technique is not universal; it fits because of the size of the operations it protects.",
          "It is also what makes the write path's promise mean something. Because pushes are linearizable through the log and every read verifies against the log, a client that has just been told its push succeeded will see that push from any replica it subsequently reads from, which is read-your-own-writes without pinning anybody to anything. The two halves of the design are one mechanism seen from two directions.",
        ],
        why:
          "Verifying on read rather than trusting replication is what buys consistency without a consensus protocol. The usual arrangement makes correctness depend on replication having worked, so the consistency of the system is whatever the lag is; here a replica discovers it is behind before it answers, so replication is free to be unreliable. The reason it is affordable is the ratio: a 10ms metadata check is invisible inside a Git operation and would be ruinous inside a cache lookup.",
        inPractice:
          "This is the same conditional request that HTTP caching has always used, applied to a different question. A browser sends If-None-Match and gets a 304 to avoid transferring a body it already has; here a replica sends the same thing to avoid serving content it should no longer serve. Worth remembering as a general technique: a cheap conditional check in front of an expensive operation converts a correctness assumption into a verified fact.",
        diagram: {
          caption: "Ask before answering, so a stale replica cannot serve a stale answer",
          columns: [
            [{ id: "read", label: "Read request", sub: "clone, fetch, browse", kind: "client" }],
            [{ id: "rep", label: "Replica", sub: "holds an ETag for the log head", kind: "service" }],
            [
              { id: "not", label: "304 Not Modified", sub: "under 10ms on average", kind: "data" },
              { id: "adv", label: "200: new index", sub: "the log has moved on", kind: "data" },
            ],
            [
              { id: "serve", label: "Serve from disk", sub: "warm cache, current", kind: "external" },
              { id: "catch", label: "Catch up first", sub: "then serve, current", kind: "external" },
            ],
          ],
          edges: [
            { from: "read", to: "rep", label: "arrives anywhere" },
            { from: "rep", to: "not", label: "conditional GET" },
            { from: "rep", to: "adv", label: "conditional GET" },
            { from: "not", to: "serve", label: "nothing changed" },
            { from: "adv", to: "catch", label: "replay the gap" },
          ],
        },
        check: {
          prompt: "A replica receives a read. What does it do before answering?",
          options: [
            "A conditional GET against the log, to find out whether it is stale",
            "A comparison of its reference tips against a peer holding the same repo",
            "A full re-materialisation of the repository from the log, then serves",
            "Nothing, since gossip replication will already have delivered the update",
          ],
          correctIndex: 0,
          explain:
            "Correctness comes from checking rather than from replication having worked. A 304 means the replica is current and can serve immediately; a 200 carries the new log index, so it catches up first and is then current by construction.",
        },
        checks: [
          {
            prompt: "Why is a 10ms verification per read acceptable here but not in a cache?",
            options: [
              "Git operations are large enough that a fixed check disappears into them",
              "Object storage charges nothing for requests that return 304 Not Modified",
              "The check runs in parallel with the read, so it adds no latency at all",
              "A cache can tolerate staleness, so verification is never needed there",
            ],
            correctIndex: 0,
            explain:
              "It is a ratio argument. Ten milliseconds is invisible inside a clone or a fetch and enormous next to a sub-millisecond key lookup, which is why the technique fits this workload and not every workload.",
          },
          {
            prompt: "What does verifying on read let the replication layer stop guaranteeing?",
            options: [
              "That an update actually reached every replica before it is read",
              "That updates are applied to each replica in their committed order",
              "That the log itself is durable once a push has been acknowledged",
              "That two concurrent pushes to one branch are ordered against each other",
            ],
            correctIndex: 0,
            explain:
              "Delivery becomes an optimisation rather than a correctness requirement, because a replica that missed an update discovers the gap before answering. Ordering and durability still come from the log, and are not what replication was providing.",
          },
          {
            prompt: "Why does this give read-your-own-writes without pinning a client anywhere?",
            options: [
              "Pushes are ordered in the log, and every read verifies against the log",
              "The client carries its last known log index in each subsequent request",
              "A push is broadcast synchronously to every replica before it returns",
              "Reads are routed to the same replica that accepted the client's push",
            ],
            correctIndex: 0,
            explain:
              "The acknowledgement means the push is in the log, and any replica checks the log before answering, so it cannot serve a view that predates the push. No session affinity and no client-side bookkeeping is required.",
          },
        ],
        sources: [
          {
            label: "Cursor, Git at any scale (2026)",
            url: "https://cursor.com/blog/git-at-any-scale",
            supports: "That replicas perform a conditional GET with an ETag, that a 304 is a metadata-only operation taking less than 10ms on average, and that a 200 returns the latest log index for catch-up before the read is served.",
          },
        ],
      },
      {
        id: "cursor-gossip",
        title: "Replication that is allowed to fail",
        level: "advanced",
        body: [
          "Given that every read verifies against the log, replication no longer has a correctness job. Its only job is to make the common case fast by getting updates to replicas before anybody asks for them, and something whose only job is to be an optimisation can be built very differently from something that has to be right.",
          "So it is gossip over UDP. A node that accepts a push tells the others, best effort, in a datagram that may simply not arrive. There is no acknowledgement, no retransmission and no delivery guarantee, and the article is direct about why that is acceptable: a lost packet costs a replica one 200 instead of one 304 on its next read, which is to say it costs one catch-up that would have happened anyway. Nothing is incorrect, only slightly slower.",
          "The sentence worth taking from this section is the design goal it states: always correct when degraded, and always fast when healthy. Those two properties usually pull against each other, and the reason they do not here is that they have been assigned to different mechanisms. Correctness lives entirely in the conditional read against the log. Speed lives entirely in the gossip. Neither mechanism is trying to provide both, so neither has to be compromised for the other.",
          "That separation is the transferable idea, and it inverts the usual instinct. Most systems make replication reliable and then read from replicas hopefully; this one makes replication unreliable and reads carefully. The second arrangement is easier to build, because an unreliable broadcast has no failure modes worth the name, and it degrades better, because a replication outage produces slower reads rather than wrong ones. It is also what makes hundreds of replicas practical. Reliable delivery to hundreds of nodes is an increasingly expensive proposition, with acknowledgement tracking and retry state per peer, and it is exactly the cost that made adding replicas painful in the consensus design. Fire-and-forget datagrams cost the sender almost nothing per additional recipient, so the replica count stops being a factor in what replication costs.",
        ],
        why:
          "Assigning correctness and speed to different mechanisms is what lets each be built for one purpose. Because the conditional read makes staleness self-correcting, the replication layer can be a best-effort UDP broadcast with no acknowledgements, which has almost no failure modes and no per-peer cost. The usual arrangement, reliable replication plus hopeful reads, is harder to build and degrades worse, because a replication failure produces incorrect answers rather than slower ones.",
        inPractice:
          "The general principle is that a component's guarantees should be as weak as the system can tolerate, because weaker guarantees are cheaper and fail less interestingly. Cache invalidation messages are the everyday version: a lost invalidation is survivable if entries are versioned or expire, so the delivery mechanism can be cheap, whereas a design where correctness depends on the invalidation arriving needs that delivery to be reliable and will still be wrong occasionally.",
        diagram: {
          caption: "Correctness in one mechanism, speed in another, neither compromised",
          columns: [
            [{ id: "push", label: "Push accepted", sub: "already in the log", kind: "client" }],
            [
              { id: "gossip", label: "Gossip over UDP", sub: "no acks, no retries", kind: "queue" },
              { id: "rel", label: "Reliable delivery", sub: "per-peer state, costly at scale", kind: "queue", alternative: true },
            ],
            [
              { id: "got", label: "Packet arrives", sub: "replica already current", kind: "service" },
              { id: "lost", label: "Packet lost", sub: "replica does not know yet", kind: "service", alternative: true },
            ],
            [
              { id: "f304", label: "Next read: 304", sub: "fast when healthy", kind: "external" },
              { id: "f200", label: "Next read: 200", sub: "correct when degraded", kind: "external" },
            ],
          ],
          edges: [
            { from: "push", to: "gossip", label: "best effort" },
            { from: "push", to: "rel", label: "the usual instinct" },
            { from: "gossip", to: "got", label: "usually" },
            { from: "gossip", to: "lost", label: "sometimes" },
            { from: "got", to: "f304", label: "serve at once" },
            { from: "lost", to: "f200", label: "catch up, then serve" },
          ],
        },
        check: {
          prompt: "Why is best-effort UDP acceptable as the replication mechanism?",
          options: [
            "A lost packet costs one catch-up on the next read, not a wrong answer",
            "Packet loss between nodes in one data centre is rare enough to ignore",
            "The log retransmits any update that no replica acknowledged receiving",
            "Reads are routed away from replicas that have missed a recent update",
          ],
          correctIndex: 0,
          explain:
            "Because every read verifies against the log first, a replica that missed an update finds out before it answers. The gossip is purely an optimisation, so losing some of it degrades speed rather than correctness.",
        },
        checks: [
          {
            prompt: "What does always correct when degraded, always fast when healthy describe?",
            options: [
              "Correctness and speed assigned to two separate mechanisms",
              "A replica that falls back to the object store when peers are down",
              "A system tuned so that the degraded path is also the fast path",
              "Two consistency levels the client can choose between per request",
            ],
            correctIndex: 0,
            explain:
              "The conditional read against the log provides correctness on its own, and the gossip provides speed on its own. Because neither mechanism is trying to deliver both properties, neither has to be compromised for the other.",
          },
          {
            prompt: "Why does unreliable replication scale to hundreds of replicas better?",
            options: [
              "A fire-and-forget datagram costs the sender almost nothing per peer",
              "Fewer replicas need the update, since only the busy ones are told",
              "Replicas gossip onward to each other, so the sender contacts one",
              "The object store fans the update out rather than the accepting node",
            ],
            correctIndex: 0,
            explain:
              "Reliable delivery means acknowledgement tracking and retry state per peer, which is exactly the per-replica cost that made adding replicas painful in the consensus design. Removing the guarantee removes the per-replica bookkeeping with it.",
          },
          {
            prompt: "Which everyday mechanism has the same shape as this gossip layer?",
            options: [
              "Cache invalidation, where entries are also versioned or expiring",
              "A dead letter queue, which preserves what could not be processed",
              "A synchronous replica kept for durability rather than for reads",
              "A health check, which removes a failing node from the pool",
            ],
            correctIndex: 0,
            explain:
              "If entries carry a version or a short lifetime, a lost invalidation is survivable and the delivery mechanism can be cheap. If correctness depends on the message arriving, delivery has to be reliable and will still occasionally fail.",
          },
        ],
        sources: [
          {
            label: "Cursor, Git at any scale (2026)",
            url: "https://cursor.com/blog/git-at-any-scale",
            supports: "That replication is optimistic, using gossip UDP packets around the cluster, that packet loss is acceptable because every read verifies consistency against the object store, and the stated goal of being always correct when degraded and always fast when healthy.",
          },
        ],
      },
      {
        id: "cursor-numbers",
        title: "The numbers, and where the bottleneck moved",
        level: "advanced",
        body: [
          "The measurements are what turn the argument into evidence, and there are three worth holding. On S3 Standard the system sustains up to 120 pushes per second while simultaneously compacting and replicating the compacted data to every other node. On S3 Express One Zone, the lower-latency variant, it exceeds 300 pushes per second. And stress testing showed linear scaling for reads up to 100 replicas with no regression in push throughput at all.",
          "That third number is the claim the whole architecture was built to make. In the consensus design, replicas and push throughput were coupled by the protocol, so reads could only be scaled by making writes worse. Here they are independent, and the measurement says so: a hundredfold increase in read capacity for no measurable write cost. Everything else in the design is machinery in service of that one property.",
          "The second number is interesting for a different reason: what it says about where the limit now sits. Moving to faster storage roughly tripled push throughput and then stopped being the constraint, because the system became bottlenecked by the speed at which Git can compact the on-disk data. The bottleneck moved out of the storage layer and into Git itself, which is the honest sign that the storage problem has been solved as far as this design can solve it. Optimising the object store further would now buy nothing.",
          "Compaction is also where the design gets one more benefit that is easy to skip past. Only the primary compacts, and the result is applied to both its on-disk repository and the log at once, so every other replica downloads the already-compacted packs from the object store rather than repacking the same data itself. The article's phrase for this is trading bandwidth for CPU, and it removes a genuine hazard from the previous generation, where repacking a large repository across several nodes was an availability risk on all of them at the same time.",
          "One last property is worth naming because it comes free and is the sort of thing you only appreciate after an incident. Every push is in the log, permanently, which means the system has a complete and authoritative record of what happened without any external database keeping it. The article notes this as what lets a Git bug be analysed and remediated retrospectively, and that is a genuine operational difference: the question of what state a repository was in last Tuesday is a lookup rather than an investigation.",
        ],
        why:
          "The number that matters is the one that shows the coupling gone: a hundred read replicas with no push throughput regression. That is what the log, the warm cache and the unreliable gossip were all for, and without the measurement it would only be an argument. The second lesson is where the bottleneck went: once faster storage stopped helping and Git's own compaction became the limit, the storage problem was as solved as this design can make it, and further work on the object store would be optimising something that is no longer the constraint.",
        inPractice:
          "Watching where a bottleneck moves is the honest way to know when to stop. The pattern to copy is the compaction one: do the expensive transformation once, centrally, publish the result, and let everyone else download it rather than recompute it. A build cache does this, a CDN doing image transformation at the edge does this, and a materialised view does this. In each case the alternative is every consumer spending CPU on identical work.",
        diagram: {
          caption: "Reads scale to a hundred replicas; the limit is now Git, not storage",
          columns: [
            [{ id: "std", label: "S3 Standard", sub: "up to 120 pushes/s", kind: "data" },
             { id: "exp", label: "S3 Express One Zone", sub: "over 300 pushes/s", kind: "data" }],
            [{ id: "git", label: "Git compaction", sub: "the new bottleneck", kind: "service" }],
            [{ id: "prim", label: "Primary compacts", sub: "applied to disk and log", kind: "service" }],
            [{ id: "reps", label: "100 replicas", sub: "download compacted packs", kind: "edge" },
             { id: "reads", label: "Linear read scaling", sub: "no push regression", kind: "external" }],
          ],
          edges: [
            { from: "std", to: "git", label: "storage was the limit" },
            { from: "exp", to: "git", label: "now it is not" },
            { from: "git", to: "prim", label: "done in one place" },
            { from: "prim", to: "reps", label: "bandwidth for CPU" },
            { from: "reps", to: "reads", label: "the claim, measured" },
          ],
        },
        check: {
          prompt: "Which measurement is the one the whole architecture exists to produce?",
          options: [
            "Linear read scaling to 100 replicas with no push throughput regression",
            "Over 300 pushes per second on a lower-latency storage class",
            "A conditional metadata check completing in under 10ms on average",
            "Up to 120 pushes per second while compacting and replicating",
          ],
          correctIndex: 0,
          explain:
            "In the consensus design, read capacity and write latency were coupled with the wrong sign. Decoupling them is what the log, the warm cache and the unreliable gossip were all in service of, and this is the number that shows it worked.",
        },
        checks: [
          {
            prompt: "After moving to faster storage, what became the constraint?",
            options: [
              "Git's own speed at compacting the data on disk",
              "The bandwidth available for replicating packs to peers",
              "The rate at which conditional GETs could be issued",
              "Contention on the compare-and-swap against the log head",
            ],
            correctIndex: 0,
            explain:
              "Throughput roughly tripled and then stopped responding to storage improvements, which is the sign that the storage problem is solved as far as this design solves it. Further work on the object store would optimise something that is no longer the limit.",
          },
          {
            prompt: "Why does only the primary perform compaction?",
            options: [
              "The result is published, so replicas download it instead of recomputing",
              "Compaction requires the write lock, which only the primary can hold",
              "Replicas lack the full object graph needed to compute the deltas",
              "Compacting on a replica would invalidate its ETag for the log head",
            ],
            correctIndex: 0,
            explain:
              "Doing the expensive transformation once and publishing the result means every other replica trades bandwidth for CPU. It also removes the hazard of repacking a large repository on several nodes at once, which put all of them at risk simultaneously.",
          },
          {
            prompt: "What does keeping every push in the log give operationally?",
            options: [
              "An authoritative history, so past state is a lookup not an enquiry",
              "A rollback mechanism that can revert any push after the fact",
              "A guarantee that no replica can ever diverge from the primary",
              "A way to rebuild a repository without contacting the object store",
            ],
            correctIndex: 0,
            explain:
              "The provenance comes free because the log is already the source of truth. Asking what state a repository was in at some past moment becomes a query rather than an investigation, with no external database maintaining it.",
          },
        ],
        sources: [
          {
            label: "Cursor, Git at any scale (2026)",
            url: "https://cursor.com/blog/git-at-any-scale",
            supports: "The throughput figures quoted here: up to 120 pushes per second on S3 Standard while compacting and replicating, over 300 on S3 Express One Zone before becoming bottlenecked by Git's compaction speed, and consistent linear read scaling to 100 replicas with no push throughput regression.",
          },
          {
            label: "AWS, S3 Express One Zone",
            url: "https://aws.amazon.com/s3/storage-classes/express-one-zone/",
            supports: "That the storage class used for the higher figure is a single-zone, lower-latency variant, which is why the comparison isolates storage latency as the variable.",
          },
        ],
      },
    ],
  },
  {
    id: "openai-agents",
    title: "OpenAI: ten thousand agents on a Navier-Stokes result",
    summary:
      "What was actually claimed and what was not, the shape of a ten thousand agent run, the message and token economics, and why a Lean proof settles less than it appears to.",
    track: "dissection",
    subject: {
      title: "On the Navier-Stokes Millennium Prize Problem",
      url: "https://openai.com/index/navier-stokes-solution/",
      publisher: "OpenAI",
      published: "2026-09-08",
      note: "Worth dissecting for the orchestration rather than the mathematics: it is the most detailed public account of running agents at this scale, and the caveats OpenAI states about it are as instructive as the result.",
    },
    topics: [
      {
        id: "oai-what-was-claimed",
        title: "What was claimed, and what was not",
        level: "intermediate",
        body: [
          "Start here, because the headline version of this story is wrong in a way that matters. The claim is that a proof was produced showing that the three-dimensional incompressible Navier-Stokes equations can develop a singularity in finite time, with a smooth forcing term applied. Not the unforced equations. The forcing term is in the statement, and leaving it out is the difference between a specific technical result and a claim about one of the seven Millennium Prize Problems.",
          "The distinction is not a quibble, and the reason is in how the Clay Mathematics Institute wrote the problem. Fefferman's official description offers four statements, any one of which would qualify: two assert existence and smoothness, and two assert breakdown. The breakdown statements permit a forcing term subject to decay conditions, which is why this result targets those rather than being outside the problem entirely. So the honest description is that it addresses a recognised route to the prize, and whether the formal statement satisfies the conditions Fefferman specified is exactly what is under review.",
          "OpenAI is explicit that it does not intend to claim the prize, and the process explains why that is not modesty. The Clay rules require publication in a peer-reviewed mathematics journal, followed by at least two years, followed by general acceptance in the community. None of those has happened. A published manuscript and a machine-checked formalisation are evidence offered for scrutiny, and the scrutiny is the part that has not begun.",
          "What was published is a manuscript of around 166 pages, titled after finite-time blowup, together with a formalisation in Lean. That is a substantially more checkable artefact than a claim on its own, and it is the right thing to have released. It is also not the same as a verified solution to the Millennium Problem, and the gap between those two things is the subject of the last topic in this card.",
          "The reason to open a technical dissection with a section on framing is that this is the engineering lesson, not a disclaimer attached to one. A system that produces a result also produces a claim about that result, and the claim is where almost all of the failures live: too strong, insufficiently scoped, or stated in a way that invites a reader to hear something the evidence does not support. Getting the scope of a claim right is part of the work, and it is the part that is easiest to skip when the result is exciting.",
        ],
        why:
          "The forcing term is the whole distinction between a specific result and a solved Millennium Problem, and every summary that dropped it produced a claim the evidence does not support. The transferable point is that the scope of a claim is part of the deliverable: a system that generates a result and a system that states what the result means are the same system, and the second half is where the errors concentrate.",
        inPractice:
          "This is the same discipline as a benchmark that names its conditions. A latency figure without the percentile, the concurrency and the hardware is not a measurement, it is an advertisement, and the honest version is longer and less quotable. Anyone publishing a result from an automated system inherits this problem, because the system will produce numbers faster than anyone can qualify them.",
        diagram: {
          caption: "The claim, the conditions on it, and the process that has not run yet",
          columns: [
            [{ id: "res", label: "The result", sub: "finite-time blowup, 3D Navier-Stokes", kind: "client" }],
            [
              { id: "force", label: "With smooth forcing", sub: "what was actually proved", kind: "data" },
              { id: "unforced", label: "Without forcing", sub: "not what was proved", kind: "data", alternative: true },
            ],
            [{ id: "clay", label: "Clay C and D", sub: "breakdown, forcing permitted", kind: "service" }],
            [
              { id: "proc", label: "Journal, two years", sub: "then general acceptance", kind: "external" },
              { id: "noclaim", label: "Prize not claimed", sub: "OpenAI states this", kind: "external" },
            ],
          ],
          edges: [
            { from: "res", to: "force", label: "as stated" },
            { from: "res", to: "unforced", label: "as reported" },
            { from: "force", to: "clay", label: "targets these" },
            { from: "clay", to: "proc", label: "requires all three" },
            { from: "proc", to: "noclaim", label: "none has happened" },
          ],
        },
        check: {
          prompt: "What is the specific condition on the published result that most summaries dropped?",
          options: [
            "It concerns the equations with a smooth forcing term applied",
            "It concerns the two-dimensional rather than the three-dimensional case",
            "It establishes smoothness rather than the breakdown of a solution",
            "It holds only for the periodic domain rather than for all of space",
          ],
          correctIndex: 0,
          explain:
            "The forcing term is in the statement, and it is the difference between a specific technical result and a claim about the unforced Millennium Problem. Clay's breakdown statements do permit forcing, so this is a recognised route rather than an unrelated result, and whether the formal statement meets Fefferman's conditions is what is under review.",
        },
        checks: [
          {
            prompt: "Why does OpenAI not intend to claim the Millennium Prize?",
            options: [
              "The rules need a journal publication, two years, then acceptance",
              "The prize excludes results produced with machine assistance",
              "The proof addresses a statement Clay does not recognise at all",
              "The formalisation has not yet been checked by the Lean compiler",
            ],
            correctIndex: 0,
            explain:
              "The Clay process requires peer-reviewed publication, a waiting period of at least two years, and general acceptance in the mathematical community. None of that has happened yet, so the question is premature rather than settled either way.",
          },
          {
            prompt: "What did OpenAI publish alongside the announcement?",
            options: [
              "A manuscript of around 166 pages and a Lean formalisation",
              "The complete transcript of every message the agents exchanged",
              "The weights of the model that produced the result, for checking",
              "A dataset of the intermediate lemmas each group of agents proved",
            ],
            correctIndex: 0,
            explain:
              "A written proof plus a machine-checkable formalisation is a substantially more checkable artefact than a claim on its own, which is the right thing to have released. It is still not the same as a verified solution to the prize problem.",
          },
          {
            prompt: "What is the transferable engineering lesson from the framing?",
            options: [
              "Scoping the claim is part of the work, not a caveat added after",
              "Results from automated systems should be withheld until peer reviewed",
              "A formal proof is the only acceptable evidence for a strong claim",
              "Announcements should quote no numbers that cannot be reproduced",
            ],
            correctIndex: 0,
            explain:
              "A system that produces a result also produces a claim about it, and the claim is where the failures concentrate: too strong, insufficiently conditioned, or phrased so a reader hears more than the evidence supports. That is the same discipline as a benchmark naming its conditions.",
          },
        ],
        sources: [
          {
            label: "OpenAI, On the Navier-Stokes Millennium Prize Problem (2026)",
            url: "https://openai.com/index/navier-stokes-solution/",
            supports: "The claim as stated, that the dynamics can develop a singularity in finite time, the accompanying writeup and Lean formalisation, and that OpenAI does not intend to claim the prize.",
          },
          {
            label: "Fefferman, Existence and smoothness of the Navier-Stokes equation (Clay Mathematics Institute)",
            url: "https://www.claymath.org/wp-content/uploads/2022/06/navierstokes.pdf",
            supports: "The four qualifying statements, and that the breakdown statements permit a forcing term subject to decay conditions while the existence statements require it to vanish.",
          },
          {
            label: "Clay Mathematics Institute, rules for the Millennium Prizes",
            url: "https://www.claymath.org/millennium-problems/millennium-prize-problems/",
            supports: "That a solution must be published in a peer-reviewed journal and have general acceptance in the mathematics community after at least two years.",
          },
        ],
      },
      {
        id: "oai-topology",
        title: "The shape of a ten thousand agent run",
        level: "advanced",
        body: [
          "The system is described as coordinating agents running on an internal model, subdivided into groups, with agents able to communicate with others in their own group. The Navier-Stokes work involved on the order of ten thousand concurrent agents. The two structural details worth extracting are that the population was partitioned rather than flat, and that communication was scoped to the partition rather than global.",
          "Both of those are the obvious engineering answer to the obvious problem, which is that a flat population of ten thousand communicating peers is not a system, it is a broadcast storm.",
          "Communication cost between n participants who can all talk to each other grows with the square of n, so ten thousand peers is on the order of fifty million possible channels and no useful signal in any of them. Partitioning into groups makes the cost linear in the number of groups and quadratic only within one, which is the same argument as sharding, and the same argument as a service mesh preferring a hierarchy to a full graph.",
          "Cross-group communication then needs a deliberate mechanism, and the account names one: Codex was used to consolidate promising intermediate ideas from different groups. That is a reduce step. Groups explore independently, something reads across them and pulls out what is worth propagating, and the result seeds further work. It is map-reduce with a language model as the reducer, and the shape is much older than the tooling.",
          "There is an earlier phase reported that is more instructive than the headline, because it shows the resource allocation being managed rather than simply spent. Nearly a hundred agents worked for about fifty hours on the related Euler equations before resources were redirected. That is a bet placed, evaluated and abandoned, which is what a search over an expensive space has to look like: run cheap exploratory arms, decide, and concentrate the budget on the one that is moving.",
          "The timeline gives the whole thing a scale. Training of the model began on 28 August, agents were launched on 1 September, and the result was reached on 5 September, about 88 hours after the first agents started. Then a further 17 hours of formalisation and checking. So the compute is enormous and the wall-clock is four days, which is the trade being demonstrated: an embarrassingly parallel search converts money into elapsed time at a rate no individual can match.",
        ],
        why:
          "Partitioning with scoped communication is the load-bearing decision, because all-to-all messaging between ten thousand participants is quadratic and produces no usable signal. Groups make the exploration parallel and the coordination affordable, and a separate consolidation step is then required to move an insight between them. The earlier hundred-agent arm that was abandoned after fifty hours is the part worth copying: an expensive search needs explicit reallocation, not just scale.",
        inPractice:
          "The topology is the one every large-scale search converges on, whichever era it belongs to. Genetic algorithms use island models with occasional migration for the same reason: fully mixed populations lose diversity and cost too much to synchronise. Distributed hyperparameter search runs independent trials with a scheduler that kills the unpromising ones, which is the same reallocation decision. The scoped-communication-plus-consolidation shape is not novel here, and that is what makes it credible.",
        diagram: {
          caption: "Groups explore in parallel; a consolidation step moves ideas between them",
          columns: [
            [{ id: "prob", label: "The problem", sub: "one target, huge search space", kind: "client" }],
            [
              { id: "g1", label: "Group", sub: "agents talk within it", kind: "service" },
              { id: "g2", label: "Group", sub: "agents talk within it", kind: "service" },
              { id: "g3", label: "Group", sub: "~10,000 agents in total", kind: "service" },
              { id: "flat", label: "One flat population", sub: "quadratic, no signal", kind: "service", alternative: true },
            ],
            [{ id: "cons", label: "Consolidation", sub: "Codex reads across groups", kind: "edge" }],
            [
              { id: "euler", label: "Euler arm abandoned", sub: "~100 agents, ~50 hours", kind: "external", alternative: true },
              { id: "res", label: "Result at 88 hours", sub: "then 17 hours in Lean", kind: "external" },
            ],
          ],
          edges: [
            { from: "prob", to: "g1", label: "partitioned" },
            { from: "prob", to: "g2", label: "partitioned" },
            { from: "prob", to: "g3", label: "partitioned" },
            { from: "prob", to: "flat", label: "the naive shape" },
            { from: "g1", to: "cons", label: "promising ideas" },
            { from: "g2", to: "cons", label: "promising ideas" },
            { from: "cons", to: "res", label: "seeds further work" },
            { from: "cons", to: "euler", label: "budget redirected", async: true },
          ],
        },
        check: {
          prompt: "Why partition ten thousand agents into groups with communication scoped inside each?",
          options: [
            "All-to-all messaging is quadratic and produces no usable signal",
            "Groups let each one be trained on a different mathematical subfield",
            "A group is the unit of billing, so the cost can be attributed per arm",
            "Scoping messages is required because the context window is finite",
          ],
          correctIndex: 0,
          explain:
            "Ten thousand peers who can all address each other is on the order of fifty million channels, which is a broadcast storm rather than a system. Partitioning keeps the coordination cost linear in groups and quadratic only within one, which is the same argument as sharding.",
        },
        checks: [
          {
            prompt: "How did an insight move from one group to another?",
            options: [
              "A consolidation step read across groups and propagated what mattered",
              "Groups were periodically merged, so their members became peers",
              "Every group broadcast its conclusions to all the others directly",
              "A shared scratchpad was writable by any agent in any of the groups",
            ],
            correctIndex: 0,
            explain:
              "The account describes Codex being used to consolidate promising intermediate ideas from different groups. That is a reduce step: explore independently, read across, propagate what is worth propagating, and seed further work with it.",
          },
          {
            prompt: "What does the abandoned Euler arm demonstrate?",
            options: [
              "Budget being reallocated deliberately rather than merely spent",
              "That the Euler equations turned out to be the harder problem",
              "That a hundred agents is too few to make progress on anything",
              "That the model needed retraining before the work could continue",
            ],
            correctIndex: 0,
            explain:
              "Nearly a hundred agents worked about fifty hours on the related problem before resources were redirected. An expensive search needs explicit reallocation: run cheap exploratory arms, evaluate, and concentrate the budget on whichever is moving.",
          },
          {
            prompt: "What does the four-day wall clock against enormous compute demonstrate?",
            options: [
              "A parallel search converting money into elapsed time",
              "That the model had already solved the problem during training",
              "That coordination overhead was negligible at this scale",
              "That the same result is reachable by a single agent, more slowly",
            ],
            correctIndex: 0,
            explain:
              "Agents launched on 1 September and the result came on 5 September, roughly 88 hours later, with a further 17 hours of formalisation. The trade being demonstrated is that an embarrassingly parallel search buys elapsed time with compute.",
          },
        ],
        sources: [
          {
            label: "OpenAI, On the Navier-Stokes Millennium Prize Problem (2026)",
            url: "https://openai.com/index/navier-stokes-solution/",
            supports: "That agents were subdivided into groups able to communicate within them, that the Navier-Stokes group involved roughly ten thousand concurrent agents, and the timeline of 88 hours to the result plus 17 hours of formalisation.",
          },
          {
            label: "VentureBeat, OpenAI solves longstanding math problem with a 10,000-agent swarm",
            url: "https://venturebeat.com/technology/openai-solves-longstanding-math-problem-with-10-000-agent-swarm-but-cant-rule-out-benefitting-from-a-researchers-private-codex-data",
            supports: "The reported detail of the earlier phase, nearly a hundred agents working about fifty hours on the related Euler equations before resources were redirected, and that Codex was used to consolidate ideas across groups.",
          },
        ],
      },
      {
        id: "oai-economics",
        title: "2.7 million messages and 130 billion tokens",
        level: "advanced",
        body: [
          "The reported figures are unusually specific and worth doing arithmetic on, because the arithmetic is where the intuition comes from. Across all of the mathematical problems attempted, the agents exchanged 4.9 million messages and generated roughly 300 billion output tokens. The Navier-Stokes work alone accounted for 2.7 million messages and approximately 130 billion output tokens. Divide those by the population and the picture sharpens considerably. Ten thousand agents and 2.7 million messages is about 270 messages per agent across the run. Ten thousand agents and 130 billion output tokens is about 13 million output tokens each. Over 88 hours that is roughly 150,000 output tokens per agent per hour, or on the order of 40 per second, sustained, per agent, for the better part of four days.",
          "Two things follow from those numbers. The first is that this is not a chat workload, it is a batch compute workload that happens to be expressed in tokens, and it should be reasoned about the way any large batch job is: total throughput, cost per unit of work, and whether the result justified the spend. The second is that the message count is small relative to the token count, about 48,000 output tokens per message, which says the agents were producing substantial artefacts rather than conversing. That is the right shape. An agent population whose token budget goes into coordination rather than into work is a population doing very little.",
          "The ratio between the two problems is also informative: Navier-Stokes took roughly 55 per cent of the messages and 43 per cent of the output tokens of the whole programme, so it was the largest single consumer but not the only one. That is what a portfolio looks like rather than a single bet, and it is consistent with the earlier arm being abandoned: several things were being tried and the accounting reflects it.",
          "The honest caveat is that output tokens are not the cost. Input tokens are not reported, and in an agent system they usually dominate, because every step re-reads context, tool results and other agents' messages. A system generating 130 billion output tokens is plausibly reading many times that, which is why the public figure is a lower bound on the work rather than a measure of it. Anyone estimating the cost of something like this from the output count alone will be out by a large multiple, and the direction of the error is always the same.",
        ],
        why:
          "The useful move is to divide the totals by the population, because the aggregates are unintuitive and the per-agent numbers are not: roughly 270 messages and 13 million output tokens each, which is about 40 output tokens per second sustained for four days. That reframes the run as a batch compute job rather than a conversation. The ratio matters too: 48,000 output tokens per message means the budget went into producing artefacts rather than into coordination, which is the shape a working agent population should have.",
        inPractice:
          "The lower-bound problem is the one to carry into any estimate. Output tokens are the visible number and input tokens are usually the larger one, because agent steps re-read context, tool output and each other's messages, and caching changes the price of that without removing it. Anyone sizing an agent system from a published output-token figure should expect to be low by a multiple, which is the same error as sizing a database from its write volume while ignoring reads.",
        diagram: {
          caption: "Divide by the population, and it stops being a conversation",
          columns: [
            [{ id: "total", label: "Whole programme", sub: "4.9M messages, ~300B output tokens", kind: "client" }],
            [{ id: "ns", label: "Navier-Stokes", sub: "2.7M messages, ~130B tokens", kind: "data" }],
            [
              { id: "per", label: "Per agent", sub: "~270 messages, ~13M tokens", kind: "service" },
              { id: "rate", label: "Per agent, per sec", sub: "~40 output tokens, for 88 hours", kind: "service" },
            ],
            [
              { id: "artefact", label: "~48k per message", sub: "producing, not chatting", kind: "external" },
              { id: "input", label: "Input unreported", sub: "usually the larger number", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "total", to: "ns", label: "the largest single arm" },
            { from: "ns", to: "per", label: "divide by 10,000" },
            { from: "per", to: "rate", label: "divide by 88 hours" },
            { from: "per", to: "artefact", label: "tokens per message" },
            { from: "ns", to: "input", label: "a lower bound on the work" },
          ],
        },
        check: {
          prompt: "Roughly what does 130 billion output tokens across 10,000 agents work out to each?",
          options: [
            "About 13 million output tokens per agent over the whole run",
            "About 130 million output tokens per agent over the whole run",
            "About 1.3 million output tokens per agent over the whole run",
            "About 130,000 output tokens per agent over the whole run",
          ],
          correctIndex: 0,
          explain:
            "130 billion divided by ten thousand is 13 million each. Over 88 hours that is roughly 40 output tokens per second per agent, sustained, which is why this is better reasoned about as a batch compute job than as a conversation.",
        },
        checks: [
          {
            prompt: "What does about 48,000 output tokens per message suggest about the run?",
            options: [
              "The budget went into producing artefacts rather than coordinating",
              "Messages were batched, so each one carried many agents' output",
              "Agents were mostly idle, waiting on a small number of long messages",
              "Coordination dominated, which is why the message count is so high",
            ],
            correctIndex: 0,
            explain:
              "A high token-to-message ratio means each exchange carried substantial work rather than conversational back-and-forth. An agent population spending its budget on coordination rather than on output is a population achieving very little.",
          },
          {
            prompt: "Why is the output token figure a lower bound on the work done?",
            options: [
              "Input tokens are unreported and usually dominate in agent systems",
              "Tokens rejected by the sampler are not counted in the total",
              "Only messages between agents were counted, not tool invocations",
              "The figure covers the Navier-Stokes arm rather than the programme",
            ],
            correctIndex: 0,
            explain:
              "Every agent step re-reads context, tool results and other agents' messages, so input volume is typically a large multiple of output. Estimating the cost of such a system from the published output count alone will be low, and always in the same direction.",
          },
          {
            prompt: "What does the split between the two figures indicate about the programme?",
            options: [
              "A portfolio: Navier-Stokes was the largest arm, not the only one",
              "That the other problems were attempted after this one succeeded",
              "That messages and tokens are measured on different populations",
              "That the remaining budget went entirely to Lean formalisation",
            ],
            correctIndex: 0,
            explain:
              "Navier-Stokes accounted for roughly 55 per cent of the messages and 43 per cent of the output tokens of the whole programme. Several things were being attempted, which is consistent with the earlier arm having been abandoned when it stopped looking promising.",
          },
        ],
        sources: [
          {
            label: "OpenAI, On the Navier-Stokes Millennium Prize Problem (2026)",
            url: "https://openai.com/index/navier-stokes-solution/",
            supports: "The figures quoted here, that the Navier-Stokes work accounted for 2.7 million messages and roughly 130 billion output tokens.",
          },
          {
            label: "VentureBeat, OpenAI solves longstanding math problem with a 10,000-agent swarm",
            url: "https://venturebeat.com/technology/openai-solves-longstanding-math-problem-with-10-000-agent-swarm-but-cant-rule-out-benefitting-from-a-researchers-private-codex-data",
            supports: "The programme-wide totals of 4.9 million messages and roughly 300 billion output tokens across all problems attempted, which is what the Navier-Stokes share is computed against.",
          },
        ],
      },
      {
        id: "oai-tools",
        title: "Tools: running code, and a cached internet",
        level: "intermediate",
        body: [
          "The agents are described as having two capabilities beyond talking to each other: they could run code, and they could consult a cached version of the internet. Both choices are more interesting than they sound, and the second is the one worth pausing on.",
          "Code execution is what makes a search over mathematics tractable rather than merely fluent. A conjecture can be tested numerically, a counterexample can be looked for by brute force, an algebraic manipulation can be checked by a computer algebra system, and a candidate construction can be simulated. That converts a large class of questions from things an agent asserts into things an agent finds out, and the difference in reliability between those two is the entire reason tool use exists.",
          "A cached internet rather than a live one is a deliberate constraint and it buys three things at once. Reproducibility: ten thousand agents hitting live sources would each see a slightly different web, so the corpus would not be a fixed input and the run would not be repeatable. Rate limiting: ten thousand concurrent agents making live requests is a denial of service against whatever they are reading, and would be blocked within minutes. And determinism of the boundary: with a snapshot, the question of what the system had access to has an answer, which matters enormously for a claim about novelty and matters again for the provenance dispute this card returns to later.",
          "That last point is worth stating as a general principle, because it applies well outside this. Freezing an external dependency turns an unbounded question into a bounded one. What did the system know is unanswerable against a live internet and answerable against a snapshot, and any system whose output will be scrutinised for originality wants that property before it produces anything rather than after. The pairing is also the standard shape for this kind of work, and recognising it is more useful than treating it as novel. A generator proposes, a cheap checker rejects most proposals, and only what survives is worth an expensive step. Code execution is the cheap checker here and Lean is the expensive one, and the whole run is a funnel with those two filters in it. Without a checker, scaling a generator up just produces more unverified output, which is not progress in any direction.",
        ],
        why:
          "A cached corpus is the choice that does the most work: it makes the run reproducible, prevents ten thousand agents from behaving as a denial of service against live sources, and gives the question of what the system had access to an actual answer. That last property is what a claim of novelty depends on, and it has to be arranged before the run rather than reconstructed afterwards. Code execution matters for a different reason, which is that it converts assertions into findings.",
        inPractice:
          "Every serious agent system ends up with the generate-and-check shape, because a generator alone scales into more unverified output rather than into more correct output. The cheap checker is whatever is available: a compiler, a test suite, a type checker, a schema validator, a numerical simulation. The rule of thumb is that the value of scaling the generator is capped by the strength of the checker, so effort spent making the checker stronger usually beats effort spent making the generator larger.",
        diagram: {
          caption: "Generate, check cheaply, and only then spend the expensive verification",
          columns: [
            [{ id: "agents", label: "Agents", sub: "propose constructions and lemmas", kind: "client" }],
            [
              { id: "code", label: "Run code", sub: "simulate, brute force, check algebra", kind: "service" },
              { id: "web", label: "Cached internet", sub: "a fixed, reproducible corpus", kind: "data" },
            ],
            [{ id: "surv", label: "What survives", sub: "a small fraction of proposals", kind: "edge" }],
            [{ id: "lean", label: "Lean", sub: "the expensive checker", kind: "external" },
             { id: "live", label: "A live internet", sub: "irreproducible, and a DoS", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "agents", to: "code", label: "test it" },
            { from: "agents", to: "web", label: "read it" },
            { from: "code", to: "surv", label: "most proposals die here" },
            { from: "surv", to: "lean", label: "worth the expense" },
            { from: "web", to: "live", label: "the alternative" },
          ],
        },
        check: {
          prompt: "Why give the agents a cached snapshot of the internet rather than live access?",
          options: [
            "It is reproducible, it avoids overwhelming sources, and access is knowable",
            "Cached pages can be pre-processed into a format the model reads faster",
            "Live access would require credentials that cannot be shared per agent",
            "A snapshot can be filtered to remove mathematics the model already knew",
          ],
          correctIndex: 0,
          explain:
            "A snapshot makes the corpus a fixed input, so the run is repeatable; it prevents ten thousand concurrent agents from acting as a denial of service against whatever they read; and it means the question of what the system had access to has an answer, which is what a novelty claim depends on.",
        },
        checks: [
          {
            prompt: "What does code execution change about what an agent produces?",
            options: [
              "Claims become findings, because a conjecture can be tested",
              "Output becomes shorter, because results replace explanations",
              "The model no longer needs mathematical knowledge, only tooling",
              "Errors become impossible, since every step is verified as it runs",
            ],
            correctIndex: 0,
            explain:
              "A conjecture can be tested numerically, a counterexample searched for, an algebraic step checked. That converts a class of questions from things asserted into things found out, which is the whole reason tool use is worth the complexity.",
          },
          {
            prompt: "In the generate-and-check shape, what caps the value of a bigger generator?",
            options: [
              "The strength of the checker, since unchecked output is not progress",
              "The size of the context window each generated proposal must fit in",
              "The number of concurrent agents the coordination layer can address",
              "The rate at which the cached corpus can be searched by the agents",
            ],
            correctIndex: 0,
            explain:
              "Scaling a generator without a stronger checker produces more unverified output, which is not progress in any direction. That is why effort spent on the checker usually beats effort spent making the generator larger.",
          },
          {
            prompt: "Which two filters did this run put in its funnel?",
            options: [
              "Code execution as the cheap check, Lean as the expensive one",
              "Group consensus as the cheap check, human review as the expensive one",
              "A cached corpus as the cheap check, code execution as the expensive one",
              "Consolidation as the cheap check, retraining as the expensive one",
            ],
            correctIndex: 0,
            explain:
              "Running code rejects most proposals for very little cost, and formalisation in Lean is applied only to what survives. Both are checkers rather than generators, which is what makes the funnel a funnel.",
          },
        ],
        sources: [
          {
            label: "OpenAI, On the Navier-Stokes Millennium Prize Problem (2026)",
            url: "https://openai.com/index/navier-stokes-solution/",
            supports: "That agents had access to tools including running code and reading from a cached version of the internet, and that they communicated with other agents within their groups.",
          },
        ],
      },
      {
        id: "oai-lean",
        title: "Lean as the referee, and what it does not settle",
        level: "advanced",
        body: [
          "After the agents reached their result, a further 17 hours went into formalising and checking the proof in Lean. Lean is an interactive theorem prover with a small trusted kernel: you write a statement and a proof in its language, and the kernel mechanically verifies that the proof establishes the statement from the axioms. It does not read prose, it does not accept a gap, and it does not get tired at page 140 of 166.",
          "That is a genuinely strong guarantee and it is precisely bounded, which is why it deserves stating carefully. What a Lean check establishes is that the formal statement follows from the axioms by the rules of the logic. Every step is present and every step is valid. For a long analytic argument, where the traditional failure mode is a lemma that is true in the cases the author considered and false in one they did not, this closes off the most likely way for a claimed proof to be wrong.",
          "What it does not establish is that the formal statement is the theorem anyone cares about.",
          "Between Fefferman's problem description and a Lean statement sits a translation, and the translation is done by humans and machines with no formal check of its own. Getting the function spaces right, the decay conditions right, the quantifiers in the right order, the notion of solution matching the one specified: each is an opportunity to formalise something adjacent to the intended claim and prove that instead. Nothing in the Lean toolchain can catch it, because the toolchain's job starts after the statement is written.",
          "So the verification is real and the gap is in a specific place, and naming that place is more useful than either dismissing the check or over-reading it. The proof is machine-verified. Whether the machine verified the right proposition is a question for mathematicians reading the statement, which is exactly what the review period exists for, and it is why the Lean artefact accelerates the scrutiny rather than replacing it.",
          "Terence Tao's objection is aimed somewhere else again and is worth carrying, because it is about value rather than validity. The primary worth of mathematical work, on his framing, is the digestible insight rather than the fact that a problem is closed; if the search process remains a black box, its value to mathematics is close to zero. A verified proof that nobody can extract a technique from settles one question and teaches nothing, and for a field whose output is understanding rather than answers, that is a real deficiency rather than a philosophical complaint.",
        ],
        why:
          "A machine-checked proof closes the most likely failure mode of a long analytic argument, which is a gap nobody noticed, and leaves untouched the one nothing in the toolchain can check: whether the formalised statement is the intended one. That translation from an informal problem description into a formal statement is where the remaining risk lives, and knowing exactly where it lives is what makes the artefact useful rather than either conclusive or worthless.",
        inPractice:
          "The pattern is the same as any verification whose scope is narrower than its reputation. A type checker proves internal consistency and says nothing about whether the types describe reality, which is why data from a network still needs validating. A passing test suite proves the assertions hold and says nothing about whether the assertions were the right ones. In each case the technique is sound and the gap sits at the boundary where an informal intention becomes a formal statement, and that boundary is always checked by a person.",
        diagram: {
          caption: "The proof is checked mechanically; the statement is checked by people",
          columns: [
            [{ id: "prob", label: "Fefferman's spec", sub: "informal, with conditions", kind: "client" }],
            [
              { id: "trans", label: "Translation", sub: "spaces, decay, quantifiers", kind: "service", alternative: true },
            ],
            [{ id: "stmt", label: "Lean statement", sub: "formal, and possibly adjacent", kind: "data" }],
            [
              { id: "kernel", label: "Kernel check", sub: "17 hours, no gaps permitted", kind: "external" },
              { id: "review", label: "Human review", sub: "is this the right statement?", kind: "external" },
            ],
          ],
          edges: [
            { from: "prob", to: "trans", label: "unchecked step" },
            { from: "trans", to: "stmt", label: "written by hand" },
            { from: "stmt", to: "kernel", label: "mechanically verified" },
            { from: "stmt", to: "review", label: "the remaining question" },
          ],
        },
        check: {
          prompt: "What does a successful Lean check establish, and what does it leave open?",
          options: [
            "That the proof follows from the axioms, not that the statement is the right one",
            "That the statement matches the problem, not that every step was verified",
            "That the result is novel, not that the argument avoids circular reasoning",
            "That the argument is readable, not that the conclusion actually holds",
          ],
          correctIndex: 0,
          explain:
            "The kernel verifies mechanically that every step is present and valid, which closes off the usual way a long analytic proof goes wrong. The translation from an informal problem description into a formal statement has no formal check of its own, and that is where the remaining risk sits.",
        },
        checks: [
          {
            prompt: "Which failure does formalisation most effectively rule out?",
            options: [
              "A lemma that holds in the cases considered and fails in one that was not",
              "A statement formalised with the wrong decay conditions on the forcing",
              "A result that is correct but was already known to the literature",
              "A proof whose steps are valid but whose technique teaches nothing",
            ],
            correctIndex: 0,
            explain:
              "That is exactly the gap a human referee misses at page 140 and a kernel cannot miss at all. The other three are real concerns and none of them is something a proof checker is able to evaluate.",
          },
          {
            prompt: "What is Tao's objection actually about?",
            options: [
              "Value: a black-box search yields little insight for mathematics",
              "Validity: a machine-checked proof may still contain an error",
              "Priority: the same result was under development elsewhere",
              "Provenance: the training data may have included private work",
            ],
            correctIndex: 0,
            explain:
              "His framing is that the worth of such work lies in the digestible insight rather than in a problem being closed, and that a search process which remains opaque has value close to zero. That is a complaint about what the field gains, not about whether the proof holds.",
          },
          {
            prompt: "Which everyday verification has the same bounded scope?",
            options: [
              "A type checker, which proves consistency and not correspondence",
              "A linter, which enforces a style guide across a whole codebase",
              "A load test, which measures behaviour under a chosen traffic shape",
              "A code review, which relies on a second person reading carefully",
            ],
            correctIndex: 0,
            explain:
              "Types prove the program is internally consistent and say nothing about whether they describe the data that will arrive, which is why external input still needs validating. The gap is at the boundary where an informal intention becomes a formal statement.",
          },
        ],
        sources: [
          {
            label: "OpenAI, On the Navier-Stokes Millennium Prize Problem (2026)",
            url: "https://openai.com/index/navier-stokes-solution/",
            supports: "That a formalisation in Lean was produced and released alongside the written proof, and the reported further 17 hours spent formalising and checking it.",
          },
          {
            label: "Lean: theorem proving in Lean 4",
            url: "https://leanprover.github.io/theorem_proving_in_lean4/",
            supports: "What a Lean check establishes: that a proof term inhabits the stated type, verified by a small trusted kernel, which is a statement about the formalised proposition rather than about its faithfulness to an informal one.",
          },
        ],
      },
      {
        id: "oai-disputes",
        title: "The disputes, and why provenance is an engineering problem",
        level: "advanced",
        body: [
          "Two mathematicians, Tristan Buckmaster at NYU and Levent Alpöge, had spent months working with AI systems on a closely related line of research on forced Euler equations. The overlap in subject and timing produced a question about where OpenAI's result came from, and the question has not been resolved. Buckmaster has said plainly that he has not seen the proof and does not know what the model did or how it worked.",
          "OpenAI's position, as reported, is that the model did not have access to their specific work before publication, while acknowledging that it cannot rule out that de-identified data contributed to training. Those two statements are compatible and the second is the significant one, because it is an admission about a system property rather than about an incident: if product data flows into training in de-identified form, then the question of whether a particular user's work influenced a particular output is not answerable, by construction.",
          "That is what makes this an engineering topic rather than a news item. Provenance of inputs is a property you build in or lack permanently, and it cannot be reconstructed after the fact. The cached corpus discussed earlier is the good version: a frozen snapshot means the question of what the system could read has an answer. The training data is the bad version, not because anything improper is established, but because the pipeline was not designed to answer questions of this shape and so cannot answer them now.",
          "The priority dimension is separate and simpler. Two groups working the same problem is ordinary in mathematics and the discipline has machinery for it: preprints with dates, journal submission records, seminar talks. What is new is the possibility that one party's tooling saw the other's unpublished work, which the existing machinery has no answer for, because it was designed for a world where reading someone's drafts required them to hand them to you.",
          "The transferable rule is short and unpopular. If a system's outputs will be scrutinised for originality, the provenance of its inputs has to be a designed property with an audit trail, decided before the system runs. Everything else, including a completely honest denial, reduces to a claim that cannot be checked, and a claim that cannot be checked is worth very little precisely when it matters most. The cached internet in this same system shows that OpenAI knows how to do this; the training pipeline shows what it costs when a component was not built for the question later asked of it.",
        ],
        why:
          "The admission that de-identified training data cannot be ruled out is a statement about the architecture, not about an incident: a pipeline that anonymises inputs cannot afterwards answer whether a specific person's work influenced a specific output. That is why provenance has to be designed in rather than investigated later. The same system shows both answers, since the frozen corpus makes what the agents could read a knowable fact and the training data does not.",
        inPractice:
          "The general requirement is a lineage trail: for any output, which inputs contributed and under what licence or consent. Data platforms have converged on this because regulators asked, and machine learning systems are being asked the same questions later and with weaker foundations. The practical test is whether you could answer, in writing, which customer data contributed to a given model artefact. If the answer needs an investigation, the property does not exist.",
        diagram: {
          caption: "One system, two answers: a frozen corpus is knowable, training data is not",
          columns: [
            [{ id: "out", label: "A published result", sub: "scrutinised for originality", kind: "client" }],
            [
              { id: "cache", label: "Cached corpus", sub: "frozen, enumerable", kind: "data" },
              { id: "train", label: "Training data", sub: "de-identified, not traceable", kind: "data", alternative: true },
            ],
            [
              { id: "ans", label: "What could it read?", sub: "answerable", kind: "service" },
              { id: "unans", label: "Whose work?", sub: "unanswerable by construction", kind: "service", alternative: true },
            ],
            [{ id: "claim", label: "An honest denial", sub: "that nobody can check", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "out", to: "cache", label: "one input" },
            { from: "out", to: "train", label: "the other input" },
            { from: "cache", to: "ans", label: "designed in" },
            { from: "train", to: "unans", label: "not designed in" },
            { from: "unans", to: "claim", label: "all that remains" },
          ],
        },
        check: {
          prompt: "Why is not being able to rule out de-identified training data a design problem?",
          options: [
            "A pipeline that anonymises inputs cannot later trace one to an output",
            "De-identification is reversible, so the data was never really anonymous",
            "Training on product data is prohibited unless users have opted in first",
            "The model weights would have to be published for anyone to check it",
          ],
          correctIndex: 0,
          explain:
            "It is a statement about the architecture rather than about an incident. Once inputs have been de-identified and mixed, whether a particular person's work influenced a particular output is not answerable, and no amount of good faith afterwards makes it answerable.",
        },
        checks: [
          {
            prompt: "What does the cached corpus demonstrate that the training data does not?",
            options: [
              "That what the system could read is knowable when it is designed to be",
              "That a frozen snapshot contains no unpublished work by anyone",
              "That reproducibility and provenance are the same requirement",
              "That live access would have made the provenance question moot",
            ],
            correctIndex: 0,
            explain:
              "The same system contains both answers. A frozen, enumerable snapshot makes the question of access a lookup, and the training pipeline was not built to answer questions of that shape, so it cannot answer them now.",
          },
          {
            prompt: "Why does existing academic priority machinery not settle this dispute?",
            options: [
              "It assumes reading someone's drafts requires them to hand them over",
              "It requires both parties to have submitted to the same journal",
              "It cannot establish dates for work that was never made public",
              "It applies to published results rather than to formal proofs",
            ],
            correctIndex: 0,
            explain:
              "Preprints, submission records and seminar talks establish who had what and when among people who publish. None of it addresses the possibility that one party's tooling saw the other's unpublished drafts, because that was not previously possible.",
          },
          {
            prompt: "What is the practical test for whether input provenance exists?",
            options: [
              "Whether you could state in writing which data shaped an artefact",
              "Whether the training data was collected with explicit consent",
              "Whether the model can be retrained from scratch on demand",
              "Whether outputs are checked against the corpus for similarity",
            ],
            correctIndex: 0,
            explain:
              "If answering requires an investigation, the property does not exist. A lineage trail is either built in, so the answer is a query, or absent, in which case all that remains is a claim nobody can verify.",
          },
        ],
        sources: [
          {
            label: "VentureBeat, OpenAI solves longstanding math problem with a 10,000-agent swarm",
            url: "https://venturebeat.com/technology/openai-solves-longstanding-math-problem-with-10-000-agent-swarm-but-cant-rule-out-benefitting-from-a-researchers-private-codex-data",
            supports: "That OpenAI denies direct access to the researchers' work while acknowledging it cannot rule out the use of de-identified data, and that Buckmaster and Alpöge had been working on a related line of research on forced Euler equations.",
          },
          {
            label: "OpenAI, On the Navier-Stokes Millennium Prize Problem (2026)",
            url: "https://openai.com/index/navier-stokes-solution/",
            supports: "OpenAI's own account of the run, against which the provenance question is being asked.",
          },
        ],
      },
    ],
  },
];
