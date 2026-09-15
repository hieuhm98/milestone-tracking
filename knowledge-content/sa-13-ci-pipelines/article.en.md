# CI Pipelines – From Commit to Trusted Artifact

## 1. What continuous integration really means

**Continuous integration (CI)** is a *practice* before it is a tool: developers merge small changes into a shared mainline at least daily, and every merge is verified by an automated build and test run.

- **Integrate often, in small batches.** A 50-line change is easy to review and revert; a three-week branch is a merge nobody wants to own.
- **The mainline is always releasable.** A red `main` is fixed or reverted within minutes.
- **Fast feedback.** Aim for about **10 minutes** from push to result; slower pipelines get skipped.
- **Build once.** Package one time; later environments receive those exact bytes (promotion is topic 14).
- **Reproducible.** Pipeline as code in the repo, locked dependencies.

```text
 developer          CI server                                  registry
 push / open PR --> checkout -> lint -> test -> build -> scan -> publish --> app:1.4.2
       ^                         |       |       |       |
       +-------------------------+-------+-------+-------+
         fail fast: the first red stage stops the run and notifies the author
```

---

## 2. Branching strategies: trunk-based vs GitFlow

Git mechanics are in the Git basics topic; the question here is *which workflow lets CI work*.

| | Trunk-based | GitFlow |
|---|---|---|
| Long-lived branches | `main` only | `main` + `develop` |
| Feature branch lifetime | Hours to ~1–2 days | Days to weeks |
| Release branches | Optional, cut from trunk | `release/*`, `hotfix/*` |
| Unfinished work | Hidden behind feature flags | Stays on the branch |
| Fits | Frequent deploys, SaaS | Versioned products with several supported releases |
| Main risk | Needs strong tests | Merge hell, late integration |

GitFlow (Vincent Driessen, 2010) models scheduled releases; Driessen later noted that teams doing continuous delivery should prefer a simpler flow. Its CI problem: code on long branches is not integrated — CI runs against a snapshot that drifts from everyone else's. **GitHub Flow** sits between: only `main`, plus short PR branches.

**Trunk-based development** is what DORA research links to high performance. Two tools make it safe:

- **Branch protection / rulesets**: required status checks and reviews, no force-push to `main`.
- **Merge queue** (GitHub) / **merge trains** (GitLab): each PR is re-tested against the latest `main` plus the PRs ahead of it, so two individually green PRs cannot combine into a red `main`.

---

## 3. Pipeline stages: lint → test → build → scan → publish

Order stages **cheapest and most likely to fail first**.

| Stage | Typical tools | Purpose |
|---|---|---|
| Lint & type-check | ESLint, `tsc --noEmit`, hadolint | Trivial errors in seconds |
| Unit tests | Jest, Vitest, JUnit, pytest | Logic, no network |
| Build | `npm run build`, `docker build` | Produce the artifact once |
| Integration tests | Testcontainers, service containers | Real DB/queue behaviour |
| Scan | SCA (Dependabot, Snyk), SAST (CodeQL, Semgrep), gitleaks, Trivy | Security and licence gates |
| Publish | `docker push`, `npm publish` | Versioned, immutable artifact |

- **Fail fast.** A lint error should cost 30 seconds, not 12 minutes.
- **Parallelise independent jobs** (lint, unit tests, SAST) and gate `build` on all of them.
- **Publish only from trusted refs.** PRs run up to scan; only `main` or a tag pushes to the registry.
- **Gates must be binding.** A scan that never fails is decoration — e.g. fail on *critical* CVEs with a fix available, and make the check required.

---

## 4. The test pyramid in CI

```text
            /\
           /E2E\          few, slow, brittle   (browser, full stack)
          /------\
         /  integ- \      some                  (API + real DB in a container)
        /   ration  \
       /-------------\
      /  unit tests   \   many, fast, isolated  (ms each, no I/O)
     /-----------------\
```

The **test pyramid** (Mike Cohn): mostly fast unit tests, fewer integration tests, a thin E2E layer. The inverse **ice-cream cone** yields 45-minute pipelines that fail randomly.

- **Flaky tests** (pass/fail with no code change) destroy trust: people re-run instead of reading failures. Quarantine them into a non-blocking job, then fix or delete.
- **Sharding** splits a suite across parallel jobs (`jest --shard=1/4`, `playwright test --shard=1/4`).
- **Hermetic tests** start their own Postgres container instead of sharing a staging DB.
- **Coverage is a signal, not a target**; a floor on changed lines beats a global 100%.

---

## 5. GitHub Actions anatomy

A **workflow** is a YAML file in `.github/workflows/`, triggered by **events**. It holds **jobs** that run on **runners**; each job is a list of **steps** — shell commands (`run`) or reusable **actions** (`uses`).

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
```

- **Jobs run in parallel by default**, each on a fresh VM; `needs:` adds ordering. Jobs share no disk — use artifacts or caches.
- **Steps in a job** share one machine and workspace.
- **`permissions:`** scopes the automatic `GITHUB_TOKEN`; start at `contents: read`.
- **`concurrency` + `cancel-in-progress`** kills superseded runs.
- **`timeout-minutes`** defaults to **360**; set a realistic value.
- Triggers: `push`, `pull_request`, `schedule` (cron), `workflow_dispatch` (manual), `workflow_call` (reusable workflow).

---

## 6. GitLab CI anatomy and comparison

GitLab uses one `.gitlab-ci.yml`. Jobs belong to **stages**; jobs in one stage run in parallel, stages run in order, and `needs:` turns it into a DAG.

```yaml
stages: [lint, test, build]
default:
  image: node:22-alpine
lint:
  stage: lint
  script:
    - npm ci
    - npm run lint
unit-test:
  stage: test
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
build-image:
  stage: build
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  script:
    - echo "docker build and push here"
```

| Concept | GitHub Actions | GitLab CI |
|---|---|---|
| Definition | `.github/workflows/*.yml` | `.gitlab-ci.yml` + `include:` |
| Ordering | `needs:` | `stages:` + optional `needs:` |
| Conditions | `on:` + `if:` | `rules:` |
| Matrix | `strategy.matrix` | `parallel:matrix` |
| Secrets | Repo/org/environment secrets | CI/CD variables (masked, protected) |
| Runner | GitHub-hosted / self-hosted | GitLab-hosted / self-managed (shell, docker, kubernetes executors) |

On AWS: **CodeBuild** (`buildspec.yml`) orchestrated by **CodePipeline**. Others: Jenkins, CircleCI, Azure Pipelines.

---

## 7. Caching and artifacts

| | Cache | Artifact |
|---|---|---|
| Purpose | Speed up future runs | Hand over this run's output |
| Content | `~/.npm`, `.m2`, pip cache | Build output, test reports, SBOM |
| If lost | Run is only slower | Downstream jobs break |
| Keyed by | Lockfile hash + OS | Run + name |
| GitHub | `actions/cache` (10 GB per repo by default, unused 7 days → evicted) | `actions/upload-artifact` (90-day default retention) |

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
```

- **Key on the lockfile hash**; `restore-keys` gives a partial hit to start from.
- **Cache the download cache, not `node_modules`**, and still run `npm ci`, which installs exactly the lockfile.
- **Docker layers**: install dependencies before `COPY . .`; in CI export BuildKit cache (`docker buildx build --cache-to type=gha --cache-from type=gha`).
- **Cache poisoning**: GitHub scopes caches by branch — a PR can read `main`'s cache but not write to it.

---

## 8. Matrix builds and monorepos

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [20, 22]
    exclude:
      - os: windows-latest
        node: 20
```

That yields **3 jobs** (2 × 2 minus one). A matrix can generate at most **256 jobs** per workflow run. `fail-fast` defaults to `true` (one failure cancels the rest); `max-parallel` caps concurrency. Matrices suit **libraries** supporting several runtimes; an app deployed on one runtime needs one.

**Monorepos** need to run *less*:

- **Path filters** (`on.push.paths: ['services/billing/**']`) — but a required check that never runs blocks merges; add an always-running gate job.
- **Affected-graph tools** (Nx, Turborepo, Bazel) run only projects a change touches, with remote caching.

---

## 9. Secrets and cloud access from CI

CI can push to your registry and often reach production — a prime target.

- **Secrets live in the CI secret store**, never in YAML. Log masking is best-effort (base64 defeats it).
- **Least privilege**: default `permissions: contents: read`; in GitLab, **protected variables** exist only on protected branches/tags.
- **Fork PRs get no secrets** on `pull_request`. **`pull_request_target`** runs *with* secrets — checking out and running PR code there is the "pwn request" hole.
- **OIDC instead of long-lived cloud keys**: the job gets a short-lived signed token, the cloud trusts it for one repo/branch and returns temporary credentials.

```text
 GitHub Actions job                        AWS
 1. request OIDC JWT  --> token.actions.githubusercontent.com
    (sub = repo:acme/shop:ref:refs/heads/main)
 2. AssumeRoleWithWebIdentity(JWT) ----> STS checks role trust policy
                                         (issuer + aud + sub)
 3. <---- temporary credentials
 4. push image to ECR
```

```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/gha-ecr-push
      aws-region: ap-southeast-1
```

The trust policy **must** constrain `sub`; otherwise any GitHub repository can assume the role.

---

## 10. Artifact versioning

| Scheme | Example | Good for |
|---|---|---|
| Semantic version | `1.4.2` | Libraries/APIs: MAJOR breaking, MINOR feature, PATCH fix |
| Git SHA | `app:3f9c2ab` | Services — unique, traceable |
| Combined | `1.4.2-3f9c2ab` | Readable and traceable |
| `latest` | `app:latest` | Local use only — **never deploy it** |

- **Immutable tags.** `app:1.4.2` is never overwritten; enable registry tag immutability (ECR supports it) and deploy by **digest** (`app@sha256:…`), which cannot move.
- **Build once, tag many.** Add `1.4.2` as another tag on the same digest instead of rebuilding.
- **Automate versions** with semantic-release or release-please from **Conventional Commits**: `fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major.
- **Embed metadata**: OCI label `org.opencontainers.image.revision` and a `/version` endpoint.

---

## 11. Supply-chain security

Attackers target what you *build with*. In March 2025 the `tj-actions/changed-files` action had its version tags repointed to a malicious commit that dumped CI secrets into logs; every workflow using it by tag ran the payload.

- **Lock dependencies**: commit lockfiles; `npm ci` fails if lockfile and `package.json` disagree.
- **Pin third-party actions by full commit SHA**: `uses: actions/checkout@<40-char-sha> # v4`. Tags move, SHAs do not; Dependabot/Renovate bump the pins.
- **Pin base images by digest** for reproducible builds.
- **Scan**: SCA (dependency CVEs), SAST (your code), secrets, container images.
- **SBOM** (software bill of materials): a machine-readable list of every component and version. Standards: **SPDX** (Linux Foundation, ISO/IEC 5962) and **CycloneDX** (OWASP); tools: Syft, Trivy. At the next Log4Shell you query SBOMs instead of grepping repos.
- **Sign and attest**: Sigstore **cosign** (keyless via OIDC), build provenance, signature verification at deploy. **SLSA** grades how tamper-resistant the build is.

```bash
syft ghcr.io/acme/shop:3f9c2ab -o cyclonedx-json > sbom.json
trivy image --severity CRITICAL --exit-code 1 ghcr.io/acme/shop:3f9c2ab
cosign sign --yes ghcr.io/acme/shop@sha256:4b1e...
```

---

## 12. Runners and pipeline anti-patterns

| | Hosted runners | Self-hosted runners |
|---|---|---|
| Operations | None | You patch, scale, secure |
| Isolation | Fresh VM per job | Persistent unless ephemeral |
| Network | Public internet | Can reach private VPC |
| Hardware | Standard sizes | GPUs, ARM, anything |

Self-hosted runners should be **ephemeral** (one job, then destroyed — e.g. Actions Runner Controller on Kubernetes) and **never serve public repositories**, where a fork PR could run code inside your network.

Review red flags: pipeline logic clicked into a CI UI instead of versioned files; rebuilding per environment; everything sequential; ignored red builds; one admin token shared by every job.

---

## Key interview points

- CI = **small, frequent merges to mainline**, each verified automatically; `main` stays green; ~10-minute feedback.
- **Trunk-based + short PRs + feature flags** suits continuous delivery; **GitFlow** suits scheduled multi-version releases.
- **Merge queues / merge trains** stop two green PRs from breaking `main` together.
- Stages **cheap-first**: lint → unit → build → integration → scan → publish; parallelise; publish only from trusted refs.
- **Test pyramid**: many unit, some integration, few E2E; quarantine flaky tests.
- **Cache ≠ artifact**: caches are disposable, keyed on lockfile hashes; artifacts are required outputs.
- **OIDC** for cloud access; scoped `GITHUB_TOKEN`; beware `pull_request_target`; no self-hosted runners on public repos.
- **Build once**, tag by **git SHA**, **immutable** tags, deploy by **digest**; never `latest`.
- Supply chain: **lockfiles, SHA-pinned actions, SBOM (SPDX/CycloneDX), cosign signing, SLSA**.

## Summary

- CI keeps the mainline releasable through small merges and fast automated checks.
- The branching model decides how much integration really happens.
- Pipelines are ordered, parallel and binding.
- GitHub Actions (workflow → jobs → steps) and GitLab CI (stages → jobs) express the same ideas.
- Caching, matrices and affected-only builds keep CI fast; OIDC and least privilege keep it safe.
- The output is one immutable, versioned, scanned, signed artifact with an SBOM — ready for delivery in topic 14.
