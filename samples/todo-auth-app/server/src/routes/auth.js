// Sign up, log in, log out, and "who am I?".

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { COOKIE_NAME, COOKIE_OPTIONS, signToken } from '../auth-token.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Never send password_hash back to the browser: pick the safe fields.
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });

router.post('/signup', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  // The server validates again even though the form already did:
  // anyone can skip the form and call the API directly.
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Email is not valid.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (existing) return res.status(409).json({ error: 'This email is already registered.' });

  // Store a one-way hash, never the password itself.
  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);
  const user = { id: Number(result.lastInsertRowid), name, email };

  res.cookie(COOKIE_NAME, signToken(user), COOKIE_OPTIONS);

  return res.status(201).json({ user });
});

router.post('/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Same message for "no such email" and "wrong password", so nobody can
  // use the login form to find out who has an account.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  res.cookie(COOKIE_NAME, signToken(user), COOKIE_OPTIONS);

  return res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  const { maxAge, ...clearOptions } = COOKIE_OPTIONS;

  res.clearCookie(COOKIE_NAME, clearOptions);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

  if (!user) return res.status(401).json({ error: 'Account not found.' });

  return res.json({ user: publicUser(user) });
});

export default router;
