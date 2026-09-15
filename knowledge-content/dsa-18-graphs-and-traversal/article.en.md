# Graphs & Graph Traversal (BFS, DFS)

## 1. What is a graph?

A **graph** is simply **nodes + connections**: a finite (and possibly changing) set of **vertices** together with a set of **edges** — unordered pairs of vertices in an undirected graph, ordered pairs in a directed one.

Unlike a tree, a graph has **no root**, no parent/child rule, and may contain **cycles**. A tree is just a special graph: connected, undirected, no cycles (exactly `V - 1` edges).

```text
      A
    /   \       6 vertices: A B C D E F
   B     E      6 edges:    A-B, B-C, C-D, D-E, E-F, F-A
   |     |      one cycle:  A-B-C-D-E-F-A
   C     F
    \   /
      D
```

That freedom lets graphs model almost any "things and relationships" problem. The price: algorithms must cope with cycles, which is why every traversal here keeps a **visited** set.

---

## 2. Where graphs are used

- **Social networks** — people are vertices, friendships or follows are edges.
- **Maps and navigation** — intersections are vertices, roads are weighted edges.
- **Routing** — routers and links; packets need a path.
- **Recommendations** — "people you may know", "you might also like": explore vertices near the ones a user already likes.
- **Web crawlers** — pages are vertices, links are directed edges.
- **Dependencies, games, mazes, file systems** — build steps, board states, cells, folders.

```text
Halo --- Sci-Fi --- Borderlands
   \                /
    +---- Guns ----+
```

A fan of *Halo* is two hops from *Borderlands* through shared tags. "Find vertices close to this one" is a graph traversal.

---

## 3. Essential terminology

| Term | Meaning |
|---|---|
| **Vertex** (node) | One item in the graph |
| **Edge** | A connection between two vertices |
| **Neighbour** | A vertex joined to another by an edge |
| **Degree** | Edges touching a vertex (directed: in-degree / out-degree) |
| **Path / cycle** | A chain of edges; a cycle returns to its start |
| **Sparse / dense** | E close to V vs E close to V² |

**Undirected vs directed.** An undirected edge works both ways, like a Facebook friendship. A **directed** edge has an arrow: you can follow someone on Instagram without them following you back.

**Unweighted vs weighted.** A weighted edge carries a value — kilometres, minutes, cost.

```text
Undirected      Directed        Weighted
A --- B         A ---> B        A --8-- B
|     |         ^      |        |       |
C --- D         C <--- D        20      15
                                |       |
                                C --7-- D
```

An undirected graph has at most `V(V-1)/2` edges, a directed one at most `V(V-1)`.

---

## 4. Representation 1: adjacency matrix

An **adjacency matrix** is a `V × V` grid: cell `[i][j]` is `1` if there is an edge from `i` to `j`, else `0` (store the weight for weighted graphs).

```text
The 6-cycle from section 1
     A  B  C  D  E  F
A  [ 0  1  0  0  0  1 ]
B  [ 1  0  1  0  0  0 ]
C  [ 0  1  0  1  0  0 ]
D  [ 0  0  1  0  1  0 ]
E  [ 0  0  0  1  0  1 ]
F  [ 1  0  0  0  1  0 ]
```

An undirected graph gives a **symmetric** matrix; a directed one need not. In JS: `matrix[i][j] === 1` checks an edge.

Strength: "is there an edge u–v?" is one lookup, O(1). Weakness: always **O(V²)** memory, even with almost no edges, and listing a vertex's neighbours scans a whole row, O(V).

---

## 5. Representation 2: adjacency list

An **adjacency list** stores, for each vertex, only the vertices it connects to — an array of arrays for numbered vertices, or an object/`Map` for named ones.

```text
[                  {
  [1, 5],  // 0      A: ["B", "F"],
  [0, 2],  // 1      B: ["A", "C"],
  [1, 3],  // 2      C: ["B", "D"],
  [2, 4],  // 3      D: ["C", "E"],
  [3, 5],  // 4      E: ["D", "F"],
  [4, 0]   // 5      F: ["E", "A"]
]                  }
```

Memory matches what exists: one entry per vertex plus two per undirected edge, **O(V + E)**. Iterating a vertex's neighbours costs O(degree) — exactly what traversals need. The downside: "is B connected to F?" means searching B's array, O(deg(B)); a `Set` per vertex makes that O(1) on average.

---

## 6. Matrix vs list: Big O and trade-offs

| Operation | Adjacency list | Adjacency matrix |
|---|---|---|
| Add vertex | O(1) | O(V²) (rebuild the grid) |
| Add edge | O(1) | O(1) |
| Remove edge (u, v) | O(deg(u) + deg(v)), ≤ O(E) | O(1) |
| Remove vertex | O(V + E) | O(V²) |
| Is (u, v) an edge? | O(deg(u)), ≤ O(V) | O(1) |
| Neighbours of v | O(deg(v)) | O(V) |
| Storage | O(V + E) | O(V²) |
| Full BFS / DFS | O(V + E) | O(V²) |

In short: lists use less space on sparse graphs and iterate edges faster; matrices look up a specific edge instantly.

**Which to choose?** Real-world graphs are usually **large and sparse** — a billion users do not have a billion² friendships. So the adjacency list is the default and is what we build. Use a matrix for small or dense graphs, or when the algorithm constantly asks "does edge (u, v) exist?".

---

## 7. Building a Graph class

An **undirected, unweighted** graph on an adjacency list:

```js
class Graph {
  constructor() {
    this.adjacencyList = {};
  }

  // O(1)
  addVertex(vertex) {
    if (!this.adjacencyList[vertex]) this.adjacencyList[vertex] = [];
  }

  // O(1): both directions, because the graph is undirected
  addEdge(v1, v2) {
    this.adjacencyList[v1].push(v2);
    this.adjacencyList[v2].push(v1);
  }
}

const g = new Graph();
g.addVertex("Tokyo");
g.addVertex("Dallas");
g.addVertex("Aspen");
g.addEdge("Tokyo", "Dallas");
g.addEdge("Dallas", "Aspen");
```

```text
{ Tokyo: [], Dallas: [], Aspen: [] }                       after addVertex x3
{ Tokyo: ["Dallas"], Dallas: ["Tokyo"], Aspen: [] }        after addEdge(Tokyo, Dallas)
{ Tokyo: ["Dallas"], Dallas: ["Tokyo", "Aspen"],
  Aspen: ["Dallas"] }                                      after addEdge(Dallas, Aspen)
```

The guard in `addVertex` stops a repeated call from wiping existing edges. Variations:

- **Directed:** push only `v2` into `v1`'s list.
- **Weighted:** push objects, `{ node: v2, weight }` — the shape Dijkstra's algorithm uses next topic.
- **No duplicate edges:** a `Set` per vertex instead of an array.

---

## 8. Removing edges and vertices

```js
// O(deg(v1) + deg(v2))
removeEdge(v1, v2) {
  this.adjacencyList[v1] = this.adjacencyList[v1].filter((v) => v !== v2);
  this.adjacencyList[v2] = this.adjacencyList[v2].filter((v) => v !== v1);
}

// O(V + E) at worst
removeVertex(vertex) {
  while (this.adjacencyList[vertex].length) {
    const adjacent = this.adjacencyList[vertex].pop();
    this.removeEdge(vertex, adjacent);
  }

  delete this.adjacencyList[vertex];
}
```

`removeVertex` must not just `delete` the key: every neighbour would keep a **dangling reference**, and a later traversal would crash reading `this.adjacencyList["Hong Kong"]` as `undefined`. So it removes every incident edge first, then deletes the key.

```text
before removeVertex("Hong Kong")
  Tokyo:  [Dallas, Hong Kong]           Hong Kong: [Tokyo, Dallas, LA]
  Dallas: [Tokyo, Aspen, Hong Kong, LA] LA:        [Hong Kong, Dallas]
  Aspen:  [Dallas]
after
  Tokyo:  [Dallas]                      LA:        [Dallas]
  Dallas: [Tokyo, Aspen, LA]            Aspen:     [Dallas]
```

---

## 9. Graph traversal and the visited set

**Traversal** means visiting, updating or checking every vertex reachable from a start. It powers web crawlers, peer-to-peer networks, "closest match" recommendations, maze solving and GPS.

You traversed trees with BFS and DFS before. Graphs add two twists:

1. **No root.** You pick a start, and only reach vertices connected to it.
2. **Cycles.** A → B → A → B … never ends. A **visited** set (object or `Set`) marks each vertex the first time it is seen, so it is processed once.

Every example below uses this graph:

```js
const g = new Graph();
["A", "B", "C", "D", "E", "F"].forEach((v) => g.addVertex(v));
g.addEdge("A", "B");
g.addEdge("A", "C");
g.addEdge("B", "D");
g.addEdge("C", "E");
g.addEdge("D", "E");
g.addEdge("D", "F");
g.addEdge("E", "F");
```

```text
      A          A: [B, C]
    /   \        B: [A, D]
   B     C       C: [A, E]
   |     |       D: [B, E, F]
   D --- E       E: [C, D, F]
    \   /        F: [D, E]
      F
```

The neighbour order in each array decides the exact output, so several different orders can all be valid.

---

## 10. Depth-first search (recursive)

**Depth-first search** (DFS) goes as far as possible down one branch before **backtracking**. Recursion backtracks for free: the call stack remembers where to resume.

```js
depthFirstRecursive(start) {
  const result = [];
  const visited = {};
  const adjacencyList = this.adjacencyList; // `this` is not the graph inside dfs

  (function dfs(vertex) {
    if (!vertex) return;

    visited[vertex] = true;
    result.push(vertex);

    for (const neighbor of adjacencyList[vertex]) {
      if (!visited[neighbor]) dfs(neighbor);
    }
  })(start);

  return result;
}
```

```text
dfs(A) -> B (first unvisited)
  dfs(B) -> D
    dfs(D) -> E
      dfs(E) -> C
        dfs(C): A, E visited -> backtrack
      E -> F
        dfs(F): D, E visited -> backtrack to the top
result: A, B, D, E, C, F
```

**Complexity:** each vertex is visited once and each adjacency array scanned once: **O(V + E)** time. Space **O(V)** for `visited`/`result` plus up to **O(V)** call-stack frames — a long path-shaped graph can overflow the stack.

---

## 11. Depth-first search (iterative, with a stack)

An explicit **stack** (`push`/`pop`) replaces the call stack, so there is no recursion limit.

```js
depthFirstIterative(start) {
  const stack = [start];
  const result = [];
  const visited = { [start]: true };

  while (stack.length) {
    const vertex = stack.pop();
    result.push(vertex);

    for (const neighbor of this.adjacencyList[vertex]) {
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        stack.push(neighbor);
      }
    }
  }

  return result;
}
```

```text
pop   result        stack after pushes
A     A             [B, C]
C     A C           [B, E]
E     A C E         [B, D, F]
F     A C E F       [B, D]
D     A C E F D     [B]
B     A C E F D B   []
```

The result **A, C, E, F, D, B** differs from the recursive A, B, D, E, C, F, yet both are depth-first: the stack is LIFO, so the most recently discovered vertex (C, pushed last) goes next. Marking on push keeps each vertex in the stack at most once. To reproduce the recursive order, push neighbours in reverse and mark vertices when **popped** (skipping already-visited ones).

Time **O(V + E)**, space **O(V)**.

---

## 12. Breadth-first search (with a queue)

**Breadth-first search** (BFS) visits every neighbour at the current distance before going further — ripples on water. It uses a **queue** (FIFO).

```js
breadthFirst(start) {
  const queue = [start];
  const result = [];
  const visited = { [start]: true };
  let head = 0; // read pointer instead of O(n) queue.shift()

  while (head < queue.length) {
    const vertex = queue[head++];
    result.push(vertex);

    for (const neighbor of this.adjacencyList[vertex]) {
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        queue.push(neighbor);
      }
    }
  }

  return result;
}
```

```text
dequeue  result        queue     distance
A        A             [B, C]    A=0
B        A B           [C, D]    B=1, C=1
C        A B C         [D, E]    D=2, E=2
D        A B C D       [E, F]    F=3
E, F     A B C D E F   []
```

Mark visited **on enqueue**, or a vertex can enter the queue several times. `shift()` is O(n) on a JS array, so a read pointer keeps BFS at **O(V + E)** time, **O(V)** space.

**Shortest paths.** In an **unweighted** graph BFS reaches vertices in order of distance, so the first arrival at a vertex is along a path with the **fewest edges**. Store each vertex's parent, then walk back:

```js
shortestPath(start, end) {
  const queue = [start];
  const parent = { [start]: null };
  let head = 0;

  while (head < queue.length) {
    const vertex = queue[head++];

    if (vertex === end) break;

    for (const neighbor of this.adjacencyList[vertex]) {
      if (!(neighbor in parent)) {
        parent[neighbor] = vertex;
        queue.push(neighbor);
      }
    }
  }

  if (!(end in parent)) return null; // unreachable

  const path = [];

  for (let v = end; v !== null; v = parent[v]) path.push(v);

  return path.reverse();
}
// g.shortestPath("A", "F") -> ["A", "B", "D", "F"]
```

With **weighted** edges, fewest edges is not cheapest — that is Dijkstra's algorithm, next topic.

---

## 13. BFS vs DFS and common applications

| | BFS | DFS |
|---|---|---|
| Structure | Queue (FIFO) | Stack (LIFO) or recursion |
| Order | Nearest first, level by level | One branch to the end, then back |
| Shortest path (unweighted) | Yes | No |
| Time (adjacency list) | O(V + E) | O(V + E) |
| Space | O(V) — wide frontiers hurt | O(V) — deep paths hurt |
| Good for | Degrees of separation, fewest moves, nearest matches | Exploring every path, mazes, components, cycle checks |

**Connected components.** One traversal reaches only one component. Loop over every vertex and start a new traversal from each unvisited one; the number of starts is the number of components. Total still O(V + E).

**Grids are implicit graphs.** In "number of islands" each cell is a vertex and its 4 neighbours are its edges — no adjacency list needed. Traversal is O(R · C).

```text
1 1 0 0
1 0 0 1     3 islands (groups of 4-connected 1s)
0 1 0 1
```

Cycle detection, topological sort and union-find build on these traversals in a later topic.

---

## Key interview points

- A graph is **vertices + edges**; trees are restricted graphs. Clarify **directed/undirected**, **weighted/unweighted**, possible **cycles** and **disconnected** parts.
- **Adjacency list:** O(V + E) space, O(deg) neighbours — default for sparse graphs. **Matrix:** O(V²) space, O(1) edge lookup — small or dense graphs.
- Undirected `addEdge` updates **both** vertices; `removeVertex` removes incident edges before deleting the key.
- Every traversal needs a **visited** set, or cycles loop forever.
- **DFS** = stack or recursion; **BFS** = queue. Both **O(V + E)** time, **O(V)** space with a list (O(V²) with a matrix).
- **BFS finds shortest paths in unweighted graphs**; weighted graphs need Dijkstra.
- Mark visited **on enqueue**; avoid `shift()` in a hot loop; deep recursive DFS can overflow the stack.
- Disconnected graph: traverse from every unvisited vertex. Grids are implicit graphs.

## Summary

- Graphs model relationships: social networks, maps, links, dependencies, recommendations.
- Terms: vertex, edge, degree, path, cycle; directed vs undirected; weighted vs unweighted; sparse vs dense.
- Adjacency lists save space and iterate fast; matrices give O(1) edge checks at O(V²) memory.
- The `Graph` class supports `addVertex`, `addEdge`, `removeEdge`, `removeVertex`.
- DFS goes deep (recursion or stack), BFS goes wide (queue); both O(V + E).
- BFS yields fewest-edge paths; repeated traversals count connected components.
