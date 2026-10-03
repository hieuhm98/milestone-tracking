# Git & Version Control

## 1. Version Control là gì?

**Ví dụ so sánh:** bạn đã bao giờ thấy một thư mục như thế này chưa?

```text
Report.docx
Report_v2.docx
Report_v2_final.docx
Report_v2_final_REALLY_final.docx
Report_v2_final_REALLY_final_Lan_edits.docx
```

Ai cũng từng thấy. Đó là một cách "tự chế" để **quản lý phiên bản (version control)**: giữ lại bản cũ để có thể quay lại, và cố gắng biết ai đã sửa gì. Cách này đổ vỡ rất nhanh — file nào là bản mới nhất? Lan đã sửa chính xác những gì? Nếu hai người cùng sửa hai bản khác nhau một lúc thì sao?

Giờ hãy nghĩ đến một trò chơi điện tử có **điểm lưu game (save point)**. Trước một trận đánh boss khó, bạn lưu game. Nếu thua, bạn tải lại và chơi tiếp. Mỗi lần lưu ghi nhớ chính xác bạn đang ở đâu. Version control mang lại cho đội phần mềm những điểm lưu như vậy cho code — kèm ghi chú ở mỗi lần lưu cho biết ai lưu và vì sao.

**Version Control System (VCS)** là hệ thống theo dõi thay đổi trong code theo thời gian, cho phép nhiều người cùng làm việc và quay lại phiên bản trước.

Ba điều một VCS mang lại cho cả đội:

1. **Lịch sử** — mọi thay đổi đều được ghi lại: thay đổi gì, ai thay đổi, khi nào, và vì sao.
2. **Hoàn tác** — bạn có thể quay về bất kỳ phiên bản nào trước đó nếu có gì hỏng.
3. **Làm việc nhóm** — mười developer có thể cùng làm một dự án một lúc mà không ghi đè lên công việc của nhau.

**Git** là VCS phổ biến nhất hiện nay (miễn phí, mã nguồn mở).

"Mã nguồn mở" nghĩa là mã nguồn của nó được công khai và ai cũng có thể dùng miễn phí. Git được tạo ra năm 2005 bởi Linus Torvalds, cha đẻ của Linux, và ngày nay gần như mọi công ty phần mềm đều dùng nó.

### Git khác gì "Lịch sử phiên bản" của Google Docs

Google Docs cũng lưu lịch sử phiên bản, nên ý tưởng này có thể đã quen với bạn. Có hai khác biệt quan trọng:

- Trong Google Docs, mọi người cùng sửa trực tiếp **một bản chung**. Trong Git, mỗi developer có **một bản sao đầy đủ của cả dự án và toàn bộ lịch sử** trên máy mình, làm việc riêng, rồi chủ động gộp công việc của mình với người khác.
- Google Docs tự động lưu vài giây một lần. Trong Git, developer **tự quyết định** khi nào lưu một phiên bản, và viết một ghi chú ngắn giải thích.

> **Hiểu lầm thường gặp:** "Git và GitHub là một." Git là công cụ theo dõi phiên bản trên máy tính của bạn. GitHub là một website lưu các dự án Git trên mạng để cả đội cùng chia sẻ. Chúng ta sẽ quay lại chuyện này ở Mục 8.

---

## 2. Tại sao BA/PM cần biết Git?

**BA (Business Analyst — chuyên viên phân tích nghiệp vụ)** hay **PM (Project Manager — quản lý dự án)** không viết code, nhưng làm việc với những người dùng Git cả ngày. Biết các từ vựng này giúp bạn trở thành một đồng đội hiệu quả hơn nhiều.

- Hiểu developer đang nói gì trong daily standup.
- Đọc được **pull request** để review yêu cầu.
- Hiểu tại sao cần merge trước khi release.
- Biết khi nào code đã "vào production".
- Không cần biết code, chỉ cần hiểu khái niệm.

### Những gì bạn sẽ nghe — và ý nghĩa của chúng

| Developer nói… | Nghĩa là |
|----------------|----------|
| "Em push hôm qua rồi." | Phần việc của tôi đã được tải lên server chung; người khác xem được. |
| "Nó vẫn đang ở branch của em." | Phía tôi đã xong nhưng chưa được gộp vào phiên bản chính. |
| "PR đang chờ review." | Tôi đã nhờ đồng nghiệp kiểm tra trước khi gộp. |
| "Merge vào main rồi." | Đã được duyệt và gộp vào phiên bản chính — sẽ ra mắt ở lần release tới. |
| "Em bị merge conflict." | Người khác đã sửa đúng những dòng đó; tôi phải tự quyết định giữ bản nào. |
| "Làm hotfix thôi." | Hệ thống đang chạy có bug khẩn cấp; chúng ta sẽ sửa ngoài lịch thông thường. |

Một ví dụ thực tế: trong buổi standup, developer nói *"Login xong rồi, PR đã tạo, nhưng em đang bị kẹt chờ review."* Một PM hiểu Git sẽ biết tính năng này **chưa** xong theo góc nhìn người dùng — chưa ai dùng được cho tới khi PR được review và merge. Bước đúng tiếp theo là giúp tìm người review, chứ không phải chuyển ticket sang "Done".

---

## 3. Các khái niệm cơ bản

### Repository (Repo)

**Ví dụ so sánh:** một thư mục dự án có sẵn cuốn nhật ký. Thư mục chứa các file; cuốn nhật ký ghi lại mọi thay đổi từng có với chúng.

Kho lưu trữ code kèm toàn bộ lịch sử thay đổi.
- **Local repo**: trên máy developer.
- **Remote repo**: trên server (GitHub, GitLab, Bitbucket).

Local repo là nơi bạn làm việc; remote repo là "nguồn sự thật" chung mà cả đội đồng bộ theo.

### Commit

**Ví dụ so sánh:** một điểm lưu game, có dán kèm tờ giấy ghi chú.

Một "snapshot" của code tại thời điểm cụ thể, kèm:
- Message mô tả thay đổi.
- Author và timestamp.
- Hash duy nhất (ví dụ: `a1b2c3d`).

**Hash** là một mã định danh dài gồm chữ và số (đầy đủ là 40 ký tự) mà Git tính ra từ nội dung. Người ta thường chỉ hiển thị 7 ký tự đầu, như `a1b2c3d`. Không có hai commit nào trùng hash, nên nó hoạt động như một dấu vân tay.

```text
commit a1b2c3d
Author: Harry <harry@mail.com>
Date:   Mon Apr 8 10:00:00 2024
Message: feat: add login page
```

Lưu một commit gồm hai bước:

1. **Stage** (`git add`) — chọn những thay đổi nào sẽ vào snapshot tiếp theo. Hãy hình dung như bỏ đồ vào một chiếc hộp.
2. **Commit** (`git commit`) — dán kín hộp và ghi nhãn bằng một message.

Khu vực chờ giữa hai bước này gọi là **staging area**.

**Commit message tốt** mô tả rõ thay đổi gì và vì sao. Nhiều đội làm theo một quy ước với tiền tố ngắn:

| Tiền tố | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| `feat:` | tính năng mới | `feat: add login page` |
| `fix:` | sửa lỗi | `fix: wrong total when voucher applied` |
| `docs:` | chỉ sửa tài liệu | `docs: update setup guide` |

Một message như `update` hay `asdf` chẳng nói gì với người đọc sau này — hãy tránh.

### Branch (Nhánh)

**Ví dụ so sánh:** một bản photo của hợp đồng để bạn ghi chép, sửa nháp. Bạn có thể thử mọi ý tưởng trên bản photo; bản gốc vẫn sạch sẽ. Nếu ý tưởng tốt, bạn chép các thay đổi trở lại bản gốc.

Branch là luồng phát triển **độc lập**. Tương tự làm bản copy để thử nghiệm mà không ảnh hưởng bản chính.

```text
main:     A──B──C──────────────M
                \             /
feature/login:   D──E──F──G──
```

Cách đọc: mỗi chữ cái là một commit. Developer tách nhánh sau commit C, tạo các commit D–G trên `feature/login` trong khi `main` không bị động tới, và cuối cùng **M** (một merge commit) đưa phần việc trở lại `main`.

- **main/master**: nhánh chính, thường là code ổn định nhất.
- **feature/xxx**: phát triển tính năng mới.
- **hotfix/xxx**: sửa lỗi khẩn cấp.

`main` và `master` là một; dự án mới gọi là `main`, dự án cũ gọi là `master`. Ở phần lớn các đội, `main` là code đang chạy (hoặc sắp chạy) trên **production** — hệ thống thật mà người dùng thật đang dùng.

### Merge
Kết hợp thay đổi từ một nhánh vào nhánh khác. Khi feature xong → merge vào main.

### Clone
Tạo bản sao local của remote repo.

Một developer mới vào đội sẽ clone repo ngay ngày đầu: lệnh này tải cả dự án cùng toàn bộ lịch sử về máy của họ.

### Pull / Push
- **Pull**: lấy thay đổi mới từ remote về local.
- **Push**: đẩy thay đổi local lên remote.

**Ví dụ so sánh:** remote repo giống một thư mục chung trên cloud. *Pull* = tải về phần việc mới nhất của đồng đội. *Push* = tải phần việc của mình lên. Developer thường pull đầu tiên vào buổi sáng và push khi một phần việc đã sẵn sàng chia sẻ.

```text
   Laptop của Developer A         Remote repo (GitHub)           Laptop của Developer B
   ┌───────────────┐   push ──▶  ┌─────────────────┐  ◀── push   ┌───────────────┐
   │  local repo   │             │ repo dùng chung │             │  local repo   │
   └───────────────┘  ◀── pull   └─────────────────┘   pull ──▶  └───────────────┘
```

---

## 4. Pull Request (PR) / Merge Request (MR)

**Ví dụ so sánh:** một phóng viên viết bài, nhưng bài không lên báo ngay. Bài được gửi cho biên tập viên trước; biên tập viên đọc, yêu cầu sửa, rồi mới duyệt cho in. Pull request chính là bước "gửi biên tập viên" dành cho code.

**Pull Request** là yêu cầu merge code từ nhánh feature vào nhánh chính — kèm code review.

GitHub và Bitbucket gọi nó là **Pull Request (PR)**; GitLab gọi cùng thứ đó là **Merge Request (MR)**.

Quy trình điển hình:

```text
1. Developer tạo branch: feature/add-payment
2. Code và commit
3. Push lên remote
4. Tạo Pull Request
5. Đồng nghiệp review code
6. BA/PO review: có đúng acceptance criteria không?
7. Approve → Merge vào main
8. Deploy
```

### Bạn thấy gì trên trang một PR

Khi mở một PR trên GitHub hoặc GitLab, thường bạn sẽ thấy:

- **Tiêu đề và mô tả** — thay đổi này là gì, thường kèm link tới ticket (ví dụ `JIRA-123`).
- **Commits** — danh sách các điểm lưu nằm trong PR.
- **Files changed** — phần "diff": dòng bị xóa màu đỏ, dòng thêm vào màu xanh lá.
- **Conversation** — bình luận của người review, đôi khi gắn vào từng dòng cụ thể.
- **Checks** — các bài test tự động đã chạy (dấu tích xanh = đạt, dấu X đỏ = lỗi).
- **Trạng thái** — Open, Approved, Changes requested, Merged hoặc Closed.

**BA có thể tham gia**: review PR về mặt business logic, kiểm tra AC được implement đúng không.

**AC (acceptance criteria — tiêu chí chấp nhận)** là các điều kiện một tính năng phải đáp ứng để được chấp nhận, ví dụ *"Khi giỏ hàng trên 500.000đ và khách thanh toán, thì được miễn phí vận chuyển."* Bạn không cần đọc code. Hãy đọc phần mô tả, xem ảnh chụp màn hình, và — tốt nhất — test tính năng trên môi trường **staging** (một bản sao riêng của hệ thống dùng để test) trước khi nó được merge.

Một bình luận hữu ích của BA trông như sau:

> *"AC #3 nói giảm giá không áp dụng cho hàng đang sale. Trên staging, em thêm một món đang sale vào giỏ mà vẫn được giảm 10%. Anh kiểm tra giúp em nhé?"*

> **Hiểu lầm thường gặp:** "Đã merge nghĩa là đã release." Chưa chắc. Merge đưa code vào nhánh chính; **deploy** là một bước riêng để đưa nó lên server thật. Có đội deploy tự động sau mỗi lần merge, có đội hai tuần mới release một lần.

---

## 5. Gitflow Workflow

**Workflow** là cách dùng branch mà cả đội đã thống nhất. **Gitflow** là một workflow nổi tiếng, đặc biệt hay dùng ở các đội release theo lịch.

```text
main ─────────────────────────── (production)
  └── develop ──────────────────── (tích hợp)
        ├── feature/login ──┐
        ├── feature/cart ───┤→ merge vào develop
        └── feature/xxx ────┘
  └── release/1.0 ── (kiểm thử lần cuối) ── merge vào main
  └── hotfix/bug123 ── (sửa khẩn cấp) ── merge vào main + develop
```

### Từng nhánh một

| Nhánh | Mục đích | Tồn tại đến khi |
|-------|----------|-----------------|
| `main` | Code đang ở production; mỗi commit ở đây là một lần release | Mãi mãi |
| `develop` | Nhánh tích hợp: các tính năng đã xong được gộp vào đây và test cùng nhau | Mãi mãi |
| `feature/*` | Một tính năng mới, ví dụ `feature/login` | Tính năng được merge vào `develop` |
| `release/*` | Chuẩn bị một phiên bản, ví dụ `release/1.0`: chỉ test lần cuối và sửa lỗi nhỏ | Được merge vào `main` (và ngược lại vào `develop`) |
| `hotfix/*` | Sửa gấp một lỗi trên production, tách thẳng từ `main` | Được merge vào `main` **và** `develop` |

### Một câu chuyện để theo dõi

1. Hai developer cùng làm `feature/login` và `feature/cart` một lúc, mỗi người trên nhánh riêng.
2. Khi mỗi tính năng xong và PR được duyệt, nó được merge vào `develop`.
3. Trước ngày release, đội tạo `release/1.0` từ `develop`. Tester test trên đó; ở đây chỉ được sửa lỗi — không thêm tính năng mới.
4. Khi test đạt, `release/1.0` được merge vào `main` và deploy. Phiên bản 1.0 đã chạy thật.
5. Hai ngày sau, người dùng báo thanh toán bị lỗi. Một developer tạo `hotfix/bug123` **từ `main`** (code đang chạy), sửa lỗi, rồi merge vào `main` (để sửa production) **và** `develop` (để lỗi không quay lại ở lần release sau).

Nhiều đội ngày nay dùng cách đơn giản hơn — ví dụ **trunk-based development**, nơi mọi người thường xuyên merge những thay đổi nhỏ vào `main`. Các khái niệm (branch, PR, merge) vẫn y như vậy.

---

## 6. Lệnh Git cơ bản (để hiểu, không cần dùng)

Developer gõ lệnh Git vào **terminal** (một cửa sổ chữ, nơi bạn gõ lệnh thay vì bấm chuột). Phần chữ sau dấu `#` là chú thích giải thích lệnh.

```bash
git clone <url>       # tải repo về
git pull              # lấy thay đổi mới nhất
git checkout -b feature/login  # tạo và chuyển sang branch mới
git add .             # stage thay đổi
git commit -m "feat: add login"  # lưu snapshot
git push              # đẩy lên remote
git merge feature/login  # merge branch vào branch hiện tại
git log               # xem lịch sử commit
```

Hai lệnh nữa bạn sẽ thường gặp:

```bash
git status            # xem file nào đã thay đổi và cái gì đã được stage
git log --oneline     # lịch sử rút gọn: mỗi commit một dòng
```

`git log` cho thấy lịch sử các commit trong repository: ai commit, khi nào, với message gì — cuốn nhật ký của dự án.

### Tự thử: repository đầu tiên của bạn

Bài tập này an toàn: mọi thứ diễn ra trong một thư mục luyện tập mới mà bạn có thể xóa đi sau đó.

**Cài Git trước.**
- **macOS:** mở **Terminal** (bấm `Cmd + Space`, gõ "Terminal"). Gõ `git --version`. Nếu chưa có Git, macOS sẽ đề nghị cài "Command Line Developer Tools" — hãy đồng ý.
- **Windows:** tải Git từ `https://git-scm.com`, cài với các tùy chọn mặc định, rồi mở **Git Bash** từ menu Start. Dùng Git Bash cho tất cả các lệnh bên dưới.

Kiểm tra Git đã chạy — bạn sẽ thấy số phiên bản như `git version 2.50.1` (phiên bản gần đây nào cũng được):

```bash
git --version
```

**Bước 1 — tạo một repo luyện tập:**

```bash
mkdir git-practice
cd git-practice
git init -b main
git config user.name "Your Name"
git config user.email "you@example.com"
```

Kết quả mong đợi: `Initialized empty Git repository in …/git-practice/.git/`. Hai dòng `config` đặt tên hiển thị trên các commit của bạn, chỉ cho thư mục luyện tập này.

**Bước 2 — tạo commit đầu tiên:**

```bash
echo "Shopping list" > notes.txt
git status
git add notes.txt
git commit -m "Add shopping list"
```

`git status` liệt kê `notes.txt` màu đỏ dưới mục "Untracked files" — Git thấy file nhưng chưa theo dõi nó. Sau khi commit, bạn sẽ thấy dạng như `[main (root-commit) 3f2a91c] Add shopping list` và `1 file changed, 1 insertion(+)`.

**Bước 3 — làm việc trên một branch, rồi merge:**

```bash
git checkout -b feature/add-milk
echo "Milk" >> notes.txt
git commit -am "Add milk"
git checkout main
cat notes.txt
git merge feature/add-milk
cat notes.txt
git log --oneline
```

Hãy để ý: ngay sau khi chuyển về `main`, `notes.txt` chỉ có "Shopping list" — thay đổi của branch chưa có ở đây. Sau khi merge (Git in ra `Fast-forward`, nghĩa là `main` chỉ việc tiến lên để bao gồm commit của branch), file có thêm "Milk", và `git log --oneline` hiện cả hai commit, mới nhất ở trên.

(`-am` là cách viết tắt: stage mọi thay đổi trong các file đã được theo dõi và commit luôn một lần.)

Làm xong, bạn chỉ cần xóa thư mục `git-practice`. Không có gì bị gửi đi đâu cả — repo này chỉ tồn tại trên máy bạn, vì bạn chưa từng push nó lên remote.

---

## 7. Merge Conflict

**Ví dụ so sánh:** hai đồng nghiệp mỗi người in một bản của cùng một hợp đồng. Một người sửa hạn thanh toán thành "30 ngày"; người kia sửa đúng câu đó thành "45 ngày". Khi mang hai bản về, không ai có thể tự động gộp chúng — phải có người quyết định bản nào đúng.

**Merge conflict** xảy ra khi hai người thay đổi cùng một phần của cùng một file theo hai cách khác nhau trên hai branch khác nhau, và Git không biết nên giữ phiên bản nào.

Điều quan trọng: phần lớn các lần merge **không** có conflict. Nếu một người sửa trang đăng nhập và người kia sửa trang giỏ hàng — hoặc thậm chí sửa các dòng khác nhau trong cùng một file — Git tự gộp được. Conflict chỉ xảy ra khi *cùng những dòng đó* bị sửa khác nhau.

### Một conflict trông như thế nào

Git dừng việc merge lại và đánh dấu chỗ xung đột ngay trong file:

```text
<<<<<<< HEAD
Hạn thanh toán trong vòng 30 ngày
=======
Hạn thanh toán trong vòng 45 ngày
>>>>>>> feature/new-terms
```

- Giữa `<<<<<<< HEAD` và `=======` là phiên bản trên nhánh bạn đang merge **vào**.
- Giữa `=======` và `>>>>>>>` là phiên bản từ nhánh đang được merge **tới**.

Developer sửa file để giữ lại nội dung đúng, xóa các dòng đánh dấu, rồi chạy `git add` và `git commit` để hoàn tất việc merge.

### Vì sao BA nên quan tâm

Đôi khi conflict không phải là câu hỏi kỹ thuật mà là câu hỏi **nghiệp vụ**: hai tính năng, được làm từ hai yêu cầu khác nhau, đã sửa cùng một quy tắc theo hai cách khác nhau. Developer có thể tới hỏi bạn *"Ticket A ghi 30 ngày, ticket B ghi 45 — cái nào đúng?"* Đó là một mâu thuẫn trong yêu cầu lộ ra qua Git, và giải quyết nó là việc của BA.

> **Tự thử (không bắt buộc):** trong thư mục `git-practice` ở Mục 6, cố ý tạo ra một conflict:
>
> 1. `git checkout -b feature/eggs`, rồi `echo "Eggs" >> notes.txt` và `git commit -am "Add eggs"`.
> 2. `git checkout main`, rồi `echo "Bread" >> notes.txt` và `git commit -am "Add bread"`.
> 3. `git merge feature/eggs` — Git in ra `CONFLICT (content): Merge conflict in notes.txt`.
> 4. Mở `notes.txt` bằng bất kỳ trình soạn thảo văn bản nào: bạn sẽ thấy các dấu `<<<<<<<`, `=======` và `>>>>>>>` bao quanh "Bread" và "Eggs". Giữ cả hai dòng, xóa ba dòng đánh dấu, lưu lại.
> 5. `git add notes.txt` rồi `git commit -m "Merge eggs"`. Conflict đã được giải quyết.

---

## 8. GitHub, GitLab, Bitbucket

**Ví dụ so sánh:** email là một công nghệ; Gmail và Outlook là các công ty cung cấp dịch vụ email. Tương tự, **Git** là công nghệ, còn GitHub, GitLab và Bitbucket là các dịch vụ xây dựng xung quanh nó.

Đây là các **nền tảng hosting Git repository**:

| Nền tảng | Điểm mạnh |
|----------|-----------|
| GitHub | Phổ biến nhất, cộng đồng lớn |
| GitLab | CI/CD tích hợp, self-hosted |
| Bitbucket | Tích hợp tốt với Jira (Atlassian) |

Chúng lưu **remote repo** trên mạng để cả đội cộng tác, và bổ sung nhiều tính năng bên trên Git:

- **Pull request / merge request** và code review.
- **Phân quyền truy cập** — ai được xem hoặc sửa dự án nào.
- **Issues** — theo dõi công việc đơn giản (nhiều đội dùng Jira thay thế).
- **CI/CD** — *Continuous Integration / Continuous Delivery (tích hợp liên tục / phân phối liên tục)*: các "robot" tự động chạy test sau mỗi thay đổi và có thể deploy code khi test đạt.

Giải thích vài thuật ngữ trong bảng:

- **Self-hosted** nghĩa là công ty có thể cài GitLab trên server của chính mình thay vì dùng website công khai — phổ biến ở ngân hàng và các tổ chức bắt buộc giữ code nội bộ.
- **Jira** là công cụ quản lý ticket phổ biến của Atlassian, cũng là công ty làm ra Bitbucket, nên ticket và các thay đổi code liên quan có thể liên kết với nhau dễ dàng.

### Git và GitHub trong một bảng

| | Git | GitHub (và các nền tảng tương tự) |
|--|-----|-----------------------------------|
| Là gì | Công cụ quản lý phiên bản | Website / dịch vụ lưu trữ Git repo |
| Chạy ở đâu | Trên máy tính của bạn | Trên cloud (hoặc server của công ty) |
| Cần internet? | Không | Có |
| Ai làm ra | Cộng đồng mã nguồn mở | Một công ty (GitHub thuộc sở hữu của Microsoft) |

---

## 9. Tóm tắt

- **Git**: version control — theo dõi lịch sử code.
- **Commit**: snapshot của code tại một thời điểm.
- **Branch**: luồng phát triển độc lập.
- **Pull Request**: yêu cầu merge + review — nơi BA có thể tham gia.
- **main/master**: nhánh ổn định, thường = production.
- **Merge**: kết hợp branch vào branch khác.
- **Merge conflict**: hai branch sửa cùng những dòng theo cách khác nhau; con người phải quyết định.
- **Gitflow**: `feature` → `develop` → `release` → `main`; `hotfix` đi từ `main` rồi quay lại cả `main` và `develop`.
- GitHub/GitLab/Bitbucket: nền tảng lưu trữ và collaborate.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Version control (VCS) | Hệ thống ghi lại mọi phiên bản của file để so sánh và quay lại |
| Repository (repo) | Thư mục dự án kèm toàn bộ lịch sử thay đổi |
| Commit | Một điểm lưu có nhãn: thay đổi gì, ai, khi nào, vì sao |
| Hash | Mã định danh duy nhất của một commit, ví dụ `a1b2c3d` |
| Staging area | Nơi các thay đổi chờ trước khi được commit |
| Branch | Một luồng công việc riêng, không làm xáo trộn bản chính |
| Merge | Gộp các thay đổi từ một branch vào branch khác |
| Merge conflict | Hai thay đổi trên cùng những dòng mà Git không tự gộp được |
| Clone / Pull / Push | Sao chép remote repo / tải thay đổi mới về / đẩy thay đổi của bạn lên |
| Pull Request (PR) / Merge Request (MR) | Yêu cầu review và merge một branch |
| Hotfix | Bản sửa gấp cho lỗi trên production |
| Production | Hệ thống thật mà người dùng thật đang dùng |
