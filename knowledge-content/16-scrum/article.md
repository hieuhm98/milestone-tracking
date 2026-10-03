# Scrum Framework

## 1. Scrum là gì?

**Scrum** là framework Agile phổ biến nhất, tổ chức phát triển phần mềm theo **sprint** (vòng lặp 1-4 tuần), với 3 vai trò rõ ràng, 5 ceremonies và 3 artifacts.

Scrum không phải methodology — đó là framework nhẹ, để teams tự điều chỉnh.

### Một hình ảnh đời thường

Hãy nghĩ đến bếp của một nhà hàng đang chuẩn bị thực đơn mới theo mùa. Chủ nhà hàng quyết định món nào quan trọng nhất với khách. Một bếp trưởng giữ cho cả bếp vận hành trơn tru — không phải bằng cách tự nấu mọi món, mà bằng cách đảm bảo mọi người có đủ thứ cần thiết và nề nếp làm việc hiệu quả. Các đầu bếp tự bàn với nhau cách chế biến từng món. Cứ hai tuần một lần, họ mời khách quen nếm thử, lắng nghe phản ứng và điều chỉnh thực đơn.

Đó chính là Scrum: một người quyết định **làm gì** có giá trị nhất, những người trực tiếp làm quyết định **làm thế nào**, và cả team kiểm tra kết quả thật với người thật theo một nhịp cố định.

### Nguồn gốc

Cái tên đến từ môn **bóng bầu dục (rugby)**, nơi "scrum" là cả đội cùng đẩy về phía trước. Ken Schwaber và Jeff Sutherland chính thức hóa Scrum vào những năm 1990, và bộ quy tắc chính thức nằm trong một tài liệu ngắn, miễn phí tên là **Scrum Guide**. Phiên bản hiện tại được phát hành vào **tháng 11 năm 2020**. Bài học này theo phiên bản đó và chỉ ra nguồn gốc của những thuật ngữ cũ mà bạn vẫn sẽ nghe ở công ty.

### Ý tưởng nền tảng: kiểm tra và thích nghi

Scrum dựa trên **empiricism** (chủ nghĩa thực nghiệm) — ra quyết định dựa trên những gì thực sự quan sát được, không dựa trên dự đoán. Nó đứng trên ba trụ cột:

| Trụ cột | Nghĩa đơn giản | Ví dụ |
|---------|----------------|-------|
| **Transparency** (minh bạch) | Ai cũng thấy được tình trạng thật của công việc | Bảng công việc công khai cho mọi người |
| **Inspection** (kiểm tra) | Thường xuyên xem xét tiến độ và sản phẩm | Cho xem sản phẩm sau mỗi sprint |
| **Adaptation** (thích nghi) | Đổi hướng khi có gì đó không ổn | Sắp xếp lại backlog sau khi có phản hồi |

> **Hiểu lầm thường gặp:** Scrum không phải công cụ quản lý dự án như Jira. Jira là phần mềm theo dõi công việc; Scrum là một bộ vai trò, sự kiện và quy tắc. Bạn có thể chạy Scrum chỉ với giấy nhớ dán trên tường.

---

## 2. Ba vai trò (Roles)

Một **Scrum Team** có đúng ba loại trách nhiệm. Scrum Guide 2020 gọi chúng là "accountabilities" (trách nhiệm giải trình) thay vì "roles" (vai trò), và đổi tên "Development Team" cũ thành **Developers**. Cả Scrum Team thường có **từ 10 người trở xuống**, không có nhóm con hay phân cấp.

### Product Owner (PO)
- Đại diện cho khách hàng/stakeholder.
- Sở hữu và ưu tiên **Product Backlog**.
- Quyết định **làm gì** (what), không quyết định làm thế nào (how).
- Trả lời câu hỏi về yêu cầu cho team.
- Chịu trách nhiệm về **giá trị sản phẩm**.

PO là **một người, không phải một hội đồng**. Nhiều người (bán hàng, chăm sóc khách hàng, CEO) có thể góp ý tưởng cho PO, nhưng chỉ PO quyết định thứ tự của backlog. **Stakeholder** (bên liên quan) là tất cả những ai quan tâm đến sản phẩm — khách hàng, quản lý, các phòng ban khác.

*Ví dụ:* team bán hàng, team hỗ trợ và một khách hàng lớn đều muốn tính năng khác nhau được làm trước. Thay vì ba "sếp" cùng ra lệnh, PO cân nhắc giá trị và sắp xếp thành một danh sách duy nhất.

### Scrum Master (SM)
- Đảm bảo team hiểu và tuân theo Scrum.
- Loại bỏ **impediment** (trở ngại) cho team.
- Không phải project manager, không giao việc.
- Phục vụ team (servant leader).
- Tổ chức và facilitate các ceremonies.

**Impediment** là bất cứ thứ gì chặn team lại: server test bị hỏng, thiếu một phê duyệt, phụ thuộc vào team khác. **Facilitate** nghĩa là giúp cuộc họp diễn ra tốt — đúng chủ đề, đúng giờ — mà không áp đặt kết quả. **Servant leader** (người lãnh đạo phục vụ) dẫn dắt bằng cách giúp đỡ, không phải ra lệnh. Scrum Guide 2020 nói Scrum Master chịu trách nhiệm về **hiệu quả** của Scrum Team.

### Developers (trước đây gọi là "Development Team")
- Cross-functional: có đủ kỹ năng để deliver sprint.
- Self-organizing: tự quyết định cách làm.
- Kích thước lý tưởng: 3-9 người.
- Không có role hierarchy trong team.

"Developers" trong Scrum là **tất cả những người làm ra sản phẩm**, không chỉ lập trình viên: tester, designer và analyst trong team cũng tính. **Cross-functional** (đa chức năng) nghĩa là team không cần chuyển việc cho nhóm bên ngoài mới làm xong được. Con số "3-9 người" đến từ Scrum Guide cũ (2017) và vẫn được nhắc nhiều; Scrum Guide 2020 thì nói cả Scrum Team thường có từ 10 người trở xuống.

> **Hiểu lầm thường gặp:** trong Scrum không có Project Manager truyền thống. PM quản lý phạm vi, thời gian, chi phí và nguồn lực; trong Scrum các nhiệm vụ đó được chia ra — PO lo giá trị và ưu tiên, Developers lo kế hoạch cho sprint, Scrum Master lo quy trình.

---

## 3. Ba Artifacts

**Artifact** là một thông tin hiển thị rõ ràng mà team dựa vào để làm việc — giống những phiếu order ghim trên tường bếp. Scrum có ba artifact, và từ năm 2020 mỗi artifact đi kèm một **commitment** (cam kết): một mục tiêu giúp nó tập trung.

| Artifact | Cam kết đi kèm | Câu hỏi nó trả lời |
|----------|----------------|--------------------|
| Product Backlog | **Product Goal** | Sản phẩm hướng tới đâu về lâu dài? |
| Sprint Backlog | **Sprint Goal** | Sprint này để làm gì? |
| Increment | **Definition of Done** | Khi nào công việc thật sự xong? |

### Product Backlog
- Danh sách **tất cả yêu cầu** của sản phẩm.
- Được sắp xếp theo ưu tiên (item quan trọng nhất ở trên).
- Luôn thay đổi — PO liên tục refinement.
- Mỗi item gọi là **PBI** (Product Backlog Item) hay User Story.

**Product Goal** là mục tiêu dài hạn, ví dụ: *"Trở thành cách dễ nhất để dân văn phòng đặt bữa trưa."* **User story** là một yêu cầu ngắn viết từ góc nhìn người dùng: *"Là khách hàng, tôi muốn thanh toán bằng ví điện tử để không cần dùng tiền mặt."*

### Sprint Backlog
- Tập con của Product Backlog được chọn cho **sprint này**.
- Kèm plan để deliver chúng (tasks).
- Chỉ Development Team được thay đổi Sprint Backlog.

Nó gồm ba phần: **Sprint Goal** (vì sao), các item được chọn (làm gì) và kế hoạch (làm thế nào). Nó thuộc về Developers và được cập nhật suốt sprint khi họ hiểu thêm.

### Increment
- Tổng tất cả PBI completed trong sprint.
- Phải đạt **Definition of Done** (DoD).
- Phải **usable** — dùng được, dù stakeholder có release hay không.

Mỗi Increment cộng dồn vào tất cả các Increment trước đó, và Scrum Guide 2020 lưu ý rằng có thể tạo ra nhiều Increment trong một sprint. Công việc chưa đạt DoD thì không thuộc Increment — nó quay lại Product Backlog.

---

## 4. Năm Ceremonies (Events)

Các cuộc họp của Scrum được gọi là **event** (sự kiện; nhiều team vẫn gọi là "ceremony"). Scrum Guide liệt kê năm event: chính **Sprint** (chiếc "hộp" chứa tất cả các event khác, xem mục 5), **Sprint Planning**, **Daily Scrum**, **Sprint Review** và **Sprint Retrospective**. Mỗi event có thời lượng tối đa, gọi là **timebox**; các giới hạn dưới đây áp dụng cho sprint một tháng và thường ngắn hơn với sprint ngắn hơn.

```text
|<------------------------ Sprint (ví dụ 2 tuần) ------------------------>|
 Planning → Daily → Daily → Daily → ... → Daily → Review → Retrospective
```

### Sprint Planning
- Đầu mỗi sprint.
- PO trình bày ưu tiên, Team chọn PBI phù hợp.
- Team tạo Sprint Goal và Sprint Backlog.
- Max 8 giờ cho sprint 1 tháng.

Buổi này trả lời ba câu hỏi: **Vì sao** sprint này có giá trị (Sprint Goal)? **Làm được gì**? **Làm thế nào**?

### Daily Scrum (Daily Standup)
- Mỗi ngày, 15 phút, cùng giờ.
- 3 câu hỏi: Hôm qua làm gì? Hôm nay làm gì? Có trở ngại không?
- Dev team tự tổ chức, không phải báo cáo cho SM/PO.

Ba câu hỏi này đến từ các phiên bản Scrum Guide cũ. Scrum Guide 2020 không còn bắt buộc chúng — Developers có thể dùng bất kỳ hình thức nào, miễn là họ kiểm tra tiến độ hướng tới Sprint Goal và điều chỉnh kế hoạch cho ngày hôm sau. Nhiều team vẫn dùng ba câu hỏi vì chúng đơn giản.

### Sprint Review
- Cuối sprint, demo Increment cho stakeholder.
- Thu thập phản hồi → điều chỉnh Product Backlog.
- Max 4 giờ cho sprint 1 tháng.

Đây là buổi làm việc thật, không phải buổi trình chiếu slide: stakeholder dùng thử sản phẩm và bàn xem tiếp theo nên làm gì.

### Sprint Retrospective
- Sau Sprint Review.
- Team tự cải tiến: quy trình làm việc, công cụ, mối quan hệ.
- Câu hỏi: Làm tốt gì? Cần cải thiện gì? Action items?
- Max 3 giờ cho sprint 1 tháng.

Review xem xét **sản phẩm** cùng stakeholder; Retrospective xem xét **cách team làm việc**, và chỉ Scrum Team tham dự.

### Backlog Refinement (không phải ceremony chính thức)
- PO + Team làm rõ, ước tính PBI chuẩn bị cho sprint tới.
- Thường 10% thời gian mỗi sprint.

Refinement là một hoạt động diễn ra liên tục, không phải một trong năm event. **Ước tính** nghĩa là phỏng đoán công sức một item cần, thường tính bằng "story point" (độ lớn tương đối, không phải số giờ). Quy tắc "khoảng 10%" đến từ Scrum Guide cũ.

---

## 5. Sprint

Sprint là "tim đập" của Scrum:
- Cố định 1-4 tuần (phổ biến nhất: 2 tuần).
- Không thêm scope giữa chừng.
- Sprint kết thúc → bắt đầu sprint mới ngay.

```text
[Sprint 1] → [Sprint 2] → [Sprint 3] → ...
   2 tuần       2 tuần       2 tuần
```

### Vì sao cần nhịp cố định?

Giống như lương tháng hay lớp học hằng tuần, một nhịp đều đặn giúp mọi thứ dễ đoán: stakeholder biết khi nào sẽ thấy tiến độ, còn team học được mình làm xong bao nhiêu việc trong một sprint.

### Bảo vệ sprint

Trong một sprint, **Sprint Goal không thay đổi** và chất lượng không bị hạ thấp. Chi tiết công việc vẫn có thể được làm rõ và thương lượng lại với PO khi team hiểu thêm — nhưng yêu cầu mới lớn sẽ vào Product Backlog cho sprint sau. Nếu có việc thật sự khẩn cấp phải đưa vào, PO thường đổi bớt một việc khác ra.

Chỉ **Product Owner** mới có quyền hủy sprint, và chỉ khi Sprint Goal trở nên lỗi thời — ví dụ công ty bỏ hẳn tính năng đó. Điều này rất hiếm.

---

## 6. Definition of Done (DoD)

DoD là tiêu chí để một PBI được coi là **hoàn thành**:
- Code được viết.
- Code review.
- Tests pass.
- Deployed to staging.
- Documentation updated.

DoD giúp tránh "almost done" — mọi người đồng ý thế nào là xong.

### Ví dụ: quy tắc "sẵn sàng phục vụ" của nhà hàng

Trước khi bất kỳ đĩa nào rời bếp: món nóng phải nóng, viền đĩa được lau sạch, số order được kiểm tra. Quy tắc đó áp dụng cho **mọi** món. Trong phần mềm, **code review** nghĩa là một developer khác đọc code trước khi code được chấp nhận, còn **staging** là bản sao của hệ thống thật, dùng để kiểm tra lần cuối trước khi người dùng thật nhìn thấy.

### DoD vs acceptance criteria

| | Definition of Done | Acceptance criteria |
|--|--------------------|---------------------|
| Áp dụng cho | **Mọi** item trong backlog | **Một** item cụ thể |
| Ví dụ | "Tests pass, đã code review" | "Thanh toán ví điện tử hiển thị biên lai" |
| Ai đặt ra | Scrum Team (hoặc chuẩn của công ty) | Thường là PO cùng team |

> **Hiểu lầm thường gặp:** "Xong" không phải là "developer viết code xong". Không có DoD, developer hiểu là đã code, tester hiểu là đã test, còn PO hiểu là đã dùng được — và không ai nhận ra cho đến buổi demo.

---

## 7. Một sprint 2 tuần, từng ngày một

Đây là một sprint thực tế của team giao đồ ăn 7 người: Linh (PO), Minh (Scrum Master) và năm Developers (ba lập trình viên, một tester, một designer). Product Goal: *"Giúp dân văn phòng đặt bữa trưa thật nhanh."*

| Ngày | Chuyện gì diễn ra |
|------|-------------------|
| **Thứ Hai (ngày 1)** | **Sprint Planning** (khoảng 3 tiếng). Linh giải thích vì sao thanh toán ví điện tử là quan trọng nhất lúc này. Sprint Goal: *"Khách hàng có thể thanh toán bằng ví điện tử."* Developers chọn 6 PBI và chia thành các task. Tính năng hoàn tiền để lại sau. |
| **Thứ Ba (ngày 2)** | **Daily Scrum** đầu tiên lúc 9:30, 15 phút. Công việc bắt đầu; designer hoàn thiện màn hình thanh toán. |
| **Thứ Tư (ngày 3)** | Daily Scrum: một lập trình viên chưa có tài khoản test từ đối tác ví điện tử. Minh nhận impediment này và thúc giục đối tác. |
| **Thứ Năm (ngày 4)** | Có quyền truy cập. Tester bắt đầu viết test case cho luồng thanh toán. |
| **Thứ Sáu (ngày 5)** | PBI đầu tiên đạt DoD. Giám đốc kinh doanh đề nghị Linh làm tính năng mã khuyến mãi; cô đưa nó vào Product Backlog, không đưa vào sprint. |
| **Thứ Hai (ngày 6)** | Daily Scrum cho thấy một PBI lớn hơn dự kiến. Developers và Linh thống nhất bỏ tùy chọn "lưu thẻ" khỏi sprint này — Sprint Goal vẫn giữ nguyên. |
| **Thứ Ba (ngày 7)** | **Backlog Refinement** (1 tiếng): Linh và team làm rõ và ước tính tính năng mã khuyến mãi cho sprint sau. |
| **Thứ Tư–Năm (ngày 8–9)** | Xây dựng và kiểm thử. Bug tìm được phải sửa xong thì item mới được tính là xong. |
| **Sáng thứ Sáu (ngày 10)** | **Sprint Review** (khoảng 2 tiếng): stakeholder thanh toán bằng ví điện tử trên điện thoại test. Phản hồi: hiển thị số dư ví. Linh thêm vào backlog. |
| **Chiều thứ Sáu (ngày 10)** | **Sprint Retrospective** (khoảng 1,5 tiếng). Điều làm tốt: tester tham gia sớm. Cần cải thiện: xin quyền truy cập của đối tác trước khi sprint bắt đầu. Action item: Minh thêm mục "kiểm tra quyền truy cập bên ngoài" vào checklist lập kế hoạch. |
| **Thứ Hai tuần sau** | Sprint tiếp theo bắt đầu ngay với Sprint Planning. |

> **Tự thử nhé:** tổ chức một buổi retrospective 15 phút cho chính tuần của bạn. Trên giấy, viết ba tiêu đề — *Làm tốt*, *Cần cải thiện*, *Một hành động cho tuần sau* — rồi điền vào. Thứ Sáu tuần sau lặp lại và kiểm tra xem bạn đã thực sự làm hành động đó chưa. Thói quen ấy chính là cốt lõi của cải tiến liên tục trong Scrum.

---

## 8. Tóm tắt

| | Ai | Làm gì |
|--|----|----|
| **PO** | 1 người | Ưu tiên backlog, đại diện khách hàng |
| **Scrum Master** | 1 người | Facilitate, loại bỏ impediment |
| **Dev Team** | 3-9 người | Build increment |

**Ceremonies**: Planning → Daily Standup → Review → Retro.
**Artifacts**: Product Backlog → Sprint Backlog → Increment.

- Scrum là framework nhẹ dựa trên **minh bạch, kiểm tra và thích nghi**; bộ quy tắc chính thức nằm trong Scrum Guide (2020).
- Từ năm 2020, "Development Team" được gọi là **Developers**, và cả Scrum Team thường có từ 10 người trở xuống.
- Mỗi artifact có một cam kết: **Product Goal**, **Sprint Goal**, **Definition of Done**.
- Sprint là một timebox cố định; mục tiêu của nó được bảo vệ, còn yêu cầu mới đi vào Product Backlog.
- **Review** xem xét sản phẩm cùng stakeholder; **Retrospective** cải tiến cách team làm việc.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Sprint | Chu kỳ cố định 1–4 tuần tạo ra một Increment dùng được |
| Product Owner | Một người duy nhất quyết định làm gì tiếp theo và theo thứ tự nào |
| Scrum Master | Người huấn luyện giúp Scrum vận hành và gỡ vướng mắc |
| Developers | Tất cả thành viên trong team trực tiếp làm ra sản phẩm |
| Product Backlog | Danh sách có thứ tự mọi thứ sản phẩm có thể cần |
| Sprint Backlog | Sprint Goal, các item chọn cho sprint này, và kế hoạch |
| Increment | Phần công việc đã xong và dùng được tính đến hiện tại |
| Definition of Done | Danh sách kiểm tra chất lượng mà mọi item phải đạt mới tính là xong |
| Impediment | Bất cứ thứ gì cản trở tiến độ của team |
| Timebox | Thời lượng tối đa cho phép của một event |
