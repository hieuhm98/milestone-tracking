# Backtracking & Greedy Algorithms

## 1. Two ways to attack a search problem

Many interview problems ask you to **build** an answer from a sequence of choices: which items go in the subset, where the next queen goes, which meeting to book next. There are two opposite strategies:

- **Backtracking** — try *every* choice, but abandon a partial answer the moment it cannot lead to a valid solution. It is exhaustive, so it is always correct, and usually exponential.
- **Greedy** — make the *locally best* choice at every step and never reconsider it. It is fast (often a sort plus one pass), but it is only correct when the problem has a special structure.

Dynamic programming (topic 20) sits in between: it also explores all choices, but reuses the answers to overlapping subproblems.

All three can be pictured as a **state-space tree**: the root is the empty answer, each edge is a choice, and each leaf is a complete candidate.

```text
                      [ ]                  <- empty partial answer
            /          |          \
         [a]          [b]         [c]      <- first choice
        /   \        /   \       /   \
    [a,b]  [a,c]  [b,a] [b,c] [c,a] [c,b]  <- second choice
```

Backtracking walks this tree depth-first and **cuts off** branches that are already invalid. Greedy walks a **single path** from the root to one leaf.

---

## 2. The backtracking template: choose, explore, un-choose

Backtracking is recursion (topic 5) with one extra habit: **undo your choice after the recursive call returns**, so the shared state is clean for the next sibling branch.

```js
// Generic skeleton: plug in the problem-specific hooks
function backtrackAll(isComplete, getChoices, isValid) {
  const results = [];
  const path = [];

  function backtrack() {
    if (isComplete(path)) {
      results.push([...path]);           // copy! path keeps changing

      return;
    }

    for (const choice of getChoices(path)) {
      if (!isValid(path, choice)) continue;  // prune

      path.push(choice);                 // 1. choose
      backtrack();                       // 2. explore
      path.pop();                        // 3. un-choose
    }
  }

  backtrack();

  return results;
}
```

To design one, answer four questions: what is the **state** (`path` plus helpers such as `used`), what are the **choices** at this depth, what **constraint** rejects a choice early, and what **goal** means the answer is complete.

Two classic bugs: pushing `path` itself instead of a copy (every stored result ends up as the same, finally empty, array), and forgetting the un-choose step (state from one branch leaks into the next).

---

## 3. Subsets

**Problem:** return every subset of `[1, 2, 3]` (the power set). Each element is either in or out, so there are `2ⁿ` subsets.

Use a **start index** so each element is only considered after the ones before it. That prevents producing both `[1, 2]` and `[2, 1]`.

```js
function subsets(nums) {
  const result = [];
  const path = [];

  function backtrack(start) {
    result.push([...path]);              // every node is a valid subset

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);                // choose
      backtrack(i + 1);                  // explore with later elements only
      path.pop();                        // un-choose
    }
  }

  backtrack(0);

  return result;
}

subsets([1, 2, 3]);
// [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

```text
                  []
          /        |       \
       [1]        [2]      [3]
      /   \        |
  [1,2]  [1,3]   [2,3]
    |
 [1,2,3]

8 nodes = 2^3 subsets; every node is recorded, not just leaves
```

**Complexity:** there are `2ⁿ` subsets and copying each costs up to O(n), so time is **O(n · 2ⁿ)**. Auxiliary space is **O(n)** for the recursion depth and `path`, not counting the O(n · 2ⁿ) output.

---

## 4. Permutations

**Problem:** return every ordering of `[1, 2, 3]`. Order now matters, so a start index is wrong — every unused element is a candidate at every position. Track usage with a boolean array.

```js
function permutations(nums) {
  const result = [];
  const path = [];
  const used = new Array(nums.length).fill(false);

  function backtrack() {
    if (path.length === nums.length) {
      result.push([...path]);

      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;

      used[i] = true;                    // choose
      path.push(nums[i]);
      backtrack();                       // explore
      path.pop();                        // un-choose (both pieces of state)
      used[i] = false;
    }
  }

  backtrack();

  return result;
}

permutations([1, 2, 3]);
// [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]
```

The first slot has `n` options, the second `n − 1`, and so on, giving `n!` leaves. Each leaf costs O(n) to copy, so time is **O(n · n!)**; auxiliary space is **O(n)** (`path`, `used`, call stack). Rule of thumb: order does not matter (subsets, combinations) → start index; order matters (permutations) → `used[]`.

---

## 5. Pruning: combination sum and duplicates

Plain enumeration visits the whole tree. **Pruning** means rejecting a branch as soon as it is clearly hopeless, which is what makes backtracking faster than generate-then-filter brute force.

**Problem:** given distinct positive `candidates` and a `target`, list every combination that sums to `target`; a number may be reused.

```js
function combinationSum(candidates, target) {
  const sorted = [...candidates].sort((a, b) => a - b);
  const result = [];
  const path = [];

  function backtrack(start, remaining) {
    if (remaining === 0) {
      result.push([...path]);

      return;
    }

    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) break;  // prune: later candidates are even bigger

      path.push(sorted[i]);
      backtrack(i, remaining - sorted[i]); // i, not i + 1: reuse allowed
      path.pop();
    }
  }

  backtrack(0, target);

  return result;
}

combinationSum([2, 3, 6, 7], 7); // [[2, 2, 3], [7]]
```

Sorting first turns `continue` into `break`: once one candidate is too big, the whole rest of the loop is skipped. The depth is at most `target / min(candidates)`, and the run time is exponential in that depth.

**Duplicates in the input.** For `[1, 2, 2]`, the plain subset code prints `[2]` twice. Sort, then at the top of the loop skip a value equal to the previous one **at the same depth**: `if (i > start && sorted[i] === sorted[i - 1]) continue;`. The `i > start` part matters: it still allows `[2, 2]` (the second 2 at a deeper level) while skipping a second branch that starts with `2`.

---

## 6. N-Queens: pruning with constraint sets

**Problem:** place `n` queens on an `n × n` board so that no two share a row, column or diagonal.

Place exactly **one queen per row**, so rows never clash. For columns and diagonals, keep three sets. Every square on the same `\` diagonal has the same `row − col`; every square on the same `/` diagonal has the same `row + col`.

```js
function solveNQueens(n) {
  const solutions = [];
  const queens = [];                     // queens[row] = column
  const cols = new Set();
  const diag = new Set();                // row - col
  const antiDiag = new Set();            // row + col

  function place(row) {
    if (row === n) {
      solutions.push(queens.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1)));

      return;
    }

    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag.has(row - col) || antiDiag.has(row + col)) continue;

      queens.push(col);                  // choose
      cols.add(col);
      diag.add(row - col);
      antiDiag.add(row + col);

      place(row + 1);                    // explore

      queens.pop();                      // un-choose
      cols.delete(col);
      diag.delete(row - col);
      antiDiag.delete(row + col);
    }
  }

  place(0);

  return solutions;
}

solveNQueens(4);
// [[".Q..", "...Q", "Q...", "..Q."], ["..Q.", "Q...", "...Q", ".Q.."]]
```

The set checks are O(1), so each node costs O(n) for its loop. The tree has at most `n · (n−1) · …` nodes, so time is bounded by **O(n!)** (in practice far less thanks to pruning); auxiliary space is **O(n)**. For n = 8 there are 92 solutions.

---

## 7. Backtracking complexity and when to use it

Estimate backtracking cost as **(number of nodes) × (work per node)**, where nodes ≈ branching factor raised to the depth.

| Problem | Results | Time | Aux space |
|---|---|---|---|
| Subsets | 2ⁿ | O(n · 2ⁿ) | O(n) |
| Permutations | n! | O(n · n!) | O(n) |
| Combinations C(n, k) | C(n, k) | O(k · C(n, k)) | O(k) |
| N-Queens | ≤ n! | O(n!) | O(n) |

When the problem says **"all"**, **"every"**, **"generate"**, or needs a valid configuration under constraints (Sudoku, word search on a grid, palindrome partitioning), backtracking is the natural fit. Because the output itself can be exponential, nothing does asymptotically better when you must list everything. When the problem only asks for a **count** or the **best value** and subproblems repeat, switch to DP; when a provably safe local rule exists, switch to greedy.

---

## 8. Greedy algorithms: the idea

A **greedy algorithm** builds the answer one step at a time, always taking the choice that looks best right now, and **never undoes** it. There is no tree search — just one path.

A greedy algorithm is correct only when the problem has two properties:

1. **Greedy-choice property** — some optimal solution starts with the greedy choice. Taking it never rules out reaching the optimum.
2. **Optimal substructure** — after making the choice, what remains is a smaller instance of the same problem, and an optimal solution to it combines with the choice into an optimal whole.

DP needs optimal substructure too; greedy additionally needs property 1, which lets it skip trying the alternatives.

To justify greedy in an interview, use an **exchange argument**: take any optimal solution that differs from the greedy one, swap in the greedy choice, and show the result is no worse. Before that, hunt for a **counterexample** with small inputs and ties — one is enough to kill a greedy rule.

Greedy solutions typically cost **O(n log n)** for a sort plus **O(n)** for the pass.

---

## 9. Interval scheduling: sort by end time

**Problem:** given meetings `[start, end]`, choose the maximum number that do not overlap (one that starts exactly when another ends is fine).

**Greedy rule:** sort by **end time**, and take each meeting that starts no earlier than the last chosen one ends.

```js
function maxNonOverlapping(intervals) {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  const chosen = [];
  let lastEnd = -Infinity;

  for (const [start, end] of sorted) {
    if (start >= lastEnd) {
      chosen.push([start, end]);
      lastEnd = end;
    }
  }

  return chosen;
}

maxNonOverlapping([[1, 3], [2, 5], [4, 6], [6, 8], [5, 9], [8, 10]]);
// [[1, 3], [4, 6], [6, 8], [8, 10]]
```

```text
time:   0 1 2 3 4 5 6 7 8 9 10
[1,3]     |===|                   take  (lastEnd = 3)
[2,5]       |=====|               skip  (2 < 3)
[4,6]           |===|             take  (lastEnd = 6)
[6,8]               |===|         take  (lastEnd = 8)
[5,9]             |=======|       skip  (5 < 8)
[8,10]                  |===|     take  (lastEnd = 10)
```

**Why end time?** The meeting that finishes first leaves the most room for everything else. Exchange argument: if an optimal schedule begins with some meeting X, replace X with the earliest-ending meeting G. G ends no later than X, so it cannot collide with anything that came after X — the schedule is still valid and just as large.

**Rules that look reasonable but fail:**

| Rule | Counterexample | Greedy gets | Optimal |
|---|---|---|---|
| Earliest start | `[0,10], [1,2], [3,4]` | 1 (takes `[0,10]`) | 2 |
| Shortest duration | `[0,5], [4,7], [6,11]` | 1 (takes `[4,7]`) | 2 |
| Earliest end | — | always optimal | — |

Time **O(n log n)** for the sort, O(n) for the scan; space O(n) for the sorted copy. "Minimum meetings to remove" is simply `n − maxNonOverlapping`.

---

## 10. More greedy wins

**Jump game.** `nums[i]` is the maximum jump length from index `i`; can you reach the last index? Track the farthest reachable index.

```js
function canJump(nums) {
  let farthest = 0;

  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;      // this index can never be reached

    farthest = Math.max(farthest, i + nums[i]);
  }

  return true;
}

canJump([2, 3, 1, 1, 4]); // true
canJump([3, 2, 1, 0, 4]); // false: stuck at index 3
```

Time **O(n)**, space **O(1)**. A backtracking version that tries every jump length would be exponential; memoised DP would be O(n²).

Other provably optimal greedy algorithms: **fractional knapsack** (highest value/weight ratio first), **Kruskal's MST** (cheapest edge that makes no cycle) and **Dijkstra** (settle the closest vertex). The recurring shape is **sort (or use a heap), then make one pass**.

---

## 11. When greedy fails: coin change

**Problem:** make `amount` with the fewest coins. The obvious greedy rule is "sort coins descending and keep taking the largest one that fits". For US coins `{1, 5, 10, 25}` and 63 it gives 25, 25, 10, 1, 1, 1 — six coins, which is optimal. Change the denominations and it breaks:

```text
coins {1, 3, 4}, amount 6

greedy:  6 --take 4--> 2 --take 1--> 1 --take 1--> 0     3 coins
optimal: 6 --take 3--> 3 --take 3--> 0                   2 coins
```

Taking 4 first looked best, but it left a remainder (2) that only small coins can fill. The greedy-choice property does not hold for arbitrary denominations. It happens to hold for "canonical" systems such as US coins, which is why the rule feels right. It can even fail to find any answer: with `{3, 5}` and 9, greedy takes 5 and gets stuck at 4, yet 3 + 3 + 3 works.

The fix is DP (topic 20): `dp[a] = min over coins c ≤ a of dp[a − c] + 1`, which considers every coin for every sub-amount in **O(amount · k)** time for `k` coin types and **O(amount)** space.

The same trap appears in **0/1 knapsack**: greedy by value/weight ratio is optimal for the fractional version but not when items cannot be split. Capacity 50, items (weight 10, value 60), (20, 100), (30, 120): ratio-greedy takes the first two for value 160, but the optimum is the last two for 220.

---

## 12. Choosing: backtracking vs greedy vs DP

| | Backtracking | Greedy | Dynamic programming |
|---|---|---|---|
| Explores | All choices, pruning dead branches | One choice per step | All choices, each subproblem once |
| Correctness | Always (exhaustive) | Only with greedy-choice property | Needs optimal substructure + overlapping subproblems |
| Typical time | Exponential: O(2ⁿ), O(n!) | O(n) or O(n log n) | Polynomial in the state space |
| Examples | Subsets, permutations, N-Queens, Sudoku | Interval scheduling, jump game, MST | Coin change, 0/1 knapsack, LIS |

A practical decision flow:

```text
Must you LIST every solution / find any valid configuration?
  yes -> backtracking (prune hard)
  no  -> is there a local rule you can PROVE safe (exchange argument)?
           yes -> greedy
           no  -> do subproblems repeat? -> dynamic programming
```

---

## Key interview points

- Backtracking = **choose, explore, un-choose**; always push a **copy** of the path, and undo every piece of state you changed.
- Subsets and combinations use a **start index**; permutations use a **`used` array**. Duplicates: sort and skip `i > start && a[i] === a[i-1]`.
- Complexity: subsets **O(n · 2ⁿ)**, permutations **O(n · n!)**, N-Queens ≤ **O(n!)**; auxiliary space is the recursion depth, O(n).
- **Pruning** (sort + `break`, N-Queens sets for columns, `row − col`, `row + col`) separates backtracking from brute force.
- Greedy is correct only with the **greedy-choice property** and **optimal substructure**; justify it with an **exchange argument**.
- Interval scheduling: **sort by end time**; earliest start and shortest duration both fail.
- Coin change `{1, 3, 4}` for 6 breaks largest-coin greedy (3 coins vs 2) — use **DP**. Same for 0/1 knapsack.

## Summary

- Backtracking explores the state-space tree depth-first, abandoning invalid partial answers: always correct, usually exponential.
- Subsets (2ⁿ), permutations (n!), combination sum and N-Queens are the core patterns; pruning shrinks the explored tree.
- Greedy makes one irrevocable locally best choice per step: fast (typically sort + one pass), but it needs a proof.
- Earliest-end interval scheduling and jump game are provably optimal greedy algorithms; arbitrary coin change and 0/1 knapsack are where greedy fails and DP is required.
