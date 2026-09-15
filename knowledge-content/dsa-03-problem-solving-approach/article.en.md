# Problem Solving Approach – From Blank Page to Working Code

## 1. What is an algorithm?

An **algorithm** is a process, or a set of steps, that accomplishes a certain task. A recipe is an algorithm; so is the function that sorts your inbox by date. Almost everything you do as a programmer — validating a form, paginating results, deduplicating a list — involves one. That is why algorithms matter:

- They are the foundation of **solving problems** as a developer: turning a vague requirement into exact steps a machine can follow.
- They are the core of **technical interviews**, where you are handed an unfamiliar problem and a blank editor.

An algorithm is not the same as its code. The same algorithm can be written in JavaScript, Python or pseudocode; what defines it is the **sequence of steps**, and what we judge it by is correctness first, then efficiency (Big O, from topic 1).

---

## 2. How do you get better at it?

There are two complementary ways to improve:

1. **Devise a plan for solving problems** — a repeatable process you run every time, so you are never staring at a blank page. That is this topic.
2. **Master common problem-solving patterns** — frequency counters, multiple pointers, sliding windows, divide and conquer. That is the next topic.

The process below is not a magical, fail-safe recipe — but it is reliably helpful. It is adapted from mathematician George Pólya's classic book *How to Solve It*:

```text
+-------------+   +-------------+   +--------------+   +----------------+   +-----------------+
| 1 Understand| → | 2 Explore   | → | 3 Break it   | → | 4 Solve /      | → | 5 Look back &   |
|  the problem|   |  examples   |   |   down       |   |   simplify     |   |   refactor      |
+-------------+   +-------------+   +--------------+   +----------------+   +-----------------+
       ^                                                                             |
       +------------ an example fails or a new question appears: loop back ----------+
```

The steps are not strictly linear: examples often reveal that you did not understand the problem, and refactoring may expose a bug. Looping back is the process working, not failing.

---

## 3. Step 1 – Understand the problem

Before writing any code, answer five questions:

1. **Can I restate the problem in my own words?** If you cannot explain it simply, you do not understand it yet.
2. **What are the inputs?** Types, sizes, ranges, whether they can be empty or missing.
3. **What are the outputs?** Type and shape of the result — a number, a new array, a mutated array, an object?
4. **Can the outputs be determined from the inputs?** Do I have enough information? You may not be able to answer this until you start solving — that is fine, it is still worth asking.
5. **How should I label the important pieces of data?** Good names (`nums`, `target`, `counts`) make the rest of the thinking and the code clearer.

In an interview these questions become **clarifying questions** you ask out loud. The interviewer often leaves details out on purpose, to see whether you notice.

---

## 4. Understanding in practice: "add two numbers"

Take the simplest possible prompt: *write a function that takes two numbers and returns their sum.* It looks like there is nothing to understand. Run the five questions anyway:

| Question | What it uncovers |
|---|---|
| Restate | "Given two numbers, return one number equal to their sum." |
| Inputs | Integers only, or floats? How large? Could a string like `"2"` arrive? Always exactly two arguments? |
| Outputs | A `number`? A `string` for huge values? What precision for floats? |
| Enough info? | Yes for small integers; not yet for huge numbers or invalid input. |
| Labels | `add(a, b)` returns `sum`. |

Each unanswered question hides a real bug:

```js
0.1 + 0.2;                     // 0.30000000000000004 (floating point)
9007199254740992 + 1;          // 9007199254740992 (past Number.MAX_SAFE_INTEGER)
9007199254740992n + 1n;        // 9007199254740993n (BigInt is exact)
"2" + 3;                       // "23" (string concatenation, not addition)
```

The lesson: even a trivial problem has decisions about **input types, ranges and edge cases**. Surfacing them first is cheaper than discovering them after the code is written.

---

## 5. Step 2 – Explore concrete examples

Coming up with examples helps you **understand the problem better**, and it gives you **sanity checks** that your eventual solution works. In professional work, examples take the form of **user stories** and **unit tests**.

Work through examples in this order:

1. **Simple examples** — the smallest cases that show the basic behaviour.
2. **More complex examples** — mixed cases that force decisions.
3. **Empty inputs** — `""`, `[]`, `{}`: what should come back?
4. **Invalid inputs** — `null`, `undefined`, a number where a string was expected: throw, or return something safe?

Examples are also the fastest way to resolve ambiguity: instead of asking "should case matter?", write `"Hello"` and ask "does this give `h: 1` or `H: 1`?"

---

## 6. Examples for "count characters"

The running problem for the rest of this topic: *write a function that takes a string and returns a count of each character in the string.*

| Input | Expected output | Decision it forces |
|---|---|---|
| `charCount("aaaa")` | `{ a: 4 }` | Basic shape: an object of counts |
| `charCount("hello")` | `{ h: 1, e: 1, l: 2, o: 1 }` | Only characters present, no zero entries for the rest of the alphabet |
| `charCount("Hello hi")` | `{ h: 2, e: 1, l: 2, o: 1, i: 1 }` | Case-insensitive; spaces ignored |
| `charCount("Your PIN is 1234!")` | `{ y: 1, o: 1, u: 1, r: 1, p: 1, i: 2, n: 1, s: 1, 1: 1, 2: 1, 3: 1, 4: 1 }` | Digits count, punctuation does not |
| `charCount("")` | `{}` | Empty input returns an empty object |
| `charCount(null)` | throw `TypeError` (or `{}`) | Agree on invalid input behaviour |

A handful of examples turned "count each character" into a precise spec: **lowercase letters and digits only, only present keys, empty object for empty string**. These examples can later be pasted straight into tests:

```js
import assert from "node:assert/strict";

assert.deepEqual(charCount("aaaa"), { a: 4 });
assert.deepEqual(charCount("Hello hi"), { h: 2, e: 1, l: 2, o: 1, i: 1 });
assert.deepEqual(charCount(""), {});
```

---

## 7. Step 3 – Break it down

**Explicitly write out the steps you need to take** before writing real code. This forces you to think about logic before syntax and catches misunderstandings while they are cheap to fix. In an interview it also lets the interviewer correct your plan before you spend fifteen minutes coding the wrong thing.

Pseudocode as comments works well:

```js
function charCount(str) {
  // make an object to return at the end
  // loop over the string; for each character:
  //   if the char is a letter/digit AND already a key, add one to its count
  //   if the char is a letter/digit AND not a key yet, add it with a count of 1
  //   if the char is anything else (space, punctuation), do nothing
  // return the object at the end
}
```

Notice the plan already answers the decisions from the examples. If a step feels vague ("handle the weird characters"), that is exactly where the difficulty lies — which leads to the next step.

---

## 8. Step 4 – Solve, or solve a simpler problem

If you can solve the problem, solve it. **If you can't, solve a simpler problem.** Simplifying is a deliberate technique:

1. **Find the core difficulty** in what you are trying to do.
2. **Temporarily ignore that difficulty.**
3. **Write a simplified solution.**
4. **Then incorporate the difficulty back in.**

For `charCount`, the fiddly parts are case and deciding what counts as alphanumeric. Ignore both and count *every* character:

```js
// Simplified: counts every character, case-sensitive
function charCountSimple(str) {
  const result = {};

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (result[char] > 0) {
      result[char]++;
    } else {
      result[char] = 1;
    }
  }

  return result;
}

charCountSimple("Hi!"); // { H: 1, i: 1, "!": 1 }
```

Now add the difficulty back — lowercase each character and skip anything that is not a letter or digit:

```js
function charCount(str) {
  const result = {};

  for (let i = 0; i < str.length; i++) {
    const char = str[i].toLowerCase();

    if (/[a-z0-9]/.test(char)) {
      if (result[char] > 0) {
        result[char]++;
      } else {
        result[char] = 1;
      }
    }
  }

  return result;
}
```

A working partial solution beats a perfect one that never gets written, and progress on the easy part often makes the hard part obvious.

---

## 9. Step 5 – Look back and refactor

Congratulations on solving it — but you are not done. Ask the **refactoring questions**:

| Question | What it means in practice |
|---|---|
| Can you check the result? | Re-run every step 2 example, especially empty and invalid inputs. |
| Can you derive the result differently? | Does another approach (sorting, a `Map`) agree? |
| Can you understand it at a glance? | Clear names, shallow nesting, no unexplained tricks. |
| Can you use the result or method for some other problem? | "Counting into an object" also solves anagrams and duplicates. |
| Can you improve the performance? | Time and space Big O; hidden O(n) calls inside loops. |
| Can you think of other ways to refactor? | Helper functions, early returns, modern syntax. |
| How have other people solved this problem? | Read other solutions afterwards to learn idioms. |

---

## 10. Refactoring "count characters"

Applying those questions to the step 4 solution:

- `for...of` removes index bookkeeping.
- `(result[char] || 0) + 1` collapses the if/else into one line.
- A helper `isAlphaNumeric` makes the intent readable at a glance.
- `charCodeAt` range checks avoid a regular expression per character. Regex tests are often measured slightly slower in loops, but this varies by engine — profile before assuming.

```js
function charCount(str) {
  const result = {};

  for (const char of str) {
    if (isAlphaNumeric(char)) {
      const key = char.toLowerCase();
      result[key] = (result[key] || 0) + 1;
    }
  }

  return result;
}

function isAlphaNumeric(char) {
  const code = char.charCodeAt(0);

  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) // a-z
  );
}
```

Look back at complexity too:

| Version | Time | Auxiliary space |
|---|---|---|
| Simplified / regex / refactored | O(n), one pass over the string | O(k) for k distinct keys — at most 36 here, so effectively O(1) |

Refactoring did not change the Big O; it improved **readability** and constant factors. That is normal — not every refactor is about complexity.

---

## 11. The whole process on a second problem

*Write a function that returns the second largest number in an array.*

**Understand.** Input: array of numbers. Output: a number, or something for "no answer". Unclear: does `[5, 5, 3]` return `5` or `3`? Assume **distinct** values, so `3`.

**Examples.**

| Input | Output |
|---|---|
| `[3, 8, 5]` | `5` |
| `[5, 5, 3]` | `3` |
| `[-2, -7]` | `-7` |
| `[4]` or `[4, 4]` | `null` |
| `[]` | `null` |

**Break down and solve (brute force first).** Remove duplicates, sort descending, take index 1:

```js
function secondLargestSort(nums) {
  const unique = [...new Set(nums)].sort((a, b) => b - a);

  return unique.length >= 2 ? unique[1] : null;
}
// O(n log n) time (sort), O(n) space (Set + new array)
```

The comparator matters: default `sort()` compares elements as strings, so `[5, 10, 1].sort()` returns `[1, 10, 5]`.

**Look back — can performance improve?** We only need the top two values, so one pass tracking them is enough:

```js
function secondLargest(nums) {
  let first = -Infinity;
  let second = -Infinity;

  for (const x of nums) {
    if (x > first) {
      second = first;
      first = x;
    } else if (x < first && x > second) {
      second = x;
    }
  }

  return second === -Infinity ? null : second;
}
// O(n) time, O(1) space
```

Dry-run it on `[3, 8, 8, 5]` to check the result by hand:

```text
x   | x > first? | x < first && x > second? | first | second
----+------------+--------------------------+-------+-------
3   | yes        | -                        | 3     | -Inf
8   | yes        | -                        | 8     | 3
8   | no         | no (8 is not < 8)        | 8     | 3
5   | no         | yes                      | 8     | 5
                                               return 5
```

---

## 12. Using the process in an interview

A rough budget for a 45-minute problem:

| Phase | Time | What the interviewer sees |
|---|---|---|
| Understand + clarify | 3–5 min | A restatement and questions about inputs, outputs, edge cases |
| Examples | 3–5 min | A few cases, including empty/invalid |
| Break down | ~5 min | A plan, the brute force and its Big O |
| Solve | 15–20 min | Code that follows the plan |
| Look back | 5–10 min | A dry run, complexity, possible optimisation |

Habits that separate strong candidates:

- **Think aloud.** A narrated wrong turn can be rescued by a hint; a silent one cannot.
- **State the brute force and its complexity first**, then optimise. A working O(n²) beats an unfinished O(n).
- **Stuck? Simplify out loud:** "Let me ignore duplicates for now and come back to them."
- **Test by tracing**, not just by saying "looks right". Walk one normal and one edge-case example line by line.

Common mistakes: coding immediately, assuming inputs are valid and non-empty, silently changing the problem, forgetting to state space complexity, and stopping at the first solution without looking back.

---

## Key interview points

- An **algorithm** is a set of steps that accomplishes a task; judge it by correctness, then efficiency.
- The 5 steps: **understand → explore examples → break it down → solve/simplify → look back & refactor** (adapted from Pólya's *How to Solve It*).
- Understanding means knowing **inputs, outputs, whether you have enough information, and names** — ask clarifying questions out loud.
- Examples go **simple → complex → empty → invalid**; they double as your test cases.
- Write **pseudocode** before code so the interviewer can correct the plan early.
- When stuck, **solve a simpler problem**: ignore the core difficulty, solve the rest, then add it back.
- Always **look back**: dry-run examples, state time and space Big O, and consider a better approach.
- Give a **brute force first**, then optimise (e.g. sort O(n log n) → single pass O(n)).

## Summary

- Improving at algorithms means having a **plan** (this topic) and knowing **patterns** (next topic).
- Step 1 turns a vague prompt into explicit inputs, outputs and labels; even "add two numbers" hides type and range questions.
- Step 2 builds concrete examples that pin down behaviour and later become unit tests.
- Step 3 writes the steps down; step 4 solves them, simplifying first if needed.
- Step 5 checks, reads, measures and refactors — `charCount` became clearer with the same O(n) time, and `secondLargest` went from O(n log n) to O(n).
- The process loops: a failing example or a new question sends you back to an earlier step.
