# Port & Socket

## 1. What is a Port?

An IP address identifies **which computer** you're talking to. But a single computer can run many network applications at the same time (web browser, email, games, etc.). A **port** helps distinguish which application receives which data.

**Intuitive example:**
- IP = the building's address.
- Port = the room number inside the building.
- You arrive at the building → you only meet the right person by entering the right room.

Imagine a big office building. The postman only knows the street address, so without a room number every parcel would pile up at reception and nobody would know whose it is. With "Room 443" written on it, reception can send it straight to the right team. The computer's operating system plays the receptionist: when data arrives, it looks at the port number and hands the data to the program that is "sitting in that room".

```text
Full address: 192.168.1.100:3000
               IP address    Port
```

The colon `:` separates the two parts: everything before it is the IP address (which machine), the number after it is the port (which program on that machine).

A port is an integer from **0 to 65535**.

That odd-looking upper limit comes from how the number is stored: a port uses 16 bits, and 16 bits can hold 65,536 different values (0 to 65535).

### A port is not a hole in the case

> **Common misconception:** "A port is the USB or network socket on the back of the computer." Those are *physical* ports. A network port is purely a **number** in software — no hardware involved. One network cable can carry traffic for thousands of port numbers at the same time.

### Who uses which port?

- A program that **offers** a service (a web server, a database) "sits" on a fixed, well-known port and waits. This is called **listening** on a port.
- A program that **uses** a service (your browser, an email app) is the visitor. It does not need a famous room number; the operating system gives it a temporary one for the duration of the conversation.

TCP and UDP each have their own set of 65,536 ports. Port 53 on TCP and port 53 on UDP are technically different "rooms", although DNS uses both for the same service.

---

## 2. Port Groups

| Group | Range | Meaning |
|------|-----|---------|
| Well-known Ports | 0 – 1023 | Reserved for standard services |
| Registered Ports | 1024 – 49151 | Registered by specific applications |
| Dynamic/Private Ports | 49152 – 65535 | Used temporarily by clients |

**Analogy:** think of the building again. Rooms 0–1023 are the official ground-floor counters everyone knows: "Reception", "Post room", "Security". Rooms 1024–49151 are offices that companies have booked and put on the directory board. Rooms 49152–65535 are hot desks: anyone can use one for an hour, then it is free again.

- **Well-known ports** are assigned by an international body called **IANA** (Internet Assigned Numbers Authority) to the core Internet services: web, email, DNS, SSH and so on.
- **Registered ports** are numbers that software makers have asked IANA to record for their product, such as 3306 for MySQL. Registration is a convention, not a lock — nothing physically stops another program from using 3306.
- **Dynamic (ephemeral) ports** are the "hot desks" the operating system lends to client programs. When your browser opens a connection, it might get port 54321 for a few seconds and then give it back. (Different operating systems may use a slightly different range for this, but the idea is the same.)

> **Try it yourself:** you can see the ports in use on your own computer. On Windows, open `cmd` and run `netstat -an`. On macOS, open Terminal and run `netstat -an -p tcp`. You will see many lines like `192.168.1.25:54321   142.250.66.78:443   ESTABLISHED`: the left side is your computer with a temporary port, the right side is a web server on port 443 (macOS writes the port after a dot instead of a colon, e.g. `192.168.1.25.54321`). Lines marked `LISTENING` (Windows) or `LISTEN` (macOS) are programs on your machine waiting for visitors.

---

## 3. Common Ports You Should Know

| Port | Protocol | Service |
|------|-----------|---------|
| 21 | FTP | File transfer |
| 22 | SSH | Remote server control |
| 25 | SMTP | Sending email |
| 53 | DNS | Domain name resolution |
| 80 | HTTP | Unencrypted web |
| 443 | HTTPS | Encrypted web |
| 3306 | MySQL | MySQL database |
| 5432 | PostgreSQL | PostgreSQL database |
| 6379 | Redis | Cache/Message queue |
| 27017 | MongoDB | MongoDB database |
| 3000 | Dev servers | Convention for Node.js dev |
| 8080 | HTTP alternative | Alternative to port 80 during dev |

You do not need to memorise all of these at once. Start with the "big five" you will hear in almost every project meeting:

1. **80** — normal web (HTTP).
2. **443** — secure web (HTTPS). Almost every real website today.
3. **22** — SSH, how engineers log in to servers.
4. **3306 / 5432** — the two most common databases (MySQL / PostgreSQL).
5. **3000 / 8080** — "the app I'm running on my own laptop".

A few words that appear in the table:

- A **database** is the program that stores the application's data (customers, orders...) in an organised way.
- A **cache** such as **Redis** is a super-fast short-term memory: the app keeps frequently used data there so it does not have to ask the database every time.
- A **dev server** is the copy of the app a developer runs on their own computer while building it.

> **Real-life work example:** in a project chat you might read: "Staging DB is on 5432, but it's not exposed — use the VPN." Translation: the test environment's PostgreSQL database listens on port 5432, but the firewall does not let outsiders reach that port, so you must first connect to the company network through a VPN.

---

## 4. Firewall and Ports

A **firewall** controls network traffic by **opening or blocking ports**:

- Block port 22 → nobody can SSH into the server.
- Open only ports 80 and 443 → the server only serves web traffic.

**Analogy:** a firewall is the security guard at the building entrance holding a list: "Visitors for rooms 80 and 443 may enter. Everyone else, turn back." The rooms behind the guard may still be occupied (a database on 5432 may be running perfectly well), but outsiders simply cannot reach them.

### Rules, not walls

A firewall works with **rules**. A rule usually says: *which direction* (incoming or outgoing), *which port*, *which protocol* (TCP/UDP), *from where* (any address, or only certain IPs), and *allow or deny*. For example:

| Direction | Port | From | Action | Why |
|-----------|------|------|--------|-----|
| Incoming | 443 | Anyone | Allow | Public website |
| Incoming | 22 | Office IP only | Allow | Engineers can log in, strangers cannot |
| Incoming | 5432 | App server only | Allow | Only the app may talk to the database |
| Incoming | Everything else | Anyone | Deny | Default: closed |

Security people call this the **principle of least privilege**: open only what is truly needed, to only who truly needs it. Every open port is a door an attacker could try.

When deploying an application on the cloud (AWS, GCP, etc.), you must configure **Security Group / Firewall rules** to open the right ports.

A **Security Group** is AWS's name for a firewall attached to a cloud server. Firewalls also exist on your laptop (Windows Defender Firewall, the macOS Firewall in System Settings → Network) and inside your home router.

> **Real-life work example:** "The app runs fine on the internal network, but customers outside can't reach it on port 8080." The usual cause is that nobody added a firewall rule allowing incoming traffic on 8080. The app is working — the guard is just not letting visitors in.

---

## 5. What is a Socket?

A **socket** is the endpoint of a network connection — a combination of:
```text
Socket = IP Address + Port + Protocol
Example: (192.168.1.1, 80, TCP)
```

**Analogy:** if the IP is the building and the port is the room, a socket is the **telephone handset in that room** that is actually connected to a call. A call always has two handsets, one at each end. Programs do not deal with cables or packets themselves; they just "talk into the handset" (write data to the socket) and "listen to the handset" (read data from it), and the operating system does the rest.

When you connect to a server, the OS creates a pair of sockets:
- **Server socket**: `server_IP:80` (listening)
- **Client socket**: `client_IP:54321` (random port)

### Step by step: your browser connects to a web server

1. The web server program starts and asks the OS: "Let me **listen** on port 443." Now there is a listening socket waiting for visitors.
2. You open the site. Your browser asks the OS for a connection to `server_IP:443`. The OS picks a free temporary port for you, e.g. `54321`.
3. The TCP handshake (SYN → SYN-ACK → ACK) runs between the two sides.
4. A connection now exists between two sockets: `your_IP:54321` ⇄ `server_IP:443`.
5. Both sides send and receive data through their sockets.
6. When finished, the connection is closed and port `54321` returns to the pool.

```text
 Your laptop                                   Web server
 192.168.1.25:54321  <====== connection ======>  203.0.113.10:443
 (client socket, temporary port)                 (server socket, fixed port)
```

### How can one server talk to thousands of people on the same port?

Each connection is identified by **both** ends: your IP and port, plus the server's IP and port. Two visitors may both connect to `server:443`, but their own IP/port pairs differ, so the server's OS never mixes them up — just as one call centre number can handle many callers because each caller has a different phone number. Even two browser tabs on your own laptop use different temporary ports.

---

## 6. WebSocket

A **WebSocket** is a protocol that allows a **two-way, persistent connection** between client and server — unlike HTTP, which communicates only in a one-way request-response manner.

```text
HTTP:      Client ──request──► Server ──response──► (finished)
WebSocket: Client ◄────────────────────────────►  Server
           (real-time communication, connection stays open)
```

**Analogy:** classic HTTP is like sending text messages to a shop asking "Is my order ready?" — the shop can only answer when you ask, so you keep asking every few seconds. A WebSocket is like an open phone call: once connected, either side can speak at any moment. The shop can say "Your order is ready!" the instant it happens.

### Why not just ask repeatedly?

Before WebSockets, web pages often used **polling**: the browser asked the server every few seconds "anything new?". Most answers were "no", which wasted bandwidth and battery, and news still arrived late (up to the polling interval). With a WebSocket, the server **pushes** updates the moment they happen.

### How it starts

A WebSocket begins life as an ordinary HTTP request that says "please **upgrade** this connection to WebSocket". If the server agrees, the same connection stays open and switches to the WebSocket protocol. Its addresses start with `ws://` (unencrypted, default port 80) or `wss://` (encrypted, default port 443) — so it passes through the same firewall doors as normal web traffic.

**Used for**: chat apps, real-time notifications, online games, live dashboards.

> **Try it yourself:** open a chat web app (e.g. a web version of a messaging app), press F12 (Mac: Cmd+Option+I) to open DevTools, choose the **Network** tab and filter by **WS** (sometimes labelled "Socket"). Reload the page. You will usually see one long-lived connection; clicking it and opening **Messages** shows data flowing both ways while you chat.

> **Common misconception:** "A WebSocket and a socket are the same thing." A *socket* is the general OS-level endpoint used by every network program. A *WebSocket* is one specific protocol for browsers that runs on top of an ordinary TCP socket.

---

## 7. Ports in a URL

When you don't type a port in the URL, the browser uses the default port:
- `http://example.com` = `http://example.com:80`
- `https://example.com` = `https://example.com:443`

That is why public URLs almost never show a port: the scheme at the start (`http` or `https`) already tells the browser which default "room" to knock on.

### Reading a URL piece by piece

```text
https://shop.example.com:8443/orders?id=42
\___/   \______________/ \__/\_____/ \___/
scheme      host name    port  path   query
```

- **Scheme** — which protocol to use (`http`, `https`, `ws`, `wss`).
- **Host name** — which machine (DNS turns it into an IP address).
- **Port** — which program on that machine. Optional when it is the default.
- **Path** and **query** — which page or data you want from that program.

When developing locally: `http://localhost:3000` — you must type the port explicitly because there's no default.

**localhost** is a special name meaning "this very computer" (its address is `127.0.0.1`). Developers often run several things at once — the website on 3000, an API on 8080, a database on 5432 — and the port is how they pick which one to talk to. If a tester opens `http://localhost:3000` on *their* laptop, they will reach their own machine, not the developer's — a common confusion when someone pastes a localhost link in a chat.

---

## 8. Troubleshooting Port Problems

When something "can't connect", knowing about ports lets you describe the problem precisely. These are the situations you will meet most often:

| What you see | What it usually means |
|--------------|-----------------------|
| **Connection refused** | The machine answered, but no program is listening on that port (the app is not running, or runs on a different port). |
| **Connection timed out** | No answer at all: often a firewall silently dropping traffic, or the wrong IP. |
| **Address already in use** (e.g. `EADDRINUSE` in Node.js) | You tried to start a program on a port another program is already using. Only one program can listen on a given port at a time. |
| Page loads over `http` but not `https` | Port 443 is blocked, or HTTPS is not set up on the server. |

**Analogy:** "refused" is knocking on a door and hearing "nobody by that name here"; "timed out" is knocking and hearing nothing at all because a guard turned you away at the gate without a word.

### Checking a port yourself

> **Try it yourself:** test whether a port on a server is reachable. On Windows, open **PowerShell** and run `Test-NetConnection google.com -Port 443`; look for `TcpTestSucceeded : True`. On macOS, in Terminal run `nc -vz google.com 443`; you should see a line ending in `succeeded!`. Now try a port that is normally closed, such as `25` on a home connection or `3306` on google.com: Windows reports `TcpTestSucceeded : False`, and on macOS `nc` will either say the connection was refused or appear to hang until it times out (press Ctrl+C to stop it).

> **Try it yourself (developers' favourite):** find which program is hogging port 3000. Windows `cmd`: `netstat -ano | findstr :3000` — the last number is the process ID, which you can look up in Task Manager's **Details** tab. macOS Terminal: `lsof -i :3000` — it shows the program name and its PID.

### Writing a good ticket

Compare these two bug reports:

- "The API doesn't work."
- "From the office network, `https://api.staging.example.com` (port 443) times out; from home it works. Ping to the host succeeds."

The second one tells the team immediately that the server is alive and the problem is probably a firewall rule for the office network. Mentioning the **host, port, error type and where you tried from** saves hours.

---

## 9. Summary

- **Port** = the room number inside the building (IP).
- A port is a number from 0 to 65535; well-known ports (0–1023) belong to standard services, and clients get temporary dynamic ports.
- **Port 80/443**: HTTP/HTTPS (web).
- **Port 22**: SSH (server management).
- **Port 3306/5432**: MySQL/PostgreSQL (database).
- **Firewall**: controls which ports are open.
- **Socket**: the combination of IP + Port + Protocol forming a connection endpoint.
- **WebSocket**: a persistent two-way connection for real-time apps.
- **URLs** hide the default port (80 for http, 443 for https); `localhost:3000` must show it.
- **"Refused" vs. "timed out"**: nothing listening vs. no answer (often a firewall).

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Port | A number that tells the computer which program should get the data |
| Listening | A program waiting for connections on a port |
| Well-known port | 0–1023, reserved for standard services like web and SSH |
| Ephemeral (dynamic) port | A temporary port the OS lends to a client for one connection |
| IANA | The organisation that keeps the official list of port numbers |
| Firewall | The "security guard" that allows or blocks traffic by port and source |
| Security Group | A cloud provider's firewall for a server (AWS term) |
| Socket | One end of a connection: IP + port + protocol |
| WebSocket | A browser protocol for an always-open, two-way connection |
| Polling | Asking the server again and again "anything new?" |
| localhost | "This computer" (address `127.0.0.1`) |
| Connection refused / timed out | Nobody listening on that port / no answer at all |
