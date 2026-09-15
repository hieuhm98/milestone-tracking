# Thuật toán Dijkstra – Đường đi ngắn nhất trên đồ thị có trọng số

## 1. Vì sao cần bài toán đường đi ngắn nhất

"Đi từ điểm A đến điểm B thế nào cho nhanh nhất?" là một trong những câu hỏi phần mềm phải trả lời nhiều nhất. **Thuật toán Dijkstra**, do nhà khoa học máy tính người Hà Lan Edsger Dijkstra nghĩ ra năm 1956 (theo lời ông, chỉ trong khoảng hai mươi phút bên tách cà phê), tìm **đường đi ngắn nhất (shortest path) giữa các đỉnh trên đồ thị có trọng số (weighted graph)**.

Nó đứng sau **chỉ đường GPS**, **định tuyến mạng** (OSPF — Open Shortest Path First), **tìm vé máy bay rẻ nhất**, mô hình lây lan dịch bệnh và tìm đường trong game.

Sao không dùng BFS ở bài đồ thị? BFS tìm đường có **ít cạnh nhất**, và đó chỉ là đường ngắn nhất khi mọi cạnh có chi phí bằng nhau:

```text
      A ----------- 10 ----------- D        BFS picks A -> D   (1 edge, cost 10)
      |                            |
      2                            2        Dijkstra picks A -> B -> C -> D
      |                            |        (3 edges, cost 2 + 2 + 2 = 6)
      B ------------ 2 ----------- C
```

Miễn là mọi trọng số cạnh **không âm**, Dijkstra tính được khoảng cách ngắn nhất từ một đỉnh **nguồn** (source) tới mọi đỉnh khác (single-source shortest paths).

---

## 2. Biểu diễn đồ thị có trọng số

Adjacency list thông thường chỉ lưu tên các đỉnh kề. Với **đồ thị có trọng số**, mỗi phần tử còn phải mang **trọng số** (weight) của cạnh (quãng đường, thời gian, giá tiền…). Ta lưu các object `{ node, weight }`:

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

Sau `addEdge('A', 'B', 4)` danh sách trông như sau:

```text
{
  A: [ { node: 'B', weight: 4 } ],
  B: [ { node: 'A', weight: 4 } ]
}
```

Với **đồ thị có hướng** (directed), chỉ push vào danh sách của `vertex1`. `addVertex` và `addEdge` là O(1); cấu trúc tốn O(V + E) bộ nhớ, với V là số đỉnh và E là số cạnh.

---

## 3. Đồ thị ví dụ

Ta sẽ tìm đường ngắn nhất từ **A** đến **E** trên đồ thị vô hướng này:

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

Danh sách cạnh: A–B 4, A–C 2, B–E 3, C–D 2, C–F 4, D–E 3, D–F 1, E–F 1.

Nhìn qua, A → B → E tốn 7 và chỉ có hai cạnh. Có đường nào rẻ hơn không? Dijkstra sẽ trả lời.

---

## 4. Ý tưởng: lựa chọn tham lam + relaxation

Dijkstra giữ ba thứ trạng thái:

- **distances** — khoảng cách ngắn nhất tìm được *tới lúc này* từ điểm xuất phát đến từng đỉnh. Điểm xuất phát = 0, còn lại = `Infinity`.
- **previous** — với mỗi đỉnh, đỉnh liền trước nó trên đường tốt nhất đã biết (ban đầu đều là `null`).
- **hàng đợi ưu tiên** (priority queue) — các đỉnh xếp theo khoảng cách hiện tại, nhỏ nhất ra trước.

Rồi lặp lại bốn bước:

1. **Chọn đỉnh chưa thăm có khoảng cách đã biết nhỏ nhất** và thăm nó. Khoảng cách của nó giờ là chốt.
2. Xét từng **đỉnh kề** của nó.
3. Với mỗi đỉnh kề, tính `khoảng cách tới đỉnh hiện tại + trọng số cạnh`.
4. Nếu tổng đó **nhỏ hơn** khoảng cách đang lưu của đỉnh kề, lưu khoảng cách mới và đặt `previous[neighbour] = current`.

Bước 3–4 gọi là **relax** (nới lỏng) một cạnh. Bước 1 là lựa chọn **tham lam** (greedy): luôn mở rộng đỉnh gần nhất. Vì sao được phép chốt khoảng cách đó? Mọi con đường khác tới đỉnh này đều phải đi qua một đỉnh chưa thăm có khoảng cách đã lớn hơn hoặc bằng, mà cộng thêm các cạnh không âm thì chỉ có thể dài hơn.

---

## 5. Lần theo từng bước

Các cột là bảng khoảng cách **sau** mỗi lần thăm (∞ = Infinity). Khi hoà nhau, đỉnh được thêm vào queue trước sẽ ra trước.

| Bước | Thăm (dist) | A | B | C | D | E | F | Relax |
|---|---|---|---|---|---|---|---|---|
| khởi tạo | — | 0 | ∞ | ∞ | ∞ | ∞ | ∞ | — |
| 1 | A (0) | 0 | **4** | **2** | ∞ | ∞ | ∞ | B: 0+4, C: 0+2 |
| 2 | C (2) | 0 | 4 | 2 | **4** | ∞ | **6** | D: 2+2, F: 2+4 |
| 3 | B (4) | 0 | 4 | 2 | 4 | **7** | 6 | E: 4+3 |
| 4 | D (4) | 0 | 4 | 2 | 4 | 7 | **5** | E: 4+3=7 không < 7; F: 4+1=5 < 6 |
| 5 | F (5) | 0 | 4 | 2 | 4 | **6** | 5 | E: 5+1=6 < 7 |
| 6 | E (6) | 0 | 4 | 2 | 4 | 6 | 5 | tới đích — dừng |

Bảng `previous` thay đổi song song:

```text
after step 1:  B: A   C: A
after step 2:  D: C   F: C
after step 3:  E: B
after step 4:  F: D          (overwrites F: C, found 5 < 6)
after step 5:  E: F          (overwrites E: B, found 6 < 7)

final previous = { A: null, B: 'A', C: 'A', D: 'C', E: 'F', F: 'D' }
visited order  = [A, C, B, D, F, E]
```

Để ý E lần đầu được chạm tới với khoảng cách 7 qua B, rồi được cải thiện khi xuất hiện đường tốt hơn. Con đường hai cạnh "hiển nhiên" hoá ra không phải ngắn nhất.

---

## 6. Dựng lại đường đi từ `previous`

`distances` cho biết **chi phí** (E = 6); `previous` cho biết **lộ trình**. Đi ngược từ đích cho đến khi gặp `null`, rồi đảo ngược:

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

Hàm này tốn O(V) thời gian và bộ nhớ trong worst case (một đường đi có thể chứa mọi đỉnh). Nếu `distances[finish]` vẫn là `Infinity` thì từ điểm xuất phát không tới được đích.

---

## 7. Priority queue ngây thơ

Dijkstra cần một cấu trúc liên tục trả về "đỉnh có khoảng cách nhỏ nhất". Phiên bản đơn giản nhất là một mảng được sort lại sau mỗi lần thêm:

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

Dễ đọc và đúng, nhưng lãng phí: sort cả mảng chỉ để thêm một phần tử tốn O(n log n), còn `shift` tốn O(n). Ta chỉ cần phần tử nhỏ nhất chứ không cần cả mảng được sắp xếp. **Min binary heap** giải quyết chuyện này (mục 9).

---

## 8. Cài đặt Dijkstra

Khởi tạo `distances` và `previous`, đưa điểm xuất phát vào queue với priority 0, rồi lặp: lấy ra đỉnh nhỏ nhất, bỏ qua nếu đã thăm, dừng khi tới đích, còn không thì relax các cạnh của nó và enqueue mọi đỉnh kề có khoảng cách được cải thiện.

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

Khi khoảng cách của một đỉnh được cải thiện, ta chỉ việc enqueue nó **thêm lần nữa** thay vì sửa phần tử cũ. Phần tử cũ, lớn hơn, trở thành **stale** (lỗi thời); khi nó bị lấy ra sau này, phép kiểm tra `visited` sẽ vứt nó đi. Kỹ thuật "lazy deletion" (xoá lười) này giữ queue đơn giản. Bỏ `break` đi là tính được khoảng cách tới **mọi** đỉnh.

---

## 9. Nâng cấp lên priority queue dùng binary heap

**Min binary heap** (xem bài heap) giữ priority nhỏ nhất ở index 0, con của index `i` nằm ở `2i + 1` và `2i + 2`. Thêm và lấy phần tử nhỏ nhất đều là O(log n):

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

Vì có cùng interface `enqueue` / `dequeue` / `isEmpty`, trong `dijkstra` chỉ cần đổi đúng một dòng: `const queue = new MinPriorityQueue();`. Nội dung queue trong lần trace của ta (phần tử stale đánh dấu `*`):

```text
after A: [C2, B4]
after C: [B4, D4, F6]
after B: [D4, F6, E7]
after D: [F5, F6*, E7]
after F: [E6, F6*, E7*]     -> E6 is dequeued next: done
```

---

## 10. Độ phức tạp

Gọi V = số đỉnh, E = số cạnh. Mỗi cạnh được relax nhiều nhất một lần theo mỗi chiều, nên có O(E) lần enqueue và O(E) lần dequeue.

| Priority queue | enqueue | dequeue-min | Tổng Dijkstra |
|---|---|---|---|
| Mảng sort lại sau mỗi lần thêm | O(n log n) | O(n) (`shift`) | O(E · E log E) — rất chậm |
| Không dùng queue: quét `distances` tìm min | — | O(V) | O(V²) |
| Binary heap (lazy deletion) | O(log n) | O(log n) | **O((V + E) log V)** |
| Fibonacci heap (lý thuyết) | O(1) amortized | O(log n) amortized | O(E + V log V) |

- Heap kiểu lazy chứa tới O(E) phần tử, nên mỗi thao tác tốn O(log E); vì E ≤ V² nên log E ≤ 2 log V = O(log V).
- Đồ thị **thưa** (sparse, E ≈ V): heap ≈ O(V log V). Đồ thị **dày** (dense, E ≈ V²): heap là O(V² log V), nên cách quét mảng O(V²) đơn giản lại có thể thắng.
- **Bộ nhớ:** `distances`, `previous`, `visited` là O(V); queue chứa tới O(E): **O(V + E)**.

---

## 11. Giới hạn: cạnh có trọng số âm

Bước tham lam của Dijkstra giả định rằng khi một đỉnh đã là đỉnh gần nhất, không gì phát hiện sau đó có thể làm nó gần hơn. Một **cạnh âm** (negative edge) phá vỡ giả định này:

```text
    A --2--> B
    |        ^
    3       -2
    |        |
    +------> C          (directed edges)
```

1. Thăm A: B = 2, C = 3.
2. Thăm B (2): B bị chốt.
3. Thăm C (3): C → B cho 3 + (−2) = 1, nhưng B đã thăm nên bị bỏ qua.

Dijkstra báo B = 2; khoảng cách ngắn nhất thật là **1**. Nếu có **chu trình âm** (negative cycle) thì "đường ngắn nhất" thậm chí không xác định, vì cứ đi vòng mãi là chi phí cứ giảm.

| Tình huống | Dùng |
|---|---|
| Đồ thị không trọng số (mọi cạnh bằng nhau) | BFS, O(V + E) |
| Trọng số không âm | Dijkstra, O((V + E) log V) |
| Cho phép trọng số âm, phát hiện chu trình âm | Bellman–Ford, O(V · E) |
| Mọi cặp đỉnh, V nhỏ | Floyd–Warshall, O(V³) |

Cộng cùng một hằng số vào mọi cạnh để hết âm là **không** được: nó phạt những đường nhiều cạnh và làm thay đổi đường nào là ngắn nhất.

---

## 12. Biến thể và cải tiến

- **Dừng sớm.** Với một đích duy nhất, dừng khi đích được **lấy ra khỏi queue**, không phải khi mới chạm tới — khoảng cách của nó có thể còn giảm (E đi từ 7 xuống 6 trong ví dụ).
- **Mọi đích.** Không dừng sớm thì một lần chạy cho khoảng cách tới mọi đỉnh, và `previous` tạo thành một cây đường đi ngắn nhất (shortest-path tree).
- **Đồ thị có hướng và lưới.** Có hướng: `addEdge` chỉ push một chiều. Lưới (grid): mỗi ô là một đỉnh, trọng số là chi phí bước vào ô.
- **A\* search.** Dijkstra loang đều mọi hướng. A\* xếp queue theo `khoảng cách đã đi + heuristic`, trong đó heuristic là ước lượng quãng đường còn lại (ví dụ khoảng cách đường chim bay). Nếu heuristic **không bao giờ ước lượng quá** thực tế, A\* vẫn tìm ra đường ngắn nhất mà thăm ít đỉnh hơn nhiều. Dijkstra chính là A\* với heuristic bằng 0.
- **BFS là trường hợp đặc biệt**: khi mọi trọng số bằng 1, priority queue hoạt động như một FIFO queue.

---

## Điểm cần nhớ khi phỏng vấn

- Dijkstra = **đường ngắn nhất từ một nguồn**, trọng số **không âm**; BFS chỉ dùng được khi mọi cạnh bằng nhau.
- Trạng thái: `distances` (nguồn 0, còn lại ∞), `previous`, và một **min priority queue**.
- Vòng lặp: lấy đỉnh chưa thăm gần nhất (giờ đã chốt), **relax** các cạnh: `dist[u] + w < dist[v]` → cập nhật và enqueue.
- Đường đi = lần ngược `previous` từ đích rồi đảo lại.
- Binary heap: **O((V + E) log V)** thời gian, **O(V + E)** bộ nhớ; quét mảng O(V²) hợp với đồ thị dày.
- Lazy deletion: enqueue trùng, bỏ qua phần tử stale. Dừng khi đích được **lấy ra** khỏi queue.
- **Cạnh âm** làm hỏng Dijkstra — dùng Bellman–Ford. A\* thêm heuristic để dẫn hướng.

## Tóm tắt

- Adjacency list có trọng số lưu `{ node, weight }`.
- Dijkstra tham lam thăm đỉnh chưa thăm gần nhất và relax các cạnh của nó.
- Trong ví dụ, A → C → D → F → E (chi phí 6) thắng đường hai cạnh qua B (7).
- Priority queue quyết định hiệu năng; binary heap cho O((V + E) log V).
- Chỉ dùng cho trọng số không âm; Bellman–Ford xử lý cạnh âm, A\* tăng tốc tìm đường tới một đích.
