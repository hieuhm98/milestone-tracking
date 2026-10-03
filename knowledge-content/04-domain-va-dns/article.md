# Domain, URL & DNS

## 1. Domain (Tên miền) là gì?

**Ví von:** ngôi nhà nào cũng có toạ độ GPS chính xác, nhưng không ai chỉ đường bằng toạ độ — bạn nói "tiệm bánh trên đường Nguyễn Huệ". Toạ độ dành cho máy; cái tên dành cho con người.

Trên Internet, mỗi server có một địa chỉ dạng số gọi là **địa chỉ IP** (ví dụ `142.250.186.46`). Máy tính dùng các con số này để tìm nhau, nhưng con người thì không nhớ nổi.

**Domain** là tên dễ nhớ đại diện cho một địa chỉ IP trên Internet. Thay vì phải nhớ `142.250.186.46`, bạn chỉ cần gõ `google.com`.

Ở hậu trường, **DNS** (mục 7) dịch cái tên ngược lại thành con số mỗi lần bạn truy cập. Thêm một lợi ích: công ty có thể chuyển website sang server mới với IP mới, còn khách hàng vẫn gõ đúng cái tên cũ.

Domain là tài sản số — bạn phải **đăng ký** và **trả phí hàng năm** để sở hữu.

Nói chính xác thì bạn đang *thuê* cái tên, mỗi lần 1–10 năm. Nếu quên gia hạn, domain hết hạn và sau một thời gian ân hạn ngắn, bất kỳ ai cũng có thể đăng ký nó — kéo theo cả website lẫn email. Vì vậy việc gia hạn thường được bật tự động.

> **Hiểu lầm thường gặp:** domain không phải là website. Domain chỉ là *cái tên*; website là các file và code nằm trên server. Bạn có thể sở hữu domain mà không có website, giống như có tấm biển hiệu mà chưa có cửa hàng.

---

## 2. Cấu trúc của một domain

**Ví von:** đọc domain giống như đọc địa chỉ bưu điện nhưng từ phải sang trái: quốc gia → thành phố → đường → số nhà. Phần ngoài cùng bên phải là chung nhất.

```
blog.example.com.vn
 │      │      │  └─ ccTLD (đuôi tên miền quốc gia)
 │      │      └──── TLD (tên miền cấp cao nhất)
 │      └─────────── Second Level Domain (tên miền cấp 2)
 └────────────────── Subdomain (tên miền con)
```

### TLD (Top Level Domain)
Phần cuối cùng của domain:
- **gTLD** (generic): `.com`, `.org`, `.net`, `.edu`, `.gov`
- **ccTLD** (country code): `.vn` (Việt Nam), `.jp` (Nhật), `.uk` (Anh)
- **Mới**: `.io`, `.app`, `.dev`, `.tech`

Với đuôi hai phần như `.com.vn`, cấp cao nhất thật sự là `.vn`; `.com.vn` là một nhánh phân loại bên trong không gian của Việt Nam (giống `.edu.vn`, `.gov.vn`). Trong đời thường, mọi người cứ coi `.com.vn` là "phần đuôi".

### Second Level Domain
Tên chính bạn đăng ký: `google` trong `google.com`, `facebook` trong `facebook.com`.

### Subdomain
Tiền tố tự tạo để phân chia dịch vụ:
- `www.example.com` — trang web chính.
- `mail.example.com` — email server.
- `api.example.com` — API server.
- `docs.example.com` — tài liệu.
- `dev.example.com` — môi trường phát triển.

Khi đã sở hữu `example.com`, bạn có thể tạo bao nhiêu subdomain tuỳ thích, miễn phí, và trỏ mỗi cái tới một server khác nhau. Hãy hình dung domain là toà nhà bạn sở hữu, còn subdomain là các tầng do bạn tự đặt tên.

> **Ví dụ thực tế:** một ticket ghi "Bug chỉ xảy ra trên `staging.shop.com`, không xảy ra trên `shop.com`". Đây là hai subdomain trỏ tới hai môi trường khác nhau, nên tester phải kiểm tra mình thực sự đang dùng địa chỉ nào.

---

## 3. URI vs URL vs URN

Ba khái niệm này hay bị nhầm lẫn — nhưng có quan hệ **bao hàm**:

```
            URI (định danh tài nguyên)
           /                          \
        URL                          URN
   (vị trí + cách lấy)         (chỉ định danh)
```

**Ví von:** mã ISBN *đặt tên* duy nhất cho một cuốn sách nhưng không nói kệ nào trong thư viện nào có bản sao. "Kệ B3, Thư viện Thành phố" thì cho bạn biết phải *đi đâu*. Cả hai đều *định danh* cuốn sách.

- **URI** (Uniform Resource Identifier) — chuỗi định danh **bất kỳ** tài nguyên nào. Là khái niệm rộng nhất.
- **URL** (Uniform Resource Locator) — một loại URI **cho biết tài nguyên ở đâu** và **truy cập bằng cách nào** (giao thức). Đây là loại bạn gặp hằng ngày.
- **URN** (Uniform Resource Name) — một loại URI **chỉ đặt tên** cho tài nguyên, không nói nó ở đâu. Ví dụ: `urn:isbn:0451450523` (mã sách).

**Tài nguyên** (resource) đơn giản là "một thứ bạn có thể trỏ tới": một trang web, một ảnh, một file PDF, một mẩu dữ liệu.

| Loại | Ví dụ | Cho biết "ở đâu"? |
|------|-------|---|
| URL | `https://example.com/blog/post-1` | Có (https + host + path) |
| URN | `urn:isbn:0451450523` | Không — chỉ là tên |
| URI | Cả hai ví dụ trên đều là URI | Tùy loại |

**Quy tắc nhớ**: Mọi URL đều là URI, nhưng không phải URI nào cũng là URL.

---

## 4. Cấu trúc đầy đủ của URL

**Ví von:** URL là một chỉ dẫn giao hàng đầy đủ: "đi bằng xe máy (*cách nào*), tới toà nhà Example Shop (*ở đâu*), cửa số 443, phòng Sản phẩm (*cái gì*), món hàng số 123 (*chi tiết thêm*), mở sẵn ở trang Đánh giá (*xem chỗ nào*)."

```
https://shop.example.com:443/products/detail?id=123&lang=vi#reviews
│        │                │   │               │              │
│        │                │   │               │              fragment
│        │                │   │               query string
│        │                │   path
│        │                port (443 = mặc định HTTPS, có thể ẩn)
│        host = subdomain + domain + TLD
scheme (giao thức)
```

| Thành phần | Vai trò |
|-----------|---------|
| **Scheme** | Giao thức truy cập: `http`, `https`, `ftp`, `mailto`, `file` |
| **Host** | Địa chỉ máy chủ (domain hoặc IP) |
| **Port** | Cổng dịch vụ — `80` cho http, `443` cho https; nếu mặc định thì có thể bỏ |
| **Path** | Đường dẫn đến tài nguyên trên server |
| **Query** | Tham số `?key=value&key2=value2` — lọc, tìm kiếm, phân trang |
| **Fragment** | Mỏ neo `#section` — chỉ vị trí trong trang, **không gửi lên server** |

Nói đơn giản:

- **Port** — một server có thể cung cấp nhiều dịch vụ, mỗi dịch vụ sau một "cánh cửa" đánh số. Trình duyệt ẩn các cổng chuẩn; bạn chủ yếu thấy port khi phát triển, ví dụ `http://localhost:3000`.
- **Query** — bắt đầu bằng `?`, gồm các cặp `key=value` nối bằng `&`. `?q=laptop&sort=price` = "tìm laptop, sắp xếp theo giá".
- **Fragment** — bắt đầu bằng `#`. Trình duyệt giữ riêng phần này và cuộn tới đúng đoạn đó trong trang.

> **Tự thử nhé:** mở một bài Wikipedia và bấm vào một đề mục trong mục lục. Một fragment `#Ten_de_muc` xuất hiện trên thanh địa chỉ và trang nhảy tới đó — không hề tải lại.

---

## 5. Path — đường dẫn của một URL

**Path** là phần sau host, bắt đầu bằng `/`. Nó mô tả tài nguyên cụ thể bạn muốn truy cập.

### Path là cây phân cấp

Path mô phỏng **hệ thống thư mục**:

```
example.com/                 ← root
example.com/blog             ← danh sách bài viết
example.com/blog/seo         ← danh mục SEO
example.com/blog/seo/sitemap-la-gi  ← một bài cụ thể
example.com/products
example.com/products/laptop
example.com/products/laptop/macbook-pro
```

**Ví von:** giống các thư mục trên laptop, `Documents/Work/2026/report.docx` — mỗi dấu `/` là đi sâu thêm một thư mục.

Quan hệ "cha — con" trong path tạo nên **kiến trúc thông tin** (information architecture) của website.

### Phân biệt với query

| | Path | Query |
|--|------|-------|
| Vai trò | Định vị **tài nguyên duy nhất** | Tham số bổ sung, lọc, sắp xếp |
| Đổi thì sao | Tài nguyên khác hoàn toàn | Cùng tài nguyên, view khác |
| SEO | Quan trọng — Google index theo path | Thường bị bỏ qua hoặc canonical hóa |
| Ví dụ | `/products/laptop` | `?sort=price&page=2` |

### Các kiểu path phổ biến

- **Tĩnh**: `/about`, `/contact` — luôn cố định.
- **Động (slug)**: `/blog/cach-toi-uu-seo` — phần slug đại diện cho 1 bài viết.
- **Dynamic param**: `/users/123` — `123` là id user, server sẽ trả về dữ liệu khác nhau.
- **Lồng (nested)**: `/shop/category/laptop/asus` — phản ánh phân cấp danh mục.

**Slug** là phiên bản dễ đọc, an toàn cho URL của một tiêu đề: chữ thường, bỏ dấu, các từ nối bằng gạch ngang.

### Trailing slash
`/blog/` và `/blog` về kỹ thuật **có thể là 2 URL khác nhau**. Hầu hết website chọn 1 chuẩn rồi redirect 301 cái còn lại để tránh trùng lặp nội dung.

**Redirect 301** là server nói "trang này đã chuyển vĩnh viễn, hãy sang đây"; trình duyệt tự động đi theo.

---

## 6. Sitemap — bản đồ URL của website

**Ví von:** tấm bảng chỉ dẫn ở cửa trung tâm thương mại liệt kê mọi cửa hàng và tầng, để không ai bỏ sót cửa hàng nhỏ ở góc trong cùng.

**Sitemap** là danh sách tất cả URL quan trọng của một website, giúp **search engine** (Google, Bing) khám phá và index nội dung nhanh hơn.

Search engine dùng các chương trình gọi là **bot** (crawler) đi theo liên kết từ trang này sang trang khác. **Index** một trang nghĩa là lưu nó vào danh mục tìm kiếm để nó có thể xuất hiện trong kết quả.

### Vì sao cần sitemap?

- Website lớn có hàng nghìn URL — bot không thể tự crawl hết.
- Trang mới hoặc trang ít liên kết nội bộ → bot khó tìm thấy.
- Sitemap nói rõ với bot: "Đây là toàn bộ trang tôi muốn được index, ưu tiên thế nào, sửa lần cuối khi nào."

### Cấu trúc sitemap.xml

Sitemap thường đặt tại `https://example.com/sitemap.xml`:

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

| Thẻ | Ý nghĩa |
|-----|---------|
| `<loc>` | URL đầy đủ (bắt buộc) |
| `<lastmod>` | Ngày sửa lần cuối |
| `<changefreq>` | Tần suất thay đổi: `daily`, `weekly`, `monthly`... |
| `<priority>` | Mức ưu tiên 0.0 — 1.0 (tương đối trong cùng site) |

Trên thực tế, Google cho biết họ bỏ qua `<changefreq>` và `<priority>`, và chỉ dùng `<lastmod>` khi nó được cập nhật chính xác.

### Sitemap index — khi site quá lớn

Một file sitemap chỉ chứa tối đa **50.000 URL** hoặc **50MB**. Site lớn chia thành nhiều sitemap nhỏ rồi gom vào **sitemap index**:

```xml
<sitemapindex>
  <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-products.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>
```

### Quan hệ sitemap ↔ path

Sitemap chính là **danh sách các URL hợp lệ**, mà mỗi URL = `scheme + host + path`. Vì vậy:

- Path **rõ ràng, có cấu trúc cây** → sitemap tự nhiên dễ hiểu.
- Path lộn xộn, dài, nhiều tham số → sitemap khó duy trì, SEO yếu.
- Một path tốt = vừa thân thiện với người (đọc được, đoán được) vừa thân thiện với bot.

### robots.txt nói gì với sitemap?

File `robots.txt` ở root site thường khai báo vị trí sitemap:

```
User-agent: *
Disallow: /admin/
Sitemap: https://example.com/sitemap.xml
```

Nó là cách **chính thức** để báo cho bot biết sitemap ở đâu. `User-agent: *` nghĩa là "áp dụng cho mọi bot"; `Disallow` đề nghị bot không crawl một thư mục.

> **Hiểu lầm thường gặp:** `robots.txt` là một lời đề nghị lịch sự, không phải ổ khoá. Ai cũng vẫn mở được các trang đó; mọi thứ riêng tư phải được bảo vệ bằng đăng nhập.

---

## 7. DNS hoạt động như thế nào?

DNS (Domain Name System) là hệ thống phân cấp toàn cầu để phân giải domain thành IP.

**Ví von:** DNS là cuốn danh bạ điện thoại của Internet, nhưng không có cuốn nào chứa hết mọi số. Quầy lễ tân biết tầng nào phụ trách `.com`; tầng đó biết văn phòng nào phụ trách `example.com`; văn phòng đó biết con số chính xác. Một người trợ lý (**resolver**) đi hỏi dọc chuỗi đó giúp bạn và ghi nhớ câu trả lời.

- **Recursive resolver** — người trợ lý. Thường do nhà mạng (ISP) vận hành, hoặc dùng loại công cộng như Google `8.8.8.8` hay Cloudflare `1.1.1.1`.
- **Root / TLD server** — chỉ biết cần hỏi ai tiếp theo.
- **Authoritative nameserver** — nguồn sự thật cuối cùng, giữ các record của domain.

### Quá trình phân giải DNS đầy đủ:

```
1. Bạn gõ: www.example.com
2. Browser → kiểm tra cache nội bộ
3. Nếu miss → hỏi Recursive Resolver (DNS của ISP)
4. Resolver → hỏi Root DNS Server (.)
5. Root → "Hỏi TLD server .com"
6. Resolver → hỏi TLD server .com
7. TLD → "Hỏi Authoritative server của example.com"
8. Resolver → hỏi Authoritative DNS của example.com
9. Authoritative → trả về IP: 93.184.216.34
10. Resolver cache kết quả, trả về cho Browser
11. Browser kết nối đến 93.184.216.34
```

"Miss" nghĩa là câu trả lời không có trong cache. Việc đi hết cả chuỗi là hiếm: resolver trả lời phần lớn truy vấn ngay từ cache trong vài mili giây. (IP ở trên chỉ mang tính minh hoạ.)

### DNS Record Types

Một **record** là một dòng trong phần cài đặt DNS của domain: "tên này → giá trị này".

| Loại | Ý nghĩa | Ví dụ |
|------|---------|-------|
| **A** | Domain → IPv4 | `example.com → 93.184.216.34` |
| **AAAA** | Domain → IPv6 | `example.com → 2606:2800::68c6...` |
| **CNAME** | Domain → Domain khác (alias) | `www → example.com` |
| **MX** | Email server | `example.com → smtp.google.com` |
| **TXT** | Thông tin văn bản | Xác minh domain, SPF email... |
| **NS** | Nameserver của domain | `ns1.cloudflare.com` |

**IPv6** là định dạng địa chỉ mới hơn và lớn hơn rất nhiều. Nhờ **MX**, website và email của cùng một domain có thể nằm ở các server hoàn toàn khác nhau. **TXT** thường là nơi Google hay Microsoft yêu cầu bạn dán một mã để chứng minh mình sở hữu domain.

---

## 8. TTL (Time To Live)

Mỗi DNS record có **TTL** — thời gian (giây) mà kết quả được cache.

**Ví von:** giống "hạn sử dụng" đóng trên câu trả lời. Chừng nào chưa hết hạn, resolver dùng lại bản đã lưu mà không hỏi lại.

- TTL 3600 = cache 1 giờ.
- TTL thấp: thay đổi DNS áp dụng nhanh (vài phút) nhưng tốn tài nguyên server.
- TTL cao: tiết kiệm tài nguyên nhưng thay đổi mất nhiều thời gian lan truyền.

**Lưu ý thực tế**: Khi chuyển hosting, thay đổi DNS có thể mất 24–48 giờ để "propagate" (lan truyền) toàn cầu do TTL cũ.

Thực ra không có gì "di chuyển" cả: hàng nghìn resolver mỗi nơi giữ một bản cũ cho tới khi hết hạn. Đó là lý do bạn có thể thấy site mới trong khi đồng nghiệp vẫn thấy site cũ.

> **Ví dụ thực tế:** trước khi chuyển server theo kế hoạch, team hạ TTL từ 86400 (1 ngày) xuống 300 (5 phút) từ trước một ngày, để đến ngày chuyển, thay đổi tới được gần như tất cả mọi người chỉ trong vài phút.

---

## 9. DNS trong thực tế: tự tra cứu và xử lý sự cố

> **Tự thử nhé:** mở **Command Prompt** (Windows: Start → gõ `cmd`) hoặc **Terminal** (macOS: Spotlight → `Terminal`) rồi chạy `nslookup google.com`. Bạn sẽ thấy dòng `Server:` (resolver bạn đang dùng) và một hoặc nhiều dòng `Address:` — các IP của Google. "Non-authoritative answer" chỉ có nghĩa câu trả lời lấy từ cache của resolver.

| Bạn thấy gì | Thường có nghĩa là |
|---|---|
| `DNS_PROBE_FINISHED_NXDOMAIN` (Chrome) | Tên không tồn tại: gõ sai, domain hết hạn, hoặc thiếu record |
| Vào được bằng 4G nhưng không vào được bằng Wi-Fi công ty | Resolver của công ty giữ câu trả lời cũ hoặc chặn site |
| Bạn thấy site mới, đồng nghiệp thấy site cũ | Cache chưa hết hạn (TTL) |

Bước đầu tiên nên làm: kiểm tra chính tả, thử mạng khác, hoặc xoá cache cục bộ (`ipconfig /flushdns` trên Windows).

---

## 10. Đăng ký domain

Bạn đăng ký domain qua **Registrar** (nhà đăng ký):
- Quốc tế: GoDaddy, Namecheap, Google Domains, Cloudflare.
- Việt Nam: VNPT, Inet, Mắt Bão.

(Google Domains đã được bán cho Squarespace năm 2023; khách hàng cũ giờ quản lý domain tại đó.)

Sau khi đăng ký, bạn chỉnh DNS records tại **Nameserver** (thường cùng với registrar hoặc dịch vụ DNS riêng như Cloudflare).

**Ví von:** registrar là văn phòng địa chính ghi nhận ai sở hữu mảnh đất; nameserver là tấm biển chỉ đường cho khách biết ngôi nhà ở đâu. Muốn chuyển DNS sang Cloudflare, bạn đổi **NS record** của domain tại registrar, sau đó chỉnh mọi record khác trong Cloudflare.

> **Hiểu lầm thường gặp:** "Mua domain rồi nên website đã chạy." Đăng ký chỉ giữ chỗ cái tên. Bạn vẫn cần hosting (server chứa website) và các DNS record trỏ cái tên về đó.

---

## 11. Tóm tắt

- **Domain** = tên dễ nhớ thay cho IP; gồm subdomain + second-level + TLD.
- Domain được thuê theo năm qua **registrar**; để hết hạn thì người khác có thể lấy mất.
- **URI** là khái niệm tổng; **URL** = URI có vị trí; **URN** = URI chỉ là tên.
- **URL** = scheme + host + port + **path** + query + fragment.
- **Path** mô tả tài nguyên theo cấu trúc cây — quan trọng cho SEO và UX.
- **Sitemap.xml** = danh sách URL của site, giúp Google index; khai báo trong `robots.txt`.
- **DNS** phân giải domain → IP; **Record A** quan trọng nhất; **TTL** quyết định tốc độ cập nhật DNS.
- `nslookup` cho biết một tên được phân giải ra IP nào; phần lớn lỗi "không tìm thấy trang" là do gõ sai, domain hết hạn hoặc cache cũ.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| Địa chỉ IP | Địa chỉ dạng số của một thiết bị trên Internet |
| Domain / TLD | Tên dễ nhớ cho con người; phần đuôi của nó (`.com`, `.vn`) |
| Subdomain | Tiền tố bạn tự tạo: `api.`, `www.` |
| URL | Địa chỉ web đầy đủ: cách nào + ở đâu + cái gì |
| Path / Query / Fragment | Trang nào / tuỳ chọn thêm sau `?` / điểm nhảy sau `#` |
| Sitemap | Danh sách URL quan trọng của site dành cho search engine |
| DNS / Resolver | Hệ thống tên → IP / dịch vụ đi tra câu trả lời giúp bạn |
| DNS record | Một mục "tên → giá trị" (A, CNAME, MX, TXT, NS) |
| TTL | Thời gian (giây) một câu trả lời DNS được phép cache |
| Registrar / Nameserver | Nơi bán tên miền / nơi giữ DNS record của nó |
