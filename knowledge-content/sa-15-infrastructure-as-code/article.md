# Infrastructure as Code – Terraform, Ansible & CloudFormation

## 1. Vì sao cần Infrastructure as Code

**Hạ tầng dưới dạng mã** (Infrastructure as Code – IaC) nghĩa là mô tả network, server, database, DNS và quyền truy cập trong các file văn bản nằm trong Git, rồi để một công cụ tạo và thay đổi hạ tầng thật từ những file đó. Cách làm ngược lại — click tay trên console, hay bị gọi đùa là "ClickOps" — ổn cho một lần thử nghiệm, và hỏng với mọi thứ sau đó.

- **Không còn "snowflake".** Staging và prod sinh ra từ cùng một bộ code với input khác nhau, thay vì hai môi trường dựng tay mà không ai so sánh nổi.
- **Review và audit.** Mọi thay đổi là một pull request có người viết, người duyệt và diff — và công cụ cho thấy *chính xác* cái gì sẽ đổi trước khi có gì thay đổi.
- **Khôi phục nhanh.** Mất một account hay một region thì chạy `apply` cộng khôi phục dữ liệu, không phải dựng lại theo trí nhớ trong nhiều tuần.
- **Tự phục vụ (self-service).** Platform team phát hành một module; các product team có ngay VPC hay database đạt chuẩn mà không cần tạo ticket.

IaC **không** backup dữ liệu, không ngăn được người có quyền console sửa sau lưng nó (drift), và không làm code tệ bớt tệ — nó nhân bản sai lầm cũng hiệu quả y như vậy.

---

## 2. Declarative vs imperative, mutable vs immutable

Công cụ **khai báo** (declarative) nhận *trạng thái cuối mong muốn* ("có 3 instance t3.medium") rồi tự tính ra các bước. Công cụ **mệnh lệnh** (imperative) nhận *các bước* ("tạo một instance"). Chạy script imperative hai lần có thể ra 6 instance; apply cấu hình declarative hai lần thì lần thứ hai không làm gì cả. Tính chất chạy lại vẫn hội tụ về cùng kết quả đó gọi là **tính lũy đẳng** (idempotency), và đó là thứ khiến IaC an toàn khi chạy trong pipeline.

| | Declarative | Imperative |
|---|---|---|
| Bạn viết | Cái gì phải tồn tại | Làm thế nào để tới đó |
| Chạy lại | Không làm gì nếu đã đúng | Chỉ an toàn nếu script tự kiểm tra mọi thứ |
| Thứ tự | Công cụ tự dựng dependency graph | Bạn tự sắp thứ tự |
| Ví dụ | Terraform/OpenTofu, CloudFormation, Kubernetes YAML | Bash + AWS CLI, script dùng SDK |

Ansible nằm ở giữa (task chạy theo thứ tự, nhưng module lũy đẳng); CDK và Pulumi dùng ngôn ngữ imperative để *sinh ra* một mô hình declarative.

Hạ tầng **khả biến** (mutable) được vá tại chỗ (SSH vào, nâng cấp, sửa config) và dần trôi thành những "snowflake" độc nhất. Hạ tầng **bất biến** (immutable) thì được thay thế: build image mới, triển khai instance mới, xoá instance cũ; rollback nghĩa là deploy lại image trước đó.

Công cụ kiểu **push** (Terraform, Ansible) chỉ hành động khi có người chạy; các hệ thống **reconcile** (Kubernetes controller, Crossplane, Puppet agent) liên tục sửa lại mọi sai lệch.

---

## 3. Các khái niệm cốt lõi của Terraform

**Terraform** (của HashiCorp) là công cụ provisioning đa cloud phổ biến nhất. Bạn viết **HCL** trong các file `.tf`; mọi file `.tf` trong một thư mục hợp thành một **root module**.

- **Provider** — plugin chuyển resource thành lời gọi API (`aws`, `google`, `kubernetes`, `cloudflare`, `github`…).
- **Resource** — đối tượng Terraform tạo ra và sở hữu (`aws_vpc`, `aws_instance`).
- **Data source** — đối tượng Terraform chỉ *đọc* (AMI mới nhất, một hosted zone có sẵn).
- **Tham chiếu** (reference) — `aws_vpc.main.id` nối các block với nhau và thêm một cạnh vào **đồ thị phụ thuộc** (dependency graph).

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

Terraform tạo các node độc lập **song song** (mặc định 10, chỉnh bằng `-parallelism=n`) và xoá theo thứ tự ngược lại. `depends_on` chỉ dành cho phụ thuộc ẩn mà Terraform không nhìn thấy qua tham chiếu. Tuyệt đối không đặt access key trong block `provider` — dùng chuỗi credential bình thường: biến môi trường, profile, instance/task role, hoặc credential OIDC trong CI.

---

## 4. Quy trình Terraform: init, plan, apply

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

| Lệnh | Ghi chú |
|---|---|
| `terraform init` | Chạy lại khi thêm provider, module hoặc đổi backend. Commit `.terraform.lock.hcl`, không commit `.terraform/`. |
| `terraform fmt` / `validate` | Định dạng code; kiểm tra cú pháp và kiểu mà không gọi API cloud. |
| `terraform plan` | `-out=tfplan` lưu plan. `-detailed-exitcode`: 0 = không đổi, 1 = lỗi, 2 = có thay đổi. |
| `terraform apply tfplan` | Áp dụng đúng plan đã lưu; từ chối nếu state đã đổi kể từ lúc plan (stale plan). |
| `terraform destroy` | Xoá mọi thứ cấu hình đang quản lý. |

Cách đọc một plan:

```text
  + create          ~ update in-place        - destroy
-/+ destroy, then create replacement
+/- create replacement, then destroy (create_before_destroy)

-/+ resource "aws_instance" "web" {
      ~ ami = "ami-0aaa..." -> "ami-0bbb..." # forces replacement
    }
Plan: 1 to add, 0 to change, 1 to destroy.
```

Hãy săn cụm **"forces replacement"**: một số thuộc tính không đổi tại chỗ được, nên Terraform xoá rồi tạo lại — với database, đó là mất dữ liệu. Terraform cũng **không tự rollback**: apply lỗi giữa chừng thì các resource đã tạo vẫn nằm đó (và nằm trong state); bạn sửa code rồi apply tiếp (fix forward).

---

## 5. Variable, output, local và vòng lặp

**Variable** là input của module (có `type`, `validation`, `sensitive`), **local** là biểu thức được đặt tên, **output** đưa giá trị ra cho nơi gọi và các stack khác.

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

Thứ tự ưu tiên, từ thấp đến cao: `default` → biến môi trường `TF_VAR_name` → `terraform.tfvars` → `*.auto.tfvars` → `-var` / `-var-file` trên dòng lệnh.

**`count` vs `for_each`.** `count` định danh instance theo vị trí (`res[0]`, `res[1]`): bỏ phần tử đầu tiên của list là mọi instance phía sau bị lệch index, và Terraform lên plan tạo lại chúng. `for_each` dùng key ổn định (`res["a"]`), nên bỏ một key chỉ ảnh hưởng đúng instance đó. Dùng `count` cho công tắc 0-hoặc-1, `for_each` cho tập hợp.

`sensitive = true` chỉ ẩn giá trị khỏi output của CLI — **nó vẫn nằm dạng plain text trong state**.

---

## 6. State: bộ nhớ của Terraform

**State** (`terraform.tfstate`, định dạng JSON) ánh xạ mỗi địa chỉ trong code tới một đối tượng thật — `aws_instance.web` → `i-0abc…` — kèm các thuộc tính thấy được lần cuối. Không có nó, Terraform không biết instance nào "là" `aws_instance.web` (nó sẽ tạo bản trùng), cũng không biết phải xoá resource mà block đã bị gỡ khỏi code.

- Mặc định state là **file local** — trong team, hai người có hai state và giành nhau cùng một resource.
- State chứa **secret dạng plain text** (mật khẩu DB, key được sinh ra). Mã hoá nó, siết IAM, bật versioning, không bao giờ commit vào Git.
- Đừng sửa tay; dùng `terraform state list/show/mv/rm`, hoặc tốt hơn là các block khai báo `moved`/`import`/`removed`.
- **Phạm vi ảnh hưởng** (blast radius) tăng theo kích thước state. Một state chứa cả network, database và 40 service nghĩa là plan chậm và mỗi lần apply đều có thể đụng tới mọi thứ. Hãy tách theo vòng đời và người sở hữu: network, data, từng service.

---

## 7. Remote state và locking

**Backend** quyết định state nằm ở đâu. Remote backend gom state về một chỗ và **khoá** (lock) nó để hai lần apply không chạy cùng lúc và làm hỏng state.

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

Mẫu kinh điển trên AWS là một S3 bucket có versioning và mã hoá, cộng một **bảng DynamoDB** để giữ lock. Terraform 1.10 thêm (dạng thử nghiệm) và 1.11 chính thức hoá (GA) việc S3 backend tự khoá bằng một lock object ngay trong bucket, và tuỳ chọn DynamoDB nay đã bị đánh dấu deprecated — dù bạn vẫn sẽ gặp nó ở khắp nơi. Các backend khác: HCP Terraform, Azure Blob (lease), GCS, PostgreSQL.

```text
 engineer A: apply --> acquire lock --> OK, applying...
                            |
 CI job B:   apply --> acquire lock --> "Error acquiring the state lock"
                                        (fails or waits; state stays intact)

 s3://acme-tfstate-prod/network/terraform.tfstate
 s3://acme-tfstate-prod/network/terraform.tfstate.tflock  <- only while locked
```

Một lần chạy bị crash có thể để lại lock "treo": `terraform force-unlock LOCK_ID`, chỉ khi chắc chắn không ai đang chạy. `terraform_remote_state` chia sẻ output giữa các stack nhưng cần quyền đọc *toàn bộ* state; SSM Parameter Store hoặc tra cứu theo tag giúp các stack ít dính chặt vào nhau hơn.

---

## 8. Module: khối xây dựng tái sử dụng

**Module** là bất kỳ thư mục chứa file `.tf` nào, được gọi từ đường dẫn local, Git URL hoặc registry.

```hcl
module "orders_service" {
  source = "./modules/ecs-service"

  name          = "orders"
  environment   = var.environment
  desired_count = var.environment == "prod" ? 3 : 1
  subnet_ids    = module.network.private_subnet_ids
}
```

- **Module là một API** (`variables.tf` là đầu vào, `outputs.tf` là đầu ra). Input và output là hợp đồng; đổi tên một variable là breaking change. Đánh version cho module dùng chung và pin nó (`?ref=v1.4.0`, `version = "~> 1.4"`).
- **Gói sẵn quan điểm.** Một module bucket mặc định bật mã hoá và chặn public access khiến tuân thủ trở thành con đường dễ nhất.
- **Đừng bọc một resource** kiểu một-đổi-một; giữ độ lồng nông. Pin provider bằng `~>` và commit lock file.

---

## 9. Drift, import và refactor an toàn

**Drift** (lệch cấu hình) là mọi khác biệt giữa thực tế và code/state — thường là ai đó "sửa nhanh" security group trên console giữa sự cố. `plan` hiển thị nó như một thay đổi sẽ *hoàn tác* chỉnh sửa tay. Hoặc apply (code thắng), hoặc sửa code cho khớp (thực tế thắng). `apply -refresh-only` cập nhật state mà không đụng hạ tầng, nhưng nếu code vẫn khác thì lần plan sau lại đòi hoàn tác. Phát hiện drift bằng job `plan -detailed-exitcode` chạy định kỳ và cảnh báo khi exit code là 2; phòng ngừa bằng cách bỏ quyền ghi trên console của con người ở prod.

**Đưa resource có sẵn vào quản lý** — block `import` (1.5+) review được trong PR; `plan -generate-config-out=generated.tf` viết nháp block resource giúp bạn:

```hcl
import {
  to = aws_s3_bucket.logs
  id = "acme-logs-prod"
}
```

**Refactor.** Đổi tên resource hoặc chuyển nó vào module sẽ đổi địa chỉ, và Terraform sẽ xoá rồi tạo lại. Hãy khai báo việc di chuyển:

```hcl
moved {
  from = aws_instance.web
  to   = module.web.aws_instance.this
}
```

Và bảo vệ những resource không bao giờ được phép bị thay thế một cách tuỳ tiện:

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

`prevent_destroy` chỉ bảo vệ khi block còn nằm trong code, nên hãy bật thêm `deletion_protection` phía provider.

---

## 10. Môi trường, workspace và pipeline cho IaC

| Cách làm | Làm thế nào | Phù hợp | Cần lưu ý |
|---|---|---|---|
| **CLI workspace** | `terraform workspace new staging` — mỗi workspace một state, chung backend | Bản sao ngắn hạn cùng hình dạng (feature env) | Chung credential; dễ apply nhầm workspace |
| **Mỗi môi trường một thư mục** | Root module `envs/prod` gọi module dùng chung, có backend key và `.tfvars` riêng | Môi trường lâu dài ở các account riêng | Lặp lại một ít |
| **Wrapper / nền tảng** | Terragrunt, HCP Terraform, Spacelift | Nhiều account và region | Thêm một công cụ phải học |

Tài liệu của HashiCorp nói rõ CLI workspace không phù hợp khi các deployment cần credential và kiểm soát truy cập riêng. Prod nên có **account riêng và state riêng**.

```text
infra/
  modules/   network/  ecs-service/  rds/
  envs/
    dev/      main.tf backend.tf dev.tfvars    -> account 1111
    staging/  main.tf backend.tf stg.tfvars    -> account 2222
    prod/     main.tf backend.tf prod.tfvars   -> account 3333
```

Một pipeline cho IaC (cơ chế CI/CD chung có ở các bài CI và CD):

1. PR: `fmt -check`, `validate`, `tflint`, quét policy (Checkov, Trivy, OPA), rồi `plan` được đăng thành comment — người review duyệt **plan**, không chỉ duyệt code.
2. Merge: apply plan đã lưu, có cổng phê duyệt cho prod; CI assume role bằng credential **OIDC** ngắn hạn.
3. Phát hiện drift định kỳ; `terraform test` (1.6+) để test module.

---

## 11. Ansible cho quản lý cấu hình

Terraform **cấp phát** (provision) hạ tầng: VM, load balancer, DNS. **Quản lý cấu hình** (configuration management) lo phần chạy *bên trong* máy: package, user, file, service. **Ansible** là công cụ phổ biến nhất cho việc này.

- **Không cần agent** (agentless) — kết nối qua **SSH** (WinRM với Windows) và chạy module bằng Python trên máy đích; không có daemon, khác với Puppet/Chef.
- **Inventory** — danh sách host và nhóm; file tĩnh hoặc plugin động (`amazon.aws.aws_ec2` truy vấn EC2 theo tag).
- **Playbook** — YAML gồm các **play** (host nào) với các **task** theo thứ tự (module nào); **role** đóng gói chúng để tái sử dụng.
- **Module lũy đẳng** báo `ok` hoặc `changed`; task `shell`/`command` thô không lũy đẳng nếu không có điều kiện chặn (`creates:`). **Handler** chỉ chạy khi một task có thay đổi gọi tới nó.

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

Bake cấu hình vào image giữ cho compute bất biến; vá các server sống lâu (database chạy trên VM, hệ thống legacy) vẫn là cách dùng hợp lệ.

---

## 12. Terraform vs CloudFormation vs CDK vs Pulumi

| | Terraform / OpenTofu | CloudFormation | AWS CDK | Pulumi |
|---|---|---|---|---|
| Ngôn ngữ | HCL | YAML/JSON | TS, Python, Java, C#, Go | TS, Python, Go, C#, Java |
| Phạm vi | Mọi cloud + SaaS | AWS | AWS (sinh ra CloudFormation) | Mọi cloud |
| State | Bạn tự vận hành backend | AWS quản lý | CloudFormation quản lý | Pulumi Cloud hoặc backend tự quản |
| Xem trước | `plan` | Change set | `cdk diff` | `pulumi preview` |
| Cập nhật lỗi | Fix forward | Tự động rollback | Tự động rollback | Fix forward |

**CloudFormation** triển khai template thành **stack**; AWS giữ state, nên không có bucket nào phải bảo vệ hay khoá. Nó có change set, drift detection, `DeletionPolicy: Retain`, StackSets để triển khai nhiều account, và giới hạn 500 resource mỗi stack. **CDK** viết cùng thứ đó bằng ngôn ngữ lập trình thật, có vòng lặp, kiểu dữ liệu và unit test, ghép từ các construct (L1 là resource thô, L2 có mặc định hợp lý, L3 là pattern); `cdk synth` sinh CloudFormation, `cdk deploy` triển khai sau một lần `cdk bootstrap`.

**Giấy phép.** Tháng 8/2023, HashiCorp chuyển các bản Terraform mới từ giấy phép mã nguồn mở MPL 2.0 sang Business Source License (BSL 1.1). Cộng đồng fork phiên bản MPL cuối cùng thành **OpenTofu**, nay thuộc Linux Foundation và gần như thay thế trực tiếp được (`tofu plan`). BSL chủ yếu hạn chế việc làm sản phẩm cạnh tranh; dùng nội bộ thông thường không bị ảnh hưởng. IBM hoàn tất thương vụ mua HashiCorp vào năm 2025.

Cách chọn:

- Đa cloud hoặc cần provider SaaS (Cloudflare, Datadog, GitHub) → **Terraform/OpenTofu**.
- Chỉ AWS, muốn state được quản lý sẵn và có rollback → **CloudFormation**, hoặc **CDK** cho team thiên về developer.
- Muốn ngôn ngữ lập trình đa dụng trên nhiều cloud → **Pulumi**.
- Bên trong máy → **Ansible**, lý tưởng nhất là lúc build image.

Trộn nhiều công cụ là chuyện bình thường; quy tắc là **mỗi resource một chủ sở hữu** — không bao giờ để hai công cụ cùng quản lý một đối tượng.

---

## Điểm cần nhớ khi phỏng vấn

- IaC = hạ tầng nằm trong code có version control: **tái tạo được, review được, audit được, khôi phục nhanh**. Nó không phải backup dữ liệu.
- **Declarative + lũy đẳng** là lý do chạy lại an toàn. Terraform/CloudFormation là declarative; Ansible chạy theo thứ tự với module lũy đẳng.
- `init` → `plan` → `apply`; review plan để tìm **"forces replacement"**; trong CI hãy apply plan đã lưu. Không có rollback tự động.
- **State** ánh xạ code tới ID thật, chứa **secret dạng plain text**, và phải remote, mã hoá, có **lock**; tách nhỏ để giảm blast radius.
- Ưu tiên `for_each` hơn `count` cho tập hợp; dùng `moved`, `import`, `prevent_destroy` để thay đổi an toàn.
- **Drift** được `plan` phát hiện chứ không được ngăn chặn; chạy định kỳ và hạn chế quyền console.
- Workspace không phải cách cô lập mạnh — prod có account và state riêng.
- Terraform cấp phát, Ansible cấu hình (agentless, SSH); bake image để giữ tính bất biến.
- CloudFormation: AWS quản lý state, có rollback, chỉ AWS; CDK biên dịch ra nó. Terraform chuyển sang BSL (2023) → fork **OpenTofu**.

## Tóm tắt

- Hạ tầng trong Git review và khôi phục được; cách tiếp cận declarative và immutable tránh được snowflake.
- Terraform biến HCL thành dependency graph, gọi API qua provider, xem trước bằng `plan` và ghi lại thực tế vào state.
- State remote, mã hoá, có lock và được chia hợp lý là trái tim của việc dùng Terraform theo team.
- Module là API có version; `moved`, `import` và lifecycle giữ cho refactor an toàn.
- Cô lập môi trường theo account và state; pipeline đăng plan lên PR và apply khi merge.
- Ansible cấu hình máy; CloudFormation/CDK đánh đổi tính di động lấy state được quản lý và rollback.
