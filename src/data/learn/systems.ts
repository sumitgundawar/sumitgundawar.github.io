import type { Card } from "./types";

export const systems: Card[] = [
  {
    id: "consensus",
    title: "Consensus and the replicated log",
    summary:
      "How a group of machines agrees on one order of events, what the algorithm actually forbids, and why a correct implementation is still slow in the places that matter.",
    track: "design",
    topics: [
      {
        id: "raft-terms",
        title: "Terms, elections and the vote that gets refused",
        level: "advanced",
        body: [
          "Consensus begins with agreeing who decides. Raft splits time into terms, each a numbered period that opens with an election and, if the election succeeds, continues with exactly one leader. Terms are a logical clock rather than a wall clock: every message carries a term, and any server that sees a term higher than its own steps down and adopts it. That single rule is what retires stale leaders without anybody having to detect that they are stale.",
          "A follower that hears nothing from a leader for its election timeout becomes a candidate, increments its term, votes for itself and asks the others for their votes. A candidate that collects a majority becomes leader. The majority requirement is the whole safety argument in one line: any two majorities of the same group share at least one member, so two leaders in the same term would need one server to have voted twice, which it will not do.",
          "Split votes are the obvious failure of that scheme. If several followers time out together they all become candidates, all vote for themselves, and nobody reaches a majority, so the term ends with no leader and the process repeats. Raft's answer is not cleverness but randomisation: each server picks its election timeout from a range, so the ties break themselves within a round or two. This is a case where a probabilistic fix is genuinely the right engineering, because the deterministic alternatives cost a round trip that the common case does not need.",
          "The restriction that makes elections safe is easy to miss and is the part interviews probe. A server refuses its vote to any candidate whose log is less up to date than its own, judged by the term of the last entry first and the length of the log only as a tiebreak. Without that rule a server missing committed entries could win an election and then overwrite them, and the log would lose data that had already been acknowledged to a client.",
          "The practical consequence is that a leader is never required to fetch missing entries from followers. Because it could only have been elected with a log at least as complete as a majority's, it already holds every committed entry, and replication is always a one-way flow from leader to follower. That asymmetry is why the implementation is tractable at all.",
          "The failure mode worth carrying away is the partitioned leader that does not yet know it has been replaced. It continues to accept writes locally and will happily answer reads from its own state. It cannot commit anything, because commitment needs a majority it can no longer reach, but nothing stops it serving stale data unless reads are handled separately, which is the subject of the next topic.",
        ],
        why: "The election restriction is the difference between an algorithm that agrees and one that agrees on the right thing. A system that elects a leader with an incomplete log has not lost availability, it has lost acknowledged writes, which is the failure customers notice months later.",
        inPractice:
          "etcd and Consul both run Raft, and both expose the term number in their status output. A term that climbs steadily with no corresponding leadership need is the clearest signal of an unhealthy cluster: it usually means election timeouts are shorter than real network latency, so the group spends its time holding elections rather than replicating.",
        check: {
          prompt:
            "Why does a Raft server refuse to vote for a candidate whose log is behind its own?",
          options: [
            "Because a leader with an incomplete log could overwrite committed entries",
            "Because the candidate would otherwise need to copy entries from followers",
            "Because a shorter log implies the candidate has been partitioned recently",
            "Because vote counting requires every log in the group to be identical",
          ],
          correctIndex: 0,
          explain:
            "The restriction guarantees any winner already holds every committed entry, so replication only ever flows from leader to follower and acknowledged writes cannot be lost.",
        },
        sources: [
          {
            label: "Ongaro and Ousterhout, In Search of an Understandable Consensus Algorithm",
            url: "https://raft.github.io/raft.pdf",
            supports:
              "Terms as a logical clock, randomised election timeouts, and the up-to-date restriction on granting votes.",
          },
        ],
      },
      {
        id: "commit-rules",
        title: "Why a leader will not commit your entry yet",
        level: "advanced",
        body: [
          "An entry is committed when it is stored on a majority, and once committed it will survive every future leader. The subtlety is that a new leader may not treat an entry from an earlier term as committed merely because it sits on a majority right now. Raft forbids it, and the reason is a specific sequence that would otherwise lose data.",
          "The sequence runs like this. A leader in term two replicates an entry to a minority and crashes. A leader in term three is elected without that entry, writes its own, and crashes. A leader in term four happens to hold the term two entry, replicates it to a majority, and if it were allowed to count that as committed the entry would be declared safe. But a later leader elected on the term three history can still overwrite it, because the election restriction compares terms first and the term three log looks more recent.",
          "The fix is that a leader only commits entries from its own term directly, and earlier entries become committed implicitly once an entry from the current term is committed above them. Real implementations make this cheap by having every new leader append a no-op entry the moment it takes office, which both advances the commit point and proves the leader can still reach a majority.",
          "For anyone operating one of these systems the visible consequence is a pause after every leadership change. Writes issued just before the change may sit uncommitted until the new leader's no-op lands, and clients that treated the original acknowledgement as final will disagree with the cluster about what happened. The honest client contract is that an unacknowledged write has an unknown outcome and must be retried idempotently rather than assumed lost.",
        ],
        why: "This is the clearest example in distributed systems of a rule that exists purely to close a window nobody would find by testing. The sequence needs three leadership changes and a specific partition, so it appears in production long after it would appear in a proof.",
        check: {
          prompt: "Why does a new Raft leader append a no-op entry as soon as it is elected?",
          options: [
            "To commit an entry in its own term and so settle earlier ones",
            "To force every follower to truncate its log back to the commit point",
            "To announce the new term to clients that are holding stale connections",
            "To reserve an index so concurrent writers cannot collide on the first slot",
          ],
          correctIndex: 0,
          explain:
            "Entries from earlier terms cannot be committed by counting replicas. Committing anything from the current term settles everything below it, and a no-op is the cheapest way to do that.",
        },
        sources: [
          {
            label: "Ongaro and Ousterhout, In Search of an Understandable Consensus Algorithm",
            url: "https://raft.github.io/raft.pdf",
            supports:
              "The figure 8 sequence and the rule that a leader commits entries from previous terms only indirectly.",
          },
        ],
      },
      {
        id: "linearizable-reads",
        title: "Reads that are actually linearizable",
        level: "advanced",
        body: [
          "Linearizability says every operation appears to take effect at one instant between its call and its return, and that the order those instants form is consistent with real time. Writes through a consensus group get this almost for free, because the log already defines a single order. Reads do not, and the mistake of serving them from the leader's memory without further checks is close to universal.",
          "The problem is that leadership is not self-evident. A leader that has been partitioned away still holds the most recent state it knew about and has no local way to discover that a new term has begun without it. Answering a read from that state returns data that the rest of the cluster has already moved past, which is a stale read, and no amount of care on the write path prevents it.",
          "The correct and slow answer is to put reads through the log as entries, so they are ordered against writes by the same mechanism. That costs a full round of replication per read and is almost never acceptable for read-heavy workloads. The usual answer is ReadIndex: the leader records the current commit index, confirms with a majority that it is still leader, and once its state machine has applied up to that index it answers from local state. One round trip of heartbeats, no disk writes, correct.",
          "Leases make even that cheaper by allowing the leader to skip the confirmation while a time-bounded lease holds, on the assumption that no other server can be elected before the lease expires. This trades a safety property for latency, and the trade is only sound if clock drift between servers stays inside the margin the lease was chosen with. A leader whose clock runs fast relative to the group can serve stale reads while believing itself safe.",
          "Follower reads are the third option and the one worth knowing for scale. A follower asks the leader for the current commit index, waits until it has applied that far, then answers locally. Reads spread across the group, the leader does much less work, and the cost is one round trip of latency added to the first read rather than to all of them.",
          "The honest framing for a design discussion is that there is no free linearizable read. You pay in round trips, in clock assumptions, or in staleness, and the only wrong answer is to pay in none of them and claim the property anyway.",
        ],
        why: "Most systems that describe themselves as strongly consistent are strongly consistent for writes and quietly eventually consistent for reads. Knowing which of the three mechanisms a system uses tells you what it will do during a partition better than any marketing page.",
        inPractice:
          "etcd serves linearizable reads through ReadIndex by default and offers a serializable flag that skips it, which is faster and can return stale data. The flag exists because the cost is real, and choosing it deliberately for a use that tolerates staleness is good engineering rather than a shortcut.",
        check: {
          prompt: "What does the ReadIndex mechanism actually buy over reading leader memory?",
          options: [
            "Confirmation from a majority that the reader is still the current leader",
            "A guarantee that the read reflects every write issued anywhere in the group",
            "Replication of the read itself so followers record that it took place",
            "Protection against clock drift between the leader and its followers",
          ],
          correctIndex: 0,
          explain:
            "ReadIndex costs one round of heartbeats to prove the leader has not been replaced, then answers locally once the state machine has caught up to the recorded index.",
        },
        sources: [
          {
            label: "Herlihy and Wing, Linearizability: A Correctness Condition",
            url: "https://cs.brown.edu/~mph/HerlihyW90/p463-herlihy.pdf",
            supports:
              "The definition of linearizability as operations appearing to take effect at an instant consistent with real time.",
          },
        ],
      },
      {
        id: "membership-change",
        title: "Changing the membership without losing the group",
        level: "advanced",
        body: [
          "Adding and removing servers looks administrative and is the part most likely to lose data. The danger is that membership is itself replicated state, so during a change different servers hold different ideas of who counts, and two disjoint majorities can exist at the same moment. Each elects a leader, each believes it has consensus, and the logs diverge.",
          "A concrete case: a three server group growing to five. If two servers adopt the new configuration while three keep the old one, the new configuration has a majority of three from five available among the adopters, and the old configuration has a majority of two from three among the others. Both sets can make progress independently, which is precisely what consensus is supposed to make impossible.",
          "Raft's original answer is joint consensus, a transitional configuration in which a decision needs a majority of the old set and a majority of the new set at the same time. Because every decision must satisfy both, no two disjoint majorities can form, and the group moves through the transition without ever having a moment of ambiguity. It is correct and it is fiddly to implement.",
          "The simpler approach that most implementations use is to change one server at a time. Any single-server change leaves the old and new majorities overlapping by at least one member, which is enough to prevent divergence without a transitional state at all. Growing from three to five becomes two separate changes through four, and the constraint is only that they do not overlap.",
          "The operational detail that bites is the newly added server with an empty log. It counts towards the majority immediately while being unable to help commit anything for as long as it takes to catch up, which shrinks the group's real fault tolerance exactly when an operator is touching it. Mature implementations add the server as a non-voting learner first and promote it once it has caught up.",
          "The other detail is removing the current leader. It must continue to lead until the configuration excluding it is committed, then step down, which means for a short period the cluster is being led by a server that is no longer a member. Implementations that handle this badly either stall or elect a second leader.",
          "None of this is exotic. Every one of these cases is reachable by an operator doing an ordinary resize during an ordinary network hiccup, which is why the safe pattern is one change at a time, learners first, and never during an incident.",
        ],
        why: "Membership change is where a consensus implementation stops being an algorithm and becomes an operational tool. The algorithm is proven; the tooling around it is where clusters are actually lost.",
        check: {
          prompt: "Why is changing Raft membership one server at a time safe without a transition?",
          options: [
            "The old and new majorities always share at least one common member",
            "A single change cannot alter which server currently holds leadership",
            "The configuration entry commits before any other entry can be appended",
            "One server joining cannot affect the number needed to reach a majority",
          ],
          correctIndex: 0,
          explain:
            "With a single-server difference the two majorities necessarily overlap, so two disjoint majorities cannot form and no transitional joint configuration is needed.",
        },
      },
      {
        id: "consensus-cost",
        title: "What consensus costs, and when not to pay it",
        level: "advanced",
        body: [
          "Every committed entry costs at least one round trip to a majority and a durable write on each of those servers before the acknowledgement returns. Within one data centre that is a millisecond or two. Across regions it is tens of milliseconds, set by the speed of light and not by anything you can optimise, and it applies to every write rather than to some of them.",
          "The throughput ceiling is less obvious. All writes funnel through one leader, so the group scales reads by adding servers and does not scale writes at all. Adding members makes the system more fault tolerant and slightly slower, because the majority the leader waits for grows. A five server group survives two failures and commits no faster than a three server group; a seven server group is slower still.",
          "This is why consensus belongs around metadata rather than around data. Who holds which shard, which node is primary, what the current configuration is, whether this job has been claimed: these are small, infrequently written, and catastrophic to get wrong. Bulk data replication uses cheaper mechanisms and accepts weaker guarantees because the volume makes anything else unaffordable.",
          "The most common design error is reaching for a consensus system as a general database because it offers strong consistency. It will work in testing and fall over at a few thousand writes per second, not because the implementation is poor but because the guarantee costs a round trip that cannot be amortised away. The correct reading is that strong consistency is a property you buy for the specific state that needs it.",
        ],
        why: "Knowing the cost converts consensus from a magic word into an engineering choice. The question in a design discussion is never whether consensus is good but which small piece of state genuinely needs it, and the answer is usually much less state than people reach for.",
        inPractice:
          "Kubernetes keeps its entire cluster state in etcd and has needed a long series of mitigations because of it: watch caches in the API server, resource versions to avoid re-reading, and hard limits on object size. The pattern is a system that used consensus for more state than the guarantee was worth, then spent years building layers to avoid touching it.",
        check: {
          prompt: "Why does adding servers to a consensus group not increase write throughput?",
          options: [
            "Every write goes through one leader and waits on a larger majority",
            "Followers must apply entries in order and cannot batch them together",
            "The leader replicates to each follower in sequence rather than in parallel",
            "Each additional server adds another durable write to the critical path",
          ],
          correctIndex: 0,
          explain:
            "Writes are serialised through the leader, so capacity does not grow with the group, and the majority it must wait for gets larger as members are added.",
        },
      },
    ],
  },
  {
    id: "query-planning",
    title: "Query planning and execution",
    summary:
      "What the optimiser is actually deciding, why its estimates are wrong in a specific and predictable direction, and what separates an engine that reads a plan from one that compiles it.",
    track: "design",
    topics: [
      {
        id: "cardinality-estimation",
        title: "Cardinality estimation, and the direction it fails in",
        level: "advanced",
        body: [
          "Before an optimiser can compare two plans it has to guess how many rows each step will produce. Everything downstream depends on that guess: whether a hash table fits in memory, whether an index lookup beats a scan, which side of a join should build and which should probe. The guess comes from statistics gathered by sampling, and it is wrong more often than the confidence of the resulting plan suggests.",
          "Single column estimates are usually decent, because a histogram of one column is cheap to keep and reasonably accurate. The trouble starts with conjunctions. Faced with two predicates, the classical optimiser multiplies their selectivities, which is correct only if the columns are independent. Real columns are not independent; city and postcode are close to the same column, and model and manufacturer nearly determine each other. Multiplying produces an estimate far below the truth.",
          "The error compounds. An underestimate at the bottom of a join tree propagates upward and gets multiplied again at each level, so by the fourth join the estimate can be out by orders of magnitude. The direction is consistent and worth memorising: estimates trend low, not high, because the independence assumption always removes correlation that exists rather than inventing correlation that does not.",
          "The consequences follow from the direction. An engine that expects a thousand rows and meets a million picks a nested loop that becomes quadratic, sizes a hash table that then spills to disk, and chooses an index lookup repeated a million times where one sequential scan would have been faster. The plan is not slightly worse, it is the wrong shape, and it degrades far more sharply than the size of the estimation error alone would suggest.",
          "The research finding that reframes this is that cardinality estimation dominates. Leis and colleagues swapped cost models, search strategies and estimators across the same queries and found that improving the cost model bought little while fixing the estimates bought a great deal. The optimiser is not primarily a search problem, it is a statistics problem wearing a search problem's clothes.",
          "What you do about it is unglamorous. Keep statistics fresh, because a table that has doubled since the last analyse is being planned from fiction. Create multi-column statistics where you know columns are correlated, which most engines support and few teams use. And when a plan is catastrophically wrong, look at estimated against actual rows per node before looking at anything else, because that single comparison localises the fault immediately.",
        ],
        why: "Reading a plan without comparing estimated to actual rows is reading the optimiser's intentions rather than its results. Almost every plan that is wrong is wrong because of one bad estimate near the leaves that everything above inherited.",
        inPractice:
          "In PostgreSQL, EXPLAIN ANALYZE prints estimated and actual rows side by side for every node. Scanning down for the first node where they diverge by more than an order of magnitude finds the cause of most slow queries faster than any amount of index guesswork.",
        check: {
          prompt:
            "Why do cardinality estimates for multiple predicates usually come out too low?",
          options: [
            "Selectivities are multiplied as if the columns were independent",
            "Sampling misses the rare values that make up most of the result",
            "Histograms record distinct values but not how often each occurs",
            "The optimiser deliberately biases low to favour index access paths",
          ],
          correctIndex: 0,
          explain:
            "Correlated columns carry less independent information than the product implies, so multiplying selectivities strips out correlation that genuinely exists and the estimate falls below the truth.",
        },
        sources: [
          {
            label: "Leis et al., How Good Are Query Optimizers, Really?",
            url: "https://www.vldb.org/pvldb/vol9/p204-leis.pdf",
            supports:
              "That cardinality estimation errors dominate plan quality, that they compound through join trees, and that they trend towards underestimation.",
          },
        ],
      },
      {
        id: "join-ordering",
        title: "Join ordering and the size of the search space",
        level: "advanced",
        body: [
          "Joins are associative and commutative, so a query joining several tables has many equivalent orders that return identical results at wildly different costs. The number of possible orders grows factorially, and even restricting the shape to left-deep trees leaves too many to enumerate beyond a handful of tables. The optimiser's job is to search that space without spending longer planning than executing.",
          "The classical answer, from the System R work in 1979, is dynamic programming over subsets. Compute the best plan for every single table, then for every pair using those results, then every triple, and so on, keeping only the cheapest plan for each subset. It is exponential in the number of tables but vastly better than enumerating orders, and it is still the backbone of most optimisers today.",
          "The refinement that makes it usable is interesting orders. A plan that is more expensive but leaves its output sorted on a column a later join needs may beat a cheaper plan that does not, because it avoids a sort upstream. So the optimiser keeps the best plan per subset per useful sort order rather than one per subset, which multiplies the table but prunes far more than it costs.",
          "Past roughly a dozen tables, dynamic programming stops being affordable and engines switch to heuristics: greedy ordering by selectivity, or randomised search like the genetic approach PostgreSQL uses beyond its collapse limit. The important operational consequence is a discontinuity. A query with eleven tables may plan well and the same query with thirteen may plan badly, not because it is harder but because it crossed a threshold into a different algorithm.",
        ],
        why: "Join order is the single largest lever the optimiser has, because the difference between a good and bad order is often orders of magnitude rather than percentages. Understanding that the search is bounded explains why very large queries plan unpredictably.",
        check: {
          prompt:
            "Why does an optimiser keep several plans per table subset rather than only the cheapest?",
          options: [
            "A costlier plan may produce a sort order that saves work later",
            "Cheaper plans are discarded when their cardinality estimates are stale",
            "Each plan must be retained in case the chosen one fails at runtime",
            "Parallel execution needs one plan variant per worker that will run it",
          ],
          correctIndex: 0,
          explain:
            "Interesting orders mean a plan whose output arrives already sorted on a needed column can avoid a sort or enable a merge join upstream, beating a locally cheaper alternative.",
        },
        sources: [
          {
            label: "Selinger et al., Access Path Selection in a Relational Database System",
            url: "https://people.eecs.berkeley.edu/~brewer/cs262/3-selinger79.pdf",
            supports:
              "Dynamic programming over table subsets and the concept of interesting orders in join enumeration.",
          },
        ],
      },
      {
        id: "access-paths",
        title: "Access paths, and why the index was not used",
        level: "advanced",
        body: [
          "Given a table and a predicate the engine chooses among a sequential scan, an index scan followed by row fetches, an index-only scan, or a bitmap combination of several indexes. The choice is a cost comparison, and the reason an index sometimes loses is that an index scan is random access while a sequential scan is not. Past some fraction of the table, reading everything in physical order is genuinely faster than jumping around to read less.",
          "That crossover is lower than intuition suggests, often in the region of a few per cent of rows on rotating storage and higher but still modest on flash. So an index on a column where the predicate matches a fifth of the table will be correctly ignored. The index is not wasted, it is simply not the cheaper path for that particular selectivity, and the same index will be chosen for a more selective value of the same query.",
          "Physical ordering changes the arithmetic considerably. If rows are stored roughly in index order then an index scan's fetches are nearly sequential and the crossover moves far up. Engines track this: PostgreSQL calls it correlation, Oracle calls it the clustering factor, and it is the reason the same query with the same index performs differently on two tables holding the same data in different physical orders.",
          "An index-only scan escapes the problem entirely by answering from the index without touching the table, which is why adding a column to an index purely so it can be covered is often a larger win than adding another index. The cost is a wider index, slower writes, and in PostgreSQL a dependence on the visibility map being current, which means a table that has not been vacuumed recently will silently fall back to fetching rows anyway.",
          "The diagnostic habit worth forming is to stop asking why the index was not used and start asking what the engine estimated. An unused index is nearly always a correct decision made from an incorrect row estimate, so the fault is upstream in the statistics rather than in the access path choice.",
        ],
        why: "Index tuning done by adding indexes until something improves produces tables carrying a dozen indexes that slow every write and change few plans. Understanding the crossover explains which indexes can possibly help before any of them are created.",
        inPractice:
          "A common false alarm: a query is slow, the plan shows a sequential scan, an index exists, and the conclusion is that the planner is broken. Forcing the index with a session setting usually makes it slower, which is the planner being right. The real fault is almost always a stale estimate feeding the comparison.",
        check: {
          prompt:
            "Why can a sequential scan beat an index scan that reads fewer rows?",
          options: [
            "Index access is random while a scan reads in physical order",
            "The index must be fully traversed before any row can be returned",
            "Scans can be parallelised across workers where index reads cannot",
            "Index entries are stored uncompressed and so occupy more pages",
          ],
          correctIndex: 0,
          explain:
            "Sequential reads are far cheaper per page than random ones, so past a modest fraction of the table reading everything in order costs less than jumping around to read a subset.",
        },
      },
      {
        id: "plan-stability",
        title: "Plan stability and parameter sniffing",
        level: "advanced",
        body: [
          "Planning costs real time, so engines cache plans and reuse them for the same query shape with different parameter values. That is sound whenever the best plan does not depend on the values, and it is actively harmful whenever it does. A predicate on a skewed column is exactly the case where it does.",
          "The classic incident: a query filtering by customer is first executed for a customer with three orders, the optimiser picks an index lookup, and the plan is cached. The same query then runs for a customer with two million orders and reuses the index lookup, repeating a random fetch two million times where a scan would have finished quickly. Nothing has changed except the parameter, and the system has become slow in a way that no code change explains.",
          "The pathology is worse than a plain slow query because it is bimodal and order dependent. Which plan you get depends on which parameter happened to compile it, so the same deployment is fast or slow depending on traffic in the first seconds after a restart or a cache flush. That is a genuinely difficult failure to reproduce, and it is why it survives so long in production.",
          "The mitigations differ by engine but are the same shape. Recompile the statement each execution, paying planning cost to get a correct plan. Optimise for a representative value rather than the first one seen. Keep several plans keyed by parameter range, which newer engines do adaptively. Or split the query into two statements with different shapes so each gets its own plan and neither is a compromise.",
          "The judgement is about variance rather than average. A cached plan gives a better average and a much worse tail, and for a user-facing path the tail is what people experience. Paying a millisecond of planning on every execution to remove a ten second outlier is usually the right trade, and it is the opposite of what the default behaviour assumes.",
          "The general lesson applies well beyond databases. Any cache keyed on a shape rather than on the values that determine the answer will eventually serve a decision made for one input to a very different input, and the failure will look like a mystery rather than a cache problem.",
        ],
        why: "Parameter sniffing is the clearest database example of a performance failure with no corresponding change in the code, the data or the configuration. Recognising the bimodal signature saves days of looking in the wrong place.",
        check: {
          prompt: "What makes parameter sniffing problems so hard to reproduce?",
          options: [
            "Which plan is cached depends on which parameter compiled it first",
            "The optimiser discards plans that exceed a fixed memory allowance",
            "Statistics are resampled between executions of the same statement",
            "Plans are invalidated whenever any row in the table is modified",
          ],
          correctIndex: 0,
          explain:
            "The plan is decided by whichever value happened to trigger compilation, so identical deployments behave differently depending on traffic order after a restart or cache flush.",
        },
      },
      {
        id: "execution-engines",
        title: "Volcano, vectorised and compiled execution",
        level: "advanced",
        body: [
          "A plan is a tree of operators, and how those operators pass rows to each other decides a large part of the engine's speed. The traditional design is the Volcano iterator model: every operator exposes a next method, and pulling one row from the root pulls one row through the whole tree. It composes beautifully and it is slow for scans, because each row crosses several virtual calls and the branch predictor learns nothing useful.",
          "The overhead is per row and independent of the work being done, so it dominates exactly when rows are many and per-row work is small, which describes analytical queries. For a transactional query touching ten rows it is irrelevant. This is why the same execution model can be entirely appropriate in one engine and a bottleneck in another, and why arguments about it without naming the workload go nowhere.",
          "Vectorised execution keeps the iterator shape but passes a batch of a thousand or so values instead of one row. The interpretation cost is amortised across the batch, the inner loop works on a contiguous array that the CPU can prefetch and often vectorise, and cache behaviour improves because a column of values is dense where a row is scattered. The idea came out of MonetDB and is now the standard design for analytical engines.",
          "Compiled execution goes further and generates machine code for the specific query, fusing operators into tight loops so a row moves through several stages while staying in registers. The overhead disappears rather than being amortised, and the cost moves to compilation time, which has to be paid before any result appears. Engines handle that by interpreting first and compiling in the background, switching over once the code is ready.",
          "Choosing between them is a question about where the time goes. If the workload is dominated by waiting on storage or the network, execution model changes nothing and the effort belongs elsewhere. If the profile shows the engine itself burning CPU on large row counts, the model is the constraint, and this is one of the few areas where the theoretical improvement shows up fully in practice.",
        ],
        why: "This is the layer where database performance stops being about indexes and starts being about hardware. It explains why a columnar analytical engine can be an order of magnitude faster on the same query and the same data without any better plan.",
        inPractice:
          "The pattern generalises past databases. Any interpreter with a per-item dispatch cost has the same three options: keep interpreting, batch the work so dispatch amortises, or compile. Batching is almost always the best ratio of gain to effort, which is why it turns up in graphics pipelines, network stacks and inference servers alike.",
        check: {
          prompt: "Why does vectorised execution help analytical queries far more than transactional ones?",
          options: [
            "Per-row interpretation cost only dominates when rows are many",
            "Batches cannot be assembled for queries that modify rows in place",
            "Analytical engines store data in columns and transactional ones do not",
            "Transactional queries hold locks that prevent operators from batching",
          ],
          correctIndex: 0,
          explain:
            "The overhead is a fixed cost per row, so amortising it across a batch matters when a query touches millions of rows and is irrelevant when it touches ten.",
        },
        sources: [
          {
            label: "Boncz, Zukowski and Nes, MonetDB/X100: Hyper-Pipelining Query Execution",
            url: "https://www.cidrdb.org/cidr2005/papers/P19.pdf",
            supports:
              "Vectorised execution passing batches rather than single rows, and the resulting cache and pipelining gains.",
          },
          {
            label: "Neumann, Efficiently Compiling Efficient Query Plans for Modern Hardware",
            url: "https://www.vldb.org/pvldb/vol4/p539-neumann.pdf",
            supports:
              "Compiling query plans to machine code and fusing operators so tuples stay in registers across stages.",
          },
        ],
      },
    ],
  },
  {
    id: "memory-model",
    title: "Memory models, atomics and lock-free code",
    summary:
      "What the compiler and the processor are permitted to reorder, what an atomic actually guarantees, and why most lock-free data structures are slower than the lock they replaced.",
    track: "foundations",
    topics: [
      {
        id: "memory-ordering",
        title: "What the hardware is allowed to reorder",
        level: "advanced",
        body: [
          "Single threaded code behaves as if statements run in order, and that guarantee is all a language promises. Both the compiler and the processor may reorder anything they can prove does not change the result for one thread, and both do so aggressively: the compiler to keep values in registers and hide latency, the processor to keep its pipelines fed. Another thread watching the same memory sees the real order, not the written one.",
          "The concrete mechanism on x86 is the store buffer. A write goes into a per-core buffer and drains to cache later, while reads may be satisfied from cache without waiting for that drain. The observable effect is that a store followed by a load of a different location can appear to happen in the opposite order. That single reordering is enough to break the textbook mutual exclusion algorithms, which is why Dekker's algorithm does not work on real hardware without a fence.",
          "x86 is one of the stronger models, permitting only that one reordering. ARM and POWER are weaker and may reorder loads with loads and stores with stores, which means concurrent code that has worked for years on server processors can fail the week it is deployed to ARM machines. The bug was always there; the stronger model was hiding it.",
          "Languages paper over this with a memory model of their own, and since C++11 the vocabulary has been shared. Relaxed ordering gives atomicity alone, with no constraint on surrounding operations. Acquire on a load and release on a store give the pairing that makes publication safe: everything written before the release is visible to anything that reads the value with acquire. Sequential consistency gives a single global order across all such operations and costs the most.",
          "Acquire and release is the pattern almost all correct code wants, because it expresses the actual intent: build a thing, then publish a pointer to it, and have readers that see the pointer also see the thing. Relaxed is for counters whose ordering genuinely does not matter, and sequential consistency is the default worth keeping until profiling says otherwise.",
          "The practical rule is that reasoning about this informally does not work. The reorderings are not intuitive, the failures are rare and machine dependent, and testing on one architecture proves nothing about another. Use the established patterns, keep the shared state small, and treat any argument that begins with the observation that a race is unlikely as a bug report rather than a defence.",
        ],
        why: "Memory ordering is where correct-looking concurrent code fails for reasons invisible in the source. Knowing that the compiler and the processor both reorder, and that the architecture decides how much, is what turns an unreproducible bug into a searchable one.",
        inPractice:
          "Teams moving server workloads from x86 to ARM have repeatedly found latent concurrency bugs that the stronger x86 model had masked for years. Nothing in the code changed and nothing in it was ever correct; the hardware simply stopped covering for it.",
        check: {
          prompt: "Why can concurrent code correct on x86 fail on ARM without any code change?",
          options: [
            "ARM permits reorderings that the x86 model forbids",
            "ARM caches are not coherent between cores in the way x86 caches are",
            "Atomic instructions on ARM operate on narrower words than on x86",
            "ARM compilers apply optimisations that x86 compilers leave disabled",
          ],
          correctIndex: 0,
          explain:
            "x86 allows only store-load reordering, while ARM may also reorder loads with loads and stores with stores, exposing missing fences that the stronger model had hidden.",
        },
        sources: [
          {
            label: "Sewell et al., x86-TSO: A Rigorous and Usable Programmer's Model",
            url: "https://www.cl.cam.ac.uk/~pes20/weakmemory/cacm.pdf",
            supports:
              "That x86 permits store-load reordering through the store buffer and that this breaks classical mutual exclusion algorithms without fences.",
          },
        ],
      },
      {
        id: "atomics-and-aba",
        title: "Compare-and-swap, and the ABA problem",
        level: "advanced",
        body: [
          "Compare-and-swap is the primitive nearly all lock-free code is built from. It takes a location, an expected value and a new value, and writes the new value only if the current one still matches, reporting whether it did. Because the comparison and the write happen as one indivisible step, a thread can detect that somebody else changed the location underneath it and retry.",
          "The standard shape is a retry loop: read the current value, compute the new one from it, attempt the swap, and go round again if it failed. This is lock-free rather than wait-free. The system as a whole always progresses because a failed attempt means somebody else succeeded, but any individual thread can in principle be starved indefinitely, which matters for latency guarantees rather than for throughput.",
          "The trap is that compare-and-swap compares values, not histories. If a location holds A, another thread changes it to B and then back to A, a waiting thread's comparison succeeds and it concludes nothing happened. That is the ABA problem, and it is not theoretical: in a lock-free stack the popped node can be freed, reallocated for a new node, and land at the same address, so the comparison passes against a node that is no longer the one that was read.",
          "The usual fix is to compare more than the pointer. A version counter packed alongside it, incremented on every change, means the value differs even when the pointer repeats, and a double-width compare-and-swap swaps both together. Where the hardware offers load-linked and store-conditional instead, the problem does not arise, because the store fails if the location was written at all regardless of what it was written with.",
          "The lesson generalises past atomics. Any optimistic scheme that detects conflict by comparing a value rather than a version has an ABA problem waiting in it, including the optimistic locking pattern where a row is re-read and compared before an update. Comparing a version column is correct; comparing the data is not, for exactly the same reason.",
        ],
        why: "ABA is the concurrency bug that survives review because the code looks obviously correct. The comparison genuinely does succeed, and the reasoning only fails because identity was confused with equality.",
        check: {
          prompt: "Why does a version counter alongside the pointer solve the ABA problem?",
          options: [
            "The compared value differs even when the pointer returns to its original",
            "It prevents the memory from being reused while a reader still holds it",
            "It makes the compare-and-swap operation itself atomic across both words",
            "It causes the retry loop to terminate after a bounded number of attempts",
          ],
          correctIndex: 0,
          explain:
            "The counter increments on every change, so a pointer that goes A to B to A carries a different version and the comparison correctly fails.",
        },
      },
      {
        id: "false-sharing",
        title: "Cache lines, false sharing and contention",
        level: "advanced",
        body: [
          "Coherence works on cache lines, typically sixty-four bytes, not on individual variables. Two variables that happen to sit in the same line are, as far as the hardware is concerned, one unit. When a core writes to one it must take exclusive ownership of the whole line, invalidating every other core's copy, including cores that only ever touch the neighbouring variable.",
          "That is false sharing: two threads with no logical relationship contending for a line because of where the allocator happened to put their data. The symptom is distinctive and easily misread. Throughput falls as cores are added rather than rising, the profiler shows time in ordinary memory access rather than in any lock, and the code contains no shared state that inspection would find.",
          "It appears most often in arrays indexed by thread or core, which is precisely the pattern written to avoid sharing. An array of per-thread counters puts eight counters in one line on a typical machine, so eight threads incrementing their own counter contend on every increment. The fix is padding each entry out to a full line, which wastes memory deliberately and can multiply throughput.",
          "The same arithmetic explains why a single hot atomic counter does not scale no matter how it is implemented. Every increment needs exclusive ownership of that line, so the line migrates between cores continuously and each migration costs far more than the increment. Sharding the counter across lines and summing on read is the standard answer, and it works because it converts one contended line into many uncontended ones.",
        ],
        why: "False sharing is the clearest case of hardware behaviour breaking through an abstraction the language claims to provide. The source says these are separate variables and the machine disagrees, and no amount of reading the code reveals it.",
        inPractice:
          "Java's LongAdder exists for this reason: it keeps a padded cell per contending thread and sums them only when the value is read, trading exact-at-every-instant for scalability. Reaching for it instead of AtomicLong on a hot counter is usually a one-line change with a large effect.",
        check: {
          prompt: "What makes an array of per-thread counters a false sharing hazard?",
          options: [
            "Several entries share one cache line, so writes invalidate neighbours",
            "Array bounds checks introduce a memory barrier on every access",
            "The allocator places arrays in memory shared between all cores",
            "Counters must be read atomically, which serialises the whole array",
          ],
          correctIndex: 0,
          explain:
            "Coherence is per line rather than per variable, so eight counters in one sixty-four byte line contend on every increment despite being logically independent.",
        },
      },
      {
        id: "lock-free-cost",
        title: "What lock-free actually costs",
        level: "advanced",
        body: [
          "Lock-free is a progress guarantee, not a speed claim. It says some thread always makes progress, so the structure cannot deadlock and cannot be stalled by a thread descheduled at the wrong moment. Those are real properties with real value in a signal handler, a kernel path or a hard latency budget. None of them is a promise of throughput, and the usual assumption that removing the lock removes the cost is wrong.",
          "The costs are concrete. Contended compare-and-swap loops burn work on failed attempts, and the failure rate climbs with the number of threads, so a structure can go slower as cores are added. The atomic operations carry ordering constraints that limit the reordering the processor relies on for speed. And the hot pointers in the structure are contended cache lines by construction, so the false sharing arithmetic applies to the structure itself.",
          "Meanwhile an uncontended mutex is very cheap, typically a single atomic operation with no system call at all, and modern implementations spin briefly before sleeping so short critical sections never reach the kernel. The comparison that matters is not lock-free against a contended lock, it is lock-free against a lock used well, and against that baseline the lock frequently wins on throughput while losing on tail latency.",
          "There is also a large difference in cost of ownership that rarely appears in benchmarks. Lock-free structures are difficult to write correctly, difficult to review, difficult to test because the failures are timing dependent, and difficult to modify later without reintroducing a race. A mutex protecting a plain structure is obvious to everyone who reads it afterwards.",
          "The defensible reasons to go lock-free are specific: a context where blocking is forbidden, a latency tail that a lock's worst case cannot meet, or a measured profile showing real contention that sharding or shortening the critical section cannot fix. Reaching for it because locks feel slow is the common case and is usually a net loss.",
          "Where lock-free does win decisively is single producer single consumer queues, where the constrained access pattern removes most of the contention and the implementation is small enough to verify. That narrow case is worth knowing precisely because it is the exception that the general argument against does not cover.",
          "The honest summary is that lock-free trades throughput and maintainability for a progress guarantee. If you do not need the guarantee you are paying for something you will not use, which is the definition of over-engineering regardless of how sophisticated it looks.",
        ],
        why: "Lock-free carries enormous prestige relative to how often it is the right answer. Being able to say what it guarantees, and that the guarantee is about progress rather than speed, is a strong seniority signal.",
        check: {
          prompt: "What does lock-free actually guarantee?",
          options: [
            "Some thread always progresses, so no thread can stall the structure",
            "Every thread completes its operation within a bounded number of steps",
            "Operations never need to be retried once they have begun executing",
            "Throughput scales with the number of cores working on the structure",
          ],
          correctIndex: 0,
          explain:
            "It is a system-wide progress property. Individual threads can still be starved indefinitely, which is wait-freedom, and nothing about throughput follows from it.",
        },
      },
      {
        id: "reclamation",
        title: "Safe memory reclamation",
        level: "advanced",
        body: [
          "The hard part of a lock-free structure is usually not the algorithm but deciding when it is safe to free memory. A thread can remove a node from the structure while another thread still holds a pointer it read a moment earlier. Freeing immediately risks a use-after-free; never freeing leaks. In a garbage collected language the runtime solves this, which is why lock-free structures are so much easier to write there.",
          "Hazard pointers solve it by having each thread publish the pointers it is currently using in a slot other threads can read. A thread that wants to free a node scans those published slots, and frees only if no other thread has announced it, deferring otherwise. The cost is a store and a fence on every read of a shared pointer, which makes reads more expensive than they look.",
          "Epoch-based reclamation inverts the trade. A global epoch advances periodically, threads announce which epoch they are operating in, and memory retired during an epoch is freed once every thread has moved past it. Reads become very cheap because there is nothing to publish per pointer, and the cost is that a single thread stalled inside a critical section holds the epoch back and memory accumulates behind it without bound.",
          "Read-copy-update, used heavily in the Linux kernel, is the same idea specialised: readers pay essentially nothing, writers make a copy and swap a pointer, and reclamation waits for a grace period in which every reader has passed a quiescent point. It is exceptionally good for read-mostly data and depends on the kernel's ability to define those quiescent points, which user space cannot do as cheaply.",
          "The pattern across all three is the same trade appearing in different clothes: make readers pay a little every time, or make them pay nothing and accept that reclamation is delayed by the slowest reader. Recognising that shape is more useful than memorising any one scheme, because it turns up wherever concurrent readers and deletion coexist, including in database MVCC and in the way long transactions block vacuum.",
        ],
        why: "Reclamation is the part of lock-free programming that separates a working demonstration from something shippable. A structure that is algorithmically correct and leaks under load has not solved the problem.",
        inPractice:
          "The same shape explains a common PostgreSQL incident. An idle transaction holds a snapshot, vacuum cannot reclaim rows any snapshot might still need, and dead rows accumulate until the table bloats. It is epoch-based reclamation stalled by one slow reader, with the same cause and the same cure.",
        check: {
          prompt: "What is the cost of epoch-based reclamation compared with hazard pointers?",
          options: [
            "One stalled thread delays reclamation for everything retired since",
            "Each pointer read must publish and fence before it can be used",
            "Freed memory cannot be returned to the allocator, only to a free list",
            "Writers must copy the whole structure rather than a single node",
          ],
          correctIndex: 0,
          explain:
            "Epochs make reads cheap by removing per-pointer bookkeeping, and the price is that memory retired during an epoch waits for the slowest participant to move past it.",
        },
        sources: [
          {
            label: "Michael, Hazard Pointers: Safe Memory Reclamation for Lock-Free Objects",
            url: "https://erdani.org/publications/cuj-2004-12.pdf",
            supports:
              "Threads publishing in-use pointers so a reclaiming thread can defer freeing any node another thread has announced.",
          },
        ],
      },
    ],
  },
  {
    id: "distributed-time",
    title: "Time, causality and conflict",
    summary:
      "What a timestamp is worth across machines, how to track what happened before what, and what to do when two replicas both think they are right.",
    track: "design",
    topics: [
      {
        id: "clock-skew",
        sources: [
          {
            label: "Corbett and others, Spanner: Google's globally distributed database, OSDI 2012",
            url: "https://research.google/pubs/spanner-googles-globally-distributed-database-2/",
            supports:
              "That Spanner exposes clock uncertainty as an interval rather than a point, and deliberately waits out that uncertainty before committing so that timestamp order matches real order.",
          },
        ],
        title: "What a wall clock is worth",
        level: "advanced",
        body: [
          "Two servers, two timestamps, and no safe way to say which event happened first. Clocks drift, they are corrected by a daemon that can step them backwards, and virtualisation makes it worse. A system that compares timestamps from different machines to order writes is making a guess and presenting it as a fact.",
          "The usual damage is last write wins. Two clients update the same key, the one whose machine is running a few hundred milliseconds fast is declared the winner, and the other write is discarded without anyone being told. The data is not corrupted in a way any check will catch. It is simply wrong, quietly, and only in the cases where it mattered.",
          "Spanner's answer is unusual and worth understanding even where you cannot copy it. Instead of reporting a time, its clock reports an interval, earliest and latest, with the uncertainty made explicit. A transaction that wants a timestamp takes one and then deliberately waits until that interval has certainly passed before committing. The system buys ordering with latency, and it can only afford that because time masters sit in every data centre, most carrying satellite receivers and a minority atomic clocks, chosen so their failure modes are uncorrelated.",
          "Without that hardware the pragmatic middle is a hybrid logical clock: a counter that mostly tracks physical time, so timestamps stay human readable and roughly correct, but which is also advanced on message receipt so that it can never go backwards relative to causally earlier events. You lose the guarantee that timestamp order is real order for unrelated events. You keep it for related ones, which is usually what the application actually needed.",
        ],
        why: "Ordering is the thing distributed systems are short of. Every scheme here is buying some amount of it, and paying in either hardware, latency or weaker guarantees.",
        check: {
          prompt: "Why is comparing timestamps across machines unsafe?",
          options: [
            "Clocks drift, so one machine's timestamp can precede another's",
            "Timestamps are stored at a resolution too coarse to compare",
            "Network delay makes every timestamp arrive out of order",
            "Machines in a cluster rarely run the same operating system",
          ],
          correctIndex: 0,
          explain:
            "Independent clocks disagree and can be stepped backwards by correction. An event that genuinely happened later can carry an earlier timestamp, so last write wins silently discards the write that should have survived.",
        },
      },
      {
        id: "causality",
        sources: [
          {
            label: "Lamport, Time, clocks, and the ordering of events in a distributed system",
            url: "https://lamport.azurewebsites.net/pubs/time-clocks.pdf",
            supports:
              "The happens-before relation and the result that it is a partial order, so concurrent events are genuinely unordered rather than merely unknown.",
          },
          {
            label: "Mattern, Virtual time and global states of distributed systems",
            url: "https://courses.csail.mit.edu/6.852/01/papers/VirtTime_GlobState.pdf",
            supports:
              "The vector clock construction, which Lamport's paper does not contain: one counter per replica, so two stamps can be compared to tell causal order from genuine concurrency.",
          },
        ],
        title: "Happens-before, and what it costs to track",
        level: "advanced",
        body: [
          "Lamport's move was to stop asking when something happened and ask what it could have known. An event happens before another if it is earlier on the same machine, or if it sent a message the other received, or by following that relation through. Everything else is concurrent.",
          "The important word is partial. Two concurrent events are not unordered because we failed to measure carefully enough, they are unordered because nothing connects them. No amount of better clocks fixes it, and a system that insists on a total order has to invent one, which is what a consensus protocol is for and what it charges for.",
          "A Lamport clock, one counter per machine advanced on every send and receive, is enough to respect causality: if A happens before B then A's counter is lower. It is not enough to detect concurrency, because a lower counter does not prove a relationship exists.",
          "A vector clock fixes that by keeping one counter per replica, so the stamp records what that replica had seen from every other at that moment. Compare two stamps and the answer is one of three: this one is newer, that one is newer, or neither, which means a genuine conflict that something above has to resolve. The cost is a stamp that grows with the number of replicas, which is why systems that use them work hard to keep that number small or prune old entries.",
        ],
        check: {
          prompt: "What does a vector clock give you that a single counter does not?",
          options: [
            "A vector clock records what each replica had seen at that point",
            "A vector clock stores one counter and is cheap to compare",
            "A vector clock guarantees two events can always be ordered",
            "A vector clock replaces the need to detect conflicts at all",
          ],
          correctIndex: 0,
          explain:
            "Per-replica counters let a comparison return concurrent, not just earlier or later. That is what turns a silent overwrite into a detected conflict the application can resolve. The cost is a stamp that grows with the replica count.",
        },
      },
      {
        id: "crdt",
        sources: [
          {
            label: "Shapiro, Preguica, Baquero and Zawirski, Conflict-free replicated data types",
            url: "https://inria.hal.science/inria-00609399/document",
            supports:
              "That replicas converge without coordination when the merge operation is commutative, associative and idempotent, and the distinction between operation based and state based types.",
          },
        ],
        title: "Data that merges without asking",
        level: "advanced",
        body: [
          "Detecting a conflict is progress; it still leaves someone to resolve it. A conflict-free replicated data type removes the question by choosing structures where concurrent updates have exactly one sensible merge, defined in advance.",
          "The requirement is algebraic and strict. Merge must be commutative, so order does not matter; associative, so grouping does not matter; and idempotent, so a message delivered twice changes nothing. Satisfy those and a state-based replica set converges whatever the order and however many duplicates arrive. The operation-based variant asks less of the algebra, needing only that concurrent operations commute, and pays for it with a delivery guarantee instead: each update exactly once, in causal order. No coordination, no leader, no round trip.",
          "A grow-only counter is the easy case: keep a per-replica count and merge by taking the maximum of each entry. Sets are harder, and not because removal repeats badly, since removing twice leaves the same state. The problem is that a concurrent add and remove of the same element do not commute, and a removal that simply deletes state would break the requirement that state only grows. So a removal is recorded as an addition to a second, tombstone set, or each add is tagged uniquely so a delete can be matched to the add it cancels. That is where the storage cost shows up, and why garbage collecting a CRDT is its own topic.",
          "What they cannot do is enforce an invariant that spans replicas. A set that must never exceed a hundred members is not expressible, because two replicas can each admit a member while both believe they are under the limit. The moment you need that, you are back to coordination, and the cost you avoided arrives anyway.",
        ],
        inPractice:
          "The honest framing is that CRDTs move the decision from runtime to design time. You are not avoiding conflict resolution, you are committing to one rule for it before anything happens.",
        check: {
          prompt: "What must a CRDT's merge operation satisfy?",
          options: [
            "Merge must be commutative, associative and idempotent",
            "Merge must be executed on a single designated replica",
            "Merge must run inside a transaction holding every key",
            "Merge must be rejected whenever two writes conflict",
          ],
          correctIndex: 0,
          explain:
            "Those three properties are what let replicas apply updates in any order, grouped any way, with duplicates, and still converge. They are the reason no coordination is required, and the reason cross-replica invariants remain impossible.",
        },
      },
      {
        id: "fencing",
        sources: [
          {
            label: "Kleppmann, How to do distributed locking",
            url: "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html",
            supports:
              "The argument that a lock alone cannot protect a resource when a holder pauses, and that a monotonically increasing fencing token checked by the resource is what makes the stale writer harmless.",
          },
        ],
        title: "Why a lock is not enough",
        level: "advanced",
        body: [
          "A process takes a lock, pauses for a long garbage collection, and wakes up. Meanwhile its lease expired, another process took the lock and did the work. The first process now continues, still believing it holds the lock, and writes. Nothing here is a bug in the lock service; the lock was correctly expired. The problem is that the paused process had no way to find out.",
          "Waiting longer does not fix it, because there is no bound on the pause. A stop-the-world collection, a hypervisor migration or a saturated network can all suspend a process past any timeout you picked, and the process cannot distinguish being paused from running normally.",
          "The fix moves the check to the thing being protected. Every lock grant carries a token, a number that only ever increases. The client presents the token with its write, and the storage refuses any token lower than the highest it has already accepted. The woken process arrives with a stale number and is rejected, without the storage needing to understand locking at all.",
          "This is the general shape: a distributed lock is advisory unless the resource itself enforces it. The same reasoning is why optimistic concurrency uses a version column, and why an idempotency key has to be checked at the point of effect rather than at the edge.",
        ],
        check: {
          prompt: "Why does a lease alone fail to protect a resource?",
          options: [
            "A paused holder can wake and act after its lease expired",
            "Locks cannot be stored in a system with more than one node",
            "A lease cannot be renewed once it has been granted once",
            "Two clients can never be granted the same lock together",
          ],
          correctIndex: 0,
          explain:
            "A process cannot tell it was paused. It wakes believing it still holds the lock and writes. Only the resource can stop that, by rejecting any fencing token lower than the highest it has seen.",
        },
      },
      {
        id: "anti-entropy",
        sources: [
          {
            label: "DeCandia and others, Dynamo: Amazon's highly available key-value store, SOSP 2007",
            url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
            supports:
              "Hinted handoff for writes during a node outage, read repair on divergence detected at read time, and Merkle trees to compare replicas without transferring their full contents.",
          },
        ],
        title: "Catching up what replication dropped",
        level: "advanced",
        body: [
          "Replicas diverge. A node is down for a deploy, a network partition drops writes for one of three copies, a disk fills. Quorums let the system keep serving through that, which means by definition some replica has missed something, and nothing has yet told it.",
          "Three mechanisms repair it, and they trade urgency against cost. Hinted handoff is the cheapest: when the intended replica is unreachable, another node accepts the write with a note saying who it was for, and delivers it when that node returns. Read repair is opportunistic: when a read already contacted several replicas and they disagree, the stale ones are corrected on the spot, so data people actually look at stays fresh for free.",
          "Neither covers data nobody reads, which is where anti-entropy comes in: a background comparison of two replicas. Doing that naively means shipping everything, so Dynamo used Merkle trees, a hash tree over the key range. Two replicas compare root hashes; if they match, they are identical and nothing moves. If not, they descend only into the subtrees that differ, so the traffic is proportional to the divergence rather than to the dataset.",
        ],
        check: {
          prompt: "Why compare replicas with a Merkle tree?",
          options: [
            "A Merkle tree finds differing ranges without full comparison",
            "A Merkle tree stores every version a replica has ever held",
            "A Merkle tree orders writes so replicas apply them alike",
            "A Merkle tree removes the need to repair replicas at all",
          ],
          correctIndex: 0,
          explain:
            "Matching root hashes prove two replicas are identical with one comparison. When they differ, the tree is descended only where the hashes disagree, so the cost tracks the amount of divergence rather than the size of the data.",
        },
      },
      {
        id: "two-phase-commit",
        sources: [
          {
            label: "Bernstein, Hadzilacos and Goodman, Concurrency control and recovery in database systems",
            url: "https://www.microsoft.com/en-us/research/people/philbe/book/",
            supports:
              "The two phase commit protocol and its blocking property: a participant that has voted to commit cannot unilaterally decide, so a coordinator failure can leave it holding locks indefinitely.",
          },
        ],
        title: "Two-phase commit, and why it blocks",
        level: "advanced",
        body: [
          "Two phase commit is the textbook way to make several systems agree on one outcome. The coordinator asks everyone to prepare; each participant does the work, makes it durable and replies yes or no, promising it can still go either way. If every answer is yes the coordinator records commit and tells everyone to apply it.",
          "The promise is the trap. A participant that has voted yes has given up the right to decide. It must hold its locks and wait, because it cannot know whether the others voted yes, and committing or aborting unilaterally risks disagreeing with them. If the coordinator dies between the vote and the decision, that participant waits with the rows locked until a human or a recovery process resolves it.",
          "So the protocol is correct and it is not available. Under partition it chooses consistency and stops, which is the right reading of the CAP result rather than a flaw in the implementation. That is tolerable inside one data centre between two databases under one operator, and it is why 2PC survives in exactly that setting.",
          "Across services the usual answer is to stop requiring atomicity and model the business process instead. A saga performs each step as its own committed transaction and defines a compensating action for each, so failure walks the sequence backwards rather than rolling anything back. You trade an invariant that was always visible for a window where the system is observably mid-flight, and you accept that compensation is not an undo.",
        ],
        check: {
          prompt: "What makes two-phase commit a blocking protocol?",
          options: [
            "Participants that voted yes must wait for the coordinator",
            "Participants may abort freely once they have voted to commit",
            "The coordinator decides before any participant has voted",
            "A participant can replace a coordinator that has crashed",
          ],
          correctIndex: 0,
          explain:
            "Voting yes surrenders the right to decide. Without the coordinator's verdict the participant cannot safely commit or abort, so it holds its locks and waits, which is where the availability goes.",
        },
      },
    ],
  },
];
