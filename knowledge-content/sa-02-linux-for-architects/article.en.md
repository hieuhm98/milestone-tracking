# Linux for Architects

## 1. Why an architect needs Linux

Almost everything you design runs on Linux: EC2 instances, container hosts, Kubernetes nodes, most managed and serverless runtimes. You need not be a sysadmin, but you must understand the mechanisms that decide **how a process starts, stops, gets resources and fails** — they surface as architecture problems: lost requests on deploy, "too many open files" under load, disks filling up at 3 a.m.

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

Applications never touch hardware directly; they ask the **kernel** through **system calls** (`open`, `read`, `fork`, `socket`…). A *distribution* (Ubuntu, Debian, RHEL, Amazon Linux, Alpine) is the kernel plus user-space tools, a package manager and defaults. Key point for later: **containers are not a separate technology — they are ordinary Linux processes** wrapped with kernel features (section 12).

---

## 2. Processes: PID, fork/exec, states

A **process** is a running program with its own virtual memory, a **PID**, a parent (**PPID**), an owning user (**UID**) and a table of open files. New processes are created by `fork()` (copy the parent) followed by `exec()` (replace the copy with a new program). That is exactly what a shell does when you type `node server.js`.

**PID 1** is the first user-space process (normally `systemd` on a server). It adopts orphaned processes and must **reap** exited children.

| State (in `ps`/`top`) | Meaning |
|---|---|
| `R` | Running or runnable (waiting for a CPU) |
| `S` | Interruptible sleep — waiting for an event (most idle processes) |
| `D` | Uninterruptible sleep — usually blocked on disk or network storage I/O |
| `T` | Stopped (e.g. by `SIGSTOP` or Ctrl+Z) |
| `Z` | **Zombie** — exited, but the parent has not yet called `wait()` |

A **zombie** holds no memory, only a process-table slot; you cannot kill it because it is already dead. Fix the **parent** that never calls `wait()` (or kill it so PID 1 adopts and reaps the zombie).

```bash
ps -eo pid,ppid,user,stat,%cpu,cmd --sort=-%cpu | head
pstree -p 1234          # process tree under PID 1234
```

---

## 3. Signals, graceful shutdown and exit codes

A **signal** is an asynchronous notification sent to a process. The ones every architect should know:

| Signal | Number | Default | Typical use |
|---|---|---|---|
| `SIGHUP` | 1 | terminate | Many daemons treat it as "reload config" (`nginx -s reload`) |
| `SIGINT` | 2 | terminate | Ctrl+C in a terminal |
| `SIGKILL` | 9 | terminate | Forced kill — **cannot be caught, blocked or ignored** |
| `SIGTERM` | 15 | terminate | Polite "please shut down" — the default of `kill` |
| `SIGSTOP` | 19 (x86) | stop | Pause — also cannot be caught |

**Graceful shutdown** is a contract between the platform and your code. `systemctl stop`, `docker stop` and Kubernetes all send `SIGTERM` first, wait for a grace period, then send `SIGKILL` (Docker's default wait is 10 s; Kubernetes' `terminationGracePeriodSeconds` defaults to 30 s).

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

When a process dies from a signal, shells and container runtimes report exit code **128 + signal number**: **137 = SIGKILL** (often the OOM killer or an expired grace period), **143 = SIGTERM**, **130 = SIGINT**.

Container gotcha: a process running as **PID 1 inside a container** gets no default signal handling — if it installs no handler, `SIGTERM` is simply ignored and you wait for the `SIGKILL`. Running the app through `sh -c` makes it worse, because the shell does not forward signals. Fixes (a tiny init such as `tini`, exec-form `CMD`) belong to the Docker topics.

---

## 4. The filesystem hierarchy

Linux has one tree rooted at `/`; disks and network volumes are **mounted** into it. The Filesystem Hierarchy Standard tells you where things live:

| Path | What lives there |
|---|---|
| `/etc` | System and service configuration (`/etc/nginx/nginx.conf`, `/etc/systemd/system/`) |
| `/var` | Variable data: `/var/log` (logs), `/var/lib` (state, e.g. `/var/lib/docker`, `/var/lib/postgresql`) |
| `/usr/bin`, `/usr/lib` | Installed programs and libraries (`/bin` is a symlink to `/usr/bin` on modern distros) |
| `/home`, `/tmp` | User home directories; temporary files (often cleared on reboot) |
| `/run` | Runtime state since boot (PID files, sockets), in memory |
| `/proc`, `/sys` | Virtual filesystems exposing kernel and process state — not on disk |

"**Everything is a file**": files, devices, pipes and sockets share one file API. `/proc/<pid>/` shows a process's command line, limits and open file descriptors; `/proc/meminfo` feeds `free`.

A filename points to an **inode** — the structure holding permissions, owner, size and block locations. A filesystem has a fixed number of inodes, so millions of tiny files (session files, cache shards) can make a disk "full" while `df -h` still shows free space. Check with `df -i`.

Architecture habit: put **state that must survive** (database files, uploads) on a separate volume mounted under `/var/lib/...` or `/data`, so the root volume can be rebuilt from an image.

---

## 5. Users, groups and permissions

Every process runs as a **user** (UID) with one primary and several supplementary **groups** (GIDs). Accounts live in `/etc/passwd`, password hashes in `/etc/shadow`, groups in `/etc/group`. **UID 0 is root** and bypasses normal permission checks.

Each file has an owner, a group and three permission triplets:

```text
-rwxr-x---  1 deploy  web  4096  app.sh
 \_/\_/\_/
  |  |  +-- others: ---  (0)
  |  +----- group:  r-x  (5)
  +-------- owner:  rwx  (7)      => chmod 750 app.sh
```

| Bit | On a file | On a directory |
|---|---|---|
| `r` (4) | read contents | list names |
| `w` (2) | modify contents | create, delete, rename entries |
| `x` (1) | execute | **enter/traverse** (needed to reach anything inside) |

```bash
chown deploy:web /srv/app          # owner and group
chmod 640 /etc/myapp/config.env    # owner rw, group r, others nothing
chmod -R u=rwX,g=rX,o= /srv/app    # capital X: execute only on dirs
umask                              # 0022 -> new files 644, dirs 755
```

Special bits: **setuid** runs a binary as its owner (`/usr/bin/passwd`); the **sticky bit** on `/tmp` (mode `1777`) lets users delete only their own files. `sudo` grants controlled, audited privilege escalation; edit its rules with `visudo`.

Least privilege in practice: each service gets its **own system user** with no login shell, owns only its data directory, reads secrets from a `600`/`640` file, and never runs as root. Ports below 1024 do not require root either — grant `CAP_NET_BIND_SERVICE` or put a reverse proxy in front.

---

## 6. systemd: running services properly

**systemd** is PID 1 on almost every modern distribution. It starts services in dependency order, restarts them on crash, puts each in its own cgroup and captures their output. A service is a **unit file**:

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

Things that bite:

- `start` runs it now; `enable` only creates the boot-time link. A service that is started but not enabled **disappears after a reboot**.
- After editing a unit, forget `daemon-reload` and systemd keeps using the old definition.
- `Restart=on-failure` restarts after unclean exits (non-zero exit code, killed by an unexpected signal, timeout); `Restart=always` also restarts clean exits. If a unit fails too often (by default 5 starts within 10 s) systemd stops trying and marks it `failed`.
- `TimeoutStopSec` is the grace period between `SIGTERM` and `SIGKILL`.
- Limits such as `LimitNOFILE` and `MemoryMax` belong **in the unit**; a `ulimit` typed in your shell does not apply to services.

---

## 7. journald and logs

systemd's **journald** collects stdout/stderr of every service, kernel messages and syslog into an indexed binary journal. Query it with `journalctl`:

```bash
journalctl -u orders-api -f                 # follow one service
journalctl -u orders-api --since "1 hour ago" -p err
journalctl -b -1                            # previous boot (needs persistent storage)
journalctl -k | grep -i "out of memory"     # kernel messages
sudo journalctl --vacuum-size=500M          # trim old entries
```

By default (`Storage=auto`) the journal is persistent only if `/var/log/journal` exists; otherwise it lives in `/run` and is **lost on reboot**. Cap its size with `SystemMaxUse=` in `/etc/systemd/journald.conf`.

Text logs in `/var/log` are rotated by **logrotate** — either rename and signal the app to reopen, or `copytruncate` (simple, but can lose a few lines).

The architect's view: a server's local disk is **not** a log strategy — instances are replaced and nobody greps 40 nodes. Log to stdout/stderr, let journald or the container runtime capture it, and ship it to a central store (CloudWatch Logs, Loki) — see the observability topic.

---

## 8. Package managers

A package manager installs software with its dependencies from signed repositories and tracks every file it owns.

| Family | Tool | Package format | Seen on |
|---|---|---|---|
| Debian | `apt` (low level `dpkg`) | `.deb` | Debian, Ubuntu, `debian`/`ubuntu` base images |
| Red Hat | `dnf` (older `yum`, low level `rpm`) | `.rpm` | RHEL, Rocky, Fedora, Amazon Linux 2023 |
| Alpine | `apk` | `.apk` | Alpine — popular small container base |

```bash
sudo apt-get update && sudo apt-get install -y --no-install-recommends nginx
apt-cache policy nginx          # candidate and installed versions
sudo dnf install -y nginx
apk add --no-cache curl
```

Decisions that matter:

- **Reproducibility.** "Install latest" at boot makes two servers built an hour apart differ. Pin critical versions, or better, **bake an image** (AMI or container image) once and deploy that artifact everywhere.
- **Patching.** Rebuild images regularly or use managed patching (SSM Patch Manager). An immutable server you never rebuild is just an unpatched server.
- **libc.** Alpine uses **musl**, not glibc: binaries built for glibc may not run and some native modules behave differently — test before choosing it.

---

## 9. Inspecting CPU and memory

When "the server is slow", start with numbers, not guesses.

```bash
uptime        # load average over 1, 5, 15 minutes
top           # or htop: per-process CPU/mem, press 1 for per-core view
vmstat 1      # r (run queue), wa (I/O wait), si/so (swap in/out)
free -h
```

- **Load average** counts tasks that are runnable *plus* those in uninterruptible sleep (`D`). Compare it with the number of cores: a load of 8 on 8 cores is busy, on 2 cores it is overloaded. High load with idle CPU and high `wa` means processes are **waiting on I/O**, not CPU — look at the disk.
- **`st` (steal)** is time the hypervisor gave your vCPU to someone else — relevant on burstable instances that ran out of CPU credits.

```text
$ free -h
        total   used   free   shared  buff/cache  available
Mem:     15Gi   5.1Gi  312Mi   20Mi      10Gi        9.9Gi
Swap:      0B     0B     0B
```

Low `free` is normal: Linux uses idle RAM as **page cache** and gives it back on demand. The column to watch is **`available`**.

When memory really runs out, the kernel's **OOM killer** picks a victim (highest `oom_score`, tunable via `oom_score_adj` from -1000 to 1000) and sends it `SIGKILL`. Evidence: exit code 137 and `Out of memory: Killed process 4321 (java)` in `dmesg` or `journalctl -k`. Under a cgroup limit (`MemoryMax=`, container limits) the kill happens when the group exceeds its limit, even if the host has free RAM.

---

## 10. Inspecting disk, network and open files

```bash
df -h                    # space per mounted filesystem
df -i                    # inodes
du -sh /var/log/* | sort -h
iostat -x 1              # per-device %util, await (sysstat package)
ss -tlnp                 # listening TCP sockets with owning process
ss -s                    # socket summary by state
lsof -i :8080            # who has port 8080 open
```

`ss` replaced the older `netstat`: `-t` TCP, `-u` UDP, `-l` listening, `-n` numeric, `-p` process. A service "running" but unreachable is often **bound to `127.0.0.1` instead of `0.0.0.0`** — `ss -tlnp` shows it immediately.

A classic incident: `df` says the disk is 100 % full, but `du` cannot find the big files. Someone deleted a huge log file while a process **still has it open**. The name is gone, but the inode and its blocks stay allocated until the last file descriptor closes.

```bash
lsof +L1                         # open files whose link count is 0 (deleted)
# fix: restart the process, or truncate through its fd
: > /proc/4321/fd/7
```

---

## 11. File descriptors and ulimits

A **file descriptor (fd)** is a small integer a process uses to refer to an open file, **socket**, pipe or device. `0`, `1`, `2` are stdin, stdout, stderr. Every TCP connection, every log file and every connection in a DB pool costs one fd — so a busy proxy with 20 000 client connections and 20 000 upstream connections needs over 40 000.

| Level | Where it is set | Check |
|---|---|---|
| Per process (soft/hard) | `ulimit -n`, systemd `LimitNOFILE=`, `limits.conf` (login sessions), container `--ulimit nofile=` | `/proc/<pid>/limits` |
| System-wide | `fs.file-max` sysctl | `/proc/sys/fs/file-nr` |

The soft limit is commonly **1024** for interactive sessions — far too low for a proxy, database or message broker. When it is hit, `accept()`/`open()` fail with `EMFILE`, logged as **"Too many open files"**, and the service stops accepting connections while looking healthy.

```bash
cat /proc/$(pgrep -o nginx)/limits | grep "open files"
ls /proc/$(pgrep -o nginx)/fd | wc -l
```

Fix it where the service starts: `LimitNOFILE=65536` in the systemd unit (then `daemon-reload` and restart), or the container runtime setting. `limits.conf` does **not** affect systemd services, and `ulimit -n` in your shell affects only that shell and its children. Also check the cause: a steadily growing fd count is a **leak**, and raising the limit only delays the outage.

---

## 12. cgroups and namespaces: why containers are Linux features

A container is a normal process that the kernel **limits** with cgroups and **isolates** with namespaces, plus a separate root filesystem.

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

- **cgroups (control groups)** meter and cap CPU, memory, block I/O and PID count for a group of processes. Modern distros use the unified **cgroup v2** tree at `/sys/fs/cgroup`; systemd `MemoryMax=`, `docker run --memory` and Kubernetes limits all end up as values there.
- **Namespaces** give a process its own view of a global resource: **pid** (own PID numbering), **net** (own interfaces, IPs, ports), **mnt** (own mount table), **uts** (hostname), **ipc**, **user** (UID mapping — root inside, unprivileged outside), **cgroup** and **time**.

```bash
sudo unshare --pid --fork --mount-proc bash   # new PID namespace
ps aux                                        # only bash and ps, bash is PID 1
```

Consequences: containers share the **host kernel**, so a kernel exploit crosses container boundaries (a VM boundary is stronger); a container memory limit is a cgroup limit, so exceeding it means OOM kill and exit 137; and signals, PID 1, fds and permissions all still apply inside containers. The Docker and Kubernetes topics build on this.

---

## Key interview points

- Containers are **Linux processes** constrained by **cgroups** (how much) and **namespaces** (what they see), sharing the host kernel.
- Graceful shutdown: **SIGTERM → grace period → SIGKILL**. `SIGKILL` and `SIGSTOP` cannot be caught. Exit **137 = 128 + 9** (SIGKILL/OOM), **143 = 128 + 15**.
- Permissions `rwx` = 4/2/1 for owner/group/others; `x` on a directory means traverse. Services run as **dedicated non-root users**.
- systemd: `enable` survives reboot, `start` does not; `daemon-reload` after edits; put `LimitNOFILE`, `MemoryMax`, `Restart` in the unit.
- Logs go to stdout → journald/runtime → central storage; never rely on a node's local disk.
- `free` is misleading; watch **available**. High load + high `wa` = I/O bottleneck.
- `df` full but `du` small → **deleted file still open** (`lsof +L1`); "no space left" with free space → **inodes exhausted** (`df -i`).
- "Too many open files" → raise `nofile` where the service actually starts, and check for fd leaks.
- Bake images for reproducibility, but rebuild them to keep patching.

## Summary

- Processes (fork/exec, states, PID 1) and signals drive how services start, reload and shut down.
- The filesystem hierarchy separates config (`/etc`), state and logs (`/var`), programs (`/usr`) and kernel views (`/proc`, `/sys`).
- Users, groups and permission bits enforce least privilege for services.
- systemd runs, restarts and limits services; journald collects their logs; package managers and baked images install software reproducibly.
- `top`, `free`, `df`, `ss` and `lsof` answer most "why is it broken" questions; fds include sockets, so busy services need higher `nofile`.
- cgroups and namespaces are the kernel features that make containers possible.
