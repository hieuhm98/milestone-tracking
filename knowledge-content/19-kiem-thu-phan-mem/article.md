# Kiểm thử phần mềm

## 1. Kiểm thử là gì?

**Kiểm thử phần mềm (Software Testing)** là quá trình đánh giá phần mềm để phát hiện lỗi (bug) và đảm bảo nó đáp ứng yêu cầu.

**Mục tiêu**: phát hiện lỗi sớm — sửa càng sớm càng rẻ.

### Một hình ảnh đời thường

Trước khi một nhà hàng mới khai trương, chủ quán mời bạn bè đến ăn thử. Họ gọi những món kết hợp kỳ quặc, đòi chia hóa đơn làm năm, phàn nàn canh bị nguội, và thử trả bằng một loại thẻ mà máy không nhận. Mỗi vấn đề phát hiện ra tối hôm đó là một vấn đề khách thật sẽ không bao giờ gặp. Tester phần mềm làm đúng công việc đó cho một ứng dụng: dùng nó theo cách người thật sẽ dùng — kể cả những cách kỳ lạ — và báo cáo những gì sai trước khi ra mắt.

**Defect** (khiếm khuyết) hay **bug** là bất kỳ chỗ nào phần mềm không hoạt động như mong muốn: tổng tiền sai, nút bấm không phản hồi, ứng dụng bị crash (văng/sập), trang mất 30 giây mới tải xong.

### Tester thực sự làm gì

Tester (còn gọi là **QA**, viết tắt của Quality Assurance — đảm bảo chất lượng) thường:

1. **Đọc yêu cầu** và acceptance criteria, đặt câu hỏi khi có điều gì chưa rõ hoặc không kiểm thử được.
2. **Thiết kế test**: viết test case mô tả cần kiểm tra gì và kết quả mong đợi là gì.
3. **Chuẩn bị dữ liệu và môi trường test**: tài khoản test, sản phẩm mẫu, một bản sao an toàn của hệ thống.
4. **Thực thi test**: chạy bằng tay hoặc bằng công cụ tự động, và ghi lại pass/fail (đạt/không đạt).
5. **Báo cáo bug** rõ ràng để developer tái hiện và sửa được.
6. **Kiểm thử lại bản sửa** và chạy regression trước mỗi lần phát hành.

### Vì sao phát hiện sớm lại quan trọng

**Rule of 10**: chi phí sửa bug tăng theo cấp số nhân qua các giai đoạn:
- Requirements: 1x
- Design: 10x
- Development: 100x
- Production: 1000x

Đây là quy tắc kinh nghiệm, không phải định luật chính xác, nhưng xu hướng là có thật. Một mức thuế VAT sai được phát hiện khi đọc yêu cầu chỉ tốn một email. Cùng lỗi đó phát hiện sau khi ra mắt nghĩa là phải sửa code, test lại, triển khai lại, điều chỉnh hàng nghìn hóa đơn và xin lỗi khách hàng.

> **Hiểu lầm thường gặp:** kiểm thử không thể chứng minh phần mềm *không có* bug — nó chỉ có thể cho thấy bug đang tồn tại. Kiểm thử mọi khả năng đầu vào là điều không thể, nên tester chọn những phép kiểm tra quan trọng nhất.

---

## 2. Các cấp độ kiểm thử

Kiểm thử diễn ra ở các **cấp độ** khác nhau, từ mảnh nhỏ nhất đến toàn bộ hệ thống. Hãy nghĩ đến việc sản xuất ô tô: bạn kiểm tra từng con ốc và bugi, rồi đến động cơ đã lắp ráp, rồi cả chiếc xe trên đường thử, và cuối cùng người mua lái thử.

### Unit Test
- Test từng function/module **nhỏ nhất** một cách riêng lẻ.
- Do developer viết.
- Nhanh, chạy nhiều lần.
- Ví dụ: test function tính thuế VAT.

**Function** (hàm) là một đoạn code nhỏ có tên, làm một việc. "Riêng lẻ" nghĩa là hàm được test một mình; mọi thứ nó phụ thuộc vào (database, một service khác) được thay bằng một bản giả gọi là **mock**.

### Integration Test
- Test **sự kết hợp** của nhiều module/service.
- Kiểm tra các interface và luồng dữ liệu giữa các phần.
- Ví dụ: test API đặt hàng có kết nối đúng với database không.

**Interface** (giao diện kết nối) là cách hai phần đã thống nhất để nói chuyện với nhau. Từng phần có thể chạy tốt khi đứng riêng nhưng lỗi khi ghép lại — ví dụ một bên gửi ngày dạng "02/10/2026" còn bên kia lại chờ "2026-10-02".

### System Test
- Test **toàn bộ hệ thống** như một đơn vị.
- End-to-end scenarios.
- Gần với môi trường production.

Tester coi hệ thống như một **black box** (hộp đen): dùng nó từ bên ngoài như người dùng, không nhìn vào code. Việc này thường chạy trên môi trường **staging** — một bản sao của hệ thống thật. **Production** là hệ thống thật mà người dùng đang dùng.

### UAT (User Acceptance Testing)
- Người dùng thực tế hoặc khách hàng test.
- Xác nhận hệ thống đáp ứng business requirements.
- Bước cuối trước khi go-live.

UAT không phải bài test kỹ thuật. BA thường chuẩn bị kịch bản UAT từ yêu cầu và acceptance criteria, hỗ trợ người dùng trong lúc họ test, và ghi lại các vấn đề họ phát hiện — nhưng chính người dùng mới là người quyết định có chấp nhận hệ thống hay không.

### Regression Test
- Sau mỗi thay đổi, test lại toàn bộ để đảm bảo không làm hỏng những gì đã hoạt động.
- Thường được tự động hóa.

Nói chính xác, regression là một **loại** kiểm thử có thể làm ở bất kỳ cấp độ nào, nhưng vì nó quá quan trọng nên được liệt kê ở đây. Ví dụ đời thường: thợ điện sửa đèn bếp cho bạn, và bạn kiểm tra luôn xem quạt thông gió trong nhà tắm còn chạy không.

```text
Unit        → Integration         → System        → UAT               → Go-live
(từng phần)   (các phần ghép lại)   (cả ứng dụng)   (người dùng thật)
               ↑ regression test được chạy lại sau mỗi thay đổi ↑
```

---

## 3. Các loại kiểm thử

**Cấp độ** cho biết bạn test một mảnh *lớn cỡ nào*. **Loại** cho biết bạn đang kiểm tra *phẩm chất gì*. Một loại có thể được làm ở nhiều cấp độ.

### Functional vs non-functional

| Nhóm | Câu hỏi nó trả lời | Ví dụ |
|------|--------------------|-------|
| **Functional** (chức năng) | Nó có làm đúng việc không? | Đăng nhập được, giảm giá được áp dụng, email được gửi |
| **Non-functional** (phi chức năng) | Nó làm tốt đến mức nào? | Tốc độ, bảo mật, dễ dùng, tương thích |

Các loại phi chức năng thường gặp:

- **Performance / load testing** (hiệu năng / tải) — cửa hàng có còn phản hồi trong 2 giây khi 5.000 người mua cùng lúc không?
- **Security testing** (bảo mật) — có ai xem được đơn hàng của khách khác chỉ bằng cách đổi một con số trên thanh địa chỉ không?
- **Usability testing** (tính dễ dùng) — người dùng lần đầu có tìm được nút "thanh toán" mà không cần ai hướng dẫn không?
- **Compatibility testing** (tương thích) — nó có chạy trên Chrome, Safari, một chiếc điện thoại Android cũ, màn hình nhỏ không?
- **Accessibility testing** (khả năng tiếp cận) — người dùng trình đọc màn hình hoặc chỉ dùng bàn phím có sử dụng được không?

### Những thuật ngữ khác bạn sẽ nghe

| Thuật ngữ | Ý nghĩa |
|-----------|---------|
| **Black-box** testing | Kiểm thử từ bên ngoài, chỉ dựa vào đầu vào và đầu ra, không nhìn code |
| **White-box** testing | Kiểm thử khi biết code bên trong (chủ yếu do developer làm) |
| **Smoke test** | Kiểm tra nhanh các chức năng cơ bản nhất sau mỗi bản build mới — "nó có bật lên được không?" |
| **Exploratory testing** | Vừa tìm hiểu vừa kiểm thử, không theo kịch bản, dựa vào kinh nghiệm và sự tò mò |
| **Retesting** | Kiểm tra xem một bug cụ thể đã báo đã được sửa chưa |
| **Regression testing** | Kiểm tra xem bản sửa (hay bất kỳ thay đổi nào) có làm hỏng thứ khác không |

> **Hiểu lầm thường gặp:** retesting và regression testing không giống nhau. Retesting hỏi "bug *này* đã hết chưa?"; regression hỏi "có thứ gì *khác* bị hỏng không?"

---

## 4. Test Pyramid

```text
         ┌─────────────┐
         │     E2E     │ ← Ít, chậm, đắt
         ├─────────────┤
         │ Integration │
         ├─────────────┤
         │  Unit Test  │ ← Nhiều, nhanh, rẻ
         └─────────────┘
```

Nguyên tắc: nhiều unit test (nhanh, rẻ) + ít E2E test (chậm, đắt).

Test **E2E** (end-to-end, đầu-cuối) điều khiển toàn bộ ứng dụng như người dùng — mở trình duyệt, đăng nhập, thêm vào giỏ, thanh toán. Chúng cho độ tin cậy cao nhưng chậm (mỗi bài mất vài phút), dễ hỏng khi một nút bị dời chỗ, và khi thất bại thì không cho biết *phần nào* sai. Unit test chạy trong vài mili giây và chỉ thẳng vào hàm bị lỗi.

Ví dụ đời thường: kiểm tra phanh ô tô trên bàn thử thì nhanh và chính xác; lái cả chiếc xe đi 100 km để biết cùng điều đó thì chậm và tốn kém. Bạn vẫn đi đường thử — chỉ là ít hơn, cho những hành trình quan trọng nhất.

Hình dạng ngược lại — nhiều E2E test và ít unit test — gọi là **ice-cream-cone anti-pattern** (phản mẫu cây kem ốc quế): chậm, dễ vỡ và tốn công bảo trì.

---

## 5. Bug Lifecycle (Vòng đời bug)

Một bug đi qua một loạt trạng thái trong công cụ theo dõi như Jira, từ lúc được báo cáo cho đến khi được đóng.

```text
New → Assigned → In Progress → Fixed → Testing → Verified → Closed
                                  ↑                ↓
                              Re-opened ←── Failed
```

| Trạng thái | Ý nghĩa |
|-----------|---------|
| New | Bug vừa được báo cáo |
| Assigned | Đã giao cho developer |
| In Progress | Developer đang sửa |
| Fixed | Developer đã sửa xong, chờ xác minh |
| Testing | QA đang test lại |
| Verified | QA xác nhận đã sửa |
| Closed | Đóng bug |
| Re-opened | QA phát hiện bug vẫn còn → mở lại |
| Won't Fix | Quyết định không sửa (ảnh hưởng thấp) |

### Ai chuyển trạng thái bug

- **Developer** có thể chuyển bug đến *Fixed*, nhưng **không** tự đóng nó. QA phải xác minh bản sửa trước — đây là một cửa kiểm soát chất lượng quan trọng.
- Nếu test lại thất bại, QA chuyển sang *Re-opened* và ghi bình luận giải thích điều gì vẫn còn sai.
- *Won't Fix* là một **quyết định kinh doanh**, thường do PO hoặc PM đưa ra, không phải developer: chi phí sửa lớn hơn lợi ích (ít người bị ảnh hưởng, có cách làm khác dễ dàng, tính năng sắp bị gỡ bỏ).

Các trạng thái khác bạn có thể gặp: **Duplicate** (đã có người báo), **Cannot Reproduce** (developer không làm bug xảy ra lại được), **Not a Bug / Works as Designed** (phần mềm chạy đúng như đặc tả — đôi khi điều này để lộ một yêu cầu chưa rõ mà BA cần làm rõ).

---

## 6. Viết test case

**Test case** (ca kiểm thử) là một "công thức" viết ra cho một phép kiểm tra: cần chuẩn bị gì, làm gì, và điều gì phải xảy ra. Giống công thức nấu ăn, ai làm theo cũng phải ra cùng kết quả — để một tester mới có thể chạy nó vào năm sau mà không cần hỏi ai.

Test case xuất phát từ **yêu cầu và acceptance criteria**, không phải từ code. Test viết ra bằng cách đọc code chỉ xác nhận rằng code làm đúng những gì nó đang làm; chúng không bao giờ phát hiện được một tính năng bị thiếu hoàn toàn.

### Một ví dụ đầy đủ

Yêu cầu (user story): *"Là khách hàng, tôi muốn nhập mã giảm giá khi thanh toán để trả ít tiền hơn."* Một acceptance criterion: *"Mã SAVE10 giảm 10% cho đơn hàng từ 200.000 VND trở lên."*

| Trường | Nội dung |
|--------|----------|
| **ID** | TC-CHK-012 |
| **Tiêu đề** | Mã giảm giá hợp lệ SAVE10 giảm 10% cho đơn hàng đủ điều kiện |
| **Yêu cầu** | US-145 "Áp dụng mã giảm giá", AC #2 |
| **Điều kiện tiên quyết** | Đăng nhập bằng user test `buyer01`; giỏ hàng có 1 × "Đèn bàn" giá 250.000 VND; mã SAVE10 đang hoạt động |
| **Dữ liệu test** | Mã giảm giá: `SAVE10` |
| **Các bước** | 1. Mở trang giỏ hàng. 2. Bấm "Thanh toán". 3. Gõ `SAVE10` vào ô "Mã giảm giá". 4. Bấm "Áp dụng". |
| **Kết quả mong đợi** | Hiện thông báo "Đã áp dụng mã"; dòng giảm giá hiển thị −25.000 VND; tổng tiền đổi từ 250.000 thành 225.000 VND |
| **Kết quả thực tế** | *(điền khi thực thi)* |
| **Trạng thái** | Pass / Fail / Blocked |

### Không chỉ "happy path"

**Happy path** là kịch bản bình thường, mọi thứ diễn ra suôn sẻ. Tester giỏi còn viết ca kiểm thử cho các trường hợp biên:

- Đơn hàng đúng 200.000 VND (giá trị biên) → được giảm giá.
- Đơn hàng 199.999 VND → thông báo "Đơn tối thiểu 200.000 VND".
- Gõ mã bằng chữ thường `save10` → theo yêu cầu (hỏi BA nếu chưa rõ!).
- Mã đã hết hạn → thông báo "Mã này đã hết hạn".
- Để trống ô rồi bấm "Áp dụng" → nút bị vô hiệu hóa hoặc có thông báo rõ ràng.

> **Hiểu lầm thường gặp:** test case không phải là "kiểm tra xem giảm giá có chạy không". Nó phải có các bước chính xác, dữ liệu chính xác và một kết quả mong đợi chính xác, nếu không hai tester sẽ kiểm tra hai thứ khác nhau.

---

## 7. Bug Report tốt

Khi một test thất bại, tester viết **bug report** (báo cáo lỗi, còn gọi là defect report hay ticket). Nhiệm vụ của nó là giúp một developer chưa từng thấy vấn đề **tái hiện** được nó — làm nó xảy ra lại trên máy của họ. Nếu không tái hiện được, rất khó để sửa.

Bug report cần có:
1. **Title**: ngắn gọn, mô tả rõ vấn đề.
2. **Environment**: môi trường (browser, OS, version).
3. **Steps to Reproduce**: các bước tái hiện.
4. **Expected Result**: kết quả mong đợi.
5. **Actual Result**: kết quả thực tế.
6. **Severity**: mức độ nghiêm trọng.
7. **Priority**: mức độ ưu tiên xử lý.
8. **Attachment**: screenshot, video, log.

### Một ví dụ đầy đủ

```text
ID:               BUG-2318
Tiêu đề:          Tổng tiền không giảm sau khi áp dụng mã hợp lệ SAVE10
Người báo:        Lan (QA)            Ngày: 2026-10-02
Môi trường:       Staging, bản web 3.4.1
                  Chrome 129 trên Windows 11; cũng gặp trên Safari 18 / macOS 15
Test case:        TC-CHK-012
Điều kiện tiên quyết:
  Đăng nhập bằng buyer01; giỏ hàng = 1 × "Đèn bàn" (250.000 VND)
Các bước tái hiện:
  1. Mở trang giỏ hàng và bấm "Thanh toán"
  2. Nhập SAVE10 vào ô "Mã giảm giá"
  3. Bấm "Áp dụng"
Kết quả mong đợi:
  Hiện thông báo "Đã áp dụng mã"; dòng giảm giá −25.000 VND; tổng 225.000 VND
Kết quả thực tế:
  Thông báo "Đã áp dụng mã" có hiện, nhưng không có dòng giảm giá
  và tổng tiền vẫn là 250.000 VND. Xảy ra 5/5 lần thử.
Severity:         High (chức năng thanh toán cốt lõi tính sai số tiền)
Priority:         High (chiến dịch khuyến mãi bắt đầu thứ Hai)
Đính kèm:         screenshot-total.png, screen-recording.mp4,
                  console-error.txt ("TypeError: discount is undefined")
```

Hãy để ý những gì nó **không** chứa: phỏng đoán xem code của ai sai, hay những câu như "lại hỏng nữa rồi". Bug report đánh giá **sản phẩm**, không bao giờ đánh giá con người.

> **Tự thử nhé:** tập thu thập bằng chứng trên bất kỳ trang web nào.
> - **Chụp màn hình:** Windows `Win + Shift + S`; macOS `Cmd + Shift + 4`. **Quay màn hình:** Windows `Win + Alt + R` (Xbox Game Bar); macOS `Cmd + Shift + 5`.
> - **Phiên bản trình duyệt:** trong Chrome, gõ `chrome://version` vào thanh địa chỉ — dòng đầu tiên là số phiên bản.
> - **Phiên bản hệ điều hành:** Windows — nhấn `Win + R`, gõ `winver`, nhấn Enter; macOS — menu Apple → *About This Mac* (Giới thiệu về máy Mac này).
> - **Lỗi trong Console:** nhấn `F12` (Windows) hoặc `Cmd + Option + I` (macOS), mở tab **Console**. Những dòng màu đỏ là lỗi mà developer rất muốn thấy trong bug report. Trang chạy bình thường có thể không có dòng đỏ nào — điều đó hoàn toàn ổn.

---

## 8. Severity vs Priority

| | Severity (Mức độ nghiêm trọng kỹ thuật) | Priority (Ưu tiên xử lý) |
|--|-------------------------------------|--------------------------|
| **Critical** | App crash, mất dữ liệu | Sửa ngay lập tức |
| **High** | Chức năng chính không hoạt động | Sửa trong sprint này |
| **Medium** | Có workaround | Sửa sprint tới |
| **Low** | UI lệch 1 pixel | Sửa khi có thời gian |

Severity ≠ Priority. Ví dụ: bug nhỏ (severity thấp) nhưng CEO vừa thấy → priority critical.

### Hai câu hỏi khác nhau

- **Severity** hỏi: *hệ thống hỏng nặng đến đâu?* Đây là đánh giá kỹ thuật, thường do tester đặt. **Workaround** là một cách khác để người dùng vẫn làm xong việc trong khi bug còn tồn tại.
- **Priority** hỏi: *phải sửa sớm đến mức nào?* Đây là quyết định kinh doanh, thường do PO hoặc PM đặt hoặc xác nhận.

Ví dụ đời thường: ở bệnh viện, gãy chân nghiêm trọng hơn đứt tay (severity), nhưng vết đứt tay của bác sĩ phẫu thuật sắp mổ trong mười phút nữa lại được xử lý trước (priority).

### Bốn tổ hợp

| | Priority thấp | Priority cao |
|--|---------------|--------------|
| **Severity cao** | App bị crash, nhưng chỉ với một khách hàng nhỏ trên một cấu hình hiếm gặp | Thanh toán thất bại với mọi người dùng |
| **Severity thấp** | Lỗi chính tả trên một trang gần như không ai vào | Tên công ty bị viết sai trên trang chủ |

---

## 9. Manual vs Automated Testing

**Manual testing** (kiểm thử thủ công) nghĩa là một người bấm qua ứng dụng và tự đánh giá kết quả. **Automated testing** (kiểm thử tự động) nghĩa là viết một chương trình (**test script**) tự thực hiện các bước và tự kiểm tra kết quả, dùng các công cụ như Selenium, Playwright hay Cypress.

| | Manual | Automated |
|--|--------|-----------|
| **Phù hợp** | Exploratory, UAT, UI/UX | Regression, unit, performance |
| **Chi phí ban đầu** | Thấp | Cao (phải viết script) |
| **Tốc độ** | Chậm | Nhanh |
| **Độ chính xác** | Có thể sai sót | Nhất quán |

### Chọn cái nào

Ví dụ đời thường: máy rửa bát rất tuyệt cho những chiếc đĩa giống nhau mỗi tối (tự động hóa cho các kiểm tra regression lặp lại), nhưng bạn vẫn tự nếm nước sốt (con người đánh giá xem một màn hình có *cảm giác* đúng không).

- **Tự động hóa** những test chạy thường xuyên và ít thay đổi: bộ regression sau mỗi lần deploy, unit test sau mỗi lần commit code, performance test với hàng nghìn người dùng giả lập.
- **Giữ thủ công** những gì cần con người phán đoán hoặc chỉ làm một lần: exploratory testing, tính dễ dùng và giao diện, UAT, tính năng hoàn toàn mới mà thiết kế vẫn đang thay đổi.

> **Hiểu lầm thường gặp:** tự động hóa không thay thế tester. Vẫn phải có người quyết định test cái gì, viết và bảo trì script, và điều tra khi test thất bại. Script cũng chỉ kiểm tra những gì nó được dặn — còn con người thì nhận ra trang "trông có gì đó sai sai".

---

## 10. Tóm tắt

- **Unit Test**: module nhỏ nhất, developer viết.
- **Integration Test**: kết hợp các module.
- **System Test**: toàn bộ hệ thống, end-to-end, gần với production.
- **UAT**: người dùng thực tế xác nhận.
- **Regression**: test lại sau mỗi thay đổi.
- **Loại kiểm thử** (chức năng, hiệu năng, bảo mật, dễ dùng…) cho biết kiểm tra *phẩm chất gì*; **cấp độ** cho biết mảnh *lớn cỡ nào*.
- Theo **test pyramid**: nhiều unit test, ít E2E test.
- **Test case** có điều kiện tiên quyết, các bước, dữ liệu và kết quả mong đợi chính xác, và xuất phát từ yêu cầu.
- **Bug report** tốt = có steps to reproduce rõ ràng.
- Chỉ QA đóng bug sau khi xác minh bản sửa; Won't Fix là quyết định kinh doanh.
- **Severity** ≠ **Priority** — phân biệt để ưu tiên đúng.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|---------------|
| Defect / Bug | Chỗ phần mềm không hoạt động như yêu cầu |
| QA | Quality Assurance — con người và cách làm giúp giữ chất lượng cao |
| Test case | "Công thức" viết sẵn cho một phép kiểm tra, có kết quả mong đợi |
| Bug report | Ticket giúp developer tái hiện và sửa một vấn đề |
| Steps to reproduce | Các thao tác chính xác làm bug xảy ra lại |
| UAT | Người dùng thật xác nhận hệ thống đáp ứng nhu cầu kinh doanh |
| Regression | Thứ trước đây chạy tốt nay bị hỏng do một thay đổi |
| Severity | Hệ thống hỏng nặng đến đâu (kỹ thuật) |
| Priority | Phải sửa sớm đến mức nào (kinh doanh) |
| Staging / Production | Bản sao để test của hệ thống / hệ thống thật người dùng đang dùng |
