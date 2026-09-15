# Linux cho kiến trúc sư giải pháp

## 1. Vì sao kiến trúc sư cần hiểu Linux

Gần như mọi thứ bạn thiết kế đều chạy trên Linux: EC2 instance, máy chủ chạy container, node Kubernetes, phần lớn runtime managed và serverless. Bạn không cần là sysadmin, nhưng phải hiểu các cơ chế quyết định **một tiến trình khởi động, dừng, nhận tài nguyên và chết như thế nào** — vì chúng lộ ra thành vấn đề kiến trúc: mất request khi deploy, lỗi "too many open files" khi tải cao, ổ đĩa đầy lúc 3 giờ sáng.

```text
+---------------------------------------------------+
|  user space:  nginx   java   node   postgres  sh  |
|               (processes, each with PID, UID, fds)|
+-------------------- system calls -----------------+
|  kernel:  scheduler | memory mgmt | VFS | network |
|           cgroups   | namespaces  | drivers       |
+---------------------------------------------------+
|  hardware / hypervisor (vCPU, RAM, EBS, ENI)      |
+---------------------------------------------------+
```

Ứng dụng không bao giờ chạm trực tiếp vào phần cứng; chúng nhờ **nhân hệ điều hành** (kernel) thông qua **lời gọi hệ thống** (system call) như `open`, `read`, `fork`, `socket`… Một **bản phân phối** (distribution — Ubuntu, Debian, RHEL, Amazon Linux, Alpine) là kernel cộng với bộ công cụ user space, trình quản lý gói và các giá trị mặc định. Ghi nhớ cho phần sau: **container không phải công nghệ riêng biệt — chúng là tiến trình Linux bình thường** được bọc bằng các tính năng của kernel (mục 12).

---

## 2. Tiến trình: PID, fork/exec, trạng thái

**Tiến trình** (process) là một chương trình đang chạy, có bộ nhớ ảo riêng, một **PID**, tiến trình cha (**PPID**), user sở hữu (**UID**) và bảng các file đang mở. Tiến trình mới được tạo bằng `fork()` (sao chép tiến trình cha) rồi `exec()` (thay bản sao bằng chương trình mới). Đó chính là việc shell làm khi bạn gõ `node server.js`.

**PID 1** là tiến trình user space đầu tiên (thường là `systemd` trên server). Nó nhận nuôi các tiến trình mồ côi (orphan) và phải **thu dọn** (reap) các tiến trình con đã thoát.

| Trạng thái (trong `ps`/`top`) | Ý nghĩa |
|---|---|
| `R` | Đang chạy hoặc sẵn sàng chạy (đang chờ CPU) |
| `S` | Ngủ có thể ngắt — chờ một sự kiện (đa số tiến trình rảnh) |
| `D` | Ngủ không thể ngắt — thường bị chặn bởi I/O đĩa hoặc storage qua mạng |
| `T` | Bị dừng (ví dụ bởi `SIGSTOP` hoặc Ctrl+Z) |
| `Z` | **Zombie** — đã thoát nhưng tiến trình cha chưa gọi `wait()` |

**Zombie** không giữ bộ nhớ, chỉ chiếm một ô trong bảng tiến trình; bạn không thể kill nó vì nó đã chết rồi. Hãy sửa **tiến trình cha** không bao giờ gọi `wait()` (hoặc kill cha để PID 1 nhận nuôi và dọn zombie).

```bash
ps -eo pid,ppid,user,stat,%cpu,cmd --sort=-%cpu | head
pstree -p 1234          # process tree under PID 1234
```

---

## 3. Signal, tắt êm (graceful shutdown) và exit code

**Tín hiệu** (signal) là thông báo bất đồng bộ gửi tới một tiến trình. Những signal kiến trúc sư cần biết:

| Signal | Số | Mặc định | Dùng khi |
|---|---|---|---|
| `SIGHUP` | 1 | kết thúc | Nhiều daemon hiểu là "nạp lại cấu hình" (`nginx -s reload`) |
| `SIGINT` | 2 | kết thúc | Ctrl+C trong terminal |
| `SIGKILL` | 9 | kết thúc | Kill cưỡng bức — **không thể bắt, chặn hay bỏ qua** |
| `SIGTERM` | 15 | kết thúc | Lịch sự "hãy tắt đi" — mặc định của lệnh `kill` |
| `SIGSTOP` | 19 (x86) | tạm dừng | Tạm dừng — cũng không thể bắt |

**Tắt êm** là hợp đồng giữa nền tảng và code của bạn. `systemctl stop`, `docker stop` và Kubernetes đều gửi `SIGTERM` trước, chờ một khoảng **thời gian ân hạn** (grace period), rồi mới gửi `SIGKILL` (Docker mặc định chờ 10 giây; `terminationGracePeriodSeconds` của Kubernetes mặc định 30 giây).

```text
platform            process
   | --- SIGTERM ---> |  stop accepting new work
   |                  |  finish in-flight requests, close DB pools
   |                  |  exit(0)
   |   ...grace period expires and it is still alive?
   | --- SIGKILL ---> |  killed immediately, no cleanup
```

```js
const server = app.listen(3000);

process.on('SIGTERM', () => {
  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
});
```

Khi tiến trình chết vì signal, shell và container runtime báo exit code **128 + số hiệu signal**: **137 = SIGKILL** (thường do OOM killer hoặc hết grace period), **143 = SIGTERM**, **130 = SIGINT**.

Bẫy với container: tiến trình chạy làm **PID 1 bên trong container** không có xử lý signal mặc định — nếu nó không tự đăng ký handler, `SIGTERM` bị bỏ qua và bạn phải chờ tới `SIGKILL`. Chạy app qua `sh -c` còn tệ hơn vì shell không chuyển tiếp signal. Cách sửa (init nhỏ như `tini`, `CMD` dạng exec) thuộc về các chủ đề Docker.

---

## 4. Cây thư mục của hệ thống file

Linux có một cây duy nhất gốc tại `/`; ổ đĩa và volume mạng được **mount** (gắn) vào cây này. Chuẩn Filesystem Hierarchy Standard (FHS) cho biết thứ gì nằm ở đâu:

| Đường dẫn | Chứa gì |
|---|---|
| `/etc` | Cấu hình hệ thống và dịch vụ (`/etc/nginx/nginx.conf`, `/etc/systemd/system/`) |
| `/var` | Dữ liệu thay đổi: `/var/log` (log), `/var/lib` (trạng thái, ví dụ `/var/lib/docker`, `/var/lib/postgresql`) |
| `/usr/bin`, `/usr/lib` | Chương trình và thư viện đã cài (`/bin` là symlink tới `/usr/bin` trên các distro hiện đại) |
| `/home`, `/tmp` | Thư mục home của user; file tạm (thường bị xoá khi reboot) |
| `/run` | Trạng thái runtime từ lúc boot (PID file, socket), nằm trong RAM |
| `/proc`, `/sys` | Hệ thống file ảo phơi bày trạng thái kernel và tiến trình — không nằm trên đĩa |

"**Mọi thứ đều là file**": file, thiết bị, pipe và socket dùng chung một API file. `/proc/<pid>/` cho thấy dòng lệnh, giới hạn và các file descriptor đang mở của một tiến trình; `/proc/meminfo` là nguồn dữ liệu cho `free`.

Tên file trỏ tới một **inode** — cấu trúc chứa quyền, chủ sở hữu, kích thước và vị trí các block dữ liệu. Mỗi filesystem có số inode cố định, nên hàng triệu file nhỏ (file session, mảnh cache) có thể làm đĩa "đầy" dù `df -h` vẫn báo còn chỗ. Kiểm tra bằng `df -i`.

Thói quen kiến trúc: đặt **dữ liệu cần tồn tại lâu** (file database, file upload) trên một volume riêng mount vào `/var/lib/...` hoặc `/data`, để volume gốc có thể dựng lại từ image bất cứ lúc nào.

---

## 5. User, group và phân quyền

Mọi tiến trình chạy dưới một **user** (UID) với một **group** chính và vài group phụ (GID). Tài khoản nằm trong `/etc/passwd`, hash mật khẩu trong `/etc/shadow`, group trong `/etc/group`. **UID 0 là root** và bỏ qua các kiểm tra quyền thông thường.

Mỗi file có một owner, một group và ba bộ quyền:

```text
-rwxr-x---  1 deploy  web  4096  app.sh
 \_/\_/\_/
  |  |  +-- others: ---  (0)
  |  +----- group:  r-x  (5)
  +-------- owner:  rwx  (7)      => chmod 750 app.sh
```

| Bit | Với file | Với thư mục |
|---|---|---|
| `r` (4) | đọc nội dung | liệt kê tên bên trong |
| `w` (2) | sửa nội dung | tạo, xoá, đổi tên các mục bên trong |
| `x` (1) | thực thi | **đi vào/đi xuyên qua** (cần để truy cập bất cứ thứ gì bên trong) |

```bash
chown deploy:web /srv/app          # owner and group
chmod 640 /etc/myapp/config.env    # owner rw, group r, others nothing
chmod -R u=rwX,g=rX,o= /srv/app    # capital X: execute only on dirs
umask                              # 0022 -> new files 644, dirs 755
```

Bit đặc biệt: **setuid** cho binary chạy với quyền của owner (`/usr/bin/passwd`); **sticky bit** trên `/tmp` (mode `1777`) chỉ cho user xoá file của chính mình. `sudo` cho phép nâng quyền có kiểm soát và có ghi log; sửa luật của nó bằng `visudo`.

**Quyền tối thiểu** (least privilege) trong thực tế: mỗi dịch vụ có **system user riêng** không có login shell, chỉ sở hữu thư mục dữ liệu của nó, đọc secret từ file mode `600`/`640`, và không bao giờ chạy bằng root. Mở cổng dưới 1024 cũng không cần root — cấp capability `CAP_NET_BIND_SERVICE` hoặc đặt reverse proxy phía trước.

---

## 6. systemd: chạy dịch vụ cho đúng cách

**systemd** là PID 1 trên gần như mọi distro hiện đại. Nó khởi động dịch vụ theo thứ tự phụ thuộc, khởi động lại khi dịch vụ crash, đặt mỗi dịch vụ vào cgroup riêng và thu output của chúng. Một dịch vụ được mô tả bằng **unit file**:

```ini
# /etc/systemd/system/orders-api.service
[Unit]
Description=Orders API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=orders
Group=orders
WorkingDirectory=/srv/orders
EnvironmentFile=/etc/orders/orders.env
ExecStart=/usr/bin/node /srv/orders/server.js
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
MemoryMax=1G
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload            # re-read unit files after editing
sudo systemctl enable --now orders-api  # start now AND at every boot
systemctl status orders-api             # state, main PID, last log lines
systemctl list-units --type=service --state=failed
```

Những chỗ hay dính bẫy:

- `start` chạy ngay; `enable` chỉ tạo liên kết để chạy lúc boot. Dịch vụ đã start nhưng chưa enable sẽ **biến mất sau khi reboot**.
- Sửa unit mà quên `daemon-reload` thì systemd vẫn dùng định nghĩa cũ.
- `Restart=on-failure` khởi động lại sau khi thoát không sạch (exit code khác 0, bị kill bởi signal bất thường, timeout); `Restart=always` khởi động lại cả khi thoát sạch. Nếu unit lỗi quá nhiều lần (mặc định 5 lần khởi động trong 10 giây) systemd ngừng thử và đánh dấu `failed`.
- `TimeoutStopSec` chính là grace period giữa `SIGTERM` và `SIGKILL`.
- Các giới hạn như `LimitNOFILE` và `MemoryMax` phải đặt **trong unit**; `ulimit` gõ trong shell của bạn không áp dụng cho dịch vụ.

---

## 7. journald và log

**journald** của systemd thu stdout/stderr của mọi dịch vụ, thông điệp kernel và syslog vào một **nhật ký nhị phân có đánh chỉ mục** (journal). Truy vấn bằng `journalctl`:

```bash
journalctl -u orders-api -f                 # follow one service
journalctl -u orders-api --since "1 hour ago" -p err
journalctl -b -1                            # previous boot (needs persistent storage)
journalctl -k | grep -i "out of memory"     # kernel messages
sudo journalctl --vacuum-size=500M          # trim old entries
```

Mặc định (`Storage=auto`) journal chỉ được lưu bền nếu thư mục `/var/log/journal` tồn tại; nếu không nó nằm trong `/run` và **mất khi reboot**. Giới hạn dung lượng bằng `SystemMaxUse=` trong `/etc/systemd/journald.conf`.

Log dạng text trong `/var/log` được xoay vòng bởi **logrotate** — hoặc đổi tên file rồi gửi signal để app mở lại file, hoặc dùng `copytruncate` (đơn giản, nhưng có thể mất vài dòng).

Góc nhìn kiến trúc: ổ đĩa cục bộ của server **không phải** chiến lược log — instance bị thay thế liên tục và không ai đi grep trên 40 node. Ghi log ra stdout/stderr, để journald hoặc container runtime thu lại, rồi đẩy về kho tập trung (CloudWatch Logs, Loki) — xem chủ đề observability.

---

## 8. Trình quản lý gói

**Trình quản lý gói** (package manager) cài phần mềm cùng các phụ thuộc từ repository có chữ ký, và theo dõi mọi file mà gói sở hữu.

| Họ | Công cụ | Định dạng gói | Gặp ở |
|---|---|---|---|
| Debian | `apt` (tầng thấp `dpkg`) | `.deb` | Debian, Ubuntu, base image `debian`/`ubuntu` |
| Red Hat | `dnf` (cũ là `yum`, tầng thấp `rpm`) | `.rpm` | RHEL, Rocky, Fedora, Amazon Linux 2023 |
| Alpine | `apk` | `.apk` | Alpine — base image nhỏ phổ biến cho container |

```bash
sudo apt-get update && sudo apt-get install -y --no-install-recommends nginx
apt-cache policy nginx          # candidate and installed versions
sudo dnf install -y nginx
apk add --no-cache curl
```

Các quyết định quan trọng:

- **Tính tái lập** (reproducibility). "Cài bản mới nhất" lúc boot khiến hai server dựng cách nhau một giờ đã khác nhau. Hãy ghim (pin) phiên bản quan trọng, hoặc tốt hơn, **đóng image** (bake AMI hoặc container image) một lần rồi deploy đúng artifact đó ở mọi nơi.
- **Vá lỗi** (patching). Build lại image định kỳ hoặc dùng patching được quản lý (SSM Patch Manager). Một server bất biến mà không bao giờ build lại chỉ là server chưa được vá.
- **libc.** Alpine dùng **musl** chứ không phải glibc: binary build cho glibc có thể không chạy và một số native module hoạt động khác — hãy test trước khi chọn Alpine.

---

## 9. Kiểm tra CPU và bộ nhớ

Khi "server chậm", hãy bắt đầu bằng số liệu, không phải phỏng đoán.

```bash
uptime        # load average over 1, 5, 15 minutes
top           # or htop: per-process CPU/mem, press 1 for per-core view
vmstat 1      # r (run queue), wa (I/O wait), si/so (swap in/out)
free -h
```

- **Load average** đếm các tác vụ đang sẵn sàng chạy *cộng với* các tác vụ ngủ không thể ngắt (`D`). Hãy so với số core: load 8 trên máy 8 core là bận, trên máy 2 core là quá tải. Load cao mà CPU rảnh và `wa` cao nghĩa là tiến trình đang **chờ I/O**, không phải chờ CPU — hãy nhìn vào đĩa.
- **`st` (steal)** là thời gian hypervisor lấy vCPU của bạn cho máy khác — đáng chú ý trên instance loại burstable đã hết CPU credit.

```text
$ free -h
        total   used   free   shared  buff/cache  available
Mem:     15Gi   5.1Gi  312Mi   20Mi      10Gi        9.9Gi
Swap:      0B     0B     0B
```

Cột `free` thấp là bình thường: Linux dùng RAM nhàn rỗi làm **page cache** và trả lại khi cần. Cột cần theo dõi là **`available`**.

Khi bộ nhớ thật sự cạn, **OOM killer** của kernel chọn một nạn nhân (có `oom_score` cao nhất, chỉnh được qua `oom_score_adj` từ -1000 tới 1000) và gửi `SIGKILL`. Dấu vết: exit code 137 và dòng `Out of memory: Killed process 4321 (java)` trong `dmesg` hoặc `journalctl -k`. Khi có giới hạn cgroup (`MemoryMax=`, memory limit của container), tiến trình bị kill khi group vượt giới hạn, kể cả khi host vẫn còn RAM trống.

---

## 10. Kiểm tra đĩa, mạng và file đang mở

```bash
df -h                    # space per mounted filesystem
df -i                    # inodes
du -sh /var/log/* | sort -h
iostat -x 1              # per-device %util, await (sysstat package)
ss -tlnp                 # listening TCP sockets with owning process
ss -s                    # socket summary by state
lsof -i :8080            # who has port 8080 open
```

`ss` thay thế `netstat` cũ: `-t` TCP, `-u` UDP, `-l` đang lắng nghe, `-n` hiển thị số, `-p` tiến trình. Dịch vụ "đang chạy" mà không truy cập được thường là do **bind vào `127.0.0.1` thay vì `0.0.0.0`** — `ss -tlnp` cho thấy ngay.

Một sự cố kinh điển: `df` báo đĩa đầy 100 %, nhưng `du` không tìm ra file lớn nào. Ai đó đã xoá một file log khổng lồ trong khi một tiến trình **vẫn đang mở nó**. Tên file đã mất, nhưng inode và các block dữ liệu vẫn bị giữ cho tới khi file descriptor cuối cùng được đóng.

```bash
lsof +L1                         # open files whose link count is 0 (deleted)
# fix: restart the process, or truncate through its fd
: > /proc/4321/fd/7
```

---

## 11. File descriptor và ulimit

**File descriptor (fd)** là một số nguyên nhỏ mà tiến trình dùng để tham chiếu tới file, **socket**, pipe hoặc thiết bị đang mở. `0`, `1`, `2` là stdin, stdout, stderr. Mỗi kết nối TCP, mỗi file log, mỗi kết nối trong pool database đều tốn một fd — nên một proxy bận với 20 000 kết nối từ client và 20 000 kết nối tới upstream cần hơn 40 000 fd.

| Cấp | Đặt ở đâu | Kiểm tra |
|---|---|---|
| Theo tiến trình (soft/hard) | `ulimit -n`, systemd `LimitNOFILE=`, `limits.conf` (phiên đăng nhập), container `--ulimit nofile=` | `/proc/<pid>/limits` |
| Toàn hệ thống | sysctl `fs.file-max` | `/proc/sys/fs/file-nr` |

Soft limit thường là **1024** với phiên tương tác — quá thấp cho proxy, database hay message broker. Khi chạm ngưỡng, `accept()`/`open()` thất bại với `EMFILE`, log ghi **"Too many open files"**, và dịch vụ ngừng nhận kết nối trong khi trông vẫn khoẻ mạnh.

```bash
cat /proc/$(pgrep -o nginx)/limits | grep "open files"
ls /proc/$(pgrep -o nginx)/fd | wc -l
```

Sửa ở đúng nơi dịch vụ được khởi động: `LimitNOFILE=65536` trong unit systemd (rồi `daemon-reload` và restart), hoặc cấu hình của container runtime. `limits.conf` **không** ảnh hưởng tới dịch vụ systemd, và `ulimit -n` trong shell chỉ ảnh hưởng tới shell đó cùng các tiến trình con. Cũng phải tìm nguyên nhân: số fd tăng đều không ngừng là **rò rỉ** (leak), và nâng giới hạn chỉ làm sự cố đến muộn hơn.

---

## 12. cgroups và namespaces: vì sao container là tính năng của Linux

Container là một tiến trình bình thường được kernel **giới hạn** bằng cgroups và **cô lập** bằng namespaces, cộng với một root filesystem riêng.

```text
         host kernel (shared by everything)
 +------------------------------------------------+
 |  cgroup /system.slice/orders-api.service       |
 |     memory.max = 1G   cpu.max = 50000 100000   |  <- how much
 |  +------------------------------------------+  |
 |  | namespaces: pid net mnt uts ipc user ... |  |  <- what it can see
 |  |   PID 1 inside  ==  PID 48213 on host    |  |
 |  +------------------------------------------+  |
 +------------------------------------------------+
```

- **cgroups** (control groups — nhóm kiểm soát) đo và giới hạn CPU, bộ nhớ, block I/O và số PID cho một nhóm tiến trình. Distro hiện đại dùng cây hợp nhất **cgroup v2** tại `/sys/fs/cgroup`; `MemoryMax=` của systemd, `docker run --memory` và limit của Kubernetes cuối cùng đều thành các giá trị trong đó.
- **Namespaces** cho tiến trình một góc nhìn riêng về tài nguyên toàn cục: **pid** (đánh số PID riêng), **net** (interface, IP, port riêng), **mnt** (bảng mount riêng), **uts** (hostname), **ipc**, **user** (ánh xạ UID — root bên trong, không có quyền bên ngoài), **cgroup** và **time**.

```bash
sudo unshare --pid --fork --mount-proc bash   # new PID namespace
ps aux                                        # only bash and ps, bash is PID 1
```

Hệ quả: container dùng chung **kernel của host**, nên một lỗ hổng kernel vượt qua được ranh giới container (ranh giới VM mạnh hơn); memory limit của container là giới hạn cgroup, nên vượt nó nghĩa là bị OOM kill với exit 137; và signal, PID 1, fd, phân quyền vẫn áp dụng y nguyên bên trong container. Các chủ đề Docker và Kubernetes xây trực tiếp trên nền này.

---

## Điểm cần nhớ khi phỏng vấn

- Container là **tiến trình Linux** bị ràng buộc bởi **cgroups** (được dùng bao nhiêu) và **namespaces** (được thấy những gì), dùng chung kernel của host.
- Tắt êm: **SIGTERM → grace period → SIGKILL**. `SIGKILL` và `SIGSTOP` không thể bắt. Exit **137 = 128 + 9** (SIGKILL/OOM), **143 = 128 + 15**.
- Quyền `rwx` = 4/2/1 cho owner/group/others; `x` trên thư mục nghĩa là được đi xuyên qua. Dịch vụ chạy bằng **user riêng, không phải root**.
- systemd: `enable` sống sót qua reboot, `start` thì không; `daemon-reload` sau khi sửa; đặt `LimitNOFILE`, `MemoryMax`, `Restart` trong unit.
- Log đi ra stdout → journald/runtime → kho tập trung; đừng dựa vào ổ đĩa cục bộ của node.
- `free` dễ gây hiểu nhầm; hãy nhìn **available**. Load cao + `wa` cao = nghẽn I/O.
- `df` đầy mà `du` nhỏ → **file đã xoá nhưng vẫn đang mở** (`lsof +L1`); báo "no space left" dù còn chỗ → **hết inode** (`df -i`).
- "Too many open files" → nâng `nofile` ở đúng nơi dịch vụ khởi động, và kiểm tra rò rỉ fd.
- Đóng image để tái lập được, nhưng phải build lại định kỳ để vá lỗi.

## Tóm tắt

- Tiến trình (fork/exec, trạng thái, PID 1) và signal quyết định dịch vụ khởi động, nạp lại và tắt ra sao.
- Cây thư mục tách riêng cấu hình (`/etc`), trạng thái và log (`/var`), chương trình (`/usr`) và góc nhìn kernel (`/proc`, `/sys`).
- User, group và bit phân quyền thực thi nguyên tắc quyền tối thiểu cho dịch vụ.
- systemd chạy, khởi động lại và giới hạn dịch vụ; journald thu log; package manager và image đóng sẵn giúp cài phần mềm có thể tái lập.
- `top`, `free`, `df`, `ss` và `lsof` trả lời phần lớn câu hỏi "vì sao hỏng"; fd bao gồm cả socket nên dịch vụ nhiều kết nối cần `nofile` cao hơn.
- cgroups và namespaces là các tính năng kernel làm nên container.
