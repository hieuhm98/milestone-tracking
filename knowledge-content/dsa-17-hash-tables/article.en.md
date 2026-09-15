# Hash Tables – Hash Functions, Collisions & Load Factor

## 1. What a hash table is

A **hash table** (hash map) stores **key-value pairs**. Like an array it is backed by contiguous slots, but you look values up by a meaningful **key** instead of a numeric index, and the keys have no order.

Its selling point is speed: on average, **insert, lookup and delete are all O(1)** — something neither arrays (O(n) search) nor linked lists (O(n) access) give you.

Every mainstream language ships one: JavaScript `Map`/`Set` (and plain objects, with restrictions), Python `dict`, Java `HashMap`, Go `map`, Ruby `Hash`.

Motivating example — storing colours. An array works, but it is not readable:

```js
const colorsArr = ["#ff69b4", "#ff4500", "#00ffff"];
colorsArr[2]; // which colour is this?

const colors = { pink: "#ff69b4", orangered: "#ff4500", cyan: "#00ffff" };
colors["cyan"]; // "#00ffff" — much clearer
```

The question for this topic: if built-in hash tables disappeared, **how would we build one ourselves?** The computer only knows how to jump to `slots[3]`, not to `slots["cyan"]`.

---

## 2. The hash function: from key to index

The trick is to keep an ordinary **array** and add a function that converts any key into a valid array index. That function is the **hash function**.

```text
key "pink"      --hash-->  0
key "cyan"      --hash-->  3
key "orangered" --hash-->  7

index:   0              1   2   3              4   5   6   7                   8   9
       ["pink","#ff69b4"]      ["cyan","#00ffff"]         ["orangered","#ff4500"]
```

Every operation follows the same recipe:

1. Run the key through the hash function to get an index — O(1) if the hash is O(1).
2. Jump straight to that array slot — O(1) random access.
3. Read, write or delete the pair stored there.

We store the **key together with the value** in the slot, because (as we will see) several keys can end up at the same index and we need to tell them apart.

---

## 3. What makes a good hash function

Here we mean a hash for data structures, **not a cryptographic hash** (SHA-256 is deliberately slow and has goals like pre-image resistance that we do not need). A good hash-table hash is:

1. **Fast** — ideally constant time. The hash runs on every single operation.
2. **Uniform** — spreads keys evenly over all indices instead of clustering them.
3. **Deterministic** — the same key always produces the same index.

A non-example for each property:

```js
// Not fast: burns 10,000 iterations on every call
function slowHash(key) {
  for (let i = 0; i < 10000; i++) {
    console.log("everyday I'm hashing");
  }

  return key.charCodeAt(0);
}

// Not uniform: every key collides at index 0 -> the table becomes a list
function sameHashedValue(key) {
  return 0;
}

// Not deterministic: set("pink") and get("pink") look in different slots
function randomHash(key) {
  return Math.floor(Math.random() * 1000);
}
```

Determinism is non-negotiable: a random hash is not slow, it is **broken** — you could never find a value again.

---

## 4. A first string hash

A simple hash that works on lowercase strings: map `"a"` to 1, `"b"` to 2, and so on, add the letters up, and keep the total inside the array with `%`.

```js
function hash(key, arrayLen) {
  let total = 0;

  for (const char of key) {
    const value = char.charCodeAt(0) - 96; // "a" is 97 -> 1
    total = (total + value) % arrayLen;
  }

  return total;
}

hash("pink", 10);      // 0
hash("orangered", 10); // 7
hash("cyan", 10);      // 3
```

Trace for `hash("pink", 10)`:

```text
char  value  total = (total + value) % 10
 p     16         (0 + 16) % 10 = 6
 i      9         (6 +  9) % 10 = 5
 n     14         (5 + 14) % 10 = 9
 k     11         (9 + 11) % 10 = 0   -> index 0
```

The modulo is what guarantees a valid index: `x % len` is always between `0` and `len - 1` for non-negative `x`.

This works, but it has three problems:

- **Only strings** (acceptable for learning; real tables hash numbers, objects, etc.).
- **Not constant time** — it is O(k) in the key length `k`.
- **Poor distribution** — addition ignores letter order, so every **anagram collides**: `"listen"` and `"silent"` both hash to 9. And `"darkblue"`, `"salmon"` and `"tomato"` all land on 4.

---

## 5. Refining the hash: primes and a length cap

```js
function hash(key, arrayLen) {
  let total = 0;
  const WEIRD_PRIME = 31;

  for (let i = 0; i < Math.min(key.length, 100); i++) {
    const value = key.charCodeAt(i) - 96;
    total = (total * WEIRD_PRIME + value) % arrayLen;
  }

  return total;
}
```

Two changes:

- **`Math.min(key.length, 100)`** caps the work, so the hash is effectively O(1) (at the price of more collisions for keys sharing a long prefix).
- **`total * 31 + value`** makes position matter — it is a polynomial `c₀·31ᵏ⁻¹ + c₁·31ᵏ⁻² + …`, so `"ab"` and `"ba"` now differ. Java's `String.hashCode` uses the same multiplier.

**Why primes?** A prime multiplier and a **prime table length** share no common factors, so the multiplication actually mixes bits across all slots. A concrete failure: with `arrayLen = 10`, `31 % 10 === 1`, so multiplying by 31 does nothing modulo 10 and `"listen"`/`"silent"` still collide. With a prime length of 13 they land on 6 and 12. That is why the class below defaults to size **53**.

**Gotcha:** `charCodeAt(i) - 96` is negative for uppercase letters and digits (`"A"` gives -31), and JavaScript's `%` keeps the sign (`-5 % 53 === -5`) — you get a **negative index**. The class below uses the raw char code to avoid this.

---

## 6. Collisions are inevitable

A **collision** happens when two different keys hash to the same index. They cannot be avoided:

- **Pigeonhole principle** — there are infinitely many possible string keys but only `m` slots, so some keys must share.
- **Birthday paradox** — with just 23 people, two share a birthday with >50% probability out of 365 days. In a table of 1,000 slots, a collision becomes likely after only about 40 keys.

So a hash table is really **a hash function plus a collision-resolution strategy**. The two classic strategies are **separate chaining** and **open addressing** (whose simplest form is **linear probing**).

---

## 7. Separate chaining

With **separate chaining**, each array slot holds a small collection — an array or a linked list — of all the pairs that hashed there (a "bucket").

```text
hash("darkblue") = 4, hash("salmon") = 4   (table length 10)

index:  0     1     2     3     4                         5 ...
       [ ]   [ ]   [ ]   [ ]   [ ["darkblue","#00008b"],  [ ]
                                 ["salmon",  "#fa8072"] ]
```

- **set**: hash, then scan the bucket. If the key exists, update its value; otherwise push a new pair.
- **get**: hash, then scan the bucket comparing keys.
- **delete**: hash, then remove the matching pair from the bucket.

Cost of each operation = O(1) to hash + O(bucket length) to scan. With a good hash and bucket length ≈ `n / m`, that is O(1) on average. Chaining degrades gracefully: the table still works when there are **more keys than slots**, just slower.

---

## 8. Linear probing

**Linear probing** stores exactly **one pair per slot**. On a collision it walks forward (`index + 1`, wrapping around) until it finds an empty slot.

```text
insert darkblue (hash 4) -> slot 4 free            -> store at 4
insert salmon   (hash 4) -> 4 taken                -> store at 5
insert tomato   (hash 4) -> 4 taken, 5 taken       -> store at 6

index:  3     4                       5                     6                     7
       [ ]   ["darkblue","#00008b"]  ["salmon","#fa8072"]  ["tomato","#ff6347"]  [ ]
```

`get("tomato")` probes 4, 5, 6 and stops when it finds the key — or at an **empty slot**, which proves the key is absent.

Trade-offs versus chaining:

| | Separate chaining | Linear probing |
|---|---|---|
| Pairs per slot | Many (bucket) | One |
| Can exceed table size? | Yes | No — must resize before full |
| Cache locality | Worse (pointers) | Better (neighbouring slots) |
| Main weakness | Long chains | **Primary clustering**: runs of full slots grow and slow every probe |
| Deletion | Just remove from bucket | Needs a **tombstone** marker |

Why tombstones: if you simply empty slot 5 (salmon), a later `get("tomato")` stops at the empty slot 5 and wrongly reports "not found". A tombstone says "deleted, keep probing".

---

## 9. Building a HashTable class: set and get

We implement separate chaining with arrays as buckets.

```js
class HashTable {
  constructor(size = 53) {
    this.keyMap = new Array(size);
  }

  _hash(key) {
    let total = 0;
    const WEIRD_PRIME = 31;

    for (let i = 0; i < Math.min(key.length, 100); i++) {
      total = (total * WEIRD_PRIME + key.charCodeAt(i)) % this.keyMap.length;
    }

    return total;
  }

  set(key, value) {
    const index = this._hash(key);

    if (!this.keyMap[index]) {
      this.keyMap[index] = [];
    }

    const bucket = this.keyMap[index];

    for (const pair of bucket) {
      if (pair[0] === key) {
        pair[1] = value; // key exists: update, don't duplicate

        return;
      }
    }

    bucket.push([key, value]);
  }

  get(key) {
    const bucket = this.keyMap[this._hash(key)];

    if (!bucket) return undefined;

    for (const [k, v] of bucket) {
      if (k === key) return v;
    }

    return undefined;
  }
}

const ht = new HashTable(17);
ht.set("maroon", "#800000");
ht.set("yellow", "#FFFF00");
ht.set("yellow", "#FFFF01");
ht.get("yellow"); // "#FFFF01"
ht.get("purple"); // undefined
```

Both methods are O(1) average (hash + short bucket scan) and O(n) worst case when every key lands in one bucket. Space for the whole table is O(n + m) for `n` pairs and `m` slots.

---

## 10. keys and values

To list keys or values we must walk **every slot** of the underlying array, including empty ones.

```js
// inside class HashTable
keys() {
  const result = [];

  for (const bucket of this.keyMap) {
    if (!bucket) continue;

    for (const [k] of bucket) {
      result.push(k);
    }
  }

  return result;
}

values() {
  const result = [];

  for (const bucket of this.keyMap) {
    if (!bucket) continue;

    for (const [, v] of bucket) {
      result.push(v);
    }
  }

  return result;
}
```

- Time: **O(n + m)** — `m` slots plus `n` pairs. Not O(1), and a huge mostly-empty table still costs O(m).
- Because `set` updates existing keys, `keys()` never returns duplicates. **Values can legitimately repeat** (two colours with the same hex code); if you want unique values, deduplicate with a `Set` in O(n) rather than `includes` in O(n²).
- The order follows slot positions, i.e. it looks **random** — a plain hash table has no meaningful ordering.

---

## 11. Big O of hash tables

| Operation | Average | Worst |
|---|---|---|
| Insert (`set`) | O(1) | O(n) |
| Access (`get`) | O(1) | O(n) |
| Delete | O(1) | O(n) |
| Search by **value** | O(n) | O(n) |
| `keys()` / `values()` | O(n + m) | O(n + m) |
| Space | O(n) | O(n) |

The **average case assumes a good hash and a bounded load factor**. The worst case is the world's worst hash — every key in one slot:

```text
good hash                          terrible hash
0: [a]   1: [b]   2: [c]           0: [a, b, c, d, e, f, ...]   <- a list
3: [d]   4: [e]   5: [f]           1: [ ]  2: [ ]  3: [ ]
=> O(1) per lookup                 => O(n) per lookup
```

Worst cases also occur through **hash flooding** attacks (keys crafted to collide), which is why runtimes use seeded hash functions.

Note also that hashing a key of length `k` costs O(k); "O(1)" treats key size as a constant.

---

## 12. Load factor and resizing

The **load factor** is `α = n / m` — stored pairs divided by slots.

- With chaining, the expected bucket length is α, so lookups cost O(1 + α).
- With linear probing α must stay below 1, and performance collapses as it approaches 1. Typical limits: ~0.75 for chaining (Java's `HashMap`), ~0.5–0.7 for probing.

When α crosses the threshold, the table **resizes**: allocate an array roughly twice as big (ideally a prime), then **rehash every pair**, because each index depends on `% this.keyMap.length`.

```js
// inside class HashTable (assumes set() tracks this.count)
_resize() {
  const oldMap = this.keyMap;
  this.keyMap = new Array(oldMap.length * 2 + 1);
  this.count = 0;

  for (const bucket of oldMap) {
    if (!bucket) continue;

    for (const [k, v] of bucket) {
      this.set(k, v); // new length -> new index
    }
  }
}
```

```text
m = 5, n = 4  (alpha = 0.8 > 0.75)  -> resize to m = 11, n = 4 (alpha ~ 0.36)
```

One resize is O(n), but because the size doubles, resizes get exponentially rarer. Averaged over many inserts, `set` stays **amortized O(1)** — the same argument as a dynamic array's `push`.

---

## 13. Hash tables in practice (JavaScript)

| Need | Use |
|---|---|
| Key → value, keys of any type, frequent add/delete | `Map` |
| Membership test / deduplication | `Set` |
| Fixed-shape record, JSON | plain object |
| Sorted order, min/max, range queries ("all keys between 10 and 20") | a balanced BST or sorted array, **not** a hash table |

Why prefer `Map` over objects as a dictionary: object keys are coerced to strings (`obj[1]` and `obj["1"]` are the same key), inherited keys such as `"constructor"` can surprise you, and `map.size` is O(1) whereas `Object.keys(obj).length` is O(n). `Map` and `Set` iterate in **insertion order**, a guarantee of the language spec layered on top of the hashing.

Typical interview uses: counting and duplicate detection (the frequency counter pattern), grouping anagrams, Two Sum (store `value → index`, look up `target - x` in O(1), turning O(n²) into O(n)), memoization, and the lookup half of an LRU cache.

---

## Key interview points

- A hash table = **array + hash function + collision strategy**; average O(1) insert, get and delete.
- A good hash is **fast, uniform, deterministic**; a random hash is broken, a constant hash turns the table into a list.
- **Prime** multipliers and table sizes spread keys better; e.g. multiplier 31 with size 10 does nothing because `31 % 10 === 1`.
- Collisions are unavoidable (pigeonhole, birthday paradox). **Separate chaining** keeps a bucket per slot; **linear probing** walks to the next free slot and suffers clustering and needs tombstones.
- Worst case is **O(n)** when keys collide; searching by value is always O(n); `keys()`/`values()` are O(n + m).
- **Load factor α = n/m**; past the threshold, double the size and **rehash every key** — amortized O(1) insert.
- No ordering: need sorted data or range queries → use a BST, not a hash table.
- In JS prefer `Map`/`Set` over plain objects for dictionaries.

## Summary

- Hash tables store key-value pairs in an array, using a hash function to turn keys into indices.
- Good hashes are fast, spread keys uniformly and always return the same index for the same key.
- Summing char codes collides on anagrams; multiplying by a prime and using a prime table length fixes much of that.
- Collisions are resolved by separate chaining (buckets) or linear probing (next empty slot).
- `set`/`get` are O(1) on average and O(n) in the worst case; listing keys or values walks the whole array.
- Keeping the load factor low through resizing and rehashing is what keeps operations O(1) in practice.
