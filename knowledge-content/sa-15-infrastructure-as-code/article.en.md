# Infrastructure as Code – Terraform, Ansible & CloudFormation

## 1. Why Infrastructure as Code

**Infrastructure as Code** (IaC) means describing networks, servers, databases, DNS and permissions in text files kept in Git, and letting a tool create and change real infrastructure from them. The alternative — clicking through a console, "ClickOps" — works for one experiment and fails for everything after.

- **No snowflakes.** Staging and prod come from the same code with different inputs, instead of two hand-built estates nobody can compare.
- **Review and audit.** Every change is a pull request with an author, a reviewer and a diff — and the tool shows *exactly* what will change before anything does.
- **Fast recovery.** Losing an account or region means `apply` plus a data restore, not weeks of rebuilding from memory.
- **Self-service.** A platform team publishes a module; product teams get a compliant VPC or database without a ticket.

IaC does **not** back up data, stop console edits behind its back (drift), or make bad code less bad — it replicates mistakes efficiently too.

---

## 2. Declarative vs imperative, mutable vs immutable

**Declarative** tools take the *desired end state* ("3 instances of t3.medium") and compute the steps. **Imperative** tools take the *steps* ("create an instance"). Run an imperative script twice and you may get 6 instances; apply a declarative config twice and the second run does nothing. That property — re-running converges on the same result — is **idempotency**, and it is what makes IaC safe in a pipeline.

| | Declarative | Imperative |
|---|---|---|
| You write | What should exist | How to get there |
| Re-run | No-op if already correct | Only safe if the script checks everything |
| Ordering | Tool builds a dependency graph | You order the steps |
| Examples | Terraform/OpenTofu, CloudFormation, Kubernetes YAML | Bash + AWS CLI, SDK scripts |

Ansible sits in between (ordered tasks, idempotent modules); CDK and Pulumi use imperative languages to *generate* a declarative model.

**Mutable** infrastructure is patched in place (SSH in, upgrade, edit config) and drifts into unique snowflakes. **Immutable** infrastructure is replaced: build a new image, roll out new instances, destroy the old ones; rollback means redeploying the previous image.

**Push** tools (Terraform, Ansible) act only when run; **reconciling** systems (Kubernetes controllers, Crossplane, Puppet agents) correct deviations continuously.

---

## 3. Terraform core concepts

**Terraform** (HashiCorp) is the most widely used multi-cloud provisioning tool. You write **HCL** in `.tf` files; all `.tf` files in a directory form one **root module**.

- **Provider** — plugin that turns resources into API calls (`aws`, `google`, `kubernetes`, `cloudflare`, `github`…).
- **Resource** — an object Terraform creates and owns (`aws_vpc`, `aws_instance`).
- **Data source** — an object Terraform only *reads* (latest AMI, an existing hosted zone).
- **Reference** — `aws_vpc.main.id` links blocks and adds an edge to the **dependency graph**.

```hcl
terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "app" {
  vpc_id     = aws_vpc.main.id # implicit dependency on the VPC
  cidr_block = "10.0.1.0/24"
}
```

Terraform creates independent nodes **in parallel** (10 by default, `-parallelism=n`) and destroys in reverse order. `depends_on` is only for hidden dependencies it cannot see from references. Never put access keys in a `provider` block — use the normal credential chain: environment, profile, instance/task role, or OIDC credentials in CI.

---

## 4. The Terraform workflow: init, plan, apply

```text
  .tf files (Git)
       |
 terraform init   -> download providers/modules, configure backend,
       |             write .terraform.lock.hcl
 terraform plan   -> refresh real resources via provider APIs,
       |             diff config vs state vs reality, print changes
 terraform apply  -> walk the graph calling cloud APIs,
       |             record results in state
       v
   state file  <------------>  real infrastructure
```

| Command | Notes |
|---|---|
| `terraform init` | Re-run after adding providers, modules or changing backend. Commit `.terraform.lock.hcl`, not `.terraform/`. |
| `terraform fmt` / `validate` | Formatting; syntax and type check without calling cloud APIs. |
| `terraform plan` | `-out=tfplan` saves the plan. `-detailed-exitcode`: 0 = no changes, 1 = error, 2 = changes. |
| `terraform apply tfplan` | Applies exactly the saved plan; refuses if state changed since (stale plan). |
| `terraform destroy` | Deletes everything the configuration manages. |

Reading a plan:

```text
  + create          ~ update in-place        - destroy
-/+ destroy, then create replacement
+/- create replacement, then destroy (create_before_destroy)

-/+ resource "aws_instance" "web" {
      ~ ami = "ami-0aaa..." -> "ami-0bbb..." # forces replacement
    }
Plan: 1 to add, 0 to change, 1 to destroy.
```

Hunt for **"forces replacement"**: some attributes cannot change in place, so Terraform deletes and recreates — on a database, that is data loss. Terraform also has **no automatic rollback**: a failed apply leaves already-created resources in place (and in state); you fix forward.

---

## 5. Variables, outputs, locals and loops

**Variables** are a module's inputs (with `type`, `validation`, `sensitive`), **locals** are named expressions, **outputs** expose values to callers and other stacks.

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "subnets" {
  type    = map(string)
  default = { a = "10.0.1.0/24", b = "10.0.2.0/24" }
}

resource "aws_subnet" "private" {
  for_each   = var.subnets
  vpc_id     = aws_vpc.main.id
  cidr_block = each.value
  tags       = { Name = "private-${each.key}", Env = var.environment }
}

output "private_subnet_ids" {
  value = [for s in aws_subnet.private : s.id]
}
```

Precedence, lowest to highest: `default` → `TF_VAR_name` env vars → `terraform.tfvars` → `*.auto.tfvars` → `-var` / `-var-file`.

**`count` vs `for_each`.** `count` addresses instances by position (`res[0]`, `res[1]`): remove the first item of the list and every later instance shifts index, so Terraform plans to recreate them. `for_each` uses stable keys (`res["a"]`), so removing one key touches only that one. Use `count` for 0-or-1 toggles, `for_each` for collections.

`sensitive = true` only hides a value in CLI output — **it is still plain text in state**.

---

## 6. State: Terraform's memory

The **state** (`terraform.tfstate`, JSON) maps every address in code to a real object — `aws_instance.web` → `i-0abc…` — plus last-known attributes. Without it Terraform could not tell which instance "is" `aws_instance.web` (it would create duplicates), nor know to destroy a resource whose block was deleted from code.

- The default is a **local file** — on a team, two people get two states and fight over the same resources.
- State holds **secrets in plain text** (DB passwords, generated keys). Encrypt it, lock down IAM, enable versioning, never commit it to Git.
- Do not hand-edit it; use `terraform state list/show/mv/rm`, or the declarative `moved`/`import`/`removed` blocks.
- **Blast radius** grows with state size. One state for network, databases and 40 services means slow plans and applies that can touch everything. Split by lifecycle and owner: network, data, per service.

---

## 7. Remote state and locking

A **backend** decides where state lives. A remote backend centralises it and **locks** it so two applies cannot run at once and corrupt it.

```hcl
terraform {
  backend "s3" {
    bucket       = "acme-tfstate-prod"
    key          = "network/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true # native S3 locking, GA in Terraform 1.11
  }
}
```

The classic AWS pattern was a versioned, encrypted S3 bucket plus a **DynamoDB table** for the lock. Terraform 1.10 added (as experimental) and 1.11 made generally available S3 locking with a lock object in the bucket itself, and the DynamoDB option is now deprecated — you will still meet it everywhere. Other backends: HCP Terraform, Azure Blob (lease), GCS, PostgreSQL.

```text
 engineer A: apply --> acquire lock --> OK, applying...
                            |
 CI job B:   apply --> acquire lock --> "Error acquiring the state lock"
                                        (fails or waits; state stays intact)

 s3://acme-tfstate-prod/network/terraform.tfstate
 s3://acme-tfstate-prod/network/terraform.tfstate.tflock  <- only while locked
```

A crashed run can leave a stale lock: `terraform force-unlock LOCK_ID`, only once nobody is running. `terraform_remote_state` shares outputs across stacks but needs read access to the *whole* state; SSM Parameter Store or tag lookups couple more loosely.

---

## 8. Modules: reusable building blocks

A **module** is any directory of `.tf` files, called from a local path, Git URL or registry.

```hcl
module "orders_service" {
  source = "./modules/ecs-service"

  name          = "orders"
  environment   = var.environment
  desired_count = var.environment == "prod" ? 3 : 1
  subnet_ids    = module.network.private_subnet_ids
}
```

- **A module is an API** (`variables.tf` in, `outputs.tf` out). Inputs and outputs are its contract; renaming a variable is a breaking change. Version shared modules and pin them (`?ref=v1.4.0`, `version = "~> 1.4"`).
- **Encode opinions.** A bucket module that encrypts and blocks public access by default makes compliance the easy path.
- **Don't wrap a single resource** one-to-one; keep nesting shallow. Pin providers with `~>` and commit the lock file.

---

## 9. Drift, import and safe refactoring

**Drift** is any difference between reality and code/state — typically a security group "fixed" in the console during an incident. `plan` shows it as a change that would *revert* the manual edit. Either apply (code wins) or update the code to match (reality wins). `apply -refresh-only` updates state without touching infrastructure, but if code still differs the next plan tries to revert again. Detect drift with a scheduled `plan -detailed-exitcode` alerting on exit code 2; prevent it by removing human console write access in prod.

**Adopting existing resources** — the `import` block (1.5+) is reviewable in a PR; `plan -generate-config-out=generated.tf` drafts the resource block:

```hcl
import {
  to = aws_s3_bucket.logs
  id = "acme-logs-prod"
}
```

**Refactoring.** Renaming a resource or moving it into a module changes its address, and Terraform would destroy and recreate it. Declare the move instead:

```hcl
moved {
  from = aws_instance.web
  to   = module.web.aws_instance.this
}
```

And guard resources that must never be casually replaced:

```hcl
resource "aws_db_instance" "main" {
  # ...
  deletion_protection = true

  lifecycle {
    prevent_destroy = true       # any plan destroying this fails
    ignore_changes  = [password] # rotated outside Terraform
  }
}
```

`prevent_destroy` only protects while the block stays in code, so also enable the provider-side `deletion_protection`.

---

## 10. Environments, workspaces and IaC pipelines

| Approach | How | Fits | Watch out |
|---|---|---|---|
| **CLI workspaces** | `terraform workspace new staging` — one state per workspace, same backend | Short-lived copies of identical shape (feature envs) | Same credentials for all; easy to apply to the wrong one |
| **Directory per env** | `envs/prod` root module calling shared modules, own backend key and `.tfvars` | Long-lived envs in separate accounts | A little duplication |
| **Wrappers / platforms** | Terragrunt, HCP Terraform, Spacelift | Many accounts and regions | Another tool |

HashiCorp's docs state that CLI workspaces are not suitable when deployments need separate credentials and access controls. Prod should have its **own account and its own state**.

```text
infra/
  modules/   network/  ecs-service/  rds/
  envs/
    dev/      main.tf backend.tf dev.tfvars    -> account 1111
    staging/  main.tf backend.tf stg.tfvars    -> account 2222
    prod/     main.tf backend.tf prod.tfvars   -> account 3333
```

An IaC pipeline (generic CI/CD mechanics are covered in the CI and CD topics):

1. PR: `fmt -check`, `validate`, `tflint`, policy scan (Checkov, Trivy, OPA), then `plan` posted as a comment — reviewers approve the **plan**, not just the code.
2. Merge: apply the saved plan, with an approval gate for prod; CI assumes a role via short-lived **OIDC** credentials.
3. Scheduled drift detection; `terraform test` (1.6+) for modules.

---

## 11. Ansible for configuration management

Terraform **provisions** (VMs, load balancers, DNS). **Configuration management** sets up what runs *inside* machines: packages, users, files, services. **Ansible** is the most common tool for it.

- **Agentless** — connects over **SSH** (WinRM for Windows) and runs modules with Python on the target; no daemon, unlike Puppet/Chef.
- **Inventory** — hosts and groups; static file or dynamic plugin (`amazon.aws.aws_ec2` queries EC2 by tag).
- **Playbook** — YAML **plays** (which hosts) with ordered **tasks** (which modules); **roles** package them for reuse.
- **Idempotent modules** report `ok` or `changed`; raw `shell`/`command` tasks are not idempotent unless guarded (`creates:`). **Handlers** run only when a changed task notifies them.

```yaml
- name: Configure web servers
  hosts: web
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Deploy site config
      ansible.builtin.template:
        src: templates/site.conf.j2
        dest: /etc/nginx/conf.d/site.conf
        mode: "0644"
      notify: Reload nginx

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

```bash
ansible-playbook -i inventory/prod.aws_ec2.yml site.yml --check --diff  # dry run
```

```text
 Packer + Ansible --> golden AMI --> Terraform (launch template, ASG) --> instances
 (config baked at     (immutable)    (provision)                          (no SSH edits)
  build time)
```

Baking images keeps compute immutable; patching long-lived servers (VM databases, legacy fleets) is still a valid use.

---

## 12. Terraform vs CloudFormation vs CDK vs Pulumi

| | Terraform / OpenTofu | CloudFormation | AWS CDK | Pulumi |
|---|---|---|---|---|
| Language | HCL | YAML/JSON | TS, Python, Java, C#, Go | TS, Python, Go, C#, Java |
| Scope | Any cloud + SaaS | AWS | AWS (synthesises CloudFormation) | Any cloud |
| State | You run the backend | Managed by AWS | Managed by CloudFormation | Pulumi Cloud or own backend |
| Preview | `plan` | Change sets | `cdk diff` | `pulumi preview` |
| Failed update | Fix forward | Automatic rollback | Automatic rollback | Fix forward |

**CloudFormation** deploys templates as **stacks**; AWS owns the state, so there is no bucket to secure or lock. It has change sets, drift detection, `DeletionPolicy: Retain`, StackSets for multi-account rollout, and a limit of 500 resources per stack. **CDK** writes the same thing in a real language with loops, types and unit tests, built from constructs (L1 raw resources, L2 sensible defaults, L3 patterns); `cdk synth` emits CloudFormation, `cdk deploy` deploys it after a one-time `cdk bootstrap`.

**Licensing.** In August 2023 HashiCorp moved new Terraform releases from the open-source MPL 2.0 to the Business Source License (BSL 1.1). The community forked the last MPL version as **OpenTofu**, now under the Linux Foundation and largely drop-in compatible (`tofu plan`). The BSL mainly restricts offering competing products; normal internal use is unaffected. IBM completed its acquisition of HashiCorp in 2025.

Choosing:

- Multi-cloud or SaaS providers (Cloudflare, Datadog, GitHub) → **Terraform/OpenTofu**.
- AWS-only, want managed state and rollback → **CloudFormation**, or **CDK** for developer-heavy teams.
- General-purpose languages across clouds → **Pulumi**.
- Inside the machine → **Ansible**, ideally at image-build time.

Mixing tools is normal; the rule is **one owner per resource** — never two tools managing the same object.

---

## Key interview points

- IaC = infrastructure in version-controlled code: **reproducible, reviewable, auditable, fast to recover**. It does not back up data.
- **Declarative + idempotent** makes re-running safe. Terraform/CloudFormation are declarative; Ansible is ordered with idempotent modules.
- `init` → `plan` → `apply`; review the plan for **"forces replacement"**; apply the saved plan in CI. No automatic rollback.
- **State** maps code to real IDs, stores **secrets in plain text**, and must be remote, encrypted and **locked**; split it to limit blast radius.
- `for_each` over `count` for collections; `moved`, `import`, `prevent_destroy` for safe change.
- **Drift** is detected by `plan`, not prevented; schedule it and restrict console access.
- Workspaces are not strong isolation — prod gets its own account and state.
- Terraform provisions, Ansible configures (agentless, SSH); bake images for immutability.
- CloudFormation: AWS-managed state, rollback, AWS-only; CDK compiles to it. Terraform BSL (2023) → **OpenTofu** fork.

## Summary

- Infrastructure in Git is reviewable and recoverable; declarative, immutable approaches avoid snowflakes.
- Terraform turns HCL into a dependency graph, calls APIs through providers, previews with `plan` and records reality in state.
- Remote, encrypted, locked and well-split state is the heart of team Terraform.
- Modules are versioned APIs; `moved`, `import` and lifecycle rules keep refactors safe.
- Isolate environments by account and state; pipelines post plans on PRs and apply on merge.
- Ansible configures machines; CloudFormation/CDK trade portability for managed state and rollback.
