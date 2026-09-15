# Docker trong Production – Container gọn, an toàn, dễ quan sát

## 1. Từ "chạy được" đến "sẵn sàng cho production"

Bài 4 đã giúp bạn chạy được container. Một buổi **review kiến trúc** (architecture review) sẽ hỏi những câu khó hơn: image nặng bao nhiêu và bên trong có gì, có chạy bằng root không, secret nằm ở đâu, chuyện gì xảy ra khi container treo hoặc chết, nó có thể "ăn" hết tài nguyên của host không, log đi đâu, và làm sao tin được thứ ta đang deploy?

Tư tưởng xuyên suốt: image production là một **artifact bất biến, tối giản, ít quyền nhất** (immutable, minimal, least-privilege), được build một lần và đưa nguyên vẹn qua mọi môi trường. Chỉ có cấu hình (config) là khác nhau.

```text
 source ──► build (CI) ──► SBOM + scan ──► registry + sign ──► dev ──► staging ──► prod
                 │                                     │
          tag = git SHA                     same digest everywhere;
                                            only env config changes
```

---

## 2. Multi-stage build

Quá trình build cần compiler, dependency cho dev và công cụ test; ứng dụng lúc chạy thì không cần thứ nào trong số đó. **Build nhiều giai đoạn** (multi-stage build) dùng nhiều dòng `FROM` trong một Dockerfile; chỉ stage cuối cùng trở thành image, và nó chỉ copy đúng những artifact cần thiết bằng `COPY --from=`.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Toolchain, mã nguồn và dev dependency ở lại trong stage bị bỏ đi: image nhỏ hơn, ít CVE hơn, ít công cụ cho kẻ tấn công hơn. `docker build --target build .` dừng ở một stage có tên (tiện để chạy test trong CI). BuildKit — builder mặc định từ Docker Engine 23.0 — bỏ qua các stage mà target không cần và build song song các stage độc lập.

---

## 3. Image nhỏ: slim, Alpine, distroless, scratch

| Base | Bên trong | Ưu | Nhược |
|---|---|---|---|
| `debian`/`ubuntu` đầy đủ | Cả bản distro | Cái gì cũng chạy | Nặng, nhiều CVE |
| `*-slim` | Debian rút gọn, glibc | Lựa chọn mặc định tốt | Vẫn có shell và apt |
| `alpine` | musl libc + BusyBox, vài MB | Rất nhỏ, có shell | musl ≠ glibc: bất ngờ với native module, DNS, hiệu năng |
| **distroless** | Chỉ thư viện runtime, không shell, không package manager | Bề mặt tấn công tối thiểu, có tag `:nonroot` | Không `docker exec sh` được; debug bằng tag `:debug` |
| `scratch` | Rỗng | Nhỏ nhất | Chỉ cho binary tĩnh; tự thêm CA cert |

Một binary Go tĩnh cho thấy thái cực nhỏ nhất:

```dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
ENTRYPOINT ["/api"]
```

Kết quả gần như chỉ gồm binary, CA certificate và user `nonroot` (UID 65532). Quy tắc kinh nghiệm: **slim cho runtime thông dịch, distroless hoặc scratch cho binary tĩnh, Alpine chỉ khi bạn đã test kỹ với musl.**

---

## 4. Build context, `.dockerignore` và tính tái lập

`docker build .` gửi toàn bộ thư mục (**ngữ cảnh build** – build context) cho builder. Không có `.dockerignore` thì nó gửi cả `.git`, `node_modules` và `.env`: build chậm, cache bị phá mỗi khi có file bất kỳ thay đổi dưới `COPY . .`, và secret bị copy vào image.

```text
# .dockerignore
.git
node_modules
dist
*.log
.env
.env.*
```

Các quy tắc **tái lập** (reproducibility) mà reviewer hay kiểm tra:

- **Không bao giờ deploy `:latest`** — nó là con trỏ có thể thay đổi. Gắn tag image ứng dụng bằng git SHA.
- **Ghim base image bằng digest** (`FROM node:22-bookworm-slim@sha256:…`) và để Renovate/Dependabot tự cập nhật.
- **Dùng lockfile** với lệnh cài đặt nghiêm ngặt (`npm ci`, `go mod download`).
- **Sắp xếp layer theo tần suất thay đổi** và cache việc tải package bằng `RUN --mount=type=cache,target=/root/.npm npm ci`.

---

## 5. Chạy non-root với quyền tối thiểu

Mặc định process trong container chạy bằng **root (UID 0)** — cùng UID 0 với host, trừ khi bật user namespace. Khi đó một lỗ hổng thoát container, một mount host có quyền ghi hoặc một Docker socket bị mount vào đều đồng nghĩa với root trên host.

```dockerfile
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --chown=app:app . /app
USER app
```

Image Node chính thức đã có sẵn user `node`; distroless có `nonroot`. Sau đó siết chặt lúc chạy:

```bash
docker run -d --name api \
  --read-only --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -p 8080:8080 \
  registry.example.com/api:3f9c2a1
```

`--read-only` + `--tmpfs /tmp` chặn ghi vào filesystem của image, `--cap-drop ALL` gỡ bỏ các **capability** của kernel (chỉ thêm lại cái thật sự cần), và `no-new-privileges` chặn leo thang quyền qua setuid. **Không bao giờ** dùng `--privileged` hay mount `/var/run/docker.sock` — cả hai thực chất là root trên host. Rootless Docker hoặc `userns-remap` còn đi xa hơn bằng cách ánh xạ root trong container thành một UID không có quyền trên host.

---

## 6. Secret lúc build và lúc chạy

Layer mang tính cộng dồn, và metadata của image thì ai pull được image cũng đọc được:

```dockerfile
# BAD: recorded in image metadata / docker history
ARG NPM_TOKEN
ENV NPM_TOKEN=$NPM_TOKEN

# BAD: rm hides the file, but the bytes stay in the earlier layer
COPY .npmrc /root/.npmrc
RUN npm ci && rm /root/.npmrc
```

**Lúc build — secret mount của BuildKit.** Secret được mount cho đúng một bước `RUN` và không bao giờ bị ghi vào layer (đường dẫn mặc định `/run/secrets/<id>`):

```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
```

```bash
docker build --secret id=npmrc,src=$HOME/.npmrc -t api:3f9c2a1 .
```

Với dependency từ Git repo private, `RUN --mount=type=ssh` cùng `docker build --ssh default` sẽ chuyển tiếp SSH agent thay vì copy key.

**Lúc chạy — tiêm vào, đừng nướng vào image:**

| Cách | Đánh đổi |
|---|---|
| Biến môi trường | Đơn giản, đúng 12-factor; nhưng lộ trong `docker inspect` và crash dump |
| File secret được mount (`secrets` của Compose/Swarm, volume Secret của Kubernetes) | File dưới `/run/secrets/`, không hiện trong `inspect` |
| Secrets manager lúc khởi động (Vault, AWS Secrets Manager, SSM) | Xoay vòng và audit tập trung; cần danh tính cho workload |

Trên AWS, task definition của ECS tham chiếu ARN của Secrets Manager hoặc SSM và tiêm vào khi container khởi động. Xoay vòng secret và Vault thuộc bài 19.

---

## 7. Healthcheck và tắt máy êm (graceful shutdown)

Process đang chạy chưa chắc là dịch vụ đang hoạt động — nó có thể bị deadlock hoặc vẫn đang khởi động.

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

- Exit `0` = healthy, `1` = unhealthy; `docker ps` hiển thị `starting`, `healthy` hoặc `unhealthy`. Mặc định: interval 30s, timeout 30s, retries 3.
- Lệnh chạy **bên trong** container; image slim/distroless thường không có `curl`.
- **Docker thuần chỉ báo cáo** trạng thái — nó không restart container unhealthy. Compose dùng trạng thái này cho `depends_on: condition: service_healthy`, Swarm thay thế task unhealthy, còn **Kubernetes bỏ qua `HEALTHCHECK`** và dùng probe riêng (bài 7).
- Giữ endpoint thật rẻ: kiểm tra mọi dependency sẽ biến một lần DB chập chờn thành cả fleet "unhealthy".

**Graceful shutdown:** `docker stop` gửi `SIGTERM`, chờ **10 giây** (đổi bằng `-t`), rồi gửi `SIGKILL`.

```text
docker stop api
   │  SIGTERM ──► PID 1 ─┬─ stop accepting new requests
   │                     ├─ finish in-flight requests, close DB pool
   │                     └─ exit 0                     (clean)
   └─ still alive after 10 s ──► SIGKILL  (exit 137, requests dropped)
```

Hai cái bẫy khiến ứng dụng bỏ lỡ `SIGTERM`:

1. **Shell form** `CMD node server.js` chạy qua `/bin/sh -c`, biến shell thành PID 1, và shell không chuyển tiếp signal. Dùng **exec form** `CMD ["node", "server.js"]` và chạy trực tiếp runtime thay vì qua `npm start`.
2. **PID 1 không có xử lý signal mặc định** từ kernel: không có handler thì `SIGTERM` bị bỏ qua. Hãy xử lý signal trong code hoặc chạy với `docker run --init` (tini chuyển tiếp signal và dọn zombie process).

---

## 8. Restart policy và giới hạn tài nguyên

| Policy | Restart khi | Dùng cho |
|---|---|---|
| `no` (mặc định) | Không bao giờ | Job chạy một lần |
| `on-failure[:N]` | Exit code khác 0, tối đa N lần | Worker nên thử lại nhưng không lặp vô hạn |
| `always` | Mọi lần exit, và khi daemon khởi động kể cả sau khi đã stop thủ công | Hiếm khi là thứ bạn muốn |
| `unless-stopped` | Mọi lần exit và khi daemon khởi động, trừ khi đã stop thủ công | Dịch vụ chạy lâu dài trên một host |

Docker thêm độ trễ tăng dần giữa các lần restart (gấp đôi, bắt đầu từ 100 ms), nên container đang crash loop sẽ hiện `Restarting` trong `docker ps`.

Không có **giới hạn tài nguyên** (resource limits), một container có thể chiếm hết RAM và CPU của host:

```bash
docker run -d --name worker \
  --memory 512m --memory-swap 512m \
  --cpus 1.5 --pids-limit 200 \
  --restart on-failure:5 \
  registry.example.com/worker:3f9c2a1
```

- `--memory` là giới hạn cứng của cgroup. Vượt quá thì process bị **OOM-kill**: exit code **137** (128 + SIGKILL 9) và `"OOMKilled": true` trong `docker inspect`.
- Đặt `--memory-swap` bằng `--memory` sẽ tắt swap cho container.
- `--cpus` là quota CFS: container bị **bóp CPU (throttle), không bị kill**. `--cpu-shares` chỉ là trọng số tương đối khi có tranh chấp.
- `--pids-limit` chặn fork bomb.
- Exit code cần nhận ra: `0` thoát sạch, `1` lỗi ứng dụng, `137` SIGKILL (OOM hoặc hết thời gian stop), `143` SIGTERM (128 + 15).

---

## 9. Logging driver

Container **ghi log ra stdout/stderr**, không bao giờ ghi vào file bên trong container. Daemon chuyển cả hai luồng cho một **logging driver**.

| Driver | Đích đến | Ghi chú |
|---|---|---|
| `json-file` (mặc định) | File JSON trong `/var/lib/docker/containers/<id>/` | **Mặc định không xoay vòng** |
| `local` | File nén gọn | Mặc định có xoay vòng và nén |
| `journald` / `syslog` | Hệ thống log của host | |
| `fluentd`, `gelf`, `awslogs`, `splunk` | Collector từ xa / cloud | `docker logs` vẫn dùng được nhờ dual logging (Engine 20.10+) |
| `none` | Bỏ đi | |

Sự cố kinh điển: một container ghi log nhiều làm đầy ổ đĩa host vì `json-file` chưa bao giờ được **xoay vòng** (rotate). Sửa cho toàn daemon trong `/etc/docker/daemon.json` (áp dụng cho container tạo sau đó):

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

Mặc định logging là **blocking**: driver từ xa chậm sẽ làm treo thao tác ghi của ứng dụng; `--log-opt mode=non-blocking` sẽ bỏ bớt dòng log thay vì chặn. Trên ECS, driver `awslogs` đẩy log lên CloudWatch Logs. Structured logging thuộc bài 16.

---

## 10. Quét image, SBOM và ký image

```text
 build ──► SBOM ──► scan ──(CRITICAL? fail)──► push ──► sign digest ──► deploy verifies signature
```

**Quét lỗ hổng** (scanning) đối chiếu các package trong image với cơ sở dữ liệu CVE — **Trivy**, **Grype**, **Docker Scout**, Snyk, hoặc tính năng quét của registry như Amazon ECR:

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.example.com/api:3f9c2a1
```

Quét trong CI để chặn build **và quét lại các image đã nằm trong registry**: image sạch hôm nay sẽ có CVE mới vào ngày mai. Cách chữa thường là build lại trên base đã vá, vì vậy base nhỏ và rebuild tự động hiệu quả hơn nhiều so với ngồi phân loại hàng trăm phát hiện.

**SBOM** (Software Bill of Materials – danh mục thành phần phần mềm) liệt kê mọi package và phiên bản, theo định dạng SPDX hoặc CycloneDX — sinh bằng Syft hoặc `docker buildx build --sbom=true`. Khi một CVE kiểu Log4Shell xuất hiện, bạn truy vấn SBOM thay vì pull từng image.

**Ký image** (signing) chứng minh image đến từ pipeline của bạn và không bị sửa đổi. **Sigstore cosign** là chuẩn trên thực tế, hỗ trợ keyless signing gắn với danh tính OIDC của CI:

```bash
cosign sign registry.example.com/api@sha256:<digest>
```

Ký image đã push theo **digest** và deploy theo digest, vì tag có thể bị di chuyển; bắt buộc xác minh chữ ký lúc deploy (ví dụ admission policy trong Kubernetes). Docker Content Trust (Notary v1) là cách cũ, phần lớn đã được thay bằng cosign và Notation.

---

## 11. Docker Compose cho ứng dụng nhiều service

**Compose** mô tả ứng dụng nhiều container bằng YAML và chạy nó trên **một host duy nhất**. Compose v2 là plugin CLI `docker compose` (bản Python `docker-compose` v1 đã hết vòng đời năm 2023); khoá `version:` ở đầu file đã lỗi thời.

```yaml
# compose.yaml
services:
  api:
    image: registry.example.com/api:${API_TAG}
    ports:
      - "8080:8080"
    environment:
      DATABASE_HOST: db
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      retries: 5
volumes:
  db-data:
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

- Các service dùng chung một network mặc định của project và gọi nhau bằng **tên service** (`db:5432`). Chỉ `api` publish port, nên Postgres không bị lộ ra ngoài.
- `depends_on` đơn thuần chỉ sắp thứ tự khởi động; `condition: service_healthy` mới chờ healthcheck đạt. Ứng dụng vẫn nên tự retry kết nối.
- `${API_TAG}` được đọc từ shell hoặc file `.env`. `compose.override.yaml` được merge tự động (bind mount cho dev); production dùng `-f compose.yaml -f compose.prod.yaml`.

```bash
docker compose up -d --build
docker compose logs -f api
docker compose down          # add -v to delete named volumes
```

**Đủ dùng cho:** dev local, integration test trong CI, deployment nhỏ trên một VM. **Không đủ cho:** nhiều host, tự phục hồi giữa các node, rolling deploy, autoscaling — đó là việc của **điều phối** (orchestration): Kubernetes ở bài 6, ECS trên AWS.

---

## 12. Ứng dụng twelve-factor

**Twelve-Factor App** (Heroku, 2011) là checklist cho những ứng dụng hợp với container.

| # | Yếu tố | Hiểu theo container |
|---|---|---|
| 1 | Codebase | Một repo cho mỗi app, deploy nhiều nơi |
| 2 | Dependencies | Khai báo và cô lập trong image |
| 3 | Config | Nằm trong môi trường, không nằm trong image |
| 4 | Backing services | DB, cache, queue gắn vào qua URL |
| 5 | Build, release, run | Image + config = release; các giai đoạn tách biệt |
| 6 | Processes | Stateless; state nằm ở backing service |
| 7 | Port binding | App tự phục vụ trên port của mình |
| 8 | Concurrency | Scale out bằng cách chạy thêm container |
| 9 | Disposability | Khởi động nhanh, tắt êm khi nhận `SIGTERM` |
| 10 | Dev/prod parity | Cùng một image ở mọi nơi |
| 11 | Logs | Luồng sự kiện ra stdout |
| 12 | Admin processes | Migration chạy như container một lần từ cùng image |

Hay bị vi phạm nhất: **config** nướng vào image, **processes** giữ session trên ổ đĩa local, **disposability** bị phớt lờ khi app không xử lý `SIGTERM`, và **logs** ghi ra file.

---

## Điểm cần nhớ khi phỏng vấn

- Build một lần, đưa **cùng một digest** qua các môi trường; chỉ config thay đổi. Không bao giờ deploy `:latest`.
- **Multi-stage build** giữ toolchain ngoài image runtime; **slim** cho runtime dùng glibc, **distroless/scratch** cho binary tĩnh.
- **`.dockerignore`** giữ `.git`/`.env` ngoài image và giúp cache hiệu quả.
- Chạy **non-root**, `--read-only`, `--cap-drop ALL`; không bao giờ `--privileged` hay mount Docker socket.
- `ARG`/`ENV` và file đã xoá vẫn làm lộ secret qua layer; dùng **`RUN --mount=type=secret`**.
- `HEALTHCHECK` của Docker thuần chỉ báo cáo; dùng **exec form** và xử lý `SIGTERM`; `docker stop` kill sau 10 giây.
- **Exit 137** = SIGKILL, thường là OOM; giới hạn CPU chỉ throttle chứ không kill.
- `json-file` **không xoay vòng** trừ khi đặt `max-size`/`max-file`.
- Quét trong CI và liên tục, sinh SBOM, ký bằng **cosign**, deploy theo digest.
- Compose chỉ chạy trên một host; `depends_on` cần `service_healthy` để chờ service sẵn sàng.

## Tóm tắt

- Image production là artifact bất biến, tối giản, ít quyền nhất, được cấu hình theo từng môi trường.
- Multi-stage build, base nhỏ được ghim phiên bản và `.dockerignore` cho image nhỏ, tái lập được.
- User non-root, hardening lúc chạy và secret mount của BuildKit giới hạn thiệt hại và giữ credential ngoài layer.
- Healthcheck, shutdown biết xử lý signal, restart policy và giới hạn tài nguyên giúp sự cố diễn ra có thể dự đoán.
- Log đi ra stdout qua driver có xoay vòng hoặc đẩy đi; scanning, SBOM và ký image bảo vệ chuỗi cung ứng.
- Compose chạy stack nhiều service trên một host, và nguyên tắc twelve-factor gắn kết tất cả lại.
