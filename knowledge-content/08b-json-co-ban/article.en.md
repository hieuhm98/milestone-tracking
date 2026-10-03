# What is JSON?

## 1. What is JSON?

**JSON** (JavaScript Object Notation) is a **text format** for storing and exchanging data between systems. It is the most common format that APIs use to return data.

### The standard form analogy

Imagine every government office in the country invented its own form layout. Moving your details from one office to another would be chaos. Now imagine they all agree on one simple form: a label, a colon, the answer. Anyone — person or machine — can fill it in and read it.

JSON is that agreed form for computers. When a banking app asks the bank's server for your balance, the answer comes back as a short piece of JSON text such as `{ "balance": 1500000 }`. Your phone, the server and any other system all know how to read it.

"Text format" means JSON is plain characters — you can open it in Notepad (Windows) or TextEdit (macOS). It is not a program and it does nothing on its own; it only *describes* data. Despite the name, every programming language can read and write JSON, not just JavaScript.

**Why does a BA need to know JSON?**
- Read API results in Postman/Swagger to **test** a requirement.
- **Map** data fields between two systems when writing an integration spec.
- Write clear **acceptance criteria**: "the response must contain a `status` field equal to `confirmed`".

JSON is designed to be **human-readable** and **machine-processable** at the same time.

---

## 2. Basic syntax: key–value

JSON is built from pairs of **keys** and **values**:

```json
{ "name": "Nguyen Van A", "age": 25 }
```

- A **key** is always a string in double quotes `"..."`, sitting to the left of the `:`.
- A **value** is the data, sitting to the right of the `:`.
- Pairs are separated by commas `,`.

Read it like English: *"the name of this person is Nguyen Van A; the age is 25".*

Think of a contact card in your phone: "Name: Lan", "Phone: 0901…". The **key** is the printed label (Name), the **value** is what you filled in (Lan). The curly braces `{ }` are the edges of the card.

### Spaces and line breaks do not matter

These two are exactly the same data:

```json
{"name":"Nguyen Van A","age":25}
```

```json
{
  "name": "Nguyen Van A",
  "age": 25
}
```

Systems often send the first, squashed form (**minified**) to save space. Tools and documentation show the second (**pretty-printed**) form so humans can read it. Only spaces *inside* quotes are part of the data: `"Nguyen Van A"` keeps its spaces.

---

## 3. Value types

| Type | Example | Note |
|------|---------|------|
| String | `"Laptop Dell"` | Always in double quotes |
| Number | `25000000` | No quotes, no thousands separators |
| Boolean | `true` / `false` | True/false |
| Null | `null` | No value |
| Object | `{ ... }` | A nested object |
| Array | `[ ... ]` | A list |

**String** means text. **Boolean** is a yes/no switch, written in lowercase without quotes. **Null** means "deliberately empty".

### Quotes change the meaning

The same characters can be two different types:

| Written as | Type | What a program sees |
|------------|------|---------------------|
| `25` | Number | A quantity you can add up |
| `"25"` | String | Just the characters 2 and 5 |
| `false` | Boolean | The value "no" |
| `"false"` | String | A word that happens to spell false |

This matters. In many programming languages any non-empty text counts as "yes", so a program that checks `"active": "false"` may treat the account as **active**. A small pair of quotes can create a real bug.

> **Common misconception:** "A phone number is a number, so no quotes." Phone numbers, ID card numbers and postcodes should be **strings**: `"0901234567"`. As a number, the leading `0` would be dropped and the value would become `901234567`. Rule of thumb: if you never do arithmetic on it, make it a string.

### There is no date type

JSON has no special type for dates. Dates are sent as strings, usually in the international format year-month-day: `"2024-04-08"` or with a time, `"2024-04-08T14:30:00Z"`. The two systems must agree on the format — a classic item for a BA to pin down in a spec.

---

## 4. Object `{}` and Array `[]`

These are the two most important building blocks — telling them apart means you understand 90% of JSON.

- **Object `{}`** = an **object** made of several key–value pairs. Example: one product.
- **Array `[]`** = a **list** of values separated by commas. Example: a list of tags.

```json
{
  "id": 5,
  "name": "Laptop Dell XPS",
  "price": 25000000,
  "inStock": true,
  "tags": ["laptop", "dell", "premium"]
}
```

Here `tags` is an **array** containing 3 strings.

| | Object `{}` | Array `[]` |
|--|-------------|------------|
| Everyday picture | One filled-in form | A numbered list / a queue |
| Contents | Labelled values (`"name": ...`) | Values with no labels, only positions |
| How you find a value | By its key: `name` | By its position: `[0]`, `[1]`… |
| Typical use | One customer, one product | Many tags, many order lines |

A simple test: if you would describe it as "**the** customer", it is an object; if you would say "**the list of** customers", it is an array.

---

## 5. Nested data

A value can itself be an object. This is called a **nested object** (associative array).

Analogy: a folder on your computer can contain another folder, which contains files. JSON works the same way — a box inside a box.

```json
{
  "id": 5,
  "name": "Laptop Dell XPS",
  "specs": {
    "cpu": "Intel i7",
    "ram": "16GB",
    "storage": "512GB SSD"
  }
}
```

`specs` is not a single value — it is a child object holding detailed information.

**Reading tip:** follow the indentation. Everything indented under `"specs": {` belongs to `specs`, until the matching `}`. Every `{` must be closed by a `}` and every `[` by a `]`, like brackets in a maths formula.

Why nest at all? It groups related information. Instead of `specsCpu`, `specsRam` and `specsStorage` as three loose fields, the specs travel together as one unit.

---

## 6. An array of objects – a list of records

An extremely common case in API responses: an **array containing several objects**, where each object is one record (like a row in a data table).

```json
{
  "orderId": "ORD-20240408-001",
  "status": "confirmed",
  "total": 50500000,
  "customer": {
    "id": 5,
    "name": "Nguyen Van A",
    "phone": "0901234567"
  },
  "items": [
    { "productId": 5, "name": "Laptop Dell XPS", "quantity": 1, "price": 25000000 },
    { "productId": 8, "name": "Logitech Mouse",  "quantity": 2, "price": 500000 }
  ]
}
```

`items` is a list of 2 products in the order. Each element has the same set of keys.

If you put `items` into a spreadsheet, it would look like this — each object is a row, each key is a column:

| productId | name | quantity | price |
|-----------|------|----------|-------|
| 5 | Laptop Dell XPS | 1 | 25000000 |
| 8 | Logitech Mouse | 2 | 500000 |

This is the mental picture to keep: **array of objects = a table**. A list of orders, a list of transactions, search results — almost every list screen you see in an app is fed by an array of objects.

---

## 7. Reading a value by "path"

When a developer says *"grab `customer.name`"* or *"`items[0].price`"*, they are pointing out a path through the JSON. Using the example in section 6:

| Path | Value |
|------|-------|
| `status` | `"confirmed"` |
| `customer.name` | `"Nguyen Van A"` |
| `items` | a list of 2 products |
| `items[0].name` | `"Laptop Dell XPS"` (the **first** element) |
| `items[1].quantity` | `2` |

> ⚠️ Arrays are numbered from **0**, so the first element is `items[0]`, not `items[1]`.

### How to read a path, step by step

A path is like a street address read from big to small. Take `items[1].quantity`:

1. Start at the outer `{ }` of the whole response.
2. `items` → go to the key `items`. It is an array.
3. `[1]` → take the element at position 1, which is the **second** one (the mouse).
4. `.quantity` → inside that object, read the key `quantity` → `2`.

The dot `.` means "go inside this object"; square brackets `[n]` mean "take item number n from this list".

> **Try it yourself:** open `https://api.github.com/users/octocat` in your browser. Firefox shows a neat JSON viewer with collapsible sections; other browsers show the text, often with a "Pretty-print" option to tidy it. Find the key `login` (path: `login`) and the key `public_repos`. Is `public_repos` a number or a string? (Answer: a number — no quotes.)

---

## 8. JSON vs XML

Before JSON, **XML** was the common format. XML wraps every value in an opening and closing **tag**, like `<status>` … `</status>` — similar to how web pages are written. For the same order, XML is much more verbose:

```xml
<order>
  <status>confirmed</status>
  <total>50500000</total>
</order>
```

The same data in JSON:

```json
{ "status": "confirmed", "total": 50500000 }
```

Every field name appears twice in XML (open and close tag), and only once in JSON. Across thousands of records, that difference adds up.

| Criterion | JSON | XML |
|-----------|------|-----|
| Compactness | Concise | Long, many tags |
| Readability | Very easy | Harder |
| Popularity in new APIs | Very high | Declining |
| Still common in | Web, mobile, REST | Legacy systems, banking, SOAP |

**SOAP** is an older style of API built on XML, still found in banks, insurance and government systems. So a BA on an integration project may meet both formats. Neither is "wrong"; XML is simply older and wordier.

Most modern APIs return **JSON** by default. A big reason: JSON maps directly onto the lists and objects that programming languages already use, so little conversion is needed.

---

## 9. How does JSON travel through an API?

When JSON is sent inside a request or response, a **header** (a label attached to the message) says what format the body is in. APIs use the header **`Content-Type: application/json`** to say the body data is JSON. The client uses **`Accept: application/json`** to request that the server respond with JSON.

Analogy: `Content-Type` is the sticker on a parcel saying "contains documents in English". `Accept` is a note saying "please reply in English".

```text
POST /api/orders HTTP/1.1
Content-Type: application/json
Accept: application/json

{ "productId": 5, "quantity": 2 }
```

If the two sides don't agree on the format, the system will return an error. Typically the server answers `400 Bad Request` (it could not understand the body) or `415 Unsupported Media Type` (it does not accept that format).

> **Try it yourself:** open DevTools on any modern web app (Windows: `F12`; macOS: `Cmd+Option+I`), go to **Network → Fetch/XHR** and reload. Click a request. Under **Headers** look for `content-type: application/json`; the **Preview** or **Response** tab shows the JSON itself.

---

## 10. What does a BA use JSON for?

- **Mapping data fields**: system A returns `full_name`, system B needs `customerName` → the BA builds a mapping table.
- **Writing acceptance criteria**: "on a successful order, the response returns `status: confirmed` and a non-empty `orderId`".
- **Quick testing**: read a response in Postman to check whether all fields are present and correct.
- **Reviewing API docs**: compare the JSON examples in Swagger against the business requirements.

### What a mapping table looks like

| System A (CRM) | System B (Billing) | Rule |
|----------------|--------------------|------|
| `full_name` | `customerName` | Copy as is |
| `dob` | `birthDate` | Same date, format `YYYY-MM-DD` |
| `vip` (`"Y"`/`"N"`) | `isVip` (`true`/`false`) | `"Y"` → `true`, otherwise `false` |
| `discount` | `discountAmount` | If `null`, show "No discount" |

Notice the last two rows: different types and the meaning of `null` are exactly where integration bugs hide. Ask early: *"When this field is `null`, does it mean zero, unknown, or not applicable?"*

**Real work example:** a BA attaches a sample JSON payload to the spec. The developer immediately spots that the BA wrote `customer_phone` while the API uses `customer.phone`. Ten seconds with a concrete example saves a day of rework — a sample payload removes ambiguity faster than paragraphs of prose.

---

## 11. Common JSON mistakes

JSON is strict: one wrong character and the whole thing cannot be read (programmers say it fails to **parse**). Watch for:

- Missing double quotes around a key or string: `{ name: "A" }` ❌ → it must be `{ "name": "A" }` ✅.
- A **trailing comma** on the last element: `[1, 2, 3,]` ❌.
- Using single quotes `'` instead of double quotes `"`.
- Confusing an object `{}` with an array `[]`.
- Money with thousands separators: `25,000,000` ❌ → it must be `25000000`.
- A missing closing bracket: `{ "a": [1, 2 }` ❌ — the `[` was never closed.
- Comments: `// note` is not allowed inside standard JSON.

"Smart quotes" are a sneaky one: if you copy JSON from Word or an email, straight quotes `"` may turn into curly quotes `“ ”`, which JSON does not accept.

> 💡 Tip: paste JSON into a **JSON validator/formatter** to check it is valid and see the structure clearly.

> **Common misconception:** "Any online formatter is fine for work data." Real API responses often contain customer names, phone numbers or ID numbers. Do not paste them into public websites — use the formatter built into your company's tools (Postman, VS Code, the browser's DevTools) or remove personal data first.

---

## 12. Summary

- **JSON** = the most common data format in APIs, made of **key–value** pairs.
- **`{}`** = object (a single thing); **`[]`** = array (a list).
- Types matter: `25` ≠ `"25"`, `false` ≠ `"false"`; phone numbers are strings; dates are strings.
- Values can be **nested**: an object inside an object, an array of objects.
- An **array of objects** is a table: each object is a row.
- Read data by **path**: `customer.name`, `items[0].price` (arrays start at 0).
- **JSON is more compact than XML** and is the default for modern APIs.
- BAs use JSON to **map data, write acceptance criteria, and test** APIs.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| JSON | A plain-text "standard form" for data that people and programs can read |
| Key / value | The label and the filled-in answer, e.g. `"age": 25` |
| Object `{}` | One thing described by labelled fields |
| Array `[]` | An ordered list; positions start at 0 |
| Nested | A value that is itself an object or array |
| Path | Directions to one value, e.g. `items[1].quantity` |
| Parse | A program reading JSON text into data; fails if there is a syntax error |
| `Content-Type: application/json` | The header saying "this body is JSON" |
