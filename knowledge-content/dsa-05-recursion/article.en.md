# Recursion – Functions That Call Themselves

## 1. What is recursion?

A **recursive function** is a function that calls itself. Instead of solving the whole problem at once, it solves a tiny piece and hands a **smaller version of the same problem** to another call of itself.

A short story shows the idea. Martin asks a dragon: "Are any of the numbers in `[3142, 5798, 6550, 5914]` odd?" The dragon will only answer one question: *"is the first number in a list odd?"* So Martin asks about the first number (no), then about the list without it `[5798, 6550, 5914]` (no), and so on, until he reaches an empty list. An empty list has no odd numbers, so every longer list he asked about has none either. Martin just used recursion: shrink the problem, stop at a trivial case, and build the answer on the way back.

Recursion is everywhere in real code:

- `JSON.parse` / `JSON.stringify` walking nested objects.
- DOM traversal (`document.getElementById`, visiting child nodes).
- Trees and graphs (DFS), merge sort, quick sort, backtracking.
- Any **self-similar** data: folders inside folders, comments with replies, nested arrays.

For such problems recursion is often a cleaner alternative to a loop.

---

## 2. The call stack

To understand recursion you must understand the **call stack**, the structure the JavaScript engine uses to track which functions are running.

- Calling a function **pushes** a frame (its arguments, local variables and where to resume) onto the top of the stack.
- When a function hits `return` (or its closing brace), its frame is **popped**, and execution resumes in the frame below.
- It is a **stack**: last in, first out (LIFO). Only the top frame is running; every frame below is paused, waiting.

```js
function takeShower() {
  return 'Showering!';
}

function eatBreakfast() {
  const meal = cookFood();

  return `Eating ${meal}`;
}

function cookFood() {
  const items = ['Oatmeal', 'Eggs', 'Protein Shake'];

  return items[Math.floor(Math.random() * items.length)];
}

function wakeUp() {
  takeShower();
  eatBreakfast();
  console.log('Ok ready to go to work!');
}

wakeUp();
```

```text
time ->
                        cookFood
          takeShower    eatBreakfast  eatBreakfast
wakeUp    wakeUp        wakeUp        wakeUp        wakeUp       (empty)
```

With normal functions, frames are pushed and popped quickly. With recursion, **the same function keeps pushing new frames** until something tells it to stop. You can watch this live in the Sources panel of Chrome DevTools: set a breakpoint inside a recursive function and read the "Call Stack" list.

---

## 3. The two essential parts: base case and different input

Every correct recursive function needs:

1. **A base case**, the condition where the recursion **ends** and returns without calling itself again. This is the single most important idea.
2. **A different input** on each call, one that moves **towards** the base case.

Forget either and the function never stops.

```js
// Iterative version
function countDownLoop(num) {
  for (let i = num; i > 0; i--) {
    console.log(i);
  }

  console.log('All done!');
}

// Recursive version
function countDown(num) {
  if (num <= 0) {                // base case
    console.log('All done!');

    return;
  }

  console.log(num);
  countDown(num - 1);            // different input: num - 1
}

countDown(3); // 3, 2, 1, "All done!"
```

Note the base case uses `num <= 0`, not `num === 0`: a defensive base case also stops for inputs like `-5` or `2.5` that would jump past an exact match.

---

## 4. Returning values: the all-important `return`

`countDown` only prints. Most recursive functions **compute a value**, and each call must **return** its result to the caller below it on the stack.

```js
function sumRange(num) {
  if (num === 1) return 1;          // base case

  return num + sumRange(num - 1);   // combine current value with the smaller answer
}

sumRange(4); // 10
```

The frames cannot finish on the way *down*: `sumRange(4)` has to wait for `sumRange(3)`, which waits for `sumRange(2)`, and so on. The answers are built on the way back *up*:

```text
sumRange(4)                      (winding: pushing frames)
  = 4 + sumRange(3)
        = 3 + sumRange(2)
              = 2 + sumRange(1)
                    = 1          <- base case, start unwinding
              = 2 + 1 = 3
        = 3 + 3 = 6
  = 4 + 6 = 10                   (unwinding: popping frames)
```

If you wrote `num + sumRange(num - 1);` without `return`, every call except the base case would return `undefined`, and `sumRange(4)` would give `undefined` even though all the recursive calls ran.

---

## 5. Factorial and the stack, step by step

`n! = n × (n-1) × … × 1`. The recursive definition is `n! = n × (n-1)!` with `1! = 1` (and `0! = 1`).

```js
function factorial(num) {
  if (num <= 1) return 1;

  return num * factorial(num - 1);
}

factorial(5); // 120
```

The call stack at its deepest point during `factorial(5)`:

```text
+----------------+
| factorial(1)   |  <- top: base case, returns 1
| factorial(2)   |  waits, then returns 2 * 1 = 2
| factorial(3)   |  waits, then returns 3 * 2 = 6
| factorial(4)   |  waits, then returns 4 * 6 = 24
| factorial(5)   |  waits, then returns 5 * 24 = 120
+----------------+
```

Five frames are alive at once. That number, the **maximum recursion depth**, is exactly what determines a recursive function's memory use.

---

## 6. Where things go wrong

The three classic bugs:

**1. No base case, or a base case that is never reached.**

```js
function factorial(num) {
  if (num === 1) return 1;

  return num * factorial(num);   // BUG: input never changes
}
```

The input never gets smaller, so the base case is never reached. The same happens with a correct `num - 1` step but an unreachable check: `factorial(0)` with `if (num === 1)` goes 0, -1, -2, … forever.

**2. Forgetting to return, or returning the wrong thing.**

```js
function factorial(num) {
  if (num === 1) console.log(1); // BUG: logs instead of returning

  return num * factorial(num - 1);
}
```

The base case prints but does not stop, so the calls continue into negative numbers.

**3. Stack overflow.** Both bugs above end the same way. Every frame costs memory, and the engine caps the stack size (typically around ten thousand frames, depending on the engine and frame size). Exceed it and JavaScript throws:

```text
RangeError: Maximum call stack size exceeded
```

A stack overflow can also happen with **correct** code if the input is simply too deep, e.g. `sumRange(1_000_000)`. That is a signal to use a loop instead.

---

## 7. Big O of recursive functions

**Time:** count the **total number of calls**, multiplied by the **work done inside each call** (excluding the recursive calls themselves).

**Space:** the **maximum number of frames on the call stack at the same time** (the recursion depth), multiplied by the memory each frame holds, plus any data structures you build.

| Function | Calls | Work per call | Time | Max depth | Space |
|---|---|---|---|---|---|
| `countDown(n)` | n | O(1) | O(n) | n | O(n) |
| `sumRange(n)` / `factorial(n)` | n | O(1) | O(n) | n | O(n) |
| recursive binary search | log n | O(1) | O(log n) | log n | O(log n) |
| naive `fib(n)` | ~2ⁿ | O(1) | O(2ⁿ) | n | O(n) |

Note that `fib` has an exponential number of calls but only O(n) space: calls happen one branch at a time, so the stack never holds more than one root-to-leaf path. When a function makes **one** recursive call, draw a chain; when it makes **two or more**, draw a tree and count the nodes.

---

## 8. Helper method recursion

Sometimes you want to **collect** results across all calls. Declaring the array inside the recursive function would reset it on every call. The **helper method** pattern fixes this: an outer (non-recursive) function owns the state, and an inner recursive helper modifies it.

```js
function collectOddValues(arr) {
  const result = [];                     // lives in the outer scope

  function helper(helperInput) {
    if (helperInput.length === 0) return;

    if (helperInput[0] % 2 !== 0) {
      result.push(helperInput[0]);
    }

    helper(helperInput.slice(1));        // smaller input
  }

  helper(arr);

  return result;
}

collectOddValues([1, 2, 3, 4, 5]); // [1, 3, 5]
```

The closure gives every helper call access to the same `result`. The outer function is called once; only the helper recurses.

---

## 9. Pure recursion

**Pure recursion** keeps everything inside a single self-contained function: no outer variable. Each call returns its own piece, and the pieces are **combined on the way back up**.

```js
function collectOddValuesPure(arr) {
  let newArr = [];

  if (arr.length === 0) return newArr;

  if (arr[0] % 2 !== 0) {
    newArr.push(arr[0]);
  }

  newArr = newArr.concat(collectOddValuesPure(arr.slice(1)));

  return newArr;
}
```

```text
[1,2,3]  -> [1].concat( [2,3] result )
[2,3]    -> [ ].concat( [3] result )
[3]      -> [3].concat( [] result )
[]       -> []                          base case
unwind: [] -> [3] -> [3] -> [1,3]
```

Tips for writing pure recursion **without mutating the input**:

- **Arrays:** use `slice`, the spread operator `[...arr]` and `concat`, which return copies. Avoid `shift`, `splice`, `pop`, which change the caller's array.
- **Strings** are immutable, so use `slice`, `substring` (or the legacy `substr`) to get shorter copies.
- **Objects:** copy with `Object.assign({}, obj)` or `{ ...obj }`.

---

## 10. The hidden cost of copying

Those copies are not free. `arr.slice(1)` is O(n), and it runs once per call:

```text
call 1 copies n-1 items, call 2 copies n-2, ... => (n-1) + (n-2) + ... + 1 ≈ n²/2
```

So both `collectOddValues` versions above are **O(n²) time**, not O(n). They can also hold O(n²) memory, since every paused frame still references its own copy. The fix is to pass an **index** instead of a shorter array:

```js
function collectOdds(arr, i = 0, result = []) {
  if (i === arr.length) return result;

  if (arr[i] % 2 !== 0) {
    result.push(arr[i]);
  }

  return collectOdds(arr, i + 1, result);
}
// Time O(n), space O(n) for the call stack
```

The same trick applies to strings: compare `str[left]` and `str[right]` rather than slicing off characters.

---

## 11. Worked problems

**Power.** `power(2, 4) = 16`. Use `bᵉ = b × bᵉ⁻¹` and `b⁰ = 1`.

```js
function power(base, exponent) {
  if (exponent === 0) return 1;

  return base * power(base, exponent - 1);
}
// Time O(e), space O(e)
```

Halving the exponent is much faster: `bᵉ = (b^(e/2))²`.

```js
function fastPower(base, exponent) {
  if (exponent === 0) return 1;

  const half = fastPower(base, Math.floor(exponent / 2));

  return exponent % 2 === 0 ? half * half : half * half * base;
}
// Time O(log e), space O(log e)
```

**productOfArray.** The base case of a product is `1`, the multiplicative identity, so an empty array returns `1`, not `0`.

```js
function productOfArray(arr, i = 0) {
  if (i === arr.length) return 1;

  return arr[i] * productOfArray(arr, i + 1);
}

productOfArray([1, 2, 3, 10]); // 60, time O(n), space O(n)
```

**Flatten a nested array** is naturally recursive, because an element may itself be an array:

```js
function flatten(arr) {
  const result = [];

  function helper(items) {
    for (const item of items) {
      if (Array.isArray(item)) {
        helper(item);
      } else {
        result.push(item);
      }
    }
  }

  helper(arr);

  return result;
}

flatten([1, [2, [3, 4]], 5]); // [1, 2, 3, 4, 5]
// Time O(total elements), space O(n) output + O(d) stack, d = nesting depth
```

---

## 12. Recursion vs iteration and tail calls

Anything recursive can be written iteratively, either with a plain loop or with an **explicit stack** replacing the call stack.

| | Recursion | Iteration |
|---|---|---|
| Readability | Excellent for trees, nesting, divide & conquer | Excellent for simple linear passes |
| Memory | O(depth) stack frames | Often O(1) |
| Risk | Stack overflow on deep input | None from depth |
| Speed | Function-call overhead | Usually a bit faster |

A **tail call** is a call whose result is returned directly, with nothing left to do afterwards: `return collectOdds(arr, i + 1, result)` is one, while `return num * factorial(num - 1)` is not (the multiplication is still pending). ES2015 specifies **proper tail calls** in strict mode, letting such calls reuse the frame so the stack does not grow. In practice only Safari's engine (JavaScriptCore) implements it; V8 (Chrome, Node.js) and Firefox do not. **Do not rely on tail call optimization in production JavaScript**: if the depth can be large, convert to a loop.

```js
function sumRangeIterative(num) {
  let total = 0;

  while (num > 0) {
    total += num;
    num--;
  }

  return total;
}
// Time O(n), space O(1), no stack overflow
```

---

## Key interview points

- A recursive function needs a **base case** and a **different input that moves toward it**; say both out loud before coding.
- Always **`return`** the recursive result; a missing return silently yields `undefined`.
- Make the base case **defensive** (`<= 0`, `<= 1`, empty array) so unexpected inputs still stop.
- **Time** = number of calls × work per call; **space** = maximum recursion depth. One call per level is a chain; two or more is a tree.
- `slice`, `concat` and spread inside recursion are hidden O(n) copies; pass an **index** to stay O(n).
- **Helper method** recursion keeps shared state in an outer scope; **pure** recursion combines return values.
- Deep input → `RangeError: Maximum call stack size exceeded`. JavaScript engines mostly lack tail call optimization, so switch to a loop or explicit stack.

## Summary

- Recursion solves a problem by solving a smaller instance of the same problem until a trivial base case.
- Each call pushes a frame on the LIFO call stack; results are built while the stack unwinds.
- Common bugs: no or unreachable base case, unchanged input, missing return, all ending in stack overflow.
- Recursive complexity: count calls for time, measure maximum depth for space.
- Helper method recursion uses a closure for accumulated results; pure recursion copies inputs instead of mutating them, at a copying cost.
- Prefer iteration when depth may be large; tail call optimization is not something JavaScript can count on.
