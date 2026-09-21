// Deletes every row so you can start testing from a clean slate:
//   npm run db:reset

import db from './db.js';

db.exec('DELETE FROM todos; DELETE FROM users;');
console.log('Database emptied.');
