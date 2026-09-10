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
        sources: [
          {
            label: "Jeff Dean, Latency numbers every programmer should know",
            url: "https://colin-scott.github.io/personal_website/research/interactive_latency.html",
            supports: "The latency ladder the estimation step depends on, from a memory reference in tens of nanoseconds to a cross-continental round trip in over a hundred milliseconds.",
          },
        ],
        title: "A structure for the 45 minutes",
        level: "beginner",
        body: [
          "Spend the first five minutes on requirements, and be specific rather than polite about it. What must it do, for how many people, what is the read to write ratio, what latency is acceptable, what may be stale and what may not, what is explicitly out of scope. Write the numbers on the board, because they are what every later decision will be justified against.",
          "Then estimate out loud for about five minutes: requests per second, storage per year, bandwidth. Orders of magnitude are the goal. A design for twelve requests a second and one for twelve thousand are different systems, and getting that wrong invalidates everything after it, whereas being twenty per cent out costs nothing.",
          "The high-level design should be five or six boxes and no more. Client, edge, service, data store, queue, and whatever this particular problem genuinely needs. Draw the request path first and say what happens at each hop, because a diagram nobody has walked through is a picture rather than a design.",
          "Then depth, which is where most of the assessment happens. Pick the two or three parts that are genuinely hard for this problem, the fan-out, the hot key, the ordering, the consistency boundary, and go deep on those rather than touring everything evenly. If the interviewer steers you somewhere else, go there: they are telling you what they want to assess.",
          "Leave five minutes for bottlenecks and for ten times the load. Say what breaks first and why, what you would measure to see it coming, and what the next change would be. That closing minute or two is where a good candidate becomes an obviously experienced one, because it demonstrates having watched a system get bigger rather than having designed one on paper.",
          "Throughout: think aloud, write down assumptions as you make them, and revisit requirements openly if the design has drifted from them. The interviewer cannot score reasoning they cannot hear, and silence during the hard part is indistinguishable from being stuck.",
        ],
        why: "Candidates who start drawing boxes immediately fail on scope, not knowledge. Establishing constraints first is what makes every later decision defensible instead of arbitrary.",
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
        inPractice:
          "Every published system design rubric weights requirements and tradeoffs above component knowledge, which is why the five minutes spent on constraints is not preamble: it is the part the rest of the answer is scored against.",
        check: {
          prompt: "What is the most common way strong engineers fail a system design interview?",
          options: [
            "Going too deep on one component and running out of time for the rest",
            "Designing before clarifying scale, so no later choice can be justified",
            "Naming technologies without ever saying what problem each one solves",
            "Failing to draw the data model, which the interviewer is waiting for",
          ],
          correctIndex: 1,
          explain: "Without constraints, every choice is arbitrary. The requirements phase is what lets you say why, which is the whole assessment.",
        },
        checks: [
          {
            prompt: "The interviewer keeps steering you toward one component. What does that mean?",
            options: [
              "They are telling you where the assessment is, so go there",
              "They believe that part of your design is wrong and want it corrected",
              "They are checking whether you can be redirected from your plan",
              "They have run out of questions in the areas you have covered",
            ],
            correctIndex: 0,
            explain:
              "Interviewers steer toward what they need to see to fill in the rubric. Continuing with your own plan means being scored on material they were not asking about.",
          },
          {
            prompt: "Why write the requirement numbers on the board rather than keeping them in your head?",
            options: [
              "Every later decision is justified against them, by both of you",
              "It demonstrates familiarity with the interview's expected structure",
              "It leaves a record if the interviewer changes the constraints mid-way",
              "It slows the pace, which prevents rushing into the design too early",
            ],
            correctIndex: 0,
            explain:
              "They are the shared reference for why any choice is reasonable, and they let the interviewer follow the reasoning rather than reconstruct it. Unwritten constraints get quietly forgotten by both parties.",
          },
          {
            prompt: "What most distinguishes the closing minutes of a strong answer?",
            options: [
              "Naming what breaks first at ten times the load, and what to measure",
              "Summarising the design from end to end to show it is coherent",
              "Listing the technologies chosen and why each was appropriate",
              "Asking the interviewer what they would have designed differently",
            ],
            correctIndex: 0,
            explain:
              "It demonstrates having watched a system grow rather than having designed one on paper, which is exactly the experience the rubric is trying to detect in the time available.",
          },
        ],
      },
      {
        id: "estimation",
        sources: [
          {
            label: "Jeff Dean, Latency numbers every programmer should know",
            url: "https://colin-scott.github.io/personal_website/research/interactive_latency.html",
            supports: "The specific figures quoted here: memory access in tens of nanoseconds, an SSD read in tens of microseconds, a data centre round trip around half a millisecond, and a cross-continental round trip well over a hundred milliseconds.",
          },
        ],
        title: "Back-of-envelope estimation",
        level: "intermediate",
        body: [
          "Estimation is arithmetic done out loud, and the numbers to memorise are few. A day is 86,400 seconds, near enough 100,000. So a million events a day is about 12 a second, and a billion is about 12,000 a second. Peak is commonly two to three times average, and traffic is never spread evenly across the day.",
          "Storage follows the same shape. A thousand bytes per record at a million records a day is a gigabyte a day, roughly a third of a terabyte a year. A million users with a kilobyte of profile each is a gigabyte in total, which is a laptop rather than a cluster and worth saying so plainly when someone proposes sharding it.",
          "A few latency numbers anchor everything else and are worth knowing to an order of magnitude: memory access in tens of nanoseconds, an SSD read in tens of microseconds, a data centre round trip around half a millisecond, and a cross-continental round trip well over a hundred milliseconds. Those are the ratios behind almost every caching and placement decision you will ever justify.",
          "Round aggressively and say that you are. Use 100,000 seconds for a day, treat a kilobyte as a thousand bytes, call a month thirty days. Nobody is checking your arithmetic, and precision is the enemy of finishing the calculation in the ninety seconds it deserves.",
          "The point is not accuracy but the class of system. Twelve requests a second is one server and no discussion. Twelve thousand is a fleet, a cache and a real conversation about the data layer. Being twenty per cent out changes nothing; being out by a factor of a thousand invalidates every design decision that follows, which is the failure the exercise exists to prevent. Sanity-check the answer against something you know. If your estimate implies more storage than a large public dataset, or more traffic than a well-known service, one of the inputs is wrong. That instinct, checking a result against the world rather than against the sum, is what people mean by engineering judgement in this context.",
        ],
        why: "The point is not precision, it is knowing whether you are designing for 10 requests per second or 100,000, because those are entirely different systems. Being off by 20 percent is fine; being off by a factor of a thousand is the failure.",
        inPractice:
          "Jeff Dean's latency numbers every programmer should know is the canonical list, and the ratios in it, memory in nanoseconds against a cross-continental round trip in a hundred milliseconds, are what most caching and placement arguments reduce to.",
        diagram: {
          caption: "Seven orders of magnitude, and every caching argument sits inside them",
          columns: [
            [{ id: "mem", label: "Memory", sub: "tens of nanoseconds", kind: "data" }],
            [{ id: "ssd", label: "SSD read", sub: "tens of microseconds", kind: "data" }],
            [{ id: "dc", label: "Same data centre", sub: "half a millisecond", kind: "edge" }],
            [{ id: "cross", label: "Cross continent", sub: "over 100 milliseconds", kind: "external" }],
          ],
          edges: [
            { from: "mem", to: "ssd", label: "about 1,000x" },
            { from: "ssd", to: "dc", label: "about 20x" },
            { from: "dc", to: "cross", label: "about 200x" },
          ],
        },
        check: {
          prompt: "One million requests a day is roughly what average rate?",
          options: ["1,000 per second", "12 per second", "120 per second", "1 per second"],
          correctIndex: 1,
          explain: "A day is about 100,000 seconds, so a million a day is around 12 per second average, perhaps 30 at peak. That is a small system.",
        },
        checks: [
          {
            prompt: "A million users each with a kilobyte of profile data. How much storage?",
            options: [
              "About a gigabyte in total, which fits comfortably on one machine",
              "About a terabyte, which needs a managed database with replicas",
              "About a hundred gigabytes, once indexes and overhead are included",
              "About ten gigabytes, assuming the data compresses reasonably well",
            ],
            correctIndex: 0,
            explain:
              "A million times a kilobyte is a gigabyte. Saying that plainly is often the most useful contribution available when someone proposes sharding it.",
          },
          {
            prompt: "Which latency ratio anchors most caching decisions?",
            options: [
              "Memory in nanoseconds against a cross-continent trip in a hundred milliseconds",
              "SSD reads against spinning disk reads, which differ by about tenfold",
              "CPU cycles against memory access, which differ by about a hundredfold",
              "Same-zone against cross-zone network calls, which differ by a millisecond",
            ],
            correctIndex: 0,
            explain:
              "That is roughly seven orders of magnitude between the fastest and slowest thing a request can do. Every argument about caching and placement is an argument about which end of that range you are paying.",
          },
          {
            prompt: "How should an estimate be sanity-checked?",
            options: [
              "Against something known: a public dataset size or a familiar service",
              "By repeating the calculation with more precise intermediate values",
              "By comparing it with the interviewer's expected answer if offered",
              "By computing an upper and lower bound and taking the midpoint",
            ],
            correctIndex: 0,
            explain:
              "Checking a result against the world catches an input that is wrong by a factor of a thousand, which redoing the sum more carefully never will.",
          },
        ],
      },
      {
        id: "tradeoffs",
        title: "Talking about tradeoffs",
        level: "advanced",
        body: [
          "Every design decision costs something, and naming the cost unprompted is the strongest signal available in this format, because it is the thing that distinguishes having operated a system from having read about one. Interviewers are not testing whether you can name Redis; they are testing whether you know when it is the wrong answer.",
          "The shape of a strong statement is decision, cost, and the condition that would change it. I would cache this with a sixty second expiry is a decision. Accepting up to a minute of staleness, because prices update hourly, is the cost. And if the prices became real-time I would drop the cache and read through is the condition. Three clauses, and the third is the one almost nobody says.",
          "Volunteer the failure mode as well. What happens under partition, on a hot key, when the cache is cold after a restart, when the third party is down. Saying it yourself is worth far more than being asked, because being asked means the interviewer noticed the gap before you did, and that difference is exactly what the rubric is trying to detect.",
          "Quantify wherever a number is available, even roughly. Adds a network hop, so maybe two milliseconds on the read path. Doubles our write volume. Saves an engineer a week of operating it. Numbers turn a preference into an argument, and an argument can be examined, which is the conversation you want to be having.",
          "Say what you would not do and why, because a design defined only by inclusions looks like a list of technologies. I would not shard this yet, because the whole dataset fits in memory and sharding is the one decision that is genuinely hard to reverse. That single sentence demonstrates more judgement than three additional components.",
          "Finally, be willing to change your mind when the interviewer pushes, and say what changed it. Defending a position past the point of evidence is a stronger negative signal than the original choice, and updating cleanly in front of someone is the behaviour they are hoping to see in a design review next quarter.",
        ],
        why: "Interviewers are testing judgement, not recall. Anyone can name Redis; the differentiator is knowing when it is wrong and saying so unprompted.",
        inPractice:
          "Amazon's writing culture, where a proposal is a document listing what was considered and rejected, is the same discipline in another format: a decision without its alternatives and its costs is not yet a decision.",
        check: {
          prompt: "Which answer signals seniority?",
          options: [
            "Kafka handles millions of events a second, so throughput will not be our bottleneck",
            "A queue decouples the write path, at the cost of the user seeing pending until it drains",
            "We would cache reads at the edge, which takes a large bite out of p99 latency",
            "Microservices let each team deploy on its own schedule without coordinating releases",
          ],
          correctIndex: 1,
          explain:
            "All four are true. Only one is a decision. The others state a benefit and stop there, which leaves the interviewer to supply the cost, and they will. Naming it yourself, in terms of what the user sees, is the difference the rubric is measuring.",
        },
        checks: [
          {
            prompt: "Which clause do candidates most often leave out of a design statement?",
            options: [
              "The condition that would make them choose differently",
              "The name of the technology they would use for it",
              "The benefit the decision brings to the system overall",
              "The cost in latency added to the request path",
            ],
            correctIndex: 0,
            explain:
              "Decision and benefit come easily, cost sometimes. What changes my mind is rarely said, and it is the clause that shows the choice was reasoned rather than recalled.",
          },
          {
            prompt: "What does saying what you would not do demonstrate?",
            options: [
              "Judgement, since a design defined only by inclusions is a technology list",
              "Caution, which reassures the interviewer about production readiness",
              "Breadth, since it shows awareness of alternatives you did not pick",
              "Efficiency, since it keeps the design small enough to explain fully",
            ],
            correctIndex: 0,
            explain:
              "Declining to shard because the dataset fits in memory, and because sharding is hard to reverse, shows more than adding three components would. It is a decision with a reason attached.",
          },
          {
            prompt: "The interviewer pushes back on a choice and you now think they are right. What is the strongest response?",
            options: [
              "Change position and say specifically what changed your mind",
              "Defend the original choice, since consistency signals conviction",
              "Offer both options and let the interviewer choose between them",
              "Concede the point briefly and move on to the next component",
            ],
            correctIndex: 0,
            explain:
              "Updating cleanly in front of someone is the behaviour they are hoping to see in a design review. Defending past the evidence is a stronger negative signal than the original choice ever was.",
          },
        ],
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
        sources: [
          {
            label: "Will Larson, Staff Engineer",
            url: "https://staffeng.com/guides/staff-archetypes/",
            supports: "The four archetypes named here, tech lead, architect, solver and right hand, and the observation that they are different jobs sharing a title.",
          },
        ],
        title: "Senior versus staff",
        level: "advanced",
        body: [
          "A senior engineer owns the delivery of a complex system end to end. They design it, build it, handle the failure modes, and are trusted to do so without supervision. The scope is a system and a team, and the assessment is whether the work lands reliably and whether other people's work gets better for being near it. A staff engineer works across teams, on problems that are ambiguous before they are hard. A large part of the job is deciding what should be built at all, and then getting enough agreement that it happens. The output is often a document, a prototype that settles an argument, or a decision that saves two teams from solving the same problem twice.",
          "The clearest way to see the difference is the shape of the leverage. A senior engineer multiplies their own effectiveness. A staff engineer multiplies other people's, which is why a staff promotion is rarely earned by writing more code and why the most cited staff contributions are ones where nothing was built.",
          "There are recognisable archetypes and it helps to know which one you are. The tech lead who runs a team's technical direction. The architect who holds a domain across teams. The solver who is deployed onto whatever is currently hardest. The right hand who works on whatever the organisation most needs. They are different jobs sharing a title, and interviewing well means being clear about which you are describing.",
          "In interviews the visible difference is scope. Seniors discuss the system; staff discuss the system in the context of the organisation that has to run it, the teams who will own its parts, the migration path, and what will still be true in two years. Answers that never leave the diagram read as senior regardless of the years behind them.",
          "The uncomfortable part is that staff work is often unglamorous: writing the document that stops a project, sitting in the meeting that aligns two teams, deleting a service. If your best examples are all projects you personally built, that is a senior portfolio, and the gap is worth knowing about before someone else names it.",
        ],
        why: "Promotion to staff is rarely earned by writing more code. It comes from multiplying other people's output and choosing the right problem, which is why the interview probes influence and judgement more than depth alone.",
        inPractice:
          "Will Larson's Staff Engineer describes the four archetypes, tech lead, architect, solver and right hand, and the observation that they are different jobs sharing a title is the single most useful thing to know before interviewing for one.",
        diagram: {
          caption: "The difference is the shape of the leverage",
          columns: [
            [{ id: "eng", label: "Engineer", sub: "own output", kind: "service" }],
            [{ id: "sen", label: "Senior", sub: "a system, end to end", kind: "service" }],
            [
              { id: "staff", label: "Staff", sub: "other people's output", kind: "service" },
              { id: "trap", label: "Bigger projects", sub: "still senior evidence", kind: "external", alternative: true },
            ],
            [{ id: "out", label: "Often nothing built", sub: "a decision, a document", kind: "data" }],
          ],
          edges: [
            { from: "eng", to: "sen", label: "scope grows" },
            { from: "sen", to: "staff", label: "leverage changes shape" },
            { from: "sen", to: "trap", label: "scale alone is not the step" },
            { from: "staff", to: "out", label: "the cited contribution" },
          ],
        },
        check: {
          prompt: "Which is the clearest staff-level signal?",
          options: [
            "Delivering the hardest project on the roadmap ahead of its schedule",
            "Being the person every team asks before they make a design decision",
            "Spotting that two teams solve the same problem twice, and aligning them",
            "Mentoring several engineers to the point where they are promoted",
          ],
          correctIndex: 2,
          explain: "Staff work is leverage: preventing duplicated effort across teams is worth more than any single implementation.",
        },
        checks: [
          {
            prompt: "What is the shape of the difference between senior and staff?",
            options: [
              "Senior multiplies their own output; staff multiplies other people's",
              "Senior owns implementation; staff owns architecture decisions",
              "Senior is measured on delivery; staff is measured on mentorship",
              "Senior works within a team; staff reports outside the engineering org",
            ],
            correctIndex: 0,
            explain:
              "Leverage is the distinction that survives across companies. It is also why the most cited staff contributions are often ones where nothing was built.",
          },
          {
            prompt: "A candidate's best examples are all systems they personally built. What does that read as?",
            options: [
              "A senior portfolio, however large the systems happen to be",
              "A staff portfolio, since scope is what the level measures",
              "An architect profile, which is a separate track from staff",
              "Insufficient evidence either way without knowing the team sizes",
            ],
            correctIndex: 0,
            explain:
              "Scope of systems is not scope of influence. Without examples of decisions that changed what other teams did, the evidence describes a strong senior engineer.",
          },
          {
            prompt: "Why does it help to know which staff archetype you are?",
            options: [
              "They are different jobs sharing a title, and answers should match one",
              "Companies hire for exactly one archetype and reject the others",
              "The archetypes map to different levels within the staff band",
              "Interviewers ask candidates to name theirs before the discussion",
            ],
            correctIndex: 0,
            explain:
              "Tech lead, architect, solver and right hand look quite different day to day. Describing the work coherently as one of them is far stronger than a general claim to breadth.",
          },
        ],
      },
      {
        id: "behavioural",
        title: "Behavioural answers with substance",
        level: "intermediate",
        body: [
          "Structure the answer, because an unstructured one is scored on whatever the interviewer manages to extract. Situation, what you specifically did, what happened, and what you took from it. The common weakness is the collective we: it hides which decisions were yours, and an interviewer who cannot tell what you did cannot credit you for it.",
          "Prepare stories rather than answers. Two or three real ones, each with numbers, cover most questions asked at senior level, because the same project can answer conflict, ownership, failure and influence depending on which part you tell. Preparing per question produces a memorised list; preparing per story produces material you can actually think with.",
          "Numbers matter more than they should. Reduced deploy time from forty minutes to six lands differently from improved our deployment process, not because the interviewer is checking, but because specificity is evidence of having been there. Vagueness is what an answer sounds like when it is being reconstructed rather than recalled.",
          "The failure story is the one that separates candidates. Everybody has one; the ones who describe it precisely, own their part without over-apologising, and name what changed afterwards are demonstrating exactly the self-assessment that senior work requires. Certainty about a past decision reads as never having examined it.",
          "Conflict questions are asking about how you handle being wrong and how you handle being right when someone disagrees. The strong version names the other person's reasoning fairly, says what evidence would have changed your mind, and describes what you did once the decision went one way or the other. Winning is not the point; the point is whether the team could keep working afterwards.",
          "Finally, prepare questions of your own and make them real. What does the on-call rota look like, what happened in the last incident, how does a decision like this one get made here. Those answers are the ones you will live with, and asking them signals someone evaluating the job rather than hoping to be chosen.",
        ],
        why: "The failure story is the one that separates candidates. Everyone has one; the ones who can describe it precisely, without deflecting, are demonstrating exactly the self-assessment senior work requires.",
        inPractice:
          "Amazon's behavioural loop is explicitly scored against its leadership principles, which is why answers there work best as specific stories with numbers rather than as general descriptions of how you like to work.",
        check: {
          prompt: "Why do interviewers ask about a project that went badly?",
          options: [
            "To find out whether you take responsibility rather than assigning it",
            "To hear how you handle disagreement with people who outrank you",
            "To check that your stories are real rather than rehearsed from a list",
            "To see whether you assess your own decisions honestly and specifically",
          ],
          correctIndex: 3,
          explain: "The content matters less than the quality of reflection. Deflection signals someone who will repeat the mistake.",
        },
        checks: [
          {
            prompt: "Why prepare stories rather than answers to specific questions?",
            options: [
              "One project answers several questions depending on which part you tell",
              "Interviewers ask the same questions, so stories can be reused verbatim",
              "Stories are easier to remember under pressure than structured answers",
              "It avoids the risk of contradicting yourself between two answers",
            ],
            correctIndex: 0,
            explain:
              "Conflict, ownership, failure and influence are often the same project from different angles. Preparing per question produces a list you recite; preparing per story gives you material you can think with.",
          },
          {
            prompt: "What is a conflict question actually assessing?",
            options: [
              "Whether the team could keep working together afterwards",
              "Whether you were right about the technical decision in question",
              "Whether you escalated appropriately to a manager or a lead",
              "Whether you can describe a disagreement without naming anyone",
            ],
            correctIndex: 0,
            explain:
              "Being right is the least interesting part. Naming the other person's reasoning fairly and saying what would have changed your mind is what indicates someone worth disagreeing with.",
          },
          {
            prompt: "Why do specific numbers strengthen a behavioural answer?",
            options: [
              "Specificity is evidence of having been there rather than reconstructing",
              "Interviewers verify the figures against the company's public metrics",
              "Numbers make an answer shorter, leaving time for further questions",
              "Quantified results are required by most structured interview rubrics",
            ],
            correctIndex: 0,
            explain:
              "Forty minutes to six sounds different from improved our process, and the difference is not rhetorical. Vagueness is what an answer sounds like when the details were never there.",
          },
        ],
      },
      {
        id: "coding-round",
        title: "The coding round",
        level: "intermediate",
        body: [
          "Restate the problem in your own words and confirm an example before writing anything. It costs a minute and it catches the misunderstanding that would otherwise cost twenty, and clarifying an ambiguous constraint is itself part of what is being scored rather than a delay before the real work.",
          "Say the brute force and its complexity, then improve on it. A working slow solution beats an unfinished clever one every time, and stating the naive version first demonstrates that you can find an optimisation rather than that you have seen this problem before. If you already know the optimal answer, show the progression anyway; the reasoning is the thing being sampled.",
          "Narrate while you work. Silent brilliance scores worse than narrated competence, because the interview is a proxy for what working with you is like, and a colleague who thinks silently through hard problems is genuinely harder to work with. Say what you are trying, and say when something is not working and what you will try instead.",
          "Test unprompted, with cases you choose: empty input, one element, duplicates, the maximum size, a value at a boundary. Walking through your own code with a concrete input catches the off-by-one before the interviewer does, and doing it without being asked is one of the strongest signals available in the format.",
          "Write code you would accept in review. Real names, small functions, no cleverness that needs explaining. Under time pressure people produce single-letter variables and one dense line, and it reads as exactly what it is, which is a habit the reviewer would rather not inherit. If you get stuck, say so and say what you are stuck on. Interviewers can offer a hint to someone who has articulated the obstacle and cannot help someone staring silently at a screen. Being stuck is normal; being stuck without communicating it is the part that scores badly.",
        ],
        why: "The interview is a proxy for working with you. Silent brilliance scores worse than narrated competence, because collaboration is the thing actually being sampled.",
        inPractice:
          "Google's published interviewing guidance asks its interviewers to assess problem-solving out loud rather than the final answer, which is the formal version of the advice to narrate: silence removes the evidence they are told to score.",
        check: {
          prompt: "You see the optimal solution immediately. What is the best move?",
          options: [
            "State the brute force and its cost, then the optimisation and why it works",
            "Write it immediately, then spend the saved time on tests and edge cases",
            "Explain the optimal approach fully before writing any code at all",
            "Ask whether they would rather see the optimal or the readable version",
          ],
          correctIndex: 0,
          explain: "The reasoning is what is being assessed. Showing the progression demonstrates you can find such a solution, not just recall one.",
        },
        checks: [
          {
            prompt: "You are stuck halfway through. What is the best move?",
            options: [
              "Say what you are stuck on, so a hint becomes possible",
              "Restart with the brute force approach and build up again",
              "Work quietly until you find the next step yourself",
              "Ask whether the problem has additional constraints you missed",
            ],
            correctIndex: 0,
            explain:
              "Being stuck is normal and expected. An interviewer can help someone who has articulated the obstacle, and cannot help someone staring at the screen, which is the part that actually scores badly.",
          },
          {
            prompt: "Why test with your own edge cases before being asked?",
            options: [
              "It catches the off-by-one before the interviewer finds it",
              "It uses time that would otherwise be spent on further questions",
              "It demonstrates familiarity with the testing framework in use",
              "It shows the solution handles the constraints in the problem statement",
            ],
            correctIndex: 0,
            explain:
              "Walking your own code through empty input, one element and a boundary value finds the bug on your terms. Doing it unprompted is among the strongest signals the format offers.",
          },
          {
            prompt: "Why does code style still matter in a timed coding round?",
            options: [
              "The interview samples what reviewing your code would be like",
              "Style is scored separately from correctness in most rubrics",
              "Clean code is faster to debug when a test case fails",
              "Single-letter names make the complexity harder to explain",
            ],
            correctIndex: 0,
            explain:
              "Dense one-liners and single-letter names under pressure read as a habit rather than as haste, and the reviewer is imagining inheriting it.",
          },
        ],
      },
      {
        id: "the-loop",
        diagram: {
          caption: "Each stage is scored against something different, and the debrief decides",
          columns: [
            [{ id: "rec", label: "Recruiter screen", sub: "level, band, availability", kind: "client" }],
            [{ id: "screen", label: "Technical screen", sub: "a filter: pass it cleanly", kind: "service" }],
            [{ id: "coding", label: "Coding", sub: "can you build", kind: "data" },
             { id: "design", label: "System design", sub: "judgement at scale", kind: "data" },
             { id: "behav", label: "Behavioural", sub: "how you work with people", kind: "data" }],
            [{ id: "debrief", label: "Debrief", sub: "people who were not in your rounds", kind: "external" }],
          ],
          edges: [
            { from: "rec", to: "screen", label: "basics agreed" },
            { from: "screen", to: "coding", label: "scored separately" },
            { from: "screen", to: "design", label: "scored separately" },
            { from: "screen", to: "behav", label: "scored separately" },
            { from: "coding", to: "debrief", label: "quotable evidence travels" },
            { from: "design", to: "debrief", label: "impressions do not" },
            { from: "behav", to: "debrief", label: "impressions do not" },
          ],
        },
        title: "What each stage of the loop is for",
        level: "intermediate",
        body: [
          "A hiring loop is not one assessment repeated. Each stage is scored against something different, and knowing which is which changes how to spend the time in it. The recruiter screen checks the basics and the story: level, availability, salary band, and whether your background matches what the role says. Precision here saves everyone a fortnight.",
          "The technical screen is a filter, so the objective is to pass it cleanly rather than to impress. Finish the problem, communicate while you work, and treat it as a lower-variance version of the onsite. Nobody has been hired on a screen and plenty have been eliminated on one.",
          "The onsite rounds are the real assessment and they are usually split deliberately: coding for whether you can build, system design for judgement at scale, behavioural for how you work with people, and often a domain round for the specific thing the team does. They are scored separately by people who then meet, which is why an outstanding design round does not compensate for a coding round nobody could follow.",
          "The debrief is where the decision is actually made, and understanding it explains a lot about what to optimise for. Interviewers write feedback separately, then argue it. Specific evidence travels between people, and impressions do not, so an interviewer who can quote something concrete you said is far more useful to you than one who thought it went well. Give people evidence they can repeat.",
          "The offer conversation is a separate skill from all of it and worth preparing with the same seriousness. Ask about the level and the band before discussing numbers, because the level determines the range and is much harder to change afterwards. And ask the questions that decide whether you would stay: what the on-call rota looks like, what happened in the last incident, how a technical disagreement got resolved recently.",
        ],
        why:
          "Each stage answers a different question, so the same performance is scored differently depending on where it happens. The most useful shift is realising that the debrief is a conversation between people who were not in your other rounds, which makes concrete, quotable evidence worth more than a general good impression.",
        inPractice:
          "Structured interviewing, where every candidate gets the same questions scored against a written rubric, is standard at large technology companies and is well supported by hiring research. It is also why preparing for the format is legitimate rather than gaming it: the format is published and the rubric is the point.",
        check: {
          prompt: "Why does specific evidence matter more than a good general impression?",
          options: [
            "Interviewers must argue your case to people who never met you",
            "Rubrics award points for the specificity of a candidate's examples",
            "Impressions are discarded by most structured hiring processes",
            "Specific claims can be verified with references after the loop",
          ],
          correctIndex: 0,
          explain:
            "The decision happens in a debrief between people who saw different rounds. Something quotable travels; a feeling that it went well does not survive the first sceptical question.",
        },
        checks: [
          {
            prompt: "What is the right objective in a technical screen?",
            options: [
              "Pass cleanly, since nobody is hired on a screen and many are cut",
              "Impress enough to shorten or skip parts of the onsite loop",
              "Explore the problem broadly to show the range of your knowledge",
              "Ask about the team, since the screener is usually a future colleague",
            ],
            correctIndex: 0,
            explain:
              "It is a filter with a different threshold from the onsite. Finishing the problem while communicating clearly is the whole objective, and treating it as an audition adds variance for no gain.",
          },
          {
            prompt: "Why ask about level and band before discussing a number?",
            options: [
              "The level sets the range and is much harder to change later",
              "Bands are confidential, so the number will not be shared first",
              "It signals seniority, which improves the initial offer made",
              "Recruiters cannot negotiate a number without a stated level",
            ],
            correctIndex: 0,
            explain:
              "Negotiating inside the wrong band is a small win with a ceiling. The level decision is made during the debrief, which is why it belongs in the conversation before the number does.",
          },
          {
            prompt: "Which question is most worth asking the interviewers?",
            options: [
              "What happened in the last incident, and how it was handled",
              "How many engineers are on the team and how it is structured",
              "Which technologies the team plans to adopt in the coming year",
              "How performance is reviewed and when promotions are decided",
            ],
            correctIndex: 0,
            explain:
              "It reveals the on-call reality, the blame culture and the engineering maturity in one answer, and it is difficult to give a rehearsed reply to. All three are things you will live with daily.",
        },
        ],
      },
    ],
  },
];
