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
          "Unit tests are fast and numerous and isolate one piece of logic. Integration tests check that components work together, usually with a real database and a real HTTP layer. End-to-end tests drive the whole system through its interface, the way a user would. The pyramid says have many of the first and few of the last, because cost, runtime and flakiness all rise with scope.",
          "The reason is feedback rather than purity. A failing unit test names the broken function; a failing end-to-end test tells you something in the system is wrong and leaves you to find it. Inverted, mostly end-to-end, produces a suite that takes twenty minutes, fails for unrelated reasons twice a week, and is eventually ignored by everybody including the person who wrote it.",
          "The layer that pays best in practice is the middle one, and it is the one most often skipped. A test that runs the real handler against a real database in a container catches the things unit tests cannot, wrong SQL, a missing migration, a serialisation mismatch, without the fragility of a browser. Containers made that layer cheap enough that the old argument for mocking the database has largely expired.",
          "Mocking deserves a rule: mock what you do not own, and be sparing even then. Mocks encode your belief about how a dependency behaves, so a test suite built on them passes whenever your beliefs are self-consistent, which is not the same as being right. The classic outcome is a fully green suite against an API that changed its response shape last month.",
          "What to test is a better question than how much. The logic with branches, the boundaries where data enters or leaves, the failure paths that only run during an incident, and every bug you have already had, which is the highest-value test anyone writes. Trivial getters and framework behaviour are not tests, they are ceremony with a runtime cost.",
          "One test type deserves a mention because it finds what examples cannot: property-based testing, where the framework generates inputs and checks an invariant. It is unreasonably effective on parsers, serialisers, date handling and anything with a round trip, because it explores the space you did not think of, which is precisely where the bugs are.",
        ],
        why: "The shape follows from feedback speed. A failing unit test names the broken function; a failing end-to-end test tells you something in the system is wrong, and you still have to find it.",
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
          "Waterfall runs in sequence: gather requirements, design, build, test, release. Each stage completes before the next begins, and the client sees the result at the end.",
          "It works when requirements genuinely cannot change, regulated work, physical manufacturing, fixed-scope contracts, and where the cost of change late is enormous.",
          "It fails for software because requirements are discovered by using the thing, and waterfall defers that discovery to the point where change is most expensive.",
        ],
        why: "The cost-of-change curve is the whole argument. If change is cheap and information arrives during building, front-loading every decision is the wrong bet.",
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
      },
      {
        id: "agile",
        title: "Agile, scrum and kanban",
        level: "beginner",
        body: [
          "Agile is a set of preferences: working software over documentation, responding to change over following a plan, short cycles with real feedback.",
          "Scrum implements that with fixed sprints, defined roles and ceremonies. Kanban drops sprints and limits work in progress instead, pulling the next item as capacity frees. Kanban suits interrupt-driven work such as support; scrum suits planned feature work with a stable team.",
        ],
        why: "Both fail the same way: adopting the ceremonies without the feedback. Standups and sprints with no working software to show and no willingness to change the plan is waterfall with extra meetings.",
        check: {
          prompt: "Which fits a support team with unpredictable incoming work?",
          options: ["Scrum with two-week sprints", "Kanban with WIP limits", "Waterfall", "Scrum with one-week sprints"],
          correctIndex: 1,
          explain: "Sprint commitments assume a plannable period. Interrupt-driven work breaks that assumption; kanban pulls work as capacity appears.",
        },
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
      },
      {
        id: "incidents",
        title: "Incidents and blameless postmortems",
        level: "advanced",
        body: [
          "During an incident, restore service first and investigate afterwards. Mitigation and diagnosis compete, and users care about the first.",
          "A postmortem asks what made the failure possible, not who typed the command. Systems that fail when one person errs are the finding.",
          "Blameless does not mean consequence-free. It means the output is a change to the system rather than a name.",
        ],
        why: "Blame produces hidden incidents. If reporting a mistake is punished, people stop reporting, and you lose the information that prevents recurrence.",
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
          "Coupling is how much modules depend on each other. Cohesion is how related the contents of one module are. The target is low coupling and high cohesion.",
          "Tight coupling means a change in one place forces a change in another, and it is why some codebases resist every modification. Splitting by layer, all controllers together, all models together, usually produces low cohesion, because a single feature ends up spread across every folder you have.",
        ],
        why: "Organising by feature rather than by technical layer usually raises cohesion: everything that changes together lives together, so a change touches one directory.",
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
      },
      {
        id: "premature-abstraction",
        title: "Premature abstraction",
        level: "advanced",
        body: [
          "Abstracting after one use is a guess at what varies. The guess is usually wrong, and the abstraction then obstructs the very change it was built to accommodate.",
          "Duplication is cheaper to fix than a wrong abstraction: you can see all the copies, whereas an abstraction hides the differences behind parameters. Wait for the third occurrence, when the actual axis of variation is finally visible.",
        ],
        why: "The cost asymmetry is the point. Removing duplication later is mechanical; unwinding a wrong abstraction means untangling every caller that adapted to it.",
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
      },
      {
        id: "tech-debt",
        title: "Technical debt as a decision",
        level: "intermediate",
        body: [
          "Deliberate debt is a shortcut taken knowingly to hit a date, recorded with a plan to repay. That is a legitimate engineering trade.",
          "Accidental debt is what accumulates from not knowing better, and it is not really debt so much as damage.",
          "The interest is real: every future change in that area costs more, and the rate compounds as more code depends on the shortcut.",
        ],
        why: "The distinction matters because only deliberate debt can be argued for. 'We chose this and here is the repayment plan' is a decision; 'the code is messy' is a complaint.",
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
      },
    ],
  },
];
