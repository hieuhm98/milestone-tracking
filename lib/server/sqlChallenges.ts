import "server-only";
import type { Bilingual, ChallengeDb, Difficulty, PublicChallenge } from "@/lib/sqlChallenges";

// The SQL challenges on /practice/sql/challenges, easy → hard. Server-only: the
// reference solutions never reach the browser unless the learner asks to see
// one (GET /api/sql-challenges?id=…&solution=1).
//
// How a submission is graded (lib/server/sqlGrader.ts):
//   * "query" challenges — the learner's SELECT and `solution` each run on a fresh
//     copy of the database; the result sets must match (same number of columns,
//     same rows; same order too when `ordered`). Column names are free.
//   * "modify" challenges — the learner's statement runs, then `check` runs on
//     that same copy; the same happens with `solution`; the two check results
//     must match.
//   * Then every `requires` pattern must match the learner's SQL, so the
//     challenge cannot be passed without the feature it practises. Patterns see
//     the SQL upper-cased, with comments and string literals removed and
//     whitespace collapsed to single spaces.
//
// Every solution was run against the committed data (2026-10-22). Changing
// data/word-bank.db or data/fintech.db can change the expected results — the
// grader always recomputes them, but re-read any prompt that quotes a number.

export interface Requirement {
  /** Shown to the learner: "This challenge practises LEFT JOIN". */
  label: string;
  pattern: RegExp;
}

export interface SqlChallenge {
  id: string;
  difficulty: Difficulty;
  db: ChallengeDb;
  kind: "query" | "modify";
  title: Bilingual;
  prompt: Bilingual;
  hint: Bilingual;
  explanation: Bilingual;
  concepts: string[];
  requires: Requirement[];
  ordered: boolean;
  solution: string;
  /** "modify" challenges: a SELECT that shows the effect of the change. */
  check?: string;
}

const req = (label: string, pattern: RegExp): Requirement => ({ label, pattern });

export const CHALLENGES: SqlChallenge[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "second-page",
    difficulty: "easy",
    db: "words",
    kind: "query",
    title: { vi: "Trang thứ hai", en: "The second page" },
    prompt: {
      vi: "Một ứng dụng hiển thị kho từ theo trang, mỗi trang 10 từ, sắp theo `id`. Hãy lấy **trang thứ hai**: các từ thứ 11 đến 20.\n\nTrả về `id`, `word`, `pronunciation`, sắp theo `id` tăng dần.",
      en: "An app shows the word bank 10 words per page, sorted by `id`. Fetch the **second page**: words 11 to 20.\n\nReturn `id`, `word`, `pronunciation`, ordered by `id` ascending.",
    },
    hint: {
      vi: "`LIMIT 10` lấy 10 dòng; `OFFSET 10` bỏ qua 10 dòng đầu. `ORDER BY` phải đứng trước `LIMIT`.",
      en: "`LIMIT 10` takes 10 rows; `OFFSET 10` skips the first 10. `ORDER BY` comes before `LIMIT`.",
    },
    explanation: {
      vi: "Không có `ORDER BY`, cơ sở dữ liệu được phép trả dòng theo thứ tự bất kỳ — phân trang chỉ ổn định khi luôn sắp theo một cột duy nhất như `id`. Trang n (bắt đầu từ 1) là `LIMIT 10 OFFSET (n - 1) * 10`.",
      en: "Without `ORDER BY` the database may return rows in any order — paging is only stable when you sort by a unique column such as `id`. Page n (from 1) is `LIMIT 10 OFFSET (n - 1) * 10`.",
    },
    concepts: ["SELECT", "ORDER BY", "LIMIT", "OFFSET"],
    requires: [req("ORDER BY", /\bORDER BY\b/), req("LIMIT … OFFSET", /\bOFFSET\b|\bLIMIT \d+ ?, ?\d+/)],
    ordered: true,
    solution: `SELECT id, word, pronunciation
FROM words
ORDER BY id
LIMIT 10 OFFSET 10;`,
  },
  {
    id: "twelve-letter-adjectives",
    difficulty: "easy",
    db: "words",
    kind: "query",
    title: { vi: "Tính từ 12 chữ cái", en: "Twelve-letter adjectives" },
    prompt: {
      vi: "Tìm mọi **tính từ** (`pos_code = 'adj'`) có **đúng 12 chữ cái** (cột `length`).\n\nTrả về cột `word`, sắp theo bảng chữ cái.",
      en: "Find every **adjective** (`pos_code = 'adj'`) with **exactly 12 letters** (the `length` column).\n\nReturn the `word` column in alphabetical order.",
    },
    hint: {
      vi: "Hai điều kiện cùng đúng thì nối bằng `AND` trong mệnh đề `WHERE`.",
      en: "Two conditions that must both hold are joined with `AND` in the `WHERE` clause.",
    },
    explanation: {
      vi: "`WHERE` lọc dòng trước khi sắp xếp. Chuỗi trong SQL dùng nháy đơn (`'adj'`); nháy kép dành cho tên cột/bảng.",
      en: "`WHERE` filters rows before sorting. SQL strings use single quotes (`'adj'`); double quotes are for column and table names.",
    },
    concepts: ["WHERE", "AND"],
    requires: [req("WHERE", /\bWHERE\b/), req("AND", /\bAND\b/)],
    ordered: true,
    solution: `SELECT word
FROM words
WHERE pos_code = 'adj'
  AND length = 12
ORDER BY word;`,
  },
  {
    id: "merchant-categories",
    difficulty: "easy",
    db: "fintech",
    kind: "query",
    title: { vi: "Các ngành hàng", en: "Merchant categories" },
    prompt: {
      vi: "Bảng `merchants` có 33 đối tác, mỗi đối tác thuộc một `category`. Liệt kê **mỗi ngành hàng một lần**.\n\nTrả về cột `category`, sắp theo bảng chữ cái.",
      en: "The `merchants` table has 33 merchants, each in a `category`. List **each category once**.\n\nReturn the `category` column in alphabetical order.",
    },
    hint: {
      vi: "`SELECT DISTINCT` bỏ các dòng trùng nhau trong kết quả.",
      en: "`SELECT DISTINCT` removes duplicate rows from the result.",
    },
    explanation: {
      vi: "`DISTINCT` áp dụng cho cả dòng kết quả: `SELECT DISTINCT category, city` sẽ cho mỗi cặp (ngành, thành phố) một lần, không phải mỗi ngành một lần.",
      en: "`DISTINCT` applies to the whole result row: `SELECT DISTINCT category, city` gives each (category, city) pair once, not each category once.",
    },
    concepts: ["DISTINCT"],
    requires: [req("DISTINCT", /\bDISTINCT\b/)],
    ordered: true,
    solution: `SELECT DISTINCT category
FROM merchants
ORDER BY category;`,
  },
  {
    id: "un-able-words",
    difficulty: "easy",
    db: "words",
    kind: "query",
    title: { vi: "Từ dạng un…able", en: "un…able words" },
    prompt: {
      vi: "Tìm các từ **bắt đầu bằng `un`** và **kết thúc bằng `able`** (unable, unbelievable…).\n\nTrả về cột `word`, sắp theo bảng chữ cái.",
      en: "Find the words that **start with `un`** and **end with `able`** (unable, unbelievable…).\n\nReturn the `word` column in alphabetical order.",
    },
    hint: {
      vi: "Trong `LIKE`, `%` thay cho một chuỗi bất kỳ (kể cả rỗng) và `_` thay cho đúng một ký tự.",
      en: "In `LIKE`, `%` matches any run of characters (even none) and `_` exactly one character.",
    },
    explanation: {
      vi: "`'un%able'` khớp chuỗi bắt đầu bằng un và kết thúc bằng able. Trong SQLite, `LIKE` không phân biệt hoa thường với chữ cái tiếng Anh.",
      en: "`'un%able'` matches text that starts with un and ends with able. In SQLite, `LIKE` ignores case for English letters.",
    },
    concepts: ["LIKE", "wildcards"],
    requires: [req("LIKE", /\bLIKE\b/)],
    ordered: true,
    solution: `SELECT word
FROM words
WHERE word LIKE 'un%able'
ORDER BY word;`,
  },
  {
    id: "partner-students",
    difficulty: "easy",
    db: "fintech",
    kind: "query",
    title: { vi: "Sinh viên & freelancer từ đối tác", en: "Students and freelancers from partners" },
    prompt: {
      vi: "Đội marketing cần danh sách khách hàng:\n\n- `employment` là `student` **hoặc** `freelancer`,\n- đã xác minh danh tính (`kyc_status = 'verified'`),\n- đăng ký qua đối tác (`signup_channel = 'partner'`).\n\nTrả về `customer_id`, `full_name`, sắp theo `customer_id`.",
      en: "Marketing needs a list of customers who:\n\n- have `employment` `student` **or** `freelancer`,\n- passed identity checks (`kyc_status = 'verified'`),\n- signed up through a partner (`signup_channel = 'partner'`).\n\nReturn `customer_id`, `full_name`, ordered by `customer_id`.",
    },
    hint: {
      vi: "`employment IN ('student', 'freelancer')` gọn hơn hai điều kiện nối bằng `OR` — và tránh lỗi quên dấu ngoặc khi trộn `OR` với `AND`.",
      en: "`employment IN ('student', 'freelancer')` is shorter than two conditions joined by `OR` — and avoids the missing-brackets bug when `OR` meets `AND`.",
    },
    explanation: {
      vi: "`a OR b AND c` được hiểu là `a OR (b AND c)`, vì `AND` ưu tiên hơn `OR`. `IN (…)` gói các lựa chọn lại nên không gặp lỗi này.",
      en: "`a OR b AND c` means `a OR (b AND c)`, because `AND` binds tighter than `OR`. `IN (…)` keeps the alternatives together, so the bug can't happen.",
    },
    concepts: ["IN"],
    requires: [req("IN (…)", /\bIN ?\(/)],
    ordered: true,
    solution: `SELECT customer_id, full_name
FROM customers
WHERE employment IN ('student', 'freelancer')
  AND kyc_status = 'verified'
  AND signup_channel = 'partner'
ORDER BY customer_id;`,
  },
  {
    id: "first-week-of-march",
    difficulty: "easy",
    db: "fintech",
    kind: "query",
    title: { vi: "Tuần đầu tháng Ba", en: "The first week of March" },
    prompt: {
      vi: "Liệt kê các khoản vay giải ngân từ **1/3/2026 đến 7/3/2026, tính cả hai đầu** (`disbursed_date` có dạng `YYYY-MM-DD`).\n\nTrả về `loan_id`, `principal`, `disbursed_date`, sắp theo `disbursed_date` rồi `loan_id`.",
      en: "List the loans disbursed from **2026-03-01 to 2026-03-07, both days included** (`disbursed_date` is `YYYY-MM-DD` text).\n\nReturn `loan_id`, `principal`, `disbursed_date`, ordered by `disbursed_date`, then `loan_id`.",
    },
    hint: {
      vi: "`x BETWEEN a AND b` nghĩa là `x >= a AND x <= b` — tính cả hai đầu.",
      en: "`x BETWEEN a AND b` means `x >= a AND x <= b` — both ends included.",
    },
    explanation: {
      vi: "Ngày dạng `YYYY-MM-DD` so sánh đúng như chuỗi. Cẩn thận với cột có cả giờ (`2026-03-07 15:00:00`): `BETWEEN '2026-03-01' AND '2026-03-07'` sẽ bỏ sót cả ngày 7 — khi đó dùng `< '2026-03-08'`.",
      en: "`YYYY-MM-DD` dates compare correctly as text. Watch out for columns with a time (`2026-03-07 15:00:00`): `BETWEEN '2026-03-01' AND '2026-03-07'` misses most of the 7th — use `< '2026-03-08'` there.",
    },
    concepts: ["BETWEEN", "dates"],
    requires: [req("BETWEEN", /\bBETWEEN\b/)],
    ordered: true,
    solution: `SELECT loan_id, principal, disbursed_date
FROM loans
WHERE disbursed_date BETWEEN '2026-03-01' AND '2026-03-07'
ORDER BY disbursed_date, loan_id;`,
  },
  {
    id: "missing-income",
    difficulty: "easy",
    db: "fintech",
    kind: "query",
    title: { vi: "Thu nhập bị bỏ trống", en: "Missing income" },
    prompt: {
      vi: "Khi đăng ký, một số khách hàng không khai thu nhập — cột `monthly_income` là `NULL`. **Có bao nhiêu khách hàng như vậy?**\n\nTrả về một dòng, một cột: số khách hàng.",
      en: "Some customers left their income blank at sign-up — `monthly_income` is `NULL`. **How many customers is that?**\n\nReturn one row with one column: the number of customers.",
    },
    hint: {
      vi: "`monthly_income = NULL` không bao giờ đúng — so sánh với `NULL` luôn cho kết quả không xác định. Hãy dùng `IS NULL`.",
      en: "`monthly_income = NULL` is never true — any comparison with `NULL` is unknown. Use `IS NULL`.",
    },
    explanation: {
      vi: "`NULL` nghĩa là \"không biết\", nên `NULL = NULL` cũng không đúng. Chỉ `IS NULL` / `IS NOT NULL` kiểm tra được. Lưu ý `COUNT(monthly_income)` bỏ qua các dòng `NULL`, còn `COUNT(*)` đếm mọi dòng.",
      en: "`NULL` means \"unknown\", so even `NULL = NULL` isn't true. Only `IS NULL` / `IS NOT NULL` can test for it. Note `COUNT(monthly_income)` skips `NULL`s while `COUNT(*)` counts every row.",
    },
    concepts: ["IS NULL", "COUNT"],
    requires: [req("IS NULL", /\bIS NULL\b/), req("COUNT", /\bCOUNT ?\(/)],
    ordered: false,
    solution: `SELECT COUNT(*) AS customers
FROM customers
WHERE monthly_income IS NULL;`,
  },
  {
    id: "word-length-stats",
    difficulty: "easy",
    db: "words",
    kind: "query",
    title: { vi: "Thống kê độ dài từ", en: "Word length statistics" },
    prompt: {
      vi: "Tóm tắt cột `length` của bảng `words` trong **một dòng** gồm 4 cột, theo đúng thứ tự:\n\n- tổng số từ,\n- độ dài ngắn nhất,\n- độ dài dài nhất,\n- độ dài trung bình, **làm tròn 2 chữ số thập phân**.",
      en: "Summarise the `length` column of `words` in **one row** with 4 columns, in this order:\n\n- the number of words,\n- the shortest length,\n- the longest length,\n- the average length, **rounded to 2 decimal places**.",
    },
    hint: {
      vi: "Hàm gộp `COUNT`, `MIN`, `MAX`, `AVG` biến cả bảng thành một dòng. `ROUND(x, 2)` làm tròn.",
      en: "The aggregate functions `COUNT`, `MIN`, `MAX`, `AVG` collapse the whole table into one row. `ROUND(x, 2)` rounds.",
    },
    explanation: {
      vi: "Không có `GROUP BY`, hàm gộp tính trên toàn bảng nên kết quả luôn là đúng một dòng.",
      en: "Without `GROUP BY`, aggregates run over the whole table, so the result is always exactly one row.",
    },
    concepts: ["COUNT", "MIN", "MAX", "AVG", "ROUND"],
    requires: [
      req("COUNT", /\bCOUNT ?\(/),
      req("MIN", /\bMIN ?\(/),
      req("MAX", /\bMAX ?\(/),
      req("AVG", /\bAVG ?\(/),
    ],
    ordered: false,
    solution: `SELECT COUNT(*)              AS words,
       MIN(length)           AS shortest,
       MAX(length)           AS longest,
       ROUND(AVG(length), 2) AS avg_length
FROM words;`,
  },
  {
    id: "payments-by-method",
    difficulty: "easy",
    db: "fintech",
    kind: "query",
    title: { vi: "Thanh toán theo phương thức", en: "Payments by method" },
    prompt: {
      vi: "Đếm số lượt thanh toán (bảng `payments`, mọi trạng thái) **theo từng phương thức** (`method`).\n\nTrả về `method`, số lượt, sắp từ nhiều đến ít.",
      en: "Count the payments (table `payments`, any status) **per payment method** (`method`).\n\nReturn `method` and the count, most first.",
    },
    hint: {
      vi: "`GROUP BY method` tạo một nhóm cho mỗi phương thức; `COUNT(*)` đếm dòng trong từng nhóm. Có thể `ORDER BY` theo bí danh của cột đếm.",
      en: "`GROUP BY method` makes one group per method; `COUNT(*)` counts the rows in each. You can `ORDER BY` the count's alias.",
    },
    explanation: {
      vi: "Mọi cột trong `SELECT` phải nằm trong `GROUP BY` hoặc nằm trong một hàm gộp — nếu không, giá trị lấy ra là của một dòng bất kỳ trong nhóm.",
      en: "Every `SELECT` column must be in the `GROUP BY` or inside an aggregate — otherwise you get the value from an arbitrary row of the group.",
    },
    concepts: ["GROUP BY", "COUNT"],
    requires: [req("GROUP BY", /\bGROUP BY\b/)],
    ordered: true,
    solution: `SELECT method, COUNT(*) AS payments
FROM payments
GROUP BY method
ORDER BY payments DESC;`,
  },
  {
    id: "add-determiner",
    difficulty: "easy",
    db: "words",
    kind: "modify",
    title: { vi: "Thêm một loại từ", en: "Add a part of speech" },
    prompt: {
      vi: "Bảng `parts_of_speech` còn thiếu **từ hạn định** (the, this, some…). Thêm một dòng với:\n\n- `id` = `10`\n- `code` = `'det'`\n- `name_en` = `'determiner'`\n- `name_vi` = `'từ hạn định'`\n\nChỉ viết một câu `INSERT`. Bài được chấm bằng cách xem lại toàn bộ bảng sau khi bạn chạy.",
      en: "The `parts_of_speech` table has no **determiner** (the, this, some…). Add a row with:\n\n- `id` = `10`\n- `code` = `'det'`\n- `name_en` = `'determiner'`\n- `name_vi` = `'từ hạn định'`\n\nWrite one `INSERT` statement. It is graded by reading the whole table back after it runs.",
    },
    hint: {
      vi: "`INSERT INTO bảng (cột1, cột2, …) VALUES (giá_trị1, giá_trị2, …);` — liệt kê tên cột để không phụ thuộc thứ tự cột trong bảng.",
      en: "`INSERT INTO table (col1, col2, …) VALUES (value1, value2, …);` — naming the columns means you don't depend on their order in the table.",
    },
    explanation: {
      vi: "Luôn ghi rõ danh sách cột: nếu sau này bảng có thêm cột, câu lệnh vẫn đúng. Mỗi lần chạy trên trang này đều dùng một bản sao mới, nên bạn không thể làm hỏng dữ liệu thật.",
      en: "Always name the columns: the statement keeps working if the table gains a column later. Every run on this page uses a fresh copy, so the real data can't be harmed.",
    },
    concepts: ["INSERT"],
    requires: [req("INSERT INTO", /^INSERT INTO\b/)],
    ordered: true,
    solution: `INSERT INTO parts_of_speech (id, code, name_en, name_vi)
VALUES (10, 'det', 'determiner', 'từ hạn định');`,
    check: "SELECT * FROM parts_of_speech ORDER BY id",
  },

  // ---------------------------------------------------------------- medium
  {
    id: "busy-letters",
    difficulty: "medium",
    db: "words",
    kind: "query",
    title: { vi: "Những chữ cái đông từ", en: "The busiest letters" },
    prompt: {
      vi: "Theo chữ cái đầu (`first_letter`), chữ nào có **hơn 1.500 từ**?\n\nTrả về `first_letter`, số từ, sắp từ nhiều đến ít.",
      en: "By first letter (`first_letter`), which letters have **more than 1,500 words**?\n\nReturn `first_letter` and the count, most first.",
    },
    hint: {
      vi: "`WHERE` lọc dòng **trước** khi gộp nhóm, nên không dùng được `COUNT(*)` trong đó. Điều kiện trên kết quả gộp đặt trong `HAVING`.",
      en: "`WHERE` filters rows **before** grouping, so it can't use `COUNT(*)`. Conditions on aggregated results go in `HAVING`.",
    },
    explanation: {
      vi: "Thứ tự xử lý: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. `HAVING` là bộ lọc cho nhóm.",
      en: "Processing order: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. `HAVING` filters groups.",
    },
    concepts: ["GROUP BY", "HAVING"],
    requires: [req("GROUP BY", /\bGROUP BY\b/), req("HAVING", /\bHAVING\b/)],
    ordered: true,
    solution: `SELECT first_letter, COUNT(*) AS words
FROM words
GROUP BY first_letter
HAVING COUNT(*) > 1500
ORDER BY words DESC;`,
  },
  {
    id: "words-per-part-of-speech",
    difficulty: "medium",
    db: "words",
    kind: "query",
    title: { vi: "Số từ theo tên loại từ", en: "Words per part of speech, by name" },
    prompt: {
      vi: "`words.pos_code` chỉ lưu mã (`n`, `v`…). Ghép với bảng `parts_of_speech` để đếm số từ theo **tên tiếng Anh** của loại từ (`name_en`). Bỏ qua các từ chưa có loại từ.\n\nTrả về `name_en`, số từ, sắp từ nhiều đến ít; bằng nhau thì theo `name_en`.",
      en: "`words.pos_code` only stores a code (`n`, `v`…). Join `parts_of_speech` to count words by the part of speech's **English name** (`name_en`). Leave out words with no part of speech.\n\nReturn `name_en` and the count, most first; ties by `name_en`.",
    },
    hint: {
      vi: "`FROM words w JOIN parts_of_speech p ON p.code = w.pos_code` — `JOIN` (tức `INNER JOIN`) chỉ giữ dòng tìm được cặp, nên từ có `pos_code` là `NULL` tự rơi ra.",
      en: "`FROM words w JOIN parts_of_speech p ON p.code = w.pos_code` — `JOIN` (an `INNER JOIN`) keeps only rows that find a match, so words with a `NULL` `pos_code` drop out.",
    },
    explanation: {
      vi: "Bí danh bảng (`w`, `p`) giúp câu lệnh ngắn và rõ cột nào thuộc bảng nào. Muốn giữ cả từ chưa có loại từ thì dùng `LEFT JOIN` — bài sau.",
      en: "Table aliases (`w`, `p`) keep the query short and make clear which table a column comes from. To keep words without a part of speech, use `LEFT JOIN` — next challenge.",
    },
    concepts: ["INNER JOIN", "GROUP BY"],
    requires: [req("JOIN", /\bJOIN\b/)],
    ordered: true,
    solution: `SELECT p.name_en, COUNT(*) AS words
FROM words w
JOIN parts_of_speech p ON p.code = w.pos_code
GROUP BY p.name_en
ORDER BY words DESC, p.name_en;`,
  },
  {
    id: "never-applied",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Chưa từng nộp hồ sơ vay", en: "Never applied for a loan" },
    prompt: {
      vi: "Bao nhiêu khách hàng **đã xác minh** (`kyc_status = 'verified'`) **chưa từng nộp hồ sơ vay** nào (không có dòng nào trong `loan_applications`)?\n\nTrả về một dòng, một cột: số khách hàng.",
      en: "How many **verified** customers (`kyc_status = 'verified'`) have **never applied for a loan** (no row in `loan_applications`)?\n\nReturn one row with one column: the number of customers.",
    },
    hint: {
      vi: "`LEFT JOIN` giữ mọi khách hàng; khách không có hồ sơ sẽ có cột của `loan_applications` là `NULL`. Lọc `WHERE a.application_id IS NULL`.",
      en: "`LEFT JOIN` keeps every customer; one with no application gets `NULL` in the `loan_applications` columns. Filter `WHERE a.application_id IS NULL`.",
    },
    explanation: {
      vi: "Đây là mẫu \"anti-join\": tìm dòng **không** có cặp. Điều kiện trên bảng bên phải phải đặt ở `ON` (nếu muốn giữ dòng) hoặc kiểm tra `IS NULL` ở `WHERE` — đặt `a.status = …` ở `WHERE` sẽ biến `LEFT JOIN` thành `INNER JOIN`.",
      en: "This is the anti-join pattern: rows that have **no** match. Conditions on the right-hand table belong in `ON` (to keep rows) or as `IS NULL` in `WHERE` — putting `a.status = …` in `WHERE` quietly turns the `LEFT JOIN` into an `INNER JOIN`.",
    },
    concepts: ["LEFT JOIN", "IS NULL"],
    requires: [req("LEFT JOIN", /\bLEFT (OUTER )?JOIN\b/)],
    ordered: false,
    solution: `SELECT COUNT(*) AS customers
FROM customers c
LEFT JOIN loan_applications a ON a.customer_id = c.customer_id
WHERE c.kyc_status = 'verified'
  AND a.application_id IS NULL;`,
  },
  {
    id: "income-bands",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Nhóm thu nhập", en: "Income bands" },
    prompt: {
      vi: "Chia khách hàng theo `monthly_income` (VND/tháng):\n\n- `'unknown'` — không khai (`NULL`)\n- `'under 10M'` — dưới 10.000.000\n- `'10M-20M'` — từ 10.000.000 đến dưới 20.000.000\n- `'20M+'` — từ 20.000.000 trở lên\n\nTrả về tên nhóm và số khách hàng, sắp từ nhiều đến ít.",
      en: "Put customers in bands by `monthly_income` (VND per month):\n\n- `'unknown'` — left blank (`NULL`)\n- `'under 10M'` — below 10,000,000\n- `'10M-20M'` — 10,000,000 up to (not including) 20,000,000\n- `'20M+'` — 20,000,000 or more\n\nReturn the band name and the number of customers, most first.",
    },
    hint: {
      vi: "`CASE WHEN … THEN … WHEN … THEN … ELSE … END` trả về nhánh **đầu tiên** đúng. Kiểm tra `NULL` trước, vì `NULL < 10000000` không đúng mà cũng không sai.",
      en: "`CASE WHEN … THEN … WHEN … THEN … ELSE … END` returns the **first** branch that holds. Test for `NULL` first, since `NULL < 10000000` is neither true nor false.",
    },
    explanation: {
      vi: "Vì nhánh đầu tiên khớp sẽ thắng, chỉ cần `< 20000000` ở nhánh thứ ba — dòng dưới 10 triệu đã được nhánh trước giữ. Có thể `GROUP BY` theo bí danh `band` trong SQLite.",
      en: "Because the first matching branch wins, the third branch only needs `< 20000000` — rows under 10M were already caught. SQLite lets you `GROUP BY` the alias `band`.",
    },
    concepts: ["CASE WHEN", "GROUP BY"],
    requires: [req("CASE WHEN", /\bCASE WHEN\b|\bCASE\b[\s\S]*\bWHEN\b/)],
    ordered: true,
    solution: `SELECT CASE
         WHEN monthly_income IS NULL      THEN 'unknown'
         WHEN monthly_income < 10000000   THEN 'under 10M'
         WHEN monthly_income < 20000000   THEN '10M-20M'
         ELSE '20M+'
       END AS band,
       COUNT(*) AS customers
FROM customers
GROUP BY band
ORDER BY customers DESC;`,
  },
  {
    id: "reject-reasons",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Lý do từ chối", en: "Reject reasons" },
    prompt: {
      vi: "Đếm hồ sơ vay theo `reject_reason`. Hồ sơ không bị từ chối có `reject_reason` là `NULL` — hãy hiển thị chúng dưới tên **`'none'`**.\n\nTrả về lý do và số hồ sơ, sắp từ nhiều đến ít.",
      en: "Count loan applications by `reject_reason`. Applications that weren't rejected have a `NULL` `reject_reason` — show them as **`'none'`**.\n\nReturn the reason and the number of applications, most first.",
    },
    hint: {
      vi: "`COALESCE(a, b)` trả về giá trị đầu tiên khác `NULL`.",
      en: "`COALESCE(a, b)` returns the first value that isn't `NULL`.",
    },
    explanation: {
      vi: "`COALESCE` nhận bao nhiêu tham số cũng được: `COALESCE(mobile, home_phone, 'không có')`. Hàm ngược lại, `NULLIF(a, b)`, trả `NULL` khi a = b — hữu ích để tránh chia cho 0: `x / NULLIF(y, 0)`.",
      en: "`COALESCE` takes any number of arguments: `COALESCE(mobile, home_phone, 'none')`. Its opposite, `NULLIF(a, b)`, returns `NULL` when a = b — handy to avoid dividing by zero: `x / NULLIF(y, 0)`.",
    },
    concepts: ["COALESCE", "NULL"],
    requires: [req("COALESCE / IFNULL", /\b(COALESCE|IFNULL) ?\(/)],
    ordered: true,
    solution: `SELECT COALESCE(reject_reason, 'none') AS reason,
       COUNT(*) AS applications
FROM loan_applications
GROUP BY reason
ORDER BY applications DESC;`,
  },
  {
    id: "applications-by-month",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Hồ sơ vay theo tháng", en: "Applications by month" },
    prompt: {
      vi: "Với các hồ sơ nộp **từ 1/1/2026** (`applied_at`, dạng `YYYY-MM-DD HH:MM:SS`), mỗi tháng có bao nhiêu hồ sơ và bao nhiêu được duyệt (`status = 'approved'`)?\n\nTrả về tháng dạng `'2026-01'`, số hồ sơ, số được duyệt; sắp theo tháng.",
      en: "For applications made **from 2026-01-01** (`applied_at`, `YYYY-MM-DD HH:MM:SS`), how many were made each month, and how many were approved (`status = 'approved'`)?\n\nReturn the month as `'2026-01'`, the applications and the approvals, ordered by month.",
    },
    hint: {
      vi: "`strftime('%Y-%m', applied_at)` cắt ra năm-tháng. Trong SQLite, so sánh cho 1 (đúng) hoặc 0 (sai), nên `SUM(status = 'approved')` đếm số dòng đúng điều kiện.",
      en: "`strftime('%Y-%m', applied_at)` extracts year-month. In SQLite a comparison is 1 (true) or 0 (false), so `SUM(status = 'approved')` counts the matching rows.",
    },
    explanation: {
      vi: "Đây là \"conditional aggregation\": một lần quét bảng mà ra nhiều chỉ số. Ở hệ khác có thể viết `SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)` hoặc `COUNT(*) FILTER (WHERE …)`.",
      en: "This is conditional aggregation: several measures from one pass over the table. Elsewhere you'd write `SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)` or `COUNT(*) FILTER (WHERE …)`.",
    },
    concepts: ["strftime", "dates", "conditional aggregation"],
    requires: [req("strftime", /\bSTRFTIME ?\(/)],
    ordered: true,
    solution: `SELECT strftime('%Y-%m', applied_at) AS month,
       COUNT(*)                         AS applications,
       SUM(status = 'approved')         AS approved
FROM loan_applications
WHERE applied_at >= '2026-01-01'
GROUP BY month
ORDER BY month;`,
  },
  {
    id: "unusually-large-loans",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Khoản vay lớn bất thường", en: "Unusually large loans" },
    prompt: {
      vi: "Tìm các khoản vay có `principal` **lớn hơn 3 lần mức trung bình** của mọi khoản vay.\n\nTrả về `loan_id`, `principal`, sắp theo `principal` giảm dần rồi `loan_id`.",
      en: "Find the loans whose `principal` is **more than 3 times the average** of all loans.\n\nReturn `loan_id`, `principal`, ordered by `principal` descending, then `loan_id`.",
    },
    hint: {
      vi: "Không viết `WHERE principal > 3 * AVG(principal)` được (hàm gộp không dùng trong `WHERE`). Hãy tính trung bình trong một truy vấn con: `(SELECT AVG(principal) FROM loans)`.",
      en: "`WHERE principal > 3 * AVG(principal)` isn't allowed (no aggregates in `WHERE`). Compute the average in a subquery: `(SELECT AVG(principal) FROM loans)`.",
    },
    explanation: {
      vi: "Truy vấn con trả về đúng một giá trị (scalar subquery) dùng được ở bất cứ đâu cần một giá trị. Nó chỉ chạy một lần vì không phụ thuộc dòng bên ngoài.",
      en: "A subquery returning exactly one value (a scalar subquery) can go anywhere a value can. It runs once, because it doesn't depend on the outer row.",
    },
    concepts: ["subquery", "AVG"],
    requires: [req("subquery (SELECT …)", /\( ?SELECT\b/)],
    ordered: true,
    solution: `SELECT loan_id, principal
FROM loans
WHERE principal > 3 * (SELECT AVG(principal) FROM loans)
ORDER BY principal DESC, loan_id;`,
  },
  {
    id: "wallet-and-loan",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Vừa có ví vừa có khoản vay", en: "Both a wallet and a loan" },
    prompt: {
      vi: "Bao nhiêu khách hàng **vừa có ví** (bảng `wallets`) **vừa có ít nhất một khoản vay** (bảng `loans`)?\n\nTrả về một dòng, một cột: số khách hàng.",
      en: "How many customers have **both a wallet** (table `wallets`) **and at least one loan** (table `loans`)?\n\nReturn one row with one column: the number of customers.",
    },
    hint: {
      vi: "`WHERE EXISTS (SELECT 1 FROM wallets w WHERE w.customer_id = c.customer_id)` đúng khi tìm được ít nhất một dòng. Cần hai điều kiện `EXISTS`.",
      en: "`WHERE EXISTS (SELECT 1 FROM wallets w WHERE w.customer_id = c.customer_id)` holds when at least one row exists. You need two `EXISTS` tests.",
    },
    explanation: {
      vi: "Đây là truy vấn con **tương quan**: nó tham chiếu `c.customer_id` của dòng bên ngoài. `EXISTS` dừng ngay khi thấy dòng đầu tiên, và không nhân bản khách hàng như khi `JOIN` với bảng có nhiều khoản vay.",
      en: "These are **correlated** subqueries: they refer to the outer row's `c.customer_id`. `EXISTS` stops at the first match, and doesn't duplicate customers the way a `JOIN` to a table with several loans would.",
    },
    concepts: ["EXISTS", "correlated subquery"],
    requires: [req("EXISTS", /\bEXISTS ?\(/)],
    ordered: false,
    solution: `SELECT COUNT(*) AS customers
FROM customers c
WHERE EXISTS (SELECT 1 FROM wallets w WHERE w.customer_id = c.customer_id)
  AND EXISTS (SELECT 1 FROM loans l WHERE l.customer_id = c.customer_id);`,
  },
  {
    id: "app-loans-by-employment",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Khoản vay qua app theo nghề nghiệp", en: "App loans by employment" },
    prompt: {
      vi: "Với các khoản vay có hồ sơ nộp qua kênh **`'app'`** (`loan_applications.channel`), tính theo nghề nghiệp của khách hàng (`customers.employment`):\n\n- số khoản vay,\n- `principal` trung bình, **làm tròn đến đồng** (`ROUND(x)`).\n\nTrả về `employment`, số khoản vay, trung bình; sắp theo `employment`.",
      en: "For loans whose application came through the **`'app'`** channel (`loan_applications.channel`), by the customer's employment (`customers.employment`) give:\n\n- the number of loans,\n- the average `principal`, **rounded to whole VND** (`ROUND(x)`).\n\nReturn `employment`, the count and the average, ordered by `employment`.",
    },
    hint: {
      vi: "Cần ba bảng: `loans` → `loan_applications` (qua `application_id`) để biết kênh, và `loans` → `customers` (qua `customer_id`) để biết nghề nghiệp.",
      en: "Three tables: `loans` → `loan_applications` (on `application_id`) for the channel, and `loans` → `customers` (on `customer_id`) for the employment.",
    },
    explanation: {
      vi: "Mỗi `JOIN` thêm một bảng cùng điều kiện ghép riêng. Vì mỗi khoản vay có đúng một hồ sơ và một khách hàng, các phép ghép không nhân bản dòng — nên `COUNT(*)` vẫn là số khoản vay.",
      en: "Each `JOIN` adds a table with its own join condition. Each loan has exactly one application and one customer, so the joins don't multiply rows — `COUNT(*)` is still the number of loans.",
    },
    concepts: ["multi-table JOIN", "AVG"],
    requires: [req("two JOINs (3 tables)", /\bJOIN\b[\s\S]*\bJOIN\b/)],
    ordered: true,
    solution: `SELECT c.employment,
       COUNT(*)                AS loans,
       ROUND(AVG(l.principal)) AS avg_principal
FROM loans l
JOIN loan_applications a ON a.application_id = l.application_id
JOIN customers c         ON c.customer_id    = l.customer_id
WHERE a.channel = 'app'
GROUP BY c.employment
ORDER BY c.employment;`,
  },
  {
    id: "ness-nouns",
    difficulty: "medium",
    db: "words",
    kind: "query",
    title: { vi: "Tính từ và danh từ -ness", en: "Adjectives and their -ness nouns" },
    prompt: {
      vi: "Nhiều tính từ có danh từ đuôi **-ness** (aware → awareness). Tìm các **tính từ** (`pos_code = 'adj'`) mà dạng thêm `ness` **cũng có trong kho từ**.\n\nTrả về tính từ và danh từ, sắp theo tính từ.",
      en: "Many adjectives have a **-ness** noun (aware → awareness). Find the **adjectives** (`pos_code = 'adj'`) whose form with `ness` added **is also in the word bank**.\n\nReturn the adjective and the noun, ordered by the adjective.",
    },
    hint: {
      vi: "Ghép bảng `words` với chính nó, đặt hai bí danh khác nhau: `FROM words a JOIN words n ON n.word = a.word || 'ness'`. `||` nối chuỗi.",
      en: "Join `words` to itself under two aliases: `FROM words a JOIN words n ON n.word = a.word || 'ness'`. `||` concatenates text.",
    },
    explanation: {
      vi: "Self join coi một bảng như hai bản sao. Dùng nhiều cho quan hệ trong cùng bảng: nhân viên–quản lý, giao dịch trùng nhau, hay cặp từ như ở đây.",
      en: "A self join treats one table as two copies. It's how you relate rows within a table: employee–manager, duplicate transactions, or word pairs like here.",
    },
    concepts: ["self join", "|| concatenation"],
    requires: [req("self join (words twice)", /\b(FROM|JOIN) WORDS\b[\s\S]*\b(JOIN|,) ?WORDS\b/)],
    ordered: true,
    solution: `SELECT a.word AS adjective, n.word AS noun
FROM words a
JOIN words n ON n.word = a.word || 'ness'
WHERE a.pos_code = 'adj'
ORDER BY a.word;`,
  },
  {
    id: "risk-review-list",
    difficulty: "medium",
    db: "fintech",
    kind: "query",
    title: { vi: "Danh sách cần rà soát rủi ro", en: "Risk review list" },
    prompt: {
      vi: "Đội rủi ro cần **một danh sách** `customer_id`, mỗi khách hàng **một lần**, gồm những ai:\n\n- có khoản vay `status = 'defaulted'` (bảng `loans`), **hoặc**\n- có thanh toán bị chặn vì nghi gian lận (`payments.failure_reason = 'fraud_blocked'`).\n\nTrả về `customer_id`, sắp tăng dần.",
      en: "The risk team needs **one list** of `customer_id`s, each customer **once**, of everyone who:\n\n- has a loan with `status = 'defaulted'` (table `loans`), **or**\n- had a payment blocked for suspected fraud (`payments.failure_reason = 'fraud_blocked'`).\n\nReturn `customer_id`, ascending.",
    },
    hint: {
      vi: "Viết hai `SELECT customer_id …` rồi nối bằng `UNION`. `UNION` bỏ trùng; `UNION ALL` giữ nguyên.",
      en: "Write two `SELECT customer_id …` queries and combine them with `UNION`. `UNION` removes duplicates; `UNION ALL` keeps them.",
    },
    explanation: {
      vi: "Các vế của `UNION` phải có cùng số cột. `ORDER BY` đặt một lần ở cuối và áp dụng cho cả kết quả gộp. Nếu dùng `UNION ALL`, khách có cả hai dấu hiệu sẽ xuất hiện hai lần.",
      en: "Each side of a `UNION` needs the same number of columns. `ORDER BY` goes once at the end and sorts the combined result. With `UNION ALL`, a customer with both flags would appear twice.",
    },
    concepts: ["UNION"],
    requires: [req("UNION", /\bUNION\b/)],
    ordered: true,
    solution: `SELECT customer_id FROM loans    WHERE status = 'defaulted'
UNION
SELECT customer_id FROM payments WHERE failure_reason = 'fraud_blocked'
ORDER BY customer_id;`,
  },
  {
    id: "clean-hanoi",
    difficulty: "medium",
    db: "fintech",
    kind: "modify",
    title: { vi: "Chuẩn hoá tên Hà Nội", en: "Clean up Hanoi" },
    prompt: {
      vi: "Cột `customers.city` được nhập tay nên Hà Nội có nhiều cách viết: `'Hanoi'`, `'hanoi'`, `' Hanoi'` (thừa dấu cách), `'Ha Noi'`, `'HN'`.\n\nViết **một câu `UPDATE`** đổi mọi cách viết đó thành đúng `'Hanoi'`, **không** đụng tới thành phố khác. So khớp không phân biệt hoa thường và bỏ dấu cách thừa ở hai đầu.\n\nBài được chấm bằng cách đếm khách hàng theo `city` sau khi bạn chạy.",
      en: "`customers.city` was typed by hand, so Hanoi is spelled several ways: `'Hanoi'`, `'hanoi'`, `' Hanoi'` (stray space), `'Ha Noi'`, `'HN'`.\n\nWrite **one `UPDATE`** that turns every one of them into exactly `'Hanoi'` and touches **no** other city. Match ignoring case and surrounding spaces.\n\nIt is graded by counting customers per `city` after it runs.",
    },
    hint: {
      vi: "`LOWER(TRIM(city))` đưa mọi biến thể về chữ thường, không dấu cách thừa — rồi so với `IN ('hanoi', 'ha noi', 'hn')`. Luôn có `WHERE` trong `UPDATE`!",
      en: "`LOWER(TRIM(city))` lower-cases and strips the spaces — then compare with `IN ('hanoi', 'ha noi', 'hn')`. Always give an `UPDATE` a `WHERE`!",
    },
    explanation: {
      vi: "Một `UPDATE` không có `WHERE` sửa **mọi** dòng. Mẹo an toàn: viết trước `SELECT city, COUNT(*) FROM customers WHERE … GROUP BY city` để xem sẽ sửa những gì, rồi mới đổi thành `UPDATE`. Các hàm chuỗi khác: `UPPER`, `REPLACE`, `SUBSTR`, `LENGTH`, `INSTR`.",
      en: "An `UPDATE` without `WHERE` changes **every** row. Safe habit: first run `SELECT city, COUNT(*) FROM customers WHERE … GROUP BY city` to see what will change, then turn it into the `UPDATE`. Other text functions: `UPPER`, `REPLACE`, `SUBSTR`, `LENGTH`, `INSTR`.",
    },
    concepts: ["UPDATE", "TRIM", "LOWER / UPPER"],
    requires: [
      req("UPDATE … SET", /^UPDATE\b[\s\S]*\bSET\b/),
      req("WHERE", /\bWHERE\b/),
      req("TRIM", /\b[LR]?TRIM ?\(/),
      req("LOWER / UPPER", /\b(LOWER|UPPER) ?\(/),
    ],
    ordered: true,
    solution: `UPDATE customers
SET city = 'Hanoi'
WHERE LOWER(TRIM(city)) IN ('hanoi', 'ha noi', 'hn');`,
    check: "SELECT city, COUNT(*) AS customers FROM customers GROUP BY city ORDER BY city",
  },
  {
    id: "purge-old-failures",
    difficulty: "medium",
    db: "fintech",
    kind: "modify",
    title: { vi: "Dọn giao dịch lỗi cũ", en: "Purge old failed transactions" },
    prompt: {
      vi: "Xoá các giao dịch ví **thất bại** (`wallet_transactions.status = 'failed'`) được tạo **trước ngày 1/1/2026** (`created_at`). Giao dịch thành công và giao dịch thất bại từ 2026 phải giữ nguyên.\n\nBài được chấm bằng cách thống kê bảng theo `status` sau khi bạn chạy.",
      en: "Delete the **failed** wallet transactions (`wallet_transactions.status = 'failed'`) created **before 2026-01-01** (`created_at`). Successful ones, and failed ones from 2026, must stay.\n\nIt is graded by summarising the table by `status` after it runs.",
    },
    hint: {
      vi: "`DELETE FROM bảng WHERE …;` — giống `UPDATE`, quên `WHERE` là xoá sạch bảng.",
      en: "`DELETE FROM table WHERE …;` — like `UPDATE`, forgetting the `WHERE` empties the table.",
    },
    explanation: {
      vi: "`created_at < '2026-01-01'` đúng với mọi thời điểm trong năm 2025, kể cả `'2025-12-31 23:59:59'`, vì chuỗi ngày giờ so sánh theo thứ tự ký tự. Trong thực tế, hãy chạy `SELECT COUNT(*)` với cùng `WHERE` trước khi xoá.",
      en: "`created_at < '2026-01-01'` catches every moment of 2025, `'2025-12-31 23:59:59'` included, because date-time text compares character by character. In real life, run `SELECT COUNT(*)` with the same `WHERE` before deleting.",
    },
    concepts: ["DELETE"],
    requires: [req("DELETE FROM", /^DELETE FROM\b/), req("WHERE", /\bWHERE\b/)],
    ordered: true,
    solution: `DELETE FROM wallet_transactions
WHERE status = 'failed'
  AND created_at < '2026-01-01';`,
    check:
      "SELECT status, COUNT(*) AS txns, MIN(created_at) AS first_at, MAX(created_at) AS last_at FROM wallet_transactions GROUP BY status ORDER BY status",
  },
  {
    id: "create-decks",
    difficulty: "medium",
    db: "words",
    kind: "modify",
    title: { vi: "Tạo bảng bộ thẻ", en: "Create a decks table" },
    prompt: {
      vi: "Ứng dụng cần lưu **bộ thẻ từ vựng**. Tạo bảng `decks` với đúng ba cột, theo thứ tự:\n\n- `deck_id` — số nguyên, **khoá chính**\n- `name` — chuỗi, **bắt buộc** (không được `NULL`)\n- `level` — chuỗi, có thể bỏ trống\n\nBài được chấm bằng cách đọc cấu trúc bảng (`pragma_table_info`).",
      en: "The app needs to store **flashcard decks**. Create a table `decks` with exactly three columns, in order:\n\n- `deck_id` — integer, the **primary key**\n- `name` — text, **required** (not `NULL`)\n- `level` — text, optional\n\nIt is graded by reading the table's structure (`pragma_table_info`).",
    },
    hint: {
      vi: "`CREATE TABLE decks (deck_id INTEGER PRIMARY KEY, …);` — kiểu dữ liệu viết `INTEGER` và `TEXT`; ràng buộc bắt buộc là `NOT NULL`.",
      en: "`CREATE TABLE decks (deck_id INTEGER PRIMARY KEY, …);` — use the types `INTEGER` and `TEXT`; required is `NOT NULL`.",
    },
    explanation: {
      vi: "Trong SQLite, `INTEGER PRIMARY KEY` là bí danh của rowid: tự tăng khi bạn chèn mà không ghi `deck_id`. Thử thêm `UNIQUE` cho `name`, hay `DEFAULT 'A1'` cho `level`, và cột khoá ngoại `REFERENCES …`.",
      en: "In SQLite, `INTEGER PRIMARY KEY` aliases the rowid: it fills itself in when you insert without a `deck_id`. Try adding `UNIQUE` to `name`, `DEFAULT 'A1'` to `level`, or a foreign key column with `REFERENCES …`.",
    },
    concepts: ["CREATE TABLE", "PRIMARY KEY", "NOT NULL"],
    requires: [req("CREATE TABLE", /^CREATE TABLE\b/)],
    ordered: true,
    solution: `CREATE TABLE decks (
  deck_id INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  level   TEXT
);`,
    check: `SELECT name, UPPER(type) AS type, "notnull", pk FROM pragma_table_info('decks') ORDER BY cid`,
  },
  {
    id: "index-payments",
    difficulty: "medium",
    db: "fintech",
    kind: "modify",
    title: { vi: "Tạo chỉ mục cho thanh toán", en: "Index the payments table" },
    prompt: {
      vi: "Màn hình đối soát liên tục chạy `WHERE status = 'pending' AND created_at < …` trên bảng `payments`. Tạo **một chỉ mục** trên hai cột **`status` rồi `created_at`** (đúng thứ tự đó) để truy vấn này không phải quét cả bảng. Tên chỉ mục tuỳ bạn.\n\nBài được chấm bằng cách đọc danh sách cột của chỉ mục mới.",
      en: "A reconciliation screen keeps running `WHERE status = 'pending' AND created_at < …` on `payments`. Create **one index** on **`status` then `created_at`** (in that order) so it doesn't scan the whole table. Name it as you like.\n\nIt is graded by reading the new index's columns.",
    },
    hint: {
      vi: "`CREATE INDEX tên ON bảng (cột1, cột2);` — đặt cột so sánh bằng (`=`) trước, cột so sánh khoảng (`<`) sau.",
      en: "`CREATE INDEX name ON table (col1, col2);` — put the equality column (`=`) first, the range column (`<`) second.",
    },
    explanation: {
      vi: "Chỉ mục nhiều cột được sắp theo cột đầu, rồi đến cột sau trong cùng giá trị cột đầu — nên nó nhảy thẳng tới `status = 'pending'` rồi đọc một khoảng `created_at`. Thử `EXPLAIN QUERY PLAN SELECT …` trong trang luyện tập để xem SQLite dùng chỉ mục nào. Đổi lại, chỉ mục làm `INSERT`/`UPDATE` chậm hơn một chút.",
      en: "A multi-column index is sorted by the first column, then by the second within each first-column value — so it jumps straight to `status = 'pending'` and reads a range of `created_at`. Try `EXPLAIN QUERY PLAN SELECT …` in the playground to see which index SQLite picks. The trade-off: indexes make `INSERT`/`UPDATE` a little slower.",
    },
    concepts: ["CREATE INDEX", "composite index"],
    requires: [req("CREATE INDEX", /^CREATE (UNIQUE )?INDEX\b/)],
    ordered: true,
    solution: `CREATE INDEX idx_payments_status_created
ON payments (status, created_at);`,
    check: `SELECT i.seqno, i.name
FROM sqlite_master m, pragma_index_info(m.name) i
WHERE m.type = 'index' AND m.tbl_name = 'payments'
  AND m.name NOT IN ('idx_pay_customer', 'idx_pay_merchant')
ORDER BY i.seqno`,
  },

  // ------------------------------------------------------------------ hard
  {
    id: "best-approval-months",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Ba tháng duyệt nhiều nhất", en: "Top three approval months" },
    prompt: {
      vi: "Tính **tỉ lệ duyệt** từng tháng: số hồ sơ `status = 'approved'` chia cho tổng hồ sơ của tháng đó (theo `applied_at`), nhân 100, **làm tròn 1 chữ số**.\n\nTrả về **3 tháng có tỉ lệ cao nhất**: tháng dạng `'2026-05'` và tỉ lệ; sắp theo tỉ lệ giảm dần, bằng nhau thì theo tháng.\n\nViết bằng **CTE** (`WITH`): một bước tính số liệu theo tháng, một bước chọn tháng.",
      en: "Work out each month's **approval rate**: applications with `status = 'approved'` over all applications that month (by `applied_at`), times 100, **rounded to 1 decimal**.\n\nReturn the **3 months with the highest rate**: the month as `'2026-05'` and the rate, ordered by rate descending, then month.\n\nWrite it with a **CTE** (`WITH`): one step for the monthly numbers, one to pick months.",
    },
    hint: {
      vi: "`WITH monthly AS (SELECT … GROUP BY month) SELECT … FROM monthly ORDER BY … LIMIT 3;` — nhớ `100.0 *` để phép chia ra số thực, không phải chia nguyên.",
      en: "`WITH monthly AS (SELECT … GROUP BY month) SELECT … FROM monthly ORDER BY … LIMIT 3;` — use `100.0 *` so the division is decimal, not integer.",
    },
    explanation: {
      vi: "CTE đặt tên cho một bước trung gian, nên truy vấn đọc từ trên xuống như các bước tính. Trong SQLite, `200 / 447` cho `0` vì chia số nguyên; `100.0 * 200 / 447` cho `44.7…`.",
      en: "A CTE names an intermediate step, so the query reads top to bottom like a calculation. In SQLite `200 / 447` is `0` (integer division); `100.0 * 200 / 447` is `44.7…`.",
    },
    concepts: ["CTE (WITH)", "ratios"],
    requires: [req("WITH (CTE)", /^WITH\b/)],
    ordered: true,
    solution: `WITH monthly AS (
  SELECT strftime('%Y-%m', applied_at) AS month,
         COUNT(*)                         AS applications,
         SUM(status = 'approved')         AS approved
  FROM loan_applications
  GROUP BY month
)
SELECT month,
       ROUND(100.0 * approved / applications, 1) AS approval_rate_pct
FROM monthly
ORDER BY approval_rate_pct DESC, month
LIMIT 3;`,
  },
  {
    id: "top-loans-per-product",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Ba khoản vay lớn nhất mỗi sản phẩm", en: "Top three loans per product" },
    prompt: {
      vi: "Với **mỗi sản phẩm** (`loans.product`: `cash_loan`, `bnpl`), lấy **3 khoản vay có `principal` lớn nhất**. Bằng nhau thì khoản có `loan_id` nhỏ hơn đứng trước.\n\nTrả về `product`, `loan_id`, `principal` và thứ hạng (1–3); sắp theo `product` rồi thứ hạng.",
      en: "For **each product** (`loans.product`: `cash_loan`, `bnpl`), take the **3 loans with the largest `principal`**. On a tie, the smaller `loan_id` comes first.\n\nReturn `product`, `loan_id`, `principal` and the position (1–3), ordered by `product`, then position.",
    },
    hint: {
      vi: "`ROW_NUMBER() OVER (PARTITION BY product ORDER BY principal DESC, loan_id)` đánh số lại từ 1 trong mỗi sản phẩm. Hàm cửa sổ không dùng được trong `WHERE`, nên bọc nó trong truy vấn con hoặc CTE rồi lọc `rn <= 3`.",
      en: "`ROW_NUMBER() OVER (PARTITION BY product ORDER BY principal DESC, loan_id)` numbers from 1 within each product. Window functions can't go in `WHERE`, so wrap it in a subquery or CTE and filter `rn <= 3`.",
    },
    explanation: {
      vi: "Khác `GROUP BY`, hàm cửa sổ giữ nguyên mọi dòng và chỉ thêm một cột tính trên \"cửa sổ\" các dòng liên quan. `PARTITION BY` chia cửa sổ; `ORDER BY` trong `OVER` quyết định thứ tự đánh số. Đây là mẫu \"top N mỗi nhóm\" kinh điển.",
      en: "Unlike `GROUP BY`, a window function keeps every row and adds a column computed over a \"window\" of related rows. `PARTITION BY` splits the window; the `ORDER BY` inside `OVER` sets the numbering order. This is the classic top-N-per-group pattern.",
    },
    concepts: ["ROW_NUMBER", "PARTITION BY", "window functions"],
    requires: [req("ROW_NUMBER() OVER", /\bROW_NUMBER ?\( ?\) ?OVER\b/)],
    ordered: true,
    solution: `SELECT product, loan_id, principal, rn
FROM (
  SELECT product, loan_id, principal,
         ROW_NUMBER() OVER (PARTITION BY product ORDER BY principal DESC, loan_id) AS rn
  FROM loans
)
WHERE rn <= 3
ORDER BY product, rn;`,
  },
  {
    id: "category-leaders",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Đối tác dẫn đầu mỗi ngành", en: "Category leaders" },
    prompt: {
      vi: "Doanh thu của một đối tác là tổng `amount` của các thanh toán **`status = 'success'`**. Trong **mỗi ngành hàng** (`merchants.category`), đối tác nào có doanh thu **cao nhất**? (Nếu có đồng hạng nhất, lấy tất cả.)\n\nTrả về `category`, `merchant_name`, doanh thu; sắp theo `category`.",
      en: "A merchant's revenue is the total `amount` of its **`status = 'success'`** payments. In **each category** (`merchants.category`), which merchant has the **highest** revenue? (If several tie for first, return them all.)\n\nReturn `category`, `merchant_name` and the revenue, ordered by `category`.",
    },
    hint: {
      vi: "Bước 1: tổng doanh thu mỗi đối tác (`JOIN` + `GROUP BY`). Bước 2: `RANK() OVER (PARTITION BY category ORDER BY revenue DESC)`. Bước 3: giữ hạng 1.",
      en: "Step 1: revenue per merchant (`JOIN` + `GROUP BY`). Step 2: `RANK() OVER (PARTITION BY category ORDER BY revenue DESC)`. Step 3: keep rank 1.",
    },
    explanation: {
      vi: "Ba hàm xếp hạng khác nhau ở chỗ xử lý đồng hạng: với doanh thu 100, 100, 90 — `ROW_NUMBER` cho 1, 2, 3; `RANK` cho 1, 1, 3; `DENSE_RANK` cho 1, 1, 2. \"Lấy tất cả đồng hạng nhất\" là việc của `RANK` hoặc `DENSE_RANK`.",
      en: "The three ranking functions differ on ties: for revenues 100, 100, 90 — `ROW_NUMBER` gives 1, 2, 3; `RANK` gives 1, 1, 3; `DENSE_RANK` gives 1, 1, 2. \"Return every first-place tie\" is a job for `RANK` or `DENSE_RANK`.",
    },
    concepts: ["RANK / DENSE_RANK", "window functions", "CTE"],
    requires: [req("RANK() / DENSE_RANK() OVER", /\b(DENSE_)?RANK ?\( ?\) ?OVER\b/)],
    ordered: true,
    solution: `WITH totals AS (
  SELECT m.category, m.merchant_name, SUM(p.amount) AS revenue
  FROM payments p
  JOIN merchants m ON m.merchant_id = p.merchant_id
  WHERE p.status = 'success'
  GROUP BY m.merchant_id
),
ranked AS (
  SELECT *, RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
  FROM totals
)
SELECT category, merchant_name, revenue
FROM ranked
WHERE rnk = 1
ORDER BY category;`,
  },
  {
    id: "month-over-month",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Tăng giảm so với tháng trước", en: "Month over month" },
    prompt: {
      vi: "Đếm số khoản vay giải ngân mỗi tháng (`disbursed_date`) và **chênh lệch so với tháng liền trước** (tháng này trừ tháng trước). Tháng đầu tiên không có tháng trước nên chênh lệch là `NULL`.\n\nTrả về tháng dạng `'2025-01'`, số khoản vay, chênh lệch; sắp theo tháng.",
      en: "Count the loans disbursed each month (`disbursed_date`) and the **change from the month before** (this month minus last month). The first month has nothing before it, so its change is `NULL`.\n\nReturn the month as `'2025-01'`, the loans and the change, ordered by month.",
    },
    hint: {
      vi: "`LAG(loans) OVER (ORDER BY month)` lấy giá trị của dòng trước. Đếm theo tháng trong một CTE trước, rồi áp `LAG` lên kết quả đó.",
      en: "`LAG(loans) OVER (ORDER BY month)` reads the previous row's value. Count per month in a CTE first, then apply `LAG` to that.",
    },
    explanation: {
      vi: "`LAG` nhìn về sau, `LEAD` nhìn về trước; cả hai nhận thêm độ lệch và giá trị mặc định: `LAG(x, 12, 0)` so với cùng kỳ năm trước. Chỉ đúng khi không có tháng nào bị thiếu — nếu có, hãy tạo lịch đủ tháng trước (xem bài CTE đệ quy).",
      en: "`LAG` looks back, `LEAD` looks ahead; both take an offset and a default: `LAG(x, 12, 0)` compares with the same month last year. It's only right when no month is missing — if one might be, build a full calendar first (see the recursive CTE challenge).",
    },
    concepts: ["LAG", "window functions"],
    requires: [req("LAG() / LEAD()", /\b(LAG|LEAD) ?\(/)],
    ordered: true,
    solution: `WITH m AS (
  SELECT strftime('%Y-%m', disbursed_date) AS month, COUNT(*) AS loans
  FROM loans
  GROUP BY month
)
SELECT month, loans,
       loans - LAG(loans) OVER (ORDER BY month) AS change
FROM m
ORDER BY month;`,
  },
  {
    id: "cumulative-disbursement",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Giải ngân luỹ kế", en: "Cumulative disbursement" },
    prompt: {
      vi: "Với mỗi tháng (`disbursed_date`), tính tổng `principal` giải ngân trong tháng và **tổng luỹ kế** từ tháng đầu tiên tới tháng đó.\n\nTrả về tháng dạng `'2025-01'`, tổng trong tháng, tổng luỹ kế; sắp theo tháng.",
      en: "For each month (`disbursed_date`), give the `principal` disbursed that month and the **running total** from the first month up to it.\n\nReturn the month as `'2025-01'`, the month's total and the running total, ordered by month.",
    },
    hint: {
      vi: "`SUM(principal) OVER (ORDER BY month)` cộng dồn mọi dòng từ đầu tới dòng hiện tại.",
      en: "`SUM(principal) OVER (ORDER BY month)` adds up every row from the start to the current one.",
    },
    explanation: {
      vi: "Khi có `ORDER BY` trong `OVER`, khung mặc định là \"từ đầu tới dòng hiện tại\". Đổi khung để có trung bình trượt: `AVG(x) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` là trung bình 3 tháng.",
      en: "With an `ORDER BY` inside `OVER`, the default frame is \"from the start to the current row\". Change the frame for a moving average: `AVG(x) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` averages 3 months.",
    },
    concepts: ["SUM() OVER", "running total", "window frames"],
    requires: [req("SUM(…) OVER", /\bSUM ?\([^()]*\) ?OVER\b/)],
    ordered: true,
    solution: `WITH m AS (
  SELECT strftime('%Y-%m', disbursed_date) AS month, SUM(principal) AS principal
  FROM loans
  GROUP BY month
)
SELECT month, principal,
       SUM(principal) OVER (ORDER BY month) AS cumulative_principal
FROM m
ORDER BY month;`,
  },
  {
    id: "loyal-good-borrowers",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Khách quay lại, chưa từng nợ xấu", en: "Returning, never defaulted" },
    prompt: {
      vi: "Đếm khách hàng thoả **cả ba**:\n\n- có hồ sơ vay nộp **trong năm 2025** (`applied_at < '2026-01-01'`),\n- **và** có hồ sơ nộp **từ 2026** (`applied_at >= '2026-01-01'`),\n- **nhưng không** có khoản vay nào `status = 'defaulted'`.\n\nGiải bằng phép toán tập hợp: `INTERSECT` và `EXCEPT`. Trả về một dòng, một cột: số khách hàng.",
      en: "Count the customers who meet **all three**:\n\n- applied for a loan **in 2025** (`applied_at < '2026-01-01'`),\n- **and** applied **from 2026** (`applied_at >= '2026-01-01'`),\n- **but** have no loan with `status = 'defaulted'`.\n\nSolve it with set operators: `INTERSECT` and `EXCEPT`. Return one row with one column: the number of customers.",
    },
    hint: {
      vi: "`A INTERSECT B` giữ phần chung, `A EXCEPT C` bỏ những gì có trong C. Mỗi vế là một `SELECT customer_id …`. Bọc cả chuỗi trong `SELECT COUNT(*) FROM ( … )`.",
      en: "`A INTERSECT B` keeps what both have; `A EXCEPT C` drops what C has. Each part is a `SELECT customer_id …`. Wrap the chain in `SELECT COUNT(*) FROM ( … )`.",
    },
    explanation: {
      vi: "Phép toán tập hợp chạy từ trái sang phải: `(A INTERSECT B) EXCEPT C`. Chúng tự bỏ trùng như `UNION`. Cùng câu hỏi có thể viết bằng `EXISTS` / `NOT EXISTS` — cách nào dễ đọc hơn tuỳ tình huống.",
      en: "Set operators run left to right: `(A INTERSECT B) EXCEPT C`. Like `UNION`, they remove duplicates. The same question can be written with `EXISTS` / `NOT EXISTS` — pick whichever reads better.",
    },
    concepts: ["INTERSECT", "EXCEPT"],
    requires: [req("INTERSECT", /\bINTERSECT\b/), req("EXCEPT", /\bEXCEPT\b/)],
    ordered: false,
    solution: `SELECT COUNT(*) AS customers
FROM (
  SELECT customer_id FROM loan_applications WHERE applied_at <  '2026-01-01'
  INTERSECT
  SELECT customer_id FROM loan_applications WHERE applied_at >= '2026-01-01'
  EXCEPT
  SELECT customer_id FROM loans WHERE status = 'defaulted'
);`,
  },
  {
    id: "otp-outage-calendar",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Lịch sự cố OTP tháng 5", en: "The May OTP outage, day by day" },
    prompt: {
      vi: "Tháng 5/2026 có sự cố mã OTP. Với **từng ngày từ 1/5 đến 31/5/2026**, đếm số thanh toán thất bại vì `failure_reason = 'otp_timeout'` (theo ngày của `created_at`). **Ngày không có lỗi nào vẫn phải xuất hiện với số 0.**\n\nTrả về ngày dạng `'2026-05-01'` và số lỗi — đủ 31 dòng, sắp theo ngày.",
      en: "May 2026 had an OTP outage. For **every day from 2026-05-01 to 2026-05-31**, count the payments that failed with `failure_reason = 'otp_timeout'` (by the date of `created_at`). **Days with no failures must still appear, with 0.**\n\nReturn the day as `'2026-05-01'` and the count — all 31 rows, ordered by day.",
    },
    hint: {
      vi: "`GROUP BY` chỉ tạo dòng cho ngày có dữ liệu. Hãy sinh lịch bằng CTE đệ quy: `WITH RECURSIVE days(day) AS (SELECT '2026-05-01' UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < '2026-05-31')`, rồi `LEFT JOIN` thanh toán vào lịch.",
      en: "`GROUP BY` only makes rows for days that have data. Generate the calendar with a recursive CTE: `WITH RECURSIVE days(day) AS (SELECT '2026-05-01' UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < '2026-05-31')`, then `LEFT JOIN` the payments onto it.",
    },
    explanation: {
      vi: "CTE đệ quy gồm phần neo (`SELECT '2026-05-01'`) và phần lặp tham chiếu chính nó, dừng khi `WHERE` sai. Điều kiện `failure_reason = 'otp_timeout'` phải nằm trong `ON` chứ không phải `WHERE` — đặt ở `WHERE` sẽ loại các ngày không có lỗi. Đếm `COUNT(p.payment_id)` (không phải `COUNT(*)`) để ngày trống ra 0.",
      en: "A recursive CTE has an anchor (`SELECT '2026-05-01'`) and a step that refers to itself, stopping when its `WHERE` fails. The `failure_reason = 'otp_timeout'` test must sit in the `ON`, not the `WHERE` — in `WHERE` it would drop the empty days. Count `COUNT(p.payment_id)` (not `COUNT(*)`) so empty days give 0.",
    },
    concepts: ["WITH RECURSIVE", "LEFT JOIN", "date()"],
    requires: [req("WITH RECURSIVE", /\bWITH RECURSIVE\b/), req("LEFT JOIN", /\bLEFT (OUTER )?JOIN\b/)],
    ordered: true,
    solution: `WITH RECURSIVE days(day) AS (
  SELECT '2026-05-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '2026-05-31'
)
SELECT d.day, COUNT(p.payment_id) AS otp_timeouts
FROM days d
LEFT JOIN payments p
       ON date(p.created_at) = d.day
      AND p.failure_reason = 'otp_timeout'
GROUP BY d.day
ORDER BY d.day;`,
  },
  {
    id: "score-quartiles",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Tứ phân vị điểm tín dụng", en: "Credit score quartiles" },
    prompt: {
      vi: "Lấy các hồ sơ vay **có** `credit_score`. Sắp theo `credit_score` (bằng điểm thì theo `application_id`) rồi chia thành **4 nhóm đều nhau** (tứ phân vị). Với mỗi nhóm:\n\n- số thứ tự nhóm (1–4),\n- số hồ sơ,\n- điểm thấp nhất, điểm cao nhất,\n- tỉ lệ duyệt `status = 'approved'` theo %, **làm tròn 1 chữ số**.\n\nSắp theo nhóm.",
      en: "Take the loan applications that **have** a `credit_score`. Sort by `credit_score` (ties by `application_id`) and split them into **4 equal groups** (quartiles). For each group give:\n\n- the group number (1–4),\n- the number of applications,\n- the lowest and highest score,\n- the approval rate (`status = 'approved'`) in %, **rounded to 1 decimal**.\n\nOrder by group.",
    },
    hint: {
      vi: "`NTILE(4) OVER (ORDER BY credit_score, application_id)` gán mỗi dòng vào nhóm 1–4. Tính nó trong CTE, rồi `GROUP BY` theo nhóm.",
      en: "`NTILE(4) OVER (ORDER BY credit_score, application_id)` puts each row in group 1–4. Compute it in a CTE, then `GROUP BY` the group.",
    },
    explanation: {
      vi: "Kết quả kể một câu chuyện: nhóm điểm thấp nhất được duyệt ít hơn hẳn — đúng như một ngưỡng cắt điểm. `NTILE` chia số dòng đều nhau (chênh nhau tối đa 1), nên ranh giới nhóm có thể rơi giữa hai hồ sơ cùng điểm — vì vậy cần thứ tự phụ `application_id`.",
      en: "The result tells a story: the lowest-score group is approved far less — exactly what a score cut-off does. `NTILE` splits the row count evenly (sizes differ by at most 1), so a boundary can fall between two applications with the same score — hence the `application_id` tie-break.",
    },
    concepts: ["NTILE", "window functions", "CTE"],
    requires: [req("NTILE", /\bNTILE ?\(/)],
    ordered: true,
    solution: `WITH scored AS (
  SELECT credit_score, status,
         NTILE(4) OVER (ORDER BY credit_score, application_id) AS quartile
  FROM loan_applications
  WHERE credit_score IS NOT NULL
)
SELECT quartile,
       COUNT(*)          AS applications,
       MIN(credit_score) AS min_score,
       MAX(credit_score) AS max_score,
       ROUND(100.0 * SUM(status = 'approved') / COUNT(*), 1) AS approval_rate_pct
FROM scored
GROUP BY quartile
ORDER BY quartile;`,
  },
  {
    id: "disbursal-view",
    difficulty: "hard",
    db: "fintech",
    kind: "modify",
    title: { vi: "View giải ngân theo tháng", en: "A monthly disbursal view" },
    prompt: {
      vi: "Báo cáo nào cũng cần số giải ngân theo tháng. Tạo **view** tên `v_monthly_disbursal` với ba cột:\n\n- `month` — dạng `'2025-01'` (theo `disbursed_date`)\n- `loans` — số khoản vay\n- `principal` — tổng `principal`\n\nBài được chấm bằng `SELECT * FROM v_monthly_disbursal ORDER BY month`.",
      en: "Every report needs monthly disbursals. Create a **view** named `v_monthly_disbursal` with three columns:\n\n- `month` — as `'2025-01'` (from `disbursed_date`)\n- `loans` — the number of loans\n- `principal` — the total `principal`\n\nIt is graded with `SELECT * FROM v_monthly_disbursal ORDER BY month`.",
    },
    hint: {
      vi: "`CREATE VIEW tên AS SELECT …;` — tên cột của view lấy từ bí danh trong `SELECT`, nên đặt đúng `month`, `loans`, `principal`.",
      en: "`CREATE VIEW name AS SELECT …;` — the view's column names come from the `SELECT` aliases, so call them `month`, `loans`, `principal`.",
    },
    explanation: {
      vi: "View là một truy vấn được đặt tên: không lưu dữ liệu, mỗi lần đọc lại chạy truy vấn gốc, nên luôn mới. Nó giúp mọi báo cáo dùng chung một định nghĩa. Muốn lưu kết quả thật thì dùng `CREATE TABLE … AS SELECT …` (nhưng phải tự làm mới).",
      en: "A view is a named query: it stores no data and re-runs on every read, so it's always current. It gives every report the same definition. To store the result itself, use `CREATE TABLE … AS SELECT …` (which you then have to refresh).",
    },
    concepts: ["CREATE VIEW"],
    requires: [req("CREATE VIEW", /^CREATE VIEW\b/)],
    ordered: true,
    solution: `CREATE VIEW v_monthly_disbursal AS
SELECT strftime('%Y-%m', disbursed_date) AS month,
       COUNT(*)                          AS loans,
       SUM(principal)                    AS principal
FROM loans
GROUP BY month;`,
    check: "SELECT * FROM v_monthly_disbursal ORDER BY month",
  },
  {
    id: "upsert-adverb",
    difficulty: "hard",
    db: "words",
    kind: "modify",
    title: { vi: "Thêm hoặc cập nhật (upsert)", en: "Insert or update (upsert)" },
    prompt: {
      vi: "Một tiến trình đồng bộ gửi tới dòng loại từ `(4, 'adv', 'adverb', 'phó từ')`. Nếu `code` chưa có thì thêm mới; **nếu đã có thì chỉ cập nhật `name_vi`**. Ở đây `'adv'` đã tồn tại với tên `'trạng từ'`.\n\nViết **một câu `INSERT … ON CONFLICT`** (không dùng `UPDATE`). Bài được chấm bằng cách xem lại bảng `parts_of_speech`.",
      en: "A sync job sends the part of speech `(4, 'adv', 'adverb', 'phó từ')`. If the `code` is new, insert it; **if it exists, only update `name_vi`**. Here `'adv'` already exists, named `'trạng từ'`.\n\nWrite **one `INSERT … ON CONFLICT`** statement (no `UPDATE`). It is graded by reading `parts_of_speech` back.",
    },
    hint: {
      vi: "`INSERT INTO … VALUES (…) ON CONFLICT(code) DO UPDATE SET name_vi = excluded.name_vi;` — `excluded` là dòng bạn vừa định chèn. `ON CONFLICT` cần cột có ràng buộc `UNIQUE` (ở đây là `code`).",
      en: "`INSERT INTO … VALUES (…) ON CONFLICT(code) DO UPDATE SET name_vi = excluded.name_vi;` — `excluded` is the row you tried to insert. `ON CONFLICT` needs a `UNIQUE` column (here `code`).",
    },
    explanation: {
      vi: "Upsert gộp \"kiểm tra rồi thêm hoặc sửa\" thành một câu, nên không bị lỗi khi hai tiến trình cùng chạy. `DO NOTHING` thay cho `DO UPDATE` sẽ bỏ qua dòng trùng. PostgreSQL dùng cú pháp giống hệt; MySQL viết `ON DUPLICATE KEY UPDATE`.",
      en: "An upsert turns \"check, then insert or update\" into one statement, so two jobs running at once can't trip over each other. `DO NOTHING` instead of `DO UPDATE` skips duplicates. PostgreSQL uses the same syntax; MySQL writes `ON DUPLICATE KEY UPDATE`.",
    },
    concepts: ["UPSERT", "ON CONFLICT"],
    requires: [req("INSERT … ON CONFLICT", /^INSERT\b[\s\S]*\bON CONFLICT\b/)],
    ordered: true,
    solution: `INSERT INTO parts_of_speech (id, code, name_en, name_vi)
VALUES (4, 'adv', 'adverb', 'phó từ')
ON CONFLICT(code) DO UPDATE SET name_vi = excluded.name_vi;`,
    check: "SELECT * FROM parts_of_speech ORDER BY id",
  },
  {
    id: "loans-vs-top-ups",
    difficulty: "hard",
    db: "fintech",
    kind: "query",
    title: { vi: "Khoản vay và nạp ví theo tháng", en: "Loans vs wallet top-ups by month" },
    prompt: {
      vi: "So sánh hai dòng tiền theo tháng:\n\n- số khoản vay giải ngân (`loans.disbursed_date`),\n- số lần nạp ví **thành công** (`wallet_transactions`, `txn_type = 'top_up'`, `status = 'success'`, theo `created_at`).\n\nVí có dữ liệu từ trước khi bắt đầu cho vay, nên **mỗi bên có những tháng mà bên kia không có**. Trả về **mọi tháng xuất hiện ở bất kỳ bên nào**: tháng dạng `'2024-10'`, số khoản vay, số lần nạp — tháng không có dữ liệu ở một bên thì ghi `0`. Sắp theo tháng.",
      en: "Compare two flows by month:\n\n- loans disbursed (`loans.disbursed_date`),\n- **successful** wallet top-ups (`wallet_transactions`, `txn_type = 'top_up'`, `status = 'success'`, by `created_at`).\n\nThe wallet started before lending did, so **each side has months the other doesn't**. Return **every month that appears on either side**: the month as `'2024-10'`, the loans and the top-ups — `0` where a side has nothing. Order by month.",
    },
    hint: {
      vi: "Tính hai bảng theo tháng trong hai CTE, rồi `FULL OUTER JOIN` chúng theo tháng. Tháng có thể nằm ở bên này hoặc bên kia: `COALESCE(l.month, t.month)`.",
      en: "Compute the two monthly tables in two CTEs, then `FULL OUTER JOIN` them on month. The month may come from either side: `COALESCE(l.month, t.month)`.",
    },
    explanation: {
      vi: "`LEFT JOIN` giữ mọi dòng bên trái, `RIGHT JOIN` giữ bên phải, `FULL OUTER JOIN` giữ cả hai — bên thiếu điền `NULL`, và `COALESCE` đổi `NULL` thành 0. SQLite hỗ trợ `RIGHT` và `FULL` từ bản 3.39.",
      en: "`LEFT JOIN` keeps every left row, `RIGHT JOIN` every right row, `FULL OUTER JOIN` both — the missing side becomes `NULL`, which `COALESCE` turns into 0. SQLite supports `RIGHT` and `FULL` since 3.39.",
    },
    concepts: ["FULL OUTER JOIN", "COALESCE", "CTE"],
    requires: [req("FULL OUTER JOIN", /\bFULL (OUTER )?JOIN\b/)],
    ordered: true,
    solution: `WITH l AS (
  SELECT strftime('%Y-%m', disbursed_date) AS month, COUNT(*) AS loans
  FROM loans
  GROUP BY month
),
t AS (
  SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS top_ups
  FROM wallet_transactions
  WHERE txn_type = 'top_up' AND status = 'success'
  GROUP BY month
)
SELECT COALESCE(l.month, t.month) AS month,
       COALESCE(l.loans, 0)       AS loans,
       COALESCE(t.top_ups, 0)     AS top_ups
FROM l
FULL OUTER JOIN t ON t.month = l.month
ORDER BY month;`,
  },
];

const BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export function getChallenge(id: string): SqlChallenge | undefined {
  return BY_ID.get(id);
}

export function toPublic(challenge: SqlChallenge): PublicChallenge {
  const { id, difficulty, db, kind, title, prompt, hint, concepts, ordered } = challenge;

  return { id, number: CHALLENGES.indexOf(challenge) + 1, difficulty, db, kind, title, prompt, hint, concepts, ordered };
}
