# Host & Server

## 1. What Is a Host?

A **host** is any device connected to a network that has an IP address — a computer, phone, server, router, and so on. The term "host" simply refers to a device participating in the network.

**Analogy:** think of a street. Every house that has a postal address can send and receive letters. In a network, every device with an address can send and receive data — and each one is a host. Your laptop on the office Wi-Fi is a host, your phone on 4G is a host, the smart TV at home is a host, and the giant machine that runs Facebook is also a host.

The address itself is the **IP address** (IP = Internet Protocol). It is a number such as `192.168.1.23` that tells the network where to deliver data — we look at it closely in Section 5. Hosts usually also have a human-friendly **hostname**, such as `HARRY-LAPTOP` or `mail.company.com`.

You will also meet "host" as a verb: *"We host our website on AWS"* means the website's files and programs live on AWS's machines and are served from there.

> **Try it yourself:** find your own host's name and IP address.
> - **Windows:** open **Command Prompt** (Windows key, type `cmd`, Enter) and run `ipconfig`. Look for a line like `IPv4 Address. . . . . . : 192.168.1.23`. Run `hostname` to see your computer's name.
> - **macOS:** open **Terminal** and run `ipconfig getifaddr en0`. It prints one line such as `192.168.1.23` (if it prints nothing, you may be on a cable connection — try `en1`). Run `hostname` to see your Mac's name.

---

## 2. The Client–Server Model

Most Internet applications operate on the **Client–Server** model:

```text
Client (User)               Server
─────────────────           ─────────────────
Browser, App          ───►  Receives the request
                      ◄───  Processes it & returns the response
```

- **Client**: the user's device, which sends the request.
- **Server**: a dedicated computer that receives and processes the request, and returns data (the response).

**Analogy:** a **restaurant**. You (the client) sit at a table and order: "one bowl of phở, please" — that is the **request**. The kitchen (the server) prepares it and sends back a bowl — that is the **response**. The kitchen never cooks until someone orders, and it serves many tables at the same time.

A few things are true of almost every server:

- It **waits** for requests and answers them; the client is the one who **starts** the conversation.
- It is **always on**, 24/7, usually in a **data center** — a large, air-conditioned building full of racks of computers with backup power.
- It usually has **no screen or keyboard** attached; engineers manage it remotely.
- It serves **many clients at once** — thousands or millions.

**Examples:**
- You type `facebook.com` → the browser (client) sends a request to Facebook's server → the server returns the web page's HTML.
- You place an order on Shopee → the app (client) sends a request to Shopee's server → the server processes the order.

### Step by step: what happens when you open a website

1. You type `shopee.vn` in the browser and press Enter.
2. The browser asks a **DNS server** (the Internet's phone book) "what is the IP address of `shopee.vn`?" and gets back a number.
3. The browser connects to the server at that IP address.
4. It sends a **request**: "please give me the home page".
5. The server runs its programs, reads products from its database, and builds the page.
6. The server sends back the **response**: the page's HTML, plus images, styles and scripts.
7. The browser draws the page on your screen. Every click after that is a new request–response round.

> **Common misconception:** "A server is a special kind of super-computer." A server is a **role**, not a kind of machine. Any computer running software that waits for and answers requests is acting as a server — even your own laptop (see Section 4). And one machine can play both roles: a company's web server is a server to your browser but a **client** when it asks the database server for data.

---

## 3. Types of Servers

| Type | Function | Example |
|------|-----------|-------|
| **Web Server** | Serves web pages (HTML, CSS, JS) | Nginx, Apache |
| **Application Server** | Handles business logic | Node.js, Django, Spring |
| **Database Server** | Stores and queries data | MySQL, PostgreSQL, MongoDB |
| **File Server** | Stores and shares files | Samba, FTP server |
| **Mail Server** | Sends/receives email | Postfix, Gmail SMTP |
| **DNS Server** | Resolves domain names | Cloudflare DNS, Google DNS |

In plain words:

- **Web server** — the front door. It hands the browser ready-made files: HTML (the page's structure), CSS (its look) and JavaScript (its behaviour). These unchanging files are called **static** files.
- **Application server** — the brain behind the counter. It runs the **business logic**: the rules of the business, such as "check stock, apply the voucher, calculate shipping, create the order".
- **Database server** — the organised archive. It stores data (users, products, orders) and answers questions about it ("all orders from this customer this month").
- **File server** — a shared drive for an office network, like the `S:` drive where a team keeps documents. For huge numbers of images and videos on the web, companies today usually use **object storage** services such as Amazon S3 instead.
- **Mail server** — the post office for email.
- **DNS server** — the phone book that turns names like `google.com` into IP addresses (for example Cloudflare's `1.1.1.1` and Google's `8.8.8.8`).

### How they work together: the 3-tier architecture

Most business apps split the work into three layers, called a **3-tier architecture**:

```text
 Browser / App ──► [ Web server ] ──► [ Application server ] ──► [ Database server ]
   (client)          front door         business logic             stored data
```

**Analogy:** the waiter (web server) takes your order, the chef (application server) decides how to cook it, and the storeroom (database server) holds the ingredients. The customer never walks into the storeroom — and in the same way, a browser never talks to the database directly. That separation is good for security and makes each layer easier to scale.

In practice, a single physical machine can run multiple types of server software at once. A small company's website might run Nginx, its application and its database all on one machine; a big site spreads each tier across many machines.

---

## 4. Localhost

**Localhost** is a special name that points back to the very computer you are using, equivalent to the IP address `127.0.0.1`.

**Analogy:** writing a letter and addressing it to "myself". It never leaves the house — the postman (the network) is not even involved. Every computer has its own localhost, and it always means *this* machine, whoever is using it.

When developers build web applications, they run a server right on their personal machine and access it via:

```text
http://localhost:3000
http://127.0.0.1:3000
```

This lets them test the application without deploying it to the Internet. **Deploying** means putting the application onto a real server so other people can use it.

### What is the `:3000`? Ports

One computer can run many server programs at once, so each one listens on a numbered **port**. **Analogy:** the IP address is the building's street address; the port is the apartment number inside it. `localhost:3000` means "this computer, apartment 3000".

| Port | Usually used for |
|---|---|
| 80 | Websites over HTTP |
| 443 | Websites over HTTPS (secure) |
| 3000, 5173, 8080 | Apps under development on a developer's laptop |
| 5432 / 3306 | PostgreSQL / MySQL databases |

You rarely see 80 or 443 in your browser because they are the defaults: `https://shopee.vn` really means `https://shopee.vn:443`.

> **Common misconception:** a developer pastes `http://localhost:3000/orders` into the team chat and asks the tester to check it. The tester opens it and gets *"This site can't be reached"*. Nothing is broken: on the tester's laptop, `localhost` means **the tester's own laptop**, where the app is not running. To share it, the developer must give their machine's network IP (for example `http://192.168.1.23:3000`, only inside the same office network) or, better, deploy it to a shared **test server**.

> **Try it yourself:** run `ping 127.0.0.1` (or `ping localhost`).
> - **Windows:** it sends 4 messages and shows `Reply from 127.0.0.1: bytes=32 time<1ms`.
> - **macOS:** it keeps going with lines like `64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.05 ms`; press `Ctrl + C` to stop.
> The time is almost zero because the message never left your computer.

---

## 5. IP Addresses

Every host in a network has a unique IP address:

**Analogy:** an IP address is a **postal address** for data. Without it, a packet of data would not know where to go — and the reply would not know where to come back to.

### IPv4

- Format: `192.168.1.100` — 4 groups of numbers, each from 0 to 255.
- Total: ~4.3 billion addresses (nearly exhausted).

Why 0–255 and 4.3 billion? Each group is one byte (8 bits), and 8 bits can hold 256 values (0–255). Four groups = 32 bits, giving 2³² ≈ 4.3 billion combinations. That seemed plenty in the 1980s, but today there are more phones alone than that.

### IPv6

- Format: `2001:0db8:85a3:0000:0000:8a2e:0370:7334` — 8 groups of hexadecimal.
- Total: 340 undecillion addresses (effectively unlimited for now).

**Hexadecimal** ("hex") counts with 16 symbols: 0–9 then a–f. IPv6 uses 128 bits, giving 2¹²⁸ ≈ 3.4 × 10³⁸ addresses — enough for every grain of sand on Earth to have many. IPv6 was created because IPv4 is running out. Long runs of zeros can be shortened: the example above can be written `2001:db8:85a3::8a2e:370:7334`.

### Private vs. Public IP

- **Private**: used only within the internal network. Ranges: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`.
- **Public**: an address on the Internet, unique worldwide.

**Analogy:** a company's internal phone **extensions**. "Extension 105" works inside the office, and another company can also have an extension 105 — but you cannot dial it from outside. To reach the office from outside you need the company's **public** phone number. In the same way, thousands of homes all use `192.168.1.x` inside, and those addresses are never routed on the public Internet.

```text
 Home / office network (private)                    Internet (public)
 Laptop  192.168.1.23 ─┐
 Phone   192.168.1.24 ─┼──► Router ── public IP 113.161.x.x ──► Shopee's server
 TV      192.168.1.25 ─┘
```

Your Wi-Fi **router** connects the two worlds: all devices inside share the router's single public IP. The router remembers which inside device asked for what and passes each reply back to the right one. This trick is called **NAT** (Network Address Translation), and it is a big reason IPv4 has lasted so long.

> **Try it yourself:** compare your private and public IPs. Run `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS) — you will see a private address such as `192.168.x.x` or `10.x.x.x`. Then search "what is my IP" in your browser — the website shows a completely different, **public** address: your router's.

---

## 6. Web Hosting

**Hosting** is a service that rents out space on a server to store a website.

Almost no one runs a public website from a laptop at home: it would have to stay on 24/7, have a stable public IP, and survive power cuts. So people rent space on someone else's servers. **Analogy:** choosing where to live.

| Type | Description | Best for |
|------|-------|---------|
| **Shared Hosting** | Many websites share a single server | Blogs, small sites, cheap |
| **VPS (Virtual Private Server)** | A private virtual server on shared hardware | Medium sites, more flexible |
| **Dedicated Server** | Renting an entire physical machine | Large websites, high performance |
| **Cloud Hosting** | Resources from many servers (AWS, GCP, Azure) | Flexible scaling |
| **Serverless** | No server management, pay per use | Microservices, small APIs |

- **Shared hosting = a room in a shared house.** Cheap, but you share the kitchen and bathroom: if a neighbour's site gets very busy, yours slows down.
- **VPS = your own apartment in a building.** The building (physical machine) is shared, but you have your own locked space with a guaranteed amount of CPU and RAM, and you can install what you like. A **virtual** server is a software-made "computer" carved out of a real one.
- **Dedicated server = renting a whole house.** All the hardware is yours: maximum performance and control, maximum price. Suits a large e-commerce site.
- **Cloud hosting = a serviced-apartment chain.** Need two more rooms for the holiday rush? You get them in minutes and pay only while you use them. AWS (Amazon), GCP (Google Cloud) and Azure (Microsoft) are the big providers. Ideal for a startup that cannot predict its growth.
- **Serverless = taking a taxi instead of owning a car.** You do not manage any server at all; you upload small pieces of code, the provider runs them when a request arrives, and you **pay per execution**. (There are still servers — you just never see or manage them.)

> **Real-life example:** in a planning meeting, someone says *"Let's move from the VPS to the cloud so we can scale for 11.11."* Translation: the shop expects a huge spike of shoppers on the 11 November sale day, and with cloud hosting it can add servers for the rush and remove them afterwards, instead of paying for a big machine all year.

---

## 7. Static IP vs. Dynamic IP

- **Static IP**: does not change — used for servers that a domain needs to point to.
- **Dynamic IP**: changes on each connection — used for ordinary user devices.

**Analogy:** a static IP is a shop's **permanent street address** — printed on its signs and in maps, so customers can always find it. A dynamic IP is a **hotel room number**: you get whichever room is free each time you check in, and that is fine because nobody needs to send you letters there.

Dynamic addresses are handed out automatically by a service called **DHCP** (on your home router, or at your Internet provider) whenever a device joins the network. This is convenient and saves addresses, which is why ordinary laptops and phones use them.

Servers are different: other people must find them reliably.

- A domain name like `shop.example.com` is set up (in DNS) to point at the server's IP. If that IP changed, the domain would point to the wrong place and the site would go down.
- Partners often **whitelist** your server — they allow connections only from a specific list of IPs. If your server's IP changes, their firewall blocks you.

> **Real-life example:** a bank partner sends this requirement: *"Please provide the IP address your system will call our API from, so we can whitelist it."* The correct infrastructure answer is a **static** IP for the calling server. A dynamic one would work today and silently break the integration the next time it changes.

---

## 8. Putting It Together: From Localhost to Production

Software usually travels through several **environments** — separate copies of the system on different hosts — before real users see it:

```text
 Developer laptop        Test / staging server        Production server
 localhost:3000    ──►   test.shop.com          ──►   shop.com
 (only the dev)          (team & testers)             (real customers)
```

1. **Local** — the developer runs the app on `localhost` to build and try it.
2. **Test / staging** — the app is deployed to a shared server with its own address, so testers and BAs can reach it from their own machines. Staging is set up to be as close as possible to production.
3. **Production** ("prod") — the live system on servers with static IPs and real domains, used by real customers.

> **Real-life example:** a tester reports *"Login fails on staging but works for the developer."* Useful questions, using this lesson's vocabulary:
> - Is the developer testing on **localhost** while I am on the **staging server**? (Different host, maybe different database.)
> - Is the staging **application server** connected to the right **database server**?
> - Is the login service behind a **whitelist** that does not include the staging server's IP?
> Asking which host, which server and which IP turns a vague "it's broken" into a ticket a developer can act on.

---

## 9. Summary

- **Host**: any device with an IP in the network.
- **Client**: sends the request; **Server**: processes it and returns the response. "Server" is a role — one machine can be both client and server.
- **Server types**: web (static files), application (business logic), database (data), file, mail, DNS. Together, web → app → database form a **3-tier architecture**.
- **Localhost / 127.0.0.1**: the address of your own machine. A localhost link only works on the machine that runs the app.
- **Port**: the "apartment number" for one program on a host, e.g. `:3000`, `:443`.
- **IPv4** (~4.3 billion, nearly used up) vs **IPv6** (practically unlimited). **Private** IPs work only inside a network; **public** IPs are unique on the Internet.
- **Web Hosting**: a service for storing a website on a server.
- **VPS**: a private virtual server — a balance between cost and flexibility. Cloud scales on demand; serverless charges per execution.
- **Static IP** for servers (domains and whitelists depend on it); **dynamic IP** for everyday devices.

### Key terms

| Term | Plain-language meaning |
|---|---|
| Host | Any device on a network that has an address |
| IP address | The "postal address" of a host |
| Client | The side that asks (browser, app) |
| Server | The side that waits, works and answers |
| Request / Response | The question sent / the answer returned |
| Data center | A building full of servers, always powered and cooled |
| Localhost (127.0.0.1) | "This very computer" |
| Port | A numbered door for one program on a host |
| Private / Public IP | Inside-only address / address reachable on the Internet |
| NAT | The router sharing one public IP among many devices |
| Hosting | Renting space on someone else's servers |
| VPS | Your own virtual server on shared hardware |
| Serverless | Run code without managing servers; pay per run |
| Static / Dynamic IP | Address that never changes / changes over time |
| Whitelist | A list of the only addresses allowed to connect |
| Environment | A separate copy of a system: local, staging, production |
