# Domain, URL & DNS

## 1. What Is a Domain?

**Analogy:** every house has a precise GPS coordinate, but nobody gives directions with coordinates — you say "the bakery on Nguyen Hue street". The coordinate is for machines; the name is for people.

On the Internet, every server has a number address called an **IP address** (for example `142.250.186.46`). Computers use these numbers to find each other, but people cannot remember them.

A **domain** is an easy-to-remember name that represents an IP address on the Internet. Instead of having to remember `142.250.186.46`, you just type `google.com`.

Behind the scenes, **DNS** (section 7) translates the name back into the number on every visit. A bonus: a company can move its website to a new server with a new IP, and customers keep typing the same name.

A domain is a digital asset — you must **register** it and **pay an annual fee** to own it.

Strictly speaking you are *renting* the name, 1–10 years at a time. If you forget to renew, the domain expires and, after a short grace period, anyone can register it — website and email included. That is why renewals are usually set to automatic.

> **Common misconception:** a domain is not a website. The domain is only the *name*; the website is the files and code on a server. You can own a domain with no website, just as you can own a shop sign without a shop.

---

## 2. The Structure of a Domain

**Analogy:** read a domain like a postal address, but from right to left: country → city → street → house. The rightmost part is the most general.

```
blog.example.com.vn
 │      │      │  └─ ccTLD (country code TLD)
 │      │      └──── TLD (Top Level Domain)
 │      └─────────── Second Level Domain
 └────────────────── Subdomain
```

### TLD (Top Level Domain)
The final part of a domain:
- **gTLD** (generic): `.com`, `.org`, `.net`, `.edu`, `.gov`
- **ccTLD** (country code): `.vn` (Vietnam), `.jp` (Japan), `.uk` (United Kingdom)
- **New**: `.io`, `.app`, `.dev`, `.tech`

In a two-part ending such as `.com.vn`, the true top level is `.vn`; `.com.vn` is a category inside Vietnam's space (like `.edu.vn`, `.gov.vn`). Day to day, people simply treat `.com.vn` as "the ending".

### Second Level Domain
The main name you register: `google` in `google.com`, `facebook` in `facebook.com`.

### Subdomain
A self-created prefix used to divide up services:
- `www.example.com` — the main website.
- `mail.example.com` — the email server.
- `api.example.com` — the API server.
- `docs.example.com` — documentation.
- `dev.example.com` — the development environment.

Once you own `example.com`, you can create as many subdomains as you like, for free, and point each one to a different server. Think of the domain as a building you own and subdomains as floors you label yourself.

> **Real-life work example:** a ticket says "Bug only happens on `staging.shop.com`, not on `shop.com`". These are two subdomains pointing to two different environments, so the tester must check which address they were actually using.

---

## 3. URI vs. URL vs. URN

These three concepts are often confused — but they have a **containment** relationship:

```
            URI (resource identifier)
           /                          \
        URL                          URN
   (location + how to fetch)      (name only)
```

**Analogy:** a book's ISBN *names* it uniquely but does not say which library shelf holds a copy. "Shelf B3, City Library" tells you *where* to go. Both *identify* the book.

- **URI** (Uniform Resource Identifier) — a string that identifies **any** resource. This is the broadest concept.
- **URL** (Uniform Resource Locator) — a type of URI that tells you **where the resource is** and **how to access it** (the protocol). This is the type you encounter every day.
- **URN** (Uniform Resource Name) — a type of URI that only **names** the resource, without saying where it is. Example: `urn:isbn:0451450523` (a book identifier).

A **resource** simply means "a thing you can point to": a web page, an image, a PDF, a piece of data.

| Type | Example | Tells you "where"? |
|------|-------|---|
| URL | `https://example.com/blog/post-1` | Yes (https + host + path) |
| URN | `urn:isbn:0451450523` | No — it is only a name |
| URI | Both examples above are URIs | Depends on the type |

**Rule of thumb**: Every URL is a URI, but not every URI is a URL.

---

## 4. The Full Structure of a URL

**Analogy:** a URL is a complete delivery instruction: "by motorbike (*how*), to the Example Shop building (*where*), door 443, Products department (*what*), item 123 (*extra details*), open at the Reviews page (*where to look*)."

```
https://shop.example.com:443/products/detail?id=123&lang=vi#reviews
│        │                │   │               │              │
│        │                │   │               │              fragment
│        │                │   │               query string
│        │                │   path
│        │                port (443 = HTTPS default, can be hidden)
│        host = subdomain + domain + TLD
scheme (protocol)
```

| Component | Role |
|-----------|---------|
| **Scheme** | The access protocol: `http`, `https`, `ftp`, `mailto`, `file` |
| **Host** | The server address (domain or IP) |
| **Port** | The service port — `80` for http, `443` for https; can be omitted if default |
| **Path** | The path to the resource on the server |
| **Query** | Parameters `?key=value&key2=value2` — filtering, searching, pagination |
| **Fragment** | An anchor `#section` — points to a location within the page, **not sent to the server** |

In plain words:

- **Port** — one server can offer many services, each behind a numbered "door". Browsers hide the standard ones; you mostly see ports in development, e.g. `http://localhost:3000`.
- **Query** — starts with `?`, pairs of `key=value` joined by `&`. `?q=laptop&sort=price` = "search laptop, sort by price".
- **Fragment** — starts with `#`. The browser keeps it to itself and scrolls to that part of the page.

> **Try it yourself:** open a Wikipedia article and click a heading in its table of contents. A `#Heading_name` fragment appears in the address bar and the page jumps — without reloading.

---

## 5. Path — the Path of a URL

The **path** is the part after the host, starting with `/`. It describes the specific resource you want to access.

### The Path Is a Hierarchical Tree

A path mimics a **directory structure**:

```
example.com/                 ← root
example.com/blog             ← list of posts
example.com/blog/seo         ← the SEO category
example.com/blog/seo/sitemap-la-gi  ← a specific post
example.com/products
example.com/products/laptop
example.com/products/laptop/macbook-pro
```

**Analogy:** folders on your laptop, `Documents/Work/2026/report.docx` — each `/` steps one folder deeper.

The "parent–child" relationship in the path forms the **information architecture** of the website.

### Distinguishing It from the Query

| | Path | Query |
|--|------|-------|
| Role | Locates a **unique resource** | Additional parameters: filter, sort |
| What if it changes | An entirely different resource | The same resource, a different view |
| SEO | Important — Google indexes by path | Often ignored or canonicalized |
| Example | `/products/laptop` | `?sort=price&page=2` |

### Common Path Types

- **Static**: `/about`, `/contact` — always fixed.
- **Dynamic (slug)**: `/blog/cach-toi-uu-seo` — the slug part represents a single post.
- **Dynamic param**: `/users/123` — `123` is the user id, and the server returns different data accordingly.
- **Nested**: `/shop/category/laptop/asus` — reflects the category hierarchy.

A **slug** is a readable, URL-safe version of a title: lowercase, no accents, words joined by hyphens.

### Trailing Slash
`/blog/` and `/blog` can technically **be two different URLs**. Most websites pick one standard and 301-redirect the other to avoid duplicate content.

A **301 redirect** is the server saying "this page has moved permanently, go here"; the browser follows it automatically.

---

## 6. Sitemap — the URL Map of a Website

**Analogy:** the directory board at a mall entrance lists every shop and floor, so nobody misses the small shop in the back corner.

A **sitemap** is a list of all the important URLs of a website, helping **search engines** (Google, Bing) discover and index content faster.

Search engines use programs called **bots** (crawlers) that follow links from page to page. To **index** a page means to store it in the search catalogue so it can appear in results.

### Why Do You Need a Sitemap?

- Large websites have thousands of URLs — bots cannot crawl them all on their own.
- New pages or pages with few internal links → bots have trouble finding them.
- The sitemap tells the bot clearly: "Here are all the pages I want indexed, their priorities, and when they were last modified."

### The Structure of sitemap.xml

The sitemap is usually located at `https://example.com/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-05-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/blog/sitemap-la-gi</loc>
    <lastmod>2026-04-20</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

| Tag | Meaning |
|-----|---------|
| `<loc>` | The full URL (required) |
| `<lastmod>` | The date of the last modification |
| `<changefreq>` | Change frequency: `daily`, `weekly`, `monthly`, etc. |
| `<priority>` | Priority level 0.0 — 1.0 (relative within the same site) |

In practice Google says it ignores `<changefreq>` and `<priority>`, and uses `<lastmod>` only when it is kept accurate.

### Sitemap Index — When the Site Is Too Large

A single sitemap file can contain at most **50,000 URLs** or **50MB**. Large sites split it into several smaller sitemaps and gather them into a **sitemap index**:

```xml
<sitemapindex>
  <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-products.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>
```

### The Relationship Between Sitemap and Path

A sitemap is essentially a **list of valid URLs**, where each URL = `scheme + host + path`. Therefore:

- A **clear, tree-structured** path → a naturally understandable sitemap.
- A messy, long path with many parameters → a sitemap that is hard to maintain, with weak SEO.
- A good path is both human-friendly (readable, guessable) and bot-friendly.

### What robots.txt Says About the Sitemap

The `robots.txt` file at the site root usually declares the sitemap's location:

```
User-agent: *
Disallow: /admin/
Sitemap: https://example.com/sitemap.xml
```

This is the **official** way to tell bots where the sitemap is. `User-agent: *` means "for all bots"; `Disallow` asks them not to crawl a folder.

> **Common misconception:** `robots.txt` is a polite request, not a lock. Anyone can still open those pages; anything private must be protected by a login.

---

## 7. How Does DNS Work?

DNS (Domain Name System) is a global hierarchical system for resolving domains into IPs.

**Analogy:** DNS is the Internet's phone book, but no single book holds every number. A front desk knows which floor handles `.com`; that floor knows which office handles `example.com`; that office knows the exact number. An assistant (the **resolver**) walks the chain for you and remembers the answer.

- **Recursive resolver** — the assistant. Usually run by your Internet provider (ISP), or a public one such as Google `8.8.8.8` or Cloudflare `1.1.1.1`.
- **Root / TLD servers** — only know who to ask next.
- **Authoritative nameserver** — the final source of truth that holds the domain's records.

### The Complete DNS Resolution Process:

```
1. You type: www.example.com
2. Browser → checks its local cache
3. If a miss → asks the Recursive Resolver (the ISP's DNS)
4. Resolver → asks the Root DNS Server (.)
5. Root → "Ask the .com TLD server"
6. Resolver → asks the .com TLD server
7. TLD → "Ask the Authoritative server for example.com"
8. Resolver → asks the Authoritative DNS for example.com
9. Authoritative → returns the IP: 93.184.216.34
10. Resolver caches the result and returns it to the Browser
11. Browser connects to 93.184.216.34
```

A "miss" means the answer was not in the cache. The full walk is rare: resolvers answer most lookups from their cache in a few milliseconds. (The IP above is only an illustration.)

### DNS Record Types

A **record** is one line in a domain's DNS settings: "this name → this value".

| Type | Meaning | Example |
|------|---------|-------|
| **A** | Domain → IPv4 | `example.com → 93.184.216.34` |
| **AAAA** | Domain → IPv6 | `example.com → 2606:2800::68c6...` |
| **CNAME** | Domain → another domain (alias) | `www → example.com` |
| **MX** | Email server | `example.com → smtp.google.com` |
| **TXT** | Text information | Domain verification, email SPF, etc. |
| **NS** | The domain's nameserver | `ns1.cloudflare.com` |

**IPv6** is the newer, much larger address format. **MX** means the website and the email of a domain can live on completely different servers. **TXT** is often where Google or Microsoft ask you to paste a code to prove you own the domain.

---

## 8. TTL (Time To Live)

Every DNS record has a **TTL** — the time (in seconds) the result is cached.

**Analogy:** a "best before" date stamped on the answer. Until it expires, resolvers reuse their saved copy without asking again.

- TTL 3600 = cached for 1 hour.
- Low TTL: DNS changes take effect quickly (within minutes) but consume more server resources.
- High TTL: saves resources but changes take longer to propagate.

**Practical note**: When switching hosting, DNS changes can take 24–48 hours to "propagate" globally because of the old TTL.

Nothing is actually travelling: thousands of resolvers each hold an old copy until it expires. That is why you may see the new site while a colleague still sees the old one.

> **Real-life work example:** before a planned server move, the team lowers the TTL from 86400 (1 day) to 300 (5 minutes) a day in advance, so on move day the switch reaches almost everyone within minutes.

---

## 9. DNS in Practice: Look It Up and Troubleshoot

> **Try it yourself:** open **Command Prompt** (Windows: Start → type `cmd`) or **Terminal** (macOS: Spotlight → `Terminal`) and run `nslookup google.com`. You will see a `Server:` line (your resolver) and one or more `Address:` lines — Google's IPs. "Non-authoritative answer" just means it came from a resolver's cache.

| What you see | What it usually means |
|---|---|
| `DNS_PROBE_FINISHED_NXDOMAIN` (Chrome) | The name does not exist: a typo, an expired domain, or a missing record |
| Works on mobile data, not on office Wi-Fi | The office resolver has a stale answer or blocks the site |
| You see the new site, a colleague the old one | Caches have not expired yet (TTL) |

First steps: check the spelling, try another network, or clear your local cache (`ipconfig /flushdns` on Windows).

---

## 10. Registering a Domain

You register a domain through a **Registrar**:
- International: GoDaddy, Namecheap, Google Domains, Cloudflare.
- Vietnam: VNPT, Inet, Mắt Bão.

(Google Domains was sold to Squarespace in 2023; its customers now manage domains there.)

After registering, you edit the DNS records at the **Nameserver** (usually with the registrar itself or a separate DNS service such as Cloudflare).

**Analogy:** the registrar is the land office that records who owns the plot; the nameserver is the signpost telling visitors where the house is. To move DNS to Cloudflare, you change the domain's **NS records** at the registrar, then edit all other records in Cloudflare.

> **Common misconception:** "We bought the domain, so the website is live." Registering only reserves the name. You still need hosting (a server with the website) and DNS records pointing the name to it.

---

## 11. Summary

- **Domain** = an easy-to-remember name in place of an IP; it consists of subdomain + second-level + TLD.
- A domain is rented yearly through a **registrar**; let it expire and someone else can take it.
- **URI** is the general concept; **URL** = a URI with a location; **URN** = a URI that is just a name.
- **URL** = scheme + host + port + **path** + query + fragment.
- **Path** describes a resource in a tree structure — important for SEO and UX.
- **Sitemap.xml** = the list of a site's URLs, helping Google index it; declared in `robots.txt`.
- **DNS** resolves a domain → IP; the **A record** is the most important; **TTL** determines how fast DNS updates take effect.
- `nslookup` shows what IP a name resolves to; most "site not found" errors are typos, expired domains or stale caches.

### Key terms

| Term | Plain-language meaning |
|---|---|
| IP address | The numeric address of a device on the Internet |
| Domain / TLD | A human-friendly name; its last part (`.com`, `.vn`) |
| Subdomain | A prefix you create yourself: `api.`, `www.` |
| URL | A full web address: how + where + what |
| Path / Query / Fragment | Which page / extra options after `?` / jump point after `#` |
| Sitemap | A list of a site's important URLs for search engines |
| DNS / Resolver | The name → IP system / the service that looks answers up |
| DNS record | One "name → value" entry (A, CNAME, MX, TXT, NS) |
| TTL | How long a DNS answer may be cached, in seconds |
| Registrar / Nameserver | Who sells the name / who holds its DNS records |
