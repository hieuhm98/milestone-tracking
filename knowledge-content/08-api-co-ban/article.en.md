# What is an API?

## 1. What is an API?

An **API** (Application Programming Interface) is an **interface** that allows software systems to communicate with each other.

### The restaurant analogy

Picture a restaurant. You want food and the kitchen can make it, but you don't walk into the kitchen and cook. You read the **menu** (what you are allowed to order), tell the **waiter** ("one pho, no onions"), and the waiter brings back the dish — or "sorry, we're out of beef".

An API is the waiter plus the menu. One program (you) asks another program (the kitchen) for something, using a fixed list of allowed requests, and gets a fixed kind of answer back. You never see *how* the kitchen works inside — and you don't need to.

Where the analogy breaks down: an API "waiter" has no judgement. Order something not on the menu, or phrase it wrongly, and you get an error instead of a helpful suggestion.

**Real-world example**: When you book a Grab ride, the Grab app calls the Google Maps API to get the map and calculate the route. Grab doesn't build maps itself — it calls someone else's API.

### Client and server

Every exchange has two roles:
- **Client** (the caller): the app/website that sends the request, e.g. the Grab app.
- **Server** (the provider): the system running the API that returns data, e.g. Google Maps.

"Client" and "server" are roles, not types of machine. The same system can be a server for its own app and a client when it calls Google Maps.

Key rule: **the client always initiates the request**, and the server only responds. A server never "phones you first" — remember this, because section 8 shows the clever workaround for it.

> **Common misconception:** an API is not a screen. "Interface" here means a *connection point between programs*; users only see the app that uses it.

---

## 2. REST API

There are many ways to design an API. **REST** (Representational State Transfer) is the most popular API architecture today, operating over HTTP. **HTTP** is the same language your web browser uses to load web pages, so REST APIs travel over the normal internet like any website.

### Basic principles
- Each resource has its own **URL** (endpoint). A **resource** is any "thing" the system manages: a product, an order, a user. An **endpoint** is the specific web address for it, like a numbered counter in a post office.
- Use **HTTP Methods** to express actions. The method is a short verb sent with the request that says *what you want to do* with the resource.
- Stateless: each request is independent and does not remember previous state.

**Stateless, in plain words:** like a call centre where each call reaches a different person with no notes from earlier calls, so you repeat your customer number every time. Every REST request carries everything the server needs (who you are, what you want).

What each method means: **GET** "show me" (only reads, changes nothing), **POST** "create a new one", **PUT** "replace it completely", **PATCH** "change just these fields", **DELETE** "remove it".

### Example: a product management API

| HTTP Method | Endpoint | Action |
|-------------|----------|-----------|
| GET | `/api/products` | Get the list of products |
| GET | `/api/products/5` | Get the product with id=5 |
| POST | `/api/products` | Create a new product |
| PUT | `/api/products/5` | Fully update the product with id=5 |
| PATCH | `/api/products/5` | Partially update the product with id=5 |
| DELETE | `/api/products/5` | Delete the product with id=5 |

The URL says **which thing** (`/api/products` = all products, `/api/products/5` = product 5); the method says **what to do**.

**PUT vs PATCH, with an example:** a product has a name, a price and a colour. With **PATCH** you send only `price` and the other fields stay as they were. With **PUT** you send the whole product; anything you leave out may be wiped or reset.

---

## 3. The Structure of a Request (4 parts)

A **request** is the message the client sends. Think of it as a letter sent by post. A complete HTTP request always has 4 parts:

| Part | Role | Example |
|------|------|---------|
| **URL** | The address of the resource to act on | `https://api.shop.com/orders` |
| **Method** | The action to perform | `POST` |
| **Headers** | Accompanying info (format, auth…) | `Content-Type: application/json` |
| **Body** | Data sent up (only for POST/PUT/PATCH) | `{ "productId": 5 }` |

In letter terms: the URL is the address on the envelope, the method is the kind of service ("registered mail"), the headers are notes on the envelope ("written in English", "sender ID attached"), and the body is the letter inside. A GET usually has no body — "show me product 5" needs no extra content.

The **response** has a similar structure, but replaces Method + URL with a **Status Code** (section 6). The response also has headers and usually a body containing the data you asked for.

---

## 4. JSON – The Data Format

The body of a request or response is just text, so both sides must agree how to write it. **JSON** (JavaScript Object Notation) is the most popular text format for exchanging data via APIs. Despite "JavaScript" in the name, every programming language can read and write it.

```json
{
  "id": 5,
  "name": "Laptop Dell XPS",
  "price": 25000000,
  "inStock": true,
  "tags": ["laptop", "dell", "premium"]
}
```

Read it like a form: the label on the left (`"name"`), the filled-in answer on the right (`"Laptop Dell XPS"`).

- `{}` = object (key-value pairs), `[]` = array (a list).
- Values: string, number, boolean, null, object, array.

> 📖 JSON has its own article — see **"What is JSON?"** to understand nested objects, arrays of objects, and how to read data by path.

---

## 5. Request and Response

Here is a full exchange: a customer places an order for 2 units of product 5.

### HTTP Request
```text
POST /api/orders HTTP/1.1
Host: api.shop.com
Content-Type: application/json
Authorization: Bearer eyJhbGci...

{
  "productId": 5,
  "quantity": 2,
  "address": "123 Lê Lợi, HCM"
}
```

Line by line: `POST /api/orders` = "create a new order". `Host` = which server. `Content-Type` = "the body is JSON". `Authorization` = "here is proof of who I am" (section 9). After a blank line comes the body.

### HTTP Response
```text
HTTP/1.1 201 Created
Content-Type: application/json

{
  "orderId": "ORD-20240408-001",
  "status": "confirmed",
  "total": 50000000
}
```

`201 Created` = success, a new thing was created. The body gives the new order's id and total.

### What happens step by step when you tap "Place order"

1. The app builds a request: `POST /api/orders`, headers, and a JSON body with your cart.
2. The request travels over the internet (encrypted with HTTPS) to the shop's server.
3. The server checks who you are and the stock, then saves the order.
4. The server answers with a status code plus a JSON body.
5. The app shows "Order confirmed!" — or an error message.

All of this usually takes well under a second.

> **Try it yourself:** open `https://api.github.com/users/octocat` in your browser. Instead of a web page you get raw JSON, such as `"login": "octocat"` — you just made a GET request to GitHub's public API. To see the status and headers too, run `curl -i https://api.github.com/users/octocat` in a terminal (Windows: PowerShell, type `curl.exe`; macOS: Terminal). The first line shows something like `HTTP/2 200`.

> **Try it yourself (DevTools):** on any website press `F12` (Windows) or `Cmd+Option+I` (macOS), open the **Network** tab, choose **Fetch/XHR**, and reload. Each row is an API call; click one to see its URL, method, status code and response.

---

## 6. HTTP Status Codes

Every response carries a 3-digit **status code** telling you whether the request succeeded or failed. This is what a BA most often sees when reading logs or talking with developers.

Analogy: the first digit is like the colour of a traffic light — it tells you the general situation before you read the details.

| Group | General meaning | Common codes |
|-------|-----------------|--------------|
| **2xx** | Success | `200 OK`, `201 Created`, `204 No Content` |
| **3xx** | Redirection | `301 Moved`, `304 Not Modified` |
| **4xx** | **Client** error (the caller) | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `429 Too Many Requests` |
| **5xx** | **Server** error | `500 Internal Server Error`, `503 Service Unavailable` |

**Memory aid:** `4xx` = "you sent something wrong", `5xx` = "the server is broken".

### The codes you will meet most

- **201 Created** — it worked and something new was created (typical answer to POST).
- **400 Bad Request** — the request is malformed, e.g. a required field is missing.
- **404 Not Found** — nothing exists at that address: product 99999 does not exist, or the URL has a typo.
- **409 Conflict** — clashes with current data, e.g. registering an email that is already taken.
- **429 Too Many Requests** — you are calling too often; many APIs set a **rate limit** (so many calls per minute).
- **500 / 503** — the server crashed, or is overloaded / under maintenance. Not the caller's fault.

Two codes people often confuse:
- **401 Unauthorized**: not logged in / missing or wrong token.
- **403 Forbidden**: logged in but **lacks permission** to access.

Office analogy: **401** is the security guard saying "show me your badge". **403** is "I see your badge, but you are not allowed on this floor".

**Real work example:** a tester's ticket says *"Save on the profile page shows 'Something went wrong'. Network tab: `PATCH /api/users/42` → 500."* The 500 tells the team to look at the server; a 400 would point at what the app sent.

---

## 7. Pagination & Filtering (Query String)

When data is large (millions of records), an API won't return everything at once. Sending a million products in one answer would be slow for the server, the network and your phone. The client uses a **query string** — the part after the `?` in the URL — to filter and paginate.

Analogy: in a library you don't ask for "all the books". You ask for "cookbooks, sorted by newest, the first 20 please" — and come back later for the next 20.

```text
GET /api/products?category=laptop&inStock=true&sort=price&page=2&size=20
```

| Parameter | Meaning |
|-----------|---------|
| `category=laptop` | **Filter**: only laptop products |
| `inStock=true` | An extra in-stock filter |
| `sort=price` | **Sort** by price |
| `page=2&size=20` | **Paginate**: page 2, 20 results per page (records 21–40) |

Multiple parameters are joined with `&`. Each one is a `name=value` pair. You see this daily: search a shopping site and the address bar often becomes `...?q=laptop&page=1`.

A BA needs this when specifying a list screen: which filters, what sorting, how "load more"/pagination works. Also settle: the default sort, items per page, and what the screen shows when nothing matches.

---

## 8. Webhook vs Polling – Real-time updates

Since **only the client initiates calls**, how does the client learn when data **changes on the server** (e.g. an order moves to "out for delivery")? Two approaches:

- **Polling**: the client asks repeatedly, "done yet? done yet?", every few seconds/minutes. Simple but wasteful and delayed.
- **Webhook**: the client provides a **Callback URL**; when an event happens, **the server calls back** to that URL. Real-time and efficient (only one request per change).

Analogy: waiting for a parcel. **Polling** is walking to the front gate every 10 minutes to check. A **webhook** is giving the courier your phone number so they call you the moment they arrive.

The rule "the client calls first" still holds: the Callback URL is a small endpoint the shop runs, so when the payment provider sends the webhook, the provider is the *client* for that one call.

| Criterion | Polling | Webhook |
|-----------|---------|---------|
| Who calls | Client asks continuously | Server calls when an event happens |
| Latency | Yes (based on poll interval) | Nearly instant |
| Efficiency | Many wasted requests | Very efficient |
| Example | An app constantly refreshing status | VNPAY calls a webhook to report "paid" |

When writing integration requirements, a BA should ask: *"Does this system support webhooks, or must we poll?"* And: *"If we are down when it arrives, does the provider retry?"*

---

## 9. API Key and Authentication

An open API would let anyone read or change anything, and companies pay for their servers. Most commercial APIs require authentication: proving **who is calling** before anything is answered — like a gym checking your membership card.

- **API Key**: a secret string sent with each request (in a header or query param). It usually identifies an *application or company*, and is used to count usage and send the bill.
- **Bearer Token (JWT)**: a short-lived token issued after login. It identifies a *user*. "Bearer" means "whoever carries this token is let in" — which is exactly why it must be kept secret.
- **OAuth**: lets you log in via Google/Facebook without sharing your password. The "Sign in with Google" button is OAuth: Google confirms who you are and hands the website a token; the website never sees your Google password.

If authentication is wrong/missing, the server returns **401** (not authenticated) or **403** (no permission).

> **Common misconception:** "An API key is just a setting, fine to paste in a chat." No — whoever has the key can call the API **as you**, and paid APIs will bill your company. Keep keys out of screenshots, tickets and public code; if one leaks, have it revoked and replaced.

---

## 10. API Documentation

You cannot guess what an API accepts, just as you cannot order from a restaurant without a menu. Every API has documentation describing:
- Which endpoints exist.
- What data to send (request body, parameters).
- What data you receive (response format).
- What errors can occur.

**Swagger/OpenAPI** is a popular standard for writing API docs. The Swagger page lists every endpoint and often has a "Try it out" button that sends a real request.

BAs often read these docs to understand what the system returns and to write requirements/tests. Many also use **Postman**, an app for sending requests by hand: type a URL, pick a method, press *Send*, read the status and JSON.

**Real work example:** a developer says *"`GET /orders/{id}` doesn't return the delivery fee."* The BA checks the response example in Swagger, confirms it, and writes a ticket to add `deliveryFee`.

---

## 11. Real-World Example: Shopee & Grab

A single app is usually a bundle of many API calls — some to the company's own servers, some to outside providers.

| Situation | API used |
|-----------|--------------|
| Shopee displays a map of the delivery address | Google Maps API |
| The Grab app calculates the fare | Internal pricing API |
| A website allows login with Google | Google OAuth API |
| Payment via VNPAY | VNPAY Payment API |
| VNPAY reports the payment result back to the shop | Webhook (Callback URL) |
| Sending SMS OTP | Twilio/VIETGUYS SMS API |

An "internal" API is one a company builds for its own apps; a "third-party" API is offered by another company, often for a fee.

One checkout can touch five of these in a row: cart (own API) → map → payment → webhook → SMS. If any one call fails, the user sees a problem. That is why integration requirements must say what happens on errors and timeouts, not just on success.

---

## 12. Summary

- **API** = an interface for systems to communicate; the **client** calls, the **server** responds.
- **REST API** uses HTTP Methods + URL endpoints. GET reads; POST creates; PUT/PATCH update; DELETE removes.
- A **request** has 4 parts: URL, Method, Headers, Body.
- **Status codes**: 2xx success, 4xx client error, 5xx server error (401 ≠ 403).
- The **query string** (`?key=value`) is used to **filter, sort, and paginate**.
- **Webhooks** let the server push real-time updates instead of the client having to **poll**.
- **JSON** = the most popular data format (see the dedicated JSON article).
- **Authentication** = API Key, Bearer Token, OAuth; **API Docs** (Swagger) describe how to use it.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| API | A "waiter + menu" between programs |
| Endpoint | The web address of one resource, e.g. `/api/products/5` |
| HTTP method | The verb: GET, POST, PUT, PATCH, DELETE |
| Status code | 3-digit result: 2xx OK, 4xx caller's mistake, 5xx server's fault |
| Query string | The `?a=1&b=2` part of a URL |
| Webhook | The provider calls your Callback URL when something happens |
| API key / token | A secret that proves who is calling |
