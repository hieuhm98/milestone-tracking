/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module; keep it out of the server bundle so Next
  // loads it via require() at runtime (dev-mode SQLite store).
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
    // The progress snapshot is read via a runtime path join, which Next's file
    // tracing can't see — include it explicitly so the route can read it once
    // deployed. (public/progress.json is the always-available fallback.)
    outputFileTracingIncludes: {
      "/api/progress": ["./data/progress.json"],
      // The dictionary index reads every vocab.json plus the word bank through
      // runtime path joins, which file tracing can't follow on its own.
      "/api/english/dictionary": ["./knowledge-content/**/vocab.json", "./data/word-bank.db"],
      // The IELTS pages are statically generated, but keep their data with them
      // in case one is ever rendered on demand.
      "/english/ielts-speaking/**": ["./data/ielts-speaking/**"],
      // Both SQL-playground databases are opened through a runtime path join.
      "/api/sql-playground": ["./data/word-bank.db", "./data/fintech.db"],
      "/english/grammar-for-writing/**": ["./data/grammar-for-writing/**"],
    },
  },
  async redirects() {
    return [
      // The SQL playground moved under the new /practice parent.
      { source: "/sql-practice", destination: "/practice/sql", permanent: true },
      // English practice moved out of IT practice into the English section.
      { source: "/practice/english", destination: "/english/practice", permanent: true },
    ];
  },
};

export default nextConfig;
