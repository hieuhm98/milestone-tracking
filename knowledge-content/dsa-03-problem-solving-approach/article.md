# Phương pháp giải quyết vấn đề – Từ trang trắng đến code chạy được

## 1. Thuật toán là gì?

**Thuật toán** (algorithm) là một quy trình, hay một chuỗi các bước, để hoàn thành một nhiệm vụ cụ thể. Công thức nấu ăn là một thuật toán; hàm sắp xếp hộp thư theo ngày cũng vậy. Gần như mọi việc khi lập trình — validate form, phân trang, loại bỏ phần tử trùng — đều dính đến thuật toán. Vì thế nó quan trọng:

- Nó là nền tảng của **kỹ năng giải quyết vấn đề** (problem solving) của một developer: biến một yêu cầu mơ hồ thành các bước chính xác mà máy có thể làm theo.
- Nó là trọng tâm của **phỏng vấn kỹ thuật**, nơi bạn nhận một bài toán lạ và một editor trống trơn.

Thuật toán không đồng nhất với code của nó. Cùng một thuật toán có thể viết bằng JavaScript, Python hay pseudocode; thứ định nghĩa nó là **chuỗi các bước**, và ta đánh giá nó trước hết theo tính đúng đắn, sau đó mới đến hiệu năng (Big O, ở bài 1).

---

## 2. Làm sao để giỏi lên?

Có hai hướng bổ trợ cho nhau:

1. **Có một kế hoạch để giải bài toán** — một quy trình lặp lại được mà bạn áp dụng mọi lần, để không bao giờ phải ngồi nhìn trang trắng. Đó là nội dung bài này.
2. **Thành thạo các pattern giải bài phổ biến** — frequency counter, multiple pointers, sliding window, divide and conquer. Đó là nội dung bài tiếp theo.

Quy trình dưới đây không phải công thức thần kỳ "đảm bảo thành công" — nhưng nó thực sự hữu ích. Nó được chuyển thể từ cuốn sách kinh điển *How to Solve It* của nhà toán học George Pólya:

```text
+-------------+   +-------------+   +--------------+   +----------------+   +-----------------+
| 1 Understand| → | 2 Explore   | → | 3 Break it   | → | 4 Solve /      | → | 5 Look back &   |
|  the problem|   |  examples   |   |   down       |   |   simplify     |   |   refactor      |
+-------------+   +-------------+   +--------------+   +----------------+   +-----------------+
       ^                                                                             |
       +------------ an example fails or a new question appears: loop back ----------+
```

Các bước không đi theo đường thẳng tuyệt đối: viết ví dụ thường làm lộ ra chỗ chưa hiểu đề, còn refactor có thể phát hiện bug. Quay lại bước trước là quy trình đang vận hành đúng, không phải thất bại.

---

## 3. Bước 1 – Hiểu bài toán

Trước khi viết bất kỳ dòng code nào, hãy trả lời năm câu hỏi:

1. **Tôi có diễn đạt lại được bài toán bằng lời của mình không?** Nếu chưa giải thích được một cách đơn giản, nghĩa là bạn chưa hiểu.
2. **Input là gì?** Kiểu dữ liệu, kích thước, phạm vi giá trị, có thể rỗng hoặc thiếu không.
3. **Output là gì?** Kiểu và hình dạng kết quả — một số, một mảng mới, sửa trực tiếp mảng cũ, hay một object?
4. **Output có xác định được từ input không?** Tôi đã có đủ thông tin chưa? Có thể bạn chỉ trả lời được câu này khi bắt tay vào giải — không sao, vẫn đáng để hỏi từ sớm.
5. **Nên đặt tên cho các dữ liệu quan trọng thế nào?** Tên tốt (`nums`, `target`, `counts`) giúp việc suy nghĩ và code sau đó rõ ràng hơn.

Trong phỏng vấn, các câu hỏi này trở thành **câu hỏi làm rõ** (clarifying questions) mà bạn hỏi thành tiếng. Người phỏng vấn thường cố tình bỏ bớt chi tiết để xem bạn có nhận ra không.

---

## 4. Hiểu đề trong thực tế: "cộng hai số"

Lấy đề bài đơn giản nhất có thể: *viết hàm nhận hai số và trả về tổng của chúng.* Trông như chẳng có gì để hiểu. Cứ chạy qua năm câu hỏi:

| Câu hỏi | Điều nó làm lộ ra |
|---|---|
| Diễn đạt lại | "Cho hai số, trả về một số bằng tổng của chúng." |
| Input | Chỉ số nguyên hay cả số thực? Lớn cỡ nào? Có thể nhận chuỗi như `"2"` không? Luôn đúng hai tham số? |
| Output | Kiểu `number`? Kiểu `string` cho số cực lớn? Độ chính xác với số thực? |
| Đủ thông tin? | Đủ với số nguyên nhỏ; chưa đủ với số cực lớn hoặc input không hợp lệ. |
| Đặt tên | `add(a, b)` trả về `sum`. |

Mỗi câu hỏi chưa được trả lời đều giấu một bug thật:

```js
0.1 + 0.2;                     // 0.30000000000000004 (floating point)
9007199254740992 + 1;          // 9007199254740992 (past Number.MAX_SAFE_INTEGER)
9007199254740992n + 1n;        // 9007199254740993n (BigInt is exact)
"2" + 3;                       // "23" (string concatenation, not addition)
```

Bài học: kể cả bài toán tầm thường cũng có những quyết định về **kiểu input, phạm vi giá trị và edge case** (trường hợp biên). Làm rõ chúng từ đầu rẻ hơn nhiều so với phát hiện sau khi code đã viết xong.

---

## 5. Bước 2 – Khám phá ví dụ cụ thể

Nghĩ ra ví dụ giúp bạn **hiểu bài toán tốt hơn**, đồng thời cho bạn **phép kiểm tra nhanh** (sanity check) rằng lời giải cuối cùng chạy đúng. Trong công việc thực tế, ví dụ mang hình dạng **user story** và **unit test**.

Đi qua các ví dụ theo thứ tự:

1. **Ví dụ đơn giản** — trường hợp nhỏ nhất cho thấy hành vi cơ bản.
2. **Ví dụ phức tạp hơn** — trường hợp hỗn hợp buộc bạn phải ra quyết định.
3. **Input rỗng** — `""`, `[]`, `{}`: nên trả về gì?
4. **Input không hợp lệ** — `null`, `undefined`, một số thay vì chuỗi: ném lỗi, hay trả về giá trị an toàn?

Ví dụ cũng là cách nhanh nhất để gỡ sự mơ hồ: thay vì hỏi "chữ hoa chữ thường có quan trọng không?", hãy viết `"Hello"` và hỏi "kết quả là `h: 1` hay `H: 1`?"

---

## 6. Ví dụ cho bài "đếm ký tự"

Bài toán xuyên suốt phần còn lại: *viết hàm nhận một chuỗi và trả về số lần xuất hiện của mỗi ký tự trong chuỗi.*

| Input | Output mong đợi | Quyết định mà nó buộc phải đưa ra |
|---|---|---|
| `charCount("aaaa")` | `{ a: 4 }` | Hình dạng cơ bản: một object chứa số đếm |
| `charCount("hello")` | `{ h: 1, e: 1, l: 2, o: 1 }` | Chỉ các ký tự có mặt, không có key giá trị 0 cho phần còn lại của bảng chữ cái |
| `charCount("Hello hi")` | `{ h: 2, e: 1, l: 2, o: 1, i: 1 }` | Không phân biệt hoa thường; bỏ qua dấu cách |
| `charCount("Your PIN is 1234!")` | `{ y: 1, o: 1, u: 1, r: 1, p: 1, i: 2, n: 1, s: 1, 1: 1, 2: 1, 3: 1, 4: 1 }` | Chữ số được đếm, dấu câu thì không |
| `charCount("")` | `{}` | Input rỗng trả về object rỗng |
| `charCount(null)` | ném `TypeError` (hoặc `{}`) | Thống nhất cách xử lý input không hợp lệ |

Vài ví dụ đã biến "đếm mỗi ký tự" thành một đặc tả chính xác: **chỉ chữ cái (viết thường) và chữ số, chỉ các key có mặt, object rỗng cho chuỗi rỗng**. Sau này có thể dán thẳng các ví dụ vào test:

```js
import assert from "node:assert/strict";

assert.deepEqual(charCount("aaaa"), { a: 4 });
assert.deepEqual(charCount("Hello hi"), { h: 2, e: 1, l: 2, o: 1, i: 1 });
assert.deepEqual(charCount(""), {});
```

---

## 7. Bước 3 – Chia nhỏ vấn đề

**Viết ra rõ ràng các bước cần làm** trước khi viết code thật. Việc này buộc bạn nghĩ về logic trước cú pháp và bắt được hiểu lầm khi còn rẻ để sửa. Trong phỏng vấn, nó còn giúp người phỏng vấn chỉnh kế hoạch trước khi bạn mất mười lăm phút code sai hướng.

Viết pseudocode dưới dạng comment là cách hiệu quả:

```js
function charCount(str) {
  // make an object to return at the end
  // loop over the string; for each character:
  //   if the char is a letter/digit AND already a key, add one to its count
  //   if the char is a letter/digit AND not a key yet, add it with a count of 1
  //   if the char is anything else (space, punctuation), do nothing
  // return the object at the end
}
```

Để ý rằng kế hoạch đã trả lời các quyết định từ phần ví dụ. Nếu có bước nào còn mơ hồ ("xử lý mấy ký tự lạ"), đó chính là chỗ khó của bài — và dẫn ta sang bước tiếp theo.

---

## 8. Bước 4 – Giải, hoặc giải một bài đơn giản hơn

Nếu giải được thì giải. **Nếu không giải được, hãy giải một bài toán đơn giản hơn.** Đơn giản hoá (simplify) là một kỹ thuật có chủ đích:

1. **Tìm ra chỗ khó cốt lõi** của việc bạn đang làm.
2. **Tạm thời bỏ qua chỗ khó đó.**
3. **Viết một lời giải đơn giản hoá.**
4. **Sau đó đưa chỗ khó trở lại.**

Với `charCount`, phần rắc rối là chữ hoa/thường và việc xác định ký tự nào là chữ-số (alphanumeric). Bỏ qua cả hai và đếm *mọi* ký tự:

```js
// Simplified: counts every character, case-sensitive
function charCountSimple(str) {
  const result = {};

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (result[char] > 0) {
      result[char]++;
    } else {
      result[char] = 1;
    }
  }

  return result;
}

charCountSimple("Hi!"); // { H: 1, i: 1, "!": 1 }
```

Giờ đưa chỗ khó trở lại — chuyển từng ký tự về chữ thường và bỏ qua mọi thứ không phải chữ cái hoặc chữ số:

```js
function charCount(str) {
  const result = {};

  for (let i = 0; i < str.length; i++) {
    const char = str[i].toLowerCase();

    if (/[a-z0-9]/.test(char)) {
      if (result[char] > 0) {
        result[char]++;
      } else {
        result[char] = 1;
      }
    }
  }

  return result;
}
```

Một lời giải chạy được một phần tốt hơn một lời giải hoàn hảo không bao giờ được viết ra, và giải xong phần dễ thường khiến phần khó trở nên hiển nhiên.

---

## 9. Bước 5 – Nhìn lại và refactor

Chúc mừng bạn đã giải xong — nhưng chưa phải là hết. Hãy tự hỏi các **câu hỏi refactor**:

| Câu hỏi | Ý nghĩa thực tế |
|---|---|
| Có kiểm tra được kết quả không? | Chạy lại mọi ví dụ ở bước 2, nhất là input rỗng và không hợp lệ. |
| Có suy ra kết quả bằng cách khác không? | Hướng khác (sắp xếp, dùng `Map`) có cho cùng kết quả không? |
| Có hiểu được code chỉ trong một cái liếc không? | Tên rõ ràng, không lồng sâu, không mẹo khó hiểu. |
| Có dùng kết quả hay phương pháp cho bài khác không? | "Đếm vào một object" còn giải được anagram, tìm trùng lặp. |
| Có cải thiện hiệu năng được không? | Big O thời gian và bộ nhớ; các lời gọi O(n) ẩn trong vòng lặp. |
| Còn cách refactor nào khác không? | Hàm helper, return sớm, cú pháp hiện đại. |
| Người khác đã giải bài này thế nào? | Đọc lời giải khác sau khi làm xong để học idiom. |

---

## 10. Refactor bài "đếm ký tự"

Áp dụng các câu hỏi đó cho lời giải ở bước 4:

- `for...of` bỏ được phần quản lý index.
- `(result[char] || 0) + 1` gộp khối if/else thành một dòng.
- Hàm helper `isAlphaNumeric` giúp đọc là hiểu ý đồ ngay.
- Kiểm tra khoảng mã bằng `charCodeAt` tránh phải chạy regular expression cho từng ký tự. Regex trong vòng lặp thường đo được chậm hơn một chút, nhưng tuỳ engine — hãy profile trước khi kết luận.

```js
function charCount(str) {
  const result = {};

  for (const char of str) {
    if (isAlphaNumeric(char)) {
      const key = char.toLowerCase();
      result[key] = (result[key] || 0) + 1;
    }
  }

  return result;
}

function isAlphaNumeric(char) {
  const code = char.charCodeAt(0);

  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) // a-z
  );
}
```

Nhìn lại cả độ phức tạp:

| Phiên bản | Thời gian | Auxiliary space |
|---|---|---|
| Đơn giản hoá / regex / đã refactor | O(n), duyệt chuỗi một lần | O(k) với k key khác nhau — tối đa 36 ở đây, nên thực chất là O(1) |

Refactor không làm đổi Big O; nó cải thiện **tính dễ đọc** và hằng số. Điều đó hoàn toàn bình thường — không phải lần refactor nào cũng nhằm vào độ phức tạp.

---

## 11. Áp dụng trọn quy trình cho bài thứ hai

*Viết hàm trả về số lớn thứ hai trong một mảng.*

**Hiểu đề.** Input: mảng số. Output: một số, hoặc giá trị gì đó cho trường hợp "không có đáp án". Chưa rõ: `[5, 5, 3]` trả về `5` hay `3`? Giả định xét các giá trị **phân biệt** (distinct), nên là `3`.

**Ví dụ.**

| Input | Output |
|---|---|
| `[3, 8, 5]` | `5` |
| `[5, 5, 3]` | `3` |
| `[-2, -7]` | `-7` |
| `[4]` hoặc `[4, 4]` | `null` |
| `[]` | `null` |

**Chia nhỏ và giải (brute force trước).** Loại bỏ phần tử trùng, sắp xếp giảm dần, lấy index 1:

```js
function secondLargestSort(nums) {
  const unique = [...new Set(nums)].sort((a, b) => b - a);

  return unique.length >= 2 ? unique[1] : null;
}
// O(n log n) time (sort), O(n) space (Set + new array)
```

Comparator là bắt buộc: `sort()` mặc định so sánh phần tử như chuỗi, nên `[5, 10, 1].sort()` trả về `[1, 10, 5]`.

**Nhìn lại — có cải thiện hiệu năng được không?** Ta chỉ cần hai giá trị lớn nhất, nên duyệt một lần và theo dõi hai giá trị đó là đủ:

```js
function secondLargest(nums) {
  let first = -Infinity;
  let second = -Infinity;

  for (const x of nums) {
    if (x > first) {
      second = first;
      first = x;
    } else if (x < first && x > second) {
      second = x;
    }
  }

  return second === -Infinity ? null : second;
}
// O(n) time, O(1) space
```

Chạy tay (dry run) với `[3, 8, 8, 5]` để kiểm tra kết quả:

```text
x   | x > first? | x < first && x > second? | first | second
----+------------+--------------------------+-------+-------
3   | yes        | -                        | 3     | -Inf
8   | yes        | -                        | 8     | 3
8   | no         | no (8 is not < 8)        | 8     | 3
5   | no         | yes                      | 8     | 5
                                               return 5
```

---

## 12. Dùng quy trình trong buổi phỏng vấn

Phân bổ thời gian tham khảo cho một bài 45 phút:

| Giai đoạn | Thời gian | Người phỏng vấn thấy gì |
|---|---|---|
| Hiểu đề + làm rõ | 3–5 phút | Diễn đạt lại đề, hỏi về input, output, edge case |
| Ví dụ | 3–5 phút | Vài trường hợp, gồm cả rỗng/không hợp lệ |
| Chia nhỏ | ~5 phút | Kế hoạch, brute force và Big O của nó |
| Giải | 15–20 phút | Code bám theo kế hoạch |
| Nhìn lại | 5–10 phút | Chạy tay, độ phức tạp, hướng tối ưu |

Những thói quen tạo nên ứng viên mạnh:

- **Nghĩ thành tiếng** (think aloud). Một hướng sai có giải thích vẫn được cứu bằng gợi ý; một hướng sai im lặng thì không.
- **Nêu brute force và độ phức tạp của nó trước**, rồi mới tối ưu. Một lời giải O(n²) chạy được thắng một lời giải O(n) dang dở.
- **Bị kẹt? Đơn giản hoá thành tiếng:** "Tạm bỏ qua phần tử trùng, lát nữa em quay lại xử lý."
- **Kiểm tra bằng cách chạy tay** từng dòng, không chỉ nói "trông có vẻ đúng". Đi qua một ví dụ bình thường và một edge case.

Lỗi hay gặp: lao vào code ngay, mặc định input luôn hợp lệ và không rỗng, tự ý đổi đề bài, quên nêu space complexity, và dừng lại ở lời giải đầu tiên mà không nhìn lại.

---

## Điểm cần nhớ khi phỏng vấn

- **Thuật toán** là chuỗi các bước hoàn thành một nhiệm vụ; đánh giá theo tính đúng đắn trước, hiệu năng sau.
- 5 bước: **hiểu đề → khám phá ví dụ → chia nhỏ → giải/đơn giản hoá → nhìn lại & refactor** (chuyển thể từ *How to Solve It* của Pólya).
- Hiểu đề nghĩa là nắm rõ **input, output, đã đủ thông tin chưa, và cách đặt tên** — hỏi câu hỏi làm rõ thành tiếng.
- Ví dụ đi theo thứ tự **đơn giản → phức tạp → rỗng → không hợp lệ**; chúng cũng chính là test case của bạn.
- Viết **pseudocode** trước khi code để người phỏng vấn chỉnh hướng sớm.
- Khi bị kẹt, **giải bài đơn giản hơn**: bỏ qua chỗ khó cốt lõi, giải phần còn lại, rồi đưa chỗ khó trở lại.
- Luôn **nhìn lại**: chạy tay các ví dụ, nêu Big O thời gian và bộ nhớ, cân nhắc hướng tốt hơn.
- Đưa ra **brute force trước**, rồi tối ưu (ví dụ sắp xếp O(n log n) → duyệt một lần O(n)).

## Tóm tắt

- Giỏi thuật toán hơn nghĩa là có **kế hoạch** (bài này) và nắm các **pattern** (bài sau).
- Bước 1 biến đề bài mơ hồ thành input, output và tên gọi rõ ràng; ngay cả "cộng hai số" cũng giấu câu hỏi về kiểu và phạm vi.
- Bước 2 xây dựng ví dụ cụ thể để chốt hành vi, sau này trở thành unit test.
- Bước 3 viết các bước ra giấy; bước 4 hiện thực chúng, đơn giản hoá trước nếu cần.
- Bước 5 kiểm tra, đọc lại, đo lường và refactor — `charCount` rõ ràng hơn mà vẫn O(n), còn `secondLargest` đi từ O(n log n) xuống O(n).
- Quy trình là một vòng lặp: một ví dụ chạy sai hoặc một câu hỏi mới sẽ đưa bạn quay lại bước trước.
