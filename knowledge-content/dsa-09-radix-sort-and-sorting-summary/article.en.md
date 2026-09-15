# Radix Sort & the Big Picture of Sorting

## 1. Where we are: comparison sorts

Every sort so far — bubble, selection and insertion (O(n²)), merge sort (O(n log n)), quick sort (O(n log n) average, O(n²) worst) — works the same way: look at **two elements**, ask "which is smaller?", move things. These are **comparison sorts**.

**Can a cleverer comparison sort reach O(n)?** No — and knowing *why* is a classic interview point. It also explains how radix sort "cheats": it never compares two elements at all.

---

## 2. The O(n log n) lower bound for comparison sorts

Think of any comparison sort as a **decision tree**. Each internal node is one comparison; each leaf is one final ordering of the input. For three elements `a, b, c`:

```text
                     a < b ?
                 /             \
              yes               no
            b < c ?            a < c ?
           /      \           /       \
      [a,b,c]    a < c ?   [b,a,c]    b < c ?
                /     \               /     \
           [a,c,b]  [c,a,b]      [b,c,a]  [c,b,a]
```

The argument in three steps:

1. The input could be in any of **n!** orders, and each needs a different sequence of moves, so the tree needs **at least n! leaves**.
2. A binary tree of height `h` has at most `2^h` leaves, so `2^h ≥ n!`, which means `h ≥ log₂(n!)`.
3. `log₂(n!)` is **Θ(n log n)** (since `n! ≥ (n/2)^(n/2)`). The height is the number of comparisons on the worst path.

| n | log₂(n!) — minimum worst-case comparisons | n·log₂ n |
|---|---|---|
| 3 | ≈ 2.6 → 3 | ≈ 4.8 |
| 10 | ≈ 21.8 → 22 | ≈ 33.2 |
| 1,000 | ≈ 8,529 | ≈ 9,966 |

So **every comparison sort needs Ω(n log n) comparisons in the worst case** (and on average too). Merge sort and heap sort are therefore **asymptotically optimal** among comparison sorts.

This does not contradict insertion sort being O(n) on an already sorted array: the bound is about the **worst case over all inputs**, not about lucky inputs.

---

## 3. Escaping the bound: non-comparison sorts

The bound only applies to algorithms that learn about the data **only through comparisons**. If the keys are **integers in a small range** or have a **fixed number of digits**, we can use them directly as array indices and never compare.

| Sort | Assumption about the keys | Time |
|---|---|---|
| Counting sort | Integers in `0..k`, k not huge | O(n + k) |
| Radix sort | Integers (or fixed-length strings) with `k` digits | O(n · k) |
| Bucket sort | Values spread uniformly over a range | O(n) average |

The price is **generality** (no custom comparators) and extra memory for counts or buckets.

---

## 4. Counting sort

**Idea:** if every value is an integer between `0` and `k`, count how many times each value appears, then write the values back in order.

```js
function countingSort(nums, maxValue) {
  const counts = new Array(maxValue + 1).fill(0);

  for (const num of nums) {
    counts[num]++;
  }

  const result = [];

  for (let value = 0; value <= maxValue; value++) {
    for (let c = 0; c < counts[value]; c++) {
      result.push(value);
    }
  }

  return result;
}

countingSort([3, 0, 2, 3, 1, 0], 3); // [0, 0, 1, 2, 3, 3]
```

```text
input:   [3, 0, 2, 3, 1, 0]
value:    0  1  2  3
counts:  [2, 1, 1, 2]
output:  0 0 | 1 | 2 | 3 3
```

**Complexity:** time **O(n + k)** — one pass over the n items and one pass over the k + 1 counters. Space **O(n + k)** for the counts and the output.

Great for ages (0–120), scores (0–100) or bytes (0–255); terrible for 1,000 numbers up to 10⁹, where the counts array needs a billion slots. When `k ≫ n`, `k` dominates.

To sort **records by a key** and keep equal keys in their original order, use prefix sums and fill the output from the back:

```js
function countingSortBy(items, getKey, maxKey) {
  const counts = new Array(maxKey + 1).fill(0);

  for (const item of items) {
    counts[getKey(item)]++;
  }

  // prefix sums: counts[k] = number of items with key <= k
  for (let k = 1; k <= maxKey; k++) {
    counts[k] += counts[k - 1];
  }

  const output = new Array(items.length);

  // walk backwards so equal keys keep their original order
  for (let i = items.length - 1; i >= 0; i--) {
    const key = getKey(items[i]);
    counts[key]--;
    output[counts[key]] = items[i];
  }

  return output;
}
```

---

## 5. Radix sort: the idea

Radix sort is a non-comparison sort for **integers**. It exploits the fact that information about a number's size is encoded in its **digits**: more digits means a bigger number, and at equal length the higher place values decide.

The common version, **LSD (least significant digit) radix sort**:

1. Make 10 **buckets**, one per digit 0–9.
2. Put each number into the bucket for its **ones** digit, keeping arrival order.
3. Read the buckets back from 0 to 9 into the array.
4. Repeat for the tens digit, the hundreds digit, … up to the largest number's digit count.

```text
start:      [1556, 4, 3556, 593, 408, 4386, 902, 7, 8157, 86, 9637, 29]

ones:       2:[902] 3:[593] 4:[4] 6:[1556,3556,4386,86] 7:[7,8157,9637] 8:[408] 9:[29]
         -> [902, 593, 4, 1556, 3556, 4386, 86, 7, 8157, 9637, 408, 29]

tens:       0:[902,4,7,408] 2:[29] 3:[9637] 5:[1556,3556,8157] 8:[4386,86] 9:[593]
         -> [902, 4, 7, 408, 29, 9637, 1556, 3556, 8157, 4386, 86, 593]

hundreds:   0:[4,7,29,86] 1:[8157] 3:[4386] 4:[408] 5:[1556,3556,593] 6:[9637] 9:[902]
         -> [4, 7, 29, 86, 8157, 4386, 408, 1556, 3556, 593, 9637, 902]

thousands:  0:[4,7,29,86,408,593,902] 1:[1556] 3:[3556] 4:[4386] 8:[8157] 9:[9637]
         -> [4, 7, 29, 86, 408, 593, 902, 1556, 3556, 4386, 8157, 9637]  sorted
```

Why does it work? After pass `k`, the array is sorted by its last `k + 1` digits. Each pass keeps the previous order among numbers with the same current digit, so the lower digits break ties correctly. That "keep arrival order" property is **stability**, and radix sort depends on it (section 9).

---

## 6. Radix sort helpers

Three small helpers make the implementation readable.

**`getDigit(num, i)`** — the digit at place value `10^i` (0 = ones):

```js
function getDigit(num, i) {
  return Math.floor(Math.abs(num) / Math.pow(10, i)) % 10;
}

getDigit(12345, 0); // 5
getDigit(12345, 2); // 3   12345 / 100 = 123.45 -> 123 -> 123 % 10 = 3
getDigit(12345, 5); // 0   past the leading digit
```

**`digitCount(num)`** — how many digits `num` has:

```js
function digitCount(num) {
  if (num === 0) return 1;

  return Math.floor(Math.log10(Math.abs(num))) + 1;
}

digitCount(7);   // 1
digitCount(314); // 3
```

The `num === 0` guard matters: `Math.log10(0)` is `-Infinity`, so without it the function returns `-Infinity`. Also beware floating point for huge values: `Math.log10(999999999999999)` rounds to `15`, giving 16 digits instead of 15. For integers, `String(Math.abs(num)).length` is a safe alternative.

**`mostDigits(nums)`** — the digit count of the longest number, i.e. how many passes are needed:

```js
function mostDigits(nums) {
  let maxDigits = 0;

  for (let i = 0; i < nums.length; i++) {
    maxDigits = Math.max(maxDigits, digitCount(nums[i]));
  }

  return maxDigits;
}

mostDigits([1234, 56, 7]); // 4
```

The first two are O(1) per number, so `mostDigits` is O(n).

---

## 7. Implementing radix sort

Pseudocode:

- Find how many digits the largest number has.
- Loop `k` from 0 up to that digit count.
- In each iteration, create **fresh** buckets 0–9 and place each number in the bucket for its `k`-th digit.
- Replace the array with the buckets' contents, from bucket 0 to 9.
- Return the array.

```js
function radixSort(nums) {
  const maxDigitCount = mostDigits(nums);

  for (let k = 0; k < maxDigitCount; k++) {
    const digitBuckets = Array.from({ length: 10 }, () => []);

    for (let i = 0; i < nums.length; i++) {
      const digit = getDigit(nums[i], k);
      digitBuckets[digit].push(nums[i]);
    }

    nums = [].concat(...digitBuckets);
  }

  return nums;
}

radixSort([23, 345, 5467, 12, 2345, 9852]); // [12, 23, 345, 2345, 5467, 9852]
```

Common bugs:

- **Buckets created once, outside the `k` loop** — earlier passes' numbers stay in them and the array fills with duplicates.
- **`new Array(10).fill([])`** — all 10 slots share the **same** array, so every number lands in one bucket.
- **Not reassigning `nums`** — buckets are built and thrown away; the array never changes.

---

## 8. Radix sort complexity

Let **n** be the number of elements and **k** the number of digits of the longest number.

| Best | Average | Worst | Space |
|---|---|---|---|
| O(nk) | O(nk) | O(nk) | O(n + b) |

- There are **k passes**, and each pass visits all n numbers plus the `b = 10` buckets: O(k · (n + b)) = **O(nk)** for a fixed base.
- The buckets together hold all n numbers, plus `b` bucket arrays: **O(n + b)** extra space, which for base 10 is O(n). (Many references write this as O(n + k).)
- Input order does not matter: best, average and worst are the same.

**Is O(nk) really faster than O(n log n)?** If the numbers are bounded (e.g. 32-bit), `k` is a constant and radix sort is **linear**. But `n` **distinct** numbers have a maximum of at least `n − 1`, so `k ≥ log₁₀ n` and O(nk) is no better than O(n log n). It wins for large arrays of fixed-width integers — not a free lunch.

Real implementations often use **base 256**: a 32-bit integer needs only 4 passes, with `(num >>> (8 * pass)) & 255` as the digit.

---

## 9. Stability

A sort is **stable** if elements with **equal keys keep their original relative order**.

```js
const people = [
  { name: 'An', age: 30 },
  { name: 'Binh', age: 25 },
  { name: 'Chi', age: 30 },
];

people.sort((a, b) => a.age - b.age);
// stable:   Binh(25), An(30), Chi(30)   An stays before Chi
// unstable: Binh(25), Chi(30), An(30)   also "sorted", but order changed
```

Why it matters:

- **Multi-key sorting** — to sort by department, then name: sort by name, then stable-sort by department.
- **Radix sort** — each pass must be stable, or the order from lower digits is destroyed.

| Stable | Not stable (typical implementation) |
|---|---|
| Bubble, insertion, merge, counting (prefix-sum version), radix | Selection, quick, heap |

Merge sort is only stable if the merge takes from the **left** half on ties (`<=`, not `<`). Since **ES2019**, `Array.prototype.sort` is required to be stable in every JavaScript engine.

---

## 10. Radix sort variants and limits

**Negative numbers.** `getDigit` uses `Math.abs`, so the basic version sorts by **absolute value**: `[-5, 3, -1, 2]` becomes `[-1, 2, 3, -5]`. One fix is to sort the two signs separately:

```js
function radixSortWithNegatives(nums) {
  const negatives = nums.filter((n) => n < 0).map((n) => -n);
  const positives = nums.filter((n) => n >= 0);
  const sortedNegatives = radixSort(negatives).reverse().map((n) => -n);

  return sortedNegatives.concat(radixSort(positives));
}
```

Another is to subtract the minimum from every value, sort, then add it back.

**Other keys.** Floats need their bit pattern, not decimal digits. **Fixed-length strings** (postcodes, IDs) work well: each character is a digit, processed right to left. **MSD radix sort** starts from the most significant digit and recursively sorts each bucket, which suits variable-length strings.

**When not to use it:** small arrays, objects with a comparator, very long keys (large k), or tight memory — radix sort is not in-place.

---

## 11. The sorting comparison table

| Algorithm | Best | Average | Worst | Extra space | Stable |
|---|---|---|---|---|---|
| Bubble sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Selection sort | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick sort | O(n log n) | O(n log n) | O(n²) | O(log n) avg | No |
| Heap sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Counting sort | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Yes |
| Radix sort | O(nk) | O(nk) | O(nk) | O(n + b) | Yes |

Notes: bubble sort's O(n) best case needs the early-exit check. Quick sort's space is the recursion stack — O(log n) on average, O(n) in the worst case unless you recurse into the smaller side first. For counting sort k = value range; for radix sort k = digits, b = base.

---

## 12. Choosing a sort in practice

In real JavaScript, use **the built-in `sort`** with a numeric comparator (`(a, b) => a - b`) — the default compares as strings. V8 uses **TimSort**, a merge/insertion hybrid: O(n log n) worst, O(n) on sorted input, stable, O(n) extra space. For special cases:

| Situation | Good choice |
|---|---|
| Tiny or nearly sorted array, or data arriving one item at a time | Insertion sort |
| Need guaranteed O(n log n) and stability | Merge sort |
| Need guaranteed O(n log n) with O(1) extra space | Heap sort |
| General in-memory sorting where average speed matters | Quick sort (random pivot) |
| Integers in a small range (ages, scores, bytes) | Counting sort |
| Many fixed-width integers or fixed-length string keys | Radix sort |
| Only the k smallest / largest items | A heap, not a full sort |

---

## Key interview points

- **Comparison sorts cannot beat Ω(n log n)** in the worst case: the decision tree has n! leaves, so its height is at least log₂(n!) = Θ(n log n).
- Merge sort and heap sort are **optimal** comparison sorts; insertion sort's O(n) best case does not break the bound.
- **Non-comparison sorts** (counting, radix, bucket) beat the bound by using the keys as indices, at the cost of generality and memory.
- **Counting sort**: O(n + k) time and space; great for small ranges, useless when k ≫ n.
- **Radix sort**: helpers `getDigit`, `digitCount`, `mostDigits`; k passes of bucket distribution; **O(nk) time, O(n + b) space**, same for every input order.
- O(nk) is linear only when k is bounded; for n distinct numbers k ≥ log n.
- Radix sort needs **stable** passes; basic version sorts by absolute value, so handle negatives separately.
- Stable: bubble, insertion, merge, counting, radix. Unstable: selection, quick, heap. `Array.prototype.sort` is stable since ES2019.

## Summary

- Any algorithm that sorts only by comparing elements needs at least about n log n comparisons in the worst case.
- Counting sort counts occurrences of each value and writes them back in O(n + k).
- Radix sort distributes integers into 10 buckets by each digit, from least to most significant, rebuilding the array after each pass.
- Its cost is O(nk) time and O(n + b) space; it shines for large arrays of fixed-width integers.
- Stability keeps equal keys in their original order and makes multi-key sorting and radix sort work.
- In everyday JavaScript, use the built-in stable `sort` with a proper comparator; choose specialised sorts when the data's shape allows it.
