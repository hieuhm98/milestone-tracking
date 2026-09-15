# Class trong JavaScript – Bản thiết kế cho cấu trúc dữ liệu

## 1. Vì sao cần cấu trúc dữ liệu

**Cấu trúc dữ liệu** (data structure) là một tập hợp các giá trị, **mối quan hệ** giữa chúng, và các **thao tác** có thể áp dụng lên dữ liệu đó. Array liên kết các giá trị theo vị trí; linked list liên kết chúng bằng con trỏ `next`; tree liên kết theo quan hệ cha – con; graph cho phép bất cứ thứ gì nối với bất cứ thứ gì.

**Không có cấu trúc dữ liệu nào "tốt nhất"**. Mỗi cấu trúc làm cho một số thao tác rẻ đi bằng cách khiến thao tác khác đắt lên:

| Nhu cầu | Lựa chọn phù hợp | Vì sao |
|---|---|---|
| Dữ liệu bản đồ, vị trí, mạng lưới | Graph | Kết nối tuỳ ý giữa các điểm |
| Danh sách có thứ tự, thêm/xoá nhanh ở hai đầu | Linked list | O(1) ở head/tail, không phải dịch phần tử |
| HTML lồng nhau, hệ thống file | Tree | Dữ liệu vốn có dạng phân cấp |
| Bộ lập lịch luôn chạy việc gấp nhất trước | Binary heap | Chèn và lấy phần tử lớn nhất O(log n) |
| Tra cứu theo key | Hash table | Truy cập trung bình O(1) |

Bạn đã dùng nhiều cấu trúc trong số này mà không để ý (DOM là một tree, call stack là một stack), và người phỏng vấn mong bạn chọn đúng cấu trúc rồi giải thích bằng Big O. JavaScript chỉ có sẵn vài built-in (`Array`, `Object`, `Map`, `Set`), nên trong phần còn lại của khoá học ta sẽ **tự xây dựng** — và công cụ để xây chính là **class**.

---

## 2. Class là gì (và JavaScript thực sự làm gì)

**Class** là một **bản thiết kế (blueprint) để tạo object** với các thuộc tính và phương thức định sẵn. Mỗi object được tạo ra từ class gọi là một **instance** (thể hiện).

JavaScript có thật sự có class không? Không theo kiểu Java hay C++. JavaScript dựa trên **prototype**: object kế thừa trực tiếp từ object khác. Từ khoá `class` của ES2015 phần lớn chỉ là **syntactic sugar** (cú pháp "bọc đường") phủ lên constructor function và prototype:

```js
// Before ES2015: constructor function + prototype
function StudentOld(firstName, lastName) {
  this.firstName = firstName;
  this.lastName = lastName;
}

StudentOld.prototype.fullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

// ES2015: the same idea, cleaner syntax
class Student {
  constructor(firstName, lastName) {
    this.firstName = firstName;
    this.lastName = lastName;
  }

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

console.log(typeof Student); // "function"
```

Nói "phần lớn" là vì class có thêm những quy tắc thật sự: thân class luôn chạy ở **strict mode**, các method không enumerable, và class **không thể được gọi mà thiếu `new`**.

---

## 3. Cú pháp class và constructor

```js
class Student {
  constructor(firstName, lastName) {
    this.firstName = firstName;
    this.lastName = lastName;
  }
}
```

Các quy tắc cần nắm chắc:

- Method khởi tạo object mới **bắt buộc phải tên là `constructor`**. Một method tên `init` hay `Student` chỉ là method bình thường và không bao giờ tự chạy.
- Một class có **tối đa một** `constructor`; viết hai cái là `SyntaxError`. Nếu bỏ qua, JavaScript tự thêm một constructor rỗng.
- Cú pháp là `class Name { … }` — **không có dấu ngoặc tròn** sau tên. `class DataStructure() {` là lỗi cú pháp.
- Các method **không ngăn cách bằng dấu phẩy** (khác với object literal).
- Khai báo class được hoisting nhưng nằm trong **temporal dead zone**: dùng nó trước dòng khai báo sẽ ném `ReferenceError`. Khai báo trùng tên class hai lần trong cùng scope là `SyntaxError`, và bên trong thân class thì tên của chính nó là hằng.

---

## 4. Tạo instance bằng `new`

```js
const firstStudent = new Student("Ada", "Lovelace");
const secondStudent = new Student("Alan", "Turing");

console.log(firstStudent.firstName); // "Ada"
```

`new Student(...)` thực hiện bốn bước:

1. Tạo một object rỗng hoàn toàn mới.
2. Nối prototype của object đó tới `Student.prototype`.
3. Chạy `constructor` với `this` trỏ vào object mới, nên `this.firstName = …` gán thuộc tính lên chính nó.
4. Trả về object đó (trừ khi constructor chủ động return một object khác).

```text
firstStudent                      Student.prototype
+----------------------+          +--------------------+
| firstName: "Ada"     |  proto   | constructor        |
| lastName: "Lovelace" | -------> | fullName()         |
+----------------------+    +---> +--------------------+
                            |
secondStudent               |
+----------------------+    |
| firstName: "Alan"    |  proto
| lastName: "Turing"   | ---+
+----------------------+
```

Mỗi instance giữ **dữ liệu riêng**; còn **method thì dùng chung**. Gọi `Student("Ada", "Lovelace")` mà thiếu `new` sẽ ném `TypeError: Class constructor Student cannot be invoked without 'new'`. Tạo một instance tốn O(1) thời gian và O(1) bộ nhớ, miễn là constructor chỉ làm lượng việc hằng số.

---

## 5. Instance method

**Instance method** (phương thức của instance) được định nghĩa trong thân class và dùng được trên mọi instance:

```js
class Student {
  constructor(firstName, lastName) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.scores = [];
  }

  fullName() {
    return `Your full name is ${this.firstName} ${this.lastName}`;
  }

  addScore(score) {
    this.scores.push(score);

    return this.scores;
  }

  average() {
    if (this.scores.length === 0) return 0;

    const sum = this.scores.reduce((a, b) => a + b, 0);

    return sum / this.scores.length;
  }
}

const s = new Student("Ada", "Lovelace");
s.addScore(90);
s.addScore(80);
console.log(s.average()); // 85
```

Instance method chỉ tồn tại **một lần** trên `Student.prototype`, nên `firstStudent.fullName === secondStudent.fullName` là `true`. Một nghìn instance tốn một nghìn bộ dữ liệu nhưng chỉ một bản sao của mỗi method.

Chi phí khi **gọi** một method đơn giản là chi phí của phần việc bên trong: `addScore` là O(1) amortized, còn `average` là O(n) theo số điểm. Trong các class cấu trúc dữ liệu, constructor thiết lập thuộc tính mặc định, còn instance method chính là các thao tác — `push`, `pop`, `insert`, `find` — mà ta phân tích Big O.

---

## 6. Static method và static property

Thành viên **static** thuộc về **chính class**, không thuộc về instance. Dùng nó cho những tiện ích liên quan tới class nhưng không cần một instance cụ thể:

```js
class Student {
  static count = 0;

  constructor(firstName, lastName) {
    this.firstName = firstName;
    this.lastName = lastName;
    Student.count++;
  }

  static enrollStudents(...students) {
    // `this` here is the Student class itself
    return students.map((s) => `${s.firstName} enrolled (${this.count} total)`);
  }
}

const a = new Student("Ada", "Lovelace");
const b = new Student("Alan", "Turing");

Student.enrollStudents(a, b); // two strings
// a.enrollStudents(b);        // TypeError: a.enrollStudents is not a function
```

Lưu ý:

- Gọi static method trên class: `Student.enrollStudents(...)`. Instance không nhìn thấy nó.
- Bên trong static method, `this` là chính class (khi gọi dạng `Student.method()`).
- Cẩn thận với rest parameter: `enrollStudents([a, b])` truyền **một** đối số, nên `students` thành `[[a, b]]`. Hãy spread: `enrollStudents(...list)`.
- Ví dụ built-in: `Array.from`, `Array.isArray`, `Object.keys`, `Number.isInteger`.

Trong code cấu trúc dữ liệu, static method hiếm khi xuất hiện — thỉnh thoảng là một factory như `static fromArray(arr)` dựng list trong O(n). Constructor và instance method gánh gần như toàn bộ công việc.

---

## 7. Cái bẫy của `this`

Bên trong constructor và instance method, `this` là **instance mà method được gọi trên đó**. Điểm mấu chốt: `this` được quyết định bởi **cách** hàm được gọi, không phải nơi hàm được viết.

```js
class Counter {
  constructor() {
    this.count = 0;
  }

  increment() {
    this.count++;

    return this.count;
  }
}

const counter = new Counter();
counter.increment();          // 1 — called on counter, so this === counter

const inc = counter.increment;
// inc();                     // TypeError: Cannot read properties of undefined

// setTimeout(counter.increment, 100);  // same problem: this is lost
setTimeout(() => counter.increment(), 100);   // fix 1: arrow wrapper
setTimeout(counter.increment.bind(counter), 100); // fix 2: bind
```

Khi method bị tách khỏi object, nó được gọi như một hàm thường. Thân class chạy strict mode nên `this` thành `undefined` (không phải `window`), và việc đọc `this.count` sẽ ném lỗi.

Những cách khác làm mất `this` trong code cấu trúc dữ liệu:

- Truyền method làm callback: `nodes.forEach(this.visit)` — hãy viết `nodes.forEach((n) => this.visit(n))`.
- Viết một `function () {}` lồng bên trong method — nó có `this` riêng. Arrow function thì **không** có `this` riêng; nó dùng `this` của method bao ngoài.

---

## 8. Field, private field và getter

JavaScript hiện đại (ES2022) cho phép khai báo thuộc tính ngay trong thân class:

```js
class Stack {
  #items = [];          // private field: invisible outside the class

  push(value) {
    this.#items.push(value);

    return this;
  }

  pop() {
    return this.#items.pop();
  }

  peek() {
    return this.#items[this.#items.length - 1];
  }

  get size() {          // getter: read like a property
    return this.#items.length;
  }
}

const stack = new Stack();
stack.push(1).push(2);   // returning this allows chaining
console.log(stack.size); // 2 — no parentheses
// stack.#items;         // SyntaxError: private field outside its class
```

| Cú pháp | Ý nghĩa |
|---|---|
| `count = 0;` | Public instance field, tạo riêng cho từng instance trước khi thân constructor chạy |
| `#items = [];` | Private field; chỉ code bên trong class mới đọc/ghi được |
| `get size() {}` | Thuộc tính tính toán, đọc bằng `stack.size` |
| `static count = 0;` | Field nằm trên chính class |

**Arrow function làm field** (`increment = () => { … }`) giữ được `this`, nhưng nó tạo **một function object mới cho mỗi instance**. Với một `Counter` thì không sao; với linked list một triệu node thì là thêm một triệu function — O(n) bộ nhớ phụ, trong khi method trên prototype chỉ tốn O(1). Trong class cấu trúc dữ liệu, hãy ưu tiên method thường.

---

## 9. Trừu tượng hoá và đóng gói

Các thuật ngữ hướng đối tượng này giải thích vì sao bọc một cấu trúc dữ liệu trong class là đáng làm.

**Trừu tượng hoá** (abstraction) — công khai object *làm gì* và giấu *làm thế nào*. Người dùng `Stack` gọi `push`, `pop`, `peek`; họ không quan tâm bên dưới là array hay linked list. Bạn có thể thay cách cài đặt mà không phải sửa code gọi.

**Đóng gói** (encapsulation) — gom dữ liệu cùng các method thao tác trên nó, và bảo vệ trạng thái bên trong để nó chỉ thay đổi qua các method đó. Nhờ vậy các **bất biến** (invariant) luôn đúng:

```js
class Queue {
  #items = {};
  #head = 0;
  #tail = 0;

  enqueue(value) {
    this.#items[this.#tail] = value;
    this.#tail++;
  }

  dequeue() {
    if (this.#head === this.#tail) return undefined;

    const value = this.#items[this.#head];
    delete this.#items[this.#head];
    this.#head++;

    return value;
  }

  get size() {
    return this.#tail - this.#head;
  }
}
```

Cả hai thao tác đều O(1) — không có chuyện `shift()` đánh lại index. Vì `#head` và `#tail` là private, không ai bên ngoài gán bậy được để làm hỏng `size`. Trong phỏng vấn, dùng `this.length` thường là đủ, nhưng hãy sẵn sàng giải thích những field nào tạo nên bất biến (với list: `head`, `tail` và `length` phải luôn khớp nhau).

---

## 10. Kế thừa và đa hình

**Kế thừa** (inheritance) cho một class mở rộng class khác bằng `extends`; `super` gọi tới class cha:

```js
class Collection {
  constructor() {
    this.length = 0;
  }

  isEmpty() {
    return this.length === 0;
  }
}

class ArrayStack extends Collection {
  constructor() {
    super();              // must run before `this` is used
    this.items = [];
  }

  add(value) {
    this.items.push(value);
    this.length++;
  }

  remove() {
    if (this.isEmpty()) return undefined;

    this.length--;

    return this.items.pop();
  }
}
```

```text
new ArrayStack() --proto--> ArrayStack.prototype --proto--> Collection.prototype --proto--> Object.prototype
                            add(), remove()                 isEmpty()
```

Trong class con, đụng tới `this` trước khi gọi `super()` sẽ ném `ReferenceError`.

**Đa hình** (polymorphism) — các class khác nhau phản ứng theo cách riêng với **cùng một lời gọi method**. Nếu một `ArrayQueue` cũng có `add` và `remove` (lấy ra từ đầu), một hàm duy nhất dùng được cho cả hai:

```js
function drain(collection) {
  const out = [];

  while (!collection.isEmpty()) {
    out.push(collection.remove());
  }

  return out;
}
// Stack after add(1), add(2): drain -> [2, 1]  (LIFO)
// Queue after add(1), add(2): drain -> [1, 2]  (FIFO)
```

JavaScript thậm chí không cần class cha chung: object nào có `isEmpty` và `remove` đều dùng được (**duck typing**). Trong code cấu trúc dữ liệu, kế thừa thỉnh thoảng xuất hiện (`MinHeap` và `MaxHeap` dùng chung helper, `PriorityQueue` xây trên heap), nhưng **composition** (kết hợp — một class chứa cấu trúc khác bên trong) phổ biến hơn.

---

## 11. Bản thiết kế chung cho mọi cấu trúc dữ liệu trong khoá học

Gần như mọi cấu trúc phía trước đều theo cùng khuôn hai class: một class **node** nhỏ giữ giá trị kèm liên kết, và một class **container** giữ các điểm vào và kích thước.

```js
class Node {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

class SinglyLinkedList {
  constructor() {
    this.head = null;     // what default properties should it have?
    this.tail = null;
    this.length = 0;
  }

  push(val) {             // what should every instance be able to do?
    const node = new Node(val);

    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }

    this.length++;

    return this;
  }
}

const list = new SinglyLinkedList().push("A").push("B").push("C");
```

```text
list
+--------------+
| head  -------+--> [ "A" | next ] --> [ "B" | next ] --> [ "C" | null ]
| tail  -------+-------------------------------------------^
| length: 3    |
+--------------+
```

`push` tốn O(1) thời gian và O(1) bộ nhớ vì con trỏ `tail` giúp khỏi phải duyệt list. Lưu `length` thành field giúp lấy kích thước trong O(1); đếm node mỗi lần cần sẽ là O(n). Khuôn này lặp lại ở `TreeNode { value, left, right }` cùng `BinarySearchTree { root }`, và ở `Graph { adjacencyList }`.

---

## 12. Lỗi thường gặp và chi phí

| Lỗi | Triệu chứng | Cách sửa |
|---|---|---|
| Quên `this.` trong method (`head = node`) | `ReferenceError: head is not defined` (strict mode) | Luôn viết `this.head` |
| Tách method ra (`const f = list.push`) | `this` là `undefined` | Arrow wrapper hoặc `bind` |
| Gọi static method trên instance | `… is not a function` | Gọi trên class |
| Arrow function field trên rất nhiều node | Mỗi instance một function, O(n) bộ nhớ | Method trên prototype |
| Method dùng để chain mà không return | `undefined.push` ở lần gọi thứ hai | `return this` |
| Quên cập nhật `length`/`tail` | Kích thước và con trỏ lệch nhau | Cập nhật mọi field của bất biến trong mọi method |

Nhắc lại Big O với class: tạo instance với constructor làm việc hằng số là O(1); mỗi instance tốn bộ nhớ cho field riêng của nó; method trên prototype được dùng chung; và độ phức tạp của một method là độ phức tạp của phần thân nó.

---

## Điểm cần nhớ khi phỏng vấn

- Cấu trúc dữ liệu = giá trị + quan hệ + thao tác; **không cấu trúc nào giỏi mọi thứ** — chọn theo thao tác bạn cần nhiều nhất.
- `class` trong JS là bản thiết kế và phần lớn là **sugar phủ lên prototype**; `typeof` một class là `"function"`.
- `new` tạo object nối tới `Class.prototype`, chạy `constructor` với `this` là object đó, rồi trả nó về.
- **Instance method** dùng chung trên prototype; **static method** nằm trên class và gọi dạng `Class.method()`.
- `this` phụ thuộc vào **cách** gọi method; method bị tách ra sẽ mất `this` — sửa bằng arrow wrapper hoặc `bind`.
- **Abstraction** giấu cách làm; **encapsulation** bảo vệ trạng thái (`#private` field) và giữ bất biến như `head`/`tail`/`length` nhất quán.
- **Polymorphism**: cùng tên method, hành vi khác nhau (stack và queue đều có `remove`).
- Khuôn cấu trúc dữ liệu: class `Node` cộng một container có con trỏ và `length`; `return this` để chain; lưu sẵn kích thước để giữ O(1).

## Tóm tắt

- Mỗi cấu trúc dữ liệu giỏi một kiểu thao tác khác nhau, nên ta cài đặt nhiều cấu trúc — dưới dạng class.
- Cú pháp class: `class Name { constructor() {} method() {} static util() {} }`, tạo instance bằng `new`.
- Instance giữ dữ liệu riêng; method nằm một lần trên prototype.
- `this` trong constructor và instance method là instance, nhưng chỉ khi method được gọi trên chính instance đó.
- Field, `#private` field và getter giúp đóng gói rõ ràng; tránh arrow function theo từng instance trong class node.
- Kế thừa (`extends`/`super`) và đa hình có tồn tại, nhưng code cấu trúc dữ liệu chủ yếu dùng constructor cộng instance method.
