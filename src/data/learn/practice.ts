import type { Card } from "./types";

export const practice: Card[] = [
  {
    id: "testing",
    title: "Testing",
    summary: "What to test, at which level, and why coverage is a poor target.",
    track: "practice",
    topics: [
      {
        id: "test-pyramid",
        title: "The testing pyramid",
        level: "beginner",
        body: [
          "Unit tests are fast and numerous and isolate one piece of logic. Integration tests check that components work together, usually with a real database and a real HTTP layer. End-to-end tests drive the whole system through its interface, the way a user would. The pyramid says have many of the first and few of the last, because cost, runtime and flakiness all rise with scope. The reason is feedback rather than purity. A failing unit test names the broken function; a failing end-to-end test tells you something in the system is wrong and leaves you to find it. Inverted, mostly end-to-end, produces a suite that takes twenty minutes, fails for unrelated reasons twice a week, and is eventually ignored by everybody including the person who wrote it.",
          "The layer that pays best in practice is the middle one, and it is the one most often skipped. A test that runs the real handler against a real database in a container catches the things unit tests cannot, wrong SQL, a missing migration, a serialisation mismatch, without the fragility of a browser. Containers made that layer cheap enough that the old argument for mocking the database has largely expired.",
          "Mocking deserves a rule: mock what you do not own, and be sparing even then. Mocks encode your belief about how a dependency behaves, so a test suite built on them passes whenever your beliefs are self-consistent, which is not the same as being right. The classic outcome is a fully green suite against an API that changed its response shape last month.",
          "What to test is a better question than how much. The logic with branches, the boundaries where data enters or leaves, the failure paths that only run during an incident, and every bug you have already had, which is the highest-value test anyone writes. Trivial getters and framework behaviour are not tests, they are ceremony with a runtime cost.",
          "One test type deserves a mention because it finds what examples cannot: property-based testing, where the framework generates inputs and checks an invariant. It is unreasonably effective on parsers, serialisers, date handling and anything with a round trip, because it explores the space you did not think of, which is precisely where the bugs are.",
        ],
        why: "The shape follows from feedback speed. A failing unit test names the broken function; a failing end-to-end test tells you something in the system is wrong, and you still have to find it.",
        inPractice:
          "Testcontainers made the integration layer cheap by starting a real database per test run in a container, which removed most of the historical argument for mocking the database in the first place.",
        diagram: {
          caption: "Cost and diagnostic precision move in opposite directions",
          columns: [
            [{ id: "unit", label: "Unit", sub: "many, milliseconds", kind: "data" }],
            [{ id: "int", label: "Integration", sub: "some, real database", kind: "service" }],
            [{ id: "e2e", label: "End to end", sub: "few, whole system", kind: "external" }],
            [{ id: "diag", label: "What a failure tells you", sub: "which function, or just something", kind: "edge" }],
          ],
          edges: [
            { from: "unit", to: "int", label: "slower, broader" },
            { from: "int", to: "e2e", label: "slower, broader" },
            { from: "unit", to: "diag", label: "names the function" },
            { from: "e2e", to: "diag", label: "names the system", async: true },
          ],
        },
        check: {
          prompt: "Why prefer many unit tests over many end-to-end tests?",
          options: [
            "They run without a database or network, so they are far less flaky",
            "They are fast, and they point at the failure rather than just reporting one",
            "They are cheaper to write, so coverage rises faster per hour spent",
            "They catch the failures users actually hit, which integration tests miss",
          ],
          correctIndex: 1,
          explain: "Both find bugs. The difference is feedback: speed and precision of diagnosis, which is what determines whether a suite gets used.",
        },
        checks: [
          {
            prompt: "Which layer of the pyramid is most often skipped and pays best?",
            options: [
              "Integration: the real handler against a real database in a container",
              "Unit: small tests of pure functions with no external dependencies",
              "End-to-end: the full system driven through a browser as a user",
              "Contract: schema checks between a producer and its consumers",
            ],
            correctIndex: 0,
            explain:
              "It catches wrong SQL, missing migrations and serialisation mismatches, which unit tests cannot see and browsers find slowly. Containers made this layer cheap enough that the argument for mocking the database has largely expired.",
          },
          {
            prompt: "What is the risk of a test suite built mostly on mocks?",
            options: [
              "It passes whenever your beliefs are self-consistent, not when they are right",
              "It runs slowly, because each mock must be constructed before every test",
              "It cannot measure coverage, since mocked modules are excluded from reports",
              "It fails whenever a dependency releases a new version of its library",
            ],
            correctIndex: 0,
            explain:
              "A mock encodes an assumption about a dependency. When that assumption goes stale, the suite stays green while the integration is broken, which is the specific failure mocks are prone to.",
          },
          {
            prompt: "Where is property-based testing unreasonably effective?",
            options: [
              "Parsers, serialisers and anything with a round trip to verify",
              "User interface flows, where the space of interactions is large",
              "Performance tests, where inputs must vary to find the worst case",
              "Integration points, where the dependency's behaviour is unknown",
            ],
            correctIndex: 0,
            explain:
              "An invariant such as parse of print equals the original explores inputs nobody would think to write down, which is where the bugs in that kind of code actually live.",
          },
        ],
      },
      {
        id: "coverage",
        title: "Coverage and what it does not tell you",
        level: "intermediate",
        body: [
          "Coverage measures which lines executed while the tests ran. It says nothing about whether anything was asserted, or whether the assertions mean anything. A test that calls a function and checks nothing gives that function full coverage and catches no regression whatever, which is the whole problem in one sentence.",
          "That makes a coverage target a textbook case of a measure becoming a goal. Mandate eighty per cent and you will get eighty per cent, assembled from tests written to touch lines rather than to verify behaviour, and the number will be defended in review by people who know it means nothing. The metric was fine until it was made a target.",
          "It is genuinely useful in the other direction, as a discovery tool. Sorted by least covered, it shows which modules nobody has tested, and diff coverage on a pull request answers a narrower and more sensible question: is the code being added tested at all. That is a prompt for a conversation rather than a gate.",
          "The variants are worth knowing because they differ in strength. Line coverage is the weakest. Branch coverage checks that both sides of a condition ran, which catches a class of gap line coverage reports as complete. Mutation testing is the strongest by a distance: it changes the code deliberately and checks that a test fails, which measures assertions rather than execution and is the only common technique that can tell you a test suite is decorative.",
          "The honest measures of a suite are elsewhere. Does it catch the regressions you actually have, does it fail for one reason rather than five, does it run fast enough that people wait for it, and does a failure name the problem. None of those has a percentage, which is exactly why coverage gets used instead.",
        ],
        why: "Coverage is useful as a discovery tool, finding untested areas, and harmful as a target, because it is trivially gameable and becomes the goal instead of correctness.",
        inPractice:
          "Mutation testing tools such as Stryker and PIT are the practical way to check whether a suite asserts anything, and teams that run one usually find that a comfortable coverage number was hiding tests that could not fail.",
        check: {
          prompt: "A module has 100% coverage and a regression ships. How?",
          options: [
            "The regression is in a dependency, which your coverage never measured",
            "Coverage counts lines, not branches, so one side of a condition never ran",
            "Lines ran but assertions were weak or missing, so wrong behaviour went unchecked",
            "Coverage was measured on the test suite rather than on the module itself",
          ],
          correctIndex: 2,
          explain: "Execution is not verification. Coverage counts lines run, not properties checked.",
        },
        checks: [
          {
            prompt: "What does mutation testing measure that coverage cannot?",
            options: [
              "Whether tests actually fail when the behaviour changes",
              "Which lines are executed by more than one test case",
              "How long each test takes relative to the code it exercises",
              "Whether the tests are independent of their execution order",
            ],
            correctIndex: 0,
            explain:
              "It changes the code and checks the suite notices. That measures assertions rather than execution, and it is the only common technique that can tell you a suite is decorative.",
          },
          {
            prompt: "How is coverage best used?",
            options: [
              "As discovery: which modules are untested, and is new code tested",
              "As a gate, set slightly above the current number to prevent regressions",
              "As a release criterion, since untested code should not reach production",
              "As a team metric, tracked over time to show testing discipline improving",
            ],
            correctIndex: 0,
            explain:
              "Sorted by least covered it finds real gaps, and diff coverage asks a narrow sensible question about a change. Turned into a target it produces tests that touch lines and assert nothing.",
          },
          {
            prompt: "Which is a genuine measure of a test suite's quality?",
            options: [
              "It fails for one reason and names the problem when it does",
              "It covers every branch of every conditional in the codebase",
              "It runs every test on every commit rather than a subset",
              "It contains more unit tests than integration tests by a wide margin",
            ],
            correctIndex: 0,
            explain:
              "Diagnostic precision is what makes a suite used rather than tolerated. None of the honest measures reduce to a percentage, which is precisely why a percentage gets used instead.",
          },
        ],
      },
      {
        id: "flaky-tests",
        title: "Flaky tests",
        level: "advanced",
        body: [
          "A flaky test passes and fails without the code changing. The causes are a short list and worth knowing by name: timing, where a fixed sleep stands in for waiting on a condition; shared state, where tests leak into each other through a database or a global; order dependence, where the suite passes in one sequence and not another; real network calls; and time itself, which is why tests written on a Tuesday afternoon fail at midnight or during a leap day.",
          "The damage is cultural rather than technical. Once a suite is known to fail randomly, the correct response to any red build becomes pressing retry, and that response is applied to real failures too. Trust does not degrade gracefully: a suite that is ninety per cent reliable is treated exactly like one that is unreliable, because a human cannot tell which failure they are looking at.",
          "So the response has to be immediate and structural. Quarantine the test out of the blocking suite the moment it flakes, so the signal for everyone else stays trustworthy, then fix it or delete it with an owner and a deadline. A quarantine with no expiry is just a slower way of deleting it, and being honest about that is better than pretending otherwise.",
          "Most fixes come from removing the source of nondeterminism rather than from making the test more patient. Wait for a condition instead of sleeping. Inject the clock so time is a value rather than an ambient fact. Give every test its own data, ideally its own schema or transaction, so nothing leaks. Run the suite in a random order deliberately, so order dependence is found by you rather than by a scheduler change six months from now.",
          "Measure it. Flake rate per test and per suite, tracked over time, turns a vague sense that CI is annoying into a number with a trend, and it identifies the small number of tests responsible for most of the noise. In most suites, a handful of tests cause the overwhelming majority of the retries.",
          "The uncomfortable case is a test that is flaky because the system is. A race condition in the code will present as an intermittent test, and quarantining it hides a real defect. The distinction is worth making before reaching for the quarantine label: is the test unreliable, or is it reporting accurately on something that is.",
        ],
        why: "Tolerating flakiness destroys the value of the entire suite, not just the flaky test. The correct response is urgent, because trust does not degrade gracefully.",
        inPractice:
          "Google published its work on flaky tests after finding that a significant share of its own failures were flakes, and the response was infrastructural: detect them automatically, quarantine them, and track the rate rather than relying on anyone's discipline.",
        check: {
          prompt: "Why is a flaky test worse than a missing one?",
          options: [
            "It burns CI minutes on reruns, which slows everyone else's pipeline",
            "It hides a real race condition that will eventually surface in production",
            "It cannot be reproduced locally, so nobody can be assigned to fix it",
            "It teaches the team to ignore failures, undermining every other test you have",
          ],
          correctIndex: 3,
          explain: "A missing test is a known gap. A flaky one poisons the signal, so genuine failures get dismissed as noise.",
        },
        checks: [
          {
            prompt: "Which fix addresses the cause of flakiness rather than the symptom?",
            options: [
              "Waiting for a condition instead of sleeping for a fixed duration",
              "Increasing the sleep until the test stops failing in CI",
              "Retrying the test automatically up to three times before failing",
              "Running the flaky test on a larger runner with more CPU available",
            ],
            correctIndex: 0,
            explain:
              "A sleep encodes a guess about timing that a slower machine invalidates. Waiting on the condition the test actually depends on removes the nondeterminism rather than making it less frequent.",
          },
          {
            prompt: "Why deliberately randomise test execution order?",
            options: [
              "So order dependence is found by you rather than by a future change",
              "So the slowest tests are distributed evenly across parallel runners",
              "So a failing test cannot be attributed to the one that ran before it",
              "So caching cannot make a test pass on stale results from an earlier run",
            ],
            correctIndex: 0,
            explain:
              "Hidden coupling through shared state stays invisible while the order is fixed, then surfaces when someone adds a test or the runner shards differently. Randomising makes it your problem at a convenient moment.",
          },
          {
            prompt: "When is quarantining a flaky test the wrong response?",
            options: [
              "When the flakiness is reporting a genuine race condition in the code",
              "When the test covers a critical path that has no other coverage",
              "When the test has failed only once and may not recur at all",
              "When the suite already contains several quarantined tests",
            ],
            correctIndex: 0,
            explain:
              "An intermittent test can be an accurate report of an intermittent system. Deciding which it is comes before reaching for the label, or a real defect gets hidden behind a process for unreliable tests.",
          },
        ],
      },
    ],
  },

  {
    id: "engineering-models",
    title: "How teams work",
    summary: "Waterfall, agile, scrum, kanban, what each assumes and when it breaks.",
    track: "practice",
    topics: [
      {
        id: "waterfall",
        title: "Waterfall",
        level: "beginner",
        body: [
          "Waterfall runs in sequence: gather requirements, design, build, test, release. Each stage completes before the next begins, sign-off moves the work along, and the customer sees the result at the end. Described that way it sounds naive, and it is worth knowing that the paper usually blamed for it, Royce in 1970, presented the pure sequence as the thing that does not work and recommended iterating.",
          "It works where the cost of change late is genuinely enormous and the requirements genuinely cannot move: regulated work with a certification step, anything with manufacturing behind it, fixed-scope contracts where the scope is the contract. In those settings front-loading the decisions is not caution, it is the correct response to the shape of the cost curve.",
          "It fails for software because requirements are discovered by using the thing. People cannot specify what they want from a product that does not exist yet, so the specification is a hypothesis, and waterfall defers testing that hypothesis until the moment change is most expensive. The defects found in the final phase are the ones introduced in the first.",
          "The other failure is the handover. Each phase produces a document for the next, so context is repeatedly compressed and reconstructed by people who were not in the room. Most of what an implementer needs is the reasoning behind a requirement, and reasoning is exactly what survives a specification document least well.",
          "The reason to know it properly is that the argument is about the cost-of-change curve rather than about culture. Where change is cheap and information arrives during construction, iterate. Where change is expensive and information arrives before construction, plan. Most software is the first and some genuinely is the second, and knowing which you are in is more useful than a preference.",
        ],
        why: "The cost-of-change curve is the whole argument. If change is cheap and information arrives during building, front-loading every decision is the wrong bet.",
        inPractice:
          "Royce's 1970 paper, routinely cited as the origin of waterfall, presents the pure sequence as the version that fails and recommends building it twice. The model spread anyway, which is a useful lesson about how ideas travel.",
        check: {
          prompt: "What is waterfall's core assumption?",
          options: [
            "Each phase can be verified before the next begins, so defects never travel",
            "The team is large enough that phases can be handed between specialists",
            "The cost of change is constant, so a late change costs what an early one did",
            "Requirements can be known fully up front and will not materially change",
          ],
          correctIndex: 3,
          explain: "Everything downstream depends on the requirements being right at the start. Where that holds it is efficient; in software it usually does not.",
        },
        checks: [
          {
            prompt: "Where is a waterfall sequence genuinely the right choice?",
            options: [
              "Where change is expensive late and the requirements truly cannot move",
              "Where the team is distributed across several time zones",
              "Where the codebase is large enough that changes are inherently risky",
              "Where the customer prefers a single delivery to incremental releases",
            ],
            correctIndex: 0,
            explain:
              "Certification, manufacturing and fixed-scope contracts all have that shape. The argument is about the cost-of-change curve, not about team preference or codebase size.",
          },
          {
            prompt: "What is lost in the handover between phases?",
            options: [
              "The reasoning behind each requirement, which documents carry worst",
              "The estimates, which are recalculated by each successive phase",
              "The test cases, which are written before the design is complete",
              "The schedule, which each phase adjusts to its own capacity",
            ],
            correctIndex: 0,
            explain:
              "An implementer needs to know why a requirement exists in order to make the hundred small decisions the specification does not cover. That reasoning is the first thing a document loses.",
          },
          {
            prompt: "Why are defects found in the final phase usually the most expensive?",
            options: [
              "They were introduced in the first phase and everything was built on them",
              "The test environment differs most from production at that point",
              "The team responsible has usually moved to the next project by then",
              "Release pressure means less time is available to fix them properly",
            ],
            correctIndex: 0,
            explain:
              "A wrong requirement is built upon by the design, the implementation and the tests. Discovering it last means unwinding all of that, which is the cost curve the whole argument is about.",
          },
        ],
      },
      {
        id: "agile",
        title: "Agile, scrum and kanban",
        level: "beginner",
        body: [
          "Agile is a set of preferences rather than a process: working software over comprehensive documentation, responding to change over following a plan, collaboration over contract negotiation, individuals and interactions over tools. Each is a preference between two goods, which is the part most often dropped when it is quoted.",
          "Scrum implements those preferences with structure: fixed sprints, a product owner, a scrum master, a backlog, and ceremonies for planning, review and retrospective. Kanban drops the sprint entirely and limits work in progress instead, pulling the next item when capacity frees. Kanban suits interrupt-driven work such as support or platform; scrum suits planned feature work with a stable team and a plannable period.",
          "Work in progress limits are the most underrated idea in either. Starting five things at once does not make them arrive sooner; it makes all five arrive later and increases the chance that some are abandoned half-finished. Limiting concurrent work reduces cycle time for the same throughput, which is Little's Law applied to a team rather than to a service.",
          "The common failure is adopting the ceremonies without the feedback. Standups with no working software to demonstrate, sprints whose plan cannot change, retrospectives with no action taken: that is waterfall with more meetings, and everyone in the room knows it, which is where the reputational damage to the word comes from.",
          "The retrospective is the meeting that determines whether any of it works, because it is the only one whose output is a change to how the team operates. A retrospective that produces observations and no owned action is a therapy session; one that changes something small every fortnight compounds. Estimation deserves less energy than it gets. Story points are a relative measure whose only legitimate use is forecasting from historical throughput, and the moment they become a productivity metric they are inflated and stop forecasting anything. Counting finished items and measuring cycle time is simpler and harder to game.",
        ],
        why: "Both fail the same way: adopting the ceremonies without the feedback. Standups and sprints with no working software to show and no willingness to change the plan is waterfall with extra meetings.",
        inPractice:
          "The DORA research programme measures four outcomes, deployment frequency, lead time, change failure rate and time to restore, and finds they correlate with performance far better than any process choice does. It is the closest thing to evidence in this area.",
        check: {
          prompt: "Which fits a support team with unpredictable incoming work?",
          options: ["Scrum with two-week sprints", "Kanban with WIP limits", "Waterfall", "Scrum with one-week sprints"],
          correctIndex: 1,
          explain: "Sprint commitments assume a plannable period. Interrupt-driven work breaks that assumption; kanban pulls work as capacity appears.",
        },
        checks: [
          {
            prompt: "Why does limiting work in progress shorten delivery time?",
            options: [
              "Fewer concurrent items means each finishes sooner at the same throughput",
              "It reduces the number of meetings needed to coordinate the work",
              "It allows the team to estimate more accurately at planning time",
              "It prevents any single person from being assigned too many tasks",
            ],
            correctIndex: 0,
            explain:
              "Starting five things at once makes all five arrive later. It is Little's Law applied to a team: with throughput fixed, cycle time follows the amount of work in flight.",
          },
          {
            prompt: "Which ceremony most determines whether an agile process works?",
            options: [
              "The retrospective, since it is the only one that changes the process",
              "Sprint planning, which sets the commitment for the period",
              "The daily standup, which surfaces blockers while they are small",
              "The sprint review, which puts working software in front of people",
            ],
            correctIndex: 0,
            explain:
              "Everything else executes the process; the retrospective changes it. One owned action a fortnight compounds, and a retrospective with no action is where the whole thing quietly stops being agile.",
          },
          {
            prompt: "What happens when story points become a productivity metric?",
            options: [
              "They inflate, and stop forecasting anything at all",
              "They become more accurate, since estimation gets more attention",
              "They stop correlating with cycle time but still predict capacity",
              "They shift work toward smaller tasks that are easier to estimate",
            ],
            correctIndex: 0,
            explain:
              "A relative measure used as a target is gamed immediately and without malice. Counting finished items and measuring cycle time is simpler and much harder to inflate.",
          },
        ],
      },
      {
        id: "code-review",
        title: "Code review",
        level: "intermediate",
        body: [
          "Review catches defects, but its larger effects are spreading context across the team and keeping the codebase coherent.",
          "Small pull requests get real review. Large ones get approved, because nobody can hold two thousand lines in their head.",
          "Separating blocking concerns from suggestions makes review faster and less adversarial. Say which comments must be addressed and which are taste.",
          "The most useful comment names the case that breaks rather than the preference that was violated. 'This is null when the user has never logged in' can be acted on. 'I would extract this' starts an argument about style with no way to settle it.",
        ],
        why: "PR size is the single biggest lever on review quality. Splitting work into reviewable pieces is a design skill, and the reason large PRs get rubber-stamped is capacity, not laziness.",
        inPractice:
          "Google's readability process and its published research on review both land in the same place: smaller changes get faster and better review, and review latency matters as much as review depth, because a change waiting a day costs the author a context switch to return to it.",
        check: {
          prompt: "Why do large pull requests get weaker review?",
          options: [
            "Past a few hundred lines a reviewer cannot hold it all, so review becomes approval",
            "The author has already moved on, so feedback arrives too late to act on",
            "Large changes mix refactoring with behaviour, hiding the real diff in noise",
            "Reviewers comment on style because substance takes too long to evaluate",
          ],
          correctIndex: 0,
          explain: "Review quality falls off sharply with size. Small, focused changes are the only reliable way to get genuine scrutiny.",
        },
        checks: [
          {
            prompt: "Which review comment is most useful?",
            options: [
              "This is null when the user has never logged in",
              "I would extract this into a separate helper function",
              "Consider whether this follows the existing pattern in the module",
              "This could be simplified, though it works as written",
            ],
            correctIndex: 0,
            explain:
              "It names a case that breaks, which can be verified and acted on. Preferences start an argument about taste with no way to settle it, and they crowd out the comments that matter.",
          },
          {
            prompt: "Why does review latency matter as much as review depth?",
            options: [
              "A change waiting a day costs the author a context switch to return",
              "Stale branches conflict, so the change must be rebased repeatedly",
              "Reviewers forget the context of a change they read the day before",
              "Delayed merges accumulate into a larger release that is riskier",
            ],
            correctIndex: 0,
            explain:
              "The author has moved on, and coming back is expensive. Slow review also pushes people toward larger batches, which makes the next review worse.",
          },
          {
            prompt: "What should a reviewer separate explicitly in their comments?",
            options: [
              "What must be addressed from what is a suggestion or preference",
              "Comments about tests from comments about implementation code",
              "Questions for the author from notes intended for future readers",
              "Issues introduced by this change from ones that already existed",
            ],
            correctIndex: 0,
            explain:
              "Without that split the author has to guess which comments block the merge, and either over-corrects on taste or misses something that mattered. Saying which is which makes review faster and less adversarial.",
          },
        ],
      },
      {
        id: "incidents",
        title: "Incidents and blameless postmortems",
        level: "advanced",
        body: [
          "During an incident, restore service first and investigate afterwards. Mitigation and diagnosis compete for the same people and the same minutes, and users care about the first. Roll back, fail over, disable the feature, and keep the evidence; understanding can wait, and it is easier with a system that is up.",
          "Incidents run better with roles assigned rather than assumed. One incident commander who coordinates and decides, one person communicating outward so the responders are not answering questions, and the rest investigating. The commander does not have to be the most senior engineer, and often should not be, because coordinating and debugging are different jobs competing for the same attention.",
          "A postmortem asks what made the failure possible rather than who typed the command. If one person's mistake could take production down, the finding is the system that allowed it: no confirmation, no staged rollout, no way to reverse. Human error is the beginning of the investigation, not its conclusion.",
          "Blameless does not mean consequence-free. It means the output is a change to the system rather than a name, because the alternative is worse in a specific and measurable way: if reporting a mistake is punished, people stop reporting, near misses go unrecorded, and you lose exactly the information that prevents the next one.",
          "Actions need owners and dates or the document is a diary. A postmortem that produces twelve suggestions and no assignments has changed nothing, and the same incident recurs with a second document beside the first. Two owned actions beat twelve orphaned ones.",
          "Two habits are worth adding once the basics hold. Track how long detection took separately from how long the fix took, because a fast fix after a slow detection is still a long outage and points at monitoring rather than at engineering. And read old postmortems periodically: the recurring theme across a year is a finding that no single incident can reveal.",
        ],
        why: "Blame produces hidden incidents. If reporting a mistake is punished, people stop reporting, and you lose the information that prevents recurrence.",
        inPractice:
          "Google's SRE book made the blameless postmortem standard practice, and the argument it makes is not moral but informational: punishing reports produces fewer reports, and fewer reports means less of the data that prevents the next incident.",
        diagram: {
          caption: "Mitigate first, and split the roles that compete for attention",
          columns: [
            [{ id: "alert", label: "Alert", sub: "symptom, not cause", kind: "edge" }],
            [
              { id: "cmd", label: "Commander", sub: "coordinates, decides", kind: "service" },
              { id: "comms", label: "Communications", sub: "answers outward", kind: "service" },
            ],
            [{ id: "mit", label: "Mitigate", sub: "roll back, fail over, disable", kind: "data" }],
            [{ id: "diag", label: "Diagnose", sub: "afterwards, with evidence kept", kind: "data" }],
            [{ id: "pm", label: "Postmortem", sub: "owners and dates", kind: "queue" }],
          ],
          edges: [
            { from: "alert", to: "cmd", label: "someone is in charge" },
            { from: "cmd", to: "comms", label: "so responders are not answering" },
            { from: "cmd", to: "mit", label: "restore service first" },
            { from: "mit", to: "diag", label: "then understand it" },
            { from: "diag", to: "pm", label: "changes to the system", async: true },
          ],
        },
        check: {
          prompt: "What is the point of a blameless postmortem?",
          options: [
            "To produce a timeline and action items that leadership can be shown",
            "To surface systemic causes honestly, which needs people unafraid to report",
            "To spread knowledge of the failure so other teams avoid the same trap",
            "To separate the human error from the system that allowed it to matter",
          ],
          correctIndex: 1,
          explain: "Honesty is the input to prevention. Blame optimises for hiding incidents, which removes the data you need.",
        },
        checks: [
          {
            prompt: "Why should the incident commander not also be the person debugging?",
            options: [
              "Coordinating and debugging compete for the same attention",
              "The commander needs to be more senior than the responders",
              "Debugging requires access the commander should not hold",
              "The commander must remain available to speak to customers",
            ],
            correctIndex: 0,
            explain:
              "Both jobs are absorbing and neither tolerates interruption. Splitting them is why an incident with roles runs better than one where the best debugger is also answering questions from three directions.",
          },
          {
            prompt: "What makes a postmortem's action items worth writing?",
            options: [
              "An owner and a date, so the document changes something",
              "A complete timeline, so the sequence can be reconstructed later",
              "A root cause statement agreed by everyone who was involved",
              "A severity rating, so incidents can be compared over time",
            ],
            correctIndex: 0,
            explain:
              "Twelve orphaned suggestions change nothing and the incident recurs beside its own document. Two owned actions with dates are worth more than a thorough analysis nobody acts on.",
          },
          {
            prompt: "Why track detection time separately from repair time?",
            options: [
              "A fast fix after slow detection points at monitoring, not engineering",
              "Detection time is easier to measure, so it makes a cleaner metric",
              "Repair time varies too much between incidents to be comparable",
              "Detection time determines whether an incident is externally reportable",
            ],
            correctIndex: 0,
            explain:
              "One long number hides which half is the problem. Splitting it tells you whether to invest in alerting or in the ability to change the system quickly.",
          },
        ],
      },
    ],
  },

  {
    id: "code-quality",
    title: "Design and code quality",
    summary: "Patterns, coupling, and technical debt as a deliberate choice.",
    track: "practice",
    topics: [
      {
        id: "coupling",
        title: "Coupling and cohesion",
        level: "intermediate",
        body: [
          "Coupling is how much modules depend on one another. Cohesion is how related the contents of a single module are. The target is low coupling and high cohesion, and the reason is entirely practical: it decides how far a change spreads, which is the thing that makes a codebase pleasant or exhausting to work in. Tight coupling means a change here forces a change there, and the effect compounds. A module depended on by twenty others cannot be changed without twenty conversations, so it stops being changed, and workarounds accumulate around it instead. Codebases that resist every modification are usually not badly written line by line; they are wired together too tightly.",
          "Cohesion is the same idea from the other side. Organising by technical layer, all controllers here, all models there, all services somewhere else, scatters every feature across the tree, so adding a field means editing six files in six directories. Organising by feature puts what changes together in one place, and the test is simply how many directories a typical change touches.",
          "Coupling comes in degrees worth naming. Depending on a module's published interface is loose and fine. Depending on its internal structure, its database tables, or its file layout is tight and brittle. Two services sharing a database table is the tightest coupling most systems contain, and it is usually invisible on the architecture diagram, which draws them as separate boxes.",
          "The useful heuristic is to ask what would have to change together. Things that change for the same reason belong together; things that change for different reasons belong apart. That is the single responsibility principle stated in the form that is actually actionable, since almost anything can be described as one responsibility if the description is vague enough.",
          "Both are means rather than ends. The goal is that a change is small, local and safe, and if a low-coupling design makes a common change require touching five modules, the design is wrong regardless of how well it scores. Optimise for the changes you actually make, which is a question with an answer in the commit history.",
        ],
        why: "Organising by feature rather than by technical layer usually raises cohesion: everything that changes together lives together, so a change touches one directory.",
        inPractice:
          "The rule that things which change together belong together is the argument behind organising by feature rather than by layer, and it is testable against your own repository: count the directories a typical change touches.",
        diagram: {
          caption: "Organising by layer scatters a feature; organising by feature contains it",
          columns: [
            [{ id: "chg", label: "One change", sub: "add a field", kind: "client" }],
            [
              { id: "layer", label: "By layer", sub: "six directories", kind: "service", alternative: true },
              { id: "feat", label: "By feature", sub: "one directory", kind: "service" },
            ],
            [
              { id: "spread", label: "Six files, six folders", sub: "low cohesion", kind: "data", alternative: true },
              { id: "local", label: "Six files, one folder", sub: "high cohesion", kind: "data" },
            ],
          ],
          edges: [
            { from: "chg", to: "layer", label: "controllers, models, services" },
            { from: "chg", to: "feat", label: "everything for this feature" },
            { from: "layer", to: "spread", label: "the change travels" },
            { from: "feat", to: "local", label: "the change stays put" },
          ],
        },
        check: {
          prompt: "Adding a field means editing six files across six folders. What is the likely problem?",
          options: [
            "Too much indirection, so one concept is spread over several abstractions",
            "Missing abstraction, the six files should share a single definition",
            "Low cohesion, the code is organised by technical layer, not by feature",
            "The field belongs in a shared type that each layer should import",
          ],
          correctIndex: 2,
          explain: "Things that change together should live together. Layer-first structure scatters each feature across the tree.",
        },
        checks: [
          {
            prompt: "Which is the tightest coupling most systems contain?",
            options: [
              "Two services sharing a database table between them",
              "One service calling another's public HTTP API synchronously",
              "Several modules importing the same shared utility library",
              "A service subscribing to events published by another service",
            ],
            correctIndex: 0,
            explain:
              "A shared table couples two services to a physical schema neither owns, so a migration requires coordinated deploys. It is also invisible on a diagram that draws them as separate boxes.",
          },
          {
            prompt: "What is the actionable form of the single responsibility principle?",
            options: [
              "Things that change for the same reason belong together",
              "A module should expose no more than one public function",
              "A class should be small enough to read on a single screen",
              "Each module should depend on at most one other module",
            ],
            correctIndex: 0,
            explain:
              "Almost anything can be called one responsibility if the description is vague enough. Framing it as reasons to change makes it a question about the commit history rather than about wording.",
          },
          {
            prompt: "A design has admirably low coupling, and a common change touches five modules. What now?",
            options: [
              "The design is wrong for the changes actually being made",
              "The change is too large and should be split into five",
              "Coupling should be reduced further so the modules are independent",
              "The modules should be merged into one to raise cohesion",
            ],
            correctIndex: 0,
            explain:
              "Low coupling is a means, and the end is that a change is small, local and safe. A structure that scatters the changes you routinely make has optimised for the wrong thing.",
          },
        ],
      },
      {
        id: "premature-abstraction",
        title: "Premature abstraction",
        level: "advanced",
        body: [
          "Abstracting after one use is a guess at what varies, and the guess is usually wrong. The abstraction then obstructs the very change it was built to accommodate: the second case needs a flag, the third needs another, and within a year the shared function has six parameters, four of which are only used by one caller each.",
          "Duplication is cheaper to fix than a wrong abstraction, and the asymmetry is the whole argument. Copies are visible: you can find them, compare them and merge them mechanically once you can see what they have in common. A wrong abstraction hides the differences behind parameters and has callers that have adapted to its shape, so unwinding it means untangling every one of them.",
          "Waiting for the third occurrence is a heuristic rather than a law, and its value is that by then the axis of variation is usually visible. Two examples look identical because you have only seen two; the third tells you which part was incidental. Where the pattern is genuinely obvious from the first, abstract, and where it is not, copy and wait.",
          "There is a related failure that is harder to see: an abstraction that is correct but adds a layer nobody needed. Indirection has a cost paid by every reader, who must now hold two files in their head to understand one behaviour, and the cost is invisible to the person who wrote it because they already have both files in their head.",
          "The honest signals that an abstraction has gone wrong are specific. Parameters that only exist to switch behaviour for one caller. A name that had to be vague because the thing does several jobs. Callers passing arguments they do not care about. Anyone finding it easier to bypass than to use. Any of those is a prompt to inline it and start again from what the code actually does.",
          "Underneath is a rule about the cost of being wrong. Reversible decisions deserve speed and irreversible ones deserve deliberation, and duplication is reversible while a widely adopted abstraction is not. That asymmetry, rather than any aesthetic preference, is why the advice is to wait.",
        ],
        why: "The cost asymmetry is the point. Removing duplication later is mechanical; unwinding a wrong abstraction means untangling every caller that adapted to it.",
        inPractice:
          "Sandi Metz's line that duplication is far cheaper than the wrong abstraction is the compressed version of this topic, and it is quoted so often because most engineers have personally paid for the alternative.",
        check: {
          prompt: "Why wait for the third occurrence before abstracting?",
          options: [
            "Two cases rarely reveal what varies, and a wrong abstraction outlasts duplication",
            "Three call sites is the point where shared code pays back the cost of its indirection",
            "Duplicated code is cheaper to read than an abstraction reached from three directions",
            "Extraction tools need three examples before they can infer the right parameters",
          ],
          correctIndex: 0,
          explain: "You need enough examples to see what genuinely varies. Guessing early produces parameters that fight the next requirement.",
        },
        checks: [
          {
            prompt: "Which is the clearest sign an abstraction has gone wrong?",
            options: [
              "Parameters that exist only to switch behaviour for one caller",
              "More than three callers depending on the same shared function",
              "A file longer than the module it was extracted from originally",
              "Test cases that construct the abstraction rather than the caller",
            ],
            correctIndex: 0,
            explain:
              "A flag per caller means the cases were never the same thing. The name usually gives it away too, having become vague enough to cover several jobs.",
          },
          {
            prompt: "Why is duplication cheaper to fix than a wrong abstraction?",
            options: [
              "Copies are visible and merge mechanically; callers adapt to an abstraction",
              "Duplicated code is smaller, so there is less of it to change",
              "Abstractions cannot be removed without a corresponding interface change",
              "Copies can be updated independently, so the fix can be done gradually",
            ],
            correctIndex: 0,
            explain:
              "You can see every copy and compare them. An abstraction hides the differences behind parameters and has callers shaped around it, so unwinding it means untangling all of them.",
          },
          {
            prompt: "What is the cost of an abstraction that is correct but unnecessary?",
            options: [
              "Readers must hold two files in their head to understand one behaviour",
              "The extra function call adds measurable latency on a hot code path",
              "The build takes longer, since more modules now have to be compiled",
              "It cannot be tested without constructing both of the layers separately",
            ],
            correctIndex: 0,
            explain:
              "Indirection is paid by readers, and it is invisible to the author because they already have both files in mind. That is why the layer feels free to add and expensive to live with.",
          },
        ],
      },
      {
        id: "tech-debt",
        title: "Technical debt as a decision",
        level: "intermediate",
        body: [
          "The metaphor is precise and worth using precisely. Deliberate debt is a shortcut taken knowingly to hit a date, recorded, with an intended repayment: we are hard-coding this for launch and will generalise it in March. That is a legitimate engineering trade, and it is the only kind that can be argued for in a planning meeting.",
          "Accidental debt is what accumulates from not knowing better at the time, and calling it debt flatters it. Nobody chose it and there is no plan, so it is closer to damage than to a loan. The distinction matters because the conversations are different: one is a decision to revisit and the other is work to schedule.",
          "The interest is real and compounds. Every change in that area costs more, and the rate rises as more code comes to depend on the shortcut, so the cheapest moment to repay is always now and it gets worse monotonically. That is also why a shortcut in a rarely touched corner may be worth leaving forever, since interest is only paid where change happens.",
          "Which makes the useful question where the debt is rather than how much there is. Debt in code nobody touches costs nothing. Debt in the module every feature passes through is taxing every piece of work the team does, and the same amount of untidiness produces wildly different costs depending on where it sits. Change frequency is the multiplier.",
          "Making it visible is what turns it into a decision. A note in the code with a date, an issue linked from the shortcut, a section in the design document listing what was skipped and why. Debt nobody can point at cannot be argued for or against, and it turns into a general sense that the codebase is bad, which persuades nobody and prioritises nothing. Repayment works best as continuous rather than as a project. A rewrite proposal competes with features and loses; improving the code you are already touching does not, because it is part of the work rather than an alternative to it. That habit is also why the areas of a codebase that get worked on most tend to be the ones in the best condition, provided the team has the discipline to leave them slightly better each time.",
        ],
        why: "The distinction matters because only deliberate debt can be argued for. 'We chose this and here is the repayment plan' is a decision; 'the code is messy' is a complaint.",
        inPractice:
          "Ward Cunningham coined the metaphor to describe a deliberate trade with an intended repayment, not a synonym for bad code. The original meaning is the useful one, because only a deliberate trade can be argued for in a planning conversation.",
        check: {
          prompt: "What makes technical debt deliberate rather than accidental?",
          options: [
            "It is tracked in the backlog, with an owner and a rough estimate",
            "It was written under a deadline the team did not choose for itself",
            "It is isolated behind an interface, so replacing it touches one place",
            "It was taken knowingly, for a reason, recorded, with an intended repayment",
          ],
          correctIndex: 3,
          explain: "Deliberate debt is a trade someone can defend. Accidental debt is an accumulation nobody decided on.",
        },
        checks: [
          {
            prompt: "Two modules carry the same amount of untidiness. What decides which costs more?",
            options: [
              "How often each is changed, since interest is only paid on change",
              "How much code each contains, since larger modules degrade faster",
              "How many engineers understand each, since knowledge limits repair",
              "How old each is, since older shortcuts have compounded for longer",
            ],
            correctIndex: 0,
            explain:
              "Debt in code nobody touches costs nothing. Debt on the path every feature crosses taxes all of the team's work, which is why change frequency, not volume, is the multiplier worth looking at.",
          },
          {
            prompt: "Why does continuous repayment beat a rewrite project?",
            options: [
              "Improving code you are already touching does not compete with features",
              "Rewrites cannot be reviewed effectively because the diff is too large",
              "Incremental changes are easier to revert if they cause a regression",
              "A rewrite requires freezing the existing code, which blocks the team",
            ],
            correctIndex: 0,
            explain:
              "A cleanup project has to win an argument against shipping. Work done inside a change someone is making anyway is part of that change, which is why the most-worked areas are often the healthiest.",
          },
          {
            prompt: "What does recording debt explicitly actually buy?",
            options: [
              "It can be argued for or against, and prioritised against other work",
              "It prevents the same shortcut from being taken elsewhere in the code",
              "It creates a record for auditors of what was knowingly deferred",
              "It allows the interest to be measured over the following quarters",
            ],
            correctIndex: 0,
            explain:
              "Unrecorded debt turns into a general feeling that the codebase is bad, which persuades nobody and prioritises nothing. A specific note with a date is something a planning conversation can act on.",
          },
        ],
      },
    ],
  },
];
