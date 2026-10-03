# What Is Agile?

## 1. What Is Agile?

**Agile** is a mindset and a software development approach based on **short iterations** and continuous improvement driven by feedback — rather than planning everything upfront and only then building.

Agile is not a fixed tool or process — it is a **set of values and principles** distilled in the **Agile Manifesto** (2001).

### An everyday picture

Imagine you are cooking a big pot of soup for friends you have never cooked for before. You could follow a recipe exactly, cook for three hours, and only taste it when it is served. Or you could **taste as you go**: add a little salt, taste, add some pepper, taste again, ask a friend to try a spoonful, adjust.

The second way is Agile. You still have a goal (a good soup) and a rough plan (the recipe), but you **check the result often** and **change course** based on what you learn. You find out it is too salty after five minutes, not after three hours.

In software, "tasting" means showing a small working piece of the product to real users or to the person paying for it, then deciding what to do next based on their reaction.

### Three words you will hear constantly

- An **iteration** is one short cycle of work — build a little, show it, learn, adjust. In Scrum (the most common Agile framework) an iteration is called a **sprint** and usually lasts 1–4 weeks, most often 2.
- **Feedback** is any reaction to what was built: "this button is confusing", "we actually need this report weekly, not monthly".
- A **framework** is a ready-made set of roles, meetings and rules that puts Agile values into daily practice. Scrum and Kanban are frameworks; Agile itself is the philosophy behind them.

> **Common misconception:** "Agile" is not a product you install or a certificate a company buys. Two teams can both say "we are Agile" and work quite differently. What they should share is the values in the next section.

---

## 2. The Agile Manifesto – 4 Core Values

In February 2001, **17 software practitioners** (including Kent Beck, Martin Fowler and Ken Schwaber) met at the Snowbird ski resort in **Utah, USA**. They were tired of heavy, document-driven projects that ran for years and still disappointed users. They wrote a one-page statement: the **Agile Manifesto**, with **4 values** and **12 principles**. Every Agile framework you will meet is built on it.

> *"We are uncovering better ways of developing software by doing it and helping others do it. Through this work we have come to value:"*

| Value | Over |
|-----------|-----|
| **Individuals and interactions** | Processes and tools |
| **Working software** | Comprehensive documentation |
| **Customer collaboration** | Contract negotiation |
| **Responding to change** | Following a plan |

*Note: the items on the right still have value, but the items on the left are valued more.*

### What each value means in practice

**1. Individuals and interactions over processes and tools.** If a developer is unsure what a field on a form should do, the Agile answer is to walk over (or message) the person who knows and ask — not to file a formal change request and wait three days. Tools like Jira are useful, but a five-minute conversation usually beats a perfect ticket.

**2. Working software over comprehensive documentation.** Progress is measured by what actually runs, not by how many pages of specification exist. A clickable login screen that users can try tells you more than a 40-page document describing it. Teams still write documents — just the ones that are genuinely useful.

**3. Customer collaboration over contract negotiation.** Instead of signing a fixed contract and meeting the customer again only at delivery, the customer (or someone who speaks for them, usually called the **Product Owner**) is involved throughout: setting priorities, reviewing each iteration and giving feedback.

**4. Responding to change over following a plan.** When the market, the law or the users' needs change, the team adjusts the plan rather than defending it. New ideas go onto the list of upcoming work and are prioritized, not ignored.

> **Common misconception:** "over" does not mean "instead of". Agile teams still have processes, documents, contracts and plans. When the two sides conflict, the left side wins.

### A few of the 12 principles

You do not need to memorize them, but these four capture the spirit:

- "Our highest priority is to satisfy the customer through early and continuous delivery of valuable software."
- "Welcome changing requirements, even late in development."
- "Business people and developers must work together daily throughout the project."
- "At regular intervals, the team reflects on how to become more effective, then tunes and adjusts its behavior accordingly."

---

## 3. Waterfall vs Agile

Before Agile, most large projects used **Waterfall**: a sequence of phases where each one must finish before the next begins, like water flowing down steps — it does not flow back up.

```text
Requirements → Design → Build → Test → Deploy → Maintain
   (months)    (months)  (months) (weeks)  (one big release)
```

### Analogy: renovating a house

**Waterfall renovation:** you sit with an architect, decide every detail of the kitchen, bathroom and bedrooms, sign the plan, then move out for six months. You come back on the final day to see the result. If the kitchen island blocks the fridge door, you discover it now — when moving it means breaking tiles and paying again.

**Agile renovation:** the builders do one room at a time. After two weeks the bathroom is finished and you use it. You realise you want a bigger mirror, so you ask for one in the next room too. After the kitchen's first week you notice the island is in the way, and it is moved before the tiles go down. You keep the same budget and deadline, but you **steer** as you go.

The same works for **planning a wedding**: instead of booking everything in one go a year ahead, you lock the date and venue first, then decide food, music and decorations in rounds, adjusting as the guest list and budget become clearer.

### Side by side

| | Waterfall | Agile |
|--|-----------|-------|
| **Approach** | Sequential (one phase after another) | Short iterations (sprints) |
| **Requirements** | Fixed from the start | Change is embraced |
| **Delivery** | At the end of the project | Continuously after each sprint |
| **Feedback** | Late (near the end) | Early and frequent |
| **Risk** | Discovered late | Discovered early |
| **Best for** | Stable, clear requirements | Frequently changing requirements |

### Where the analogy breaks down

A house has a natural order — you cannot paint walls before they exist. Software is more flexible: you can often build the "login" feature before the "reports" feature or the other way round, which makes delivering in small slices much easier than in construction.

---

## 4. Why Waterfall Fails for Software

- Requirements change constantly — they cannot be "frozen" from the start.
- Customers only see the final product — too late to make changes.
- The environment changes quickly (market, competitors, technology).
- Software is hard to estimate accurately — you learn as you build.

### The cone of uncertainty

At the very start of a project, nobody truly knows how big it is. Studies of software estimation describe a **cone of uncertainty**: early estimates can be off by as much as 4× in either direction, and they only become accurate as real work is done and real questions are answered.

```text
Stage                 How far off an estimate can be
Initial idea          0.25x ████████████████████████ 4x
Product defined        0.5x     ████████████████     2x
Requirements done     0.67x       ████████████       1.5x
Design done            0.8x         ████████         1.25x
Software finished        1x            ██            1x
```

Read it like this: when you only have an idea, a project you guess at "10 months" could really take anywhere from about 2.5 to 40 months. Waterfall asks you to commit to scope, cost and dates at the widest part of the cone. Agile accepts the uncertainty and reduces it by delivering something real every few weeks.

### A real-life example

A bank spends 12 months building a new mobile app from a 200-page specification. At launch, users complain they cannot log in with fingerprint — something that became standard while the app was being built. The specification never mentioned it, so it was never built. With Agile, users would have tried an early version in month two and asked for it then.

### When Waterfall is still the right choice

Waterfall is not "bad". It fits when requirements are **clear, stable and expensive to change**: building a bridge, manufacturing hardware, embedded software with a fixed specification, or tightly regulated systems where every requirement must be approved and documented before work starts. The problem is uncertainty, not the model itself.

---

## 5. Iterative & Incremental

**Iterative**: doing it over and over, improving with each cycle.
**Incremental**: adding new features with each cycle.

### Analogy: painting a portrait

- **Incremental only:** you paint the eyes perfectly, then the nose perfectly, then the mouth. Until the end, nobody can see what the whole face will look like.
- **Iterative only:** you sketch the whole face roughly, then refine it, then refine again — but you never add the background or the hands.
- **Agile (both):** a rough sketch of the whole picture first, then each round you add a new part *and* improve the parts already there, showing it to the person who ordered it each time.

### What it looks like in a shopping app

```text
Sprint 1: [Login] [View list]
Sprint 2: [Place order] [Payment]
Sprint 3: [Track order] [Review]
```

After sprint 1, there is already a usable product (even if incomplete) → the customer tries it, gives feedback → the next sprint is adjusted.

For example, in Sprint 1 users say the product list is too slow to scroll. In Sprint 2 the team adds ordering and payment (**incremental**) and also makes the list faster (**iterative**).

> **Common misconception:** "Usable after sprint 1" does not mean "released to the public after sprint 1". It means the piece works for real and could be shown or tried — the business decides when to release.

---

## 6. Popular Agile Frameworks

Agile is the philosophy; frameworks are concrete ways of working. You will most often meet these:

| Framework | Characteristics | Best for |
|-----------|---------|---------|
| **Scrum** | 2-week sprints, clear roles | Product development |
| **Kanban** | Visualize workflow, limit WIP | Ops, support, maintenance |
| **SAFe** | Agile at large enterprise scale | Enterprise |
| **XP (Extreme Programming)** | Engineering focus: TDD, pair programming | Dev-centric |

### In plain words

- **Scrum** splits work into fixed sprints with three accountabilities (Product Owner, Scrum Master, Developers) and a few regular meetings. It has its own lesson.
- **Kanban** has no sprints. Work flows continuously across a board with columns like *To Do → Doing → Done*. The key rule is a **WIP limit** (Work In Progress limit): for example, no more than 3 cards in "Doing" at once, so people finish things before starting new ones. That suits support desks, where requests arrive all day.
- **SAFe** (Scaled Agile Framework) coordinates many teams — sometimes dozens — working on one large product. It adds more structure and roles, so it carries more overhead.
- **XP** (Extreme Programming) focuses on how code is written: **TDD** (writing the test before the code), **pair programming** (two developers at one computer), frequent refactoring, and **continuous integration** (merging and automatically testing code many times a day).

> **Try it yourself:** draw three columns on a sheet of paper — *To Do, Doing, Done*. Write each errand for this weekend on a sticky note and put it in *To Do*. Allow at most 2 notes in *Doing* at a time. By Sunday you will have run a tiny Kanban board and felt why WIP limits stop you juggling too many half-finished tasks.

---

## 7. A Week in an Agile Team

Values are easier to understand when you see them in a normal working week. Here is a 6-person team building a food-delivery app, in week one of a two-week sprint. The team: Linh (Product Owner), Minh (Scrum Master), three developers and one tester.

### Monday — planning

The team meets for about two hours. Linh explains the most valuable goal for this sprint: *"Customers can pay by e-wallet."* The developers look at the top items on the list of work, ask questions ("Which e-wallets? Do we need refunds now or later?") and pick what they believe they can finish in two weeks. Refunds are moved to a later sprint.

### Tuesday to Thursday — building

Every morning at 9:30 there is a 15-minute stand-up. Each person says what they did, what they will do next and whether anything blocks them.

On Wednesday a developer says: *"The e-wallet company hasn't given us test account access."* Minh, the Scrum Master, takes that blocker and chases the partner company that afternoon.

On Thursday the sales director emails Linh: *"We urgently need a promo-code feature!"* Linh does not push it into the current sprint. She adds it to the list of future work, ranks it, and tells the director it will be considered at the next planning meeting.

### Friday — early feedback

The tester shows Linh the half-finished payment screen on a test phone. Linh notices the "Pay" button sits below the fold on small phones. It is fixed the same day — a change that would have cost weeks if found after launch.

### What you just saw

| Moment | Agile value or principle |
|--------|--------------------------|
| Developers asking Linh questions face to face | Individuals and interactions |
| Showing a working screen on Friday | Working software |
| Linh deciding priorities with the business | Customer collaboration |
| Promo code going to the list, not into the sprint | Responding to change — in a controlled way |
| Minh removing the access blocker | Teams need a fast path to decisions and help |

> **Common misconception:** Agile does not mean everyone does whatever they like. Notice how many decisions depend on Linh being **available and allowed to decide**. Without an empowered decision-maker, the team is blocked or guessing — which recreates exactly the problem Agile tries to solve.

---

## 8. Agile Is NOT...

- ❌ No planning → Agile has plans, but flexible ones.
- ❌ No documentation → Agile has documentation, but just enough.
- ❌ No deadlines → Agile has deadlines, but a flexible scope.
- ❌ Winging it, just iterate and see → Agile needs clear goals.

### Looking closer at each myth

**"No planning."** Agile teams actually plan *more often*: a long-term roadmap, a plan for each sprint, and a short daily plan. They just accept that later plans will change.

**"No documentation."** Agile teams write user stories, acceptance criteria (the conditions a feature must meet to count as finished), design notes and user guides. What they avoid is writing hundreds of pages nobody reads. Anything that must outlive people's memory — regulations, architecture decisions, how to operate the system — is still written down.

**"No deadlines."** A sprint has a fixed end date. What flexes is **scope**: if time runs short, the team delivers the most important part well rather than everything badly.

**"Just iterate and see."** Each sprint has a goal, and the product has a longer-term vision. Iterating without a destination is just wandering.

### A real meeting conversation

> **Manager:** "We're Agile now, so we don't need the requirements document, right?"
> **BA:** "We still need requirements — we just write them in smaller pieces, closer to when they're built, and confirm them with users after each sprint."

---

## 9. Summary

- **Agile** = a flexible, iterative development mindset.
- **4 values**: individuals, working software, customer collaboration, responding to change.
- The **Agile Manifesto** was written in 2001 by 17 practitioners in Utah, with 4 values and 12 principles. The right-hand items still matter; the left-hand ones matter more.
- **Waterfall**: good when requirements are stable; **Agile**: good when requirements change.
- Waterfall struggles in software because of the **cone of uncertainty** — you learn the real requirements only as users see the product.
- **Iterative** improves what exists; **incremental** adds new pieces. Agile does both.
- **Sprint**: a short iteration (1-4 weeks) in Scrum.
- **Scrum, Kanban**: the most popular frameworks today.
- New requests mid-sprint go to the backlog and are prioritized later; an available, empowered decision-maker keeps the team moving.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Agile | A way of working in short cycles, learning from feedback |
| Iteration / Sprint | One short, fixed cycle of work (Sprint = Scrum's name) |
| Agile Manifesto | The 2001 one-page statement of 4 values and 12 principles |
| Waterfall | Doing each phase fully, one after another, delivering at the end |
| Cone of uncertainty | Early estimates are very rough and improve as work progresses |
| Iterative | Improving the same thing round after round |
| Incremental | Adding new pieces round after round |
| Product Owner | The person who decides what is most valuable to build next |
| Backlog | The ordered list of all future work |
| WIP limit | A cap on how many tasks can be "in progress" at once |
