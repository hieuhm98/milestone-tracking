# Arrays, Objects, Map & Set – Built-in Structures Through Big O

## 1. The data structures you get for free

Before you build your own linked lists, trees and heaps, it is worth analysing the structures JavaScript gives you out of the box. You use them in almost every line of code, and most "why is this slow?" bugs come from not knowing what a built-in operation really costs.

This topic covers the Big O of **objects** and **arrays**, why adding to the **front** of an array is expensive, the cost of common built-in methods, when to reach for `Map` and `Set`, and why building a **string** in a loop is a hidden trap.

Quick reminder from the previous topic: we care about how the work **grows with n**, we drop constants, and we count hidden loops inside library calls.

---

## 2. Objects: unordered key-value pairs

An object stores values under **keys**. Conceptually it is a hash table: the engine turns the key into a location, so it never has to scan every entry.

```js
const instructor = {
  firstName: "Kelly",
  isInstructor: true,
  favoriteNumbers: [1, 2, 3, 4],
};

instructor.firstName;        // access    O(1)
instructor.lastName = "Lee"; // insertion O(1)
delete instructor.isInstructor; // removal O(1)
```

| Operation | Big O | Why |
|---|---|---|
| Access by key | O(1) | The key leads straight to the value |
| Insertion | O(1) | No other entry has to move |
| Removal | O(1) | No other entry has to move |
| Search for a **value** | O(n) | Values are not indexed; you must check every key |

The O(1) figures are **average** costs of a hash lookup; the worst case is discussed in section 12.

**Use an object when** you do not need order and you want fast lookup, insertion and removal by a known key: a user record, a config, a lookup table from id to data.

"Unordered" is not quite literal (integer-like keys iterate first, in ascending order), but do not rely on key order — if order matters, use an array or a `Map`.

---

## 3. The cost of object methods

The methods that turn an object into a list must visit every key, so they are linear:

| Method | Big O | Notes |
|---|---|---|
| `Object.keys(obj)` | O(n) | Builds a new array of n keys (O(n) space too) |
| `Object.values(obj)` | O(n) | Builds a new array of n values |
| `Object.entries(obj)` | O(n) | Builds n `[key, value]` pairs |
| `obj.hasOwnProperty(key)` / `Object.hasOwn(obj, key)` | O(1) | A single key lookup |
| `key in obj` | O(1) | Also walks the (short) prototype chain |

A classic hidden cost is checking a **value** instead of a key:

```js
const stock = { apple: 3, pear: 0, kiwi: 7 };

// O(1): look up by key
const hasKiwi = Object.hasOwn(stock, "kiwi");

// O(n): Object.values builds an array, then includes scans it
const anySoldOut = Object.values(stock).includes(0);
```

Also beware of `Object.keys(obj).length` inside a loop — it rebuilds a whole array just to count the keys, turning an O(n) loop into O(n²).

---

## 4. Arrays: ordered lists

An array keeps its elements **in order**, each at a numeric **index**. You can picture it as a row of numbered slots:

```text
index:   0          1          2
       +----------+----------+----------+
names: | "Michael"| "Melissa"| "Andrea" |
       +----------+----------+----------+
```

```js
const names = ["Michael", "Melissa", "Andrea"];
const values = [true, {}, [], 2, "awesome"]; // JS arrays can mix types
```

| Operation | Big O | Why |
|---|---|---|
| Access by index `arr[i]` | O(1) | Jump straight to slot i, no matter how long the array is |
| Search for a value | O(n) | Unsorted: check slot by slot |
| Insertion | **it depends** | End: O(1); front or middle: O(n) |
| Removal | **it depends** | End: O(1); front or middle: O(n) |

Access by index is O(1) because the engine can compute where slot i lives. A common misconception is that `arr[9999]` is slower than `arr[0]` — it is not.

**Use an array when** order matters (a playlist, a queue of events, rows sorted by date) or when you mostly access by position.

---

## 5. push/pop vs shift/unshift

The "it depends" is all about **indexes**. Every element knows its index, so any change that moves elements forces the array to renumber them.

Adding or removing at the **end** touches nothing else:

```text
push("Zoe"):
  0: Michael   1: Melissa   2: Andrea   3: Zoe      <- only a new slot
```

Adding or removing at the **front** shifts every element by one:

```text
unshift("Raj"):
  before:            0: Michael   1: Melissa   2: Andrea
  after:   0: Raj    1: Michael   2: Melissa   3: Andrea
                     ^ every existing element got a new index
```

| Method | What it does | Time |
|---|---|---|
| `push(x)` | add to end | O(1) amortized |
| `pop()` | remove from end | O(1) |
| `unshift(x)` | add to front | O(n) |
| `shift()` | remove from front | O(n) |

`push` is **amortized** O(1): occasionally the engine must allocate a bigger backing store and copy everything (O(n)), but that happens rarely enough that the average cost per push stays constant.

So `push` + `pop` make an efficient **stack**, but `push` + `shift` is a slow **queue** for large inputs:

```js
function drainQueue(tasks) {
  let processed = 0;

  while (tasks.length > 0) {
    tasks.shift();           // O(n) each time
    processed++;
  }

  return processed;
}
// n shifts of O(n) each -> O(n²) overall
```

Engines sometimes optimise `shift` on small arrays, but you should assume O(n). Later topics build queues (linked lists, two stacks) where both ends are O(1).

---

## 6. Inserting and removing in the middle

`splice` inserts or removes at any position, but everything after that position must be renumbered:

```js
const letters = ["a", "b", "d", "e"];

letters.splice(2, 0, "c"); // insert "c" at index 2 -> ["a","b","c","d","e"]
letters.splice(1, 1);      // remove index 1        -> ["a","c","d","e"]
```

```text
splice(2, 0, "c") on [a, b, d, e]
  a   b   d   e
          |   |
          v   v      d and e each move one slot right
  a   b   c   d   e
```

Cost: O(n) in general (precisely, proportional to the elements after the index plus the items inserted or removed). Inserting near the end is cheap; inserting near the front is as bad as `unshift`.

**Trick when order does not matter:** to delete index `i` in O(1), overwrite it with the last element and `pop`.

```js
function removeUnordered(arr, i) {
  arr[i] = arr[arr.length - 1]; // move last element into the hole
  arr.pop();                    // O(1)
}

const bag = [10, 20, 30, 40];
removeUnordered(bag, 1); // bag is now [10, 40, 30]
```

---

## 7. Big O of common array methods

| Method | Time | Extra space | Notes |
|---|---|---|---|
| `arr[i]`, `arr.at(i)`, `arr.length` | O(1) | O(1) | |
| `push` / `pop` | O(1) | O(1) | `push` amortized |
| `shift` / `unshift` | O(n) | O(1) | re-indexes everything |
| `concat` | O(n + m) | O(n + m) | copies both arrays |
| `slice(start, end)` | O(k) | O(k) | k = length of the copy; `slice()` copies all n |
| `[...arr]`, `Array.from` | O(n) | O(n) | a full copy |
| `splice` | O(n) | O(k) | k = removed items returned |
| `indexOf` / `includes` / `find` / `some` / `every` | O(n) | O(1) | linear scan, may stop early |
| `forEach` / `map` / `filter` / `reduce` | O(n) | O(1) / O(n) / O(n) / O(1)* | *plus whatever the callback builds |
| `reverse` | O(n) | O(1) | in place |
| `join` | O(total length) | O(total length) | |
| `sort` | O(n log n) | O(n) | V8 uses TimSort, stable since ES2019 |

Two traps hide in this table:

1. **The callback counts.** `map` is O(n) only if the callback is O(1). A callback that calls `includes` on another array of size m makes it O(n · m).
2. **Chaining multiplies memory, not time.** `arr.filter(f).map(g).reduce(h)` is three O(n) passes — O(3n) = O(n) time — but creates two intermediate arrays.

```js
// O(n · m): includes scans `banned` for every user
const allowed = users.filter((u) => !banned.includes(u.id));

// O(n + m): build a Set once, then O(1) checks
const bannedSet = new Set(banned);
const allowedFast = users.filter((u) => !bannedSet.has(u.id));
```

---

## 8. Arrays vs objects: choosing the right one

| Need | Pick | Because |
|---|---|---|
| Keep items in order | Array | Objects do not model order |
| Access "the 5th item" | Array | O(1) by index |
| Look up by id/name | Object / Map | O(1) by key vs O(n) search in an array |
| Frequent add/remove at the front | Neither (for large n) | Arrays are O(n) there; use a proper queue |
| Check "have I seen X?" | Set | O(1) membership |

A very common optimisation is to **turn an array into a lookup table** once, then answer many queries in O(1):

```js
const users = [
  { id: 7, name: "Ana" },
  { id: 3, name: "Bao" },
];

// O(n) per call -> O(n · q) for q queries
const findUserSlow = (id) => users.find((u) => u.id === id);

// O(n) once to build, then O(1) per query -> O(n + q)
const usersById = {};

for (const u of users) {
  usersById[u.id] = u;
}

const findUserFast = (id) => usersById[id];
```

You trade O(n) extra memory for a big time win — the time/space trade-off in action.

---

## 9. Map: a better dictionary

`Map` (ES2015) is a dedicated key-value collection. Its operations have the same average costs as an object, but it fixes several object quirks:

```js
const visits = new Map();

visits.set("/home", 1);                             // O(1)
visits.set("/home", visits.get("/home") + 1);       // O(1)
visits.has("/about");                               // O(1) -> false
visits.delete("/home");                             // O(1)
visits.size;                                        // O(1)
```

| | Object | Map |
|---|---|---|
| Key types | strings and symbols (numbers become strings) | **any** value: objects, functions, numbers |
| Order | integer keys first, then insertion | always insertion order |
| Count entries | `Object.keys(obj).length` — O(n) | `map.size` — O(1) |
| Accidental keys | inherits from `Object.prototype` | none |
| Iterate | `Object.entries` (builds array) | `for (const [k, v] of map)` directly |
| Frequent add/delete | can degrade to a slower mode | designed for it |
| JSON | native | needs conversion |

```js
const scores = new Map();
const alice = { name: "Alice" };

scores.set(alice, 95);   // object as key: works
scores.get(alice);       // 95

const plain = {};
plain[alice] = 95;       // key becomes the string "[object Object]"
```

Rule of thumb: use a plain object for fixed-shape records and JSON; use a `Map` for a dynamic dictionary whose keys are added and removed at run time.

---

## 10. Set: unique values

A `Set` stores each value at most once, with O(1) average `add`, `has` and `delete`:

```js
const seen = new Set([3, 1, 3, 2]); // O(n) to build -> Set {3, 1, 2}

seen.add(4);     // O(1)
seen.has(1);     // O(1) -> true (array includes would be O(n))
seen.delete(3);  // O(1)
seen.size;       // O(1) -> 3

const unique = [...new Set([1, 2, 2, 3, 3])]; // O(n) dedupe -> [1, 2, 3]
```

Set operations by hand, with a and b the two set sizes:

```js
function intersection(a, b) {
  const result = new Set();

  for (const x of a) {
    if (b.has(x)) result.add(x);
  }

  return result;
}
// O(a) time (each b.has is O(1)), O(min(a, b)) extra space
```

Modern runtimes (for example Node 22+) also provide `a.union(b)`, `a.intersection(b)` and `a.difference(b)` directly.

Equality pitfalls: a `Set` compares with **SameValueZero** — `NaN` equals `NaN`, but objects and arrays are compared **by reference**:

```js
new Set([NaN, NaN]).size;        // 1
new Set([[1, 2], [1, 2]]).size;  // 2: two different array objects
```

Compared with an array, a `Set` gives O(1) instead of O(n) membership tests and removal by value, but it has no access by position and no duplicates.

---

## 11. Strings are immutable

JavaScript strings behave like **read-only arrays of characters** (UTF-16 code units). You can read `s[i]` and `s.length` in O(1), but you can never change a string in place:

```js
const s = "cat";
s[0] = "b";     // silently ignored (TypeError in strict mode)
console.log(s); // "cat"

const t = "b" + s.slice(1); // a brand-new string "bat": O(n)
```

Every "modification" creates a new string, so almost every string method is O(n):

| Operation | Time |
|---|---|
| `s[i]`, `s.charAt(i)`, `s.length` | O(1) |
| `slice`, `substring`, `toUpperCase`, `trim`, `split`, `replaceAll` | O(n) |
| `a === b` | O(n) worst case (compares character by character) |
| `s.includes(sub)` / `indexOf(sub)` | O(n) typical, up to O(n · m) naive worst case |
| `s + t` | O(n + m): copies into a new string |

The trap is building a string with `+=` in a loop. On paper each step copies everything built so far: 1 + 2 + … + n = O(n²).

```js
function buildSlow(n) {
  let out = "";

  for (let i = 0; i < n; i++) {
    out += "x";          // conceptually copies out each time
  }

  return out;
}

function buildFast(n) {
  const parts = [];

  for (let i = 0; i < n; i++) {
    parts.push("x");     // O(1) amortized
  }

  return parts.join(""); // one O(n) copy at the end
}
```

Engines like V8 optimise `+=` with rope structures, so it is often fast in practice — but in interviews, and in languages such as Java or Python, the collect-then-`join` pattern is the one guaranteed to be O(n).

---

## 12. "O(1)" is an average: caveats and pitfalls

The O(1) costs for objects, `Map` and `Set` are **average-case** costs of a hash table. If many keys collide in the same bucket, a lookup degrades towards **O(n)** in the worst case (hash tables get their own topic later). In everyday code with a good engine, treat them as O(1) but say "average" in interviews.

Other traps worth knowing:

- **Sparse arrays.** `const a = []; a[1_000_000] = 1;` gives `a.length === 1000001` with holes; iterating it is not "one element".
- **`delete arr[i]`** leaves a hole (`undefined` slot) and does not shrink the array or re-index — use `splice` or the swap-and-pop trick.
- **`delete` on objects** in hot code can push the engine into a slower dictionary representation; a `Map` is built for frequent deletes.
- **Sort is not linear.** Calling `sort` inside a loop gives O(k · n log n).
- **`unshift` in a loop.** Building a result with `unshift` k times is O(k²); `push` then `reverse` (or `slice`) is O(k).

---

## Key interview points

- Objects, `Map` and `Set`: insert, remove, lookup by key are **O(1) average**; searching for a **value** is O(n).
- `Object.keys/values/entries` are **O(n)** and allocate a new array; `map.size` is O(1).
- Arrays: access by index **O(1)**, search O(n); `push`/`pop` **O(1)**, `shift`/`unshift` **O(n)** because every index changes.
- `splice`, `slice`, `concat`, spread, `indexOf`, `includes`, `map`, `filter` are **O(n)**; `sort` is **O(n log n)**.
- A method inside a loop multiplies: `filter` + `includes` is O(n · m) — build a `Set` for O(n + m).
- Prefer `Map` for dynamic dictionaries or non-string keys, `Set` for membership and dedupe.
- Strings are **immutable**: each edit is a new O(n) string; build with an array and `join`.
- Say "O(1) **average**" for hash-based lookups — the worst case is O(n).

## Summary

- JavaScript gives you objects, arrays, `Map`, `Set` and strings; knowing their costs prevents accidental O(n²) code.
- Objects are unordered and fast by key; arrays are ordered and fast by index and at the end.
- Anything that shifts indexes (`shift`, `unshift`, `splice` near the front) is O(n); swap-and-pop removes in O(1) when order does not matter.
- `Map` is the dictionary of choice for dynamic keys; `Set` turns O(n) membership tests into O(1).
- Strings cannot be changed in place, so repeated concatenation copies; collect parts and `join` once.
