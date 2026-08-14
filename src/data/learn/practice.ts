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
          "Unit tests are fast, numerous and isolate one piece of logic. Integration tests check that components work together. End-to-end tests drive the real system through its interface.",
          "The pyramid says have many of the first and few of the last, because cost and flakiness rise as scope grows.",
          "An inverted pyramid — mostly end-to-end — produces a suite that is slow, flaky, and eventually ignored.",
        ],
        why: "The shape follows from feedback speed. A failing unit test names the broken function; a failing end-to-end test tells you something in the system is wrong, and you still have to find it.",
        check: {
          prompt: "Why prefer many unit tests over many end-to-end tests?",
          options: [
            "Unit tests find more bugs",
            "They are fast and localise failures precisely, while broad tests are slow and only say something is wrong",
            "End-to-end tests cannot be automated",
            "Unit tests do not need maintenance",
          ],
          correctIndex: 1,
          explain: "Both find bugs. The difference is feedback: speed and precision of diagnosis, which is what determines whether a suite gets used.",
        },
      },
      {
        id: "coverage",
        title: "Coverage and what it does not tell you",
        level: "intermediate",
        body: [
          "Coverage measures which lines executed during tests. It does not measure whether anything was asserted, or whether the assertions are meaningful.",
          "A test that calls a function and checks nothing produces full coverage of that function and catches no regression at all.",
          "Mandating a coverage percentage reliably produces tests written to satisfy the number rather than to catch failures.",
        ],
        why: "Coverage is useful as a discovery tool — finding untested areas — and harmful as a target, because it is trivially gameable and becomes the goal instead of correctness.",
        check: {
          prompt: "A module has 100% coverage and a regression ships. How?",
          options: [
            "Coverage was measured incorrectly",
            "Lines executed but assertions were weak or absent, so wrong behaviour was never checked",
            "The tests ran on the wrong branch",
            "Coverage does not include branches",
          ],
          correctIndex: 1,
          explain: "Execution is not verification. Coverage counts lines run, not properties checked.",
        },
      },
      {
        id: "flaky-tests",
        title: "Flaky tests",
        level: "advanced",
        body: [
          "A flaky test passes and fails without the code changing, usually from timing, shared state, ordering assumptions or real network calls.",
          "The damage is cultural rather than technical: once a suite is known to fail randomly, real failures get re-run instead of investigated.",
          "Quarantine flaky tests immediately so the signal stays trustworthy, then fix or delete them. A test nobody believes is worse than no test.",
        ],
        why: "Tolerating flakiness destroys the value of the entire suite, not just the flaky test. The correct response is urgent, because trust does not degrade gracefully.",
        check: {
          prompt: "Why is a flaky test worse than a missing one?",
          options: [
            "It runs more slowly",
            "It teaches the team to ignore failures, which undermines every other test in the suite",
            "It uses more CI minutes",
            "It cannot be fixed",
          ],
          correctIndex: 1,
          explain: "A missing test is a known gap. A flaky one poisons the signal, so genuine failures get dismissed as noise.",
        },
      },
    ],
  },

  {
    id: "engineering-models",
    title: "How teams work",
    summary: "Waterfall, agile, scrum, kanban — what each assumes and when it breaks.",
    track: "practice",
    topics: [
      {
        id: "waterfall",
        title: "Waterfall",
        level: "beginner",
        body: [
          "Waterfall runs in sequence: gather requirements, design, build, test, release. Each stage completes before the next begins, and the client sees the result at the end.",
          "It works when requirements genuinely cannot change — regulated work, physical manufacturing, fixed-scope contracts — and where the cost of change late is enormous.",
          "It fails for software because requirements are discovered by using the thing, and waterfall defers that discovery to the point where change is most expensive.",
        ],
        why: "The cost-of-change curve is the whole argument. If change is cheap and information arrives during building, front-loading every decision is the wrong bet.",
        check: {
          prompt: "What is waterfall's core assumption?",
          options: [
            "Teams are large",
            "Requirements can be known fully in advance and will not change materially",
            "Testing is unnecessary",
            "Documentation is optional",
          ],
          correctIndex: 1,
          explain: "Everything downstream depends on the requirements being right at the start. Where that holds it is efficient; in software it usually does not.",
        },
      },
      {
        id: "agile",
        title: "Agile, scrum and kanban",
        level: "beginner",
        body: [
          "Agile is a set of preferences: working software over documentation, responding to change over following a plan, short cycles with real feedback.",
          "Scrum implements that with fixed sprints, defined roles and ceremonies. Kanban drops sprints and limits work in progress instead, pulling the next item when capacity frees.",
          "Kanban suits interrupt-driven work such as support. Scrum suits planned feature work with a stable team.",
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
          "Separating blocking concerns from suggestions makes review faster and less adversarial: say which comments must be addressed.",
        ],
        why: "PR size is the single biggest lever on review quality. Splitting work into reviewable pieces is a design skill, and the reason large PRs get rubber-stamped is capacity, not laziness.",
        check: {
          prompt: "Why do large pull requests get weaker review?",
          options: [
            "Reviewers are less experienced",
            "Beyond a few hundred lines, reviewers cannot hold the change in context, so review degrades to approval",
            "Tools cannot display them",
            "They take longer to merge",
          ],
          correctIndex: 1,
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
            "To avoid difficult conversations",
            "To surface systemic causes honestly, which requires people not fearing punishment for reporting",
            "To satisfy compliance",
            "To identify who to retrain",
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
          "Coupling is how much modules depend on each other. Cohesion is how related the contents of one module are. The target is low coupling, high cohesion.",
          "Tight coupling means a change in one place forces changes elsewhere, and it is why some codebases resist every modification.",
          "Splitting by layer — all controllers together, all models together — often produces low cohesion, because one feature spreads across every folder.",
        ],
        why: "Organising by feature rather than by technical layer usually raises cohesion: everything that changes together lives together, so a change touches one directory.",
        check: {
          prompt: "Adding a field means editing six files across six folders. What is the likely problem?",
          options: [
            "Too few abstractions",
            "Low cohesion — the code is organised by technical layer rather than by feature",
            "Missing tests",
            "The language is verbose",
          ],
          correctIndex: 1,
          explain: "Things that change together should live together. Layer-first structure scatters each feature across the tree.",
        },
      },
      {
        id: "premature-abstraction",
        title: "Premature abstraction",
        level: "advanced",
        body: [
          "Abstracting after one use guesses at what varies. The guess is usually wrong, and the abstraction then obstructs the change it was meant to accommodate.",
          "Duplication is cheaper to fix than the wrong abstraction: you can see all the copies, whereas an abstraction hides the differences behind parameters.",
          "Wait until the third occurrence, when the actual axis of variation is visible.",
        ],
        why: "The cost asymmetry is the point. Removing duplication later is mechanical; unwinding a wrong abstraction means untangling every caller that adapted to it.",
        check: {
          prompt: "Why wait for the third occurrence before abstracting?",
          options: [
            "Two cases rarely reveal what actually varies, and a wrong abstraction costs more than duplication",
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
            "It is in the backlog",
            "It was chosen knowingly for a reason, recorded, with an intended repayment",
            "It was written quickly",
            "It has no tests",
          ],
          correctIndex: 1,
          explain: "Deliberate debt is a trade someone can defend. Accidental debt is an accumulation nobody decided on.",
        },
      },
    ],
  },
];
