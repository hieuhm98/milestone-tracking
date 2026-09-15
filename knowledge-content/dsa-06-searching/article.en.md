# Searching Algorithms – Linear, Binary, Naive String Search & KMP

## 1. What a searching algorithm is

A **searching algorithm** answers "is this value in the collection, and where?". Looking up a user by id, checking a word against a list, finding a substring — we take it for granted because JavaScript ships ready-made methods:

| Method | Returns | Compares with |
|---|---|---|
| `arr.indexOf(x)` | first index of `x`, or `-1` | strict equality `===` |
| `arr.includes(x)` | `true` / `false` | SameValueZero (`===`, but `NaN` equals `NaN`) |
| `arr.find(fn)` | first element where `fn` is truthy, or `undefined` | your callback |
| `arr.findIndex(fn)` | index of that element, or `-1` | your callback |

All four simply **walk the array from the start** and stop at the first hit. They know nothing about the order of the data, so they are **O(n)** in the worst case — even on a sorted array. One quirk: `[NaN].indexOf(NaN)` is `-1` (because `NaN !== NaN`), while `[NaN].includes(NaN)` is `true`.

The right algorithm depends on what you know: **unsorted** data forces a linear scan, **sorted** data unlocks binary search, and **text** has its own algorithms.

---

## 2. Linear search

**Linear search** checks every element in turn until it finds the target or runs out of elements.

```js
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }

  return -1;
}

linearSearch([5, 8, 1, 100, 12, 3, 12], 12); // 4 (first 12 wins)
```

```text
search for 12
[ 5,  8,  1, 100, 12,  3, 12 ]
  ^   ^   ^   ^    ^
  no  no  no  no   yes -> return 4
```

| Case | When | Time |
|---|---|---|
| Best | target is the first element | O(1) |
| Average | target somewhere in the middle (~n/2 checks) | O(n) |
| Worst | target is last or missing | O(n) |

Space is **O(1)**. Linear search is not "bad": on **unsorted** data it is the best you can do for a single lookup, because any element you skip could be the target. It also works on anything iterable (linked lists, streams).

---

## 3. Binary search: the idea

If the array is **sorted**, look at the middle element:

- equal to the target → done;
- smaller than the target → the target can only be in the **right half**;
- larger than the target → the target can only be in the **left half**.

Each comparison throws away **half** of the remaining candidates instead of one — **divide and conquer** applied to searching.

> Binary search needs **sorted** data with **random access** (O(1) access by index). On an unsorted array it silently returns wrong answers; on a linked list, reaching the middle costs O(n).

Searching for `15`:

```text
[ 1, 3, 4, 6, 8, 9, 11, 12, 15, 16, 17, 18, 19 ]
  0  1  2  3  4  5   6   7   8   9  10  11  12

step 1: L=0  R=12 mid=6  arr[6]=11 < 15  -> L = 7
step 2: L=7  R=12 mid=9  arr[9]=16 > 15  -> R = 8
step 3: L=7  R=8  mid=7  arr[7]=12 < 15  -> L = 8
step 4: L=8  R=8  mid=8  arr[8]=15 = 15  -> return 8
```

Four comparisons instead of the nine linear search would need.

---

## 4. Iterative binary search

Two pointers, `left` and `right`, bound the part of the array where the target could still be. The invariant: **if the target exists, its index is in `[left, right]`**.

```js
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;   // mid is too small: discard it and everything left of it
    } else {
      right = mid - 1;  // mid is too large: discard it and everything right of it
    }
  }

  return -1;            // empty range: left > right
}
```

Three details make it correct:

1. `right` starts at `arr.length - 1`, the last **valid** index, because the range is **inclusive**.
2. The loop runs while `left <= right`: a one-element range (`left === right`) must still be checked.
3. The new range **excludes** `mid` (`mid + 1` / `mid - 1`), so it shrinks every iteration and the loop always ends.

Time **O(log n)**, space **O(1)**.

---

## 5. Off-by-one pitfalls

Binary search is easy to explain and easy to get subtly wrong. Most bugs come from mixing two conventions.

| Bug | Symptom | Example |
|---|---|---|
| `while (left < right)` with an inclusive range | last candidate never checked | `binarySearch([7], 7)` → `-1` |
| `right = mid` with `left <= right` | infinite loop when `left === right` | `binarySearch([5], 3)` never returns |
| `left = mid` instead of `mid + 1` | infinite loop with two elements left | `[1, 2]`, target `2`: `mid` stays `0` |
| array not sorted | wrong answer, no error | `binarySearch([5, 1, 9, 3, 7], 3)` → `-1` |

```text
right = mid on [5], target 3
L=0 R=0 mid=0  arr[0]=5 > 3  -> R = mid = 0
L=0 R=0 mid=0  arr[0]=5 > 3  -> R = mid = 0   (nothing changed: loops forever)
```

Two consistent templates — pick one and never mix them:

| Template | Initial `right` | Loop condition | Discard right side |
|---|---|---|---|
| Inclusive `[left, right]` | `arr.length - 1` | `left <= right` | `right = mid - 1` |
| Half-open `[left, right)` | `arr.length` | `left < right` | `right = mid` |

In JavaScript numbers are exact up to 2⁵³, so `(left + right) / 2` cannot overflow; in Java or C++ write `left + (right - left) / 2`. **Always test** an empty array, one and two elements, and targets below, above, first and last.

---

## 6. Recursive binary search and why it is O(log n)

```js
function binarySearchRecursive(arr, target, left = 0, right = arr.length - 1) {
  if (left > right) return -1;                       // base case: empty range

  const mid = Math.floor((left + right) / 2);

  if (arr[mid] === target) return mid;

  if (arr[mid] < target) {
    return binarySearchRecursive(arr, target, mid + 1, right);
  }

  return binarySearchRecursive(arr, target, left, mid - 1);
}
```

Pass **indices**, not `arr.slice(...)`: slicing copies half the array on each call (O(n) extra work overall) and loses the original indices.

**Why O(log n)?** After `k` steps at most `n / 2ᵏ` candidates remain, so the range is empty after about `log₂ n` steps — precisely, at most **⌊log₂ n⌋ + 1** comparisons.

| n | max comparisons |
|---|---|
| 16 | 5 |
| 1,000 | 10 |
| 1,000,000 | 20 |
| 1,000,000,000 | 30 |

Doubling the data adds just **one** step. Both versions are O(1) in the best case (target at the first `mid`) and O(log n) on average and worst. Space is **O(1)** iterative, **O(log n)** recursive (call stack).

---

## 7. Variants: first occurrence and insertion point

With duplicates, plain binary search returns **whichever** match `mid` hits first: for `[2, 4, 4, 4, 7]` and `4` it returns `2`, not `1`. The fix is the **lower bound** — the first index whose value is `>= target`. Do not stop on a match; keep shrinking left.

```js
function lowerBound(arr, target) {
  let left = 0;
  let right = arr.length;           // half-open range [left, right)

  while (left < right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;                  // mid might be the answer, keep it
    }
  }

  return left;
}

lowerBound([2, 4, 4, 4, 7], 4);    // 1 -> first occurrence (check arr[1] === 4)
lowerBound([2, 4, 4, 4, 7], 5);    // 4 -> insertion point that keeps the array sorted
```

An **upper bound** (first index with value `> target`: change `<` to `<=`) gives the count of a value as `upperBound - lowerBound`. All are O(log n) time, O(1) space.

---

## 8. Naive string search

**String searching** asks how many times (or where) a **pattern** of length `m` appears in a **text** of length `n`. The **naive** approach tries every starting position and compares character by character, stopping at the first mismatch.

```text
text:    w o w o m g z o m g        pattern: o m g
i=0      o                          'w' != 'o' at first char
i=1        o m                      'w' != 'm' at second char
i=3            o m g                match  -> count = 1
i=7                    o m g        match  -> count = 2
```

```js
function naiveSearch(text, pattern) {
  if (pattern.length === 0) return 0;

  let count = 0;

  for (let i = 0; i <= text.length - pattern.length; i++) {
    let j = 0;

    while (j < pattern.length && text[i + j] === pattern[j]) {
      j++;
    }

    if (j === pattern.length) count++;
  }

  return count;
}

naiveSearch('wowomgzomg', 'omg'); // 2
naiveSearch('aaaa', 'aa');        // 3 (overlapping matches count)
```

There are `n - m + 1` start positions, each costing up to `m` comparisons: **O(n · m)** time, **O(1)** space. The worst case is real: text `aaaaaaaaab` with pattern `aaab` almost matches at every position.

---

## 9. The idea behind KMP

Naive search wastes information. Say the pattern is `lolol` and we matched `lolo` before a mismatch:

```text
text:    l o l o m ...
pattern: l o l o l
                 ^ mismatch ('m' != 'l')
```

Naive search shifts by one and re-reads text it has **already seen**. The **Knuth–Morris–Pratt (KMP)** algorithm (1977) avoids that. Ask: what is the **longest proper prefix of the pattern that is also a suffix of the matched part**? (*Proper* means not the whole string.) For `lolo` it is `lo`, length 2:

```text
matched part:  l o l o
                   l o    <- suffix "lo"
               l o        <- prefix "lo"
```

So the pattern slides forward to line its first two characters up with the last two we read, and comparison resumes **at pattern index 2** — the text pointer never moves backwards. These fall-back lengths depend only on the pattern, so KMP **precomputes** them into a table.

---

## 10. The prefix table (LPS)

The **LPS table** (longest proper prefix which is also a suffix; also called the *prefix function* or *failure function*) stores, for each index `i`, that length for `pattern[0..i]`.

```text
pattern:  l  o  l  o  l
lps:      0  0  1  2  3      "lolol": "lol" is both prefix and suffix

pattern:  a  b  a  c  a  b  a  b  d  a
lps:      0  0  1  0  1  2  3  2  0  1
```

```js
function buildLps(pattern) {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;  // length of the current longest prefix-suffix
  let i = 1;    // lps[0] is always 0

  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;              // extend the previous prefix-suffix
      lps[i] = len;
      i++;
    } else if (len > 0) {
      len = lps[len - 1]; // fall back to the next shorter candidate, keep i
    } else {
      lps[i] = 0;         // no prefix-suffix ends here
      i++;
    }
  }

  return lps;
}
```

Fall-back in `abacababda` from index 7 (`len = 3` after `aba`):

```text
i=7 'b' vs pattern[3]='c'  mismatch, len = lps[2] = 1
i=7 'b' vs pattern[1]='b'  match,    len = 2 -> lps[7] = 2
i=8 'd' vs pattern[2]='a'  mismatch, len = lps[1] = 0
i=8 'd' vs pattern[0]='a'  mismatch, len = 0 -> lps[8] = 0
i=9 'a' vs pattern[0]='a'  match,    len = 1 -> lps[9] = 1
```

Time **O(m)**, space **O(m)**.

---

## 11. KMP search

With the table ready, scan the text once. `j` counts the pattern characters currently matched.

```js
function kmpSearch(text, pattern) {
  if (pattern.length === 0) return 0;

  const lps = buildLps(pattern);
  let count = 0;
  let j = 0;

  for (let i = 0; i < text.length; i++) {
    while (j > 0 && text[i] !== pattern[j]) {
      j = lps[j - 1];         // fall back inside the pattern, i stays put
    }

    if (text[i] === pattern[j]) j++;

    if (j === pattern.length) {
      count++;
      j = lps[j - 1];         // keep going: allows overlapping matches
    }
  }

  return count;
}

kmpSearch('lolomlolol', 'lolol'); // 1
kmpSearch('lololol', 'lolol');    // 2 (matches at 0 and 2 overlap)
```

```text
text lolomlolol, pattern lolol, lps = [0, 0, 1, 2, 3]
i=0..3  l o l o  match               j = 4
i=4     'm' vs pattern[4]='l'  miss  j = lps[3] = 2
        'm' vs pattern[2]='l'  miss  j = lps[1] = 0
        'm' vs pattern[0]='l'  miss  j = 0
i=5..9  l o l o l  match             j = 5 -> count = 1, j = lps[4] = 3
```

**Why O(n + m)?** `i` only moves forward, `n` times. `j` rises by at most 1 per character, so at most `n` times in total, and every fall-back strictly lowers `j` — so there are at most `n` fall-backs overall. Scanning is O(n), the table O(m): **O(n + m)** time, **O(m)** space, even on inputs that make naive search quadratic.

---

## 12. Choosing a search

| Algorithm | Requirement | Time | Space |
|---|---|---|---|
| Linear search | none | O(n) | O(1) |
| Binary search (iterative) | sorted, random access | O(log n) | O(1) |
| Binary search (recursive) | sorted, random access | O(log n) | O(log n) |
| Naive string search | none | O(n · m) | O(1) |
| KMP | none | O(n + m) | O(m) |

- **One lookup in unsorted data** → linear search; sorting first already costs O(n log n).
- **Many lookups** → sort once, then binary search: O(n log n + k log n) beats O(k · n) for large `k`. For pure membership, a `Set` gives O(1) average.
- **Strings** → in production use `text.includes(pattern)`; engines use tuned algorithms. Write KMP when asked or when you need a guaranteed linear worst case. Rabin–Karp and Boyer–Moore are other well-known options.

---

## Key interview points

- `indexOf`, `includes`, `find`, `findIndex` are **linear scans, O(n)**, even on sorted arrays; `includes` finds `NaN`, `indexOf` does not.
- Linear search: best O(1), average and worst **O(n)**, space O(1) — the right tool for unsorted data.
- Binary search needs **sorted data with O(1) index access**: **O(log n)** time, O(1) space iterative, O(log n) stack recursive.
- Pick **one** template: inclusive (`right = n - 1`, `left <= right`, `right = mid - 1`) or half-open (`right = n`, `left < right`, `right = mid`). Mixing them misses elements or loops forever.
- Use **lower bound** for first occurrence, insertion point and counting duplicates.
- Naive string search is **O(n · m)**; KMP is **O(n + m)** time, **O(m)** space thanks to the **LPS table**, and never moves the text pointer back.

## Summary

- The search algorithm depends on the data: unsorted, sorted or text.
- Linear search checks every element: O(n).
- Binary search halves the candidates each step: O(log n), but only on sorted, indexable data.
- Off-by-one bugs come from inconsistent bounds; keep the invariant and loop condition in step.
- Naive string search tries the pattern at every position: O(n · m).
- KMP precomputes prefix-suffix lengths, then scans the text once: O(n + m).
