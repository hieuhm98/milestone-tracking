# Dynamic Programming

## 1. What dynamic programming is

**Dynamic programming (DP)** is a method for solving a complex problem by **breaking it down into a collection of simpler subproblems, solving each of those subproblems just once, and storing their solutions**. The next time the same subproblem shows up, you look the answer up instead of recomputing it.

In one sentence: *use past knowledge to make solving a future problem easier*.

The name comes from Richard Bellman in the 1950s, when "programming" meant planning with tables; it has nothing to do with writing dynamic code.

DP is built on **recursion** (reminder: a function calls itself on a smaller input until it hits a base case). Every DP solution starts life as a recursive definition.

DP only works on problems that have **both** of these properties:

| Property | Question to ask |
|---|---|
| **Overlapping subproblems** | Does the same smaller problem get solved again and again? |
| **Optimal substructure** | Can the best answer be built from the best answers of subproblems? |

---

## 2. Overlapping subproblems

A problem has **overlapping subproblems** if it can be broken down into subproblems that are **reused several times**.

The Fibonacci sequence is the classic example: every number after the first two is the sum of the two preceding ones (`1, 1, 2, 3, 5, 8, 13, …`). To get `fib(5)` you need `fib(4)` and `fib(3)`, but `fib(4)` *also* needs `fib(3)`:

```text
                     fib(5)
                  /          \
             fib(4)          fib(3)      <- fib(3) solved here...
            /      \         /     \
       fib(3)    fib(2)  fib(2)  fib(1)  <- ...and again here
       /    \
   fib(2)  fib(1)
```

Compare **merge sort**. Sorting `[10, 24, 76, 73]` splits into `[10, 24]` and `[76, 73]`, then into single elements. Every subproblem is a *different* slice of the array, so nothing is repeated — merge sort is **divide and conquer**, not DP. Caching its results would only waste memory.

```text
         mergeSort([10,24,76,73])
          /                  \
  mergeSort([10,24])    mergeSort([76,73])   <- different subproblems
    /        \            /         \
 [10]       [24]        [76]        [73]
```

---

## 3. Optimal substructure

A problem has **optimal substructure** if an **optimal solution can be constructed from optimal solutions of its subproblems**.

**Shortest path has it.** If the shortest route from A to D is `A -> B -> C -> D`, then `A -> B -> C` must be the shortest route from A to C — otherwise you could swap in a shorter one and improve A to D. This is exactly why Dijkstra's algorithm works.

**Longest simple path does not.** "Simple" means no vertex repeats. Take this undirected graph:

```text
  A --- B --- D
        |
        C
```

- Longest simple path A to C: `A -> B -> C`
- Longest simple path C to D: `C -> B -> D`
- Glue them together: `A -> B -> C -> B -> D` — **B repeats**, so it is not even a valid simple path. The real longest A to D is just `A -> B -> D`.

The best answers of the pieces do not combine into the best answer of the whole, so DP cannot be used directly.

---

## 4. Naive recursive Fibonacci: O(2ⁿ)

The recurrence translates directly into code:

```js
// fib(1) = fib(2) = 1, fib(n) = fib(n - 1) + fib(n - 2)
function fib(n) {
  if (n <= 2) return 1;

  return fib(n - 1) + fib(n - 2);
}
```

It is correct but disastrously slow. Each call spawns two more, so the call tree roughly doubles at every level, and it is about `n` levels deep. Counting calls:

| n | Calls made | Distinct subproblems |
|---|---|---|
| 5 | 9 | 5 |
| 10 | 109 | 10 |
| 20 | 13,529 | 20 |
| 40 | 204,668,309 | 40 |
| 50 | ~25 billion | 50 |

The call count equals `2·fib(n) - 1`, which grows like 1.618ⁿ (the golden ratio). The usual upper bound quoted is **O(2ⁿ) time**. Space is only **O(n)**, because at most `n` frames sit on the call stack at once.

The last column is the key insight: there are only `n` *different* questions. Everything else is repeated work.

---

## 5. Memoization (top-down)

**Memoization** means storing the results of expensive function calls and returning the cached result when the same inputs occur again. You keep the recursive shape and add a lookup:

```js
function fibMemo(n, memo = []) {
  if (memo[n] !== undefined) return memo[n];

  if (n <= 2) return 1;

  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo[n] = result;

  return result;
}

fibMemo(50); // 12586269025, instantly
```

Tracing `fibMemo(6)`: the left spine computes each value once, and every right-hand call is a cache hit.

```text
fibMemo(6)
 +- fibMemo(5)
 |   +- fibMemo(4)
 |   |   +- fibMemo(3)
 |   |   |   +- fibMemo(2) -> 1 (base)
 |   |   |   +- fibMemo(1) -> 1 (base)     memo[3] = 2
 |   |   +- fibMemo(2) -> 1 (base)         memo[4] = 3
 |   +- fibMemo(3) -> 2 (memo hit)         memo[5] = 5
 +- fibMemo(4) -> 3 (memo hit)             memo[6] = 8

memo: [ , , , 2, 3, 5, 8]
```

**Complexity:** each `n` is computed once with O(1) work, so **O(n) time**. Space is **O(n)** for the memo plus **O(n)** recursion depth.

Common bugs:

- **Forgetting to pass `memo` down.** `fibMemo(n - 1)` without the second argument creates a fresh empty cache on every call, silently bringing back O(2ⁿ).
- **A weak "is cached?" test.** `if (memo[n])` fails when a valid answer is `0`. Use `!== undefined`, or a `Map` with `memo.has(key)`.
- **Multi-argument states** need a combined key, e.g. `` memo.get(`${row},${col}`) ``.

---

## 6. Tabulation (bottom-up)

**Tabulation** stores the result of each subproblem in a **table** (usually an array) and fills it **iteratively**, starting from the base cases and working up to `n`.

```js
function fibTable(n) {
  if (n <= 2) return 1;

  const table = [0, 1, 1];

  for (let i = 3; i <= n; i++) {
    table[i] = table[i - 1] + table[i - 2];
  }

  return table[n];
}
```

Filling the table for `fibTable(6)`:

```text
table[3] = table[2] + table[1] = 1 + 1 = 2
table[4] = table[3] + table[2] = 2 + 1 = 3
table[5] = table[4] + table[3] = 3 + 2 = 5
table[6] = table[5] + table[4] = 5 + 3 = 8

index:  0  1  2  3  4  5  6
table: [0, 1, 1, 2, 3, 5, 8]
```

**Complexity:** O(n) time, O(n) space — and no recursion at all.

Because `table[i]` only ever reads the **previous two** cells, you do not need the whole table. Keeping two variables gives **O(1) space**:

```js
function fibConstantSpace(n) {
  if (n <= 2) return 1;

  let prev = 1;
  let curr = 1;

  for (let i = 3; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }

  return curr;
}
```

This "rolling" trick is the main reason people say better space complexity is usually achieved with tabulation.

---

## 7. Top-down vs bottom-up

| | Memoization (top-down) | Tabulation (bottom-up) |
|---|---|---|
| Shape | Recursion + cache | Loop + table |
| Starts from | The original problem `n` | The base cases |
| Order of work | Decided by the recursion | You must choose a valid order |
| Subproblems solved | Only those actually reached | Usually all of them |
| Call stack | O(depth) frames — can overflow | None |
| Space optimisation | Hard | Often easy (rolling variables) |

The stack matters in JavaScript: `fibMemo(100000)` throws `RangeError: Maximum call stack size exceeded`, while the loop version runs fine. (Separately, Fibonacci numbers pass `Number.MAX_SAFE_INTEGER` after `fib(78)`; use `BigInt` for exact large values.)

A practical workflow: write the brute-force recursion, add memoization to make it fast, then convert to tabulation if the stack or memory is a concern.

---

## 8. A recipe for DP problems

**Spotting a DP problem.** Typical phrasing: "count the number of ways", "minimum/maximum cost", "is it possible to…", "longest/shortest…", where each step is a **choice** and a brute-force recursion would revisit the same states.

**Five steps:**

1. **Define the state** in words: "`dp[i]` = number of ways to reach stair `i`".
2. **Write the recurrence** (the substructure): how `dp[i]` is built from smaller states. This is usually the hardest part and takes practice.
3. **Set the base cases**: the smallest states you know directly.
4. **Choose the order**: memoize the recursion, or fill the table so every dependency is ready before it is read.
5. **Return the answer** from the right cell, then look for a space optimisation.

**Complexity rule:** time = **number of states × work per state**; space = number of states stored (plus recursion depth for top-down).

How DP relates to neighbouring paradigms:

| Paradigm | Subproblems | Keeps |
|---|---|---|
| Divide and conquer | Independent, not repeated | Nothing |
| Dynamic programming | Overlapping | Every subproblem's answer |
| Greedy | Commits to one local choice | Only the current choice |

---

## 9. Worked example: climbing stairs

> A person at the bottom of `n` stairs can climb **1 or 2** stairs at a time. How many distinct ways can they reach the top?

**Start small** and list the ways:

```text
stairs(1): 1                          -> 1
stairs(2): 1,1  2                     -> 2
stairs(3): 1,1,1  1,2  2,1            -> 3
stairs(4): 1,1,1,1  2,1,1  1,2,1
           1,1,2  2,2                 -> 5
stairs(5):                            -> 8
```

**Substructure:** the last move onto stair `n` is either a 1-step (from `n - 1`) or a 2-step (from `n - 2`), so `stairs(n) = stairs(n - 1) + stairs(n - 2)` — Fibonacci in disguise. Coded as plain recursion it is O(2ⁿ) for the same reason as `fib`, so go straight to DP:

```js
// Memoization: O(n) time, O(n) space
function stairsMemo(n, memo = []) {
  if (n <= 0) return 0;
  if (n <= 2) return n;
  if (memo[n] !== undefined) return memo[n];

  memo[n] = stairsMemo(n - 1, memo) + stairsMemo(n - 2, memo);

  return memo[n];
}

// Tabulation with two variables: O(n) time, O(1) space
function stairsTable(n) {
  if (n <= 2) return Math.max(n, 0);

  let twoBelow = 1; // ways(1)
  let oneBelow = 2; // ways(2)

  for (let i = 3; i <= n; i++) {
    const total = oneBelow + twoBelow;
    twoBelow = oneBelow;
    oneBelow = total;
  }

  return oneBelow;
}
```

If steps of 1, 2 **or 3** are allowed, only the recurrence changes: `ways(n) = ways(n - 1) + ways(n - 2) + ways(n - 3)`.

---

## 10. Worked example: coin change (count the ways)

> Given denominations `coins` and an `amount`, return the number of **combinations** of coins that add up to the amount (unlimited supply of each coin).

State: `ways[a]` = number of ways to make amount `a`. Base case: `ways[0] = 1` (one way to make zero: use no coins). Process **one coin at a time**; for each amount `a >= coin`, add the ways to make `a - coin`.

```js
function coinChange(coins, amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;

  for (const coin of coins) {
    for (let a = coin; a <= amount; a++) {
      ways[a] += ways[a - coin];
    }
  }

  return ways[amount];
}

coinChange([1, 2, 5], 10); // 10
```

The table for amount 10, coins `[1, 2, 5]`, after each coin:

```text
amount:      0  1  2  3  4  5  6  7  8  9 10
coin 1:      1  1  1  1  1  1  1  1  1  1  1
coin 1,2:    1  1  2  2  3  3  4  4  5  5  6
coin 1,2,5:  1  1  2  2  3  4  5  6  7  8 10
```

**Complexity:** O(k · amount) time for `k` coins, O(amount) space.

**Loop order matters.** Coins outside, amounts inside counts each *combination* once (`1+2` and `2+1` are the same). Swap the loops and you count *ordered sequences* instead: for amount 3 with `[1, 2]`, combinations give 2 (`1+1+1`, `1+2`) but sequences give 3 (`1+1+1`, `1+2`, `2+1`).

---

## 11. Worked example: minimum coins, and why greedy can fail

> Return the **fewest** coins needed to make `amount`, or `-1` if impossible.

The **greedy** idea — always take the largest coin that fits — works for real currencies like `[1, 2, 5]`, but not in general. With coins `[1, 3, 4]` and amount 6:

```text
greedy: 4 -> 1 -> 1       = 3 coins
best:   3 -> 3            = 2 coins
```

With `[3, 5]` and amount 9, greedy takes 5 and gets stuck on 4, even though `3 + 3 + 3` works. (Greedy algorithms get their own topic later.)

DP tries every last coin: `dp[a] = 1 + min(dp[a - coin])` over all coins that fit.

```js
function minCoins(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin] + 1 < dp[a]) {
        dp[a] = dp[a - coin] + 1;
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

minCoins([1, 3, 4], 6); // 2
```

```text
amount: 0  1  2  3  4  5  6
dp:     0  1  2  1  1  2  2
```

**Complexity:** O(k · amount) time, O(amount) space.

---

## 12. Two-dimensional DP and real-world uses

Some states need two indices. **Unique grid paths:** a robot starts top-left of a `rows × cols` grid and moves only right or down. Each cell is reached from the cell above or the cell to the left:

```js
function uniquePaths(rows, cols) {
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(1));

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      dp[r][c] = dp[r - 1][c] + dp[r][c - 1];
    }
  }

  return dp[rows - 1][cols - 1];
}
```

```text
3 x 3 grid          first row and column are all 1
1  1  1
1  2  3             dp[1][1] = 1 + 1
1  3  6   <- answer dp[2][2] = 3 + 3
```

**Complexity:** O(rows · cols) time and space; keeping only one row reduces space to O(cols).

Other classics follow the same recipe: 0/1 knapsack, longest common subsequence and edit distance (spell checkers, `diff`). DP also powers speech recognition, DNA sequence alignment, shortest-path algorithms like Bellman-Ford, and everyday **caching**.

---

## Key interview points

- DP needs **overlapping subproblems** *and* **optimal substructure**; merge sort lacks the first, longest simple path lacks the second.
- Naive recursive Fibonacci is **O(2ⁿ)** time (tightly ~1.618ⁿ) and O(n) stack space.
- **Memoization** = top-down recursion + cache: O(n) time, O(n) memo + O(n) stack for Fibonacci.
- **Tabulation** = bottom-up loop filling a table: O(n) time; with rolling variables **O(1) space**, and no stack overflow risk.
- Always pass the memo into recursive calls, and test "cached?" with `!== undefined` or `Map.has`, never truthiness.
- Say the recipe out loud: **state → recurrence → base cases → order → answer**; time = states × work per state.
- Coin change: loop order decides combinations vs permutations; greedy fails on coins like `[1, 3, 4]`.

## Summary

- Dynamic programming solves each distinct subproblem **once** and stores the answer.
- It applies only when subproblems **repeat** and optimal answers **compose**.
- Top-down memoization keeps the recursive structure; bottom-up tabulation replaces it with a loop and often saves space.
- Brute-force exponential solutions like Fibonacci, climbing stairs and coin change become linear or `O(k · amount)` with DP.
- The hardest part is finding the recurrence; start with small examples and ask "what was the last choice?".
