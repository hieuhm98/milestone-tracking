# Docker in Production – Lean, Secure, Observable Containers

## 1. From "it runs" to "production-ready"

Topic 4 got a container running. An architecture review asks harder questions: how big is the image and what is inside it, does it run as root, where are the secrets, what happens when it hangs or dies, can it starve the host, where do the logs go, and can we trust what we deploy?

The guiding idea: a production image is an **immutable, minimal, least-privilege artifact**, built once and promoted unchanged through every environment. Only configuration differs.

```text
 source ──► build (CI) ──► SBOM + scan ──► registry + sign ──► dev ──► staging ──► prod
                 │                                     │
          tag = git SHA                     same digest everywhere;
                                            only env config changes
```

---

## 2. Multi-stage builds

A build needs compilers, dev dependencies and test tools; the running app needs none of them. A **multi-stage build** has several `FROM` lines; only the last stage becomes the image, and it copies just the artifacts it needs with `COPY --from=`.

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

The toolchain, source and dev dependencies stay in the discarded stage: a smaller image, fewer CVEs, fewer tools for an attacker. `docker build --target build .` stops at a named stage (useful for running tests in CI). BuildKit, the default builder since Docker Engine 23.0, skips stages the target does not need and builds independent stages in parallel.

---

## 3. Small images: slim, Alpine, distroless, scratch

| Base | Contents | Pros | Cons |
|---|---|---|---|
| Full `debian`/`ubuntu` | Whole distro | Everything works | Large, many CVEs |
| `*-slim` | Trimmed Debian, glibc | Good default | Still has shell and apt |
| `alpine` | musl libc + BusyBox, a few MB | Tiny, has a shell | musl ≠ glibc: native modules, DNS, performance surprises |
| **distroless** | Runtime libs only, no shell or package manager | Minimal surface, `:nonroot` tags | No `docker exec sh`; debug via `:debug` tags |
| `scratch` | Empty | Smallest | Static binaries only; add CA certs yourself |

A static Go binary shows the extreme end:

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

The result is roughly the binary, CA certificates and a `nonroot` user (UID 65532). Rule of thumb: **slim for interpreted runtimes, distroless or scratch for static binaries, Alpine only once you have tested musl.**

---

## 4. Build context, `.dockerignore` and reproducibility

`docker build .` sends the whole directory (the **build context**) to the builder. Without a `.dockerignore` that includes `.git`, `node_modules` and `.env`: slow builds, a cache busted by any file change under `COPY . .`, and secrets copied into the image.

```text
# .dockerignore
.git
node_modules
dist
*.log
.env
.env.*
```

Reproducibility rules reviewers check:

- **Never deploy `:latest`** — it is a mutable pointer. Tag app images with the git SHA.
- **Pin base images by digest** (`FROM node:22-bookworm-slim@sha256:…`) and let Renovate/Dependabot bump it.
- **Use lockfiles** with strict installs (`npm ci`, `go mod download`).
- **Order layers by change frequency** and cache package downloads with `RUN --mount=type=cache,target=/root/.npm npm ci`.

---

## 5. Run as non-root with least privilege

By default the container process runs as **root (UID 0)** — the same UID 0 as the host unless user namespaces are enabled. A kernel escape, a writable host mount or a mounted Docker socket then means host root.

```dockerfile
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --chown=app:app . /app
USER app
```

Official Node images already have a `node` user; distroless has `nonroot`. Then harden the runtime:

```bash
docker run -d --name api \
  --read-only --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -p 8080:8080 \
  registry.example.com/api:3f9c2a1
```

`--read-only` + `--tmpfs /tmp` stops writes to the image filesystem, `--cap-drop ALL` removes kernel capabilities (add back only what is needed), and `no-new-privileges` blocks setuid escalation. **Never** use `--privileged` or mount `/var/run/docker.sock` — both are effectively root on the host. Rootless Docker or `userns-remap` go further by mapping container root to an unprivileged host UID.

---

## 6. Secrets at build time and at runtime

Layers are additive and metadata is readable by anyone who can pull the image:

```dockerfile
# BAD: recorded in image metadata / docker history
ARG NPM_TOKEN
ENV NPM_TOKEN=$NPM_TOKEN

# BAD: rm hides the file, but the bytes stay in the earlier layer
COPY .npmrc /root/.npmrc
RUN npm ci && rm /root/.npmrc
```

**Build time — BuildKit secret mounts.** The secret is mounted for one `RUN` step and never written to a layer (default path `/run/secrets/<id>`):

```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
```

```bash
docker build --secret id=npmrc,src=$HOME/.npmrc -t api:3f9c2a1 .
```

For private Git dependencies, `RUN --mount=type=ssh` with `docker build --ssh default` forwards the SSH agent instead of copying a key.

**Runtime — inject, never bake:**

| Method | Trade-off |
|---|---|
| Environment variables | Simple, 12-factor; but visible in `docker inspect` and crash dumps |
| Mounted secret files (Compose/Swarm `secrets`, Kubernetes Secret volumes) | Files under `/run/secrets/`, not in `inspect` |
| Secrets manager at startup (Vault, AWS Secrets Manager, SSM) | Central rotation and audit; needs a workload identity |

On AWS, an ECS task definition references Secrets Manager or SSM ARNs and injects them at start. Rotation and Vault are topic 19.

---

## 7. Healthchecks and graceful shutdown

A running process is not a working service — it may be deadlocked or still warming up.

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

- Exit `0` = healthy, `1` = unhealthy; `docker ps` shows `starting`, `healthy` or `unhealthy`. Defaults: interval 30s, timeout 30s, retries 3.
- The command runs **inside** the container; slim/distroless images usually have no `curl`.
- **Plain Docker only reports** health — it does not restart an unhealthy container. Compose uses it for `depends_on: condition: service_healthy`, Swarm replaces unhealthy tasks, and **Kubernetes ignores `HEALTHCHECK`** in favour of its own probes (topic 7).
- Keep the endpoint cheap: checking every dependency turns one DB blip into a fleet-wide "unhealthy".

**Graceful shutdown:** `docker stop` sends `SIGTERM`, waits **10 seconds** (`-t` to change), then `SIGKILL`.

```text
docker stop api
   │  SIGTERM ──► PID 1 ─┬─ stop accepting new requests
   │                     ├─ finish in-flight requests, close DB pool
   │                     └─ exit 0                     (clean)
   └─ still alive after 10 s ──► SIGKILL  (exit 137, requests dropped)
```

Two traps make apps miss `SIGTERM`:

1. **Shell form** `CMD node server.js` runs `/bin/sh -c`, making the shell PID 1, and it does not forward signals. Use **exec form** `CMD ["node", "server.js"]` and run the runtime directly rather than through `npm start`.
2. **PID 1 gets no default signal handling** from the kernel: without a handler, `SIGTERM` is ignored. Handle it in code or run with `docker run --init` (tini forwards signals and reaps zombies).

---

## 8. Restart policies and resource limits

| Policy | Restarts when | Use |
|---|---|---|
| `no` (default) | Never | One-off jobs |
| `on-failure[:N]` | Non-zero exit, at most N times | Workers that should retry, not loop forever |
| `always` | Any exit, and on daemon start even after a manual stop | Rarely what you want |
| `unless-stopped` | Any exit and on daemon start, unless stopped manually | Long-running services on one host |

Docker adds a growing delay between restarts (doubling from 100 ms), so a crash loop shows `Restarting` in `docker ps`.

Without **resource limits**, one container can consume all host memory and CPU:

```bash
docker run -d --name worker \
  --memory 512m --memory-swap 512m \
  --cpus 1.5 --pids-limit 200 \
  --restart on-failure:5 \
  registry.example.com/worker:3f9c2a1
```

- `--memory` is a hard cgroup cap. Exceed it and the process is **OOM-killed**: exit code **137** (128 + SIGKILL 9) and `"OOMKilled": true` in `docker inspect`.
- `--memory-swap` equal to `--memory` disables swap for the container.
- `--cpus` is a CFS quota: the container is **throttled, not killed**. `--cpu-shares` is only a relative weight under contention.
- `--pids-limit` stops fork bombs.
- Exit codes to recognise: `0` clean, `1` app error, `137` SIGKILL (OOM or stop timeout), `143` SIGTERM (128 + 15).

---

## 9. Logging drivers

Containers **log to stdout/stderr**, never to files inside the container. The daemon passes both streams to a **logging driver**.

| Driver | Destination | Notes |
|---|---|---|
| `json-file` (default) | JSON files in `/var/lib/docker/containers/<id>/` | **No rotation by default** |
| `local` | Compact files | Rotated and compressed by default |
| `journald` / `syslog` | Host logging system | |
| `fluentd`, `gelf`, `awslogs`, `splunk` | Remote collector / cloud | `docker logs` still works via dual logging (Engine 20.10+) |
| `none` | Discarded | |

The classic outage: a chatty container fills the host disk because `json-file` never rotated. Fix it daemon-wide in `/etc/docker/daemon.json` (applies to containers created afterwards):

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

By default logging is **blocking**: a slow remote driver stalls the app's writes; `--log-opt mode=non-blocking` drops lines instead. On ECS the `awslogs` driver ships to CloudWatch Logs. Structured logging is topic 16.

---

## 10. Image scanning, SBOMs and signing

```text
 build ──► SBOM ──► scan ──(CRITICAL? fail)──► push ──► sign digest ──► deploy verifies signature
```

**Scanning** matches the image's packages against CVE databases — **Trivy**, **Grype**, **Docker Scout**, Snyk, or registry scanning such as Amazon ECR:

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.example.com/api:3f9c2a1
```

Scan in CI to gate the build **and rescan images already in the registry**: a clean image today has new CVEs tomorrow. The cure is usually rebuilding on a patched base, which is why small bases and automated rebuilds beat triaging hundreds of findings.

An **SBOM** (Software Bill of Materials) lists every package and version, in SPDX or CycloneDX format — generated by Syft or `docker buildx build --sbom=true`. When a Log4Shell-style CVE lands, you query SBOMs instead of pulling every image.

**Signing** proves the image came from your pipeline unmodified. **Sigstore cosign** is the de facto standard and supports keyless signing bound to the CI's OIDC identity:

```bash
cosign sign registry.example.com/api@sha256:<digest>
```

Sign the pushed image by **digest** and deploy by digest, because tags can be moved; enforce verification at deploy time (e.g. a Kubernetes admission policy). Docker Content Trust (Notary v1) is the older approach, largely superseded by cosign and Notation.

---

## 11. Docker Compose for multi-service apps

**Compose** describes a multi-container app in YAML and runs it on a **single host**. Compose v2 is the `docker compose` CLI plugin (Python `docker-compose` v1 reached end of life in 2023); the top-level `version:` key is obsolete.

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

- Services share a default project network and reach each other by **service name** (`db:5432`). Only `api` publishes a port, so Postgres is not exposed.
- `depends_on` alone only orders start-up; `condition: service_healthy` waits for the healthcheck. Apps should still retry connections.
- `${API_TAG}` is read from the shell or a `.env` file. `compose.override.yaml` is merged automatically (dev bind mounts); prod uses `-f compose.yaml -f compose.prod.yaml`.

```bash
docker compose up -d --build
docker compose logs -f api
docker compose down          # add -v to delete named volumes
```

**Enough for:** local dev, CI integration tests, small single-VM deployments. **Not enough for:** multiple hosts, cross-node self-healing, rolling deploys, autoscaling — that is orchestration (Kubernetes, topic 6; ECS on AWS).

---

## 12. The twelve-factor app

The **Twelve-Factor App** (Heroku, 2011) is a checklist for apps that fit containers.

| # | Factor | In container terms |
|---|---|---|
| 1 | Codebase | One repo per app, many deploys |
| 2 | Dependencies | Declared and isolated in the image |
| 3 | Config | In the environment, not the image |
| 4 | Backing services | DB, cache, queue attached by URL |
| 5 | Build, release, run | Image + config = release; stages kept separate |
| 6 | Processes | Stateless; state lives in backing services |
| 7 | Port binding | App serves on its own port |
| 8 | Concurrency | Scale out with more containers |
| 9 | Disposability | Fast start, graceful `SIGTERM` shutdown |
| 10 | Dev/prod parity | Same image everywhere |
| 11 | Logs | Event streams to stdout |
| 12 | Admin processes | Migrations run as one-off containers from the same image |

Most often violated: **config** baked into images, **processes** keeping sessions on local disk, **disposability** ignored by apps that miss `SIGTERM`, and **logs** written to files.

---

## Key interview points

- Build once, promote the **same digest**; only config changes. Never deploy `:latest`.
- **Multi-stage builds** keep toolchains out of runtime images; **slim** for glibc runtimes, **distroless/scratch** for static binaries.
- **`.dockerignore`** keeps `.git`/`.env` out and the cache effective.
- Run **non-root**, `--read-only`, `--cap-drop ALL`; never `--privileged` or the Docker socket.
- `ARG`/`ENV` and deleted files leak secrets through layers; use **`RUN --mount=type=secret`**.
- Plain Docker `HEALTHCHECK` only reports; use **exec form** and handle `SIGTERM`; `docker stop` kills after 10 s.
- **Exit 137** = SIGKILL, usually OOM; CPU limits throttle rather than kill.
- `json-file` **does not rotate** unless `max-size`/`max-file` are set.
- Scan in CI and continuously, produce SBOMs, sign with **cosign**, deploy by digest.
- Compose is single-host; `depends_on` needs `service_healthy` to wait for readiness.

## Summary

- Production images are immutable, minimal, least-privilege artifacts configured per environment.
- Multi-stage builds, small pinned bases and `.dockerignore` give small, reproducible images.
- Non-root users, runtime hardening and BuildKit secret mounts limit damage and keep credentials out of layers.
- Healthchecks, signal-aware shutdown, restart policies and resource limits make failure predictable.
- Logs go to stdout through a rotating or shipping driver; scanning, SBOMs and signing secure the supply chain.
- Compose runs multi-service stacks on one host, and twelve-factor principles tie it together.
