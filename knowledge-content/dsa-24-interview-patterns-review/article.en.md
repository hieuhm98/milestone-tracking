# Interview Patterns Review – Putting It All Together

## 1. From constraints to a target complexity

Every earlier topic taught one tool. In an interview nobody tells you which tool to use — you have to infer it from the problem. The first and most underrated clue is the **input size**.

A modern machine does roughly 10⁸ simple operations per second, and online judges usually allow 1–2 seconds. Working backwards from `n` gives you a **target complexity** before you write a line:

| Constraint on n | Largest workable complexity | Typical technique |
|---|---|---|
| n ≤ 10 | O(n!) | Permutations, brute force |
| n ≤ 20 | O(2ⁿ) or O(n · 2ⁿ) | Subsets, bitmasks, backtracking |
| n ≤ 500 | O(n³) | Triple loops, interval DP |
| n ≤ 5,000 | O(n²) | Nested loops, 2-D DP |
| n ≤ 10⁶ | O(n log n) | Sorting, heaps, binary search |
| n ≤ 10⁸ | O(n) | One pass, hash map, two pointers |
| larger | O(log n) or O(1) | Binary search, math formula |

If the problem says `n ≤ 10⁵` and your idea is O(n²), that is ~10¹⁰ operations — you already know you need something smarter, probably a sort, a hash map or a sliding window.

The second clue is the **shape of the input** (sorted? a grid? a tree? pairs of dependencies?) and the third is the **question being asked** (count, minimum, all combinations, yes/no). Sections 2 and 3 turn those clues into choices.

---

## 2. Choosing a data structure

Pick a data structure by asking **which operation must be fast**. Everything else is secondary.

```text
What must be fast?
|
+-- read by position ..................... Array
+-- look up / count / dedupe by key ...... Map, Set, Object
+-- add & remove at one end (LIFO) ....... Stack (array push/pop)
+-- add at back, remove at front (FIFO) .. Queue (linked list or head index)
+-- add & remove at both ends ............ Deque / doubly linked list
+-- repeatedly take the min or max ....... Binary heap (priority queue)
+-- keep items sorted, range queries ..... Balanced BST (sorted array if static)
+-- prefix search on strings ............. Trie
+-- relationships / networks ............. Graph (adjacency list)
+-- "are A and B in the same group?" ..... Union-find
```

Common trade-offs worth saying out loud:

- **Array vs linked list** — array gives O(1) index access and cache-friendly memory; a linked list gives O(1) insert/remove at a known node but O(n) access.
- **Hash map vs BST** — hash map is O(1) average but unordered; a balanced BST is O(log n) but keeps keys sorted (min, max, "next larger").
- **Heap vs sorted array** — a heap gives O(log n) insert and O(1) peek at the extreme; keeping an array sorted costs O(n) per insert.
- **Adjacency list vs matrix** — list uses O(V + E) space and suits sparse graphs; matrix uses O(V²) but answers "is there an edge?" in O(1).

---

## 3. Pattern-recognition cheat sheet

Most interview problems are a known pattern in disguise. Learn to map **signals** to **patterns**:

| Signal in the problem | Pattern to try | Typical cost |
|---|---|---|
| Sorted array, find a pair / triple | Two pointers | O(n) after sort |
| Sorted array, find a value or boundary | Binary search | O(log n) |
| "Minimum X such that condition holds" and the condition is monotonic | Binary search on the answer | O(n log range) |
| Contiguous subarray / substring, longest / shortest | Sliding window | O(n) |
| Many range-sum queries | Prefix sums | O(n) build, O(1) query |
| Anagrams, duplicates, "seen before?", counts | Hash map / frequency counter | O(n) |
| Top k, k-th largest, merge k sorted lists | Heap of size k | O(n log k) |
| Overlapping intervals, meeting rooms | Sort by start, then sweep | O(n log n) |
| Next greater element, matching brackets | Monotonic stack / stack | O(n) |
| Shortest path, unweighted graph or grid | BFS | O(V + E) |
| Shortest path, non-negative weights | Dijkstra with a heap | O((V + E) log V) |
| Connected components, flood fill | DFS / BFS or union-find | O(V + E) |
| Dependencies, build order | Topological sort | O(V + E) |
| Prefix / autocomplete / word dictionary | Trie | O(L) per word |
| All combinations / permutations / placements | Backtracking | O(n · 2ⁿ), O(n · n!) |
| Count ways / min cost, overlapping subproblems | Dynamic programming | states × transitions |
| Locally best choice provably safe | Greedy (after sorting) | O(n log n) |
| Single unpaired number, subsets of n ≤ 20 | Bit manipulation | O(n) / O(2ⁿ) |

The table is a starting point, not a proof: always check the pattern actually fits (for example, sliding window needs the window's validity to change monotonically as it grows).

---

## 4. Array patterns: two pointers, sliding window, prefix sums

**Two pointers** on a sorted array — move whichever pointer brings the sum closer to the target:

```js
function pairWithSum(sorted, target) {
  let left = 0;
  let right = sorted.length - 1;

  while (left < right) {
    const sum = sorted[left] + sorted[right];

    if (sum === target) return [left, right];

    if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return null;
}
// O(n) time, O(1) space (O(n log n) if you must sort first)
```

**Sliding window** — grow the right edge, shrink the left edge when the window becomes invalid:

```js
function longestUniqueSubstring(s) {
  const lastSeen = new Map(); // char -> last index
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];

    if (lastSeen.has(ch) && lastSeen.get(ch) >= start) {
      start = lastSeen.get(ch) + 1;
    }

    lastSeen.set(ch, end);
    best = Math.max(best, end - start + 1);
  }

  return best;
}
// O(n) time, O(k) space, k = distinct characters
```

```text
s = "abcabcbb"
end=0 a  window [a]      best 1
end=2 c  window [abc]    best 3
end=3 a  a seen at 0 -> start=1, window [bca]   best 3
end=4 b  b seen at 1 -> start=2, window [cab]   best 3
```

Each index enters and leaves the window at most once, so the total work is O(n) even though there are two moving edges.

**Prefix sums** — precompute once, answer any range sum in O(1):

```js
function buildPrefix(nums) {
  const prefix = [0];

  for (const x of nums) {
    prefix.push(prefix[prefix.length - 1] + x);
  }

  return prefix;
}

// Sum of nums[i..j] inclusive
const rangeSum = (prefix, i, j) => prefix[j + 1] - prefix[i];
```

---

## 5. Hash maps and binary search on the answer

A hash map trades O(n) space for O(1) average lookups, and it is the single most common way to turn O(n²) into O(n). The classic is **Two Sum** on an unsorted array:

```js
function twoSum(nums, target) {
  const indexOf = new Map(); // value -> index

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];

    if (indexOf.has(need)) return [indexOf.get(need), i];

    indexOf.set(nums[i], i);
  }

  return null;
}
// O(n) time, O(n) space — versus O(n^2) for checking every pair
```

**Binary search on the answer** is binary search applied not to an array but to a **range of possible answers**. It works whenever "answer x is feasible" is monotonic: if x works, every larger x works too.

```js
// Smallest eating speed k that finishes all piles within h hours
function minEatingSpeed(piles, h) {
  const hoursAt = (k) => piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);
  let lo = 1;
  let hi = piles.reduce((a, b) => Math.max(a, b), 1);

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);

    if (hoursAt(mid) <= h) {
      hi = mid;     // mid works, try slower
    } else {
      lo = mid + 1; // mid is too slow
    }
  }

  return lo;
}
// O(n log M) time, M = largest pile; O(1) extra space
```

```text
speeds:   1  2  3  4  5  6  ...  M
feasible: N  N  N  Y  Y  Y  ...  Y   <- find the first Y
```

---

## 6. Heaps, top-k and intervals

**Top-k** questions ("k most frequent", "k closest points", "k-th largest") point to a heap. Keep a **min-heap of size k**: push each item, and if the heap grows past k, pop the smallest. What remains are the k largest.

| Approach for k-th largest | Time | Space |
|---|---|---|
| Sort everything | O(n log n) | O(1)–O(n) |
| Min-heap of size k | O(n log k) | O(k) |
| Build a max-heap, pop k times | O(n + k log n) | O(n) |
| Quickselect | O(n) average, O(n²) worst | O(1) |

JavaScript has no built-in heap, so in an interview either write a compact array-based heap (bubble up / sink down) or state that you would use one and focus on the logic.

**Intervals** almost always start with sorting by start time, then a single sweep:

```js
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0].slice()];

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}
// O(n log n) time (the sort dominates), O(n) space
```

```text
input:   [1,3] [8,10] [2,6] [15,18]
sorted:  [1,3] [2,6] [8,10] [15,18]
merged:  [1,6]       [8,10] [15,18]
```

---

## 7. Trees and graphs: which traversal?

| Question | Tool |
|---|---|
| Level-by-level output, minimum depth, nearest node | BFS (queue) |
| Sorted order of a BST | In-order DFS |
| Copy / serialise a tree | Pre-order DFS |
| Delete a tree, compute heights or subtree sums | Post-order DFS |
| Shortest path, unweighted | BFS |
| Shortest path, non-negative weights | Dijkstra |
| Order tasks with prerequisites, detect a cycle in a DAG | Topological sort (Kahn or DFS) |
| Dynamic "same component?" queries | Union-find |
| Cheapest way to connect all nodes | Minimum spanning tree (Kruskal / Prim) |

On trees, BFS holds up to a whole level in the queue (O(w), wide trees hurt), while DFS holds one root-to-leaf path on the stack (O(h), deep trees hurt).

A grid is a graph in disguise — each cell is a vertex with up to four edges. BFS template:

```js
function shortestPathInGrid(grid, start, goal) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const queue = [start];
  let head = 0; // read index instead of O(n) shift()
  dist[start[0]][start[1]] = 0;

  while (head < queue.length) {
    const [r, c] = queue[head++];

    if (r === goal[0] && c === goal[1]) return dist[r][c];

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const inside = nr >= 0 && nr < rows && nc >= 0 && nc < cols;

      if (inside && grid[nr][nc] === 0 && dist[nr][nc] === -1) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }

  return -1;
}
// 0 = open, 1 = wall. O(rows * cols) time and space
```

Mark a cell as visited **when you enqueue it**, not when you dequeue it — otherwise the same cell can be enqueued many times.

---

## 8. Backtracking, greedy or dynamic programming?

All three solve "choose a sequence of decisions" problems. The difference is what you know about the choices:

| Question to ask | If yes |
|---|---|
| Must I list **every** valid combination / arrangement? | Backtracking |
| Is there a local choice that is **provably always safe** (exchange argument)? | Greedy |
| Do subproblems **repeat**, and does the best answer build from best sub-answers? | Dynamic programming |

```text
          need all solutions? --yes--> backtracking (+ pruning)
                 |
                 no (need count / min / max)
                 |
     safe local choice proven? --yes--> greedy
                 |
                 no
                 |
   overlapping subproblems? --yes--> DP (memo or table)
```

Backtracking template — choose, explore, un-choose:

```js
function subsets(nums) {
  const result = [];
  const path = [];

  function backtrack(start) {
    result.push([...path]);

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]); // choose
      backtrack(i + 1);   // explore
      path.pop();         // un-choose
    }
  }

  backtrack(0);

  return result;
}
// O(n * 2^n) time and space
```

The classic trap: coin change with coins `[1, 3, 4]` and amount 6. Greedy takes 4 + 1 + 1 (3 coins); DP finds 3 + 3 (2 coins). When you cannot prove the greedy choice, fall back to DP.

---

## 9. Master complexity table: data structures

Average case unless noted; worst case in brackets where it differs.

| Structure | Access | Search | Insert | Delete | Space |
|---|---|---|---|---|---|
| Array (dynamic) | O(1) | O(n) | O(1) amortized at end, O(n) at front/middle | O(1) at end, O(n) elsewhere | O(n) |
| Singly linked list | O(n) | O(n) | O(1) at head/tail | O(1) head, O(n) tail | O(n) |
| Doubly linked list | O(n) | O(n) | O(1) at either end | O(1) at either end or known node | O(n) |
| Stack / Queue | O(n) | O(n) | O(1) | O(1) | O(n) |
| Hash table / Map / Set | — | O(1) [O(n)] | O(1) [O(n)] | O(1) [O(n)] | O(n) |
| BST, balanced (AVL, red-black) | O(log n) | O(log n) | O(log n) | O(log n) | O(n) |
| BST, unbalanced | O(log n) [O(n)] | O(log n) [O(n)] | O(log n) [O(n)] | O(log n) [O(n)] | O(n) |
| Binary heap | O(1) peek | O(n) | O(log n) | O(log n) extract | O(n) |
| Trie (word length L) | — | O(L) | O(L) | O(L) | O(total characters) |
| Union-find (with both optimisations) | — | O(α(n)) find | O(α(n)) union | — | O(n) |

Graphs, V vertices and E edges:

| Operation | Adjacency list | Adjacency matrix |
|---|---|---|
| Space | O(V + E) | O(V²) |
| Add vertex | O(1) | O(V²) |
| Add edge | O(1) | O(1) |
| Remove edge | O(E) | O(1) |
| Remove vertex | O(V + E) | O(V²) |
| Is there an edge u–v? | O(deg(u)) | O(1) |

Building a heap from n items with heapify is **O(n)**, not O(n log n). α(n) is the inverse Ackermann function — at most 4 for any realistic n, so effectively constant.

---

## 10. Master complexity table: algorithms

**Sorting**

| Algorithm | Best | Average | Worst | Extra space | Stable |
|---|---|---|---|---|---|
| Bubble sort (early exit) | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Selection sort | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick sort | O(n log n) | O(n log n) | O(n²) | O(log n) avg, O(n) worst | No |
| Heap sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Counting sort (range k) | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Yes |
| Radix sort (d digits, base b) | O(d(n + b)) | O(d(n + b)) | O(d(n + b)) | O(n + b) | Yes |

**Searching, graphs, recursion**

| Algorithm | Time | Space |
|---|---|---|
| Linear search | O(n) | O(1) |
| Binary search (iterative) | O(log n) | O(1) |
| Naive string search (text n, pattern m) | O(n · m) | O(1) |
| KMP | O(n + m) | O(m) |
| BFS / DFS on a graph | O(V + E) | O(V) |
| Dijkstra with binary heap | O((V + E) log V) | O(V) |
| Dijkstra with a plain array scan | O(V²) | O(V) |
| Topological sort | O(V + E) | O(V) |
| Kruskal's MST | O(E log E) | O(V + E) |
| Prim's MST with heap | O(E log V) | O(V) |
| Fibonacci, naive recursion | O(2ⁿ) | O(n) |
| Fibonacci, memo or table | O(n) | O(n), O(1) with two variables |
| Subsets / permutations (backtracking) | O(n · 2ⁿ) / O(n · n!) | O(n) recursion + output |

Comparison-based sorting cannot beat **O(n log n)** in the worst case; counting and radix sort escape the bound only because they do not compare elements.

---

## 11. Bit manipulation basics

Numbers are stored in binary, and bitwise operators work on each bit. In JavaScript they convert operands to **32-bit signed integers** first.

- `a & b` — **AND**: 1 only if both bits are 1. `13 & 6` is `4`.
- `a | b` — **OR**: 1 if either bit is 1. `13 | 6` is `15`.
- `a ^ b` — **XOR**: 1 if the bits differ. `13 ^ 6` is `11`.
- `~a` — **NOT**: flips every bit. `~5` is `-6`.
- `a << k` — **shift left**, multiplies by 2ᵏ. `13 << 1` is `26`.
- `a >> k` — **shift right**, keeps the sign, divides by 2ᵏ rounding down. `13 >> 1` is `6`.
- `a >>> k` — **unsigned shift right**, fills with zeros. `-1 >>> 0` is `4294967295`.

```text
 13  = 1101
  6  = 0110
 ----------
 AND = 0100 = 4
 OR  = 1111 = 15
 XOR = 1011 = 11
```

The tricks that actually come up:

```js
const isOdd = (n) => (n & 1) === 1;
const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;
const getBit = (n, i) => (n >> i) & 1;
const setBit = (n, i) => n | (1 << i);
const clearBit = (n, i) => n & ~(1 << i);
const toggleBit = (n, i) => n ^ (1 << i);

function countSetBits(n) {
  let count = 0;

  while (n !== 0) {
    n &= n - 1; // clears the lowest set bit
    count++;
  }

  return count;
}
// O(number of set bits), at most 32 iterations

function singleNumber(nums) {
  let x = 0;

  for (const n of nums) {
    x ^= n; // a ^ a = 0 and a ^ 0 = a, so pairs cancel
  }

  return x;
}
// O(n) time, O(1) space
```

`n & (n - 1)` works because subtracting 1 flips the lowest set bit and every 0 below it: `12 = 1100`, `11 = 1011`, AND gives `1000`. A power of two has exactly one set bit, so the result is 0. A **bitmask** of n bits can also represent a subset of n items: iterating `mask` from 0 to 2ⁿ − 1 enumerates all subsets.

Pitfall: `1 << 31` is negative in JavaScript because bit 31 is the sign bit; use `>>> 0` to read the value as unsigned.

---

## 12. The interview checklist

A correct answer delivered in silence scores worse than a slightly slower one explained clearly. Follow the same loop every time:

```text
1. Clarify     input types, size limits, sorted?, duplicates?, negatives?,
               empty input?, what to return when there is no answer
2. Examples    one normal case, one edge case — work them by hand
3. Brute force say it and its complexity, even if it is slow
4. Optimise    find the bottleneck, repeated work, unneeded work;
               match the signals to a pattern (section 3)
5. Plan        agree on the approach before coding
6. Code        clear names, small helpers, no premature cleverness
7. Test        trace your examples through the code; then empty,
               single element, all equal, very large values
8. Analyse     state time AND space, including recursion stack
```

Edge cases that catch people: an empty array or string, a single element, all elements equal, negative numbers, integer overflow (use `BigInt` past `Number.MAX_SAFE_INTEGER`), off-by-one bounds in binary search, cycles in graphs, and mutating the input when the caller did not expect it.

If you get stuck, say what you are thinking: "a nested loop gives O(n²); I am repeatedly searching for a value, so a hash map could make that O(1)". Interviewers reward visible reasoning.

---

## Key interview points

- Read the **constraints first**: n ≤ 20 hints exponential, n ≤ 10⁵ hints O(n log n) or better.
- Choose a structure by the **operation that must be fast**: index → array, key → hash map, min/max → heap, order → balanced BST, prefix → trie.
- Sorted input → **two pointers or binary search**; contiguous range → **sliding window**; top k → **heap of size k**; intervals → **sort then sweep**.
- Unweighted shortest path → **BFS**; non-negative weights → **Dijkstra**; dependencies → **topological sort**; connectivity → **union-find**.
- All solutions → **backtracking**; provably safe local choice → **greedy**; overlapping subproblems → **DP**.
- Know the master tables: hash O(1) average but O(n) worst, quick sort O(n²) worst, heapify O(n), BFS/DFS O(V + E).
- Bits: `n & (n - 1)` clears the lowest set bit, XOR cancels pairs, JS bitwise works on 32-bit signed integers.
- Always: clarify, brute force, optimise, code, test edge cases, state **time and space**.

## Summary

- Input size sets a target complexity; problem shape and the question asked point to a pattern.
- Data structures are chosen by their fastest operation, and every choice is a trade-off worth naming.
- The core patterns — two pointers, sliding window, prefix sums, hashing, binary search on the answer, heaps, interval sweeps, BFS/DFS, backtracking, greedy and DP — cover the vast majority of interview problems.
- The master tables summarise the costs of every structure and algorithm in the course.
- Bit manipulation gives O(1) parity, power-of-two and bit tests, plus XOR tricks and bitmask subsets.
- A repeatable checklist — clarify, examples, brute force, optimise, code, test, analyse — matters as much as the algorithm.
