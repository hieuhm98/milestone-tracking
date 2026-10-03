# UML Basics

## 1. What Is UML?

**Analogy:** before a house is built, an architect draws several plans: a floor plan (which rooms exist), an electrical plan (how wires run), a plumbing plan (how water flows). Each plan shows the *same house* from a different angle, and every builder in the world can read them because they use standard symbols. UML is that set of plans for software.

**UML** (Unified Modeling Language) is a standard modeling language for describing the design of software systems using visual diagrams.

Let us unpack the words:

- **Modeling** means making a simplified picture of something real so people can discuss it — like a scale model of a building.
- **Language** here does not mean a programming language. It is a *visual* language: a set of agreed shapes, lines and labels, each with a precise meaning.
- **Unified** because, in the 1990s, three well-known methods for drawing software designs were merged into one. Today UML is maintained by a standards body called the **OMG (Object Management Group)**.

UML has 14 types of diagrams, but a BA/PM mainly needs to know the following 3.

### The 14 types, in two families

You will never need to memorise all of them, but it helps to know the two families:

| Family | Answers the question | Examples |
|--------|---------------------|----------|
| **Structure diagrams** (7) | "What parts does the system have and how are they connected?" | Class, Object, Component, Deployment, Package… |
| **Behaviour diagrams** (7) | "What does the system *do*, and in what order?" | Use Case, Activity, State Machine, Sequence… |

The three that matter most to a **BA (Business Analyst)** or **PM (Project Manager)** are all behaviour diagrams: **Use Case**, **Activity** and **Sequence**. We will also take a short look at the **Class diagram**, because developers use it constantly and you will see it in meetings.

### Our running example: a food-ordering app

To keep things concrete, every diagram in this lesson describes the same imaginary app, **FoodNow** — like the food-delivery apps on your phone:

- A **customer** browses restaurants, adds dishes to a cart, places an order and pays.
- The **restaurant** receives the order and cooks it.
- A **driver** picks it up and delivers it.
- An external **payment gateway** (the service that actually charges the card or e-wallet) handles the money.

Same app, four different diagrams — just like the house with four plans.

> **Common misconception:** "UML is code." UML diagrams describe a design; they do not run. Some tools can generate code skeletons from class diagrams, but for a BA, UML is a communication tool.

---

## 2. Use Case Diagram

**Analogy:** the menu board at a restaurant. It does not tell you how the kitchen cooks anything — it just lists what you can order and who it is for (a kids' menu, a drinks menu). A use case diagram is the "menu" of a system: what it offers and to whom.

**Purpose**: to describe what the system does (its features) and who uses it.

### Symbols

| Symbol | Description |
|---------|-------|
| Stick figure | **Actor** — a user or an external system |
| Oval | **Use Case** — a feature of the system |
| Rectangle | **System boundary** — the boundary of the system |
| Solid line | **Association** — an actor uses a use case |
| `<<include>>` | This use case includes another use case (mandatory) |
| `<<extend>>` | This use case extends another use case (optional) |

### The symbols in plain words

- An **actor** is a *role*, not a specific person. "Customer" is one actor whether there are ten users or ten million. An actor can also be another system — the payment gateway is an actor because it sits *outside* our app and talks to it.
- A **use case** is a goal the actor can achieve with the system, written as verb + noun: "Place order", "Track delivery".
- The **system boundary** is a box around the use cases. Anything inside is what we build; anything outside (the actors) is not.
- An **association** is a plain line joining an actor to a use case they take part in.

### Example: FoodNow

```text
                 ┌──────────────── FoodNow app ─────────────────┐
                 │                                              │
  Customer ──────┼──── (Search restaurants)                     │
     │           │                                              │
     ├───────────┼──── (Place order) ─ ─<<include>>─ ─▶ (Log in)│
     │           │          ▲                                   │
     │           │          ┆ <<extend>>                        │
     │           │    (Apply voucher)                           │
     │           │                                              │
     ├───────────┼──── (Pay)────────────────────────────────────┼──── Payment gateway
     │           │                                              │
     └───────────┼──── (Track delivery)                         │
                 │                                              │
  Restaurant ────┼──── (Confirm order)                          │
                 │                                              │
  Driver ────────┼──── (Deliver order)                          │
                 └──────────────────────────────────────────────┘
```

### Include vs extend — the part everyone mixes up

- **`<<include>>` = mandatory.** "Place order" *always* needs "Log in" — you cannot order without an account. The dashed arrow points **from** the main use case **to** the one it includes. Use include to pull out a step that is shared by several use cases (login is also needed by "Track delivery").
- **`<<extend>>` = optional, under a condition.** "Apply voucher" *sometimes* adds extra behaviour to "Place order" — only if the customer has a voucher. The dashed arrow points **from** the optional extension **to** the main use case.

A quick memory trick: *include* is like the rice that always comes with the dish; *extend* is like an optional extra fried egg.

### What a use case diagram does NOT show

It does not show the order of steps, the screens, or the business rules inside "Place order". It answers only **who can do what**. The *how* goes into a written use case description, or an activity diagram (next section).

### Real-life work example

At project kick-off, a BA puts this diagram on the screen and asks the client: "Is anything missing from the box? Can drivers cancel orders? Can restaurants change prices?" Each "yes" becomes a new oval; each "not in this phase" stays outside the box. This is how **scope** (what is in and out of the project) gets agreed.

---

## 3. Activity Diagram

**Analogy:** a recipe card for a team kitchen: "Chop vegetables — *while at the same time* someone boils the water — then combine both." It shows steps, choices and work happening at the same time.

**Purpose**: to describe the flow of activities, a step-by-step process — similar to a flowchart but in the context of UML.

### Symbols

| Symbol | Description |
|---------|-------|
| Filled circle | Initial node (start) |
| Filled circle + outer ring | Final node (end) |
| Rounded rectangle | Activity (action) |
| Diamond | Decision/Merge node |
| Horizontal black bar | Fork/Join (parallel) |
| Swimlane | Division by role |

- A **decision** diamond splits the flow by a condition ("Paid online?"); a **merge** diamond brings alternative paths back together.
- A **fork** bar splits one flow into several that run **at the same time**; a **join** bar waits until **all** of them have finished before continuing.

### Example: what happens after a customer places a FoodNow order

```text
                    ●  start
                    │
       [Customer] ( Place order )
                    │
                    ▼
             ◇ Paid online? ◇
          Yes │            │ No
              │   [App] ( Mark "cash on delivery" )
              │            │
              │            │
              └───▶ ◇ ◀────┘  merge
                    │
     ═══════════════╪═══════════════  fork
           │                 │
     [Restaurant]        [Driver]
     ( Cook food )   ( Ride to restaurant )
           │                 │
     ═══════════════╪═══════════════  join
                    │
        [Driver] ( Deliver order )
                    │
                    ◉  end
```

Reading it:

1. ● The flow starts when the customer places an order.
2. The app checks: paid online? If not, it marks the order as cash on delivery. The merge diamond joins both paths.
3. **Fork:** two things now happen *in parallel* — the restaurant cooks, and the driver rides to the restaurant. Nobody waits for the other to start.
4. **Join:** delivery cannot start until **both** are done (food ready *and* driver arrived).
5. The driver delivers, and ◉ the flow ends.

The labels in [brackets] show who does each step. In a real activity diagram they are drawn as columns called **swimlanes** (called **partitions** in UML), and each action sits inside its owner's column.

### Differences from a Flowchart
- An activity diagram has **Fork/Join** to describe parallel activities.
- It integrates better with other UML diagrams.
- The **swimlane** is called a **partition** in UML.

> **Common misconception:** "Fork means a choice, like a fork in the road." No — a choice is a *decision diamond* (only one path is taken). A *fork bar* means **all** outgoing paths run at once.

---

## 4. Sequence Diagram

**Analogy:** the script of a play, written as a timeline. Each actor stands in their own spot across the stage; lines of dialogue go from one to another, and time flows from the top of the page to the bottom. You can read exactly who says what to whom, and in what order.

**Purpose**: to describe the **order** of interactions between objects over time.

An **object** here simply means a participant: a person, an app, a server, a database, an external service.

### Symbols

| Symbol | Description |
|---------|-------|
| Rectangle at the top | **Lifeline** — the participating object/actor |
| Vertical dashed line | **Lifeline** — existence over time |
| Narrow rectangle | **Activation box** — currently processing |
| Solid arrow | **Synchronous message** (call and wait) |
| Dashed arrow | **Return message** (return) |
| Open arrow | **Asynchronous message** (call without waiting) |

In plain words:

- **Synchronous message** (solid line, filled arrowhead): like a phone call — you ask and **wait** on the line for the answer.
- **Return message** (dashed line): the answer coming back.
- **Asynchronous message** (open, stick-style arrowhead): like sending a text message — you send it and carry on without waiting.

### Example: paying for a FoodNow order

```text
Customer       FoodNow app      Payment gateway     Restaurant
   │                │                  │                 │
   │──Place order──▶│                  │                 │
   │                │──Charge 150k────▶│                 │
   │                │                  │ (check balance) │
   │                │◀ ─ ─Payment OK─ ─│                 │
   │                │──New order─────────────────────────▷  (async)
   │◀ ─ Confirmed ─ │                  │                 │
   │                │                  │                 │
```

Read it from top to bottom:

1. The customer taps "Place order".
2. The app asks the payment gateway to charge 150,000 VND and **waits** (synchronous).
3. The gateway replies "Payment OK" (dashed return arrow).
4. The app notifies the restaurant **without waiting** for it to reply (asynchronous) — the restaurant tablet will ring when it can.
5. The app shows "Order confirmed" to the customer.

### The same idea in developer language: login

You will often see sequence diagrams with technical labels. Do not panic — the pattern is the same:

```text
Browser        Server        Database
  │               │               │
  │──POST /login─►│               │
  │               │──SELECT user──►│
  │               │◄──user data───│
  │               │ (verify pass) │
  │◄──200 + token─│               │
  │               │               │
```

- `POST /login` = the browser sends the username and password to the server.
- `SELECT user` = the server asks the database for that user's record.
- `200 + token` = "success", plus a digital pass (token) that proves you are logged in for the next requests.

### Why BAs care

Sequence diagrams are where **integration problems** show up: "What if the payment gateway does not reply within 30 seconds? Do we cancel the order or retry?" Asking that question in a design meeting is far cheaper than discovering it in production.

---

## 5. Class Diagram

**Analogy:** a blank form template versus a filled-in form. The template ("Name: ___, Phone: ___") is a **class**. Each filled-in copy ("Name: Lan, Phone: 0901…") is an **object**. A class diagram shows all the templates in the system and how they relate to each other.

**Purpose**: to describe the **structure** of the system — what kinds of things (data) it stores and how they are connected. It is a structure diagram, unlike the three above.

### Reading a class box

Each class is a rectangle with three compartments:

```text
┌──────────────────────┐
│        Order         │  ← class name
├──────────────────────┤
│ id                   │
│ status               │  ← attributes (the data it holds)
│ totalAmount          │
├──────────────────────┤
│ place()              │  ← operations (what it can do)
│ cancel()             │
└──────────────────────┘
```

### Example: FoodNow's main classes

```text
┌──────────┐ 1   places   0..* ┌───────┐ 1      1..* ┌───────────┐
│ Customer │───────────────────│ Order │◆────────────│ OrderItem │
└──────────┘                   └───────┘             └───────────┘
                                                           │ 0..*
                                                           │
                                                           │ 1
┌────────────┐ 1   offers   0..* ┌──────┐                  │
│ Restaurant │───────────────────│ Dish │◀─────────────────┘
└────────────┘                   └──────┘
```

How to read it:

- **Lines** are **associations**: the two classes are related. The label says how ("places", "offers").
- **Numbers at each end** are **multiplicity** — "how many". `1` means exactly one; `0..*` means zero or more; `1..*` means at least one. So: one customer places zero or more orders; each order belongs to exactly one customer.
- The **filled diamond** (◆) is **composition**: an order is *made of* order items, and if the order is deleted its items disappear with it.
- An **OrderItem** links to one **Dish** (e.g. "2 × Phở bò").

Another symbol you will meet: a line with a **hollow triangle** means **inheritance** ("is a kind of") — for example, *CardPayment* and *CashPayment* are both kinds of *Payment*.

### Why a BA should be able to read one

You will not usually draw class diagrams — developers and architects do. But reading one lets you check business rules quickly: "Wait — can one order contain dishes from two restaurants? The diagram says yes. Is that what the business wants?" That single question can prevent a costly redesign.

> **Try it yourself:** open `https://mermaid.live` in a browser (Windows or macOS), delete the sample text on the left, and paste the first block below. A sequence diagram appears on the right: `->>` draws a solid call arrow and `-->>` a dashed return arrow. Then replace everything with the second block and you get a small class diagram with multiplicity and a composition diamond.

```text
sequenceDiagram
    actor C as Customer
    participant A as FoodNow app
    participant P as Payment gateway
    C->>A: Place order
    A->>P: Charge 150k
    P-->>A: Payment OK
    A-->>C: Order confirmed
```

```text
classDiagram
    Customer "1" --> "0..*" Order : places
    Order "1" *-- "1..*" OrderItem
```

---

## 6. When to Use Which Type of Diagram?

| Situation | Diagram to use |
|-----------|--------------|
| Identify system features and who uses what | Use Case Diagram |
| Describe a business process step-by-step | Activity Diagram |
| Describe how components communicate over time | Sequence Diagram |
| Design the class/object structure | Class Diagram |
| Describe the states of an object | State Diagram |

### The same app, four questions

Think of each diagram as answering a different question about FoodNow:

| Question | Diagram | FoodNow example |
|----------|---------|-----------------|
| **Who** can do **what**? | Use Case | Customer places orders; driver delivers |
| In what **steps**, with what **choices**? | Activity | Paid online? → cook and find driver in parallel |
| **Who talks to whom**, in what **order**? | Sequence | App → payment gateway → app → restaurant |
| What **data** exists and how is it **linked**? | Class | Customer 1 — 0..* Order |
| What **states** does one thing go through? | State | Order: New → Cooking → On the way → Delivered (or Cancelled) |

The **State diagram** (state machine) in the last row is worth a mention: it shows the life of a single thing — like an order moving from "New" to "Delivered" — and which events move it from one state to the next. It is handy when the business keeps asking "can an order be cancelled *after* the driver has picked it up?"

---

## 7. Practical Notes for BAs/PMs

- Use a Use Case Diagram at **project kick-off** — to scope the system.
- Use an Activity Diagram when **describing business processes** — similar to a flowchart.
- Use a Sequence Diagram when **working with developers** on APIs/integrations.
- You do not need to know all 14 types — the three above cover 80% of a BA's work.

### More tips from real projects

- **Draw only what helps.** A diagram is worth drawing when it clarifies something that prose cannot — a tricky flow, a parallel process, a chain of system calls. Do not draw every diagram type "for completeness".
- **Pick the right level of detail.** A use case diagram for the client should fit on one screen. A sequence diagram for developers can include API names and error cases.
- **Help readers who don't know UML.** Customers rarely know the notation. Add a small legend (what the oval, dashed arrow and bar mean), explain the purpose of the diagram, and walk through one example together before asking them to review it.
- **Keep diagrams in sync with requirements.** An out-of-date diagram is worse than none, because people trust it.
- **Tools:** draw.io / diagrams.net (free) and Lucidchart have UML shape libraries; Mermaid and PlantUML let you write diagrams as text.

### Real-life work example

In a sprint planning meeting, a developer says: *"The restaurant confirmation is async, so the customer might see 'Confirmed' before the restaurant accepts."* If you can read the sequence diagram, you can respond in business terms: *"Then the screen should say 'Order sent to restaurant', not 'Confirmed', until the restaurant accepts."* That is the BA adding value with UML.

---

## 8. Summary

- **UML** is a standard visual language for describing software designs; it has 14 diagram types in two families (structure and behaviour).
- **Use Case**: what the system does and who uses it.
- **Activity**: a step-by-step process with support for parallelism.
- **Sequence**: the order of interactions over time.
- **Class**: the structure — what data exists and how it is linked (with multiplicity such as `1` and `0..*`).
- Actor = a user or an external system.
- `<<include>>` = mandatory; `<<extend>>` = optional.
- Fork/Join = parallel work; a decision diamond = choose one path.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| UML | A standard set of diagram "plans" for describing software |
| Actor | A role (person or external system) that uses the system |
| Use case | A goal an actor can achieve, written as verb + noun |
| System boundary | The box showing what is inside the system we build |
| `<<include>>` / `<<extend>>` | Always-needed step / optional add-on step |
| Fork / Join | Split into parallel work / wait for all parallel work to finish |
| Partition | UML's name for a swimlane |
| Lifeline | A participant's dashed timeline in a sequence diagram |
| Synchronous / Asynchronous | Call and wait / send and carry on |
| Class / Object | A template / one filled-in instance of it |
| Multiplicity | "How many" at each end of a relationship (1, 0..*, 1..*) |
