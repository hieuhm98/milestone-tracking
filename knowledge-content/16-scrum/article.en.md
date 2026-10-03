# Scrum Framework

## 1. What is Scrum?

**Scrum** is the most popular Agile framework. It organizes software development into **sprints** (iterations of 1-4 weeks), with 3 clear roles, 5 ceremonies, and 3 artifacts.

Scrum is not a methodology — it is a lightweight framework that teams adapt to their own needs.

### An everyday picture

Think of a restaurant kitchen preparing a new seasonal menu. The owner decides which dishes matter most to customers. A head chef keeps the kitchen running smoothly — not by cooking every dish, but by making sure everyone has what they need and the routine works. The cooks decide among themselves how to prepare each dish. Every two weeks they serve a tasting to regular customers, listen to the reactions, and adjust the menu.

That is Scrum: someone decides **what** is most valuable, the people doing the work decide **how**, and the team checks real results with real people on a fixed rhythm.

### Where it comes from

The name comes from **rugby**, where a "scrum" is the whole team pushing forward together. Ken Schwaber and Jeff Sutherland formalized Scrum in the 1990s, and the official rules live in a short free document called the **Scrum Guide**. The current version was published in **November 2020**. This lesson follows that version and points out where older terms you will still hear at work came from.

### The idea underneath: inspect and adapt

Scrum is built on **empiricism** — deciding based on what you actually observe, not on predictions. It rests on three pillars:

| Pillar | Plain meaning | Example |
|--------|---------------|---------|
| **Transparency** | Everyone can see the real state of the work | The task board is visible to all |
| **Inspection** | Look at progress and the product often | Showing the product every sprint |
| **Adaptation** | Change course when something is off | Re-ordering the backlog after feedback |

> **Common misconception:** Scrum is not a project-management tool like Jira. Jira is software for tracking tasks; Scrum is a set of roles, events and rules. You can run Scrum with sticky notes on a wall.

---

## 2. The Three Roles (Accountabilities)

A **Scrum Team** has exactly three kinds of accountability. The 2020 Scrum Guide calls them "accountabilities" rather than "roles" and renamed the old "Development Team" to simply **Developers**. Together the whole Scrum Team is typically **10 or fewer people**, with no sub-teams or hierarchies.

### Product Owner (PO)
- Represents the customer/stakeholders.
- Owns and prioritizes the **Product Backlog**.
- Decides **what** to build, not how to build it.
- Answers the team's questions about requirements.
- Is accountable for the **product's value**.

The PO is **one person, not a committee**. Many people (sales, support, the CEO) can give the PO ideas, but only the PO decides the order of the backlog. **Stakeholders** are everyone with an interest in the product — customers, managers, other departments.

*Example:* the sales team, the support team and a big customer all want different features first. Instead of three bosses giving orders, the PO weighs the value and puts one list in order.

### Scrum Master (SM)
- Ensures the team understands and follows Scrum.
- Removes **impediments** for the team.
- Is not a project manager and does not assign work.
- Serves the team (servant leader).
- Organizes and facilitates the ceremonies.

An **impediment** is anything that blocks the team: a broken test server, a missing approval, a dependency on another team. To **facilitate** means to help a meeting run well — keep it on topic and on time — without dictating the outcome. A **servant leader** leads by helping, not by commanding. The 2020 Guide says the Scrum Master is accountable for the Scrum Team's **effectiveness**.

### Developers (formerly "Development Team")
- Cross-functional: has all the skills needed to deliver the sprint.
- Self-organizing: decides how to do the work.
- Ideal size: 3-9 people.
- No role hierarchy within the team.

"Developers" in Scrum means **everyone who builds the product**, not only programmers: testers, designers and analysts on the team count too. **Cross-functional** means the team does not need to hand work to an outside group to finish it. The "3-9 people" figure comes from the older (2017) Scrum Guide and is still widely quoted; the 2020 Guide instead says the whole Scrum Team is typically 10 or fewer.

> **Common misconception:** in Scrum there is no traditional Project Manager. A PM manages scope, time, cost and resources; in Scrum those duties are split — the PO owns value and priorities, the Developers own the plan for the sprint, the Scrum Master owns the process.

---

## 3. The Three Artifacts

An **artifact** is a visible piece of information the team works from — like the order tickets pinned up in a kitchen. Scrum has three, and since 2020 each comes with a **commitment**: a target that gives it focus.

| Artifact | Its commitment | Question it answers |
|----------|----------------|---------------------|
| Product Backlog | **Product Goal** | Where is the product heading long term? |
| Sprint Backlog | **Sprint Goal** | What is this sprint for? |
| Increment | **Definition of Done** | When is work truly finished? |

### Product Backlog
- A list of **all the requirements** for the product.
- Ordered by priority (the most important item at the top).
- Always changing — the PO continuously refines it.
- Each item is called a **PBI** (Product Backlog Item) or User Story.

The **Product Goal** is the long-term objective, for example: *"Become the easiest way for office workers to order lunch."* A **user story** is a short requirement written from the user's view: *"As a customer, I want to pay by e-wallet so that I don't need cash."*

### Sprint Backlog
- The subset of the Product Backlog selected for **this sprint**.
- Includes a plan to deliver them (tasks).
- Only the Development Team may change the Sprint Backlog.

It is made of three things: the **Sprint Goal** (why), the selected items (what), and the plan (how). It belongs to the Developers and is updated throughout the sprint as they learn more.

### Increment
- The sum of all PBIs completed in the sprint.
- Must meet the **Definition of Done** (DoD).
- Must be **usable** — ready to use, whether or not stakeholders release it.

Each Increment adds to all previous ones, and the 2020 Guide notes that several Increments may be created within one sprint. Work that does not meet the DoD is not part of the Increment — it goes back to the Product Backlog.

---

## 4. The Five Ceremonies (Events)

Scrum's meetings are called **events** (many teams still say "ceremonies"). The Scrum Guide lists five: the **Sprint** itself (the container for all the others, covered in section 5), **Sprint Planning**, the **Daily Scrum**, the **Sprint Review** and the **Sprint Retrospective**. Each has a maximum length, called a **timebox**; the limits below are for a one-month sprint and are usually shorter for shorter sprints.

```text
|<------------------------ Sprint (e.g. 2 weeks) ------------------------>|
 Planning → Daily → Daily → Daily → ... → Daily → Review → Retrospective
```

### Sprint Planning
- At the start of each sprint.
- The PO presents priorities, the Team selects suitable PBIs.
- The Team creates the Sprint Goal and Sprint Backlog.
- Max 8 hours for a 1-month sprint.

It answers three questions: **Why** is this sprint valuable (the Sprint Goal)? **What** can be done? **How** will it be done?

### Daily Scrum (Daily Standup)
- Every day, 15 minutes, same time.
- 3 questions: What did I do yesterday? What will I do today? Any impediments?
- The Dev team organizes it themselves; it is not a report to the SM/PO.

The three questions come from older versions of the Guide. The 2020 Guide no longer requires them — the Developers may use any format, as long as they inspect progress toward the Sprint Goal and adjust the plan for the next day. Many teams still use the three questions because they are simple.

### Sprint Review
- At the end of the sprint, demo the Increment to stakeholders.
- Gather feedback → adjust the Product Backlog.
- Max 4 hours for a 1-month sprint.

It is a working session, not a slide show: stakeholders try the product and discuss what to do next.

### Sprint Retrospective
- After the Sprint Review.
- The team improves itself: workflow, tools, relationships.
- Questions: What went well? What needs improvement? Action items?
- Max 3 hours for a 1-month sprint.

The Review inspects the **product** with stakeholders; the Retrospective inspects **how the team works**, and only the Scrum Team attends.

### Backlog Refinement (not an official ceremony)
- The PO + Team clarify and estimate PBIs to prepare for the next sprint.
- Usually about 10% of each sprint's time.

Refinement is an ongoing activity, not one of the five events. **Estimating** means guessing the effort an item needs, often in "story points" (a relative size, not hours). The "about 10%" rule of thumb comes from the older Scrum Guide.

---

## 5. Sprint

The Sprint is the "heartbeat" of Scrum:
- Fixed at 1-4 weeks (most common: 2 weeks).
- No scope is added midway.
- When a sprint ends → a new sprint starts immediately.

```text
[Sprint 1] → [Sprint 2] → [Sprint 3] → ...
  2 weeks      2 weeks      2 weeks
```

### Why a fixed rhythm?

Like a monthly salary or a weekly class, a steady cadence makes everything predictable: stakeholders know when they will see progress, and the team learns how much it can finish in one sprint.

### Protecting the sprint

During a sprint, the **Sprint Goal does not change** and quality is not lowered. The details of the work may still be clarified and renegotiated with the PO as the team learns more — but big new requests go to the Product Backlog for a later sprint. If something truly urgent must come in, the PO usually trades something else out.

Only the **Product Owner** can cancel a sprint, and only if the Sprint Goal becomes obsolete — for example, the company drops the feature entirely. This is rare.

---

## 6. Definition of Done (DoD)

The DoD is the set of criteria for considering a PBI **complete**:
- Code is written.
- Code reviewed.
- Tests pass.
- Deployed to staging.
- Documentation updated.

The DoD helps avoid "almost done" — everyone agrees on what "finished" means.

### Analogy: a restaurant's "ready to serve" rule

Before any plate leaves the kitchen: hot food is hot, the plate rim is wiped, the order number is checked. That rule applies to **every** dish. In software, **code review** means another developer reads the code before it is accepted, and **staging** is a copy of the live system used for final checks before real users see it.

### DoD vs acceptance criteria

| | Definition of Done | Acceptance criteria |
|--|--------------------|---------------------|
| Applies to | **Every** backlog item | **One** specific item |
| Example | "Tests pass, code reviewed" | "E-wallet payment shows a receipt" |
| Who sets it | The Scrum Team (or company standard) | Usually the PO with the team |

> **Common misconception:** "Done" is not "the developer finished coding". Without a DoD, developers mean coded, testers mean tested, and the PO means ready to use — and nobody notices until the demo.

---

## 7. One 2-Week Sprint, Day by Day

Here is a realistic sprint for a 7-person food-delivery team: Linh (PO), Minh (Scrum Master) and five Developers (three programmers, one tester, one designer). Product Goal: *"Make lunch ordering fast for office workers."*

| Day | What happens |
|-----|--------------|
| **Mon (day 1)** | **Sprint Planning** (about 3 hours). Linh explains why e-wallet payment matters most now. Sprint Goal: *"Customers can pay by e-wallet."* Developers pick 6 PBIs and split them into tasks. Refunds are left for later. |
| **Tue (day 2)** | First **Daily Scrum** at 9:30, 15 minutes. Work starts; the designer finalizes the payment screen. |
| **Wed (day 3)** | Daily Scrum: a programmer has no test account from the e-wallet partner. Minh takes the impediment and chases the partner. |
| **Thu (day 4)** | Access arrives. The tester starts writing test cases for the payment flow. |
| **Fri (day 5)** | First PBI meets the DoD. The sales director asks Linh for a promo-code feature; she adds it to the Product Backlog, not the sprint. |
| **Mon (day 6)** | Daily Scrum shows one PBI is bigger than expected. Developers and Linh agree to drop a "save card" option from this sprint — the Sprint Goal is unchanged. |
| **Tue (day 7)** | **Backlog Refinement** (1 hour): Linh and the team clarify and estimate promo codes for the next sprint. |
| **Wed–Thu (days 8–9)** | Building and testing. Bugs found are fixed before items count as done. |
| **Fri (day 10) morning** | **Sprint Review** (about 2 hours): stakeholders pay with an e-wallet on a test phone. Feedback: show the wallet balance. Linh adds it to the backlog. |
| **Fri (day 10) afternoon** | **Sprint Retrospective** (about 1.5 hours). Went well: the tester joined early. To improve: request partner access before the sprint. Action item: Minh adds "check external access" to the planning checklist. |
| **Next Monday** | The next sprint starts immediately with Sprint Planning. |

> **Try it yourself:** run a 15-minute retrospective on your own week. On paper, write three headings — *Went well*, *To improve*, *One action for next week* — and fill them in. Repeat next Friday and check whether you actually did the action. That habit is the core of Scrum's continuous improvement.

---

## 8. Summary

| | Who | What they do |
|--|----|----|
| **PO** | 1 person | Prioritize the backlog, represent the customer |
| **Scrum Master** | 1 person | Facilitate, remove impediments |
| **Dev Team** | 3-9 people | Build the increment |

**Ceremonies**: Planning → Daily Standup → Review → Retro.
**Artifacts**: Product Backlog → Sprint Backlog → Increment.

- Scrum is a lightweight framework built on **transparency, inspection and adaptation**; the official rules are in the Scrum Guide (2020).
- Since 2020 the "Development Team" is called **Developers**, and the whole Scrum Team is typically 10 or fewer people.
- Each artifact has a commitment: **Product Goal**, **Sprint Goal**, **Definition of Done**.
- The sprint is a fixed timebox; its goal is protected, and new requests go to the Product Backlog.
- **Review** inspects the product with stakeholders; **Retrospective** improves how the team works.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Sprint | A fixed 1–4 week cycle that produces a usable Increment |
| Product Owner | The one person who decides what to build next and in what order |
| Scrum Master | The coach who helps Scrum work and clears blockers |
| Developers | Everyone on the team who builds the product |
| Product Backlog | The ordered list of everything the product might need |
| Sprint Backlog | The Sprint Goal, the items picked for this sprint, and the plan |
| Increment | The usable, done work produced so far |
| Definition of Done | The quality checklist every item must pass to count as finished |
| Impediment | Anything that blocks the team's progress |
| Timebox | A maximum time allowed for an event |
