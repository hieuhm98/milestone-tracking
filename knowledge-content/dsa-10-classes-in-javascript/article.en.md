# Classes in JavaScript – The Blueprint for Data Structures

## 1. Why data structures

A **data structure** is a collection of values, the **relationships** among them, and the **operations** that can be applied to that data. An array relates values by position; a linked list relates them by `next` pointers; a tree relates them as parent and child; a graph lets anything connect to anything.

There is **no single "best" data structure**. Each one makes some operations cheap by making others expensive:

| Need | Good fit | Why |
|---|---|---|
| Map or location data, networks | Graph | Arbitrary connections between places |
| Ordered list with fast inserts/removals at both ends | Linked list | O(1) at the head/tail, no shifting |
| Nested HTML, file systems | Tree | Naturally hierarchical |
| A scheduler that always runs the most urgent job | Binary heap | O(log n) insert and extract-max |
| Lookup by key | Hash table | O(1) average access |

You already use several of these without noticing (the DOM is a tree, the call stack is a stack), and interviewers expect you to pick the right one and justify it with Big O. JavaScript only ships a few built-ins (`Array`, `Object`, `Map`, `Set`), so for the rest of this course we **build our own** — and the tool we build them with is the **class**.

---

## 2. What a class is (and what JavaScript really does)

A **class** is a **blueprint for creating objects** with pre-defined properties and methods. Every object created from it is called an **instance**.

Does JavaScript really have classes? Not in the way Java or C++ do. JavaScript is **prototype-based**: objects inherit directly from other objects. The ES2015 `class` keyword is mostly **syntactic sugar** over constructor functions and prototypes:

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

"Mostly" sugar, because classes add real rules: the body always runs in **strict mode**, methods are non-enumerable, and a class **cannot be called without `new`**.

---

## 3. Class syntax and the constructor

```js
class Student {
  constructor(firstName, lastName) {
    this.firstName = firstName;
    this.lastName = lastName;
  }
}
```

Rules to get right:

- The method that initialises a new object **must be named `constructor`**. A method called `init` or `Student` is just an ordinary method and never runs automatically.
- A class has **at most one** `constructor`; two is a `SyntaxError`. If you omit it, JavaScript supplies an empty one.
- The syntax is `class Name { … }` — **no parentheses** after the name. `class DataStructure() {` is a syntax error.
- Methods are **not separated by commas** (unlike an object literal).
- A class declaration is hoisted but stays in the **temporal dead zone**: using it before its line throws a `ReferenceError`. Declaring the same class name twice in a scope is a `SyntaxError`, and inside the class body its own name is a constant.

---

## 4. Creating instances with `new`

```js
const firstStudent = new Student("Ada", "Lovelace");
const secondStudent = new Student("Alan", "Turing");

console.log(firstStudent.firstName); // "Ada"
```

`new Student(...)` performs four steps:

1. Create a brand-new empty object.
2. Link that object's prototype to `Student.prototype`.
3. Run `constructor` with `this` pointing at the new object, so `this.firstName = …` sets properties on it.
4. Return the object (unless the constructor explicitly returns a different object).

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

Each instance holds its **own data**; the **methods are shared**. Calling `Student("Ada", "Lovelace")` without `new` throws `TypeError: Class constructor Student cannot be invoked without 'new'`. Creating an instance is O(1) time and O(1) space as long as the constructor does constant work.

---

## 5. Instance methods

An **instance method** is defined in the class body and is available on every instance:

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

Instance methods live **once** on `Student.prototype`, so `firstStudent.fullName === secondStudent.fullName` is `true`. A thousand instances cost a thousand sets of data but only one copy of each method.

The cost of **calling** a method is simply the cost of the work inside it: `addScore` is O(1) amortised, while `average` is O(n) in the number of scores. In data-structure classes, the constructor sets up default properties and instance methods are the operations — `push`, `pop`, `insert`, `find` — whose Big O we analyse.

---

## 6. Static methods and properties

A **static** member belongs to the **class itself**, not to instances. Use it for utilities that are related to the class but do not need a particular instance:

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

Notes:

- Call static methods on the class: `Student.enrollStudents(...)`. Instances do not see them.
- Inside a static method, `this` is the class (when called as `Student.method()`).
- Watch rest parameters: `enrollStudents([a, b])` passes **one** argument, so `students` becomes `[[a, b]]`. Spread it instead: `enrollStudents(...list)`.
- Built-in examples: `Array.from`, `Array.isArray`, `Object.keys`, `Number.isInteger`.

In data-structure code static methods are rare — occasionally a factory such as `static fromArray(arr)` that builds a list in O(n). Constructors and instance methods do almost all the work.

---

## 7. The `this` gotcha

Inside the constructor and instance methods, `this` refers to **the instance the method was called on**. The catch: `this` is decided by **how** a function is called, not where it was written.

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

Once a method is detached from its object, it is called as a plain function. Class bodies are strict mode, so `this` becomes `undefined` (not `window`) and reading `this.count` throws.

Other ways `this` gets lost in DS code:

- Passing a method as a callback: `nodes.forEach(this.visit)` — use `nodes.forEach((n) => this.visit(n))`.
- Writing a nested `function () {}` inside a method — it has its own `this`. Arrow functions do **not** have their own `this`; they use the enclosing method's.

---

## 8. Fields, private fields and getters

Modern JavaScript (ES2022) lets you declare properties directly in the class body:

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

| Syntax | Meaning |
|---|---|
| `count = 0;` | Public instance field, created per instance before the constructor body runs |
| `#items = [];` | Private field; only code inside the class can read or write it |
| `get size() {}` | Computed property, read as `stack.size` |
| `static count = 0;` | Field on the class itself |

**Arrow functions as fields** (`increment = () => { … }`) keep `this` bound, but they create a **new function object for every instance**. For one `Counter` that is fine; for a linked list with a million nodes it is a million extra functions — O(n) extra memory where a prototype method costs O(1). Prefer normal methods in data-structure classes.

---

## 9. Abstraction and encapsulation

These object-oriented terms describe why wrapping a data structure in a class is worth it.

**Abstraction** — expose *what* an object does and hide *how*. Users of a `Stack` call `push`, `pop` and `peek`; they do not care whether it is backed by an array or a linked list. You can swap the implementation without changing any calling code.

**Encapsulation** — bundle data with the methods that operate on it, and protect the internal state so it can only change through those methods. It keeps **invariants** true:

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

Both operations are O(1) — no `shift()` re-indexing. Because `#head` and `#tail` are private, nobody outside can set them to nonsense and break `size`. In an interview a plain `this.length` is usually fine, but be ready to explain which fields form the invariant (for a list: `head`, `tail` and `length` must always agree).

---

## 10. Inheritance and polymorphism

**Inheritance** lets one class extend another with `extends`; `super` calls the parent:

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

In a derived class, touching `this` before `super()` throws a `ReferenceError`.

**Polymorphism** — different classes respond to the **same method call** in their own way. If an `ArrayQueue` also has `add` and `remove` (removing from the front), one function works with both:

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

JavaScript does not even require a shared parent: any object with `isEmpty` and `remove` works (**duck typing**). In DS code, inheritance appears occasionally (a `MinHeap` and `MaxHeap` sharing helpers, a `PriorityQueue` built on a heap), but **composition** — a class that holds another structure — is more common.

---

## 11. The blueprint for every data structure in this course

Nearly every structure ahead follows the same two-class pattern: a small **node** class holding a value plus links, and a **container** class holding entry points and a size.

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

`push` is O(1) time and O(1) space because the `tail` pointer avoids walking the list. Storing `length` as a field makes size O(1); counting nodes on demand would be O(n). The same shape reappears as `TreeNode { value, left, right }` with a `BinarySearchTree { root }`, and as a `Graph { adjacencyList }`.

---

## 12. Common pitfalls and costs

| Pitfall | Symptom | Fix |
|---|---|---|
| Forgetting `this.` inside a method (`head = node`) | `ReferenceError: head is not defined` (strict mode) | Always write `this.head` |
| Detaching a method (`const f = list.push`) | `this` is `undefined` | Arrow wrapper or `bind` |
| Calling a static method on an instance | `… is not a function` | Call it on the class |
| Arrow-function fields on many nodes | One function per instance, O(n) memory | Prototype methods |
| Returning nothing from a chained method | `undefined.push` on the second call | `return this` |
| Forgetting to update `length`/`tail` | Size and pointers drift apart | Update every field of the invariant in every method |

Big O reminders for classes: creating an instance with a constant-work constructor is O(1); each instance costs memory for its own fields; methods on the prototype are shared; and a method's complexity is whatever its body does.

---

## Key interview points

- A data structure = values + relationships + operations; **no structure is best at everything** — pick by the operations you need most.
- A JS `class` is a blueprint and mostly **sugar over prototypes**; `typeof` a class is `"function"`.
- `new` creates an object linked to `Class.prototype`, runs `constructor` with `this` set to it, and returns it.
- **Instance methods** are shared on the prototype; **static** methods live on the class and are called as `Class.method()`.
- `this` depends on **how** a method is called; detached methods lose it — fix with an arrow wrapper or `bind`.
- **Abstraction** hides how; **encapsulation** protects state (`#private` fields) and keeps invariants like `head`/`tail`/`length` consistent.
- **Polymorphism**: same method name, different behaviour (a stack and a queue both `remove`).
- DS pattern: a `Node` class plus a container with pointers and `length`; `return this` for chaining; store the size to keep it O(1).

## Summary

- Different data structures excel at different operations, so we implement many of them — as classes.
- Class syntax: `class Name { constructor() {} method() {} static util() {} }`, created with `new`.
- Instances hold their own data; methods live once on the prototype.
- `this` inside the constructor and instance methods is the instance, but only when the method is called on it.
- Fields, `#private` fields and getters make encapsulation explicit; avoid per-instance arrow functions in node classes.
- Inheritance (`extends`/`super`) and polymorphism exist, but DS code mostly uses a constructor plus instance methods.
