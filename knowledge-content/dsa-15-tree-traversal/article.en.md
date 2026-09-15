# Tree Traversal – BFS & DFS

## 1. Why trees need traversal algorithms

**Traversal** means visiting **every node exactly once** — to print it, sum it, search it, copy it or delete it.

For an array or a linked list this is trivial: there is one natural order, first to last. A tree is **non-linear**: after visiting a node you may have two (or more) children to go to, and you must decide which branch to explore first and what to remember about the branch you did not take.

Every traversal strategy belongs to one of two families:

| Family | Idea | Helper structure |
|---|---|---|
| **Breadth-first search (BFS)** | Visit the tree **level by level**, left to right | **Queue** (FIFO) |
| **Depth-first search (DFS)** | Go **as deep as possible** down one branch before backing up | **Stack** (LIFO) — usually the call stack via recursion |

DFS itself has three standard orders: **pre-order**, **in-order** and **post-order**.

Whatever the order, each node is visited once and does O(1) work, so **every traversal is O(n) time**. What differs is the **order of the output** and the **extra memory** needed.

---

## 2. The example tree

All examples in this topic use the same binary tree. It happens to be a binary search tree (it could be built by inserting 10, 6, 15, 3, 8, 20), but the traversal code works on **any** binary tree — none of it compares values.

```text
          10
        /    \
       6      15
      / \       \
     3   8       20
```

A node only needs a value and two child references:

```js
class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

const root = new Node(10);
root.left = new Node(6);
root.right = new Node(15);
root.left.left = new Node(3);
root.left.right = new Node(8);
root.right.right = new Node(20);
```

The four traversals of this tree, which the next sections derive:

| Traversal | Output |
|---|---|
| BFS | `[10, 6, 15, 3, 8, 20]` |
| DFS pre-order | `[10, 6, 3, 8, 15, 20]` |
| DFS in-order | `[3, 6, 8, 10, 15, 20]` |
| DFS post-order | `[3, 8, 6, 20, 15, 10]` |

---

## 3. Breadth-first search: the idea

BFS visits all nodes at depth 0, then all at depth 1, then depth 2, and so on. The trick is a **queue**: when you visit a node, you add its children to the **back** of the queue, and you always take the next node from the **front**. Children of earlier nodes are therefore always processed before children of later ones.

Algorithm:

1. Create a queue and a `result` array; put the root in the queue.
2. While the queue is not empty: **dequeue** a node and push its value into `result`.
3. If it has a left child, enqueue it; if it has a right child, enqueue it.
4. Return `result`.

Trace on the example tree:

```text
step  dequeue  result                  queue (front ... back)
0     -        []                      [10]
1     10       [10]                    [6, 15]
2     6        [10, 6]                 [15, 3, 8]
3     15       [10, 6, 15]             [3, 8, 20]
4     3        [10, 6, 15, 3]          [8, 20]
5     8        [10, 6, 15, 3, 8]       [20]
6     20       [10, 6, 15, 3, 8, 20]   []
```

---

## 4. BFS in JavaScript

The direct translation uses an array with `push` / `shift`:

```js
function bfs(root) {
  if (root === null) return [];

  const queue = [root];
  const result = [];

  while (queue.length > 0) {
    const node = queue.shift(); // dequeue from the front
    result.push(node.value);

    if (node.left) queue.push(node.left);

    if (node.right) queue.push(node.right);
  }

  return result;
}
```

It is correct, but `shift` is **O(n)**: every remaining element is re-indexed. With a queue that holds up to n/2 nodes, the worst case drifts towards **O(n²)**. Two fixes:

- Keep a **head index** instead of shifting (`const node = queue[head++]`): O(n) time, but the array keeps all n references, so O(n) space.
- Use a **linked-list queue** with O(1) enqueue and dequeue (topic 13), or the level-by-level version in section 10.

Complexity of BFS: **O(n) time** (each node enqueued and dequeued once) and **O(w) auxiliary space**, where `w` is the maximum width of the tree — the largest number of nodes waiting in the queue at once.

---

## 5. Depth-first search: three orders

DFS follows one branch down to a leaf, then backs up and tries the next branch. Recursively, "handle a node" breaks into three jobs: **visit the node (N)**, **traverse the left subtree (L)**, **traverse the right subtree (R)**. The three DFS orders differ only in **when the node itself is visited**:

| Order | Sequence | Node visited… |
|---|---|---|
| Pre-order | N → L → R | before its children |
| In-order | L → N → R | between left and right |
| Post-order | L → R → N | after both children |

Left always comes before right; only the position of N moves.

A visual trick: trace a line around the outside of the tree, starting at the root and going down its left side. Each node is passed three times — on its left, underneath it, on its right. Recording nodes when you pass their **left** side gives pre-order, **underneath** gives in-order, their **right** side gives post-order.

Recursion is natural because a subtree is itself a tree. The base case is an empty subtree (`null`). The recursion depth equals the tree height `h`, so recursive DFS uses **O(h) auxiliary space** on the call stack.

---

## 6. Pre-order (Node, Left, Right)

```js
function preOrder(root) {
  const result = [];

  function traverse(node) {
    if (node === null) return;

    result.push(node.value); // N
    traverse(node.left);     // L
    traverse(node.right);    // R
  }

  traverse(root);

  return result;
}

preOrder(root); // [10, 6, 3, 8, 15, 20]
```

```text
traverse(10)   push 10
  traverse(6)    push 6
    traverse(3)    push 3   (both children null)
    traverse(8)    push 8
  traverse(15)   push 15
    traverse(20)   push 20
```

**When to use it:** the root comes first, then everything below it, so pre-order is the order in which you would **create** nodes. It is used to **copy** or **export/serialize** a tree so it can be rebuilt. Written with a marker for every null child, pre-order describes the shape exactly:

```js
function serialize(root) {
  const out = [];

  function walk(node) {
    if (node === null) {
      out.push('#');
      return;
    }

    out.push(node.value);
    walk(node.left);
    walk(node.right);
  }

  walk(root);

  return out.join(',');
}

serialize(root); // "10,6,3,#,#,8,#,#,15,#,20,#,#"
```

A reader rebuilds it the same way: read a token, create the node, then recursively build its left and right subtrees. For a BST, even plain pre-order without markers works: inserting its values in that order reproduces the same tree.

Complexity: **O(n) time, O(h) auxiliary space** (plus O(n) for the output).

---

## 7. In-order (Left, Node, Right)

```js
function inOrder(root) {
  const result = [];

  function traverse(node) {
    if (node === null) return;

    traverse(node.left);     // L
    result.push(node.value); // N
    traverse(node.right);    // R
  }

  traverse(root);

  return result;
}

inOrder(root); // [3, 6, 8, 10, 15, 20]
```

**When to use it:** on a **BST**, in-order visits values in **ascending sorted order**, because everything in the left subtree is smaller than the node and everything in the right subtree is larger. That gives direct solutions to common problems:

- **List a BST in sorted order** — O(n).
- **Validate a BST** — the in-order sequence must be strictly increasing.
- **k-th smallest element** — stop after visiting k nodes.

For validation you don't even need the array: remember only the previously visited value and fail as soon as a node is not larger than it — O(n) time, O(h) space. In-order is defined for **binary** trees only; for a node with many children there is no single "between".

---

## 8. Post-order (Left, Right, Node)

```js
function postOrder(root) {
  const result = [];

  function traverse(node) {
    if (node === null) return;

    traverse(node.left);     // L
    traverse(node.right);    // R
    result.push(node.value); // N
  }

  traverse(root);

  return result;
}

postOrder(root); // [3, 8, 6, 20, 15, 10]
```

**When to use it:** a node is handled only after **both its subtrees are finished**, so post-order fits any problem where the answer for a node depends on answers from its children:

- **Deleting / freeing** a tree: children must go before their parent.
- **Height, size, sum** of every subtree.
- **Evaluating an expression tree**: compute operands before applying the operator.

```js
function height(node) {
  if (node === null) return 0;

  return 1 + Math.max(height(node.left), height(node.right));
}

height(root); // 3 (counting nodes on the longest root-to-leaf path)
```

Some books count edges instead, giving 2; state your convention in an interview.

For the expression `(3 + 4) * 2`, the three DFS orders produce the three classic notations:

```text
        *            pre-order:  * + 3 4 2   (prefix)
       / \           in-order:   3 + 4 * 2   (infix, needs parentheses)
      +   2          post-order: 3 4 + 2 *   (postfix / Reverse Polish)
     / \
    3   4
```

---

## 9. Iterative DFS with an explicit stack

Recursion uses the call stack implicitly. On a very deep tree (a skewed tree with 100,000 nodes, for example) this throws `RangeError: Maximum call stack size exceeded`; JavaScript engines allow only on the order of ten thousand frames. The fix is to manage a stack yourself on the heap.

**Pre-order:** pop a node, visit it, push **right first, then left**, so that left is popped first.

```js
function preOrderIterative(root) {
  if (root === null) return [];

  const stack = [root];
  const result = [];

  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node.value);

    if (node.right) stack.push(node.right);

    if (node.left) stack.push(node.left);
  }

  return result;
}
```

**In-order:** slide left as far as possible, pushing nodes; pop one, visit it, then move to its right child.

```js
function inOrderIterative(root) {
  const stack = [];
  const result = [];
  let current = root;

  while (current !== null || stack.length > 0) {
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }

    current = stack.pop();
    result.push(current.value);
    current = current.right;
  }

  return result;
}
```

**Post-order** iteratively: run the pre-order loop with the push order swapped (N → R → L) and reverse the result, which gives L → R → N.

All three remain **O(n) time and O(h) auxiliary space**.

---

## 10. Level-by-level BFS

Many interview problems need to know **where one level ends**: print each level on its own line, right-side view, average per level, minimum depth. Process the tree one whole level at a time:

```js
function levelOrder(root) {
  if (root === null) return [];

  const levels = [];
  let current = [root];

  while (current.length > 0) {
    const next = [];
    const values = [];

    for (const node of current) {
      values.push(node.value);

      if (node.left) next.push(node.left);

      if (node.right) next.push(node.right);
    }

    levels.push(values);
    current = next;
  }

  return levels;
}

levelOrder(root); // [[10], [6, 15], [3, 8, 20]]
```

No `shift` is involved, so this is truly **O(n) time**, and only two levels are held at once, so it is **O(w) auxiliary space**. The number of levels is the tree's height.

Because BFS reaches nodes in order of depth, it can **stop early** at the first match — the first leaf found is the minimum depth, and the first matching node is the shallowest one. DFS cannot guarantee that without exploring everything.

---

## 11. Time and space: wide vs deep trees

Every traversal is **O(n) time**. Auxiliary space (not counting the output array) is where BFS and DFS differ:

- **BFS: O(w)** — the queue holds up to one full level.
- **DFS: O(h)** — the stack holds one root-to-leaf path.

**Wide tree** — a perfect binary tree. Its last level holds about half of all nodes, while its height is only about log₂ n.

```text
               1
         /           \
       2               3
     /   \           /   \
    4     5         6     7
   / \   / \       / \   / \
  8   9 10  11   12  13 14  15      <- 8 of 15 nodes on one level
```

**Deep tree** — a skewed tree (for example a BST built from sorted input). Every level has one node, and the height is n.

```text
  1
   \
    2
     \
      3
       \
        4            <- width 1, height n
```

| Tree shape | Height h | Max width w | BFS space | DFS space |
|---|---|---|---|---|
| Perfect / balanced | ≈ log₂ n | ≈ n / 2 | **O(n)** | **O(log n)** |
| Skewed (list-like) | n | 1 | **O(1)** | **O(n)** |

For a perfect tree of about a million nodes, BFS keeps around 500,000 nodes in its queue while recursive DFS keeps only about 20 frames. For a skewed tree it is the opposite.

---

## 12. Choosing a traversal

| You need… | Use | Why |
|---|---|---|
| BST values in sorted order, validate a BST, k-th smallest | **In-order** | L < N < R |
| Copy, clone or serialize a tree | **Pre-order** | Parent is created before children |
| Delete a tree, subtree height/size/sum, evaluate expressions | **Post-order** | Children's results are ready first |
| Level-by-level output, shallowest match, minimum depth | **BFS** | Visits in order of depth |
| Just visit everything on a wide, balanced tree | **DFS** | O(log n) memory instead of O(n) |
| Traverse a very deep or skewed tree | **BFS** or **iterative DFS** | Avoids call-stack overflow |

These same two ideas return in graphs (topic 18): BFS with a queue, DFS with a stack, plus a `visited` set because graphs can contain cycles — trees cannot.

---

## Key interview points

- Traversal = visit every node once; **all traversals are O(n) time**.
- **BFS uses a queue** and goes level by level; **DFS uses a stack** (usually recursion) and goes deep first.
- DFS orders: **pre-order N-L-R**, **in-order L-N-R**, **post-order L-R-N** — only the position of the node changes.
- **In-order on a BST gives sorted output**; use it to validate a BST or find the k-th smallest.
- **Pre-order** for copying/serializing; **post-order** for deleting and for anything computed from children (height, size, expression evaluation).
- Space: **BFS O(w)**, **DFS O(h)**. Wide balanced tree → BFS O(n), DFS O(log n). Skewed tree → BFS O(1), DFS O(n).
- `shift()` on an array is O(n); use a head index, a linked-list queue or level arrays for a true O(n) BFS.
- Deep trees can overflow the call stack; convert DFS to an explicit stack. For iterative pre-order, push **right before left**.

## Summary

- A tree is non-linear, so we pick a strategy: breadth-first (queue) or depth-first (stack).
- On the example tree: BFS `[10, 6, 15, 3, 8, 20]`, pre-order `[10, 6, 3, 8, 15, 20]`, in-order `[3, 6, 8, 10, 15, 20]`, post-order `[3, 8, 6, 20, 15, 10]`.
- Recursive DFS is three lines that differ only in where the node is recorded; the iterative forms use an explicit stack.
- Level-by-level BFS answers "per level" and "shallowest" questions and can stop early.
- Time is always O(n); memory depends on the tree's shape — width for BFS, height for DFS.
