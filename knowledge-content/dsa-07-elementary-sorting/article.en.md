# Elementary Sorting – Bubble, Selection & Insertion Sort

## 1. What sorting is and why learn the simple sorts

**Sorting** is rearranging the items of a collection so they follow some order: numbers from smallest to largest, names alphabetically, movies by release year or by revenue.

Sorting is everywhere, and it is often the first step of another algorithm: binary search, two pointers and duplicate detection all get easier on sorted data. So why study slow O(n²) algorithms when every language ships a fast sort?

- They are the **simplest way to learn how sorting works**: comparing, swapping, and keeping a sorted region that grows.
- They introduce the vocabulary used for every sort: **in-place**, **stable**, **adaptive**, **online**.
- One of them, **insertion sort**, is genuinely used in production — inside hybrid sorts, for small or nearly sorted arrays.
- Interviewers ask you to write them, trace them, and explain their best and worst cases.

All three sorts in this topic are **comparison sorts**: the only thing they learn about the data is the answer to "is `a` greater than `b`?".

---

## 2. The built-in sort and its default surprise

JavaScript arrays have `Array.prototype.sort`. It works well for strings:

```js
["Steele", "Colt", "Data Structures", "Algorithms"].sort();
// ["Algorithms", "Colt", "Data Structures", "Steele"]
```

But with numbers it looks broken:

```js
[6, 4, 15, 10].sort();
// [10, 15, 4, 6]
```

Without a comparator, `sort` **converts every element to a string** and compares them by UTF-16 code units. `"10"` comes before `"4"` because the character `"1"` comes before `"4"`, exactly like "apple" before "banana". Other default quirks:

- Uppercase letters sort before lowercase ones: `["b", "A", "a"].sort()` gives `["A", "a", "b"]`.
- `undefined` values are moved to the end without being compared.
- `sort` **mutates the array in place** and returns the same array, not a copy. Use `toSorted()` (ES2023) or `[...arr].sort()` when the original must stay untouched.

In V8 (Chrome, Node.js) the built-in sort is **TimSort**: O(n log n) time in the worst case, O(n) on already sorted input, and O(n) extra space. Since ES2019 the specification requires the sort to be **stable**.

---

## 3. Comparator functions

To control the order, pass a **comparator** `(a, b) => number`. The sort calls it on pairs of elements and reads the sign of the result:

| Comparator returns | Meaning |
|---|---|
| negative number | `a` comes **before** `b` |
| positive number | `a` comes **after** `b` |
| `0` | `a` and `b` are equal for sorting purposes (a stable sort keeps their original order) |

```js
const ascending = (a, b) => a - b;
const descending = (a, b) => b - a;
const byLength = (s1, s2) => s1.length - s2.length;

[6, 4, 15, 10].sort(ascending); // [4, 6, 10, 15]

["Steele", "Colt", "Data Structures", "Algorithms"].sort(byLength);
// ["Colt", "Steele", "Algorithms", "Data Structures"]

// Several keys: by age, then by name
const people = [
  { name: "Mai", age: 30 },
  { name: "An", age: 25 },
  { name: "Binh", age: 30 },
];

people.sort((p, q) => p.age - q.age || p.name.localeCompare(q.name));
// An (25), Binh (30), Mai (30)
```

Common comparator bugs:

- **Returning a boolean**: `(a, b) => a > b` returns `true` (1) or `false` (0) and **never a negative number**, so the sort cannot tell "before" from "equal". It may appear to work on small arrays and fail on others or in other engines.
- **Subtracting strings**: `"b" - "a"` is `NaN`. Use `a.localeCompare(b)` for text.
- **Subtracting infinities**: `Infinity - Infinity` is also `NaN`. Compare explicitly with `<` and `>` if those values can appear.
- **Inconsistent results**: a comparator must always give the same answer for the same pair; a random comparator is not a correct shuffle.

---

## 4. The swap helper

Bubble sort and selection sort move elements by **swapping** two positions. Write the helper once:

```js
// Classic version with a temporary variable
function swap(arr, i, j) {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
}

// ES2015 destructuring version
const swapES6 = (arr, i, j) => {
  [arr[i], arr[j]] = [arr[j], arr[i]];
};
```

Both are O(1) time and O(1) space. The temp-variable version avoids allocating a small temporary array, which can matter inside a hot loop, but either is correct. The sorts below reuse `swap`.

---

## 5. Bubble sort: the idea

**Bubble sort** walks through the array comparing **adjacent pairs** and swaps any pair that is out of order. After one full pass, the **largest value has "bubbled" to the end** and is in its final position. Each next pass can stop one position earlier.

Pass 1 on `[5, 3, 4, 1, 2]`:

```text
[5, 3, 4, 1, 2]   compare 5,3 -> swap
[3, 5, 4, 1, 2]   compare 5,4 -> swap
[3, 4, 5, 1, 2]   compare 5,1 -> swap
[3, 4, 1, 5, 2]   compare 5,2 -> swap
[3, 4, 1, 2, 5]   5 is now in its sorted position
```

The remaining passes:

```text
pass 2: [3, 1, 2 | 4, 5]      4 settles
pass 3: [1, 2 | 3, 4, 5]      3 settles
pass 4: [1 | 2, 3, 4, 5]      no swaps -> the array is sorted, stop
```

The sorted region grows from the **right**. Pseudocode:

1. Loop `i` from the end of the array towards the beginning.
2. Inner loop `j` from `0` up to `i - 1`.
3. If `arr[j] > arr[j + 1]`, swap them.
4. Return the array.

---

## 6. Bubble sort: code, early exit and complexity

```js
function bubbleSort(arr) {
  for (let i = arr.length; i > 0; i--) {
    let swapped = false;

    for (let j = 0; j < i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        swap(arr, j, j + 1);
        swapped = true;
      }
    }

    if (!swapped) break; // no swaps: everything is already in order
  }

  return arr;
}

bubbleSort([5, 3, 4, 1, 2]); // [1, 2, 3, 4, 5]
```

The `swapped` flag is the **early exit optimisation**. Without it, bubble sort runs every pass even on an array that is already sorted. With it, a sorted array costs one pass of `n - 1` comparisons and stops.

| Case | Time | Why |
|---|---|---|
| Best (already sorted, with early exit) | O(n) | one pass, no swaps |
| Average | O(n²) | about n²/4 swaps |
| Worst (reverse sorted) | O(n²) | n(n-1)/2 comparisons and swaps |
| Space | O(1) | sorts in place |

Bubble sort is **stable**: it swaps only when `arr[j] > arr[j + 1]` (strictly greater), so equal elements never jump over each other. Using `>=` would break stability. Each swap fixes exactly one **inversion** (a pair that is out of order), so the number of swaps equals the number of inversions in the input.

---

## 7. Selection sort: the idea and the code

**Selection sort** is the mirror image: instead of pushing large values to the end, it **selects the smallest remaining value and places it at the front**. The sorted region grows from the **left**.

Pseudocode:

1. Treat the element at `i` as the smallest seen so far (`minIdx = i`).
2. Scan the rest of the array; whenever a smaller value appears, remember its index.
3. At the end of the scan, if `minIdx` is not `i`, swap the two.
4. Move `i` one step right and repeat.

```text
start           [5, 3, 4, 1, 2]
i=0  min is 1   [1 | 3, 4, 5, 2]    swap 5 and 1
i=1  min is 2   [1, 2 | 4, 5, 3]    swap 3 and 2
i=2  min is 3   [1, 2, 3 | 5, 4]    swap 4 and 3
i=3  min is 4   [1, 2, 3, 4 | 5]    swap 5 and 4, done
```

```js
function selectionSort(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    let minIdx = i;

    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[minIdx]) minIdx = j;
    }

    if (minIdx !== i) swap(arr, i, minIdx);
  }

  return arr;
}
```

The outer loop stops at `arr.length - 2`: once `n - 1` elements are in place, the last one must be too.

---

## 8. Selection sort: complexity and properties

Selection sort **always scans the whole unsorted part**, whatever the input looks like. It makes (n-1) + (n-2) + … + 1 = n(n-1)/2 comparisons on every run.

| Case | Time | Why |
|---|---|---|
| Best (already sorted) | O(n²) | it still scans to confirm each minimum |
| Average | O(n²) | same comparisons every time |
| Worst | O(n²) | same comparisons every time |
| Space | O(1) | in place |

Properties that set it apart:

- **Not adaptive**: sorted input does not help at all.
- **At most n − 1 swaps**. This is its one real advantage: when a write is very expensive (for example flash memory with limited write cycles), minimising swaps can matter more than comparisons.
- **Not stable**: the long-distance swap can jump an element over its equal twin.

```text
[2a, 2b, 1]     i=0: min is 1, swap it with 2a
[1, 2b, 2a]     2a now sits after 2b -> original order of equal keys lost
```

---

## 9. Insertion sort: the idea and the code

**Insertion sort** builds a **sorted left part** one element at a time, like arranging a hand of playing cards. Take the next element, slide it left past every larger element, and drop it into the gap.

```text
start             [5 | 3, 4, 1, 2]
i=1  insert 3     [3, 5 | 4, 1, 2]    shift 5
i=2  insert 4     [3, 4, 5 | 1, 2]    shift 5
i=3  insert 1     [1, 3, 4, 5 | 2]    shift 5, 4, 3
i=4  insert 2     [1, 2, 3, 4, 5]     shift 5, 4, 3
```

Instead of repeated swaps, the usual implementation **shifts** larger elements one step right and writes the saved value once:

```js
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i];
    let j = i - 1;

    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j]; // shift the larger element right
      j--;
    }

    arr[j + 1] = current; // drop current into the gap
  }

  return arr;
}
```

Two details that are easy to get wrong:

- The loop condition is `j >= 0`. Writing `j > 0` never compares against index 0, so a new minimum can never reach the front.
- The comparison is strictly `arr[j] > current`. That keeps the sort **stable**; `>=` would move equal elements past each other.

---

## 10. Insertion sort: complexity, nearly sorted data and online sorting

| Case | Time | Why |
|---|---|---|
| Best (already sorted) | O(n) | each element compares once and stays |
| Average | O(n²) | each element shifts past about half of the sorted part |
| Worst (reverse sorted) | O(n²) | each element shifts all the way to the front |
| Space | O(1) | in place |

More precisely, insertion sort runs in **O(n + k)**, where `k` is the number of **inversions**. Each shift removes exactly one inversion. On a **nearly sorted** array (every element only a few places from home), `k` is small and the sort is close to linear — often faster than O(n log n) algorithms with their bigger constant factors.

Insertion sort is also an **online** algorithm: it can sort data **as it arrives**, without seeing the whole input first. When a new value comes in, you insert it into the already sorted list.

```js
const scores = [];

function addScore(score) {
  scores.push(score);
  let j = scores.length - 2;

  while (j >= 0 && scores[j] > score) {
    scores[j + 1] = scores[j];
    j--;
  }

  scores[j + 1] = score; // O(k) for k larger elements, O(1) if it belongs at the end
}
```

Bubble sort and selection sort cannot do this: selection sort needs to see every remaining element to know the minimum.

---

## 11. Comparing the three sorts

| Algorithm | Best | Average | Worst | Space | Stable | Adaptive | Swaps/writes |
|---|---|---|---|---|---|---|---|
| Bubble sort (early exit) | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes | up to n²/2 |
| Selection sort | O(n²) | O(n²) | O(n²) | O(1) | No | No | at most n − 1 |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Yes | Yes | up to n²/2 shifts |
| Built-in `sort` (TimSort) | O(n) | O(n log n) | O(n log n) | O(n) | Yes | Yes | — |

- **Stable** means equal keys keep their original relative order. It matters when you sort by one field after another: sort by name, then stable-sort by department, and names stay alphabetical inside each department.
- **Adaptive** means already sorted input makes the algorithm faster.
- **In place** means O(1) extra memory: all three elementary sorts qualify.

All three have quadratic average time. At n = 100,000 that is on the order of 5 × 10⁹ comparisons — seconds to minutes — while an O(n log n) sort needs about 1.7 million.

---

## 12. When elementary sorts are the right tool

**Insertion sort** is the one that earns its place in real code:

- **Small arrays**: for a few dozen elements its low overhead beats recursive O(n log n) sorts. Hybrid sorts switch to insertion sort for small pieces: TimSort (V8, Python, Java objects) uses binary insertion sort to build short runs, and many quick sort implementations fall back to it below a small threshold.
- **Nearly sorted data**: logs that are almost in timestamp order, a list after one new item was appended.
- **Streaming data**: keeping a small sorted list up to date as values arrive.

**Selection sort** is mostly a teaching tool; its only edge is the minimal number of swaps.

**Bubble sort** is almost never the best choice in practice. Its early-exit version is a cheap "is it already sorted?" check, but a single loop does that better.

For general-purpose sorting in JavaScript, use the built-in `sort` with a correct comparator. The next topic covers how to beat O(n²) yourself with **merge sort** and **quick sort**.

---

## Key interview points

- Default `sort()` compares **as strings**: `[6, 4, 15, 10].sort()` gives `[10, 15, 4, 6]`. Numbers need `(a, b) => a - b`.
- A comparator returns **negative / positive / zero**, never a boolean. `sort` mutates the array; `toSorted()` returns a copy.
- **Bubble sort**: adjacent swaps, largest value bubbles to the end each pass; the early-exit flag makes the best case O(n).
- **Selection sort**: find the minimum and swap it to the front; always O(n²), at most n − 1 swaps, **not stable**.
- **Insertion sort**: grow a sorted left part by shifting; O(n) best case, O(n + inversions) overall, **stable** and **online**.
- All three are O(n²) average and worst time and O(1) space.
- Choose insertion sort for small or nearly sorted data; it is the building block inside hybrid sorts like TimSort.
- When tracing, state which region is sorted after each pass: the right end for bubble sort, the left end for selection and insertion sort.

## Summary

- Sorting arranges items by an order; comparison sorts only ask "is a greater than b?".
- JavaScript's `sort` is stable, O(n log n) and mutates the array you pass, but it compares strings unless you supply a comparator.
- Bubble, selection and insertion sort all use O(1) extra space and O(n²) time in the average case.
- Bubble and insertion sort are stable and adaptive; selection sort is neither but performs the fewest swaps.
- Insertion sort shines on small, nearly sorted and streaming data, which is why fast hybrid sorts use it internally.
