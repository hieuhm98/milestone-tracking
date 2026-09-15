# Binary Search Trees – Trees, BSTs and Balance

## 1. What is a tree?

A **tree** is a data structure made of **nodes** in a **parent / child** relationship. One node sits at the top (the **root**), every other node has **exactly one parent**, and following child links never leads you back to where you started.

```text
              2                <- root
          /   |   \
         9    12    8
        / \         |
       1   7        44         <- nodes with no children are leaves
```

Three rules make something a tree:

- There is **exactly one root** (a node with no parent).
- Every other node has **exactly one parent**.
- There are **no cycles**: a tree with `n` nodes has exactly `n − 1` edges.

Break any rule and it is no longer a tree:

```text
NOT A TREE: a cycle             NOT A TREE: two parents, two roots
        2                            2         8
       / \                            \       /
      9---12                           12    /
                                         \  /
                                          44
```

In the first picture the extra edge 9–12 creates a cycle (2 → 9 → 12 → 2). In the second, 44 has two parents and there are two roots (2 and 8).

---

## 2. Tree terminology

```text
depth 0            10            <- root
                 /    \
depth 1         6      15        <- 6 and 15 are siblings
               / \       \
depth 2       3   8       20     <- 3, 8, 20 are leaves
```

| Term | Meaning | In the picture |
|---|---|---|
| **Root** | The top node, the only node with no parent | 10 |
| **Child** | A node directly connected to another when moving away from the root | 6 and 15 are children of 10 |
| **Parent** | The converse of child | 15 is the parent of 20 |
| **Siblings** | Nodes with the same parent | 3 and 8 |
| **Leaf** | A node with no children | 3, 8, 20 |
| **Edge** | The connection between two nodes | 10–6 is one edge |
| **Subtree** | A node together with all of its descendants | 6, 3, 8 form the left subtree of 10 |
| **Depth** of a node | Number of edges from the root down to it | depth(8) = 2 |
| **Height** of a node | Number of edges on the longest path down to a leaf | height(15) = 1 |
| **Height of the tree** | Height of the root | 2 |

Some people count height in nodes (this tree would be 3); just say which convention you use. Counting edges, a single node has height 0 and an empty tree −1.

---

## 3. Trees vs lists, and where trees appear

Arrays, linked lists, stacks and queues are **linear**: every element has at most one "next". Trees are **non-linear**: a node can branch to many children.

A singly linked list (`2 -> 12 -> 11`) is really a degenerate tree where every node has at most one child. Keep that in mind — it is exactly what a badly shaped BST turns into (section 9).

Trees model anything **hierarchical**:

- The **HTML DOM**: `<html>` → `<body>` → `<div>` → …
- **File systems** and **JSON** documents: folders inside folders, objects inside objects.
- **Abstract syntax trees** (AST) built by compilers, Babel and ESLint.
- **Network routing** and **decision / game trees** in AI.
- **Database indexes** (B-trees) and **priority queues** (heaps, topic 16).

---

## 4. Binary trees

A **binary tree** is a tree in which **every node has at most two children**, called `left` and `right`.

```text
BINARY TREE              NOT A BINARY TREE
       1                        1
     /   \                  /   |   \
    5     12               5    9    12
   / \      \             / \          \
  6   3      11          6   3          11
```

Some shapes have names (they come back in heaps and balanced trees):

| Shape | Rule |
|---|---|
| **Full** | Every node has 0 or 2 children |
| **Complete** | Every level is full except possibly the last, which is filled left to right |
| **Perfect** | Every internal node has 2 children and all leaves are on the same level |

Useful counting facts for a binary tree:

- Level `d` holds at most `2^d` nodes (1, 2, 4, 8, …).
- A tree of height `h` holds at most `2^(h+1) − 1` nodes. A perfect tree with 4 levels (h = 3) has 1 + 2 + 4 + 8 = 15.
- So `n` nodes need a height of **at least ⌊log₂ n⌋** — and can have a height of **at most n − 1** (a chain).

Those two bounds, log n and n, are the whole story of BST performance.

---

## 5. Binary search trees and the BST property

A **binary search tree** (BST) is a binary tree that keeps its values **in order**:

- Every node has at most two children.
- **Every** value in a node's **left subtree** is **less** than the node's value.
- **Every** value in a node's **right subtree** is **greater** than the node's value.

```text
          10
        /    \
       6      15
      / \       \
     3   8       20
```

The rule applies to the **whole subtree**, not just the direct children. This is the most common mistake:

```text
INVALID: 12 is in the LEFT subtree of 10, but 12 > 10
          10
        /    \
       6      15
      / \
     3   12          <- 6 < 12 is fine locally, but it breaks the rule for 10
```

Because of the property, every comparison throws away one whole subtree — the same "halve the search space" idea as binary search on a sorted array, but in a structure that also supports cheap inserts. Visiting a BST left-subtree → node → right-subtree yields the values in sorted order (that traversal, in-order DFS, is covered in the next topic).

**Duplicates** need a policy. Common choices: ignore them (what we do here), store a `count` on the node, or consistently send equal values to one side (e.g. `<=` goes left).

---

## 6. The Node and BinarySearchTree classes

A BST is just nodes pointing to nodes, plus a reference to the root:

```js
class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
  }
}
```

You could wire nodes by hand (`tree.root.left = new Node(6)`), but nothing would stop you putting 20 on the left. `insert` enforces the BST property for you.

---

## 7. Inserting a value

Steps (iterative or recursive):

1. Create a new node.
2. If there is no root, the new node becomes the root.
3. Otherwise start at the root and compare: **greater → go right, less → go left**.
4. If that side is empty, attach the new node there. If not, move to that child and repeat.

```js
// inside class BinarySearchTree
insert(value) {
  const newNode = new Node(value);

  if (this.root === null) {
    this.root = newNode;

    return this;
  }

  let current = this.root;

  while (true) {
    if (value === current.value) return undefined; // ignore duplicates

    if (value < current.value) {
      if (current.left === null) {
        current.left = newNode;

        return this;
      }

      current = current.left;
    } else {
      if (current.right === null) {
        current.right = newNode;

        return this;
      }

      current = current.right;
    }
  }
}
```

Trace — insert 13 into the tree from section 5:

```text
13 vs 10 -> greater, go right
13 vs 15 -> less, go left: left is null -> attach

          10
        /    \
       6      15
      / \    /  \
     3   8  13   20
```

The recursive version returns the (possibly new) subtree root and **assigns** it back to the parent's pointer:

```js
function insertNode(node, value) {
  if (node === null) return new Node(value);

  if (value < node.value) {
    node.left = insertNode(node.left, value);
  } else if (value > node.value) {
    node.right = insertNode(node.right, value);
  }

  return node;
}

// tree.root = insertNode(tree.root, 13);
```

Forgetting the assignment (`insertNode(node.left, value);` on its own) is a classic bug: the new node is created and immediately lost.

**Complexity:** time **O(h)**, where h is the tree height — one comparison per level. Space **O(1)** iterative, **O(h)** recursive (call stack).

---

## 8. Finding a value, min and max

Search follows exactly the same path as insert, but stops when it finds the value or falls off the tree:

```js
// inside class BinarySearchTree
find(value) {
  let current = this.root;

  while (current !== null) {
    if (value === current.value) return current;

    current = value < current.value ? current.left : current.right;
  }

  return null;
}

contains(value) {
  return this.find(value) !== null;
}
```

```text
find(9) in           10         9 < 10 -> left
                   /    \       9 > 6  -> right
                  6      15     9 > 8  -> right: null -> not found
                 / \       \    3 comparisons
                3   8       20
```

The **minimum** is the leftmost node and the **maximum** is the rightmost node — no comparisons needed:

```js
// inside class BinarySearchTree
min() {
  if (this.root === null) return null;

  let current = this.root;

  while (current.left !== null) {
    current = current.left;
  }

  return current.value;
}
```

`max()` is the mirror image, following `right`. All three are **O(h) time, O(1) space**.

---

## 9. Big O: best case vs worst case

Every operation walks one root-to-leaf path, so everything is **O(h)**. The question is how tall the tree is.

In a well-balanced tree, **doubling the number of nodes adds only one level**: 15 nodes fit in 4 levels, 1,023 in 10, about a million in 20. So insert and find are **O(log n) — but that is not guaranteed.** Insert values in sorted order and every new node goes right:

```text
insert 1, 2, 3, 4, 5

1
 \
  2
   \
    3            a valid BST, but really a linked list
     \           height = n - 1
      4
       \
        5
```

| Operation | Balanced (best/average) | Degenerate (worst) |
|---|---|---|
| insert | O(log n) | O(n) |
| find / contains | O(log n) | O(n) |
| remove | O(log n) | O(n) |
| min / max | O(log n) | O(n) |
| space for the tree | O(n) | O(n) |

With **random** insertion order the average node depth is about 1.39 log₂ n, so plain BSTs behave well on random data. Real data is often sorted or nearly sorted (IDs, timestamps), which is exactly the worst case. The fix is a tree that keeps itself balanced.

---

## 10. Balanced trees: AVL and red-black (overview)

A **self-balancing BST** does a little extra work on insert and remove to keep the height at **O(log n)**, turning the average case into a **guarantee**. The tool is a **rotation**: an O(1) pointer rearrangement that changes the shape but keeps the BST order.

```text
insert 10, 20, 30 -> right-heavy, rotate left around 10

  10                        20
    \      rotate left     /  \
     20    ----------->  10    30
       \
        30
```

| Tree | Balance rule | Height bound | Typical use |
|---|---|---|---|
| **AVL** | For every node, left and right subtree heights differ by at most 1 | ≈ 1.44 log₂ n (stricter) | Read-heavy lookups |
| **Red-black** | Nodes are red or black; no red node has a red child; every root-to-null path has the same number of black nodes | ≤ 2 log₂(n + 1) (looser, fewer rotations) | Java `TreeMap`, C++ `std::map`, Linux scheduler |
| **B-tree / B+ tree** | Many keys per node, all leaves at the same depth | Very shallow | Database and file-system indexes |

You are rarely asked to code AVL or red-black rotations in an interview, but you are expected to know they exist and what they guarantee. JavaScript has no built-in sorted map, so you either use a library or an alternative.

A related trick: from a **sorted array** you can build a perfectly balanced BST in O(n) by making the middle element the root and recursing on each half.

**When is a balanced BST the right choice?**

| Need | Sorted array | Hash table | Balanced BST |
|---|---|---|---|
| Lookup by key | O(log n) | O(1) average | O(log n) |
| Insert / delete | O(n) | O(1) average | O(log n) |
| Min / max | O(1) | O(n) | O(log n) |
| Iterate in sorted order | O(n) | O(n log n) (sort first) | O(n) |
| Range query / next larger key | O(log n + k) | O(n) | O(log n + k) |

Choose a BST when you need **order** (sorted iteration, floor/ceiling, ranges) **and** frequent inserts and deletes. If you only need "is it there?", a hash table wins.

---

## 11. Removing a node: the three cases

Removal is the trickiest operation because the tree must stay a valid BST. First find the node, then:

**Case 1 — leaf (0 children):** just cut it off (point its parent at `null`).

**Case 2 — one child:** replace the node with its only child.

```text
remove 15 (one child)
          10                     10
        /    \                 /    \
       6      15     ->       6      20
      / \       \            / \
     3   8       20         3   8
```

**Case 3 — two children:** you cannot splice it out. Replace its value with its **in-order successor** — the **smallest value in its right subtree** (go right once, then left all the way) — and then remove that successor, which has at most one child. The in-order predecessor (largest in the left subtree) works equally well.

```text
remove 10 (two children): successor = 13
          10                     13
        /    \                 /    \
       6      15     ->       6      15
      / \    /  \            / \       \
     3   8  13   20         3   8       20
```

```js
function removeNode(node, value) {
  if (node === null) return null;

  if (value < node.value) {
    node.left = removeNode(node.left, value);
  } else if (value > node.value) {
    node.right = removeNode(node.right, value);
  } else {
    // Cases 1 and 2: zero or one child -> return the other side
    if (node.left === null) return node.right;

    if (node.right === null) return node.left;

    // Case 3: two children -> copy the successor, then delete it
    let successor = node.right;

    while (successor.left !== null) {
      successor = successor.left;
    }

    node.value = successor.value;
    node.right = removeNode(node.right, successor.value);
  }

  return node;
}

// inside class BinarySearchTree
remove(value) {
  this.root = removeNode(this.root, value);

  return this;
}
```

Note how case 1 is handled for free: a leaf has `left === null`, so it returns `node.right`, which is `null`. Removing the root works too, because the caller reassigns `this.root`.

**Complexity:** O(h) time — find the node, then walk down to the successor, still one path. O(h) recursion stack.

---

## 12. Validating a BST

"Is this binary tree a valid BST?" is a favourite interview question, and the naive answer is wrong:

```js
// BUG: only compares a node with its direct children
function isValidNaive(node) {
  if (node === null) return true;

  if (node.left && node.left.value >= node.value) return false;

  if (node.right && node.right.value <= node.value) return false;

  return isValidNaive(node.left) && isValidNaive(node.right);
}
```

It accepts the invalid tree from section 5 (12 below 6 on the left of 10), because every parent/child pair looks fine locally. The correct version passes down the **allowed range** for each subtree:

```js
function isValidBST(node, min = -Infinity, max = Infinity) {
  if (node === null) return true;

  if (node.value <= min || node.value >= max) return false;

  return (
    isValidBST(node.left, min, node.value) &&
    isValidBST(node.right, node.value, max)
  );
}
```

```text
range check for the invalid tree
10 must be in (-inf, +inf)  ok
 6 must be in (-inf, 10)    ok
12 must be in (6, 10)       FAIL -> not a BST
```

**Complexity:** O(n) time (each node checked once), O(h) space for the recursion.

---

## Key interview points

- A tree is **connected, acyclic**, one root, every other node has **one parent**; `n` nodes → `n − 1` edges.
- **Binary tree** = at most two children. **BST** = binary tree where the **entire** left subtree is smaller and the **entire** right subtree is larger.
- Insert, find, remove, min and max all cost **O(h)**: **O(log n)** when balanced, **O(n)** when degenerate (e.g. sorted input builds a linked list).
- Recursive versions use **O(h)** call-stack space; iterative insert/find use **O(1)**.
- Removal: **leaf → cut**, **one child → splice**, **two children → replace with in-order successor** (min of right subtree), then delete the successor.
- Validate with **min/max bounds**, not just parent/child comparisons.
- **AVL** and **red-black** trees use O(1) rotations to guarantee O(log n); red-black backs `TreeMap` / `std::map`.
- Pick a balanced BST over a hash table when you need **ordering**: sorted iteration, min/max, floor/ceiling, range queries.

## Summary

- Trees are non-linear, hierarchical structures: root, parent, child, sibling, leaf, edge, depth, height.
- A binary tree of height h holds at most 2^(h+1) − 1 nodes, so height ranges from ⌊log₂ n⌋ to n − 1.
- The BST ordering lets each comparison discard a whole subtree.
- `insert` and `find` walk one path from the root; `min`/`max` follow left/right pointers to the end.
- Performance depends on shape: balanced O(log n), degenerate O(n); self-balancing trees make O(log n) a guarantee.
- Removing a node with two children uses the in-order successor; validation passes down an allowed range.
