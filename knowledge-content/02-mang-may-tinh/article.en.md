# Computer Networks

## 1. What Is a Computer Network?

**Analogy:** think of a group of neighbours who agree to lend each other tools. Instead of every house buying its own ladder, drill and lawn mower, they pass things around. They need two things to make it work: a way to reach each other (paths between the houses) and agreed rules (who asks, who answers, how things are returned).

A computer network works the same way. A computer network is a collection of multiple devices (computers, phones, printers, etc.) connected together to **share data and resources**.

- **Data** means information: a photo, an email, a spreadsheet, a video stream.
- **Resources** means things one device has that others can use: a printer, a big hard drive, an Internet connection.

The devices on a network are often called **hosts** or **nodes** — just fancy words for "a device that is plugged into the network".

A network enables you to: send email, browse the web, share files, hold online meetings, print over the network, and more.

### You already use several networks every day

- At home, your laptop, phone and smart TV all connect to the same WiFi box.
- At work, your computer connects to the office network, the shared printer and the company file server.
- When you open Facebook or Google, your home network connects to a much larger network — the **Internet** — that links millions of other networks together.

> **Common misconception:** "The Internet" and "WiFi" are not the same thing. WiFi is just a *wireless way to join a local network* (usually in your home). The Internet is the huge worldwide network that your local network connects to. You can have perfect WiFi and still have "no Internet" if the link from your house to your provider is broken.

---

## 2. Common Types of Networks

Networks are usually grouped by **how big an area they cover**. A good analogy is roads: the corridor inside your house, the streets of a city, and the highways between countries are all "roads", but at very different scales.

### LAN – Local Area Network
Connects devices within **a small area**: an office, a school, a home.

- High speed, low latency.
- Example: the WiFi network in your home is a LAN.
- One organisation usually owns and controls the whole LAN (you own your home router; the company IT team owns the office network).
- A LAN can span several floors of the same building — "local" is about the area and ownership, not about a single room.

### WAN – Wide Area Network
Connects LANs across **large geographic distances**: cities, countries, the whole world.

- **The Internet** is the largest WAN in the world.
- WANs usually use links rented from telecom companies (undersea cables, fibre lines between cities, satellites), so they are slower and more expensive per unit of data than a LAN.
- Example: a bank connects the LANs of its head office in Hanoi and its branches in Da Nang and Ho Chi Minh City through a private WAN.

### MAN – Metropolitan Area Network
Covers the scope of a single city. Example: the internal network of a university with multiple campuses.

### Comparison at a glance

| Type | Area covered | Typical owner | Example |
|------|--------------|---------------|---------|
| LAN | A room, home, floor or building | You / your company | Home WiFi, office network |
| MAN | A city or metropolitan area | A city, university or provider | University campuses across one city |
| WAN | Countries, continents, the world | Telecom companies, large organisations | The Internet, a bank's branch network |

> You may also hear **PAN** (Personal Area Network): a tiny network around one person, e.g. your phone connected to wireless earbuds over Bluetooth.

---

## 3. Important Network Devices

**Analogy:** imagine an apartment building with a post room. Inside the building, a clerk carries letters between flats (that is the **switch**). The building's mail room sends letters out to the city and receives letters from outside (that is the **router**). The translator who converts the city's postal format into the building's format is the **modem**. And the intercom speakers in every corridor that let people talk without walking over are the **access point**.

### Router
A router connects your LAN to the Internet (WAN). It **routes** data packets to their correct destination.

- Each router has a public IP address assigned by the Internet Service Provider (ISP).
- Home routers often double as a WiFi access point.
- "Routing" means choosing the next step on the path. A router looks at the destination address on each packet and decides which direction to send it, like a post office deciding which truck a letter goes on.
- An **ISP** (Internet Service Provider) is the company you pay for Internet access — for example VNPT, Viettel or FPT in Vietnam.

### Switch
A switch connects multiple devices within the same LAN. It transfers data **directly** between two devices that need to communicate.

- Unlike a router: a switch works within the local network and does not connect out to the Internet.
- In an office you will see switches as metal boxes with many network sockets (often 24 or 48) in a server cupboard. Every desk cable ends up there.
- The switch learns which device is on which socket, so when your PC prints, the data goes only to the printer's socket, not to everyone.

### Access Point (WiFi Access Point)
Broadcasts WiFi so devices can connect wirelessly. Home routers usually have a built-in access point.

- In a large office or hotel, many separate access points are mounted on ceilings so the WiFi reaches every room. They are all wired back to the switch.

### Modem
A device that converts the signal from the ISP (copper cable, fiber optic, etc.) into a digital signal the router can understand.

- With fibre Internet, the box is often called an **ONT** or "fibre modem". Many providers give you one box that is modem + router + access point all in one, which is why people at home rarely see them as separate devices.

### How they fit together at home

```text
 Internet (ISP)
      |
   [Modem]        converts the provider's signal
      |
   [Router]       connects home LAN <-> Internet, gives out private IPs
    /   |   \
 [Switch] [Access Point] ...
   |   |       )))  (((
  PC  Printer  Phone  Laptop
```

> **Real-life work example:** a ticket says "Floor 3 has no network, floor 2 is fine." The IT team will first suspect the switch for floor 3 (one LAN segment is down), not the router — if the router were broken, every floor would lose the Internet.

---

## 4. Packets

**Analogy:** suppose you want to mail a 300-page book to a friend, but the post office only accepts thin envelopes. You tear the book into 300 pages, put each page in its own envelope, write your address and your friend's address on every envelope, and number them "1 of 300", "2 of 300"... The envelopes may travel on different trucks and arrive in a different order, but your friend can put the book back together using the numbers.

Data transmitted over a network is broken into small **packets**. Each packet contains:

- The source address (source IP)
- The destination address (destination IP)
- A portion of the actual data
- Error-checking information

The addresses and control information are called the **header** (the writing on the envelope); the actual data is called the **payload** (the page inside). A typical packet carries about 1,500 bytes — so even a single photo becomes hundreds or thousands of packets.

Packets travel through many different routers before reaching their destination, and are then **reassembled** in order.

### Why split data into packets?

1. **Sharing the line:** many people's data can take turns on the same cable, packet by packet, instead of one big file blocking everyone.
2. **Cheap repairs:** if one packet is damaged or lost, only that packet is sent again, not the whole file.
3. **Flexible routes:** if one path is congested or broken, routers can send later packets along another path.

**Packet loss** means some packets never arrive. A file download simply asks for them again (slightly slower), but in a live video call there is no time to resend, so you see frozen frames or hear robotic voices.

> **Try it yourself:** open a terminal (Windows: press Start, type `cmd`, press Enter; macOS: open the **Terminal** app) and run `ping google.com`. On Windows it sends 4 small test packets and stops; on macOS it keeps going until you press Ctrl+C. Each line shows a reply and a `time=` value such as `time=23ms`. At the end you see how many packets were sent, received and **lost** — "0% packet loss" is what you want.

---

## 5. Bandwidth and Network Speed

**Analogy:** think of a water pipe. **Bandwidth** is how *wide* the pipe is — how much water can flow through per second. **Latency** is how *long* the pipe is — how long a single drop takes to get from one end to the other. A wide but very long pipe delivers lots of water, but the first drop takes a while to arrive.

**Bandwidth**: the maximum amount of data that can be transmitted in 1 second.
- Units: **Mbps** (Megabit per second), **Gbps** (Gigabit per second).
- 100 Mbps = 100 million bits/second ≈ 12.5 MB/s of actual download speed.

### Bits vs. bytes — the "why is my download slower than advertised?" puzzle

- A **bit** is the smallest unit of data (a single 0 or 1). Network speeds are measured in bits: lowercase **b**, as in Mb**ps**.
- A **byte** is 8 bits. File sizes are measured in bytes: uppercase **B**, as in MB.
- So divide by 8: a 100 Mbps plan downloads at most about 12.5 MB per second. In practice a little less, because packet headers and WiFi overhead take part of the capacity.
- "1 Gbps" = 1,000 Mbps.

**Latency/Ping**: the time it takes for a packet to travel from A to B and back.
- Unit: millisecond (ms). Low ping = a fast-responding network.
- Rough guide: under 30 ms feels instant; 50–100 ms is fine for most things; above about 150 ms, video calls and online games start to feel laggy.

**Note**: High bandwidth does not mean low ping. A satellite link can have high bandwidth but very high ping (>500ms).

### Which one matters for what?

| Activity | Needs high bandwidth? | Needs low latency? |
|----------|----------------------|--------------------|
| Downloading a large file / software update | Yes | Not really |
| Streaming a 4K movie | Yes | Not really (it buffers ahead) |
| Video calls (Zoom, Teams) | Moderate | Yes |
| Online gaming, financial trading | Low | Yes, very |
| Sending email | Low | No |

Also note that bandwidth is **shared**: if five people at home are streaming at once, each gets only a slice of the pipe.

> **Try it yourself:** visit a speed-test site such as `speedtest.net` or `fast.com` in your browser. You will see a **download** speed in Mbps, an **upload** speed in Mbps, and a **ping/latency** in ms. Try it once next to the router and once in the farthest room to see how much WiFi distance matters.

> **Real-life work example:** a user writes "Zoom is choppy but the speed test says 200 Mbps." The speed is fine; the problem is more likely high latency or packet loss (busy WiFi, a far-away access point), not lack of bandwidth.

---

## 6. Wired vs. WiFi

**Analogy:** a wired connection is like a private corridor between two rooms; WiFi is like talking across a crowded hall. In the hall you can move around freely, but walls, distance and other people talking (other WiFi networks, microwaves, Bluetooth devices) make it harder to hear, and anyone nearby can try to listen.

- **Ethernet** is the standard for wired networks; the cable has a plug that looks like a slightly wider phone plug (called **RJ45**).
- **WiFi** sends data as radio waves. Its quality drops with distance, thick walls and many devices sharing the same channel.

| | Wired (Ethernet) | WiFi |
|--|---------------------|------|
| Speed | High, stable | Lower, fluctuating |
| Latency | Very low | Higher |
| Convenience | Requires a cable | Wireless |
| Security | Higher | Easier to eavesdrop on |

WiFi security comes from a password and encryption (look for **WPA2** or **WPA3** in the router settings). On public WiFi in a café, anyone in range shares the same air, so avoid logging in to sensitive systems without a VPN or HTTPS.

**Rule of thumb:** use a cable for devices that never move and need stability (desktop PCs, servers, a meeting-room video system); use WiFi for everything that moves.

---

## 7. IP Addresses in a Network

**Analogy:** in an apartment building, each flat has a number (Flat 101, 102...) that only makes sense *inside* the building. The building itself has a street address that the outside world uses. Letters from outside arrive at the street address, and the reception desk forwards them to the right flat.

Every device in a network has an **IP address** (Internet Protocol address) for identification.

An IP address (the common version, **IPv4**) is written as four numbers from 0 to 255 separated by dots, for example `192.168.1.25`. Your home router usually hands out these addresses automatically when a device joins — a service called **DHCP** — so you never type them yourself.

- **Private IP**: used within the LAN. Example: 192.168.1.x
- **Public IP**: your network's address on the Internet, assigned by the ISP.

Private ranges are reserved and reused in millions of homes — your `192.168.1.10` and your neighbour's `192.168.1.10` never clash, because they live in different "buildings". The common private ranges start with `10.`, `172.16.`–`172.31.` and `192.168.`.

When you visit google.com, the packet travels from your private IP → router → public IP → the Internet → Google.

The router does the "reception desk" job: it swaps your private address for the shared public address on the way out, and remembers which device asked so it can forward the reply back. This trick is called **NAT** (Network Address Translation). It is why all devices in your home appear to the outside world as **one** public IP.

> **Try it yourself:** find your private IP. Windows: in `cmd` run `ipconfig` and look for **IPv4 Address** (e.g. `192.168.1.25`) and **Default Gateway** (your router, often `192.168.1.1`). macOS: in Terminal run `ipconfig getifaddr en0` (Wi-Fi on most Macs), or open System Settings → Wi-Fi → Details. Then search "what is my IP" in a browser: the address shown there is your **public** IP, and it will be different.

> **Common misconception:** "My IP address identifies my computer to the whole world." Not quite — websites see your router's public IP, shared by everyone in your home or office. Your private IP is only meaningful inside your LAN.

---

## 8. Putting It Together: What Happens When You Open a Website

Let's follow what happens, step by step, when you type `google.com` in your laptop's browser at home and press Enter:

1. **Your laptop joins the LAN.** It is connected over WiFi to the access point inside your home router, and earlier it received a private IP such as `192.168.1.25` via DHCP.
2. **The browser prepares the request** and the operating system breaks it into packets. Each packet gets a header with the source (your private IP) and the destination (Google's server address).
3. **The packets go to the router** (the "default gateway"), because the destination is not inside your LAN.
4. **The router applies NAT:** it replaces your private IP with your home's public IP and notes which device asked.
5. **The modem** converts the signal for your provider's fibre or cable line.
6. **Across the WAN:** the packets hop through many routers at your ISP and on the Internet. Each router reads the destination and forwards the packet one step closer. Packets may take different paths.
7. **Google's servers** receive the packets, reassemble them, and send back the web page — also split into packets.
8. **On the way back,** your router receives the reply at the public IP, looks up its NAT table, and forwards it to `192.168.1.25`. Your laptop reassembles the packets and the browser draws the page.

```text
Laptop (192.168.1.25) --WiFi--> Router/NAT --> Modem --> ISP --> Internet routers --> Google
       ^                                                                                |
       +------------------------------- reply packets ---------------------------------+
```

All of this usually happens in well under a second. When something is slow or broken, IT people check these same links one at a time: is the device on the WiFi? Can it reach the router? Can the router reach the Internet? Is the remote server answering?

> **Try it yourself:** to see the routers your packets pass through, run `tracert google.com` on Windows or `traceroute google.com` on macOS. Each numbered line is one router "hop" with its response time. The first hop is usually your own router (e.g. `192.168.1.1`). Some hops may show `* * *` — that just means that router chose not to reply, which is normal.

---

## 9. Summary

- **LAN**: a small internal network (home, office).
- **WAN/Internet**: a global network.
- **Router**: connects a LAN to the Internet.
- **Switch**: connects devices within a LAN.
- **Packet**: the unit of data transmitted over a network.
- **Bandwidth**: the maximum speed, measured in Mbps/Gbps.
- **Latency/ping**: how long a round trip takes, in ms — high bandwidth does not guarantee low ping.
- **Private vs. public IP**: private addresses are used inside the LAN; the router uses NAT to share one public IP with the Internet.
- **Wired vs. WiFi**: a cable is faster, steadier and safer; WiFi is more convenient.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Network | Devices connected so they can share data and resources |
| LAN / MAN / WAN | Network of a building / a city / countries and the world |
| ISP | The company that sells you Internet access |
| Router | The "mail room" that connects your network to other networks and picks the path |
| Switch | Connects devices inside one LAN and delivers data to the right one |
| Access point | Broadcasts WiFi so devices can join wirelessly |
| Modem | Converts the provider's line signal into digital data for the router |
| Packet | A small numbered "envelope" of data with addresses on it |
| Bandwidth | How much data can flow per second (Mbps/Gbps) |
| Latency / ping | Time for a round trip, in milliseconds |
| IP address | A device's address on a network |
| NAT | The router trick that lets many private IPs share one public IP |
| DHCP | The service that automatically hands out IP addresses |
