# Merge Sort & Quick Sort – O(n log n) Sorting

## 1. Why O(n²) sorts are not enough

Bubble, selection and insertion sort are simple, but they compare elements pair by pair, so in the average and worst case they are **O(n²)**. That is fine for 50 items and hopeless for 100,000:

| n | n² comparisons | n log₂ n comparisons |
|---|---|---|
| 1,000 | 1,000,000 | ~10,000 |
| 100,000 | 10,000,000,000 | ~1,700,000 |
| 1,000,000 | 10¹² | ~20,000,000 |

At roughly 10⁸ simple operations per second, bubble sort on 100,000 items takes about 100 seconds; an O(n log n) sort finishes in milliseconds.

A family of algorithms brings sorting down to **O(n log n)**. The price is **simplicity**: they are recursive and take longer to understand. This topic covers the two most important — **merge sort** and **quick sort**.

---

## 2. The shared idea: divide and conquer

Both algorithms rest on one observation: **an array of 0 or 1 elements is already sorted**. That is the base case of the recursion (a reminder from the recursion topic: every recursive function needs a base case and a smaller input on each call).

Both then apply **divide and conquer**, but they put the hard work in different places:

| | Divide step | Combine step |
|---|---|---|
| **Merge sort** | Trivial: cut the array in half by index | Hard: **merge** two sorted halves |
| **Quick sort** | Hard: **partition** around a pivot | Trivial: nothing to do, the array is sorted in place |

A good way to remember it: merge sort **splits blindly and merges carefully**; quick sort **partitions carefully and never merges**.

---

## 3. The merge helper

Before merge sort itself, write a function that **merges two already-sorted arrays** into one new sorted array. It must run in **O(n + m)** time and space and must not modify its inputs.

The idea is the **two pointers** pattern: look at the smallest unused value in each array, take the smaller one, advance that pointer. When one array runs out, copy the rest of the other.

```js
function merge(arr1, arr2) {
  const results = [];
  let i = 0;
  let j = 0;

  while (i < arr1.length && j < arr2.length) {
    // <= takes from the left array on ties, which keeps the sort stable
    if (arr1[i] <= arr2[j]) {
      results.push(arr1[i]);
      i++;
    } else {
      results.push(arr2[j]);
      j++;
    }
  }

  while (i < arr1.length) {
    results.push(arr1[i]);
    i++;
  }

  while (j < arr2.length) {
    results.push(arr2[j]);
    j++;
  }

  return results;
}

merge([1, 10, 50], [2, 14, 99, 100]); // [1, 2, 10, 14, 50, 99, 100]
```

```text
arr1 = [1, 10, 50]      arr2 = [2, 14, 99, 100]

compare 1  vs 2    -> take 1     results [1]
compare 10 vs 2    -> take 2     results [1, 2]
compare 10 vs 14   -> take 10    results [1, 2, 10]
compare 50 vs 14   -> take 14    results [1, 2, 10, 14]
compare 50 vs 99   -> take 50    results [1, 2, 10, 14, 50]
arr1 exhausted     -> copy rest  results [1, 2, 10, 14, 50, 99, 100]
```

Every step pushes exactly one element, so there are n + m pushes and at most n + m − 1 comparisons: **O(n + m) time, O(n + m) space**. Forgetting the two "copy the rest" loops is the classic bug — the tail of one array silently disappears.

---

## 4. Merge sort

With `merge` in hand, merge sort is short:

1. If the array has 0 or 1 elements, return it.
2. Split it in half.
3. Recursively merge sort each half.
4. Merge the two sorted halves and return the result.

```js
function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

mergeSort([8, 3, 5, 4, 7, 6, 1, 2]); // [1, 2, 3, 4, 5, 6, 7, 8]
```

```text
split:            [8, 3, 5, 4, 7, 6, 1, 2]
               [8, 3, 5, 4]        [7, 6, 1, 2]
             [8, 3]   [5, 4]     [7, 6]   [1, 2]
            [8] [3]  [5] [4]    [7] [6]  [1] [2]     <- base cases
merge:       [3, 8]   [4, 5]     [6, 7]   [1, 2]
               [3, 4, 5, 8]        [1, 2, 6, 7]
                  [1, 2, 3, 4, 5, 6, 7, 8]
```

The base case must be `arr.length <= 1`. With only `arr.length === 0`, a one-element array splits into `[]` and `[x]`, and `mergeSort([x])` calls itself forever until the stack overflows.

This version **returns a new array** and leaves the input untouched (except that a 0- or 1-element input is returned as the same reference).

---

## 5. Merge sort complexity and stability

| Best | Average | Worst | Space |
|---|---|---|---|
| O(n log n) | O(n log n) | O(n log n) | O(n) |

**Why O(n log n)?** Halving n until the pieces have size 1 takes **log n levels**. On each level the merges together touch all **n elements** once:

```text
level 0:  1 merge  of size n        -> n work
level 1:  2 merges of size n/2      -> n work
level 2:  4 merges of size n/4      -> n work
...
log n levels x n work per level = O(n log n)
```

As a recurrence: `T(n) = 2T(n/2) + O(n)`, which solves to O(n log n).

**Merge sort does not care about the input order.** An already-sorted array is still split and merged in full, so the best case is also O(n log n). That predictability is its strength.

**Space O(n):** the merge buffers hold up to n elements, and the recursion stack is only O(log n) deep. (The `slice`-based version allocates more in total over time, but at any moment the live extra memory is O(n).)

**Stability:** a sort is **stable** if equal elements keep their original relative order. Because `merge` takes from the left half on ties (`<=`), merge sort is stable. Change it to `<` and it no longer is.

---

## 6. Where merge sort shines

- **Linked lists.** Merging by relinking nodes needs no extra array and no random access — the standard O(n log n) list sort.
- **External sorting.** Data too big for memory: sort chunks that fit, write them to disk, then merge the files sequentially.
- **Guaranteed worst case.** No input can push it to O(n²).
- **Stable sorting of records**, e.g. sort orders by date after sorting them by customer.
- **Hybrids.** **TimSort** (V8, Python, Java objects) is a merge sort that detects sorted runs and uses insertion sort for tiny pieces.

---

## 7. Quick sort: the idea

Quick sort also relies on 0- and 1-element arrays being sorted, but works differently:

1. Pick one element, the **pivot**.
2. Rearrange the array so everything **smaller** than the pivot is on its left and everything **greater or equal** is on its right. The pivot is now at its **final sorted index**.
3. Recursively apply the same process to the left part and the right part.

```text
[5, 2, 1, 8, 4, 7, 6, 3]   pivot 5
[3, 2, 1, 4] 5 [7, 6, 8]   5 is final
 pivot 3        pivot 7
[1, 2] 3 [4]   [6] 7 [8]
 pivot 1
 1 [2]
result: [1, 2, 3, 4, 5, 6, 7, 8]
```

Unlike merge sort, quick sort works **in place**: it only swaps elements inside the original array.

---

## 8. The pivot helper (partition)

The helper takes the array plus a `start` and `end` index, chooses a pivot, partitions the range in place, and **returns the pivot's final index**. The order of elements within each side does not matter.

For simplicity the pivot is the **first element** of the range (consequences in section 10).

```js
function swap(arr, i, j) {
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function pivot(arr, start = 0, end = arr.length - 1) {
  const pivotValue = arr[start];
  let swapIdx = start; // last index holding a value smaller than the pivot

  for (let i = start + 1; i <= end; i++) {
    if (arr[i] < pivotValue) {
      swapIdx++;
      swap(arr, swapIdx, i);
    }
  }

  swap(arr, start, swapIdx); // drop the pivot into its final place

  return swapIdx;
}
```

`swapIdx` counts how many values are smaller than the pivot, which is exactly where the pivot belongs.

```text
arr = [5, 2, 1, 8, 4, 7, 6, 3]    pivotValue = 5, swapIdx = 0

i=1  2 < 5  swapIdx=1  swap(1,1)  [5, 2, 1, 8, 4, 7, 6, 3]
i=2  1 < 5  swapIdx=2  swap(2,2)  [5, 2, 1, 8, 4, 7, 6, 3]
i=3  8                            (no change)
i=4  4 < 5  swapIdx=3  swap(3,4)  [5, 2, 1, 4, 8, 7, 6, 3]
i=5  7, i=6  6                    (no change)
i=7  3 < 5  swapIdx=4  swap(4,7)  [5, 2, 1, 4, 3, 7, 6, 8]
end: swap(0,4)                    [3, 2, 1, 4, 5, 7, 6, 8]
return 4
```

One pass over the range: **O(n) time, O(1) extra space**. This scheme (a single left-to-right scan) is a variant of **Lomuto partitioning**; **Hoare partitioning** scans from both ends and does fewer swaps.

---

## 9. Quick sort implementation

```js
function quickSort(arr, left = 0, right = arr.length - 1) {
  if (left < right) {
    const pivotIndex = pivot(arr, left, right);
    quickSort(arr, left, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, right);
  }

  return arr;
}

quickSort([5, 2, 1, 8, 4, 7, 6, 3]); // [1, 2, 3, 4, 5, 6, 7, 8]
```

- The base case is a range with **fewer than 2 elements**. Without the `left < right` check, `quickSort(arr, 0, -1)` recurses forever and throws `RangeError: Maximum call stack size exceeded`.
- The pivot is **excluded** from both recursive calls — it is already in place.
- The function **mutates** the input and returns the same array reference.

---

## 10. Quick sort complexity

| Best | Average | Worst | Space (stack) |
|---|---|---|---|
| O(n log n) | O(n log n) | O(n²) | O(log n) average, O(n) worst |

**Best / average case.** When the pivot lands near the median, each partition halves the range. The recursion tree has **log n levels**, and each level does **O(n)** partition work in total:

```text
                 8
         4               12
     2       6       10       14
   1   3   5   7   9   11  13   15
log n levels, O(n) comparisons per level
```

With random input the pivot is not perfect but good enough on average: about 1.39 · n log₂ n comparisons, still O(n log n).

**Worst case.** With a first-element pivot, an **already-sorted** (or reverse-sorted) array is the disaster: the pivot is always the minimum, so each partition peels off just one element.

```text
[1, 2, 3, 4, 5]   pivot 1 -> left [] , right [2, 3, 4, 5]
[2, 3, 4, 5]      pivot 2 -> left [] , right [3, 4, 5]
[3, 4, 5]         ...
n levels, (n-1) + (n-2) + ... + 1 = n(n-1)/2 comparisons = O(n²)
```

**Space.** Quick sort needs no buffer, but the recursion stack is as deep as the tree: O(log n) when balanced, **O(n)** in the worst case — which in JavaScript can overflow the call stack on a large sorted array.

---

## 11. Choosing the pivot and avoiding the worst case

The ideal pivot is the **median**, but finding it exactly costs time. Practical choices:

| Strategy | Effect |
|---|---|
| First (or last) element | Simple; O(n²) on sorted or reverse-sorted input — common in real data |
| **Random element** | Expected O(n log n) on **every** input; O(n²) still possible but astronomically unlikely |
| **Median of three** (first, middle, last) | Cheap; handles sorted input well |

A random pivot only needs one extra swap before partitioning:

```js
function randomPivot(arr, start, end) {
  const r = start + Math.floor(Math.random() * (end - start + 1));
  swap(arr, start, r); // move the random choice to the front

  return pivot(arr, start, end);
}
```

More refinements used in real libraries:

- **Many duplicates.** If every element is equal, the `<` test puts everything on the right: O(n²). A **three-way partition** (less / equal / greater) groups all copies of the pivot and never recurses into them.
- **Bounding the stack.** Recurse into the **smaller** side and loop on the larger one; the stack stays O(log n) even in the worst case.
- **Small ranges.** Switch to insertion sort below ~10–20 elements.

---

## 12. Merge sort vs quick sort

| | Merge sort | Quick sort |
|---|---|---|
| Worst-case time | **O(n log n)** | O(n²) (rare with a random pivot) |
| Average time | O(n log n) | O(n log n), usually faster in practice |
| Extra space | O(n) buffer | O(log n) stack, in place |
| Stable? | **Yes** (with `<=`) | **No** |
| Best for | Linked lists, external data, stability, guarantees | Arrays in memory, tight memory |

Quick sort is usually faster on arrays because it scans memory sequentially (cache-friendly), swaps in place, and has a small constant factor.

Quick sort is **not stable**. Sorting `[3, 5a, 5b, 1]` with the pivot helper above: the swap that moves `1` forward throws `5a` behind `5b`, and the result is `[1, 3, 5b, 5a]`.

In practice, V8's `Array.prototype.sort` uses **TimSort** and has been **stable** since ES2019; Java sorts primitives with dual-pivot quick sort and objects with TimSort.

Both are **comparison sorts**, and no comparison sort beats O(n log n) in general — radix sort, next, sidesteps that limit.

---

## Key interview points

- O(n²) sorts do not scale; merge sort and quick sort bring sorting down to **O(n log n)** using divide and conquer.
- `merge` of two sorted arrays is a **two-pointer** O(n + m) routine — do not forget to copy the leftovers.
- Merge sort: **O(n log n) in every case**, **O(n) extra space**, **stable** (take from the left on ties).
- Quick sort: partition around a pivot in place; **O(n log n) average, O(n²) worst**, **O(log n) stack** on average.
- First-element pivot + **already-sorted input** = worst case. Fix with a **random** or median-of-three pivot.
- All-equal elements also hurt a two-way partition; use a **three-way partition**.
- Choose **merge sort** for linked lists, stability, external sorting or guaranteed bounds; **quick sort** for fast in-memory array sorting.
- JavaScript's built-in sort is **TimSort** (a merge sort hybrid) and is **stable**.

## Summary

- Both algorithms use the fact that arrays of 0–1 elements are sorted and recurse down to them.
- Merge sort splits in half, sorts each half, and merges: log n levels × O(n) work = O(n log n), with an O(n) buffer.
- Quick sort places a pivot at its final index, then sorts each side in place; its speed depends on the pivot splitting the range evenly.
- Bad pivots on sorted or duplicate-heavy data cause O(n²) time and O(n) stack; random pivots, three-way partitioning and smaller-side recursion prevent it.
- Merge sort is stable and predictable; quick sort is in place and usually faster; real libraries combine them with insertion sort.
