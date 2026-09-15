# Problem-Solving Patterns – Frequency Counter, Multiple Pointers, Sliding Window, Divide & Conquer

## 1. Why learn patterns

The 5-step approach from the previous topic tells you *how to think*. Patterns give you *what to try*. Many interview problems are variations on a handful of reusable shapes, and recognising the shape usually turns an O(n²) brute force into O(n) or O(log n).

| Pattern | Core idea | Typical win |
|---|---|---|
| Frequency counter | Count values in an object / Map, compare the counts | O(n²) → O(n) |
| Multiple pointers | Indices that move toward each other or in step, based on a condition | O(n²) → O(n), O(1) space |
| Sliding window | Keep a running sub-range and update it incrementally | O(n·k) → O(n) |
| Divide and conquer | Split the input, solve the pieces, combine | O(n) → O(log n), O(n²) → O(n log n) |

Dynamic programming, greedy algorithms and backtracking are patterns too; they get their own topics later. The rule for everything here: **first write down the naive complexity, then ask which pattern removes the repeated work.**

---

## 2. Frequency counter

A **frequency counter** collects values (or how often each value appears) into an object, `Map` or `Set`, so a later question like "does this value exist, and how many times?" is an O(1) lookup instead of a scan.

Problem: `same(arr1, arr2)` returns `true` if every value in `arr1` has its square in `arr2`, with the same frequency.

```js
same([1, 2, 3], [4, 1, 9]); // true
same([1, 2, 3], [1, 9]);    // false
same([1, 2, 1], [4, 4, 1]); // false (frequencies differ)
```

**Naive:** loop over `arr1`; for each value, `arr2.indexOf(val ** 2)` to find the square, then `arr2.splice(index, 1)` to remove it. It *looks* like one loop, but `indexOf` and `splice` are both hidden O(n) loops, so it is **O(n²)** — and it mutates the caller's array.

**Frequency counter:** one pass to count the squares, one pass to consume them.

```js
function same(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;

  const counts = new Map();

  for (const val of arr1) {
    const square = val * val;
    counts.set(square, (counts.get(square) || 0) + 1);
  }

  for (const val of arr2) {
    const remaining = counts.get(val) || 0;

    if (remaining === 0) return false;

    counts.set(val, remaining - 1);
  }

  return true;
}
// Time O(n), space O(n)
```

Two loops one after the other is O(2n) = O(n). Because the lengths match and every value in `arr2` consumed exactly one count, no leftovers are possible.

---

## 3. Frequency counter in practice: anagrams

Two strings are **anagrams** if one is a rearrangement of the other (`"cinema"` / `"iceman"`).

```js
function validAnagram(first, second) {
  if (first.length !== second.length) return false;

  const lookup = {};

  for (const char of first) {
    lookup[char] = (lookup[char] || 0) + 1;
  }

  for (const char of second) {
    if (!lookup[char]) return false; // missing, or already used up

    lookup[char] -= 1;
  }

  return true;
}

validAnagram('anagram', 'nagaram'); // true
validAnagram('aaz', 'zza');         // false
```

**O(n) time**; space O(k) for k distinct characters, which is **O(1)** for a fixed alphabet like `a–z`. Sorting both strings and comparing also works but costs O(n log n).

Without the length check, `validAnagram('abc', 'ab')` would return `true`: the second loop never notices the unused `'c'`.

**Object or Map?** A plain `{}` turns keys into strings (`1` and `"1"` collide) and inherits keys like `constructor`. Fine for letters; for arbitrary words use a `Map`.

---

## 4. Multiple pointers

**Multiple pointers** keeps two or more indices and moves them toward the start, end or middle based on a condition. It usually needs **sorted** input and uses **O(1) extra space**.

Problem: `sumZero(sortedArr)` returns the first pair that sums to 0, or `undefined`.

The naive answer checks every pair with two nested loops: O(n²) time, O(1) space. Two pointers, one at each end:

```js
function sumZero(arr) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];

    if (sum === 0) {
      return [arr[left], arr[right]];
    } else if (sum > 0) {
      right--;
    } else {
      left++;
    }
  }
}
// Time O(n), space O(1)
```

```text
arr = [-4, -3, -2, -1, 0, 1, 2, 5]
        L                       R    -4 + 5 =  1  > 0  -> R--
        L                    R       -4 + 2 = -2  < 0  -> L++
            L                R       -3 + 2 = -1  < 0  -> L++
                L            R       -2 + 2 =  0       -> return [-2, 2]
```

**Why it is safe to discard:** if `arr[left] + arr[right] > 0`, then `arr[right]` is too big even with the *smallest* remaining value, so it can never be part of an answer — drop it. The mirror argument drops `arr[left]` when the sum is negative. Each step removes one candidate, so there are at most n − 1 steps.

---

## 5. More pointer layouts

Pointers do not always start at opposite ends.

**Same direction (slow / fast)** — `countUniqueValues(sortedArr)`:

```js
function countUniqueValues(arr) {
  if (arr.length === 0) return 0;

  let i = 0; // last unique slot

  for (let j = 1; j < arr.length; j++) {
    if (arr[j] !== arr[i]) {
      i++;
      arr[i] = arr[j]; // compact uniques to the front (mutates arr)
    }
  }

  return i + 1;
}
// Time O(n), space O(1)
```

```text
[1, 1, 2, 3, 3, 4]   i=0 j=1  equal, skip
 i  j
[1, 2, 2, 3, 3, 4]   j=2 differs -> i=1, arr[1]=2
    i  j
[1, 2, 3, 3, 3, 4]   j=3 differs -> i=2, arr[2]=3   (j=4 equal, skip)
       i  j
[1, 2, 3, 4, 3, 4]   j=5 differs -> i=3, arr[3]=4   => return 4
          i     j
```

If mutating the input is not allowed, count how often `arr[j] !== arr[j - 1]` instead — same O(n) / O(1).

**One pointer per input** — e.g. checking whether `'abc'` is a subsequence of `'abracadabra'`: walk the long string, and advance the pointer in the short one on each match. O(n) time, O(1) space.

| Layout | Examples |
|---|---|
| Opposite ends, move inward | pair sum in sorted array, palindrome check, reverse in place |
| Slow / fast, same direction | remove duplicates, move zeros, count unique values |
| One pointer per sequence | merge two sorted arrays, subsequence check |

---

## 6. Sliding window (fixed size)

A **sliding window** is a contiguous range `[start, end]` over an array or string. Instead of recomputing the range from scratch, you update it as it moves: add what enters, remove what leaves.

Problem: `maxSubarraySum(arr, k)` — the largest sum of `k` consecutive elements.

The naive version re-adds `k` elements for every start index `0…n - k`: **O((n − k + 1) · k) = O(n·k)**, i.e. O(n²) when k grows with n. Neighbouring windows share k − 1 elements, so most of that work is repeated.

```js
function maxSubarraySum(arr, k) {
  if (k <= 0 || k > arr.length) return null;

  let windowSum = 0;

  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
  }

  let maxSum = windowSum;

  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k]; // add entering, drop leaving
    maxSum = Math.max(maxSum, windowSum);
  }

  return maxSum;
}
// Time O(n), space O(1)
```

```text
arr = [1, 2, 5, 2, 8, 1, 5], k = 2
[1  2] 5  2  8  1  5    sum = 3
 1 [2  5] 2  8  1  5    3 - 1 + 5 = 7
 1  2 [5  2] 8  1  5    7 - 2 + 2 = 7
 1  2  5 [2  8] 1  5    7 - 5 + 8 = 10   <- max
 1  2  5  2 [8  1] 5    10 - 2 + 1 = 9
 1  2  5  2  8 [1  5]   9 - 8 + 5 = 6
```

Note `maxSum` starts at the first window's sum, not at 0 — starting at 0 would give the wrong answer for an all-negative array.

---

## 7. Sliding window (variable size)

When the window size is not given, grow the right edge and **shrink the left edge while the condition holds** (or until it is restored).

Problem: the length of the shortest contiguous subarray whose sum is ≥ `target` (all numbers positive).

```js
function minSubArrayLen(nums, target) {
  let left = 0;
  let sum = 0;
  let best = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];

    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }

  return best === Infinity ? 0 : best;
}

minSubArrayLen([2, 3, 1, 2, 4, 3], 7); // 2  ([4, 3])
```

A `while` inside a `for` looks like O(n²), but **each index enters the window once and leaves at most once** (`left` moves at most n times in total), so it is **O(n) time, O(1) space**.

It relies on **non-negative** numbers: adding never lowers the sum and removing never raises it. With negatives, shrinking is no longer safe.

Combining with a frequency counter — longest substring with no repeated characters:

```js
function findLongestSubstring(str) {
  const lastSeen = new Map();
  let start = 0;
  let longest = 0;

  for (let end = 0; end < str.length; end++) {
    const char = str[end];

    if (lastSeen.has(char) && lastSeen.get(char) >= start) {
      start = lastSeen.get(char) + 1; // jump past the previous copy
    }

    lastSeen.set(char, end);
    longest = Math.max(longest, end - start + 1);
  }

  return longest;
}

findLongestSubstring('thisisawesome'); // 6 ("awesom")
```

Time O(n); space O(k) for the distinct characters.

---

## 8. Divide and conquer: binary search

**Divide and conquer** splits the data into smaller chunks and repeats the process on a subset. Its simplest form throws half the input away at every step.

Problem: return the index of `val` in a **sorted** array, or −1. Linear search is O(n). Binary search:

```js
function search(arr, val) {
  let min = 0;
  let max = arr.length - 1;

  while (min <= max) {
    const middle = Math.floor((min + max) / 2);

    if (arr[middle] < val) {
      min = middle + 1;
    } else if (arr[middle] > val) {
      max = middle - 1;
    } else {
      return middle;
    }
  }

  return -1;
}
// Time O(log n), space O(1)
```

```text
arr = [1, 3, 5, 7, 9, 11, 13, 15, 17], val = 15
       0  1  2  3  4   5   6   7   8
step 1: min=0 max=8 middle=4  arr[4]=9  < 15 -> min=5
step 2: min=5 max=8 middle=6  arr[6]=13 < 15 -> min=7
step 3: min=7 max=8 middle=7  arr[7]=15      -> return 7
```

A million elements need at most ~20 steps. The condition is `min <= max` (not `<`) so a one-element range is still checked. Binary search has its own topic later (off-by-one variants, first/last occurrence).

---

## 9. Divide and conquer in general

The full pattern has three steps: **divide** the problem into smaller subproblems, **conquer** each (usually recursively — a function calling itself on smaller input until a base case), then **combine** the results.

Example: computing `base^exp`. A loop multiplies `exp` times — O(n). Divide and conquer uses `x^n = (x^(n/2))²`:

```js
function power(base, exp) {
  if (exp === 0) return 1;

  const half = power(base, Math.floor(exp / 2));

  return exp % 2 === 0 ? half * half : half * half * base;
}

power(2, 10); // 1024
// Time O(log n), space O(log n) for the call stack
```

Compute `half` **once**: calling `power` twice per level makes T(n) = 2T(n/2) + O(1), which is O(n) again.

Merge sort (a later topic) splits in two and merges in O(n):

```text
level 0          [8 3 5 1 7 2 6 4]           n work to merge
level 1      [8 3 5 1]     [7 2 6 4]         n work in total
level 2    [8 3] [5 1]   [7 2] [6 4]         n work in total
level 3   [8][3][5][1]  [7][2][6][4]         log n levels
=> O(n) per level × log n levels = O(n log n)
```

| Shape | Recurrence | Complexity |
|---|---|---|
| Discard half, O(1) work | T(n) = T(n/2) + O(1) | O(log n) |
| Two halves, O(n) combine | T(n) = 2T(n/2) + O(n) | O(n log n) |

---

## 10. Choosing a pattern

Read the problem for **signals**:

| Signal in the problem | Try |
|---|---|
| "Same values / anagram / duplicates / counts", comparing collections | Frequency counter (Map / Set) |
| Sorted array + pair / triplet with a target | Multiple pointers from both ends |
| In-place compaction, remove duplicates | Slow / fast pointers |
| "Contiguous", "consecutive", "substring", "subarray" of length k or with a condition | Sliding window |
| Sorted data + "find", or "halve the problem" | Binary search / divide and conquer |
| Problem splits into independent halves | Divide and conquer (recursion) |

---

## 11. Trade-offs: time vs space

The same problem often has two good answers. **Pair with a target sum in an unsorted array:**

```js
// Option A: Set lookup (frequency-counter idea)
function hasPairWithSum(arr, target) {
  const seen = new Set();

  for (const x of arr) {
    if (seen.has(target - x)) return true;

    seen.add(x);
  }

  return false;
}
// Time O(n), space O(n)
```

**Option B:** sort with `arr.sort((a, b) => a - b)`, then run the two-pointer loop from section 4 against `target` instead of 0.

| Option | Time | Extra space | Note |
|---|---|---|---|
| A: Set | O(n) | O(n) | Input untouched |
| B: sort + two pointers | O(n log n) + O(n) = O(n log n) | O(1) pointers, plus whatever the sort uses | Sorting in place mutates the input |

Say this trade-off out loud in an interview — "what if memory is tight?" is a common follow-up.

---

## 12. Common pitfalls

- **Pointers or binary search on unsorted data.** Discarding by comparison needs order: binary search on `[5, 1, 4, 2, 3]` for `1` returns −1.
- **Forgetting the sort cost.** Sort + two pointers is O(n log n), and `sort()` without `(a, b) => a - b` compares as strings.
- **Negative numbers in a sum window.** Shrink-while-valid assumes non-negative values.
- **Off-by-one bounds.** The last window of size k starts at `n - k`.
- **Hidden loops and mutation.** `indexOf`/`splice` inside a loop restore O(n²); `countUniqueValues` rewrites its input.
- **A max initialised to 0.** Wrong for all-negative input; start from a real value or `-Infinity`.

---

## Key interview points

- State the **naive complexity first**, then name the pattern that removes the repeated work.
- **Frequency counter**: O(n) time for O(n) space (O(1) for a fixed alphabet); prefer `Map` for arbitrary keys.
- **Multiple pointers** need ordered input; justify each move ("this element cannot be in any answer").
- **Sliding window**: "contiguous" is the keyword; variable windows stay O(n) because each index enters and leaves once.
- **Divide and conquer**: halving → O(log n); two halves + linear combine → O(n log n).
- **Set vs sort + two pointers**: O(n) time / O(n) space vs O(n log n) time / O(1) extra space.

## Summary

- Patterns are reusable shapes that cut brute-force complexity.
- Frequency counter: count with a Map/object, compare counts — `same`, anagrams.
- Multiple pointers: opposite ends, slow/fast, or one per input — `sumZero`, `countUniqueValues`, subsequence check.
- Sliding window: fixed (`maxSubarraySum`) or variable (`minSubArrayLen`, longest unique substring), all O(n).
- Divide and conquer: binary search O(log n), fast power O(log n), merge sort O(n log n).
- Choose by signals in the problem, and always state time and space.
