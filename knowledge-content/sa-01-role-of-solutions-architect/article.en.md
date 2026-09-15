# The Role of a Solutions Architect

## 1. What a Solutions Architect actually does

A **Solutions Architect (SA)** turns a business problem into a technical solution that can be built, run and paid for — and then makes sure the people who have to build, run and pay for it understand and agree with it. The job is less "draw the boxes" and more "decide which boxes, and be able to defend why".

A typical week touches all of these:

- **Discovery** — finding the real problem, goals, constraints and what success looks like in numbers.
- **Design and trade-offs** — choosing building blocks (services, data stores, integration style, hosting) and comparing options on cost, risk, time to market and quality attributes.
- **Documentation** — diagrams and decision records that outlive the meeting.
- **Governance** — checking that what gets built still matches the design, and changing the design when reality disagrees.
- **Communication** — explaining one solution to a CFO, a security officer and developers in three different ways.

The word "solution" matters: an SA is accountable for one solution (a product, a migration, an integration) end to end, usually spanning several systems and teams. On AWS, "Solutions Architect" is also a customer-facing job title — pre-sales or partner architects who design on the customer's behalf — so in interviews be ready to say which flavour you mean.

---

## 2. SA vs software, enterprise and cloud architect

Titles overlap and every company uses them differently, but the useful distinction is **scope** — how wide the view is and how deep into the code it goes.

| Role | Scope | Main question | Typical artefacts |
|---|---|---|---|
| **Software architect** | One application or codebase | "How is this system structured inside?" | Module boundaries, patterns, code conventions, component diagrams |
| **Solutions Architect** | One solution across several systems | "Which systems, integrated how, meet these requirements?" | Solution design, C4 context/container diagrams, ADRs, estimates |
| **Enterprise architect** | The whole organisation's portfolio | "Which capabilities and platforms should the company have in 3–5 years?" | Capability maps, roadmaps, standards, frameworks such as TOGAF |
| **Cloud architect** | The cloud platform itself | "How do we run workloads in the cloud securely and cost-effectively?" | Landing zones, account/network structure, guardrails, IaC modules |

Enterprise is the widest view, software architecture the deepest, and the SA sits in between; the cloud architect owns the platform every solution lands on. An SA takes standards from the enterprise architect and guardrails from the cloud architect, and hands internal design to the software architect or tech lead. In small companies one person wears all four hats.

---

## 3. Requirements: functional, non-functional and constraints

Architecture starts from requirements, and the first skill is sorting them.

- **Functional requirements (FR)** — *what* the system does: "A customer can place an order", "Send a receipt email after payment". They describe behaviour and are usually captured as user stories or use cases.
- **Non-functional requirements (NFR)** — *how well* it does it: "p95 checkout latency under 300 ms at 2,000 requests/s", "no more than 5 minutes of data loss after a region failure". These drive the architecture far more than FRs do.
- **Constraints** — decisions already made for you, not negotiable in this project: "Must run on our existing AWS organisation", "Data of EU customers stays in the EU", "Team knows Java, not Go", "Go-live before Black Friday".
- **Assumptions** — things you believe but have not verified: "Traffic grows 20% per year". Write them down; a wrong assumption is a risk.

Two classic failures: collecting fifty FRs and zero NFRs (the system works in the demo and falls over in production), and treating a constraint as a requirement you can trade away. Almost any functional scope can be delivered by a simple monolith; it is the NFRs — scale, availability, latency, security, compliance — that force distribution, caching, replication and cost.

---

## 4. Quality attributes and making them measurable

NFRs are grouped into **quality attributes** (the "-ilities"). Common ones:

| Attribute | Question it answers | Example measure |
|---|---|---|
| Performance | How fast under load? | p95/p99 latency, throughput |
| Scalability | Can it grow by adding resources? | Max RPS before latency degrades |
| Availability | Is it up when needed? | 99.9% monthly uptime |
| Reliability / durability | Does it lose or corrupt data? | RPO, RTO |
| Security | Who can do what; is data protected? | Pen-test findings, encryption coverage |
| Maintainability | How cheap is change? | Lead time for a typical change |
| Cost efficiency | What does it cost per unit of value? | Cost per 1,000 orders |

ISO/IEC 25010 is the standard catalogue; the six pillars of AWS Well-Architected are a cloud-flavoured version.

"The system must be fast and highly available" is not a requirement — nobody can test it. Rewrite it as a **quality attribute scenario** (from the SEI):

```text
Source:            customers on mobile
Stimulus:          submit checkout
Environment:       Black Friday peak, 3,000 requests/s
Artifact:          checkout API
Response:          order accepted and confirmed
Response measure:  p95 < 400 ms, error rate < 0.1%
```

Also translate availability targets into downtime, because stakeholders feel minutes, not nines:

| Availability | Downtime per year | Downtime per 30-day month |
|---|---|---|
| 99% | ~3.65 days | ~7.2 hours |
| 99.9% | ~8.76 hours | ~43.2 minutes |
| 99.95% | ~4.38 hours | ~21.6 minutes |
| 99.99% | ~52.6 minutes | ~4.3 minutes |
| 99.999% | ~5.26 minutes | ~26 seconds |

Each extra nine usually means roughly another step up in cost and complexity (multi-AZ, then multi-region, then automated failover with no human in the loop).

---

## 5. Trade-off thinking

The first law of software architecture (Richards & Ford): **everything is a trade-off**. If you think you found an option with no downside, you have not found the downside yet. An architect's value is naming the trade-off explicitly, not pretending it away.

Recurring tensions:

| You gain | You usually pay with |
|---|---|
| Availability (replicas, multi-region) | Cost, consistency complexity |
| Strong consistency | Latency, availability during partitions |
| Microservices' independent deployability | Operational complexity, network failures, distributed data |
| Caching for performance | Staleness, invalidation bugs |
| Managed services (speed, less ops) | Less control, vendor lock-in, per-unit cost at scale |

Practical techniques:

- **Compare at least two real options** (plus "do nothing") against weighted criteria taken from the NFRs — not against personal taste.
- **Separate one-way from two-way doors.** Reversible decisions (a logging library, an instance size) should be made fast. Irreversible or expensive-to-reverse ones (primary data model, database engine for core data, public API contract, cloud provider) deserve prototypes and review.
- **Find sensitivity and trade-off points**, as the SEI's ATAM method calls them: a parameter that strongly affects one attribute (sensitivity point) or several attributes in opposite directions (trade-off point) — e.g. replication factor affects durability, write latency and cost at once.

Context decides. "Microservices are better" is never an answer; "for a 4-person team shipping an MVP in 3 months, a modular monolith on managed services, because deployability across teams is not yet a problem we have" is.

---

## 6. The architecture process: from discovery to evolution

Architecture is a loop, not a phase that ends when coding starts.

```text
 1. Understand     business drivers, stakeholders, FR/NFR, constraints
        |
 2. Explore        2-3 candidate designs, spikes/prototypes for unknowns
        |
 3. Decide         trade-off analysis -> ADR per significant decision
        |
 4. Communicate    C4 diagrams, design doc, review with stakeholders
        |
 5. Guide build    pairing with tech leads, reviews, fitness checks
        |
 6. Evolve         measure in production, revisit assumptions -> back to 1
```

What experienced SAs do in each step:

- **Understand:** ask "what happens if we do nothing?" and "how will we know this succeeded?". Get numbers: users, growth, peak, data volume, budget, deadline.
- **Explore:** time-box spikes for the riskiest unknowns (a vendor API's rate limits, a database at your write volume) instead of debating them.
- **Decide** at the right level: not class names, but integration style and data ownership.
- **Guide:** stay close to the build — an architect who vanishes after the design doc produces "ivory tower" designs the team quietly ignores.
- **Evolve:** automated **fitness functions** (a latency test in CI, a rule that fails the build if the UI calls the database directly) stop the architecture eroding.

A **design review** checklist: NFRs with numbers; options considered; failure modes (what if each dependency is slow or down?); security and data classification; cost; operability (logs, metrics, alerts, runbooks); migration and rollback plan.

---

## 7. Architecture Decision Records (ADR)

Code shows *what* was built; it almost never shows *why*. An **Architecture Decision Record** is a short document capturing one architecturally significant decision, its context and its consequences. The widely used lightweight format comes from Michael Nygard (2011).

```text
ADR-0003: Use Kafka for order events

Status:  Superseded by ADR-0004
Date:    2025-03-12

Context:
  Five downstream services need order events; two need replay of the
  last 7 days. Peak is 1,500 events/s. The team already runs Kafka
  for analytics.

Decision:
  Publish order events to a Kafka topic partitioned by order ID.

Consequences:
  + Consumers can replay; ordering is kept per order.
  - We operate brokers and must monitor consumer lag.
  - Exactly-once end to end is NOT provided; consumers must be idempotent.
```

In a real file these are Markdown headings (Title, Status, Context, Decision, Consequences); many teams add "Options considered" as well.

Rules that make ADRs useful:

- **One decision per record**, one or two pages at most.
- **Status lifecycle:** proposed → accepted → deprecated or superseded. Accepted ADRs are **immutable**: when the decision changes, write a new ADR that supersedes the old one and link both ways — *why we changed our mind* is the valuable part.
- **Consequences include the negatives** — what we gave up, which risks we accepted.
- **Store them next to the code** (e.g. `docs/adr/0003-use-kafka-for-order-events.md`) and review them in pull requests.
- Record only **architecturally significant** decisions: costly to reverse, affecting NFRs, or crossing team boundaries.

---

## 8. The C4 model: context and containers

Box-and-line diagrams usually fail because nobody knows what a box means. The **C4 model** (Simon Brown) fixes that with four levels of zoom, like a map:

| Level | Shows | Audience |
|---|---|---|
| 1. System Context | Your system as one box, its users and the external systems it talks to | Everyone, including non-technical people |
| 2. Container | The separately runnable/deployable units inside: web app, API, database, queue | Architects, developers, ops |
| 3. Component | The major components inside one container | Developers of that container |
| 4. Code | Classes/tables — usually generated by an IDE, rarely drawn by hand | Developers, if at all |

A **container** in C4 is *anything that runs or stores data separately*: a single-page app, a mobile app, a backend API, a database, a blob store, a serverless function. It predates Docker and does not mean a Docker container.

```text
LEVEL 1 - SYSTEM CONTEXT

   [Customer]                         [Support agent]
   (person)                           (person)
       |  places orders using              |  looks up orders using
       v                                   v
  +-----------------------------------------------+
  |           Online Shop (software system)       |
  +-----------------------------------------------+
       |  takes payments via        |  sends emails via
       v                            v
  [Payment provider]          [Email service]
  (external system)           (external system)
```

```text
LEVEL 2 - CONTAINERS (inside Online Shop)

 [Customer] --HTTPS--> [Web SPA: React] --JSON/HTTPS--> [Order API: Java]
                                                          |        |
                                        reads/writes SQL  |        | publishes
                                                          v        v OrderPlaced
                                              [Orders DB:     [Message queue]
                                               PostgreSQL]         |
                                                                   v
                                                   [Notification worker] --> [Email service]
```

Most solution reviews live at levels 1 and 2. On AWS, containers map naturally to things like a CloudFront + S3 SPA, an ECS service or Lambda function, an RDS database and an SQS queue — but draw the logical container first and the AWS icon second.

---

## 9. C4 in practice: components, supplementary diagrams and notation

**Level 3** zooms into one container: e.g. inside the Order API, a `CheckoutController`, a `PricingService`, a `PaymentGateway` adapter and an `OrderRepository`. Draw it only for containers that are complex or contested; it goes stale fast.

C4 also has **supplementary diagrams**:

- **System landscape** — several systems of the organisation side by side (where enterprise and solution views meet).
- **Dynamic** — numbered interactions for one scenario, e.g. "customer places an order".
- **Deployment** — how containers map onto infrastructure: regions, AZs, clusters, instances.

Notation rules that make any diagram readable:

- Every diagram has a **title** and a **key/legend**.
- Every box says **name, type and technology**: "Order API — container — Java/Spring Boot".
- Every arrow is **one-directional and labelled** with intent and, at level 2+, protocol: "publishes OrderPlaced [AMQP]". An unlabelled line is a guess.
- **One level of abstraction per diagram** — do not mix classes and external systems in the same picture.
- Prefer **diagrams as code** (Structurizr DSL, PlantUML with C4 macros, or similar) so diagrams live in Git and are reviewed like code.

---

## 10. Communicating with stakeholders

A correct design that nobody buys into does not get built. Map stakeholders by their concerns and speak to those concerns:

| Stakeholder | Cares about | Give them |
|---|---|---|
| Executives / sponsor | Outcome, cost, risk, timeline | One page: problem, options, recommendation, cost range, risks |
| Product owner | Features, time to market | What ships when, what is traded off |
| Security / compliance | Data protection, audit | Data flows, classification, controls |
| Operations / SRE | Can we run it at 3 a.m.? | Deployment view, monitoring, runbooks, failure modes |
| Developers | Clarity, autonomy, feasibility | Container/component views, ADRs, interfaces |

Habits that work:

- **Bottom line up front.** Start with the recommendation and its cost/risk; details follow for those who want them.
- **Present options, not a single answer.** Two or three options with trade-offs and a recommendation earn trust; a single option looks like a fait accompli.
- **Speak in consequences, not technology.** Not "we need Kafka", but "five teams can react to orders without the order team changing its code".
- **Influence without authority.** Architects rarely manage the builders. When developers push back, listen — they may know something you do not — then settle it with a spike and record the outcome in an ADR.

---

## 11. Back-of-the-envelope numbers every architect should know

Capacity estimates are about **orders of magnitude**, not precision. The goal is to know in five minutes whether you need one server or a hundred, gigabytes or petabytes.

**Time and rates**

- 1 day = 86,400 s ≈ **10⁵ s** for mental maths.
- 1 million requests/day ≈ **12 requests/s** on average (1,000,000 / 86,400 ≈ 11.6).
- 100 million/day ≈ 1,160/s. Plan for **peak ≈ 2–5× average** depending on the traffic shape.

**Sizes:** use powers of ten — KB 10³, MB 10⁶, GB 10⁹, TB 10¹², PB 10¹⁵ bytes. A short JSON record is ~1 KB, a compressed photo ~1 MB.

**Latency ladder** (orders of magnitude; exact values vary by hardware)

```text
CPU L1 cache reference              ~1 ns
Main memory (RAM) reference         ~100 ns
SSD random read                     ~0.1 ms  (100 us)
Round trip within one data centre   ~0.5 ms
Disk (HDD) seek                     ~10 ms
Round trip same continent           ~20-50 ms
Round trip across the Atlantic      ~70-100 ms
Round trip US <-> Asia              ~150-200 ms
```

Lessons from the ladder: memory is about a thousand times faster than an SSD read, a network hop inside a data centre costs about as much as several SSD reads, and **nothing beats physics across oceans** — that is why CDNs and regional deployments exist.

**Composite availability**

- Components **in series** (all must work): multiply. Three dependencies at 99.9% each → 0.999³ ≈ **99.7%**.
- Components **in parallel** (any one is enough): 1 − (probability all fail). Two independent replicas at 99% each → 1 − 0.01² = **99.99%**.

This is why a long chain of synchronous calls lowers availability, and redundancy raises it — provided failures really are independent.

---

## 12. Worked capacity estimate

**Scenario:** a photo-sharing feature. 20 million daily active users (DAU). Each user views about 50 items per day and posts 1 item per day. 10% of posts include a photo of ~500 KB; every post has ~1 KB of metadata. Keep data for 5 years.

Write the assumptions first, then compute with round numbers:

```text
WRITES   20M posts/day / 10^5 s      ~ 200/s avg (exact ~231), peak x3 ~ 700/s
READS    20M x 50 = 1B views/day     ~ 10,000/s avg (exact ~11,600), peak ~ 35,000/s
         read:write = 50:1           -> read-heavy: CDN + cache + read replicas
STORAGE  metadata 20M x 1 KB         = 20 GB/day
         photos    2M x 500 KB       = 1 TB/day -> ~370 TB/year -> ~1.9 PB in 5 years
CACHE    20% of 20 GB (80/20 rule)   ~ 4 GB RAM, small cluster for HA
SERVERS  assume ~2,000 req/s each    35,000 / 2,000 ~ 18 -> +headroom, N+1 -> ~25
```

What the numbers tell you:

- A **50:1 read/write ratio** shapes the design: CDN for photos, cache for hot metadata, read replicas.
- **Petabytes of photos** go to object storage (S3-style); only metadata goes to the database.
- **Per-instance capacity is an assumption** — say so and propose a load test to measure it.
- Within 2–3× is good enough; off by 1,000× (MB vs GB, per day vs per second) is the mistake interviewers look for.

---

## Key interview points

- An SA owns **one solution across many systems**; software architects go deeper into one system, enterprise architects wider across the portfolio, cloud architects own the platform.
- **NFRs drive architecture.** Separate requirements from **constraints** (fixed) and **assumptions** (unverified risks).
- Make quality attributes **measurable** with scenarios; convert nines into downtime (99.9% ≈ 43 min/month, 99.99% ≈ 52 min/year).
- **Everything is a trade-off.** Compare real options against weighted NFRs; slow down for one-way doors only.
- **ADRs**: context, decision, consequences (with negatives); immutable once accepted; a change is a new, superseding ADR.
- **C4**: context → container → component → code; a C4 container is a runnable/deployable unit, not a Docker container. Label every arrow.
- Communicate by audience: bottom line up front, options plus a recommendation, spikes to settle disagreements.
- Estimation: 1 day ≈ 10⁵ s, 1M/day ≈ 12/s, peak 2–5× average; series availability multiplies.

## Summary

- A Solutions Architect bridges business goals and technical delivery, and is judged by whether the solution is built, runs and meets its goals — not by the beauty of the diagram.
- Requirements come in three kinds — functional, non-functional, constraints — plus assumptions that must be tracked as risks.
- Quality attributes become useful only when they are measurable; availability percentages should always be translated into allowed downtime.
- Good architecture is explicit trade-off analysis in context, recorded in ADRs so the *why* survives.
- The C4 model gives diagrams a shared meaning through levels of zoom and strict notation.
- Back-of-the-envelope estimates in orders of magnitude tell you early whether a design is in the right league for load, storage and cost.
