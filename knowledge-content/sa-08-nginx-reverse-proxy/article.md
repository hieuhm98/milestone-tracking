# Nginx – Reverse proxy, load balancing & caching

## 1. Nginx và mô hình hướng sự kiện

Nginx (đọc là "engine-x") là web server, **proxy ngược** (reverse proxy), **bộ cân bằng tải** (load balancer) và HTTP cache gói gọn trong một binary. Nó ra đời để giải **bài toán C10K** — phục vụ mười nghìn kết nối đồng thời trên một máy — thứ mà mô hình "mỗi kết nối một process hoặc thread" xử lý rất kém.

```text
              +------------------+
              |  master process  |  reads config, binds :80/:443,
              +--------+---------+  manages workers, handles signals
         +-------------+-------------+
         v             v             v
   +----------+  +----------+  +----------+
   | worker 1 |  | worker 2 |  | worker N |   worker_processes auto;
   |  epoll   |  |  epoll   |  |  epoll   |   (one per CPU core)
   +----------+  +----------+  +----------+
   each: one thread, thousands of non-blocking sockets
```

- Mỗi **worker** chạy đơn luồng với một **vòng lặp sự kiện** (event loop) trên `epoll` (Linux) hoặc `kqueue` (BSD). Nó không bao giờ ngồi chờ một socket; nó hỏi kernel socket nào đã sẵn sàng rồi xử lý lần lượt. Một kết nối keep-alive đang rảnh chỉ tốn vài kilobyte, không tốn cả một thread.
- `worker_connections` (mặc định 512) tính **cho mỗi worker**, và một request được proxy dùng hai kết nối (phía client + phía upstream). Giới hạn file descriptor (`worker_rlimit_nofile`) cũng chặn trần con số này.
- Việc blocking (đọc đĩa chậm) làm treo mọi kết nối của worker đó; `aio threads` đẩy file I/O sang một thread pool.

**Reload không downtime:** `nginx -t` kiểm tra cấu hình; `nginx -s reload` khiến master nạp cấu hình mới, khởi động worker mới và để worker cũ xử lý nốt các request đang dở rồi thoát. Cấu hình lỗi sẽ bị từ chối và worker cũ vẫn tiếp tục phục vụ.

---

## 2. Reverse proxy và forward proxy

```text
Forward proxy (acts for clients)
  [laptop] --> [office proxy] --> internet     site sees the proxy IP

Reverse proxy (acts for servers)
  clients --> [nginx :443] --> app-1:3000      client sees only nginx
                           --> app-2:3000
```

| | Forward proxy | Reverse proxy |
|---|---|---|
| Ai cấu hình | Phía client (`HTTPS_PROXY`, trình duyệt) | Chủ server (DNS trỏ vào nó) |
| Che giấu | Client | Các backend |
| Dùng để | Lọc traffic đi ra, chính sách nội dung | TLS termination, cân bằng tải, cache, định tuyến |
| Công cụ | Squid, secure web gateway | Nginx, HAProxy, Envoy, ALB |

Nginx là reverse proxy; nginx lõi không hỗ trợ method `CONNECT`, nên nó không phải forward proxy HTTPS đa dụng. Trên AWS, vai trò reverse proxy chính là ALB.

---

## 3. Cấu trúc cấu hình: context và server block

Cấu hình là một cây các **context** (khối) chứa các **directive** kết thúc bằng `;`. Phần lớn directive được kế thừa từ context ngoài vào context trong.

```nginx
worker_processes auto;
events { worker_connections 4096; }

http {
    include  /etc/nginx/mime.types;
    sendfile on;

    server {
        listen      80 default_server;
        server_name _;
        return      444;             # drop requests for unknown hosts
    }

    server {
        listen      80;
        server_name shop.example.com www.shop.example.com;
        location / { proxy_pass http://127.0.0.1:3000; }
    }
}
```

Một **server block** là một virtual host. Nginx chọn cổng theo `listen`, rồi so header `Host` với `server_name` theo thứ tự: **tên chính xác** → **wildcard dài nhất bắt đầu bằng `*`** (`*.example.com`) → **wildcard dài nhất kết thúc bằng `*`** (`mail.*`) → **regex đầu tiên** khớp theo thứ tự trong file. Không khớp gì thì **default server** của cổng đó trả lời — block có `default_server`, nếu không có thì là block được khai báo đầu tiên. Đó là lý do một domain lạ đôi khi rơi vào nhầm website.

---

## 4. Cách nginx chọn location

| Modifier | Ý nghĩa |
|---|---|
| `= /path` | Khớp chính xác; dừng ngay |
| `^~ /path` | Prefix mà nếu là prefix dài nhất thì **bỏ qua regex** |
| `~` / `~*` | Regex, phân biệt / không phân biệt hoa thường |
| `/path` | Prefix thường |

```text
1. Exact "=" match?                        -> use it
2. Remember the LONGEST matching prefix
3. That prefix has ^~ ?                    -> use it
4. Try regexes IN FILE ORDER               -> first match wins
5. No regex matched                        -> use remembered prefix
```

```nginx
location = /healthz      { return 200 "ok"; }
location ^~ /static/     { root /var/www; }
location ~* \.(png|jpg)$ { expires 30d; }
location /               { proxy_pass http://app; }
```

`/static/logo.png` đi vào `^~ /static/`. Nếu bỏ `^~`, regex ảnh sẽ thắng, vì regex được ưu tiên hơn prefix thường. Thứ tự trong file **chỉ** có ý nghĩa giữa các regex với nhau.

---

## 5. proxy_pass, header và dấu gạch chéo cuối

`proxy_pass` có **phần URI** hay không (bất cứ thứ gì sau host:port, kể cả chỉ một dấu `/`) sẽ quyết định đường dẫn mà backend nhận được:

- **Không có URI** (`http://app:3000`) — URI của request được chuyển nguyên vẹn.
- **Có URI** (`http://app:3000/`) — phần khớp với `location` bị **thay thế** bằng URI đó.

| location | proxy_pass | Request | Backend nhận |
|---|---|---|---|
| `/api/` | `http://app:3000` | `/api/users` | `/api/users` |
| `/api/` | `http://app:3000/` | `/api/users` | `/users` |
| `/api/` | `http://app:3000/v2/` | `/api/users` | `/v2/users` |
| `/api` | `http://app:3000/` | `/api/users` | `//users` |
| `/api/` | `http://app:3000/v2` | `/api/users` | `/v2users` |

Hãy giữ dấu gạch chéo đối xứng. Không được đặt phần URI trong location dạng regex, và một prefix location kết thúc bằng `/` có `proxy_pass` sẽ trả **301** cho `/api` sang `/api/`.

Mặc định nginx đặt `Host` bằng tên upstream và dùng HTTP/1.0 khi nói chuyện với backend, nên hãy đặt header tường minh:

```nginx
location /api/ {
    proxy_pass         http://app_backend/;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

Thiếu `X-Forwarded-Proto`, ứng dụng đứng sau TLS termination tưởng mọi request là HTTP thường và có thể redirect sang `https` vòng lặp vô tận.

---

## 6. Upstream và các thuật toán cân bằng tải

```nginx
upstream app_backend {
    least_conn;
    server 10.0.1.10:3000 weight=3;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 backup;
    keepalive 32;
}
```

| Thuật toán | Directive | Chọn khi |
|---|---|---|
| Weighted round robin | *(mặc định)* | Request tương tự nhau, backend stateless |
| Least connections | `least_conn` | Thời gian xử lý request chênh lệch lớn |
| IP hash | `ip_hash` | Cần "dính" (sticky) thô theo địa chỉ client |
| Generic hash | `hash $key consistent` | Gắn một key (user, URL) vào một node, ít bị xáo trộn khi thêm/bớt node |
| Hai lựa chọn ngẫu nhiên | `random two least_conn` | Nhiều instance nginx cùng chia một pool |

- **Health check** trong nginx mã nguồn mở là **thụ động** (passive): sau `max_fails` (mặc định 1) lỗi trong `fail_timeout` (mặc định 10s), server bị bỏ qua trong `fail_timeout`. `health_check` chủ động là tính năng NGINX Plus.
- `proxy_next_upstream` (mặc định `error timeout`) thử lại ở server khác, nhưng không thử lại POST và các request không idempotent trừ khi thêm `non_idempotent`.
- **Keepalive tới upstream** cần đủ ba thứ: `keepalive N`, `proxy_http_version 1.1` và `proxy_set_header Connection "";`. Thiếu một thứ là mỗi request mở một kết nối TCP mới, socket `TIME_WAIT` chất đống.

Nên ưu tiên backend stateless và lưu session trong Redis thay vì dùng sticky.

---

## 7. TLS termination, HTTP/2 và HTTP/3

**TLS termination**: nginx giải mã ở biên và proxy HTTP thường vào mạng private. Chứng chỉ chỉ nằm ở một chỗ.

```nginx
server {
    listen 80;
    server_name shop.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2  on;
    server_name shop.example.com;

    ssl_certificate     /etc/ssl/shop/fullchain.pem;
    ssl_certificate_key /etc/ssl/shop/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=63072000" always;
    location / { proxy_pass http://app_backend; }
}
```

Hai phương án khác: **re-encryption** (proxy tới `https://` khi bắt buộc mã hoá trên đường truyền ở mọi chặng) và **passthrough** (module `stream` chuyển TCP thô; backend giữ private key, nhưng không định tuyến L7 được).

- `ssl_certificate` phải chứa **full chain**; file chỉ có chứng chỉ lá chạy được trên vài trình duyệt nhưng lỗi với `curl` và nhiều client di động.
- **HTTP/2**: từ 1.25.1 dùng `http2 on;` (`listen … http2` đã deprecated). Nó áp dụng cho phía client; `proxy_pass` tới backend vẫn là HTTP/1.x.
- **HTTP/3** (QUIC trên UDP 443) có từ 1.25.0: `listen 443 quic reuseport;` kèm header `Alt-Svc`, và nhớ mở UDP 443.

---

## 8. Phục vụ file tĩnh và gzip

Nginx phục vụ file rẻ hơn nhiều so với runtime của ứng dụng, nhờ `sendfile` sao chép thẳng từ page cache sang socket ngay trong kernel.

```nginx
location /assets/ {
    root    /var/www/shop;           # /assets/a.js -> /var/www/shop/assets/a.js
    expires 1y;
}

location /media/ {
    alias   /data/uploads/;          # /media/a.png -> /data/uploads/a.png
}

location / {
    root      /var/www/shop;
    try_files $uri $uri/ /index.html;   # SPA fallback
}

gzip            on;
gzip_comp_level 5;
gzip_types      text/css application/javascript application/json image/svg+xml;
gzip_vary       on;
```

- `root` **nối thêm** toàn bộ URI; `alias` **thay thế** phần prefix của location.
- Asset có dấu vân tay (`app.3f9a1c.js`) có thể cache một năm; `index.html` thì không.
- Khi bật gzip, `text/html` luôn được nén; các kiểu khác phải liệt kê trong `gzip_types`. Đừng nén JPEG, PNG, video, zip — chúng đã được nén sẵn. Brotli cần module bên thứ ba.

---

## 9. Proxy cache

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m
                 max_size=1g inactive=60m use_temp_path=off;

location /products/ {
    proxy_cache           app_cache;
    proxy_cache_valid     200 10m;
    proxy_cache_valid     404 1m;
    proxy_cache_lock      on;
    proxy_cache_use_stale error timeout updating http_502 http_503 http_504;
    add_header            X-Cache-Status $upstream_cache_status;
    proxy_pass            http://app_backend;
}
```

- `keys_zone` là vùng shared memory chứa key (1 MB ≈ 8.000 key); `max_size` giới hạn dung lượng đĩa; `inactive` xoá các mục không được truy cập trong khoảng thời gian đó.
- Key mặc định là `$scheme$proxy_host$request_uri`; chỉ `GET` và `HEAD` được cache.
- Nginx tôn trọng `Cache-Control`/`Expires` từ upstream, và mặc định bỏ qua response có `Set-Cookie` hoặc `Cache-Control: private`/`no-store`.
- `proxy_cache_lock` chỉ cho một request mỗi key đi lên upstream, số còn lại chờ — chống **cache stampede**. `proxy_cache_use_stale` trả bản cũ khi backend lỗi.

`$upstream_cache_status` cho biết `HIT`, `MISS`, `EXPIRED`, `STALE`, `UPDATING`. Đừng bao giờ cache trang cá nhân hoá với key không chứa thông tin user. Chiến lược invalidation nằm ở bài caching strategies.

---

## 10. Giới hạn tốc độ và giới hạn kết nối

`limit_req` là thuật toán **leaky bucket** theo từng key; `limit_conn` giới hạn số kết nối đồng thời theo key.

```nginx
http {
    limit_req_zone  $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=peraddr:10m;

    server {
        location /api/ {
            limit_req        zone=api burst=20 nodelay;
            limit_req_status 429;
            limit_conn       peraddr 20;
            proxy_pass       http://app_backend;
        }
    }
}
```

- `rate=10r/s` được theo dõi theo mili giây: một request mỗi 100 ms. Không có `burst`, request thứ hai trong 100 ms đó bị từ chối.
- `burst=20` xếp hàng tối đa 20 request vượt mức và nhả chúng theo đúng tốc độ; `nodelay` chuyển chúng đi **ngay lập tức** nhưng vẫn chiếm slot burst.
- Mã từ chối mặc định là **503**; `limit_req_status 429` rõ nghĩa hơn với client.
- `$binary_remote_addr` tiết kiệm bộ nhớ; 1 MB chứa khoảng 16.000 trạng thái.

Bẫy: **đứng sau load balancer** thì mọi request có chung IP của LB, nên phải khôi phục IP thật bằng `set_real_ip_from` và `real_ip_header X-Forwarded-For`. Và bộ đếm là **riêng từng instance nginx** — bốn node thì tốc độ thực tế cho phép xấp xỉ gấp 4. Giới hạn toàn cục cần Redis hoặc API gateway.

---

## 11. WebSocket, streaming và timeout

WebSocket bắt đầu bằng một request HTTP/1.1 có `Upgrade: websocket` và `Connection: Upgrade`. Đây là header **hop-by-hop**, nên nginx sẽ không chuyển tiếp nếu bạn không chỉ định:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    location /ws/ {
        proxy_pass         http://chat_backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection $connection_upgrade;
        proxy_read_timeout 3600s;
    }
}
```

```text
client               nginx                 backend
  |-- GET Upgrade ----->|                      |
  |                     |-- GET Upgrade ------>|
  |                     |<-- 101 Switching ----|
  |<-- 101 -------------|                      |
  |<=========== frames tunnelled both ways ===>|
```

| Directive | Mặc định | Tác dụng |
|---|---|---|
| `proxy_connect_timeout` | 60s | Thời gian mở kết nối tới upstream |
| `proxy_read_timeout` | 60s | Khoảng lặng tối đa **giữa hai lần đọc** — quá thì 504, hoặc WebSocket bị đóng |
| `client_max_body_size` | 1m | Upload lớn hơn nhận **413** |
| `proxy_buffering` | on | Tắt đi cho Server-Sent Events |

WebSocket rảnh sẽ bị đóng sau 60 s nếu không tăng timeout hoặc ứng dụng không gửi ping. Với SSE, hãy tắt buffering (`proxy_buffering off;` hoặc backend gửi header `X-Accel-Buffering: no`), nếu không sự kiện sẽ đến thành từng cục.

---

## 12. Lỗi cấu hình thường gặp và cách xử lý

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| **502 Bad Gateway** | Backend chết, sai cổng, kết nối bị từ chối hoặc reset |
| **504 Gateway Timeout** | Backend còn sống nhưng chậm hơn `proxy_read_timeout` |
| **499** trong access log | Client đóng kết nối trước (mã riêng của nginx) |
| **413** | Upload vượt `client_max_body_size` |
| Backend nhận `//users` | Lệch dấu gạch chéo giữa `location` và `proxy_pass` |
| Redirect HTTPS vòng lặp | Ứng dụng không nhận được `X-Forwarded-Proto` |
| Mất security header ở một location | Có `add_header` khai báo trong location đó |
| Traffic vẫn đi tới IP cũ | Hostname trong `proxy_pass` chỉ được resolve một lần khi nạp cấu hình |

- **Kế thừa `add_header`:** header ở cấp ngoài chỉ được kế thừa **khi cấp hiện tại không có `add_header` nào**. Thêm một `X-Cache-Status` trong location là âm thầm làm mất HSTS ở cấp server. Thiếu `always` thì header không được gắn vào response lỗi.
- **Lỗ hổng `alias`:** `location /img { alias /data/images/; }` biến `/img../secret` thành `/data/images/../secret`. Hãy dùng `location /img/`.
- **`if` trong `location`** chỉ an toàn với `return` hoặc `rewrite … last`; ưu tiên `map` và `try_files`.
- **DNS:** với backend đổi IP liên tục (ELB, container), dùng `resolver` kèm biến trong `proxy_pass`, hoặc tham số `resolve` trên server của upstream ở các bản gần đây.
- Luôn chạy `nginx -t` trước `reload`, và đọc `error.log` — lỗi upstream được giải thích ở đó, không phải ở access log.

---

## 13. Nginx vs HAProxy vs Envoy vs cloud load balancer

| | Nginx | HAProxy | Envoy | Cloud LB (ALB/NLB) |
|---|---|---|---|---|
| Thế mạnh | Web server + proxy + cache | Load balancer thuần L4/L7 | Proxy động cho service mesh | Được quản lý, tự co giãn |
| File tĩnh / cache | Có / có | Không / nhỏ | Không / hạn chế | Không (dùng CDN) |
| Thay đổi cấu hình | File + reload | File + reload, runtime API | **xDS API**, không cần reload | API / IaC |
| Active health check (OSS) | Không (Plus) | Có | Có | Có |
| Chỗ thường gặp | Biên của app, Ingress | Tầng LB traffic lớn | Data plane của Istio, gateway | Cửa ngõ workload AWS |

- **Nginx** khi bạn cần thêm file tĩnh, cache hoặc rewrite với cấu hình quen thuộc.
- **HAProxy** khi cân bằng tải chính là sản phẩm: stick table, active check, số kết nối cực lớn.
- **Envoy** khi hàng trăm service cần đẩy cấu hình trực tiếp, retry, circuit breaking và tracing — thường dưới Istio.
- **Cloud LB** khi bạn không muốn tự vận hành proxy. Bố cục phổ biến trên AWS: **ALB (TLS, định tuyến) → nginx (cache, file tĩnh) → app**.

Trong Kubernetes, nginx thường xuất hiện dưới dạng Ingress controller; dự án cộng đồng `ingress-nginx` đã thông báo ngừng phát triển (hết bảo trì vào tháng 3/2026) và hệ sinh thái đang chuyển sang Gateway API.

---

## Điểm cần nhớ khi phỏng vấn

- Nginx = **master + các worker đơn luồng chạy event loop** trên epoll; hàng nghìn kết nối mỗi worker; `reload` không downtime.
- Reverse proxy làm việc thay **server**; forward proxy làm việc thay **client**.
- `server_name`: chính xác → wildcard đầu → wildcard cuối → regex → `default_server`.
- `location`: `=` → prefix dài nhất (dừng nếu `^~`) → regex theo thứ tự file → prefix đã nhớ.
- `proxy_pass` **có URI thì thay thế** phần đã khớp; **không có URI** thì giữ nguyên đường dẫn. Giữ dấu gạch chéo khớp nhau.
- Đặt `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`; keepalive tới upstream cần `keepalive` + HTTP/1.1 + `Connection` rỗng.
- Thuật toán: round robin, `least_conn`, `ip_hash`, `hash … consistent`, `random two`; health check bản OSS là thụ động.
- Rate limiting: leaky bucket, `burst` + `nodelay`, mặc định 503, tính theo từng instance, cần IP thật của client.
- WebSocket: HTTP/1.1, header `Upgrade` + `Connection`, `proxy_read_timeout` dài hơn.
- 502 = không tới được backend, 504 = backend quá chậm, 499 = client bỏ cuộc, 413 = body quá lớn.

## Tóm tắt

- Event loop giúp nginx giữ lượng kết nối khổng lồ với rất ít bộ nhớ.
- Server block chọn virtual host; location định tuyến URI theo thứ tự ưu tiên chính xác.
- Hành vi của `proxy_pass` phụ thuộc vào phần URI — dấu gạch chéo cuối làm hỏng route nhiều hơn bất cứ thứ gì.
- Upstream mang lại cân bằng tải, failover thụ động và tái sử dụng kết nối.
- Ở biên, nginx terminate TLS, nói HTTP/2 và HTTP/3, nén, phục vụ file, cache và giới hạn tốc độ.
- Chọn nginx, HAProxy, Envoy hay cloud LB dựa trên thứ bạn cần ngoài việc chuyển tiếp request.
