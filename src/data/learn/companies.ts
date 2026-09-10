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
          "Publicly shared interview reports from Google, Meta, Amazon, Microsoft, Netflix, Uber, Stripe and Airbnb describe largely the same pool of twenty-five to thirty problems. That is the single most useful fact about preparation: work done for one company transfers almost entirely to the next, so the sensible strategy is depth on the common set rather than breadth across company-specific lists.",
          "The recurring set is short enough to write down. A news feed, a chat system, a video streaming service, a URL shortener, a rate limiter, a ride-hailing match, a payment flow, a notification system, a search or autocomplete, a file sync service, a ticket booking system, and a web crawler. Most loops draw from those twelve, and the rest are variations on them wearing a different product name.",
          "They repeat because each one exercises two or three underlying decisions that recur everywhere: fan-out on write against fan-out on read, geospatial indexing, consistency under contention, ordering across partitions, idempotent writes, and delivery to a connection you are holding open. Learning the decisions rather than the answers is what makes the preparation transfer.",
          "The variation between companies is less in the question than in what they press on afterwards, which is why the same prompt can go in four directions depending on who is asking. Two people can both be asked to design a chat system and spend forty minutes on completely different problems, one on connection scaling and one on message ordering.",
          "The practical consequence is to prepare a small number of designs properly rather than a long list superficially. Six or seven done to the depth where you can defend every component under pressure covers more ground than twenty you have read about, because the components repeat and the defending is the part being scored.",
        ],
        why: "This is why breadth beats memorising one company's list. Each question exercises two or three underlying decisions, fan-out, geospatial indexing, consistency under contention, and those decisions repeat across all of them.",
        inPractice:
          "The rate limiter question alone has been reported at Amazon, Microsoft, Stripe, Uber, Atlassian and Patreon, which is the clearest illustration of the overlap: one small problem exercising algorithms, distributed state and failure behaviour at once.",
        diagram: {
          caption: "Twelve questions, a handful of decisions underneath them",
          columns: [
            [
              { id: "feed", label: "News feed", kind: "client" },
              { id: "chat", label: "Chat system", kind: "client" },
              { id: "ride", label: "Ride matching", kind: "client" },
            ],
            [
              { id: "fan", label: "Fan-out", sub: "write or read", kind: "service" },
              { id: "geo", label: "Geospatial index", kind: "service" },
              { id: "idem", label: "Idempotent writes", kind: "service" },
              { id: "order", label: "Ordering", sub: "per entity", kind: "service" },
            ],
            [{ id: "prep", label: "Learn these", sub: "and the questions transfer", kind: "data" }],
          ],
          edges: [
            { from: "feed", to: "fan" },
            { from: "feed", to: "order" },
            { from: "chat", to: "order" },
            { from: "chat", to: "fan" },
            { from: "ride", to: "geo" },
            { from: "ride", to: "idem" },
            { from: "fan", to: "prep" },
            { from: "geo", to: "prep" },
            { from: "idem", to: "prep" },
            { from: "order", to: "prep" },
          ],
        },
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
        checks: [
          {
            prompt: "Why do the same dozen questions recur across companies?",
            options: [
              "Each exercises a few underlying decisions that appear in every system",
              "Interviewers reuse published question banks to keep loops consistent",
              "They are the problems most engineers have encountered professionally",
              "They can be answered within the time a single interview allows",
            ],
            correctIndex: 0,
            explain:
              "Fan-out, geospatial indexing, contention, ordering and idempotency turn up everywhere. The product names differ and the decisions underneath do not, which is what makes the preparation transfer.",
          },
          {
            prompt: "Two candidates are both asked to design a chat system. Why might the interviews differ completely?",
            options: [
              "The variation is in what the interviewer presses on afterwards",
              "The prompt is deliberately ambiguous to test scoping ability",
              "Each interviewer scores against a different published rubric",
              "The seniority of the candidate changes which system is requested",
            ],
            correctIndex: 0,
            explain:
              "One goes to connection scaling and presence, another to ordering and delivery guarantees. The prompt is a starting point, and the depth phase is where the assessment actually happens.",
          },
          {
            prompt: "With limited time, what is the better preparation strategy?",
            options: [
              "Six or seven designs to a depth you can defend under pressure",
              "Twenty designs read through once each for maximum coverage",
              "One design per company you are interviewing with, tailored to them",
              "Only the components, since the questions are assembled from them",
            ],
            correctIndex: 0,
            explain:
              "The components repeat, so depth on a few covers the ground. Defending a choice under pressure is the thing being scored, and it is exactly what breadth alone does not build.",
          },
        ],
      },
      {
        id: "by-company",
        title: "What each company tends to press on",
        level: "intermediate",
        body: [
          "Google leans toward scale and data-intensive problems: crawlers, indexing, autocomplete, distributed storage. Expect the follow-up to be what happens at a billion of something, and expect the estimation to be checked rather than accepted. Meta favours social graph problems, news feed, friend recommendation, live comments, where fan-out and the celebrity case are the crux and where the interesting answer is usually a hybrid.",
          "Amazon presses on operational ownership and cost, in keeping with its leadership principles, and it is the loop where the behavioural round carries the most weight relative to the technical ones. Uber and Lyft go to geospatial matching, surge and the state machine of a trip. Stripe and payment companies go to consistency, idempotency and what happens when a retry arrives after a timeout.",
          "The steering that follows from this is modest and worth doing. At a payments company, volunteer idempotency before being asked. At a social company, raise the celebrity case yourself. At Amazon, say what it costs to run and who gets paged. None of that is gaming the interview; it is answering the question the domain actually poses, which is what a colleague there would do.",
          "Be careful with how much weight this carries, though. Loops vary by team more than by company, interviewers bring their own preferences, and any published mapping of company to emphasis is indicative rather than sourced. Treat it as a prior to update rather than as a script, and drop it the moment the interviewer indicates otherwise.",
          "The one universally safe move is to ask what they care about. Which part of this would you like me to go deeper on is a question every interviewer is glad to answer, and it replaces guessing about emphasis with knowing it.",
        ],
        inPractice: "Treat any published mapping of company to emphasis as a prior rather than a fact, because loops vary by team more than by company and the same company runs different loops for infrastructure and product roles. The reliable signal is the interviewer in front of you: asking which part they would like you to go deeper on replaces the guess with an answer, and no interviewer has ever minded being asked.",
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
        checks: [
          {
            prompt: "How much should a company-to-emphasis mapping be trusted?",
            options: [
              "As a prior to update, since loops vary by team more than by company",
              "As a reliable guide, since interview loops are standardised centrally",
              "Not at all, since published interview reports are usually fabricated",
              "Only for the largest companies, whose processes are well documented",
            ],
            correctIndex: 0,
            explain:
              "Individual interviewers bring their own preferences and teams differ within a company. It is worth having as a starting expectation and worth abandoning the moment the room indicates otherwise.",
          },
          {
            prompt: "What is the universally safe way to find out where to go deep?",
            options: [
              "Ask which part they would like you to go deeper on",
              "Cover every component evenly until they interrupt with a preference",
              "Start with the component you know best, and let them redirect you",
              "Follow the order used in published write-ups for that company",
            ],
            correctIndex: 0,
            explain:
              "Every interviewer is glad to answer it, and it replaces guessing about emphasis with knowing it. It also demonstrates the same instinct you would want from a colleague in a design review.",
          },
          {
            prompt: "Why is volunteering the celebrity case at a social company not gaming the interview?",
            options: [
              "It is the question the domain poses, which a colleague there would raise",
              "It is the only part of a feed design that cannot be looked up",
              "It signals familiarity with that company's published engineering blog",
              "It moves the conversation away from parts you may know less well",
            ],
            correctIndex: 0,
            explain:
              "Fan-out on write breaks down precisely at high follower counts, so raising it is answering the actual problem rather than performing knowledge of the company.",
          },
        ],
      },
      {
        id: "cost-and-ops",
        title: "Cost and operations are part of the answer",
        level: "advanced",
        body: [
          "The questions have barely changed in years. What separates candidates has shifted toward the dimensions that used to be extra credit, and at senior level they are now part of the answer rather than a bonus attached to it.",
          "Expect to be asked what it costs to run, what happens at three in the morning when it breaks, who is paged, and how it is rolled back. A design with no answer to those reads as unfinished, because it describes a topology rather than a system somebody has to operate. Saying this runs about two hundred a month, and if the cache tier fails we serve stale for up to five minutes rather than going down, is the differentiator.",
          "Migration is the other under-prepared dimension. Almost nothing is built on an empty field, so being asked how you would get there from the system that exists is both realistic and revealing. The strong answer is incremental: run both, move traffic gradually, keep a way back, and have a signal that tells you which is behaving better.",
          "Some loops now run without a whiteboard at all, asking you to design aloud and then revising the requirements mid-way to see how the design bends. That format rewards the same habits as the written one: state assumptions, keep the reasoning audible, and say which decisions the change invalidates rather than quietly patching the diagram.",
          "None of this replaces the technical core. It is the layer that turns a correct answer into a credible one, and it is the layer most candidates leave out, which makes it the cheapest available way to be memorable for the right reason.",
        ],
        why: "A technically correct design with no cost estimate and no failure story now reads as incomplete. Saying 'this runs about two hundred a month, and if the cache tier fails we serve stale for up to five minutes rather than going down' is the differentiator.",
        inPractice:
          "Amazon's leadership principles include ownership and frugality explicitly, so cost and operations are not extra credit in that loop, they are two of the things being scored.",
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
        checks: [
          {
            prompt: "Asked how you would migrate from the existing system, what shape of answer is strongest?",
            options: [
              "Run both, move traffic gradually, keep a way back, watch a signal",
              "Freeze the old system, migrate the data, then switch over cleanly",
              "Build the new system alongside and switch once it is fully complete",
              "Migrate the least critical component first as a proof of concept",
            ],
            correctIndex: 0,
            explain:
              "Incremental with a reversible step and a comparison signal is how migrations actually succeed. A single switch-over concentrates all the risk into one moment with no way back.",
          },
          {
            prompt: "Why does an interview that revises the requirements mid-way reward the same habits?",
            options: [
              "Audible reasoning lets you say which decisions the change invalidates",
              "It gives more time to describe components already covered once",
              "It tests memory of the original constraints rather than the design",
              "It moves the assessment from design skill to communication skill",
            ],
            correctIndex: 0,
            explain:
              "If the assumptions were stated, you can point at which ones just changed and follow the consequences. If they were implicit, the only option is to patch the diagram and hope.",
          },
          {
            prompt: "Why is the operational layer the cheapest way to stand out?",
            options: [
              "Most candidates leave it out, and it is not technically difficult",
              "Interviewers weight it more heavily than the technical design itself",
              "It requires production experience that few candidates can fake",
              "It shortens the technical portion, leaving fewer chances for error",
            ],
            correctIndex: 0,
            explain:
              "Two sentences about cost and one about the failure path take under a minute and are absent from most answers. Plenty of people produce a correct topology; far fewer describe something they could run.",
          },
        ],
      },
      {
        id: "practice-plan",
        title: "A practice plan that works",
        level: "intermediate",
        body: [
          "Pick six problems that span the underlying decisions rather than twenty that repeat the same one. A feed, for fan-out on write against fan-out on read. A chat system, for held connections and delivery guarantees. A ride match, for geospatial indexing and assignment. A rate limiter, for algorithms and distributed counter state. A video service, for the pipeline and the cost of precomputation. A payment flow, for idempotency and consistency under an ambiguous timeout. Between them those six exercise almost every decision the common pool draws on, which is why six done properly beats twenty read about.",
          "Do each one out loud, against a timer, in the format you will actually face. The constraint in the real thing is the clock and the talking, not the knowledge, and both are trainable in a way that reading is not. Forty five minutes, spoken, with a diagram you are producing while you speak, is a genuinely different exercise from thinking the same thoughts silently, and the gap between the two is where most well-prepared candidates lose the round.",
          "Then redo one with a changed constraint, which is the highest-value drill available because it rehearses the thing interviewers actually do. Ten times the traffic. A hard consistency requirement where you had assumed staleness was fine. A regulatory rule that the data cannot leave a country. A budget a tenth of what you implicitly assumed. Watch whether your design bends or breaks, and notice which decisions you have to unwind: those are the ones that were load-bearing, and knowing which they are is most of what senior judgement looks like from outside.",
          "Record yourself once, however unpleasant that is, because the recording tells you things no amount of self-assessment will. The usual findings are the same across most people: long silences during the hard part, assumptions stated once and then quietly contradicted, a component named and never justified, and no time left for the failure modes. Each of those is cheap to fix once seen and invisible from the inside.",
          "Keep a written list of the numbers you keep having to look up, and stop looking them up. Requests per second from a daily total. Storage per year from a row size. The latency ladder from memory to cross-continental. A quorum size for a given failure tolerance. Those are the arithmetic you will do under pressure, and doing it from memory is the difference between a fluent five minutes of estimation and a stalled one.",
          "Finally, do at least two of the six with another person rather than alone, because the part you cannot rehearse by yourself is being interrupted. Someone pushing on a decision, asking for a number you did not prepare, or steering you away from the part you wanted to talk about is the actual format, and the first time it happens should not be the real thing.",
        ],
        why:
          "Redoing a problem under a changed constraint is the drill that transfers, because it rehearses what interviewers actually do, which is push on a design until something gives. Practising six designs to the depth where every component can be defended covers more of the pool than twenty read once, because the components repeat and the defending is the part being scored.",
        inPractice:
          "Mock interviews are the part people skip and the part that transfers, because designing aloud under time pressure is a separate skill from knowing the material, and it is the only one of the two that cannot be practised silently. The same is true of the recording: it is the cheapest feedback available and almost nobody does it twice, because once is usually enough to change how you speak.",
        diagram: {
          caption: "Six problems, then the drill that makes them transfer",
          columns: [
            [{ id: "six", label: "Six problems", sub: "spanning the decisions", kind: "client" }],
            [{ id: "aloud", label: "Aloud, on a timer", sub: "45 minutes, diagram as you go", kind: "service" },
             { id: "silent", label: "Read and reason", sub: "trains neither constraint", kind: "service", alternative: true }],
            [{ id: "bend", label: "Change a constraint", sub: "10x traffic, hard consistency", kind: "data" }],
            [{ id: "load", label: "Load-bearing ones", sub: "the ones you had to unwind", kind: "data" },
             { id: "peer", label: "With someone else", sub: "rehearses being interrupted", kind: "external" }],
          ],
          edges: [
            { from: "six", to: "aloud", label: "one at a time" },
            { from: "six", to: "silent", label: "feels like progress" },
            { from: "aloud", to: "bend", label: "then redo one" },
            { from: "bend", to: "load", label: "watch what breaks" },
            { from: "aloud", to: "peer", label: "at least twice", async: true },
          ],
        },
        check: {
          prompt: "Which drill best rehearses what a system design interviewer actually does?",
          options: [
            "Redoing a design you know with one constraint deliberately changed",
            "Reading two more designs so the breadth of the pool is covered",
            "Timing yourself drawing the same architecture until it is quicker",
            "Memorising the components each of the common questions needs",
          ],
          correctIndex: 0,
          explain:
            "The format is a conversation in which someone pushes until something gives. Changing a constraint on a design you already hold reveals which decisions were load-bearing, which is the thing being assessed and the thing extra breadth does not touch.",
        },
        checks: [
          {
            prompt: "Why practise out loud rather than by thinking it through?",
            options: [
              "The clock and the talking are the constraints, and both are trainable",
              "Speaking commits you to a design, which stops the endless revising",
              "Interviewers score fluency of delivery above the design itself",
              "It is the only way to find out whether you know the material",
            ],
            correctIndex: 0,
            explain:
              "The knowledge is usually there. What is missing is producing it in order, in forty five minutes, while drawing, which is a separate skill and the one the format actually taxes.",
          },
          {
            prompt: "Which numbers are worth committing to memory before a design round?",
            options: [
              "Seconds in a day, the latency ladder, and quorum sizing",
              "The default port and configuration for each common datastore",
              "Current instance prices for the two largest cloud providers",
              "Published throughput figures for Kafka, Redis and Postgres",
            ],
            correctIndex: 0,
            explain:
              "The arithmetic you do under pressure is converting a daily total into a rate, a row size into annual storage, and a failure tolerance into a cluster size. Product specifics can be reasoned about aloud; the arithmetic cannot be stalled on.",
          },
          {
            prompt: "What does recording one practice session most reliably reveal?",
            options: [
              "Silence during the hard part, and assumptions quietly contradicted",
              "Whether the final architecture matches a published reference design",
              "That the material needs more revision before the format is worth it",
              "How much faster the answer could be delivered with less hedging",
            ],
            correctIndex: 0,
            explain:
              "The recurring findings are long gaps where the thinking went silent, an assumption stated and then broken, and no time left for failure modes. All three are invisible from the inside and cheap to fix once seen.",
          },
        ],
      },
    ],
  },
];
