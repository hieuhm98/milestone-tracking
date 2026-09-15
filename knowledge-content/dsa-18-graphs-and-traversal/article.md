# Đồ thị & duyệt đồ thị (BFS, DFS)

## 1. Đồ thị là gì?

**Đồ thị** (graph) nói gọn là **các node + các kết nối**: một tập hữu hạn (và có thể thay đổi) các **đỉnh** (vertex) cùng một tập các **cạnh** (edge) — là cặp đỉnh không có thứ tự trong đồ thị vô hướng, và cặp có thứ tự trong đồ thị có hướng.

Khác với cây (tree), đồ thị **không có gốc** (root), không có quy tắc cha/con, và có thể chứa **chu trình** (cycle). Thực ra cây chỉ là một đồ thị đặc biệt: liên thông, vô hướng, không có chu trình (đúng `V - 1` cạnh).

```text
      A
    /   \       6 vertices: A B C D E F
   B     E      6 edges:    A-B, B-C, C-D, D-E, E-F, F-A
   |     |      one cycle:  A-B-C-D-E-F-A
   C     F
    \   /
      D
```

Sự tự do đó giúp đồ thị mô hình hoá gần như mọi bài toán kiểu "các thứ và quan hệ giữa chúng". Cái giá phải trả: thuật toán phải xử lý được chu trình — đó là lý do mọi phép duyệt trong bài đều giữ một tập **visited** (đã thăm).

---

## 2. Đồ thị được dùng ở đâu

- **Mạng xã hội** — người là đỉnh, quan hệ bạn bè hoặc follow là cạnh.
- **Bản đồ và dẫn đường** — ngã tư là đỉnh, con đường là cạnh có trọng số.
- **Định tuyến** (routing) — router và đường truyền; gói tin cần tìm đường đi.
- **Gợi ý** (recommendation) — "những người bạn có thể biết", "có thể bạn cũng thích": khám phá các đỉnh ở gần những thứ người dùng đã thích.
- **Web crawler** — trang web là đỉnh, link là cạnh có hướng.
- **Phụ thuộc, game, mê cung, hệ thống file** — các bước build, trạng thái bàn cờ, ô lưới, thư mục.

```text
Halo --- Sci-Fi --- Borderlands
   \                /
    +---- Guns ----+
```

Người thích *Halo* cách *Borderlands* hai bước qua các tag chung. "Tìm các đỉnh ở gần đỉnh này" chính là một phép duyệt đồ thị.

---

## 3. Thuật ngữ cơ bản

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Vertex** (đỉnh, node) | Một phần tử trong đồ thị |
| **Edge** (cạnh) | Kết nối giữa hai đỉnh |
| **Neighbour** (kề) | Đỉnh được nối với đỉnh khác bằng một cạnh |
| **Degree** (bậc) | Số cạnh chạm vào một đỉnh (có hướng: in-degree / out-degree) |
| **Path / cycle** | Một chuỗi cạnh nối tiếp; cycle quay về đỉnh xuất phát |
| **Sparse / dense** (thưa / dày) | E xấp xỉ V so với E xấp xỉ V² |

**Vô hướng và có hướng** (undirected vs directed). Cạnh vô hướng đi được cả hai chiều, giống quan hệ bạn bè trên Facebook. Cạnh **có hướng** mang mũi tên: bạn có thể follow ai đó trên Instagram mà họ không follow lại.

**Không trọng số và có trọng số** (unweighted vs weighted). Cạnh có trọng số mang một giá trị — số km, số phút, chi phí.

```text
Undirected      Directed        Weighted
A --- B         A ---> B        A --8-- B
|     |         ^      |        |       |
C --- D         C <--- D        20      15
                                |       |
                                C --7-- D
```

Đồ thị vô hướng có tối đa `V(V-1)/2` cạnh, đồ thị có hướng tối đa `V(V-1)`.

---

## 4. Cách biểu diễn 1: ma trận kề

**Ma trận kề** (adjacency matrix) là một lưới `V × V`: ô `[i][j]` bằng `1` nếu có cạnh từ `i` đến `j`, ngược lại bằng `0` (với đồ thị có trọng số thì lưu trọng số).

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

Đồ thị vô hướng cho ma trận **đối xứng**; đồ thị có hướng thì không nhất thiết. Trong JS: `matrix[i][j] === 1` là kiểm tra có cạnh hay không.

Điểm mạnh: "có cạnh u–v không?" chỉ cần một lần tra, O(1). Điểm yếu: luôn tốn **O(V²)** bộ nhớ dù gần như không có cạnh nào, và liệt kê các đỉnh kề của một đỉnh phải quét cả một hàng, O(V).

---

## 5. Cách biểu diễn 2: danh sách kề

**Danh sách kề** (adjacency list) lưu, với mỗi đỉnh, chỉ những đỉnh nối với nó — dùng mảng của mảng khi đỉnh được đánh số, hoặc object/`Map` khi đỉnh có tên.

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

Bộ nhớ đúng bằng những gì thực sự tồn tại: một mục cho mỗi đỉnh cộng hai mục cho mỗi cạnh vô hướng, **O(V + E)**. Duyệt các đỉnh kề của một đỉnh tốn O(degree) — đúng thứ các phép duyệt cần. Nhược điểm: "B có nối với F không?" phải tìm trong mảng của B, O(deg(B)); dùng một `Set` cho mỗi đỉnh sẽ đưa về O(1) trung bình.

---

## 6. Ma trận hay danh sách: Big O và trade-off

| Thao tác | Danh sách kề | Ma trận kề |
|---|---|---|
| Thêm đỉnh | O(1) | O(V²) (dựng lại lưới) |
| Thêm cạnh | O(1) | O(1) |
| Xoá cạnh (u, v) | O(deg(u) + deg(v)), ≤ O(E) | O(1) |
| Xoá đỉnh | O(V + E) | O(V²) |
| (u, v) có phải cạnh? | O(deg(u)), ≤ O(V) | O(1) |
| Các đỉnh kề của v | O(deg(v)) | O(V) |
| Bộ nhớ | O(V + E) | O(V²) |
| BFS / DFS toàn bộ | O(V + E) | O(V²) |

Tóm lại: danh sách tốn ít bộ nhớ hơn trên đồ thị thưa và duyệt cạnh nhanh hơn; ma trận tra một cạnh cụ thể ngay lập tức.

**Chọn cái nào?** Đồ thị ngoài đời thường **lớn và thưa** — một tỉ người dùng không có tới một tỉ² quan hệ bạn bè. Vì vậy danh sách kề là lựa chọn mặc định và là thứ ta sẽ xây dựng. Dùng ma trận khi đồ thị nhỏ hoặc dày, hoặc khi thuật toán liên tục hỏi "cạnh (u, v) có tồn tại không?".

---

## 7. Xây dựng class Graph

Một đồ thị **vô hướng, không trọng số** dựa trên danh sách kề:

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

Câu điều kiện trong `addVertex` ngăn việc gọi lại lần hai xoá mất các cạnh đang có. Các biến thể:

- **Có hướng:** chỉ push `v2` vào danh sách của `v1`.
- **Có trọng số:** push object `{ node: v2, weight }` — đúng dạng mà thuật toán Dijkstra ở bài sau sử dụng.
- **Không cho cạnh trùng:** dùng `Set` cho mỗi đỉnh thay vì mảng.

---

## 8. Xoá cạnh và xoá đỉnh

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

`removeVertex` không được chỉ `delete` key: mọi đỉnh kề sẽ còn giữ một **tham chiếu treo** (dangling reference), và một lần duyệt sau đó sẽ lỗi khi đọc `this.adjacencyList["Hong Kong"]` ra `undefined`. Vì vậy hàm xoá hết các cạnh nối với đỉnh trước, rồi mới xoá key.

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

## 9. Duyệt đồ thị và tập visited

**Duyệt** (traversal) là thăm, cập nhật hoặc kiểm tra mọi đỉnh có thể đi tới từ một đỉnh xuất phát. Nó là nền tảng của web crawler, mạng peer-to-peer, gợi ý "gần giống nhất", giải mê cung và GPS.

Bạn đã duyệt cây bằng BFS và DFS. Đồ thị thêm hai điểm khác:

1. **Không có gốc.** Bạn phải chọn đỉnh xuất phát, và chỉ tới được những đỉnh liên thông với nó.
2. **Chu trình.** A → B → A → B … không bao giờ dừng. Tập **visited** (object hoặc `Set`) đánh dấu mỗi đỉnh ngay lần đầu gặp, nên mỗi đỉnh chỉ được xử lý một lần.

Mọi ví dụ bên dưới dùng đồ thị này:

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

Thứ tự các đỉnh kề trong mỗi mảng quyết định kết quả chính xác, nên có thể có nhiều thứ tự khác nhau mà đều hợp lệ.

---

## 10. Duyệt theo chiều sâu (đệ quy)

**Duyệt theo chiều sâu** (depth-first search — DFS) đi xa nhất có thể theo một nhánh rồi mới **quay lui** (backtrack). Đệ quy cho ta quay lui miễn phí: call stack nhớ chỗ cần quay lại.

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

**Độ phức tạp:** mỗi đỉnh được thăm một lần và mỗi mảng kề được quét một lần: **O(V + E)** thời gian. Bộ nhớ **O(V)** cho `visited`/`result` cộng tối đa **O(V)** stack frame — một đồ thị dài như một đường thẳng có thể gây tràn stack (stack overflow).

---

## 11. Duyệt theo chiều sâu (vòng lặp, dùng stack)

Một **ngăn xếp** (stack) tường minh (`push`/`pop`) thay cho call stack, nên không còn giới hạn độ sâu đệ quy.

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

Kết quả **A, C, E, F, D, B** khác với bản đệ quy A, B, D, E, C, F, nhưng cả hai đều là duyệt chiều sâu: stack là LIFO, nên đỉnh vừa được phát hiện gần nhất (C, được push sau cùng) được xử lý tiếp. Đánh dấu khi push giúp mỗi đỉnh nằm trong stack tối đa một lần. Muốn ra đúng thứ tự của bản đệ quy, hãy push các đỉnh kề theo thứ tự ngược và đánh dấu đỉnh khi **pop** (bỏ qua đỉnh đã thăm).

Thời gian **O(V + E)**, bộ nhớ **O(V)**.

---

## 12. Duyệt theo chiều rộng (dùng queue)

**Duyệt theo chiều rộng** (breadth-first search — BFS) thăm hết các đỉnh kề ở khoảng cách hiện tại rồi mới đi xa hơn — như gợn sóng lan trên mặt nước. Nó dùng **hàng đợi** (queue, FIFO).

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

Đánh dấu visited **ngay khi enqueue**, nếu không một đỉnh có thể vào queue nhiều lần. `shift()` trên mảng JS là O(n), nên dùng con trỏ đọc để giữ BFS ở **O(V + E)** thời gian, **O(V)** bộ nhớ.

**Đường đi ngắn nhất.** Trên đồ thị **không trọng số**, BFS tới các đỉnh theo thứ tự khoảng cách, nên lần đầu tới một đỉnh chính là theo đường đi có **ít cạnh nhất**. Lưu đỉnh cha (parent) của mỗi đỉnh rồi lần ngược lại:

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

Khi cạnh **có trọng số**, ít cạnh nhất không còn là rẻ nhất — đó là việc của thuật toán Dijkstra ở bài sau.

---

## 13. So sánh BFS và DFS, các ứng dụng thường gặp

| | BFS | DFS |
|---|---|---|
| Cấu trúc | Queue (FIFO) | Stack (LIFO) hoặc đệ quy |
| Thứ tự | Gần trước, từng tầng một | Đi hết một nhánh rồi quay lui |
| Đường đi ngắn nhất (không trọng số) | Có | Không |
| Thời gian (danh sách kề) | O(V + E) | O(V + E) |
| Bộ nhớ | O(V) — tốn khi "mặt trận" rộng | O(V) — tốn khi đường đi sâu |
| Hợp với | Bậc quan hệ, ít bước nhất, gợi ý gần nhất | Khám phá mọi đường, mê cung, thành phần liên thông, kiểm tra chu trình |

**Thành phần liên thông** (connected components). Một lần duyệt chỉ tới được một thành phần. Lặp qua mọi đỉnh và bắt đầu một lần duyệt mới từ mỗi đỉnh chưa thăm; số lần bắt đầu chính là số thành phần liên thông. Tổng vẫn là O(V + E).

**Lưới là đồ thị ngầm** (implicit graph). Trong bài "number of islands", mỗi ô là một đỉnh và 4 ô xung quanh là các cạnh — không cần dựng danh sách kề. Duyệt tốn O(R · C).

```text
1 1 0 0
1 0 0 1     3 islands (groups of 4-connected 1s)
0 1 0 1
```

Phát hiện chu trình, sắp xếp topo (topological sort) và union-find xây dựng trên các phép duyệt này, sẽ có bài riêng ở phần sau.

---

## Điểm cần nhớ khi phỏng vấn

- Đồ thị là **đỉnh + cạnh**; cây là đồ thị bị giới hạn. Hãy hỏi rõ **có hướng/vô hướng**, **có/không trọng số**, có thể có **chu trình** hay phần **không liên thông** không.
- **Danh sách kề:** O(V + E) bộ nhớ, O(deg) để lấy đỉnh kề — mặc định cho đồ thị thưa. **Ma trận kề:** O(V²) bộ nhớ, O(1) tra cạnh — cho đồ thị nhỏ hoặc dày.
- `addEdge` vô hướng cập nhật **cả hai** đỉnh; `removeVertex` phải xoá các cạnh liên quan trước khi xoá key.
- Mọi phép duyệt cần tập **visited**, nếu không chu trình sẽ gây lặp vô hạn.
- **DFS** = stack hoặc đệ quy; **BFS** = queue. Cả hai **O(V + E)** thời gian, **O(V)** bộ nhớ với danh sách kề (O(V²) với ma trận).
- **BFS tìm đường ngắn nhất trên đồ thị không trọng số**; đồ thị có trọng số cần Dijkstra.
- Đánh dấu visited **khi enqueue**; tránh `shift()` trong vòng lặp nóng; DFS đệ quy trên đồ thị sâu có thể tràn stack.
- Đồ thị không liên thông: duyệt từ mọi đỉnh chưa thăm. Lưới là đồ thị ngầm.

## Tóm tắt

- Đồ thị mô hình hoá quan hệ: mạng xã hội, bản đồ, liên kết web, phụ thuộc, gợi ý.
- Thuật ngữ: vertex, edge, degree, path, cycle; có hướng và vô hướng; có và không trọng số; thưa và dày.
- Danh sách kề tiết kiệm bộ nhớ và duyệt nhanh; ma trận kề tra cạnh O(1) với giá O(V²) bộ nhớ.
- Class `Graph` hỗ trợ `addVertex`, `addEdge`, `removeEdge`, `removeVertex`.
- DFS đi sâu (đệ quy hoặc stack), BFS đi rộng (queue); cả hai O(V + E).
- BFS cho đường đi ít cạnh nhất; duyệt lặp lại từ các đỉnh chưa thăm để đếm thành phần liên thông.
