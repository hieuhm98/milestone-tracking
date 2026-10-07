// Seed script for the fintech practice database (`data/fintech.db`).
//
// A fictional Vietnamese digital-lending + e-wallet company ("VayNhanh"):
// customers, loan applications, loans with repayment schedules, e-wallets and
// their transactions, merchants, checkout funnel events and card/wallet/BNPL
// payments. Everything is generated — no real people, no real companies.
//
// The data is meant to be READ and ANALYSED by learners (the "Data for banking
// & digital lending" run in IT Fundamentals, and the SQL Practice playground),
// so it is deliberately realistic, including its flaws and its stories:
//
// Snapshot date ("as of"): 2026-06-30. Every DPD / status is computed as of
// that day, and articles use the literal date instead of date('now').
//
// Planted data-quality problems (taught in the data-quality topic):
//   * customers.city      — spelling variants of the same city (~4%), some with
//                           stray spaces or lower case ("HCMC", "TP.HCM", " Hanoi").
//   * customers.monthly_income — NULL for ~6%, three typo outliers (999,999,999).
//   * loan_applications.credit_score — NULL for "thin-file" applicants (~5%).
//   * payments            — 37 double charges: same customer, merchant and amount,
//                           both 'success', created 1–8 seconds apart.
//   * payments.status     — a few 'pending' rows days old (stuck payments).
//   * wallets.balance     — 6 wallets whose stored balance does not equal the sum
//                           of their successful transactions (reconciliation).
//   * All timestamps are UTC ('YYYY-MM-DD HH:MM:SS'); Vietnam is UTC+7.
//
// Planted stories (taught in the lending / payments / case-study topics):
//   * 2026-03-01: the approval cut-off score is lowered from 560 to 520 and a
//     partner-channel campaign starts. Approval rate jumps; the Mar–Apr 2026
//     loan vintages go delinquent noticeably faster than earlier ones.
//   * 2026-05-11 … 2026-05-17: an SMS-OTP provider outage. Android payments by
//     card fail with 'otp_timeout' far more often; the checkout funnel's
//     submit_payment → payment_success step drops for that week only.
//   * Shopping peaks on 11.11, 12.12 and the weeks before Tết (2026-02-17).
//
// Deterministic: a seeded PRNG, fixed dates and VACUUM make re-runs byte-stable.
// Re-run with:  node scripts/seed-fintech-db.mjs

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "data", "fintech.db");

// --- PRNG ------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260630);
const between = (lo, hi) => lo + rand() * (hi - lo);
const int = (lo, hi) => Math.floor(between(lo, hi + 1));
const chance = (p) => rand() < p;
const pickOne = (arr) => arr[Math.floor(rand() * arr.length)];

function weighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;

  for (const [value, w] of pairs) {
    r -= w;

    if (r <= 0) return value;
  }

  return pairs[pairs.length - 1][0];
}

function normal(mean, sd) {
  const u = 1 - rand();
  const v = rand();

  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const roundTo = (x, step) => Math.round(x / step) * step;

// --- Dates (all UTC) ----------------------------------------------------------

const DAY = 86_400_000;
const AS_OF = Date.UTC(2026, 5, 30); // 2026-06-30
const POLICY_CHANGE = Date.UTC(2026, 2, 1); // 2026-03-01
const OTP_OUTAGE_FROM = Date.UTC(2026, 4, 11);
const OTP_OUTAGE_TO = Date.UTC(2026, 4, 18); // exclusive

const pad = (n) => String(n).padStart(2, "0");

function fmtDate(ms) {
  const d = new Date(ms);

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function fmtTime(ms) {
  const d = new Date(ms);

  return `${fmtDate(ms)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function addMonths(ms, n) {
  const d = new Date(ms);

  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate());
}

const startOfDay = (ms) => Math.floor(ms / DAY) * DAY;

// A UTC timestamp whose *Vietnam* local hour follows a daytime curve
// (few events 01:00–06:00 VN, peaks at lunch and 20:00–22:00 VN).
function timeOnDay(dayMs) {
  const vnHour = weighted([
    [0, 2], [1, 1], [2, 0.5], [3, 0.4], [4, 0.4], [5, 0.8], [6, 2], [7, 3],
    [8, 4], [9, 5], [10, 5], [11, 6], [12, 7], [13, 5], [14, 4], [15, 4],
    [16, 4], [17, 4], [18, 5], [19, 7], [20, 9], [21, 9], [22, 7], [23, 4],
  ]);

  return dayMs + (vnHour - 7) * 3_600_000 + int(0, 3599) * 1000;
}

// Daily demand multiplier: growth over time, weekends, Tết and shopping days.
function demand(dayMs, kind) {
  const start = Date.UTC(2025, 0, 1);
  const months = (dayMs - start) / (30 * DAY);
  let m = 1 + months * 0.035;
  const d = new Date(dayMs);
  const md = `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const dow = d.getUTCDay();

  if (kind === "shop") {
    if (dow === 0 || dow === 6) m *= 1.25;

    if (md === "11-11" || md === "12-12") m *= 3.2;

    if (md === "11-10" || md === "12-11") m *= 1.5;
  }

  // Weeks before Tết 2026 (17 Feb): cash need and shopping both rise.
  const tet = Date.UTC(2026, 1, 17);

  if (dayMs >= tet - 21 * DAY && dayMs < tet) m *= kind === "loan" ? 1.6 : 1.4;

  if (dayMs >= tet && dayMs < tet + 5 * DAY) m *= 0.45;

  // The March 2026 partner campaign brings extra applicants.
  if (kind === "loan" && dayMs >= POLICY_CHANGE && dayMs < Date.UTC(2026, 4, 1)) m *= 1.35;

  return m;
}

// --- Reference data -----------------------------------------------------------

const FAMILY = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const FAMILY_W = [38, 11, 9.5, 7, 5, 4, 4.5, 3.9, 3.5, 2.1, 2, 1.4, 1.3, 1.3, 1, 0.5];
const MIDDLE_M = ["Văn", "Đức", "Minh", "Quốc", "Thành", "Hữu", "Công", "Gia"];
const MIDDLE_F = ["Thị", "Ngọc", "Thu", "Thanh", "Khánh", "Mỹ", "Bảo", "Phương"];
const GIVEN_M = ["Anh", "Bình", "Cường", "Dũng", "Hải", "Hiếu", "Hùng", "Khoa", "Long", "Nam", "Phúc", "Quân", "Sơn", "Tâm", "Thắng", "Trung", "Tuấn", "Việt", "Vinh", "Đạt"];
const GIVEN_F = ["An", "Chi", "Dung", "Giang", "Hà", "Hạnh", "Hoa", "Hương", "Lan", "Linh", "Mai", "Ngân", "Nhung", "Oanh", "Phương", "Quỳnh", "Thảo", "Trang", "Vy", "Yến"];

const CITIES = [
  ["Ho Chi Minh City", 34],
  ["Hanoi", 28],
  ["Da Nang", 8],
  ["Hai Phong", 7],
  ["Can Tho", 6],
  ["Bien Hoa", 5],
  ["Nha Trang", 4],
  ["Hue", 4],
  ["Vung Tau", 4],
];
const CITY_VARIANTS = {
  "Ho Chi Minh City": ["HCMC", "TP.HCM", "ho chi minh city", "Ho Chi Minh", "Ho Chi Minh City "],
  Hanoi: ["Ha Noi", "HN", " Hanoi", "hanoi"],
  "Da Nang": ["Danang", "DN"],
};

const MERCHANT_CATEGORIES = {
  electronics: { names: ["DienMay Plus", "TechZone", "PhoneHub", "Laptop88", "GadgetVN"], amount: [2_500_000, 0.7], mdr: 1.6 },
  fashion: { names: ["Ao Dai House", "StreetWear VN", "Gia Shoes", "Lua Fashion", "MOC Style", "Kids Corner"], amount: [450_000, 0.6], mdr: 1.9 },
  grocery: { names: ["FreshMart", "Cho Xanh", "BigBasket VN", "MiniMart 24h", "Organic Saigon"], amount: [280_000, 0.55], mdr: 1.1 },
  food_delivery: { names: ["ComNgon", "PhoNow", "Banh Mi Express", "TraSua Go", "LunchBox"], amount: [120_000, 0.45], mdr: 1.5 },
  travel: { names: ["VeXe Online", "SkyTicket VN", "Homestay Hub", "Bus Fast"], amount: [1_400_000, 0.6], mdr: 1.8 },
  utilities: { names: ["EVN Bill Pay", "Water Bill HCM", "FiberNet", "MobileTopup"], amount: [380_000, 0.5], mdr: 0.6 },
  education: { names: ["EnglishPro", "CodeCamp VN", "BookStore Online", "IELTS Master"], amount: [1_100_000, 0.6], mdr: 1.4 },
};
const CATEGORY_WEIGHTS = [
  ["grocery", 22], ["food_delivery", 26], ["fashion", 16], ["electronics", 9],
  ["utilities", 13], ["travel", 6], ["education", 8],
];

const lognormal = (median, sigma) => median * Math.exp(normal(0, sigma));

// --- Build -------------------------------------------------------------------

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE);

const db = new Database(OUT_FILE);
db.pragma("journal_mode = DELETE");
// Wallet rows are written last (their balance is the sum of what came before), so
// enforce foreign keys with a check at the end instead of on every insert.
db.pragma("foreign_keys = OFF");

db.exec(`
CREATE TABLE customers (
  customer_id     INTEGER PRIMARY KEY,
  full_name       TEXT NOT NULL,
  gender          TEXT NOT NULL,          -- 'F' | 'M'
  birth_year      INTEGER NOT NULL,
  city            TEXT NOT NULL,          -- free text from the sign-up form (not normalised!)
  monthly_income  INTEGER,                -- VND per month, self-declared; NULL = not provided
  employment      TEXT NOT NULL,          -- salaried | self_employed | student | freelancer
  kyc_status      TEXT NOT NULL,          -- verified | pending | rejected (eKYC: ID card + selfie)
  signup_channel  TEXT NOT NULL,          -- app | web | partner
  signup_date     TEXT NOT NULL           -- YYYY-MM-DD
);

CREATE TABLE merchants (
  merchant_id     INTEGER PRIMARY KEY,
  merchant_name   TEXT NOT NULL,
  category        TEXT NOT NULL,
  city            TEXT NOT NULL,
  mdr_pct         REAL NOT NULL           -- merchant discount rate: fee % the merchant pays per payment
);

CREATE TABLE loan_applications (
  application_id    INTEGER PRIMARY KEY,
  customer_id       INTEGER NOT NULL REFERENCES customers(customer_id),
  product           TEXT NOT NULL,        -- cash_loan | bnpl
  amount_requested  INTEGER NOT NULL,     -- VND
  term_months       INTEGER NOT NULL,
  credit_score      INTEGER,              -- 300–850 from the scoring model; NULL = no credit history
  channel           TEXT NOT NULL,        -- app | web | partner
  applied_at        TEXT NOT NULL,        -- UTC
  status            TEXT NOT NULL,        -- approved | rejected | cancelled | pending
  reject_reason     TEXT,                 -- low_score | high_dti | kyc_failed | fraud_suspected
  decided_at        TEXT                  -- UTC; NULL while pending
);

CREATE TABLE loans (
  loan_id              INTEGER PRIMARY KEY,
  application_id       INTEGER NOT NULL UNIQUE REFERENCES loan_applications(application_id),
  customer_id          INTEGER NOT NULL REFERENCES customers(customer_id),
  product              TEXT NOT NULL,     -- cash_loan | bnpl
  principal            INTEGER NOT NULL,  -- VND disbursed
  annual_rate_pct      REAL NOT NULL,     -- nominal yearly interest rate, e.g. 24.0
  term_months          INTEGER NOT NULL,
  monthly_installment  INTEGER NOT NULL,  -- VND due each month
  disbursed_date       TEXT NOT NULL,     -- YYYY-MM-DD
  status               TEXT NOT NULL      -- active | closed | defaulted (as of 2026-06-30)
);

CREATE TABLE repayment_schedule (
  installment_id  INTEGER PRIMARY KEY,
  loan_id         INTEGER NOT NULL REFERENCES loans(loan_id),
  installment_no  INTEGER NOT NULL,       -- 1..term_months
  due_date        TEXT NOT NULL,          -- YYYY-MM-DD
  amount_due      INTEGER NOT NULL,       -- VND
  paid_date       TEXT,                   -- YYYY-MM-DD; NULL = not paid (yet)
  amount_paid     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE wallets (
  wallet_id     INTEGER PRIMARY KEY,
  customer_id   INTEGER NOT NULL UNIQUE REFERENCES customers(customer_id),
  opened_date   TEXT NOT NULL,
  status        TEXT NOT NULL,            -- active | locked | closed
  balance       INTEGER NOT NULL          -- VND, as stored by the wallet service
);

CREATE TABLE wallet_transactions (
  txn_id      INTEGER PRIMARY KEY,
  wallet_id   INTEGER NOT NULL REFERENCES wallets(wallet_id),
  created_at  TEXT NOT NULL,              -- UTC
  txn_type    TEXT NOT NULL,              -- top_up | payment | transfer_in | transfer_out | withdraw | refund | cashback
  amount      INTEGER NOT NULL,           -- VND, signed: money in > 0, money out < 0
  status      TEXT NOT NULL,              -- success | failed
  reference   TEXT                        -- payment_id for payment/refund rows
);

CREATE TABLE checkout_events (
  event_id        INTEGER PRIMARY KEY,
  session_id      TEXT NOT NULL,
  customer_id     INTEGER NOT NULL REFERENCES customers(customer_id),
  merchant_id     INTEGER NOT NULL REFERENCES merchants(merchant_id),
  event_name      TEXT NOT NULL,          -- view_cart | start_checkout | select_payment | submit_payment | payment_success
  event_time      TEXT NOT NULL,          -- UTC
  device          TEXT NOT NULL,          -- android | ios | web
  payment_method  TEXT                    -- set from select_payment onwards
);

CREATE TABLE payments (
  payment_id      INTEGER PRIMARY KEY,
  session_id      TEXT,                   -- checkout session that produced it
  customer_id     INTEGER NOT NULL REFERENCES customers(customer_id),
  merchant_id     INTEGER NOT NULL REFERENCES merchants(merchant_id),
  created_at      TEXT NOT NULL,          -- UTC
  amount          INTEGER NOT NULL,       -- VND
  method          TEXT NOT NULL,          -- e_wallet | card | bnpl | bank_transfer | qr_code
  device          TEXT NOT NULL,          -- android | ios | web
  status          TEXT NOT NULL,          -- success | failed | refunded | pending
  failure_reason  TEXT                    -- insufficient_funds | otp_timeout | bank_declined | fraud_blocked | network_error
);
`);

// --- Customers ------------------------------------------------------------------

const N_CUSTOMERS = 4000;
const customers = [];
const insCustomer = db.prepare(`INSERT INTO customers VALUES (?,?,?,?,?,?,?,?,?,?)`);

for (let id = 1; id <= N_CUSTOMERS; id++) {
  const gender = chance(0.52) ? "F" : "M";
  const family = weighted(FAMILY.map((f, i) => [f, FAMILY_W[i]]));
  const full_name = gender === "F"
    ? `${family} ${pickOne(MIDDLE_F)} ${pickOne(GIVEN_F)}`
    : `${family} ${pickOne(MIDDLE_M)} ${pickOne(GIVEN_M)}`;
  const birth_year = clamp(Math.round(normal(1994, 8)), 1960, 2006);
  const age = 2026 - birth_year;
  const employment = age <= 22
    ? weighted([["student", 6], ["salaried", 2], ["freelancer", 2]])
    : weighted([["salaried", 62], ["self_employed", 20], ["freelancer", 14], ["student", 4]]);

  const cityCanon = weighted(CITIES);
  let city = cityCanon;

  if (CITY_VARIANTS[cityCanon] && chance(0.045)) city = pickOne(CITY_VARIANTS[cityCanon]);

  const incomeBase = { salaried: 14_000_000, self_employed: 17_000_000, freelancer: 11_000_000, student: 3_500_000 }[employment];
  const cityBoost = cityCanon === "Ho Chi Minh City" || cityCanon === "Hanoi" ? 1.2 : 1;
  let monthly_income = roundTo(lognormal(incomeBase * cityBoost, 0.45), 100_000);

  if (chance(0.06)) monthly_income = null;

  const signupDay = startOfDay(Date.UTC(2024, 9, 1) + Math.pow(rand(), 0.8) * (AS_OF - Date.UTC(2024, 9, 1)));
  const signup_channel = signupDay >= POLICY_CHANGE && signupDay < Date.UTC(2026, 4, 1)
    ? weighted([["app", 45], ["web", 15], ["partner", 40]])
    : weighted([["app", 62], ["web", 23], ["partner", 15]]);
  const kyc_status = weighted([["verified", 90], ["pending", 6], ["rejected", 4]]);

  const c = { id, employment, monthly_income, kyc_status, signupDay, signup_channel, age };
  customers.push(c);
  insCustomer.run(id, full_name, gender, birth_year, city, monthly_income, employment, kyc_status, signup_channel, fmtDate(signupDay));
}

// Three typo outliers: someone typed nine 9s into the income field.
for (const id of [417, 1288, 2650]) {
  db.prepare(`UPDATE customers SET monthly_income = 999999999 WHERE customer_id = ?`).run(id);
  customers[id - 1].monthly_income = 999_999_999;
}

// --- Merchants -----------------------------------------------------------------

const merchants = [];
const insMerchant = db.prepare(`INSERT INTO merchants VALUES (?,?,?,?,?)`);
let merchantId = 0;

for (const [category, def] of Object.entries(MERCHANT_CATEGORIES)) {
  for (const name of def.names) {
    merchantId++;
    const mdr = Math.round((def.mdr + between(-0.2, 0.2)) * 100) / 100;
    const city = weighted(CITIES.slice(0, 5));
    merchants.push({ id: merchantId, category, def });
    insMerchant.run(merchantId, name, category, city, mdr);
  }
}

// --- Loan applications, loans, schedules ----------------------------------------

const insApp = db.prepare(`INSERT INTO loan_applications VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const insLoan = db.prepare(`INSERT INTO loans VALUES (?,?,?,?,?,?,?,?,?,?)`);
const insInst = db.prepare(`INSERT INTO repayment_schedule VALUES (?,?,?,?,?,?,?)`);

let appId = 0;
let loanId = 0;
let instId = 0;
const lastLoanEnd = new Map(); // customer -> ms when their current loan ends (one open loan at a time)

const bySignup = [...customers].sort((a, b) => a.signupDay - b.signupDay);

// A random customer who had already signed up on that day.
function signedUpBy(dayMs) {
  let lo = 0;
  let hi = bySignup.length;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;

    if (bySignup[mid].signupDay <= dayMs) lo = mid + 1;
    else hi = mid;
  }

  return lo === 0 ? null : bySignup[int(0, lo - 1)];
}

function installmentFor(principal, annualRate, term) {
  const r = annualRate / 100 / 12;

  if (r === 0) return Math.ceil(principal / term / 1000) * 1000;

  const pmt = (principal * r) / (1 - Math.pow(1 + r, -term));

  return Math.ceil(pmt / 1000) * 1000;
}

function scoreFor(c) {
  let s = normal(615, 70);

  if (c.employment === "salaried") s += 25;

  if (c.employment === "student") s -= 30;

  if (c.monthly_income && c.monthly_income < 100_000_000) s += Math.log(c.monthly_income / 10_000_000) * 30;

  if (c.age < 23) s -= 15;

  return Math.round(clamp(s, 300, 850));
}

// Probability that a loan goes bad, from score and whether it was booked under the
// looser March-2026 policy with partner-channel traffic.
function badProbability(score, product, loose, channel) {
  const s = score ?? 560;
  let p = 1 / (1 + Math.exp((s - 520) / 38));
  p *= product === "bnpl" ? 0.8 : 1.05;

  if (loose) p *= 1.8;

  if (channel === "partner") p *= 1.25;

  return clamp(p, 0.01, 0.75);
}

db.transaction(() => {
  for (let day = Date.UTC(2025, 0, 1); day <= AS_OF; day += DAY) {
    const count = Math.round(normal(9 * demand(day, "loan"), 2.5));

    for (let k = 0; k < Math.max(0, count); k++) {
      // Partner traffic is concentrated in Mar–Apr 2026.
      const pool = day >= POLICY_CHANGE && day < Date.UTC(2026, 4, 1) && chance(0.45)
        ? customers.filter((c) => c.signup_channel === "partner" && c.signupDay <= day)
        : null;
      const c = pool && pool.length ? pickOne(pool) : signedUpBy(day);

      if (!c) continue;

      appId++;
      const product = chance(0.42) ? "bnpl" : "cash_loan";
      const amount = product === "bnpl"
        ? roundTo(clamp(lognormal(4_000_000, 0.6), 1_000_000, 20_000_000), 100_000)
        : roundTo(clamp(lognormal(14_000_000, 0.6), 3_000_000, 80_000_000), 500_000);
      const term = product === "bnpl" ? weighted([[3, 55], [6, 45]]) : weighted([[6, 25], [12, 45], [18, 15], [24, 15]]);
      const credit_score = chance(0.05) ? null : scoreFor(c);
      const channel = pool ? "partner" : weighted([["app", 65], ["web", 25], ["partner", 10]]);
      const appliedMs = timeOnDay(day);
      const loose = day >= POLICY_CHANGE;
      const cutoff = loose ? 520 : 560;
      const rate = product === "bnpl"
        ? 0
        : clamp(Math.round((44 - ((credit_score ?? 560) - 450) / 14) * 2) / 2, 18, 38);
      const inst = installmentFor(amount, rate, term);

      let status = "approved";
      let reason = null;

      if (c.kyc_status !== "verified") {
        status = "rejected";
        reason = "kyc_failed";
      } else if (chance(0.015)) {
        status = "rejected";
        reason = "fraud_suspected";
      } else if ((credit_score ?? 0) < cutoff && !(credit_score === null && product === "bnpl" && amount <= 3_000_000)) {
        status = "rejected";
        reason = "low_score";
      } else if (c.monthly_income !== null && inst / c.monthly_income > 0.6) {
        status = "rejected";
        reason = "high_dti";
      } else if (c.monthly_income === null && product === "cash_loan" && amount > 20_000_000) {
        status = "rejected";
        reason = "high_dti";
      } else if (lastLoanEnd.get(c.id) && lastLoanEnd.get(c.id) > day && chance(0.7)) {
        status = "rejected";
        reason = "high_dti"; // already has an open loan
      } else if (chance(0.09)) {
        status = "cancelled"; // approved offer never accepted
      }

      let decidedMs = appliedMs + int(40, 900) * 1000; // automated decision: seconds to minutes

      if (status === "rejected" && reason === "fraud_suspected") decidedMs = appliedMs + int(2, 48) * 3_600_000;

      if (status === "cancelled") decidedMs = appliedMs + int(1, 7) * DAY;

      if (AS_OF - day < 3 * DAY && chance(0.5)) status = "pending";

      insApp.run(
        appId, c.id, product, amount, term, credit_score, channel, fmtTime(appliedMs),
        status, status === "rejected" ? reason : null, status === "pending" ? null : fmtTime(decidedMs)
      );

      if (status !== "approved") continue;

      // --- Loan + repayment schedule ---
      loanId++;
      const disbursed = Math.min(AS_OF, startOfDay(decidedMs + int(0, 1) * DAY));
      lastLoanEnd.set(c.id, addMonths(disbursed, term));
      const pBad = badProbability(credit_score, product, loose, channel);
      const bad = chance(pBad);
      // A bad loan stops paying at some installment; a share of them cure later.
      const stopAt = bad ? Math.max(1, Math.min(term, Math.floor(Math.pow(rand(), 1.6) * term) + 1)) : Infinity;
      const cures = bad && chance(0.28);
      const sloppy = !bad && chance(0.18); // pays, but often a few days late

      const instRows = [];
      let allPaid = true;
      let worstUnpaidDays = 0;

      for (let n = 1; n <= term; n++) {
        instId++;
        const due = addMonths(disbursed, n);
        let paidMs = null;

        if (n < stopAt) {
          const late = sloppy ? (chance(0.35) ? int(1, 25) : 0) : (chance(0.05) ? int(1, 6) : 0);
          paidMs = due - (late ? 0 : int(0, 4) * DAY) + late * DAY;
        } else if (cures) {
          // Catches up: the missed installments are paid one to two months late.
          paidMs = n < stopAt + 2 ? due + int(31, 75) * DAY : due + int(0, 5) * DAY;
        }

        if (paidMs !== null && paidMs > AS_OF) paidMs = null;

        if (paidMs === null) allPaid = false;

        if (paidMs === null && due <= AS_OF) {
          worstUnpaidDays = Math.max(worstUnpaidDays, Math.round((AS_OF - due) / DAY));
        }

        instRows.push([
          instId, loanId, n, fmtDate(due), inst,
          paidMs === null ? null : fmtDate(paidMs), paidMs === null ? 0 : inst,
        ]);
      }

      const loanStatus = allPaid ? "closed" : worstUnpaidDays > 90 ? "defaulted" : "active";
      insLoan.run(loanId, appId, c.id, product, amount, rate, term, inst, fmtDate(disbursed), loanStatus);

      for (const row of instRows) insInst.run(...row);
    }
  }
})();

// --- Wallets ----------------------------------------------------------------------

const insWallet = db.prepare(`INSERT INTO wallets VALUES (?,?,?,?,?)`);
const insWtx = db.prepare(`INSERT INTO wallet_transactions VALUES (?,?,?,?,?,?,?)`);
const wallets = new Map(); // customer_id -> { id, balance, opened, activity }
let walletId = 0;
let wtxId = 0;

function walletTx(w, ms, type, amount, status, reference = null) {
  wtxId++;
  insWtx.run(wtxId, w.id, fmtTime(ms), type, amount, status, reference);

  if (status === "success") w.balance += amount;
}

for (const c of customers) {
  if (c.kyc_status !== "verified" || !chance(0.62)) continue;

  const opened = c.signupDay + int(0, 30) * DAY;

  if (opened > AS_OF) continue;

  walletId++;
  wallets.set(c.id, { id: walletId, customer: c, balance: 0, opened, activity: weighted([[0.3, 30], [1, 45], [2.5, 25]]) });
}

// Background wallet activity on one day: top-ups, P2P transfers, withdrawals, cashback.
function walletDay(w, day, actions) {
  if (startOfDay(w.opened) > day || !chance(0.035 * w.activity)) return;

  const ms = timeOnDay(day);
  const kind = weighted([["top_up", 55], ["transfer_out", 15], ["transfer_in", 15], ["withdraw", 7], ["cashback", 8]]);

  actions.push([ms, () => {
    if (kind === "top_up") {
      walletTx(w, ms, "top_up", roundTo(lognormal(500_000, 0.6), 10_000), chance(0.03) ? "failed" : "success");
    } else if (kind === "transfer_in") {
      walletTx(w, ms, "transfer_in", roundTo(lognormal(300_000, 0.7), 10_000), "success");
    } else if (kind === "cashback") {
      walletTx(w, ms, "cashback", roundTo(between(5_000, 50_000), 1_000), "success");
    } else {
      const amt = roundTo(lognormal(kind === "withdraw" ? 600_000 : 250_000, 0.6), 10_000);
      walletTx(w, ms, kind, -amt, w.balance >= amt ? "success" : "failed");
    }
  }]);
}

// --- Checkout sessions → events → payments -------------------------------------------

const insEvent = db.prepare(`INSERT INTO checkout_events VALUES (?,?,?,?,?,?,?,?)`);
const insPay = db.prepare(`INSERT INTO payments VALUES (?,?,?,?,?,?,?,?,?,?)`);
let eventId = 0;
let paymentId = 0;
let sessionNo = 0;
const successfulPayments = [];
const refundsDue = new Map(); // day ms -> [{ p, ms }]

function event(session, c, m, name, ms, device, method) {
  eventId++;
  insEvent.run(eventId, session, c.id, m.id, name, fmtTime(ms), device, method ?? null);
}

// One checkout session, start to finish (it lasts a few minutes).
function checkoutSession(c, day, t) {
  sessionNo++;
  const session = `S${String(sessionNo).padStart(6, "0")}`;
  const category = weighted(CATEGORY_WEIGHTS);
  const m = pickOne(merchants.filter((x) => x.category === category));
  const device = weighted([["android", 52], ["ios", 30], ["web", 18]]);
  const amount = roundTo(lognormal(m.def.amount[0], m.def.amount[1]), 1_000);

  event(session, c, m, "view_cart", t, device);

  if (!chance(0.71)) return;

  t += int(10, 120) * 1000;
  event(session, c, m, "start_checkout", t, device);

  if (!chance(0.86)) return;

  const w = wallets.get(c.id);
  const walletUsable = w && startOfDay(w.opened) <= day;
  const method = weighted([
    ["e_wallet", walletUsable ? 40 : 0], ["card", 26], ["qr_code", 14], ["bank_transfer", 10],
    ["bnpl", amount >= 1_000_000 ? 14 : 2],
  ]);
  t += int(5, 60) * 1000;
  event(session, c, m, "select_payment", t, device, method);

  if (!chance(0.9)) return;

  t += int(5, 90) * 1000;
  event(session, c, m, "submit_payment", t, device, method);

  // Outcome of the payment attempt.
  const inOutage = day >= OTP_OUTAGE_FROM && day < OTP_OUTAGE_TO;
  let status = "success";
  let reason = null;

  // Most wallet users top up the shortfall from their linked bank account on the spot.
  if (method === "e_wallet" && w.balance < amount && chance(0.8)) {
    walletTx(w, t - int(20, 60) * 1000, "top_up", Math.ceil((amount - w.balance) / 50_000) * 50_000, "success");
  }

  if (method === "e_wallet" && w.balance < amount) {
    status = "failed";
    reason = "insufficient_funds";
  } else if (method === "card" && device === "android" && inOutage && chance(0.55)) {
    status = "failed";
    reason = "otp_timeout";
  } else if (chance({ card: 0.09, e_wallet: 0.03, qr_code: 0.04, bank_transfer: 0.05, bnpl: 0.07 }[method])) {
    status = "failed";
    reason = weighted(method === "card"
      ? [["bank_declined", 45], ["otp_timeout", 25], ["insufficient_funds", 20], ["fraud_blocked", 4], ["network_error", 6]]
      : [["network_error", 40], ["bank_declined", 25], ["insufficient_funds", 20], ["fraud_blocked", 15]]);
  }

  const payMs = t + int(2, 25) * 1000;

  if (status === "success" && chance(0.003)) status = "pending";

  paymentId++;
  const pid = paymentId;
  insPay.run(pid, session, c.id, m.id, fmtTime(payMs), amount, method, device, status, reason);

  if (method === "e_wallet") walletTx(w, payMs, "payment", -amount, status === "failed" ? "failed" : "success", String(pid));

  if (status !== "success") return;

  event(session, c, m, "payment_success", payMs + 1000, device, method);
  const p = { pid, c, m, payMs, amount, method, device, session, w };
  successfulPayments.push(p);

  // Refunds: ~2.5% of successful payments (more in fashion/electronics), 1–10 days later.
  const refundRate = m.category === "fashion" ? 0.07 : m.category === "electronics" ? 0.04 : 0.015;

  if (chance(refundRate)) {
    const ms = payMs + int(1, 10) * DAY;
    const key = startOfDay(ms);

    if (!refundsDue.has(key)) refundsDue.set(key, []);

    refundsDue.get(key).push({ p, ms });
  }
}

// Wallet activity and shopping are simulated together, one day at a time and in
// time order within the day, so a wallet can never spend money it does not have yet.
db.transaction(() => {
  const walletList = [...wallets.values()];
  const firstDay = Math.min(...walletList.map((w) => startOfDay(w.opened)));

  for (let day = firstDay; day <= AS_OF; day += DAY) {
    const actions = [];

    for (const w of walletList) walletDay(w, day, actions);

    if (day >= Date.UTC(2025, 6, 1)) {
      const sessions = Math.round(normal(24 * demand(day, "shop"), 4));

      for (let k = 0; k < Math.max(0, sessions); k++) {
        const c = signedUpBy(day);

        if (!c) continue;

        const t = timeOnDay(day);
        actions.push([t, () => checkoutSession(c, day, t)]);
      }
    }

    for (const { p, ms } of refundsDue.get(day) ?? []) {
      if (ms > AS_OF) continue;

      actions.push([ms, () => {
        db.prepare(`UPDATE payments SET status = 'refunded' WHERE payment_id = ?`).run(p.pid);
        p.refunded = true;

        if (p.method === "e_wallet") walletTx(p.w, ms, "refund", p.amount, "success", String(p.pid));
      }]);
    }

    actions.sort((a, b) => a[0] - b[0]);

    for (const [, run] of actions) run();
  }

  // Double charges: the app retried a request that had already succeeded.
  const candidates = successfulPayments.filter((p) => !p.refunded && p.method !== "e_wallet");
  let doubles = 0;

  while (doubles < 37) {
    const p = candidates[Math.floor(rand() * candidates.length)];

    if (p.duplicated) continue;

    p.duplicated = true;
    doubles++;
    paymentId++;
    insPay.run(paymentId, p.session, p.c.id, p.m.id, fmtTime(p.payMs + int(1, 8) * 1000), p.amount, p.method, p.device, "success", null);
  }
})();

// Stuck payments: a handful still 'pending' days later.
const pendingCount = db.prepare(`SELECT COUNT(*) AS n FROM payments WHERE status = 'pending'`).get().n;

// --- Wallet balances (with six reconciliation breaks) --------------------------------

db.transaction(() => {
  const breaks = new Set([12, 377, 801, 1150, 1499, 1733].filter((id) => id <= walletId));

  for (const w of wallets.values()) {
    const status = chance(0.03) ? "locked" : chance(0.02) ? "closed" : "active";
    let balance = w.balance;

    if (breaks.has(w.id)) balance += pickOne([-150_000, 200_000, -50_000, 1_000_000, 75_000, -320_000]);

    insWallet.run(w.id, w.customer.id, fmtDate(w.opened), status, balance);
  }
})();

// Indexes learners' queries will lean on.
db.exec(`
CREATE INDEX idx_app_customer  ON loan_applications(customer_id);
CREATE INDEX idx_loan_customer ON loans(customer_id);
CREATE INDEX idx_sched_loan    ON repayment_schedule(loan_id);
CREATE INDEX idx_wtx_wallet    ON wallet_transactions(wallet_id);
CREATE INDEX idx_pay_customer  ON payments(customer_id);
CREATE INDEX idx_pay_merchant  ON payments(merchant_id);
CREATE INDEX idx_event_session ON checkout_events(session_id);
`);

const fkProblems = db.prepare("PRAGMA foreign_key_check").all();

if (fkProblems.length) throw new Error(`foreign key check failed: ${JSON.stringify(fkProblems.slice(0, 5))}`);

db.exec("VACUUM");

const counts = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  )
  .all()
  .map(({ name }) => `${name}=${db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n}`);
db.close();

console.log(`fintech.db written (${(fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(counts.join("  "));
console.log(`pending payments: ${pendingCount}`);
