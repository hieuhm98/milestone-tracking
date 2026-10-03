# Bảo mật cơ bản

## 1. Tại sao bảo mật quan trọng?

Một lỗ hổng bảo mật có thể dẫn đến: lộ dữ liệu người dùng, mất tiền, mất uy tín, vi phạm pháp luật. BA/PM cần hiểu cơ bản để đặt yêu cầu bảo mật đúng và đánh giá rủi ro.

**Lỗ hổng** (vulnerability) là một điểm yếu — giống một cửa sổ khóa không chặt. Kẻ trộm không cần phá cửa chính nếu có một ô cửa sổ đang mở.

Hai sự thật khiến hầu hết người mới bất ngờ:

- **Tấn công phần lớn là tự động.** Tội phạm chạy các chương trình thử hàng triệu mật khẩu, website và số điện thoại mỗi ngày. Bạn không cần nổi tiếng hay giàu có mới thành mục tiêu — chỉ cần bạn "với tới được".
- **Con người là cánh cửa dễ mở nhất.** Rất nhiều vụ xâm nhập chẳng "hack" gì cả. Chúng chỉ lừa một người gõ mật khẩu hoặc đọc to một mã dùng một lần.

Vì vậy bảo mật có hai nửa, và bài này nói về cả hai: cách **hệ thống** được bảo vệ (điều dev và BA quan tâm), và cách **bạn** giữ an toàn hằng ngày (mật khẩu, lừa đảo, Wi-Fi, cập nhật).

---

## 2. Authentication vs Authorization

Đây là hai khái niệm hay bị nhầm lẫn:

| | Authentication (Xác thực) | Authorization (Phân quyền) |
|--|--------------------------|---------------------------|
| **Câu hỏi** | Bạn là ai? | Bạn được làm gì? |
| **Ví dụ** | Đăng nhập bằng mật khẩu | Admin thấy mọi thứ, user chỉ thấy dữ liệu của mình |
| **Khi nào** | Trước tiên | Sau authentication |

**Hình dung — khách sạn:** ở quầy lễ tân bạn xuất trình CCCD; đó là **authentication** (chứng minh bạn là ai). Bạn nhận một thẻ từ mở được phòng 504 và phòng gym, nhưng không mở được phòng 505 hay phòng nhân viên; đó là **authorization** (bạn được làm gì).

**Ví dụ thực tế**: Bạn đăng nhập Shopee (authentication) → bạn chỉ xem được đơn hàng của mình, không xem của người khác (authorization).

Các cách chứng minh bạn là ai chia thành ba loại, gọi là **yếu tố** (factor):

| Yếu tố | Nghĩa đơn giản | Ví dụ |
|--------|----------------|-------|
| Thứ bạn **biết** | Một bí mật trong đầu | Mật khẩu, mã PIN |
| Thứ bạn **có** | Một vật bạn mang theo | Điện thoại nhận mã, thẻ ngân hàng |
| Thứ bạn **là** | Cơ thể bạn | Vân tay, Face ID |

> **Hiểu lầm thường gặp:** "Đăng nhập được là làm gì cũng được." Không — đăng nhập chỉ trả lời câu hỏi bạn *là ai*. Người dùng đăng nhập thành công nhưng vẫn gặp "Không có quyền truy cập" ở một trang là gặp vấn đề **authorization**, không phải vấn đề đăng nhập.

---

## 3. Các mối đe dọa phổ biến

Có kiểu tấn công nhắm vào **hệ thống**; có kiểu nhắm vào **con người**. Ba kiểu đầu dưới đây là lỗi dev phải ngăn chặn; phishing thì nhắm thẳng vào bạn.

### SQL Injection
**Database** (cơ sở dữ liệu) lưu dữ liệu của app; các chương trình nói chuyện với nó bằng một ngôn ngữ gọi là **SQL**. Kẻ tấn công nhập code SQL vào form để can thiệp vào database:

```sql
-- Form đăng nhập nhập: ' OR '1'='1
SELECT * FROM users WHERE username='' OR '1'='1' AND password=''
-- Kết quả: trả về TẤT CẢ users → bỏ qua mật khẩu!
```

Hình dung: phiếu ngân hàng ghi "Trả cho: ____". Kẻ gian viết "Tôi, và tiện thể mở luôn két sắt", và một nhân viên cẩu thả làm theo cả dòng đó như một mệnh lệnh. Cách sửa là luôn coi những gì người dùng gõ là *dữ liệu*, không bao giờ là *mệnh lệnh*.

**Phòng chống**: dùng Prepared Statements, không ghép string trực tiếp vào SQL.

### XSS (Cross-Site Scripting)
Kẻ tấn công nhúng JavaScript độc hại vào trang web, chạy trong browser của nạn nhân để ăn cắp cookie/session.

Ví dụ: ô bình luận nhận cả code thay vì chỉ chữ thường. Mọi người xem bình luận đó đều chạy code của kẻ tấn công. **Cookie / session** là thứ giữ cho bạn ở trạng thái đăng nhập, nên đánh cắp nó giống như lấy trộm thẻ phòng khách sạn của bạn.

**Phòng chống**: escape output, Content Security Policy (CSP). "Escape" nghĩa là hiển thị mọi thứ người dùng gõ dưới dạng chữ vô hại.

### CSRF (Cross-Site Request Forgery)
Trick người dùng thực hiện hành động không mong muốn trên website họ đang đăng nhập.

Ví dụ: bạn đang đăng nhập ngân hàng ở một tab, rồi mở một trang có bẫy ở tab khác; trang đó âm thầm gửi lệnh "chuyển tiền" tới ngân hàng bằng phiên đăng nhập của bạn.

**Phòng chống**: CSRF token, SameSite cookie.

### Phishing
Giả mạo email/website hợp lệ để lừa người dùng nhập thông tin.

**Phòng chống**: kiểm tra URL, không click link lạ, 2FA. Vì phishing là mối đe dọa bạn sẽ gặp trực tiếp nhiều nhất, mục tiếp theo dành riêng cho nó.

---

## 4. Lừa đảo phishing ngoài đời thực

"Phishing" đọc giống "fishing" (câu cá): kẻ lừa đảo thả mồi và chờ có người cắn câu. Nó đến qua email, SMS, Zalo/Messenger, cuộc gọi và website giả.

### Ví dụ điển hình

- **SMS ngân hàng giả:** *"Tài khoản của bạn sẽ bị khóa trong 24 giờ. Xác minh tại bank-secure-verify.xyz"* — đường link dẫn tới một bản sao trang đăng nhập của ngân hàng.
- **Giao hàng giả:** *"Bưu kiện của bạn đang bị giữ, thanh toán phí 15.000đ tại đây"* — trang đó hỏi số thẻ của bạn.
- **Email sếp giả:** *"Anh đang họp, em mua gấp 5 thẻ quà tặng rồi gửi mã cho anh."*
- **Cuộc gọi hỗ trợ giả:** *"Chúng tôi gọi từ ngân hàng. Chúng tôi vừa gửi mã để hủy một giao dịch đáng ngờ, anh/chị đọc giúp mã đó."* Thực ra chính mã đó là thứ cho phép giao dịch.

### Dấu hiệu cảnh báo

1. **Gấp gáp hoặc đe dọa:** "trong 24 giờ", "tài khoản bị khóa", "liên quan vụ án".
2. **Một đường link hoặc file đính kèm** bạn không hề chờ đợi.
3. **Địa chỉ web gần đúng:** `faceb00k.com`, `mybank.com.secure-login.xyz`. Hãy đọc địa chỉ từ cuối lên: tên thật của trang là phần nằm ngay trước `.com`, `.vn`…
4. **Hỏi bí mật:** mật khẩu, mã OTP, số thẻ đầy đủ. Ngân hàng thật không bao giờ hỏi OTP qua điện thoại, SMS hay tin nhắn chat.

### Nên làm gì

- Đừng bấm. Mở app chính thức, hoặc tự gõ địa chỉ web.
- Gọi lại cho tổ chức đó bằng số in trên thẻ hoặc trên website chính thức — không bao giờ dùng số trong tin nhắn.
- Ở công ty, báo cho bộ phận IT. Nếu đã lỡ gõ mật khẩu, đổi ngay và báo IT; nếu đã đưa thông tin thẻ, gọi ngân hàng để khóa thẻ.

> **Ví dụ thực tế trong công việc:** một email "từ giám đốc" yêu cầu kế toán đổi số tài khoản ngân hàng của nhà cung cấp trước đợt thanh toán hôm nay. Một cuộc gọi tới số quen của giám đốc đã lật tẩy vụ lừa — nhiều công ty bắt buộc phải gọi lại xác nhận như vậy.

---

## 5. HTTPS và mã hóa

- **HTTPS** mã hóa dữ liệu truyền tải — kẻ nghe lén không đọc được.
- **TLS certificate** xác nhận website là đúng (không phải fake).
- Tất cả website xử lý dữ liệu nhạy cảm **bắt buộc phải dùng HTTPS**.

**Mã hóa** (encryption) là xáo trộn thông điệp để chỉ người nhận đúng mới giải được. Hình dung: gửi bưu thiếp (HTTP — người đưa thư nào cũng đọc được) so với gửi một chiếc hộp khóa mà chỉ cửa hàng mở được (HTTPS). Dữ liệu đi qua rất nhiều máy — router Wi-Fi, nhà mạng và hơn thế nữa — nên nếu không mã hóa, bất kỳ máy nào trong số đó cũng có thể đọc được.

**Ổ khóa nghĩa là gì — và không nghĩa là gì:** biểu tượng ổ khóa (hoặc biểu tượng thông tin trang) cạnh thanh địa chỉ chỉ cho biết *kết nối tới địa chỉ này được mã hóa*. Nó **không** nói rằng trang web trung thực. Kẻ lừa đảo cũng có thể lấy chứng chỉ cho `bank-secure-verify.xyz`. Luôn kiểm tra chính địa chỉ web.

> **Tự thử:** trên một trang `https://` bất kỳ, bấm biểu tượng ở bên trái thanh địa chỉ. Bạn sẽ thấy dòng "Kết nối an toàn" (Connection is secure) và có thể xem chứng chỉ cùng đơn vị cấp.

### Wi-Fi công cộng

Wi-Fi ở quán cà phê hay sân bay được dùng chung với người lạ. HTTPS mã hóa phần lớn dữ liệu, nhưng một điểm phát giả có tên rất thuyết phục ("Airport_Free_WiFi") vẫn là rủi ro. Thói quen hợp lý:

- Hỏi nhân viên tên mạng chính xác.
- Dùng dữ liệu di động hoặc phát Wi-Fi từ điện thoại khi vào ngân hàng và hệ thống công ty.
- Dùng **VPN** của công ty (công cụ đưa toàn bộ dữ liệu của bạn đi qua một "đường hầm" được mã hóa) nếu công ty có cung cấp.

---

## 6. Password Security

**Không lưu mật khẩu plain text** — phải hash:

```text
Mật khẩu: "mypassword123"
Sau khi hash bcrypt: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/L..."
```

**Hash** là xáo trộn một chiều: biến mật khẩu thành mã thì dễ, biến mã ngược lại thành mật khẩu thì gần như không thể. Hình dung: bạn xay trái cây thành sinh tố được, nhưng không biến sinh tố trở lại thành trái cây. Khi đăng nhập, hệ thống hash thứ bạn gõ rồi so sánh hai mã. Đó cũng là lý do một trang web được xây dựng tốt chỉ có thể *đặt lại* mật khẩu, không bao giờ gửi lại mật khẩu cũ cho bạn.

**Best practices cho người dùng:**
- Mật khẩu dài (≥12 ký tự), phức tạp.
- Không dùng chung mật khẩu cho nhiều tài khoản.
- Dùng Password Manager (1Password, Bitwarden).
- Bật **2FA (Two-Factor Authentication)**.

### Vì sao từng quy tắc quan trọng

- **Độ dài quan trọng hơn mẹo.** `P@ssw0rd!` vừa ngắn vừa là một trong những thứ kẻ tấn công đoán đầu tiên. Một **cụm mật khẩu** (passphrase) gồm bốn từ ngẫu nhiên — `lamp-river-mango-seven` — dài hơn, mạnh hơn và dễ nhớ hơn.
- **Dùng lại mật khẩu là nguy hiểm nhất.** Khi một website nào đó bị hack, tội phạm lấy email + mật khẩu bị lộ để thử vào email, ngân hàng, mạng xã hội. Một lần lộ mở ra mọi thứ. Kiểu tấn công này gọi là **credential stuffing**.
- **Password manager** (trình quản lý mật khẩu) là app nhớ giúp bạn một mật khẩu mạnh khác nhau cho từng trang, được bảo vệ bằng một mật khẩu chính. Nó chỉ tự điền mật khẩu trên đúng địa chỉ trang thật, nên còn giúp chống trang phishing.

> **Tự thử:** vào `https://haveibeenpwned.com` và nhập địa chỉ email của bạn. Trang sẽ liệt kê các vụ rò rỉ dữ liệu đã biết có chứa email đó. Nếu có, hãy đổi mật khẩu ở trang đó và ở mọi nơi bạn đã dùng lại mật khẩu ấy.

---

## 7. 2FA (Two-Factor Authentication)

2FA yêu cầu **hai bằng chứng** để đăng nhập:
1. Thứ bạn **biết**: mật khẩu.
2. Thứ bạn **có**: OTP từ app (Google Authenticator) hoặc SMS.

Ngay cả khi mật khẩu bị lộ, không có OTP → không đăng nhập được.

**OTP** (one-time password — mật khẩu dùng một lần) là một mã ngắn, thường 6 chữ số, chỉ dùng được một lần và hết hạn sau vài phút. Hình dung: tòa nhà đòi cả chìa khóa *và* một mã số đổi mỗi 30 giây. Kẻ trộm có chìa khóa sao chép vẫn không vào được.

| Yếu tố thứ hai | Cách hoạt động | Độ mạnh |
|----------------|----------------|---------|
| Mã SMS | Mã gửi qua tin nhắn | Hơn là không có; SIM có thể bị chiếm |
| App xác thực | Mã được tạo ngay trên điện thoại | Mạnh hơn; dùng được khi không có mạng |
| Passkey / khóa bảo mật | Điện thoại hoặc khóa USB xác nhận bằng vân tay hoặc PIN | Mạnh nhất; chống được phishing |

Quy tắc vàng: **OTP là để chính bạn gõ vào trang thật, không bao giờ để nói cho ai.** Nếu ai đó hỏi mã — kể cả xưng là "ngân hàng" — đó là lừa đảo.

Hãy bật 2FA trước hết cho **email** (vì email có thể dùng để đặt lại mọi mật khẩu khác), rồi tới ngân hàng, rồi mạng xã hội. Thường nằm ở mục *Cài đặt → Bảo mật*.

---

## 8. Thói quen an toàn hằng ngày

Phần lớn sự bảo vệ đến từ vài thói quen nhàm chán.

- **Cập nhật sớm.** Bản cập nhật vá những lỗ hổng đã bị công khai — kẻ tấn công chủ động tìm thiết bị chưa vá. Windows: *Settings → Windows Update*; macOS: *System Settings → General → Software Update*; điện thoại: *Cài đặt → Cập nhật phần mềm*. Hãy bật cập nhật tự động.
- **Chỉ cài app từ kho chính thức** (App Store, Google Play, Microsoft Store) hoặc website của chính hãng. Phần mềm "crack" là nơi ẩn náu ưa thích của mã độc.
- **Khóa màn hình.** Dùng PIN hoặc vân tay trên điện thoại; trên laptop công ty, bấm `Win + L` (Windows) hoặc `Ctrl + Cmd + Q` (macOS) khi rời chỗ.
- **Sao lưu file quan trọng** lên cloud hoặc ổ cứng rời. **Ransomware** — mã độc khóa file của bạn rồi đòi tiền chuộc — bớt đáng sợ hơn nhiều nếu bạn có bản sao.
- **Nghĩ trước khi chia sẻ.** Đừng đăng ảnh CCCD, thẻ lên máy bay, hay màn hình công việc có dữ liệu khách hàng.

> **Hiểu lầm thường gặp:** "Có phần mềm diệt virus là an toàn." Diệt virus có ích, nhưng không thể ngăn bạn gõ mật khẩu vào trang giả hay đọc OTP cho kẻ lừa đảo. Thói quen quan trọng hơn công cụ.

---

## 9. Nguyên tắc Least Privilege

Chỉ cấp quyền **tối thiểu cần thiết** để thực hiện công việc:
- Developer không cần quyền truy cập database production.
- User thường không cần quyền xóa dữ liệu người khác.
- Service A không cần quyền đọc toàn bộ database.

Hình dung: thẻ từ của nhân viên dọn phòng khách sạn mở được các phòng ở tầng của họ, trong ca làm của họ — không mở két sắt, không mở phòng giám đốc. Nếu mất thẻ, thiệt hại có giới hạn.

**Production** là hệ thống đang chạy thật với khách hàng thật. Không cho developer vào đó không phải vì nghi ngờ: nếu laptop hoặc tài khoản của developer bị chiếm, kẻ tấn công vẫn không chạm được vào dữ liệu người dùng thật. Ví dụ: nhân viên kho xem được tồn kho nhưng không xem được bảng lương.

---

## 10. Bảo mật trong dự án — góc nhìn BA/PM

Bảo mật rẻ nhất khi được thiết kế ngay từ đầu; vá thêm sau khi ra mắt có thể đồng nghĩa với xây lại. Khi viết yêu cầu, cần xét:
- Dữ liệu nào là nhạy cảm? (PII: tên, email, CCCD, số điện thoại)
- Ai được xem/sửa/xóa dữ liệu nào? → yêu cầu authorization rõ ràng.
- Cần audit log không? (ai làm gì, lúc mấy giờ)
- Cần mã hóa data at rest không? (dữ liệu lưu trong database)

**PII** (Personally Identifiable Information — thông tin định danh cá nhân) là bất kỳ thông tin nào nhận diện được một người. **Audit log** là cuốn nhật ký hệ thống tự ghi: ai làm gì, trên bản ghi nào, lúc nào. **At rest** là dữ liệu đang nằm trong nơi lưu trữ, khác với **in transit** (đang đi qua mạng, được HTTPS bảo vệ).

### Ví dụ: yêu cầu cho chức năng "Quên mật khẩu"

BA có thể viết:

1. Link đặt lại mật khẩu chỉ gửi tới email đã đăng ký.
2. Link hết hạn sau một thời gian ngắn (ví dụ 15–30 phút) và chỉ dùng được một lần.
3. Màn hình hiện cùng một thông báo dù email có tồn tại hay không ("Nếu email này đã đăng ký, chúng tôi đã gửi link"), để kẻ tấn công không dò được email nào có tài khoản.
4. Sau khi đặt lại, người dùng bị đăng xuất trên các thiết bị khác và nhận email thông báo.
5. Sự kiện được ghi vào audit log.

> **Ví dụ thực tế trong công việc:** khi review, tester ghi: *"Đổi mã đơn hàng trên URL từ 1001 thành 1002 thì xem được đơn của khách khác."* Đây là lỗi authorization — hệ thống kiểm tra bạn đã đăng nhập, nhưng không kiểm tra đơn đó có phải của bạn không. Một yêu cầu rõ ràng ("người dùng chỉ xem được đơn hàng của chính mình") giúp kiểm thử được điều này.

---

## 11. Tóm tắt

- **Authentication** = xác thực danh tính ("Bạn là ai?").
- **Authorization** = phân quyền ("Bạn được làm gì?").
- **SQL Injection/XSS/CSRF**: lỗ hổng phổ biến nhất.
- **Phishing** nhắm vào con người: cảnh giác với sự gấp gáp, link lạ và việc hỏi bí mật; không bao giờ đưa OTP cho ai.
- **HTTPS**: bắt buộc cho mọi website. Ổ khóa nghĩa là "được mã hóa", không phải "đáng tin".
- **Mật khẩu**: dài, mỗi tài khoản một mật khẩu riêng, lưu bằng password manager; hệ thống chỉ lưu bản hash.
- **2FA**: tăng bảo mật tài khoản đáng kể.
- **Thói quen**: cập nhật sớm, cài app từ kho chính thức, khóa màn hình, sao lưu.
- **Least Privilege**: chỉ cấp quyền tối thiểu cần thiết.
- **BA** đưa yêu cầu bảo mật vào từ sớm: dữ liệu nhạy cảm, phân quyền, audit log, quy tắc hết hạn.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa đơn giản |
|-----------|----------------|
| Authentication | Chứng minh bạn là ai |
| Authorization | Bạn được làm gì sau khi đã biết bạn là ai |
| Phishing | Tin nhắn hoặc trang giả lừa bạn đưa ra bí mật |
| HTTPS / mã hóa | Xáo trộn dữ liệu trên đường truyền để chỉ người nhận đọc được |
| Hash | Xáo trộn một chiều, dùng để lưu mật khẩu an toàn |
| 2FA / OTP | Bằng chứng thứ hai, thường là một mã ngắn dùng một lần |
| Password manager | App giữ một mật khẩu mạnh riêng cho từng trang |
| Least privilege | Mỗi người hay hệ thống chỉ có đúng quyền cần dùng |
| PII | Thông tin nhận diện được một người |
