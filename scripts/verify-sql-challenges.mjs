// Check every SQL challenge against a running server (`yarn dev`):
//   * its reference solution must be accepted;
//   * an obviously wrong query must not be;
//   * a few hand-written answers that get the result right without the
//     practised feature must come back as "concept".
//
//   node scripts/verify-sql-challenges.mjs [http://localhost:3000]

const BASE = process.argv[2] ?? "http://localhost:3000";
const API = `${BASE}/api/sql-challenges`;

// Right result, wrong technique — each must be refused with verdict "concept".
const DODGES = {
  "second-page": "SELECT id, word, pronunciation FROM words WHERE id BETWEEN 11 AND 20 ORDER BY id",
  "merchant-categories": "SELECT category FROM merchants GROUP BY category ORDER BY category",
  "partner-students":
    "SELECT customer_id, full_name FROM customers WHERE (employment = 'student' OR employment = 'freelancer') AND kyc_status = 'verified' AND signup_channel = 'partner' ORDER BY customer_id",
  "never-applied":
    "SELECT COUNT(*) FROM customers WHERE kyc_status = 'verified' AND customer_id NOT IN (SELECT customer_id FROM loan_applications)",
  "top-loans-per-product":
    "SELECT product, loan_id, principal, rnk FROM (SELECT product, loan_id, principal, RANK() OVER (PARTITION BY product ORDER BY principal DESC, loan_id) AS rnk FROM loans) WHERE rnk <= 3 ORDER BY product, rnk",
  "upsert-adverb": "UPDATE parts_of_speech SET name_vi = 'phó từ' WHERE code = 'adv'",
};

async function submit(id, sql) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, sql }),
  });

  return res.json();
}

const { challenges } = await (await fetch(API)).json();
let failures = 0;

for (const c of challenges) {
  const { solution } = await (await fetch(`${API}?id=${c.id}&solution=1`)).json();
  const ok = await submit(c.id, solution.sql);
  const wrong = await submit(c.id, c.kind === "query" ? "SELECT 1" : "SELECT * FROM sqlite_master");
  const problems = [];

  if (ok.verdict !== "accepted") problems.push(`solution → ${ok.verdict} ${ok.error ?? ""}`);

  if (wrong.verdict === "accepted") problems.push("a wrong query was accepted");

  if (DODGES[c.id]) {
    const dodge = await submit(c.id, DODGES[c.id]);

    if (dodge.verdict !== "concept") problems.push(`dodge → ${dodge.verdict} (expected concept)`);
  }

  const rows = ok.yours?.rowCount ?? "?";
  console.log(`${problems.length ? "✗" : "✓"} ${String(c.number).padStart(2)} ${c.difficulty.padEnd(6)} ${c.id} (${rows} rows, ${ok.elapsedMs?.toFixed(0)} ms)`);
  problems.forEach((p) => console.log(`    ${p}`));
  failures += problems.length ? 1 : 0;
}

console.log(failures ? `\n${failures} challenge(s) failed` : `\nAll ${challenges.length} challenges OK`);
process.exit(failures ? 1 : 0);
