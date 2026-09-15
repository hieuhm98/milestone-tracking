# Security for Architects

## 1. Security is an architecture property

Security is a **quality attribute**, like availability: the shape of the system decides how much damage one bug, one leaked key or one compromised host can do. The architect's job is to design a system where mistakes are **contained, detected and recoverable**.

| Goal (CIA triad) | Question | Typical controls |
|---|---|---|
| **Confidentiality** | Can only the right people read it? | Access control, encryption, segmentation |
| **Integrity** | Can we trust it was not altered? | Signing, checksums, audit logs |
| **Availability** | Is it there when needed? | Redundancy, rate limiting, DDoS protection, backups |

- **Assume breach.** Design as if one component is already compromised and ask "what can the attacker reach from here?" That is your **blast radius**.
- **Shared responsibility.** The cloud provider secures facilities, hardware and hypervisor; you still own identities, data, network rules and code.
- **Proportionality.** Security trades against cost and speed; the right answer is controls proportional to the data's value and the likely threats, recorded as a decision.

---

## 2. Defence in depth

**Defence in depth** layers independent controls so no single failure exposes the asset.

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

The key word is **independent**. WAF + input validation + parameterised queries is defence in depth against SQL injection; three firewall rules in one config file owned by one person is one layer written three times. Prevention eventually fails, so the detection layer — tamper-resistant central logs, alerts, a rehearsed runbook — decides how quickly you notice.

---

## 3. Zero trust

The old **castle-and-moat** model trusted anything inside the network or VPN. One compromised laptop then allows free **lateral movement**.

**Zero trust** (NIST SP 800-207) replaces network location with explicit verification: **never trust, always verify** every request, least privilege per request, assume breach, and decide using context (identity, device posture, risk).

```text
 Castle & moat                         Zero trust
 ------------------------------        ------------------------------------
 VPN login = trusted everywhere        Every call: who? which device? allowed?
 flat internal network                 microsegments, deny by default
 plain HTTP between services           mTLS with workload identity
 IP allow-lists as identity            identity-aware proxy / policy engine
```

Zero trust is a direction, not a product: an identity-aware proxy instead of a VPN, service-to-service mTLS, short-lived credentials, policy checks close to the resource.

---

## 4. Identity and least privilege

- **Authentication (authN)** — who are you? (MFA, SSO via an identity provider, certificates, workload tokens)
- **Authorisation (authZ)** — what may you do? (roles, policies, attributes)

OAuth 2.0, OIDC and JWT pitfalls are covered in the API design topic.

| Model | Decision based on | Good for | Weak spot |
|---|---|---|---|
| **RBAC** | Role membership | Most business apps | Role explosion |
| **ABAC** | Attributes (tenant, data classification) | Fine-grained, multi-tenant | Harder to audit |
| **ReBAC** | Relationships (user *owns* doc) | Sharing models | Needs a relationship store |

**Least privilege** in practice:

- Humans use **SSO with MFA**; no shared accounts or long-lived personal keys.
- **Workloads get identities** (an IAM role for a pod, a SPIFFE ID) that yield **short-lived credentials** — never a static key in config.
- **Just-in-time** elevated access with approval and expiry instead of permanent admin.
- Enforce authZ **on the server, per object** — checking "logged in" but not "owns order 42" is the classic broken-access-control bug.

On AWS: IAM Identity Center for humans, IAM roles for workloads, SCPs as guardrails.

---

## 5. Secrets management

A **secret** is anything that grants access: DB passwords, API keys, private and signing keys.

- **Never in source code, images or Git** — Git history is forever.
- **Central store** with access control and an audit trail of every read.
- **Short-lived and rotated**, injected at runtime using the workload's identity.

**HashiCorp Vault** (default port `8200`) goes further with **dynamic secrets**: it creates a unique DB user on demand with a lease and revokes it when the lease expires.

```bash
# Static secret in the KV v2 engine
vault kv put secret/payments/api stripe_key="sk_live_example"

# Dynamic secret: a fresh DB user with a TTL, revoked automatically
vault read database/creds/payments-readonly
```

| Option | Strength | Note |
|---|---|---|
| Vault | Dynamic secrets, PKI, multi-cloud | Needs operating |
| AWS Secrets Manager | Managed rotation (e.g. RDS) | AWS-native |
| Kubernetes Secret | Native to pods | Only base64 by default — enable etcd encryption or sync from a store |

**Rotation** must be designed: the app must accept old and new credentials during switch-over or re-read the secret without restart, and a leaked key should be revocable in minutes via a runbook.

---

## 6. Encryption at rest and in transit

**In transit:** TLS everywhere — **1.2 minimum, 1.3 preferred** — including internal hops; HSTS on public sites; automated certificate renewal (expired certificates are a classic self-inflicted outage).

**At rest:** disks, object storage, databases, backups, using authenticated encryption such as **AES-256-GCM**. The hard part is **key management**. A **KMS** (often HSM-backed) holds master keys that never leave it. KMS calls are networked and size-limited (AWS KMS encrypts at most 4 KB directly), so bulk data uses **envelope encryption**:

```text
 Encrypt                                       Decrypt
 -------                                       -------
 1. app -> KMS: GenerateDataKey(master key)    1. read encrypted DEK from storage
 2. KMS -> app: plaintext DEK + encrypted DEK  2. app -> KMS: Decrypt(encrypted DEK)
 3. app encrypts data locally with DEK         3. KMS checks policy, returns DEK
 4. store ciphertext + encrypted DEK           4. app decrypts data locally
 5. wipe plaintext DEK from memory
```

Benefits: bulk data never travels to the KMS, each object can have its own data key, every master-key use is an audited policy decision, and **rotating the master key does not require re-encrypting all data**. Deleting a key makes data unrecoverable (crypto-shredding).

Encryption at rest protects against stolen disks and backups — **not** against an attacker using the application's own credentials.

---

## 7. mTLS and service identity

Normal TLS authenticates only the server. **Mutual TLS (mTLS)** makes the client present a certificate too.

```text
 Service A (client)                         Service B (server)
   | ClientHello ----------------------------->  |
   | <---- ServerHello + server cert             |
   |       + CertificateRequest                  |
   | client cert + CertificateVerify ---------->  |
   |   both verify the chain against the internal CA
   | <========= encrypted application data =====> |
```

Issuing and rotating certificates for hundreds of services by hand is impractical, so teams use a **service mesh** (Istio, Linkerd), whose proxies do mTLS and rotation transparently, or **SPIFFE/SPIRE** workload identities (`spiffe://prod.example.com/ns/payments/sa/api`) in short-lived X.509 certificates.

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

mTLS answers "which service is calling?"; you still need **authorisation policies** ("only `checkout` may call `payments`").

---

## 8. OWASP Top 10 through an architect's eyes

The **OWASP Top 10** (2021 edition) lists the most critical web risk categories. An architect looks for **design decisions that remove a whole class**.

| # | Category | Architectural answer |
|---|---|---|
| A01 | Broken Access Control | Deny by default; per-object checks |
| A02 | Cryptographic Failures | TLS everywhere, KMS, no home-made crypto |
| A03 | Injection | Parameterised queries, output encoding, CSP |
| A04 | Insecure Design | Threat modelling, secure defaults |
| A05 | Security Misconfiguration | IaC with policy checks, no default creds |
| A06 | Vulnerable & Outdated Components | SBOM, dependency scanning |
| A07 | Identification & Authentication Failures | Managed IdP, MFA, rate-limited login |
| A08 | Software & Data Integrity Failures | Signed artifacts, protected CI/CD |
| A09 | Security Logging & Monitoring Failures | Central audit logs, alerting |
| A10 | Server-Side Request Forgery (SSRF) | Egress allow-lists, protect metadata endpoint |

The 2025 edition keeps Broken Access Control first and gives software supply-chain failures their own category.

**SSRF** is architectural: a service that fetches user-supplied URLs can be tricked into calling internal endpoints such as the cloud metadata service at `169.254.169.254`. Fix it in the network too — egress filtering, an isolated fetcher service, IMDSv2 on AWS.

---

## 9. Network segmentation and WAF

**Segmentation** limits lateral movement:

- **Accounts** — prod, staging and security tooling in separate cloud accounts.
- **Subnets** — public (load balancers only), private (apps), isolated (databases, no internet route).
- **Security groups** that reference other groups: "DB accepts 5432 from the app group".
- **Microsegmentation** — per-workload rules such as Kubernetes NetworkPolicy.
- **Private endpoints** to managed services; no SSH port 22 open to the world.

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

NetworkPolicy only works if the CNI plugin enforces it (Calico, Cilium do).

A **WAF** inspects HTTP at layer 7 — managed rules for common attacks, bot control, rate-based rules — at the CDN, load balancer or gateway. It is **a layer, not a fix**: great for virtual patching a fresh CVE, bypassable by a determined attacker. Roll out new rules in **count mode** first, then block.

---

## 10. Container and supply-chain security

Breaches increasingly come through **what you build with**: a compromised dependency, a poisoned build, a tampered image.

```text
 source -> dependencies -> CI build -> image -> registry -> deploy -> runtime
   |          |              |          |         |          |         |
 branch    pinned,        isolated   scanned,  pull by    admission  non-root,
 protect.  lockfiles,     runners,   SBOM,     digest     policy     read-only FS,
 reviews   scanned        OIDC creds signed               verifies   runtime detect.
```

- **SBOM** (SPDX or CycloneDX) answers "are we affected?" within hours of a new CVE.
- **Scan** in CI and fail on critical findings; **sign** images (Sigstore cosign) and deploy by **digest**.
- **Admission control** (Pod Security Admission `restricted`, Kyverno, OPA Gatekeeper) rejects privileged, root or unsigned pods.
- **CI identity** via OIDC federation and short-lived tokens — the pipeline has production power.

```bash
syft registry.example.com/payments-api:1.4.2 -o spdx-json > sbom.json
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.example.com/payments-api:1.4.2
cosign verify --key cosign.pub registry.example.com/payments-api@sha256:<digest>
```

---

## 11. Threat modelling with STRIDE

**Threat modelling** asks, at design time: *What are we building? What can go wrong? What will we do about it? Did we do a good job?* Draw a **data flow diagram**, mark **trust boundaries**, walk each element through STRIDE, and record mitigations as tickets or ADRs.

```text
  [ Mobile app ] --HTTPS--> || API gateway || --> ( Order service ) --> [= Orders DB =]
   external entity          ^ trust boundary          process              data store
```

| Threat | Violates | Example | Mitigation |
|---|---|---|---|
| **S**poofing | Authentication | Forged token | Strong authN, mTLS, MFA |
| **T**ampering | Integrity | Price edited in request | Server-side validation, signing |
| **R**epudiation | Non-repudiation | "I never placed that order" | Tamper-evident audit logs |
| **I**nformation disclosure | Confidentiality | Stack trace leaks internals | Encryption, error hygiene |
| **D**enial of service | Availability | Login endpoint flooded | Rate limiting, WAF |
| **E**levation of privilege | Authorisation | User calls admin API | Deny-by-default authZ |

Threats cluster at trust boundaries, so review those flows first.

---

## 12. Compliance basics

| Framework | Scope | Pushes into the design |
|---|---|---|
| **GDPR** (EU) | Personal data of people in the EU | Minimisation, erasure, 72-hour breach notification, residency |
| **PCI DSS** | Card data | Small cardholder data environment, segmentation, 1 year of audit logs |
| **HIPAA** (US) | Health information | Encryption, access audit |
| **SOC 2** | Service organisation controls | Evidence of access reviews, change management |
| **ISO/IEC 27001** | Security management system | Risk assessment, documented controls |

In Vietnam, personal data is governed by Decree 13/2023/ND-CP and the newer Personal Data Protection Law.

Patterns that make audits cheap: **scope reduction** (tokenise cards via the payment provider so you never store a PAN), **data classification** driving encryption and retention, **immutable audit logs** in a separate account, **policy as code** so evidence is Git history, and deliberate **data residency**. Compliance is a floor: certified does not mean secure.

---

## Key interview points

- Security is a **quality attribute**: assume breach, minimise **blast radius**, name the trade-offs.
- **Defence in depth** = independent layers plus detection.
- **Zero trust**: no trust from network location; verify every request; mTLS inside.
- AuthN ≠ authZ; enforce **per-object authorisation server-side**; workloads get **short-lived credentials**.
- Secrets in a **central store**, injected at runtime, rotated, ideally **dynamic**.
- **Envelope encryption**: KMS master key wraps data keys; master-key rotation needs no bulk re-encryption.
- mTLS proves **both** sides; still add authorisation policy.
- **Broken access control** tops OWASP; **SSRF** and supply chain have architectural fixes.
- Segment by account, subnet, security group, NetworkPolicy; a **WAF is a layer, not a fix**.
- Supply chain: **SBOM, scan, sign, verify at admission, deploy by digest**.
- Threat model with **DFD + trust boundaries + STRIDE**; compliance: **reduce scope**.

## Summary

- Architects decide how far one failure spreads; CIA and shared responsibility frame decisions.
- Layered, independent controls and zero trust replace the single perimeter.
- Identity, least privilege, managed secrets and short-lived credentials close the common breach paths.
- KMS with envelope encryption and mTLS protect data at rest and in transit.
- OWASP, segmentation, WAF and supply-chain controls map risks to design choices.
- STRIDE and compliance turn security into reviewable architecture decisions.
