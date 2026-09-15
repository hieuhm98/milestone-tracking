# Message Queues & Streaming – RabbitMQ, Kafka and Async Messaging

## 1. Sync vs async: why put a broker in the middle

In a **synchronous** call (HTTP, gRPC) the caller waits for the callee. It is simple, but it couples services in time: a slow payment service makes checkout slow, a dead one makes it fail. Latencies add up and availabilities multiply — five services at 99.9% in a chain give about 99.5%.

With **asynchronous** messaging the producer hands a message to a **broker** and moves on; the consumer processes it when it can.

```text
Sync:   Checkout --HTTP--> Payment      user waits for both
           |<----- 200 -----|

Async:  Checkout --publish--> [broker] --deliver--> Payment
           |  returns in ~5 ms              works at its own pace
           v  "order received"
```

A broker buys **temporal decoupling** (consumers can be down for a deploy), **load levelling** (a spike of 10,000 orders/s is drained at 2,000/s instead of hitting the database), **fan-out** (email, fraud and analytics all react to one event) and **independent scaling**. It costs **eventual consistency**, duplicates and disorder you must design for, harder debugging (trace IDs must travel in headers), and one more stateful system to run.

Rule of thumb: **sync** when the caller needs the answer to continue (auth, price check); **async** when the work can happen after you reply (emails, invoices, indexing).

---

## 2. Three models: queue, pub/sub and log

| | Queue | Pub/sub | Log (stream) |
|---|---|---|---|
| Who gets a message | **One** competing consumer | **Every** subscriber | Every consumer group, independently |
| After consumption | Deleted on ack | Deleted per subscription | **Kept** until retention expires |
| Replay | No | No | Yes — rewind the offset |
| Progress tracked by | Broker, per message | Broker, per subscription | Consumer, as an **offset** |
| Examples | RabbitMQ queue, SQS | SNS, fanout exchange | Kafka, Kinesis, Redis Streams |

```text
Queue                  Pub/sub                    Log
       +-> worker A           +-> email queue     offset: 0  1  2  3  4  5
 P -> [Q]              P -> (T)-> fraud queue       [ e0 e1 e2 e3 e4 e5 ] <- append
       +-> worker B           +-> analytics queue          ^        ^
 one worker per msg    a copy per subscriber          group A   group B
```

The key shift with a log: **reading does not remove data**. Consumers are cursors into a durable, ordered file, so a new service can bootstrap by reading a Kafka topic from offset 0 — impossible with SQS.

---

## 3. RabbitMQ: exchanges, bindings and routing

RabbitMQ implements **AMQP 0-9-1** (port **5672**, TLS **5671**, management UI **15672**). Producers publish to an **exchange** with a **routing key**; **bindings** decide which queues get a copy.

| Exchange | Routes by | Example binding |
|---|---|---|
| **direct** | Exact key match | `invoice` |
| **fanout** | Ignores the key, copies to all bound queues | — |
| **topic** | Pattern: `*` = one word, `#` = zero or more words | `order.*.created` |
| **headers** | Header values instead of the key | `x-match: all` |

The nameless **default exchange** binds every queue by its own name, which is why publishing with key `my-queue` "sends to a queue".

```text
key "order.eu.created" --> [topic exchange "orders"]
                              |- "order.*.created" --> [billing]
                              |- "order.#"         --> [audit]
                              `- "order.us.*"      --X  no match
```

Reliability knobs: **consumer acks** (un-acked messages are redelivered; auto-ack means at-most-once), **prefetch** (`basic.qos`, caps un-acked messages per consumer so one slow worker cannot hoard thousands), **publisher confirms**, **durable queues + persistent messages**, and **quorum queues** (Raft-replicated; classic mirrored queues were removed in RabbitMQ 4.0).

```js
import amqp from 'amqplib';

const conn = await amqp.connect('amqp://localhost:5672');
const ch = await conn.createChannel();

await ch.assertExchange('orders', 'topic', { durable: true });
await ch.assertQueue('billing', {
  durable: true,
  arguments: { 'x-queue-type': 'quorum', 'x-dead-letter-exchange': 'orders.dlx' },
});
await ch.bindQueue('billing', 'orders', 'order.*.created');
await ch.prefetch(10);

await ch.consume('billing', async (msg) => {
  try {
    await chargeCustomer(JSON.parse(msg.content.toString()));
    ch.ack(msg);
  } catch (err) {
    ch.nack(msg, false, false); // no requeue: dead-lettered
  }
});
```

---

## 4. Kafka: topics, partitions and replication

Kafka is a **distributed commit log** (port **9092**). The broker appends records to files and serves them by offset; consumers do the bookkeeping.

- A **topic** is split into **partitions**, each an ordered append-only sequence where every record gets an increasing **offset**.
- Data is kept for a **retention** period (`log.retention.hours` default 168 = 7 days) whether or not anyone read it. **Log compaction** instead keeps the latest record per key.
- Each partition has a **leader** and followers on other brokers; caught-up followers form the **ISR** (in-sync replicas).
- With a key, the producer picks `hash(key) % partitions`, so one key always lands on one partition.

```text
Topic "orders", 3 partitions, replication factor 3
          Broker 1    Broker 2    Broker 3
 P0       LEADER      follower    follower
 P1       follower    LEADER      follower
 P2       follower    follower    LEADER

 P0: | 0 | 1 | 2 | 3 | 4 |  <- key "cust-42" always appends here
```

| Durability setting | Scope | Safe value |
|---|---|---|
| `replication.factor` | Topic | 3 |
| `min.insync.replicas` | Topic/broker | 2 |
| `acks` | Producer | `all` (default since Kafka 3.0) |

With these, a write is acknowledged only when two replicas have it: one broker can die with no data loss. If fewer replicas are in sync, producers get `NotEnoughReplicas` — Kafka picks consistency over availability.

```bash
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic orders \
  --partitions 12 --replication-factor 3 --config min.insync.replicas=2
```

Metadata used to live in ZooKeeper; Kafka now uses **KRaft** (built-in Raft controllers), and **Kafka 4.0 removed ZooKeeper** entirely. On AWS: **Amazon MSK**.

---

## 5. Consumer groups, offsets and lag

Consumers sharing a `group.id` form a **consumer group**. Each partition is assigned to **exactly one consumer in the group** — parallelism plus per-partition order. Different groups read independently.

```text
Topic "orders", 4 partitions
 group "billing":   C1 <- P0,P1   C2 <- P2   C3 <- P3
 group "analytics": C1 <- P0,P1,P2,P3
 add C4, C5 to "billing": C4 takes a partition, C5 sits IDLE
```

- **Max parallelism = partition count.** You can add partitions later, but `hash(key) % n` changes and per-key order breaks for existing keys.
- **Rebalances** happen when consumers join, leave, or exceed `max.poll.interval.ms` (default 5 min) — slow work inside the poll loop causes rebalance storms.
- **Offsets** are committed to `__consumer_offsets`. Commit **after** processing → at-least-once; **before** → at-most-once.
- **Consumer lag** = log-end offset − committed offset. Growing lag is the key health signal.

```bash
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group billing
# TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders  0          10412           10415           3
# orders  1          9870            15230           5360  <- stuck consumer
```

Because data stays in the log, you can **replay** after a bug fix by resetting the group's offsets (`--reset-offsets --to-datetime ... --execute`).

---

## 6. RabbitMQ vs Kafka: when to choose which

| | RabbitMQ | Kafka |
|---|---|---|
| Model | Smart broker, routing, queues | Simple broker, partitioned log |
| After ack | Message removed | Retained; replay by offset |
| Routing | Direct/topic/fanout/headers | Topic + key → partition |
| Ordering | Per queue, one consumer | Per partition |
| Per-message features | Ack/reject, TTL, priorities | None — consumers commit a position |
| Consumer scaling | Add consumers freely | Capped by partitions |
| Best for | Task queues, complex routing, per-message retry | Event streaming, CDC, analytics, many readers, replay |

- "Each job once, retried individually" → **queue** (RabbitMQ, SQS).
- "Many teams read the same events, maybe later, with replay" → **log** (Kafka, Kinesis).
- "Notify several services" → **pub/sub** (SNS, fanout), usually a queue per subscriber.

A classic mistake is using Kafka as a job queue: one slow or poison message blocks its partition (**head-of-line blocking**), and per-message retry must be hand-built.

---

## 7. Delivery guarantees

| Guarantee | Mechanism | On crash | Use for |
|---|---|---|---|
| **At-most-once** | Ack **before** processing | Message **lost** | Telemetry |
| **At-least-once** | Ack **after** processing | Message **redelivered** | Default for business events |
| **Exactly-once** | Dedup + atomic commit of result and position | No loss, no visible duplicate | Payments, aggregations |

```text
consumer: receive(m1) -> charge card -> CRASH (ack never sent)
broker:   timeout -> redeliver m1
consumer: receive(m1) -> charge card AGAIN   <- duplicate side effect
```

True exactly-once *delivery* across a network is impossible; systems offer **exactly-once processing** inside a boundary:

- **Kafka** — the **idempotent producer** (producer ID + sequence numbers, default since 3.0) drops retry duplicates; **transactions** atomically write output records *and* consumer offsets, read with `isolation.level=read_committed` (Kafka Streams: `processing.guarantee=exactly_once_v2`). It holds only **Kafka → Kafka**; an external DB or API call puts you back at at-least-once.
- **SQS FIFO** — drops messages with the same deduplication ID within a **5-minute** window.

Interview answer: *design for at-least-once and make consumers idempotent.*

---

## 8. Idempotent consumers

**Idempotent** means applying a message twice has the same effect as once.

1. **Naturally idempotent writes** — `SET status = 'SHIPPED'` or an upsert is safe; `balance = balance - 10` is not.
2. **Conditional writes** — `UPDATE ... WHERE version = 7`; a replay finds version 8 and does nothing.
3. **Dedup table** — record the event ID in the **same transaction** as the side effect.

```js
async function handlePaymentRequested(message, db) {
  const { eventId, orderId, amount } = JSON.parse(message.value);

  await db.transaction(async (tx) => {
    const result = await tx.query(
      'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [eventId]
    );

    if (result.rowCount === 0) return; // duplicate: already processed

    await tx.query(
      'INSERT INTO payments (order_id, amount) VALUES ($1, $2)',
      [orderId, amount]
    );
  });
}
```

- Use an **event ID created by the producer**, not a broker delivery ID (an SQS receipt handle changes on every receive).
- Dedup insert and side effect must be **atomic**; two commits recreate the gap.
- For external calls, pass an **idempotency key** to the provider (topic 17).
- Expire dedup rows only after your maximum redelivery/replay window.

---

## 9. Ordering

Global order and horizontal scale conflict: one ordered stream means one consumer. Real systems give **order per key**.

| System | Ordering scope | Lever |
|---|---|---|
| Kafka | Per partition | Message key |
| Kinesis Data Streams | Per shard | Partition key |
| SQS FIFO | Per message group | `MessageGroupId` |
| SQS standard | Best effort only | — |
| RabbitMQ | Per queue | One active consumer (`x-single-active-consumer`) |

What silently breaks order: **retries that requeue to the back**, **several consumers or threads** on one ordered stream, **changing a keyed topic's partition count**, and working around **hot keys** (one huge tenant on one partition).

Often the better design is to **tolerate disorder**: carry a version in each event and ignore events older than the stored state.

---

## 10. Retries, backoff and dead-letter queues

- **Transient** failures (timeout, 503, lock conflict) → retry after a delay.
- **Poison messages** (malformed payload, bug) → retrying forever wastes capacity and, in a log, blocks the partition. Park them.

**Exponential backoff with jitter** stops consumers retrying in lockstep against a recovering dependency:

```js
function retryDelayMs(attempt, baseMs = 500, capMs = 60000) {
  const ceiling = Math.min(capMs, baseMs * 2 ** attempt);

  return Math.floor(Math.random() * ceiling); // full jitter
}
```

A **dead-letter queue** (DLQ) takes messages past the retry limit so the main flow keeps moving.

```text
[main queue] -> consumer -> fail -> attempts < N ? -> retry with backoff
                                        | no
                                        v
                                      [DLQ] -> alert -> inspect/fix -> redrive
```

- **SQS** — an unacknowledged message reappears after the **visibility timeout** (default 30 s, max 12 h); a **redrive policy** moves it to the DLQ after `maxReceiveCount` receives. Keep the timeout above worst-case processing time.
- **RabbitMQ** — `nack` with `requeue=false` routes to the **dead-letter exchange**; delayed retries use a TTL'd retry queue that dead-letters back.
- **Kafka** — no built-in DLQ; use **retry topics** (`orders.retry.10m`) and an `orders.dlq` topic, committing the original offset so the partition is not blocked.

**Alert on DLQ depth > 0** — an unwatched DLQ is a slow way to lose data.

---

## 11. The transactional outbox pattern

The **dual-write problem**: a service must update its database *and* publish an event, and no transaction spans both.

```text
Dual write (broken)                   Outbox (correct)
 1. UPDATE orders  -> commit OK        BEGIN
 2. publish event  -> broker down        INSERT INTO orders ...
 => order placed, nobody told            INSERT INTO outbox ...
                                       COMMIT   <- one local transaction
                                       relay: read outbox -> publish -> mark sent
```

```sql
BEGIN;

INSERT INTO orders (id, customer_id, total)
VALUES ('o-123', 'c-9', 49.90);

INSERT INTO outbox (id, aggregate_id, event_type, payload)
VALUES ('e-777', 'o-123', 'OrderPlaced', '{"orderId":"o-123","total":49.90}');

COMMIT;
```

| Relay | How | Trade-off |
|---|---|---|
| **Polling publisher** | Job selects unsent rows, publishes, marks sent | Simple; DB load, latency = poll interval |
| **CDC** | Tails the WAL/binlog (e.g. Debezium → Kafka) | Low latency; more infrastructure |

The relay can crash after publishing but before marking the row, so the outbox is **at-least-once**: consumers stay idempotent, using the outbox ID as event ID (the receiving side's dedup table is often called an **inbox**). Outbox is what makes sagas reliable — sagas and CQRS are topic 18.

---

## 12. Mapping to AWS

| Need | Service | Notes |
|---|---|---|
| Work queue | **SQS standard** | At-least-once, best-effort order, near-unlimited throughput |
| Ordered queue + dedup | **SQS FIFO** | Order per group, 5-min dedup; 300 msg/s per API action, 3,000 with batching (more in high-throughput mode) |
| Pub/sub fan-out | **SNS** | To SQS, Lambda, HTTP, email |
| Rule-based event bus | **EventBridge** | Content-based routing, AWS/SaaS events |
| Stream / log | **Kinesis Data Streams** | Shard = 1 MB/s or 1,000 records/s write; retention 24 h default, up to 365 days |
| Managed Kafka | **Amazon MSK** | Standard Kafka APIs |
| Managed RabbitMQ | **Amazon MQ** | Lift-and-shift AMQP/JMS apps |

Review details: **long polling** (`WaitTimeSeconds` up to 20 s) cuts empty receives; Lambda consumers should use **`ReportBatchItemFailures`** so one bad message does not retry the whole batch; deleted SQS messages cannot be replayed — if replay matters, choose Kinesis or MSK.

---

## Key interview points

- **Sync** when the caller needs the answer now; **async** for work after the reply, at the price of eventual consistency.
- **Queue** = one consumer per message; **pub/sub** = a copy per subscriber; **log** = retained, replayable, offsets.
- Kafka group parallelism is capped by **partition count**; ordering is **per partition**; watch **consumer lag**.
- Durable Kafka: **RF=3, `min.insync.replicas=2`, `acks=all`**; Kafka 4.0 is **KRaft**-only.
- Design for **at-least-once** with **idempotent consumers**; Kafka exactly-once holds only Kafka → Kafka.
- **Backoff with jitter**, a retry limit, a monitored **DLQ**; the **outbox** fixes dual writes.

## Summary

- Brokers decouple services in time and absorb spikes, but bring duplicates, disorder and eventual consistency.
- Choose the model first (queue, pub/sub, log), then the product (RabbitMQ/SQS vs Kafka/Kinesis).
- At-least-once plus idempotency, retries with DLQs and the outbox pattern make messaging trustworthy.
