# Trie – Cây tiền tố để tra cứu chuỗi nhanh

## 1. Vì sao cần trie?

Rất nhiều bài toán về chuỗi thực chất là bài toán về **tiền tố** (prefix): ô tìm kiếm gợi ý `"cart"`, `"carton"`, `"cartoon"` khi bạn gõ `"car"`; trình kiểm tra chính tả; router tìm tiền tố dài nhất khớp với một địa chỉ IP.

Hash set trả lời tốt câu hỏi "`"cart"` có phải là một từ không?", nhưng nó không biết gì về tiền tố. Muốn tìm mọi từ bắt đầu bằng `"car"`, set phải quét **toàn bộ N từ**. Mảng đã sắp xếp có thể binary search tìm tiền tố, nhưng chèn một từ mới lại tốn O(N).

**Trie** (đọc là "try", lấy từ re*trie*val), còn gọi là **cây tiền tố** (prefix tree), lưu chuỗi **theo từng ký tự dọc các đường đi từ gốc**. Các từ có chung tiền tố thì dùng chung các node của tiền tố đó, nên "mọi từ bắt đầu bằng `car`" đơn giản là "mọi thứ nằm dưới node đi tới bằng `c → a → r`".

---

## 2. Cấu trúc của trie

- **Gốc** (root) đại diện cho chuỗi rỗng và không chứa ký tự nào.
- Mỗi **cạnh** mang một ký tự; mỗi **node** đại diện cho tiền tố được đánh vần bởi đường đi từ gốc tới nó.
- Mỗi node có một map **children** (ký tự → node con) và một cờ **`isEnd`**: "có một từ hoàn chỉnh kết thúc tại đây".

Trie chứa `car`, `cart`, `cat`, `do`, `dog` (`*` = `isEnd` là true):

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

Hai điều cần để ý:

- **`isEnd` là bắt buộc.** `"ca"` là một đường đi trong trie nhưng không phải là từ; `"car"` vừa là đường đi vừa là từ, dù `"cart"` còn đi tiếp qua nó. Không có cờ này thì không thể phân biệt hai trường hợp.
- **Độ sâu của một node bằng độ dài tiền tố của nó**, không phụ thuộc số lượng từ. Vì vậy chi phí tra cứu chỉ phụ thuộc độ dài chuỗi, không bao giờ phụ thuộc trie đang chứa bao nhiêu từ.

---

## 3. Biểu diễn một node

Hai cách bố trí phổ biến:

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

| Cách bố trí | Tìm node con | Bộ nhớ mỗi node | Node con có sẵn thứ tự? |
|---|---|---|---|
| `Map` / object | O(1) trung bình (hashing) | Tỉ lệ với số con thực tế | Không — theo thứ tự chèn, cần sort |
| Mảng kích thước σ (bảng chữ cái) | O(1), truy cập index trực tiếp | Luôn σ ô, kể cả ô trống | Có, miễn phí |

σ (sigma) là **kích thước bảng chữ cái** (alphabet size): 26 với chữ thường, 2 với bit, 128 với ASCII. Node dạng mảng nhanh và gọn khi đề phỏng vấn ghi "chỉ gồm chữ cái tiếng Anh viết thường"; node dạng `Map` là lựa chọn an toàn cho văn bản tuỳ ý, nơi mảng σ ô sẽ lãng phí bộ nhớ khủng khiếp. Phần còn lại của bài dùng `Map`.

---

## 4. Chèn (insert)

Đi theo từng ký tự của từ, bắt đầu từ gốc. Với mỗi ký tự, đi theo node con đã có hoặc tạo mới. Cuối cùng đánh dấu node cuối là điểm kết thúc từ.

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

Trace: chèn `"care"` vào trie ở phần 2.

```text
ch  node before   child exists?   action
c   root          yes             move to c
a   c             yes             move to a
r   a             yes             move to r   (r is already a word end - untouched)
e   r             no              create e, move to e
end               -               e.isEnd = true
```

Chỉ một node mới được tạo — ba ký tự dùng chung không tốn thêm gì. Chính sự chia sẻ này giúp trie tiết kiệm chỗ với những bộ từ điển có nhiều tiền tố chung.

- **Thời gian:** O(L), L = độ dài từ.
- **Bộ nhớ:** O(L) node mới trong trường hợp xấu nhất (không chung tiền tố nào), O(1) nếu đường đi đã tồn tại.

Chèn cùng một từ hai lần chỉ gán lại `isEnd = true` — trie hoạt động như một set.

---

## 5. search và startsWith

Cả hai đi cùng một đường, chỉ khác ở bước kiểm tra cuối. Tách phần đi đường thành một hàm phụ:

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

| Lời gọi trên trie ở phần 2 | Có đường đi? | `isEnd`? | Kết quả |
|---|---|---|---|
| `search("car")` | có | có | `true` |
| `search("ca")` | có | không | `false` |
| `startsWith("ca")` | có | — | `true` |
| `search("cars")` | không (thiếu `s`) | — | `false` |
| `startsWith("")` | có (gốc) | — | `true` |

Bug kinh điển là viết `search` thành `findNode(word) !== null` — đó chính là `startsWith`, và nó báo nhầm `"ca"` là một từ.

- **Thời gian:** O(L) cho cả hai; có thể dừng sớm ngay ở ký tự đầu tiên không tồn tại.
- **Bộ nhớ:** O(1) — chỉ một con trỏ.

---

## 6. Autocomplete: gom các từ dưới một tiền tố

Autocomplete = `findNode(prefix)`, sau đó **duyệt theo chiều sâu** (DFS) cây con đó, vừa đi vừa ghép chuỗi và ghi lại mọi node có `isEnd` là true.

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

Vì DFS thăm node cha trước node con, và thăm các con theo thứ tự đã sort, kết quả ra theo **thứ tự từ điển** (lexicographic), từ ngắn đứng trước các từ kéo dài từ nó.

- **Thời gian:** O(P + M), P = độ dài tiền tố, M = số node trong cây con (cộng chi phí ghép chuỗi kết quả). Việc sort key thêm một hệ số theo σ, là hằng số với bảng chữ cái cố định.
- **Bộ nhớ:** O(D) cho độ sâu đệ quy, D = độ dài từ dài nhất trong cây con, cộng phần output.

Hệ thống autocomplete thực tế lưu **điểm số** (score) tại mỗi điểm kết thúc từ (hoặc cache top-k gợi ý ở từng node) để chỉ trả về vài kết quả tốt nhất, không phải tất cả.

---

## 7. Xoá (delete)

Xoá không được làm hỏng các từ khác. Bỏ đánh dấu `isEnd`, rồi trên đường quay lên chỉ **cắt tỉa** (prune) những node không còn là điểm kết thúc từ và không còn con nào.

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

Ba trường hợp, với các từ `car`, `cart`, `cat`:

```text
delete "cart" : t has no children -> remove t; r is a word end -> stop
delete "car"  : r still has child t -> only clear r.isEnd, remove nothing
delete "cat"  : remove t; a still has child r -> stop
```

- **Thời gian:** O(L). **Bộ nhớ:** O(L) cho call stack đệ quy.
- Cách xoá "lười" (lazy) chỉ gán `isEnd = false`; vẫn đúng nhưng để lại các node chết.

---

## 8. Tổng hợp độ phức tạp

L = độ dài chuỗi trong thao tác, N = số từ, S = tổng số ký tự của mọi từ, σ = kích thước bảng chữ cái.

| Thao tác | Thời gian | Bộ nhớ phụ |
|---|---|---|
| `insert(word)` | O(L) | O(L) node mới (xấu nhất) |
| `search(word)` | O(L) | O(1) |
| `startsWith(prefix)` | O(L) | O(1) |
| `delete(word)` | O(L) | O(L) đệ quy |
| `autocomplete(prefix)` | O(P + M) | O(D) đệ quy + output |
| Xây trie từ N từ | O(S) | O(S) node (xấu nhất) |

Bộ nhớ là điểm yếu của trie. Trường hợp xấu nhất là O(S) node — không có tiền tố chung nào — và mỗi node là một object kèm một `Map` hoặc mảng σ ô. Với node dạng mảng, con số lên tới **O(S · σ)** ô con trỏ. Trie của một bộ từ điển tiếng Anh lớn dễ dàng tốn gấp nhiều lần bộ nhớ của chính các chuỗi gốc.

---

## 9. Trie vs hash set vs mảng đã sắp xếp

| Nhu cầu | Hash set chứa chuỗi | Mảng sắp xếp + binary search | Trie |
|---|---|---|---|
| Tra cứu chính xác | O(L) trung bình | O(L log N) | O(L) kể cả xấu nhất |
| Chèn | O(L) trung bình | O(N) do dịch phần tử | O(L) |
| Mọi từ có một tiền tố | O(N · L) quét hết | O(L log N + output) | O(P + M) |
| Duyệt theo thứ tự | Phải sort, O(N log N · L) | Đã có thứ tự | DFS, có thứ tự với node mảng |
| Bộ nhớ | Thấp nhất | Thấp | Cao nhất |
| Khớp tiền tố dài nhất | Thử từng tiền tố | Khó | Một lần đi, O(L) |

Điểm tinh tế: **tra cứu chuỗi trong hash không phải O(1)** — tính hash phải đọc đủ L ký tự, nên cũng là O(L). Trie không nhanh hơn hash set ở tra cứu chính xác; thực tế set thường nhanh hơn nhờ tính cục bộ bộ nhớ và ít cấp phát. Hãy chọn trie khi cần **thao tác theo tiền tố**: autocomplete, `startsWith`, tiền tố dài nhất, hoặc tìm kiếm tiến **từng ký tự một** (người dùng đang gõ, đi trên lưới chữ) và có thể bỏ ngay một tiền tố chết.

---

## 10. Các biến thể

**Đếm tiền tố.** Lưu `count` ở mỗi node, tăng lên dọc đường đi mỗi lần insert. Khi đó `countWordsWithPrefix(p)` chỉ tốn O(P) thay vì duyệt cả cây con. Nhớ gọi `search(word)` trước để chèn trùng không bị đếm hai lần.

**Trie nén (radix tree / Patricia trie).** Các chuỗi node chỉ có một con được gộp thành một cạnh mang cả chuỗi con. Thao tác giữ nguyên, số node ít hơn hẳn. Dùng trong bảng định tuyến IP, HTTP router và một số key-value store.

```text
standard trie                 radix tree (same words)
(root)                        (root)
 |- c - a - r* - t*            |- "ca" -+- "r"* - "t"*
 |        \- t*                |        +- "t"*
 \- d - o* - g*                \- "do"* - "g"*
```

**Trie nhị phân (bitwise trie).** Chèn các số theo từng bit, bắt đầu từ bit cao nhất; σ = 2. Bài "XOR lớn nhất của hai số trong mảng" trở thành O(n · B) với số B bit: với mỗi số, tham lam đi về phía bit ngược lại.

**Suffix trie.** Chèn mọi hậu tố (suffix) của một văn bản để mọi truy vấn chuỗi con trở thành truy vấn tiền tố (O(n²) node nếu làm ngây thơ; suffix tree/suffix array là dạng gọn).

---

## 11. Các bài phỏng vấn kinh điển

**Tìm từ có ký tự đại diện** (`.` khớp với bất kỳ chữ nào). Gặp `.` thì rẽ vào mọi node con — xấu nhất O(σ^L), nhưng từ điển thật cắt tỉa rất nhanh.

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

**Word Search II** (tìm mọi từ trong từ điển xuất hiện trên lưới chữ). Xây trie từ danh sách từ, rồi DFS từ mỗi ô đồng thời đi xuống trie. Dừng ngay khi đường đi hiện tại không còn là tiền tố — một lần đi trie thay cho việc tìm riêng từng từ trên lưới. Xoá từ đã tìm thấy (hoặc gỡ `isEnd`) để tránh trùng.

**Replace words / gốc từ ngắn nhất.** Với mỗi từ trong câu, đi xuống trie chứa các gốc từ và dừng ở node `isEnd` đầu tiên: O(L) mỗi từ.

**Tiền tố chung dài nhất của mọi chuỗi.** Chèn tất cả, rồi đi từ gốc chừng nào node còn đúng một con và không phải điểm kết thúc từ.

---

## Điểm cần nhớ khi phỏng vấn

- Trie lưu chuỗi dưới dạng **đường đi từ gốc tới node**; tiền tố chung dùng chung node. Mỗi node có **children** và cờ **`isEnd`**.
- `insert`, `search`, `startsWith` và `delete` đều **O(L)** theo độ dài chuỗi, **không phụ thuộc N**.
- `search` kiểm tra **có đường đi VÀ `isEnd`**; `startsWith` chỉ kiểm tra có đường đi.
- Hash một chuỗi cũng tốn O(L) — trie thắng ở **truy vấn tiền tố**, không phải ở tra cứu chính xác thuần tuý.
- Autocomplete = tìm node tiền tố + **DFS** cây con của nó: O(P + M).
- Đánh đổi: **tốn bộ nhớ** — O(S) node, tới O(S · σ) ô nếu children là mảng. Nhắc tới radix tree như cách khắc phục.
- Children dạng mảng 26 phần tử khi input chỉ có chữ thường; dùng `Map` cho văn bản tổng quát.
- Nghĩ tới trie khi gặp: autocomplete, kiểm tra chính tả, từ điển có ký tự đại diện, Word Search II, khớp tiền tố dài nhất, XOR lớn nhất (trie nhị phân).

## Tóm tắt

- Trie (cây tiền tố) đánh chỉ mục chuỗi theo từng ký tự; độ sâu node bằng độ dài tiền tố.
- `isEnd` phân biệt từ thật với tiền tố đơn thuần như `"ca"`.
- Insert/search/startsWith đi một đường duy nhất trong O(L); delete cắt tỉa các node không còn cần thiết.
- Autocomplete đi tới node tiền tố rồi gom các điểm kết thúc từ bằng DFS, ra đúng thứ tự từ điển khi các con được sort.
- So với hash set, trie tốn bộ nhớ hơn nhưng làm cho thao tác theo tiền tố trở nên rẻ.
- Biến thể: đếm tiền tố, radix tree nén, trie nhị phân cho XOR, suffix trie cho tìm chuỗi con.
