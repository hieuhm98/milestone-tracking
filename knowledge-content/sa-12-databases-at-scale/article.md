# Database ở quy mô lớn – Index, Replication, Sharding & Đánh đổi

## 1. Vì sao database là nút thắt cổ chai

App server là **phi trạng thái** (stateless); database thì giữ **trạng thái** (state) — thứ rất khó sao chép, chia nhỏ và giữ nhất quán. Trước hết hãy gọi đúng tên áp lực: query chậm, quá nhiều connection, tải đọc, tải ghi hay dung lượng dữ liệu. Mỗi nấc thang mua thêm năng lực nhưng cộng thêm độ phức tạp vĩnh viễn:

```text
 complexity
   ^                                          [6] shard across nodes
   |                                [5] partition big tables
   |                     [4] read replicas
   |           [3] cache hot reads
   |    [2] connection pooling
   | [1] indexes, fix queries, scale up
   +---------------------------------------------------------> load
```

Một instance PostgreSQL hay MySQL được tinh chỉnh tốt xử lý được hàng nghìn transaction đơn giản mỗi giây. Sharding là bước **cuối cùng**, không phải bước đầu tiên.

---

## 2. Các họ SQL và NoSQL

"SQL hay NoSQL" là câu hỏi quá thô; hãy hỏi workload có **mô hình dữ liệu và kiểu truy cập** (access pattern) nào.

| Họ | Điểm mạnh | Điểm yếu | Ví dụ (AWS) |
|---|---|---|---|
| Quan hệ (relational) | SQL tuỳ ý, join, transaction | Scale ghi theo chiều ngang khó | PostgreSQL, MySQL (RDS, Aurora) |
| Key-value | Độ trễ ms ổn định ở quy mô cực lớn | Chỉ truy cập theo key | Redis, DynamoDB |
| Document | Schema linh hoạt, một lần đọc cho cả aggregate | Join yếu, dữ liệu trùng lặp | MongoDB (DocumentDB) |
| Wide-column | Ghi cực nhiều, nhiều data center | Phải thiết kế query từ đầu | Cassandra (Keyspaces) |
| Graph | Quan hệ nhiều bước nhảy | Chuyên biệt, khó shard | Neo4j (Neptune) |
| Search | Tìm kiếm full-text, độ liên quan | Không phải nguồn dữ liệu gốc | OpenSearch |
| Distributed SQL | SQL cộng scale ngang | Độ trễ ghi, chi phí | Spanner, CockroachDB |

Thiết kế quan hệ là **mô hình hoá dữ liệu, rồi query kiểu gì cũng được**. Thiết kế DynamoDB/Cassandra là **mô hình hoá query, rồi nặn dữ liệu cho vừa** — **phi chuẩn hoá** (denormalised) và nhanh, nhưng một access pattern mới có thể đòi migration dữ liệu.

Port mặc định: PostgreSQL `5432`, MySQL `3306`, SQL Server `1433`, MongoDB `27017`, Cassandra `9042`.

---

## 3. Index B-tree

Không có index, engine phải quét mọi dòng: O(n). **B-tree** (thực chất là B+tree) giữ key đã sắp xếp trong các **trang** (page) — 8 KB ở PostgreSQL, 16 KB ở InnoDB. Mỗi trang chứa hàng trăm key, nên 3–4 tầng đủ cho hàng trăm triệu dòng và một lần tra cứu là **O(log n)**:

```text
                  [ 100 | 500 ]                 root
               /        |        \
       [ 20 | 60 ]  [ 200 | 350 ]  [ 700 | 900 ]  internal
        /  |  \       /  |  \        /  |  \
      leaf<->leaf<->leaf<->leaf<->leaf<->leaf    sorted, linked leaves: key -> row
```

Các lá đã sắp xếp và nối với nhau phục vụ được `=`, truy vấn khoảng, `ORDER BY` và `LIKE 'ab%'` theo tiền tố. **Index ghép** (composite index) tuân theo **quy tắc tiền tố trái nhất** (leftmost prefix) — đặt cột so sánh bằng trước, rồi mới đến cột khoảng/sắp xếp:

```sql
CREATE INDEX orders_cust_created_idx ON orders (customer_id, created_at);

-- Uses the index: equality on column 1, range + sort on column 2
SELECT id, total FROM orders
WHERE customer_id = 42 AND created_at >= '2026-01-01'
ORDER BY created_at DESC LIMIT 20;

-- Cannot use it efficiently: the leading column is missing
SELECT id FROM orders WHERE created_at >= '2026-01-01';
```

- **Covering index:** nếu index chứa đủ mọi cột query cần (PostgreSQL `INCLUDE`), bạn có index-only scan, không cần đụng tới bảng.
- **InnoDB là clustered:** dòng dữ liệu nằm ngay trong cây primary key, nên key UUIDv4 ngẫu nhiên gây tách trang (page split).
- **Index tốn chi phí ghi:** mỗi `INSERT`/`UPDATE` phải cập nhật mọi index.
- **Những thứ vô hiệu hoá index:** hàm bọc quanh cột (`lower(email)` cần expression index), `LIKE '%x'`, ép kiểu ngầm, cột có độ chọn lọc thấp (selectivity thấp).

---

## 4. Đọc query plan

`EXPLAIN` cho thấy **kế hoạch thực thi** (query plan) dự kiến; `EXPLAIN ANALYZE` chạy thật câu query và cho thời gian thực (nó thực sự thực thi cả lệnh DML).

```text
EXPLAIN ANALYZE SELECT id, total FROM orders WHERE customer_id = 42;

Seq Scan on orders  (cost=0.00..172500.00 rows=3 width=16) (actual time=0.015..912.300 rows=3 loops=1)
  Filter: (customer_id = 42)
  Rows Removed by Filter: 4999997

-- after adding the index
Index Scan using orders_cust_created_idx on orders  (cost=0.43..12.61 rows=3 width=16) (actual time=0.031..0.045 rows=3 loops=1)
  Index Cond: (customer_id = 42)
```

| Dấu hiệu | Ý nghĩa |
|---|---|
| `Seq Scan` + `Rows Removed by Filter` rất lớn | Thiếu index hoặc index không dùng được |
| `Index Only Scan` | Index bao phủ toàn bộ query |
| `Nested Loop` trên rất nhiều dòng ngoài | Có lẽ nên là `Hash Join` |
| `rows` ước lượng lệch xa thực tế | Thống kê cũ: chạy `ANALYZE` |

Seq scan là đúng khi query trả về phần lớn bảng. Vấn đề thực tế phổ biến nhất là **N+1 query**: ORM tải 100 order, rồi chạy thêm một query cho mỗi customer. Sửa bằng join hoặc `WHERE id IN (...)`; tìm thủ phạm bằng `pg_stat_statements` hoặc slow query log của MySQL.

---

## 5. ACID và MVCC

| Chữ | Đảm bảo | Cơ chế |
|---|---|---|
| Atomicity (nguyên tử) | Tất cả hoặc không gì cả | Write-ahead log + rollback |
| Consistency (nhất quán) | Ràng buộc vẫn đúng sau commit | FK/unique/check; app giữ quy tắc nghiệp vụ |
| Isolation (cô lập) | Không bị xen ngang bởi việc chạy đồng thời | Lock, MVCC |
| Durability (bền vững) | Commit sống sót sau crash | `fsync` WAL trước khi xác nhận |

**Nhật ký ghi trước** (write-ahead log – WAL) được ghi nối và flush xuống đĩa trước khi trang dữ liệu thay đổi; sau crash nó được phát lại, và chính luồng này nuôi replication. **MVCC** (multi-version concurrency control) giữ nhiều phiên bản của một dòng để người đọc và người ghi không chặn nhau; cái giá là dọn dẹp (`VACUUM` trong PostgreSQL), và transaction chạy quá lâu sẽ chặn việc dọn dẹp đó.

Race condition kinh điển là đọc–sửa–ghi: hai request cùng đọc số dư 500 và cùng ghi 400. Cách sửa:

```sql
-- 1. Atomic statement
UPDATE accounts SET balance = balance - 100 WHERE id = 1 AND balance >= 100;

-- 2. Pessimistic lock
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- 3. Optimistic lock: retry when 0 rows are updated
UPDATE accounts SET balance = 400, version = 8 WHERE id = 1 AND version = 7;
```

---

## 6. Các mức cô lập

Các **bất thường** (anomaly): **dirty read** (đọc dữ liệu chưa commit), **non-repeatable read** (một dòng đổi giá trị giữa hai lần đọc), **phantom** (dòng mới xuất hiện trong một khoảng), **write skew** (hai transaction đọc cùng dữ kiện, mỗi bên sửa một dòng khác nhau, gộp lại phá vỡ một quy tắc).

| Mức | Dirty | Non-repeatable | Phantom (theo chuẩn) |
|---|---|---|---|
| Read Uncommitted | có | có | có |
| Read Committed | không | có | có |
| Repeatable Read | không | không | có |
| Serializable | không | không | không |

Engine thật khác với chuẩn — câu hỏi phỏng vấn rất hay gặp:

- **PostgreSQL, SQL Server, Oracle** mặc định **Read Committed**. **MySQL InnoDB** mặc định **Repeatable Read**.
- Repeatable Read của PostgreSQL là snapshot isolation: không có phantom, nhưng **vẫn có thể write skew**. Serializable (SSI) của nó huỷ transaction xung đột bằng lỗi serialization failure, nên app **bắt buộc phải retry**.

Ví dụ write skew: hai bác sĩ đang trực, quy tắc là "ít nhất một người trực". Mỗi người kiểm tra "vẫn còn người khác trực" rồi xin nghỉ; dưới snapshot isolation cả hai đều commit. Sửa bằng Serializable hoặc `SELECT ... FOR UPDATE` trên các dòng mà quyết định dựa vào.

---

## 7. Replication

```text
   app --- writes + reads ---> [ Leader ] --- WAL / binlog stream ---+
    |                                                                 |
    +----- reads ------------> [ Follower 1 ] <-----------------------+
    +----- reads ------------> [ Follower 2 ] <-----------------------+
```

**Leader–follower** (một leader) là mặc định của PostgreSQL, MySQL và MongoDB replica set: một node nhận ghi và stream log của nó sang các node còn lại.

| Chế độ | Leader chờ | Đánh đổi |
|---|---|---|
| Bất đồng bộ (async) | Không chờ ai | Nhanh; failover có thể mất các commit gần nhất |
| Đồng bộ (sync) | Một follower xác nhận | Không mất dữ liệu; commit chậm hơn, standby chậm làm nghẽn ghi |
| Bán đồng bộ (MySQL semi-sync) | Một replica xác nhận đã nhận | Trung gian; quay về async khi hết timeout |

**Failover** nâng một follower lên làm leader; phải chống **split brain** (leader cũ vẫn nhận ghi) bằng fencing. Failover của RDS Multi-AZ thường mất 60–120 giây.

- **Multi-leader:** ghi ở nhiều region, xung đột phải được giải quyết (last-write-wins, CRDT). Chỉ dùng khi thật sự cần ghi cục bộ ở từng region.
- **Leaderless** (Cassandra, kiểu Dynamo): ghi vào `N` node, chờ `W` xác nhận, đọc từ `R` node. Nếu **`W + R > N`** thì tập đọc chồng lên tập ghi mới nhất (`N=3, W=2, R=2`).

Aurora giữ 6 bản sao trên 3 AZ (quorum ghi 4/6, đọc 3/6) và hỗ trợ tối đa 15 read replica dùng chung storage.

---

## 8. Read replica và độ trễ replication

Đưa lệnh đọc sang follower, lệnh ghi sang leader. Follower async luôn **trễ** (replication lag): thường vài mili giây, nhưng có thể vài giây hoặc hơn khi ghi dồn dập hay chạy migration lớn.

```text
t=0 ms   user renames profile   -> leader commits "Lan"
t=5 ms   page reload hits replica -> still "Linh"   (stale)
t=40 ms  replica replays WAL    -> "Lan"
```

| Đảm bảo | Cách hiện thực |
|---|---|
| Read-your-writes (đọc được chính thứ mình vừa ghi) | Đọc từ leader vài giây sau khi ghi, hoặc chờ replica bắt kịp LSN/GTID của lần ghi đó |
| Monotonic reads (không "lùi thời gian") | Gắn cố định session vào một replica |

```sql
-- PostgreSQL primary: lag per standby
SELECT client_addr, write_lag, flush_lag, replay_lag FROM pg_stat_replication;
-- PostgreSQL replica
SELECT now() - pg_last_xact_replay_timestamp() AS replay_lag;
```

MySQL: `SHOW REPLICA STATUS`, trường `Seconds_Behind_Source`. Replica **không** giúp scale ghi, và replica **không phải bản backup** — lệnh `DROP TABLE` cũng được replicate sang.

---

## 9. Partitioning và sharding

| | Partitioning (phân vùng) | Sharding (phân mảnh) |
|---|---|---|
| Ở đâu | Bên trong một database | Trải trên nhiều database |
| Giải quyết | Bảng khổng lồ, xoá dữ liệu cũ, kích thước index | Thông lượng ghi, dữ liệu vượt một node |
| App phải đổi | Không | Định tuyến; join/transaction xuyên shard rất khó |

```sql
CREATE TABLE events (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL,
  payload    jsonb,
  PRIMARY KEY (id, created_at)  -- must include the partition key
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_09 PARTITION OF events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
```

Planner bỏ qua các partition không liên quan (**partition pruning**), và drop một partition cũ thay cho một lệnh `DELETE` khổng lồ.

| Cách chia | Giỏi ở | Rủi ro |
|---|---|---|
| Range (theo khoảng) | Truy vấn khoảng, xoá theo thời gian | Khoảng mới nhất thành điểm nóng |
| Hash (`hash(key) mod N`) | Phân bố đều | Query khoảng phải hỏi mọi shard; đổi N làm dời hầu hết key |
| Consistent hashing | Thêm node chỉ dời ~1/N key | Phức tạp hơn |
| Directory (bảng tra) | Đặt dữ liệu linh hoạt | Bảng tra thành phụ thuộc sống còn |

---

## 10. Shard key

```text
        app -> router (Vitess, Citus, mongos, or a library)
                   |  shard = hash(tenant_id) mod 4
      +------------+------------+------------+
      v            v            v            v
   [shard 0]    [shard 1]    [shard 2]    [shard 3]   each: leader + replicas
```

Một **shard key** tốt có **cardinality cao** (nhiều giá trị khác nhau), **tải đều**, **xuất hiện trong các query nóng** (một request chỉ chạm một shard), và **hiếm khi thay đổi**.

| Ứng viên | Nhận xét |
|---|---|
| `tenant_id` (SaaS B2B) | Thường rất tốt; tenant khổng lồ thì tách ra shard riêng |
| `created_at` | Tệ: mọi lệnh ghi mới dồn vào một shard |
| `country` | Tệ: cardinality thấp, lệch nặng |

Chi phí vĩnh viễn: query scatter-gather (rải ra mọi shard rồi gom lại), transaction xuyên shard (two-phase commit hoặc saga — xem chủ đề microservices), ID duy nhất toàn cục (UUIDv7, Snowflake ID), **hot key** (tài khoản người nổi tiếng), và **resharding**. Hãy chia sẵn thành nhiều shard logic ánh xạ lên ít node vật lý, để khi tăng trưởng chỉ cần dời nguyên shard logic. DynamoDB và Cassandra làm sẵn việc này qua partition key.

---

## 11. CAP và PACELC

**CAP:** khi xảy ra **phân mảnh mạng** (network partition), một hệ lưu trữ phân tán phải chọn **Consistency** (đọc luôn thấy bản ghi mới nhất – linearizable) hoặc **Availability** (mọi node còn sống đều trả lời). Partition là không thể tránh, nên "CA" không phải lựa chọn thật.

```text
if Partition:  Availability  vs  Consistency     (CAP)
Else:          Latency       vs  Consistency     (everyday trade-off)
```

**PACELC** (Daniel Abadi) bổ sung đánh đổi lúc hoạt động bình thường mà CAP bỏ qua.

| Hệ thống (mặc định) | Loại | Vì sao |
|---|---|---|
| Cassandra, DynamoDB | PA/EL | Mặc định đọc eventually consistent; đọc mạnh hơn là tuỳ chọn |
| Spanner, CockroachDB, etcd | PC/EC | Đồng thuận (consensus) cho mọi lệnh ghi |

Chữ C trong CAP không phải chữ C trong ACID. Nhiều hệ cho chọn theo từng request (consistency level của Cassandra, `ConsistentRead` của DynamoDB).

---

## 12. Connection pooling

PostgreSQL chạy **một process cho mỗi connection** (vài MB mỗi cái), `max_connections` mặc định **100**; MySQL mặc định 151. Hàng nghìn connection làm database chậm đi chứ không nhanh lên. **Bể kết nối** (connection pool) tái sử dụng một số ít connection:

```text
 400 pods x 10 conns = 4000 connections      400 pods x 10 client conns
        -> DB out of memory                           |
                                            [ PgBouncer / RDS Proxy ]
                                                      | 40 server conns
                                                 [ PostgreSQL ]
```

```ini
[databases]
app = host=10.0.1.20 port=5432 dbname=app

[pgbouncer]
listen_port = 6432
auth_type = scram-sha-256
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 20
```

Chế độ của PgBouncer: **session**, **transaction** (lựa chọn thường dùng), **statement**. Transaction mode làm hỏng trạng thái theo session: `SET`, advisory lock theo session, `LISTEN`, và prepared statement nếu chưa bật `max_prepared_statements` (1.21+). Mỗi serverless function tự mở connection riêng — hãy dùng **RDS Proxy**. Để pool nhỏ: điểm xuất phát phổ biến là `(cores x 2) + spindles`, và `số instance x pool size` phải nằm dưới giới hạn của server.

---

## 13. Chọn database

Hãy hỏi: hình dạng dữ liệu, access pattern, yêu cầu nhất quán, con số quy mô (đọc/s, ghi/s, dung lượng, p99), kỹ năng vận hành của team, mô hình chi phí.

| Workload | Lựa chọn mặc định hợp lý |
|---|---|
| App nghiệp vụ: order, user, billing | PostgreSQL / MySQL (RDS, Aurora) |
| Truy cập theo key ở quy mô cực lớn, tải đột biến | DynamoDB |
| Session, leaderboard, rate limit | Redis / Valkey |
| Tìm kiếm full-text | OpenSearch, nạp dữ liệu từ nguồn gốc |
| Phân tích dữ liệu lịch sử | Kho dữ liệu dạng cột (Redshift, BigQuery, Snowflake) |

Mỗi kho dữ liệu thêm vào đều phải được bảo mật, backup và đồng bộ (CDC hoặc event): mặc định dùng một database quan hệ cho tới khi có nhu cầu đo đếm được, và ghi lại quyết định bằng ADR.

## Điểm cần nhớ khi phỏng vấn

- Scale theo thứ tự: **query/index → pooling → cache → replica → partitioning → sharding**.
- Index ghép tuân theo **tiền tố trái nhất**; index tăng tốc đọc và làm chậm ghi.
- `EXPLAIN ANALYZE`: seq scan loại bỏ rất nhiều dòng = thiếu index; ước lượng lệch = thống kê cũ; cảnh giác N+1.
- Mặc định: **PostgreSQL = Read Committed**, **InnoDB = Repeatable Read**; snapshot isolation vẫn cho phép **write skew**; Serializable cần retry.
- Replication async = có lag và có thể mất dữ liệu; thiết kế cho **read-your-writes**. Quorum: **W + R > N**.
- **Partitioning** = trong một DB; **sharding** = qua nhiều DB; shard key = cardinality cao, tải đều, có trong query nóng.
- **CAP** = chọn C hoặc A khi có partition; **PACELC** thêm latency vs consistency lúc bình thường.
- Gom connection (**PgBouncer, RDS Proxy**), giữ pool nhỏ.

## Tóm tắt

- Database khó scale nhất vì nó giữ trạng thái; chẩn đoán đúng áp lực trước khi chọn giải pháp.
- Chọn mô hình dữ liệu theo access pattern; index và query plan giải quyết phần lớn vấn đề hiệu năng.
- ACID và mức cô lập phù hợp giữ cho các thao tác đồng thời đúng đắn.
- Replication mang lại tính sẵn sàng và scale đọc, đổi lại là lag và độ phức tạp khi failover.
- Partitioning thuần hoá bảng lớn; sharding mua scale ghi với cái giá phức tạp vĩnh viễn.
- CAP/PACELC đóng khung đánh đổi nhất quán – sẵn sàng – độ trễ; pooling bảo vệ database khỏi cơn bão connection.
