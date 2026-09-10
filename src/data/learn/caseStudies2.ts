import type { Card } from "./types";

/* Two more case studies, chosen because they exercise decisions the first five
   do not. Payments is the money case: idempotency, a ledger that must balance,
   and outcomes that arrive minutes after the request. Web search is the scale
   case: a crawl nobody controls, an index too large for one machine, and a
   query that fans out to thousands of shards and is as slow as the slowest.

   Everything attributed here is published: Stripe's documented behaviour, and
   Google's own papers on Percolator and the Caffeine indexing system. */

export const caseStudies2: Card[] = [
  {
    id: "payments",
    title: "Payments: charging a card without charging it twice",
    summary: "Authorisation and capture, idempotency under retries, a ledger that must balance, and outcomes that arrive later.",
    track: "case-study",
    topics: [
      {
        id: "payments-flow",
        sources: [
          {
            label: "Stripe: the payment intents lifecycle",
            url: "https://docs.stripe.com/payments/paymentintents/lifecycle",
            supports: "That the flow is modelled as a state machine with an identifier, including a requires-action state, which exists because European strong customer authentication makes authorisation genuinely multi-step.",
          },
        ],
        title: "Authorisation, capture and settlement",
        level: "beginner",
        body: [
          "A card payment is not one event. Authorisation asks the issuing bank to check the card and hold the amount, and it succeeds or declines within a second or two. Capture tells the network to actually take the held money, and it can happen immediately or days later. Settlement is the movement of funds between banks, which happens in batches and takes days. Three steps, three different latencies, and three different things that can fail.",
          "Splitting authorisation from capture is what makes normal commerce work. A shop authorises when you order and captures when the item ships, because charging for something not yet sent is both a refund waiting to happen and, in many jurisdictions, not allowed. An authorisation expires if it is not captured, typically within about a week depending on the card scheme and the merchant category, and an expired authorisation means the money was never taken and the customer saw a pending charge that vanished.",
          "The failure that defines the domain is that the network can time out at any point and the timeout tells you nothing. A request that times out during authorisation may have been authorised, or not. There is no way to tell from the timeout itself, so the system must be able to ask afterwards, which is why every payment has an identifier the merchant chose before sending it and why looking up by that identifier is a first-class operation rather than an afterthought.",
          "Regional rules add a second asynchronous step. In Europe, strong customer authentication under PSD2 means many payments require the cardholder to confirm through their bank, so the flow pauses, hands the customer to the issuer, and resumes on the way back. Any design that treats authorisation as a single synchronous call will meet this and have nowhere to put it.",
          "The shape that survives all of this is a state machine with an identifier: created, requires action, authorised, captured, failed, refunded. Each transition is recorded, each is idempotent, and the current state is the answer to the question a support ticket is really asking, which is what happened to this payment and when.",
        ],
        why: "The three steps have different latencies and different failure modes, so a design that models a payment as one call has already lost. The identifier chosen before the request leaves is what makes a timeout recoverable, because it is the only way to ask afterwards what happened.",
        inPractice:
          "Stripe models this explicitly as a payment intent with a lifecycle, including a state for requires action, which exists because European strong customer authentication makes the flow genuinely multi-step rather than a single call that sometimes takes longer.",
        diagram: {
          caption: "Three steps, three latencies, and a timeout that answers nothing",
          columns: [
            [{ id: "order", label: "Order placed", sub: "merchant id assigned", kind: "client" }],
            [{ id: "auth", label: "Authorise", sub: "seconds, holds funds", kind: "service" }],
            [{ id: "cap", label: "Capture", sub: "at dispatch, days later", kind: "service" }],
            [{ id: "settle", label: "Settlement", sub: "batched, days", kind: "data" }],
            [
              { id: "expire", label: "Auth expires", sub: "never captured", kind: "external", alternative: true },
              { id: "unknown", label: "Timeout", sub: "authorised, or not", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "order", to: "auth" },
            { from: "auth", to: "cap", label: "hold released or taken" },
            { from: "cap", to: "settle", label: "funds move" },
            { from: "auth", to: "expire", label: "if capture never comes", async: true },
            { from: "auth", to: "unknown", label: "network gave no answer", async: true },
          ],
        },
        check: {
          prompt: "Why do merchants authorise at order time and capture at dispatch?",
          options: [
            "The hold reserves the funds without taking money for goods not yet sent",
            "Authorisation is cheaper, so capturing later reduces processing fees",
            "Capture cannot be performed until the issuing bank has settled",
            "It gives the customer a window in which to cancel without a refund",
          ],
          correctIndex: 0,
          explain:
            "The hold proves the money is there and does not move it. Taking payment for something not yet shipped is a refund waiting to happen, and in several jurisdictions it is not permitted.",
        },
        checks: [
          {
            prompt: "A payment request times out. What does that tell you about whether it succeeded?",
            options: [
              "Nothing, which is why the merchant assigns an identifier beforehand",
              "That it failed, since a successful authorisation always responds",
              "That it succeeded, since the network commits before responding",
              "That it will be retried automatically by the acquiring bank",
            ],
            correctIndex: 0,
            explain:
              "The request may have been processed and the response lost. An identifier chosen before sending is what makes it possible to ask afterwards, which is the only way to find out.",
          },
          {
            prompt: "What happens to an authorisation that is never captured?",
            options: [
              "It expires, releasing the hold, and no money is ever taken",
              "It captures automatically at the end of the settlement window",
              "It converts to a pending charge that the customer must dispute",
              "It remains open indefinitely until the merchant cancels it",
            ],
            correctIndex: 0,
            explain:
              "The customer sees a pending amount that later disappears, which generates support contact even though nothing was charged. It is why capture windows are a design constraint rather than a detail.",
          },
          {
            prompt: "Why does European strong customer authentication change the shape of the flow?",
            options: [
              "The customer is handed to their bank mid-payment, so the flow pauses",
              "Every payment must be captured within a shorter regulatory window",
              "Authorisation and capture must be performed in a single request",
              "The merchant must store the authentication result for seven years",
            ],
            correctIndex: 0,
            explain:
              "It introduces a genuine intermediate state where the payment is waiting on the cardholder. A design that models authorisation as one synchronous call has nowhere to put it.",
          },
        ],
      },
      {
        id: "payments-idempotency",
        sources: [
          {
            label: "Stripe: idempotent requests",
            url: "https://docs.stripe.com/api/idempotent_requests",
            supports: "That an idempotency key is required on payment creation, that the stored result is returned for any repeat, and that keys are retained for 24 hours, which is what makes the guarantee finite and explicit.",
          },
        ],
        title: "Idempotency when the retry is inevitable",
        level: "intermediate",
        body: [
          "Everything in the previous topic makes retries certain. The network times out, the client gives up, the user presses the button again, the queue redelivers, the deploy restarts a worker mid-flight. A payments API that is not idempotent will double-charge, and the only question is how often.",
          "The mechanism is a key chosen by the client, unique per logical operation rather than per attempt, sent with the request and stored server-side alongside the outcome. A repeat of the same key returns the stored result rather than doing the work again. That distinction, per operation and not per attempt, is where implementations go wrong: a key regenerated on retry makes every attempt a new payment, which is precisely the situation it was meant to prevent.",
          "The concurrency is the hard half, because two retries can arrive at the same instant. Recording the key after the work completes lets both pass the check and both charge. Recording it before, with a unique constraint, means the second insert collides and can be refused, which is why the standard shape is to insert the key immediately in a pending state, do the work, then update it with the result. A concurrent duplicate gets a conflict, and a caller receiving that knows to retry rather than to assume failure.",
          "Then there is the crash between charging and recording, which no single database can prevent because the charge happened somewhere else. This is why the stored record must be written in the same transaction as the local state change, and why the result of the remote call is recovered by asking the provider about the merchant's identifier rather than by guessing. A pending key older than a few minutes is stale and must be resolved by looking it up, not by retrying blindly.",
          "Stripe stores idempotency keys for 24 hours, which is a deliberate boundary rather than an implementation limit: retries beyond that horizon are no longer the same operation in any meaningful sense, and a key reused a week later is treated as a new request. Choosing that window is a real design decision, and choosing to keep keys forever is a slow leak with a large table at the end of it.",
        ],
        why: "A timeout is ambiguous, so the system must be able to tell a retry from a new request, and no amount of care at the call site can substitute for that. The interesting part is not storing a key, it is what happens when two retries arrive at once and what happens when the process died between charging and recording.",
        inPractice:
          "Stripe requires an idempotency key on payment creation and retains the record for 24 hours, returning the original result for any repeat within that window. The window is the part worth copying: it makes the guarantee finite and explicit rather than unbounded and vague.",
        diagram: {
          caption: "Insert the key first, so a concurrent retry collides instead of charging",
          columns: [
            [
              { id: "r1", label: "Attempt 1", sub: "key abc", kind: "client" },
              { id: "r2", label: "Attempt 2", sub: "key abc, concurrent", kind: "client" },
            ],
            [{ id: "keys", label: "Idempotency table", sub: "unique constraint", kind: "data" }],
            [
              { id: "work", label: "Charge the card", sub: "once", kind: "service" },
              { id: "conflict", label: "Conflict returned", sub: "retry, do not assume failure", kind: "edge" },
            ],
            [{ id: "result", label: "Stored result", sub: "returned to both", kind: "data" }],
          ],
          edges: [
            { from: "r1", to: "keys", label: "insert pending" },
            { from: "r2", to: "keys", label: "insert collides" },
            { from: "keys", to: "work", label: "winner proceeds" },
            { from: "keys", to: "conflict", label: "loser waits" },
            { from: "work", to: "result", label: "update the row" },
          ],
        },
        check: {
          prompt: "Two retries with the same idempotency key arrive at the same moment. What prevents a double charge?",
          options: [
            "The key is inserted before the work, so the second insert collides",
            "The provider deduplicates identical requests within a short window",
            "The second request is queued behind the first by the load balancer",
            "The charge is wrapped in a transaction, so one of them rolls back",
          ],
          correctIndex: 0,
          explain:
            "Recording the key after the work lets both pass the check. Inserting first under a unique constraint makes the database settle the race, which is the same fix as any other read-then-write gap.",
        },
        checks: [
          {
            prompt: "Why must the idempotency key be per operation rather than per attempt?",
            options: [
              "A key regenerated on retry makes every attempt a separate payment",
              "The provider rejects keys that have been seen more than once",
              "Per-attempt keys cannot be stored within the retention window",
              "The signature covers the key, so it must remain constant",
            ],
            correctIndex: 0,
            explain:
              "The key identifies the logical thing being done. Minting a fresh one for each try recreates exactly the situation it exists to prevent, and it is a common bug in client libraries written in a hurry.",
          },
          {
            prompt: "A process crashed between charging and recording the result. How is it resolved?",
            options: [
              "Ask the provider about the merchant's identifier for that payment",
              "Retry the charge, since the previous attempt clearly did not complete",
              "Mark the key as failed and allow the customer to try again",
              "Wait for the daily settlement file, which lists successful charges",
            ],
            correctIndex: 0,
            explain:
              "The charge happened outside your database, so no local transaction covers it. Looking it up by the identifier you chose before sending is the only way to learn what actually happened.",
          },
          {
            prompt: "Why store idempotency keys for a bounded window rather than forever?",
            options: [
              "A retry a week later is not the same operation in any useful sense",
              "Longer retention weakens the uniqueness guarantee of the key",
              "The provider will not honour a key older than its own window",
              "Keys must expire before the corresponding payment is settled",
            ],
            correctIndex: 0,
            explain:
              "It makes the guarantee finite and explicit, and keeps the table from growing forever. Stripe's 24 hours is the widely copied choice, and the reasoning matters more than the number.",
          },
        ],
      },
      {
        id: "payments-ledger",
        title: "The ledger, and why it is double entry",
        level: "advanced",
        body: [
          "A balance stored as a number on a row is a design that cannot answer the questions a payments system is asked. It says what the balance is and not how it got there, so a discrepancy has no explanation, a correction destroys the evidence, and two processes updating it race. Every serious money system stores movements rather than balances, and derives the balance by summing them.",
          "Double entry is the discipline that makes those movements checkable. Every transaction writes at least two entries that sum to zero: money leaving one account and arriving in another, with fees and taxes as their own accounts rather than as adjustments. If the sum of all entries is not zero, something is wrong, and that check can run continuously rather than being noticed by a customer.",
          "Entries are append only. A mistake is corrected by writing a compensating entry, not by editing history, which means the record of what happened and the record of what should have happened both survive. That is a requirement in regulated environments and it is also simply how you keep the ability to explain a balance to somebody who disagrees with it.",
          "The performance question that always follows is whether summing entries is too slow, and the answer is that you keep a materialised balance and treat it as a cache of the truth rather than as the truth. It is recomputed and compared, and a mismatch is an alert rather than a silent correction, which is exactly the property a stored-balance design cannot offer.",
          "The last piece is that a ledger entry is not a payment. The payment is a state machine with an external dependency; the ledger is an internal record of money that has moved. Keeping them separate means an authorisation that never captures leaves no ledger entry, a refund is two entries rather than a subtraction, and a dispute writes entries of its own. Collapsing the two produces a ledger that has to model card network semantics, which is where the design stops being explainable.",
        ],
        why: "Storing movements rather than balances is what makes a discrepancy explainable, and double entry is what makes it detectable without a customer reporting it. The balance is still there as a materialised value, but it is a cache of a derivation rather than the source of truth.",
        inPractice:
          "Stripe has written about running a ledger as the system of record for money movement, and the pattern is near-universal in financial infrastructure for the same reason accountants adopted it centuries ago: an invariant that holds on every write is worth more than a number that is usually right.",
        diagram: {
          caption: "Movements are the truth; the balance is a derivation you check",
          columns: [
            [{ id: "ev", label: "Payment captured", sub: "one business event", kind: "client" }],
            [
              { id: "e1", label: "Debit customer", sub: "+100.00", kind: "data" },
              { id: "e2", label: "Credit merchant", sub: "-97.10", kind: "data" },
              { id: "e3", label: "Credit fees", sub: "-2.90", kind: "data" },
            ],
            [{ id: "zero", label: "Entries sum to zero", sub: "checked continuously", kind: "edge" }],
            [
              { id: "bal", label: "Stored balance", sub: "recomputed and compared", kind: "data" },
              { id: "stored", label: "Balance as a column", sub: "no explanation, races", kind: "data", alternative: true },
            ],
          ],
          edges: [
            { from: "ev", to: "e1" },
            { from: "ev", to: "e2" },
            { from: "ev", to: "e3" },
            { from: "e1", to: "zero" },
            { from: "zero", to: "bal", label: "derived" },
            { from: "ev", to: "stored", label: "the tempting shortcut", async: true },
          ],
        },
        check: {
          prompt: "Why store movements rather than a balance column?",
          options: [
            "A balance says what, and movements say how it got there",
            "Movements are cheaper to write than an update to one row",
            "A balance column cannot be indexed for historical queries",
            "Movements avoid the need for transactions across accounts",
          ],
          correctIndex: 0,
          explain:
            "A discrepancy in a stored balance has no explanation and correcting it destroys the evidence. Entries make the balance a derivation, which is what lets you tell somebody exactly why they have the balance they have.",
        },
        checks: [
          {
            prompt: "What does double entry give you that single entry does not?",
            options: [
              "An invariant that can be checked continuously: entries sum to zero",
              "Faster reads, because both sides of a transaction are indexed",
              "The ability to store fees without a separate account for them",
              "Immutability, which single-entry ledgers cannot provide",
            ],
            correctIndex: 0,
            explain:
              "It is a checkable property on every write rather than a reconciliation somebody performs later, which is why the discipline survived from paper into distributed systems.",
          },
          {
            prompt: "A ledger entry was written with the wrong amount. What is the correct fix?",
            options: [
              "Write a compensating entry, leaving both records in place",
              "Update the entry, since the ledger must reflect reality",
              "Delete the entry and write a corrected one in its place",
              "Recompute the balance and store the corrected value",
            ],
            correctIndex: 0,
            explain:
              "Append-only means history survives, so what happened and what should have happened are both visible. That is a regulatory requirement in many contexts and a debugging necessity in all of them.",
          },
          {
            prompt: "Why keep the payment state machine separate from the ledger?",
            options: [
              "A payment has external states; the ledger records money that moved",
              "The ledger cannot express failure, so payments need their own store",
              "Payments are transient and ledgers are permanent, so they scale apart",
              "Regulators require the two to be stored in separate systems",
            ],
            correctIndex: 0,
            explain:
              "An authorisation that never captures moves no money and writes no entry. Collapsing them forces the ledger to model card network semantics, which is where it stops being explainable.",
          },
        ],
      },
      {
        id: "payments-async",
        title: "Outcomes that arrive later",
        level: "intermediate",
        body: [
          "Plenty of what happens to a payment happens after the response. A bank authorisation can be reversed. A dispute arrives weeks later. A bank transfer that looked successful can fail days afterwards. A subscription renews on a schedule nobody is watching. So the merchant needs a channel for outcomes that were not available at request time, which is what webhooks are for.",
          "That makes webhook handling a core part of a payments integration rather than an optional convenience, and it inherits every property of delivery over an unreliable network. Events can arrive twice, out of order, or after a long delay while a receiver was down. Handlers must be idempotent by event id, must tolerate an older event arriving after a newer one, and must not assume that the absence of an event means the absence of the outcome.",
          "The reconciliation of local state with the provider's is where the design earns its keep. A merchant's database and a payment provider's are two systems with no shared transaction, so they will disagree at some point. Treating the webhook as the only source of updates makes a missed delivery permanent, which is why a periodic sweep that asks the provider about anything in a non-final state is a required component and not a belt-and-braces addition.",
          "Ordering deserves a specific mention because payments make it visible. A charge succeeded event and a charge refunded event delivered out of order will, in a naive handler, leave a refunded payment marked as succeeded. Handlers that check the state transition rather than applying the event blindly, or that fetch the current object rather than trusting the payload, avoid a whole family of these bugs.",
          "The user-facing consequence is that the interface has to be honest about pending. Telling somebody their payment succeeded when it has only been accepted produces the worst possible support conversation later. Showing a state that can still change, and notifying when it does, is both more accurate and, in practice, less alarming than a success that quietly reverses.",
        ],
        why: "The response to the request is not the outcome, which means the merchant's state is a prediction until the provider confirms it. Everything else here, idempotent handlers, tolerance of reordering, and a sweep for anything still pending, is a consequence of that one fact.",
        inPractice:
          "Stripe signs every webhook with an HMAC and a timestamp and retries failed deliveries with backoff over a period of days, and its guidance is to treat the event as a signal to fetch the current object rather than as the state itself. That last point removes the reordering problem entirely.",
        diagram: {
          caption: "The response is a prediction; the webhook and the sweep are the confirmation",
          columns: [
            [{ id: "req", label: "Charge request", sub: "returns accepted", kind: "client" }],
            [{ id: "local", label: "Local state", sub: "pending", kind: "data" }],
            [
              { id: "hook", label: "Webhook", sub: "may arrive twice, or late", kind: "queue" },
              { id: "sweep", label: "Periodic sweep", sub: "asks about non-final states", kind: "service" },
            ],
            [{ id: "final", label: "Confirmed state", sub: "and the user is told", kind: "data" }],
          ],
          edges: [
            { from: "req", to: "local", label: "optimistic" },
            { from: "local", to: "hook", label: "usually arrives" },
            { from: "local", to: "sweep", label: "when it does not" },
            { from: "hook", to: "final" },
            { from: "sweep", to: "final" },
          ],
        },
        check: {
          prompt: "Why is a periodic sweep required even with reliable webhooks?",
          options: [
            "A missed delivery would otherwise leave local state wrong permanently",
            "Webhooks cannot carry enough data to update a payment record",
            "Providers only send webhooks for successful outcomes, not failures",
            "The sweep is what triggers the provider to resend failed events",
          ],
          correctIndex: 0,
          explain:
            "Two systems with no shared transaction will disagree eventually. Asking about anything still in a non-final state converts a permanent inconsistency into a delay of one sweep interval.",
        },
        checks: [
          {
            prompt: "A refunded event arrives before the succeeded event for the same charge. What prevents the wrong final state?",
            options: [
              "Treating the event as a signal to fetch the current object",
              "Rejecting any event whose timestamp is older than the last seen",
              "Queueing events per charge so they are processed in arrival order",
              "Requiring the provider to guarantee ordering for a single object",
            ],
            correctIndex: 0,
            explain:
              "Fetching removes the ordering problem entirely, because the provider's current state is authoritative regardless of which notification arrived first. Sequence numbers work too and are more code.",
          },
          {
            prompt: "Why should the interface show pending rather than success on acceptance?",
            options: [
              "The outcome can still change, and a reversal is a worse conversation",
              "Regulations require a pending state to be displayed to the customer",
              "It delays the confirmation email until the provider has confirmed",
              "Pending states are excluded from a merchant's dispute statistics",
            ],
            correctIndex: 0,
            explain:
              "Accepted is not settled. Being honest about a state that can still change is more accurate and, in practice, generates less support contact than a success that quietly reverses.",
          },
          {
            prompt: "What must a webhook handler be able to tolerate?",
            options: [
              "Duplicates, reordering, and long delays after a receiver outage",
              "Events for payments that were never created by this merchant",
              "Payloads whose signature cannot be verified against any secret",
              "Being called concurrently by several providers for one event",
            ],
            correctIndex: 0,
            explain:
              "Those three follow from delivery over an unreliable network. Unsigned or unknown events should be rejected outright rather than tolerated, which is a different requirement.",
          },
        ],
      },
      {
        id: "payments-failures",
        title: "Declines, retries and the cost of trying again",
        level: "advanced",
        body: [
          "Declines are not errors in the usual sense. A hard decline means the card is closed, stolen or invalid and will never work; retrying is pointless and, at volume, damages the merchant's standing with the networks. A soft decline means insufficient funds or a temporary block, and a retry in a few days has a genuine chance. Treating the two identically is the most common expensive mistake in subscription billing.",
          "The reason to care is that the response codes are the only signal, and they are coarse. Issuers deliberately do not explain much, partly for fraud reasons, so a system has to map a small set of codes into a policy: retry, retry later with a different strategy, or stop and ask the customer. Getting that mapping wrong shows up as either lost revenue or an unhappy conversation with a payment provider about retry ratios.",
          "For recurring payments, the practice built on this is dunning: a schedule of retries spread over days, combined with messages to the customer, because many failures are fixed by the cardholder rather than by the system. The retries are timed to when they are more likely to succeed, such as after a typical payday, and the whole sequence has an end, after which the subscription is cancelled rather than retried indefinitely.",
          "Network-level failures need the opposite instinct. Where a decline is an answer, a timeout is the absence of one, and retrying a timeout without an idempotency key is how double charges happen. So the two paths must be distinguished in code: a decline is a business outcome to be recorded and acted on, a timeout is an unknown to be resolved by lookup before anything else is attempted.",
          "Card details also expire and change, which is a background failure mode with a documented remedy: account updater services that keep stored credentials current, and network tokens that survive a card being reissued. For a business with stored cards, that machinery recovers a meaningful share of otherwise-lost revenue, and it is invisible to anyone who has not been told it exists.",
        ],
        why: "A decline is an answer and a timeout is not, and confusing them produces either double charges or abandoned revenue. The rest is policy: which codes are worth retrying, on what schedule, and when to stop and involve the customer instead of the system.",
        inPractice:
          "Subscription platforms publish their retry schedules and report recovering a substantial share of failed payments through timed retries and customer messaging, which is why dunning exists as a named product feature rather than as an implementation detail.",
        diagram: {
          caption: "Three outcomes, three completely different responses",
          columns: [
            [{ id: "attempt", label: "Charge attempt", kind: "client" }],
            [
              { id: "hard", label: "Hard decline", sub: "card closed or invalid", kind: "external" },
              { id: "soft", label: "Soft decline", sub: "insufficient funds", kind: "external" },
              { id: "timeout", label: "Timeout", sub: "no answer at all", kind: "external", alternative: true },
            ],
            [
              { id: "stop", label: "Stop, ask the user", kind: "service" },
              { id: "dun", label: "Scheduled retries", sub: "days, then give up", kind: "service" },
              { id: "lookup", label: "Look it up first", sub: "never retry blind", kind: "service" },
            ],
          ],
          edges: [
            { from: "attempt", to: "hard" },
            { from: "attempt", to: "soft" },
            { from: "attempt", to: "timeout" },
            { from: "hard", to: "stop" },
            { from: "soft", to: "dun" },
            { from: "timeout", to: "lookup" },
          ],
        },
        check: {
          prompt: "What is the difference between a hard and a soft decline?",
          options: [
            "One will never succeed; the other may succeed on a later attempt",
            "One comes from the issuer; the other from the acquiring bank",
            "One is returned synchronously; the other arrives by webhook",
            "One can be disputed by the merchant; the other cannot",
          ],
          correctIndex: 0,
          explain:
            "Retrying a hard decline is pointless and, at volume, harms the merchant's standing with the networks. Retrying a soft decline on a sensible schedule recovers real revenue.",
        },
        checks: [
          {
            prompt: "Why must a timeout be handled differently from a decline?",
            options: [
              "A decline is an answer; a timeout means the outcome is unknown",
              "A timeout is always a temporary failure and should be retried at once",
              "Declines are billable events, whereas timeouts are not charged for",
              "A timeout indicates a merchant configuration error rather than a card one",
            ],
            correctIndex: 0,
            explain:
              "Retrying an unknown without an idempotency key is exactly how a customer gets charged twice. The unknown must be resolved by looking the payment up before anything else happens.",
          },
          {
            prompt: "What is dunning?",
            options: [
              "A schedule of retries and customer messages for failed recurring payments",
              "The process of matching a bank statement against internal records",
              "The dispute process initiated by a cardholder with their issuer",
              "The mechanism that updates stored card details when a card is reissued",
            ],
            correctIndex: 0,
            explain:
              "Many recurring failures are fixed by the cardholder rather than by the system, so the sequence combines timed retries with messages and has a defined end rather than continuing indefinitely.",
          },
          {
            prompt: "What recovers revenue lost to cards being reissued?",
            options: [
              "Account updater services and network tokens that survive reissue",
              "Retrying the old card details until the new ones are presented",
              "Storing the card verification value so the card can be re-authorised",
              "Falling back to a bank transfer when the stored card fails",
            ],
            correctIndex: 0,
            explain:
              "Stored credentials go stale as cards expire and get replaced. That machinery keeps them current and is invisible to anyone who has not been told it exists.",
          },
        ],
      },
      {
        id: "payments-reconciliation",
        title: "Reconciliation, and the money that does not match",
        level: "advanced",
        body: [
          "At the end of every day, three records exist of the same money: what the merchant's system believes, what the payment provider reports, and what the bank actually moved. They will not agree exactly, and the job of reconciliation is to explain every difference rather than to hope there are none.",
          "Most differences are timing rather than error. A capture on one side of midnight and a settlement on the other, a refund issued today and settled in three days, a payout batching Friday and Saturday together. A reconciliation process that cannot express in flight will produce alarming numbers every single day and will therefore be ignored, which is worse than not having one.",
          "The differences that are not timing fall into a small set: a payment recorded locally that the provider has never heard of, usually a request that timed out and was never resolved; a provider payment with no local record, usually a webhook that was missed and a sweep that never ran; and amount mismatches, usually fees or currency conversion applied somewhere the local model does not represent.",
          "Which is why the reconciliation is also the test of everything upstream. A system with correct idempotency, a working sweep and an honest ledger reconciles with a small, explainable set of in-flight items. A system without them reconciles with a list of mysteries, and the mysteries are the same bugs described in the earlier topics arriving in aggregate at the end of the month.",
          "The operational shape that works is a daily automated match with a named owner for the exceptions, and a small tolerance that is a deliberate decision rather than an accident. Rounding in currency conversion is real, and pretending otherwise produces an exception queue nobody can clear. What matters is that the tolerance is written down, monitored for drift, and never used to absorb a difference that is growing.",
        ],
        why: "Reconciliation is where every upstream mistake becomes visible, which makes it a test of the system rather than an accounting chore. The measure of a payments integration is not whether the numbers match, it is whether every difference has an explanation somebody can give.",
        inPractice:
          "Providers publish settlement reports precisely so that merchants can perform this match, and the presence of a payment in one system and not the other is the standard way an unresolved timeout is finally discovered, often weeks after the request that caused it.",
        diagram: {
          caption: "Three records of the same money, and the differences that need explaining",
          columns: [
            [
              { id: "local", label: "Merchant ledger", kind: "data" },
              { id: "psp", label: "Provider report", kind: "data" },
              { id: "bank", label: "Bank statement", kind: "data" },
            ],
            [{ id: "match", label: "Daily match", sub: "with a stated tolerance", kind: "service" }],
            [
              { id: "flight", label: "In flight", sub: "timing, expected", kind: "data" },
              { id: "orphan", label: "Local only", sub: "unresolved timeout", kind: "external", alternative: true },
              { id: "missed", label: "Provider only", sub: "missed webhook, no sweep", kind: "external", alternative: true },
            ],
          ],
          edges: [
            { from: "local", to: "match" },
            { from: "psp", to: "match" },
            { from: "bank", to: "match" },
            { from: "match", to: "flight", label: "explainable" },
            { from: "match", to: "orphan", label: "a bug upstream" },
            { from: "match", to: "missed", label: "a bug upstream" },
          ],
        },
        check: {
          prompt: "A payment exists in the merchant's system and not in the provider's. What is the usual cause?",
          options: [
            "A request that timed out and was never resolved by lookup",
            "A refund that has been issued but has not yet settled",
            "A currency conversion applied by the provider after capture",
            "A payout batching two days of activity into one transfer",
          ],
          correctIndex: 0,
          explain:
            "The local record was written optimistically and the request may never have reached the provider. It is the idempotency and lookup gap from earlier, arriving weeks later as a reconciliation exception.",
        },
        checks: [
          {
            prompt: "Why must reconciliation model in-flight items explicitly?",
            options: [
              "Otherwise timing differences look like errors and nobody reads it",
              "Otherwise the provider will not release the daily settlement report",
              "Otherwise the ledger cannot be closed off at the end of the day",
              "Otherwise refunds are counted twice, once on each of the two sides",
            ],
            correctIndex: 0,
            explain:
              "Captures and settlements straddle midnight every day. A process that reports those as discrepancies produces alarm daily and is therefore not read, which is worse than not running it.",
          },
          {
            prompt: "What does a clean reconciliation actually demonstrate?",
            options: [
              "That idempotency, the sweep and the ledger are all working upstream",
              "That the provider has not made an error in its settlement report",
              "That no customer has disputed a payment during the period",
              "That the tolerance has been set wide enough to absorb rounding",
            ],
            correctIndex: 0,
            explain:
              "Every upstream defect becomes a difference here. A short, explainable exception list is evidence about the system, not merely about the arithmetic.",
          },
          {
            prompt: "How should a reconciliation tolerance be handled?",
            options: [
              "Written down and monitored, never used to absorb a growing gap",
              "Set generously, so that the exception queue stays manageable",
              "Removed entirely, since any difference at all indicates a defect",
              "Adjusted monthly to match the rounding differences observed",
            ],
            correctIndex: 0,
            explain:
              "Currency rounding is real, so some tolerance is honest. A tolerance that quietly widens is how a genuine and growing discrepancy hides inside a process designed to find it.",
          },
        ],
      },
    ],
  },

  {
    id: "web-search",
    title: "Web search: crawl, index, rank",
    summary: "Crawling a web nobody controls, an index too large for one machine, and a query that is as slow as its slowest shard.",
    track: "case-study",
    topics: [
      {
        id: "search-crawl",
        sources: [
          {
            label: "RFC 9309: robots exclusion protocol",
            url: "https://www.rfc-editor.org/rfc/rfc9309.html",
            supports: "That the protocol dates from 1994 and was only standardised in 2022, having been honoured by convention for nearly thirty years.",
          },
        ],
        title: "Crawling a web nobody controls",
        level: "intermediate",
        body: [
          "A crawler is a breadth-first traversal of a graph with no map, no schema and no cooperation. The frontier, the set of URLs known and not yet fetched, is the central data structure, and it is not a simple queue: it has to be prioritised by importance and freshness, deduplicated, and partitioned so that the same host is not being fetched by twenty machines at once.",
          "Politeness is the constraint that shapes everything. A crawler must respect robots.txt, must rate limit per host rather than globally, and must identify itself so an operator can block it. This is not only courtesy: a crawler that hammers a small site is a denial of service, and the practical consequence of getting it wrong is being blocked by exactly the sites you wanted.",
          "So the frontier is partitioned by host, with one queue per host drained at a polite rate and many hosts in flight simultaneously. That single design decision explains why a crawl is wide rather than deep, and why crawl capacity is measured in hosts and politeness delays rather than in raw bandwidth.",
          "The web then attacks the crawler in ways nobody designs for. Infinite calendars generate a new URL for every future date. Session identifiers make every visit a new address. Redirect chains loop. Pages are generated by JavaScript and are empty without a renderer, which turns a cheap fetch into an expensive browser. Each of these needs a specific defence: URL normalisation, depth and pattern limits, budget per host, and a decision about which pages are worth rendering.",
          "The last problem is knowing when to come back. Content changes at wildly different rates, so recrawl is scheduled per URL from observed change frequency: a news front page in minutes, an archived page in months. Getting that wrong wastes the crawl budget on pages that never change while missing the ones that do, which is the trade the freshness topic later returns to.",
        ],
        why: "The frontier is the system. Everything a crawler does well or badly, politeness, coverage, freshness and resistance to traps, is a property of how that queue is prioritised and partitioned rather than of how fast it can fetch.",
        inPractice:
          "The robots exclusion protocol dates from 1994 and was only standardised as RFC 9309 in 2022, having been honoured by convention for nearly thirty years. That is a useful reminder that a great deal of the web works on agreement rather than enforcement.",
        diagram: {
          caption: "One queue per host, drained politely, many hosts at once",
          columns: [
            [{ id: "seed", label: "Seeds, then links", kind: "client" }],
            [{ id: "norm", label: "Normalise, dedupe", sub: "sessions, sorting, case", kind: "service" }],
            [{ id: "front", label: "Frontier", sub: "partitioned by host", kind: "queue" }],
            [
              { id: "h1", label: "example.com", sub: "1 request every few seconds", kind: "external" },
              { id: "h2", label: "other.com", sub: "own rate", kind: "external" },
            ],
            [{ id: "trap", label: "Traps", sub: "calendars, loops, ids", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "seed", to: "norm" },
            { from: "norm", to: "front", label: "prioritised" },
            { from: "front", to: "h1", label: "robots respected" },
            { from: "front", to: "h2" },
            { from: "norm", to: "trap", label: "budget and pattern limits", async: true },
          ],
        },
        check: {
          prompt: "Why is a crawler's frontier partitioned by host?",
          options: [
            "So each host is fetched at a polite rate while many are in flight",
            "So the index can be sharded along the same boundary later",
            "So a failing host does not block the rest of the queue",
            "So robots.txt only has to be fetched once per partition",
          ],
          correctIndex: 0,
          explain:
            "Rate limiting has to be per host, because the constraint is somebody else's server. Partitioning that way is what lets the crawl be wide and fast without being hostile to any individual site.",
        },
        checks: [
          {
            prompt: "What is a crawler trap?",
            options: [
              "A pattern generating unlimited URLs, such as an infinite calendar",
              "A page that blocks crawlers through robots.txt after being fetched",
              "A redirect to a competitor's site to waste the crawl budget",
              "A page that renders differently for crawlers than for browsers",
            ],
            correctIndex: 0,
            explain:
              "Calendars, session identifiers and redirect loops all generate address space without content. The defences are normalisation, pattern and depth limits, and a budget per host.",
          },
          {
            prompt: "How should recrawl frequency be decided?",
            options: [
              "Per URL, from how often that page has actually been observed to change",
              "Uniformly, so that every known page is refreshed on the same cycle",
              "By page depth, since deeper pages change less often than shallow ones",
              "By host popularity, refreshing the largest sites most frequently",
            ],
            correctIndex: 0,
            explain:
              "A news front page and an archived article differ by orders of magnitude. A uniform schedule spends the budget on pages that never change and misses the ones that do.",
          },
          {
            prompt: "Why does JavaScript rendering complicate a crawl?",
            options: [
              "A cheap fetch becomes an expensive browser for each rendered page",
              "Rendered pages cannot be deduplicated against their unrendered form",
              "Robots directives cannot be applied to dynamically generated content",
              "Rendering requires the crawler to execute code from an untrusted host",
            ],
            correctIndex: 0,
            explain:
              "The cost per page rises by orders of magnitude, so rendering becomes a budgeted decision about which pages deserve it rather than something applied to everything.",
          },
        ],
      },
      {
        id: "search-dedup",
        sources: [
          {
            label: "Manku, Jain and Das Sarma, Detecting near-duplicates for web crawling (WWW 2007)",
            url: "https://dl.acm.org/doi/10.1145/1242572.1242592",
            supports: "That SimHash was described by Google researchers for exactly this problem, finding near-duplicate web pages at crawl scale by looking for fingerprints within a small Hamming distance.",
          },
        ],
        title: "Duplicates, canonicals and near-identical pages",
        level: "advanced",
        body: [
          "A large fraction of the web is duplicated. The same article is syndicated across a dozen sites, the same product page exists under printable, mobile and tracking-parameter variants, and entire sites are mirrored. An index that stores every copy wastes space and, far worse, returns ten results that are the same page, which is a bad result set no ranking improvement can rescue.",
          "Exact duplicates are cheap to detect: hash the normalised content and compare. That catches mirrors and identical variants and misses everything interesting, because most duplication is near-duplication with a different header, an inserted advertisement or a changed date.",
          "Near-duplicate detection is where the technique gets specific. Shingling breaks the document into overlapping word sequences and compares the sets, and comparing every pair is quadratic, so a fingerprinting scheme is used instead: MinHash estimates set similarity from a small signature, and SimHash produces a hash where similar documents differ in few bits, making near-duplicates findable by looking for hashes within a small Hamming distance. Both turn an impossible comparison into an index lookup.",
          "Choosing which copy to keep is a ranking problem in itself. The canonical should be the version most likely to be wanted: the original publisher rather than the syndicator, the version without tracking parameters, the one with the most inbound links. Publishers can state a preference with a canonical link element, which is a hint from an interested party and therefore treated as evidence rather than as instruction.",
          "The consequence for the results page is diversity. Even after canonicalisation, ten results from one domain about the same topic is a worse answer than a mix, so the final ranking applies clustering and per-site limits. That is a deliberate reduction in per-result relevance for a large increase in the usefulness of the page as a whole, which is a trade worth recognising because it appears in every ranked list of anything.",
        ],
        why: "Deduplication is not a storage optimisation, it is a results-quality feature: ten copies of one page is a failed search regardless of how relevant each copy is. The techniques matter because near-duplication is the common case and exact matching cannot see it.",
        inPractice:
          "SimHash was published by Google researchers and described for exactly this problem, finding near-duplicate web pages at crawl scale, which is why the technique appears in nearly every large crawler built since.",
        diagram: {
          caption: "Fingerprints turn a quadratic comparison into a lookup",
          columns: [
            [{ id: "pages", label: "Crawled pages", sub: "many near-identical", kind: "data" }],
            [
              { id: "hash", label: "Exact hash", sub: "catches mirrors only", kind: "service" },
              { id: "sim", label: "SimHash or MinHash", sub: "similar means close", kind: "service" },
            ],
            [{ id: "cluster", label: "Duplicate cluster", sub: "one canonical chosen", kind: "data" }],
            [{ id: "serp", label: "Results page", sub: "diversity enforced", kind: "edge" }],
          ],
          edges: [
            { from: "pages", to: "hash" },
            { from: "pages", to: "sim", label: "the common case" },
            { from: "hash", to: "cluster" },
            { from: "sim", to: "cluster", label: "small Hamming distance" },
            { from: "cluster", to: "serp", label: "one per cluster" },
          ],
        },
        check: {
          prompt: "Why is exact hashing insufficient for web deduplication?",
          options: [
            "Most duplication is near-duplication, differing by ads or a date",
            "Hashes collide too often at web scale to be used for comparison",
            "Hashing requires the full document, which is not always crawled",
            "Exact hashes cannot be computed for pages rendered by JavaScript",
          ],
          correctIndex: 0,
          explain:
            "A syndicated article with a different header is a different byte sequence and the same content. Fingerprints designed so similar documents hash to nearby values are what make that case findable.",
        },
        checks: [
          {
            prompt: "What problem does SimHash solve that pairwise comparison does not?",
            options: [
              "It makes near-duplicate detection a lookup rather than a quadratic scan",
              "It compresses the document so that storage costs fall proportionally",
              "It detects duplication across languages by normalising to a common form",
              "It identifies which copy of a duplicate set should be canonical",
            ],
            correctIndex: 0,
            explain:
              "Comparing every pair of billions of documents is not available at any budget. A hash where similar inputs land close together turns the search into an index probe.",
          },
          {
            prompt: "How should a publisher's canonical link be treated?",
            options: [
              "As evidence from an interested party, weighed with other signals",
              "As an instruction, since the publisher owns the content in question",
              "As irrelevant, because it can be set by anyone hosting a copy",
              "As authoritative only when both pages are on the same domain",
            ],
            correctIndex: 0,
            explain:
              "It is useful information supplied by someone with an interest in the outcome, which is exactly the definition of a signal to weigh rather than a command to obey.",
          },
          {
            prompt: "Why limit how many results come from one site?",
            options: [
              "A page of ten near-identical answers is worse than a mixed one",
              "Sites are rate limited on click-through as well as on crawling",
              "Ranking scores are unreliable when comparing pages within a domain",
              "It prevents any single publisher from dominating the index size",
            ],
            correctIndex: 0,
            explain:
              "It trades a little per-result relevance for a large gain in the usefulness of the page as a whole, which is the same diversity trade that appears in every ranked list of anything.",
          },
        ],
      },
      {
        id: "search-index",
        title: "An index too large for one machine",
        level: "advanced",
        body: [
          "The index is inverted: each term points at the list of documents containing it, with positions so that phrases can be matched. At web scale those posting lists are enormous, so they are compressed aggressively, using delta encoding of document identifiers and variable-length integers, because the index is read constantly and every byte saved is bandwidth and cache.",
          "It cannot live on one machine, so it is sharded, and the choice of how is consequential. Sharding by document means each shard holds a slice of the corpus and a query goes to every shard, which is more network traffic and balances naturally. Sharding by term means a query touches only the shards holding its terms, which sounds efficient and produces terrible skew, because a common term's posting list is vast and multi-term queries need intersections across machines. Document sharding wins in practice, and the fan-out that follows is the defining property of search serving.",
          "Documents are assigned identifiers in an order that makes compression effective, typically by clustering similar or related documents so that posting lists contain runs of nearby identifiers. That is an unglamorous decision that changes index size by a large factor, and it illustrates a general point: the encoding and the ordering are as much of the design as the structure.",
          "Tiering is the other lever. Not every document deserves the same treatment, so an index is split into a small tier of high-quality documents held in memory and larger tiers on cheaper storage. Most queries are answered from the top tier, and the lower tiers are consulted only when the top does not produce enough good results, which is what makes the economics work at all.",
          "Updates make this harder than a static structure. Posting lists are expensive to modify in place, so new documents accumulate in a small fresh index and are merged into the main one periodically, with deletions handled by a separate list of identifiers to suppress. That is the same design as a log-structured merge tree, arrived at independently for the same reason, which is that sequential writes and periodic merges beat random updates at scale.",
        ],
        why: "Sharding by document is what forces every query to touch every shard, which sets the shape of serving and makes tail latency the central problem. Everything else here, compression, identifier ordering, tiering and merge-based updates, exists because the index is read far more often than it is written.",
        inPractice:
          "Search engines and log stores converge on the same answer for updates, an immutable main index plus a small fresh segment merged periodically, because in-place modification of compressed posting lists is prohibitively expensive.",
        diagram: {
          caption: "Sharded by document, so every query goes everywhere",
          columns: [
            [{ id: "q", label: "Query", kind: "client" }],
            [{ id: "root", label: "Root", sub: "fans out, merges back", kind: "edge" }],
            [
              { id: "s1", label: "Shard 1", sub: "slice of the corpus", kind: "data" },
              { id: "s2", label: "Shard 2", kind: "data" },
              { id: "s3", label: "Shard 3", kind: "data" },
            ],
            [
              { id: "hot", label: "Top tier", sub: "in memory", kind: "data" },
              { id: "cold", label: "Lower tiers", sub: "consulted if needed", kind: "data" },
            ],
          ],
          edges: [
            { from: "q", to: "root" },
            { from: "root", to: "s1" },
            { from: "root", to: "s2" },
            { from: "root", to: "s3" },
            { from: "s1", to: "hot", label: "most queries stop here" },
            { from: "s1", to: "cold", label: "when results are thin" },
          ],
        },
        check: {
          prompt: "Why is a web index sharded by document rather than by term?",
          options: [
            "Term sharding skews badly and forces intersections across machines",
            "Document sharding lets a query skip shards that lack its terms",
            "Term sharding cannot support phrase queries with position data",
            "Document sharding produces smaller posting lists per shard",
          ],
          correctIndex: 0,
          explain:
            "A common term's posting list is enormous, so term sharding concentrates load and multi-term queries need cross-machine intersections. Document sharding balances naturally, at the cost of fanning every query out to everyone.",
        },
        checks: [
          {
            prompt: "What does index tiering achieve?",
            options: [
              "Most queries are answered from a small high-quality tier in memory",
              "Each tier holds a different language, so queries route by locale",
              "Posting lists are split by frequency, so common terms stay small",
              "Updates are applied to one tier at a time, avoiding full rebuilds",
            ],
            correctIndex: 0,
            explain:
              "Not every document deserves the same treatment. Serving most traffic from a small resident tier and consulting cheaper storage only when needed is what makes the economics work.",
          },
          {
            prompt: "Why are new documents held in a small separate index and merged later?",
            options: [
              "Compressed posting lists are expensive to modify in place",
              "New documents must be scored before they can join the main index",
              "Merging allows deletions to be applied without rewriting anything",
              "The main index is read-only for legal and auditing reasons",
            ],
            correctIndex: 0,
            explain:
              "It is the log-structured merge design arrived at independently: sequential writes plus periodic merges beat random updates, which is why deletions are handled by a suppression list rather than by editing.",
          },
          {
            prompt: "Why does the order in which document identifiers are assigned matter?",
            options: [
              "Nearby identifiers compress far better in delta-encoded posting lists",
              "Identifiers determine which shard a document is assigned to",
              "Lower identifiers are served from the faster tier by convention",
              "The order defines the default ranking when scores are tied",
            ],
            correctIndex: 0,
            explain:
              "Clustering related documents produces runs of nearby identifiers, which delta encoding stores in very few bits. It is an unglamorous decision that changes total index size by a large factor.",
          },
        ],
      },
      {
        id: "search-serving",
        sources: [
          {
            label: "Dean and Barroso, The Tail at Scale (CACM, 2013)",
            url: "https://research.google/pubs/the-tail-at-scale/",
            supports: "The fan-out arithmetic and the mitigations described here, including hedged and tied requests, and the result that at 100 servers a one per cent component tail produces a 63 per cent request tail.",
          },
        ],
        title: "Serving a query in under a second",
        level: "advanced",
        body: [
          "A query arrives, is parsed and expanded with synonyms and spelling corrections, and is sent to every shard. Each shard finds its candidates, scores them cheaply, and returns its best few. A root node merges those, applies expensive scoring to the small combined set, adds diversity rules and returns the page. The whole thing has a budget measured in a few hundred milliseconds.",
          "The dominant problem is tail latency, and it is arithmetic rather than bad luck. If a query touches a thousand shards and each has a one per cent chance of taking longer than a second, the chance that at least one does is essentially certain, so the median shard's latency is irrelevant and the request is as slow as its slowest participant. Dean and Barroso's tail at scale paper is the canonical treatment, and the numbers are why every large fan-out system takes the mitigations seriously.",
          "The mitigations are specific. Hedged requests: send a duplicate to a second replica after a short delay and take whichever answers first, which costs a few per cent more work and removes most of the tail. Tied requests, where the two replicas coordinate so the loser drops its copy. Micro-partitioning so slow shards can be rebalanced. And returning early with what has arrived, because a slightly incomplete result page delivered on time is better than a complete one that missed the budget.",
          "Caching helps less than intuition suggests and still matters. Query popularity is a long tail, so a cache of full result pages hits on the head of the distribution and misses on most of the traffic. Caching posting list intersections and per-shard partial results is more effective, and the freshness of everything cached has to be bounded because the index behind it keeps changing.",
          "The design principle underneath is that a request touching a thousand machines cannot depend on all of them behaving. It must be able to answer with most of them, cut off the ones that are late, and degrade the result rather than the deadline. That is the same shed-load-deliberately argument as anywhere else, applied at the level of a single query.",
        ],
        why: "Fan-out to a thousand shards makes the tail the median. That single fact explains hedged requests, early return with partial results, and why a search engine is engineered around latency budgets rather than around throughput.",
        inPractice:
          "Dean and Barroso reported that in a system where each of 100 servers has a 1% chance of exceeding a second, 63% of requests exceed a second, which is the clearest statement of why tail latency dominates any fan-out design.",
        diagram: {
          caption: "The slowest shard decides, so cut it off",
          columns: [
            [{ id: "q", label: "Query", sub: "budget: a few hundred ms", kind: "client" }],
            [{ id: "root", label: "Root", sub: "fan out, then merge", kind: "edge" }],
            [
              { id: "fast", label: "999 shards", sub: "answer quickly", kind: "data" },
              { id: "slow", label: "1 shard", sub: "slow this second", kind: "data", alternative: true },
            ],
            [
              { id: "hedge", label: "Hedged copy", sub: "sent after a short delay", kind: "service" },
              { id: "partial", label: "Return partial", sub: "on time, slightly incomplete", kind: "service" },
            ],
          ],
          edges: [
            { from: "q", to: "root" },
            { from: "root", to: "fast" },
            { from: "root", to: "slow", label: "sets the latency" },
            { from: "slow", to: "hedge", label: "second replica" },
            { from: "root", to: "partial", label: "budget spent" },
          ],
        },
        check: {
          prompt: "Why does the median shard latency barely matter in a fan-out query?",
          options: [
            "The request is as slow as its slowest shard, and there are many",
            "The root discards the slowest results before it merges them",
            "Shards are queried in sequence, so the median value compounds",
            "The median is measured per shard rather than per whole request",
          ],
          correctIndex: 0,
          explain:
            "With a thousand participants, an event that is rare per shard is near-certain per request. That is why the whole serving design is built around cutting off, duplicating and returning early.",
        },
        checks: [
          {
            prompt: "What does a hedged request cost and buy?",
            options: [
              "A few per cent more work, and it removes most of the latency tail",
              "Double the work, and it guarantees a response within the budget",
              "No extra work, since only one replica is contacted at a time",
              "Extra storage, since both replicas must hold identical indexes",
            ],
            correctIndex: 0,
            explain:
              "Sending the duplicate only after a short delay means it fires on the small fraction of requests that are already slow, which is why the overhead is small and the effect on the tail is large.",
          },
          {
            prompt: "Why is caching whole result pages less effective than it sounds?",
            options: [
              "Query popularity is a long tail, so most traffic misses the cache",
              "Result pages are personalised, so no two users share an entry",
              "The index changes constantly, so entries are invalidated immediately",
              "Pages are too large to cache economically at query volume",
            ],
            correctIndex: 0,
            explain:
              "The head of the distribution is cacheable and it is not where most of the traffic is. Caching intersections and partial per-shard results reaches further into the tail.",
          },
          {
            prompt: "What is the right response when the latency budget is nearly spent?",
            options: [
              "Return what has arrived, accepting a slightly incomplete result",
              "Extend the budget, since an incomplete answer is not an answer",
              "Retry the slow shards, since a second attempt is usually faster",
              "Fail the query, so the client can decide whether to retry it",
            ],
            correctIndex: 0,
            explain:
              "A page delivered on time missing one shard's contribution is better than a complete one that missed the deadline. It is deliberate degradation applied to a single request.",
          },
        ],
      },
      {
        id: "search-freshness",
        sources: [
          {
            label: "Peng and Dabek, Large-scale incremental processing using distributed transactions and notifications (OSDI 2010)",
            url: "https://research.google/pubs/large-scale-incremental-processing-using-distributed-transactions-and-notifications/",
            supports: "The figures quoted here: the previous pipeline fed documents through roughly a hundred MapReduces over two to three days, and the incremental replacement moved the median document more than a hundred times faster and cut the average age of a document in results by half, at the same daily volume.",
          },
        ],
        title: "Freshness: from batch to incremental",
        level: "advanced",
        body: [
          "For years the index was rebuilt in batches. Google's pre-Caffeine pipeline ran crawled documents through roughly a hundred sequential MapReduce stages, and a document took two to three days to travel from being crawled to being searchable. That was acceptable when the web changed slowly and unacceptable once it did not.",
          "The reason batch was chosen first is worth stating plainly, because it is the same trade everywhere: batch processing is simple, restartable and efficient per document, and it is inherently latent, because a stage cannot start until the previous one has finished with everything. Adding one new document meant waiting for the next full pass.",
          "Caffeine, the indexing system Google moved to in 2010, replaced that with incremental processing built on Percolator, which added transactions and change notifications on top of the storage layer so that a single document could be updated in place and trigger the work that depends on it. The published result is precise: the same number of documents processed per day, the median document moving through more than a hundred times faster, and the average age of a document in results cut by half.",
          "The cost of that is real and worth naming: incremental processing runs many small distributed transactions instead of a few enormous batch jobs, so the system uses substantially more resources per document and is far more complex to operate. Google's own paper is explicit that the trade was made for latency rather than efficiency, which is the honest way to describe most moves from batch to streaming.",
          "The general lesson generalises well beyond search. Batch is the correct default because it is simple and cheap; incremental is what you buy when the age of the data is a product problem rather than an engineering preference. And the way to know which you are in is to ask what changes when the data is two days old, which for a search engine in a world with breaking news is quite a lot.",
        ],
        why: "This is the clearest published example of the batch to incremental trade, with numbers on both sides: a hundredfold improvement in latency, bought with more resources per document and considerably more operational complexity. Most streaming decisions are the same trade with less measurement.",
        inPractice:
          "Google's Percolator paper reports that the previous system fed crawled documents through about a hundred MapReduces with a two to three day pipeline, and that the incremental replacement cut the average age of a document in search results by 50% at the same daily volume.",
        diagram: {
          caption: "The same documents per day, arriving a hundred times sooner",
          columns: [
            [{ id: "crawl", label: "Crawled document", kind: "client" }],
            [
              { id: "batch", label: "Batch pipeline", sub: "about 100 MapReduces", kind: "service", alternative: true },
              { id: "inc", label: "Incremental", sub: "transactions and triggers", kind: "service" },
            ],
            [
              { id: "slow", label: "2 to 3 days", sub: "to become searchable", kind: "external", alternative: true },
              { id: "fast", label: "Minutes", sub: "median 100x faster", kind: "data" },
            ],
            [{ id: "cost", label: "The bill", sub: "more resource per document", kind: "edge" }],
          ],
          edges: [
            { from: "crawl", to: "batch" },
            { from: "crawl", to: "inc" },
            { from: "batch", to: "slow" },
            { from: "inc", to: "fast" },
            { from: "inc", to: "cost", label: "bought with complexity", async: true },
          ],
        },
        check: {
          prompt: "What did Google's move from batch indexing to Percolator-based indexing buy?",
          options: [
            "Latency: the median document became searchable far sooner",
            "Efficiency: the same freshness for substantially fewer resources",
            "Coverage: many more documents crawled and indexed per day",
            "Simplicity: fewer moving parts than the MapReduce pipeline",
          ],
          correctIndex: 0,
          explain:
            "The published result is the same daily volume with the average document age in results halved. It cost more resources per document and more operational complexity, which the paper states plainly.",
        },
        checks: [
          {
            prompt: "Why is a batch pipeline inherently latent?",
            options: [
              "Every stage waits for the one before it to finish with everything",
              "Batches are scheduled overnight, when spare capacity is cheapest",
              "Each stage checkpoints its output before the next one may read it",
              "Documents are processed in order of importance rather than arrival",
            ],
            correctIndex: 0,
            explain:
              "Adding one document means waiting for the next full pass. That is what makes batch simple and restartable, and it is the same property that makes it slow to reflect a change.",
          },
          {
            prompt: "What did Percolator add on top of the storage layer?",
            options: [
              "Transactions and change notifications, so a document could trigger work",
              "A faster distributed file system for reading the crawled pages back",
              "A scheduler that prioritised documents by their expected importance",
              "A compression scheme that made posting lists cheaper to update in place",
            ],
            correctIndex: 0,
            explain:
              "Those two together are what make incremental processing possible: a document can be updated in place, and whatever depends on it can be woken to react.",
          },
          {
            prompt: "How should the batch or incremental decision be made in general?",
            options: [
              "By asking what changes when the data is a day old",
              "By measuring which uses fewer resources at today's volume",
              "By choosing incremental, since latency always improves things",
              "By starting incremental and falling back if it proves complex",
            ],
            correctIndex: 0,
            explain:
              "Batch is simpler and cheaper and is the right default. Incremental is what you buy when the age of the data is a product problem, which for search in a world with breaking news it plainly is.",
          },
        ],
      },
      {
        id: "search-ranking",
        title: "Ranking, and knowing whether it improved",
        level: "advanced",
        body: [
          "Matching produces thousands of documents and the page shows ten, so ranking is the product. The signals fall into three groups: how well the document matches the query, how good the document is independent of any query, and what the person is likely to want given their language, location and context.",
          "Query-independent quality is the idea that made web search work. PageRank treated a link as a vote and weighted votes by the authority of the linking page, which gave a way to tell an authoritative page from a keyword-stuffed one at a time when text matching alone could not. It is one signal among hundreds now, and the principle it established, that the structure of the graph carries information the documents do not, long outlived the specific formula.",
          "Modern ranking is a learned function over those signals, trained on labelled judgements and behavioural data, and the interesting engineering is the pipeline shape rather than the model. Cheap scoring runs on every candidate in every shard, and expensive scoring runs only on the small set the root has already merged, because the expensive model cannot be run on a million documents inside the latency budget. That two-stage retrieve-then-rerank pattern is now the standard shape for search and recommendation systems generally.",
          "Adversaries are a permanent part of the problem, which is unusual among ranked systems. Every published signal becomes a target, so link farms, keyword stuffing, cloaking and generated content all exist because ranking exists. That is why signals are numerous, partly undisclosed and constantly adjusted, and it is why a search team spends as much effort on defending the ranking as on improving it.",
          "Knowing whether a change helped is the hardest part and is entirely a measurement problem. Human raters give labelled judgements against published guidelines, offline metrics compare rankings against those labels, and online experiments measure what people actually did. Both are needed because they answer different questions: the offline number says the ranking matches expert judgement, and the experiment says it changed behaviour, and a change can move one without the other.",
        ],
        why: "Ranking is where a search engine is judged, and the two things that make it tractable are the two-stage pipeline, which keeps expensive scoring off the hot path, and a measurement discipline that can tell an improvement from a change. Without the second, ranking work is a matter of opinion.",
        inPractice:
          "The retrieve-then-rerank shape, cheap scoring across all candidates followed by an expensive model over a few hundred, is now standard well beyond search, appearing in recommendation systems and in retrieval-augmented generation for the same reason: the good model is too slow to run on everything.",
        diagram: {
          caption: "Cheap scoring everywhere, expensive scoring on what survives",
          columns: [
            [{ id: "q", label: "Query", kind: "client" }],
            [{ id: "shards", label: "All shards", sub: "cheap scoring", kind: "data" }],
            [{ id: "root", label: "Merged candidates", sub: "a few hundred", kind: "edge" }],
            [{ id: "model", label: "Expensive model", sub: "learned ranking", kind: "service" }],
            [{ id: "eval", label: "Did it help?", sub: "raters and experiments", kind: "data" }],
          ],
          edges: [
            { from: "q", to: "shards", label: "millions of candidates" },
            { from: "shards", to: "root", label: "top few per shard" },
            { from: "root", to: "model", label: "affordable here" },
            { from: "model", to: "eval", label: "measured both ways", async: true },
          ],
        },
        check: {
          prompt: "Why is ranking split into cheap scoring and expensive reranking?",
          options: [
            "The expensive model cannot run on every candidate within the budget",
            "Cheap scoring is more accurate on large candidate sets than a model",
            "Shards cannot execute a learned model without a shared feature store",
            "Reranking is only applied when the cheap scores are close together",
          ],
          correctIndex: 0,
          explain:
            "Millions of candidates and a few hundred milliseconds do not permit an expensive model everywhere. Narrowing first and scoring properly afterwards is the standard shape well beyond search.",
        },
        checks: [
          {
            prompt: "What did PageRank contribute that text matching could not?",
            options: [
              "A query-independent quality signal derived from the link graph",
              "A way to match documents that use different words for one concept",
              "A method for detecting duplicate pages across different domains",
              "A ranking that adapts to the individual searcher's history",
            ],
            correctIndex: 0,
            explain:
              "Treating links as weighted votes distinguished an authoritative page from a keyword-stuffed one. It is one signal among hundreds now, and the principle that the graph carries information the text does not has outlived the formula.",
          },
          {
            prompt: "Why are ranking signals numerous and partly undisclosed?",
            options: [
              "Every published signal immediately becomes a target for manipulation",
              "Disclosure would allow competitors to reproduce the ranking exactly",
              "Signals change too often for any published list to stay accurate",
              "Users would lose confidence if the weighting were fully visible",
            ],
            correctIndex: 0,
            explain:
              "Link farms, keyword stuffing and cloaking exist because ranking exists. Search is unusual among ranked systems in having a permanent adversary, which shapes how the signals are designed and described.",
          },
          {
            prompt: "Why are both human ratings and live experiments needed?",
            options: [
              "One says it matches expert judgement, the other that behaviour changed",
              "Human ratings are cheaper, and experiments confirm them at lower cost",
              "Experiments cannot detect regressions, which the ratings identify early",
              "Ratings are required for compliance, and experiments for engineering",
            ],
            correctIndex: 0,
            explain:
              "They answer different questions and a change can move one without the other. Relying on either alone is how a ranking gets better on a metric and worse for the people using it.",
          },
        ],
      },
    ],
  },
];
