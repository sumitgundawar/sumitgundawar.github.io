import type { Card } from "./types";

/* Programming, as distinct from system design.
 *
 * The rest of this material assumes you can already write the code and asks how
 * to arrange it. This track is the other half: the concepts every language
 * shares, and then the handful of languages worth knowing properly, each
 * covered through the things that actually catch people rather than through a
 * syntax tour that a reference does better.
 *
 * The topics here are shorter than in the design track on purpose. They are
 * written to be correct and useful now, and to be deepened the same way the
 * case studies were, one card at a time.
 */

export const languages: Card[] = [
  {
    id: "programming-foundations",
    title: "Programming foundations",
    summary: "The concepts every language shares, explained through what they cost rather than what they look like.",
    track: "languages",
    topics: [
      {
        id: "values-and-types",
        title: "Values, types and memory",
        level: "beginner",
        body: [
          "A variable is a name bound to a value, and the single most useful thing to understand early is what the name actually holds. For a small value such as a number, it usually holds the value itself. For anything larger, an object, a list, a string in most languages, it holds a reference to something stored elsewhere, and copying the variable copies the reference rather than the thing.",
          "That distinction explains an entire category of confusing bugs. Passing a list to a function and finding it changed afterwards is not the function misbehaving, it is both names pointing at one list. Languages that avoid this do so by making values immutable, so there is nothing to change, which is why immutability keeps reappearing as a recommendation from people who have debugged the alternative.",
          "Types are the other half. A static type system checks at compile time that the operations you wrote make sense for the values you have; a dynamic one checks at run time, when the operation happens. Neither is universally better and the trade is well understood: static typing catches a class of mistakes before anything runs and costs you ceremony, dynamic typing gets out of the way and moves those failures into production.",
          "Worth knowing regardless of language: integers have limits and floating point numbers are approximations. 0.1 plus 0.2 does not equal 0.3 in any language using IEEE 754 doubles, because neither value is exactly representable in binary. Money belongs in integers of the smallest unit, or in a decimal type, and never in a float, which is a rule with a long trail of financial incidents behind it.",
        ],
        why: "Most early confusion in any language comes from not knowing whether a name holds a value or a reference to one, and most numeric bugs come from treating floating point as though it were mathematics. Both are cheap to learn and expensive to discover.",
        diagram: {
          caption: "A name holds a reference, so two names can hold the same thing",
          columns: [
            [
              { id: "a", label: "a", sub: "name", kind: "client" },
              { id: "b", label: "b = a", sub: "name", kind: "client" },
            ],
            [{ id: "ref", label: "Reference", sub: "copied on assignment", kind: "edge" }],
            [{ id: "obj", label: "One list", sub: "mutated through either name", kind: "data" }],
          ],
          edges: [
            { from: "a", to: "ref" },
            { from: "b", to: "ref", label: "the reference was copied" },
            { from: "ref", to: "obj", label: "the object was not" },
          ],
        },
        check: {
          prompt: "Why does 0.1 + 0.2 === 0.3 evaluate to false in most languages?",
          options: [
            "The comparison runs before the addition has finished being evaluated",
            "Neither 0.1 nor 0.2 is exactly representable in binary floating point",
            "Floating point addition is not associative, so the order matters here",
            "The literals are parsed as decimals and compared as binary values",
          ],
          correctIndex: 1,
          explain:
            "IEEE 754 stores binary fractions, and a tenth is a repeating fraction in binary just as a third is in decimal. The sum lands a fraction away from 0.3, which is why money is stored in integer minor units or a decimal type.",
        },
        checks: [
          {
            prompt: "A list is passed to a function and comes back changed. What happened?",
            options: [
              "Both names refer to the same list, so the function mutated it",
              "The function returned a copy, which replaced the original binding",
              "Lists are passed by value, so the change must have come from elsewhere",
              "The garbage collector merged the two lists as they were identical",
            ],
            correctIndex: 0,
            explain:
              "Assignment and argument passing bind names to objects rather than copying them. That single fact explains most early confusion in any language with references.",
          },
          {
            prompt: "Where should a monetary amount be stored?",
            options: [
              "In an integer of the smallest unit, or a decimal type",
              "In a double, with rounding applied before it is displayed",
              "In a float, since currency values are rarely large enough to drift",
              "In a string, parsed to a number only when arithmetic is needed",
            ],
            correctIndex: 0,
            explain:
              "Binary floating point cannot represent a tenth exactly, so errors accumulate across additions. Pence as integers, or a decimal type that does base ten arithmetic, avoids the class entirely.",
          },
          {
            prompt: "What does a static type system buy that a dynamic one does not?",
            options: [
              "A class of mistake is caught before anything runs at all",
              "Faster execution, since types are known to the runtime",
              "Fewer tests, because the compiler verifies behaviour as well as shape",
              "Safer refactoring, since types cannot change once assigned",
            ],
            correctIndex: 0,
            explain:
              "The trade is ceremony against early detection. It catches shape errors rather than logic errors, which is why it reduces a category of test rather than the need for tests.",
          },
        ],
      },
      {
        id: "control-and-functions",
        title: "Control flow, functions and scope",
        level: "beginner",
        body: [
          "Control flow is the small vocabulary every language shares: do this if that, do this repeatedly, stop early, call something else. What differs is the cost of each. An early return is usually clearer than a nested condition, and a loop that mutates a shared accumulator is usually clearer as a map or a fold, but the version your team reads fastest wins over the version a style guide prefers.",
          "A function is the unit of naming, and naming is most of what makes code readable. The useful test is whether the name says what it does without saying how: send_welcome_email is a name, do_email_stuff_v2 is an apology. A function that needs the word and in its name is usually two functions.",
          "Scope decides which names are visible where, and closures are the part that surprises people. A closure is a function that carries the variables it referenced when it was created, which is what makes callbacks and decorators work, and which is also why a loop that creates functions capturing the loop variable can produce a set of functions that all see the same final value.",
          "Arguments are passed either by value or by reference depending on the language and the type, and the practical consequence is the same as with variables: a function given a mutable structure can change what the caller holds. Making that explicit, by returning a new value instead of modifying the argument, removes a category of bug that is very hard to find by reading.",
        ],
        why: "Functions are how a program is made comprehensible: each one is a promise that the reader does not need to look inside. A function that changes something the caller could not predict has broken that promise, which is why side effects deserve to be named in the signature or avoided.",
        diagram: {
          caption: "A closure captures the variable, not a copy of its value",
          columns: [
            [{ id: "loop", label: "Loop", sub: "i = 0, 1, 2", kind: "client" }],
            [
              { id: "shared", label: "One binding", sub: "shared by all three", kind: "service", alternative: true },
              { id: "per", label: "Binding per iteration", kind: "service" },
            ],
            [
              { id: "same", label: "All three see 3", kind: "data", alternative: true },
              { id: "own", label: "Each sees its own", kind: "data" },
            ],
          ],
          edges: [
            { from: "loop", to: "shared", label: "captured by reference" },
            { from: "loop", to: "per", label: "fresh each time" },
            { from: "shared", to: "same", label: "after the loop ends" },
            { from: "per", to: "own" },
          ],
        },
        check: {
          prompt: "A loop creates three functions that each capture the loop variable, and all three return the same value when called. Why?",
          options: [
            "The functions were optimised into one, since their bodies are identical",
            "They closed over the same variable, which held its final value by then",
            "Closures copy their variables at creation, so all three copied the first",
            "The loop variable was garbage collected before the functions were called",
          ],
          correctIndex: 1,
          explain:
            "A closure captures the variable, not a snapshot of its value. If the loop reuses one binding, every function sees the same one after the loop ends, which is why languages introduced per-iteration bindings.",
        },
        checks: [
          {
            prompt: "What is the practical test for a well-named function?",
            options: [
              "It says what the function does without saying how it does it",
              "It is short enough to read without wrapping in an editor",
              "It names the module it belongs to as well as the operation",
              "It matches the name of the file that the function lives in",
            ],
            correctIndex: 0,
            explain:
              "A name is a promise about behaviour, so a reader can skip the body. A name containing the word and usually describes two promises, which is two functions.",
          },
          {
            prompt: "Why prefer an early return to a deeply nested condition?",
            options: [
              "Each case is handled and dismissed, so less state is carried down",
              "Returns are faster, since the remaining branches are never evaluated",
              "Nested conditions cannot be covered fully by a test suite",
              "Compilers optimise early returns into jump tables automatically",
            ],
            correctIndex: 0,
            explain:
              "The reader stops tracking a branch once it has returned. Nesting asks them to hold every enclosing condition in mind until the closing brace.",
          },
          {
            prompt: "A function modifies a structure the caller passed in. What is the cost?",
            options: [
              "The caller's state changes invisibly, which reading cannot reveal",
              "The function becomes slower, since the change must be propagated",
              "The structure can no longer be used as a key or compared safely",
              "Concurrency is lost, because the caller must wait for the change",
            ],
            correctIndex: 0,
            explain:
              "Nothing at the call site says the argument will be different afterwards. Returning a new value keeps the effect in the signature, where a reader can see it.",
          },
        ],
      },
      {
        id: "data-structures-choice",
        title: "Choosing a data structure",
        level: "intermediate",
        body: [
          "Nearly all everyday code is served by four structures, and knowing their costs by heart removes most performance questions before they arise. An array or list gives you position: constant-time access by index, linear-time search. A hash map gives you lookup by key in roughly constant time, at the cost of memory and no ordering. A set is a hash map without values, for membership and deduplication. A queue or stack gives you an order of processing.",
          "The most common avoidable mistake in real code is searching a list inside a loop. Checking whether each of ten thousand items appears in a list of ten thousand is a hundred million comparisons; the same check against a set is ten thousand lookups. It is the same program with one line changed, and it is the difference between two minutes and a few milliseconds.",
          "Ordering is the next question. A sorted structure, a balanced tree or a sorted list with binary search, gives you range queries and nearest-neighbour lookups that a hash map cannot answer at all. If your access pattern includes everything between these two values, that is the tell.",
          "Then there are the specialised few worth recognising when you meet them: a heap for repeatedly taking the smallest item, a trie for prefix search, a bloom filter for a cheap definitely-not-present answer, a ring buffer for a fixed-size stream of recent items. You will rarely implement one; recognising which problem each solves is what stops you writing a slow version by hand.",
        ],
        why: "Choosing the structure is choosing the complexity, and it is a decision made once at the start rather than tuned later. Most code that needs optimising does not need a faster language, it needs a hash lookup where it currently has a scan.",
        diagram: {
          caption: "The access pattern chooses the structure",
          columns: [
            [{ id: "q", label: "What are you asking?", kind: "client" }],
            [
              { id: "byidx", label: "By position", kind: "service" },
              { id: "bykey", label: "By key", kind: "service" },
              { id: "range", label: "Everything between", kind: "service" },
              { id: "least", label: "The smallest, repeatedly", kind: "service" },
            ],
            [
              { id: "arr", label: "Array", sub: "O(1) index, O(n) search", kind: "data" },
              { id: "map", label: "Hash map", sub: "O(1) lookup, no order", kind: "data" },
              { id: "tree", label: "Sorted tree", sub: "ordered, O(log n)", kind: "data" },
              { id: "heap", label: "Heap", sub: "cheap extreme", kind: "data" },
            ],
          ],
          edges: [
            { from: "q", to: "byidx" },
            { from: "q", to: "bykey" },
            { from: "q", to: "range" },
            { from: "q", to: "least" },
            { from: "byidx", to: "arr" },
            { from: "bykey", to: "map" },
            { from: "range", to: "tree" },
            { from: "least", to: "heap" },
          ],
        },
        check: {
          prompt: "Checking membership for each of 10,000 items against a list of 10,000 is slow. What changes it most?",
          options: [
            "Sorting the list first, so each check can stop halfway on average",
            "Converting the list to a set, turning each scan into a hash lookup",
            "Processing the checks in parallel across the available CPU cores",
            "Caching results, since many of the items being checked will repeat",
          ],
          correctIndex: 1,
          explain:
            "The scan is the problem: 10,000 checks against 10,000 items is 100 million comparisons. A set makes each check roughly constant time, which is the same program with one line changed.",
        },
        checks: [
          {
            prompt: "Which access pattern rules a hash map out?",
            options: [
              "Everything between two values, which needs an ordered structure",
              "Membership testing, which requires values rather than keys",
              "Lookup by a key that is computed rather than stored",
              "Iteration over every entry, which a hash map cannot support",
            ],
            correctIndex: 0,
            explain:
              "A hash scatters keys deliberately, so there is no notion of nearby. Range and nearest-neighbour queries need a sorted structure or an index built for them.",
          },
          {
            prompt: "What is a heap the right structure for?",
            options: [
              "Repeatedly taking the smallest or largest item from a changing set",
              "Looking up an arbitrary element by its identifier quickly",
              "Keeping a full ordering so any element can be found by rank",
              "Storing items with a fixed capacity and evicting the oldest",
            ],
            correctIndex: 0,
            explain:
              "It keeps the extreme cheap to reach and everything else only loosely ordered, which is exactly the trade a priority queue, a scheduler or a top-N calculation wants.",
          },
          {
            prompt: "Why is choosing the structure usually a bigger decision than optimising the code?",
            options: [
              "It sets the complexity, which no amount of tuning can change",
              "Structures are hard to replace once data has been persisted",
              "Most languages cannot convert between structures efficiently",
              "The compiler optimises around the structure, not around the code",
            ],
            correctIndex: 0,
            explain:
              "A quadratic algorithm written carefully is still quadratic. Most code that needs optimising needs a different structure rather than a faster language.",
          },
        ],
      },
      {
        id: "recursion-and-iteration",
        title: "Recursion, iteration and state",
        level: "intermediate",
        body: [
          "Recursion expresses a problem in terms of a smaller version of itself, and it is the natural shape for anything tree-like: directory trees, nested JSON, parsers, divide and conquer sorts. Iteration expresses the same thing as a loop with explicit state. Every recursion can be rewritten as iteration with a stack, and the choice is about which one reads more clearly for the shape of the data.",
          "The practical constraint is the call stack. Each recursive call consumes a frame, and stacks are finite: a few thousand frames in Python by default, more in most compiled languages but never unlimited. Recursing over a list of a million elements will exhaust it. Some languages optimise tail calls, where the recursive call is the last thing the function does, into a loop; many, including Python and most JavaScript engines in practice, do not.",
          "Memoisation is where recursion becomes practical for overlapping subproblems. The naive recursive Fibonacci recomputes the same values exponentially often, roughly 2 to the power of n calls; caching each result makes it linear. That single change is also the entire idea behind dynamic programming, which sounds like a separate topic and is mostly this observation applied deliberately.",
          "The state question sits underneath both. A loop that mutates variables is easy to write and easy to get subtly wrong when it grows; a recursive or functional version passes state explicitly, which is more verbose and harder to break. Neither is a rule, but when a loop body reaches thirty lines and four mutable variables, the bug you cannot find is usually one of them being updated in the wrong order.",
        ],
        why: "Recursion is the right tool for recursive data and the wrong tool for long flat sequences, and the stack is what decides which is which. Memoisation turns the classic exponential recursion into a linear one, which is the whole trick behind most dynamic programming problems.",
        diagram: {
          caption: "The same subproblem, solved once or solved exponentially often",
          columns: [
            [{ id: "call", label: "fib(n)", kind: "client" }],
            [
              { id: "naive", label: "Naive recursion", sub: "recomputes everything", kind: "service", alternative: true },
              { id: "memo", label: "Memoised", sub: "each result cached", kind: "service" },
            ],
            [
              { id: "exp", label: "About 2^n calls", kind: "external", alternative: true },
              { id: "lin", label: "About n calls", kind: "data" },
            ],
            [{ id: "stack", label: "Stack depth", sub: "finite either way", kind: "data" }],
          ],
          edges: [
            { from: "call", to: "naive" },
            { from: "call", to: "memo" },
            { from: "naive", to: "exp" },
            { from: "memo", to: "lin" },
            { from: "lin", to: "stack", label: "still bounded by frames" },
          ],
        },
        check: {
          prompt: "A naive recursive Fibonacci is exponentially slow. What makes it linear?",
          options: [
            "Rewriting it as a loop, which removes the per-call stack frame overhead",
            "Caching each computed value, so each subproblem is solved exactly once",
            "Using integers rather than floats, which removes the conversion per call",
            "Increasing the stack size, so the recursion no longer has to unwind early",
          ],
          correctIndex: 1,
          explain:
            "The cost is repeated work: the same subproblems are recomputed exponentially often. Memoising each result makes each one solved once, which is the core idea of dynamic programming.",
        },
        checks: [
          {
            prompt: "Why does recursing over a list of a million elements fail?",
            options: [
              "Each call consumes a stack frame, and the stack is finite",
              "The interpreter cannot hold a million references at once",
              "Recursion allocates a copy of the list on every call",
              "Tail calls are optimised away, losing the intermediate results",
            ],
            correctIndex: 0,
            explain:
              "Recursion is the natural shape for tree-like data and the wrong shape for long flat sequences. A few thousand frames is the practical limit in many runtimes.",
          },
          {
            prompt: "What is dynamic programming, stated plainly?",
            options: [
              "Recursion over overlapping subproblems, with each result cached",
              "An iterative rewrite of any algorithm expressed recursively",
              "A technique for reducing the memory a recursion consumes",
              "A way to parallelise recursive calls across available cores",
            ],
            correctIndex: 0,
            explain:
              "The exponential cost comes from recomputing the same subproblems. Caching each result makes it linear, and everything else in the topic is bookkeeping around that observation.",
          },
          {
            prompt: "When is a loop with mutable state the harder version to get right?",
            options: [
              "When the body grows long and several variables update in an order",
              "When the sequence is long enough that the loop dominates runtime",
              "When the loop is nested inside another loop over the same data",
              "When the accumulator is a structure rather than a scalar value",
            ],
            correctIndex: 0,
            explain:
              "The bug is usually one variable updated in the wrong order relative to another, and it is invisible in review. Passing state explicitly is more verbose and harder to break.",
          },
        ],
      },
      {
        id: "errors-and-failure",
        title: "Errors, exceptions and failure",
        level: "intermediate",
        body: [
          "There are two families of error handling and it is worth knowing which one you are in. Exceptions are out-of-band: a failure unwinds the stack until something catches it, so the happy path stays uncluttered and the failure path is invisible in the signature. Returned errors are in-band: a function returns either a value or an error and the caller must deal with both, which makes failure visible and the code longer.",
          "Both fail in the same way, which is silently swallowing the problem. An empty catch block, or an error return assigned and ignored, converts a loud failure into a wrong answer produced quietly. If there is genuinely nothing to do about an error, the minimum is to record it with enough context to identify it later.",
          "The distinction that matters more than the syntax is between expected and unexpected failures. A file not existing, a validation rule failing, a payment being declined: these are outcomes, and modelling them as return values rather than exceptions usually produces clearer code. A null dereference or an out-of-range index is a bug, and it should be loud, uncaught and fixed rather than handled.",
          "Finally, errors should carry context that is useful to whoever reads the log at three in the morning. Failed to save is not an error message; failed to save order 12345 for customer 678, database timeout after 5s is. Wrapping an error as it moves up the stack, adding what each layer knows, is the cheapest debugging investment available.",
        ],
        why: "The failure path is code, and it is the code least likely to be tested and most likely to run during an incident. Deciding deliberately which failures are outcomes and which are bugs is what keeps the first kind handled and the second kind visible.",
        diagram: {
          caption: "Expected outcomes belong in the signature; bugs belong loud",
          columns: [
            [{ id: "call", label: "An operation", kind: "client" }],
            [
              { id: "outcome", label: "Expected outcome", sub: "declined, not found", kind: "service" },
              { id: "bug", label: "Bug", sub: "null, out of range", kind: "service" },
            ],
            [
              { id: "ret", label: "Returned value", sub: "caller must handle it", kind: "data" },
              { id: "loud", label: "Uncaught", sub: "fix it, do not handle it", kind: "external" },
              { id: "swallow", label: "Empty catch", sub: "wrong answer, quietly", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "call", to: "outcome" },
            { from: "call", to: "bug" },
            { from: "outcome", to: "ret" },
            { from: "bug", to: "loud" },
            { from: "bug", to: "swallow", label: "the tempting path" },
          ],
        },
        check: {
          prompt: "Which failure is best modelled as a return value rather than an exception?",
          options: [
            "An index that falls outside the bounds of an array being read",
            "A null reference being dereferenced inside a helper function",
            "A payment being declined by the provider for insufficient funds",
            "A configuration file that is missing at application startup",
          ],
          correctIndex: 2,
          explain:
            "A declined payment is an expected outcome that the caller must handle, so putting it in the signature is honest. Out-of-range and null dereference are bugs, and missing configuration at startup should be loud and fatal.",
        },
        checks: [
          {
            prompt: "What is the shared failure mode of exceptions and returned errors?",
            options: [
              "Both can be swallowed, turning a loud failure into a wrong answer",
              "Both lose the stack trace once they cross a module boundary",
              "Both require the caller to know every failure the callee can produce",
              "Both are slower than a status flag checked by the caller",
            ],
            correctIndex: 0,
            explain:
              "An empty catch and an ignored error return are the same bug wearing different syntax. The system continues with a value nobody verified, which surfaces somewhere else entirely.",
          },
          {
            prompt: "What belongs in an error message that will be read during an incident?",
            options: [
              "The identifiers and the operation: which order, which customer, what failed",
              "The stack trace on its own, since it locates the failing line precisely",
              "A unique error code, so that the message can be looked up in a table",
              "The remediation steps, so that whoever reads it knows what to do next",
            ],
            correctIndex: 0,
            explain:
              "Failed to save is not an error message. Context added as the error moves up the stack is the cheapest debugging investment available, and it is the thing missing at three in the morning.",
          },
          {
            prompt: "Which failure should be loud and uncaught rather than handled?",
            options: [
              "An index outside the bounds of an array, which is a bug",
              "A payment declined by the provider for insufficient funds",
              "A file that does not exist at the path a user supplied",
              "A validation rule rejecting a malformed request body",
            ],
            correctIndex: 0,
            explain:
              "The other three are outcomes the caller must handle. An out-of-range index means the program's own reasoning was wrong, and catching it hides a defect rather than managing a case.",
          },
        ],
      },
      {
        id: "complexity-intuition",
        title: "Complexity without hand-waving",
        level: "advanced",
        body: [
          "Big O describes how the cost of an operation grows with the size of the input, and it deliberately ignores constants. That is its strength and the source of most of its misuse: it tells you which algorithm wins as n grows, and it says nothing about which is faster for the n you actually have. A linear scan of 50 items beats a hash lookup with an expensive hash function, and both are irrelevant next to one network call.",
          "The growth rates worth recognising on sight are constant, logarithmic, linear, linearithmic, quadratic and exponential. The useful boundary is between quadratic and everything below it: at a million items, an n log n algorithm does roughly twenty million operations and a quadratic one does a trillion. That is the difference between a second and a fortnight, and it is why nested loops over large collections are the first thing to look for.",
          "Space complexity gets less attention and causes at least as many incidents. Loading a whole file into memory works until the file is larger than the container's limit, and the failure is an abrupt kill rather than a slow response. Streaming, processing in chunks, and paginating are the answers, and they are much easier to build in from the start than to retrofit.",
          "Then there is amortised cost, which is where dynamic arrays and hash maps live. Appending to a dynamic array is usually constant time and occasionally linear when it grows and copies, and the average across many appends stays constant. That is fine for throughput and not fine for latency: the request that triggers the resize pays for all the ones that did not, which is the same shape as a garbage collection pause and matters for the same reason.",
        ],
        why: "Complexity analysis is for choosing between algorithms, not for predicting runtime. The two facts that repay learning are that quadratic algorithms fall off a cliff at scale, and that amortised constant time means one unlucky call pays for everyone else, which shows up in the tail rather than in the average.",
        diagram: {
          caption: "At a million items, the class is the whole story",
          columns: [
            [{ id: "n", label: "n = 1,000,000", kind: "client" }],
            [
              { id: "log", label: "log n", sub: "about 20 operations", kind: "data" },
              { id: "nlog", label: "n log n", sub: "about 20 million", kind: "data" },
              { id: "sq", label: "n squared", sub: "about a trillion", kind: "data", alternative: true },
            ],
            [
              { id: "inst", label: "Instant", kind: "service" },
              { id: "sec", label: "About a second", kind: "service" },
              { id: "wk", label: "About a fortnight", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "n", to: "log" },
            { from: "n", to: "nlog" },
            { from: "n", to: "sq" },
            { from: "log", to: "inst" },
            { from: "nlog", to: "sec" },
            { from: "sq", to: "wk" },
          ],
        },
        check: {
          prompt: "Appending to a dynamic array is amortised constant time. What does that hide?",
          options: [
            "Some appends are linear, so one unlucky call pays for the resize",
            "The average is constant only when the array is smaller than the cache",
            "Constant time here means constant per byte rather than per element",
            "The cost is constant only if the array is never read while being written",
          ],
          correctIndex: 0,
          explain:
            "Growth copies the whole array, so occasional appends are linear while the average stays constant. It is fine for throughput and shows up in tail latency, which is the same shape as a collection pause.",
        },
        checks: [
          {
            prompt: "Why is space complexity often the one that causes an incident?",
            options: [
              "Exceeding memory kills the process, rather than slowing it down",
              "Memory is harder to measure than time in most runtimes",
              "Allocation cost grows faster than algorithmic time complexity",
              "Garbage collection makes space usage impossible to predict",
            ],
            correctIndex: 0,
            explain:
              "A slow response degrades; an out-of-memory kill is abrupt and takes everything in flight with it. Streaming and pagination are much easier to design in than to retrofit.",
          },
          {
            prompt: "What does Big O deliberately ignore?",
            options: [
              "Constant factors, which decide which is faster at small sizes",
              "The worst case, which it replaces with the expected case",
              "Memory use, which is described by a separate notation entirely",
              "Recursion depth, which is counted as a single operation",
            ],
            correctIndex: 0,
            explain:
              "That is what makes it a statement about growth rather than about runtime, and why a linear scan of fifty items can beat an asymptotically better algorithm carrying a heavy constant.",
          },
          {
            prompt: "Which comparison should decide between two algorithms in production code?",
            options: [
              "Growth at the sizes you actually have, measured where you can",
              "The asymptotic class alone, since it holds for every input size",
              "The number of lines each takes, as a proxy for maintenance cost",
              "Whichever the standard library implements, as it is well tested",
            ],
            correctIndex: 0,
            explain:
              "Complexity chooses between candidates as n grows; measurement decides at the n you have. Using either alone is how a theoretically better algorithm ships as a regression.",
          },
        ],
      },
    ],
  },

  {
    id: "python",
    title: "Python",
    summary: "The data model, the mutable default, the GIL, and the parts of the language that catch experienced people.",
    track: "languages",
    topics: [
      {
        id: "python-data-model",
        title: "Everything is an object",
        level: "beginner",
        body: [
          "Python has one uniform rule underneath its syntax: every value is an object with a type, and every operator is a method call. Adding two numbers calls __add__, indexing calls __getitem__, len calls __len__, and a for loop calls __iter__ and then __next__ until it is told to stop. Once you know that, the language stops having special cases and starts having a small set of protocols.",
          "This is what makes user-defined types feel native. Implement __len__ and __getitem__ and your class works with len, indexing, slicing and iteration. Implement __enter__ and __exit__ and it works with with. There is no interface to declare and nothing to inherit from; the method being present is the entire contract, which is duck typing made explicit.",
          "Names are bindings rather than boxes. Assignment binds a name to an object; it never copies. Two names can refer to the same list, and mutating through one is visible through the other. The identity operator is checks whether two names refer to the same object, while == asks the objects whether they are equal, and confusing the two produces bugs that appear to depend on the value being tested.",
          "Memory is managed by reference counting plus a cycle collector. An object is freed the moment its last reference goes away, which is why files closed by scope exit usually work in CPython and are not guaranteed by the language. Reference cycles need the collector, which runs periodically, so a class with __del__ and a cycle can keep memory alive far longer than the code suggests.",
        ],
        why: "The protocols are the language. Learning the dunder methods turns Python from a collection of conveniences into a system where your own types behave exactly like the built-in ones, which is the difference between writing Python and writing another language in Python syntax.",
        diagram: {
          caption: "The syntax is method calls, which is why your types can join in",
          columns: [
            [
              { id: "len", label: "len(x)", kind: "client" },
              { id: "idx", label: "x[0]", kind: "client" },
              { id: "loop", label: "for i in x", kind: "client" },
            ],
            [
              { id: "dl", label: "__len__", kind: "service" },
              { id: "gi", label: "__getitem__", kind: "service" },
              { id: "it", label: "__iter__", kind: "service" },
            ],
            [{ id: "obj", label: "Your class", sub: "no interface to declare", kind: "data" }],
          ],
          edges: [
            { from: "len", to: "dl" },
            { from: "idx", to: "gi" },
            { from: "loop", to: "it" },
            { from: "dl", to: "obj", label: "present means supported" },
            { from: "gi", to: "obj" },
            { from: "it", to: "obj" },
          ],
        },
        check: {
          prompt: "A class implements __len__ and __getitem__. What does it get for free?",
          options: [
            "Iteration, indexing and slicing, since the syntax calls those methods",
            "Equality and hashing, both derived from the length and the contents",
            "Sorting, because Python can order any object that reports a length",
            "Membership testing alone, the one protocol that __len__ enables",
          ],
          correctIndex: 0,
          explain:
            "Python's syntax is sugar over method calls. Presence of the protocol methods is the whole contract, which is why a class with __getitem__ can be looped over even without __iter__.",
        },
        checks: [
          {
            prompt: "What is the difference between the is operator and equality in Python?",
            options: [
              "is compares identity, equality asks the objects whether they match",
              "is compares values, equality compares the types of both operands",
              "is is faster, and both return the same answer for immutable types",
              "is works on any object, equality only on those defining __eq__",
            ],
            correctIndex: 0,
            explain:
              "is asks whether two names point at the same object. Small integers and short strings are often cached, so is can appear to work on values and then stop working on larger ones, which is how the bug reaches production.",
          },
          {
            prompt: "Why can a file left unclosed still work in CPython but not be safe to rely on?",
            options: [
              "Reference counting frees it when the last reference goes away",
              "The interpreter flushes all open handles at the end of each statement",
              "Files are closed by the garbage collector on a fixed schedule",
              "CPython keeps a registry of handles and closes them on error",
            ],
            correctIndex: 0,
            explain:
              "Prompt destruction is a CPython implementation detail rather than a language guarantee, so the same code can leak handles on another implementation. The with statement makes the lifetime explicit.",
          },
          {
            prompt: "A class defines __enter__ and __exit__. What does that enable?",
            options: [
              "Use in a with statement, so cleanup runs even when an error is raised",
              "Automatic iteration, since both are part of the iterator protocol",
              "Comparison and sorting, which need a defined entry and exit order",
              "Serialisation, because the two methods define how state is captured",
            ],
            correctIndex: 0,
            explain:
              "That pair is the context manager protocol, and the guarantee it provides is that the exit runs on the way out whether the block finished or raised.",
          },
        ],
      },
      {
        id: "python-mutable-defaults",
        title: "Mutability and the default argument trap",
        level: "intermediate",
        body: [
          "A default argument is evaluated once, when the function is defined, not each time it is called. A function declared with an empty list as a default therefore shares one list across every call that omits the argument, so items appended in one call are visible in the next. It looks like the function is remembering things, and in a sense it is.",
          "The fix is the idiom you see everywhere: default to None and create the real value inside the body. It looks like ceremony until you know why it exists, at which point it stops looking like a style choice.",
          "The same underlying fact, that names bind to objects rather than copy them, explains most other surprises. Slicing a list gives you a shallow copy, so the outer list is new and the inner objects are shared; copy.deepcopy exists for when that matters. A tuple is immutable in that its bindings cannot be changed, and a tuple containing a list still lets you mutate that list, which is why a tuple of mutable objects is not hashable in the way people expect.",
          "This is also where class attributes catch people. An attribute assigned in the class body belongs to the class, so every instance shares it, and mutating it through one instance changes it for all of them. Assigning to it through an instance creates a new instance attribute that shadows the class one, so the two look identical in code and behave differently, which is a genuinely difficult bug to see by reading.",
        ],
        why: "Every one of these is the same fact wearing a different hat: Python binds names to objects and does not copy. Learning the rule once means recognising the pattern in the default argument, the shallow copy, the shared class attribute and the tuple that is not as immutable as it looks.",
        diagram: {
          caption: "The default is evaluated once, at definition",
          columns: [
            [{ id: "def", label: "def f(items=[])", sub: "runs once, at import", kind: "service" }],
            [{ id: "one", label: "One list", sub: "bound to the function", kind: "data" }],
            [
              { id: "c1", label: "First call", sub: "appends, sees 1 item", kind: "client" },
              { id: "c2", label: "Second call", sub: "appends, sees 2 items", kind: "client" },
            ],
            [{ id: "fix", label: "items=None", sub: "create inside the body", kind: "data" }],
          ],
          edges: [
            { from: "def", to: "one", label: "the default object" },
            { from: "one", to: "c1" },
            { from: "one", to: "c2", label: "the same list" },
            { from: "def", to: "fix", label: "the idiom, and why", async: true },
          ],
        },
        check: {
          prompt: "Why does a function with an empty list as its default argument appear to remember values between calls?",
          options: [
            "The interpreter caches arguments to avoid reallocating on every call",
            "The default is evaluated once at definition, so one list is shared",
            "Lists are interned like small integers, so equal lists become one object",
            "Closures capture defaults, so the list belongs to the enclosing scope",
          ],
          correctIndex: 1,
          explain:
            "The default expression runs when the def statement executes. Every call that omits the argument gets that same object, which is why the None-and-create-inside idiom exists.",
        },
        checks: [
          {
            prompt: "A class attribute holding a list is mutated through one instance. What happens?",
            options: [
              "Every instance sees the change, because the list belongs to the class",
              "Only that instance changes, since attribute access creates a copy",
              "An error is raised, because class attributes cannot be modified",
              "The change is lost when that instance is garbage collected",
            ],
            correctIndex: 0,
            explain:
              "There is one list on the class and every instance is looking at it. Assigning to the attribute instead creates an instance attribute that shadows it, so the two cases read identically and behave differently.",
          },
          {
            prompt: "What does a slice of a list of objects give you?",
            options: [
              "A new list holding references to the same objects",
              "A new list holding independent copies of every object",
              "A view onto the original, reflecting later changes to it",
              "A tuple, because slices are immutable by construction",
            ],
            correctIndex: 0,
            explain:
              "The outer list is new and the contents are shared, which is why mutating an element through the slice is visible in the original. copy.deepcopy exists for when that matters.",
          },
          {
            prompt: "Why is a tuple containing a list unusable as a dictionary key?",
            options: [
              "Hashing the tuple hashes its contents, and a list has no hash",
              "Tuples are hashable only when every element shares one type",
              "Dictionary keys are limited to strings, numbers and frozensets",
              "The tuple's hash is computed lazily and so cannot be cached",
            ],
            correctIndex: 0,
            explain:
              "Immutability of the container is not enough when what it contains can change. The hash would stop matching the value, so the language refuses at the outset.",
          },
        ],
      },
      {
        id: "python-comprehensions",
        title: "Comprehensions, generators and laziness",
        level: "intermediate",
        body: [
          "A comprehension builds a collection in one expression, and its value is not brevity but that it says what is being built rather than how. A list comprehension produces a list immediately; a generator expression, with parentheses instead of brackets, produces an iterator that computes each item when asked, which is the difference between holding a million rows in memory and holding one.",
          "Generators are the cheapest performance tool in the language for anything sequential. A function with yield in it returns a generator: it runs until the first yield, hands back a value, and resumes where it left off when the next value is requested. That turns a pipeline of transformations into something that streams, so a five gigabyte file can be processed in constant memory by a function that reads like it processes a list.",
          "The cost is that a generator can only be consumed once, and its laziness moves work later, so an exception can surface in the loop that consumes it rather than in the line that appeared to create it. It also means the timing of side effects is not where it looks, which is why a generator that performs writes is usually a mistake.",
          "The related tools are worth knowing as a set: enumerate when you need the index, zip to walk two sequences together, itertools for the standard lazy patterns such as chain, islice and groupby, and any and all for short-circuiting checks. Most loops that build a list, filter it and then reduce it are one line of these, and the one line is both faster and easier to check.",
        ],
        why: "Laziness is how Python handles data larger than memory without changing how the code reads. The trade is that work happens where it is consumed rather than where it is written, so errors and side effects appear somewhere other than the line that seems to cause them.",
        diagram: {
          caption: "A list materialises; a generator produces on demand",
          columns: [
            [{ id: "file", label: "5GB file", kind: "data" }],
            [
              { id: "lc", label: "List comprehension", sub: "all rows in memory", kind: "service", alternative: true },
              { id: "gen", label: "Generator", sub: "one row at a time", kind: "service" },
            ],
            [
              { id: "oom", label: "Out of memory", kind: "external", alternative: true },
              { id: "ok", label: "Constant memory", sub: "pipeline streams", kind: "data" },
            ],
          ],
          edges: [
            { from: "file", to: "lc", label: "read all" },
            { from: "file", to: "gen", label: "read lazily" },
            { from: "lc", to: "oom" },
            { from: "gen", to: "ok" },
          ],
        },
        check: {
          prompt: "A five gigabyte file must be processed on a machine with one gigabyte of memory. What shape of code fits?",
          options: [
            "Read it into a list, then process in chunks to limit peak memory use",
            "Generators that yield one line at a time, so memory stays constant",
            "A comprehension, which is optimised to avoid materialising the result",
            "Memory-mapped access, which is the only way to exceed available memory",
          ],
          correctIndex: 1,
          explain:
            "A generator produces items on demand, so a pipeline of them streams the file in constant memory. A list comprehension materialises everything, which is exactly what will not fit.",
        },
        checks: [
          {
            prompt: "A generator is consumed twice and the second pass is empty. Why?",
            options: [
              "A generator is an iterator, exhausted once it has been walked",
              "The first pass closed the underlying file the generator read from",
              "Generators cache their result, and the cache expires after one use",
              "The second pass began before the first had released the generator",
            ],
            correctIndex: 0,
            explain:
              "It produces values on demand and keeps no history, so there is nothing to replay. If two passes are needed, materialise a list or build the generator twice.",
          },
          {
            prompt: "Where does an exception raised inside a generator surface?",
            options: [
              "In the loop that consumes it, not the line that created it",
              "At the point the generator function was defined in the module",
              "When the generator is garbage collected, as a warning",
              "Immediately at creation, because the body runs eagerly once",
            ],
            correctIndex: 0,
            explain:
              "Nothing in the body runs until a value is requested. The traceback points at the consuming loop, which is why side effects inside generators are hard to reason about and usually a mistake.",
          },
          {
            prompt: "Which is the right tool to walk two sequences together?",
            options: [
              "zip, which stops at the shorter of the two by default",
              "enumerate, which pairs each element with its index",
              "map, which applies a function across both sequences",
              "itertools.chain, which joins them into one sequence",
            ],
            correctIndex: 0,
            explain:
              "zip pairs them and stops when the first runs out, which is silent truncation if the lengths differ. strict=True, added in Python 3.10, raises instead.",
          },
        ],
      },
      {
        id: "python-gil",
        title: "The GIL and how to work with it",
        level: "advanced",
        body: [
          "CPython has a global interpreter lock: one thread executes Python bytecode at a time, per interpreter. Threads are therefore real operating system threads that take turns, which means threading gives you concurrency and not parallelism for anything that computes. Four threads doing arithmetic on four cores run at roughly the speed of one.",
          "The lock is released around blocking operations, which is why threading is still the right tool for IO. A thread waiting on a socket, a file or a database has released the lock, so other threads run. For a program that spends its time waiting, threads work exactly as you would hope, and asyncio does the same job with less memory per task and explicit switch points.",
          "For CPU-bound work the answer is more than one interpreter: multiprocessing, or a process pool, so each process has its own lock and its own memory. The cost is that arguments and results are pickled and copied between processes, so the work per task has to be large enough to be worth the transfer. The other answer is to leave Python for the hot loop, which is what NumPy, Polars and every serious numeric library already do by releasing the lock and running C.",
          "This is changing, and it is worth being precise about how far. PEP 703 added a free-threaded build in Python 3.13, where the interpreter lock is genuinely absent and threads run on separate cores. It shipped as experimental; PEP 779 moved it to officially supported in Python 3.14. It is still not the default build, single-threaded code pays a small penalty for it, and a long tail of C extensions has to be made thread-safe before it is boring. So the practical advice stands for now, threads for waiting and processes for computing, while the reason behind it is being removed underneath.",
        ],
        why: "The GIL is the reason a Python program that looks parallel is not, and the reason the standard advice is threads for waiting and processes for computing. Knowing which of the two your workload is decides the concurrency model before any code is written.",
        inPractice:
          "NumPy and its descendants release the interpreter lock while running C, which is why numeric Python is fast without being parallel at the Python level. Python 3.13 shipped an experimental free-threaded build under PEP 703, which removes the lock entirely and is not yet the default.",
        diagram: {
          caption: "Concurrency without parallelism, and the two escape hatches",
          columns: [
            [{ id: "work", label: "The work", kind: "client" }],
            [
              { id: "io", label: "Waiting on IO", kind: "service" },
              { id: "cpu", label: "Computing", kind: "service" },
            ],
            [
              { id: "th", label: "Threads", sub: "lock released while waiting", kind: "data" },
              { id: "stuck", label: "Threads", sub: "one core, taking turns", kind: "data", alternative: true },
            ],
            [
              { id: "proc", label: "Processes", sub: "own lock, own memory", kind: "data" },
              { id: "c", label: "C extension", sub: "releases the lock", kind: "data" },
            ],
          ],
          edges: [
            { from: "work", to: "io" },
            { from: "work", to: "cpu" },
            { from: "io", to: "th", label: "works as hoped" },
            { from: "cpu", to: "stuck", label: "no faster" },
            { from: "cpu", to: "proc", label: "pay the copy" },
            { from: "cpu", to: "c", label: "or leave Python" },
          ],
        },
        check: {
          prompt: "A CPU-bound Python program is given four threads and does not get faster. Why?",
          options: [
            "The threads contend for the same cache lines, cancelling the gain",
            "One thread executes Python bytecode at a time under the interpreter lock",
            "Python threads are cooperative and only switch at explicit yield points",
            "The operating system schedules Python threads onto a single core",
          ],
          correctIndex: 1,
          explain:
            "They are real threads taking turns holding one lock. That is concurrency without parallelism, which is useless for computing and exactly right for waiting on IO.",
        },
        checks: [
          {
            prompt: "Why does threading still help a program waiting on a database?",
            options: [
              "The lock is released around blocking calls, so other threads run",
              "Waiting threads are moved into a separate interpreter automatically",
              "The interpreter raises the priority of any thread that is blocked",
              "Database drivers bypass the interpreter and run inside the kernel",
            ],
            correctIndex: 0,
            explain:
              "The lock is held to execute bytecode, not to sit on a socket. A program that spends its time waiting gets nearly all the concurrency it would have without one.",
          },
          {
            prompt: "What does moving CPU-bound work to a process pool cost?",
            options: [
              "Arguments and results are pickled and copied between processes",
              "Each process loads a separate copy of the operating system",
              "Exceptions raised inside a worker cannot be returned to the caller",
              "Processes cannot be reused, so one starts for every task sent",
            ],
            correctIndex: 0,
            explain:
              "The transfer is the price of separate memory, which is why each task has to be large enough to be worth it. A million tiny tasks through a process pool is slower than one thread.",
          },
          {
            prompt: "How does NumPy achieve parallelism despite the interpreter lock?",
            options: [
              "It releases the lock while it runs C code over the array",
              "It executes each array operation in a separate interpreter",
              "It compiles Python into machine code that ignores the lock",
              "It uses processes internally and shares memory through mmap",
            ],
            correctIndex: 0,
            explain:
              "The heavy loop is C and the lock is dropped for its duration, so other Python threads continue. That is the standard escape hatch, and the reason numeric Python feels fast.",
          },
        ],
      },
      {
        id: "python-typing",
        title: "Type hints, and what they do not do",
        level: "advanced",
        body: [
          "Python's type hints are annotations that the interpreter records and does not enforce. Passing a string where an int is annotated runs perfectly happily. The value comes entirely from tools: a checker such as mypy or pyright reads them and tells you before you run anything, and an editor uses them for completion and navigation.",
          "That makes them a documentation and tooling feature with teeth, and the returns are highest exactly where dynamic typing hurts most: function boundaries in a large codebase, data passed between modules, and anything another team will call. Annotating internal one-line helpers has a much worse ratio.",
          "The pieces worth learning are Optional for the value that might be None, which is the most common runtime error in any language that has null, union types for genuine alternatives, Protocol for structural typing so a parameter can require behaviour rather than inheritance, and generics for containers whose contents matter. TypedDict is the pragmatic answer for the dictionary shapes that real programs pass around.",
          "The trap is believing the annotations at run time. Data arriving from a network, a queue or a file is whatever it is, and an annotation saying it is a User does not make it one. Validation at the boundary, with a library such as Pydantic or a hand-written check, is what turns a hint into a guarantee, and the combination of the two is what makes a typed Python codebase actually safer rather than merely better documented.",
        ],
        why: "Hints move a class of errors from run time to check time, but only for code that a checker sees. At the edges, where data arrives from outside the program, they describe an intention rather than a fact, and the difference has to be closed by validation.",
        diagram: {
          caption: "Types stop at the boundary; validation is what crosses it",
          columns: [
            [{ id: "net", label: "API response", sub: "whatever arrived", kind: "external" }],
            [
              { id: "cast", label: "Annotated as User", sub: "asserted, not checked", kind: "service", alternative: true },
              { id: "val", label: "Validated", sub: "Pydantic, or by hand", kind: "service" },
            ],
            [
              { id: "boom", label: "Fails later, elsewhere", kind: "data", alternative: true },
              { id: "safe", label: "A real User", sub: "checker and runtime agree", kind: "data" },
            ],
          ],
          edges: [
            { from: "net", to: "cast", label: "trusted" },
            { from: "net", to: "val", label: "checked" },
            { from: "cast", to: "boom", label: "missing field, three calls away" },
            { from: "val", to: "safe" },
          ],
        },
        check: {
          prompt: "A function annotated to take an int is called with a string. What happens at run time?",
          options: [
            "A TypeError is raised, since annotations are checked when calling",
            "Nothing: annotations are recorded and not enforced by the interpreter",
            "The value is coerced to an int if it can be, otherwise it raises",
            "The call succeeds but the annotation is removed from the function",
          ],
          correctIndex: 1,
          explain:
            "Annotations are metadata. Only a static checker or an explicit validation library acts on them, which is why data crossing the program's boundary still needs validating.",
        },
        checks: [
          {
            prompt: "Why should external data start life as unknown rather than as a declared type?",
            options: [
              "A declared type is an assertion, and the data may not match it",
              "unknown is faster to check, since the checker skips its members",
              "Declared types cannot be narrowed once they have been assigned",
              "External data is always a string until it has been parsed",
            ],
            correctIndex: 0,
            explain:
              "Annotations are erased, so nothing verifies a payload against the type it claims. Starting from a type that forces you to establish what you have is the difference between documentation and safety.",
          },
          {
            prompt: "What does Protocol add that a base class does not?",
            options: [
              "A parameter can require behaviour without requiring inheritance",
              "It enforces the annotations at run time when the method is called",
              "It allows a class to declare several unrelated interfaces at once",
              "It generates the methods automatically from the type signature",
            ],
            correctIndex: 0,
            explain:
              "It is structural typing made explicit: anything with the right shape satisfies it, including classes written before the protocol existed and classes you do not own.",
          },
          {
            prompt: "Which is the honest description of what type hints provide?",
            options: [
              "Errors found before running, for the code a checker can see",
              "Guarantees enforced by the interpreter when a function is called",
              "Coercion of arguments into the annotated type where possible",
              "Documentation only, with no effect on any tool in the pipeline",
            ],
            correctIndex: 0,
            explain:
              "They move a class of error from run time to check time within the boundary of your codebase. At its edges they describe an intention, and validation is what turns that into a fact.",
          },
        ],
      },
    ],
  },

  {
    id: "javascript",
    title: "JavaScript and TypeScript",
    summary: "The event loop, closures, coercion, and what TypeScript actually checks.",
    track: "languages",
    topics: [
      {
        id: "js-event-loop",
        title: "The event loop",
        level: "beginner",
        body: [
          "JavaScript runs your code on one thread. Everything else, timers, network responses, file reads, user events, happens elsewhere and is handed back as a task to run when the thread is free. The event loop is the mechanism: run the current task to completion, then take the next one.",
          "The rule that follows is that nothing else happens while your code runs. A loop that takes 300 milliseconds blocks rendering, input handling and every pending callback for 300 milliseconds. On a page, that is a frozen interface; in Node, that is every concurrent request waiting. This is the single most important operational fact about the language.",
          "Not all queued work is equal. Promises resolve on the microtask queue, which is drained completely after the current task and before the next one, while setTimeout schedules a macrotask that waits its turn. So a promise chain that never awaits anything real can starve the timer queue, and a setTimeout with zero delay still runs after every pending promise callback.",
          "Async and await do not add threads. They mark the points where a function may pause and let the loop run something else, then resume. That is why an await inside a loop serialises the whole loop, and why Promise.all is the difference between ten sequential requests and ten concurrent ones. The work is still on one thread; only the waiting overlaps.",
        ],
        why: "One thread means the cost of any slow synchronous operation is paid by everything else in the program. Knowing what yields and what does not is the difference between a page that stays responsive and one that freezes for reasons nobody can see in the code.",
        inPractice:
          "Node's own documentation describes the loop's phases explicitly, which is why blocking it is treated as a bug rather than as slowness. The browser equivalent shows up in Chrome's long task reporting: anything holding the main thread past 50ms is flagged, because that is where interaction starts to feel broken.",
        diagram: {
          caption: "One thread, two queues, and everything else waiting",
          columns: [
            [{ id: "task", label: "Current task", sub: "runs to completion", kind: "service" }],
            [{ id: "micro", label: "Microtasks", sub: "promise callbacks", kind: "queue" }],
            [{ id: "macro", label: "Macrotasks", sub: "timers, IO", kind: "queue" }],
            [{ id: "render", label: "Render", sub: "blocked until the loop is free", kind: "edge" }],
          ],
          edges: [
            { from: "task", to: "micro", label: "drained first, completely" },
            { from: "micro", to: "macro", label: "then one macrotask" },
            { from: "macro", to: "render", label: "then the browser paints" },
            { from: "task", to: "render", label: "a long task blocks all of it", async: true },
          ],
        },
        check: {
          prompt: "setTimeout(fn, 0) is called, and a resolved promise's then is queued. Which runs first?",
          options: [
            "The timer, because a zero delay means it is scheduled immediately",
            "The promise callback, because microtasks drain before the next task",
            "Whichever was queued first, since both share one ordered queue",
            "They run concurrently, since promises are handled on a separate thread",
          ],
          correctIndex: 1,
          explain:
            "Microtasks are drained completely after the current task and before the next macrotask. A zero delay means as soon as possible, not now, and promises get there first.",
        },
        checks: [
          {
            prompt: "An await inside a loop makes ten requests take ten times as long. What was intended?",
            options: [
              "Promise.all, so the ten requests are in flight concurrently",
              "A worker thread, so the loop does not block the event loop",
              "A larger connection pool, so the requests are not queued",
              "process.nextTick, so each iteration yields between requests",
            ],
            correctIndex: 0,
            explain:
              "await pauses the function until that one promise settles, so a loop serialises. Starting all ten and awaiting the set overlaps the waiting, which is the only thing a single thread can overlap.",
          },
          {
            prompt: "What does async actually add to a function?",
            options: [
              "Points at which it may pause and let the loop run other work",
              "A separate thread on which the function body executes",
              "A queue of its own, drained before any other pending work",
              "Automatic error handling, since rejections become return values",
            ],
            correctIndex: 0,
            explain:
              "There is still one thread. The function marks where it can yield, which lets the waiting overlap and does nothing whatsoever for work that computes.",
          },
          {
            prompt: "A 300ms synchronous loop runs in a Node request handler. What is affected?",
            options: [
              "Every other request on that process, including the health check",
              "Only the request that triggered it, which takes 300ms longer",
              "Nothing, since Node runs each request on its own thread",
              "The event loop's timers, but not any pending IO callbacks",
            ],
            correctIndex: 0,
            explain:
              "Nothing else runs while your code runs. That is the single most important operational fact about the runtime, and it is why a health check timing out is a common first symptom.",
          },
        ],
      },
      {
        id: "js-closures-this",
        title: "Closures, prototypes and this",
        level: "intermediate",
        body: [
          "A closure is a function plus the variables it captured where it was defined, and it is the mechanism behind most JavaScript patterns: callbacks that remember context, module privacy, function factories, hooks. Understanding that the function holds the variable rather than its value at the time explains both the power and the classic loop bug that let was introduced to fix.",
          "Objects inherit through a prototype chain rather than through classes. A property lookup walks from the object to its prototype and onwards until it finds the name or runs out, and class syntax is a more familiar spelling of exactly that. Knowing the chain exists explains why adding a method to a prototype affects every existing instance, and why a property that shadows one further up hides rather than replaces it.",
          "Then there is this, which is bound by how a function is called rather than where it is defined. Extract a method from an object and call it on its own and this is no longer that object, which is the source of the callback that mysteriously stops working. Arrow functions do not bind their own this, taking it from the enclosing scope, which is why they are the default inside callbacks and the wrong choice for an object method that needs the receiver.",
          "The practical rules: use arrow functions for callbacks, use regular functions or classes for methods that need this, and prefer passing values explicitly over relying on binding. Most this-related bugs disappear when the code stops depending on how a function will be called later.",
        ],
        why: "Closures and prototypes are the two mechanisms the whole language is built from, and this is the one piece of it decided at the call site rather than at the definition. Every framework pattern that looks like magic is one of the three.",
        inPractice:
          "React hooks are closures by construction, which is why the dependency array exists: it decides which values a callback captured are allowed to go stale. Most confusing hook bugs are a closure holding a value from a previous render.",
        diagram: {
          caption: "this comes from the call site; a closure comes from where it was written",
          columns: [
            [{ id: "obj", label: "obj.method()", sub: "receiver is obj", kind: "client" }],
            [
              { id: "extract", label: "const f = obj.method", sub: "receiver lost", kind: "service", alternative: true },
              { id: "arrow", label: "() => this.x", sub: "this from enclosing scope", kind: "service" },
            ],
            [
              { id: "undef", label: "this is undefined", kind: "external", alternative: true },
              { id: "works", label: "Works in a callback", kind: "data" },
            ],
          ],
          edges: [
            { from: "obj", to: "extract", label: "passed as a callback" },
            { from: "extract", to: "undef", label: "called with no receiver" },
            { from: "obj", to: "arrow", label: "written inside the method" },
            { from: "arrow", to: "works", label: "captured, not bound" },
          ],
        },
        check: {
          prompt: "A method is extracted from an object and passed as a callback, and this becomes undefined. Why?",
          options: [
            "The object was garbage collected once the method reference was taken",
            "this is determined by how a function is called, not where it is defined",
            "Extracting a method copies it, and copies lose their prototype chain",
            "Callbacks always run in strict mode, which forbids implicit binding",
          ],
          correctIndex: 1,
          explain:
            "The receiver comes from the call site. Called on its own, there is no receiver, so this is undefined in strict mode. Arrow functions or explicit binding fix it by removing the dependency on how it is called.",
        },
        checks: [
          {
            prompt: "When is an arrow function the wrong choice?",
            options: [
              "As an object method that needs the receiver, since it has no this",
              "As a callback, because it cannot capture the enclosing scope",
              "Inside a class, where arrow functions are not permitted at all",
              "As an event handler, since it cannot be removed once attached",
            ],
            correctIndex: 0,
            explain:
              "Arrow functions take this from where they were written rather than from how they are called, which is exactly right for a callback and exactly wrong for a method that needs the object it was called on.",
          },
          {
            prompt: "Adding a method to a prototype affects existing instances. Why?",
            options: [
              "Lookup walks the chain at call time rather than copying at creation",
              "Instances hold a snapshot that is refreshed on the next access",
              "The engine rewrites every instance when a prototype changes",
              "Methods are stored on the instance, and the prototype is a fallback",
            ],
            correctIndex: 0,
            explain:
              "Nothing was copied when the object was made. The property is found by walking from the object upward every time it is used, which is why the chain is a live structure rather than a template.",
          },
          {
            prompt: "What problem did let solve in a loop that creates functions?",
            options: [
              "A binding per iteration, so each closure captures its own value",
              "Hoisting, so the variable cannot be used before it is declared",
              "Type coercion, so the loop counter stays a number throughout",
              "Garbage collection, so captured variables are released sooner",
            ],
            correctIndex: 0,
            explain:
              "With one shared binding every function sees the final value. A fresh binding per iteration is what makes each closure capture what it looked like at the time.",
          },
        ],
      },
      {
        id: "js-coercion",
        title: "Equality, coercion and the sharp edges",
        level: "intermediate",
        body: [
          "JavaScript will convert types to make a comparison work, and the rules are more elaborate than anyone can hold in their head. The practical answer is to use strict equality, which compares without converting, and to convert deliberately when you mean to. Almost every surprising comparison in the language comes from the loose operator being allowed to guess.",
          "The specific facts worth memorising are short. NaN is not equal to itself, which is why isNaN and Number.isNaN exist. typeof null returns object, a bug preserved since 1995 for compatibility. An empty array is falsy in a boolean context but equal to false and to zero under loose comparison. Adding a number to a string concatenates, and subtracting converts, so the same two values produce a string with one operator and a number with another.",
          "Falsy values are a fixed set worth knowing exactly: false, 0, minus 0, empty string, null, undefined and NaN. Everything else is truthy, including empty arrays and empty objects, which is why checking a response by truthiness rather than by a property is a reliable way to accept something empty as success.",
          "Modern syntax removes most of the remaining traps. Optional chaining reads a nested property without throwing when something in the middle is missing, and nullish coalescing supplies a default only for null and undefined rather than for every falsy value, so a legitimate zero or empty string is no longer replaced by a fallback. That last distinction fixes a whole category of quiet bugs in configuration handling.",
        ],
        why: "The language guesses when you let it, and the guesses are consistent rather than sensible. Strict equality, explicit conversion and nullish coalescing remove the guessing, which is why every serious style guide requires them.",
        inPractice:
          "Every mainstream style guide requires strict equality, and TypeScript flags comparisons between incompatible types outright. Nullish coalescing was added to the language specifically because defaulting with logical or kept discarding legitimate zeroes and empty strings.",
        diagram: {
          caption: "Two operators, two very different answers for a missing value",
          columns: [
            [{ id: "cfg", label: "config.retries", sub: "the value is 0", kind: "client" }],
            [
              { id: "or", label: "value || 3", sub: "any falsy is replaced", kind: "service", alternative: true },
              { id: "nul", label: "value ?? 3", sub: "only null or undefined", kind: "service" },
            ],
            [
              { id: "wrong", label: "3", sub: "the zero was discarded", kind: "external", alternative: true },
              { id: "right", label: "0", sub: "the setting is honoured", kind: "data" },
            ],
          ],
          edges: [
            { from: "cfg", to: "or" },
            { from: "cfg", to: "nul" },
            { from: "or", to: "wrong" },
            { from: "nul", to: "right" },
          ],
        },
        check: {
          prompt: "A config value of 0 keeps being replaced by its default. Which operator is responsible?",
          options: [
            "Logical or, which treats 0 as falsy and substitutes the default",
            "Nullish coalescing, which replaces any value that is not an object",
            "Optional chaining, which returns undefined for a numeric property",
            "Strict equality, which fails to match 0 against a numeric default",
          ],
          correctIndex: 0,
          explain:
            "Or substitutes for every falsy value, and 0 is falsy. Nullish coalescing substitutes only for null and undefined, which is why it is the right operator for defaults.",
        },
        checks: [
          {
            prompt: "Which values are falsy in JavaScript?",
            options: [
              "false, 0, minus 0, empty string, null, undefined and NaN",
              "false, 0, empty string, empty array, empty object and null",
              "false, 0, null and undefined, but not the empty string",
              "false, null, undefined and any object with no own properties",
            ],
            correctIndex: 0,
            explain:
              "Everything else is truthy, including an empty array and an empty object, which is why checking a response by truthiness accepts an empty result as success.",
          },
          {
            prompt: "Why does NaN not equal itself?",
            options: [
              "The standard defines it that way, so a check needs Number.isNaN",
              "Each NaN is a distinct object with its own identity in memory",
              "Comparison coerces NaN to a string, and the strings differ",
              "It equals itself under strict equality but not under loose",
            ],
            correctIndex: 0,
            explain:
              "It is specified behaviour rather than a quirk of an implementation, which is why the language ships a function whose only job is to answer the question the operator cannot.",
          },
          {
            prompt: "What does optional chaining protect against?",
            options: [
              "Reading through a null or undefined link in a nested path",
              "A property that exists but holds an unexpected type of value",
              "An asynchronous property that has not yet been populated",
              "A prototype chain that has been deliberately set to null",
            ],
            correctIndex: 0,
            explain:
              "It returns undefined instead of throwing when something in the middle is missing. It does not validate what it finds, which is the next question and a different tool.",
          },
        ],
      },
      {
        id: "ts-structural",
        title: "TypeScript is structural, and it disappears",
        level: "advanced",
        body: [
          "TypeScript checks shapes rather than names. If an object has the properties a type requires, it satisfies that type, whether or not anyone declared a relationship. That is structural typing, and it is why you can pass an object literal to a function expecting an interface without implementing anything, and why two identically shaped types from different libraries are interchangeable.",
          "The second fact is that all of it is erased. Types exist during compilation and produce no runtime code at all, so nothing checks a value at the boundary of the program unless you write that check. An API response cast as a User is a User as far as the compiler is concerned and whatever the server actually sent as far as the program is concerned, which is where a large share of production TypeScript errors come from.",
          "The tools for closing that gap are narrowing and validation. Type guards, discriminated unions and the unknown type let you start from I do not know what this is and prove what it is with code the compiler follows. Using unknown rather than any for external data is the single highest-value habit: any switches the checker off silently, unknown forces you to establish what you have before using it.",
          "Beyond that, the type system is expressive enough to encode real rules: unions to make invalid states unrepresentable, generics to keep containers honest, mapped and conditional types to derive one shape from another so they cannot drift apart. It is also expressive enough to write types nobody can read, and the point at which a type needs a comment to explain it is usually the point to simplify it.",
        ],
        why: "Structural typing makes TypeScript pleasant to adopt gradually, and erasure means it protects the inside of the program and nothing at its edges. Validating external data and preferring unknown over any is what turns compile-time confidence into runtime safety.",
        inPractice:
          "Zod and its equivalents exist precisely because types are erased: they validate at run time and derive the static type from the same schema, so the compiler's view and the program's view of external data finally agree.",
        diagram: {
          caption: "Types are compile time; the network is not",
          columns: [
            [{ id: "src", label: "Your code", sub: "checked, structural", kind: "service" }],
            [{ id: "build", label: "Build", sub: "types erased", kind: "edge" }],
            [{ id: "run", label: "Runtime", sub: "plain JavaScript", kind: "service" }],
            [
              { id: "known", label: "Internal values", sub: "protected by the checker", kind: "data" },
              { id: "ext", label: "Parsed JSON", sub: "whatever the server sent", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "src", to: "build" },
            { from: "build", to: "run", label: "nothing left to check with" },
            { from: "run", to: "known" },
            { from: "run", to: "ext", label: "validate here or not at all" },
          ],
        },
        check: {
          prompt: "An API response is cast to a User type and a field is missing at run time. What went wrong?",
          options: [
            "The cast was to the wrong type, so the compiler checked the wrong shape",
            "Types are erased, so a cast asserts a shape without verifying it",
            "Structural typing matched a different type with the same field names",
            "The response was parsed before the type was applied, losing the field",
          ],
          correctIndex: 1,
          explain:
            "A cast is an assertion to the compiler, not a check. Data crossing into the program has to be validated by code, which is why external input should start as unknown.",
        },
        checks: [
          {
            prompt: "Why does any weaken a codebase more than unknown does?",
            options: [
              "any switches the checker off silently wherever the value travels",
              "any is slower to check, since the compiler must infer every use",
              "unknown is erased at build time, whereas any survives into output",
              "any cannot be narrowed, so it must be cast at every use site",
            ],
            correctIndex: 0,
            explain:
              "A value typed as any propagates permission to do anything with it, and nothing warns. unknown forces you to establish what you have before using it, which is why it is the right type for anything arriving from outside.",
          },
          {
            prompt: "What is the point of a discriminated union?",
            options: [
              "Checking one field narrows the type of everything else",
              "It merges several interfaces into one shared supertype",
              "It allows a value to hold more than one type at run time",
              "It generates validators automatically from the union members",
            ],
            correctIndex: 0,
            explain:
              "A shared literal field lets the compiler follow the branch and know exactly which variant it is in, which is how invalid states are made unrepresentable rather than merely discouraged.",
          },
          {
            prompt: "Two libraries define identically shaped interfaces with different names. What happens?",
            options: [
              "They are interchangeable, because TypeScript checks shape not name",
              "They are incompatible, since each declaration creates a distinct type",
              "They are compatible only if one explicitly extends the other",
              "They conflict, and one must be aliased before either can be used",
            ],
            correctIndex: 0,
            explain:
              "Structural typing means the name is documentation. That is what makes gradual adoption painless, and it is why a value can satisfy an interface written by someone who never knew it existed.",
          },
        ],
      },
      {
        id: "js-modules",
        title: "Modules, bundling and what you ship",
        level: "intermediate",
        body: [
          "JavaScript spent a decade with no module system, then acquired two. CommonJS, with require and module.exports, resolves at run time and returns whatever the module currently exports. ES modules, with import and export, are static: the imports are known before any code runs, which is what allows a bundler to see the whole graph and remove what nothing uses.",
          "That difference is the reason tree shaking works with one and not the other. A bundler can prove that an exported function is never imported and drop it, but only when the imports cannot change at run time. Importing a whole library for one function still costs the whole library if that library ships CommonJS, or if it has side effects at module scope that the bundler dare not remove.",
          "What actually reaches a browser is a bundle, and its size is the number that matters. Compressed transfer size is the honest measure rather than the raw file size, and the thing to watch is not the total but what a first visit needs before the page is usable. Code splitting by route, and lazy loading anything below the first screen, is how a large application stays fast to start.",
          "The dependency tree is where the weight hides. A single small utility can pull in a date library, a polyfill set and an internationalisation table, and none of it is visible in the import statement that caused it. Reading the bundle analysis once a quarter is a fifteen minute exercise that routinely finds a megabyte of something nobody meant to include.",
          "Two smaller decisions carry more weight than they appear to. A dependency added for one helper function is a maintenance and supply chain cost that never goes away; writing the twelve lines yourself is often correct. And a polyfill for a feature every target browser has shipped for years is pure weight, which is what a browserslist configuration is for: it tells the toolchain what you actually support so it can stop compensating for browsers nobody runs.",
        ],
        why:
          "The module format decides whether a bundler can remove unused code, and the dependency tree decides how much there is to remove. Both are invisible in the source and obvious in the bundle, which is why the analysis is worth looking at rather than reasoning about.",
        inPractice:
          "Most libraries now publish both formats and point bundlers at the ES build, historically through a module field and now through the standard exports map, precisely so that tree shaking is possible. They also declare themselves side-effect free, which is the author's promise that a file may be dropped when nothing imports from it. Where a package does neither, importing one function from it costs the whole package.",
        diagram: {
          caption: "Static imports can be pruned; dynamic ones cannot",
          columns: [
            [{ id: "app", label: "Application", kind: "client" }],
            [
              { id: "esm", label: "ES module import", sub: "known before running", kind: "service" },
              { id: "cjs", label: "require()", sub: "resolved at run time", kind: "service", alternative: true },
            ],
            [{ id: "bundler", label: "Bundler", sub: "sees the whole graph", kind: "edge" }],
            [
              { id: "small", label: "Only what is used", kind: "data" },
              { id: "all", label: "The whole package", kind: "data", alternative: true },
            ],
          ],
          edges: [
            { from: "app", to: "esm" },
            { from: "app", to: "cjs" },
            { from: "esm", to: "bundler", label: "provably unused" },
            { from: "cjs", to: "bundler", label: "cannot prove anything" },
            { from: "bundler", to: "small" },
            { from: "bundler", to: "all" },
          ],
        },
        check: {
          prompt: "Why can a bundler tree shake ES modules but not CommonJS?",
          options: [
            "ES imports are static, so unused exports can be proved unreachable",
            "CommonJS modules are minified separately and cannot be inspected",
            "ES modules are always smaller, so removal has a measurable effect",
            "CommonJS exports are frozen, so removing one would break the object",
          ],
          correctIndex: 0,
          explain:
            "require can be called conditionally with a computed name, so nothing about the graph is knowable before it runs. Static imports let the bundler prove that a function is never reached and drop it.",
        },
        checks: [
          {
            prompt: "Which measure of bundle size is worth tracking?",
            options: [
              "Compressed transfer size of what a first visit needs",
              "Raw size of the whole build output across every route",
              "Number of modules included, which predicts parse time",
              "Size of the largest dependency in the tree, as a proxy",
            ],
            correctIndex: 0,
            explain:
              "The browser downloads compressed bytes and only needs the first route to render. Totals across every route describe a page nobody loads.",
          },
          {
            prompt: "Where does unexpected bundle weight usually come from?",
            options: [
              "Transitive dependencies that no import statement mentions",
              "Source maps, which are shipped alongside the production bundle",
              "The framework runtime, which grows with each release",
              "Duplicated code across routes that the splitter failed to share",
            ],
            correctIndex: 0,
            explain:
              "One small utility can pull in a date library and an internationalisation table, and none of it appears in the line that caused it. Reading the analysis is how it becomes visible.",
          },
          {
            prompt: "What does a browserslist configuration change?",
            options: [
              "How much the toolchain compiles and polyfills for old browsers",
              "Which browsers the application refuses to run in at all",
              "The order in which module formats are resolved at build time",
              "Whether the bundler is permitted to remove unused exports",
            ],
            correctIndex: 0,
            explain:
              "It tells the toolchain what you actually support, so it stops compensating for browsers nobody runs. Stale targets are a common source of weight that no dependency is responsible for.",
          },
        ],
      },
    ],
  },

  {
    id: "sql",
    title: "SQL",
    summary: "Joins, indexes, plans and the queries that get slow at a million rows.",
    track: "languages",
    topics: [
      {
        id: "sql-joins",
        title: "Joins and the relational model",
        level: "beginner",
        body: [
          "SQL is declarative: you describe the result you want and the database decides how to produce it. That is why two queries returning the same rows can differ in cost by orders of magnitude, and why reading the plan matters more than tuning the text.",
          "A join combines rows from two tables on a condition. An inner join keeps only matching pairs; a left join keeps every row from the left side, filling in nulls where there is no match. The most common bug in this area is a left join with a condition on the right table in the WHERE clause, which discards the null rows and silently turns it back into an inner join. Conditions on the outer side belong in the ON clause.",
          "Duplicates are the other classic surprise. Joining to a table with several matching rows multiplies the left rows, so a sum over that result is inflated and looks plausible. When a query starts by adding DISTINCT to fix a total, the real fix is almost always to aggregate the right-hand table first and join to that.",
          "The mental model that keeps this straight is set-based rather than procedural. A query is not a loop over rows; it is a description of a set. Once that clicks, GROUP BY becomes partitioning a set rather than accumulating a variable, and HAVING becomes filtering the groups after aggregation rather than the rows before it, which is the distinction that trips people in interviews.",
        ],
        why: "Thinking in sets rather than in loops is what separates SQL that works from SQL that works on the test data. The two failure modes to recognise are a left join demoted to an inner join by a WHERE clause, and totals inflated by a one-to-many join.",
        inPractice:
          "Every relational engine exposes its plan through EXPLAIN, which is the tool that turns arguments about query style into evidence. Reading one is the fastest way to learn what the optimiser actually does with a join, as opposed to what the syntax implies.",
        diagram: {
          caption: "A condition on the outer side belongs in ON, not in WHERE",
          columns: [
            [{ id: "cust", label: "customers", sub: "every row kept", kind: "data" }],
            [{ id: "join", label: "LEFT JOIN orders", sub: "nulls where no match", kind: "service" }],
            [
              { id: "onc", label: "condition in ON", sub: "still an outer join", kind: "service" },
              { id: "wh", label: "condition in WHERE", sub: "nulls removed", kind: "service", alternative: true },
            ],
            [
              { id: "all", label: "All customers", kind: "data" },
              { id: "inner", label: "Only those with orders", kind: "data", alternative: true },
            ],
          ],
          edges: [
            { from: "cust", to: "join" },
            { from: "join", to: "onc", label: "filters the match" },
            { from: "join", to: "wh", label: "filters the result" },
            { from: "onc", to: "all" },
            { from: "wh", to: "inner", label: "silently an inner join" },
          ],
        },
        check: {
          prompt: "A LEFT JOIN stops returning unmatched rows after a filter is added. Why?",
          options: [
            "The filter references the right table in WHERE, discarding the null rows",
            "Left joins are converted to inner joins when the result set is filtered",
            "The filter changed the join order, so the right table became the left",
            "Null values fail every comparison, so filtered rows are always excluded",
          ],
          correctIndex: 0,
          explain:
            "Unmatched rows have nulls on the right side, and a WHERE condition on those columns removes them. Put the condition in the ON clause to keep the join outer.",
        },
        checks: [
          {
            prompt: "A sum is too high after joining to a table with several matching rows. What is happening?",
            options: [
              "The join multiplied the left rows, so values are counted twice",
              "The aggregate ran before the join, and included unmatched rows",
              "NULLs from the join are being counted as zero in the total",
              "The join used the wrong index, so some rows were read twice",
            ],
            correctIndex: 0,
            explain:
              "One-to-many joins duplicate the left side, and the inflated total looks plausible. Aggregating the right-hand table first and joining to that result is the fix; DISTINCT usually hides the problem rather than solving it.",
          },
          {
            prompt: "What is the difference between WHERE and HAVING?",
            options: [
              "WHERE filters rows before grouping, HAVING filters groups after",
              "WHERE applies to indexed columns, HAVING to computed expressions",
              "WHERE runs on the client, HAVING is evaluated in the database",
              "WHERE is for equality, HAVING is for ranges and aggregates",
            ],
            correctIndex: 0,
            explain:
              "One reduces the input to the grouping, the other reduces the output of it. Putting an aggregate condition in WHERE fails because the aggregate does not exist yet at that point.",
          },
          {
            prompt: "What does thinking in sets rather than in loops change?",
            options: [
              "A query describes a result, so the engine picks how to produce it",
              "Queries execute faster, because sets are stored contiguously",
              "Joins become unnecessary, since sets already contain related rows",
              "Ordering is guaranteed, because sets preserve insertion order",
            ],
            correctIndex: 0,
            explain:
              "SQL is declarative, so two queries returning the same rows can differ enormously in cost. Reading the plan, rather than reasoning about an imagined loop, is what tells you which you wrote.",
          },
        ],
      },
      {
        id: "sql-indexes",
        title: "Indexes and query plans",
        level: "intermediate",
        body: [
          "An index is a sorted structure, usually a B-tree, that lets the database find rows without reading the whole table. It costs storage and slows writes, because every insert and update maintains it, which is why indexing every column is not a strategy.",
          "Composite indexes have an ordering rule that decides half of real query performance: an index on (customer_id, created_at) can serve a lookup by customer, and by customer and date together, and cannot serve a lookup by date alone. It is a phone book sorted by surname then first name. Choosing the column order is choosing which queries the index can answer.",
          "Indexes are also easy to disable by accident. Wrapping a column in a function, comparing it to a different type, or starting a LIKE pattern with a wildcard all force a scan, because the index is sorted by the raw value and the query is asking about something else. Most sudden slowdowns after an innocent change are one of those three.",
          "The way to know rather than guess is EXPLAIN, ideally with ANALYZE so the numbers are measured rather than estimated. What to look for is short: a sequential scan on a large table, an estimated row count far from the actual one, which means the statistics are stale, and a nested loop over many rows where a hash join would be cheaper. A covering index, one that contains every column the query needs, lets the database answer without touching the table at all, which is the largest single win available on a hot read path.",
        ],
        why: "Indexes are the difference between a query that scales and one that works until the table grows. The ordering rule for composite indexes and the three ways to accidentally disable one cover most of what goes wrong in practice.",
        inPractice:
          "Postgres records how often each index is scanned, so identifying the ones that have never been used is a query rather than an opinion. Dropping those speeds up every write and risks nothing that was being read.",
        diagram: {
          caption: "A composite index serves a prefix of its columns, not any subset",
          columns: [
            [{ id: "idx", label: "Index", sub: "(customer_id, created_at)", kind: "data" }],
            [
              { id: "q1", label: "customer_id = 7", sub: "seeks", kind: "service" },
              { id: "q2", label: "customer + date", sub: "seeks", kind: "service" },
              { id: "q3", label: "created_at only", sub: "scans", kind: "service", alternative: true },
            ],
            [{ id: "tbl", label: "Table", sub: "read only where needed", kind: "data" }],
          ],
          edges: [
            { from: "idx", to: "q1", label: "leading column" },
            { from: "idx", to: "q2", label: "full prefix" },
            { from: "idx", to: "q3", label: "no usable prefix" },
            { from: "q3", to: "tbl", label: "every row" },
          ],
        },
        check: {
          prompt: "An index on (customer_id, created_at) exists. Which query cannot use it?",
          options: [
            "One filtering by customer_id and ordering the result by created_at",
            "One filtering by customer_id alone with no date condition at all",
            "One filtering by created_at alone with no customer condition at all",
            "One filtering by both customer_id and created_at with an equality test",
          ],
          correctIndex: 2,
          explain:
            "A composite index is sorted by the first column first, so it can serve a prefix of its columns. Filtering only on the second is like looking someone up in a phone book by first name.",
        },
        checks: [
          {
            prompt: "Which column order is right for a query filtering by customer and sorting by date?",
            options: [
              "Equality column first, then the ordering column: customer, then date",
              "Ordering column first, so the sort can be satisfied by the index",
              "The more selective column first, whichever of the two that is",
              "Either order, since the planner reorders index columns as needed",
            ],
            correctIndex: 0,
            explain:
              "Seeking on the equality column narrows to one contiguous run, and the second column is already ordered within it, so the sort disappears. The reverse order cannot seek at all.",
          },
          {
            prompt: "Why does comparing an indexed column to a different type prevent a seek?",
            options: [
              "The value must be cast, so the query no longer matches the index order",
              "Type mismatches are rejected by the planner before an index is chosen",
              "Indexes store a hash of the value, which differs between types",
              "Casting happens after the rows are fetched, too late to help",
            ],
            correctIndex: 0,
            explain:
              "The index is ordered by the stored type, and the query is asking about a converted value, which is a different ordering. It is the same failure as wrapping the column in a function.",
          },
          {
            prompt: "When is a BRIN index a better fit than a B-tree?",
            options: [
              "On a large append-only column that correlates with physical order",
              "On a column with very few distinct values, such as a status flag",
              "On text columns where prefix search is the dominant query",
              "On any column where the table is too large to index fully",
            ],
            correctIndex: 0,
            explain:
              "It stores summaries per block rather than an entry per row, so it is tiny and only works when the values are already clustered on disk, which is exactly what an append-only timestamp is.",
          },
        ],
      },
      {
        id: "sql-aggregation",
        title: "Aggregation and window functions",
        level: "intermediate",
        body: [
          "GROUP BY collapses rows into one row per group, and every selected column must either be in the group or inside an aggregate, because there is no sensible answer otherwise. WHERE filters rows before grouping and HAVING filters groups after it, which is the distinction that decides whether a query is filtering the input or the result.",
          "Window functions do the other thing people want, which is to compute across related rows while keeping every row. A running total, a rank within each customer, the difference from the previous row, the average over a trailing seven days: each is one OVER clause. Before window functions the same results needed a self-join or application code, and both were slower and harder to read.",
          "The three parts of a window are worth learning as a unit: PARTITION BY chooses the group, ORDER BY chooses the order within it, and the frame chooses how many rows around the current one to include. ROW_NUMBER, RANK and DENSE_RANK differ only in how they treat ties, and choosing wrongly is a quiet way to lose or duplicate rows in a top-N-per-group query.",
          "That top-N-per-group pattern is the one to remember, because it appears constantly: number the rows within each partition by the ordering you care about, then keep those numbered at or below N. It replaces a correlated subquery that gets slower with every group, and it reads as what it does.",
        ],
        why: "Window functions cover the space between one row per row and one row per group, which is where most reporting questions live. Knowing them turns queries that would need application code into a single statement the database can plan.",
        inPractice:
          "Window functions have been in the SQL standard since 2003 and are now in every major engine including SQLite. The top-N-per-group pattern built on ROW_NUMBER is the one worth memorising, because it replaces a correlated subquery that degrades with every group added.",
        diagram: {
          caption: "Grouping collapses rows; a window keeps them",
          columns: [
            [{ id: "rows", label: "Orders", sub: "many per customer", kind: "data" }],
            [
              { id: "grp", label: "GROUP BY customer", sub: "one row out per group", kind: "service" },
              { id: "win", label: "OVER (PARTITION BY customer)", sub: "every row kept", kind: "service" },
            ],
            [
              { id: "tot", label: "Totals", sub: "the orders are gone", kind: "data" },
              { id: "rank", label: "Rank within customer", sub: "top-N per group", kind: "data" },
            ],
          ],
          edges: [
            { from: "rows", to: "grp" },
            { from: "rows", to: "win" },
            { from: "grp", to: "tot" },
            { from: "win", to: "rank", label: "number, then filter" },
          ],
        },
        check: {
          prompt: "You need the three most recent orders per customer in one query. What fits best?",
          options: [
            "GROUP BY customer with an aggregate that returns the latest three orders",
            "ROW_NUMBER partitioned by customer, ordered by date, filtered to three",
            "A correlated subquery selecting the three latest orders for each customer",
            "DISTINCT ON the customer column, ordered so recent orders come first",
          ],
          correctIndex: 1,
          explain:
            "Grouping collapses the rows you want to keep. Numbering within each partition and filtering the numbers is the standard top-N-per-group pattern, and it plans far better than a correlated subquery.",
        },
        checks: [
          {
            prompt: "What is the difference between ROW_NUMBER and RANK on ties?",
            options: [
              "ROW_NUMBER numbers ties arbitrarily, RANK gives them the same rank",
              "ROW_NUMBER skips ties entirely, RANK includes them once each",
              "ROW_NUMBER restarts on a tie, RANK continues the sequence",
              "They are identical unless an explicit frame clause is given",
            ],
            correctIndex: 0,
            explain:
              "Choosing wrongly in a top-N query either drops rows that tied or returns more than N. DENSE_RANK is the third option, which ranks ties equally without leaving gaps afterwards.",
          },
          {
            prompt: "What do the three parts of an OVER clause control?",
            options: [
              "The group, the order within it, and how many rows are in frame",
              "The columns selected, the join order, and the sort direction",
              "The index used, the parallelism, and the memory allocated",
              "The filter, the aggregate function, and the output column name",
            ],
            correctIndex: 0,
            explain:
              "PARTITION BY, ORDER BY and the frame. A running total and a trailing seven-day average differ only in the frame, which is the part most people never set explicitly.",
          },
          {
            prompt: "Why must every selected column be grouped or aggregated?",
            options: [
              "A group collapses many rows, so an ungrouped column has no one value",
              "The planner cannot order results when a column is unconstrained",
              "Grouping rewrites the query as a join, which requires equality",
              "Aggregates are computed before selection, so all columns must exist",
            ],
            correctIndex: 0,
            explain:
              "Which of the fifty names in the group should be returned? There is no defensible answer, which is why the rule exists and why engines that quietly pick one have caused real bugs.",
          },
        ],
      },
      {
        id: "sql-transactions",
        title: "Transactions in practice",
        level: "advanced",
        body: [
          "A transaction groups statements so they succeed or fail together. That much is familiar; what matters in practice is what other transactions can see while yours is running, which is the isolation level, and it is usually left at whatever the database defaults to without anyone choosing it.",
          "Read committed, the common default, means you never see uncommitted data and can see different results if you run the same query twice, because other transactions commit in between. Repeatable read fixes the second query to the same snapshot. Serializable behaves as though transactions ran one after another, and pays for it in aborts under contention. The anomalies these prevent, dirty reads, non-repeatable reads, phantoms and write skew, are worth being able to name because each maps to a real bug.",
          "The practical rule is to keep transactions short and to keep anything slow outside them. A transaction that holds a row lock while calling an external API holds it for the length of that call, and a queue of requests forms behind it. The same applies to user interaction: never hold a transaction open across a form being filled in, which is exactly what optimistic concurrency and a version column exist to replace.",
          "Two more things that catch people. Deadlocks are normal under concurrency and are resolved by the database aborting one transaction, so application code has to be prepared to retry, which means the work must be safe to repeat. And a transaction rolling back does not undo side effects outside the database: emails sent, files written and messages published are gone regardless, which is why those belong after the commit or behind an outbox.",
        ],
        why: "The default isolation level is a decision made for you, and it is right often enough that nobody notices until a report double-counts. Short transactions, an explicit choice of level for the paths that need it, and a retry for deadlocks cover almost every case.",
        inPractice:
          "Postgres defaults to read committed and MySQL InnoDB to repeatable read, so the same application code has different concurrency behaviour on each. Checking which one you are running is a one-line query and is worth doing before the first strange report.",
        diagram: {
          caption: "Locks are held to the end, so what is inside decides what waits",
          columns: [
            [{ id: "begin", label: "BEGIN", kind: "client" }],
            [{ id: "upd", label: "UPDATE order", sub: "row lock taken", kind: "service" }],
            [
              { id: "ext", label: "Call payment provider", sub: "2s, lock still held", kind: "external", alternative: true },
              { id: "after", label: "Call after COMMIT", sub: "nothing waiting", kind: "service" },
            ],
            [{ id: "queue", label: "Everyone else", sub: "queued behind the row", kind: "queue" }],
          ],
          edges: [
            { from: "begin", to: "upd" },
            { from: "upd", to: "ext", label: "inside the transaction" },
            { from: "ext", to: "queue", label: "contention" },
            { from: "upd", to: "after", label: "commit first" },
          ],
        },
        check: {
          prompt: "A transaction holds a row lock while calling a payment provider. What is the consequence?",
          options: [
            "The lock is held for the length of the call, and requests queue behind it",
            "The database aborts the transaction once the call exceeds its timeout",
            "The lock is released automatically while the transaction waits on the network",
            "Other readers see the uncommitted row, since read locks are not held",
          ],
          correctIndex: 0,
          explain:
            "Locks are held until the transaction ends, so an external call inside one converts a slow dependency into database contention. External calls belong outside the transaction, before it or after the commit.",
        },
        checks: [
          {
            prompt: "Two transactions deadlock and one is aborted. What must the application do?",
            options: [
              "Retry it, which means the work has to be safe to repeat",
              "Lower the isolation level so the conflict cannot recur",
              "Serialise the two paths through a queue with one consumer",
              "Increase the lock timeout so the loser waits rather than aborting",
            ],
            correctIndex: 0,
            explain:
              "Deadlocks are normal under concurrency and the database resolves them by killing one participant. Code that cannot retry safely turns a routine event into a failed request.",
          },
          {
            prompt: "A transaction rolls back after an email has been sent. What is the state?",
            options: [
              "The database is unchanged and the email is still gone",
              "Both are reverted, since the send happened inside the transaction",
              "The email is queued for deletion when the rollback completes",
              "The transaction cannot roll back once an external call succeeded",
            ],
            correctIndex: 0,
            explain:
              "Atomicity stops at the database. Anything with an effect outside it belongs after the commit or behind an outbox, which is the whole reason that pattern exists.",
          },
          {
            prompt: "Why keep transactions short?",
            options: [
              "Locks are held for the whole transaction, so others queue behind it",
              "The database limits how long any single transaction may run",
              "Long transactions are rolled back automatically at a checkpoint",
              "Short transactions can be batched by the engine into one commit",
            ],
            correctIndex: 0,
            explain:
              "Every lock taken is held until the end, so a slow call inside one converts a slow dependency into database contention, and under MVCC it also holds back cleanup for the whole table.",
          },
        ],
      },
      {
        id: "sql-schema",
        title: "Schema design and constraints",
        level: "intermediate",
        body: [
          "A schema is the one place a rule can be enforced for every writer, including the script somebody runs by hand at midnight and the service written next year by someone who never read your validation code. That is the argument for putting constraints in the database rather than only in the application: application checks hold for the paths that remember them, and constraints hold for all of them.",
          "The ones that earn their keep are unremarkable. NOT NULL, so a column that must have a value cannot quietly hold nothing. Foreign keys, so a row cannot reference something that does not exist. Unique constraints, which are the honest way to express at most one of these and are also how you make an upsert safe under concurrency. CHECK constraints for the small invariants, such as a quantity that cannot be negative.",
          "Nullable columns deserve more suspicion than they get, because NULL is not a value but the absence of one, and it propagates: any comparison with it is unknown rather than false, so a filter excluding one value also excludes the nulls unless you say otherwise. Every nullable column is a branch in every query that touches it, so the question is always whether absence is genuinely a state this thing can be in.",
          "Choose types deliberately rather than by habit. A timestamp with a time zone rather than without, because the version without one stores an instant with no way of knowing what it meant. Text rather than a guessed length limit, since the constraint belongs where it can be validated with a reason. A decimal type or integer minor units for money. An enumerated type or a lookup table for a fixed set, so a typo is rejected rather than persisted.",
          "Migrations are part of the design, not an afterthought. Every change should be reversible, applied in a version-controlled sequence rather than by hand on a console, and safe with both the old and the new application running, which is what expand and contract exists for. A schema that can only be changed during downtime is a schema that stops changing.",
        ],
        why:
          "Constraints are the only validation that holds for every writer, and they are checked by the database rather than by the code path that happened to be used. Everything else in schema design follows from deciding what must always be true and then saying so where it cannot be bypassed.",
        inPractice:
          "A unique constraint is what makes INSERT ON CONFLICT safe under concurrency: without it, a check-then-insert races and two rows appear. That is the same read-then-write gap as any other race condition, closed by the database rather than by the application.",
        diagram: {
          caption: "A rule in code holds for one path; a constraint holds for all of them",
          columns: [
            [
              { id: "api", label: "API", sub: "validates", kind: "service" },
              { id: "job", label: "Batch job", sub: "different code path", kind: "service" },
              { id: "hand", label: "Console at midnight", sub: "no validation at all", kind: "service", alternative: true },
            ],
            [
              { id: "app", label: "Application check", sub: "only where remembered", kind: "edge", alternative: true },
              { id: "db", label: "Constraint", sub: "checked on every write", kind: "edge" },
            ],
            [{ id: "data", label: "The table", sub: "invariant holds, or does not", kind: "data" }],
          ],
          edges: [
            { from: "api", to: "app" },
            { from: "job", to: "db" },
            { from: "hand", to: "db", label: "still checked" },
            { from: "app", to: "data", label: "one path covered" },
            { from: "db", to: "data", label: "every path covered" },
          ],
        },
        check: {
          prompt: "Why put a rule in a constraint rather than only in application code?",
          options: [
            "It is enforced for every writer, including paths written later",
            "It is faster, since the database checks it closer to the data",
            "It produces a clearer error message than application validation",
            "It allows the rule to be changed without deploying the application",
          ],
          correctIndex: 0,
          explain:
            "Application checks cover the code paths that call them. A constraint covers the batch job, the migration, the other service and the console session, which is where the violations actually come from.",
        },
        checks: [
          {
            prompt: "Why is a nullable column a cost in every query that touches it?",
            options: [
              "Comparisons with NULL are unknown, so filters exclude those rows",
              "Nullable columns cannot be indexed in most relational engines",
              "The planner cannot estimate selectivity when nulls are present",
              "Nulls are stored out of line, so reading them costs an extra fetch",
            ],
            correctIndex: 0,
            explain:
              "NULL is the absence of a value rather than a value, so a filter for anything other than one value silently drops it too. Every nullable column is a branch someone has to remember.",
          },
          {
            prompt: "What does a unique constraint provide beyond rejecting duplicates?",
            options: [
              "It makes an upsert safe under concurrency, closing the insert race",
              "It orders the rows, so range scans can be served from the constraint",
              "It allows the column to be used as a foreign key from other tables",
              "It prevents the column from being updated once it has been written",
            ],
            correctIndex: 0,
            explain:
              "Checking whether a row exists and then inserting it is two statements with a gap. The constraint lets the database settle the race, which is the same fix as any other read-then-write bug.",
          },
          {
            prompt: "Which timestamp type should be the default?",
            options: [
              "With a time zone, so the stored instant is unambiguous",
              "Without a time zone, since storing UTC by convention is simpler",
              "An integer of epoch seconds, which avoids the question entirely",
              "A string in ISO format, which is readable in any client",
            ],
            correctIndex: 0,
            explain:
              "Without one, a timestamp is a number whose meaning depends on a convention nobody wrote down, and the convention differs between the two services reading it.",
          },
        ],
      },
    ],
  },
];
