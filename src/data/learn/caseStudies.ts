import type { Card } from "./types";

/* The classic system design interview questions, answered the way a senior or
   staff candidate would: the constraint first, then the decision it forces. */

export const caseStudies: Card[] = [
  {
    id: "netflix",
    title: "Netflix",
    summary:
      "Ten subsystems behind pressing play: encoding, delivery, licensing, failure, and the data that decides what you see.",
    track: "case-study",
    topics: [
      {
        id: "netflix-ingest",
        title: "Ingest: what arrives before any of this works",
        level: "beginner",
        body: [
          "A title does not arrive as a file you can stream. It arrives as a mezzanine: a very high bitrate master, often hundreds of gigabytes for a feature, plus separate audio stems for every language, subtitle and caption files, forced-narrative tracks, and artwork in a dozen aspect ratios. None of it is playable by a client, and none of it is trusted.",
          "The first job is inspection. A master that is subtly broken, a dropped frame, an audio channel out of phase, a caption file whose timings drift by a quarter second after an hour, will otherwise be found by a member somewhere at three in the morning, and by then it is on every appliance in the world. So the pipeline runs automated quality checks before it spends any money encoding: frame-level artefact detection, audio loudness measurement against the delivery standard, subtitle timing validation, and a check that the declared runtime matches the actual one.",
          "Only then does the expensive part begin, and it is genuinely expensive. A single title is encoded into dozens of variants: multiple codecs because a 2013 smart television and a 2025 phone do not decode the same things, multiple resolutions, multiple bitrates within each resolution, and each of those with every audio language muxed or served separately. One film becomes thousands of files.",
          "This is parallelised aggressively, and the unit of parallelism is worth noticing: the work is split by chunk, not by title. A two-hour film cut into short segments can be encoded by hundreds of machines at once and stitched back together, which turns a job that would take days on one machine into one that takes minutes on many. It also means a failure costs one chunk rather than the whole encode.",
        ],
        why: "The reason inspection comes before encoding is arithmetic. Encoding a title into every variant is the single most expensive operation in the pipeline, and a defect found afterwards means paying for all of it twice, plus the cost of pulling the bad copies off every appliance that already has them. Validating at the boundary is cheap; validating after the fan-out is not.",
        inPractice:
          "The same shape appears in any pipeline with an expensive irreversible step: validate before the fan-out, not after. An image service that resizes on upload should reject a corrupt file before it generates forty thumbnails, and a data pipeline should schema-check at ingest rather than discovering the bad column in the fifth downstream job.",
        diagram: {
          caption: "Ingest: inspect first, because encoding is the expensive part",
          columns: [
            [{ id: "studio", label: "Studio delivery", sub: "mezzanine master", kind: "external" }],
            [
              { id: "inspect", label: "Inspection", sub: "artefacts, loudness, timing", kind: "service" },
              { id: "split", label: "Chunker", sub: "splits by segment", kind: "service" },
            ],
            [
              { id: "farm", label: "Encoding farm", sub: "hundreds of workers", kind: "service" },
              { id: "quarantine", label: "Quarantine", sub: "failed inspection", kind: "data" },
            ],
            [{ id: "store", label: "Object storage", sub: "every rendition", kind: "data" }],
          ],
          edges: [
            { from: "studio", to: "inspect", label: "master" },
            { from: "inspect", to: "quarantine", label: "on failure" },
            { from: "inspect", to: "split", label: "on pass" },
            { from: "split", to: "farm", label: "chunks, in parallel" },
            { from: "farm", to: "store", label: "renditions" },
          ],
        },
        check: {
          prompt: "Why split a title into chunks before encoding rather than encoding it as one job?",
          options: [
            "Chunks compress better because each one is optimised against its own content",
            "Hundreds of workers can run at once, and a failure costs one chunk not the whole title",
            "The client requires chunked files, so the pipeline must produce them in that shape",
            "Encoding software cannot address files larger than a few gigabytes in one pass",
          ],
          correctIndex: 1,
          explain:
            "The gain is wall-clock time and blast radius. A two-hour film split into segments is encoded by many machines in parallel, turning days into minutes, and a worker that dies takes one segment with it rather than the whole job. Chunked output does suit the streaming protocols, but that is a convenience, not the reason.",
        },
        checks: [
          {
            prompt: "Inspection runs before encoding rather than after. What does that ordering actually buy?",
            options: [
              "Encoding is the expensive step, so a defect caught first avoids paying for it twice",
              "Inspection tools cannot read the encoded formats, only the original mezzanine master",
              "It lets the pipeline start streaming the title before the encode has finished running",
              "Studios require validation to happen before any derivative copies are made at all",
            ],
            correctIndex: 0,
            explain:
              "It is a cost argument. Encoding one title into every codec, resolution and bitrate is the most expensive operation in the pipeline, and a defect found afterwards means paying for all of it again and pulling bad copies off appliances worldwide. Validate before the fan-out, never after.",
          },
        ],
      },

      {
        id: "netflix-encoding",
        title: "Per-title and per-shot encoding: the bitrate ladder",
        level: "advanced",
        body: [
          "For years the industry used one fixed bitrate ladder for everything: 1080p at some bitrate, 720p at a lower one, and so on down, identical for every title. This is obviously wrong the moment you say it out loud. An animated film with flat colour and clean lines needs far fewer bits to look perfect than a handheld night scene full of grain and motion, yet both were given the same allocation. One was wasting bandwidth and the other was being starved of it.",
          "Netflix replaced this with per-title encoding: analyse the content, then build a ladder specific to it. The complex title gets more bits where it needs them; the simple one gets a ladder that tops out lower because there is nothing more to represent. The measure used to decide is VMAF, a perceptual quality metric Netflix developed and open-sourced, which correlates with what people actually report seeing rather than with mathematical error like PSNR.",
          "Then they went further, to per-shot. A film is not uniform: within one title there are dialogue scenes that are trivial to encode and action sequences that are not. Dynamic Optimizer detects shot boundaries, the hard cuts where one camera setup ends and another begins, and optimises each shot independently, choosing the resolution and quantiser that maximise VMAF for the bits available.",
          "The reported savings are large. Netflix published reductions of roughly 28% for x264, 38% for libvpx VP9 and 34% for x265 at equal quality, with a further 10 to 15% on top of per-title encoding at the same VMAF. They enabled it for selected titles in 2018 and broadly for 4K in 2020.",
          "It is worth being precise about what is being traded. This is enormous extra compute at encode time, spent once per title, to save bandwidth on every single playback of that title forever. For a catalogue watched billions of times, that trade is not close.",
        ],
        why: "The general principle is that a fixed configuration applied to variable input is always wrong somewhere, usually in both directions at once: wasteful for the easy cases and inadequate for the hard ones. The fix is to measure the input and let the measurement choose the setting. The reason this is not done everywhere is that it needs a metric that actually correlates with the outcome you care about, and building VMAF was the hard part, not the optimisation on top of it.",
        inPractice:
          "The same argument applies to any fixed threshold in a system: a single timeout for every downstream call, one page size for every query, one cache TTL for every key. Each is a fixed ladder. The question to ask is whether you have a measurement that would let the setting be chosen per case, and whether the saving is paid once or on every request.",
        diagram: {
          caption: "Per-shot encoding: measure the content, then choose the ladder",
          columns: [
            [{ id: "master", label: "Master", sub: "one title", kind: "data" }],
            [{ id: "shots", label: "Shot detection", sub: "finds hard cuts", kind: "service" }],
            [
              { id: "trial", label: "Trial encodes", sub: "resolution x quantiser", kind: "service" },
              { id: "vmaf", label: "VMAF scoring", sub: "perceptual quality", kind: "service" },
            ],
            [{ id: "hull", label: "Convex hull", sub: "best per bitrate", kind: "service" }],
            [{ id: "ladder", label: "Final ladder", sub: "per shot, per title", kind: "data" }],
          ],
          edges: [
            { from: "master", to: "shots" },
            { from: "shots", to: "trial", label: "per shot" },
            { from: "trial", to: "vmaf", label: "score each" },
            { from: "vmaf", to: "hull", label: "quality per bit" },
            { from: "hull", to: "ladder", label: "pick the optimum" },
          ],
        },
        check: {
          prompt: "Why is a single fixed bitrate ladder for every title the wrong default?",
          options: [
            "Older devices cannot decode the higher rungs, so the ladder has to vary by device",
            "Content varies in complexity, so one allocation both wastes bits and starves detail",
            "Fixed ladders cannot be changed later once titles have been encoded against them",
            "Bandwidth costs differ by region, so the ladder must be tuned per delivery market",
          ],
          correctIndex: 1,
          explain:
            "A clean animation and a grainy night scene need very different bitrates to look equally good. One fixed ladder overspends on the simple title and underspends on the complex one, and it is wrong in both directions at the same time.",
        },
        checks: [
          {
            prompt: "Per-shot encoding costs far more compute than per-title. Why is that trade worth making?",
            options: [
              "The compute is paid once per title, and the bandwidth saving applies to every playback forever",
              "Encoding hardware is cheaper than the storage the extra renditions would otherwise need",
              "Shot detection is required by the streaming protocols, so the cost is unavoidable anyway",
              "It reduces the number of renditions that have to be produced and stored per title",
            ],
            correctIndex: 0,
            explain:
              "It is a one-off cost against a recurring saving. Encode once, then save bandwidth on every stream of that title for as long as it is in the catalogue. On a title watched millions of times the arithmetic is not close.",
          },
          {
            prompt: "Why did Netflix build VMAF rather than optimise against PSNR, which already existed?",
            options: [
              "PSNR is computationally too expensive to run across a whole catalogue of titles",
              "PSNR measures mathematical error, which does not track what viewers report seeing",
              "PSNR is proprietary, so using it across the catalogue would have required licensing",
              "PSNR cannot be computed on encoded video, only on the uncompressed master file",
            ],
            correctIndex: 1,
            explain:
              "Optimising a system means optimising whatever it measures, so the metric has to correlate with the thing you actually care about. PSNR measures signal error and diverges from perceived quality, so a ladder optimised against it is optimised for the wrong target. Building the metric was the hard part; the optimisation on top was comparatively easy.",
          },
        ],
      },

      {
        id: "netflix-abr",
        title: "Adaptive bitrate: the decision the client makes every few seconds",
        level: "intermediate",
        body: [
          "Once the ladder exists, something has to choose which rung to play, and that decision belongs on the client, not the server. The client is the only party that knows what is actually happening: how full its buffer is, how fast the last few segments arrived, whether the device is thermally throttled, whether the user just seeked.",
          "The mechanism is simple. Video is cut into segments of a few seconds, each available at every rung of the ladder. The player keeps a buffer of upcoming segments and, for each new request, picks a rung. Ask for too high a rung and the segment arrives late, the buffer drains, and playback stalls, which is the single worst thing a video player can do. Ask for too low a rung and the picture is soft when it did not need to be.",
          "Naive algorithms estimate throughput from recent downloads and pick the highest rung that fits. This behaves badly in exactly the situations that matter, because throughput estimates are noisy and a brief dip triggers a visible quality drop that was not necessary. Better approaches use buffer occupancy as the primary signal: a full buffer is direct evidence that you can afford to be ambitious, and it is a measurement rather than a prediction.",
          "There is a startup problem too, and it is the one users judge you on. At the moment of pressing play there is no buffer and no throughput history, so the player must guess. Guess high and the first segment is slow, which shows as a spinner. Guess low and playback starts quickly but looks poor for the first few seconds. Most players start conservatively and climb, because time to first frame is what people notice and remember.",
        ],
        why: "The reason the decision sits on the client is that the server cannot see the constraint. A server knows what it sent and how fast it sent it; it does not know that the buffer is nearly empty, that the device is on a train, or that the user is about to seek. Putting a control loop where the measurements are is a general principle, and it is why backpressure works better when the party that is struggling is the one that gets to say so.",
        inPractice:
          "The same reasoning shapes client-side rate limiting and adaptive concurrency in ordinary APIs. A client that watches its own latency and reduces concurrency is reacting to a measurement; a client obeying a fixed limit set elsewhere is following a guess made without the information.",
        diagram: {
          caption: "The player's loop: measure the buffer, choose the next rung",
          columns: [
            [{ id: "player", label: "Player", sub: "buffer + throughput", kind: "client" }],
            [{ id: "pick", label: "Rung choice", sub: "per segment", kind: "client" }],
            [{ id: "oca", label: "Open Connect", sub: "serves segments", kind: "edge" }],
            [
              { id: "buf", label: "Buffer", sub: "seconds ahead", kind: "data" },
              { id: "screen", label: "Decode + display", kind: "client" },
            ],
          ],
          edges: [
            { from: "player", to: "pick", label: "how full is the buffer" },
            { from: "pick", to: "oca", label: "request segment at rung n" },
            { from: "oca", to: "buf", label: "segment" },
            { from: "buf", to: "screen" },
            { from: "buf", to: "player", label: "occupancy feeds back", async: true },
          ],
        },
        check: {
          prompt: "Why does adaptive bitrate selection belong on the client rather than the server?",
          options: [
            "Servers cannot change bitrate mid-stream once a session has already started",
            "Only the client can see buffer occupancy, device state and what just happened",
            "Client-side selection removes a round trip and so lowers startup latency",
            "Licensing terms require the playback device to choose its own quality level",
          ],
          correctIndex: 1,
          explain:
            "The control loop should sit where the measurements are. The server knows what it sent; the client knows how full its buffer is, whether the device is throttling and whether the user just seeked. Deciding without those is guessing.",
        },
        checks: [
          {
            prompt: "Why do better ABR algorithms prefer buffer occupancy over a throughput estimate?",
            options: [
              "Throughput cannot be measured accurately on mobile networks at all",
              "Buffer occupancy is a measurement of what happened; throughput is a noisy prediction",
              "Buffer occupancy updates more frequently, giving the algorithm more data points",
              "Throughput estimates require server cooperation, which adds a round trip per segment",
            ],
            correctIndex: 1,
            explain:
              "A full buffer is direct evidence that recent requests were served comfortably. A throughput estimate is an extrapolation from noisy samples, and reacting to its noise produces visible quality changes that were never necessary.",
          },
          {
            prompt: "Why do most players start at a conservative rung and climb, rather than starting high?",
            options: [
              "Starting high risks a slow first segment, and a spinner is what viewers judge you on",
              "The highest rungs are not pre-positioned on the appliance until playback begins",
              "DRM licences are issued per rung, so the lowest one is the fastest to acquire",
              "Devices need several seconds to negotiate their maximum supported decode profile",
            ],
            correctIndex: 0,
            explain:
              "At the moment of pressing play there is no buffer and no history, so any choice is a guess. Guessing high risks a slow first segment, which appears as a spinner, and time to first frame is the thing viewers actually remember.",
          },
        ],
      },

      {
        id: "netflix-drm",
        title: "DRM: three ecosystems, one encrypted file",
        level: "advanced",
        body: [
          "Content licensing obliges Netflix to protect the video, and protection means encryption plus a licence server that decides who gets a key. The complication is that there is no single DRM system: Widevine covers Android and Chrome, PlayReady covers Windows and Xbox, and FairPlay covers Apple devices. Three ecosystems, three key formats, three sets of rules.",
          "Encrypting the same title three times would triple storage and triple the encoding cost, which is why Common Encryption exists. The video is encrypted once with one key, and each DRM system is given a way to deliver that same key to its own devices. One set of files, three licence paths, which turns a threefold storage problem into a licence-server problem.",
          "The licence request is where the real decisions happen, and they are business decisions rather than cryptographic ones: whether this account is entitled to this title in this country, how many concurrent streams the plan allows, whether the device is permitted at this resolution. The last one is not arbitrary. Studio agreements commonly tie higher resolutions to stronger protection, which is why the same title plays at 4K on a certified television and at a lower resolution in a browser on the same account.",
          "On the web this is mediated by Encrypted Media Extensions, a browser API that hands encrypted segments and licence responses to a Content Decryption Module the page cannot see inside. The browser deliberately gives the page no access to the decrypted frames, which is the entire point.",
        ],
        why: "The design worth taking away is that encryption is cheap and centralised while authorisation is expensive and distributed. Encrypt once, then spend the effort on the licence path, because that is where the per-user, per-device, per-region logic lives and where it can be changed without re-encoding anything. Anyone who has re-encrypted a corpus to change an access rule has learned this the hard way.",
        inPractice:
          "The same separation shows up in ordinary systems as encrypting data once at rest and doing all the per-user decisions at the point of access. Bake the authorisation into the artefact and every rule change becomes a migration.",
        diagram: {
          caption: "One encrypted file, three licence paths",
          columns: [
            [{ id: "device", label: "Device", sub: "browser, TV, phone", kind: "client" }],
            [
              { id: "cdm", label: "Decryption module", sub: "EME on the web", kind: "client" },
              { id: "lic", label: "Licence service", sub: "entitlement, plan, device", kind: "service" },
            ],
            [
              { id: "acct", label: "Account service", sub: "plan and streams", kind: "service" },
              { id: "rights", label: "Rights service", sub: "region and window", kind: "service" },
            ],
            [{ id: "media", label: "Encrypted segments", sub: "encrypted once", kind: "data" }],
          ],
          edges: [
            { from: "device", to: "lic", label: "licence request" },
            { from: "lic", to: "acct", label: "is this allowed" },
            { from: "lic", to: "rights", label: "in this country" },
            { from: "lic", to: "cdm", label: "key, if permitted" },
            { from: "media", to: "cdm", label: "encrypted segments" },
            { from: "cdm", to: "device", label: "decoded frames" },
          ],
        },
        check: {
          prompt: "Why encrypt the video once under Common Encryption rather than once per DRM system?",
          options: [
            "The three DRM systems use the same cipher, so separate encryption would be redundant",
            "It avoids triplicating storage and encoding, leaving only the licence path to differ",
            "Studio agreements forbid holding more than one encrypted copy of a given title",
            "Devices cannot switch between DRM systems once a stream has already started",
          ],
          correctIndex: 1,
          explain:
            "Three encryptions would mean three copies of every rendition, tripling both storage and encode cost. Common Encryption keeps one set of files and lets each DRM system deliver the same key its own way, moving the problem to the licence server where it is cheap to solve.",
        },
        checks: [
          {
            prompt: "Why is the licence request, rather than the encryption, where entitlement is enforced?",
            options: [
              "Encryption keys cannot encode conditions such as region or plan level",
              "Authorisation changes per user, device and region, and must not require re-encoding",
              "The licence server is the only component with a network path back to the client",
              "Decryption modules are untrusted, so all checks must happen before a key is issued",
            ],
            correctIndex: 1,
            explain:
              "Encryption is cheap and centralised; authorisation is per user, per device, per region and changes constantly. Baking it into the artefact makes every rule change a re-encryption of the catalogue.",
          },
        ],
      },

      {
        id: "netflix-cdn",
        title: "Open Connect: building the CDN rather than buying it",
        level: "intermediate",
        body: [
          "Netflix is a large share of internet traffic at peak. Buying that from a commercial CDN would be enormously expensive, and it would still put the bytes on the wrong side of the congested links between networks.",
          "So Netflix builds its own appliances and gives them to ISPs at no cost, installed inside the ISP's own network. The ISP supplies power, space and connectivity. Netflix supplies the hardware and operates it. By the time you press play, the video is already past the peering links that would otherwise be the bottleneck, sitting on a machine inside the network you are a customer of.",
          "The published hardware makes the trade concrete. Storage appliances are 2U servers with up to 120TB of raw storage and around 200Gbps of operational throughput, connected by 6x10Gbps or up to 2x100Gbps. There is also a smaller global appliance with up to 60TB and around 80Gbps, aimed at smaller partners and emerging markets. Netflix states that Open Connect serves 100% of its video traffic and that close to 95% globally is delivered over direct connections between Open Connect and residential ISPs.",
          "Content arrives on those appliances during off-peak hours, chosen by predictive models of what each region will want. This is the part that makes the whole thing work: the catalogue is finite, demand is forecastable, and yesterday's data tells you a great deal about tomorrow's viewing. Popularity is not uniform, so an appliance does not need the whole catalogue to serve almost all requests locally.",
          "The appliances do not decide who they serve. They are directed caches: an OCA only serves clients whose prefixes the ISP has advertised to it over BGP, so the ISP retains control of what traffic lands where, which is a precondition for any ISP agreeing to host equipment at all.",
        ],
        why: "The insight is that streaming is a predictable, cacheable workload, which converts a bandwidth problem into a storage problem. Storage is far cheaper than peak bandwidth, and it can be filled at three in the morning when the network is idle and capacity costs nothing. Almost no other large workload has this property, which is why almost nobody else has built this.",
        inPractice:
          "The generalisation is that pre-computation beats caching whenever demand is predictable, because a cache is populated by the first unlucky request while pre-positioning is populated by a forecast. If you can name tomorrow's hot keys today, warming them during quiet hours turns a latency problem into a scheduling problem.",
        diagram: {
          caption: "Control plane in the cloud, bytes from a box inside your ISP",
          columns: [
            [{ id: "app", label: "Client app", sub: "TV, phone, browser", kind: "client" }],
            [
              { id: "api", label: "Playback API", sub: "cloud", kind: "service" },
              { id: "steer", label: "Steering", sub: "picks the appliance", kind: "service" },
            ],
            [
              { id: "oca", label: "Embedded OCA", sub: "inside the ISP", kind: "edge" },
              { id: "ix", label: "IXP appliance", sub: "fallback tier", kind: "edge" },
            ],
            [{ id: "origin", label: "Origin", sub: "every rendition", kind: "data" }],
          ],
          edges: [
            { from: "app", to: "api", label: "play this title" },
            { from: "api", to: "steer" },
            { from: "steer", to: "app", label: "manifest with URLs" },
            { from: "app", to: "oca", label: "segments" },
            { from: "app", to: "ix", label: "fallback" },
            { from: "origin", to: "oca", label: "filled off-peak", async: true },
            { from: "origin", to: "ix", label: "filled off-peak", async: true },
          ],
        },
        check: {
          prompt: "Why can Netflix pre-position content overnight when a social feed cannot?",
          options: [
            "Video is immutable once encoded, whereas a feed changes on every write",
            "A finite catalogue with forecastable demand, so tomorrow's hits ship tonight",
            "ISPs will host video appliances but not general-purpose caching hardware",
            "A feed needs strong consistency, which an edge cache is unable to provide",
          ],
          correctIndex: 1,
          explain:
            "Pre-positioning needs a bounded catalogue and predictable demand. A feed is assembled per user from content that did not exist an hour ago, so there is nothing to ship in advance. Immutability helps, but it is the forecastability that makes it possible.",
        },
        checks: [
          {
            prompt: "What does putting an appliance inside the ISP buy that a nearby data centre does not?",
            options: [
              "The bytes never cross the congested links between networks at peak",
              "The appliance can be filled faster because the ISP has more spare capacity",
              "It removes the need for the client to resolve DNS before playback starts",
              "ISPs offer lower storage costs than commercial data centre operators do",
            ],
            correctIndex: 0,
            explain:
              "Peering and transit links between networks are exactly what saturate at peak viewing hours. An appliance inside the ISP is already past them, so the traffic never competes for the capacity that is scarce.",
          },
          {
            prompt: "Open Connect appliances only serve prefixes advertised to them over BGP. Why does that matter?",
            options: [
              "BGP is the only protocol capable of expressing which clients are nearby",
              "The ISP keeps control of what traffic lands where, which is why it agrees to host them",
              "It prevents the appliance from being reachable from the public internet at all",
              "Advertised prefixes let the appliance decide which titles to cache locally",
            ],
            correctIndex: 1,
            explain:
              "These are directed caches, not autonomous ones. An ISP is being asked to put someone else's hardware in its network, and it will only do that if it keeps control of which of its customers that hardware serves.",
          },
        ],
      },

      {
        id: "netflix-steering",
        title: "Steering: choosing which appliance you talk to",
        level: "advanced",
        body: [
          "Having thousands of appliances is useless without a good answer to the question of which one a given client should use, and the answer changes constantly. An appliance may be near you and busy, or slightly further and idle. It may hold the title you asked for, or not. It may have been healthy a minute ago and not now.",
          "So the choice is made per session at playback time, not by DNS and not by anycast. When the client asks to play something, the control plane returns a manifest that already contains the URLs it should use, ranked, with fallbacks. This is a deliberate departure from how most CDNs steer traffic, and the reason is control: DNS-based steering is coarse, cached at resolvers beyond your control, and cannot see whether the specific title is present on the specific box.",
          "The ranking considers proximity in network terms rather than geographic ones, current load on each candidate, health, and whether the appliance actually holds the title. Because the manifest carries fallbacks, a client that starts failing can move without another round trip to the control plane, which matters because the control plane is the thing you least want in the path of a recovery.",
          "Note the split this creates. The control plane runs in the cloud and handles authentication, entitlement, and steering, all small requests. The data plane is the appliances, and it handles essentially all of the bytes. The two scale independently and fail independently, which is the property that makes the design robust.",
        ],
        why: "Returning ranked URLs with fallbacks inside the response is the important move. The alternative, asking the control plane again when something goes wrong, puts a dependency in the recovery path at exactly the moment the system is already degraded. Giving the client what it needs to recover on its own means a control plane outage does not become a playback outage for sessions already running.",
        inPractice:
          "This is the same reason a well-designed client caches a service discovery result with fallbacks rather than resolving on every call, and why a token with a sensible lifetime beats a token that must be revalidated per request. Both keep the dependency out of the path you need when things are failing.",
        diagram: {
          caption: "Steering happens once, per session, and hands over fallbacks",
          columns: [
            [{ id: "client", label: "Client", kind: "client" }],
            [{ id: "playback", label: "Playback API", sub: "control plane", kind: "service" }],
            [
              { id: "steering", label: "Steering", sub: "ranks candidates", kind: "service" },
              { id: "health", label: "Appliance health", sub: "load and reachability", kind: "data" },
              { id: "inventory", label: "Content inventory", sub: "who holds what", kind: "data" },
            ],
            [
              { id: "primary", label: "Primary OCA", kind: "edge" },
              { id: "backup", label: "Fallback OCA", kind: "edge" },
            ],
          ],
          edges: [
            { from: "client", to: "playback", label: "play" },
            { from: "playback", to: "steering" },
            { from: "health", to: "steering", label: "load", async: true },
            { from: "inventory", to: "steering", label: "placement", async: true },
            { from: "steering", to: "client", label: "ranked URLs" },
            { from: "client", to: "primary", label: "segments" },
            { from: "client", to: "backup", label: "on failure, no round trip" },
          ],
        },
        check: {
          prompt: "Why return ranked URLs with fallbacks rather than a single best URL?",
          options: [
            "It lets the client parallelise segment requests across several appliances at once",
            "A failing client can move without calling the control plane while degraded",
            "Ranked lists compress better than individual URLs inside a large manifest",
            "It allows the appliances to load balance among themselves without coordination",
          ],
          correctIndex: 1,
          explain:
            "The control plane is the thing you least want in the recovery path. Handing the client its fallbacks up front means an appliance failure, or a control plane outage, does not end a session that is already playing.",
        },
        checks: [
          {
            prompt: "Why steer per playback session rather than with DNS, as most CDNs do?",
            options: [
              "DNS steering is coarse, cached beyond your control, and blind to appliance state",
              "DNS cannot return more than one address, so fallbacks would be impossible",
              "Per-session steering avoids the cost of running authoritative DNS at that scale",
              "DNS resolution happens too late in playback to influence which appliance is used",
            ],
            correctIndex: 0,
            explain:
              "DNS answers are cached by resolvers you do not operate, are granular only to a resolver rather than a client, and carry no knowledge of appliance load or whether that specific title is present. Steering at playback time knows all three.",
          },
        ],
      },

      {
        id: "netflix-microservices",
        title: "Microservices and the compounding failure problem",
        level: "advanced",
        body: [
          "The backend is hundreds of services, and a single home page assembles rows from many of them. The arithmetic here is unforgiving and worth doing explicitly. If each of two hundred dependencies is independently available 99.9% of the time, the probability that all two hundred are healthy simultaneously is 0.999 raised to the power of 200, which is about 82%. Roughly one page load in five would fail if every dependency were treated as required.",
          "That number is the whole argument. At this many dependencies, you cannot buy your way out with better uptime per service, because the compounding beats you. The only viable answer is to make most dependencies optional: render the page with whatever is available, and degrade the parts that are not. If personalisation is unavailable, show a sensible default row rather than an error page.",
          "The tooling exists to make that the default rather than an aspiration. Zuul is the gateway at the edge, rewritten on Netty for asynchronous non-blocking I/O to hold very large numbers of connections. Eureka handles service discovery. Hystrix, now retired in favour of newer libraries, popularised the circuit breaker and, more importantly, the idea that every remote call should have a declared fallback.",
          "Chaos engineering came from this problem. A fallback that has never been exercised is a hypothesis, not a safety net, and the only way to find out whether it works is to break the dependency and watch. Doing that deliberately, in production, during working hours, is far better than discovering the answer at three in the morning.",
        ],
        why: "The instinct to make every dependency required is what produces systems that are less reliable than any of their parts. The discipline is to ask, for each call, what the page should show if this never answers, and to accept that the honest answer is usually something rather than nothing. A service with no fallback is a service that can take the whole page down.",
        inPractice:
          "The practical version for a smaller system: mark every outbound call as required or optional, and make the optional ones time out fast with a defined default. Then turn one off in staging and see whether the page still renders. Most teams discover at least one call they believed was optional and was not.",
        diagram: {
          caption: "Every dependency has a fallback, or it can take the page down",
          columns: [
            [{ id: "client", label: "Client", kind: "client" }],
            [{ id: "zuul", label: "Edge gateway", sub: "routing, auth", kind: "edge" }],
            [
              { id: "page", label: "Page assembly", sub: "composes rows", kind: "service" },
              { id: "eureka", label: "Discovery", sub: "who is alive", kind: "service" },
            ],
            [
              { id: "perso", label: "Personalisation", sub: "optional", kind: "service" },
              { id: "art", label: "Artwork", sub: "optional", kind: "service" },
              { id: "auth", label: "Membership", sub: "required", kind: "service" },
            ],
            [{ id: "fallback", label: "Static defaults", sub: "when a call fails", kind: "data" }],
          ],
          edges: [
            { from: "client", to: "zuul" },
            { from: "zuul", to: "page" },
            { from: "eureka", to: "page", label: "instances", async: true },
            { from: "page", to: "perso" },
            { from: "page", to: "art" },
            { from: "page", to: "auth" },
            { from: "fallback", to: "page", label: "on timeout" },
          ],
        },
        check: {
          prompt: "With 200 services each 99.9% available, what does a page needing all of them achieve?",
          options: [
            "Still 99.9%, because the services fail independently of one another",
            "Roughly 82%, because independent failures compound across every dependency",
            "About 99.5%, because only the slowest dependency actually gates the page",
            "Around 80%, but only when the calls are made in sequence rather than in parallel",
          ],
          correctIndex: 1,
          explain:
            "0.999 to the power of 200 is about 0.82, so nearly one request in five fails. Compounding is precisely why every non-essential dependency needs a fallback, and why better per-service uptime cannot rescue the design.",
        },
        checks: [
          {
            prompt: "Why deliberately break dependencies in production rather than only in a test environment?",
            options: [
              "Test environments cost more to run at the scale required to be representative",
              "A fallback that has never been exercised under real load is a hypothesis, not a safety net",
              "Production is the only environment where circuit breakers are enabled at all",
              "Regulators require evidence that failure handling has been tested against live traffic",
            ],
            correctIndex: 1,
            explain:
              "Fallbacks rot silently: a config drifts, a timeout is raised, a default is removed. The only way to know the path still works is to take the dependency away and watch, and doing that on purpose at midday beats finding out at three in the morning.",
          },
          {
            prompt: "A page depends on a personalisation service that is slow but not failing. What is the right response?",
            options: [
              "Retry until it responds, since the personalised row is what members expect to see",
              "Time out quickly and render a sensible default row instead of waiting",
              "Increase the timeout so the personalised result is not lost unnecessarily",
              "Fail the whole page, because a partly personalised page is misleading to members",
            ],
            correctIndex: 1,
            explain:
              "Slow is a failure mode, and often a worse one than an error, because it consumes a connection while it waits. An optional dependency should be given a short deadline and a defined default, so latency in one row cannot become latency for the whole page.",
          },
        ],
      },

      {
        id: "netflix-caching",
        title: "EVCache: caching across regions without distributed transactions",
        level: "advanced",
        body: [
          "EVCache is the distributed caching layer, built on memcached, replicated within a region across availability zones and also across regions. Reported throughput is on the order of hundreds of millions of operations per second, holding things like viewing history, session metadata and precomputed personalisation.",
          "The interesting decision is not the cache itself but how invalidation is handled, because invalidation across regions is where most designs quietly become distributed transactions. A delete that must succeed in every region before a write is acknowledged is a coordination protocol, and it will fail exactly when the network between regions is already degraded, which is to say at the worst possible moment.",
          "Netflix leans instead on short time to live values and versioned keys. A write bumps a version, so subsequent reads look for a key that only the new value occupies. Old entries are not deleted; they become unreachable and then expire on their own. Nothing needs to be coordinated, and a region that is temporarily unreachable simply serves slightly stale data until its entries age out.",
          "Cross-region replication also exists for a reason that is easy to miss: it is not only about read latency, it is about failover. If a region is evacuated and its traffic lands elsewhere, the receiving region needs warm caches. A cold cache under a doubled load is its own outage, because every miss becomes an origin request at exactly the moment origin is busiest.",
        ],
        why: "The general lesson is to make staleness bounded and self-healing rather than trying to make it zero. Zero staleness across regions costs coordination, and coordination fails under precisely the conditions that make you want it. A version bump needs no agreement from anyone, and an entry that expires on its own needs no successful delete.",
        inPractice:
          "In a smaller system this is the difference between deleting a cache key on write, which fails silently and leaves stale data forever, and including a version or a content hash in the key, which makes stale entries unreachable the moment the version changes and lets them expire quietly.",
        diagram: {
          caption: "Version the key, do not coordinate the delete",
          columns: [
            [{ id: "write", label: "Write", sub: "profile updated", kind: "service" }],
            [{ id: "ver", label: "Version bump", sub: "v7 becomes v8", kind: "service" }],
            [
              { id: "c1", label: "Cache, region A", sub: "holds v7 and v8", kind: "data" },
              { id: "c2", label: "Cache, region B", sub: "holds v7 and v8", kind: "data" },
            ],
            [
              { id: "r1", label: "Reader, region A", kind: "client" },
              { id: "r2", label: "Reader, region B", kind: "client" },
            ],
          ],
          edges: [
            { from: "write", to: "ver" },
            { from: "ver", to: "c1", label: "writes v8", async: true },
            { from: "ver", to: "c2", label: "writes v8", async: true },
            { from: "c1", to: "r1", label: "asks for v8" },
            { from: "c2", to: "r2", label: "asks for v8" },
          ],
        },
        check: {
          prompt: "Why prefer versioned keys and short TTLs over coordinated global invalidation?",
          options: [
            "Cross-region deletes add latency to the write path, which users feel on every save",
            "Short TTLs already bound staleness, which makes invalidation messages redundant",
            "A delete must reach every region to be correct; a new key version needs no agreement",
            "Versioned keys let each region decide which version to serve, avoiding contention",
          ],
          correctIndex: 2,
          explain:
            "Coordinated invalidation is a distributed transaction wearing a different hat, and it fails when the network between regions does, which is exactly when you wanted it. Versioning degrades gracefully because nothing has to succeed anywhere.",
        },
        checks: [
          {
            prompt: "Why replicate caches across regions when each region could simply populate its own?",
            options: [
              "Replication reduces total memory used, since regions share the same entries",
              "A region taking evacuated traffic needs warm caches, or misses swamp origin",
              "Memcached cannot populate a cache from origin without a peer to replicate from",
              "Cross-region replication is what keeps the versions consistent between regions",
            ],
            correctIndex: 1,
            explain:
              "Failover is the reason. A cold cache absorbing another region's traffic turns every request into an origin request at the moment origin is least able to take it, so the cache miss storm becomes the outage rather than the thing that was being failed over.",
          },
        ],
      },

      {
        id: "netflix-regions",
        title: "Active-active regions and practising the evacuation",
        level: "advanced",
        body: [
          "Netflix runs multiple AWS regions active-active, serving members from more than one at the same time rather than keeping a standby that has never taken real traffic. The reason for active-active over active-passive is not capacity, it is confidence: a standby region is a claim about what would happen, and claims about untested code paths are usually wrong.",
          "Failover is therefore a traffic shift rather than a promotion. If a region degrades, its traffic is moved to the others, and because those regions were already serving, there is no cold start of anything, no first-time-ever code path, no configuration that was correct a year ago.",
          "They rehearse it. Chaos Kong is the exercise that evacuates an entire region, and it is run as a matter of routine rather than as a drill after an incident. Published accounts describe keeping traffic out of a region for over twenty-four hours before shifting it gradually back to an even split, and shifting more slowly than an emergency would require, specifically so services can scale up and caches can warm. That detail is the interesting one: they discovered that the speed of the shift is itself a failure mode.",
          "The write path is the genuinely hard part and it is worth being honest about it. Reads are easy to serve from anywhere. Writes accepted in two regions at once need either a partitioning scheme that keeps a given member's writes in one place, or eventual convergence with a defined conflict rule. There is no version of this that is simultaneously fast, globally consistent and available during a partition, which is the practical face of the CAP theorem rather than the textbook one.",
        ],
        why: "Active-active costs more than active-passive and buys something specific: every path in the failover has been exercised by real traffic before you need it. A passive region is a set of assumptions, and assumptions that have never been tested at load are where outages live. The gradual shift matters for the same reason, because instant failover is itself an untested thundering herd.",
        inPractice:
          "The small-system version is to run two of everything and route to both, rather than keeping a spare you have never served from. If that is too expensive, then at minimum route real traffic to the spare on a schedule, because a standby that has never served a request is not a standby, it is a hope.",
        diagram: {
          caption: "Both regions serve. Failover is a shift, not a promotion.",
          columns: [
            [{ id: "members", label: "Members", kind: "client" }],
            [{ id: "dns", label: "Traffic steering", sub: "share per region", kind: "edge" }],
            [
              { id: "ra", label: "Region A", sub: "serving now", kind: "service" },
              { id: "rb", label: "Region B", sub: "serving now", kind: "service" },
            ],
            [
              { id: "ca", label: "Cache A", sub: "warm", kind: "data" },
              { id: "cb", label: "Cache B", sub: "warm", kind: "data" },
            ],
            [{ id: "store", label: "Replicated store", sub: "converges", kind: "data" }],
          ],
          edges: [
            { from: "members", to: "dns" },
            { from: "dns", to: "ra", label: "50%" },
            { from: "dns", to: "rb", label: "50%" },
            { from: "ra", to: "ca" },
            { from: "rb", to: "cb" },
            { from: "ca", to: "cb", label: "replicated", async: true },
            { from: "ra", to: "store" },
            { from: "rb", to: "store" },
          ],
        },
        check: {
          prompt: "Why run regions active-active rather than keeping a passive standby?",
          options: [
            "Active-active is cheaper, because capacity is shared rather than duplicated",
            "Every failover path is already exercised by real traffic before it is needed",
            "Passive regions cannot replicate data quickly enough to be useful in a failover",
            "It is the only arrangement that allows writes to be accepted in more than one place",
          ],
          correctIndex: 1,
          explain:
            "A standby is a claim about what would happen. Active-active is more expensive and buys the certainty that the code paths, the scaling and the caches all work under real load, because they are doing it right now.",
        },
        checks: [
          {
            prompt: "During a rehearsed evacuation, why shift traffic gradually rather than all at once?",
            options: [
              "Gradual shifts let services scale and caches warm, so the shift is not its own outage",
              "Traffic steering cannot move more than a fraction of sessions in a single change",
              "It keeps the evacuated region partly loaded so its instances are not terminated",
              "Members experience fewer session interruptions when the change is applied slowly",
            ],
            correctIndex: 0,
            explain:
              "An instant shift is a thundering herd landing on cold caches and unscaled instances. Published accounts describe deliberately moving more slowly than an emergency would demand for exactly this reason.",
          },
          {
            prompt: "What is the genuinely hard part of running two regions active-active?",
            options: [
              "Reads, because each region must hold a complete copy of the catalogue",
              "Writes, because two places accepting them needs partitioning or a merge rule",
              "Steering, because traffic cannot be split reliably between two regions",
              "Monitoring, because metrics from two regions cannot be compared directly",
            ],
            correctIndex: 1,
            explain:
              "Reads are servable anywhere. Writes accepted concurrently in two regions need either a partitioning scheme that pins a member to one, or eventual convergence with a defined conflict rule. Nothing makes that simultaneously fast, globally consistent and partition-tolerant.",
          },
        ],
      },

      {
        id: "netflix-data",
        title: "Personalisation and the data platform underneath it",
        level: "intermediate",
        body: [
          "Almost every row on the home page is chosen, ordered and titled for the member looking at it, and even the artwork shown for a title can differ between members. That is a great deal of computation to attach to a page load, and the design answer is that most of it is not attached to the page load at all.",
          "The heavy work happens offline. Models are trained on viewing behaviour in batch, and candidate rows are precomputed and written to a store the serving path can read quickly, which is where EVCache earns its place. At request time the service is mostly assembling and lightly reranking things that were computed earlier. This is what makes a personalised page affordable.",
          "The event pipeline feeding this is substantial in its own right: play events, pause events, searches, impressions of rows that were never clicked, all streamed and processed continuously. The negative signals matter as much as the positive ones, because a row shown many times and never clicked is evidence.",
          "There is a cold start problem that no amount of infrastructure solves. A new member has no history, so the first session is populated from what they told you during signup, from what is popular in their region, and from the device they are on. It gets better quickly, and the honest framing is that the first session is the worst one they will ever have.",
          "It is worth naming the failure mode too. Feedback loops are real: recommending what was clicked yesterday makes it more clickable today, and a system optimised only for immediate engagement will narrow what people see. This is why the objective being optimised matters more than the model, and why measuring long-term retention rather than the next click is the harder and more honest choice.",
        ],
        why: "The pattern is to move work out of the request path whenever the input changes more slowly than the requests arrive. Viewing history changes a few times a day; the home page is requested constantly. Precomputing against the slow-changing thing and assembling at read time is what makes the fast path fast, and it is the same reasoning behind materialised views and denormalised read models.",
        inPractice:
          "The everyday version is a dashboard that recomputes an expensive aggregate on every load. If the underlying data updates hourly, the aggregate should be computed hourly and read from a table, not derived per request. The moment you notice a query whose inputs change more slowly than its callers arrive, you have found something to precompute.",
        diagram: {
          caption: "Compute offline, assemble at read time",
          columns: [
            [{ id: "events", label: "Client events", sub: "plays, searches, impressions", kind: "client" }],
            [{ id: "stream", label: "Event pipeline", sub: "continuous", kind: "queue" }],
            [
              { id: "train", label: "Model training", sub: "batch, offline", kind: "service" },
              { id: "precomp", label: "Precomputed rows", sub: "per member", kind: "service" },
            ],
            [{ id: "cache", label: "Serving store", sub: "EVCache", kind: "data" }],
            [{ id: "home", label: "Home page", sub: "assembles and reranks", kind: "service" }],
          ],
          edges: [
            { from: "events", to: "stream" },
            { from: "stream", to: "train", async: true },
            { from: "train", to: "precomp", async: true },
            { from: "precomp", to: "cache", label: "written ahead of time", async: true },
            { from: "cache", to: "home", label: "read on request" },
          ],
        },
        check: {
          prompt: "Why precompute recommendation rows offline rather than generating them per request?",
          options: [
            "Models cannot be executed inside a request without specialised hardware",
            "Inputs change far more slowly than requests arrive, so work can be reused",
            "Precomputed rows are more accurate than ones generated at request time",
            "It is the only way to keep recommendations consistent between devices",
          ],
          correctIndex: 1,
          explain:
            "Viewing history changes a few times a day; the home page is requested constantly. Anything whose inputs move more slowly than its callers arrive should be computed once and read many times.",
        },
        checks: [
          {
            prompt: "Why do impressions that were never clicked matter to a recommendation system?",
            options: [
              "They are needed to calculate how many rows a page should contain",
              "A row shown repeatedly and never clicked is evidence, not an absence of evidence",
              "Impression counts determine which titles are pre-positioned on appliances",
              "They are used to detect clients that are rendering the page incorrectly",
            ],
            correctIndex: 1,
            explain:
              "Only counting clicks means learning from successes and ignoring rejections. Something shown twenty times and never chosen is a strong negative signal, and a system blind to it keeps making the same recommendation.",
          },
          {
            prompt: "What is the risk in optimising a recommender purely for immediate engagement?",
            options: [
              "A feedback loop narrows what members see, costing long-term retention",
              "It requires more compute than optimising for a longer-term objective would",
              "Immediate engagement cannot be measured reliably on television devices",
              "It causes the precomputed rows to expire from the serving store too quickly",
            ],
            correctIndex: 0,
            explain:
              "Recommending what was clicked yesterday makes it more clickable today, and the loop tightens until the catalogue effectively shrinks. The objective matters more than the model, which is why retention over months is the harder and more honest thing to optimise.",
          },
        ],
      },
    ],
  },

  {
    id: "uber",
    title: "Uber",
    summary: "Matching riders to drivers in real time, over geography, at city scale.",
    track: "case-study",
    topics: [
      {
        id: "uber-geo",
        title: "Geospatial indexing with H3",
        level: "advanced",
        body: [
          "Finding nearby drivers by comparing latitude and longitude means scanning everything, because neither coordinate on its own narrows the search usefully.",
          "Uber divides the world into hexagonal cells, their H3 library, so a location becomes a cell id, and finding nearby drivers becomes looking up a handful of ids. Hexagons rather than squares because every neighbour is equidistant, which makes expanding the search ring uniform.",
        ],
        why: "The move is turning a continuous two-dimensional problem into a discrete key lookup. Once location is a key, ordinary tools, hash maps, caches, shards, all work again.",
        diagram: {
          caption: "A ride request: match on cells, then track over a persistent connection",
          columns: [
            [
              { id: "rider", label: "Rider app", kind: "client" },
              { id: "driver", label: "Driver app", sub: "pings location", kind: "client" },
            ],
            [{ id: "gw", label: "API gateway", sub: "WebSocket", kind: "edge" }],
            [
              { id: "match", label: "Matching", sub: "supply and demand", kind: "service" },
              { id: "loc", label: "Location service", sub: "H3 cell index", kind: "service" },
              { id: "price", label: "Pricing", sub: "surge by cell", kind: "service" },
            ],
            [
              { id: "geo", label: "Driver index", sub: "Redis, cell to drivers", kind: "data" },
              { id: "trips", label: "Trip store", sub: "sharded by city", kind: "data" },
              { id: "kafka", label: "Event stream", sub: "Kafka", kind: "queue" },
            ],
          ],
          edges: [
            { from: "driver", to: "gw", label: "location every few sec" },
            { from: "gw", to: "loc" },
            { from: "loc", to: "geo", label: "update cell" },
            { from: "rider", to: "gw", label: "request ride" },
            { from: "gw", to: "match" },
            { from: "match", to: "geo", label: "drivers in nearby cells" },
            { from: "match", to: "price" },
            { from: "match", to: "trips", label: "create trip" },
            { from: "trips", to: "kafka", label: "events", async: true },
          ],
        },
        check: {
          prompt: "Why does cell-based indexing beat comparing latitude and longitude ranges?",
          options: [
            "It keeps nearby points close in the index, so a scan reads fewer pages",
            "It stores a precomputed distance, so no trigonometry runs at query time",
            "It turns a two-dimensional range scan into a lookup of a few discrete keys",
            "It bounds the error, so results stay correct regardless of cell size",
          ],
          correctIndex: 2,
          explain: "A bounding-box query on two independent columns cannot use one index efficiently. A cell id is a single key, so hashing and sharding work normally.",
        },
      },
      {
        id: "uber-surge",
        title: "Surge pricing as a control loop",
        level: "advanced",
        body: [
          "Surge is not primarily a revenue mechanism, it is a feedback loop balancing supply and demand within a geographic cell.",
          "When requests outnumber available drivers in a cell, the multiplier rises. That suppresses some demand and attracts drivers from neighbouring cells, and the imbalance closes.",
          "It must be computed per small area and updated continuously, because conditions differ street by street and change within minutes.",
        ],
        why: "Framing it as a control system, not a pricing lever, explains the design: it needs fast feedback, small granularity, and damping so it does not oscillate.",
        check: {
          prompt: "What does surge pricing primarily do to the system?",
          options: [
            "It rations scarce supply to the riders who value the trip most highly",
            "It raises revenue per ride, which funds driver incentives in that area",
            "It signals to riders that waiting a few minutes will be materially cheaper",
            "It is a feedback loop, cutting demand and drawing supply until the gap closes",
          ],
          correctIndex: 3,
          explain: "It is a control loop over a local imbalance. Revenue is a side effect; the function is clearing the market in that cell.",
        },
      },
      {
        id: "uber-sharding",
        title: "Sharding by city",
        level: "intermediate",
        body: [
          "Trips are overwhelmingly local. A rider and a driver are in the same city, and almost no query needs to join across cities.",
          "That makes city, or region, an excellent shard key: traffic distributes naturally and cross-shard queries are rare. It also isolates failure and allows per-city configuration, which matters because regulation and pricing differ by market.",
        ],
        why: "A good shard key follows a natural boundary in the domain. City works because it matches how the data is actually queried; user id would scatter the two halves of every trip.",
        check: {
          prompt: "Why is city a good shard key for trips?",
          options: [
            "Trips are local, so almost every query stays inside a single shard",
            "Cities are roughly equal in size, so the shards stay well balanced",
            "City is immutable for a trip, so a row never moves between shards",
            "It keeps the shard count low enough to fit in one connection pool",
          ],
          correctIndex: 0,
          explain: "Locality is the point: rider, driver and trip share a city, so queries rarely cross shards. Uneven city sizes are handled by splitting large ones.",
        },
      },
    ],
  },

  {
    id: "twitter-feed",
    title: "Twitter and news feeds",
    summary: "Fan-out on write versus read, and the celebrity problem.",
    track: "case-study",
    topics: [
      {
        id: "fanout",
        title: "Fan-out on write or on read",
        level: "advanced",
        body: [
          "Fan-out on write pushes each post into every follower's precomputed timeline. Reads become a single fast lookup, and writes get expensive.",
          "Fan-out on read builds the timeline when it is requested, by querying everyone you follow. Writes are cheap and reads are expensive.",
          "Neither survives the extremes. A million followers means a million inserts per post; following thousands of accounts means an enormous query on every refresh.",
          "Which is why real systems run both. Fan out on write for ordinary accounts, leave the handful with millions of followers out of it entirely, and merge their posts in at read time. The cost then tracks the median user, not the most extreme one in the system.",
        ],
        why: "Neither works alone, which is the actual answer: fan out on write for ordinary accounts, and merge in celebrity posts at read time. The hybrid exists because the follower distribution is extremely skewed.",
        diagram: {
          caption: "Hybrid: precomputed timelines for most, merged at read for large accounts",
          columns: [
            [{ id: "poster", label: "User posts", kind: "client" }],
            [{ id: "write", label: "Write service", kind: "service" }],
            [
              { id: "fan", label: "Fan-out worker", sub: "normal accounts", kind: "queue" },
              { id: "celeb", label: "Celebrity store", sub: "not fanned out", kind: "data" },
            ],
            [
              { id: "tl", label: "Timeline cache", sub: "Redis per user", kind: "data" },
              { id: "reader", label: "Read service", sub: "merges both", kind: "service" },
            ],
          ],
          edges: [
            { from: "poster", to: "write" },
            { from: "write", to: "fan", label: "if followers < threshold", async: true },
            { from: "write", to: "celeb", label: "if large account" },
            { from: "fan", to: "tl", label: "insert per follower", async: true },
            { from: "tl", to: "reader" },
            { from: "celeb", to: "reader", label: "merged at read" },
          ],
        },
        check: {
          prompt: "Why is pure fan-out on write impractical for accounts with millions of followers?",
          options: [
            "Timelines for inactive followers get written and then never read",
            "Follower lists change during the fan-out, so some followers are missed",
            "Redis cannot hold that many timeline keys in one instance's memory",
            "One post becomes millions of writes, a spike that delays delivery for everyone",
          ],
          correctIndex: 3,
          explain: "The write amplification is the problem. Excluding large accounts from fan-out and merging them at read keeps both paths bounded.",
        },
      },
      {
        id: "timeline-ranking",
        title: "Ranking a timeline",
        level: "advanced",
        body: [
          "Reverse chronological is simple and predictable. Ranked feeds score each candidate on predicted engagement, recency, affinity and content type.",
          "Ranking needs candidates first: retrieve a few hundred plausible posts cheaply, then score those expensively, because scoring everything is not affordable. That two-stage shape, cheap retrieval, expensive ranking, is how very nearly every recommendation system is built.",
        ],
        why: "Candidate generation then ranking is the general pattern worth carrying into any recommendation question. It bounds the expensive step regardless of corpus size.",
        check: {
          prompt: "Why do feed systems separate candidate generation from ranking?",
          options: [
            "Scoring everything is unaffordable, so a cheap step narrows it down first",
            "The ranking model needs features that exist only after candidates are chosen",
            "Candidate generation can run offline, while ranking must run per request",
            "It lets each source of candidates be tuned without retraining the model",
          ],
          correctIndex: 0,
          explain: "It bounds the cost of the expensive stage. Retrieval is cheap and approximate; ranking is precise and applied to a small set.",
        },
      },
    ],
  },

  {
    id: "whatsapp",
    title: "WhatsApp and chat",
    summary: "Delivery guarantees, ordering and end-to-end encryption at billions of messages.",
    track: "case-study",
    topics: [
      {
        id: "chat-delivery",
        title: "Delivery, receipts and offline users",
        level: "intermediate",
        body: [
          "A message is stored server-side until delivered, then usually deleted. The server is a relay with a queue attached, not an archive.",
          "The three ticks, sent, delivered, read, are acknowledgements flowing back at each stage, each one a separate event. Offline users make this a queue-per-recipient problem, drained when the device finally reconnects.",
        ],
        why: "Treating chat as a per-recipient queue instead of a shared log is what makes offline delivery and multi-device sync tractable.",
        diagram: {
          caption: "Message path with an offline recipient",
          columns: [
            [{ id: "a", label: "Sender", kind: "client" }],
            [{ id: "gw", label: "Gateway", sub: "persistent socket", kind: "edge" }],
            [
              { id: "msg", label: "Message service", kind: "service" },
              { id: "q", label: "Per-user queue", sub: "undelivered", kind: "queue" },
            ],
            [
              { id: "b", label: "Recipient", sub: "offline, then reconnects", kind: "client" },
              { id: "push", label: "Push notification", sub: "APNs, FCM", kind: "external" },
            ],
          ],
          edges: [
            { from: "a", to: "gw", label: "send" },
            { from: "gw", to: "msg" },
            { from: "msg", to: "q", label: "store if offline" },
            { from: "msg", to: "push", label: "wake device", async: true },
            { from: "q", to: "b", label: "drain on reconnect" },
            { from: "b", to: "msg", label: "delivered ack" },
            { from: "msg", to: "a", label: "ticks", async: true },
          ],
        },
        check: {
          prompt: "Why does the server queue per recipient rather than keeping one shared log?",
          options: [
            "Group messages would otherwise be stored once per group, not per member",
            "Each recipient has their own delivery state, and their copy goes once received",
            "Per-recipient queues let each device acknowledge at its own pace",
            "A shared log cannot be ordered per conversation across many recipients",
          ],
          correctIndex: 1,
          explain: "Delivery is per device and per user. A per-recipient queue makes 'what does this device still need' a direct question.",
        },
      },
      {
        id: "e2e",
        title: "End-to-end encryption and its consequences",
        level: "advanced",
        body: [
          "With end-to-end encryption the server relays ciphertext it cannot read. Keys live on devices, and each conversation has its own session.",
          "That removes entire categories of server-side feature: search across history, server-side spam classification on content, and web access without a linked device.",
          "Multi-device support becomes hard, because each device needs its own keys and its own copy of the session state.",
        ],
        why: "This is the clearest example of a security decision constraining the product. Choosing E2E means accepting that the server cannot help with anything requiring message content.",
        check: {
          prompt: "Which of these does end-to-end encryption make structurally hard, rather than merely fiddly?",
          options: [
            "Delivering to a second device, which needs the message re-encrypted per device",
            "Searching a user's history server-side, since the server holds only ciphertext",
            "Group messaging, which needs a separate key exchange with every member",
            "Delivery receipts, which must be produced without the server reading anything",
          ],
          correctIndex: 1,
          explain: "The server holds only ciphertext, so it cannot index content. Search must happen on-device over locally decrypted messages.",
        },
      },
    ],
  },

  {
    id: "classic-designs",
    title: "Classic interview systems",
    summary: "URL shortener, rate limiter, ticket booking, file sync, the ones that come up most.",
    track: "case-study",
    topics: [
      {
        id: "url-shortener",
        title: "URL shortener",
        level: "beginner",
        body: [
          "The core is a mapping from short key to long URL, read far more often than it is written, which makes it a caching problem more than a storage one.",
          "Keys can be generated by base62-encoding a counter, or by hashing and handling collisions. A counter gives short sequential keys and leaks your volume to anyone who looks; hashing does not.",
          "Redirects should be 301 or 302 deliberately. A 301 is cached by the browser, which is fast and makes click analytics impossible.",
          "The scale is smaller than it looks. Seven base62 characters is about 3.5 trillion keys, and the hot set fits in memory on one machine. This is a question about which tradeoffs you notice, not about capacity.",
        ],
        why: "The 301-versus-302 choice is the interesting decision. If you need per-click analytics you must use 302 and accept the traffic, because a cached 301 never reaches your server again.",
        check: {
          prompt: "A URL shortener redirects with 302 rather than 301. What does it gain, and what does it pay?",
          options: [
            "It gets a cacheable response, at the cost of never being able to change the target",
            "It avoids a redirect chain, at the cost of a slower first resolution",
            "It sees every click, at the cost of a request to its servers on each one",
            "It signals permanence to search engines, at the cost of losing link equity",
          ],
          correctIndex: 2,
          explain: "Permanent redirects are cached aggressively. That is a performance win and an analytics loss, so the answer depends on which you need.",
        },
      },
      {
        id: "ticket-booking",
        title: "Ticket booking and seat reservation",
        level: "advanced",
        body: [
          "The defining constraint is that a seat must not be sold twice, under a load spike concentrated on a few popular events.",
          "Seats are held with a short-lived reservation, typically a few minutes, created atomically, so a user has exclusive claim while paying.",
          "Expired holds must be released reliably, which means a background reaper or a TTL, not just an application timer.",
        ],
        why: "This is where optimistic concurrency stops working. Under contention for the same rows, optimistic retries mostly fail, so an explicit hold with a TTL is the correct model.",
        check: {
          prompt: "Why hold a seat rather than only checking availability at payment time?",
          options: [
            "The seat map would have to be re-read on every page, which is expensive",
            "Payment providers require the item reserved before a charge is authorised",
            "Refunds are harder than holds, so failing early is cheaper operationally",
            "Without an exclusive hold, two users both pass the check and both pay",
          ],
          correctIndex: 3,
          explain: "The gap between checking and paying is where the race lives. An atomic hold closes it, and the TTL stops abandoned carts locking inventory forever.",
        },
      },
      {
        id: "file-sync",
        title: "File sync, Dropbox style",
        level: "advanced",
        body: [
          "Files are split into chunks, each hashed. Only chunks whose hash changed are uploaded, so editing one page of a large document transfers very little.",
          "Identical chunks across users are stored once, which is deduplication and a large storage saving.",
          "Conflicts happen when two devices edit while offline. The usual resolution is to keep both as a conflicted copy instead of silently picking a winner.",
        ],
        why: "Content-addressed chunking gives deduplication, delta sync and integrity checking from one idea. Preferring a conflicted copy over automatic merge is a deliberate choice: silent data loss is worse than a confusing filename.",
        check: {
          prompt: "Why hash file chunks rather than whole files?",
          options: [
            "Only changed chunks upload, and identical chunks are stored once for everyone",
            "Chunk hashes are shorter, so the whole index of them fits in memory",
            "A whole-file hash changes on any edit, so nothing could ever be cached",
            "Chunks can be verified in parallel, which a single file hash cannot be",
          ],
          correctIndex: 0,
          explain: "Chunk-level hashing gives delta sync and cross-user deduplication together. A whole-file hash tells you only that something changed.",
        },
      },
    ],
  },
];
