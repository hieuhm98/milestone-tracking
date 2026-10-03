# How Does the Web Work?

## 1. Overview

When you type a web address into the browser and press Enter, a series of steps happen within a few hundred milliseconds to display the web page. Understanding this flow helps you communicate better with the technical team.

**Analogy:** visiting a website is like ordering food at a restaurant. You (the customer) look at the menu and place an order with the waiter. The kitchen, which you never see, prepares the dish and sends it back. You only ever see the plate on your table, but a lot happened behind the kitchen door.

### The three main characters

- **Browser** — the app you use to view websites: Chrome, Safari, Edge, Firefox. It is the customer who places the order and then "plates" the result on your screen. In technical talk it is called the **client**.
- **Server** — a computer, usually in a data centre, that is always switched on and waits for requests. It is the kitchen. "Server" also means the software running on that computer whose job is to answer requests.
- **Internet** — the roads connecting the two. Your request travels through your Wi-Fi, your Internet provider and many routers before reaching the server.

The browser and server talk using a set of agreed rules called **HTTP** (HyperText Transfer Protocol). One message from browser to server is a **request** ("please give me this page"); the reply is a **response** ("here it is", or "sorry, not found").

```text
 You            Browser (client)                         Server
  │  type URL  ──►  │                                        │
  │                 │ ──── HTTP request ──────────────────►  │
  │                 │                                        │ (works out
  │                 │ ◄─── HTTP response (HTML...) ────────  │  the answer)
  │  see page  ◄──  │                                        │
```

> **Common misconception:** "The website is on my computer." Not quite: the website lives on a server somewhere else. Your browser downloads a copy of the page each time you visit, then shows it to you.

---

## 2. URL Structure

A URL (Uniform Resource Locator) is the full address of a resource on the web:

```
https://shop.example.com:443/products/detail?id=123&lang=vi#reviews
│       │                │   │               │               │
│       │                │   │               query string    fragment
│       │                │   path
│       │                port (hidden if the default port is used)
│       subdomain.domain
scheme (protocol)
```

**Analogy:** a URL is like a complete postal address: which delivery service, which building, which apartment, and a note for the receiver.

- **Scheme**: `http` or `https` — the protocol used.
- **Host**: `shop.example.com` — the destination server.
- **Path**: `/products/detail` — the path to the resource.
- **Query String**: `?id=123&lang=vi` — filter/search parameters.
- **Fragment**: `#reviews` — a position within the page (handled by the browser).

A few beginner notes:

- A **resource** is anything the server can give you: a page, a picture, a PDF, a piece of data.
- **https** is the secure version of **http**: the conversation is encrypted so nobody on the way (for example on a café Wi-Fi) can read it. Browsers show a padlock or "Not secure" based on this.
- The **port** is like a door number on the server. `443` is the standard door for https and `80` for http, so browsers hide them.
- The query string is a list of `key=value` pairs joined by `&`. Here: `id` is `123` and `lang` is `vi`.
- The fragment is never sent to the server; the browser just scrolls to the part of the page called `reviews`.

The *Domain, URL & DNS* topic covers each part in much more depth.

---

## 3. The Flow When Visiting a Website

```
1. You type the URL and press Enter
2. The browser resolves DNS: domain → IP
3. The browser establishes a TCP connection (3-way handshake)
4. If HTTPS: add a TLS handshake step (encryption)
5. The browser sends an HTTP GET request to the server
6. The server receives the request, processes it, and returns an HTTP response
7. The browser receives the HTML
8. The browser parses the HTML → loads additional CSS, JS, images
9. The browser renders the page (draws it on the screen)
```

### Each step in plain words

1. **You type the URL and press Enter.** The browser first checks the address is valid. If you typed words that are not an address, it sends them to a search engine instead.
2. **DNS lookup.** Computers find each other by number (an **IP address**, e.g. `142.250.186.46`), not by name. The browser asks **DNS** — the Internet's phone book — "what number is `shop.example.com`?". Recent answers are remembered (cached), so this is often instant.
3. **TCP connection.** Before talking, the two sides open a reliable line. The **3-way handshake** is like a phone call opening: "Can you hear me?" — "Yes, can you hear me?" — "Yes." (technically the messages are named SYN, SYN-ACK, ACK). **TCP** guarantees that every piece arrives, in order.
4. **TLS handshake (HTTPS only).** The browser and server agree on secret keys and the server proves its identity with a **certificate**. From now on everything is encrypted. This is where the padlock comes from.
5. **HTTP GET request.** The browser sends a short text message such as `GET /products/detail?id=123`. **GET** means "give me"; another common method, **POST**, means "here is some data" (for example a submitted form).
6. **The server does its work.** It may simply pick a ready-made file, or run code, read a database and build a page just for you (see section 5). Then it sends back a response with a **status code** such as `200 OK` or `404 Not Found` (section 8).
7. **The browser receives the HTML.** **HTML** is the text that describes the page's structure: headings, paragraphs, buttons, links.
8. **More downloads.** The HTML mentions other files: **CSS** (colours, fonts, layout), **JavaScript** or **JS** (behaviour: menus, pop-ups, live updates) and images. The browser requests each of these, often dozens of extra requests.
9. **Rendering.** The browser combines HTML + CSS into a layout, paints the pixels, and runs the JavaScript. The page appears and becomes clickable.

> **Common misconception:** "A web page is one file." A typical page is made of tens or even hundreds of files. When one of them fails, for example a missing image or a broken script, the page can look half-loaded even though the main HTML arrived fine.

---

## 4. Frontend vs Backend

| | Frontend | Backend |
|--|----------|---------|
| **Where it runs** | The user's browser | The server |
| **Languages** | HTML, CSS, JavaScript | Python, Node.js, Java, PHP... |
| **What it does** | Displays the UI, handles user interaction | Business logic, database, security |
| **Visible?** | Yes (source code) | No (on the server) |

**Analogy:** in the restaurant, the **frontend** is the dining room: the menu, the tables, the way the dish is presented. The **backend** is the kitchen and storeroom: recipes, stock, and the rules (no alcohol for under-18s). Customers see and touch the dining room; they never walk into the kitchen.

- **UI** (User Interface) = everything you can see and click: buttons, forms, menus.
- **Business logic** = the rules of the business written as code: how a discount is calculated, who may approve a refund.
- **Database** = the organised long-term storage of data: customers, orders, products.

"Visible" matters: anyone can open the frontend code in their browser and read or even change it on their own machine. That is why passwords, prices that must not be tampered with, and permission checks always live on the backend.

**Full-stack developer**: knows both frontend and backend.

> **Real-life work example:** a tester reports "the Save button does nothing". The frontend developer checks whether the click sends a request at all; the backend developer checks whether the server received it and why it failed. Knowing which side to look at first saves hours.

---

## 5. Static vs Dynamic Website

**Analogy:** a **static** site is like a printed menu — every customer gets the same copy, ready in advance. A **dynamic** site is like a waiter who writes a personalised recommendation for each customer after checking what is in the kitchen today.

### Static
The HTML is prebuilt and sent directly to the browser. Fast, simple, no database needed.
- Example: a company introduction page, a simple blog.

"Prebuilt" means the page files exist before anyone visits. The server just hands over the file, which is quick, cheap to host, and has fewer things that can go wrong.

### Dynamic
The HTML is generated **when a request comes in** — the server runs code, queries the database, and builds HTML tailored to each user.
- Example: Facebook (each user sees a different newsfeed).

Other examples: online banking (your balance), a shopping cart, search results. Anything that depends on *who you are* or *what just changed* needs dynamic work somewhere.

| | Static | Dynamic |
|---|---|---|
| When is the page made? | Ahead of time | At the moment of each request |
| Same for everyone? | Yes | No — can differ per user |
| Needs a database? | No | Usually yes |
| Speed & cost | Very fast, cheap | Slower, needs more server power |
| Typical use | Landing page, docs, portfolio | Social network, e-commerce, banking |

> **Common misconception:** "Static means no animation or interactivity." A static page can still have JavaScript sliders and forms. "Static" only means the server sends the same prebuilt files to everyone. Many modern sites mix both: static pages that call the backend for live data.

---

## 6. CDN (Content Delivery Network)

A CDN is a network of servers distributed around the world that store copies of static content (images, CSS, JS) on the **server closest to the user**.

**Analogy:** instead of one central warehouse in California shipping every order worldwide, a chain opens small branch stores in every city stocked with its most popular items. Customers pick up from the nearest branch; only special orders go back to headquarters.

```
User in Hanoi → CDN server in Hanoi (fast)
Instead of:
User in Hanoi → server in California (slow)
```

Even at the speed of light through fibre cables, a round trip across the Pacific takes a noticeable fraction of a second, and a page needs many round trips. Shortening the distance adds up quickly.

**Benefits**: reduced latency, faster load times, less load on the origin server.

- **Latency** = the waiting time for data to travel there and back.
- **Origin server** = the company's real, main server; the CDN copies are taken from it.

Well-known CDN providers include Cloudflare, Akamai and Amazon CloudFront. Personal data, such as your bank balance, is normally not cached on a CDN; it still comes from the origin.

> **Real-life work example:** after a release, a designer says "I still see the old logo". Often the CDN (or the browser) is serving a cached copy. The team "purges the cache" or waits for it to expire.

---

## 7. Browser Dev Tools

In Chrome/Firefox, press `F12` to open Dev Tools:
- **Network tab**: view all requests/responses.
- **Console**: view JavaScript errors.
- **Elements**: inspect HTML/CSS.

This is the basic tool for understanding what a website is doing.

On a Mac keyboard, use `Cmd + Option + I` (works in Chrome, Edge and Firefox). In Safari, first turn on the developer menu in Settings → Advanced, then use the same shortcut. You can also right-click anywhere on a page and choose **Inspect**.

**Analogy:** Dev Tools is the glass window into the kitchen. You can watch every order go in and every dish come out, without changing anything for other customers.

### What each tab is good for

- **Elements** — shows the page's HTML; hover a line and the matching part of the page lights up. You can even edit text here to try a change. It only affects your own screen and disappears on refresh.
- **Console** — red messages here are JavaScript errors. Screenshots of these are very useful in a bug report.
- **Network** — one row per request: the file name, **Status** (200, 404...), **Type**, **Size** and **Time**. Click a row to see its headers and the data that came back.

> **Try it yourself:** open any news site, press `F12` (Windows) or `Cmd + Option + I` (macOS), click the **Network** tab, then press `F5` / `Cmd + R` to reload. Watch dozens of rows appear. Look at the bottom bar: it shows how many requests were made and the total size transferred. Click the first row (the page itself) and open **Headers** to see the status code.

---

## 8. What's in an HTTP Response?

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256

<!DOCTYPE html>
<html>...web page content...</html>
```

- **Status line**: the status code.
- **Headers**: metadata (content type, size...).
- **Body**: the actual content (HTML, JSON, images...).

**Analogy:** a response is like a parcel. The **status line** is the stamp on top ("delivered" or "address not found"), the **headers** are the label (what is inside, how heavy), and the **body** is the item itself.

**Metadata** means "data about the data". `Content-Type: text/html` tells the browser "this is a web page"; `Content-Length: 1256` says the body is 1,256 bytes. **JSON** is a simple text format for data that apps exchange, e.g. `{"name": "An", "age": 30}`.

### Status codes you will meet

The first digit tells you the family:

| Code | Family | Meaning in plain words |
|---|---|---|
| `200 OK` | 2xx success | Everything worked |
| `301` / `302` | 3xx redirect | "This moved — go to this other address" |
| `401` / `403` | 4xx client error | Not logged in / logged in but not allowed |
| `404 Not Found` | 4xx client error | The server got the request but found no resource at that path |
| `500` | 5xx server error | Something broke on the server side |

A simple rule: **4xx** usually means "the request was wrong" (bad address, no permission), **5xx** means "the server failed" — a bug or outage for the developers to fix.

> **Real-life work example:** a good bug ticket says "Clicking *Pay* returns `500` from `POST /api/orders` (screenshot of Network tab attached)" instead of just "payment is broken". Developers can find the cause much faster.

---

## 9. Summary

- **URL** = the full address including scheme, host, path, query.
- Visiting a page = DNS lookup → TCP connection → TLS (if https) → HTTP request → server processing → response → extra files → render.
- **Frontend**: runs in the browser (HTML/CSS/JS).
- **Backend**: runs on the server (logic + database).
- **Static** sites send the same prebuilt files; **dynamic** sites build pages per request.
- **CDN**: a distributed network of servers to increase speed.
- **Dev Tools (F12)**: tools for debugging and exploring a website.
- An HTTP response = status line + headers + body; **2xx** OK, **3xx** redirect, **4xx** request problem, **5xx** server problem.

### Key terms

| Term | Plain-language meaning |
|---|---|
| Browser / client | The app that requests and displays web pages |
| Server | An always-on computer that answers requests |
| HTTP / HTTPS | The rules for browser–server messages / the encrypted version |
| Request / response | The question the browser sends / the answer it gets back |
| DNS | The Internet's phone book: name → IP address |
| TCP / TLS | A reliable connection / the encryption layered on it |
| HTML / CSS / JS | Page structure / looks / behaviour |
| Render | Drawing the page on screen |
| Static / dynamic | Prebuilt for everyone / built per request |
| CDN | Copies of files on servers near the user |
| Status code | A 3-digit result: 200, 404, 500... |
| Dev Tools | Built-in browser tools to inspect a page |
