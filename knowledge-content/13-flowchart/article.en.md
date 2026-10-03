# Flowchart

## 1. What Is a Flowchart?

**Analogy:** think of the assembly instructions that come with a flat-pack bookshelf. You do not get a long essay — you get numbered pictures: "do this, then this; if you have part B, attach it here". A flowchart is the same idea for any process: a picture of steps, joined by arrows, that anyone can follow with a finger.

A **flowchart** is a tool for visualizing a process, a processing flow, or an algorithm using standard symbols connected by arrows.

Three words in that sentence are worth unpacking:

- A **process** is any series of steps that turns a starting situation into a result — approving a leave request, onboarding a new employee, refunding a customer.
- A **processing flow** is the path that work or data takes through a system — for example, what the app does after you tap "Pay".
- An **algorithm** is just a precise, step-by-step recipe for solving a problem — so precise that a computer could follow it.

A flowchart helps you:
- Understand and communicate a business process.
- Spot redundant steps and bottlenecks.
- Document a process.
- Describe logic for developers.

### Why a picture beats a paragraph

Read this sentence: "If the customer is a member and the order is above 500,000 VND, apply 10% off, unless a voucher is already used, in which case apply whichever is bigger." Now try to explain it to a colleague. Most people get lost. Drawn as a flowchart, the same rule becomes three diamonds and a few boxes — and the missing case (what if the customer is *not* a member?) jumps out immediately, because one arrow has nowhere to go.

That is the real superpower of a flowchart: **it makes gaps visible**. Text lets you skip a case without noticing; a diagram does not.

### Who uses flowcharts at work?

- A **BA (Business Analyst)** — the person who translates what the business wants into requirements for the IT team — draws flowcharts to agree on "how it works today" and "how it should work".
- **Developers** read them to understand logic and conditions before writing code.
- **Testers** turn each path through the chart into a test case.
- **Managers and operations staff** use them for training and procedures ("what to do when a customer complains").

> **Common misconception:** "Flowcharts are only for programmers." In fact, most flowcharts in a company describe business work — approvals, hand-offs, complaints — and contain no code at all.

---

## 2. Standard Symbols (ISO 5807)

**Analogy:** road signs. A red octagon means "stop" in almost every country, so drivers do not need to read the text. Flowchart symbols work the same way: the **shape** tells you what kind of step it is before you even read the words inside.

These shapes come from an international standard called **ISO 5807** (a standard is simply an agreed rulebook, published so everyone draws the same way).

| Symbol | Shape | Meaning |
|---------|-----------|---------|
| **Terminal** | Oval/rounded | The start or end point |
| **Process** | Rectangle | A processing step or action |
| **Decision** | Diamond | A decision point (Yes/No, If/Else) |
| **Input/Output** | Parallelogram | Data input/output |
| **Connector** | Small circle | A link between sections |
| **Arrow** | Arrow | The direction of the flow |
| **Database** | Cylinder | Data storage |
| **Document** | Rectangle + wave | A document or report |

### Each symbol in plain words

- **Terminal (oval):** the "Start" and "End" of the story. Every flowchart has exactly one Start and at least one End.
- **Process (rectangle):** something is *done* — "Calculate total", "Send email", "Manager signs form". Use a verb.
- **Decision (diamond):** a question with a fixed set of answers, usually Yes/No. The flow splits here. The question goes inside: "Stock available?"
- **Input/Output (parallelogram):** information comes in or goes out — the user types a password, the screen shows a message, the ATM prints a receipt.
- **Connector (small circle):** a "continued at A" marker. When a chart is too big for one page, you put circle **A** at the bottom of page 1 and circle **A** at the top of page 2.
- **Arrow:** shows the order. Without arrows, boxes are just a list.
- **Database (cylinder):** data is saved or read from storage — "Save order to database".
- **Document (rectangle with wavy bottom):** a paper or file is produced — an invoice, a report, a contract.

### How the shapes look in text

Many examples in this lesson are drawn with plain characters. Here is the legend:

```text
( Start )        Terminal  — oval
[ Do X ]         Process   — rectangle
◇ Question? ◇    Decision  — diamond
/ Input /        Input/Output — parallelogram
[( Database )]   Database  — cylinder
(A)              Connector — small circle
──▶  │  ▼        Arrows
```

> **Common misconception:** "Colours carry meaning." In standard flowcharts, only the **shape** matters. Colours are fine for readability, but a reader should understand the chart in black and white.

---

## 3. Reading a Flowchart: Everyday Examples

The fastest way to learn the symbols is to follow some charts about things you already know. Put your finger on **Start** and follow the arrows.

### Example 1: Making a cup of Vietnamese phin coffee

```text
          ( Start )
              │
              ▼
       [ Boil water ]
              │
              ▼
   [ Put coffee in the phin ]
              │
              ▼
   [ Pour hot water, wait 4 min ]
              │
              ▼
       ◇ Want milk? ◇ ──No───────┐
              │ Yes              │
              ▼                  │
   [ Add condensed milk ]        │
              │                  │
              ▼                  │
     [ Stir and serve ] ◀────────┘
              │
              ▼
           ( End )
```

What to notice:

1. It starts and ends with an oval.
2. Each rectangle is one action, written as a verb.
3. The diamond asks one question and has **two** exits — Yes and No. Both exits eventually reach the End. Nobody is left standing in the kitchen wondering what to do.

### Example 2: Withdrawing cash from an ATM

```text
            ( Start )
                │
                ▼
         / Insert card /
                │
                ▼
          / Enter PIN /
                │
                ▼
       ◇ PIN correct? ◇ ──No──▶ / Show "Wrong PIN" / ──▶ [ Return card ] ──▶ ( End )
                │ Yes
                ▼
        / Enter amount /
                │
                ▼
     ◇ Enough balance? ◇ ──No──▶ / Show "Insufficient funds" / ──▶ [ Return card ] ──▶ ( End )
                │ Yes
                ▼
  [ Deduct amount ] ──▶ [( Bank account DB )]
                │
                ▼
    / Dispense cash and card /
                │
                ▼
            ( End )
```

What to notice:

- **Parallelograms** are used wherever information crosses between you and the machine: you type a PIN (input), the screen shows a message (output), the machine gives out cash (output).
- The **cylinder** shows that the balance is stored in the bank's database, and the "Deduct amount" step updates it.
- There are **three** End points. That is allowed — what matters is that every path ends somewhere.

> **Try it yourself:** pick a routine you do every day — locking up the house, paying a bill in your banking app — and sketch it on paper with only ovals, rectangles, diamonds and arrows. Then ask: "Does every diamond have a Yes and a No? Does every path reach an End?" You will probably find at least one case you forgot.

---

## 4. Rules for Drawing Flowcharts

1. **Start and end** with an oval (Terminal).
2. **Arrows** show the direction of the flow, usually top-to-bottom or left-to-right.
3. A **Decision** must have at least 2 outgoing branches (Yes/No or True/False).
4. **Each step** has one clear purpose.
5. **Avoid crossing** connector lines.

### The rules explained

- **Every branch must lead to an End.** This is the most important check. If a decision's "No" arrow stops in the middle of nowhere, the reader — and later the developer — has to guess what happens. In real projects this is where bugs come from.
- **One purpose per box.** "Check stock and send email" is two steps. Split it, because each may fail separately.
- **Label every arrow that leaves a diamond** (Yes/No, or the condition such as "> 500k").
- **Write questions, not statements, in diamonds:** "Paid?" rather than "Payment".
- **Use connectors (A, B, C…) when the chart is too large for one page**, instead of long arrows snaking across the paper.
- **Pick the right level of detail.** For managers, a high-level chart of 8–10 boxes is enough. For developers, the chart must be detailed enough that they understand every condition without guessing — but it should not try to describe each line of code.

### Loops: going back to an earlier step

A **loop** means "repeat some steps until a condition changes". There is no special loop symbol: you draw it as an **arrow from a decision back to an earlier step**.

Classic example — **login with a maximum of 3 failed attempts**:

```text
               ( Start )
                   │
                   ▼
          [ Set attempts = 0 ]
                   │
                   ▼
    ┌──▶ / Enter username + password /
    │              │
    │              ▼
    │      ◇ Correct? ◇ ──Yes──▶ [ Open home page ] ──▶ ( End )
    │              │ No
    │              ▼
    │    [ attempts = attempts + 1 ]
    │              │
    │              ▼
    │     ◇ attempts < 3? ◇ ──No──▶ [ Lock account ] ──▶ / Show "Account locked" / ──▶ ( End )
    │              │ Yes
    │              ▼
    └──── / Show "Wrong password, try again" /
```

Walk through it:

1. The counter starts at 0.
2. The user types a wrong password → counter becomes 1 → 1 < 3, so "try again" and loop back.
3. Wrong again → 2 → still < 3 → loop back.
4. Wrong a third time → 3 → **not** < 3 → the account is locked and the flow ends.

Notice the loop is guaranteed to finish, because the counter grows each time. A loop with no way out is called an **infinite loop** — a classic bug.

### Real-life work example

A tester receives this chart and writes one test case **per path**: "correct on first try", "wrong once then correct", "wrong twice then correct", "wrong three times → locked". If the chart had forgotten the "locked" branch, the tester would raise a question in the ticket: *"What happens after the 3rd failed attempt? Spec doesn't say."* That one question can save days of rework.

---

## 5. Example: Online Ordering Process

Now a business process you have used as a customer: buying something online.

```text
[Start]
    ↓
[Customer selects a product]
    ↓
[Add to cart]
    ↓
◆ Logged in yet? ──No──→ [Prompt to log in] ──→ ◆ Login successful?
    ↓ Yes                                                   ↓ No → [Show error] → [End]
[Enter shipping address]                                   ↓ Yes
    ↓                                                  [Enter shipping address]
[Choose payment method]
    ↓
◆ Enough stock available?
    ↓ Yes              ↓ No
[Process the order]    [Notify out of stock]
    ↓                    ↓
[Send confirmation email] [End]
    ↓
[End]
```

### Reading it step by step

1. The customer picks a product and adds it to the cart (two process boxes).
2. **Decision — "Logged in yet?"** If not, the system asks them to log in. A second decision checks whether login worked; if it fails, an error is shown and that path ends.
3. Once logged in, the customer enters an address and chooses how to pay.
4. **Decision — "Enough stock available?"** This diamond is where the business rule lives. Yes → process the order and send a confirmation email. No → tell the customer the item is out of stock.
5. Every path ends at an End terminal.

### Questions a BA would ask about this chart

Drawing the chart is half the work; questioning it is the other half:

- What happens if payment fails? (There is no "Payment successful?" diamond yet.)
- If stock runs out, do we offer a waiting list or suggest a similar product?
- Is the confirmation email sent before or after payment is captured?

Each question becomes either a new box in the chart or a line in the requirements document.

---

## 6. Swimlane Flowchart

**Analogy:** a swimming pool divided into lanes. Each swimmer stays in their own lane, so you can see at a glance who is where. In a **swimlane flowchart**, each lane belongs to one person, team or system, and every box sits in the lane of whoever does that step.

When a process involves multiple people/departments, use a **Swimlane** to clearly divide responsibilities:

```text
│ Customer      │ Sales staff     │ System          │
│               │                 │                 │
│ Place order ──┼─────────────────┼─▶ Receive order │
│               │                 │        │        │
│               │  Approve order ◀┼────────┘        │
│               │        │        │                 │
│               │        └────────┼─▶ Send email    │
│               │                 │        │        │
│ Receive      ◀┼─────────────────┼────────┘        │
│ confirmation  │                 │                 │
```

A swimlane diagram makes it clearer who does what and avoids confusion over responsibilities.

### Why lanes matter

- **Hand-offs become visible.** Every time an arrow crosses a lane line, work passes from one person to another. Hand-offs are where delays and "I thought you were doing that" happen.
- **Ownership is clear.** If a box sits in the Sales lane, Sales owns it — no debate in the meeting.
- **Waiting time is easier to spot.** If an arrow sits in the "Manager" lane for two days, that is your bottleneck.

Lanes can be vertical (columns, as above) or horizontal (rows). Use a swimlane when a process crosses several roles; for a process one person does alone, a plain flowchart is enough.

---

## 7. Flowchart Drawing Tools

- **draw.io / diagrams.net**: free, web-based.
- **Lucidchart**: paid, feature-rich.
- **Figma**: design combined with diagramming.
- **Microsoft Visio**: popular in enterprises.
- **Mermaid**: write flowcharts as code (markdown-like).

### Which one should a beginner use?

Start with **draw.io** (also called diagrams.net): it is free, runs in the browser, needs no account, and has all the standard shapes in a "Flowchart" panel on the left. Lucidchart and Visio feel similar but are paid; companies often already have licences. **Mermaid** is different: instead of dragging shapes, you type a short text description and the tool draws the chart for you. Developers like it because the chart can live next to the code and documentation.

A tiny Mermaid example (the coffee chart above):

```text
flowchart TD
    A([Start]) --> B[Boil water]
    B --> C{Want milk?}
    C -- Yes --> D[Add condensed milk]
    C -- No --> E[Stir and serve]
    D --> E
    E --> F([End])
```

`([ ])` draws an oval, `[ ]` a rectangle and `{ }` a diamond.

> **Try it yourself:** open `https://app.diagrams.net` in any browser (Windows or macOS), choose "Device" when asked where to save, and create a blank diagram. In the left panel, search for "flowchart" and drag in an oval, a rectangle and a diamond. Hover over a shape and drag one of the small blue arrows to connect it to the next. Redraw the ATM example from Section 3 — it takes about 10 minutes.

> **Try it yourself (Mermaid):** open `https://mermaid.live`, delete the sample text, and paste the Mermaid example above. The chart appears on the right instantly. Change "Want milk?" to "Want sugar?" and watch it update.

---

## 8. Flowchart vs BPMN

**Analogy:** a hand-drawn map versus an official city map. The hand-drawn map is quick and anyone can read it. The official map has a legend with dozens of standard symbols — bus stops, one-way streets, hospitals — and is precise enough for professionals to plan with.

**BPMN (Business Process Model and Notation)** is the "official map" for business processes. It is maintained by a standards body called **OMG (Object Management Group)**.

| | Flowchart | BPMN |
|--|-----------|------|
| **Purpose** | General purpose | Specific business processes |
| **Complexity** | Simple | More complex and detailed |
| **Users** | Everyone | BAs, process engineers |
| **Standard** | ISO 5807 | OMG BPMN 2.0 |

### What BPMN adds

BPMN has a richer, standardized set of symbols for things a simple flowchart cannot express clearly:

- **Events** (drawn as circles) — "a message arrives", "a timer fires after 2 days", "an error happens".
- **Messages** between organisations — the customer sends a form to the bank.
- **Sub-processes** — a box that hides a whole smaller process inside it.
- **Gateways** (diamonds with markers) — including "do these steps in parallel".

Some tools can even run BPMN diagrams as workflows automatically.

### Which should you use?

- To explain an idea in a meeting, train new staff or describe a screen's logic → **flowchart**.
- To model a complex, cross-department business process precisely (with timers, messages, parallel work) → **BPMN**.

Many BAs start with a flowchart to agree on the idea, then convert it to BPMN if the process needs formal modelling.

---

## 9. Summary

- **Oval**: start/end.
- **Rectangle**: processing step.
- **Diamond**: decision.
- **Parallelogram**: input/output.
- **Cylinder**: database; **small circle**: connector to another page.
- **Swimlane**: divides responsibilities by role.
- Every decision needs at least two labelled branches, and **every branch must reach an End**.
- A **loop** is an arrow from a decision back to an earlier step — make sure it can finish.
- Use draw.io to start; Mermaid if you prefer writing text; BPMN for complex, formal business processes.
- A flowchart is a communication tool — draw it in enough detail to avoid misunderstanding.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Flowchart | A picture of a process: shapes for steps, arrows for order |
| Process | A series of steps that produces a result |
| Algorithm | A precise step-by-step recipe a computer could follow |
| Terminal | The oval marking Start or End |
| Decision | A diamond with a question; the flow splits by the answer |
| Input/Output | A parallelogram: information entering or leaving |
| Connector | A small circle linking parts of a chart across pages |
| Loop | Repeating steps by pointing an arrow back to an earlier step |
| Swimlane | Lanes that show which person or team does each step |
| BPMN | A richer, formal standard notation for business processes |
