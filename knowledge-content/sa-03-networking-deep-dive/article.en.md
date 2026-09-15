# Networking Deep Dive for Architects

## 1. OSI vs TCP/IP: the layers you actually talk about

The seven-layer OSI model is a teaching model; the Internet runs on the four-layer TCP/IP model. Architects still use OSI *numbers* as vocabulary — "an L4 load balancer", "an L7 firewall".

| OSI layer | TCP/IP layer | Protocols | Seen in reviews as |
|---|---|---|---|
| 7 Application (+6, 5) | Application | HTTP, gRPC, DNS | ALB path routing, WAF rules |
| 4 Transport | Transport | TCP, UDP | NLB on TCP 443, port numbers |
| 3 Network | Internet | IP, ICMP | Route tables, CIDR, NAT |
| 2 Data link / 1 Physical | Link | Ethernet, ARP | Same-subnet traffic, distance |

TLS sits awkwardly between 4 and 7, and QUIC is a transport built on UDP — do not argue about it; say what a component *inspects*. Only IPs and ports → L4. HTTP headers, paths or cookies → L7. **The higher the layer a component understands, the smarter its decisions and the more CPU and latency it costs**: a security group is almost free, a WAF parsing every body is not.

---

## 2. Encapsulation, MTU and MSS

Each layer wraps the payload above it with its own header.

```text
+----------+----------+----------+----------------------+
| Ethernet | IP hdr   | TCP hdr  | payload              |
| 14 bytes | 20 bytes | 20 bytes | up to MSS bytes      |
+----------+----------+----------+----------------------+
           |<------------ MTU = 1500 bytes ------------>|
                           MSS = 1500 - 20 - 20 = 1460
```

- **MTU** is the largest IP packet a link carries: 1,500 bytes on standard Ethernet. Inside an AWS VPC most current instance types support **9,001-byte jumbo frames**, but traffic leaving the VPC (internet gateway, VPN) is limited to 1,500 or less.
- **MSS** is the TCP payload per segment, announced in the SYN.
- **Path MTU Discovery** needs ICMP "fragmentation needed" messages. A firewall that blocks all ICMP creates a **black hole**: the handshake (small packets) works, then large responses hang. Tunnels and VPNs add headers and trigger this often — clamp the MSS.

---

## 3. TCP: handshake, reliability and teardown

TCP gives an ordered, reliable byte stream over an unreliable network, paid for with per-connection state and round trips.

```text
Client                                   Server (LISTEN)
  | ---- SYN seq=x ----------------------> |
  |  SYN_SENT                              |  SYN_RECEIVED
  | <--- SYN+ACK seq=y ack=x+1 ----------- |
  | ---- ACK ack=y+1 --------------------> |
  |  ESTABLISHED (1 RTT spent)             |  ESTABLISHED
  |                                        |
  | ---- FIN ----------------------------> |  (client closes first)
  |  FIN_WAIT_1                            |  CLOSE_WAIT
  | <--- ACK ----------------------------- |
  |  FIN_WAIT_2                            |
  | <--- FIN ----------------------------- |  LAST_ACK
  | ---- ACK ----------------------------> |  CLOSED
  |  TIME_WAIT (2 x MSL) -> CLOSED         |
```

- **Sequence numbers and ACKs** detect loss and reorder bytes; lost segments are retransmitted.
- **Flow control**: the receiver advertises a window so a fast sender cannot overrun it.
- **Congestion control** (CUBIC is the Linux default, BBR is common at big providers) starts small — an initial window of 10 segments — and grows. New connections are slow; warm ones are fast.
- **SYN flood**: attackers never complete handshakes and fill the half-open queue; **SYN cookies** avoid storing state until the final ACK.
- **Head-of-line blocking**: one lost segment stalls every byte behind it.

Troubleshooting fact: many sockets stuck in **CLOSE_WAIT** mean *your application* received the FIN but never called `close()` — a code leak, not a network fault.

---

## 4. TIME_WAIT, ephemeral ports and connection reuse

The side that closes **first** holds **TIME_WAIT** for 2×MSL — hard-coded to **60 seconds** on Linux — so delayed packets are not mistaken for a new connection on the same 4-tuple (source IP, source port, destination IP, destination port). TIME_WAIT is cheap, but it holds that 4-tuple, and the client's **ephemeral ports** run out first.

```bash
# Linux default ephemeral range: 32768-60999 (about 28,000 ports)
sysctl net.ipv4.ip_local_port_range

# Count sockets in TIME_WAIT
ss -tan state time-wait | wc -l
```

A service opening a new connection per request to one database IP:port at a few hundred requests per second exhausts those ports within about a minute and fails with `EADDRNOTAVAIL` ("cannot assign requested address"). Fixes, best first:

1. **Reuse connections**: HTTP keep-alive, database connection pools, one shared HTTP client.
2. Widen the 4-tuple space (more destination IPs) if reuse is impossible.
3. `net.ipv4.tcp_tw_reuse=1` reuses TIME_WAIT sockets for *outgoing* connections. The old `tcp_tw_recycle` was removed in Linux 4.12 because it broke clients behind NAT.

Align **idle timeouts** too: if a load balancer drops idle connections at 60 s but the client pool keeps them 300 s, the client writes into dead sockets and gets resets. The client's idle timeout must be shorter than every middlebox's.

---

## 5. UDP: when no guarantees is the feature

UDP adds only ports and a checksum (an 8-byte header) to IP: no handshake, ordering, retransmission or congestion control.

| | TCP | UDP |
|---|---|---|
| Setup | 3-way handshake (1 RTT) | None |
| Delivery | Reliable, ordered | Best effort |
| Head-of-line blocking | Yes | No |
| Typical uses | HTTP/1.1, HTTP/2, databases, SSH | DNS, VoIP/video, games, QUIC, WireGuard |

Choose UDP when **late data is worthless** (a voice frame 300 ms late is useless) or when you build your own reliability on top, as QUIC does. Costs: UDP is easy to spoof, which powers **amplification DDoS** (DNS, NTP, memcached), and some corporate firewalls block it — so HTTP/3 clients always keep a TCP fallback.

---

## 6. CIDR and subnetting

`10.0.0.0/16` means the first 16 of 32 bits are the network, leaving **2^(32−16) = 65,536 addresses**.

| Prefix | Addresses | Usable in AWS | Typical use |
|---|---|---|---|
| /16 | 65,536 | 65,531 | Largest VPC |
| /20 | 4,096 | 4,091 | Private subnet for EKS nodes and pods |
| /24 | 256 | 251 | Common subnet |
| /28 | 16 | 11 | Smallest AWS subnet |

AWS reserves **5 addresses per subnet** (network, +1 router, +2 DNS, +3 future use, last); classic networks reserve 2. Private ranges (RFC 1918): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.

Architect-level concerns:

- **Never overlap.** VPCs or on-prem networks with overlapping CIDRs cannot be peered or routed without painful NAT. Keep a company-wide IP plan instead of defaulting every VPC to `10.0.0.0/16`.
- **Size for Kubernetes**: with the AWS VPC CNI each pod takes a VPC IP, so a /24 per AZ runs out fast.
- **IPv6** removes scarcity (subnets are /64), but IPv6-only clients need NAT64/DNS64 to reach IPv4 services.

---

## 7. NAT: how private hosts reach the internet

- **SNAT / PAT**: many private hosts share one public IP; the device rewrites source IP *and* port and records it in a **connection tracking** table. Home routers and AWS NAT Gateway do this.
- **DNAT**: traffic to a public IP:port is rewritten to a private backend (port forwarding).

```text
private subnet               NAT gateway 203.0.113.10            internet
10.0.1.25:43512 --\
                   >- SNAT -> 203.0.113.10:1025 ----------> 93.184.216.34:443
10.0.1.26:39001 --/          203.0.113.10:1026 ----------> 93.184.216.34:443

conntrack: 1025 <-> 10.0.1.25:43512   1026 <-> 10.0.1.26:39001
```

- NAT is **stateful and outbound-initiated**: the internet cannot open connections inward. That is a side effect, not a firewall — keep security groups.
- **Port exhaustion**: AWS NAT Gateway supports up to **55,000 simultaneous connections to each unique destination** (IP, port, protocol), then reports `ErrorPortAllocation`. Fixes: add secondary public IPs, reuse connections, or use **VPC endpoints** for S3/DynamoDB (also no NAT processing charge).
- **Idle timeout**: NAT Gateway drops idle connections after 350 seconds; long idle connections need TCP keepalives below that.
- Behind NAT or proxies servers see the translated IP; the client IP must travel in `X-Forwarded-For` or the PROXY protocol.

---

## 8. DNS resolution chain and TTL

To an architect DNS is **a globally distributed cache whose staleness you control with TTL**.

```text
app --> stub resolver (OS, /etc/resolv.conf)
          v
     recursive resolver (ISP, 8.8.8.8, VPC resolver at base+2)
          |  cache miss -> walk the tree:
          |--1--> root server        "ask the .com servers"
          |--2--> .com TLD server    "ask ns-123.awsdns-45.com"
          |--3--> authoritative NS   "api.example.com A 198.51.100.7 TTL 60"
          v
     answer cached for up to TTL at every layer
```

- The recursive resolver caches answers and NS delegations, so most lookups never reach the root.
- **Negative answers** (NXDOMAIN) are cached too, for a period from the zone's SOA record.
- DNS uses **UDP 53**, and **TCP 53** for large responses and zone transfers.
- **No CNAME at the zone apex** (`example.com` must hold SOA and NS). Use ALIAS/ANAME; on AWS, Route 53 alias records.

```bash
dig +trace api.example.com                  # follow the delegation from the root
dig api.example.com A +noall +answer        # answer with remaining TTL
```

**TTL trade-off**: 30–60 s gives fast failover but more queries; hours means fewer lookups but slow change. Migration playbook: **lower the TTL at least one old-TTL period before cutover**, switch, verify, raise it again. Failure modes: runtimes that ignore TTL (the JVM caches forever when a security manager is installed; some pools resolve once at startup) and resolver limits — the VPC resolver caps packets per network interface, so chatty services should cache locally.

---

## 9. TLS 1.3 handshake and certificates

TLS gives confidentiality, integrity and server authentication. Design for **TLS 1.3** (RFC 8446); 1.0/1.1 are deprecated, 1.2 is still acceptable with modern ciphers.

```text
Client                                          Server
  | --- ClientHello ------------------------------> |
  |     versions, ciphers, key_share, SNI, ALPN     |
  | <-- ServerHello (key_share) ------------------- |
  |     {EncryptedExtensions} {Certificate}         |
  |     {CertificateVerify} {Finished}              |
  | --- {Finished} {HTTP request} ----------------> |   1 RTT, then data
  {...} = encrypted with keys derived from ECDHE
```

- **1 RTT instead of 2**: the client sends its key share in the first message.
- **Forward secrecy is mandatory**: static RSA key exchange is gone, so a stolen key cannot decrypt recorded traffic.
- Legacy ciphers are removed and the certificate travels encrypted.
- **0-RTT resumption** sends data in the first flight, but it **can be replayed** — allow it only for idempotent requests.

The server sends its **leaf certificate plus intermediates**; the client builds a chain to a **root CA** in its trust store and checks the name (SAN), dates and signatures. A classic outage is a **missing intermediate**: browsers still work (they cache intermediates) while `curl`, Java or mobile clients fail. **SNI** in the ClientHello (clear text) lets one IP serve many certificates; **ALPN** negotiates `h2`.

Lifetimes are shrinking: the CA/Browser Forum approved cutting public certificate validity from 398 days to **47 days by 2029**. Automate renewal with ACME (Let's Encrypt, cert-manager) or AWS Certificate Manager. mTLS belongs to the security topic.

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts </dev/null
```

---

## 10. HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP (+TLS in browsers) | QUIC over UDP 443 |
| Format | Text | Binary frames | Binary frames |
| Concurrency | One request at a time per connection; browsers open ~6 per host | Multiplexed streams on one connection | Independent streams on one connection |
| Header compression | None | HPACK | QPACK |
| Head-of-line blocking | Per connection | **Still at TCP level** | Only the affected stream |
| Cold setup with TLS 1.3 | 2 RTT | 2 RTT | **1 RTT** (0-RTT on resume) |
| Wi-Fi → 4G switch | Connection dies | Connection dies | Survives (connection IDs) |

- HTTP/2 is negotiated through ALPN. Server push has been dropped by browsers; use `103 Early Hints` or preload.
- On a lossy mobile link one lost packet freezes every HTTP/2 stream; HTTP/3 moves streams into QUIC to avoid it.
- Browsers learn about HTTP/3 from the `Alt-Svc` header or an HTTPS DNS record, and fall back to TCP if UDP is blocked.

Architect's choice: terminate HTTP/2 and HTTP/3 **at the edge** (CDN, load balancer), where clients are far and links lossy. Inside the VPC, HTTP/1.1 keep-alive is often fine; use HTTP/2 end-to-end when needed, e.g. **gRPC requires HTTP/2**.

```bash
curl -so /dev/null -w 'dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer}\n' https://api.example.com/health
```

---

## 11. L4 vs L7 load balancing

| | L4 | L7 |
|---|---|---|
| Sees | IPs, ports, TCP/UDP | Method, host, path, headers, cookies |
| TLS | Pass-through possible | Terminates to read requests |
| Balances | Per connection | Per request |
| Client IP | Can be preserved | Passed in `X-Forwarded-For` |
| Strengths | Huge throughput, any protocol, static IPs | Routing rules, sticky cookies, retries, WAF, auth |
| AWS | Network Load Balancer | Application Load Balancer |

```text
L4: client ==TCP==> [LB picks backend per connection] ==same stream==> backend
L7: client ==TLS/HTTP==> [LB terminates, parses, picks per request] ==new conn==> backend
```

- **Non-HTTP protocols, static IPs for partner allow-lists, or TLS the LB must not decrypt** → L4.
- **Host/path routing to many services, WAF, auth at the edge** → L7.
- **The gRPC trap**: gRPC multiplexes calls over one long-lived HTTP/2 connection, and an L4 balancer spreads *connections*, so each client pins to one backend. Use an HTTP/2-aware L7 balancer, client-side balancing or a mesh.
- Trust `X-Forwarded-For` only from your own proxies — clients can forge it.
- L4 health checks prove the port accepts connections; L7 checks prove `/health` returns 200.

Balancing algorithms and proxy config are in the nginx topic.

---

## 12. Latency numbers every architect should know

Light in fibre travels about **200,000 km/s**: every 1,000 km adds roughly **5 ms one way, 10 ms round trip**, before routing detours and queuing.

| Path | Typical RTT |
|---|---|
| Same AZ / data centre | ~0.1–0.5 ms |
| Between AZs in one AWS region | ~1–2 ms |
| Hanoi ↔ Ho Chi Minh City | ~20–30 ms |
| Vietnam ↔ Singapore | ~30–50 ms |
| US East ↔ US West | ~60–80 ms |
| Vietnam ↔ US West coast | ~150–200 ms |

A **cold** HTTPS request over a 170 ms RTT link:

```text
TCP handshake              1 RTT = 170 ms
TLS 1.3 handshake          1 RTT = 170 ms
Request -> first byte      1 RTT = 170 ms + server time
---------------------------------------------------------
Cold, HTTP/1.1 or HTTP/2   ~510 ms + server time (+ DNS)
Cold, HTTP/3               ~340 ms + server time
Warm (reused connection)   ~170 ms + server time
```

- **You cannot optimise the speed of light away** — move endpoints closer: CDN edges, regional deployments, TLS termination at the edge with warm origin connections.
- **Connection reuse beats most code optimisations** on high-RTT links.
- **Chatty APIs multiply RTT**: 20 sequential calls at 50 ms is a full second. Batch, parallelise, or orchestrate server-side.
- Cross-AZ calls are cheap in latency but billed for data transfer; keep synchronous cross-region calls rare.

---

## Key interview points

- Name components by what they inspect: IP/port = **L4**, HTTP host/path/headers = **L7**.
- MTU 1,500 → MSS 1,460; blocked ICMP breaks Path MTU Discovery ("handshake works, big responses hang").
- TCP costs **1 RTT**, TLS 1.3 **1 RTT**; HTTP/3 over QUIC combines both into **1 RTT**.
- **TIME_WAIT** sits on the side that closes first (60 s on Linux); piles of **CLOSE_WAIT** = your app is not closing sockets. Fix port exhaustion with connection reuse.
- UDP when late data is useless or you build your own reliability; beware amplification DDoS.
- /n gives 2^(32−n) addresses; AWS reserves **5 per subnet**; never overlap CIDRs you may peer.
- NAT Gateway: **55,000 connections per unique destination**, 350 s idle timeout; use VPC endpoints.
- DNS: stub → recursive → root → TLD → authoritative, cached per TTL; **lower TTL before migrating**; alias at the apex.
- TLS 1.3: 1 RTT, forward secrecy, replayable 0-RTT; watch expiry and **missing intermediates**.
- HTTP/2 still has TCP head-of-line blocking; HTTP/3 removes it and survives network changes.
- gRPC behind an L4 balancer pins to one backend — balance at L7 or client-side.
- ~10 ms RTT per 1,000 km: move endpoints closer and cut the number of round trips.

## Summary

- OSI numbers are vocabulary; TCP/IP is what runs. Higher layers = smarter and more expensive.
- TCP buys reliability with round trips and state; TIME_WAIT and CLOSE_WAIT explain many incidents.
- UDP trades guarantees for latency and underpins QUIC.
- CIDR planning prevents overlap and IP exhaustion; NAT has port and idle limits.
- DNS is a TTL-governed cache; TLS 1.3 secures connections in one round trip with short-lived certificates.
- HTTP/2 and HTTP/3 cut connection overhead and are best terminated at the edge.
- L4 vs L7 balancing is raw speed versus protocol awareness.
- Latency = distance × round trips: reduce both.
