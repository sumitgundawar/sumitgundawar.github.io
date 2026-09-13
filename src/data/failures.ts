export interface BuiltEvidence {
  title: string;
  detail: string;
  url?: string;
  urlLabel?: string;
}

export interface FailureMode {
  id: string;
  failure: string;
  because: string;
  built: BuiltEvidence[];
  incidentId?: string;
  articleIds: string[];
  frameworkAbbr?: string;
  topicIds: string[];
}

export const failureModes: FailureMode[] = [
  {
    id: "confident-wrong-answers",
    failure: "A model sounds right and is wrong",
    because:
      "Nothing about a fluent answer indicates whether it is grounded. The system has no way to say it does not know, so it invents, and the invention arrives in the same tone as the truth.",
    built: [
      {
        title: "GroundCheck",
        detail:
          "Ask a clinical question and get the passage the answer came from, or a refusal when the corpus does not support one. Built on a synthetic corpus of invented conditions and doses, with a deterministic extractive fallback so it still answers when the model is unavailable.",
        url: "https://sumitgundawar-groundcheck.hf.space",
        urlLabel: "Make it refuse",
      },
      {
        title: "Clinical AI features at By Dr Vali",
        detail: "No AI output reaches a patient without a human reading it first.",
      },
      {
        title: "LLM Response Evaluation Framework",
        detail:
          "A harness testing hallucination, factual accuracy, consistency and safety across several providers, with drift monitoring. MSc research, awarded Distinction.",
      },
    ],
    incidentId: "aircanada",
    articleIds: ["frame", "unanswerable"],
    frameworkAbbr: "FRAME",
    topicIds: ["ml-serving", "ml-features", "ml-drift", "oai-what-was-claimed", "oai-lean"],
  },
  {
    id: "silent-data-loss",
    failure: "Rows disappear and nothing errors",
    because:
      "A row cap, a join that multiplies, a key that does not match. The pipeline succeeds, the dashboard renders, and the number is quietly wrong for weeks.",
    built: [
      {
        title: "PepsiCo demand planning pipeline",
        detail:
          "An event-driven distributed pipeline over 25M+ weekly records for a global supply chain. Processing time cut 38 per cent, from 13 hours to 8.",
      },
      {
        title: "Forecasting across 25M+ combinations",
        detail: "Store by product, eight weeks ahead, at 72 per cent accuracy.",
      },
    ],
    incidentId: "phe",
    articleIds: ["jvs", "cache"],
    frameworkAbbr: "JVS Audit",
    topicIds: ["oltp-olap", "batch-vs-stream", "cdc", "search-sync", "write-skew"],
  },
  {
    id: "the-retry-that-charges-twice",
    failure: "A timeout tells you nothing, so the retry charges twice",
    because:
      "The request may never have arrived, or it may have completed and the response been lost. Both look identical to the caller, and only one of them is safe to repeat.",
    built: [
      {
        title: "API platform and integration hub",
        detail:
          "Stripe, Magento and Intercom wired together through webhook workflows with idempotency, retries and failure handling at live scale, behind OAuth and role-based access.",
      },
      {
        title: "Payments on bdvfit.com",
        detail:
          "Stripe checkout and auto-generated certificates on a CPD-accredited platform built solo in six months.",
        url: "https://bdvfit.com",
        urlLabel: "bdvfit.com",
      },
    ],
    articleIds: [],
    topicIds: ["idempotency", "payments-idempotency", "webhooks", "delivery-guarantees", "retries-backoff"],
  },
  {
    id: "the-destructive-script",
    failure: "The script runs against the wrong host",
    because:
      "Data scripts get a fraction of the review that application code gets, and they are the only code that cannot be rolled back by deploying the previous version.",
    built: [
      {
        title: "bydrvali.com, rebuilt",
        detail:
          "A full Magento platform rebuild carrying 120+ services, with Docker environments and CI/CD so a deploy is repeatable rather than performed.",
        url: "https://bydrvali.com",
        urlLabel: "bydrvali.com",
      },
      {
        title: "bdvportal.com",
        detail:
          "Clinic management across 120+ services, treatment protocols, PDF and camera capture.",
        url: "https://bdvportal.com",
        urlLabel: "bdvportal.com",
      },
    ],
    incidentId: "gitlab",
    articleIds: ["migration"],
    topicIds: ["migrations", "sql-transactions", "isolation-levels", "wal-outbox"],
  },
  {
    id: "the-green-test",
    failure: "The test passes and proves nothing",
    because:
      "A green run is evidence only if you know what it ran against. Coverage counts lines executed, not assertions made, and a suite nobody can distrust is a suite nobody checks.",
    built: [
      {
        title: "Eleven check suites on this site",
        detail:
          "45 assertions against the deployed site, 30 on security, 69 email compatibility rules, plus checks on prose, contrast, content, robots and every route returning real text rather than the app shell.",
      },
      {
        title: "A published audit of my own material",
        detail:
          "141 cited sources requested and 132 resolving, with the other nine explained rather than dropped. Three of my own factual claims found wrong and corrected in public, and one defect left unfixed with the reasoning stated.",
      },
    ],
    articleIds: ["unexamined"],
    topicIds: ["test-pyramid", "coverage", "flaky-tests"],
  },
  {
    id: "time",
    failure: "The same instant gets two answers",
    because:
      "Two clocks, two zones, a schedule declared against local time, a day boundary compared the wrong way. Every one of them is invisible until a date arrives that nobody tested.",
    built: [
      {
        title: "bydrvaliportal.com",
        detail:
          "Project management with real-time updates, approval workflows, a calendar and CEO reporting, on the MERN stack.",
        url: "https://bydrvaliportal.com",
        urlLabel: "bydrvaliportal.com",
      },
    ],
    incidentId: "leapsecond",
    articleIds: ["time"],
    topicIds: ["sql-schema", "batch-vs-stream", "cdc"],
  },
  {
    id: "over-engineering",
    failure: "The system you did not need",
    because:
      "A cluster bought for traffic that never arrived is not neutral. It is a thing to operate, secure, upgrade and explain, paid for while the product is still unproven.",
    built: [
      {
        title: "An architecture recommender that argues you down",
        detail:
          "Ten questions, then a recommendation where every component carries its reasoning and its alternatives. At small scale it says so: this is a small system, and that is the most important thing about it.",
        url: "/build",
        urlLabel: "Size your system",
      },
    ],
    articleIds: ["embedding"],
    topicIds: ["right-sizing", "serverless", "docker-vs-k8s", "cost-drivers", "sharding"],
  },
];
