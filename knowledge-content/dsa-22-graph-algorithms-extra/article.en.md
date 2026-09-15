# Graph Algorithms – Topological Sort, Union-Find & MST

## 1. Beyond BFS, DFS and Dijkstra

You already store graphs as **adjacency lists**, walk them with **BFS/DFS**, and find shortest paths with Dijkstra. Those tools are the building blocks for more problem families common in real systems and interviews:

| Problem | Example | Algorithm |
|---|---|---|
| Ordering with dependencies | Package build order | Topological sort |
| Cycle detection | Is this dependency graph valid? | DFS colouring, Kahn, Union-Find |
| Dynamic connectivity | Are X and Y in the same group now? | Union-Find |
| Connect everything cheaply | Cable all offices at minimum cost | MST: Kruskal / Prim |

Throughout this topic, an unweighted graph is a plain object `{ vertex: [neighbours] }`, and weighted edges are triples `[u, v, weight]` with vertices numbered `0..n-1`. `V` is the number of vertices, `E` the number of edges.

---

## 2. DAGs and topological order

A **DAG** (directed acyclic graph) is a directed graph with no cycles. DAGs model dependencies: course prerequisites, build steps, spreadsheet formulas, task schedulers.

A **topological order** lists every vertex so that for every edge `u -> v`, `u` comes **before** `v`.

```text
install --> lint ------+
   |                   v
   +------> build ---> test --> deploy

Valid orders:  install, lint, build, test, deploy
               install, build, lint, test, deploy
```

A topological order exists **if and only if** the graph is a DAG: with a cycle `A -> B -> A`, neither can come first. It is usually **not unique** (`lint` and `build` are independent). Two classic O(V + E) algorithms produce one: Kahn's and DFS post-order.

---

## 3. Kahn's algorithm (in-degree + queue)

The **in-degree** of a vertex is how many edges point into it. A vertex with in-degree 0 has no unmet dependencies, so it can go next.

Queue every in-degree-0 vertex. Repeatedly dequeue one, output it, and decrement the in-degree of its neighbours; any neighbour that drops to 0 joins the queue. If the output ends with fewer than `V` vertices, the rest are stuck on a **cycle**.

```js
function topoSortKahn(graph) {
  const inDegree = {};

  for (const v in graph) inDegree[v] = 0;

  for (const v in graph) {
    for (const next of graph[v]) inDegree[next]++;
  }

  const queue = Object.keys(graph).filter((v) => inDegree[v] === 0);
  const order = [];
  let head = 0; // index pointer instead of shift(), which is O(n)

  while (head < queue.length) {
    const v = queue[head++];
    order.push(v);

    for (const next of graph[v]) {
      inDegree[next]--;

      if (inDegree[next] === 0) queue.push(next);
    }
  }

  if (order.length !== Object.keys(graph).length) {
    throw new Error('Graph has a cycle');
  }

  return order;
}

const tasks = {
  install: ['lint', 'build'],
  lint: ['test'],
  build: ['test'],
  test: ['deploy'],
  deploy: [],
};

topoSortKahn(tasks); // ['install', 'lint', 'build', 'test', 'deploy']
```

```text
in-degree: install 0, lint 1, build 1, test 2, deploy 1
out install -> lint 0, build 0 (enqueue both)
out lint    -> test 1
out build   -> test 0 (enqueue)
out test    -> deploy 0 (enqueue)
out deploy  -> 5 of 5 output, no cycle
```

**Complexity:** every vertex is enqueued once and every edge is decremented once → **O(V + E) time**, **O(V) extra space**.

---

## 4. Topological sort with DFS

DFS gives a second approach. When a DFS call **finishes** a vertex, everything reachable from it has already finished. So if we record vertices in **post-order** and **reverse** the list, every vertex appears before its descendants.

```js
function topoSortDFS(graph) {
  const visited = new Set();
  const order = [];

  function dfs(v) {
    visited.add(v);

    for (const next of graph[v]) {
      if (!visited.has(next)) dfs(next);
    }

    order.push(v); // post-order: all dependents are already in `order`
  }

  for (const v in graph) {
    if (!visited.has(v)) dfs(v);
  }

  return order.reverse();
}

// finish order: deploy, test, lint, build, install
topoSortDFS(tasks); // ['install', 'build', 'lint', 'test', 'deploy']
```

**Complexity:** O(V + E) time, O(V) space (`visited`, `order`, recursion stack). This version **assumes a DAG**: on a cyclic graph it silently returns a meaningless order, so add the colouring from the next section if a cycle is possible.

---

## 5. Cycle detection in a directed graph

A plain `visited` set is **not enough** in a directed graph. Reaching an already-visited vertex does not imply a cycle:

```text
A --> B        dfs(A) visits B, then C.
|     ^        From C we reach B, already visited...
v     |        ...but there is no cycle: B was finished,
C ----+        not on the current path.
```

A cycle exists only if we reach a vertex **still on the current DFS path** (a *back edge*). Track three states: **WHITE** (unvisited), **GRAY** (on the current path), **BLACK** (fully explored).

```js
function hasCycleDirected(graph) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};

  for (const v in graph) color[v] = WHITE;

  function dfs(v) {
    color[v] = GRAY; // on the current path

    for (const next of graph[v]) {
      if (color[next] === GRAY) return true; // back edge -> cycle

      if (color[next] === WHITE && dfs(next)) return true;
    }

    color[v] = BLACK; // fully explored, safe to reach again

    return false;
  }

  for (const v in graph) {
    if (color[v] === WHITE && dfs(v)) return true;
  }

  return false;
}
```

**Complexity:** O(V + E) time, O(V) space. Kahn's algorithm is an equally valid detector: a cycle exists exactly when it outputs fewer than `V` vertices.

---

## 6. Cycle detection in an undirected graph

In an undirected graph each edge is stored in **both** directions, so from `v` you always see the vertex you just came from. That is not a cycle. Pass the **parent** along and ignore it:

```js
function hasCycleUndirected(graph) {
  const visited = new Set();

  function dfs(v, parent) {
    visited.add(v);

    for (const next of graph[v]) {
      if (!visited.has(next)) {
        if (dfs(next, v)) return true;
      } else if (next !== parent) {
        return true; // visited neighbour we did not come from
      }
    }

    return false;
  }

  for (const v in graph) {
    if (!visited.has(v) && dfs(v, null)) return true;
  }

  return false;
}
```

**Complexity:** O(V + E) time, O(V) space. Forgetting the parent check makes **every** graph with an edge look cyclic, and the outer loop is needed because the graph may be **disconnected**.

---

## 7. Union-Find: the idea

**Union-Find** (Disjoint Set Union, DSU) maintains a collection of **non-overlapping sets** and supports two operations:

- `find(x)` – return the **representative** (root) of the set containing `x`.
- `union(a, b)` – merge the sets containing `a` and `b`.

Two elements are connected iff `find(a) === find(b)`. Each set is stored as a tree through a `parent` array: initially `parent[i] = i` (every element is its own root), `find` walks parent links up to the root, and the naive `union` sets `parent[find(a)] = find(b)`.

The problem: unlucky unions build a **chain**, and `find` degrades to O(n).

```text
union(0,1), union(1,2), union(2,3), union(3,4) builds:

0 -> 1 -> 2 -> 3 -> 4 (root)     find(0) walks the whole chain: O(n)
```

---

## 8. Path compression and union by rank

Two small tweaks make Union-Find almost constant time.

**Path compression:** during `find`, point every visited node **directly at the root**, flattening the tree for next time.

**Union by rank** (or by size): attach the **shorter** tree under the taller one, so height grows only when two equal-rank trees merge. Height stays ≤ log n.

```text
before find(0)                    after find(0)
0 -> 1 -> 2 -> 3 -> 4 (root)      0, 1, 2, 3 all -> 4 (root)
```

```js
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n; // number of disjoint sets
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }

    return this.parent[x];
  }

  union(a, b) {
    let rootA = this.find(a);
    let rootB = this.find(b);

    if (rootA === rootB) return false; // already in the same set

    if (this.rank[rootA] < this.rank[rootB]) {
      [rootA, rootB] = [rootB, rootA];
    }

    this.parent[rootB] = rootA; // shorter tree goes under the taller one

    if (this.rank[rootA] === this.rank[rootB]) this.rank[rootA]++;

    this.count--;

    return true;
  }
}
```

| Version | `find` / `union` |
|---|---|
| Naive | O(n) worst case |
| Union by rank only | O(log n) worst case |
| Path compression only | O(log n) amortized |
| **Both** | **O(α(n)) amortized** |

`α(n)` is the inverse Ackermann function: it is ≤ 4 for any `n` that fits in the universe, so treat it as **effectively constant**. Space is O(n).

---

## 9. Union-Find in practice

**Counting connected components** from an edge list:

```js
function countComponents(n, edges) {
  const uf = new UnionFind(n);

  for (const [a, b] of edges) uf.union(a, b);

  return uf.count;
}

countComponents(5, [[0, 1], [1, 2], [3, 4]]); // 2 -> {0,1,2} and {3,4}
```

**Undirected cycle detection:** process edges one by one; if `union(a, b)` returns `false`, `a` and `b` were already connected, so this edge closes a cycle (the "redundant connection" problem).

Prefer Union-Find over BFS/DFS when edges **arrive over time** and you must answer "connected?" after each one, for grouping from an **edge list**, and inside **Kruskal**. Limitation: it can **merge** sets but never **split** them, and it does not model directed reachability.

---

## 10. Minimum spanning tree

Take a **connected, undirected, weighted** graph. A **spanning tree** is a subset of edges that connects all `V` vertices with **no cycle** — it always has exactly **V − 1 edges**. A **minimum spanning tree (MST)** is a spanning tree with the smallest total weight.

```text
        A
     4 / \ 1        MST = A-C (1) + B-C (2) + B-D (5) = 8
      /   \         3 edges for 4 vertices
     B --2-- C      A-B (4) and C-D (8) are left out
      \     /
     5 \   / 8
        \ /
         D
```

Useful properties:

- **Cut property:** for any split of the vertices into two groups, the lightest edge crossing the split belongs to some MST. Both Kruskal and Prim are greedy algorithms justified by this.
- If all weights are distinct the MST is **unique**; otherwise there may be several, all with the same total weight.
- An MST is **not** a shortest-path tree. With edges `A-B 3`, `B-C 3`, `A-C 5`, the MST is `A-B + B-C` (6), yet the shortest path from A to C is the direct edge (5).

Uses: network design, clustering (drop the heaviest MST edges).

---

## 11. Kruskal's algorithm

Kruskal builds the MST **edge by edge**, globally cheapest first: sort edges by weight, put every vertex in its own Union-Find set, then take each edge whose endpoints are in **different sets** (and union them) and skip the rest, since they would close a cycle. Stop after `V − 1` edges.

```js
function kruskal(n, edges) {
  const sorted = [...edges].sort((x, y) => x[2] - y[2]);
  const uf = new UnionFind(n);
  const mst = [];
  let total = 0;

  for (const [u, v, w] of sorted) {
    if (uf.union(u, v)) {
      mst.push([u, v, w]);
      total += w;

      if (mst.length === n - 1) break;
    }
  }

  if (mst.length !== n - 1) return null; // graph is disconnected

  return { mst, total };
}

// A=0, B=1, C=2, D=3
kruskal(4, [[0, 1, 4], [0, 2, 1], [1, 2, 2], [1, 3, 5], [2, 3, 8]]);
// { mst: [[0,2,1], [1,2,2], [1,3,5]], total: 8 }
```

```text
sorted: A-C 1, B-C 2, A-B 4, B-D 5, C-D 8
A-C 1  different sets -> take   {A,C} {B} {D}
B-C 2  different sets -> take   {A,B,C} {D}
A-B 4  same set       -> skip   (would close a cycle)
B-D 5  different sets -> take   {A,B,C,D}  3 edges = V-1, stop
```

**Complexity:** sorting dominates → **O(E log E)**, which equals O(E log V) since E ≤ V². Union-Find adds only O(E · α(V)). Space O(V + E).

---

## 12. Prim's algorithm

Prim grows **one tree** from a start vertex. At each step it adds the cheapest edge that connects a vertex **inside** the tree to a vertex **outside** it. It looks like Dijkstra, with one crucial difference in the update:

- Dijkstra: `dist[v] = dist[u] + w` (total distance from the source)
- Prim: `best[v] = w` (just the weight of the single connecting edge)

This version scans an array instead of using a heap, which gives O(V²) — ideal for **dense** graphs.

```js
// graph[u] = [[v, w], ...], vertices 0..n-1
function prim(n, graph) {
  const inTree = new Array(n).fill(false);
  const best = new Array(n).fill(Infinity); // cheapest edge linking v to the tree
  const parent = new Array(n).fill(-1);
  best[0] = 0;
  let total = 0;

  for (let step = 0; step < n; step++) {
    let u = -1;

    for (let v = 0; v < n; v++) {
      if (!inTree[v] && (u === -1 || best[v] < best[u])) u = v;
    }

    if (best[u] === Infinity) return null; // graph is disconnected

    inTree[u] = true;
    total += best[u];

    for (const [v, w] of graph[u]) {
      if (!inTree[v] && w < best[v]) {
        best[v] = w;
        parent[v] = u;
      }
    }
  }

  return { total, parent };
}
```

On the section 10 graph from A: take C (1), B improves 4 → 2; take B (2), D improves 8 → 5; take D (5). Total 8, same as Kruskal. With a binary heap instead of the array scan, Prim runs in **O(E log V)**, better for sparse graphs.

---

## 13. Choosing the right algorithm

| Situation | Use | Time |
|---|---|---|
| Order tasks with dependencies | Kahn or DFS topological sort | O(V + E) |
| Cycle in a directed graph | Three-colour DFS or Kahn | O(V + E) |
| Cycle in an undirected graph | DFS with parent, or Union-Find | O(V + E) / O(E · α(V)) |
| Connectivity as edges are added | Union-Find | O(α(n)) per operation |
| MST on a sparse edge list | Kruskal | O(E log E) |
| MST on a dense graph | Prim (array) | O(V²) |
| Shortest path, non-negative weights | Dijkstra with a binary heap | O((V + E) log V) |

Kruskal and Prim work on **undirected** graphs only.

---

## Key interview points

- Topological order exists **only for DAGs** and is often not unique; **Kahn** (output shorter than `V` ⇒ cycle) and **DFS** (post-order, then reverse) are both **O(V + E)**.
- Directed cycle ⇒ edge to a **GRAY** vertex (on the current path). Undirected cycle ⇒ visited neighbour that is **not the parent**.
- **Union-Find** with **path compression + union by rank** runs in **O(α(n))** amortized — effectively constant. It merges but cannot split.
- An MST has **V − 1 edges**; it is not a shortest-path tree.
- **Kruskal** = sort edges + Union-Find, O(E log E). **Prim** = grow one tree, O(V²) array or O(E log V) heap; its update uses the edge weight, not the path distance.

## Summary

- Topological sort orders a DAG so every edge points forward (Kahn or reversed DFS post-order).
- Directed cycles need three-state DFS; undirected cycles need a parent check or Union-Find.
- Union-Find tracks disjoint sets; its two optimisations make `find`/`union` nearly O(1).
- Kruskal picks globally cheapest safe edges; Prim grows one tree. Both build an MST of V − 1 edges.
