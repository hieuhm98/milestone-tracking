# Big O Notation – Measuring Algorithm Efficiency

## 1. Why we need Big O

Most problems can be solved in many ways. Take "write a function that returns a reversed copy of a string": you could loop backwards, use `split('').reverse().join('')`, recurse, or build the result with a stack. All of them are correct — so which one is **best**?

"Better" can mean several things:

- **Faster** — fewer steps as the input grows (time complexity).
- **Less memory** — less extra storage while running (space complexity).
- **More readable** — easier for humans to maintain.

This topic focuses on the first two. Big O gives us a **precise, shared vocabulary** for how code performs. It lets you:

- Discuss trade-offs between approaches objectively.
- Find the part of a slow program that is actually the bottleneck.
- Answer the question that opens almost every coding interview: "What is the complexity of your solution?"

A classic example: sum all numbers from 1 to `n`.

```js
// Version A: loop
function addUpToLoop(n) {
  let total = 0;

  for (let i = 1; i <= n; i++) {
    total += i;
  }

  return total;
}

// Version B: Gauss's formula
function addUpToFormula(n) {
  return (n * (n + 1)) / 2;
}
```

Why is the formula correct? Write the sum forwards and backwards and add the two rows:

```text
  S = 1     + 2     + 3     + ... + n
+ S = n     + (n-1) + (n-2) + ... + 1
-----------------------------------------
 2S = (n+1) + (n+1) + (n+1) + ... + (n+1)   <- n copies
 2S = n(n+1)   =>   S = n(n+1) / 2
```

Both return the same answer. Big O is how we explain precisely why Version B is better.

---

## 2. Why not just use a timer?

The obvious idea is to measure it:

```js
const t1 = performance.now();
addUpToLoop(1_000_000_000);
const t2 = performance.now();
console.log(`Time elapsed: ${(t2 - t1) / 1000} seconds`);
```

This is useful for profiling real code, but it is a poor way to **compare algorithms**:

- **Different machines** record different times (CPU, memory, other load).
- **The same machine** records different times on each run (JIT warm-up, garbage collection, OS scheduling).
- **Fast algorithms** may finish too quickly to measure precisely.
- A timing tells you about **one input size**; it does not say what happens when `n` grows 1000×.

We want a measure that depends only on the **algorithm**, not on the hardware.

---

## 3. Counting simple operations

Instead of seconds, count the **simple operations** the computer performs.

```text
function addUpToFormula(n) {
  return n * (n + 1) / 2;     1 multiplication, 1 addition, 1 division
}                             => 3 operations, whatever n is
```

```text
function addUpToLoop(n) {
  let total = 0;                    1 assignment
  for (let i = 1; i <= n; i++) {    1 assignment, n comparisons, n increments
    total += i;                     n additions + n assignments
  }
  return total;
}
```

Depending on what you count, the loop version does anywhere from about `2n` to `5n + 2` operations. The exact number is not important. What matters is the **trend**: the work grows **proportionally with n**. Double `n` and the work roughly doubles. The formula version does the same 3 operations for `n = 5` and for `n = 5 billion`.

---

## 4. The definition of Big O

Big O formalises this fuzzy counting. It describes **how the running time (or memory) grows as the input grows**, ignoring details.

> An algorithm is **O(f(n))** if the number of simple operations is **eventually less than a constant times f(n)** as n increases.

Formally: there exist constants `c > 0` and `n₀` such that for all `n ≥ n₀`, `ops(n) ≤ c · f(n)`.

Applied to our examples:

| Function | Operations | Big O |
|---|---|---|
| `addUpToFormula` | always 3 | **O(1)** — constant |
| `addUpToLoop` | ≈ 5n + 2 ≤ 6n for n ≥ 2 | **O(n)** — linear |

Two things to note:

- **Big O is an upper bound.** Technically a linear algorithm is also O(n²), but we always quote the **tightest** bound, because that is the useful one.
- Related notations exist: **Ω (Omega)** is a lower bound and **Θ (Theta)** is a tight bound (both upper and lower). In interviews and industry, "Big O" is normally used loosely to mean the tight bound.

---

## 5. Simplifying Big O expressions

Because Big O only cares about growth for large `n`, two rules follow directly from the definition.

**Constants don't matter:**

| Expression | Simplifies to |
|---|---|
| O(2n) | O(n) |
| O(500) | O(1) |
| O(13n²) | O(n²) |

**Smaller terms don't matter** — keep only the fastest-growing term:

| Expression | Simplifies to |
|---|---|
| O(n + 10) | O(n) |
| O(1000n + 50) | O(n) |
| O(n² + 5n + 8) | O(n²) |

At `n = 1,000,000`, `n²` is 10¹² while `5n` is 5 × 10⁶ — the small term is noise.

**Different inputs get different variables.** This rule is a frequent interview trap:

```js
function printBoth(arrA, arrB) {
  for (const a of arrA) console.log(a);  // O(a)

  for (const b of arrB) console.log(b);  // O(b)
}
// Total: O(a + b), NOT O(n) and NOT O(2n)

function printPairs(arrA, arrB) {
  for (const a of arrA) {
    for (const b of arrB) console.log(a, b);
  }
}
// Total: O(a * b)
```

You cannot drop `b` in `O(a + b)`: you don't know which input is larger.

---

## 6. Rules of thumb for analysing code

These shorthands work for most everyday code:

1. **Arithmetic operations** are constant.
2. **Variable assignment** is constant.
3. **Accessing an array element by index** or an **object property by key** is constant.
4. **In a loop**, the complexity is the **number of iterations × the cost of the loop body**.
5. **Sequential blocks add**; **nested blocks multiply**.

```js
function countUpAndDown(n) {
  for (let i = 0; i < n; i++) {
    console.log(i);           // O(n)
  }

  for (let j = n - 1; j >= 0; j--) {
    console.log(j);           // O(n)
  }
}
// O(n) + O(n) = O(2n) = O(n)

function printAllPairs(n) {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      console.log(i, j);      // O(n) work inside an O(n) loop
    }
  }
}
// O(n * n) = O(n²)
```

Watch the loop **bound**, not just the presence of a loop:

```js
function logAtLeast5(n) {
  for (let i = 1; i <= Math.max(5, n); i++) console.log(i);
}
// Grows with n -> O(n)

function logAtMost5(n) {
  for (let i = 1; i <= Math.min(5, n); i++) console.log(i);
}
// Never more than 5 iterations -> O(1)
```

---

## 7. Common complexity classes

From slowest-growing (fastest algorithm) to fastest-growing (slowest algorithm):

| Big O | Name | Typical example |
|---|---|---|
| O(1) | Constant | Array index access, hash map lookup, `push`/`pop` |
| O(log n) | Logarithmic | Binary search, balanced BST lookup |
| O(n) | Linear | Single loop, linear search |
| O(n log n) | Linearithmic | Merge sort, heap sort, efficient sorting |
| O(n²) | Quadratic | Nested loops over the same input, bubble sort |
| O(2ⁿ) | Exponential | Naive recursive Fibonacci, all subsets |
| O(n!) | Factorial | All permutations, brute-force travelling salesman |

How many operations for different `n`:

| n | log n | n log n | n² | 2ⁿ |
|---|---|---|---|---|
| 10 | ~3 | ~33 | 100 | 1,024 |
| 1,000 | ~10 | ~10,000 | 1,000,000 | ≈ 10³⁰¹ |
| 1,000,000 | ~20 | ~20,000,000 | 10¹² | unthinkable |

A rough budget: modern machines do around 10⁸ simple operations per second. With `n = 10⁵`, O(n log n) is instant, while O(n²) needs ~10¹⁰ operations — far too slow.

---

## 8. Logarithms

Besides O(1), O(n) and O(n²), the expression that shows up most is the **logarithm**.

`log₂(value) = exponent` means `2^exponent = value`. For example `log₂(8) = 3` because `2³ = 8`. In computer science, `log` means **log base 2** by default (and the base does not matter for Big O anyway, since logs of different bases differ only by a constant factor).

**Rule of thumb:** the logarithm of a number is roughly **how many times you can divide it by 2 before you reach a value ≤ 1**.

```text
 8  ÷2 -> 4  ÷2 -> 2  ÷2 -> 1            3 halvings  => log(8)  = 3
25  ÷2 -> 12.5 ÷2 -> 6.25 ÷2 -> 3.125
    ÷2 -> 1.5625 ÷2 -> 0.78125           ~5 halvings => log(25) ≈ 4.64
```

So whenever an algorithm **halves the remaining work each step**, it is O(log n):

```js
function countHalvings(n) {
  let steps = 0;

  while (n > 1) {
    n = Math.floor(n / 2);
    steps++;
  }

  return steps;
}

countHalvings(1_000_000); // 19 -> a million items need only ~20 steps
```

The same holds for multiplying by 2 until you reach `n` (`for (let i = 1; i < n; i *= 2)`) — also O(log n).

---

## 9. Where logarithms and exponentials appear

**O(log n)** — "cut the problem in half":
- Binary search on a sorted array.
- Search / insert in a balanced binary search tree.
- Insert / extract in a binary heap.

**O(n log n)** — "do O(log n) levels of O(n) work", or "O(log n) work for each of n items":
- Merge sort: the array is split in half `log n` times, and each level merges `n` elements.
- Comparison sorting cannot beat O(n log n) in the general case.

```js
function nLogN(n) {
  for (let i = 0; i < n; i++) {           // n times
    for (let j = 1; j < n; j *= 2) {      // log n times
      console.log(i, j);
    }
  }
}
// O(n log n)
```

**Log in space** — recursion that halves its input (e.g. recursive binary search) keeps only `log n` frames on the call stack, so it uses O(log n) space.

**O(2ⁿ)** — each call branches into two calls:

```js
function fib(n) {
  if (n <= 1) return n;

  return fib(n - 1) + fib(n - 2);
}
// Roughly O(2^n) time: the call tree doubles at each level
```

```text
                fib(4)
             /          \
        fib(3)          fib(2)
       /     \          /    \
   fib(2)  fib(1)   fib(1)  fib(0)
   /    \
fib(1) fib(0)
```

`fib(2)` is computed twice already; by `fib(40)` there are hundreds of millions of calls. Dynamic programming fixes this later in the course.

---

## 10. Space complexity

So far we have measured time. Big O can also describe **space complexity**: how much memory the algorithm needs as the input grows.

**Auxiliary space complexity** is the space the algorithm allocates **not counting the input itself**. Unless stated otherwise, "space complexity" in interviews means auxiliary space — otherwise every function that receives an array would be at least O(n).

Rules of thumb in JavaScript:

| Value | Space |
|---|---|
| Most primitives: `boolean`, `number`, `undefined`, `null` | O(1) |
| Strings | O(n), n = string length |
| Arrays | O(n), n = length |
| Objects / Maps | O(n), n = number of keys |

Also count **the call stack**: each pending recursive call holds a stack frame, so recursion depth `d` costs O(d) space.

---

## 11. Space complexity examples

**O(1) space** — only a fixed number of variables, however long the array is:

```js
function sum(arr) {
  let total = 0;                          // one number

  for (let i = 0; i < arr.length; i++) {  // another number
    total += arr[i];
  }

  return total;
}
// Time O(n), space O(1)
```

**O(n) space** — the new array grows with the input:

```js
function double(arr) {
  const newArr = [];

  for (let i = 0; i < arr.length; i++) {
    newArr.push(2 * arr[i]);              // n numbers stored
  }

  return newArr;
}
// Time O(n), space O(n)
```

**O(n) space with no array at all** — recursion depth:

```js
function sumTo(n) {
  if (n === 0) return 0;

  return n + sumTo(n - 1);
}
// Time O(n), space O(n): n frames wait on the call stack
```

```text
call stack at the deepest point of sumTo(3)
+-----------+
| sumTo(0)  |  <- top, returns 0
| sumTo(1)  |
| sumTo(2)  |
| sumTo(3)  |  <- bottom
+-----------+
```

Time and space often trade off: storing results in a hash map (more space) can turn an O(n²) search into O(n) time.

---

## 12. Best, average, worst case and hidden costs

The same algorithm can behave differently on different inputs. Linear search for a value in an array:

| Case | When | Time |
|---|---|---|
| Best | Target is the first element | O(1) |
| Average | Target somewhere in the middle | O(n) |
| Worst | Target is last or absent | O(n) |

Unless told otherwise, **quote the worst case** — it is the guarantee.

**Amortized** cost averages over a sequence of operations. `arr.push()` is occasionally O(n) when the underlying storage is resized, but **amortized O(1)** over many pushes.

**Hidden loops** are the most common analysis mistake. A single line can hide O(n) work:

```js
function hasDuplicate(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr.slice(i + 1).includes(arr[i])) return true;  // slice + includes are O(n)
  }

  return false;
}
// Looks like one loop, but it is O(n²) time and O(n) extra space

function hasDuplicateFast(arr) {
  const seen = new Set();

  for (const x of arr) {
    if (seen.has(x)) return true;         // O(1) average

    seen.add(x);
  }

  return false;
}
// O(n) time, O(n) space
```

Built-ins with a hidden O(n): `includes`, `indexOf`, `slice`, `concat`, spread `[...arr]`, `shift`/`unshift`, `Object.keys`, and repeated string concatenation in a loop.

---

## Key interview points

- Big O describes **growth rate** as input grows, not exact time; it depends on the algorithm, not the hardware.
- **Drop constants and smaller terms**: O(3n² + 10n) → O(n²).
- **Sequential steps add, nested steps multiply**; different inputs get **different variables** (O(a + b), O(a · b)).
- **Halving the problem each step → O(log n)**; efficient sorting → O(n log n); branching recursion → often O(2ⁿ).
- State **both time and space**; space means **auxiliary** space and includes the **recursion call stack**.
- Quote the **worst case** unless asked; mention amortized cost for dynamic array `push`.
- Look for **hidden loops** in built-in methods (`includes`, `slice`, `indexOf`, spread).
- Know the order: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ) < O(n!).

## Summary

- Timers are unreliable for comparing algorithms, so we **count operations** and look at the trend.
- An algorithm is **O(f(n))** if its operations are eventually bounded by `c · f(n)`.
- Simplify by removing constants and lower-order terms; analyse loops as iterations × body cost.
- Common classes from fast to slow: constant, logarithmic, linear, linearithmic, quadratic, exponential, factorial.
- A logarithm counts how many times you can halve a number before reaching 1.
- **Space complexity** measures extra memory: primitives O(1), strings/arrays/objects O(n), recursion depth O(depth).
