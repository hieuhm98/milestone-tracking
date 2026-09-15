# Thuật toán đồ thị – Topological Sort, Union-Find & MST

## 1. Vượt ra ngoài BFS, DFS và Dijkstra

Bạn đã biết lưu đồ thị bằng **danh sách kề** (adjacency list), duyệt bằng **BFS/DFS**, và tìm đường đi ngắn nhất bằng Dijkstra. Những công cụ đó là nền móng cho nhiều nhóm bài toán khác rất hay gặp trong hệ thống thực tế và phỏng vấn:

| Bài toán | Ví dụ | Thuật toán |
|---|---|---|
| Sắp thứ tự theo phụ thuộc | Thứ tự build các package | Topological sort |
| Phát hiện chu trình | Đồ thị phụ thuộc này có hợp lệ không? | Tô màu DFS, Kahn, Union-Find |
| Kết nối động | X và Y hiện có cùng nhóm không? | Union-Find |
| Nối mọi thứ với chi phí thấp nhất | Kéo cáp tới mọi văn phòng rẻ nhất | MST: Kruskal / Prim |

Trong suốt bài, đồ thị không trọng số là một object `{ vertex: [neighbours] }`, còn cạnh có trọng số là bộ ba `[u, v, weight]` với các đỉnh đánh số `0..n-1`. `V` là số đỉnh, `E` là số cạnh.

---

## 2. DAG và thứ tự topo

**DAG** (directed acyclic graph — **đồ thị có hướng không chu trình**) là đồ thị có hướng không chứa chu trình nào. DAG mô hình hoá sự phụ thuộc: môn học tiên quyết, các bước build, công thức trong bảng tính, bộ lập lịch tác vụ.

**Thứ tự topo** (topological order) liệt kê mọi đỉnh sao cho với mọi cạnh `u -> v`, `u` đứng **trước** `v`.

```text
install --> lint ------+
   |                   v
   +------> build ---> test --> deploy

Valid orders:  install, lint, build, test, deploy
               install, build, lint, test, deploy
```

Thứ tự topo tồn tại **khi và chỉ khi** đồ thị là DAG: với chu trình `A -> B -> A`, không đỉnh nào đứng trước được. Nó thường **không duy nhất** (`lint` và `build` độc lập nhau). Có hai thuật toán O(V + E) kinh điển để tạo ra nó: thuật toán Kahn và DFS post-order.

---

## 3. Thuật toán Kahn (in-degree + queue)

**Bậc vào** (in-degree) của một đỉnh là số cạnh trỏ vào nó. Đỉnh có in-degree 0 không còn phụ thuộc nào chưa xong, nên có thể đi tiếp.

Đưa mọi đỉnh in-degree 0 vào queue. Lặp lại: lấy một đỉnh ra, ghi vào kết quả, rồi giảm in-degree của các hàng xóm; hàng xóm nào về 0 thì vào queue. Nếu kết quả cuối cùng có ít hơn `V` đỉnh, các đỉnh còn lại đang mắc kẹt trong một **chu trình** (cycle).

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

**Độ phức tạp:** mỗi đỉnh vào queue một lần và mỗi cạnh bị giảm một lần → **O(V + E) thời gian**, **O(V) bộ nhớ phụ**.

---

## 4. Topological sort bằng DFS

DFS cho ta cách thứ hai. Khi một lời gọi DFS **hoàn tất** một đỉnh, mọi đỉnh đi tới được từ nó đều đã hoàn tất trước đó. Vì vậy nếu ghi các đỉnh theo **post-order** rồi **đảo ngược** danh sách, mỗi đỉnh sẽ đứng trước các đỉnh con cháu của nó.

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

**Độ phức tạp:** O(V + E) thời gian, O(V) bộ nhớ (`visited`, `order`, call stack của đệ quy). Bản này **giả định đồ thị là DAG**: gặp đồ thị có chu trình nó vẫn lặng lẽ trả về một thứ tự vô nghĩa, nên hãy thêm kỹ thuật tô màu ở phần sau nếu input có thể có chu trình.

---

## 5. Phát hiện chu trình trong đồ thị có hướng

Trong đồ thị có hướng, một tập `visited` đơn thuần là **không đủ**. Gặp lại một đỉnh đã thăm không có nghĩa là có chu trình:

```text
A --> B        dfs(A) visits B, then C.
|     ^        From C we reach B, already visited...
v     |        ...but there is no cycle: B was finished,
C ----+        not on the current path.
```

Chu trình chỉ tồn tại khi ta chạm tới một đỉnh **vẫn còn nằm trên đường DFS hiện tại** (một *back edge* — cạnh ngược). Theo dõi ba trạng thái: **WHITE** (chưa thăm), **GRAY** (đang nằm trên đường đi hiện tại), **BLACK** (đã duyệt xong).

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

**Độ phức tạp:** O(V + E) thời gian, O(V) bộ nhớ. Thuật toán Kahn cũng phát hiện chu trình tốt không kém: có chu trình đúng khi nó xuất ra ít hơn `V` đỉnh.

---

## 6. Phát hiện chu trình trong đồ thị vô hướng

Trong đồ thị vô hướng, mỗi cạnh được lưu theo **cả hai** chiều, nên từ `v` bạn luôn thấy lại đỉnh vừa đi tới. Đó không phải chu trình. Hãy truyền theo **đỉnh cha** (parent) và bỏ qua nó:

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

**Độ phức tạp:** O(V + E) thời gian, O(V) bộ nhớ. Quên kiểm tra parent thì **mọi** đồ thị có ít nhất một cạnh đều trông như có chu trình; còn vòng lặp ngoài là cần thiết vì đồ thị có thể **không liên thông** (disconnected).

---

## 7. Union-Find: ý tưởng

**Union-Find** (còn gọi là Disjoint Set Union, DSU — **cấu trúc tập rời nhau**) quản lý một tập hợp các **tập không giao nhau** và hỗ trợ hai thao tác:

- `find(x)` – trả về **đại diện** (gốc — root) của tập chứa `x`.
- `union(a, b)` – gộp hai tập chứa `a` và `b`.

Hai phần tử liên thông khi và chỉ khi `find(a) === find(b)`. Mỗi tập được lưu như một cây thông qua mảng `parent`: ban đầu `parent[i] = i` (mỗi phần tử là gốc của chính nó), `find` đi theo các liên kết cha lên tới gốc, còn `union` ngây thơ gán `parent[find(a)] = find(b)`.

Vấn đề: những lần union không may sẽ tạo thành một **chuỗi dài**, và `find` suy biến thành O(n).

```text
union(0,1), union(1,2), union(2,3), union(3,4) builds:

0 -> 1 -> 2 -> 3 -> 4 (root)     find(0) walks the whole chain: O(n)
```

---

## 8. Path compression và union by rank

Hai tinh chỉnh nhỏ biến Union-Find thành gần như hằng số.

**Nén đường đi** (path compression): trong lúc `find`, cho mọi nút đi qua trỏ **thẳng tới gốc**, làm cây phẳng ra cho những lần sau.

**Hợp theo hạng** (union by rank, hoặc by size): gắn cây **thấp hơn** vào dưới cây cao hơn, nên chiều cao chỉ tăng khi gộp hai cây cùng rank. Chiều cao luôn ≤ log n.

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

| Phiên bản | `find` / `union` |
|---|---|
| Ngây thơ | O(n) worst case |
| Chỉ union by rank | O(log n) worst case |
| Chỉ path compression | O(log n) amortized |
| **Cả hai** | **O(α(n)) amortized** |

`α(n)` là hàm Ackermann ngược (inverse Ackermann): nó ≤ 4 với mọi `n` có thể tồn tại trong thực tế, nên hãy coi nó là **gần như hằng số**. Bộ nhớ O(n).

---

## 9. Union-Find trong thực tế

**Đếm số thành phần liên thông** (connected components) từ danh sách cạnh:

```js
function countComponents(n, edges) {
  const uf = new UnionFind(n);

  for (const [a, b] of edges) uf.union(a, b);

  return uf.count;
}

countComponents(5, [[0, 1], [1, 2], [3, 4]]); // 2 -> {0,1,2} and {3,4}
```

**Phát hiện chu trình trong đồ thị vô hướng:** xử lý từng cạnh; nếu `union(a, b)` trả về `false` thì `a` và `b` vốn đã liên thông, nên cạnh này khép kín một chu trình (bài "redundant connection").

Nên chọn Union-Find thay vì BFS/DFS khi các cạnh **đến dần theo thời gian** và phải trả lời "có liên thông không?" sau mỗi cạnh, khi chỉ cần gom nhóm từ **danh sách cạnh**, và bên trong **Kruskal**. Hạn chế: nó chỉ **gộp** được tập chứ không **tách** được, và không mô hình hoá được tính đi tới được (reachability) trên đồ thị có hướng.

---

## 10. Cây khung nhỏ nhất

Xét một đồ thị **liên thông, vô hướng, có trọng số**. **Cây khung** (spanning tree) là một tập con các cạnh nối cả `V` đỉnh mà **không có chu trình** — nó luôn có đúng **V − 1 cạnh**. **Cây khung nhỏ nhất** (minimum spanning tree — MST) là cây khung có tổng trọng số nhỏ nhất.

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

Các tính chất hữu ích:

- **Tính chất lát cắt** (cut property): với bất kỳ cách chia các đỉnh thành hai nhóm, cạnh nhẹ nhất bắc qua ranh giới thuộc về một MST nào đó. Kruskal và Prim đều là thuật toán tham lam (greedy) dựa trên tính chất này.
- Nếu mọi trọng số đều khác nhau thì MST là **duy nhất**; nếu không có thể có nhiều MST, nhưng tổng trọng số luôn bằng nhau.
- MST **không phải** cây đường đi ngắn nhất. Với các cạnh `A-B 3`, `B-C 3`, `A-C 5`, MST là `A-B + B-C` (6), nhưng đường ngắn nhất từ A tới C là cạnh trực tiếp (5).

Ứng dụng: thiết kế mạng, phân cụm (bỏ đi các cạnh MST nặng nhất).

---

## 11. Thuật toán Kruskal

Kruskal xây MST **từng cạnh một**, cạnh rẻ nhất toàn cục trước: sắp xếp các cạnh theo trọng số, cho mỗi đỉnh vào một tập Union-Find riêng, rồi lấy mọi cạnh có hai đầu nằm ở **hai tập khác nhau** (và union chúng), bỏ qua các cạnh còn lại vì chúng sẽ khép kín chu trình. Dừng khi đã có `V − 1` cạnh.

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

**Độ phức tạp:** bước sắp xếp chiếm ưu thế → **O(E log E)**, tương đương O(E log V) vì E ≤ V². Union-Find chỉ thêm O(E · α(V)). Bộ nhớ O(V + E).

---

## 12. Thuật toán Prim

Prim phát triển **một cây duy nhất** từ một đỉnh xuất phát. Mỗi bước nó thêm cạnh rẻ nhất nối một đỉnh **trong** cây với một đỉnh **ngoài** cây. Trông rất giống Dijkstra, chỉ khác một điểm then chốt ở bước cập nhật:

- Dijkstra: `dist[v] = dist[u] + w` (tổng khoảng cách từ nguồn)
- Prim: `best[v] = w` (chỉ là trọng số của một cạnh nối)

Bản dưới đây quét mảng thay vì dùng heap, cho O(V²) — lý tưởng với đồ thị **dày** (dense).

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

Trên đồ thị ở phần 10, xuất phát từ A: lấy C (1), B cải thiện 4 → 2; lấy B (2), D cải thiện 8 → 5; lấy D (5). Tổng 8, giống Kruskal. Dùng binary heap thay cho việc quét mảng, Prim chạy **O(E log V)**, tốt hơn với đồ thị thưa (sparse).

---

## 13. Chọn đúng thuật toán

| Tình huống | Dùng | Thời gian |
|---|---|---|
| Sắp thứ tự tác vụ có phụ thuộc | Kahn hoặc topological sort bằng DFS | O(V + E) |
| Chu trình trong đồ thị có hướng | DFS ba màu hoặc Kahn | O(V + E) |
| Chu trình trong đồ thị vô hướng | DFS kèm parent, hoặc Union-Find | O(V + E) / O(E · α(V)) |
| Kiểm tra liên thông khi cạnh được thêm dần | Union-Find | O(α(n)) mỗi thao tác |
| MST trên danh sách cạnh thưa | Kruskal | O(E log E) |
| MST trên đồ thị dày | Prim (mảng) | O(V²) |
| Đường đi ngắn nhất, trọng số không âm | Dijkstra với binary heap | O((V + E) log V) |

Kruskal và Prim chỉ áp dụng cho đồ thị **vô hướng**.

---

## Điểm cần nhớ khi phỏng vấn

- Thứ tự topo **chỉ tồn tại với DAG** và thường không duy nhất; **Kahn** (kết quả ít hơn `V` đỉnh ⇒ có chu trình) và **DFS** (post-order rồi đảo ngược) đều là **O(V + E)**.
- Chu trình có hướng ⇒ có cạnh tới đỉnh **GRAY** (đang trên đường đi hiện tại). Chu trình vô hướng ⇒ gặp hàng xóm đã thăm mà **không phải parent**.
- **Union-Find** với **path compression + union by rank** chạy **O(α(n))** amortized — gần như hằng số. Nó gộp được nhưng không tách được.
- MST có **V − 1 cạnh**; nó không phải cây đường đi ngắn nhất.
- **Kruskal** = sắp xếp cạnh + Union-Find, O(E log E). **Prim** = phát triển một cây, O(V²) với mảng hoặc O(E log V) với heap; bước cập nhật dùng trọng số cạnh, không dùng khoảng cách đường đi.

## Tóm tắt

- Topological sort sắp xếp DAG sao cho mọi cạnh đều hướng về phía trước (Kahn hoặc DFS post-order đảo ngược).
- Chu trình có hướng cần DFS ba trạng thái; chu trình vô hướng cần kiểm tra parent hoặc Union-Find.
- Union-Find quản lý các tập rời nhau; hai tối ưu của nó làm `find`/`union` gần như O(1).
- Kruskal chọn các cạnh an toàn rẻ nhất toàn cục; Prim phát triển một cây. Cả hai đều tạo MST gồm V − 1 cạnh.
