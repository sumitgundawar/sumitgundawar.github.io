import type { Card } from "./types";

/* Questions that circulate publicly in interview write-ups and candidate
   reports. Treat the company attributions as indicative rather than sourced, loops vary by team and change over time. The useful observation is the
   overlap: the same 25 to 30 problems recur, so preparation transfers. */

export const companies: Card[] = [
  {
    id: "company-questions",
    title: "Questions companies actually ask",
    summary: "The recurring set across Google, Meta, Amazon, Microsoft, Uber, Stripe and the rest.",
    track: "interview",
    topics: [
      {
        id: "the-common-pool",
        title: "The same thirty questions",
        level: "beginner",
        body: [
          "Publicly shared interview reports from Google, Meta, Amazon, Microsoft, Netflix, Uber, Stripe and Airbnb describe largely the same pool of twenty-five to thirty problems. Preparing for one company prepares you for most of them.",
          "The recurring set: a news feed, a chat system, a video streaming service, a URL shortener, a rate limiter, a ride-hailing match, a payment flow, a notification system, a search or autocomplete, a file sync service, a ticket booking system, and a web crawler.",
          "The variation between companies is less in the question than in what they press on afterwards.",
        ],
        why: "This is why breadth beats memorising one company's list. Each question exercises two or three underlying decisions, fan-out, geospatial indexing, consistency under contention, and those decisions repeat across all of them.",
        check: {
          prompt: "You have limited preparation time before loops at four different companies. Best approach?",
          options: [
            "Memorise each company's reported questions, since the lists differ by firm",
            "Learn the recurring set well, the same twenty-five or so circulate everywhere",
            "Focus on the largest company, and treat the others as practice for it",
            "Do as many new problems as possible, to maximise the chance of a match",
          ],
          correctIndex: 1,
          explain: "The overlap is high. Depth on the common set transfers; company-specific memorisation does not.",
        },
      },
      {
        id: "by-company",
        title: "What each company tends to press on",
        level: "intermediate",
        body: [
          "Google leans toward scale and data-intensive problems: crawlers, indexing, autocomplete, distributed storage. Expect questions about what happens at a billion of something.",
          "Meta favours social graph problems, news feed, friend recommendation, live comments, where fan-out and the celebrity case are the crux.",
          "Amazon presses on operational ownership and cost, in keeping with its leadership principles. Uber and Lyft go to geospatial matching and surge. Stripe and payment companies go to consistency, idempotency and exactly-once semantics under retries.",
        ],
        inPractice: "The rate limiter question alone has been reported at Amazon, Microsoft, Stripe, Uber, Atlassian and Patreon, it is close to universal because it exercises algorithms, distributed state and failure behaviour in one small problem.",
        why: "Knowing the emphasis lets you steer the depth phase toward what that interviewer values. At a payments company, volunteering idempotency early is worth more than describing a CDN.",
        check: {
          prompt: "Interviewing at a payments company. Which topic is most worth volunteering unprompted?",
          options: [
            "Geospatial indexing and proximity search at city scale",
            "CDN strategy and edge caching for static assets",
            "Idempotency and exactly-once semantics under retries",
            "Video transcoding and adaptive bitrate delivery",
          ],
          correctIndex: 2,
          explain: "Payments live or die on not double-charging. Raising idempotency before being asked signals you understand what the domain is actually hard at.",
        },
      },
      {
        id: "cost-and-ops",
        title: "Cost and operations are part of the answer",
        level: "advanced",
        body: [
          "The questions have barely changed in years. What separates candidates has shifted toward the dimensions that used to be treated as extra credit.",
          "Expect to be asked what it costs to run, what happens at 3am when it breaks, who is paged, and how you roll it back. A design with no answer to those reads as unfinished.",
          "Some loops run without a whiteboard at all, asking you to design aloud and then revise the requirements on the spot.",
        ],
        why: "A technically correct design with no cost estimate and no failure story now reads as incomplete. Saying 'this runs about two hundred a month, and if the cache tier fails we serve stale for up to five minutes rather than going down' is the differentiator.",
        check: {
          prompt: "Your design is technically sound but you never mention cost or failure handling. How does that read at senior level?",
          options: [
            "Fine, those are follow-ups the interviewer raises if they want them",
            "Strong, since an unfocused answer is the more common failure mode",
            "Neutral, they are weighed at staff level and not at senior level",
            "Incomplete, cost and operational behaviour are part of the design",
          ],
          correctIndex: 3,
          explain: "Plenty of candidates produce a correct topology. Operability and cost are where the answer stops being a diagram and starts being a system someone has to run.",
        },
      },
      {
        id: "practice-plan",
        title: "A practice plan that works",
        level: "intermediate",
        body: [
          "Pick six problems spanning the underlying decisions rather than twenty that repeat the same one: a feed, a chat system, a ride match, a rate limiter, a video service, and a payment flow.",
          "Do each one out loud against a timer, because the constraint in the real thing is the clock and the talking, not the knowledge.",
          "Then redo one of them with a changed constraint, ten times the traffic, or a hard consistency requirement, and see whether your design bends or breaks.",
        ],
        why: "Redoing a problem under a changed constraint is the highest-value drill available. It rehearses the thing interviewers actually do, which is push on your design until something gives.",
        check: {
          prompt: "What is the most valuable single drill?",
          options: [
            "Reading write-ups from companies whose scale matches the questions asked",
            "Doing new designs you have never seen, to widen the range you can handle",
            "Redoing a design you know with a changed constraint, out loud and timed",
            "Writing your designs up afterwards, so the reasoning is available to revise",
          ],
          correctIndex: 2,
          explain: "Interviewers change the constraints to see if you understood or memorised. Rehearsing that is closer to the real task than reading is.",
        },
      },
    ],
  },
];
