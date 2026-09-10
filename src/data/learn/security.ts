import type { Card } from "./types";

/* Application security. The identity card covers who you are and what you may
   do; this covers everything an attacker does with input you accepted.
   Correct answers are distributed across positions deliberately, and the
   distractors are the mistakes people actually make. */

export const security: Card[] = [
  {
    id: "appsec",
    title: "Application security",
    summary: "Injection, XSS, CSRF, SSRF, the failures that turn a bug into a breach.",
    track: "practice",
    topics: [
      {
        id: "sql-injection",
        inPractice:
          "Parameterisation is not escaping done well, it is a different mechanism: the statement and the values travel separately, so a value cannot be parsed as syntax whatever it contains. That is why the advice is absolute rather than contextual, and why the remaining risk concentrates in the two places parameters cannot reach: identifiers, which need an allowlist, and an ORM's raw query escape hatch, which is where injection reappears in the reporting endpoint written under time pressure.",
        diagram: {
          caption: "Two channels: the parser sees the statement before it sees any value",
          columns: [
            [{ id: "input", label: "User input", sub: "may contain anything", kind: "client" }],
            [{ id: "concat", label: "Concatenated", sub: "one string, parsed as one", kind: "service", alternative: true },
             { id: "param", label: "Parameterised", sub: "statement, then values", kind: "service" }],
            [{ id: "syntax", label: "Data becomes syntax", sub: "the parser cannot tell", kind: "data", alternative: true },
             { id: "slot", label: "Bound into a slot", sub: "never reparsed", kind: "data" }],
            [{ id: "ident", label: "Identifiers", sub: "cannot be bound: allowlist them", kind: "external" }],
          ],
          edges: [
            { from: "input", to: "concat", label: "the intuitive way" },
            { from: "input", to: "param", label: "the only way" },
            { from: "concat", to: "syntax", label: "injection" },
            { from: "param", to: "slot", label: "safe by construction" },
            { from: "param", to: "ident", label: "the exception", async: true },
          ],
        },
        title: "Injection and parameterised queries",
        level: "beginner",
        body: [
          "Injection happens when input is concatenated into something that will be parsed as a command: SQL, a shell line, an LDAP filter, an XPath expression, a template. The input ends the data and starts being instruction, and the parser cannot tell the difference because by the time it sees the string, there is no difference to see.",
          "Escaping is the intuitive fix and the wrong one, because it requires getting every context right forever, and the contexts nest. A value escaped for SQL and then interpolated into a LIKE pattern, or into a JSON document, or into a shell argument, needs different escaping at each layer, and one missed call site is enough. The defence has to remove the possibility rather than handle each case.",
          "Parameterised queries do that by sending the statement and the values on separate channels. The database parses the statement first, then binds values into slots, so a value can never be parsed as syntax no matter what it contains. This is not escaping done well; it is a different mechanism, and it is why the advice is absolute rather than contextual.",
          "Identifiers are the exception that catches experienced people. Table names, column names and sort directions cannot be bound as parameters, because they are part of the statement rather than values in it. A dynamic ORDER BY built from user input therefore needs an allowlist mapping permitted inputs to known identifiers, and nothing else will do.",
          "An ORM is not automatic protection. Most expose a raw query escape hatch, and that is where injection reappears, usually in the reporting endpoint written under time pressure. The same applies beyond SQL: a shell command assembled by concatenation, a template rendered from user-supplied source, a NoSQL query built from a request body that arrives as an object rather than a string.",
          "Defence in depth belongs here even though parameterisation is complete. Least-privilege database accounts so an injection cannot read tables the feature never needed, no dynamic SQL where a static query would do, and monitoring for queries whose shape does not match anything the application should emit.",
        ],
        why: "Parameterisation removes the class of bug rather than the instance. Escaping means every new call site is another chance to get it wrong, and one miss is enough.",
        check: {
          prompt: "Your ORM is used everywhere and one report endpoint builds SQL by string concatenation for a dynamic ORDER BY. What is the exposure?",
          options: [
            "None, the ORM parameterises the values, and only values can be injected",
            "Injection via ORDER BY, which takes an identifier and so needs an allowlist",
            "Injection, but only if the column name is taken from the URL query string",
            "None, provided the value is escaped for quotes before concatenation",
          ],
          correctIndex: 1,
          explain: "Identifiers such as column names are not bindable as parameters, so dynamic ORDER BY needs an allowlist. Quote-escaping does not help when the injection point is an identifier rather than a string literal.",
        },
        checks: [
          {
            prompt: "Why is parameterisation described as removing the bug class rather than fixing instances?",
            options: [
              "The statement is parsed before values are bound, so values cannot be syntax",
              "The driver escapes each value using rules specific to that database",
              "Prepared statements are cached, so unexpected input fails to match one",
              "The database rejects any value containing characters it treats as syntax",
            ],
            correctIndex: 0,
            explain:
              "It is a different mechanism from escaping, not a better version of it. Once the parse has happened, no content in a bound value can change the meaning of the statement.",
          },
          {
            prompt: "A search endpoint accepts a JSON body and builds a query from its fields. What is the risk?",
            options: [
              "Objects can carry operators, so a value may become part of the query",
              "JSON parsing is slower, which enables denial of service through nesting",
              "Field names cannot be validated before the query has been constructed",
              "The body is not logged, so injection attempts leave no trace to review",
            ],
            correctIndex: 0,
            explain:
              "When input arrives as structure rather than as a string, a field expected to hold a value can hold an operator instead. Injection is not exclusive to SQL; it follows from mixing input with a query language.",
          },
          {
            prompt: "What does a least-privilege database account add when queries are already parameterised?",
            options: [
              "It limits the damage of any injection that appears in future code",
              "It prevents the ORM from generating dynamic SQL at all",
              "It forces every statement to be prepared before it can execute",
              "It blocks queries whose shape differs from the application's usual set",
            ],
            correctIndex: 0,
            explain:
              "Parameterisation is complete for the code that uses it. The account limits what any mistake in the next feature can reach, which is the point of defence in depth.",
          },
        ],
      },
      {
        id: "xss",
        inPractice:
          "Framework escaping closes the common path, so the remaining risk is concentrated in a short list of deliberate bypasses that can be audited by name: dangerouslySetInnerHTML and its equivalents, a value used as href or src where a javascript: URL executes, and anything written into a script, style or event-handler context where HTML escaping is the wrong escaping. A Content Security Policy using a nonce rather than an origin allowlist is what limits the damage when one slips through, and report-only mode exists so the policy can be measured before it is enforced.",
        diagram: {
          caption: "Three shapes, and the two layers that decide what an injection costs",
          columns: [
            [{ id: "stored", label: "Stored", sub: "served to everyone", kind: "client", alternative: true },
             { id: "refl", label: "Reflected", sub: "needs a followed link", kind: "client" },
             { id: "dom", label: "DOM-based", sub: "server never sees it", kind: "client" }],
            [{ id: "esc", label: "Framework escaping", sub: "the default path is safe", kind: "service" },
             { id: "bypass", label: "Deliberate bypass", sub: "innerHTML, href, script context", kind: "service", alternative: true }],
            [{ id: "csp", label: "CSP with a nonce", sub: "inline script refused", kind: "edge" }],
            [{ id: "cookie", label: "HttpOnly cookie", sub: "session cannot be read", kind: "data" }],
          ],
          edges: [
            { from: "stored", to: "esc", label: "rendered as text" },
            { from: "refl", to: "esc", label: "rendered as text" },
            { from: "dom", to: "bypass", label: "client writes it" },
            { from: "bypass", to: "csp", label: "blocked at execution" },
            { from: "csp", to: "cookie", label: "and it cannot steal the session" },
          ],
        },
        sources: [
          {
            label: "MDN: Content Security Policy",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP",
            supports: "That a nonce or hash based policy is preferred over an origin allowlist, and that Content-Security-Policy-Report-Only allows a policy to be measured before enforcement.",
          },
        ],
        title: "Cross-site scripting",
        level: "intermediate",
        body: [
          "Cross-site scripting is injection into a page rather than into a query. Attacker-controlled text is rendered as markup, so their script runs with your origin's privileges: it can read the DOM, call your API as the user, and exfiltrate anything the session can reach. It is not a defacement bug; it is arbitrary code execution in your users' browsers. The three shapes are worth naming. Stored XSS is persisted and served to everyone who views it, which is the worst case. Reflected XSS comes back in a response from something in the request, and needs a victim to follow a link. DOM-based XSS never touches the server at all: client-side code takes something from the URL and writes it into the page, so a server-side filter never sees it.",
          "Modern frameworks close most of it. React escapes interpolated values by default, which means the common path is safe without anyone thinking about it. What remains are the deliberate bypasses, and they are few enough to audit by name: dangerouslySetInnerHTML and its equivalents, values used as a href or src where a javascript: URL executes on click, and anything written into a script, style or event-handler context where HTML escaping is not the right escaping.",
          "A Content Security Policy is the layer that limits damage when something slips through. Refusing inline script and restricting which origins may execute turns a working injection into a blocked one, and modern policies use a nonce or a hash rather than an origin allowlist, because an allowlisted CDN hosting a vulnerable library is a hole in the policy. Report-only mode exists so a policy can be measured before it is enforced.",
          "Cookies deserve a mention here because they decide what XSS costs. A session cookie marked HttpOnly cannot be read by script, so an injection cannot simply steal it, and the attacker is reduced to acting through the page while it is open. That does not make XSS acceptable; it makes the difference between a stolen session that outlives the visit and one that does not.",
          "Sanitisation is a last resort with one correct implementation: a maintained library parsing to a tree and allowlisting elements and attributes, never a regular expression. If a feature needs to accept rich text, that is the tool. If it does not, escaping everything and rendering as text is both simpler and safer.",
        ],
        why: "Framework escaping handles the common path, so the remaining risk concentrates in the few places you deliberately bypass it. Those are worth auditing by name rather than trusting the framework globally.",
        check: {
          prompt: "A profile field is rendered with React interpolation. Where does XSS remain possible?",
          options: [
            "In the interpolated text, if it contains a script tag written as markup",
            "If the field is placed in a title attribute, which React does not escape",
            "If the field is used as a link href, since javascript: URLs are not escaped",
            "Only when the page is server-rendered, since hydration re-parses the HTML",
          ],
          correctIndex: 2,
          explain: "Interpolated text is escaped, but a value used as a URL is not validated as one. A javascript: href executes on click, so URL fields need a scheme allowlist.",
        },
        checks: [
          {
            prompt: "Why can a server-side filter miss DOM-based XSS entirely?",
            options: [
              "Client code writes the payload into the page, so the server never sees it",
              "The payload is encoded, so the filter sees an inert string instead of it",
              "The filter runs after rendering, once the markup has already executed",
              "Client frameworks re-parse the escaped output again during hydration",
            ],
            correctIndex: 0,
            explain:
              "Everything after the fragment marker in a URL stays in the browser, and code that reads it and writes it into the DOM completes the injection without a request being made.",
          },
          {
            prompt: "Why do modern CSPs prefer a nonce or hash over an origin allowlist?",
            options: [
              "An allowlisted CDN hosting a vulnerable library reopens the hole",
              "Origins cannot be expressed for scripts loaded over HTTP/3",
              "Nonces are enforced by more browsers than origin lists are",
              "Hashes allow inline scripts, which an origin list forbids entirely",
            ],
            correctIndex: 0,
            explain:
              "Allowlisting a large CDN allowlists everything on it, including framework versions with known gadget chains. A per-response nonce authorises the exact scripts you meant to include.",
          },
          {
            prompt: "What does HttpOnly on a session cookie change about an XSS incident?",
            options: [
              "The session cannot be stolen, so the attacker must act through the page",
              "The injection cannot execute, because script access to cookies is required",
              "The cookie is not sent cross-site, which prevents the request entirely",
              "The browser refuses to render attacker-supplied markup in that origin",
            ],
            correctIndex: 0,
            explain:
              "It does not stop the injection, it limits what the injection is worth. Acting through an open page ends when the tab closes; a stolen cookie does not.",
          },
        ],
      },
      {
        id: "csrf",
        inPractice:
          "SameSite=Lax is the default in current browsers, which is what closed most of this class without anyone changing their code, and it is why the remaining exposure is narrow rather than general. The part that still needs deciding is the one that follows from how the session travels: a cookie is ambient authority and needs a token on state-changing forms, while a bearer token your own script attaches is not sent by a third-party page and does not. Mirror that token into a cookie for convenience and the exposure returns.",
        diagram: {
          caption: "The browser attaches the cookie; it does not attach a header",
          columns: [
            [{ id: "evil", label: "Attacker's page", sub: "submits a form to your origin", kind: "client" }],
            [{ id: "cookie", label: "Session cookie", sub: "attached automatically", kind: "edge", alternative: true },
             { id: "bearer", label: "Auth header", sub: "only your script sets it", kind: "edge" }],
            [{ id: "lax", label: "SameSite=Lax", sub: "withheld on cross-site posts", kind: "service" },
             { id: "token", label: "Synchroniser token", sub: "unreadable across origins", kind: "service" }],
            [{ id: "cors", label: "CORS is not it", sub: "a simple post needs no preflight", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "evil", to: "cookie", label: "rides along" },
            { from: "evil", to: "bearer", label: "cannot be set" },
            { from: "cookie", to: "lax", label: "the mechanism that fixed it" },
            { from: "cookie", to: "token", label: "for sensitive actions" },
            { from: "evil", to: "cors", label: "reaches the endpoint first" },
          ],
        },
        title: "CSRF and SameSite",
        level: "intermediate",
        body: [
          "Cross-site request forgery abuses ambient authority: the browser attaches cookies to requests for your origin regardless of which page caused them. Another site submits a form to yours, the session cookie rides along, and the request arrives authenticated even though the user never intended to make it. The attacker cannot read the response, which is why CSRF is about actions rather than about theft.",
          "SameSite is the mechanism that fixed most of it. Lax, now the default in current browsers, means the cookie is not sent on cross-site requests except top-level navigations that are safe methods, which kills the cross-site form post. Strict withholds it even on ordinary navigation, so a user following a link from elsewhere arrives logged out, which is usually too blunt. None sends it everywhere and requires the Secure attribute.",
          "A synchroniser token is the explicit defence and remains worth having for sensitive actions: a random value tied to the session, rendered into the form, and required on submission. The attacker's page cannot read it, because the same-origin policy prevents reading your pages, so it cannot construct a valid request. The double-submit variant compares a cookie against a header and avoids server-side state, at the cost of being weaker if any subdomain can set cookies.",
          "Whether you need any of this follows directly from how the session travels. Cookies are ambient authority and need protection. A bearer token in an Authorization header that your own script sets is not attached by the browser to a third-party form post, so classic CSRF does not apply. Mirror that token into a cookie for convenience and the exposure returns immediately.",
          "There are two adjacent cases worth remembering. Simple cross-origin requests do not trigger a preflight, so a form post with a plain content type reaches your endpoint before CORS has any say, which is why CORS is not a CSRF defence. And a GET that changes state is exposed to a bare image tag, which is one of several reasons safe methods should be safe.",
          "The practical setup is short: SameSite=Lax plus Secure and HttpOnly on session cookies, tokens on state-changing forms, no state changes behind GET, and CORS configured as a separate concern that answers a different question.",
        ],
        why: "Whether you need CSRF protection follows directly from how you carry the session. Cookies are ambient authority and need it; an explicit Authorization header is not sent by a third-party page and does not.",
        check: {
          prompt: "Your API authenticates with a bearer token in an Authorization header, set by your SPA. Do you need CSRF tokens?",
          options: [
            "Yes, since any state-changing endpoint needs a synchroniser token",
            "Only if the token is also mirrored into a cookie for convenience",
            "Only when the API and the SPA are served from different origins",
            "Not for classic CSRF, the browser does not attach that header cross-site",
          ],
          correctIndex: 3,
          explain: "CSRF depends on credentials being sent automatically. A header your own script sets is not, so the cross-site form post arrives unauthenticated. Move the token to a cookie and the exposure returns.",
        },
        checks: [
          {
            prompt: "Why is a permissive CORS policy not the cause of a CSRF vulnerability?",
            options: [
              "A simple form post is sent without a preflight and does not need CORS",
              "CORS applies only to responses, and CSRF is about the request",
              "CORS headers are ignored when cookies are marked SameSite=Lax",
              "The attacker's origin is never sent, so CORS cannot evaluate it",
            ],
            correctIndex: 0,
            explain:
              "CORS decides whether a script may read a response. The forged request is submitted and acted upon before that question arises, which is why the two defences are unrelated.",
          },
          {
            prompt: "What makes a synchroniser token effective against a forged request?",
            options: [
              "The attacker's page cannot read your pages, so it cannot obtain the token",
              "The token is encrypted, so it cannot be reused outside the session",
              "The token expires quickly enough that a forged request arrives too late",
              "The browser refuses to submit a form containing an unknown token",
            ],
            correctIndex: 0,
            explain:
              "The same-origin policy is what does the work. A cross-site page can cause a request but cannot see the value it would need to include for that request to be accepted.",
          },
          {
            prompt: "Why should a GET request never change state?",
            options: [
              "It can be triggered by an image tag on any page on the internet",
              "It cannot carry a synchroniser token in its request body",
              "Browsers retry GET requests automatically after a network failure",
              "Search engines would otherwise index the resulting state change",
            ],
            correctIndex: 0,
            explain:
              "Anything that causes a GET, an image, a prefetch, a link preview in a chat client, becomes a way to trigger the action. Safe methods being safe is what makes the rest of the web's caching and retry behaviour sound.",
          },
        ],
      },
      {
        id: "ssrf",
        diagram: {
          caption: "The string was validated; the socket connects to whatever resolves",
          columns: [
            [{ id: "url", label: "Attacker's URL", sub: "webhook, import, preview", kind: "client" }],
            [{ id: "str", label: "Validate the string", sub: "host not in a private range", kind: "service", alternative: true },
             { id: "addr", label: "Validate at connect", sub: "the resolved address, every hop", kind: "service" },
             { id: "proxy", label: "Egress proxy", sub: "known hosts only", kind: "service" }],
            [{ id: "dns", label: "DNS points inward", sub: "or rebinds after the check", kind: "data", alternative: true },
             { id: "redir", label: "302 to internal", sub: "after validation passed", kind: "data", alternative: true }],
            [{ id: "meta", label: "Metadata endpoint", sub: "IMDSv2 requires a token", kind: "external" }],
          ],
          edges: [
            { from: "url", to: "str", label: "the intuitive fix" },
            { from: "str", to: "dns", label: "bypassed" },
            { from: "str", to: "redir", label: "bypassed" },
            { from: "url", to: "addr", label: "what works" },
            { from: "url", to: "proxy", label: "what keeps working" },
            { from: "dns", to: "meta", label: "role credentials" },
          ],
        },
        sources: [
          {
            label: "AWS: use IMDSv2",
            url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html",
            supports: "That version two of the metadata service requires a PUT to obtain a session token and applies a hop limit, which defeats the ordinary SSRF path that version one permits.",
          },
          {
            label: "Krebs on Security, What we can learn from the Capital One hack (2019)",
            url: "https://krebsonsecurity.com/2019/08/what-we-can-learn-from-the-capital-one-hack/",
            supports: "That the 2019 breach used a server-side request forgery, through a misconfigured web application firewall, to reach the instance metadata service and obtain role credentials with more permission than the task needed.",
          },
        ],
        title: "SSRF and the metadata endpoint",
        level: "advanced",
        body: [
          "Server-side request forgery is making your server fetch a URL an attacker chose. Any feature that accepts a URL is a candidate, and there are more of them than anyone expects: webhook registration, image import from a link, link preview generation, a PDF renderer fetching stylesheets, an avatar imported from a third party, an XML parser resolving an external entity, a health check whose target is configurable. Each was added for a good reason by somebody who was not thinking about this.",
          "The damage comes from where your server sits rather than from what it fetches. It is inside the network, past the firewall, holding an identity, and a request it makes on an attacker's behalf inherits all of that. So the reachable surface is internal services with no authentication because they were never exposed, admin panels bound to localhost, a Redis or Elasticsearch instance listening on a private address, and on a cloud instance the metadata endpoint, which hands out role credentials to anything that asks from that machine because being on the machine is the authentication.",
          "That metadata endpoint deserves naming precisely because the defence is available and often unenabled. The first version of the AWS service answers a plain unauthenticated GET, which is exactly what an SSRF gives an attacker. Version two requires a PUT to obtain a token first, and sets a hop limit so a response cannot be relayed onward, which defeats the ordinary case. Requiring version two is a single instance setting and it closes the specific path the 2019 Capital One breach took.",
          "Blocklisting is the intuitive defence and it does not hold, for a reason worth understanding rather than memorising: you validate a string, and the connection is made to whatever the name resolves to at the moment it is made. A hostname the attacker controls can resolve to a private address. It can resolve to a public address when you check and a private one when you connect, which is a DNS rebind. A response can be a redirect to an internal address after validation has already passed. And the address space is larger than the obvious ranges, with IPv6 forms, the many spellings of the loopback address, and decimal or octal encodings of the same host.",
          "What works is checking the address rather than the name, at the point the socket is opened, on every hop of every redirect, against an allowlist where one is possible and a deny list of the whole private space where it is not. Better still, do not make the check the developer's job at all: send outbound fetches through an egress proxy that permits only known destination hosts, so a new URL-fetching feature is covered by the network rather than by whoever wrote it having heard of the rule. The proxy is the only one of these that stays correct as the codebase grows.",
          "Two habits complete it. Treat the response as hostile too, because an attacker who cannot see the response can still learn from it: distinguishable timings and error messages turn a blind SSRF into a port scanner, so failures should look the same whatever went wrong. And give the fetching component its own network egress rules and its own credentials, so that even a successful request reaches as little as possible, which is the same bulkhead argument applied to the network rather than to a thread pool.",
        ],
        why: "Validating the URL string is the intuitive fix and the one that does not hold, because the string is not what gets connected to. The check has to happen on the resolved address, at connect time, on every hop.",
        inPractice: "The 2019 Capital One breach began with SSRF used to reach the instance metadata service and retrieve role credentials.",
        check: {
          prompt:
            "You reject submitted webhook URLs whose host is in any private or link-local range. Assume the range list is complete. Why is this still insufficient?",
          options: [
            "The hostname is resolved after the check, so DNS and redirects can retarget the request",
            "The list omits the IPv6 forms of those ranges, which resolve to the same services",
            "Requiring HTTPS closes the gap, since internal services lack a valid certificate",
            "Range blocking rejects legitimate customers whose endpoints sit behind NAT",
          ],
          correctIndex: 0,
          explain:
            "Every option here describes something real, but only the first survives a complete range list. You validated a string; the connection is made to whatever the name resolves to at connect time, and a 302 moves the target again after that. Validation has to happen on the resolved IP, on every hop.",
        },
        checks: [
          {
            prompt: "Why is the cloud metadata endpoint the classic SSRF target?",
            options: [
              "It answers unauthenticated requests from the instance with role credentials",
              "It is reachable from the public internet on a well-known address",
              "It accepts writes, so an attacker can change the instance's permissions",
              "It proxies requests onward, which conceals the attacker's origin",
            ],
            correctIndex: 0,
            explain:
              "Being on the instance is the authentication, which is exactly the position SSRF grants an attacker. The 2019 Capital One breach followed that path to role credentials.",
          },
          {
            prompt: "Which SSRF defence keeps working when a new URL-fetching feature is added?",
            options: [
              "An egress proxy that permits only known destination hosts",
              "A shared helper that validates URLs before any request is made",
              "A code review checklist item covering outbound HTTP calls",
              "A blocklist of internal hostnames maintained centrally",
            ],
            correctIndex: 0,
            explain:
              "The proxy is enforced by the network rather than by remembering to call something. Every other option depends on the next developer knowing a rule that nothing enforces.",
          },
          {
            prompt: "A URL passes validation, then the response is a 302 to an internal address. What is required?",
            options: [
              "Re-validating the resolved address at every redirect hop",
              "Rejecting all redirects, since a valid endpoint never issues one",
              "Following redirects only when the scheme remains unchanged",
              "Limiting the redirect chain to a small maximum number of hops",
            ],
            correctIndex: 0,
            explain:
              "One validation covers one destination. Redirects and DNS both move the target after the check, so the check has to happen where the connection is actually made.",
          },
        ],
      },
      {
        id: "supply-chain",
        inPractice:
          "The controls that matter follow from the threat model rather than from a vendor's product list: fewer dependencies, automated updates so you are never far behind, CI tokens scoped narrowly and expiring quickly, and install scripts disabled where the ecosystem allows it. Beyond that the direction is provenance: npm publishes signed attestations built through Sigstore, so a consumer can verify that a package was built from the repository and by the pipeline it claims, which is the gap a lockfile cannot close.",
        diagram: {
          caption: "A postinstall script anywhere in the tree runs with your build's privileges",
          columns: [
            [{ id: "add", label: "One dependency", sub: "for one helper function", kind: "client" }],
            [{ id: "tree", label: "1,000 packages", sub: "1,000 maintainer accounts", kind: "data" }],
            [{ id: "script", label: "postinstall", sub: "runs without being imported", kind: "service", alternative: true }],
            [{ id: "creds", label: "CI secrets", sub: "deploy credentials, signing keys", kind: "external", alternative: true },
             { id: "prov", label: "Signed provenance", sub: "built from the claimed repo", kind: "external" }],
          ],
          edges: [
            { from: "add", to: "tree", label: "invisible in the import" },
            { from: "tree", to: "script", label: "any one of them" },
            { from: "script", to: "creds", label: "your build's privileges" },
            { from: "tree", to: "prov", label: "what a lockfile cannot give", async: true },
          ],
        },
        sources: [
          {
            label: "npm: generating provenance statements",
            url: "https://docs.npmjs.com/generating-provenance-statements",
            supports: "That signed provenance attestations, built on Sigstore, let a consumer verify the source repository and build pipeline a package came from.",
          },
        ],
        title: "Dependencies and supply chain",
        level: "advanced",
        body: [
          "Most of what ships is code nobody on your team wrote, and the threat model follows from one fact: a postinstall script in any transitive dependency runs with your build's privileges. That is a direct path to CI secrets, deploy credentials and the artefact you are about to publish, and it does not require anyone to import the package or call a function in it.",
          "That reframes the question. It is not whether a library is any good; it is whether you trust its author, and everyone its author trusts, with execution on your build machine. A tree of a thousand packages is a thousand maintainer accounts, several of which will be handed to a new maintainer this year without anyone downstream noticing.",
          "Lockfiles are necessary and not sufficient. They pin what you resolved, with integrity hashes so the bytes cannot change under a pinned version, which is genuinely valuable. They do not help when a legitimate maintainer publishes a malicious version you then upgrade to, and they do nothing about a typosquatted name that sat one keystroke away from the real one when it was first added.",
          "The controls that pay for a small team are unglamorous. Fewer dependencies, treated as a cost rather than a convenience. Automated updates so you are never far behind, because staying current is also how you get the fix. CI tokens scoped to exactly what the job needs and expiring quickly. Builds that do not run arbitrary install scripts where the ecosystem allows that to be disabled. And a review step for new dependencies that asks who maintains this rather than does it work.",
          "Beyond that, provenance is where the ecosystem is going. A software bill of materials records what actually went into a build, so the question after a disclosure is a lookup rather than an investigation. Signed provenance attestations, from npm and from Sigstore, let a consumer verify that a package was built from the repository it claims and by the pipeline it claims, which closes the gap that lockfiles cannot. The lesson from the incidents that made the news, the event-stream package, the ua-parser-js compromise, the left-pad removal, is that all three were dependency-of-a-dependency problems. Nobody chose them and everybody shipped them, which is the reason the count itself is the number worth managing.",
        ],
        why: "The threat model is that adding a dependency grants its author execution on your build machine. That reframes 'is this library any good' into 'do I trust this author with my deploy credentials', which is the question that actually matters.",
        check: {
          prompt: "Which most reduces supply chain risk for a small team?",
          options: [
            "Reviewing the source of every direct dependency before adding it to the tree",
            "Pinning every version and holding them, so no unreviewed code ever arrives",
            "Fewer dependencies, a lockfile, prompt updates, and least-privilege CI tokens",
            "Vendoring everything into the repository, so builds never fetch anything",
          ],
          correctIndex: 2,
          explain: "Auditing everything does not scale and never updating accumulates known vulnerabilities. Reducing count, staying current, and limiting what a compromised build can reach are the levers a small team can actually pull.",
        },
        checks: [
          {
            prompt: "Why does a lockfile with integrity hashes not remove supply chain risk?",
            options: [
              "A maintainer can publish a malicious new version that you later upgrade to",
              "Hashes cover only direct dependencies, not transitive ones",
              "Lockfiles are regenerated on every install, so pins do not persist",
              "Integrity hashes are computed after install scripts have already run",
            ],
            correctIndex: 0,
            explain:
              "The lockfile guarantees you get the bytes you resolved. It says nothing about whether the next version you accept is trustworthy, which is where most real compromises arrive.",
          },
          {
            prompt: "What does a signed provenance attestation let a consumer verify?",
            options: [
              "That a package was built from the repository and pipeline it claims",
              "That the package contains no known vulnerabilities at publish time",
              "That the maintainer's account was protected by two-factor authentication",
              "That the package's dependencies were themselves reviewed before release",
            ],
            correctIndex: 0,
            explain:
              "It links the artefact to its source and its build, which closes the gap where a package on the registry has no verifiable relationship to the code people read on the repository page.",
          },
          {
            prompt: "What do the well-known npm compromises have in common?",
            options: [
              "They arrived through a dependency of a dependency nobody chose",
              "They exploited a flaw in the registry's package resolution logic",
              "They required the victim to call a specific function to be affected",
              "They were introduced by attackers who compromised the registry itself",
            ],
            correctIndex: 0,
            explain:
              "Nobody added them deliberately and everybody shipped them. That is why the total dependency count, rather than the quality of the ones you picked, is the number worth managing.",
          },
        ],
      },
    ],
  },

  {
    id: "isolation",
    title: "Transactions and isolation",
    summary: "MVCC, snapshot isolation, write skew, and the anomalies your default level allows.",
    track: "design",
    topics: [
      {
        id: "isolation-levels",
        inPractice:
          "Two engines, the same words, materially different behaviour: Postgres defaults to read committed and implements repeatable read as snapshot isolation, while MySQL InnoDB defaults to repeatable read and uses gap locks to prevent many phantoms. Postgres also implements serializable as serializable snapshot isolation, which aborts rather than blocks, so turning it on without a retry loop converts a rare anomaly into a visible error rate.",
        diagram: {
          caption: "Each level is defined by the anomaly it forbids, not by a strength rating",
          columns: [
            [{ id: "ru", label: "Read uncommitted", sub: "dirty reads permitted", kind: "data", alternative: true },
             { id: "rc", label: "Read committed", sub: "non-repeatable reads permitted", kind: "data" },
             { id: "rr", label: "Repeatable read", sub: "write skew still permitted", kind: "data" },
             { id: "ser", label: "Serializable", sub: "matches some serial order", kind: "data" }],
            [{ id: "lock", label: "Two-phase locking", sub: "contention appears as blocking", kind: "service" },
             { id: "ssi", label: "Snapshot isolation", sub: "contention appears as aborts", kind: "service" }],
            [{ id: "retry", label: "A retry loop", sub: "not optional with SSI", kind: "external" }],
          ],
          edges: [
            { from: "rc", to: "rr", label: "raise per transaction" },
            { from: "rr", to: "ser", label: "only where a rule spans rows" },
            { from: "ser", to: "lock", label: "one implementation" },
            { from: "ser", to: "ssi", label: "the other" },
            { from: "ssi", to: "retry", label: "or a visible error rate" },
          ],
        },
        sources: [
          {
            label: "PostgreSQL: transaction isolation",
            url: "https://www.postgresql.org/docs/current/transaction-iso.html",
            supports: "That Postgres defaults to read committed, implements repeatable read as snapshot isolation, and implements serializable by aborting transactions rather than blocking them.",
          },
        ],
        title: "The four levels and what each permits",
        level: "intermediate",
        body: [
          "The four levels are defined by the anomalies they forbid, which is a more useful way to hold them than as a ladder of strength. Read uncommitted allows dirty reads, seeing another transaction's uncommitted work. Read committed forbids that and still allows non-repeatable reads: the same query run twice in one transaction can return different values, because someone committed in between.",
          "Repeatable read forbids that too for rows already read, and in the classical definition still permits phantoms: rows appearing in a range you queried earlier. Serializable is the only level that guarantees the outcome matches some serial order of the transactions, which is the guarantee people assume they have all along.",
          "The defaults differ and matter more than the definitions. Postgres defaults to read committed and its repeatable read is really snapshot isolation, which does prevent phantoms in the classical sense while still permitting write skew. MySQL InnoDB defaults to repeatable read and prevents many phantoms with gap locks, which is a different mechanism with different deadlock behaviour. Two engines, the same words, materially different behaviour.",
          "Serializable is implemented in two very different ways, and knowing which decides how it fails. Two-phase locking makes transactions wait, so contention appears as blocking. Postgres uses serializable snapshot isolation, which lets them run and aborts one when a dangerous pattern is detected, so contention appears as failed transactions your application must retry. Turning on serializable without a retry loop turns a rare anomaly into a visible error rate.",
          "The practical approach is per transaction rather than per system. Leave the default in place for the majority, and raise the level only on the specific paths where a business rule spans rows, with a retry on the serialisation failures that follow. A blanket serializable default is usually a way of paying for isolation everywhere to protect two code paths.",
          "The one thing not to do is assume. The letters ACID are a promise about a configuration, the configuration has a default nobody chose, and the anomalies permitted at that default are the shape of the bugs you will eventually be debugging with no error message to guide you.",
        ],
        why: "Every level above read committed costs concurrency, which is why nobody defaults to serializable. The engineering question is which anomalies your specific workload can tolerate, not which level sounds safest.",
        check: {
          prompt: "Under read committed, you run the same SELECT twice in one transaction and get different results. Is this a bug?",
          options: [
            "Yes, a transaction must observe one consistent snapshot for its lifetime",
            "Only if rows were deleted; committed updates stay hidden until you commit",
            "No, non-repeatable reads are permitted there; use repeatable read for stability",
            "No, but only because the second read saw data committed before you began",
          ],
          correctIndex: 2,
          explain: "Read committed only guarantees you never see uncommitted data. Other transactions committing between your two reads is expected behaviour at that level.",
        },
        checks: [
          {
            prompt: "Postgres and MySQL both offer repeatable read. Why does behaviour still differ?",
            options: [
              "Postgres implements it as snapshot isolation; InnoDB uses gap locks",
              "MySQL applies it per statement, whereas Postgres applies it per transaction",
              "Postgres upgrades it to serializable when a conflict is detected",
              "MySQL only honours it for tables with an explicit primary key",
            ],
            correctIndex: 0,
            explain:
              "The same words describe different mechanisms with different failure modes, one aborting on conflict and one blocking with gap locks. Reading the engine's own documentation is the only way to know what your default gives you.",
          },
          {
            prompt: "What must accompany switching a path to serializable in Postgres?",
            options: [
              "A retry loop, because conflicting transactions abort rather than block",
              "A longer lock timeout, since transactions now wait behind each other",
              "A read replica, so long queries do not hold the serialisable snapshot",
              "An explicit lock on every row that the transaction intends to read",
            ],
            correctIndex: 0,
            explain:
              "Serializable snapshot isolation detects dangerous patterns and aborts one participant. Without a retry, a rare anomaly is replaced by a visible error rate, which is a worse trade than the one you meant to make.",
          },
          {
            prompt: "Why raise the isolation level per transaction rather than for the whole system?",
            options: [
              "Most transactions do not need it, and every level above the default costs",
              "Mixed levels let the planner choose cheaper plans for read-only work",
              "A system-wide level cannot be changed once the connections are pooled",
              "Higher levels are available only on the primary, never on a replica",
            ],
            correctIndex: 0,
            explain:
              "Isolation is bought with concurrency and with aborts. Paying for it on the two paths where a rule spans rows is very different from paying for it on every request the service handles.",
          },
        ],
      },
      {
        id: "mvcc",
        inPractice:
          "The production incident this creates is almost never a correctness bug. It is a connection left idle in transaction by a pool or a debugger, which holds the vacuum horizon still for the whole database while a busy table bloats and its queries slow down, with write volume entirely normal. Monitoring the age of the oldest transaction as a first-class metric, and treating idle in transaction as an alertable state, is what catches it before the table has to be rewritten.",
        diagram: {
          caption: "The oldest open transaction sets the horizon for the whole database",
          columns: [
            [{ id: "upd", label: "Update", sub: "insert a version, mark the old", kind: "client" }],
            [{ id: "vers", label: "Many row versions", sub: "readers see their snapshot", kind: "data" }],
            [{ id: "vac", label: "Vacuum", sub: "reclaims what nobody needs", kind: "service" },
             { id: "idle", label: "Idle in transaction", sub: "holds the horizon still", kind: "service", alternative: true }],
            [{ id: "reuse", label: "Space reusable", sub: "not returned to the OS", kind: "external" },
             { id: "bloat", label: "Bloat", sub: "queries slow, writes normal", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "upd", to: "vers", label: "no overwrite" },
            { from: "vers", to: "vac", label: "once no one needs them" },
            { from: "vers", to: "idle", label: "one open transaction" },
            { from: "vac", to: "reuse", label: "made reusable" },
            { from: "idle", to: "bloat", label: "the classic incident" },
          ],
        },
        title: "MVCC and snapshot isolation",
        level: "advanced",
        body: [
          "Multi-version concurrency control keeps several versions of each row rather than updating in place. A reader sees the snapshot that existed when its transaction began, while writers create new versions alongside. Readers do not block writers and writers do not block readers, which is the property that makes a database usable under mixed load and is the reason MVCC won. An update is therefore an insert of a new version plus a mark on the old one, not an overwrite. That has consequences people meet later: an update costs roughly what an insert costs, updating one column of a wide row still writes the whole row in Postgres, and every index entry has to be maintained for the new version unless the update qualifies for the in-page optimisation.",
          "The old versions accumulate and have to be reclaimed, which is what vacuum does. It can only remove a version once no transaction might still need it, so the oldest open transaction sets the horizon for the entire database. That is the mechanism behind the classic production incident: a connection left idle in transaction by a pool or a debugger, holding the horizon still while a busy table bloats and its queries slow down, with write volume completely normal.",
          "Bloat is the visible symptom and the space is not returned to the operating system by ordinary vacuum, only made reusable, so a table that ballooned stays large until it is rewritten. Autovacuum is tuned per table for a reason: a hot table with a high update rate frequently needs it running more aggressively than the defaults, and the settings that matter are the scale factor and the cost limits.",
          "What MVCC buys at the isolation level is snapshot isolation, and it is worth being precise that this is not serializable. A snapshot is consistent, so every read in a transaction agrees with every other, and two transactions can still each read a consistent snapshot, each check a rule that holds in it, and each write something that makes the rule false. That is write skew, and it is the subject of the next topic.",
          "The practical habits follow directly. Keep transactions short, never hold one open across user interaction or an external call, monitor the age of the oldest transaction as a first-class metric, and treat idle in transaction as an alertable state rather than a curiosity in a connection list.",
        ],
        why: "The failure this creates in production is rarely a correctness bug, it is an idle transaction left open by a connection pool, blocking vacuum until the table bloats and queries slow down.",
        check: {
          prompt: "Table bloat is growing and queries are slowing, but write volume is normal. Most likely cause under MVCC?",
          options: [
            "Autovacuum is being outrun by the update rate on that particular table",
            "A long-running or idle-in-transaction session pinning old row versions",
            "Indexes have bloated, since every row version needs its own entry",
            "The isolation level is serializable, which retains more versions than needed",
          ],
          correctIndex: 1,
          explain: "Old versions can only be removed once no transaction might still need them. One forgotten open transaction pins the horizon for the whole table.",
        },
        checks: [
          {
            prompt: "Under MVCC, what does updating a single column of a wide row cost?",
            options: [
              "A new version of the entire row, plus index maintenance for it",
              "An in-place write of that column, with the old value kept in the log",
              "A new version of the changed column only, linked to the original row",
              "A copy of the row into an overflow area, leaving the original intact",
            ],
            correctIndex: 0,
            explain:
              "There is no partial update: the new version is a whole row. That is why update-heavy wide tables generate far more write volume than the size of the change suggests.",
          },
          {
            prompt: "Which metric best warns of the classic MVCC production problem?",
            options: [
              "The age of the oldest open transaction on the database",
              "The number of rows updated per second on the busiest table",
              "The ratio of index size to table size across the schema",
              "The number of connections currently held by the pool",
            ],
            correctIndex: 0,
            explain:
              "Everything downstream, bloat, slow queries, vacuum falling behind, follows from one transaction holding the horizon still. Alerting on idle in transaction catches it before the table has to be rewritten.",
          },
          {
            prompt: "Why does a bloated table stay large after vacuum has run?",
            options: [
              "Ordinary vacuum makes space reusable rather than returning it to the disk",
              "Vacuum defers reclamation until the table is next written to",
              "Index entries keep the pages pinned until the indexes are rebuilt",
              "Statistics are not updated, so the planner still assumes the old size",
            ],
            correctIndex: 0,
            explain:
              "The space is available for future rows and the file does not shrink. Returning it needs a rewrite, which is why avoiding the bloat is much cheaper than fixing it.",
          },
        ],
      },
      {
        id: "write-skew",
        inPractice:
          "The cheapest fix is usually to change the model rather than the isolation level, because a constraint is checked by the database on every path including the script somebody runs by hand at midnight. Postgres exclusion constraints express a surprising number of these rules directly, most usefully non-overlapping ranges for booking and scheduling, which is exactly the shape that write skew otherwise breaks.",
        diagram: {
          caption: "Two rows written, no conflict detected, rule now false",
          columns: [
            [{ id: "d1", label: "Doctor A", sub: "sees B is on call", kind: "client" },
             { id: "d2", label: "Doctor B", sub: "sees A is on call", kind: "client" }],
            [{ id: "snap", label: "Own snapshot each", sub: "the rule holds in both", kind: "service" }],
            [{ id: "w1", label: "A removes A", sub: "writes one row", kind: "data" },
             { id: "w2", label: "B removes B", sub: "writes a different row", kind: "data" }],
            [{ id: "none", label: "Nobody on call", sub: "no error was ever raised", kind: "external", alternative: true },
             { id: "mat", label: "A rota row to lock", sub: "or an exclusion constraint", kind: "external" }],
          ],
          edges: [
            { from: "d1", to: "snap", label: "check passes" },
            { from: "d2", to: "snap", label: "check passes" },
            { from: "snap", to: "w1", label: "commit" },
            { from: "snap", to: "w2", label: "commit" },
            { from: "w1", to: "none", label: "no rows conflict" },
            { from: "w2", to: "mat", label: "make the conflict real" },
          ],
        },
        sources: [
          {
            label: "PostgreSQL: exclusion constraints",
            url: "https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION",
            supports: "That a class of set-spanning rule, most usefully non-overlapping ranges, can be expressed as a constraint the database enforces on every path.",
          },
        ],
        checks: [
          {
            prompt: "Which of these rules is vulnerable to write skew?",
            options: [
              "At least one administrator must remain on every account",
              "An email address must be unique across the whole user table",
              "A row's status must be one of a fixed set of permitted values",
              "A quantity column must never be allowed to fall below zero",
            ],
            correctIndex: 0,
            explain:
              "The vulnerable shape is a rule about a set combined with a write to a member of it: two administrators can each see the other and each remove themselves. The other three are expressible as a constraint on a single row or column, so the database enforces them on every path.",
          },
          {
            prompt: "What does materialising the conflict mean in practice?",
            options: [
              "Give the rule a row that every participant has to lock",
              "Recompute the rule after committing and undo it if broken",
              "Hold the read locks until the end of the transaction instead",
              "Store the rule as a trigger so the engine evaluates it once",
            ],
            correctIndex: 0,
            explain:
              "Write skew happens because the transactions write different rows, so nothing conflicts. Adding a row that stands for the rule itself, a rota row or a counter, turns an invisible predicate into a real write conflict the database can detect.",
          },
          {
            prompt: "Why does serializable isolation need a retry loop to be usable?",
            options: [
              "Postgres detects the dangerous pattern and aborts one transaction",
              "Serialisable transactions time out rather than waiting on a lock",
              "The engine replays the transaction itself and reports the attempts",
              "Snapshots expire, so a long transaction has to be restarted anyway",
            ],
            correctIndex: 0,
            explain:
              "Serializable snapshot isolation lets transactions run and aborts one when it spots a read-write pattern that could not have occurred serially. Without a retry, turning it on converts a rare silent anomaly into a visible error rate.",
          },
        ],
        title: "Write skew",
        level: "advanced",
        body: [
          "Write skew is the anomaly people are most confident their database prevents. Two transactions read an overlapping set of rows, each checks a rule that still holds in its own snapshot, and each writes a different row. Neither touches what the other wrote, so nothing conflicts, both commit, and the rule is now false.",
          "The textbook case is on-call cover: two doctors each check that at least one other doctor remains on duty, each sees a snapshot where that is true, and each takes themselves off the rota. Both checks passed. Nobody is on call. No database error was raised at any point, because from each transaction's perspective nothing was wrong.",
          "The shape to recognise is a rule about a set combined with a write to a member of that set. Reserving the last seat, keeping a balance above zero across several accounts, enforcing at most one active subscription, allocating unique meeting rooms, maintaining a minimum staffing level. Every one of those is a constraint that no single row can express, which is exactly why the database cannot enforce it for you.",
          "There are three fixes and they trade differently. Serializable isolation detects the dangerous read-write pattern and aborts one transaction, which is correct and needs a retry loop. Materialising the conflict gives the rule a row of its own, a rota row or a counter, that every participant must lock, which turns an invisible predicate into a real write conflict the database can see. A predicate lock does the same explicitly where the engine supports it.",
          "The cheapest fix is often to change the model rather than the isolation level. A unique constraint or an exclusion constraint expresses many of these rules directly, and a constraint is checked by the database on every path, including the script somebody runs by hand at midnight. Where the rule can be made into a constraint, that is a better answer than any transaction setting.",
          "The reason this stays hidden is that it needs concurrency and a rule spanning rows, which no unit test has and every production system does. It will not appear in review, will not appear in staging, and will appear on the day two people click at the same moment, which is why recognising the shape is worth more than remembering the name.",
        ],
        why: "This is the anomaly people assume their database prevents. It is invisible in testing because it needs concurrency and a constraint spanning rows, which is exactly the shape of most real business rules.",
        check: {
          prompt: "Two transactions each verify at least one doctor remains on call, then each remove a different doctor. Both commit and nobody is on call. What happened?",
          options: [
            "A lost update, since the second commit overwrote the first one's decision",
            "A phantom read, because a row matching the predicate appeared mid-transaction",
            "A deadlock the database resolved by committing both instead of aborting one",
            "Write skew, the constraint spans rows, and neither wrote what the other read",
          ],
          correctIndex: 3,
          explain: "They wrote disjoint rows, so nothing conflicted. Snapshot isolation allows this; serializable, or forcing both through one shared row, does not.",
        },
      },
      {
        id: "wal-outbox",
        inPractice:
          "The relay can poll the table or read the replication log directly, and the choice is a maintenance one rather than a correctness one: polling every second costs a query and a second of latency, while change data capture through the write-ahead log costs neither and adds Debezium or an equivalent to operate. Teams that want the published event to be a designed contract keep the outbox table; teams that want the plumbing to disappear read the log.",
        checks: [
          {
            prompt: "Why does wrapping the database write and the publish in one transaction not help?",
            options: [
              "The broker is not a participant, so the transaction cannot cover it",
              "Transactions cannot span a network call of any kind by definition",
              "The publish is asynchronous, so it completes after the commit does",
              "Brokers reject writes that arrive inside an open transaction block",
            ],
            correctIndex: 0,
            explain:
              "A database transaction is atomic over that database. The broker has no part in it and will not roll back because the transaction did, which is why the gap survives the transaction block and needs the event moved inside the same commit instead.",
          },
          {
            prompt: "The relay publishes an event and dies before marking the row sent. What happens?",
            options: [
              "The event is published a second time, so consumers must absorb it",
              "The event is lost, since the row is no longer eligible for pickup",
              "The broker deduplicates it, because the payload is byte identical",
              "The row stays pending forever and requires manual intervention",
            ],
            correctIndex: 0,
            explain:
              "That crash window is exactly why delivery is at least once. It is the correct trade: a duplicate is survivable with an idempotent consumer and a lost event is not, so the design chooses the recoverable failure.",
          },
          {
            prompt: "What does an outbox table need that is easy to leave out?",
            options: [
              "An index on unsent rows, and a job that prunes what has been sent",
              "A foreign key to the row whose change the event describes",
              "A unique constraint on the payload to prevent duplicate events",
              "Its own database, so relay queries do not touch the primary",
            ],
            correctIndex: 0,
            explain:
              "The relay polls for unsent rows on a hot path, so without a partial index that query scans a growing table, and without pruning the table grows without bound. Both turn the outbox itself into the slowest part of the write path.",
          },
        ],
        title: "The write-ahead log and the outbox",
        level: "advanced",
        body: [
          "Writing to your database and then publishing an event is two operations that can fail independently. Commit succeeds, the process dies before the publish, and the event is gone: the order exists and nothing downstream will ever hear about it. Publish first and you have the opposite problem, an event for an order that was never created.",
          "The outbox pattern makes it one operation. The event is written to an outbox table in the same transaction as the data, so both commit or neither does. A separate relay reads that table and publishes, marking rows as sent.",
          "Delivery is still at-least-once. The relay can publish and die before recording that it did, so the same event goes out twice, which is why consumers stay idempotent. What the outbox removes is the possibility of losing an event entirely, and losing one is far worse than seeing one twice.",
          "The relay can poll the table or read the database's replication log directly. Polling every second is simple and adds a query and a second of latency; change data capture via the write-ahead log has no polling delay and no query load, at the cost of running Debezium or similar. Either way the outbox needs an index on unsent rows and a cleanup job, because a table nobody prunes becomes the slowest part of the write path.",
        ],
        why:
          "This is dual writes solved properly rather than mitigated. Retries and reconciliation reduce how often the gap between commit and publish loses an event; putting the event inside the transaction removes the gap.",
        diagram: {
          "caption": "The event is written in the same transaction as the data, so it cannot be lost",
          "columns": [
            [
              {
                "id": "app",
                "label": "Service",
                "kind": "service"
              }
            ],
            [
              {
                "id": "tx",
                "label": "One transaction",
                "sub": "row + outbox row",
                "kind": "data"
              }
            ],
            [
              {
                "id": "bus",
                "label": "Broker",
                "sub": "relayed from the outbox",
                "kind": "queue"
              }
            ]
          ],
          "edges": [
            {
              "from": "app",
              "to": "tx",
              "label": "commit both or neither"
            },
            {
              "from": "tx",
              "to": "bus",
              "label": "relay publishes, at least once",
              "async": true
            }
          ]
        },
        check: {
          prompt: "Why does the outbox pattern beat publishing an event right after the transaction commits?",
          options: [
            "It closes the window where the commit succeeds and the publish does not",
            "It guarantees exactly-once delivery, since the row is only ever written once",
            "It preserves event order, since the outbox is drained in primary key order",
            "It removes the broker, since consumers can poll the outbox table directly",
          ],
          correctIndex: 0,
          explain: "The gap between commit and publish is where events are lost. Writing the event in the same transaction closes it, delivery is still at-least-once, so consumers stay idempotent.",
        },
      },
    ],
  },

  {
    id: "replication-depth",
    title: "Quorums, PACELC and failure domains",
    summary: "Leaderless replication, the part of CAP nobody quotes, and containing blast radius.",
    track: "design",
    topics: [
      {
        id: "quorums",
        inPractice:
          "This is the design behind Dynamo, Cassandra and Riak, which is why those systems ask you to choose consistency per query rather than per cluster: Cassandra exposes the consistency level on each read and write, so ONE, QUORUM and ALL are a parameter rather than a property of the deployment. The dial being genuinely yours is a feature when workloads differ and a hazard when nobody decided.",
        diagram: {
          caption: "R plus W greater than N forces the read set to overlap the write set",
          columns: [
            [{ id: "w", label: "Write, W=2", sub: "of N=3 replicas", kind: "client" }],
            [{ id: "r1", label: "Replica 1", sub: "has the write", kind: "data" },
             { id: "r2", label: "Replica 2", sub: "has the write", kind: "data" },
             { id: "r3", label: "Replica 3", sub: "stale", kind: "data", alternative: true }],
            [{ id: "read", label: "Read, R=2", sub: "must touch one that has it", kind: "service" },
             { id: "sloppy", label: "Sloppy quorum", sub: "overlap no longer guaranteed", kind: "service", alternative: true }],
            [{ id: "repair", label: "Repair", sub: "read repair, handoff, Merkle trees", kind: "external" }],
          ],
          edges: [
            { from: "w", to: "r1", label: "acknowledged" },
            { from: "w", to: "r2", label: "acknowledged" },
            { from: "w", to: "r3", label: "not yet" },
            { from: "read", to: "r1", label: "sees the latest" },
            { from: "read", to: "r3", label: "and a stale copy" },
            { from: "read", to: "sloppy", label: "if nodes were substituted" },
            { from: "r3", to: "repair", async: true },
          ],
        },
        sources: [
          {
            label: "DeCandia et al., Dynamo: Amazon's highly available key-value store (SOSP 2007)",
            url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
            supports: "The N, R and W formulation, sloppy quorums with hinted handoff, and anti-entropy using Merkle trees.",
          },
        ],
        title: "Quorum reads and writes",
        level: "advanced",
        body: [
          "In a leaderless system every replica accepts writes, so there is no failover and no leader election to get wrong. With N replicas, a write waits for W acknowledgements before returning and a read collects R responses before answering. Those three numbers are the entire consistency model, exposed as configuration.",
          "When R plus W exceeds N the read set and the write set must overlap in at least one replica, so a read is guaranteed to see at least one copy of the latest acknowledged write. That is the whole argument, and it is the same overlap argument that makes consensus work. Versioning then decides which of the returned values is newest, usually with vector clocks or a last-write-wins timestamp.",
          "Tuning those numbers tunes the trade rather than switching a mode. W equal to N gives maximally durable writes and no write availability if a single node is unreachable. W of one returns quickly and risks losing the write if that node dies before replicating. R of one is a fast possibly-stale read; R equal to N is a slow read that has consulted everyone.",
          "The guarantee is weaker than it looks in several specific ways worth knowing, because they are how quorum systems surprise people. A write that reaches fewer than W nodes may still have been applied on some of them, so a failed write is not an undone write. Concurrent writes to different replicas produce siblings that the application must reconcile. And with sloppy quorums, where unavailable nodes are substituted by others holding hinted handoffs, R plus W greater than N no longer guarantees overlap at all.",
          "Repair is the part that makes it work in practice. Read repair fixes stale replicas it notices while answering a read, hinted handoff replays writes to a node that was down when it returns, and anti-entropy compares replicas in the background using Merkle trees so differences are found without transferring everything. Without those, a quorum system converges only where traffic happens to look. The reason to know this is that it is the design behind Dynamo, Cassandra and Riak, and it explains why those systems ask you to choose consistency per query rather than per cluster. The dial is genuinely yours, which is a feature when you have workloads with different needs and a hazard when nobody decided.",
        ],
        why: "R plus W greater than N is where consistency becomes a dial rather than a mode. It is also the answer to why Dynamo-style stores can offer both behaviours from one design.",
        check: {
          prompt: "With N=3, which configuration guarantees a read sees the latest acknowledged write?",
          options: [
            "R=1, W=1",
            "R=1, W=2",
            "R=2, W=2",
            "R=1, W=3 is the only option",
          ],
          correctIndex: 2,
          explain: "Overlap needs R + W > N. With N=3, R=2 and W=2 gives 4 > 3. R=1,W=3 also works but sacrifices all write availability; R=2,W=2 tolerates one node down on both paths.",
        },
        checks: [
          {
            prompt: "A quorum write fails to reach W nodes and returns an error. What is the state?",
            options: [
              "Nothing was written, since the write is atomic across the quorum",
              "The write may be applied on some replicas and will be read later",
              "The write is queued and retried automatically until W is reached",
              "The coordinator rolls back the replicas that did acknowledge it",
            ],
            correctIndex: 1,
            explain:
              "There is no rollback in a leaderless system. A failed write is not an undone write, so the client sees an error while a subsequent read may still return that value.",
          },
          {
            prompt: "What does a sloppy quorum give up in exchange for write availability?",
            options: [
              "The overlap guarantee, since substitutes are not the intended replicas",
              "Durability, because hinted handoffs are held only in memory",
              "Ordering, because substitute nodes apply writes out of sequence",
              "Read repair, which cannot run while hints remain undelivered",
            ],
            correctIndex: 0,
            explain:
              "R plus W greater than N only guarantees overlap when both sets are drawn from the same N. Once unavailable nodes are substituted, a read quorum can miss the write entirely.",
          },
          {
            prompt: "Why do quorum systems need anti-entropy as well as read repair?",
            options: [
              "Read repair only fixes what traffic happens to touch",
              "Read repair cannot correct deletes, only stale values",
              "Anti-entropy is required to establish the version vector ordering",
              "Read repair runs on the coordinator, which may itself be stale",
            ],
            correctIndex: 0,
            explain:
              "Rarely read data would stay divergent indefinitely. Background comparison with Merkle trees finds differences without depending on someone asking for them first.",
          },
        ],
      },
      {
        id: "pacelc",
        inPractice:
          "The notation says two things and it is worth reading both. Cassandra and Dynamo-style stores with their default settings are PA/EL: available when partitioned, latency-favouring the rest of the time. A single-primary relational database with synchronous replication is PC/EC. Spanner is the interesting case, PC/EC by design, and it pays for it in the else branch with a commit-wait that geography prices, which is exactly what the second half of the acronym exists to make visible.",
        diagram: {
          caption: "Two branches, and only one of them happens every second",
          columns: [
            [{ id: "state", label: "Network state", sub: "partitioned, or healthy", kind: "client" }],
            [{ id: "pa", label: "P: availability", sub: "answer, risk divergence", kind: "service" },
             { id: "pc", label: "P: consistency", sub: "refuse the write", kind: "service" }],
            [{ id: "el", label: "E: latency", sub: "nearest replica, possibly stale", kind: "data" },
             { id: "ec", label: "E: consistency", sub: "quorum round trips", kind: "data" }],
            [{ id: "rare", label: "Once a year", sub: "what CAP describes", kind: "external", alternative: true },
             { id: "every", label: "Every request", sub: "what actually shapes the system", kind: "external" }],
          ],
          edges: [
            { from: "state", to: "pa", label: "partitioned" },
            { from: "state", to: "pc", label: "partitioned" },
            { from: "state", to: "el", label: "healthy" },
            { from: "state", to: "ec", label: "healthy" },
            { from: "pa", to: "rare", label: "the famous half" },
            { from: "el", to: "every", label: "the half nobody quotes" },
          ],
        },
        sources: [
          {
            label: "Abadi, Consistency tradeoffs in modern distributed database system design (IEEE Computer, 2012)",
            url: "https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf",
            supports: "The PACELC formulation itself, and the argument that the else branch describes the trade made on every request rather than only during a partition.",
          },
        ],
        title: "PACELC: the half of CAP nobody quotes",
        level: "advanced",
        body: [
          "CAP describes behaviour during a partition, which is a real but rare event. PACELC adds the branch that dominates every other day: else, when the network is healthy, you still trade latency against consistency on every single request. Both halves are decisions; only one of them is a decision you make thousands of times a second.",
          "The else branch is concrete. Reading from the nearest replica is fast and possibly stale. Reading through a quorum is consistent and pays the round trips to reach it. Acknowledging a write locally is fast and risks losing it; waiting for a remote replica is durable and slower by the distance between them. No partition is required for any of those choices to exist.",
          "The notation is worth reading properly, because it says two things. A system described as PA/EL chooses availability when partitioned and latency the rest of the time, which is Dynamo and Cassandra with their default settings. PC/EC chooses consistency in both, which is a system like a single-primary relational database with synchronous replication. Some are PC/EL: strict during a partition, fast when healthy, which is a legitimate and common combination.",
          "It also explains a class of decision that CAP alone makes look arbitrary. When a database offers strongly consistent reads at higher cost and eventually consistent ones by default, that is the else branch exposed as an API parameter. The same design answering both is not a contradiction; it is a system that declined to make the trade on your behalf.",
          "The habit worth forming is to state both halves when describing a system. During a partition, this refuses writes to these entities and accepts them for those. In normal operation, reads default to the nearest replica and these three paths pay for quorum. That is a specification. The letter on its own is a slogan.",
          "And the geography question follows immediately, because latency in the else branch is set by distance. A quorum spanning continents pays the worst inter-region round trip on every write, which is why systems that need both properties shard so that each shard's quorum stays inside one region.",
        ],
        why: "Partitions are rare and the else branch is every single request. Discussing only CAP means discussing the exceptional case and ignoring the one that determines how the system feels in normal operation.",
        check: {
          prompt: "Your database is healthy, no partition. You still choose to read from a local replica rather than a quorum. Which tradeoff is that?",
          options: [
            "Consistency against availability, which is the CAP tradeoff",
            "Durability against throughput, since the replica acknowledges sooner",
            "Latency against consistency, the E and the L of PACELC",
            "None, without a partition there is nothing left to trade away",
          ],
          correctIndex: 2,
          explain: "This is exactly the else branch. The choice exists on every request, which is why it matters more day to day than the partition case CAP describes.",
        },
        checks: [
          {
            prompt: "A store offers eventually consistent reads by default and strong reads for twice the cost. What is that?",
            options: [
              "The else branch of PACELC exposed as a per-request parameter",
              "A CAP choice made per query rather than per cluster deployment",
              "A pricing decision unrelated to the consistency model itself",
              "A guarantee that strong reads survive a partition unchanged",
            ],
            correctIndex: 0,
            explain:
              "It is the latency against consistency trade, handed to the caller instead of decided by the system. A partition is not involved, which is precisely the point PACELC makes.",
          },
          {
            prompt: "What does a PC/EL system do?",
            options: [
              "Refuses writes during a partition, and favours latency when healthy",
              "Accepts writes during a partition, and favours consistency when healthy",
              "Refuses writes in both cases, prioritising consistency at all times",
              "Accepts writes in both cases, prioritising availability at all times",
            ],
            correctIndex: 0,
            explain:
              "The two halves are independent. Being strict about the rare case and fast about the common one is a legitimate and frequently chosen combination.",
          },
          {
            prompt: "Why does the else branch make cross-region quorums expensive?",
            options: [
              "Every consistent read or write waits for a round trip across the distance",
              "Partitions between regions are more frequent than within one region",
              "Replicas in other regions cannot participate in read repair",
              "Clock skew between regions forces additional coordination rounds",
            ],
            correctIndex: 0,
            explain:
              "Consistency is bought with waiting, and distance sets the price. That cost applies on every request in normal operation, not only when something has gone wrong.",
          },
        ],
      },
      {
        id: "cells",
        diagram: {
          caption: "Nothing shared, so a fault has nowhere to spread",
          columns: [
            [{ id: "route", label: "Router", sub: "a lookup, statically stable", kind: "edge" }],
            [{ id: "c1", label: "Cell 1", sub: "own compute, database, cache", kind: "service" },
             { id: "c2", label: "Cell 2", sub: "own compute, database, cache", kind: "service" },
             { id: "c3", label: "Cell 3", sub: "bad deploy lands here", kind: "service", alternative: true }],
            [{ id: "blast", label: "One over n affected", sub: "decided in advance", kind: "data" }],
            [{ id: "global", label: "Anything global", sub: "fans out across cells", kind: "external", alternative: true }],
          ],
          edges: [
            { from: "route", to: "c1", label: "tenant to cell" },
            { from: "route", to: "c2", label: "tenant to cell" },
            { from: "route", to: "c3", label: "tenant to cell" },
            { from: "c3", to: "blast", label: "contained by construction" },
            { from: "c1", to: "global", label: "reports, search, migrations" },
          ],
        },
        sources: [
          {
            label: "Amazon Builders' Library, Reducing the scope of impact with cell-based architecture",
            url: "https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html",
            supports: "That AWS builds services from cells so a fault has a bounded and known set of affected customers, and that the routing layer has to be simple enough to be nearly incapable of failing.",
          },
        ],
        title: "Cells, bulkheads and blast radius",
        level: "advanced",
        body: [
          "A cell is a complete, independent copy of the stack serving a subset of users: its own compute, its own database, its own cache. Nothing is shared, which is the entire property. A failure inside one cell has no path to the others, not because it is unlikely to spread but because there is no mechanism by which it could. That converts availability from a probability into arithmetic. Instead of arguing about how likely a total outage is, you decide in advance that the worst single failure affects one over n of your users. A bad deploy, a poison request, a corrupted cache, a runaway migration: each is contained to the cell it happened in, and the incident is a fraction rather than an event.",
          "Deploys follow the same structure and become the main day-to-day benefit. Ship to one cell, watch it, then continue, which is a canary with a hard boundary rather than a percentage of traffic that shares a database with the other 95 per cent. Most bad changes are caught with one cell's users affected, and rolling back is a decision about one cell.",
          "The routing layer is the part that has to be right, because it is shared by definition. It maps a user or tenant to a cell and must be simple enough to be nearly incapable of failing: a lookup, a hash, a static assignment, ideally cached at the edge and statically stable so it keeps working when its own control plane is unavailable. A clever, dynamic router is a single point of failure in front of an architecture built to have none.",
          "The costs are real and worth stating. More infrastructure, because each cell needs its own everything and cannot pool spare capacity with its neighbours. Anything genuinely global, a report across all users, a search over everything, a migration, becomes a fan-out across cells with its own coordination. Cells also have to be sized, and a tenant that outgrows one is an awkward conversation.",
          "AWS builds this way and publishes the reasoning, which is that a fault should have a bounded and known set of affected customers. That is the sentence worth keeping: not that failures are prevented, but that their extent is decided in advance rather than discovered during the incident.",
        ],
        why: "It converts availability from a probability into an arithmetic fact. Rather than arguing about how likely total failure is, you decide in advance that the worst single failure affects one over n of your users.",
        inPractice: "AWS builds services from cells within an availability zone specifically so a fault has a bounded, known set of affected customers.",
        check: {
          prompt: "What does cell-based architecture primarily buy you?",
          options: [
            "Lower latency, since each cell is placed near the users that it serves",
            "Cheaper infrastructure, since cells can be sized to their actual load",
            "A bounded blast radius, one failure hits one cell's users, not all of them",
            "Simpler operations, since every cell is identical and deployed on its own",
          ],
          correctIndex: 2,
          explain: "It costs more infrastructure and does nothing for latency or consistency. What it gives is containment: the worst case becomes a fraction you chose rather than a number you hope about.",
        },
        checks: [
          {
            prompt: "Which component is the real risk in a cell-based architecture?",
            options: [
              "The routing layer, which is shared by every cell by definition",
              "The database in each cell, since data cannot be replicated between them",
              "The deploy pipeline, which must apply changes to all cells at once",
              "The monitoring stack, which has to aggregate across independent cells",
            ],
            correctIndex: 0,
            explain:
              "Everything else is isolated on purpose; the router is not, so it must be simple, statically stable and nearly incapable of failing. A clever dynamic router undoes the architecture it fronts.",
          },
          {
            prompt: "How does cell-based deployment differ from a percentage canary?",
            options: [
              "The blast radius is a hard boundary rather than a share of shared infrastructure",
              "It requires no monitoring, because failures are contained automatically",
              "Rollback is unnecessary, since a failed cell is replaced rather than reverted",
              "It removes the need to test changes before they reach production",
            ],
            correctIndex: 0,
            explain:
              "A five per cent canary usually still shares a database with the other ninety-five. A cell shares nothing, so a bad change cannot reach beyond the users in it.",
          },
          {
            prompt: "What becomes structurally harder once a system is split into cells?",
            options: [
              "Anything genuinely global: cross-user reports, search, migrations",
              "Deploying a change, which must now be coordinated across cells",
              "Monitoring, since each cell emits its own independent metrics",
              "Scaling, because a cell cannot be given additional capacity",
            ],
            correctIndex: 0,
            explain:
              "Isolation is the feature and the bill. Any operation that spans all users becomes a fan-out with its own coordination, which is the price paid for a bounded blast radius.",
          },
        ],
      },
      {
        id: "tail-at-scale",
        title: "Tail latency: hedged requests and Little's Law",
        level: "advanced",
        body: [
          "In a request that fans out to many servers, the slowest response decides the total, so the distribution you care about is not each server's but the maximum across all of them. That maximum behaves very badly as the fan-out grows, and the arithmetic is the whole topic. Fan out to a hundred servers, each independently exceeding a second on one per cent of requests, and the chance that at least one does is one minus 0.99 to the hundredth, about 63 per cent. A one-in-a-hundred event at the component has become a two-in-three event at the request, which means each component's 99th percentile is roughly the request's median.",
          "That reframes what to work on. Tuning the median of a dependency changes almost nothing for a fan-out request, because the median was never what you were waiting for. Cutting a dependency's 99.9th percentile changes a great deal. It is also why large systems set latency targets on their internal services at percentiles that look absurd in isolation: the caller's fan-out is what makes them reasonable.",
          "The causes of a component tail are mostly not the component's code, which is why they resist the usual profiling. Shared resources contended by a neighbour on the same machine. A background task, compaction, garbage collection, log rotation, taking the CPU for a moment. Queueing behind a request that arrived first. Power and thermal management changing clock speed. A retry underneath you. Each is brief, uncorrelated with your request, and unavoidable, which is why the strategy is to tolerate the tail rather than to eliminate it.",
          "Hedging tolerates it directly and cheaply. Send the request to one replica, and if it has not answered within a threshold set near the 95th percentile, send a duplicate to a second replica and take whichever returns first. Because only the slowest few per cent are ever duplicated, the extra load is a few per cent while the tail improvement is large. Dean and Barroso reported a case where hedging after a 10ms delay cut the 99.9th percentile of a thousand-server read from 1,800ms to 74ms for around two per cent more requests, which is the clearest available demonstration that the tail is a distribution problem rather than a capacity problem.",
          "Tied requests are the refinement worth knowing. Send to two replicas immediately, and tell each which other replica has the request, so whichever dequeues it first cancels the other. That removes the waiting threshold entirely and costs less duplicated work than hedging, at the price of needing the replicas to talk to each other. The other mitigations are structural: many small partitions rather than few large ones, so a slow server's share can be moved elsewhere; and returning early with whatever has arrived, because a slightly incomplete answer inside the budget beats a complete one outside it.",
          "Little's Law is the other half, and it connects the numbers you actually control: concurrency equals arrival rate multiplied by latency. It is the reason a tail is not merely a latency problem but a capacity problem in disguise. A service taking 100 requests a second at 50ms holds 5 in flight; the same service at 5 seconds holds 500, with nothing about the traffic or the code having changed. So when a dependency's tail lengthens, the in-flight work grows in proportion, the pool fills with requests that are waiting rather than working, and the queue runs away. That is why failing fast frees capacity and raising a timeout during an incident makes it worse, and it is why a concurrency limit is often a better control than a rate limit: it bounds the product rather than one of its terms.",
        ],
        why:
          "Tail latency is a structural property of fan-out rather than a slow service you can find and fix, because the causes are shared resources, background work and queueing rather than your code. Hedging attacks the distribution directly, which is why it keeps working after tuning individual services has stopped helping. Little's Law is the reason it matters beyond latency: concurrency is arrival rate times latency, so a longer tail is more in-flight work, and more in-flight work is how a queue runs away.",
        inPractice:
          "Dean and Barroso's The Tail at Scale is the canonical treatment and reports the hedging result directly: a thousand-server read whose 99.9th percentile fell from 1,800ms to 74ms when a duplicate was sent after 10ms, for about two per cent additional requests. gRPC and Envoy both ship hedging as a configurable retry policy, which is the same idea available without implementing it.",
        diagram: {
          caption: "One slow replica sets the total, so duplicate only the slow few",
          columns: [
            [{ id: "req", label: "Request", sub: "fans out to 100", kind: "client" }],
            [{ id: "fast", label: "99 fast replicas", sub: "inside the budget", kind: "service" },
             { id: "slow", label: "1 slow replica", sub: "GC, contention, queueing", kind: "service" }],
            [{ id: "wait", label: "Wait for all", sub: "63% exceed the budget", kind: "data", alternative: true },
             { id: "hedge", label: "Hedge after p95", sub: "duplicate to a second replica", kind: "data" }],
            [{ id: "out", label: "Answered", sub: "whichever returns first", kind: "external" }],
          ],
          edges: [
            { from: "req", to: "fast", label: "parallel" },
            { from: "req", to: "slow", label: "parallel" },
            { from: "slow", to: "wait", label: "the max decides" },
            { from: "slow", to: "hedge", label: "only the slow few" },
            { from: "hedge", to: "out", label: "+2% load, tail cut" },
            { from: "fast", to: "out", label: "already back" },
          ],
        },
        check: {
          prompt: "A request fans out to 100 services, each with p99 of 100ms. What is the rough expectation for the overall request?",
          options: [
            "About 100ms overall, since the hundred calls all happen in parallel",
            "Most requests wait on at least one slow call, so 100ms becomes typical",
            "Ten seconds, since a hundred calls at a hundred milliseconds each sum",
            "Roughly unchanged, since an event at p99 is by definition uncommon",
          ],
          correctIndex: 1,
          explain:
            "With 100 calls, the chance that all land inside p99 is 0.99^100, about 37 percent. So roughly two thirds of requests hit at least one slow call, the tail becomes the norm.",
        },
        checks: [
          {
            prompt: "Why does hedging buy a large tail improvement for a small increase in load?",
            options: [
              "Only the requests that already exceeded the threshold are duplicated",
              "The duplicate is sent to a replica that is known to be less loaded",
              "The first request is cancelled, so the work is moved rather than added",
              "Duplicates are served from cache, so the second copy is nearly free",
            ],
            correctIndex: 0,
            explain:
              "The threshold sits near the 95th percentile, so at most a few per cent of requests are ever sent twice. You pay a few per cent more work and remove most of the tail, which is why it is one of the best trades available.",
          },
          {
            prompt: "A dependency's latency rises tenfold under load and the worker pool fills. Which law explains it?",
            options: [
              "Little's Law: concurrency is arrival rate multiplied by latency",
              "Amdahl's Law: the serial fraction bounds the achievable speedup",
              "The birthday paradox, applied to requests colliding on one worker",
              "The CAP theorem, since availability is being traded for latency",
            ],
            correctIndex: 0,
            explain:
              "Arrival rate did not change and latency did, so in-flight work rose with it. A pool that comfortably held five requests now needs fifty, which is why a slow dependency is more dangerous than a dead one.",
          },
          {
            prompt: "What do tied requests add over ordinary hedging?",
            options: [
              "Each replica knows the other has it, so the loser cancels its copy",
              "The duplicate is sent to three replicas rather than to one more",
              "The threshold adapts, so no percentile has to be chosen up front",
              "Responses are merged, so a partial answer from each still counts",
            ],
            correctIndex: 0,
            explain:
              "Both copies are sent immediately and each carries the identity of the other, so whichever dequeues first cancels its twin. No waiting threshold is needed and less duplicated work is done, at the cost of the replicas having to communicate.",
          },
        ],
        sources: [
          {
            label: "Dean and Barroso, The Tail at Scale (CACM, 2013)",
            url: "https://research.google/pubs/the-tail-at-scale/",
            supports: "The 1-in-100 component tail becoming a 63 per cent request tail at 100 servers, and the hedging result of 1,800ms to 74ms at p99.9 for about 2 per cent extra requests.",
          },
          {
            label: "gRPC request hedging policy",
            url: "https://grpc.io/docs/guides/request-hedging/",
            supports: "That hedging is available as configuration rather than something a team has to implement itself.",
          },
        ],
      },
    ],
  },
];
