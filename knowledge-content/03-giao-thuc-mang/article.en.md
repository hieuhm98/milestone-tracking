# Network Protocols

## 1. What Is a Protocol?

A **protocol** is a set of rules and conventions that devices must follow in order to communicate with one another. It is like a shared language — two people must speak the same language to understand each other.

**Analogy:** think about making a phone call. Nobody wrote the rules down for you, but everyone follows them: the caller dials, the other person says "Hello?", the caller introduces themselves, you take turns talking, and you both say "Bye" before hanging up. If someone skipped steps — for example, started talking before the other person picked up — the conversation would fail. A network protocol is exactly this kind of etiquette, only written down precisely so that machines made by different companies can follow it.

A protocol typically defines:

- **Format** — what a message looks like (which part is the address, which part is the content).
- **Order** — who speaks first and what reply is expected.
- **Error handling** — what to do when a message is lost, damaged or not understood.

### Why so many protocols?

Communication is split into small jobs, and each job has its own protocol. One protocol carries a letter across the street, another makes sure no page is missing, another describes what a web page request looks like. Splitting the work means each part can be improved separately: your WiFi can be upgraded without changing how web browsers talk.

> **Common misconception:** "A protocol is a program." Not quite. A protocol is a *set of rules*, like the rules of chess. Programs (browsers, email apps, servers) *implement* the rules, just as different chess apps all follow the same chess rules.

---

## 2. The TCP/IP Model

TCP/IP is the foundational protocol suite of the Internet, consisting of 4 layers:

| Layer | Function | Example Protocols |
|------|-----------|-----------------|
| Application | Interfaces with user software | HTTP, HTTPS, FTP, SMTP, DNS |
| Transport | End-to-end data delivery, error control | TCP, UDP |
| Internet | Addressing and routing | IP |
| Link | Data transmission over physical media | Ethernet, WiFi |

A **protocol suite** is a family of protocols designed to work together. The name "TCP/IP" comes from its two most famous members, TCP and IP.

### The layers as a postal system

**Analogy:** imagine sending a gift to a friend abroad.

- **Application layer** — *what* you are sending and in what form: you write a letter in a language your friend reads. On the network this is the browser and the web server talking HTTP, or your email app talking SMTP.
- **Transport layer** — *how carefully* it is delivered: do you choose registered mail with tracking and signature (that is **TCP**), or a cheap postcard that is usually fine but might get lost (that is **UDP**)?
- **Internet layer** — *the address and the route*: the postal service reads the destination address and moves the parcel from sorting centre to sorting centre. On the network this is **IP** (Internet Protocol), and the sorting centres are routers.
- **Link layer** — *the actual vehicle on one stretch of road*: the truck, the plane, the bicycle courier. On the network this is the WiFi radio or the Ethernet cable between two neighbouring devices.

### Wrapping and unwrapping

When you send data, each layer adds its own label (a **header**) around what it received from the layer above — like putting a letter in an envelope, then in a box, then on a pallet. On the receiving side, each layer removes its label and passes the rest upward. This is called **encapsulation**.

```text
Sender                                         Receiver
[Application]  web page request                [Application]  reads the request
[Transport]    + TCP header (port, order no.)  [Transport]    checks order, removes header
[Internet]     + IP header (from/to address)   [Internet]     checks address, removes header
[Link]         + WiFi/Ethernet frame           [Link]         receives signal, removes frame
      \__________ over cables, air and many routers __________/
```

> You may also hear about the **OSI model**, which splits the same ideas into 7 layers instead of 4. It is mostly used for teaching and troubleshooting vocabulary ("it's a layer 3 problem" = an IP/routing problem). The real Internet runs on TCP/IP.

---

## 3. TCP vs. UDP

Both TCP and UDP live in the Transport layer. Their job is to carry data from a program on one machine to a program on another. They make opposite trade-offs.

### TCP (Transmission Control Protocol)
TCP guarantees that data **arrives completely and in the correct order**:
- Establishes a connection first (3-way handshake).
- Checks for errors and retransmits if a packet is lost.
- Slower than UDP but **reliable**.
- Used for: web (HTTP), email, file downloads.

**Analogy:** TCP is like registered mail with numbered pages and a receipt. The receiver signs for every batch it gets ("I have pages 1–10"). If the sender does not get a receipt for page 7, it sends page 7 again. The receiver waits and puts the pages in order before handing them over. Nothing is missing, but the waiting and signing take time.

**3-Way Handshake:**
```text
Client → Server: SYN (request to connect)
Server → Client: SYN-ACK (agreement)
Client → Server: ACK (confirmation)
→ The connection is established
```

In plain words: "Can we talk?" — "Yes, we can — can you hear me?" — "Yes, I hear you." Only after these three messages does real data start flowing. **SYN** stands for "synchronise" and **ACK** for "acknowledge". The **client** is the side that starts the conversation (e.g. your browser); the **server** is the side that waits for requests (e.g. a website's computer).

### UDP (User Datagram Protocol)
UDP sends data **without requiring acknowledgment**:
- Does not establish a connection first.
- Faster, but packets can be lost.
- Used for: video streaming, online gaming, DNS, VoIP (calls).

**Analogy:** UDP is like shouting updates across a football field. You do not check whether each word was heard; you just keep talking. If a word is missed, there is no point repeating it — the game has already moved on. (A **datagram** is simply a self-contained UDP message.)

### Why would anyone want unreliable delivery?

In a live video call, a piece of audio that arrives half a second late is useless — the conversation has moved on. TCP would pause everything to resend the lost piece, making the whole call freeze. UDP just skips it: you may see a tiny glitch, but the call keeps going. For a bank transfer or a file download, though, one missing byte would corrupt the result, so TCP is the right choice.

| | TCP | UDP |
|--|-----|-----|
| Connection first? | Yes (handshake) | No |
| Guarantees delivery and order? | Yes | No |
| Speed / delay | Slower, more overhead | Faster, lower delay |
| When a packet is lost | Sends it again | Ignores it (the app may cope) |
| Typical uses | Web pages, email, downloads, banking | Video calls, live streaming, games, DNS lookups |

---

## 4. HTTP and HTTPS

### HTTP (HyperText Transfer Protocol)
The protocol for transferring web pages. It works on a **Request – Response** model:

```text
Browser sends: GET /index.html HTTP/1.1
Server returns: HTTP/1.1 200 OK + the web page content
```

**Analogy:** HTTP works like ordering at a restaurant counter. You (the browser) place an order ("Bring me the menu page"), the kitchen (the server) prepares it and hands back a tray with a ticket on top saying how it went ("200 OK — here you go", or "404 — we don't have that dish"). Each order is separate: the counter does not remember your previous order unless you show a loyalty card (on the web this "card" is usually a **cookie** or a login token).

A request has a few parts:

- **Method** — the verb: what you want to do (`GET`, `POST`...).
- **URL / path** — which thing you want (`/index.html`, `/api/orders/42`).
- **Headers** — extra notes, like "I accept Vietnamese" or "here is my login token".
- **Body** — optional content you send, e.g. the data of a form you filled in.

**Common HTTP Methods:**
- `GET`: retrieve data.
- `POST`: send data to the server.
- `PUT/PATCH`: update data.
- `DELETE`: delete data.

The difference between the two "update" verbs: `PUT` usually **replaces the whole record** with what you send, while `PATCH` **changes only some fields** (e.g. just the phone number of a customer).

**HTTP Status Codes:**
- `200 OK`: success.
- `404 Not Found`: not found.
- `500 Internal Server Error`: server error.
- `401 Unauthorized`: not authenticated.
- `403 Forbidden`: no permission.

The first digit tells you the family, which is often enough to know who should investigate:

| Family | Meaning | Who usually fixes it |
|--------|---------|----------------------|
| 2xx | Success | Nobody — it worked |
| 3xx | Redirect: "go look over there instead" | Usually nobody |
| 4xx | The **request** was wrong (bad address, not logged in, no permission) | The caller / user / frontend |
| 5xx | The **server** failed while handling a valid request | The backend / operations team |

> **Real-life work example:** a tester writes in a bug ticket: "Clicking *Save* shows an error. DevTools shows `POST /api/orders` → 500." That one line tells the team the browser sent the request correctly and the server crashed — a backend issue. If it had said 403, the first question would be "does this user have the right role?"

> **Try it yourself:** in Chrome or Edge press F12 (on a Mac: Cmd+Option+I) to open **DevTools**, click the **Network** tab, then reload the page. Every line is one HTTP request. Look at the **Method** and **Status** columns — you will see many `GET` lines with status `200`, and perhaps a few `304` (cached) or `404`.

### HTTPS (HTTP Secure)
HTTPS = HTTP + **TLS/SSL encryption**. Data is encrypted before transmission, protecting it from eavesdropping.

- Recognizable by the padlock icon 🔒 in the browser.
- Required for any website handling sensitive information.

**Analogy:** plain HTTP is like sending a postcard — every post office worker along the way can read it. HTTPS puts the message in a locked box that only the website can open. It also checks the website's **certificate** — a digital ID card issued by a trusted authority — so you know you are really talking to your bank and not an impostor.

- **TLS** (Transport Layer Security) is the modern name; **SSL** is its older predecessor. People still say "SSL certificate" out of habit.
- By default, HTTP uses port 80 and HTTPS uses port 443 (ports are covered in the "Port & Socket" topic).

> **Common misconception:** "The padlock means the website is safe and honest." No — it only means the connection is **encrypted** and the domain name matches the certificate. A scam site can have a padlock too. Always check the domain name itself.

---

## 5. DNS (Domain Name System)

DNS is the system that converts easy-to-remember domain names into IP addresses:

```text
google.com → 142.250.186.46
```

**Analogy:** DNS is the contacts app of the Internet. You remember "Mum", not her phone number; your phone looks up the number for you. Computers can only connect to numeric IP addresses, but humans remember names like `google.com`. DNS does the lookup. (The exact IP you get for Google may differ from the one above — large sites have many servers and answer with a nearby one.)

**The DNS Resolution Process:**
1. You type `google.com`.
2. The browser checks its local DNS cache.
3. If not found → it asks the ISP's DNS server.
4. The DNS server finds and returns the IP: `142.250.186.46`.
5. The browser connects to that IP.

### What "finds" means in step 4

The ISP's DNS server (called a **resolver**) does not know every name in the world. If the answer is not in its own cache, it asks around, from the top down, like asking for directions:

```text
Resolver → Root server:        "Who handles .com?"
Root     → Resolver:           "Ask the .com servers."
Resolver → .com server:        "Who handles google.com?"
.com     → Resolver:           "Ask Google's own name servers."
Resolver → Google name server: "What is the IP of google.com?"
Google   → Resolver:           "142.250.186.46"
```

Every answer comes with an expiry time called **TTL** (Time To Live). Until it expires, browsers and resolvers reuse the cached answer instead of asking again — which is why DNS lookups are usually almost instant, and also why a change to a domain's address can take a while to be seen everywhere.

DNS lookups are small and fast, so they normally travel over **UDP** (port 53).

> **Try it yourself:** run `nslookup google.com` (works on both Windows `cmd` and macOS Terminal). You will see the DNS server that answered (often your router, e.g. `192.168.1.1`) and one or more addresses for google.com. Try `nslookup` with a made-up name such as `this-does-not-exist-12345.com` — you will get an error like "Non-existent domain" or "NXDOMAIN".

> **Real-life work example:** "The site works for the team in Hanoi but not for the client" right after a server move is often a DNS caching issue: some people still have the old IP cached until the TTL expires.

---

## 6. FTP, SMTP, SSH

These are other Application-layer protocols you will hear about at work. Each solves one job:

| Protocol | Function | Default Port |
|-----------|-----------|---------------|
| FTP | File transfer | 21 |
| SMTP | Sending email | 25, 587 |
| IMAP/POP3 | Receiving email | 143, 110 |
| SSH | Secure remote server control | 22 |

### FTP — moving files

**FTP** (File Transfer Protocol) uploads and downloads files between a computer and a server, like a shared drop box. Classic FTP sends passwords **unencrypted**, so today companies prefer **SFTP** (file transfer over SSH) or FTPS (FTP with TLS).

### SMTP, IMAP and POP3 — email

**Analogy:** email works like the postal system. **SMTP** (Simple Mail Transfer Protocol) is the postman who *carries* your letter from your mail server to the recipient's mail server. **IMAP** and **POP3** are how you *open your mailbox* to read what has arrived.

- **IMAP** keeps mail on the server and syncs it, so your phone and laptop show the same inbox.
- **POP3** downloads mail to one device and usually removes it from the server — an older style.
- When an app "sends an automatic confirmation email", it hands the message to an SMTP server.

### SSH — controlling a remote computer

**SSH** (Secure Shell) lets an engineer type commands on a server far away, as if sitting in front of it, with everything encrypted. Developers and system administrators use it daily to deploy and fix servers.

> A "default port" is the standard door number where a service waits for connections. You will learn more in the "Port & Socket" topic.

---

## 7. Putting It Together: Loading a Web Page Step by Step

Here is how the protocols cooperate when you type `https://shop.example.com` and press Enter:

1. **DNS:** the browser needs an IP address. It checks its cache; if needed it asks the DNS resolver (usually over UDP), and gets back something like `203.0.113.10`.
2. **TCP handshake:** the browser opens a TCP connection to `203.0.113.10` on port 443 with SYN → SYN-ACK → ACK.
3. **TLS handshake:** because the address starts with `https://`, browser and server agree on encryption keys and the browser checks the site's certificate. The padlock appears if all is well.
4. **HTTP request:** the browser sends `GET /` with headers (language, cookies...), now encrypted.
5. **IP and the Link layer** carry every packet: IP puts the from/to addresses on them and routers forward them; WiFi or Ethernet carries them across each local hop.
6. **HTTP response:** the server replies `200 OK` with the HTML of the page. TCP makes sure every piece arrives and is in order.
7. **More requests:** the HTML mentions images, styles and scripts, so the browser sends more `GET` requests — often dozens — reusing the same connection where possible.
8. **The page appears.** If you then fill in a form and click *Buy*, the browser sends a `POST` request with your data in the body.

```text
You type URL
   |
   v
 [DNS]  name -> IP          (UDP, port 53)
   |
   v
 [TCP]  SYN / SYN-ACK / ACK (connection to port 443)
   |
   v
 [TLS]  certificate check + encryption keys
   |
   v
 [HTTP] GET / -> 200 OK + page
```

Where it can go wrong tells you where to look: a DNS error ("server not found") means the name could not be translated; a timeout means the connection could not be made; a 4xx/5xx code means the connection worked but the request or the server had a problem.

---

## 8. Summary

- **Protocol** = the shared rules of communication between devices.
- **TCP/IP model**: 4 layers — Application, Transport, Internet, Link — each adding its own header.
- **TCP**: reliable, guarantees order → used for web, email.
- **UDP**: fast, no guarantees → used for video, gaming.
- **HTTP/HTTPS**: the protocols of the web. HTTPS encrypts data.
- **Status codes**: 2xx success, 4xx problem with the request, 5xx problem on the server.
- **DNS**: converts domain names into IP addresses.
- **SMTP** sends email, **IMAP/POP3** receive it, **SSH** controls servers securely, **FTP** transfers files.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Protocol | Agreed rules for how devices talk |
| TCP/IP | The 4-layer family of protocols that runs the Internet |
| Header | The label each layer adds in front of the data |
| TCP | Careful delivery: connection first, nothing lost, in order |
| UDP | Fast delivery: no connection, no resending |
| 3-way handshake | SYN, SYN-ACK, ACK — how TCP opens a connection |
| HTTP | Request–response language between browsers and web servers |
| HTTP method | The verb of a request: GET, POST, PUT, PATCH, DELETE |
| Status code | A 3-digit result number, e.g. 200, 404, 500 |
| HTTPS / TLS | HTTP inside an encrypted, identity-checked connection |
| DNS | The Internet's contact list: names to IP addresses |
| SMTP / IMAP / POP3 | Sending email / reading email (synced) / downloading email |
| SSH | Encrypted remote command line for servers |
| FTP / SFTP | File transfer (plain / encrypted over SSH) |
