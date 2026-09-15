# Docker căn bản – Container từ tầng kernel trở lên

## 1. Container và máy ảo

**Container** đóng gói ứng dụng cùng các phụ thuộc ở user space (runtime, thư viện, file cấu hình) thành một **image** bất biến, chạy giống hệt nhau trên mọi máy Linux. Nó chấm dứt câu "máy em chạy được mà" — nhưng khác biệt thật sự so với **máy ảo** (virtual machine – VM) nằm ở chỗ *cái gì được dùng chung*:

```text
     Virtual machines                    Containers
+----------+ +----------+          +----------+ +----------+
|  App A   | |  App B   |          |  App A   | |  App B   |
|  libs    | |  libs    |          |  libs    | |  libs    |
| Guest OS | | Guest OS |          +----------+ +----------+
+----------+ +----------+          |  Container runtime     |
|      Hypervisor        |         |  Host OS (ONE kernel)  |
+------------------------+         +------------------------+
|       Hardware         |         |       Hardware         |
+------------------------+         +------------------------+
```

| | Máy ảo | Container |
|---|---|---|
| Cách cô lập | Mỗi guest một kernel riêng | Tính năng kernel trên **một kernel dùng chung** |
| Khởi động | Hàng chục giây trở lên (boot cả OS) | Thường dưới một giây (chỉ start một process) |
| Kích thước | Vài GB | Vài MB đến vài trăm MB |
| Lỗ hổng kernel | Bị giữ lại trong guest | Có thể thoát ra host |
| Chạy kernel OS khác | Được | Không — container Linux cần kernel Linux |

Dòng cuối giải thích vì sao **Docker Desktop** trên macOS/Windows ngầm chạy một VM Linux (trên Windows là WSL 2). Kiến trúc sư thường kết hợp cả hai: container để đóng gói và tăng mật độ, VM hoặc micro-VM (ví dụ Firecracker — thứ cô lập các function AWS Lambda) cho ranh giới multi-tenant cứng.

---

## 2. Container chỉ là một process: namespaces

Kernel không hề có đối tượng "container". Container là một process bình thường được khởi chạy với *góc nhìn* bị giới hạn về hệ thống, dựng nên từ các **không gian tên** (namespaces):

| Namespace | Cô lập | Hệ quả bên trong container |
|---|---|---|
| `pid` | Process ID | App thấy mình là **PID 1**, không thấy process của host |
| `net` | Network stack | Interface, IP, bảng định tuyến, port riêng |
| `mnt` | Mount point | Root filesystem riêng (chính là image) |
| `uts` | Hostname | Hostname riêng (mặc định là container ID) |
| `ipc` | Shared memory, SysV IPC | Không chia sẻ bộ nhớ với process của host |
| `user` | Ánh xạ UID/GID | Root trong container có thể ứng với user thường trên host |

Bằng chứng rằng nó là process của host:

```bash
docker run -d --name web nginx:1.27
docker inspect --format '{{.State.Pid}}' web   # e.g. 48213 - a normal host PID
sudo ls -l /proc/48213/ns                      # the namespaces it lives in
```

Docker **không** bật user namespace mặc định (chỉ khi cấu hình `userns-remap` hoặc chạy rootless), nên root trong container chính là UID 0 trên kernel host, chỉ bị kiềm chế bởi capabilities đã bị bỏ, seccomp và AppArmor/SELinux. Phần hardening nằm ở bài 5.

---

## 3. cgroups: giới hạn tài nguyên container dùng

Namespaces quyết định process **thấy** gì; **nhóm điều khiển** (control groups – cgroups) quyết định nó **dùng** được bao nhiêu — CPU, bộ nhớ, I/O, số process. Các distro hiện nay dùng **cgroup v2**, Docker hỗ trợ từ bản 20.10.

```bash
docker run -d --name api --memory 512m --cpus 1.5 --pids-limit 200 my-api:1.4.0
docker stats api   # live CPU %, memory usage / limit
```

Hai loại tài nguyên hỏng theo hai kiểu khác nhau — câu hỏi troubleshooting rất hay gặp:

- **CPU** "nén" được: vượt quota thì container bị **throttle** (chậm đi, không chết).
- **Bộ nhớ** thì không: chạm giới hạn, kernel **OOM-kill** một process. Container thoát với mã **137** (128 + SIGKILL) và `docker inspect` hiện `"OOMKilled": true`.

Nếu không đặt cờ nào, container được dùng toàn bộ CPU và RAM của host, nên một container rò rỉ bộ nhớ có thể làm cả node chết đói. Vậy container là *sự kết hợp* các tính năng Linux, không phải một loại đối tượng kernel mới.

---

## 4. Kiến trúc Docker: CLI, dockerd, containerd, runc

```text
docker CLI --REST over /var/run/docker.sock--> dockerd  (API, BuildKit builds, networks, volumes)
                                                  | gRPC
                                                  v
                                              containerd (pull/store images, container lifecycle)
                                                  |
                                              containerd-shim --> runc --> your process
                                                            (creates namespaces + cgroups, exits)
```

- **docker CLI** — chỉ là client; `docker context` có thể trỏ nó tới một engine ở máy khác.
- **dockerd** — daemon. BuildKit là builder mặc định từ Engine 23.0.
- **containerd** — runtime của CNCF, quản lý image và vòng đời container; Kubernetes gọi thẳng nó qua CRI.
- **runc** — **OCI runtime** tầng thấp, trực tiếp gọi kernel.

**Open Container Initiative (OCI)** chuẩn hoá định dạng image, runtime và API của registry. Nhờ vậy image build bằng `docker build` chạy nguyên vẹn trên containerd, CRI-O hay Podman, và việc Kubernetes gỡ *dockershim* (v1.24) không làm hỏng image của ai.

Bảo mật: Docker socket **tương đương quyền root**. Ai chạm được vào nó (hoặc port TCP 2375 không bảo vệ) đều có thể chạy một container mount thư mục `/` của host.

---

## 5. Image, layer và union filesystem

**Image** là một chồng **lớp** (layer) chỉ-đọc cộng một file cấu hình JSON. Mỗi instruction thay đổi filesystem (`RUN`, `COPY`, `ADD`) thêm một layer chỉ chứa *phần khác biệt*. Layer được định danh bằng hash SHA-256 của nội dung (content-addressed), nên một layer dùng chung bởi nhiều image chỉ lưu và pull một lần.

Khi chạy, storage driver (**overlay2** là mặc định) gộp các layer thành một cây thư mục và thêm một **lớp ghi được** (writable layer) mỏng cho từng container:

```text
  Container A           Container B
[ writable layer ]    [ writable layer ]   <- per container, deleted with it
        \                  /
   [ L3: COPY . .          ]  read-only
   [ L2: RUN npm ci        ]  read-only, shared
   [ L1: node:22-slim      ]  read-only
```

**Copy-on-write** (sao chép khi ghi): sửa một file thuộc layer dưới sẽ khiến file đó được copy lên writable layer trước. Hệ quả:

- 50 container từ cùng một image gần như không tốn thêm dung lượng đĩa.
- Ghi nhiều vào filesystem của container vừa chậm vừa **mất sạch khi container bị xoá** — hãy dùng volume.
- **Xoá file ở layer sau không làm image nhỏ đi**; dữ liệu vẫn nằm ở layer trước, chỉ bị che bởi một "whiteout". `RUN rm secret.txt` không xoá được secret.

`docker image history my-api:1.4.0` liệt kê từng layer, kích thước và instruction đã tạo ra nó.

---

## 6. Các instruction trong Dockerfile

```dockerfile
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# Dependency manifests first to maximise cache hits
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
EXPOSE 3000
USER node
ENTRYPOINT ["node"]
CMD ["server.js"]
```

| Instruction | Mục đích | Cái bẫy |
|---|---|---|
| `FROM` | Base image | Ghim phiên bản, đừng dùng `latest` |
| `WORKDIR` | Đặt/tạo thư mục làm việc | `RUN cd` không giữ lại cho bước sau |
| `COPY` / `ADD` | Copy từ build context | `ADD` còn tải URL và tự giải nén tar — nên dùng `COPY` |
| `RUN` | Chạy lệnh lúc **build**, tạo layer mới | Nối các bước liên quan bằng `&&` |
| `ENV` | Biến môi trường lúc build **và** lúc chạy | Lưu trong image — không để secret |
| `ARG` | Biến chỉ lúc build (`--build-arg`) | Không thấy được lúc chạy |
| `EXPOSE` | **Ghi chú** port app lắng nghe | Không publish gì cả |
| `USER` | User cho các bước sau và cho container | Mặc định là root |
| `ENTRYPOINT` | Chương trình luôn được chạy | Ghi đè bằng `--entrypoint` |
| `CMD` | Tham số/lệnh mặc định | Bị thay bởi tham số sau tên image |

Ở đây `docker run my-api` chạy `node server.js`; `docker run my-api worker.js` chạy `node worker.js`.

**Exec form và shell form.** `CMD ["node", "server.js"]` (exec form) chạy app trực tiếp làm PID 1. `CMD node server.js` (shell form) chạy `/bin/sh -c "node server.js"`: shell có thể nằm lại làm PID 1 và **không chuyển tiếp SIGTERM**, nên `docker stop` phải chờ hết thời gian ân hạn rồi mới kill. Hãy dùng exec form.

---

## 7. Build cache

Với từng instruction, builder hỏi: *mình đã có layer sinh ra từ đúng instruction này, trên đúng layer cha này chưa?* Có thì dùng lại (cache hit). **Lần miss đầu tiên làm mất cache của mọi instruction phía sau.**

- `RUN` — chỉ so **chuỗi lệnh**, nên `RUN apt-get update` vẫn được cache dù phía upstream đã đổi.
- `COPY` / `ADD` — so checksum **nội dung** file (bỏ qua mtime).

```text
Bad order                              Good order
COPY . .        <- any code edit       COPY package*.json ./
RUN npm ci         reinstalls deps     RUN npm ci      <- cached until deps change
                                       COPY . .        <- only this reruns
```

Quy tắc: thứ ít thay đổi đặt trước, mã nguồn đặt cuối; `apt-get update && apt-get install -y …` trong **một** `RUN`; giữ build context nhỏ (`.dockerignore`, bài 5). Runner CI khởi đầu với cache rỗng — BuildKit có thể lưu cache vào registry bằng `--cache-to` / `--cache-from`. `--no-cache` ép build sạch từ đầu.

---

## 8. Vòng đời container

```text
        create            start
image --------> Created --------> Running <----> Paused   (pause / unpause)
                                     |
             stop / kill / app exits |
                                     v
                                  Exited --rm--> removed
                                     |
                                     +--start--> Running (same writable layer)
```

`docker run` = pull nếu chưa có + create + start. Cờ hay dùng: `-d`, `--name`, `--rm`, `-e KEY=value`, `-it`.

**Dừng êm (graceful stop).** `docker stop` gửi **SIGTERM** tới PID 1, chờ mặc định **10 giây** (đổi bằng `-t`), rồi gửi **SIGKILL**. `docker kill` gửi SIGKILL ngay. App nên bắt SIGTERM, ngừng nhận việc mới, xử lý xong các request đang dở rồi thoát — orchestrator dựa vào điều này khi rolling deploy.

**PID 1 rất đặc biệt:** kernel không áp hành động mặc định của signal cho nó, nên app không cài handler cho SIGTERM sẽ phớt lờ tín hiệu; PID 1 còn phải dọn các process con zombie. `docker run --init` thêm một init siêu nhỏ (`tini`) làm cả hai việc.

| Exit code | Ý nghĩa |
|---|---|
| 0 / 1 | Thoát bình thường / lỗi ứng dụng |
| 125 / 126 / 127 | Docker lỗi / lệnh không thực thi được / không tìm thấy lệnh |
| 137 | 128 + 9: SIGKILL — OOM kill, `docker kill`, hoặc hết thời gian ân hạn |
| 143 | 128 + 15: bị kết thúc bởi SIGTERM không được xử lý |

Container đã exited vẫn giữ writable layer cho tới khi `docker rm` — lý do quen thuộc khiến build server đầy ổ đĩa.

---

## 9. Lưu dữ liệu bền vững: volume, bind mount, tmpfs

| | Named volume | Bind mount | tmpfs |
|---|---|---|---|
| Dữ liệu nằm ở | Thư mục do Docker quản lý (`/var/lib/docker/volumes`) | Bất kỳ đường dẫn nào trên host | Bộ nhớ RAM của host |
| Tính di động | Tốt, không phụ thuộc đường dẫn host | Gắn với cấu trúc thư mục host | Không lưu lại gì |
| Mount rỗng + file có trong image | Nội dung image được copy vào | Thư mục host che mất file của image | — |
| Dùng cho | Database | Live-reload khi dev, file cấu hình host | Dữ liệu tạm hoặc nhạy cảm |

```bash
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=devonly \
  --mount type=volume,source=pgdata,target=/var/lib/postgresql/data postgres:17

docker run -d -p 8080:80 \
  --mount type=bind,source="$(pwd)"/nginx.conf,target=/etc/nginx/nginx.conf,readonly nginx:1.27
```

`-v` và `--mount` làm cùng một việc, nhưng với bind mount thì `--mount` **báo lỗi** nếu đường dẫn host không tồn tại, còn `-v` âm thầm tạo một thư mục rỗng — kinh điển kiểu "file config của tôi biến mất".

Volume vẫn **chỉ nằm trên một host**: container bị lập lịch sang máy khác thì dữ liệu ở lại. Vì vậy database production thường dùng dịch vụ managed (RDS) hoặc network storage (EBS/EFS) do orchestrator gắn vào.

---

## 10. Networking và publish port

| Driver | Hành vi | Dùng khi |
|---|---|---|
| `bridge` (mặc định) | Mạng riêng trên host, NAT ra ngoài; `docker0` mặc định là `172.17.0.0/16` | Ứng dụng trên một host |
| `host` | Không có network namespace, dùng thẳng stack của host | Cần hiệu năng tối đa, nhiều port (Linux) |
| `none` | Chỉ có loopback | Job không được có mạng |
| `overlay` | Trải qua nhiều host (Swarm) | Nhiều host; Kubernetes dùng CNI thay thế |

Trên bridge **mặc định**, các container chỉ gọi nhau được bằng IP. **User-defined bridge** (bridge tự tạo) có DNS nhúng (`127.0.0.11`) phân giải **tên container**, đồng thời cô lập các nhóm container với nhau:

```bash
docker network create app-net
docker run -d --name db  --network app-net -e POSTGRES_PASSWORD=devonly postgres:17
docker run -d --name api --network app-net -e DATABASE_HOST=db -p 8080:3000 my-api:1.4.0
```

`-p hostPort:containerPort` tạo các luật NAT:

```text
client --> host 203.0.113.10:8080 --(iptables DNAT)--> 172.18.0.3:3000 (api)
api    --> db:5432   (container-to-container: container port, no -p needed)
```

Những cái bẫy từ sự cố thật:

- App phải lắng nghe trên **`0.0.0.0`** trong container; nếu bind vào `127.0.0.1`, port đã publish sẽ không trả lời gì.
- `-p 8080:3000` bind trên **mọi interface của host**; muốn chỉ truy cập cục bộ, dùng `-p 127.0.0.1:8080:3000`.
- Luật iptables của Docker có thể **vượt qua ufw** — port database tưởng đã "chặn" vẫn có thể lộ ra internet.
- `EXPOSE` không publish gì; `-P` map mọi port đã expose ra một port cao ngẫu nhiên trên host.

---

## 11. Registry và cách đặt tên image

**Registry** phục vụ image qua OCI distribution API: Docker Hub, Amazon ECR, GitHub `ghcr.io`, Harbor, hoặc image `registry` tự host (port 5000).

```text
123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/payments/api:1.4.0
|------------- registry host -------------------| |repository| |tag|

nginx:1.27  ==  docker.io/library/nginx:1.27    (Docker Hub defaults)
nginx@sha256:<digest>                           (pinned, immutable)
```

- **Tag** là con trỏ thay đổi được; **`latest` chỉ là tên tag mặc định**, không có nghĩa là "mới nhất".
- **Digest** là hash của manifest và không bao giờ đổi — ghim theo digest hoặc bật immutable tags (ECR có hỗ trợ) để deploy tái lập được.
- Image **multi-arch** dùng một index trỏ tới image cho từng nền tảng. Image chỉ có `arm64` build trên laptop Apple Silicon sẽ lỗi `exec format error` trên server `amd64`; hãy dùng `docker buildx build --platform linux/amd64,linux/arm64`.

```bash
docker tag my-api:1.4.0 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/payments/api:1.4.0
docker push 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/payments/api:1.4.0
```

Docker Hub **giới hạn tốc độ pull** (rate limit) với người dùng ẩn danh và tài khoản miễn phí, làm vỡ CI và cả lúc scale-out node. Hãy mirror base image về registry của mình (ví dụ ECR pull-through cache).

---

## 12. CLI cốt lõi và quy trình debug

| Việc | Lệnh |
|---|---|
| Build | `docker build -t my-api:1.4.0 .` |
| Liệt kê đang chạy / tất cả | `docker ps` / `docker ps -a` |
| Xem log | `docker logs -f --tail 100 api` |
| Mở shell trong container | `docker exec -it api sh` |
| Toàn bộ trạng thái (JSON) | `docker inspect api` |
| Mức dùng tài nguyên | `docker stats` |
| Dung lượng đĩa / dọn dẹp | `docker system df` / `docker system prune` |

Khi "container không chạy":

```text
1. docker ps -a            Running, restarting or exited? Which exit code?
2. docker logs api         Last output before it died (stdout/stderr only)
3. docker inspect api      OOMKilled? env, mounts, networks, port bindings
4. docker exec -it api sh  Listening on 0.0.0.0? Does "db" resolve?
5. docker run -it --entrypoint sh my-api:1.4.0
                           Dies at start? Open a shell and run the command by hand
```

`docker logs` chỉ hiện **stdout/stderr** — app ghi log ra file bên trong container sẽ không hiện gì. Hãy log ra stdout; mọi công cụ thu thập log đều dựa trên quy ước này.

---

## Điểm cần nhớ khi phỏng vấn

- Container là một **process Linux** được cô lập bởi **namespaces** (thấy gì) và giới hạn bởi **cgroups** (dùng bao nhiêu), **dùng chung kernel của host** — nhanh, nhưng cô lập yếu hơn VM.
- Chồng thành phần: **CLI → dockerd → containerd → runc**; OCI giúp image chạy được trên containerd, CRI-O, Podman.
- Image là các **layer chỉ-đọc, định danh theo nội dung**, được **overlay2** gộp lại, cộng một layer copy-on-write cho mỗi container; xoá file ở layer sau không bao giờ làm image nhỏ đi.
- **Build cache** gãy ở instruction đầu tiên thay đổi: dependency trước, mã nguồn sau.
- **Exec form** cho `CMD`/`ENTRYPOINT`; `docker stop` = SIGTERM rồi SIGKILL sau 10 s; exit **137** = SIGKILL, thường là OOM.
- **Volume** cho dữ liệu, **bind mount** cho dev/config, **tmpfs** cho dữ liệu chỉ nằm trong RAM; volume chỉ nằm trên một host.
- **User-defined bridge** có DNS theo tên; app lắng nghe `0.0.0.0`; `-p` bind mọi interface và có thể vượt qua ufw.
- **Tag thay đổi được, digest thì bất biến**; build multi-arch để tránh `exec format error`.

## Tóm tắt

- Container đóng gói app cùng phụ thuộc và khởi động dưới một giây trên mọi kernel Linux tương thích.
- Namespaces và cgroups là tính năng của kernel; Docker lắp ghép chúng thông qua containerd và runc.
- Layer, định danh theo nội dung và copy-on-write giúp image rẻ để phân phối và chạy nhiều bản.
- Thứ tự trong Dockerfile quyết định build mất vài giây hay vài phút.
- Signal và exit code giải thích việc dừng êm và nguyên nhân crash.
- Chọn volume, bind mount hay tmpfs có chủ đích; dùng user-defined network; chỉ publish những port cần truy cập.
- Push lên registry mình kiểm soát, tham chiếu theo phiên bản hoặc digest, debug bằng `ps -a`, `logs`, `inspect`, `exec`.
