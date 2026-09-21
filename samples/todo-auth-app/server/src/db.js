// Opens the SQLite database file and makes sure the tables exist.
// SQLite keeps the whole database in ONE file (todo.db), so there is no
// separate database server to install. Moving to Postgres or MySQL later
// means changing this file and the SQL placeholders, not the route logic.

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

const db = new Database(process.env.DB_FILE ?? 'todo.db');

// Plain SQLite ignores FOREIGN KEY rules unless you switch them on.
// better-sqlite3 already does, but saying it here makes the rule explicit.
db.pragma('foreign_keys = ON');

const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf-8');
db.exec(schema);

export default db;
