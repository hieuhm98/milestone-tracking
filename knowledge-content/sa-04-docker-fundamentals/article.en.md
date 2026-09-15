# Docker Fundamentals – Containers from the Kernel Up

## 1. Container vs virtual machine

A **container** packages an application with its user-space dependencies (runtime, libraries, config) into one immutable **image** that runs the same way on any Linux host. It ends "works on my machine" — but the real difference from a VM is *what is shared*:

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

| | Virtual machine | Container |
|---|---|---|
| Isolation | Separate kernel per guest | Kernel features on a **shared kernel** |
| Startup | Tens of seconds+ (boots an OS) | Usually under a second (starts a process) |
| Size | GBs | MBs to a few hundred MB |
| Kernel exploit | Stays inside the guest | Can escape to the host |
| Different OS kernel | Yes | No — Linux containers need a Linux kernel |

That last row is why **Docker Desktop** on macOS/Windows runs a hidden Linux VM (WSL 2 on Windows). Architects combine both: containers for packaging and density, VMs or micro-VMs (e.g. Firecracker, which isolates AWS Lambda functions) for hard multi-tenant boundaries.

---

## 2. A container is just a process: namespaces

The kernel has no "container" object. A container is an ordinary process started with a restricted *view* of the system, built from **namespaces**:

| Namespace | Isolates | Effect inside the container |
|---|---|---|
| `pid` | Process IDs | App sees itself as **PID 1**, cannot see host processes |
| `net` | Network stack | Own interfaces, IP, routing table, ports |
| `mnt` | Mount points | Own root filesystem (the image) |
| `uts` | Hostname | Own hostname (defaults to the container ID) |
| `ipc` | Shared memory, SysV IPC | No shared memory with host processes |
| `user` | UID/GID mapping | Container root can map to an unprivileged host user |

Proof that it is a host process:

```bash
docker run -d --name web nginx:1.27
docker inspect --format '{{.State.Pid}}' web   # e.g. 48213 - a normal host PID
sudo ls -l /proc/48213/ns                      # the namespaces it lives in
```

Docker does **not** enable the user namespace by default (only with `userns-remap` or rootless mode), so root in a container is UID 0 on the host kernel, restrained by dropped capabilities, seccomp and AppArmor/SELinux. Hardening is topic 5.

---

## 3. cgroups: limiting what a container consumes

Namespaces control what a process can **see**; **control groups** (cgroups) control how much it can **use** — CPU, memory, I/O, process count. Current distributions use **cgroup v2**, supported by Docker since 20.10.

```bash
docker run -d --name api --memory 512m --cpus 1.5 --pids-limit 200 my-api:1.4.0
docker stats api   # live CPU %, memory usage / limit
```

The two resources fail differently — a favourite troubleshooting question:

- **CPU** is compressible: over quota, the container is **throttled** (slower, not dead).
- **Memory** is not: at the limit the kernel **OOM-kills** a process. The container exits with **137** (128 + SIGKILL) and `docker inspect` shows `"OOMKilled": true`.

With no flags a container may use all host CPU and memory, so one leaking container can starve a node. Containers are therefore a *composition* of Linux features, not a new kind of kernel object.

---

## 4. Docker's architecture: CLI, dockerd, containerd, runc

```text
docker CLI --REST over /var/run/docker.sock--> dockerd  (API, BuildKit builds, networks, volumes)
                                                  | gRPC
                                                  v
                                              containerd (pull/store images, container lifecycle)
                                                  |
                                              containerd-shim --> runc --> your process
                                                            (creates namespaces + cgroups, exits)
```

- **docker CLI** — only a client; `docker context` can point it at a remote engine.
- **dockerd** — the daemon. BuildKit is its default builder since Engine 23.0.
- **containerd** — CNCF runtime managing images and lifecycles; Kubernetes uses it directly via CRI.
- **runc** — the low-level **OCI runtime** that makes the kernel calls.

The **Open Container Initiative (OCI)** standardises image format, runtime and registry API. That is why an image from `docker build` runs unchanged on containerd, CRI-O or Podman, and why Kubernetes removing *dockershim* (v1.24) did not break anyone's images.

Security: the Docker socket is **root-equivalent**. Whoever can reach it (or an unprotected TCP port 2375) can start a container that mounts the host's `/`.

---

## 5. Images, layers and the union filesystem

An **image** is a stack of read-only **layers** plus a JSON config. Each filesystem-changing instruction (`RUN`, `COPY`, `ADD`) adds a layer holding only the *diff*. Layers are content-addressed by SHA-256, so a layer shared by many images is stored and pulled once.

At run time the storage driver (**overlay2** by default) merges layers into one view and adds a thin **writable layer** per container:

```text
  Container A           Container B
[ writable layer ]    [ writable layer ]   <- per container, deleted with it
        \                  /
   [ L3: COPY . .          ]  read-only
   [ L2: RUN npm ci        ]  read-only, shared
   [ L1: node:22-slim      ]  read-only
```

**Copy-on-write:** modifying a file from a lower layer first copies it up into the writable layer. Consequences:

- 50 containers from one image cost almost no extra disk.
- Heavy writes inside the container filesystem are slow and **vanish when the container is removed** — use volumes.
- **Deleting a file in a later layer does not shrink the image**; the bytes stay in the earlier layer behind a "whiteout". `RUN rm secret.txt` does not remove a secret.

`docker image history my-api:1.4.0` lists each layer, its size and the instruction that created it.

---

## 6. Dockerfile instructions

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

| Instruction | Purpose | Gotcha |
|---|---|---|
| `FROM` | Base image | Pin a version, not `latest` |
| `WORKDIR` | Set/create working dir | `RUN cd` does not persist |
| `COPY` / `ADD` | Copy from build context | `ADD` also fetches URLs and auto-extracts tars — prefer `COPY` |
| `RUN` | Command at **build** time, new layer | Chain related steps with `&&` |
| `ENV` | Variable at build **and** run time | Stored in the image — no secrets |
| `ARG` | Build-time variable (`--build-arg`) | Not visible at run time |
| `EXPOSE` | **Documents** a port | Publishes nothing |
| `USER` | User for later steps and the container | Default is root |
| `ENTRYPOINT` | Executable that always runs | Override with `--entrypoint` |
| `CMD` | Default args / command | Replaced by args after the image name |

Here `docker run my-api` runs `node server.js`; `docker run my-api worker.js` runs `node worker.js`.

**Exec form vs shell form.** `CMD ["node", "server.js"]` (exec form) runs the app directly as PID 1. `CMD node server.js` (shell form) runs `/bin/sh -c "node server.js"`: the shell can stay PID 1 and does **not forward SIGTERM**, so `docker stop` waits out the grace period and then kills. Use exec form.

---

## 7. The build cache

For each instruction the builder asks: *do I have a layer from this exact instruction on this exact parent?* A hit reuses it. **The first miss invalidates every later instruction.**

- `RUN` — matched on the command **string** only, so `RUN apt-get update` stays cached even when upstream changed.
- `COPY` / `ADD` — matched on a checksum of file **contents** (mtimes ignored).

```text
Bad order                              Good order
COPY . .        <- any code edit       COPY package*.json ./
RUN npm ci         reinstalls deps     RUN npm ci      <- cached until deps change
                                       COPY . .        <- only this reruns
```

Rules: least-changing things first, source code last; `apt-get update && apt-get install -y …` in **one** `RUN`; keep the build context small (`.dockerignore`, topic 5). CI runners start with an empty cache — BuildKit can store it in a registry with `--cache-to` / `--cache-from`. `--no-cache` forces a clean build.

---

## 8. The container lifecycle

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

`docker run` = pull if missing + create + start. Common flags: `-d`, `--name`, `--rm`, `-e KEY=value`, `-it`.

**Graceful stop.** `docker stop` sends **SIGTERM** to PID 1, waits **10 seconds** by default (`-t` to change), then sends **SIGKILL**. `docker kill` sends SIGKILL at once. Apps should catch SIGTERM, stop accepting work, drain in-flight requests and exit — orchestrators rely on this for rolling deploys.

**PID 1 is special:** the kernel applies no default signal action to it, so an app with no SIGTERM handler ignores the signal; it must also reap zombie children. `docker run --init` adds a tiny init (`tini`) that does both.

| Exit code | Meaning |
|---|---|
| 0 / 1 | Clean exit / application error |
| 125 / 126 / 127 | Docker failed / command not executable / command not found |
| 137 | 128 + 9: SIGKILL — OOM kill, `docker kill`, or grace period expired |
| 143 | 128 + 15: terminated by an unhandled SIGTERM |

Exited containers keep their writable layer until `docker rm` — a common way build servers run out of disk.

---

## 9. Persisting data: volumes, bind mounts, tmpfs

| | Named volume | Bind mount | tmpfs |
|---|---|---|---|
| Data lives in | Docker-managed dir (`/var/lib/docker/volumes`) | Any host path | Host memory |
| Portability | Good, no host path assumed | Tied to host layout | Nothing persists |
| Empty mount + image files | Image content copied in | Host dir hides image files | — |
| Typical use | Databases | Dev live-reload, host config | Scratch or sensitive data |

```bash
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=devonly \
  --mount type=volume,source=pgdata,target=/var/lib/postgresql/data postgres:17

docker run -d -p 8080:80 \
  --mount type=bind,source="$(pwd)"/nginx.conf,target=/etc/nginx/nginx.conf,readonly nginx:1.27
```

`-v` and `--mount` do the same job, but for a bind mount `--mount` **errors** if the host path is missing while `-v` silently creates an empty directory — a classic "my config vanished".

A volume is still **local to one host**: reschedule the container elsewhere and the data stays behind. Production databases therefore use managed services (RDS) or network storage (EBS/EFS) wired in by the orchestrator.

---

## 10. Networking and port publishing

| Driver | Behaviour | Use |
|---|---|---|
| `bridge` (default) | Private host network, NAT outbound; default `docker0` is `172.17.0.0/16` | Single-host apps |
| `host` | No network namespace, host stack directly | Max performance, many ports (Linux) |
| `none` | Loopback only | Jobs that need no network |
| `overlay` | Spans hosts (Swarm) | Multi-host; Kubernetes uses CNI instead |

On the **default** bridge, containers reach each other only by IP. A **user-defined bridge** adds embedded DNS (`127.0.0.11`) that resolves **container names**, and isolates groups of containers:

```bash
docker network create app-net
docker run -d --name db  --network app-net -e POSTGRES_PASSWORD=devonly postgres:17
docker run -d --name api --network app-net -e DATABASE_HOST=db -p 8080:3000 my-api:1.4.0
```

`-p hostPort:containerPort` installs NAT rules:

```text
client --> host 203.0.113.10:8080 --(iptables DNAT)--> 172.18.0.3:3000 (api)
api    --> db:5432   (container-to-container: container port, no -p needed)
```

Gotchas from real incidents:

- The app must listen on **`0.0.0.0`** in the container; bound to `127.0.0.1`, the published port answers nothing.
- `-p 8080:3000` binds **all host interfaces**; use `-p 127.0.0.1:8080:3000` for local-only.
- Docker's iptables rules can **bypass ufw** — a "blocked" database port may be public.
- `EXPOSE` publishes nothing; `-P` maps every exposed port to a random high host port.

---

## 11. Registries and image naming

A **registry** serves images over the OCI distribution API: Docker Hub, Amazon ECR, GitHub `ghcr.io`, Harbor, or the self-hosted `registry` image (port 5000).

```text
123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/payments/api:1.4.0
|------------- registry host -------------------| |repository| |tag|

nginx:1.27  ==  docker.io/library/nginx:1.27    (Docker Hub defaults)
nginx@sha256:<digest>                           (pinned, immutable)
```

- A **tag** is a mutable pointer; **`latest` is only the default tag name**, not "newest".
- A **digest** is the manifest's hash and never changes — pin by digest or use immutable tags (ECR supports them) for reproducible deploys.
- **Multi-arch** images use an index pointing to per-platform images. An `arm64`-only image built on an Apple Silicon laptop fails on `amd64` servers with `exec format error`; use `docker buildx build --platform linux/amd64,linux/arm64`.

```bash
docker tag my-api:1.4.0 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/payments/api:1.4.0
docker push 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/payments/api:1.4.0
```

Docker Hub **rate-limits pulls** for anonymous and free users, which breaks CI and node scale-outs. Mirror base images into your own registry (e.g. ECR pull-through cache).

---

## 12. Core CLI and a debugging workflow

| Task | Command |
|---|---|
| Build | `docker build -t my-api:1.4.0 .` |
| List running / all | `docker ps` / `docker ps -a` |
| Logs | `docker logs -f --tail 100 api` |
| Shell in container | `docker exec -it api sh` |
| Full state (JSON) | `docker inspect api` |
| Resource usage | `docker stats` |
| Disk usage / clean-up | `docker system df` / `docker system prune` |

When "the container doesn't work":

```text
1. docker ps -a            Running, restarting or exited? Which exit code?
2. docker logs api         Last output before it died (stdout/stderr only)
3. docker inspect api      OOMKilled? env, mounts, networks, port bindings
4. docker exec -it api sh  Listening on 0.0.0.0? Does "db" resolve?
5. docker run -it --entrypoint sh my-api:1.4.0
                           Dies at start? Open a shell and run the command by hand
```

`docker logs` only shows **stdout/stderr** — an app logging to a file inside the container shows nothing. Log to stdout; every log collector builds on that convention.

---

## Key interview points

- A container is a **Linux process** isolated by **namespaces** (what it sees) and limited by **cgroups** (what it uses), **sharing the host kernel** — fast, but weaker isolation than a VM.
- Stack: **CLI → dockerd → containerd → runc**; OCI makes images portable to containerd, CRI-O, Podman.
- Images are **read-only, content-addressed layers** merged by **overlay2**, plus a copy-on-write layer per container; deleting in a later layer never shrinks an image.
- The **build cache** breaks at the first changed instruction: dependencies first, source last.
- **Exec form** for `CMD`/`ENTRYPOINT`; `docker stop` = SIGTERM then SIGKILL after 10 s; exit **137** = SIGKILL, often OOM.
- **Volumes** for data, **bind mounts** for dev/config, **tmpfs** for memory-only; volumes are host-local.
- **User-defined bridges** give name-based DNS; listen on `0.0.0.0`; `-p` binds all interfaces and can bypass ufw.
- **Tags are mutable, digests immutable**; build multi-arch to avoid `exec format error`.

## Summary

- Containers ship an app with its dependencies and start in under a second on any compatible Linux kernel.
- Namespaces and cgroups are kernel features; Docker assembles them via containerd and runc.
- Layers, content addressing and copy-on-write make images cheap to ship and run many times.
- Dockerfile order decides whether builds take seconds or minutes.
- Signals and exit codes explain graceful shutdowns and crashes.
- Pick volumes, bind mounts or tmpfs deliberately; use user-defined networks; publish only what must be reachable.
- Push to a registry you control, reference by version or digest, debug with `ps -a`, `logs`, `inspect`, `exec`.
