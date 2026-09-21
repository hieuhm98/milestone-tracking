// CRUD for to-dos. Every query filters by user_id, so one user can never
// read or change another user's to-dos, even by guessing an id.

import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
const MAX_TITLE = 200;

// Every route below needs a logged-in user.
router.use(requireAuth);

// SQLite stores true/false as 1/0. Turn it back into a real boolean for JSON.
const toJson = (row) => ({ id: row.id, title: row.title, done: row.done === 1, createdAt: row.created_at });

const findOwnTodo = (id, userId) =>
  db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId);

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.userId);

  res.json({ todos: rows.map(toJson) });
});

router.post('/', (req, res) => {
  const title = String(req.body?.title ?? '').trim();

  if (!title) return res.status(400).json({ error: 'Title is required.' });
  if (title.length > MAX_TITLE) return res.status(400).json({ error: `Title must be ${MAX_TITLE} characters or fewer.` });

  const result = db.prepare('INSERT INTO todos (user_id, title) VALUES (?, ?)').run(req.userId, title);
  const todo = findOwnTodo(result.lastInsertRowid, req.userId);

  return res.status(201).json({ todo: toJson(todo) });
});

router.patch('/:id', (req, res) => {
  const todo = findOwnTodo(req.params.id, req.userId);

  if (!todo) return res.status(404).json({ error: 'To-do not found.' });

  const title = req.body?.title === undefined ? todo.title : String(req.body.title).trim();
  const done = req.body?.done === undefined ? todo.done : req.body.done ? 1 : 0;

  if (!title) return res.status(400).json({ error: 'Title is required.' });
  if (title.length > MAX_TITLE) return res.status(400).json({ error: `Title must be ${MAX_TITLE} characters or fewer.` });

  db.prepare('UPDATE todos SET title = ?, done = ? WHERE id = ?').run(title, done, todo.id);

  return res.json({ todo: toJson(findOwnTodo(todo.id, req.userId)) });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);

  if (result.changes === 0) return res.status(404).json({ error: 'To-do not found.' });

  return res.status(204).end();
});

export default router;
