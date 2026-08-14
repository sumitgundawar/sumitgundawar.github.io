import type { Card } from "./types";

export const interview: Card[] = [
  {
    id: "sd-interview",
    title: "The system design interview",
    summary: "A structure that works, and what is actually being assessed.",
    track: "interview",
    topics: [
      {
        id: "framework",
        title: "A structure for the 45 minutes",
        level: "beginner",
        body: [
          "Spend the first five minutes on requirements. What must it do, what scale, what matters most — latency, consistency, cost. Write the numbers down.",
          "Then a rough estimate, then a high-level design of five or six boxes, then depth on the two or three parts that are genuinely hard.",
          "Leave five minutes for bottlenecks and what you would do differently at ten times the load.",
        ],
        why: "Candidates who start drawing boxes immediately fail on scope, not knowledge. Establishing constraints first is what makes every later decision defensible rather than arbitrary.",
        diagram: {
          caption: "How to spend the time",
          columns: [
            [{ id: "req", label: "Requirements", sub: "5 min, write numbers", kind: "client" }],
            [{ id: "est", label: "Estimate", sub: "5 min, orders of magnitude", kind: "edge" }],
            [{ id: "hl", label: "High level", sub: "10 min, 5-6 boxes", kind: "service" }],
            [{ id: "deep", label: "Deep dive", sub: "20 min, the hard parts", kind: "data" }],
            [{ id: "wrap", label: "Bottlenecks", sub: "5 min, at 10x", kind: "queue" }],
          ],
          edges: [
            { from: "req", to: "est" },
            { from: "est", to: "hl" },
            { from: "hl", to: "deep" },
            { from: "deep", to: "wrap" },
            { from: "deep", to: "req", label: "revisit if scope shifts", async: true },
          ],
        },
        check: {
          prompt: "What is the most common way strong engineers fail a system design interview?",
          options: [
            "Not knowing enough technologies",
            "Designing before clarifying scale and requirements, so the design cannot be justified",
            "Drawing untidy diagrams",
            "Talking too little about databases",
          ],
          correctIndex: 1,
          explain: "Without constraints, every choice is arbitrary. The requirements phase is what lets you say why, which is the whole assessment.",
        },
      },
      {
        id: "estimation",
        title: "Back-of-envelope estimation",
        level: "intermediate",
        body: [
          "A day is 86,400 seconds, near enough 100,000. A million daily events is roughly 12 per second; a billion is roughly 12,000 per second.",
          "Peak is commonly two to three times average, and traffic is rarely spread evenly through the day.",
          "Storage: a thousand bytes per record and a million records a day is a gigabyte a day, about a third of a terabyte a year.",
        ],
        why: "The point is not precision, it is knowing whether you are designing for 10 requests per second or 100,000 — because those are entirely different systems. Being off by 20 percent is fine; being off by a factor of a thousand is the failure.",
        check: {
          prompt: "One million requests a day is roughly what average rate?",
          options: ["1,000 per second", "12 per second", "120 per second", "1 per second"],
          correctIndex: 1,
          explain: "A day is about 100,000 seconds, so a million a day is around 12 per second average, perhaps 30 at peak. That is a small system.",
        },
      },
      {
        id: "tradeoffs",
        title: "Talking about tradeoffs",
        level: "advanced",
        body: [
          "Every design decision costs something. Naming the cost is the strongest signal available, because it shows you have run the system rather than read about it.",
          "'I would cache this' is weak. 'I would cache this with a 60-second TTL, accepting up to a minute of staleness because prices update hourly' is a decision.",
          "Volunteering the failure mode is even better: say what breaks under partition, under a hot key, or when the cache is cold.",
        ],
        why: "Interviewers are testing judgement, not recall. Anyone can name Redis; the differentiator is knowing when it is wrong and saying so unprompted.",
        check: {
          prompt: "Which answer signals seniority?",
          options: [
            "We would use Kafka because it scales",
            "A queue here decouples the write path, at the cost of eventual consistency — the user sees pending until it drains",
            "We would add caching",
            "We would use microservices",
          ],
          correctIndex: 1,
          explain: "It names the benefit, the cost, and the user-visible consequence. The others name technologies without decisions.",
        },
      },
    ],
  },

  {
    id: "seniority",
    title: "Senior and staff signals",
    summary: "What separates the levels, and how it shows up in interviews.",
    track: "interview",
    topics: [
      {
        id: "senior-vs-staff",
        title: "Senior versus staff",
        level: "advanced",
        body: [
          "A senior engineer owns delivery of a complex system end to end: designs it, builds it, handles the failure modes, and is trusted without supervision.",
          "A staff engineer works across teams, on problems that are ambiguous before they are hard. Much of the work is deciding what should be built, and getting agreement.",
          "The visible difference in interviews is scope: seniors discuss the system, staff discuss the system in the context of the organisation running it.",
        ],
        why: "Promotion to staff is rarely earned by writing more code. It comes from multiplying other people's output and choosing the right problem, which is why the interview probes influence and judgement rather than depth alone.",
        check: {
          prompt: "Which is the clearest staff-level signal?",
          options: [
            "Knowing more languages",
            "Identifying that two teams are solving the same problem twice and getting them aligned on one approach",
            "Writing the fastest implementation",
            "Reviewing the most pull requests",
          ],
          correctIndex: 1,
          explain: "Staff work is leverage: preventing duplicated effort across teams is worth more than any single implementation.",
        },
      },
      {
        id: "behavioural",
        title: "Behavioural answers with substance",
        level: "intermediate",
        body: [
          "Structure the answer: the situation, what you specifically did, and what happened. Vague collective 'we' answers are the most common weakness.",
          "Include the trade you made and what you would do differently. Certainty about a past decision reads as not having examined it.",
          "Have two or three real stories with numbers, including one where the outcome was poor and you learned something concrete.",
        ],
        why: "The failure story is the one that separates candidates. Everyone has one; the ones who can describe it precisely, without deflecting, are demonstrating exactly the self-assessment senior work requires.",
        check: {
          prompt: "Why do interviewers ask about a project that went badly?",
          options: [
            "To find reasons to reject",
            "To see whether you can assess your own decisions honestly and extract something specific",
            "To check technical depth",
            "To test memory",
          ],
          correctIndex: 1,
          explain: "The content matters less than the quality of reflection. Deflection signals someone who will repeat the mistake.",
        },
      },
      {
        id: "coding-round",
        title: "The coding round",
        level: "intermediate",
        body: [
          "Restate the problem and confirm the examples before writing anything. Clarifying an ambiguous constraint early is part of what is scored.",
          "Say the brute force, state its complexity, then improve. A working slow solution beats an unfinished clever one.",
          "Test with an edge case unprompted: empty input, one element, duplicates. Doing that without being asked is a strong signal.",
        ],
        why: "The interview is a proxy for working with you. Silent brilliance scores worse than narrated competence, because collaboration is the thing actually being sampled.",
        check: {
          prompt: "You see the optimal solution immediately. What is the best move?",
          options: [
            "Write it silently and finish early",
            "State the brute force and its complexity, then explain the optimisation and why it works, then write it",
            "Ask for a harder problem",
            "Write it and then add comments",
          ],
          correctIndex: 1,
          explain: "The reasoning is what is being assessed. Showing the progression demonstrates you can find such a solution, not just recall one.",
        },
      },
    ],
  },
];
