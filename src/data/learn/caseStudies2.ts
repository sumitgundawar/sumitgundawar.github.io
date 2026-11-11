import type { Card } from "./types";

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
        level: "advanced",
        body: [
          "A card payment is not one event. Authorisation asks the issuing bank to check the card and hold the amount, and it succeeds or declines within a second or two. Capture tells the network to actually take the held money, and it can happen immediately or days later. Settlement is the movement of funds between banks, which happens in batches and takes days. Three steps, three different latencies, and three different things that can fail.",
          "Splitting authorisation from capture is what makes normal commerce work. A shop authorises when you order and captures when the item ships, because charging for something not yet sent is both a refund waiting to happen and, in many jurisdictions, not allowed. An authorisation expires if it is not captured, typically within about a week depending on the card scheme and the merchant category, and an expired authorisation means the money was never taken and the customer saw a pending charge that vanished.",
          "The failure that defines the domain is that the network can time out at any point and the timeout tells you nothing. A request that times out during authorisation may have been authorised, or not. There is no way to tell from the timeout itself, so the system must be able to ask afterwards, which is why every payment has an identifier the merchant chose before sending it and why looking up by that identifier is a first-class operation rather than an afterthought.",
          "Regional rules add a second asynchronous step. In Europe, strong customer authentication under PSD2 means many payments require the cardholder to confirm through their bank, so the flow pauses, hands the customer to the issuer, and resumes on the way back. Any design that treats authorisation as a single synchronous call will meet this and have nowhere to put it.",
          "The shape that survives all of this is a state machine with an identifier: created, requires action, authorised, captured, failed, refunded. Each transition is recorded, each is idempotent, and the current state is the answer to the question a support ticket is really asking, which is what happened to this payment and when.",
      "The state machine has to be driven by the provider's record rather than by your own optimism, and that inverts the usual control flow. Because the network can time out after the charge succeeded, the only safe reconciliation is to ask the provider what it believes using the idempotency key you sent, rather than to infer from your own timeout that nothing happened. This is why the durable design records the intent before calling out, treats the absence of a response as unknown rather than as failure, and has a sweep that resolves unknowns against the provider's list endpoint on a schedule.",
      "Money movement also does not line up with the transaction lifecycle, which is what makes reconciliation a separate discipline rather than a report. Funds settle in batches on the provider's schedule, fees are deducted at a different point, refunds and chargebacks arrive days or months later, and currency conversion happens at a rate fixed at a moment you did not choose. A ledger that models only authorisation and capture will therefore disagree with the bank statement permanently, and the disagreement is not an error but the consequence of recording one side of a process whose other side moves on its own clock.",
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
          "SimHash is Charikar's technique, published in 2002. Google researchers showed five years later that it works at crawl scale for finding near-duplicate web pages, which is why it appears in nearly every large crawler built since.",
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
      {
        id: "search-pagerank",
        sources: [
          {
            label: "Brin and Page, The anatomy of a large-scale hypertextual web search engine",
            url: "http://snap.stanford.edu/class/cs224w-readings/Brin98Anatomy.pdf",
            supports:
              "The random surfer formulation of PageRank, the damping factor, and the argument that the link graph carries quality signal that page text alone does not.",
          },
        ],
        title: "PageRank: the link as a judgement",
        level: "advanced",
        body: [
          "Early search ranked on the page itself: how often the words appeared, whether they were in the title. That is trivially gamed, because the author of a page controls every one of those signals. Stuffing a thousand invisible keywords into the footer cost nothing and worked.",
          "The insight Brin and Page built on is that a link is a signal the page's own author does not control. Someone else chose to point at it. Model a reader who clicks links at random forever, with a small probability of jumping to a random page instead, and the share of time spent on each page is its PageRank. Formally it is the stationary distribution of that walk, computed by multiplying a vector against the link matrix repeatedly until it stops moving.",
          "The random jump is not decoration. Without it the walk gets trapped in pages that link only to each other, and the maths has no unique answer. With it the chain is guaranteed to converge, which is the difference between an idea and an algorithm.",
          "What eroded it is predictable in hindsight: once the signal was known to be valuable, links became a market. Paid links, link farms and comment spam all exist to manufacture the one thing the author was not supposed to control. Modern ranking uses hundreds of signals partly because any single signal that matters enough will be attacked.",
        ],
        why: "The durable lesson is not PageRank, it is that the signals worth trusting are the ones the subject cannot set for themselves. That reasoning survives into fraud scoring and abuse detection.",
        check: {
          prompt: "What made the link graph a better quality signal than page text?",
          options: [
            "A link is a vote that is costly for a page author to fake",
            "A link tells the crawler which pages to fetch next in order",
            "A link records the topic a page is about more precisely",
            "A link is the only way to discover a page on the open web",
          ],
          correctIndex: 0,
          explain:
            "Page text is entirely under the author's control, so it is cheap to game. A link has to be placed by someone else, which is what gave it value, and what later made link spam a profitable industry.",
        },
      },
      {
        id: "search-infra",
        sources: [
          {
            label: "Dean and Ghemawat, MapReduce: simplified data processing on large clusters",
            url: "https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/",
            supports:
              "That the inverted index is a canonical MapReduce job, with the shuffle grouping every emitted term so one reducer sees all postings for that term, and that the framework handles machine failure by re-running tasks.",
          },
        ],
        title: "Building the index as a batch job",
        level: "advanced",
        body: [
          "An inverted index maps a term to the documents containing it. Building one from a crawl of the web is conceptually a sort, and that is exactly the shape MapReduce was written for. The map step reads a document and emits a pair for every term it contains. The shuffle groups those pairs by term. The reduce step receives every mention of a single term and writes its posting list.",
          "The shuffle is the part that matters and the part people skip. It is the only stage where data crosses the network in bulk, so it is where the job's cost lives, and the guarantee it provides, that one reducer sees all values for a key, is the entire reason the reduce function can be written as if the data were local.",
          "The other half of the contract is failure. At a few thousand machines, something dies during every job of any size. The framework assumes it: tasks are deterministic and side-effect free, so a lost task is simply re-run elsewhere, and a straggler can be speculatively duplicated with whichever copy finishes first being kept. The programming model is restrictive precisely so that recovery can be automatic.",
          "Batch indexing has a hard floor though, which is that the whole corpus is reprocessed to reflect one changed page. That is why the architecture eventually moved toward incremental update, and it is the same pressure that pushes any nightly pipeline toward streaming once the business starts asking for fresher numbers.",
        ],
        check: {
          prompt: "What does the shuffle stage guarantee?",
          options: [
            "The shuffle groups every mention of a term onto one reducer",
            "The shuffle removes duplicate documents before indexing them",
            "The shuffle sorts documents by their final ranking score",
            "The shuffle decides how many machines the job will need",
          ],
          correctIndex: 0,
          explain:
            "Grouping by key is the whole contract. Because one reducer receives every value for a term, the reduce function can build that posting list as though the data were local, and it is also why the shuffle is where the network cost sits.",
        },
      },
      {
        id: "search-neural",
        sources: [
          {
            label: "Google, Understanding searches better than ever before",
            url: "https://blog.google/products/search/search-language-understanding-bert/",
            supports:
              "That a transformer based language model was applied to ranking in order to interpret the relationship between words in a query rather than treating it as a bag of terms.",
          },
        ],
        title: "Learned ranking, and how you know it helped",
        level: "advanced",
        body: [
          "Keyword matching treats a query as a bag of words, which throws away the part that carries the meaning. The classic example is a preposition: the words either side of it are identical whichever way round the relationship runs, and the intent is opposite. A model that reads the query as a sequence can keep that distinction.",
          "Google applied transformer based language models to exactly this, so that ranking depends on how words relate rather than only which words appeared. The gain is real and it arrives with a problem: the resulting ranker cannot be read. There is no rule to inspect, no weight to point at, and when one query gets worse nobody can say which change did it.",
          "So the discipline moves into evaluation. Human raters score results against published guidelines; changes are tested live against a holdout; and the decision is made on aggregates. The thing to understand is that this measures the average and that a shipped improvement will have made some individual queries worse. The average went up, which is not the same as nothing regressed.",
          "That is the general shape of shipping a learned component into a product that already works. You trade an explainable system for a better average, and you buy back the loss of explanation with measurement, which means the evaluation harness becomes the part of the system you cannot afford to get wrong.",
        ],
        inPractice:
          "This is the same argument as the guardrail work elsewhere on this site. Once a model decides, the question stops being is it right and becomes how would we know.",
        check: {
          prompt: "What is the cost of moving ranking to a learned model?",
          options: [
            "A learned ranker improves averages and can regress one query",
            "A learned ranker removes the need for human quality ratings",
            "A learned ranker makes every ranking decision explainable",
            "A learned ranker is retrained on each individual query logged",
          ],
          correctIndex: 0,
          explain:
            "Decisions stop being inspectable, so quality is established statistically. A change that raises the aggregate can still make particular queries worse, which is why rater guidelines and live holdouts carry the weight the old rules used to.",
        },
      },
      {
        id: "search-query",
        sources: [
          {
            label: "Google, how search works: ranking results",
            url: "https://www.google.com/search/howsearchworks/how-search-works/ranking-results/",
            supports:
              "That a query is interpreted before retrieval, including spelling correction and synonym expansion, because the words a person types are frequently not the words on the page they want.",
          },
        ],
        title: "Understanding the query before answering it",
        level: "advanced",
        body: [
          "Matching the typed string against the index is the obvious design and it answers the wrong question. People misspell, abbreviate, use a word the document never uses, and ask for an outcome rather than a term. The query is evidence about an intent, not a specification.",
          "So there is a stage before retrieval. Spelling is corrected, which is harder than a dictionary lookup because the correction depends on context: the same misspelling resolves differently next to different words. Synonyms are expanded, so a page saying automobile can answer a query saying car, and that expansion has to be careful because synonymy is not symmetric and context dependent.",
          "The intent matters as much as the words. A query that names a product can want to buy, to compare, to fix or to return it, and the right result set differs completely. Classifying that intent shapes retrieval before ranking ever runs, which is why two queries with almost identical words can return entirely different kinds of page.",
          "Everything here is a precision and recall trade made before the ranker sees anything. Expand too aggressively and the candidate set fills with near misses the ranker now has to sort out. Expand too little and the right document is never a candidate, and no amount of ranking quality can recover a document that was not retrieved.",
        ],
        why: "The lesson transfers to any retrieval system including the ones behind language models: what you retrieve bounds what you can answer, so query handling deserves as much attention as ranking.",
        check: {
          prompt: "What happens to a query before retrieval?",
          options: [
            "The query is expanded and corrected before anything is retrieved",
            "The query is matched literally against the terms in the index",
            "The query is sent to the ranker before the index is consulted",
            "The query is rewritten only when it returns no results at all",
          ],
          correctIndex: 0,
          explain:
            "Correction, synonym expansion and intent classification all run first, because the typed words are usually not the words on the right page. That stage sets the candidate pool, and ranking cannot recover a document that was never retrieved.",
        },
      },
      {
        id: "search-snippets",
        sources: [
          {
            label: "Google, control your snippets in search results",
            url: "https://developers.google.com/search/docs/appearance/snippet",
            supports:
              "That the snippet is generated primarily from page content in a way that reflects the query rather than being a fixed description chosen by the site owner.",
          },
          {
            label: "Google, featured snippets and your website",
            url: "https://developers.google.com/search/docs/appearance/featured-snippets",
            supports:
              "That a passage can be promoted as a direct answer when the system judges it responds to the query, which is a selection within a document rather than a ranking of documents.",
          },
        ],
        title: "The snippet is a second retrieval problem",
        level: "advanced",
        body: [
          "Ranking chooses documents. The snippet chooses what to show from inside one, and that is a different problem solved by a different mechanism that people rarely notice is there.",
          "It has to be per query. The same page answers several questions, and the sentence that answers this one is somewhere in the middle of it. So the snippet is assembled by finding the passage that best responds to what was asked, which means passage level retrieval within a document, after document level retrieval across the web.",
          "The cost profile is unusual and worth understanding. This work can only begin once the top results are known, it has to happen while the person is waiting, and it only applies to around ten documents. That makes it an expensive per document operation on a tiny candidate set, the exact inverse of indexing, which is cheap per document across an enormous one.",
          "It also changes what the result page is. A snippet that fully answers the question means the click never happens, which is good for the person asking and a direct cost to the site that wrote it. That tension is why snippet controls exist at all, and it is the clearest example of a ranking system's incentives diverging from those of the corpus it ranks.",
        ],
        check: {
          prompt: "Why is a snippet generated per query?",
          options: [
            "A snippet is generated per query from the passage that matched",
            "A snippet is the description the page author wrote for it",
            "A snippet is the first paragraph of the document every time",
            "A snippet is produced once and cached for all later queries",
          ],
          correctIndex: 0,
          explain:
            "One page answers many questions, so the responsive passage differs by query. It is passage level retrieval inside a document, run on roughly ten candidates while the user waits.",
        },
      },
      {
        id: "search-spam",
        sources: [
          {
            label: "Google, spam policies for Google web search",
            url: "https://developers.google.com/search/docs/essentials/spam-policies",
            supports:
              "That ranking signals are actively manipulated, including by link schemes and scaled content abuse, and that policies and automated systems exist specifically to counter it.",
          },
        ],
        title: "Ranking is adversarial by construction",
        level: "advanced",
        body: [
          "A search engine is not sorting a neutral corpus. A large share of the web exists to rank, and the moment a signal is known to carry weight there is an industry optimising for it. That changes the engineering problem in a way most ranking literature quietly ignores.",
          "The history is a sequence of signals being discovered and then destroyed. Keyword frequency worked until stuffing. Links worked until link farms and paid links. Engagement signals attract clickbait. Each one was genuinely informative, and each stopped being informative in proportion to how valuable it was known to be, which is close to a law rather than an accident.",
          "That shapes the defences. Use many signals so no single one is worth attacking, keep the weights opaque so attackers are optimising blind, and prefer signals that are expensive to fake, which is exactly why signals outside the publisher's control have always been the valuable ones. The same reasoning drives fraud scoring and abuse detection.",
          "Scaled generation sharpens all of this. When plausible content can be produced at essentially zero cost, any signal based on the content itself weakens further, and the burden shifts onto signals of provenance and corroboration. The defensive question stops being does this page look good and becomes what, independent of this page, suggests it is worth trusting.",
        ],
        inPractice:
          "It is also why evaluation is adversarial: a ranking change has to be assessed against people trying to defeat it, not only against a held out set.",
        check: {
          prompt: "Why does every good ranking signal eventually weaken?",
          options: [
            "Any signal worth ranking on becomes worth manufacturing",
            "Any signal worth ranking on is impossible for a site to see",
            "Any signal worth ranking on gets weaker as the web grows",
            "Any signal worth ranking on must be published to be trusted",
          ],
          correctIndex: 0,
          explain:
            "Value attracts manipulation, so a signal decays in proportion to how much weight it is known to carry. The defences are many signals, opaque weights, and preferring signals the publisher cannot set for themselves.",
        },
      },
    ],
  },
  {
    id: "google-maps",
    title: "Google Maps: the world as an index",
    summary:
      "Tiling a sphere so that nearby places sort together, routing across a continent without walking the graph, and predicting a journey that has not happened yet.",
    track: "case-study",
    topics: [
      {
        id: "maps-s2",
        sources: [
          {
            label: "S2 Geometry: the S2 cell hierarchy",
            url: "https://s2geometry.io/devguide/s2cell_hierarchy",
            supports:
              "That S2 projects the sphere onto the six faces of a cube, orders cells along a Hilbert curve, and encodes a cell as a 64 bit identifier across thirty one levels.",
          },
        ],
        title: "S2 cells: ordering a globe on one curve",
        level: "advanced",
        body: [
          "A map is a database question before it is a drawing question. The query that matters is not what does this place look like, it is what is near this point, and that phrasing is hostile to ordinary indexes. Latitude and longitude are two numbers, and a B-tree can only sort on one thing at a time. Index latitude and you get a band stretching right around the planet. Index both and you get a rectangle that is nothing like a circle, badly so near the poles.",
          "S2 answers it by giving every point on the sphere a single number. The sphere is projected onto the six faces of a cube, each face is subdivided into a quadtree, and the cells are then threaded onto a Hilbert curve. The curve is the whole trick. It visits every cell exactly once, and it has the property that cells close together on the curve are close together in space.",
          "Once space has been flattened onto a curve, a region stops being a geometric problem and becomes a set of integer ranges. Everything within a few kilometres of a point is a handful of contiguous spans of cell identifier, and a plain B-tree can answer that with range scans. No spatial index, no special database, no bounding box arithmetic at query time.",
          "A cell identifier is sixty four bits and the hierarchy runs to thirty one levels, so the same identifier carries its own precision: truncate the low bits and you have the parent cell. That is what lets one scheme serve a country-sized aggregate and a doorway at the same time.",
          "Uber's H3 solves a neighbouring problem and picks hexagons, because radial search outward from a cell is unambiguous when every neighbour is the same distance away. S2 is optimised for the other half of the job, which is turning a region into index ranges cheaply. Neither is the correct answer in general. They are answers to different questions about the same planet.",
        ],
        why: "Both schemes exist because space has two coordinates and an index has one. The job is to find an ordering that keeps neighbours adjacent, and every such ordering trades something away.",
        check: {
          prompt: "Why does S2 thread its cells onto a Hilbert curve?",
          options: [
            "It orders nearby cells close together, so a region is a few ranges",
            "It compresses coordinates into fewer bytes than latitude and longitude",
            "It makes every cell cover exactly the same area across the globe",
            "It removes the need to store a cell identifier against each record",
          ],
          correctIndex: 0,
          explain:
            "The curve preserves locality. Because cells that are near each other in space land near each other on the curve, a circular region becomes a small number of contiguous integer ranges, which an ordinary B-tree can scan. Cell areas are not equal, and the identifier still has to be stored.",
        },
      },
      {
        id: "maps-routing",
        sources: [
          {
            label: "Bast, Funke, Sanders and Schultes, Fast routing in road networks with transit nodes, Science 2007",
            url: "https://www.science.org/doi/10.1126/science.1137521",
            supports:
              "The transit node result: that long distance shortest paths pass through a small set of access nodes, so most queries reduce to table lookups rather than a graph search.",
          },
          {
            label: "Geisberger, Sanders, Schultes and Delling, Contraction hierarchies",
            url: "https://link.springer.com/chapter/10.1007/978-3-540-68552-4_24",
            supports:
              "That preprocessing can order nodes by importance and add shortcut edges, so queries search only upward through the hierarchy.",
          },
        ],
        title: "Why nobody runs Dijkstra on a continent",
        level: "advanced",
        body: [
          "Dijkstra's algorithm is correct and it is the wrong tool here. Asked for a route across a country it will settle a large fraction of every road in between, because it has no way to know that a road is heading away from the destination. A* with a straight line heuristic helps and does not rescue it: the detail that makes a road network useful, every residential cul-de-sac, is exactly the detail a long route does not care about.",
          "The observation the field turned on is almost embarrassing once stated. Any long journey leaves its origin through one of a very small number of roads. Not thousands of possibilities: a handful, usually motorway slip roads. The same is true at the destination. So for each node you can precompute its access nodes, the small set of important junctions through which all of its long distance routes pass, and separately precompute a full table of distances between those important junctions.",
          "A long query then costs almost nothing. Look up the access nodes for the origin and for the destination, add the short local distance at each end to the precomputed distance between every pair, and take the minimum. That is a few dozen table lookups rather than a search over millions of edges. Bast and colleagues reported this in Science in 2007, with the number of transit nodes for Western Europe in the ten thousands.",
          "Contraction hierarchies attack it from the other side. Order every node by importance, then remove them one at a time from least important upward, adding shortcut edges wherever removing a node would otherwise lengthen a path. A query afterwards only ever searches upward in importance from both ends until the two searches meet. The graph is the same graph; the preprocessing has simply made the unimportant parts skippable.",
          "What both share is the shape of the trade. They move work from query time to preprocessing time, and they buy the right to do that by assuming the graph is mostly stable. Which is exactly the assumption live traffic breaks, and the reason a routing stack keeps a fast changing cost layer separate from the slow changing topology.",
        ],
        inPractice:
          "This is the clearest example on the site of preprocessing beating cleverness at query time. The algorithm did not get smarter, the problem got reshaped.",
        diagram: {
          caption: "A long route resolves to table lookups, not a graph search",
          columns: [
            [{ id: "req", label: "Route request", sub: "origin, destination", kind: "client" }],
            [
              { id: "local", label: "Local search", sub: "streets near each end", kind: "service" },
              { id: "access", label: "Access nodes", sub: "precomputed per node", kind: "data" },
            ],
            [{ id: "table", label: "Transit table", sub: "junction to junction", kind: "data" }],
            [{ id: "pick", label: "Best combination", sub: "minimum over pairs", kind: "service" }],
          ],
          edges: [
            { from: "req", to: "local" },
            { from: "local", to: "access" },
            { from: "access", to: "table" },
            { from: "table", to: "pick" },
          ],
        },
        check: {
          prompt: "What makes transit node routing work?",
          options: [
            "Long routes nearly all leave via a small set of access points",
            "Road graphs are small enough to fit entirely in memory today",
            "Drivers prefer motorways, so other roads can be safely ignored",
            "Travel times change too often for any precomputation to help",
          ],
          correctIndex: 0,
          explain:
            "Every node has only a handful of junctions through which its long distance routes pass. Precompute those access nodes, and a full distance table between the important junctions, and a continental query becomes a few dozen lookups plus a short search at each end.",
        },
      },
      {
        id: "maps-eta",
        sources: [
          {
            label: "DeepMind, Traffic prediction with advanced graph neural networks",
            url: "https://deepmind.google/discover/blog/traffic-prediction-with-advanced-graph-neural-networks/",
            supports:
              "That road segments are grouped into supersegments and modelled with a graph neural network, and the reported improvements in arrival time accuracy across a set of named cities.",
          },
        ],
        title: "Predicting a journey that has not happened",
        level: "advanced",
        body: [
          "An arrival time is a forecast, not a measurement. The honest version of the question is what will the road be like when the driver reaches it, which for the last leg of a long trip is a prediction about conditions an hour out. Current speed on that road is useful and it is not the answer.",
          "The naive model treats each stretch of road independently: take its recent speeds, take the historical profile for this hour on this weekday, blend them. It fails in the way congestion actually behaves. Queues propagate. A blockage on one road fills the road feeding it, and the strongest signal about a segment is frequently the state of its neighbours rather than its own history.",
          "Google and DeepMind published an approach that takes the adjacency seriously. Segments are grouped into supersegments, runs of adjacent road that traffic tends to traverse together, and a graph neural network is trained over them, so a prediction for one stretch is informed by the stretches it connects to. DeepMind reported improvements in arrival time accuracy across cities including Berlin, Jakarta, Sao Paulo, Sydney, Tokyo and Washington DC.",
          "The structural point generalises past maps. A graph neural network is the right shape when your entities are not independent and the dependency is a graph you already have. Road networks come with that graph for free. So do service call graphs, which is why the same family of models keeps appearing in incident prediction work.",
        ],
        check: {
          prompt: "Why model road segments as a graph rather than independently?",
          options: [
            "Adjacent stretches of road influence each other's travel time",
            "A single road segment has too few historical samples to model",
            "Neural networks cannot accept more than one input at a time",
            "Segment boundaries move whenever roadworks are introduced",
          ],
          correctIndex: 0,
          explain:
            "Congestion propagates along the network, so the best predictor of a segment is often the state of the segments feeding it. A model that treats each stretch independently throws that signal away, which is what grouping into supersegments and learning over the graph recovers.",
        },
      },
      {
        id: "maps-tiles",
        sources: [
          {
            label: "Google Maps JavaScript API: coordinates and zoom levels",
            url: "https://developers.google.com/maps/documentation/javascript/coordinates",
            supports:
              "That the map is divided into square tiles per zoom level, with each zoom level doubling the tile count in each direction, so the client fetches only the tiles covering its viewport.",
          },
        ],
        title: "Serving the picture: tiles and zoom pyramids",
        level: "intermediate",
        body: [
          "Rendering the world per request is not a thing anyone does. The map is cut into square tiles, and there is a separate set of tiles for every zoom level, each level doubling the number of tiles along each axis. Zoom level zero is the whole planet in one tile; each step down quadruples the count.",
          "Because the scheme is a quadtree, a tile's address is also its path from the root, and a client that knows its viewport and zoom can compute exactly which tile addresses it needs without asking anything first. Those are then plain cacheable objects, which means a content delivery network does most of the work and the map server is spared the overwhelming majority of requests.",
          "Raster tiles are images, which makes them trivially cacheable and completely inflexible: rotation, restyling and label languages all require a new render. Vector tiles ship the geometry and let the client draw it, which moves work to the device and buys back styling, smooth zoom and rotation. The trade is the familiar one between a server that has already decided and a client that still can.",
        ],
        check: {
          prompt: "What does cutting the map into tiles buy you?",
          options: [
            "The client fetches only the few tiles covering its viewport",
            "Tiles let the server render the whole world on every request",
            "Tiles remove the need to store the map at more than one scale",
            "Tiles are required for any map that supports being rotated",
          ],
          correctIndex: 0,
          explain:
            "Tiles turn a continuous surface into addressable, cacheable units. The viewport determines a handful of tile addresses, the client requests only those, and a cache serves nearly all of them. The pyramid exists precisely because the map is stored at many scales.",
        },
      },
      {
        id: "maps-traffic",
        sources: [
          {
            label: "Google, How Google Maps uses traffic data",
            url: "https://blog.google/products/maps/google-maps-101-how-ai-helps-predict-traffic-and-determine-routes/",
            supports:
              "That live conditions are derived from aggregate location data contributed by devices using the product, combined with historical patterns and reports from users.",
          },
        ],
        title: "Where live traffic comes from",
        level: "intermediate",
        body: [
          "The sensor is the fleet. Devices running the product contribute location data, and aggregating many of them across a stretch of road gives the current speed on that road without any roadside hardware at all. It is a measurement network that someone else paid for and that grows with usage, which is a large part of why map quality compounds for whoever already has the users.",
          "Aggregation is doing load bearing work here and not only for privacy. A single device is noise: it may be parked, it may be on a bus, its satellite fix may be wrong by a street. Only in aggregate does a speed become a property of the road rather than a property of one journey, which is the same reason a single slow request tells you nothing about a service and a percentile over many does.",
          "The obvious failure is thin data. A road nobody is driving has no current speed, so the system falls back on the historical profile for that road at that hour, which is also what it must use for any part of a route far enough ahead that nobody there yet is relevant. Live and historical are not alternatives, they are layers, and the further out the prediction the more weight shifts to the latter.",
        ],
        check: {
          prompt: "Why does live traffic depend on aggregating many devices?",
          options: [
            "Speeds are aggregated across many devices before being used",
            "Each device reports only when it is stationary at a junction",
            "Traffic is inferred from camera feeds installed on motorways",
            "Only drivers who share a live journey publicly are counted",
          ],
          correctIndex: 0,
          explain:
            "One device is noise: parked, on a bus, or badly located. Aggregating across many turns an individual journey into a property of the road, and it is also what keeps the contribution anonymous. Where there is too little data, the historical profile takes over.",
        },
      },
      {
        id: "maps-freshness",
        sources: [
          {
            label: "Google, How we map the world",
            url: "https://blog.google/products/maps/google-maps-101-how-we-map-world/",
            supports:
              "That the base map is assembled from authoritative data, imagery and contributions from users, and that these sources are reconciled rather than any one of them being treated as truth.",
          },
        ],
        title: "Keeping a map that reality keeps changing",
        level: "advanced",
        body: [
          "A map is wrong the moment it is finished. Roads open, shops close, one-way restrictions flip, a building is demolished. The hard engineering problem is not drawing the world once, it is maintaining agreement with a world that will not hold still.",
          "Three kinds of source, none sufficient alone. Authoritative data from mapping agencies and municipalities is accurate and slow, sometimes by years. Imagery is current and ambiguous, since a satellite can show that tarmac exists but not that it is one-way or private. User reports are immediate and unreliable, both honestly mistaken and occasionally deliberate.",
          "So the system is a reconciliation rather than a pipeline. Google describe vetting authoritative sources and holding user contributions back until they are confident enough to publish, which is review rather than last-write-wins. They do not publish the machinery, so the rest is inference from the shape of the problem: any system merging feeds of differing trustworthiness needs some notion of how much each is trusted, and its failure mode is always the same one. Treat the newest write as correct and the most recent error becomes the current state.",
          "Evidence from behaviour is the interesting one to reason about, though Google describe three inputs rather than four and do not claim this as a source. If a map says a road is open and no vehicle has traversed it for a week, that is a signal available in principle. It is noisy and it is unbiased in a way reports are not, since it reflects what people did rather than what someone chose to tell you, which is why observed behaviour tends to outrank stated information wherever both exist.",
        ],
        check: {
          prompt: "How does the map stay current?",
          options: [
            "Authoritative data, imagery and user reports are reconciled",
            "The map is rebuilt from satellite imagery alone each quarter",
            "Changes are accepted only from national mapping agencies",
            "Road geometry is frozen once a region has been surveyed",
          ],
          correctIndex: 0,
          explain:
            "Each source is accurate about different things and wrong in different ways, so confidence is attached and conflicts go to review. Observed behaviour acts as a fourth, unbiased signal where it disagrees with the stated data.",
        },
      },
      {
        id: "maps-geocoding",
        sources: [
          {
            label: "Google, Geocoding API overview",
            url: "https://developers.google.com/maps/documentation/geocoding/requests-geocoding",
            supports:
              "That geocoding returns a result with a stated location type, distinguishing a rooftop level match from one interpolated along a road segment or approximated to a wider area.",
          },
        ],
        title: "Addresses are not coordinates",
        level: "intermediate",
        body: [
          "An address is a human convention and a coordinate is a measurement, and converting between them is far less reliable than the interface suggests. Addresses are ambiguous, duplicated between towns, abbreviated inconsistently, misspelled, and in many parts of the world not structured the way the form expects.",
          "Where a building has been surveyed individually the answer is exact. Where it has not, the usual method is interpolation: the road segment is known to run from number one to number ninety-nine, so number fifty is placed halfway along it. That is often close and it is sometimes badly wrong, because numbering is not uniform and a long driveway can put the real entrance a hundred metres from the interpolated point.",
          "Which is why a good geocoding result reports how it was derived, not only where. A rooftop match and an interpolated match are different claims, and an application that treats them identically will eventually dispatch a vehicle to the middle of a field. The precision type is the part developers most often discard and most need.",
          "The reverse direction has its own trap. Turning a coordinate into an address has no single right answer: a point in a car park might reasonably be the shop, the retail estate or the road. Any choice is an interpretation, so the sensible interface returns several candidates with their types rather than one string pretending to be a fact.",
        ],
        inPractice:
          "If you store a geocoded point, store the precision alongside it. Without that, nobody later can tell a surveyed address from a guess.",
        check: {
          prompt: "How is an address without a surveyed point located?",
          options: [
            "An address is matched to a point by interpolating along a road",
            "An address is matched to a point stored for every building",
            "An address is matched to a point by the postal service only",
            "An address is matched to a point chosen by the nearest user",
          ],
          correctIndex: 0,
          explain:
            "Interpolation places a number proportionally along a segment whose endpoints are known. It is usually close and sometimes badly wrong, which is why the result reports its precision type and why that field should be stored.",
        },
      },
    ],
  },
  {
    id: "dropbox",
    title: "Dropbox: leaving the cloud on purpose",
    summary:
      "Content-addressed blocks, the arithmetic that justified building storage rather than renting it, and proving an exabyte is still there.",
    track: "case-study",
    topics: [
      {
        id: "dropbox-blocks",
        sources: [
          {
            label: "Dropbox, Inside the Magic Pocket",
            url: "https://dropbox.tech/infrastructure/inside-the-magic-pocket",
            supports:
              "That files are split into blocks which are addressed by the hash of their contents, so a block already present under its hash is not stored again.",
          },
        ],
        title: "Files are not the unit of storage",
        level: "advanced",
        body: [
          "The product is files, and the storage layer does not deal in files at all. A file is split into blocks of at most four megabytes, each block is hashed, and the hash is its address. A file becomes a list of hashes, which is small enough to be cheap to move around and compare.",
          "Two consequences fall straight out. The first is deduplication: identical blocks are stored once, so a document shared across a company costs one copy, and a hundred people syncing the same installer cost one upload. The second is cheap sync. A client that has changed one paragraph recomputes the hashes, discovers that all but one block already exist on the server, and uploads only the difference.",
          "Content addressing also makes the data immutable. A block's name is derived from its contents, so a block can never change, only be superseded. Immutability is what makes caching safe at every layer, removes a whole class of concurrent write problem, and lets verification be a simple matter of rehashing what you have.",
          "The costs are real. Deletion stops being deletion and becomes reference counting, with all the ways that goes wrong. Encryption has to be done so that identical plaintext still produces identical ciphertext if dedup is to survive it, which weakens the threat model in ways that have to be chosen deliberately rather than stumbled into.",
        ],
        why: "Content addressing recurs everywhere once you notice it: Git objects, container image layers, Nix. The same three properties come along each time, and so do the same two costs.",
        check: {
          prompt: "What does addressing a block by the hash of its contents buy you?",
          options: [
            "Identical blocks are stored once and referenced by their hash",
            "Identical blocks are compressed before the hash is computed",
            "Identical blocks are re-uploaded so each file stays complete",
            "Identical blocks are encrypted with one key for each account",
          ],
          correctIndex: 0,
          explain:
            "The name is derived from the contents, so duplicates collapse automatically and a sync only needs to transfer the hashes the server has not seen. It also makes blocks immutable, which is what makes caching and verification straightforward.",
        },
      },
      {
        id: "dropbox-magic-pocket",
        sources: [
          {
            label: "Dropbox, Scaling to exabytes and beyond",
            url: "https://dropbox.tech/infrastructure/magic-pocket-infrastructure",
            supports:
              "That Dropbox moved the large majority of its data off third party object storage onto its own system, and the reasoning that this is worthwhile only at sustained very large scale.",
          },
        ],
        title: "When building storage beats renting it",
        level: "advanced",
        body: [
          "Dropbox ran on someone else's object storage, then spent years moving off it. That is the opposite of the usual direction, and the interesting question is what made it correct here when it is wrong almost everywhere else.",
          "Rented storage is priced to cover a provider's margin, their spare capacity and your right to leave tomorrow. That is a good deal when your usage is uncertain, spiky, or small enough that the absolute numbers do not matter. Dropbox had none of those properties: storage was the product, demand was predictable, growth was steady, and the bill was a very large fraction of cost of revenue.",
          "At that point the comparison is against the real cost of building, which is not the price of drives. It is a team that must get durability right, a verification system, data centre contracts, hardware refresh cycles, and the migration itself, which took years and ran both systems at once. Those costs are mostly fixed, which is exactly why the decision flips only once the rented bill is big enough to dwarf them.",
          "The transferable test is that: compare a mostly fixed cost against a mostly variable one, and be honest that the fixed side includes people and years, not just equipment. Nearly every team asking this question is far below the crossing point, and the instinct to copy a large company's infrastructure decision without their numbers is how teams end up operating a database they did not need.",
        ],
        inPractice:
          "Worth noticing that they did not leave entirely. Keeping some workloads rented preserves an exit and covers regions where building makes no sense.",
        check: {
          prompt: "When does owning storage beat renting it?",
          options: [
            "Owning the hardware pays off only at a very large, steady scale",
            "Owning the hardware removes the need to plan capacity ahead",
            "Owning the hardware is cheaper than renting it at any size",
            "Owning the hardware lets a team avoid writing durability code",
          ],
          correctIndex: 0,
          explain:
            "Building is mostly fixed cost, including a team and several years; renting is variable. The fixed side only wins once usage is both enormous and predictable, which is why this decision is right for a handful of companies and wrong for nearly everyone copying it.",
        },
      },
      {
        id: "dropbox-erasure",
        sources: [
          {
            label: "Dropbox, Inside the Magic Pocket",
            url: "https://dropbox.tech/infrastructure/inside-the-magic-pocket",
            supports:
              "That recent writes are replicated and data is erasure coded once volumes close, so coding replaces extra whole copies for cold data rather than replacing replication outright.",
          },
        ],
        title: "Erasure coding: durability without three copies",
        level: "advanced",
        body: [
          "The simple way to survive a dead disk is to keep more copies. Three copies tolerates two failures and costs three times the space, and at exabyte scale that multiplier is the budget.",
          "Erasure coding splits data into fragments and computes parity fragments from them, such that any sufficient subset reconstructs the original. The overhead is a fraction rather than a multiple, so the same durability costs far less space than replication, which at this scale is the whole argument.",
          "What you pay instead is reconstruction. Losing a replica means copying one object from a peer. Losing a fragment means reading many fragments from many machines and computing the missing one, so a failure costs network and processor time rather than a straight copy. That is fine for data at rest and bad for data under constant random read, which is why hot and cold paths frequently use different schemes.",
          "The placement is as important as the maths. Fragments have to be spread so that no single failure domain holds enough of them to matter, which means reasoning about racks, power and networking rather than about disks. Erasure coding with all fragments behind one switch provides arithmetic comfort and no actual durability.",
        ],
        check: {
          prompt: "What is the trade erasure coding makes against replication?",
          options: [
            "Erasure coding stores less overhead than copying whole blocks",
            "Erasure coding rebuilds a lost block without reading any peer",
            "Erasure coding removes the need to spread data across zones",
            "Erasure coding makes reads faster than plain replication does",
          ],
          correctIndex: 0,
          explain:
            "Parity fragments give the same durability for a fraction of the extra space rather than a multiple of it. The cost arrives on failure, when reconstruction reads many fragments and computes the missing one instead of copying a single replica.",
        },
      },
      {
        id: "dropbox-sync",
        sources: [
          {
            label: "Dropbox, Rewriting the heart of our sync engine",
            url: "https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine",
            supports:
              "That the difficulty of sync is managing concurrent state across clients and server rather than transferring data, and that the rewrite was motivated by the original design being too hard to reason about and test.",
          },
          {
            label: "Dropbox, Testing our new sync engine",
            url: "https://dropbox.tech/infrastructure/-testing-our-new-sync-engine",
            supports:
              "The three-tree model of remote, local and synced state with a planner between them, and the randomised state generation that makes such a design testable.",
          },
        ],
        title: "Sync is a consensus problem wearing a file manager",
        level: "advanced",
        body: [
          "Moving bytes between a laptop and a server is solved. What makes sync hard is that three parties hold opinions about the same tree at once, the local filesystem, the server, and whatever the user is doing right now, and all three change without coordination.",
          "The state space is enormous and mostly invisible. A file is renamed on one machine while being edited on another, a directory is deleted while a file inside it is being uploaded, the network drops midway, the laptop sleeps for a week. Each is ordinary, and the number of combinations is what defeats the obvious implementation, which accretes a special case per bug until nobody can say what it does.",
          "The rewrite's insight was to make the state explicit rather than implicit. Instead of code that reacts to filesystem events, their companion post on testing describes a model with three observable trees, remote, local and synced, and a planner that computes the operations needed to bring them into agreement. Once the thing is a planner over explicit state, it can be tested by generating states and checking the plan, which is not possible for an event handler full of special cases.",
          "That testability was the real deliverable. A sync engine fails on combinations nobody imagined, so the only durable defence is being able to enumerate states mechanically. Rewriting for a property like that, rather than for performance, is unusual and is the part worth taking away.",
        ],
        why: "This is the same reasoning that favours a state machine over scattered booleans. The win is not elegance, it is that one shape can be exhaustively tested and the other cannot.",
        check: {
          prompt: "What makes file sync difficult?",
          options: [
            "The hard part is agreeing on state, not moving the bytes",
            "The hard part is compressing files before they are uploaded",
            "The hard part is choosing which server will store the data",
            "The hard part is encrypting content while it is in transit",
          ],
          correctIndex: 0,
          explain:
            "Three parties change the same tree concurrently, so the difficulty is reconciling state across an enormous combination space. Making that state explicit is what allows a planner to be tested mechanically.",
        },
      },
      {
        id: "dropbox-verify",
        sources: [
          {
            label: "Dropbox, Pocket watch: verifying exabytes of data",
            url: "https://dropbox.tech/infrastructure/pocket-watch",
            supports:
              "That a disk scrubber continuously reads back stored data and validates it against checksums, scheduling re-replication of anything found damaged, with separate checkers for index agreement and for sampled live writes.",
          },
        ],
        title: "Proving the data is still there",
        level: "advanced",
        body: [
          "Durability claims are about probability, and probability says that across enough drives something is being corrupted right now. Silent corruption is the dangerous kind: a drive returns data without error and the data is wrong, so nothing in the read path notices.",
          "The only defence is to look. A disk scrubber reads back every bit on disk continuously and validates it against stored checksums, sweeping each disk every week or two, with separate checkers confirming blocks are present where the index says and sampling live writes to re-fetch them later. A mismatch means this copy is damaged, and because other copies or parity fragments exist, it can be rebuilt rather than mourned.",
          "The second job is counting. Replication and erasure coding promise a number of copies, and drives fail, machines are decommissioned, racks are retired. A separate process verifies that the promised redundancy actually exists for every object and schedules repair where it has quietly decayed, because a system that is one failure from loss looks identical to a healthy one until the day it is not.",
          "Both are expensive and both are cheap relative to the alternative. Verification is a constant background load that produces nothing visible, which is exactly why it is the first thing cut when capacity is tight, and why it has to be scheduled as infrastructure rather than left as a job someone runs.",
        ],
        inPractice:
          "Backups have the same property. An unverified backup is a belief, and the moment it is tested is the worst possible moment to discover it was wrong.",
        check: {
          prompt: "How is silent corruption detected?",
          options: [
            "Every block is rehashed on a schedule and compared",
            "Every block is restored from backup once each quarter",
            "Every block is checked only when a user requests it",
            "Every block is verified by the drive firmware instead",
          ],
          correctIndex: 0,
          explain:
            "A drive can return wrong data without reporting an error, so nothing in the read path catches it. Rehashing against the content-derived name finds the mismatch, and the redundancy that already exists is what makes repair possible.",
        },
      },
    ],
  },
  {
    id: "figma",
    title: "Figma: one document, many cursors",
    summary:
      "Making concurrent edits converge without a merge dialogue, ordering children that anyone can insert between, and resharding a database that cannot go offline.",
    track: "case-study",
    topics: [
      {
        id: "figma-multiplayer",
        sources: [
          {
            label: "Figma, How Figma's multiplayer technology works",
            url: "https://www.figma.com/blog/how-figmas-multiplayer-technology-works/",
            supports:
              "That the document is a tree of objects with properties, that the server is authoritative and assigns an order to changes, and that per property last write wins is used rather than full operational transformation.",
          },
        ],
        title: "Converging without a merge dialogue",
        level: "advanced",
        body: [
          "Two designers drag the same rectangle at the same time. Neither should see a conflict prompt, both should end up looking at the same canvas, and whatever happens has to survive one of them being on hotel wifi.",
          "Operational transformation is the classic answer and it is famously hard to get right: every pair of operation types needs a transformation function, and the number of pairs grows with the square of the operation vocabulary. A design tool has a large vocabulary, so that cost is paid forever by whoever adds a feature.",
          "Figma's model avoids it by making the document a tree of objects, each with independent properties, and by making the server authoritative about ordering. A client sends a change, the server assigns it a place in the sequence and broadcasts it, and for a given property the last write in that order wins. Concurrent edits to different properties of the same object both survive, because they never contend.",
          "The honest part is what this discards. Two people typing in the same text field do not get a character-level merge, they get one of the two versions. That is a deliberate choice: the conflicts that actually happen in a design tool are overwhelmingly on different objects or different properties, and buying character-level merging for the rare case would cost complexity on every feature forever.",
        ],
        why: "The pattern is choosing a data model whose conflicts are structurally rare, rather than building a mechanism to resolve conflicts a worse model would create.",
        check: {
          prompt: "How do concurrent edits converge in this model?",
          options: [
            "The server assigns an order, so clients converge without merge",
            "The server replays every edit a client made since it connected",
            "The server resolves conflicts by asking the user which to keep",
            "The server blocks a second editor until the first disconnects",
          ],
          correctIndex: 0,
          explain:
            "An authoritative sequence plus last write wins per property is enough, because edits to different properties never contend. The cost is that two people editing the same property do not get a character level merge.",
        },
      },
      {
        id: "figma-ordering",
        sources: [
          {
            label: "Figma, How Figma's multiplayer technology works",
            url: "https://www.figma.com/blog/how-figmas-multiplayer-technology-works/",
            supports:
              "That ordered children are positioned using fractional index values, so an insert between two siblings is a local change that does not require renumbering other children.",
          },
        ],
        title: "Ordering children nobody has to renumber",
        level: "advanced",
        body: [
          "Layers are ordered and anyone can insert between any two of them. With integer positions, inserting between one and two means renumbering everything after it, which is a large write, and two people doing it at once produces exactly the conflict the rest of the design was built to avoid.",
          "The fix is to stop using integers. Give each child a fractional position, and inserting between two siblings means choosing any value strictly between their two values. Nothing else changes and the write touches one object. Two concurrent inserts into the same gap are the interesting case: both clients average the same pair of neighbours, so both compute the same position, and the server resolves the collision by assigning the second a fresh unique value.",
          "The catch is that repeatedly inserting in the same gap makes the values longer, because each one needs more precision than the last. Implementations use a string based ordering rather than a float for exactly this reason, since a float runs out of mantissa quickly and silently, and a string can grow. Because the keys are arbitrary precision rather than fixed width, precision never runs out, and Figma argue real editing patterns never make the keys long enough to need rebalancing.",
          "This is a nice example of choosing a representation so that the common operation is local. The ordering problem did not go away, it was moved into the key, where a concurrent edit cannot turn it into a conflict.",
        ],
        check: {
          prompt: "What does a fractional index give you?",
          options: [
            "A fractional index inserts between two items without renumbering",
            "A fractional index keeps children sorted by their creation time",
            "A fractional index guarantees indexes never need to be rebalanced",
            "A fractional index stores the position as a plain integer offset",
          ],
          correctIndex: 0,
          explain:
            "Choosing a value between two neighbours touches one object, so concurrent inserts into the same gap do not contend. The cost is that keys lengthen with repeated inserts, which is why they are strings and why rebalancing is still occasionally needed.",
        },
      },
      {
        id: "figma-shard",
        sources: [
          {
            label: "Figma, How Figma's databases team lived to tell the scale",
            url: "https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/",
            supports:
              "That horizontal sharding was introduced behind a proxy layer which owned query routing, so the application could be migrated incrementally with near-zero downtime.",
          },
        ],
        title: "Sharding a database that cannot stop",
        level: "advanced",
        body: [
          "Vertical partitioning buys time: move tables onto their own databases and each gets a whole machine again. It runs out when one table is the problem, because a table cannot be split by moving it somewhere else.",
          "Horizontal sharding is the answer and the migration is the hard part, because the application is full of queries that assume one database. The move Figma made was to put a proxy in the path first, so that routing became something the infrastructure owned rather than something every call site knew. With the proxy in place the application can keep issuing the queries it always did while the shape of the storage changes underneath it.",
          "That ordering is the lesson. Introduce the indirection while the system is still simple enough to reason about, verify it is correct against the unsharded database, and only then start moving data. Teams that shard first and add routing afterwards end up changing the storage layout and the application at the same time, with no stage where they can tell which one is wrong.",
          "What a proxy cannot fix is a query that genuinely spans shards. Those have to be found, and each is a decision: denormalise so one shard answers it, scatter and gather and accept the latency, or change the product so the question is not asked. Sharding forces that conversation, which is part of why it is rarely as simple as choosing a key.",
        ],
        inPractice:
          "The same sequencing applies far below this scale. Put the seam in before you need it, prove it is transparent, then move what is behind it.",
        check: {
          prompt: "What made the sharding migration possible with near-zero downtime?",
          options: [
            "Routing moved into a proxy before any data was moved at all",
            "Routing changes were applied to every client library first",
            "Routing was handled by the database itself once sharded",
            "Routing required a full stop while tables were partitioned",
          ],
          correctIndex: 0,
          explain:
            "Adding the indirection first means the storage layout can change underneath an application that still issues the same queries. Verify the proxy is transparent against the old database, then move data; the reverse order leaves nothing you can trust.",
        },
      },
      {
        id: "figma-rust",
        sources: [
          {
            label: "Figma, Rust in production at Figma",
            url: "https://www.figma.com/blog/rust-in-production-at-figma/",
            supports:
              "That the multiplayer server was rewritten to remove unpredictable pauses and memory overhead, with the stated motivation being consistent latency for a service holding many live documents in memory.",
          },
        ],
        title: "Rewriting for predictability, not speed",
        level: "advanced",
        body: [
          "The multiplayer server holds every open document in memory and applies a stream of small edits to it. The workload is unusual: not much computation, a great deal of live state, and a hard requirement that an edit is reflected for everyone else immediately.",
          "On a garbage collected runtime that shape is awkward. Lots of live objects means collections have more to traverse, and a collection pause is time during which nobody's cursor moves. The average was fine; what was not fine was that the worst case was unpredictable and got worse as more documents were held.",
          "So the rewrite was motivated by the distribution rather than the mean. They explicitly dropped the plan to rewrite the whole server and moved only the performance-sensitive syncing core, running it as a child process with network handling left where it was. The spikes had two causes, not one: a single slow operation could lock up an entire worker, and the collector paused on its own schedule. Lower memory per document came with it, which means more documents per machine, a cost argument arriving as a side effect of a latency one.",
          "The general lesson is that runtime choice is a question about tails and about memory shape, not about benchmark throughput. Most services are entirely well served by a managed runtime; the exceptions tend to look like this one, a lot of live state and a low tolerance for pauses, and recognising that shape is more useful than any general ranking of languages.",
        ],
        check: {
          prompt: "What motivated the rewrite?",
          options: [
            "Predictable latency mattered more than raw throughput here",
            "The rewrite was needed to support a new multiplayer model",
            "The rewrite removed the need for an authoritative server",
            "The rewrite was mainly about reducing the hosting bill",
          ],
          correctIndex: 0,
          explain:
            "Holding many documents live makes collection pauses both likelier and longer, and a pause is time nobody's cursor moves. Lower memory per document followed as a consequence, not as the goal.",
        },
      },
      {
        id: "figma-undo",
        sources: [
          {
            label: "Figma, How Figma's multiplayer technology works",
            url: "https://www.figma.com/blog/how-figmas-multiplayer-technology-works/",
            supports:
              "That undo must reverse the user's own changes rather than the most recent change in the document, which requires tracking per-user history and reconciling it against edits made by others since.",
          },
        ],
        title: "Undo when the document is not yours alone",
        level: "advanced",
        body: [
          "Undo in a single user editor is a stack. Push each change, pop to reverse. Add a second person and that model becomes actively wrong, because the most recent change in the document may be theirs, and undoing someone else's work is never what the shortcut meant.",
          "So undo has to be per user. Each person has their own history, and pressing undo reverses their most recent edit wherever it now sits in the document's sequence. That is more than bookkeeping, because the thing being undone may have been modified since by someone else.",
          "Which forces a decision with no clean answer. If I move a rectangle, you recolour it, and I undo, the sensible outcome is that the rectangle returns to its original position and keeps your colour, because our edits touched different properties. The property-level model makes that natural. Where we both changed the same property it is genuinely ambiguous, and the system has to pick a rule and apply it consistently rather than be correct.",
          "Redo compounds it, because redo after someone else has edited the same object is replaying an intention into a world that moved. The honest position is that multiplayer undo is a heuristic tuned until it stops surprising people, not a correct inverse, and designs that promise more than that tend to produce worse surprises.",
        ],
        inPractice:
          "A good test: undo should always do something to your own work, and never visibly change someone else's.",
        check: {
          prompt: "What must undo do in a multiplayer document?",
          options: [
            "Undo must reverse your own edit, not whatever came last",
            "Undo must reverse the most recent edit by any collaborator",
            "Undo must be disabled whenever two people are editing",
            "Undo must restore the document to its last saved version",
          ],
          correctIndex: 0,
          explain:
            "Per-user history is required, because the latest document change may belong to someone else. The edit being reversed may have been touched since, which makes undo a tuned heuristic rather than a true inverse.",
        },
      },
    ],
  },
];
