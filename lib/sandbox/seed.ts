// The default dataset every sandbox starts from — and returns to each day.
// It is consistent on purpose: stock, totals, payments and invoices agree, and
// it covers every status so each endpoint has something real to show.

import { hashPassword } from "./auth";
import type { SandboxData } from "./types";

/** Published on /practice/api so learners can log in as each seed user. */
export const SEED_PASSWORDS = { customer: "Customer@123", admin: "Admin@123" } as const;

const at = (day: string, time: string) => `2026-10-${day}T${time}:00.000Z`;

export function seedData(): SandboxData {
  return {
    authors: [
      { id: 1, name: "Nguyễn Nhật Ánh", country: "Vietnam", birth_year: 1955, bio: "Nhà văn viết cho tuổi mới lớn.", created_at: at("01", "02:00"), updated_at: at("01", "02:00") },
      { id: 2, name: "Tô Hoài", country: "Vietnam", birth_year: 1920, bio: "Tác giả Dế Mèn phiêu lưu ký.", created_at: at("01", "02:01"), updated_at: at("01", "02:01") },
      { id: 3, name: "Haruki Murakami", country: "Japan", birth_year: 1949, bio: null, created_at: at("01", "02:02"), updated_at: at("01", "02:02") },
      { id: 4, name: "George Orwell", country: "United Kingdom", birth_year: 1903, bio: "Novelist and essayist.", created_at: at("01", "02:03"), updated_at: at("01", "02:03") },
      { id: 5, name: "Yuval Noah Harari", country: "Israel", birth_year: 1976, bio: "Historian.", created_at: at("01", "02:04"), updated_at: at("01", "02:04") },
      { id: 6, name: "Robert C. Martin", country: "United States", birth_year: 1952, bio: "Software engineer, \"Uncle Bob\".", created_at: at("01", "02:05"), updated_at: at("01", "02:05") },
      { id: 7, name: "Martin Kleppmann", country: "Germany", birth_year: null, bio: "Distributed-systems researcher.", created_at: at("01", "02:06"), updated_at: at("01", "02:06") },
      { id: 8, name: "Dale Carnegie", country: "United States", birth_year: 1888, bio: null, created_at: at("01", "02:07"), updated_at: at("01", "02:07") },
    ],
    books: [
      { id: 1, title: "Mắt biếc", isbn: "978-604-1-00001-1", author_id: 1, genre: "fiction", price: 95000, stock: 40, published_year: 1990, created_at: at("01", "03:00"), updated_at: at("01", "03:00") },
      { id: 2, title: "Cho tôi xin một vé đi tuổi thơ", isbn: "978-604-1-00002-8", author_id: 1, genre: "fiction", price: 80000, stock: 35, published_year: 2008, created_at: at("01", "03:01"), updated_at: at("01", "03:01") },
      { id: 3, title: "Tôi thấy hoa vàng trên cỏ xanh", isbn: "978-604-1-00003-5", author_id: 1, genre: "fiction", price: 125000, stock: 25, published_year: 2010, created_at: at("01", "03:02"), updated_at: at("01", "03:02") },
      { id: 4, title: "Dế Mèn phiêu lưu ký", isbn: "978-604-1-00004-2", author_id: 2, genre: "children", price: 60000, stock: 50, published_year: 1941, created_at: at("01", "03:03"), updated_at: at("01", "03:03") },
      { id: 5, title: "Rừng Na Uy", isbn: "978-604-1-00005-9", author_id: 3, genre: "fiction", price: 150000, stock: 12, published_year: 1987, created_at: at("01", "03:04"), updated_at: at("01", "03:04") },
      { id: 6, title: "Kafka bên bờ biển", isbn: "978-604-1-00006-6", author_id: 3, genre: "fiction", price: 180000, stock: 0, published_year: 2002, created_at: at("01", "03:05"), updated_at: at("01", "03:05") },
      { id: 7, title: "1984", isbn: "978-604-1-00007-3", author_id: 4, genre: "fiction", price: 110000, stock: 30, published_year: 1949, created_at: at("01", "03:06"), updated_at: at("01", "03:06") },
      { id: 8, title: "Trại súc vật", isbn: "978-604-1-00008-0", author_id: 4, genre: "fiction", price: 70000, stock: 22, published_year: 1945, created_at: at("01", "03:07"), updated_at: at("01", "03:07") },
      { id: 9, title: "Sapiens: Lược sử loài người", isbn: "978-604-1-00009-7", author_id: 5, genre: "history", price: 220000, stock: 18, published_year: 2011, created_at: at("01", "03:08"), updated_at: at("01", "03:08") },
      { id: 10, title: "Homo Deus", isbn: "978-604-1-00010-3", author_id: 5, genre: "history", price: 230000, stock: 3, published_year: 2015, created_at: at("01", "03:09"), updated_at: at("01", "03:09") },
      { id: 11, title: "Clean Code", isbn: "978-604-1-00011-0", author_id: 6, genre: "technology", price: 450000, stock: 8, published_year: 2008, created_at: at("01", "03:10"), updated_at: at("01", "03:10") },
      { id: 12, title: "Clean Architecture", isbn: "978-604-1-00012-7", author_id: 6, genre: "technology", price: 420000, stock: 5, published_year: 2017, created_at: at("01", "03:11"), updated_at: at("01", "03:11") },
      { id: 13, title: "Designing Data-Intensive Applications", isbn: "978-604-1-00013-4", author_id: 7, genre: "technology", price: 650000, stock: 6, published_year: 2017, created_at: at("01", "03:12"), updated_at: at("01", "03:12") },
      { id: 14, title: "Đắc nhân tâm", isbn: "978-604-1-00014-1", author_id: 8, genre: "self_help", price: 86000, stock: 60, published_year: 1936, created_at: at("01", "03:13"), updated_at: at("01", "03:13") },
    ],
    users: [
      { id: 1, full_name: "Trần Thị Mai", email: "mai.tran@example.com", phone: "0901234567", address: "12 Lê Lợi, Quận 1, TP.HCM", password_hash: hashPassword(1, SEED_PASSWORDS.customer), role: "customer", created_at: at("02", "01:00"), updated_at: at("02", "01:00") },
      { id: 2, full_name: "Lê Văn Nam", email: "nam.le@example.com", phone: "0912345678", address: "45 Trần Phú, Hà Đông, Hà Nội", password_hash: hashPassword(2, SEED_PASSWORDS.customer), role: "customer", created_at: at("02", "01:10"), updated_at: at("02", "01:10") },
      { id: 3, full_name: "Phạm Minh Anh", email: "minhanh.pham@example.com", phone: null, address: "8 Bạch Đằng, Hải Châu, Đà Nẵng", password_hash: hashPassword(3, SEED_PASSWORDS.customer), role: "customer", created_at: at("02", "01:20"), updated_at: at("02", "01:20") },
      { id: 4, full_name: "John Smith", email: "john.smith@example.com", phone: "+44 7700 900123", address: "221B Baker Street, London", password_hash: hashPassword(4, SEED_PASSWORDS.customer), role: "customer", created_at: at("02", "01:30"), updated_at: at("02", "01:30") },
      { id: 5, full_name: "Bookstore Admin", email: "admin@bookstore.example", phone: null, address: null, password_hash: hashPassword(5, SEED_PASSWORDS.admin), role: "admin", created_at: at("02", "01:40"), updated_at: at("02", "01:40") },
    ],
    orders: [
      { id: 1, user_id: 1, status: "delivered", total_amount: 250000, shipping_address: "12 Lê Lợi, Quận 1, TP.HCM", note: null, created_at: at("05", "03:00"), updated_at: at("07", "09:00") },
      { id: 2, user_id: 2, status: "paid", total_amount: 450000, shipping_address: "45 Trần Phú, Hà Đông, Hà Nội", note: "Giao giờ hành chính", created_at: at("08", "02:00"), updated_at: at("08", "02:05") },
      { id: 3, user_id: 3, status: "shipped", total_amount: 330000, shipping_address: "8 Bạch Đằng, Hải Châu, Đà Nẵng", note: null, created_at: at("09", "04:00"), updated_at: at("10", "01:00") },
      { id: 4, user_id: 1, status: "pending", total_amount: 258000, shipping_address: "12 Lê Lợi, Quận 1, TP.HCM", note: "Quà tặng — gói giúp mình", created_at: at("12", "06:00"), updated_at: at("12", "06:00") },
      { id: 5, user_id: 4, status: "cancelled", total_amount: 650000, shipping_address: "221B Baker Street, London", note: null, created_at: at("10", "07:00"), updated_at: at("11", "08:00") },
    ],
    order_items: [
      { id: 1, order_id: 1, book_id: 1, quantity: 2, unit_price: 95000, line_total: 190000 },
      { id: 2, order_id: 1, book_id: 4, quantity: 1, unit_price: 60000, line_total: 60000 },
      { id: 3, order_id: 2, book_id: 11, quantity: 1, unit_price: 450000, line_total: 450000 },
      { id: 4, order_id: 3, book_id: 9, quantity: 1, unit_price: 220000, line_total: 220000 },
      { id: 5, order_id: 3, book_id: 7, quantity: 1, unit_price: 110000, line_total: 110000 },
      { id: 6, order_id: 4, book_id: 14, quantity: 3, unit_price: 86000, line_total: 258000 },
      { id: 7, order_id: 5, book_id: 13, quantity: 1, unit_price: 650000, line_total: 650000 },
    ],
    payments: [
      { id: 1, order_id: 1, amount: 250000, method: "card", status: "succeeded", transaction_ref: "TXN-20261005-0001", paid_at: at("05", "03:02"), created_at: at("05", "03:02") },
      { id: 2, order_id: 2, amount: 450000, method: "bank_transfer", status: "succeeded", transaction_ref: "TXN-20261008-0002", paid_at: at("08", "02:05"), created_at: at("08", "02:05") },
      { id: 3, order_id: 3, amount: 330000, method: "card", status: "failed", transaction_ref: "TXN-20261009-0003", paid_at: null, created_at: at("09", "04:01") },
      { id: 4, order_id: 3, amount: 330000, method: "e_wallet", status: "succeeded", transaction_ref: "TXN-20261009-0004", paid_at: at("09", "04:03"), created_at: at("09", "04:03") },
      { id: 5, order_id: 5, amount: 650000, method: "card", status: "refunded", transaction_ref: "TXN-20261010-0005", paid_at: at("10", "07:01"), created_at: at("10", "07:01") },
    ],
    invoices: [
      { id: 1, invoice_number: "INV-2026-0001", order_id: 1, payment_id: 1, user_id: 1, amount: 250000, status: "issued", issued_at: at("05", "03:02") },
      { id: 2, invoice_number: "INV-2026-0002", order_id: 2, payment_id: 2, user_id: 2, amount: 450000, status: "issued", issued_at: at("08", "02:05") },
      { id: 3, invoice_number: "INV-2026-0003", order_id: 3, payment_id: 4, user_id: 3, amount: 330000, status: "issued", issued_at: at("09", "04:03") },
      { id: 4, invoice_number: "INV-2026-0004", order_id: 5, payment_id: 5, user_id: 4, amount: 650000, status: "void", issued_at: at("10", "07:01") },
    ],
    seq: { authors: 8, books: 14, users: 5, orders: 5, order_items: 7, payments: 5, invoices: 4 },
  };
}
