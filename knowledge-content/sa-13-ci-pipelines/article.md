# CI Pipeline – Từ commit tới artifact đáng tin cậy

## 1. Tích hợp liên tục thực sự nghĩa là gì

**Tích hợp liên tục** (continuous integration – CI) trước hết là một *thói quen làm việc*, sau đó mới là công cụ: developer merge những thay đổi nhỏ vào nhánh chính dùng chung (mainline) ít nhất mỗi ngày, và mỗi lần merge đều được kiểm chứng bằng build và test tự động.

- **Tích hợp thường xuyên, từng mẻ nhỏ.** Thay đổi 50 dòng thì dễ review và dễ revert; một nhánh sống ba tuần là một cuộc merge không ai muốn nhận.
- **Mainline luôn ở trạng thái release được.** `main` đỏ thì phải sửa hoặc revert trong vài phút.
- **Phản hồi nhanh.** Nhắm khoảng **10 phút** từ lúc push tới lúc có kết quả; pipeline chậm hơn sẽ bị người ta lờ đi.
- **Build một lần** (build once). Đóng gói một lần duy nhất; các môi trường sau nhận đúng những byte đó (việc promote thuộc bài 14).
- **Tái lập được** (reproducible). Pipeline là code nằm trong repo, dependency được khoá phiên bản.

```text
 developer          CI server                                  registry
 push / open PR --> checkout -> lint -> test -> build -> scan -> publish --> app:1.4.2
       ^                         |       |       |       |
       +-------------------------+-------+-------+-------+
         fail fast: the first red stage stops the run and notifies the author
```

---

## 2. Chiến lược phân nhánh: trunk-based vs GitFlow

Thao tác Git cơ bản đã có ở bài Git cơ bản; câu hỏi ở đây là *quy trình nhánh nào giúp CI phát huy tác dụng*.

| | Trunk-based | GitFlow |
|---|---|---|
| Nhánh sống lâu | Chỉ `main` | `main` + `develop` |
| Tuổi thọ nhánh feature | Vài giờ tới ~1–2 ngày | Vài ngày tới vài tuần |
| Nhánh release | Tuỳ chọn, cắt từ trunk | `release/*`, `hotfix/*` |
| Việc chưa xong | Ẩn sau feature flag | Nằm lại trên nhánh |
| Phù hợp | Deploy thường xuyên, SaaS | Sản phẩm có version, hỗ trợ nhiều bản song song |
| Rủi ro chính | Cần test tốt | Merge hell, tích hợp muộn |

GitFlow (Vincent Driessen, 2010) mô hình hoá các đợt release theo lịch; sau này chính Driessen ghi chú rằng đội làm continuous delivery nên chọn quy trình đơn giản hơn. Vấn đề của GitFlow với CI: code trên nhánh dài không hề được tích hợp — CI vẫn chạy, nhưng trên một bản chụp ngày càng lệch khỏi code của mọi người. **GitHub Flow** nằm ở giữa: chỉ có `main` cùng các nhánh PR ngắn.

**Trunk-based development** là mô hình mà nghiên cứu DORA gắn với các đội hiệu suất cao. Hai công cụ giúp nó an toàn:

- **Branch protection / rulesets**: bắt buộc status check và review, cấm force-push lên `main`.
- **Merge queue** (GitHub) / **merge train** (GitLab): mỗi PR được test lại trên `main` mới nhất cộng các PR xếp trước nó, nên hai PR xanh riêng lẻ không thể gộp lại thành `main` đỏ.

---

## 3. Các stage của pipeline: lint → test → build → scan → publish

Sắp xếp stage theo nguyên tắc **rẻ nhất và dễ fail nhất chạy trước**.

| Stage | Công cụ điển hình | Mục đích |
|---|---|---|
| Lint & type-check | ESLint, `tsc --noEmit`, hadolint | Bắt lỗi vặt trong vài giây |
| Unit test | Jest, Vitest, JUnit, pytest | Logic, không gọi mạng |
| Build | `npm run build`, `docker build` | Tạo artifact đúng một lần |
| Integration test | Testcontainers, service container | Hành vi thật với DB/queue |
| Scan | SCA (Dependabot, Snyk), SAST (CodeQL, Semgrep), gitleaks, Trivy | Cổng kiểm soát bảo mật và license |
| Publish | `docker push`, `npm publish` | Artifact có version, bất biến |

- **Fail fast.** Một lỗi lint chỉ nên tốn 30 giây, không phải 12 phút.
- **Chạy song song các job độc lập** (lint, unit test, SAST) và chỉ cho `build` chạy khi tất cả đều xanh.
- **Chỉ publish từ ref tin cậy.** PR chạy tới bước scan; chỉ `main` hoặc tag mới được push lên registry.
- **Cổng kiểm soát phải có hiệu lực thật.** Một bước scan không bao giờ fail chỉ để trang trí — ví dụ fail khi có CVE mức *critical* đã có bản vá, và đặt check đó là bắt buộc.

---

## 4. Tháp kiểm thử trong CI

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

**Tháp kiểm thử** (test pyramid, Mike Cohn): phần lớn là unit test nhanh, ít integration test hơn, và một lớp E2E mỏng. Hình ngược lại — **cây kem ốc quế** (ice-cream cone) — sinh ra pipeline 45 phút fail ngẫu nhiên.

- **Flaky test** (lúc pass lúc fail dù code không đổi) phá huỷ niềm tin: mọi người bấm chạy lại thay vì đọc lỗi. Cách ly chúng vào một job không chặn merge, rồi sửa hoặc xoá.
- **Sharding** chia bộ test ra nhiều job song song (`jest --shard=1/4`, `playwright test --shard=1/4`).
- **Hermetic test** tự dựng container Postgres riêng thay vì dùng chung DB staging.
- **Coverage là tín hiệu, không phải mục tiêu**; đặt ngưỡng cho các dòng thay đổi tốt hơn đòi 100% toàn cục.

---

## 5. Cấu trúc GitHub Actions

Một **workflow** là file YAML trong `.github/workflows/`, được kích hoạt bởi **event**. Nó chứa các **job** chạy trên **runner**; mỗi job là danh sách **step** — lệnh shell (`run`) hoặc **action** tái sử dụng (`uses`).

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

- **Các job mặc định chạy song song**, mỗi job trên một VM mới; `needs:` tạo thứ tự. Các job không chia sẻ ổ đĩa — muốn chuyển dữ liệu thì dùng artifact hoặc cache.
- **Các step trong một job** dùng chung máy và thư mục làm việc.
- **`permissions:`** giới hạn quyền của `GITHUB_TOKEN` tự động; bắt đầu từ `contents: read`.
- **`concurrency` + `cancel-in-progress`** huỷ các lần chạy đã lỗi thời khi có push mới.
- **`timeout-minutes`** mặc định là **360**; hãy đặt giá trị thực tế.
- Trigger: `push`, `pull_request`, `schedule` (cron), `workflow_dispatch` (chạy tay), `workflow_call` (reusable workflow).

---

## 6. Cấu trúc GitLab CI và so sánh

GitLab dùng một file `.gitlab-ci.yml`. Job thuộc về **stage**; các job trong cùng stage chạy song song, các stage chạy tuần tự, và `needs:` biến nó thành một DAG.

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

| Khái niệm | GitHub Actions | GitLab CI |
|---|---|---|
| Định nghĩa | `.github/workflows/*.yml` | `.gitlab-ci.yml` + `include:` |
| Thứ tự | `needs:` | `stages:` + `needs:` tuỳ chọn |
| Điều kiện | `on:` + `if:` | `rules:` |
| Matrix | `strategy.matrix` | `parallel:matrix` |
| Secret | Secret cấp repo/org/environment | CI/CD variable (masked, protected) |
| Runner | GitHub-hosted / self-hosted | GitLab-hosted / self-managed (executor shell, docker, kubernetes) |

Trên AWS: **CodeBuild** (`buildspec.yml`) được điều phối bởi **CodePipeline**. Các lựa chọn khác: Jenkins, CircleCI, Azure Pipelines.

---

## 7. Cache và artifact

| | Cache | Artifact |
|---|---|---|
| Mục đích | Tăng tốc các lần chạy sau | Chuyển giao output của lần chạy này |
| Nội dung | `~/.npm`, `.m2`, pip cache | Output build, báo cáo test, SBOM |
| Nếu mất | Chỉ chạy chậm hơn | Job phía sau hỏng |
| Khoá theo | Hash lockfile + OS | Lần chạy + tên |
| GitHub | `actions/cache` (mặc định 10 GB/repo, không dùng 7 ngày → bị xoá) | `actions/upload-artifact` (mặc định giữ 90 ngày) |

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
```

- **Đặt key theo hash của lockfile**; `restore-keys` cho phép khớp một phần để có điểm xuất phát.
- **Cache thư mục tải về, không cache `node_modules`**, và vẫn chạy `npm ci` để cài đúng theo lockfile.
- **Docker layer**: cài dependency trước `COPY . .`; trong CI export cache của BuildKit (`docker buildx build --cache-to type=gha --cache-from type=gha`).
- **Đầu độc cache** (cache poisoning): GitHub giới hạn cache theo nhánh — PR đọc được cache của `main` nhưng không ghi đè được.

---

## 8. Matrix build và monorepo

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

Cấu hình này sinh ra **3 job** (2 × 2 trừ một). Một matrix sinh tối đa **256 job** cho mỗi lần chạy workflow. `fail-fast` mặc định là `true` (một job fail sẽ huỷ các job còn lại); `max-parallel` giới hạn số job chạy đồng thời. Matrix hợp với **thư viện** phải hỗ trợ nhiều runtime; một ứng dụng chỉ deploy trên một runtime thì chỉ cần test runtime đó.

**Monorepo** thì ngược lại, cần chạy *ít hơn*:

- **Lọc theo đường dẫn** (`on.push.paths: ['services/billing/**']`) — nhưng một required check không bao giờ chạy sẽ chặn merge; hãy thêm một job "gate" luôn chạy.
- **Công cụ tính phần bị ảnh hưởng** (Nx, Turborepo, Bazel) chỉ chạy các project mà thay đổi chạm tới, kèm remote cache.

---

## 9. Secret và truy cập cloud từ CI

CI có quyền push lên registry và thường chạm được tới production — mục tiêu hàng đầu của kẻ tấn công.

- **Secret nằm trong kho secret của CI**, không bao giờ trong YAML. Việc che log (masking) chỉ là cố gắng tối đa — mã hoá base64 là qua mặt được.
- **Quyền tối thiểu** (least privilege): mặc định `permissions: contents: read`; trong GitLab, **protected variable** chỉ tồn tại trên nhánh/tag được bảo vệ.
- **PR từ fork không nhận secret** với event `pull_request`. **`pull_request_target`** chạy *kèm* secret — checkout rồi chạy code của PR trong đó chính là lỗ hổng "pwn request".
- **OIDC thay cho key cloud dài hạn**: job nhận một token ký số ngắn hạn, cloud tin token đó cho đúng một repo/nhánh và trả về credential tạm thời.

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

Trust policy **bắt buộc** phải ràng buộc `sub`; nếu không, bất kỳ repository nào trên GitHub cũng assume được role đó.

---

## 10. Đánh version cho artifact

| Cách đánh | Ví dụ | Phù hợp |
|---|---|---|
| Semantic version | `1.4.2` | Thư viện/API: MAJOR phá tương thích, MINOR tính năng, PATCH sửa lỗi |
| Git SHA | `app:3f9c2ab` | Service — duy nhất, truy vết được |
| Kết hợp | `1.4.2-3f9c2ab` | Dễ đọc và truy vết được |
| `latest` | `app:latest` | Chỉ dùng ở máy local — **không bao giờ deploy** |

- **Tag bất biến** (immutable tag). `app:1.4.2` không bao giờ bị ghi đè; bật tag immutability trên registry (ECR có hỗ trợ) và deploy theo **digest** (`app@sha256:…`), thứ không thể dịch chuyển.
- **Build một lần, gắn nhiều tag.** Thêm tag `1.4.2` vào cùng digest thay vì build lại.
- **Tự động hoá version** bằng semantic-release hoặc release-please dựa trên **Conventional Commits**: `fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major.
- **Nhúng metadata**: OCI label `org.opencontainers.image.revision` và endpoint `/version`.

---

## 11. Bảo mật chuỗi cung ứng phần mềm

Kẻ tấn công ngày càng nhắm vào những thứ bạn *dùng để build*. Tháng 3/2025, action `tj-actions/changed-files` bị trỏ lại các tag version sang một commit độc hại, in secret của CI ra log; mọi workflow dùng nó theo tag đều chạy payload đó.

- **Khoá dependency**: commit lockfile; `npm ci` fail nếu lockfile và `package.json` lệch nhau.
- **Pin action bên thứ ba bằng full commit SHA**: `uses: actions/checkout@<40-char-sha> # v4`. Tag có thể bị dời, SHA thì không; để Dependabot/Renovate cập nhật các pin.
- **Pin base image bằng digest** để build tái lập được.
- **Scan**: SCA (CVE trong dependency), SAST (code của bạn), secret, container image.
- **SBOM** (software bill of materials – **danh mục thành phần phần mềm**): danh sách máy đọc được gồm mọi thành phần và phiên bản. Chuẩn: **SPDX** (Linux Foundation, ISO/IEC 5962) và **CycloneDX** (OWASP); công cụ: Syft, Trivy. Khi có một Log4Shell tiếp theo, bạn truy vấn SBOM thay vì grep từng repo.
- **Ký và chứng thực** (sign & attest): Sigstore **cosign** (keyless qua OIDC), build provenance, kiểm tra chữ ký lúc deploy. **SLSA** là khung đánh giá mức độ chống giả mạo của quy trình build.

```bash
syft ghcr.io/acme/shop:3f9c2ab -o cyclonedx-json > sbom.json
trivy image --severity CRITICAL --exit-code 1 ghcr.io/acme/shop:3f9c2ab
cosign sign --yes ghcr.io/acme/shop@sha256:4b1e...
```

---

## 12. Runner và các anti-pattern của pipeline

| | Hosted runner | Self-hosted runner |
|---|---|---|
| Vận hành | Không cần | Bạn tự vá, scale, bảo mật |
| Cô lập | VM mới cho mỗi job | Tồn tại lâu nếu không làm ephemeral |
| Mạng | Internet công cộng | Vào được VPC nội bộ |
| Phần cứng | Cấu hình chuẩn | GPU, ARM, tuỳ ý |

Self-hosted runner nên là **ephemeral** (chạy một job rồi huỷ — ví dụ Actions Runner Controller trên Kubernetes) và **không bao giờ phục vụ repository public**, nơi một PR từ fork có thể chạy code bên trong mạng của bạn.

Dấu hiệu đáng lo khi review: logic pipeline được click trên giao diện CI thay vì nằm trong file có version; build lại cho từng môi trường; mọi thứ chạy tuần tự; build đỏ bị lờ đi; một token admin dùng chung cho mọi job.

---

## Điểm cần nhớ khi phỏng vấn

- CI = **merge nhỏ, thường xuyên vào mainline**, mỗi lần đều kiểm chứng tự động; `main` luôn xanh; phản hồi trong ~10 phút.
- **Trunk-based + PR ngắn + feature flag** hợp với continuous delivery; **GitFlow** hợp với release theo lịch, nhiều version song song.
- **Merge queue / merge train** ngăn hai PR xanh cùng nhau làm đỏ `main`.
- Stage **rẻ trước**: lint → unit → build → integration → scan → publish; chạy song song; chỉ publish từ ref tin cậy.
- **Tháp kiểm thử**: nhiều unit, vừa phải integration, ít E2E; cách ly flaky test.
- **Cache ≠ artifact**: cache mất cũng không sao, key theo hash lockfile; artifact là output bắt buộc.
- **OIDC** để truy cập cloud; giới hạn `GITHUB_TOKEN`; cẩn thận `pull_request_target`; không dùng self-hosted runner cho repo public.
- **Build một lần**, tag theo **git SHA**, tag **bất biến**, deploy theo **digest**; không bao giờ `latest`.
- Chuỗi cung ứng: **lockfile, pin action bằng SHA, SBOM (SPDX/CycloneDX), ký bằng cosign, SLSA**.

## Tóm tắt

- CI giữ mainline luôn release được nhờ merge nhỏ và kiểm tra tự động nhanh.
- Mô hình phân nhánh quyết định mức độ tích hợp thực sự diễn ra.
- Pipeline có thứ tự, chạy song song và có hiệu lực chặn.
- GitHub Actions (workflow → job → step) và GitLab CI (stage → job) diễn đạt cùng một ý tưởng.
- Cache, matrix và build theo phần bị ảnh hưởng giữ CI nhanh; OIDC và quyền tối thiểu giữ CI an toàn.
- Đầu ra là một artifact bất biến, có version, đã scan, đã ký, kèm SBOM — sẵn sàng cho quy trình delivery ở bài 14.
