# Bảo mật cho kiến trúc sư

## 1. Bảo mật là thuộc tính của kiến trúc

Bảo mật (security) là một **thuộc tính chất lượng** (quality attribute), giống như tính sẵn sàng: hình dạng của hệ thống quyết định một bug, một key bị lộ hay một host bị chiếm quyền gây thiệt hại tới đâu. Việc của kiến trúc sư là thiết kế hệ thống sao cho sai sót được **khoanh vùng, phát hiện và khôi phục được**.

| Mục tiêu (bộ ba CIA) | Câu hỏi | Biện pháp điển hình |
|---|---|---|
| **Bí mật** (Confidentiality) | Chỉ đúng người mới đọc được? | Kiểm soát truy cập, mã hoá, phân vùng mạng |
| **Toàn vẹn** (Integrity) | Có chắc dữ liệu không bị sửa? | Chữ ký số, checksum, audit log |
| **Sẵn sàng** (Availability) | Có dùng được khi cần? | Dự phòng, rate limiting, chống DDoS, backup |

- **Giả định đã bị xâm nhập** (assume breach). Thiết kế như thể một thành phần đã bị chiếm, rồi hỏi "từ đây kẻ tấn công với tới được gì?" Câu trả lời chính là **bán kính ảnh hưởng** (blast radius).
- **Trách nhiệm chia sẻ** (shared responsibility). Nhà cung cấp cloud bảo vệ trung tâm dữ liệu, phần cứng, hypervisor; bạn vẫn sở hữu danh tính, dữ liệu, luật mạng và code.
- **Tương xứng.** Bảo mật đánh đổi với chi phí và tốc độ; câu trả lời đúng là biện pháp tương xứng với giá trị dữ liệu và mối đe doạ thực tế, được ghi lại thành một quyết định.

---

## 2. Phòng thủ nhiều lớp

**Phòng thủ nhiều lớp** (defence in depth) xếp chồng các biện pháp độc lập để không một lỗi đơn lẻ nào làm lộ tài sản.

```text
  Internet
     |
 [ DDoS protection / CDN edge ]        layer 1: edge
 [ WAF + TLS termination ]             layer 2: perimeter
 [ Public subnet: load balancer ]      layer 3: network
     |   security group: 443 from LB only
 [ Private subnet: app services ]      layer 4: workload (non-root, patched)
     |   authN + authZ on every request  layer 5: application
     |   security group: 5432 from app only
 [ Isolated subnet: database ]         layer 6: data (encrypted, least-privilege user)
 [ Audit logs -> separate account ]    layer 7: detection & response
```

Từ khoá là **độc lập**. WAF + kiểm tra input + parameterised query là phòng thủ nhiều lớp chống SQL injection; ba luật firewall trong cùng một file config do cùng một người quản lý chỉ là một lớp viết ba lần. Phòng ngừa rồi sẽ có lúc thất bại, nên lớp phát hiện — log tập trung khó bị xoá sửa, cảnh báo, runbook đã diễn tập — quyết định bạn nhận ra sự cố nhanh tới đâu.

---

## 3. Zero trust

Mô hình cũ **lâu đài và hào nước** (castle and moat) tin mọi thứ bên trong mạng nội bộ hoặc VPN. Chỉ cần một laptop bị chiếm là kẻ tấn công **di chuyển ngang** (lateral movement) thoải mái.

**Zero trust** (NIST SP 800-207) thay vị trí mạng bằng xác minh tường minh: **không bao giờ tin, luôn xác minh** mọi request, quyền tối thiểu theo từng request, giả định đã bị xâm nhập, và quyết định dựa trên ngữ cảnh (danh tính, tình trạng thiết bị, mức rủi ro).

```text
 Castle & moat                         Zero trust
 ------------------------------        ------------------------------------
 VPN login = trusted everywhere        Every call: who? which device? allowed?
 flat internal network                 microsegments, deny by default
 plain HTTP between services           mTLS with workload identity
 IP allow-lists as identity            identity-aware proxy / policy engine
```

Zero trust là một hướng đi, không phải một sản phẩm: identity-aware proxy thay cho VPN, mTLS giữa các service, credential ngắn hạn, kiểm tra policy ngay sát tài nguyên.

---

## 4. Danh tính và quyền tối thiểu

- **Xác thực** (authentication – authN) — bạn là ai? (MFA, SSO qua identity provider, certificate, token của workload)
- **Phân quyền** (authorization – authZ) — bạn được làm gì? (role, policy, thuộc tính)

OAuth 2.0, OIDC và các bẫy của JWT nằm ở bài thiết kế API.

| Mô hình | Quyết định dựa trên | Hợp với | Điểm yếu |
|---|---|---|---|
| **RBAC** | Thuộc role nào | Đa số ứng dụng nghiệp vụ | Bùng nổ số role |
| **ABAC** | Thuộc tính (tenant, mức phân loại dữ liệu) | Phân quyền chi tiết, multi-tenant | Khó audit |
| **ReBAC** | Quan hệ (user *sở hữu* tài liệu) | Mô hình chia sẻ | Cần kho lưu quan hệ |

**Quyền tối thiểu** (least privilege) trong thực tế:

- Con người đăng nhập bằng **SSO + MFA**; không tài khoản dùng chung, không key cá nhân dài hạn.
- **Workload có danh tính riêng** (IAM role cho pod, SPIFFE ID) để nhận **credential ngắn hạn** — không bao giờ nhét key tĩnh vào config.
- Quyền cao cấp cấp theo kiểu **just-in-time**, có phê duyệt và hết hạn, thay vì admin vĩnh viễn.
- Kiểm tra authZ **ở server, theo từng object** — chỉ kiểm "đã đăng nhập" mà không kiểm "có sở hữu order 42" là lỗi broken access control kinh điển.

Trên AWS: IAM Identity Center cho người, IAM role cho workload, SCP làm hàng rào chung.

---

## 5. Quản lý secret

**Secret** là mọi thứ cấp quyền truy cập: mật khẩu DB, API key, private key, signing key.

- **Không bao giờ nằm trong source code, image hay Git** — lịch sử Git là vĩnh viễn.
- **Kho tập trung** có kiểm soát truy cập và audit trail cho từng lần đọc.
- **Ngắn hạn và được xoay vòng** (rotation), inject lúc runtime bằng danh tính của workload.

**HashiCorp Vault** (port mặc định `8200`) còn tiến xa hơn với **dynamic secret**: tạo một DB user riêng theo yêu cầu kèm lease, rồi thu hồi khi lease hết hạn.

```bash
# Static secret in the KV v2 engine
vault kv put secret/payments/api stripe_key="sk_live_example"

# Dynamic secret: a fresh DB user with a TTL, revoked automatically
vault read database/creds/payments-readonly
```

| Lựa chọn | Thế mạnh | Lưu ý |
|---|---|---|
| Vault | Dynamic secret, PKI, đa cloud | Phải tự vận hành |
| AWS Secrets Manager | Rotation được quản lý (vd. RDS) | Gắn với AWS |
| Kubernetes Secret | Dùng trực tiếp trong pod | Mặc định chỉ là base64 — bật mã hoá etcd hoặc đồng bộ từ kho ngoài |

**Rotation** phải được thiết kế: ứng dụng cần chấp nhận cả credential cũ lẫn mới trong lúc chuyển giao, hoặc đọc lại secret mà không cần restart; một key bị lộ phải thu hồi được trong vài phút theo runbook.

---

## 6. Mã hoá khi lưu trữ và khi truyền

**Khi truyền** (in transit): TLS ở mọi nơi — **tối thiểu 1.2, ưu tiên 1.3** — kể cả các chặng nội bộ; HSTS cho site public; tự động gia hạn certificate (certificate hết hạn là kiểu sự cố tự gây ra kinh điển).

**Khi lưu trữ** (at rest): ổ đĩa, object storage, database, backup, dùng mã hoá có xác thực như **AES-256-GCM**. Phần khó là **quản lý khoá**. **KMS** (thường có HSM phía sau) giữ master key không bao giờ rời khỏi nó. Gọi KMS phải qua mạng và bị giới hạn kích thước (AWS KMS mã hoá trực tiếp tối đa 4 KB), nên dữ liệu lớn dùng **mã hoá phong bì** (envelope encryption):

```text
 Encrypt                                       Decrypt
 -------                                       -------
 1. app -> KMS: GenerateDataKey(master key)    1. read encrypted DEK from storage
 2. KMS -> app: plaintext DEK + encrypted DEK  2. app -> KMS: Decrypt(encrypted DEK)
 3. app encrypts data locally with DEK         3. KMS checks policy, returns DEK
 4. store ciphertext + encrypted DEK           4. app decrypts data locally
 5. wipe plaintext DEK from memory
```

Lợi ích: dữ liệu lớn không bao giờ đi tới KMS, mỗi object có data key riêng, mỗi lần dùng master key là một quyết định policy được audit, và **xoay vòng master key không cần mã hoá lại toàn bộ dữ liệu**. Xoá key là dữ liệu không thể khôi phục (crypto-shredding).

Mã hoá at rest bảo vệ khỏi ổ đĩa hay backup bị đánh cắp — **không** bảo vệ khỏi kẻ tấn công dùng chính credential của ứng dụng.

---

## 7. mTLS và danh tính service

TLS thông thường chỉ xác thực server. **TLS hai chiều** (mutual TLS – mTLS) bắt client cũng phải trình certificate.

```text
 Service A (client)                         Service B (server)
   | ClientHello ----------------------------->  |
   | <---- ServerHello + server cert             |
   |       + CertificateRequest                  |
   | client cert + CertificateVerify ---------->  |
   |   both verify the chain against the internal CA
   | <========= encrypted application data =====> |
```

Cấp và xoay vòng certificate thủ công cho hàng trăm service là không khả thi, nên các team dùng **service mesh** (Istio, Linkerd) — proxy làm mTLS và rotation trong suốt với ứng dụng — hoặc danh tính workload **SPIFFE/SPIRE** (`spiffe://prod.example.com/ns/payments/sa/api`) nằm trong certificate X.509 ngắn hạn.

```yaml
# Istio: require mTLS for every workload in the namespace
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: payments
spec:
  mtls:
    mode: STRICT
```

mTLS trả lời "service nào đang gọi?"; bạn vẫn cần **authorization policy** ("chỉ `checkout` được gọi `payments`").

---

## 8. OWASP Top 10 dưới góc nhìn kiến trúc sư

**OWASP Top 10** (bản 2021) liệt kê các nhóm rủi ro web nghiêm trọng nhất. Kiến trúc sư tìm **quyết định thiết kế loại bỏ được cả một nhóm lỗi**.

| # | Nhóm | Lời giải kiến trúc |
|---|---|---|
| A01 | Broken Access Control | Mặc định từ chối; kiểm tra theo từng object |
| A02 | Cryptographic Failures | TLS mọi nơi, KMS, không tự chế thuật toán mã hoá |
| A03 | Injection | Parameterised query, output encoding, CSP |
| A04 | Insecure Design | Threat modelling, mặc định an toàn |
| A05 | Security Misconfiguration | IaC có policy check, không credential mặc định |
| A06 | Vulnerable & Outdated Components | SBOM, quét dependency |
| A07 | Identification & Authentication Failures | IdP được quản lý, MFA, giới hạn đăng nhập |
| A08 | Software & Data Integrity Failures | Artifact có chữ ký, bảo vệ CI/CD |
| A09 | Security Logging & Monitoring Failures | Audit log tập trung, cảnh báo |
| A10 | Server-Side Request Forgery (SSRF) | Allow-list đường ra, bảo vệ metadata endpoint |

Bản 2025 vẫn giữ Broken Access Control ở vị trí số một và tách lỗi chuỗi cung ứng phần mềm thành nhóm riêng.

**SSRF** mang tính kiến trúc: service nào tải URL do người dùng cung cấp đều có thể bị lừa gọi endpoint nội bộ như metadata service của cloud ở `169.254.169.254`. Hãy chặn cả ở tầng mạng — lọc egress, service tải URL riêng trong subnet cô lập, IMDSv2 trên AWS.

---

## 9. Phân vùng mạng và WAF

**Phân vùng mạng** (network segmentation) hạn chế di chuyển ngang:

- **Account** — prod, staging và công cụ bảo mật ở các cloud account riêng.
- **Subnet** — public (chỉ load balancer), private (ứng dụng), isolated (database, không có route ra internet).
- **Security group** tham chiếu group khác: "DB nhận 5432 từ group của app".
- **Microsegmentation** — luật theo từng workload như Kubernetes NetworkPolicy.
- **Private endpoint** tới dịch vụ managed; không mở SSH port 22 ra toàn thế giới.

```yaml
# Selecting the pods isolates them: only the gateway namespace may reach port 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payments-allow-gateway
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payments-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: gateway
      ports:
        - protocol: TCP
          port: 8080
```

NetworkPolicy chỉ có tác dụng nếu CNI plugin thực thi nó (Calico, Cilium có hỗ trợ).

**WAF** (web application firewall) soi HTTP ở tầng 7 — bộ luật managed cho các tấn công phổ biến, chặn bot, luật theo rate — đặt ở CDN, load balancer hoặc gateway. Nó là **một lớp, không phải bản vá**: rất tốt để "vá ảo" (virtual patching) một CVE mới công bố, nhưng kẻ tấn công quyết tâm vẫn vượt được. Triển khai luật mới ở **chế độ count** trước, rồi mới chuyển sang block.

---

## 10. Bảo mật container và chuỗi cung ứng

Sự cố ngày càng đến từ **thứ bạn dùng để build**: dependency bị chiếm, bước build bị đầu độc, image bị sửa.

```text
 source -> dependencies -> CI build -> image -> registry -> deploy -> runtime
   |          |              |          |         |          |         |
 branch    pinned,        isolated   scanned,  pull by    admission  non-root,
 protect.  lockfiles,     runners,   SBOM,     digest     policy     read-only FS,
 reviews   scanned        OIDC creds signed               verifies   runtime detect.
```

- **SBOM** (software bill of materials – SPDX hoặc CycloneDX) trả lời "mình có bị ảnh hưởng không?" trong vài giờ sau khi có CVE mới.
- **Quét** trong CI và fail build khi có lỗi critical; **ký** image (Sigstore cosign) và deploy theo **digest**.
- **Admission control** (Pod Security Admission `restricted`, Kyverno, OPA Gatekeeper) từ chối pod privileged, chạy root hoặc chưa ký.
- **Danh tính của CI** qua OIDC federation và token ngắn hạn — pipeline nắm quyền lực của production.

```bash
syft registry.example.com/payments-api:1.4.2 -o spdx-json > sbom.json
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.example.com/payments-api:1.4.2
cosign verify --key cosign.pub registry.example.com/payments-api@sha256:<digest>
```

---

## 11. Mô hình hoá mối đe doạ với STRIDE

**Mô hình hoá mối đe doạ** (threat modelling) đặt câu hỏi ngay lúc thiết kế: *Ta đang xây gì? Điều gì có thể hỏng? Ta sẽ làm gì với nó? Ta đã làm đủ tốt chưa?* Vẽ **sơ đồ luồng dữ liệu** (data flow diagram – DFD), đánh dấu **ranh giới tin cậy** (trust boundary), cho từng phần tử đi qua STRIDE, và ghi biện pháp thành ticket hoặc ADR.

```text
  [ Mobile app ] --HTTPS--> || API gateway || --> ( Order service ) --> [= Orders DB =]
   external entity          ^ trust boundary          process              data store
```

| Mối đe doạ | Vi phạm | Ví dụ | Biện pháp |
|---|---|---|---|
| **S**poofing (giả mạo) | Xác thực | Token giả | AuthN mạnh, mTLS, MFA |
| **T**ampering (sửa đổi) | Toàn vẹn | Sửa giá trong request | Kiểm tra ở server, chữ ký |
| **R**epudiation (chối bỏ) | Chống chối bỏ | "Tôi chưa từng đặt đơn đó" | Audit log chống sửa |
| **I**nformation disclosure (lộ thông tin) | Bí mật | Stack trace lộ chi tiết nội bộ | Mã hoá, xử lý lỗi gọn |
| **D**enial of service (từ chối dịch vụ) | Sẵn sàng | Endpoint login bị dội | Rate limiting, WAF |
| **E**levation of privilege (leo quyền) | Phân quyền | User gọi API admin | AuthZ mặc định từ chối |

Mối đe doạ tập trung ở ranh giới tin cậy, nên hãy review các luồng đó trước.

---

## 12. Tuân thủ cơ bản

| Khung | Phạm vi | Đưa gì vào thiết kế |
|---|---|---|
| **GDPR** (EU) | Dữ liệu cá nhân của người ở EU | Tối thiểu hoá, quyền xoá, báo cáo vi phạm trong 72 giờ, nơi lưu dữ liệu |
| **PCI DSS** | Dữ liệu thẻ thanh toán | Thu nhỏ vùng dữ liệu thẻ, phân vùng mạng, audit log 1 năm |
| **HIPAA** (Mỹ) | Thông tin y tế | Mã hoá, audit truy cập |
| **SOC 2** | Kiểm soát của tổ chức dịch vụ | Bằng chứng review quyền, quản lý thay đổi |
| **ISO/IEC 27001** | Hệ thống quản lý an toàn thông tin | Đánh giá rủi ro, kiểm soát được tài liệu hoá |

Ở Việt Nam, dữ liệu cá nhân chịu điều chỉnh của Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân mới hơn.

Các pattern giúp audit rẻ: **thu hẹp phạm vi** (tokenise thẻ qua nhà cung cấp thanh toán để bạn không bao giờ lưu số thẻ PAN), **phân loại dữ liệu** quyết định mã hoá và thời gian lưu, **audit log bất biến** ở account riêng, **policy as code** để bằng chứng chính là lịch sử Git, và chọn **nơi lưu dữ liệu** (data residency) có chủ đích. Tuân thủ là mức sàn: có chứng nhận không có nghĩa là an toàn.

---

## Điểm cần nhớ khi phỏng vấn

- Bảo mật là **thuộc tính chất lượng**: giả định đã bị xâm nhập, thu nhỏ **blast radius**, nói rõ đánh đổi.
- **Phòng thủ nhiều lớp** = các lớp độc lập cộng với khả năng phát hiện.
- **Zero trust**: không tin vì vị trí mạng; xác minh mọi request; mTLS bên trong.
- AuthN ≠ authZ; kiểm tra **quyền theo từng object ở server**; workload dùng **credential ngắn hạn**.
- Secret ở **kho tập trung**, inject lúc runtime, xoay vòng, lý tưởng là **dynamic**.
- **Envelope encryption**: master key trong KMS bọc data key; xoay vòng master key không cần mã hoá lại hàng loạt.
- mTLS xác thực **cả hai phía**; vẫn cần authorization policy.
- **Broken access control** đứng đầu OWASP; **SSRF** và chuỗi cung ứng có lời giải kiến trúc.
- Phân vùng theo account, subnet, security group, NetworkPolicy; **WAF là một lớp, không phải bản vá**.
- Chuỗi cung ứng: **SBOM, quét, ký, xác minh ở admission, deploy theo digest**.
- Threat model bằng **DFD + trust boundary + STRIDE**; tuân thủ: **thu hẹp phạm vi**.

## Tóm tắt

- Kiến trúc sư quyết định một sự cố lan xa tới đâu; CIA và trách nhiệm chia sẻ là khung cho mọi quyết định.
- Các lớp kiểm soát độc lập và zero trust thay cho một vành đai duy nhất.
- Danh tính, quyền tối thiểu, secret được quản lý và credential ngắn hạn chặn các đường xâm nhập phổ biến.
- KMS với envelope encryption và mTLS bảo vệ dữ liệu khi lưu và khi truyền.
- OWASP, phân vùng mạng, WAF và kiểm soát chuỗi cung ứng biến rủi ro thành lựa chọn thiết kế.
- STRIDE và yêu cầu tuân thủ biến bảo mật thành các quyết định kiến trúc review được.
