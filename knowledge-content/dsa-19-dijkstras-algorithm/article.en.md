# Dijkstra's Algorithm – Shortest Paths in Weighted Graphs

## 1. Why shortest paths matter

"What is the fastest way to get from point A to point B?" is one of the most common questions software answers. **Dijkstra's algorithm**, designed by Dutch computer scientist Edsger Dijkstra in 1956 (famously in about twenty minutes over a cup of coffee), finds the **shortest path between vertices in a weighted graph**.

It powers **GPS routing**, **network routing** (OSPF — Open Shortest Path First), **cheapest flight searches**, epidemic modelling and path-finding in games.

Why not BFS from the graphs topic? BFS finds the path with the **fewest edges**, which is only the shortest path when every edge costs the same:

```text
      A ----------- 10 ----------- D        BFS picks A -> D   (1 edge, cost 10)
      |                            |
      2                            2        Dijkstra picks A -> B -> C -> D
      |                            |        (3 edges, cost 2 + 2 + 2 = 6)
      B ------------ 2 ----------- C
```

As long as all edge weights are **non-negative**, Dijkstra computes the shortest distance from one **source** vertex to every other vertex (single-source shortest paths).

---

## 2. Representing a weighted graph

An ordinary adjacency list stores only neighbour names. For a **weighted graph** every entry must also carry the edge's **weight** (distance, time, price…). We store objects `{ node, weight }`:

```js
class WeightedGraph {
  constructor() {
    this.adjacencyList = {};
  }

  addVertex(vertex) {
    if (!this.adjacencyList[vertex]) this.adjacencyList[vertex] = [];
  }

  addEdge(vertex1, vertex2, weight) {
    // Undirected: store the edge in both directions
    this.adjacencyList[vertex1].push({ node: vertex2, weight });
    this.adjacencyList[vertex2].push({ node: vertex1, weight });
  }
}
```

After `addEdge('A', 'B', 4)` the list looks like:

```text
{
  A: [ { node: 'B', weight: 4 } ],
  B: [ { node: 'A', weight: 4 } ]
}
```

For a **directed** graph, push only into `vertex1`'s list. `addVertex` and `addEdge` are O(1); the structure uses O(V + E) space, where V is the number of vertices and E the number of edges.

---

## 3. The example graph

We will find the shortest path from **A** to **E** in this undirected graph:

```text
      A ------- 4 ------- B
      |                    \
      2                     \ 3
      |                      \
      C ----- 2 ----- D --3-- E
       \              |      /
        4             1     1
         \            |    /
          `-----------F----'
```

Edge list: A–B 4, A–C 2, B–E 3, C–D 2, C–F 4, D–E 3, D–F 1, E–F 1.

Looking at it, A → B → E costs 7 and has only two edges. Is there something cheaper? Dijkstra will tell us.

---

## 4. The idea: greedy choice + relaxation

Dijkstra keeps three pieces of state:

- **distances** — the shortest distance found so far from the start to each vertex. Start = 0, everything else = `Infinity`.
- **previous** — for each vertex, the vertex we came from on the best path found so far (all `null` at first).
- **a priority queue** — vertices ordered by their current distance, smallest first.

Then it repeats four steps:

1. **Pick the unvisited vertex with the smallest known distance** and visit it. Its distance is now final.
2. Look at each of its **neighbours**.
3. For each neighbour, compute `distance to current vertex + edge weight`.
4. If that total is **smaller** than the distance stored for the neighbour, store the new distance and set `previous[neighbour] = current`.

Steps 3–4 are called **relaxing** an edge. Step 1 is a **greedy** choice: always expand the closest vertex. Why is it safe to call that distance final? Every other route to the vertex would have to leave through some unvisited vertex whose distance is already at least as large, and adding non-negative edges can only make it longer.

---

## 5. Step-by-step trace

Columns show the distance table **after** each visit (∞ = Infinity). Ties are broken by insertion order.

| Step | Visit (dist) | A | B | C | D | E | F | Relaxations |
|---|---|---|---|---|---|---|---|---|
| init | — | 0 | ∞ | ∞ | ∞ | ∞ | ∞ | — |
| 1 | A (0) | 0 | **4** | **2** | ∞ | ∞ | ∞ | B: 0+4, C: 0+2 |
| 2 | C (2) | 0 | 4 | 2 | **4** | ∞ | **6** | D: 2+2, F: 2+4 |
| 3 | B (4) | 0 | 4 | 2 | 4 | **7** | 6 | E: 4+3 |
| 4 | D (4) | 0 | 4 | 2 | 4 | 7 | **5** | E: 4+3=7 not < 7; F: 4+1=5 < 6 |
| 5 | F (5) | 0 | 4 | 2 | 4 | **6** | 5 | E: 5+1=6 < 7 |
| 6 | E (6) | 0 | 4 | 2 | 4 | 6 | 5 | target reached — stop |

The `previous` table evolves alongside it:

```text
after step 1:  B: A   C: A
after step 2:  D: C   F: C
after step 3:  E: B
after step 4:  F: D          (overwrites F: C, found 5 < 6)
after step 5:  E: F          (overwrites E: B, found 6 < 7)

final previous = { A: null, B: 'A', C: 'A', D: 'C', E: 'F', F: 'D' }
visited order  = [A, C, B, D, F, E]
```

Notice that E was first reached with distance 7 through B, then improved twice as better routes appeared. The obvious two-edge route was not the shortest one.

---

## 6. Rebuilding the path from `previous`

`distances` tells us the **cost** (E = 6); `previous` tells us the **route**. Walk backwards from the target until you hit `null`, then reverse:

```text
E -> previous[E] = F -> previous[F] = D -> previous[D] = C -> previous[C] = A -> null

reversed: A -> C -> D -> F -> E       cost 2 + 2 + 1 + 1 = 6
```

```js
function buildPath(previous, start, finish) {
  if (start !== finish && previous[finish] === null) return []; // unreachable

  const path = [];
  let current = finish;

  while (current !== null) {
    path.push(current);
    current = previous[current];
  }

  return path.reverse();
}
```

This is O(V) time and space in the worst case (a path can contain every vertex). If `distances[finish]` is still `Infinity`, the target is unreachable from the start.

---

## 7. A naive priority queue

Dijkstra needs a structure that repeatedly hands back "the vertex with the smallest distance". The simplest version is an array that is re-sorted on every insert:

```js
class NaivePriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    this.values.sort((a, b) => a.priority - b.priority); // O(n log n)
  }

  dequeue() {
    return this.values.shift(); // O(n): every element moves left
  }

  isEmpty() {
    return this.values.length === 0;
  }
}
```

It is easy to read and correct, but it is wasteful: sorting the whole array to add one item costs O(n log n), and `shift` costs O(n). We only ever need the minimum, not a fully sorted array. A **min binary heap** fixes this (section 9).

---

## 8. Implementing Dijkstra

Initialise `distances` and `previous`, enqueue the start with priority 0, then loop: dequeue the smallest, skip it if already visited, stop at the finish, otherwise relax its edges and enqueue every neighbour whose distance improved.

```js
function dijkstra(graph, start, finish) {
  const distances = {};
  const previous = {};
  const visited = new Set();
  const queue = new NaivePriorityQueue();

  for (const vertex in graph.adjacencyList) {
    distances[vertex] = vertex === start ? 0 : Infinity;
    previous[vertex] = null;
  }

  queue.enqueue(start, 0);

  while (!queue.isEmpty()) {
    const { val: current } = queue.dequeue();

    if (visited.has(current)) continue; // stale duplicate entry

    visited.add(current);

    if (current === finish) break; // its distance is now final

    for (const { node, weight } of graph.adjacencyList[current]) {
      if (visited.has(node)) continue;

      const candidate = distances[current] + weight;

      if (candidate < distances[node]) {
        distances[node] = candidate;
        previous[node] = current;
        queue.enqueue(node, candidate);
      }
    }
  }

  return { distance: distances[finish], path: buildPath(previous, start, finish) };
}

const g = new WeightedGraph();
['A', 'B', 'C', 'D', 'E', 'F'].forEach((v) => g.addVertex(v));
g.addEdge('A', 'B', 4);
g.addEdge('A', 'C', 2);
g.addEdge('B', 'E', 3);
g.addEdge('C', 'D', 2);
g.addEdge('C', 'F', 4);
g.addEdge('D', 'E', 3);
g.addEdge('D', 'F', 1);
g.addEdge('E', 'F', 1);

dijkstra(g, 'A', 'E'); // { distance: 6, path: ['A', 'C', 'D', 'F', 'E'] }
```

When a vertex's distance improves we simply enqueue it **again** instead of updating its old entry. The older, larger entry becomes **stale**; when it is eventually dequeued, the `visited` check throws it away. This "lazy deletion" keeps the queue simple. Remove the `break` to compute distances to **every** vertex.

---

## 9. Upgrading to a binary heap priority queue

A **min binary heap** (covered in the heaps topic) keeps the smallest priority at index 0, with children of index `i` at `2i + 1` and `2i + 2`. Insert and extract-min are both O(log n):

```js
class MinPriorityQueue {
  constructor() {
    this.values = [];
  }

  isEmpty() {
    return this.values.length === 0;
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    let idx = this.values.length - 1;

    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);

      if (this.values[idx].priority >= this.values[parentIdx].priority) break;

      [this.values[idx], this.values[parentIdx]] = [this.values[parentIdx], this.values[idx]];
      idx = parentIdx;
    }
  }

  dequeue() {
    const min = this.values[0];
    const end = this.values.pop();

    if (this.values.length > 0) {
      this.values[0] = end;
      this.sinkDown();
    }

    return min;
  }

  sinkDown() {
    const length = this.values.length;
    let idx = 0;

    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;

      if (left < length && this.values[left].priority < this.values[smallest].priority) {
        smallest = left;
      }

      if (right < length && this.values[right].priority < this.values[smallest].priority) {
        smallest = right;
      }

      if (smallest === idx) break;

      [this.values[idx], this.values[smallest]] = [this.values[smallest], this.values[idx]];
      idx = smallest;
    }
  }
}
```

Because it exposes the same `enqueue` / `dequeue` / `isEmpty` interface, the only change in `dijkstra` is one line: `const queue = new MinPriorityQueue();`. Queue contents during our trace (stale entries marked `*`):

```text
after A: [C2, B4]
after C: [B4, D4, F6]
after B: [D4, F6, E7]
after D: [F5, F6*, E7]
after F: [E6, F6*, E7*]     -> E6 is dequeued next: done
```

---

## 10. Complexity

Let V = vertices, E = edges. Every edge is relaxed at most once per direction, so there are O(E) enqueues and O(E) dequeues.

| Priority queue | enqueue | dequeue-min | Dijkstra total |
|---|---|---|---|
| Array re-sorted on every insert | O(n log n) | O(n) (`shift`) | O(E · E log E) — very slow |
| No queue: scan `distances` for the minimum | — | O(V) | O(V²) |
| Binary heap (lazy deletion) | O(log n) | O(log n) | **O((V + E) log V)** |
| Fibonacci heap (theory) | O(1) amortized | O(log n) amortized | O(E + V log V) |

- The lazy heap holds up to O(E) entries, so operations cost O(log E); since E ≤ V², log E ≤ 2 log V = O(log V).
- **Sparse** graph (E ≈ V): heap ≈ O(V log V). **Dense** graph (E ≈ V²): heap is O(V² log V), so the plain O(V²) array scan can win.
- **Space:** `distances`, `previous`, `visited` are O(V); the queue holds up to O(E): **O(V + E)**.

---

## 11. Limits: negative edge weights

Dijkstra's greedy step assumes that once a vertex is the closest one, nothing discovered later can make it closer. A **negative edge** breaks that assumption:

```text
    A --2--> B
    |        ^
    3       -2
    |        |
    +------> C          (directed edges)
```

1. Visit A: B = 2, C = 3.
2. Visit B (2): B is now final.
3. Visit C (3): C → B would give 3 + (−2) = 1, but B is already visited and is skipped.

Dijkstra reports B = 2; the true shortest distance is **1**. With a **negative cycle** "shortest path" is not even defined, because looping forever keeps lowering the cost.

| Situation | Use |
|---|---|
| Unweighted graph (all weights equal) | BFS, O(V + E) |
| Non-negative weights | Dijkstra, O((V + E) log V) |
| Negative weights allowed, detect negative cycles | Bellman–Ford, O(V · E) |
| All pairs of vertices, small V | Floyd–Warshall, O(V³) |

Adding a constant to every edge to make them non-negative does **not** work: it penalises paths with more edges and changes which path is shortest.

---

## 12. Variations and improvements

- **Early exit.** For one target, stop when the target is **dequeued**, not when it is first discovered — its distance may still improve (E went 7 → 6 in our trace).
- **All destinations.** Without the early exit, one run gives distances to every vertex, and `previous` forms a shortest-path tree.
- **Directed graphs and grids.** Directed: `addEdge` pushes one direction only. Grid: each cell is a vertex, the weight is the cost of entering a cell.
- **A\* search.** Dijkstra expands equally in every direction. A\* orders the queue by `distance so far + heuristic`, a best guess of the remaining distance (e.g. straight-line distance). If the heuristic **never overestimates**, A\* still finds the shortest path while visiting far fewer vertices. Dijkstra is A\* with heuristic 0.
- **BFS is a special case**: with every weight equal to 1, the priority queue behaves like a FIFO queue.

---

## Key interview points

- Dijkstra = **single-source shortest paths**, **non-negative** weights; BFS only handles equal weights.
- State: `distances` (start 0, others ∞), `previous`, and a **min priority queue**.
- Loop: dequeue the closest unvisited vertex (now final), **relax** its edges: `dist[u] + w < dist[v]` → update and enqueue.
- Path = walk `previous` back from the target, then reverse.
- Binary heap: **O((V + E) log V)** time, **O(V + E)** space; array scan O(V²) suits dense graphs.
- Lazy deletion: enqueue duplicates, skip stale entries. Stop when the target is **dequeued**.
- **Negative edges** break it — use Bellman–Ford. A\* adds a heuristic.

## Summary

- Weighted adjacency lists store `{ node, weight }`.
- Dijkstra greedily visits the closest unvisited vertex and relaxes its edges.
- In the example, A → C → D → F → E (cost 6) beats the two-edge route through B (7).
- The priority queue decides performance; a binary heap gives O((V + E) log V).
- Non-negative weights only; Bellman–Ford handles negatives, A\* speeds up single-target search.
