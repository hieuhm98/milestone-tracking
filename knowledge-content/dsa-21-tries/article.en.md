# Tries – Prefix Trees for Fast String Lookup

## 1. Why a trie?

Many string problems are really about **prefixes**: a search box suggesting `"cart"`, `"carton"`, `"cartoon"` as you type `"car"`; a spell checker; a router finding the longest matching prefix of an IP address.

A hash set answers "is `"cart"` a word?" well, but it knows nothing about prefixes. To find every word starting with `"car"`, a set must scan **all N words**. A sorted array can binary-search for the prefix, but inserting a word costs O(N).

A **trie** (pronounced "try", from re*trie*val), also called a **prefix tree**, stores strings **character by character along paths from a root**. Words that share a prefix share the nodes for that prefix, so "all words starting with `car`" is simply "everything below the node reached by `c → a → r`".

---

## 2. Trie structure

- The **root** represents the empty string and holds no character.
- Each **edge** is labelled with one character; each **node** represents the prefix spelled by the path from the root to it.
- Each node has a **children** map (character → child node) and an **`isEnd`** flag: "a complete word ends here".

The trie for `car`, `cart`, `cat`, `do`, `dog` (`*` = `isEnd` is true):

```text
             (root)
            /      \
           c        d
           |        |
           a        o*        o* ends "do"
          / \       |
        r*   t*     g*        g* ends "dog", t* (right) ends "cat"
        |
        t*                    r* ends "car", t* (bottom) ends "cart"
```

Two things to notice:

- **`isEnd` is essential.** `"ca"` is a path in the trie but not a word; `"car"` is both a path and a word, even though `"cart"` continues past it. Without the flag you cannot tell them apart.
- **The depth of a node equals the length of its prefix**, not the number of words. Lookup cost therefore depends on the length of the string, never on how many words are stored.

---

## 3. Representing a node

Two common layouts:

```js
// Flexible: any characters, memory proportional to real children
class TrieNode {
  constructor() {
    this.children = new Map(); // char -> TrieNode
    this.isEnd = false;
  }
}

// Fixed alphabet: lowercase a-z only
class ArrayTrieNode {
  constructor() {
    this.children = new Array(26).fill(null);
    this.isEnd = false;
  }
}

const indexOf = (ch) => ch.charCodeAt(0) - 97; // 'a' -> 0, 'z' -> 25
```

| Layout | Child lookup | Memory per node | Children in sorted order? |
|---|---|---|---|
| `Map` / object | O(1) average (hashing) | Proportional to actual children | No — insertion order, sort if needed |
| Array of size σ (alphabet) | O(1), a direct index | Always σ slots, even if empty | Yes, for free |

σ (sigma) is the **alphabet size**: 26 for lowercase letters, 2 for bits, 128 for ASCII. Array nodes are faster and simpler in interviews with "lowercase English letters"; `Map` nodes are the safe default for arbitrary text, where σ-slot arrays would waste enormous memory. The rest of this topic uses `Map`.

---

## 4. Insert

Walk the word from the root. For each character, follow the existing child or create it. Mark the last node as a word end.

```js
class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;

    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }

      node = node.children.get(ch);
    }

    node.isEnd = true;
  }
}
```

Trace: insert `"care"` into the trie from section 2.

```text
ch  node before   child exists?   action
c   root          yes             move to c
a   c             yes             move to a
r   a             yes             move to r   (r is already a word end - untouched)
e   r             no              create e, move to e
end               -               e.isEnd = true
```

Only one new node was created — the three shared characters cost nothing extra. That sharing is where tries save space on dictionaries full of common prefixes.

- **Time:** O(L), L = word length.
- **Space:** O(L) new nodes in the worst case (no shared prefix), O(1) if the word's path already exists.

Inserting the same word twice just sets `isEnd = true` again — the trie behaves like a set.

---

## 5. Search and startsWith

Both walk the same path; they differ only in the final check. Factor the walk into a helper:

```js
  // Inside class Trie
  findNode(str) {
    let node = this.root;

    for (const ch of str) {
      node = node.children.get(ch);

      if (node === undefined) return null;
    }

    return node;
  }

  search(word) {
    const node = this.findNode(word);

    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this.findNode(prefix) !== null;
  }
```

| Call on the section 2 trie | Path exists? | `isEnd`? | Result |
|---|---|---|---|
| `search("car")` | yes | yes | `true` |
| `search("ca")` | yes | no | `false` |
| `startsWith("ca")` | yes | — | `true` |
| `search("cars")` | no (`s` missing) | — | `false` |
| `startsWith("")` | yes (root) | — | `true` |

The classic bug is writing `search` as `findNode(word) !== null` — that is `startsWith`, and it wrongly reports `"ca"` as a word.

- **Time:** O(L) for both; they can stop early at the first missing character.
- **Space:** O(1) — just a pointer.

---

## 6. Autocomplete: collecting words under a prefix

Autocomplete = `findNode(prefix)`, then a **depth-first traversal** of that subtree, building the string as you go and recording every node where `isEnd` is true.

```js
  // Inside class Trie
  autocomplete(prefix, limit = Infinity) {
    const results = [];
    const start = this.findNode(prefix);

    if (start === null) return results;

    const dfs = (node, path) => {
      if (results.length >= limit) return;

      if (node.isEnd) results.push(path);

      const keys = [...node.children.keys()].sort(); // alphabetical output

      for (const ch of keys) {
        dfs(node.children.get(ch), path + ch);
      }
    };

    dfs(start, prefix);

    return results;
  }
```

```js
const trie = new Trie();
['car', 'cart', 'cat', 'care', 'do', 'dog'].forEach((w) => trie.insert(w));

trie.autocomplete('ca');     // ['car', 'care', 'cart', 'cat']
trie.autocomplete('ca', 2);  // ['car', 'care']
trie.autocomplete('x');      // []
```

Because DFS visits a parent before its children and children in sorted order, results come out in **lexicographic order**, with shorter words before their extensions.

- **Time:** O(P + M), P = prefix length, M = number of nodes in the subtree (plus the cost of building the output strings). Sorting keys adds a factor for σ, which is a constant for a fixed alphabet.
- **Space:** O(D) recursion depth, D = length of the longest word in the subtree, plus the output.

Real autocomplete systems store a **score** at each word end (or cache the top-k suggestions per node) to return the best few matches, not all of them.

---

## 7. Delete

Deleting must not break other words. Unmark `isEnd`, then **prune** nodes on the way back up only while they are neither a word end nor a parent of other nodes.

```js
  // Inside class Trie
  delete(word) {
    if (!this.search(word)) return false;

    const prune = (node, depth) => {
      if (depth === word.length) {
        node.isEnd = false;

        return node.children.size === 0; // safe to remove?
      }

      const ch = word[depth];

      if (prune(node.children.get(ch), depth + 1)) {
        node.children.delete(ch);
      }

      return !node.isEnd && node.children.size === 0;
    };

    prune(this.root, 0);

    return true;
  }
```

Three cases, using the words `car`, `cart`, `cat`:

```text
delete "cart" : t has no children -> remove t; r is a word end -> stop
delete "car"  : r still has child t -> only clear r.isEnd, remove nothing
delete "cat"  : remove t; a still has child r -> stop
```

- **Time:** O(L). **Space:** O(L) for the recursion stack.
- A simpler "lazy" delete only sets `isEnd = false`; it is correct but leaves dead nodes behind.

---

## 8. Complexity summary

L = length of the string in the operation, N = number of words, S = total characters of all words, σ = alphabet size.

| Operation | Time | Extra space |
|---|---|---|
| `insert(word)` | O(L) | O(L) new nodes worst case |
| `search(word)` | O(L) | O(1) |
| `startsWith(prefix)` | O(L) | O(1) |
| `delete(word)` | O(L) | O(L) recursion |
| `autocomplete(prefix)` | O(P + M) | O(D) recursion + output |
| Build from N words | O(S) | O(S) nodes worst case |

Memory is the trie's weak spot. The worst case is O(S) nodes — no prefixes shared at all — and every node is an object with a `Map` or a σ-slot array. With array nodes that is up to **O(S · σ)** pointer slots. A trie of a large English dictionary can easily use several times the memory of the raw strings.

---

## 9. Trie vs hash set vs sorted array

| Need | Hash set of strings | Sorted array + binary search | Trie |
|---|---|---|---|
| Exact lookup | O(L) average | O(L log N) | O(L) worst case |
| Insert | O(L) average | O(N) shifting | O(L) |
| All words with a prefix | O(N · L) scan | O(L log N + output) | O(P + M) |
| Iterate in sorted order | Sort first, O(N log N · L) | Already sorted | DFS, sorted with array nodes |
| Memory | Lowest | Low | Highest |
| Longest-prefix match | Try every prefix | Awkward | One walk, O(L) |

Key subtlety: **hash lookup of a string is not O(1)** — computing the hash reads all L characters, so it is O(L) too. A trie does not beat a hash set on exact lookup speed; in practice the set is usually faster thanks to locality and fewer allocations. Choose a trie when you need **prefix operations**: autocomplete, `startsWith`, longest prefix, or search that advances **one character at a time** (typing, walking a grid) and can abandon a dead prefix early.

---

## 10. Variations

**Prefix counts.** Store `count` on every node, incremented on each insert along the path. `countWordsWithPrefix(p)` is then O(P) instead of a subtree traversal. Check `search(word)` first so duplicate inserts do not double-count.

**Compressed trie (radix tree / Patricia trie).** Chains of single-child nodes are merged into one edge labelled with a whole substring. Same operations, far fewer nodes. Used in IP routing tables, HTTP routers and some key-value stores.

```text
standard trie                 radix tree (same words)
(root)                        (root)
 |- c - a - r* - t*            |- "ca" -+- "r"* - "t"*
 |        \- t*                |        +- "t"*
 \- d - o* - g*                \- "do"* - "g"*
```

**Binary (bitwise) trie.** Insert numbers bit by bit from the most significant bit; σ = 2. "Maximum XOR of two numbers in an array" becomes O(n · B) for B-bit numbers: for each number, greedily walk towards the opposite bit.

**Suffix trie.** Insert every suffix of a text so any substring query becomes a prefix query (O(n²) nodes naively; suffix trees/arrays are the compact forms).

---

## 11. Classic interview problems

**Word search with wildcards** (`.` matches any letter). On a `.`, branch into every child — worst case O(σ^L), but real dictionaries prune quickly.

```js
function matches(node, word, i = 0) {
  if (i === word.length) return node.isEnd;

  const ch = word[i];

  if (ch === '.') {
    for (const child of node.children.values()) {
      if (matches(child, word, i + 1)) return true;
    }

    return false;
  }

  const child = node.children.get(ch);

  return child !== undefined && matches(child, word, i + 1);
}
// matches(trie.root, 'c.t') -> true ("cat")
```

**Word Search II** (find all dictionary words in a letter grid). Build a trie of the words, then DFS from each cell while moving down the trie. Stop as soon as the current path is not a prefix — one trie walk replaces a separate grid search per word. Remove found words (or clear `isEnd`) to avoid duplicates.

**Replace words / shortest root.** For each word in a sentence, walk the trie of roots and stop at the first `isEnd` node: O(L) per word.

**Longest common prefix of all strings.** Insert them, then walk from the root while the node has exactly one child and is not a word end.

---

## Key interview points

- A trie stores strings as **root-to-node paths**; shared prefixes share nodes. Each node has **children** and an **`isEnd`** flag.
- `insert`, `search`, `startsWith` and `delete` are all **O(L)** in the string length, **independent of N**.
- `search` checks **path exists AND `isEnd`**; `startsWith` checks only that the path exists.
- Hashing a string is also O(L) — a trie wins on **prefix queries**, not raw exact lookup.
- Autocomplete = find the prefix node + **DFS** of its subtree: O(P + M).
- Trade-off: **high memory** — O(S) nodes, up to O(S · σ) slots with array children. Mention radix trees as the fix.
- Array-of-26 children for lowercase-only input; `Map` for general text.
- Reach for a trie in: autocomplete, spell check, wildcard dictionary, Word Search II, longest-prefix matching, max XOR (binary trie).

## Summary

- A trie (prefix tree) indexes strings character by character; node depth equals prefix length.
- `isEnd` separates real words from mere prefixes such as `"ca"`.
- Insert/search/startsWith walk one path in O(L); delete prunes nodes that are no longer needed.
- Autocomplete walks to the prefix node, then collects word ends by DFS, in sorted order when children are sorted.
- Compared with a hash set, a trie costs more memory but makes prefix operations cheap.
- Variants: prefix counts, compressed radix trees, binary tries for XOR, suffix tries for substring search.
