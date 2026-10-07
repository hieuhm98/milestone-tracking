// Run SQL against data/fintech.db from the terminal and print a table.
// Used to check the numbers quoted in the "Data for banking & lending" articles.
//
//   node scripts/query-fintech.mjs "SELECT COUNT(*) FROM loans"
//   node scripts/query-fintech.mjs path/to/query.sql
//
// The file is opened read-only, so nothing here can change the committed DB.

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv.slice(2).join(" ").trim();

if (!arg) {
  console.error('usage: node scripts/query-fintech.mjs "<sql>" | <file.sql>');
  process.exit(1);
}

const source = fs.existsSync(arg) ? fs.readFileSync(arg, "utf8") : arg;
const db = new Database(path.join(ROOT, "data", "fintech.db"), { readonly: true, fileMustExist: true });

// A file may hold several statements separated by ";" on their own line endings.
const statements = source
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s && !/^(--[^\n]*\n?)+$/.test(s));

for (const sql of statements) {
  const stmt = db.prepare(sql);

  if (!stmt.reader) {
    console.log("(not a query — skipped: the DB is read-only)");
    continue;
  }

  const rows = stmt.all();
  const cols = stmt.columns().map((c) => c.name);
  const cell = (v) => (v === null ? "NULL" : String(v));
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => cell(r[c]).length)));
  const line = (vals) => vals.map((v, i) => v.padEnd(widths[i])).join(" | ");

  if (statements.length > 1) console.log(`\n> ${sql.split("\n")[0].slice(0, 100)}`);

  console.log(line(cols));
  console.log(widths.map((w) => "-".repeat(w)).join("-+-"));

  for (const r of rows.slice(0, 200)) console.log(line(cols.map((c) => cell(r[c]))));

  console.log(`(${rows.length} row${rows.length === 1 ? "" : "s"})`);
}

db.close();
