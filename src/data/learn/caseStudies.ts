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
    summary:
      "Matching riders to drivers over real geography: indexing the world, dispatching against it, and keeping the money correct.",
    track: "case-study",
    topics: [
      {
        id: "uber-geo",
        title: "H3: why the world is tiled in hexagons",
        level: "intermediate",
        body: [
          "The core query is deceptively simple: which drivers are near this rider. Doing it directly means comparing a point against every driver's coordinates and sorting by distance, which is fine at a hundred drivers and hopeless at scale, because the work grows with the size of the fleet rather than with the size of the neighbourhood.",
          "The standard fix is to index space itself: divide the world into cells, put each driver in a cell, and look only at the rider's cell and its neighbours. Uber built H3 for this and open-sourced it, and the choice of shape is the interesting part.",
          "Squares have a problem that sounds pedantic and is not. A square has eight neighbours at two different distances: four sharing an edge and four sharing only a corner, which are further away. So 'the neighbouring cells' is an ambiguous phrase, and any radial search has to decide what to do about the diagonals. A hexagon has six neighbours, all at the same distance from the centre, so expanding a search outward is unambiguous. Uber's own framing is that hexagons have one distance between a centre and its neighbours, against two for squares and three for triangles.",
          "The second reason is quantisation error. People move continuously and cells are discrete, so a moving driver keeps crossing boundaries. Hexagons are closer to circles than squares are, which means the error introduced by snapping a moving point to a cell is smaller and more uniform in every direction.",
          "H3 has sixteen resolutions, each cell holding roughly one seventh the area of the level above, so the same system serves a city-wide heat map and a street-level match by changing one number. It projects the sphere onto an icosahedron, twenty flat faces rather than one, which keeps cells much closer to equal area than a single flat projection would. The catch is that you cannot tile an icosahedron with hexagons alone: twelve pentagons are unavoidable, and H3 orients the solid so they fall in the ocean.",
        ],
        why: "The general move is to convert a geometry problem into a lookup problem. Comparing distances is expensive and scales with the fleet; looking up a cell key is cheap and scales with the neighbourhood. Almost every spatial system does some version of this, and the differences between geohash, S2 and H3 are mostly about which distortions they accept in exchange.",
        inPractice:
          "The same conversion works whenever a range query is really a proximity query. Bucketing timestamps into fixed windows, rounding prices into bands, hashing a user into a cohort: each replaces a comparison across everything with a lookup into a bucket, and each accepts a defined quantisation error to get it.",
        diagram: {
          caption: "Location becomes a cell key, and matching becomes a lookup",
          columns: [
            [
              { id: "driver", label: "Driver app", sub: "pings location", kind: "client" },
              { id: "rider", label: "Rider app", sub: "requests a trip", kind: "client" },
            ],
            [{ id: "gw", label: "Gateway", sub: "persistent connections", kind: "edge" }],
            [
              { id: "loc", label: "Location service", sub: "point to H3 cell", kind: "service" },
              { id: "match", label: "Matching", sub: "reads cell and ring", kind: "service" },
            ],
            [{ id: "index", label: "Driver index", sub: "cell to drivers", kind: "data" }],
          ],
          edges: [
            { from: "driver", to: "gw", label: "every few seconds" },
            { from: "rider", to: "gw", label: "request" },
            { from: "gw", to: "loc" },
            { from: "loc", to: "index", label: "writes cell membership" },
            { from: "gw", to: "match" },
            { from: "index", to: "match", label: "candidates in ring" },
          ],
        },
        check: {
          prompt: "Why index drivers by hexagonal cell rather than querying coordinates directly?",
          options: [
            "Hexagons store coordinates more compactly, reducing the memory the index needs",
            "It turns a distance comparison over the fleet into a lookup over a neighbourhood",
            "Coordinate queries cannot be indexed by a database without specialised extensions",
            "Cell membership changes less often than coordinates, so fewer writes are required",
          ],
          correctIndex: 1,
          explain:
            "Comparing distances costs work proportional to the number of drivers. Looking up a cell and its ring costs work proportional to the neighbourhood, which stays roughly constant however large the fleet becomes.",
        },
        checks: [
          {
            prompt: "What specifically do hexagons give you that squares do not, for a radial search?",
            options: [
              "Six neighbours all at the same distance, so expanding outward is unambiguous",
              "Hexagons tile a sphere exactly, whereas squares leave gaps at the poles",
              "Hexagonal cells can be subdivided evenly, which square cells cannot",
              "Hexagons align with road networks more closely than square grids do",
            ],
            correctIndex: 0,
            explain:
              "A square has eight neighbours at two different distances: four across edges and four across corners. A hexagon has six, all equidistant, so a ring of neighbours is a well-defined thing rather than a decision about diagonals.",
          },
          {
            prompt: "H3 places twelve pentagons on the globe. Why do they exist and where are they put?",
            options: [
              "They mark the icosahedron vertices used for projection and sit at the poles",
              "An icosahedron cannot be tiled with hexagons alone, so they are oriented into ocean",
              "They provide coarser cells over sparsely populated regions to save index space",
              "They are reserved cells used to signal boundaries between operating regions",
            ],
            correctIndex: 1,
            explain:
              "Hexagons alone cannot tile the solid, so twelve pentagons are a geometric necessity rather than a design choice. What is a choice is the orientation, which puts them in water so almost no real trip is affected.",
          },
        ],
      },

      {
        id: "uber-dispatch",
        title: "Dispatch: matching is an assignment problem, not a search",
        level: "advanced",
        body: [
          "The naive dispatch is to give each request the nearest free driver, first come first served. It is simple, it is obviously fair, and it is measurably worse than the alternative.",
          "Consider two requests arriving seconds apart and two available drivers. Greedy assignment gives the first request its nearest driver, which may be the same driver that was much closer to the second request, leaving the second rider with a driver several minutes away. Considering both requests together and minimising total pickup time can leave both riders better off than serving one of them optimally. That is the difference between a search, which answers one query at a time, and an assignment, which optimises a batch.",
          "So dispatch batches over a short window, typically a few seconds, and solves a small assignment problem. The window is a real trade: longer windows produce better matches and make everybody wait, and the right length is an empirical question rather than a principled one.",
          "Distance is also the wrong objective, which is easy to miss. What matters is time to pickup, and a driver eight hundred metres away across a river with no bridge is further, in the sense the rider cares about, than one two kilometres away on the same road. Real dispatch uses estimated travel time from a routing engine over the road network, not straight-line distance.",
          "The system also has to reason about drivers who are not free yet. A driver two minutes from dropping off may be a better match than an idle driver ten minutes away, which means dispatch is matching against predicted future supply, not just present supply.",
        ],
        why: "The transferable idea is that batching changes what is possible, not just what is efficient. A queue processed one item at a time can only ever make locally optimal choices; a queue processed in small batches can make globally better ones. The cost is latency, and the design question is how much latency the batch is worth.",
        inPractice:
          "The same shape appears in database write batching, ad auctions, and any scheduler worth the name. If you find yourself making a sequence of independent greedy choices that interact, the fix is usually to accumulate briefly and decide together.",
        diagram: {
          caption: "Batch a few seconds of demand and supply, then assign together",
          columns: [
            [
              { id: "reqs", label: "Open requests", sub: "last few seconds", kind: "queue" },
              { id: "supply", label: "Available drivers", sub: "and soon-free", kind: "queue" },
            ],
            [{ id: "cands", label: "Candidate pairs", sub: "from H3 rings", kind: "service" }],
            [{ id: "eta", label: "Routing engine", sub: "time, not distance", kind: "service" }],
            [{ id: "assign", label: "Assignment", sub: "minimise total wait", kind: "service" }],
            [{ id: "offer", label: "Offers", sub: "sent to drivers", kind: "service" }],
          ],
          edges: [
            { from: "reqs", to: "cands" },
            { from: "supply", to: "cands" },
            { from: "cands", to: "eta", label: "cost each pair" },
            { from: "eta", to: "assign" },
            { from: "assign", to: "offer" },
          ],
        },
        check: {
          prompt: "Why batch requests for a few seconds instead of matching each on arrival?",
          options: [
            "Batching reduces load on the routing engine by amortising its cost per request",
            "Considering several requests together can leave every rider better off than greedy",
            "Drivers cannot receive offers more frequently than every few seconds anyway",
            "It gives the location index time to converge before candidates are selected",
          ],
          correctIndex: 1,
          explain:
            "Greedy assignment can hand the first request a driver who was much closer to the second, leaving that rider stranded. Solving a small batch together optimises total pickup time, which is a different and better objective than optimising each request in turn.",
        },
        checks: [
          {
            prompt: "Why rank candidates by estimated travel time rather than straight-line distance?",
            options: [
              "Travel time is cheaper to compute than distance over a spherical surface",
              "Rivers, one-way streets and traffic make the nearest driver often not the soonest",
              "Distance calculations are inaccurate near the twelve pentagons in the grid",
              "Drivers are paid by time, so ranking by time keeps the incentives aligned",
            ],
            correctIndex: 1,
            explain:
              "The rider is waiting for an arrival, not for a shorter line on a map. Eight hundred metres across a river with no bridge is further, in every sense that matters, than two kilometres along the same road.",
          },
          {
            prompt: "Why does dispatch consider drivers who are still completing a trip?",
            options: [
              "A driver two minutes from dropping off may beat an idle driver ten minutes away",
              "It prevents idle drivers from receiving too many consecutive offers",
              "Trips in progress hold a lock on the driver record until dispatch releases it",
              "Predicting completion smooths the load on the assignment solver between batches",
            ],
            correctIndex: 0,
            explain:
              "Supply is not only what is idle now. Matching against predicted near-future availability produces better pickups than restricting the pool to drivers who happen to be free at the instant the request arrives.",
          },
        ],
      },

      {
        id: "uber-surge",
        title: "Surge: a control loop that people can see",
        level: "intermediate",
        body: [
          "Surge pricing is a control loop. Demand in a cell exceeds supply, price rises, which suppresses some demand and attracts drivers from nearby cells, and the imbalance closes. H3 is what makes it computable: supply and demand are measured per hexagon, and a multiplier is set per hexagon.",
          "The complications are almost all about the loop's dynamics rather than its economics. Set the multiplier from an instantaneous reading and it oscillates: price spikes, drivers converge, price collapses before most arrive, drivers leave, price spikes again. Any control loop with delayed feedback does this if you do not damp it, and the delay here is however long it takes a driver to physically drive somewhere.",
          "Cell size is a genuine tension. Small cells give precise pricing and noisy estimates, because a handful of requests in a small area is not much of a signal. Large cells give stable estimates and price people incorrectly, because the busy corner and the quiet street two hundred metres away get the same number. H3's resolutions let this be tuned rather than argued about, and the answer is usually different for a dense city centre and a suburb.",
          "There is also a boundary problem that is entirely artificial and very visible: two riders standing next to each other on opposite sides of a cell boundary should not see very different prices. Smoothing across neighbouring cells is what keeps the abstraction from leaking into someone's fare, and hexagons help precisely because 'neighbouring' is unambiguous.",
        ],
        why: "The lesson is that any feedback loop acting on a system with delay needs damping, and that the delay is usually physical and irreducible. The instinct to react quickly to the newest reading produces oscillation, and oscillation in a pricing system is far more damaging than being slightly slow, because customers experience it as arbitrary.",
        inPractice:
          "Autoscaling is the same loop with the same failure. Scale on an instantaneous CPU reading and instances are added, load drops, instances are removed before the added ones were warm, and the cycle repeats. The fixes are the same: average over a window, add hysteresis, and cool down between changes.",
        diagram: {
          caption: "Measure per cell, damp the response, smooth the boundaries",
          columns: [
            [
              { id: "dem", label: "Open requests", sub: "per hexagon", kind: "data" },
              { id: "sup", label: "Available drivers", sub: "per hexagon", kind: "data" },
            ],
            [{ id: "ratio", label: "Imbalance", sub: "smoothed over time", kind: "service" }],
            [{ id: "smooth", label: "Neighbour smoothing", sub: "no cliff at borders", kind: "service" }],
            [{ id: "mult", label: "Multiplier", sub: "per hexagon", kind: "data" }],
            [
              { id: "riders", label: "Riders", sub: "some defer", kind: "client" },
              { id: "drivers", label: "Drivers", sub: "some relocate", kind: "client" },
            ],
          ],
          edges: [
            { from: "dem", to: "ratio" },
            { from: "sup", to: "ratio" },
            { from: "ratio", to: "smooth" },
            { from: "smooth", to: "mult" },
            { from: "mult", to: "riders" },
            { from: "mult", to: "drivers" },
            { from: "drivers", to: "sup", label: "supply responds, slowly", async: true },
          ],
        },
        check: {
          prompt: "Why must a surge multiplier be damped rather than set from the latest reading?",
          options: [
            "Frequent price changes are more expensive to distribute to every client",
            "Supply responds with a physical delay, so an undamped loop oscillates",
            "Riders cannot perceive price changes that happen faster than a few minutes",
            "Instantaneous readings are unavailable, so an average is the only option",
          ],
          correctIndex: 1,
          explain:
            "Drivers take minutes to arrive. Reacting to the newest reading raises the price, pulls in supply that has not landed yet, collapses the price before it does, and starts again. Delayed feedback without damping oscillates, every time.",
        },
        checks: [
          {
            prompt: "What is the trade-off in choosing a smaller hexagon resolution for surge?",
            options: [
              "Smaller cells price more precisely but produce noisier and less reliable estimates",
              "Smaller cells cost more to store, since the index grows with the cell count",
              "Smaller cells cannot be smoothed, because their neighbours change too often",
              "Smaller cells are less accurate at high latitudes because of grid distortion",
            ],
            correctIndex: 0,
            explain:
              "A handful of requests in a small area is a weak signal, so precision buys noise. Larger cells give a stable number that is wrong for parts of the area. Resolution is the dial between the two, and the right setting differs between a city centre and a suburb.",
          },
        ],
      },

      {
        id: "uber-trip-state",
        title: "The trip as a state machine, and why that matters",
        level: "advanced",
        body: [
          "A trip is a long-lived object that moves through defined states: requested, matched, driver en route, arrived, in progress, completed, paid. Or cancelled, from most of them. Modelling it explicitly as a state machine rather than as a row with a handful of booleans is one of those decisions that looks like bureaucracy until the first time it saves you.",
          "The reason is that the transitions are where all the rules live, and the rules are unintuitive. A rider can cancel before pickup, sometimes with a fee. A driver can cancel, which returns the request to dispatch rather than ending the trip. A trip can complete without payment succeeding, and that is a normal case rather than an error. With booleans, each of these becomes a condition scattered across the codebase, and the set of reachable combinations quietly becomes unknowable.",
          "Every state change is also a message to several other systems: the rider app, the driver app, pricing, the receipt, driver earnings, fraud checks. Doing that synchronously would make the trip's write path depend on all of them being healthy, so the durable transition is recorded first and the notifications follow from it. Consumers are idempotent because at-least-once delivery means duplicates are certain rather than possible.",
          "The genuinely hard part is that the phone is unreliable, and the trip is happening in the physical world regardless. A driver goes through a tunnel mid-trip and comes out with events queued up, possibly arriving out of order. The state machine has to reject impossible transitions rather than trust the order things arrive in: a 'trip started' message for a trip already completed is not a state change, it is a late duplicate, and the only safe response is to ignore it.",
        ],
        why: "The value of an explicit state machine is that illegal states become unrepresentable rather than merely unlikely. With booleans, cancelled and completed can both be true and nothing stops it; with states, the transition simply is not defined, and a late or duplicated event is rejected by the model rather than by a condition somebody remembered to write.",
        inPractice:
          "Any entity with a lifecycle benefits: orders, subscriptions, onboarding, document review. The test for whether you need one is whether you have ever written a condition like this flag but not that one, which is a state machine that has escaped and is living in your if statements.",
        diagram: {
          caption: "Record the transition, then tell everyone about it",
          columns: [
            [{ id: "apps", label: "Rider and driver apps", sub: "unreliable network", kind: "client" }],
            [{ id: "trip", label: "Trip service", sub: "validates transitions", kind: "service" }],
            [{ id: "store", label: "Trip store", sub: "state, durable", kind: "data" }],
            [{ id: "bus", label: "Event stream", sub: "at least once", kind: "queue" }],
            [
              { id: "pay", label: "Payments", kind: "service" },
              { id: "earn", label: "Driver earnings", kind: "service" },
              { id: "notify", label: "Notifications", kind: "service" },
            ],
          ],
          edges: [
            { from: "apps", to: "trip", label: "events, possibly late" },
            { from: "trip", to: "store", label: "valid transitions only" },
            { from: "store", to: "bus", label: "emitted after commit", async: true },
            { from: "bus", to: "pay", async: true },
            { from: "bus", to: "earn", async: true },
            { from: "bus", to: "notify", async: true },
          ],
        },
        check: {
          prompt: "A phone comes out of a tunnel and sends 'trip started' for a trip already completed. What should happen?",
          options: [
            "Reject it, because the transition is not defined from the completed state",
            "Apply it, because the device is the authority on what physically happened",
            "Queue it until a matching completion event arrives to pair it with",
            "Apply it and immediately re-complete the trip to restore the correct state",
          ],
          correctIndex: 0,
          explain:
            "Arrival order says nothing about event order on an unreliable network. A state machine that only permits defined transitions rejects the late duplicate by construction, rather than relying on someone having written the right condition.",
        },
        checks: [
          {
            prompt: "Why emit the trip events after committing the state change rather than during it?",
            options: [
              "Emitting first would make the events arrive before consumers are ready for them",
              "Otherwise the write path depends on every consumer being healthy at that moment",
              "The event stream cannot accept writes inside a database transaction",
              "It guarantees exactly-once delivery, which is impossible the other way round",
            ],
            correctIndex: 1,
            explain:
              "Notifying pricing, receipts, earnings and fraud synchronously means a trip cannot progress unless all of them are up. Commit the transition, then publish, and let consumers be idempotent because at-least-once delivery makes duplicates certain.",
          },
          {
            prompt: "What is the concrete argument against modelling trip status as several boolean flags?",
            options: [
              "Booleans use more storage than a single enumerated status column would",
              "Combinations that should be impossible become representable and eventually occur",
              "Boolean columns cannot be indexed efficiently for the queries dispatch needs",
              "Flags cannot be replicated consistently between regions during a failover",
            ],
            correctIndex: 1,
            explain:
              "With flags, cancelled and completed can both be true and nothing in the model prevents it, so correctness depends on conditions scattered through the code. With explicit states the transition is undefined, and the illegal combination cannot be reached.",
          },
        ],
      },

      {
        id: "uber-sharding",
        title: "Sharding by city, and what breaks at the edges",
        level: "advanced",
        body: [
          "Trips are overwhelmingly local. A rider in Manchester is matched with a driver in Manchester, priced by Manchester's supply and demand, and paid in pounds. That locality is a gift, because it means the data can be partitioned geographically and almost every query stays inside one partition.",
          "Sharding by city therefore gives near-linear scaling for the common case. Each shard holds its own trips, its own driver index, its own surge state, and a busy Friday in one city does not consume capacity in another. It also gives a natural failure boundary: a shard problem is a city problem, not a company problem.",
          "The edges are where it gets interesting, and they are real rather than theoretical. A trip from one city to a neighbouring one crosses a boundary. Airports sit outside city limits and serve several. Cities grow, and a shard that was comfortable becomes hot. Some things are genuinely global and cannot be sharded at all: a rider's account, their payment methods, their lifetime history, and any fraud signal worth having, since fraud that is invisible within one city is often obvious across several.",
          "The practical answer is not one scheme but two. Geographic sharding for the operational data, which is local and high volume, and a separate globally-scoped store for identity and money, which is low volume and must be correct everywhere. Trying to force both into one partitioning scheme is how you end up with cross-shard transactions in the hot path.",
        ],
        why: "The lesson is to shard by the boundary that the workload already has, and to accept that some data will not fit it. The mistake is not having two schemes; it is pretending one scheme covers everything and discovering the exceptions in production, when a query that was supposed to be local turns out to fan out across every shard.",
        inPractice:
          "A tenant-per-shard SaaS has exactly this shape, and exactly this exception: tenant data shards cleanly, and then billing, authentication and cross-tenant reporting do not. Deciding that up front is much cheaper than discovering it when the reporting query starts timing out.",
        diagram: {
          caption: "Local data shards by city, global data does not shard at all",
          columns: [
            [{ id: "req", label: "Request", sub: "carries a city", kind: "client" }],
            [{ id: "route", label: "Routing layer", sub: "picks the shard", kind: "edge" }],
            [
              { id: "s1", label: "City shard A", sub: "trips, index, surge", kind: "data" },
              { id: "s2", label: "City shard B", sub: "trips, index, surge", kind: "data" },
            ],
            [
              { id: "acct", label: "Accounts", sub: "global", kind: "data" },
              { id: "pay", label: "Payment methods", sub: "global", kind: "data" },
              { id: "fraud", label: "Fraud signals", sub: "global by necessity", kind: "service" },
            ],
          ],
          edges: [
            { from: "req", to: "route" },
            { from: "route", to: "s1" },
            { from: "route", to: "s2" },
            { from: "s1", to: "acct", label: "identity lookup" },
            { from: "s2", to: "acct", label: "identity lookup" },
            { from: "s1", to: "fraud", async: true },
            { from: "s2", to: "fraud", async: true },
          ],
        },
        check: {
          prompt: "Why does sharding by city work well for trips but not for accounts?",
          options: [
            "Account records are larger, so they do not fit within a single shard's storage",
            "Trips are local by nature; an account follows a person across every city",
            "Accounts change more often than trips, so they need a different storage engine",
            "City shards cannot enforce the uniqueness constraints an account table requires",
          ],
          correctIndex: 1,
          explain:
            "Shard by the boundary the workload already has. Trips have one, because a trip happens in a place. A person does not, so pinning their account to a city makes every trip they take elsewhere a cross-shard query.",
        },
        checks: [
          {
            prompt: "Why is fraud detection one of the things that cannot be sharded geographically?",
            options: [
              "Fraud models are too large to replicate into every city shard efficiently",
              "The patterns worth catching are the ones visible across cities, not within one",
              "Fraud data must be retained longer than city shards keep trip history",
              "Regulators require fraud signals to be stored in a single jurisdiction",
            ],
            correctIndex: 1,
            explain:
              "An account behaving unremarkably in five cities can be obviously fraudulent when the five are seen together. Sharding by city hides exactly the correlation the detection depends on.",
          },
        ],
      },

      {
        id: "uber-payments",
        title: "Payments: money is the part you cannot retry casually",
        level: "advanced",
        body: [
          "Everything up to this point tolerates approximation. A slightly worse match, a surge multiplier that is a little stale, a location a second out of date: all survivable. Payments do not work that way, because charging a rider twice is not a degraded experience, it is a defect they will remember and tell people about.",
          "The mechanism that makes this safe is the idempotency key. The client generates a key for the payment attempt and sends it with the request. If the response is lost to a timeout and the client retries with the same key, the payment service recognises it and returns the original outcome rather than charging again. This matters because a timeout is genuinely ambiguous: the caller cannot distinguish a request that never arrived from one that succeeded and whose response was lost, and without a key the only options are to risk a double charge or to risk not charging at all.",
          "Payment is also not one operation. A card is authorised at the start of a trip, the final amount is not known until it ends, and capture happens afterwards for an amount that may differ. Any of those steps can fail independently. The driver's earnings are a separate flow again, on a different schedule, through a different rail, and a trip can legitimately be complete, paid by the rider, and not yet paid out to the driver.",
          "So the money is modelled as a ledger rather than as a balance field. Every movement is an immutable entry, and the balance is derived by summing them. This is slower to read and it is what makes the system auditable: you can answer why a number is what it is, and a mistake is corrected by writing a compensating entry rather than by overwriting history and destroying the evidence.",
        ],
        why: "The principle is that any operation with an external side effect needs a key that makes retries safe, because the network guarantees you will retry in an ambiguous state eventually. The second principle is that append-only beats mutable for anything you may have to explain later, and money is the canonical example of something you will have to explain.",
        inPractice:
          "This is directly the pattern behind an idempotent POST endpoint: accept a client-supplied key, store the outcome against it, and return the stored outcome on a repeat. It is worth doing for any request that sends an email, charges a card, or provisions something, all of which are unpleasant to do twice.",
        diagram: {
          caption: "Authorise, capture, pay out. Each retryable, none repeatable.",
          columns: [
            [{ id: "trip", label: "Trip completed", kind: "service" }],
            [{ id: "pay", label: "Payment service", sub: "idempotency keys", kind: "service" }],
            [
              { id: "psp", label: "Card processor", sub: "external", kind: "external" },
              { id: "ledger", label: "Ledger", sub: "append only", kind: "data" },
            ],
            [{ id: "payout", label: "Driver payout", sub: "separate schedule", kind: "service" }],
            [{ id: "bank", label: "Banking rail", sub: "external", kind: "external" }],
          ],
          edges: [
            { from: "trip", to: "pay", label: "final amount" },
            { from: "pay", to: "psp", label: "capture, with key" },
            { from: "pay", to: "ledger", label: "entry per movement" },
            { from: "ledger", to: "payout", async: true },
            { from: "payout", to: "bank", label: "with key", async: true },
          ],
        },
        check: {
          prompt: "A payment request times out with no response. Why does an idempotency key resolve this?",
          options: [
            "It lets the client retry safely, because a repeat returns the original outcome",
            "It causes the processor to roll back any charge that was partially applied",
            "It proves the request originated from the client and not from a replay attack",
            "It allows the payment to be queued and retried automatically by the processor",
          ],
          correctIndex: 0,
          explain:
            "A timeout is ambiguous: the request may never have arrived, or may have succeeded with the response lost. The key removes the ambiguity by making the retry return whatever happened the first time, so the caller can retry without risking a second charge.",
        },
        checks: [
          {
            prompt: "Why model money as an append-only ledger rather than a mutable balance?",
            options: [
              "Appending is faster than updating a row under concurrent write load",
              "Every movement stays explainable, and errors are fixed by compensating entries",
              "Ledgers can be sharded by city whereas balances cannot be partitioned",
              "It avoids the need for transactions, since appends never conflict with each other",
            ],
            correctIndex: 1,
            explain:
              "A balance field tells you the number and nothing about how it got there. A ledger lets you answer why, which is the question that always eventually arrives, and it is corrected by writing a correction rather than by overwriting the evidence.",
          },
          {
            prompt: "Why is authorisation separated from capture rather than charging once at the end?",
            options: [
              "The card is validated before the trip, and the amount is unknown until it ends",
              "Card processors charge a lower fee for authorisations than for direct charges",
              "It lets the rider switch payment method mid-trip without the charge failing",
              "Capture must occur in a different region from authorisation for redundancy",
            ],
            correctIndex: 0,
            explain:
              "You want to know the card works before providing the service, and you cannot know the amount until the trip is over. Splitting the two gives you an early check and a late, accurate amount, at the cost of a second step that can fail on its own.",
          },
        ],
      },

      {
        id: "uber-realtime",
        title: "Keeping millions of connections open",
        level: "intermediate",
        body: [
          "Both apps need a live channel. The driver app reports location continuously; the rider app wants the car moving on the map without polling for it. That means long-lived connections at very large numbers, which is a different engineering problem from serving requests.",
          "The first consequence is that connections cost memory whether or not they are doing anything. A thread-per-connection server runs out of memory long before it runs out of processor, which is why gateways in this shape are built on asynchronous non-blocking I/O, where an idle connection is a small object rather than a stack.",
          "The second is that connection state has to live somewhere, because a driver's connection lands on one gateway instance and a message for that driver may arrive at another. Something has to know where each connection is, which is a registry with all the usual problems: it must be fast to read, it changes constantly as mobile clients reconnect, and it is wrong the moment a client silently disappears.",
          "The third is that mobile networks drop connections constantly, so reconnection is the normal case rather than the exception. Clients need backoff so a network blip does not become a reconnection storm, and jitter so every client that dropped together does not come back in lockstep and do it again.",
          "It is also worth being honest that not everything needs this. Location updates do, and a receipt does not. Sending everything down a live channel because you built one is a common and expensive mistake, since it makes the connection layer part of the critical path for things that were happily asynchronous.",
        ],
        why: "The core insight is that connections are state, and state at that scale is the constraint. Every design decision follows from it: asynchronous I/O because idle connections must be cheap, a registry because the state is distributed, backoff and jitter because reconnection is constant and correlated. Treating a live channel as free is how a system that works at ten thousand connections fails at a million.",
        inPractice:
          "The reconnection detail is the one most often skipped and most damaging. If clients reconnect immediately on failure, a brief gateway restart becomes a self-sustaining storm, because everything that dropped together retries together. Exponential backoff with jitter is not a nicety; it is what stops a recoverable blip becoming an outage.",
        diagram: {
          caption: "Connections are state, and the state has to be findable",
          columns: [
            [
              { id: "d", label: "Driver apps", sub: "millions, live", kind: "client" },
              { id: "r", label: "Rider apps", sub: "live during a trip", kind: "client" },
            ],
            [
              { id: "gw1", label: "Gateway 1", sub: "async I/O", kind: "edge" },
              { id: "gw2", label: "Gateway 2", sub: "async I/O", kind: "edge" },
            ],
            [{ id: "reg", label: "Connection registry", sub: "who is where", kind: "data" }],
            [{ id: "svc", label: "Trip and dispatch", sub: "sends messages", kind: "service" }],
          ],
          edges: [
            { from: "d", to: "gw1", label: "persistent" },
            { from: "r", to: "gw2", label: "persistent" },
            { from: "gw1", to: "reg", label: "registers" },
            { from: "gw2", to: "reg", label: "registers" },
            { from: "svc", to: "reg", label: "where is this driver" },
            { from: "svc", to: "gw1", label: "deliver" },
          ],
        },
        check: {
          prompt: "Why do gateways holding millions of connections use asynchronous non-blocking I/O?",
          options: [
            "It reduces the number of network packets each connection needs to send",
            "Idle connections cost a small object rather than a thread and its stack",
            "Asynchronous I/O is the only model that supports persistent connections",
            "It allows a single connection to be shared between several clients at once",
          ],
          correctIndex: 1,
          explain:
            "Connections cost memory whether or not they are active. A thread per connection exhausts memory long before the processor is busy, so the constraint is how cheap an idle connection can be made.",
        },
        checks: [
          {
            prompt: "Why do reconnecting clients need backoff with jitter rather than immediate retry?",
            options: [
              "Immediate retries are rejected by most mobile networks as abusive traffic",
              "Everything that dropped together returns together, turning a blip into a storm",
              "Jitter is required to keep the connection registry entries unique per client",
              "Backoff allows the gateway to finish replaying messages missed while offline",
            ],
            correctIndex: 1,
            explain:
              "A gateway restart drops its connections simultaneously, so synchronised retries arrive as one spike that knocks it over again. Backoff spreads the load over time and jitter breaks the synchronisation that caused the spike.",
          },
        ],
      },

      {
        id: "uber-data",
        title: "The data platform: the same events, twice",
        level: "intermediate",
        body: [
          "Every location ping, trip transition, price calculation and payment produces events, and there are two very different consumers of them. The operational side needs them in seconds: dispatch needs current supply, surge needs current demand, the rider needs the car moving on the map. The analytical side needs them completely and correctly, but can wait: finance, forecasting, model training, regulatory reporting.",
          "These requirements conflict enough that trying to serve both from one system serves neither well. The fast path optimises for latency and accepts approximation, because a supply count that is a second stale is fine. The slow path optimises for completeness and accepts latency, because a revenue figure that is missing a percent is not fine at all.",
          "So the same event stream feeds both. A streaming layer maintains the aggregates dispatch and pricing read, in memory, updated continuously, deliberately approximate. A batch layer writes everything to durable storage and recomputes properly on a schedule, with late-arriving events folded in.",
          "That last detail is the one worth remembering. Events arrive late, sometimes hours late, from a phone that was in a tunnel or a basement. The fast path has already moved on and cannot incorporate them; the batch path can, because it recomputes over a window rather than incrementing a counter. This is exactly why the batch numbers and the real-time numbers disagree, and why the batch ones are the ones finance uses.",
        ],
        why: "The general rule is that latency and completeness are different requirements, and a single pipeline forces one to be sacrificed. Serving both from the same stream, with different guarantees and an explicit understanding of which is authoritative, is cheaper and more honest than making the real-time system pretend to be exact.",
        inPractice:
          "The practical version is knowing which number is authoritative before anyone asks. A dashboard reading from the streaming layer and a report reading from the warehouse will disagree, and the correct response is not to reconcile them but to label them: one is current, the other is correct.",
        diagram: {
          caption: "One stream, two paths, different guarantees",
          columns: [
            [{ id: "apps", label: "Apps and services", sub: "events", kind: "client" }],
            [{ id: "bus", label: "Event stream", sub: "durable log", kind: "queue" }],
            [
              { id: "fast", label: "Streaming layer", sub: "seconds, approximate", kind: "service" },
              { id: "batch", label: "Batch layer", sub: "hours, complete", kind: "service" },
            ],
            [
              { id: "ops", label: "Dispatch and surge", sub: "reads current", kind: "service" },
              { id: "wh", label: "Warehouse", sub: "reads correct", kind: "data" },
            ],
          ],
          edges: [
            { from: "apps", to: "bus" },
            { from: "bus", to: "fast", label: "continuous" },
            { from: "bus", to: "batch", label: "replayable", async: true },
            { from: "fast", to: "ops" },
            { from: "batch", to: "wh", label: "late events included", async: true },
          ],
        },
        check: {
          prompt: "Why run a streaming layer and a batch layer over the same events?",
          options: [
            "The batch layer serves as a backup in case the streaming layer loses data",
            "Latency and completeness are different requirements that one pipeline cannot both meet",
            "Streaming systems cannot write to durable storage without a batch intermediary",
            "Batch processing is cheaper, so it handles the majority of the overall volume",
          ],
          correctIndex: 1,
          explain:
            "Dispatch needs a number now and can tolerate approximation. Finance needs a number that is right and can wait. Forcing both through one pipeline means giving up one of the two, so the same stream feeds two paths with different guarantees.",
        },
        checks: [
          {
            prompt: "Why can the batch layer incorporate a location event that arrives two hours late when the streaming layer cannot?",
            options: [
              "Batch storage retains events for longer than the streaming layer buffers them",
              "It recomputes over a window rather than incrementing a counter that has moved on",
              "Late events are routed only to the batch layer and never reach the stream",
              "The streaming layer discards events that fail its ordering checks on arrival",
            ],
            correctIndex: 1,
            explain:
              "An incremental counter has already produced its answer and moved past that window. A batch job reads the window again, sees the late event, and produces a corrected result. This is exactly why the two disagree and why the batch figure is the one finance uses.",
          },
        ],
      },
    ],
  },

  {
    id: "twitter-feed",
    title: "Twitter and the feed",
    summary:
      "Fan-out on write against read, the celebrity problem, ranking, and the graph underneath it all.",
    track: "case-study",
    topics: [
      {
        id: "fanout",
        title: "Fan-out on write against fan-out on read",
        level: "intermediate",
        body: [
          "A home timeline is the union of everything the accounts you follow have posted, most recent first. There are exactly two places that union can be computed, and the entire design follows from which one you pick.",
          "Fan-out on read computes it when the timeline is requested: look up who this person follows, fetch recent posts from each, merge, sort. Writing is trivial, a single row. Reading is expensive and gets worse the more accounts someone follows, and it happens far more often than writing.",
          "Fan-out on write does the work at post time: when someone posts, push the post's identifier into a precomputed list for every follower. Reading becomes a single lookup of an already-assembled list, which is exactly what you want for the operation that dominates. The cost is that one post becomes as many writes as the author has followers.",
          "The ratio decides it. Timelines are read vastly more often than posts are written, so paying at write time to make reads cheap is the right trade for almost everyone. Twitter maintains materialised timelines of roughly the most recent 800 post identifiers per user, held in a Redis-derived store where pushing to the head and trimming the tail are both cheap operations, which is precisely the access pattern fan-out needs.",
          "Note what is stored: identifiers, not posts. Eight hundred identifiers per user is a manageable amount of memory; eight hundred full posts per user, duplicated across every follower, would not be. The timeline is an index into the posts, and the posts themselves are fetched and cached separately.",
        ],
        why: "The choice is not about which is faster in the abstract, it is about which operation is more frequent. Precomputing at write time is right when reads dominate, and it inverts the moment writes dominate. The question to ask of any denormalisation is the read-to-write ratio, and if you do not know it, you are not yet in a position to choose.",
        inPractice:
          "This is the same decision as a materialised view against a query, or a denormalised counter against a count. Precompute when reads dominate, compute on demand when they do not, and keep in mind that the ratio can change under you as a product grows.",
        diagram: {
          caption: "Pay at write time so the read is one lookup",
          columns: [
            [{ id: "author", label: "Author posts", kind: "client" }],
            [{ id: "svc", label: "Post service", sub: "stores once", kind: "service" }],
            [
              { id: "posts", label: "Post store", sub: "the content", kind: "data" },
              { id: "fan", label: "Fan-out worker", sub: "reads the follower list", kind: "queue" },
            ],
            [{ id: "tl", label: "Timeline store", sub: "800 ids per user", kind: "data" }],
            [{ id: "reader", label: "Reader", sub: "one lookup", kind: "client" }],
          ],
          edges: [
            { from: "author", to: "svc" },
            { from: "svc", to: "posts", label: "one write" },
            { from: "svc", to: "fan", async: true },
            { from: "fan", to: "tl", label: "one push per follower", async: true },
            { from: "tl", to: "reader", label: "ids" },
            { from: "posts", to: "reader", label: "hydrate" },
          ],
        },
        check: {
          prompt: "Why does fan-out on write suit a timeline despite costing far more writes?",
          options: [
            "Writes are cheaper than reads in most storage engines used for feeds",
            "Timelines are read far more often than written, so reads should be cheap",
            "It removes the need to store the follower graph in a queryable form",
            "Precomputed timelines can be replicated more efficiently between regions",
          ],
          correctIndex: 1,
          explain:
            "It is a ratio argument. Paying once at write to make every subsequent read a single lookup wins when reads dominate, and it stops winning the moment they do not.",
        },
        checks: [
          {
            prompt: "Why store post identifiers in the timeline rather than the posts themselves?",
            options: [
              "Identifiers can be sorted by time whereas post bodies cannot be ordered",
              "Duplicating full posts across every follower's timeline would not fit in memory",
              "Post bodies change after publication, so only identifiers remain stable",
              "It allows the timeline to be rebuilt without reading the post store at all",
            ],
            correctIndex: 1,
            explain:
              "The timeline is an index, not a copy. Eight hundred identifiers per user is affordable; eight hundred full posts per user, duplicated across every follower of every author, is not.",
          },
          {
            prompt: "Under what condition does fan-out on read become the better choice?",
            options: [
              "When the follower graph changes frequently enough to invalidate timelines",
              "When writes are frequent relative to reads, so precomputed work goes unused",
              "When timelines must be strictly ordered rather than approximately ordered",
              "When storage is more constrained than the available processing capacity",
            ],
            correctIndex: 1,
            explain:
              "Precomputation only pays if the result is read. An account posting constantly to followers who rarely open the app is doing enormous work for timelines nobody looks at, and computing on demand is then strictly cheaper.",
          },
        ],
      },

      {
        id: "celebrity-problem",
        title: "The celebrity problem, and the hybrid that solves it",
        level: "advanced",
        body: [
          "Fan-out on write has one failure mode and it is severe. An account with fifty million followers posts once, and that single action becomes fifty million writes. Post ten times in a day and it is five hundred million. The work is unbounded in the follower count, and a handful of accounts can saturate the infrastructure that everyone else depends on.",
          "Worse, it is bursty in exactly the wrong way. Popular accounts post at moments of high general activity, so the fan-out spike lands while read traffic is also peaking. A queue absorbs some of it, but a large enough fan-out delays every other user's timeline behind it.",
          "The answer is a hybrid, and it is what Twitter, Instagram and Facebook all independently arrived at. Ordinary accounts fan out on write, because their follower counts are small and the cost is trivial. Accounts above a threshold, commonly cited around ten thousand followers, do not fan out at all. Their posts are fetched at read time instead.",
          "So a timeline read does two things and merges them: fetch the precomputed list, and separately fetch recent posts from the small number of large accounts this person follows. Merge by time, return the top slice. The pull side is bounded because nobody follows very many celebrities, and the push side is bounded because ordinary accounts have few followers. Each strategy is applied exactly where its cost is small.",
          "The threshold itself is an operational dial rather than a principle. Too low and too many accounts are pulled, making every read do more work. Too high and the write spikes return. It also creates a boundary that has to be handled: an account crossing the threshold needs its existing followers' timelines to stay coherent while the strategy changes underneath them.",
        ],
        why: "The generalisable idea is that a strategy which is optimal on average can be catastrophic in the tail, and the fix is usually not a better single strategy but a different one for the tail. Identifying that your distribution has a heavy tail, and treating it separately, is often the entire architectural insight.",
        inPractice:
          "The same shape appears wherever a distribution is skewed: a cache that works for most keys and is destroyed by a few hot ones, a sharding scheme where one tenant is a thousand times larger than the rest, a batch job whose runtime is set by its largest partition. Look for the tail first, because that is where the design will fail.",
        diagram: {
          caption: "Push for the many, pull for the few, merge at read",
          columns: [
            [
              { id: "normal", label: "Ordinary account", sub: "few followers", kind: "client" },
              { id: "celeb", label: "Large account", sub: "millions", kind: "client" },
            ],
            [
              { id: "fan", label: "Fan-out worker", sub: "push path", kind: "queue" },
              { id: "hot", label: "Recent posts", sub: "pull path", kind: "data" },
            ],
            [{ id: "tl", label: "Materialised timeline", sub: "ids per user", kind: "data" }],
            [{ id: "merge", label: "Merge at read", sub: "sort by time", kind: "service" }],
            [{ id: "reader", label: "Reader", kind: "client" }],
          ],
          edges: [
            { from: "normal", to: "fan", label: "fan out on write" },
            { from: "fan", to: "tl", async: true },
            { from: "celeb", to: "hot", label: "no fan-out" },
            { from: "tl", to: "merge" },
            { from: "hot", to: "merge", label: "fetched per read" },
            { from: "merge", to: "reader" },
          ],
        },
        check: {
          prompt: "Why are large accounts exempted from fan-out on write?",
          options: [
            "Their posts are more likely to be edited, invalidating precomputed timelines",
            "One post becomes millions of writes, which can saturate shared infrastructure",
            "Their followers are more active and would read stale timelines regardless",
            "Precomputed timelines cannot hold posts from accounts above a size threshold",
          ],
          correctIndex: 1,
          explain:
            "The work is unbounded in follower count. Fifty million followers means fifty million writes for a single post, arriving in a burst that delays everyone else's timelines behind it.",
        },
        checks: [
          {
            prompt: "Why is the pull side of the hybrid bounded in cost?",
            options: [
              "Large accounts post less frequently than ordinary accounts do",
              "Nobody follows very many large accounts, so few must be fetched per read",
              "Pulled posts are cached globally, so most reads never reach the store",
              "The merge step limits how many pulled posts can enter a timeline",
            ],
            correctIndex: 1,
            explain:
              "A person might follow a thousand accounts and perhaps a dozen very large ones. Fetching a dozen recent-post lists at read time is cheap, which is exactly why the strategy can be inverted for them.",
          },
          {
            prompt: "What is the risk in setting the celebrity threshold too low?",
            options: [
              "Too many accounts are pulled, so every timeline read does more work",
              "Ordinary accounts lose their precomputed timelines and must rebuild them",
              "The merge step cannot order posts correctly across too many sources",
              "Follower counts near the threshold would oscillate between strategies",
            ],
            correctIndex: 0,
            explain:
              "Every account moved to the pull side is another list to fetch and merge on every read by every follower. The threshold trades write spikes against read cost, and both directions have a real failure mode.",
          },
        ],
      },

      {
        id: "timeline-ranking",
        title: "Ranking: when the timeline stops being chronological",
        level: "advanced",
        body: [
          "A reverse-chronological timeline is simple, predictable, and increasingly useless as the number of accounts someone follows grows. Follow two thousand accounts and the last hour contains more posts than anyone will read, so the question shifts from what is newest to what is worth showing.",
          "Ranking changes the shape of the system in a way that is easy to underestimate. Chronological order can be maintained incrementally: a new post goes at the head, and nothing else moves. A ranked order can change for a post that already exists, because it gained engagement, or because the reader's interests shifted, or because the model was retrained. The timeline is no longer an append-only list.",
          "The usual resolution is to keep fan-out producing a candidate set in time order, then rank that candidate set at read time. Retrieval stays cheap and incremental; scoring happens on a few hundred candidates rather than everything ever posted. This is the same retrieve-then-rank shape that search engines use, and for the same reason: scoring is too expensive to apply to the full corpus.",
          "The costs are worth naming honestly. A ranked timeline is not reproducible, so two people cannot compare what they saw. Debugging becomes statistical rather than deterministic. And engagement-based ranking has a well-documented pull towards content that provokes, because provocation generates engagement, which means the objective function is a product decision with consequences rather than a technical parameter.",
        ],
        why: "The structural insight is that ranking converts an append-only problem into a scoring problem, and the way to keep it affordable is to separate retrieval from ranking. Retrieve cheaply and broadly, score expensively and narrowly. Trying to rank at retrieval time is what makes these systems impossible to scale.",
        inPractice:
          "Any search or recommendation surface should be built this way: a cheap recall step that over-fetches, then an expensive precision step over the shortlist. It is also the reason a naive semantic search over an entire corpus does not work, and why vector retrieval is followed by a reranker.",
        diagram: {
          caption: "Retrieve in time order, then score the shortlist",
          columns: [
            [{ id: "tl", label: "Materialised timeline", sub: "time ordered", kind: "data" }],
            [{ id: "pull", label: "Large accounts", sub: "fetched per read", kind: "data" }],
            [{ id: "cands", label: "Candidate set", sub: "a few hundred", kind: "service" }],
            [
              { id: "feat", label: "Features", sub: "engagement, affinity", kind: "data" },
              { id: "rank", label: "Ranker", sub: "scores candidates", kind: "service" },
            ],
            [{ id: "out", label: "Timeline", sub: "ordered by score", kind: "client" }],
          ],
          edges: [
            { from: "tl", to: "cands" },
            { from: "pull", to: "cands" },
            { from: "cands", to: "rank" },
            { from: "feat", to: "rank", async: true },
            { from: "rank", to: "out" },
          ],
        },
        check: {
          prompt: "Why separate retrieval from ranking rather than ranking everything?",
          options: [
            "Retrieval and ranking must run in different services for isolation reasons",
            "Scoring is too expensive to apply to the corpus, so it runs on a shortlist",
            "Ranking models cannot read from the same store that retrieval uses",
            "It allows the timeline to remain chronological if the ranker is unavailable",
          ],
          correctIndex: 1,
          explain:
            "Retrieve cheaply and broadly, score expensively and narrowly. Applying an expensive model to everything ever posted does not scale, and running it over a few hundred candidates does.",
        },
        checks: [
          {
            prompt: "What does ranking break that a chronological timeline had for free?",
            options: [
              "The ability to add a new post without recomputing anything else",
              "The guarantee that every follower eventually sees every post",
              "The ability to store timelines as identifiers rather than full posts",
              "The option to merge pulled and pushed sources into one list",
            ],
            correctIndex: 0,
            explain:
              "Chronological order is incremental: a new post goes at the head and nothing else moves. A ranked order can change for posts that already exist, because engagement or the model changed, so the list is no longer append-only.",
          },
        ],
      },

      {
        id: "social-graph",
        title: "The follower graph, and why it is not just a table",
        level: "intermediate",
        body: [
          "Underneath everything is a graph: who follows whom. It looks like a two-column table and behaves like nothing of the sort, because of how it is queried and how skewed it is.",
          "Both directions are needed and they are wildly asymmetric. Fan-out asks for an account's followers, which for a large account is tens of millions of rows and is read on every post. A timeline asks who someone follows, which is usually hundreds. Storing one relationship and deriving the other means one of these queries is always expensive, so both directions are typically materialised and kept consistent.",
          "The distribution is the real problem. Most accounts have a handful of followers, and a few have tens of millions. A single row's worth of relationship for one account and a hundred million for another cannot sit comfortably in the same partitioning scheme: shard by account and the shard holding a very large account is enormously hotter than its neighbours.",
          "The graph also mutates constantly, and each mutation has consequences. A follow means the new follower's timeline is missing that account's history, so either it is backfilled or their timeline is simply thin until new posts arrive. An unfollow means existing entries are now wrong. Blocks and mutes add filtering that must be applied at read time, because applying them at write time would mean rewriting timelines whenever a block changes.",
          "That last point is a useful general lesson. Some things must be evaluated at read time, not because it is cheaper but because the alternative is a rewrite of everything already written.",
        ],
        why: "The recurring theme is that a heavily skewed distribution defeats a uniform strategy. Uniform sharding assumes roughly equal partitions; a follower graph provides nothing of the sort. Recognising skew early and planning for the tail is what separates a design that scales from one that works in testing and falls over on the account that matters.",
        inPractice:
          "Any many-to-many relationship queried from both ends has this shape: tags on items, memberships in groups, permissions on resources. Ask early which direction is read most, whether the distribution is skewed, and what happens to already-written data when a relationship is removed.",
        diagram: {
          caption: "Both directions materialised, filters applied at read",
          columns: [
            [{ id: "edge", label: "Follow or unfollow", kind: "client" }],
            [{ id: "graph", label: "Graph service", sub: "writes both directions", kind: "service" }],
            [
              { id: "fwd", label: "Following", sub: "who I follow", kind: "data" },
              { id: "rev", label: "Followers", sub: "who follows me", kind: "data" },
            ],
            [
              { id: "fan", label: "Fan-out", sub: "reads followers", kind: "queue" },
              { id: "read", label: "Timeline read", sub: "reads following", kind: "service" },
            ],
            [{ id: "filter", label: "Blocks and mutes", sub: "applied at read", kind: "service" }],
          ],
          edges: [
            { from: "edge", to: "graph" },
            { from: "graph", to: "fwd" },
            { from: "graph", to: "rev" },
            { from: "rev", to: "fan", label: "millions for a large account" },
            { from: "fwd", to: "read", label: "hundreds" },
            { from: "filter", to: "read", label: "removes entries" },
          ],
        },
        check: {
          prompt: "Why apply blocks and mutes at read time rather than when the timeline is written?",
          options: [
            "Blocks change too rarely to justify the cost of a write-time check",
            "A block would otherwise require rewriting every timeline already materialised",
            "Read-time filtering is faster than excluding entries during fan-out",
            "Write-time filtering cannot see the relationship between two accounts",
          ],
          correctIndex: 1,
          explain:
            "Timelines are already written. A block applied at write time would mean going back and editing every timeline that contains the blocked account, so the filter has to run on the way out.",
        },
        checks: [
          {
            prompt: "Why materialise both directions of the follow relationship?",
            options: [
              "Deriving either direction from the other makes one common query expensive",
              "Graph databases require both directions to be stored explicitly",
              "It allows follower counts to be computed without scanning the table",
              "Both directions are needed to detect and prevent follow loops",
            ],
            correctIndex: 0,
            explain:
              "Fan-out needs an account's followers on every post, and timeline reads need who a person follows. Store one and derive the other and you have made one of the two hot paths a scan.",
          },
        ],
      },

      {
        id: "twitter-search",
        title: "Search and trends: a different index over the same firehose",
        level: "advanced",
        body: [
          "Timelines answer what the people I follow said. Search answers who said anything about this, which is a completely different access pattern over the same data, and it needs its own index rather than a query against the post store.",
          "Real-time search has an awkward requirement: something posted seconds ago should be findable. Traditional inverted indexes are built in batches, because merging into a large index is expensive. The usual resolution is tiered: a small in-memory index absorbs the newest posts and is searched alongside larger, older segments that are rebuilt less often. Queries hit both and merge.",
          "Trends are a different problem again, and the naive version is wrong in an obvious way once stated. The most frequent terms are not trending, they are common: the same ordinary words appear constantly. What is interesting is the deviation from the expected rate for that term, at that time, in that place. A term appearing a thousand times an hour is unremarkable if it usually appears nine hundred times, and extraordinary if it usually appears twice.",
          "That framing makes trends a statistics problem rather than a counting one, and it brings the problems that come with statistics. Baselines have to be maintained per term and per region. Manipulation is a constant, since a group can coordinate to lift a term artificially. Time windows matter enormously: too short and noise dominates, too long and nothing ever looks sudden.",
        ],
        why: "The lesson is that the same underlying data usually needs several purpose-built indexes rather than one general store queried cleverly. A timeline index, a search index and a trend baseline are three different shapes over identical events, and trying to serve all three from one structure produces something that serves none of them well.",
        inPractice:
          "The trend insight generalises to alerting: alerting on absolute thresholds produces noise, because the normal level differs by service, by hour and by day. Alerting on deviation from an expected baseline is what makes an alert mean something, and it is the same computation.",
        diagram: {
          caption: "One stream, three indexes, three access patterns",
          columns: [
            [{ id: "posts", label: "Post stream", kind: "queue" }],
            [
              { id: "tl", label: "Timeline fan-out", sub: "by follower", kind: "service" },
              { id: "idx", label: "Search indexer", sub: "by term", kind: "service" },
              { id: "cnt", label: "Term counter", sub: "rate per window", kind: "service" },
            ],
            [
              { id: "hot", label: "Recent index", sub: "in memory", kind: "data" },
              { id: "cold", label: "Older segments", sub: "rebuilt in batches", kind: "data" },
              { id: "base", label: "Baselines", sub: "expected rate", kind: "data" },
            ],
            [
              { id: "search", label: "Search", sub: "queries both tiers", kind: "service" },
              { id: "trend", label: "Trends", sub: "deviation, not volume", kind: "service" },
            ],
          ],
          edges: [
            { from: "posts", to: "tl", async: true },
            { from: "posts", to: "idx", async: true },
            { from: "posts", to: "cnt", async: true },
            { from: "idx", to: "hot" },
            { from: "hot", to: "cold", label: "merged periodically", async: true },
            { from: "hot", to: "search" },
            { from: "cold", to: "search" },
            { from: "cnt", to: "base" },
            { from: "base", to: "trend", label: "compare to expected" },
          ],
        },
        check: {
          prompt: "Why are the most frequent terms not the trending ones?",
          options: [
            "Frequent terms are usually filtered out as stop words before indexing",
            "Common words are always frequent; what is interesting is deviation from normal",
            "Frequency counts lag behind real time by too much to be useful for trends",
            "Trending requires geographic distribution, which raw frequency does not capture",
          ],
          correctIndex: 1,
          explain:
            "A term appearing a thousand times an hour is unremarkable if it normally appears nine hundred, and extraordinary if it normally appears twice. Trending is a comparison against an expected rate, which makes it statistics rather than counting.",
        },
        checks: [
          {
            prompt: "Why does real-time search use a small in-memory index alongside larger older segments?",
            options: [
              "Recent posts are searched more often, so they are cached separately",
              "Merging into a large index is expensive, so new posts land in a small one first",
              "In-memory indexes support ranking operations that disk-based ones cannot",
              "It allows recent posts to be removed quickly if they are later deleted",
            ],
            correctIndex: 1,
            explain:
              "Rebuilding or merging a large inverted index for every new post is prohibitive. A small hot index absorbs the newest data and is queried alongside the older segments, which are merged on a slower schedule.",
          },
        ],
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
